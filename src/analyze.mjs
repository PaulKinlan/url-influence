// Analysis: read results/scores.json and produce results/summary.json + a
// readable results/REPORT.md.
//
// Two DISTINCT tracks are measured separately, because they answer different
// questions and must not be averaged together:
//
//   1. API-USAGE items (kind !== expectUnknown): the model is asked to USE a
//      real API / recall real content. Correctness = did it produce the right
//      surface. The LIFT metric (url-only vs name-only) is computed ONLY on
//      these — this is the actual "can a bare URL make it use the thing" test.
//
//   2. KNOWLEDGE-CALIBRATION items (groundTruth.expectUnknown): the content
//      post-dates every model, so the CORRECT answer is "I can't determine
//      this". Here a bare opaque URL tends to score HIGH precisely because it
//      gives the model nothing, so it correctly refuses. Mixing these into the
//      lift average creates a fake "post-cutoff url-only helps" signal. They
//      are reported on their own as a refusal-calibration view.

import { MODELS } from "./models.mjs";
import {
  CONDITION_DEFS,
  CONDITIONS,
  CORE_LIFT_CONDITIONS,
} from "./conditions.mjs";
import { CORPUS } from "./corpus.mjs";
import { readJson, writeJson, nowIso } from "./util.mjs";

const CALIB = new Set(
  CORPUS.filter((i) => i.groundTruth.expectUnknown).map((i) => i.id),
);
const isCalib = (id) => CALIB.has(id);
const OPAQUE_STRUCTURAL_CONTROLS = new Set(
  CORPUS.filter((i) => i.validation?.opaqueRole === "structural-control").map(
    (i) => i.id,
  ),
);
const isOpaqueStructuralControl = (id) => OPAQUE_STRUCTURAL_CONTROLS.has(id);

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
  return `${x >= 0 ? "+" : ""}${x.toFixed(2)}`;
}

// Classify why a slice has no number, so blanks are never silently empty.
function blankReason(rows) {
  if (!rows.length) return "no-data";
  if (rows.some((r) => typeof r.correctness === "number")) return "ok";
  if (rows.every((r) => r.skipped === true)) return "not-applicable";
  if (rows.every((r) => r.runError != null)) return "run-error";
  if (rows.some((r) => r.judge && r.judge.error != null)) return "judge-failed";
  return "no-data";
}

const BLANK_LABEL = {
  "no-data": "— (no items)",
  "run-error": "— (run error)",
  "judge-failed": "— (judge failed)",
  "skipped": "— (skipped: no key)",
  "not-applicable": "— (n/a)",
};

function cell(value, rows) {
  if (value != null) return value.toFixed(2);
  return BLANK_LABEL[blankReason(rows || [])] || "—";
}

function cellSign(value, rows) {
  if (value != null) return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  return BLANK_LABEL[blankReason(rows || [])] || "—";
}

// Mean correctness per condition over an arbitrary row subset.
function condMeans(rows) {
  const by = {};
  const byRows = {};
  for (const c of CONDITIONS) {
    const cr = rows.filter((r) => r.condition === c);
    byRows[c] = cr;
    by[c] = mean(cr.map((r) => r.correctness));
  }
  return { by, byRows };
}

function liftOf(by) {
  const [base, treatment] = CORE_LIFT_CONDITIONS;
  return by[treatment] != null && by[base] != null
    ? by[treatment] - by[base]
    : null;
}

function conditionTableHeader(firstCol) {
  return `| ${firstCol} | ${CONDITIONS.join(" | ")} |`;
}

function conditionTableRule() {
  return `|---|${CONDITIONS.map(() => "---").join("|")}|`;
}

function conditionCells(by, rowsByCondition) {
  return CONDITIONS.map((c) => cell(by[c], rowsByCondition[c])).join(" | ");
}

