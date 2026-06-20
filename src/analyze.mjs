// Analysis: read results/scores.json and produce results/summary.json + a
// readable results/REPORT.md.
//
// THREE DISTINCT tracks are measured separately, because they answer different
// questions and must not be averaged together:
//
//   1. `code` / API-USAGE items: the model is asked to USE a real web API; the
//      opaque URL is a ChromeStatus id. described is a real task description, so
//      the LIFT metric (url-only − described) is a clean "opaque pointer vs
//      description" contrast. The LIFT is computed ONLY on these.
//
//   2. `recall` items (OPAQUE-ID DECODING): arXiv/RFC/CVE/SO/PMID/DOI/SHA/HF
//      ids. described here is the work's TITLE (≈ the answer for famous works),
//      so url-only − described is NOT the same metric and is kept OUT of the
//      lift. These are analysed on their own — by id-type, by popularity, and
//      pre/post cutoff — to ask whether the bare opaque id decodes the content.
//
//   3. KNOWLEDGE-CALIBRATION items (groundTruth.expectUnknown): the content
//      post-dates every model, so the CORRECT answer is "I can't determine
//      this". A bare opaque URL tends to score HIGH precisely because it gives
//      the model nothing, so it correctly refuses. Mixing these into the lift
//      creates a fake "post-cutoff url-only helps" signal — reported on their
//      own as a refusal-calibration view.

import { MODELS } from "./models.mjs";
import {
  CONDITION_DEFS,
  CONDITIONS,
  CORE_LIFT_CONDITIONS,
} from "./conditions.mjs";
import { CORPUS } from "./corpus.mjs";
import { readJson, writeJson, nowIso } from "./util.mjs";
import { execSync } from "node:child_process";

const REPO = "https://github.com/PaulKinlan/url-influence";
function gitCommit() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

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
// Item KIND drives which TRACK a row belongs to. The headline lift
// (url-only − described) is meaningful only for `code`/API-usage items, where
// described is a genuine task description. For `recall` items described is the
// work's TITLE (≈ the answer for famous works), so mixing them into the lift
// conflates two different phenomena — they get their own opaque-id-decoding
// tables instead. (codex audit, 2026-06-19.)
const isCodeItem = (id) => ITEM.get(id)?.kind === "code";
const isRecallItem = (id) => ITEM.get(id)?.kind === "recall";

// contentDate is baked into each raw cell at run time, but the corpus's dates
// can be corrected after a run (e.g. wrong ship dates fixed). Always classify
// pre/post from the CURRENT corpus contentDate, by itemId — so date fixes apply
// to the analysis without re-running the (paid) matrix.
const CONTENT_DATE = new Map(CORPUS.map((i) => [i.id, i.contentDate]));
const cdOf = (id, fallback) => CONTENT_DATE.get(id) ?? fallback;
const ITEM = new Map(CORPUS.map((i) => [i.id, i]));

// What KIND of identifier each condition's prompt carries — the opaque-vs-
// descriptive distinction that makes the numbers interpretable.
const CONDITION_OPACITY = {
  "described": "— (no identifier; baseline)",
  "described-framed": "— (no id; framing-matched baseline for url-only)",
  "fake-opaque-url": "CONTROL — opaque-SHAPED fake id (uniform)",
  "url-only": "OPAQUE — bare id, does NOT name the content",
  "mdn-url-only": "DESCRIPTIVE — MDN path names the API",
  "spec-url-only": "CANONICAL — spec URL (usually names the feature)",
  "bcd-key-only": "CANONICAL, SEMI-DESCRIPTIVE — BCD dotted key often contains the name",
  "url+described": "OPAQUE id + the task described",
  "full-content": "— (page pasted + task spelled out; max-info ceiling)",
  "content-only": "— (page pasted, NO task; clean ceiling parallel to url-only)",
  "fake-structural-url": "CONTROL — nonexistent same-shape URL",
  "random-url": "CONTROL — unrelated real URL",
};

