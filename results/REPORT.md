# URL Influence: Results

Generated: 2026-06-17T20:59:52.310Z
Judge model: `claude-sonnet-4-5`
Judged outputs: 720 (judge failures: 0)

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

_Models with no scored rows this run: GPT-5.5 (`gpt-5.5`), GPT-5.2 (`gpt-5.2`), GPT-5 (`gpt-5`). The OpenAI models were attempted but every call returned HTTP 429 insufficient_quota (the key had no quota), so they are excluded; with a funded key they are included with zero code change._

## Models

| Model | Vendor | API id | Knowledge cutoff | Source |
|---|---|---|---|---|
| Claude Opus 4.8 | anthropic | `claude-opus-4-8` | 2026-01-31 | [card](https://anthropic.com/claude-opus-4-8-system-card) |
| Claude Sonnet 4.6 | anthropic | `claude-sonnet-4-6` | 2026-01-31 | [card](https://anthropic.com/claude-sonnet-4-6-system-card) |
| Claude Opus 4.6 | anthropic | `claude-opus-4-6` | 2025-08-31 | [card](https://anthropic.com/claude-opus-4-6-system-card) |
| Claude Sonnet 4.5 | anthropic | `claude-sonnet-4-5-20250929` | 2025-07-31 | [card](https://anthropic.com/claude-sonnet-4-5-system-card) |
| Gemini 3.1 Pro | google | `gemini-3.1-pro-preview` | 2025-01-31 | [card](https://deepmind.google/models/model-cards/gemini-3-1-pro/) |
| Gemini 3.5 Flash | google | `gemini-3.5-flash` | 2025-01-31 | [card](https://deepmind.google/models/model-cards/gemini-3-5-flash/) |

See [SOURCES.md](SOURCES.md) for the full model -> cutoff -> source table.

## Headline: lift (API-usage items only), split by cutoff

`LIFT = mean(url-only) − mean(name-only)` over API-usage items only (knowledge-calibration items excluded). `n pre/post` = API-usage items each side of this model's cutoff.

| Model | cutoff | overall lift | pre-cutoff lift | post-cutoff lift | n pre/post |
|---|---|---|---|---|---|
| Claude Opus 4.8 | 2026-01-31 | -0.32 | -0.33 | -0.20 | 16/1 |
| Claude Sonnet 4.6 | 2026-01-31 | -0.32 | -0.31 | -0.50 | 16/1 |
| Claude Opus 4.6 | 2025-08-31 | -0.42 | -0.42 | -0.42 | 14/3 |
| Claude Sonnet 4.5 | 2025-07-31 | -0.41 | -0.42 | -0.37 | 14/3 |
| Gemini 3.1 Pro | 2025-01-31 | -0.21 | -0.33 | -0.06 | 9/8 |
| Gemini 3.5 Flash | 2025-01-31 | -0.18 | -0.32 | -0.01 | 9/8 |

## API-usage items: pre/post mean correctness per condition

Knowledge-calibration items excluded. In **pre** rows, does `url-only` approach `name-only`? In **post** rows, it should not beat `name-only`; controls stay flat.

### Claude Opus 4.8 (cutoff 2026-01-31) — 16 pre / 1 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.56 | 0.23 | 0.76 | 0.98 | 0.33 | 0.00 |
| post-cutoff | 0.50 | 0.30 | 0.95 | 0.00 | 0.00 | 0.00 |

### Claude Sonnet 4.6 (cutoff 2026-01-31) — 16 pre / 1 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.56 | 0.25 | 0.72 | 0.98 | 0.25 | 0.00 |
| post-cutoff | 0.50 | 0.00 | 0.60 | 0.00 | 0.00 | 0.00 |

### Claude Opus 4.6 (cutoff 2025-08-31) — 14 pre / 3 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.57 | 0.14 | 0.78 | 1.00 | 0.31 | 0.00 |
| post-cutoff | 0.42 | 0.00 | 0.50 | 0.75 | 0.00 | 0.00 |

### Claude Sonnet 4.5 (cutoff 2025-07-31) — 14 pre / 3 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.56 | 0.14 | 0.63 | 0.91 | 0.25 | 0.00 |
| post-cutoff | 0.37 | 0.00 | 0.13 | 0.33 | 0.00 | 0.00 |

### Gemini 3.1 Pro (cutoff 2025-01-31) — 9 pre / 8 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.67 | 0.33 | 0.78 | 0.98 | 0.32 | 0.00 |
| post-cutoff | 0.19 | 0.13 | 0.00 | 0.63 | 0.11 | 0.00 |

### Gemini 3.5 Flash (cutoff 2025-01-31) — 9 pre / 8 post API items

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.66 | 0.33 | 0.88 | 0.99 | 0.19 | 0.00 |
| post-cutoff | 0.01 | 0.00 | 0.13 | 0.73 | 0.00 | 0.00 |

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

## All items, mean correctness by condition x model

_Both tracks combined — included only for completeness. Use the API-usage table above for the real signal._

| Condition | Claude Opus 4.8 (cut 2026-01-31) | Claude Sonnet 4.6 (cut 2026-01-31) | Claude Opus 4.6 (cut 2025-08-31) | Claude Sonnet 4.5 (cut 2025-07-31) | Gemini 3.1 Pro (cut 2025-01-31) | Gemini 3.5 Flash (cut 2025-01-31) |
|---|---|---|---|---|---|---|
| name-only | 0.58 | 0.52 | 0.56 | 0.50 | 0.52 | 0.36 |
| url-only | 0.35 | 0.30 | 0.20 | 0.20 | 0.35 | 0.25 |
| url+name | 0.76 | 0.71 | 0.72 | 0.51 | 0.50 | 0.54 |
| full-content | 0.89 | 0.83 | 0.87 | 0.70 | 0.70 | 0.78 |
| fake-structural-url | 0.33 | 0.31 | 0.32 | 0.28 | 0.29 | 0.15 |
| random-url | 0.05 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

## Interpretation

- **Headline (API-usage items only):** mean lift -0.31 overall — a bare opaque URL, with no page content, does NOT beat simply naming the task, and across models it tends to lower the score. The model is more cautious or more error-prone when handed only a context-free URL string than when told plainly what to build.
- **Boundary (API-usage items):** mean pre-cutoff lift -0.36, mean post-cutoff lift -0.26. The pre- vs post-cutoff gap on API-usage items is small or noisy at this corpus size, so the boundary effect is not yet demonstrated; the post-cutoff bucket is only one or two real items per model.
- **Why the earlier read was wrong:** an apparent positive *post-cutoff* url-only score comes from the knowledge-calibration items (scroll-triggered-animations, arxiv-future-fake-real-id, html-in-canvas), where the correct answer is "I don't know". A bare URL elicits exactly that refusal, scoring high — which is the OPPOSITE of the URL helping the model use an API. Those items are now excluded from the lift.
- **What does work:** `url+name` and the `full-content` ceiling score well across the board, and the controls (`fake-structural-url`, `random-url`) collapse toward name-only / zero, so the harness is measuring real content rather than URL shape.

Per model (API-usage items):
- **Claude Opus 4.8:** bare URL did not help / hurt (lift -0.32); full-content 0.92 vs name-only 0.56; pre -0.33 / post -0.20 (n 16/1).
- **Claude Sonnet 4.6:** bare URL did not help / hurt (lift -0.32); full-content 0.92 vs name-only 0.56; pre -0.31 / post -0.50 (n 16/1).
- **Claude Opus 4.6:** bare URL did not help / hurt (lift -0.42); full-content 0.96 vs name-only 0.54; pre -0.42 / post -0.42 (n 14/3).
- **Claude Sonnet 4.5:** bare URL did not help / hurt (lift -0.41); full-content 0.81 vs name-only 0.53; pre -0.42 / post -0.37 (n 14/3).
- **Gemini 3.1 Pro:** bare URL did not help / hurt (lift -0.21); full-content 0.81 vs name-only 0.44; pre -0.33 / post -0.06 (n 9/8).
- **Gemini 3.5 Flash:** bare URL did not help / hurt (lift -0.18); full-content 0.87 vs name-only 0.35; pre -0.32 / post -0.01 (n 9/8).

---

_Small scale (a handful of API-usage items per pre/post bucket), so treat these as directional, not statistically significant — the post-cutoff API bucket is especially thin and is the main reason for expanding the corpus. Cutoff dates are the vendors' published values (see SOURCES.md). Every prompt, output, and judge prompt + raw verdict is in [transcript.jsonl](transcript.jsonl), [RUNLOG.md](RUNLOG.md), and [dashboard.html](dashboard.html)._