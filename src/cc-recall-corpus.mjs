// Build a recall-test corpus of crawled URLs split by render type.
//
// SHELL  = client-rendered: the crawler saw an (almost) empty page, but a real
//          browser renders substantial content. These are the pages whose
//          content is very likely MISSING from training (if Common Crawl is a
//          source), so the prediction is ~0 recall from the bare URL.
// SERVER = server-rendered: content is in the HTML the crawler saw, so it could
//          be in training.
//
// We render every candidate with headless chromium to (a) get ground truth and
// (b) drop dead/parked/empty pages (nothing to recall). Output:
//   results/recall-corpus.json  -> consumed by src/cc-recall-shells.mjs
//
// Usage: node src/cc-recall-corpus.mjs [--per=18] [--cap=70]

import { readFileSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/);
  return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
}));
const PER = Number(args.per) || 18; // target valid items per track
const CAP = Number(args.cap) || 70; // max candidates rendered per track
const MIN_RENDERED = 600; // chars of rendered visible text to count as "has content"

const spec = JSON.parse(readFileSync("results/cc-specimens.json", "utf8"));

// Recognizable shells with opaque IDs and rich content behind JS (the
// ChromeStatus pattern, a second time). Real NCT ids from clinicaltrials.gov.
const SEED_SHELLS = [
  "https://clinicaltrials.gov/study/NCT02846857",
  "https://clinicaltrials.gov/study/NCT00000378",
  "https://clinicaltrials.gov/study/NCT04280705",
  "https://clinicaltrials.gov/study/NCT03035123",
];

const shellCands = [
  ...SEED_SHELLS,
  ...(spec.specimens["empty-mount-shell"] || []).map((s) => s.url),
  ...(spec.specimens["marker-shell"] || []).map((s) => s.url),
];
const serverCands = [
  ...(spec.specimens["content"] || []).map((s) => s.url),
  ...(spec.specimens["framework-content"] || []).map((s) => s.url),
];

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function titleOf(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim().slice(0, 200) : "";
}
const PARKED = /(domain (is )?for sale|buy this domain|parked free|enable javascript to run this app|page not found|404 not found|are you a robot|access denied|just a moment)/i;

function render(url) {
  return new Promise((resolve) => {
    execFile(
      "chromium",
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--virtual-time-budget=9000",
        "--timeout=25000",
        "--dump-dom",
        url,
      ],
      { timeout: 40000, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout) return resolve(null);
        const html = stdout || "";
        const vis = visibleText(html);
        resolve({ url, title: titleOf(html), rendered: vis, renderedLen: vis.length });
      },
    );
  });
}

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

async function collect(cands, track, want) {
  const seen = new Set();
  const picked = [];
  const batch = cands.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return /^https?:\/\//.test(u);
  }).slice(0, CAP);
  process.stdout.write(`[recall-corpus] rendering ${batch.length} ${track} candidates...\n`);
  const rendered = await pool(batch, 4, async (u, idx) => {
    const r = await render(u);
    process.stdout.write(`  ${track} ${idx + 1}/${batch.length} ${r ? r.renderedLen + "c" : "FAIL"} ${u.slice(0, 70)}\n`);
    return r;
  });
  for (const r of rendered) {
    if (picked.length >= want) break;
    if (!r) continue;
    if (r.renderedLen < MIN_RENDERED) continue;
    if (PARKED.test(r.title) || PARKED.test(r.rendered.slice(0, 300))) continue;
    picked.push(r);
  }
  return picked;
}

async function main() {
  const shells = await collect(shellCands, "shell", PER);
  const servers = await collect(serverCands, "server", PER);
  const mk = (r, track, i) => ({
    id: `recall-${track}-${i + 1}`,
    track,
    url: r.url,
    title: r.title,
    renderedChars: r.renderedLen,
    // ground truth for the judge: what a browser actually sees on the page
    groundTruth: r.rendered.slice(0, 1600),
  });
  const items = [
    ...shells.map((r, i) => mk(r, "shell", i)),
    ...servers.map((r, i) => mk(r, "server", i)),
  ];
  const out = {
    generatedAt: new Date().toISOString(),
    minRendered: MIN_RENDERED,
    counts: { shell: shells.length, server: servers.length },
    items,
  };
  writeFileSync("results/recall-corpus.json", JSON.stringify(out, null, 2));
  console.log(`\n[recall-corpus] wrote ${items.length} items (shell ${shells.length}, server ${servers.length}) -> results/recall-corpus.json`);
}
main();
