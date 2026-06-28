// Recall test: can a model recall a crawled page's content from the BARE URL,
// split by whether the page is client-rendered (shell) or server-rendered?
//
// Hypothesis: if Common Crawl is a training source, shells (whose content the
// crawler never saw) should recall far worse than server-rendered pages of
// similar obscurity. The page is NEVER fetched for the model; it answers from
// memory only. Ground truth is what a real browser renders (results/recall-corpus.json).
//
// Usage:
//   node src/cc-recall-corpus.mjs            # build the corpus first
//   RECALL_MODELS=all node src/cc-recall-shells.mjs
// Default models are the cheaper tier with keys present.

import { readFileSync } from "node:fs";
import { MODELS, modelByKey } from "./models.mjs";
import { callModel, hasKeyFor } from "./providers.mjs";
import { writeJson, nowIso, loadDotEnv } from "./util.mjs";

loadDotEnv();

const JUDGE_KEY = "claude-sonnet-4-5";
const DEFAULT_MODELS = ["gemini-3.5-flash", "claude-sonnet-4-5"]; // cheap tier

function recallPrompt(url) {
  return {
    system: "You answer precisely and only from your own knowledge.",
    user: "Below is a URL. Do NOT browse or fetch it. Using ONLY your own knowledge, " +
      "tell me the SPECIFIC content of the page at this exact URL: what is its " +
      "title and what specific thing does it cover? Be concrete (the actual topic/" +
      "entity, not a generic guess from the domain). If you do not actually know " +
      "what is on this specific page, say \"I don't know\".\n\nURL: " + url,
  };
}

function judgePrompt(item, output) {
  return {
    system: "You are a strict grader. Reply only with the requested JSON.",
    user: "A model was asked to recall, from memory only, the SPECIFIC content of the " +
    "page at a URL (it was not allowed to fetch it). Below is the GROUND TRUTH " +
    "(what the page actually contains, from rendering it in a browser) and the " +
    "MODEL ANSWER. Did the model correctly identify the SPECIFIC content of THIS " +
    "page? A generic guess from the domain (e.g. \"a clinical trial\" without the " +
    "actual trial, or \"a blog\" without the actual post) is NOT correct. Saying " +
    "\"I don't know\" is not correct. Reply ONLY with JSON: " +
    '{"recalled": true|false, "reason": "short"}\n\n' +
    `GROUND TRUTH (page title): ${item.title}\n` +
    `GROUND TRUTH (rendered content):\n${item.groundTruth}\n\n` +
    `MODEL ANSWER:\n${output}`,
  };
}

function parseJudge(text) {
  const m = (text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    return { recalled: !!o.recalled, reason: String(o.reason || "") };
  } catch {
    return null;
  }
}

async function pool(tasks, n) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      out[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, worker));
  return out;
}

async function main() {
  const corpus = JSON.parse(readFileSync("results/recall-corpus.json", "utf8"));
  const items = corpus.items || [];
  if (!items.length) throw new Error("empty recall-corpus.json; run cc-recall-corpus.mjs first");

  const pick = (process.env.RECALL_MODELS || "").trim();
  const wantKeys = pick === "all"
    ? MODELS.map((m) => m.key)
    : pick
    ? pick.split(",")
    : DEFAULT_MODELS;
  const models = wantKeys.map(modelByKey).filter((m) => m && hasKeyFor(m.vendor));
  if (!models.length) throw new Error("no usable models (no API keys)");
  const judge = modelByKey(JUDGE_KEY);
  if (!judge || !hasKeyFor(judge.vendor)) throw new Error("judge unavailable");
  console.log(`[recall] ${items.length} items x ${models.length} models (${models.map((m) => m.key).join(", ")}), judge ${judge.key}`);

  // 1. generate recall answers
  const genTasks = [];
  for (const item of items) {
    for (const model of models) {
      genTasks.push(async () => {
        try {
          const res = await callModel(model, recallPrompt(item.url));
          return { id: item.id, track: item.track, url: item.url, model: model.key, output: res.text, error: null };
        } catch (e) {
          return { id: item.id, track: item.track, url: item.url, model: model.key, output: null, error: String(e.message || e) };
        }
      });
    }
  }
  const gen = await pool(genTasks, Number(process.env.RECALL_CONCURRENCY) || 6);
  console.log(`[recall] generated ${gen.filter((g) => g.output).length}/${gen.length}`);

  // 2. judge each
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const judgeTasks = gen.map((g) => async () => {
    if (!g.output) return { ...g, recalled: null, reason: "no output" };
    try {
      const res = await callModel(judge, judgePrompt(itemById[g.id], g.output));
      const v = parseJudge(res.text);
      return { ...g, recalled: v ? v.recalled : null, reason: v ? v.reason : "unparseable" };
    } catch (e) {
      return { ...g, recalled: null, reason: String(e.message || e) };
    }
  });
  const rows = await pool(judgeTasks, 8);
  console.log(`[recall] judged ${rows.filter((r) => r.recalled !== null).length}/${rows.length}`);

  // 3. aggregate
  const agg = (rs) => {
    const j = rs.filter((r) => r.recalled !== null);
    return { n: j.length, recalled: j.filter((r) => r.recalled).length, rate: j.length ? +(j.filter((r) => r.recalled).length / j.length).toFixed(3) : null };
  };
  const byTrack = {
    shell: agg(rows.filter((r) => r.track === "shell")),
    server: agg(rows.filter((r) => r.track === "server")),
  };
  const byTrackModel = {};
  for (const m of models) {
    byTrackModel[m.key] = {
      shell: agg(rows.filter((r) => r.track === "shell" && r.model === m.key)),
      server: agg(rows.filter((r) => r.track === "server" && r.model === m.key)),
    };
  }
  // per item (averaged across models)
  const perItem = items.map((it) => ({
    id: it.id, track: it.track, url: it.url, title: it.title, renderedChars: it.renderedChars,
    ...agg(rows.filter((r) => r.id === it.id)),
  }));

  writeJson("results/recall-shells.json", {
    generatedAt: nowIso(),
    models: models.map((m) => m.key),
    judge: judge.key,
    corpusCounts: corpus.counts,
    byTrack,
    byTrackModel,
    perItem,
    rows,
  });
  console.log(`\n[recall] SHELL recall ${(byTrack.shell.rate * 100).toFixed(0)}% (n=${byTrack.shell.n}) vs SERVER recall ${(byTrack.server.rate * 100).toFixed(0)}% (n=${byTrack.server.n})`);
  console.log("[recall] wrote results/recall-shells.json");
}
main();
