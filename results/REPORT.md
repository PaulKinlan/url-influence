# URL Influence: Results

Report generated: 2026-06-20T20:28:01.749Z
Data run / scored: 2026-06-20T20:12:09.352Z
Code + data commit: [`d69bfdb2b3`](https://github.com/PaulKinlan/url-influence/commit/d69bfdb2b3e0c9650dbab5e90229549d20458c7d)
Judge model: `claude-sonnet-4-5`
Judged outputs: 12888 (judge failures: 0)

> An interactive, filterable view of every cell (prompt, model output, and the judge's full prompt + raw verdict) is in [dashboard.html](dashboard.html) — open it in a browser to slice by model / condition / pre-vs-post cutoff / pass-fail and read each verdict.

## How to read this

**The question.** Can a bare *opaque* URL (just the string, page never fetched) make a model produce a better answer than simply naming the task — and does that only happen for content from before the model's training cutoff? If so, the URL is acting as a retrieval key into the weights.

**Three tracks, measured separately (this is important).** The corpus has three kinds of item and they must NOT be averaged together:

- **`code` / API-usage items** — the model is asked to USE a real web API, and the opaque URL (a ChromeStatus id) points at that feature. described is a genuine task description, so opaque-url − described is a clean "opaque pointer vs description" contrast. **The LIFT metric is computed on these only.**
- **`recall` items (opaque-id decoding)** — arXiv/RFC/CVE/SO/PMID/DOI/SHA/HF ids. Here described is the work's TITLE, which ≈ the answer for famous works, so opaque-url − described is NOT comparable to the API-usage lift and is kept OUT of it. These are analysed on their own — by id-type, by popularity (famous/moderate/obscure), and pre/post cutoff — to ask whether the bare opaque id decodes into the real content.
- **Knowledge-calibration items** (`scroll-triggered-animations`, `arxiv-future-fake-real-id`, `html-in-canvas`) — the content post-dates every model, so the *correct* answer is "I can't determine this". A bare URL scores HIGH here precisely because it hands the model nothing, so it correctly refuses. Averaging these into the lift manufactures a fake "opaque-url helps post-cutoff" signal — so they are reported on their own (refusal calibration), never in the lift.

- **Intentional opaque structural controls** (`js-promise`) have `validation.opaqueRole = "structural-control"`. Their `opaque-url` prompt may contain a fake, missing, or unrelated opaque SO/ChromeStatus-shaped URL. They are useful controls, but excluded from headline lift because they are not real URL-to-content pointers.

**LIFT** (API-usage items with real opaque pointers) `= mean(correctness | opaque-url) − mean(correctness | described)`. Positive = the bare URL alone beat naming the task. The hypothesis predicts **positive lift pre-cutoff, ~zero post-cutoff**.

> **Lift applies only to `code`/API-usage items, NOT the opaque-id `recall` items** (arXiv/RFC/CVE/SO/PMID/DOI/…). A recall task's only identifier *is* the opaque id, so there is no coherent "describe it in words" baseline that isn't the answer itself — `described`/`described-framed` are therefore **N/A (skipped)** for recall items and their `name` columns read `-`. Recall items are judged on the **cutoff axis** (does the bare id decode pre- vs post-cutoff?) and against the **`full-content` ceiling**, not against a name baseline. (Earlier builds emitted a broken `described` prompt for these — "recall the paper at this arXiv id" with no id attached — which the models correctly refused, manufacturing a spurious `name≈0`; that data has been removed.)

**Correctness** is 0..1 from an LLM-as-judge; every judge prompt + raw verdict is in [transcript.jsonl.gz](transcript.jsonl.gz) and [dashboard.html](dashboard.html) so each score is checkable.

**Controls.** `fake-structural-url` (plausible but nonexistent, same shape) and `random-url` (unrelated real URL) should collapse toward described / zero — if URL shape or merely having a URL did the work, these would lift too.

**Identifier probes.** Conditions such as `mdn-url-only`, `spec-url-only`, and `bcd-key-only` are exploratory. They are useful for diagnosing which identifiers a model can decode, but the headline lift remains strictly `opaque-url - described`.

**Cutoff granularity.** Content dates are `YYYY-MM` (padded to mid-month); model cutoffs are month-end. An item in the SAME year-month as a model's cutoff is **boundary-ambiguous** — it could fall either side of the training cut — yet is bucketed `pre`. Treat the pre/post split as fuzzy near the boundary.

**Blanks** are always labelled: `— (no items)`, `— (run error)`, `— (judge failed)`, `— (skipped: no key)`, `— (n/a)`.

## Conditions — what identifier each one carries

The single most important thing for reading the numbers: **which conditions give an OPAQUE id (a bare string that does not name the content) vs a DESCRIPTIVE/CANONICAL id (that names or describes the feature).** Only `opaque-url` is opaque; `mdn/spec/bcd` all name the feature to some degree.

| Condition | Identifier opacity | Group | Meaning |
|---|---|---|---|
| `described` | — (no identifier; baseline) | core | task described in words, no URL (baseline) |
| `described-framed` | — (no id; framing-matched baseline for opaque-url) | core | the task DESCRIPTION in the SAME 'do whatever this describes' framing as opaque-url — isolates the framing cost from the identifier (opaque-url − described-framed = pure opaque-id-vs-description) |
| `opaque-url` | OPAQUE — bare id, does NOT name the content | core | only the opaque URL or id; the page is never fetched or pasted |
| `mdn-url-only` | DESCRIPTIVE — MDN path names the API | identifier-probe | only the descriptive documentation URL; this measures URL text hints |
| `spec-url-only` | CANONICAL — spec URL (usually names the feature) | identifier-probe | only the canonical spec URL, when the item has one |
| `bcd-key-only` | CANONICAL, SEMI-DESCRIPTIVE — BCD dotted key often contains the name | identifier-probe | only the Browser Compat Data key, when the item has one |
| `url+described` | OPAQUE id + the task described | context | opaque URL plus the task name |
| `full-content` | — (page pasted + task spelled out; max-info ceiling) | ceiling | the real page content is pasted in ALONG WITH the spelled-out task (max-info ceiling) |
| `content-only` | — (page pasted, NO task; clean ceiling parallel to opaque-url) | ceiling | the real page content is pasted in with NO spelled-out task — same minimal framing as opaque-url, so opaque-url vs content-only isolates pointer-vs-content, and full-content vs content-only isolates the task text's contribution |
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

The single averaged "lift" below is misleading: the effect is **categorical, not continuous** — it depends on WHICH identifier, not how far the content is from the cutoff. Mean `opaque-url` (OPAQUE) correctness across all models, grouped by the kind of opaque id:

| Opaque id type (`opaque-url`) | items | mean opaque-url | mean described |
|---|---|---|---|
| RFC id | 9 | 0.79 | 0.96 |
| CVE id | 8 | 0.73 | 0.81 |
| arXiv id | 20 | 0.55 | 0.71 |
| Stack Overflow # | 8 | 0.26 | 0.75 |
| DOI | 6 | 0.24 | 0.83 |
| GitHub commit SHA | 8 | 0.22 | 0.50 |
| HuggingFace id | 3 | 0.14 | 0.04 |
| PubMed id | 6 | 0.07 | 0.82 |
| control (synthetic, not a real pointer) | 1 | 0.02 | 1.00 |
| ChromeStatus # | 28 | 0.01 | 0.78 |
| caniuse | 1 | 0.00 | 0.08 |

**Read:** a bare OPAQUE id works only when it is a *famous, memorised* id (landmark arXiv / RFC). Opaque numeric ids the model never memorised (ChromeStatus #, un-famous Stack Overflow #) decode to ~0 — even for features the model knows cold by name. The canonical web-id probes (`bcd-key-only`, `spec-url-only`) DO work, but they are semi-descriptive (the BCD key / spec path usually contains the feature name), so that is partly a *hint*, not pure opaque retrieval. See the per-item table below.

## All-models view — mean correctness by condition

Every condition, averaged across ALL models and ALL API-usage items (knowledge-calibration items excluded). The clearest one-look summary:

| condition | identifier | mean (all models) |
|---|---|---|
| `described` | — (no identifier; baseline) | 0.74 |
| `described-framed` | — (no id; framing-matched baseline for opaque-url) | 0.72 |
| `opaque-url` | OPAQUE | 0.31 |
| `mdn-url-only` | DESCRIPTIVE | 0.64 |
| `spec-url-only` | CANONICAL | 0.59 |
| `bcd-key-only` | CANONICAL, SEMI-DESCRIPTIVE | 0.73 |
| `url+described` | OPAQUE id + the task described | 0.74 |
| `full-content` | — (page pasted + task spelled out; max-info ceiling) | 0.94 |
| `content-only` | — (page pasted, NO task; clean ceiling parallel to opaque-url) | 0.82 |
| `fake-structural-url` | CONTROL | 0.12 |
| `fake-opaque-url` | CONTROL | 0.00 |
| `random-url` | CONTROL | 0.00 |

## Controls — is the opaque-url result a framing or shape artifact?

Two controls test whether the `opaque-url` collapse is real or an artifact:

- **Framing.** `described-framed` puts the plain task description in the SAME "do whatever this describes" wording as `opaque-url`. Framing cost = described-framed − described = **-0.01** (≈0): the framing does NOT explain opaque-url's low score. So the **framing-adjusted lift** (opaque-url − described-framed = **-0.41**) equals the raw lift — the opaque id genuinely fails, it is not vaguer instruction.
- **Opaque shape.** `fake-opaque-url` (an OPAQUE-shaped fake id) scores **0.00**, vs `fake-structural-url` **0.12**. An opaque fake steers nothing; the higher fake-structural number is only because that fake is *descriptive* for web items (the fake path still names an API). So opaque URL SHAPE alone does not steer output — only real, memorised content does.

## Per-item identifier reference

Exactly what the `opaque-url` (OPAQUE) id is for each item, and which descriptive/canonical ids it also carries.

| item | contentDate | `opaque-url` (opaque) id | type | spec? | bcd? | CC (/6) |
|---|---|---|---|---|---|---|
| `pmid-7466396-evolution-cooperation` | 1981-03-27 | `pubmed.ncbi.nlm.nih.gov/7466396/` | PubMed id | — | — | 1 (2026-05) |
| `rfc-791-ip` | 1981-09 | `datatracker.ietf.org/doc/rfc791/` | RFC id | — | — | 2 (2025-09) |
| `rfc-1149-avian-carriers` | 1990-04 | `datatracker.ietf.org/doc/rfc1149/` | RFC id | — | — | 1 (2025-12) |
| `rfc-2616-http11` | 1999-05 | `datatracker.ietf.org/doc/rfc2616/` | RFC id | — | — | 0 |
| `pmid-10676951-dlbcl-gene-expression` | 2000-02-03 | `pubmed.ncbi.nlm.nih.gov/10676951/` | PubMed id | — | — | 0 |
| `pmid-11237011-human-genome` | 2001-02-15 | `pubmed.ncbi.nlm.nih.gov/11237011/` | PubMed id | — | — | 1 (2025-12) |
| `doi-human-genome-science` | 2001-02-16 | `doi.org/10.1126/science.1058040` | DOI | — | — | 0 |
| `gh-sha-git-initial-commit` | 2005-04-07 | `github.com/git/git/commit/e83c5163316f89bfbde7d9ab23ca2e25604af290` | GitHub commit SHA | — | — | 1 (2025-12) |
| `gh-sha-linux-initial-git` | 2005-04-16 | `github.com/torvalds/linux/commit/1da177e4c3f41524e886b7f1b8a0c1fc7321cac2` | GitHub commit SHA | — | — | 1 (2025-12) |
| `so-111102-javascript-closures` | 2008-09-21 | `stackoverflow.com/questions/111102` | Stack Overflow # | — | — | 0 |
| `so-178325-jquery-element-hidden` | 2008-10-07 | `stackoverflow.com/questions/178325` | Stack Overflow # | — | — | 0 |
| `so-503093-redirect-webpage` | 2009-02-02 | `stackoverflow.com/questions/503093` | Stack Overflow # | — | — | 0 |
| `so-1335851-use-strict` | 2009-08-26 | `stackoverflow.com/questions/1335851` | Stack Overflow # | — | — | 0 |
| `gh-sha-bitcoin-first-commit` | 2009-08-30 | `github.com/bitcoin/bitcoin/commit/4405b78d6059e536c36974088a8ed4d9f0f29898` | GitHub commit SHA | — | — | 0 |
| `doi-corn-seed-traits-pricing` | 2010-07-19 | `doi.org/10.1093/ajae/aaq063` | DOI | — | — | 0 |
| `so-11227809-branch-prediction` | 2012-06-27 | `stackoverflow.com/questions/11227809` | Stack Overflow # | — | — | 0 |
| `arxiv-word2vec` | 2013-01-16 | `arxiv.org/abs/1301.3781` | arXiv id | — | — | 1 (2026-02) |
| `js-promise` | 2014-01 | `stackoverflow.com/questions/30564053` | control (synthetic, not a real pointer) | Y | Y | 0 |
| `cve-2014-0160-heartbleed` | 2014-04-07 | `nvd.nist.gov/vuln/detail/CVE-2014-0160` | CVE id | — | — | 3 (2025-09) |
| `arxiv-gan` | 2014-06-10 | `arxiv.org/abs/1406.2661` | arXiv id | — | — | 2 (2025-06) |
| `arxiv-vgg` | 2014-09-04 | `arxiv.org/abs/1409.1556` | arXiv id | — | — | 1 (2026-04) |
| `arxiv-adam` | 2014-12-22 | `arxiv.org/abs/1412.6980` | arXiv id | — | — | 1 (2026-05) |
| `service-worker` | 2015-01 | `www.chromestatus.com/feature/6561526227927040` | ChromeStatus # | Y | Y | 0 |
| `pmid-25592156-hydrogel-immunoprotection` | 2015-02-09 | `pubmed.ncbi.nlm.nih.gov/25592156/` | PubMed id | — | — | 0 |
| `fetch-api` | 2015-03 | `chromestatus.com/feature/6730533392351232` | ChromeStatus # | Y | Y | 1 (2026-04) |
| `arxiv-knowledge-distillation` | 2015-03-09 | `arxiv.org/abs/1503.02531` | arXiv id | — | — | 0 |
| `arxiv-unet` | 2015-05-18 | `arxiv.org/abs/1505.04597` | arXiv id | — | — | 1 (2026-04) |
| `doi-deep-learning-nature-review` | 2015-05-27 | `doi.org/10.1038/nature14539` | DOI | — | — | 0 |
| `arxiv-resnet` | 2015-12-10 | `arxiv.org/abs/1512.03385` | arXiv id | — | — | 2 (2026-04) |
| `intersection-observer` | 2016-05 | `chromestatus.com/feature/5695342691483648` | ChromeStatus # | Y | Y | 0 |
| `async-await` | 2016-10 | `chromestatus.com/feature/5643236399906816` | ChromeStatus # | Y | Y | 0 |
| `arxiv-pate` | 2016-10-18 | `arxiv.org/abs/1610.05755` | arXiv id | — | — | 1 (2025-09) |
| `css-grid` | 2017-03 | `chromestatus.com/feature/4589636412243968` | ChromeStatus # | Y | Y | 1 (2025-06) |
| `cve-2017-0144-eternalblue` | 2017-03-17 | `nvd.nist.gov/vuln/detail/CVE-2017-0144` | CVE id | — | — | 1 (2026-04) |
| `arxiv-attention` | 2017-06 | `arxiv.org/abs/1706.03762` | arXiv id | — | — | 3 (2025-06) |
| `arxiv-ppo` | 2017-07-20 | `arxiv.org/abs/1707.06347` | arXiv id | — | — | 0 |
| `pmid-28778026-deep-learning-medical-survey` | 2017-12 | `pubmed.ncbi.nlm.nih.gov/28778026/` | PubMed id | — | — | 0 |
| `rfc-8259-json` | 2017-12 | `datatracker.ietf.org/doc/rfc8259/` | RFC id | — | — | 0 |
| `cve-2018-7600-drupalgeddon2` | 2018-03-29 | `nvd.nist.gov/vuln/detail/CVE-2018-7600` | CVE id | — | — | 1 (2025-12) |
| `arxiv-bert` | 2018-10-11 | `arxiv.org/abs/1810.04805` | arXiv id | — | — | 1 (2025-06) |
| `cve-2019-0708-bluekeep` | 2019-05-16 | `nvd.nist.gov/vuln/detail/CVE-2019-0708` | CVE id | — | — | 1 (2026-04) |
| `doi-optuna-kdd` | 2019-07-25 | `doi.org/10.1145/3292500.3330701` | DOI | — | — | 1 (2026-02) |
| `arxiv-gpt3` | 2020-05-28 | `arxiv.org/abs/2005.14165` | arXiv id | — | — | 1 (2025-09) |
| `gh-sha-obscure-slugify-empty-separator` | 2020-07-18 | `github.com/sindresorhus/slugify/commit/d7bf7cc06c63676b273fa496340f4a85a64d7fe8` | GitHub commit SHA | — | — | — |
| `doi-alphafold-nature` | 2021-07-15 | `doi.org/10.1038/s41586-021-03819-2` | DOI | — | — | 0 |
| `cve-2021-44228-log4shell` | 2021-12-10 | `nvd.nist.gov/vuln/detail/CVE-2021-44228` | CVE id | — | — | 3 (2026-02) |
| `rfc-9110-http-semantics` | 2022-06 | `datatracker.ietf.org/doc/rfc9110/` | RFC id | — | — | 1 (2025-12) |
| `rfc-9114-http3` | 2022-06 | `datatracker.ietf.org/doc/rfc9114/` | RFC id | — | — | 1 (2026-02) |
| `rfc-9293-tcp` | 2022-08 | `datatracker.ietf.org/doc/rfc9293/` | RFC id | — | — | 2 (2026-02) |
| `fedcm` | 2022-12 | `chromestatus.com/feature/6438627087220736` | ChromeStatus # | Y | Y | 1 (2026-04) |
| `view-transitions` | 2023-03 | `chromestatus.com/feature/5193009714954240` | ChromeStatus # | Y | Y | 2 (2025-06) |
| `arxiv-mamba` | 2023-12 | `arxiv.org/abs/2312.00752` | arXiv id | — | — | 1 (2026-05) |
| `so-78084814-coredump-file-mapping` | 2024-02-29 | `stackoverflow.com/questions/78084814` | Stack Overflow # | — | — | 0 |
| `cve-2024-3094-xz-backdoor` | 2024-03-29 | `nvd.nist.gov/vuln/detail/CVE-2024-3094` | CVE id | — | — | 1 (2026-02) |
| `popover-api` | 2024-04 | `chromestatus.com/feature/5463833265045504` | ChromeStatus # | Y | Y | 2 (2025-09) |
| `css-anchor-positioning` | 2024-08 | `chromestatus.com/feature/5124922471874560` | ChromeStatus # | Y | Y | 1 (2025-12) |
| `view-transitions-cross-doc` | 2024-09 | `chromestatus.com/feature/5118874666663936` | ChromeStatus # | Y | Y | 3 (2025-09) |
| `arxiv-deepseek-r1` | 2025-01 | `arxiv.org/abs/2501.12948` | arXiv id | — | — | 0 |
| `rfc-9700-oauth-security-bcp` | 2025-01 | `datatracker.ietf.org/doc/rfc9700/` | RFC id | — | — | 0 |
| `rfc-9701-jwt-oauth-introspection` | 2025-01 | `datatracker.ietf.org/doc/rfc9701/` | RFC id | — | — | 0 |
| `css-scroll-state-container-queries` | 2025-02 | `chromestatus.com/feature/5072263730167808` | ChromeStatus # | Y | Y | 0 |
| `arxiv-gemma-3` | 2025-03 | `arxiv.org/abs/2503.19786` | arXiv id | — | — | 2 (2025-06) |
| `customizable-select` | 2025-03 | `chromestatus.com/feature/5737365999976448` | ChromeStatus # | Y | Y | 1 (2025-12) |
| `css-shape-function` | 2025-04 | `chromestatus.com/feature/5172258539307008` | ChromeStatus # | Y | Y | 2 (2025-06) |
| `translator-api` | 2025-06 | `chromestatus.com/feature/5172811302961152` | ChromeStatus # | Y | Y | 3 (2025-06) |
| `language-detector-api` | 2025-06 | `chromestatus.com/feature/6494349985841152` | ChromeStatus # | Y | Y | 2 (2025-09) |
| `arxiv-kimi-k2` | 2025-07 | `arxiv.org/abs/2507.20534` | arXiv id | — | — | 1 (2026-04) |
| `corner-shape-squircle` | 2025-08 | `chromestatus.com/feature/5357329815699456` | ChromeStatus # | Y | Y | 1 (2026-05) |
| `uint8array-base64-hex` | 2025-09 | `chromestatus.com/feature/6281131254874112` | ChromeStatus # | Y | Y | 0 |
| `gh-sha-obscure-slugify-transliterate` | 2025-09-11 | `github.com/sindresorhus/slugify/commit/dc4b4457aa476c7fa04e467761d19d4eb6cd1cba` | GitHub commit SHA | — | — | — |
| `arxiv-gpt5-system-card` | 2025-12 | `arxiv.org/abs/2601.03267` | arXiv id | — | — | 0 |
| `temporal-api` | 2026-01 | `chromestatus.com/feature/5668291307634688` | ChromeStatus # | Y | Y | 1 (2025-06) |
| `gh-sha-obscure-execa-prototype-pollution` | 2026-01-29 | `github.com/sindresorhus/execa/commit/f3a2e8481a1e9138de3895827895c834078b9456` | GitHub commit SHA | — | — | — |
| `scroll-triggered-animations` | 2026-02 | `chromestatus.com/feature/5181996801982464` | ChromeStatus # | Y | Y | 1 (2026-04) |
| `html-in-canvas` | 2026-02 | `chromestatus.com/feature/5114053285249024` | ChromeStatus # | Y | — | 0 |
| `text-justify-css-property` | 2026-02 | `chromestatus.com/feature/5079678972985344` | ChromeStatus # | Y | Y | 0 |
| `so-79886234-java25-file-exists` | 2026-02-10 | `stackoverflow.com/questions/79886234` | Stack Overflow # | — | — | 0 |
| `so-79890462-reinterpret-cast-structs` | 2026-02-16 | `stackoverflow.com/questions/79890462` | Stack Overflow # | — | — | 0 |
| `cve-2026-25000-wheel-of-life` | 2026-02-19 | `nvd.nist.gov/vuln/detail/CVE-2026-25000` | CVE id | — | — | 0 |
| `hf-qwen3-5-4b` | 2026-02-27 | `huggingface.co/Qwen/Qwen3.5-4B` | HuggingFace id | — | — | 0 |
| `css-text-indent-hanging` | 2026-03 | `chromestatus.com/feature/5084062739988480` | ChromeStatus # | Y | Y | 0 |
| `named-feature-supports` | 2026-03 | `chromestatus.com/feature/5153932394102784` | ChromeStatus # | Y | — | 0 |
| `cve-2026-3000-idexpert-rce` | 2026-03-02 | `nvd.nist.gov/vuln/detail/CVE-2026-3000` | CVE id | — | — | 1 (2026-04) |
| `hf-gemma-4-26b-a4b-it` | 2026-03-11 | `huggingface.co/google/gemma-4-26B-A4B-it` | HuggingFace id | — | — | 1 (2026-04) |
| `element-scoped-view-transitions` | 2026-04 | `chromestatus.com/feature/5109852273377280` | ChromeStatus # | Y | Y | 1 (2026-04) |
| `math-sumprecise` | 2026-04 | `chromestatus.com/feature/4790090146643968` | ChromeStatus # | Y | Y | 1 (2026-04) |
| `gamepad-event-driven-input` | 2026-04 | `chromestatus.com/feature/5989275208253440` | ChromeStatus # | — | — | 0 |
| `doi-biorxiv-endomesoderm-grn` | 2026-04-01 | `doi.org/10.64898/2026.03.31.715602` | DOI | — | — | 0 |
| `gh-sha-obscure-ky-searchparams` | 2026-04-21 | `github.com/sindresorhus/ky/commit/add0703b7ea2e20f5afe16ab5d9507a16e275f20` | GitHub commit SHA | — | — | — |
| `hf-qwen3-6-27b` | 2026-04-21 | `huggingface.co/Qwen/Qwen3.6-27B` | HuggingFace id | — | — | 1 (2026-05) |
| `arxiv-future-fake-real-id` | 2026-05 | `arxiv.org/abs/2605.04567` | arXiv id | — | — | 0 |
| `prompt-api-shape` | 2026-05 | `chromestatus.com/feature/5134603979063296` | ChromeStatus # | Y | Y | 0 |
| `text-decoration-skip-ink-all` | 2026-05 | `chromestatus.com/feature/5077600085082112` | ChromeStatus # | Y | Y | 1 (2026-05) |
| `pmid-42224782-crispr-echinococcus` | 2026-05-25 | `pubmed.ncbi.nlm.nih.gov/42224782/` | PubMed id | — | — | 0 |
| `baseline-has-status` | 2026-06 | `caniuse.com/css-has` | caniuse | Y | Y | 3 (2025-09) |
| `css-gap-decorations` | 2026-06 | `chromestatus.com/feature/5157805733183488` | ChromeStatus # | Y | Y | 2 (2025-06) |
| `css-image-color-function` | 2026-06 | `chromestatus.com/feature/5121011285622784` | ChromeStatus # | Y | Y | 0 |
| `arxiv-diffusiongemma-transparency` | 2026-06-18 | `arxiv.org/abs/2606.20560` | arXiv id | — | — | 0 |
| `arxiv-lie-algebra-attention` | 2026-06-18 | `arxiv.org/abs/2606.20547` | arXiv id | — | — | 0 |
| `arxiv-multitask-bayesian-icl` | 2026-06-18 | `arxiv.org/abs/2606.20538` | arXiv id | — | — | 0 |
| `gh-sha-obscure-hono-bun-native` | 2026-06-18 | `github.com/honojs/hono/commit/d29982cc40c3babb417db625ab0671d982398646` | GitHub commit SHA | — | — | — |

*CC = number of Common Crawl monthly snapshots (of 6 checked, 2025-06 .. 2026-05) that captured the opaque URL; first-seen month in parens. `0` = absent from all (e.g. StackOverflow blocks the crawler); `—` = item has no opaque URL. CC presence is a noisy, incomplete training-inclusion covariate — a URL absent here may still be in training via other routes, and presence does not guarantee recall.*

### Opaque-URL recall vs Common Crawl presence

| CC presence | items | mean `opaque-url` (opaque) correctness |
|---|---|---|
| present in ≥1 crawl | 50 | 0.46 |
| absent from all crawls | 43 | 0.18 |

Present-in-CC items decode higher on average, but the gap is **confounded with fame** (famous URLs are both more crawled and more memorised) and the signal is noisy: e.g. StackOverflow URLs are absent from CC (the crawler is blocked) yet still partially decode, while many ChromeStatus URLs are present in CC yet decode ~0. Treat CC as one weak covariate, not the mechanism — repetition/fame across all routes is.

### Common Crawl presence does NOT predict decoding

| opaque id type | pages in Common Crawl | mean `opaque-url` decode |
|---|---|---|
| ChromeStatus feature URLs | 17/28 | 0.01 |
| arXiv ids | 13/20 | 0.55 |

Among the 50 CC-present items, **22 decode ≥0.50 and 26 decode <0.20** — so being in Common Crawl does not predict whether the bare id decodes.

ChromeStatus pages are crawled at a **comparable** rate to the arXiv papers that decode near-perfectly (see the table), yet they recover ~0. The page being on the web is not the mechanism. What matters is whether the exact id STRING was written next to its content in prose: arXiv ids are cited that way constantly, while ChromeStatus feature numbers essentially never are (the number only appears ON the page, not in citations). The operative variable is **citation co-occurrence of id and content**, not page presence — which also predicts the two gates a URL must pass to act as context: (1) be a citation-style id humans write in text, and (2) name content seen often enough to be memorised.

## Per-item results — described vs opaque vs canonical id

Mean correctness across all models, by item (sorted by date). `opaque` = `opaque-url`. Watch the **opaque** column collapse to ~0 except for famous arXiv/RFC ids, while **bcd/spec/mdn** (which name the feature) track `name`. Blank = n/a or no data.

| item | opaque id type | name | opaque | mdn | spec | bcd | full |
|---|---|---|---|---|---|---|---|
| `pmid-7466396-evolution-cooperation` | PubMed id | 1.00 | 0.00 |   -   |   -   |   -   | 1.00 |
| `rfc-791-ip` | RFC id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `rfc-1149-avian-carriers` | RFC id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `rfc-2616-http11` | RFC id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `pmid-10676951-dlbcl-gene-expression` | PubMed id | 1.00 | 0.00 |   -   |   -   |   -   | 1.00 |
| `pmid-11237011-human-genome` | PubMed id | 1.00 | 0.45 |   -   |   -   |   -   | 1.00 |
| `doi-human-genome-science` | DOI | 1.00 | 0.38 |   -   |   -   |   -   | 1.00 |
| `gh-sha-git-initial-commit` | GitHub commit SHA | 0.86 | 0.85 |   -   |   -   |   -   | 0.97 |
| `gh-sha-linux-initial-git` | GitHub commit SHA | 1.00 | 0.95 |   -   |   -   |   -   | 1.00 |
| `so-111102-javascript-closures` | Stack Overflow # | 0.95 | 0.15 |   -   |   -   |   -   | 1.00 |
| `so-178325-jquery-element-hidden` | Stack Overflow # | 0.99 | 0.00 |   -   |   -   |   -   | 0.75 |
| `so-503093-redirect-webpage` | Stack Overflow # | 0.92 | 0.77 |   -   |   -   |   -   | 0.98 |
| `so-1335851-use-strict` | Stack Overflow # | 1.00 | 0.31 |   -   |   -   |   -   | 0.97 |
| `gh-sha-bitcoin-first-commit` | GitHub commit SHA | 0.77 | 0.00 |   -   |   -   |   -   | 0.94 |
| `doi-corn-seed-traits-pricing` | DOI | 0.92 | 0.00 |   -   |   -   |   -   | 0.67 |
| `so-11227809-branch-prediction` | Stack Overflow # | 0.97 | 0.85 |   -   |   -   |   -   | 1.00 |
| `arxiv-word2vec` | arXiv id | 1.00 | 0.84 |   -   |   -   |   -   | 0.98 |
| `js-promise` | control (synthetic, not a real pointer) | 1.00 | 0.02 | 1.00 | 0.53 | 1.00 | 1.00 |
| `cve-2014-0160-heartbleed` | CVE id | 1.00 | 0.92 |   -   |   -   |   -   | 1.00 |
| `arxiv-gan` | arXiv id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `arxiv-vgg` | arXiv id | 1.00 | 0.92 |   -   |   -   |   -   | 1.00 |
| `arxiv-adam` | arXiv id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `service-worker` | ChromeStatus # | 1.00 | 0.00 | 0.97 | 0.95 | 0.74 | 1.00 |
| `pmid-25592156-hydrogel-immunoprotection` | PubMed id | 0.79 | 0.00 |   -   |   -   |   -   | 0.96 |
| `fetch-api` | ChromeStatus # | 0.96 | 0.00 | 0.95 | 0.61 | 1.00 | 0.98 |
| `arxiv-knowledge-distillation` | arXiv id | 1.00 | 0.69 |   -   |   -   |   -   | 1.00 |
| `arxiv-unet` | arXiv id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `doi-deep-learning-nature-review` | DOI | 1.00 | 0.23 |   -   |   -   |   -   | 1.00 |
| `arxiv-resnet` | arXiv id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `intersection-observer` | ChromeStatus # | 1.00 | 0.00 | 0.99 | 1.00 | 0.99 | 0.99 |
| `async-await` | ChromeStatus # | 0.88 | 0.07 | 0.80 | 0.55 | 0.86 | 0.65 |
| `arxiv-pate` | arXiv id | 1.00 | 0.08 |   -   |   -   |   -   | 1.00 |
| `css-grid` | ChromeStatus # | 1.00 | 0.00 | 0.92 | 0.91 | 0.85 | 1.00 |
| `cve-2017-0144-eternalblue` | CVE id | 1.00 | 1.00 |   -   |   -   |   -   | 0.99 |
| `arxiv-attention` | arXiv id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `arxiv-ppo` | arXiv id | 1.00 | 0.77 |   -   |   -   |   -   | 1.00 |
| `pmid-28778026-deep-learning-medical-survey` | PubMed id | 1.00 | 0.00 |   -   |   -   |   -   | 1.00 |
| `rfc-8259-json` | RFC id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `cve-2018-7600-drupalgeddon2` | CVE id | 1.00 | 0.95 |   -   |   -   |   -   | 1.00 |
| `arxiv-bert` | arXiv id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `cve-2019-0708-bluekeep` | CVE id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `doi-optuna-kdd` | DOI | 1.00 | 0.00 |   -   |   -   |   -   | 1.00 |
| `arxiv-gpt3` | arXiv id | 1.00 | 0.92 |   -   |   -   |   -   | 1.00 |
| `gh-sha-obscure-slugify-empty-separator` | GitHub commit SHA | 0.68 | 0.00 |   -   |   -   |   -   | 1.00 |
| `doi-alphafold-nature` | DOI | 1.00 | 0.82 |   -   |   -   |   -   | 1.00 |
| `cve-2021-44228-log4shell` | CVE id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `rfc-9110-http-semantics` | RFC id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `rfc-9114-http3` | RFC id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `rfc-9293-tcp` | RFC id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `fedcm` | ChromeStatus # | 1.00 | 0.00 | 0.87 | 0.95 | 1.00 | 1.00 |
| `view-transitions` | ChromeStatus # | 0.98 | 0.08 | 0.94 | 0.90 | 0.97 | 0.90 |
| `arxiv-mamba` | arXiv id | 1.00 | 0.46 |   -   |   -   |   -   | 1.00 |
| `so-78084814-coredump-file-mapping` | Stack Overflow # | 0.54 | 0.00 |   -   |   -   |   -   | 1.00 |
| `cve-2024-3094-xz-backdoor` | CVE id | 1.00 | 1.00 |   -   |   -   |   -   | 1.00 |
| `popover-api` | ChromeStatus # | 0.96 | 0.15 | 0.97 | 0.92 | 0.95 | 0.92 |
| `css-anchor-positioning` | ChromeStatus # | 0.98 | 0.08 | 0.93 | 0.81 | 0.94 | 0.97 |
| `view-transitions-cross-doc` | ChromeStatus # | 0.96 | 0.00 | 0.88 | 0.77 | 0.89 | 0.91 |
| `arxiv-deepseek-r1` | arXiv id | 0.77 | 0.28 |   -   |   -   |   -   | 1.00 |
| `rfc-9700-oauth-security-bcp` | RFC id | 0.91 | 0.15 |   -   |   -   |   -   | 1.00 |
| `rfc-9701-jwt-oauth-introspection` | RFC id | 0.75 | 0.00 |   -   |   -   |   -   | 1.00 |
| `css-scroll-state-container-queries` | ChromeStatus # | 0.80 | 0.00 | 0.00 | 0.55 | 0.58 | 0.90 |
| `arxiv-gemma-3` | arXiv id | 0.29 | 0.00 |   -   |   -   |   -   | 0.99 |
| `customizable-select` | ChromeStatus # | 0.77 | 0.00 | 0.38 | 0.25 | 0.47 | 0.87 |
| `css-shape-function` | ChromeStatus # | 0.67 | 0.00 | 0.54 | 0.21 | 0.72 | 0.88 |
| `translator-api` | ChromeStatus # | 0.34 | 0.00 | 0.35 | 0.42 | 0.60 | 0.87 |
| `language-detector-api` | ChromeStatus # | 0.47 | 0.00 | 0.49 | 0.32 | 0.67 | 0.96 |
| `arxiv-kimi-k2` | arXiv id | 0.09 | 0.00 |   -   |   -   |   -   | 1.00 |
| `corner-shape-squircle` | ChromeStatus # | 0.68 | 0.00 | 0.36 | 0.20 | 0.37 | 1.00 |
| `uint8array-base64-hex` | ChromeStatus # | 1.00 | 0.00 | 0.53 | 0.43 | 0.40 | 1.00 |
| `gh-sha-obscure-slugify-transliterate` | GitHub commit SHA | 0.15 | 0.00 |   -   |   -   |   -   | 1.00 |
| `arxiv-gpt5-system-card` | arXiv id | 0.00 | 0.00 |   -   |   -   |   -   | 1.00 |
| `temporal-api` | ChromeStatus # | 0.93 | 0.00 | 0.92 | 0.93 | 0.97 | 1.00 |
| `gh-sha-obscure-execa-prototype-pollution` | GitHub commit SHA | 0.10 | 0.00 |   -   |   -   |   -   | 1.00 |
| `text-justify-css-property` | ChromeStatus # | 0.97 | 0.00 | 1.00 | 0.97 | 1.00 | 0.99 |
| `so-79886234-java25-file-exists` | Stack Overflow # | 0.13 | 0.00 |   -   |   -   |   -   | 1.00 |
| `so-79890462-reinterpret-cast-structs` | Stack Overflow # | 0.46 | 0.00 |   -   |   -   |   -   | 1.00 |
| `cve-2026-25000-wheel-of-life` | CVE id | 0.34 | 0.00 |   -   |   -   |   -   | 1.00 |
| `hf-qwen3-5-4b` | HuggingFace id | 0.00 | 0.18 |   -   |   -   |   -   | 0.68 |
| `css-text-indent-hanging` | ChromeStatus # | 0.88 | 0.00 | 0.77 | 0.78 | 0.73 | 1.00 |
| `named-feature-supports` | ChromeStatus # | 0.20 | 0.00 | 0.00 | 0.00 |   -   | 0.95 |
| `cve-2026-3000-idexpert-rce` | CVE id | 0.17 | 0.00 |   -   |   -   |   -   | 1.00 |
| `hf-gemma-4-26b-a4b-it` | HuggingFace id | 0.11 | 0.15 |   -   |   -   |   -   | 0.58 |
| `element-scoped-view-transitions` | ChromeStatus # | 0.75 | 0.00 |   -   | 0.53 | 0.85 | 0.95 |
| `math-sumprecise` | ChromeStatus # | 0.77 | 0.00 | 0.48 | 0.47 | 0.82 | 0.93 |
| `gamepad-event-driven-input` | ChromeStatus # | 0.00 | 0.00 | 0.00 |   -   |   -   | 0.00 |
| `doi-biorxiv-endomesoderm-grn` | DOI | 0.07 | 0.00 |   -   |   -   |   -   | 0.18 |
| `gh-sha-obscure-ky-searchparams` | GitHub commit SHA | 0.08 | 0.00 |   -   |   -   |   -   | 1.00 |
| `hf-qwen3-6-27b` | HuggingFace id | 0.00 | 0.09 |   -   |   -   |   -   | 0.72 |
| `prompt-api-shape` | ChromeStatus # | 0.15 | 0.00 |   -   | 0.38 | 0.40 | 0.84 |
| `text-decoration-skip-ink-all` | ChromeStatus # | 0.92 | 0.00 | 0.73 | 0.92 | 0.95 | 1.00 |
| `pmid-42224782-crispr-echinococcus` | PubMed id | 0.15 | 0.00 |   -   |   -   |   -   | 1.00 |
| `baseline-has-status` | caniuse | 0.08 | 0.00 | 0.00 | 0.00 | 0.00 | 0.04 |
| `css-gap-decorations` | ChromeStatus # | 0.75 | 0.00 |   -   | 0.53 | 0.53 | 0.88 |
| `css-image-color-function` | ChromeStatus # | 0.96 | 0.00 | 0.36 | 0.33 | 0.10 | 0.97 |
| `arxiv-diffusiongemma-transparency` | arXiv id | 0.00 | 0.00 |   -   |   -   |   -   | 1.00 |
| `arxiv-lie-algebra-attention` | arXiv id | 0.00 | 0.00 |   -   |   -   |   -   | 1.00 |
| `arxiv-multitask-bayesian-icl` | arXiv id | 0.00 | 0.00 |   -   |   -   |   -   | 1.00 |
| `gh-sha-obscure-hono-bun-native` | GitHub commit SHA | 0.33 | 0.00 |   -   |   -   |   -   | 1.00 |

## Worked judge examples — how cells were scored

A few representative cells with the judge's one-line verdict. The judge's FULL prompt + raw response for EVERY cell is in the run data linked at the bottom (and clickable in the dashboard).

- **arxiv-attention / opaque-url** (opaque arXiv id) — mean 1.00; judge on `claude-opus-4-6`: _"The output correctly identifies the paper as 'Attention Is All You Need' by Vaswani et al., accurately describes the Transformer architecture based on self-attention without recurrence/convolution, an"_ (score 1.00)
- **rfc-9110-http-semantics / opaque-url** (opaque RFC id) — mean 1.00; judge on `claude-opus-4-6`: _"The output accurately recalls RFC 9110 as HTTP Semantics (June 2022), correctly identifies it obsoletes RFC 7230-7235, and comprehensively covers methods, status codes, header fields, and message sema"_ (score 1.00)
- **css-anchor-positioning / opaque-url** (opaque ChromeStatus #) — mean 0.08; judge on `claude-opus-4-6`: _"The model output describes the Document Picture-in-Picture API instead of CSS Anchor Positioning API, completely missing anchor-name, position-anchor, anchor(), and position-area."_ (score 0.00)
- **fetch-api / bcd-key-only** (BCD key) — mean 1.00; judge on `claude-opus-4-6`: _"The model output contains all required identifiers (fetch(), .json(), Response, await) and correctly demonstrates fetching a URL, checking response.ok, and parsing JSON using both Promise and async/aw"_ (score 1.00)
- **fetch-api / opaque-url** (opaque ChromeStatus #) — mean 0.00; judge on `claude-opus-4-6`: _"The model output completely ignores the task and instead provides code for the Compute Pressure API rather than demonstrating fetch() with JSON parsing."_ (score 0.00)
- **css-gap-decorations / bcd-key-only** (BCD key) — mean 0.53; judge on `claude-opus-4-6`: _"The model correctly demonstrates row-rule and its longhands (row-rule-width, row-rule-style, row-rule-color) but misses column-rule which is also part of CSS gap decorations and sets gap:0 instead of "_ (score 0.85)

## Run data — inspect every cell

- **[dashboard.html](dashboard.html)** — interactive: filter by model / condition / cutoff / pass-fail, and CLICK any cell to read the exact prompt, the model output, and the **judge's full prompt + raw verdict + reasoning**. (Live: https://paulkinlan.github.io/url-influence/ )
- **RUNLOG.md** — a human-browsable mirror of the transcript (every prompt, output, judge prompt + raw verdict); too large to commit, regenerate locally with `npm run transcript`.
- **[transcript.jsonl.gz](transcript.jsonl.gz)** — one gzipped JSON line per cell with everything, machine-readable. This is the committed full run data; `results/raw/` is the gitignored intermediate it is built from.

## Averaged lift table (context — see the per-item finding above)

_This averages a sharply bimodal, item-specific signal, so a single "lift −0.5" hides the categorical pattern. Use the per-item tables above for the real result; this section is kept for continuity._

`LIFT = mean(opaque-url) − mean(described)` over API-usage items whose opaque URL is intended to be a real pointer. Knowledge-calibration items and intentional opaque structural controls are excluded. `n pre/post` = eligible API-usage items each side of this model's cutoff.

| Model | cutoff | overall lift | pre-cutoff lift | post-cutoff lift | n pre/post |
|---|---|---|---|---|---|
| Claude Opus 4.8 | 2026-01-31 | -0.78 | -0.99 | -0.48 | 18/12 |
| Claude Sonnet 4.6 | 2026-01-31 | -0.79 | -0.94 | -0.57 | 18/12 |
| Claude Opus 4.6 | 2025-08-31 | -0.79 | -0.86 | -0.71 | 16/14 |
| Claude Sonnet 4.5 | 2025-07-31 | -0.68 | -0.86 | -0.51 | 15/15 |
| Gemini 3.1 Pro | 2025-01-31 | -0.62 | -1.00 | -0.43 | 10/20 |
| Gemini 3.5 Flash | 2025-01-31 | -0.45 | -0.99 | -0.19 | 10/20 |
| GPT-5.5 | 2025-12-01 | -0.76 | -0.86 | -0.64 | 17/13 |
| GPT-5.2 | 2025-08-31 | -0.78 | -0.89 | -0.65 | 16/14 |
| GPT-5 | 2024-09-30 | -0.54 | -0.98 | -0.31 | 10/20 |
| Grok 4.3 | 2025-12-31 | -0.71 | -0.86 | -0.52 | 17/13 |
| Grok 4 | 2024-11-30 | -0.71 | -0.91 | -0.62 | 10/20 |
| GLM-5.2 | 2025-10-31 | -0.72 | -0.86 | -0.54 | 17/13 |
| GLM-5.1 | 2025-10-31 | -0.66 | -0.69 | -0.62 | 17/13 |

## Real opaque API-usage items: pre/post mean correctness per condition

Knowledge-calibration items and intentional opaque structural controls excluded. In **pre** rows, does `opaque-url` approach `described`? In **post** rows, it should not beat `described`; controls stay flat.

### Claude Opus 4.8 (cutoff 2026-01-31) — 18 pre / 12 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.99 | 0.98 | 0.00 | 0.92 | 0.88 | 0.98 | 0.99 | 0.98 | 0.92 | 0.65 | 0.00 | 0.00 |
| post-cutoff | 0.65 | 0.63 | 0.17 | 0.66 | 0.82 | 0.89 | 0.72 | 0.70 | 0.60 | 0.37 | 0.17 | 0.08 |

### Claude Sonnet 4.6 (cutoff 2026-01-31) — 18 pre / 12 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.94 | 0.86 | 0.00 | 0.84 | 0.74 | 0.94 | 0.88 | 0.97 | 0.83 | 0.41 | 0.00 | 0.00 |
| post-cutoff | 0.57 | 0.67 | 0.00 | 0.71 | 0.80 | 0.78 | 0.66 | 0.75 | 0.53 | 0.32 | 0.17 | 0.00 |

### Claude Opus 4.6 (cutoff 2025-08-31) — 16 pre / 14 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.86 | 0.86 | 0.00 | 0.80 | 0.63 | 0.98 | 0.84 | 0.97 | 0.83 | 0.62 | 0.00 | 0.00 |
| post-cutoff | 0.71 | 0.63 | 0.00 | 0.73 | 0.63 | 0.70 | 0.66 | 0.76 | 0.55 | 0.46 | 0.14 | 0.00 |

### Claude Sonnet 4.5 (cutoff 2025-07-31) — 15 pre / 15 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.86 | 0.83 | 0.00 | 0.69 | 0.70 | 0.79 | 0.83 | 0.91 | 0.93 | 0.35 | 0.00 | 0.00 |
| post-cutoff | 0.57 | 0.37 | 0.07 | 0.42 | 0.51 | 0.64 | 0.60 | 0.70 | 0.58 | 0.26 | 0.13 | 0.00 |

### Gemini 3.1 Pro (cutoff 2025-01-31) — 10 pre / 20 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 1.00 | 0.97 | 0.00 | 0.91 | 0.76 | 0.93 | 0.80 | 0.86 | 0.63 | 0.49 | 0.00 | 0.00 |
| post-cutoff | 0.53 | 0.46 | 0.10 | 0.27 | 0.35 | 0.54 | 0.56 | 0.78 | 0.33 | 0.31 | 0.10 | 0.00 |

### Gemini 3.5 Flash (cutoff 2025-01-31) — 10 pre / 20 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.99 | 0.98 | 0.00 | 0.59 | 0.48 | 0.96 | 0.85 | 0.88 | 0.71 | 0.26 | 0.00 | 0.00 |
| post-cutoff | 0.29 | 0.42 | 0.10 | 0.25 | 0.20 | 0.45 | 0.47 | 0.75 | 0.37 | 0.15 | 0.10 | 0.00 |

### GPT-5.5 (cutoff 2025-12-01) — 17 pre / 13 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.98 | 0.98 | 0.12 | 0.87 | 0.88 | 0.90 | 0.96 | 0.98 | 0.84 | 0.43 | 0.00 | 0.00 |
| post-cutoff | 0.79 | 0.70 | 0.15 | 0.63 | 0.74 | 0.72 | 0.79 | 0.78 | 0.75 | 0.23 | 0.15 | 0.00 |

### GPT-5.2 (cutoff 2025-08-31) — 16 pre / 14 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.89 | 0.86 | 0.00 | 0.60 | 0.56 | 0.75 | 0.70 | 0.97 | 0.85 | 0.18 | 0.00 | 0.00 |
| post-cutoff | 0.80 | 0.58 | 0.14 | 0.28 | 0.41 | 0.52 | 0.71 | 0.76 | 0.70 | 0.18 | 0.14 | 0.00 |

### GPT-5 (cutoff 2024-09-30) — 10 pre / 20 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.98 | 0.94 | 0.00 | 0.98 | 0.83 | 0.85 | 0.88 | 0.89 | 0.85 | 0.20 | 0.00 | 0.00 |
| post-cutoff | 0.41 | 0.46 | 0.10 | 0.30 | 0.37 | 0.38 | 0.51 | 0.78 | 0.76 | 0.20 | 0.10 | 0.00 |

### Grok 4.3 (cutoff 2025-12-31) — 17 pre / 13 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.89 | 0.89 | 0.02 | 0.75 | 0.59 | 0.65 | 0.86 | 0.93 | 0.73 | 0.06 | 0.00 | 0.00 |
| post-cutoff | 0.67 | 0.68 | 0.15 | 0.29 | 0.49 | 0.70 | 0.78 | 0.77 | 0.42 | 0.21 | 0.15 | 0.00 |

### Grok 4 (cutoff 2024-11-30) — 10 pre / 20 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.91 | 0.88 | 0.00 | 0.98 | 0.88 | 0.77 | 0.92 | 0.94 | 0.81 | 0.00 | 0.00 | 0.00 |
| post-cutoff | 0.67 | 0.64 | 0.05 | 0.38 | 0.48 | 0.53 | 0.74 | 0.78 | 0.43 | 0.16 | 0.10 | 0.00 |

### GLM-5.2 (cutoff 2025-10-31) — 17 pre / 13 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.86 | 0.76 | 0.00 | 0.71 | 0.66 | 0.82 | 0.91 | 0.97 | 0.78 | 0.33 | 0.00 | 0.00 |
| post-cutoff | 0.69 | 0.78 | 0.15 | 0.65 | 0.80 | 0.99 | 0.85 | 0.81 | 0.61 | 0.52 | 0.15 | 0.00 |

### GLM-5.1 (cutoff 2025-10-31) — 17 pre / 13 post API items

| bucket | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pre-cutoff | 0.84 | 0.81 | 0.15 | 0.70 | 0.81 | 0.79 | 0.86 | 0.96 | 0.86 | 0.28 | 0.00 | 0.00 |
| post-cutoff | 0.70 | 0.54 | 0.08 | 0.71 | 0.70 | 0.69 | 0.65 | 0.76 | 0.64 | 0.30 | 0.15 | 0.00 |

## Knowledge-calibration items: correct-refusal rate per condition

These items (`scroll-triggered-animations`, `arxiv-future-fake-real-id`, `html-in-canvas`) post-date every model; correctness = the model correctly said it could not determine the answer. NOT part of the lift. The thing to see: a bare `opaque-url` (and `described`) often score HIGH here — refusing is easy when you're handed nothing — which is exactly why these would pollute a lift average if included.

| Model | described | described-framed | opaque-url | mdn-url-only | spec-url-only | bcd-key-only | url+described | full-content | content-only | fake-structural-url | fake-opaque-url | random-url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Claude Opus 4.8 | 0.63 | 0.25 | 1.00 | — (n/a) | 0.65 | 1.00 | 0.77 | 0.42 | 0.30 | 0.43 | 1.00 | 0.33 |
| Claude Sonnet 4.6 | 0.00 | 0.50 | 0.33 | — (n/a) | 1.00 | 0.85 | 0.98 | 0.03 | 0.00 | 0.70 | 1.00 | 0.00 |
| Claude Opus 4.6 | 0.53 | 0.00 | 0.33 | — (n/a) | 0.10 | 0.20 | 0.42 | 0.00 | 0.00 | 0.70 | 1.00 | 0.00 |
| Claude Sonnet 4.5 | 0.05 | 0.00 | 0.67 | — (n/a) | 0.60 | 1.00 | 0.63 | 0.00 | 0.37 | 0.70 | 1.00 | 0.00 |
| Gemini 3.1 Pro | 0.90 | 0.97 | 1.00 | — (n/a) | 1.00 | 0.95 | 1.00 | 0.32 | 0.00 | 0.70 | 1.00 | 0.00 |
| Gemini 3.5 Flash | 0.10 | 0.15 | 1.00 | — (n/a) | 0.50 | 0.10 | 0.57 | 0.03 | 0.03 | 0.47 | 1.00 | 0.00 |
| GPT-5.5 | 0.65 | 0.10 | 1.00 | — (n/a) | 0.50 | 0.10 | 0.43 | 0.05 | 0.37 | 0.33 | 1.00 | 0.00 |
| GPT-5.2 | 0.90 | 0.05 | 1.00 | — (n/a) | 1.00 | 1.00 | 0.70 | 0.03 | 0.33 | 0.73 | 1.00 | 0.00 |
| GPT-5 | 0.05 | 0.47 | 1.00 | — (n/a) | 1.00 | 0.95 | 0.37 | 0.00 | 0.33 | 0.63 | 1.00 | 0.00 |
| Grok 4.3 | 0.42 | 0.50 | 1.00 | — (n/a) | 1.00 | 1.00 | 0.70 | 0.07 | 0.07 | 0.95 | 1.00 | 0.00 |
| Grok 4 | 0.00 | 0.05 | 0.67 | — (n/a) | 1.00 | 1.00 | 0.33 | 0.07 | 0.03 | 0.87 | 1.00 | 0.00 |
| GLM-5.2 | 1.00 | 0.55 | 1.00 | — (n/a) | 0.57 | 1.00 | 0.77 | 0.32 | 0.03 | 0.73 | 1.00 | 0.00 |
| GLM-5.1 | 0.53 | 0.05 | 0.67 | — (n/a) | 0.40 | 0.80 | 0.40 | 0.00 | 0.07 | 0.75 | 1.00 | 0.00 |

## All items, mean correctness by condition x model

_Both tracks combined — included only for completeness. Use the API-usage table above for the real signal._

| Condition | Claude Opus 4.8 (cut 2026-01-31) | Claude Sonnet 4.6 (cut 2026-01-31) | Claude Opus 4.6 (cut 2025-08-31) | Claude Sonnet 4.5 (cut 2025-07-31) | Gemini 3.1 Pro (cut 2025-01-31) | Gemini 3.5 Flash (cut 2025-01-31) | GPT-5.5 (cut 2025-12-01) | GPT-5.2 (cut 2025-08-31) | GPT-5 (cut 2024-09-30) | Grok 4.3 (cut 2025-12-31) | Grok 4 (cut 2024-11-30) | GLM-5.2 (cut 2025-10-31) | GLM-5.1 (cut 2025-10-31) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| described | 0.73 | 0.76 | 0.80 | 0.70 | 0.68 | 0.64 | 0.87 | 0.75 | 0.69 | 0.69 | 0.70 | 0.74 | 0.72 |
| described-framed | 0.72 | 0.75 | 0.77 | 0.66 | 0.65 | 0.69 | 0.83 | 0.73 | 0.71 | 0.69 | 0.65 | 0.74 | 0.70 |
| opaque-url | 0.36 | 0.33 | 0.34 | 0.27 | 0.35 | 0.35 | 0.40 | 0.24 | 0.35 | 0.30 | 0.31 | 0.31 | 0.34 |
| mdn-url-only | 0.82 | 0.78 | 0.76 | 0.58 | 0.52 | 0.40 | 0.77 | 0.49 | 0.57 | 0.59 | 0.61 | 0.68 | 0.69 |
| spec-url-only | 0.83 | 0.72 | 0.59 | 0.57 | 0.46 | 0.28 | 0.80 | 0.49 | 0.53 | 0.51 | 0.61 | 0.69 | 0.74 |
| bcd-key-only | 0.91 | 0.86 | 0.84 | 0.71 | 0.67 | 0.63 | 0.81 | 0.64 | 0.55 | 0.66 | 0.61 | 0.86 | 0.73 |
| url+described | 0.79 | 0.78 | 0.75 | 0.70 | 0.68 | 0.68 | 0.85 | 0.69 | 0.70 | 0.73 | 0.70 | 0.77 | 0.73 |
| full-content | 0.90 | 0.93 | 0.93 | 0.88 | 0.88 | 0.90 | 0.94 | 0.91 | 0.91 | 0.92 | 0.90 | 0.92 | 0.91 |
| content-only | 0.84 | 0.82 | 0.82 | 0.81 | 0.72 | 0.74 | 0.84 | 0.82 | 0.82 | 0.77 | 0.76 | 0.81 | 0.83 |
| fake-structural-url | 0.21 | 0.14 | 0.19 | 0.13 | 0.14 | 0.10 | 0.16 | 0.08 | 0.08 | 0.11 | 0.06 | 0.17 | 0.13 |
| fake-opaque-url | 0.03 | 0.03 | 0.03 | 0.03 | 0.03 | 0.03 | 0.03 | 0.03 | 0.03 | 0.03 | 0.03 | 0.03 | 0.03 |
| random-url | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |

## Interpretation

- **Headline (real opaque API-usage items only):** mean lift -0.69 overall — among items whose opaque URL is meant to be a real pointer, a bare opaque URL, with no page content, does NOT beat simply naming the task, and across models it tends to lower the score. The model is more cautious or more error-prone when handed only a context-free URL string than when told plainly what to build.
- **Boundary (real opaque API-usage items):** mean pre-cutoff lift -0.90, mean post-cutoff lift -0.52. The pre- vs post-cutoff gap on API-usage items is small or noisy at this corpus size, so the boundary effect is not yet demonstrated; the post-cutoff bucket is only one or two real items per model.
- **Why the earlier read was wrong:** an apparent positive *post-cutoff* opaque-url score comes from the knowledge-calibration items (scroll-triggered-animations, arxiv-future-fake-real-id, html-in-canvas), where the correct answer is "I don't know". A bare URL elicits exactly that refusal, scoring high — which is the OPPOSITE of the URL helping the model use an API. Those items are now excluded from the lift.
- **What does work:** `url+described` and the `full-content` ceiling score well across the board, and the controls (`fake-structural-url`, `random-url`) collapse toward described / zero, so the harness is measuring real content rather than URL shape.

Per model (real opaque API-usage items):
- **Claude Opus 4.8:** bare URL did not help / hurt (lift -0.78); full-content 0.87 vs described 0.85; pre -0.99 / post -0.48 (n 18/12).
- **Claude Sonnet 4.6:** bare URL did not help / hurt (lift -0.79); full-content 0.88 vs described 0.79; pre -0.94 / post -0.57 (n 18/12).
- **Claude Opus 4.6:** bare URL did not help / hurt (lift -0.79); full-content 0.87 vs described 0.79; pre -0.86 / post -0.71 (n 16/14).
- **Claude Sonnet 4.5:** bare URL did not help / hurt (lift -0.68); full-content 0.81 vs described 0.71; pre -0.86 / post -0.51 (n 15/15).
- **Gemini 3.1 Pro:** bare URL did not help / hurt (lift -0.62); full-content 0.80 vs described 0.69; pre -1.00 / post -0.43 (n 10/20).
- **Gemini 3.5 Flash:** bare URL did not help / hurt (lift -0.45); full-content 0.79 vs described 0.52; pre -0.99 / post -0.19 (n 10/20).
- **GPT-5.5:** bare URL did not help / hurt (lift -0.76); full-content 0.89 vs described 0.90; pre -0.86 / post -0.64 (n 17/13).
- **GPT-5.2:** bare URL did not help / hurt (lift -0.78); full-content 0.87 vs described 0.85; pre -0.89 / post -0.65 (n 16/14).
- **GPT-5:** bare URL did not help / hurt (lift -0.54); full-content 0.82 vs described 0.60; pre -0.98 / post -0.31 (n 10/20).
- **Grok 4.3:** bare URL did not help / hurt (lift -0.71); full-content 0.86 vs described 0.79; pre -0.86 / post -0.52 (n 17/13).
- **Grok 4:** bare URL did not help / hurt (lift -0.71); full-content 0.84 vs described 0.75; pre -0.91 / post -0.62 (n 10/20).
- **GLM-5.2:** bare URL did not help / hurt (lift -0.72); full-content 0.90 vs described 0.78; pre -0.86 / post -0.54 (n 17/13).
- **GLM-5.1:** bare URL did not help / hurt (lift -0.66); full-content 0.87 vs described 0.78; pre -0.69 / post -0.62 (n 17/13).

---

_Small scale (a handful of API-usage items per pre/post bucket), so treat these as directional, not statistically significant — the post-cutoff API bucket is especially thin and is the main reason for expanding the corpus. Cutoff dates are the vendors' published values (see SOURCES.md). Every prompt, output, and judge prompt + raw verdict is in [transcript.jsonl.gz](transcript.jsonl.gz) and [dashboard.html](dashboard.html)._