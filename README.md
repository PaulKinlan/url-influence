# url-influence

Does an **opaque URL alone** steer an LLM's output, purely because the content
behind that URL was in the model's training data? And does that effect track the
model's **knowledge cutoff**, proving the URL is acting as a retrieval key into
the weights rather than as live context?

If a bare URL can stand in for pasted instructions, you can replace a wall of
pasted documentation with a single short string and save a lot of tokens. This
repo is a small, reproducible experiment to find out when that actually works.

## The hypothesis

1. **A URL is a pointer into training.** Models that were trained on the content
   behind a URL may reproduce that content's API surface / facts when handed only
   the URL string, without any browsing.
2. **The effect should be gated by the knowledge cutoff.** If the URL is just a
   retrieval key into the weights, it can only help for content that existed
   *before* the model's training cutoff. Content created after the cutoff should
   get no lift from the URL (the key points at nothing the model saw).
3. **Opacity matters, but canonical-ness matters more.** The interesting cases
   are *opaque* URLs (an arXiv id, an RFC number, a Stack Overflow question id, a
   DOI) that say nothing about their content. A URL only helps if the model
   actually memorised the mapping from that opaque id to its content.

We never let the model browse. In every condition except the explicit ceiling,
the page is **not fetched** and **not pasted**: the model must answer from memory.

## The opaque-URL spectrum

The corpus carries URLs at several opacity levels for every item:

| Opacity | Example | What the string reveals |
|---|---|---|
| Descriptive | `developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition` | The full API name is in the path |
| Semi-opaque | `github.com/WICG/view-transitions` | Owner/repo hints at the topic |
| Fully opaque | `arxiv.org/abs/2312.00752`, `datatracker.ietf.org/doc/rfc9110/`, `chromestatus.com/feature/5193009714954240`, a DOI | A pure id that says nothing |

The core conditions deliberately use the **fully opaque** URL, because that is the
strong form of the claim: a string of digits steering output can only be coming
from training memory, not from the words in the URL.

Some opaque-looking URLs are intentionally fake, missing, or unrelated controls.
Those items are marked in the corpus with
`validation.opaqueRole = "structural-control"` and are excluded from headline
URL-memory lift; they test whether URL shape alone steers or hallucinates.
For web-platform features, prefer ChromeStatus feature URLs as the headline
opaque pointer; Stack Overflow URLs can be retained as
`validation.stackOverflowUrl` metadata or used as explicit structural controls.

## Conditions

For every applicable (item x model) we run matched prompts. The key distinction
is **opaque** (a bare id that does not name the content) vs **descriptive /
canonical** (an id that names or describes the feature).

1. **described** (baseline) - describe the task by name, no URL.
2. **described-framed** (framing-matched baseline) - the same description, but in the
   exact "do whatever this describes" framing as `opaque-url`, so `opaque-url −
   described-framed` nets out the framing cost and isolates opaque-id-vs-description.
3. **opaque-url** (the OPAQUE test) - give ONLY the opaque id string and say "do
   what is at that URL". Not fetched, not pasted; the model must rely on memory.
4. **mdn-url-only / spec-url-only / bcd-key-only** - identifier probes (NOT in
   the headline lift). The MDN path, the canonical spec URL, and the Browser
   Compat Data key all *name* the feature to some degree, so these diagnose
   whether a descriptive/canonical id steers the model.
5. **url+described** - the opaque id plus the task name.
6. **full-content** (ceiling) - fetch the real page and paste it in.
7. **fake-structural-url** - a plausible but nonexistent URL of the same shape.
   NB for web items this is *descriptive* (the fake path still names an API).
