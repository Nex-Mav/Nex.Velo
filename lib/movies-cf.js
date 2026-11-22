// Movies and TV for Nex.Velo, on Cloudflare Workers. Free and legal sources only:
//   - Internet Archive: public-domain films and classic TV, played right in the page (marked "free to watch")
//   - TVmaze: TV shows, seasons and episodes (no key)
//   - Apple's public catalogue (iTunes): film posters, descriptions and trailers (no key)
//   - TMDB: not used here (the page works without it)
// Routes: /api/movies/search, title, episodes, play, img, stream, health  (the page in public/movies.js calls these)
// Ids look like "ia:<identifier>", "tvmaze:<id>" or "itunes:<id>".

export function registerMovies(app, { withTimeout, UA, cached }) {
  const IA = "https://archive.org";
  const J = { headers: { "user-agent": UA, accept: "application/json" } };
  const getJson = async (url, ms = 12000) => {
    const r = await withTimeout(fetch(url, { ...J, redirect: "follow" }), ms);
    if (!r.ok) throw new Error(new URL(url).hostname + " answered " + r.status);
    return r.json();
  };
  const strip = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().slice(0, 900);
  const year = (v) => (String(v || "").match(/\d{4}/) || [""])[0];
  const key = (it) => (it.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "") + "|" + (it.year || "");
  const split = (id) => { const i = String(id).indexOf(":"); return i < 0 ? ["", String(id)] : [String(id).slice(0, i), String(id).slice(i + 1)]; };
  const iaImg = (id) => `${IA}/services/img/${encodeURIComponent(id)}`;

  /* ---------- sources: each gives a list of { id, source, title, year, type, poster, overview, playable } ---------- */
  async function tvmazeList(q) {
    const rows = q
      ? (await getJson("https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(q))).map((x) => x.show)
      : (await cached("tvmaze:popular", () => getJson("https://api.tvmaze.com/shows?page=0"), 6 * 3600e3)).filter((s) => s.rating?.average).sort((a, b) => b.rating.average - a.rating.average).slice(0, 40);
    return rows.filter(Boolean).map((s) => ({ id: "tvmaze:" + s.id, source: "tvmaze", title: s.name, year: year(s.premiered), type: "tv", poster: s.image?.original || s.image?.medium || "", overview: strip(s.summary), playable: false }));
  }
  async function itunesList(q) {
    if (!q) return [];
    const d = await getJson("https://itunes.apple.com/search?media=movie&entity=movie&limit=20&term=" + encodeURIComponent(q));
    return (d.results || []).filter((m) => m.trackId && m.trackName).map((m) => ({ id: "itunes:" + m.trackId, source: "itunes", title: m.trackName, year: year(m.releaseDate), type: "movie", poster: String(m.artworkUrl100 || "").replace("100x100", "400x600"), overview: strip(m.longDescription || m.shortDescription), playable: false }));
  }
  async function archiveList(q, type) {
    const col = type === "tv" ? "collection:classic_tv" : type === "movie" ? "(collection:feature_films OR collection:moviesandfilms)" : "(collection:feature_films OR collection:classic_tv OR collection:moviesandfilms)";
    const text = q ? `(title:(${q.replace(/["():\\]/g, " ")}) OR subject:(${q.replace(/["():\\]/g, " ")})) AND ` : "";
    const url = `${IA}/advancedsearch.php?q=${encodeURIComponent(`${text}mediatype:movies AND ${col}`)}&fl[]=identifier&fl[]=title&fl[]=year&fl[]=description&fl[]=collection&sort[]=downloads+desc&rows=${q ? 20 : 30}&output=json`;
    const d = await getJson(url, 15000);
    return (d.response?.docs || []).filter((x) => x.identifier && x.title).map((x) => {
      const cols = [].concat(x.collection || []);
      return { id: "ia:" + x.identifier, source: "ia", title: String(x.title), year: year(x.year), type: cols.includes("classic_tv") ? "tv" : "movie", poster: iaImg(x.identifier), overview: strip([].concat(x.description || []).join(" ")), playable: true };
    });
  }

  app.get("/api/movies/search", async (req) => {
    const q = String(req.query?.q || "").trim().slice(0, 100), type = ["movie", "tv"].includes(req.query?.type) ? req.query.type : "all";
    const jobs = [["internet archive", archiveList(q, type)]];
    if (type !== "movie") jobs.push(["tvmaze", tvmazeList(q)]);
    if (type !== "tv") jobs.push(["itunes", itunesList(q)]);
    const settled = await Promise.allSettled(jobs.map((j) => j[1]));
    const errors = {}, all = [];
    settled.forEach((r, i) => { if (r.status === "fulfilled") all.push(...r.value); else errors[jobs[i][0]] = String(r.reason?.message || r.reason).slice(0, 120); });
    // the same title from several sources becomes one card; the others are kept as backups ("alts")
    const byKey = new Map();
    for (const it of all) {
      if (type !== "all" && it.type !== type) continue;
      const k = key(it), have = byKey.get(k);
      if (!have) { byKey.set(k, { ...it, alts: [] }); continue; }
      have.alts.push({ id: it.id, source: it.source });
      if (it.playable) have.playable = true;
      if (!have.poster && it.poster) have.poster = it.poster;
      if (!have.overview && it.overview) have.overview = it.overview;
    }
    const items = [...byKey.values()].sort((a, b) => (b.playable ? 1 : 0) - (a.playable ? 1 : 0));
    return { items: items.slice(0, 60), tmdb: false, errors };
  });

  app.get("/api/movies/title", async (req, reply) => {
    const [src, id] = split(req.query?.id);
    try {
      if (src === "tvmaze") {
        const s = await getJson(`https://api.tvmaze.com/shows/${encodeURIComponent(id)}?embed=seasons`);
        const seasons = (s._embedded?.seasons || []).filter((x) => x.number).map((x) => ({ number: x.number, name: x.name || "Season " + x.number, count: x.episodeOrder || 0 }));
        return { source: "tvmaze", title: s.name, overview: strip(s.summary), poster: s.image?.original || s.image?.medium || "", seasons };
      }
      if (src === "itunes") {
        const d = await getJson("https://itunes.apple.com/lookup?id=" + encodeURIComponent(id));
        const m = (d.results || [])[0]; if (!m) throw new Error("itunes has no such title");
        return { source: "itunes", title: m.trackName, overview: strip(m.longDescription), poster: String(m.artworkUrl100 || "").replace("100x100", "400x600"), trailerUrl: m.previewUrl || "", providers: null, seasons: [] };
      }
      if (src === "ia") {
        const m = await getJson(`${IA}/metadata/${encodeURIComponent(id)}`, 15000);
        if (!m.metadata) throw new Error("the Internet Archive has no such item");
        return { source: "ia", title: m.metadata.title, overview: strip([].concat(m.metadata.description || []).join(" ")), poster: iaImg(id), seasons: [] };
      }
      reply.code(400); return { error: "unknown title id" };
    } catch (e) { reply.code(502); return { error: String(e?.message || e) }; }
  });

  app.get("/api/movies/episodes", async (req, reply) => {
    const [src, id] = split(req.query?.id), season = Number(req.query?.season);
    if (src !== "tvmaze") return { episodes: [] };
    try {
      const rows = await cached("eps:" + id, () => getJson(`https://api.tvmaze.com/shows/${encodeURIComponent(id)}/episodes`, 15000), 3600e3);
      return { episodes: rows.filter((e) => e.season === season && e.number).map((e) => ({ number: e.number, name: e.name || "" })) };
    } catch (e) { reply.code(502); return { episodes: [], error: String(e?.message || e) }; }
  });

  // The best video file of an Internet Archive item (an mp4 the browser can play)
  async function iaVideo(id) {
    const m = await cached("iameta:" + id, () => getJson(`${IA}/metadata/${encodeURIComponent(id)}`, 15000), 3600e3);
    const files = (m.files || []).filter((f) => /\.(mp4|m4v)$/i.test(f.name) && f.source !== "metadata");
    const rank = (f) => (/h\.?264|mpeg4/i.test(f.format || "") ? 0 : 1) + (/512kb|derivative/i.test((f.format || "") + (f.source || "")) ? 0 : 0.5);
    const pick = files.sort((a, b) => rank(a) - rank(b) || (Number(b.size) || 0) - (Number(a.size) || 0))[0];
    if (!pick) throw new Error("no playable video file");
    return `${IA}/download/${encodeURIComponent(id)}/${pick.name.split("/").map(encodeURIComponent).join("/")}`;
  }

  app.get("/api/movies/play", async (req, reply) => {
    const ids = [String(req.query?.id || ""), ...String(req.query?.alts || "").split(",")].filter(Boolean);
    const tried = []; let trailerUrl = "";
    for (const full of ids) {
      const [src, id] = split(full);
      try {
        if (src === "ia") {
          const file = await iaVideo(id);
          return { kind: "video", url: "/api/movies/stream?u=" + encodeURIComponent(file), fallback: `${IA}/embed/${encodeURIComponent(id)}` };
        }
        if (src === "itunes" && !trailerUrl) {
          const m = ((await getJson("https://itunes.apple.com/lookup?id=" + encodeURIComponent(id))).results || [])[0];
          if (m?.previewUrl) trailerUrl = m.previewUrl;
        }
        if (src !== "ia") tried.push(src + ": no free stream");
      } catch (e) { tried.push((src || "?") + ": " + String(e?.message || e).slice(0, 80)); }
    }
    if (trailerUrl) return { kind: "none", trailerUrl };
    if (tried.length && tried.every((t) => /no free stream/.test(t))) return { kind: "none" };
    reply.code(502); return { error: "no source could play this", tried };
  });

  const IMG_OK = /^https:\/\/([a-z0-9-]+\.)*(tvmaze\.com|mzstatic\.com|archive\.org)\//i;
  const VIDEO_OK = /^https:\/\/([a-z0-9-]+\.)*(archive\.org|mzstatic\.com|apple\.com)\//i;

  app.get("/api/movies/img", async (req, reply) => {
    const u = String(req.query?.u || "");
    if (!IMG_OK.test(u)) { reply.code(400); return "bad address"; }
    try {
      const up = await withTimeout(fetch(u, { headers: { "user-agent": UA }, redirect: "follow" }), 15000);
      const type = up.headers.get("content-type") || "";
      if (!up.ok || !/^image\//i.test(type)) { reply.code(404); return "no picture"; }
      reply.header("content-type", type).header("cache-control", "public, max-age=86400");
      return reply.send(up.body);
    } catch { reply.code(502); return "couldn't load the picture"; }
  });

  app.get("/api/movies/stream", async (req, reply) => {
    const u = String(req.query?.u || "");
    if (!VIDEO_OK.test(u)) { reply.code(400); return { error: "bad address" }; }
    try {
      const up = await withTimeout(fetch(u, { headers: { "user-agent": UA, ...(req.headers.range ? { range: req.headers.range } : {}) }, redirect: "follow" }), 20000);
      if (!up.ok && up.status !== 206) { reply.code(502); return { error: "the source answered " + up.status }; }
      reply.code(up.status);
      const encoded = up.headers.get("content-encoding");
      for (const h of ["content-type", "content-length", "content-range"]) { const v = up.headers.get(h); if (v && !(h === "content-length" && encoded)) reply.header(h, v); }
      reply.header("accept-ranges", "bytes").header("cache-control", "public, max-age=3600");
      return reply.send(up.body);
    } catch (e) { reply.code(502); return { error: String(e?.message || e) }; }
  });

  async function health() {
    const probe = async (name, fn) => { const s = Date.now(); try { const detail = await withTimeout(fn(), 12000); return { name, ok: true, detail: detail + " (" + (Date.now() - s) + " ms)" }; } catch (e) { return { name, ok: false, detail: String(e?.message || e).slice(0, 140) }; } };
    const sources = await Promise.all([
      probe("Internet Archive (free films and classic TV)", async () => (await archiveList("", "all")).length + " titles"),
      probe("TVmaze (shows, seasons, episodes)", async () => (await getJson("https://api.tvmaze.com/shows/1")).name),
      probe("Apple catalogue (posters, trailers)", async () => ((await itunesList("casablanca")).length) + " results"),
    ]);
    sources.push({ name: "TMDB (not used on Cloudflare)", ok: null, detail: "optional, not set up" });
    return { sources, anyOk: sources.some((s) => s.ok === true) };
  }
  app.get("/api/movies/health", async () => health());
  return { health };
}
