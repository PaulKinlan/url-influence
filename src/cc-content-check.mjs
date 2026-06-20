// Common Crawl CONTENT check (not just CDX presence).
//
// cc-check.mjs only asks "was this URL captured?" (CDX index). This asks the
// sharper question: "is the actual CONTENT in the captured bytes?" — by fetching
// the real WARC record, stripping scripts/markup, and checking whether the item's
// keyword survives. Motivated by the finding that ChromeStatus is a JS app whose
// crawl captures an empty shell ("Chrome Platform Status", 22 chars) with none of
// the feature text, while arXiv server-renders its abstract.
//
// Usage: node src/cc-content-check.mjs [itemId ...]   (default: a spread sample)
// Writes results/cc-content.json.

import { gunzipSync } from "node:zlib";
import { CORPUS } from "./corpus.mjs";
import { writeJson, nowIso, sleep } from "./util.mjs";

const CRAWLS = [
  "CC-MAIN-2026-08", "CC-MAIN-2025-51", "CC-MAIN-2025-38",
  "CC-MAIN-2025-26", "CC-MAIN-2026-17", "CC-MAIN-2026-21",
];

// A keyword that should appear in the real content (lowercased match).
const KEYWORD = {
  "view-transitions": "view transition",
  "css-gap-decorations": "gap decoration",
  "popover-api": "popover",
  "fedcm": "fedcm",
  "arxiv-attention": "attention is all you need",
  "arxiv-diffusiongemma-transparency": "diffusiongemma",
  "so-111102-javascript-closures": "closure",
  "so-79890462-reinterpret-cast-structs": "reinterpret_cast",
  "cve-2014-0160-heartbleed": "heartbleed",
  "rfc-9110-http-semantics": "http semantics",
  "doi-alphafold-nature": "alphafold",
  "rfc-1149-avian-carriers": "avian",
};

const DEFAULT_SAMPLE = Object.keys(KEYWORD);

async function cdx(url) {
  for (const c of CRAWLS) {
    try {
      const r = await fetch(
        `https://index.commoncrawl.org/${c}-index?url=${encodeURIComponent(url)}&output=json`,
        { signal: AbortSignal.timeout(30000) },
      );
      if (r.status === 404) continue;
      if (r.status !== 200) continue;
      const t = (await r.text()).trim();
      if (!t) continue;
      const recs = t.split("\n").map((l) => JSON.parse(l)).filter((x) => x.status === "200");
      if (recs.length) return { crawl: c, rec: recs[0] };
    } catch {
      // try next crawl
    }
    await sleep(150);
  }
  return null;
}

async function warcBody(rec) {
  const off = +rec.offset, len = +rec.length;
  const r = await fetch("https://data.commoncrawl.org/" + rec.filename, {
    headers: { Range: `bytes=${off}-${off + len - 1}` },
    signal: AbortSignal.timeout(60000),
  });
  const txt = gunzipSync(new Uint8Array(await r.arrayBuffer())).toString("utf8");
  const i1 = txt.indexOf("\r\n\r\n");
  const i2 = txt.indexOf("\r\n\r\n", i1 + 4);
  return i2 >= 0 ? txt.slice(i2 + 4) : txt;
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SAMPLE;
  const out = [];
  for (const id of ids) {
    const item = CORPUS.find((i) => i.id === id);
    const url = item?.urls?.opaque;
    if (!url) { console.log(`${id}: no opaque url`); continue; }
    const hit = await cdx(url);
    let row = { id, url, inCrawl: !!hit, crawl: hit?.crawl || null, visibleChars: null, hasContent: null };
    if (hit) {
      try {
        const body = await warcBody(hit.rec);
        const vis = visibleText(body);
        const kw = (KEYWORD[id] || "").toLowerCase();
        row.visibleChars = vis.length;
        row.hasContent = kw ? vis.toLowerCase().includes(kw) : null;
        row.sample = vis.slice(0, 80);
      } catch (e) {
        row.error = String(e.message || e);
      }
    }
    out.push(row);
    console.log(
      `${id.padEnd(36)} inCC=${row.inCrawl ? "Y" : "n"} ` +
        `visible=${row.visibleChars == null ? "-" : String(row.visibleChars).padStart(6)} ` +
        `content=${row.hasContent == null ? "-" : row.hasContent ? "YES" : "NO "} ` +
        `${row.sample ? '"' + row.sample.slice(0, 40) + '"' : ""}`,
    );
    await sleep(200);
  }
  await writeJson("results/cc-content.json", { generatedAt: nowIso(), crawls: CRAWLS, items: out });
  console.log("\n[cc-content] wrote results/cc-content.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
