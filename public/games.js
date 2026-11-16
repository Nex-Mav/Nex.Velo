/* Games: open-source libraries (GN Math, Obsidian's Unblocked Revamped, UGS), an "All games" list that merges those three, and
   game sites opened through the proxy (DuckMath, Weslack, Roblox). Search, pick a game, and it opens in its own frame. */
(() => {
  "use strict";
  const { LS, proxyFrame, toast, esc, apiBase } = window.NV;
  const $ = (s, r = document) => r.querySelector(s);
  const PAGE = 60;
  const LIBS = ["gn", "obsidian", "ugs"]; // the libraries merged into "All games" (DuckMath, Weslack and Roblox are whole sites, so they are not part of it)
  const SOURCES = ["all", ...LIBS, "duckmath", "weslack", "cloud"];
  // These are opened as whole websites through the proxy (no game list to read)
  // If a library's files won't load, its own website can still be opened through the proxy. (Change these addresses here if a site moves.)
  const SITES = { gn: { label: "GN Math website", url: "https://gn-math.github.io/" } };
  const PROXIED = { duckmath: "https://duckmath.org/", weslack: "https://weslack.com/" };
  // Cloud: games that run on a remote computer and are streamed to you. Each one opens through the proxy.
  const CLOUD = [{ name: "Roblox", site: "https://nowgg.fun/apps/a/19900/b.html" }, { name: "Android", site: "https://nowgg.fun/apps/uncube/7074/now.html" }];
  const NOTE = { cloud: "these run on nowgg.fun and open through the proxy. it isn't the official now.gg site, so don't sign in with an account you care about." };
  const LABEL = { all: "All games", gn: "GN Math", obsidian: "Obsidian", ugs: "UGS", duckmath: "DuckMath", weslack: "Weslack", cloud: "Cloud" };

  let src = (() => { try { return JSON.parse(LS.get("nexvelo.games", "{}")).src; } catch { return null; } })();
  if (!SOURCES.includes(src)) src = "all"; // also catches a saved "cherri" from before it was removed
  const lists = {};
  let list = [], shown = 0, current = null;

  // a message, with an optional button that opens Settings > Diagnostics (it tests every game source and shows exactly what fails)
  const msg = (t, check) => {
    const el = $("#gmsg"); el.style.whiteSpace = ""; el.textContent = t || "";
    if (!check) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn"; b.textContent = "open diagnostics"; b.style.marginLeft = ".5rem";
    b.addEventListener("click", runCheck); el.appendChild(b);
    if (SITES[src]) { // a way out that doesn't depend on the game files
      const w = document.createElement("button");
      w.type = "button"; w.className = "btn"; w.textContent = "open the " + SITES[src].label.toLowerCase() + " instead"; w.style.marginLeft = ".5rem";
      w.addEventListener("click", () => play({ name: SITES[src].label, site: SITES[src].url })); el.appendChild(w);
    }
  };
  function runCheck() { window.NV.openSettings("diagnostics"); }
  // always a full address, so it works the same whether the page and the server share a host or not
  const abs = (p) => new URL(/^https?:/i.test(p) ? p : apiBase() + p, location.href).href;

  // the tabs for All games (first) and Cloud (last) are added here, so the page's HTML doesn't need to change
  (() => {
    const tabs = $("#gtabs"); if (!tabs) return;
    const sample = tabs.querySelector("button"); if (!sample) return;
    const make = (k) => { const b = document.createElement("button"); b.type = "button"; b.className = sample.className.replace(/\bon\b/, "").trim(); b.dataset.g = k; b.textContent = LABEL[k]; return b; };
    if (!tabs.querySelector('[data-g="obsidian"]')) { const after = tabs.querySelector('[data-g="gn"]'); const b = make("obsidian"); after ? after.insertAdjacentElement("afterend", b) : tabs.appendChild(b); }
    if (!tabs.querySelector('[data-g="all"]')) tabs.insertBefore(make("all"), tabs.firstChild);
    if (!tabs.querySelector('[data-g="cloud"]')) tabs.appendChild(make("cloud"));
  })();

  async function loadLib(key) {
    const r = await fetch(abs("/api/games/list?src=" + key));
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.games?.length) throw new Error(d.error || "the server answered " + r.status);
    return (lists[key] = SITES[key] ? [{ name: SITES[key].label, site: SITES[key].url }, ...d.games] : d.games);
  }

  async function load(key) {
    if (lists[key]) return lists[key];
    if (key === "cloud") return (lists.cloud = CLOUD.map((c) => ({ ...c })));
    msg("loading the " + (LABEL[key] || key) + " games…");
    if (key === "all") { // every library, merged, with repeated names removed
      const parts = await Promise.all(LIBS.map(async (k) => { try { const g = lists[k] || (await loadLib(k)); return g.filter((x) => !x.site).map((x) => ({ ...x, _lib: k })); } catch { return []; } }));
      const seen = new Set(), all = [];
      for (const g of parts.flat()) { const n = g.name.trim().toLowerCase(); if (!n || seen.has(n)) continue; seen.add(n); all.push(g); }
      if (!all.length) { msg("couldn't load any of the game libraries. check the server.", true); return null; }
      all.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
      return (lists.all = all);
    }
    try { return await loadLib(key); }
    catch (e) { msg("couldn't load the " + (LABEL[key] || key) + " games. " + (e.message || e), true); return null; }
  }

  async function showSource(key, auto) {
    window.NV.syncChrome && setTimeout(() => window.NV.syncChrome(), 0);
    src = key; LS.set("nexvelo.games", JSON.stringify({ src }));
    document.querySelectorAll("#gtabs button").forEach((b) => b.classList.toggle("on", b.dataset.g === key));
    $("#ggrid").innerHTML = ""; $("#gcount").textContent = ""; $("#gmore").hidden = true;
    if (PROXIED[key]) { // a whole website, opened through the proxy
      const el = $("#gmsg"); el.style.whiteSpace = ""; el.textContent = LABEL[key] + " opens as its own website through the proxy. " + (NOTE[key] ? NOTE[key] + " " : "");
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn"; b.textContent = "open " + LABEL[key]; b.addEventListener("click", () => play({ name: LABEL[key], site: PROXIED[key] }));
      el.appendChild(b);
      if (auto) play({ name: LABEL[key], site: PROXIED[key] });
      return;
    }
    const games = await load(key);
    if (src !== key || !games) return;
    msg(""); filter();
    if (key === "cloud") $("#gmsg").textContent = NOTE.cloud;
  }

  function filter() {
    const games = lists[src] || [], q = $("#gq").value.trim().toLowerCase();
    list = q ? games.filter((g) => g.name.toLowerCase().includes(q)) : games;
    shown = 0; $("#ggrid").innerHTML = ""; more();
    $("#gcount").textContent = `${list.length} game${list.length === 1 ? "" : "s"}`;
    msg(list.length ? "" : "no games match that search.");
  }

  function more() {
    const next = list.slice(shown, shown + PAGE);
    const start = shown; shown += next.length;
    $("#ggrid").insertAdjacentHTML("beforeend", next.map((g, i) => {
      const hue = [...g.name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
      const bg = g.thumb ? `background-image:url('${esc(abs(g.thumb))}')` : `background-image:linear-gradient(135deg,hsl(${hue} 55% 38%),hsl(${(hue + 50) % 360} 55% 24%))`;
      const tag = g._lib ? `<small style="display:block;opacity:.6;font-size:.6875rem">${esc(LABEL[g._lib])}</small>` : "";
      return `<button class="gcard" data-i="${start + i}"><i style="${bg}">${g.thumb ? "" : esc(g.name.trim()[0] || "?")}</i><span>${esc(g.name)}${tag}</span></button>`;
    }).join(""));
    $("#gmore").hidden = shown >= list.length;
  }

  async function play(g) {
    current = g;
    $("#g-browse").hidden = true; $("#g-view").hidden = false;
    $("#g-title").textContent = g.name; $("#gplay").innerHTML = ""; $("#gvmsg").textContent = "opening " + g.name + "…";
    let target = null, isolated = true;
    if (g.site) target = g.site;
    else if (g.play) target = abs(g.play);
    else if (g.url && /^https?:/i.test(g.url) && src !== "duckmath" && src !== "weslack") { target = g.url; isolated = false; } // a plain link: open it through the proxy
    else if (g.url && /^https?:/i.test(g.url)) {
      try {
        const d = await (await fetch(abs(`/api/games/open?site=${src}&url=${encodeURIComponent(g.url)}`))).json();
        if (d.embed) target = d.embed; else { target = g.url; isolated = false; }
      } catch { target = g.url; isolated = false; }
    }
    if (!target) { $("#gvmsg").textContent = "couldn't find that game's address."; return; }
    g._target = target;
    try {
      let el;
      if (g.play) {
        // Library games are files on the Nex.Velo server itself, so they open directly. The proxy would only add rewriting that breaks games.
        el = document.createElement("iframe");
        el.src = target; el.allow = "fullscreen; autoplay; gamepad; clipboard-write; accelerometer; gyroscope";
        el.setAttribute("allowfullscreen", ""); el.style.cssText = "width:100%;height:100%;border:0;background:#000";
      } else el = await proxyFrame(target);
      el.addEventListener("load", () => { $("#gvmsg").textContent = ""; });
      $("#gplay").appendChild(el);
      hookKeys(el);
      if (g.play) watchBlank(el, g);
      setTimeout(() => { $("#gvmsg").textContent = ""; }, 12000);
      if (!isolated) toast("couldn't isolate the game, showing its page");
    } catch (e) { $("#gvmsg").textContent = "couldn't start the proxy: " + (e.message || e); }
  }

  // Game pages served by this server report their own errors. If a game opens but stays blank, show what it reported.
  let reports = [];
  window.addEventListener("message", (e) => {
    if (e.data?.nvKey === "Escape" && current) { // Escape pressed inside a game: the escape key (panic key) first, otherwise leave the game
      const fake = { key: "Escape", repeat: false, altKey: false, ctrlKey: false, metaKey: false, target: null, preventDefault() {}, stopPropagation() {} };
      if (window.NV.panic && window.NV.panic(fake)) return;
      return back();
    }
    if (typeof e.data?.nvGame === "string" && current) { reports.push(e.data.nvGame); if (reports.length > 6) reports.shift(); }
  });
  // Escape also works while the game itself has the keyboard focus (the frame would otherwise swallow it)
  function hookKeys(el) {
    const attach = () => { try { const w = el.contentWindow; if (w && !w.__nvEsc) { w.__nvEsc = true; w.addEventListener("keydown", (e) => { if (window.NV.panic && window.NV.panic(e)) return; if (e.key === "Escape") { e.preventDefault(); back(); } }, true); } } catch {} };
    attach(); el.addEventListener("load", attach);
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && current && !$("#g-view").hidden) back(); });

  // Compatibility mode: the page is fetched and written into an empty frame, which is how the GN Math site itself runs these games.
  async function compat(g) {
    if (!g._target) return;
    $("#gplay").innerHTML = ""; $("#gvmsg").textContent = "opening " + g.name + " in compatibility mode…";
    const el = document.createElement("iframe");
    el.allow = "fullscreen; autoplay; gamepad; clipboard-write; accelerometer; gyroscope"; el.setAttribute("allowfullscreen", ""); el.style.cssText = "width:100%;height:100%;border:0;background:#000";
    $("#gplay").appendChild(el);
    try {
      const r = await fetch(g._target); if (!r.ok) throw new Error("HTTP " + r.status);
      let html = await r.text();
      const baseTag = '<base href="' + g._target.replace(/[^/]*$/, "") + '">';
      if (!/<base[\s>]/i.test(html)) html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + baseTag) : baseTag + html;
      const d = el.contentDocument; d.open(); d.write(html); d.close();
      hookKeys(el); $("#gvmsg").textContent = ""; watchBlank(el, g);
    } catch (e) { $("#gvmsg").textContent = "compatibility mode failed: " + (e.message || e); }
  }
  function watchBlank(el, g) {
    reports = [];
    setTimeout(() => {
      if (current !== g) return;
      try {
        const d = el.contentDocument;
        if (d && d.body && !d.body.innerText.trim() && !d.querySelector("canvas, iframe, video, img, svg")) {
          if (!g._compat) { g._compat = true; compat(g); return; } // first try the other way of opening it
          $("#gvmsg").textContent = "this game opened but looks blank, even in compatibility mode. the page reported: " + (reports.join(" | ") || "nothing (it may still be loading)");
        }
      } catch {}
    }, 8000);
  }

  function back() { $("#gplay").innerHTML = ""; $("#g-view").hidden = true; $("#g-browse").hidden = false; current = null; }

  $("#gtabs").addEventListener("click", (e) => { const b = e.target.closest("[data-g]"); if (b) { back(); showSource(b.dataset.g, true); } });
  $("#gq").addEventListener("input", filter);
  $("#gmore").addEventListener("click", more);
  $("#ggrid").addEventListener("click", (e) => { const c = e.target.closest(".gcard"); if (c) play(list[+c.dataset.i]); });
  $("#g-back").addEventListener("click", back);
  { // a button to try compatibility mode by hand
    const rl = $("#g-reload");
    if (rl && !$("#g-compat")) {
      const cb = rl.cloneNode(false); cb.id = "g-compat"; cb.textContent = "compat mode"; cb.title = "open this game another way if it is blank";
      rl.insertAdjacentElement("afterend", cb); cb.addEventListener("click", () => { if (current?.play) { current._compat = true; compat(current); } });
    }
  }
  $("#g-reload").addEventListener("click", () => {
    const f = $("#gplay iframe"); if (!f || !current) return;
    try { f.contentWindow.location.reload(); } catch { play(current); }
  });
  $("#g-open").addEventListener("click", () => { if (current?._target) window.NV.openUrl(current._target); });
  $(".gscroll", $("#page-games")).addEventListener("scroll", (e) => { const el = e.target; if (!$("#gmore").hidden && el.scrollTop + el.clientHeight > el.scrollHeight - 400) more(); });

  window.NV.gamesShowSource = (k, auto) => { back(); showSource(k, auto); };
  window.NV.onGamesOpen = () => {
    document.querySelectorAll("#gtabs button").forEach((b) => b.classList.toggle("on", b.dataset.g === src));
    if (!lists[src]) showSource(src);
  };
  if (document.querySelector("#views #page-games")) window.NV.onGamesOpen(); // restored from a previous visit
  window.NV.loaded.games = true;
})();
