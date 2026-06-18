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
- (2026-06-18, opus agent) Regenerating committed results for the current
  protocol (40 items × 9 conditions × 13 models incl. Grok). Stopping the stale
  in-flight run (loaded pre-ChromeStatus corpus + 9-model list), clearing
  `url-only`/`url+name` raw + judge-cache cells (opaque ids changed to
  ChromeStatus), then a clean full run → score → transcript → analyze →
  dashboard → commit. z.ai is funded now but returns intermittent 429s despite
  balance (admin dashboard lags ~10 min) — added 429/5xx retry with exponential
  backoff + jitter (honours Retry-After) to the z.ai adapter and re-launched the
  run with it so GLM cells retry rather than fail.

### Next / open
- **Regenerate committed results for the new protocol.** The harness now has 40
  items, 9 conditions, optional skipped-cell handling, and
  `validation.opaqueRole = "structural-control"` filtering. Existing
  committed `results/*` were generated before that filtering and should be
  treated as old-protocol artifacts until regenerated from raw.
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

### Done
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
