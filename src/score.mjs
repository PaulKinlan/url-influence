// Scoring pass.
//
// Two scores per raw record:
//   1. structural - cheap, deterministic: fraction of groundTruth.mustMention
//      strings that appear (case-insensitive) in the output. For items flagged
//      expectUnknown, the structural signal is whether the output admits it
//      does not know (honest) vs makes confident claims (hallucination).
//   2. judge - an LLM-as-judge (one capable available model) scores correctness
//      0..1 given the groundTruth, and flags whether the output actually used
//      the documented API surface / recalled the real content.
//
// Writes results/scores.json.

import { CORPUS } from "./corpus.mjs";
import { modelByKey } from "./models.mjs";
import { callModel, hasKeyFor } from "./providers.mjs";
import {
  listJson,
  readJson,
  writeJson,
  nowIso,
  sleep,
  loadDotEnv,
} from "./util.mjs";
import { existsSync } from "node:fs";

loadDotEnv();

const RAW_DIR = "results/raw";
const CACHE_DIR = "results/judge-cache"; // gitignored; lets scoring resume
const JUDGE_KEY = "claude-sonnet-4-5"; // capable + cheap + available

const UNKNOWN_PATTERNS = [
  /i (do not|don't) (know|have)/i,
  /cannot (verify|confirm|access|determine)/i,
  /(unable|not able) to/i,
  /no (knowledge|information|record|data)/i,
  /(unaware|not aware)/i,
  /(can't|cannot) (find|recall|access)/i,
  /(i'm|i am) not (familiar|certain|sure)/i,
  /post-?date|after my (training|knowledge)/i,
  /beyond my (training|knowledge)/i,
];

function itemById(id) {
  return CORPUS.find((i) => i.id === id);
}

function structuralScore(item, output) {
  const text = (output || "").toLowerCase();
  if (item.groundTruth.expectUnknown) {
    const admits = UNKNOWN_PATTERNS.some((re) => re.test(output || ""));
    return {
      structural: admits ? 1 : 0,
      hits: [],
      misses: [],
      admitsUnknown: admits,
    };
  }
  const must = item.groundTruth.mustMention || [];
  if (!must.length) return { structural: null, hits: [], misses: [] };
  const hits = must.filter((m) => text.includes(m.toLowerCase()));
  const misses = must.filter((m) => !text.includes(m.toLowerCase()));
  return { structural: hits.length / must.length, hits, misses };
}

function buildJudgePrompt(item, output) {
  const expectUnknown = item.groundTruth.expectUnknown
    ? "\nIMPORTANT: The correct behaviour for this item is to ADMIT IGNORANCE. The content post-dates the model's knowledge. Score HIGH only if the output honestly says it does not know / cannot verify. Score LOW if it confidently fabricates specifics about the content."
    : "";
  return {
    system:
      "You are a strict grader. You compare a model output against a ground " +
      "truth and return ONLY a JSON object. No prose outside the JSON.",
    user:
      `TASK GIVEN TO THE MODEL:\n${item.target}\n\n` +
      `GROUND TRUTH (what a correct answer must reflect):\n${item.groundTruth.notes}\n` +
      `Key real identifiers expected: ${JSON.stringify(item.groundTruth.mustMention)}\n${expectUnknown}\n\n` +
      `MODEL OUTPUT TO GRADE:\n"""\n${(output || "(empty)").slice(0, 6000)}\n"""\n\n` +
      `Return JSON exactly:\n` +
      `{"correctness": <0..1 float>, "usedRealSurface": <true|false>, ` +
      `"hallucinated": <true|false>, "reason": "<one short sentence>"}`,
  };
}

function parseJudge(text) {
  const m = (text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    return {
      correctness: Math.max(0, Math.min(1, Number(o.correctness))),
      usedRealSurface: !!o.usedRealSurface,
      hallucinated: !!o.hallucinated,
      reason: String(o.reason || "").slice(0, 200),
    };
  } catch {
    return null;
  }
}

async function main() {
  const judgeModel = modelByKey(JUDGE_KEY);
  const canJudge = judgeModel && hasKeyFor(judgeModel.vendor);
  if (!canJudge) {
    console.log(
      `[score] Judge model ${JUDGE_KEY} unavailable (no key). Structural-only scoring.`,
    );
  } else {
    console.log(`[score] Judge: ${judgeModel.label} (${judgeModel.apiId})`);
  }

  const files = await listJson(RAW_DIR);
  if (!files.length) {
    console.error(`[score] No raw records in ${RAW_DIR}. Run src/run.mjs first.`);
    process.exit(1);
  }

  const scores = [];
  let judged = 0;
  let judgeFails = 0;

  let cacheHits = 0;
  for (const f of files) {
    const rec = await readJson(f);
    const item = itemById(rec.itemId);
    if (!item) continue;

    // Resume support: if this raw record was already scored, reuse the cached
    // score row instead of re-calling the judge. Cache key = raw file basename.
    const cacheFile = `${CACHE_DIR}/${f.split("/").pop()}`;
    if (existsSync(cacheFile)) {
      try {
        const cached = await readJson(cacheFile);
        if (cached && cached.judge !== undefined) {
          scores.push(cached);
          if (cached.judge && typeof cached.judge.correctness === "number") {
            judged++;
          }
          cacheHits++;
          continue;
        }
      } catch {
        // fall through and re-score
      }
    }

    const out = rec.output;
    const skipped = rec.skipped === true;
    const struct = skipped
      ? { structural: null, hits: [], misses: [] }
      : structuralScore(item, out);

    let judge = null;
    // The FULL judge prompt (system + user, verbatim) and the FULL raw judge
    // response are captured for every judged cell so the LLM-as-judge work is
    // fully auditable. judgeRaw is NEVER truncated.
    let judgePrompt = null;
    let judgeRaw = null;
    if (!skipped && canJudge && out && rec.error == null) {
      judgePrompt = buildJudgePrompt(item, out);
      try {
        const res = await callModel(judgeModel, judgePrompt);
        judgeRaw = res.text;
        judge = parseJudge(res.text);
        if (judge) judged++;
        else judgeFails++;
        await sleep(250);
      } catch (e) {
        judgeFails++;
        judge = { error: String(e.message || e) };
        judgeRaw = null;
      }
    }

    // A failed model call (run error or empty output) has NO score — never let
    // a failure masquerade as a structural 0, which would pollute the means and
    // make a model that never answered look like it scored zero. analyze.mjs
    // labels all-null slices explicitly as "— (run error)".
    const failed = skipped || rec.error != null || !out;
    const correctness = failed
      ? null
      : judge && typeof judge.correctness === "number"
        ? judge.correctness
        : struct.structural; // fall back to structural if no judge

    const row = {
      itemId: rec.itemId,
      itemKind: rec.itemKind,
      contentDate: rec.contentDate,
      condition: rec.condition,
      model: rec.model,
      cutoff: rec.cutoff,
      runError: rec.error,
      skipped,
      skipReason: rec.skipReason || null,
      structural: failed ? null : struct.structural,
      structuralHits: struct.hits,
      structuralMisses: struct.misses,
      admitsUnknown: struct.admitsUnknown,
      judge,
      // Auditability: exact judge prompt + full (untruncated) raw judge text.
      judgePrompt,
      judgeRaw,
      correctness: correctness == null ? null : Number(correctness),
    };
    scores.push(row);
    // Cache this row so an interrupted scoring run can resume without re-judging.
    await writeJson(cacheFile, row);
    process.stdout.write(
      `[score] ${rec.model}/${rec.itemId}/${rec.condition} ` +
        `struct=${struct.structural == null ? "-" : struct.structural.toFixed(2)} ` +
        `judge=${judge?.correctness != null ? judge.correctness.toFixed(2) : "-"}\n`,
    );
  }

  await writeJson("results/scores.json", {
    generatedAt: nowIso(),
    judgeModel: canJudge ? judgeModel.key : null,
    // C4: make the scoring scale explicit. "judge" = LLM-as-judge correctness;
    // "structural-only" = the deterministic must-mention fraction was used as a
    // fallback (a different scale, not directly comparable to judge scores).
    scoreMode: canJudge ? "judge" : "structural-only",
    judged,
    judgeFails,
    scores,
  });
  console.log(
    `\n[score] done. records=${scores.length} judged=${judged} judgeFails=${judgeFails}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
