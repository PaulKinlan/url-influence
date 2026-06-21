// Render results/cc-specimens.json into a browsable, clickable page: the category
// split, which traits predict shells, and example URLs in EVERY category (shells
// and non-shells) so the classification can be spot-checked from both sides.

import { readFileSync, writeFileSync } from "node:fs";

const d = JSON.parse(readFileSync("results/cc-specimens.json", "utf8"));
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CATS = ["empty-mount-shell", "marker-shell", "data-in-html", "thin", "framework-content", "content"];
const CAT_LABEL = {
  "empty-mount-shell": "Empty-mount shells (trustworthy)", "marker-shell": "Marker shells (tiny text + framework)",
  "data-in-html": "Content in inline JSON (not a shell)", "thin": "Thin pages (no framework)",
  "framework-content": "Framework + content (NOT a shell)", "content": "Plain content pages",
};
const SHELL_CATS = new Set(["empty-mount-shell", "marker-shell"]);

// Which traits predict a shell: share of each trait within shells vs content.
const shellPages = (d.categoryCounts["empty-mount-shell"] || 0) + (d.categoryCounts["marker-shell"] || 0);
const contentPages = (d.categoryCounts["content"] || 0) + (d.categoryCounts["framework-content"] || 0);
const merge = (cats) => { const m = {}; for (const c of cats) for (const [t, n] of Object.entries(d.traitByCategory[c] || {})) m[t] = (m[t] || 0) + n; return m; };
const shellTraits = merge(["empty-mount-shell", "marker-shell"]);
const contentTraits = merge(["content", "framework-content"]);
const allTraits = [...new Set([...Object.keys(shellTraits), ...Object.keys(contentTraits)])];
const traitRows = allTraits.map((t) => ({
  t, shell: +(100 * (shellTraits[t] || 0) / Math.max(1, shellPages)).toFixed(1),
  content: +(100 * (contentTraits[t] || 0) / Math.max(1, contentPages)).toFixed(1),
})).filter((r) => r.shell >= 2 || r.content >= 2).sort((a, b) => (b.shell - b.content) - (a.shell - a.content));

const specimenHtml = (cat) => (d.specimens[cat] || []).map((s) =>
  `<div class="sp"><span class="v">${s.visible}c</span><span class="kb">${s.htmlKB}KB</span> ` +
  `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` +
  (s.traits.length ? `<div class="tr">${s.traits.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>` : "") +
  `</div>`).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Common Crawl shell specimens</title><style>
:root{--bg:#0f1115;--fg:#e6e8eb;--mut:#9aa3ad;--line:#2a2f3a;--acc:#5aa9ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;padding:18px}
h1{font-size:17px;margin:0 0 2px}.sub{color:var(--mut);font-size:12px;margin-bottom:14px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);margin:20px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
table{border-collapse:collapse;width:100%;max-width:560px;font-size:12px;margin-bottom:8px}
th,td{border-bottom:1px solid var(--line);padding:3px 8px;text-align:left}td.n{text-align:right;font-variant-numeric:tabular-nums}
.bar2{display:inline-block;height:9px;border-radius:3px;vertical-align:middle}
.sp{font-size:12px;padding:3px 0;border-bottom:1px solid #1c2029;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp .v{display:inline-block;width:46px;color:#f2b24b}.sp .kb{display:inline-block;width:54px;color:var(--mut)}
.tr{margin:2px 0 4px 100px}.chip{display:inline-block;font-size:10px;background:#1c2029;border:1px solid var(--line);border-radius:8px;padding:0 6px;margin:1px 2px;color:var(--mut)}
a{color:var(--acc);text-decoration:none}details{margin:6px 0;border:1px solid var(--line);border-radius:6px;padding:6px 10px}
summary{cursor:pointer;font-size:13px}summary .c{color:var(--mut);font-weight:normal}
.note{color:var(--mut);font-size:11px;margin-top:16px;border-top:1px solid var(--line);padding-top:8px;line-height:1.5}
</style></head><body>
<h1>What actually predicts a JavaScript shell?</h1>
<div class="sub">${d.pages.toLocaleString()} pages from ${esc(d.crawl)} (${d.filesSampled} WARC files). Click any URL to inspect the live page; the chips are the traits detected in the crawled HTML.</div>

<h2>Category split</h2>
<table><tbody>${CATS.map((c) => `<tr><td>${esc(CAT_LABEL[c])}</td><td class="n">${(d.categoryCounts[c] || 0).toLocaleString()}</td><td class="n">${d.categoryPct[c]}%</td></tr>`).join("")}</tbody></table>

<h2>Traits: share in shells vs content pages</h2>
<table><thead><tr><th>trait</th><th class="n">in shells</th><th class="n">in content</th><th></th></tr></thead><tbody>
${traitRows.map((r) => `<tr><td>${esc(r.t)}</td><td class="n">${r.shell}%</td><td class="n">${r.content}%</td><td><span class="bar2" style="width:${Math.min(100, r.shell)}px;background:#f2b24b"></span><span class="bar2" style="width:${Math.min(100, r.content)}px;background:#5aa9ff"></span></td></tr>`).join("")}
</tbody></table>
<div class="sub">Orange = % of shell pages carrying the trait, blue = % of content pages. A trait skewed orange predicts a shell; one that's similar on both (e.g. jQuery) does not.</div>

<h2>Click through to samples (spot-check both sides)</h2>
${CATS.map((c) => `<details${SHELL_CATS.has(c) ? " open" : ""}><summary>${esc(CAT_LABEL[c])} <span class="c">(${(d.categoryCounts[c] || 0).toLocaleString()} pages, showing ${(d.specimens[c] || []).length})</span></summary>${specimenHtml(c) || '<div class="sub">none in sample</div>'}</details>`).join("")}

<div class="note">Traits are detected from the raw crawled HTML. "visible" = readable text after stripping scripts/markup; "KB" = raw HTML size. Empty-mount shells are pages whose app container (<code>&lt;div id="root"&gt;</code> etc.) is empty in the capture; framework-content pages carry a client framework but render real content (server-side), so they are not shells.</div>
</body></html>`;

writeFileSync("results/shell-specimens.html", html);
console.log(`[specimens-dashboard] wrote results/shell-specimens.html (${d.pages} pages, ${CATS.reduce((a, c) => a + (d.specimens[c] || []).length, 0)} specimens)`);
