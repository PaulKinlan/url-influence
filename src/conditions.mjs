// The six experimental conditions.
//
// Each condition turns an item into a prompt. The whole point of the experiment
// lives here, so the prompts are deliberately matched: the ONLY thing that
// varies between name-only and url-only is whether the task is described by name
// or by a bare URL string. We never tell the model to browse, and the harness
// never fetches a page except in the full-content (ceiling) condition.

export const CONDITIONS = [
  "name-only",
  "url-only",
  "url+name",
  "full-content",
  "fake-structural-url",
  "random-url",
];

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
