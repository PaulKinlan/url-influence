// Transcript / audit-log generator.
//
// Reads results/raw/*.json (the per-cell run records, gitignored intermediate)
// + results/scores.json (the scoring pass, including the FULL judge prompt and
// FULL raw judge response captured by score.mjs) and emits TWO committed
// artifacts that together are the complete, auditable record of a run:
//
//   results/transcript.jsonl  - one JSON object per (item x condition x model)
//                               cell, machine-readable. All run metadata, the
//                               exact prompt sent, the full model output, and
//                               the full judge block (prompt + raw verdict +
//                               parsed score). Nothing truncated.
//   results/RUNLOG.md         - the SAME content, human-browsable: grouped by
//                               model -> item -> condition, so a reader can
//                               validate whether each judge verdict was fair.
//
// No model calls here (no keys needed). Runnable as `node src/transcript.mjs`.

import { MODELS, modelByKey } from "./models.mjs";
import { CORPUS } from "./corpus.mjs";
import { CONDITIONS } from "./conditions.mjs";
import { listJson, readJson, nowIso } from "./util.mjs";
import { writeFile } from "node:fs/promises";

const RAW_DIR = "results/raw";

// pre/post-cutoff classifier, matched to analyze.mjs: equal-month counts as
// "post" (the harder case for the model).
function preCutoff(contentDate, cutoff) {
  const norm = (s) => {
    const [y, m = "01", d = "01"] = s.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };
  return norm(contentDate) < norm(cutoff);
}

function scoreKey(model, itemId, condition) {
  return `${model}__${itemId}__${condition}`;
}

function fence(text, lang = "") {
  const body = text == null ? "(none)" : String(text);
  // Use a long fence so any triple-backticks inside the content can't break out.
  const fenceMark = "``````";
  return `${fenceMark}${lang}\n${body}\n${fenceMark}`;
}

