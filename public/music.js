/* Music: search YouTube Music + SoundCloud + Audius, play through the Nex.Velo server, lyrics, playlists, recently played. */
(() => {
  "use strict";
  const { settings, esc, toast, LS } = window.NV;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const load = (k, d) => { try { return JSON.parse(LS.get(k, "")) ?? d; } catch { return d; } };
  const store = (k, v) => LS.set(k, JSON.stringify(v));
  const key = (t) => t.source + ":" + t.id;
  const fmt = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "");
  const srcName = (s) => (s === "youtube" ? "youtube music" : s === "audius" ? "audius" : "soundcloud");
  // every request goes through NV.api, so it reaches the Nex.Velo server even when the page is opened from another host
  const api = (p) => window.NV.api(p);
  // drawing data for the extra icons (used both on this page and inside the pop-out window)
  const PATH = {
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    one: '<path d="M10.2 10.2l1.8-1v6.3"/>',
    vol: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
  };
  const nvi = (inner) => `<svg class="nvi" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5v14M17 5v14"/></svg>',
    down: '<svg class="nvi" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    up: '<svg class="nvi" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    plus: '<svg class="nvi" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg class="nvi" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    x: '<svg class="nvi" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    prev: '<svg class="nvi" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14"/><path d="M19 5.5v13L9 12z" style="fill:currentColor"/></svg>',
    next: '<svg class="nvi" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14"/><path d="M5 5.5v13L15 12z" style="fill:currentColor"/></svg>',
    shuffle: nvi(PATH.shuffle), repeat: nvi(PATH.repeat), repeat1: nvi(PATH.repeat + PATH.one),
  };
  const tfmt = (v) => { v = Math.max(0, Math.floor(v || 0)); return Math.floor(v / 60) + ":" + String(v % 60).padStart(2, "0"); };

  let playlists = load("nexvelo.playlists", []); // [{id, name, tracks: []}]
  let recent = load("nexvelo.recent", []); // [track]
  let results = [], lastStatus = null, openPl = null, musicTab = false;
  let pip = null; // the pop-out player window, when it is open

  /* ---------- saved player state ---------- */
  const saved = load("nexvelo.music", {}); // {collapsed, cur, queue, qi, pos}
  let collapsed = !!saved.collapsed;
  let cur = saved.cur || null, queue = saved.queue || [], qi = saved.qi ?? -1, playing = false, pos = saved.pos || 0, dur = saved.cur?.dur || 0;
  let shuffleOn = !!saved.shuffle, repeatMode = Number(saved.repeat) || 0; // repeat: 0 off, 1 all, 2 one song
  let resumeAt = pos, lastSave = 0;
  const persist = (force) => {
    const now = Date.now(); if (!force && now - lastSave < 4000) return; lastSave = now;
    store("nexvelo.music", { collapsed, cur, queue: queue.slice(0, 100), qi, pos, shuffle: shuffleOn, repeat: repeatMode });
  };

  /* ---------- audio (streamed through this server so the browser never talks to YouTube/SoundCloud) ---------- */
  const audio = new Audio();
  audio.preload = "none";
  const yt = { p: null, ready: null, on: false, tried: new Set() };
  // the song's artist + title go along so the server can fall back to the same song on another source by itself
  const srcFor = (t) => api(`/api/music/stream?source=${t.source}&id=${encodeURIComponent(t.id)}&q=${encodeURIComponent(`${t.artist || ""} ${t.title || ""}`.trim())}`);

  audio.addEventListener("play", () => { if (!yt.on) setPlaying(true); });
  audio.addEventListener("pause", () => { if (yt.on) return; setPlaying(false); persist(true); });
  audio.addEventListener("ended", () => { if (!yt.on) next(false); });
  audio.addEventListener("durationchange", () => { if (isFinite(audio.duration) && audio.duration > 0) { dur = audio.duration; paintProgress(); } });
  audio.addEventListener("loadedmetadata", () => {
    if (isFinite(audio.duration)) dur = audio.duration;
    if (resumeAt > 1 && resumeAt < dur) audio.currentTime = resumeAt;
    resumeAt = 0;
  });
  audio.addEventListener("timeupdate", () => { if (yt.on) return; pos = audio.currentTime || 0; if (isFinite(audio.duration)) dur = audio.duration; paintProgress(); syncLyrics(); persist(); posState(); });
  audio.addEventListener("error", () => { if (!yt.on) onFail(); });

  let failedOnce = new Set();
  async function onFail() {
    if (!cur || yt.on) return;
    const k = key(cur);
    // the server has already tried every source it knows. what's left: another SoundCloud match, then YouTube's own player
    if (cur.source === "youtube" && !failedOnce.has(k)) {
      failedOnce.add(k);
      if (await scAlt()) return;
    }
    if (cur.source === "youtube" && !yt.tried.has(k)) {
      yt.tried.add(k);
      if (await startEmbed(cur)) { toast("playing it through YouTube directly"); return; }
    }
    setPlaying(false); toast("couldn't play that: " + (await reasonFor(cur) || "the server couldn't get the audio") + ". try another.");
  }

  async function scAlt() {
    if (!cur) return false;
    try {
      const r = await fetch(api("/api/music/alt?q=" + encodeURIComponent(`${cur.artist} ${cur.title}`)));
      const d = await r.json();
      if (d.track) {
        const alt = { ...d.track, thumb: d.track.thumb || cur.thumb };
        queue[qi] = alt; cur = alt; paintMini(); loadLyrics(alt); toast("that one wouldn't play, using the soundcloud version");
        audio.src = srcFor(alt); audio.play().catch((e) => { if (e?.name !== "AbortError") setPlaying(false); }); return true;
      }
    } catch {}
    return false;
  }

  /* ---------- YouTube's own player (hidden), used when the server can't fetch the audio ---------- */
  let embedWait = null;
  const ytLoad = () => (yt.ready ||= new Promise((res, rej) => {
    if (window.YT && YT.Player) return res();
    const to = setTimeout(() => { yt.ready = null; rej(new Error("timeout")); }, 8000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(to); res(); };
    const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => { clearTimeout(to); yt.ready = null; rej(new Error("blocked")); };
    document.head.appendChild(s);
  }));
  function stopEmbed() { yt.on = false; try { yt.p?.stopVideo?.(); } catch {} }
  function ytState(e) {
    if (!yt.on) return;
    if (e.data === 1) { try { yt.p.setVolume(volume * 100); } catch {} setPlaying(true); embedWait?.(true); } else if (e.data === 2) setPlaying(false); else if (e.data === 0) next(false);
  }
  function ytError() {
    const w = embedWait; stopEmbed();
    if (w) w(false); else { setPlaying(false); toast("couldn't play that track. try another."); }
  }
  async function startEmbed(t) {
    try { await ytLoad(); } catch { return false; }
    return new Promise((resolve) => {
      const timer = setTimeout(() => { embedWait = null; stopEmbed(); resolve(false); }, 10000);
      embedWait = (ok) => { clearTimeout(timer); embedWait = null; resolve(ok); };
      yt.on = true;
      try { audio.pause(); audio.removeAttribute("src"); audio.load(); } catch {}
      if (!yt.p) yt.p = new YT.Player("yt", { width: "200", height: "200", videoId: t.id, playerVars: { autoplay: 1, playsinline: 1, controls: 0, rel: 0 }, events: { onReady: (e) => e.target.playVideo(), onStateChange: ytState, onError: ytError } });
      else yt.p.loadVideoById(t.id);
    });
  }
  setInterval(() => {
    if (yt.on && yt.p?.getCurrentTime) {
      pos = yt.p.getCurrentTime() || 0; const d = yt.p.getDuration?.(); if (d) dur = d;
      paintProgress(); syncLyrics(); persist();
    }
  }, 500);

  // Ask the stream address for the real reason, so the message says what went wrong
  async function reasonFor(t) {
    try {
      const r = await fetch(srcFor(t), { headers: { range: "bytes=0-1" } });
      if (r.ok || r.status === 206) return "";
      const d = await r.json().catch(() => ({}));
      return d.error || "the server answered " + r.status;
    } catch { return "can't reach the music server"; }
  }

  /* ---------- playback control ---------- */
  const playFail = (e) => { if (e?.name !== "AbortError") onFail(); }; // a quick skip aborts the old request. that isn't a failure

  function playAt(list, i) {
    stopEmbed();
    const t = list[i]; if (!t) return;
    queue = list; qi = i; cur = t; pos = 0; dur = t.dur || 0; resumeAt = 0;
    audio.src = srcFor(t);
    audio.play().catch(playFail);
    addRecent(t); paintMini(); markNow(); persist(true); loadLyrics(t);
    if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: srcName(t.source), artwork: t.thumb ? [{ src: t.thumb, sizes: "300x300" }, { src: t.thumb, sizes: "512x512" }] : [] });
  }
  const setPlaying = (v) => {
    playing = v; const i = v ? ICON.pause : ICON.play;
    $("#m-play").innerHTML = i; $("#np-play").innerHTML = i;
    $("#np-cov")?.classList.toggle("off", !v); // the big cover on the Music page spins like a record only while music plays
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = v ? "playing" : "paused";
    paintPip();
  };
  function toggle() {
    if (!cur) return;
    if (yt.on) { playing ? yt.p.pauseVideo() : yt.p.playVideo(); return; }
    if (!audio.src) { audio.src = srcFor(cur); resumeAt = pos; } // restored from last visit
    if (lyr.key !== key(cur)) loadLyrics(cur);
    audio.paused ? audio.play().catch(playFail) : audio.pause();
  }
  function pickNext(manual) {
    if (!queue.length) return -1;
    if (repeatMode === 2 && !manual) return qi; // repeat one song: when it ends, play it again
    if (shuffleOn && queue.length > 1) { let i; do { i = Math.floor(Math.random() * queue.length); } while (i === qi); return i; }
    if (qi < queue.length - 1) return qi + 1;
    return repeatMode === 1 ? 0 : -1; // end of the list: start over only if repeat is on
  }
  function next(natural) { // natural === false means the song ended by itself. a click or a media key passes something else
    const manual = natural !== false, i = pickNext(manual);
    if (i < 0) { setPlaying(false); return; }
    if (i === qi && !manual) { pos = 0; if (yt.on) { yt.p.seekTo(0, true); yt.p.playVideo(); } else { audio.currentTime = 0; audio.play().catch(playFail); } return; }
    playAt(queue, i);
  }
  function toggleShuffle() { shuffleOn = !shuffleOn; persist(true); paintModes(); }
  function cycleRepeat() { repeatMode = (repeatMode + 1) % 3; persist(true); paintModes(); }
  let preMute = 0.8;
  function toggleMute() { if (volume > 0) { preMute = volume; setVolume(0); } else setVolume(preMute || 0.8); }
  function prev() { if (pos > 4) seek(0); else if (qi > 0) playAt(queue, qi - 1); else seek(0); }
  const canSeek = () => isFinite(audio.duration) && audio.duration > 0 && audio.seekable && audio.seekable.length > 0;
  function seek(frac) {
    if (!cur || !dur) return;
    frac = Math.min(1, Math.max(0, frac));
    if (yt.on) { pos = frac * dur; yt.p.seekTo(pos, true); paintProgress(); return; }
    if (!audio.src) { audio.src = srcFor(cur); resumeAt = frac * dur; pos = resumeAt; paintProgress(); return; } // restored from last visit: jump once it starts
    if (!canSeek()) { paintProgress(); return toast("this stream can't be skipped around. it only plays from the start."); }
    pos = frac * audio.duration; audio.currentTime = pos; paintProgress();
  }

  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession, set = (a, f) => { try { ms.setActionHandler(a, f); } catch {} };
    set("play", () => { if (audio.paused) toggle(); }); set("pause", () => { if (!audio.paused) toggle(); });
    set("nexttrack", next); set("previoustrack", prev);
    set("seekto", (d) => { if (d.seekTime != null && dur) seek(d.seekTime / dur); });
    set("seekbackward", (d) => { if (dur) seek(Math.max(0, pos - (d.seekOffset || 10)) / dur); });
    set("seekforward", (d) => { if (dur) seek(Math.min(dur, pos + (d.seekOffset || 10)) / dur); });
  }
  let lastPos = 0;
  function posState() {
    if (!("mediaSession" in navigator) || !dur || !isFinite(dur) || Date.now() - lastPos < 1000) return;
    lastPos = Date.now();
    try { navigator.mediaSession.setPositionState({ duration: dur, playbackRate: 1, position: Math.min(pos, dur) }); } catch {}
  }

  /* ---------- mini player (can be folded away with the arrow) ---------- */
  function paintMini() {
    const show = !!cur && settings.music && !musicTab;
    $("#mini").hidden = !show || collapsed;
    $("#m-open").hidden = !show || !collapsed;
    if (!cur) return;
    $("#np-cov").src = cur.thumb || ""; $("#np-cov").style.visibility = cur.thumb ? "visible" : "hidden";
    $("#np-t").textContent = cur.title; $("#np-a").textContent = `${cur.artist} · ${srcName(cur.source)}`;
    paintPip();
    const c = $("#mini-cov"); c.src = cur.thumb || ""; c.style.visibility = cur.thumb ? "visible" : "hidden";
    $("#mini-t").textContent = cur.title; $("#mini-a").textContent = `${cur.artist} · ${srcName(cur.source)}`;
    paintProgress();
  }
  function paintProgress() {
    const w = dur ? Math.min(100, Math.max(0, (pos / dur) * 100)) + "%" : "0";
    const c = tfmt(pos), d = dur ? tfmt(dur) : "0:00";
    for (const p of ["prog", "np-prog"]) { const bar = $("#" + p); if (bar && !bar.dragging?.()) bar.firstElementChild.style.width = w; }
    for (const [id, v] of [["#m-cur", c], ["#np-cur", c], ["#m-dur", d], ["#np-dur", d]]) { const el = $(id); if (el && el.textContent !== v && !(id.endsWith("cur") && $(id.startsWith("#m") ? "#prog" : "#np-prog").dragging?.())) el.textContent = v; }
    paintPip();
  }
  const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  async function setCollapsed(v) {
    if (v === collapsed) return;
    collapsed = v; persist(true);
    const mini = $("#mini"), opener = $("#m-open");
    try {
      if (v) { // fold away: slide down and fade, then the small opener pops in
        if (!mini.hidden && !calm()) await mini.animate([{ transform: "translateX(-50%) translateY(0) scale(1)", opacity: 1 }, { transform: "translateX(-50%) translateY(20px) scale(.97)", opacity: 0 }], { duration: 220, easing: "cubic-bezier(.4,0,.2,1)" }).finished;
        paintMini();
        if (!calm()) opener.animate([{ transform: "translateX(-50%) translateY(10px) scale(.85)", opacity: 0 }, { transform: "translateX(-50%) translateY(0) scale(1)", opacity: 1 }], { duration: 240, easing: "cubic-bezier(.2,.9,.3,1.2)" });
      } else { // open: the player slides up
        paintMini();
        if (!calm()) mini.animate([{ transform: "translateX(-50%) translateY(20px) scale(.97)", opacity: 0 }, { transform: "translateX(-50%) translateY(0) scale(1)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
    } catch { paintMini(); }
  }
  $("#m-toggle").addEventListener("click", () => setCollapsed(true));
  $("#m-open").addEventListener("click", () => setCollapsed(false));
  $("#m-play").addEventListener("click", toggle);
  $("#m-next").addEventListener("click", next);
  $("#m-prev").addEventListener("click", prev);
  $("#mini-info").addEventListener("click", () => openMusic());
  // click or drag a bar to play from that spot (the song jumps when you let go, so it doesn't stutter). works on both players
  function bindSeek(bar, curSel) {
    let drag = false;
    const frac = (e) => { const r = bar.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
    const show = (f) => { bar.firstElementChild.style.width = f * 100 + "%"; if (dur) $(curSel).textContent = tfmt(f * dur); };
    bar.addEventListener("pointerdown", (e) => { drag = true; bar.setPointerCapture(e.pointerId); show(frac(e)); });
    bar.addEventListener("pointermove", (e) => { if (drag) show(frac(e)); });
    bar.addEventListener("pointerup", (e) => { if (!drag) return; drag = false; seek(frac(e)); });
    bar.addEventListener("pointercancel", () => { drag = false; paintProgress(); });
    bar.setAttribute("role", "slider"); bar.tabIndex = 0; bar.setAttribute("aria-label", "Song position");
    bar.addEventListener("keydown", (e) => { const d = { ArrowLeft: -5, ArrowRight: 5 }[e.key]; if (d && dur) { e.preventDefault(); seek(Math.min(1, Math.max(0, (pos + d) / dur))); } });
    bar.dragging = () => drag;
  }
  bindSeek($("#prog"), "#m-cur"); bindSeek($("#np-prog"), "#np-cur");
  $("#m-play").innerHTML = ICON.play; $("#np-play").innerHTML = ICON.play;

  /* ---------- the fold-away arrows (our own, no emoji), the volume control and the styles for them ---------- */
  const symbols = /[\u2190-\u21FF\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u{1F000}-\u{1FAFF}]/gu;
  $("#m-toggle").innerHTML = ICON.down; $("#m-toggle").setAttribute("aria-label", "Fold the player away");
  for (const [id, icon, label] of [["#m-prev", ICON.prev, "Previous song"], ["#np-prev", ICON.prev, "Previous song"], ["#m-next", ICON.next, "Next song"], ["#np-next", ICON.next, "Next song"]]) {
    const b = $(id); if (b) { b.innerHTML = icon; b.setAttribute("aria-label", label); }
  }
  $("#np-cov")?.classList.add("nv-rec", "off");
  {
    const op = $("#m-open"); // exactly one arrow, pointing up
    op.innerHTML = ICON.up; op.setAttribute("aria-label", "Open the player");
  }
  document.head.insertAdjacentHTML("beforeend", `<style id="nv-music-style">
    .nvi{width:1.125rem;height:1.125rem;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;flex:none}
    #m-toggle,#m-open{display:inline-flex;align-items:center;justify-content:center;gap:.375rem}
    #m-toggle .nvi,#m-open .nvi{transition:transform .2s cubic-bezier(.4,0,.2,1)}
    #m-toggle:hover .nvi{transform:translateY(2px)} #m-open:hover .nvi{transform:translateY(-2px)}
    .ib{display:inline-flex;align-items:center;justify-content:center}
    #m-prev,#m-next,#np-prev,#np-next{display:inline-flex;align-items:center;justify-content:center}
    @keyframes nv-spin{to{transform:rotate(360deg)}}
    img.nv-rec{border-radius:50%;object-fit:cover;aspect-ratio:1/1;animation:nv-spin 5s linear infinite;-webkit-mask-image:radial-gradient(circle closest-side at center,transparent 0 9%,#000 10%);mask-image:radial-gradient(circle closest-side at center,transparent 0 9%,#000 10%)}
    img.nv-rec.off{animation-play-state:paused}
    @media (prefers-reduced-motion:reduce){img.nv-rec{animation:none}}
    #prog i{transition:none}
    .nv-vol{display:flex;align-items:center;gap:.625rem;flex:1 1 100%;grid-column:1/-1;margin-top:.5rem;color:inherit}
    .nv-vol button{width:1.75rem;height:1.75rem;padding:0;border-radius:999px;border:0;background:var(--btn);color:inherit;opacity:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none;transition:opacity .15s,transform .1s}
    .nv-vol button:hover{background:var(--btn-h)} .nv-vol button:active{transform:scale(.92)}
    .nv-vol button .nvi{width:.875rem;height:.875rem}
    .nv-vbar{position:relative;flex:1;height:1.5rem;cursor:pointer;touch-action:none;outline:none}
    .nv-vbar::before{content:"";position:absolute;left:0;right:0;top:50%;height:.375rem;margin-top:-.1875rem;border-radius:999px;background:color-mix(in srgb,currentColor 25%,transparent)}
    .nv-vbar i{position:absolute;left:0;top:50%;height:.375rem;margin-top:-.1875rem;border-radius:999px;background:currentColor;pointer-events:none}
    .nv-vbar:focus-visible::before{outline:2px solid currentColor;outline-offset:3px}
  </style>`);

  // volume: a bar with a minus on its left and a plus on its right. it is remembered between visits
  let volume = Math.min(1, Math.max(0, Number(load("nexvelo.volume", 1)) || 0)); if (!isFinite(volume)) volume = 1;
  const volRow = document.createElement("div");
  volRow.className = "nv-vol";
  volRow.innerHTML = `<button type="button" id="m-vdn" aria-label="Volume down">${ICON.minus}</button><div class="nv-vbar" id="m-vbar" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100"><i></i></div><button type="button" id="m-vup" aria-label="Volume up">${ICON.plus}</button>`;
  $("#mini").appendChild(volRow);
  function setVolume(v, quiet) {
    volume = Math.min(1, Math.max(0, Math.round(v * 100) / 100));
    audio.volume = volume; try { yt.p?.setVolume?.(volume * 100); } catch {}
    $("#m-vbar i").style.width = volume * 100 + "%"; $("#m-vbar").setAttribute("aria-valuenow", Math.round(volume * 100));
    if (!quiet) store("nexvelo.volume", volume);
    if (typeof paintPip === "function") paintPip();
  }
  {
    const bar = $("#m-vbar"); let drag = false;
    const at = (e) => { const r = bar.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
    bar.addEventListener("pointerdown", (e) => { drag = true; bar.setPointerCapture(e.pointerId); setVolume(at(e), true); });
    bar.addEventListener("pointermove", (e) => { if (drag) setVolume(at(e), true); });
    bar.addEventListener("pointerup", (e) => { drag = false; setVolume(at(e)); });
    bar.addEventListener("keydown", (e) => { const d = { ArrowLeft: -.05, ArrowDown: -.05, ArrowRight: .05, ArrowUp: .05 }[e.key]; if (d) { e.preventDefault(); setVolume(volume + d); } });
    $("#m-vdn").addEventListener("click", () => setVolume(volume - .1));
    $("#m-vup").addEventListener("click", () => setVolume(volume + .1));
    setVolume(volume, true);
  }

  // the time bar is redrawn every frame from the real playback position, not just a few times a second
  (function tick() {
    if (!yt.on && !audio.paused && !audio.seeking) {
      pos = audio.currentTime || 0;
      if (isFinite(audio.duration) && audio.duration > 0) dur = audio.duration;
      paintProgress(); syncLyrics();
    }
    requestAnimationFrame(tick);
  })();
  $("#m-shuffle").addEventListener("click", toggleShuffle); $("#np-shuffle").addEventListener("click", toggleShuffle);
  $("#m-repeat").addEventListener("click", cycleRepeat); $("#np-repeat").addEventListener("click", cycleRepeat);
  function paintModes() {
    for (const p of ["m", "np"]) {
      const sh = $("#" + p + "-shuffle"), rp = $("#" + p + "-repeat"); if (!sh || !rp) continue;
      if (!sh.firstChild) sh.innerHTML = ICON.shuffle;
      sh.classList.toggle("on", shuffleOn); sh.setAttribute("aria-pressed", shuffleOn); sh.title = shuffleOn ? "Shuffle: on" : "Shuffle: off";
      rp.classList.toggle("on", repeatMode > 0); rp.setAttribute("aria-pressed", repeatMode > 0); rp.title = ["Repeat: off", "Repeat: all", "Repeat: one song"][repeatMode];
      const want = repeatMode === 2 ? "one" : "all"; if (rp.dataset.i !== want) { rp.dataset.i = want; rp.innerHTML = repeatMode === 2 ? ICON.repeat1 : ICON.repeat; }
    }
    paintPip();
  }
  $("#np-play").addEventListener("click", toggle); $("#np-next").addEventListener("click", next); $("#np-prev").addEventListener("click", prev);
  $("#np-pop").addEventListener("click", () => popOut()); $("#m-pop").addEventListener("click", () => popOut());

  /* ---------- lyrics (LRCLIB via the server) ---------- */
  let lyr = { key: "", synced: [], idx: -1 };
  const lyrBox = () => $("#lyr");
  const lyrMsg = (m) => { lyrBox().innerHTML = `<div class="msg">${esc(m)}</div>`; };
  async function loadLyrics(t) {
    const k = key(t); lyr = { key: k, synced: [], idx: -1 };
    lyrMsg("looking for lyrics…");
    try {
      const r = await fetch(api(`/api/lyrics?title=${encodeURIComponent(t.title)}&artist=${encodeURIComponent(t.artist)}&dur=${Math.round(t.dur || 0)}`));
      const d = await r.json(); if (lyr.key !== k) return;
      if (!d.found) return lyrMsg("no lyrics found for this song.");
      if (d.instrumental) return lyrMsg("instrumental ♪");
      if (d.synced?.length) {
        lyr.synced = d.synced;
        lyrBox().innerHTML = d.synced.map((l, i) => `<p data-i="${i}">${esc(l.text) || "♪"}</p>`).join("");
        syncLyrics(true);
      } else if (d.plain) lyrBox().innerHTML = `<p class="plain">${esc(d.plain)}</p>`;
      else lyrMsg("no lyrics found for this song.");
    } catch { if (lyr.key === k) lyrMsg("couldn't load lyrics."); }
  }
  function syncLyrics(force) {
    const L = lyr.synced; if (!L.length) return;
    let lo = 0, hi = L.length - 1, idx = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (L[m].t <= pos + 0.2) { idx = m; lo = m + 1; } else hi = m - 1; }
    if (idx === lyr.idx && !force) return;
    const ps = lyrBox().children;
    if (ps[lyr.idx]) ps[lyr.idx].classList.remove("on");
    lyr.idx = idx;
    const el = ps[idx]; if (!el) return;
    el.classList.add("on");
    if (musicTab) { const box = lyrBox(); box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" }); }
  }
  lyrBox().addEventListener("click", (e) => {
    const p = e.target.closest("p[data-i]"); if (!p || !cur) return;
    if (!audio.src) { audio.src = srcFor(cur); }
    audio.currentTime = lyr.synced[+p.dataset.i].t; if (audio.paused) audio.play().catch(() => {});
  });

  /* ---------- pop-out player: a round, spinning cover over the song's picture, a seek bar, the controls and a volume bar ---------- */
  const PIPI = (inner, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const PI = {
    prev: PIPI('<path d="M6 5v14"/><path d="M19 5.5v13L9 12z" style="fill:currentColor"/>'), next: PIPI('<path d="M18 5v14"/><path d="M5 5.5v13L15 12z" style="fill:currentColor"/>'),
    play: PIPI('<path d="M7 4.5l12 7.5-12 7.5z" style="fill:currentColor"/>', 26), pause: PIPI('<path d="M8 5v14M16 5v14"/>', 26),
    shuffle: PIPI(PATH.shuffle), repeat: PIPI(PATH.repeat), repeat1: PIPI(PATH.repeat + PATH.one), vol: PIPI(PATH.vol), mute: PIPI(PATH.mute), share: PIPI(PATH.share),
    check: PIPI('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), minus: PIPI('<path d="M5 12h14"/>', 14), plus: PIPI('<path d="M12 5v14M5 12h14"/>', 14),
  };
  const PIP_CSS = `<style>
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#000;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden}
#bg{position:fixed;inset:-40px;background:#111 center/cover no-repeat;filter:blur(30px) saturate(1.3);transform:scale(1.15)}
#shade{position:fixed;inset:0;background:linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.78))}
.wrap{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;padding:14px 18px}
.disc{width:148px;height:148px;border-radius:50%;overflow:hidden;background:#1d1d1d;flex:none;box-shadow:0 10px 34px rgba(0,0,0,.55);animation:spin 6s linear infinite}
.disc.off{animation-play-state:paused}
.disc img{width:100%;height:100%;object-fit:cover;display:block;-webkit-mask-image:radial-gradient(circle closest-side,transparent 0 6%,#000 7%);mask-image:radial-gradient(circle closest-side,transparent 0 6%,#000 7%)}
@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.disc{animation:none}}
.meta{text-align:center;max-width:100%}
.meta b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.meta span{display:block;font-size:12px;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.seek{display:flex;align-items:center;gap:9px;width:100%;font-size:11px;font-variant-numeric:tabular-nums}
.seek span{min-width:34px}.seek span:last-child{text-align:right}
.bar{position:relative;flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.28);cursor:pointer;touch-action:none}
.bar::after{content:"";position:absolute;inset:-9px 0}
.bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:inherit;background:#fff;pointer-events:none}
.ctl{display:flex;align-items:center;justify-content:center;gap:7px}
button{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;background:#2b2b2b;color:#fff;border:0;border-radius:50%;cursor:pointer;transition:background .15s,transform .1s}
button:hover{background:#151515}
button:active{transform:scale(.93)}
button.on{background:#fff;color:#000}
button.on:hover{background:#d4d4d4}
button.big{width:58px;height:58px;background:#fff;color:#000}
button.big:hover{background:#cfcfcf}
.vol{display:flex;align-items:center;gap:10px;width:80%}
.vol button{width:26px;height:26px}
</style>`;
  const PIP_HTML = `<div id="bg"></div><div id="shade"></div><div class="wrap">
<div class="disc off" id="disc"><img id="c" alt=""></div>
<div class="meta"><b id="t"></b><span id="a"></span></div>
<div class="seek"><span id="cur">0:00</span><div class="bar" id="bar"><i id="f"></i></div><span id="dur">0:00</span></div>
<div class="ctl"><button id="vm" aria-label="Mute"></button><button id="sh" aria-label="Shuffle"></button><button id="p" aria-label="Previous song"></button><button class="big" id="pl" aria-label="Play or pause"></button><button id="n" aria-label="Next song"></button><button id="rp" aria-label="Repeat"></button><button id="sd" aria-label="Copy the song name"></button></div>
<div class="vol"><button id="vd" aria-label="Volume down"></button><div class="bar" id="vb"><i id="vf"></i></div><button id="vu" aria-label="Volume up"></button></div>
</div>`;
  function paintPip() {
    if (!pip || !cur) return;
    let d, g; try { d = pip.document; g = (i) => d.getElementById(i); if (!g("c")) return; } catch { return; }
    const thumb = cur.thumb || "";
    if (g("c").dataset.src !== thumb) { g("c").dataset.src = thumb; g("c").src = thumb; g("bg").style.backgroundImage = thumb ? `url("${thumb.replace(/"/g, "%22")}")` : "none"; }
    g("t").textContent = cur.title; g("a").textContent = `${cur.artist} · ${srcName(cur.source)}`;
    g("disc").classList.toggle("off", !playing);
    if (g("pl").dataset.s !== String(playing)) { g("pl").dataset.s = String(playing); g("pl").innerHTML = playing ? PI.pause : PI.play; }
    if (!g("bar").dragging?.()) { g("f").style.width = dur ? Math.min(100, Math.max(0, (pos / dur) * 100)) + "%" : "0"; g("cur").textContent = tfmt(pos); }
    g("dur").textContent = dur ? tfmt(dur) : "0:00";
    g("sh").classList.toggle("on", shuffleOn); if (!g("sh").firstChild) g("sh").innerHTML = PI.shuffle;
    g("rp").classList.toggle("on", repeatMode > 0); const rk = String(repeatMode === 2); if (g("rp").dataset.k !== rk || !g("rp").firstChild) { g("rp").dataset.k = rk; g("rp").innerHTML = repeatMode === 2 ? PI.repeat1 : PI.repeat; }
    const mk = String(volume === 0); if (g("vm").dataset.k !== mk || !g("vm").firstChild) { g("vm").dataset.k = mk; g("vm").innerHTML = volume === 0 ? PI.mute : PI.vol; }
    if (!g("vb").dragging?.()) g("vf").style.width = volume * 100 + "%";
  }
  setInterval(() => pip && paintPip(), 250);
  async function popOut() {
    if (pip) { pip.close(); pip = null; return; }
    if (!cur) return toast("play a song first");
    if (!("documentPictureInPicture" in window)) return toast("this browser can't pop out the player. use the media controls in its toolbar instead.");
    try {
      pip = await documentPictureInPicture.requestWindow({ width: 360, height: 480 });
      const d = pip.document, g = (i) => d.getElementById(i);
      d.head.insertAdjacentHTML("beforeend", PIP_CSS); d.body.innerHTML = PIP_HTML;
      g("p").innerHTML = PI.prev; g("n").innerHTML = PI.next; g("vd").innerHTML = PI.minus; g("vu").innerHTML = PI.plus; g("sd").innerHTML = PI.share;
      g("p").onclick = prev; g("pl").onclick = toggle; g("n").onclick = next; g("sh").onclick = toggleShuffle; g("rp").onclick = cycleRepeat;
      g("vm").onclick = toggleMute; g("vd").onclick = () => setVolume(volume - 0.1); g("vu").onclick = () => setVolume(volume + 0.1);
      g("sd").onclick = async () => { // copies "artist - title" so it can be pasted into a message
        try { await (pip.navigator.clipboard || navigator.clipboard).writeText(`${cur.artist} - ${cur.title}`); } catch {}
        g("sd").innerHTML = PI.check; setTimeout(() => { try { if (pip) g("sd").innerHTML = PI.share; } catch {} }, 1300);
      };
      const dragBar = (bar, onMove, onEnd) => { // click or drag on the bar
        let on = false; const f = (e) => { const r = bar.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
        bar.addEventListener("pointerdown", (e) => { on = true; bar.setPointerCapture(e.pointerId); onMove(f(e)); });
        bar.addEventListener("pointermove", (e) => { if (on) onMove(f(e)); });
        bar.addEventListener("pointerup", (e) => { if (on) { on = false; onEnd(f(e)); } });
        bar.dragging = () => on;
      };
      dragBar(g("bar"), (f) => { g("f").style.width = f * 100 + "%"; if (dur) g("cur").textContent = tfmt(f * dur); }, (f) => seek(f));
      dragBar(g("vb"), (f) => { g("vf").style.width = f * 100 + "%"; setVolume(f, true); }, (f) => setVolume(f));
      pip.addEventListener("pagehide", () => { pip = null; });
      paintPip();
    } catch (e) { pip = null; toast("couldn't open the pop-out player"); }
  }

  /* ---------- recommended (shown before you search, so the page isn't empty) ---------- */
  let rec = [], recLoaded = false;
  async function loadRec() {
    if (recLoaded) return; recLoaded = true;
    try { const d = await (await fetch(api("/api/music/recommended"))).json(); rec = d.tracks || []; renderRec(); if (!rec.length && $("#mrec")) $("#mrec").innerHTML = '<div class="msg">recommendations aren\'t available right now. search for a song above.</div>'; }
    catch { recLoaded = false; if ($("#mrec")) $("#mrec").innerHTML = '<div class="msg">can\'t reach the music server, so there are no recommendations yet.</div>'; }
  }
  function renderRec() {
    const box = $("#mrec"); if (!box) return;
    if (!rec.length || results.length) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="lyr-h" style="margin:.5rem 0">RECOMMENDED</div><div class="rgrid">' +
      rec.map((t, i) => `<button class="rcard" data-r="${i}" title="${esc(t.title)} · ${esc(t.artist)}"><img src="${esc(t.thumb)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></button>`).join("") + "</div>";
  }

  /* ---------- data ---------- */
  function addRecent(t) {
    recent = [t, ...recent.filter((x) => key(x) !== key(t))].slice(0, 40);
    store("nexvelo.recent", recent); if (tab() === "recent") renderRecent();
  }
  const savePl = () => store("nexvelo.playlists", playlists);

  /* ---------- rendering ---------- */
  const tab = () => $("#page-music .mtabs .on")?.dataset.mt;
  const markNow = () => $$(".trow").forEach((r) => r.classList.toggle("now", !!cur && r.dataset.k === key(cur)));
  const cover = (t) => `<img src="${esc(t.thumb)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
  const row = (t, i, extra = "+") => `<div class="trow" data-i="${i}" data-k="${esc(key(t))}">${cover(t)}<div class="tm"><b>${esc(t.title)}</b><span>${esc(t.artist)} · ${srcName(t.source)}${t.dur ? " · " + fmt(t.dur) : ""}</span></div><button class="ib" data-act="${extra === "+" ? "add" : "rm"}" aria-label="${extra === "+" ? "Add to playlist" : "Remove"}">${extra === "+" ? ICON.plus : ICON.x}</button></div>`;

  function renderResults(msg) {
    const box = $("#mresults");
    if (msg) { box.innerHTML = `<div class="msg">${esc(msg)}</div>`; return; }
    if (!results.length) { box.innerHTML = '<div class="msg">no matches. try another search.</div>'; return; }
    const b = results[0];
    box.innerHTML =
      `<div class="best" data-i="0" data-k="${esc(key(b))}">${cover(b)}<div class="tm"><small>BEST MATCH · ${srcName(b.source).toUpperCase()}</small><b>${esc(b.title)}</b><span>${esc(b.artist)}${b.dur ? " · " + fmt(b.dur) : ""}</span></div><button class="ib" data-act="add" aria-label="Add to playlist">${ICON.plus}</button></div>` +
      results.slice(1).map((t, i) => row(t, i + 1)).join("");
    markNow();
  }
  function renderStatus() {
    const s = lastStatus; if (!s) { $("#msrc").innerHTML = ""; return; }
    $("#msrc").innerHTML = `<span>youtube music: ${s.youtube ? "on" : "off"}</span><span>·</span><span>soundcloud: ${s.soundcloud ? "on" : "off"}</span><span>·</span><span>audius: ${s.audius ? "on" : "off"}</span>`;
  }
  function renderPlaylists() {
    const box = $("#plist");
    if (openPl == null) {
      box.innerHTML = `<form class="newpl" id="newpl"><input type="text" placeholder="new playlist name" maxlength="40" autocomplete="off"><button class="btn primary" type="submit">create</button></form>` +
        (playlists.length ? playlists.map((p) => `<div class="plcard" data-pl="${p.id}"><b>${esc(p.name)}</b><small>${p.tracks.length} track${p.tracks.length === 1 ? "" : "s"}</small></div>`).join("") : '<div class="msg">no playlists yet. create one, then add songs with the + button.</div>');
      return;
    }
    const p = playlists.find((x) => x.id === openPl);
    if (!p) { openPl = null; return renderPlaylists(); }
    box.innerHTML = `<div class="bar"><button class="btn" id="pl-back">‹ back</button><h3>${esc(p.name)}</h3><button class="btn primary" id="pl-play">play all</button><button class="btn danger" id="pl-del">delete</button></div>` +
      (p.tracks.length ? p.tracks.map((t, i) => row(t, i, "x")).join("") : '<div class="msg">this playlist is empty.</div>');
    markNow();
  }
  function renderRecent() {
    $("#rlist").innerHTML = recent.length
      ? `<div class="bar"><h3>recently played</h3><button class="btn" id="r-clear">clear</button></div>` + recent.map((t, i) => row(t, i)).join("")
      : '<div class="msg">nothing played yet.</div>';
    markNow();
  }

  /* ---------- add-to-playlist popover ---------- */
  const pop = $("#pop");
  function showPop(btn, t) {
    const r = btn.getBoundingClientRect();
    pop.innerHTML = (playlists.length ? playlists.map((p) => `<button data-add="${p.id}">${esc(p.name)}</button>`).join("") : '<div class="msg" style="padding:.5rem">no playlists yet</div>') +
      '<input type="text" placeholder="new playlist + enter" maxlength="40">';
    pop.hidden = false;
    pop.style.left = Math.max(8, Math.min(innerWidth - 248, r.right - 240)) + "px";
    pop.style.top = Math.min(innerHeight - 290, r.bottom + 6) + "px";
    pop._t = t;
    $("input", pop).onkeydown = (e) => {
      if (e.key !== "Enter" || !e.target.value.trim()) return;
      const p = { id: "p" + Date.now(), name: e.target.value.trim(), tracks: [] };
      playlists.push(p); addTo(p.id, t); pop.hidden = true;
    };
  }
  function addTo(id, t) {
    const p = playlists.find((x) => x.id === id); if (!p) return;
    if (p.tracks.some((x) => key(x) === key(t))) toast(`already in ${p.name}`);
    else { p.tracks.push(t); toast(`added to ${p.name}`); }
    savePl(); if (tab() === "playlists") renderPlaylists();
  }
  pop.addEventListener("click", (e) => { const b = e.target.closest("[data-add]"); if (b) { addTo(b.dataset.add, pop._t); pop.hidden = true; } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) { pop.hidden = true; e.preventDefault(); } });
  document.addEventListener("pointerdown", (e) => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-act="add"]')) pop.hidden = true; });

  /* ---------- panel events ---------- */
  function openMusic(t) {
    if (!settings.music) return;
    window.NV.openPage("music");
    if (t) showTab(t);
  }
  function showTab(t) {
    window.NV.syncChrome && setTimeout(() => window.NV.syncChrome(), 0);
    $$("#page-music .mtabs button").forEach((b) => b.classList.toggle("on", b.dataset.mt === t));
    $$(".mt").forEach((m) => m.classList.toggle("on", m.id === "mt-" + t));
    if (t === "playlists") renderPlaylists();
    if (t === "recent") renderRecent();
  }
  $("#page-music .mtabs").addEventListener("click", (e) => { const b = e.target.closest("[data-mt]"); if (b) showTab(b.dataset.mt); });
  

  $("#msearch").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $("#mq").value.trim(); if (!q) return;
    renderResults("searching youtube music, soundcloud and audius…");
    try {
      const r = await fetch(api("/api/music/search?q=" + encodeURIComponent(q)));
      if (r.status === 404) throw new Error("music search needs the Nex.Velo server (the Railway site), not a static host.");
      const data = await r.json();
      lastStatus = data.status; renderStatus();
      results = data.results || []; renderRec();
      if (!results.length && data.errors && Object.keys(data.errors).length) {
        renderResults("every source failed: " + Object.entries(data.errors).map(([k, v]) => `${k} (${v})`).join(", "));
      } else renderResults();
    } catch (err) {
      results = [];
      const net = err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(err.message || "");
      renderResults(net ? "can't reach the music server. if this site is on Vercel, deploy the api and lib folders (or start the Railway server), then try again." : err.message || "search failed");
    }
  });

  document.addEventListener("click", (e) => {
    if (!$("#page-music").contains(e.target)) return;
    const rc = e.target.closest("[data-r]"); if (rc) return playAt(rec.slice(), +rc.dataset.r);
    const addBtn = e.target.closest('[data-act="add"]');
    if (addBtn) { e.stopPropagation(); const el = addBtn.closest("[data-i]"); const t = tab() === "recent" ? recent[+el.dataset.i] : results[+el.dataset.i]; return showPop(addBtn, t); }
    const rm = e.target.closest('[data-act="rm"]');
    if (rm) { const p = playlists.find((x) => x.id === openPl); p.tracks.splice(+rm.closest("[data-i]").dataset.i, 1); savePl(); return renderPlaylists(); }
    const pc = e.target.closest("[data-pl]"); if (pc) { openPl = pc.dataset.pl; return renderPlaylists(); }
    if (e.target.closest("#pl-back")) { openPl = null; return renderPlaylists(); }
    if (e.target.closest("#pl-play")) { const p = playlists.find((x) => x.id === openPl); return p.tracks.length && playAt(p.tracks.slice(), 0); }
    if (e.target.closest("#pl-del")) { if (confirm("delete this playlist?")) { playlists = playlists.filter((x) => x.id !== openPl); openPl = null; savePl(); renderPlaylists(); } return; }
    if (e.target.closest("#r-clear")) { recent = []; store("nexvelo.recent", recent); return renderRecent(); }
    const r = e.target.closest(".trow, .best");
    if (r) {
      const i = +r.dataset.i, t = tab();
      if (t === "search") playAt(results.slice(), i);
      else if (t === "recent") playAt(recent.slice(), i);
      else playAt(playlists.find((x) => x.id === openPl).tracks.slice(), i);
    }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "newpl") return;
    e.preventDefault();
    const input = $("input", e.target), name = input.value.trim(); if (!name) return;
    playlists.push({ id: "p" + Date.now(), name, tracks: [] }); savePl(); renderPlaylists();
  });

  /* ---------- extension toggle + status chips ---------- */
  function applyMusicToggle() {
    
    if (!settings.music) { if (!audio.paused) audio.pause(); if (yt.on) yt.p?.pauseVideo?.(); }
    paintMini();
  }
  async function refreshMusicChips() {
    const box = $("#music-chips");
    if (!box) return;
    box.innerHTML = '<span class="chip">checking sources…</span>';
    try {
      const r = await fetch(api("/api/music/status")); if (!r.ok) throw 0;
      const s = (await r.json()).status;
      box.innerHTML = `<span class="chip ${s.youtube ? "ok" : ""}">youtube music: ${s.youtube ? "connected" : "unavailable"}</span><span class="chip ${s.soundcloud ? "ok" : ""}">soundcloud: ${s.soundcloud ? "connected" : "unavailable"}</span><span class="chip ${s.audius ? "ok" : ""}">audius: ${s.audius ? "connected" : "not used yet"}</span>`;
    } catch { box.innerHTML = '<span class="chip">music server not reachable</span>'; }
  }

  window.NV.onTab = (t) => {
    musicTab = t.kind === "music"; paintMini();
    if (musicTab && cur && lyr.key !== key(cur)) loadLyrics(cur);
    if (musicTab) syncLyrics(true);
    if (musicTab) loadRec();
  };
  paintModes();
  window.NV.applyMusicToggle = applyMusicToggle;
  window.NV.musicShowTab = (t) => showTab(t);
  window.NV.refreshMusicChips = refreshMusicChips;
  window.addEventListener("beforeunload", () => persist(true));
  applyMusicToggle();
  window.NV.loaded.music = true;
})();
