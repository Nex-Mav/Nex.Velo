/* Movies and TV: browse or search, pick a season and an episode, and play free titles right here.
   Free and legal sources only. The Internet Archive plays public-domain films and classic TV in a built-in player.
   TVmaze (TV shows, seasons, episodes) and Apple's public catalogue (film posters and trailers) need no key.
   TMDB (when the server has a key) adds even more titles, trailers and where-to-watch links. */
(() => {
  "use strict";
  const { esc, openUrl } = window.NV;
  const $ = (s, r = document) => r.querySelector(s);
  const region = ((navigator.language || "en-US").split("-")[1] || "US").toUpperCase();

  let kind = "all", items = [], cur = null, season = null, episode = null, searchToken = 0, playToken = 0, embedUrl = "", timer = 0;

  const get = async (path) => {
    const r = await fetch(path); let d = {}; try { d = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(d.error || "the server answered " + r.status); e.data = d; throw e; }
    return d;
  };
  const pic = (u) => (u ? window.NV.api("/api/movies/img?u=" + encodeURIComponent(u)) : ""); // pictures come through the server
  const label = (it) => [it.year, it.type === "tv" ? "tv show" : "movie"].filter(Boolean).join(" · ");
  const INFO = ["tmdb", "tvmaze", "itunes"]; // sources that give details, trailers and where-to-watch, but no free video

  function say(el, text, diag) { // a message, with an optional button that opens Settings > Diagnostics
    el.textContent = text || "";
    if (!text || !diag) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn"; b.textContent = "open diagnostics"; b.style.marginLeft = ".5rem";
    b.addEventListener("click", () => window.NV.openSettings("diagnostics")); el.appendChild(b);
  }
  const msg = (t, d) => say($("#mvmsg"), t, d), playMsg = (t, d) => say($("#mv-msg"), t, d);

  // When nothing loads, ask the server which source is failing and show that, so the cause is on screen instead of a blank page.
  async function explain() {
    const note = $("#mvnote"); note.style.whiteSpace = "pre-wrap";
    try {
      const h = await get("/api/movies/health");
      note.textContent = "what the server found:\n" + h.sources.map((x) => (x.ok === true ? "working: " : x.ok === false ? "FAILED: " : "optional: ") + x.name + " (" + x.detail + ")").join("\n");
    } catch (e) { note.textContent = "the movies part of the server didn't answer (" + e.message + "). check that lib/movies.js is uploaded and that the server is running."; }
  }

  /* ---------- the list ---------- */
  function renderGrid() {
    $("#mvgrid").innerHTML = items.map((it, i) => {
      const hue = [...it.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 11);
      return `<button class="pcard" data-i="${i}"><i class="pimg" style="--h:${hue}"><b>${esc((it.title.trim()[0] || "?").toUpperCase())}</b>${it.poster ? `<img src="${esc(pic(it.poster))}" alt="" loading="lazy" onerror="this.remove()">` : ""}</i><span>${esc(it.title)}</span><small>${esc(label(it))}${it.playable ? " · free to watch" : ""}</small></button>`;
    }).join("");
  }

  async function search() {
    const q = $("#mvq").value.trim(), my = ++searchToken;
    msg(q ? "searching…" : "loading titles…");
    try {
      const d = await get(`/api/movies/search?q=${encodeURIComponent(q)}&type=${kind}&region=${region}`);
      if (my !== searchToken) return;
      items = d.items || []; renderGrid();
      $("#mvcount").textContent = items.length + " title" + (items.length === 1 ? "" : "s");
      $("#mvnote").style.whiteSpace = ""; $("#mvnote").textContent = d.tmdb ? "" : "free films and classic TV (marked free to watch) play right here. other titles show details, trailers and where to watch. the server owner can add a free TMDB_API_KEY for even more.";
      const problems = Object.entries(d.errors || {}).map(([k, v]) => k + ": " + v).join("; ");
      if (!items.length) { msg((q ? "nothing found for that. try another title." : "no titles available right now.") + (problems ? " (" + problems + ")" : ""), !!problems); if (!q || problems) explain(); }
      else msg(""); // a source that returned nothing is not worth a warning when there are titles to show
    } catch (e) {
      if (my !== searchToken) return;
      items = []; renderGrid(); $("#mvcount").textContent = ""; msg("couldn't load movies: " + e.message, true); explain();
    }
  }

  /* ---------- one title ---------- */
  const stopPlayer = () => { const v = $("#mv-player video"); if (v) { try { v.pause(); v.removeAttribute("src"); v.load(); } catch {} } $("#mv-player").innerHTML = ""; embedUrl = ""; };

  // The browser's own video player. The file comes through the server, so it works where the source site is blocked.
  function showVideo(src, fallback) {
    const holder = $("#mv-player"); holder.innerHTML = ""; embedUrl = fallback || new URL(src, location.href).href; // so "open in its own tab" always has an address
    const v = document.createElement("video");
    v.controls = true; v.autoplay = true; v.playsInline = true; v.preload = "metadata"; v.src = src;
    v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;background:#000";
    v.addEventListener("error", () => {
      if (fallback) { playMsg("the built-in player couldn't play this file, so the original player page is used instead…"); showEmbed(fallback); }
      else playMsg("this video couldn't be played.");
    }, { once: true });
    holder.appendChild(v);
  }

  async function showEmbed(url) {
    const holder = $("#mv-player"); holder.innerHTML = ""; embedUrl = url;
    let el; try { el = await window.NV.proxyFrame(url); } catch { el = document.createElement("iframe"); el.src = url; } // through the proxy first, so it works where the site is blocked
    el.allow = "fullscreen; autoplay; encrypted-media"; el.setAttribute("allowfullscreen", "");
    holder.appendChild(el);
  }

  function showWhere(p) {
    const box = $("#mv-where");
    if (!p || !(p.flatrate.length || p.rent.length || p.buy.length)) { box.innerHTML = ""; return; }
    const row = (name, list) => (list.length ? `<div class="mvw"><small>${name}</small><div class="chips">${list.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>` : "");
    box.innerHTML = `<div class="dgh">where to watch (${esc(p.region)})</div>${row("stream", p.flatrate)}${row("rent", p.rent)}${row("buy", p.buy)}${p.link ? '<button class="btn" id="mv-all">see all options</button>' : ""}`;
    const all = $("#mv-all"); if (all) all.addEventListener("click", () => openUrl(p.link));
  }
  function showTrailer(key, url) { const b = $("#mv-trailer"); b.hidden = !(key || url); b.dataset.key = key || ""; b.dataset.url = url || ""; }

  async function loadEpisodes() {
    const sel = $("#mv-episode"); sel.innerHTML = ""; episode = null;
    if (season == null) return;
    for (const id of [cur.id, ...(cur.alts || []).map((a) => a.id)]) { // this title's own source first, then its backups
      try {
        const d = await get(`/api/movies/episodes?id=${encodeURIComponent(id)}&season=${season}`);
        if (!(d.episodes || []).length) continue;
        sel.innerHTML = d.episodes.map((e) => `<option value="${e.number}">${esc(e.number + ". " + (e.name || "episode " + e.number))}</option>`).join("");
        episode = +sel.value; return;
      } catch {}
    }
    sel.innerHTML = '<option value="">no episodes listed</option>';
  }

  async function openTitle(it) {
    cur = it; season = episode = null; ++playToken; stopPlayer();
    $("#mv-browse").hidden = true; $("#mv-view").hidden = false;
    $("#mv-title").textContent = it.title; $("#mv-meta").textContent = label(it); $("#mv-overview").textContent = it.overview || "";
    $("#mv-poster").src = pic(it.poster); $("#mv-poster").style.visibility = it.poster ? "visible" : "hidden";
    $("#mv-sel").hidden = true; showTrailer("", ""); $("#mv-where").innerHTML = ""; playMsg("loading details…");
    let d = null; const why = [];
    for (const id of [it.id, ...(it.alts || []).map((a) => a.id)]) { // this title's own source first, then its backups
      try { d = await get(`/api/movies/title?id=${encodeURIComponent(id)}&region=${region}`); break; } catch (e) { why.push(e.message); }
    }
    if (cur !== it) return;
    if (!d) { playMsg("couldn't load the details (" + why.join("; ") + "). you can still try play."); return; }
    $("#mv-overview").textContent = d.overview || it.overview || "";
    if (d.poster && !it.poster) { $("#mv-poster").src = pic(d.poster); $("#mv-poster").style.visibility = "visible"; }
    // a free title from the Internet Archive still gets its trailer and where-to-watch from TMDB when the server has it
    let extra = INFO.includes(d.source) ? d : null;
    if (!extra) { const alt = (it.alts || []).find((a) => INFO.includes(a.source)); if (alt) { try { extra = await get(`/api/movies/title?id=${encodeURIComponent(alt.id)}&region=${region}`); } catch {} } }
    if (cur !== it) return;
    if (extra) { showTrailer(extra.trailer, extra.trailerUrl); showWhere(extra.providers); if (!d.overview) $("#mv-overview").textContent = extra.overview || ""; }
    // seasons and episodes for tv shows
    const seasons = (d.seasons && d.seasons.length ? d.seasons : extra && extra.seasons) || [];
    if (it.type === "tv" && seasons.length) {
      $("#mv-season").innerHTML = seasons.map((s) => `<option value="${s.number}">${esc(s.name || "Season " + s.number)}${s.count ? " (" + s.count + " episode" + (s.count === 1 ? "" : "s") + ")" : ""}</option>`).join("");
      season = +$("#mv-season").value; $("#mv-sel").hidden = false; await loadEpisodes();
    }
    if (cur === it) playMsg(it.playable ? "press play to watch." : "press play to look for a source.");
  }

  async function play() {
    if (!cur) return;
    const my = ++playToken; stopPlayer(); playMsg("finding a source that works…");
    const qs = new URLSearchParams({ id: cur.id, alts: (cur.alts || []).map((a) => a.id).join(","), region });
    if (!$("#mv-sel").hidden && season != null) { qs.set("season", season); if (episode != null) qs.set("episode", episode); }
    try {
      const d = await get("/api/movies/play?" + qs);
      if (my !== playToken) return;
      if (d.kind === "video") { showVideo(window.NV.api(d.url), d.fallback); playMsg(""); return; }
      if (d.kind === "embed") { await showEmbed(d.url); playMsg(""); return; }
      if (d.trailer || d.trailerUrl) showTrailer(d.trailer, d.trailerUrl);
      if (d.providers) showWhere(d.providers);
      playMsg("there is no free stream of this title. " + (d.trailer || d.trailerUrl ? "you can watch the trailer. " : "") + (d.providers ? "see where to watch it below." : ""));
    } catch (e) {
      if (my !== playToken) return;
      playMsg("none of the sources could play this" + (e.data && e.data.tried && e.data.tried.length ? ": " + e.data.tried.join(" · ") : e.message ? ": " + e.message : "") + ".", true);
    }
  }

  const back = () => { ++playToken; stopPlayer(); cur = null; $("#mv-view").hidden = true; $("#mv-browse").hidden = false; };

  /* ---------- wiring ---------- */
  $("#mvtabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mv]"); if (!b) return;
    kind = b.dataset.mv; document.querySelectorAll("#mvtabs button").forEach((x) => x.classList.toggle("on", x === b)); search();
  });
  $("#mvq").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(search, 350); });
  $("#mvgrid").addEventListener("click", (e) => { const c = e.target.closest(".pcard"); if (c) openTitle(items[+c.dataset.i]); });
  $("#mv-back").addEventListener("click", back);
  $("#mv-play").addEventListener("click", play);
  $("#mv-trailer").addEventListener("click", (e) => {
    const k = e.currentTarget.dataset.key, u = e.currentTarget.dataset.url; ++playToken;
    if (u) { showVideo(window.NV.api("/api/movies/stream?u=" + encodeURIComponent(u)), ""); playMsg(""); } // a trailer file, played in the built-in player
    else if (k) { showEmbed("https://www.youtube-nocookie.com/embed/" + encodeURIComponent(k) + "?rel=0&autoplay=1"); playMsg(""); }
  });
  $("#mv-open").addEventListener("click", () => { if (embedUrl) openUrl(embedUrl); else window.NV.toast("press play first, then this opens the player in its own tab"); });
  $("#mv-season").addEventListener("change", async (e) => { season = +e.target.value; await loadEpisodes(); });
  $("#mv-episode").addEventListener("change", (e) => { episode = +e.target.value || null; });

  window.NV.onMoviesOpen = () => { if (!items.length) search(); };
  window.NV.loaded.movies = true;
})();
