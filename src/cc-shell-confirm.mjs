// Stage 2: confirm CLIENT-RENDERED SHELLS in Common Crawl and quantify them BY
// FRAMEWORK (React, Angular, AngularJS, Vue, Ember, Svelte, Solid, Next, Nuxt,
// Preact, plus jQuery-onload and Bootstrap). One streaming pass over WARC.
//
// A page counts as a shell when it is a real 200 text/html page with very little
// VISIBLE text AND a client-render signal (see cc-frameworks.mjs). Detection is
// from raw HTML, so pure CSR React with only <div id="root"> lands in the
// generic "unattributed" bucket.
//
// Usage:
//   node src/cc-shell-confirm.mjs --files=5 --max=15000 --threshold=300
//   (WARC files are ~1GB gz; --max caps records per file so you can sample.)
//
// Writes results/cc-shell-survey.json (consumed by the shell-survey dashboard).

import { createGunzip, gunzipSync } from "node:zlib";
import { Readable } from "node:stream";
import { writeFileSync, readFileSync } from "node:fs";
import { FRAMEWORKS, classify, inlineDataLen } from "./cc-frameworks.mjs";

// Optional popularity ranking (Majestic Million / Tranco CSV: rank,...,domain).
// Lets us bucket the shell rate by how popular a site is.
function loadRanks(path) {
  const map = new Map();
  const lines = readFileSync(path, "utf8").split("\n");
  const header = lines[0].toLowerCase();
  const cols = header.split(",");
  const rankCol = cols.findIndex((c) => /rank/.test(c)); // GlobalRank
  const domCol = cols.findIndex((c) => c === "domain");
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(",");
    if (f.length <= Math.max(rankCol, domCol)) continue;
    const dom = (f[domCol] || "").toLowerCase().trim();
    const rank = Number(f[rankCol]);
    if (dom && rank) map.set(dom, rank);
  }
  return map;
}
// Progressive suffix match: news.bbc.co.uk -> bbc.co.uk if that's the ranked one.
function rankOf(host, map) {
  if (!map) return null;
  let h = host.replace(/^www\./, "");
  const parts = h.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const cand = parts.slice(i).join(".");
    const r = map.get(cand);
    if (r) return r;
  }
  return null;
}
function rankTier(rank) {
  if (rank == null) return "unranked";
  if (rank <= 1000) return "top 1k";
  if (rank <= 10000) return "1k-10k";
  if (rank <= 100000) return "10k-100k";
  return "100k-1M";
}
const TIER_ORDER = ["top 1k", "1k-10k", "10k-100k", "100k-1M", "unranked"];

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
}));
const CRAWL = args.crawl || "CC-MAIN-2026-08";
const N_FILES = Number(args.files) || 1;
const MAX = args.max ? Number(args.max) : Infinity;
const THRESHOLD = Number(args.threshold) || 300;
const BASE = "https://data.commoncrawl.org";

async function getGzText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const gz = createGunzip(); Readable.fromWeb(res.body).pipe(gz);
  const chunks = []; for await (const c of gz) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}
