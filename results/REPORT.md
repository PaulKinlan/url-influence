# URL Influence: Results

Generated: 2026-06-18T00:49:31.292Z
Judge model: `claude-sonnet-4-5`
Judged outputs: 1370 (judge failures: 0)

> An interactive, filterable view of every cell (prompt, model output, and the judge's full prompt + raw verdict) is in [dashboard.html](dashboard.html) — open it in a browser to slice by model / condition / pre-vs-post cutoff / pass-fail and read each verdict.

## How to read this

**The question.** Can a bare *opaque* URL (just the string, page never fetched) make a model produce a better answer than simply naming the task — and does that only happen for content from before the model's training cutoff? If so, the URL is acting as a retrieval key into the weights.

**Two tracks, measured separately (this is important).** The corpus has two kinds of item and they must NOT be averaged together:

- **API-usage items** — the model is asked to USE a real API or recall real content; correctness = did it produce the right surface. **The LIFT metric below is computed on these only.** This is the real test.
- **Knowledge-calibration items** (`scroll-triggered-animations`, `arxiv-future-fake-real-id`, `html-in-canvas`) — the content post-dates every model, so the *correct* answer is "I can't determine this". A bare URL scores HIGH here precisely because it hands the model nothing, so it correctly refuses. Averaging these into the lift manufactures a fake "url-only helps post-cutoff" signal — so they are reported on their own (refusal calibration), never in the lift.

**LIFT** (API-usage items) `= mean(correctness | url-only) − mean(correctness | name-only)`. Positive = the bare URL alone beat naming the task. The hypothesis predicts **positive lift pre-cutoff, ~zero post-cutoff**.

**Correctness** is 0..1 from an LLM-as-judge; every judge prompt + raw verdict is in [transcript.jsonl](transcript.jsonl) / [RUNLOG.md](RUNLOG.md) / [dashboard.html](dashboard.html) so each score is checkable.

**Controls.** `fake-structural-url` (plausible but nonexistent, same shape) and `random-url` (unrelated real URL) should collapse toward name-only / zero — if URL shape or merely having a URL did the work, these would lift too.

**Blanks** are always labelled: `— (no items)`, `— (run error)`, `— (judge failed)`, `— (skipped: no key)`.

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

See [SOURCES.md](SOURCES.md) for the full model -> cutoff -> source table.

## Headline: lift (API-usage items only), split by cutoff

`LIFT = mean(url-only) − mean(name-only)` over API-usage items only (knowledge-calibration items excluded). `n pre/post` = API-usage items each side of this model's cutoff.

| Model | cutoff | overall lift | pre-cutoff lift | post-cutoff lift | n pre/post |
|---|---|---|---|---|---|
| Claude Opus 4.8 | 2026-01-31 | -0.54 | -0.33 | -0.77 | 16/15 |
| Claude Sonnet 4.6 | 2026-01-31 | -0.53 | -0.31 | -0.76 | 16/15 |
| Claude Opus 4.6 | 2025-08-31 | -0.55 | -0.42 | -0.65 | 14/17 |
| Claude Sonnet 4.5 | 2025-07-31 | -0.50 | -0.42 | -0.57 | 14/17 |
| Gemini 3.1 Pro | 2025-01-31 | -0.36 | -0.33 | -0.38 | 9/22 |
| Gemini 3.5 Flash | 2025-01-31 | -0.27 | -0.32 | -0.25 | 9/22 |
| GPT-5.5 | 2025-12-01 | -1.00 | — (no items) | -1.00 | 0/14 |
| GPT-5.2 | 2025-08-31 | -0.76 | — (no items) | -0.76 | 0/14 |
| GPT-5 | 2024-09-30 | — | — (no items) | — | 0/14 |

## API-usage items: pre/post mean correctness per condition

Knowledge-calibration items excluded. In **pre** rows, does `url-only` approach `name-only`? In **post** rows, it should not beat `name-only`; controls stay flat.

### Claude Opus 4.8 (cutoff 2026-01-31) — 16 pre / 15 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.56 | 0.23 | 0.76 | 0.98 | 0.33 | 0.00 |
| post-cutoff | 0.79 | 0.02 | 0.87 | 0.78 | 0.58 | 0.00 |

### Claude Sonnet 4.6 (cutoff 2026-01-31) — 16 pre / 15 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.56 | 0.25 | 0.72 | 0.98 | 0.25 | 0.00 |
| post-cutoff | 0.76 | 0.00 | 0.65 | 0.85 | 0.34 | 0.00 |

### Claude Opus 4.6 (cutoff 2025-08-31) — 14 pre / 17 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.57 | 0.14 | 0.78 | 1.00 | 0.31 | 0.00 |
| post-cutoff | 0.65 | 0.00 | 0.73 | 0.87 | 0.41 | 0.00 |

### Claude Sonnet 4.5 (cutoff 2025-07-31) — 14 pre / 17 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.56 | 0.14 | 0.63 | 0.91 | 0.25 | 0.00 |
| post-cutoff | 0.57 | 0.00 | 0.53 | 0.80 | 0.16 | 0.00 |

### Gemini 3.1 Pro (cutoff 2025-01-31) — 9 pre / 22 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.67 | 0.33 | 0.78 | 0.98 | 0.32 | 0.00 |
| post-cutoff | 0.42 | 0.05 | 0.34 | 0.75 | 0.23 | 0.00 |

### Gemini 3.5 Flash (cutoff 2025-01-31) — 9 pre / 22 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.66 | 0.33 | 0.88 | 0.99 | 0.19 | 0.00 |
| post-cutoff | 0.25 | 0.00 | 0.39 | 0.83 | 0.12 | 0.00 |

### GPT-5.5 (cutoff 2025-12-01) — 0 pre / 14 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) |
| post-cutoff | 1.00 | 0.00 | 0.99 | 0.92 | 0.42 | 0.00 |

### GPT-5.2 (cutoff 2025-08-31) — 0 pre / 14 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) |
| post-cutoff | 0.76 | 0.00 | 0.28 | 0.92 | 0.09 | 0.00 |

### GPT-5 (cutoff 2024-09-30) — 0 pre / 14 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) |
| post-cutoff | — (no items) | 0.00 | — (no items) | 0.95 | 0.00 | 0.00 |

## Knowledge-calibration items: correct-refusal rate per condition

These items (`scroll-triggered-animations`, `arxiv-future-fake-real-id`, `html-in-canvas`) post-date every model; correctness = the model correctly said it could not determine the answer. NOT part of the lift. The thing to see: a bare `url-only` (and `name-only`) often score HIGH here — refusing is easy when you're handed nothing — which is exactly why these would pollute a lift average if included.

| Model | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| Claude Opus 4.8 | 0.75 | 1.00 | 0.72 | 0.68 | 0.43 | 0.33 |
| Claude Sonnet 4.6 | 0.33 | 0.67 | 0.68 | 0.32 | 0.70 | 0.00 |
| Claude Opus 4.6 | 0.68 | 0.67 | 0.63 | 0.37 | 0.70 | 0.00 |
| Claude Sonnet 4.5 | 0.37 | 0.67 | 0.37 | 0.07 | 0.70 | 0.00 |
| Gemini 3.1 Pro | 0.93 | 1.00 | 1.00 | 0.10 | 0.70 | 0.00 |
| Gemini 3.5 Flash | 0.40 | 0.67 | 0.65 | 0.32 | 0.47 | 0.00 |
| GPT-5.5 | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) |
| GPT-5.2 | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) |
| GPT-5 | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) | — (no items) |

