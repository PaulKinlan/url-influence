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
    contentDate: "2024-04", // popover shipped Chrome 114 (2023) and broadly 2024; pre-cutoff for all
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
    fakeUrl: "https://arxiv.org/abs/2503.00003",
  },
  {
    id: "customizable-select",
    kind: "code",
    target:
      "Write HTML/CSS for a customizable <select> element (appearance: base-select, the ::picker(select) pseudo-element, and <selectedcontent>).",
    // Shipped Chrome 134 (2025-03-04). Post Gemini/GPT-5; pre Claude flagships.
    contentDate: "2025-03",
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
      opaque: "https://stackoverflow.com/questions/79501234",
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
    fakeUrl: "https://arxiv.org/abs/2507.00007",
  },

  // ---- 2025-08..2025-12 window: only the very latest flagships know ----
  {
    id: "element-scoped-view-transitions",
    kind: "code",
    target:
      "Write JavaScript/CSS using element-scoped View Transitions (calling startViewTransition() on an element rather than document) to animate just one component.",
    // Shipped Chrome 140 (2025-09-02). Post Opus 4.6 / GPT-5.2 (Aug 2025);
    // pre GPT-5.5 (Dec 2025) and the Jan-2026 Claude flagships.
    contentDate: "2025-09",
    groundTruth: {
      mustMention: ["startViewTransition", "view-transition-name", "element"],
      notes:
        "Element-scoped view transitions let you call element.startViewTransition() (not just document.startViewTransition()) so the snapshot/animation is scoped to that element's subtree. Pairs with view-transition-name. Shipped Chrome 140, Sept 2025.",
    },
    urls: {
      descriptive:
        "https://developer.chrome.com/blog/element-scoped-view-transitions",
      semiOpaque: "https://github.com/WICG/view-transitions",
      opaque: "https://stackoverflow.com/questions/79612345",
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
    fakeUrl: "https://arxiv.org/abs/2601.00009",
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
      opaque: "https://stackoverflow.com/questions/79912345",
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
    contentDate: "2025-05", // global LanguageModel shape stabilised ~mid 2025 (Chrome 138)
    groundTruth: {
      mustMention: ["LanguageModel", "create", "prompt", "availability"],
      notes:
        "The CURRENT Chrome Prompt API uses the global LanguageModel object: await LanguageModel.availability(), then const session = await LanguageModel.create({...}); const out = await session.prompt('...') (or session.promptStreaming). The OLD (2024) shape used window.ai.* / window.ai.createTextSession() / window.ai.assistant - generating THAT is the stale-knowledge failure. Score the new LanguageModel global as correct; flag window.ai.* as the wrong/stale surface.",
    },
    urls: {
      descriptive: "https://developer.chrome.com/docs/ai/prompt-api",
      semiOpaque: "https://github.com/webmachinelearning/prompt-api",
      opaque: "https://chromestatus.com/feature/5134603979063296",
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
      opaque: "https://stackoverflow.com/questions/74619456",
      fullContentUrl:
        "https://developer.mozilla.org/en-US/docs/Web/API/FedCM_API",
      randomUrl: RANDOM_URL,
    },
    fakeUrl:
      "https://developer.mozilla.org/en-US/docs/Web/API/FederatedCredential_API",
  },
  // Baseline status recall: tests whether the model reports the CURRENT Baseline
  // status of a feature or a STALE one (the model-gap "stale Baseline" thesis).
  // :has() became Baseline Newly available 2023-12-21 (Firefox 121 completed
  // support) and reaches Baseline Widely available 30 months later (~2026-06).
  // Models cut in 2025 typically report it as "Newly available"/"limited" -
  // wrong as of mid-2026.
  {
    id: "baseline-has-status",
    kind: "recall",
    target:
      "State the Baseline status of the CSS :has() selector: when it became Baseline Newly available and whether it is now Baseline Widely available.",
    contentDate: "2026-06", // the "Widely available" milestone post-dates all cutoffs
    groundTruth: {
      mustMention: ["Baseline", "Widely available", "2023"],
      notes:
        ":has() reached Baseline 'Newly available' on 2023-12-21 (Firefox 121 completed cross-browser support) and becomes Baseline 'Widely available' 30 months later, ~2026-06. A correct CURRENT answer (mid-2026) says it is now Widely available, citing the 2023-12 newly-available date. Reporting it as still 'Newly available' / 'limited availability' / not-Baseline is the stale-Baseline failure this item targets.",
    },
    urls: {
      descriptive: "https://developer.mozilla.org/en-US/docs/Web/CSS/:has",
      semiOpaque: "https://github.com/web-platform-dx/web-features",
      opaque: "https://caniuse.com/css-has",
      fullContentUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/:has",
      randomUrl: RANDOM_URL,
    },
    fakeUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/:contains",
  },
];

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
