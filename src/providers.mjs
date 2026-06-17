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
  // `max_completion_tokens`; send the latter for forward-compatibility.
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
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
  const text = json.choices?.[0]?.message?.content || "";
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
  // xai: callXai,        // add when a key is present
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
  return false;
}

// Which env var each vendor needs, for honest "skipped (no key)" reporting.
export function keyEnvFor(vendor) {
  if (vendor === "anthropic") return "ANTHROPIC_API_KEY";
  if (vendor === "google") return "GEMINI_API_KEY";
  if (vendor === "openai") return "OPENAI_API_KEY";
  return null;
}
