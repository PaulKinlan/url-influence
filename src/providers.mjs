// Thin provider abstraction over each vendor's own HTTP API.
//
// API keys are read ONLY from the environment. Never hardcode or log a key.
//
// Each adapter is async (model, { system, user, maxTokens }) -> {
//   text, usage: { inputTokens, outputTokens }, raw
// }
//
// Adding a provider (OpenAI, xAI/Grok, ...) is one function here plus a model
// entry in models.mjs with the matching `vendor`.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// Per-request timeout. Without it, one stalled connection freezes the whole
// sequential run. Thinking models can be slow, so keep this generous.
const REQUEST_TIMEOUT_MS = 120000;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function callAnthropic(model, { system, user, maxTokens = 1500 }) {
  const key = requireEnv("ANTHROPIC_API_KEY");
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Anthropic ${res.status}: ${JSON.stringify(json.error || json).slice(0, 300)}`,
    );
  }
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
  const url = `${GOOGLE_BASE}/${model}:generateContent?key=${key}`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Google ${res.status}: ${JSON.stringify(json.error || json).slice(0, 300)}`,
    );
  }
  const cand = json.candidates?.[0];
  const text = (cand?.content?.parts || [])
    .map((p) => p.text || "")
    .join("");
  return {
    text,
    usage: {
      inputTokens: json.usageMetadata?.promptTokenCount ?? null,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? null,
    },
    raw: json,
  };
}

async function callOpenAI(model, { system, user, maxTokens = 1500 }) {
  const key = requireEnv("OPENAI_API_KEY");
  // Chat Completions API. Newer OpenAI models reject `max_tokens` and require
  // `max_completion_tokens`.
  //
  // The GPT-5 family are REASONING models: reasoning tokens are billed against
  // max_completion_tokens, so a small budget (1500) gets fully consumed by
  // hidden reasoning and the visible completion returns EMPTY (finish_reason
  // "length"). Give a generous budget AND ask for low reasoning effort so
  // usable output remains. (reasoning_effort is accepted/ignored gracefully by
  // the chat endpoint for non-reasoning models.)
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: Math.max(maxTokens, 8000),
      reasoning_effort: "low",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `OpenAI ${res.status}: ${JSON.stringify(json.error || json).slice(0, 300)}`,
    );
  }
  const choice = json.choices?.[0];
  const text = choice?.message?.content || "";
  // If the model still returned nothing because reasoning ate the whole budget,
  // surface it as an explicit error so it is labelled (run error) rather than
  // scored as a real 0.
  if (!text && choice?.finish_reason === "length") {
    throw new Error(
      `OpenAI empty completion (finish_reason=length: reasoning consumed the ${Math.max(maxTokens, 8000)}-token budget before any visible output)`,
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

// xAI / Grok. OpenAI-compatible Chat Completions API at api.x.ai. Runs only if
// GROK_API_KEY is present. Grok 4.x are reasoning models, so give a generous
// token budget (reasoning can otherwise eat the visible output). Exact model
// ids / params should be confirmed against GET https://api.x.ai/v1/models when
// a key is first available.
const XAI_URL = "https://api.x.ai/v1/chat/completions";

async function callXai(model, { system, user, maxTokens = 1500 }) {
  const key = requireEnv("GROK_API_KEY");
  const res = await fetch(XAI_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.max(maxTokens, 8000),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `xAI ${res.status}: ${JSON.stringify(json.error || json).slice(0, 300)}`,
    );
  }
  const choice = json.choices?.[0];
  const text = choice?.message?.content || "";
  if (!text && choice?.finish_reason === "length") {
    throw new Error(
      "xAI empty completion (finish_reason=length: reasoning consumed the budget before any visible output)",
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

// z.ai / Zhipu (GLM). OpenAI-compatible Chat Completions at api.z.ai. Runs only
// if Z_API_KEY is present. GLM-5.x are reasoning ("thinking") models, so give a
// generous token budget. Confirm model ids against the z.ai docs on first call.
const ZAI_URL = "https://api.z.ai/api/paas/v4/chat/completions";

async function callZai(model, { system, user, maxTokens = 1500 }) {
  const key = requireEnv("Z_API_KEY");
  const res = await fetch(ZAI_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.max(maxTokens, 8000),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `z.ai ${res.status}: ${JSON.stringify(json.error || json).slice(0, 300)}`,
    );
  }
  const choice = json.choices?.[0];
  const text = choice?.message?.content || "";
  if (!text && choice?.finish_reason === "length") {
    throw new Error(
      "z.ai empty completion (finish_reason=length: thinking consumed the budget before any visible output)",
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

const ADAPTERS = {
  anthropic: callAnthropic,
  google: callGoogle,
  openai: callOpenAI,
  xai: callXai,
  zai: callZai,
};

export async function callModel(modelEntry, prompt) {
  const adapter = ADAPTERS[modelEntry.vendor];
  if (!adapter) throw new Error(`No adapter for vendor: ${modelEntry.vendor}`);
  return adapter(modelEntry.apiId, prompt);
}

export function hasKeyFor(vendor) {
  if (vendor === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  if (vendor === "google") return !!process.env.GEMINI_API_KEY;
  if (vendor === "openai") return !!process.env.OPENAI_API_KEY;
  if (vendor === "xai") return !!process.env.GROK_API_KEY;
  if (vendor === "zai") return !!process.env.Z_API_KEY;
  return false;
}

// Which env var each vendor needs, for honest "skipped (no key)" reporting.
export function keyEnvFor(vendor) {
  if (vendor === "anthropic") return "ANTHROPIC_API_KEY";
  if (vendor === "google") return "GEMINI_API_KEY";
  if (vendor === "openai") return "OPENAI_API_KEY";
  if (vendor === "xai") return "GROK_API_KEY";
  if (vendor === "zai") return "Z_API_KEY";
  return null;
}
