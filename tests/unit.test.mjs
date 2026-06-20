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
import { CORPUS } from "../src/corpus.mjs";

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

test("buildPrompt: described-framed uses the description in url-only framing, no URL", () => {
  const item = {
    id: "x",
    kind: "code",
    target: "Use the Foo API.",
    urls: { opaque: "https://chromestatus.com/feature/123" },
  };
  const p = buildPrompt(item, "described-framed", null);
  assert.ok(/Do whatever the following describes/.test(p.user));
  assert.ok(/Use the Foo API\./.test(p.user));
  assert.ok(!/http/.test(p.user), "described-framed carries no URL");
});

test("buildPrompt: recall name baselines describe by NAME, never a dangling id", () => {
  // Regression: a recall task references an external identifier ("the paper at
  // this arXiv id"). The name baselines must NOT echo that dangling reference;
  // they describe the work by its human name (DESCRIPTIVE_NAMES). url-only (the
  // treatment) still carries the real opaque id and no name.
  const item = CORPUS.find((i) => i.id === "arxiv-attention");
  for (const cond of ["described", "described-framed"]) {
    const p = buildPrompt(item, cond, null);
    assert.ok(p, `${cond} should build for a mapped recall item`);
    assert.ok(
      /Attention Is All You Need/.test(p.user),
      `${cond} names the work`,
    );
    assert.ok(
      !/this arXiv id/i.test(p.user),
      `${cond} must not echo the dangling 'this arXiv id'`,
    );
    assert.ok(!/http/.test(p.user), `${cond} carries no URL`);
  }
  const u = buildPrompt(item, "url-only", null);
  assert.ok(/arxiv\.org\/abs/.test(u.user), "url-only keeps the opaque id");
  assert.ok(
    !/Attention Is All You Need/.test(u.user),
    "no descriptive name leaks into url-only",
  );
});

test("buildPrompt: recall name baseline skips only when no descriptive name", () => {
  const item = {
    id: "unmapped-recall",
    kind: "recall",
    target: "Recall the thing at this id.",
    urls: { opaque: "https://example.com/x" },
  };
  assert.equal(buildPrompt(item, "described", null), null);
  assert.equal(buildPrompt(item, "described-framed", null), null);
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

test("urlForCondition: described / described-framed carry no URL", () => {
  const item = { urls: { opaque: "o", randomUrl: "r" }, fakeUrl: "f" };
  assert.equal(urlForCondition(item, "described"), null);
  assert.equal(urlForCondition(item, "described-framed"), null);
});

test("CONDITIONS includes the control + probe conditions", () => {
  for (const c of [
    "described",
    "described-framed",
    "url-only",
    "spec-url-only",
    "bcd-key-only",
    "fake-opaque-url",
  ]) {
    assert.ok(CONDITIONS.includes(c), `${c} present`);
  }
});