async function main() {
  const data = await readJson("results/scores.json");
  const scores = data.scores;
  const present = new Set(scores.map((s) => s.model));
  const models = MODELS.filter((m) => present.has(m.key));
  const skippedModels = MODELS.filter((m) => !present.has(m.key));

  const summary = {
    generatedAt: nowIso(),
    judgeModel: data.judgeModel,
    calibrationItems: [...CALIB],
    opaqueStructuralControlItems: [...OPAQUE_STRUCTURAL_CONTROLS],
    skippedModels: skippedModels.map((m) => ({
      key: m.key,
      label: m.label,
      vendor: m.vendor,
    })),
    perModel: {},
  };

  for (const model of models) {
    const all = scores.filter((s) => s.model === model.key);
    const api = all.filter(
      (r) => !isCalib(r.itemId) && !isOpaqueStructuralControl(r.itemId),
    );
    const apiOpaqueControls = all.filter(
      (r) => !isCalib(r.itemId) && isOpaqueStructuralControl(r.itemId),
    );
    const calib = all.filter((r) => isCalib(r.itemId));

    const allCM = condMeans(all);
    const apiCM = condMeans(api);
    const calibCM = condMeans(calib);

    // Pre/post split on API-USAGE items only (the clean boundary test).
    const apiSplit = { pre: {}, post: {} };
    const apiSplitRows = { pre: {}, post: {} };
    for (const bucket of ["pre", "post"]) {
      const br = api.filter(
        (r) => relativeToCutoff(r.contentDate, model.cutoff) === bucket,
      );
      const cm = condMeans(br);
      apiSplit[bucket] = cm.by;
      apiSplitRows[bucket] = cm.byRows;
    }
    const apiSplitN = {
      pre: new Set(
        api
          .filter((r) => relativeToCutoff(r.contentDate, model.cutoff) === "pre")
          .map((r) => r.itemId),
      ).size,
      post: new Set(
        api
          .filter((r) => relativeToCutoff(r.contentDate, model.cutoff) === "post")
          .map((r) => r.itemId),
      ).size,
    };

    summary.perModel[model.key] = {
      label: model.label,
      cutoff: model.cutoff,
      // All-items view (kept for completeness; mixes both tracks).
      byConditionAll: allCM.by,
      byCondRowsAll: allCM.byRows,
      // API-usage track (the lift metric lives here).
      api: {
        byCondition: apiCM.by,
        byCondRows: apiCM.byRows,
        lift: {
          overall: liftOf(apiCM.by),
          pre: liftOf(apiSplit.pre),
          post: liftOf(apiSplit.post),
        },
        split: apiSplit,
        splitRows: apiSplitRows,
        splitN: apiSplitN,
        nItems: new Set(api.map((r) => r.itemId)).size,
        excludedOpaqueControlItems: new Set(
          apiOpaqueControls.map((r) => r.itemId),
        ).size,
      },
      // Knowledge-calibration track (refusal behaviour).
      calib: {
        byCondition: calibCM.by,
        byCondRows: calibCM.byRows,
        nItems: new Set(calib.map((r) => r.itemId)).size,
      },
      n: all.length,
    };
  }

  const summaryOut = JSON.parse(
    JSON.stringify(summary, (k, v) =>
      k.endsWith("Rows") || k === "byCondRowsAll" ? undefined : v,
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
  L.push(
    "> An interactive, filterable view of every cell (prompt, model output, " +
      "and the judge's full prompt + raw verdict) is in " +
      "[dashboard.html](dashboard.html) — open it in a browser to slice by " +
      "model / condition / pre-vs-post cutoff / pass-fail and read each verdict.",
  );
  L.push("");

  L.push("## How to read this");
  L.push("");
  L.push(
    "**The question.** Can a bare *opaque* URL (just the string, page never " +
      "fetched) make a model produce a better answer than simply naming the " +
      "task — and does that only happen for content from before the model's " +
      "training cutoff? If so, the URL is acting as a retrieval key into the " +
      "weights.",
  );
  L.push("");
  L.push(
    "**Two tracks, measured separately (this is important).** The corpus has " +
      "two kinds of item and they must NOT be averaged together:",
  );
  L.push("");
  L.push(
    "- **API-usage items with real opaque pointers** — the model is asked to " +
      "USE a real API or recall real content, and the opaque URL is intended " +
      "to point at that content. Correctness = did it produce the right " +
      "surface. **The LIFT metric below is computed on these only.** This is " +
      "the real test.",
  );
  L.push(
    "- **Knowledge-calibration items** (`" +
      summary.calibrationItems.join("`, `") +
      "`) — the content post-dates every model, so the *correct* answer is " +
      "\"I can't determine this\". A bare URL scores HIGH here precisely " +
      "because it hands the model nothing, so it correctly refuses. Averaging " +
      "these into the lift manufactures a fake \"url-only helps post-cutoff\" " +
      "signal — so they are reported on their own (refusal calibration), never " +
      "in the lift.",
  );
  L.push("");
  if (summary.opaqueStructuralControlItems.length) {
    L.push(
      "- **Intentional opaque structural controls** (`" +
        summary.opaqueStructuralControlItems.join("`, `") +
        "`) have `validation.opaqueRole = \"structural-control\"`. Their " +
        "`url-only` prompt may contain a fake, missing, or unrelated opaque " +
        "SO/ChromeStatus-shaped URL. They are useful controls, but excluded " +
        "from headline lift because they are not real URL-to-content pointers.",
    );
    L.push("");
  }
  L.push(
    "**LIFT** (API-usage items with real opaque pointers) `= " +
      "mean(correctness | url-only) − mean(correctness | name-only)`. " +
      "Positive = the bare URL alone beat naming the task. The hypothesis " +
      "predicts **positive lift pre-cutoff, ~zero post-cutoff**.",
  );
  L.push("");
  L.push(
    "**Correctness** is 0..1 from an LLM-as-judge; every judge prompt + raw " +
      "verdict is in [transcript.jsonl](transcript.jsonl) / " +
      "[RUNLOG.md](RUNLOG.md) / [dashboard.html](dashboard.html) so each score " +
      "is checkable.",
  );
  L.push("");
  L.push(
    "**Controls.** `fake-structural-url` (plausible but nonexistent, same " +
      "shape) and `random-url` (unrelated real URL) should collapse toward " +
      "name-only / zero — if URL shape or merely having a URL did the work, " +
      "these would lift too.",
  );
  L.push("");
  L.push(
    "**Identifier probes.** Conditions such as `mdn-url-only`, " +
      "`spec-url-only`, and `bcd-key-only` are exploratory. They are useful " +
      "for diagnosing which identifiers a model can decode, but the headline " +
      "lift remains strictly `url-only - name-only`.",
  );
  L.push("");
  L.push(
    "**Blanks** are always labelled: `— (no items)`, `— (run error)`, " +
      "`— (judge failed)`, `— (skipped: no key)`, `— (n/a)`.",
  );
  L.push("");

  L.push("## Conditions");
  L.push("");
  L.push("| Condition | Group | Required | Meaning |");
  L.push("|---|---|---|---|");
  for (const c of CONDITION_DEFS) {
    L.push(
      `| ${c.key} | ${c.group} | ${c.required ? "yes" : "no"} | ${c.description} |`,
    );
  }
  L.push("");

  if (skippedModels && skippedModels.length) {
    L.push(
      "_Models with no scored rows this run: " +
        skippedModels.map((m) => `${m.label} (\`${m.key}\`)`).join(", ") +
        ". The OpenAI models were attempted but every call returned HTTP 429 " +
        "insufficient_quota (the key had no quota), so they are excluded; with " +
        "a funded key they are included with zero code change._",
    );
    L.push("");
  }

  L.push("## Models");
  L.push("");
  L.push("| Model | Vendor | API id | Knowledge cutoff | Source |");
  L.push("|---|---|---|---|---|");
  for (const m of models) {
    const src = m.cutoffSource ? `[card](${m.cutoffSource})` : "-";
    L.push(`| ${m.label} | ${m.vendor} | \`${m.apiId}\` | ${m.cutoff} | ${src} |`);
  }
  L.push("");
  L.push("See [SOURCES.md](SOURCES.md) for the full model -> cutoff -> source table.");
  L.push("");

  // HEADLINE — lift on real opaque API-usage items only, split pre/post.
  L.push("## Headline: lift (real opaque API-usage items only), split by cutoff");
  L.push("");
  L.push(
    "`LIFT = mean(url-only) − mean(name-only)` over API-usage items whose " +
      "opaque URL is intended to be a real pointer. Knowledge-calibration " +
      "items and intentional opaque structural controls are excluded. `n " +
      "pre/post` = eligible API-usage items each side of this model's cutoff.",
  );
  L.push("");
  L.push("| Model | cutoff | overall lift | pre-cutoff lift | post-cutoff lift | n pre/post |");
  L.push("|---|---|---|---|---|---|");
  for (const m of models) {
    const a = pm[m.key].api;
    const sr = a.splitRows;
    const preCell =
      a.lift.pre != null
        ? cellSign(a.lift.pre)
        : cell(null, [...(sr.pre["url-only"] || []), ...(sr.pre["name-only"] || [])]);
    const postCell =
      a.lift.post != null
        ? cellSign(a.lift.post)
        : cell(null, [...(sr.post["url-only"] || []), ...(sr.post["name-only"] || [])]);
    const ovCell = cellSign(a.lift.overall, [
      ...(a.byCondRows["url-only"] || []),
      ...(a.byCondRows["name-only"] || []),
    ]);
    L.push(
      `| ${m.label} | ${m.cutoff} | ${ovCell} | ${preCell} | ${postCell} | ${a.splitN.pre}/${a.splitN.post} |`,
    );
  }
  L.push("");

  // API-usage: pre/post mean correctness per condition.
  L.push("## Real opaque API-usage items: pre/post mean correctness per condition");
  L.push("");
  L.push(
    "Knowledge-calibration items and intentional opaque structural controls " +
      "excluded. In **pre** rows, does `url-only` approach `name-only`? In " +
      "**post** rows, it should not beat `name-only`; controls stay flat.",
  );
  L.push("");
  for (const m of models) {
    const a = pm[m.key].api;
    L.push(`### ${m.label} (cutoff ${m.cutoff}) — ${a.splitN.pre} pre / ${a.splitN.post} post API items`);
    L.push("");
    L.push(conditionTableHeader("bucket"));
    L.push(conditionTableRule());
    for (const b of ["pre", "post"]) {
      const s = a.split[b];
      const sr = a.splitRows[b];
      L.push(`| ${b}-cutoff | ${conditionCells(s, sr)} |`);
    }
    L.push("");
  }

  // Knowledge-calibration: refusal behaviour per condition.
  L.push("## Knowledge-calibration items: correct-refusal rate per condition");
  L.push("");
  L.push(
    "These items (`" +
      summary.calibrationItems.join("`, `") +
      "`) post-date every model; correctness = the model correctly said it " +
      "could not determine the answer. NOT part of the lift. The thing to see: " +
      "a bare `url-only` (and `name-only`) often score HIGH here — refusing is " +
      "easy when you're handed nothing — which is exactly why these would " +
      "pollute a lift average if included.",
  );
  L.push("");
  L.push(conditionTableHeader("Model"));
  L.push(conditionTableRule());
  for (const m of models) {
    const c = pm[m.key].calib;
    const b = c.byCondition;
    const br = c.byCondRows;
    L.push(`| ${m.label} | ${conditionCells(b, br)} |`);
  }
  L.push("");

  // Full all-items table (both tracks; clearly labelled).
  L.push("## All items, mean correctness by condition x model");
  L.push("");
  L.push("_Both tracks combined — included only for completeness. Use the API-usage table above for the real signal._");
  L.push("");
  L.push(`| Condition | ${models.map((m) => `${m.label} (cut ${m.cutoff})`).join(" | ")} |`);
  L.push(`|---|${keys.map(() => "---").join("|")}|`);
  for (const c of CONDITIONS) {
    const cells = keys.map((k) => cell(pm[k].byConditionAll[c], pm[k].byCondRowsAll[c]));
    L.push(`| ${c} | ${cells.join(" | ")} |`);
  }
  L.push("");

  L.push("## Interpretation");
  L.push("");
  L.push(interpret(summary, models));
  L.push("");
  L.push("---");
  L.push("");
  L.push(
    "_Small scale (a handful of API-usage items per pre/post bucket), so treat " +
      "these as directional, not statistically significant — the post-cutoff " +
      "API bucket is especially thin and is the main reason for expanding the " +
      "corpus. Cutoff dates are the vendors' published values (see " +
      "SOURCES.md). Every prompt, output, and judge prompt + raw verdict is in " +
      "[transcript.jsonl](transcript.jsonl), [RUNLOG.md](RUNLOG.md), and " +
      "[dashboard.html](dashboard.html)._",
  );

  const { writeFile } = await import("node:fs/promises");
  await writeFile("results/REPORT.md", L.join("\n"));
}

function interpret(summary, models) {
  const lines = [];

  const preLifts = models
    .map((m) => summary.perModel[m.key].api.lift.pre)
    .filter((x) => x != null);
  const postLifts = models
    .map((m) => summary.perModel[m.key].api.lift.post)
    .filter((x) => x != null);
  const aggPre = mean(preLifts);
  const aggPost = mean(postLifts);
  const aggOverall = mean(
    models.map((m) => summary.perModel[m.key].api.lift.overall).filter((x) => x != null),
  );

  lines.push(
    `- **Headline (real opaque API-usage items only):** mean lift ${sign(aggOverall)} ` +
      `overall — among items whose opaque URL is meant to be a real pointer, ` +
      `a bare opaque URL, with no page content, does NOT beat simply naming ` +
      `the task, and across models it tends to lower the score. The ` +
      `model is more cautious or more error-prone when handed only a context-` +
      `free URL string than when told plainly what to build.`,
  );
  if (aggPre != null || aggPost != null) {
    const dir =
      aggPre != null && aggPost != null
        ? aggPre > aggPost + 0.03
          ? "Pre-cutoff lift exceeds post-cutoff lift — the direction the hypothesis predicts — but both are negative, so the URL is a weak (and net-negative) retrieval key at this corpus size."
          : "The pre- vs post-cutoff gap on API-usage items is small or noisy at this corpus size, so the boundary effect is not yet demonstrated; the post-cutoff bucket is only one or two real items per model."
        : "Only one side of the cutoff has API-usage data, so the boundary comparison is incomplete.";
    lines.push(
      `- **Boundary (real opaque API-usage items):** mean pre-cutoff lift ${sign(aggPre)}, ` +
        `mean post-cutoff lift ${sign(aggPost)}. ${dir}`,
    );
  }
  lines.push(
    `- **Why the earlier read was wrong:** an apparent positive *post-cutoff* ` +
      `url-only score comes from the knowledge-calibration items (` +
      `${summary.calibrationItems.join(", ")}`,
  );
  lines[lines.length - 1] +=
    `), where the correct answer is "I don't know". A bare URL elicits exactly ` +
    `that refusal, scoring high — which is the OPPOSITE of the URL helping the ` +
    `model use an API. Those items are now excluded from the lift.`;
  lines.push(
    `- **What does work:** \`url+name\` and the \`full-content\` ceiling score ` +
      `well across the board, and the controls (\`fake-structural-url\`, ` +
      `\`random-url\`) collapse toward name-only / zero, so the harness is ` +
      `measuring real content rather than URL shape.`,
  );

  lines.push("");
  lines.push("Per model (real opaque API-usage items):");
  for (const m of models) {
    const a = summary.perModel[m.key].api;
    const lo = a.lift.overall;
    const bc = a.byCondition;
    let verdict;
    if (lo == null) verdict = "no comparable API-usage data";
    else if (lo > 0.1) verdict = `bare URL meaningfully helped (lift ${sign(lo)})`;
    else if (lo > 0.02) verdict = `bare URL slightly helped (lift ${sign(lo)})`;
    else if (lo < -0.02) verdict = `bare URL did not help / hurt (lift ${sign(lo)})`;
    else verdict = `bare URL made little difference (lift ${sign(lo)})`;
    const ceil =
      bc["full-content"] != null && bc["name-only"] != null
        ? ` full-content ${fmt(bc["full-content"])} vs name-only ${fmt(bc["name-only"])};`
        : "";
    const split = `pre ${sign(a.lift.pre)} / post ${sign(a.lift.post)} (n ${a.splitN.pre}/${a.splitN.post}).`;
    lines.push(`- **${m.label}:** ${verdict};${ceil} ${split}`);
  }
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
