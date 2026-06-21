// Shared client-render / framework signatures, used by the shell survey
// (cc-shell-confirm.mjs) and the slice-by-site checker (cc-warc-fetch.mjs).
//
// `client: true` means the framework typically renders content in the browser,
// so finding one on a 200 text/html page with almost no visible text is strong
// evidence of a JS shell. jQuery and Bootstrap are `client: false`: they are
// common on perfectly server-rendered pages, so they are tracked but NOT counted
// as shells on their own. jQuery is additionally checked for an onload/ready
// handler (a page that builds its DOM in $(document).ready is effectively a shell
// to a non-rendering crawler).
//
// Detection is from raw HTML only, so it is imperfect: a pure client-side React
// app that ships just <div id="root"></div> and an opaque bundle is hard to
// attribute. Those land in the generic "unattributed" shell bucket.

export const FRAMEWORKS = [
  { name: "next", client: true, sig: [/__NEXT_DATA__/, /\/_next\/static\//, /id=["']__next["']/] },
  { name: "nuxt", client: true, sig: [/window\.__NUXT__/, /\/_nuxt\//, /__nuxt/] },
  { name: "react", client: true, sig: [/data-reactroot/i, /data-reactid/i, /react-dom(\.|@|\/)/i, /\breact(\.min)?\.js/i, /__REACT_DEVTOOLS/] },
  { name: "preact", client: true, sig: [/preact(@|\/|\.min)/i, /_preact/] },
  { name: "angular", client: true, sig: [/ng-version=/i, /<app-root/i, /_ngcontent-/i, /_nghost-/i] },
  { name: "angularjs", client: true, sig: [/\bng-app[=\s">]/i, /\bng-controller\b/i, /\bng-bind\b/i, /\bng-repeat\b/i, /angular(\.min)?\.js/i] },
  { name: "vue", client: true, sig: [/data-v-[0-9a-f]{6,}/i, /__VUE__/, /\bvue(\.min|@|\/runtime)/i, /\bv-cloak\b/i] },
  { name: "svelte", client: true, sig: [/class=["'][^"']*\bsvelte-[0-9a-z]{4,}/i, /\/svelte(\/|@|\.)/i, /__svelte/i] },
  { name: "solid", client: true, sig: [/solid-js/i, /_\$HY\b/, /data-hk=["']/i] },
  { name: "ember", client: true, sig: [/id=["']ember\d/i, /\bember(\.min)?\.js/i, /data-ember-extension/i, /ember-application/i] },
  { name: "jquery", client: false, sig: [/jquery[-.]?[\d.]*(\.min)?\.js/i, /\bjQuery\b/, /\$\(document\)\.ready/, /\$\(function\s*\(/] },
  { name: "bootstrap", client: false, sig: [/bootstrap(\.bundle)?(\.min)?\.(js|css)/i, /class=["'][^"']*\bnavbar-toggler\b/i] },
];

export const CLIENT_FRAMEWORKS = new Set(FRAMEWORKS.filter((f) => f.client).map((f) => f.name));

// Generic "this is a single-page-app skeleton" markers, when no specific
// framework is attributable. Used for the "unattributed" shell bucket.
export const GENERIC_SPA = [
  /id=["']root["']/i, /id=["']app["']/i, /id=["']__nuxt["']/i, /id=["']q-app["']/i,
  /enable JavaScript/i, /you need to enable javascript/i, /please enable javascript/i,
  />\s*Loading\.?\.?\.?\s*</i,
];

// jQuery that builds content on load (so a non-rendering crawler sees a stub).
export const JQUERY_ONLOAD = [/\$\(document\)\.ready/, /\$\(function\s*\(/, /window\.onload\s*=/, /addEventListener\(\s*['"]load['"]/];

// The principled, threshold-free shell signal: a framework's MOUNT POINT is
// present but EMPTY in the captured HTML. Server-rendered pages fill the mount;
// client-rendered ones leave it empty for JS to populate. This separates SSR
// from CSR by construction, with no arbitrary text cutoff. High precision (an
// empty <div id="root"></div> is unambiguous), so it's a clean lower bound.
export const EMPTY_MOUNT = [
  /<(?:div|main|section)[^>]*\bid=["'](?:root|app|__next|__nuxt|q-app|application|svelte|gatsby-focus-wrapper)["'][^>]*>\s*<\/(?:div|main|section)>/i,
  /<(?:app-root|app|nuxt|q-app)[^>]*>\s*<\/(?:app-root|app|nuxt|q-app)>/i,
];
export function hasEmptyMount(html) {
  return EMPTY_MOUNT.some((re) => re.test(html));
}

// Content can hide in inline JSON even when the body renders nothing visible:
// Next.js __NEXT_DATA__, Nuxt/Vuex/Redux/Apollo state blobs, JSON-LD, and
// <script type="application/json">. A non-rendering crawler (and the model) DOES
// see this text, so a page heavy with it is NOT a blank shell. Returns the total
// length of such inline data so the caller can decide.
export function inlineDataLen(html) {
  let total = 0;
  for (const m of html.matchAll(/<script[^>]*type=["'](?:application\/json|application\/ld\+json)["'][^>]*>([\s\S]*?)<\/script>/gi)) total += m[1].length;
  for (const m of html.matchAll(/__(?:NUXT|INITIAL_STATE|APOLLO_STATE|PRELOADED_STATE|remixContext|sveltekit)__\s*=\s*([\s\S]{0,300000}?)<\/script>/gi)) total += m[1].length;
  return total;
}

// Return the list of framework names detected in the HTML.
export function detect(html) {
  return FRAMEWORKS.filter((f) => f.sig.some((re) => re.test(html))).map((f) => f.name);
}

export function hasGenericSpa(html) {
  return GENERIC_SPA.some((re) => re.test(html));
}

export function hasJqueryOnload(html) {
  return /jquery/i.test(html) && JQUERY_ONLOAD.some((re) => re.test(html));
}

// Classify a 200 text/html page. `visibleLen` = visible-text chars; `dataLen` =
// inline-JSON chars (from inlineDataLen). A page is a true shell only when BOTH
// the visible text AND the inline data are below threshold AND there's a
// client-render signal. If visible text is tiny but inline data is large, the
// content IS in the HTML (e.g. a Next.js SSG page with __NEXT_DATA__), so it is
// NOT a shell -> kind "data-in-html".
// Returns { shell, frameworks, kind }.
// SPA-ecosystem libraries: not frameworks, but strong "this is a client app"
// traits. react-router (client routing) and redux/apollo/preloaded-state (client
// state) in particular distinguish a real SPA from a React component dropped on a
// server-rendered page. Tracked as traits for the co-occurrence analysis.
export const SPA_LIBS = [
  { name: "react-router", sig: [/react-router/i, /data-router-state/i] },
  { name: "redux", sig: [/redux/i, /__REDUX_DEVTOOLS/i, /__PRELOADED_STATE__/, /window\.__INITIAL_STATE__/] },
  { name: "react-query", sig: [/react-query/i, /@tanstack\/(?:react-)?query/i, /__REACT_QUERY/i] },
  { name: "mobx", sig: [/\bmobx\b/i] },
  { name: "recoil", sig: [/\brecoil\b/i] },
  { name: "zustand", sig: [/\bzustand\b/i] },
  { name: "apollo", sig: [/apollo-client/i, /__APOLLO_STATE__/, /apollographql/i] },
  { name: "relay", sig: [/relay-runtime/i, /__RELAY_/i] },
  { name: "graphql", sig: [/graphql/i] },
  { name: "webpack", sig: [/webpackJsonp/i, /__webpack_require__/, /webpackChunk/i] },
  { name: "vite", sig: [/\/@vite\/client/i, /type=["']module["'][^>]*\/assets\//i, /__vite__/i] },
  { name: "hydration", sig: [/data-reactroot/i, /data-server-rendered/i, /_\$HY\b/, /data-hk=["']/i, /<!--\[-->/, /<!--\$-->/] },
  { name: "module-script", sig: [/<script[^>]*type=["']module["']/i] },
];
export function detectLibs(html) {
  return SPA_LIBS.filter((l) => l.sig.some((re) => re.test(html))).map((l) => l.name);
}

// A single category for each 200 text/html page, used by the specimen browser and
// the trait co-occurrence analysis.
//   empty-mount-shell : app container empty + tiny text (the trustworthy shell)
//   marker-shell      : tiny text + a client-render marker, but mount not empty
//   data-in-html      : tiny visible text, but content is in inline JSON (not a shell)
//   thin              : tiny text, no client-render signal (login/listing/stub)
//   framework-content : has a client framework AND visible content (an SSR app, NOT a shell)
//   content           : visible content, no client framework (plain server-rendered page)
export function categorize(html, visibleLen, dataLen, threshold) {
  const frameworks = detect(html);
  const client = frameworks.filter((f) => CLIENT_FRAMEWORKS.has(f));
  if (visibleLen >= threshold) return client.length ? "framework-content" : "content";
  if (dataLen >= threshold) return "data-in-html";
  if (hasEmptyMount(html)) return "empty-mount-shell";
  if (client.length || hasJqueryOnload(html) || hasGenericSpa(html)) return "marker-shell";
  return "thin";
}

export function classify(html, visibleLen, threshold, dataLen = 0) {
  const frameworks = detect(html);
  if (visibleLen >= threshold) return { shell: false, frameworks, kind: null };
  if (dataLen >= threshold) return { shell: false, frameworks, kind: "data-in-html" };
  const client = frameworks.filter((f) => CLIENT_FRAMEWORKS.has(f));
  if (client.length) return { shell: true, frameworks, kind: client[0] };
  if (hasJqueryOnload(html)) return { shell: true, frameworks, kind: "jquery-onload" };
  if (hasGenericSpa(html)) return { shell: true, frameworks, kind: "unattributed" };
  return { shell: false, frameworks, kind: null }; // tiny everywhere but no client-render signal: thin page
}
