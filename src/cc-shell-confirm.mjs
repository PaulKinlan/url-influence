// Stage 2: confirm CLIENT-RENDERED SHELLS in Common Crawl, not just thin pages.
//
// Stage 1 (cc-shell-survey.mjs) used WET text and flagged "near-empty" pages, but
// that bucket also contains login/captcha/listing/error pages. This pass streams
// the WARC (raw HTTP responses) so it sees the actual HTML, and classifies a page
// as a shell only when ALL of:
//   - HTTP status 200 and Content-Type text/html
//   - very little VISIBLE text (after stripping scripts/styles/tags)
//   - a client-render signature in the HTML (id="root"/"app"/"__next",
//     __NEXT_DATA__, data-reactroot, ng-version, "enable JavaScript", "Loading…")
// That triple (real page + no text + framework marker) is a confident shell.
//
// Usage:
//   node src/cc-shell-confirm.mjs --files=1 --max=20000 --threshold=300
//   (WARC files are ~1GB gz; --max caps records so you can sample without pulling
//    the whole file. Drop --max to process an entire file.)
//
// Reports the shell rate among real (200 text/html) pages, and a by-registered-
// domain tally so you can see WHICH sites are shells.

import { createGunzip, gunzipSync } from "node:zlib";
import { Readable } from "node:stream";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
}));
const CRAWL = args.crawl || "CC-MAIN-2026-08";
const N_FILES = Number(args.files) || 1;
const MAX = args.max ? Number(args.max) : Infinity;
const THRESHOLD = Number(args.threshold) || 300;
const BASE = "https://data.commoncrawl.org";

const MARKERS = [
  /id=["']root["']/i, /id=["']app["']/i, /id=["']__next["']/i,
  /__NEXT_DATA__/, /data-reactroot/i, /ng-version=/i, /<app-root/i,
  /enable JavaScript/i, /you need to enable javascript/i,
  /window\.__NUXT__/, /data-server-rendered/i, />\s*Loading\.?\.?\.?\s*</i,
];

async function getGzText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const gz = createGunzip(); Readable.fromWeb(res.body).pipe(gz);
  const chunks = []; for await (const c of gz) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

function hostReg(u) {
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    const parts = h.split("."); // crude registered-domain: last 2 labels
    return parts.length <= 2 ? h : parts.slice(-2).join(".");
  } catch { return "?"; }
}
function visible(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

// Parse one WARC `response` record body: "HTTP/1.1 200 ...\r\nhdrs\r\n\r\n<html>".
function parseResponse(body) {
  const sep = body.indexOf("\r\n\r\n");
  if (sep === -1) return null;
  const httpHead = body.slice(0, sep).toString("latin1");
  const status = Number((httpHead.match(/^HTTP\/[\d.]+ (\d{3})/) || [])[1] || 0);
  const ctype = (httpHead.match(/content-type:\s*([^\r\n]+)/i) || [])[1] || "";
  let html = body.slice(sep + 4);
  if (html.length >= 2 && html[0] === 0x1f && html[1] === 0x8b) { try { html = gunzipSync(html); } catch {} }
  return { status, ctype, html: html.toString("utf8") };
}

async function streamWarc(url, onRecord) {
  const res = await fetch(url, { signal: AbortSignal.timeout(900000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const gz = createGunzip(); Readable.fromWeb(res.body).pipe(gz);
  let buf = Buffer.alloc(0); const SEP = Buffer.from("\r\n\r\n");
  let count = 0;
  for await (const chunk of gz) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    for (;;) {
      const hEnd = buf.indexOf(SEP);
      if (hEnd === -1) break;
      const header = buf.slice(0, hEnd).toString("latin1");
      const cl = Number((header.match(/Content-Length:\s*(\d+)/i) || [])[1] || NaN);
      if (!Number.isFinite(cl)) { buf = buf.slice(hEnd + 4); continue; }
      const bodyStart = hEnd + 4;
      if (buf.length < bodyStart + cl) break;
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
  const shellHosts = new Map(), shellEx = [], tinyNoMarkerEx = [];
  for (const p of picks) {
    process.stdout.write(`[confirm] streaming ${p} (max ${MAX}) … `);
    let n = 0;
    await streamWarc(`${BASE}/${p}`, (uri, body) => {
      const r = parseResponse(body); if (!r) return;
      if (r.status !== 200 || !/text\/html/i.test(r.ctype)) return;
      htmlPages++; n++;
      const vlen = visible(r.html).length;
      if (vlen < THRESHOLD) {
        tinyText++;
        const marker = MARKERS.find((re) => re.test(r.html));
        if (marker) {
          shells++;
          shellHosts.set(hostReg(uri), (shellHosts.get(hostReg(uri)) || 0) + 1);
          if (shellEx.length < 20) shellEx.push(`${String(vlen).padStart(4)}c  ${uri}`);
        } else if (tinyNoMarkerEx.length < 10) {
          tinyNoMarkerEx.push(`${String(vlen).padStart(4)}c  ${uri}`);
        }
      }
    });
    console.log(`${n} html pages`);
  }

  console.log(`\n=== ${htmlPages} real pages (200 text/html) from ${CRAWL} ===`);
  console.log(`tiny visible text (< ${THRESHOLD}): ${tinyText} = ${(100 * tinyText / htmlPages).toFixed(1)}%`);
  console.log(`CONFIRMED shells (tiny text + client-render marker): ${shells} = ${(100 * shells / htmlPages).toFixed(1)}% of pages`);
  console.log(`(of the tiny-text pages, ${(100 * shells / Math.max(1, tinyText)).toFixed(0)}% carried a framework marker)`);
  console.log("\ntop registered domains among confirmed shells:");
  [...shellHosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([h, c]) => console.log(`  ${String(c).padStart(4)}  ${h}`));
  console.log("\nexample confirmed shells:");
  shellEx.forEach((e) => console.log("  " + e));
  console.log("\nexample tiny-text WITHOUT a marker (thin pages, not shells):");
  tinyNoMarkerEx.forEach((e) => console.log("  " + e));
}

main().catch((e) => { console.error(e); process.exit(1); });
