// Unit tests for the pure logic most likely to regress. Zero deps (node:test).
// Run: `node --test`
import { test } from "node:test";
import assert from "node:assert/strict";

import { htmlToText, b64encode, b64decode } from "../src/util.mjs";
import {
  buildPrompt,
  fakeOpaqueOf,
  urlForCondition,
  CONDITIONS,
} from "../src/conditions.mjs";

test("htmlToText: strips chrome, preserves code blocks with newlines", () => {
  const html =
    "<nav>Menu</nav><header>H</header><h1>fetch()</h1>" +
    "<p>The <code>fetch()</code> method.</p>" +
    "<pre>const r = await fetch(u);\nconst d = await r.json();</pre>" +
    "<footer>(c)</footer>";
  const out = htmlToText(html);
  assert.ok(!/Menu/.test(out), "nav removed");
  assert.ok(!/\(c\)/.test(out), "footer removed");
  assert.ok(/await fetch\(u\);\nconst d/.test(out), "code newlines preserved");
});

test("htmlToText: decodes entities", () => {
  assert.equal(htmlToText("<p>a &amp; b &lt;x&gt;</p>").trim(), "a & b <x>");
});

test("b64 round-trips (no Node Buffer)", () => {
  const s = "héllo — wörld";
  assert.equal(b64decode(b64encode(s)), s);
});

test("buildPrompt: name-framed uses the description in url-only framing, no URL", () => {
  const item = {
    id: "x",
    kind: "code",
    target: "Use the Foo API.",
    urls: { opaque: "https://chromestatus.com/feature/123" },
  };
  const p = buildPrompt(item, "name-framed", null);
  assert.ok(/Do whatever the following describes/.test(p.user));
  assert.ok(/Use the Foo API\./.test(p.user));
  assert.ok(!/http/.test(p.user), "name-framed carries no URL");
});

test("buildPrompt: url-only is opaque (only the id, no task name)", () => {
  const item = {
    id: "x",
    kind: "code",
    target: "Use the Foo API.",
    urls: { opaque: "https://chromestatus.com/feature/123" },
  };
  const p = buildPrompt(item, "url-only", null);
  assert.ok(/chromestatus\.com\/feature\/123/.test(p.user));
  assert.ok(!/Use the Foo API/.test(p.user), "no task name leaks into url-only");
});

test("buildPrompt: probe conditions return null when the id is absent", () => {
  const item = { id: "x", kind: "code", target: "t", urls: { opaque: "o" } };
  assert.equal(buildPrompt(item, "spec-url-only", null), null);
  assert.equal(buildPrompt(item, "bcd-key-only", null), null);
});

test("fakeOpaqueOf: opaque-shaped per id type, and nonexistent", () => {
  assert.match(
    fakeOpaqueOf({ urls: { opaque: "https://chromestatus.com/feature/5" } }),
    /chromestatus\.com\/feature\/\d+/,
  );
  assert.match(
    fakeOpaqueOf({ urls: { opaque: "https://arxiv.org/abs/1706.03762" } }),
    /arxiv\.org\/abs\/\d+\.\d+/,
  );
});

test("urlForCondition: name-only / name-framed carry no URL", () => {
  const item = { urls: { opaque: "o", randomUrl: "r" }, fakeUrl: "f" };
  assert.equal(urlForCondition(item, "name-only"), null);
  assert.equal(urlForCondition(item, "name-framed"), null);
});

test("CONDITIONS includes the control + probe conditions", () => {
  for (const c of [
    "name-only",
    "name-framed",
    "url-only",
    "spec-url-only",
    "bcd-key-only",
    "fake-opaque-url",
  ]) {
    assert.ok(CONDITIONS.includes(c), `${c} present`);
  }
});
