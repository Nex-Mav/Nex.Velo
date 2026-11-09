(() => {
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};
const VERSION = "1.00.0";

// Installing Nex.Velo as an app (the browser offers this when the site qualifies)
const INSTALL = { evt: null };
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); INSTALL.evt = e; if (window.NV && NV.onInstallChange) NV.onInstallChange(); });
addEventListener("appinstalled", () => { INSTALL.evt = null; if (window.NV && NV.toast) NV.toast("Nex.Velo is installed"); if (window.NV && NV.onInstallChange) NV.onInstallChange(); });
const standalone = () => matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const install = {
  can: () => !!INSTALL.evt, standalone,
  async prompt() { if (!INSTALL.evt) return "unavailable"; const e = INSTALL.evt; INSTALL.evt = null; e.prompt(); try { return (await e.userChoice).outcome; } catch { return "dismissed"; } },
  help() {
    const ua = navigator.userAgent;
    return standalone() ? "Nex.Velo is already running as an app." : /iPhone|iPad|iPod/i.test(ua) ? "In Safari: tap Share, then Add to Home Screen."
      : /Firefox/i.test(ua) ? "Firefox can't install web apps on a computer. In Chrome, Edge or Brave, open the menu and choose Install Nex.Velo."
      : "Open your browser's menu (the three dots) and choose Install Nex.Velo (or Cast, save and share, then Install page as app). If it isn't listed, reload this page once and try again.";
  },
};
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {} // asks the browser not to clear saved logins and settings when it is short on space

// small icons of our own (used instead of text symbols)
const ICON_X = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ICON_EDIT = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg>';

// The API (AI, music, lyrics...) lives on the Nex.Velo server. Ask this host first, then the Railway server.
const _fetch = window.fetch.bind(window);
let API = "";
const apiReady = (async () => {
  if (/\.railway\.app$/i.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  const probe = async (base) => {
    try {
      const c = new AbortController(), t = setTimeout(() => c.abort(), 3500);
      const r = await _fetch(base + "/api/ai/status", { signal: c.signal }); clearTimeout(t);
      return r.ok && !!(await r.json());
    } catch { return false; }
  };
  for (const base of ["", "https://nex-velo.up.railway.app"]) if (await probe(base)) { API = base; return; }
  API = "https://nex-velo.up.railway.app"; // nothing answered: keep the default so the errors point at the right place
})();
window.fetch = (u, o) => (typeof u === "string" && u.startsWith("/api/") ? apiReady.then(() => _fetch(API + u, o)) : _fetch(u, o));

/* ================= Settings ================= */
const defaultWisp = "wss://nex-velo.up.railway.app/wisp/"; // the Nex.Velo server, always available as the default
// Choices made in the setup with "remember" turned off live in sessionStorage only. They travel into a cloaked tab as ?nvs=…
try {
  const q = new URLSearchParams(location.search), v = q.get("nvs");
  if (v) { sessionStorage.setItem("nexvelo.session", new TextDecoder().decode(Uint8Array.from(atob(v), (c) => c.charCodeAt(0)))); q.delete("nvs"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); }
} catch {}
const settings = {
  wisp: defaultWisp, engine: "https://duckduckgo.com/?q=%s", adblock: true,
  theme: "bubblegum", wall: "aurora", wallUrl: "", blur: true, blurAmt: 14, font: "",
  clock: true, h24: true, music: true, games: true, movies: true, tools: true, ai: true, name: "",
  launch: "here", launchRedirect: true, wispAuto: true, mode: "normal", chat: true,
  custom: { bg: "#14161a", fg: "#f2f2f2", accent: "#8ab4ff", clock: "", bar: "", font: "jetbrains", size: 100 },
  panicOn: true, panicKey: "F9", panicSite: "classroom", panicUrl: "", panicMode: "replace",
};
const persisted = (() => { try { return JSON.parse(LS.get("nexvelo.settings", "{}")) || {}; } catch { return {}; } })();
Object.assign(settings, persisted);
let sessionOnly = {}; try { sessionOnly = JSON.parse(sessionStorage.getItem("nexvelo.session") || "{}") || {}; } catch {}
Object.assign(settings, sessionOnly);
if (settings.launch === "ask") settings.launch = "here"; // the old "ask every time" mode is gone
if (LS.get("nexvelo.settings") == null) { // carry over values saved by the first version
  const w = LS.get("nexus.wisp"), e = LS.get("nexus.engine"), a = LS.get("nexus.adblock");
  if (w) settings.wisp = w;
  if (e) settings.engine = e;
  if (a != null) settings.adblock = a === "1";
}
const PANIC_SITES = {
  classroom: "https://classroom.google.com", docs: "https://docs.google.com", drive: "https://drive.google.com", gmail: "https://mail.google.com",
  canvas: "https://canvas.instructure.com", schoology: "https://app.schoology.com", khan: "https://www.khanacademy.org",
  desmos: "https://www.desmos.com/calculator", wikipedia: "https://www.wikipedia.org", google: "https://www.google.com",
};
{ // an address saved by the earlier version stays as "my own address"
  let saved = {}; try { saved = JSON.parse(LS.get("nexvelo.settings", "{}")); } catch {}
  if (!saved.panicSite && saved.panicUrl && !Object.values(PANIC_SITES).includes(saved.panicUrl)) settings.panicSite = "custom";
  else if (!saved.panicSite && saved.panicUrl) settings.panicSite = Object.keys(PANIC_SITES).find((k) => PANIC_SITES[k] === saved.panicUrl) || "classroom";
}
const panicDest = () => (settings.panicSite === "custom" ? settings.panicUrl : PANIC_SITES[settings.panicSite]) || PANIC_SITES.classroom;
// Settings that were chosen for this visit only are never written to the saved settings.
const save = () => { const out = { ...settings }; for (const k of Object.keys(sessionOnly)) { if (k in persisted) out[k] = persisted[k]; else delete out[k]; } LS.set("nexvelo.settings", JSON.stringify(out)); };

/* ================= Banner (shows what is wrong instead of a blank page) ================= */
// With repair set, the banner also gets a "repair" button that resets the proxy (see "Proxy self-repair" below).
function showBanner(msg, repair, kind, action) {
  const b = $("#banner"); if (!b) return;
  b.dataset.kind = kind || "";
  const btn = (attr, label) => `<button type="button" ${attr} style="width:auto;padding:0 .625rem;border-radius:.75rem;font-size:.75rem">${esc(label)}</button>`;
  b.innerHTML = `<span>${esc(msg)}</span>${repair ? btn("data-repair", "repair") : ""}${action ? btn("data-action", action.label) : ""}<button type="button" data-x aria-label="Dismiss">${ICON_X}</button>`;
  b.hidden = false;
  $("[data-x]", b).onclick = () => { b.hidden = true; };
  const r = $("[data-repair]", b); if (r) r.onclick = () => repairProxy(true);
  const ac = $("[data-action]", b); if (ac) ac.onclick = () => { b.hidden = true; action.run(); };
}
const hideBanner = (kind) => { const b = $("#banner"); if (b && !b.hidden && (!kind || b.dataset.kind === kind)) b.hidden = true; };
addEventListener("error", (e) => { // a script that couldn't be loaded at all (missing file)
  const t = e.target; if (t && t.tagName === "SCRIPT") showBanner("couldn't load " + (t.getAttribute("src") || "a file").split("?")[0] + ". upload it to the public folder and refresh.");
}, true);

/* ================= Toast + spring ================= */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 3200);
}
// Critically damped by default (no overshoot). Starts from the live value, so it can be interrupted.
function spring({ from, to, velocity = 0, response = .35, damping = 1 }, onUpdate, onDone) {
  if (reduceMotion()) { onUpdate(to); onDone && onDone(); return () => {}; }
  const k = (2 * Math.PI / response) ** 2, c = 4 * Math.PI * damping / response;
  let x = from, v = velocity, last = performance.now(), raf, dead = false;
  const step = (now) => {
    if (dead) return;
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    const n = Math.max(1, Math.ceil(dt * 240));
    for (let i = 0; i < n; i++) { const h = dt / n; v += (-k * (x - to) - c * v) * h; x += v * h; }
    onUpdate(x);
    if (Math.abs(x - to) < .002 && Math.abs(v) < .02) { onUpdate(to); onDone && onDone(); return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => { dead = true; cancelAnimationFrame(raf); };
}

/* ================= Scramjet + transport ================= */
const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
  prefix: "/scramjet/",
  files: { wasm: "/scram/scramjet.wasm.wasm", all: "/scram/scramjet.all.js", sync: "/scram/scramjet.sync.js" },
  codec: { encode: (u) => encodeURIComponent(u), decode: (u) => decodeURIComponent(u) },
  flags: { captureErrors: true, strictRewrites: true, sourcemaps: true, allowInvalidJs: true, allowFailedIntercepts: true },
});
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

let activeWisp = settings.wisp; // the server in use right now (may differ from the saved one if that one is down)
const applyTransport = () => connection.setTransport("/libcurl/index.mjs", [{ wisp: activeWisp, websocket: activeWisp }]);

// Checked in the background, so loading pages never waits for it. A server that is slow to answer (it may be waking up) gets several
// patient tries before anything is said, and the message never claims that sites "won't load" (they usually do).
let wispOk = false;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function pickWisp() {
  if (settings.wispAuto === false) return;
  const sameHost = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
  const list = [...new Set([settings.wisp, defaultWisp, sameHost])];
  for (let round = 0; round < 3 && !wispOk; round++) {
    for (const u of list) {
      if (wispOk) return;
      if (await testWisp(u, 9000)) {
        wispOk = true; hideBanner("wisp");
        if (u !== activeWisp && u !== settings.wisp) { activeWisp = u; try { await applyTransport(); } catch {} toast("your Wisp server didn't answer, so " + new URL(u).host + " is being used instead"); }
        return;
      }
    }
    await wait(2500);
  }
  if (!wispOk) showBanner("couldn't confirm that the Wisp server is answering. pages may still load.", false, "wisp", { label: "check again", run: () => { wispOk = false; pickWisp(); } });
}

