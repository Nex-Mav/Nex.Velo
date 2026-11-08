// Movies and TV for Nex.Velo. Only free, legal sources are used:
//   - Internet Archive (archive.org): public-domain films and classic TV that can be played right here. No key needed.
//   - TMDB (themoviedb.org): posters, details, seasons and episodes, trailers and "where to watch" links for almost every title.
//     It needs a free key: set TMDB_API_KEY (or TMDB_TOKEN) on the server. Without it, only the Internet Archive is used.
//   - TVmaze (tvmaze.com): TV shows, seasons, episode lists and which network or site carries them. Free, no key needed.
//   - Apple's public iTunes catalogue: film posters, descriptions, official trailers and Apple TV buy/rent links. Free, no key needed.
// TMDB, TVmaze and iTunes do not stream anything. For titles that are not free here they point to the services that do carry them.

import { Readable } from "node:stream";

// Books and audiobooks (the Entertainment app) live in lib/library.js. If that file is missing, only they are unavailable.
let registerLibrary = null;
try { ({ registerLibrary } = await import("./library.js")); } catch (e) { console.warn("[nex.velo] lib/library.js could not be loaded:", String(e?.message || e).slice(0, 160)); }

export function registerMovies(app, { withTimeout, UA, cached }) {
  const key = () => String(process.env.TMDB_API_KEY || process.env.TMDB_TOKEN || "").trim();

  // How well each source has been working lately. When the same title comes from two sources, the more reliable one is used.
  const health = { archive: { ok: 0, fail: 0 }, tmdb: { ok: 0, fail: 0 }, tvmaze: { ok: 0, fail: 0 }, itunes: { ok: 0, fail: 0 } };
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

  const MOVIE_COLL = ["feature_films", "SciFi_Horror", "silent_films", "animationandcartoons", "film_noir"];
  const TV_COLL = ["classic_tv", "classic_cartoons"];
  const isTvItem = (collections) => [].concat(collections || []).some((c) => TV_COLL.includes(c));
  async function archiveSearch(q, type) {
    const coll = (list) => "(" + list.map((c) => "collection:" + c).join(" OR ") + ")";
    const kind = type === "tv" ? coll(TV_COLL) : type === "movie" ? coll(MOVIE_COLL) : coll([...MOVIE_COLL, ...TV_COLL]);
    const words = String(q || "").replace(/[^\w\s'-]/g, " ").replace(/\s+/g, " ").trim();
    const p = new URLSearchParams({ q: `mediatype:movies AND ${kind}` + (words ? ` AND title:(${words})` : ""), rows: "30", page: "1", output: "json" });
    for (const f of ["identifier", "title", "year", "description", "collection"]) p.append("fl[]", f);
    p.append("sort[]", "downloads desc");
    const d = await arJson(`${AR}/advancedsearch.php?${p}`);
    return (d?.response?.docs || []).filter((x) => x.identifier && x.title).map((x) => ({
      source: "archive", id: "archive:" + x.identifier,
      type: isTvItem(x.collection) ? "tv" : "movie",
      title: clean(x.title).slice(0, 120), year: x.year ? String(one(x.year)).slice(0, 4) : "",
      poster: `${AR}/services/img/${encodeURIComponent(x.identifier)}`, overview: clean(x.description).slice(0, 400), playable: true,
    }));
  }

  const archiveMeta = (id) => cached("ar:meta:" + id, () => arJson(`${AR}/metadata/${encodeURIComponent(id)}`), 30 * 60 * 1000);

  // The playable video files of an item, one version of each (the browser can play mp4, m4v, webm and ogv itself).
  const NATIVE = /\.(mp4|m4v|webm|ogv)$/i;
  const fileRank = (f) => (/h\.?264/i.test(f.format || "") ? 0 : /mpeg4|mp4/i.test(f.format || "") || /\.mp4$/i.test(f.name) ? 1 : NATIVE.test(f.name) ? 2 : 3);
  function archiveVideos(meta) {
    const files = (meta?.files || []).filter((f) => /\.(mp4|m4v|mkv|avi|ogv|mpeg|mpg|webm)$/i.test(f.name) && !/(^|[_.-])(thumb|sample|trailer)/i.test(f.name));
    const best = new Map();
    for (const f of files) {
      const base = f.name.replace(/\.[^.]+$/, "").replace(/[_.-](ia|512kb|h264|mpeg4|hd)$/i, "");
      const prev = best.get(base);
      if (!prev || fileRank(f) < fileRank(prev) || (fileRank(f) === fileRank(prev) && (+f.size || 0) > (+prev.size || 0))) best.set(base, f);
    }
    return [...best.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
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

  // The best single file of a film: the standard-quality h.264 version, or the biggest playable one.
  function archiveMovieFile(meta) {
    const files = (meta?.files || []).filter((f) => NATIVE.test(f.name) && !/(^|[_.-])(thumb|sample|trailer)/i.test(f.name) && (+f.size || 0) < 2.5e9);
    files.sort((a, b) => fileRank(a) - fileRank(b) || (+b.size || 0) - (+a.size || 0));
    return files[0] ? files[0].name : "";
  }
  const encFile = (name) => String(name).split("/").map(encodeURIComponent).join("/");

  async function archivePlay(identifier, season, episode) {
    const meta = await archiveMeta(identifier);
    if (!meta || !meta.files) throw new Error("archive.org has no files for this item");
    if (meta.is_dark || String(meta.metadata?.["access-restricted-item"]) === "true") throw new Error("this item is restricted on archive.org");
    const eps = archiveEpisodes(meta);
    if (!eps.length) throw new Error("no playable video in this item");
    const embed = `${AR}/embed/${encodeURIComponent(identifier)}`;
    let file = "", embedUrl = embed;
    if (season != null && episode != null && eps.length > 1) {
      const hit = eps.find((e) => e.season === +season && e.number === +episode);
      if (hit) { file = hit.file; embedUrl = embed + "/" + encodeURIComponent(hit.file); }
    }
    if (!file) file = eps.length > 1 ? eps[0].file : archiveMovieFile(meta) || eps[0].file;
    const title = clean(meta.metadata?.title);
    // Played in the browser's own video player, with the file coming through this server, so it works where archive.org is blocked.
    // (If the file is a kind the browser can't play, the archive.org player page is used instead.)
    if (NATIVE.test(file)) return { kind: "video", url: "/api/movies/stream?u=" + encodeURIComponent(`${AR}/download/${encodeURIComponent(identifier)}/${encFile(file)}`), fallback: embedUrl, source: "archive", title };
    return { kind: "embed", url: embedUrl, source: "archive", title };
  }

  /* ================= TVmaze (free, no key): TV shows, seasons, episodes ================= */
  const TVM = "https://api.tvmaze.com";
  async function tvmJson(path, ms = 15000) {
    const r = await withTimeout(fetch(TVM + path, { headers: { "user-agent": UA, accept: "application/json" } }), ms);
    if (!r.ok) throw new Error("TVmaze answered " + r.status);
    return r.json();
  }
  const fromTvm = (s) => ({
    source: "tvmaze", id: "tvmaze:" + s.id, type: "tv", title: clean(s.name), year: String(s.premiered || "").slice(0, 4),
    poster: (s.image && (s.image.medium || s.image.original)) || "", overview: clean(s.summary).slice(0, 400), playable: false,
  });
  async function tvmazeSearch(q) {
    if (q) return (await tvmJson("/search/shows?q=" + encodeURIComponent(q))).map((x) => fromTvm(x.show)).slice(0, 30);
    const top = await cached("tvm:popular", async () => { // nothing typed: the most popular shows
      const all = [];
      for (const p of [0, 1, 2]) { try { all.push(...(await tvmJson("/shows?page=" + p))); } catch {} }
      if (!all.length) throw new Error("no shows came back");
      return all.filter((s) => s.image).sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 40);
    }, 6 * 3600e3);
    return top.map(fromTvm);
  }

  /* ================= Apple's public catalogue (free, no key): films, trailers ================= */
  const ITN = "https://itunes.apple.com";
  const POPULAR_FILMS = ["Inception", "Interstellar", "The Dark Knight", "Spirited Away", "Parasite", "Gladiator", "Toy Story", "The Matrix", "Jurassic Park", "Finding Nemo", "Avengers: Endgame", "The Lion King", "Coco", "Up", "Frozen", "Shrek", "Back to the Future", "Forrest Gump", "Spider-Man: Into the Spider-Verse", "Black Panther", "Moana", "Ratatouille", "The Incredibles", "Wall-E"];
  async function itnJson(path) {
    const r = await withTimeout(fetch(ITN + path, { headers: { "user-agent": UA, accept: "application/json" } }), 15000);
    if (!r.ok) throw new Error("iTunes answered " + r.status);
    return r.json();
  }
  const art = (u) => String(u || "").replace(/\/\d+x\d+bb\./, "/400x600bb.");
  const fromItn = (x) => (x && x.kind === "feature-movie" && x.trackId ? {
    source: "itunes", id: "itunes:" + x.trackId, type: "movie", title: clean(x.trackName), year: String(x.releaseDate || "").slice(0, 4),
    poster: art(x.artworkUrl100), overview: clean(x.longDescription || x.shortDescription).slice(0, 400), playable: false,
  } : null);
  async function itunesSearch(q, region) {
    const c = (region || "US").toLowerCase();
    if (q) {
      let d = await itnJson(`/search?term=${encodeURIComponent(q)}&media=movie&entity=movie&limit=30&country=${c}`);
      if (!(d.results || []).length && c !== "us") d = await itnJson(`/search?term=${encodeURIComponent(q)}&media=movie&entity=movie&limit=30&country=us`);
      return (d.results || []).map(fromItn).filter(Boolean);
    }
    const list = await cached("itn:popular:" + c, async () => { // nothing typed: a list of well-known films
      const res = await Promise.allSettled(POPULAR_FILMS.map((t) => itnJson(`/search?term=${encodeURIComponent(t)}&media=movie&entity=movie&limit=1&country=us`)));
      return res.flatMap((r) => (r.status === "fulfilled" ? (r.value.results || []).map(fromItn).filter(Boolean) : []));
    }, 6 * 3600e3);
    if (!list.length) throw new Error("no films came back");
    return list;
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
    if (type !== "movie") jobs.push(["tvmaze", () => tvmazeSearch(q)]);
    if (type !== "tv") jobs.push(["itunes", () => itunesSearch(q, region)]);
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
    // Mix the sources, so the first screen has free titles and well-known ones side by side.
    const lanes = new Map();
    for (const it of items) (lanes.get(it.source) || lanes.set(it.source, []).get(it.source)).push(it);
    const mixed = [];
    for (let i = 0; mixed.length < items.length; i++) for (const lane of lanes.values()) if (lane[i]) mixed.push(lane[i]);
    return { items: mixed, errors, tmdb: !!key(), sources: jobs.map(([n]) => n) };
  }

  /* ================= details, episodes, playing ================= */
  async function details(id, region) {
    if (id.startsWith("archive:")) {
      const ident = id.slice(8), meta = await archiveMeta(ident);
      const eps = archiveEpisodes(meta), m = meta.metadata || {};
      const tv = isTvItem(m.collection);
      const counts = new Map(); for (const e of eps) counts.set(e.season, (counts.get(e.season) || 0) + 1);
      return {
        id, source: "archive", type: tv ? "tv" : "movie", title: clean(m.title), year: String(one(m.year) || "").slice(0, 4), overview: clean(m.description).slice(0, 1200),
        poster: `${AR}/services/img/${encodeURIComponent(ident)}`, seasons: tv && eps.length > 1 ? [...counts].map(([number, count]) => ({ number, name: "Season " + number, count })) : [],
      };
    }
    if (id.startsWith("tvmaze:")) {
      const n = id.slice(7); if (!/^\d+$/.test(n)) throw new Error("bad title id");
      const s = await tvmJson(`/shows/${n}?embed[]=seasons`);
      const nets = [s.network?.name, s.webChannel?.name].filter(Boolean), link = s.officialSite || s.url || "";
      return {
        id, source: "tvmaze", type: "tv", title: clean(s.name), year: String(s.premiered || "").slice(0, 4), overview: clean(s.summary).slice(0, 1200),
        poster: (s.image && (s.image.medium || s.image.original)) || "", trailer: "",
        providers: nets.length || link ? { region: s.network?.country?.code || "", link, flatrate: nets, rent: [], buy: [] } : null,
        seasons: (s._embedded?.seasons || []).filter((x) => x.number).map((x) => ({ number: x.number, name: x.name ? clean(x.name) : "Season " + x.number, count: x.episodeOrder || 0 })),
      };
    }
    if (id.startsWith("itunes:")) {
      const n = id.slice(7); if (!/^\d+$/.test(n)) throw new Error("bad title id");
      const x = ((await itnJson(`/lookup?id=${n}&country=${(region || "US").toLowerCase()}`)).results || [])[0] || ((await itnJson(`/lookup?id=${n}&country=us`)).results || [])[0];
      if (!x) throw new Error("Apple's catalogue has no such film");
      const money = (v) => (v > 0 ? "Apple TV · " + (x.currency || "") + " " + Number(v).toFixed(2) : "");
      return {
        id, source: "itunes", type: "movie", title: clean(x.trackName), year: String(x.releaseDate || "").slice(0, 4), overview: clean(x.longDescription || x.shortDescription).slice(0, 1200),
        poster: art(x.artworkUrl100), trailer: "", trailerUrl: x.previewUrl || "", seasons: [],
        providers: { region: x.country || region || "US", link: x.trackViewUrl || "", flatrate: [], rent: [money(x.trackRentalPrice)].filter(Boolean), buy: [money(x.trackPrice)].filter(Boolean) },
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
    if (id.startsWith("tvmaze:")) {
      const n = id.slice(7); if (!/^\d+$/.test(n)) return [];
      const seasons = await cached("tvm:seasons:" + n, () => tvmJson(`/shows/${n}/seasons`), 3600e3), se = seasons.find((x) => x.number === +season);
      if (!se) return [];
      return (await cached("tvm:eps:" + se.id, () => tvmJson(`/seasons/${se.id}/episodes`), 3600e3)).filter((e) => e.number).map((e) => ({ number: e.number, name: clean(e.name), overview: clean(e.summary).slice(0, 300) }));
    }
    if (id.startsWith("itunes:")) return [];
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
      const src = cid.startsWith("archive:") ? "archive" : cid.startsWith("tmdb:") ? "tmdb" : cid.startsWith("tvmaze:") ? "tvmaze" : cid.startsWith("itunes:") ? "itunes" : "";
      if (!src) continue;
      try {
        if (src === "archive") { const r = await archivePlay(cid.slice(8), season, episode); note("archive", true); return { ...r, tried }; }
        if (!info || (!info.trailer && !info.trailerUrl)) { const d = await details(cid, region); note(src, true); info = { kind: "info", title: d.title, trailer: d.trailer, trailerUrl: d.trailerUrl, providers: d.providers }; }
        tried.push(src + ": no free stream, only information");
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
    try {
      const items = await archiveSearch("night of the living dead", "movie"), meta = await archiveMeta(items[0].id.slice(8)), file = archiveMovieFile(meta);
      if (!file) throw new Error("no file the browser can play in \"" + items[0].title + "\"");
      const r = await withTimeout(fetch(`${AR}/download/${encodeURIComponent(items[0].id.slice(8))}/${encFile(file)}`, { headers: { "user-agent": UA, range: "bytes=0-1023" }, redirect: "follow" }), 20000);
      if (!r.ok && r.status !== 206) throw new Error("archive.org answered " + r.status + " for the video file");
      try { r.body?.cancel(); } catch {}
      out.push({ name: "Built-in video player (the server streams a film file)", ok: true, detail: "\"" + items[0].title + "\": " + file + " can be streamed" });
    } catch (e) { out.push({ name: "Built-in video player (the server streams a film file)", ok: false, detail: String(e?.message || e) }); }
    try { const l = await tvmazeSearch("breaking bad"); if (!l.length) throw new Error("the search returned nothing"); note("tvmaze", true); out.push({ name: "TVmaze (TV shows, seasons, episodes. no key needed)", ok: true, detail: l.length + " results" }); }
    catch (e) { note("tvmaze", false); out.push({ name: "TVmaze (TV shows, seasons, episodes. no key needed)", ok: false, detail: String(e?.message || e) }); }
    try { const l = await itunesSearch("inception", "US"); if (!l.length) throw new Error("the search returned nothing"); note("itunes", true); out.push({ name: "Apple catalogue (film posters, trailers. no key needed)", ok: true, detail: l.length + " results" }); }
    catch (e) { note("itunes", false); out.push({ name: "Apple catalogue (film posters, trailers. no key needed)", ok: false, detail: String(e?.message || e) }); }
    if (!key()) out.push({ name: "TMDB (posters, seasons, trailers, where to watch)", ok: null, detail: "optional. add a free TMDB_API_KEY variable on the server for even more titles" });
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
    if (!/^https:\/\/(archive\.org\/services\/img\/|image\.tmdb\.org\/t\/p\/|static\.tvmaze\.com\/|is\d-ssl\.mzstatic\.com\/)/.test(u)) { reply.code(400); return "bad address"; }
    try {
      const up = await withTimeout(fetch(u, { headers: { "user-agent": UA }, redirect: "follow" }), 15000);
      const type = up.headers.get("content-type") || "";
      if (!up.ok || !/^image\//i.test(type)) { reply.code(404); return "no picture"; }
      reply.header("content-type", type).header("cache-control", "public, max-age=86400");
      return reply.send(Readable.fromWeb(up.body));
    } catch { reply.code(502); return "couldn't load the picture"; }
  });

  // Video comes through this server so it plays even where archive.org or Apple are blocked. Seeking works (Range requests are passed on).
  const STREAM_OK = /^https:\/\/(archive\.org\/download\/|[a-z0-9-]+\.(?:us\.)?archive\.org\/|video-ssl\.itunes\.apple\.com\/|[a-z0-9-]+\.mzstatic\.com\/|[a-z0-9-]+\.apple\.com\/)/i;
  app.get("/api/movies/stream", async (req, reply) => {
    const u = String(req.query?.u || "");
    if (!STREAM_OK.test(u)) { reply.code(400); return { error: "that address can't be streamed" }; }
    try {
      const up = await withTimeout(fetch(u, { headers: { "user-agent": UA, ...(req.headers.range ? { range: req.headers.range } : {}) }, redirect: "follow" }), 25000);
      if (!STREAM_OK.test(up.url || u)) { try { up.body?.cancel(); } catch {} reply.code(400); return { error: "the file moved somewhere that can't be streamed" }; }
      if (!up.ok && up.status !== 206) throw new Error("the source answered " + up.status);
      reply.code(up.status);
      const encoded = up.headers.get("content-encoding");
      for (const h of ["content-type", "content-length", "content-range"]) { const v = up.headers.get(h); if (v && !(h === "content-length" && encoded)) reply.header(h, v); }
      reply.header("accept-ranges", "bytes").header("cache-control", "public, max-age=3600");
      return reply.send(Readable.fromWeb(up.body));
    } catch (e) { return fail(reply, e); }
  });

  if (registerLibrary) registerLibrary(app, { withTimeout, UA, cached });
  else for (const r of ["books", "audiobooks", "audiobook", "audio", "img", "health"]) app.get("/api/ent/" + r, async (req, reply) => { reply.code(503); return { error: "the books server file (lib/library.js) is not on the server. upload it next to lib/api.js" }; });

  return { health: healthCheck };
}
