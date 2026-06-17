# URL Influence: Pilot Results

Generated: 2026-06-17T09:47:20.656Z
Judge model: claude-sonnet-4-5
Judged outputs: 72 (judge failures: 0)

Correctness is 0..1 (LLM-as-judge, falling back to a structural must-mention check where the judge was unavailable). Higher is better.

## Mean correctness by condition x model

| Condition | Claude Sonnet 4.5 (cut 2025-07) | Gemini 2.5 Flash (cut 2025-01) |
|---|---|---|
| name-only | 0.65 | 0.14 |
| url-only | 0.17 | 0.17 |
| url+name | 0.81 | 0.46 |
| full-content | 0.97 | 0.80 |
| fake-structural-url | 0.17 | 0.05 |
| random-url | 0.00 | 0.00 |

## Key metric: lift of url-only vs name-only

Lift = mean(correctness | url-only) - mean(correctness | name-only). A positive lift means a BARE OPAQUE URL alone improved the answer over naming the task with no URL.

| Model | overall lift | pre-cutoff lift | post-cutoff lift |
|---|---|---|---|
| Claude Sonnet 4.5 | -0.48 | -0.48 |   -   |
| Gemini 2.5 Flash | +0.02 | +0.04 | +0.00 |

## Pre- vs post-cutoff breakdown (absolute correctness)

### Claude Sonnet 4.5 (cutoff 2025-07)

| bucket | name-only | url-only | url+name | full-content |
|---|---|---|---|---|
| pre-cutoff | 0.65 | 0.17 | 0.81 | 0.97 |
| post-cutoff |   -   |   -   |   -   |   -   |

### Gemini 2.5 Flash (cutoff 2025-01)

| bucket | name-only | url-only | url+name | full-content |
|---|---|---|---|---|
| pre-cutoff | 0.21 | 0.25 | 0.69 | 0.95 |
| post-cutoff | 0.00 | 0.00 | 0.00 | 0.50 |

## Interpretation (honest)

- **Claude Sonnet 4.5:** a bare opaque URL did not help and may have hurt (lift -0.48). Ceiling (full pasted content) scored 0.97 vs name-only 0.65. Fake-structural-URL scored 0.17 and random-URL 0.00 (controls for URL shape vs real content). Pre-cutoff lift -0.48 vs post-cutoff lift   -  : the boundary effect is weak or mixed at this sample size.
- **Gemini 2.5 Flash:** a bare opaque URL slightly helped (lift +0.02). Ceiling (full pasted content) scored 0.80 vs name-only 0.14. Fake-structural-URL scored 0.05 and random-URL 0.00 (controls for URL shape vs real content). Pre-cutoff lift +0.04 vs post-cutoff lift +0.00: the boundary effect is weak or mixed at this sample size.

---

_Pilot scale is tiny (a handful of items per cell), so treat these as directional, not significant. Cutoff dates are approximate, so the pre/post boundary is fuzzy, especially for items near the line._