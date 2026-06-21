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
import { writeFileSync } from "node:fs";
import { FRAMEWORKS, classify } from "./cc-frameworks.mjs";

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

  let htmlPages = 0, tinyText = 0, shells = 0;
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
      const vlen = visible(r.html).length;
      const c = classify(r.html, vlen, THRESHOLD);
      for (const fw of c.frameworks) fwAll[fw] = (fwAll[fw] || 0) + 1;
      if (vlen < THRESHOLD) tinyText++;
      if (c.shell) {
        shells++;
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
    frameworkPrevalence: Object.fromEntries(Object.entries(fwAll).map(([k, v]) => [k, { pages: v, pct: pct(v) }])),
    shellByKind: Object.fromEntries(Object.entries(shellByKind).map(([k, v]) => [k, { count: v, pct: pct(v) }])),
    topShellDomains: [...shellHosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([host, count]) => ({ host, count })),
    examplesByKind,
  };
  writeFileSync("results/cc-shell-survey.json", JSON.stringify(out, null, 2));

  console.log(`\n=== ${htmlPages} real pages (200 text/html) from ${CRAWL}, ${picks.length} file(s) ===`);
  console.log(`tiny visible text (< ${THRESHOLD}): ${tinyText} = ${pct(tinyText)}%`);
  console.log(`CONFIRMED shells: ${shells} = ${pct(shells)}% of pages`);
  console.log("\nshells by framework:");
  Object.entries(out.shellByKind).sort((a, b) => b[1].count - a[1].count).forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${String(v.count).padStart(5)}  ${v.pct}%`));
  console.log("\nframework prevalence (any html page):");
  Object.entries(out.frameworkPrevalence).sort((a, b) => b[1].pages - a[1].pages).forEach(([k, v]) => console.log(`  ${k.padEnd(14)} ${String(v.pages).padStart(5)}  ${v.pct}%`));
  console.log("\n[confirm] wrote results/cc-shell-survey.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
