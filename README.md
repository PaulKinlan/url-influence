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
| Fully opaque | `arxiv.org/abs/2312.00752`, `rfc-editor.org/rfc/rfc9110`, `stackoverflow.com/questions/75643683`, a DOI | A pure id that says nothing |

The core conditions deliberately use the **fully opaque** URL, because that is the
strong form of the claim: a string of digits steering output can only be coming
from training memory, not from the words in the URL.

## The six conditions

For every (item x model) we run six matched prompts. The only thing that varies
between the first two is whether the task is named or given as a bare URL.

1. **name-only** (control) - describe the task by name, no URL.
2. **url-only** (the opaque test) - give ONLY the opaque URL string and say "do
   what is at that URL". Not fetched, not pasted.
3. **url+name** - the opaque URL plus the task name.
4. **full-content** (ceiling) - fetch the real page and paste it in.
5. **fake-structural-url** - a plausible but nonexistent URL of the same shape
   (e.g. a made-up `/Web/API/Xyz` or a fake arXiv id). Isolates whether URL
   *structure* alone steers output.
6. **random-url** - an unrelated real URL. Off-target control.

## Scoring

- **Structural check** (deterministic): what fraction of the item's real
  identifiers (method/property/spec names) appear in the output. For
  post-cutoff items the correct behaviour is to admit ignorance, so the
  structural signal flips to "did it honestly say it doesn't know".
- **LLM-as-judge**: one capable model (Claude Sonnet 4.5 by default) scores
  correctness 0..1 against the item's ground truth and flags whether the output
  used the real API surface or hallucinated.

## Key metric

Per model: mean correctness per condition, then **lift = url-only minus
name-only**, split by whether the item's `contentDate` is before or after the
model's cutoff. A positive pre-cutoff lift with a near-zero post-cutoff lift is
the signature predicted by the hypothesis.

See [`results/REPORT.md`](results/REPORT.md) and
[`results/summary.json`](results/summary.json) for the committed pilot run.

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

# Cheap pilot: a 6-item subset x 6 conditions x pilot models, then score + analyze.
npm run pilot

# Or step by step:
node src/run.mjs --pilot        # writes results/raw/*.json (gitignored)
node src/score.mjs              # writes results/scores.json
node src/analyze.mjs            # writes results/summary.json + results/REPORT.md

# Full corpus, all models that have a key present:
node src/run.mjs
```

Useful flags: `--items=id1,id2` and `--models=key1,key2` to target subsets.

### Environment variables

| Var | Used by | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic models + the default judge | yes (for Claude / judging) |
| `GEMINI_API_KEY` | Google Gemini models | yes (for Gemini) |
| `OPENAI_API_KEY` | OpenAI GPT-5.x models | optional (OpenAI auto-included iff set) |

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

All current Gemini models share a ~Jan 2025 cutoff, so the within-Google spread
is flat; the cross-model spread (Sep 2024 -> Jan 2026) is what tests the
boundary.

## Adding a model

Add one entry to `MODELS` in [`src/models.mjs`](src/models.mjs):

```js
{ key: "gpt-5", vendor: "openai", apiId: "gpt-5", cutoff: "2025-09",
  label: "GPT-5", pilot: false }
```

If the vendor is new (OpenAI, xAI/Grok, ...), add a one-function adapter to
`ADAPTERS` in [`src/providers.mjs`](src/providers.mjs) and a `hasKeyFor` branch.
Record the model's real knowledge cutoff - it is the load-bearing fact for the
pre/post-cutoff analysis.

## Adding a corpus item

Copy any item in [`src/corpus.mjs`](src/corpus.mjs) and fill the fields. Keep
`groundTruth.mustMention` to distinctive, real identifiers so the structural
check is meaningful. To put it in the pilot, add its id to `PILOT_ITEM_IDS`.

## Honest caveats

- Pilot scale is tiny - a few items per cell. Results are directional, not
  statistically significant.
- Cutoff dates are vendor-reported and approximate, so the pre/post boundary is
  fuzzy, especially for items near the line.
- "Opaque" only acts as a retrieval key if the model actually memorised that
  specific id. Famous arXiv ids and RFC numbers behave very differently from a
  random Stack Overflow question id (see the report).

## License

Apache-2.0. See [LICENSE](LICENSE).
