// Analysis: read results/scores.json, compute per-model mean correctness per
// condition, the KEY lift metric (url-only vs name-only), and split that lift by
// whether the item's contentDate falls before or after the model's cutoff.
//
// Writes results/summary.json and a readable results/REPORT.md.

import { MODELS } from "./models.mjs";
import { CONDITIONS } from "./conditions.mjs";
import { readJson, writeJson, nowIso } from "./util.mjs";

// Compare YYYY-MM(-DD) strings. Returns "before" or "after"/"on" relative to
// cutoff (treat equal-month as "after"/boundary, the harder case for the model).
function relativeToCutoff(contentDate, cutoff) {
  const norm = (s) => {
    const [y, m = "01", d = "01"] = s.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };
  return norm(contentDate) < norm(cutoff) ? "pre" : "post";
}

function mean(xs) {
  const v = xs.filter((x) => typeof x === "number");
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function fmt(x) {
  return x == null ? "  -  " : x.toFixed(2);
}

function sign(x) {
  if (x == null) return "  -  ";
  const s = x >= 0 ? "+" : "";
  return `${s}${x.toFixed(2)}`;
}

// Classify the reason a (model x condition) or bucket cell has no number, so
// blanks are NEVER silently empty in the report. Returns one of:
//   "ok"           - has at least one scored value
//   "no-data"      - no rows at all for this slice (e.g. an empty pre/post
//                    bucket because every item falls on one side of the cutoff)
//   "run-error"    - rows exist but every one had a run error (model call failed)
//   "judge-failed" - rows exist, ran ok, but the judge failed AND there was no
//                    structural fallback, so correctness is null
function blankReason(rows) {
  if (!rows.length) return "no-data";
  const haveNumber = rows.some((r) => typeof r.correctness === "number");
  if (haveNumber) return "ok";
  if (rows.every((r) => r.runError != null)) return "run-error";
  const anyJudgeFail = rows.some((r) => r.judge && r.judge.error != null);
  if (anyJudgeFail) return "judge-failed";
  return "no-data";
}

const BLANK_LABEL = {
  "no-data": "— (no items)",
  "run-error": "— (run error)",
  "judge-failed": "— (judge failed)",
  "skipped": "— (skipped: no key)",
};

// Render a mean value, or an explicit labelled blank when it's null.
function cell(value, rows) {
  if (value != null) return value.toFixed(2);
  return BLANK_LABEL[blankReason(rows || [])] || "—";
}

function cellSign(value, rows) {
  if (value != null) {
    const s = value >= 0 ? "+" : "";
    return `${s}${value.toFixed(2)}`;
  }
  return BLANK_LABEL[blankReason(rows || [])] || "—";
}

async function main() {
  const data = await readJson("results/scores.json");
  const scores = data.scores;
  // Show models in registry order, and only those that actually have rows.
  const present = new Set(scores.map((s) => s.model));
  const models = MODELS.filter((m) => present.has(m.key));
  // Models in the registry that produced NO rows at all (skipped: no key).
  const skippedModels = MODELS.filter((m) => !present.has(m.key));

  const summary = {
    generatedAt: nowIso(),
    judgeModel: data.judgeModel,
    skippedModels: skippedModels.map((m) => ({ key: m.key, label: m.label, vendor: m.vendor })),
    perModel: {},
  };

  for (const model of models) {
    const rows = scores.filter((s) => s.model === model.key);
    const byCond = {};
    const byCondRows = {};
    for (const c of CONDITIONS) {
      const cr = rows.filter((r) => r.condition === c);
      byCondRows[c] = cr;
      byCond[c] = mean(cr.map((r) => r.correctness));
    }

    // Lift = url-only minus name-only (overall).
    const liftOverall =
      byCond["url-only"] != null && byCond["name-only"] != null
        ? byCond["url-only"] - byCond["name-only"]
        : null;

    // Split by pre/post cutoff. Keep the per-bucket rows so blanks can be
    // labelled (an empty bucket = "no items on that side of the cutoff").
    const split = { pre: {}, post: {} };
    const splitRows = { pre: {}, post: {} };
    const splitN = {
      pre: rows.filter((r) => relativeToCutoff(r.contentDate, model.cutoff) === "pre").length,
      post: rows.filter((r) => relativeToCutoff(r.contentDate, model.cutoff) === "post").length,
    };
    for (const bucket of ["pre", "post"]) {
      for (const c of CONDITIONS) {
        const cr = rows.filter(
          (r) =>
            r.condition === c &&
            relativeToCutoff(r.contentDate, model.cutoff) === bucket,
        );
        splitRows[bucket][c] = cr;
        split[bucket][c] = mean(cr.map((r) => r.correctness));
      }
    }
    const liftPre =
      split.pre["url-only"] != null && split.pre["name-only"] != null
        ? split.pre["url-only"] - split.pre["name-only"]
        : null;
    const liftPost =
      split.post["url-only"] != null && split.post["name-only"] != null
        ? split.post["url-only"] - split.post["name-only"]
        : null;

    summary.perModel[model.key] = {
      label: model.label,
      cutoff: model.cutoff,
      byCondition: byCond,
      byCondRows, // retained in-memory for report blank-labelling
      lift: { overall: liftOverall, pre: liftPre, post: liftPost },
      split,
      splitRows, // retained in-memory for report blank-labelling
      splitN,
      n: rows.length,
    };
  }

  // Strip the in-memory row arrays before writing JSON (keep summary.json lean).
  const summaryOut = JSON.parse(
    JSON.stringify(summary, (k, v) =>
      k === "byCondRows" || k === "splitRows" ? undefined : v,
    ),
  );
  await writeJson("results/summary.json", summaryOut);
  await writeReport(summary, models, data, skippedModels);
  console.log("[analyze] wrote results/summary.json + results/REPORT.md");
}

async function writeReport(summary, models, data, skippedModels) {
  const keys = models.map((m) => m.key);
  const pm = summary.perModel;
  const L = [];
  L.push("# URL Influence: Results");
  L.push("");
  L.push(`Generated: ${summary.generatedAt}`);
  L.push(`Judge model: \`${data.judgeModel || "(none / structural-only)"}\``);
  L.push(`Judged outputs: ${data.judged} (judge failures: ${data.judgeFails})`);
  L.push("");

  // ---- How to read this -------------------------------------------------
  L.push("## How to read this");
  L.push("");
  L.push(
    "**Hypothesis.** An *opaque* URL (a bare arXiv id, RFC number, Stack " +
      "Overflow question id) carries no description of its content. If handing " +
      "the model only that URL string lifts output quality, the lift can only " +
      "come from the model having memorised that URL->content mapping during " +
      "training. So the lift should appear **only when the content behind the " +
      "URL predates the model's knowledge cutoff** (it could have been in the " +
      "training set), and should vanish for content created after the cutoff. " +
      "The model never browses; the page is never fetched except in the " +
      "explicit `full-content` ceiling condition.",
  );
  L.push("");
  L.push(
    "**Key metric — LIFT.** Per model: " +
      "`LIFT = mean(correctness | url-only) − mean(correctness | name-only)`. " +
      "`name-only` describes the task in words with no URL; `url-only` gives " +
      "ONLY the opaque URL. A positive lift means the bare URL alone improved " +
      "the answer over naming the task. The signature predicted by the " +
      "hypothesis is **positive pre-cutoff lift, ~zero post-cutoff lift**.",
  );
  L.push("");
  L.push(
    "**Correctness** is 0..1 from the LLM-as-judge (full judge prompts and " +
      "raw verdicts for every cell are in [RUNLOG.md](RUNLOG.md) / " +
      "[transcript.jsonl](transcript.jsonl) so each verdict can be validated). " +
      "Where the judge was unavailable it falls back to a deterministic " +
      "structural must-mention check.",
  );
  L.push("");
  L.push(
    "**Controls.** `fake-structural-url` (a plausible but nonexistent URL of " +
      "the same shape) and `random-url` (an unrelated real URL) should both " +
      "collapse toward ZERO lift — if URL *structure* or merely *having a URL* " +
      "were doing the work, these would also lift; they should not.",
  );
  L.push("");
  L.push(
    "**Blanks.** A blank cell is always labelled with its cause: " +
      "`— (no items)` (no corpus items fall in that pre/post bucket for this " +
      "model), `— (run error)` (every model call for that slice failed), " +
      "`— (judge failed)` (the judge errored with no structural fallback), or " +
      "`— (skipped: no key)` (the whole model was skipped for a missing API " +
      "key). Blanks are never silently empty.",
  );
  L.push("");

  // Models that ran vs were skipped / produced no usable rows.
  if (skippedModels && skippedModels.length) {
    L.push(
      "_Models with no scored rows this run (skipped for a missing API key, or " +
        "attempted but produced no usable output): " +
        skippedModels.map((m) => `${m.label} (\`${m.key}\`)`).join(", ") +
        ". In this run the OpenAI models were attempted but every call returned " +
        "HTTP 429 insufficient_quota (the available key had no quota), so they " +
        "yielded no data and are excluded; with a funded key they are included " +
        "with zero code change._",
    );
    L.push("");
  }

  // Model table with cited cutoffs.
  L.push("## Models");
  L.push("");
  L.push("| Model | Vendor | API id | Knowledge cutoff | Source |");
  L.push("|---|---|---|---|---|");
  for (const m of models) {
    const src = m.cutoffSource ? `[card](${m.cutoffSource})` : "-";
    L.push(
      `| ${m.label} | ${m.vendor} | \`${m.apiId}\` | ${m.cutoff} | ${src} |`,
    );
  }
  L.push("");
  L.push("See [SOURCES.md](SOURCES.md) for the full model -> cutoff -> source table.");
  L.push("");

  // ---- HEADLINE: lift split pre/post ------------------------------------
  L.push("## Headline: lift of url-only vs name-only, split by cutoff");
  L.push("");
  L.push(
    "`LIFT = mean(url-only) − mean(name-only)`. The boundary effect is " +
      "visible if **pre-cutoff lift > post-cutoff lift** (the URL helps for " +
      "content the model could have trained on, not for content after its " +
      "cutoff). `n pre/post` is how many scored cells fall each side.",
  );
  L.push("");
  L.push(`| Model | cutoff | overall lift | pre-cutoff lift | post-cutoff lift | n pre/post |`);
  L.push(`|---|---|---|---|---|---|`);
  for (const m of models) {
    const p = pm[m.key];
    const sr = p.splitRows;
    const preLiftCell =
      p.lift.pre != null
        ? cellSign(p.lift.pre)
        : cell(null, [...(sr.pre["url-only"] || []), ...(sr.pre["name-only"] || [])]);
    const postLiftCell =
      p.lift.post != null
        ? cellSign(p.lift.post)
        : cell(null, [...(sr.post["url-only"] || []), ...(sr.post["name-only"] || [])]);
    L.push(
      `| ${m.label} | ${m.cutoff} | ${cellSign(p.lift.overall, [
        ...(p.byCondRows["url-only"] || []),
        ...(p.byCondRows["name-only"] || []),
      ])} | ${preLiftCell} | ${postLiftCell} | ${p.splitN.pre}/${p.splitN.post} |`,
    );
  }
  L.push("");

  // ---- Pre/post correctness per condition, headline aggregated ----------
  L.push("## Pre- vs post-cutoff mean correctness, per condition");
  L.push("");
  L.push(
    "For each model, every corpus item is classified pre- or post-cutoff " +
      "(contentDate < cutoff = pre). Mean correctness per condition within " +
      "each bucket. The thing to look for: in the **pre** rows `url-only` " +
      "approaches `name-only`/`url+name`; in the **post** rows `url-only` " +
      "should NOT beat `name-only`, and the controls stay flat.",
  );
  L.push("");
  for (const m of models) {
    const p = pm[m.key];
    const s = p.split;
    const sr = p.splitRows;
    L.push(`### ${m.label} (cutoff ${m.cutoff}) — ${p.splitN.pre} pre / ${p.splitN.post} post`);
    L.push("");
    L.push(
      `| bucket | name-only | url-only | url+name | full-content | fake-structural-url | random-url |`,
    );
    L.push(`|---|---|---|---|---|---|---|`);
    for (const b of ["pre", "post"]) {
      L.push(
        `| ${b}-cutoff | ${cell(s[b]["name-only"], sr[b]["name-only"])} | ` +
          `${cell(s[b]["url-only"], sr[b]["url-only"])} | ` +
          `${cell(s[b]["url+name"], sr[b]["url+name"])} | ` +
          `${cell(s[b]["full-content"], sr[b]["full-content"])} | ` +
          `${cell(s[b]["fake-structural-url"], sr[b]["fake-structural-url"])} | ` +
          `${cell(s[b]["random-url"], sr[b]["random-url"])} |`,
      );
    }
    L.push("");
  }

  // ---- Full per (model x condition) table -------------------------------
  L.push("## Mean correctness by condition x model (all items)");
  L.push("");
  L.push(
    `| Condition | ${models.map((m) => `${m.label} (cut ${m.cutoff})`).join(" | ")} |`,
  );
  L.push(`|---|${keys.map(() => "---").join("|")}|`);
  for (const c of CONDITIONS) {
    const cells = keys.map((k) => cell(pm[k].byCondition[c], pm[k].byCondRows[c]));
    L.push(`| ${c} | ${cells.join(" | ")} |`);
  }
  L.push("");
  L.push(
    "The two control rows (`fake-structural-url`, `random-url`) are expected " +
      "to sit at or below `name-only`: a fake or unrelated URL carries no real " +
      "retrieval key, so it should give no lift.",
  );
  L.push("");

  // Interpretation.
  L.push("## Interpretation (honest)");
  L.push("");
  L.push(interpret(summary, models));
  L.push("");
  L.push("---");
  L.push("");
  L.push(
    "_Scale is small (a handful of items per cell), so treat these as " +
      "directional, not statistically significant. Cutoff dates are the " +
      "vendors' published values (see SOURCES.md); the pre/post boundary is " +
      "still fuzzy for items dated within a month or two of a cutoff. The " +
      "complete per-cell record — every prompt, every model output, and every " +
      "judge prompt + raw verdict — is in [RUNLOG.md](RUNLOG.md) and " +
      "[transcript.jsonl](transcript.jsonl)._",
  );

  const { writeFile } = await import("node:fs/promises");
  await writeFile("results/REPORT.md", L.join("\n"));
}

function interpret(summary, models) {
  const lines = [];

  // Cross-model aggregate framing first.
  const preLifts = models.map((m) => summary.perModel[m.key].lift.pre).filter((x) => x != null);
  const postLifts = models.map((m) => summary.perModel[m.key].lift.post).filter((x) => x != null);
  const aggPre = mean(preLifts);
  const aggPost = mean(postLifts);
  if (aggPre != null || aggPost != null) {
    const dir =
      aggPre != null && aggPost != null
        ? aggPre > aggPost + 0.03
          ? "Across models the bare-URL lift is larger for PRE-cutoff content than POST-cutoff content, the direction the hypothesis predicts (the URL behaving as a retrieval key into training)."
          : "Across models the pre- vs post-cutoff lift gap is small or reversed at this sample size, so the boundary effect is not cleanly demonstrated."
        : "Only one side of the cutoff has data across models, so the boundary comparison is incomplete.";
    lines.push(
      `- **Overall:** mean pre-cutoff lift ${sign(aggPre)}, mean post-cutoff lift ${sign(aggPost)}. ${dir}`,
    );
  }

  for (const m of models) {
    const p = summary.perModel[m.key];
    const lo = p.lift.overall;
    const bc = p.byCondition;
    let verdict;
    if (lo == null) verdict = "no comparable data";
    else if (lo > 0.1)
      verdict = `a bare opaque URL meaningfully steered output (overall lift ${sign(lo)})`;
    else if (lo > 0.02)
      verdict = `a bare opaque URL slightly helped (lift ${sign(lo)})`;
    else if (lo < -0.02)
      verdict = `a bare opaque URL did not help and may have hurt (lift ${sign(lo)})`;
    else verdict = `a bare opaque URL made little difference (lift ${sign(lo)})`;

    const ceil = bc["full-content"];
    const ctrl = bc["name-only"];
    const ceilNote =
      ceil != null && ctrl != null
        ? ` Ceiling (full pasted content) scored ${fmt(ceil)} vs name-only ${fmt(ctrl)}.`
        : "";
    const fakeNote =
      bc["fake-structural-url"] != null
        ? ` Fake-structural-URL scored ${fmt(bc["fake-structural-url"])} and random-URL ${fmt(bc["random-url"])} (controls for URL shape vs real content).`
        : "";
    const splitNote =
      p.lift.pre != null || p.lift.post != null
        ? ` Pre-cutoff lift ${sign(p.lift.pre)} vs post-cutoff lift ${sign(p.lift.post)}: ` +
          (p.lift.pre != null && p.lift.post != null && p.lift.pre > p.lift.post + 0.05
            ? "consistent with the URL acting as a retrieval key into training (effect concentrated on content the model could have seen)."
            : "the boundary effect is weak or mixed at this sample size.")
        : "";
    lines.push(`- **${m.label}:** ${verdict}.${ceilNote}${fakeNote}${splitNote}`);
  }
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