8. **fake-opaque-url** - an OPAQUE-shaped fake id (fake chromestatus#/arXiv#/SO#),
   uniform across item types. Isolates whether opaque URL *shape* alone steers.
9. **random-url** - an unrelated real URL. Off-target control.

## Scoring

- **Structural check** (deterministic): what fraction of the item's real
  identifiers (method/property/spec names) appear in the output. For
  post-cutoff items the correct behaviour is to admit ignorance, so the
  structural signal flips to "did it honestly say it doesn't know".
- **LLM-as-judge**: one capable model (Claude Sonnet 4.5 by default) scores
  correctness 0..1 against the item's ground truth and flags whether the output
  used the real API surface or hallucinated.

## Key metric & what we find

The nominal metric is **lift = opaque-url − described** per model, split pre/post
cutoff. But a single averaged lift is **misleading**, because the effect is
**categorical, not continuous**: it depends on WHICH identifier, not how far
the content is from the cutoff. The honest result (see the report) is a set of
tiers, by identifier type:

- **Opaque numeric id** (ChromeStatus #, un-famous Stack Overflow #) → decodes
  to **~0**, pre or post-cutoff, even for features the model knows cold by name.
- **Famous, memorised opaque id** (landmark arXiv id, RFC number) → **~1.0**
  (e.g. `arxiv.org/abs/1706.03762` scores 1.0 from the bare id vs 0.0 from
  naming the task). Pure memorised retrieval.
- **Canonical web id** (Browser Compat Data key, spec URL) → **0.6–1.0** — but
  these are semi-descriptive (the key/path usually names the feature), so that
  is partly a hint, not pure opaque retrieval.

So a model can build something from an identifier when the id is a *famous
memorised opaque key* OR *names/describes the thing*; a truly-opaque, un-famous
id gives ~nothing.

See [`results/REPORT.md`](results/REPORT.md) (per-item + by-id-type tables,
worked judge examples) and the interactive
[dashboard](https://paulkinlan.github.io/url-influence/) for the full run.

> Known limitation (being addressed): the opaque-id corpus is currently thin and
> unbalanced per type (few RFC/SO/DOI items), so the pre/post split cannot yet be
> tested *within* an opaque-id type or separate fame from recency. A balanced
> popularity × cutoff grid across arXiv / CVE / PMID / RFC / Stack Overflow is
> planned.

## How to run

Requires Node >= 20. No dependencies (uses built-in `fetch`).

```bash
# API keys are read ONLY from the environment (never committed). They can be
# real environment variables OR placed in a gitignored local .env file (a tiny
# built-in loader reads KEY=VALUE lines; real env vars always win):
export ANTHROPIC_API_KEY=sk-ant-...
export GEMINI_API_KEY=...
export OPENAI_API_KEY=sk-...        # optional; OpenAI models run only if present

# ...or create a gitignored .env in the repo root:
#   ANTHROPIC_API_KEY=sk-ant-...
#   GEMINI_API_KEY=...
#   OPENAI_API_KEY=sk-...

# Cheap pilot: validate, run a 6-item subset, score, analyze, and rebuild dashboard.
npm run pilot

# Or step by step:
node src/validate-corpus.mjs  # cheap static checks before spending API budget
node src/run.mjs --pilot        # writes results/raw/*.json (gitignored)
node src/score.mjs              # writes results/scores.json
node src/transcript.mjs         # writes results/transcript.jsonl + RUNLOG.md
node src/analyze.mjs            # writes results/summary.json + results/REPORT.md
node src/dashboard.mjs          # writes results/dashboard.html + dashboard-data.js

# Full corpus, all models that have a key present:
npm run full

# Optional, network-sensitive: checks URL reachability and Stack Overflow title
# alignment for real opaque URLs. Structural-control opaque URLs are allowed to
# be fake/unrelated. Run after corpus URL changes, but do not require it in CI.
npm run validate:live
```

Useful flags: `--items=id1,id2` and `--models=key1,key2` to target subsets.

### Environment variables

| Var | Used by | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic models + the default judge | yes (for Claude / judging) |
| `GEMINI_API_KEY` | Google Gemini models | yes (for Gemini) |
| `OPENAI_API_KEY` | OpenAI GPT-5.x models | optional (auto-included iff set) |
| `GROK_API_KEY` | xAI Grok models | optional (auto-included iff set) |
| `Z_API_KEY` | z.ai / Zhipu GLM models | optional (auto-included iff set) |

Each vendor runs only if its key is present; otherwise the runner logs the
skipped models and proceeds. Keys are read from `process.env` or a gitignored
`.env`.

Keys are read only from `process.env`, or from a gitignored `.env` in the repo
root (a built-in loader, no dependency, parses simple `KEY=VALUE` lines and only
fills vars not already set, so real env vars win). `.env`, `node_modules/`, and
`results/raw/` are gitignored. Never paste a key into a tracked file. If
`OPENAI_API_KEY` is absent the runner clearly logs the skipped OpenAI models and
the experiment proceeds with the remaining providers; adding the key later
includes OpenAI with zero code change.

### Models

The current registry (`src/models.mjs`) uses each vendor's current flagships
plus a few older models for cutoff spread. Every cutoff is the vendor's
published value with a cited source; see [`results/SOURCES.md`](results/SOURCES.md).

| Model | Vendor | API id | Cutoff |
|---|---|---|---|
| Claude Opus 4.8 | Anthropic | `claude-opus-4-8` | 2026-01-31 |
| Claude Sonnet 4.6 | Anthropic | `claude-sonnet-4-6` | 2026-01-31 |
| Claude Opus 4.6 | Anthropic | `claude-opus-4-6` | 2025-08-31 |
| Claude Sonnet 4.5 | Anthropic | `claude-sonnet-4-5-20250929` | 2025-07-31 |
| Gemini 3.1 Pro | Google | `gemini-3.1-pro-preview` | 2025-01-31 |
| Gemini 3.5 Flash | Google | `gemini-3.5-flash` | 2025-01-31 |
| GPT-5.5 | OpenAI | `gpt-5.5` | 2025-12-01 |
| GPT-5.2 | OpenAI | `gpt-5.2` | 2025-08-31 |
| GPT-5 | OpenAI | `gpt-5` | 2024-09-30 |
| Grok 4.3 | xAI | `grok-4.3` | 2025-12-31 |
| Grok 4 | xAI | `grok-4` | 2024-11-30 |
| GLM-5.2 | z.ai / Zhipu | `glm-5.2` | 2025-10-31 (estimate) |
| GLM-5.1 | z.ai / Zhipu | `glm-5.1` | 2025-10-31 (estimate) |

13 models across 5 vendors. All current Gemini share a ~Jan 2025 cutoff (flat
within-Google); the cross-model spread (Sep 2024 → Jan 2026) tests the boundary.
z.ai publishes no GLM-5 cutoff, so it is an ESTIMATE — verify before trusting
GLM pre/post splits.

## Adding a model

Add one entry to `MODELS` in [`src/models.mjs`](src/models.mjs):

```js
{ key: "gpt-5", vendor: "openai", apiId: "gpt-5", cutoff: "2025-09",
  label: "GPT-5", pilot: false }
```

If the vendor is new, add a one-function adapter and one entry to the `VENDORS`
map in [`src/providers.mjs`](src/providers.mjs) (`{ env, adapter }`) — that single
map drives `callModel` / `hasKeyFor` / `keyEnvFor`. OpenAI-compatible endpoints
can reuse `callOpenAICompatible`. Record the model's real knowledge cutoff — it
is the load-bearing fact for the pre/post-cutoff analysis.

## Adding a corpus item

Copy any item in [`src/corpus.mjs`](src/corpus.mjs) and fill the fields. Keep
`groundTruth.mustMention` to distinctive, real identifiers so the structural
check is meaningful. To put it in the pilot, add its id to `PILOT_ITEM_IDS`.

## Analysis methodology

There are two analyses in this repo. The first asks *does an opaque URL make a
model reproduce its content?* The second grew out of it: *when a URL fails, is it
because the content never made it into the training data, e.g. because the page
is a JavaScript shell the crawler couldn't read?*

### 1. Opaque-URL decoding (the experiment)

Each corpus item carries an **opaque id** (e.g. an arXiv number, a ChromeStatus
feature id, a Wikipedia `curid`) and a **descriptive name** for the same content.
Every item is run through the [conditions](#conditions) above against every
[model](#models), and an LLM-as-judge scores correctness 0..1. Items are split
into three tracks that are never averaged together: `code`/API-usage (the lift
metric lives here), `recall` opaque-id decoding (analysed by id-type, popularity,
and pre/post knowledge-cutoff), and knowledge-calibration (`expectUnknown`, where
the correct answer is to decline). Net finding: an opaque id decodes only in
proportion to how often that exact id was written next to its content in training
(fame), and only pre-cutoff. The cleanest control is **Wikipedia `curid`**: the
article content is unquestionably in every model, yet the numeric curid decodes
0.00, because content-in-training is necessary but not sufficient — the id has to
be a memorised handle.

### 2. Common Crawl shell survey

**Question.** "Present in Common Crawl" (the CDX index says the URL was captured)
is not the same as "the content is in the crawl". A client-rendered single-page
app is fetched fine but the captured bytes are an empty shell; the real content
is injected by JavaScript, which the crawler never runs. How common is that?

**Data + sampling.** A monthly crawl (`CC-MAIN-YYYY-NN`) publishes WARC (raw HTTP
responses), WAT (metadata) and WET (extracted text) files, ~100k of each. We
stream a random sample of WARC files (`--files`, `--max` caps response records per
file), and only analyse **HTTP 200, `text/html`** responses. `--accumulate` merges
each batch into the running survey and skips already-used files, so a large sample
is built in checkpointed batches. **The exact list of WARC files used is logged in
`results/cc-shell-survey.json` (`warcFiles`) so anyone can re-fetch them from
`https://data.commoncrawl.org/<path>` and re-run the analysis.**

**Shell definition.** A page is a *confirmed shell* only when ALL of:
1. it is a real page (200, `text/html`);
2. **tiny visible text** — after stripping `<script>`/`<style>`/tags/entities, the
   visible text is under the threshold (default 300 chars);
3. **tiny inline-JSON content** — content often hides in `<script type="application/
   json">` (Next.js `__NEXT_DATA__`, Nuxt/Redux/Apollo state, JSON-LD). A model
   training on raw bytes *does* see this, so if the inline JSON is large the page is
   counted as **content-present (`data-in-html`), not a shell**;
4. **a client-render signature** — a framework marker (React, Angular, AngularJS,
   Vue, Ember, Svelte, Solid, Next, Nuxt, Preact), a jQuery handler that builds the
   DOM on load, or a generic SPA skeleton (`id="root"`/`"app"`, "enable JavaScript",
   "Loading…"). A near-empty page with no such signal is a *thin page*, not a shell.

Shells are attributed to the detected framework (pure CSR with no attributable
framework → `unattributed`). Each page's registered domain is joined to the
**Majestic Million** ranking (progressive-suffix match) and bucketed into
popularity tiers. **Tier counts are pages, not sites** — one popular domain
contributes many crawled pages. Raw HTML size is tracked for shells vs all pages
(shells are large HTML with almost no text).

**Scripts.**
- [`src/cc-shell-survey.mjs`](src/cc-shell-survey.mjs) — fast first cut over WET
  (extracted text); flags near-empty pages (an upper bound, includes thin pages).
- [`src/cc-shell-confirm.mjs`](src/cc-shell-confirm.mjs) — the confirmer over WARC
  (raw HTML): the strict definition above + framework attribution + rank join +
  `--accumulate`. Writes `results/cc-shell-survey.json`.
- [`src/cc-frameworks.mjs`](src/cc-frameworks.mjs) — shared framework / SPA /
  inline-JSON signatures and the `classify()` rule.
- [`src/shell-dashboard.mjs`](src/shell-dashboard.mjs) — renders the survey JSON to
  an embeddable `results/shell-survey.html`.
- [`src/cc-content-check.mjs`](src/cc-content-check.mjs) — pulls the actual WARC
  bytes for specific corpus URLs (CDX presence vs content presence).
- [`src/cc-warc-fetch.mjs`](src/cc-warc-fetch.mjs) — slice-by-site shell check from
  WARC coordinates supplied by a DuckDB query of the columnar cc-index.

**Method caveats.**
- Detection is from raw HTML only: a pure client-side React app that ships just
  `<div id="root"></div>` and an opaque bundle is not attributable to a framework
  (lands in `unattributed`), and specific frameworks can be undercounted. The
  by-framework split is approximate; the overall shell rate is more robust.
- "Near-empty text" alone over-counts shells (login/captcha/listing stubs); the
  inline-JSON and client-render-signature requirements filter most of those out.
- The registered-domain match is a heuristic for exotic multi-part TLDs.
- Results are estimates from a sample of one crawl, and the definition is
  conservative, so read the shell rate as a floor.

**Headline result** (568k pages across 48 WARC files of CC-MAIN-2026-08): 1.2% of
crawled HTML pages are confirmed JS shells; shells average ~53KB of HTML with
almost no text; and shells are **more** common on popular sites (top-1k ≈ 2.5%,
1k–10k ≈ 2.8%) than the long tail (≈ 0.85%).

## Caveats

- Scale is small (a handful of items per cell), so treat results as directional.
- **The opaque-id corpus is thin and unbalanced per type** (few RFC/SO/DOI, many
  ChromeStatus). You cannot yet test pre/post *within* an opaque-id type or
  separate fame from recency — a balanced popularity × cutoff grid is planned.
- Cutoff dates are vendor-reported and approximate; the pre/post boundary is
  fuzzy near the line (content dates pad to mid-month vs month-end cutoffs).
- The judge is a single LLM (Claude Sonnet 4.5) and grades ~86% binary; cross-
  vendor judge validation is a planned improvement.
- "Opaque" only acts as a retrieval key if the model memorised that specific id.
  Famous arXiv/RFC ids behave very differently from an un-famous numeric id; the
  canonical web-id probes (BCD/spec) are semi-descriptive, not pure-opaque.

## License

Apache-2.0. See [LICENSE](LICENSE).
