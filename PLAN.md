# PLAN.md — shared coordination + knowledge

This is the **live coordination channel** for everyone (agents and humans)
working on this repo. `AGENTS.md` is the *fixed* operating guide (invariants,
checklists, workflow); `PLAN.md` is the *changing* state: who is doing what,
decisions made, and what we have learned about the URLs and methodology.

## How to use this file

- **Before starting work:** read this file and `AGENTS.md`. `git status --short`
  and inspect diffs; another agent may have uncommitted changes — work around
  them, never revert them.
- **Claim work:** add a dated line under _In progress_ with what you're touching
  so we don't collide on the same files.
- **Record knowledge here**, not in `AGENTS.md`: decisions, URL/methodology
  notes, findings, caveats. Keep entries short and dated.
- **Coordinate via small patches + clear git commit messages.** When a task is
  done, move it to _Done_.

---

## Status board

### In progress
- (2026-06-19, opus agent) Recall-baseline overhaul + responding to codex audit.
  Batched run in flight (~2200 cells): url+name/full-content recall re-runs +
  5 new obscure-SHA items. Re-score/analyze/dashboard pending its completion.

### Re: codex audit (2026-06-19) — responses (opus agent)
- **validate failure (arxiv-future-fake-real-id):** FIXED. validate now allows
  name-only/name-framed to skip ONLY for `expectUnknown` items (no content to
  name); every other recall item must carry a DESCRIPTIVE_NAMES entry, else it
  still errors. `npm run validate` → 101 items, 0 errors.
- **Headline lift mixed recall + code:** FIXED. analyze lift basis is now
  `isCodeItem && !structuralControl` (code/API-usage only). Recall items are a
  separate opaque-id-decoding track (id-type / popularity / per-item tables).
  Report reframed to THREE tracks. This also resolves the "url-only includes
  recall but name-only didn't" asymmetry — recall now has a descriptive name
  baseline, but it's deliberately NOT in the lift.
- **Recall name baseline:** replaced the broken-then-skipped approach with a real
  DESCRIPTIVE-TITLE baseline (DESCRIPTIVE_NAMES map, 64 items) so url-only −
  name-only on recall items measures the opaque-id penalty. ALSO fixed url+name
  and full-content (they shared the same dangling "at this id" target).
- **Stale/mismatched artifacts:** being regenerated wholesale by the in-flight
  run → fresh scores.json/REPORT.md/dashboard from current raw. Will verify
  row/raw parity after.
- **STILL OPEN (codex, valid):** SOURCES.md omits xAI + GLM rows; GLM cutoffs are
  estimates and shouldn't feed pre/post headline splits; Grok 4.3 Dec-2025 cutoff
  needs a first-party citation or a non-official caveat. Will address next.

### Done (2026-06-19, codex — audit of current methodology/code/results consistency)
- **Blocking consistency issue:** current HEAD (`9382f67`) adds descriptive-title
  recall baselines, but generated artifacts still partly reflect the old
  "recall name baselines are skipped" protocol. `npm run validate` fails on
  `arxiv-future-fake-real-id` (`name-only`/`name-framed` required but no
  descriptive name). `results/scores.json` has 845 skipped recall `name-only`
  rows even though current code can build 64/65 recall name prompts.
- **Headline lift is still not code/API-only in `analyze.mjs`:** the filter named
  `api` excludes calibration + structural controls, but includes non-calibration
  recall items. With current scores, `url-only` includes recall rows while
  `name-only` does not, so the reported averaged lift compares different item
  sets. Recompute lift on `kind === "code"` real-pointer items only, and report
  recall opaque-id decoding separately.
- **Audit artifacts are stale/mismatched:** dirty `scores.json` contains 1186
  rows with no matching `results/raw/*.json`; score rows disagree with raw
  skipped status in 465 cells because `score.mjs` trusts `results/judge-cache`
  by filename only. Plain `results/transcript.jsonl` is gitignored/stale; the
  dashboard builder reads it instead of the committed `.gz`, so dashboard data
  can lag current scores. Plain transcript mismatched scores in 2070 cells;
  committed `.gz` mismatched in 1701.
- **Source/provenance gaps:** `results/SOURCES.md` lists only Anthropic/Google/
  OpenAI rows, omitting xAI + GLM even though the report includes them. GLM
  cutoffs remain estimated and should not feed pre/post headline splits. Official
  spot-checks matched Anthropic/OpenAI/Google cutoff claims; xAI official docs
  clearly state Grok 4 Nov 2024, while Grok 4.3 Dec 2025 needs a first-party
  citation or should be caveated as non-official.

### Done (2026-06-19, opus agent — BUG FIX: broken name baseline for recall items)
- **Paul caught it:** dashboard showed recall `name-only`/`name-framed` prompts as
  "Recall the paper at this arXiv id: …" with **no id attached** → models rightly
  refused ("no arXiv ID in your message"). Root cause: recall `target` references
  an external identifier those two conditions don't supply. **The treatment
  (`url-only`) was NEVER broken** — it builds from `urls.opaque` directly. Only the
  name baselines for the 65 recall items were garbage; the earlier "1.00 from id
  vs 0.00 from naming" headline was thus partly an artifact (the 0.00 = refusal to
  the broken prompt).
