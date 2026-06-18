# URL Influence: Results

Generated: 2026-06-18T23:47:26.989Z
Judge model: `claude-sonnet-4-5`
Judged outputs: 3868 (judge failures: 3)

> An interactive, filterable view of every cell (prompt, model output, and the judge's full prompt + raw verdict) is in [dashboard.html](dashboard.html) — open it in a browser to slice by model / condition / pre-vs-post cutoff / pass-fail and read each verdict.

## How to read this

**The question.** Can a bare *opaque* URL (just the string, page never fetched) make a model produce a better answer than simply naming the task — and does that only happen for content from before the model's training cutoff? If so, the URL is acting as a retrieval key into the weights.

**Two tracks, measured separately (this is important).** The corpus has two kinds of item and they must NOT be averaged together:

- **API-usage items with real opaque pointers** — the model is asked to USE a real API or recall real content, and the opaque URL is intended to point at that content. Correctness = did it produce the right surface. **The LIFT metric below is computed on these only.** This is the real test.
- **Knowledge-calibration items** (`scroll-triggered-animations`, `arxiv-future-fake-real-id`, `html-in-canvas`) — the content post-dates every model, so the *correct* answer is "I can't determine this". A bare URL scores HIGH here precisely because it hands the model nothing, so it correctly refuses. Averaging these into the lift manufactures a fake "url-only helps post-cutoff" signal — so they are reported on their own (refusal calibration), never in the lift.

- **Intentional opaque structural controls** (`js-promise`) have `validation.opaqueRole = "structural-control"`. Their `url-only` prompt may contain a fake, missing, or unrelated opaque SO/ChromeStatus-shaped URL. They are useful controls, but excluded from headline lift because they are not real URL-to-content pointers.

**LIFT** (API-usage items with real opaque pointers) `= mean(correctness | url-only) − mean(correctness | name-only)`. Positive = the bare URL alone beat naming the task. The hypothesis predicts **positive lift pre-cutoff, ~zero post-cutoff**.

**Correctness** is 0..1 from an LLM-as-judge; every judge prompt + raw verdict is in [transcript.jsonl](transcript.jsonl) / [RUNLOG.md](RUNLOG.md) / [dashboard.html](dashboard.html) so each score is checkable.

**Controls.** `fake-structural-url` (plausible but nonexistent, same shape) and `random-url` (unrelated real URL) should collapse toward name-only / zero — if URL shape or merely having a URL did the work, these would lift too.

**Identifier probes.** Conditions such as `mdn-url-only`, `spec-url-only`, and `bcd-key-only` are exploratory. They are useful for diagnosing which identifiers a model can decode, but the headline lift remains strictly `url-only - name-only`.

**Blanks** are always labelled: `— (no items)`, `— (run error)`, `— (judge failed)`, `— (skipped: no key)`, `— (n/a)`.

## Conditions

| Condition | Group | Required | Meaning |
|---|---|---|---|
| name-only | core | yes | task described in words, no URL (baseline) |
| url-only | core | yes | only the opaque URL or id; the page is never fetched or pasted |
| mdn-url-only | identifier-probe | no | only the descriptive documentation URL; this measures URL text hints |
| spec-url-only | identifier-probe | no | only the canonical spec URL, when the item has one |
| bcd-key-only | identifier-probe | no | only the Browser Compat Data key, when the item has one |
| url+name | context | yes | opaque URL plus the task name |
| full-content | ceiling | yes | the real page content is fetched and pasted in |
| fake-structural-url | control | yes | plausible but nonexistent URL of the same shape (structure control) |
| random-url | control | yes | unrelated real URL (off-target control) |

## Models

| Model | Vendor | API id | Knowledge cutoff | Source |
|---|---|---|---|---|
| Claude Opus 4.8 | anthropic | `claude-opus-4-8` | 2026-01-31 | [card](https://anthropic.com/claude-opus-4-8-system-card) |
| Claude Sonnet 4.6 | anthropic | `claude-sonnet-4-6` | 2026-01-31 | [card](https://anthropic.com/claude-sonnet-4-6-system-card) |
| Claude Opus 4.6 | anthropic | `claude-opus-4-6` | 2025-08-31 | [card](https://anthropic.com/claude-opus-4-6-system-card) |
| Claude Sonnet 4.5 | anthropic | `claude-sonnet-4-5-20250929` | 2025-07-31 | [card](https://anthropic.com/claude-sonnet-4-5-system-card) |
| Gemini 3.1 Pro | google | `gemini-3.1-pro-preview` | 2025-01-31 | [card](https://deepmind.google/models/model-cards/gemini-3-1-pro/) |
| Gemini 3.5 Flash | google | `gemini-3.5-flash` | 2025-01-31 | [card](https://deepmind.google/models/model-cards/gemini-3-5-flash/) |
| GPT-5.5 | openai | `gpt-5.5` | 2025-12-01 | [card](https://developers.openai.com/api/docs/models/gpt-5.5) |
| GPT-5.2 | openai | `gpt-5.2` | 2025-08-31 | [card](https://developers.openai.com/api/docs/models/gpt-5.2) |
| GPT-5 | openai | `gpt-5` | 2024-09-30 | [card](https://developers.openai.com/api/docs/models/gpt-5) |
| Grok 4.3 | xai | `grok-4.3` | 2025-12-31 | [card](https://docs.x.ai/developers/models/grok-4.3) |
| Grok 4 | xai | `grok-4` | 2024-11-30 | [card](https://docs.x.ai/developers/models/grok-4) |
| GLM-5.2 | zai | `glm-5.2` | 2025-10-31 | [card](https://aiknowledgecutoff.com/z-ai/glm-5.2) |
| GLM-5.1 | zai | `glm-5.1` | 2025-10-31 | [card](https://aiknowledgecutoff.com/z-ai/glm-5.1) |

See [SOURCES.md](SOURCES.md) for the full model -> cutoff -> source table.

## Headline: lift (real opaque API-usage items only), split by cutoff

`LIFT = mean(url-only) − mean(name-only)` over API-usage items whose opaque URL is intended to be a real pointer. Knowledge-calibration items and intentional opaque structural controls are excluded. `n pre/post` = eligible API-usage items each side of this model's cutoff.

| Model | cutoff | overall lift | pre-cutoff lift | post-cutoff lift | n pre/post |
|---|---|---|---|---|---|
| Claude Opus 4.8 | 2026-01-31 | -0.61 | -0.60 | -0.64 | 25/11 |
| Claude Sonnet 4.6 | 2026-01-31 | -0.59 | -0.56 | -0.67 | 25/11 |
| Claude Opus 4.6 | 2025-08-31 | -0.58 | -0.54 | -0.65 | 22/14 |
| Claude Sonnet 4.5 | 2025-07-31 | -0.57 | -0.56 | -0.58 | 21/15 |
| Gemini 3.1 Pro | 2025-01-31 | -0.48 | -0.57 | -0.42 | 14/22 |
| Gemini 3.5 Flash | 2025-01-31 | -0.34 | -0.49 | -0.25 | 14/22 |
| GPT-5.5 | 2025-12-01 | -0.61 | -0.55 | -0.73 | 23/13 |
| GPT-5.2 | 2025-08-31 | -0.65 | -0.60 | -0.74 | 22/14 |
| GPT-5 | 2024-09-30 | -0.47 | -0.60 | -0.40 | 13/23 |
| Grok 4.3 | 2025-12-31 | -0.63 | -0.57 | -0.74 | 24/12 |
| Grok 4 | 2024-11-30 | -0.62 | -0.62 | -0.62 | 13/23 |
| GLM-5.2 | 2025-10-31 | -0.59 | -0.59 | -0.58 | 23/13 |
| GLM-5.1 | 2025-10-31 | -0.55 | -0.47 | -0.69 | 23/13 |

## Real opaque API-usage items: pre/post mean correctness per condition

Knowledge-calibration items and intentional opaque structural controls excluded. In **pre** rows, does `url-only` approach `name-only`? In **post** rows, it should not beat `name-only`; controls stay flat.

### Claude Opus 4.8 (cutoff 2026-01-31) — 25 pre / 11 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.75 | 0.15 | 0.81 | 0.91 | 1.00 | 0.87 | 0.99 | 0.47 | 0.00 |
| post-cutoff | 0.64 | 0.00 | 0.67 | — (n/a) | — (n/a) | 0.76 | 0.69 | 0.37 | 0.00 |

### Claude Sonnet 4.6 (cutoff 2026-01-31) — 25 pre / 11 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.72 | 0.16 | 0.77 | 0.83 | 0.99 | 0.79 | 0.98 | 0.30 | 0.00 |
| post-cutoff | 0.67 | 0.00 | 0.54 | — (n/a) | — (n/a) | 0.63 | 0.80 | 0.25 | 0.00 |

### Claude Opus 4.6 (cutoff 2025-08-31) — 22 pre / 14 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.67 | 0.14 | 0.68 | 0.77 | 1.00 | 0.75 | 0.98 | 0.45 | 0.00 |
| post-cutoff | 0.65 | 0.00 | 0.61 | — (n/a) | — (n/a) | 0.71 | 0.85 | 0.38 | 0.00 |

### Claude Sonnet 4.5 (cutoff 2025-07-31) — 21 pre / 15 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.66 | 0.10 | 0.59 | 0.91 | 0.97 | 0.69 | 0.99 | 0.25 | 0.00 |
| post-cutoff | 0.58 | 0.00 | 0.36 | — (n/a) | — (n/a) | 0.58 | 0.71 | 0.19 | 0.00 |

### Gemini 3.1 Pro (cutoff 2025-01-31) — 14 pre / 22 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.79 | 0.21 | 0.93 | 0.71 | 0.96 | 0.84 | 0.94 | 0.35 | 0.00 |
| post-cutoff | 0.42 | 0.00 | 0.19 | — (n/a) | — (n/a) | 0.46 | 0.75 | 0.23 | 0.00 |

### Gemini 3.5 Flash (cutoff 2025-01-31) — 14 pre / 22 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.78 | 0.29 | 0.64 | 0.48 | 0.95 | 0.89 | 0.96 | 0.19 | 0.00 |
| post-cutoff | 0.25 | 0.00 | 0.20 | — (n/a) | — (n/a) | 0.45 | 0.83 | 0.12 | 0.00 |

### GPT-5.5 (cutoff 2025-12-01) — 23 pre / 13 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.77 | 0.22 | 0.78 | 0.88 | 0.93 | 0.97 | 0.98 | 0.32 | 0.00 |
| post-cutoff | 0.73 | 0.00 | 0.62 | — (n/a) | — (n/a) | 0.84 | 0.91 | 0.23 | 0.00 |

### GPT-5.2 (cutoff 2025-08-31) — 22 pre / 14 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.69 | 0.09 | 0.53 | 1.00 | 0.99 | 0.60 | 0.98 | 0.13 | 0.00 |
| post-cutoff | 0.74 | 0.00 | 0.18 | — (n/a) | — (n/a) | 0.63 | 0.90 | 0.09 | 0.00 |

### GPT-5 (cutoff 2024-09-30) — 13 pre / 23 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.83 | 0.23 | 0.91 | 1.00 | 0.82 | 0.90 | 1.00 | 0.15 | 0.00 |
| post-cutoff | 0.40 | 0.00 | 0.24 | — (n/a) | — (n/a) | 0.47 | 0.85 | 0.13 | 0.00 |

### Grok 4.3 (cutoff 2025-12-31) — 24 pre / 12 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.67 | 0.10 | 0.61 | 0.86 | 0.74 | 0.69 | 0.96 | 0.04 | 0.00 |
| post-cutoff | 0.74 | 0.00 | 0.35 | — (n/a) | — (n/a) | 0.83 | 0.81 | 0.07 | 0.00 |

### Grok 4 (cutoff 2024-11-30) — 13 pre / 23 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.77 | 0.15 | 0.91 | 0.89 | 0.74 | 0.94 | 0.93 | 0.00 | 0.00 |
| post-cutoff | 0.62 | 0.00 | 0.33 | — (n/a) | — (n/a) | 0.69 | 0.85 | 0.07 | 0.00 |

### GLM-5.2 (cutoff 2025-10-31) — 23 pre / 13 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.68 | 0.09 | 0.61 | 0.77 | 0.89 | 0.80 | 0.98 | 0.25 | 0.00 |
| post-cutoff | 0.58 | 0.00 | 0.53 | — (n/a) | — (n/a) | 0.83 | 0.87 | 0.43 | 0.00 |

### GLM-5.1 (cutoff 2025-10-31) — 23 pre / 13 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.66 | 0.20 | 0.61 | 1.00 | 0.96 | 0.72 | 0.98 | 0.21 | 0.00 |
| post-cutoff | 0.69 | 0.00 | 0.46 | — (n/a) | — (n/a) | 0.72 | 0.90 | 0.20 | 0.00 |

## Knowledge-calibration items: correct-refusal rate per condition

These items (`scroll-triggered-animations`, `arxiv-future-fake-real-id`, `html-in-canvas`) post-date every model; correctness = the model correctly said it could not determine the answer. NOT part of the lift. The thing to see: a bare `url-only` (and `name-only`) often score HIGH here — refusing is easy when you're handed nothing — which is exactly why these would pollute a lift average if included.

| Model | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| Claude Opus 4.8 | 0.75 | 1.00 | 0.47 | — (n/a) | — (n/a) | 0.77 | 0.68 | 0.43 | 0.33 |
| Claude Sonnet 4.6 | 0.33 | 0.33 | 0.67 | — (n/a) | — (n/a) | 0.98 | 0.32 | 0.70 | 0.00 |
| Claude Opus 4.6 | 0.68 | 0.33 | 0.70 | — (n/a) | — (n/a) | 0.42 | 0.37 | 0.70 | 0.00 |
| Claude Sonnet 4.5 | 0.37 | 0.67 | 0.70 | — (n/a) | — (n/a) | 0.63 | 0.07 | 0.70 | 0.00 |
| Gemini 3.1 Pro | 0.93 | 1.00 | 0.93 | — (n/a) | — (n/a) | 1.00 | 0.10 | 0.70 | 0.00 |
| Gemini 3.5 Flash | 0.40 | 1.00 | 0.73 | — (n/a) | — (n/a) | 0.57 | 0.32 | 0.47 | 0.00 |
| GPT-5.5 | 0.77 | 1.00 | 0.33 | — (n/a) | — (n/a) | 0.43 | 0.37 | 0.33 | 0.00 |
| GPT-5.2 | 0.93 | 1.00 | 0.77 | — (n/a) | — (n/a) | 0.70 | 0.03 | 0.73 | 0.00 |
| GPT-5 | 0.37 | 1.00 | 1.00 | — (n/a) | — (n/a) | 0.37 | 0.03 | 0.63 | 0.00 |
| Grok 4.3 | 0.62 | 1.00 | 0.67 | — (n/a) | — (n/a) | 0.70 | 0.10 | 0.95 | 0.00 |
| Grok 4 | 0.33 | 0.67 | 0.70 | — (n/a) | — (n/a) | 0.33 | 0.10 | 0.87 | 0.00 |
| GLM-5.2 | 1.00 | 1.00 | 0.67 | — (n/a) | — (n/a) | 0.77 | 0.07 | 0.73 | 0.00 |
| GLM-5.1 | 0.68 | 0.67 | 0.70 | — (n/a) | — (n/a) | 0.40 | 0.05 | 0.75 | 0.00 |

## All items, mean correctness by condition x model

_Both tracks combined — included only for completeness. Use the API-usage table above for the real signal._

| Condition | Claude Opus 4.8 (cut 2026-01-31) | Claude Sonnet 4.6 (cut 2026-01-31) | Claude Opus 4.6 (cut 2025-08-31) | Claude Sonnet 4.5 (cut 2025-07-31) | Gemini 3.1 Pro (cut 2025-01-31) | Gemini 3.5 Flash (cut 2025-01-31) | GPT-5.5 (cut 2025-12-01) | GPT-5.2 (cut 2025-08-31) | GPT-5 (cut 2024-09-30) | Grok 4.3 (cut 2025-12-31) | Grok 4 (cut 2024-11-30) | GLM-5.2 (cut 2025-10-31) | GLM-5.1 (cut 2025-10-31) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| name-only | 0.73 | 0.68 | 0.68 | 0.62 | 0.60 | 0.46 | 0.76 | 0.73 | 0.55 | 0.69 | 0.66 | 0.68 | 0.68 |
| url-only | 0.17 | 0.13 | 0.10 | 0.10 | 0.15 | 0.17 | 0.20 | 0.13 | 0.15 | 0.14 | 0.10 | 0.13 | 0.17 |
| mdn-url-only | 0.75 | 0.70 | 0.66 | 0.52 | 0.52 | 0.41 | 0.70 | 0.44 | 0.52 | 0.55 | 0.57 | 0.60 | 0.58 |
| spec-url-only | 0.92 | 0.77 | 0.68 | 0.81 | 0.63 | 0.43 | 0.89 | 1.00 | 1.00 | 0.76 | 0.90 | 0.77 | 1.00 |
| bcd-key-only | 1.00 | 0.99 | 1.00 | 0.97 | 0.97 | 0.96 | 0.93 | 0.99 | 0.84 | 0.77 | 0.77 | 0.90 | 0.97 |
| url+name | 0.83 | 0.77 | 0.72 | 0.65 | 0.65 | 0.63 | 0.89 | 0.63 | 0.62 | 0.74 | 0.75 | 0.81 | 0.70 |
| full-content | 0.89 | 0.88 | 0.89 | 0.81 | 0.77 | 0.84 | 0.92 | 0.89 | 0.84 | 0.85 | 0.82 | 0.87 | 0.88 |
| fake-structural-url | 0.43 | 0.31 | 0.46 | 0.28 | 0.33 | 0.19 | 0.31 | 0.18 | 0.17 | 0.14 | 0.11 | 0.36 | 0.27 |
| random-url | 0.03 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

## Interpretation

- **Headline (real opaque API-usage items only):** mean lift -0.56 overall — among items whose opaque URL is meant to be a real pointer, a bare opaque URL, with no page content, does NOT beat simply naming the task, and across models it tends to lower the score. The model is more cautious or more error-prone when handed only a context-free URL string than when told plainly what to build.
- **Boundary (real opaque API-usage items):** mean pre-cutoff lift -0.56, mean post-cutoff lift -0.59. Pre-cutoff lift exceeds post-cutoff lift — the direction the hypothesis predicts — but both are negative, so the URL is a weak (and net-negative) retrieval key at this corpus size.
- **Why the earlier read was wrong:** an apparent positive *post-cutoff* url-only score comes from the knowledge-calibration items (scroll-triggered-animations, arxiv-future-fake-real-id, html-in-canvas), where the correct answer is "I don't know". A bare URL elicits exactly that refusal, scoring high — which is the OPPOSITE of the URL helping the model use an API. Those items are now excluded from the lift.
- **What does work:** `url+name` and the `full-content` ceiling score well across the board, and the controls (`fake-structural-url`, `random-url`) collapse toward name-only / zero, so the harness is measuring real content rather than URL shape.

Per model (real opaque API-usage items):
- **Claude Opus 4.8:** bare URL did not help / hurt (lift -0.61); full-content 0.90 vs name-only 0.72; pre -0.60 / post -0.64 (n 25/11).
- **Claude Sonnet 4.6:** bare URL did not help / hurt (lift -0.59); full-content 0.92 vs name-only 0.70; pre -0.56 / post -0.67 (n 25/11).
- **Claude Opus 4.6:** bare URL did not help / hurt (lift -0.58); full-content 0.93 vs name-only 0.67; pre -0.54 / post -0.65 (n 22/14).
- **Claude Sonnet 4.5:** bare URL did not help / hurt (lift -0.57); full-content 0.87 vs name-only 0.63; pre -0.56 / post -0.58 (n 21/15).
- **Gemini 3.1 Pro:** bare URL did not help / hurt (lift -0.48); full-content 0.82 vs name-only 0.56; pre -0.57 / post -0.42 (n 14/22).
- **Gemini 3.5 Flash:** bare URL did not help / hurt (lift -0.34); full-content 0.88 vs name-only 0.46; pre -0.49 / post -0.25 (n 14/22).
- **GPT-5.5:** bare URL did not help / hurt (lift -0.61); full-content 0.96 vs name-only 0.75; pre -0.55 / post -0.73 (n 23/13).
- **GPT-5.2:** bare URL did not help / hurt (lift -0.65); full-content 0.95 vs name-only 0.71; pre -0.60 / post -0.74 (n 22/14).
- **GPT-5:** bare URL did not help / hurt (lift -0.47); full-content 0.91 vs name-only 0.55; pre -0.60 / post -0.40 (n 13/23).
- **Grok 4.3:** bare URL did not help / hurt (lift -0.63); full-content 0.91 vs name-only 0.69; pre -0.57 / post -0.74 (n 24/12).
- **Grok 4:** bare URL did not help / hurt (lift -0.62); full-content 0.88 vs name-only 0.68; pre -0.62 / post -0.62 (n 13/23).
- **GLM-5.2:** bare URL did not help / hurt (lift -0.59); full-content 0.94 vs name-only 0.64; pre -0.59 / post -0.58 (n 23/13).
- **GLM-5.1:** bare URL did not help / hurt (lift -0.55); full-content 0.95 vs name-only 0.67; pre -0.47 / post -0.69 (n 23/13).

---

_Small scale (a handful of API-usage items per pre/post bucket), so treat these as directional, not statistically significant — the post-cutoff API bucket is especially thin and is the main reason for expanding the corpus. Cutoff dates are the vendors' published values (see SOURCES.md). Every prompt, output, and judge prompt + raw verdict is in [transcript.jsonl](transcript.jsonl), [RUNLOG.md](RUNLOG.md), and [dashboard.html](dashboard.html)._