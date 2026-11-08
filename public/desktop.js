/* Desktop mode: an Apple-style desktop. Every app (Proxy, AI, Games, Entertainment, Music, Tools, Settings) opens in its own window.
   Windows can be dragged, resized, minimised, zoomed and closed. A menu bar sits on top and a dock along the bottom.
   app.js hands every new tab to desktopOpen() while this mode is on, so the apps themselves need no changes. */
(() => {
  "use strict";
  const NV = window.NV;
  if (!NV || NV.desktopLoaded) return;
  NV.desktopLoaded = true;
  const { esc, LS, settings } = NV;
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MENU_H = 28, DOCK_H = 64, MIN_W = 340, MIN_H = 220;

  const svg = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra} aria-hidden="true">${d}</svg>`;
  const IC = {
    web: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>'),
    ai: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>'),
    games: svg('<path d="M6 9h12a3 3 0 0 1 3 3.2l-.6 4A2.4 2.4 0 0 1 16 17.3L15 15H9l-1 2.3a2.4 2.4 0 0 1-4.4-1.1l-.6-4A3 3 0 0 1 6 9z"/><path d="M8 11v3M6.5 12.5h3M16 12h.01M18 13.5h.01"/>'),
    entertainment: svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M17 2l-5 5-5-5"/>'),
    music: svg('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
    tools: svg('<path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-2.6-.6-.6-2.6z"/>'),
    settings: svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
    search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
    wifi: svg('<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><path d="M12 19.5h.01"/>'),
    back: svg('<path d="M15 6l-6 6 6 6"/>'), forward: svg('<path d="M9 6l6 6-6 6"/>'),
    reload: svg('<path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5"/>'), home: svg('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'), plus: svg('<path d="M12 5v14M5 12h14"/>'),
  };
  // [id, name, tab kind, hue, is it switched on in Settings?]
  const APPS = [
    { id: "web", name: "Proxy", kind: "web", hue: 212, on: () => true },
    { id: "ai", name: "AI", kind: "ai", hue: 275, on: () => settings.ai },
    { id: "games", name: "Games", kind: "games", hue: 142, on: () => settings.games },
    { id: "entertainment", name: "Entertainment", kind: "entertainment", hue: 2, on: () => settings.movies },
    { id: "music", name: "Music", kind: "music", hue: 24, on: () => settings.music },
    { id: "tools", name: "Tools", kind: "tools", hue: 205, on: () => settings.tools !== false },
    { id: "settings", name: "Settings", kind: "settings", hue: 220, on: () => true },
  ];
  const enabled = () => APPS.filter((a) => a.on());
  const appOfKind = (k) => APPS.find((a) => a.kind === k) || { id: k, name: k, kind: k, hue: 220 };

  const style = document.createElement("style");
  style.textContent = `
body.desktop{overflow:hidden}
#desktop{position:fixed;inset:0;z-index:40;overflow:hidden;color:var(--fg);font-family:var(--font,system-ui,-apple-system,sans-serif);-webkit-user-select:none;user-select:none;
 background:var(--dk-bg,linear-gradient(135deg,color-mix(in srgb,var(--accent) 30%,var(--bg)),var(--bg) 58%,color-mix(in srgb,var(--accent) 18%,var(--bg))));background-size:cover;background-position:center}
