// Analysis: read results/scores.json, compute per-model mean correctness per
// condition, the KEY lift metric (url-only vs name-only), and split that lift by
// whether the item's contentDate falls before or after the model's cutoff.
//
// Writes results/summary.json and a readable results/REPORT.md.

import { MODELS, modelByKey } from "./models.mjs";
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

async function main() {
  const data = await readJson("results/scores.json");
  const scores = data.scores;
  const models = [...new Set(scores.map((s) => s.model))].map(modelByKey);

  const summary = {
    generatedAt: nowIso(),
    judgeModel: data.judgeModel,
    perModel: {},
  };

  for (const model of models) {
    const rows = scores.filter((s) => s.model === model.key);
    const byCond = {};
    for (const c of CONDITIONS) {
      const vals = rows.filter((r) => r.condition === c).map((r) => r.correctness);
      byCond[c] = mean(vals);
    }

    // Lift = url-only minus name-only (overall).
    const liftOverall =
      byCond["url-only"] != null && byCond["name-only"] != null
        ? byCond["url-only"] - byCond["name-only"]
        : null;

    // Split by pre/post cutoff.
    const split = { pre: {}, post: {} };
    for (const bucket of ["pre", "post"]) {
      for (const c of ["name-only", "url-only", "url+name", "full-content"]) {
        const vals = rows
          .filter(
            (r) =>
              r.condition === c &&
              relativeToCutoff(r.contentDate, model.cutoff) === bucket,
          )
          .map((r) => r.correctness);
        split[bucket][c] = mean(vals);
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
      lift: { overall: liftOverall, pre: liftPre, post: liftPost },
      split,
      n: rows.length,
    };
  }

  await writeJson("results/summary.json", summary);
  await writeReport(summary, models, data);
  console.log("[analyze] wrote results/summary.json + results/REPORT.md");
}

async function writeReport(summary, models, data) {
  const keys = models.map((m) => m.key);
  const L = [];
  L.push("# URL Influence: Pilot Results");
  L.push("");
  L.push(`Generated: ${summary.generatedAt}`);
  L.push(`Judge model: ${data.judgeModel || "(none / structural-only)"}`);
  L.push(`Judged outputs: ${data.judged} (judge failures: ${data.judgeFails})`);
  L.push("");
  L.push(
    "Correctness is 0..1 (LLM-as-judge, falling back to a structural " +
      "must-mention check where the judge was unavailable). Higher is better.",
  );
  L.push("");

  // Main table: rows = conditions, columns = models.
  L.push("## Mean correctness by condition x model");
  L.push("");
  L.push(
    `| Condition | ${models.map((m) => `${m.label} (cut ${m.cutoff})`).join(" | ")} |`,
  );
  L.push(`|---|${keys.map(() => "---").join("|")}|`);
  for (const c of CONDITIONS) {
    const cells = keys.map((k) => fmt(summary.perModel[k].byCondition[c]));
    L.push(`| ${c} | ${cells.join(" | ")} |`);
  }
  L.push("");

  // Lift table.
  L.push("## Key metric: lift of url-only vs name-only");
  L.push("");
  L.push(
    "Lift = mean(correctness | url-only) - mean(correctness | name-only). " +
      "A positive lift means a BARE OPAQUE URL alone improved the answer over " +
      "naming the task with no URL.",
  );
  L.push("");
  L.push(`| Model | overall lift | pre-cutoff lift | post-cutoff lift |`);
  L.push(`|---|---|---|---|`);
  for (const m of models) {
    const p = summary.perModel[m.key].lift;
    L.push(`| ${m.label} | ${sign(p.overall)} | ${sign(p.pre)} | ${sign(p.post)} |`);
  }
  L.push("");

  // Pre/post breakdown of absolute scores.
  L.push("## Pre- vs post-cutoff breakdown (absolute correctness)");
  L.push("");
  for (const m of models) {
    const s = summary.perModel[m.key].split;
    L.push(`### ${m.label} (cutoff ${m.cutoff})`);
    L.push("");
    L.push(`| bucket | name-only | url-only | url+name | full-content |`);
    L.push(`|---|---|---|---|---|`);
    for (const b of ["pre", "post"]) {
      L.push(
        `| ${b}-cutoff | ${fmt(s[b]["name-only"])} | ${fmt(s[b]["url-only"])} | ` +
          `${fmt(s[b]["url+name"])} | ${fmt(s[b]["full-content"])} |`,
      );
    }
    L.push("");
  }

  // Interpretation.
  L.push("## Interpretation (honest)");
  L.push("");
  L.push(interpret(summary, models));
  L.push("");
  L.push("---");
  L.push("");
  L.push(
    "_Pilot scale is tiny (a handful of items per cell), so treat these as " +
      "directional, not significant. Cutoff dates are approximate, so the " +
      "pre/post boundary is fuzzy, especially for items near the line._",
  );

  const { writeFile } = await import("node:fs/promises");
  await writeFile("results/REPORT.md", L.join("\n"));
}

function interpret(summary, models) {
  const lines = [];
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