- **Fix:** a pure opaque-id recall task has no verbal description that isn't the
  answer, so `name-only`/`name-framed` now return null (skip) for `kind==="recall"`
  — same pattern as `spec-url-only` skipping when there's no spec. Purged 1690
  stale broken cells (raw+cache), re-ran (null→skip, **zero model calls**),
  re-scored/analyzed/dashboarded. Added regression test (10 tests pass). Report
  LIFT section now states lift is code/API-items only; recall items judged on the
  cutoff axis + full-content ceiling, name cols read `-`.
- **OPEN / proposed to Paul:** a richer *descriptive-title* baseline for recall
  items (give the paper/CVE/RFC title, ask to summarize) would separate "model
  doesn't know this work at all" from "knows it but can't decode the opaque
  number". Costs ~1690 model calls (65×2×13) — awaiting Paul's go/no-go.

### Done (2026-06-19, opus agent — methodology review + new directions)
- **Methodology review almost fully cleared:** B1 temperature/seed + B2 retry-all
  + C1 VENDORS map (providers.mjs; caught Anthropic temperature-400 live); A5
  mid-month cutoff + boundary caveat; A3 `name-framed` + A4 `fake-opaque-url`
  control conditions; B4 full-content extraction (preserve code/strip chrome);
  C3 unit tests + `npm test`; C4 scoreMode flag. Protocol RERUN done (5720 cells)
  — controls STRENGTHEN the headline: framing cost ≈0 (url-only collapse is real,
  not vaguer framing) and fake-opaque-url ≈0 (opaque SHAPE alone steers nothing).
- **A2 (partial) + parallel scoring:** judge now told for recall items that
  "declined/beyond-cutoff without reproducing facts = 0 (no recall)" — fixed the
  inconsistency that inflated the post-cutoff opaque cell (0.39→0.04 after
  re-judge). score.mjs parallelized (SCORE_CONCURRENCY, default 8) — re-judges ~8x
  faster. REPORT.md rewritten: opacity column, per-item/by-id-type tiers,
  all-models view, worked judge examples, run-data links, provenance header.
- **Balanced opaque-id grid (Paul):** +56 verified recall items (corpus 96) across
  CVE/arXiv/PMID/RFC/SO/DOI/GitHub-SHA/HF with popularity tags. Run → opaque-id
  recall is driven by FAME: famous 0.75 / moderate 0.40 / obscure 0.33; obscure
  POST collapses to 0.04 (cutoff bites). NB GitHub-SHA negative contaminated
  (git/linux initial commits ARE memorised) — should use obscure SHAs.
- **Common Crawl pass (Paul):** cc-check.mjs → results/common-crawl.json (96 items
  × 6 crawls). CC-present decode 0.46 vs CC-absent 0.21 (confounded w/ fame). Key:
  StackOverflow 0/9 in CC (blocked) yet decodes 0.35 (other routes); ChromeStatus
  18/30 in CC yet ~0. → CC presence is a noisy, incomplete covariate; fame/
  repetition across all routes is the mechanism.
- **Dashboard source/popularity filter** added. **File-size fix:** transcript
  gzipped (70→9MB), RUNLOG.md gitignored, dashboard-data clipped (under 100MB).
- **CC covariate surfaced (Paul):** report now has a CC-snapshots column in the
  per-item identifier table (+ first-seen month) and a present-vs-absent decode
  table (present 0.46 / absent 0.18); dashboard has an "In/Not in Common Crawl"
  filter + per-row CC badge. analysis-only, no rerun.
- **Dashboard data gzipped (Paul):** ships as `results/dashboard-data.json.gz`
  (real gzip file, 57.5→6.9MB); page fetches it and streams through
  DecompressionStream on boot. NOT base64-in-page (that bloats 33%). Tradeoff:
  needs http to view (`python3 -m http.server` / GitHub Pages), not file://.
  Old dashboard-data.js removed. Size-warning resolved.
- PENDING (lower priority): A2 full (cross-vendor judge), B3 (k-samples variance),
  C2 (url-resolution dedupe), fix GitHub-SHA negative to obscure commits, README
  "opaque spectrum" minor tidy.

### Next / open
- DONE (2026-06-19): committed results regenerated for the current protocol —
  full 13-model / 4680-cell run, ChromeStatus opaque ids, corrected ship dates,
  Grok active, GLM with retry. KEY FINDING (per-item, not the misleading
  averaged lift): opaque `url-only` works ONLY for famous memorised ids
  (arxiv-attention 1.00 from the bare id vs 0.00 from naming; rfc-9110 1.00) and
  is ~0 for chromestatus-numbered web features. BUT the CANONICAL WEB id decodes:
  on the 9 in-training web features the **BCD key** scores ~0.74-1.00 (fetch/
  promise/fedcm 1.00) and the **spec URL** 0.53-1.00, vs the opaque chromestatus
  number ≈0. So the web-platform analog of a memorised arXiv id is the BCD key /
  spec URL. The honest reframe: "canonical memorised ids work (arXiv/RFC/BCD/
  spec); opaque numeric ids don't" — see methodology review A1 for the per-item
  table to add to REPORT/dashboard.