body.desktop #toast,body.desktop #banner,body.desktop #update,body.desktop #tour{z-index:100000}
.dk-glass{background:color-mix(in srgb,var(--panel) 62%,transparent);-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%)}
.dk-menubar{position:absolute;left:0;right:0;top:0;height:${MENU_H}px;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:0 .625rem;border-bottom:1px solid color-mix(in srgb,var(--fg) 12%,transparent);font-size:.8125rem}
.dk-left,.dk-right{display:flex;align-items:center;gap:.25rem;min-width:0}
.dk-left b{font-weight:600;padding:0 .5rem;white-space:nowrap}
.dk-mb{display:inline-flex;align-items:center;gap:.375rem;height:22px;padding:0 .5rem;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;white-space:nowrap}
.dk-mb:hover,.dk-mb.on{background:color-mix(in srgb,var(--fg) 14%,transparent)}
.dk-mb:active{transform:scale(.96)}
.dk-mb svg{width:15px;height:15px}
.dk-mb img{width:16px;height:16px;border-radius:4px}
.dk-batt{display:inline-flex;align-items:center;gap:.25rem;padding:0 .375rem;font-variant-numeric:tabular-nums}
.dk-batt i{position:relative;width:22px;height:11px;border:1.4px solid currentColor;border-radius:3.5px;opacity:.85}
.dk-batt i::after{content:"";position:absolute;right:-4px;top:2.5px;width:2px;height:4px;border-radius:0 1px 1px 0;background:currentColor}
.dk-batt i b{display:block;height:100%;width:0;background:currentColor;border-radius:1.5px}
.dk-batt.chg i b{background:#2fa862}
#dk-icons{position:absolute;inset:0;z-index:0}
.dk-icon{position:absolute;width:88px;display:flex;flex-direction:column;align-items:center;gap:.25rem;padding:.375rem .25rem;border-radius:10px;text-align:center;font-size:.6875rem;line-height:1.2;touch-action:none}
.dk-icon.sel{background:color-mix(in srgb,var(--accent) 30%,transparent)}
.dk-icon>span:last-child{text-shadow:0 1px 3px rgba(0,0,0,.55);color:#fff;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 .25rem;border-radius:4px}
.dk-icon.sel>span:last-child{background:var(--accent);color:var(--accent-fg);text-shadow:none}
.dk-tile{width:52px;height:52px;border-radius:13px;display:grid;place-items:center;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.3),inset 0 0 0 1px rgba(255,255,255,.18);background:linear-gradient(150deg,hsl(var(--h) 78% 64%),hsl(var(--h) 78% 46%))}
.dk-tile svg{width:56%;height:56%}
#dk-wins{position:absolute;inset:0;z-index:1;pointer-events:none}
.dk-win{position:absolute;display:flex;flex-direction:column;border-radius:12px;background:var(--panel);pointer-events:auto;overflow:hidden;
 box-shadow:0 0 0 1px color-mix(in srgb,var(--fg) 14%,transparent),0 8px 24px rgba(0,0,0,.28);transform-origin:center}
.dk-win.focus{box-shadow:0 0 0 1px color-mix(in srgb,var(--fg) 22%,transparent),0 18px 56px rgba(0,0,0,.45)}
.dk-win.max{border-radius:0}
.dk-win.dk-anim{transition:left .24s cubic-bezier(.3,.9,.3,1),top .24s cubic-bezier(.3,.9,.3,1),width .24s cubic-bezier(.3,.9,.3,1),height .24s cubic-bezier(.3,.9,.3,1)}
.dk-bar{position:relative;flex:none;height:38px;display:flex;align-items:center;padding:0 .75rem;background:color-mix(in srgb,var(--fg) 6%,var(--panel));border-bottom:1px solid color-mix(in srgb,var(--fg) 10%,transparent);touch-action:none}
.dk-title{position:absolute;left:0;right:0;padding:0 6.5rem;text-align:center;font-size:.8125rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;opacity:.6}
.dk-win.focus .dk-title{opacity:1}
.dk-lights{position:relative;z-index:1;display:flex;gap:8px}
.dk-l{width:12px;height:12px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;color:rgba(0,0,0,.6);background:color-mix(in srgb,var(--fg) 26%,transparent)}
.dk-l svg{width:8px;height:8px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.dk-l:active{filter:brightness(.8)}
.dk-win.focus .dk-l.r,.dk-lights:hover .dk-l.r{background:#ff5f57}
.dk-win.focus .dk-l.y,.dk-lights:hover .dk-l.y{background:#febc2e}
.dk-win.focus .dk-l.g,.dk-lights:hover .dk-l.g{background:#28c840}
.dk-lights:hover .dk-l svg{opacity:1}
.dk-tb{flex:none;display:flex;align-items:center;gap:.25rem;padding:.375rem .625rem;border-bottom:1px solid color-mix(in srgb,var(--fg) 10%,transparent);-webkit-user-select:none;user-select:none}
.dk-tbb{width:28px;height:28px;flex:none;border:0;border-radius:8px;display:grid;place-items:center;background:transparent;color:inherit}
.dk-tbb:hover{background:color-mix(in srgb,var(--fg) 12%,transparent)}.dk-tbb:active{transform:scale(.92)}
.dk-tbb svg{width:16px;height:16px}
.dk-addr{flex:1;min-width:0;height:28px;padding:0 .75rem;border:0;border-radius:8px;background:color-mix(in srgb,var(--fg) 10%,transparent);color:inherit;font:inherit;font-size:.8125rem;outline:none;-webkit-user-select:text;user-select:text}
.dk-addr:focus{box-shadow:0 0 0 2px var(--accent)}
.dk-body{position:relative;flex:1;min-height:0;-webkit-user-select:text;user-select:text}
.dk-body>.view{position:absolute!important;inset:0!important;width:auto!important;height:auto!important}
.dk-win:not(.focus) .dk-body::after,.dk-dragging .dk-body::after{content:"";position:absolute;inset:0;z-index:50}
.dk-rz{position:absolute;z-index:60}
.dk-rz[data-d="n"]{left:10px;right:10px;top:0;height:5px;cursor:ns-resize}.dk-rz[data-d="s"]{left:10px;right:10px;bottom:0;height:5px;cursor:ns-resize}
.dk-rz[data-d="e"]{top:10px;bottom:10px;right:0;width:5px;cursor:ew-resize}.dk-rz[data-d="w"]{top:10px;bottom:10px;left:0;width:5px;cursor:ew-resize}
.dk-rz[data-d="ne"]{top:0;right:0;width:12px;height:12px;cursor:nesw-resize}.dk-rz[data-d="nw"]{top:0;left:0;width:12px;height:12px;cursor:nwse-resize}
.dk-rz[data-d="se"]{bottom:0;right:0;width:14px;height:14px;cursor:nwse-resize}.dk-rz[data-d="sw"]{bottom:0;left:0;width:12px;height:12px;cursor:nesw-resize}
.dk-win.max .dk-rz{display:none}
.dk-dock{position:absolute;left:0;right:0;bottom:0;height:${DOCK_H}px;z-index:5;display:flex;align-items:center;justify-content:center;border-top:1px solid color-mix(in srgb,var(--fg) 16%,transparent)}
.dk-dockin{display:flex;align-items:flex-end;gap:.5rem;padding:0 .75rem 6px}
.dk-ic{position:relative;width:46px;height:46px;border:0;padding:0;background:none;transition:transform .18s cubic-bezier(.3,.9,.3,1);transform-origin:50% 100%}
.dk-ic .dk-tile{width:46px;height:46px;border-radius:12px}
.dk-ic:hover{transform:translateY(-6px) scale(1.28)}
.dk-ic:hover+.dk-ic,.dk-ic:has(+.dk-ic:hover){transform:translateY(-2px) scale(1.12)}
.dk-ic:active{transform:scale(.92)}
.dk-ic::after{content:attr(data-n);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) scale(.9);padding:.25rem .5rem;border-radius:6px;background:color-mix(in srgb,var(--panel) 85%,transparent);border:1px solid color-mix(in srgb,var(--fg) 14%,transparent);font-size:.6875rem;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s,transform .12s;color:var(--fg)}
.dk-ic:hover::after{opacity:1;transform:translateX(-50%) scale(1)}
.dk-dot{position:absolute;left:50%;bottom:-6px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--fg);opacity:0}
.dk-ic.run .dk-dot{opacity:.8}
.dk-sp{position:absolute;inset:0;z-index:20;background:rgba(0,0,0,.22)}
.dk-sp-card{position:absolute;top:16vh;left:50%;width:min(560px,92vw);transform:translateX(-50%);border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px color-mix(in srgb,var(--fg) 16%,transparent),0 24px 64px rgba(0,0,0,.45)}
.dk-sp-in{display:flex;align-items:center;gap:.75rem;padding:.875rem 1rem}
.dk-sp-in svg{width:20px;height:20px;opacity:.6;flex:none}
.dk-sp-in input{flex:1;min-width:0;border:0;background:none;color:inherit;font:inherit;font-size:1.125rem;outline:none;-webkit-user-select:text;user-select:text}
.dk-sp-list{max-height:50vh;overflow:auto;padding:.25rem .5rem .5rem;border-top:1px solid color-mix(in srgb,var(--fg) 10%,transparent)}
.dk-sp-list:empty{display:none}
.dk-sp-row{display:flex;align-items:center;gap:.75rem;width:100%;padding:.5rem .625rem;border:0;border-radius:10px;background:none;color:inherit;font:inherit;font-size:.875rem;text-align:left}
.dk-sp-row.on{background:var(--accent);color:var(--accent-fg)}
.dk-sp-row .dk-tile{width:30px;height:30px;border-radius:8px}
.dk-sp-row small{margin-left:auto;opacity:.6;font-size:.6875rem}
.dk-pop{position:absolute;z-index:30;min-width:13rem;padding:.375rem;border-radius:12px;font-size:.8125rem;box-shadow:0 0 0 1px color-mix(in srgb,var(--fg) 16%,transparent),0 12px 36px rgba(0,0,0,.4)}
.dk-pop button.dk-item{display:flex;align-items:center;gap:.5rem;width:100%;padding:.4375rem .625rem;border:0;border-radius:7px;background:none;color:inherit;font:inherit;text-align:left}
.dk-pop button.dk-item:hover{background:var(--accent);color:var(--accent-fg)}
.dk-pop hr{border:0;border-top:1px solid color-mix(in srgb,var(--fg) 12%,transparent);margin:.25rem 0}
.dk-pop .dk-info{padding:.375rem .625rem;display:flex;justify-content:space-between;gap:1rem}
.dk-pop .dk-info span:first-child{opacity:.6}
@media (max-width:640px){.dk-ic,.dk-ic .dk-tile{width:38px;height:38px}.dk-dockin{gap:.25rem}.dk-icon{display:none}.dk-mb span{display:none}}
@media (prefers-reduced-transparency:reduce){.dk-glass{background:var(--panel);-webkit-backdrop-filter:none;backdrop-filter:none}}
@media (prefers-reduced-motion:reduce){.dk-ic,.dk-win,.dk-win.dk-anim{transition:none!important}.dk-ic:hover{transform:none}}
`;
  document.head.appendChild(style);

  let root, layer, wins = [], zTop = 10, cascade = 0, focused = null, dockSig = "";
  const area = () => ({ x: 0, y: MENU_H, w: innerWidth, h: Math.max(200, innerHeight - MENU_H - DOCK_H) });
  const topWin = (list) => list.slice().sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0))[0];
  const saveGeom = (w) => { if (!w.max) LS.set("nexvelo.win." + w.kind, JSON.stringify({ x: w.g.x, y: w.g.y, w: w.g.w, h: w.g.h })); };
  const apply = (w) => { const s = w.el.style; s.left = w.g.x + "px"; s.top = w.g.y + "px"; s.width = w.g.w + "px"; s.height = w.g.h + "px"; };
  const animateGeom = (w) => { w.el.classList.add("dk-anim"); apply(w); clearTimeout(w.animT); w.animT = setTimeout(() => w.el.classList.remove("dk-anim"), 280); };

  /* ---------- windows ---------- */
  function makeWindow(kind) {
    const app = appOfKind(kind), a = area();
    let saved = null; try { saved = JSON.parse(LS.get("nexvelo.win." + kind, "null")); } catch {}
    const g = { w: Math.min(saved && saved.w || (kind === "web" ? 1000 : 900), a.w - 24), h: Math.min(saved && saved.h || 620, a.h - 16) };
    const off = (cascade++ % 7) * 28;
    if (saved && !wins.some((x) => x.kind === kind)) { g.x = saved.x; g.y = saved.y; }
    else { g.x = Math.round(a.x + (a.w - g.w) / 2 - 70 + off); g.y = Math.round(a.y + 18 + off); }
    g.x = Math.max(-(g.w - 120), Math.min(a.w - 120, g.x)); g.y = Math.max(MENU_H, Math.min(a.y + a.h - 40, g.y));
    const el = document.createElement("div");
    el.className = "dk-win"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", app.name);
    el.innerHTML = `<div class="dk-bar"><div class="dk-lights"><button class="dk-l r" aria-label="Close window" type="button"><svg viewBox="0 0 12 12"><path d="M3.5 3.5l5 5M8.5 3.5l-5 5"/></svg></button><button class="dk-l y" aria-label="Minimise window" type="button"><svg viewBox="0 0 12 12"><path d="M3 6h6"/></svg></button><button class="dk-l g" aria-label="Zoom window" type="button"><svg viewBox="0 0 12 12"><path d="M3.5 8.5l5-5M3.5 5.5v3h3M8.5 6.5v-3h-3"/></svg></button></div><div class="dk-title"></div></div>` +
      (kind === "web" ? `<div class="dk-tb"><button class="dk-tbb" data-a="back" aria-label="Back" type="button">${IC.back}</button><button class="dk-tbb" data-a="forward" aria-label="Forward" type="button">${IC.forward}</button><button class="dk-tbb" data-a="reload" aria-label="Reload" type="button">${IC.reload}</button><button class="dk-tbb" data-a="home" aria-label="Home" type="button">${IC.home}</button><input class="dk-addr" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Search or enter address" aria-label="Address"><button class="dk-tbb" data-a="new" aria-label="New browser window" type="button">${IC.plus}</button></div>` : "") +
      `<div class="dk-body"></div>` + ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((d) => `<i class="dk-rz" data-d="${d}"></i>`).join("");
    const w = { el, app, kind, g, max: false, min: false, prev: null, tab: null, body: $(".dk-body", el), title: $(".dk-title", el), addr: $(".dk-addr", el) };
    layer.appendChild(el); apply(w); wins.push(w);
    wire(w);
    return w;
  }

  function wire(w) {
    const { el } = w, bar = $(".dk-bar", el);
    el.addEventListener("pointerdown", () => { if (focused !== w) focusWin(w); }, true);
    $(".dk-l.r", el).addEventListener("click", () => closeWin(w));
    $(".dk-l.y", el).addEventListener("click", () => minimize(w));
    $(".dk-l.g", el).addEventListener("click", () => toggleMax(w));
    bar.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) toggleMax(w); });
    bar.addEventListener("pointerdown", (e) => { // drag the window by its title bar, 1:1 with the pointer
      if (e.button !== 0 || e.target.closest("button")) return;
      const sx = e.clientX, sy = e.clientY;
      if (w.max) { // pulling a zoomed window down puts it back to its old size, with the pointer in the same place along the bar
        const ratio = (e.clientX - w.g.x) / w.g.w; unmax(w); w.g.x = Math.round(e.clientX - ratio * w.g.w); w.g.y = Math.round(e.clientY - 14); apply(w);
      }
      const ox = w.g.x, oy = w.g.y; bar.setPointerCapture(e.pointerId); root.classList.add("dk-dragging");
      const move = (ev) => {
        const a = area();
        w.g.x = Math.max(-(w.g.w - 120), Math.min(innerWidth - 120, Math.round(ox + ev.clientX - sx)));
        w.g.y = Math.max(MENU_H, Math.min(a.y + a.h - 38, Math.round(oy + ev.clientY - sy)));
        apply(w);
      };
      const up = () => { bar.removeEventListener("pointermove", move); bar.removeEventListener("pointerup", up); bar.removeEventListener("pointercancel", up); root.classList.remove("dk-dragging"); saveGeom(w); };
      bar.addEventListener("pointermove", move); bar.addEventListener("pointerup", up); bar.addEventListener("pointercancel", up);
    });
    for (const h of el.querySelectorAll(".dk-rz")) h.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || w.max) return;
      e.preventDefault(); e.stopPropagation(); focusWin(w);
      const d = h.dataset.d, s = { ...w.g }, px = e.clientX, py = e.clientY;
      h.setPointerCapture(e.pointerId); root.classList.add("dk-dragging");
      const move = (ev) => {
        const dx = ev.clientX - px, dy = ev.clientY - py; let { x, y, w: ww, h: hh } = s;
        if (d.includes("e")) ww = s.w + dx;
        if (d.includes("s")) hh = s.h + dy;
        if (d.includes("w")) { ww = s.w - dx; x = s.x + dx; }
        if (d.includes("n")) { hh = s.h - dy; y = s.y + dy; }
        if (ww < MIN_W) { if (d.includes("w")) x -= MIN_W - ww; ww = MIN_W; }
        if (hh < MIN_H) { if (d.includes("n")) y -= MIN_H - hh; hh = MIN_H; }
        if (y < MENU_H) { if (d.includes("n")) hh -= MENU_H - y; y = MENU_H; }
        w.g = { x: Math.round(x), y: Math.round(y), w: Math.round(ww), h: Math.round(hh) }; apply(w);
      };
      const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up); root.classList.remove("dk-dragging"); saveGeom(w); };
      h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
    });
    if (w.kind === "web") { // the browser toolbar
      $(".dk-tb", el).addEventListener("click", (e) => {
        const b = e.target.closest("[data-a]"); if (!b || !w.tab) return;
        ({ back: () => NV.hist(w.tab, (h) => h.back()), forward: () => NV.hist(w.tab, (h) => h.forward()), reload: () => w.tab.frame && NV.reloadTab(w.tab), home: () => w.tab.frame && NV.homeTab(w.tab), new: () => NV.newTab({ kind: "web" }) })[b.dataset.a]();
      });
      w.addr.addEventListener("keydown", (e) => { if (e.key === "Enter" && w.tab) { NV.go(w.tab, w.addr.value); w.addr.blur(); } });
      w.addr.addEventListener("focus", () => w.addr.select());
    }
  }

  function focusWin(w, fromSelect) {
    if (w.min) restoreWin(w);
    zTop++; w.el.style.zIndex = zTop; focused = w;
    for (const x of wins) x.el.classList.toggle("focus", x === w);
    $("#dk-appname").textContent = w.app.name;
    if (!fromSelect && w.tab) NV.select(w.tab);
    paintDock();
  }
  function unmax(w) { w.max = false; w.el.classList.remove("max"); if (w.prev) w.g = { ...w.prev }; }
  function toggleMax(w) {
    if (w.max) { unmax(w); animateGeom(w); saveGeom(w); return; }
    w.prev = { ...w.g }; w.max = true; w.el.classList.add("max"); const a = area(); w.g = { x: a.x, y: a.y, w: a.w, h: a.h }; animateGeom(w);
  }
  const collapsed = (w) => {
    const icon = $('.dk-ic[data-id="' + w.app.id + '"]'), r = icon ? icon.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight, width: 0, height: 0 }, b = w.el.getBoundingClientRect();
    return `translate(${Math.round(r.left + r.width / 2 - (b.left + b.width / 2))}px,${Math.round(r.top + r.height / 2 - (b.top + b.height / 2))}px) scale(.08)`;
  };
  function minimize(w) {
    if (w.min) return; w.min = true; w.el.classList.remove("focus");
    if (reduce()) w.el.style.display = "none";
    else { w.el.style.transition = "transform .3s cubic-bezier(.4,0,.2,1),opacity .3s"; w.el.style.transform = collapsed(w); w.el.style.opacity = "0"; setTimeout(() => { if (w.min) w.el.style.display = "none"; }, 310); }
    const next = topWin(wins.filter((x) => !x.min));
    if (next) focusWin(next); else { focused = null; $("#dk-appname").textContent = "Nex.Velo"; paintDock(); }
  }
  function restoreWin(w) {
    if (!w.min) return; w.min = false; w.el.style.display = "";
    if (!reduce()) {
      w.el.style.transition = "none"; w.el.style.transform = collapsed(w); w.el.style.opacity = "0"; void w.el.offsetWidth;
      w.el.style.transition = "transform .3s cubic-bezier(.3,.9,.3,1),opacity .25s";
    }
    w.el.style.transform = ""; w.el.style.opacity = ""; setTimeout(() => { if (!w.min) w.el.style.transition = ""; }, 320);
  }
  function closeWin(w) {
    const i = wins.indexOf(w); if (i < 0) return; wins.splice(i, 1);
    if (reduce()) w.el.remove();
    else { w.el.style.transition = "transform .16s ease,opacity .16s"; w.el.style.transform = "scale(.96)"; w.el.style.opacity = "0"; w.el.style.pointerEvents = "none"; setTimeout(() => w.el.remove(), 170); }
    if (w.tab) NV.closeTab(w.tab);
    if (focused === w) { focused = null; const next = topWin(wins.filter((x) => !x.min)); if (next) focusWin(next); else $("#dk-appname").textContent = "Nex.Velo"; }
    paintDock();
  }

  // app.js sends every new tab here while desktop mode is on
  NV.desktopOpen = (opts) => {
    const kind = opts.kind || "web", w = makeWindow(kind);
    const t = NV.newTab({ ...opts, host: w.body });
    if (!t) { closeWin(w); return null; }
    w.tab = t;
    t.onTitle = (title) => { w.title.textContent = kind === "web" ? title || "New tab" : w.app.name; };
    t.onSync = (tab) => { if (w.addr && document.activeElement !== w.addr) w.addr.value = tab.frame ? NV.displayUrl(tab.url) : ""; };
    t.onFocus = () => focusWin(w, true);
    t.onTitle(t.title); t.onSync(t);
    focusWin(w, true);
    return t;
  };

  /* ---------- dock ---------- */
  function paintDock() {
    const apps = enabled(), sig = apps.map((a) => a.id).join();
    if (sig !== dockSig) {
      dockSig = sig;
      $("#dk-dockin").innerHTML = apps.map((a) => `<button class="dk-ic" data-id="${a.id}" data-n="${esc(a.name)}" aria-label="${esc(a.name)}" type="button"><span class="dk-tile" style="--h:${a.hue}">${IC[a.id]}</span><i class="dk-dot"></i></button>`).join("");
    }
    for (const b of document.querySelectorAll(".dk-ic")) b.classList.toggle("run", wins.some((w) => w.app.id === b.dataset.id));
  }
  function launch(id, forceNew) {
    const app = APPS.find((a) => a.id === id); if (!app) return;
    const open = wins.filter((w) => w.app.id === id);
    if (open.length && !forceNew) { focusWin(topWin(open)); return; }
    if (app.kind === "web") NV.newTab({ kind: "web" }); else NV.openPage(app.kind);
  }

  /* ---------- desktop icons: drag them anywhere, double-click to open ---------- */
  function buildIcons() {
    const box = $("#dk-icons"); let saved = {}; try { saved = JSON.parse(LS.get("nexvelo.desk.icons", "{}")) || {}; } catch {}
    box.innerHTML = "";
    enabled().forEach((a, i) => {
      const el = document.createElement("div"); el.className = "dk-icon"; el.dataset.id = a.id;
      el.innerHTML = `<span class="dk-tile" style="--h:${a.hue}">${IC[a.id]}</span><span>${esc(a.name)}</span>`;
      const p = saved[a.id] || { x: innerWidth - 104, y: MENU_H + 14 + i * 94 };
      const place = (x, y) => { el.style.left = Math.max(0, Math.min(innerWidth - 88, x)) + "px"; el.style.top = Math.max(MENU_H, Math.min(innerHeight - DOCK_H - 90, y)) + "px"; };
      place(p.x, p.y); box.appendChild(el);
      el.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return; e.stopPropagation();
        box.querySelectorAll(".dk-icon").forEach((x) => x.classList.toggle("sel", x === el));
        const sx = e.clientX, sy = e.clientY, ox = parseFloat(el.style.left), oy = parseFloat(el.style.top); let moved = false;
        el.setPointerCapture(e.pointerId);
        const move = (ev) => { if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return; moved = true; place(ox + ev.clientX - sx, oy + ev.clientY - sy); };
        const up = () => {
          el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
          if (moved) { // settle onto a tidy grid
            place(Math.round(parseFloat(el.style.left) / 8) * 8, Math.round(parseFloat(el.style.top) / 8) * 8);
            saved[a.id] = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) }; LS.set("nexvelo.desk.icons", JSON.stringify(saved));
          }
        };
        el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
      });
      el.addEventListener("dblclick", () => launch(a.id));
    });
  }

  /* ---------- search (Spotlight) ---------- */
  let sp, spItems = [], spSel = 0;
  function openSpotlight() {
    closePop(); sp.hidden = false; const input = $("#dk-sp-q"); input.value = ""; renderSpotlight(); input.focus();
  }
  const closeSpotlight = () => { sp.hidden = true; };
  function renderSpotlight() {
    const q = $("#dk-sp-q").value.trim(), low = q.toLowerCase();
    spItems = enabled().filter((a) => !low || a.name.toLowerCase().includes(low)).map((a) => ({ app: a, label: a.name, hint: "app" }));
    if (!low) spItems = spItems.filter((x) => x.app); // with nothing typed, just the apps
    if (q) spItems.push({ web: q, label: "search the web for “" + q + "”", hint: "proxy" });
    spItems.push({ app: APPS[0], fresh: true, label: "new browser window", hint: "proxy" });
    spSel = Math.min(spSel, spItems.length - 1); if (spSel < 0) spSel = 0;
    $("#dk-sp-list").innerHTML = spItems.map((it, i) => `<button class="dk-sp-row${i === spSel ? " on" : ""}" data-i="${i}" type="button"><span class="dk-tile" style="--h:${it.app ? it.app.hue : 212}">${IC[it.app ? it.app.id : "search"]}</span>${esc(it.label)}<small>${it.hint}</small></button>`).join("");
  }
  function chooseSpotlight(i) {
    const it = spItems[i]; if (!it) return; closeSpotlight();
    if (it.web) NV.newTab({ kind: "web", url: it.web }); else launch(it.app.id, !!it.fresh);
  }

  /* ---------- pop-up menus under the menu bar ---------- */
  let pop = null, popBtn = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } if (popBtn) { popBtn.classList.remove("on"); popBtn = null; } }
  function showPop(btn, html, onClick, alignRight = true) {
    const was = popBtn === btn; closePop(); if (was) return;
    pop = document.createElement("div"); pop.className = "dk-pop dk-glass"; pop.innerHTML = html; root.appendChild(pop);
    const r = btn.getBoundingClientRect(); pop.style.top = MENU_H + 4 + "px";
    if (alignRight) pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.right - pop.offsetWidth)) + "px"; else pop.style.left = r.left + "px";
    btn.classList.add("on"); popBtn = btn;
    pop.addEventListener("click", (e) => { const it = e.target.closest("[data-act]"); if (it) { const a = it.dataset.act; if (onClick(a, it) !== false) closePop(); } });
  }

  function wifiMenu(btn) {
    const c = navigator.connection || {}, online = navigator.onLine;
    const info = (l, v) => `<div class="dk-info"><span>${l}</span><span>${esc(v)}</span></div>`;
    showPop(btn, info("status", online ? "online" : "offline") + (c.effectiveType ? info("connection", c.effectiveType + (c.downlink ? ", ~" + c.downlink + " Mb/s" : "")) : "") +
      info("proxy server", (() => { try { return new URL(NV.activeWisp()).host; } catch { return "none"; } })()) + '<hr><button class="dk-item" data-act="test" type="button">test proxy server</button><button class="dk-item" data-act="servers" type="button">server settings…</button>',
    (a, it) => {
      if (a === "servers") { NV.openSettings("servers"); return; }
      if (a === "test") { it.textContent = "testing…"; NV.testWisp(NV.activeWisp(), 5000).then((ok) => { it.textContent = ok ? "proxy server is reachable" : "proxy server did not answer"; }); return false; }
    });
  }
  function logoMenu(btn) {
    showPop(btn, '<button class="dk-item" data-act="about" type="button">About Nex.Velo</button><button class="dk-item" data-act="settings" type="button">Settings…</button><hr><button class="dk-item" data-act="normal" type="button">Switch to normal layout</button><button class="dk-item" data-act="closeall" type="button">Close all windows</button>',
    (a) => {
      if (a === "about") NV.openSettings("about");
      else if (a === "settings") NV.openSettings();
      else if (a === "closeall") wins.slice().forEach(closeWin);
      else if (a === "normal") { settings.mode = "normal"; NV.save(); location.reload(); }
    });
  }

  /* ---------- status items ---------- */
  function tickClock() {
    const d = new Date(), t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !settings.h24 });
    const day = d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
    $("#dk-clock").textContent = day + "  " + t;
  }
  function battery() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then((b) => {
      const el = $("#dk-batt"), paint = () => { el.hidden = false; const p = Math.round(b.level * 100); $("b", el).style.width = p + "%"; $("span", el).textContent = p + "%"; el.classList.toggle("chg", b.charging); el.title = b.charging ? "charging" : "on battery"; };
      ["levelchange", "chargingchange"].forEach((ev) => b.addEventListener(ev, paint)); paint();
    }).catch(() => {});
  }

  function setWallpaper() {
    const src = NV.wallSrcNow ? NV.wallSrcNow() : null;
    root.style.setProperty("--dk-bg", src ? `url("${String(src).replace(/"/g, "%22")}")` : "");
    if (!src) root.style.removeProperty("--dk-bg");
  }

  function build() {
    root = document.createElement("div"); root.id = "desktop";
    root.innerHTML = `<div id="dk-icons"></div><div id="dk-wins"></div>
<div class="dk-menubar dk-glass"><div class="dk-left"><b id="dk-appname">Nex.Velo</b></div>
<div class="dk-right"><button class="dk-mb" id="dk-search" aria-label="Search apps" title="Search apps (Ctrl+K)" type="button">${IC.search}</button><button class="dk-mb" id="dk-wifi" aria-label="Network" type="button">${IC.wifi}</button><span class="dk-batt" id="dk-batt" hidden><i><b></b></i><span></span></span><button class="dk-mb" id="dk-clock" aria-label="Clock" type="button"></button><button class="dk-mb" id="dk-logo" aria-label="Nex.Velo menu" type="button"><img src="/logo.png" alt="" onerror="this.remove()"><span>Nex.Velo</span></button></div></div>
<div class="dk-dock dk-glass"><div class="dk-dockin" id="dk-dockin"></div></div>
<div class="dk-sp" id="dk-sp" hidden><div class="dk-sp-card dk-glass"><div class="dk-sp-in">${IC.search}<input id="dk-sp-q" type="text" placeholder="Search apps or the web" spellcheck="false" autocomplete="off"></div><div class="dk-sp-list" id="dk-sp-list"></div></div></div>`;
    document.body.appendChild(root); layer = $("#dk-wins"); sp = $("#dk-sp");
    paintDock(); buildIcons(); tickClock(); battery(); setWallpaper();
    setInterval(tickClock, 1000);
    $("#dk-dockin").addEventListener("click", (e) => { const b = e.target.closest(".dk-ic"); if (b) launch(b.dataset.id, e.shiftKey); });
    $("#dk-dockin").addEventListener("auxclick", (e) => { const b = e.target.closest(".dk-ic"); if (b && e.button === 1) launch(b.dataset.id, true); });
    $("#dk-search").addEventListener("click", openSpotlight);
    $("#dk-wifi").addEventListener("click", (e) => wifiMenu(e.currentTarget));
    $("#dk-logo").addEventListener("click", (e) => logoMenu(e.currentTarget));
    $("#dk-clock").addEventListener("click", () => { NV.openPage("tools"); NV.toolsShow && NV.toolsShow("clock"); });
    root.addEventListener("pointerdown", (e) => { // a click on the bare desktop deselects icons and closes menus
      if (pop && !e.target.closest(".dk-pop, #dk-wifi, #dk-logo")) closePop();
      if (e.target === root || e.target.id === "dk-icons") root.querySelectorAll(".dk-icon.sel").forEach((x) => x.classList.remove("sel"));
    });
    sp.addEventListener("pointerdown", (e) => { if (e.target === sp) closeSpotlight(); });
    $("#dk-sp-q").addEventListener("input", () => { spSel = 0; renderSpotlight(); });
    $("#dk-sp-q").addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { spSel = (spSel + 1) % spItems.length; renderSpotlight(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { spSel = (spSel - 1 + spItems.length) % spItems.length; renderSpotlight(); e.preventDefault(); }
      else if (e.key === "Enter") chooseSpotlight(spSel);
    });
    $("#dk-sp-list").addEventListener("click", (e) => { const r = e.target.closest("[data-i]"); if (r) chooseSpotlight(+r.dataset.i); });
    addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); sp.hidden ? openSpotlight() : closeSpotlight(); }
      else if (e.key === "Escape") { if (!sp.hidden) closeSpotlight(); else closePop(); }
    });
    addEventListener("resize", () => { // keep every window reachable when the screen gets smaller
      const a = area();
      for (const w of wins) {
        if (w.max) { w.g = { x: a.x, y: a.y, w: a.w, h: a.h }; } else { w.g.w = Math.min(w.g.w, a.w); w.g.h = Math.min(w.g.h, a.h); w.g.x = Math.max(-(w.g.w - 120), Math.min(a.w - 120, w.g.x)); w.g.y = Math.max(MENU_H, Math.min(a.y + a.h - 40, w.g.y)); }
        apply(w);
      }
      buildIcons();
    });
    NV.onWall = setWallpaper;
    NV.onSettingsApps = () => { paintDock(); buildIcons(); };
  }

  NV.desktopStart = () => { NV.desktopMode = true; document.body.classList.add("desktop"); build(); };
  NV.desktopWindows = () => wins.map((w) => ({ kind: w.kind, min: w.min, max: w.max, focus: w === focused }));
  NV.desktopLoaded = true;
})();
