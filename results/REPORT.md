# URL Influence: Results

Report generated: 2026-06-19T15:16:47.345Z
Data run / scored: 2026-06-19T15:09:54.692Z
Code + data commit: [`d65814e040`](https://github.com/PaulKinlan/url-influence/commit/d65814e0409323fc71840129b71f6260411035da)
Judge model: `claude-sonnet-4-5`
Judged outputs: 11992 (judge failures: 2)

> An interactive, filterable view of every cell (prompt, model output, and the judge's full prompt + raw verdict) is in [dashboard.html](dashboard.html) — open it in a browser to slice by model / condition / pre-vs-post cutoff / pass-fail and read each verdict.

## How to read this

**The question.** Can a bare *opaque* URL (just the string, page never fetched) make a model produce a better answer than simply naming the task — and does that only happen for content from before the model's training cutoff? If so, the URL is acting as a retrieval key into the weights.

**Two tracks, measured separately (this is important).** The corpus has two kinds of item and they must NOT be averaged together:

- **API-usage items with real opaque pointers** — the model is asked to USE a real API or recall real content, and the opaque URL is intended to point at that content. Correctness = did it produce the right surface. **The LIFT metric below is computed on these only.** This is the real test.
- **Knowledge-calibration items** (`scroll-triggered-animations`, `arxiv-future-fake-real-id`, `html-in-canvas`) — the content post-dates every model, so the *correct* answer is "I can't determine this". A bare URL scores HIGH here precisely because it hands the model nothing, so it correctly refuses. Averaging these into the lift manufactures a fake "url-only helps post-cutoff" signal — so they are reported on their own (refusal calibration), never in the lift.

- **Intentional opaque structural controls** (`js-promise`) have `validation.opaqueRole = "structural-control"`. Their `url-only` prompt may contain a fake, missing, or unrelated opaque SO/ChromeStatus-shaped URL. They are useful controls, but excluded from headline lift because they are not real URL-to-content pointers.

**LIFT** (API-usage items with real opaque pointers) `= mean(correctness | url-only) − mean(correctness | name-only)`. Positive = the bare URL alone beat naming the task. The hypothesis predicts **positive lift pre-cutoff, ~zero post-cutoff**.

**Correctness** is 0..1 from an LLM-as-judge; every judge prompt + raw verdict is in [transcript.jsonl.gz](transcript.jsonl.gz) and [dashboard.html](dashboard.html) so each score is checkable.

**Controls.** `fake-structural-url` (plausible but nonexistent, same shape) and `random-url` (unrelated real URL) should collapse toward name-only / zero — if URL shape or merely having a URL did the work, these would lift too.

**Identifier probes.** Conditions such as `mdn-url-only`, `spec-url-only`, and `bcd-key-only` are exploratory. They are useful for diagnosing which identifiers a model can decode, but the headline lift remains strictly `url-only - name-only`.

**Cutoff granularity.** Content dates are `YYYY-MM` (padded to mid-month); model cutoffs are month-end. An item in the SAME year-month as a model's cutoff is **boundary-ambiguous** — it could fall either side of the training cut — yet is bucketed `pre`. Treat the pre/post split as fuzzy near the boundary.

**Blanks** are always labelled: `— (no items)`, `— (run error)`, `— (judge failed)`, `— (skipped: no key)`, `— (n/a)`.

## Conditions — what identifier each one carries

The single most important thing for reading the numbers: **which conditions give an OPAQUE id (a bare string that does not name the content) vs a DESCRIPTIVE/CANONICAL id (that names or describes the feature).** Only `url-only` is opaque; `mdn/spec/bcd` all name the feature to some degree.

| Condition | Identifier opacity | Group | Meaning |
|---|---|---|---|
| `name-only` | — (no identifier; baseline) | core | task described in words, no URL (baseline) |
| `name-framed` | — (no id; framing-matched baseline for url-only) | core | the task DESCRIPTION in the SAME 'do whatever this describes' framing as url-only — isolates the framing cost from the identifier (url-only − name-framed = pure opaque-id-vs-description) |
| `url-only` | OPAQUE — bare id, does NOT name the content | core | only the opaque URL or id; the page is never fetched or pasted |
| `mdn-url-only` | DESCRIPTIVE — MDN path names the API | identifier-probe | only the descriptive documentation URL; this measures URL text hints |
| `spec-url-only` | CANONICAL — spec URL (usually names the feature) | identifier-probe | only the canonical spec URL, when the item has one |
| `bcd-key-only` | CANONICAL, SEMI-DESCRIPTIVE — BCD dotted key often contains the name | identifier-probe | only the Browser Compat Data key, when the item has one |
| `url+name` | OPAQUE id + the task name | context | opaque URL plus the task name |
| `full-content` | — (real page pasted in; ceiling) | ceiling | the real page content is fetched and pasted in |
| `fake-structural-url` | CONTROL — nonexistent same-shape URL | control | plausible but nonexistent URL of the same shape (structure control); NB descriptive for web items (the fake path still names the API) |
| `fake-opaque-url` | CONTROL — opaque-SHAPED fake id (uniform) | control | an OPAQUE-shaped fake id (fake ChromeStatus#/arXiv#/SO#, uniform) — does opaque URL *shape* alone steer, independent of any real content? |
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
| RFC id | 9 | 0.79 | 0.11 |
| CVE id | 8 | 0.77 | 0.00 |
| arXiv id | 20 | 0.64 | 0.02 |
| GitHub commit SHA | 3 | 0.60 | 0.00 |
| HuggingFace id | 3 | 0.41 | 0.00 |
| Stack Overflow # | 8 | 0.35 | 0.01 |
| DOI | 6 | 0.33 | 0.00 |
| PubMed id | 6 | 0.10 | 0.00 |
| control (synthetic, not a real pointer) | 1 | 0.02 | 1.00 |
| ChromeStatus # | 28 | 0.01 | 0.78 |
| caniuse | 1 | 0.00 | 0.62 |

**Read:** a bare OPAQUE id works only when it is a *famous, memorised* id (landmark arXiv / RFC). Opaque numeric ids the model never memorised (ChromeStatus #, un-famous Stack Overflow #) decode to ~0 — even for features the model knows cold by name. The canonical web-id probes (`bcd-key-only`, `spec-url-only`) DO work, but they are semi-descriptive (the BCD key / spec path usually contains the feature name), so that is partly a *hint*, not pure opaque retrieval. See the per-item table below.

## All-models view — mean correctness by condition

Every condition, averaged across ALL models and ALL API-usage items (knowledge-calibration items excluded). The clearest one-look summary:

| condition | identifier | mean (all models) |
|---|---|---|
| `name-only` | — (no identifier; baseline) | 0.27 |
| `name-framed` | — (no id; framing-matched baseline for url-only) | 0.26 |
| `url-only` | OPAQUE | 0.37 |
| `mdn-url-only` | DESCRIPTIVE | 0.56 |
| `spec-url-only` | CANONICAL | 0.59 |
| `bcd-key-only` | CANONICAL, SEMI-DESCRIPTIVE | 0.73 |
| `url+name` | OPAQUE id + the task name | 0.64 |
| `full-content` | — (real page pasted in; ceiling) | 0.88 |
| `fake-structural-url` | CONTROL | 0.14 |
| `fake-opaque-url` | CONTROL | 0.01 |
| `random-url` | CONTROL | 0.00 |

## Controls — is the url-only result a framing or shape artifact?

Two controls test whether the `url-only` collapse is real or an artifact:

- **Framing.** `name-framed` puts the plain task description in the SAME "do whatever this describes" wording as `url-only`. Framing cost = name-framed − name-only = **-0.00** (≈0): the framing does NOT explain url-only's low score. So the **framing-adjusted lift** (url-only − name-framed = **+0.11**) equals the raw lift — the opaque id genuinely fails, it is not vaguer instruction.
- **Opaque shape.** `fake-opaque-url` (an OPAQUE-shaped fake id) scores **0.01**, vs `fake-structural-url` **0.14**. An opaque fake steers nothing; the higher fake-structural number is only because that fake is *descriptive* for web items (the fake path still names an API). So opaque URL SHAPE alone does not steer output — only real, memorised content does.

## Per-item identifier reference

Exactly what the `url-only` (OPAQUE) id is for each item, and which descriptive/canonical ids it also carries.

| item | contentDate | `url-only` (opaque) id | type | spec? | bcd? |
|---|---|---|---|---|---|
| `pmid-7466396-evolution-cooperation` | 1981-03-27 | `pubmed.ncbi.nlm.nih.gov/7466396/` | PubMed id | — | — |
| `rfc-791-ip` | 1981-09 | `datatracker.ietf.org/doc/rfc791/` | RFC id | — | — |
| `rfc-1149-avian-carriers` | 1990-04 | `datatracker.ietf.org/doc/rfc1149/` | RFC id | — | — |
| `rfc-2616-http11` | 1999-05 | `datatracker.ietf.org/doc/rfc2616/` | RFC id | — | — |
| `pmid-10676951-dlbcl-gene-expression` | 2000-02-03 | `pubmed.ncbi.nlm.nih.gov/10676951/` | PubMed id | — | — |
| `pmid-11237011-human-genome` | 2001-02-15 | `pubmed.ncbi.nlm.nih.gov/11237011/` | PubMed id | — | — |
| `doi-human-genome-science` | 2001-02-16 | `doi.org/10.1126/science.1058040` | DOI | — | — |
| `gh-sha-git-initial-commit` | 2005-04-07 | `github.com/git/git/commit/e83c5163316f89bfbde7d9ab23ca2e25604af290` | GitHub commit SHA | — | — |
| `gh-sha-linux-initial-git` | 2005-04-16 | `github.com/torvalds/linux/commit/1da177e4c3f41524e886b7f1b8a0c1fc7321cac2` | GitHub commit SHA | — | — |
| `so-111102-javascript-closures` | 2008-09-21 | `stackoverflow.com/questions/111102` | Stack Overflow # | — | — |
| `so-178325-jquery-element-hidden` | 2008-10-07 | `stackoverflow.com/questions/178325` | Stack Overflow # | — | — |
| `so-503093-redirect-webpage` | 2009-02-02 | `stackoverflow.com/questions/503093` | Stack Overflow # | — | — |
| `so-1335851-use-strict` | 2009-08-26 | `stackoverflow.com/questions/1335851` | Stack Overflow # | — | — |
| `gh-sha-bitcoin-first-commit` | 2009-08-30 | `github.com/bitcoin/bitcoin/commit/4405b78d6059e536c36974088a8ed4d9f0f29898` | GitHub commit SHA | — | — |
| `doi-corn-seed-traits-pricing` | 2010-07-19 | `doi.org/10.1093/ajae/aaq063` | DOI | — | — |
| `so-11227809-branch-prediction` | 2012-06-27 | `stackoverflow.com/questions/11227809` | Stack Overflow # | — | — |
| `arxiv-word2vec` | 2013-01-16 | `arxiv.org/abs/1301.3781` | arXiv id | — | — |
| `js-promise` | 2014-01 | `stackoverflow.com/questions/30564053` | control (synthetic, not a real pointer) | Y | Y |
| `cve-2014-0160-heartbleed` | 2014-04-07 | `nvd.nist.gov/vuln/detail/CVE-2014-0160` | CVE id | — | — |
| `arxiv-gan` | 2014-06-10 | `arxiv.org/abs/1406.2661` | arXiv id | — | — |
| `arxiv-vgg` | 2014-09-04 | `arxiv.org/abs/1409.1556` | arXiv id | — | — |
| `arxiv-adam` | 2014-12-22 | `arxiv.org/abs/1412.6980` | arXiv id | — | — |
| `service-worker` | 2015-01 | `www.chromestatus.com/feature/6561526227927040` | ChromeStatus # | Y | Y |
| `pmid-25592156-hydrogel-immunoprotection` | 2015-02-09 | `pubmed.ncbi.nlm.nih.gov/25592156/` | PubMed id | — | — |
| `fetch-api` | 2015-03 | `chromestatus.com/feature/6730533392351232` | ChromeStatus # | Y | Y |
| `arxiv-knowledge-distillation` | 2015-03-09 | `arxiv.org/abs/1503.02531` | arXiv id | — | — |
| `arxiv-unet` | 2015-05-18 | `arxiv.org/abs/1505.04597` | arXiv id | — | — |
| `doi-deep-learning-nature-review` | 2015-05-27 | `doi.org/10.1038/nature14539` | DOI | — | — |
| `arxiv-resnet` | 2015-12-10 | `arxiv.org/abs/1512.03385` | arXiv id | — | — |
| `intersection-observer` | 2016-05 | `chromestatus.com/feature/5695342691483648` | ChromeStatus # | Y | Y |
| `async-await` | 2016-10 | `chromestatus.com/feature/5643236399906816` | ChromeStatus # | Y | Y |
| `arxiv-pate` | 2016-10-18 | `arxiv.org/abs/1610.05755` | arXiv id | — | — |
| `css-grid` | 2017-03 | `chromestatus.com/feature/4589636412243968` | ChromeStatus # | Y | Y |
| `cve-2017-0144-eternalblue` | 2017-03-17 | `nvd.nist.gov/vuln/detail/CVE-2017-0144` | CVE id | — | — |
| `arxiv-attention` | 2017-06 | `arxiv.org/abs/1706.03762` | arXiv id | — | — |
| `arxiv-ppo` | 2017-07-20 | `arxiv.org/abs/1707.06347` | arXiv id | — | — |
| `pmid-28778026-deep-learning-medical-survey` | 2017-12 | `pubmed.ncbi.nlm.nih.gov/28778026/` | PubMed id | — | — |
| `rfc-8259-json` | 2017-12 | `datatracker.ietf.org/doc/rfc8259/` | RFC id | — | — |
| `cve-2018-7600-drupalgeddon2` | 2018-03-29 | `nvd.nist.gov/vuln/detail/CVE-2018-7600` | CVE id | — | — |
| `arxiv-bert` | 2018-10-11 | `arxiv.org/abs/1810.04805` | arXiv id | — | — |
| `cve-2019-0708-bluekeep` | 2019-05-16 | `nvd.nist.gov/vuln/detail/CVE-2019-0708` | CVE id | — | — |
| `doi-optuna-kdd` | 2019-07-25 | `doi.org/10.1145/3292500.3330701` | DOI | — | — |
| `arxiv-gpt3` | 2020-05-28 | `arxiv.org/abs/2005.14165` | arXiv id | — | — |
| `doi-alphafold-nature` | 2021-07-15 | `doi.org/10.1038/s41586-021-03819-2` | DOI | — | — |
| `cve-2021-44228-log4shell` | 2021-12-10 | `nvd.nist.gov/vuln/detail/CVE-2021-44228` | CVE id | — | — |
| `rfc-9110-http-semantics` | 2022-06 | `datatracker.ietf.org/doc/rfc9110/` | RFC id | — | — |
| `rfc-9114-http3` | 2022-06 | `datatracker.ietf.org/doc/rfc9114/` | RFC id | — | — |
| `rfc-9293-tcp` | 2022-08 | `datatracker.ietf.org/doc/rfc9293/` | RFC id | — | — |
| `fedcm` | 2022-12 | `chromestatus.com/feature/6438627087220736` | ChromeStatus # | Y | Y |
| `view-transitions` | 2023-03 | `chromestatus.com/feature/5193009714954240` | ChromeStatus # | Y | Y |
| `arxiv-mamba` | 2023-12 | `arxiv.org/abs/2312.00752` | arXiv id | — | — |
| `so-78084814-coredump-file-mapping` | 2024-02-29 | `stackoverflow.com/questions/78084814` | Stack Overflow # | — | — |
| `cve-2024-3094-xz-backdoor` | 2024-03-29 | `nvd.nist.gov/vuln/detail/CVE-2024-3094` | CVE id | — | — |
| `popover-api` | 2024-04 | `chromestatus.com/feature/5463833265045504` | ChromeStatus # | Y | Y |
| `css-anchor-positioning` | 2024-08 | `chromestatus.com/feature/5124922471874560` | ChromeStatus # | Y | Y |
| `view-transitions-cross-doc` | 2024-09 | `chromestatus.com/feature/5118874666663936` | ChromeStatus # | Y | Y |
| `arxiv-deepseek-r1` | 2025-01 | `arxiv.org/abs/2501.12948` | arXiv id | — | — |
| `rfc-9700-oauth-security-bcp` | 2025-01 | `datatracker.ietf.org/doc/rfc9700/` | RFC id | — | — |
| `rfc-9701-jwt-oauth-introspection` | 2025-01 | `datatracker.ietf.org/doc/rfc9701/` | RFC id | — | — |
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
| `so-79886234-java25-file-exists` | 2026-02-10 | `stackoverflow.com/questions/79886234` | Stack Overflow # | — | — |
| `so-79890462-reinterpret-cast-structs` | 2026-02-16 | `stackoverflow.com/questions/79890462` | Stack Overflow # | — | — |
| `cve-2026-25000-wheel-of-life` | 2026-02-19 | `nvd.nist.gov/vuln/detail/CVE-2026-25000` | CVE id | — | — |
| `hf-qwen3-5-4b` | 2026-02-27 | `huggingface.co/Qwen/Qwen3.5-4B` | HuggingFace id | — | — |
| `css-text-indent-hanging` | 2026-03 | `chromestatus.com/feature/5084062739988480` | ChromeStatus # | Y | Y |
| `named-feature-supports` | 2026-03 | `chromestatus.com/feature/5153932394102784` | ChromeStatus # | Y | — |
| `cve-2026-3000-idexpert-rce` | 2026-03-02 | `nvd.nist.gov/vuln/detail/CVE-2026-3000` | CVE id | — | — |
| `hf-gemma-4-26b-a4b-it` | 2026-03-11 | `huggingface.co/google/gemma-4-26B-A4B-it` | HuggingFace id | — | — |
| `element-scoped-view-transitions` | 2026-04 | `chromestatus.com/feature/5109852273377280` | ChromeStatus # | Y | Y |
| `math-sumprecise` | 2026-04 | `chromestatus.com/feature/4790090146643968` | ChromeStatus # | Y | Y |
| `gamepad-event-driven-input` | 2026-04 | `chromestatus.com/feature/5989275208253440` | ChromeStatus # | — | — |
| `doi-biorxiv-endomesoderm-grn` | 2026-04-01 | `doi.org/10.64898/2026.03.31.715602` | DOI | — | — |
| `hf-qwen3-6-27b` | 2026-04-21 | `huggingface.co/Qwen/Qwen3.6-27B` | HuggingFace id | — | — |
| `arxiv-future-fake-real-id` | 2026-05 | `arxiv.org/abs/2605.04567` | arXiv id | — | — |
| `prompt-api-shape` | 2026-05 | `chromestatus.com/feature/5134603979063296` | ChromeStatus # | Y | Y |
| `text-decoration-skip-ink-all` | 2026-05 | `chromestatus.com/feature/5077600085082112` | ChromeStatus # | Y | Y |
| `pmid-42224782-crispr-echinococcus` | 2026-05-25 | `pubmed.ncbi.nlm.nih.gov/42224782/` | PubMed id | — | — |
| `baseline-has-status` | 2026-06 | `caniuse.com/css-has` | caniuse | Y | Y |
| `css-gap-decorations` | 2026-06 | `chromestatus.com/feature/5157805733183488` | ChromeStatus # | Y | Y |
| `css-image-color-function` | 2026-06 | `chromestatus.com/feature/5121011285622784` | ChromeStatus # | Y | Y |
| `arxiv-diffusiongemma-transparency` | 2026-06-18 | `arxiv.org/abs/2606.20560` | arXiv id | — | — |
| `arxiv-lie-algebra-attention` | 2026-06-18 | `arxiv.org/abs/2606.20547` | arXiv id | — | — |
| `arxiv-multitask-bayesian-icl` | 2026-06-18 | `arxiv.org/abs/2606.20538` | arXiv id | — | — |

## Per-item results — name-only vs opaque vs canonical id

Mean correctness across all models, by item (sorted by date). `opaque` = `url-only`. Watch the **opaque** column collapse to ~0 except for famous arXiv/RFC ids, while **bcd/spec/mdn** (which name the feature) track `name`. Blank = n/a or no data.

| item | opaque id type | name | opaque | mdn | spec | bcd | full |
|---|---|---|---|---|---|---|---|
| `pmid-7466396-evolution-cooperation` | PubMed id | 0.00 | 0.00 | 0.00 |   -   |   -   | 0.99 |
| `rfc-791-ip` | RFC id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `rfc-1149-avian-carriers` | RFC id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `rfc-2616-http11` | RFC id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `pmid-10676951-dlbcl-gene-expression` | PubMed id | 0.00 | 0.00 | 0.00 |   -   |   -   | 0.99 |
| `pmid-11237011-human-genome` | PubMed id | 0.00 | 0.45 | 0.45 |   -   |   -   | 0.91 |
| `doi-human-genome-science` | DOI | 0.00 | 0.38 | 0.46 |   -   |   -   | 0.00 |
| `gh-sha-git-initial-commit` | GitHub commit SHA | 0.00 | 0.85 | 0.76 |   -   |   -   | 1.00 |
| `gh-sha-linux-initial-git` | GitHub commit SHA | 0.00 | 0.95 | 0.99 |   -   |   -   | 1.00 |
| `so-111102-javascript-closures` | Stack Overflow # | 0.00 | 0.15 | 0.23 |   -   |   -   | 0.81 |
| `so-178325-jquery-element-hidden` | Stack Overflow # | 0.00 | 0.00 | 0.01 |   -   |   -   | 0.85 |
| `so-503093-redirect-webpage` | Stack Overflow # | 0.00 | 0.77 | 0.79 |   -   |   -   | 0.92 |
| `so-1335851-use-strict` | Stack Overflow # | 0.00 | 0.31 | 0.15 |   -   |   -   | 0.94 |
| `gh-sha-bitcoin-first-commit` | GitHub commit SHA | 0.00 | 0.00 | 0.07 |   -   |   -   | 0.83 |
| `doi-corn-seed-traits-pricing` | DOI | 0.00 | 0.00 | 0.00 |   -   |   -   | 0.00 |
| `so-11227809-branch-prediction` | Stack Overflow # | 0.00 | 0.83 | 0.78 |   -   |   -   | 1.00 |
| `arxiv-word2vec` | arXiv id | 0.00 | 0.84 | 0.84 |   -   |   -   | 0.99 |
| `js-promise` | control (synthetic, not a real pointer) | 1.00 | 0.02 | 1.00 | 0.53 | 1.00 | 1.00 |
| `cve-2014-0160-heartbleed` | CVE id | 0.00 | 0.92 | 0.98 |   -   |   -   | 1.00 |
| `arxiv-gan` | arXiv id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `arxiv-vgg` | arXiv id | 0.00 | 0.92 | 0.92 |   -   |   -   | 1.00 |
| `arxiv-adam` | arXiv id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `service-worker` | ChromeStatus # | 1.00 | 0.00 | 0.97 | 0.95 | 0.74 | 1.00 |
| `pmid-25592156-hydrogel-immunoprotection` | PubMed id | 0.00 | 0.00 | 0.00 |   -   |   -   | 0.99 |
| `fetch-api` | ChromeStatus # | 0.96 | 0.00 | 0.95 | 0.61 | 1.00 | 0.98 |
| `arxiv-knowledge-distillation` | arXiv id | 0.00 | 0.69 | 0.69 |   -   |   -   | 1.00 |
| `arxiv-unet` | arXiv id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `doi-deep-learning-nature-review` | DOI | 0.00 | 0.24 | 0.62 |   -   |   -   | 0.00 |
| `arxiv-resnet` | arXiv id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `intersection-observer` | ChromeStatus # | 1.00 | 0.00 | 0.99 | 1.00 | 0.99 | 0.99 |
| `async-await` | ChromeStatus # | 0.88 | 0.07 | 0.80 | 0.55 | 0.86 | 0.65 |
| `arxiv-pate` | arXiv id | 0.00 | 0.08 | 0.08 |   -   |   -   | 1.00 |
| `css-grid` | ChromeStatus # | 1.00 | 0.00 | 0.92 | 0.91 | 0.85 | 1.00 |
| `cve-2017-0144-eternalblue` | CVE id | 0.00 | 0.99 | 0.99 |   -   |   -   | 0.98 |
| `arxiv-attention` | arXiv id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `arxiv-ppo` | arXiv id | 0.00 | 0.77 | 0.68 |   -   |   -   | 1.00 |
| `pmid-28778026-deep-learning-medical-survey` | PubMed id | 0.00 | 0.00 | 0.00 |   -   |   -   | 1.00 |
| `rfc-8259-json` | RFC id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `cve-2018-7600-drupalgeddon2` | CVE id | 0.00 | 0.98 | 0.99 |   -   |   -   | 1.00 |
| `arxiv-bert` | arXiv id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `cve-2019-0708-bluekeep` | CVE id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `doi-optuna-kdd` | DOI | 0.00 | 0.00 | 0.02 |   -   |   -   | 0.00 |
| `arxiv-gpt3` | arXiv id | 0.00 | 0.92 | 0.92 |   -   |   -   | 1.00 |
| `doi-alphafold-nature` | DOI | 0.00 | 0.82 | 0.82 |   -   |   -   | 0.00 |
| `cve-2021-44228-log4shell` | CVE id | 0.00 | 1.00 | 0.98 |   -   |   -   | 1.00 |
| `rfc-9110-http-semantics` | RFC id | 1.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `rfc-9114-http3` | RFC id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `rfc-9293-tcp` | RFC id | 0.00 | 1.00 | 1.00 |   -   |   -   | 1.00 |
| `fedcm` | ChromeStatus # | 1.00 | 0.00 | 0.87 | 0.95 | 1.00 | 1.00 |
| `view-transitions` | ChromeStatus # | 0.98 | 0.08 | 0.94 | 0.90 | 0.97 | 0.90 |
| `arxiv-mamba` | arXiv id | 0.00 | 0.46 | 0.38 |   -   |   -   | 1.00 |
| `so-78084814-coredump-file-mapping` | Stack Overflow # | 0.00 | 0.00 | 0.00 |   -   |   -   | 1.00 |
| `cve-2024-3094-xz-backdoor` | CVE id | 0.00 | 1.00 | 0.99 |   -   |   -   | 1.00 |
| `popover-api` | ChromeStatus # | 0.96 | 0.15 | 0.97 | 0.92 | 0.95 | 0.92 |
| `css-anchor-positioning` | ChromeStatus # | 0.98 | 0.08 | 0.93 | 0.81 | 0.94 | 0.97 |
| `view-transitions-cross-doc` | ChromeStatus # | 0.96 | 0.00 | 0.88 | 0.77 | 0.89 | 0.91 |
| `arxiv-deepseek-r1` | arXiv id | 0.00 | 0.30 | 0.20 |   -   |   -   | 0.99 |
| `rfc-9700-oauth-security-bcp` | RFC id | 0.00 | 0.15 | 0.14 |   -   |   -   | 1.00 |
| `rfc-9701-jwt-oauth-introspection` | RFC id | 0.00 | 0.00 | 0.00 |   -   |   -   | 1.00 |
| `css-scroll-state-container-queries` | ChromeStatus # | 0.80 | 0.00 | 0.00 | 0.55 | 0.58 | 0.90 |
| `arxiv-gemma-3` | arXiv id | 0.00 | 0.00 | 0.00 |   -   |   -   | 1.00 |
| `customizable-select` | ChromeStatus # | 0.77 | 0.00 | 0.38 | 0.25 | 0.47 | 0.87 |
| `css-shape-function` | ChromeStatus # | 0.67 | 0.00 | 0.54 | 0.21 | 0.72 | 0.88 |
| `translator-api` | ChromeStatus # | 0.34 | 0.00 | 0.35 | 0.42 | 0.60 | 0.87 |
| `language-detector-api` | ChromeStatus # | 0.47 | 0.00 | 0.49 | 0.32 | 0.67 | 0.96 |
| `arxiv-kimi-k2` | arXiv id | 0.00 | 0.00 | 0.00 |   -   |   -   | 1.00 |
| `corner-shape-squircle` | ChromeStatus # | 0.68 | 0.00 | 0.36 | 0.20 | 0.37 | 1.00 |
| `uint8array-base64-hex` | ChromeStatus # | 1.00 | 0.00 | 0.53 | 0.43 | 0.40 | 1.00 |
| `arxiv-gpt5-system-card` | arXiv id | 0.00 | 0.00 | 0.00 |   -   |   -   | 1.00 |
| `temporal-api` | ChromeStatus # | 0.93 | 0.00 | 0.92 | 0.93 | 0.97 | 1.00 |
| `text-justify-css-property` | ChromeStatus # | 0.97 | 0.00 | 1.00 | 0.97 | 1.00 | 0.99 |
| `so-79886234-java25-file-exists` | Stack Overflow # | 0.00 | 0.23 | 0.23 |   -   |   -   | 1.00 |
| `so-79890462-reinterpret-cast-structs` | Stack Overflow # | 0.08 | 0.54 | 0.38 |   -   |   -   | 1.00 |
| `cve-2026-25000-wheel-of-life` | CVE id | 0.00 | 0.08 | 0.00 |   -   |   -   | 1.00 |
| `hf-qwen3-5-4b` | HuggingFace id | 0.00 | 0.37 | 0.28 |   -   |   -   | 0.95 |
| `css-text-indent-hanging` | ChromeStatus # | 0.88 | 0.00 | 0.77 | 0.78 | 0.73 | 1.00 |
| `named-feature-supports` | ChromeStatus # | 0.20 | 0.00 | 0.00 | 0.00 |   -   | 0.95 |
| `cve-2026-3000-idexpert-rce` | CVE id | 0.00 | 0.15 | 0.23 |   -   |   -   | 1.00 |
| `hf-gemma-4-26b-a4b-it` | HuggingFace id | 0.00 | 0.36 | 0.25 |   -   |   -   | 0.69 |
| `element-scoped-view-transitions` | ChromeStatus # | 0.75 | 0.00 | 0.40 | 0.53 | 0.85 | 0.95 |
| `math-sumprecise` | ChromeStatus # | 0.77 | 0.00 | 0.48 | 0.47 | 0.82 | 0.93 |
| `gamepad-event-driven-input` | ChromeStatus # | 0.00 | 0.00 | 0.00 |   -   |   -   | 0.00 |
| `doi-biorxiv-endomesoderm-grn` | DOI | 0.00 | 0.53 | 0.54 |   -   |   -   | 0.15 |
| `hf-qwen3-6-27b` | HuggingFace id | 0.00 | 0.51 | 0.26 |   -   |   -   | 0.79 |
| `prompt-api-shape` | ChromeStatus # | 0.15 | 0.00 | 0.38 | 0.38 | 0.40 | 0.84 |
| `text-decoration-skip-ink-all` | ChromeStatus # | 0.92 | 0.00 | 0.73 | 0.92 | 0.95 | 1.00 |
| `pmid-42224782-crispr-echinococcus` | PubMed id | 0.00 | 0.15 | 0.31 |   -   |   -   | 1.00 |
| `baseline-has-status` | caniuse | 0.62 | 0.00 | 0.00 | 0.00 | 0.00 | 0.17 |
| `css-gap-decorations` | ChromeStatus # | 0.75 | 0.00 | 0.56 | 0.53 | 0.53 | 0.88 |
| `css-image-color-function` | ChromeStatus # | 0.96 | 0.00 | 0.36 | 0.33 | 0.10 | 0.97 |
| `arxiv-diffusiongemma-transparency` | arXiv id | 0.00 | 0.46 | 0.38 |   -   |   -   | 0.99 |
| `arxiv-lie-algebra-attention` | arXiv id | 0.08 | 0.54 | 0.54 |   -   |   -   | 1.00 |
| `arxiv-multitask-bayesian-icl` | arXiv id | 0.23 | 0.77 | 0.69 |   -   |   -   | 0.83 |

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
- **RUNLOG.md** — a human-browsable mirror of the transcript (every prompt, output, judge prompt + raw verdict); too large to commit, regenerate locally with `npm run transcript`.
- **[transcript.jsonl.gz](transcript.jsonl.gz)** — one gzipped JSON line per cell with everything, machine-readable. This is the committed full run data; `results/raw/` is the gitignored intermediate it is built from.

## Averaged lift table (context — see the per-item finding above)

_This averages a sharply bimodal, item-specific signal, so a single "lift −0.5" hides the categorical pattern. Use the per-item tables above for the real result; this section is kept for continuity._

`LIFT = mean(url-only) − mean(name-only)` over API-usage items whose opaque URL is intended to be a real pointer. Knowledge-calibration items and intentional opaque structural controls are excluded. `n pre/post` = eligible API-usage items each side of this model's cutoff.

| Model | cutoff | overall lift | pre-cutoff lift | post-cutoff lift | n pre/post |
|---|---|---|---|---|---|
| Claude Opus 4.8 | 2026-01-31 | +0.10 | +0.22 | -0.26 | 69/23 |
| Claude Sonnet 4.6 | 2026-01-31 | +0.09 | +0.19 | -0.19 | 69/23 |
| Claude Opus 4.6 | 2025-08-31 | +0.15 | +0.26 | -0.13 | 66/26 |
| Claude Sonnet 4.5 | 2025-07-31 | +0.05 | +0.16 | -0.21 | 65/27 |
| Gemini 3.1 Pro | 2025-01-31 | +0.18 | +0.37 | -0.12 | 58/34 |
| Gemini 3.5 Flash | 2025-01-31 | +0.21 | +0.36 | -0.04 | 58/34 |
| GPT-5.5 | 2025-12-01 | +0.18 | +0.29 | -0.12 | 67/25 |
| GPT-5.2 | 2025-08-31 | -0.01 | +0.09 | -0.27 | 66/26 |
| GPT-5 | 2024-09-30 | +0.20 | +0.37 | -0.06 | 55/37 |
| Grok 4.3 | 2025-12-31 | +0.10 | +0.18 | -0.12 | 68/24 |
| Grok 4 | 2024-11-30 | +0.09 | +0.35 | -0.29 | 55/37 |
| GLM-5.2 | 2025-10-31 | +0.08 | +0.18 | -0.18 | 67/25 |
| GLM-5.1 | 2025-10-31 | +0.14 | +0.26 | -0.16 | 67/25 |

## Real opaque API-usage items: pre/post mean correctness per condition

Knowledge-calibration items and intentional opaque structural controls excluded. In **pre** rows, does `url-only` approach `name-only`? In **post** rows, it should not beat `name-only`; controls stay flat.

### Claude Opus 4.8 (cutoff 2026-01-31) — 69 pre / 23 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.27 | 0.27 | 0.49 | 0.71 | 0.88 | 0.98 | 0.71 | 0.92 | 0.23 | 0.00 | 0.00 |
| post-cutoff | 0.30 | 0.35 | 0.04 | 0.32 | 0.78 | 0.75 | 0.50 | 0.74 | 0.18 | 0.00 | 0.00 |

### Claude Sonnet 4.6 (cutoff 2026-01-31) — 69 pre / 23 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.26 | 0.24 | 0.45 | 0.68 | 0.74 | 0.94 | 0.71 | 0.92 | 0.14 | 0.00 | 0.00 |
| post-cutoff | 0.32 | 0.35 | 0.13 | 0.37 | 0.68 | 0.69 | 0.57 | 0.86 | 0.12 | 0.00 | 0.00 |

### Claude Opus 4.6 (cutoff 2025-08-31) — 66 pre / 26 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.22 | 0.22 | 0.48 | 0.69 | 0.63 | 0.98 | 0.67 | 0.91 | 0.16 | 0.00 | 0.00 |
| post-cutoff | 0.35 | 0.42 | 0.22 | 0.44 | 0.66 | 0.69 | 0.63 | 0.83 | 0.24 | 0.04 | 0.00 |

### Claude Sonnet 4.5 (cutoff 2025-07-31) — 65 pre / 27 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.21 | 0.21 | 0.37 | 0.53 | 0.70 | 0.79 | 0.56 | 0.88 | 0.12 | 0.00 | 0.00 |
| post-cutoff | 0.32 | 0.24 | 0.12 | 0.27 | 0.45 | 0.55 | 0.47 | 0.82 | 0.10 | 0.00 | 0.00 |

### Gemini 3.1 Pro (cutoff 2025-01-31) — 58 pre / 34 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.19 | 0.18 | 0.56 | 0.73 | 0.76 | 0.93 | 0.76 | 0.89 | 0.12 | 0.00 | 0.00 |
| post-cutoff | 0.30 | 0.24 | 0.18 | 0.24 | 0.26 | 0.48 | 0.50 | 0.82 | 0.21 | 0.06 | 0.00 |

### Gemini 3.5 Flash (cutoff 2025-01-31) — 58 pre / 34 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.19 | 0.20 | 0.55 | 0.64 | 0.48 | 0.96 | 0.75 | 0.87 | 0.10 | 0.00 | 0.00 |
| post-cutoff | 0.16 | 0.27 | 0.12 | 0.28 | 0.16 | 0.45 | 0.38 | 0.80 | 0.08 | 0.00 | 0.00 |

### GPT-5.5 (cutoff 2025-12-01) — 67 pre / 25 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.26 | 0.26 | 0.55 | 0.73 | 0.88 | 0.90 | 0.83 | 0.91 | 0.18 | 0.00 | 0.00 |
| post-cutoff | 0.42 | 0.40 | 0.30 | 0.53 | 0.72 | 0.71 | 0.68 | 0.88 | 0.20 | 0.12 | 0.00 |

### GPT-5.2 (cutoff 2025-08-31) — 66 pre / 26 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.23 | 0.22 | 0.32 | 0.46 | 0.56 | 0.75 | 0.49 | 0.90 | 0.06 | 0.00 | 0.00 |
| post-cutoff | 0.40 | 0.35 | 0.13 | 0.29 | 0.27 | 0.43 | 0.67 | 0.89 | 0.17 | 0.00 | 0.00 |

### GPT-5 (cutoff 2024-09-30) — 55 pre / 37 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.20 | 0.19 | 0.56 | 0.72 | 0.83 | 0.85 | 0.70 | 0.88 | 0.04 | 0.00 | 0.00 |
| post-cutoff | 0.25 | 0.28 | 0.19 | 0.29 | 0.28 | 0.33 | 0.49 | 0.90 | 0.22 | 0.02 | 0.00 |

### Grok 4.3 (cutoff 2025-12-31) — 68 pre / 24 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.24 | 0.24 | 0.41 | 0.62 | 0.59 | 0.65 | 0.65 | 0.89 | 0.07 | 0.00 | 0.00 |
| post-cutoff | 0.37 | 0.41 | 0.25 | 0.47 | 0.35 | 0.59 | 0.75 | 0.84 | 0.20 | 0.08 | 0.00 |

### Grok 4 (cutoff 2024-11-30) — 55 pre / 37 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.18 | 0.18 | 0.53 | 0.72 | 0.88 | 0.77 | 0.66 | 0.87 | 0.03 | 0.00 | 0.00 |
| post-cutoff | 0.39 | 0.37 | 0.10 | 0.34 | 0.39 | 0.47 | 0.59 | 0.90 | 0.12 | 0.03 | 0.00 |

### GLM-5.2 (cutoff 2025-10-31) — 67 pre / 25 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.23 | 0.21 | 0.42 | 0.63 | 0.66 | 0.82 | 0.65 | 0.90 | 0.13 | 0.00 | 0.00 |
| post-cutoff | 0.38 | 0.40 | 0.20 | 0.48 | 0.76 | 0.89 | 0.60 | 0.85 | 0.26 | 0.04 | 0.00 |

### GLM-5.1 (cutoff 2025-10-31) — 67 pre / 25 post API items

| bucket | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.23 | 0.22 | 0.49 | 0.63 | 0.81 | 0.79 | 0.62 | 0.91 | 0.10 | 0.00 | 0.00 |
| post-cutoff | 0.40 | 0.35 | 0.24 | 0.41 | 0.69 | 0.61 | 0.66 | 0.86 | 0.22 | 0.08 | 0.00 |

## Knowledge-calibration items: correct-refusal rate per condition

These items (`scroll-triggered-animations`, `arxiv-future-fake-real-id`, `html-in-canvas`) post-date every model; correctness = the model correctly said it could not determine the answer. NOT part of the lift. The thing to see: a bare `url-only` (and `name-only`) often score HIGH here — refusing is easy when you're handed nothing — which is exactly why these would pollute a lift average if included.

| Model | name-only | name-framed | url-only | mdn-url-only | spec-url-only | bcd-key-only | url+name | full-content | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Claude Opus 4.8 | 0.75 | 0.50 | 1.00 | 0.47 | 0.65 | 1.00 | 0.77 | 0.42 | 0.43 | 1.00 | 0.33 |
| Claude Sonnet 4.6 | 0.33 | 0.67 | 0.33 | 0.67 | 1.00 | 0.85 | 0.98 | 0.03 | 0.70 | 1.00 | 0.00 |
| Claude Opus 4.6 | 0.68 | 0.33 | 0.33 | 0.70 | 0.10 | 0.20 | 0.42 | 0.00 | 0.70 | 1.00 | 0.00 |
| Claude Sonnet 4.5 | 0.37 | 0.33 | 0.67 | 0.70 | 0.60 | 1.00 | 0.63 | 0.00 | 0.70 | 1.00 | 0.00 |
| Gemini 3.1 Pro | 0.93 | 0.98 | 1.00 | 0.93 | 1.00 | 0.95 | 1.00 | 0.32 | 0.70 | 1.00 | 0.00 |
| Gemini 3.5 Flash | 0.40 | 0.43 | 1.00 | 0.73 | 0.50 | 0.10 | 0.57 | 0.03 | 0.47 | 1.00 | 0.00 |
| GPT-5.5 | 0.77 | 0.40 | 1.00 | 0.33 | 0.50 | 0.10 | 0.43 | 0.05 | 0.33 | 1.00 | 0.00 |
| GPT-5.2 | 0.93 | 0.37 | 1.00 | 0.77 | 1.00 | 1.00 | 0.70 | 0.03 | 0.73 | 1.00 | 0.00 |
| GPT-5 | 0.37 | 0.65 | 1.00 | 1.00 | 1.00 | 0.95 | 0.37 | 0.00 | 0.63 | 1.00 | 0.00 |
| Grok 4.3 | 0.62 | 0.67 | 1.00 | 0.67 | 1.00 | 1.00 | 0.70 | 0.07 | 0.95 | 1.00 | 0.00 |
| Grok 4 | 0.33 | 0.37 | 0.67 | 0.70 | 1.00 | 1.00 | 0.33 | 0.07 | 0.87 | 1.00 | 0.00 |
| GLM-5.2 | 1.00 | 0.70 | 1.00 | 0.67 | 0.57 | 1.00 | 0.77 | 0.32 | 0.73 | 1.00 | 0.00 |
| GLM-5.1 | 0.68 | 0.37 | 0.67 | 0.70 | 0.40 | 0.80 | 0.40 | 0.00 | 0.75 | 1.00 | 0.00 |

## All items, mean correctness by condition x model

_Both tracks combined — included only for completeness. Use the API-usage table above for the real signal._

| Condition | Claude Opus 4.8 (cut 2026-01-31) | Claude Sonnet 4.6 (cut 2026-01-31) | Claude Opus 4.6 (cut 2025-08-31) | Claude Sonnet 4.5 (cut 2025-07-31) | Gemini 3.1 Pro (cut 2025-01-31) | Gemini 3.5 Flash (cut 2025-01-31) | GPT-5.5 (cut 2025-12-01) | GPT-5.2 (cut 2025-08-31) | GPT-5 (cut 2024-09-30) | Grok 4.3 (cut 2025-12-31) | Grok 4 (cut 2024-11-30) | GLM-5.2 (cut 2025-10-31) | GLM-5.1 (cut 2025-10-31) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| name-only | 0.30 | 0.28 | 0.28 | 0.26 | 0.26 | 0.19 | 0.33 | 0.31 | 0.23 | 0.29 | 0.27 | 0.30 | 0.29 |
| name-framed | 0.30 | 0.29 | 0.29 | 0.23 | 0.24 | 0.24 | 0.31 | 0.27 | 0.25 | 0.30 | 0.27 | 0.28 | 0.27 |
| url-only | 0.39 | 0.36 | 0.40 | 0.30 | 0.43 | 0.41 | 0.50 | 0.28 | 0.43 | 0.39 | 0.36 | 0.37 | 0.42 |
| mdn-url-only | 0.61 | 0.61 | 0.63 | 0.47 | 0.56 | 0.52 | 0.67 | 0.43 | 0.56 | 0.59 | 0.58 | 0.59 | 0.58 |
| spec-url-only | 0.83 | 0.72 | 0.59 | 0.57 | 0.46 | 0.28 | 0.80 | 0.49 | 0.53 | 0.51 | 0.61 | 0.69 | 0.74 |
| bcd-key-only | 0.91 | 0.86 | 0.84 | 0.71 | 0.67 | 0.63 | 0.81 | 0.64 | 0.55 | 0.66 | 0.61 | 0.86 | 0.73 |
| url+name | 0.66 | 0.69 | 0.66 | 0.54 | 0.68 | 0.61 | 0.78 | 0.55 | 0.61 | 0.68 | 0.63 | 0.64 | 0.63 |
| full-content | 0.86 | 0.88 | 0.86 | 0.84 | 0.85 | 0.82 | 0.88 | 0.87 | 0.86 | 0.85 | 0.86 | 0.87 | 0.87 |
| fake-structural-url | 0.22 | 0.15 | 0.21 | 0.14 | 0.18 | 0.11 | 0.20 | 0.12 | 0.12 | 0.14 | 0.09 | 0.19 | 0.16 |
| fake-opaque-url | 0.03 | 0.03 | 0.04 | 0.03 | 0.05 | 0.03 | 0.06 | 0.03 | 0.04 | 0.05 | 0.04 | 0.04 | 0.05 |
| random-url | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

## Interpretation

- **Headline (real opaque API-usage items only):** mean lift +0.12 overall — among items whose opaque URL is meant to be a real pointer, a bare opaque URL, with no page content, does NOT beat simply naming the task, and across models it tends to lower the score. The model is more cautious or more error-prone when handed only a context-free URL string than when told plainly what to build.
- **Boundary (real opaque API-usage items):** mean pre-cutoff lift +0.25, mean post-cutoff lift -0.17. Pre-cutoff lift exceeds post-cutoff lift — the direction the hypothesis predicts — but both are negative, so the URL is a weak (and net-negative) retrieval key at this corpus size.
- **Why the earlier read was wrong:** an apparent positive *post-cutoff* url-only score comes from the knowledge-calibration items (scroll-triggered-animations, arxiv-future-fake-real-id, html-in-canvas), where the correct answer is "I don't know". A bare URL elicits exactly that refusal, scoring high — which is the OPPOSITE of the URL helping the model use an API. Those items are now excluded from the lift.
- **What does work:** `url+name` and the `full-content` ceiling score well across the board, and the controls (`fake-structural-url`, `random-url`) collapse toward name-only / zero, so the harness is measuring real content rather than URL shape.

Per model (real opaque API-usage items):
- **Claude Opus 4.8:** bare URL slightly helped (lift +0.10); full-content 0.87 vs name-only 0.28; pre +0.22 / post -0.26 (n 69/23).
- **Claude Sonnet 4.6:** bare URL slightly helped (lift +0.09); full-content 0.90 vs name-only 0.27; pre +0.19 / post -0.19 (n 69/23).
- **Claude Opus 4.6:** bare URL meaningfully helped (lift +0.15); full-content 0.89 vs name-only 0.26; pre +0.26 / post -0.13 (n 66/26).
- **Claude Sonnet 4.5:** bare URL slightly helped (lift +0.05); full-content 0.86 vs name-only 0.25; pre +0.16 / post -0.21 (n 65/27).
- **Gemini 3.1 Pro:** bare URL meaningfully helped (lift +0.18); full-content 0.86 vs name-only 0.23; pre +0.37 / post -0.12 (n 58/34).
- **Gemini 3.5 Flash:** bare URL meaningfully helped (lift +0.21); full-content 0.84 vs name-only 0.18; pre +0.36 / post -0.04 (n 58/34).
- **GPT-5.5:** bare URL meaningfully helped (lift +0.18); full-content 0.90 vs name-only 0.31; pre +0.29 / post -0.12 (n 67/25).
- **GPT-5.2:** bare URL made little difference (lift -0.01); full-content 0.90 vs name-only 0.28; pre +0.09 / post -0.27 (n 66/26).
- **GPT-5:** bare URL meaningfully helped (lift +0.20); full-content 0.88 vs name-only 0.22; pre +0.37 / post -0.06 (n 55/37).
- **Grok 4.3:** bare URL slightly helped (lift +0.10); full-content 0.88 vs name-only 0.27; pre +0.18 / post -0.12 (n 68/24).
- **Grok 4:** bare URL slightly helped (lift +0.09); full-content 0.88 vs name-only 0.27; pre +0.35 / post -0.29 (n 55/37).
- **GLM-5.2:** bare URL slightly helped (lift +0.08); full-content 0.89 vs name-only 0.27; pre +0.18 / post -0.18 (n 67/25).
- **GLM-5.1:** bare URL meaningfully helped (lift +0.14); full-content 0.90 vs name-only 0.27; pre +0.26 / post -0.16 (n 67/25).

---

_Small scale (a handful of API-usage items per pre/post bucket), so treat these as directional, not statistically significant — the post-cutoff API bucket is especially thin and is the main reason for expanding the corpus. Cutoff dates are the vendors' published values (see SOURCES.md). Every prompt, output, and judge prompt + raw verdict is in [transcript.jsonl.gz](transcript.jsonl.gz) and [dashboard.html](dashboard.html)._