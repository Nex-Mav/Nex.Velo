import { fork } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { splitGameName } from "./namesplit.js"; // turns "cl10minutestildawn" into "10 Minutes Til Dawn"

export function registerApi(app) {
  // Let other hosts (e.g. the Vercel copy of the site) call the API on this server.
@@ -23,10 +24,20 @@ export function registerApi(app) {
    Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

  const urlCache = new Map();
  const cached = async (k, fn, ttl = 20 * 60 * 1000) => {
  const inflight = new Map();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Several parts of the page can ask for the same thing at once. They now share one request instead of each making their own.
  // With keepOld, a failed refresh gives back the last good result instead of an error (used for game lists).
  const cached = async (k, fn, ttl = 20 * 60 * 1000, keepOld = false) => {
    const h = urlCache.get(k);
    if (h && Date.now() - h.t < ttl) return h.v;
    const v = await fn(); urlCache.set(k, { t: Date.now(), v }); return v;
    if (inflight.has(k)) return inflight.get(k);
    const p = (async () => {
      try { const v = await fn(); urlCache.set(k, { t: Date.now(), v }); return v; }
      catch (e) { if (keepOld && h) return h.v; throw e; }
      finally { inflight.delete(k); }
    })();
    inflight.set(k, p); return p;
  };

  async function fetchText(url) {
@@ -297,8 +308,16 @@ export function registerApi(app) {
  }

  async function ytdlUrl(id) {
    const mod = await import("@distube/ytdl-core");
    const ytdl = [mod?.default?.default, mod?.default, mod].find((x) => typeof x === "function" || typeof x?.getInfo === "function");
    let ytdl = null; const tried = [];
    for (const name of ["@distube/ytdl-core", "ytdl-core", "@ybd-project/ytdl-core"]) {
      try {
        const mod = await import(name);
        const found = [mod?.default?.default, mod?.default, mod, mod?.ytdl].find((x) => x && typeof x.getInfo === "function");
        if (found) { ytdl = found; break; }
        tried.push(name + " loaded but has no getInfo (it exports: " + Object.keys(mod).slice(0, 6).join(", ") + ")");
      } catch { tried.push(name + " is not installed"); }
    }
    if (!ytdl) throw new Error("no working YouTube downloader: " + tried.join("; "));
    const info = await withTimeout(ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`), 8000);
    const audio = info.formats.filter((f) => f.hasAudio && !f.hasVideo);
    const byRate = (a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0);
@@ -551,9 +570,9 @@ export function registerApi(app) {

  app.get("/api/games/list", async (req, reply) => {
    const site = String(req.query?.src || req.query?.site || "");
    if (site === "gn" || site === "cherri" || site === "obsidian") {
    if (site === "gn" || site === "cherri" || site === "obsidian" || site === "ugs") {
      try {
        const games = await (site === "gn" ? gnGames() : site === "cherri" ? cherriGames() : obsidianGames());
        const games = await (site === "gn" ? gnGames() : site === "cherri" ? cherriGames() : site === "ugs" ? ugsGames() : obsidianGames());
        return { games, count: games.length, kind: "library" };
      }
      catch (e) { console.warn("[games]", site, String(e?.message || e)); reply.code(502); return { games: [], error: String(e?.message || e) }; }
@@ -588,18 +607,20 @@ export function registerApi(app) {
  const FILE_MIME = { html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", js: "application/javascript; charset=utf-8", mjs: "application/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon", wasm: "application/wasm", mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", txt: "text/plain; charset=utf-8", xml: "application/xml" };
  const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");
  const OBS = { owner: "Obsidian-ig", repo: "ObsidiansUnblockedRevamped", branch: "main2" };
  const UGS = { owner: "bubbls", repo: "ugs-singlefile", branch: "main" }; // the Ultimate Game Stash: one html file per game in UGS-Files/
  const LIB_RAW = {
    cherri: (p) => `https://gitlab.com/x8r/cherrigames/-/raw/main/${encPath(p)}`,
    gnhtml: (p) => `https://cdn.jsdelivr.net/gh/gn-math/html@main/${encPath(p)}`,
    gnassets: (p) => `https://cdn.jsdelivr.net/gh/gn-math/assets@main/${encPath(p)}`,
    gncovers: (p) => `https://cdn.jsdelivr.net/gh/gn-math/covers@main/${encPath(p)}`,
    obsidian: (p) => `https://raw.githubusercontent.com/${OBS.owner}/${OBS.repo}/${OBS.branch}/${encPath(p)}`,
  };
  // a second place to try when the first one fails (jsDelivr refuses files over 20 MB and sometimes lags behind GitHub)
  const LIB_ALT = {
    gnhtml: (p) => `https://raw.githubusercontent.com/gn-math/html/main/${encPath(p)}`,
    gnassets: (p) => `https://raw.githubusercontent.com/gn-math/assets/main/${encPath(p)}`,
    gncovers: (p) => `https://raw.githubusercontent.com/gn-math/covers/main/${encPath(p)}`,
    ugs: (p) => `https://raw.githubusercontent.com/${UGS.owner}/${UGS.repo}/${UGS.branch}/${encPath(p)}`,
    obsidian: (p) => `https://raw.githubusercontent.com/${OBS.owner}/${OBS.repo}/${OBS.branch}/${encPath(p)}`,
  };
  // a second place to try when the first one fails
  const LIB_ALT = {
    gnhtml: (p) => `https://cdn.jsdelivr.net/gh/gn-math/html@main/${encPath(p)}`,
    gnassets: (p) => `https://cdn.jsdelivr.net/gh/gn-math/assets@main/${encPath(p)}`,
    gncovers: (p) => `https://cdn.jsdelivr.net/gh/gn-math/covers@main/${encPath(p)}`,
    cherri: (p) => `https://cdn.jsdelivr.net/gl/x8r/cherrigames@main/${encPath(p)}`,
  };
  const htmlEsc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
@@ -628,15 +649,19 @@ export function registerApi(app) {
    return d ? d[0] + GAME_PROBE + html.slice(d[0].length) : GAME_PROBE + html;
  };

  async function fetchLib(lib, p) {
    const grab = (u) => withTimeout(fetch(u, { headers: { "user-agent": UA }, redirect: "follow" }), 25000);
    let up = await grab(LIB_RAW[lib](p)).catch(() => null);
    if ((!up || !up.ok) && LIB_ALT[lib]) up = await grab(LIB_ALT[lib](p)).catch(() => up);
    return up;
  }
  app.get("/api/games/f/:lib/*", async (req, reply) => {
    const lib = req.params.lib; let p = String(req.params["*"] || "");
    try { p = decodeURIComponent(p); } catch {}
    if (!LIB_RAW[lib] || p.includes("..") || p.includes("\\")) return fileErr(reply, 400, lib, p, "not a valid game file address");
    if (!p || p.endsWith("/")) p += "index.html";
    try {
      const grab = (u) => withTimeout(fetch(u, { headers: { "user-agent": UA }, redirect: "follow" }), 25000);
      let up = await grab(LIB_RAW[lib](p)).catch(() => null);
      if ((!up || !up.ok) && LIB_ALT[lib]) up = await grab(LIB_ALT[lib](p)).catch(() => up);
      const up = await fetchLib(lib, p);
      if (!up) return fileErr(reply, 502, lib, p, "couldn't reach " + LIB_RAW[lib](p));
      if (!up.ok) return fileErr(reply, up.status === 404 ? 404 : 502, lib, p, `the ${lib} repository answered HTTP ${up.status} for ${LIB_RAW[lib](p)}`);
      const ext = ((p.match(/\.([a-z0-9]+)$/i) || [])[1] || "").toLowerCase();
@@ -673,23 +698,25 @@ export function registerApi(app) {
      });
      if (!games.length) throw new Error("the GN Math list was empty");
      games.sort((a, b) => a.name.localeCompare(b.name)); return games;
    }, 6 * 60 * 60 * 1000);
    }, 6 * 60 * 60 * 1000, true);
  }

  async function cherriGames() {
    return cached("cherri:list", async () => {
      const proj = encodeURIComponent("x8r/cherrigames");
      const paths = [];
      let done = false; // true once the last page of the file list has been read
      for (let page = 1; !done && page <= 400; page += 8) { // eight pages at a time
        let res;
        try {
          res = await Promise.all(Array.from({ length: 8 }, async (_, i) => {
            const r = await withTimeout(fetch(`https://gitlab.com/api/v4/projects/${proj}/repository/tree?recursive=true&per_page=100&page=${page + i}&ref=main`, { headers: { "user-agent": UA } }), 25000);
            if (!r.ok) throw new Error("GitLab answered " + r.status);
            return r.json();
          }));
        } catch (e) { if (paths.length) break; throw e; }
      const readPage = async (n) => { // GitLab limits how fast one address may ask. when it says slow down, wait and try again
        for (let attempt = 0; attempt < 6; attempt++) {
          const r = await withTimeout(fetch(`https://gitlab.com/api/v4/projects/${proj}/repository/tree?recursive=true&per_page=100&page=${n}&ref=main`, { headers: { "user-agent": UA } }), 25000);
          if (r.status === 429 || r.status >= 500) { await sleep(Math.min(20000, (Number(r.headers.get("retry-after")) || 2 * (attempt + 1)) * 1000)); continue; }
          if (!r.ok) throw new Error("GitLab answered " + r.status);
          return r.json();
        }
        throw new Error("GitLab is slowing this server down (HTTP 429). try again in a minute");
      };
      for (let page = 1; !done && page <= 400; page += 3) { // three pages at a time. a failure stops everything (a half list is worse than an error)
        const res = await Promise.all([0, 1, 2].map((i) => readPage(page + i)));
        for (const rows of res) { for (const x of rows) if (x.type === "blob") paths.push(x.path); if (rows.length < 100) done = true; }
      }
      const pathSet = new Set(paths), complete = done; // a missing file only proves something if the whole file list was read
@@ -744,7 +771,37 @@ export function registerApi(app) {
      }
      if (!games.length) throw new Error("no games found in the Cherri repository (" + paths.length + " files looked at)");
      games.sort((a, b) => a.name.localeCompare(b.name)); return games;
    }, 6 * 60 * 60 * 1000);
    }, 6 * 60 * 60 * 1000, true);
  }

  // UGS (Ultimate Game Stash): every game is one file in UGS-Files/, named like cl10minutestildawn.html.
  // The "cl" is dropped and the run-together words are spaced out ("10 Minutes Til Dawn").
  async function ugsGames() {
    return cached("ugs:list", async () => {
      const headers = { "user-agent": UA, accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { authorization: "Bearer " + process.env.GITHUB_TOKEN } : {}) };
      const gh = async (path) => {
        const r = await withTimeout(fetch(`https://api.github.com/repos/${UGS.owner}/${UGS.repo}/${path}`, { headers }), 25000);
        if (!r.ok) throw new Error("GitHub answered " + r.status + (r.status === 403 ? " (rate limit: add a GITHUB_TOKEN variable on the server)" : ""));
        return r.json();
      };
      let files = [], why = "";
      try {
        const root = await gh("git/trees/" + UGS.branch);
        const dir = (root.tree || []).find((x) => x.path === "UGS-Files" && x.type === "tree");
        if (!dir) throw new Error("the repository has no UGS-Files folder");
        files = ((await gh("git/trees/" + dir.sha)).tree || []).filter((x) => x.type === "blob" && /\.html?$/i.test(x.path)).map((x) => x.path);
      } catch (e) { why = String(e?.message || e); }
      if (!files.length) { // second way: the repository keeps its own list of names in games.js
        try {
          const txt = await (await withTimeout(fetch(LIB_RAW.ugs("games.js"), { headers: { "user-agent": UA } }), 20000)).text();
          files = [...new Set([...txt.matchAll(/["'](cl[A-Za-z0-9_-]+)["']/g)].map((m) => m[1] + ".html"))];
        } catch {}
      }
      if (!files.length) throw new Error("couldn't read the UGS list (" + (why || "no files found") + ")");
      const games = files.filter((f) => !/^index\.html?$/i.test(f)).map((f) => ({ name: splitGameName(f), play: "/api/games/f/ugs/UGS-Files/" + encPath(f), thumb: "" }));
      games.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
      return games;
    }, 12 * 60 * 60 * 1000, true);
  }

  // Obsidian's Unblocked Revamped (archived GitHub repo). Only its games/ folder is read, one folder per game.
@@ -1064,17 +1121,17 @@ let LOCAL_MODEL = LOCAL_MODELS[0];
      try { const info = await withTimeout(fn(), limit); return { ok: true, ms: Date.now() - s, info }; }
      catch (e) { return { ok: false, ms: Date.now() - s, error: String(e?.message || e).slice(0, 700) }; }
    };
    const names = ["youtubeSearch", "youtubeAudio", "soundcloudSearch", "soundcloudAudio", "audiusSearch", "audiusAudio", "gnMath", "cherri", "obsidian", "transformersPackage", "modelFile", "wikipedia", "gnFile", "cherriFile", "obsidianFile", ...(req.query?.load ? ["modelLoad"] : [])];
    const names = ["youtubeSearch", "youtubeAudio", "soundcloudSearch", "soundcloudAudio", "audiusSearch", "audiusAudio", "gnMath", "cherri", "obsidian", "ugs", "transformersPackage", "modelFile", "wikipedia", "gnFile", "cherriFile", "obsidianFile", "ugsFile", ...(req.query?.load ? ["modelLoad"] : [])];
    // picks a couple of real games from a list and asks the source whether their files exist
    const fileProbe = async (listFn) => {
      const games = await listFn();
      const out = [];
      for (const g of [games[0], games[Math.floor(games.length / 2)]].filter(Boolean)) {
        const m = String(g.play || "").match(/^\/api\/games\/f\/([a-z]+)\/(.+)$/); if (!m) continue;
        const p = decodeURIComponent(m[2]);
        const r = await withTimeout(fetch(LIB_RAW[m[1]](p), { headers: { "user-agent": UA }, redirect: "follow" }), 20000);
        try { r.body?.cancel(); } catch {}
        out.push(`${g.name} -> ${r.ok ? "ok" : "HTTP " + r.status} (${m[1]}/${p.slice(0, 70)})`);
        const r = await fetchLib(m[1], p); // the same way the game route gets files, including its second source
        if (r) { try { r.body?.cancel(); } catch {} }
        out.push(`${g.name} -> ${r && r.ok ? "ok" : r ? "HTTP " + r.status : "no answer"} (${m[1]}/${p.slice(0, 70)})`);
      }
      if (!out.length) throw new Error("no playable games to test");
      if (out.some((x) => !x.includes("-> ok"))) throw new Error(out.join(" | "));
@@ -1090,12 +1147,14 @@ let LOCAL_MODEL = LOCAL_MODELS[0];
      t(async () => (await gnGames()).length + " games"),
      t(async () => (await cherriGames()).length + " games"),
      t(async () => (await obsidianGames()).length + " games"),
      t(async () => { const g = await ugsGames(); return g.length + " games, e.g. " + g.slice(5, 8).map((x) => x.name).join(", "); }),
      t(async () => { const name = "@huggingface/" + "transformers"; const T = await import(name); return "installed" + (T.env?.version ? " v" + T.env.version : ""); }),
      t(async () => { const id = LOCAL_MODELS[0]; const r = await withTimeout(fetch(`https://huggingface.co/${id}/resolve/main/onnx/model_q4.onnx`, { method: "HEAD", headers: { "user-agent": UA }, redirect: "follow" }), 15000); if (!r.ok) throw new Error(id + " model file: HTTP " + r.status); return id + ": file found, " + Math.round((Number(r.headers.get("content-length")) || 0) / 1e6) + " MB"; }),
      t(async () => { const r = await wikiFacts("What is the moon?"); if (!r) throw new Error("no answer"); return "ok"; }),
      t(() => fileProbe(gnGames)),
      t(() => fileProbe(cherriGames)),
      t(() => fileProbe(obsidianGames)),
      t(() => fileProbe(ugsGames)),
      ...(req.query?.load ? [t(async () => { await getLocal(); return "model loaded: " + LOCAL_MODEL; }, 170000)] : []),
    ];
    const done = await Promise.all(jobs);
