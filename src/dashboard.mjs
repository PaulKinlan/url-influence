// Build a standalone interactive dashboard from results/transcript.jsonl.
//
// Emits two committed files:
//   results/dashboard-data.json.gz - gzipped JSON { meta, items, cells }. The
//     page fetches it and streams it through DecompressionStream on boot (~6-8x
//     smaller than raw JSON, well under GitHub's 50MB warning).
//   results/dashboard.html         - vanilla-JS UI (no deps, no build):
//     filter by model / condition / pre-vs-post cutoff / item-track / Common
//     Crawl / pass-fail, an interactive item x condition matrix per model, a live
//     per-condition mean + lift strip for the current filter, and click-through
//     to each cell's exact prompt, model output, and the judge's full verdict.
//
// Serve the results/ folder over http (e.g. `python3 -m http.server` in results/,
// or GitHub Pages) and open dashboard.html — fetch() of the .gz needs http(s),
// not file://.

import { readFile, writeFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import { existsSync } from "node:fs";
import { CORPUS } from "./corpus.mjs";
import { CONDITION_DEFS, CONDITIONS } from "./conditions.mjs";

const PASS_DEFAULT = 0.5;

async function main() {
  // Read the AUTHORITATIVE gzipped transcript (what transcript.mjs writes). The
  // plain .jsonl is gitignored and can lag, so prefer the .gz; fall back to plain
  // only if the .gz is absent.
  let raw;
  if (existsSync("results/transcript.jsonl.gz")) {
    raw = gunzipSync(await readFile("results/transcript.jsonl.gz")).toString("utf8");
  } else {
    raw = await readFile("results/transcript.jsonl", "utf8");
  }
  const cells = raw
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  // Classify an item's opaque-id SOURCE/scheme (for the source filter).
  const sourceOf = (it) => {
    if (it.validation?.opaqueRole === "structural-control") return "control";
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
  };

  // Optional Common Crawl presence covariate (results/common-crawl.json).
  let ccById = {};
  try {
    const cc = JSON.parse(await readFile("results/common-crawl.json", "utf8"));
    for (const x of cc.items || []) {
      ccById[x.itemId] = {
        present: x.anyPresent,
        n: x.presentIn.length,
        firstSeen: x.firstSeen,
      };
    }
  } catch {
    // CC data optional.
  }

  // Item metadata (track, source scheme, popularity, CC presence, human task).
  const items = {};
  for (const it of CORPUS) {
    const ccE = ccById[it.id];
    items[it.id] = {
      id: it.id,
      kind: it.kind,
      target: it.target,
      contentDate: it.contentDate,
      track: it.groundTruth.expectUnknown ? "calibration" : "api-usage",
      opaqueRole: it.validation?.opaqueRole || "real",
      source: sourceOf(it),
      popularity: it.popularity || null,
      // cc: "present" | "absent" (in Common Crawl) | null (no opaque URL / no data)
      cc: it.urls?.opaque && ccE ? (ccE.present ? "present" : "absent") : null,
      ccN: ccE ? ccE.n : null,
      ccFirstSeen: ccE ? ccE.firstSeen : null,
    };
  }

  // Clip long text so dashboard-data.js (served to the browser, and committed)
  // stays well under GitHub's 100MB file limit as the matrix grows. The FULL,
  // untruncated prompt/output/judge for every cell remains in transcript.jsonl.
  const CLIP = 2500;
  const clip = (s) =>
    typeof s === "string" && s.length > CLIP
      ? s.slice(0, CLIP) +
        `\n…[clipped ${s.length - CLIP} chars — full record in transcript.jsonl]`
      : s;
  const clipPrompt = (p) =>
    p && typeof p === "object"
      ? { system: p.system, user: clip(p.user) }
      : clip(p);

  // Trim each cell to the fields the UI needs (keeps everything that lets a
  // human validate a verdict; clips only very long bodies).
  const slim = cells.map((c) => ({
    model: c.model,
    label: c.label,
    cutoff: c.cutoff,
    itemId: c.itemId,
    contentDate: c.contentDate,
    preCutoff: c.preCutoff,
    condition: c.condition,
    urlUsed: c.urlUsed,
    correctness: c.finalCorrectness,
    structural: c.structural,
    runError: c.runError,
    skipped: c.skipped ?? false,
    skipReason: c.skipReason ?? null,
    prompt: clipPrompt(c.prompt),
    output: clip(c.output),
    judge: c.judge
      ? {
          correctness: c.judge.correctness,
          usedRealSurface: c.judge.usedRealSurface,
          hallucinated: c.judge.hallucinated,
          reason: c.judge.reason,
          judgeError: c.judge.judgeError,
          judgePrompt: clipPrompt(c.judge.judgePrompt),
          judgeRaw: clip(c.judge.judgeRaw),
        }
      : null,
  }));

  const models = [];
  const seen = new Set();
  for (const c of cells) {
    if (!seen.has(c.model)) {
      seen.add(c.model);
      models.push({ key: c.model, label: c.label, cutoff: c.cutoff });
    }
  }
  const data = {
    meta: {
      generatedAt: cells[0]?.timestamp || null,
      passDefault: PASS_DEFAULT,
      conditionNotes: Object.fromEntries(
        CONDITION_DEFS.map((c) => [c.key, c.description]),
      ),
      conditionDefs: CONDITION_DEFS,
    },
    models,
    conditions: CONDITIONS,
    items,
    cells: slim,
  };

  // Write the payload as a real gzip file the page fetches and streams through
  // DecompressionStream. No base64 inlining (that bloats the page 33%). The
  // committed binary is ~6-8x smaller than raw JSON.
  const json = JSON.stringify(data);
  const gz = gzipSync(json, { level: 9 }); // accepts a utf8 string directly
  await writeFile("results/dashboard-data.json.gz", gz);
  await writeFile("results/dashboard.html", HTML);
  console.log(
    `[dashboard] wrote results/dashboard.html + results/dashboard-data.json.gz ` +
      `(${slim.length} cells; json ${(json.length / 1e6).toFixed(1)}MB ` +
      `-> gz ${(gz.length / 1e6).toFixed(1)}MB)`,
  );
}

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>URL Influence — interactive results</title>
<style>
  :root { --bg:#0f1115; --panel:#171a21; --line:#272b34; --fg:#e6e8ec; --mut:#9aa3b2; --acc:#6ea8fe; }
  * { box-sizing: border-box; }
  body { margin:0; font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--fg); }
  header { padding:14px 18px; border-bottom:1px solid var(--line); position:relative; }
  header h1 { font-size:16px; margin:0 0 2px; }
  header .sub { color:var(--mut); font-size:12px; }
  #copylink { position:absolute; top:14px; right:18px; background:none; border:1px solid var(--line); color:var(--fg); border-radius:6px; cursor:pointer; padding:5px 11px; font-size:12px; }
  #copylink:hover { border-color:var(--fg); }
  .wrap { display:flex; gap:0; height:calc(100vh - 58px); }
  .controls { width:250px; min-width:250px; border-right:1px solid var(--line); padding:14px; overflow:auto; }
  .main { flex:1; overflow:auto; padding:16px; }
  .detail { width:0; transition:width .12s; border-left:1px solid var(--line); overflow:auto; }
  .detail.open { width:46%; min-width:380px; padding:16px; }
  fieldset { border:1px solid var(--line); border-radius:8px; margin:0 0 14px; padding:10px 12px; }
  legend { color:var(--mut); font-size:11px; text-transform:uppercase; letter-spacing:.05em; padding:0 4px; }
  label.row { display:flex; align-items:center; gap:8px; padding:3px 0; cursor:pointer; }
  label.row input { accent-color:var(--acc); }
  select, input[type=number] { background:var(--panel); color:var(--fg); border:1px solid var(--line); border-radius:6px; padding:5px 7px; width:100%; }
  .stats { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
  .stat { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:8px 12px; min-width:110px; }
  .stat .k { color:var(--mut); font-size:11px; }
  .stat .v { font-size:18px; font-variant-numeric:tabular-nums; }
  table { border-collapse:collapse; width:100%; }
  th, td { border:1px solid var(--line); padding:6px 8px; text-align:center; font-variant-numeric:tabular-nums; }
  th { background:var(--panel); position:sticky; top:0; z-index:1; font-weight:600; }
  td.item { text-align:left; white-space:nowrap; }
  td.item .tk { color:var(--mut); font-size:11px; }
  .cellbtn { cursor:pointer; display:block; width:100%; height:100%; border:0; border-radius:4px; padding:6px 4px; font:inherit; color:#0b0d10; font-variant-numeric:tabular-nums; }
  .cellbtn.null { background:#3a3f4b; color:var(--mut); cursor:default; }
  .badge { display:inline-block; font-size:10px; padding:1px 6px; border-radius:10px; border:1px solid var(--line); color:var(--mut); }
  .pill { font-size:11px; color:var(--mut); }
  .refusal { display:inline-block; font-size:10px; padding:1px 6px; border-radius:10px; background:#3a2a12; color:#f2b24b; border:1px solid #6b4a18; margin-right:6px; vertical-align:middle; white-space:nowrap; cursor:help; }
  .banner { background:#3a2a12; color:#f2d39b; border:1px solid #6b4a18; border-radius:6px; padding:8px 10px; margin:8px 0; font-size:12px; line-height:1.45; }
  pre { background:#0b0d10; border:1px solid var(--line); border-radius:6px; padding:10px; white-space:pre-wrap; word-break:break-word; max-height:280px; overflow:auto; font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; }
  .kv { display:grid; grid-template-columns:130px 1fr; gap:4px 10px; margin:8px 0; }
  .kv .k { color:var(--mut); }
  a { color:var(--acc); word-break:break-all; }
  h3 { margin:16px 0 6px; font-size:13px; text-transform:uppercase; letter-spacing:.04em; color:var(--mut); }
  .close { float:right; background:none; border:1px solid var(--line); color:var(--fg); border-radius:6px; cursor:pointer; padding:3px 9px; }
  .legend { font-size:11px; color:var(--mut); margin-top:6px; }
  .swatch { display:inline-block; width:11px; height:11px; border-radius:3px; vertical-align:-1px; margin:0 3px 0 8px; }
  .drillhead { margin:2px 0 8px; font-size:13px; }
  .drillhead .tk { color:var(--mut); font-size:11px; }
</style>
</head>
<body>
<header>
  <h1>URL Influence — interactive results</h1>
  <div class="sub" id="sub"></div>
  <button id="copylink" type="button" title="Copy a shareable link that reopens this exact view (filters + open cell)">copy link</button>
</header>
<div class="wrap">
  <div class="controls">
    <fieldset>
      <legend>Per-test drill-down</legend>
      <select id="drilltest"><option value="">— per-model matrix —</option></select>
    </fieldset>
    <fieldset>
      <legend>Model (matrix)</legend>
      <select id="model"></select>
    </fieldset>
    <fieldset>
      <legend>Source / id scheme</legend>
      <select id="source"><option value="all">All sources</option></select>
    </fieldset>
    <fieldset>
      <legend>Popularity</legend>
      <select id="popularity">
        <option value="all">All</option>
        <option value="famous">famous</option>
        <option value="moderate">moderate</option>
        <option value="obscure">obscure</option>
      </select>
    </fieldset>
    <fieldset>
      <legend>Common Crawl</legend>
      <label class="row"><input type="radio" name="cc" value="all" checked> All</label>
      <label class="row"><input type="radio" name="cc" value="present"> In Common Crawl</label>
      <label class="row"><input type="radio" name="cc" value="absent"> Not in Common Crawl</label>
    </fieldset>
    <fieldset>
      <legend>Item track</legend>
      <label class="row"><input type="radio" name="track" value="all"> All</label>
      <label class="row"><input type="radio" name="track" value="api-usage" checked> API-usage only</label>
      <label class="row"><input type="radio" name="track" value="calibration"> Knowledge-calibration only</label>
    </fieldset>
    <fieldset>
      <legend>Opaque role</legend>
      <label class="row"><input type="radio" name="opaque" value="real" checked> Real opaque pointers</label>
      <label class="row"><input type="radio" name="opaque" value="structural-control"> Structural controls</label>
      <label class="row"><input type="radio" name="opaque" value="all"> All</label>
    </fieldset>
    <fieldset>
      <legend>Cutoff bucket</legend>
      <label class="row"><input type="radio" name="bucket" value="all" checked> All</label>
      <label class="row"><input type="radio" name="bucket" value="pre"> Pre-cutoff (in training)</label>
      <label class="row"><input type="radio" name="bucket" value="post"> Post-cutoff</label>
    </fieldset>
    <fieldset>
      <legend>Conditions</legend>
      <div id="conds"></div>
    </fieldset>
    <fieldset>
      <legend>Pass threshold</legend>
      <label class="row">correctness &ge; <input type="number" id="pass" min="0" max="1" step="0.05" style="width:70px"></label>
      <label class="row"><input type="checkbox" id="failonly"> show failing cells only</label>
    </fieldset>
  </div>
  <div class="main" id="main"></div>
  <div class="detail" id="detail"></div>
</div>
<script>
// Data is shipped as dashboard-data.json.gz (a real gzip file). Fetch it and
// stream it straight through DecompressionStream — no base64, no giant inline
// string. NB fetch() needs http(s): serve the folder (e.g. \`python3 -m
// http.server\` or GitHub Pages), not file://.
let D, modelSel;
const $ = (s)=>document.querySelector(s);

async function boot(){
  document.getElementById("sub").textContent = "loading results\\u2026";
  const res = await fetch("dashboard-data.json.gz");
  if(!res.ok) throw new Error("fetch dashboard-data.json.gz: "+res.status);
  const stream = res.body.pipeThrough(new DecompressionStream("gzip"));
  D = await new Response(stream).json();
  init();
}

function init(){
  document.getElementById("sub").textContent =
    D.cells.length + " cells \\u00b7 " + D.models.length + " models \\u00b7 generated " + (D.meta.generatedAt||"");

  modelSel = $("#model");
  D.models.forEach(m=>{ const o=document.createElement("option"); o.value=m.key; o.textContent=m.label+" (cut "+m.cutoff+")"; modelSel.appendChild(o); });

  const condsBox = $("#conds");
  D.conditions.forEach(c=>{
    const l=document.createElement("label"); l.className="row";
    l.innerHTML='<input type="checkbox" class="cond" value="'+c+'" checked> '+c;
    l.title=D.meta.conditionNotes[c]||"";
    condsBox.appendChild(l);
  });
  $("#pass").value = D.meta.passDefault;

  // Populate the per-test drill-down selector (all items, date-sorted).
  const drillSel = $("#drilltest");
  Object.values(D.items)
    .sort((a,b)=> a.contentDate<b.contentDate?-1:a.contentDate>b.contentDate?1:0)
    .forEach(it=>{ const o=document.createElement("option"); o.value=it.id; o.textContent=it.id+" ("+it.contentDate+")"; drillSel.appendChild(o); });

  // Populate the Source dropdown from the items' schemes (sorted, with counts).
  const srcSel = $("#source");
  const srcCounts = {};
  for(const id in D.items){ const s=D.items[id].source||"other"; srcCounts[s]=(srcCounts[s]||0)+1; }
  Object.keys(srcCounts).sort().forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s+" ("+srcCounts[s]+")"; srcSel.appendChild(o); });

  // Any control change re-renders AND rewrites the URL hash, so the address bar
  // is always a shareable snapshot of the current view.
  document.querySelectorAll("input,select").forEach(el=> el.addEventListener("change", onChange));
  $("#copylink").addEventListener("click", copyLink);
  // Restore state from a shared link (if any), else render the default view.
  applyState();
  // React to links pasted/edited while the page is open (back/forward too).
  window.addEventListener("hashchange", applyState);
}

// ---- Shareable deep links -------------------------------------------------
// The full view (every filter + the open cell) round-trips through the URL hash
// so a link reopens the exact same configuration.
let openCellKey = null;
const cellKeyOf = (c)=> c.model+"|"+c.itemId+"|"+c.condition;

function serializeState(){
  const p = new URLSearchParams();
  p.set("model", modelSel.value);
  p.set("test", $("#drilltest").value);
  p.set("source", $("#source").value);
  p.set("pop", $("#popularity").value);
  p.set("cc", getRadio("cc"));
  p.set("track", getRadio("track"));
  p.set("opaque", getRadio("opaque"));
  p.set("bucket", getRadio("bucket"));
  p.set("conds", activeConds().join(","));
  p.set("pass", $("#pass").value);
  p.set("fail", $("#failonly").checked ? "1" : "0");
  if(openCellKey) p.set("cell", openCellKey);
  return p.toString();
}

// Rewrite the hash without adding history entries (replaceState doesn't fire
// hashchange, so this won't loop with the hashchange listener).
function updateHash(){ history.replaceState(null, "", "#"+serializeState()); }

function onChange(){ render(); updateHash(); }

function applyState(){
  const p = new URLSearchParams(location.hash.replace(/^#/,""));
  const setVal=(sel,key)=>{ if(p.has(key)) $(sel).value=p.get(key); };
  const setRadio=(name,key)=>{ if(p.has(key)){ const el=document.querySelector('input[name="'+name+'"][value="'+CSS.escape(p.get(key))+'"]'); if(el) el.checked=true; } };
  setVal("#model","model"); setVal("#drilltest","test"); setVal("#source","source"); setVal("#popularity","pop"); setVal("#pass","pass");
  setRadio("track","track"); setRadio("opaque","opaque"); setRadio("bucket","bucket"); setRadio("cc","cc");
  if(p.has("fail")) $("#failonly").checked = p.get("fail")==="1";
  if(p.has("conds")){
    const set=new Set(p.get("conds").split(",").filter(Boolean));
    document.querySelectorAll(".cond").forEach(c=> c.checked=set.has(c.value));
  }
  openCellKey = p.get("cell") || null;
  render();
  if(openCellKey){
    const [m,it,cond]=openCellKey.split("|");
    const c=D.cells.find(x=> x.model===m && x.itemId===it && x.condition===cond);
    if(c) showDetail(c); else openCellKey=null;
  }
  updateHash();
}

function copyLink(){
  const url = location.href;
  const done=()=>{ const b=$("#copylink"); const t=b.textContent; b.textContent="copied!"; setTimeout(()=>b.textContent=t,1200); };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(done, ()=>prompt("Copy this link:", url));
  } else { prompt("Copy this link:", url); }
}

function closeDetail(){
  document.getElementById("detail").classList.remove("open");
  openCellKey = null;
  updateHash();
}

function color(v){
  if(v==null) return null;
  // red(0) -> amber(.5) -> green(1)
  const h = 120*v; // 0=red,120=green
  return "hsl("+h+",70%,62%)";
}
function activeConds(){ return [...document.querySelectorAll(".cond:checked")].map(i=>i.value); }
function getRadio(n){ return document.querySelector('input[name="'+n+'"]:checked').value; }

function filtered(){
  const track=getRadio("track"), bucket=getRadio("bucket"), conds=new Set(activeConds());
  const opaque=getRadio("opaque"), cc=getRadio("cc");
  const source=$("#source").value, popularity=$("#popularity").value;
  const pass=parseFloat($("#pass").value), failonly=$("#failonly").checked;
  return D.cells.filter(c=>{
    if(!conds.has(c.condition)) return false;
    const it=D.items[c.itemId];
    if(source!=="all" && it.source!==source) return false;
    if(popularity!=="all" && it.popularity!==popularity) return false;
    if(cc!=="all" && it.cc!==cc) return false;
    if(track!=="all" && it.track!==track) return false;
    if(opaque==="real" && it.opaqueRole==="structural-control") return false;
    if(opaque==="structural-control" && it.opaqueRole!=="structural-control") return false;
    if(bucket==="pre" && !c.preCutoff) return false;
    if(bucket==="post" && c.preCutoff) return false;
    if(failonly){ if(c.correctness==null) return false; if(c.correctness>=pass) return false; }
    return true;
  });
}

function meanBy(cells, cond){
  const v=cells.filter(c=>c.condition===cond && typeof c.correctness==="number").map(c=>c.correctness);
  return v.length? v.reduce((a,b)=>a+b,0)/v.length : null;
}

// A single matrix cell -> <td>. Shared by the per-model and per-test views.
function cellTd(cell){
  if(!cell) return '<td><div class="cellbtn null">·</div></td>';
  const v=cell.correctness;
  if(v==null){
    const lbl=cell.skipped?"n/a":(cell.runError?"err":"—");
    const title=cell.skipReason||cell.runError||"no score";
    return '<td><div class="cellbtn null" title="'+esc(title)+'">'+lbl+'</div></td>';
  }
  const idx=D.cells.indexOf(cell);
  return '<td><button class="cellbtn" style="background:'+color(v)+'" data-i="'+idx+'">'+v.toFixed(2)+'</button></td>';
}

// Per-test drill-down: one item, ALL models side-by-side across conditions.
function renderDrill(itemId){
  const it=D.items[itemId];
  const conds=activeConds();
  const cellOf=(m,c)=>D.cells.find(x=>x.itemId===itemId&&x.model===m&&x.condition===c);
  const meanCond=(c)=>{ const v=D.models.map(m=>cellOf(m.key,c)).filter(x=>x&&typeof x.correctness==="number").map(x=>x.correctness); return v.length?v.reduce((a,b)=>a+b,0)/v.length:null; };
  const ccTag=it.cc==="present"?(" · CC "+it.ccN+(it.ccFirstSeen?"/"+it.ccFirstSeen:"")):(it.cc==="absent"?" · not in CC":"");
  const refusal=it.track==="calibration"?'<span class="refusal">refusal test</span> ':'';
  let head='<div class="drillhead">'+refusal+'<b>'+itemId+'</b> <span class="tk">'+it.source+(it.popularity?" · "+it.popularity:"")+ccTag+' · '+it.contentDate+' · '+it.track+'</span></div>';
  // per-condition mean ACROSS models for this test
  let stats='<div class="stats">';
  ["described","opaque-url","content-only","full-content"].filter(c=>conds.includes(c)).forEach(c=> stats+=stat(c+" (all models)", fmt(meanCond(c))));
  stats+='</div>';
  let t='<table><thead><tr><th class="item">model (cutoff)</th>';
  conds.forEach(c=> t+='<th title="'+(D.meta.conditionNotes[c]||"")+'">'+c+'</th>');
  t+='</tr></thead><tbody>';
  const models=[...D.models].sort((a,b)=> a.cutoff<b.cutoff?-1:a.cutoff>b.cutoff?1:0);
  models.forEach(m=>{
    const any=cellOf(m.key,conds[0]);
    const side=any&&any.preCutoff?"pre":"post";
    t+='<tr><td class="item">'+esc(m.label)+'<div class="tk">cut '+m.cutoff+' · '+side+'-cutoff</div></td>';
    conds.forEach(c=> t+=cellTd(cellOf(m.key,c)));
    t+='</tr>';
  });
  t+='</tbody></table>';
  t+='<div class="legend">per-test view: every model on <b>'+esc(itemId)+'</b> side-by-side · click a cell for its prompt, output and judge verdict</div>';
  $("#main").innerHTML=head+stats+t;
  document.querySelectorAll(".cellbtn[data-i]").forEach(b=> b.onclick=()=>showDetail(D.cells[+b.dataset.i]));
}

function render(){
  const drill=$("#drilltest")?$("#drilltest").value:"";
  if(drill){ renderDrill(drill); return; }
  const model=modelSel.value;
  const all=filtered();
  const mc=all.filter(c=>c.model===model);

  // Stats strip (current model + filter): per-condition mean + lift.
  const nameM=meanBy(mc,"described"), urlM=meanBy(mc,"opaque-url");
  const lift=(nameM!=null&&urlM!=null)? (urlM-nameM):null;
  const pass=parseFloat($("#pass").value);
  const passed=mc.filter(c=>typeof c.correctness==="number"&&c.correctness>=pass).length;
  const scored=mc.filter(c=>typeof c.correctness==="number").length;
  let stats='<div class="stats">';
  stats+=stat("cells (this model)", mc.length);
  stats+=stat("pass rate", scored? (Math.round(100*passed/scored)+"% ("+passed+"/"+scored+")"):"—");
  stats+=stat("described mean", fmt(nameM));
  stats+=stat("opaque-url mean", fmt(urlM));
  stats+=stat("lift (url−name)", lift==null?"—":(lift>=0?"+":"")+lift.toFixed(2));
  stats+='</div>';

  // Matrix: rows=items present in filter, cols=active conditions.
  const conds=activeConds();
  const itemIds=[...new Set(mc.map(c=>c.itemId))].sort((a,b)=>{
    const A=D.items[a], B=D.items[b];
    return (A.contentDate<B.contentDate?-1:A.contentDate>B.contentDate?1:0);
  });
  let t='<table><thead><tr><th class="item">item (date · track)</th>';
  conds.forEach(c=> t+='<th title="'+(D.meta.conditionNotes[c]||"")+'">'+c+'</th>');
  t+='</tr></thead><tbody>';
  itemIds.forEach(id=>{
    const it=D.items[id];
    const side = (mc.find(c=>c.itemId===id)||{}).preCutoff ? "pre":"post";
    const ccTag=it.cc==="present"?(" · CC "+it.ccN+(it.ccFirstSeen?"/"+it.ccFirstSeen:"")):(it.cc==="absent"?" · not in CC":"");
    const refusal=it.track==="calibration"?'<span class="refusal" title="Calibration item: the content post-dates every model, so the CORRECT behaviour is to admit it does not know. A green cell here means correctly REFUSED, not correctly produced.">refusal test</span> ':'';
    t+='<tr><td class="item">'+refusal+id+'<div class="tk">'+it.source+(it.popularity?" · "+it.popularity:"")+ccTag+' · '+it.contentDate+' · '+side+'-cutoff</div></td>';
    conds.forEach(c=> t+=cellTd(mc.find(x=>x.itemId===id&&x.condition===c)));
    t+='</tr>';
  });
  t+='</tbody></table>';
  t+='<div class="legend">cell = final correctness 0..1 <span class="swatch" style="background:'+color(0)+'"></span>0 <span class="swatch" style="background:'+color(0.5)+'"></span>.5 <span class="swatch" style="background:'+color(1)+'"></span>1 · "err" = model call failed · "n/a" = condition not applicable · rows tagged <span class="refusal">refusal test</span> are calibration items where a high score means correctly DECLINING (content post-dates the model), not producing the API · click a cell for the prompt, output and judge verdict</div>';

  $("#main").innerHTML=stats+t;
  document.querySelectorAll(".cellbtn[data-i]").forEach(b=> b.onclick=()=>showDetail(D.cells[+b.dataset.i]));
}

function stat(k,v){ return '<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>'; }
function fmt(x){ return x==null?"—":x.toFixed(2); }
function esc(s){ return (s==null?"":String(s)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function showDetail(c){
  const it=D.items[c.itemId];
  const j=c.judge||{};
  openCellKey = cellKeyOf(c);
  updateHash();
  let h='<button class="close" onclick="closeDetail()">close</button>';
  h+='<button class="close" style="right:64px" title="Copy a link that reopens this cell" onclick="copyLink()">copy link</button>';
  h+='<h3>'+c.itemId+' · '+c.condition+'</h3>';
  if(it.track==="calibration"){
    h+='<div class="banner">This is a <b>refusal / calibration item</b>. Its content post-dates every model, so the <b>correct behaviour is to admit it doesn\\'t know</b>. A high score here means the model correctly declined; a confident, specific answer is a hallucination and scores low. Do not read these cells as "produced the API".</div>';
  }
  h+='<div class="kv">';
  h+='<div class="k">model</div><div>'+esc(c.label)+' (cutoff '+c.cutoff+')</div>';
  h+='<div class="k">item track</div><div>'+it.track+' · '+it.kind+'</div>';
  h+='<div class="k">opaque role</div><div>'+esc(it.opaqueRole)+'</div>';
  h+='<div class="k">content date</div><div>'+c.contentDate+' · '+(c.preCutoff?"PRE-cutoff (could be in training)":"POST-cutoff")+'</div>';
  h+='<div class="k">URL used</div><div>'+(c.urlUsed?('<a href="'+esc(c.urlUsed)+'" target="_blank">'+esc(c.urlUsed)+'</a>'):'<span class="pill">none (this condition uses no URL)</span>')+'</div>';
  const structuralScore = c.structural && typeof c.structural.score==="number" ? c.structural.score : null;
  h+='<div class="k">final correctness</div><div>'+fmt(c.correctness)+(structuralScore!=null?' · structural '+structuralScore.toFixed(2):'')+'</div>';
  if(c.runError) h+='<div class="k">run error</div><div>'+esc(c.runError)+'</div>';
  if(c.skipped) h+='<div class="k">skipped</div><div>'+esc(c.skipReason||"not applicable")+'</div>';
  h+='</div>';
  if(j && (j.reason||j.correctness!=null)){
    h+='<div class="kv">';
    h+='<div class="k">judge correctness</div><div>'+fmt(j.correctness)+'</div>';
    h+='<div class="k">used real surface</div><div>'+(j.usedRealSurface===true?"yes":j.usedRealSurface===false?"no":"—")+'</div>';
    h+='<div class="k">hallucinated</div><div>'+(j.hallucinated===true?"yes":j.hallucinated===false?"no":"—")+'</div>';
    h+='<div class="k">judge reason</div><div>'+esc(j.reason)+'</div>';
    if(j.judgeError) h+='<div class="k">judge error</div><div>'+esc(j.judgeError)+'</div>';
    h+='</div>';
  }
  h+='<h3>Prompt sent to model</h3><pre>'+esc(typeof c.prompt==="object"?JSON.stringify(c.prompt,null,2):c.prompt)+'</pre>';
  h+='<h3>Model output</h3><pre>'+esc(c.output||"(empty / failed)")+'</pre>';
  if(j.judgePrompt){ h+='<h3>Judge prompt</h3><pre>'+esc(typeof j.judgePrompt==="object"?JSON.stringify(j.judgePrompt,null,2):j.judgePrompt)+'</pre>'; }
  if(j.judgeRaw){ h+='<h3>Judge raw verdict</h3><pre>'+esc(j.judgeRaw)+'</pre>'; }
  const d=$("#detail"); d.innerHTML=h; d.classList.add("open");
}

boot().catch(e=>{ document.getElementById("sub").textContent = "failed to load data: "+e; });
</script>
</body>
</html>
`;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
