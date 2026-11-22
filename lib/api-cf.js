// All /api routes for Cloudflare Workers. Same routes as lib/api.js (which still runs on Railway/Vercel), rewritten for Workers:
//   - no Node-only code (no child processes, files or Node streams): responses are web streams
//   - settings come from the Worker's variables and secrets, not process.env
//   - Nex.AI answers with Cloudflare Workers AI (the "AI" binding), with Groq as an optional extra
//   - YouTube search/audio go through public Piped servers (the YouTube libraries can't run on Workers)
//   - the "visitors online" count lives in a Durable Object (LIVE)
// Generated from lib/api.js and then edited by hand: when you change a route in api.js, change it here too.

import { registerLibrary } from "./library-cf.js";
import { registerMovies } from "./movies-cf.js";
import { splitGameName, loadWords } from "./namesplit-cf.js";
import { streamFrom } from "./cf-app.js";

// The Worker's variables, secrets and bindings. Filled in at the start of every request (see worker-api/index.js).
export const ENV = {};
export const setEnv = (env) => { Object.assign(ENV, env || {}); };
const toBytes = (x) => new Uint8Array(x);

export function registerApi(app) {
  // Let other hosts (Pages, Vercel, GitHub Pages...) call the API on this server.
  app.addHook("onRequest", async (req, reply) => {
    if (!req.url.startsWith("/api/")) return;
    reply.header("access-control-allow-origin", "*")
      .header("access-control-allow-headers", "content-type,x-groq-key,range")
      .header("access-control-allow-methods", "GET,POST,OPTIONS")
      .header("access-control-expose-headers", "x-model,content-range,accept-ranges");
    if (req.method === "OPTIONS") { reply.code(204); return reply.send(); }
  });

  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
  const withTimeout = (p, ms) =>
    Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

  const urlCache = new Map();
  const inflight = new Map();
  // Several parts of the page can ask for the same thing at once. They share one request instead of each making their own.
  // With keepOld, a failed refresh gives back the last good result instead of an error (used for game lists).
  // (A Worker can be stopped at any time, so this only helps while the same copy keeps running.)
  const cached = async (k, fn, ttl = 20 * 60 * 1000, keepOld = false) => {
    const h = urlCache.get(k);
    if (h && Date.now() - h.t < ttl) return h.v;
    if (inflight.has(k)) return inflight.get(k);
    const p = (async () => {
      try { const v = await fn(); urlCache.set(k, { t: Date.now(), v }); return v; }
      catch (e) { if (keepOld && h) return h.v; throw e; }
      finally { inflight.delete(k); }
    })();
    inflight.set(k, p); return p;
  };

  const movies = registerMovies(app, { withTimeout, UA, cached, ENV });
  registerLibrary(app, { withTimeout, UA, cached });

  async function fetchText(url) {
    const r = await withTimeout(fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xml,*/*" }, redirect: "follow" }), 12000);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.text();
  }

  /* ================= Music search: YouTube (through Piped) + SoundCloud + Audius ================= */
  // Every source is optional. If one fails, the others still work.
  const status = { youtube: false, soundcloud: false, audius: false };

  // Public Piped servers (they come and go; set PIPED_INSTANCES to a comma-separated list to choose your own)
  const pipedBases = () => (ENV.PIPED_INSTANCES || "https://pipedapi.kavin.rocks,https://pipedapi.adminforge.de,https://api.piped.private.coffee").split(",").map((x) => x.trim()).filter(Boolean);

  async function searchYouTube(q) {
    const rows = await Promise.any(pipedBases().map(async (base) => {
      const r = await withTimeout(fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=music_songs`, { headers: { "user-agent": UA } }), 6000);
      if (!r.ok) throw new Error("piped " + r.status);
      const d = await r.json();
      const items = (d.items || []).filter((x) => x.url && /[?&]v=/.test(x.url));
      if (!items.length) throw new Error("no results");
      return items;
    })).catch(() => { throw new Error("no Piped server answered the search"); });
    status.youtube = true;
    return rows.slice(0, 10).map((r) => ({
      source: "youtube",
      id: (r.url.match(/[?&]v=([\w-]{6,})/) || [])[1],
      title: r.title,
      artist: String(r.uploaderName || "").replace(/\s*-\s*Topic$/i, ""),
      thumb: r.thumbnail || "",
      dur: r.duration > 0 ? r.duration : 0,
    })).filter((t) => t.id);
  }

  /* ---- SoundCloud, talked to directly (no library): find a public client id, then use the v2 API ---- */
  const sc2 = { id: "", t: 0, pending: null };

  async function scClientId(force) {
    if (!force && ENV.SOUNDCLOUD_CLIENT_ID) return ENV.SOUNDCLOUD_CLIENT_ID;
    if (!force && sc2.id && Date.now() - sc2.t < 6 * 60 * 60 * 1000) return sc2.id;
    if (!force && sc2.pending) return sc2.pending;
    sc2.pending = (async () => {
      const hr = await withTimeout(fetch("https://soundcloud.com/", { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.9" }, redirect: "follow" }), 15000);
      if (!hr.ok) throw new Error("soundcloud.com answered " + hr.status);
      const home = await hr.text();
      const scripts = [...home.matchAll(/<script[^>]+src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
      for (const s of scripts.reverse()) {
        try {
          const js = await withTimeout(fetch(s, { headers: { "user-agent": UA } }).then((r) => r.text()), 15000);
          const m = js.match(/client_id\s*[:=]\s*"([a-zA-Z0-9]{32})"/);
          if (m) { sc2.id = m[1]; sc2.t = Date.now(); status.soundcloud = true; return m[1]; }
        } catch {}
      }
      throw new Error("couldn't find a soundcloud client id");
    })();
    sc2.pending.then(() => { sc2.pending = null; }, () => { sc2.pending = null; });
    return sc2.pending;
  }

  async function scGet(url, params = {}, retry = true) {
    const id = await scClientId();
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    u.searchParams.set("client_id", id);
    const r = await withTimeout(fetch(u, { headers: { "user-agent": UA, accept: "application/json" } }), 12000);
    if ((r.status === 401 || r.status === 403) && retry) { await scClientId(true); return scGet(url, params, false); }
    if (!r.ok) throw new Error("soundcloud answered " + r.status);
    status.soundcloud = true;
    return r.json();
  }

  async function searchSoundCloud(q) {
    const d = await withTimeout(scGet("https://api-v2.soundcloud.com/search/tracks", { q, limit: 15 }), 15000);
    const rows = (d?.collection || []).filter((t) => t && t.kind === "track" && t.policy !== "BLOCK" && t.policy !== "SNIP");
    return rows.slice(0, 10).map((t) => ({
      source: "soundcloud",
      id: t.permalink_url,
      title: t.title,
      artist: t.user?.username || "",
      thumb: (t.artwork_url || t.user?.avatar_url || "").replace("-large", "-t300x300"),
      dur: Math.round((t.duration || 0) / 1000),
    })).filter((t) => t.id);
  }

  /* ---- Audius: a free, open music network. Smaller catalog, but its audio comes straight from open servers ---- */
  let audiusBase = "https://api.audius.co/v1";
  async function audiusPickHost() { // if the main address doesn't answer, ask it for a list of servers and use one of those
    try {
      const r = await withTimeout(fetch("https://api.audius.co", { headers: { "user-agent": UA, accept: "application/json" } }), 8000);
      const hosts = ((await r.json())?.data || []).filter((x) => typeof x === "string" && /^https:/.test(x));
      if (hosts.length) { audiusBase = hosts[Math.floor(Math.random() * hosts.length)].replace(/\/$/, "") + "/v1"; return true; }
    } catch {}
    return false;
  }
  async function searchAudius(q) {
    const path = `/tracks/search?query=${encodeURIComponent(q)}&limit=10&app_name=NexVelo`;
    let r;
    try { r = await withTimeout(fetch(audiusBase + path, { headers: { "user-agent": UA } }), 10000); if (!r.ok) throw new Error("audius answered " + r.status); }
    catch (e) { if (!(await audiusPickHost())) throw e; r = await withTimeout(fetch(audiusBase + path, { headers: { "user-agent": UA } }), 10000); if (!r.ok) throw new Error("audius answered " + r.status); }
    const d = await r.json();
    status.audius = true;
    return (d?.data || []).filter((t) => t.id && t.is_streamable !== false).slice(0, 8).map((t) => ({
      source: "audius",
      id: String(t.id),
      title: t.title,
      artist: t.user?.name || "",
      thumb: t.artwork?.["480x480"] || t.artwork?.["150x150"] || "",
      dur: Math.round(t.duration || 0),
    }));
  }
  const audiusStream = (id) => `${audiusBase}/tracks/${encodeURIComponent(id)}/stream?app_name=NexVelo`;
  const audiusUp = async (id, range) => {
    try { return await openUp(audiusStream(id), range); }
    catch (e) { if (await audiusPickHost()) return openUp(audiusStream(id), range); throw e; }
  };

  const norm = (s) =>
    String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\(.*?\)|\[.*?\]/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const BAD = /\b(remix|live|cover|karaoke|slowed|sped|reverb|nightcore|instrumental)\b/;

  function score(query, t) {
    const q = norm(query), title = norm(t.title), all = norm(`${t.artist} ${t.title}`);
    if (!q || !all) return 0;
    const qw = new Set(q.split(" ")), tw = new Set(all.split(" "));
    let hit = 0;
    for (const w of qw) if (tw.has(w)) hit++;
    let s = 0.65 * (hit / qw.size) + 0.2 * (hit / tw.size);
    if (title === q) s += 0.15; else if (all.includes(q)) s += 0.1;
    if (BAD.test(title) && !BAD.test(q)) s -= 0.15;
    return s;
  }

  const cache = new Map();
  async function musicSearch(q) {
    const hit = cache.get(q);
    if (hit && Date.now() - hit.t < 5 * 60 * 1000) return hit.data;
    const [a, b, c] = await Promise.allSettled([searchYouTube(q), searchSoundCloud(q), searchAudius(q)]);
    const errors = {};
    if (a.status === "rejected") errors.youtube = String(a.reason?.message || a.reason);
    if (b.status === "rejected") errors.soundcloud = String(b.reason?.message || b.reason);
    if (c.status === "rejected") errors.audius = String(c.reason?.message || c.reason);
    const all = [...(a.value || []), ...(b.value || []), ...(c.value || [])]
      .map((t) => ({ ...t, score: score(q, t) }))
      .filter((t) => t.source !== "audius" || t.score >= 0.25);
    all.sort((x, y) => y.score - x.score);
    const seen = new Set(), results = [];
    for (const t of all) {
      const k = norm(t.artist + t.title);
      if (seen.has(k)) continue;
      seen.add(k); results.push(t);
    }
    const data = { results: results.slice(0, 12), status: { ...status }, errors };
    if (results.length) cache.set(q, { t: Date.now(), data });
    return data;
  }

  app.get("/api/music/status", async () => ({ status }));

  app.get("/api/music/search", async (req, reply) => {
    const q = String(req.query?.q || "").trim().slice(0, 120);
    if (!q) return { results: [], status, errors: {} };
    try { return await musicSearch(q); }
    catch (e) { reply.code(502); return { results: [], status, errors: { server: String(e?.message || e) } }; }
  });

  /* ================= Music streaming (through this server, so the browser never talks to YouTube/SoundCloud) ================= */

  // SoundCloud formats, best first: a whole mp3, then mp3/aac/mp4 playlists. Opus is skipped (its pieces can't be joined into one file).
  async function scTrack(id) {
    return cached("sctrack:" + id, async () => {
      const track = /^https?:/i.test(id)
        ? await scGet("https://api-v2.soundcloud.com/resolve", { url: id })
        : await scGet("https://api-v2.soundcloud.com/tracks/" + encodeURIComponent(id));
      const mimeOf = (t) => t.format?.mime_type || "";
      const rank = (t) => (t.format?.protocol === "progressive" ? 0 : 1) + (/mpeg/i.test(mimeOf(t)) ? 0 : 0.5);
      const formats = (track?.media?.transcodings || []).filter((t) => t.url && !/opus|ogg/i.test(mimeOf(t))).sort((a, b) => rank(a) - rank(b));
      if (!formats.length) throw new Error("soundcloud has no playable format for this track");
      return { track, formats };
    });
  }
  async function scResolveFormat(track, t) {
    const u = new URL(t.url);
    u.searchParams.set("client_id", await scClientId());
    if (track.track_authorization) u.searchParams.set("track_authorization", track.track_authorization);
    const r = await withTimeout(fetch(u, { headers: { "user-agent": UA } }), 12000);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    if (!d?.url) throw new Error("no address given");
    return { url: d.url, hls: t.format?.protocol === "hls" };
  }
  // Opens the first format that really starts returning audio. Gives back { up } (a whole file) or { hls } (a playlist).
  async function scOpen(id, range) {
    const info = await scTrack(id);
    const errs = [];
    for (const t of info.formats) {
      const label = (t.format?.protocol || "?") + " " + String(t.format?.mime_type || "?").replace(/;.*$/, "");
      try {
        const f = await scResolveFormat(info.track, t);
        return f.hls ? { hls: await prepareHls(f.url) } : { up: await openUp(f.url, range) };
      } catch (e) { errs.push(label + " -> " + String(e?.message || e).slice(0, 90)); }
    }
    urlCache.delete("sctrack:" + id);
    throw new Error("soundcloud: " + errs.join("; "));
  }

  // HLS = a playlist of small audio files. mp3/aac pieces can simply be sent one after another; MP4-style pieces need their start-up piece first.
  async function prepareHls(m3u8Url) {
    const get = async (u) => {
      const r = await withTimeout(fetch(u, { headers: { "user-agent": UA } }), 15000);
      if (!r.ok) throw new Error("hls " + r.status);
      return r;
    };
    let base = m3u8Url, text = await (await get(base)).text();
    if (/#EXT-X-STREAM-INF/.test(text)) { // master playlist: take the first quality
      const ls = text.split(/\r?\n/), i = ls.findIndex((l) => l.startsWith("#EXT-X-STREAM-INF"));
      const next = ls.slice(i + 1).find((l) => l && !l.startsWith("#"));
      if (!next) throw new Error("empty hls playlist");
      base = new URL(next, base).href; text = await (await get(base)).text();
    }
    const init = (text.match(/#EXT-X-MAP:[^\n]*URI="([^"]+)"/) || [])[1];
    const segs = text.split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => new URL(l, base).href);
    if (!segs.length) throw new Error("empty hls playlist");
    const pre = init ? toBytes(await (await get(new URL(init, base).href)).arrayBuffer()) : null;
    const first = await get(segs[0]);
    const type = first.headers.get("content-type") || "", file = segs[0].split("?")[0];
    const mime = init || /mp4|m4a|m4s/i.test(type + " " + file) ? "audio/mp4" : /aac|adts/i.test(type + " " + file) ? "audio/aac" : "audio/mpeg";
    const firstBuf = toBytes(await first.arrayBuffer());
    return { mime, pre, firstBuf, segs, get };
  }

  function sendHls(p, reply) {
    async function* pieces() {
      if (p.pre) yield p.pre;
      yield p.firstBuf;
      for (let i = 1; i < p.segs.length; i++) yield toBytes(await (await p.get(p.segs[i])).arrayBuffer());
    }
    reply.code(200).header("content-type", p.mime).header("accept-ranges", "none").header("cache-control", "no-store");
    return reply.send(streamFrom(pieces()));
  }
  app.__streamHls = async (u, reply) => sendHls(await prepareHls(u), reply); // used by the tests

  // Public Piped servers can hand out YouTube audio when YouTube blocks this server directly (they come and go; set PIPED_INSTANCES to change the list)
  async function pipedUrl(id) {
    const bases = (ENV.PIPED_INSTANCES || "https://pipedapi.kavin.rocks,https://pipedapi.adminforge.de,https://api.piped.private.coffee").split(",").map((x) => x.trim()).filter(Boolean);
    try {
      return await Promise.any(bases.map(async (base) => {
        const r = await withTimeout(fetch(`${base}/streams/${id}`, { headers: { "user-agent": UA } }), 4000);
        if (!r.ok) throw new Error("piped " + r.status);
        const d = await r.json();
        const list = (d.audioStreams || []).filter((x) => x.url);
        const pick = list.filter((x) => /mp4|m4a|aac|mpeg/i.test(`${x.mimeType} ${x.format}`)).sort((x, y) => (y.bitrate || 0) - (x.bitrate || 0))[0] || list[0];
        if (!pick?.url) throw new Error("no audio");
        return pick.url;
      }));
    } catch { throw new Error("no piped server answered"); }
  }

  // YouTube audio comes from a public Piped server (the YouTube downloader libraries can't run on Workers)
  async function youtubeUrl(id) {
    return cached("yt:" + id, async () => {
      try { return await pipedUrl(id); }
      catch (e) { throw new Error("youtube wouldn't give audio (" + String(e?.message || e).slice(0, 80) + ")"); }
    });
  }

  async function bestSoundCloud(q) {
    const rows = await searchSoundCloud(q);
    return rows.map((t) => ({ ...t, score: score(q, t) })).sort((a, b) => b.score - a.score)[0] || null;
  }
  async function bestAudius(q) {
    const rows = await searchAudius(q);
    return rows.map((t) => ({ ...t, score: score(q, t) })).filter((t) => t.score >= 0.3).sort((a, b) => b.score - a.score)[0] || null;
  }

  async function openUp(url, range) {
    const up = await withTimeout(fetch(url, { headers: { "user-agent": UA, ...(range ? { range } : {}) }, redirect: "follow" }), 20000);
    if (!up.ok && up.status !== 206) throw new Error("upstream " + up.status);
    return up;
  }

  // Try the track itself, then the same song on the other sources. Each step must really start returning audio.
  async function resolveAudio(source, id, q, range) {
    const steps = [];
    const direct = (urlFn) => async () => ({ up: await openUp(await urlFn(), range) });
    const viaSc = (scId) => () => scOpen(scId, range);
    if (source === "soundcloud") steps.push(["soundcloud", viaSc(id)]);
    else if (source === "audius") steps.push(["audius", async () => ({ up: await audiusUp(id, range) })]);
    else steps.push(["youtube", direct(() => youtubeUrl(id))]);
    if (q) {
      if (source !== "soundcloud") steps.push(["soundcloud match", async () => {
        const alt = await bestSoundCloud(q); if (!alt) throw new Error("no match");
        return viaSc(alt.id)();
      }]);
      if (source !== "audius") steps.push(["audius match", async () => {
        const alt = await bestAudius(q); if (!alt) throw new Error("no match");
        return { up: await audiusUp(alt.id, range) };
      }]);
    }
    const errs = [];
    for (const [name, fn] of steps) {
      try { return await fn(); }
      catch (e) { errs.push(name + ": " + String(e?.message || e).slice(0, 110)); }
    }
    throw new Error(errs.join(" | "));
  }

  app.get("/api/music/stream", async (req, reply) => {
    const source = String(req.query?.source || ""), id = String(req.query?.id || "");
    const q = String(req.query?.q || "").trim().slice(0, 140);
    if (!id || !["youtube", "soundcloud", "audius"].includes(source)) { reply.code(400); return { error: "bad request" }; }
    try {
      const got = await resolveAudio(source, id, q, req.headers.range);
      if (got.hls) return sendHls(got.hls, reply);
      const up = got.up;
      reply.code(up.status);
      const encoded = up.headers.get("content-encoding"); // a compressed body has a different length than the header says
      for (const h of ["content-type", "content-length", "content-range"]) { const v = up.headers.get(h); if (v && !(h === "content-length" && encoded)) reply.header(h, v); }
      reply.header("accept-ranges", "bytes").header("cache-control", "no-store");
      return reply.send(up.body);
    } catch (e) {
      urlCache.delete((source === "soundcloud" ? "sctrack:" : "yt:") + id);
      console.warn("[stream failed]", source, id, String(e?.message || e));
      reply.code(502); return { error: String(e?.message || e) };
    }
  });

  // Find the closest SoundCloud version of a track (used when a YouTube stream can't be fetched)
  app.get("/api/music/alt", async (req, reply) => {
    const q = String(req.query?.q || "").trim().slice(0, 140);
    if (!q) { reply.code(400); return {}; }
    try {
      const best = await bestSoundCloud(q);
      return { track: best || null };
    } catch (e) { reply.code(502); return { track: null, error: String(e?.message || e) }; }
  });

  /* ================= Recommended music (a fixed list of well-known songs, matched through the same search) ================= */
  const RECOMMENDED = [
    "Blinding Lights The Weeknd", "Levitating Dua Lipa", "As It Was Harry Styles", "Flowers Miley Cyrus",
    "Anti-Hero Taylor Swift", "Espresso Sabrina Carpenter", "Starboy The Weeknd", "Heat Waves Glass Animals",
    "Sunflower Post Malone", "good 4 u Olivia Rodrigo", "Stay The Kid LAROI Justin Bieber", "Shape of You Ed Sheeran",
  ];
  let recCache = { t: 0, tracks: [] };
  app.get("/api/music/recommended", async () => {
    if (recCache.tracks.length && Date.now() - recCache.t < 6 * 60 * 60 * 1000) return { tracks: recCache.tracks };
    const tracks = [];
    for (let i = 0; i < RECOMMENDED.length; i += 4) { // four searches at a time
      const batch = await Promise.allSettled(RECOMMENDED.slice(i, i + 4).map((q) => musicSearch(q)));
      for (const r of batch) { const t = r.status === "fulfilled" && r.value.results?.[0]; if (t) tracks.push(t); }
    }
    if (tracks.length) recCache = { t: Date.now(), tracks };
    return { tracks };
  });

  /* ================= Site icons for bookmarks (fetched here so a blocked network doesn't matter) ================= */
  app.get("/api/favicon", async (req, reply) => {
    const host = String(req.query?.host || "").toLowerCase();
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || host.length > 120) { reply.code(400); return ""; }
    const urls = [`https://icons.duckduckgo.com/ip3/${host}.ico`, `https://www.google.com/s2/favicons?domain=${host}&sz=64`];
    for (const u of urls) {
      try {
        const r = await withTimeout(fetch(u, { headers: { "user-agent": UA } }), 6000);
        const type = r.headers.get("content-type") || "";
        if (!r.ok || !/image/i.test(type)) continue;
        const buf = toBytes(await r.arrayBuffer());
        if (buf.length < 60) continue;
        reply.header("content-type", type).header("cache-control", "public, max-age=604800");
        return reply.send(buf);
      } catch {}
    }
    reply.code(404); return "";
  });

  /* ================= Live visitors (anonymous, counted while a page keeps pinging) ================= */
  // The count is kept in a Durable Object (binding LIVE) so every copy of the Worker sees the same number.
  // Without the binding, each copy counts on its own (the number is then only a rough guess).
  const localVisitors = new Map();
  const localCount = () => { const now = Date.now(); for (const [id, t] of localVisitors) if (now - t > 60000) localVisitors.delete(id); return localVisitors.size; };
  async function liveCall(path) {
    const stub = ENV.LIVE.get(ENV.LIVE.idFromName("live"));
    return (await stub.fetch("https://live" + path)).json();
  }
  app.get("/api/live", async () => {
    try { if (ENV.LIVE) return await liveCall("/count"); } catch {}
    return { count: localCount() };
  });
  app.post("/api/live/ping", async (req) => {
    const id = String(req.body?.id || "");
    if (!/^[a-z0-9-]{8,48}$/i.test(id)) return { count: ENV.LIVE ? (await liveCall("/count").catch(() => ({ count: localCount() }))).count : localCount() };
    try { if (ENV.LIVE) return await liveCall("/ping?id=" + encodeURIComponent(id)); } catch {}
    localVisitors.set(id, Date.now());
    return { count: localCount() };
  });

  /* ================= Game search for DuckMath and Weslack =================
     The game list is read from each site's sitemap (or its home page links). Opening a game finds the
     game's own player frame so the site's menus and ads can be left out. Both depend on how each site is built. */
  const GAME_SITES = { duckmath: "https://duckmath.org", weslack: "https://weslack.com" };
  const SKIP_SLUG = /^(about|about-us|contact|contact-us|privacy|privacy-policy|terms|terms-of-service|dmca|search|category|categories|tag|tags|page|login|register|blog|sitemap|feed|cookie|cookies|policy|faq|help|games|new|popular|top|best|all|home|index|404)$/i;
  const titleCase = (t) => t.replace(/[-_+]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

  const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

  const gameFromUrl = (u, host) => {
    try {
      const x = new URL(u);
      if (x.hostname.replace(/^www\./, "") !== host) return null;
      const segs = x.pathname.split("/").filter(Boolean);
      if (!segs.length || segs.length > 3) return null;
      const slug = decodeURIComponent(segs[segs.length - 1]).replace(/\.html?$/i, "");
      if (!slug || SKIP_SLUG.test(slug) || /^\d+$/.test(slug) || /^(category|tag|page|author|search)$/i.test(segs[0]) || /\.(xml|png|jpe?g|gif|css|js|txt|ico)$/i.test(slug)) return null;
      return { name: titleCase(slug), url: x.href };
    } catch { return null; }
  };

  const gamesCache = {};
  const hostOf = (u) => new URL(u).hostname.replace(/^www\./, "");
  const cleanLabel = (t) => {
    const x = String(t || "").replace(/\s+/g, " ").trim();
    return x.length < 2 || x.length > 60 || /^(play|play now|play game|more|read more|view|click here|new|hot|top|home)$/i.test(x) ? "" : x;
  };

  // Reads a page. If the site turns servers away (an error, or a "checking your browser" page), a public reader service fetches it for us instead.
  async function fetchPage(url) {
    let why = "";
    try {
      const r = await withTimeout(fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml,application/json,*/*", "accept-language": "en-US,en;q=0.9" }, redirect: "follow" }), 12000);
      const body = await r.text();
      if (r.ok && !/just a moment|cf-browser-verification|attention required|enable javascript and cookies/i.test(body.slice(0, 4000))) return { text: body, via: "direct" };
      why = "HTTP " + r.status;
    } catch (e) { why = String(e?.message || e); }
    try {
      const r = await withTimeout(fetch("https://r.jina.ai/" + url, { headers: { "user-agent": UA, accept: "text/plain" } }), 20000);
      if (r.ok) { const t = await r.text(); if (t.length > 200) return { text: t, via: "reader" }; }
    } catch {}
    throw new Error(why || "no answer");
  }

  // every link on a page, from normal HTML and from the reader's text version
  const linksOf = (text, pageUrl) => {
    const raw = [];
    for (const m of text.matchAll(/<a\s[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const alt = (m[2].match(/\balt=["']([^"']+)["']/i) || [])[1];
      raw.push({ href: m[1], label: alt || m[2].replace(/<[^>]+>/g, " ") });
    }
    for (const m of text.matchAll(/\[((?:[^\]\[]|!\[[^\]]*\]\([^)]*\))*)\]\((https?:\/\/[^)\s]+)\)/g)) raw.push({ href: m[2], label: m[1].replace(/!\[[^\]]*\]\([^)]*\)/g, " ") });
    const out = [];
    for (const l of raw) { try { out.push({ url: new URL(l.href.replace(/&amp;/g, "&"), pageUrl).href, label: cleanLabel(l.label) }); } catch {} }
    return out;
  };

  async function siteGames(key) {
    const hit = gamesCache[key];
    if (hit && Date.now() - hit.t < 60 * 60 * 1000 && hit.list.length) return hit;
    const base = GAME_SITES[key], host = hostOf(base), tried = [], found = new Map(), started = Date.now();
    const add = (u, label) => {
      const g = gameFromUrl(u, host); if (!g) return;
      const prev = found.get(g.url);
      if (!prev || (!prev.good && label)) found.set(g.url, { name: label || g.name, good: !!label });
    };
    // 1) the sitemap
    try {
      let l = locs((await fetchPage(base + "/sitemap.xml")).text);
      const subs = l.filter((u) => /\.xml(\?|$)/i.test(u));
      l = l.filter((u) => !/\.xml(\?|$)/i.test(u));
      for (const sm of subs.slice(0, 12)) { try { l.push(...locs((await fetchPage(sm)).text)); } catch {} }
      l.forEach((u) => add(u));
    } catch (e) { tried.push("sitemap.xml: " + String(e?.message || e).slice(0, 70)); }
    // 2) the pages themselves: the home page, the usual list pages, and any "page 2, 3…" or category pages they link to
    const isListing = (u) => {
      try {
        const x = new URL(u); if (hostOf(x.href) !== host) return false;
        const segs = x.pathname.split("/").filter(Boolean), last = segs[segs.length - 1] || "", prev = segs[segs.length - 2] || "";
        return /^(games?|all-games?|new|popular|top|best|latest|trending)$/i.test(last) || /^(category|categories|tag|tags|genre|genres)$/i.test(prev) || (/^page$/i.test(prev) && /^\d+$/.test(last)) || /[?&]page=\d+/i.test(x.search);
      } catch { return false; }
    };
    const queue = [base + "/", ...["/games", "/all-games", "/new", "/popular", "/games.json", "/api/games"].map((x) => base + x)], seen = new Set();
    let pages = 0;
    while (queue.length && pages < 30 && Date.now() - started < 45000) {
      const batch = queue.splice(0, 4).filter((u) => !seen.has(u));
      await Promise.all(batch.map(async (u) => {
        seen.add(u); pages++;
        try {
          const { text } = await fetchPage(u);
          if (/^\s*[\[{]/.test(text)) { // a data file: a list of games
            try {
              const j = JSON.parse(text), arr = Array.isArray(j) ? j : j.games || j.data || j.items || j.list || [];
              for (const it of Array.isArray(arr) ? arr : []) {
                const link = it?.url || it?.link || it?.href || (it?.slug ? "/" + it.slug : "");
                if (link) { try { add(new URL(link, base + "/").href, cleanLabel(it?.name || it?.title)); } catch {} }
              }
            } catch {}
            return;
          }
          for (const l of linksOf(text, u)) {
            add(l.url, l.label);
            if (isListing(l.url) && !seen.has(l.url) && queue.length < 80) queue.push(l.url);
          }
        } catch (e) { if (tried.length < 6 && u === base + "/") tried.push("home page: " + String(e?.message || e).slice(0, 70)); }
      }));
    }
    const list = [...found].map(([url, v]) => ({ name: v.name, url })).sort((x, y) => x.name.localeCompare(y.name));
    const out = { t: Date.now(), list, tried: tried.length ? tried : ["read " + pages + " pages"] };
    if (list.length) gamesCache[key] = out;
    return out;
  }

  app.get("/api/games/list", async (req, reply) => {
    const site = String(req.query?.src || req.query?.site || "");
    if (site === "gn" || site === "obsidian" || site === "ugs") {
      try {
        const games = await (site === "gn" ? gnGames() : site === "ugs" ? ugsGames() : obsidianGames());
        return { games, count: games.length, kind: "library" };
      }
      catch (e) { console.warn("[games]", site, String(e?.message || e)); reply.code(502); return { games: [], error: String(e?.message || e) }; }
    }
    if (!GAME_SITES[site]) { reply.code(400); return { error: "unknown site" }; }
    const g = await siteGames(site);
    if (!g.list.length) { reply.code(502); return { games: [], error: "couldn't read the game list. " + g.tried.join("; ") }; }
    return { games: g.list.map(({ name, url }) => ({ name, url })), count: g.list.length };
  });

  const BAD_FRAME = /(googletagmanager|doubleclick|googlesyndication|facebook\.|twitter\.|youtube\.com\/embed|disqus|adservice|recaptcha|addthis|gstatic)/i;
  app.get("/api/games/open", async (req, reply) => {
    const site = String(req.query?.site || ""), url = String(req.query?.url || "");
    if (!GAME_SITES[site]) { reply.code(400); return { error: "unknown site" }; }
    let host; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { reply.code(400); return { error: "bad url" }; }
    if (host !== new URL(GAME_SITES[site]).hostname.replace(/^www\./, "")) { reply.code(400); return { error: "that address isn't on this site" }; }
    try {
      const html = await fetchText(url);
      for (const m of html.matchAll(/<iframe\b[^>]*?\b(?:data-src|src)=["']([^"']+)["'][^>]*>/gi)) {
        if (BAD_FRAME.test(m[1])) continue;
        let src; try { src = new URL(m[1], url).href; } catch { continue; }
        if (/^https?:/i.test(src)) return { embed: src };
      }
      return { embed: null };
    } catch (e) { reply.code(502); return { embed: null, error: String(e?.message || e) }; }
  });

  /* ================= Open-source game libraries =================
     GN Math (GitHub), UGS (GitHub) and Obsidian's Unblocked Revamped (GitHub, read straight from
     GitHub because the repo is too big for jsDelivr). Their files are served from here with the right content
     type, so a game's own pages, scripts and images load from one place (and through the proxy). */
  const FILE_MIME = { html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", js: "application/javascript; charset=utf-8", mjs: "application/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon", wasm: "application/wasm", mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", txt: "text/plain; charset=utf-8", xml: "application/xml" };
  const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");
  const OBS = { owner: "Obsidian-ig", repo: "ObsidiansUnblockedRevamped", branch: "main2" };
  const UGS = { owner: "bubbls", repo: "ugs-singlefile", branch: "main" }; // the Ultimate Game Stash: one html file per game in UGS-Files/
  const LIB_RAW = {
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
  };
  const htmlEsc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fileErr = (reply, code, lib, p, why) => {
    reply.code(code).header("content-type", "text/html; charset=utf-8").header("cache-control", "no-store");
    return `<!doctype html><meta charset="utf-8"><body style="font:14px system-ui,sans-serif;padding:24px;background:#111;color:#eee;line-height:1.5"><h3 style="margin:0 0 8px">Nex.Velo couldn't load this game file</h3><div>source: ${htmlEsc(lib)}<br>file: ${htmlEsc(p)}<br>reason: ${htmlEsc(why)}</div>`;
  };
  // Games point at CDNs (jsDelivr, GitHub, GitLab) for their scripts and images. On a filtered network those can be blocked, so the
  // addresses inside text files are changed to come through this server instead.
  const REWRITES = [
    [/(?:https?:)?\/\/cdn\.jsdelivr\.net\/gh\/gn-math\/assets@[\w.-]+\//g, "/api/games/f/gnassets/"],
    [/(?:https?:)?\/\/cdn\.jsdelivr\.net\/gh\/gn-math\/html@[\w.-]+\//g, "/api/games/f/gnhtml/"],
    [/(?:https?:)?\/\/cdn\.jsdelivr\.net\/gh\/gn-math\/covers@[\w.-]+\//g, "/api/games/f/gncovers/"],
    [/(?:https?:)?\/\/raw\.githubusercontent\.com\/gn-math\/assets\/[\w.-]+\//g, "/api/games/f/gnassets/"],
    [/(?:https?:)?\/\/raw\.githubusercontent\.com\/gn-math\/html\/[\w.-]+\//g, "/api/games/f/gnhtml/"],
    [/(?:https?:)?\/\/raw\.githubusercontent\.com\/Obsidian-ig\/ObsidiansUnblockedRevamped\/[\w.-]+\//g, "/api/games/f/obsidian/"],
  ];
  // Reports what a game page complains about, so a blank page can be explained instead of just being blank.
  const GAME_PROBE = '<script>(function(){var s=function(m){try{parent.postMessage({nvGame:String(m).slice(0,300)},"*")}catch(e){}};addEventListener("error",function(e){var t=e.target;s(t&&t!==window&&(t.src||t.href)?"failed to load "+(t.src||t.href):(e.message||"error")+" ("+String(e.filename||"").split("/").pop()+":"+e.lineno+")")},true);addEventListener("unhandledrejection",function(e){s("promise: "+(e.reason&&e.reason.message||e.reason))});addEventListener("keydown",function(e){if(e.key==="Escape"){try{parent.postMessage({nvKey:"Escape"},"*")}catch(x){}}},true)})()</script>';
  const injectProbe = (html) => {
    const m = html.match(/<head[^>]*>/i) || html.match(/<html[^>]*>/i);
    if (m) return html.slice(0, m.index + m[0].length) + GAME_PROBE + html.slice(m.index + m[0].length);
    const d = html.match(/^\s*<!doctype[^>]*>/i);
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
      const up = await fetchLib(lib, p);
      if (!up) return fileErr(reply, 502, lib, p, "couldn't reach " + LIB_RAW[lib](p));
      if (!up.ok) return fileErr(reply, up.status === 404 ? 404 : 502, lib, p, `the ${lib} repository answered HTTP ${up.status} for ${LIB_RAW[lib](p)}`);
      const ext = ((p.match(/\.([a-z0-9]+)$/i) || [])[1] || "").toLowerCase();
      reply.header("content-type", FILE_MIME[ext] || up.headers.get("content-type") || "application/octet-stream")
        .header("cache-control", "public, max-age=3600").header("access-control-allow-origin", "*");
      const size = Number(up.headers.get("content-length")) || 0;
      if (["html", "htm", "js", "mjs", "css"].includes(ext) && size < 30e6) { // text files: fix their CDN addresses (and add the reporter to pages)
        let text = await up.text();
        for (const [re, to] of REWRITES) text = text.replace(re, to);
        if (ext === "html" || ext === "htm") text = injectProbe(text);
        return reply.send(text);
      }
      return reply.send(up.body);
    } catch (e) { console.warn("[games file]", lib, p, String(e?.message || e)); return fileErr(reply, 502, lib, p, String(e?.message || e)); }
  });

  async function gnGames() {
    return cached("gn:list", async () => {
      let raw = null, err = "";
      for (const u of ["https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json", "https://raw.githubusercontent.com/gn-math/assets/main/zones.json"]) {
        try { const r = await withTimeout(fetch(u, { headers: { "user-agent": UA } }), 20000); if (!r.ok) throw new Error("HTTP " + r.status); raw = await r.json(); break; }
        catch (e) { err = String(e?.message || e); }
      }
      if (!raw) throw new Error("couldn't read the GN Math list (" + err + ")");
      const arr = Array.isArray(raw) ? raw : raw.games || raw.zones || Object.values(raw);
      const games = [];
      arr.forEach((g, i) => {
        const name = String(g?.name || g?.title || "").trim(); if (!name) return;
        // some entries are links (like the Discord invite), not games. only real game pages are kept
        if (!/^\{HTML_URL\}\//.test(String(g.url || "")) && !/^https?:\/\/cdn\.jsdelivr\.net\/gh\/gn-math\/html@/.test(String(g.url || ""))) return;
        const id = String(g.id ?? i);
        const tail = (v, d) => String(v || d).replace(/^\{[A-Z_]+\}\//, "").replace(/^https?:\/\/[^/]+\/gh\/gn-math\/[a-z]+@main\//, "");
        games.push({ name, play: "/api/games/f/gnhtml/" + encPath(tail(g.url, id + ".html")), thumb: "/api/games/f/gncovers/" + encPath(tail(g.cover, id + ".png")) });
      });
      if (!games.length) throw new Error("the GN Math list was empty");
      games.sort((a, b) => a.name.localeCompare(b.name)); return games;
    }, 6 * 60 * 60 * 1000, true);
  }

  // UGS (Ultimate Game Stash): every game is one file in UGS-Files/, named like cl10minutestildawn.html.
  // The "cl" is dropped and the run-together words are spaced out ("10 Minutes Til Dawn").
  async function ugsGames() {
    return cached("ugs:list", async () => {
      const headers = { "user-agent": UA, accept: "application/vnd.github+json", ...(ENV.GITHUB_TOKEN ? { authorization: "Bearer " + ENV.GITHUB_TOKEN } : {}) };
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
      await loadWords();
      const games = files.filter((f) => !/^index\.html?$/i.test(f)).map((f) => ({ name: splitGameName(f), play: "/api/games/f/ugs/UGS-Files/" + encPath(f), thumb: "" }));
      games.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
      return games;
    }, 12 * 60 * 60 * 1000, true);
  }

  // Obsidian's Unblocked Revamped (archived GitHub repo). Only its games/ folder is read, one folder per game.
  async function obsidianGames() {
    return cached("obsidian:list", async () => {
      const headers = { "user-agent": UA, accept: "application/vnd.github+json", ...(ENV.GITHUB_TOKEN ? { authorization: "Bearer " + ENV.GITHUB_TOKEN } : {}) };
      const gh = async (path) => {
        const r = await withTimeout(fetch(`https://api.github.com/repos/${OBS.owner}/${OBS.repo}/${path}`, { headers }), 25000);
        if (!r.ok) throw new Error("GitHub answered " + r.status + (r.status === 403 ? " (rate limit: add a GITHUB_TOKEN variable on the server)" : ""));
        return r.json();
      };
      const root = await gh("git/trees/" + OBS.branch);
      const folder = (root.tree || []).find((x) => x.path === "games" && x.type === "tree");
      if (!folder) throw new Error("the Obsidian repo has no games folder");
      const files = ((await gh("git/trees/" + folder.sha + "?recursive=1")).tree || []).filter((x) => x.type === "blob").map((x) => x.path);
      const groups = {}, loose = [];
      for (const p of files) {
        const i = p.indexOf("/");
        if (i < 0) { if (/\.html?$/i.test(p)) loose.push(p); continue; }
        (groups[p.slice(0, i)] ||= []).push(p);
      }
      const enc = (p) => "/api/games/f/obsidian/" + encPath("games/" + p);
      const games = [];
      for (const [dir, list] of Object.entries(groups)) {
        const htmls = list.filter((f) => /\.html?$/i.test(f)).sort((a, b) => a.split("/").length - b.split("/").length || a.length - b.length);
        const play = list.find((f) => f.toLowerCase() === dir.toLowerCase() + "/index.html") || htmls[0];
        if (!play) continue;
        const imgs = list.filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f) && f.split("/").length <= 3);
        const thumb = imgs.find((f) => /(thumb|icon|cover|logo|preview|banner|splash|image)/i.test(f)) || imgs[0] || "";
        games.push({ name: titleCase(dir), play: enc(play), thumb: thumb ? enc(thumb) : "" });
      }
      for (const p of loose) games.push({ name: titleCase(p.replace(/\.html?$/i, "")), play: enc(p), thumb: "" });
      if (!games.length) throw new Error("no games found in the Obsidian repo's games folder (" + files.length + " files looked at)");
      games.sort((a, b) => a.name.localeCompare(b.name)); return games;
    }, 6 * 60 * 60 * 1000);
  }

  /* ================= Lyrics (LRCLIB, the same free community library Versed uses) ================= */
  const lyricCache = new Map();
  const cleanTitle = (t) =>
    String(t || "").replace(/\(.*?\)|\[.*?\]/g, " ")
      .replace(/\b(official|music video|video|audio|lyrics?|lyric video|visuali[sz]er|hd|4k|remaster(ed)?( \d{4})?)\b/gi, " ")
      .replace(/\s*[-–]\s*topic$/i, "").replace(/\s*(feat|ft)\.?\s.*$/i, "").replace(/\s+/g, " ").trim();

  function parseLrc(lrc) {
    const out = [];
    for (const line of String(lrc || "").split(/\r?\n/)) {
      const stamps = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      if (!stamps.length) continue;
      const text = line.replace(/\[[^\]]*\]/g, "").trim();
      for (const m of stamps) out.push({ t: +m[1] * 60 + parseFloat(m[2]), text });
    }
    return out.sort((x, y) => x.t - y.t);
  }

  app.get("/api/lyrics", async (req, reply) => {
    let title = cleanTitle(req.query?.title), artist = cleanTitle(req.query?.artist);
    const dur = Number(req.query?.dur) || 0;
    if (!title) { reply.code(400); return { error: "missing title" }; }
    const parts = title.split(/\s+[-–]\s+/);
    if (parts.length === 2) {
      const a = norm(artist), p0 = norm(parts[0]);
      if (!a || a.includes(p0) || p0.includes(a)) { artist = artist || parts[0]; title = parts[1]; }
    }
    const ck = norm(artist + " " + title) + "|" + Math.round(dur / 5);
    const hit = lyricCache.get(ck);
    if (hit && Date.now() - hit.t < 6 * 60 * 60 * 1000) return hit.v;
    const H = { headers: { "user-agent": "Nex.Velo (https://github.com/Nex-Mav/Nex.Velo)" } };
    const urls = [
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
      `https://lrclib.net/api/search?q=${encodeURIComponent((artist + " " + title).trim())}`,
    ];
    let best = null;
    for (const u of urls) {
      try {
        const r = await withTimeout(fetch(u, H), 9000);
        if (!r.ok) continue;
        const rows = (await r.json()).filter((x) => x.syncedLyrics || x.plainLyrics || x.instrumental);
        for (const x of rows) {
          let sc = 0.6 * score(title, { title: x.trackName, artist: x.artistName });
          if (dur && x.duration && Math.abs(x.duration - dur) <= 4) sc += 0.3;
          if (x.syncedLyrics) sc += 0.2;
          if (!best || sc > best.sc) best = { sc, x };
        }
        if (best && best.sc > 0.6) break;
      } catch {}
    }
    const v = best && best.sc > 0.25
      ? { found: true, instrumental: !!best.x.instrumental, synced: parseLrc(best.x.syncedLyrics), plain: best.x.plainLyrics || "", title: best.x.trackName, artist: best.x.artistName }
      : { found: false };
    lyricCache.set(ck, { t: Date.now(), v });
    return v;
  });

  /* ================= AI chat: Nex.AI =================
     Nex.AI is always the answerer. On Cloudflare it runs on Workers AI (add the "AI" binding in wrangler.toml, no key needed).
     It can look facts up on Wikipedia first, so it answers from real sources instead of guessing.
     Optional extras, only if the owner sets GROQ_API_KEY: (1) the answer is still given if Workers AI is unavailable,
     and (2) images/screens can be described. */
  const AI_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  const VISION_MODEL = () => ENV.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  const CF_MODEL = () => ENV.NEXAI_CF_MODEL || "@cf/meta/llama-3.1-8b-instruct";
  const aiKey = (req) => String(req.headers["x-groq-key"] || ENV.GROQ_API_KEY || "").trim();

  app.get("/api/ai/status", async () => {
    const ok = !!(ENV.AI || ENV.GROQ_API_KEY);
    return {
      canRun: ok, ready: ok, loading: false, progress: "",
      error: ok ? "" : "no AI is connected to this server. add the Workers AI binding (AI) in worker-api/wrangler.toml, or set a GROQ_API_KEY secret.",
      model: ENV.AI ? CF_MODEL() : "groq", memoryMB: 0, vision: !!ENV.GROQ_API_KEY, serverKey: !!ENV.GROQ_API_KEY,
    };
  });

  function cleanMessages(list) {
    const out = []; let hasImage = false;
    for (const m of (Array.isArray(list) ? list : []).slice(-40)) {
      if (!m || !["system", "user", "assistant"].includes(m.role)) continue;
      if (typeof m.content === "string") { out.push({ role: m.role, content: m.content.slice(0, 20000) }); continue; }
      if (m.role === "user" && Array.isArray(m.content)) {
        const parts = [];
        for (const p of m.content.slice(0, 6)) {
          if (p?.type === "text" && typeof p.text === "string") parts.push({ type: "text", text: p.text.slice(0, 20000) });
          else if (p?.type === "image_url" && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(p.image_url?.url || "") && p.image_url.url.length < 6e6) {
            parts.push({ type: "image_url", image_url: { url: p.image_url.url } }); hasImage = true;
          }
        }
        if (parts.length) out.push({ role: "user", content: parts });
      }
    }
    return { messages: out, hasImage };
  }

  // Facts from Wikipedia (free, no key) so a small model can answer from sources instead of guessing.
  const looksLikeQuestion = (t) => t.trim().split(/\s+/).length >= 3 && (/\?\s*$/.test(t) || /^(what|who|when|where|why|how|which|tell me|explain|define|is|are|was|were|does|do|did|can)\b/i.test(t.trim()));
  async function wikiFacts(question) {
    try {
      const q = question.replace(/[?!.]+$/g, "").slice(0, 150);
      const url = "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=2&prop=extracts&exintro=1&explaintext=1&exchars=700&format=json&origin=*&gsrsearch=" + encodeURIComponent(q);
      const r = await withTimeout(fetch(url, { headers: { "user-agent": UA } }), 6000);
      if (!r.ok) return "";
      const pages = Object.values((await r.json())?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
      return pages.filter((p) => p.extract).map((p) => `${p.title}: ${p.extract.replace(/\s+/g, " ").trim()}`).join("\n\n");
    } catch { return ""; }
  }

  // Reads a server-sent-events body and calls onData(parsedJson) for each "data:" line
  async function readSse(body, onData, isClosed) {
    const reader = body.getReader(), dec = new TextDecoder();
    let buf = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done || isClosed()) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try { onData(JSON.parse(data)); } catch {}
        }
      }
    } finally { try { reader.cancel(); } catch {} }
  }

  // Text chat: Workers AI first, then Groq if a key is set. Streamed in the same format the page already reads.
  function localChat(req, reply, messages, web) {
    const flat = messages.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : m.content.filter((p) => p.type === "text").map((p) => p.text).join("\n") }));
    const sys = flat.find((m) => m.role === "system") || { role: "system", content: "You are Nex.AI, a friendly assistant. Keep answers short and clear." };
    let convo = flat.filter((m) => m.role !== "system").slice(-12), total = 0;
    convo = convo.reverse().filter((m) => (total += m.content.length) < 12000).reverse();
    const lastUser = [...convo].reverse().find((m) => m.role === "user");
    reply.header("access-control-allow-origin", "*").header("x-model", "nex-ai");

    return reply.stream(async (write, isClosed) => {
      const send = (text) => write("data: " + JSON.stringify({ choices: [{ delta: { content: text } }] }) + "\n\n");
      const note = (text) => write("data: " + JSON.stringify({ status: text }) + "\n\n");
      let failure = "";
      try {
        let facts = "";
        if (web && lastUser && looksLikeQuestion(lastUser.content)) { note("looking it up…"); facts = await wikiFacts(lastUser.content); }
        const system = { role: "system", content: sys.content + (facts ? "\n\nFacts from Wikipedia. Use them if they help, and say when you are not sure:\n" + facts : "") };
        if (ENV.AI) {
          try {
            const out = await ENV.AI.run(CF_MODEL(), { messages: [system, ...convo], stream: true, max_tokens: 1024 });
            let any = false;
            await readSse(out, (j) => {
              const t = j.response ?? j.choices?.[0]?.delta?.content ?? "";
              if (t) { any = true; send(t); }
            }, isClosed);
            if (any) { write("data: [DONE]\n\n"); return; }
            failure = "Workers AI gave an empty answer.";
          } catch (e) { failure = String(e?.message || e); }
        } else failure = "Workers AI is not connected to this server.";

        const key = ENV.GROQ_API_KEY;
        if (key && !isClosed()) { // optional extra: still answer as Nex.AI
          const up = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
            body: JSON.stringify({ model: AI_MODELS[1], messages: [system, ...convo], stream: true, temperature: 0.7, max_tokens: 2048 }),
          });
          if (!up.ok) throw new Error("backup answered " + up.status);
          const reader = up.body.getReader();
          try { for (;;) { const { value, done } = await reader.read(); if (done || isClosed()) break; write(value); } } finally { try { reader.cancel(); } catch {} }
          return;
        }
        send("⚠️ " + failure);
      } catch (e) { send("⚠️ " + String(e?.message || e)); }
      write("data: [DONE]\n\n");
    });
  }

  app.post("/api/ai/chat", async (req, reply) => {
    const body = req.body || {};
    const { messages, hasImage } = cleanMessages(body.messages);
    if (!messages.length) { reply.code(400); return { error: "no messages" }; }
    if (!hasImage) return localChat(req, reply, messages, body.web !== false);

    // Images and screen shares need a vision model, which only runs if a Groq key was added (by the owner, or sent by the user).
    const key = aiKey(req);
    if (!key) { reply.code(400); return { error: "vision_unavailable" }; }
    try {
      const up = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ model: VISION_MODEL(), messages, stream: true, temperature: 0.7, max_tokens: 4096 }),
      });
      if (!up.ok) { const t = await up.text(); reply.code(up.status); return { error: t.slice(0, 400), model: VISION_MODEL() }; }
      reply.header("content-type", "text/event-stream").header("cache-control", "no-cache").header("x-model", "nex-ai-vision");
      return reply.send(up.body);
    } catch (e) { reply.code(502); return { error: String(e?.message || e) }; }
  });

  /* ================= Diagnostics: open /api/diag in a browser to see exactly which outside service is failing ================= */
  // Note: this makes a lot of outgoing requests at once. On Cloudflare's free plan a single request may only make 50, so some checks can fail just because of that.
  app.get("/api/diag", async () => {
    const t = async (fn, limit = 30000) => {
      const s = Date.now();
      try { const info = await withTimeout(fn(), limit); return { ok: true, ms: Date.now() - s, info }; }
      catch (e) { return { ok: false, ms: Date.now() - s, error: String(e?.message || e).slice(0, 700) }; }
    };
    const names = ["youtubeSearch", "youtubeAudio", "soundcloudSearch", "soundcloudAudio", "audiusSearch", "audiusAudio", "gnMath", "obsidian", "ugs", "movies", "workersAI", "wikipedia", "gnFile", "obsidianFile", "ugsFile", "keysStorage", "liveCounter"];
    // picks a couple of real games from a list and asks the source whether their files exist
    const fileProbe = async (listFn) => {
      const games = await listFn();
      const out = [];
      for (const g of [games[0], games[Math.floor(games.length / 2)]].filter(Boolean)) {
        const m = String(g.play || "").match(/^\/api\/games\/f\/([a-z]+)\/(.+)$/); if (!m) continue;
        const p = decodeURIComponent(m[2]);
        const r = await fetchLib(m[1], p); // the same way the game route gets files, including its second source
        if (r) { try { r.body?.cancel(); } catch {} }
        out.push(`${g.name} -> ${r && r.ok ? "ok" : r ? "HTTP " + r.status : "no answer"} (${m[1]}/${p.slice(0, 70)})`);
      }
      if (!out.length) throw new Error("no playable games to test");
      if (out.some((x) => !x.includes("-> ok"))) throw new Error(out.join(" | "));
      return out.join(" | ");
    };
    const jobs = [
      t(async () => (await searchYouTube("blinding lights the weeknd")).length + " results"),
      t(async () => { const u = await youtubeUrl("dQw4w9WgXcQ"); return u ? "got an audio link" : ""; }),
      t(async () => (await searchSoundCloud("blinding lights the weeknd")).length + " results"),
      t(async () => { const r = (await searchSoundCloud("lofi hip hop"))[0]; if (!r) throw new Error("no search result to test"); const got = await scOpen(r.id); if (got.up) { try { got.up.body.cancel(); } catch {} return "whole-file stream"; } return "playlist stream (" + got.hls.segs.length + " pieces)"; }),
      t(async () => (await searchAudius("lofi")).length + " results"),
      t(async () => { const r = (await searchAudius("lofi"))[0]; if (!r) throw new Error("no search result to test"); const up = await audiusUp(r.id); try { up.body.cancel(); } catch {} return "audio " + (up.headers.get("content-type") || ""); }),
      t(async () => (await gnGames()).length + " games"),
      t(async () => (await obsidianGames()).length + " games"),
      t(async () => { const g = await ugsGames(); return g.length + " games, e.g. " + g.slice(5, 8).map((x) => x.name).join(", "); }),
      t(async () => {
        const h = await movies.health();
        const line = (s) => `${s.name}: ${s.ok === true ? "ok" : s.ok === null ? "not set up" : "FAILED"} (${s.detail})`;
        if (!h.anyOk) throw new Error("no movie source works. " + h.sources.map(line).join(" | "));
        return h.sources.map(line).join(" | ");
      }, 45000),
      t(async () => {
        if (!ENV.AI) throw new Error("the AI binding is not set (add [ai] binding = \"AI\" to worker-api/wrangler.toml)");
        const out = await ENV.AI.run(CF_MODEL(), { messages: [{ role: "user", content: "Say ok." }], max_tokens: 8 });
        return "answered with " + CF_MODEL() + ": " + String(out?.response ?? out?.choices?.[0]?.message?.content ?? "").slice(0, 40);
      }),
      t(async () => { const r = await wikiFacts("What is the moon?"); if (!r) throw new Error("no answer"); return "ok"; }),
      t(() => fileProbe(gnGames)),
      t(() => fileProbe(obsidianGames)),
      t(() => fileProbe(ugsGames)),
      t(async () => { if (!ENV.KEYS) throw new Error("the KEYS storage is not connected (ad-free keys need it)"); await ENV.KEYS.get("k:diag"); return "connected"; }),
      t(async () => { if (!ENV.LIVE) throw new Error("the LIVE Durable Object is not connected (the visitor count is then only a rough guess)"); return "count " + (await liveCall("/count")).count; }),
    ];
    const done = await Promise.all(jobs);
    const checks = {}; names.forEach((n, i) => { checks[n] = done[i]; });
    return {
      serverFiles: { "api-cf.js": true, "movies-cf.js": true, "library-cf.js": true, "namesplit-cf.js": true },
      node: "Cloudflare Workers", rssMB: 0, enoughMemoryForModel: true,
      huggingFaceTokenVariableSet: false,
      nexAi: { ready: !!(ENV.AI || ENV.GROQ_API_KEY), loading: false, processRunning: false, modelProcessMB: 0, progress: "", error: ENV.AI || ENV.GROQ_API_KEY ? "" : "no AI connected", model: ENV.AI ? CF_MODEL() : "groq" },
      checks,
    };
  });

}
