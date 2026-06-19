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
//   validation  - optional corpus-maintenance metadata. Use
//                 validation.opaqueRole = "structural-control" when urls.opaque
//                 is deliberately fake/unrelated; those items are controls, not
//                 headline URL-memory evidence. Use validation.stackOverflowUrl
//                 to retain an SO-shaped noisy/control pointer when ChromeStatus
//                 is the real opaque URL.
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
    bcdKey: "api.Document.startViewTransition",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/75643683" },
    groundTruth: {
      mustMention: ["startViewTransition", "ViewTransition", "ready", "finished"],
      notes:
        "The API entry point is document.startViewTransition(callback). It returns a ViewTransition object with promises: .ready, .finished, .updateCallbackDone, and a .skipTransition() method. CSS uses ::view-transition pseudo-elements and view-transition-name.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition",
      semiOpaque: "https://github.com/WICG/view-transitions",
      opaque: "https://chromestatus.com/feature/5193009714954240",
      specUrl: "https://www.w3.org/TR/css-view-transitions-1/",
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
    contentDate: "2024-04", // popover shipped Chrome 114 (2023) and broadly 2024; pre-cutoff for all
    bcdKey: "html.global_attributes.popover",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/77432324" },
    groundTruth: {
      mustMention: ["popover", "popovertarget", "showPopover", "togglePopover"],
      notes:
        "Declarative: an element with the popover attribute and a button with popovertarget pointing at its id. Imperative: HTMLElement.showPopover(), .hidePopover(), .togglePopover(). 'beforetoggle' / 'toggle' events fire. popover=auto vs manual.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/API/Popover_API",
      semiOpaque: "https://github.com/openui/open-ui",
      opaque: "https://chromestatus.com/feature/5463833265045504",
      specUrl: "https://html.spec.whatwg.org/multipage/popover.html",
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
    bcdKey: "css.at-rules.view-transition",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/78201234" },
    groundTruth: {
      mustMention: ["@view-transition", "navigation", "view-transition-name"],
      notes:
        "Cross-document MPA transitions opt in with the CSS at-rule @view-transition { navigation: auto; } in BOTH documents. Uses view-transition-name to pair elements and the pageswap / pagereveal events to customise.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/@view-transition",
      semiOpaque: "https://github.com/WICG/view-transitions",
      opaque: "https://chromestatus.com/feature/5118874666663936",
      specUrl: "https://drafts.csswg.org/css-view-transitions-2/#cross-doc-opt-in",
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
    bcdKey: "css.properties.anchor-name",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/78745612" },
    groundTruth: {
      mustMention: ["anchor-name", "position-anchor", "anchor(", "position-area"],
      notes:
        "An anchor element gets anchor-name: --foo. A positioned element sets position-anchor: --foo and uses the anchor() function (e.g. top: anchor(bottom)) or position-area. position-try-fallbacks handles overflow.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning",
      semiOpaque: "https://github.com/oddbird/css-anchor-positioning",
      opaque: "https://chromestatus.com/feature/5124922471874560",
      specUrl: "https://drafts.csswg.org/css-anchor-position-1/#anchoring",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_tether_positioning",
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
      opaque: "https://datatracker.ietf.org/doc/rfc9110/",
      fullContentUrl: "https://datatracker.ietf.org/doc/html/rfc9110",
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
    fakeUrl: "https://arxiv.org/abs/2312.99999",
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
    fakeUrl: "https://arxiv.org/abs/2501.99999",
  },
  {
    id: "temporal-api",
    kind: "code",
    target:
      "Write JavaScript using the Temporal API (Temporal.Now, Temporal.PlainDate, Temporal.ZonedDateTime) to do date arithmetic.",
    // webstatus.dev + ChromeStatus 5668291307634688: Temporal shipped Chrome 144
    // (2026-01-13), not mid-2025. Corrected from 2025-05.
    contentDate: "2026-01",
    bcdKey: "javascript.builtins.Temporal",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/79412345" },
    groundTruth: {
      mustMention: ["Temporal", "PlainDate", "ZonedDateTime", "Now"],
      notes:
        "Temporal is the modern date/time API. Entry points: Temporal.Now.plainDateISO(), Temporal.PlainDate.from(), Temporal.ZonedDateTime, .add({days}), Temporal.Duration. Post-dates Gemini cutoff; borderline-to-post for Sonnet 4.5.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal",
      semiOpaque: "https://github.com/tc39/proposal-temporal",
      opaque: "https://chromestatus.com/feature/5668291307634688",
      specUrl: "https://tc39.es/proposal-temporal/",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Chrono",
  },

  // ---- 2024-09..2025-01 window: GPT-5 (cut 2024-09) blind, others know ----
  // css-anchor-positioning (contentDate 2024-08) and view-transitions-cross-doc
  // (2024-09) above already straddle the GPT-5 boundary.

  // ---- 2025-01..2025-08 window: Gemini (2025-01) + GPT-5 blind, Claude knows -
  {
    id: "arxiv-gemma-3",
    kind: "recall",
    target:
      "Recall the paper at this arXiv id: which model family does it describe and what is the headline architectural change?",
    // arXiv 2503.19786 submitted 2025-03-25. Post Gemini (2025-01) and GPT-5
    // (2024-09); pre Sonnet 4.5 (2025-07), Opus 4.6 (2025-08), Opus 4.8/Sonnet
    // 4.6 (2026-01). Source: https://arxiv.org/abs/2503.19786
    contentDate: "2025-03",
    groundTruth: {
      mustMention: ["Gemma 3", "multimodal", "attention"],
      notes:
        "arXiv 2503.19786 is the 'Gemma 3 Technical Report' (Google DeepMind, Mar 2025). Gemma 3 is a multimodal open model family (1B-27B) with vision, longer (128K) context, and an architecture change increasing the ratio of local-to-global attention layers to cut KV-cache memory. Correct recall names Gemma 3 specifically.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2503.19786",
      semiOpaque: "https://huggingface.co/google/gemma-3-27b-it",
      opaque: "https://arxiv.org/abs/2503.19786",
      fullContentUrl: "https://arxiv.org/abs/2503.19786",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2503.99999",
  },
  {
    id: "customizable-select",
    kind: "code",
    target:
      "Write HTML/CSS for a customizable <select> element (appearance: base-select, the ::picker(select) pseudo-element, and <selectedcontent>).",
    // Shipped Chrome 134 (2025-03-04). Post Gemini/GPT-5; pre Claude flagships.
    contentDate: "2025-03",
    bcdKey: "css.properties.appearance.base-select",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/79501234" },
    groundTruth: {
      mustMention: [
        "appearance: base-select",
        "selectedcontent",
        "::picker(select)",
      ],
      notes:
        "Customizable select opts in with `appearance: base-select` on the select (and its ::picker(select)). The <selectedcontent> element mirrors the chosen option's content into the button, and <option>s can hold rich markup. Shipped Chrome 134, March 2025.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/::picker",
      semiOpaque: "https://github.com/openui/open-ui",
      opaque: "https://chromestatus.com/feature/5737365999976448",
      specUrl: "https://open-ui.org/components/customizableselect/",
      fullContentUrl:
        "https://developer.chrome.com/blog/a-customizable-select",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/CSS/::dropdown(select)",
  },

  // ---- 2025-07..2025-08 boundary: Sonnet 4.5 (2025-07) just blind, Opus 4.6
  //      (2025-08) just knows, GPT-5.2 (2025-08) borderline ----
  {
    id: "arxiv-kimi-k2",
    kind: "recall",
    target:
      "Recall the paper at this arXiv id: what model does it describe and what novel optimizer does it introduce?",
    // arXiv 2507.20534 submitted 2507 (Jul 28, 2025). Source:
    // https://arxiv.org/abs/2507.20534
    contentDate: "2025-07",
    groundTruth: {
      mustMention: ["Kimi K2", "Mixture-of-Experts", "MuonClip"],
      notes:
        "arXiv 2507.20534 is 'Kimi K2: Open Agentic Intelligence' (Moonshot AI, Jul 2025). A 1T-total / 32B-active Mixture-of-Experts LLM trained with the novel MuonClip optimizer on 15.5T tokens, strong on agentic/SWE tasks. Correct recall names Kimi K2 and MuonClip.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2507.20534",
      semiOpaque: "https://github.com/MoonshotAI/Kimi-K2",
      opaque: "https://arxiv.org/abs/2507.20534",
      fullContentUrl: "https://arxiv.org/abs/2507.20534",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2507.99999",
  },

  // ---- 2025-08..2025-12 window: only the very latest flagships know ----
  {
    id: "element-scoped-view-transitions",
    kind: "code",
    target:
      "Write JavaScript/CSS using element-scoped View Transitions (calling startViewTransition() on an element rather than document) to animate just one component.",
    // webstatus.dev + ChromeStatus 5109852273377280: element-scoped view
    // transitions shipped Chrome 147 (2026-04-07), not Chrome 140/2025-09.
    // Corrected from 2025-09 → post-dates every current flagship's cutoff.
    contentDate: "2026-04",
    bcdKey: "api.Element.startViewTransition",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/79612345" },
    groundTruth: {
      mustMention: ["startViewTransition", "view-transition-name", "element"],
      notes:
        "Element-scoped view transitions let you call element.startViewTransition() (not just document.startViewTransition()) so the snapshot/animation is scoped to that element's subtree. Pairs with view-transition-name. Shipped Chrome 140, Sept 2025.",
    },
    urls: {
      descriptive:
        "https://developer.chrome.com/blog/element-scoped-view-transitions",
      semiOpaque: "https://github.com/WICG/view-transitions",
      opaque: "https://chromestatus.com/feature/5109852273377280",
      specUrl: "https://drafts.csswg.org/css-view-transitions-2/#scoped-vt",
      fullContentUrl:
        "https://developer.chrome.com/blog/element-scoped-view-transitions",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/Element/startScopedTransition",
  },

  // ---- 2025-12..2026-01 boundary: GPT-5.5 (Dec 1, 2025) blind, the Jan-2026
  //      Claude flagships borderline-to-knowing ----
  {
    id: "arxiv-gpt5-system-card",
    kind: "recall",
    target:
      "Recall the document at this arXiv id: what is it and what are its headline claims?",
    // arXiv 2601.03267, submitted 2025-12-19. Post GPT-5.5 cutoff (2025-12-01);
    // borderline for Opus 4.8 / Sonnet 4.6 (2026-01-31). Source:
    // https://arxiv.org/abs/2601.03267
    contentDate: "2025-12",
    groundTruth: {
      mustMention: ["GPT-5", "system card", "router"],
      notes:
        "arXiv 2601.03267 is the 'OpenAI GPT-5 System Card'. It describes GPT-5 as a unified system: a fast model, a deeper reasoning model, and a real-time router; headline claims are reduced hallucinations, better instruction following, less sycophancy, and 'safe-completions' safety training. Correct recall identifies it as the GPT-5 system card.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2601.03267",
      semiOpaque: "https://openai.com/index/gpt-5-system-card/",
      opaque: "https://arxiv.org/abs/2601.03267",
      fullContentUrl: "https://arxiv.org/abs/2601.03267",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2601.99999",
  },

  // ---- POST-2026-01: every current flagship is blind ----
  {
    id: "scroll-triggered-animations",
    kind: "code",
    target:
      "Write CSS using scroll-triggered animations (the animation-trigger property / scroll-triggered timeline) to start an animation when an element crosses a scroll offset.",
    // Landed Chrome 145 (Feb 2026), after every current model's cutoff
    // (latest is Opus 4.8 / Sonnet 4.6 at 2026-01-31). The CORRECT behaviour is
    // to be uncertain rather than confidently invent the exact syntax.
    contentDate: "2026-02",
    bcdKey: "css.properties.animation-trigger",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/79912345" },
    groundTruth: {
      mustMention: ["animation-trigger", "scroll"],
      notes:
        "Scroll-triggered animations (Chrome 145, Feb 2026) start/replay a normal time-based animation when a scroll offset is crossed, via the new animation-trigger property (distinct from older scroll-DRIVEN animations that scrub progress with scroll() / view()). Post-dates every current flagship's cutoff, so confidently asserting exact syntax is likely a hallucination; honest uncertainty about the exact API is acceptable.",
      expectUnknown: true,
    },
    urls: {
      descriptive:
        "https://developer.chrome.com/blog/scroll-triggered-animations",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5181996801982464",
      specUrl: "https://drafts.csswg.org/animation-triggers-1/#propdef-animation-trigger",
      fullContentUrl:
        "https://developer.chrome.com/blog/scroll-triggered-animations",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/CSS/animation-on-scroll",
  },
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

  // ---- SHAPE-CHANGE / BASELINE expansion (Paul, 2026-06-17) ----------------
  // Web-platform features chosen to stress the core claim from specific angles:
  // a clean post-cutoff negative, two API-shape changes the model is likely to
  // get STALE-wrong, a pre-cutoff control, and a Baseline-status recall.

  // HTML-in-Canvas: post-cutoff for EVERY current flagship AND a moving target.
  // Behind chrome://flags/#canvas-draw-element in Chromium 146/147+ (origin
  // trial), and the entry point was RENAMED drawElement -> drawElementImage
  // (2d) / texElementImage2D (webgl). Not on MDN. A model can only either admit
  // it doesn't know, or hallucinate (often the older "drawElement" name). The
  // cleanest "if it's not in the model, it can't be used properly" item.
  {
    id: "html-in-canvas",
    kind: "code",
    target:
      "Write JavaScript that draws a live HTML element's rendering into a 2D canvas using the HTML-in-Canvas API.",
    contentDate: "2026-02", // origin trial / flag, Chromium 146+, post ALL cutoffs
    groundTruth: {
      mustMention: ["drawElementImage", "getContext", "canvas"],
      notes:
        "The HTML-in-Canvas API (origin trial, Chromium 146+, behind the canvas-draw-element flag) lets a 2D context draw a real HTML element's rendering. The CURRENT entry point is ctx.drawElementImage(element, x, y) (WebGL: texElementImage2D); it was renamed FROM the earlier 'drawElement'. Post-dates every current flagship's cutoff (latest 2026-01-31). Correct behaviour is honest uncertainty about exact current syntax; emitting the stale 'drawElement' name or confidently inventing an API is the stale/hallucination failure this item is designed to catch.",
      expectUnknown: true,
    },
    urls: {
      descriptive: "https://html-in-canvas.dev/",
      semiOpaque: "https://github.com/WICG/html-in-canvas",
      opaque: "https://chromestatus.com/feature/5114053285249024",
      // No clean BCD key yet (origin trial, not in browser-compat-data); the only
      // canonical spec is the WICG explainer (per webstatus.dev). bcdKey omitted.
      specUrl: "https://github.com/WICG/html-in-canvas/blob/main/README.md",
      fullContentUrl:
        "https://developer.chrome.com/blog/html-in-canvas-origin-trial",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawHTML",
  },
  // Chrome Prompt API: a genuine API-SHAPE change. The 2024 shape was
  // window.ai.* (e.g. window.ai.createTextSession()); it changed in 2025 to the
  // global LanguageModel object (LanguageModel.availability() /
  // LanguageModel.create() -> session.prompt()). Models cut at 2024-09 (GPT-5)
  // or ~2025-01 (Gemini) tend to emit the STALE window.ai surface even given
  // the URL; only the later flagships know the LanguageModel global. The point
  // is not "unknown" but "wrong shape from stale memory".
  {
    id: "prompt-api-shape",
    kind: "code",
    target:
      "Write JavaScript using Chrome's built-in Prompt API to create a language-model session and prompt it for a response.",
    // webstatus.dev (`languagemodel`) + ChromeStatus 5134603979063296: the
    // LanguageModel surface shipped Chrome 148 (2026-05-05). Corrected from the
    // earlier 2025-05 estimate.
    contentDate: "2026-05",
    bcdKey: "api.LanguageModel",
    groundTruth: {
      mustMention: ["LanguageModel", "create", "prompt", "availability"],
      notes:
        "The CURRENT Chrome Prompt API uses the global LanguageModel object: await LanguageModel.availability(), then const session = await LanguageModel.create({...}); const out = await session.prompt('...') (or session.promptStreaming). The OLD (2024) shape used window.ai.* / window.ai.createTextSession() / window.ai.assistant - generating THAT is the stale-knowledge failure. Score the new LanguageModel global as correct; flag window.ai.* as the wrong/stale surface.",
    },
    urls: {
      descriptive: "https://developer.chrome.com/docs/ai/prompt-api",
      semiOpaque: "https://github.com/webmachinelearning/prompt-api",
      opaque: "https://chromestatus.com/feature/5134603979063296",
      specUrl: "https://webmachinelearning.github.io/prompt-api/",
      fullContentUrl: "https://developer.chrome.com/docs/ai/prompt-api",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Window/ai",
  },
  // FedCM: a pre-cutoff CONTROL. Shipped Chrome 108 (Dec 2022), well inside
  // every model's training. The model SHOULD produce the right surface
  // confidently - if it can't even do this, the harness (not the model) is
  // suspect. Paul: "a good baseline check".
  {
    id: "fedcm",
    kind: "code",
    target:
      "Write JavaScript using the FedCM API for federated sign-in (navigator.credentials.get with an identity option).",
    contentDate: "2022-12", // Chrome 108, pre-cutoff for ALL models
    bcdKey: "api.IdentityCredential",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/74619456" },
    groundTruth: {
      mustMention: [
        "navigator.credentials.get",
        "identity",
        "providers",
        "configURL",
      ],
      notes:
        "FedCM calls navigator.credentials.get({ identity: { providers: [{ configURL, clientId, nonce }] } }) and resolves to an IdentityCredential carrying a token. Shipped Chrome 108 (Dec 2022), broadly documented. This is a pre-cutoff control: a correct, confident answer is expected from every model.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/API/FedCM_API",
      semiOpaque: "https://github.com/fedidcg/FedCM",
      opaque: "https://chromestatus.com/feature/6438627087220736",
      specUrl: "https://www.w3.org/TR/fedcm/",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/FedCM_API",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/FederatedCredential_API",
  },
  // Baseline status recall: SHARP, checkable probe of whether the model knows the
  // CURRENT Baseline status of :has(). The expected answer is definite: :has()
  // became Baseline "Newly available" on 2023-12-21 (Firefox 121 completed
  // cross-browser support) and crosses to Baseline "Widely available" 30 months
  // later, i.e. mid-2026 (~2026-06). As of mid-2026 the one correct answer is
  // "Widely available". Models cut in 2025 typically still say "Newly
  // available"/"limited availability" — exactly the stale-Baseline failure this
  // targets. mustMention pins the two checkable facts: the 2023-12 newly-available
  // date and the current "Widely available" status.
  {
    id: "baseline-has-status",
    kind: "recall",
    target:
      "Question with a definite answer: as of mid-2026, what is the current Baseline status of the CSS :has() selector — \"Newly available\" or \"Widely available\" — and on what date (YYYY-MM) did it first become Baseline Newly available? State the exact status and date.",
    contentDate: "2026-06", // the "Widely available" milestone post-dates all cutoffs
    bcdKey: "css.selectors.has",
    groundTruth: {
      mustMention: ["Widely available", "2023-12", "Newly available"],
      notes:
        "Definite expected answer: :has() first became Baseline 'Newly available' on 2023-12-21 (Firefox 121 completed cross-browser support), and 30 months later — mid-2026 (~2026-06) — it crossed to Baseline 'Widely available'. So as of mid-2026 the single correct status is 'Widely available', and the newly-available date is 2023-12. A correct answer states BOTH: now Widely available, newly-available 2023-12. Saying it is still 'Newly available' / 'limited availability' / 'not Baseline' as of mid-2026 is wrong (the stale-Baseline failure).",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/CSS/:has",
      semiOpaque: "https://github.com/web-platform-dx/web-features",
      opaque: "https://caniuse.com/css-has",
      specUrl: "https://drafts.csswg.org/selectors/#relational",
      fullContentUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/:has",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/:contains",
  },

  // ---- POST-CUTOFF API-USAGE EXPANSION (Paul, 2026-06-17) -------------------
  // Real, recent web-platform features extracted from the chrome-platform-
  // showcase per-milestone conformance.json files (v145..v150). Every one
  // shipped to Chrome stable AFTER 2026-01-31, so they are post-cutoff for every
  // model in the registry — they make the post-cutoff API bucket measurable.
  // mustMention strings are taken verbatim from the conformance assertions'
  // `test` surface (real author-facing identifiers), so the structural check is
  // meaningful. These are NOT expectUnknown: the correct answer IS the real
  // surface; we are measuring whether the model can produce it and whether a URL
  // helps. Milestone -> stable date: v145≈2026-02, v146≈2026-03, v147≈2026-04,
  // v148≈2026-05, v149≈2026-06, v150≈2026-06-30.

  // v145 (Chrome 145, ~2026-02). Source: chrome-platform-showcase/v145/
  // text-justify-css-property/conformance.json (csid 5079678972985344).
  {
    id: "text-justify-css-property",
    kind: "code",
    target:
      "Write CSS that fully justifies a paragraph and controls HOW the justification stretches the text using the text-justify property (e.g. spacing only between words vs between every character).",
    contentDate: "2026-02",
    bcdKey: "css.properties.text-justify",
    groundTruth: {
      mustMention: [
        "text-justify",
        "inter-word",
        "inter-character",
        "text-align: justify",
      ],
      notes:
        "text-justify controls the justification algorithm used when text-align: justify is set. Values: auto, inter-word (add space only between words), inter-character (distribute space between every character, useful for CJK), and none. Shipped Chrome 145 (~2026-02), post-dating every current model's cutoff (latest 2026-01-31).",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-justify",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5079678972985344",
      specUrl: "https://drafts.csswg.org/css-text-4/#text-justify-property",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/text-justify",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-justification",
  },

  // v146 (Chrome 146, ~2026-03). Source: chrome-platform-showcase/v146/
  // support-hanging-and-each-line-for-text-indent/conformance.json
  // (csid 5084062739988480).
  {
    id: "css-text-indent-hanging",
    kind: "code",
    target:
      "Write CSS that indents every line of a paragraph EXCEPT the first (a hanging indent), and a variant that re-applies the indent after each forced line break, using text-indent with its keyword modifiers.",
    contentDate: "2026-03",
    bcdKey: "css.properties.text-indent.hanging",
    groundTruth: {
      mustMention: ["text-indent", "hanging", "each-line"],
      notes:
        "Chrome 146 (~2026-03) added the `hanging` and `each-line` keywords to the text-indent property: `text-indent: 2em hanging` indents all lines except the first; `text-indent: 2em each-line` re-applies after forced line breaks; both can combine as `text-indent: 2em hanging each-line`. Post-dates every current model's cutoff.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-indent",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5084062739988480",
      specUrl: "https://drafts.csswg.org/css-text-4/#text-indent-property",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/text-indent",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/text-indent-hanging",
  },
  // Source: chrome-platform-showcase/v146/
  // named-feature-function-for-css-supports/conformance.json
  // (csid 5153932394102784).
  {
    id: "named-feature-supports",
    kind: "code",
    target:
      "Write CSS/JS that feature-detects a named CSS engine capability using the named-feature() function inside @supports and CSS.supports().",
    contentDate: "2026-03",
    groundTruth: {
      mustMention: ["named-feature(", "@supports", "CSS.supports"],
      notes:
        "Chrome 146 (~2026-03) added the named-feature() function to CSS feature queries, e.g. `@supports named-feature(foo) { ... }` and `CSS.supports('named-feature(single-axis-scroll-container)')`. It tests for named engine capabilities that aren't expressible as a property:value pair; an unknown name returns false. Post-dates every current model's cutoff.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/CSS/@supports",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5153932394102784",
      // named-feature() has no browser-compat-data entry yet (Proposed); only a
      // spec anchor exists, so bcdKey is omitted and the bcd-key-only probe skips.
      specUrl:
        "https://drafts.csswg.org/css-conditional-5/#typedef-supports-named-feature-fn",
      fullContentUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/@supports",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/@supports/feature",
  },

  // v147 (Chrome 147, ~2026-04). Source: chrome-platform-showcase/v147/
  // corner-shaping-corner-shape-superellipse-squircle/conformance.json
  // (csid 5357329815699456).
  {
    id: "corner-shape-squircle",
    kind: "code",
    target:
      "Write CSS that gives a box squircle (superellipse) corners instead of plain rounded corners, using the corner-shape property together with border-radius.",
    // webstatus.dev (`corner-shape`) + ChromeStatus 5357329815699456: corner
    // shaping shipped Chrome 139 (2025-08-05), not Chrome 147/2026-04. Corrected
    // from 2026-04 → it pre-dates the Jan-2026 Claude flagships' cutoff.
    contentDate: "2025-08",
    bcdKey: "css.properties.corner-shape",
    groundTruth: {
      mustMention: ["corner-shape", "squircle", "superellipse(", "border-radius"],
      notes:
        "Chrome 139 (~2025-08) shipped corner shaping: the corner-shape property (and corner-*-shape longhands) restyles the area defined by border-radius. Values include squircle, superellipse(<number>), scoop, notch, bevel, round, square — e.g. `border-radius: 16px; corner-shape: squircle`.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/CSS/corner-shape",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5357329815699456",
      specUrl: "https://drafts.csswg.org/css-borders-4/#corner-shaping",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/corner-shape",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/corner-style",
  },
  // Source: chrome-platform-showcase/v147/math-sumprecise/conformance.json
  // (csid 4790090146643968).
  {
    id: "math-sumprecise",
    kind: "code",
    target:
      "Write JavaScript that sums an array of floating-point numbers without the usual accumulated rounding error, using the new precise-summation Math method.",
    contentDate: "2026-04",
    bcdKey: "javascript.builtins.Math.sumPrecise",
    groundTruth: {
      mustMention: ["Math.sumPrecise"],
      notes:
        "Math.sumPrecise(iterable) (TC39 proposal-math-sum, shipped Chrome 147 ~2026-04) returns the exactly-rounded sum of an iterable of numbers, avoiding the rounding error of naive accumulation: e.g. Math.sumPrecise([0.1, 0.2]) === 0.3 and Math.sumPrecise([1e20, 0.1, -1e20]) === 0.1. It throws on non-number elements and returns -0 for the empty iterable. Post-dates every current model's cutoff.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sumPrecise",
      semiOpaque: "https://github.com/tc39/proposal-math-sum",
      opaque: "https://chromestatus.com/feature/4790090146643968",
      specUrl:
        "https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.sumprecise",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sumPrecise",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/preciseSum",
  },
  // Source: chrome-platform-showcase/v147/gamepad-event-driven-input-api/
  // conformance.json (csid 5989275208253440).
  {
    id: "gamepad-event-driven-input",
    kind: "code",
    target:
      "Write JavaScript that reacts to gamepad input via events instead of polling navigator.getGamepads(), using the new event-driven Gamepad input event.",
    contentDate: "2026-04",
    groundTruth: {
      mustMention: ["rawgamepadinputchange", "addEventListener", "GamepadEvent"],
      notes:
        "Chrome 147 (~2026-04) added event-driven gamepad input: instead of polling navigator.getGamepads() in a rAF loop, listen for the `rawgamepadinputchange` event on window (feature-detect via 'onrawgamepadinputchange' in window). The handler receives a GamepadEvent. Post-dates every current model's cutoff.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API",
      semiOpaque: "https://github.com/w3c/gamepad",
      opaque: "https://chromestatus.com/feature/5989275208253440",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/Window/gamepadinput_event",
  },

  // v148 (Chrome 148, ~2026-05). Source: chrome-platform-showcase/v148/
  // translator-api/conformance.json (csid 5172811302961152).
  {
    id: "translator-api",
    kind: "code",
    target:
      "Write JavaScript using Chrome's built-in Translator API to create a translator for a source/target language pair and translate a string on-device.",
    // webstatus.dev (`translator`) + ChromeStatus 5172811302961152: Translator
    // shipped Chrome 138 (2025-06-24), not Chrome 148/2026-05. Corrected from
    // 2026-05 → it pre-dates the Jan-2026 Claude flagships' cutoff.
    contentDate: "2025-06",
    bcdKey: "api.Translator",
    groundTruth: {
      mustMention: ["Translator", "create", "translate", "availability"],
      notes:
        "The built-in Translator API (shipped Chrome 138 ~2025-06) uses the global Translator object: `await Translator.availability({sourceLanguage, targetLanguage})`, then `const t = await Translator.create({sourceLanguage, targetLanguage})`, then `await t.translate(text)` (or t.translateStreaming).",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/API/Translator",
      semiOpaque: "https://github.com/webmachinelearning/translation-api",
      opaque: "https://chromestatus.com/feature/5172811302961152",
      specUrl: "https://webmachinelearning.github.io/translation-api/#translator-api",
      fullContentUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Translator",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/API/TranslationService",
  },
  // Source: chrome-platform-showcase/v148/language-detector-api/conformance.json
  // (csid 6494349985841152).
  {
    id: "language-detector-api",
    kind: "code",
    target:
      "Write JavaScript using Chrome's built-in Language Detector API to detect the most likely language of a piece of text on-device, with confidence scores.",
    // webstatus.dev (`languagedetector`) + ChromeStatus 6494349985841152:
    // Language Detector shipped Chrome 138 (2025-06-24), not Chrome 148/2026-05.
    // Corrected from 2026-05 → it pre-dates the Jan-2026 Claude flagships' cutoff.
    contentDate: "2025-06",
    bcdKey: "api.LanguageDetector",
    groundTruth: {
      mustMention: ["LanguageDetector", "create", "detect", "availability"],
      notes:
        "The built-in Language Detector API (shipped Chrome 138 ~2025-06) uses the global LanguageDetector object: `await LanguageDetector.availability()`, then `const d = await LanguageDetector.create({expectedInputLanguages})`, then `const results = await d.detect(text)` returning an array of { detectedLanguage, confidence }.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector",
      semiOpaque: "https://github.com/webmachinelearning/translation-api",
      opaque: "https://chromestatus.com/feature/6494349985841152",
      specUrl:
        "https://webmachinelearning.github.io/translation-api/#language-detector-api",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetectionService",
  },
  // Source: chrome-platform-showcase/v148/text-decoration-skip-ink-all/
  // conformance.json (csid 5077600085082112).
  {
    id: "text-decoration-skip-ink-all",
    kind: "code",
    target:
      "Write CSS that forces an underline to ALWAYS break around glyph descenders (never touch them), using the text-decoration-skip-ink property's strongest value.",
    contentDate: "2026-05",
    bcdKey: "css.properties.text-decoration-skip-ink.all",
    groundTruth: {
      mustMention: ["text-decoration-skip-ink", "all", "text-decoration-line"],
      notes:
        "Chrome 148 (~2026-05) added the `all` value to text-decoration-skip-ink. Whereas `auto` lets the browser optionally interrupt underlines/overlines around glyphs, `text-decoration-skip-ink: all` forces it to always interrupt them (useful for CJK). Values: auto | none | all. Post-dates every current model's cutoff.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration-skip-ink",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5077600085082112",
      specUrl:
        "https://drafts.csswg.org/css-text-decor-4/#valdef-text-decoration-skip-ink-all",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration-skip-ink",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration-skip-glyphs",
  },

  // v149 (Chrome 149, ~2026-06). Source: chrome-platform-showcase/v149/
  // css-gap-decorations/conformance.json (csid 5157805733183488).
  {
    id: "css-gap-decorations",
    kind: "code",
    target:
      "Write CSS that draws decorative rules (lines) in the gaps between rows and columns of a grid layout, using the CSS gap decorations properties.",
    contentDate: "2026-06",
    bcdKey: "css.properties.row-rule",
    groundTruth: {
      mustMention: ["row-rule", "column-rule", "row-rule-style", "row-rule-color"],
      notes:
        "CSS gap decorations (shipped Chrome 149 ~2026-06) extend column-rule to grid/flex and add row-rule. Longhands: row-rule-color/row-rule-style/row-rule-width and column-rule-*; shorthands row-rule (e.g. `row-rule: 2px solid red`) and the `rule` shorthand for both axes. Post-dates every current model's cutoff.",
    },
    urls: {
      descriptive: "https://developer.chrome.com/blog/gap-decorations",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5157805733183488",
      specUrl: "https://drafts.csswg.org/css-gaps-1/#propdef-row-rule",
      fullContentUrl: "https://developer.chrome.com/blog/gap-decorations",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/gap-rule",
  },
  // Source: chrome-platform-showcase/v149/css-shape-function/conformance.json
  // (csid 5172258539307008).
  {
    id: "css-shape-function",
    kind: "code",
    target:
      "Write CSS that clips an element to a custom outline made of line and curve segments using the shape() function in clip-path (responsive, unlike a fixed path()).",
    // webstatus.dev (`shape-function`) + ChromeStatus 5172258539307008: the CSS
    // shape() function shipped Chrome 135 (2025-04-01), not Chrome 149/2026-06.
    // Corrected from 2026-06 → it pre-dates the Jan-2026 Claude flagships' cutoff.
    contentDate: "2025-04",
    bcdKey: "css.types.basic-shape.shape",
    groundTruth: {
      mustMention: ["shape(", "from", "line to", "clip-path", "close"],
      notes:
        "The CSS shape() function (shipped Chrome 135 ~2025-04) builds a <basic-shape> from drawing commands and works in clip-path/offset-path with responsive units, e.g. `clip-path: shape(from 0% 0%, line to 100% 0%, line to 100% 100%, close)` and curve/arc commands (curve to ... with ..., arc to ... of ...). It is the responsive successor to path().",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/basic-shape/shape",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5172258539307008",
      specUrl: "https://drafts.csswg.org/css-shapes-1/#shape-function",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/basic-shape/shape",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/basic-shape/polyline",
  },
  // Source: chrome-platform-showcase/v149/uint8array-base64-hex/conformance.json
  // (csid 6281131254874112).
  {
    id: "uint8array-base64-hex",
    kind: "code",
    target:
      "Write JavaScript that converts a Uint8Array to and from base64 and hex strings using the new built-in Uint8Array methods (no manual btoa/atob loop).",
    // webstatus.dev (`uint8array-base64-hex`) + ChromeStatus 6281131254874112:
    // these methods shipped Chrome 140 (2025-09-02), not Chrome 149/2026-06.
    // Corrected from 2026-06 → it pre-dates the Jan-2026 Claude flagships' cutoff.
    contentDate: "2025-09",
    bcdKey: "javascript.builtins.Uint8Array.toBase64",
    groundTruth: {
      mustMention: ["toBase64", "fromBase64", "toHex", "fromHex"],
      notes:
        "TC39 Uint8Array base64/hex (shipped Chrome 140 ~2025-09): instance methods Uint8Array.prototype.toBase64() / toHex() and static Uint8Array.fromBase64(str) / fromHex(str), replacing manual btoa/atob byte juggling. e.g. new Uint8Array([0,15,255]).toHex() === '000fff'.",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64",
      semiOpaque: "https://github.com/tc39/proposal-arraybuffer-base64",
      opaque: "https://chromestatus.com/feature/6281131254874112",
      specUrl:
        "https://tc39.es/ecma262/multipage/indexed-collections.html#sec-additional-properties-of-the-uint8array-prototype-object",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64String",
  },
  // Source: chrome-platform-showcase/v149/css-scroll-state-container-queries/
  // conformance.json (csid 5072263730167808).
  {
    id: "css-scroll-state-container-queries",
    kind: "code",
    target:
      "Write CSS that styles a sticky header differently once it becomes stuck to the top while scrolling, using scroll-state container queries.",
    // webstatus.dev (`container-scroll-state-queries`) + ChromeStatus
    // 5072263730167808: scroll-state container queries shipped Chrome 133
    // (2025-02-04), not Chrome 149/2026-06. Corrected from 2026-06 → it
    // pre-dates the Jan-2026 Claude flagships' cutoff.
    contentDate: "2025-02",
    bcdKey: "css.at-rules.container.scroll-state_queries",
    groundTruth: {
      mustMention: [
        "container-type: scroll-state",
        "@container scroll-state(stuck: top)",
        "container-name",
      ],
      notes:
        "Scroll-state container queries (shipped Chrome 133 ~2025-02): set `container-type: scroll-state` (optionally `container: name / scroll-state`) on an ancestor, then query `@container scroll-state(stuck: top)`, `scroll-state(snapped: y)`, or `scroll-state(scrollable: top)` to style descendants based on the container's scroll state.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/CSS/@container",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5072263730167808",
      specUrl: "https://drafts.csswg.org/css-conditional-5/#scroll-state-container",
      fullContentUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/@container",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/CSS/@container/scroll-position",
  },

  // v150 (Chrome 150 stable 2026-06-30). Source: chrome-platform-showcase/v150/
  // css-image-color-function/conformance.json (csid 5121011285622784).
  {
    id: "css-image-color-function",
    kind: "code",
    target:
      "Write CSS that uses a solid color as an <image> value (e.g. a background-image that is a flat color swatch) using the image() function.",
    contentDate: "2026-06",
    // BCD has no dedicated key for the color argument; css.types.image is the
    // representative BCD key for the image() function this item exercises.
    bcdKey: "css.types.image",
    groundTruth: {
      mustMention: ["image(", "background-image", "list-style-image"],
      notes:
        "Chrome 150 (stable 2026-06-30) shipped color arguments to the CSS image() function, so a color can be used wherever an <image> is expected, e.g. `background-image: image(red)`, `background-image: image(rgb(10 20 30 / 0.5))`, `list-style-image: image(blue)`. Post-dates every current model's cutoff.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/CSS/image/image",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      opaque: "https://chromestatus.com/feature/5121011285622784",
      specUrl: "https://drafts.csswg.org/css-images-4/#image-notation",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/image/image",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/image/color",
  },

  // ---- OLD, deeply in-training web features (pre-Chrome-80, 2014-2017) ----
  // Every current model knows these cold. They carry the FULL spectrum of
  // identifiers so we can see which KIND of id acts as a retrieval key for an
  // in-training web feature: a real (verified) ChromeStatus feature id as the
  // opaque id, the descriptive MDN URL, the canonical W3C/WHATWG/TC39 spec URL,
  // and the Browser Compat Data (BCD) dotted key — run under the
  // mdn-url-only / spec-url-only / bcd-key-only probes plus opaque url-only.
  // (Promise has no canonical ChromeStatus base entry, so its opaque id is a
  // structural-control, not real opaque evidence.)
  {
    id: "fetch-api",
    kind: "code",
    target:
      "Write JavaScript that uses the fetch() API to GET a URL and parse the JSON response.",
    contentDate: "2015-03", // Chrome 42, March 2015 — pre-Chrome-80
    bcdKey: "api.fetch",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/29775797" },
    groundTruth: {
      mustMention: ["fetch(", ".json(", "Response", "await"],
      notes:
        "fetch(url) returns a Promise<Response>; await it, check response.ok, then await response.json(). Shipped Chrome 42 (2015), universally in training.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch",
      semiOpaque: "https://github.com/whatwg/fetch",
      // Real ChromeStatus feature id (verified via the API: name "Fetch API").
      opaque: "https://chromestatus.com/feature/6730533392351232",
      specUrl: "https://fetch.spec.whatwg.org/",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Window/httpGet",
  },
  {
    id: "intersection-observer",
    kind: "code",
    target:
      "Write JavaScript that uses IntersectionObserver to run a callback when an element scrolls into view.",
    contentDate: "2016-05", // Chrome 51, May 2016
    bcdKey: "api.IntersectionObserver",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/45514676" },
    groundTruth: {
      mustMention: [
        "IntersectionObserver",
        "observe",
        "isIntersecting",
        "threshold",
      ],
      notes:
        "new IntersectionObserver(callback, { threshold }) then .observe(el); the callback receives entries with entry.isIntersecting and entry.intersectionRatio. Shipped Chrome 51 (2016).",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver",
      semiOpaque: "https://github.com/w3c/IntersectionObserver",
      // Real ChromeStatus feature id (verified: name "Intersection Observer", Chrome 51).
      opaque: "https://chromestatus.com/feature/5695342691483648",
      specUrl: "https://www.w3.org/TR/intersection-observer/",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/ViewportObserver",
  },
  {
    id: "js-promise",
    kind: "code",
    target:
      "Write JavaScript that creates and consumes a Promise (construct one, resolve/reject it, and handle it with then/catch).",
    contentDate: "2014-01", // Chrome 32 / ES2015, Jan 2014
    bcdKey: "javascript.builtins.Promise",
    // Core ES2015 language feature — ChromeStatus does not track it, so there is
    // no canonical opaque id; the SO id is a structural control, not real
    // opaque evidence. The spec/bcd probes carry the canonical-id signal.
    validation: { opaqueRole: "structural-control" },
    groundTruth: {
      mustMention: ["new Promise", "resolve", "reject", "then", "catch"],
      notes:
        "new Promise((resolve, reject) => {...}); consume with .then(onFulfilled).catch(onRejected). Part of ES2015, shipped Chrome 32 (2014).",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise",
      semiOpaque: "https://github.com/tc39/ecma262",
      opaque: "https://stackoverflow.com/questions/30564053",
      specUrl: "https://tc39.es/ecma262/#sec-promise-objects",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Future",
  },
  {
    id: "service-worker",
    kind: "code",
    target:
      "Write JavaScript that registers a service worker and caches assets in its install event.",
    contentDate: "2015-01", // Chrome 40, Jan 2015
    bcdKey: "api.ServiceWorker",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/33639071" },
    groundTruth: {
      mustMention: [
        "navigator.serviceWorker",
        "register",
        "install",
        "caches",
      ],
      notes:
        "navigator.serviceWorker.register('/sw.js'); inside the worker, the 'install' event uses event.waitUntil(caches.open(...).then(c => c.addAll(...))). Shipped Chrome 40 (2015).",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API",
      semiOpaque: "https://github.com/w3c/ServiceWorker",
      opaque: "https://www.chromestatus.com/feature/6561526227927040",
      specUrl: "https://www.w3.org/TR/service-workers/",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/Background_Worker_API",
  },
  {
    id: "css-grid",
    kind: "code",
    target:
      "Write CSS that lays out a container with CSS Grid (a grid with explicit columns, rows, and gaps).",
    contentDate: "2017-03", // Chrome 57, March 2017
    bcdKey: "css.properties.grid",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/43520932" },
    groundTruth: {
      mustMention: [
        "display: grid",
        "grid-template-columns",
        "grid-template-rows",
        "gap",
      ],
      notes:
        "display: grid with grid-template-columns / grid-template-rows (often repeat()/fr units) and gap. Shipped Chrome 57 (2017).",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout",
      semiOpaque: "https://github.com/w3c/csswg-drafts",
      // Real ChromeStatus feature id (verified: name "CSS Grid Layout", Chrome 57).
      opaque: "https://chromestatus.com/feature/4589636412243968",
      specUrl: "https://www.w3.org/TR/css-grid-1/",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_lattice_layout",
  },
  {
    id: "async-await",
    kind: "code",
    target:
      "Write JavaScript using an async function and await to sequence two asynchronous calls.",
    contentDate: "2016-10", // Chrome 55 / ES2017, Oct 2016
    bcdKey: "javascript.statements.async_function",
    validation: { stackOverflowUrl: "https://stackoverflow.com/questions/42624647" },
    groundTruth: {
      mustMention: ["async", "await", "try", "catch"],
      notes:
        "async function f() { const a = await p1(); const b = await p2(a); } with try/catch for errors. ES2017, shipped Chrome 55 (2016).",
    },
    urls: {
      descriptive:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function",
      semiOpaque: "https://github.com/tc39/ecma262",
      // Real ChromeStatus feature id (verified: name "Async/await functions").
      opaque: "https://chromestatus.com/feature/5643236399906816",
      specUrl: "https://tc39.es/ecma262/#sec-async-function-definitions",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/defer_function",
  },

  // ==========================================================================
  // BALANCED OPAQUE-ID GRID (added 2026-06-19). A popularity x cutoff grid
  // across MULTIPLE independent opaque-id schemes so the url-memory effect can
  // be tested WITHIN a scheme (pre/post-cutoff) and the "decodes because FAMOUS"
  // vs "decodes because PRE-CUTOFF" confound can be separated. Every id below is
  // REAL and was VERIFIED against the scheme's API/page (title + date) before
  // adding. Each item carries a top-level `popularity` tag
  // ("famous" | "moderate" | "obscure"). Post-cutoff = content published AFTER
  // 2026-01-31 (after the latest model cutoff, Jan 2026). These are name-only-
  // fair recall items: the id IS the content, so name-only correctly scores ~0
  // and url-only supplies the id.
  // ==========================================================================

  // ---- CVE (year-in-the-id; NVD-indexed) ----
  {
    id: "cve-2014-0160-heartbleed",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the CVE at this identifier: what software/component does it affect and what is the vulnerability?",
    contentDate: "2014-04-07", // CVE-2014-0160 published 2014-04-07 (NVD/MITRE)
    groundTruth: {
      mustMention: ["Heartbleed", "OpenSSL", "Heartbeat", "TLS"],
      notes:
        "CVE-2014-0160 is Heartbleed: the TLS/DTLS Heartbeat Extension in OpenSSL 1.0.1 before 1.0.1g does not properly bound-check Heartbeat packets, letting a remote attacker read sensitive process memory via crafted packets. Correct recall names Heartbleed / OpenSSL Heartbeat.",
    },
    urls: {
      descriptive: "https://nvd.nist.gov/vuln/detail/CVE-2014-0160",
      semiOpaque: "https://cveawg.mitre.org/api/cve/CVE-2014-0160",
      opaque: "https://nvd.nist.gov/vuln/detail/CVE-2014-0160",
      fullContentUrl: "https://nvd.nist.gov/vuln/detail/CVE-2014-0160",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://nvd.nist.gov/vuln/detail/CVE-2014-99999",
  },
  {
    id: "cve-2021-44228-log4shell",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the CVE at this identifier: what software/component does it affect and what is the vulnerability?",
    contentDate: "2021-12-10", // CVE-2021-44228 published 2021-12-10 (NVD/MITRE)
    groundTruth: {
      mustMention: ["Log4Shell", "Log4j", "JNDI", "remote code execution"],
      notes:
        "CVE-2021-44228 is Log4Shell: Apache Log4j2 2.0-beta9 through 2.15.0 JNDI features used in configuration/log messages do not protect against attacker-controlled LDAP and other JNDI endpoints, enabling remote code execution. Correct recall names Log4j/Log4Shell and JNDI/LDAP RCE.",
    },
    urls: {
      descriptive: "https://nvd.nist.gov/vuln/detail/CVE-2021-44228",
      semiOpaque: "https://cveawg.mitre.org/api/cve/CVE-2021-44228",
      opaque: "https://nvd.nist.gov/vuln/detail/CVE-2021-44228",
      fullContentUrl: "https://nvd.nist.gov/vuln/detail/CVE-2021-44228",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://nvd.nist.gov/vuln/detail/CVE-2021-99999",
  },
  {
    id: "cve-2024-3094-xz-backdoor",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the CVE at this identifier: what software/component does it affect and what is the vulnerability?",
    contentDate: "2024-03-29", // CVE-2024-3094 published 2024-03-29 (MITRE)
    groundTruth: {
      mustMention: ["xz", "liblzma", "backdoor", "5.6.0"],
      notes:
        "CVE-2024-3094 is the xz/liblzma supply-chain backdoor: malicious code in xz upstream tarballs starting with version 5.6.0; the liblzma build extracts a prebuilt obfuscated object enabling unauthorized SSH access. Correct recall names xz/liblzma and the supply-chain backdoor.",
    },
    urls: {
      descriptive: "https://nvd.nist.gov/vuln/detail/CVE-2024-3094",
      semiOpaque: "https://cveawg.mitre.org/api/cve/CVE-2024-3094",
      opaque: "https://nvd.nist.gov/vuln/detail/CVE-2024-3094",
      fullContentUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-3094",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://nvd.nist.gov/vuln/detail/CVE-2024-99999",
  },
  {
    id: "cve-2017-0144-eternalblue",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall the CVE at this identifier: what software/component does it affect and what is the vulnerability?",
    contentDate: "2017-03-17", // CVE-2017-0144 published 2017-03-17 (MITRE)
    groundTruth: {
      mustMention: ["EternalBlue", "SMBv1", "Windows", "remote code execution"],
      notes:
        "CVE-2017-0144 is EternalBlue: the SMBv1 server in Microsoft Windows (Vista through Windows 10 / Server 2016) mishandles crafted packets, allowing remote code execution. It was used by WannaCry/NotPetya. Correct recall names SMBv1 / EternalBlue RCE.",
    },
    urls: {
      descriptive: "https://nvd.nist.gov/vuln/detail/CVE-2017-0144",
      semiOpaque: "https://cveawg.mitre.org/api/cve/CVE-2017-0144",
      opaque: "https://nvd.nist.gov/vuln/detail/CVE-2017-0144",
      fullContentUrl: "https://nvd.nist.gov/vuln/detail/CVE-2017-0144",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://nvd.nist.gov/vuln/detail/CVE-2017-09999",
  },
  {
    id: "cve-2019-0708-bluekeep",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall the CVE at this identifier: what software/component does it affect and what is the vulnerability?",
    contentDate: "2019-05-16", // CVE-2019-0708 published 2019-05-16 (MITRE)
    groundTruth: {
      mustMention: ["BlueKeep", "Remote Desktop", "RDP", "remote code execution"],
      notes:
        "CVE-2019-0708 is BlueKeep: a pre-authentication remote code execution flaw in Windows Remote Desktop Services (RDP) reachable by an unauthenticated attacker, wormable. Correct recall names RDP / Remote Desktop Services and BlueKeep RCE.",
    },
    urls: {
      descriptive: "https://nvd.nist.gov/vuln/detail/CVE-2019-0708",
      semiOpaque: "https://cveawg.mitre.org/api/cve/CVE-2019-0708",
      opaque: "https://nvd.nist.gov/vuln/detail/CVE-2019-0708",
      fullContentUrl: "https://nvd.nist.gov/vuln/detail/CVE-2019-0708",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://nvd.nist.gov/vuln/detail/CVE-2019-09999",
  },
  {
    id: "cve-2018-7600-drupalgeddon2",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the CVE at this identifier: what software/component does it affect and what is the vulnerability?",
    contentDate: "2018-03-29", // CVE-2018-7600 published 2018-03-29 (MITRE)
    groundTruth: {
      mustMention: ["Drupal", "Drupalgeddon2", "remote code execution", "7.58"],
      notes:
        "CVE-2018-7600 is Drupalgeddon2: Drupal before 7.58 / 8.x before 8.3.9 / 8.4.x before 8.4.6 / 8.5.x before 8.5.1 allows remote attackers to execute arbitrary code due to insufficient input sanitization across multiple subsystems. Correct recall names Drupal RCE / Drupalgeddon2.",
    },
    urls: {
      descriptive: "https://nvd.nist.gov/vuln/detail/CVE-2018-7600",
      semiOpaque: "https://cveawg.mitre.org/api/cve/CVE-2018-7600",
      opaque: "https://nvd.nist.gov/vuln/detail/CVE-2018-7600",
      fullContentUrl: "https://nvd.nist.gov/vuln/detail/CVE-2018-7600",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://nvd.nist.gov/vuln/detail/CVE-2018-79999",
  },
  {
    id: "cve-2026-25000-wheel-of-life",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the CVE at this identifier: what software/component does it affect and what is the vulnerability?",
    contentDate: "2026-02-19", // CVE-2026-25000 published 2026-02-19 (MITRE) — POST-cutoff
    groundTruth: {
      mustMention: ["Wheel of Life", "WordPress", "Broken Access Control", "1.2.0"],
      notes:
        "CVE-2026-25000 is a Broken Access Control / Missing Authorization vulnerability in the WordPress 'Wheel of Life' plugin (Kraft Plugins) versions <= 1.2.0, allowing exploitation of incorrectly configured access-control levels. Published 2026-02-19, after the Jan-2026 model cutoff.",
    },
    urls: {
      descriptive: "https://nvd.nist.gov/vuln/detail/CVE-2026-25000",
      semiOpaque: "https://cveawg.mitre.org/api/cve/CVE-2026-25000",
      opaque: "https://nvd.nist.gov/vuln/detail/CVE-2026-25000",
      fullContentUrl: "https://nvd.nist.gov/vuln/detail/CVE-2026-25000",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://nvd.nist.gov/vuln/detail/CVE-2026-99999",
  },
  {
    id: "cve-2026-3000-idexpert-rce",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the CVE at this identifier: what software/component does it affect and what is the vulnerability?",
    contentDate: "2026-03-02", // CVE-2026-3000 published 2026-03-02 (MITRE) — POST-cutoff
    groundTruth: {
      mustMention: ["IDExpert", "Windows Logon Agent", "Remote Code Execution", "Changing"],
      notes:
        "CVE-2026-3000 is a Remote Code Execution vulnerability in the IDExpert Windows Logon Agent (developed by Changing), allowing unauthenticated remote attackers to force the system to download arbitrary DLLs. Published 2026-03-02, after the Jan-2026 model cutoff.",
    },
    urls: {
      descriptive: "https://nvd.nist.gov/vuln/detail/CVE-2026-3000",
      semiOpaque: "https://cveawg.mitre.org/api/cve/CVE-2026-3000",
      opaque: "https://nvd.nist.gov/vuln/detail/CVE-2026-3000",
      fullContentUrl: "https://nvd.nist.gov/vuln/detail/CVE-2026-3000",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://nvd.nist.gov/vuln/detail/CVE-2026-39999",
  },

  // ---- arXiv (beyond the existing 6) ----
  {
    id: "arxiv-resnet",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2015-12-10", // 1512.03385, verified via arXiv API
    groundTruth: {
      mustMention: ["ResNet", "residual", "Deep Residual Learning", "image recognition"],
      notes:
        "arXiv 1512.03385 is 'Deep Residual Learning for Image Recognition' (He et al., 2015), introducing ResNet and residual (skip/shortcut) connections that allow training of very deep networks. Correct recall names ResNet / residual learning.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1512.03385",
      semiOpaque: "https://github.com/KaimingHe/deep-residual-networks",
      opaque: "https://arxiv.org/abs/1512.03385",
      fullContentUrl: "https://arxiv.org/abs/1512.03385",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1512.99999",
  },
  {
    id: "arxiv-bert",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2018-10-11", // 1810.04805, verified via arXiv API
    groundTruth: {
      mustMention: ["BERT", "bidirectional", "pre-training", "Transformers"],
      notes:
        "arXiv 1810.04805 is 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding' (Devlin et al., 2018), introducing masked-language-model pretraining of bidirectional Transformers. Correct recall names BERT.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1810.04805",
      semiOpaque: "https://github.com/google-research/bert",
      opaque: "https://arxiv.org/abs/1810.04805",
      fullContentUrl: "https://arxiv.org/abs/1810.04805",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1810.99999",
  },
  {
    id: "arxiv-gan",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2014-06-10", // 1406.2661, verified via arXiv API
    groundTruth: {
      mustMention: ["Generative Adversarial Networks", "GAN", "generator", "discriminator"],
      notes:
        "arXiv 1406.2661 is 'Generative Adversarial Networks' (Goodfellow et al., 2014), introducing GANs: a generator and discriminator trained adversarially in a minimax game. Correct recall names GANs / generator-discriminator.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1406.2661",
      semiOpaque: "https://github.com/goodfeli/adversarial",
      opaque: "https://arxiv.org/abs/1406.2661",
      fullContentUrl: "https://arxiv.org/abs/1406.2661",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1406.99999",
  },
  {
    id: "arxiv-unet",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2015-05-18", // 1505.04597, verified via arXiv API
    groundTruth: {
      mustMention: ["U-Net", "segmentation", "biomedical", "encoder-decoder"],
      notes:
        "arXiv 1505.04597 is 'U-Net: Convolutional Networks for Biomedical Image Segmentation' (Ronneberger et al., 2015), introducing the U-shaped encoder-decoder with skip connections for segmentation. Correct recall names U-Net / biomedical segmentation.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1505.04597",
      semiOpaque: "https://github.com/milesial/Pytorch-UNet",
      opaque: "https://arxiv.org/abs/1505.04597",
      fullContentUrl: "https://arxiv.org/abs/1505.04597",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1505.99999",
  },
  {
    id: "arxiv-adam",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2014-12-22", // 1412.6980, verified via arXiv API
    groundTruth: {
      mustMention: ["Adam", "stochastic optimization", "adaptive", "moment"],
      notes:
        "arXiv 1412.6980 is 'Adam: A Method for Stochastic Optimization' (Kingma & Ba, 2014), introducing the Adam optimizer using adaptive estimates of first and second moments of the gradients. Correct recall names Adam optimizer.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1412.6980",
      semiOpaque: "https://github.com/pytorch/pytorch",
      opaque: "https://arxiv.org/abs/1412.6980",
      fullContentUrl: "https://arxiv.org/abs/1412.6980",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1412.99999",
  },
  {
    id: "arxiv-vgg",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2014-09-04", // 1409.1556, verified via arXiv API
    groundTruth: {
      mustMention: ["VGG", "Very Deep Convolutional Networks", "3x3", "large-scale"],
      notes:
        "arXiv 1409.1556 is 'Very Deep Convolutional Networks for Large-Scale Image Recognition' (Simonyan & Zisserman, 2014), introducing the VGG networks built from stacks of small 3x3 convolutions. Correct recall names VGG / very deep ConvNets.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1409.1556",
      semiOpaque: "https://github.com/pytorch/vision",
      opaque: "https://arxiv.org/abs/1409.1556",
      fullContentUrl: "https://arxiv.org/abs/1409.1556",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1409.99999",
  },
  {
    id: "arxiv-gpt3",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2020-05-28", // 2005.14165, verified via arXiv API
    groundTruth: {
      mustMention: ["GPT-3", "Few-Shot", "Language Models", "175 billion"],
      notes:
        "arXiv 2005.14165 is 'Language Models are Few-Shot Learners' (Brown et al., 2020), the GPT-3 paper showing a 175B-parameter LM performs tasks via in-context few-shot prompting without fine-tuning. Correct recall names GPT-3 / few-shot in-context learning.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2005.14165",
      semiOpaque: "https://github.com/openai/gpt-3",
      opaque: "https://arxiv.org/abs/2005.14165",
      fullContentUrl: "https://arxiv.org/abs/2005.14165",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2005.99999",
  },
  {
    id: "arxiv-word2vec",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2013-01-16", // 1301.3781, verified via arXiv API
    groundTruth: {
      mustMention: ["word2vec", "word representations", "vector space", "skip-gram"],
      notes:
        "arXiv 1301.3781 is 'Efficient Estimation of Word Representations in Vector Space' (Mikolov et al., 2013), the word2vec paper introducing the CBOW and skip-gram models for learning word embeddings. Correct recall names word2vec / word embeddings.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1301.3781",
      semiOpaque: "https://github.com/tmikolov/word2vec",
      opaque: "https://arxiv.org/abs/1301.3781",
      fullContentUrl: "https://arxiv.org/abs/1301.3781",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1301.99999",
  },
  {
    id: "arxiv-ppo",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2017-07-20", // 1707.06347, verified via arXiv API
    groundTruth: {
      mustMention: ["PPO", "Proximal Policy Optimization", "policy gradient", "clipped"],
      notes:
        "arXiv 1707.06347 is 'Proximal Policy Optimization Algorithms' (Schulman et al., 2017), introducing PPO, a policy-gradient RL method using a clipped surrogate objective. Correct recall names PPO / proximal policy optimization.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1707.06347",
      semiOpaque: "https://github.com/openai/baselines",
      opaque: "https://arxiv.org/abs/1707.06347",
      fullContentUrl: "https://arxiv.org/abs/1707.06347",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1707.99999",
  },
  {
    id: "arxiv-knowledge-distillation",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2015-03-09", // 1503.02531, verified via arXiv API
    groundTruth: {
      mustMention: ["distillation", "Distilling the Knowledge", "soft targets", "teacher"],
      notes:
        "arXiv 1503.02531 is 'Distilling the Knowledge in a Neural Network' (Hinton et al., 2015), introducing knowledge distillation: training a smaller student model on the soft-target outputs (softened logits) of a larger teacher. Correct recall names knowledge distillation / soft targets.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1503.02531",
      semiOpaque: "https://github.com/peterliht/knowledge-distillation-pytorch",
      opaque: "https://arxiv.org/abs/1503.02531",
      fullContentUrl: "https://arxiv.org/abs/1503.02531",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1503.99999",
  },
  {
    id: "arxiv-pate",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2016-10-18", // 1610.05755, verified via arXiv API
    groundTruth: {
      mustMention: ["PATE", "private", "teacher", "differential privacy"],
      notes:
        "arXiv 1610.05755 is 'Semi-supervised Knowledge Transfer for Deep Learning from Private Training Data' (Papernot et al., 2016), introducing PATE (Private Aggregation of Teacher Ensembles) for differentially private training. Correct recall names PATE / private teacher aggregation.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/1610.05755",
      semiOpaque: "https://github.com/tensorflow/privacy",
      opaque: "https://arxiv.org/abs/1610.05755",
      fullContentUrl: "https://arxiv.org/abs/1610.05755",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/1610.99999",
  },
  {
    id: "arxiv-diffusiongemma-transparency",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2026-06-18", // 2606.20560, verified via arXiv API — POST-cutoff
    groundTruth: {
      mustMention: ["DiffusionGemma", "transparency", "reasoning", "latent space"],
      notes:
        "arXiv 2606.20560 is 'How Transparent is DiffusionGemma?' (June 2026), examining reasoning transparency in DiffusionGemma, which performs a larger fraction of its computation in a continuous latent space. Published 2026-06-18, after every current model's cutoff.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2606.20560",
      semiOpaque: "https://arxiv.org/abs/2606.20560",
      opaque: "https://arxiv.org/abs/2606.20560",
      fullContentUrl: "https://arxiv.org/abs/2606.20560",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2606.99999",
  },
  {
    id: "arxiv-lie-algebra-attention",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2026-06-18", // 2606.20547, verified via arXiv API — POST-cutoff
    groundTruth: {
      mustMention: ["Lie", "group element", "attention", "matrix Lie group"],
      notes:
        "arXiv 2606.20547 is 'The Token Is a Group Element: On Lie-Algebra Attention over Matrix Lie Groups' (June 2026), placing each attention token as an element of a matrix Lie group. Published 2026-06-18, after every current model's cutoff.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2606.20547",
      semiOpaque: "https://arxiv.org/abs/2606.20547",
      opaque: "https://arxiv.org/abs/2606.20547",
      fullContentUrl: "https://arxiv.org/abs/2606.20547",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2606.99998",
  },
  {
    id: "arxiv-multitask-bayesian-icl",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the paper at this arXiv id: what is it about and what is its main contribution?",
    contentDate: "2026-06-18", // 2606.20538, verified via arXiv API — POST-cutoff
    groundTruth: {
      mustMention: ["Multi-Task", "Bayesian", "In-Context Learning", "uncertainty"],
      notes:
        "arXiv 2606.20538 is 'Multi-Task Bayesian In-Context Learning' (June 2026), on Bayesian predictive inference for in-context learning across tasks (uncertainty quantification, data efficiency). Published 2026-06-18, after every current model's cutoff.",
    },
    urls: {
      descriptive: "https://arxiv.org/abs/2606.20538",
      semiOpaque: "https://arxiv.org/abs/2606.20538",
      opaque: "https://arxiv.org/abs/2606.20538",
      fullContentUrl: "https://arxiv.org/abs/2606.20538",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://arxiv.org/abs/2606.99997",
  },

  // ---- PMID (PubMed numeric ids, time-monotonic) ----
  {
    id: "pmid-11237011-human-genome",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this PubMed id: what is it about and what is its main finding?",
    contentDate: "2001-02-15", // PMID 11237011, verified via NCBI eutils
    groundTruth: {
      mustMention: ["human genome", "sequencing", "Nature", "draft"],
      notes:
        "PMID 11237011 is 'Initial sequencing and analysis of the human genome' (Nature, Feb 2001), the International Human Genome Sequencing Consortium's draft human genome. Correct recall names the human genome draft sequence.",
    },
    urls: {
      descriptive: "https://pubmed.ncbi.nlm.nih.gov/11237011/",
      semiOpaque:
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=11237011&retmode=json",
      opaque: "https://pubmed.ncbi.nlm.nih.gov/11237011/",
      fullContentUrl: "https://pubmed.ncbi.nlm.nih.gov/11237011/",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://pubmed.ncbi.nlm.nih.gov/99999999991/",
  },
  {
    id: "pmid-7466396-evolution-cooperation",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the paper at this PubMed id: what is it about and what is its main finding?",
    contentDate: "1981-03-27", // PMID 7466396, verified via NCBI eutils
    groundTruth: {
      mustMention: ["evolution of cooperation", "Axelrod", "reciprocity", "Science"],
      notes:
        "PMID 7466396 is 'The evolution of cooperation' (Axelrod & Hamilton, Science, March 1981), on how cooperation can evolve via reciprocity (e.g. tit-for-tat in the iterated prisoner's dilemma). Correct recall names the evolution of cooperation / reciprocity.",
    },
    urls: {
      descriptive: "https://pubmed.ncbi.nlm.nih.gov/7466396/",
      semiOpaque:
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=7466396&retmode=json",
      opaque: "https://pubmed.ncbi.nlm.nih.gov/7466396/",
      fullContentUrl: "https://pubmed.ncbi.nlm.nih.gov/7466396/",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://pubmed.ncbi.nlm.nih.gov/99999999992/",
  },
  {
    id: "pmid-10676951-dlbcl-gene-expression",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall the paper at this PubMed id: what is it about and what is its main finding?",
    contentDate: "2000-02-03", // PMID 10676951, verified via NCBI eutils
    groundTruth: {
      mustMention: ["diffuse large B-cell lymphoma", "gene expression", "profiling", "subtypes"],
      notes:
        "PMID 10676951 is 'Distinct types of diffuse large B-cell lymphoma identified by gene expression profiling' (Alizadeh et al., Nature, Feb 2000), identifying molecular subtypes (germinal-centre vs activated B-cell-like) of DLBCL. Correct recall names DLBCL gene-expression subtypes.",
    },
    urls: {
      descriptive: "https://pubmed.ncbi.nlm.nih.gov/10676951/",
      semiOpaque:
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=10676951&retmode=json",
      opaque: "https://pubmed.ncbi.nlm.nih.gov/10676951/",
      fullContentUrl: "https://pubmed.ncbi.nlm.nih.gov/10676951/",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://pubmed.ncbi.nlm.nih.gov/99999999993/",
  },
  {
    id: "pmid-28778026-deep-learning-medical-survey",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall the paper at this PubMed id: what is it about and what is its main finding?",
    contentDate: "2017-12", // PMID 28778026, verified via NCBI eutils (pubdate 2017 Dec)
    groundTruth: {
      mustMention: ["deep learning", "medical image analysis", "survey", "CNN"],
      notes:
        "PMID 28778026 is 'A survey on deep learning in medical image analysis' (Litjens et al., Medical Image Analysis, Dec 2017), reviewing deep-learning (mainly CNN) methods across medical-imaging tasks. Correct recall names the deep-learning medical-imaging survey.",
    },
    urls: {
      descriptive: "https://pubmed.ncbi.nlm.nih.gov/28778026/",
      semiOpaque:
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=28778026&retmode=json",
      opaque: "https://pubmed.ncbi.nlm.nih.gov/28778026/",
      fullContentUrl: "https://pubmed.ncbi.nlm.nih.gov/28778026/",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://pubmed.ncbi.nlm.nih.gov/99999999994/",
  },
  {
    id: "pmid-25592156-hydrogel-immunoprotection",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the paper at this PubMed id: what is it about and what is its main finding?",
    contentDate: "2015-02-09", // PMID 25592156, verified via NCBI eutils
    groundTruth: {
      mustMention: ["hydrogel", "molecular transport", "cellular immunoprotection", "ultrathin"],
      notes:
        "PMID 25592156 is 'Characterization of molecular transport in ultrathin hydrogel coatings for cellular immunoprotection' (Biomacromolecules, Feb 2015), on transport through thin hydrogel coatings used to immunoprotect encapsulated cells. Correct recall names the ultrathin hydrogel immunoprotection coating study.",
    },
    urls: {
      descriptive: "https://pubmed.ncbi.nlm.nih.gov/25592156/",
      semiOpaque:
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=25592156&retmode=json",
      opaque: "https://pubmed.ncbi.nlm.nih.gov/25592156/",
      fullContentUrl: "https://pubmed.ncbi.nlm.nih.gov/25592156/",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://pubmed.ncbi.nlm.nih.gov/99999999995/",
  },
  {
    id: "pmid-42224782-crispr-echinococcus",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the paper at this PubMed id: what is it about and what is its main finding?",
    contentDate: "2026-05-25", // PMID 42224782, verified via NCBI eutils — POST-cutoff
    groundTruth: {
      mustMention: ["Echinococcus", "CRISPR", "Cas12a", "RPA"],
      notes:
        "PMID 42224782 is 'Rapid multiplex detection of Echinococcus granulosus and Echinococcus multilocularis using a one-pot RPA-assisted CRISPR-Cas12a/Cas13a assay' (Biosens Bioelectron, May 2026). Published 2026-05-25, after every current model's cutoff. Correct recall names the RPA + CRISPR-Cas12a/Cas13a Echinococcus assay.",
    },
    urls: {
      descriptive: "https://pubmed.ncbi.nlm.nih.gov/42224782/",
      semiOpaque:
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=42224782&retmode=json",
      opaque: "https://pubmed.ncbi.nlm.nih.gov/42224782/",
      fullContentUrl: "https://pubmed.ncbi.nlm.nih.gov/42224782/",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://pubmed.ncbi.nlm.nih.gov/99999999996/",
  },

  // ---- RFC (beyond the existing RFC 9110) ----
  {
    id: "rfc-2616-http11",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall what the RFC at this identifier specifies and summarise its scope.",
    contentDate: "1999-05", // RFC 2616 published May 1999 (rfc-editor)
    groundTruth: {
      mustMention: ["HTTP/1.1", "Hypertext Transfer Protocol", "method", "status code"],
      notes:
        "RFC 2616 is 'Hypertext Transfer Protocol -- HTTP/1.1' (June 1999), the long-canonical HTTP/1.1 spec (later obsoleted by RFC 7230-7235 and then RFC 9110/9112). It defines HTTP methods, status codes, headers, and connection handling. Correct recall names HTTP/1.1.",
    },
    urls: {
      descriptive: "https://www.rfc-editor.org/info/rfc2616",
      semiOpaque: "https://github.com/httpwg/http-core",
      opaque: "https://datatracker.ietf.org/doc/rfc2616/",
      fullContentUrl: "https://datatracker.ietf.org/doc/html/rfc2616",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://www.rfc-editor.org/rfc/rfc26161",
  },
  {
    id: "rfc-8259-json",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall what the RFC at this identifier specifies and summarise its scope.",
    contentDate: "2017-12", // RFC 8259 published December 2017 (rfc-editor)
    groundTruth: {
      mustMention: ["JSON", "JavaScript Object Notation", "data interchange", "Internet Standard"],
      notes:
        "RFC 8259 is 'The JavaScript Object Notation (JSON) Data Interchange Format' (Dec 2017), the Internet Standard (STD 90) for JSON, obsoleting RFC 7159. It defines JSON grammar: objects, arrays, numbers, strings, true/false/null. Correct recall names JSON.",
    },
    urls: {
      descriptive: "https://www.rfc-editor.org/info/rfc8259",
      semiOpaque: "https://github.com/json/json-spec",
      opaque: "https://datatracker.ietf.org/doc/rfc8259/",
      fullContentUrl: "https://datatracker.ietf.org/doc/html/rfc8259",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://www.rfc-editor.org/rfc/rfc82591",
  },
  {
    id: "rfc-791-ip",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall what the RFC at this identifier specifies and summarise its scope.",
    contentDate: "1981-09", // RFC 791 published September 1981 (rfc-editor)
    groundTruth: {
      mustMention: ["Internet Protocol", "IPv4", "datagram", "fragmentation"],
      notes:
        "RFC 791 is 'Internet Protocol' (Sept 1981), the foundational IPv4 specification: the IP datagram format, addressing, fragmentation/reassembly, and the connectionless best-effort delivery model. Correct recall names IP / IPv4.",
    },
    urls: {
      descriptive: "https://www.rfc-editor.org/info/rfc791",
      semiOpaque: "https://datatracker.ietf.org/wg/intarea/documents/",
      opaque: "https://datatracker.ietf.org/doc/rfc791/",
      fullContentUrl: "https://datatracker.ietf.org/doc/html/rfc791",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://www.rfc-editor.org/rfc/rfc7911",
  },
  {
    id: "rfc-9114-http3",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall what the RFC at this identifier specifies and summarise its scope.",
    contentDate: "2022-06", // RFC 9114 published June 2022 (rfc-editor)
    groundTruth: {
      mustMention: ["HTTP/3", "QUIC", "Hypertext Transfer Protocol", "UDP"],
      notes:
        "RFC 9114 is 'HTTP/3' (June 2022), mapping HTTP semantics onto the QUIC transport (over UDP), replacing the TCP+TLS+HTTP/2 stack. Correct recall names HTTP/3 over QUIC.",
    },
    urls: {
      descriptive: "https://www.rfc-editor.org/info/rfc9114",
      semiOpaque: "https://github.com/quicwg/base-drafts",
      opaque: "https://datatracker.ietf.org/doc/rfc9114/",
      fullContentUrl: "https://datatracker.ietf.org/doc/html/rfc9114",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://www.rfc-editor.org/rfc/rfc91141",
  },
  {
    id: "rfc-9293-tcp",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall what the RFC at this identifier specifies and summarise its scope.",
    contentDate: "2022-08", // RFC 9293 published August 2022 (rfc-editor)
    groundTruth: {
      mustMention: ["Transmission Control Protocol", "TCP", "three-way handshake", "Internet Standard"],
      notes:
        "RFC 9293 is 'Transmission Control Protocol (TCP)' (Aug 2022), the consolidated/updated TCP specification obsoleting RFC 793 (and updates). It defines reliable, ordered, connection-oriented byte-stream transport, the three-way handshake, and flow/congestion control hooks. Correct recall names TCP.",
    },
    urls: {
      descriptive: "https://www.rfc-editor.org/info/rfc9293",
      semiOpaque: "https://datatracker.ietf.org/wg/tcpm/documents/",
      opaque: "https://datatracker.ietf.org/doc/rfc9293/",
      fullContentUrl: "https://datatracker.ietf.org/doc/html/rfc9293",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://www.rfc-editor.org/rfc/rfc92931",
  },
  {
    id: "rfc-1149-avian-carriers",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall what the RFC at this identifier specifies and summarise its scope.",
    contentDate: "1990-04", // RFC 1149 published 1 April 1990 (rfc-editor)
    groundTruth: {
      mustMention: ["avian carriers", "IP datagrams", "pigeon", "April 1"],
      notes:
        "RFC 1149 is 'A Standard for the Transmission of IP Datagrams on Avian Carriers' (1 April 1990), the joke April Fools RFC specifying IP over carrier pigeons. Correct recall names the avian-carrier (carrier pigeon) IP RFC.",
    },
    urls: {
      descriptive: "https://www.rfc-editor.org/info/rfc1149",
      semiOpaque: "https://datatracker.ietf.org/doc/rfc1149/",
      opaque: "https://datatracker.ietf.org/doc/rfc1149/",
      fullContentUrl: "https://datatracker.ietf.org/doc/html/rfc1149",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://www.rfc-editor.org/rfc/rfc11491",
  },
  {
    id: "rfc-9700-oauth-security-bcp",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall what the RFC at this identifier specifies and summarise its scope.",
    contentDate: "2025-01", // RFC 9700 published January 2025 (rfc-editor)
    groundTruth: {
      mustMention: ["OAuth 2.0", "Best Current Practice", "security", "BCP"],
      notes:
        "RFC 9700 is 'Best Current Practice for OAuth 2.0 Security' (Jan 2025), consolidating current security guidance/threat mitigations for OAuth 2.0 (e.g. PKCE, redirect-URI handling, token leakage). Correct recall names the OAuth 2.0 Security BCP.",
    },
    urls: {
      descriptive: "https://www.rfc-editor.org/info/rfc9700",
      semiOpaque: "https://datatracker.ietf.org/wg/oauth/documents/",
      opaque: "https://datatracker.ietf.org/doc/rfc9700/",
      fullContentUrl: "https://datatracker.ietf.org/doc/html/rfc9700",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://www.rfc-editor.org/rfc/rfc97001",
  },
  {
    id: "rfc-9701-jwt-oauth-introspection",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall what the RFC at this identifier specifies and summarise its scope.",
    contentDate: "2025-01", // RFC 9701 published January 2025 (rfc-editor)
    groundTruth: {
      mustMention: ["JWT", "OAuth", "token introspection", "JSON Web Token"],
      notes:
        "RFC 9701 is 'JSON Web Token (JWT) Response for OAuth Token Introspection' (Jan 2025), defining a JWT-formatted, signed response for the OAuth 2.0 token-introspection endpoint. Correct recall names JWT introspection response for OAuth.",
    },
    urls: {
      descriptive: "https://www.rfc-editor.org/info/rfc9701",
      semiOpaque: "https://datatracker.ietf.org/wg/oauth/documents/",
      opaque: "https://datatracker.ietf.org/doc/rfc9701/",
      fullContentUrl: "https://datatracker.ietf.org/doc/html/rfc9701",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://www.rfc-editor.org/rfc/rfc97011",
  },

  // ---- Stack Overflow (real verified question ids; opaque numeric) ----
  {
    id: "so-11227809-branch-prediction",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the Stack Overflow question at this identifier: what does it ask and what is the accepted explanation?",
    contentDate: "2012-06-27", // SO question 11227809, verified via Stack Exchange API
    groundTruth: {
      mustMention: ["branch prediction", "sorted array", "unsorted", "pipeline"],
      notes:
        "SO question 11227809 is 'Why is processing a sorted array faster than processing an unsorted array?' (2012, score >27k). The accepted answer attributes it to CPU branch prediction: the sorted data makes a branch highly predictable, avoiding pipeline-flush mispredictions. Correct recall names branch prediction / sorted vs unsorted array.",
    },
    urls: {
      descriptive: "https://stackoverflow.com/questions/11227809",
      semiOpaque: "https://api.stackexchange.com/2.3/questions/11227809?site=stackoverflow",
      opaque: "https://stackoverflow.com/questions/11227809",
      fullContentUrl: "https://api.stackexchange.com/2.3/questions/11227809?site=stackoverflow&filter=withbody",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://stackoverflow.com/questions/99999999991",
  },
  {
    id: "so-111102-javascript-closures",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the Stack Overflow question at this identifier: what does it ask and what is the accepted explanation?",
    contentDate: "2008-09-21", // SO question 111102, verified via Stack Exchange API
    groundTruth: {
      mustMention: ["closures", "JavaScript", "scope", "lexical"],
      notes:
        "SO question 111102 is 'How do JavaScript closures work?' (2008, score >7k). The canonical answer explains a closure as a function bundled with references to its surrounding lexical scope, so inner functions retain access to outer variables after the outer function returns. Correct recall names JavaScript closures / lexical scope.",
    },
    urls: {
      descriptive: "https://stackoverflow.com/questions/111102",
      semiOpaque: "https://api.stackexchange.com/2.3/questions/111102?site=stackoverflow",
      opaque: "https://stackoverflow.com/questions/111102",
      fullContentUrl: "https://api.stackexchange.com/2.3/questions/111102?site=stackoverflow&filter=withbody",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://stackoverflow.com/questions/99999999992",
  },
  {
    id: "so-1335851-use-strict",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the Stack Overflow question at this identifier: what does it ask and what is the accepted explanation?",
    contentDate: "2009-08-26", // SO question 1335851, verified via Stack Exchange API
    groundTruth: {
      mustMention: ["use strict", "strict mode", "JavaScript", "ECMAScript 5"],
      notes:
        "SO question 1335851 is 'What does \"use strict\" do in JavaScript, and what is the reasoning behind it?' (2009, score >8k). The answer explains strict mode (ES5): it changes silent errors to throws, forbids some unsafe/deprecated syntax, and disables features. Correct recall names \"use strict\" / strict mode.",
    },
    urls: {
      descriptive: "https://stackoverflow.com/questions/1335851",
      semiOpaque: "https://api.stackexchange.com/2.3/questions/1335851?site=stackoverflow",
      opaque: "https://stackoverflow.com/questions/1335851",
      fullContentUrl: "https://api.stackexchange.com/2.3/questions/1335851?site=stackoverflow&filter=withbody",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://stackoverflow.com/questions/99999999993",
  },
  {
    id: "so-503093-redirect-webpage",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall the Stack Overflow question at this identifier: what does it ask and what is the accepted explanation?",
    contentDate: "2009-02-02", // SO question 503093, verified via Stack Exchange API
    groundTruth: {
      mustMention: ["redirect", "window.location", "JavaScript", "another webpage"],
      notes:
        "SO question 503093 is 'How do I redirect to another webpage?' (2009, score >7k). The accepted answer uses window.location.href / window.location.replace / window.location.assign to navigate. Correct recall names client-side redirect via window.location.",
    },
    urls: {
      descriptive: "https://stackoverflow.com/questions/503093",
      semiOpaque: "https://api.stackexchange.com/2.3/questions/503093?site=stackoverflow",
      opaque: "https://stackoverflow.com/questions/503093",
      fullContentUrl: "https://api.stackexchange.com/2.3/questions/503093?site=stackoverflow&filter=withbody",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://stackoverflow.com/questions/99999999994",
  },
  {
    id: "so-178325-jquery-element-hidden",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall the Stack Overflow question at this identifier: what does it ask and what is the accepted explanation?",
    contentDate: "2008-10-07", // SO question 178325, verified via Stack Exchange API
    groundTruth: {
      mustMention: ["jQuery", "hidden", ":visible", "is("],
      notes:
        "SO question 178325 is 'How do I check if an element is hidden in jQuery?' (2008, score >8k). The accepted answer uses the jQuery :visible / :hidden selectors, e.g. $(el).is(':visible'). Correct recall names jQuery :visible/:hidden / .is(':visible').",
    },
    urls: {
      descriptive: "https://stackoverflow.com/questions/178325",
      semiOpaque: "https://api.stackexchange.com/2.3/questions/178325?site=stackoverflow",
      opaque: "https://stackoverflow.com/questions/178325",
      fullContentUrl: "https://api.stackexchange.com/2.3/questions/178325?site=stackoverflow&filter=withbody",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://stackoverflow.com/questions/99999999995",
  },
  {
    id: "so-78084814-coredump-file-mapping",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the Stack Overflow question at this identifier: what does it ask?",
    contentDate: "2024-02-29", // SO question 78084814, verified via Stack Exchange API (score 1)
    groundTruth: {
      mustMention: ["core dump", "file-backed mapping", "GDB", "path"],
      notes:
        "SO question 78084814 is 'How can I set the path of a file-backed mapping for a core dump in GDB?' (Feb 2024, low score; tags debugging/gdb/coredump/cross-compiling). An obscure GDB core-dump file-mapping path question. Correct recall names the GDB core-dump file-backed mapping path question.",
    },
    urls: {
      descriptive: "https://stackoverflow.com/questions/78084814",
      semiOpaque: "https://api.stackexchange.com/2.3/questions/78084814?site=stackoverflow",
      opaque: "https://stackoverflow.com/questions/78084814",
      fullContentUrl: "https://api.stackexchange.com/2.3/questions/78084814?site=stackoverflow&filter=withbody",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://stackoverflow.com/questions/99999999996",
  },
  {
    id: "so-79886234-java25-file-exists",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the Stack Overflow question at this identifier: what does it ask?",
    contentDate: "2026-02-10", // SO question 79886234, verified via Stack Exchange API — POST-cutoff
    groundTruth: {
      mustMention: ["Java 25", "File.exists", "empty string", "true"],
      notes:
        "SO question 79886234 is 'Why does Java 25's File.exists() method return true for an empty string while File.exists() in prior Java versions returned false?' (Feb 2026; tags java/file-io/java-25). Created 2026-02-10, after every current model's cutoff. Correct recall names the Java 25 File.exists() empty-string behaviour-change question.",
    },
    urls: {
      descriptive: "https://stackoverflow.com/questions/79886234",
      semiOpaque: "https://api.stackexchange.com/2.3/questions/79886234?site=stackoverflow",
      opaque: "https://stackoverflow.com/questions/79886234",
      fullContentUrl: "https://api.stackexchange.com/2.3/questions/79886234?site=stackoverflow&filter=withbody",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://stackoverflow.com/questions/99999999997",
  },
  {
    id: "so-79890462-reinterpret-cast-structs",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the Stack Overflow question at this identifier: what does it ask?",
    contentDate: "2026-02-16", // SO question 79890462, verified via Stack Exchange API — POST-cutoff
    groundTruth: {
      mustMention: ["reinterpret_cast", "structs", "same layout", "type-punning"],
      notes:
        "SO question 79890462 is '`reinterpret_cast` between unrelated structs with the same layout' (Feb 2026; tags c++/reinterpret-cast/type-punning). Created 2026-02-16, after every current model's cutoff. Correct recall names the C++ reinterpret_cast same-layout / type-punning question.",
    },
    urls: {
      descriptive: "https://stackoverflow.com/questions/79890462",
      semiOpaque: "https://api.stackexchange.com/2.3/questions/79890462?site=stackoverflow",
      opaque: "https://stackoverflow.com/questions/79890462",
      fullContentUrl: "https://api.stackexchange.com/2.3/questions/79890462?site=stackoverflow&filter=withbody",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://stackoverflow.com/questions/99999999998",
  },

  // ---- DOI (CrossRef / bioRxiv) ----
  {
    id: "doi-alphafold-nature",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the work at this DOI: what is it about and what is its main contribution?",
    contentDate: "2021-07-15", // DOI 10.1038/s41586-021-03819-2, verified via CrossRef
    groundTruth: {
      mustMention: ["AlphaFold", "protein structure prediction", "Nature", "DeepMind"],
      notes:
        "DOI 10.1038/s41586-021-03819-2 is 'Highly accurate protein structure prediction with AlphaFold' (Jumper et al., Nature, July 2021), the AlphaFold2 method. Correct recall names AlphaFold / protein structure prediction.",
    },
    urls: {
      descriptive: "https://doi.org/10.1038/s41586-021-03819-2",
      semiOpaque: "https://api.crossref.org/works/10.1038/s41586-021-03819-2",
      opaque: "https://doi.org/10.1038/s41586-021-03819-2",
      fullContentUrl: "https://www.nature.com/articles/s41586-021-03819-2",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://doi.org/10.1038/s41586-021-99999-9",
  },
  {
    id: "doi-human-genome-science",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the work at this DOI: what is it about and what is its main contribution?",
    contentDate: "2001-02-16", // DOI 10.1126/science.1058040, verified via CrossRef
    groundTruth: {
      mustMention: ["human genome", "sequence", "Science", "Celera"],
      notes:
        "DOI 10.1126/science.1058040 is 'The Sequence of the Human Genome' (Venter et al., Science, Feb 2001), the Celera draft human genome sequence (the companion to the public consortium's Nature paper). Correct recall names the human genome sequence (Celera / Science 2001).",
    },
    urls: {
      descriptive: "https://doi.org/10.1126/science.1058040",
      semiOpaque: "https://api.crossref.org/works/10.1126/science.1058040",
      opaque: "https://doi.org/10.1126/science.1058040",
      fullContentUrl: "https://www.science.org/doi/10.1126/science.1058040",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://doi.org/10.1126/science.99999999",
  },
  {
    id: "doi-deep-learning-nature-review",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the work at this DOI: what is it about and what is its main contribution?",
    contentDate: "2015-05-27", // DOI 10.1038/nature14539, verified via CrossRef
    groundTruth: {
      mustMention: ["deep learning", "Nature", "LeCun", "review"],
      notes:
        "DOI 10.1038/nature14539 is 'Deep learning' (LeCun, Bengio & Hinton, Nature, May 2015), the canonical Nature review of deep learning (representation learning, backprop, CNNs, RNNs). Correct recall names the LeCun/Bengio/Hinton deep-learning Nature review.",
    },
    urls: {
      descriptive: "https://doi.org/10.1038/nature14539",
      semiOpaque: "https://api.crossref.org/works/10.1038/nature14539",
      opaque: "https://doi.org/10.1038/nature14539",
      fullContentUrl: "https://www.nature.com/articles/nature14539",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://doi.org/10.1038/nature99999",
  },
  {
    id: "doi-optuna-kdd",
    kind: "recall",
    popularity: "moderate",
    target:
      "Recall the work at this DOI: what is it about and what is its main contribution?",
    contentDate: "2019-07-25", // DOI 10.1145/3292500.3330701, verified via CrossRef
    groundTruth: {
      mustMention: ["Optuna", "hyperparameter optimization", "KDD", "framework"],
      notes:
        "DOI 10.1145/3292500.3330701 is 'Optuna: A Next-generation Hyperparameter Optimization Framework' (Akiba et al., KDD 2019), introducing the Optuna define-by-run hyperparameter-optimization framework. Correct recall names Optuna / hyperparameter optimization.",
    },
    urls: {
      descriptive: "https://doi.org/10.1145/3292500.3330701",
      semiOpaque: "https://api.crossref.org/works/10.1145/3292500.3330701",
      opaque: "https://doi.org/10.1145/3292500.3330701",
      fullContentUrl: "https://dl.acm.org/doi/10.1145/3292500.3330701",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://doi.org/10.1145/3292500.9999999",
  },
  {
    id: "doi-corn-seed-traits-pricing",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the work at this DOI: what is it about and what is its main contribution?",
    contentDate: "2010-07-19", // DOI 10.1093/ajae/aaq063, verified via CrossRef
    groundTruth: {
      mustMention: ["corn seed", "traits", "pricing", "agricultural economics"],
      notes:
        "DOI 10.1093/ajae/aaq063 is 'An Analysis of the Pricing of Traits in the U.S. Corn Seed Market' (American Journal of Agricultural Economics, 2010), a hedonic analysis of how genetic/biotech traits are priced in U.S. corn seed. Correct recall names the U.S. corn-seed trait pricing study.",
    },
    urls: {
      descriptive: "https://doi.org/10.1093/ajae/aaq063",
      semiOpaque: "https://api.crossref.org/works/10.1093/ajae/aaq063",
      opaque: "https://doi.org/10.1093/ajae/aaq063",
      fullContentUrl: "https://academic.oup.com/ajae/article-abstract/93/1/151/52924",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://doi.org/10.1093/ajae/aaq999",
  },
  {
    id: "doi-biorxiv-endomesoderm-grn",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the work at this DOI: what is it about and what is its main contribution?",
    contentDate: "2026-04-01", // DOI 10.64898/2026.03.31.715602, verified via CrossRef — POST-cutoff
    groundTruth: {
      mustMention: ["gene regulatory network", "endomesoderm", "bioRxiv", "evolutionary"],
      notes:
        "DOI 10.64898/2026.03.31.715602 is a bioRxiv preprint, 'Evolutionary rewiring of an ancient gene regulatory network specifies the endomesoderm' (posted 2026-04-01), on rewiring of the endomesoderm gene regulatory network. Posted after every current model's cutoff. Correct recall names the endomesoderm gene-regulatory-network rewiring preprint.",
    },
    urls: {
      descriptive: "https://doi.org/10.64898/2026.03.31.715602",
      semiOpaque: "https://api.crossref.org/works/10.64898/2026.03.31.715602",
      opaque: "https://doi.org/10.64898/2026.03.31.715602",
      fullContentUrl: "https://www.biorxiv.org/content/10.64898/2026.03.31.715602",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://doi.org/10.64898/2026.03.31.999999",
  },

  // ---- GitHub commit SHA (the guaranteed-NOT-memorised-by-SHA negative) ----
  // A 40-hex SHA names nothing; even when the commit is historically famous, the
  // SHA string itself is not a memorised key. These probe whether url-only can
  // decode an opaque hash to its content (expected ~0).
  {
    id: "gh-sha-linux-initial-git",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the git commit at this identifier (owner/repo + SHA): what change does it contain?",
    contentDate: "2005-04-16", // verified via GitHub API (commit 1da177e..., torvalds/linux)
    groundTruth: {
      mustMention: ["Linux", "2.6.12-rc2", "initial", "kernel"],
      notes:
        "Commit 1da177e4c3f41524e886b7f1b8a0c1fc7321cac2 in torvalds/linux is 'Linux-2.6.12-rc2' — the initial git import of the Linux kernel tree (April 2005), the root commit of the kernel's git history. Correct recall names the initial Linux kernel git import (2.6.12-rc2).",
    },
    urls: {
      descriptive:
        "https://github.com/torvalds/linux/commit/1da177e4c3f41524e886b7f1b8a0c1fc7321cac2",
      semiOpaque:
        "https://api.github.com/repos/torvalds/linux/commits/1da177e4c3f41524e886b7f1b8a0c1fc7321cac2",
      opaque:
        "https://github.com/torvalds/linux/commit/1da177e4c3f41524e886b7f1b8a0c1fc7321cac2",
      fullContentUrl:
        "https://api.github.com/repos/torvalds/linux/commits/1da177e4c3f41524e886b7f1b8a0c1fc7321cac2",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://github.com/torvalds/linux/commit/0000000000000000000000000000000000000000",
  },
  {
    id: "gh-sha-git-initial-commit",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the git commit at this identifier (owner/repo + SHA): what change does it contain?",
    contentDate: "2005-04-07", // verified via GitHub API (commit e83c516..., git/git)
    groundTruth: {
      mustMention: ["git", "information manager from hell", "initial revision", "Torvalds"],
      notes:
        "Commit e83c5163316f89bfbde7d9ab23ca2e25604af290 in git/git is 'Initial revision of \"git\", the information manager from hell' (Torvalds, April 2005) — the very first commit of git itself. Correct recall names git's initial 'information manager from hell' commit.",
    },
    urls: {
      descriptive:
        "https://github.com/git/git/commit/e83c5163316f89bfbde7d9ab23ca2e25604af290",
      semiOpaque:
        "https://api.github.com/repos/git/git/commits/e83c5163316f89bfbde7d9ab23ca2e25604af290",
      opaque:
        "https://github.com/git/git/commit/e83c5163316f89bfbde7d9ab23ca2e25604af290",
      fullContentUrl:
        "https://api.github.com/repos/git/git/commits/e83c5163316f89bfbde7d9ab23ca2e25604af290",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://github.com/git/git/commit/1111111111111111111111111111111111111111",
  },
  {
    id: "gh-sha-bitcoin-first-commit",
    kind: "recall",
    popularity: "famous",
    target:
      "Recall the git commit at this identifier (owner/repo + SHA): what change does it contain?",
    contentDate: "2009-08-30", // verified via GitHub API (commit 4405b78..., bitcoin/bitcoin)
    groundTruth: {
      mustMention: ["Bitcoin", "First commit", "Satoshi", "initial"],
      notes:
        "Commit 4405b78d6059e536c36974088a8ed4d9f0f29898 in bitcoin/bitcoin is 'First commit' (Aug 2009) — the initial commit of the Bitcoin reference client (by Satoshi Nakamoto). Correct recall names the initial Bitcoin source commit.",
    },
    urls: {
      descriptive:
        "https://github.com/bitcoin/bitcoin/commit/4405b78d6059e536c36974088a8ed4d9f0f29898",
      semiOpaque:
        "https://api.github.com/repos/bitcoin/bitcoin/commits/4405b78d6059e536c36974088a8ed4d9f0f29898",
      opaque:
        "https://github.com/bitcoin/bitcoin/commit/4405b78d6059e536c36974088a8ed4d9f0f29898",
      fullContentUrl:
        "https://api.github.com/repos/bitcoin/bitcoin/commits/4405b78d6059e536c36974088a8ed4d9f0f29898",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://github.com/bitcoin/bitcoin/commit/2222222222222222222222222222222222222222",
  },

  // ---- Hugging Face model ids (semi-descriptive, clean post-cutoff) ----
  {
    id: "hf-gemma-4-26b-a4b-it",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the model at this Hugging Face id: what model is it, who released it, and what are its key facts?",
    contentDate: "2026-03-11", // HF model created 2026-03-11, verified via HF API — POST-cutoff
    groundTruth: {
      mustMention: ["Gemma 4", "Google", "instruction-tuned", "mixture-of-experts"],
      notes:
        "google/gemma-4-26B-A4B-it is a Google Gemma 4 instruction-tuned model (a 26B mixture-of-experts with ~4B active params, image-text-to-text). Created on Hugging Face 2026-03-11, after every current model's cutoff. Correct recall names Gemma 4 (Google) instruction-tuned MoE.",
    },
    urls: {
      descriptive: "https://huggingface.co/google/gemma-4-26B-A4B-it",
      semiOpaque: "https://huggingface.co/api/models/google/gemma-4-26B-A4B-it",
      opaque: "https://huggingface.co/google/gemma-4-26B-A4B-it",
      fullContentUrl: "https://huggingface.co/google/gemma-4-26B-A4B-it",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://huggingface.co/google/gemma-4-26B-A4B-nonexistent",
  },
  {
    id: "hf-qwen3-5-4b",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the model at this Hugging Face id: what model is it, who released it, and what are its key facts?",
    contentDate: "2026-02-27", // HF model created 2026-02-27, verified via HF API — POST-cutoff
    groundTruth: {
      mustMention: ["Qwen3.5", "Qwen", "Alibaba", "4B"],
      notes:
        "Qwen/Qwen3.5-4B is a ~4B-parameter model in Alibaba's Qwen3.5 family (image-text-to-text). Created on Hugging Face 2026-02-27, after every current model's cutoff. Correct recall names Qwen3.5 (Alibaba/Qwen) 4B.",
    },
    urls: {
      descriptive: "https://huggingface.co/Qwen/Qwen3.5-4B",
      semiOpaque: "https://huggingface.co/api/models/Qwen/Qwen3.5-4B",
      opaque: "https://huggingface.co/Qwen/Qwen3.5-4B",
      fullContentUrl: "https://huggingface.co/Qwen/Qwen3.5-4B",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://huggingface.co/Qwen/Qwen3.5-4B-nonexistent",
  },
  {
    id: "hf-qwen3-6-27b",
    kind: "recall",
    popularity: "obscure",
    target:
      "Recall the model at this Hugging Face id: what model is it, who released it, and what are its key facts?",
    contentDate: "2026-04-21", // HF model created 2026-04-21, verified via HF API — POST-cutoff
    groundTruth: {
      mustMention: ["Qwen3.6", "Qwen", "Alibaba", "27B"],
      notes:
        "Qwen/Qwen3.6-27B is a ~27B-parameter model in Alibaba's Qwen3.6 family (image-text-to-text). Created on Hugging Face 2026-04-21, after every current model's cutoff. Correct recall names Qwen3.6 (Alibaba/Qwen) 27B.",
    },
    urls: {
      descriptive: "https://huggingface.co/Qwen/Qwen3.6-27B",
      semiOpaque: "https://huggingface.co/api/models/Qwen/Qwen3.6-27B",
      opaque: "https://huggingface.co/Qwen/Qwen3.6-27B",
      fullContentUrl: "https://huggingface.co/Qwen/Qwen3.6-27B",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://huggingface.co/Qwen/Qwen3.6-27B-nonexistent",
  },
];

// Descriptive-title baseline for `recall` items.
//
// A recall task's only pointer is its opaque id (arXiv number, CVE id, SHA, …),
// so name-only/name-framed have no coherent description UNLESS we give the work's
// human NAME. This map provides that descriptive identifier — the title / common
// name a person would use — WITHOUT the opaque number. It is the proper baseline
// the opaque-id treatment is measured against: if the model can't produce the
// content even when NAMED (obscure / post-cutoff), then url-only failing is mere
// ignorance, not an opaque-decoding failure; if NAMING works but the bare id does
// not, that is the pure "can't decode the opaque pointer" signal.
//
// Authored from each item's groundTruth.notes (real identities, not invented).
export const DESCRIPTIVE_NAMES = {
  "rfc-9110-http-semantics": "the IETF 'HTTP Semantics' specification",
  "arxiv-attention":
    "the paper 'Attention Is All You Need' (Vaswani et al., 2017)",
  "arxiv-mamba":
    "the paper 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces' (Gu & Dao, 2023)",
  "arxiv-deepseek-r1": "the DeepSeek-R1 technical report (Jan 2025)",
  "arxiv-gemma-3": "the 'Gemma 3 Technical Report' (Google DeepMind, Mar 2025)",
  "arxiv-kimi-k2": "the paper 'Kimi K2: Open Agentic Intelligence' (Moonshot AI, Jul 2025)",
  "arxiv-gpt5-system-card": "the 'OpenAI GPT-5 System Card'",
  "baseline-has-status":
    "the Baseline / cross-browser support status of the CSS :has() selector",
  "cve-2014-0160-heartbleed": "the Heartbleed OpenSSL vulnerability",
  "cve-2021-44228-log4shell": "the Log4Shell Apache Log4j2 vulnerability",
  "cve-2024-3094-xz-backdoor": "the xz/liblzma supply-chain backdoor (2024)",
  "cve-2017-0144-eternalblue": "the EternalBlue SMBv1 vulnerability",
  "cve-2019-0708-bluekeep": "the BlueKeep Windows RDP vulnerability",
  "cve-2018-7600-drupalgeddon2": "the Drupalgeddon2 Drupal remote-code-execution vulnerability",
  "cve-2026-25000-wheel-of-life":
    "the Broken Access Control vulnerability in the WordPress 'Wheel of Life' plugin (Kraft Plugins)",
  "cve-2026-3000-idexpert-rce":
    "the remote-code-execution vulnerability in the IDExpert Windows Logon Agent (Changing)",
  "arxiv-resnet":
    "the paper 'Deep Residual Learning for Image Recognition' (ResNet; He et al., 2015)",
  "arxiv-bert":
    "the paper 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding' (Devlin et al., 2018)",
  "arxiv-gan": "the paper 'Generative Adversarial Networks' (Goodfellow et al., 2014)",
  "arxiv-unet":
    "the paper 'U-Net: Convolutional Networks for Biomedical Image Segmentation' (Ronneberger et al., 2015)",
  "arxiv-adam":
    "the paper 'Adam: A Method for Stochastic Optimization' (Kingma & Ba, 2014)",
  "arxiv-vgg":
    "the paper 'Very Deep Convolutional Networks for Large-Scale Image Recognition' (VGG; Simonyan & Zisserman, 2014)",
  "arxiv-gpt3":
    "the paper 'Language Models are Few-Shot Learners' (GPT-3; Brown et al., 2020)",
  "arxiv-word2vec":
    "the paper 'Efficient Estimation of Word Representations in Vector Space' (word2vec; Mikolov et al., 2013)",
  "arxiv-ppo":
    "the paper 'Proximal Policy Optimization Algorithms' (Schulman et al., 2017)",
  "arxiv-knowledge-distillation":
    "the paper 'Distilling the Knowledge in a Neural Network' (Hinton et al., 2015)",
  "arxiv-pate":
    "the paper 'Semi-supervised Knowledge Transfer for Deep Learning from Private Training Data' (PATE; Papernot et al., 2016)",
  "arxiv-diffusiongemma-transparency":
    "the paper 'How Transparent is DiffusionGemma?' (June 2026)",
  "arxiv-lie-algebra-attention":
    "the paper 'The Token Is a Group Element: On Lie-Algebra Attention over Matrix Lie Groups' (June 2026)",
  "arxiv-multitask-bayesian-icl":
    "the paper 'Multi-Task Bayesian In-Context Learning' (June 2026)",
  "pmid-11237011-human-genome":
    "the paper 'Initial sequencing and analysis of the human genome' (Nature, 2001)",
  "pmid-7466396-evolution-cooperation":
    "the paper 'The evolution of cooperation' (Axelrod & Hamilton, Science, 1981)",
  "pmid-10676951-dlbcl-gene-expression":
    "the paper 'Distinct types of diffuse large B-cell lymphoma identified by gene expression profiling' (Alizadeh et al., Nature, 2000)",
  "pmid-28778026-deep-learning-medical-survey":
    "the paper 'A survey on deep learning in medical image analysis' (Litjens et al., 2017)",
  "pmid-25592156-hydrogel-immunoprotection":
    "the paper 'Characterization of molecular transport in ultrathin hydrogel coatings for cellular immunoprotection' (Biomacromolecules, 2015)",
  "pmid-42224782-crispr-echinococcus":
    "the paper on rapid multiplex detection of Echinococcus granulosus and multilocularis using one-pot RPA-assisted CRISPR-Cas12a/Cas13a (2026)",
  "rfc-2616-http11": "the IETF 'HTTP/1.1' specification (the long-canonical HTTP/1.1 RFC)",
  "rfc-8259-json": "the IETF 'JavaScript Object Notation (JSON) Data Interchange Format' standard",
  "rfc-791-ip": "the IETF 'Internet Protocol' (IPv4) specification",
  "rfc-9114-http3": "the IETF 'HTTP/3' specification",
  "rfc-9293-tcp": "the IETF 'Transmission Control Protocol (TCP)' specification (the consolidated TCP RFC)",
  "rfc-1149-avian-carriers":
    "the April Fools' RFC 'A Standard for the Transmission of IP Datagrams on Avian Carriers'",
  "rfc-9700-oauth-security-bcp":
    "the IETF 'Best Current Practice for OAuth 2.0 Security' document",
  "rfc-9701-jwt-oauth-introspection":
    "the IETF 'JSON Web Token (JWT) Response for OAuth Token Introspection' specification",
  "so-11227809-branch-prediction":
    "the Stack Overflow question 'Why is processing a sorted array faster than processing an unsorted array?'",
  "so-111102-javascript-closures":
    "the Stack Overflow question 'How do JavaScript closures work?'",
  "so-1335851-use-strict":
    "the Stack Overflow question 'What does \"use strict\" do in JavaScript, and what is the reasoning behind it?'",
  "so-503093-redirect-webpage":
    "the Stack Overflow question 'How do I redirect to another webpage?'",
  "so-178325-jquery-element-hidden":
    "the Stack Overflow question 'How do I check if an element is hidden in jQuery?'",
  "so-78084814-coredump-file-mapping":
    "the Stack Overflow question 'How can I set the path of a file-backed mapping for a core dump in GDB?'",
  "so-79886234-java25-file-exists":
    "the Stack Overflow question \"Why does Java 25's File.exists() return true for an empty string?\"",
  "so-79890462-reinterpret-cast-structs":
    "the Stack Overflow question 'reinterpret_cast between unrelated structs with the same layout'",
  "doi-alphafold-nature":
    "the paper 'Highly accurate protein structure prediction with AlphaFold' (Jumper et al., Nature, 2021)",
  "doi-human-genome-science":
    "the paper 'The Sequence of the Human Genome' (Venter et al., Science, 2001)",
  "doi-deep-learning-nature-review":
    "the Nature review 'Deep learning' (LeCun, Bengio & Hinton, 2015)",
  "doi-optuna-kdd":
    "the paper 'Optuna: A Next-generation Hyperparameter Optimization Framework' (Akiba et al., KDD 2019)",
  "doi-corn-seed-traits-pricing":
    "the paper 'An Analysis of the Pricing of Traits in the U.S. Corn Seed Market' (Am. J. Agricultural Economics, 2010)",
  "doi-biorxiv-endomesoderm-grn":
    "the bioRxiv preprint 'Evolutionary rewiring of an ancient gene regulatory network specifies the endomesoderm' (2026)",
  "gh-sha-linux-initial-git":
    "the initial git import of the Linux kernel tree (Linux-2.6.12-rc2, April 2005)",
  "gh-sha-git-initial-commit":
    "the initial commit of Git ('Initial revision of git, the information manager from hell', Torvalds, 2005)",
  "gh-sha-bitcoin-first-commit":
    "the first commit of the Bitcoin reference client (2009)",
  "hf-gemma-4-26b-a4b-it":
    "the Google Gemma 4 26B (A4B) instruction-tuned model",
  "hf-qwen3-5-4b": "Alibaba's Qwen3.5-4B model",
  "hf-qwen3-6-27b": "Alibaba's Qwen3.6-27B model",
};

// Default pilot selection: a cheaper subset that still spans the cutoff
// boundaries. The FULL run (no --pilot) uses the whole corpus, which is what
// the report is built from.
export const PILOT_ITEM_IDS = [
  "view-transitions", // code, pre-cutoff (all)
  "rfc-9110-http-semantics", // recall, pre-cutoff (all)
  "arxiv-deepseek-r1", // recall, post-Gemini / GPT-5, pre-Claude
  "arxiv-kimi-k2", // recall, Jul-2025 boundary across Claude family
  "arxiv-gpt5-system-card", // recall, Dec-2025 boundary (post GPT-5.5)
  "scroll-triggered-animations", // code, post-cutoff for ALL flagships
];

export function corpusFor(ids) {
  if (!ids) return CORPUS;
  return CORPUS.filter((it) => ids.includes(it.id));
}
