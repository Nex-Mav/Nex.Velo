// Books and audiobooks for the Entertainment app. Only free, legal sources are used:
//   - Project Gutenberg (through the free Gutendex search) and Open Library: public-domain books that can be read right here.
//   - LibriVox on the Internet Archive: free audiobooks read by volunteers (public-domain books).
// This file is optional. If it is missing from the server, only books and audiobooks say so. Everything else keeps running.

import { Readable } from "node:stream";

export function registerLibrary(app, { withTimeout, UA, cached }) {
  const AR = "https://archive.org";
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const clean = (t) => String(one(t) || "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  const fail = (reply, e, code = 502) => { reply.code(code); return { error: String(e?.message || e) }; };
  const pageNo = (v) => Math.max(1, Math.min(50, parseInt(v, 10) || 1));

  async function getJson(url, ms = 20000) {
    const r = await withTimeout(fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, redirect: "follow" }), ms);
    if (!r.ok) throw new Error(new URL(url).hostname + " answered " + r.status);
    return r.json();
  }

  /* ================= Books ================= */
  const firstLast = (n) => (String(n).includes(",") ? String(n).split(",").map((s) => s.trim()).reverse().join(" ") : String(n));

  async function gutenberg(q, page) {
    const p = new URLSearchParams();
    if (q) p.set("search", q);
    if (page > 1) p.set("page", String(page));
    const d = await getJson("https://gutendex.com/books/?" + p);
    const items = (d.results || []).map((b) => {
      const f = b.formats || {};
      const find = (re) => (Object.entries(f).find(([k]) => re.test(k)) || [])[1] || "";
      const html = find(/^text\/html/), txt = find(/^text\/plain/), epub = find(/^application\/epub/), kindle = find(/mobipocket/);
      return {
        source: "gutenberg", id: "pg" + b.id, title: clean(b.title).slice(0, 140),
        author: (b.authors || []).map((a) => firstLast(a.name)).join("; ").slice(0, 100),
        subjects: (b.subjects || []).slice(0, 3), cover: f["image/jpeg"] || "", read: html || txt,
        downloads: [epub && { label: "epub", url: epub }, kindle && { label: "kindle", url: kindle }, txt && { label: "plain text", url: txt }].filter(Boolean),
      };
    }).filter((b) => b.read);
    return { items, more: !!d.next };
  }

  async function openLibrary(q, page) {
    const p = new URLSearchParams({ q: (q || "subject:fiction") + " ebook_access:public", limit: "24", page: String(page), fields: "key,title,author_name,first_publish_year,cover_i,ia" });
    const d = await getJson("https://openlibrary.org/search.json?" + p);
    const items = (d.docs || []).filter((x) => x.title && (x.ia || []).length).map((x) => {
      const ia = encodeURIComponent(x.ia[0]);
      return {
        source: "openlibrary", id: "ol" + String(x.key || x.title).replace(/\W/g, ""), title: clean(x.title).slice(0, 140),
        author: (x.author_name || []).slice(0, 2).join("; "), year: x.first_publish_year ? String(x.first_publish_year) : "",
        subjects: [], cover: x.cover_i ? `https://covers.openlibrary.org/b/id/${x.cover_i}-M.jpg` : "",
        read: `${AR}/stream/${ia}?ui=embed`, downloads: [{ label: "archive.org page", url: `${AR}/details/${ia}` }],
      };
    });
    return { items, more: (d.numFound || 0) > page * 24 };
  }

  app.get("/api/ent/books", async (req, reply) => {
    const q = String(req.query?.q || "").trim().slice(0, 100), page = pageNo(req.query?.page);
    try {
      return await cached(`ent:books:${page}:${q.toLowerCase()}`, async () => {
        try { const r = await gutenberg(q, page); if (r.items.length || page > 1) return { ...r, source: "gutenberg" }; } catch {}
        return { ...(await openLibrary(q, page)), source: "openlibrary" }; // Gutendex is down or found nothing: try Open Library
      }, 10 * 60 * 1000);
    } catch (e) { return fail(reply, e); }
  });

  // The plain text of a Project Gutenberg book, cleaned up for the built-in reader: the licence is cut off, lines are joined into
  // paragraphs, and chapter headings are found so the reader can offer a contents list.
  const NUM = "[\\dIVXLCDM]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|first|second|third|fourth|fifth";
  const HEAD = new RegExp("^(?:chapter|book|part|volume|canto|act|scene|section|letter|stave)\\s+(?:" + NUM + ")\\b[\\s.:\\-—]*.{0,50}$|^(?:preface|prologue|epilogue|introduction|contents|dedication|appendix)[.:]?$", "i");
  async function gutenbergText(n) {
    const urls = [`https://www.gutenberg.org/cache/epub/${n}/pg${n}.txt`, `https://www.gutenberg.org/ebooks/${n}.txt.utf-8`, `https://www.gutenberg.org/files/${n}/${n}-0.txt`];
    let raw = "", why = "";
    for (const u of urls) {
      try {
        const r = await withTimeout(fetch(u, { headers: { "user-agent": UA }, redirect: "follow" }), 30000);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const t = await r.text();
        if (t.length < 1500) throw new Error("the file was empty");
        raw = t; break;
      } catch (e) { why = String(e?.message || e); }
    }
    if (!raw) throw new Error("couldn't get the text of this book (" + why + ")");
    raw = raw.slice(0, 6e6).replace(/\r/g, "").replace(/^\uFEFF/, "");
    const a = raw.search(/\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/i), z = raw.search(/\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i);
    const body = raw.slice(a >= 0 ? raw.indexOf("\n", a) + 1 : 0, z >= 0 ? z : undefined);
    const paras = body.split(/\n\s*\n+/).map((p) => p.replace(/\s*\n\s*/g, " ").replace(/ {2,}/g, " ").trim()).filter(Boolean);
    const heads = [];
    paras.forEach((p, i) => {
      const caps = p.length > 3 && p.length <= 48 && p === p.toUpperCase() && (p.match(/[A-Z]/g) || []).length >= 5 && !/[.!?,;:]$/.test(p);
      if (p.length <= 70 && (HEAD.test(p) || /^[IVXLC]{1,7}\.?$/.test(p) || caps)) heads.push({ i, t: p });
    });
    return { text: paras.join("\n\n"), heads: heads.slice(0, 400) };
  }
  app.get("/api/ent/book", async (req, reply) => {
    const m = String(req.query?.id || "").match(/^pg(\d{1,6})$/);
    if (!m) { reply.code(400); return { error: "this book can only be read through its original page" }; }
    try { return await cached("ent:book:" + m[1], () => gutenbergText(m[1]), 6 * 3600e3); }
    catch (e) { return fail(reply, e); }
  });

  /* ================= Audiobooks (LibriVox) ================= */
  async function audiobookSearch(q, page) {
    const words = String(q || "").replace(/[^\w\s'-]/g, " ").replace(/\s+/g, " ").trim();
    const p = new URLSearchParams({
      q: "collection:librivoxaudio AND mediatype:audio" + (words ? ` AND (title:(${words}) OR creator:(${words}))` : ""),
      rows: "24", page: String(page), output: "json",
    });
    for (const f of ["identifier", "title", "creator", "year", "description"]) p.append("fl[]", f);
    p.append("sort[]", "downloads desc");
    const d = await getJson(`${AR}/advancedsearch.php?${p}`);
    const docs = d?.response?.docs || [];
    return {
      items: docs.filter((x) => x.identifier && x.title).map((x) => ({
        id: x.identifier, title: clean(x.title).slice(0, 120), author: clean(x.creator).slice(0, 80),
        year: x.year ? String(one(x.year)).slice(0, 4) : "", cover: `${AR}/services/img/${encodeURIComponent(x.identifier)}`,
        overview: clean(x.description).slice(0, 500),
      })),
      more: (d?.response?.numFound || 0) > page * 24,
    };
  }

  app.get("/api/ent/audiobooks", async (req, reply) => {
    const q = String(req.query?.q || "").trim().slice(0, 100), page = pageNo(req.query?.page);
    try { return await cached(`ent:ab:search:${page}:${q.toLowerCase()}`, () => audiobookSearch(q, page), 10 * 60 * 1000); }
    catch (e) { return fail(reply, e); }
  });

  const seconds = (v) => {
    if (v == null || v === "") return 0;
    const s = String(v);
    if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s));
    const parts = s.split(":").map(Number);
    return parts.some(Number.isNaN) ? 0 : parts.reduce((a, b) => a * 60 + b, 0);
  };

  async function audiobookTracks(id) {
    const m = await cached("ent:ab:meta:" + id, () => getJson(`${AR}/metadata/${encodeURIComponent(id)}`), 30 * 60 * 1000);
    const mp3 = (m.files || []).filter((f) => /\.mp3$/i.test(f.name));
    let files = mp3.filter((f) => /64kbps mp3/i.test(f.format || "")); // one copy of each chapter
    if (!files.length) files = mp3.filter((f) => /mp3/i.test(f.format || "") && !/_vbr|_128/i.test(f.name));
    if (!files.length) files = mp3;
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const meta = m.metadata || {};
    return {
      id, title: clean(meta.title), author: clean(meta.creator), description: clean(meta.description).slice(0, 900),
      tracks: files.map((f, i) => ({ file: f.name, title: clean(f.title) || "Chapter " + (i + 1), length: seconds(f.length) })),
    };
  }

  app.get("/api/ent/audiobook", async (req, reply) => {
    const id = String(req.query?.id || "");
    if (!/^[A-Za-z0-9._-]{3,120}$/.test(id)) { reply.code(400); return { error: "bad id" }; }
    try {
      const d = await audiobookTracks(id);
      if (!d.tracks.length) throw new Error("this audiobook has no playable chapters");
      return d;
    } catch (e) { return fail(reply, e); }
  });

  // Audio comes through this server so it plays even where archive.org is blocked. Seeking works (Range requests are passed on).
  app.get("/api/ent/audio", async (req, reply) => {
    const id = String(req.query?.id || ""), file = String(req.query?.file || "");
    if (!/^[A-Za-z0-9._-]{3,120}$/.test(id) || !/^[\w .,'()&+-]{1,200}\.mp3$/i.test(file)) { reply.code(400); return { error: "bad request" }; }
    try {
      const up = await withTimeout(fetch(`${AR}/download/${encodeURIComponent(id)}/${encodeURIComponent(file)}`, {
        headers: { "user-agent": UA, ...(req.headers.range ? { range: req.headers.range } : {}) }, redirect: "follow",
      }), 20000);
      if (!up.ok && up.status !== 206) throw new Error("archive.org answered " + up.status);
      reply.code(up.status);
      const encoded = up.headers.get("content-encoding");
      for (const h of ["content-type", "content-length", "content-range"]) { const v = up.headers.get(h); if (v && !(h === "content-length" && encoded)) reply.header(h, v); }
      reply.header("accept-ranges", "bytes").header("cache-control", "public, max-age=3600");
      return reply.send(Readable.fromWeb(up.body));
    } catch (e) { return fail(reply, e); }
  });

  /* ================= Pictures (only from the sources above) ================= */
  app.get("/api/ent/img", async (req, reply) => {
    const u = String(req.query?.u || "");
    if (!/^https:\/\/(www\.gutenberg\.org\/cache\/epub\/|covers\.openlibrary\.org\/|archive\.org\/services\/img\/)/.test(u)) { reply.code(400); return "bad address"; }
    try {
      const up = await withTimeout(fetch(u, { headers: { "user-agent": UA }, redirect: "follow" }), 15000);
      const type = up.headers.get("content-type") || "";
      if (!up.ok || !/^image\//i.test(type)) { reply.code(404); return "no picture"; }
      reply.header("content-type", type).header("cache-control", "public, max-age=86400");
      return reply.send(Readable.fromWeb(up.body));
    } catch { reply.code(502); return "couldn't load the picture"; }
  });

  /* ================= Health (used to find out what is failing) ================= */
  app.get("/api/ent/health", async () => {
    const out = [];
    const t = async (name, fn) => {
      const s = Date.now();
      try { out.push({ name, ok: true, detail: (await fn()) + " (" + (Date.now() - s) + " ms)" }); }
      catch (e) { out.push({ name, ok: false, detail: String(e?.message || e) }); }
    };
    await t("Books: Project Gutenberg (Gutendex)", async () => { const r = await gutenberg("pride", 1); if (!r.items.length) throw new Error("no results"); return r.items.length + " results"; });
    await t("Books: Open Library (backup)", async () => { const r = await openLibrary("pride", 1); if (!r.items.length) throw new Error("no results"); return r.items.length + " results"; });
    await t("Book text for the built-in reader (Gutenberg)", async () => { const d = await gutenbergText("84"); if (d.text.length < 5000) throw new Error("the text was too short"); return Math.round(d.text.length / 1000) + " thousand characters, " + d.heads.length + " chapter headings"; });
    await t("Audiobooks: LibriVox", async () => {
      const r = await audiobookSearch("", 1); if (!r.items.length) throw new Error("no results");
      const d = await audiobookTracks(r.items[0].id); if (!d.tracks.length) throw new Error("no chapters in " + r.items[0].title);
      return r.items.length + " results, \"" + r.items[0].title + "\" has " + d.tracks.length + " chapters";
    });
    return { sources: out, anyOk: out.some((s) => s.ok) };
  });

  return {};
}