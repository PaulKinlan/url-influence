// Common Crawl presence check.
//
// For each corpus item's OPAQUE url, query the Common Crawl CDX index across a
// spread of monthly crawls (2025-26 .. 2026-21) and record which crawls captured
// it. CC presence is an empirical "this URL was in a major training-data source"
// signal — a useful covariate vs inferring training-inclusion from dates alone.
//
// NB Common Crawl is a SAMPLE: absence from one crawl != absent from training,
// so presence is recorded per-crawl and treated as noisy. No model calls.
//
// Writes results/common-crawl.json (committed): { itemId, opaque, idType,
// presentIn: [crawlIds], anyPresent, firstSeen }.

import { CORPUS } from "./corpus.mjs";
import { writeJson, sleep, nowIso } from "./util.mjs";

const CRAWLS = [
  "CC-MAIN-2025-26", // Jun 2025
  "CC-MAIN-2025-38", // Sep 2025
  "CC-MAIN-2025-51", // Dec 2025
  "CC-MAIN-2026-08", // Feb 2026
  "CC-MAIN-2026-17", // Apr 2026
  "CC-MAIN-2026-21", // May 2026
];
const CRAWL_MONTH = {
  "CC-MAIN-2025-26": "2025-06",
  "CC-MAIN-2025-38": "2025-09",
  "CC-MAIN-2025-51": "2025-12",
  "CC-MAIN-2026-08": "2026-02",
  "CC-MAIN-2026-17": "2026-04",
  "CC-MAIN-2026-21": "2026-05",
};

// Query one (crawl, url): true if >=1 capture, false if 404/none, null on error.
async function inCrawl(crawl, url) {
  const api = `https://index.commoncrawl.org/${crawl}-index?url=${encodeURIComponent(url)}&output=json`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(api, { signal: AbortSignal.timeout(30000) });
      if (res.status === 404) return false; // CDX returns 404 for "no captures"
      if (res.status === 429 || res.status >= 500) {
        await sleep(1000 * 2 ** (attempt - 1));
        continue;
      }
      if (!res.ok) return null;
      const text = await res.text();
      return text.trim().length > 0;
    } catch {
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  return null;
}

function idType(it) {
  const o = it.urls?.opaque || "";
  if (/arxiv\.org/.test(o)) return "arXiv";
  if (/nvd\.nist|cve\.org|cveawg/.test(o) || /CVE-\d/.test(o)) return "CVE";
  if (/pubmed|ncbi\.nlm/.test(o)) return "PubMed";
  if (/datatracker|rfc-editor|ietf/.test(o)) return "RFC";
  if (/chromestatus\.com/.test(o)) return "ChromeStatus";
  if (/stackoverflow\.com/.test(o)) return "StackOverflow";
  if (/github\.com\/.+\/commit/.test(o)) return "GitHub-SHA";
  if (/huggingface\.co/.test(o)) return "HuggingFace";
  if (/doi\.org/.test(o)) return "DOI";
  if (/caniuse\.com/.test(o)) return "caniuse";
  return "other";
}

async function main() {
  const out = [];
  for (const it of CORPUS) {
    const url = it.urls?.opaque;
    if (!url) continue;
    const presentIn = [];
    for (const crawl of CRAWLS) {
      const p = await inCrawl(crawl, url);
      if (p === true) presentIn.push(crawl);
      await sleep(150);
    }
    const firstSeen = presentIn.length
      ? CRAWL_MONTH[presentIn.slice().sort()[0]]
      : null;
    out.push({
      itemId: it.id,
      opaque: url,
      idType: idType(it),
      contentDate: it.contentDate,
      popularity: it.popularity || null,
      presentIn,
      anyPresent: presentIn.length > 0,
      firstSeen,
    });
    console.log(
      `[cc] ${it.id.padEnd(34)} ${idType(it).padEnd(13)} present=${presentIn.length}/${CRAWLS.length}`,
    );
  }
  await writeJson("results/common-crawl.json", {
    generatedAt: nowIso(),
    crawls: CRAWLS,
    items: out,
  });
  const any = out.filter((x) => x.anyPresent).length;
  console.log(`\n[cc] done. ${out.length} items checked, ${any} present in >=1 crawl.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
