/* Tools: small utilities that run entirely in this browser (nothing is sent anywhere). */
(() => {
  "use strict";
  const NV = window.NV, page = document.getElementById("page-tools");
  if (!NV || !page) return;
  const { esc } = NV;
  const $ = (s, r = page) => r.querySelector(s);
  const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:1rem;height:1rem;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M15 6l-6 6 6 6"/></svg>';

  const style = document.createElement("style");
  style.textContent = `
.tl-wrap{max-width:46rem;margin:0 auto}
.tl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:.75rem;max-width:62rem;margin:0 auto}
.tl-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;box-sizing:border-box;width:100%;height:auto;min-height:7.75rem;padding:1.125rem .875rem;border:0;border-radius:1rem;background:var(--btn);color:inherit;font:inherit;text-align:center;min-width:0;white-space:normal;overflow:hidden;transition:transform .2s cubic-bezier(.34,1.5,.5,1),background .2s}
.tl-tile:hover{background:var(--btn-h)}.tl-tile:active{transform:scale(.97)}
.tl-tile b,.tl-tile small{display:block;max-width:100%;overflow-wrap:anywhere;word-break:break-word}
.tl-tile svg{width:1.5rem;height:1.5rem;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.tl-tile b{font-weight:500;font-size:.875rem;line-height:1.25}
.tl-tile small{font-size:.6875rem;color:var(--dim);line-height:1.35}
.tl-card{display:flex;flex-direction:column;gap:1rem;padding-bottom:2rem;text-align:center}
.tl-card .switch,.tl-card .tl-row,.tl-card .tl-pre,.tl-card .chk,.tl-card textarea{text-align:left}
.tl-card .fld>span{display:block;text-align:center}
.tl-card .row,.tl-card .tl-chips{justify-content:center}
.tl-out{text-align:center}
#tl-home .ghead{flex-direction:column;align-items:center;text-align:center;gap:.5rem}
#tl-home .ghead input{width:min(22rem,100%)}
#tl-view .ghead{position:relative;justify-content:flex-start}
#tl-title{position:absolute;left:0;right:0;text-align:center;pointer-events:none;font-weight:500}
.ck-combo{position:relative;text-align:left}
.ck-list{position:absolute;left:0;right:0;top:calc(100% + .25rem);z-index:30;max-height:15rem;overflow:auto;padding:.25rem;border-radius:.875rem;background:var(--card);box-shadow:0 14px 36px rgba(0,0,0,.42),0 0 0 1px color-mix(in srgb,var(--fg) 14%,transparent);overscroll-behavior:contain}
.ck-opt{display:flex;justify-content:space-between;gap:.75rem;align-items:center;padding:.4375rem .625rem;border-radius:.5rem;font-size:.8125rem;cursor:pointer}
.ck-opt small{opacity:.65;font-variant-numeric:tabular-nums;white-space:nowrap}
.ck-opt.on{background:var(--accent);color:var(--accent-fg)}.ck-none{padding:.625rem;font-size:.8125rem;color:var(--dim)}
.ck-row .ck-name{flex:1;min-width:0;text-align:left}.ck-row .ck-sub{display:block;font-size:.6875rem;color:var(--dim)}.ck-row .ck-t{font-size:1.125rem;font-variant-numeric:tabular-nums;flex:none}
.tl-out{display:flex;gap:.75rem;align-items:center;padding:.875rem 1rem;border-radius:.875rem;background:var(--btn)}
.tl-out>div{flex:1;min-width:0}
.tl-out code,.tl-row code{font:inherit;word-break:break-all}
.tl-out code{font-size:1.0625rem}
.tl-out small,.tl-row small{color:var(--dim);font-size:.6875rem}
textarea.tl-ta{width:100%;min-height:9rem;resize:vertical;padding:.75rem 1rem;background:var(--btn);color:var(--fg);border:0;border-radius:.875rem;font:inherit;font-size:.875rem;outline:none}
.tl-in{height:2.5rem;padding:0 .75rem;background:var(--btn);color:var(--fg);border:0;border-radius:.75rem;font:inherit;font-size:.875rem;outline:none;min-width:0;width:100%}
select.tl-in option{background:var(--panel)}
textarea.tl-ta:focus,.tl-in:focus{box-shadow:0 0 0 2px var(--focus)}
.tl-split{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.75rem}
.tl-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(8rem,1fr));gap:.5rem}
.tl-stat{padding:.75rem;border-radius:.875rem;background:var(--btn)}
.tl-stat b{display:block;font-size:1.375rem;font-weight:500;font-variant-numeric:tabular-nums}
.tl-stat small{color:var(--dim);font-size:.6875rem}
.tl-meter{height:.375rem;border-radius:.25rem;background:color-mix(in srgb,var(--fg) 16%,transparent);overflow:hidden}
.tl-meter i{display:block;height:100%;width:0;border-radius:inherit;background:#e5484d;transition:width .25s ease,background .25s}
.tl-big{font-size:2.5rem;font-weight:300;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.15}
.tl-rows{display:flex;flex-direction:column;gap:.375rem}
.tl-row{display:flex;gap:.5rem;align-items:center;padding:.375rem .375rem .375rem .75rem;border-radius:.75rem;background:var(--btn)}
.tl-row small{width:6.5rem;flex:none}
.tl-row code{flex:1;min-width:0;font-size:.8125rem}
.tl-row .btn{height:2rem;padding:0 .625rem}
.tl-pre{margin:0;padding:.875rem 1rem;border-radius:.875rem;background:var(--btn);font-size:.8125rem;white-space:pre-wrap;word-break:break-all}
.tl-chips{display:flex;gap:.5rem;flex-wrap:wrap}
.tl-chips button{padding:.375rem .75rem;border-radius:1rem;background:var(--btn);font-size:.8125rem;font-variant-numeric:tabular-nums}
.tl-chips button:hover{background:var(--btn-h)}
.tl-chips .n{padding:.375rem .75rem;border-radius:1rem;background:var(--btn);font-size:.9375rem;font-variant-numeric:tabular-nums}
.tl-card .btn,.tl-wrap .btn,#tl-home .btn,#tl-view .btn,.tl-row .btn,.tl-chips button{height:auto;min-height:2.5rem;max-width:100%;flex:0 1 auto;white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.25;padding-top:.4375rem;padding-bottom:.4375rem;text-align:center}
.tl-row .btn{min-height:2rem}
.tl-tile{overflow:visible;hyphens:auto}.tl-tile b,.tl-tile small{white-space:normal;text-align:center}
.tl-card .row,.tl-card .tl-chips{flex-wrap:wrap}
.tl-swatch{height:6rem;border-radius:1rem;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--fg) 14%,transparent)}
.tl-preview{position:relative;height:min(50vh,26rem);border-radius:.875rem;overflow:hidden;background:var(--card)}
.tl-preview iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
.tl-pop{animation:tl-pop .22s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes tl-pop{from{opacity:0;transform:scale(.92)}}
.tl-ok{color:#2f9e5f}.tl-bad{color:#e5484d}
@media (prefers-reduced-motion:reduce){.tl-pop{animation:none}.tl-meter i{transition:none}}
`;
  document.head.appendChild(style);

  /* ---------- helpers ---------- */
  const copy = async (text, btn) => {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove(); }
    if (btn) { const old = btn.dataset.l || btn.textContent; btn.dataset.l = old; btn.textContent = "copied"; clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = old; }, 1200); }
  };
  // a uniformly random whole number from 0 up to (but not including) n, using the browser's secure random generator
  function randBelow(n) {
    if (n <= 1) return 0;
    const N = BigInt(n), limit = (1n << 64n) - ((1n << 64n) % N);
    for (;;) { const b = crypto.getRandomValues(new BigUint64Array(1))[0]; if (b < limit) return Number(b % N); }
  }
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const rows = (el, list) => { // a list of "label  value  [copy]" rows
    el.innerHTML = list.map(([l, v]) => `<div class="tl-row"><small>${esc(l)}</small><code>${esc(v)}</code><button class="btn" type="button">copy</button></div>`).join("");
    el.querySelectorAll(".tl-row").forEach((r, i) => r.querySelector("button").addEventListener("click", (e) => copy(list[i][1], e.currentTarget)));
  };
  const toggle = (id, title, sub, on = true) => `<label class="switch"><div><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div><input type="checkbox" id="${id}"${on ? " checked" : ""}></label>`;

  /* ---------- tools ---------- */

  const ZONES = [
    ["United States · New York", "America/New_York"], ["United States · Chicago", "America/Chicago"], ["United States · Denver", "America/Denver"], ["United States · Los Angeles", "America/Los_Angeles"], ["United States · Anchorage", "America/Anchorage"], ["United States · Honolulu", "Pacific/Honolulu"],
    ["Canada · Toronto", "America/Toronto"], ["Canada · Vancouver", "America/Vancouver"], ["Mexico · Mexico City", "America/Mexico_City"], ["Colombia · Bogotá", "America/Bogota"], ["Peru · Lima", "America/Lima"], ["Chile · Santiago", "America/Santiago"], ["Brazil · São Paulo", "America/Sao_Paulo"], ["Argentina · Buenos Aires", "America/Argentina/Buenos_Aires"],
    ["United Kingdom · London", "Europe/London"], ["Ireland · Dublin", "Europe/Dublin"], ["Portugal · Lisbon", "Europe/Lisbon"], ["Spain · Madrid", "Europe/Madrid"], ["France · Paris", "Europe/Paris"], ["Germany · Berlin", "Europe/Berlin"], ["Italy · Rome", "Europe/Rome"], ["Netherlands · Amsterdam", "Europe/Amsterdam"], ["Sweden · Stockholm", "Europe/Stockholm"], ["Poland · Warsaw", "Europe/Warsaw"], ["Greece · Athens", "Europe/Athens"], ["Ukraine · Kyiv", "Europe/Kyiv"], ["Turkey · Istanbul", "Europe/Istanbul"], ["Russia · Moscow", "Europe/Moscow"],
    ["Egypt · Cairo", "Africa/Cairo"], ["Nigeria · Lagos", "Africa/Lagos"], ["Kenya · Nairobi", "Africa/Nairobi"], ["South Africa · Johannesburg", "Africa/Johannesburg"],
    ["Saudi Arabia · Riyadh", "Asia/Riyadh"], ["United Arab Emirates · Dubai", "Asia/Dubai"], ["Israel · Jerusalem", "Asia/Jerusalem"], ["Iran · Tehran", "Asia/Tehran"], ["Pakistan · Karachi", "Asia/Karachi"], ["India · Kolkata", "Asia/Kolkata"], ["Bangladesh · Dhaka", "Asia/Dhaka"],
    ["Thailand · Bangkok", "Asia/Bangkok"], ["Vietnam · Ho Chi Minh City", "Asia/Ho_Chi_Minh"], ["Indonesia · Jakarta", "Asia/Jakarta"], ["Malaysia · Kuala Lumpur", "Asia/Kuala_Lumpur"], ["Singapore", "Asia/Singapore"], ["Philippines · Manila", "Asia/Manila"], ["China · Shanghai", "Asia/Shanghai"], ["Hong Kong", "Asia/Hong_Kong"], ["Taiwan · Taipei", "Asia/Taipei"], ["South Korea · Seoul", "Asia/Seoul"], ["Japan · Tokyo", "Asia/Tokyo"],
    ["Australia · Perth", "Australia/Perth"], ["Australia · Sydney", "Australia/Sydney"], ["New Zealand · Auckland", "Pacific/Auckland"], ["UTC (universal time)", "UTC"],
  ];
  const ZONE_NAME = Object.fromEntries(ZONES.map(([l, z]) => [z, l]));
  const LOCAL_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
  const zoneLabel = (tz) => (tz === "local" ? "Your time zone · " + LOCAL_TZ.replace(/_/g, " ") : ZONE_NAME[tz] || tz.replace(/_/g, " "));
  const allZones = () => { try { return Intl.supportedValuesOf("timeZone"); } catch { return []; } };
  const validTz = (tz) => { try { new Intl.DateTimeFormat(undefined, { timeZone: tz }); return true; } catch { return false; } };


  // A box you can type in, or scroll through. Typing finds the closest match first (names, countries, nicknames, even small typos).
  const ALIASES = { "America/New_York": "usa us america eastern est edt nyc", "America/Chicago": "usa us america central cst", "America/Denver": "usa us america mountain mst", "America/Los_Angeles": "usa us america pacific pst la california", "Europe/London": "uk england britain great britain gmt", "Asia/Dubai": "uae emirates", "Asia/Seoul": "korea south korea", "Asia/Ho_Chi_Minh": "saigon vietnam", "Asia/Kolkata": "india calcutta ist delhi mumbai", "Asia/Shanghai": "china beijing", "Europe/Moscow": "russia", "Pacific/Auckland": "nz new zealand", "Australia/Sydney": "aus melbourne", "UTC": "utc gmt zulu universal" };
  const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const lev = (a, b) => { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };
  function score(q, c) { // higher is a closer match
    if (!q) return 0;
    const text = c.text, words = text.split(" ");
    if (norm(c.label) === q) return 100;
    let best = 0;
    if (text.startsWith(q)) best = 92;
    else if (words.some((w) => w.startsWith(q))) best = 84 - Math.min(10, words.findIndex((w) => w.startsWith(q)) * 2);
    else if (text.includes(q)) best = 66;
    else {
      const span = (str) => { let i = 0, first = -1, last = -1; for (let k = 0; k < str.length && i < q.length; k++) if (str[k] === q[i]) { if (first < 0) first = k; last = k; i++; } return i === q.length ? last - first + 1 : -1; };
      for (const w of words) { const sp = span(w); if (sp > 0) best = Math.max(best, 60 - (sp - q.length) * 3 - Math.max(0, w.length - sp)); } // the letters appear in order inside one word, like "tkyo" in "tokyo"
      const sp = span(text); if (sp > 0) best = Math.max(best, 44 - Math.min(20, sp - q.length));
    }
    for (const w of words) { const d = lev(q, w.slice(0, Math.max(q.length, 1))); if (d <= 2 && q.length > 2) best = Math.max(best, 40 - d * 8); }
    return best;
  }
  const offCache = new Map();
  function makeCombo(host, { candidates, current, placeholder, onPick, clearOnPick, offsetOf }) {
    host.innerHTML = '<input class="tl-in" type="text" spellcheck="false" autocomplete="off" role="combobox" aria-expanded="false"><div class="ck-list" role="listbox" hidden></div>';
    const input = host.querySelector("input"), list = host.querySelector(".ck-list");
    input.placeholder = placeholder || ""; const items = candidates.map((c) => ({ ...c, text: norm(c.label + " " + c.tz + " " + (ALIASES[c.tz] || "")) }));
    let shown = [], sel = 0, picked = current;
    const labelOf = (tz) => (items.find((c) => c.tz === tz) || { label: tz }).label;
    const setText = () => { input.value = clearOnPick ? "" : labelOf(picked); };
    function render() {
      const q = norm(input.value === labelOf(picked) && !clearOnPick ? "" : input.value);
      shown = q ? items.map((c) => ({ c, s: score(q, c) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 60).map((x) => x.c) : items;
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.innerHTML = shown.length ? shown.map((c, i) => `<div class="ck-opt${i === sel ? " on" : ""}" role="option" data-i="${i}"><span>${esc(c.label)}</span><small>${esc(offsetOf ? offsetOf(c.tz) : "")}</small></div>`).join("") : '<div class="ck-none">no match. try another spelling.</div>';
    }
    const open = () => { list.hidden = false; input.setAttribute("aria-expanded", "true"); render(); const on = list.querySelector(".ck-opt.on"); if (on) on.scrollIntoView({ block: "nearest" }); };
    const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); setText(); };
    const choose = (i) => { const c = shown[i]; if (!c) return; picked = c.tz; list.hidden = true; input.setAttribute("aria-expanded", "false"); setText(); input.blur(); onPick(c.tz); };
    input.addEventListener("focus", () => { input.select(); sel = Math.max(0, items.findIndex((c) => c.tz === picked)); if (clearOnPick) sel = 0; open(); });
    input.addEventListener("input", () => { sel = 0; open(); list.scrollTop = 0; });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (list.hidden) open(); else { sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % Math.max(1, shown.length); render(); const on = list.querySelector(".ck-opt.on"); if (on) on.scrollIntoView({ block: "nearest" }); } }
      else if (e.key === "Enter") { e.preventDefault(); choose(sel); }
      else if (e.key === "Escape") { close(); input.blur(); }
    });
    list.addEventListener("pointerdown", (e) => { e.preventDefault(); const o = e.target.closest("[data-i]"); if (o) choose(+o.dataset.i); }); // pointerdown, so the box doesn't close before the click lands
    input.addEventListener("blur", () => setTimeout(close, 120));
    setText();
    return { set(tz) { picked = tz; setText(); } };
  }

  function mountClock(root, own) {
    const store = (k, d) => { try { return JSON.parse(NV.LS.get("nexvelo.clock." + k, "null")) ?? d; } catch { return d; } };
    const put = (k, v) => NV.LS.set("nexvelo.clock." + k, JSON.stringify(v));
    let main = store("main", "local"), list = store("list", ["America/New_York", "Europe/London", "Asia/Tokyo"]).filter(validTz), h24 = store("h24", NV.settings.h24 !== false);
    if (main !== "local" && !validTz(main)) main = "local";
    const ticks = Array.from({ length: 12 }, (_, i) => `<line x1="50" y1="6" x2="50" y2="${i % 3 ? 9.5 : 12}" transform="rotate(${i * 30} 50 50)" stroke="var(--fg)" stroke-width="${i % 3 ? .8 : 1.6}" opacity=".55"/>`).join("");
    root.innerHTML = `<div class="tl-card">
<svg viewBox="0 0 100 100" width="168" height="168" role="img" aria-label="Analog clock" style="align-self:center"><circle cx="50" cy="50" r="47" fill="var(--btn)" stroke="color-mix(in srgb,var(--fg) 22%,transparent)"/>${ticks}
<line id="ck-h" x1="50" y1="50" x2="50" y2="29" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round"/><line id="ck-m" x1="50" y1="50" x2="50" y2="17" stroke="var(--fg)" stroke-width="2.2" stroke-linecap="round"/><line id="ck-s" x1="50" y1="56" x2="50" y2="12" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/><circle cx="50" cy="50" r="2.6" fill="var(--accent)"/></svg>
<div><div class="tl-big" id="ck-time"></div><div id="ck-date" style="margin-top:.25rem"></div><small id="ck-diff" style="color:var(--dim)"></small></div>
<div class="fld"><span>show the time in</span><div class="ck-combo" id="ck-main"></div></div>
<div>${toggle("ck-24", "24-hour clock", "", h24)}</div>
<div class="fld"><span>add another country or city</span><div class="ck-combo" id="ck-add"></div></div>
<div class="tl-rows" id="ck-list"></div></div>`;
    const q = (s) => root.querySelector(s);
    const dtf = (tz, o) => new Intl.DateTimeFormat(undefined, { timeZone: tz === "local" ? undefined : tz, ...o });
    const hm = (d, tz, secs) => dtf(tz, { hour: "2-digit", minute: "2-digit", second: secs ? "2-digit" : undefined, hour12: !h24 }).format(d);
    const ymd = (d, tz) => { const p = Object.fromEntries(dtf(tz, { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d).map((x) => [x.type, +x.value])); return Date.UTC(p.year, p.month - 1, p.day) / 864e5; };
    const offset = (d, tz) => { try { const v = new Intl.DateTimeFormat("en-US", { timeZone: tz === "local" ? LOCAL_TZ : tz, timeZoneName: "longOffset" }).formatToParts(d).find((x) => x.type === "timeZoneName").value, m = v.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/); return m ? (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 0; } catch { return 0; } };
    const diffText = (d, tz) => {
      const dm = offset(d, tz) - offset(d, "local"), dd = ymd(d, tz) - ymd(d, "local");
      const hrs = Math.abs(dm) / 60, nice = Number.isInteger(hrs) ? hrs : hrs.toFixed(2).replace(/0$/, "");
      const base = dm === 0 ? "same time as you" : nice + (hrs === 1 ? " hour " : " hours ") + (dm > 0 ? "ahead of you" : "behind you");
      return base + (dd > 0 ? " · tomorrow" : dd < 0 ? " · yesterday" : "");
    };
    const utcLabel = (d, tz) => { const m = offset(d, tz); return "UTC" + (m < 0 ? "-" : "+") + pad(Math.floor(Math.abs(m) / 60)) + ":" + pad(Math.abs(m) % 60); };
    function paint() {
      const d = new Date(), P = Object.fromEntries(dtf(main, { hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, +x.value]));
      const hh = P.hour % 12 + P.minute / 60, set = (id, deg) => q(id).setAttribute("transform", `rotate(${deg} 50 50)`);
      set("#ck-h", hh * 30); set("#ck-m", (P.minute + P.second / 60) * 6); set("#ck-s", P.second * 6);
      q("#ck-time").textContent = hm(d, main, true);
      q("#ck-date").textContent = dtf(main, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
      q("#ck-diff").textContent = zoneLabel(main) + " · " + utcLabel(d, main) + (main === "local" ? "" : " · " + diffText(d, main));
      q("#ck-list").innerHTML = list.map((tz, i) => `<div class="tl-row ck-row"><div class="ck-name"><b style="font-weight:500">${esc(zoneLabel(tz))}</b><span class="ck-sub">${esc(dtf(tz, { weekday: "short", day: "numeric", month: "short" }).format(d))} · ${esc(utcLabel(d, tz))} · ${esc(diffText(d, tz))}</span></div><code class="ck-t">${esc(hm(d, tz, false))}</code><button class="btn" type="button" data-rm="${i}" aria-label="Remove ${esc(zoneLabel(tz))}">remove</button></div>`).join("") || '<small style="color:var(--dim)">no other places yet. pick one above.</small>';
    }
    q("#ck-24").addEventListener("change", (e) => { h24 = e.target.checked; put("h24", h24); paint(); });
    q("#ck-list").addEventListener("click", (e) => { const b = e.target.closest("[data-rm]"); if (b) { list.splice(+b.dataset.rm, 1); put("list", list); paint(); } });
    const known = new Set(ZONES.map((z) => z[1]));
    const everyZone = [...ZONES.map(([label, tz]) => ({ label, tz })), ...allZones().filter((z) => !known.has(z)).map((z) => ({ label: z.replace(/_/g, " "), tz: z }))];
    const offsetOf = (tz) => { const k = tz + ":" + Math.floor(Date.now() / 60000); if (!offCache.has(k)) { if (offCache.size > 2000) offCache.clear(); offCache.set(k, utcLabel(new Date(), tz)); } return offCache.get(k); };
    makeCombo(q("#ck-main"), { candidates: [{ label: zoneLabel("local"), tz: "local" }, ...everyZone], current: main, placeholder: "type a country or city, or scroll", offsetOf, onPick: (tz) => { main = tz; put("main", main); paint(); } });
    makeCombo(q("#ck-add"), { candidates: everyZone, current: "", clearOnPick: true, placeholder: "type a country or city, or scroll", offsetOf, onPick: (tz) => { if (!list.includes(tz)) { list.push(tz); put("list", list); paint(); } } });
    paint(); const id = setInterval(paint, 500); own.push(() => clearInterval(id));
  }

  function mountPassword(root) {
    root.innerHTML = `<div class="tl-card">
<div class="tl-out"><div><code id="pw-out"></code></div><button class="btn" id="pw-copy">copy</button></div>
<div class="tl-meter"><i id="pw-bar"></i></div><small id="pw-note" style="color:var(--dim)"></small>
<label class="fld"><span>length: <b id="pw-n">16</b></span><input type="range" id="pw-len" min="4" max="128" value="16"></label>
<div>${toggle("pw-up", "uppercase", "A to Z")}${toggle("pw-low", "lowercase", "a to z")}${toggle("pw-num", "numbers", "0 to 9")}${toggle("pw-sym", "symbols", "! @ # $ and more")}${toggle("pw-look", "avoid look-alikes", "leaves out 0 O I l 1", false)}</div>
<div class="row"><button class="btn primary" id="pw-gen">generate new</button></div></div>`;
    const q = (s) => root.querySelector(s);
    const SETS = { up: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", low: "abcdefghijklmnopqrstuvwxyz", num: "0123456789", sym: "!@#$%^&*()-_=+[]{};:,.<>?/~" };
    let pw = "";
    function gen() {
      const len = +q("#pw-len").value; q("#pw-n").textContent = len;
      const sets = ["up", "low", "num", "sym"].filter((k) => q("#pw-" + k).checked).map((k) => (q("#pw-look").checked ? SETS[k].replace(/[0OIl1]/g, "") : SETS[k]));
      if (!sets.length) { pw = ""; q("#pw-out").textContent = "pick at least one kind of character"; q("#pw-bar").style.width = "0"; q("#pw-note").textContent = ""; return; }
      const pool = sets.join(""), out = sets.map((s) => s[randBelow(s.length)]); // at least one of every kind that is turned on
      while (out.length < len) out.push(pool[randBelow(pool.length)]);
      for (let i = out.length - 1; i > 0; i--) { const j = randBelow(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
      pw = out.slice(0, len).join(""); q("#pw-out").textContent = pw;
      const bits = Math.round(len * Math.log2(pool.length));
      const [label, color] = bits < 40 ? ["weak", "#e5484d"] : bits < 60 ? ["fair", "#d9a21b"] : bits < 80 ? ["strong", "#2fa862"] : ["very strong", "#2fa862"];
      q("#pw-bar").style.width = Math.min(100, bits / 1.28) + "%"; q("#pw-bar").style.background = color;
      q("#pw-note").textContent = label + " · about " + bits + " bits of randomness";
    }
    root.addEventListener("input", (e) => { if (e.target.id !== "pw-out") gen(); });
    q("#pw-gen").addEventListener("click", gen);
    q("#pw-copy").addEventListener("click", (e) => pw && copy(pw, e.currentTarget));
    gen();
  }

  function mountRandom(root) {
    root.innerHTML = `<div class="tl-card">
<div class="tl-split"><label class="fld"><span>smallest number</span><input class="tl-in" id="rn-min" type="number" value="1" step="1"></label>
<label class="fld"><span>largest number</span><input class="tl-in" id="rn-max" type="number" value="100" step="1"></label>
<label class="fld"><span>how many</span><input class="tl-in" id="rn-cnt" type="number" value="1" min="1" max="1000" step="1"></label></div>
<div class="tl-chips" id="rn-pre"></div>
<div>${toggle("rn-uni", "no repeats", "every number appears once", false)}${toggle("rn-sort", "sort the results", "smallest first", false)}</div>
<div class="row"><button class="btn primary" id="rn-go">generate</button><button class="btn" id="rn-copy">copy</button></div>
<div id="rn-out"></div><small id="rn-note" style="color:var(--dim)"></small></div>`;
    const q = (s) => root.querySelector(s); let last = [];
    q("#rn-pre").innerHTML = [["up to 10", 10], ["up to 100", 100], ["up to 1,000", 1000], ["up to 1,000,000", 1e6], ["dice (1-6)", 6]].map(([l, v]) => `<button type="button" data-v="${v}">${l}</button>`).join("");
    q("#rn-pre").addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (!b) return; q("#rn-min").value = 1; q("#rn-max").value = b.dataset.v; gen(); });
    function gen() {
      const min = Math.trunc(+q("#rn-min").value), max = Math.trunc(+q("#rn-max").value), cnt = Math.max(1, Math.min(1000, Math.trunc(+q("#rn-cnt").value) || 1));
      const note = q("#rn-note"); note.textContent = "";
      if (![min, max].every(Number.isSafeInteger)) { note.textContent = "use whole numbers up to 9,007,199,254,740,991."; return; }
      if (max < min) { note.textContent = "the largest number has to be at least the smallest."; return; }
      const range = max - min + 1;
      if (!Number.isSafeInteger(range)) { note.textContent = "that range is too wide. use a smaller one."; return; }
      if (q("#rn-uni").checked && cnt > range) { note.textContent = "you asked for " + cnt + " different numbers, but there are only " + range + " between " + min + " and " + max + "."; return; }
      let out = [];
      if (q("#rn-uni").checked) {
        if (range <= 200000) { const all = Array.from({ length: range }, (_, i) => min + i); for (let i = 0; i < cnt; i++) { const j = i + randBelow(range - i); [all[i], all[j]] = [all[j], all[i]]; out.push(all[i]); } }
        else { const seen = new Set(); while (seen.size < cnt) seen.add(min + randBelow(range)); out = [...seen]; }
      } else for (let i = 0; i < cnt; i++) out.push(min + randBelow(range));
      if (q("#rn-sort").checked) out.sort((a, b) => a - b);
      last = out;
      q("#rn-out").innerHTML = out.length === 1 ? `<div class="tl-big tl-pop">${out[0].toLocaleString()}</div>` : `<div class="tl-chips tl-pop">${out.map((n) => `<span class="n">${n.toLocaleString()}</span>`).join("")}</div>`;
      if (out.length > 1) note.textContent = "sum " + out.reduce((a, b) => a + b, 0).toLocaleString() + " · average " + (out.reduce((a, b) => a + b, 0) / out.length).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    q("#rn-go").addEventListener("click", gen);
    q("#rn-copy").addEventListener("click", (e) => last.length && copy(last.join(", "), e.currentTarget));
    gen();
  }

  const STOP = new Set("the a an and or but of to in on at for with is are was were be been it its this that as by from not no i you he she we they them his her our your my me do does did have has had will would can could so if then than there here what which who".split(" "));
  function mountWords(root) {
    root.innerHTML = `<div class="tl-card"><textarea class="tl-ta" id="wc-in" placeholder="type or paste your text here" style="min-height:11rem"></textarea>
<div class="tl-stats" id="wc-stats"></div><div id="wc-top"></div></div>`;
    const q = (s) => root.querySelector(s);
    function update() {
      const t = q("#wc-in").value, words = t.trim() ? t.trim().split(/\s+/) : [];
      const sentences = (t.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).filter((s) => /\w/.test(s)).length;
      const paras = t.split(/\n\s*\n/).filter((p) => p.trim()).length;
      const mins = (n) => (n < 1 ? "under a minute" : Math.round(n) + " min");
      q("#wc-stats").innerHTML = [["words", words.length], ["characters", t.length], ["no spaces", t.replace(/\s/g, "").length], ["sentences", sentences], ["paragraphs", paras], ["reading time", mins(words.length / 200)], ["speaking time", mins(words.length / 130)]]
        .map(([l, v]) => `<div class="tl-stat"><b>${typeof v === "number" ? v.toLocaleString() : v}</b><small>${l}</small></div>`).join("");
      const freq = new Map();
      for (const w of words) { const k = w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""); if (k.length > 2 && !STOP.has(k)) freq.set(k, (freq.get(k) || 0) + 1); }
      const top = [...freq].sort((a, b) => b[1] - a[1]).slice(0, 8);
      q("#wc-top").innerHTML = top.length ? `<small style="color:var(--dim)">most used words</small><div class="tl-chips" style="margin-top:.375rem">${top.map(([w, n]) => `<span class="n">${esc(w)} <small style="color:var(--dim)">${n}</small></span>`).join("")}</div>` : "";
    }
    q("#wc-in").addEventListener("input", update); update();
  }

  function mountTime(root, own) {
    root.innerHTML = `<div class="tl-card">
<div class="tl-out"><div><small>now, in unix seconds</small><div class="tl-big" id="ts-now"></div></div><button class="btn" id="ts-copy">copy</button></div>
<label class="fld"><span>unix timestamp (seconds or milliseconds)</span><input class="tl-in" id="ts-in" type="text" inputmode="numeric" placeholder="1700000000" autocomplete="off"></label>
<div class="tl-rows" id="ts-res"></div>
<label class="fld"><span>date and time to unix timestamp</span><input class="tl-in" id="ts-dt" type="datetime-local" step="1"></label>
<label class="chk"><input type="checkbox" id="ts-utc"> treat that date and time as UTC</label>
<div class="tl-rows" id="ts-res2"></div></div>`;
    const q = (s) => root.querySelector(s);
    const tick = () => { q("#ts-now").textContent = Math.floor(Date.now() / 1000); };
    tick(); own.push(clearInterval.bind(null, setInterval(tick, 1000)));
    q("#ts-copy").addEventListener("click", (e) => copy(String(Math.floor(Date.now() / 1000)), e.currentTarget));
    const rel = (ms) => {
      const d = (ms - Date.now()) / 1000, f = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
      for (const [u, s] of [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]]) if (Math.abs(d) >= s) return f.format(Math.round(d / s), u);
      return f.format(Math.round(d), "second");
    };
    q("#ts-in").addEventListener("input", () => {
      const raw = q("#ts-in").value.trim().replace(/[, _]/g, "");
      if (!raw) { q("#ts-res").innerHTML = ""; return; }
      const n = Number(raw); if (!Number.isFinite(n)) { q("#ts-res").innerHTML = '<small class="tl-bad">that is not a number.</small>'; return; }
      const ms = Math.abs(n) >= 1e11 ? n : n * 1000, d = new Date(ms);
      if (isNaN(d)) { q("#ts-res").innerHTML = '<small class="tl-bad">that is outside the dates a browser can show.</small>'; return; }
      rows(q("#ts-res"), [["read as", Math.abs(n) >= 1e11 ? "milliseconds" : "seconds"], ["ISO 8601 (UTC)", d.toISOString()], ["UTC", d.toUTCString()], ["your time", d.toString()], ["relative", rel(ms)], ["unix seconds", String(Math.floor(ms / 1000))], ["unix milliseconds", String(ms)]]);
    });
    const fromDate = () => {
      let v = q("#ts-dt").value; if (!v) { q("#ts-res2").innerHTML = ""; return; }
      if (v.length === 16) v += ":00";
      const ms = q("#ts-utc").checked ? Date.parse(v + "Z") : new Date(v).getTime();
      if (isNaN(ms)) { q("#ts-res2").innerHTML = ""; return; }
      rows(q("#ts-res2"), [["unix seconds", String(Math.floor(ms / 1000))], ["unix milliseconds", String(ms)], ["ISO 8601 (UTC)", new Date(ms).toISOString()]]);
    };
    q("#ts-dt").addEventListener("input", fromDate); q("#ts-utc").addEventListener("change", fromDate);
  }

  function mountColour(root) {
    root.innerHTML = `<div class="tl-card"><div class="tl-swatch" id="cl-sw"></div>
<div class="row"><input type="color" id="cl-pick" value="#4f86f7" style="width:3.5rem;height:2.5rem;border:0;border-radius:.625rem;background:var(--btn);padding:.25rem;cursor:pointer"><input class="tl-in" id="cl-in" type="text" value="#4f86f7" spellcheck="false" autocomplete="off" placeholder="#4f86f7, rgb(79,134,247), hsl(…) or a name like coral" style="flex:1"></div>
<small id="cl-err" class="tl-bad"></small><div class="tl-rows" id="cl-res"></div><div class="tl-stats" id="cl-con"></div></div>`;
    const q = (s) => root.querySelector(s);
    // The browser's canvas turns any CSS colour (hex, rgb(), hsl(), names like coral) into a standard form. A colour it doesn't understand leaves the value unchanged.
    const cx = document.createElement("canvas").getContext("2d");
    const parse = (str) => {
      let v = "";
      for (const sentinel of ["#010203", "#040506"]) { cx.fillStyle = sentinel; cx.fillStyle = str; if (cx.fillStyle !== sentinel) { v = cx.fillStyle; break; } }
      if (!v) return null;
      if (v[0] === "#") return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
      const m = v.match(/(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/);
      return m ? [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])] : null;
    };
    const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => pad(v.toString(16))).join("");
    const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0; if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; } return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]; };
    const hsv = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; } return [Math.round(h), Math.round(mx ? (d / mx) * 100 : 0), Math.round(mx * 100)]; };
    const cmyk = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const k = 1 - Math.max(r, g, b); if (k === 1) return [0, 0, 0, 100]; return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map((v) => Math.round(v * 100)); };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    function show(c) {
      const h = hex(c); q("#cl-sw").style.background = h; q("#cl-pick").value = h; q("#cl-err").textContent = "";
      rows(q("#cl-res"), [["hex", h], ["rgb", `rgb(${c.join(", ")})`], ["hsl", `hsl(${hsl(c)[0]}, ${hsl(c)[1]}%, ${hsl(c)[2]}%)`], ["hsv", `hsv(${hsv(c)[0]}, ${hsv(c)[1]}%, ${hsv(c)[2]}%)`], ["cmyk", `cmyk(${cmyk(c).join("%, ")}%)`]]);
      q("#cl-con").innerHTML = [["white text", [255, 255, 255]], ["black text", [0, 0, 0]]].map(([l, o]) => { const r = ratio(c, o); return `<div class="tl-stat"><b>${r.toFixed(2)}:1</b><small>${l} · ${r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA large only" : "fails"}</small></div>`; }).join("");
    }
    q("#cl-in").addEventListener("input", () => { const c = parse(q("#cl-in").value.trim()); if (c) show(c); else q("#cl-err").textContent = q("#cl-in").value.trim() ? "that isn't a colour the browser understands." : ""; });
    q("#cl-pick").addEventListener("input", () => { q("#cl-in").value = q("#cl-pick").value; show(parse(q("#cl-pick").value)); });
    show(parse("#4f86f7"));
  }

  function mountIframe(root) {
    root.innerHTML = `<div class="tl-card">
<label class="fld"><span>website address</span><input class="tl-in" id="if-url" type="text" placeholder="https://example.com" spellcheck="false" autocomplete="off" autocapitalize="off"></label>
<div class="tl-split"><label class="fld"><span>width</span><input class="tl-in" id="if-w" type="text" value="100%"></label><label class="fld"><span>height</span><input class="tl-in" id="if-h" type="text" value="600"></label></div>
<label class="fld"><span>title (for screen readers)</span><input class="tl-in" id="if-t" type="text" placeholder="what the page is"></label>
<div>${toggle("if-fs", "allow fullscreen", "adds the allowfullscreen attribute")}${toggle("if-lazy", "load lazily", "loads the page only when it scrolls into view")}${toggle("if-border", "no border", "removes the default frame border")}${toggle("if-sb", "sandbox", "limits what the page can do (scripts and same-origin stay on)", false)}</div>
<small style="color:var(--dim)">the code to paste into your own page</small><pre class="tl-pre" id="if-code"></pre>
<div class="row"><button class="btn primary" id="if-copy">copy code</button><button class="btn" id="if-prev">preview through the proxy</button><button class="btn" id="if-open">open in a tab</button></div>
<small style="color:var(--dim)">some websites tell browsers not to show them inside another page. the code is still correct, but those sites will stay blank on yours. the preview here goes through the proxy, so it can show pages your own browser would block.</small>
<div class="tl-preview" id="if-box" hidden></div></div>`;
    const q = (s) => root.querySelector(s);
    const url = () => { let u = q("#if-url").value.trim(); if (u && !/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = "https://" + u; return u; };
    const dim = (v, d) => { v = v.trim() || d; return /^\d+(\.\d+)?(px|%|vh|vw|em|rem)?$/i.test(v) ? v.replace(/px$/i, "") : d; };
    const code = () => {
      const u = url(); if (!u) return "";
      const a = [`src="${u.replace(/"/g, "&quot;")}"`, `width="${dim(q("#if-w").value, "100%")}"`, `height="${dim(q("#if-h").value, "600")}"`];
      const t = q("#if-t").value.trim(); if (t) a.push(`title="${t.replace(/"/g, "&quot;")}"`);
      if (q("#if-border").checked) a.push('style="border:0"');
      if (q("#if-lazy").checked) a.push('loading="lazy"');
      if (q("#if-sb").checked) a.push('sandbox="allow-scripts allow-same-origin allow-forms allow-popups"');
      if (q("#if-fs").checked) a.push("allowfullscreen");
      return "<iframe " + a.join(" ") + "></iframe>";
    };
    const refresh = () => { q("#if-code").textContent = code() || "type a website address above"; };
    root.addEventListener("input", refresh); root.addEventListener("change", refresh); refresh();
    q("#if-copy").addEventListener("click", (e) => code() && copy(code(), e.currentTarget));
    q("#if-open").addEventListener("click", () => url() && NV.openUrl(url()));
    q("#if-prev").addEventListener("click", async () => {
      const u = url(); if (!u) return;
      const box = q("#if-box"); box.hidden = false; box.innerHTML = '<div class="msg">loading the preview…</div>';
      let f; try { f = await NV.proxyFrame(u); } catch { f = document.createElement("iframe"); f.src = u; }
      box.innerHTML = ""; box.appendChild(f);
    });
  }

  function mountCase(root) {
    root.innerHTML = `<div class="tl-card"><textarea class="tl-ta" id="cs-in" placeholder="type or paste text here"></textarea>
<div class="tl-chips" id="cs-btns"></div><textarea class="tl-ta" id="cs-out" readonly placeholder="the result shows up here"></textarea><div class="row"><button class="btn" id="cs-copy">copy result</button></div></div>`;
    const q = (s) => root.querySelector(s);
    const words = (s) => s.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g) || [];
    const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    const MODES = [
      ["UPPER CASE", (s) => s.toUpperCase()], ["lower case", (s) => s.toLowerCase()],
      ["Title Case", (s) => s.toLowerCase().replace(/(^|[\s\-(["'])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())],
      ["Sentence case", (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())],
      ["camelCase", (s) => { const w = words(s); return w.map((x, i) => (i ? cap(x) : x.toLowerCase())).join(""); }], ["PascalCase", (s) => words(s).map(cap).join("")],
      ["snake_case", (s) => words(s).map((x) => x.toLowerCase()).join("_")], ["kebab-case", (s) => words(s).map((x) => x.toLowerCase()).join("-")], ["CONSTANT_CASE", (s) => words(s).map((x) => x.toUpperCase()).join("_")],
      ["aLtErNaTiNg", (s) => [...s].map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join("")], ["reverse", (s) => [...s].reverse().join("")],
    ];
    q("#cs-btns").innerHTML = MODES.map(([l], i) => `<button type="button" data-i="${i}">${esc(l)}</button>`).join("");
    q("#cs-btns").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) q("#cs-out").value = MODES[+b.dataset.i][1](q("#cs-in").value); });
    q("#cs-copy").addEventListener("click", (e) => copy(q("#cs-out").value, e.currentTarget));
  }

  function mountEncode(root) {
    root.innerHTML = `<div class="tl-card"><select class="tl-in" id="en-mode"><option value="b64e">text to Base64</option><option value="b64d">Base64 to text</option><option value="ue">URL encode</option><option value="ud">URL decode</option></select>
<textarea class="tl-ta" id="en-in" placeholder="type or paste here"></textarea><div class="row"><button class="btn primary" id="en-go">convert</button><button class="btn" id="en-copy">copy result</button></div>
<small id="en-err" class="tl-bad"></small><textarea class="tl-ta" id="en-out" readonly placeholder="the result shows up here"></textarea></div>`;
    const q = (s) => root.querySelector(s);
    const b64e = (s) => { const u = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(bin); };
    const b64d = (s) => { let t = s.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; const bin = atob(t); return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); };
    const FN = { b64e, b64d, ue: encodeURIComponent, ud: decodeURIComponent };
    const run = () => { q("#en-err").textContent = ""; try { q("#en-out").value = FN[q("#en-mode").value](q("#en-in").value); } catch { q("#en-out").value = ""; q("#en-err").textContent = "that isn't valid for this conversion."; } };
    q("#en-go").addEventListener("click", run); q("#en-in").addEventListener("input", run); q("#en-mode").addEventListener("change", run);
    q("#en-copy").addEventListener("click", (e) => copy(q("#en-out").value, e.currentTarget));
  }

  function mountJson(root) {
    root.innerHTML = `<div class="tl-card"><textarea class="tl-ta" id="js-in" placeholder='paste JSON here, like {"name":"Nex"}' style="min-height:11rem;font-family:inherit"></textarea>
<div class="row"><button class="btn primary" id="js-fmt">format</button><button class="btn" id="js-min">minify</button><button class="btn" id="js-copy">copy result</button></div>
<small id="js-msg"></small><textarea class="tl-ta" id="js-out" readonly placeholder="the result shows up here" style="min-height:11rem"></textarea></div>`;
    const q = (s) => root.querySelector(s);
    const run = (indent) => {
      const m = q("#js-msg"), t = q("#js-in").value.trim(); if (!t) { m.textContent = ""; q("#js-out").value = ""; return; }
      try { q("#js-out").value = JSON.stringify(JSON.parse(t), null, indent); m.className = "tl-ok"; m.textContent = "valid JSON"; }
      catch (e) { q("#js-out").value = ""; m.className = "tl-bad"; m.textContent = String(e.message || e); }
    };
    q("#js-fmt").addEventListener("click", () => run(2)); q("#js-min").addEventListener("click", () => run(0));
    q("#js-copy").addEventListener("click", (e) => copy(q("#js-out").value, e.currentTarget));
  }

  function mountDice(root) {
    root.innerHTML = `<div class="tl-card"><div class="tl-split"><label class="fld"><span>dice</span><input class="tl-in" id="dc-n" type="number" min="1" max="20" value="2"></label>
<label class="fld"><span>sides</span><select class="tl-in" id="dc-s">${[4, 6, 8, 10, 12, 20, 100].map((s) => `<option${s === 6 ? " selected" : ""}>${s}</option>`).join("")}</select></label></div>
<div class="row"><button class="btn primary" id="dc-roll">roll</button><button class="btn" id="dc-coin">flip a coin</button></div><div id="dc-out"></div></div>`;
    const q = (s) => root.querySelector(s);
    q("#dc-roll").addEventListener("click", () => {
      const n = Math.max(1, Math.min(20, Math.trunc(+q("#dc-n").value) || 1)), s = +q("#dc-s").value, r = Array.from({ length: n }, () => 1 + randBelow(s));
      q("#dc-out").innerHTML = `<div class="tl-chips tl-pop">${r.map((v) => `<span class="n">${v}</span>`).join("")}</div>` + (n > 1 ? `<div class="tl-big tl-pop" style="margin-top:.5rem">${r.reduce((a, b) => a + b, 0)}</div><small style="color:var(--dim)">total</small>` : "");
    });
    q("#dc-coin").addEventListener("click", () => { q("#dc-out").innerHTML = `<div class="tl-big tl-pop">${randBelow(2) ? "heads" : "tails"}</div>`; });
  }

  // The stopwatch and the timer keep running when you leave this tool, and the timer still beeps when it finishes.
  const SW = { run: false, t0: 0, acc: 0, laps: [] }, TM = { run: false, end: 0, left: 300000, total: 300000, done: false };
  let paintTimers = null, ticker = 0;
  const swMs = () => SW.acc + (SW.run ? Date.now() - SW.t0 : 0);
  const clock = (ms, cs) => { const t = Math.floor(ms / 10), h = Math.floor(t / 360000), m = Math.floor(t / 6000) % 60, s = Math.floor(t / 100) % 60; return (h ? h + ":" : "") + pad(m) + ":" + pad(s) + (cs ? "." + pad(t % 100) : ""); };
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, .3, .6].forEach((d) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; g.gain.value = .15; o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + .18); });
      setTimeout(() => ctx.close(), 1500);
    } catch {}
  }
  function ensureTicker() {
    if (ticker) return;
    ticker = setInterval(() => {
      if (TM.run) { TM.left = Math.max(0, TM.end - Date.now()); if (!TM.left) { TM.run = false; TM.done = true; beep(); NV.toast("timer finished"); } }
      if (paintTimers) paintTimers();
      if (!SW.run && !TM.run) { clearInterval(ticker); ticker = 0; }
    }, 50);
  }
  function mountTimer(root, own) {
    root.innerHTML = `<div class="tl-card"><div class="tl-out"><div><small>stopwatch</small><div class="tl-big" id="sw-t">00:00.00</div></div><button class="btn primary" id="sw-go">start</button><button class="btn" id="sw-lap">lap</button><button class="btn" id="sw-reset">reset</button></div><div class="tl-rows" id="sw-laps"></div>
<div class="tl-out"><div><small>timer</small><div class="tl-big" id="tm-t">05:00</div></div><button class="btn primary" id="tm-go">start</button><button class="btn" id="tm-reset">reset</button></div>
<div class="tl-split"><label class="fld"><span>hours</span><input class="tl-in" id="tm-h" type="number" min="0" max="99" value="0"></label><label class="fld"><span>minutes</span><input class="tl-in" id="tm-m" type="number" min="0" max="999" value="5"></label><label class="fld"><span>seconds</span><input class="tl-in" id="tm-s" type="number" min="0" max="59" value="0"></label></div>
<div class="tl-chips" id="tm-pre">${[1, 5, 10, 25, 45].map((m) => `<button type="button" data-m="${m}">${m} min</button>`).join("")}</div><div class="tl-meter"><i id="tm-bar"></i></div></div>`;
    const q = (s) => root.querySelector(s);
    const paint = () => {
      q("#sw-t").textContent = clock(swMs(), true); q("#sw-go").textContent = SW.run ? "stop" : swMs() ? "resume" : "start";
      q("#tm-t").textContent = clock(Math.ceil(TM.left / 1000) * 1000); q("#tm-go").textContent = TM.run ? "pause" : TM.done ? "restart" : TM.left < TM.total ? "resume" : "start";
      q("#tm-bar").style.width = (TM.total ? (1 - TM.left / TM.total) * 100 : 0) + "%"; q("#tm-bar").style.background = TM.done ? "#2fa862" : "var(--accent)";
      q("#sw-laps").innerHTML = SW.laps.slice().reverse().map((l, i) => `<div class="tl-row"><small>lap ${SW.laps.length - i}</small><code>${clock(l.split, true)}</code><code style="text-align:right;color:var(--dim)">${clock(l.total, true)}</code></div>`).join("");
    };
    const read = () => (Math.max(0, +q("#tm-h").value || 0) * 3600 + Math.max(0, +q("#tm-m").value || 0) * 60 + Math.max(0, +q("#tm-s").value || 0)) * 1000;
    q("#sw-go").addEventListener("click", () => { if (SW.run) { SW.acc += Date.now() - SW.t0; SW.run = false; } else { SW.t0 = Date.now(); SW.run = true; ensureTicker(); } paint(); });
    q("#sw-lap").addEventListener("click", () => { if (!swMs()) return; const t = swMs(), prev = SW.laps.length ? SW.laps[SW.laps.length - 1].total : 0; SW.laps.push({ total: t, split: t - prev }); paint(); });
    q("#sw-reset").addEventListener("click", () => { SW.run = false; SW.acc = 0; SW.laps = []; paint(); });
    q("#tm-go").addEventListener("click", () => {
      if (TM.run) { TM.run = false; TM.left = Math.max(0, TM.end - Date.now()); }
      else { if (TM.done || !TM.left || TM.left >= TM.total) { TM.total = TM.left = read(); } if (!TM.left) return; TM.done = false; TM.end = Date.now() + TM.left; TM.run = true; ensureTicker(); }
      paint();
    });
    q("#tm-reset").addEventListener("click", () => { TM.run = false; TM.done = false; TM.total = TM.left = read(); paint(); });
    q("#tm-pre").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; q("#tm-h").value = 0; q("#tm-m").value = b.dataset.m; q("#tm-s").value = 0; TM.run = false; TM.done = false; TM.total = TM.left = read(); paint(); });
    paintTimers = paint; own.push(() => { if (paintTimers === paint) paintTimers = null; });
    paint(); if (SW.run || TM.run) ensureTicker();
  }

  /* ---------- the page: a grid of tools, and one tool at a time ---------- */
  const IC = {
    password: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    random: '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>',
    words: '<path d="M4 6h16M4 12h10M4 18h13"/>',
    time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5V12l4 2M12 3v1.2M21 12h-1.2M12 21v-1.2M3 12h1.2"/>',
    colour: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4A9 9 0 0 0 12 3z"/><path d="M7.5 11h.01M10 7.5h.01M14 7.5h.01"/>',
    iframe: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    case: '<path d="M3 18l4.5-11L12 18M4.8 14h5.4M15 18v-6a3 3 0 0 1 6 0v6M15 15h6"/>',
    encode: '<path d="M9 7H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3M15 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3M9 12h6"/>',
    json: '<path d="M9 4c-2 0-3 1-3 3v2c0 1-1 2-2 3 1 1 2 2 2 3v2c0 2 1 3 3 3M15 4c2 0 3 1 3 3v2c0 1 1 2 2 3-1 1-2 2-2 3v2c0 2-1 3-3 3"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 12h.01"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 3h6"/>',
  };
  /* ===== more tools: flashcards, grades, citations, calculator, notes, to-do, converter, pomodoro, world clock, hash, picker, QR code, calendar, whiteboard, markdown, regex ===== */
  const nst = document.createElement("style");
  nst.textContent = `
.nt-bar{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;align-items:center}
.nt-in{height:2.5rem;padding:0 .875rem;border:0;border-radius:.75rem;background:var(--btn);color:var(--fg);font:inherit;font-size:.875rem;outline:none;min-width:0}
.nt-in:focus{box-shadow:0 0 0 2px var(--focus,rgba(128,128,128,.4))}
select.nt-in{cursor:pointer}.nt-in option{background:var(--panel)}
.nt-grow{flex:1;min-width:8rem}.nt-num{width:5.5rem}
.nt-list{display:flex;flex-direction:column;gap:.375rem;text-align:left}
.nt-item{display:flex;gap:.5rem;align-items:center;padding:.5rem .625rem;border-radius:.75rem;background:var(--btn)}
.nt-item>span{flex:1;min-width:0;overflow-wrap:anywhere}.nt-item.done>span{text-decoration:line-through;opacity:.55}
.nt-item input[type=checkbox]{width:1.125rem;height:1.125rem;accent-color:var(--accent)}
.nt-x{width:1.75rem;height:1.75rem;border-radius:50%;line-height:1;flex:none;color:var(--dim)}
.nt-big{font-size:2.25rem;font-weight:300;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.nt-card3d{min-height:11rem;display:flex;align-items:center;justify-content:center;padding:1.5rem;border-radius:1.125rem;background:var(--btn);font-size:1.25rem;line-height:1.4;cursor:pointer;overflow-wrap:anywhere;user-select:none}
.nt-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:.25rem}
.nt-cal b{font-size:.6875rem;font-weight:500;color:var(--dim);padding:.25rem 0}
.nt-day{height:2.5rem;border-radius:.625rem;background:var(--btn);font-size:.8125rem;padding:0}.nt-day.off{opacity:.3}
.nt-day.today{box-shadow:inset 0 0 0 2px var(--accent)}.nt-day.sel{background:var(--accent);color:var(--accent-fg)}
.nt-keys{display:grid;grid-template-columns:repeat(5,1fr);gap:.375rem}
.nt-keys .btn{padding:0;min-height:2.75rem;font-size:.9375rem}
.nt-disp{text-align:right;padding:.75rem 1rem;border-radius:.875rem;background:var(--btn);overflow:hidden}
.nt-disp input{width:100%;background:none;border:0;outline:none;color:var(--fg);font:inherit;font-size:1.25rem;text-align:right}
.nt-disp div{font-size:1.75rem;font-weight:300;min-height:2.25rem;overflow-wrap:anywhere}
.nt-md{text-align:left;padding:.75rem 1rem;border-radius:.875rem;background:var(--btn);min-height:9rem;line-height:1.6;overflow-wrap:anywhere}
.nt-md h1,.nt-md h2,.nt-md h3{margin:.5rem 0;line-height:1.25}.nt-md code{background:color-mix(in srgb,var(--fg) 12%,transparent);padding:.1rem .3rem;border-radius:.3rem}
.nt-md pre{background:color-mix(in srgb,var(--fg) 10%,transparent);padding:.625rem;border-radius:.625rem;overflow:auto}.nt-md pre code{background:none;padding:0}
.nt-md blockquote{margin:.5rem 0;padding-left:.75rem;border-left:3px solid var(--accent)}.nt-md a{color:var(--accent)}.nt-md hr{border:0;border-top:1px solid var(--dim);opacity:.4}
.nt-two{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}@media (max-width:720px){.nt-two{grid-template-columns:1fr}}
.nt-mark{background:var(--accent);color:var(--accent-fg);border-radius:.2rem}
.nt-pre{white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;padding:.75rem 1rem;border-radius:.875rem;background:var(--btn);font-size:.875rem;line-height:1.6;min-height:3rem}
#wb{width:100%;border-radius:.875rem;background:#fff;touch-action:none;cursor:crosshair;display:block}
.nt-cite{text-align:left;padding:.875rem 1rem;border-radius:.875rem;background:var(--btn);line-height:1.6;overflow-wrap:anywhere}
`;
  document.head.appendChild(nst);
  Object.assign(IC, {
    flash: '<rect x="3" y="6" width="14" height="11" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v9"/>',
    grade: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c3 2 9 2 12 0v-4.5"/>',
    cite: '<path d="M7 7h3v4c0 2-1 3-3 3M14 7h3v4c0 2-1 3-3 3"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/>',
    note: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    todo: '<path d="M4 7l2 2 3-3M4 17l2 2 3-3M12 8h8M12 18h8"/>',
    convert: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
    world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>',
    pick: '<path d="M4 6h10M4 12h10M4 18h6M17 14l3 3-3 3M20 17h-6"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    board: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
    md: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15V9l2.5 3L12 9v6M16 9v6m0 0l-2-2m2 2l2-2"/>',
    regex: '<path d="M6 6v.01M6 18l2-6M14 5l6 8M20 5l-6 8"/>',
    vm: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    term: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  });
  const kv = (k, d) => { try { const v = JSON.parse(NV.LS.get("nexvelo.tools." + k, "")); return v == null ? d : v; } catch { return d; } };
  const sv = (k, v) => NV.LS.set("nexvelo.tools." + k, JSON.stringify(v));
  const num = (v) => (v === "" || v == null || isNaN(+v) ? NaN : +v);
  const fmtN = (n) => (isFinite(n) ? String(+n.toPrecision(12)) : "error");
  const html = (s) => esc(s);

  /* ---------- flashcards ---------- */
  function mountFlash(root) {
    let decks = kv("flash", [{ name: "my first deck", cards: [] }]), di = 0, ci = 0, shown = false, order = null;
    const draw = () => {
      const d = decks[di], idx = order || d.cards.map((_, i) => i), card = d.cards[idx[ci]];
      root.innerHTML = `<div class="tl-card"><div class="nt-bar"><select class="nt-in" id="fd">${decks.map((x, i) => `<option value="${i}"${i === di ? " selected" : ""}>${esc(x.name)} (${x.cards.length})</option>`).join("")}</select><button class="btn" id="fnew">new deck</button><button class="btn danger" id="fdel">delete deck</button></div>
${card ? `<div class="nt-card3d" id="fc">${esc(shown ? card.a : card.q)}</div><small style="color:var(--dim)">${shown ? "answer" : "question"} · card ${ci + 1} of ${idx.length} · tap the card to flip</small>
<div class="nt-bar"><button class="btn" id="fp">previous</button><button class="btn" id="fs">shuffle</button><button class="btn" id="fn">next</button></div>` : '<div class="msg">this deck is empty. add a card below.</div>'}
<div class="nt-bar"><input class="nt-in nt-grow" id="fq" placeholder="front (question)"><input class="nt-in nt-grow" id="fa" placeholder="back (answer)"><button class="btn primary" id="fadd">add card</button></div>
<div class="nt-list">${d.cards.map((c, i) => `<div class="nt-item"><span><b>${esc(c.q)}</b> · ${esc(c.a)}</span><button class="btn nt-x" data-rm="${i}" aria-label="Remove card">×</button></div>`).join("")}</div></div>`;
    };
    const go = (n) => { const len = (order || decks[di].cards).length; if (!len) return; ci = (ci + n + len) % len; shown = false; draw(); };
    root.addEventListener("click", (e) => {
      const t = e.target, q = (s) => t.closest(s);
      if (q("#fc")) { shown = !shown; draw(); }
      else if (q("#fn")) go(1); else if (q("#fp")) go(-1);
      else if (q("#fs")) { order = decks[di].cards.map((_, i) => i).sort(() => Math.random() - 0.5); ci = 0; shown = false; draw(); }
      else if (q("#fnew")) { const n = prompt("name of the new deck"); if (n && n.trim()) { decks.push({ name: n.trim().slice(0, 40), cards: [] }); di = decks.length - 1; ci = 0; order = null; sv("flash", decks); draw(); } }
      else if (q("#fdel")) { if (confirm("delete this deck?")) { decks.splice(di, 1); if (!decks.length) decks.push({ name: "my first deck", cards: [] }); di = 0; ci = 0; order = null; sv("flash", decks); draw(); } }
      else if (q("#fadd")) { const a = root.querySelector("#fq").value.trim(), b = root.querySelector("#fa").value.trim(); if (a && b) { decks[di].cards.push({ q: a, a: b }); order = null; sv("flash", decks); draw(); root.querySelector("#fq").focus(); } }
      else if (q("[data-rm]")) { decks[di].cards.splice(+q("[data-rm]").dataset.rm, 1); order = null; ci = 0; sv("flash", decks); draw(); }
    });
    root.addEventListener("change", (e) => { if (e.target.id === "fd") { di = +e.target.value; ci = 0; shown = false; order = null; draw(); } });
    draw();
  }

  /* ---------- grade calculator ---------- */
  function mountGrades(root) {
    const LET = [["A+", 4], ["A", 4], ["A-", 3.7], ["B+", 3.3], ["B", 3], ["B-", 2.7], ["C+", 2.3], ["C", 2], ["C-", 1.7], ["D+", 1.3], ["D", 1], ["F", 0]];
    let rows = kv("grades", [{ n: "homework", g: "", w: "" }, { n: "exam", g: "", w: "" }]), gp = kv("gpa", [{ l: "A", c: 3 }, { l: "B", c: 3 }]), tab = "weighted";
    const letter = (p) => (p >= 90 ? "A" : p >= 80 ? "B" : p >= 70 ? "C" : p >= 60 ? "D" : "F");
    const draw = () => {
      let body = "";
      if (tab === "weighted") {
        let sw = 0, sg = 0; rows.forEach((r) => { const g = num(r.g), w = num(r.w); if (!isNaN(g) && !isNaN(w)) { sw += w; sg += g * w; } });
        body = `<div class="nt-list">${rows.map((r, i) => `<div class="nt-item"><input class="nt-in nt-grow" data-f="n" data-i="${i}" value="${esc(r.n)}" placeholder="name"><input class="nt-in nt-num" data-f="g" data-i="${i}" value="${esc(r.g)}" placeholder="grade %" inputmode="decimal"><input class="nt-in nt-num" data-f="w" data-i="${i}" value="${esc(r.w)}" placeholder="weight %" inputmode="decimal"><button class="btn nt-x" data-rm="${i}" aria-label="Remove">×</button></div>`).join("")}</div>
<div class="nt-bar"><button class="btn" id="gadd">add a row</button></div>
<div class="nt-out"><div><span class="nt-big">${sw ? fmtN(Math.round(sg / sw * 100) / 100) + "%" : "–"}</span><br><small>${sw ? "letter " + letter(sg / sw) + " · total weight " + fmtN(sw) + "%" + (Math.abs(sw - 100) > 0.01 ? " (weights usually add to 100)" : "") : "enter grades and weights"}</small></div></div>`;
      } else if (tab === "final") {
        const s = kv("final", { c: "", t: "", w: "" }), c = num(s.c), t = num(s.t), w = num(s.w), need = (t - c * (1 - w / 100)) / (w / 100);
        body = `<div class="nt-bar"><input class="nt-in nt-num" id="fc1" value="${esc(s.c)}" placeholder="current %" inputmode="decimal"><input class="nt-in nt-num" id="fc2" value="${esc(s.t)}" placeholder="goal %" inputmode="decimal"><input class="nt-in nt-num" id="fc3" value="${esc(s.w)}" placeholder="final weight %" inputmode="decimal"></div>
<div class="nt-out"><div><span class="nt-big">${isNaN(need) || !isFinite(need) ? "–" : fmtN(Math.round(need * 100) / 100) + "%"}</span><br><small>${isNaN(need) || !isFinite(need) ? "what you need on the final to reach your goal" : need > 100 ? "that is above 100%, so this goal may be out of reach" : need < 0 ? "you already have it, whatever you score" : "score needed on the final exam"}</small></div></div>`;
      } else {
        let cr = 0, pts = 0; gp.forEach((r) => { const c = num(r.c), v = (LET.find((x) => x[0] === r.l) || [0, 0])[1]; if (!isNaN(c)) { cr += c; pts += c * v; } });
        body = `<div class="nt-list">${gp.map((r, i) => `<div class="nt-item"><select class="nt-in nt-grow" data-gl="${i}">${LET.map((x) => `<option${x[0] === r.l ? " selected" : ""}>${x[0]}</option>`).join("")}</select><input class="nt-in nt-num" data-gc="${i}" value="${esc(r.c)}" placeholder="credits" inputmode="decimal"><button class="btn nt-x" data-grm="${i}" aria-label="Remove">×</button></div>`).join("")}</div>
<div class="nt-bar"><button class="btn" id="gpadd">add a course</button></div><div class="nt-out"><div><span class="nt-big">${cr ? (pts / cr).toFixed(2) : "–"}</span><br><small>GPA on a 4.0 scale</small></div></div>`;
      }
      root.innerHTML = `<div class="tl-card"><div class="mtabs" style="align-self:center"><button data-t="weighted" class="${tab === "weighted" ? "on" : ""}">weighted grade</button><button data-t="final" class="${tab === "final" ? "on" : ""}">final score</button><button data-t="gpa" class="${tab === "gpa" ? "on" : ""}">GPA</button></div>${body}</div>`;
    };
    const keep = (e) => { const a = document.activeElement, id = a && (a.id || a.dataset.f + a.dataset.i + (a.dataset.gc || "")), pos = a && a.selectionStart; draw(); if (a) { const n = root.querySelector(a.id ? "#" + a.id : a.dataset.f ? `[data-f="${a.dataset.f}"][data-i="${a.dataset.i}"]` : a.dataset.gc != null ? `[data-gc="${a.dataset.gc}"]` : "x"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } } };
    root.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.f) { rows[+t.dataset.i][t.dataset.f] = t.value; sv("grades", rows); keep(); }
      else if (t.id && t.id.startsWith("fc")) { const s = kv("final", { c: "", t: "", w: "" }); s[{ fc1: "c", fc2: "t", fc3: "w" }[t.id]] = t.value; sv("final", s); keep(); }
      else if (t.dataset.gc != null) { gp[+t.dataset.gc].c = t.value; sv("gpa", gp); keep(); }
    });
    root.addEventListener("change", (e) => { if (e.target.dataset.gl != null) { gp[+e.target.dataset.gl].l = e.target.value; sv("gpa", gp); draw(); } });
    root.addEventListener("click", (e) => {
      const q = (s) => e.target.closest(s);
      if (q("[data-t]")) { tab = q("[data-t]").dataset.t; draw(); }
      else if (q("#gadd")) { rows.push({ n: "", g: "", w: "" }); sv("grades", rows); draw(); }
      else if (q("[data-rm]")) { rows.splice(+q("[data-rm]").dataset.rm, 1); sv("grades", rows); draw(); }
      else if (q("#gpadd")) { gp.push({ l: "A", c: 3 }); sv("gpa", gp); draw(); }
      else if (q("[data-grm]")) { gp.splice(+q("[data-grm]").dataset.grm, 1); sv("gpa", gp); draw(); }
    });
    draw();
  }

  /* ---------- citations (MLA 9 and APA 7) ---------- */
  function mountCite(root) {
    const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    root.innerHTML = `<div class="tl-card"><div class="nt-bar"><select class="nt-in" id="ct"><option value="web">website</option><option value="book">book</option><option value="article">journal article</option></select><select class="nt-in" id="cs"><option value="mla">MLA 9</option><option value="apa">APA 7</option></select></div>
<textarea class="tl-ta" id="cau" placeholder="authors, one per line (First Last). leave empty if none" style="min-height:4.5rem"></textarea>
<input class="nt-in" id="cti" placeholder="title"><input class="nt-in" id="cco" placeholder="website name"><input class="nt-in" id="cpu" placeholder="publisher" hidden>
<div class="nt-bar"><input class="nt-in nt-num" id="cy" placeholder="year" inputmode="numeric"><select class="nt-in" id="cm"><option value="">month</option>${MON.map((m, i) => `<option value="${i}">${m}</option>`).join("")}</select><input class="nt-in nt-num" id="cd" placeholder="day" inputmode="numeric"></div>
<div class="nt-bar" id="cjr" hidden><input class="nt-in nt-num" id="cv" placeholder="volume"><input class="nt-in nt-num" id="ci" placeholder="issue"><input class="nt-in nt-num" id="cp" placeholder="pages"></div>
<input class="nt-in" id="cu" placeholder="web address (URL)" autocomplete="off" spellcheck="false">
<div class="nt-cite" id="cout"></div><div class="row"><button class="btn primary" id="ccopy">copy citation</button></div></div>`;
    const q = (s) => root.querySelector(s), v = (s) => q(s).value.trim();
    const names = () => v("#cau").split(/\n/).map((s) => s.trim()).filter(Boolean).map((n) => { const p = n.split(/\s+/); return { last: p.length > 1 ? p[p.length - 1] : p[0], first: p.length > 1 ? p.slice(0, -1).join(" ") : "" }; });
    const ini = (f) => f.split(/[\s-]+/).filter(Boolean).map((x) => x[0].toUpperCase() + ".").join(" ");
    const end = (s) => (/[.?!]$/.test(s) ? s : s + ".");
    function build() {
      const type = v("#ct"), style = v("#cs"), a = names(), ti = v("#cti"), co = v("#cco"), pu = v("#cpu"), y = v("#cy"), m = v("#cm"), d = v("#cd"), vo = v("#cv"), is = v("#ci"), pg = v("#cp"), url = v("#cu").replace(/^https?:\/\//, style === "mla" ? "" : "https://");
      const mon = m === "" ? "" : MON[+m], monS = mon ? mon.slice(0, 3) + (mon.length > 3 && mon !== "May" && mon !== "June" && mon !== "July" ? "." : "") : "";
      let au = "";
      if (style === "mla") au = !a.length ? "" : a.length === 1 ? end(a[0].last + (a[0].first ? ", " + a[0].first : "")) : a.length === 2 ? end(a[0].last + ", " + a[0].first + ", and " + a[1].first + " " + a[1].last) : end(a[0].last + ", " + a[0].first + ", et al");
      else au = !a.length ? "" : (a.length > 2 ? a.slice(0, -1).map((x) => x.last + ", " + ini(x.first)).join(", ") + ", & " : a.length === 2 ? a[0].last + ", " + ini(a[0].first) + ", & " : "") + (a.length === 1 ? a[0].last + ", " + ini(a[0].first) : a[a.length - 1].last + ", " + ini(a[a.length - 1].first));
      if (style === "apa" && au) au = end(au);
      const parts = [];
      if (style === "mla") {
        if (au) parts.push(au);
        const date = [d, monS, y].filter(Boolean).join(" ");
        if (type === "web") { parts.push(`“${end(ti || "title")}”`); const tail = [co ? "<i>" + esc(co) + "</i>" : "", pu, date, url].filter(Boolean).join(", "); if (tail) parts.push(end(tail)); }
        else if (type === "book") { parts.push("<i>" + esc(end(ti || "title")) + "</i>"); const tail = [pu, y].filter(Boolean).join(", "); if (tail) parts.push(end(tail)); }
        else { parts.push(`“${end(ti || "title")}”`); const tail = [co ? "<i>" + esc(co) + "</i>" : "", vo ? "vol. " + vo : "", is ? "no. " + is : "", y, pg ? "pp. " + pg : "", url].filter(Boolean).join(", "); if (tail) parts.push(end(tail)); }
      } else {
        const date = y ? "(" + [y, mon, d].filter(Boolean).join(", ").replace(/, (\w+), (\d+)$/, ", $1 $2") + ")." : "(n.d.).";
        parts.push(au ? au + " " + date : "");
        if (!au) parts.length = 0;
        if (!au) parts.push(esc(end(ti || "title")) + " " + date); else parts.push(type === "book" ? "<i>" + esc(end(ti || "title")) + "</i>" : esc(end(ti || "title")));
        if (type === "web" && co) parts.push(esc(end(co)) );
        if (type === "book" && pu) parts.push(esc(end(pu)));
        if (type === "article") parts.push([co ? "<i>" + esc(co) + "</i>" : "", vo ? "<i>" + esc(vo) + "</i>" + (is ? "(" + esc(is) + ")" : "") : "", pg].filter(Boolean).join(", ") + ".");
        if (url) parts.push(url);
      }
      return parts.filter(Boolean).join(" ");
    }
    const upd = () => { const t = v("#ct"); q("#cco").hidden = t === "book"; q("#cpu").hidden = t !== "book" && !(t === "web" && v("#cs") === "mla"); q("#cco").placeholder = t === "article" ? "journal name" : "website name"; q("#cjr").hidden = t !== "article"; q("#cout").innerHTML = build() || "fill in the details above"; };
    root.addEventListener("input", upd); root.addEventListener("change", upd);
    q("#ccopy").addEventListener("click", (e) => copy(q("#cout").textContent, e.currentTarget));
    upd();
  }

  /* ---------- scientific calculator ---------- */
  function calcEval(src, deg, ans) {
    const s = String(src).replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/√/g, "sqrt").replace(/\s+/g, "");
    let i = 0;
    const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, ln: Math.log, log: Math.log10, log2: Math.log2, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round };
    const toR = (x) => (deg ? x * Math.PI / 180 : x), fromR = (x) => (deg ? x * 180 / Math.PI : x);
    const fact = (n) => { if (n < 0 || n !== Math.floor(n) || n > 170) return NaN; let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };
    const peek = () => s[i];
    function expr() { let v = term(); while (peek() === "+" || peek() === "-") { const o = s[i++]; const r = term(); v = o === "+" ? v + r : v - r; } return v; }
    function term() { let v = unary(); while (peek() === "*" || peek() === "/" || peek() === "(" || /[a-z]/i.test(peek() || "") ) { if (peek() === "*" || peek() === "/") { const o = s[i++]; const r = unary(); v = o === "*" ? v * r : v / r; } else v *= unary(); } return v; }
    function unary() { if (peek() === "-") { i++; return -unary(); } if (peek() === "+") { i++; return unary(); } return power(); }
    function power() { let b = post(); if (peek() === "^") { i++; const e = unary(); b = Math.pow(b, e); } return b; }
    function post() { let v = primary(); for (;;) { if (peek() === "!") { i++; v = fact(v); } else if (peek() === "%") { i++; v /= 100; } else break; } return v; }
    function primary() {
      const c = peek();
      if (c === "(") { i++; const v = expr(); if (peek() !== ")") throw new Error("missing )"); i++; return v; }
      let m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (m) { i += m[0].length; return parseFloat(m[0]); }
      m = /^[a-z][a-z0-9]*/i.exec(s.slice(i));
      if (m) {
        const n = m[0].toLowerCase(); i += n.length;
        if (n === "pi") return Math.PI; if (n === "e") return Math.E; if (n === "ans") return ans || 0;
        if (n === "rad" || n === "deg") throw new Error("unknown word " + n);
        if (FN[n]) { if (peek() !== "(") throw new Error(n + " needs ( )"); i++; const a = expr(); if (peek() !== ")") throw new Error("missing )"); i++; const f = FN[n]; return /^a(sin|cos|tan)$/.test(n) ? fromR(f(a)) : /^(sin|cos|tan)$/.test(n) ? f(toR(a)) : f(a); }
        throw new Error("unknown word " + n);
      }
      throw new Error("unexpected " + (c || "end"));
    }
    if (!s) return NaN;
    const v = expr(); if (i < s.length) throw new Error("unexpected " + s[i]); return v;
  }
  function mountCalc(root, own) {
    const KEYS = [["Rad", "mode"], ["(", "("], [")", ")"], ["⌫", "bk"], ["C", "clr"], ["sin", "sin("], ["cos", "cos("], ["tan", "tan("], ["ln", "ln("], ["log", "log("], ["√", "sqrt("], ["x²", "^2"], ["xʸ", "^"], ["n!", "!"], ["π", "π"], ["7", "7"], ["8", "8"], ["9", "9"], ["÷", "÷"], ["e", "e"], ["4", "4"], ["5", "5"], ["6", "6"], ["×", "×"], ["Ans", "ans"], ["1", "1"], ["2", "2"], ["3", "3"], ["−", "−"], ["%", "%"], ["0", "0"], [".", "."], ["=", "eq"], ["+", "+"]];
    let deg = false, ans = 0, hist = kv("calc", []);
    root.innerHTML = `<div class="tl-card"><div class="nt-disp"><input id="cx" placeholder="type or tap, e.g. sin(30)+2^3" autocomplete="off" spellcheck="false"><div id="cr"></div></div><div class="nt-keys">${KEYS.map(([l, k]) => `<button class="btn" data-k="${esc(k)}" type="button">${esc(l)}</button>`).join("")}</div><div class="nt-list" id="ch"></div></div>`;
    const q = (s) => root.querySelector(s), inp = q("#cx");
    const live = () => { try { const v = calcEval(inp.value, deg, ans); q("#cr").textContent = inp.value && isFinite(v) ? "= " + fmtN(v) : ""; } catch { q("#cr").textContent = ""; } };
    const showHist = () => { q("#ch").innerHTML = hist.slice(-5).reverse().map((h) => `<div class="nt-item"><span>${esc(h[0])} = <b>${esc(h[1])}</b></span></div>`).join(""); };
    function equals() { try { const v = calcEval(inp.value, deg, ans); if (!isFinite(v)) throw new Error("not a number"); hist.push([inp.value, fmtN(v)]); hist = hist.slice(-30); sv("calc", hist); ans = v; q("#cr").textContent = "= " + fmtN(v); inp.value = fmtN(v); showHist(); } catch (e) { q("#cr").textContent = String(e.message || e); } }
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return; const k = b.dataset.k;
      if (k === "mode") { deg = !deg; b.textContent = deg ? "Deg" : "Rad"; live(); }
      else if (k === "clr") { inp.value = ""; q("#cr").textContent = ""; }
      else if (k === "bk") { inp.value = inp.value.slice(0, -1); live(); }
      else if (k === "eq") equals();
      else { inp.value += k; live(); }
      inp.focus();
    });
    inp.addEventListener("input", live);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") equals(); });
    showHist(); inp.focus();
  }

  /* ---------- notes ---------- */
  function mountNotes(root) {
    root.innerHTML = `<div class="tl-card"><textarea class="tl-ta" id="nt" style="min-height:20rem" placeholder="start typing. it saves by itself" spellcheck="true"></textarea><div class="nt-bar"><small id="ns" style="color:var(--dim)"></small><button class="btn" id="nc">copy</button><button class="btn" id="nd">download .txt</button><button class="btn danger" id="nx">clear</button></div></div>`;
    const q = (s) => root.querySelector(s), ta = q("#nt"); ta.value = kv("notes", "");
    const info = () => { q("#ns").textContent = ta.value.length + " characters · saved"; };
    ta.addEventListener("input", () => { sv("notes", ta.value); info(); });
    q("#nc").addEventListener("click", (e) => copy(ta.value, e.currentTarget));
    q("#nd").addEventListener("click", () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ta.value], { type: "text/plain" })); a.download = "notes.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); });
    q("#nx").addEventListener("click", () => { if (!ta.value || confirm("clear the notes?")) { ta.value = ""; sv("notes", ""); info(); } });
    info();
  }

  /* ---------- to-do ---------- */
  function mountTodo(root) {
    let items = kv("todo", []);
    const draw = () => {
      root.innerHTML = `<div class="tl-card"><form class="nt-bar" id="tf"><input class="nt-in nt-grow" id="ti" placeholder="add a task" autocomplete="off"><button class="btn primary" type="submit">add</button></form><div class="nt-list">${items.map((t, i) => `<div class="nt-item${t.d ? " done" : ""}"><input type="checkbox" data-c="${i}"${t.d ? " checked" : ""}><span>${esc(t.t)}</span><button class="btn nt-x" data-r="${i}" aria-label="Remove">×</button></div>`).join("") || '<div class="msg">nothing to do. enjoy.</div>'}</div><div class="nt-bar"><small style="color:var(--dim)">${items.filter((t) => !t.d).length} left of ${items.length}</small><button class="btn" id="tc">clear finished</button></div></div>`;
      root.querySelector("#ti").focus();
    };
    root.addEventListener("submit", (e) => { e.preventDefault(); const v = root.querySelector("#ti").value.trim(); if (v) { items.push({ t: v.slice(0, 200), d: false }); sv("todo", items); draw(); } });
    root.addEventListener("click", (e) => { const r = e.target.closest("[data-r]"), c = e.target.closest("#tc"); if (r) { items.splice(+r.dataset.r, 1); sv("todo", items); draw(); } else if (c) { items = items.filter((t) => !t.d); sv("todo", items); draw(); } });
    root.addEventListener("change", (e) => { if (e.target.dataset.c != null) { items[+e.target.dataset.c].d = e.target.checked; sv("todo", items); draw(); } });
    draw();
  }

  /* ---------- unit converter ---------- */
  function mountConvert(root) {
    const U = {
      length: [["metre", 1], ["kilometre", 1000], ["centimetre", 0.01], ["millimetre", 0.001], ["mile", 1609.344], ["yard", 0.9144], ["foot", 0.3048], ["inch", 0.0254], ["nautical mile", 1852]],
      mass: [["kilogram", 1], ["gram", 0.001], ["milligram", 1e-6], ["tonne", 1000], ["pound", 0.45359237], ["ounce", 0.028349523125], ["stone", 6.35029318]],
      volume: [["litre", 1], ["millilitre", 0.001], ["cubic metre", 1000], ["US gallon", 3.785411784], ["US quart", 0.946352946], ["US cup", 0.2365882365], ["US fluid ounce", 0.0295735295625], ["tablespoon", 0.01478676478125], ["teaspoon", 0.00492892159375]],
      area: [["square metre", 1], ["square kilometre", 1e6], ["hectare", 1e4], ["acre", 4046.8564224], ["square foot", 0.09290304], ["square inch", 0.00064516], ["square mile", 2589988.110336]],
      speed: [["metre/second", 1], ["kilometre/hour", 1 / 3.6], ["mile/hour", 0.44704], ["knot", 0.514444444], ["foot/second", 0.3048]],
      time: [["second", 1], ["minute", 60], ["hour", 3600], ["day", 86400], ["week", 604800], ["year (365 days)", 31536000]],
      data: [["byte", 1], ["kilobyte", 1e3], ["megabyte", 1e6], ["gigabyte", 1e9], ["terabyte", 1e12], ["kibibyte", 1024], ["mebibyte", 1048576], ["gibibyte", 1073741824], ["bit", 0.125]],
      energy: [["joule", 1], ["kilojoule", 1000], ["calorie", 4.184], ["kilocalorie", 4184], ["watt-hour", 3600], ["kilowatt-hour", 3.6e6]],
      temperature: [["celsius"], ["fahrenheit"], ["kelvin"]],
    };
    const s = kv("conv", { c: "length", f: 0, t: 1, v: "1" });
    const opts = (c, sel) => U[c].map((u, i) => `<option value="${i}"${i === sel ? " selected" : ""}>${u[0]}</option>`).join("");
    root.innerHTML = `<div class="tl-card"><select class="nt-in" id="uc">${Object.keys(U).map((c) => `<option${c === s.c ? " selected" : ""}>${c}</option>`).join("")}</select>
<div class="nt-bar"><input class="nt-in nt-grow" id="uv" value="${esc(s.v)}" inputmode="decimal"><select class="nt-in nt-grow" id="uf">${opts(s.c, s.f)}</select></div>
<div class="nt-bar"><button class="btn" id="us">swap</button></div>
<div class="nt-bar"><div class="nt-out nt-grow"><div><span class="nt-big" id="ur">–</span></div></div><select class="nt-in nt-grow" id="ut">${opts(s.c, s.t)}</select></div></div>`;
    const q = (x) => root.querySelector(x);
    const toC = (v, u) => (u === 0 ? v : u === 1 ? (v - 32) * 5 / 9 : v - 273.15), fromC = (c, u) => (u === 0 ? c : u === 1 ? c * 9 / 5 + 32 : c + 273.15);
    function calc() {
      const c = q("#uc").value, v = num(q("#uv").value.replace(",", ".")), f = +q("#uf").value, t = +q("#ut").value;
      Object.assign(s, { c, f, t, v: q("#uv").value }); sv("conv", s);
      if (isNaN(v)) { q("#ur").textContent = "–"; return; }
      q("#ur").textContent = fmtN(c === "temperature" ? fromC(toC(v, f), t) : v * U[c][f][1] / U[c][t][1]);
    }
    q("#uc").addEventListener("change", () => { const c = q("#uc").value; q("#uf").innerHTML = opts(c, 0); q("#ut").innerHTML = opts(c, Math.min(1, U[c].length - 1)); calc(); });
    root.addEventListener("input", calc); root.addEventListener("change", calc);
    q("#us").addEventListener("click", () => { const f = q("#uf").value; q("#uf").value = q("#ut").value; q("#ut").value = f; calc(); });
    calc();
  }

  /* ---------- pomodoro ---------- */
  function mountPomo(root, own) {
    const cfg = kv("pomo", { f: 25, s: 5, l: 15 });
    let mode = "f", left = cfg.f * 60, end = 0, run = false, done = kv("pomoDone", 0), cycle = 0, iv = 0;
    root.innerHTML = `<div class="tl-card"><div class="mtabs" style="align-self:center"><button data-m="f" class="on">focus</button><button data-m="s">short break</button><button data-m="l">long break</button></div><div class="nt-big" id="pt" style="font-size:4rem"></div>
<div class="nt-bar"><button class="btn primary" id="pg">start</button><button class="btn" id="pr">reset</button><button class="btn" id="pk">skip</button></div>
<small id="pn" style="color:var(--dim)"></small>
<div class="nt-bar"><label class="fld"><span>focus (min)</span><input class="nt-in nt-num" data-c="f" value="${cfg.f}" inputmode="numeric"></label><label class="fld"><span>short break</span><input class="nt-in nt-num" data-c="s" value="${cfg.s}" inputmode="numeric"></label><label class="fld"><span>long break</span><input class="nt-in nt-num" data-c="l" value="${cfg.l}" inputmode="numeric"></label></div></div>`;
    const q = (s) => root.querySelector(s), mm = (n) => String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(Math.floor(n % 60)).padStart(2, "0");
    const beep = () => { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); g.gain.value = 0.15; o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.35); } catch {} };
    const paint = () => { q("#pt").textContent = mm(left); q("#pg").textContent = run ? "pause" : "start"; q("#pn").textContent = done + " focus session" + (done === 1 ? "" : "s") + " finished"; root.querySelectorAll("[data-m]").forEach((b) => b.classList.toggle("on", b.dataset.m === mode)); document.title = run ? mm(left) + " – Nex.Velo" : document.title; };
    const setMode = (m) => { mode = m; left = Math.max(1, +cfg[m] || 1) * 60; run = false; clearInterval(iv); paint(); };
    const tick = () => { left = Math.max(0, Math.ceil((end - Date.now()) / 1000)); if (left <= 0) { beep(); if (mode === "f") { done++; cycle++; sv("pomoDone", done); setMode(cycle % 4 === 0 ? "l" : "s"); } else setMode("f"); NV.toast("time's up"); return; } paint(); };
    const start = () => { run = true; end = Date.now() + left * 1000; clearInterval(iv); iv = setInterval(tick, 250); paint(); };
    own.push(() => clearInterval(iv));
    root.addEventListener("click", (e) => { const t = e.target; if (t.closest("#pg")) { run ? (run = false, clearInterval(iv), paint()) : start(); } else if (t.closest("#pr")) setMode(mode); else if (t.closest("#pk")) setMode(mode === "f" ? "s" : "f"); else if (t.dataset.m) setMode(t.dataset.m); });
    root.addEventListener("change", (e) => { const k = e.target.dataset.c; if (k) { cfg[k] = Math.min(180, Math.max(1, +e.target.value || cfg[k])); e.target.value = cfg[k]; sv("pomo", cfg); if (!run && mode === k) setMode(k); } });
    paint();
  }

  /* ---------- world clock ---------- */
  function mountWorld(root, own) {
    let zones = kv("world", ["America/New_York", "Europe/London", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"]);
    const all = (Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : ["UTC"]);
    root.innerHTML = `<div class="tl-card"><div class="nt-bar"><input class="nt-in nt-grow" id="wz" list="wzl" placeholder="add a place, e.g. Asia/Kolkata" autocomplete="off"><datalist id="wzl">${all.map((z) => `<option value="${z}">`).join("")}</datalist><button class="btn primary" id="wa">add</button></div><div class="nt-list" id="wl"></div></div>`;
    const name = (z) => z.split("/").pop().replace(/_/g, " ");
    const paint = () => {
      const now = new Date();
      root.querySelector("#wl").innerHTML = zones.map((z, i) => { let t = "", d = "", off = ""; try { t = new Intl.DateTimeFormat(undefined, { timeZone: z, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: !NV.settings.h24 }).format(now); d = new Intl.DateTimeFormat(undefined, { timeZone: z, weekday: "short", day: "numeric", month: "short" }).format(now); off = new Intl.DateTimeFormat("en", { timeZone: z, timeZoneName: "shortOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value || ""; } catch {} return `<div class="nt-item"><span><b>${esc(name(z))}</b><br><small style="color:var(--dim)">${esc(d)} · ${esc(off)}</small></span><span style="flex:none;font-size:1.375rem;font-variant-numeric:tabular-nums">${esc(t)}</span><button class="btn nt-x" data-r="${i}" aria-label="Remove">×</button></div>`; }).join("") || '<div class="msg">add a place above.</div>';
    };
    const iv = setInterval(paint, 1000); own.push(() => clearInterval(iv));
    root.addEventListener("click", (e) => {
      const r = e.target.closest("[data-r]");
      if (r) { zones.splice(+r.dataset.r, 1); sv("world", zones); paint(); }
      else if (e.target.closest("#wa")) { const v = root.querySelector("#wz").value.trim(), z = all.find((x) => x.toLowerCase() === v.toLowerCase()) || all.find((x) => x.toLowerCase().endsWith("/" + v.toLowerCase().replace(/ /g, "_"))); if (z && !zones.includes(z)) { zones.push(z); sv("world", zones); root.querySelector("#wz").value = ""; paint(); } else NV.toast(z ? "already in the list" : "couldn't find that place. pick one from the list"); }
    });
    paint();
  }

  /* ---------- hash generator ---------- */
  function mountHash(root) {
    root.innerHTML = `<div class="tl-card"><textarea class="tl-ta" id="ht" placeholder="type or paste text to hash"></textarea><div class="nt-list" id="hr"></div></div>`;
    const ta = root.querySelector("#ht"), out = root.querySelector("#hr"); let seq = 0;
    async function run() {
      const my = ++seq, data = new TextEncoder().encode(ta.value), rows = [];
      for (const a of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) { const h = [...new Uint8Array(await crypto.subtle.digest(a, data))].map((b) => b.toString(16).padStart(2, "0")).join(""); rows.push([a, h]); }
      if (my !== seq) return;
      out.innerHTML = rows.map(([a, h]) => `<div class="nt-item"><span><small style="color:var(--dim)">${a}</small><br><code style="font-size:.75rem;word-break:break-all">${h}</code></span><button class="btn" data-h="${h}">copy</button></div>`).join("");
    }
    ta.addEventListener("input", run); out.addEventListener("click", (e) => { const b = e.target.closest("[data-h]"); if (b) copy(b.dataset.h, b); });
    run();
  }

  /* ---------- picker and uuid ---------- */
  function mountPicker(root) {
    root.innerHTML = `<div class="tl-card"><textarea class="tl-ta" id="pl" placeholder="one option per line"></textarea><div class="nt-bar"><button class="btn primary" id="pp">pick one</button><button class="btn" id="ps">shuffle the list</button></div><div class="nt-out"><div><span class="nt-big" id="po" style="font-size:1.75rem">–</span></div></div>
<h3 style="margin:.5rem 0 0;font-size:.8125rem;color:var(--dim);font-weight:500">uuid</h3><div class="nt-bar"><input class="nt-in nt-num" id="un" type="number" min="1" max="20" value="1"><button class="btn primary" id="ug">generate</button></div><div class="nt-list" id="ul"></div></div>`;
    const q = (s) => root.querySelector(s), lines = () => q("#pl").value.split("\n").map((x) => x.trim()).filter(Boolean);
    const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = randBelow(16); return (c === "x" ? r : (r & 3) | 8).toString(16); }));
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("#pp")) { const l = lines(); q("#po").textContent = l.length ? l[randBelow(l.length)] : "add some options first"; }
      else if (t.closest("#ps")) { const l = lines(); for (let i = l.length - 1; i > 0; i--) { const j = randBelow(i + 1); [l[i], l[j]] = [l[j], l[i]]; } q("#pl").value = l.join("\n"); }
      else if (t.closest("#ug")) { const n = Math.min(20, Math.max(1, +q("#un").value || 1)); q("#ul").innerHTML = Array.from({ length: n }, uuid).map((u) => `<div class="nt-item"><span><code>${u}</code></span><button class="btn" data-u="${u}">copy</button></div>`).join(""); }
      else if (t.dataset.u) copy(t.dataset.u, t);
    });
  }

  /* ---------- QR code ---------- */
  function mountQr(root) {
    root.innerHTML = `<div class="tl-card"><textarea class="tl-ta" id="qt" style="min-height:5rem" placeholder="text or a link to turn into a QR code"></textarea>
<div class="nt-bar"><select class="nt-in" id="ql"><option value="L">low error correction</option><option value="M" selected>medium</option><option value="Q">quartile</option><option value="H">high</option></select><input type="color" id="qf" value="#000000" style="width:3rem;height:2.5rem;border:0;border-radius:.625rem;background:var(--btn);padding:.25rem"><input type="color" id="qb" value="#ffffff" style="width:3rem;height:2.5rem;border:0;border-radius:.625rem;background:var(--btn);padding:.25rem"></div>
<canvas id="qc" style="max-width:100%;align-self:center;border-radius:.5rem"></canvas><small id="qm" style="color:var(--dim)"></small><div class="row"><button class="btn primary" id="qd">download PNG</button></div></div>`;
    const q = (s) => root.querySelector(s), cv = q("#qc");
    function draw() {
      const text = q("#qt").value;
      if (!text) { cv.width = cv.height = 1; q("#qm").textContent = "type something above"; return; }
      if (!window.NVQR) { q("#qm").textContent = "loading the QR encoder…"; return; }
      let m; try { m = window.NVQR(text, q("#ql").value); } catch { q("#qm").textContent = "that is too long for a QR code. shorten it or lower the error correction."; return; }
      const n = m.length, px = Math.max(4, Math.floor(320 / (n + 8))), pad = 4 * px, W = n * px + pad * 2, c = cv.getContext("2d");
      cv.width = cv.height = W; c.fillStyle = q("#qb").value; c.fillRect(0, 0, W, W); c.fillStyle = q("#qf").value;
      m.forEach((row, y) => row.forEach((on, x) => { if (on) c.fillRect(pad + x * px, pad + y * px, px, px); }));
      q("#qm").textContent = n + " × " + n + " modules";
    }
    function ready() { if (window.NVQR) return draw(); const s = document.createElement("script"); s.src = "/qr.js"; s.onload = draw; s.onerror = () => { q("#qm").textContent = "couldn't load the QR encoder (qr.js). upload it to the public folder."; }; document.head.appendChild(s); }
    root.addEventListener("input", draw); root.addEventListener("change", draw);
    q("#qd").addEventListener("click", () => { cv.toBlob((b) => { if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "qr-code.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); }); });
    ready();
  }

  /* ---------- calendar and date math ---------- */
  function mountCal(root) {
    const now = new Date(); let y = now.getFullYear(), m = now.getMonth(), sel = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const draw = () => {
      const first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay()), cells = [];
      for (let i = 0; i < 42; i++) cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
      const today = iso(now);
      root.innerHTML = `<div class="tl-card"><div class="nt-bar"><button class="btn" id="cp">‹</button><b style="min-width:10rem">${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(first)}</b><button class="btn" id="cn">›</button><button class="btn" id="ct">today</button></div>
<div class="nt-cal">${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<b>${d}</b>`).join("")}${cells.map((d) => `<button class="nt-day${d.getMonth() !== m ? " off" : ""}${iso(d) === today ? " today" : ""}${iso(d) === iso(sel) ? " sel" : ""}" data-d="${iso(d)}">${d.getDate()}</button>`).join("")}</div>
<small style="color:var(--dim)">${new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(sel)} · day ${Math.round((sel - new Date(sel.getFullYear(), 0, 0)) / 864e5)} of the year · week ${Math.ceil((((sel - new Date(sel.getFullYear(), 0, 1)) / 864e5) + new Date(sel.getFullYear(), 0, 1).getDay() + 1) / 7)}</small>
<h3 style="margin:.5rem 0 0;font-size:.8125rem;color:var(--dim);font-weight:500">days between two dates</h3><div class="nt-bar"><input class="nt-in" type="date" id="da" value="${iso(sel)}"><input class="nt-in" type="date" id="db" value="${iso(sel)}"></div><div class="nt-out"><div id="dr">–</div></div>
<h3 style="margin:.5rem 0 0;font-size:.8125rem;color:var(--dim);font-weight:500">add or subtract days</h3><div class="nt-bar"><input class="nt-in" type="date" id="dc" value="${iso(sel)}"><input class="nt-in nt-num" type="number" id="dn" value="30"></div><div class="nt-out"><div id="de">–</div></div></div>`;
      calc();
    };
    const parse = (s) => { const p = String(s).split("-").map(Number); return p.length === 3 && !p.some(isNaN) ? new Date(p[0], p[1] - 1, p[2]) : null; };
    function calc() {
      const a = parse(root.querySelector("#da")?.value), b = parse(root.querySelector("#db")?.value), c = parse(root.querySelector("#dc")?.value), n = num(root.querySelector("#dn")?.value);
      if (root.querySelector("#dr")) root.querySelector("#dr").textContent = a && b ? Math.round((b - a) / 864e5) + " days (" + (Math.round((b - a) / 864e5 / 7 * 10) / 10) + " weeks)" : "–";
      if (root.querySelector("#de")) root.querySelector("#de").textContent = c && !isNaN(n) ? new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date(c.getFullYear(), c.getMonth(), c.getDate() + Math.trunc(n))) : "–";
    }
    root.addEventListener("input", calc);
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("#cp")) { m--; if (m < 0) { m = 11; y--; } draw(); } else if (t.closest("#cn")) { m++; if (m > 11) { m = 0; y++; } draw(); }
      else if (t.closest("#ct")) { y = now.getFullYear(); m = now.getMonth(); sel = new Date(y, m, now.getDate()); draw(); }
      else if (t.closest("[data-d]")) { sel = parse(t.closest("[data-d]").dataset.d); y = sel.getFullYear(); m = sel.getMonth(); draw(); }
    });
    draw();
  }

  /* ---------- whiteboard ---------- */
  function mountBoard(root, own) {
    root.innerHTML = `<div class="tl-card"><div class="nt-bar"><input type="color" id="wc" value="#111111" style="width:3rem;height:2.5rem;border:0;border-radius:.625rem;background:var(--btn);padding:.25rem"><input type="range" id="ws" min="1" max="40" value="4" style="width:8rem"><button class="btn" id="we">eraser</button><button class="btn" id="wu">undo</button><button class="btn danger" id="wx">clear</button><button class="btn primary" id="wd">save PNG</button></div><canvas id="wb"></canvas></div>`;
    const q = (s) => root.querySelector(s), cv = q("#wb"), c = cv.getContext("2d"); let erase = false, down = false, last = null, undo = [];
    function size() { const keep = cv.width ? c.getImageData(0, 0, cv.width, cv.height) : null, w = Math.max(280, Math.floor(root.clientWidth || 600)), h = Math.round(Math.max(320, Math.min(560, innerHeight * 0.55))); cv.width = w; cv.height = h; c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); if (keep) c.putImageData(keep, 0, 0); c.lineCap = c.lineJoin = "round"; }
    size();
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener("pointerdown", (e) => { down = true; cv.setPointerCapture(e.pointerId); undo.push(c.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 25) undo.shift(); last = pos(e); c.strokeStyle = erase ? "#fff" : q("#wc").value; c.lineWidth = +q("#ws").value; c.beginPath(); c.moveTo(last[0], last[1]); c.lineTo(last[0] + 0.01, last[1]); c.stroke(); });
    cv.addEventListener("pointermove", (e) => { if (!down) return; const p = pos(e); c.beginPath(); c.moveTo(last[0], last[1]); c.lineTo(p[0], p[1]); c.stroke(); last = p; });
    const up = () => { down = false; }; cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("#we")) { erase = !erase; t.closest("#we").classList.toggle("primary", erase); }
      else if (t.closest("#wu")) { const s = undo.pop(); if (s) c.putImageData(s, 0, 0); }
      else if (t.closest("#wx")) { undo.push(c.getImageData(0, 0, cv.width, cv.height)); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); }
      else if (t.closest("#wd")) cv.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "whiteboard.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); });
    });
    root.addEventListener("input", (e) => { if (e.target.id === "wc") { erase = false; q("#we").classList.remove("primary"); } });
    const rs = () => size(); addEventListener("resize", rs); own.push(() => removeEventListener("resize", rs));
  }

  /* ---------- markdown with live preview ---------- */
  function mdRender(src) {
    const inline = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>").replace(/~~([^~]+)~~/g, "<s>$1</s>").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const lines = String(src).replace(/\r/g, "").split("\n"); let out = "", i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out += "<pre><code>" + esc(buf.join("\n")) + "</code></pre>"; continue; }
      let m;
      if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; i++; }
      else if (/^(-{3,}|\*{3,})\s*$/.test(l)) { out += "<hr>"; i++; }
      else if (/^>\s?/.test(l)) { const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, "")); out += "<blockquote>" + inline(buf.join(" ")) + "</blockquote>"; }
      else if (/^\s*[-*+]\s+/.test(l)) { out += "<ul>"; while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) out += "<li>" + inline(lines[i++].replace(/^\s*[-*+]\s+/, "")) + "</li>"; out += "</ul>"; }
      else if (/^\s*\d+[.)]\s+/.test(l)) { out += "<ol>"; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) out += "<li>" + inline(lines[i++].replace(/^\s*\d+[.)]\s+/, "")) + "</li>"; out += "</ol>"; }
      else if (!l.trim()) i++;
      else { const buf = []; while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|-{3,}$)/.test(lines[i])) buf.push(lines[i++]); out += "<p>" + inline(buf.join(" ")) + "</p>"; if (!buf.length) i++; }
    }
    return out;
  }
  function mountMd(root) {
    root.innerHTML = `<div class="tl-card"><div class="nt-two"><textarea class="tl-ta" id="mt" style="min-height:22rem;font-family:ui-monospace,monospace" spellcheck="false"></textarea><div class="nt-md" id="mp"></div></div><div class="nt-bar"><button class="btn" id="mc">copy markdown</button><button class="btn" id="mh">copy HTML</button></div></div>`;
    const ta = root.querySelector("#mt"), pv = root.querySelector("#mp");
    ta.value = kv("md", "# Hello\n\nWrite **markdown** on the left and see it on the right.\n\n- a list\n- with `code`\n\n> and a quote\n");
    const upd = () => { pv.innerHTML = mdRender(ta.value); sv("md", ta.value); };
    ta.addEventListener("input", upd);
    root.querySelector("#mc").addEventListener("click", (e) => copy(ta.value, e.currentTarget)); root.querySelector("#mh").addEventListener("click", (e) => copy(pv.innerHTML, e.currentTarget));
    upd();
  }

  /* ---------- regex tester ---------- */
  function mountRegex(root) {
    root.innerHTML = `<div class="tl-card"><div class="nt-bar"><span style="font-size:1.25rem">/</span><input class="nt-in nt-grow" id="rp" placeholder="pattern, e.g. (\\w+)@(\\w+)\\.com" autocomplete="off" spellcheck="false"><span style="font-size:1.25rem">/</span><input class="nt-in nt-num" id="rf" value="g" maxlength="6" aria-label="flags" spellcheck="false"></div><small id="re" class="tl-bad"></small>
<textarea class="tl-ta" id="rt" placeholder="text to test against"></textarea><div class="nt-pre" id="rh"></div><div class="nt-list" id="rm"></div></div>`;
    const q = (s) => root.querySelector(s); q("#rp").value = kv("rx", { p: "", t: "" }).p; q("#rt").value = kv("rx", { p: "", t: "" }).t;
    function run() {
      const p = q("#rp").value, t = q("#rt").value.slice(0, 20000); sv("rx", { p, t });
      q("#re").textContent = ""; q("#rm").innerHTML = ""; if (!p) { q("#rh").innerHTML = esc(t); return; }
      let re; try { re = new RegExp(p, [...new Set((q("#rf").value + "g").replace(/[^dgimsuvy]/g, ""))].join("")); } catch (e) { q("#re").textContent = String(e.message || e); q("#rh").innerHTML = esc(t); return; }
      let html = "", last = 0, n = 0, rows = "";
      for (const m of t.matchAll(re)) {
        if (n++ >= 300) break;
        html += esc(t.slice(last, m.index)) + '<span class="nt-mark">' + esc(m[0]) + "</span>"; last = m.index + m[0].length;
        if (n <= 40) rows += `<div class="nt-item"><span><b>${esc(m[0]) || "(empty)"}</b> <small style="color:var(--dim)">at ${m.index}</small>${m.length > 1 ? "<br><small>" + [...m].slice(1).map((g, i) => `group ${i + 1}: ${esc(g ?? "undefined")}`).join(" · ") + "</small>" : ""}</span></div>`;
      }
      q("#rh").innerHTML = html + esc(t.slice(last)); q("#rm").innerHTML = (n ? `<small style="color:var(--dim)">${n >= 300 ? "300+" : n} match${n === 1 ? "" : "es"}</small>` : '<small style="color:var(--dim)">no matches</small>') + rows;
    }
    root.addEventListener("input", run); run();
  }

  /* ---------- terminal: a command line that runs in this page, with its own saved files (nothing runs on the server) ---------- */
  function mountTerm(root, own) {
    const D = (c) => ({ t: "d", c: c || {} }), F = (d) => ({ t: "f", d: d || "" });
    let fs = kv("fs", null) || D({ home: D({ "readme.txt": F("welcome to the Nex.Velo terminal.\ntype help to see what it can do.\n") }) });
    let cwd = ["home"], hist = kv("termhist", []), hi = 0, env = { USER: NV.settings.name || "guest", HOST: "nex-velo" };
    const save = () => sv("fs", fs);
    const norm = (p) => { const parts = (p.startsWith("/") ? [] : cwd.slice()); for (const s of p.split("/")) { if (!s || s === ".") continue; if (s === "..") parts.pop(); else if (s === "~") { parts.length = 0; parts.push("home"); } else parts.push(s); } return parts; };
    const get = (parts) => { let n = fs; for (const s of parts) { if (!n || n.t !== "d" || !(s in n.c)) return null; n = n.c[s]; } return n; };
    const parent = (parts) => get(parts.slice(0, -1));
    const pstr = (parts) => "/" + parts.join("/");
    root.innerHTML = `<div class="tl-card" style="text-align:left"><div id="to" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.8125rem;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;background:#0b0b0d;color:#e6e6e6;border-radius:.875rem;padding:.875rem;min-height:22rem;max-height:60vh;overflow:auto"></div></div>`;
    const out = root.querySelector("#to");
    const print = (t, cls) => { const d = document.createElement("div"); if (cls) d.style.color = cls; d.textContent = t; out.insertBefore(d, line); out.scrollTop = out.scrollHeight; };
    const line = document.createElement("div"); line.style.display = "flex"; line.style.gap = ".5rem";
    const pr = document.createElement("span"), inp = document.createElement("input");
    inp.style.cssText = "flex:1;min-width:0;background:none;border:0;outline:none;color:inherit;font:inherit"; inp.spellcheck = false; inp.autocomplete = "off"; inp.setAttribute("autocapitalize", "off"); inp.setAttribute("aria-label", "terminal input");
    const prompt = () => { pr.textContent = env.USER + "@" + env.HOST + ":" + (cwd.length === 1 && cwd[0] === "home" ? "~" : pstr(cwd)) + "$"; pr.style.color = "#7be0a0"; };
    line.append(pr, inp); out.appendChild(line); prompt();
    const tok = (s) => { const r = []; let cur = "", q = null, has = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === q) q = null; else cur += c; } else if (c === '"' || c === "'") { q = c; has = true; } else if (/\s/.test(c)) { if (cur || has) r.push(cur); cur = ""; has = false; } else if (c === "|" || c === ">") { if (cur || has) r.push(cur); cur = ""; has = false; if (c === ">" && s[i + 1] === ">") { r.push(">>"); i++; } else r.push(c); } else cur += c; } if (cur || has) r.push(cur); return r; };
    const lsLine = (n, name) => (n.t === "d" ? name + "/" : name);
    const walk = (n, parts, f) => { f(parts, n); if (n.t === "d") for (const k of Object.keys(n.c)) walk(n.c[k], parts.concat(k), f); };
    const C = {
      help: () => "commands: help ls cd pwd cat echo mkdir touch rm cp mv clear history date whoami uname neofetch calc js open grep head tail wc sort uniq find tree env export alias\nredirect with > and >>, chain with |\nfiles live in this browser only. Ctrl+L clears, up/down shows history, tab completes.",
      ls: (a) => { const t = norm(a.find((x) => !x.startsWith("-")) || "."), n = get(t); if (!n) return "ls: no such file or directory"; if (n.t === "f") return t[t.length - 1]; const all = a.includes("-a"); return Object.keys(n.c).sort().filter((k) => all || !k.startsWith(".")).map((k) => lsLine(n.c[k], k)).join(a.includes("-l") ? "\n" : "  "); },
      cd: (a) => { const t = norm(a[0] || "~"), n = get(t); if (!n || n.t !== "d") return "cd: " + (a[0] || "") + ": not a directory"; cwd = t; prompt(); return ""; },
      pwd: () => pstr(cwd),
      cat: (a, si) => { if (!a.length) return si; return a.map((f) => { const n = get(norm(f)); return !n ? "cat: " + f + ": no such file" : n.t === "d" ? "cat: " + f + ": is a directory" : n.d; }).join(""); },
      echo: (a) => a.join(" ") + "\n",
      mkdir: (a) => { for (const f of a.filter((x) => x[0] !== "-")) { const t = norm(f), p = parent(t); if (!p || p.t !== "d") return "mkdir: can't create " + f; if (!(t[t.length - 1] in p.c)) p.c[t[t.length - 1]] = D(); } save(); return ""; },
      touch: (a) => { for (const f of a) { const t = norm(f), p = parent(t); if (!p || p.t !== "d") return "touch: can't create " + f; if (!(t[t.length - 1] in p.c)) p.c[t[t.length - 1]] = F(); } save(); return ""; },
      rm: (a) => { const rec = a.some((x) => /^-.*r/.test(x)); for (const f of a.filter((x) => x[0] !== "-")) { const t = norm(f), n = get(t), p = parent(t); if (!n) return "rm: " + f + ": no such file"; if (!t.length) return "rm: refusing to remove /"; if (n.t === "d" && !rec) return "rm: " + f + ": is a directory (use -r)"; delete p.c[t[t.length - 1]]; } save(); return ""; },
      cp: (a) => { const [s, d] = a.filter((x) => x[0] !== "-"); const n = get(norm(s || "")), t = norm(d || ""); if (!n) return "cp: no such file"; let p = get(t), name = t[t.length - 1]; if (p && p.t === "d") { p = p; name = norm(s).slice(-1)[0]; } else { p = parent(t); } if (!p) return "cp: bad destination"; p.c[name] = JSON.parse(JSON.stringify(n)); save(); return ""; },
      mv: (a) => { const r = C.cp(a); if (r) return r; C.rm(["-r", a.filter((x) => x[0] !== "-")[0]]); return ""; },
      clear: () => { [...out.children].forEach((c) => c !== line && c.remove()); return ""; },
      history: () => hist.map((h, i) => String(i + 1).padStart(4) + "  " + h).join("\n"),
      date: () => new Date().toString(), whoami: () => env.USER, uname: () => "NexOS 1.0 (browser)",
      neofetch: () => `${env.USER}@${env.HOST}\n------------------\nOS: Nex.Velo (in your browser)\nBrowser: ${navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/)?.[0] || "unknown"}\nScreen: ${screen.width}x${screen.height}\nLanguage: ${navigator.language}\nTheme: ${NV.settings.theme}\nProxy: ${NV.settings.proxy || "scramjet"}`,
      calc: (a) => { try { return fmtN(calcEval(a.join(" "), false, 0)) + "\n"; } catch (e) { return "calc: " + (e.message || e) + "\n"; } },
      js: (a) => { try { const v = Function('"use strict";return (' + a.join(" ") + ")")(); return (typeof v === "object" ? JSON.stringify(v, null, 1) : String(v)) + "\n"; } catch (e) { return "js: " + e.message + "\n"; } },
      open: (a) => { if (!a[0]) return "open: give a web address"; NV.openUrl(/^[a-z]+:\/\//i.test(a[0]) ? a[0] : "https://" + a[0]); return ""; },
      grep: (a, si) => { const f = a.filter((x) => x[0] !== "-"), re = new RegExp(f[0] || "", a.includes("-i") ? "i" : ""); const src = f[1] ? (get(norm(f[1])) || { d: "" }).d : si; return src.split("\n").filter((l) => re.test(l)).join("\n"); },
      head: (a, si) => { const n = +(a.find((x) => /^-\d+$/.test(x)) || "-10").slice(1), f = a.find((x) => x[0] !== "-"); return (f ? (get(norm(f)) || { d: "" }).d : si).split("\n").slice(0, n).join("\n"); },
      tail: (a, si) => { const n = +(a.find((x) => /^-\d+$/.test(x)) || "-10").slice(1), f = a.find((x) => x[0] !== "-"); const l = (f ? (get(norm(f)) || { d: "" }).d : si).replace(/\n$/, "").split("\n"); return l.slice(-n).join("\n"); },
      wc: (a, si) => { const f = a.find((x) => x[0] !== "-"), t = f ? (get(norm(f)) || { d: "" }).d : si; return `${t.split("\n").length - (t.endsWith("\n") ? 1 : 0)} ${t.trim() ? t.trim().split(/\s+/).length : 0} ${t.length}`; },
      sort: (a, si) => { const f = a.find((x) => x[0] !== "-"), l = (f ? (get(norm(f)) || { d: "" }).d : si).replace(/\n$/, "").split("\n").sort(); return (a.includes("-r") ? l.reverse() : l).join("\n"); },
      uniq: (a, si) => si.replace(/\n$/, "").split("\n").filter((l, i, arr) => l !== arr[i - 1]).join("\n"),
      find: (a) => { const n = get(norm(a[0] && a[0][0] !== "-" ? a[0] : ".")), pat = a[a.indexOf("-name") + 1], re = pat ? new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$") : null, base = norm(a[0] && a[0][0] !== "-" ? a[0] : "."), res = []; if (!n) return "find: no such directory"; walk(n, base, (p) => { if (!re || re.test(p[p.length - 1] || "")) res.push(pstr(p)); }); return res.join("\n"); },
      tree: (a) => { const n = get(norm(a[0] || ".")); if (!n) return "tree: no such directory"; const lines = []; const rec = (nd, pre) => { const ks = Object.keys(nd.c).sort(); ks.forEach((k, i) => { lines.push(pre + (i === ks.length - 1 ? "└── " : "├── ") + k); if (nd.c[k].t === "d") rec(nd.c[k], pre + (i === ks.length - 1 ? "    " : "│   ")); }); }; lines.push("."); if (n.t === "d") rec(n, ""); return lines.join("\n"); },
      env: () => Object.entries(env).map(([k, v]) => k + "=" + v).join("\n"),
      export: (a) => { for (const x of a) { const i = x.indexOf("="); if (i > 0) env[x.slice(0, i)] = x.slice(i + 1); } prompt(); return ""; },
      alias: () => "aliases aren't supported yet",
    };
    function run(text) {
      const t = tok(text.replace(/\$([A-Za-z_]+)/g, (m, k) => env[k] ?? "")); if (!t.length) return;
      const stages = [[]]; let redir = null;
      for (let i = 0; i < t.length; i++) { if (t[i] === "|") stages.push([]); else if (t[i] === ">" || t[i] === ">>") { redir = [t[i], t[++i]]; } else stages[stages.length - 1].push(t[i]); }
      let si = "";
      for (const st of stages) {
        const cmd = st[0]; if (!cmd) continue; const f = C[cmd];
        if (!f) { print(cmd + ": command not found. type help", "#ff8a8a"); return; }
        try { si = String(f(st.slice(1), si) ?? ""); } catch (e) { print(cmd + ": " + (e.message || e), "#ff8a8a"); return; }
      }
      if (redir) { const t2 = norm(redir[1] || ""), p = parent(t2); if (!redir[1] || !p || p.t !== "d") { print("can't write to " + redir[1], "#ff8a8a"); return; } const nm = t2[t2.length - 1]; p.c[nm] = F((redir[0] === ">>" && p.c[nm] && p.c[nm].t === "f" ? p.c[nm].d : "") + si); save(); }
      else if (si) print(si.replace(/\n$/, ""));
    }
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { const v = inp.value; print(pr.textContent + " " + v, "#9aa0a6"); if (v.trim()) { hist.push(v); hist = hist.slice(-100); sv("termhist", hist); } hi = hist.length; inp.value = ""; run(v); prompt(); out.scrollTop = out.scrollHeight; }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) inp.value = hist[--hi]; }
      else if (e.key === "ArrowDown") { e.preventDefault(); inp.value = hi < hist.length - 1 ? hist[++hi] : (hi = hist.length, ""); }
      else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); C.clear(); }
      else if (e.key === "c" && e.ctrlKey) { print(pr.textContent + " " + inp.value + "^C", "#9aa0a6"); inp.value = ""; }
      else if (e.key === "Tab") { e.preventDefault(); const parts = inp.value.split(/\s+/), last = parts.pop() || ""; let cands; if (!parts.length) cands = Object.keys(C); else { const i = last.lastIndexOf("/"), dir = get(norm(i >= 0 ? last.slice(0, i + 1) || "/" : ".")); cands = dir && dir.t === "d" ? Object.keys(dir.c).map((k) => (i >= 0 ? last.slice(0, i + 1) : "") + k + (dir.c[k].t === "d" ? "/" : "")) : []; } const m = cands.filter((c) => c.startsWith(last)); if (m.length === 1) inp.value = parts.concat(m[0]).join(" ") + (m[0].endsWith("/") ? "" : " "); else if (m.length > 1) print(m.join("  ")); }
    });
    out.addEventListener("click", () => { if (!getSelection().toString()) inp.focus(); });
    print("Nex.Velo terminal. this is a safe command line that runs in your browser. type help.", "#7be0a0");
    inp.focus();
  }

  /* ---------- virtual machine: v86, a free x86 emulator that runs in the browser (nothing runs on the server) ---------- */
  function mountVm(root, own) {
    const PRESETS = [
      ["kolibri", "KolibriOS (a tiny desktop system)", "fda", "kolibri.img", 64],
      ["linux4", "Linux (command line)", "cdrom", "linux4.iso", 128],
      ["tinycore", "Tiny Core Linux (desktop)", "cdrom", "TinyCore-11.0.iso", 256],
      ["freedos", "FreeDOS", "fda", "freedos722.img", 32],
      ["kernel", "Linux kernel only (Buildroot)", "bzimage", "buildroot-bzimage68.bin", 128],
    ];
    root.innerHTML = `<div class="tl-card"><div class="nt-bar"><select class="nt-in" id="vp">${PRESETS.map((p) => `<option value="${p[0]}">${p[1]}</option>`).join("")}<option value="custom">my own image file…</option></select>
<select class="nt-in" id="vmem">${[32, 64, 128, 256, 512].map((m) => `<option value="${m}">${m} MB memory</option>`).join("")}</select><button class="btn primary" id="vgo">start</button><button class="btn" id="vstop" disabled>stop</button></div>
<div class="nt-bar" id="vc" hidden><select class="nt-in" id="vt"><option value="cdrom">CD-ROM (.iso)</option><option value="fda">floppy (.img)</option><option value="hda">hard disk (.img)</option><option value="bzimage">Linux kernel (bzImage)</option></select><input type="file" id="vf" class="nt-in nt-grow"></div>
<div id="vs" tabindex="0" style="background:#000;color:#ddd;border-radius:.75rem;overflow:auto;min-height:18rem;text-align:left"><div style="white-space:pre;font:14px monospace;line-height:14px"></div><canvas style="display:none;max-width:100%"></canvas></div>
<div class="nt-bar"><button class="btn" id="vcad" disabled>Ctrl+Alt+Del</button><button class="btn" id="vfs" disabled>full screen</button><button class="btn" id="vmouse" disabled>capture mouse</button><button class="btn" id="vpause" disabled>pause</button></div>
<small id="vmsg" style="color:var(--dim)">pick a system and press start. click the screen to type into it. a free, safe computer inside this page. it has no internet and forgets its files when stopped.</small></div>`;
    const q = (s) => root.querySelector(s), msg = (t) => { q("#vmsg").textContent = t; };
    let emu = null, paused = false;
    const sameOrigin = async (u) => { try { const r = await fetch(u, { method: "HEAD" }); return r.ok && !/html/i.test(r.headers.get("content-type") || ""); } catch { return false; } };
    const firstOk = async (urls) => { for (const u of urls) if (await sameOrigin(u)) return u; return null; };
    async function loadLib() {
      if (window.V86) return;
      const lib = await firstOk(["/v86/libv86.js", "https://cdn.jsdelivr.net/npm/v86@latest/build/libv86.js"]);
      if (!lib) throw new Error("couldn't find the v86 emulator (libv86.js). add the v86 package so it is copied to public/v86, or check that cdn.jsdelivr.net is reachable");
      await new Promise((ok, no) => { const s = document.createElement("script"); s.src = lib; s.onload = ok; s.onerror = () => no(new Error("couldn't load " + lib)); document.head.appendChild(s); });
      if (!window.V86) throw new Error("the emulator loaded but didn't start");
    }
    const setBtns = (on) => ["#vstop", "#vcad", "#vfs", "#vmouse", "#vpause"].forEach((s) => { q(s).disabled = !on; });
    function stop() { if (emu) { try { emu.destroy(); } catch {} emu = null; } paused = false; q("#vpause").textContent = "pause"; setBtns(false); q("#vgo").disabled = false; const sc = q("#vs"); sc.innerHTML = '<div style="white-space:pre;font:14px monospace;line-height:14px"></div><canvas style="display:none;max-width:100%"></canvas>'; }
    own.push(stop);
    q("#vp").addEventListener("change", () => { const c = q("#vp").value === "custom"; q("#vc").hidden = !c; const p = PRESETS.find((x) => x[0] === q("#vp").value); if (p) q("#vmem").value = String(p[4]); });
    q("#vp").dispatchEvent(new Event("change"));
    q("#vgo").addEventListener("click", async () => {
      stop(); q("#vgo").disabled = true;
      try {
        msg("loading the emulator…"); await loadLib();
        const wasm = await firstOk(["/v86/v86.wasm", "https://cdn.jsdelivr.net/npm/v86@latest/build/v86.wasm"]);
        const bios = await firstOk(["/v86/seabios.bin", "https://cdn.jsdelivr.net/gh/copy/v86@master/bios/seabios.bin"]);
        const vga = await firstOk(["/v86/vgabios.bin", "https://cdn.jsdelivr.net/gh/copy/v86@master/bios/vgabios.bin"]);
        if (!wasm || !bios || !vga) throw new Error("couldn't find the emulator's " + (!wasm ? "v86.wasm" : !bios ? "seabios.bin" : "vgabios.bin") + " file");
        const cfg = { wasm_path: wasm, memory_size: +q("#vmem").value * 1024 * 1024, vga_memory_size: 8 * 1024 * 1024, screen_container: q("#vs"), bios: { url: bios }, vga_bios: { url: vga }, autostart: true };
        const id = q("#vp").value;
        if (id === "custom") {
          const f = q("#vf").files[0]; if (!f) throw new Error("choose an image file first");
          msg("reading " + f.name + "…"); cfg[q("#vt").value] = { buffer: await f.arrayBuffer() };
          if (q("#vt").value === "hda" || q("#vt").value === "cdrom") cfg.boot_order = q("#vt").value === "cdrom" ? 0x213 : 0x312;
        } else {
          const p = PRESETS.find((x) => x[0] === id), url = await firstOk(["/vm/" + p[3], "https://i.copy.sh/" + p[3]]);
          if (!url) throw new Error("couldn't download " + p[3] + ". the host may block other sites. download it yourself and either upload it to public/vm/ or use \"my own image file\"");
          cfg[p[2]] = { url };
        }
        msg("starting…"); emu = new window.V86(cfg);
        emu.add_listener("emulator-ready", () => { msg("running. click the screen to type into it."); setBtns(true); });
        q("#vs").focus();
      } catch (e) { msg(String((e && e.message) || e)); q("#vgo").disabled = false; }
    });
    q("#vstop").addEventListener("click", () => { stop(); msg("stopped."); });
    q("#vcad").addEventListener("click", () => { if (emu) emu.keyboard_send_scancodes([0x1d, 0x38, 0x53, 0xd3, 0xb8, 0x9d]); });
    q("#vfs").addEventListener("click", () => { if (emu) emu.screen_go_fullscreen(); });
    q("#vmouse").addEventListener("click", () => { if (emu) emu.lock_mouse(); });
    q("#vpause").addEventListener("click", () => { if (!emu) return; paused = !paused; paused ? emu.stop() : emu.run(); q("#vpause").textContent = paused ? "resume" : "pause"; });
    // the keyboard only goes to the machine while its screen is the thing you clicked
    const kb = (e) => { if (emu && emu.keyboard_set_status) emu.keyboard_set_status(!!e.target.closest && !!e.target.closest("#vs")); };
    document.addEventListener("pointerdown", kb, true); own.push(() => document.removeEventListener("pointerdown", kb, true));
  }

  const TOOLS = [
    { id: "clock", name: "clock", desc: "your time, or any country's time", ic: "clock", mount: mountClock },
    { id: "password", name: "password generator", desc: "strong random passwords you can copy", ic: "password", mount: mountPassword },
    { id: "random-number", name: "random number", desc: "pick the range and how many", ic: "random", mount: mountRandom },
    { id: "word-counter", name: "word counter", desc: "words, characters, reading time", ic: "words", mount: mountWords },
    { id: "timestamp", name: "timestamp converter", desc: "unix time to dates and back", ic: "time", mount: mountTime },
    { id: "colour", name: "color tools", desc: "pick, convert, contrast", ic: "colour", mount: mountColour },
    { id: "website-iframe", name: "website to iframe", desc: "the HTML to embed any website", ic: "iframe", mount: mountIframe },
    { id: "case", name: "text case", desc: "upper, lower, title, camel, snake", ic: "case", mount: mountCase },
    { id: "encode", name: "base64 and url", desc: "encode and decode text", ic: "encode", mount: mountEncode },
    { id: "json", name: "json formatter", desc: "format, minify and check JSON", ic: "json", mount: mountJson },
    { id: "dice", name: "dice and coin", desc: "roll dice or flip a coin", ic: "dice", mount: mountDice },
    { id: "timer", name: "stopwatch and timer", desc: "keeps running when you leave", ic: "timer", mount: mountTimer },
    { id: "pomodoro", name: "pomodoro", desc: "focus and break cycles", ic: "timer", mount: mountPomo },
    { id: "world-clock", name: "world clock", desc: "times around the globe", ic: "world", mount: mountWorld },
    { id: "flashcards", name: "flashcards", desc: "build decks and study with flip cards", ic: "flash", mount: mountFlash },
    { id: "grades", name: "grade calculator", desc: "weighted grades, final score and GPA", ic: "grade", mount: mountGrades },
    { id: "citations", name: "citations", desc: "MLA and APA citation generator", ic: "cite", mount: mountCite },
    { id: "calculator", name: "calculator", desc: "scientific calculator", ic: "calc", mount: mountCalc },
    { id: "notes", name: "notes", desc: "autosaved scratchpad", ic: "note", mount: mountNotes },
    { id: "todo", name: "to-do", desc: "checklist and tasks", ic: "todo", mount: mountTodo },
    { id: "converter", name: "converter", desc: "units and measures", ic: "convert", mount: mountConvert },
    { id: "hash", name: "hash generator", desc: "SHA-1, SHA-256, SHA-512", ic: "hash", mount: mountHash },
    { id: "picker", name: "random picker and uuid", desc: "pick from a list, make uuids", ic: "pick", mount: mountPicker },
    { id: "qr-code", name: "QR code", desc: "make a QR from text", ic: "qr", mount: mountQr },
    { id: "calendar", name: "calendar", desc: "month view and date math", ic: "cal", mount: mountCal },
    { id: "whiteboard", name: "whiteboard", desc: "sketch and save a PNG", ic: "board", mount: mountBoard },
    { id: "markdown", name: "markdown", desc: "write with live preview", ic: "md", mount: mountMd },
    { id: "regex", name: "regex", desc: "test patterns live", ic: "regex", mount: mountRegex },
    { id: "vm", name: "virtual machine", desc: "run Linux, KolibriOS or DOS in a window", ic: "vm", mount: mountVm },
    { id: "terminal", name: "terminal", desc: "a command line with its own files", ic: "term", mount: mountTerm },
  ];

  page.innerHTML = `<div class="gpage">
<div id="tl-home" class="gbrowse"><div class="ghead"><h2>tools</h2><input id="tl-q" type="text" placeholder="find a tool" autocomplete="off" spellcheck="false"><small id="tl-count"></small></div>
<div class="gscroll"><div class="tl-grid" id="tl-grid"></div><div class="msg" id="tl-none" hidden>no tool matches that.</div></div></div>
<div id="tl-view" class="gbrowse" hidden><div class="ghead"><button class="btn" id="tl-back" style="display:inline-flex;align-items:center;gap:.375rem">${BACK}all tools</button><b id="tl-title"></b></div>
<div class="gscroll"><div class="tl-wrap" id="tl-body"></div></div></div></div>`;

  let curTool = "", cleanup = [];
  function paintGrid() {
    const f = $("#tl-q").value.trim().toLowerCase();
    const list = TOOLS.filter((t) => !f || (t.name + " " + t.desc).includes(f));
    $("#tl-grid").innerHTML = list.map((t) => `<button class="tl-tile" data-id="${t.id}" type="button"><svg viewBox="0 0 24 24">${IC[t.ic]}</svg><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join("");
    $("#tl-none").hidden = !!list.length; $("#tl-count").textContent = list.length + " tool" + (list.length === 1 ? "" : "s");
  }
  function leave() { cleanup.forEach((f) => { try { f(); } catch {} }); cleanup = []; curTool = ""; $("#tl-body").innerHTML = ""; $("#tl-view").hidden = true; $("#tl-home").hidden = false; NV.syncChrome(); }
  function open(id) {
    const t = TOOLS.find((x) => x.id === id); if (!t) return;
    cleanup.forEach((f) => { try { f(); } catch {} }); cleanup = [];
    curTool = id; $("#tl-home").hidden = true; $("#tl-view").hidden = false; $("#tl-title").textContent = t.name;
    const body = $("#tl-body"); body.innerHTML = "";
    const host = document.createElement("div"); body.appendChild(host); // a fresh element per tool, so one tool's listeners never leak into the next
    t.mount(host, cleanup); NV.syncChrome();
  }
  $("#tl-grid").addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b) open(b.dataset.id); });
  $("#tl-back").addEventListener("click", leave);
  $("#tl-q").addEventListener("input", paintGrid);
  NV.toolsShow = (sub) => { const s = String(sub || "").toLowerCase(), t = TOOLS.find((x) => x.id === s || x.id.startsWith(s)); if (t) open(t.id); };
  NV.toolsCurrent = () => curTool;
  NV.onToolsOpen = () => {};
  paintGrid();
  NV.loaded.tools = true;
})();
