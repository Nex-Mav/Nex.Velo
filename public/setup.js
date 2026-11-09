/* First-visit setup, in three short steps: 1) layout (desktop or normal), 2) look (colour theme, font, live wallpaper) and
   3) how Nex.Velo opens (main page, about:blank, blob cloak or window about:blank) and whether to remember it.
   When the choices are remembered, the same launch method runs by itself on every later visit. Settings → "change layout and launch
   mode" runs the setup again. */
(() => {
  "use strict";
  const NV = window.NV;
  if (!NV) return;
  const { esc, LS, settings } = NV;
  const $ = (s, r = document) => r.querySelector(s);

  const METHODS = [
    ["here", "continue on the main page", "stay on this page and open Nex.Velo right here."],
    ["blank", "about:blank", "opens Nex.Velo inside a blank tab, so the address bar only shows about:blank."],
    ["blob", "blob cloak", "reopens this tab from a blob: address, so the address bar looks different from the real site."],
    ["window", "window about:blank", "opens Nex.Velo in its own pop-up window with a blank address."],
  ];
  const NAMES = { blank: "about:blank", blob: "blob cloak", window: "window about:blank" };
  const REM_ON = "next time Nex.Velo opens by itself the way you picked, with no setup.";
  const REM_OFF = "nothing is saved. these choices only last for this visit, and the setup shows again next time.";

  const style = document.createElement("style");
  style.textContent = `
#su{position:fixed;inset:0;z-index:200000;display:flex;padding:1rem;overflow:auto;background:color-mix(in srgb,var(--bg) 70%,transparent);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);color:var(--fg);font-family:var(--font,system-ui,sans-serif)}
.su-card{margin:auto;width:min(44rem,100%);max-height:calc(100vh - 2rem);max-height:calc(100dvh - 2rem);display:flex;flex-direction:column;gap:1rem;padding:1.375rem 1.5rem;border-radius:1.5rem;background:var(--panel);box-shadow:0 0 0 1px color-mix(in srgb,var(--fg) 12%,transparent),0 24px 64px rgba(0,0,0,.4)}
.su-card.pop{animation:su-in .28s cubic-bezier(.3,.9,.3,1) both}
@keyframes su-in{from{opacity:0;transform:translateY(8px) scale(.98)}}
.su-head{flex:none}.su-head h1{margin:0;font-size:1.375rem;font-weight:500;letter-spacing:-.01em}.su-head p{margin:.25rem 0 0;font-size:.8125rem;color:var(--dim)}
.su-dots{display:flex;gap:.375rem;margin-top:.75rem}.su-dots i{display:block;width:1.5rem;height:.25rem;border-radius:.25rem;background:color-mix(in srgb,var(--fg) 18%,transparent);transition:background .3s,width .3s}
.su-dots i.on{width:2.5rem;background:var(--accent)}.su-dots i.done{background:color-mix(in srgb,var(--accent) 55%,transparent)}
.su-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:1.125rem;padding:.25rem;margin:0 -.25rem}
.su-body h2{margin:0;font-size:.8125rem;font-weight:500;color:var(--dim)}
.su-end{flex:none;display:flex;gap:.5rem;align-items:center}.su-end .sp{flex:1}.su-end .btn{min-width:6rem}
.su-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.75rem}
.su-opt{display:flex;flex-direction:column;gap:.5rem;align-items:stretch;padding:.75rem;border:0;border-radius:1rem;background:var(--btn,rgba(128,128,128,.16));color:inherit;font:inherit;text-align:left;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .2s,transform .2s cubic-bezier(.34,1.5,.5,1),background .2s}
.su-opt:hover{background:var(--btn-h,rgba(128,128,128,.24))}.su-opt:active{transform:scale(.985)}.su-opt.on{box-shadow:inset 0 0 0 2px var(--accent)}
.su-opt b{font-weight:500;font-size:.9375rem}.su-opt small{color:var(--dim);font-size:.75rem;line-height:1.4}
.su-pv{position:relative;height:6.5rem;border-radius:.625rem;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 35%,var(--bg)),var(--bg))}
.su-pv i{position:absolute;display:block}
.su-pv .mb{left:0;right:0;top:0;height:.5rem;background:rgba(255,255,255,.22)}
.su-pv .win{left:22%;top:1.25rem;width:56%;height:3.5rem;border-radius:.375rem;background:var(--panel);box-shadow:0 4px 12px rgba(0,0,0,.35)}
.su-pv .win::before{content:"";position:absolute;left:.3rem;top:.25rem;width:.55rem;height:.2rem;background:linear-gradient(90deg,#ff5f57 0 30%,transparent 30% 35%,#febc2e 35% 65%,transparent 65% 70%,#28c840 70%);border-radius:1px}
.su-pv .dock{left:0;right:0;bottom:0;height:1.1rem;background:rgba(255,255,255,.2);border-top:1px solid rgba(255,255,255,.35)}
.su-pv .dock::before{content:"";position:absolute;left:50%;top:.25rem;width:35%;height:.6rem;margin-left:-17.5%;background:repeating-linear-gradient(90deg,rgba(255,255,255,.7) 0 .6rem,transparent .6rem .85rem);border-radius:2px}
.su-pv .tabs{left:.5rem;right:.5rem;top:.4rem;height:.8rem;border-radius:.3rem;background:rgba(255,255,255,.14)}
.su-pv .bar{left:.5rem;right:.5rem;top:1.5rem;height:.9rem;border-radius:.45rem;background:rgba(255,255,255,.2)}
.su-pv .su-time{left:0;right:0;top:3.1rem;text-align:center;font-size:1.5rem;font-weight:200;color:#fff;font-style:normal}
.su-themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(6.25rem,1fr));gap:.5rem}
.su-th{display:flex;align-items:center;gap:.5rem;padding:.5rem .625rem;border:0;border-radius:.75rem;background:var(--btn,rgba(128,128,128,.16));color:inherit;font:inherit;font-size:.75rem;text-align:left;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .2s,transform .2s cubic-bezier(.34,1.5,.5,1)}
.su-th i{flex:none;width:1.25rem;height:1.25rem;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px rgba(128,128,128,.4)}
.su-th:hover{background:var(--btn-h,rgba(128,128,128,.24))}.su-th:active{transform:scale(.96)}.su-th.on{box-shadow:inset 0 0 0 2px var(--accent)}
.su-fonts{display:grid;grid-template-columns:repeat(auto-fill,minmax(9rem,1fr));gap:.5rem}
.su-fn{display:flex;flex-direction:column;gap:.125rem;padding:.5rem .75rem;border:0;border-radius:.75rem;background:var(--btn,rgba(128,128,128,.16));color:inherit;text-align:left;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .2s,transform .2s cubic-bezier(.34,1.5,.5,1)}
.su-fn b{font-size:1.25rem;font-weight:400;line-height:1.2}.su-fn small{font-family:var(--font,system-ui);color:var(--dim);font-size:.6875rem}
.su-fn:hover{background:var(--btn-h,rgba(128,128,128,.24))}.su-fn:active{transform:scale(.96)}.su-fn.on{box-shadow:inset 0 0 0 2px var(--accent)}
.su-walls{display:flex;flex-wrap:wrap;gap:.5rem}
.su-wl{display:flex;align-items:center;gap:.5rem;padding:.375rem .75rem .375rem .375rem;border:0;border-radius:999px;background:var(--btn,rgba(128,128,128,.16));color:inherit;font:inherit;font-size:.75rem;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .2s,transform .2s cubic-bezier(.34,1.5,.5,1)}
.su-wl i{width:1.5rem;height:1.5rem;border-radius:50%;background:var(--c,rgba(128,128,128,.4));box-shadow:inset 0 0 0 1px rgba(128,128,128,.4)}
.su-wl:hover{background:var(--btn-h,rgba(128,128,128,.24))}.su-wl:active{transform:scale(.96)}.su-wl.on{box-shadow:inset 0 0 0 2px var(--accent)}
.su-list{display:flex;flex-direction:column;gap:.375rem}
.su-row{display:flex;align-items:flex-start;gap:.75rem;padding:.625rem .75rem;border:0;border-radius:.75rem;background:var(--btn,rgba(128,128,128,.16));color:inherit;font:inherit;text-align:left;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .2s,transform .2s cubic-bezier(.34,1.5,.5,1)}
.su-row:hover{background:var(--btn-h,rgba(128,128,128,.24))}.su-row:active{transform:scale(.99)}.su-row.on{box-shadow:inset 0 0 0 2px var(--accent)}
.su-row .dot{flex:none;width:1rem;height:1rem;margin-top:.125rem;border-radius:50%;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--fg) 40%,transparent)}
.su-row.on .dot{background:radial-gradient(circle,var(--accent) 0 45%,transparent 50%);box-shadow:inset 0 0 0 2px var(--accent)}
.su-row b{display:block;font-weight:500;font-size:.875rem}.su-row small{display:block;color:var(--dim);font-size:.75rem;line-height:1.4;margin-top:.125rem}
.su-chk{display:flex;align-items:center;gap:.625rem;font-size:.8125rem;color:var(--dim)}
.su-note{margin:.375rem 0 0;font-size:.75rem;color:var(--dim);line-height:1.5}
.su-card .switch{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.25rem 0}.su-card .switch small{display:block;color:var(--dim);font-size:.75rem;margin-top:.125rem}
#su-pill{position:fixed;left:50%;bottom:1.25rem;z-index:200000;transform:translateX(-50%);display:flex;align-items:center;gap:.75rem;padding:.625rem .625rem .625rem 1rem;border-radius:999px;background:color-mix(in srgb,var(--panel) 85%,transparent);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 0 0 1px color-mix(in srgb,var(--fg) 16%,transparent),0 12px 36px rgba(0,0,0,.4);color:var(--fg);font:.8125rem var(--font,system-ui,sans-serif)}
#su-pill button{height:1.875rem;padding:0 .875rem;border:0;border-radius:999px;background:var(--btn,rgba(128,128,128,.2));color:inherit;font:inherit}
@media (prefers-reduced-motion:reduce){.su-card.pop{animation:none}.su-opt,.su-row,.su-th,.su-fn,.su-wl,.su-dots i{transition:none}}
`;
  document.head.appendChild(style);

  /* ---------- the ways of opening Nex.Velo ---------- */
  // The address the cloaked page shows. With "remember" off, this visit's choices travel along as ?nvs=…
  const siteUrl = () => {
    const u = new URL(location.href); u.hash = ""; u.searchParams.delete("repair"); u.searchParams.delete("nvs");
    const ses = NV.getSession ? NV.getSession() : {};
    if (Object.keys(ses).length) u.searchParams.set("nvs", btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(ses)))));
    return u.href;
  };
  const ALLOW = "fullscreen; autoplay; microphone; camera; display-capture; clipboard-read; clipboard-write";
  function openBlank(popup) { // about:blank, in a tab or in a pop-up window
    const w = popup ? window.open("about:blank", "_blank", `popup=yes,width=${Math.min(1200, screen.availWidth - 80)},height=${Math.min(780, screen.availHeight - 80)},left=40,top=40`) : window.open("about:blank", "_blank");
    if (!w) return false;
    const d = w.document; d.title = "Nex.Velo";
    d.head.innerHTML = "<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style>";
    const f = d.createElement("iframe"); f.src = siteUrl(); f.allow = ALLOW; d.body.appendChild(f);
    return true;
  }
  // A page made in memory and opened from a blob: address. Done in this very tab, so it needs no pop-up and works by itself.
  function openBlob() {
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>Nex.Velo</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="' + location.origin + '/favicon.png"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src="' + siteUrl().replace(/"/g, "&quot;") + '" allow="' + ALLOW + '"></iframe></body></html>';
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    location.replace(url);
    return true;
  }
  // Opens the chosen kind of cloak. about:blank and the pop-up window need a click, or the browser blocks them.
  function openCloak(method, quiet) {
    const ok = method === "blob" ? openBlob() : method === "window" ? openBlank(true) : openBlank(false);
    if (!ok && !quiet) NV.toast("allow pop-ups for this site, then try again");
    return ok;
  }
  NV.openCloak = openCloak;
  const dest = () => { try { return NV.panicDest(); } catch { return "https://classroom.google.com"; } };
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

  /* ---------- the setup (three steps) ---------- */
  const effFont = () => (NV.FONTS[settings.font] ? settings.font : settings.theme === "custom" && NV.FONTS[settings.custom.font] ? settings.custom.font : "jetbrains");
  function runSetup(first) {
    if ($("#su")) return;
    const orig = { mode: settings.mode, theme: settings.theme, font: settings.font, wall: settings.wall };
    let step = 1, popped = false, remember = true;
    let mode = settings.mode === "desktop" ? "desktop" : "normal", theme = settings.theme, font = effFont(), wall = settings.wall;
    let method = ["here", "blank", "blob", "window"].includes(settings.launch) ? settings.launch : "here", redirect = settings.launchRedirect !== false;
    const themes = (NV.THEMES || []).filter((t) => t[0] !== "custom"), fonts = Object.entries(NV.FONTS || {});
    fonts.forEach(([k]) => NV.loadFont && NV.loadFont(k)); // so every font can be previewed in its own typeface
    const walls = [["none", "none", ""], ...(NV.LIVE || []).map((l) => [l[0], l[1], l[2]])];
    const box = document.createElement("div"); box.id = "su"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Set up Nex.Velo");
    document.body.appendChild(box);
    const TITLES = ["", "choose a layout", "choose your look", "how should it open?"];

    const body = () => {
      if (step === 1) return `<div class="su-grid">
 <button class="su-opt${mode === "desktop" ? " on" : ""}" data-mode="desktop" type="button"><div class="su-pv"><i class="mb"></i><i class="win"></i><i class="dock"></i></div><b>desktop</b><small>an Apple-style desktop. every app opens in its own window that you can drag, resize and minimise, with a dock along the bottom and a menu bar with the time, wifi and battery.</small></button>
 <button class="su-opt${mode === "normal" ? " on" : ""}" data-mode="normal" type="button"><div class="su-pv"><i class="tabs"></i><i class="bar"></i><i class="su-time">12:00</i></div><b>normal</b><small>the layout you know: tabs along the top, a search bar, and one page at a time.</small></button></div>`;
      if (step === 2) return `<h2>colour theme</h2><div class="su-themes">${themes.map(([id, label, c]) => `<button class="su-th${id === theme ? " on" : ""}" data-t="${id}" type="button"><i style="--c:${c}"></i>${esc(label)}</button>`).join("")}</div>
<h2>font</h2><div class="su-fonts">${fonts.map(([k, f]) => `<button class="su-fn${k === font ? " on" : ""}" data-f="${k}" type="button" style="font-family:${f[1].replace(/"/g, "&quot;")}"><b>Aa 123</b><small>${esc(f[0])}</small></button>`).join("")}</div>
<h2>live wallpaper (it reacts to your mouse)</h2><div class="su-walls">${walls.map(([id, label, g]) => `<button class="su-wl${id === wall ? " on" : ""}" data-w="${id}" type="button"><i${g ? ` style="--c:${g}"` : ""}></i>${esc(label)}</button>`).join("")}</div>`;
      const showInstall = !(NV.install && NV.install.standalone());
      return `<h2>how should Nex.Velo open?</h2><div class="su-list">${METHODS.map(([id, name, desc]) => `<button class="su-row${id === method ? " on" : ""}" data-m="${id}" type="button"><span class="dot"></span><span><b>${esc(name)}</b><small>${esc(desc)}</small></span></button>`).join("")}</div>
