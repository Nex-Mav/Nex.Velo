/* Ad-free keys. People type a key (NXVL-0000-0000) into Settings > About to switch off the ads that Nex.Velo places itself.
   Settings > Admin Panel is where keys are made and watched. It asks for the admin code every time it is opened after the session ends.
   Everything is checked on a key server (the keys part of server.js on Cloudflare), never in this file.
   Ads of ours should carry the attribute data-nv-ad. It is hidden while a key is active. Ad blocking for browsed pages is separate. */
(() => {
  "use strict";
  const NV = window.NV;
  if (!NV || window.__nvAdKeys) return;
  window.__nvAdKeys = true;
  const { LS, esc, toast } = NV;
  const $ = (s, r = document) => r.querySelector(s);

  // key servers, tried in this order. the first one that answers is used, so keys made on one are checked on the same one.
  const BASES = () => [...new Set(["https://nex-velo-keys.nexero.workers.dev", "https://nex-velo.nexero.workers.dev", NV.api("")])];
  const post = async (path, body) => {
    let last = "";
    for (const base of BASES()) {
      try {
        const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const d = await r.json().catch(() => null);
        if (!d || d.nxvl !== 1) { last = "answered, but it isn't the key server"; continue; } // some other server, or its own "not found"
        if (r.ok) return d;
        const e = new Error(d.error || "the key server answered " + r.status); e.status = r.status; throw e;
      } catch (e) { if (e.status) throw e; last = "couldn't connect"; }
    }
    throw new Error("the key server isn't running yet. deploy worker/keys-worker.js to Cloudflare (steps are in worker/README.md). last problem: " + last);
  };
  const device = (() => { let d = LS.get("nexvelo.device", ""); if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); LS.set("nexvelo.device", d); } return d; })();
  const left = (ms, life) => {
    if (life || ms == null) return "lifetime";
    if (ms <= 0) return "expired";
    const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
    return (d ? d + "d " : "") + (d || h ? h + "h " : "") + (m % 60) + "m";
  };

  document.head.appendChild(Object.assign(document.createElement("style"), { textContent: "body.nv-adfree [data-nv-ad]{display:none!important}#adkey-box .fld{margin-bottom:.75rem}#sec-admin .row{margin-bottom:.75rem}#ak-custom{display:flex;gap:.5rem;flex-wrap:wrap}#ak-custom input{width:5.5rem}" +
    "#ak-lock.ak-gate{display:flex;flex-direction:column;align-items:center;text-align:center;gap:.5rem;padding:2rem 1rem 2.5rem;margin:0 auto;max-width:26rem}.ak-gate p{margin:0 0 .75rem!important}.ak-gate>b{font-size:1.125rem;font-weight:500}" +
    ".ak-badge{width:3.5rem;height:3.5rem;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:var(--accent-fg);margin-bottom:.25rem}.ak-badge svg{width:1.5rem;height:1.5rem;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
    ".ak-pill{display:flex;align-items:center;gap:.25rem;width:100%;padding:.375rem .375rem .375rem 1.25rem;border-radius:999px;background:var(--btn);transition:box-shadow .15s}.ak-pill:focus-within{box-shadow:0 0 0 2px var(--accent)}" +
    ".ak-pill input{flex:1;min-width:0;height:2.5rem;border:0;outline:0;background:none;color:var(--fg);font:inherit;font-size:1.25rem;letter-spacing:.4em;text-align:center}.ak-pill input[type=text]{letter-spacing:.3em}" +
    ".ak-pill button{height:2.5rem;border:0;border-radius:999px;color:var(--dim);font:inherit;font-size:.75rem;padding:0 .75rem;cursor:pointer;background:none}.ak-pill button:hover{color:var(--fg)}" +
    ".ak-pill #ak-unlock{width:2.75rem;padding:0;display:grid;place-items:center;background:var(--accent);color:var(--accent-fg)}.ak-pill #ak-unlock:hover{filter:brightness(.9);color:var(--accent-fg)}.ak-pill #ak-unlock svg{width:1.125rem;height:1.125rem;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}" +
    "#ak-lockmsg{min-height:1.25rem;font-size:.8125rem;color:var(--dim)}#ak-pill.shake{animation:ak-shake .4s}@keyframes ak-shake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}@media (prefers-reduced-motion:reduce){#ak-pill.shake{animation:none}}" }));

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

  /* ---------- Settings > Admin Panel ---------- */
  const TK = "nexvelo.admintoken";
  let admin = null; try { const t = JSON.parse(LS.get(TK, "null")); if (t && t.exp > Date.now()) admin = t; } catch {}
  let list = [], fetchedAt = 0, ticker = 0;
  const call = async (path, body) => {
    try { return await post(path, { token: admin && admin.token, ...body }); }
    catch (e) { if (e.status === 401 && admin) lock(true); throw e; }
  };
  function showState() { const s = $("#sec-admin"); if (!s) return; $("#ak-lock", s).hidden = !!admin; $("#ak-panel", s).hidden = !admin; }
  function lock(expired) { admin = null; LS.del(TK); clearInterval(ticker); showState(); if (expired) toast("admin session ended. enter the code again"); }
  function buildAdmin() {
    if ($("#sec-admin")) return;
    const nav = $(".snav"), pane = $(".spane"), about = $('.snav .nb[data-sec="about"]'); if (!nav || !pane) return;
    const b = document.createElement("button"); b.className = "nb"; b.id = "nb-admin"; b.dataset.sec = "admin";
    b.innerHTML = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>admin panel';
    about ? about.before(b) : nav.appendChild(b);
    const s = document.createElement("div"); s.className = "sec"; s.id = "sec-admin";
    s.innerHTML = `<h2>admin panel</h2>
<div id="ak-lock" class="ak-gate"><div class="ak-badge"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div><b>admin access</b><p>enter the admin code to make and manage ad-free keys.</p>
<div class="ak-pill" id="ak-pill"><input type="password" id="ak-code" placeholder="••••••" aria-label="Admin code" autocomplete="off" inputmode="numeric" maxlength="32"><button type="button" id="ak-eye" aria-label="Show the code" title="Show or hide">show</button><button type="button" id="ak-unlock" aria-label="Unlock"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div><div id="ak-lockmsg" role="status"></div></div>
<div id="ak-panel" hidden><p>make ad-free keys and see who is using them. a key's time starts when someone first enters it.</p>
<h3>make keys</h3>
<div class="row"><label class="fld" style="margin:0"><span>how long it lasts</span><select id="ak-len"><option value="life">lifetime</option><option value="365">1 year</option><option value="183">6 months</option><option value="30" selected>1 month</option><option value="custom">custom</option></select></label>
<div id="ak-custom" hidden><label class="fld" style="margin:0"><span>days</span><input type="text" id="ak-d" value="0" inputmode="numeric"></label><label class="fld" style="margin:0"><span>hours</span><input type="text" id="ak-h" value="0" inputmode="numeric"></label><label class="fld" style="margin:0"><span>minutes</span><input type="text" id="ak-m" value="0" inputmode="numeric"></label></div></div>
<div class="row"><label class="fld" style="margin:0;flex:1;min-width:12rem"><span>who is it for (optional)</span><input type="text" id="ak-label" maxlength="60" autocomplete="off"></label><label class="fld" style="margin:0"><span>how many</span><input type="text" id="ak-n" value="1" inputmode="numeric" style="width:5rem"></label><button class="btn primary" id="ak-make" type="button">generate</button></div>
<div id="ak-new"></div><div id="status-ak" style="min-height:1.25rem;font-size:.8125rem;color:var(--dim)"></div>
<h3>all keys</h3><div class="row"><button class="btn" id="ak-refresh" type="button">refresh</button><button class="btn danger" id="ak-out" type="button">lock admin panel</button></div><div id="ak-list"></div></div>`;
    pane.appendChild(s);
    const unlockNow = async () => {
      const code = $("#ak-code", s).value.trim(), msg = $("#ak-lockmsg", s); if (!code) return;
      msg.textContent = "checking…";
      try { const d = await post("/api/admin/login", { code }); admin = { token: d.token, exp: Date.now() + d.expiresIn - 60000 }; LS.set(TK, JSON.stringify(admin)); $("#ak-code", s).value = ""; msg.textContent = ""; showState(); startPanel(); }
      catch (e) { msg.textContent = e.message; const pill = $("#ak-pill", s); pill.classList.remove("shake"); void pill.offsetWidth; pill.classList.add("shake"); }
    };
    $("#ak-eye", s).addEventListener("click", () => { const i = $("#ak-code", s), show = i.type === "password"; i.type = show ? "text" : "password"; $("#ak-eye", s).textContent = show ? "hide" : "show"; i.focus(); });
    $("#ak-unlock", s).addEventListener("click", unlockNow);
    $("#ak-code", s).addEventListener("keydown", (e) => { if (e.key === "Enter") unlockNow(); });
    $("#ak-len", s).addEventListener("change", (e) => { $("#ak-custom", s).hidden = e.target.value !== "custom"; });
    $("#ak-make", s).addEventListener("click", make);
    $("#ak-refresh", s).addEventListener("click", refresh);
    $("#ak-out", s).addEventListener("click", () => { lock(false); toast("admin panel locked"); });
    s.addEventListener("click", async (e) => {
      const a = e.target.closest("[data-a]"); if (!a) return;
      const k = a.closest("[data-k]").dataset.k;
      if (a.dataset.a === "copy") { try { await navigator.clipboard.writeText(k); toast("copied " + k); } catch { toast(k); } return; }
      if (a.dataset.a === "delete" && !confirm("delete " + k + " for good?")) return;
      if (a.dataset.a === "reset" && !confirm("let " + k + " be used again from a new device, with its full time?")) return;
      try { await call("/api/admin/keys/" + a.dataset.a, { key: k }); refresh(); } catch (er) { toast(er.message); }
    });
    showState(); if (admin) startPanel();
  }
  function startPanel() { refresh(); clearInterval(ticker); ticker = setInterval(() => { if ($("#sec-admin.on") && admin) { if (Date.now() - fetchedAt > 30000) refresh(); else draw(); } }, 15000); }
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
    try { const d = await call("/api/admin/keys", {}); list = d.keys || []; fetchedAt = Date.now(); draw(); } catch (e) { const el = $("#ak-list"); if (el && admin) el.innerHTML = '<div class="msg">' + esc(e.message) + "</div>"; }
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

  /* ---------- the key box in Settings > About ---------- */
  function buildAbout() {
    const about = $("#sec-about"); if (!about || $("#adkey-box")) return;
    const box = document.createElement("div"); box.id = "adkey-box";
    box.innerHTML = `<h3>ad-free key</h3><p>got a key? type it here to remove the ads Nex.Velo places itself. blocking ads on the pages you browse is separate and always on.</p>
<label class="fld"><span>key</span><input type="text" id="adkey-in" placeholder="NXVL-0000-0000" autocomplete="off" spellcheck="false" autocapitalize="characters" maxlength="14"></label>
<div class="row"><button class="btn primary" id="adkey-go" type="button">use key</button><button class="btn danger" id="adkey-clear" type="button" hidden>remove key</button></div><div id="adkey-status" style="margin-top:.5rem;font-size:.8125rem;color:var(--dim)"></div>`;
    const row = $(".about-row", about); row ? row.before(box) : about.appendChild(box);
    const inp = $("#adkey-in", box), status = $("#adkey-status", box);
    inp.addEventListener("input", () => { let v = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (v.startsWith("NXVL")) v = v.slice(0, 4) + (v.length > 4 ? "-" + v.slice(4, 8) : "") + (v.length > 8 ? "-" + v.slice(8, 12) : ""); inp.value = v; });
    const go = async () => {
      const v = inp.value.trim(); if (!v) return;
      status.textContent = "checking…";
      try { await redeem(v); inp.value = ""; paint(); } catch (e) { status.textContent = e.message; }
    };
    $("#adkey-go", box).addEventListener("click", go);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    $("#adkey-clear", box).addEventListener("click", () => { st = null; LS.del("nexvelo.adkey"); apply(); });
    setInterval(paint, 20000); paint();
  }

  buildAbout(); buildAdmin(); apply();
  setTimeout(verify, 3000); setInterval(verify, 10 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) verify(); });
})();
