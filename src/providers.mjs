// Thin provider abstraction over each vendor's own HTTP API.
//
// API keys are read ONLY from the environment. Never hardcode or log a key.
//
// Each adapter is async (model, { system, user, maxTokens }) -> {
//   text, usage: { inputTokens, outputTokens }, raw
// }
//
// Adding a provider is one entry in the VENDORS map below plus its adapter.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const XAI_URL = "https://api.x.ai/v1/chat/completions";
const ZAI_URL = "https://api.z.ai/api/paas/v4/chat/completions";

// Per-request timeout. Without it, one stalled connection freezes the run.
const REQUEST_TIMEOUT_MS = 120000;

// Determinism / reproducibility. temperature:0 is sent to vendors that honour
// it (Anthropic, Google); `seed` is sent to OpenAI (which supports it). The
// reasoning models (GPT-5, Grok 4.x, GLM-5.x) are inherently non-deterministic
// and may reject temperature!=default, so we do NOT force temperature on the
// OpenAI-compatible endpoints to avoid breaking the (paid) run.
const TEMPERATURE = 0;
const SEED = 7;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Exponential backoff with jitter: ~1s, 2s, 4s, 8s, 16s (capped 20s) + 0-500ms.
function backoffMs(attempt) {
  return Math.min(1000 * 2 ** (attempt - 1), 20000) + Math.floor(Math.random() * 500);
}

// Shared retry-aware POST. Retries on 429 / 5xx / network with backoff +
// jitter, honouring Retry-After. Genuine 4xx (auth, bad request) are not
// retried. Returns { res, json }; throws a labelled Error on terminal failure.
async function postJson(url, headers, bodyObj, label, maxAttempts = 6) {
  const body = JSON.stringify(bodyObj);
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (e) {
      lastErr = new Error(`${label} network error: ${String(e.message || e)}`);
      if (attempt < maxAttempts) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw lastErr;
    }
    const json = await res.json().catch(() => ({}));
    if (res.ok) return { res, json };
    lastErr = new Error(
      `${label} ${res.status}: ${JSON.stringify(json.error || json).slice(0, 300)}`,
    );
    if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : backoffMs(attempt));
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}

async function callAnthropic(model, { system, user, maxTokens = 1500 }) {
  const key = requireEnv("ANTHROPIC_API_KEY");
  const { json } = await postJson(
    ANTHROPIC_URL,
    {
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    {
      model,
      max_tokens: maxTokens,
      // NB: `temperature` is DEPRECATED/rejected by the current Claude flagships
      // (400 "temperature is deprecated for this model"), so we do not send it.
      system,
      messages: [{ role: "user", content: user }],
    },
    "Anthropic",
  );
  const text = (json.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return {
    text,
    usage: {
      inputTokens: json.usage?.input_tokens ?? null,
      outputTokens: json.usage?.output_tokens ?? null,
    },
    raw: json,
  };
}

async function callGoogle(model, { system, user, maxTokens = 1500 }) {
  const key = requireEnv("GEMINI_API_KEY");
  const { json } = await postJson(
    `${GOOGLE_BASE}/${model}:generateContent?key=${key}`,
    { "content-type": "application/json" },
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: TEMPERATURE,
        seed: SEED,
      },
    },
    "Google",
  );
  const cand = json.candidates?.[0];
  const text = (cand?.content?.parts || []).map((p) => p.text || "").join("");
  return {
    text,
    usage: {
      inputTokens: json.usageMetadata?.promptTokenCount ?? null,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? null,
    },
    raw: json,
  };
}

// Shared driver for OpenAI-compatible Chat Completions endpoints (OpenAI, xAI,
// z.ai). They differ only in URL, key env var, the token-budget field name, and
// whether reasoning_effort/seed are sent — so those are parameters.
async function callOpenAICompatible(model, prompt, cfg) {
  const { system, user, maxTokens = 1500 } = prompt;
  const key = requireEnv(cfg.envVar);
  const bodyObj = {
    model,
    [cfg.tokenField]: Math.max(maxTokens, 8000),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    ...(cfg.reasoningEffort ? { reasoning_effort: cfg.reasoningEffort } : {}),
    ...(cfg.seed != null ? { seed: cfg.seed } : {}),
  };
  const { json } = await postJson(
    cfg.url,
    { authorization: `Bearer ${key}`, "content-type": "application/json" },
    bodyObj,
    cfg.label,
  );
  const choice = json.choices?.[0];
  const text = choice?.message?.content || "";
  if (!text && choice?.finish_reason === "length") {
    throw new Error(
      `${cfg.label} empty completion (finish_reason=length: reasoning/thinking consumed the token budget before any visible output)`,
    );
  }
  return {
    text,
    usage: {
      inputTokens: json.usage?.prompt_tokens ?? null,
      outputTokens: json.usage?.completion_tokens ?? null,
    },
    raw: json,
  };
}

const callOpenAI = (model, prompt) =>
  callOpenAICompatible(model, prompt, {
    url: OPENAI_URL,
    envVar: "OPENAI_API_KEY",
    label: "OpenAI",
    tokenField: "max_completion_tokens",
    reasoningEffort: "low",
    seed: SEED,
  });

const callXai = (model, prompt) =>
  callOpenAICompatible(model, prompt, {
    url: XAI_URL,
    envVar: "GROK_API_KEY",
    label: "xAI",
    tokenField: "max_tokens",
  });

const callZai = (model, prompt) =>
  callOpenAICompatible(model, prompt, {
    url: ZAI_URL,
    envVar: "Z_API_KEY",
    label: "z.ai",
    tokenField: "max_tokens",
  });

// Single source of truth per vendor: env var + adapter. hasKeyFor / keyEnvFor /
// the adapter lookup all derive from this, so adding a vendor is ONE entry.
const VENDORS = {
  anthropic: { env: "ANTHROPIC_API_KEY", adapter: callAnthropic },
  google: { env: "GEMINI_API_KEY", adapter: callGoogle },
  openai: { env: "OPENAI_API_KEY", adapter: callOpenAI },
  xai: { env: "GROK_API_KEY", adapter: callXai },
  zai: { env: "Z_API_KEY", adapter: callZai },
};

export async function callModel(modelEntry, prompt) {
  const v = VENDORS[modelEntry.vendor];
  if (!v) throw new Error(`No adapter for vendor: ${modelEntry.vendor}`);
  return v.adapter(modelEntry.apiId, prompt);
}

export function hasKeyFor(vendor) {
  const v = VENDORS[vendor];
  return v ? !!process.env[v.env] : false;
}

// Which env var each vendor needs, for honest "skipped (no key)" reporting.
export function keyEnvFor(vendor) {
  return VENDORS[vendor]?.env ?? null;
}
