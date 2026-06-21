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
