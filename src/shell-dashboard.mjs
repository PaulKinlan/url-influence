// Build a small, self-contained, embeddable dashboard from the shell survey.
// Reads results/cc-shell-survey.json (written by cc-shell-confirm.mjs) and emits
// results/shell-survey.html with the data inlined (it's tiny). No deps, no fetch,
// so it embeds cleanly in an <iframe> on the blog.

import { readFileSync, writeFileSync } from "node:fs";

const d = JSON.parse(readFileSync("results/cc-shell-survey.json", "utf8"));

const KIND_LABEL = {
  next: "Next.js", nuxt: "Nuxt", react: "React", preact: "Preact",
  angular: "Angular", angularjs: "AngularJS", vue: "Vue", svelte: "Svelte",
  solid: "SolidJS", ember: "Ember", "jquery-onload": "jQuery (onload)",
  unattributed: "Unattributed SPA", jquery: "jQuery", bootstrap: "Bootstrap",
};
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function bars(rows, max, color) {
  return rows.map(([label, count, pct]) =>
    `<div class="row"><div class="lbl">${esc(label)}</div>` +
    `<div class="track"><div class="bar" style="width:${max ? (100 * count / max).toFixed(1) : 0}%;background:${color}"></div></div>` +
    `<div class="val">${count.toLocaleString()} <span class="pct">${pct}%</span></div></div>`
  ).join("");
}

const shellRows = Object.entries(d.shellByKind)
  .map(([k, v]) => [KIND_LABEL[k] || k, v.count, v.pct]).sort((a, b) => b[1] - a[1]);
const shellMax = Math.max(1, ...shellRows.map((r) => r[1]));

const fwRows = Object.entries(d.frameworkPrevalence)
  .map(([k, v]) => [KIND_LABEL[k] || k, v.pages, v.pct]).filter((r) => r[1] > 0).sort((a, b) => b[1] - a[1]);
const fwMax = Math.max(1, ...fwRows.map((r) => r[1]));

const domRows = (d.topShellDomains || []).slice(0, 20)
  .map((x) => `<tr><td>${esc(x.host)}</td><td class="n">${x.count}</td></tr>`).join("");

const exHtml = Object.entries(d.examplesByKind || {}).map(([k, arr]) =>
  `<div class="exgrp"><div class="exh">${esc(KIND_LABEL[k] || k)}</div>` +
  arr.slice(0, 4).map((e) => `<div class="ex"><span class="exv">${e.visible}c</span> <a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.url)}</a></div>`).join("") +
  `</div>`).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Common Crawl shell survey</title>