- **Balanced opaque-id corpus (BIG — the real fix; Paul 2026-06-19).** The
  opaque-id sample is thin/unbalanced (RFC 1, arXiv 6, SO ~1, caniuse 1, vs 28
  ChromeStatus), so pre/post CAN'T be tested *within* an opaque-id type, and fame
  can't be separated from recency. Build a **popularity × cutoff grid** across
  MULTIPLE independent id schemes so the result isn't an arXiv artifact. Sources
  (date-stamped-in-id schemes are best): **CVE** (`CVE-YYYY-NNNN` — year in the
  id; NVD-indexed; Heartbleed/Log4Shell famous vs obscure) ~8; **arXiv** ~16-20
  (famous-pre / obscure-pre / post-2026); **PMID** (PubMed, numeric, time-
  monotonic) ~6; **RFC** ~8 (famous-old / obscure-old / 2024-26); **Stack
  Overflow** ~8 (old+upvoted / recent / obscure); **DOI** (CrossRef/bioRxiv) ~6;
  **GitHub commit SHA** a few (guaranteed-NOT-memorised negative); **Hugging Face
  model ids** a few (semi-descriptive, clean post-cutoff). Each item: REAL
  verified id + groundTruth (title/contribution/date) + `popularity` +
  `contentDate` tags. Every cell of pre/post × fame gets real n. Build via a
  verify-every-id agent (no guessing), then run only the new items (parallel).
  Do AFTER the protocol rerun commits (editing corpus mid-pipeline corrupts the
  in-flight report).
- **Task 3 (the thesis-prover):** source post-cutoff features where `name-only`
  itself FAILS. Current post-cutoff items are too guessable (high `name-only`),
  so they show "opaque id gives nothing", not "model can't build it".
- **Broaden spec-url-only / bcd-key-only coverage.** Only 9/40 items carry
  `specUrl` + `bcdKey` (the 6 old features + view-transitions/popover/fedcm), so
  the identifier probes are correctly `skipped` (n/a, not 0) on the other 31 —
  including ALL the recent 2026 web features, which is exactly where the
  canonical-web-id question is most interesting. Add `specUrl`
  (w3.org/csswg-drafts / whatwg / tc39) + `bcdKey` to the recent web-platform
  items, then re-run just the spec/bcd cells. (Do after the regeneration commit;
  it edits the corpus.)
- Keep SO URLs in the corpus as noisy/control metadata where useful, but prefer
  ChromeStatus for `urls.opaque` on web-platform items because those pages are
  indexable and canonical enough for URL-memory testing.
- **Recharge z.ai** to activate GLM-5.2/5.1 (account currently returns 429
  insufficient balance), and **confirm/replace the ESTIMATED GLM-5 cutoff**
  (currently `2025-10-31` in `models.mjs`) with a real value before trusting any
  GLM pre/post-cutoff split — z.ai does not publish one.

### Methodology + code review (2026-06-18, analysis pass — NOT yet claimed)

Grounded in a read of current `src/`, `results/scores.json`, and per-item lift
for Claude Opus 4.8. Priority-ordered. Tags:
- **[protocol-changing]** alters what a cell measures → requires a matrix rerun.
- **[analysis-only]** recomputes from existing data → free, no paid rerun.
- **[code-only]** no effect on results.

IMPORTANT coordination note: the cheap reproducibility fixes (**B1, B2**) are
protocol-changing and should land BEFORE the in-flight regeneration finishes,
otherwise that run is immediately stale on arrival. **[analysis-only]** items
(A1, A5) can land anytime and re-shape the report for free.

#### A. Methodology — highest priority (these affect the claim's defensibility)

**A1. [analysis-only] Surface per-item lift + stratify by identifier type, not
just pre/post-cutoff.** The current headline ("overall lift −0.54") is the
mean of a sharply bimodal, item-specific signal. Verified on Opus 4.8 rows: of
34 items only ~4 carry any positive lift — `arxiv-attention` (+1.00),
`rfc-9110` (both=1.0), `html-in-canvas` (+1.00) and `scroll-triggered-animations`
(+0.90) — and the latter two are *calibration* items where 1.0 = "correctly
refused". ~28 items sit at `url-only = 0.00` regardless of `name-only`. So the
effect is **categorical** (works only for a handful of canonical-memorised ids:
famous arXiv / RFC), NOT continuous, and it is driven by *which id*, not *which
side of the cutoff*. The pre/post split therefore can't cleanly test the
hypothesis while those ~4 outliers dominate either bucket.
- Action (`analyze.mjs`, data already present): add a **per-item lift table /
  heatmap** to REPORT + dashboard; report **lift stratified by identifier type**
  (canonical arXiv/RFC vs ChromeStatus vs SO vs descriptive); report **paired
  per-item lift with a sign test / bootstrap CI** instead of bare cell-mean
  differences, so n=15 with a couple of +1.0 outliers isn't shown as "lift
  −0.54". This is the single most honest reframing of the headline.

