# Sources: model knowledge cutoffs

The cutoff date is the load-bearing fact for this experiment, so every value is
the vendor's published knowledge / training-data cutoff with a citation. The
primary, regularly-maintained source of truth is Paul Kinlan's model-gap widget
data (`aifocus/static/model-gap.json`, updated 2026-06-07), which records each
model's vendor, cutoff, cutoff label, and the system/model-card URL. Headline
flagships were additionally spot-checked against published cards / vendor pages
(noted below). Where month-only granularity is published, the date uses the last
day of that month (conservative), except OpenAI GPT-5.5 which publishes an exact
day.

Exact API ids were verified against each provider's live model listing:
Anthropic `GET /v1/models`, Google `models.list`, and (for OpenAI, when a key is
present) `GET /v1/models`. The ids below are what the runner sends.

| Model | Vendor | API id (verified) | Cutoff | Source (card) |
|---|---|---|---|---|
| Claude Opus 4.8 | Anthropic | `claude-opus-4-8` | 2026-01-31 | https://anthropic.com/claude-opus-4-8-system-card |
| Claude Sonnet 4.6 | Anthropic | `claude-sonnet-4-6` | 2026-01-31 | https://anthropic.com/claude-sonnet-4-6-system-card |
| Claude Opus 4.6 | Anthropic | `claude-opus-4-6` | 2025-08-31 | https://anthropic.com/claude-opus-4-6-system-card |
| Claude Sonnet 4.5 | Anthropic | `claude-sonnet-4-5-20250929` | 2025-07-31 | https://anthropic.com/claude-sonnet-4-5-system-card |
| Gemini 3.1 Pro | Google | `gemini-3.1-pro-preview` | 2025-01-31 | https://deepmind.google/models/model-cards/gemini-3-1-pro/ |
| Gemini 3.5 Flash | Google | `gemini-3.5-flash` | 2025-01-31 | https://deepmind.google/models/model-cards/gemini-3-5-flash/ |
| GPT-5.5 | OpenAI | `gpt-5.5` | 2025-12-01 | https://developers.openai.com/api/docs/models/gpt-5.5 |
| GPT-5.2 | OpenAI | `gpt-5.2` | 2025-08-31 | https://developers.openai.com/api/docs/models/gpt-5.2 |
| GPT-5 | OpenAI | `gpt-5` | 2024-09-30 | https://developers.openai.com/api/docs/models/gpt-5 |

## Cross-checks and notes

- **Claude Opus 4.8 / Sonnet 4.6 (2026-01-31):** Anthropic reports BOTH the
  training-data cutoff and the (earlier) reliable-knowledge cutoff as end of
  January 2026 for the current flagships. Cross-checked against Anthropic's
  "How up-to-date is Claude's training data" help-center page and Opus 4.8
  system-card coverage. This file uses the January 2026 value.
- **Claude Opus 4.6 (2025-08-31) and Sonnet 4.5 (2025-07-31):** training-data
  cutoffs per their system cards (the reliable-knowledge cutoff is earlier,
  which would only widen the gaps). Kept for an Anthropic-internal cutoff
  spread so the pre/post boundary is testable within one vendor's family.
- **Gemini 3.1 Pro / 3.5 Flash (2025-01-31):** ALL current Gemini models share a
  ~January 2025 knowledge cutoff per their model cards. Cross-checked: Vertex AI
  lists `gemini-3.1-pro-preview` with a January 2025 knowledge cutoff. Gemini
  3.1 Pro is currently exposed only as a `-preview` id.
- **OpenAI GPT-5.5 / GPT-5.2 / GPT-5 (2025-12-01 / 2025-08-31 / 2024-09-30):**
  per OpenAI's model docs (also recorded in model-gap.json). These give the
  widest cutoff spread and run only when `OPENAI_API_KEY` is present. Their API
  ids should be re-confirmed against `GET /v1/models` the first time a key is
  available.

## Disagreements

No disagreement was found between `model-gap.json` and the spot-checked cards
for the values used here. Per the experiment's rule, if a card and the widget
ever disagree, the card wins and the discrepancy is noted in this file.
