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

import { readFileSync } from "node:fs";
import { CORPUS } from "./corpus.mjs";
import { MODELS, modelByKey } from "./models.mjs";
import { callModel, hasKeyFor } from "./providers.mjs";
import { writeJson, nowIso, loadDotEnv } from "./util.mjs";

loadDotEnv();

// Per-item metadata for interpretation: content date (from the corpus) and
// Common-Crawl presence (precomputed in results/common-crawl.json by cc-check).
// These let the dashboard show, per item, whether the URL's content was even
// crawlable, and per (item, model) whether it predates that model's cutoff.
const CORPUS_BY = Object.fromEntries(CORPUS.map((i) => [i.id, i]));
function loadCcMeta() {
  try {
    const raw = JSON.parse(readFileSync("results/common-crawl.json", "utf8"));
    const arr = Array.isArray(raw) ? raw : raw.items || [];
    return Object.fromEntries(arr.map((r) => [r.itemId, r]));
  } catch {
    return {};
  }
}
const CC_BY = loadCcMeta();
function itemMeta(id) {
  const c = CC_BY[id] || {};
  const corp = CORPUS_BY[id] || {};
  const presentIn = c.presentIn || [];
  return {
    contentDate: corp.contentDate || c.contentDate || null,
    idType: c.idType || null,
    opaque: corp.urls?.opaque || c.opaque || null,
    ccChecked: !!CC_BY[id],
    ccPresent: c.anyPresent ?? null, // true/false/null(unknown)
    ccPresentIn: presentIn, // which crawl snapshots had a capture
  };
}

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
  mlpapers:
    "I'm putting together a short talk about influential machine-learning papers and ideas. Suggest one worth covering and explain why it mattered.",
  webfeature:
    "I'm putting together a short talk about modern web platform features. Suggest one worth covering and show a quick example.",
  standards:
    "I'm putting together a short talk about foundational internet and web standards (RFCs). Suggest one worth covering and explain why it matters.",
  biomed:
    "I'm putting together a short talk about landmark biomedical research. Suggest a study worth covering and explain why it was important.",
};

