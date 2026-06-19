# URL Influence: Results

Report generated: 2026-06-19T06:30:47.242Z
Data run / scored: 2026-06-19T00:51:24.851Z
Code + data commit: [`5857e976be`](https://github.com/PaulKinlan/url-influence/commit/5857e976be6fa3984b8eef0bd5ecc9166cc92ded)
Judge model: `claude-sonnet-4-5`
Judged outputs: 4403 (judge failures: 0)

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

## Conditions — what identifier each one carries

The single most important thing for reading the numbers: **which conditions give an OPAQUE id (a bare string that does not name the content) vs a DESCRIPTIVE/CANONICAL id (that names or describes the feature).** Only `url-only` is opaque; `mdn/spec/bcd` all name the feature to some degree.

| Condition | Identifier opacity | Group | Meaning |
|---|---|---|---|
| `name-only` | — (no identifier; baseline) | core | task described in words, no URL (baseline) |
| `url-only` | OPAQUE — bare id, does NOT name the content | core | only the opaque URL or id; the page is never fetched or pasted |
| `mdn-url-only` | DESCRIPTIVE — MDN path names the API | identifier-probe | only the descriptive documentation URL; this measures URL text hints |
| `spec-url-only` | CANONICAL — spec URL (usually names the feature) | identifier-probe | only the canonical spec URL, when the item has one |
| `bcd-key-only` | CANONICAL, SEMI-DESCRIPTIVE — BCD dotted key often contains the name | identifier-probe | only the Browser Compat Data key, when the item has one |
| `url+name` | OPAQUE id + the task name | context | opaque URL plus the task name |
| `full-content` | — (real page pasted in; ceiling) | ceiling | the real page content is fetched and pasted in |
| `fake-structural-url` | CONTROL — nonexistent same-shape URL | control | plausible but nonexistent URL of the same shape (structure control) |
| `random-url` | CONTROL — unrelated real URL | control | unrelated real URL (off-target control) |

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

## Headline finding — which identifiers actually work

The single averaged "lift" below is misleading: the effect is **categorical, not continuous** — it depends on WHICH identifier, not how far the content is from the cutoff. Mean `url-only` (OPAQUE) correctness across all models, grouped by the kind of opaque id:

| Opaque id type (`url-only`) | items | mean url-only | mean name-only |
|---|---|---|---|
| RFC id | 1 | 1.00 | 1.00 |
| arXiv id | 6 | 0.29 | 0.00 |
| control (synthetic, not a real pointer) | 1 | 0.02 | 1.00 |
| ChromeStatus # | 28 | 0.01 | 0.78 |
| caniuse | 1 | 0.00 | 0.62 |

**Read:** a bare OPAQUE id works only when it is a *famous, memorised* id (landmark arXiv / RFC). Opaque numeric ids the model never memorised (ChromeStatus #, un-famous Stack Overflow #) decode to ~0 — even for features the model knows cold by name. The canonical web-id probes (`bcd-key-only`, `spec-url-only`) DO work, but they are semi-descriptive (the BCD key / spec path usually contains the feature name), so that is partly a *hint*, not pure opaque retrieval. See the per-item table below.

## All-models view — mean correctness by condition

Every condition, averaged across ALL models and ALL API-usage items (knowledge-calibration items excluded). The clearest one-look summary:

| condition | identifier | mean (all models) |
|---|---|---|
| `name-only` | — (no identifier; baseline) | 0.66 |
| `url-only` | OPAQUE | 0.09 |
| `mdn-url-only` | DESCRIPTIVE | 0.57 |
| `spec-url-only` | CANONICAL | 0.59 |
| `bcd-key-only` | CANONICAL, SEMI-DESCRIPTIVE | 0.73 |
| `url+name` | OPAQUE id + the task name | 0.73 |
| `full-content` | — (real page pasted in; ceiling) | 0.91 |
| `fake-structural-url` | CONTROL | 0.24 |
| `random-url` | CONTROL | 0.00 |

## Per-item identifier reference

Exactly what the `url-only` (OPAQUE) id is for each item, and which descriptive/canonical ids it also carries.

| item | contentDate | `url-only` (opaque) id | type | spec? | bcd? |
|---|---|---|---|---|---|
| `js-promise` | 2014-01 | `stackoverflow.com/questions/30564053` | control (synthetic, not a real pointer) | Y | Y |
| `service-worker` | 2015-01 | `www.chromestatus.com/feature/6561526227927040` | ChromeStatus # | Y | Y |
| `fetch-api` | 2015-03 | `chromestatus.com/feature/6730533392351232` | ChromeStatus # | Y | Y |
| `intersection-observer` | 2016-05 | `chromestatus.com/feature/5695342691483648` | ChromeStatus # | Y | Y |
| `async-await` | 2016-10 | `chromestatus.com/feature/5643236399906816` | ChromeStatus # | Y | Y |
| `css-grid` | 2017-03 | `chromestatus.com/feature/4589636412243968` | ChromeStatus # | Y | Y |
| `arxiv-attention` | 2017-06 | `arxiv.org/abs/1706.03762` | arXiv id | — | — |
| `rfc-9110-http-semantics` | 2022-06 | `datatracker.ietf.org/doc/rfc9110/` | RFC id | — | — |
| `fedcm` | 2022-12 | `chromestatus.com/feature/6438627087220736` | ChromeStatus # | Y | Y |
| `view-transitions` | 2023-03 | `chromestatus.com/feature/5193009714954240` | ChromeStatus # | Y | Y |
| `arxiv-mamba` | 2023-12 | `arxiv.org/abs/2312.00752` | arXiv id | — | — |
| `popover-api` | 2024-04 | `chromestatus.com/feature/5463833265045504` | ChromeStatus # | Y | Y |
| `css-anchor-positioning` | 2024-08 | `chromestatus.com/feature/5124922471874560` | ChromeStatus # | Y | Y |
| `view-transitions-cross-doc` | 2024-09 | `chromestatus.com/feature/5118874666663936` | ChromeStatus # | Y | Y |
| `arxiv-deepseek-r1` | 2025-01 | `arxiv.org/abs/2501.12948` | arXiv id | — | — |
| `css-scroll-state-container-queries` | 2025-02 | `chromestatus.com/feature/5072263730167808` | ChromeStatus # | Y | Y |
| `arxiv-gemma-3` | 2025-03 | `arxiv.org/abs/2503.19786` | arXiv id | — | — |
| `customizable-select` | 2025-03 | `chromestatus.com/feature/5737365999976448` | ChromeStatus # | Y | Y |
| `css-shape-function` | 2025-04 | `chromestatus.com/feature/5172258539307008` | ChromeStatus # | Y | Y |
| `translator-api` | 2025-06 | `chromestatus.com/feature/5172811302961152` | ChromeStatus # | Y | Y |
| `language-detector-api` | 2025-06 | `chromestatus.com/feature/6494349985841152` | ChromeStatus # | Y | Y |
| `arxiv-kimi-k2` | 2025-07 | `arxiv.org/abs/2507.20534` | arXiv id | — | — |
| `corner-shape-squircle` | 2025-08 | `chromestatus.com/feature/5357329815699456` | ChromeStatus # | Y | Y |
| `uint8array-base64-hex` | 2025-09 | `chromestatus.com/feature/6281131254874112` | ChromeStatus # | Y | Y |
| `arxiv-gpt5-system-card` | 2025-12 | `arxiv.org/abs/2601.03267` | arXiv id | — | — |
| `temporal-api` | 2026-01 | `chromestatus.com/feature/5668291307634688` | ChromeStatus # | Y | Y |
| `scroll-triggered-animations` | 2026-02 | `chromestatus.com/feature/5181996801982464` | ChromeStatus # | Y | Y |
| `html-in-canvas` | 2026-02 | `chromestatus.com/feature/5114053285249024` | ChromeStatus # | Y | — |
| `text-justify-css-property` | 2026-02 | `chromestatus.com/feature/5079678972985344` | ChromeStatus # | Y | Y |
| `css-text-indent-hanging` | 2026-03 | `chromestatus.com/feature/5084062739988480` | ChromeStatus # | Y | Y |
| `named-feature-supports` | 2026-03 | `chromestatus.com/feature/5153932394102784` | ChromeStatus # | Y | — |
| `element-scoped-view-transitions` | 2026-04 | `chromestatus.com/feature/5109852273377280` | ChromeStatus # | Y | Y |
| `math-sumprecise` | 2026-04 | `chromestatus.com/feature/4790090146643968` | ChromeStatus # | Y | Y |
| `gamepad-event-driven-input` | 2026-04 | `chromestatus.com/feature/5989275208253440` | ChromeStatus # | — | — |
| `arxiv-future-fake-real-id` | 2026-05 | `arxiv.org/abs/2605.04567` | arXiv id | — | — |
| `prompt-api-shape` | 2026-05 | `chromestatus.com/feature/5134603979063296` | ChromeStatus # | Y | Y |
| `text-decoration-skip-ink-all` | 2026-05 | `chromestatus.com/feature/5077600085082112` | ChromeStatus # | Y | Y |
| `baseline-has-status` | 2026-06 | `caniuse.com/css-has` | caniuse | Y | Y |
| `css-gap-decorations` | 2026-06 | `chromestatus.com/feature/5157805733183488` | ChromeStatus # | Y | Y |
| `css-image-color-function` | 2026-06 | `chromestatus.com/feature/5121011285622784` | ChromeStatus # | Y | Y |

## Per-item results — name-only vs opaque vs canonical id

Mean correctness across all models, by item (sorted by date). `opaque` = `url-only`. Watch the **opaque** column collapse to ~0 except for famous arXiv/RFC ids, while **bcd/spec/mdn** (which name the feature) track `name`. Blank = n/a or no data.

| item | opaque id type | name | opaque | mdn | spec | bcd | full |
|---|---|---|---|---|---|---|---|
| `js-promise` | control (synthetic, not a real pointer) | 1.00 | 0.02 | 1.00 | 0.53 | 1.00 | 1.00 |
| `service-worker` | ChromeStatus # | 1.00 | 0.00 | 0.97 | 0.95 | 0.74 | 1.00 |
| `fetch-api` | ChromeStatus # | 0.96 | 0.00 | 0.95 | 0.61 | 1.00 | 0.98 |
| `intersection-observer` | ChromeStatus # | 1.00 | 0.00 | 0.99 | 1.00 | 0.99 | 0.99 |
| `async-await` | ChromeStatus # | 0.88 | 0.07 | 0.80 | 0.55 | 0.86 | 0.72 |
| `css-grid` | ChromeStatus # | 1.00 | 0.00 | 0.92 | 0.91 | 0.85 | 1.00 |
| `arxiv-attention` | arXiv id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `rfc-9110-http-semantics` | RFC id | 1.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `fedcm` | ChromeStatus # | 1.00 | 0.00 | 0.87 | 0.95 | 1.00 | 1.00 |
| `view-transitions` | ChromeStatus # | 0.98 | 0.08 | 0.94 | 0.90 | 0.97 | 0.97 |
| `arxiv-mamba` | arXiv id | 0.00 | 0.46 | 0.38 |   -   |   -   | 1.00 |
| `popover-api` | ChromeStatus # | 0.96 | 0.15 | 0.97 | 0.92 | 0.95 | 0.99 |
| `css-anchor-positioning` | ChromeStatus # | 0.98 | 0.08 | 0.93 | 0.81 | 0.94 | 0.98 |
| `view-transitions-cross-doc` | ChromeStatus # | 0.96 | 0.00 | 0.88 | 0.77 | 0.89 | 0.94 |
| `arxiv-deepseek-r1` | arXiv id | 0.00 | 0.30 | 0.20 |   -   |   -   | 0.99 |
| `css-scroll-state-container-queries` | ChromeStatus # | 0.80 | 0.00 | 0.00 | 0.55 | 0.58 | 0.87 |
| `arxiv-gemma-3` | arXiv id | 0.00 | 0.00 | 0.00 |   -   |   -   | 1.00 |
| `customizable-select` | ChromeStatus # | 0.77 | 0.00 | 0.38 | 0.25 | 0.47 | 0.83 |
| `css-shape-function` | ChromeStatus # | 0.67 | 0.00 | 0.54 | 0.21 | 0.72 | 0.90 |
| `translator-api` | ChromeStatus # | 0.34 | 0.00 | 0.35 | 0.42 | 0.60 | 0.95 |
| `language-detector-api` | ChromeStatus # | 0.47 | 0.00 | 0.49 | 0.32 | 0.67 | 0.96 |
| `arxiv-kimi-k2` | arXiv id | 0.00 | 0.00 | 0.00 |   -   |   -   | 1.00 |
| `corner-shape-squircle` | ChromeStatus # | 0.68 | 0.00 | 0.36 | 0.20 | 0.37 | 1.00 |
| `uint8array-base64-hex` | ChromeStatus # | 1.00 | 0.00 | 0.53 | 0.43 | 0.40 | 1.00 |
| `arxiv-gpt5-system-card` | arXiv id | 0.00 | 0.00 | 0.00 |   -   |   -   | 1.00 |
| `temporal-api` | ChromeStatus # | 0.93 | 0.00 | 0.92 | 0.93 | 0.97 | 1.00 |
| `text-justify-css-property` | ChromeStatus # | 0.97 | 0.00 | 1.00 | 0.97 | 1.00 | 0.99 |
| `css-text-indent-hanging` | ChromeStatus # | 0.88 | 0.00 | 0.77 | 0.78 | 0.73 | 0.99 |
| `named-feature-supports` | ChromeStatus # | 0.20 | 0.00 | 0.00 | 0.00 |   -   | 0.98 |
| `element-scoped-view-transitions` | ChromeStatus # | 0.75 | 0.00 | 0.40 | 0.53 | 0.85 | 0.89 |
| `math-sumprecise` | ChromeStatus # | 0.77 | 0.00 | 0.48 | 0.47 | 0.82 | 0.93 |
| `gamepad-event-driven-input` | ChromeStatus # | 0.00 | 0.00 | 0.00 |   -   |   -   | 0.00 |
| `prompt-api-shape` | ChromeStatus # | 0.15 | 0.00 | 0.38 | 0.38 | 0.40 | 0.77 |
| `text-decoration-skip-ink-all` | ChromeStatus # | 0.92 | 0.00 | 0.73 | 0.92 | 0.95 | 1.00 |
| `baseline-has-status` | caniuse | 0.62 | 0.00 | 0.00 | 0.00 | 0.00 | 0.31 |
| `css-gap-decorations` | ChromeStatus # | 0.75 | 0.00 | 0.56 | 0.53 | 0.53 | 0.88 |
| `css-image-color-function` | ChromeStatus # | 0.96 | 0.00 | 0.36 | 0.33 | 0.10 | 0.94 |

## Worked judge examples — how cells were scored

A few representative cells with the judge's one-line verdict. The judge's FULL prompt + raw response for EVERY cell is in the run data linked at the bottom (and clickable in the dashboard).

- **arxiv-attention / url-only** (opaque arXiv id) — mean 1.00; judge on `claude-opus-4-6`: _"The response correctly identifies the paper as "Attention Is All You Need," names the Transformer architecture, describes the attention mechanism accurately, and provides extensive correct technical d"_ (score 1.00)
- **rfc-9110-http-semantics / url-only** (opaque RFC id) — mean 1.00; judge on `claude-opus-4-6`: _"The model correctly identifies RFC 9110 as HTTP Semantics (June 2022), accurately describes its scope covering methods, status codes, and header fields independent of wire protocol, and includes all e"_ (score 1.00)
- **css-anchor-positioning / url-only** (opaque ChromeStatus #) — mean 0.08; judge on `claude-opus-4-6`: _"The model output describes the Document Picture-in-Picture API instead of CSS Anchor Positioning API, completely missing anchor-name, position-anchor, anchor(), and position-area."_ (score 0.00)
- **fetch-api / bcd-key-only** (BCD key) — mean 1.00; judge on `claude-opus-4-6`: _"The model output contains all required identifiers (fetch(), .json(), Response, await) and correctly demonstrates fetching a URL, checking response.ok, and parsing JSON using both Promise and async/aw"_ (score 1.00)
- **fetch-api / url-only** (opaque ChromeStatus #) — mean 0.00; judge on `claude-opus-4-6`: _"The model output completely ignores the task and instead provides code for the Compute Pressure API rather than demonstrating fetch() with JSON parsing."_ (score 0.00)
- **css-gap-decorations / bcd-key-only** (BCD key) — mean 0.53; judge on `claude-opus-4-6`: _"The model correctly demonstrates row-rule and its longhands (row-rule-width, row-rule-style, row-rule-color) but misses column-rule which is also part of CSS gap decorations and sets gap:0 instead of "_ (score 0.85)

## Run data — inspect every cell

- **[dashboard.html](dashboard.html)** — interactive: filter by model / condition / cutoff / pass-fail, and CLICK any cell to read the exact prompt, the model output, and the **judge's full prompt + raw verdict + reasoning**. (Live: https://paulkinlan.github.io/url-influence/ )
- **[RUNLOG.md](RUNLOG.md)** — browsable per-cell record (every prompt, output, judge prompt + raw verdict).
- **[transcript.jsonl](transcript.jsonl)** — one JSON line per cell with everything, machine-readable. This is the committed full run data; `results/raw/` is the gitignored intermediate it is built from.

## Averaged lift table (context — see the per-item finding above)

_This averages a sharply bimodal, item-specific signal, so a single "lift −0.5" hides the categorical pattern. Use the per-item tables above for the real result; this section is kept for continuity._

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
| pre-cutoff | 0.75 | 0.15 | 0.81 | 0.88 | 0.98 | 0.87 | 0.99 | 0.47 | 0.00 |
| post-cutoff | 0.64 | 0.00 | 0.67 | 0.78 | 0.75 | 0.76 | 0.69 | 0.37 | 0.00 |

### Claude Sonnet 4.6 (cutoff 2026-01-31) — 25 pre / 11 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.72 | 0.16 | 0.77 | 0.74 | 0.94 | 0.79 | 0.98 | 0.30 | 0.00 |
| post-cutoff | 0.67 | 0.00 | 0.54 | 0.68 | 0.69 | 0.63 | 0.80 | 0.25 | 0.00 |

### Claude Opus 4.6 (cutoff 2025-08-31) — 22 pre / 14 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.67 | 0.14 | 0.68 | 0.63 | 0.98 | 0.75 | 0.98 | 0.45 | 0.00 |
| post-cutoff | 0.65 | 0.00 | 0.61 | 0.66 | 0.69 | 0.71 | 0.85 | 0.38 | 0.00 |

### Claude Sonnet 4.5 (cutoff 2025-07-31) — 21 pre / 15 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.66 | 0.10 | 0.59 | 0.70 | 0.79 | 0.69 | 0.99 | 0.25 | 0.00 |
| post-cutoff | 0.58 | 0.00 | 0.36 | 0.45 | 0.55 | 0.58 | 0.71 | 0.19 | 0.00 |

### Gemini 3.1 Pro (cutoff 2025-01-31) — 14 pre / 22 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.79 | 0.21 | 0.93 | 0.76 | 0.93 | 0.84 | 0.94 | 0.35 | 0.00 |
| post-cutoff | 0.42 | 0.00 | 0.19 | 0.26 | 0.48 | 0.46 | 0.75 | 0.23 | 0.00 |

### Gemini 3.5 Flash (cutoff 2025-01-31) — 14 pre / 22 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.78 | 0.29 | 0.64 | 0.48 | 0.96 | 0.89 | 0.96 | 0.19 | 0.00 |
| post-cutoff | 0.25 | 0.00 | 0.20 | 0.16 | 0.45 | 0.45 | 0.83 | 0.12 | 0.00 |

### GPT-5.5 (cutoff 2025-12-01) — 23 pre / 13 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.77 | 0.22 | 0.78 | 0.88 | 0.90 | 0.97 | 0.98 | 0.32 | 0.00 |
| post-cutoff | 0.73 | 0.00 | 0.62 | 0.72 | 0.71 | 0.84 | 0.91 | 0.23 | 0.00 |

### GPT-5.2 (cutoff 2025-08-31) — 22 pre / 14 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.69 | 0.09 | 0.53 | 0.56 | 0.75 | 0.60 | 0.98 | 0.13 | 0.00 |
| post-cutoff | 0.74 | 0.00 | 0.18 | 0.27 | 0.43 | 0.63 | 0.90 | 0.09 | 0.00 |

### GPT-5 (cutoff 2024-09-30) — 13 pre / 23 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.83 | 0.23 | 0.91 | 0.83 | 0.85 | 0.90 | 1.00 | 0.15 | 0.00 |
| post-cutoff | 0.40 | 0.00 | 0.24 | 0.28 | 0.33 | 0.47 | 0.85 | 0.13 | 0.00 |

### Grok 4.3 (cutoff 2025-12-31) — 24 pre / 12 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.67 | 0.10 | 0.61 | 0.59 | 0.65 | 0.69 | 0.96 | 0.04 | 0.00 |
| post-cutoff | 0.74 | 0.00 | 0.35 | 0.35 | 0.59 | 0.83 | 0.81 | 0.07 | 0.00 |

### Grok 4 (cutoff 2024-11-30) — 13 pre / 23 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.77 | 0.15 | 0.91 | 0.88 | 0.77 | 0.94 | 0.93 | 0.00 | 0.00 |
| post-cutoff | 0.62 | 0.00 | 0.33 | 0.39 | 0.47 | 0.69 | 0.85 | 0.07 | 0.00 |

### GLM-5.2 (cutoff 2025-10-31) — 23 pre / 13 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.68 | 0.09 | 0.61 | 0.66 | 0.82 | 0.80 | 0.98 | 0.25 | 0.00 |
| post-cutoff | 0.58 | 0.00 | 0.53 | 0.76 | 0.89 | 0.83 | 0.87 | 0.43 | 0.00 |

### GLM-5.1 (cutoff 2025-10-31) — 23 pre / 13 post API items

| bucket | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.66 | 0.20 | 0.61 | 0.81 | 0.79 | 0.72 | 0.98 | 0.21 | 0.00 |
| post-cutoff | 0.69 | 0.00 | 0.46 | 0.69 | 0.61 | 0.72 | 0.90 | 0.20 | 0.00 |

## Knowledge-calibration items: correct-refusal rate per condition

These items (`scroll-triggered-animations`, `arxiv-future-fake-real-id`, `html-in-canvas`) post-date every model; correctness = the model correctly said it could not determine the answer. NOT part of the lift. The thing to see: a bare `url-only` (and `name-only`) often score HIGH here — refusing is easy when you're handed nothing — which is exactly why these would pollute a lift average if included.

| Model | name-only | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | random-url |
|---|---|---|---|---|---|---|---|---|---|
| Claude Opus 4.8 | 0.75 | 1.00 | 0.47 | 0.65 | 1.00 | 0.77 | 0.68 | 0.43 | 0.33 |
| Claude Sonnet 4.6 | 0.33 | 0.33 | 0.67 | 1.00 | 0.85 | 0.98 | 0.32 | 0.70 | 0.00 |
| Claude Opus 4.6 | 0.68 | 0.33 | 0.70 | 0.10 | 0.20 | 0.42 | 0.37 | 0.70 | 0.00 |
| Claude Sonnet 4.5 | 0.37 | 0.67 | 0.70 | 0.60 | 1.00 | 0.63 | 0.07 | 0.70 | 0.00 |
| Gemini 3.1 Pro | 0.93 | 1.00 | 0.93 | 1.00 | 0.95 | 1.00 | 0.10 | 0.70 | 0.00 |
| Gemini 3.5 Flash | 0.40 | 1.00 | 0.73 | 0.50 | 0.10 | 0.57 | 0.32 | 0.47 | 0.00 |
| GPT-5.5 | 0.77 | 1.00 | 0.33 | 0.50 | 0.10 | 0.43 | 0.37 | 0.33 | 0.00 |
| GPT-5.2 | 0.93 | 1.00 | 0.77 | 1.00 | 1.00 | 0.70 | 0.03 | 0.73 | 0.00 |
| GPT-5 | 0.37 | 1.00 | 1.00 | 1.00 | 0.95 | 0.37 | 0.03 | 0.63 | 0.00 |
| Grok 4.3 | 0.62 | 1.00 | 0.67 | 1.00 | 1.00 | 0.70 | 0.10 | 0.95 | 0.00 |
| Grok 4 | 0.33 | 0.67 | 0.70 | 1.00 | 1.00 | 0.33 | 0.10 | 0.87 | 0.00 |
| GLM-5.2 | 1.00 | 1.00 | 0.67 | 0.57 | 1.00 | 0.77 | 0.07 | 0.73 | 0.00 |
| GLM-5.1 | 0.68 | 0.67 | 0.70 | 0.40 | 0.80 | 0.40 | 0.05 | 0.75 | 0.00 |

## All items, mean correctness by condition x model

_Both tracks combined — included only for completeness. Use the API-usage table above for the real signal._

| Condition | Claude Opus 4.8 (cut 2026-01-31) | Claude Sonnet 4.6 (cut 2026-01-31) | Claude Opus 4.6 (cut 2025-08-31) | Claude Sonnet 4.5 (cut 2025-07-31) | Gemini 3.1 Pro (cut 2025-01-31) | Gemini 3.5 Flash (cut 2025-01-31) | GPT-5.5 (cut 2025-12-01) | GPT-5.2 (cut 2025-08-31) | GPT-5 (cut 2024-09-30) | Grok 4.3 (cut 2025-12-31) | Grok 4 (cut 2024-11-30) | GLM-5.2 (cut 2025-10-31) | GLM-5.1 (cut 2025-10-31) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| name-only | 0.73 | 0.68 | 0.68 | 0.62 | 0.60 | 0.46 | 0.76 | 0.73 | 0.55 | 0.69 | 0.66 | 0.68 | 0.68 |
| url-only | 0.17 | 0.13 | 0.10 | 0.10 | 0.15 | 0.17 | 0.20 | 0.13 | 0.15 | 0.14 | 0.10 | 0.13 | 0.17 |
| mdn-url-only | 0.75 | 0.70 | 0.66 | 0.52 | 0.52 | 0.41 | 0.70 | 0.44 | 0.52 | 0.55 | 0.57 | 0.60 | 0.58 |
| spec-url-only | 0.83 | 0.72 | 0.59 | 0.57 | 0.46 | 0.28 | 0.80 | 0.49 | 0.53 | 0.51 | 0.61 | 0.69 | 0.74 |
| bcd-key-only | 0.91 | 0.86 | 0.84 | 0.71 | 0.67 | 0.63 | 0.81 | 0.64 | 0.55 | 0.66 | 0.61 | 0.86 | 0.73 |
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