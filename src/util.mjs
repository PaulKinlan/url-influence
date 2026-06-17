// Shared utilities. No Node Buffer anywhere: use TextEncoder / atob / btoa.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

export function nowIso() {
  return new Date().toISOString();
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

export async function fetchPageText(url) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "url-influence-experiment/0.1 (+research)" },
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
