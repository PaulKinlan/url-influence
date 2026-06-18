// The experimental conditions.
//
// Each condition turns an item into a prompt. The whole point of the experiment
// lives here, so the prompts are deliberately matched: the ONLY thing that
// varies between name-only and url-only is whether the task is described by name
// or by a bare URL string. We never tell the model to browse, and the harness
// never fetches a page except in the full-content (ceiling) condition.

export const CONDITION_DEFS = [
  {
    key: "name-only",
    group: "core",
    required: true,
    description: "task described in words, no URL (baseline)",
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
      "plausible but nonexistent URL of the same shape (structure control)",
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

// `fetched` is the already-fetched page text for the full-content condition
// (null otherwise). Returns { system, user }.
export function buildPrompt(item, condition, fetched) {
  const taskVerb =
    item.kind === "code"
      ? "Produce the code. Output the actual code, with the real API names."
      : "Recall the content. State what it is and its key facts.";

  const system =
    "You are a precise technical assistant. Be concrete and use exact, real " +
    "API names / identifiers / facts. If you do not actually know something, " +
    "say so plainly rather than inventing details.";

  switch (condition) {
    case "name-only":
      // Control: task described by name, NO url at all.
      return {
        system,
        user: `Task: ${item.target}\n\n${taskVerb}`,
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
      const u = item.urls?.descriptive;
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
      return {
        system,
        user:
          `Task: ${item.target}\nReference URL: ${item.urls.opaque}\n\n` +
          `${NO_BROWSE_NOTE}\n\n${taskVerb}`,
      };

    case "full-content": {
      // Ceiling: paste the fetched real content.
      const content = (fetched || "(content unavailable)").slice(0, 12000);
      return {
        system,
        user:
          `Task: ${item.target}\n\nHere is the relevant reference content:\n\n` +
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
      return item.urls?.descriptive ?? null;
    case "spec-url-only":
      return item.urls?.specUrl ?? null;
    case "bcd-key-only":
      return item.bcdKey ?? null;
    case "fake-structural-url":
      return item.fakeUrl;
    case "random-url":
      return item.urls.randomUrl;
    case "full-content":
      return item.urls.fullContentUrl;
    default:
      return null;
  }
}
