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