async function pushAdblock() {
  const reg = await navigator.serviceWorker.ready;
  (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: "adblock", enabled: settings.adblock });
}

/* ================= Proxy self-repair ================= */
// After the site is updated, the browser can keep an old copy of the proxy (its service worker, cached files or saved setup).
// The page then stays white until the site's data is cleared. This does that clearing automatically when a page comes up blank,
// and the "repair" button / opening the site with ?repair at the end of the address does it on demand.
const REPAIR_REQUESTED = /[?&]repair(=|&|$)/.test(location.search);

async function repairProxy(full) {
  try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.unregister())); } catch {}
  try { for (const k of await caches.keys()) await caches.delete(k); } catch {}
  if (full) { // also forget Scramjet's saved setup (this signs you out of proxied sites)
    try {
      const dbs = indexedDB.databases ? await indexedDB.databases() : [{ name: "$scramjet" }];
      await Promise.all(dbs.filter((d) => d.name && /scramjet/i.test(d.name)).map((d) => new Promise((res) => {
        const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = () => res(); setTimeout(res, 1500);
      })));
    } catch {}
  }
  location.replace(location.pathname + location.hash);
}

// Called when something looks broken. The first time it only resets the service worker and caches. If the problem comes back
// within half an hour, it also clears Scramjet's saved setup. It never repairs twice within two minutes (so it can't loop).
function autoRepair(reason) {
  let heal = {}; try { heal = JSON.parse(LS.get("nexvelo.heal", "{}")) || {}; } catch {}
  const age = Date.now() - (heal.t || 0);
  if (age < 2 * 60 * 1000) { showBanner("the proxy is having trouble (" + reason + "). press repair, or close other Nex.Velo tabs and reload.", true); return; }
  const n = age < 30 * 60 * 1000 ? (heal.n || 0) + 1 : 1;
  LS.set("nexvelo.heal", JSON.stringify({ t: Date.now(), n }));
  toast("the proxy needs a quick repair. one moment…");
  setTimeout(() => repairProxy(n >= 2), 700);
}

// the recovery page (sent by the service worker in place of a white screen) asks for a repair this way
addEventListener("message", (e) => { if (e.origin === location.origin && e.data && e.data.nvRepair) autoRepair(String(e.data.nvRepair)); });

// A page that finished loading but shows nothing at all is a sign of a stale proxy. Look again a few seconds after it loads.
function watchBlank(t) {
  clearTimeout(t.blankTimer);
  t.blankTimer = setTimeout(() => {
    if (!t.frame || !t.frame.frame.isConnected) return;
    let bad = false;
    try {
      const w = t.frame.frame.contentWindow, d = w.document;
      if (w.location.href === "about:blank") return;
      const b = d.body;
      bad = d.readyState === "complete" && (!b || (!b.querySelector("*:not(script):not(style):not(noscript)") && !(b.innerText || "").trim()));
    } catch { return; }
    if (bad) autoRepair("a page came up blank");
  }, 7000);
}

const ready = (async () => {
  if (!("serviceWorker" in navigator)) throw new Error("Service workers aren't supported in this browser.");
  if (REPAIR_REQUESTED) { await repairProxy(true); await new Promise(() => {}); } // the page reloads itself when this is done
  await scramjet.init(); // create Scramjet's database before the service worker starts
  // updateViaCache "none": always look for a newer sw.js (and the files it loads) on the server, never in the browser's cache
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) { // a brand-new worker takes control of this page a moment after it starts
    await Promise.race([
      new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true })),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  }
  await applyTransport();
  await pushAdblock();
  pickWisp();
})();
ready.catch((e) => console.error("Proxy setup failed:", e));

/* ================= Clock ================= */
const greet = (h) => (h < 5 ? "good night" : h < 12 ? "good morning" : h < 18 ? "good afternoon" : h < 22 ? "good evening" : "good night");
function tickClock() {
  const d = new Date(), h = d.getHours();
  const hh = settings.h24 ? String(h).padStart(2, "0") : String(h % 12 || 12).padStart(2, "0");
  const parts = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t)?.value || "";
  const date = `${g("weekday")} ${g("day")} ${g("month")}`.toLowerCase();
  const hello = greet(h) + (settings.name ? `, ${settings.name.toLowerCase()}` : "");
  $("#bar-clock").textContent = `${hh}:${String(d.getMinutes()).padStart(2, "0")}`;
  for (const el of $$(".clock")) {
    const h = $(".h", el), m = $(".m", el), g = $(".g", el);
    if (!h || !m || !g) continue; // not a home-page clock: leave it alone (one odd element must never stop the others)
    el.hidden = !settings.clock;
    h.textContent = hh; m.textContent = String(d.getMinutes()).padStart(2, "0");
    g.innerHTML = `<b>${esc(hello)}</b> · ${esc(date)}`;
  }
}
setInterval(tickClock, 1000);

/* ================= Themes + wallpapers ================= */
// Pop themes: bright colours with a second accent, so buttons, tabs and the clock can glow in a gradient.
const POP = {
  bubblegum: { bg: "#1a0b2e", fg: "#fff0fa", accent: "#ff5fc8", accent2: "#5ee7ff" },
  sunset: { bg: "#1f0a14", fg: "#fff4ec", accent: "#ff7a3d", accent2: "#ff3d81" },
  lagoon: { bg: "#04202a", fg: "#eafffb", accent: "#1de9b6", accent2: "#4da3ff" },
  grape: { bg: "#12082b", fg: "#f3ecff", accent: "#9b6bff", accent2: "#ff6bd6" },
  citrus: { bg: "#151a05", fg: "#f8ffe0", accent: "#d4ff3a", accent2: "#ffb703" },
  neon: { bg: "#05060a", fg: "#e8fff4", accent: "#39ff88", accent2: "#00e5ff" },
  candy: { bg: "#fff0f6", fg: "#3a1040", accent: "#ff4fa3", accent2: "#7c5cff" },
  sunshine: { bg: "#fff8e1", fg: "#3b2a00", accent: "#ffb300", accent2: "#ff5c8a" },
  arctic: { bg: "#e8f7ff", fg: "#08283d", accent: "#00b4ff", accent2: "#7a5cff" },
};
const THEMES = [
  ...Object.entries(POP).map(([id, p]) => [id, id, `linear-gradient(135deg,${p.accent},${p.accent2})`]),
  ["black", "midnight", "#0a0a0b"], ["white", "paper", "#f6f6f4"], ["sage", "sage", "#c9dcc0"], ["lavender", "lavender", "#d4c9ec"], ["rose", "rose", "#f2c6cd"], ["sky", "sky", "#c3dcf2"], ["peach", "peach", "#f6d2b8"], ["custom", "custom", "#888"],
];
// Live wallpapers are drawn by live.js: [id, name, preview gradient]
const LIVE = [
  ["aurora", "aurora", "linear-gradient(135deg,#ff5fc8,#5ee7ff 55%,#2a0b4a)"], ["flow", "gradient flow", "linear-gradient(135deg,#000,#4a1fa8 30%,#ff7a3d 65%,#fff)"],
  ["stars", "constellation", "radial-gradient(circle at 30% 35%,#8ab4ff,#0b0b22 70%)"], ["waves", "waves", "linear-gradient(180deg,#0b1030,#9b6bff 55%,#1de9b6)"],
  ["bubbles", "bubbles", "radial-gradient(circle at 68% 30%,#ff5fc8,#2a0b4a 70%)"], ["ripples", "ripples", "radial-gradient(circle,#4da3ff,#04101f 70%)"],
];
const isLive = (k) => LIVE.some((l) => l[0] === k);
const WALLS = { none: null, forest: () => NVWalls.forest(), ocean: () => NVWalls.ocean(), sky: () => NVWalls.sky() };
const wallCache = {};
const wallData = () => LS.get("nexvelo.wallpaper", "");
const wallSrc = (k) => (k === "custom" ? wallData() || settings.wallUrl : (wallCache[k] ??= WALLS[k] ? WALLS[k]() : null));

