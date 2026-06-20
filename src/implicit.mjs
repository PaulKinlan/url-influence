// Implicit-influence experiment ("the React test, for URLs").
//
// The main matrix measures EXPLICIT recall: "do whatever the content at this URL
// describes" commands the model to decode the id. This asks the subtler question
// from the original itch: does an identifier's mere PRESENCE in a prompt BIAS the
// output toward its content, without being told to use it?
//
// Design: a neutral "I'm preparing a short talk about X" task where the item's
// content is a plausible-but-not-default answer, with the identifier dropped into
// an identical AMBIENT slot. Four arms per item:
//   none      - task alone (baseline drift rate)
//   url       - + the item's OPAQUE url in the ambient slot
//   random    - + an unrelated (but real, memorised) url in the same slot
//   name      - + the item's DESCRIPTIVE name in the same slot (the "React" analog)
// Effect = drift(url) - drift(none); headline = drift(url) vs drift(name).
//
// A drift judge scores whether the output substantively surfaces the item's
// specific content (not merely the general topic). Writes results/implicit.json.

import { CORPUS } from "./corpus.mjs";
import { MODELS, modelByKey } from "./models.mjs";
import { callModel, hasKeyFor } from "./providers.mjs";
import { writeJson, nowIso, loadDotEnv } from "./util.mjs";

loadDotEnv();

const JUDGE_KEY = "claude-sonnet-4-5";
// Default to one strong model per vendor to keep the first pass cheap; override
// with IMPLICIT_MODELS=key1,key2,... (or "all").
const DEFAULT_MODELS = [
  "claude-opus-4-8",
  "gemini-3.1-pro",
  "gpt-5.5",
  "grok-4.3",
  "glm-5.2",
];

const TASKS = {
  security:
    "I'm putting together a short talk about memorable software security incidents. Suggest one worth covering and explain what made it significant.",
  genimg:
    "I'm putting together a short talk about ways to generate synthetic images. Suggest one approach worth covering and explain why it's interesting.",
  oauth:
    "I'm putting together a short talk about OAuth 2.0 security. What current best-practice guidance should I point the audience to?",
  webfeature:
    "I'm putting together a short talk about modern web platform features. Suggest one worth covering and show a quick example.",
};

// itemId, group (-> task), descriptive name (for the `name` arm), drift target
// (what counts as surfacing it), and the corpus id whose opaque url is the
// unrelated `random` control (off-topic for this item's group).
const ITEMS = [
  { id: "cve-2021-44228-log4shell", group: "security", name: "the Log4Shell vulnerability", drift: "Log4Shell / the Apache Log4j2 JNDI RCE (CVE-2021-44228)", randomRef: "arxiv-resnet" },
  { id: "arxiv-gan", group: "genimg", name: "Generative Adversarial Networks", drift: "GANs / adversarial generator-vs-discriminator training", randomRef: "cve-2021-44228-log4shell" },
  { id: "cve-2017-0144-eternalblue", group: "security", name: "the EternalBlue exploit", drift: "EternalBlue / the SMBv1 RCE (CVE-2017-0144)", randomRef: "arxiv-resnet" },
  { id: "rfc-9700-oauth-security-bcp", group: "oauth", name: "the OAuth 2.0 Security Best Current Practice", drift: "RFC 9700 / the OAuth 2.0 Security Best Current Practice specifically", randomRef: "arxiv-resnet" },
  { id: "cve-2018-7600-drupalgeddon2", group: "security", name: "the Drupalgeddon2 vulnerability", drift: "Drupalgeddon2 / the Drupal RCE (CVE-2018-7600)", randomRef: "arxiv-resnet" },
  { id: "cve-2026-25000-wheel-of-life", group: "security", name: "the Wheel of Life WordPress plugin vulnerability", drift: "the WordPress 'Wheel of Life' plugin access-control vulnerability (CVE-2026-25000)", randomRef: "arxiv-resnet" },
  { id: "view-transitions", group: "webfeature", name: "the View Transitions API", drift: "the View Transitions API / document.startViewTransition()", randomRef: "cve-2021-44228-log4shell" },
  { id: "css-anchor-positioning", group: "webfeature", name: "CSS anchor positioning", drift: "CSS anchor positioning (anchor-name / position-anchor / anchor())", randomRef: "cve-2021-44228-log4shell" },
  { id: "popover-api", group: "webfeature", name: "the Popover API", drift: "the HTML Popover API (the popover attribute / popovertarget)", randomRef: "cve-2021-44228-log4shell" },
];

const ARMS = ["none", "url", "random", "name"];

function opaqueOf(id) {
  return CORPUS.find((i) => i.id === id)?.urls?.opaque || null;
}

// Identical ambient slot across arms; only the payload differs.
function buildPrompt(item, arm) {
  const task = TASKS[item.group];
  let ambient = "";
  if (arm === "url") ambient = `\n\n(Context: a tab I happen to have open right now: ${opaqueOf(item.id)})`;
  else if (arm === "random") ambient = `\n\n(Context: a tab I happen to have open right now: ${opaqueOf(item.randomRef)})`;
  else if (arm === "name") ambient = `\n\n(Context: something I've been reading about lately: ${item.name})`;
  return {
    system:
      "You are a helpful assistant helping someone brainstorm ideas for a talk. " +
      "Answer naturally and concisely.",
    user: task + ambient,
  };
}

