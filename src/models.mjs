// Model registry.
//
// Each entry: a logical key, the vendor (which provider adapter to use), the
// EXACT API id the vendor exposes (verified against each provider's live model
// listing - Anthropic GET /v1/models, Google models.list, OpenAI GET /v1/models),
// and the model's PUBLISHED knowledge-cutoff date with a CITED source URL.
//
// The cutoff is the load-bearing fact for this experiment: the hypothesis is
// that an opaque URL only steers output when the content behind it existed
// BEFORE the model's cutoff (so it could have been in training). To stay
// defensible, every cutoff below is taken from the vendor's published system /
// model card, recorded in (and cross-checked against) Paul's maintained widget
// data at aifocus/static/model-gap.json. The `cutoffSource` URL is the card.
// See results/SOURCES.md for the model -> cutoff -> source table.
//
// Adding a new model (e.g. an OpenAI or xAI model once a key is present) is a
// SINGLE entry here plus, if it is a new vendor, one adapter in providers.mjs.

export const MODELS = [
  // --- Anthropic -----------------------------------------------------------
  // Headline current flagships. Opus 4.8 and Sonnet 4.6 BOTH cut at end of
  // Jan 2026 (training-data AND reliable-knowledge cutoff). Source: their
  // system cards; cross-checked via Anthropic's "How up-to-date is Claude's
  // training data" help-center page and the Opus 4.8 system-card coverage.
  {
    key: "claude-opus-4-8",
    vendor: "anthropic",
    apiId: "claude-opus-4-8", // verified present in GET /v1/models
    cutoff: "2026-01-31", // January 2026
    cutoffSource: "https://anthropic.com/claude-opus-4-8-system-card",
    label: "Claude Opus 4.8",
    pilot: false,
  },
  {
    key: "claude-sonnet-4-6",
    vendor: "anthropic",
    apiId: "claude-sonnet-4-6", // verified present in GET /v1/models
    cutoff: "2026-01-31", // January 2026
    cutoffSource: "https://anthropic.com/claude-sonnet-4-6-system-card",
    label: "Claude Sonnet 4.6",
    pilot: false,
  },
  // Older Anthropic models kept ONLY to give an Anthropic-internal cutoff
  // spread (Aug 2025 and Jul 2025), so the pre/post boundary is testable
  // within a single vendor's family.
  {
    key: "claude-opus-4-6",
    vendor: "anthropic",
    apiId: "claude-opus-4-6", // verified present in GET /v1/models
    cutoff: "2025-08-31", // August 2025
    cutoffSource: "https://anthropic.com/claude-opus-4-6-system-card",
    label: "Claude Opus 4.6",
    pilot: false,
  },
  {
    key: "claude-sonnet-4-5",
    vendor: "anthropic",
    // Anthropic exposes Sonnet 4.5 as a dated id. Verified present as
    // claude-sonnet-4-5-20250929 in GET /v1/models.
    apiId: "claude-sonnet-4-5-20250929",
    cutoff: "2025-07-31", // July 2025 (training-data cutoff)
    cutoffSource: "https://anthropic.com/claude-sonnet-4-5-system-card",
    label: "Claude Sonnet 4.5",
    pilot: true,
  },

  // --- Google --------------------------------------------------------------
  // NOTE: ALL current Gemini models share a ~Jan 2025 cutoff (per their model
  // cards), so the WITHIN-Google cutoff spread is flat. They contribute the
  // cross-model spread (the earliest of the current flagships), not an
  // internal pre/post boundary. Gemini 3.1 Pro is exposed only as a -preview
  // id at time of writing; verified via models.list.
  {
    key: "gemini-3.1-pro",
    vendor: "google",
    apiId: "gemini-3.1-pro-preview", // verified present in models.list
    cutoff: "2025-01-31", // January 2025
    cutoffSource: "https://deepmind.google/models/model-cards/gemini-3-1-pro/",
    label: "Gemini 3.1 Pro",
    pilot: false,
  },
  {
    key: "gemini-3.5-flash",
    vendor: "google",
    apiId: "gemini-3.5-flash", // verified present in models.list
    cutoff: "2025-01-31", // January 2025
    cutoffSource: "https://deepmind.google/models/model-cards/gemini-3-5-flash/",
    label: "Gemini 3.5 Flash",
    pilot: true,
  },

  // --- OpenAI --------------------------------------------------------------
  // These run ONLY if OPENAI_API_KEY is present (env or local .env). They give
  // the WIDEST cutoff spread (Sep 2024 -> Dec 2025), which is the decisive
  // cross-model test. Exact API ids should be confirmed against GET /v1/models
  // when a key is first available; the ids below match OpenAI's published model
  // pages (gpt-5.5 / gpt-5.2 / gpt-5). Cutoffs from OpenAI's model docs, also
  // recorded in model-gap.json.
  {
    key: "gpt-5.5",
    vendor: "openai",
    apiId: "gpt-5.5",
    cutoff: "2025-12-01", // December 1, 2025
    cutoffSource: "https://developers.openai.com/api/docs/models/gpt-5.5",
    label: "GPT-5.5",
    pilot: false,
  },
  {
    key: "gpt-5.2",
    vendor: "openai",
    apiId: "gpt-5.2",
    cutoff: "2025-08-31", // August 2025
    cutoffSource: "https://developers.openai.com/api/docs/models/gpt-5.2",
    label: "GPT-5.2",
    pilot: false,
  },
  {
    key: "gpt-5",
    vendor: "openai",
    apiId: "gpt-5",
    cutoff: "2024-09-30", // September 2024
    cutoffSource: "https://developers.openai.com/api/docs/models/gpt-5",
    label: "GPT-5",
    pilot: false,
  },
];

export function pilotModels() {
  return MODELS.filter((m) => m.pilot);
}

export function modelByKey(key) {
  return MODELS.find((m) => m.key === key);
}
