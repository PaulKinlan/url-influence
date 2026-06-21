// Specimen + trait co-occurrence pass over Common Crawl.
//
// For a sample of pages, record each page's CATEGORY (empty-mount-shell /
// marker-shell / data-in-html / thin / framework-content / content) and its full
// trait list (frameworks + SPA libraries), then report which traits co-occur with
// shells vs content pages, and save clickable example URLs in EVERY category so
// the classification can be spot-checked from both sides.
//
// Usage: node src/cc-specimens.mjs --files=4 --max=12000 [--crawl=CC-MAIN-2026-08]
// Writes results/cc-specimens.json (rendered by src/specimens-dashboard.mjs).

import { createGunzip, gunzipSync } from "node:zlib";
import { Readable } from "node:stream";
import { writeFileSync } from "node:fs";
import { detect, detectLibs, categorize, inlineDataLen } from "./cc-frameworks.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
}));
const CRAWL = args.crawl || "CC-MAIN-2026-08";
const N_FILES = Number(args.files) || 4;
const MAX = args.max ? Number(args.max) : Infinity;
const THRESHOLD = Number(args.threshold) || 300;
const PER_CAT = Number(args.per) || 30;
const BASE = "https://data.commoncrawl.org";
const CATS = ["empty-mount-shell", "marker-shell", "data-in-html", "thin", "framework-content", "content"];

async function getGzText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const gz = createGunzip(); Readable.fromWeb(res.body).pipe(gz);
  const chunks = []; for await (const c of gz) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}
function visible(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}
function parseResponse(body) {
  const sep = body.indexOf("\r\n\r\n"); if (sep === -1) return null;
  const head = body.slice(0, sep).toString("latin1");
  const status = Number((head.match(/^HTTP\/[\d.]+ (\d{3})/) || [])[1] || 0);
  const ctype = (head.match(/content-type:\s*([^\r\n]+)/i) || [])[1] || "";
  let html = body.slice(sep + 4);
  if (html.length >= 2 && html[0] === 0x1f && html[1] === 0x8b) { try { html = gunzipSync(html); } catch {} }
  return { status, ctype, html: html.toString("utf8") };
}
async function streamWarc(url, onRecord) {
  const res = await fetch(url, { signal: AbortSignal.timeout(900000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const gz = createGunzip(); Readable.fromWeb(res.body).pipe(gz);
  let buf = Buffer.alloc(0); const SEP = Buffer.from("\r\n\r\n"); let count = 0;
  for await (const chunk of gz) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    for (;;) {
      const hEnd = buf.indexOf(SEP); if (hEnd === -1) break;
      const header = buf.slice(0, hEnd).toString("latin1");
      const cl = Number((header.match(/Content-Length:\s*(\d+)/i) || [])[1] || NaN);
      if (!Number.isFinite(cl)) { buf = buf.slice(hEnd + 4); continue; }
      const bodyStart = hEnd + 4; if (buf.length < bodyStart + cl) break;
      const type = (header.match(/WARC-Type:\s*(\S+)/i) || [])[1] || "";
      const uri = (header.match(/WARC-Target-URI:\s*(\S+)/i) || [])[1] || null;
      if (type === "response" && uri) { onRecord(uri, buf.slice(bodyStart, bodyStart + cl)); count++; }
      buf = buf.slice(bodyStart + cl);
      while (buf.length >= 2 && buf[0] === 13 && buf[1] === 10) buf = buf.slice(2);
      if (count >= MAX) return;
    }
    if (count >= MAX) return;
  }
}

async function main() {
  const paths = (await getGzText(`${BASE}/crawl-data/${CRAWL}/warc.paths.gz`)).trim().split("\n");
  const picks = [];
  const pool = paths.slice();
  for (let i = 0; i < N_FILES && pool.length; i++) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);

  let pages = 0;
  const catCount = Object.fromEntries(CATS.map((c) => [c, 0]));
  const traitByCat = Object.fromEntries(CATS.map((c) => [c, {}]));   // cat -> trait -> count
  const specimens = Object.fromEntries(CATS.map((c) => [c, []]));     // cat -> [{url,visible,htmlKB,traits}]
  let seen = 0;

  for (const p of picks) {
    process.stdout.write(`[specimens] streaming ${p} … `);
    let n = 0;
    await streamWarc(`${BASE}/${p}`, (uri, body) => {
      const r = parseResponse(body); if (!r) return;
      if (r.status !== 200 || !/text\/html/i.test(r.ctype)) return;
      pages++; n++;
      const vlen = visible(r.html).length;
      const dlen = inlineDataLen(r.html);
      const cat = categorize(r.html, vlen, dlen, THRESHOLD);
      const traits = [...detect(r.html), ...detectLibs(r.html)];
      catCount[cat]++;
      for (const t of traits) traitByCat[cat][t] = (traitByCat[cat][t] || 0) + 1;
      // reservoir-ish sampling: keep first PER_CAT per category
      if (specimens[cat].length < PER_CAT) specimens[cat].push({ url: uri, visible: vlen, htmlKB: +(r.html.length / 1024).toFixed(1), traits });
    });
    console.log(`${n} html pages`);
  }

  const out = {
    generatedAt: new Date().toISOString(), crawl: CRAWL, filesSampled: picks.length, threshold: THRESHOLD,
    pages, warcFiles: picks,
    categoryCounts: catCount,
    categoryPct: Object.fromEntries(CATS.map((c) => [c, +(100 * catCount[c] / Math.max(1, pages)).toFixed(2)])),
    traitByCategory: traitByCat,
    specimens,
  };
  writeFileSync("results/cc-specimens.json", JSON.stringify(out, null, 2));

  console.log(`\n=== ${pages} pages, ${picks.length} file(s), ${CRAWL} ===`);
  console.log("category split:");
  for (const c of CATS) console.log(`  ${c.padEnd(18)} ${String(catCount[c]).padStart(6)}  ${out.categoryPct[c]}%`);
  console.log("\ntop traits among empty-mount shells (count / share of that bucket):");
  const total = catCount["empty-mount-shell"] || 1;
  Object.entries(traitByCat["empty-mount-shell"]).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([t, n]) => console.log(`  ${t.padEnd(16)} ${String(n).padStart(5)}  ${(100 * n / total).toFixed(0)}%`));
  console.log("\n[specimens] wrote results/cc-specimens.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