${method === "blank" || method === "window" ? `<label class="su-chk"><input type="checkbox" id="su-redir"${redirect ? " checked" : ""}><span>after it opens, send this tab to <b>${esc(host(dest()))}</b></span></label>` : ""}
<label class="switch"><div><b>remember my choices</b><small id="su-remnote">${remember ? REM_ON : REM_OFF}</small></div><input type="checkbox" id="su-rem"${remember ? " checked" : ""}></label>
${showInstall ? `<div><button class="btn" data-a="install" type="button">install as an app</button><p class="su-note" id="su-inst"></p></div>` : ""}`;
    };
    function draw() {
      box.innerHTML = `<div class="su-card${popped ? "" : " pop"}"><div class="su-head"><h1>${first ? "welcome to Nex.Velo" : "layout and launch mode"}</h1><p>step ${step} of 3 · ${TITLES[step]}</p><div class="su-dots">${[1, 2, 3].map((i) => `<i class="${i === step ? "on" : i < step ? "done" : ""}"></i>`).join("")}</div></div>
<div class="su-body">${body()}</div>
<div class="su-end">${first ? '<button class="btn" data-a="skip" type="button">skip for now</button>' : '<button class="btn" data-a="cancel" type="button">cancel</button>'}<span class="sp"></span>${step > 1 ? '<button class="btn" data-a="back" type="button">back</button>' : ""}<button class="btn primary" data-a="next" type="button">${step < 3 ? "next" : first ? "start" : "save"}</button></div></div>`;
      popped = true;
    }
    draw();

    const revert = () => { settings.theme = orig.theme; settings.font = orig.font; settings.wall = orig.wall; NV.applyTheme(true); NV.applyWall(); };
    function finish() {
      const data = { mode, theme, font, wall, launch: method, launchRedirect: redirect };
      Object.assign(settings, data);
      if (remember) { NV.save(); LS.set("nexvelo.setup", "1"); } else NV.setSession(data); // not remembered: kept for this visit only
      const outside = window.top === window.self;
      if (method !== "here" && outside) {
        if (method === "blob") { box.remove(); openBlob(); return; } // this tab turns into the blob page
        if (!openCloak(method)) return; // blocked: stay here so it can be tried again
        box.remove();
        if (redirect) { location.replace(dest()); return; }
      } else box.remove();
      if (mode !== orig.mode) location.reload(); // the layout is picked when the site starts
    }
    box.addEventListener("click", async (e) => {
      const a = e.target.closest("[data-a]"), md = e.target.closest("[data-mode]"), t = e.target.closest("[data-t]"), f = e.target.closest("[data-f]"), w = e.target.closest("[data-w]"), m = e.target.closest("[data-m]");
      if (md) { mode = md.dataset.mode; draw(); }
      else if (t) { theme = t.dataset.t; settings.theme = theme; NV.applyTheme(true); draw(); } // the whole site changes behind this screen, so you can see it
      else if (f) { font = f.dataset.f; settings.font = font; NV.applyTheme(); draw(); }
      else if (w) { wall = w.dataset.w; settings.wall = wall; NV.applyWall(); draw(); }
      else if (m) { method = m.dataset.m; draw(); }
      else if (a) {
        const act = a.dataset.a;
        if (act === "next") { if (step < 3) { step++; draw(); } else finish(); }
        else if (act === "back") { step--; draw(); }
        else if (act === "skip") { revert(); try { sessionStorage.setItem("nexvelo.skip", "1"); } catch {} box.remove(); }
        else if (act === "cancel") { revert(); box.remove(); }
        else if (act === "install") {
          const note = $("#su-inst");
          if (NV.install.can()) { const r = await NV.install.prompt(); if (note) note.textContent = r === "accepted" ? "installing…" : "install cancelled."; }
          else if (note) note.textContent = NV.install.help();
        }
      }
    });
    box.addEventListener("change", (e) => {
      if (e.target.id === "su-rem") { remember = e.target.checked; const n = $("#su-remnote", box); if (n) n.textContent = remember ? REM_ON : REM_OFF; }
      else if (e.target.id === "su-redir") redirect = e.target.checked;
    });
  }
  NV.runSetup = () => runSetup(false);

  /* ---------- later visits: open the chosen way, by itself ---------- */
  function autoLaunch() {
    if (window.top !== window.self) return; // already inside a cloak
    const m = settings.launch;
    if (m === "blob") { openBlob(); return; }
    if (m !== "blank" && m !== "window") return;
    if (openCloak(m, true)) { if (settings.launchRedirect) location.replace(dest()); return; }
    // The browser blocks a new tab or window that nobody asked for, so the first click or key press does it.
    const pill = document.createElement("div"); pill.id = "su-pill"; pill.setAttribute("role", "status");
    pill.innerHTML = `<span>click anywhere to open Nex.Velo in ${esc(NAMES[m])}</span><button type="button" data-stay>stay here</button>`;
    document.body.appendChild(pill);
    const done = () => { document.removeEventListener("pointerdown", go, true); document.removeEventListener("keydown", go, true); pill.remove(); };
    function go(e) {
      if (e.target && e.target.closest && e.target.closest("[data-stay]")) { done(); return; }
      if (openCloak(m, true)) { done(); if (settings.launchRedirect) location.replace(dest()); }
    }
    document.addEventListener("pointerdown", go, true); document.addEventListener("keydown", go, true);
  }

  NV.loaded.setup = true;
  const topLevel = window.top === window.self;
  const hasSession = (() => { try { return Object.keys(JSON.parse(sessionStorage.getItem("nexvelo.session") || "{}")).length > 0; } catch { return false; } })();
  const skipped = (() => { try { return !!sessionStorage.getItem("nexvelo.skip"); } catch { return false; } })();
  if (LS.get("nexvelo.setup", "")) { if (!hasSession) autoLaunch(); }
  else if (topLevel && !hasSession && !skipped) runSetup(true);
})();