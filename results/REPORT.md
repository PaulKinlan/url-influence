# URL Influence: Results

Generated: 2026-06-17T12:19:02.943Z
Judge model: `claude-sonnet-4-5`
Judged outputs: 720 (judge failures: 0)

## How to read this

**Hypothesis.** An *opaque* URL (a bare arXiv id, RFC number, Stack Overflow question id) carries no description of its content. If handing the model only that URL string lifts output quality, the lift can only come from the model having memorised that URL->content mapping during training. So the lift should appear **only when the content behind the URL predates the model's knowledge cutoff** (it could have been in the training set), and should vanish for content created after the cutoff. The model never browses; the page is never fetched except in the explicit `full-content` ceiling condition.

**Key metric — LIFT.** Per model: `LIFT = mean(correctness | url-only) − mean(correctness | name-only)`. `name-only` describes the task in words with no URL; `url-only` gives ONLY the opaque URL. A positive lift means the bare URL alone improved the answer over naming the task. The signature predicted by the hypothesis is **positive pre-cutoff lift, ~zero post-cutoff lift**.

**Correctness** is 0..1 from the LLM-as-judge (full judge prompts and raw verdicts for every cell are in [RUNLOG.md](RUNLOG.md) / [transcript.jsonl](transcript.jsonl) so each verdict can be validated). Where the judge was unavailable it falls back to a deterministic structural must-mention check.

**Controls.** `fake-structural-url` (a plausible but nonexistent URL of the same shape) and `random-url` (an unrelated real URL) should both collapse toward ZERO lift — if URL *structure* or merely *having a URL* were doing the work, these would also lift; they should not.

**Blanks.** A blank cell is always labelled with its cause: `— (no items)` (no corpus items fall in that pre/post bucket for this model), `— (run error)` (every model call for that slice failed), `— (judge failed)` (the judge errored with no structural fallback), or `— (skipped: no key)` (the whole model was skipped for a missing API key). Blanks are never silently empty.

_Models with no scored rows this run (skipped for a missing API key, or attempted but produced no usable output): GPT-5.5 (`gpt-5.5`), GPT-5.2 (`gpt-5.2`), GPT-5 (`gpt-5`). In this run the OpenAI models were attempted but every call returned HTTP 429 insufficient_quota (the available key had no quota), so they yielded no data and are excluded; with a funded key they are included with zero code change._

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

## Headline: lift of url-only vs name-only, split by cutoff

`LIFT = mean(url-only) − mean(name-only)`. The boundary effect is visible if **pre-cutoff lift > post-cutoff lift** (the URL helps for content the model could have trained on, not for content after its cutoff). `n pre/post` is how many scored cells fall each side.

| Model | cutoff | overall lift | pre-cutoff lift | post-cutoff lift | n pre/post |
|---|---|---|---|---|---|
| Claude Opus 4.8 | 2026-01-31 | -0.23 | -0.33 | +0.14 | 96/24 |
| Claude Sonnet 4.6 | 2026-01-31 | -0.22 | -0.31 | +0.13 | 96/24 |
| Claude Opus 4.6 | 2025-08-31 | -0.36 | -0.42 | -0.22 | 84/36 |
| Claude Sonnet 4.5 | 2025-07-31 | -0.30 | -0.42 | -0.03 | 84/36 |
| Gemini 3.1 Pro | 2025-01-31 | -0.17 | -0.33 | -0.03 | 54/66 |
| Gemini 3.5 Flash | 2025-01-31 | -0.11 | -0.32 | +0.06 | 54/66 |

## Pre- vs post-cutoff mean correctness, per condition

For each model, every corpus item is classified pre- or post-cutoff (contentDate < cutoff = pre). Mean correctness per condition within each bucket. The thing to look for: in the **pre** rows `url-only` approaches `name-only`/`url+name`; in the **post** rows `url-only` should NOT beat `name-only`, and the controls stay flat.

### Claude Opus 4.8 (cutoff 2026-01-31) — 96 pre / 24 post

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.56 | 0.23 | 0.76 | 0.98 | 0.33 | 0.00 |
| post-cutoff | 0.69 | 0.82 | 0.78 | 0.51 | 0.33 | 0.25 |

### Claude Sonnet 4.6 (cutoff 2026-01-31) — 96 pre / 24 post

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.56 | 0.25 | 0.72 | 0.98 | 0.25 | 0.00 |
| post-cutoff | 0.38 | 0.50 | 0.66 | 0.24 | 0.53 | 0.00 |

### Claude Opus 4.6 (cutoff 2025-08-31) — 84 pre / 36 post

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.57 | 0.14 | 0.78 | 1.00 | 0.31 | 0.00 |
| post-cutoff | 0.55 | 0.33 | 0.57 | 0.56 | 0.35 | 0.00 |

### Claude Sonnet 4.5 (cutoff 2025-07-31) — 84 pre / 36 post

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.56 | 0.14 | 0.63 | 0.91 | 0.25 | 0.00 |
| post-cutoff | 0.37 | 0.33 | 0.25 | 0.20 | 0.35 | 0.00 |

