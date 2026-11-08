/* First-visit setup: pick a layout (desktop or normal) and how Nex.Velo should open (main page, about:blank, blob cloak, window about:blank).
   Also runs the launch step on later visits. Settings → "change layout and launch mode" runs the setup again. */
(() => {
  "use strict";
  const NV = window.NV;
  if (!NV) return;
  const { esc, LS, settings } = NV;
  const $ = (s, r = document) => r.querySelector(s);

  const METHODS = [
    ["here", "continue on the main page", "stay on this page and open Nex.Velo right here."],
    ["blank", "about:blank", "opens Nex.Velo inside a blank tab, so the address bar only shows about:blank."],
    ["blob", "blob cloak", "opens Nex.Velo from a blob: address in a new tab, which looks different from the real site."],
    ["window", "window about:blank", "opens Nex.Velo in its own pop-up window with a blank address."],
  ];
  const NAMES = { blank: "about:blank", blob: "blob cloak", window: "window about:blank" };

  const style = document.createElement("style");
  style.textContent = `
#su,#lg{position:fixed;inset:0;z-index:200000;display:flex;padding:1rem;overflow:auto;background:color-mix(in srgb,var(--bg) 78%,transparent);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);color:var(--fg);font-family:var(--font,system-ui,sans-serif)}
.su-card{margin:auto;width:min(44rem,100%);display:flex;flex-direction:column;gap:1.125rem;padding:1.5rem;border-radius:1.25rem;background:var(--panel);box-shadow:0 0 0 1px color-mix(in srgb,var(--fg) 12%,transparent),0 24px 64px rgba(0,0,0,.4);animation:su-in .28s cubic-bezier(.3,.9,.3,1) both}
@keyframes su-in{from{opacity:0;transform:translateY(8px) scale(.98)}}
.su-card h1{margin:0;font-size:1.375rem;font-weight:500;letter-spacing:-.01em}
.su-card h2{margin:.25rem 0 0;font-size:.8125rem;font-weight:500;color:var(--dim)}
.su-card p{margin:.25rem 0 0;font-size:.8125rem;color:var(--dim)}
.su-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.75rem}
.su-opt{display:flex;flex-direction:column;gap:.5rem;align-items:stretch;padding:.75rem;border:0;border-radius:1rem;background:var(--btn,rgba(128,128,128,.16));color:inherit;font:inherit;text-align:left;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .15s,transform .15s}
.su-opt:hover{background:var(--btn-h,rgba(128,128,128,.24))}.su-opt:active{transform:scale(.985)}
.su-opt.on{box-shadow:inset 0 0 0 2px var(--accent)}
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
.su-pv .clock{left:0;right:0;top:3.1rem;text-align:center;font-size:1.5rem;font-weight:200;color:#fff;font-style:normal}
.su-list{display:flex;flex-direction:column;gap:.375rem}
.su-row{display:flex;align-items:flex-start;gap:.75rem;padding:.625rem .75rem;border:0;border-radius:.75rem;background:var(--btn,rgba(128,128,128,.16));color:inherit;font:inherit;text-align:left;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .15s,transform .15s}
.su-row:hover{background:var(--btn-h,rgba(128,128,128,.24))}.su-row:active{transform:scale(.99)}
.su-row.on{box-shadow:inset 0 0 0 2px var(--accent)}
.su-row .dot{flex:none;width:1rem;height:1rem;margin-top:.125rem;border-radius:50%;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--fg) 40%,transparent)}
.su-row.on .dot{background:radial-gradient(circle,var(--accent) 0 45%,transparent 50%);box-shadow:inset 0 0 0 2px var(--accent)}
.su-row b{display:block;font-weight:500;font-size:.875rem}.su-row small{display:block;color:var(--dim);font-size:.75rem;line-height:1.4;margin-top:.125rem}
.su-themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(6.25rem,1fr));gap:.5rem}
.su-th{display:flex;align-items:center;gap:.5rem;padding:.5rem .625rem;border:0;border-radius:.75rem;background:var(--btn,rgba(128,128,128,.16));color:inherit;font:inherit;font-size:.75rem;text-align:left;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .15s,transform .15s}
.su-th i{flex:none;width:1.25rem;height:1.25rem;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px rgba(128,128,128,.4)}
.su-th:hover{background:var(--btn-h,rgba(128,128,128,.24))}.su-th:active{transform:scale(.97)}.su-th.on{box-shadow:inset 0 0 0 2px var(--accent)}
.su-fonts{display:grid;grid-template-columns:repeat(auto-fill,minmax(9rem,1fr));gap:.5rem}
.su-fn{display:flex;flex-direction:column;gap:.125rem;padding:.5rem .75rem;border:0;border-radius:.75rem;background:var(--btn,rgba(128,128,128,.16));color:inherit;text-align:left;box-shadow:inset 0 0 0 2px transparent;transition:box-shadow .15s,transform .15s}
.su-fn b{font-size:1.25rem;font-weight:400;line-height:1.2}.su-fn small{font-family:var(--font,system-ui);color:var(--dim);font-size:.6875rem}
.su-fn:hover{background:var(--btn-h,rgba(128,128,128,.24))}.su-fn:active{transform:scale(.97)}.su-fn.on{box-shadow:inset 0 0 0 2px var(--accent)}
.su-chk{display:flex;align-items:center;gap:.625rem;font-size:.8125rem;color:var(--dim)}
.su-end{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap}
.su-end .btn{min-width:7rem}
@media (prefers-reduced-motion:reduce){.su-card{animation:none}.su-opt,.su-row,.su-th,.su-fn{transition:none}}
`;
  document.head.appendChild(style);

  // The page Nex.Velo opens inside the cloak: this same address
  const siteUrl = () => location.href.split("#")[0].replace(/[?&]repair(=[^&]*)?/, "");
  const ALLOW = "fullscreen; autoplay; microphone; camera; display-capture; clipboard-read; clipboard-write";

  function openBlank(popup) { // about:blank, either in a tab or in a pop-up window
    const w = popup ? window.open("about:blank", "_blank", `popup=yes,width=${Math.min(1200, screen.availWidth - 80)},height=${Math.min(780, screen.availHeight - 80)},left=40,top=40`) : window.open("about:blank", "_blank");
    if (!w) return false;
    const d = w.document;
    d.title = "Nex.Velo";
    d.head.innerHTML = "<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style>";
    const f = d.createElement("iframe"); f.src = siteUrl(); f.allow = ALLOW; d.body.appendChild(f);
    return true;
  }
  function openBlob() { // a page made in memory, opened from a blob: address
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>Nex.Velo</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="' + location.origin + '/favicon.png"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src="' + siteUrl().replace(/"/g, "&quot;") + '" allow="' + ALLOW + '"></iframe></body></html>';
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const w = window.open(url, "_blank");
    if (!w) { URL.revokeObjectURL(url); return false; }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  }
  // Opens the chosen kind of cloak. It has to run from a click, or the browser blocks the new tab or window.
  function openCloak(method) {
    const ok = method === "blob" ? openBlob() : method === "window" ? openBlank(true) : openBlank(false);
    if (!ok) NV.toast("allow pop-ups for this site, then try again");
    return ok;
  }
  NV.openCloak = openCloak;

  const dest = () => { try { return NV.panicDest(); } catch { return "https://classroom.google.com"; } };
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

  /* ---------- the first-visit setup ---------- */
  function runSetup(isFirst) {
    if ($("#su")) return;
    let mode = settings.mode === "desktop" ? "desktop" : "normal";
    let method = ["here", "blank", "blob", "window"].includes(settings.launch) ? settings.launch : "here";
    const was = { mode, theme: settings.theme, font: settings.font };
    let theme = settings.theme, font = settings.font || (settings.theme === "custom" && NV.FONTS[settings.custom.font] ? settings.custom.font : "jetbrains");
    const themes = (NV.THEMES || []).filter((t) => t[0] !== "custom"), fonts = Object.entries(NV.FONTS || {});
    fonts.forEach(([k]) => NV.loadFont && NV.loadFont(k)); // so every font can be previewed in its own typeface
    const box = document.createElement("div"); box.id = "su"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Set up Nex.Velo");
    box.innerHTML = `<div class="su-card">
<div><h1>${isFirst ? "welcome to Nex.Velo" : "layout and launch mode"}</h1><p>choose a layout, colours and font, and how it should open. you can change all of it later in Settings.</p></div>
<h2>layout</h2>
<div class="su-grid">
 <button class="su-opt" data-mode="desktop" type="button"><div class="su-pv"><i class="mb"></i><i class="win"></i><i class="dock"></i></div><b>desktop</b><small>an Apple-style desktop. every app opens in its own window that you can drag, resize and minimise, with a dock along the bottom and a menu bar with the time, wifi and battery.</small></button>
 <button class="su-opt" data-mode="normal" type="button"><div class="su-pv"><i class="tabs"></i><i class="bar"></i><i class="clock">12:00</i></div><b>normal</b><small>the layout you know: tabs along the top, a search bar, and one page at a time.</small></button>
</div>
<h2>colour theme</h2>
<div class="su-themes">${themes.map(([id, label, c]) => `<button class="su-th" data-t="${id}" type="button"><i style="--c:${c}"></i>${esc(label)}</button>`).join("")}</div>
<h2>font</h2>
<div class="su-fonts">${fonts.map(([k, f]) => `<button class="su-fn" data-f="${k}" type="button" style="font-family:${f[1].replace(/"/g, "&quot;")}"><b>Aa 123</b><small>${esc(f[0])}</small></button>`).join("")}</div>
<h2>how should Nex.Velo open?</h2>
<div class="su-list">${METHODS.map(([id, name, desc]) => `<button class="su-row" data-m="${id}" type="button"><span class="dot"></span><span><b>${esc(name)}</b><small>${esc(desc)}</small></span></button>`).join("")}</div>
<label class="su-chk" id="su-redir-row"><input type="checkbox" id="su-redir"><span>after it opens, send this tab to <b>${esc(host(dest()))}</b></span></label>
<div class="su-end">${isFirst ? "" : '<button class="btn" id="su-cancel" type="button">cancel</button>'}<button class="btn primary" id="su-go" type="button">${isFirst ? "start" : "save"}</button></div></div>`;
    document.body.appendChild(box);
    $("#su-redir").checked = settings.launchRedirect !== false;
    const paint = () => {
      box.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
      box.querySelectorAll("[data-m]").forEach((b) => b.classList.toggle("on", b.dataset.m === method));
      box.querySelectorAll("[data-t]").forEach((b) => b.classList.toggle("on", b.dataset.t === theme));
      box.querySelectorAll("[data-f]").forEach((b) => b.classList.toggle("on", b.dataset.f === font));
      $("#su-redir-row").style.display = method === "here" ? "none" : "";
    };
    paint();
    box.addEventListener("click", (e) => {
      const a = e.target.closest("[data-mode]"), b = e.target.closest("[data-m]"), t = e.target.closest("[data-t]"), f = e.target.closest("[data-f]");
      if (a) { mode = a.dataset.mode; paint(); } else if (b) { method = b.dataset.m; paint(); }
      else if (t) { theme = t.dataset.t; settings.theme = theme; NV.applyTheme(true); paint(); } // the whole site changes behind this screen, so you can see it
      else if (f) { font = f.dataset.f; settings.font = font; NV.applyTheme(); paint(); }
    });
    const cancel = $("#su-cancel"); if (cancel) cancel.addEventListener("click", () => { settings.theme = was.theme; settings.font = was.font; NV.applyTheme(true); box.remove(); });
    $("#su-go").addEventListener("click", () => {
      const redirect = $("#su-redir").checked;
      if (method !== "here" && !(window.top !== window.self) && !openCloak(method)) return; // the browser blocked the new tab or window: stay on the setup so it can be tried again
      settings.mode = mode; settings.launch = method; settings.launchRedirect = redirect; settings.theme = theme; settings.font = font; NV.save(); LS.set("nexvelo.setup", "1");
      box.remove();
      if (method !== "here" && redirect && window.top === window.self) { location.replace(dest()); return; }
      if (mode !== was.mode) location.reload(); // the layout is chosen when the site starts
    });
  }
  NV.runSetup = () => runSetup(false);

  /* ---------- the launch step on later visits ---------- */
  function launchGate() {
    if (window.top !== window.self) return; // already inside a cloak
    const m = settings.launch;
    if (!["blank", "blob", "window", "ask"].includes(m) || $("#lg")) return;
    const choices = m === "ask" ? ["blank", "blob", "window"] : [m];
    const box = document.createElement("div"); box.id = "lg"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Open Nex.Velo");
    box.innerHTML = `<div class="su-card" style="width:min(26rem,100%)"><div><h1>open Nex.Velo</h1><p>${m === "ask" ? "choose how to open it." : "your launch mode is " + esc(NAMES[m]) + "."}</p></div>
<div class="su-list">${choices.map((c) => `<button class="btn primary" data-c="${c}" type="button" style="width:100%">open in ${esc(NAMES[c])}</button>`).join("")}<button class="btn" data-c="here" type="button" style="width:100%">stay on this page</button></div>
<label class="su-chk"><input type="checkbox" id="lg-never"><span>don't ask again, always continue on the main page</span></label></div>`;
    document.body.appendChild(box);
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]"); if (!b) return;
      const c = b.dataset.c;
      if (c !== "here" && !openCloak(c)) return;
      if ($("#lg-never").checked) { settings.launch = "here"; NV.save(); }
      box.remove();
      if (c !== "here" && settings.launchRedirect) location.replace(dest());
    });
  }

  NV.loaded.setup = true;
  if (!LS.get("nexvelo.setup", "")) {
    if (window.top === window.self) runSetup(true);
    else LS.set("nexvelo.setup", "1"); // inside a cloak: the setup was already done in the tab that opened it
  } else launchGate();
})();
