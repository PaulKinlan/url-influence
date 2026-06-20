// The experimental conditions.
//
// Each condition turns an item into a prompt. The whole point of the experiment
// lives here, so the prompts are deliberately matched: the ONLY thing that
// varies between name-only and url-only is whether the task is described by name
// or by a bare URL string. We never tell the model to browse, and the harness
// never fetches a page except in the full-content (ceiling) condition.

import { DESCRIPTIVE_NAMES } from "./corpus.mjs";

export const CONDITION_DEFS = [
  {
    key: "name-only",
    group: "core",
    required: true,
    description: "task described in words, no URL (baseline)",
  },
  {
    key: "name-framed",
    group: "core",
    required: true,
    description:
      "the task DESCRIPTION in the SAME 'do whatever this describes' framing as url-only — isolates the framing cost from the identifier (url-only − name-framed = pure opaque-id-vs-description)",
  },
  {
    key: "url-only",
    group: "core",
    required: true,
    urlKind: "opaque",
    description:
      "only the opaque URL or id; the page is never fetched or pasted",
  },
  {
    key: "mdn-url-only",
    group: "identifier-probe",
    required: false,
    urlKind: "descriptive",
    description:
      "only the descriptive documentation URL; this measures URL text hints",
  },
  {
    key: "spec-url-only",
    group: "identifier-probe",
    required: false,
    urlKind: "specUrl",
    description:
      "only the canonical spec URL, when the item has one",
  },
  {
    key: "bcd-key-only",
    group: "identifier-probe",
    required: false,
    urlKind: "bcdKey",
    description:
      "only the Browser Compat Data key, when the item has one",
  },
  {
    key: "url+name",
    group: "context",
    required: true,
    urlKind: "opaque",
    description: "opaque URL plus the task name",
  },
  {
    key: "full-content",
    group: "ceiling",
    required: true,
    urlKind: "fullContentUrl",
    description: "the real page content is fetched and pasted in",
  },
  {
    key: "fake-structural-url",
    group: "control",
    required: true,
    urlKind: "fakeUrl",
    description:
      "plausible but nonexistent URL of the same shape (structure control); NB descriptive for web items (the fake path still names the API)",
  },
  {
    key: "fake-opaque-url",
    group: "control",
    required: true,
    urlKind: "fakeOpaque",
    description:
      "an OPAQUE-shaped fake id (fake ChromeStatus#/arXiv#/SO#, uniform) — does opaque URL *shape* alone steer, independent of any real content?",
  },
  {
    key: "random-url",
    group: "control",
    required: true,
    urlKind: "randomUrl",
    description: "unrelated real URL (off-target control)",
  },
];

export const CONDITIONS = CONDITION_DEFS.map((c) => c.key);

export const CORE_LIFT_CONDITIONS = ["name-only", "url-only"];
export const IDENTIFIER_PROBE_CONDITIONS = CONDITION_DEFS.filter(
  (c) => c.group === "identifier-probe",
).map((c) => c.key);

export function conditionInfo(condition) {
  return CONDITION_DEFS.find((c) => c.key === condition) || null;
}

const NO_BROWSE_NOTE =
  "You do not have internet access and cannot open the URL. Answer only from your own knowledge of what is at that URL.";

// The mdn-url-only probe is specifically about MDN documentation URLs. A
// `descriptive` URL that isn't on developer.mozilla.org (e.g. a recall item's
// arXiv/DOI link reused as `descriptive`) does NOT count.
export const isMdnUrl = (u) => /(^|\/\/)([^/]*\.)?developer\.mozilla\.org\//.test(u || "");

