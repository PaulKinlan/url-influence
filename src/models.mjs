// Model registry.
//
// Each entry: a logical key, the vendor (which provider adapter to use), the
// exact API id the vendor exposes, and the model's KNOWN knowledge-cutoff date.
//
// The cutoff is the load-bearing fact for this experiment: the hypothesis is
// that an opaque URL only steers output when the content behind it existed
// BEFORE the model's cutoff (so it could have been in training). Cutoffs are
// the vendors' published / commonly-reported training data cutoffs. They are
// approximate by nature; record the best-known value and treat the boundary as
// fuzzy in analysis.
//
// Adding a new model (e.g. an OpenAI or Grok model once a key is present) is a
// SINGLE entry here plus, if it is a new vendor, one adapter in providers.mjs.

export const MODELS = [
  {
    key: "claude-sonnet-4-5",
    vendor: "anthropic",
    apiId: "claude-sonnet-4-5",
    cutoff: "2025-07", // Anthropic-reported reliable-knowledge cutoff for Sonnet 4.5
    label: "Claude Sonnet 4.5",
    pilot: true,
  },
  {
    key: "claude-opus-4-8",
    vendor: "anthropic",
    apiId: "claude-opus-4-8",
    cutoff: "2026-01", // Opus 4.8
    label: "Claude Opus 4.8",
    pilot: false,
  },
  {
    key: "gemini-2.5-flash",
    vendor: "google",
    apiId: "gemini-2.5-flash",
    cutoff: "2025-01", // Gemini 2.5 family reported knowledge cutoff
    label: "Gemini 2.5 Flash",
    pilot: true,
  },
  {
    key: "gemini-2.5-pro",
    vendor: "google",
    apiId: "gemini-2.5-pro",
    cutoff: "2025-01",
    label: "Gemini 2.5 Pro",
    pilot: false,
  },

  // --- Add later when a key is present (do NOT enable without a key) ---
  // {
  //   key: "gpt-5",
  //   vendor: "openai",          // requires an "openai" adapter in providers.mjs
  //   apiId: "gpt-5",
  //   cutoff: "2025-09",
  //   label: "GPT-5",
  //   pilot: false,
  // },
  // {
  //   key: "grok-4",
  //   vendor: "xai",             // requires an "xai" adapter in providers.mjs
  //   apiId: "grok-4",
  //   cutoff: "2025-11",
  //   label: "Grok 4",
  //   pilot: false,
  // },
];

export function pilotModels() {
  return MODELS.filter((m) => m.pilot);
}

export function modelByKey(key) {
  return MODELS.find((m) => m.key === key);
}