**A2. [protocol-changing] Judge is bimodal, single-vendor, and uncalibrated.**
Bucketed all 1836 numeric `correctness` values: `0.00`→985, `1.00`→603,
`(0,1)`→248 — **~86% binary**. A well-calibrated judge should span the range;
bimodal grading makes "lift" coarse and hides partial-credit differences
between conditions. The judge is Claude Sonnet 4.5 (Anthropic) judging 4/13
Anthropic models → same-vendor bias.
- Action: `temperature: 0` + stricter rubric demanding gradations; **hand-label
  a small gold set (~30 cells)** and report judge↔human agreement; ideally add a
  second cross-vendor judge (e.g. GPT-5.5 judging Claude runs) and report
  Cohen's κ / disagreement rate. Until calibrated, "correctness 0..1" is one
  unverified opinion per cell.

**A3. [protocol-changing] Framing confound between `name-only` and `url-only`.**
The two core prompts differ in more than the identifier — they are different
task framings: `name-only` = `"Task: <target>. Produce the code."` vs
`url-only` = `"Do whatever the content at this URL describes: … Produce the
code."` A bare URL makes the *task itself* vaguer, so lower `url-only` scores
partly reflect **vaguer instruction**, not "URL failed as a retrieval key". The
`fake-structural-url` control exposes this: Opus 4.8 overall
`fake-structural-url` = **0.45**, sitting *between* name-only (0.67) and
url-only (0.13) — NOT "collapsed toward zero" as REPORT currently claims.
- Action: add a framing-matched control (e.g. `name-only` phrased "Do whatever
  the following describes: <target>" with no explicit verb) so the only delta is
  the identifier; OR report `fake-structural-url − name-only` explicitly as the
  "framing cost" and net it out of the headline.

**A4. [protocol-changing] `fake-structural-url` is not a matched control for web
items.** For arXiv items `fakeUrl` is opaque-shaped (`YYMM.99999`), but for web
items it is **descriptive** (e.g. `…/API/Document/startPageTransition`,
`…/API/Flyout_API`). That's why `fake-structural-url` = 1.00 on
`css-anchor-positioning`, `element-scoped-view-transitions`,
`text-justify-css-property`, `css-text-indent-hanging` — the fake *descriptive*
path still names the API, so the model decodes it. The control's meaning
changes by item type.
- Action: give every item a second, **opaque-shaped** fake control (fake
  ChromeStatus id / fake arXiv id) so "does URL *shape* steer?" is uniform.

**A5. [analysis-only] Cutoff granularity mismatch biases toward "pre".**
`contentDate` is often `YYYY-MM` (padded to `-01` in `relativeToCutoff`) while
cutoffs are month-*end* (`-31`). An item shipping "2025-08" vs cutoff
"2025-08-31" is classified **pre** even though it likely post-dates training —
systematically inflates the pre bucket at the boundary.
- Action: use mid-month (`-15`) for `YYYY-MM` content dates, or document the
  convention and flag boundary items.

#### B. Reproducibility / robustness

**B1. [protocol-changing] No `temperature` / `seed` anywhere — runs aren't
reproducible and each cell is n=1.** Confirmed: zero hits in `providers.mjs`;
all five adapters use vendor defaults.
- Action: set `temperature: 0` (Anthropic/Google/OpenAI/xAI) and pass `seed` on
  OpenAI-compatible endpoints. **Land before the in-flight rerun** so the new
  results are reproducible.

**B2. [protocol-changing] Retry/backoff exists only for z.ai.** `callZai` has
proper 429/5xx exponential backoff; `callAnthropic` / `callGoogle` /
`callOpenAI` / `callXai` have none — one transient 429 becomes a permanent
`run-error` (null) cell. Matters more at 40×9×13.
- Action: factor `backoffMs` into a shared `withRetry(fn)` wrapper and apply to
  all five adapters. **Land before the rerun.**

**B3. [protocol-changing] Single draw per cell + binary judge → sign could flip
on re-run.** With n=15 per bucket and ~86% binary scores, single-draw lift is
fragile.
- Action: run **k≥3 samples** per cell on a representative subset and report
  variance (use it to justify or refute the headline direction).

**B4. [protocol-changing] `htmlToText` is very crude for the ceiling condition.**
`util.mjs htmlToText` strips *all* tags (no `<pre>`/`<code>`/`<nav>` handling)
and `conditions.mjs` slices the top 12000 chars — MDN/spec pages carry long
nav/header chrome, so the real API content can be truncated/garbled, weakening
the `full-content` ceiling and confounding "URL failed" vs "ceiling also weak".
- Action: prefer readability extraction or canonical raw sources (MDN
  `index.json`, arXiv abstract, RFC plain text); log fetched char count +
  snippet per item for audit.

#### C. Code quality (code-only — no rerun)

**C1. Two parallel vendor switch-if chains.** `hasKeyFor` and `keyEnvFor` in
`providers.mjs` are near-identical, plus the `ADAPTERS` lookup. Replace with one
`VENDORS = { anthropic:{env:"ANTHROPIC_API_KEY", adapter:callAnthropic}, … }`
map; both helpers + the adapter lookup collapse to one-liners and adding a
vendor becomes one entry, not three edits.

**C2. `buildPrompt` + `urlForCondition` duplicate URL resolution.**
`CONDITION_DEFS` already carries `urlKind`; both functions re-implement "which
url field does this condition use". Resolve once (`urlFieldFor(urlKind)`) and
drive both — removes a "changed the prompt, forgot the report url" bug class.

**C3. No tests.** Pure logic (`parseJudge`, `relativeToCutoff` string-compare
incl. the `-01`/`-31` padding above, `structuralScore` matching, `loadDotEnv`
quote-stripping) is exactly where regressions bite. Add a `node:test` file
(~15 cases); zero new deps (Node 20 ships `node:test`).

**C4. `correctness` mixes two scales.** `score.mjs` falls back to
`struct.structural` (keyword fraction) when the judge is absent. Current run
had 0 fallbacks (judge always ran), but if structural-only is ever used the two
scales aren't comparable. Flag explicitly in summary, e.g.
`scoreMode: "judge" | "structural-only"`.

#### D. Housekeeping / staleness (reinforces bullets already in Next/open above)

- **Committed `results/*` are stale vs current protocol.** Verified:
  `results/scores.json` = **6 conditions × 34 items × 9 models = 1836 rows**;
  corpus is now **40 items × 9 conditions × 13 models**, and the
  `mdn-url-only` / `spec-url-only` / `bcd-key-only` probes have **zero**
  committed rows. Until regeneration lands, REPORT + dashboard describe an older
  protocol. → overlaps the "Regenerate committed results" bullet.
- **GLM cutoff is an estimate** (`2025-10-31`). Don't let GLM feed the pre/post
  headline until a real cutoff exists — currently it would, silently. → overlaps
  the "Recharge z.ai / confirm GLM cutoff" bullet.

#### Suggested landing order
**B1 + B2** (cheap, before the rerun) → **A1 + A5** (analysis-only, free) →
rerun → **A2 / A3 / A4 / B3** (protocol-changing, next cycle) → **C1–C4**
(code-only, any time).

### Done
- (2026-06-19, opus corpus-agent) **Balanced opaque-id corpus expansion landed.**
  Added **56 NEW `kind:"recall"` items** (corpus now 96 total) as a popularity ×
  cutoff grid across 8 independent opaque-id schemes, each id REAL + VERIFIED
  against the scheme's API/page (title + date) BEFORE adding — no guessing.
  Per scheme: **CVE 8** (NVD/MITRE — Heartbleed/Log4Shell/xz famous, EternalBlue/
  BlueKeep/Drupalgeddon2 moderate-obscure, 2x 2026-post), **arXiv 14** (beyond the
  existing 6 — ResNet/BERT/GAN/U-Net/Adam/VGG/GPT-3/word2vec/PPO/distillation
  famous, PATE moderate, 3x post-2026 verified via export.arxiv.org), **PMID 6**
  (human-genome/cooperation/DLBCL famous, DL-survey/hydrogel moderate-obscure, 1x
  2026-post via NCBI eutils), **RFC 8** (HTTP/1.1 2616, JSON 8259, IP 791, HTTP/3
  9114 famous; TCP 9293, avian-1149 obscure; OAuth-BCP 9700, JWT-9701 recent-2025
  — via rfc-editor/datatracker), **Stack Overflow 8** (branch-prediction/closures/
  use-strict famous, redirect/jquery moderate, coredump obscure, 2x 2026-post —
  all ids verified via Stack Exchange API), **DOI 6** (AlphaFold/human-genome/
  deep-learning-review famous, Optuna moderate, corn-seed obscure, 1x bioRxiv
  2026-post — via CrossRef), **GitHub commit SHA 3** (linux/git/bitcoin initial
  commits — the guaranteed-not-memorised-by-SHA negative, via GitHub API), **HF
  model ids 3** (gemma-4 / qwen3.5 / qwen3.6, all clean post-cutoff, via HF API).
  Spread: famous 28 / moderate 10 / obscure 18; pre-2026-01-31 44 / post 12. New
  top-level `popularity` tag on every added item; targets are name-only-fair (the
  id IS the content). `npm run validate` → 96 items / 11 conditions / 0 errors /
  0 warnings. CORPUS-ONLY: matrix NOT run (post-cutoff items left without
  `expectUnknown` so the score reflects failure-to-recall). Next: run ONLY these
  56 new items (parallel), and `npm run validate:live` when network is acceptable
  to confirm the opaque URLs resolve.
- (2026-06-19, opus agent) **REPORT.md rewritten (A1 largely addressed)** via
  `analyze.mjs`: explicit OPAQUE-vs-descriptive column per condition; headline
  finding by opaque-id TYPE (arXiv/RFC work, ChromeStatus# ≈0) + an all-models-
  by-condition table, replacing the misleading averaged lift as the lead (old
  lift table demoted/labelled bimodal); per-item identifier reference (actual
  url-only id + type + spec/bcd flags) and per-item results (name vs opaque vs
  mdn/spec/bcd/full, all-models mean); worked judge examples with the judge's
  reasoning inline; provenance header (report + data-run dates + linked commit);
  run-data section linking dashboard/RUNLOG/transcript for per-cell judge
  inspection. REMAINING from A1: optional sign-test / bootstrap CI on per-item
  lift. (analysis-only, free.)
- (2026-06-19, opus agent) **spec/bcd top-up complete + scored** for all 23
  spec/bcd-capable items (parallel runner; then fixed a judge-cache trap where
  score reused stale `skipped` cache for the re-run cells → cleared cache +
  re-judged, no model re-run). RESULT (mean across 13 models): three tiers —
  (1) opaque numeric id (chromestatus#, un-famous SO#) ≈ 0.00 everywhere, pre OR
  post-cutoff; (2) famous memorised opaque id (arXiv 1706.03762 = 1.00 from the
  bare id vs 0.00 from naming; RFC 9110 = 1.00) → pure memorised retrieval;
  (3) canonical web id (BCD key / spec URL) → 0.6-1.0. **CAVEAT (methodology
  review A3/A4):** BCD keys + spec URLs are SEMI-DESCRIPTIVE (`api.fetch`,
  `css.properties.text-justify` name the feature), so their decode is partly
  reading the name, not pure opaque retrieval. BCD decode drops 0.79 (pre) → 0.60
  (post-cutoff): the descriptive-hint part is cutoff-independent, so that ~0.19
  drop is the plausible genuine "saw the BCD↔feature mapping in training"
  signal — small n, noisy. Bottom line: a model builds a feature from an id when
  the id is a famous memorised opaque key OR names/describes the feature; a
  truly-opaque un-famous id gives ~nothing even for well-known features.
  REPORT.md still leads with the misleading averaged lift — A1 reframe (per-item
  + id-type tiers) pending.
- (2026-06-18, opus agent) **Runner now runs vendors in PARALLEL** (`run.mjs`):
  cells are grouped by vendor and vendors run concurrently (independent
  endpoints + rate limits — no reason to serialize across them), each bounded to
  `--concurrency` in-flight requests (default 4). Replaces the serial triple-loop
  + 250ms-per-call sleep, so ~vendors×concurrency requests run at once (e.g.
  5×4=20 vs 1). z.ai's retry/backoff absorbs its rate limits; resume-skip and
  n/a-skip preserved; each cell writes its own raw file (concurrency-safe).
  Verified zero-cost on already-done cells across 3 vendors. (The in-flight
  regeneration run loaded the OLD serial runner; future runs — incl. the spec/bcd
  top-up — get the speedup.)
- (2026-06-18, opus agent) **Made the analysis date-correction-safe (no paid
  re-run needed for date fixes).** `analyze.mjs` + `transcript.mjs` now classify
  pre/post-cutoff from the CURRENT corpus `contentDate` (by itemId), not the
  value baked into each raw cell at run time — so the 9 ship-date corrections
  (and any future ones) apply at analysis time without re-running cells. Also
  corrected the 6 now-pre-cutoff items' `groundTruth.notes` (they had the wrong
  Chrome milestone in prose AND a now-false "post-dates every current model's
  cutoff" claim): corner-shape M139/2025-08, translator + language-detector
  M138/2025-06, css-shape-function M135/2025-04, uint8array-base64-hex
  M140/2025-09, css-scroll-state-container-queries M133/2025-02. Validate clean.
- (2026-06-18, opus corpus-agent) **Enriched 23 web-platform items with
  verified `urls.specUrl` + top-level `bcdKey`** from webstatus.dev (spec links +
  ship dates), web-features `compat_features`, and `@mdn/browser-compat-data`
  8.0.3 (every BCD key verified to exist; every spec URL passed the live
  validator). 21 items got both spec+BCD; **2 partial**: `html-in-canvas`
  (spec=WICG explainer, no BCD entry yet — origin trial) and
  `named-feature-supports` (spec=css-conditional-5 anchor, no BCD entry yet —
  Proposed). **1 left absent entirely**: `gamepad-event-driven-input` — the
  `rawgamepadinputchange` event has no BCD key and only the generic gamepad spec
  index (the event-driven surface isn't in the published spec text), so neither
  probe id would be meaningful. **9 contentDate corrections** where
  webstatus.dev + ChromeStatus both clearly contradicted the corpus (the v145–
  v150 chrome-platform-showcase milestone the items were sourced from reflects
  when the conformance TEST appeared, not the Chrome STABLE ship date): temporal
  2025-05→2026-01 (M144); element-scoped-view-transitions 2025-09→2026-04
  (M147); prompt-api-shape 2025-05→2026-05 (M148); corner-shape 2026-04→2025-08
  (M139); translator 2026-05→2025-06 (M138); language-detector 2026-05→2025-06
  (M138); css-shape-function 2026-06→2025-04 (M135); uint8array-base64-hex
  2026-06→2025-09 (M140); css-scroll-state-container-queries 2026-06→2025-02
  (M133). NOTE: 6 of these now PRE-date the Jan-2026 Claude flagships' cutoff —
  their `groundTruth.notes` still say "post-dates every current model's cutoff"
  and should be revised before the next pre/post-cutoff analysis. Validate: 40
  items / 9 conditions / 0 errors / 0 warnings; live validator 0 errors (2
  pre-existing diagnostic warnings only). Corpus-edit only — matrix NOT run.
- (2026-06-18, `744fe71`) Strengthened the research harness: condition
  metadata, `mdn-url-only` / `spec-url-only` / `bcd-key-only` probes,
  skipped-cell handling, static/live corpus validator, structural-control
  opaque URL role, dashboard filter for opaque role, and standard `AGENTS.md` /
  `CLAUDE.md` guidance.
- (2026-06-18) Web-platform opaque IDs moved toward ChromeStatus: recent
  SO-backed web features now use ChromeStatus for `urls.opaque`, while the old
  SO URLs are retained as `validation.stackOverflowUrl` metadata. `js-promise`
  remains SO-shaped/structural-control because there is no clean base
  ChromeStatus feature for ES2015 Promise itself.
- Current flagship models + cited cutoffs; cutoff-spanning corpus.
- (2026-06-18, `08fcd65` / `aeae016`) Added two providers → 13 models total.
  **Grok (xAI)**, OpenAI-compatible `api.x.ai`: Grok 4.3 (cutoff 2025-12-31) +
  Grok 4 (2024-11-30) — ACTIVE via `GROK_API_KEY` (`grok-4` verified
  end-to-end, 9/9 cells returned output). **z.ai / Zhipu (GLM)**,
  OpenAI-compatible `api.z.ai/api/paas/v4`: GLM-5.2 + GLM-5.1 via `Z_API_KEY` —
  key detected and endpoint/id correct, but the account returns `429
  insufficient balance` (auto-runs once recharged). GLM-5.x cutoff is
  UNPUBLISHED → set to an ESTIMATE (`2025-10-31`, flagged in `models.mjs`).
  Adapters surface 429/empty as labelled run errors, never scored 0.
- Auditable transcript (`RUNLOG.md` / `transcript.jsonl`) + interactive
  `dashboard.html`; GitHub Pages live at https://paulkinlan.github.io/url-influence/ .
- Split API-usage vs knowledge-calibration tracks; headline lift now computed
  only on API-usage items whose opaque URL is intended to be a real pointer.
- Full 9-model coverage incl. OpenAI; GPT-5 empty-completion fix (bigger budget
  + `reasoning_effort=low`).
- Static validation currently passes: `npm run validate` → 40 items, 9
  conditions, 0 errors, 0 warnings.
- Live validation currently passes with diagnostics only:
  `npm run validate:live` → 0 errors, 3 warnings (`openai.com` 403 on a
  semi-opaque diagnostic URL; fake GitHub repo 404 on a semi-opaque diagnostic
  URL; `js-promise` uses a related SO question as a structural/noisy control
  because there is no clean base ChromeStatus entry for ES2015 Promise itself).

---

## What we know — identifiers & opacity

The `url-only` condition gives ONLY an identifier string; the page is never
fetched. Which identifier we use determines what "opaque" means:

| id type | example | opacity | in training? |
|---|---|---|---|
| arXiv id | `arxiv.org/abs/1706.03762` | opaque (number) | yes, openly crawled |
| RFC id | `rfc-editor.org/rfc/rfc9110` / datatracker | opaque (number) | yes |
| DOI | `doi.org/...` | opaque | usually |
| ChromeStatus id | `chromestatus.com/feature/<n>` | opaque (number) | yes / preferred for web-platform items |
| **Stack Overflow id** | `stackoverflow.com/questions/<n>` | opaque (number) | uncertain / noisy — see below |
| MDN URL | `/Web/API/fetch` | **descriptive** (names the API) | yes |
| spec URL | `fetch.spec.whatwg.org`, `w3.org/TR/...`, `tc39.es/...` | canonical, semi-descriptive | yes |
| BCD key | `api.fetch`, `css.properties.grid` | canonical, terse | yes (BCD is widely mirrored) |
| structural-control opaque id | fake/unrelated SO#, ChromeStatus#, arXiv-shaped id | opaque shape only | deliberately not headline evidence |

### Stack Overflow ids are noisy opaque evidence
Checked 2026-06-18: `https://stackoverflow.com/robots.txt` does **not** broadly
disallow canonical `/questions/<id>` pages. It disallows many endpoints and
query variants (`/posts/`, `/search/`, `/questions/ask/`,
`/questions/*answertab=*`, `/questions/*/answer/submit`, `/api/*`, etc.) and
then has `Allow: /`, including in the group that names GPTBot / ChatGPT-User /
Google-Extended. So do **not** claim SO question pages are "not crawlable" or
"certainly absent from training" based on robots.txt alone.

Practical consequences:
- A real, validated SO question id can be an opaque identifier, but it is weaker
  evidence than canonical IDs such as arXiv/RFC/ChromeStatus because training
  inclusion and URL→content memorisation are uncertain.
- For web-platform items, prefer ChromeStatus as `urls.opaque`; retain the SO
  pointer as `validation.stackOverflowUrl` if it is useful as provenance or a
  future noisy-control probe.
- Unverified, missing, or unrelated SO ids are useful only as structural
  controls. Mark those items with
  `validation.opaqueRole = "structural-control"` and exclude them from
  headline lift.
- The live validator uses the Stack Exchange API to check whether an unmarked
  SO opaque URL exists and whether its title/link matches the item. Marked
  structural controls are allowed to be missing or unrelated.

## What we know — conditions & controls

- `name-only` — task in words, no URL (baseline for lift).
- `url-only` — only the opaque id (headline treatment).
- `mdn-url-only` / `spec-url-only` / `bcd-key-only` — identifier probes
  (diagnostics, NOT headline): does a descriptive/canonical web id act as a
  retrieval key? Skipped (recorded as `skipped`, not scored 0) when the item
  lacks that id.
- `url+name` — opaque id + the task name.
- `full-content` — the real page fetched and pasted (ceiling).
- **Controls:** `fake-structural-url` (plausible but nonexistent, same shape) and
  `random-url` (unrelated real URL). Both should collapse toward `name-only` /
  zero. If they lift, URL *shape* or merely *having a URL* is doing the work.
- **Structural-control opaque URLs:** if `urls.opaque` itself is deliberately
  fake, missing, or unrelated, mark the item with
  `validation.opaqueRole = "structural-control"`. These rows are inspectable in
  the dashboard, but excluded from headline URL-memory lift.
- **Two tracks:** API-usage items (lift lives here) vs knowledge-calibration
  items (`groundTruth.expectUnknown`, where refusing is correct) — never average
  calibration into lift.

## What we know — current corpus hygiene

- Web-platform API items should use ChromeStatus IDs for the headline
  `url-only` opaque condition whenever a clean feature entry exists. The old SO
  pointers are retained as `validation.stackOverflowUrl` metadata rather than
  driving headline lift.
- RFC 9110 now uses Datatracker URLs for the opaque and full-content fields,
  because the old RFC Editor paths did not resolve cleanly.
- Several fake arXiv controls (`2312.00001`, `2501.00002`, `2503.00003`,
  `2507.00007`, `2601.00009`) were real papers. They were changed to
  `YYMM.99999` shaped IDs that currently return "Article not found".
- Live validation should be run after any corpus URL changes. Treat errors as
  blockers for real opaque evidence; treat diagnostic URL warnings separately
  from methodology failures.

## What we know — findings (directional; small n per cell)

These findings describe the current committed results artifacts unless
regenerated. Because the harness changed in `744fe71`, do not quote old
headline numbers as current protocol results until `results/*` are regenerated.

- **Opaque url-only is net-negative vs name-only for every model** — a bare
  opaque id usually does not help and often hurts.
- **It works ONLY for memorised canonical ids:** `arxiv-attention`
  (1706.03762) url-only 1.00 vs name-only 0.00; RFC 9110 1.00. Un-memorised or
  structural-control ids (fake/unrelated SO#, some ChromeStatus-shaped controls)
  → ~0.00 even when the model builds the same thing from the name. → opacity
  isn't the only barrier; *canonical-id memorisation* is.
- **Caveat on recent features:** post-cutoff `name-only` is high (model builds
  Feb–Jun 2026 features from the name), so negative post-cutoff lift means "the
  id gives nothing", not "can't build it". Need name-only-FAILS items (Task 3).
- **Open question this expansion tests:** do canonical WEB ids (spec URL / BCD
  key) act as a retrieval key for in-training features, the way an arXiv id
  does? (the `spec-url-only` / `bcd-key-only` probes on old + recent features.)

## Dates / provenance discipline

Every item carries `contentDate` (when the content/API surface existed). Cross
it against documented model cutoffs (`src/models.mjs`, `results/SOURCES.md`).
When a URL→content mapping appeared materially later than the feature, note it
in a corpus comment. Be explicit in the write-up about pre/post-cutoff splits
and about which identifier type each condition used.
