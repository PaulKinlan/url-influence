// Test corpus.
//
// Each item is one thing we ask a model to produce or recall. The experiment
// runs every item under six CONDITIONS (see conditions.mjs) and compares.
//
// Fields:
//   id          - stable slug.
//   kind        - "code" (produce code that uses an API surface) or
//                 "recall" (recall facts about a document / spec / paper).
//   target      - plain-English description of the task, used by the
//                 name-only / url+name conditions (the "name" half).
//   contentDate - when the thing behind the URL came to exist (YYYY-MM or
//                 YYYY-MM-DD). Crossed against each model's cutoff to test the
//                 pre/post-cutoff boundary.
//   groundTruth - the real API surface / facts. Scored against this.
//                 `mustMention` is a list of strings the correct output should
//                 contain (cheap structural check); `notes` is judge context.
//   urls        - URLs at varying OPACITY:
//                   descriptive  : URL describes the content (e.g. MDN path)
//                   semiOpaque   : owner/repo - hints but does not describe API
//                   opaque       : a pure ID (arXiv id, RFC number, SO question
//                                  id, DOI) that says nothing about content
//                   fullContentUrl : the URL whose page we fetch+paste for the
//                                  ceiling condition (usually = descriptive)
//                   randomUrl    : an unrelated real URL (off-target control)
//   fakeUrl     - a plausible but NONEXISTENT URL of the same shape, to isolate
//                 whether URL *structure* alone steers output.
//
// To extend: copy an item, fill the fields. Keep groundTruth.mustMention to
// distinctive, real identifiers (method/property/section names), not generic
// words, so the structural check is meaningful.

const RANDOM_URL = "https://en.wikipedia.org/wiki/Postage_stamp";

