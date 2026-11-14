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
    vm: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
    web: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>'),
    ai: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>'),
    games: svg('<path d="M6 9h12a3 3 0 0 1 3 3.2l-.6 4A2.4 2.4 0 0 1 16 17.3L15 15H9l-1 2.3a2.4 2.4 0 0 1-4.4-1.1l-.6-4A3 3 0 0 1 6 9z"/><path d="M8 11v3M6.5 12.5h3M16 12h.01M18 13.5h.01"/>'),
    entertainment: svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M17 2l-5 5-5-5"/>'),
    music: svg('<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
    tools: svg('<path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.4 2.4-2.6-.6-.6-2.6z"/>'),
    chat: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
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
    { id: "chat", name: "Chat", kind: "chat", hue: 330, on: () => settings.chat !== false },
    { id: "vm", name: "Virtual machine", kind: "tools", hue: 265, on: () => settings.tools !== false },
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
#dk-snow{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none}
#dk-icons.snapping{background-image:radial-gradient(circle,color-mix(in srgb,var(--fg) 34%,transparent) 1.5px,transparent 2.5px);background-size:104px 96px;background-position:8px 36px}
.dk-icon.snap{transition:left .14s cubic-bezier(.3,.9,.3,1),top .14s cubic-bezier(.3,.9,.3,1)}.dk-icon.lift{z-index:3;filter:drop-shadow(0 8px 14px rgba(0,0,0,.35))}
#desktop .clock{display:none!important} /* the menu bar already shows the time */
.dk-icon{position:absolute;width:88px;display:flex;flex-direction:column;align-items:center;gap:.25rem;padding:.375rem .25rem;border-radius:10px;text-align:center;font-size:.6875rem;line-height:1.2;touch-action:none}
.dk-icon.sel{background:color-mix(in srgb,var(--accent) 30%,transparent)}
.dk-icon>span:last-child{text-shadow:0 0 6px var(--bg),0 1px 3px var(--bg);color:var(--fg);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 .25rem;border-radius:4px}
.dk-icon.sel>span:last-child{background:var(--accent);color:var(--accent-fg);text-shadow:none}
.dk-tile{width:52px;height:52px;border-radius:13px;display:grid;place-items:center;color:var(--accent-fg,#fff);box-shadow:0 4px 12px rgba(0,0,0,.3),inset 0 0 0 1px color-mix(in srgb,var(--accent-fg,#fff) 22%,transparent);background:linear-gradient(0deg,var(--accent),color-mix(in srgb,var(--accent) 62%,transparent))}
html[data-pop] .dk-tile{background:linear-gradient(0deg,var(--accent),color-mix(in srgb,var(--accent2,var(--accent)) 60%,transparent))}
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
.dk-body>.view.dk-hide{display:none!important}
body.desktop #tabbar,body.desktop #toolbar,body.desktop #views{display:none!important} /* the address only lives inside the proxy window */
.dk-tabs{display:flex;gap:2px;padding:4px 8px 0;overflow-x:auto;scrollbar-width:none;background:color-mix(in srgb,var(--fg) 7%,transparent);flex:none}
.dk-tabs::-webkit-scrollbar{display:none}.dk-tabs[hidden]{display:none}
.dk-tab{display:flex;align-items:center;gap:.25rem;flex:0 1 11rem;min-width:4.5rem;height:26px;padding:0 .25rem 0 .625rem;border-radius:8px 8px 0 0;font-size:.75rem;color:var(--dim);cursor:default;touch-action:none;-webkit-user-select:none;user-select:none}
.dk-tab>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dk-tab:hover{background:color-mix(in srgb,var(--fg) 10%,transparent)}.dk-tab.on{background:var(--panel);color:var(--fg)}
.dk-tx{width:16px;height:16px;border-radius:50%;line-height:1;font-size:.8125rem;color:inherit;background:none;border:0;padding:0;cursor:pointer;flex:none}.dk-tx:hover{background:color-mix(in srgb,var(--fg) 18%,transparent)}
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
    const w = { el, app, kind, g, max: false, min: false, prev: null, tab: null, tabs: [], strip: null, body: $(".dk-body", el), title: $(".dk-title", el), addr: $(".dk-addr", el) };
    if (kind === "web") { const st = document.createElement("div"); st.className = "dk-tabs"; st.hidden = true; $(".dk-bar", el).after(st); w.strip = st; }
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
      w.strip.addEventListener("click", (e) => {
        const x = e.target.closest("[data-x]"), tb = e.target.closest(".dk-tab");
        if (x) closeTabIn(w, w.tabs[+x.dataset.x]); else if (tb) activate(w, w.tabs[+tb.dataset.i]);
      });
      w.strip.addEventListener("pointerdown", (e) => { const tb = e.target.closest(".dk-tab"); if (tb && !e.target.closest("[data-x]") && e.button === 0) startTabDrag(w, w.tabs[+tb.dataset.i], e); });
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
    if (w.tabs.length) { for (const t of w.tabs.slice()) NV.closeTab(t); w.tabs.length = 0; } else if (w.tab) NV.closeTab(w.tab);
    if (focused === w) { focused = null; const next = topWin(wins.filter((x) => !x.min)); if (next) focusWin(next); else $("#dk-appname").textContent = "Nex.Velo"; }
    paintDock();
  }

  /* ---------- tabs inside a proxy window ---------- */
  function bindTab(w, t) {
    t.onTitle = (title) => { if (w.tab === t || !w.tabs.length) w.title.textContent = w.kind === "web" ? title || "New tab" : w.app.name; paintTabs(w); };
    t.onSync = (tab) => { if (w.addr && w.tab === tab && document.activeElement !== w.addr) w.addr.value = tab.frame ? NV.displayUrl(tab.url) : ""; };
    t.onFocus = () => { if (w.tabs.includes(t) && w.tab !== t) activate(w, t, true); focusWin(w, true); };
  }
  function paintTabs(w) {
    if (!w.strip) return;
    w.strip.hidden = w.tabs.length < 2;
    w.strip.innerHTML = w.tabs.map((t, i) => `<div class="dk-tab${t === w.tab ? " on" : ""}" data-i="${i}" title="${esc(t.title || "")}"><span>${esc(t.title || "New tab")}</span><button class="dk-tx" data-x="${i}" aria-label="Close tab" type="button">×</button></div>`).join("");
  }
  function activate(w, t, fromSelect) {
    w.tab = t;
    for (const x of w.tabs) x.view.classList.toggle("dk-hide", x !== t);
    w.title.textContent = w.kind === "web" ? t.title || "New tab" : w.app.name;
    if (w.addr) w.addr.value = t.frame ? NV.displayUrl(t.url) : "";
    paintTabs(w);
    if (!fromSelect) NV.select(t);
  }
  function closeTabIn(w, t) {
    const i = w.tabs.indexOf(t); if (i < 0) return;
    w.tabs.splice(i, 1); NV.closeTab(t);
    if (!w.tabs.length) { w.tab = null; closeWin(w); return; }
    if (w.tab === t) activate(w, w.tabs[Math.min(i, w.tabs.length - 1)]); else paintTabs(w);
  }
  // pull a tab out of the strip and it becomes a window of its own, which keeps following the pointer until you let go
  function detach(w, t) {
    const i = w.tabs.indexOf(t); if (i < 0) return null;
    const nw = makeWindow("web");
    w.tabs.splice(i, 1); nw.tabs.push(t); nw.body.appendChild(t.view); bindTab(nw, t);
    if (w.tab === t) activate(w, w.tabs[Math.min(i, w.tabs.length - 1)], true); else paintTabs(w);
    nw.tab = t; activate(nw, t, false); focusWin(nw, true);
    return nw;
  }
  function startTabDrag(w, t, e) {
    const sx = e.clientX, sy = e.clientY; let nw = null;
    const move = (ev) => {
      if (!nw) {
        if (w.tabs.length < 2 || Math.hypot(ev.clientX - sx, ev.clientY - sy) < 14) return;
        const r = w.el.getBoundingClientRect(), out = ev.clientY > r.top + 100 || ev.clientY < r.top - 14 || ev.clientX < r.left - 24 || ev.clientX > r.right + 24;
        if (!out) return;
        nw = detach(w, t); if (!nw) return; root.classList.add("dk-dragging");
      }
      nw.g.x = Math.round(ev.clientX - nw.g.w / 2); nw.g.y = Math.max(MENU_H, Math.round(ev.clientY - 14)); apply(nw);
    };
    const up = () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up); if (nw) { root.classList.remove("dk-dragging"); saveGeom(nw); } };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
  }

  // app.js sends every new tab here while desktop mode is on. Proxy tabs share one window; drag a tab out to give it a window of its own.
  NV.desktopOpen = (opts) => {
    const kind = opts.kind || "web";
    let w = null;
    if (kind === "web" && !opts.newWindow) { const open = wins.filter((x) => x.kind === "web"); w = (focused && focused.kind === "web" ? focused : topWin(open)) || null; }
    const fresh = !w; if (fresh) w = makeWindow(kind);
    const t = NV.newTab({ ...opts, host: w.body });
    if (!t) { if (fresh) closeWin(w); return null; }
    bindTab(w, t);
    if (kind === "web") { w.tabs.push(t); activate(w, t, true); } else w.tab = t;
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
    if (id === "vm") { // the virtual machine lives in the Tools window, on its own page
      NV.openPage("tools"); let n = 0; const t = setInterval(() => { if ((NV.toolsShow && (NV.toolsShow("vm"), true)) || ++n > 20) clearInterval(t); }, 150); return;
    }
    const open = wins.filter((w) => w.app.id === id);
    if (open.length && !forceNew) { focusWin(topWin(open)); return; }
    if (app.kind === "web") NV.newTab({ kind: "web", newWindow: !!forceNew }); else NV.openPage(app.kind);
  }

  /* ---------- desktop icons: they sit on a grid. drag one and it jumps from cell to cell, never in between ---------- */
  const GRID = { w: 104, h: 96, x: 8, y: MENU_H + 8 }, ICON_W = 88;
  function buildIcons() {
    const box = $("#dk-icons"); let saved = {}; try { saved = JSON.parse(LS.get("nexvelo.desk.icons", "{}")) || {}; } catch {}
    box.innerHTML = "";
    const cols = Math.max(1, Math.floor((innerWidth - GRID.x) / GRID.w)), rows = Math.max(1, Math.floor((innerHeight - DOCK_H - GRID.y) / GRID.h));
    const taken = new Map(); // "col,row" -> app id
    const px = (c, r) => ({ x: GRID.x + c * GRID.w + (GRID.w - ICON_W) / 2, y: GRID.y + r * GRID.h });
    const cellOf = (x, y) => [Math.round((x - GRID.x - (GRID.w - ICON_W) / 2) / GRID.w), Math.round((y - GRID.y) / GRID.h)];
    const free = (c, r, id) => { const t = taken.get(c + "," + r); return !t || t === id; };
    const nearest = (c, r, id) => { // the closest empty cell to the one asked for
      c = Math.max(0, Math.min(cols - 1, c)); r = Math.max(0, Math.min(rows - 1, r));
      if (free(c, r, id)) return [c, r];
      for (let d = 1; d <= cols + rows; d++) {
        let best = null, bd = 1e9;
        for (let dc = -d; dc <= d; dc++) for (let dr = -d; dr <= d; dr++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue;
          const cc = c + dc, rr = r + dr;
          if (cc < 0 || rr < 0 || cc >= cols || rr >= rows || !free(cc, rr, id)) continue;
          const dd = dc * dc + dr * dr; if (dd < bd) { bd = dd; best = [cc, rr]; }
        }
        if (best) return best;
      }
      return [c, r];
    };
    enabled().forEach((a, i) => {
      const el = document.createElement("div"); el.className = "dk-icon"; el.dataset.id = a.id;
      el.innerHTML = `<span class="dk-tile" style="--h:${a.hue}">${IC[a.id]}</span><span>${esc(a.name)}</span>`;
      let cell = saved[a.id] ? cellOf(saved[a.id].x, saved[a.id].y) : [cols - 1, i];
      cell = nearest(cell[0], cell[1], a.id); taken.set(cell[0] + "," + cell[1], a.id);
      const place = () => { const p = px(cell[0], cell[1]); el.style.left = p.x + "px"; el.style.top = p.y + "px"; };
      place(); box.appendChild(el);
      el.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return; e.stopPropagation();
        box.querySelectorAll(".dk-icon").forEach((x) => x.classList.toggle("sel", x === el));
        const sx = e.clientX, sy = e.clientY, ox = parseFloat(el.style.left), oy = parseFloat(el.style.top); let moved = false;
        el.setPointerCapture(e.pointerId);
        const move = (ev) => {
          if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
          if (!moved) { moved = true; box.classList.add("snapping"); el.classList.add("snap", "lift"); }
          const want = cellOf(ox + ev.clientX - sx, oy + ev.clientY - sy), next = nearest(want[0], want[1], a.id);
          if (next[0] !== cell[0] || next[1] !== cell[1]) { taken.delete(cell[0] + "," + cell[1]); cell = next; taken.set(cell[0] + "," + cell[1], a.id); place(); }
        };
        const up = () => {
          el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
          box.classList.remove("snapping"); el.classList.remove("lift");
          if (moved) { const p = px(cell[0], cell[1]); saved[a.id] = { x: p.x, y: p.y }; LS.set("nexvelo.desk.icons", JSON.stringify(saved)); }
          else launch(a.id);
        };
        el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
      });
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
    showPop(btn, '<button class="dk-item" data-act="about" type="button">About Nex.Velo</button><button class="dk-item" data-act="settings" type="button">Settings…</button><button class="dk-item" data-act="install" type="button">Install as an app</button><hr><button class="dk-item" data-act="normal" type="button">Switch to normal layout</button><button class="dk-item" data-act="closeall" type="button">Close all windows</button>',
    (a) => {
      if (a === "about") NV.openSettings("about");
      else if (a === "settings") NV.openSettings();
      else if (a === "install") { if (NV.install.can()) NV.install.prompt(); else NV.showBanner(NV.install.help(), false, "info"); }
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

  /* ---------- snow that lands on windows, piles up, travels with a dragged window and sweeps away with the cursor ----------
     On when the Christmas theme is chosen and "falling snowflakes" is switched on (Settings > Appearance, or the first-visit setup). */
  function startSnow() {
    const cv = document.createElement("canvas"); cv.id = "dk-snow"; cv.hidden = true; cv.setAttribute("aria-hidden", "true");
    root.insertBefore(cv, layer.nextSibling);
    const ctx = cv.getContext("2d"), BIN = 4, MAXH = 18;
    let flakes = [], parts = [], raf = 0, last = 0, piles = new WeakMap(), dock = null, mouse = null;
    const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const want = () => !!(NV.settings.snow && NV.settings.theme === "christmas") && !calm() && !document.hidden;
    const fit = () => { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const spawn = (f, top) => { f.x = Math.random() * innerWidth; f.y = top ? -Math.random() * innerHeight : -8; return f; };
    const seed = () => { flakes = Array.from({ length: Math.round(Math.min(240, innerWidth / 5.5)) }, () => spawn({ r: 1 + Math.random() * 2.4, v: 28 + Math.random() * 40, p: Math.random() * 6.28, s: 0.4 + Math.random() * 0.9 }, true)); };
    function surfaces() {
      const ws = wins.filter((w) => !w.min && w.el.style.display !== "none").map((w) => ({ key: w, r: w.el.getBoundingClientRect(), z: +w.el.style.zIndex || 0 }));
      const out = ws.map((s) => ({ key: s.key, x0: s.r.left, x1: s.r.right, y: s.r.top, z: s.z }));
      out.push({ key: "dock", x0: 0, x1: innerWidth, y: innerHeight - DOCK_H, z: -1 });
      return { out, ws };
    }
    const pileOf = (s) => {
      const n = Math.ceil((s.x1 - s.x0) / BIN) + 1; let p = s.key === "dock" ? dock : piles.get(s.key);
      if (!p || p.h.length !== n) { const np = { h: new Float32Array(n) }; if (p) np.h.set(p.h.subarray(0, Math.min(n, p.h.length))); p = np; if (s.key === "dock") dock = p; else piles.set(s.key, p); }
      return p;
    };
    const covered = (ws, s, x, y) => ws.some((o) => o.key !== s.key && o.z > s.z && x >= o.r.left && x <= o.r.right && y >= o.r.top && y <= o.r.bottom);
    function add(s, x, r) {
      const p = pileOf(s), n = p.h.length, i = Math.max(0, Math.min(n - 1, Math.round((x - s.x0) / BIN)));
      const cap = (j) => 6 + 8 * (0.5 + 0.5 * Math.sin(j * 0.11 + 1)) + 4 * (0.5 + 0.5 * Math.sin(j * 0.37)); // the height limit varies, so piles look like soft heaps and not a flat band
      for (const [d, k] of [[0, 2.4], [-1, 1.2], [1, 1.2], [-2, 0.6], [2, 0.6]]) { const j = i + d; if (j >= 0 && j < n) p.h[j] = Math.min(cap(j), p.h[j] + k * r * 0.45); }
      for (let pass = 0; pass < 2; pass++) for (let j = Math.max(1, i - 6); j < Math.min(n - 1, i + 7); j++) { // snow slumps into a soft heap instead of a spike
        const b = p.h[j];
        if (b - p.h[j - 1] > 2.5) { const d = (b - p.h[j - 1] - 2.5) / 2; p.h[j] -= d; p.h[j - 1] += d; }
        if (b - p.h[j + 1] > 2.5) { const d = (b - p.h[j + 1] - 2.5) / 2; p.h[j] -= d; p.h[j + 1] += d; }
      }
    }
    function sweep(sf) {
      if (!mouse || mouse.down || root.classList.contains("dk-dragging") || performance.now() - mouse.t > 120) return;
      const speed = Math.hypot(mouse.vx, mouse.vy);
      for (const s of sf) {
        if (Math.abs(mouse.y - s.y) > 46 || mouse.x < s.x0 - 40 || mouse.x > s.x1 + 40) continue;
        const p = pileOf(s);
        for (let j = 0; j < p.h.length; j++) {
          const bx = s.x0 + j * BIN;
          if (p.h[j] > 0.1 && Math.abs(bx - mouse.x) < 44) {
            const take = Math.min(p.h[j], 1.2 + speed * 0.004); p.h[j] -= take;
            if (parts.length < 260 && Math.random() < 0.6) parts.push({ x: bx, y: s.y - p.h[j], vx: mouse.vx * 0.35 + (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 110, life: 0.6 + Math.random() * 0.6 });
          }
        }
      }
    }
    function frame(now) {
      if (!want()) return stop();
      const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      const { out: sf, ws } = surfaces(), W = innerWidth, H = innerHeight;
      ctx.clearRect(0, 0, W, H);
      for (const f of flakes) {
        const oy = f.y; f.p += dt * f.s; f.x += Math.sin(f.p) * 14 * dt; f.y += f.v * dt;
        let land = null;
        for (const s of sf) if (oy <= s.y && f.y >= s.y && f.x >= s.x0 && f.x <= s.x1 && !covered(ws, s, f.x, s.y - 1)) { land = s; break; }
        if (land) { add(land, f.x, f.r); spawn(f); continue; }
        if (f.y > H + 8 || ws.some((o) => f.x >= o.r.left && f.x <= o.r.right && f.y >= o.r.top && f.y <= o.r.bottom)) { spawn(f); continue; } // fell off, or a window slid over it
        ctx.globalAlpha = 0.5 + f.r / 5; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832); ctx.fill();
      }
      sweep(sf);
      ctx.globalAlpha = 1; ctx.fillStyle = "rgba(255,255,255,.97)";
      for (const s of sf) { // the piles. each is drawn along its surface's top edge, so it moves with the window
        const p = pileOf(s); let any = false; for (let j = 0; j < p.h.length; j++) if (p.h[j] > 0.2) { any = true; break; } if (!any) continue;
        ctx.save();
        const higher = ws.filter((o) => o.key !== s.key && o.z > s.z);
        if (higher.length) { ctx.beginPath(); ctx.rect(0, 0, W, H); for (const o of higher) ctx.rect(o.r.left, o.r.top, o.r.width, o.r.height); ctx.clip("evenodd"); }
        ctx.beginPath(); ctx.moveTo(s.x0, s.y + 1);
        for (let j = 0; j < p.h.length; j++) ctx.lineTo(Math.min(s.x1, s.x0 + j * BIN), s.y - Math.max(0, p.h[j] - 0.4));
        ctx.lineTo(s.x1, s.y + 1); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      for (let i = parts.length - 1; i >= 0; i--) { // snow thrown up by the cursor
        const q = parts[i]; q.life -= dt; q.vy += 320 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.life <= 0 || q.y > H) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, q.life * 2); ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1; raf = requestAnimationFrame(frame);
    }
    function run() { cv.hidden = false; fit(); seed(); last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { cancelAnimationFrame(raf); raf = 0; cv.hidden = true; parts = []; piles = new WeakMap(); dock = null; }
    root.addEventListener("pointermove", (e) => {
      const now = performance.now(), dt = mouse ? Math.max(8, now - mouse.t) / 1000 : 0.016;
      mouse = { x: e.clientX, y: e.clientY, vx: mouse ? (e.clientX - mouse.x) / dt * 0.5 + mouse.vx * 0.5 : 0, vy: mouse ? (e.clientY - mouse.y) / dt * 0.5 + mouse.vy * 0.5 : 0, t: now, down: e.buttons !== 0 };
    });
    addEventListener("resize", () => { if (raf) { fit(); seed(); } });
    setInterval(() => { const w = want(); if (w && !raf) run(); else if (!w && raf) stop(); }, 500);
    NV.desktopSnow = () => ({ running: !!raf, flakes: flakes.length, piled: Math.round(Math.max(0, ...(wins.map((w) => { const p = piles.get(w); return p ? Math.max(...p.h) : 0; })))) });
  }

  NV.desktopStart = () => {
    NV.desktopMode = true; document.body.classList.add("desktop"); build(); startSnow();
    for (const id of ["tabbar", "toolbar", "views"]) { const el = document.getElementById(id); if (el) { el.hidden = true; el.style.setProperty("display", "none", "important"); } } // the normal browser bars are not used here
  };
  NV.desktopWindows = () => wins.map((w) => ({ kind: w.kind, min: w.min, max: w.max, focus: w === focused }));
  NV.desktopLoaded = true;
})();