### Gemini 3.1 Pro (cutoff 2025-01-31) — 54 pre / 66 post

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.67 | 0.33 | 0.78 | 0.98 | 0.32 | 0.00 |
| post-cutoff | 0.39 | 0.36 | 0.27 | 0.48 | 0.27 | 0.00 |

### Gemini 3.5 Flash (cutoff 2025-01-31) — 54 pre / 66 post

| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|
| pre-cutoff | 0.66 | 0.33 | 0.88 | 0.99 | 0.19 | 0.00 |
| post-cutoff | 0.12 | 0.18 | 0.27 | 0.62 | 0.13 | 0.00 |

## Mean correctness by condition x model (all items)

| Condition | Claude Opus 4.8 (cut 2026-01-31) | Claude Sonnet 4.6 (cut 2026-01-31) | Claude Opus 4.6 (cut 2025-08-31) | Claude Sonnet 4.5 (cut 2025-07-31) | Gemini 3.1 Pro (cut 2025-01-31) | Gemini 3.5 Flash (cut 2025-01-31) |
|---|---|---|---|---|---|---|
| name-only | 0.58 | 0.52 | 0.56 | 0.50 | 0.52 | 0.36 |
| url-only | 0.35 | 0.30 | 0.20 | 0.20 | 0.35 | 0.25 |
| url+name | 0.76 | 0.71 | 0.72 | 0.51 | 0.50 | 0.54 |
| full-content | 0.89 | 0.83 | 0.87 | 0.70 | 0.70 | 0.78 |
| fake-structural-url | 0.33 | 0.31 | 0.32 | 0.28 | 0.29 | 0.15 |
| random-url | 0.05 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

The two control rows (`fake-structural-url`, `random-url`) are expected to sit at or below `name-only`: a fake or unrelated URL carries no real retrieval key, so it should give no lift.

## Interpretation (honest)

- **Overall:** mean pre-cutoff lift -0.36, mean post-cutoff lift +0.01. Across models the pre- vs post-cutoff lift gap is small or reversed at this sample size, so the boundary effect is not cleanly demonstrated.
- **Claude Opus 4.8:** a bare opaque URL did not help and may have hurt (lift -0.23). Ceiling (full pasted content) scored 0.89 vs name-only 0.58. Fake-structural-URL scored 0.33 and random-URL 0.05 (controls for URL shape vs real content). Pre-cutoff lift -0.33 vs post-cutoff lift +0.14: the boundary effect is weak or mixed at this sample size.
- **Claude Sonnet 4.6:** a bare opaque URL did not help and may have hurt (lift -0.22). Ceiling (full pasted content) scored 0.83 vs name-only 0.52. Fake-structural-URL scored 0.31 and random-URL 0.00 (controls for URL shape vs real content). Pre-cutoff lift -0.31 vs post-cutoff lift +0.13: the boundary effect is weak or mixed at this sample size.
- **Claude Opus 4.6:** a bare opaque URL did not help and may have hurt (lift -0.36). Ceiling (full pasted content) scored 0.87 vs name-only 0.56. Fake-structural-URL scored 0.32 and random-URL 0.00 (controls for URL shape vs real content). Pre-cutoff lift -0.42 vs post-cutoff lift -0.22: the boundary effect is weak or mixed at this sample size.
- **Claude Sonnet 4.5:** a bare opaque URL did not help and may have hurt (lift -0.30). Ceiling (full pasted content) scored 0.70 vs name-only 0.50. Fake-structural-URL scored 0.28 and random-URL 0.00 (controls for URL shape vs real content). Pre-cutoff lift -0.42 vs post-cutoff lift -0.03: the boundary effect is weak or mixed at this sample size.
- **Gemini 3.1 Pro:** a bare opaque URL did not help and may have hurt (lift -0.17). Ceiling (full pasted content) scored 0.70 vs name-only 0.52. Fake-structural-URL scored 0.29 and random-URL 0.00 (controls for URL shape vs real content). Pre-cutoff lift -0.33 vs post-cutoff lift -0.03: the boundary effect is weak or mixed at this sample size.
- **Gemini 3.5 Flash:** a bare opaque URL did not help and may have hurt (lift -0.11). Ceiling (full pasted content) scored 0.78 vs name-only 0.36. Fake-structural-URL scored 0.15 and random-URL 0.00 (controls for URL shape vs real content). Pre-cutoff lift -0.32 vs post-cutoff lift +0.06: the boundary effect is weak or mixed at this sample size.

---

_Scale is small (a handful of items per cell), so treat these as directional, not statistically significant. Cutoff dates are the vendors' published values (see SOURCES.md); the pre/post boundary is still fuzzy for items dated within a month or two of a cutoff. The complete per-cell record — every prompt, every model output, and every judge prompt + raw verdict — is in [RUNLOG.md](RUNLOG.md) and [transcript.jsonl](transcript.jsonl)._