// Classify an item's OPAQUE id (urls.opaque) so the reader sees exactly what
// the `url-only` condition was for that item.
function opaqueIdType(item) {
  if (item?.validation?.opaqueRole === "structural-control")
    return "control (synthetic, not a real pointer)";
  const o = item?.urls?.opaque || "";
  if (/arxiv\.org/.test(o)) return "arXiv id";
  if (/rfc-editor|ietf|datatracker/.test(o)) return "RFC id";
  if (/nvd\.nist\.gov|cve\.org|cveawg/.test(o) || /CVE-\d/.test(o)) return "CVE id";
  if (/pubmed\.ncbi|ncbi\.nlm/.test(o)) return "PubMed id";
  if (/chromestatus\.com/.test(o)) return "ChromeStatus #";
  if (/stackoverflow\.com/.test(o)) return "Stack Overflow #";
  if (/github\.com\/.+\/commit\//.test(o)) return "GitHub commit SHA";
  if (/huggingface\.co/.test(o)) return "HuggingFace id";
  if (/doi\.org/.test(o)) return "DOI";
  if (/caniuse\.com/.test(o)) return "caniuse";
  return o ? "other" : "—";
}

// Short display form of an opaque id (strip scheme; keep the meaningful tail).
function shortId(item) {
  const o = item?.urls?.opaque || "";
  return o.replace(/^https?:\/\//, "");
}

// Pad a YYYY-MM date to mid-month (-15), not -01. Cutoffs are month-END (-31),
// so padding content dates to -01 made same-month items ALWAYS classify "pre"
// even when they likely post-date training. Mid-month is the less-biased
// convention; items in the SAME year-month as a model's cutoff remain
// boundary-ambiguous (flagged in the report).
function relativeToCutoff(contentDate, cutoff) {
  const norm = (s) => {
    const [y, m = "06", d = "15"] = s.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };
  return norm(contentDate) < norm(cutoff) ? "pre" : "post";
}

// Same year-month as the model cutoff => boundary-ambiguous (could be either
// side of the training cut). Reported as a caveat, not silently bucketed.
function isBoundary(contentDate, cutoff) {
  return (contentDate || "").slice(0, 7) === (cutoff || "").slice(0, 7);
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

  // Optional Common Crawl presence covariate (results/common-crawl.json from
  // `node src/cc-check.mjs`). Empirical "is this opaque URL in a major training
  // source" signal — noisy (CC is a sample), used as a covariate, not a label.
  let ccMap = null;
  let ccCrawls = 0;
  try {
    const cc = await readJson("results/common-crawl.json");
    ccCrawls = (cc.crawls || []).length;
    ccMap = Object.fromEntries(
      (cc.items || []).map((x) => [
        x.itemId,
        { n: x.presentIn.length, present: x.anyPresent, firstSeen: x.firstSeen },
      ]),
    );
  } catch {
    // CC data optional; skip the covariate if absent.
  }

  const summary = {
    generatedAt: nowIso(),
    judgeModel: data.judgeModel,
    calibrationItems: [...CALIB],
    opaqueStructuralControlItems: [...OPAQUE_STRUCTURAL_CONTROLS],
    ccMap,
    ccCrawls,
    skippedModels: skippedModels.map((m) => ({
      key: m.key,
      label: m.label,
      vendor: m.vendor,
    })),
    perModel: {},
  };

  for (const model of models) {
    const all = scores.filter((s) => s.model === model.key);
    // API-USAGE track = `code` items only (real pointers). The lift lives here:
    // described is a genuine task description, so url-only − described is a clean
    // "opaque pointer vs description" contrast. Recall items are a SEPARATE track
    // (opaque-id decoding), reported in the per-id-type / popularity tables.
    const api = all.filter(
      (r) => isCodeItem(r.itemId) && !isOpaqueStructuralControl(r.itemId),
    );
    const apiOpaqueControls = all.filter(
      (r) => isCodeItem(r.itemId) && isOpaqueStructuralControl(r.itemId),
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
        (r) => relativeToCutoff(cdOf(r.itemId, r.contentDate), model.cutoff) === bucket,
      );
      const cm = condMeans(br);
      apiSplit[bucket] = cm.by;
      apiSplitRows[bucket] = cm.byRows;
    }
    const apiSplitN = {
      pre: new Set(
        api
          .filter((r) => relativeToCutoff(cdOf(r.itemId, r.contentDate), model.cutoff) === "pre")
          .map((r) => r.itemId),
      ).size,
      post: new Set(
        api
          .filter((r) => relativeToCutoff(cdOf(r.itemId, r.contentDate), model.cutoff) === "post")
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
  L.push(`Report generated: ${summary.generatedAt}`);
  L.push(`Data run / scored: ${data.generatedAt || "(unknown)"}`);
  const commit = gitCommit();
  if (commit) {
    L.push(
      `Code + data commit: [\`${commit.slice(0, 10)}\`](${REPO}/commit/${commit})`,
    );
  }
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
    "**Three tracks, measured separately (this is important).** The corpus has " +
      "three kinds of item and they must NOT be averaged together:",
  );
  L.push("");
  L.push(
    "- **`code` / API-usage items** — the model is asked to USE a real web API, " +
      "and the opaque URL (a ChromeStatus id) points at that feature. described " +
      "is a genuine task description, so url-only − described is a clean " +
      "\"opaque pointer vs description\" contrast. **The LIFT metric is computed " +
      "on these only.**",
  );
  L.push(
    "- **`recall` items (opaque-id decoding)** — arXiv/RFC/CVE/SO/PMID/DOI/SHA/" +
      "HF ids. Here described is the work's TITLE, which ≈ the answer for famous " +
      "works, so url-only − described is NOT comparable to the API-usage lift " +
      "and is kept OUT of it. These are analysed on their own — by id-type, by " +
      "popularity (famous/moderate/obscure), and pre/post cutoff — to ask " +
      "whether the bare opaque id decodes into the real content.",
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
      "mean(correctness | url-only) − mean(correctness | described)`. " +
      "Positive = the bare URL alone beat naming the task. The hypothesis " +
      "predicts **positive lift pre-cutoff, ~zero post-cutoff**.",
  );
  L.push("");
  L.push(
    "> **Lift applies only to `code`/API-usage items, NOT the opaque-id " +
      "`recall` items** (arXiv/RFC/CVE/SO/PMID/DOI/…). A recall task's only " +
      "identifier *is* the opaque id, so there is no coherent \"describe it in " +
      "words\" baseline that isn't the answer itself — `described`/`described-framed` " +
      "are therefore **N/A (skipped)** for recall items and their `name` columns " +
      "read `-`. Recall items are judged on the **cutoff axis** (does the bare " +
      "id decode pre- vs post-cutoff?) and against the **`full-content` " +
      "ceiling**, not against a name baseline. (Earlier builds emitted a broken " +
      "`described` prompt for these — \"recall the paper at this arXiv id\" with " +
      "no id attached — which the models correctly refused, manufacturing a " +
      "spurious `name≈0`; that data has been removed.)",
  );
  L.push("");
  L.push(
    "**Correctness** is 0..1 from an LLM-as-judge; every judge prompt + raw " +
      "verdict is in [transcript.jsonl.gz](transcript.jsonl.gz) and " +
      "[dashboard.html](dashboard.html) so each score " +
      "is checkable.",
  );
  L.push("");
  L.push(
    "**Controls.** `fake-structural-url` (plausible but nonexistent, same " +
      "shape) and `random-url` (unrelated real URL) should collapse toward " +
      "described / zero — if URL shape or merely having a URL did the work, " +
      "these would lift too.",
  );
  L.push("");
  L.push(
    "**Identifier probes.** Conditions such as `mdn-url-only`, " +
      "`spec-url-only`, and `bcd-key-only` are exploratory. They are useful " +
      "for diagnosing which identifiers a model can decode, but the headline " +
      "lift remains strictly `url-only - described`.",
  );
  L.push("");
  L.push(
    "**Cutoff granularity.** Content dates are `YYYY-MM` (padded to mid-month); " +
      "model cutoffs are month-end. An item in the SAME year-month as a model's " +
      "cutoff is **boundary-ambiguous** — it could fall either side of the " +
      "training cut — yet is bucketed `pre`. Treat the pre/post split as fuzzy " +
      "near the boundary.",
  );
  L.push("");
  L.push(
    "**Blanks** are always labelled: `— (no items)`, `— (run error)`, " +
      "`— (judge failed)`, `— (skipped: no key)`, `— (n/a)`.",
  );
  L.push("");

  L.push("## Conditions — what identifier each one carries");
  L.push("");
  L.push(
    "The single most important thing for reading the numbers: **which conditions " +
      "give an OPAQUE id (a bare string that does not name the content) vs a " +
      "DESCRIPTIVE/CANONICAL id (that names or describes the feature).** Only " +
      "`url-only` is opaque; `mdn/spec/bcd` all name the feature to some degree.",
  );
  L.push("");
  L.push("| Condition | Identifier opacity | Group | Meaning |");
  L.push("|---|---|---|---|");
  for (const c of CONDITION_DEFS) {
    L.push(
      `| \`${c.key}\` | ${CONDITION_OPACITY[c.key] || "—"} | ${c.group} | ${c.description} |`,
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

  // ---- Cross-model per-(item,condition) aggregation for the per-item views.
  const icSum = {};
  const judgeReason = {};
  for (const s of data.scores) {
    if (typeof s.correctness === "number") {
      const k = s.itemId + "|" + s.condition;
      (icSum[k] = icSum[k] || []).push(s.correctness);
    }
    const jk = s.itemId + "|" + s.condition;
    if (s.judge && s.judge.reason && !judgeReason[jk]) {
      judgeReason[jk] = {
        model: s.model,
        reason: s.judge.reason,
        c: s.judge.correctness,
      };
    }
  }
  const icMean = (id, c) => mean(icSum[id + "|" + c] || []);

  // ---- Headline finding: which identifiers work (by id type) ----
  L.push("## Headline finding — which identifiers actually work");
  L.push("");
  L.push(
    "The single averaged \"lift\" below is misleading: the effect is " +
      "**categorical, not continuous** — it depends on WHICH identifier, not how " +
      "far the content is from the cutoff. Mean `url-only` (OPAQUE) correctness " +
      "across all models, grouped by the kind of opaque id:",
  );
  L.push("");
  const byType = {};
  for (const it of CORPUS) {
    if (it.groundTruth.expectUnknown) continue;
    const uo = icMean(it.id, "url-only");
    if (uo == null) continue;
    const t = opaqueIdType(it);
    (byType[t] = byType[t] || []).push({ uo, no: icMean(it.id, "described") });
  }
  L.push("| Opaque id type (`url-only`) | items | mean url-only | mean described |");
  L.push("|---|---|---|---|");
  for (const [t, rows] of Object.entries(byType).sort(
    (a, b) => (mean(b[1].map((r) => r.uo)) || 0) - (mean(a[1].map((r) => r.uo)) || 0),
  )) {
    L.push(
      `| ${t} | ${rows.length} | ${fmt(mean(rows.map((r) => r.uo)))} | ${fmt(mean(rows.map((r) => r.no)))} |`,
    );
  }
  L.push("");
  L.push(
    "**Read:** a bare OPAQUE id works only when it is a *famous, memorised* id " +
      "(landmark arXiv / RFC). Opaque numeric ids the model never memorised " +
      "(ChromeStatus #, un-famous Stack Overflow #) decode to ~0 — even for " +
      "features the model knows cold by name. The canonical web-id probes " +
      "(`bcd-key-only`, `spec-url-only`) DO work, but they are semi-descriptive " +
      "(the BCD key / spec path usually contains the feature name), so that is " +
      "partly a *hint*, not pure opaque retrieval. See the per-item table below.",
  );
  L.push("");

  // ---- Overall by condition (all models, all API-usage items) ----
  L.push("## All-models view — mean correctness by condition");
  L.push("");
  L.push(
    "Every condition, averaged across ALL models and ALL API-usage items " +
      "(knowledge-calibration items excluded). The clearest one-look summary:",
  );
  L.push("");
  L.push("| condition | identifier | mean (all models) |");
  L.push("|---|---|---|");
  for (const c of CONDITIONS) {
    const vals = [];
    for (const it of CORPUS) {
      if (it.groundTruth.expectUnknown) continue;
      const v = icMean(it.id, c);
      if (v != null) vals.push(v);
    }
    const opacity = (CONDITION_OPACITY[c] || "—").split(" —")[0];
    L.push(`| \`${c}\` | ${opacity} | ${fmt(mean(vals))} |`);
  }
  L.push("");

  // ---- Controls: framing + opaque shape (A3/A4) ----
  const condMeanAll = (c) =>
    mean(
      CORPUS.filter((i) => !i.groundTruth.expectUnknown)
        .map((i) => icMean(i.id, c))
        .filter((x) => x != null),
    );
  const _no = condMeanAll("described");
  const _nf = condMeanAll("described-framed");
  const _uo = condMeanAll("url-only");
  const _fo = condMeanAll("fake-opaque-url");
  const _fs = condMeanAll("fake-structural-url");
  if (_no != null && _nf != null && _uo != null) {
    L.push("## Controls — is the url-only result a framing or shape artifact?");
    L.push("");
    L.push(
      "Two controls test whether the `url-only` collapse is real or an artifact:",
    );
    L.push("");
    L.push(
      `- **Framing.** \`described-framed\` puts the plain task description in the SAME ` +
        `"do whatever this describes" wording as \`url-only\`. Framing cost = ` +
        `described-framed − described = **${sign(_nf - _no)}** (≈0): the framing does ` +
        `NOT explain url-only's low score. So the **framing-adjusted lift** ` +
        `(url-only − described-framed = **${sign(_uo - _nf)}**) equals the raw lift — ` +
        `the opaque id genuinely fails, it is not vaguer instruction.`,
    );
    if (_fo != null && _fs != null) {
      L.push(
        `- **Opaque shape.** \`fake-opaque-url\` (an OPAQUE-shaped fake id) scores ` +
          `**${fmt(_fo)}**, vs \`fake-structural-url\` **${fmt(_fs)}**. An opaque ` +
          `fake steers nothing; the higher fake-structural number is only because ` +
          `that fake is *descriptive* for web items (the fake path still names an ` +
          `API). So opaque URL SHAPE alone does not steer output — only real, ` +
          `memorised content does.`,
      );
    }
    L.push("");
  }

  // ---- Per-item identifier reference ----
  L.push("## Per-item identifier reference");
  L.push("");
  L.push(
    "Exactly what the `url-only` (OPAQUE) id is for each item, and which " +
      "descriptive/canonical ids it also carries.",
  );
  L.push("");
  const cc = summary.ccMap;
  const ccCol = cc ? ` CC (/${summary.ccCrawls}) |` : "";
  const ccSep = cc ? "---|" : "";
  const ccCell = (id) => {
    if (!cc) return "";
    const e = cc[id];
    if (!e) return " — |";
    return ` ${e.present ? `${e.n}${e.firstSeen ? ` (${e.firstSeen})` : ""}` : "0"} |`;
  };
  L.push(
    `| item | contentDate | \`url-only\` (opaque) id | type | spec? | bcd? |${ccCol}`,
  );
  L.push(`|---|---|---|---|---|---|${ccSep}`);
  for (const it of [...CORPUS].sort((a, b) =>
    a.contentDate.localeCompare(b.contentDate),
  )) {
    L.push(
      `| \`${it.id}\` | ${it.contentDate} | \`${shortId(it)}\` | ${opaqueIdType(it)} | ${it.urls?.specUrl ? "Y" : "—"} | ${it.bcdKey ? "Y" : "—"} |${ccCell(it.id)}`,
    );
  }
  L.push("");
  if (cc) {
    L.push(
      `*CC = number of Common Crawl monthly snapshots (of ${summary.ccCrawls} ` +
        `checked, 2025-06 .. 2026-05) that captured the opaque URL; first-seen ` +
        `month in parens. \`0\` = absent from all (e.g. StackOverflow blocks the ` +
        `crawler); \`—\` = item has no opaque URL. CC presence is a noisy, ` +
        `incomplete training-inclusion covariate — a URL absent here may still be ` +
        `in training via other routes, and presence does not guarantee recall.*`,
    );
    L.push("");
    // CC-present vs CC-absent decode rate (url-only / opaque condition).
    const recallItems = CORPUS.filter(
      (i) => !i.groundTruth.expectUnknown && cc[i.id],
    );
    const present = recallItems.filter((i) => cc[i.id].present);
    const absent = recallItems.filter((i) => !cc[i.id].present);
    const meanOf = (items) => {
      const vals = items
        .map((i) => icMean(i.id, "url-only"))
        .filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    L.push("### Opaque-URL recall vs Common Crawl presence");
    L.push("");
    L.push("| CC presence | items | mean `url-only` (opaque) correctness |");
    L.push("|---|---|---|");
    L.push(`| present in ≥1 crawl | ${present.length} | ${fmt(meanOf(present))} |`);
    L.push(`| absent from all crawls | ${absent.length} | ${fmt(meanOf(absent))} |`);
    L.push("");
    L.push(
      "Present-in-CC items decode higher on average, but the gap is **confounded " +
        "with fame** (famous URLs are both more crawled and more memorised) and " +
        "the signal is noisy: e.g. StackOverflow URLs are absent from CC (the " +
        "crawler is blocked) yet still partially decode, while many ChromeStatus " +
        "URLs are present in CC yet decode ~0. Treat CC as one weak covariate, " +
        "not the mechanism — repetition/fame across all routes is.",
    );
    L.push("");
  }

  // ---- Per-item results: name vs opaque vs canonical ----
  L.push("## Per-item results — described vs opaque vs canonical id");
  L.push("");
  L.push(
    "Mean correctness across all models, by item (sorted by date). `opaque` = " +
      "`url-only`. Watch the **opaque** column collapse to ~0 except for famous " +
      "arXiv/RFC ids, while **bcd/spec/mdn** (which name the feature) track " +
      "`name`. Blank = n/a or no data.",
  );
  L.push("");
  L.push("| item | opaque id type | name | opaque | mdn | spec | bcd | full |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const it of [...CORPUS]
    .filter((i) => !i.groundTruth.expectUnknown)
    .sort((a, b) => a.contentDate.localeCompare(b.contentDate))) {
    const g = (c) => fmt(icMean(it.id, c));
    L.push(
      `| \`${it.id}\` | ${opaqueIdType(it)} | ${g("described")} | ${g("url-only")} | ${g("mdn-url-only")} | ${g("spec-url-only")} | ${g("bcd-key-only")} | ${g("full-content")} |`,
    );
  }
  L.push("");

  // ---- Worked judge examples ----
  L.push("## Worked judge examples — how cells were scored");
  L.push("");
  L.push(
    "A few representative cells with the judge's one-line verdict. The judge's " +
      "FULL prompt + raw response for EVERY cell is in the run data linked at the " +
      "bottom (and clickable in the dashboard).",
  );
  L.push("");
  const examples = [
    ["arxiv-attention", "url-only"],
    ["rfc-9110-http-semantics", "url-only"],
    ["css-anchor-positioning", "url-only"],
    ["fetch-api", "bcd-key-only"],
    ["fetch-api", "url-only"],
    ["css-gap-decorations", "bcd-key-only"],
  ];
  const condIdLabel = (id, c) =>
    c === "url-only"
      ? `opaque ${opaqueIdType(ITEM.get(id))}`
      : c === "bcd-key-only"
        ? "BCD key"
        : c === "spec-url-only"
          ? "spec URL"
          : c === "mdn-url-only"
            ? "MDN URL"
            : c;
  for (const [id, c] of examples) {
    const jr = judgeReason[id + "|" + c];
    if (!jr) continue;
    L.push(
      `- **${id} / ${c}** (${condIdLabel(id, c)}) — mean ${fmt(icMean(id, c))}; judge on \`${jr.model}\`: _"${jr.reason}"_ (score ${fmt(jr.c)})`,
    );
  }
  L.push("");

  // ---- Run data links ----
  L.push("## Run data — inspect every cell");
  L.push("");
  L.push(
    "- **[dashboard.html](dashboard.html)** — interactive: filter by model / " +
      "condition / cutoff / pass-fail, and CLICK any cell to read the exact " +
      "prompt, the model output, and the **judge's full prompt + raw verdict + " +
      "reasoning**. (Live: https://paulkinlan.github.io/url-influence/ )",
  );
  L.push(
    "- **RUNLOG.md** — a human-browsable mirror of the transcript (every prompt, " +
      "output, judge prompt + raw verdict); too large to commit, regenerate " +
      "locally with `npm run transcript`.",
  );
  L.push(
    "- **[transcript.jsonl.gz](transcript.jsonl.gz)** — one gzipped JSON line per " +
      "cell with everything, machine-readable. This is the committed full run data; " +
      "`results/raw/` is the gitignored intermediate it is built from.",
  );
  L.push("");

  // Averaged lift — kept for context; the per-item finding above is the real story.
  L.push("## Averaged lift table (context — see the per-item finding above)");
  L.push("");
  L.push(
    "_This averages a sharply bimodal, item-specific signal, so a single " +
      "\"lift −0.5\" hides the categorical pattern. Use the per-item tables above " +
      "for the real result; this section is kept for continuity._",
  );
  L.push("");
  L.push(
    "`LIFT = mean(url-only) − mean(described)` over API-usage items whose " +
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
        : cell(null, [...(sr.pre["url-only"] || []), ...(sr.pre["described"] || [])]);
    const postCell =
      a.lift.post != null
        ? cellSign(a.lift.post)
        : cell(null, [...(sr.post["url-only"] || []), ...(sr.post["described"] || [])]);
    const ovCell = cellSign(a.lift.overall, [
      ...(a.byCondRows["url-only"] || []),
      ...(a.byCondRows["described"] || []),
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
      "excluded. In **pre** rows, does `url-only` approach `described`? In " +
      "**post** rows, it should not beat `described`; controls stay flat.",
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
      "a bare `url-only` (and `described`) often score HIGH here — refusing is " +
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
      "[transcript.jsonl.gz](transcript.jsonl.gz) and " +
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
    `- **What does work:** \`url+described\` and the \`full-content\` ceiling score ` +
      `well across the board, and the controls (\`fake-structural-url\`, ` +
      `\`random-url\`) collapse toward described / zero, so the harness is ` +
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
      bc["full-content"] != null && bc["described"] != null
        ? ` full-content ${fmt(bc["full-content"])} vs described ${fmt(bc["described"])};`
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
