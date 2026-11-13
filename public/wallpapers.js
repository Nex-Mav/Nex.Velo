/* Wallpapers drawn as SVG so they work offline. Swap for photos any time via Settings > Appearance > custom. */

/* Song length. A song that streams through the server has no known length, so the browser guesses it from what has arrived so far
   (a 3:23 song first shows as 0:10 and grows). The music player already knows the real length from the search result, so when the
   browser's guess is shorter than that, the real length is reported instead. This runs before music.js. */
(() => {
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "duration");
  if (!d || !d.get) return;
  Object.defineProperty(HTMLMediaElement.prototype, "duration", {
    configurable: true,
    get() {
      const real = d.get.call(this);
      try {
        const src = this.currentSrc || this.src || "";
        if (src.indexOf("/api/music/stream") >= 0) {
          const id = new URL(src, location.href).searchParams.get("id");
          const cur = (JSON.parse(localStorage.getItem("nexvelo.music") || "{}") || {}).cur;
          if (cur && String(cur.id) === id && cur.dur > 0 && (!isFinite(real) || real < cur.dur - 3)) return cur.dur;
        }
      } catch {}
      return real;
    },
  });
})();

/* Proxy engines. This runs before app.js, so it can hand app.js a controller that builds Ultraviolet frames when Ultraviolet is chosen
   (Settings > General > proxy engine, or the first-visit setup). Scramjet stays the default and the fallback. */
(() => {
  const real = window.$scramjetLoadController;
  if (typeof real !== "function") return;
  const pick = () => {
    try { const o = JSON.parse(sessionStorage.getItem("nexvelo.session") || "{}"); if (o.proxy) return o.proxy; } catch {}
    try { return JSON.parse(localStorage.getItem("nexvelo.settings") || "{}").proxy || "scramjet"; } catch { return "scramjet"; }
  };
  let failed = "", loading = null;
  const loadUV = () => (loading ||= (async () => {
    for (const f of ["/uv/uv.bundle.js", "/uv/uv.config.js"]) {
      await new Promise((ok, no) => { const s = document.createElement("script"); s.src = f; s.onload = ok; s.onerror = () => no(new Error("couldn't load " + f)); document.head.appendChild(s); });
    }
    if (!self.__uv$config) throw new Error("Ultraviolet's config did not load");
  })());
  /* Kaze (github.com/vqol/kaze): its files are built by the "Build Kaze" GitHub Action into public/kaze-assets and public/kaze-sw.js */
  let kaze = null, kazeLoading = null;
  const A = "/kaze-assets/";
  const loadScripts = (...srcs) => Promise.all(srcs.map((src) => new Promise((ok, no) => { const el = document.createElement("script"); el.src = src; el.async = false; el.onload = ok; el.onerror = () => no(new Error("couldn't load " + src)); document.head.append(el); })));
  const whenActive = (reg) => reg.active ? Promise.resolve(reg.active) : new Promise((ok) => { const wk = reg.installing || reg.waiting; wk.addEventListener("statechange", () => { if (wk.state === "activated") ok(wk); }); });
  const loadKaze = () => (kazeLoading ||= (async () => {
    if (!("serviceWorker" in navigator)) throw new Error("this browser has no service workers");
    await loadScripts(A + "kaze.js", A + "controller.api.js");
    const api = window.$kazeController; if (!api) throw new Error("Kaze's controller did not load");
    let wisp = ""; try { wisp = JSON.parse(localStorage.getItem("nexvelo.settings") || "{}").wisp || ""; } catch {}
    const transport = new api.WorkerTransport({ scripts: [A + "libcurl/index.js"], construct: "LibcurlTransport.LibcurlClient", options: { wisp: wisp || "wss://nex-velo.up.railway.app/wisp/" } });
    api.warmupTransport(transport);
    const reg = await navigator.serviceWorker.register("/kaze-sw.js", { scope: "/~/kz/", updateViaCache: "none" });
    reg.update().catch(() => {});
    const controller = new api.Controller({ serviceworker: await whenActive(reg), transport, config: { kazePath: A + "kaze.js", injectPath: A + "controller.inject.js", wasmPath: A + "kaze.wasm" } });
    await controller.wait();
    kaze = controller;
  })());
  const kazeFrame = () => {
    const iframe = document.createElement("iframe"), f = kaze.createFrame(iframe);
    return {
      frame: iframe,
      go(u) { f.go(String(u)); },
      back() { f.back(); }, forward() { f.forward(); }, reload() { f.reload(); },
      get url() { try { const h = iframe.contentWindow.location.href, at = h.indexOf(f.prefix); return at === -1 ? null : new URL(decodeURIComponent(h.slice(at + f.prefix.length))); } catch { return null; } },
    };
  };
  const uvFrame = () => {
    const frame = document.createElement("iframe"), cfg = () => self.__uv$config, base = () => location.origin + cfg().prefix;
    return {
      frame,
      go(u) { frame.src = base() + cfg().encodeUrl(String(u)); },
      get url() { try { const h = frame.contentWindow.location.href; if (h.startsWith(base())) return new URL(cfg().decodeUrl(h.slice(base().length))); } catch {} return null; },
    };
  };
  window.$scramjetLoadController = function () {
    const out = real.apply(this, arguments), Base = out.ScramjetController;
    class WithEngines extends Base {
      async init(...a) {
        const r = await super.init(...a);
        const eng = pick();
        if (eng === "uv" || eng === "kaze") {
          try { await (eng === "uv" ? loadUV() : loadKaze()); }
          catch (e) { failed = String(e.message || e); const nm = eng === "uv" ? "Ultraviolet" : "Kaze"; console.warn("[nex.velo] " + nm + " unavailable:", failed); setTimeout(() => window.NV && NV.showBanner && NV.showBanner("couldn't load " + nm + " (" + failed + "). Scramjet is being used instead."), 1500); }
        }
        return r;
      }
      createFrame(...a) { const e = pick(); return e === "uv" && !failed && self.__uv$config ? uvFrame() : e === "kaze" && !failed && kaze ? kazeFrame() : super.createFrame(...a); }
    }
    return Object.assign({}, out, { ScramjetController: WithEngines });
  };
})();