/* ----- custom theme: colours, fonts, size ----- */
const FONTS = {
  jetbrains: ["JetBrains Mono", '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace', "JetBrains+Mono:wght@300;400;500;700"],
  inter: ["Inter", 'Inter,system-ui,sans-serif', "Inter:wght@300;400;500;700"],
  poppins: ["Poppins", 'Poppins,system-ui,sans-serif', "Poppins:wght@300;400;500;700"],
  space: ["Space Grotesk", '"Space Grotesk",system-ui,sans-serif', "Space+Grotesk:wght@300;400;500;700"],
  dm: ["DM Sans", '"DM Sans",system-ui,sans-serif', "DM+Sans:wght@300;400;500;700"],
  quicksand: ["Quicksand", 'Quicksand,system-ui,sans-serif', "Quicksand:wght@300;400;500;700"],
  playfair: ["Playfair Display", '"Playfair Display",Georgia,serif', "Playfair+Display:wght@400;500;700"],
  lora: ["Lora", 'Lora,Georgia,serif', "Lora:wght@400;500;700"],
  system: ["System", 'system-ui,-apple-system,"Segoe UI",sans-serif', null],
  serif: ["Georgia (serif)", 'Georgia,"Times New Roman",serif', null],
  mono: ["Courier (mono)", '"Courier New",ui-monospace,monospace', null],
};
const loadedFonts = new Set(["jetbrains"]);
function loadFont(k) {
  const f = FONTS[k]; if (!f || !f[2] || loadedFonts.has(k)) return;
  loadedFonts.add(k);
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?family=${f[2]}&display=swap`;
  document.head.appendChild(l);
}
const lum = (hex) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrastOn = (hex) => (lum(hex) > .4 ? "#101010" : "#ffffff");
const CUSTOM_VARS = ["--bg", "--fg", "--dim", "--panel", "--card", "--accent", "--accent2", "--accent-fg", "--clock", "--bar", "--font", "--fs"];
const effFont = () => (FONTS[settings.font] ? settings.font : settings.theme === "custom" && FONTS[settings.custom.font] ? settings.custom.font : "jetbrains");

// Extra styling for the pop themes (gradients and glow) and for live wallpapers (see-through pages). Added here so no other file needs to change.
document.head.appendChild(Object.assign(document.createElement("style"), { id: "nv-pop", textContent: `
html.nv-fade,html.nv-fade *,html.nv-fade *::before,html.nv-fade *::after{transition:background-color .5s ease,color .5s ease,border-color .5s ease,box-shadow .5s ease,fill .5s ease,stroke .5s ease!important}
html[data-pop] ::selection{background:var(--accent);color:var(--accent-fg)}
html[data-pop]{scrollbar-color:color-mix(in srgb,var(--accent) 55%,transparent) transparent}
html[data-pop] #tabbar,html[data-pop] #toolbar{background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 20%,var(--chrome)),color-mix(in srgb,var(--accent2) 14%,var(--chrome)) 70%,var(--chrome))}
html[data-pop] .tab[aria-selected="true"]{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-fg)}
html[data-pop] .btn.primary,html[data-pop] button.primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--accent-fg);box-shadow:0 6px 20px -8px color-mix(in srgb,var(--accent) 80%,transparent)}
html[data-pop] .pbtn{background:linear-gradient(135deg,var(--accent),var(--accent2))!important;color:var(--accent-fg)!important}
html[data-pop] .switch input:checked{background:linear-gradient(90deg,var(--accent),var(--accent2))}
html[data-pop] .mtabs button.on,html[data-pop] .snav .nb.on{background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 85%,var(--bg)),color-mix(in srgb,var(--accent2) 85%,var(--bg)));color:var(--accent-fg)}
html[data-pop] .clock .time{background:linear-gradient(180deg,var(--clock,var(--fg)) 25%,var(--accent) 140%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;text-shadow:none;filter:drop-shadow(0 4px 26px color-mix(in srgb,var(--accent) 45%,transparent))}
html[data-pop] .home,html[data-pop] .clock{text-shadow:none}
html[data-pop] .omni input{box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 38%,transparent),0 12px 40px -14px color-mix(in srgb,var(--accent) 70%,transparent)}
html[data-pop] .omni input:focus{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 55%,transparent),0 12px 44px -8px color-mix(in srgb,var(--accent2) 70%,transparent)}
html[data-pop] .page{background:linear-gradient(165deg,var(--panel),color-mix(in srgb,var(--accent) 10%,var(--panel)) 55%,color-mix(in srgb,var(--accent2) 10%,var(--panel)))}
html[data-pop] .app-tile:hover,html[data-pop] .pcard:hover,html[data-pop] .tl-tile:hover,html[data-pop] .mark-b:hover{transform:translateY(-3px);box-shadow:0 14px 28px -14px color-mix(in srgb,var(--accent) 80%,transparent)}
html[data-pop] .sw.on i,html[data-pop] .wt.on i{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--accent)}
html[data-pop] .lbars i.on{background:linear-gradient(180deg,var(--accent),var(--accent2))}
html[data-pop] .loader{background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--accent) 32%,var(--bg)),var(--bg) 70%)}
html[data-pop] .trow.now{background:color-mix(in srgb,var(--accent) 20%,transparent)}
body.nv-live .page{background:color-mix(in srgb,var(--panel) 76%,transparent);-webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%)}
html[data-pop] body.nv-live .page{background:linear-gradient(165deg,color-mix(in srgb,var(--panel) 72%,transparent),color-mix(in srgb,var(--accent) 12%,transparent) 60%,color-mix(in srgb,var(--accent2) 12%,transparent))}
body.nv-live #desktop{background:transparent!important}
@media (prefers-reduced-transparency:reduce){body.nv-live .page,html[data-pop] body.nv-live .page{background:var(--panel);-webkit-backdrop-filter:none;backdrop-filter:none}}
` }));

// Liquid-glass controls: switches, sliders and segmented tabs with glass thumbs that lift into a lens when pressed (in the style of Glisse).
document.head.appendChild(Object.assign(document.createElement("style"), { id: "nv-glass", textContent: `
html .switch input[type=checkbox]{-webkit-appearance:none;appearance:none;position:relative;flex:none;width:3.5rem;height:2.125rem;margin:0;border:0;border-radius:999px;cursor:pointer;background:color-mix(in srgb,var(--fg) 16%,transparent);box-shadow:inset 0 1px 3px rgba(0,0,0,.25),inset 0 0 0 1px color-mix(in srgb,var(--fg) 8%,transparent);transition:background .3s ease,box-shadow .3s ease}
html .switch input[type=checkbox]::after{content:none}
html .switch input[type=checkbox]::before{content:"";position:absolute;top:.25rem;left:.25rem;width:2.25rem;height:1.625rem;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(238,238,244,.92));box-shadow:0 2px 6px rgba(0,0,0,.28),0 0 0 .5px rgba(0,0,0,.08),inset 0 1px 1px #fff,inset 0 -2px 3px rgba(0,0,0,.07);transition:transform .38s cubic-bezier(.34,1.5,.5,1),width .22s ease,background .22s ease,box-shadow .22s ease}
html .switch input[type=checkbox]:checked{background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 92%,#fff),var(--accent2,var(--accent)))}
html .switch input[type=checkbox]:checked::before{transform:translateX(.75rem)}
html .switch input[type=checkbox]:active::before{width:2.6rem;background:rgba(255,255,255,.4);-webkit-backdrop-filter:blur(2px) saturate(1.9) brightness(1.12);backdrop-filter:blur(2px) saturate(1.9) brightness(1.12);box-shadow:0 6px 16px rgba(0,0,0,.3),inset 0 0 0 1.5px rgba(255,255,255,.75),inset 0 1px 1px #fff}
html .switch input[type=checkbox]:checked:active::before{transform:translateX(.4rem)}
html .switch input[type=checkbox]:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
html input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:1.75rem;margin:0;background:transparent;cursor:pointer;--p:50%}
html input[type=range]:focus{outline:none}
html input[type=range]::-webkit-slider-runnable-track{height:.375rem;border-radius:999px;background:linear-gradient(90deg,var(--accent) var(--p),color-mix(in srgb,var(--fg) 18%,transparent) var(--p))}
html input[type=range]::-moz-range-track{height:.375rem;border-radius:999px;background:color-mix(in srgb,var(--fg) 18%,transparent)}
html input[type=range]::-moz-range-progress{height:.375rem;border-radius:999px;background:var(--accent)}
html input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:2.125rem;height:1.5rem;margin-top:-.5625rem;border-radius:999px;border:0;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(238,238,244,.92));box-shadow:0 2px 6px rgba(0,0,0,.3),0 0 0 .5px rgba(0,0,0,.08),inset 0 1px 1px #fff,inset 0 -2px 3px rgba(0,0,0,.07);transition:transform .3s cubic-bezier(.34,1.5,.5,1),background .2s,box-shadow .2s}
html input[type=range]::-moz-range-thumb{width:2.125rem;height:1.5rem;border-radius:999px;border:0;background:#f4f4f8;box-shadow:0 2px 6px rgba(0,0,0,.3)}
html input[type=range]:active::-webkit-slider-thumb{transform:scale(1.2);background:rgba(255,255,255,.45);-webkit-backdrop-filter:blur(2px) saturate(1.9) brightness(1.12);backdrop-filter:blur(2px) saturate(1.9) brightness(1.12);box-shadow:0 6px 16px rgba(0,0,0,.3),inset 0 0 0 1.5px rgba(255,255,255,.75),inset 0 1px 1px #fff}
html input[type=range]:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 60%,transparent),0 2px 6px rgba(0,0,0,.3)}
html .mtabs{border-radius:999px;padding:.1875rem;background:color-mix(in srgb,var(--fg) 10%,transparent)}
html .mtabs button{border-radius:999px;transition:background .25s ease,box-shadow .25s ease,transform .15s ease}
html .mtabs button:active{transform:scale(.96)}
html .mtabs button.on{background:color-mix(in srgb,var(--fg) 16%,transparent);-webkit-backdrop-filter:blur(8px) saturate(1.6);backdrop-filter:blur(8px) saturate(1.6);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 0 0 1px color-mix(in srgb,var(--fg) 14%,transparent),0 2px 8px rgba(0,0,0,.18)}
@media (prefers-reduced-motion:reduce){html .switch input[type=checkbox],html .switch input[type=checkbox]::before,html input[type=range]::-webkit-slider-thumb,html .mtabs button{transition:none}}
` }));
// A slider's filled part follows its value
const syncRange = (el) => { const min = +el.min || 0, max = el.max === "" ? 100 : +el.max, span = max - min || 1; el.style.setProperty("--p", Math.max(0, Math.min(100, ((+el.value - min) / span) * 100)) + "%"); };
const syncRanges = () => document.querySelectorAll("input[type=range]").forEach(syncRange);
document.addEventListener("input", (e) => { if (e.target && e.target.type === "range") syncRange(e.target); });
setInterval(syncRanges, 400); // also catches sliders that move by themselves (like a progress bar)

function applyTheme(animate) {
  const root = document.documentElement, pop = POP[settings.theme], pal = pop || (settings.theme === "custom" ? settings.custom : null);
  if (animate) { root.classList.add("nv-fade"); clearTimeout(applyTheme.t); applyTheme.t = setTimeout(() => root.classList.remove("nv-fade"), 650); } // colours glide from one theme to the next
  root.dataset.theme = pop ? "custom" : settings.theme; // a pop theme is a set of colours on top of the custom-theme styling
  if (pop) root.dataset.pop = settings.theme; else delete root.dataset.pop;
  CUSTOM_VARS.forEach((v) => root.style.removeProperty(v));
  root.style.colorScheme = "";
  const set = (k, v) => root.style.setProperty(k, v);
  if (pal) {
    set("--bg", pal.bg); set("--fg", pal.fg);
    set("--panel", pop ? `color-mix(in srgb, ${pal.bg} 90%, ${pal.accent})` : pal.bg);
    set("--dim", `color-mix(in srgb, ${pal.fg} 58%, transparent)`);
    set("--card", pop ? `color-mix(in srgb, ${pal.bg} 86%, ${pal.accent})` : `color-mix(in srgb, ${pal.fg} 9%, ${pal.bg})`);
    set("--accent", pal.accent); set("--accent-fg", contrastOn(pal.accent));
    if (pop) set("--accent2", pal.accent2);
    else { if (pal.clock) set("--clock", pal.clock); if (pal.bar) set("--bar", pal.bar); }
    root.style.colorScheme = lum(pal.bg) > .4 ? "light" : "dark";
  }
  const fk = effFont(); loadFont(fk); set("--font", FONTS[fk][1]);
  if (settings.theme === "custom") set("--fs", settings.custom.size + "%");
  if (window.NV && NV.live) NV.live.retint(); // live wallpapers pick up the theme's colours
}

function applyWall() {
  const live = isLive(settings.wall);
  let src = live ? null : wallSrc(settings.wall);
  if (settings.wall === "custom" && !/^(https?:|data:image\/)/i.test(src || "")) src = null;
  $("#wall").style.backgroundImage = src ? `url("${src.replace(/"/g, "%22")}")` : "";
  $("#wall").style.setProperty("--blur", live ? "0px" : settings.blur ? settings.blurAmt + "px" : "0px");
  document.body.classList.toggle("has-wall", !!src || live);
  document.body.classList.toggle("nv-live", live);
  setLive(live ? settings.wall : null);
  if (window.NV && NV.onWall) NV.onWall();
}
let liveLoading = false;
function setLive(k) { // live wallpapers live in live.js, which is loaded the first time one is wanted
  if (!k) { if (window.NV && NV.live) NV.live.stop(); return; }
  if (window.NV && NV.live) { NV.live.start(k, $("#wall")); return; }
  if (liveLoading) return; liveLoading = true;
  const sc = document.createElement("script"); sc.src = "/live.js"; sc.onerror = () => { liveLoading = false; showBanner("couldn't load live.js. upload it to the public folder and refresh."); };
  document.head.appendChild(sc);
}
const wallSrcNow = () => { const src = wallSrc(settings.wall); return settings.wall === "custom" && !/^(https?:|data:image\/)/i.test(src || "") ? null : src; };

