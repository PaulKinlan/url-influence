// Deepen the dataset: for every recall item, verify its URL's render type
// (raw bytes vs browser-rendered) and join it against the model recall scores,
// so we can ask "does render type predict recall?" across the whole corpus,
// not just the hand-picked ChromeStatus / COVID examples.
//
// Writes results/render-recall.json. Usage: node src/cc-render-recall-join.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { CORPUS } from "./corpus.mjs";

// Include the recall track (mostly server-rendered famous ids) AND the
// ChromeStatus web-feature items (kind "code"), whose opaque URL is a
// client-rendered shell — that's what lets us compare recall by render type.
const isChromeStatusShell = (u) => /chromestatus\.com\/feature/.test(u || "");
const recall = CORPUS
  .filter((i) => i.kind === "recall" || isChromeStatusShell(i.urls?.opaque))
  .map((i) => ({
    id: i.id,
    url: i.urls?.opaque || i.urls?.descriptive || "",
    popularity: i.popularity || "?",
    track: i.kind,
  }));

// recall score: url-only finalCorrectness, averaged across models (pre-cutoff only)
const tx = readFileSync("results/transcript.jsonl", "utf8").trim().split("\n")
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
function recallScore(id, condition) {
  const rows = tx.filter((r) => r.itemId === id && r.condition === condition && !r.skipped && !r.runError && typeof r.finalCorrectness === "number");
  if (!rows.length) return null;
  return +(rows.reduce((a, b) => a + b.finalCorrectness, 0) / rows.length).toFixed(2);
}

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}
function curlRaw(url) {
  return new Promise((res) => execFile("curl", ["-s", "-L", "--max-time", "25", "-A", "Mozilla/5.0 (research)", url],
    { timeout: 30000, maxBuffer: 64 * 1024 * 1024 }, (e, out) => res(out ? visibleText(out).length : 0)));
}
function render(url) {
  return new Promise((res) => execFile("chromium", ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--virtual-time-budget=12000", "--dump-dom", url],
    { timeout: 45000, maxBuffer: 64 * 1024 * 1024 }, (e, out) => res(out ? visibleText(out).length : 0)));
}
function verdict(raw, rend) {
  if (rend < 400 && raw < 400) return "dead/blocked";
  if (rend < 400) return "server"; // render failed but raw has content
  if (raw >= rend * 0.55) return "server";
  if (raw < rend * 0.2) return "shell";
  return "partial";
}
async function pool(items, n, fn) {
  const out = []; let i = 0;
  const w = async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, w));
  return out;
}

async function main() {
  console.log(`[render-recall] checking ${recall.length} recall-item URLs...`);
  const rows = await pool(recall, 4, async (it, idx) => {
    const [raw, rend] = await Promise.all([curlRaw(it.url), render(it.url)]);
    // ChromeStatus is a known shell (raw ~22 chars, content only after JS);
    // headless chromium often fails to render its Polymer app, so don't let a
    // render failure mislabel it. Established in the post's ChromeStatus capture.
    const v = isChromeStatusShell(it.url) ? "shell" : verdict(raw, rend);
    const r = {
      ...it,
      rawVisible: raw, renderedVisible: rend, renderType: v,
      recallUrlOnly: recallScore(it.id, "url-only"),
      recallNameOnly: recallScore(it.id, "name-only"),
      recallFullContent: recallScore(it.id, "full-content"),
    };
    console.log(`  ${String(idx + 1).padStart(2)}/${recall.length} ${v.padEnd(11)} recall=${r.recallUrlOnly} [${it.popularity}] ${it.id}`);
    return r;
  });

  // analysis: recall by render type (url-only)
  const groups = {};
  for (const r of rows) {
    if (r.recallUrlOnly == null) continue;
    (groups[r.renderType] = groups[r.renderType] || []).push(r.recallUrlOnly);
  }
  const summary = Object.fromEntries(Object.entries(groups).map(([k, xs]) => [k, { n: xs.length, meanRecall: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) }]));

  writeFileSync("results/render-recall.json", JSON.stringify({
    generatedAt: new Date().toISOString(),
    n: rows.length,
    recallByRenderType: summary,
    rows: rows.sort((a, b) => (a.renderType).localeCompare(b.renderType) || (b.recallUrlOnly ?? -1) - (a.recallUrlOnly ?? -1)),
  }, null, 2));
  console.log("\n[render-recall] recall (url-only) by render type:");
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(12)} n=${v.n}  mean recall=${v.meanRecall}`);
  const shells = rows.filter((r) => r.renderType === "shell");
  if (shells.length) { console.log("\n[render-recall] SHELL recall items:"); shells.forEach((s) => console.log(`  recall=${s.recallUrlOnly} ${s.id} (${s.url.slice(0, 50)})`)); }
  console.log("\n[render-recall] wrote results/render-recall.json");
}
main();
