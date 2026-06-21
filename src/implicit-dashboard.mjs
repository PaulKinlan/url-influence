// Build a small, self-contained, embeddable dashboard for the IMPLICIT-influence
// experiment from results/implicit.json. Emits results/implicit.html.
//
// The experiment: a URL is left in the prompt but never referenced. We measure
// how often the model spontaneously raises that URL's topic, across arms:
//   none   - no URL at all (base rate the topic comes up on its own)
//   random - an unrelated real URL present (control for "a URL is present")
//   url    - the target's own (famous, opaque) URL present but unmentioned
//   name   - the topic named in words (ceiling)
// A big gap between `url` and `none`/`random` means a memorised URL tilts the
// output as ambient context, with nothing pointing the model at it.

import { readFileSync, writeFileSync } from "node:fs";

const d = JSON.parse(readFileSync("results/implicit.json", "utf8"));
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pct = (x) => (x == null ? "-" : Math.round(x * 100));

const rows = (d.summary || []).map((r) => ({
  ...r,
  lift: (r.url ?? 0) - Math.max(r.none ?? 0, r.random ?? 0),
})).sort((a, b) => b.lift - a.lift);

const mean = (key) => {
  const xs = rows.map((r) => r[key]).filter((x) => x != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
};
const avgUrl = mean("url"), avgNone = mean("none"), avgRandom = mean("random"), avgName = mean("name");

const ARMS = [
  ["none", "#5b6270", "no URL (base rate)"],
  ["random", "#8a6d3b", "unrelated URL present"],
  ["url", "#7ee081", "target URL present, unmentioned"],
  ["name", "#5aa9ff", "topic named (ceiling)"],
];

const armBars = (r) =>
  ARMS.map(([k, c]) =>
    `<span class="seg"><span class="segl">${k}</span><span class="track"><span class="bar" style="width:${pct(r[k])}%;background:${c}"></span></span><span class="segv">${pct(r[k])}%</span></span>`
  ).join("");

const itemRows = rows.map((r) =>
  `<div class="item"><div class="ih"><span class="iid">${esc(r.id)}</span><span class="grp">${esc(r.group || "")}</span><span class="lift">lift +${pct(r.lift)}</span></div>${armBars(r)}</div>`
).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Implicit URL influence</title><style>
:root{--bg:#0f1115;--fg:#e6e8eb;--mut:#9aa3ad;--line:#2a2f3a;--acc:#5aa9ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;padding:18px}
h1{font-size:17px;margin:0 0 2px}.sub{color:var(--mut);font-size:12px;margin-bottom:14px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);margin:20px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
.head{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px}
.stat{background:#161922;border:1px solid var(--line);border-radius:8px;padding:9px 13px;min-width:120px}
.stat .k{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.03em}
.stat .v{font-size:21px;font-variant-numeric:tabular-nums}.stat .v small{font-size:12px;color:var(--mut)}
.item{border-bottom:1px solid #1c2029;padding:7px 0}
.ih{display:flex;gap:8px;align-items:baseline;margin-bottom:3px}
.iid{font-size:12px}.grp{font-size:10px;color:var(--mut);background:#1c2029;border-radius:6px;padding:0 6px}
.lift{margin-left:auto;font-size:11px;color:#7ee081;font-variant-numeric:tabular-nums}
.seg{display:grid;grid-template-columns:150px 1fr 42px;gap:8px;align-items:center;margin:1px 0}
.segl{font-size:11px;color:var(--mut);text-align:right}
.track{background:#1c2029;border-radius:3px;height:11px;overflow:hidden}.bar{height:100%;border-radius:3px}
.segv{font-size:11px;font-variant-numeric:tabular-nums;color:var(--mut)}
.note{color:var(--mut);font-size:11px;margin-top:16px;border-top:1px solid var(--line);padding-top:8px;line-height:1.5}
</style></head><body>
<h1>Does a URL tilt the output even when nobody mentions it?</h1>
<div class="sub">${(d.rows || []).length} runs across ${(d.models || []).length} models (${esc((d.models || []).join(", "))}), judged by ${esc(d.judge || "")}. Each bar is how often the model spontaneously raised the target topic under that arm.</div>

<div class="head">
  <div class="stat"><div class="k">avg: no URL</div><div class="v">${pct(avgNone)}<small>%</small></div></div>
  <div class="stat"><div class="k">avg: random URL</div><div class="v">${pct(avgRandom)}<small>%</small></div></div>
  <div class="stat" style="border-color:#7ee081"><div class="k">avg: target URL,<br>unmentioned</div><div class="v">${pct(avgUrl)}<small>%</small></div></div>
  <div class="stat"><div class="k">avg: named (ceiling)</div><div class="v">${pct(avgName)}<small>%</small></div></div>
</div>
<div class="sub">A bare, unmentioned URL lifts the topic from ${pct(avgNone)}% (no URL) / ${pct(avgRandom)}% (random URL) to <b>${pct(avgUrl)}%</b>. The model is reading the URL as ambient context and letting it steer the answer, without ever being told to.</div>

<h2>By item (sorted by lift over the no-URL / random-URL baseline)</h2>
${itemRows}

<div class="note"><b>Method.</b> For each item, a neutral task (e.g. "suggest a memorable security incident for a talk") is posed four ways: with no URL, with an unrelated real URL, with the item's own famous opaque URL present but never referenced, and with the topic named outright. An LLM judge marks whether the model's answer raised the target topic. "lift" = the target-URL rate minus the larger of the no-URL and random-URL base rates, isolating the ambient pull of the URL itself. Rates are means across models; small per-cell counts, so read as directional.</div>
</body></html>`;

writeFileSync("results/implicit.html", html);
console.log(`[implicit-dashboard] wrote results/implicit.html (${rows.length} items, avg url ${pct(avgUrl)}% vs none ${pct(avgNone)}%)`);
