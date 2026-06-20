// Validate the experiment corpus before spending API budget.
//
// Static mode checks schema, duplicate ids, required prompt coverage, URL
// syntax, and optional-condition coverage.
//
// Live mode also checks primary URL reachability and Stack Overflow question
// title alignment for real opaque URLs. Intentionally fake/unrelated opaque
// URLs must be marked validation.opaqueRole = "structural-control". Live checks
// are intentionally opt-in because network state, rate limits, and site
// blocking can change.
//
// Usage:
//   node src/validate-corpus.mjs
//   node src/validate-corpus.mjs --live
//   node src/validate-corpus.mjs --json

import { CORPUS } from "./corpus.mjs";
import {
  CONDITION_DEFS,
  CONDITIONS,
  buildPrompt,
  urlForCondition,
} from "./conditions.mjs";

const GENERIC_HINTS = new Set([
  "actual",
  "answer",
  "api",
  "code",
  "content",
  "css",
  "describe",
  "document",
  "html",
  "javascript",
  "model",
  "paper",
  "produce",
  "question",
  "recall",
  "real",
  "state",
  "task",
  "using",
  "what",
  "write",
]);

const PRIMARY_URL_FIELDS = [
  "descriptive",
  "semiOpaque",
  "opaque",
  "fullContentUrl",
  "randomUrl",
  "specUrl",
];

const DIAGNOSTIC_URL_FIELDS = new Set(["urls.semiOpaque", "urls.specUrl"]);
const OPAQUE_ROLES = new Set(["structural-control"]);

function parseArgs(argv) {
  return {
    live: argv.includes("--live"),
    json: argv.includes("--json"),
    failOnWarning: argv.includes("--fail-on-warning"),
  };
}

function issue(list, level, itemId, field, message, detail = null) {
  list.push({ level, itemId, field, message, detail });
}

function isValidDateLike(value) {
  return /^\d{4}-\d{2}(-\d{2})?$/.test(String(value || ""));
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hintTokens(item) {
  const raw = [
    ...(item.validation?.hints || []),
    ...(item.groundTruth?.mustMention || []),
    item.id,
    item.target,
  ];
  const out = new Set();
  for (const value of raw) {
    for (const token of normalizeToken(value).split(/\s+/)) {
      if (token.length < 4 || GENERIC_HINTS.has(token)) continue;
      out.add(token);
    }
  }
  return [...out];
}

function stackOverflowQuestionId(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== "stackoverflow.com") return null;
    return u.pathname.match(/\/questions\/(\d+)/)?.[1] || null;
  } catch {
    return null;
  }
}

function opaqueRole(item) {
  return item.validation?.opaqueRole || "real";
}