<style>
  :root{--bg:#0f1115;--fg:#e6e8eb;--mut:#9aa3ad;--line:#2a2f3a;--acc:#5aa9ff;}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:18px}
  h1{font-size:17px;margin:0 0 2px}
  .sub{color:var(--mut);font-size:12px;margin-bottom:16px}
  .head{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:18px}
  .stat{background:#161922;border:1px solid var(--line);border-radius:8px;padding:10px 14px;min-width:130px}
  .stat .k{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  .stat .v{font-size:22px;font-variant-numeric:tabular-nums}
  .stat .v small{font-size:12px;color:var(--mut)}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);margin:22px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
  .row{display:grid;grid-template-columns:130px 1fr 120px;gap:10px;align-items:center;margin:4px 0}
  .lbl{font-size:12px;text-align:right;color:var(--fg)}
  .track{background:#1c2029;border-radius:4px;height:16px;overflow:hidden}
  .bar{height:100%;border-radius:4px}
  .val{font-size:12px;font-variant-numeric:tabular-nums}
  .val .pct{color:var(--mut)}
  table{border-collapse:collapse;width:100%;max-width:420px;font-size:12px}
  td{border-bottom:1px solid var(--line);padding:3px 8px}
  td.n{text-align:right;font-variant-numeric:tabular-nums;color:var(--mut)}
  .exgrp{margin:8px 0}
  .exh{font-size:12px;color:var(--acc);margin-bottom:2px}
  .ex{font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ex .exv{display:inline-block;width:42px;color:#f2b24b}
  a{color:var(--acc);text-decoration:none}
  .note{color:var(--mut);font-size:11px;margin-top:18px;border-top:1px solid var(--line);padding-top:10px;line-height:1.5}
</style></head><body>
<h1>How much of the crawled web is a JavaScript shell?</h1>
<div class="sub">Sample of ${d.htmlPages.toLocaleString()} real (200 text/html) pages from ${esc(d.crawl)} (${d.filesSampled} WARC file${d.filesSampled > 1 ? "s" : ""}${d.maxPerFile ? `, ${d.maxPerFile.toLocaleString()}/file` : ""}) · generated ${esc((d.generatedAt || "").slice(0, 10))}</div>

<div class="head">
  <div class="stat"><div class="k">pages sampled</div><div class="v">${d.htmlPages.toLocaleString()}</div></div>
  <div class="stat"><div class="k">near-empty text</div><div class="v">${d.tinyTextPct}<small>%</small></div></div>
  ${d.dataInHtmlPct != null ? `<div class="stat"><div class="k">content in inline JSON<br>(not a shell)</div><div class="v">${d.dataInHtmlPct}<small>%</small></div></div>` : ""}
  <div class="stat"><div class="k">confirmed shells</div><div class="v">${d.shellPct}<small>%</small></div></div>
  <div class="stat"><div class="k">text threshold</div><div class="v">${d.threshold}<small> chars</small></div></div>
</div>
${d.avgHtmlKB ? `<div class="sub">A shell is still plenty of HTML: confirmed shells average <b>${d.avgHtmlKB.shell} KB</b> of raw HTML (bundles, markup) versus ${d.avgHtmlKB.all} KB across all pages, but almost none of it is readable text. "Near-empty text" pages whose content actually sits in inline JSON (Next.js __NEXT_DATA__ and friends) are counted as content-present, not shells.</div>` : ""}

<h2>Confirmed shells by framework (% of all crawled pages)</h2>
${bars(shellRows, shellMax, "#f2b24b")}

<h2>Framework prevalence across all crawled pages (% of pages)</h2>
${bars(fwRows, fwMax, "#5aa9ff")}

${d.rankBuckets ? `<h2>Shell rate by site popularity (Majestic rank of the domain)</h2>
${(() => { const max = Math.max(0.01, ...d.rankBuckets.map((b) => b.shellPct)); return d.rankBuckets.map((b) =>
  `<div class="row"><div class="lbl">${esc(b.tier)}</div>` +
  `<div class="track"><div class="bar" style="width:${(100 * b.shellPct / max).toFixed(1)}%;background:#7ee081"></div></div>` +
  `<div class="val">${b.shellPct}<span class="pct">% of ${b.pages.toLocaleString()}</span></div></div>`).join(""); })()}
<div class="sub" style="margin:6px 0 0">% = share of that tier's sampled pages that are confirmed shells. Common Crawl samples the long tail heavily, so the popular tiers have fewer pages (counts shown); read thin tiers with caution.</div>` : ""}

<h2>Top registered domains among confirmed shells</h2>
<table><tbody>${domRows}</tbody></table>

<h2>Example shells (visible-text chars · URL)</h2>
${exHtml}

<div class="note">
<b>Method.</b> Streams Common Crawl WARC files, keeps 200 <code>text/html</code> responses, strips scripts/styles/markup, and flags a page as a shell when the visible text is under ${d.threshold} characters AND the HTML carries a client-render signature (framework marker, jQuery-with-onload, or a generic SPA skeleton). A "near-empty" page without any such signature is treated as a thin page, not a shell. Detection is from raw HTML only, so pure client-side React that ships just <code>&lt;div id="root"&gt;</code> lands in "Unattributed SPA", and the rates are best read as estimates from this sample, not exact population figures.
</div>
</body></html>`;

writeFileSync("results/shell-survey.html", html);
console.log(`[shell-dashboard] wrote results/shell-survey.html (shells ${d.shellPct}% of ${d.htmlPages} pages)`);
