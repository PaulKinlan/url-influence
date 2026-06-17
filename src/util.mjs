// Shared utilities. No Node Buffer anywhere: use TextEncoder / atob / btoa.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

export function nowIso() {
  return new Date().toISOString();
}

// Minimal .env loader (no dependency). Reads simple KEY=VALUE lines from a
// gitignored .env file and sets them on process.env ONLY if not already set, so
// real environment variables always win. Keys are never logged. Lines that are
// blank or start with # are ignored; surrounding quotes on the value are
// stripped. This lets OPENAI_API_KEY (or any key) live in a local .env without
// adding a dependency and without ever being committed (.env is gitignored).
export function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return { loaded: false, keys: [] };
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { loaded: false, keys: [] };
  }
  const keys = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!k) continue;
    if (process.env[k] === undefined || process.env[k] === "") {
      process.env[k] = v;
    }
    keys.push(k);
  }
  return { loaded: true, keys };
}

// base64 of a UTF-8 string, Buffer-free.
export function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

export function b64decode(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function writeJson(path, obj) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(obj, null, 2));
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function listJson(dir) {
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith(".json")).map((f) => `${dir}/${f}`);
}

// Strip HTML to roughly-readable text for the full-content condition. Crude but
// adequate for pasting reference docs.
export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchPageText(url, timeoutMs = 20000) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "url-influence-experiment/0.1 (+research)" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, text: null };
    const ct = res.headers.get("content-type") || "";
    const body = await res.text();
    const text = /html/i.test(ct) ? htmlToText(body) : body;
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: String(e.message || e), text: null };
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
