/* Service worker: Scramjet routing + AdBlock */

// Change this one line whenever you update anything inside /scram, /baremux or /libcurl (for example a new Scramjet version).
// It makes every browser fetch the proxy files fresh instead of reusing an old copy from its cache or from the CDN.
const BUILD = "2026-11-05";

importScripts("/scram/scramjet.all.js?b=" + BUILD);

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

const PREFIX = "/scramjet/"; // must match the controller prefix in index.html
const SETTINGS_CACHE = "nexus-settings";
const SETTINGS_KEY = "/__adblock";

/* ---------- AdBlock ---------- */
const BLOCKED_DOMAINS = [
  "doubleclick.net", "googlesyndication.com", "googleadservices.com", "google-analytics.com",
  "googletagmanager.com", "googletagservices.com", "adservice.google.com", "pagead2.googlesyndication.com",
  "adnxs.com", "adsrvr.org", "advertising.com", "adform.net", "criteo.com", "criteo.net",
  "taboola.com", "outbrain.com", "revcontent.com", "mgid.com", "zemanta.com",
  "pubmatic.com", "rubiconproject.com", "openx.net", "casalemedia.com", "indexww.com",
  "amazon-adsystem.com", "media.net", "moatads.com", "scorecardresearch.com", "quantserve.com",
  "adsafeprotected.com", "serving-sys.com", "smartadserver.com", "teads.tv", "sharethrough.com",
  "33across.com", "bidswitch.net", "contextweb.com", "lijit.com", "sovrn.com",
  "hotjar.com", "mouseflow.com", "fullstory.com", "crazyegg.com", "mxpnl.com",
  "facebook.net", "connect.facebook.net", "ads.twitter.com", "static.ads-twitter.com",
  "ads.linkedin.com", "analytics.tiktok.com", "ads.yahoo.com", "adsymptotic.com",
  "popads.net", "propellerads.com", "exoclick.com", "juicyads.com", "trafficjunky.com",
  "adcolony.com", "applovin.com", "unity3d.com/ads", "chartboost.com", "inmobi.com",
  "yandex.ru/ads", "an.yandex.ru", "mc.yandex.ru", "adriver.ru",
];

const BLOCKED_PATTERNS = [
  /\/ads?\/[^/]*\.(js|gif|png|jpg|html)/i,
  /\/(adserver|adsense|adframe|advert|banner_ads|pagead|prebid)\b/i,
  /[?&](ad_unit|adunit|ad_slot)=/i,
  /\/(analytics|gtag|gtm|fbevents)\.js(\?|$)/i,
];

function hostBlocked(host) {
  return BLOCKED_DOMAINS.some((d) => {
    if (d.includes("/")) return false;
    return host === d || host.endsWith("." + d);
  });
}

function decodeTarget(requestUrl) {
  try {
    const u = new URL(requestUrl);
    const raw = u.href.slice(u.origin.length + PREFIX.length);
    return new URL(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

function shouldBlock(request) {
  // Never block the page the person is actually navigating to
  if (request.mode === "navigate" && request.destination === "document") return false;
  const target = decodeTarget(request.url);
  if (!target) return false;
  if (hostBlocked(target.hostname)) return true;
  return BLOCKED_PATTERNS.some((re) => re.test(target.pathname + target.search));
}

function emptyResponse(destination) {
  switch (destination) {
    case "script":
      return new Response("/* blocked */", { status: 200, headers: { "content-type": "application/javascript" } });
    case "style":
      return new Response("", { status: 200, headers: { "content-type": "text/css" } });
    case "iframe":
    case "frame":
      return new Response("<!doctype html><title>blocked</title>", { status: 200, headers: { "content-type": "text/html" } });
    default:
      return new Response(null, { status: 204 });
  }
}

/* ---------- Settings (persist across worker restarts) ---------- */
let adblockEnabled = true;
const settingsReady = (async () => {
  try {
    const cache = await caches.open(SETTINGS_CACHE);
    const hit = await cache.match(SETTINGS_KEY);
    if (hit) adblockEnabled = (await hit.json()).enabled !== false;
  } catch {}
})();

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "adblock") {
    adblockEnabled = !!data.enabled;
    event.waitUntil(
      caches.open(SETTINGS_CACHE).then((c) =>
        c.put(SETTINGS_KEY, new Response(JSON.stringify({ enabled: adblockEnabled })))
      )
    );
  }
});

/* ---------- Recovery page ---------- */
// If the proxy can't start for a page (its saved setup is missing or out of date, which happens after the site is updated),
// the person gets this page instead of a blank white one. It asks Nex.Velo to repair the proxy, and repairs it itself if nobody answers.
const RECOVERY_SCRIPT = `(function(){
var m=document.getElementById("m");
try{if(window.top!==window){window.top.postMessage({nvRepair:"the proxy's saved setup was out of date"},location.origin);}}catch(e){}
setTimeout(async function(){
var last=0;try{last=+sessionStorage.getItem("nv.rec")||0}catch(e){}
if(Date.now()-last<60000){m.textContent="Nex.Velo could not start the proxy for this page. Close any other Nex.Velo tabs, then reload.";return;}
try{sessionStorage.setItem("nv.rec",String(Date.now()))}catch(e){}
try{(await navigator.serviceWorker.getRegistrations()).forEach(function(r){r.unregister()})}catch(e){}
try{(await caches.keys()).forEach(function(k){caches.delete(k)})}catch(e){}
try{if(indexedDB.databases){(await indexedDB.databases()).forEach(function(d){if(/scramjet/i.test(d.name||""))indexedDB.deleteDatabase(d.name)})}}catch(e){}
setTimeout(function(){try{window.top.location.href="/"}catch(e){location.href="/"}},500);
},4000);
})();`;

function recoveryPage() {
  const html = '<!doctype html><meta charset="utf-8"><title>Nex.Velo</title>' +
    '<body style="font:14px system-ui,sans-serif;padding:24px;background:#000;color:#eee;line-height:1.5">' +
    '<p id="m">Nex.Velo is repairing the proxy…</p><script>' + RECOVERY_SCRIPT + "</scr" + "ipt>";
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/* ---------- Fetch ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function handleRequest(event) {
  // Only touch Scramjet for proxied URLs. Opening its database from the worker before the page
  // has created it leaves an empty database behind, which is what caused the IndexedDB error.
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(PREFIX)) return fetch(event.request);

  await settingsReady;
  // The page creates Scramjet's database a moment before this worker is used, so give it a couple of tries.
  let configured = false;
  for (let i = 0; i < 3 && !configured; i++) {
    try { await scramjet.loadConfig(); configured = true; }
    catch (e) { if (i < 2) await sleep(250); }
  }

  if (configured && scramjet.route(event)) {
    if (adblockEnabled && shouldBlock(event.request)) {
      return emptyResponse(event.request.destination);
    }
    try {
      return await scramjet.fetch(event);
    } catch (err) {
      // Show the real error inside the page instead of a blank frame
      const msg = "Nex.Velo proxy error for:\n" + event.request.url + "\n\n" + ((err && err.stack) || String(err));
      return new Response(msg, { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
  }

  // The proxy has no usable setup for this page. For a page (not an image or script) show the repair page instead of a white screen.
  if (event.request.mode === "navigate") return recoveryPage();
  return fetch(event.request);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil((async () => {
    // Remove caches left behind by older versions of the site (the settings cache is kept)
    try { for (const k of await caches.keys()) if (k !== SETTINGS_CACHE) await caches.delete(k); } catch {}
    await self.clients.claim();
  })())
);

self.addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});