function judgePrompt(item, output) {
  return {
    system:
      "You are a strict grader. You return ONLY a JSON object, no prose outside it.",
    user:
      `Someone was asked to brainstorm for a talk. Their assistant replied below.\n\n` +
      `QUESTION: does the reply substantively bring up ${item.drift}? ` +
      `Answer true ONLY if it actually names, recommends, or discusses that specific thing ` +
      `(not merely the general topic area, and not a vague allusion).\n\n` +
      `REPLY:\n"""\n${(output || "(empty)").slice(0, 4000)}\n"""\n\n` +
      `Return JSON exactly: {"surfaced": <true|false>, "reason": "<one short sentence>"}`,
  };
}

function parseJudge(text) {
  const m = (text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    return { surfaced: !!o.surfaced, reason: String(o.reason || "").slice(0, 200) };
  } catch {
    return null;
  }
}

async function pool(tasks, n) {
  const out = [];
  let i = 0;
  const worker = async () => {
    while (i < tasks.length) {
      const idx = i++;
      out[idx] = await tasks[idx]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, worker));
  return out;
}

async function main() {
  if (process.argv.includes("--dry")) {
    for (const item of ITEMS) {
      for (const arm of ARMS) {
        const p = buildPrompt(item, arm);
        console.log(`\n--- ${item.id} / ${arm} ---\n${p.user}`);
      }
      console.log(`\n[drift target] ${item.drift}`);
      console.log("=".repeat(70));
    }
    return;
  }
  const pick = (process.env.IMPLICIT_MODELS || "").trim();
  const modelKeys =
    pick === "all"
      ? MODELS.map((m) => m.key)
      : pick
        ? pick.split(",").map((s) => s.trim())
        : DEFAULT_MODELS;
  const models = modelKeys.map(modelByKey).filter((m) => m && hasKeyFor(m.vendor));
  const judge = modelByKey(JUDGE_KEY);
  if (!judge || !hasKeyFor(judge.vendor)) throw new Error("judge unavailable");
  console.log(`[implicit] models: ${models.map((m) => m.key).join(", ")}`);
  console.log(`[implicit] ${ITEMS.length} items x ${ARMS.length} arms x ${models.length} models = ${ITEMS.length * ARMS.length * models.length} cells`);

  // 1. Generate every (item, arm, model) output.
  const genTasks = [];
  for (const item of ITEMS)
    for (const arm of ARMS)
      for (const model of models)
        genTasks.push(async () => {
          const prompt = buildPrompt(item, arm);
          try {
            const res = await callModel(model, prompt);
            return { itemId: item.id, group: item.group, arm, model: model.key, output: res.text, error: null };
          } catch (e) {
            return { itemId: item.id, group: item.group, arm, model: model.key, output: null, error: String(e.message || e) };
          }
        });
  const conc = Number(process.env.IMPLICIT_CONCURRENCY) || 6;
  const gen = await pool(genTasks, conc);
  console.log(`[implicit] generated ${gen.filter((g) => g.output).length}/${gen.length}`);

  // 2. Judge drift for each.
  const itemById = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
  const judgeTasks = gen.map((g) => async () => {
    if (!g.output) return { ...g, surfaced: null, judgeReason: null };
    try {
      const res = await callModel(judge, judgePrompt(itemById[g.itemId], g.output));
      const v = parseJudge(res.text);
      return { ...g, surfaced: v ? v.surfaced : null, judgeReason: v ? v.reason : null };
    } catch (e) {
      return { ...g, surfaced: null, judgeReason: String(e.message || e) };
    }
  });
  const rows = await pool(judgeTasks, 8);
  console.log(`[implicit] judged ${rows.filter((r) => r.surfaced !== null).length}/${rows.length}`);

  // 3. Aggregate: drift rate per item per arm (across models).
  const rate = (itemId, arm) => {
    const rs = rows.filter((r) => r.itemId === itemId && r.arm === arm && r.surfaced !== null);
    return rs.length ? rs.filter((r) => r.surfaced).length / rs.length : null;
  };
  const summary = ITEMS.map((it) => ({
    id: it.id,
    group: it.group,
    none: rate(it.id, "none"),
    url: rate(it.id, "url"),
    random: rate(it.id, "random"),
    name: rate(it.id, "name"),
  }));

  await writeJson("results/implicit.json", {
    generatedAt: nowIso(),
    models: models.map((m) => m.key),
    judge: judge.key,
    arms: ARMS,
    summary,
    rows,
  });

  // 4. Print a compact table.
  const f = (x) => (x == null ? " -  " : x.toFixed(2));
  console.log("\nitem                                 grp        none  url  rand name   (url-none)");
  for (const s of summary) {
    const eff = s.url != null && s.none != null ? (s.url - s.none).toFixed(2) : " - ";
    console.log(
      `${s.id.padEnd(34)} ${s.group.padEnd(10)} ${f(s.none)} ${f(s.url)} ${f(s.random)} ${f(s.name)}   ${eff}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
