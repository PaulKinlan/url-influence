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
- (2026-06-18) Identifier-probe + old-feature expansion: added conditions
  `mdn-url-only` / `spec-url-only` / `bcd-key-only` (diagnostics) and 6
  pre-Chrome-80 in-training features + spec/BCD backfill on a few recent items.
  A full run is populating `results/raw` (resume-skips existing cells). After it
  lands: regenerate score→transcript→analyze→dashboard from raw, then commit.

### Next / open
- **Task 3 (the thesis-prover):** source post-cutoff features where `name-only`
  itself FAILS. Current post-cutoff items are too guessable (high `name-only`),
  so they show "opaque id gives nothing", not "model can't build it".
- Decide whether the 6 old-feature `url-only` SO ids stay as documented
  uncrawled controls or are replaced (see methodology note below).

### Done
- Current flagship models + cited cutoffs; cutoff-spanning corpus.
- Auditable transcript (`RUNLOG.md` / `transcript.jsonl`) + interactive
  `dashboard.html`; GitHub Pages live at https://paulkinlan.github.io/url-influence/ .
- Split API-usage vs knowledge-calibration tracks; lift computed on API-usage only.
- Full 9-model coverage incl. OpenAI; GPT-5 empty-completion fix (bigger budget
  + `reasoning_effort=low`).

---

## What we know — identifiers & opacity

The `url-only` condition gives ONLY an identifier string; the page is never
fetched. Which identifier we use determines what "opaque" means:

| id type | example | opacity | in training? |
|---|---|---|---|
| arXiv id | `arxiv.org/abs/1706.03762` | opaque (number) | yes, openly crawled |
| RFC id | `rfc-editor.org/rfc/rfc9110` / datatracker | opaque (number) | yes |
| DOI | `doi.org/...` | opaque | usually |
| ChromeStatus id | `chromestatus.com/feature/<n>` | opaque (number) | partial |
| **Stack Overflow id** | `stackoverflow.com/questions/<n>` | opaque (number) | **NO — see below** |
| MDN URL | `/Web/API/fetch` | **descriptive** (names the API) | yes |
| spec URL | `fetch.spec.whatwg.org`, `w3.org/TR/...`, `tc39.es/...` | canonical, semi-descriptive | yes |
| BCD key | `api.fetch`, `css.properties.grid` | canonical, terse | yes (BCD is widely mirrored) |

### Stack Overflow is NOT crawlable → not a fair "opaque" baseline
StackOverflow's `robots.txt` aggressively blocks crawlers; empirically even the
Anthropic search user-agent is refused (`WebSearch allowed_domains:
stackoverflow.com` → "domains not accessible"). So SO Q&A content is almost
certainly **absent from training**. Consequences:
- A SO-id `url-only` conflates "un-memorised id" with "content never crawled" —
  it is a *provably-uncrawled* negative control, not a fair retrieval test.
- We **cannot verify** that a SO id maps to the intended question (nothing can
  crawl SO), so SO opaque ids in the corpus are effectively synthetic. Treat
  `url-only`(SO) as a floor/control, not evidence about canonical keys.

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
- **Two tracks:** API-usage items (lift lives here) vs knowledge-calibration
  items (`groundTruth.expectUnknown`, where refusing is correct) — never average
  calibration into lift.

## What we know — findings (directional; small n per cell)

- **Opaque url-only is net-negative vs name-only for every model** — a bare
  opaque id usually does not help and often hurts.
- **It works ONLY for memorised canonical ids:** `arxiv-attention`
  (1706.03762) url-only 1.00 vs name-only 0.00; RFC 9110 1.00. Un-memorised ids
  (SO#, chromestatus#) → ~0.00 even when the model builds the same thing from
  the name. → opacity isn't the barrier; *canonical-id memorisation* is.
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
