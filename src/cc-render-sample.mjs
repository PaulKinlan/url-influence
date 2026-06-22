// Raw-bytes (what the crawler sees) vs browser-rendered (what a user sees) for a
// spread of URLs, to show the shell-vs-server split with evidence and to hunt
// for a same-origin server-rendered-vs-client-rendered CONTENT pair.
//
// Writes results/render-sample.json. Usage: node src/cc-render-sample.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";

const CURATED = [
  // expected server-rendered (content in raw bytes)
  ["server", "https://nvd.nist.gov/vuln/detail/CVE-2021-44228"],
  ["server", "https://en.wikipedia.org/wiki/Photosynthesis"],
  ["server", "https://arxiv.org/abs/1706.03762"],
  ["server", "https://developer.mozilla.org/en-US/docs/Web/API/fetch"],
  ["server", "https://www.rfc-editor.org/rfc/rfc9110"],
  ["server", "https://pubmed.ncbi.nlm.nih.gov/11237011/"],
  ["server", "https://github.com/torvalds/linux"],
  ["server", "https://news.ycombinator.com/item?id=1"],
  ["server", "https://www.bbc.com/news"],
  ["server", "https://react.dev/reference/react/useState"],
  // expected client-rendered shells (content only after JS)
  ["shell", "https://clinicaltrials.gov/study/NCT02846857"],
  ["shell", "https://bsky.app/profile/bsky.app"],
  ["shell", "https://chromestatus.com/feature/5085655327309824"],
  ["shell", "https://www.figma.com/community"],
  ["shell", "https://linear.app"],
  ["shell", "https://vercel.com/templates"],
  ["shell", "https://music.youtube.com/"],
  ["shell", "https://www.reddit.com/r/programming/"],
  // same-origin hunts: multiple pages per origin to spot mixed rendering
  ["?", "https://notion.so/help"],
  ["?", "https://www.notion.so/templates"],
  ["?", "https://nvd.nist.gov/vuln/search"],
  ["?", "https://docs.github.com/en/rest"],
  ["?", "https://support.google.com/chrome"],
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

function curlRaw(url) {
  return new Promise((resolve) => {
    execFile("curl", ["-s", "-L", "--max-time", "25", "-A", "Mozilla/5.0 (research)", url],
      { timeout: 30000, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => resolve(stdout ? visibleText(stdout).length : 0));
  });
}
function render(url) {
  return new Promise((resolve) => {
    execFile("chromium", ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--virtual-time-budget=14000", "--dump-dom", url],
      { timeout: 45000, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => resolve(stdout ? visibleText(stdout).length : 0));
  });
}

function verdict(raw, rend) {
  if (rend < 400) return "dead/empty";
  if (raw >= rend * 0.55) return "server";
  if (raw < rend * 0.2) return "shell";
  return "partial";
}

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  const w = async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, w));
  return out;
}

async function main() {
  const list = CURATED.map(([expected, url]) => ({ expected, url, source: "curated" }));
  // add the recall-corpus URLs to verify their track
  if (existsSync("results/recall-corpus.json")) {
    const c = JSON.parse(readFileSync("results/recall-corpus.json", "utf8"));
    for (const it of c.items || []) list.push({ expected: it.track, url: it.url, source: "recall-corpus" });
  }
  console.log(`[render-sample] checking ${list.length} URLs (raw vs rendered)...`);
  const rows = await pool(list, 4, async (it, idx) => {
    const [raw, rend] = await Promise.all([curlRaw(it.url), render(it.url)]);
    const v = verdict(raw, rend);
    console.log(`  ${String(idx + 1).padStart(2)}/${list.length} raw=${String(raw).padEnd(7)} rend=${String(rend).padEnd(7)} ${v.padEnd(11)} [${it.expected}] ${it.url.slice(0, 60)}`);
    return { ...it, rawVisible: raw, renderedVisible: rend, ratio: rend ? +(raw / rend).toFixed(3) : null, verdict: v };
  });

  // same-origin mixed-rendering hunt
  const byOrigin = {};
  for (const r of rows) {
    try { const o = new URL(r.url).hostname.replace(/^www\./, ""); (byOrigin[o] = byOrigin[o] || []).push(r); } catch {}
  }
  const mixed = Object.entries(byOrigin).filter(([, rs]) => {
    const v = new Set(rs.map((r) => r.verdict).filter((x) => x === "server" || x === "shell"));
    return v.has("server") && v.has("shell");
  }).map(([o]) => o);

  writeFileSync("results/render-sample.json", JSON.stringify({
    generatedAt: new Date().toISOString(),
    n: rows.length,
    counts: { server: rows.filter((r) => r.verdict === "server").length, shell: rows.filter((r) => r.verdict === "shell").length, partial: rows.filter((r) => r.verdict === "partial").length, dead: rows.filter((r) => r.verdict === "dead/empty").length },
    sameOriginMixed: mixed,
    rows,
  }, null, 2));
  console.log(`\n[render-sample] same-origin origins with BOTH server+shell content pages: ${mixed.length ? mixed.join(", ") : "none found"}`);
  console.log("[render-sample] wrote results/render-sample.json");
}
main();