/* ================= Escape key (the panic key) ================= */
let capturing = false; // true while Settings is waiting for you to press the new key
// Returns true when the key was the panic key and the jump happened. Games and other frames call this too.
function panicHandler(e) {
  if (capturing || !settings.panicOn || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return false;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k !== settings.panicKey) return false;
  const t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  if (typing && settings.panicKey.length === 1) return false; // single letters would fire while typing
  e.preventDefault(); e.stopPropagation();
  const dest = panicDest();
  const top = (() => { try { return window.top.location.href, window.top; } catch { return window; } })();
  if (settings.panicMode === "new") { window.open(dest, "_blank", "noopener"); top.location.replace("about:blank"); }
  else top.location.replace(dest);
  return true;
}
addEventListener("keydown", panicHandler, true);

/* ================= URL handling ================= */
const ALIAS = /^(?:https?:\/\/)?nex\.?velo(?:\/(?:games|music|ai|settings|servers|entertainment|tools|movies|chat)(?:\/[a-z0-9-]+)?)?\/?$/i;
function resolve(raw) {
  const v = raw.trim();
  if (!v) return null;
  if (/^nex\.?velo\//i.test(v) && !ALIAS.test(v)) return location.origin + "/" + v.replace(/^nex\.?velo\/?/i, "");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
  if (!/\s/.test(v) && (/^localhost(:\d+)?(\/|$)/i.test(v) || /^[^\s/]+\.[a-z]{2,}(:\d+)?(\/|$|\?|#)/i.test(v))) return "https://" + v;
  return settings.engine.replace("%s", encodeURIComponent(v));
}

/* ================= Loader (slanted bars + percentage + rotating quote) ================= */
const QUOTES = [
  "Slow is smooth, smooth is fast.", "Patience.", "Good things take a moment.", "Almost there.",
  "The best way out is always through.", "Small steps add up to big journeys.", "Breathe in, breathe out.",
  "Every expert was once a beginner.", "Stay curious.", "Quiet minds find clear answers.",
  "Nothing worth having arrives instantly.", "Keep going, you are closer than you think.",
  "A little progress each day adds up to big results.", "Rest your eyes for a second.",
  "You miss every shot you never take.", "Make it simple, then make it better.",
  "The journey is the fun part.", "Loading greatness.", "Fortune favours the bold.",
  "Be kind to your future self.", "Dream big, start small, begin now.", "Calm seas never made a skilled sailor.",
  "Think different, load faster.", "Take a sip of water while you wait.", "Today is a good day to learn something new.",
  "Courage is just fear that has said its prayers.", "Wherever you go, go with all your heart.",
  "Light travels faster than sound, so some people look bright until they speak.",
  "If you can dream it, you can build it.", "Hold tight, the page is on its way.",
];
const BARS = 24, words = (q) => q.trim().split(/\s+/).length;
let deck = [];
const nextQuoteText = () => { if (!deck.length) deck = [...QUOTES].sort(() => Math.random() - .5); return deck.pop(); };

function ensureLoader(t) {
  if (t.loader) return t.loader;
  const el = document.createElement("div");
  el.className = "loader out"; el.hidden = true;
  el.innerHTML = `<p class="lq"></p><div class="lrow"><div class="lbars">${"<i></i>".repeat(BARS)}</div><span class="lpct">0%</span></div>`;
  t.view.appendChild(el);
  return (t.loader = { el, q: $(".lq", el), bars: $$("i", el), pct: $(".lpct", el), p: 0, target: 0, creep: false, raf: 0, timer: 0, on: false });
}
function showQuote(L) {
  if (!L.on) return;
  const text = nextQuoteText();
  L.q.classList.add("fade");
  setTimeout(() => { L.q.textContent = text; L.q.classList.remove("fade"); }, L.q.textContent ? 300 : 0);
  L.timer = setTimeout(() => showQuote(L), words(text) * 2000); // 1 word = 2 seconds
}
function loaderTick(L) {
  if (!L.on) return;
  if (L.creep && L.target < 92) L.target += .03;
  L.p += (L.target - L.p) * .07 + .02;
  if (L.p > L.target) L.p = L.target;
  const lit = Math.floor((L.p / 100) * BARS + (L.p >= 99.5 ? 1 : 0));
  L.bars.forEach((b, i) => b.classList.toggle("on", i < lit));
  L.pct.textContent = Math.floor(L.p) + "%";
  if (L.target >= 100 && L.p >= 99.4) { setTimeout(() => loaderStop(L), 250); return; }
  L.raf = requestAnimationFrame(() => loaderTick(L));
}
function loaderStart(t) {
  const L = ensureLoader(t);
  cancelAnimationFrame(L.raf); clearTimeout(L.timer);
  Object.assign(L, { on: true, p: 0, target: 15, creep: false });
  L.bars.forEach((b) => b.classList.remove("on")); L.q.textContent = "";
  L.el.hidden = false; requestAnimationFrame(() => L.el.classList.remove("out"));
  showQuote(L); loaderTick(L);
  clearTimeout(L.guard); L.guard = setTimeout(() => loaderStop(L), 60000); // never get stuck
}
function loaderStop(L) {
  if (!L || !L.on) return;
  L.on = false; cancelAnimationFrame(L.raf); clearTimeout(L.timer); clearTimeout(L.guard);
  L.el.classList.add("out"); setTimeout(() => { if (!L.on) L.el.hidden = true; }, 320);
}

/* ================= Tabs ================= */
// kinds: "web" (home page or a proxied site), "settings", "games", "music", "ai"
const tabs = [];
let active = null, uid = 0, restoring = false;
// Entertainment and Tools are built by entertainment.js and tools.js. Their empty pages are made here so saved tabs can come back before those files finish loading.
const makePage = (id) => { let n = $("#" + id); if (!n) { n = document.createElement("section"); n.className = "page"; n.id = id; n.innerHTML = '<div class="msg" style="padding:2rem">loading…</div>'; $("#pages").appendChild(n); } return n; };
const PAGES = { settings: $("#page-settings"), music: $("#page-music"), ai: $("#page-ai"), games: $("#page-games"), entertainment: makePage("page-entertainment"), tools: makePage("page-tools"), chat: makePage("page-chat") };
const X_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const isHome = (t) => t.kind === "web" && !t.frame;

function saveTabs() {
  if (restoring || NV.desktopMode) return; // desktop mode keeps its windows in desktop.js
  LS.set("nexvelo.tabs", JSON.stringify({ a: tabs.indexOf(active), t: tabs.map((t) => ({ k: t.kind, u: t.frame ? t.url : t.pendingUrl || "" })) }));
}

function newTab(opts = {}) {
  if (NV.desktopMode && !opts.host) return NV.desktopOpen(opts); // desktop mode: every tab is a window
  const kind = opts.kind || "web";
  if (kind !== "web" && !PAGES[kind]) { showBanner("the " + kind + " page isn't in this index.html. upload the newest index.html and clear the CDN cache."); return null; }
  const t = { id: ++uid, kind, title: kind === "web" ? "New tab" : kind, url: "", frame: null, pendingUrl: null, loader: null };
  t.view = document.createElement("div");
  t.view.className = "view";
  if (kind === "web") {
    t.view.innerHTML = `<div class="home"><div class="clock"><div class="time"><span class="h"></span><i>:</i><span class="m"></span></div><div class="g"></div></div><form class="omni" onsubmit="return false"><input type="text" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Search or enter address" aria-label="Search or enter address"></form><div class="marks"></div></div>`;
    t.input = $("input", t.view);
    $("form", t.view).addEventListener("submit", (e) => { e.preventDefault(); go(t, t.input.value); });
  } else {
    t.view.classList.add("has-page"); t.view.appendChild(PAGES[kind]);
  }
  t.chip = document.createElement("div");
  t.chip.className = "tab"; t.chip.setAttribute("role", "tab");
  t.chip.innerHTML = `<span class="t"></span><button class="x" aria-label="Close tab">${X_SVG}</button>`;
  t.chip.addEventListener("pointerdown", (e) => { if (!e.target.closest(".x")) select(t); });
  $(".x", t.chip).addEventListener("click", (e) => { e.stopPropagation(); closeTab(t); });
  tabs.push(t);
  if (opts.host) { t.windowed = true; opts.host.appendChild(t.view); } // desktop mode: the page lives in its own window
  else { $("#tabs").appendChild(t.chip); $("#views").appendChild(t.view); }
  if (opts.url && opts.lazy) { t.pendingUrl = opts.url; t.title = hostOf(opts.url); }
  paintChip(t); select(t); tickClock(); renderMarks();
  if (kind === "settings") loadSettingsUI();
  if (kind === "ai" && NV.onAiOpen) NV.onAiOpen();
  if (kind === "games" && NV.onGamesOpen) NV.onGamesOpen();
  if (kind === "entertainment" && NV.onEntOpen) NV.onEntOpen();
  if (kind === "tools" && NV.onToolsOpen) NV.onToolsOpen();
  if (kind === "chat" && NV.onChatOpen) NV.onChatOpen();
  if (opts.url && !opts.lazy) go(t, opts.url);
  else if (kind === "web" && !opts.lazy) t.input.focus({ preventScroll: true });
  return t;
}

const paintChip = (t) => { $(".t", t.chip).textContent = t.title; t.chip.title = t.title; if (t.onTitle) t.onTitle(t.title); };

function select(t) {
  active = t;
  for (const x of tabs) { const on = x === t || !!x.windowed; x.view.classList.toggle("active", on); x.chip.setAttribute("aria-selected", x === t); } // windows are all visible at once
  if (!t.windowed) t.chip.scrollIntoView({ inline: "nearest", block: "nearest" });
  if (t.pendingUrl && !restoring) { const u = t.pendingUrl; t.pendingUrl = null; go(t, u); }
  syncChrome(); saveTabs();
  window.NV && NV.onTab && NV.onTab(t);
  if (t.onFocus) t.onFocus();
}

function closeTab(t) {
  const i = tabs.indexOf(t), wasActive = active === t;
  if (t.loader) loaderStop(t.loader);
  clearTimeout(t.blankTimer); clearTimeout(t.stallTimer);
  tabs.splice(i, 1);
  t.chip.classList.add("closing"); t.view.classList.remove("active"); t.view.classList.add("leaving");
  setTimeout(() => { // let the close animation play, then clean up
    const node = PAGES[t.kind];
    if (node && node.parentNode === t.view) $("#pages").appendChild(node);
    t.chip.remove(); t.view.remove();
  }, reduceMotion() ? 0 : 190);
  if (NV.desktopMode) { if (wasActive) active = null; return; } // closing a window never opens another one
  if (!tabs.length) return newTab();
  if (wasActive) select(tabs[Math.min(i, tabs.length - 1)]); else saveTabs();
}

function openPage(kind) {
  if (kind === "movies") { kind = "entertainment"; NV.entShow && NV.entShow("movies"); } // Movies is now a section of Entertainment
  if (!PAGES[kind]) return showBanner("the " + kind + " page isn't in this index.html. upload the newest index.html and clear the CDN cache.");
  const ex = tabs.find((t) => t.kind === kind);
  if (ex) { select(ex); if (kind === "settings") loadSettingsUI(); } else newTab({ kind });
}

/* ----- addresses like Nex.Velo/Music/Playlists: shown in the address bar, and typed to jump straight there ----- */
const KIND_LABEL = { music: "Music", games: "Games", entertainment: "Entertainment", tools: "Tools", chat: "Chat", ai: "AI", settings: "Settings" };
const titleSlug = (s) => ({ ugs: "UGS", "gn-math": "GN-Math" }[s] || s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-"));
function currentSub(kind) {
  if (kind === "music") return $("#page-music .mtabs .on")?.dataset.mt || "";
  if (kind === "games") { const k = $("#gtabs .on")?.dataset.g || ""; return k === "gn" ? "gn-math" : k; }
  if (kind === "settings") { const s = $(".snav .nb.on")?.dataset.sec || ""; return s === "extensions" ? "apps" : s; }
  if (kind === "entertainment") return NV.entSection ? NV.entSection() : "";
  if (kind === "tools") return NV.toolsCurrent ? NV.toolsCurrent() : "";
  return "";
}
const pageAddress = (kind) => "Nex.Velo/" + (KIND_LABEL[kind] || titleSlug(kind)) + (currentSub(kind) ? "/" + titleSlug(currentSub(kind)) : "");
function openSub(app, sub) {
  sub = sub.toLowerCase();
  if (app === "music" && ["search", "playlists", "recent"].includes(sub)) NV.musicShowTab && NV.musicShowTab(sub);
  else if (app === "games") {
    const k = sub === "gn-math" || sub === "gnmath" ? "gn" : sub;
    if (["gn", "obsidian", "ugs", "duckmath", "weslack"].includes(k)) NV.gamesShowSource && NV.gamesShowSource(k, true);
  } else if (app === "settings") {
    const id = sub === "apps" ? "extensions" : sub;
    if ($("#sec-" + id)) showSec(id);
  } else if (app === "entertainment") NV.entShow && NV.entShow(sub);
  else if (app === "tools") NV.toolsShow && NV.toolsShow(sub);
}
// Returns true when the text was an address of one of our own pages (so nothing else should happen with it)
function routeAlias(raw) {
  const m = String(raw).trim().match(/^(?:https?:\/\/)?nex\.?velo(?:\/([a-z]+))?(?:\/([a-z0-9-]+))?\/?$/i);
  if (!m) return false;
  let app = (m[1] || "").toLowerCase(), sub = m[2] || "";
  if (app === "movies") { app = "entertainment"; sub = sub || "movies"; } // Movies is now a section of Entertainment
  if (!app) return true;
  if (app === "servers") { openSettings("servers"); return true; }
  if (!PAGES[app]) return false; // not one of ours: it is a file on this site
  openPage(app);
  if (sub) openSub(app, sub);
  syncChrome();
  return true;
}

async function go(t, raw) {
  if (routeAlias(raw)) return;
  if (t.kind !== "web") { const v = String(raw).trim(); if (v) newTab({ url: v }); return; } // typed a website while on one of our pages: open it in a new tab
  const url = resolve(raw);
  if (!url) return;
  loaderStart(t);
  try { await ready; } catch (e) { loaderStop(t.loader); toast(e.message); return; }
  t.loader.target = Math.max(t.loader.target, 30);
  if (!t.frame) {
    t.frame = scramjet.createFrame();
    t.view.insertBefore(t.frame.frame, t.loader.el);
    t.view.classList.add("has-frame");
    t.frame.frame.addEventListener("load", () => {
      try { t.frame.frame.contentWindow.addEventListener("keydown", panicHandler, true); } catch {}
      let blank = false; try { blank = t.frame.frame.contentWindow.location.href === "about:blank"; } catch {}
      if (t.loading && !blank) { t.loading = false; t.loader.target = 100; }
      if (!blank) { clearTimeout(t.stallTimer); watchBlank(t); wispOk = true; hideBanner("wisp"); } // a page loaded through the proxy: the server works // a loaded page that stays empty means the proxy is out of date
      syncTab(t);
    });
  }
  t.url = url; t.title = hostOf(url); paintChip(t); if (t.onSync) t.onSync(t);
  t.loading = true; t.loader.creep = true;
  clearTimeout(t.stallTimer);
  t.stallTimer = setTimeout(() => { if (t.loading && t === active) showBanner("this page is taking a long time to start. if it stays white, press repair.", true); }, 20000);
  try { t.frame.go(url); } catch (e) { toast("couldn't open that page"); console.error(e); loaderStop(t.loader); }
  if (t === active) syncChrome();
  saveTabs();
}

function displayUrl(u) {
  try {
    const x = new URL(u);
    if (x.origin === location.origin) return "Nex.Velo" + x.pathname.replace(/\.html$/, "").replace(/\/$/, "") + x.search;
  } catch {}
  return u;
}

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

function liveUrl(t) {
  if (!t.frame) return "";
  try { if (t.frame.url) return String(t.frame.url.href || t.frame.url); } catch {}
  try { return scramjet.decodeUrl(t.frame.frame.contentWindow.location.href); } catch {}
  return t.url;
}

function syncTab(t) {
  if (!t.frame) return;
  const before = t.url;
  const u = liveUrl(t); if (u) t.url = u;
  let title = ""; try { title = t.frame.frame.contentDocument.title; } catch {}
  t.title = title || hostOf(t.url) || "New tab"; paintChip(t);
  if (t.onSync) t.onSync(t);
  if (t === active) syncChrome();
  if (before !== t.url) saveTabs();
}

function syncChrome() {
  const browsing = !!(active && active.kind === "web" && active.frame);
  const isPage = !!(active && PAGES[active.kind]);
  document.body.classList.toggle("browsing", browsing);
  document.body.classList.toggle("page-tab", isPage);
  $("#address").readOnly = false;
  if (isPage && document.activeElement !== $("#address")) $("#address").value = pageAddress(active.kind);
  $("#bar-clock").hidden = !!(active && isHome(active)); // small clock appears once you leave the big-clock home page
  if (browsing && document.activeElement !== $("#address")) $("#address").value = displayUrl(active.url);
  document.title = browsing ? `${active.title} – Nex.Velo` : active && PAGES[active.kind] ? `${active.kind} – Nex.Velo` : "Nex.Velo";
}
setInterval(() => { for (const t of tabs) if (t.frame && (t === active || t.windowed)) syncTab(t); }, 900);

const histTab = (t, fn) => { try { fn(t.frame.frame.contentWindow.history); } catch {} };
function reloadTab(t) { try { loaderStart(t); t.loading = true; t.loader.creep = true; t.frame.frame.contentWindow.location.reload(); } catch { go(t, t.url); } }
function homeTab(t) {
  if (t.loader) loaderStop(t.loader);
  clearTimeout(t.blankTimer); clearTimeout(t.stallTimer);
  t.frame.frame.remove(); t.frame = null; t.url = ""; t.title = "New tab"; t.loading = false;
  t.view.classList.remove("has-frame"); t.input.value = ""; paintChip(t); if (t.onSync) t.onSync(t); syncChrome(); saveTabs();
}
$("#back").addEventListener("click", () => histTab(active, (h) => h.back()));
$("#forward").addEventListener("click", () => histTab(active, (h) => h.forward()));
$("#reload").addEventListener("click", () => reloadTab(active));
$("#home").addEventListener("click", () => homeTab(active));
$("#address").addEventListener("keydown", (e) => { if (e.key === "Enter") { go(active, e.target.value); e.target.blur(); } });
$("#address").addEventListener("focus", (e) => e.target.select());
$("#address").addEventListener("blur", () => syncChrome());
$("#new-tab").addEventListener("click", () => newTab());

/* ================= Bookmarks ================= */
const MARK_MAX = 5;
let marks = []; try { marks = (JSON.parse(LS.get("nexvelo.bookmarks", "[]")) || []).slice(0, MARK_MAX); } catch {}
const saveMarks = () => LS.set("nexvelo.bookmarks", JSON.stringify(marks));
const markHost = (u) => { try { return new URL(u).hostname; } catch { return ""; } };
function markHTML(m, i) {
  const letter = esc((m.name || markHost(m.url) || "?").trim()[0] || "?").toUpperCase();
  const icon = `${API}/api/favicon?host=${encodeURIComponent(markHost(m.url))}`;
  return `<div class="mark"><button class="mark-b" data-open="${i}" title="${esc(m.url)}"><img src="${esc(icon)}" alt="" data-l="${letter}" onerror="this.outerHTML='<i class=ph>'+this.dataset.l+'</i>'"><span class="mn">${esc(m.name)}</span></button><button class="mark-e" data-edit="${i}" aria-label="Edit bookmark">${ICON_EDIT}</button><button class="mark-x" data-del="${i}" aria-label="Remove bookmark">${ICON_X}</button></div>`;
}
function renderMarks() {
  const html = marks.map(markHTML).join("") + (marks.length < MARK_MAX ? '<button class="mark add" data-add="1" aria-label="Add a bookmark" title="Add a bookmark">+</button>' : "");
  $$(".marks").forEach((el) => { el.innerHTML = html; });
}
let editing = -1;
function markDialog(i) {
  editing = i;
  $("#mark-title").textContent = i >= 0 ? "edit bookmark" : "add a bookmark";
  $("#mark-name").value = i >= 0 ? marks[i].name : ""; $("#mark-url").value = i >= 0 ? marks[i].url : "";
  $("#mark-dlg").hidden = false; setTimeout(() => $(i >= 0 ? "#mark-name" : "#mark-url").focus(), 30);
}
document.addEventListener("click", (e) => {
  const box = e.target.closest(".marks"); if (!box) return;
  const open = e.target.closest("[data-open]"), del = e.target.closest("[data-del]"), ed = e.target.closest("[data-edit]");
  if (e.target.closest("[data-add]")) markDialog(-1);
  else if (ed) markDialog(+ed.dataset.edit);
  else if (del) { marks.splice(+del.dataset.del, 1); saveMarks(); renderMarks(); }
  else if (open) newTab({ url: marks[+open.dataset.open].url }); // opens through the proxy in a new tab
});
$("#mark-cancel").addEventListener("click", () => { $("#mark-dlg").hidden = true; });
$("#mark-form").addEventListener("submit", (e) => {
  e.preventDefault();
  let u = $("#mark-url").value.trim(); if (!u) return;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = "https://" + u;
  let host; try { host = new URL(u).hostname; } catch { return toast("that link doesn't look right"); }
  const name = ($("#mark-name").value.trim() || host.replace(/^www\./, "")).slice(0, 14);
  if (editing >= 0) marks[editing] = { name, url: u };
  else if (marks.length < MARK_MAX) marks.push({ name, url: u });
  saveMarks(); renderMarks(); $("#mark-dlg").hidden = true;
});

/* ================= Settings UI ================= */
const status = $("#status");
const say = (msg, kind = "") => { status.textContent = msg; status.className = kind; };
const normalizeWisp = (v) => {
  v = v.trim(); if (!v) return "";
  if (/^https?:\/\//i.test(v)) v = v.replace(/^http/i, "ws");
  if (!/^wss?:\/\//i.test(v)) v = "wss://" + v;
  return v.endsWith("/") ? v : v + "/";
};
function testWisp(url, ms = 6000) {
  return new Promise((resolve) => {
    let done = false, ws;
    const finish = (ok) => { if (!done) { done = true; try { ws.close(); } catch {} resolve(ok); } };
    try { ws = new WebSocket(url); } catch { return resolve(false); }
    ws.onopen = () => finish(true); ws.onerror = () => finish(false); setTimeout(() => finish(false), ms);
  });
}

function buildAppearance() {
  $("#swatches").innerHTML = THEMES.map(([id, label, c]) => `<button class="sw${settings.theme === id ? " on" : ""}" data-theme="${id}"><i style="--c:${c}"></i>${label}</button>`).join("").replace(/class="sw( on)?" data-theme="custom"/, (m) => m.replace("class=\"sw", "class=\"sw custom"));
  const walls = [["none", "none"], ["forest", "forest"], ["ocean", "ocean"], ["sky", "sky"], ...LIVE.map((l) => [l[0], l[1] + " · live"]), ["custom", "custom"]];
  $("#walls").innerHTML = walls.map(([id, label]) => {
    const src = id === "none" ? null : wallSrc(id);
    const lv = LIVE.find((l) => l[0] === id);
    const thumb = lv ? `style="background:${lv[2]}"` : src && /^(https?:|data:image\/)/i.test(src) ? `style="background-image:url('${src.replace(/'/g, "%27")}')"` : "";
    return `<button class="wt${settings.wall === id ? " on" : ""}" data-wall="${id}"><i ${thumb}>${thumb ? "" : id === "none" ? "–" : id === "custom" ? "+" : ""}</i>${label}</button>`;
  }).join("");
  $("#custom-opts").hidden = settings.theme !== "custom";
  $("#wall-custom").hidden = settings.wall !== "custom";
  $("#wall-clear").hidden = !wallData();
  $("#wall-note").textContent = wallData() ? "using your uploaded image" : "";
  $("#blur-opts").hidden = settings.wall === "none" || isLive(settings.wall);
  const af = $("#app-font"); if (af) af.value = effFont();
  $("#blur-amt-fld").hidden = !settings.blur;
}
$("#swatches").addEventListener("click", (e) => {
  const b = e.target.closest("[data-theme]"); if (!b) return;
  settings.theme = b.dataset.theme; save(); applyTheme(true); buildAppearance();
});
$("#c-font").innerHTML = Object.entries(FONTS).map(([k, f]) => `<option value="${k}">${f[0]}</option>`).join("");
function loadCustomUI() {
  const c = settings.custom;
  $("#c-bg").value = c.bg; $("#c-fg").value = c.fg; $("#c-accent").value = c.accent;
  $("#c-clock").value = c.clock || c.fg; $("#c-bar").value = c.bar || "#2a2d33"; $("#c-font").value = effFont(); $("#c-size").value = c.size;
}
const customInput = (id, key, mapper = (v) => v) => $(id).addEventListener("input", (e) => { settings.custom[key] = mapper(e.target.value); save(); applyTheme(); });
customInput("#c-bg", "bg"); customInput("#c-fg", "fg"); customInput("#c-accent", "accent");
customInput("#c-clock", "clock"); customInput("#c-bar", "bar"); customInput("#c-size", "size", (v) => +v);
$("#c-font").addEventListener("input", (e) => { settings.custom.font = e.target.value; settings.font = e.target.value; save(); applyTheme(); const af = $("#app-font"); if (af) af.value = e.target.value; });
(function fontPicker() { // one font for the whole site, whichever theme is on (also chosen in the first-visit setup)
  const sw = $("#swatches"); if (!sw || $("#app-font")) return;
  const fld = document.createElement("label"); fld.className = "fld"; fld.innerHTML = `<span>font</span><select id="app-font">${Object.entries(FONTS).map(([k, f]) => `<option value="${k}">${f[0]}</option>`).join("")}</select>`;
  const prev = sw.previousElementSibling; sw.parentElement.insertBefore(fld, prev && /^H\d$/.test(prev.tagName) ? prev : sw);
  $("#app-font").value = effFont();
  $("#app-font").addEventListener("change", (e) => { settings.font = e.target.value; settings.custom.font = e.target.value; save(); applyTheme(true); loadCustomUI(); });
})();
$("#c-reset").addEventListener("click", () => {
  settings.custom = { bg: "#14161a", fg: "#f2f2f2", accent: "#8ab4ff", clock: "", bar: "", font: "jetbrains", size: 100 };
  save(); applyTheme(); loadCustomUI();
});
$("#walls").addEventListener("click", (e) => {
  const b = e.target.closest("[data-wall]"); if (!b) return;
  settings.wall = b.dataset.wall; save(); applyWall(); buildAppearance();
});
$("#wall-url").addEventListener("change", (e) => { settings.wallUrl = e.target.value.trim(); LS.del("nexvelo.wallpaper"); save(); applyWall(); buildAppearance(); });
async function shrinkImage(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, 1920 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  let q = .85, data = c.toDataURL("image/jpeg", q);
  while (data.length > 2800000 && q > .4) { q -= .15; data = c.toDataURL("image/jpeg", q); }
  return data;
}
$("#wall-upload").addEventListener("click", () => $("#wall-file").click());
$("#wall-file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  if (!f.type.startsWith("image/")) return toast("that isn't an image");
  try {
    const data = await shrinkImage(f);
    LS.set("nexvelo.wallpaper", data);
    if (LS.get("nexvelo.wallpaper", "") !== data) throw new Error("storage full");
    settings.wall = "custom"; save(); applyWall(); buildAppearance(); toast("wallpaper set");
  } catch { LS.del("nexvelo.wallpaper"); toast("couldn't use that image. try a smaller one."); }
});
$("#wall-clear").addEventListener("click", () => { LS.del("nexvelo.wallpaper"); applyWall(); buildAppearance(); });
$("#blur").addEventListener("change", (e) => { settings.blur = e.target.checked; save(); applyWall(); buildAppearance(); });
$("#blur-amt").addEventListener("input", (e) => { settings.blurAmt = +e.target.value; save(); applyWall(); });

function loadSettingsUI() {
  loadCustomUI();
  $("#wisp-url").value = settings.wisp; $("#engine").value = settings.engine;
  $("#adblock").checked = settings.adblock; $("#clock").checked = settings.clock; $("#h24").checked = settings.h24;
  $("#blur").checked = settings.blur; $("#blur-amt").value = settings.blurAmt; $("#wall-url").value = settings.wallUrl;
  $("#wisp-auto").checked = settings.wispAuto !== false; $("#launch-mode").value = settings.launch; $("#launch-redirect").checked = settings.launchRedirect; $("#panic-on").checked = settings.panicOn; $("#panic-key").textContent = settings.panicKey; $("#panic-site").value = settings.panicSite; $("#panic-url").value = settings.panicUrl; $("#panic-url-fld").hidden = settings.panicSite !== "custom"; $("#panic-mode").value = settings.panicMode; $("#music-on").checked = settings.music; $("#games-on").checked = settings.games; $("#movies-on").checked = settings.movies; if ($("#tools-on")) $("#tools-on").checked = settings.tools; if ($("#chat-on")) $("#chat-on").checked = settings.chat !== false; $("#ai-on").checked = settings.ai; $("#name").value = settings.name;
  buildAppearance(); say("");
  NV.refreshMusicChips && NV.refreshMusicChips();
}
function openSettings(sec) {
  openPage("settings");
  if (sec) showSec(sec);
}
function showSec(id) {
  $$(".nb").forEach((b) => b.classList.toggle("on", b.dataset.sec === id));
  $$(".sec").forEach((s) => s.classList.toggle("on", s.id === "sec-" + id));
  $(".spane").scrollTop = 0;
  if (id === "diagnostics") { // the Diagnostics tool is drawn the first time this section is opened
    const box = $("#diag-root");
    if (box && !box.dataset.ready && window.__nvDiagMount) apiReady.then(() => { if (!box.dataset.ready) { box.dataset.ready = "1"; window.__nvDiagMount(box); } });
  }
  syncChrome();
}
$(".snav").addEventListener("click", (e) => { const b = e.target.closest(".nb"); if (b) showSec(b.dataset.sec); });
$("#open-settings").addEventListener("click", () => openSettings());

$("#wisp-test").addEventListener("click", async () => {
  const url = normalizeWisp($("#wisp-url").value);
  if (!url) return say("enter a wisp server address.", "bad");
  say("testing connection…");
  const ok = await testWisp(url);
  if (ok) { wispOk = true; hideBanner("wisp"); }
  say(ok ? "server is reachable." : "couldn't connect. check the address and that it ends in /wisp/.", ok ? "ok" : "bad");
});
$("#wisp-default").addEventListener("click", () => { $("#wisp-url").value = defaultWisp; say(""); });
$("#wisp-save").addEventListener("click", async () => {
  const url = normalizeWisp($("#wisp-url").value);
  if (!url) return say("enter a wisp server address.", "bad");
  settings.wisp = url; activeWisp = url; save(); $("#wisp-url").value = url;
  try { await applyTransport(); say("server saved. new requests will use it.", "ok"); }
  catch { say("couldn't switch servers. reload the page and try again.", "bad"); }
});
$("#engine").addEventListener("change", (e) => { settings.engine = e.target.value; save(); });
$("#adblock").addEventListener("change", (e) => { settings.adblock = e.target.checked; save(); pushAdblock(); });
$("#clock").addEventListener("change", (e) => { settings.clock = e.target.checked; save(); tickClock(); });
$("#h24").addEventListener("change", (e) => { settings.h24 = e.target.checked; save(); tickClock(); });
$("#music-on").addEventListener("change", (e) => { settings.music = e.target.checked; save(); NV.applyMusicToggle && NV.applyMusicToggle(); });
$("#wisp-auto").addEventListener("change", (e) => { settings.wispAuto = e.target.checked; save(); });
// the launch mode select offers all four ways to open Nex.Velo, or asking every time
$("#launch-mode").innerHTML = [["here", "continue on the main page"], ["blank", "about:blank"], ["blob", "blob cloak"], ["window", "window about:blank"]].map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
$("#launch-mode").addEventListener("change", (e) => { settings.launch = e.target.value; save(); });
$("#launch-redirect").addEventListener("change", (e) => { settings.launchRedirect = e.target.checked; save(); });
$("#panic-on").addEventListener("change", (e) => { settings.panicOn = e.target.checked; save(); });
$("#panic-site").addEventListener("change", (e) => { settings.panicSite = e.target.value; $("#panic-url-fld").hidden = e.target.value !== "custom"; save(); });
$("#panic-mode").addEventListener("change", (e) => { settings.panicMode = e.target.value; save(); });
$("#panic-url").addEventListener("change", (e) => { let u = e.target.value.trim(); if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u; settings.panicUrl = u; e.target.value = u; save(); });
// Pick the escape key: click the button, then press the key you want. Escape itself can be chosen now. Click the button again to cancel.
$("#panic-key").addEventListener("click", (e) => {
  capturing = !capturing;
  e.target.textContent = capturing ? "press a key…" : settings.panicKey;
});
addEventListener("keydown", (e) => {
  if (!capturing) return;
  if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) return; // wait for the real key
  e.preventDefault(); e.stopPropagation(); capturing = false;
  settings.panicKey = e.key.length === 1 ? e.key.toLowerCase() : e.key; save();
  $("#panic-key").textContent = settings.panicKey;
  toast("escape key set to " + settings.panicKey);
}, true);
$("#ai-on").addEventListener("change", (e) => { settings.ai = e.target.checked; save(); });
$("#games-on").addEventListener("change", (e) => { settings.games = e.target.checked; save(); });
$("#movies-on").addEventListener("change", (e) => { settings.movies = e.target.checked; save(); });
// the Movies switch in Settings > apps now controls Entertainment, and Tools gets a switch of its own
(function appsSection() {
  const m = $("#movies-on"), row = m && m.closest("label"); if (!row) return;
  const b = $("b", row), sm = $("small", row);
  if (b) b.textContent = "entertainment"; if (sm) sm.textContent = "movies, tv shows, books and audiobooks. everything is free and legal to watch, read or listen to";
  if ($("#tools-on")) return;
  const n = document.createElement("label"); n.className = "switch";
  n.innerHTML = '<div><b>tools</b><small>a password generator, random numbers, word counter, converters and more</small></div><input type="checkbox" id="tools-on">';
  row.after(n); const t = $("#tools-on"); t.checked = settings.tools;
  t.addEventListener("change", (e) => { settings.tools = e.target.checked; save(); });
  const c = document.createElement("label"); c.className = "switch";
  c.innerHTML = '<div><b>chat</b><small>Vortex chat, with your sign-in saved on this device</small></div><input type="checkbox" id="chat-on">';
  n.after(c); const ch = $("#chat-on"); ch.checked = settings.chat !== false;
  ch.addEventListener("change", (e) => { settings.chat = e.target.checked; save(); });
})();
$("#name").addEventListener("input", (e) => { settings.name = e.target.value.trim(); save(); tickClock(); });

/* account: backup / restore / reset */
const DATA_KEYS = ["nexvelo.settings", "nexvelo.playlists", "nexvelo.recent", "nexvelo.music", "nexvelo.volume", "nexvelo.tabs", "nexvelo.ai", "nexvelo.servers"];
$("#exp").addEventListener("click", () => {
  const out = {}; DATA_KEYS.forEach((k) => { out[k] = LS.get(k, null); });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }));
  a.download = "nex-velo-data.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$("#imp").addEventListener("click", () => $("#imp-file").click());
$("#imp-file").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    DATA_KEYS.forEach((k) => { if (typeof data[k] === "string") LS.set(k, data[k]); });
    toast("imported. reloading…"); setTimeout(() => location.reload(), 700);
  } catch { toast("that file couldn't be read."); }
});
(function layoutButton() { // run the first-visit setup again from Settings
  const reset = $("#reset"); if (!reset || $("#redo-setup")) return;
  const b = document.createElement("button"); b.className = "btn"; b.id = "redo-setup"; b.type = "button"; b.textContent = "change layout and launch mode…";
  b.addEventListener("click", () => (NV.runSetup ? NV.runSetup() : toast("the setup file hasn't loaded yet")));
  reset.before(b);
  const ib = document.createElement("button"); ib.className = "btn"; ib.id = "install-app"; ib.type = "button"; ib.textContent = "install as an app";
  ib.addEventListener("click", async () => { if (install.can()) { const r = await install.prompt(); toast(r === "accepted" ? "installing Nex.Velo…" : "install cancelled"); } else showBanner(install.help(), false, "info"); });
  reset.before(ib);
})();
$("#reset").addEventListener("click", () => {
  if (!confirm("reset all settings, playlists and recently played on this browser?")) return;
  DATA_KEYS.forEach(LS.del); location.reload();
});

/* ================= Apps (the nine-dot button in the top bar) ================= */
const APP_SVG = {
  games: '<svg viewBox="0 0 24 24"><path d="M6 9h12a3 3 0 0 1 3 3.2l-.6 4A2.4 2.4 0 0 1 16 17.3L15 15H9l-1 2.3a2.4 2.4 0 0 1-4.4-1.1l-.6-4A3 3 0 0 1 6 9z"/><path d="M8 11v3M6.5 12.5h3M16 12h.01M18 13.5h.01"/></svg>',
  entertainment: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M17 2l-5 5-5-5"/></svg>',
  tools: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-2.6-.6-.6-2.6z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  ai: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/></svg>',
  servers: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>',
  diagnostics: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
};
// [id, name, shown?, what it does]
const APPS = [
  ["games", "Games", () => settings.games, () => openPage("games")],
  ["music", "Music", () => settings.music, () => openPage("music")],
  ["entertainment", "Entertainment", () => settings.movies, () => openPage("entertainment")],
  ["tools", "Tools", () => settings.tools, () => openPage("tools")],
  ["chat", "Chat", () => settings.chat !== false, () => openPage("chat")],
  ["ai", "AI", () => settings.ai, () => openPage("ai")],
];
let appsOpen = false, appsTimer = 0;
function openApps() {
  const menu = $("#apps-menu"), btn = $("#apps-btn");
  clearTimeout(appsTimer);
  const shown = APPS.filter((a) => a[2]());
  menu.innerHTML = shown.length ? shown.map((a) => `<button class="app-tile" role="menuitem" data-app="${a[0]}">${APP_SVG[a[0]]}<span>${esc(a[1])}</span></button>`).join("") : '<div class="empty">no apps are turned on. turn them on in Settings → apps.</div>';
  const r = btn.getBoundingClientRect();
  menu.style.top = r.bottom + 8 + "px"; menu.style.right = Math.max(8, innerWidth - r.right - 4) + "px"; menu.style.left = "auto";
  menu.hidden = false; menu.className = "in"; appsOpen = true;
  btn.setAttribute("aria-expanded", "true");
}
function closeApps() {
  if (!appsOpen) return;
  const menu = $("#apps-menu");
  appsOpen = false; $("#apps-btn").setAttribute("aria-expanded", "false");
  menu.className = "out";
  appsTimer = setTimeout(() => { if (!appsOpen) { menu.hidden = true; menu.className = ""; } }, reduceMotion() ? 0 : 150);
}
$("#apps-btn").addEventListener("click", () => (appsOpen ? closeApps() : openApps()));
$("#apps-menu").addEventListener("click", (e) => {
  const b = e.target.closest("[data-app]"); if (!b) return;
  const a = APPS.find((x) => x[0] === b.dataset.app); closeApps(); a && a[3]();
});
document.addEventListener("pointerdown", (e) => { if (appsOpen && !e.target.closest("#apps-menu, #apps-btn")) closeApps(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && appsOpen) closeApps(); });
addEventListener("blur", () => closeApps()); // clicking into a page frame

/* ================= Tour ================= */
const STEPS = [
  ["#tabs", "these are your tabs. every tab is its own proxied page."],
  ["#new-tab", "open a new tab here."],
  ["#apps-btn", "the nine dots open your apps: games, music, entertainment, tools and ai."],
  ["#open-settings", "themes, wallpapers, your wisp server and more."],
  [".view.active .omni", "type a search or a web address and press enter."],
];
function startTour() {
  const steps = STEPS.filter(([s]) => { const el = $(s); return el && el.offsetParent !== null; });
  if (!steps.length) return;
  let i = 0;
  const ov = $("#tour"), hl = $("#tour-hl"), card = $("#tour-card"), next = $("#tour-next");
  ov.hidden = false;
  const show = () => {
    const [sel, text] = steps[i], r = $(sel).getBoundingClientRect(), pad = 6;
    Object.assign(hl.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
    $("#tour-text").textContent = text;
    next.textContent = i === steps.length - 1 ? "done" : "next";
    const cw = Math.min(280, innerWidth * .86);
    const below = r.bottom + 14 + 130 < innerHeight;
    card.style.top = (below ? r.bottom + 14 : Math.max(8, r.top - 14 - 130)) + "px";
    card.style.left = Math.max(8, Math.min(innerWidth - cw - 8, r.left + r.width / 2 - cw / 2)) + "px";
  };
  const end = () => { ov.hidden = true; next.onclick = null; $("#tour-skip").onclick = null; };
  next.onclick = () => { if (++i >= steps.length) end(); else show(); };
  $("#tour-skip").onclick = end;
  show();
}
$("#tour-btn").addEventListener("click", startTour);

/* ================= Boot ================= */
const NV = window.NV = {
  settings, save, esc, toast, spring, openSettings, openPage, openUrl: (u) => newTab({ url: u }), LS, defaultWisp, VERSION, api: (p) => API + p, testWisp, normalizeWisp,
  proxyFrame: async (url) => { await ready; const f = scramjet.createFrame(); f.go(url); return f.frame; },
  setWisp: async (url) => { settings.wisp = url; activeWisp = url; save(); $("#wisp-url").value = url; await applyTransport(); },
  activeWisp: () => activeWisp, loaded: {}, rawFetch: _fetch, apiBase: () => API || location.origin,
  syncChrome: () => syncChrome(), routeTo: (a) => routeAlias(a), panic: panicHandler,
  repairProxy: () => repairProxy(true),
  newTab, closeTab, select, go, hist: histTab, reloadTab, homeTab, displayUrl, panicDest, wallSrcNow, desktopMode: false,
  FONTS, loadFont, THEMES, LIVE, applyTheme, applyWall, onLiveReady: () => applyWall(),
  install, showBanner, hideBanner,
  setSession: (o) => { Object.assign(sessionOnly, o); try { sessionStorage.setItem("nexvelo.session", JSON.stringify(sessionOnly)); } catch {} },
  getSession: () => ({ ...sessionOnly }),
};
// Entertainment and Tools live in their own files. They are loaded from here so index.html doesn't need to change.
for (const f of ["entertainment.js", "tools.js", "chat.js", "setup.js"]) {
  const s = document.createElement("script"); s.src = "/" + f; s.onerror = () => showBanner("couldn't load " + f + ". upload it to the public folder and refresh.");
  document.head.appendChild(s);
}
applyTheme(); applyWall();
$("#ver").textContent = "v" + VERSION;
$("#logo").addEventListener("click", () => newTab());

function bootTabs() {
  restoring = true;
  let saved = null; try { saved = JSON.parse(LS.get("nexvelo.tabs", "null")); } catch {}
  if (saved && saved.t && saved.t.length) {
    saved.t.forEach((x) => { if (x.k === "movies") x.k = "entertainment"; if (x.k === "web" || PAGES[x.k]) if (!(PAGES[x.k] && tabs.some((t) => t.kind === x.k))) newTab({ kind: x.k, url: x.u, lazy: true }); });
  }
  restoring = false;
  if (!tabs.length) newTab(); else select(tabs[Math.min(Math.max(saved.a, 0), tabs.length - 1)] || tabs[0]);
}
// Desktop mode (chosen in the setup) loads its own file. Everything opens in windows there instead of tabs.
if (settings.mode === "desktop") {
  const d = document.createElement("script"); d.src = "/desktop.js";
  d.onload = () => NV.desktopStart();
  d.onerror = () => { showBanner("couldn't load desktop.js. upload it to the public folder. the normal layout is shown for now."); bootTabs(); };
  document.head.appendChild(d);
} else bootTabs();

apiReady.then(renderMarks);

const checkModules = () => {
  const need = { music: "music.js", ai: "ai.js", games: "games.js", movies: "movies.js", servers: "servers.js" };
  const miss = Object.entries(need).filter(([k]) => !NV.loaded[k]).map(([, f]) => f);
  if (miss.length) showBanner("these parts couldn't start: " + miss.join(", ") + ". upload the newest files to the public folder and clear the CDN cache.");
};
if (window.__nvScriptsDone) setTimeout(checkModules, 300); else addEventListener("nv-scripts", () => setTimeout(checkModules, 300), { once: true });

/* ================= Automatic updates ================= */
// version.json on the host holds the newest version number. When it differs from this page, offer the update and apply it.
let updating = false, laterUntil = 0;
const typing = () => { const a = document.activeElement; return !!a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && !!a.value && a.type !== "range" && a.type !== "checkbox"; };
function applyUpdate(v) { location.replace(location.pathname + "?nv=" + encodeURIComponent(v) + location.hash); }
function offerUpdate(v) {
  const bar = $("#update"); if (!bar || updating || Date.now() < laterUntil) return;
  updating = true; let n = 20;
  const paint = () => { bar.innerHTML = `<span>Nex.Velo v${esc(v)} is ready. updating in ${n}s…</span><button class="btn" data-now type="button">update now</button><button class="btn" data-later type="button">later</button>`; };
  paint(); bar.hidden = false;
  const tick = setInterval(() => { if (typing()) { n = 20; paint(); return; } if (--n <= 0) { clearInterval(tick); applyUpdate(v); } else paint(); }, 1000);
  bar.onclick = (e) => {
    if (e.target.closest("[data-now]")) { clearInterval(tick); applyUpdate(v); }
    if (e.target.closest("[data-later]")) { clearInterval(tick); bar.hidden = true; updating = false; laterUntil = Date.now() + 30 * 60 * 1000; }
  };
}
async function checkUpdate() {
  try {
    for (const file of ["/version.json", "/version.js"]) {
      const r = await _fetch(file + "?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) continue;
      const v = JSON.parse(await r.text()).version; if (v && v !== VERSION) offerUpdate(v); break;
    }
  } catch {}
  try { const reg = await navigator.serviceWorker?.getRegistration(); reg && reg.update(); } catch {}
}
setTimeout(checkUpdate, 20000);
setInterval(checkUpdate, 5 * 60 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkUpdate(); });
document.addEventListener("change", (e) => { if (/^(music|games|movies|ai|tools|chat)-on$/.test(e.target.id) && NV.onSettingsApps) NV.onSettingsApps(); }); // the desktop dock follows the app switches

})();