## All items, mean correctness by condition x model

_Both tracks combined — included only for completeness. Use the API-usage table above for the real signal._

| Condition | Claude Opus 4.8 (cut 2026-01-31) | Claude Sonnet 4.6 (cut 2026-01-31) | Claude Opus 4.6 (cut 2025-08-31) | Claude Sonnet 4.5 (cut 2025-07-31) | Gemini 3.1 Pro (cut 2025-01-31) | Gemini 3.5 Flash (cut 2025-01-31) | GPT-5.5 (cut 2025-12-01) | GPT-5.2 (cut 2025-08-31) | GPT-5 (cut 2024-09-30) |
|---|---|---|---|---|---|---|---|---|---|
| name-only | 0.68 | 0.63 | 0.62 | 0.55 | 0.53 | 0.37 | 1.00 | 0.76 | — (no items) |
| url-only | 0.21 | 0.18 | 0.12 | 0.12 | 0.21 | 0.15 | 0.00 | 0.00 | 0.00 |
| url+name | 0.81 | 0.69 | 0.74 | 0.56 | 0.51 | 0.54 | 0.99 | 0.28 | — (no items) |
| full-content | 0.86 | 0.87 | 0.88 | 0.78 | 0.75 | 0.83 | 0.92 | 0.92 | 0.95 |
| fake-structural-url | 0.45 | 0.33 | 0.40 | 0.25 | 0.30 | 0.17 | 0.42 | 0.09 | 0.00 |
| random-url | 0.03 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