// itemId (must exist in CORPUS), group (-> brainstorm task), descriptive name
// (for the `name` arm), drift target (what counts as surfacing it), and the
// corpus id whose opaque url is the unrelated off-topic `random` control.
//
// Chosen to span the variables that decide the claim: era (pre / 2025-boundary /
// POST-cutoff), Common-Crawl presence (CC+/CC-), and identifier type (canonical
// arXiv/RFC/DOI/PubMed vs opaque-numeric ChromeStatus/CVE). Mixes high-baseline
// positive controls (popover, Attention, Heartbleed — the model volunteers them
// anyway) with low-baseline targets (PPO, RFC 1149, DLBCL) where a URL lift
// would actually be detectable, plus post-cutoff items that must be unknowable.
const ITEMS = [
  // ── security (CVE / opaque-numeric) ──
  { id: "cve-2014-0160-heartbleed", group: "security", name: "the Heartbleed vulnerability", drift: "Heartbleed / the OpenSSL TLS heartbeat buffer over-read (CVE-2014-0160)", randomRef: "arxiv-resnet" },
  { id: "cve-2021-44228-log4shell", group: "security", name: "the Log4Shell vulnerability", drift: "Log4Shell / the Apache Log4j2 JNDI RCE (CVE-2021-44228)", randomRef: "arxiv-gan" },
  { id: "cve-2017-0144-eternalblue", group: "security", name: "the EternalBlue exploit", drift: "EternalBlue / the SMBv1 RCE (CVE-2017-0144)", randomRef: "arxiv-bert" },
  { id: "cve-2018-7600-drupalgeddon2", group: "security", name: "the Drupalgeddon2 vulnerability", drift: "Drupalgeddon2 / the Drupal core RCE (CVE-2018-7600)", randomRef: "arxiv-ppo" },
  { id: "cve-2024-3094-xz-backdoor", group: "security", name: "the xz/liblzma backdoor", drift: "the xz-utils (liblzma) supply-chain backdoor (CVE-2024-3094)", randomRef: "arxiv-vgg" },
  { id: "cve-2026-3000-idexpert-rce", group: "security", name: "the IDExpert RCE", drift: "the IDExpert remote code execution flaw (CVE-2026-3000)", randomRef: "arxiv-attention" },
  { id: "cve-2026-25000-wheel-of-life", group: "security", name: "the Wheel of Life WordPress plugin flaw", drift: "the WordPress 'Wheel of Life' plugin access-control flaw (CVE-2026-25000)", randomRef: "arxiv-mamba" },

  // ── mlpapers (arXiv / canonical id) ──
  { id: "arxiv-attention", group: "mlpapers", name: "the Transformer ('Attention Is All You Need')", drift: "the Transformer / 'Attention Is All You Need' (arXiv 1706.03762)", randomRef: "cve-2021-44228-log4shell" },
  { id: "arxiv-resnet", group: "mlpapers", name: "ResNet (deep residual learning)", drift: "ResNet / deep residual learning (arXiv 1512.03385)", randomRef: "cve-2017-0144-eternalblue" },
  { id: "arxiv-gan", group: "mlpapers", name: "Generative Adversarial Networks", drift: "GANs / adversarial generator-vs-discriminator training (arXiv 1406.2661)", randomRef: "cve-2014-0160-heartbleed" },
  { id: "arxiv-ppo", group: "mlpapers", name: "Proximal Policy Optimization", drift: "PPO / Proximal Policy Optimization (arXiv 1707.06347)", randomRef: "cve-2018-7600-drupalgeddon2" },
  { id: "arxiv-knowledge-distillation", group: "mlpapers", name: "knowledge distillation", drift: "knowledge distillation / 'Distilling the Knowledge in a Neural Network' (arXiv 1503.02531)", randomRef: "cve-2019-0708-bluekeep" },
  { id: "arxiv-mamba", group: "mlpapers", name: "Mamba (selective state-space models)", drift: "Mamba / selective state-space sequence models (arXiv 2312.00752)", randomRef: "cve-2024-3094-xz-backdoor" },
  { id: "arxiv-deepseek-r1", group: "mlpapers", name: "DeepSeek-R1", drift: "DeepSeek-R1 / RL-trained reasoning (arXiv 2501.12948)", randomRef: "rfc-791-ip" },
  { id: "arxiv-gemma-3", group: "mlpapers", name: "Gemma 3", drift: "the Gemma 3 open model report (arXiv 2503.19786)", randomRef: "rfc-9110-http-semantics" },
  { id: "arxiv-lie-algebra-attention", group: "mlpapers", name: "Lie-algebra attention", drift: "the 'Lie-algebra attention' paper (post-2026)", randomRef: "cve-2021-44228-log4shell" },
  { id: "arxiv-multitask-bayesian-icl", group: "mlpapers", name: "multitask Bayesian in-context learning", drift: "the 'multitask Bayesian in-context learning' paper (post-2026)", randomRef: "cve-2017-0144-eternalblue" },

  // ── webfeature (ChromeStatus/caniuse / opaque-numeric) ──
  { id: "popover-api", group: "webfeature", name: "the Popover API", drift: "the HTML Popover API (the popover attribute / popovertarget)", randomRef: "cve-2021-44228-log4shell" },
  { id: "css-anchor-positioning", group: "webfeature", name: "CSS anchor positioning", drift: "CSS anchor positioning (anchor-name / position-anchor / anchor())", randomRef: "cve-2017-0144-eternalblue" },
  { id: "fedcm", group: "webfeature", name: "FedCM", drift: "FedCM / the Federated Credential Management API", randomRef: "arxiv-gan" },
  { id: "css-shape-function", group: "webfeature", name: "the CSS shape() function", drift: "the CSS shape() function for drawing path/shape values", randomRef: "arxiv-ppo" },
  { id: "corner-shape-squircle", group: "webfeature", name: "CSS corner-shape / squircles", drift: "CSS corner-shape (squircle / superellipse rounded corners)", randomRef: "rfc-8259-json" },
  { id: "uint8array-base64-hex", group: "webfeature", name: "Uint8Array base64/hex methods", drift: "Uint8Array.fromBase64 / toBase64 / fromHex / toHex", randomRef: "cve-2018-7600-drupalgeddon2" },
  { id: "css-scroll-state-container-queries", group: "webfeature", name: "scroll-state container queries", drift: "CSS scroll-state container queries (@container scroll-state(...))", randomRef: "arxiv-bert" },
  { id: "math-sumprecise", group: "webfeature", name: "Math.sumPrecise", drift: "Math.sumPrecise() for exact summation", randomRef: "cve-2024-3094-xz-backdoor" },
  { id: "css-gap-decorations", group: "webfeature", name: "CSS gap decorations", drift: "CSS gap decorations (column-rule / row-rule across grid/flex gaps)", randomRef: "rfc-791-ip" },
  { id: "html-in-canvas", group: "webfeature", name: "HTML-in-Canvas", drift: "the HTML-in-Canvas API (drawing live HTML elements into a canvas)", randomRef: "arxiv-attention" },
  { id: "named-feature-supports", group: "webfeature", name: "named-feature() in @supports", drift: "the named-feature() function in @supports / CSS.supports()", randomRef: "cve-2026-3000-idexpert-rce" },

  // ── standards (RFC / canonical id) ──
  { id: "rfc-791-ip", group: "standards", name: "the Internet Protocol (IPv4)", drift: "RFC 791 / the Internet Protocol (IPv4)", randomRef: "arxiv-resnet" },
  { id: "rfc-9110-http-semantics", group: "standards", name: "HTTP Semantics", drift: "RFC 9110 / HTTP Semantics", randomRef: "cve-2021-44228-log4shell" },
  { id: "rfc-1149-avian-carriers", group: "standards", name: "IP over Avian Carriers", drift: "RFC 1149 / IP over Avian Carriers (the carrier-pigeon RFC)", randomRef: "arxiv-gan" },
  { id: "rfc-8259-json", group: "standards", name: "the JSON data interchange format", drift: "RFC 8259 / the JSON data interchange format", randomRef: "cve-2017-0144-eternalblue" },
  { id: "rfc-9700-oauth-security-bcp", group: "standards", name: "the OAuth 2.0 Security Best Current Practice", drift: "RFC 9700 / the OAuth 2.0 Security Best Current Practice", randomRef: "arxiv-ppo" },
  { id: "rfc-9701-jwt-oauth-introspection", group: "standards", name: "JWT responses for OAuth introspection", drift: "RFC 9701 / JWT Response for OAuth 2.0 Token Introspection", randomRef: "arxiv-mamba" },

  // ── biomed (PubMed / DOI / canonical id) ──
  { id: "pmid-11237011-human-genome", group: "biomed", name: "the Human Genome Project paper", drift: "the initial sequencing/analysis of the human genome (2001)", randomRef: "cve-2021-44228-log4shell" },
  { id: "pmid-7466396-evolution-cooperation", group: "biomed", name: "Axelrod & Hamilton on the evolution of cooperation", drift: "'The Evolution of Cooperation' (Axelrod & Hamilton, 1981)", randomRef: "css-anchor-positioning" },
  { id: "pmid-10676951-dlbcl-gene-expression", group: "biomed", name: "DLBCL gene-expression subtypes", drift: "the diffuse large B-cell lymphoma gene-expression-profiling subtypes (Alizadeh et al., 2000)", randomRef: "popover-api" },
  { id: "doi-alphafold-nature", group: "biomed", name: "AlphaFold", drift: "AlphaFold / highly accurate protein structure prediction (Nature 2021)", randomRef: "rfc-791-ip" },
  { id: "doi-optuna-kdd", group: "biomed", name: "Optuna", drift: "Optuna / the hyperparameter optimization framework (KDD 2019)", randomRef: "rfc-8259-json" },
  { id: "pmid-42224782-crispr-echinococcus", group: "biomed", name: "CRISPR in Echinococcus", drift: "the CRISPR-Cas genome editing in Echinococcus study (2026)", randomRef: "math-sumprecise" },
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
    ...itemMeta(it.id), // contentDate, idType, opaque, ccChecked, ccPresent, ccPresentIn
  }));

  await writeJson("results/implicit.json", {
    generatedAt: nowIso(),
    models: models.map((m) => m.key),
    // Per-model cutoff so the dashboard can mark each (item, model) cell pre/post.
    modelCutoffs: Object.fromEntries(models.map((m) => [m.key, m.cutoff])),
    judge: judge.key,
    arms: ARMS,
    // Emit the EXACT prompts per item/arm so the dashboard renders them straight
    // from data instead of re-deriving (which silently drifts when items change).
    prompts: Object.fromEntries(
      ITEMS.map((it) => [it.id, Object.fromEntries(ARMS.map((a) => [a, buildPrompt(it, a)]))]),
    ),
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