export const CORPUS = [
  // ---- code-gen items: descriptive MDN + semi-opaque + opaque ----
  {
    id: "view-transitions",
    kind: "code",
    target:
      "Write JavaScript that uses the document.startViewTransition() View Transitions API to animate a DOM update.",
    contentDate: "2023-03", // shipped Chrome 111, well pre-cutoff for all
    groundTruth: {
      mustMention: ["startViewTransition", "ViewTransition", "ready", "finished"],
      notes:
        "The API entry point is document.startViewTransition(callback). It returns a ViewTransition object with promises: .ready, .finished, .updateCallbackDone, and a .skipTransition() method. CSS uses ::view-transition pseudo-elements and view-transition-name.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition",
      semiOpaque: "https://github.com/WICG/view-transitions",
      opaque: "https://stackoverflow.com/questions/75643683",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/Document/startPageTransition",
  },
  {
    id: "popover-api",
    kind: "code",
    target:
      "Write HTML and JavaScript using the Popover API (the popover attribute and HTMLElement.showPopover/togglePopover).",
    contentDate: "2024-01", // broadly shipped early 2024
    groundTruth: {
      mustMention: ["popover", "popovertarget", "showPopover", "togglePopover"],
      notes:
        "Declarative: an element with the popover attribute and a button with popovertarget pointing at its id. Imperative: HTMLElement.showPopover(), .hidePopover(), .togglePopover(). 'beforetoggle' / 'toggle' events fire. popover=auto vs manual.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/API/Popover_API",
      semiOpaque: "https://github.com/openui/open-ui",
      opaque: "https://stackoverflow.com/questions/77432324",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/Popover_API",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Flyout_API",
  },
  {
    id: "view-transitions-cross-doc",
    kind: "code",
    target:
      "Write the CSS/HTML to enable cross-document (multi-page) View Transitions using @view-transition.",
    contentDate: "2024-09", // cross-document VT shipped Chrome 126/late 2024
    groundTruth: {
      mustMention: ["@view-transition", "navigation", "view-transition-name"],
      notes:
        "Cross-document MPA transitions opt in with the CSS at-rule @view-transition { navigation: auto; } in BOTH documents. Uses view-transition-name to pair elements and the pageswap / pagereveal events to customise.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/@view-transition",
      semiOpaque: "https://github.com/WICG/view-transitions",
      opaque: "https://stackoverflow.com/questions/78201234",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/@view-transition",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/@page-transition",
  },
  {
    id: "css-anchor-positioning",
    kind: "code",
    target:
      "Write CSS using the CSS Anchor Positioning API (anchor-name, position-anchor, the anchor() function).",
    contentDate: "2024-08", // shipped Chrome 125 / mid 2024
    groundTruth: {
      mustMention: ["anchor-name", "position-anchor", "anchor(", "position-area"],
      notes:
        "An anchor element gets anchor-name: --foo. A positioned element sets position-anchor: --foo and uses the anchor() function (e.g. top: anchor(bottom)) or position-area. position-try-fallbacks handles overflow.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning",
      semiOpaque: "https://github.com/oddbird/css-anchor-positioning",
      opaque: "https://stackoverflow.com/questions/78745612",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_tether_positioning",
  },
  {
    id: "scheduler-yield",
    kind: "code",
    target:
      "Write JavaScript that uses scheduler.yield() to break up a long task and yield to the main thread.",
    contentDate: "2024-05", // scheduler.yield shipped 2024
    groundTruth: {
      mustMention: ["scheduler", "yield", "await"],
      notes:
        "await scheduler.yield() yields control to the event loop mid-task and resumes with high priority. Part of the same scheduler interface as scheduler.postTask(). Replaces setTimeout(0) yielding hacks.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield",
      semiOpaque: "https://github.com/WICG/scheduling-apis",
      opaque: "https://stackoverflow.com/questions/77899012",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/defer",
  },

  // ---- recall items: fully opaque arXiv / RFC / SO / DOI ----
  {
    id: "rfc-9110-http-semantics",
    kind: "recall",
    target:
      "Recall what RFC 9110 specifies and summarise its scope and a few key sections.",
    contentDate: "2022-06", // RFC 9110 published June 2022, pre-cutoff for all
    groundTruth: {
      mustMention: ["HTTP", "Semantics", "method", "status code"],
      notes:
        "RFC 9110 is 'HTTP Semantics' (June 2022), obsoleting parts of RFC 7230-7235. It defines HTTP methods (GET/POST/etc), status codes, header fields, and message semantics independent of the wire protocol version. Correct recall names HTTP Semantics specifically.",
    },
    urls: {
      descriptive: "https://www.rfc-editor.org/info/rfc9110",
      semiOpaque: "https://github.com/httpwg/http-core",
      opaque: "https://www.rfc-editor.org/rfc/rfc9110",
      fullContentUrl: "https://www.rfc-editor.org/rfc/rfc9110.txt",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://www.rfc-editor.org/rfc/rfc9999",
  },
  {
    id: "arxiv-attention",
    kind: "recall",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2017-06", // 'Attention Is All You Need', pre-cutoff for all
    groundTruth: {
      mustMention: ["Transformer", "attention", "Attention Is All You Need"],
      notes:
        "arXiv 1706.03762 is 'Attention Is All You Need' (Vaswani et al., 2017), introducing the Transformer architecture based purely on self-attention, removing recurrence/convolution. Correct recall names the Transformer.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1706.03762",
      semiOpaque: "https://github.com/tensorflow/tensor2tensor",
      opaque: "https://arxiv.org/abs/1706.03762",
      fullContentUrl: "https://arxiv.org/abs/1706.03762",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1706.99999",
  },
  {
    id: "arxiv-mamba",
    kind: "recall",
    target:
      "Recall the paper at this arXiv id: what architecture/idea does it introduce?",
    contentDate: "2023-12", // Mamba, pre-cutoff for all
    groundTruth: {
      mustMention: ["Mamba", "state space", "selective"],
      notes:
        "arXiv 2312.00752 is 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces' (Gu & Dao, Dec 2023). Introduces selective structured state space models (SSMs) as an alternative to attention with linear-time scaling.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2312.00752",
      semiOpaque: "https://github.com/state-spaces/mamba",
      opaque: "https://arxiv.org/abs/2312.00752",
      fullContentUrl: "https://arxiv.org/abs/2312.00752",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2312.00001",
  },

  // ---- boundary-straddling items (contentDate 2025-01..2026-01) ----
  {
    id: "arxiv-deepseek-r1",
    kind: "recall",
    target:
      "Recall the paper at this arXiv id: what model/method does it describe?",
    contentDate: "2025-01", // DeepSeek-R1 tech report, right on Gemini cutoff
    groundTruth: {
      mustMention: ["DeepSeek", "reasoning", "reinforcement learning"],
      notes:
        "arXiv 2501.12948 is the DeepSeek-R1 report (Jan 2025): incentivising reasoning in LLMs via large-scale reinforcement learning (R1-Zero / R1). Post-dates Gemini 2.5 (~2025-01) and is borderline for Sonnet 4.5 (~2025-07).",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2501.12948",
      semiOpaque: "https://github.com/deepseek-ai/DeepSeek-R1",
      opaque: "https://arxiv.org/abs/2501.12948",
      fullContentUrl: "https://arxiv.org/abs/2501.12948",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2501.00002",
  },
  {
    id: "temporal-api",
    kind: "code",
    target:
      "Write JavaScript using the Temporal API (Temporal.Now, Temporal.PlainDate, Temporal.ZonedDateTime) to do date arithmetic.",
    contentDate: "2025-05", // Temporal began shipping in browsers mid-2025
    groundTruth: {
      mustMention: ["Temporal", "PlainDate", "ZonedDateTime", "Now"],
      notes:
        "Temporal is the modern date/time API. Entry points: Temporal.Now.plainDateISO(), Temporal.PlainDate.from(), Temporal.ZonedDateTime, .add({days}), Temporal.Duration. Post-dates Gemini cutoff; borderline-to-post for Sonnet 4.5.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal",
      semiOpaque: "https://github.com/tc39/proposal-temporal",
      opaque: "https://stackoverflow.com/questions/79412345",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Chrono",
  },

  // ---- post-cutoff-for-all item (contentDate > 2026-01) ----
  {
    id: "arxiv-future-fake-real-id",
    kind: "recall",
    target:
      "Recall the paper at this arXiv id: what is it about? If you do not know, say so.",
    contentDate: "2026-05", // after every pilot model's cutoff
    groundTruth: {
      mustMention: [],
      notes:
        "arXiv 2605.xxxxx style id post-dates all current model cutoffs. The CORRECT behaviour is to admit ignorance / refuse to fabricate. Any confident specific claim about the paper's content is a hallucination and should score LOW. The judge should reward honest 'I don't know / cannot verify'.",
      expectUnknown: true,
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2605.04567",
      semiOpaque: "https://github.com/some-lab/future-work",
      opaque: "https://arxiv.org/abs/2605.04567",
      fullContentUrl: "https://arxiv.org/abs/2605.04567",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2605.99999",
  },
];

// Default pilot selection: 6 items mixing code-gen (MDN+opaque) and pure-recall
// (arXiv/RFC/SO), spanning pre-cutoff, boundary, and post-cutoff content dates.
export const PILOT_ITEM_IDS = [
  "view-transitions", // code, pre-cutoff (all)
  "css-anchor-positioning", // code, pre-cutoff (all)
  "rfc-9110-http-semantics", // recall, pre-cutoff (all)
  "arxiv-mamba", // recall, pre-cutoff (all)
  "arxiv-deepseek-r1", // recall, boundary (post-Gemini, borderline-Sonnet)
  "temporal-api", // code, post-Gemini / borderline-Sonnet
];

export function corpusFor(ids) {
  if (!ids) return CORPUS;
  return CORPUS.filter((it) => ids.includes(it.id));
}