async function main() {
  const rawFiles = await listJson(RAW_DIR);
  if (!rawFiles.length) {
    console.error(`[transcript] No raw records in ${RAW_DIR}. Run src/run.mjs first.`);
    process.exit(1);
  }

  let scoreData = { scores: [] };
  try {
    scoreData = await readJson("results/scores.json");
  } catch {
    console.warn("[transcript] No results/scores.json; emitting run data only.");
  }

  // Index scores by (model, item, condition).
  const scoreIndex = new Map();
  for (const s of scoreData.scores || []) {
    scoreIndex.set(scoreKey(s.model, s.itemId, s.condition), s);
  }

  // Load every raw record.
  const records = [];
  for (const f of rawFiles) {
    records.push(await readJson(f));
  }

  // Stable ordering: model (registry order) -> item (corpus order) -> condition.
  const modelOrder = new Map(MODELS.map((m, i) => [m.key, i]));
  const itemOrder = new Map(CORPUS.map((it, i) => [it.id, i]));
  const condOrder = new Map(CONDITIONS.map((c, i) => [c, i]));
  records.sort((a, b) => {
    const dm = (modelOrder.get(a.model) ?? 99) - (modelOrder.get(b.model) ?? 99);
    if (dm) return dm;
    const di = (itemOrder.get(a.itemId) ?? 99) - (itemOrder.get(b.itemId) ?? 99);
    if (di) return di;
    return (condOrder.get(a.condition) ?? 99) - (condOrder.get(b.condition) ?? 99);
  });

  const jsonl = [];
  const md = [];

  md.push("# URL Influence: Full Run Log (auditable transcript)");
  md.push("");
  md.push(`Generated: ${nowIso()}`);
  md.push("");
  md.push(
    "Every (item x condition x model) cell below shows, in order: a header " +
      "line, the EXACT prompt sent to the model, the FULL model output, then " +
      "the LLM-as-judge block (the judge's full prompt, the judge's full raw " +
      "response, and the parsed verdict). Nothing is truncated. This is the " +
      "complete record so each judge verdict can be independently validated.",
  );
  md.push("");
  md.push(
    `Judge model: \`${scoreData.judgeModel || "(none / structural-only)"}\`. ` +
      "When the judged model IS the judge, that is fine - the judge grades its " +
      "own outputs the same way; rows are never skipped for that reason.",
  );
  md.push("");
  md.push(
    "`preCutoff` = the item's contentDate is strictly before this model's " +
      "knowledge cutoff (could have been in training). Equal-month counts as " +
      "post (the harder case).",
  );
  md.push("");

  let lastModel = null;
  let lastItem = null;

  for (const rec of records) {
    const model = modelByKey(rec.model) || { key: rec.model, label: rec.model, cutoff: rec.cutoff };
    const item = CORPUS.find((it) => it.id === rec.itemId) || {};
    const score = scoreIndex.get(scoreKey(rec.model, rec.itemId, rec.condition)) || null;
    const pre = preCutoff(rec.contentDate, model.cutoff);

    // ---- JSONL row: complete machine-readable record ----
    const judge = score?.judge || null;
    const cell = {
      model: rec.model,
      label: model.label,
      vendor: rec.vendor,
      apiId: rec.apiId,
      cutoff: rec.cutoff,
      itemId: rec.itemId,
      itemKind: rec.itemKind,
      contentDate: rec.contentDate,
      preCutoff: pre,
      condition: rec.condition,
      urlUsed: rec.urlUsed,
      prompt: rec.prompt, // exact { system, user } sent
      output: rec.output, // full model output (untruncated)
      runError: rec.error ?? null,
      timestamp: rec.timestamp ?? null,
      usage: rec.usage ?? null,
      judge: {
        // Full judge prompt + full raw response (untruncated) + parsed verdict.
        judgePrompt: score?.judgePrompt ?? null,
        judgeRaw: score?.judgeRaw ?? null,
        correctness: judge && typeof judge.correctness === "number" ? judge.correctness : null,
        usedRealSurface: judge?.usedRealSurface ?? null,
        hallucinated: judge?.hallucinated ?? null,
        reason: judge?.reason ?? null,
        judgeError: judge?.error ?? null,
      },
      structural: {
        score: score?.structural ?? null,
        hits: score?.structuralHits ?? [],
        misses: score?.structuralMisses ?? [],
        admitsUnknown: score?.admitsUnknown ?? null,
      },
      finalCorrectness: score?.correctness ?? null,
    };
    jsonl.push(JSON.stringify(cell));

    // ---- Markdown ----
    if (rec.model !== lastModel) {
      md.push("");
      md.push(`# Model: ${model.label} (\`${rec.model}\`, cutoff ${rec.cutoff})`);
      md.push("");
      lastModel = rec.model;
      lastItem = null;
    }
    if (rec.itemId !== lastItem) {
      md.push(`## Item: ${rec.itemId} (${rec.itemKind}, contentDate ${rec.contentDate})`);
      md.push("");
      lastItem = rec.itemId;
    }

    // status / correctness one-liner.
    let statusBits;
    if (rec.error) {
      statusBits = `run error: ${rec.error}`;
    } else if (judge?.error) {
      statusBits = `judge failed: ${judge.error}`;
    } else if (judge && typeof judge.correctness === "number") {
      statusBits = `correctness=${judge.correctness.toFixed(2)}`;
    } else if (score && score.correctness != null) {
      statusBits = `correctness=${score.correctness.toFixed(2)} (structural fallback)`;
    } else {
      statusBits = "correctness=- (not judged)";
    }

    md.push(
      `### ${model.label} | ${rec.itemId} | ${rec.condition} | ` +
        `preCutoff=${pre} | ${statusBits}`,
    );
    md.push("");
    md.push(`URL used: ${rec.urlUsed == null ? "(none)" : rec.urlUsed}`);
    md.push("");
    md.push("**Prompt (system):**");
    md.push(fence(rec.prompt?.system));
    md.push("");
    md.push("**Prompt (user):**");
    md.push(fence(rec.prompt?.user));
    md.push("");
    md.push("**Model output:**");
    md.push(fence(rec.output ?? `(no output; run error: ${rec.error})`));
    md.push("");

    // Judge block.
    if (score?.judgePrompt) {
      md.push("**Judge prompt (system):**");
      md.push(fence(score.judgePrompt.system));
      md.push("");
      md.push("**Judge prompt (user):**");
      md.push(fence(score.judgePrompt.user));
      md.push("");
      md.push("**Judge raw response:**");
      md.push(fence(score.judgeRaw));
      md.push("");
      if (judge && !judge.error) {
        md.push(
          `**Parsed verdict:** correctness=${
            typeof judge.correctness === "number" ? judge.correctness.toFixed(2) : "-"
          }, usedRealSurface=${judge.usedRealSurface}, hallucinated=${judge.hallucinated}`,
        );
        md.push("");
        md.push(`**Judge reason:** ${judge.reason || "(none)"}`);
      } else if (judge?.error) {
        md.push(`**Judge error:** ${judge.error}`);
      }
      md.push("");
    } else if (judge?.error) {
      md.push(`**Judge failed:** ${judge.error}`);
      md.push("");
    } else {
      md.push("**Judge:** not run for this cell (no judge available, or run errored).");
      md.push("");
    }

    // Structural detail.
    md.push(
      `**Structural:** score=${
        score?.structural == null ? "-" : score.structural.toFixed(2)
      }` +
        (score?.structuralHits?.length ? `, hits=${JSON.stringify(score.structuralHits)}` : "") +
        (score?.structuralMisses?.length
          ? `, misses=${JSON.stringify(score.structuralMisses)}`
          : "") +
        (score?.admitsUnknown != null ? `, admitsUnknown=${score.admitsUnknown}` : ""),
    );
    md.push("");
    md.push("---");
    md.push("");
  }

  await writeFile("results/transcript.jsonl", jsonl.join("\n") + "\n");
  await writeFile("results/RUNLOG.md", md.join("\n"));
  console.log(
    `[transcript] wrote results/transcript.jsonl (${jsonl.length} cells) + results/RUNLOG.md`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
