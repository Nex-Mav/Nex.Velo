/* Ad-free keys. People type a key (NXVL-0000-0000) into Settings > About to switch off the ads that Nex.Velo places itself.
   Typing the admin code there instead unlocks an "admin" section in Settings, where keys are made and watched.
   Everything is checked on the server (lib/keys.js). Ad blocking for the pages you browse is separate and always stays on.
   Anything that is an ad of ours should carry the attribute data-nv-ad. It is hidden while a key is active. */
(() => {
  "use strict";
  const NV = window.NV;
  if (!NV || window.__nvAdKeys) return;
  window.__nvAdKeys = true;
  const { LS, esc, toast } = NV;
  const $ = (s, r = document) => r.querySelector(s);

  const post = async (path, body) => {
    const r = await fetch(NV.api(path), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    let d = {}; try { d = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(d.error || "the server answered " + r.status); e.status = r.status; throw e; }
    return d;
  };
  const device = (() => { let d = LS.get("nexvelo.device", ""); if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); LS.set("nexvelo.device", d); } return d; })();
  const left = (ms, life) => {
    if (life || ms == null) return "lifetime";
    if (ms <= 0) return "expired";
    const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
    return (d ? d + "d " : "") + (d || h ? h + "h " : "") + (m % 60) + "m";
  };

  document.head.appendChild(Object.assign(document.createElement("style"), { textContent: "body.nv-adfree [data-nv-ad]{display:none!important}#adkey-box .fld{margin-bottom:.75rem}#sec-admin .row{margin-bottom:.75rem}#ak-custom{display:flex;gap:.5rem;flex-wrap:wrap}#ak-custom input{width:5.5rem}" }));

  /* ---------- the person's key ---------- */
  let st = null; try { st = JSON.parse(LS.get("nexvelo.adkey", "null")); } catch {}
  let timer = 0;
  const on = () => !!st && (st.expiresAt == null || Date.now() < st.expiresAt);
  function paint() {
    const box = $("#adkey-status"); if (!box) return;
    box.textContent = on() ? "ad-free is on (" + (st.expiresAt == null ? "lifetime" : left(st.expiresAt - Date.now()) + " left") + ")" : "ads are on";
    const c = $("#adkey-clear"); if (c) c.hidden = !st;
  }
  function apply() {
    document.body.classList.toggle("nv-adfree", on());
    NV.adFree = on;
    clearTimeout(timer);
    if (st && st.expiresAt) { const ms = st.expiresAt - Date.now(); if (ms > 0) timer = setTimeout(expire, Math.min(ms + 500, 2 ** 31 - 1)); else expire(); }
    paint(); window.dispatchEvent(new Event("nv-adfree"));
  }
  function expire() {
    if (st && st.expiresAt && Date.now() >= st.expiresAt) { st = null; LS.del("nexvelo.adkey"); toast("your ad-free key has run out, so ads are back on"); }
    apply();
  }
  async function verify() {
    if (!st) return;
    try {
      const d = await post("/api/keys/check", { key: st.key, device });
      if (!d.active) { st = null; LS.del("nexvelo.adkey"); toast("your ad-free key is no longer valid, so ads are back on"); }
      else if (d.expiresAt !== st.expiresAt) { st.expiresAt = d.expiresAt; LS.set("nexvelo.adkey", JSON.stringify(st)); }
      apply();
    } catch { /* the server can't be reached: keep what is saved */ }
  }
  async function redeem(code) {
    const d = await post("/api/keys/redeem", { key: code, device, name: NV.settings.name || "" });
    st = { key: code.toUpperCase(), expiresAt: d.expiresAt }; LS.set("nexvelo.adkey", JSON.stringify(st)); apply();
    toast("ad-free key accepted");
  }

  /* ---------- admin ---------- */
  const TK = "nexvelo.admintoken";
  let admin = null; try { const t = JSON.parse(LS.get(TK, "null")); if (t && t.exp > Date.now()) admin = t; } catch {}
  let list = [], fetchedAt = 0, ticker = 0;
  const call = async (path, body) => {
    try { return await post(path, { token: admin && admin.token, ...body }); }
    catch (e) { if (e.status === 401 && admin) { lock(); } throw e; }
  };
  function lock() { admin = null; LS.del(TK); clearInterval(ticker); const b = $("#nb-admin"); if (b) b.remove(); const s = $("#sec-admin"); if (s) { if (s.classList.contains("on")) NV.openSettings("general"); s.remove(); } }
  function unlock() {
    if ($("#sec-admin")) return;
    const nav = $(".snav"), pane = $(".spane"), about = $('.snav .nb[data-sec="about"]'); if (!nav || !pane) return;
    const b = document.createElement("button"); b.className = "nb"; b.id = "nb-admin"; b.dataset.sec = "admin";
    b.innerHTML = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>admin';
    about ? about.before(b) : nav.appendChild(b);
    const s = document.createElement("div"); s.className = "sec"; s.id = "sec-admin";
    s.innerHTML = `<h2>admin</h2><p>make ad-free keys and see who is using them. only people who entered the admin code see this section. a key's time starts when someone first enters it.</p>
<h3>make keys</h3>
<div class="row"><label class="fld" style="margin:0"><span>how long it lasts</span><select id="ak-len"><option value="life">lifetime</option><option value="365">1 year</option><option value="183">6 months</option><option value="30" selected>1 month</option><option value="custom">custom</option></select></label>
<div id="ak-custom" hidden><label class="fld" style="margin:0"><span>days</span><input type="text" id="ak-d" value="0" inputmode="numeric"></label><label class="fld" style="margin:0"><span>hours</span><input type="text" id="ak-h" value="0" inputmode="numeric"></label><label class="fld" style="margin:0"><span>minutes</span><input type="text" id="ak-m" value="0" inputmode="numeric"></label></div></div>
<div class="row"><label class="fld" style="margin:0;flex:1;min-width:12rem"><span>who is it for (optional)</span><input type="text" id="ak-label" maxlength="60" autocomplete="off"></label><label class="fld" style="margin:0"><span>how many</span><input type="text" id="ak-n" value="1" inputmode="numeric" style="width:5rem"></label><button class="btn primary" id="ak-make" type="button">generate</button></div>
<div id="ak-new"></div><div id="status-ak" style="min-height:1.25rem;font-size:.8125rem;color:var(--dim)"></div>
<h3>all keys</h3><div class="row"><button class="btn" id="ak-refresh" type="button">refresh</button><button class="btn danger" id="ak-out" type="button">lock admin</button></div><div id="ak-list"></div>`;
    pane.appendChild(s);
    $("#ak-len", s).addEventListener("change", (e) => { $("#ak-custom", s).hidden = e.target.value !== "custom"; });
    $("#ak-make", s).addEventListener("click", make);
    $("#ak-refresh", s).addEventListener("click", refresh);
    $("#ak-out", s).addEventListener("click", () => { lock(); toast("admin locked"); });
    s.addEventListener("click", async (e) => {
      const a = e.target.closest("[data-a]"); if (!a) return;
      const k = a.closest("[data-k]").dataset.k;
      if (a.dataset.a === "copy") { try { await navigator.clipboard.writeText(k); toast("copied " + k); } catch { toast(k); } return; }
      if (a.dataset.a === "delete" && !confirm("delete " + k + " for good?")) return;
      if (a.dataset.a === "reset" && !confirm("let " + k + " be used again from a new device, with its full time?")) return;
      try { await call("/api/admin/keys/" + a.dataset.a, { key: k }); refresh(); } catch (er) { toast(er.message); }
    });
    refresh(); clearInterval(ticker); ticker = setInterval(() => { if ($("#sec-admin.on")) { if (Date.now() - fetchedAt > 30000) refresh(); else draw(); } }, 15000);
  }
  async function make() {
    const s = $("#sec-admin"), v = $("#ak-len", s).value, say = (t) => { $("#status-ak", s).textContent = t; };
    const body = { label: $("#ak-label", s).value.trim(), count: Math.max(1, Math.min(20, parseInt($("#ak-n", s).value, 10) || 1)) };
    if (v === "life") body.lifetime = true;
    else if (v === "custom") { const n = (id) => Math.max(0, parseInt($(id, s).value, 10) || 0); body.durationMs = ((n("#ak-d") * 24 + n("#ak-h")) * 60 + n("#ak-m")) * 60000; }
    else body.durationMs = +v * 86400000;
    try {
      say("making…"); const d = await call("/api/admin/keys/create", body); say("");
      $("#ak-new", s).innerHTML = '<div class="sv-row on" style="flex-direction:column;align-items:flex-start"><small>new keys (tap to copy)</small>' + d.keys.map((k) => `<b data-k="${esc(k.key)}" data-a="copy" style="cursor:pointer;min-width:0">${esc(k.key)}</b>`).join("") + "</div>";
      refresh();
    } catch (e) { say(e.message); }
  }
  async function refresh() {
    try { const d = await call("/api/admin/keys", {}); list = d.keys || []; fetchedAt = Date.now(); draw(); } catch (e) { const el = $("#ak-list"); if (el) el.innerHTML = '<div class="msg">' + esc(e.message) + "</div>"; }
  }
  function draw() {
    const el = $("#ak-list"); if (!el) return;
    const age = Date.now() - fetchedAt;
    el.innerHTML = list.length ? list.map((k) => {
      const who = k.user ? k.user + (k.device ? " (" + k.device + ")" : "") : k.device ? "device " + k.device : "nobody yet";
      const t = k.status === "unused" ? (k.lifetime ? "lifetime" : left(k.durationMs) + " once used") : k.status === "revoked" ? "revoked" : left(k.timeLeftMs == null ? null : k.timeLeftMs - age, k.lifetime);
      return `<div class="sv-row${k.status === "active" ? " on" : ""}" data-k="${esc(k.key)}"><b>${esc(k.key)}</b><small>${esc(k.label ? k.label + " · " : "")}${esc(k.status)} · ${esc(who)} · ${esc(t)}</small><button class="btn" data-a="copy">copy</button>${k.status === "revoked" ? '<button class="btn" data-a="restore">restore</button>' : '<button class="btn" data-a="revoke">revoke</button>'}<button class="btn" data-a="reset">reset device</button><button class="btn danger" data-a="delete">delete</button></div>`;
    }).join("") : '<div class="msg">no keys yet.</div>';
  }

  /* ---------- the box in Settings > About ---------- */
  function buildAbout() {
    const about = $("#sec-about"); if (!about || $("#adkey-box")) return;
    const box = document.createElement("div"); box.id = "adkey-box";
    box.innerHTML = `<h3>ad-free key</h3><p>got a key? type it here to remove the ads Nex.Velo places itself. blocking ads on the pages you browse is separate and always on.</p>
<label class="fld"><span>key</span><input type="text" id="adkey-in" placeholder="NXVL-0000-0000" autocomplete="off" spellcheck="false" autocapitalize="characters" maxlength="14"></label>
<div class="row"><button class="btn primary" id="adkey-go" type="button">use key</button><button class="btn danger" id="adkey-clear" type="button" hidden>remove key</button></div><div id="adkey-status" style="margin-top:.5rem;font-size:.8125rem;color:var(--dim)"></div>`;
    const row = $(".about-row", about); row ? row.before(box) : about.appendChild(box);
    const inp = $("#adkey-in", box), status = $("#adkey-status", box);
    inp.addEventListener("input", () => { let v = inp.value.toUpperCase(); if (!/^\d{0,6}$/.test(v)) { v = v.replace(/[^A-Z0-9]/g, ""); if (v.startsWith("NXVL")) v = v.slice(0, 4) + (v.length > 4 ? "-" + v.slice(4, 8) : "") + (v.length > 8 ? "-" + v.slice(8, 12) : ""); } inp.value = v; });
    const go = async () => {
      const v = inp.value.trim(); if (!v) return;
      status.textContent = "checking…";
      try {
        if (/^\d{6}$/.test(v)) { const d = await post("/api/admin/login", { code: v }); admin = { token: d.token, exp: Date.now() + d.expiresIn - 60000 }; LS.set(TK, JSON.stringify(admin)); inp.value = ""; unlock(); status.textContent = ""; toast("admin unlocked"); NV.openSettings("admin"); return; }
        await redeem(v); inp.value = ""; paint();
      } catch (e) { status.textContent = /^\d{6}$/.test(v) ? "that isn't a valid key" : e.message; }
    };
    $("#adkey-go", box).addEventListener("click", go);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    $("#adkey-clear", box).addEventListener("click", () => { st = null; LS.del("nexvelo.adkey"); apply(); });
    setInterval(paint, 20000); paint();
  }

  buildAbout(); if (admin) unlock(); apply();
  setTimeout(verify, 3000); setInterval(verify, 10 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) verify(); });
})();
