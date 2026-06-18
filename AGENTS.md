# Agent Operating Guide

This repo is a research harness, not an app benchmark. Preserve the experimental
invariants first; code style is secondary to defensible methodology.

## Research Question

Can an opaque identifier, especially a URL string that is not fetched, make an
LLM produce the content behind that URL because the URL-to-content mapping was
seen in training? The headline claim is only supported when:

- The URL or id is genuinely opaque.
- The URL actually points to the intended content.
- The page is not fetched or pasted except in `full-content`.
- The effect is compared against `name-only`.
- Pre/post cutoff splits use documented model cutoffs.

## Non-Negotiable Invariants

- No browsing/tool retrieval inside model prompts except the `full-content`
  condition, where the harness fetches the reference and pastes it.
- `url-only - name-only` on API-usage items is the headline lift. Identifier
  probes such as `mdn-url-only`, `spec-url-only`, and `bcd-key-only` are
  diagnostics, not headline evidence.
- Headline lift only uses API-usage items whose `urls.opaque` is intended to be
  a real pointer to the target content. If an opaque-looking SO/ChromeStatus/id
  URL is deliberately fake, missing, or unrelated, mark the item with
  `validation.opaqueRole = "structural-control"` and treat it as a control.
- Knowledge-calibration items with `groundTruth.expectUnknown` are reported
  separately. Do not average them into API-usage lift.
- Every scored output must be auditable: prompt, model output, judge prompt,
  raw judge response, parsed score, and structural hits/misses.
- Failed calls and not-applicable optional probes must not be scored as zero.
  They must remain labelled as run errors or skipped cells.

## Corpus Update Checklist

Before adding or changing an item in `src/corpus.mjs`:

1. Confirm the opaque URL resolves to the intended content.
2. Prefer canonical opaque ids: arXiv ids, RFC ids, ChromeStatus ids, DOI ids,
   or real Stack Overflow question ids that match the item.
3. Avoid arbitrary Stack Overflow ids for real opaque evidence. If you
   intentionally want a fake/unrelated SO-shaped or ChromeStatus-shaped control,
   add `validation.opaqueRole = "structural-control"`.
4. Use `npm run validate:live` after changing real opaque URLs. It will allow
   explicitly marked structural controls but should fail for unmarked broken
   real pointers.
5. Keep `target` independent of the opaque URL unless the condition explicitly
   includes the URL.
6. For recall items, make `name-only` a fair named baseline. Do not write
   "this arXiv id" unless the id is actually present in that condition.
7. Keep `mustMention` to distinctive identifiers, not generic words.
8. Set `contentDate` to the date the tested content/API surface existed. If the
   URL mapping appeared materially later, document that in a comment.
9. If adding `specUrl` or `bcdKey`, verify the optional probe condition is
   meaningful for that item.

## Run Workflow

Cheap local checks:

```bash
npm run validate
node --check src/validate-corpus.mjs
```

Full pilot:

```bash
npm run pilot
```

Full experiment:

```bash
npm run full
```

After corpus URL changes, run the live validator when network access is
acceptable:

```bash
npm run validate:live
```

Live validation can fail because the corpus is wrong, because a site is down, or
because a site is rate-limiting. Treat those cases differently in the write-up.

## Results Discipline

- Existing committed `results/*` describe the run that produced them. If corpus,
  conditions, models, or scoring change, say that old results are from an older
  protocol until rerun.
- Do not edit `results/scores.json`, `results/transcript.jsonl`, `RUNLOG.md`, or
  dashboard data by hand. Regenerate them from raw records.
- `results/raw/` and `results/judge-cache/` are local intermediates and remain
  gitignored.
- If OpenAI, Anthropic, or Google model ids/cutoffs change, update
  `src/models.mjs` and `results/SOURCES.md` together.

## Multi-Agent Coordination

**`PLAN.md` is the live coordination channel.** Read it before starting; claim
what you're touching under its _In progress_ list; record decisions, URL/method
knowledge, and findings there (not in this file — `AGENTS.md` is the fixed
guide, `PLAN.md` is the changing state).

Another agent may be editing this repo at the same time. Before editing shared
files, run `git status --short` and inspect relevant diffs. Work with existing
changes; do not revert or overwrite them unless the user explicitly asks.
Coordinate through `PLAN.md` and clear git commit messages — do not ask the user
to mediate.

Prefer small patches and leave unrelated generated artifacts alone unless the
current task requires regeneration.