## Interpretation

- **Headline (API-usage items only):** mean lift -0.56 overall — a bare opaque URL, with no page content, does NOT beat simply naming the task, and across models it tends to lower the score. The model is more cautious or more error-prone when handed only a context-free URL string than when told plainly what to build.
- **Boundary (API-usage items):** mean pre-cutoff lift -0.36, mean post-cutoff lift -0.64. Pre-cutoff lift exceeds post-cutoff lift — the direction the hypothesis predicts — but both are negative, so the URL is a weak (and net-negative) retrieval key at this corpus size.
- **Why the earlier read was wrong:** an apparent positive *post-cutoff* url-only score comes from the knowledge-calibration items (scroll-triggered-animations, arxiv-future-fake-real-id, html-in-canvas), where the correct answer is "I don't know". A bare URL elicits exactly that refusal, scoring high — which is the OPPOSITE of the URL helping the model use an API. Those items are now excluded from the lift.
- **What does work:** `url+name` and the `full-content` ceiling score well across the board, and the controls (`fake-structural-url`, `random-url`) collapse toward name-only / zero, so the harness is measuring real content rather than URL shape.

Per model (API-usage items):
- **Claude Opus 4.8:** bare URL did not help / hurt (lift -0.54); full-content 0.88 vs name-only 0.67; pre -0.33 / post -0.77 (n 16/15).
- **Claude Sonnet 4.6:** bare URL did not help / hurt (lift -0.53); full-content 0.92 vs name-only 0.65; pre -0.31 / post -0.76 (n 16/15).
- **Claude Opus 4.6:** bare URL did not help / hurt (lift -0.55); full-content 0.93 vs name-only 0.61; pre -0.42 / post -0.65 (n 14/17).
- **Claude Sonnet 4.5:** bare URL did not help / hurt (lift -0.50); full-content 0.85 vs name-only 0.57; pre -0.42 / post -0.57 (n 14/17).
- **Gemini 3.1 Pro:** bare URL did not help / hurt (lift -0.36); full-content 0.82 vs name-only 0.49; pre -0.33 / post -0.38 (n 9/22).
- **Gemini 3.5 Flash:** bare URL did not help / hurt (lift -0.27); full-content 0.88 vs name-only 0.37; pre -0.32 / post -0.25 (n 9/22).
- **GPT-5.5:** bare URL did not help / hurt (lift -1.00); full-content 0.92 vs name-only 1.00; pre   -   / post -1.00 (n 0/14).
- **GPT-5.2:** bare URL did not help / hurt (lift -0.76); full-content 0.92 vs name-only 0.76; pre   -   / post -0.76 (n 0/14).
- **GPT-5:** no comparable API-usage data; pre   -   / post   -   (n 0/14).

---

_Small scale (a handful of API-usage items per pre/post bucket), so treat these as directional, not statistically significant — the post-cutoff API bucket is especially thin and is the main reason for expanding the corpus. Cutoff dates are the vendors' published values (see SOURCES.md). Every prompt, output, and judge prompt + raw verdict is in [transcript.jsonl](transcript.jsonl), [RUNLOG.md](RUNLOG.md), and [dashboard.html](dashboard.html)._