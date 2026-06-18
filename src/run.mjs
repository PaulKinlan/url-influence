// Runner: for each (item x condition x model), build the prompt, call the
// model, and write the full output + metadata to results/raw/ (gitignored).
//
// Usage:
//   node src/run.mjs --pilot          # pilot items x conditions x pilot models
//   node src/run.mjs                  # full corpus x all models that have a key
//   node src/run.mjs --items=a,b,c    # explicit item ids
//   node src/run.mjs --models=k1,k2   # explicit model keys

import { MODELS, pilotModels, modelByKey } from "./models.mjs";
import { CORPUS, corpusFor, PILOT_ITEM_IDS } from "./corpus.mjs";
import { CONDITIONS, buildPrompt, urlForCondition } from "./conditions.mjs";
import { callModel, hasKeyFor, keyEnvFor } from "./providers.mjs";
import {
  fetchPageText,
  writeJson,
  readJson,
  nowIso,
  sleep,
  loadDotEnv,
} from "./util.mjs";
import { existsSync } from "node:fs";

// Load a local .env (gitignored) so keys can come from there if not already in
// the environment. Real env vars always win. Keys are never logged.
loadDotEnv();

const RAW_DIR = "results/raw";

function parseArgs(argv) {
  const out = { pilot: false, items: null, models: null };
  for (const a of argv.slice(2)) {
    if (a === "--pilot") out.pilot = true;
    else if (a.startsWith("--items=")) out.items = a.slice(8).split(",");
    else if (a.startsWith("--models=")) out.models = a.slice(9).split(",");
  }
  return out;
}

function selectModels(args) {
  let models;
  if (args.models) models = args.models.map(modelByKey).filter(Boolean);
  else if (args.pilot) models = pilotModels();
  else models = MODELS;
  // Only run vendors we actually have a key for; report skips honestly.
  const usable = [];
  const skipped = [];
  for (const m of models) {
    if (hasKeyFor(m.vendor)) usable.push(m);
    else skipped.push(m);
  }
  return { usable, skipped };
}

function selectItems(args) {
  if (args.items) return corpusFor(args.items);
  if (args.pilot) return corpusFor(PILOT_ITEM_IDS);
  return CORPUS;
}

async function main() {
  const args = parseArgs(process.argv);
  const items = selectItems(args);
  const { usable, skipped } = selectModels(args);

  console.log(`[run] mode=${args.pilot ? "pilot" : "full"}`);
  console.log(`[run] items: ${items.map((i) => i.id).join(", ")}`);
  console.log(`[run] models: ${usable.map((m) => m.key).join(", ") || "(none)"}`);
  if (skipped.length) {
    for (const m of skipped) {
      console.log(
        `[run] SKIPPED ${m.key} [${m.vendor}] - missing ${keyEnvFor(m.vendor)} (set it in the env or a gitignored .env to include this model)`,
      );
    }
  }
  if (!usable.length) {
    console.error("[run] No usable models (no API keys present). Aborting.");
    process.exit(1);
  }

  // Pre-fetch page content once per item for the full-content condition.
  const fetchedByItem = {};
  for (const item of items) {
    const url = item.urls.fullContentUrl;
    process.stdout.write(`[fetch] ${item.id} <- ${url} ... `);
    const r = await fetchPageText(url);
    fetchedByItem[item.id] = r;
    console.log(r.ok ? `ok (${r.text.length} chars)` : `FAILED (${r.error})`);
    await sleep(300);
  }

  const runId = nowIso().replace(/[:.]/g, "-");
  let total = 0;
  let ok = 0;
  let failed = 0;
  let skippedCells = 0;
  const failures = [];

  for (const model of usable) {
    for (const item of items) {
      for (const condition of CONDITIONS) {
        total++;
        const fname = `${RAW_DIR}/${model.key}__${item.id}__${condition}.json`;
        const tag = `${model.key} / ${item.id} / ${condition}`;
        // Resume support: skip cells already completed without error, so an
        // interrupted run can be re-invoked and only fills the gaps.
        if (existsSync(fname)) {
          try {
            const prev = await readJson(fname);
            if (prev && prev.skipped === true) {
              skippedCells++;
              console.log(`[skip] ${tag} (already skipped)`);
              continue;
            }
            if (prev && prev.error == null && prev.output) {
              ok++;
              console.log(`[skip] ${tag} (already done)`);
              continue;
            }
          } catch {
            // fall through and re-run
          }
        }
        const fetched =
          condition === "full-content"
            ? fetchedByItem[item.id]?.text || null
            : null;
        const prompt = buildPrompt(item, condition, fetched);
        if (prompt == null) {
          // This item carries no identifier for this condition (e.g. no
          // specUrl or bcdKey), so there is nothing to ask. Keep an explicit
          // raw record so reports distinguish not-applicable from missing data.
          const record = {
            runId,
            itemId: item.id,
            itemKind: item.kind,
            contentDate: item.contentDate,
            condition,
            model: model.key,
            vendor: model.vendor,
            apiId: model.apiId,
            cutoff: model.cutoff,
            urlUsed: urlForCondition(item, condition),
            prompt: null,
            output: null,
            usage: null,
            error: null,
            skipped: true,
            skipReason: "item has no identifier for this condition",
            timestamp: nowIso(),
          };
          await writeJson(fname, record);
          skippedCells++;
          console.log(`[skip] ${tag} (${record.skipReason})`);
          continue;
        }
        process.stdout.write(`[call] ${tag} ... `);
        const record = {
          runId,
          itemId: item.id,
          itemKind: item.kind,
          contentDate: item.contentDate,
          condition,
          model: model.key,
          vendor: model.vendor,
          apiId: model.apiId,
          cutoff: model.cutoff,
          urlUsed: urlForCondition(item, condition),
          prompt,
          timestamp: nowIso(),
        };
        try {
          const res = await callModel(model, prompt);
          record.output = res.text;
          record.usage = res.usage;
          record.error = null;
          ok++;
          console.log(`ok (${res.text.length} chars)`);
        } catch (e) {
          record.output = null;
          record.error = String(e.message || e);
          failed++;
          failures.push({ tag, error: record.error });
          console.log(`FAILED: ${record.error}`);
        }
        await writeJson(fname, record);
        await sleep(250);
      }
    }
  }

  console.log(
    `\n[run] done. total=${total} ok=${ok} skipped=${skippedCells} failed=${failed}`,
  );
  if (failures.length) {
    console.log("[run] failures:");
    for (const f of failures) console.log(`  - ${f.tag}: ${f.error}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
