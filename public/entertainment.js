/* Entertainment: movies, tv shows, books and audiobooks in one page. Free and legal sources only.
   Movies and TV Shows reuse the Movies page (movies.js). Books and audiobooks come from lib/library.js on the server. */
(() => {
  "use strict";
  const NV = window.NV, page = document.getElementById("page-entertainment");
  if (!NV || !page) return;
  const { esc, LS } = NV;
  const $ = (s, r = page) => r.querySelector(s);

  const SECTIONS = [["movies", "movies"], ["tv", "tv shows"], ["books", "books"], ["audiobooks", "audiobooks"]];
  const ALIASES = { movie: "movies", movies: "movies", tv: "tv", "tv-shows": "tv", shows: "tv", show: "tv", books: "books", book: "books", audiobooks: "audiobooks", audio: "audiobooks" };
  const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  const I = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" stroke="none"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M6 5v14M18 5L9 12l9 7z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M18 5v14M6 5l9 7-9 7z"/></svg>',
  };

  const style = document.createElement("style");
  style.textContent = `
.ent{display:flex;flex-direction:column;height:100%;padding:1rem}
.ent>.ghead{margin-bottom:.75rem}
.ent-pane{display:flex;flex-direction:column;flex:1;min-height:0}
.ent-pane>.gpage{padding:0;flex:1;min-height:0}
.ent-pane .ghead{margin-bottom:.75rem}
.ent-reader{position:relative;height:min(72vh,46rem);border-radius:.875rem;overflow:hidden;background:var(--card)}
.ent-load{position:absolute;inset:0;z-index:2;display:grid;place-items:center;align-content:center;gap:.25rem;padding:1.5rem;text-align:center;color:var(--dim);background:var(--card);font-size:.875rem}
.ent-bar{display:flex;align-items:center;gap:.375rem;flex-wrap:wrap;margin-bottom:.625rem}
.ent-bar .btn{height:2rem;padding:0 .75rem}
.ent-bar select{height:2rem;max-width:14rem;padding:0 .5rem;background:var(--btn);color:var(--fg);border:0;border-radius:.625rem;font-size:.75rem}
.ent-bar .sp{flex:1}.ent-bar small{color:var(--dim);font-variant-numeric:tabular-nums;min-width:2.5rem;text-align:right}
.ent-text{position:relative;height:min(72vh,46rem);overflow:auto;padding:1.75rem 1.25rem 3rem;border-radius:.875rem;background:var(--card);-webkit-user-select:text;user-select:text}
.ent-page{max-width:40rem;margin:0 auto;font-size:var(--s,18px);line-height:1.75;font-family:var(--bf,inherit)}
.ent-page p{margin:0 0 1em;text-align:left;hyphens:auto}
.ent-page h3{margin:2.25em 0 1em;text-align:center;font-weight:500;font-size:1.0625em;letter-spacing:.02em}
.ent-reader iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
.ent-dl{display:flex;gap:.5rem;flex-wrap:wrap}
.ent-dl a{display:inline-flex;align-items:center;text-decoration:none;color:inherit}
.ent-sub{font-size:.75rem;color:var(--dim);margin:.25rem 0 .75rem}
.ent-pl{display:flex;align-items:center;gap:.75rem;padding:.75rem;border-radius:1rem;background:var(--btn);margin-bottom:.75rem}
.ent-pl .tm{flex:1;min-width:0}
.ent-seek{display:flex;align-items:center;gap:.5rem;font-size:.6875rem;color:var(--dim);font-variant-numeric:tabular-nums;margin-top:.25rem}
.ent-seek input{flex:1}
.ent-pl select{height:2rem;padding:0 .5rem;background:var(--chrome);color:var(--fg);border:0;border-radius:.5rem;font-size:.75rem}
.ent-ch{max-height:20rem;overflow:auto;margin-top:.5rem}
.ent-ch .trow{padding:.5rem .625rem}
.ent-ch .trow .tm b{font-weight:400}
.ent-pl .ib svg,.ent-ch svg{width:1.125rem;height:1.125rem;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
@media (prefers-reduced-motion:reduce){.ent *{transition:none!important;animation:none!important}}
`;
  document.head.appendChild(style);

  page.innerHTML = `<div class="ent">
<div class="ghead"><h2>entertainment</h2><div class="mtabs" id="ent-tabs">${SECTIONS.map(([id, label]) => `<button data-s="${id}">${label}</button>`).join("")}</div></div>
<div class="ent-pane" id="ent-mv" hidden></div>
<div class="ent-pane" id="ent-books" hidden>
  <div id="bk-browse" class="gbrowse">
    <div class="ghead"><input id="bk-q" type="text" placeholder="search free books" autocomplete="off" spellcheck="false"><small id="bk-count"></small></div>
    <div class="gscroll"><div id="bk-grid" class="ggrid mvgrid"></div><div class="msg" id="bk-msg"></div><button class="btn" id="bk-more" hidden style="display:block;margin:1rem auto 0">show more</button>
    <p class="mvnote">free books from Project Gutenberg and Open Library. these are public-domain books, so they are legal to read and download.</p></div>
  </div>
  <div id="bk-view" class="gbrowse" hidden>
    <div class="ghead"><button class="btn" id="bk-back" style="display:inline-flex;align-items:center;gap:.375rem">${BACK.replace("<svg", '<svg style="width:1rem;height:1rem;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"')}all books</button><b id="bk-title" style="flex:1;min-width:6rem"></b><button class="btn" id="bk-open">open in its own tab</button></div>
    <div class="mvdetail"><div class="mvside"><img id="bk-cover" alt=""><div class="mvmeta" id="bk-meta"></div><div class="ent-dl" id="bk-dl"></div></div>
    <div class="mvmain">
      <div class="ent-bar" id="bk-bar" hidden><button class="btn" id="bk-sm" aria-label="Smaller text">A−</button><button class="btn" id="bk-lg" aria-label="Larger text">A+</button><button class="btn" id="bk-font" aria-label="Change typeface">serif</button><select id="bk-chap" aria-label="Chapters"></select><span class="sp"></span><small id="bk-pct"></small><button class="btn" id="bk-mode">original page</button></div>
      <div class="ent-text" id="bk-text" hidden></div><div class="ent-reader" id="bk-reader" hidden></div><div class="msg" id="bk-rmsg"></div></div></div>
  </div>
</div>
<div class="ent-pane" id="ent-ab" hidden>
  <div id="ab-browse" class="gbrowse">
    <div class="ghead"><input id="ab-q" type="text" placeholder="search free audiobooks" autocomplete="off" spellcheck="false"><small id="ab-count"></small></div>
    <div class="gscroll"><div id="ab-grid" class="ggrid mvgrid"></div><div class="msg" id="ab-msg"></div><button class="btn" id="ab-more" hidden style="display:block;margin:1rem auto 0">show more</button>
    <p class="mvnote">free audiobooks from LibriVox, read by volunteers. they are public-domain books, so they are legal to listen to. your place is remembered for each book.</p></div>
  </div>
  <div id="ab-view" class="gbrowse" hidden>
    <div class="ghead"><button class="btn" id="ab-back" style="display:inline-flex;align-items:center;gap:.375rem">${BACK.replace("<svg", '<svg style="width:1rem;height:1rem;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"')}all audiobooks</button><b id="ab-title" style="flex:1;min-width:6rem"></b></div>
    <div class="mvdetail"><div class="mvside"><img id="ab-cover" alt=""><div class="mvmeta" id="ab-meta"></div></div>
    <div class="mvmain">
      <div class="ent-pl"><button class="ib" id="ab-prev" aria-label="Previous chapter">${I.prev}</button><button class="ib pbtn" id="ab-play" aria-label="Play or pause">${I.play}</button><button class="ib" id="ab-next" aria-label="Next chapter">${I.next}</button>
        <div class="tm"><b id="ab-now">choose a chapter</b><div class="ent-seek"><span id="ab-cur">0:00</span><input type="range" id="ab-seek" min="0" max="1000" value="0" aria-label="Seek"><span id="ab-dur">0:00</span></div></div>
        <select id="ab-speed" aria-label="Speed"><option value="1">1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></div>
      <div class="msg" id="ab-pmsg"></div>
      <div class="ent-ch" id="ab-ch"></div>
      <p id="ab-desc" class="ent-sub" style="max-width:46rem;line-height:1.6"></p>
    </div></div>
  </div>
</div>
</div>`;

  /* ---------- sections ---------- */
  let cur = LS.get("nexvelo.ent", "movies");
  if (!ALIASES[cur]) cur = "movies";
  let mvBound = false;
  const panes = { movies: "#ent-mv", tv: "#ent-mv", books: "#ent-books", audiobooks: "#ent-ab" };

  function adoptMovies() { // moves the existing Movies page (made by movies.js) in here
    if (mvBound) return;
    const old = document.querySelector("#page-movies .gpage");
    if (!old) return;
    $("#ent-mv").appendChild(old); mvBound = true;
    const tabs = document.getElementById("mvtabs"); if (tabs) tabs.style.display = "none"; // the sections above replace these tabs
  }
  function showMovies(kind, tries = 0) {
    adoptMovies();
    const view = document.getElementById("mv-view"), back = document.getElementById("mv-back");
    if (view && !view.hidden && back) back.click();
    const q = document.getElementById("mvq"); if (q) q.placeholder = kind === "tv" ? "search tv shows" : "search movies";
    const b = document.querySelector('#mvtabs [data-mv="' + (kind === "tv" ? "tv" : "movie") + '"]');
    if (b && NV.loaded.movies) { if (b.classList.contains("on")) NV.onMoviesOpen && NV.onMoviesOpen(); else b.click(); }
    else if (tries < 20) setTimeout(() => cur === (kind === "tv" ? "tv" : "movies") && showMovies(kind, tries + 1), 300); // movies.js is still loading
  }

  function show(id) {
    cur = id; LS.set("nexvelo.ent", id);
    for (const b of page.querySelectorAll("#ent-tabs button")) b.classList.toggle("on", b.dataset.s === id);
    for (const p of page.querySelectorAll(".ent-pane")) p.hidden = "#" + p.id !== panes[id];
    if (id === "movies" || id === "tv") showMovies(id);
    else if (id === "books") books.open();
    else audio.open();
    NV.syncChrome();
  }
  $("#ent-tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (b) show(b.dataset.s); });
  NV.entShow = (sub) => { const id = ALIASES[String(sub || "").toLowerCase()]; if (id) show(id); };
  NV.entSection = () => (cur === "tv" ? "tv-shows" : cur);
  NV.onEntOpen = () => show(cur);

  /* ---------- a grid of books or audiobooks (shared) ---------- */
  const img = (u) => (u ? NV.api("/api/ent/img?u=" + encodeURIComponent(u)) : "");
  const get = async (path) => {
    const r = await fetch(path); let d = {}; try { d = await r.json(); } catch {}
    if (!r.ok) throw new Error(d.error || "the server answered " + r.status);
    return d;
  };
  const card = (it, i) => {
    const hue = [...it.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 11);
    return `<button class="pcard" data-i="${i}"><i class="pimg" style="--h:${hue}"><b>${esc((it.title.trim()[0] || "?").toUpperCase())}</b>${it.cover ? `<img src="${esc(img(it.cover))}" alt="" loading="lazy" onerror="this.remove()">` : ""}</i><span>${esc(it.title)}</span><small>${esc(it.author || it.year || "")}</small></button>`;
  };
  function browser(prefix, endpoint, onPick) {
    const S = { items: [], page: 1, more: false, q: "", token: 0, timer: 0, loaded: false };
    const el = (s) => $("#" + prefix + "-" + s);
    async function load(append) {
      const my = ++S.token;
      el("msg").textContent = append ? "loading more…" : S.q ? "searching…" : "loading…";
      el("more").hidden = true;
      try {
        const d = await get(`${endpoint}?q=${encodeURIComponent(S.q)}&page=${S.page}`);
        if (my !== S.token) return;
        S.items = append ? S.items.concat(d.items || []) : d.items || []; S.more = !!d.more; S.loaded = true;
        el("grid").innerHTML = S.items.map(card).join("");
        el("count").textContent = S.items.length + " title" + (S.items.length === 1 ? "" : "s");
        el("msg").textContent = S.items.length ? "" : "nothing found for that. try another title or author.";
        el("more").hidden = !S.more;
      } catch (e) {
        if (my !== S.token) return;
        if (!append) { S.items = []; el("grid").innerHTML = ""; el("count").textContent = ""; }
        el("msg").innerHTML = ""; el("msg").textContent = "couldn't load this: " + e.message;
        const b = document.createElement("button"); b.className = "btn"; b.style.marginLeft = ".5rem"; b.textContent = "try again";
        b.addEventListener("click", () => load(append)); el("msg").appendChild(b);
      }
    }
    el("q").addEventListener("input", () => { clearTimeout(S.timer); S.timer = setTimeout(() => { S.q = el("q").value.trim(); S.page = 1; load(false); }, 350); });
    el("more").addEventListener("click", () => { S.page++; load(true); });
    el("grid").addEventListener("click", (e) => { const c = e.target.closest(".pcard"); if (c) onPick(S.items[+c.dataset.i]); });
    return { open() { if (!S.loaded) load(false); }, S };
  }

  /* ---------- books ---------- */
  // Project Gutenberg books open in a built-in reader (the server sends the clean text, so it is quick and works anywhere).
  // "original page" shows the book's own web page through the proxy instead. Other books always use the proxy.
  const books = (() => {
    let it = null, token = 0, mode = "simple", loadedId = "", saveT = 0, proxiedId = "";
    const b = browser("bk", "/api/ent/books", openBook);
    const prefs = (() => { try { return { size: 18, serif: true, ...JSON.parse(LS.get("nexvelo.bk.prefs", "{}")) }; } catch { return { size: 18, serif: true }; } })();
    const isPg = () => !!it && /^pg\d+$/.test(it.id);
    const posKey = () => "nexvelo.bk." + it.id;
    function applyPrefs() {
      const t = $("#bk-text"); t.style.setProperty("--s", prefs.size + "px"); t.style.setProperty("--bf", prefs.serif ? 'Georgia,"Times New Roman",serif' : "inherit");
      $("#bk-font").textContent = prefs.serif ? "serif" : "sans"; LS.set("nexvelo.bk.prefs", JSON.stringify(prefs));
    }
    function showMode(m) {
      mode = m;
      $("#bk-text").hidden = m !== "simple"; $("#bk-reader").hidden = m !== "original";
      $("#bk-bar").hidden = !isPg();
      for (const id of ["bk-sm", "bk-lg", "bk-font", "bk-chap", "bk-pct"]) $("#" + id).hidden = m !== "simple";
      $("#bk-mode").textContent = m === "simple" ? "original page" : "simple reader";
    }
    const pct = () => { const t = $("#bk-text"), r = t.scrollHeight - t.clientHeight; $("#bk-pct").textContent = r > 0 ? Math.round((t.scrollTop / r) * 100) + "%" : ""; };
    const savePos = () => { const t = $("#bk-text"), r = t.scrollHeight - t.clientHeight; if (it && loadedId === it.id && r > 0) LS.set(posKey(), String(t.scrollTop / r)); };

    async function loadSimple(my) {
      const msg = $("#bk-rmsg"); msg.textContent = "loading the text…";
      try {
        const d = await get("/api/ent/book?id=" + encodeURIComponent(it.id));
        if (my !== token) return;
        const host = $("#bk-text"); host.innerHTML = '<div class="ent-page"></div>'; const page = host.firstChild;
        const paras = String(d.text || "").split("\n\n"), heads = new Map((d.heads || []).map((h) => [h.i, h]));
        $("#bk-chap").innerHTML = '<option value="">chapters</option>' + (d.heads || []).slice(0, 300).map((h) => `<option value="${h.i}">${esc(h.t.slice(0, 48))}</option>`).join("");
        $("#bk-chap").style.display = (d.heads || []).length ? "" : "none";
        let i = 0; // drawn in small batches, so a long book never freezes the page
        const step = () => {
          if (my !== token) return;
          let html = ""; for (const end = Math.min(paras.length, i + 200); i < end; i++) html += heads.has(i) ? `<h3 data-i="${i}">${esc(paras[i])}</h3>` : `<p>${esc(paras[i])}</p>`;
          page.insertAdjacentHTML("beforeend", html);
          if (i < paras.length) setTimeout(step, 0);
          else { loadedId = it.id; msg.textContent = ""; const saved = parseFloat(LS.get(posKey(), "0")) || 0; host.scrollTop = saved * (host.scrollHeight - host.clientHeight); pct(); }
        };
        step();
      } catch (e) {
        if (my !== token) return;
        msg.textContent = "couldn't load the text (" + e.message + "). showing the original page instead.";
        showMode("original"); loadProxied(my);
      }
    }
    async function loadProxied(my) {
      if (proxiedId === it.id) return;
      proxiedId = it.id;
      const holder = $("#bk-reader"); holder.innerHTML = '<div class="ent-load" id="bk-load"><span>opening the book through the proxy…</span><small>big books can take a minute</small></div>';
      let f; try { f = await NV.proxyFrame(it.read); } catch { f = document.createElement("iframe"); f.src = it.read; } // through the proxy first, so it works where the site is blocked
      if (my !== token) return;
      holder.appendChild(f);
      f.addEventListener("load", () => { const l = $("#bk-load"); if (l) l.remove(); });
      setTimeout(() => { const l = $("#bk-load"); if (l && my === token) l.innerHTML = "<span>still loading…</span><small>you can also press “open in its own tab”.</small>"; }, 25000);
    }
    async function openBook(item) {
      it = item; const my = ++token; loadedId = ""; proxiedId = "";
      $("#bk-browse").hidden = true; $("#bk-view").hidden = false;
      $("#bk-title").textContent = item.title;
      $("#bk-cover").src = img(item.cover); $("#bk-cover").style.visibility = item.cover ? "visible" : "hidden";
      $("#bk-meta").textContent = [item.author, item.year, (item.subjects || []).join(", ")].filter(Boolean).join(" · ");
      $("#bk-dl").innerHTML = (item.downloads || []).map((d) => `<a class="btn" href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.label)}</a>`).join("");
      $("#bk-text").innerHTML = ""; $("#bk-reader").innerHTML = ""; $("#bk-rmsg").textContent = ""; $("#bk-chap").innerHTML = ""; $("#bk-pct").textContent = "";
      applyPrefs();
      if (isPg()) { showMode("simple"); loadSimple(my); } else { showMode("original"); $("#bk-bar").hidden = true; loadProxied(my); }
    }
    const close = () => { savePos(); ++token; it = null; loadedId = ""; proxiedId = ""; $("#bk-text").innerHTML = ""; $("#bk-reader").innerHTML = ""; $("#bk-view").hidden = true; $("#bk-browse").hidden = false; };
    $("#bk-back").addEventListener("click", close);
    $("#bk-open").addEventListener("click", () => { if (it) NV.openUrl(it.read); });
    $("#bk-sm").addEventListener("click", () => { prefs.size = Math.max(13, prefs.size - 1); applyPrefs(); });
    $("#bk-lg").addEventListener("click", () => { prefs.size = Math.min(30, prefs.size + 1); applyPrefs(); });
    $("#bk-font").addEventListener("click", () => { prefs.serif = !prefs.serif; applyPrefs(); });
    $("#bk-chap").addEventListener("change", (e) => { const h = $("#bk-text").querySelector('h3[data-i="' + e.target.value + '"]'); if (h) $("#bk-text").scrollTo({ top: h.offsetTop - 12, behavior: "smooth" }); e.target.value = ""; });
    $("#bk-text").addEventListener("scroll", () => { pct(); clearTimeout(saveT); saveT = setTimeout(savePos, 700); });
    $("#bk-mode").addEventListener("click", () => {
      if (!it) return; const my = token;
      if (mode === "simple") { showMode("original"); loadProxied(my); } else { showMode("simple"); if (loadedId !== it.id) loadSimple(my); }
    });
    return { open: b.open };
  })();

  /* ---------- audiobooks ---------- */
  const audio = (() => {
    const a = new Audio(); a.preload = "metadata";
    let book = null, idx = -1, token = 0, dragging = false, lastSave = 0;
    const key = () => "nexvelo.ab." + book.id;
    const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
    const b = browser("ab", "/api/ent/audiobooks", openBook);

    function paintChapters() {
      $("#ab-ch").innerHTML = book.tracks.map((t, i) => `<div class="trow${i === idx ? " now" : ""}" data-i="${i}"><div class="tm"><b>${esc(t.title)}</b><span>${t.length ? fmt(t.length) : ""}</span></div></div>`).join("");
    }
    function paintPlay() { $("#ab-play").innerHTML = a.paused ? I.play : I.pause; }
    function saveSpot(force) {
      if (!book || idx < 0 || (!force && Date.now() - lastSave < 4000)) return;
      lastSave = Date.now(); LS.set(key(), JSON.stringify({ i: idx, t: Math.floor(a.currentTime || 0) }));
    }
    function setSession() {
      if (!("mediaSession" in navigator) || !book) return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: book.tracks[idx].title, artist: book.author, album: book.title, artwork: book.cover ? [{ src: img(book.cover), sizes: "256x256" }] : [] });
        navigator.mediaSession.setActionHandler("play", () => a.play()); navigator.mediaSession.setActionHandler("pause", () => a.pause());
        navigator.mediaSession.setActionHandler("previoustrack", () => go(idx - 1)); navigator.mediaSession.setActionHandler("nexttrack", () => go(idx + 1));
      } catch {}
    }
    function go(i, auto, at) {
      if (!book || i < 0 || i >= book.tracks.length) return;
      idx = i; const t = book.tracks[i];
      a.src = NV.api(`/api/ent/audio?id=${encodeURIComponent(book.id)}&file=${encodeURIComponent(t.file)}`);
      a.playbackRate = +$("#ab-speed").value;
      if (at > 0) a.addEventListener("loadedmetadata", () => { try { a.currentTime = at; } catch {} }, { once: true });
      $("#ab-now").textContent = t.title; $("#ab-pmsg").textContent = ""; paintChapters(); setSession();
      if (auto) a.play().catch((e) => { $("#ab-pmsg").textContent = e.name === "NotAllowedError" ? "press play to start." : "couldn't play this chapter. try the next one."; });
      saveSpot(true);
    }
    async function openBook(item) {
      const my = ++token;
      $("#ab-browse").hidden = true; $("#ab-view").hidden = false;
      $("#ab-title").textContent = item.title;
      $("#ab-cover").src = img(item.cover); $("#ab-meta").textContent = [item.author, item.year].filter(Boolean).join(" · ");
      $("#ab-desc").textContent = item.overview || "";
      if (book && book.id === item.id) { paintChapters(); return; } // already loaded: keep playing
      a.pause(); book = null; idx = -1; $("#ab-ch").innerHTML = ""; $("#ab-now").textContent = "choose a chapter"; $("#ab-pmsg").textContent = "loading chapters…";
      try {
        const d = await get("/api/ent/audiobook?id=" + encodeURIComponent(item.id));
        if (my !== token) return;
        book = { id: item.id, title: d.title || item.title, author: d.author || item.author, cover: item.cover, tracks: d.tracks };
        if (d.description && !item.overview) $("#ab-desc").textContent = d.description;
        let spot = null; try { spot = JSON.parse(LS.get(key(), "null")); } catch {}
        paintChapters(); $("#ab-pmsg").textContent = spot ? "picked up where you left off. press play." : "press a chapter to start.";
        go(spot && spot.i < book.tracks.length ? spot.i : 0, false, spot ? spot.t : 0);
      } catch (e) { if (my === token) $("#ab-pmsg").textContent = "couldn't load this audiobook: " + e.message; }
    }
    const close = () => { ++token; $("#ab-view").hidden = true; $("#ab-browse").hidden = false; }; // the audio keeps playing

    $("#ab-back").addEventListener("click", close);
    $("#ab-ch").addEventListener("click", (e) => { const r = e.target.closest("[data-i]"); if (r) go(+r.dataset.i, true); });
    $("#ab-play").addEventListener("click", () => { if (!book) return; if (idx < 0) go(0, true); else if (a.paused) a.play().catch(() => {}); else a.pause(); });
    $("#ab-prev").addEventListener("click", () => { if (a.currentTime > 5) a.currentTime = 0; else go(idx - 1, true); });
    $("#ab-next").addEventListener("click", () => go(idx + 1, true));
    $("#ab-speed").addEventListener("change", (e) => { a.playbackRate = +e.target.value; });
    const seek = $("#ab-seek");
    seek.addEventListener("input", () => { dragging = true; $("#ab-cur").textContent = fmt((seek.value / 1000) * (a.duration || 0)); });
    seek.addEventListener("change", () => { if (a.duration) a.currentTime = (seek.value / 1000) * a.duration; dragging = false; saveSpot(true); });
    a.addEventListener("play", paintPlay); a.addEventListener("pause", () => { paintPlay(); saveSpot(true); });
    a.addEventListener("loadedmetadata", () => { $("#ab-dur").textContent = fmt(a.duration); });
    a.addEventListener("timeupdate", () => {
      if (!dragging && a.duration) { seek.value = Math.round((a.currentTime / a.duration) * 1000); $("#ab-cur").textContent = fmt(a.currentTime); }
      saveSpot(false);
    });
    a.addEventListener("ended", () => { if (book && idx + 1 < book.tracks.length) go(idx + 1, true); else { paintPlay(); LS.del(key()); } });
    a.addEventListener("error", () => { if (book && idx >= 0) $("#ab-pmsg").textContent = "this chapter wouldn't load. try the next one, or check Settings → diagnostics."; });
    // closing the Entertainment tab stops the audio. switching to another tab keeps it playing.
    new MutationObserver(() => { if (page.parentNode && page.parentNode.id === "pages" && !a.paused) a.pause(); }).observe(document.getElementById("pages"), { childList: true });
    paintPlay();
    return { open: b.open };
  })();

  NV.loaded.entertainment = true;
  if (page.parentNode && page.parentNode.id !== "pages") show(cur); // this tab was restored before the file finished loading
})(); 