function hostReg(u) {
  try { const h = new URL(u).hostname.replace(/^www\./, ""); const p = h.split("."); return p.length <= 2 ? h : p.slice(-2).join("."); } catch { return "?"; }
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
  console.log(`[confirm] crawl=${CRAWL} files=${N_FILES} max=${MAX} threshold=${THRESHOLD}`);
  const paths = (await getGzText(`${BASE}/crawl-data/${CRAWL}/warc.paths.gz`)).trim().split("\n");
  console.log(`[confirm] ${paths.length} WARC files; sampling ${N_FILES}`);
  const picks = [];
  for (let i = 0; i < N_FILES; i++) picks.push(paths[Math.floor((i + Math.random()) / N_FILES * paths.length)]);

  const ranks = args.ranks ? loadRanks(args.ranks) : null;
  if (ranks) console.log(`[confirm] loaded ${ranks.size} ranked domains from ${args.ranks}`);
  const tierStats = Object.fromEntries(TIER_ORDER.map((t) => [t, { pages: 0, shells: 0 }]));

  let htmlPages = 0, tinyText = 0, shells = 0, dataInHtml = 0;
  let htmlBytesAll = 0, htmlBytesShell = 0;                                  // raw HTML size: shells are big HTML, no text
  const fwAll = Object.fromEntries(FRAMEWORKS.map((f) => [f.name, 0]));     // framework present on any html page
  const shellByKind = {};                                                   // shell attribution
  const shellHosts = new Map(); const examplesByKind = {};

  for (const p of picks) {
    process.stdout.write(`[confirm] streaming ${p} (max ${MAX}) … `);
    let n = 0;
    await streamWarc(`${BASE}/${p}`, (uri, body) => {
      const r = parseResponse(body); if (!r) return;
      if (r.status !== 200 || !/text\/html/i.test(r.ctype)) return;
      htmlPages++; n++;
      let tier = null;
      if (ranks) { try { tier = rankTier(rankOf(new URL(uri).hostname, ranks)); tierStats[tier].pages++; } catch {} }
      const vlen = visible(r.html).length;
      const dlen = inlineDataLen(r.html);
      const c = classify(r.html, vlen, THRESHOLD, dlen);
      htmlBytesAll += r.html.length;
      for (const fw of c.frameworks) fwAll[fw] = (fwAll[fw] || 0) + 1;
      if (vlen < THRESHOLD) tinyText++;
      if (c.kind === "data-in-html") dataInHtml++;
      if (c.shell) {
        shells++;
        htmlBytesShell += r.html.length;
        if (tier) tierStats[tier].shells++;
        shellByKind[c.kind] = (shellByKind[c.kind] || 0) + 1;
        shellHosts.set(hostReg(uri), (shellHosts.get(hostReg(uri)) || 0) + 1);
        (examplesByKind[c.kind] = examplesByKind[c.kind] || []);
        if (examplesByKind[c.kind].length < 8) examplesByKind[c.kind].push({ url: uri, visible: vlen });
      }
    });
    console.log(`${n} html pages`);
  }

  const pct = (x) => +(100 * x / Math.max(1, htmlPages)).toFixed(2);
  const out = {
    generatedAt: new Date().toISOString(),
    crawl: CRAWL, filesSampled: picks.length, maxPerFile: MAX === Infinity ? null : MAX, threshold: THRESHOLD,
    htmlPages, tinyText, tinyTextPct: pct(tinyText), shells, shellPct: pct(shells),
    dataInHtml, dataInHtmlPct: pct(dataInHtml),
    avgHtmlKB: { all: +(htmlBytesAll / Math.max(1, htmlPages) / 1024).toFixed(1), shell: +(htmlBytesShell / Math.max(1, shells) / 1024).toFixed(1) },
    frameworkPrevalence: Object.fromEntries(Object.entries(fwAll).map(([k, v]) => [k, { pages: v, pct: pct(v) }])),
    shellByKind: Object.fromEntries(Object.entries(shellByKind).map(([k, v]) => [k, { count: v, pct: pct(v) }])),
    topShellDomains: [...shellHosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([host, count]) => ({ host, count })),
    rankBuckets: ranks ? TIER_ORDER.map((t) => ({
      tier: t, pages: tierStats[t].pages, shells: tierStats[t].shells,
      shellPct: +(100 * tierStats[t].shells / Math.max(1, tierStats[t].pages)).toFixed(2),
    })) : null,
    examplesByKind,
  };
  writeFileSync("results/cc-shell-survey.json", JSON.stringify(out, null, 2));

  console.log(`\n=== ${htmlPages} real pages (200 text/html) from ${CRAWL}, ${picks.length} file(s) ===`);
  console.log(`tiny visible text (< ${THRESHOLD}): ${tinyText} = ${pct(tinyText)}%`);
  console.log(`  of which content is in inline JSON (NOT a shell): ${dataInHtml} = ${pct(dataInHtml)}%`);
  console.log(`CONFIRMED shells (tiny visible AND tiny inline-data + marker): ${shells} = ${pct(shells)}% of pages`);
  console.log(`avg raw HTML: all pages ${out.avgHtmlKB.all}KB vs shells ${out.avgHtmlKB.shell}KB (shells are big HTML, ~no text)`);
  console.log("\nshells by framework:");
  Object.entries(out.shellByKind).sort((a, b) => b[1].count - a[1].count).forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${String(v.count).padStart(5)}  ${v.pct}%`));
  console.log("\nframework prevalence (any html page):");
  Object.entries(out.frameworkPrevalence).sort((a, b) => b[1].pages - a[1].pages).forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${String(v.pages).padStart(5)}  ${v.pct}%`));
  if (out.rankBuckets) {
    console.log("\nshell rate by popularity tier (Majestic rank of the page's domain):");
    out.rankBuckets.forEach((b) => console.log(`  ${b.tier.padEnd(10)} ${String(b.shells).padStart(5)}/${String(b.pages).padStart(6)} pages = ${b.shellPct}% shells`));
  }
  console.log("\n[confirm] wrote results/cc-shell-survey.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
