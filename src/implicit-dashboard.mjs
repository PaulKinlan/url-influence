// Build a self-contained, interactive dashboard for the IMPLICIT-influence
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
//
// The page is fully inspectable: every item expands to a model x arm matrix,
// and every cell opens the actual model output and the judge's verdict, so a
// reader can check that the data backs the claims made in the blog post.

import { readFileSync, writeFileSync } from "node:fs";
import { DESCRIPTIVE_NAMES, CORPUS } from "./corpus.mjs";

const d = JSON.parse(readFileSync("results/implicit.json", "utf8"));
const pct = (x) => (x == null ? null : Math.round(x * 100));

// Arms in display order, each with a colour used everywhere (bars + legend).
const ARMS = [
  { key: "none", color: "#6b7280", label: "no URL", desc: "no URL in the prompt at all — the base rate this topic comes up on its own" },
  { key: "random", color: "#c08a3e", label: "random URL", desc: "an unrelated real URL is present — controls for merely having a URL in the prompt" },
  { key: "url", color: "#34d399", label: "target URL, unmentioned", desc: "the item's own famous opaque URL is present but never referenced in the task" },
  { key: "name", color: "#60a5fa", label: "topic named", desc: "the topic is named outright in words — the ceiling" },
];

const models = d.models || [];
const rows = d.rows || [];

// Prompts are emitted verbatim by implicit.mjs into results/implicit.json
// (`prompts[item][arm] = {system,user}`), so the dashboard renders the EXACT
// prompt sent without re-deriving it — no drift when the item set changes.
const PROMPTS = d.prompts || {};
const promptFor = (id, arm) => (PROMPTS[id] || {})[arm] || null;

// Friendly title for an item id, falling back to a humanised id.
const titleFor = (id) =>
  DESCRIPTIVE_NAMES[id] ||
  id.replace(/^(cve|rfc|arxiv|gh|wiki)-/i, (m) => m.toUpperCase().replace("-", " "))
    .replace(/-/g, " ");

// Index runs by item -> arm -> model so the client can render a matrix and
// open the underlying output + judge reason for any cell.
const byItem = new Map();
for (const r of rows) {
  if (!byItem.has(r.itemId)) byItem.set(r.itemId, {});
  const arms = byItem.get(r.itemId);
  (arms[r.arm] ||= {})[r.model] = {
    surfaced: !!r.surfaced,
    error: r.error || null,
    output: r.output || "",
    judgeReason: r.judgeReason || "",
  };
}

// Per item/arm: how many models surfaced the topic, and the rate.
const countArm = (cells, arm) => {
  const m = cells[arm] || {};
  const runs = Object.values(m);
  const total = runs.length;
  const surfaced = runs.filter((x) => x.surfaced).length;
  return { surfaced, total, rate: total ? surfaced / total : null };
};

const summary = (d.summary || []).map((s) => {
  const cells = byItem.get(s.id) || {};
  const counts = Object.fromEntries(ARMS.map((a) => [a.key, countArm(cells, a.key)]));
  const base = Math.max(counts.none.rate ?? 0, counts.random.rate ?? 0);
  return {
    id: s.id,
    title: titleFor(s.id),
    group: s.group || "",
    counts,
    lift: (counts.url.rate ?? 0) - base,
    cells,
    prompts: Object.fromEntries(ARMS.map((a) => [a.key, promptFor(s.id, a.key)])),
    // interpretation metadata (from implicit.json summary)
    contentDate: s.contentDate || null,
    idType: s.idType || null,
    opaque: s.opaque || null,
    ccPresent: s.ccPresent ?? null,
    ccPresentIn: s.ccPresentIn || [],
  };
}).sort((a, b) => b.lift - a.lift);

// Overall averages per arm (mean of per-item rates).
const avg = {};
for (const a of ARMS) {
  const xs = summary.map((s) => s.counts[a.key].rate).filter((x) => x != null);
  avg[a.key] = xs.length ? xs.reduce((p, c) => p + c, 0) / xs.length : 0;
}

const DATA = { models, judge: d.judge || "", arms: ARMS, avg, items: summary, modelCutoffs: d.modelCutoffs || {} };