(() => {
  const rng = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const wrap = (inner) =>
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${inner}</svg>`);
  const lin = (id, stops) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;

  function forest() {
    const r = rng(7);
    const layers = [
      { y: 560, h: 260, n: 34, c: "#0f241a", o: 0.6 },
      { y: 650, h: 300, n: 30, c: "#0b1b14", o: 0.78 },
      { y: 740, h: 360, n: 24, c: "#07110d", o: 0.92 },
      { y: 850, h: 430, n: 18, c: "#030806", o: 1 },
    ];
    let g = "";
    for (const L of layers) {
      for (let i = 0; i < L.n; i++) {
        const x = (i / L.n) * 1700 - 50 + r() * 40;
        const h = L.h * (0.7 + r() * 0.6), w = h * 0.34, base = L.y + r() * 30;
        let p = "";
        for (let k = 0; k < 3; k++) {
          const t = base - h * k * 0.28, ww = w * (1 - k * 0.25);
          p += `M${x.toFixed(0)},${t.toFixed(0)} m${(-ww / 2).toFixed(0)},0 l${(ww / 2).toFixed(0)},${(-h * 0.42).toFixed(0)} l${(ww / 2).toFixed(0)},${(h * 0.42).toFixed(0)} Z `;
        }
        g += `<path d="${p}" fill="${L.c}" opacity="${L.o}"/>`;
      }
      g += `<rect x="0" y="${L.y - 130}" width="1600" height="220" fill="url(#f)" opacity=".4"/>`;
    }
    return wrap(
      `<defs>${lin("b", [[0, "#0a1913"], [1, "#1c3d2d"]])}${lin("f", [[0, "#a9c4b5", 0], [0.5, "#a9c4b5", 0.5], [1, "#a9c4b5", 0]])}` +
        `<radialGradient id="m" cx=".72" cy=".18" r=".45"><stop offset="0" stop-color="#d4ebdd" stop-opacity=".4"/><stop offset="1" stop-color="#d4ebdd" stop-opacity="0"/></radialGradient></defs>` +
        `<rect width="1600" height="900" fill="url(#b)"/><rect width="1600" height="900" fill="url(#m)"/>${g}`
    );
  }

  function ocean() {
    let w = "";
    for (let j = 0; j < 7; j++) {
      const y0 = 430 + j * 72, amp = 6 + j * 4, f = 90 + j * 28;
      let d = `M0,900 L0,${y0}`;
      for (let x = 0; x <= 1600; x += 20) d += ` L${x},${(y0 + amp * Math.sin(x / f + j * 1.7)).toFixed(1)}`;
      w += `<path d="${d} L1600,900 Z" fill="url(#w${j % 2})" opacity="${(0.28 + j * 0.09).toFixed(2)}"/>`;
    }
    return wrap(
      `<defs>${lin("s", [[0, "#07233d"], [0.55, "#1f6a8f"], [1, "#8fd0e0"]])}${lin("w0", [[0, "#5fb7cf"], [1, "#0d4766"]])}${lin("w1", [[0, "#3f98b8"], [1, "#082f49"]])}` +
        `<radialGradient id="g" cx=".5" cy=".48" r=".5"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".75"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient></defs>` +
        `<rect width="1600" height="900" fill="url(#s)"/><circle cx="800" cy="430" r="320" fill="url(#g)"/>${w}`
    );
  }

  function sky() {
    const r = rng(5);
    let c = "";
    for (let i = 0; i < 16; i++) {
      const cx = r() * 1600, cy = 80 + r() * 520, s = 0.6 + r() * 1.1;
      for (let k = 0; k < 4; k++)
        c += `<ellipse cx="${(cx + k * 70 * s - 100 * s).toFixed(0)}" cy="${(cy + (k % 2 ? -14 : 10) * s).toFixed(0)}" rx="${(90 * s).toFixed(0)}" ry="${(34 * s).toFixed(0)}" fill="#fff" opacity="${(0.5 + r() * 0.35).toFixed(2)}"/>`;
    }
    return wrap(
      `<defs>${lin("s", [[0, "#4f9be8"], [0.6, "#9ccdf5"], [1, "#e4f2ff"]])}<filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter></defs>` +
        `<rect width="1600" height="900" fill="url(#s)"/><g filter="url(#b)">${c}</g>`
    );
  }

  // Christmas: a deep green night, a red glow on the horizon, snowy hills and lit trees
  function christmas() {
    const r = rng(25);
    const lights = ["#ff4d5a", "#ffd166", "#fff3b0", "#7be0a0"];
    let stars = "";
    for (let i = 0; i < 90; i++) stars += `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 460).toFixed(0)}" r="${(0.6 + r() * 1.6).toFixed(1)}" fill="#fff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
    const hill = (y, amp, f, fill, o) => {
      let d = `M0,900 L0,${y}`;
      for (let x = 0; x <= 1600; x += 20) d += ` L${x},${(y + amp * Math.sin(x / f + y)).toFixed(1)}`;
      return `<path d="${d} L1600,900 Z" fill="${fill}" opacity="${o}"/>`;
    };
    const tree = (x, base, h, c) => {
      let t = `<rect x="${x - h * 0.03}" y="${base - h * 0.08}" width="${h * 0.06}" height="${h * 0.1}" fill="#2a160c"/>`;
      for (let k = 0; k < 3; k++) {
        const top = base - h * (0.2 + k * 0.27) - h * 0.45 * (1 - k * 0.18), w = h * (0.5 - k * 0.1), bt = base - h * (0.05 + k * 0.25);
        t += `<path d="M${x},${top.toFixed(0)} L${(x + w / 2).toFixed(0)},${bt.toFixed(0)} L${(x - w / 2).toFixed(0)},${bt.toFixed(0)} Z" fill="${c}"/>`;
      }
      for (let i = 0; i < 16; i++) {
        const u = 0.12 + r() * 0.8, yy = base - h * (0.08 + u * 0.82), half = h * 0.26 * (1 - u) + 2;
        t += `<circle cx="${(x + (r() - 0.5) * 2 * half).toFixed(0)}" cy="${yy.toFixed(0)}" r="${(2.5 + r() * 2).toFixed(1)}" fill="${lights[Math.floor(r() * 4)]}"/>`;
      }
      return t + `<path d="M${x},${base - h - 6} l5,12 l-12,-8 l14,0 l-12,8 Z" fill="#ffd166"/>`;
    };
    let trees = "";
    for (let i = 0; i < 9; i++) trees += tree(80 + i * 190 + r() * 60, 700 + r() * 40, 150 + r() * 90, "#0f3d27");
    let near = "";
    for (let i = 0; i < 4; i++) near += tree(180 + i * 440 + r() * 90, 880, 330 + r() * 100, "#0a2c1b");
    let snow = "";
    for (let i = 0; i < 110; i++) snow += `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 900).toFixed(0)}" r="${(1 + r() * 2.4).toFixed(1)}" fill="#fff" opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`;
    return wrap(
      `<defs>${lin("s", [[0, "#04140c"], [0.6, "#0d3a24"], [1, "#6b1520"]])}` +
        `<radialGradient id="g" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="#ff4d5a" stop-opacity=".45"/><stop offset="1" stop-color="#ff4d5a" stop-opacity="0"/></radialGradient></defs>` +
        `<rect width="1600" height="900" fill="url(#s)"/><rect width="1600" height="900" fill="url(#g)"/>${stars}` +
        hill(690, 18, 150, "#dfe9e4", 0.55) + trees + hill(780, 22, 190, "#f4f8f6", 0.9) + near + hill(870, 12, 120, "#ffffff", 1) + snow
    );
  }

  window.NVWalls = { forest, ocean, sky, christmas };
})();