// An OPAQUE-shaped fake id matching the item's real opaque id type, so the
// "does opaque URL SHAPE steer?" control is uniform across item types (unlike
// `fakeUrl`, which is descriptive for web items). Nonexistent by construction.
export function fakeOpaqueOf(item) {
  const o = item?.urls?.opaque || "";
  if (/chromestatus\.com\/feature\//.test(o))
    return "https://chromestatus.com/feature/4000000000000001";
  if (/arxiv\.org\/abs\//.test(o)) return "https://arxiv.org/abs/2099.99999";
  if (/stackoverflow\.com\/questions\//.test(o))
    return "https://stackoverflow.com/questions/99999991";
  if (/datatracker|rfc-editor|ietf/.test(o))
    return "https://datatracker.ietf.org/doc/rfc9998/";
  if (/caniuse\.com/.test(o)) return "https://caniuse.com/zzz-nonexistent";
  return item?.fakeUrl || "https://example.com/nonexistent/0000";
}

// `fetched` is the already-fetched page text for the full-content condition
// (null otherwise). Returns { system, user }.
export function buildPrompt(item, condition, fetched) {
  const taskVerb =
    item.kind === "code"
      ? "Produce the code. Output the actual code, with the real API names."
      : "Recall the content. State what it is and its key facts.";

  // `item.target` for recall items is OPAQUE-ID-REFERENTIAL ("the paper at this
  // arXiv id"), which only reads coherently when the id is attached. So ANY
  // condition that states the task in WORDS must describe the work by its human
  // NAME instead. `taskDesc` is that self-contained description, shared by
  // name-only, name-framed, url+name and full-content. `code` items already have
  // a self-contained target.
  const recallDesc = item.kind === "recall" ? DESCRIPTIVE_NAMES[item.id] : null;
  const taskDesc =
    item.kind === "recall"
      ? recallDesc
        ? `Recall ${recallDesc}: what is it about, and what are its key facts / main contribution?`
        : item.target // only the 1 unmapped (expectUnknown) recall item; its URL/content still carries the pointer
      : item.target;
  // Name baselines REQUIRE a real descriptive name for recall items (no id to
  // attach), else N/A (skip) rather than emit the dangling "at this id" phrasing.
  const nameTask = item.kind === "recall" && !recallDesc ? null : taskDesc;

  const system =
    "You are a precise technical assistant. Be concrete and use exact, real " +
    "API names / identifiers / facts. If you do not actually know something, " +
    "say so plainly rather than inventing details.";

  switch (condition) {
    case "name-only":
      // Control: task described by NAME, no URL. For recall items the name is
      // the descriptive identifier (title / common name); url-only gives the
      // opaque id for the SAME target, so url-only − name-only = opaque-id
      // penalty. Skip only if no descriptive name was authored.
      if (nameTask == null) return null;
      return {
        system,
        user: `Task: ${nameTask}\n\n${taskVerb}`,
      };

    case "name-framed":
      // Framing-matched baseline: same "do whatever this describes" framing as
      // url-only, but with the plain task description (by name) instead of a URL.
      // Lets us net out the "vaguer instruction" cost of url-only's framing.
      if (nameTask == null) return null;
      return {
        system,
        user: `Do whatever the following describes:\n\n${nameTask}\n\n${taskVerb}`,
      };

    case "url-only":
      // The core opaque condition: ONLY the url string. No description of what
      // it is. We do not fetch it. The model must rely on training memory.
      return {
        system,
        user:
          `Do whatever the content at this URL describes:\n\n${item.urls.opaque}\n\n` +
          `${NO_BROWSE_NOTE}\n\n${taskVerb}`,
      };

    // Canonical / descriptive identifier probes. Each gives ONLY that
    // identifier (no task name), so we can see which KIND of id the model can
    // decode into the right content. Return null when the item carries no such
    // id, so the runner skips the cell rather than inventing one.
    case "mdn-url-only": {
      // ONLY a real MDN documentation URL. Recall items (arXiv/DOI/SO/RFC) carry
      // a `descriptive` URL that is just the opaque URL again, not MDN — so this
      // probe is N/A for them (skip → n/a), not "data from a non-MDN link".
      const u = isMdnUrl(item.urls?.descriptive) ? item.urls.descriptive : null;
      if (!u) return null;
      return {
        system,
        user:
          `Do whatever the content at this URL describes:\n\n${u}\n\n` +
          `${NO_BROWSE_NOTE}\n\n${taskVerb}`,
      };
    }

    case "spec-url-only": {
      const u = item.urls?.specUrl;
      if (!u) return null;
      return {
        system,
        user:
          `Do whatever the content at this URL describes:\n\n${u}\n\n` +
          `${NO_BROWSE_NOTE}\n\n${taskVerb}`,
      };
    }

    case "bcd-key-only": {
      const k = item.bcdKey;
      if (!k) return null;
      return {
        system,
        user:
          `Do whatever the web-platform feature with this Browser Compat Data ` +
          `(BCD) key describes:\n\n${k}\n\n${NO_BROWSE_NOTE}\n\n${taskVerb}`,
      };
    }

    case "url+name":
      // Opaque URL PLUS the task by name. For recall items the "name" is the
      // descriptive identifier (taskDesc), not the dangling "at this id" target.
      return {
        system,
        user:
          `Task: ${taskDesc}\nReference URL: ${item.urls.opaque}\n\n` +
          `${NO_BROWSE_NOTE}\n\n${taskVerb}`,
      };

    case "full-content": {
      // Ceiling: paste the fetched real content. Uses taskDesc so the recall
      // framing names the work rather than referencing an absent id.
      const content = (fetched || "(content unavailable)").slice(0, 12000);
      return {
        system,
        user:
          `Task: ${taskDesc}\n\nHere is the relevant reference content:\n\n` +
          `"""\n${content}\n"""\n\n${taskVerb}`,
      };
    }

    case "fake-structural-url":
      // A plausible but nonexistent URL of the same shape. Isolates whether the
      // URL *structure* alone steers output.
      return {
        system,
        user:
          `Do whatever the content at this URL describes:\n\n${item.fakeUrl}\n\n` +
          `${NO_BROWSE_NOTE}\n\n${taskVerb}`,
      };

    case "fake-opaque-url":
      // An opaque-SHAPED fake id (uniform across item types). Isolates whether
      // opaque URL *shape* alone steers output, independent of real content.
      return {
        system,
        user:
          `Do whatever the content at this URL describes:\n\n${fakeOpaqueOf(item)}\n\n` +
          `${NO_BROWSE_NOTE}\n\n${taskVerb}`,
      };

    case "random-url":
      // An unrelated real URL. Off-target control.
      return {
        system,
        user:
          `Do whatever the content at this URL describes:\n\n${item.urls.randomUrl}\n\n` +
          `${NO_BROWSE_NOTE}\n\n${taskVerb}`,
      };

    default:
      throw new Error(`unknown condition: ${condition}`);
  }
}

// Which opacity level a condition's URL represents (for reporting). The url-only
// / url+name conditions use the OPAQUE url by design; the README documents the
// full spectrum and the corpus carries descriptive/semiOpaque too for manual
// extension.
export function urlForCondition(item, condition) {
  switch (condition) {
    case "url-only":
    case "url+name":
      return item.urls.opaque;
    case "mdn-url-only":
      return isMdnUrl(item.urls?.descriptive) ? item.urls.descriptive : null;
    case "spec-url-only":
      return item.urls?.specUrl ?? null;
    case "bcd-key-only":
      return item.bcdKey ?? null;
    case "name-framed":
      return null;
    case "fake-structural-url":
      return item.fakeUrl;
    case "fake-opaque-url":
      return fakeOpaqueOf(item);
    case "random-url":
      return item.urls.randomUrl;
    case "full-content":
      return item.urls.fullContentUrl;
    default:
      return null;
  }
}
