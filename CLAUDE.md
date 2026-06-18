# Claude Project Guide

Use `AGENTS.md` as the canonical operating guide for this repo. It defines the
research hypothesis, corpus update checklist, run workflow, result discipline,
and multi-agent coordination rules.

Coordinate through `PLAN.md` — the live shared channel for status, task claims,
and what we've learned about the URLs and methodology. Read it before starting
and record decisions/findings there (AGENTS.md is fixed; PLAN.md changes).

Claude-specific reminders:

- Be conservative about causal claims. The harness can show URL-only lift or
  failure; it cannot prove memorization unless the opaque URL is verified as a
  real pointer to the intended content.
- Keep API-usage lift separate from knowledge-calibration refusal behavior.
- Treat `validation.opaqueRole = "structural-control"` items as intentional
  fake/unrelated opaque controls, not headline URL-memory evidence.
- Prefer ChromeStatus for web-platform `urls.opaque`; retain SO pointers as
  `validation.stackOverflowUrl` metadata when useful.
- Run `npm run validate` before spending model API budget.
- Run `npm run validate:live` after changing opaque URLs or source URLs.
- If another agent has uncommitted edits, merge around them rather than
  reverting them.