function isStructuralOpaqueControl(item) {
  return opaqueRole(item) === "structural-control";
}

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 12000, headers = {}, ...init } = options;
  return fetch(url, {
    redirect: "follow",
    ...init,
    headers: {
      "user-agent": "url-influence-corpus-validator/0.1 (+research)",
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function checkUrlReachability(url) {
  try {
    let res = await fetchWithTimeout(url, { method: "HEAD" });
    if ([403, 405, 429].includes(res.status)) {
      res = await fetchWithTimeout(url, { method: "GET" });
    }
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      contentType: res.headers.get("content-type") || "",
    };
  } catch (e) {
    return {
      ok: false,
      status: null,
      finalUrl: null,
      error: String(e.message || e),
    };
  }
}

async function fetchStackOverflowQuestions(ids) {
  if (!ids.length) return new Map();
  const chunks = [];
  for (let i = 0; i < ids.length; i += 80) chunks.push(ids.slice(i, i + 80));
  const byId = new Map();
  for (const chunk of chunks) {
    const url =
      "https://api.stackexchange.com/2.3/questions/" +
      chunk.join(";") +
      "?order=desc&sort=activity&site=stackoverflow";
    const res = await fetchWithTimeout(url, { method: "GET" });
    if (!res.ok) {
      throw new Error(`Stack Exchange API ${res.status}`);
    }
    const json = await res.json();
    for (const q of json.items || []) byId.set(String(q.question_id), q);
  }
  return byId;
}

function validateStatic(problems) {
  const ids = new Set();
  const optionalCoverage = Object.fromEntries(
    CONDITION_DEFS.filter((c) => !c.required).map((c) => [c.key, 0]),
  );

  for (const item of CORPUS) {
    if (!item.id) issue(problems, "error", "(missing id)", "id", "missing id");
    else if (ids.has(item.id)) {
      issue(problems, "error", item.id, "id", "duplicate item id");
    } else ids.add(item.id);

    if (!["code", "recall"].includes(item.kind)) {
      issue(problems, "error", item.id, "kind", "kind must be code or recall");
    }
    if (!item.target) issue(problems, "error", item.id, "target", "missing target");
    if (!isValidDateLike(item.contentDate)) {
      issue(
        problems,
        "error",
        item.id,
        "contentDate",
        "contentDate must be YYYY-MM or YYYY-MM-DD",
      );
    }
    if (!Array.isArray(item.groundTruth?.mustMention)) {
      issue(
        problems,
        "error",
        item.id,
        "groundTruth.mustMention",
        "mustMention must be an array",
      );
    }
    if (!item.groundTruth?.notes) {
      issue(
        problems,
        "error",
        item.id,
        "groundTruth.notes",
        "missing ground truth notes",
      );
    }
    if (item.validation?.opaqueRole && !OPAQUE_ROLES.has(item.validation.opaqueRole)) {
      issue(
        problems,
        "error",
        item.id,
        "validation.opaqueRole",
        'opaqueRole must be "structural-control" when present',
        item.validation.opaqueRole,
      );
    }
    if (item.validation?.stackOverflowUrl) {
      if (!isValidUrl(item.validation.stackOverflowUrl)) {
        issue(
          problems,
          "error",
          item.id,
          "validation.stackOverflowUrl",
          "invalid Stack Overflow metadata URL",
          item.validation.stackOverflowUrl,
        );
      } else if (!stackOverflowQuestionId(item.validation.stackOverflowUrl)) {
        issue(
          problems,
          "error",
          item.id,
          "validation.stackOverflowUrl",
          "Stack Overflow metadata URL must be a question URL",
          item.validation.stackOverflowUrl,
        );
      }
    }

    for (const field of PRIMARY_URL_FIELDS) {
      const value = item.urls?.[field];
      if (value == null) continue;
      if (!isValidUrl(value)) {
        issue(problems, "error", item.id, `urls.${field}`, "invalid URL", value);
      }
    }
    if (!isValidUrl(item.fakeUrl)) {
      issue(problems, "error", item.id, "fakeUrl", "invalid fake URL", item.fakeUrl);
    }

    for (const def of CONDITION_DEFS) {
      const prompt = buildPrompt(item, def.key, "validation content");
      if (prompt != null && optionalCoverage[def.key] != null) {
        optionalCoverage[def.key]++;
      }
      if (def.required && prompt == null) {
        // The name baselines (described/described-framed) legitimately produce no
        // prompt for `expectUnknown` items: those have no real content to name
        // descriptively. Every OTHER recall item must carry a DESCRIPTIVE_NAMES
        // entry, so a null here still errors (catches a forgotten name).
        const nameBaselineSkippable =
          (def.key === "described" || def.key === "described-framed") &&
          item.groundTruth?.expectUnknown === true;
        if (!nameBaselineSkippable) {
          issue(
            problems,
            "error",
            item.id,
            def.key,
            "required condition produced no prompt",
          );
        }
      }
      if (prompt != null && typeof prompt.user !== "string") {
        issue(
          problems,
          "error",
          item.id,
          def.key,
          "condition prompt must include user text",
        );
      }
      const conditionUrl = urlForCondition(item, def.key);
      if (def.required && def.urlKind && conditionUrl == null) {
        issue(
          problems,
          "error",
          item.id,
          def.key,
          "required condition produced no URL",
        );
      }
    }
  }

  for (const [condition, count] of Object.entries(optionalCoverage)) {
    if (count === 0) {
      issue(
        problems,
        "warning",
        "(corpus)",
        condition,
        "optional condition has zero item coverage",
      );
    }
  }
}

async function validateLive(problems) {
  const urlChecks = new Map();
  const allUrls = [];

  for (const item of CORPUS) {
    for (const field of PRIMARY_URL_FIELDS) {
      const value = item.urls?.[field];
      if (value) allUrls.push({ item, field: `urls.${field}`, url: value });
    }
    if (item.fakeUrl) allUrls.push({ item, field: "fakeUrl", url: item.fakeUrl });
  }

  for (const { item, field, url } of allUrls) {
    if (field === "urls.opaque" && stackOverflowQuestionId(url)) {
      // Stack Overflow page fetches are often rate-limited or bot-blocked.
      // The Stack Exchange API check below is the authoritative live check for
      // these opaque ids.
      continue;
    }
    if (urlChecks.has(url)) continue;
    urlChecks.set(url, await checkUrlReachability(url));
    const result = urlChecks.get(url);
    const isFake = field === "fakeUrl";
    const structuralOpaqueControl =
      field === "urls.opaque" && isStructuralOpaqueControl(item);
    if (!isFake && !structuralOpaqueControl && !result.ok) {
      const blocked = [403, 429].includes(result.status);
      const diagnostic = DIAGNOSTIC_URL_FIELDS.has(field);
      issue(
        problems,
        blocked || diagnostic ? "warning" : "error",
        item.id,
        field,
        diagnostic
          ? "diagnostic URL did not resolve cleanly"
          : blocked
          ? "primary URL was blocked or rate-limited during live validation"
          : "primary URL did not resolve cleanly",
        { url, ...result },
      );
    }
    if (structuralOpaqueControl && result.ok) {
      issue(
        problems,
        "warning",
        item.id,
        field,
        "intentional structural-control opaque URL resolved; confirm it is unrelated to the target",
        { url, ...result },
      );
    }
    if (isFake && result.ok) {
      issue(
        problems,
        "warning",
        item.id,
        field,
        "fake URL resolved; it may no longer be a negative control",
        { url, ...result },
      );
    }
  }

  const soItems = CORPUS.map((item) => ({
    item,
    id: stackOverflowQuestionId(item.urls?.opaque),
  })).filter((x) => x.id);
  const questions = await fetchStackOverflowQuestions([...new Set(soItems.map((x) => x.id))]);

  for (const { item, id } of soItems) {
    const q = questions.get(id);
    if (!q) {
      if (isStructuralOpaqueControl(item)) continue;
      issue(
        problems,
        "error",
        item.id,
        "urls.opaque",
        "Stack Exchange API did not return this opaque question id",
        { questionId: id, url: item.urls.opaque },
      );
      continue;
    }
    const haystack = normalizeToken(`${q.title} ${q.link || ""}`);
    const hints = hintTokens(item);
    const matched = hints.filter((h) => haystack.includes(h));
    if (isStructuralOpaqueControl(item)) {
      if (matched.length) {
        issue(
          problems,
          "warning",
          item.id,
          "urls.opaque",
          "intentional structural-control Stack Overflow URL appears related to item target",
          {
            questionId: id,
            title: q.title,
            link: q.link,
            matchedHints: matched.slice(0, 12),
          },
        );
      }
    } else if (!matched.length) {
      issue(
        problems,
        "error",
        item.id,
        "urls.opaque",
        "Stack Overflow opaque URL appears unrelated to item target",
        {
          questionId: id,
          title: q.title,
          link: q.link,
          expectedHints: hints.slice(0, 12),
        },
      );
    }
  }
}

function printText(problems) {
  const errors = problems.filter((p) => p.level === "error");
  const warnings = problems.filter((p) => p.level === "warning");
  console.log(
    `[validate] items=${CORPUS.length} conditions=${CONDITIONS.length} errors=${errors.length} warnings=${warnings.length}`,
  );
  for (const p of problems) {
    const prefix = p.level === "error" ? "ERROR" : "WARN ";
    const detail = p.detail ? ` ${JSON.stringify(p.detail)}` : "";
    console.log(`${prefix} ${p.itemId} ${p.field}: ${p.message}${detail}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const problems = [];
  validateStatic(problems);
  if (args.live) await validateLive(problems);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          ok:
            !problems.some((p) => p.level === "error") &&
            !(args.failOnWarning && problems.length),
          live: args.live,
          items: CORPUS.length,
          conditions: CONDITIONS.length,
          problems,
        },
        null,
        2,
      ),
    );
  } else {
    printText(problems);
  }

  const hasError = problems.some((p) => p.level === "error");
  const hasWarning = problems.some((p) => p.level === "warning");
  if (hasError || (args.failOnWarning && hasWarning)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
