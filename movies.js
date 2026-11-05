// Movies and TV for Nex.Velo. Only free, legal sources are used:
//   - Internet Archive (archive.org): public-domain films and classic TV that can be played right here. No key needed.
//   - TMDB (themoviedb.org): posters, details, seasons and episodes, trailers and "where to watch" links for almost every title.
//     It needs a free key: set TMDB_API_KEY (or TMDB_TOKEN) on the server. Without it, only the Internet Archive is used.
// TMDB does not stream anything. For titles that are not free here it points to the services that do carry them.

import { Readable } from "node:stream";

// Books and audiobooks (the Entertainment app) live in lib/library.js. If that file is missing, only they are unavailable.
let registerLibrary = null;
try { ({ registerLibrary } = await import("./library.js")); } catch (e) { console.warn("[nex.velo] lib/library.js could not be loaded:", String(e?.message || e).slice(0, 160)); }

export function registerMovies(app, { withTimeout, UA, cached }) {
  const key = () => String(process.env.TMDB_API_KEY || process.env.TMDB_TOKEN || "").trim();

  // How well each source has been working lately. When the same title comes from two sources, the more reliable one is used.
  const health = { archive: { ok: 0, fail: 0 }, tmdb: { ok: 0, fail: 0 } };
  const note = (src, ok) => { health[src][ok ? "ok" : "fail"]++; };
  const reliability = (src) => (health[src].ok + 2) / (health[src].ok + health[src].fail + 3);

  const norm = (t) => String(t || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/^(the|a|an) /, "").trim();
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const clean = (t) => String(one(t) || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

  /* ================= Internet Archive ================= */
  const AR = "https://archive.org";
  async function arJson(url, ms = 15000) {
    const r = await withTimeout(fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, redirect: "follow" }), ms);
    if (!r.ok) throw new Error("archive.org answered " + r.status);
    return r.json();
  }

  async function archiveSearch(q, type) {
    const kind = type === "tv" ? "collection:classic_tv" : type === "movie" ? "collection:feature_films" : "(collection:feature_films OR collection:classic_tv)";
    const words = String(q || "").replace(/[^\w\s'-]/g, " ").replace(/\s+/g, " ").trim();
    const p = new URLSearchParams({ q: `mediatype:movies AND ${kind}` + (words ? ` AND title:(${words})` : ""), rows: "30", page: "1", output: "json" });
    for (const f of ["identifier", "title", "year", "description", "collection"]) p.append("fl[]", f);
    p.append("sort[]", "downloads desc");
    const d = await arJson(`${AR}/advancedsearch.php?${p}`);
    return (d?.response?.docs || []).filter((x) => x.identifier && x.title).map((x) => ({
      source: "archive", id: "archive:" + x.identifier,
      type: [].concat(x.collection || []).includes("classic_tv") ? "tv" : "movie",
      title: clean(x.title).slice(0, 120), year: x.year ? String(one(x.year)).slice(0, 4) : "",
      poster: `${AR}/services/img/${encodeURIComponent(x.identifier)}`, overview: clean(x.description).slice(0, 400), playable: true,
    }));
  }

  const archiveMeta = (id) => cached("ar:meta:" + id, () => arJson(`${AR}/metadata/${encodeURIComponent(id)}`), 30 * 60 * 1000);

  // The playable video files of an item, one version of each.
  function archiveVideos(meta) {
    const files = (meta?.files || []).filter((f) => /\.(mp4|m4v|mkv|avi|ogv|mpeg|mpg|webm)$/i.test(f.name) && !/(^|[_.-])(thumb|sample|trailer)/i.test(f.name));
    const best = new Map();
    for (const f of files) {
      const base = f.name.replace(/\.[^.]+$/, "").replace(/\.(ia|512kb|h264|mpeg4)$/i, "");
      const score = /\.mp4$/i.test(f.name) || /h\.264|mpeg4/i.test(f.format || "") ? 2 : 1;
      const prev = best.get(base);
      if (!prev || score > prev.score) best.set(base, { f, score });
    }
    return [...best.values()].map((x) => x.f).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }

  // Episodes of an item. Names like S01E02 or 1x02 give real season and episode numbers, otherwise they are numbered in order.
  function archiveEpisodes(meta) {
    const out = []; let seq = 0;
    for (const f of archiveVideos(meta)) {
      const m = f.name.match(/s(\d{1,2})[ ._-]?e(\d{1,3})/i) || f.name.match(/(?:^|\D)(\d{1,2})x(\d{1,3})(?:\D|$)/i);
      out.push({ season: m ? +m[1] : 1, number: m ? +m[2] : ++seq, name: f.name.replace(/\.[^.]+$/, "").replace(/[_.]+/g, " ").trim(), file: f.name });
    }
    return out;
  }

  async function archivePlay(identifier, season, episode) {
    const meta = await archiveMeta(identifier);
    if (!meta || !meta.files) throw new Error("archive.org has no files for this item");
    if (meta.is_dark || String(meta.metadata?.["access-restricted-item"]) === "true") throw new Error("this item is restricted on archive.org");
    const eps = archiveEpisodes(meta);
    if (!eps.length) throw new Error("no playable video in this item");
    let url = `${AR}/embed/${encodeURIComponent(identifier)}`;
    if (season != null && episode != null && eps.length > 1) {
      const hit = eps.find((e) => e.season === +season && e.number === +episode);
      if (hit) url += "/" + encodeURIComponent(hit.file);
    }
    return { kind: "embed", url, source: "archive", title: clean(meta.metadata?.title) };
  }

  /* ================= TMDB ================= */
  const IMG = "https://image.tmdb.org/t/p/w342";
  async function tmdb(path, params = {}) {
    const k = key(); if (!k) throw new Error("no TMDB_API_KEY is set on the server");
    const u = new URL("https://api.themoviedb.org/3" + path);
    for (const [a, b] of Object.entries(params)) u.searchParams.set(a, b);
    const headers = { "user-agent": UA, accept: "application/json" };
    if (k.length > 40) headers.authorization = "Bearer " + k; else u.searchParams.set("api_key", k);
    const r = await withTimeout(fetch(u, { headers }), 15000);
    if (!r.ok) throw new Error("TMDB answered " + r.status + (r.status === 401 ? " (the key was refused)" : ""));
    return r.json();
  }
  const fromTmdb = (x, forced) => {
    const type = x.media_type || forced;
    if (type !== "movie" && type !== "tv") return null;
    return {
      source: "tmdb", id: `tmdb:${type}:${x.id}`, type, title: clean(x.title || x.name), year: String(x.release_date || x.first_air_date || "").slice(0, 4),
      poster: x.poster_path ? IMG + x.poster_path : "", overview: clean(x.overview).slice(0, 400), playable: false,
    };
  };
  async function tmdbSearch(q, type) {
    const d = q
      ? await tmdb(type === "movie" ? "/search/movie" : type === "tv" ? "/search/tv" : "/search/multi", { query: q, include_adult: "false" })
      : await tmdb(type === "movie" ? "/trending/movie/week" : type === "tv" ? "/trending/tv/week" : "/trending/all/week");
    return (d.results || []).map((x) => fromTmdb(x, type === "all" ? "" : type)).filter(Boolean).slice(0, 30);
  }
  const providers = (wp, region) => {
    const r = wp?.results?.[region] || wp?.results?.US || null; if (!r) return null;
    const names = (l) => (l || []).map((x) => x.provider_name);
    return { region: wp?.results?.[region] ? region : "US", link: r.link || "", flatrate: names(r.flatrate), rent: names(r.rent), buy: names(r.buy) };
  };

  /* ================= merging results ================= */
  const score = (it) => reliability(it.source) + (it.playable ? 0.5 : 0);
  async function search(q, type, region) {
    const jobs = [["archive", () => archiveSearch(q, type)]];
    if (key()) jobs.push(["tmdb", () => tmdbSearch(q, type)]);
    const res = await Promise.allSettled(jobs.map(([, f]) => f()));
    const errors = {}, all = [];
    res.forEach((r, i) => {
      const name = jobs[i][0];
      if (r.status === "fulfilled") { note(name, true); all.push(...r.value); }
      else { note(name, false); errors[name] = String(r.reason?.message || r.reason); }
    });
    // The same title from more than one source becomes one card. The most reliable source is used, the others stay as backups,
    // and the picture can come from any of them.
    const buckets = new Map();
    for (const it of all) {
      const k = norm(it.title); if (!k) continue;
      const list = buckets.get(k) || buckets.set(k, []).get(k);
      const group = list.find((g) => !g[0].year || !it.year || g[0].year === it.year);
      group ? group.push(it) : list.push([it]);
    }
    const items = [];
    for (const list of buckets.values()) for (const group of list) {
      group.sort((a, b) => score(b) - score(a));
      const [win, ...rest] = group;
      items.push({ ...win, poster: win.poster || rest.find((r) => r.poster)?.poster || "", alts: rest.map((r) => ({ id: r.id, source: r.source })), sources: group.map((g) => g.source) });
    }
    return { items, errors, tmdb: !!key() };
  }

  /* ================= details, episodes, playing ================= */
  async function details(id, region) {
    if (id.startsWith("archive:")) {
      const ident = id.slice(8), meta = await archiveMeta(ident);
      const eps = archiveEpisodes(meta), m = meta.metadata || {};
      const tv = [].concat(m.collection || []).includes("classic_tv");
      const counts = new Map(); for (const e of eps) counts.set(e.season, (counts.get(e.season) || 0) + 1);
      return {
        id, source: "archive", type: tv ? "tv" : "movie", title: clean(m.title), year: String(one(m.year) || "").slice(0, 4), overview: clean(m.description).slice(0, 1200),
        poster: `${AR}/services/img/${encodeURIComponent(ident)}`, seasons: tv && eps.length > 1 ? [...counts].map(([number, count]) => ({ number, name: "Season " + number, count })) : [],
      };
    }
    const [, kind, n] = id.split(":");
    if (!["movie", "tv"].includes(kind) || !/^\d+$/.test(n || "")) throw new Error("bad title id");
    const d = await tmdb(`/${kind}/${n}`, { append_to_response: "videos,watch/providers" });
    const vids = (d.videos?.results || []).filter((v) => v.site === "YouTube");
    const trailer = (vids.find((v) => v.type === "Trailer") || vids[0] || {}).key || "";
    return {
      id, source: "tmdb", type: kind, title: clean(d.title || d.name), year: String(d.release_date || d.first_air_date || "").slice(0, 4), overview: clean(d.overview).slice(0, 1200),
      poster: d.poster_path ? IMG + d.poster_path : "", trailer, providers: providers(d["watch/providers"], region),
      seasons: kind === "tv" ? (d.seasons || []).filter((s) => s.episode_count > 0).map((s) => ({ number: s.season_number, name: clean(s.name), count: s.episode_count })) : [],
    };
  }

  async function episodes(id, season) {
    if (id.startsWith("archive:")) return archiveEpisodes(await archiveMeta(id.slice(8))).filter((e) => e.season === +season).map(({ number, name }) => ({ number, name }));
    const [, kind, n] = id.split(":");
    if (kind !== "tv" || !/^\d+$/.test(n || "")) return [];
    const d = await tmdb(`/tv/${n}/season/${+season}`);
    return (d.episodes || []).map((e) => ({ number: e.episode_number, name: clean(e.name), overview: clean(e.overview).slice(0, 300) }));
  }

  // Try the title's best source, then each backup, until one can play it. A source that only has information (no free stream)
  // is remembered, so that if nothing can play, the trailer and "where to watch" are still shown.
  async function play(id, alts, season, episode, region) {
    const tried = []; let info = null;
    for (const cid of [id, ...alts]) {
      const src = cid.startsWith("archive:") ? "archive" : cid.startsWith("tmdb:") ? "tmdb" : "";
      if (!src) continue;
      try {
        if (src === "archive") { const r = await archivePlay(cid.slice(8), season, episode); note("archive", true); return { ...r, tried }; }
        if (!info) { const d = await details(cid, region); note("tmdb", true); info = { kind: "info", title: d.title, trailer: d.trailer, providers: d.providers }; }
        tried.push("tmdb: no free stream, only information");
      } catch (e) { note(src, false); tried.push(src + ": " + String(e?.message || e).slice(0, 120)); }
    }
    if (info) return { ...info, tried };
    const err = new Error("none of the sources could play this"); err.tried = tried; throw err;
  }

  /* ================= checks for Diagnostics ================= */
  async function healthCheck() {
    const out = [];
    try {
      const items = await archiveSearch("night of the living dead", "movie");
      if (!items.length) throw new Error("the search returned nothing");
      try { await archivePlay(items[0].id.slice(8)); } catch (e) { throw new Error("search works, but playing fails: " + (e.message || e)); }
      note("archive", true); out.push({ name: "Internet Archive (free movies and classic TV)", ok: true, detail: items.length + " results and \"" + items[0].title + "\" can be played" });
    } catch (e) { note("archive", false); out.push({ name: "Internet Archive (free movies and classic TV)", ok: false, detail: String(e?.message || e) }); }
    if (!key()) out.push({ name: "TMDB (posters, seasons, trailers, where to watch)", ok: null, detail: "not set up. add a free TMDB_API_KEY variable on the server to turn it on" });
    else {
      try { const items = await tmdbSearch("inception", "movie"); if (!items.length) throw new Error("the search returned nothing"); note("tmdb", true); out.push({ name: "TMDB (posters, seasons, trailers, where to watch)", ok: true, detail: items.length + " results" }); }
      catch (e) { note("tmdb", false); out.push({ name: "TMDB (posters, seasons, trailers, where to watch)", ok: false, detail: String(e?.message || e) }); }
    }
    return { sources: out, anyOk: out.some((s) => s.ok === true) };
  }

  /* ================= routes ================= */
  const fail = (reply, e, code = 502) => { reply.code(code); return { error: String(e?.message || e), ...(e?.tried ? { tried: e.tried } : {}) }; };
  const region = (q) => (/^[A-Za-z]{2}$/.test(String(q || "")) ? String(q).toUpperCase() : "US");

  app.get("/api/movies/search", async (req, reply) => {
    const q = String(req.query?.q || "").trim().slice(0, 100), type = ["movie", "tv"].includes(req.query?.type) ? req.query.type : "all";
    try { return await cached("mv:search:" + type + ":" + norm(q), () => search(q, type, region(req.query?.region)), 5 * 60 * 1000); }
    catch (e) { return fail(reply, e); }
  });
  app.get("/api/movies/title", async (req, reply) => {
    try { return await details(String(req.query?.id || ""), region(req.query?.region)); } catch (e) { return fail(reply, e); }
  });
  app.get("/api/movies/episodes", async (req, reply) => {
    try { return { episodes: await episodes(String(req.query?.id || ""), req.query?.season) }; } catch (e) { return fail(reply, e); }
  });
  app.get("/api/movies/play", async (req, reply) => {
    const alts = String(req.query?.alts || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4);
    const num = (v) => (v == null || v === "" ? null : +v);
    try { return await play(String(req.query?.id || ""), alts, num(req.query?.season), num(req.query?.episode), region(req.query?.region)); }
    catch (e) { return fail(reply, e); }
  });
  app.get("/api/movies/health", async () => healthCheck());

  // Pictures come through this server, so they load even where archive.org or TMDB are blocked.
  app.get("/api/movies/img", async (req, reply) => {
    const u = String(req.query?.u || "");
    if (!/^https:\/\/(archive\.org\/services\/img\/|image\.tmdb\.org\/t\/p\/)/.test(u)) { reply.code(400); return "bad address"; }
    try {
      const up = await withTimeout(fetch(u, { headers: { "user-agent": UA }, redirect: "follow" }), 15000);
      const type = up.headers.get("content-type") || "";
      if (!up.ok || !/^image\//i.test(type)) { reply.code(404); return "no picture"; }
      reply.header("content-type", type).header("cache-control", "public, max-age=86400");
      return reply.send(Readable.fromWeb(up.body));
    } catch { reply.code(502); return "couldn't load the picture"; }
  });

  if (registerLibrary) registerLibrary(app, { withTimeout, UA, cached });
  else for (const r of ["books", "audiobooks", "audiobook", "audio", "img", "health"]) app.get("/api/ent/" + r, async (req, reply) => { reply.code(503); return { error: "the books server file (lib/library.js) is not on the server. upload it next to lib/api.js" }; });

  return { health: healthCheck };
}