/* Christmas theme + snowflakes, the Windows/original layout switch, and a full-height fix.
   Runs after app.js has started (the page fires "nv-scripts" when everything is loaded). */
(() => {
  const start = () => {
    const NV = window.NV; if (!NV || !NV.settings) return;
    const $ = (s) => document.querySelector(s);

    /* ----- styles: the Christmas theme (green and red), the snow layer, full-height page ----- */
    document.head.appendChild(Object.assign(document.createElement("style"), { id: "nv-xmas", textContent:
      "[data-theme=christmas]{--bg:#0d2418;--fg:#fff3ea;--dim:rgba(255,243,234,.6);--panel:#133123;--card:#1b4630;--accent:#d62839;--accent-fg:#fff;color-scheme:dark}" +
      "html,body{height:100dvh}" +
      "#snow{position:fixed;inset:0;z-index:2;width:100%;height:100%;pointer-events:none}" +
      "#layout-row p{margin:.5rem 0 0}" }));

    /* ----- the theme tile (before "custom") ----- */
    if (!NV.THEMES.some((t) => t[0] === "christmas")) {
      const i = NV.THEMES.findIndex((t) => t[0] === "custom");
      NV.THEMES.splice(i < 0 ? NV.THEMES.length : i, 0, ["christmas", "christmas", "linear-gradient(135deg,#d62839 50%,#1f7a46 50%)"]);
    }

    /* ----- proxy engine (Settings > General) ----- */
    const engineBox = $("#engine");
    if (engineBox && !$("#proxy-engine")) {
      const fld = document.createElement("label"); fld.className = "fld";
      fld.innerHTML = '<span>proxy engine</span><select id="proxy-engine"><option value="scramjet">Scramjet (default)</option><option value="uv">Ultraviolet</option><option value="kaze">Kaze (needs the Build Kaze action)</option></select>';
      engineBox.closest("label").after(fld);
      const pe = fld.querySelector("select"); pe.value = NV.settings.proxy || "scramjet";
      pe.addEventListener("change", () => { NV.settings.proxy = pe.value; NV.save(); NV.toast("switching proxy engine…"); setTimeout(() => location.reload(), 400); });
    }

    /* ----- layout: original or windows (the desktop layout) ----- */
    const sec = $("#sec-appearance");
    const layout = document.createElement("div");
    layout.id = "layout-row";
    layout.innerHTML = '<h3>layout</h3><div class="row"><button class="btn" type="button" data-m="normal">original</button><button class="btn" type="button" data-m="desktop">windows</button></div><p>switches between the original tabs layout and the windows-style desktop. the page reloads.</p>';
    if (sec) (sec.querySelector("h2") || sec.firstChild).after(layout);
    const paintLayout = () => layout.querySelectorAll("[data-m]").forEach((b) => {
      const on = (NV.settings.mode === "desktop") === (b.dataset.m === "desktop");
      b.classList.toggle("primary", on); b.disabled = on; b.textContent = (b.dataset.m === "desktop" ? "windows (desktop)" : "original") + (on ? " (current)" : "");
    });
    layout.addEventListener("click", (e) => {
      const b = e.target.closest("[data-m]"); if (!b || b.disabled) return;
      NV.settings.mode = b.dataset.m; NV.save(); NV.toast("switching layout…"); setTimeout(() => location.reload(), 350);
    });
    paintLayout();

    /* ----- snowflakes switch (only offered with the Christmas theme) ----- */
    const row = document.createElement("label");
    row.className = "switch"; row.id = "snow-row";
    row.innerHTML = '<div><b>falling snowflakes</b><small>snow drifts down over the home page</small></div><input type="checkbox" id="snow-on">';
    const swatches = $("#swatches");
    if (swatches) swatches.after(row);
    const box = row.querySelector("input");
    const syncRow = () => { row.hidden = NV.settings.theme !== "christmas"; box.checked = !!NV.settings.snow; paintLayout(); };
    box.addEventListener("change", () => { NV.settings.snow = box.checked; NV.save(); tick(); });
    if (swatches) new MutationObserver(syncRow).observe(swatches, { childList: true });
    syncRow();

    /* ----- Christmas wallpaper tile (uses the custom wallpaper slot) ----- */
    const xmasSrc = window.NVWalls.christmas();
    const walls = $("#walls");
    const addTile = () => {
      if (!walls || walls.querySelector("[data-xmas]")) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "wt"; b.dataset.xmas = "1";
      b.innerHTML = "<i></i>christmas";
      b.firstChild.style.backgroundImage = 'url("' + xmasSrc + '")';
      b.classList.toggle("on", NV.settings.wall === "custom" && NV.LS.get("nexvelo.wallpaper", "") === xmasSrc);
      const custom = walls.querySelector("[data-wall=custom]");
      custom ? walls.insertBefore(b, custom) : walls.appendChild(b);
    };
    if (walls) {
      new MutationObserver(addTile).observe(walls, { childList: true });
      walls.addEventListener("click", (e) => {
        const b = e.target.closest("[data-xmas]"); if (!b) return;
        e.stopImmediatePropagation();
        NV.LS.set("nexvelo.wallpaper", xmasSrc); NV.settings.wall = "custom"; NV.save(); NV.applyWall();
        walls.querySelectorAll(".wt").forEach((t) => t.classList.toggle("on", t === b));
      }, true);
      addTile();
    }

    /* ----- the snow itself: a light canvas, only drawn on the home page with the Christmas theme ----- */
    const cv = document.createElement("canvas"); cv.id = "snow"; cv.hidden = true; cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");
    let flakes = [], raf = 0, last = 0;
    const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fit = () => { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const seed = () => { flakes = Array.from({ length: Math.round(Math.min(130, innerWidth / 11)) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: 1 + Math.random() * 2.6, v: 25 + Math.random() * 45, p: Math.random() * 6.28, s: 0.4 + Math.random() * 0.8 })); };
    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
      ctx.clearRect(0, 0, innerWidth, innerHeight); ctx.fillStyle = "#fff";
      for (const f of flakes) {
        f.y += f.v * dt; f.p += dt * f.s; f.x += Math.sin(f.p) * 14 * dt;
        if (f.y > innerHeight + 6) { f.y = -6; f.x = Math.random() * innerWidth; }
        ctx.globalAlpha = 0.45 + f.r / 5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    const want = () => {
      if (!NV.settings.snow || NV.settings.theme !== "christmas" || calm()) return false;
      const v = document.querySelector("#views .view.active");
      return !!v && !!v.querySelector(".home") && !v.classList.contains("has-frame");
    };
    function tick() {
      const w = want();
      if (w && !raf) { cv.hidden = false; fit(); seed(); last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!w && raf) { cancelAnimationFrame(raf); raf = 0; cv.hidden = true; }
    }
    setInterval(tick, 400);
    addEventListener("resize", () => { if (raf) { fit(); seed(); } });
    tick();
  };
  if (window.__nvScriptsDone) start(); else addEventListener("nv-scripts", start, { once: true });
})();
