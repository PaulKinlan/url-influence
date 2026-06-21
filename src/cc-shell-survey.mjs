// Estimate how prevalent "empty JS-shell" pages are in Common Crawl.
//
// A client-rendered page (SPA) is fetched fine by the crawler but its real
// content is injected by JavaScript, which the crawler never runs. So in the
// crawl it is a 200 text/html page whose EXTRACTED TEXT is almost nothing. That
// is exactly what the WET (extracted-text) files capture, so we can sample a few
// WET files and measure the distribution of per-page text length.
//
// You do NOT need the whole crawl. Each monthly crawl has ~90k WET files; each is
// already a random spread of pages. Grab a handful and stream them.
//
// Usage:
//   node src/cc-shell-survey.mjs                 # defaults: 2 WET files, recent crawl
//   node src/cc-shell-survey.mjs --files=5 --crawl=CC-MAIN-2026-08 --threshold=300
//
// Caveats (read before quoting a number):
//   - Low extracted text != definitely a JS shell. Short pages, listing pages,
//     redirects, and error pages also score low. Treat the rate as an UPPER bound
//     on "client-rendered shells" and confirm a sample by hand (the script prints
//     example URLs). For a tighter signal, cross-check the WARC for SPA markers
//     (id="root"/"app", __NEXT_DATA__, "enable JavaScript") - see notes at bottom.
//   - WET only contains records that had *some* text, so genuinely 0-byte pages
//     may be absent; the shell boilerplate ("Loading…", nav) is what we catch.
//   - "Sites" here = hostname (no public-suffix collapsing), so it's approximate.

import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);
const CRAWL = args.crawl || "CC-MAIN-2026-08";
const N_FILES = Number(args.files) || 2;
const THRESHOLD = Number(args.threshold) || 300; // chars of extracted text
const BASE = "https://data.commoncrawl.org";

// Download + gunzip a gz file fully into a Buffer (small files like the paths list).
async function getGz(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const gunzip = createGunzip();
  Readable.fromWeb(res.body).pipe(gunzip);
  const chunks = [];
  for await (const c of gunzip) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

// Stream a WET file, parse WARC conversion records, call onPage(url, textLen) per
// page. Buffer-based so memory stays bounded regardless of file size.
async function streamWet(url, onPage) {
  const res = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const gunzip = createGunzip();
  Readable.fromWeb(res.body).pipe(gunzip);
  let buf = Buffer.alloc(0);
  const SEP = Buffer.from("\r\n\r\n");
  for await (const chunk of gunzip) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    // Parse as many complete records as the buffer holds.
    for (;;) {
      const hEnd = buf.indexOf(SEP);
      if (hEnd === -1) break;
      const header = buf.slice(0, hEnd).toString("latin1");
      const clMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!clMatch) { buf = buf.slice(hEnd + 4); continue; }
      const len = Number(clMatch[1]);
      const bodyStart = hEnd + 4;
      if (buf.length < bodyStart + len) break; // wait for more data
      const uri = (header.match(/WARC-Target-URI:\s*(\S+)/i) || [])[1] || null;
      const type = (header.match(/WARC-Type:\s*(\S+)/i) || [])[1] || "";
      if (uri && type === "conversion") {
        const text = buf.slice(bodyStart, bodyStart + len).toString("utf8").trim();
        onPage(uri, text.length);
      }
      buf = buf.slice(bodyStart + len);
      while (buf.length >= 2 && buf[0] === 13 && buf[1] === 10) buf = buf.slice(2);
    }
  }
}

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "?"; } }

async function main() {
  console.log(`[survey] crawl=${CRAWL} files=${N_FILES} shell-threshold=${THRESHOLD} chars`);
  console.log(`[survey] fetching WET path list…`);
  const paths = (await getGz(`${BASE}/crawl-data/${CRAWL}/wet.paths.gz`)).trim().split("\n");
  console.log(`[survey] ${paths.length} WET files in this crawl; sampling ${N_FILES}`);
  // Pick N spread-out files deterministically-ish (evenly spaced + jitter).
  const picks = [];
  for (let i = 0; i < N_FILES; i++) picks.push(paths[Math.floor((i + Math.random()) / N_FILES * paths.length)]);

  let pages = 0, shells = 0;
  const buckets = { "0-50": 0, "51-300": 0, "301-1k": 0, "1k-5k": 0, "5k+": 0 };
  const shellHosts = new Map();
  const shellExamples = [], fineExamples = [];

  for (const p of picks) {
    process.stdout.write(`[survey] streaming ${p} … `);
    let filePages = 0;
    await streamWet(`${BASE}/${p}`, (url, n) => {
      pages++; filePages++;
      if (n <= 50) buckets["0-50"]++;
      else if (n <= 300) buckets["51-300"]++;
      else if (n <= 1000) buckets["301-1k"]++;
      else if (n <= 5000) buckets["1k-5k"]++;
      else buckets["5k+"]++;
      if (n < THRESHOLD) {
        shells++;
        const h = hostOf(url);
        shellHosts.set(h, (shellHosts.get(h) || 0) + 1);
        if (shellExamples.length < 15 && n > 0) shellExamples.push(`${String(n).padStart(4)}c  ${url}`);
      } else if (fineExamples.length < 5) fineExamples.push(`${String(n).padStart(6)}c  ${url}`);
    });
    console.log(`${filePages} pages`);
  }

  console.log(`\n=== ${pages} pages sampled from ${CRAWL} ===`);
  console.log(`near-empty (< ${THRESHOLD} chars of extracted text): ${shells} = ${(100 * shells / pages).toFixed(1)}%`);
  console.log("\ntext-length distribution:");
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(8)} ${(100 * v / pages).toFixed(1)}%  (${v})`);
  console.log("\ntop hosts among near-empty pages:");
  [...shellHosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([h, c]) => console.log(`  ${String(c).padStart(4)}  ${h}`));
  console.log("\nexample near-empty pages (likely shells, eyeball these):");
  shellExamples.forEach((e) => console.log("  " + e));
  console.log("\nexample full-text pages (sanity):");
  fineExamples.forEach((e) => console.log("  " + e));
}

main().catch((e) => { console.error(e); process.exit(1); });

// To go from "near-empty text" to "confirmed JS shell", re-fetch the WARC record
// for a sample of the flagged URLs and check the raw HTML for client-render
// markers while text is ~0: id="root" / id="app" / __NEXT_DATA__ / data-reactroot
// / ng-version / 'enable JavaScript' / 'Loading…'. High HTML-size-to-text ratio +
// a framework marker + tiny text = a client-rendered shell with high confidence.
