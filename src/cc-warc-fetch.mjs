// Slice-by-site shell check: confirm shells for a SPECIFIC set of pages, using
// the Common Crawl columnar index (via DuckDB) to choose which pages, then this
// script to fetch each page's raw HTML and classify it.
//
// The columnar cc-index has, per captured page: url, url_host_registered_domain,
// fetch_status, content_mime_type, AND warc_filename / warc_record_offset /
// warc_record_length. Those last three let you fetch the exact stored bytes with
// a single HTTP range request, so you do NOT need the (rate-limited) CDX index.
//
// ---------------------------------------------------------------------------
// STEP 1 - install DuckDB (you have mise):   mise use -g duckdb
//          (or: curl https://install.duckdb.org | sh)
//
// STEP 2 - query the index, sliced by site. Example: pick 200 real HTML pages
//          from a domain you care about and emit the WARC coordinates as CSV.
//
//   duckdb -csv -noheader -c "
//     INSTALL httpfs; LOAD httpfs; SET s3_region='us-east-1';
//     SELECT url, warc_filename, warc_record_offset, warc_record_length
//     FROM read_parquet('s3://commoncrawl/cc-index/table/cc-main/warc/crawl=CC-MAIN-2026-08/subset=warc/*.parquet', hive_partitioning=1)
//     WHERE url_host_registered_domain='YOURSITE.com'
//       AND fetch_status=200 AND content_mime_type='text/html'
//     LIMIT 200;
//   " > pages.csv
//
//   (CC's S3 bucket is public; recent DuckDB does unsigned requests when no
//    credentials are set. If it complains, list with the AWS CLI instead:
//    aws s3 ls --no-sign-request s3://commoncrawl/cc-index/table/cc-main/warc/crawl=CC-MAIN-2026-08/subset=warc/
//    and point read_parquet at specific https://data.commoncrawl.org/... part files.)
//
//   To slice the whole web by site (which domains have the most pages, etc.):
//     SELECT url_host_registered_domain, count(*) n
//     FROM read_parquet('s3://commoncrawl/cc-index/.../subset=warc/*.parquet', hive_partitioning=1)
//     WHERE fetch_status=200 AND content_mime_type='text/html'
//     GROUP BY 1 ORDER BY n DESC LIMIT 100;
//
// STEP 3 - shell-check those exact pages:
//   node src/cc-warc-fetch.mjs pages.csv
//
// CSV columns expected (no header): url,warc_filename,warc_record_offset,warc_record_length

import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const BASE = "https://data.commoncrawl.org";
const THRESHOLD = Number(process.env.THRESHOLD) || 300;
const MARKERS = [
  /id=["']root["']/i, /id=["']app["']/i, /id=["']__next["']/i, /__NEXT_DATA__/,
  /data-reactroot/i, /ng-version=/i, /<app-root/i, /enable JavaScript/i,
  /you need to enable javascript/i, /window\.__NUXT__/, /data-server-rendered/i, />\s*Loading\.?\.?\.?\s*</i,
];
const visible = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const reg = (u) => { try { const h = new URL(u).hostname.replace(/^www\./, ""); return h; } catch { return "?"; } };

async function fetchRecord(file, off, len) {
  const r = await fetch(`${BASE}/${file}`, { headers: { Range: `bytes=${off}-${+off + +len - 1}` }, signal: AbortSignal.timeout(60000) });
  const rec = gunzipSync(new Uint8Array(await r.arrayBuffer())).toString("latin1"); // full WARC record
  const i = rec.indexOf("\r\n\r\n"); // end of WARC headers
  const http = rec.slice(i + 4);
  const j = http.indexOf("\r\n\r\n"); // end of HTTP headers
  const head = http.slice(0, j);
  const status = Number((head.match(/^HTTP\/[\d.]+ (\d{3})/) || [])[1] || 0);
  const ctype = (head.match(/content-type:\s*([^\r\n]+)/i) || [])[1] || "";
  let html = http.slice(j + 4);
  // re-decode as utf8 (we read latin1 to keep bytes intact through the header split)
  html = Buffer.from(html, "latin1").toString("utf8");
  return { status, ctype, html };
}

async function main() {
  const file = process.argv[2];
  if (!file) { console.error("usage: node src/cc-warc-fetch.mjs pages.csv  (url,warc_filename,offset,length)"); process.exit(1); }
  const rows = readFileSync(file, "utf8").trim().split("\n").map((l) => l.split(",")).filter((r) => r.length >= 4);
  let html = 0, tiny = 0, shells = 0; const byHost = new Map(), ex = [];
  let done = 0;
  for (const [url, wf, off, len] of rows) {
    try {
      const r = await fetchRecord(wf, off, len);
      if (r.status === 200 && /text\/html/i.test(r.ctype)) {
        html++;
        const v = visible(r.html).length;
        if (v < THRESHOLD) {
          tiny++;
          if (MARKERS.some((re) => re.test(r.html))) {
            shells++; byHost.set(reg(url), (byHost.get(reg(url)) || 0) + 1);
            if (ex.length < 20) ex.push(`${String(v).padStart(4)}c  ${url}`);
          }
        }
      }
    } catch (e) { /* skip unfetchable */ }
    if (++done % 50 === 0) process.stdout.write(`\r[fetch] ${done}/${rows.length}`);
  }
  console.log(`\n\n=== ${rows.length} rows, ${html} real (200 text/html) pages ===`);
  console.log(`tiny visible text (< ${THRESHOLD}): ${tiny} = ${(100 * tiny / Math.max(1, html)).toFixed(1)}%`);
  console.log(`confirmed shells (tiny + marker): ${shells} = ${(100 * shells / Math.max(1, html)).toFixed(1)}% of pages`);
  console.log("\nby host (confirmed shells):");
  [...byHost.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([h, c]) => console.log(`  ${String(c).padStart(4)}  ${h}`));
  console.log("\nexamples:"); ex.forEach((e) => console.log("  " + e));
}

main().catch((e) => { console.error(e); process.exit(1); });