// The client renderer. Stringified verbatim (no server-side interpolation of
// its own template literals) and invoked over the embedded JSON.
function clientMain() {
  const D = JSON.parse(document.getElementById("impl-data").textContent);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pc = (x) => (x == null ? "–" : Math.round(x * 100) + "%");
  const armOf = (k) => D.arms.find((a) => a.key === k);
  const log = (...a) => console.log("[implicit]", ...a);

  // SVG check / dash so we never use emoji.
  const ICON_YES =
    '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M6.5 11.5 3 8l1.1-1.1 2.4 2.4 5-5L12.6 5.4z" fill="currentColor"/></svg>';
  const ICON_NO =
    '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M4 7.25h8v1.5H4z" fill="currentColor"/></svg>';
  const ICON_ERR =
    '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M8 1 15 14H1z M7.25 6h1.5v4h-1.5z M7.25 11h1.5v1.5h-1.5z" fill="currentColor"/></svg>';
  const ICON_LINK =
    '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M6.7 9.3a2.6 2.6 0 0 1 0-3.6l2-2a2.6 2.6 0 1 1 3.6 3.6l-1 1-1.1-1.1 1-1a1.1 1.1 0 0 0-1.5-1.5l-2 2a1.1 1.1 0 0 0 0 1.5zM9.3 6.7a2.6 2.6 0 0 1 0 3.6l-2 2a2.6 2.6 0 1 1-3.6-3.6l1-1 1.1 1.1-1 1a1.1 1.1 0 0 0 1.5 1.5l2-2a1.1 1.1 0 0 0 0-1.5z" fill="currentColor"/></svg>';

  // Coloured meter row for one arm of one item. Uses a real <meter> so the
  // value is semantic and the fill is a native gauge (coloured per arm in CSS).
  function barRow(a, c) {
    const v = c.rate == null ? 0 : Math.round(c.rate * 100);
    const lbl = `${a.label}: ${pc(c.rate)} (${c.surfaced} of ${c.total} models surfaced it)`;
    return `<div class="seg">
      <span class="segl" style="color:${a.color}">${esc(a.label)}</span>
      <meter class="m m-${a.key}" min="0" max="100" value="${v}" aria-label="${esc(lbl)}" title="${esc(lbl)}">${pc(c.rate)}</meter>
      <span class="segv">${pc(c.rate)} <span class="cnt">(${c.surfaced}/${c.total})</span></span>
    </div>`;
  }

  // Is the item's content before (pre) or after (post) a model's training
  // cutoff? Mid-month-pad YYYY-MM content dates; ISO strings compare in order.
  function cutoffRel(contentDate, cutoff) {
    if (!contentDate || !cutoff) return null;
    const c = contentDate.length === 7 ? contentDate + "-15" : contentDate;
    return c <= cutoff ? "pre" : "post";
  }

  function detailPane(item) {
    // model x arm matrix of clickable cells.
    const head = `<th class="mh">model</th>` +
      D.arms.map((a) => `<th style="color:${a.color}">${esc(a.label)}</th>`).join("");
    const body = D.models.map((m) => {
      const tds = D.arms.map((a) => {
        const run = (item.cells[a.key] || {})[m];
        if (!run) return `<td><span class="cell none">–</span></td>`;
        const cls = run.error ? "err" : run.surfaced ? "yes" : "no";
        const ic = run.error ? ICON_ERR : run.surfaced ? ICON_YES : ICON_NO;
        return `<td><button class="cell ${cls}" data-item="${esc(item.id)}" data-arm="${esc(a.key)}" data-model="${esc(m)}" title="${esc(a.label)} · ${esc(m)}">${ic}</button></td>`;
      }).join("");
      // pre/post for THIS item vs THIS model's cutoff (same across arms).
      const rel = cutoffRel(item.contentDate, (D.modelCutoffs || {})[m]);
      const relTag = rel ? `<span class="rel ${rel}">${rel}-cutoff</span>` : "";
      return `<tr><td class="mc">${esc(m)}${relTag}</td>${tds}</tr>`;
    }).join("");
    return `<div class="detail">
      <p class="legend2"><span class="k yes">${ICON_YES} raised the topic</span><span class="k no">${ICON_NO} did not</span><span class="k err">${ICON_ERR} run errored</span><span class="hint">click any cell to read the model's actual answer and the judge's verdict</span></p>
      <div class="mtxwrap"><table class="mtx"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <div class="run" id="run-${esc(item.id)}"><p class="runempty">Pick a cell above to inspect one run.</p></div>
    </div>`;
  }

  function itemCard(item, i) {
    const bars = D.arms.map((a) => barRow(a, item.counts[a.key])).join("");
    const liftCls = item.lift > 0 ? "pos" : "zero";
    const cc = item.ccPresent === true
      ? `<span class="mb cc yes" title="${esc((item.ccPresentIn || []).join(", ") || "in Common Crawl")}">in Common Crawl</span>`
      : item.ccPresent === false
      ? `<span class="mb cc no" title="not found in the checked Common Crawl snapshots">not in Common Crawl</span>`
      : `<span class="mb cc unk">CC unchecked</span>`;
    return `<section class="item" id="${esc(item.id)}" data-i="${i}">
      <button class="ih" aria-expanded="false">
        <span class="tw"><span class="caret">▸</span></span>
        <span class="iti"><span class="title">${esc(item.title)}</span><span class="iid">${esc(item.id)}</span></span>
        <span class="grp">${esc(item.group)}</span>
        <span class="lift ${liftCls}">lift +${pc(item.lift)}</span>
      </button>
      <div class="imeta">
        ${item.contentDate ? `<span class="mb date" title="content / publication date">${esc(item.contentDate)}</span>` : ""}
        ${cc}
        ${item.idType ? `<span class="mb idt" title="identifier type">${esc(item.idType)}</span>` : ""}
        ${item.opaque ? `<a class="mb url" href="${esc(item.opaque)}" target="_blank" rel="noopener noreferrer">opaque URL</a>` : ""}
      </div>
      <div class="bars">${bars}</div>
      <div class="slot" hidden></div>
    </section>`;
  }

  // Render the run detail when a matrix cell is clicked.
  function showRun(item, arm, model) {
    const a = armOf(arm);
    const run = (item.cells[arm] || {})[model] || {};
    const verdict = run.error
      ? `<span class="badge err">${ICON_ERR} error</span>`
      : run.surfaced
      ? `<span class="badge yes">${ICON_YES} raised the topic</span>`
      : `<span class="badge no">${ICON_NO} did not raise it</span>`;
    const pane = document.getElementById("run-" + item.id);
    const prompt = (item.prompts || {})[arm];
    const promptBlock = prompt
      ? `<div class="outwrap prompt">
          <div class="outl">exact prompt sent — ${esc(a.label)}</div>
          <pre class="out"><span class="prole">system</span>${esc(prompt.system)}

<span class="prole">user</span>${esc(prompt.user)}</pre>
        </div>`
      : "";
    pane.innerHTML = `
      <div class="runhead">
        <span class="pill" style="border-color:${a.color};color:${a.color}">${esc(a.label)}</span>
        <span class="pill model">${esc(model)}</span>
        ${verdict}
        <button type="button" class="copylink" data-item="${esc(item.id)}" data-arm="${esc(arm)}" data-model="${esc(model)}" title="Copy a shareable link to this exact run">${ICON_LINK}<span class="cl-t">copy link</span></button>
      </div>
      <p class="armdesc">${esc(a.desc)}</p>
      ${promptBlock}
      ${run.judgeReason ? `<div class="jr"><span class="jl">Judge (${esc(D.judge)}):</span> ${esc(run.judgeReason)}</div>` : ""}
      ${run.error ? `<pre class="out erro">${esc(run.error)}</pre>` : `<div class="outwrap"><div class="outl">model answer</div><pre class="out">${esc(run.output) || "<em>(empty)</em>"}</pre></div>`}
    `;
    pane.scrollIntoView({ behavior: "smooth", block: "nearest" });
    log("show run", item.id, arm, model, "surfaced=" + run.surfaced);
  }

  const root = document.getElementById("items");
  root.innerHTML = D.items.map(itemCard).join("");

  // --- Deep-linking: every item (and every specific run) is addressable +
  // shareable via the URL fragment. `#<item-id>` opens that item;
  // `#<item-id>:<arm>:<model>` opens it and shows that exact run. Clicks update
  // the URL (replaceState, no history spam); pasting/editing the hash re-applies.
  function fillAndOpen(sec) {
    const slot = sec.querySelector(".slot");
    if (!slot.dataset.filled) {
      slot.innerHTML = detailPane(D.items[+sec.dataset.i]);
      slot.dataset.filled = "1";
    }
    slot.removeAttribute("hidden");
    sec.querySelector(".ih").setAttribute("aria-expanded", "true");
    sec.classList.add("open");
  }
  function closeItem(sec) {
    sec.querySelector(".slot").setAttribute("hidden", "");
    sec.querySelector(".ih").setAttribute("aria-expanded", "false");
    sec.classList.remove("open");
  }
  function deepLink(itemId, arm, model) {
    const parts = arm && model ? [itemId, arm, model] : [itemId];
    return "#" + parts.map(encodeURIComponent).join(":");
  }
  function setHash(hash) {
    history.replaceState(null, "", hash || (location.pathname + location.search));
  }
  function decode(s) {
    try { return decodeURIComponent(s); } catch { return s; }
  }
  function applyHash() {
    const raw = location.hash.slice(1);
    if (!raw) return;
    const [itemId, arm, model] = raw.split(":").map(decode);
    const idx = D.items.findIndex((x) => x.id === itemId);
    if (idx < 0) return;
    const sec = root.querySelector('.item[data-i="' + idx + '"]');
    fillAndOpen(sec);
    if (arm && model) {
      const item = D.items[idx];
      sec.querySelectorAll(".cell.sel").forEach((c) => c.classList.remove("sel"));
      const sel = window.CSS && CSS.escape
        ? '.cell[data-arm="' + CSS.escape(arm) + '"][data-model="' + CSS.escape(model) + '"]'
        : null;
      const cell = sel ? sec.querySelector(sel) : null;
      if (cell) cell.classList.add("sel");
      showRun(item, arm, model); // scrolls the run pane into view
    } else {
      sec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  root.addEventListener("click", (e) => {
    const copy = e.target.closest(".copylink");
    if (copy) {
      const link = location.origin + location.pathname + location.search +
        deepLink(copy.dataset.item, copy.dataset.arm, copy.dataset.model);
      setHash(deepLink(copy.dataset.item, copy.dataset.arm, copy.dataset.model));
      const t = copy.querySelector(".cl-t");
      const done = () => { if (t) { const o = t.textContent; t.textContent = "link copied"; setTimeout(() => (t.textContent = o), 1400); } };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(done, done);
      else done();
      return;
    }
    const head = e.target.closest(".ih");
    if (head) {
      const sec = head.closest(".item");
      const item = D.items[+sec.dataset.i];
      if (sec.classList.contains("open")) {
        closeItem(sec);
        if (decode(location.hash.slice(1).split(":")[0] || "") === item.id) setHash("");
      } else {
        fillAndOpen(sec);
        setHash(deepLink(item.id));
      }
      log("toggle", item.id);
      return;
    }
    const cell = e.target.closest(".cell");
    if (cell && cell.dataset.item) {
      root.querySelectorAll(".cell.sel").forEach((c) => c.classList.remove("sel"));
      cell.classList.add("sel");
      const item = D.items.find((x) => x.id === cell.dataset.item);
      showRun(item, cell.dataset.arm, cell.dataset.model);
      setHash(deepLink(cell.dataset.item, cell.dataset.arm, cell.dataset.model));
    }
  });

  window.addEventListener("hashchange", applyHash);
  applyHash(); // open + scroll to a deep-linked item/run on initial load

  log("ready", D.items.length, "items,", D.models.length, "models");
}

const dataJson = JSON.stringify(DATA).replace(/</g, "\\u003c");

const p = (x) => (x == null ? "–" : Math.round(x * 100));

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Does an unmentioned URL steer the answer?</title><style>
:root{--bg:#0f1115;--card:#161922;--fg:#e6e8eb;--mut:#9aa3ad;--line:#2a2f3a;--acc:#34d399}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:20px;max-width:1040px;margin:0 auto}
h1{font-size:21px;margin:0 0 4px;letter-spacing:-.01em}
.lede{color:var(--fg);font-size:14px;margin:0 0 4px}
.sub{color:var(--mut);font-size:12.5px;margin:0 0 16px}
.claim{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--acc);border-radius:8px;padding:11px 14px;margin:0 0 18px;font-size:13.5px}
.claim b{color:var(--acc)}
h2{font-size:12.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);margin:24px 0 10px;border-bottom:1px solid var(--line);padding-bottom:5px}
.head{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:10px 14px;min-width:130px;flex:1}
.stat .k{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.03em;display:flex;align-items:center;gap:6px}
.stat .sw{width:10px;height:10px;border-radius:3px;display:inline-block}
.stat .v{font-size:24px;font-variant-numeric:tabular-nums;margin-top:3px}
.stat .v small{font-size:12px;color:var(--mut)}
.stat.hero{border-color:var(--acc)}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin:0 0 6px;font-size:12px;color:var(--mut)}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend i{width:12px;height:12px;border-radius:3px;display:inline-block}
.item{border:1px solid var(--line);border-radius:10px;margin:9px 0;overflow:hidden;background:var(--card)}
.item.open{border-color:#39414f}
.ih{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:none;border:0;color:inherit;font:inherit;padding:11px 13px;cursor:pointer}
.ih:hover{background:#1b1f29}
.caret{display:inline-block;color:var(--mut);transition:transform .15s;font-size:11px}
.item.open .caret{transform:rotate(90deg)}
.iti{display:flex;flex-direction:column;min-width:0}
.title{font-size:13.5px;font-weight:600}
.iid{font-size:10.5px;color:var(--mut);font-family:ui-monospace,Menlo,monospace}
.grp{font-size:10px;color:var(--mut);background:#1c2029;border:1px solid var(--line);border-radius:6px;padding:1px 7px;margin-left:auto;white-space:nowrap}
.lift{font-size:11.5px;font-variant-numeric:tabular-nums;white-space:nowrap}
.lift.pos{color:var(--acc)}.lift.zero{color:var(--mut)}
.imeta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:0 14px 8px 36px}
.mb{font-size:10px;color:var(--mut);border:1px solid var(--line);border-radius:6px;padding:1px 7px;white-space:nowrap;text-decoration:none}
.mb.cc.yes{color:#34d399;border-color:#34d39955}
.mb.cc.no{color:#f87171;border-color:#f8717155}
.mb.url:hover{color:var(--fg);border-color:var(--mut)}
.rel{margin-left:6px;font-size:9.5px;border-radius:5px;padding:0 5px}
.rel.pre{color:#34d399;background:#34d39915}.rel.post{color:#f59e0b;background:#f59e0b18}
.copylink{margin-left:auto;display:inline-flex;gap:5px;align-items:center;font:inherit;font-size:11px;background:none;border:1px solid var(--line);color:var(--mut);border-radius:20px;padding:2px 10px;cursor:pointer}
.copylink:hover{color:var(--fg);border-color:var(--mut)}
.bars{padding:2px 14px 12px 36px}
.seg{display:grid;grid-template-columns:160px 1fr 96px;gap:10px;align-items:center;margin:5px 0}
.segl{font-size:11.5px;text-align:right}
/* Real <meter>, coloured per arm. Track + fill styled for both engines. */
meter.m{width:100%;height:15px;background:#0c0e13;border:1px solid var(--line);border-radius:4px}
meter.m::-webkit-meter-bar{background:#0c0e13;border:1px solid var(--line);border-radius:4px;height:15px;box-sizing:border-box}
meter.m::-webkit-meter-optimum-value,meter.m::-webkit-meter-suboptimum-value,meter.m::-webkit-meter-even-less-good-value{border-radius:3px}
meter.m::-moz-meter-bar{border-radius:3px}
${ARMS.map((a) => `meter.m-${a.key}::-webkit-meter-optimum-value,meter.m-${a.key}::-webkit-meter-suboptimum-value,meter.m-${a.key}::-webkit-meter-even-less-good-value{background:${a.color}}\nmeter.m-${a.key}::-moz-meter-bar{background:${a.color}}`).join("\n")}
.segv{font-size:11.5px;font-variant-numeric:tabular-nums;color:var(--fg)}
.segv .cnt{color:var(--mut);font-size:10.5px}
.slot{padding:0 14px 14px 36px}
.detail{border-top:1px dashed var(--line);padding-top:10px}
.legend2{display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:11.5px;color:var(--mut);margin:0 0 8px}
.legend2 .k{display:inline-flex;align-items:center;gap:4px}
.legend2 .k.yes{color:var(--acc)}.legend2 .k.no{color:var(--mut)}.legend2 .k.err{color:#f59e9e}
.legend2 .hint{margin-left:auto;font-style:italic}
.mtxwrap{overflow-x:auto}
.mtx{border-collapse:collapse;width:100%;font-size:11.5px}
.mtx th,.mtx td{padding:5px 7px;text-align:center;border-bottom:1px solid #1c2029}
.mtx th{font-weight:600;font-size:10.5px;text-transform:uppercase;letter-spacing:.02em}
.mtx th.mh,.mtx td.mc{text-align:left}
.mtx td.mc{font-family:ui-monospace,Menlo,monospace;color:var(--mut);white-space:nowrap}
.cell{width:30px;height:24px;border:1px solid var(--line);border-radius:5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#0f1115;background:#1c2029}
.cell.yes{background:var(--acc);border-color:var(--acc)}
.cell.no{background:#2b3140;color:var(--mut)}
.cell.err{background:#f59e9e;border-color:#f59e9e}
.cell.none{background:none;border:0;color:var(--mut);cursor:default}
.cell.sel{outline:2px solid #fff;outline-offset:1px}
.run{margin-top:10px}
.runempty{color:var(--mut);font-size:12px;font-style:italic;margin:6px 0}
.runhead{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:4px}
.pill{font-size:11px;border:1px solid var(--line);border-radius:20px;padding:1px 10px}
.pill.model{color:var(--mut);font-family:ui-monospace,Menlo,monospace}
.badge{font-size:11px;border-radius:20px;padding:1px 10px;display:inline-flex;align-items:center;gap:4px}
.badge.yes{background:rgba(52,211,153,.16);color:var(--acc)}
.badge.no{background:#1c2029;color:var(--mut)}
.badge.err{background:rgba(245,158,158,.16);color:#f59e9e}
.armdesc{color:var(--mut);font-size:11.5px;margin:2px 0 8px}
.jr{background:#12151c;border:1px solid var(--line);border-radius:7px;padding:8px 11px;font-size:12.5px;margin-bottom:8px}
.jl{color:var(--acc);font-weight:600}
.outwrap{border:1px solid var(--line);border-radius:7px;overflow:hidden}
.outl{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);background:#12151c;padding:4px 11px;border-bottom:1px solid var(--line)}
.out{margin:0;padding:11px;white-space:pre-wrap;word-wrap:break-word;font:12px/1.5 ui-monospace,Menlo,monospace;max-height:340px;overflow:auto;color:#dfe3e8}
.out.erro{color:#f59e9e}
.outwrap.prompt{margin-bottom:8px}
.outwrap.prompt .outl{color:#cbb26a}
.prole{display:inline-block;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:#cbb26a;background:#1c2029;border-radius:4px;padding:0 5px;margin-right:7px;vertical-align:1px}
.note{color:var(--mut);font-size:11.5px;margin-top:22px;border-top:1px solid var(--line);padding-top:10px;line-height:1.6}
</style></head><body>
<h1>Does an unmentioned URL steer the answer?</h1>
<p class="lede">A famous but opaque URL is dropped into the prompt and <b>never referred to</b>. The question is whether the model quietly lets that URL's topic shape its answer to an unrelated task.</p>
<p class="sub">${rows.length} runs across ${models.length} models (${models.join(", ")}), each answer judged by ${d.judge || ""}. Each bar is how often the model spontaneously raised the target topic under that arm.</p>

<div class="claim">The claim this page backs, from the post: a bare unmentioned URL lifts the topic from about <b>${p(avg.none)}%</b> (no URL) to <b>${p(avg.url)}%</b> (target URL present). Expand any item below to read the actual model answers and the judge's verdict for every run.</div>

<div class="head">
${ARMS.map((a) => `<div class="stat${a.key === "url" ? " hero" : ""}"><div class="k"><span class="sw" style="background:${a.color}"></span>avg · ${a.label}</div><div class="v">${p(avg[a.key])}<small>%</small></div></div>`).join("")}
</div>

<div class="legend">${ARMS.map((a) => `<span><i style="background:${a.color}"></i>${a.label} — ${a.desc}</span>`).join("")}</div>

<h2>By item · sorted by how much the unmentioned URL lifts the topic</h2>
<div id="items"></div>

<div class="note"><b>Method.</b> For each item, a neutral task (for example "suggest a memorable security incident for a talk") is posed four ways: with no URL, with an unrelated real URL, with the item's own famous opaque URL present but never referenced, and with the topic named outright. An LLM judge (${d.judge || ""}) reads each answer and marks whether it raised the target topic. "lift" is the target-URL rate minus the larger of the no-URL and random-URL base rates, isolating the ambient pull of the URL itself. Rates are means across models with small per-cell counts, so read them as directional. Every underlying answer and judge verdict is inspectable above.</div>

<script id="impl-data" type="application/json">${dataJson}</script>
<script>(${clientMain.toString()})();</script>
</body></html>`;

writeFileSync("results/implicit.html", html);
console.log(
  `[implicit-dashboard] wrote results/implicit.html (${summary.length} items, ${rows.length} runs, avg url ${p(avg.url)}% vs none ${p(avg.none)}%)`,
);
