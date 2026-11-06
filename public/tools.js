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
.tl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:.75rem;max-width:62rem;margin:0 auto}
.tl-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;padding:1.125rem 1rem;border-radius:1rem;text-align:center;min-width:0}
.tl-tile svg{width:1.5rem;height:1.5rem;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.tl-tile b{font-weight:500;font-size:.875rem}
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

  function mountClock(root, own) {
    const store = (k, d) => { try { return JSON.parse(NV.LS.get("nexvelo.clock." + k, "null")) ?? d; } catch { return d; } };
    const put = (k, v) => NV.LS.set("nexvelo.clock." + k, JSON.stringify(v));
    let main = store("main", "local"), list = store("list", ["America/New_York", "Europe/London", "Asia/Tokyo"]).filter(validTz), h24 = store("h24", NV.settings.h24 !== false);
    if (main !== "local" && !validTz(main)) main = "local";
    const ticks = Array.from({ length: 12 }, (_, i) => `<line x1="50" y1="6" x2="50" y2="${i % 3 ? 9.5 : 12}" transform="rotate(${i * 30} 50 50)" stroke="var(--fg)" stroke-width="${i % 3 ? .8 : 1.6}" opacity=".55"/>`).join("");
    const options = (withLocal, selected) => {
      const known = new Set(ZONES.map((z) => z[1]));
      return (withLocal ? `<option value="local"${selected === "local" ? " selected" : ""}>${esc(zoneLabel("local"))}</option>` : "") +
        `<optgroup label="countries and cities">${ZONES.map(([l, z]) => `<option value="${z}"${selected === z ? " selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>` +
        `<optgroup label="every time zone">${allZones().filter((z) => !known.has(z)).map((z) => `<option value="${z}"${selected === z ? " selected" : ""}>${esc(z.replace(/_/g, " "))}</option>`).join("")}</optgroup>`;
    };
    root.innerHTML = `<div class="tl-card">
<svg viewBox="0 0 100 100" width="168" height="168" role="img" aria-label="Analog clock" style="align-self:center"><circle cx="50" cy="50" r="47" fill="var(--btn)" stroke="color-mix(in srgb,var(--fg) 22%,transparent)"/>${ticks}
<line id="ck-h" x1="50" y1="50" x2="50" y2="29" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round"/><line id="ck-m" x1="50" y1="50" x2="50" y2="17" stroke="var(--fg)" stroke-width="2.2" stroke-linecap="round"/><line id="ck-s" x1="50" y1="56" x2="50" y2="12" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/><circle cx="50" cy="50" r="2.6" fill="var(--accent)"/></svg>
<div><div class="tl-big" id="ck-time"></div><div id="ck-date" style="margin-top:.25rem"></div><small id="ck-diff" style="color:var(--dim)"></small></div>
<label class="fld"><span>show the time in</span><select class="tl-in" id="ck-main">${options(true, main)}</select></label>
<div>${toggle("ck-24", "24-hour clock", "", h24)}</div>
<label class="fld"><span>add another country or city</span><select class="tl-in" id="ck-add"><option value="">choose a place…</option>${options(false, "")}</select></label>
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
    q("#ck-main").addEventListener("change", (e) => { main = e.target.value; put("main", main); paint(); });
    q("#ck-24").addEventListener("change", (e) => { h24 = e.target.checked; put("h24", h24); paint(); });
    q("#ck-add").addEventListener("change", (e) => { const z = e.target.value; e.target.value = ""; if (z && !list.includes(z)) { list.push(z); put("list", list); paint(); } });
    q("#ck-list").addEventListener("click", (e) => { const b = e.target.closest("[data-rm]"); if (b) { list.splice(+b.dataset.rm, 1); put("list", list); paint(); } });
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
  const TOOLS = [
    { id: "clock", name: "clock", desc: "your time, or any country's time", ic: "clock", mount: mountClock },
    { id: "password", name: "password generator", desc: "strong random passwords you can copy", ic: "password", mount: mountPassword },
    { id: "random-number", name: "random number", desc: "pick the range and how many", ic: "random", mount: mountRandom },
    { id: "word-counter", name: "word counter", desc: "words, characters, reading time", ic: "words", mount: mountWords },
    { id: "timestamp", name: "timestamp converter", desc: "unix time to dates and back", ic: "time", mount: mountTime },
    { id: "colour", name: "colour converter", desc: "hex, rgb, hsl, cmyk and contrast", ic: "colour", mount: mountColour },
    { id: "website-iframe", name: "website to iframe", desc: "the HTML to embed any website", ic: "iframe", mount: mountIframe },
    { id: "case", name: "text case", desc: "upper, lower, title, camel, snake", ic: "case", mount: mountCase },
    { id: "encode", name: "base64 and url", desc: "encode and decode text", ic: "encode", mount: mountEncode },
    { id: "json", name: "json formatter", desc: "format, minify and check JSON", ic: "json", mount: mountJson },
    { id: "dice", name: "dice and coin", desc: "roll dice or flip a coin", ic: "dice", mount: mountDice },
    { id: "timer", name: "stopwatch and timer", desc: "keeps running when you leave", ic: "timer", mount: mountTimer },
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
    $("#tl-grid").innerHTML = list.map((t) => `<button class="tl-tile btn" data-id="${t.id}"><svg viewBox="0 0 24 24">${IC[t.ic]}</svg><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join("");
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