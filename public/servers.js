/* Servers (inside Settings): keep a list of Wisp servers, test their speed, pick one, or let it pick the fastest.
   Built in: a backup Wisp server (holywisp) that takes over by itself when yours stops answering,
   and a backup API server (railway2) that is tried when nex-velo.up.railway.app doesn't answer. */
(() => {
  "use strict";
  const { esc, toast, LS, settings, defaultWisp, testWisp, normalizeWisp } = window.NV;
  const $ = (s, r = document) => r.querySelector(s);
  const BACKUP_WISP = "wss://holywisp.fracit.al/";
  const API_MAIN = "https://nex-velo.up.railway.app", API_BACKUP = "https://railway2.up.railway.app";
  let list = []; try { list = JSON.parse(LS.get("nexvelo.servers", "[]")) || []; } catch {}
  list = list.filter((u) => u !== BACKUP_WISP);
  const speed = {};   // url -> text
  const ms = {};      // url -> number
  const persist = () => LS.set("nexvelo.servers", JSON.stringify(list));
  const all = () => [{ url: defaultWisp, label: "Nex.Velo server (default)" }, { url: BACKUP_WISP, label: "Backup server (holywisp)" }, ...list.map((u) => ({ url: u, label: u }))];
  const builtIn = (u) => u === defaultWisp || u === BACKUP_WISP;

  // The old test only checked that the connection opens. This one asks the server to open a real connection to a website
  // (the Wisp protocol: a CONNECT packet, then some data) and waits for the answer, so a server that is up but can't reach the internet is caught.
  function deepWisp(url, ms = 8000) {
    return new Promise((resolve) => {
      let ws, done = false, timer; const t0 = performance.now();
      const fin = (r) => { if (!done) { done = true; clearTimeout(timer); try { ws && ws.close(); } catch {} resolve(r); } };
      timer = setTimeout(() => fin({ ok: false, why: ws && ws.readyState === 1 ? "connects, but nothing came back from the internet" : "couldn't connect" }), ms);
      try { ws = new WebSocket(url); } catch { return fin({ ok: false, why: "that isn't a valid address" }); }
      ws.binaryType = "arraybuffer";
      ws.onerror = () => fin({ ok: false, why: "couldn't connect" });
      ws.onclose = () => fin({ ok: false, why: "the connection closed" });
      ws.onopen = () => {
        const host = new TextEncoder().encode("example.com"), c = new Uint8Array(8 + host.length), dv = new DataView(c.buffer);
        c[0] = 1; dv.setUint32(1, 1, true); c[5] = 1; dv.setUint16(6, 80, true); c.set(host, 8); ws.send(c);
        const req = new TextEncoder().encode("HEAD / HTTP/1.0\r\nHost: example.com\r\n\r\n"), d = new Uint8Array(5 + req.length); d[0] = 2; new DataView(d.buffer).setUint32(1, 1, true); d.set(req, 5); ws.send(d);
      };
      ws.onmessage = (e) => {
        const b = new Uint8Array(e.data); if (b.length < 5) return;
        if (b[0] === 2) { const ok = /^HTTP\//.test(new TextDecoder().decode(b.subarray(5, 16))); fin({ ok, why: ok ? "" : "answered, but not like a web server", ms: Math.round(performance.now() - t0) }); }
        else if (b[0] === 4) fin({ ok: false, why: "the server is up but can't reach the internet" });
      };
    });
  }

  function render() {
    const html =
      `<div class="row" style="margin-bottom:.75rem"><button class="btn sv-best">test all and use the fastest</button></div>` +
      all().map((s) => {
        const on = window.NV.activeWisp() === s.url;
        return `<div class="sv-row${on ? " on" : ""}" data-u="${esc(s.url)}"><b>${esc(s.label)}</b><small>${esc(speed[s.url] || "")}</small>` +
          `<button class="btn" data-a="test">test</button><button class="btn${on ? "" : " primary"}" data-a="use"${on ? " disabled" : ""}>${on ? "in use" : "use"}</button>` +
          (builtIn(s.url) ? "" : '<button class="btn danger" data-a="rm">remove</button>') + "</div>";
      }).join("");
    const el = $("#sv2-list"); if (el) el.innerHTML = html;
  }
  async function test(url) {
    speed[url] = "testing…"; render();
    const r = await deepWisp(url, 9000);
    if (r.ok) { ms[url] = r.ms; speed[url] = "works, " + r.ms + " ms"; } else { delete ms[url]; speed[url] = r.why || "unreachable"; }
    render(); return r.ok;
  }
  async function use(url) {
    try { await window.NV.setWisp(url); toast("now using that server"); } catch { toast("couldn't switch servers. reload and try again."); }
    render();
  }

  function bind(formId, inputId, listId) {
    $(formId).addEventListener("submit", (e) => {
      e.preventDefault();
      const url = normalizeWisp($(inputId).value); if (!url) return;
      if (builtIn(url) || list.includes(url)) toast("that server is already in the list");
      else { list.push(url); persist(); }
      $(inputId).value = ""; render(); test(url);
    });
    $(listId).addEventListener("click", async (e) => {
      if (e.target.closest(".sv-best")) {
        await Promise.all(all().map((s) => test(s.url)));
        const best = Object.entries(ms).sort((a, b) => a[1] - b[1])[0];
        if (best) use(best[0]); else toast("none of the servers were reachable");
        return;
      }
      const b = e.target.closest("[data-a]"); if (!b) return;
      const url = b.closest(".sv-row").dataset.u;
      if (b.dataset.a === "test") test(url);
      else if (b.dataset.a === "use") use(url);
      else if (b.dataset.a === "rm") { list = list.filter((u) => u !== url); persist(); render(); }
    });
  }
  bind("#sv2-form", "#sv2-url", "#sv2-list");
  render();   // fill the list in Settings and on the servers page

  /* ----- automatic switch to a Wisp server that works ----- */
  // When the server in use can't reach the internet, the first one that can is used (Nex.Velo's, the backup, then your saved ones).
  // The server you chose is remembered, and it is checked again every round. When it works again, it is used again.
  const HOME_KEY = "nexvelo.wisp-home", AWAY_KEY = "nexvelo.wisp-away";
  let checking = false;
  async function pickWorking(exclude) {
    for (const u of [...new Set([settings.wisp, defaultWisp, BACKUP_WISP, ...list])]) if (u && u !== exclude && (await deepWisp(u, 8000)).ok) return u;
    return null;
  }
  async function watch(force) {
    if (checking || (document.hidden && !force) || settings.wispAuto === false) return;
    checking = true;
    try {
      let home = LS.get(HOME_KEY, ""), away = LS.get(AWAY_KEY, "");
      if ((home || away) && settings.wisp !== away) { LS.del(HOME_KEY); LS.del(AWAY_KEY); home = away = ""; } // you picked another server yourself
      if (home) {
        if ((await deepWisp(home, 8000)).ok) { await window.NV.setWisp(home); LS.del(HOME_KEY); LS.del(AWAY_KEY); toast("your Wisp server works again, switching back to it"); render(); }
        return;
      }
      const cur = window.NV.activeWisp();
      if ((await deepWisp(cur, 8000)).ok) return;
      if (!force && (await deepWisp(cur, 8000)).ok) return; // one more try so a short hiccup doesn't switch anything
      const target = await pickWorking(cur);
      if (!target) { if (force) toast("none of the Wisp servers can reach the internet right now. check Settings > servers"); return; }
      LS.set(HOME_KEY, settings.wisp); await window.NV.setWisp(target); LS.set(AWAY_KEY, target);
      toast("the Wisp server couldn't reach the internet, so " + (target === BACKUP_WISP ? "the backup server" : target.replace(/^wss?:\/\//, "").replace(/\/.*$/, "")) + " is being used. reload the page"); render();
    } catch {} finally { checking = false; }
  }
  setTimeout(() => watch(true), 1500);
  setTimeout(watch, 15000);
  setInterval(watch, 45000);
  // the service worker tells the page when a proxied page failed because the tunnel couldn't connect
  let lastTold = 0;
  navigator.serviceWorker && navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.nvWispFailed && Date.now() - lastTold > 15000) { lastTold = Date.now(); watch(true); } });

  /* ----- music recommendations that change: a different handful from a big list, renewed every 15 minutes ----- */
  const REC_POOL = ["Blinding Lights The Weeknd", "Levitating Dua Lipa", "As It Was Harry Styles", "Flowers Miley Cyrus", "Anti-Hero Taylor Swift", "Espresso Sabrina Carpenter", "Starboy The Weeknd", "Heat Waves Glass Animals", "Sunflower Post Malone", "good 4 u Olivia Rodrigo", "Stay The Kid LAROI Justin Bieber", "Shape of You Ed Sheeran", "Bad Guy Billie Eilish", "Watermelon Sugar Harry Styles", "Dance Monkey Tones and I", "Someone You Loved Lewis Capaldi", "Believer Imagine Dragons", "Thunder Imagine Dragons", "Counting Stars OneRepublic", "Shake It Off Taylor Swift", "Uptown Funk Bruno Mars", "Cheap Thrills Sia", "Havana Camila Cabello", "Senorita Shawn Mendes Camila Cabello", "Peaches Justin Bieber", "Montero Lil Nas X", "Industry Baby Lil Nas X", "Kiss Me More Doja Cat", "Say So Doja Cat", "Don't Start Now Dua Lipa", "New Rules Dua Lipa", "Physical Dua Lipa", "Cruel Summer Taylor Swift", "Lavender Haze Taylor Swift", "Vampire Olivia Rodrigo", "drivers license Olivia Rodrigo", "Happier Than Ever Billie Eilish", "Ocean Eyes Billie Eilish", "lovely Billie Eilish Khalid", "Circles Post Malone", "Rockstar Post Malone", "Congratulations Post Malone", "Save Your Tears The Weeknd", "Die For You The Weeknd", "Can't Feel My Face The Weeknd", "Photograph Ed Sheeran", "Perfect Ed Sheeran", "Thinking Out Loud Ed Sheeran", "Closer The Chainsmokers", "Something Just Like This Coldplay", "Viva La Vida Coldplay", "Yellow Coldplay", "Mr. Brightside The Killers", "Somebody Told Me The Killers", "Sweater Weather The Neighbourhood", "Riptide Vance Joy", "Take Me To Church Hozier", "Africa Toto", "Dreams Fleetwood Mac", "Don't Stop Believin Journey", "Bohemian Rhapsody Queen", "Smells Like Teen Spirit Nirvana", "Lose Yourself Eminem", "Without Me Eminem", "HUMBLE Kendrick Lamar", "Sicko Mode Travis Scott", "Goosebumps Travis Scott", "Lucid Dreams Juice WRLD", "All of Me John Legend", "Stay With Me Sam Smith", "Hotline Bling Drake", "God's Plan Drake", "One Dance Drake", "Rolling in the Deep Adele", "Easy On Me Adele", "Bad Habits Ed Sheeran", "Unholy Sam Smith Kim Petras", "Calm Down Rema Selena Gomez", "Boy's a Liar Pt 2 PinkPantheress", "Tití Me Preguntó Bad Bunny", "Dákiti Bad Bunny Jhay Cortez", "Despacito Luis Fonsi", "Gangnam Style PSY", "Dynamite BTS", "Butter BTS", "Pink Venom BLACKPINK", "How You Like That BLACKPINK"];
  const REC_KEY = "nexvelo.rec", REC_TTL = 15 * 60 * 1000;
  async function rotatingRecommended() {
    let saved = null; try { saved = JSON.parse(LS.get(REC_KEY, "null")); } catch {}
    if (saved && saved.tracks && saved.tracks.length && Date.now() - saved.t < REC_TTL) return saved.tracks;
    const skip = new Set((saved && saved.q) || []), fresh = REC_POOL.filter((x) => !skip.has(x));
    const picks = (fresh.length >= 12 ? fresh : REC_POOL).slice().sort(() => Math.random() - 0.5).slice(0, 12), tracks = [];
    for (let i = 0; i < picks.length; i += 4) {
      const got = await Promise.allSettled(picks.slice(i, i + 4).map((q) => fetch("/api/music/search?q=" + encodeURIComponent(q)).then((r) => r.json())));
      for (const g of got) { const t = g.status === "fulfilled" && g.value && g.value.results && g.value.results[0]; if (t) tracks.push(t); }
    }
    if (tracks.length < 4) return saved && saved.tracks ? saved.tracks : null; // not enough came back: keep the old list, or let the server's own list answer
    LS.set(REC_KEY, JSON.stringify({ t: Date.now(), q: picks, tracks }));
    return tracks;
  }

  /* ----- backup API server: if nex-velo.up.railway.app can't be reached, the same request goes to railway2 ----- */
  const prevFetch = window.fetch.bind(window);
  // order of API servers: nex-velo.up.railway.app (or this site's own server) first, then nex-velo.nexero.workers.dev, then railway2
  const API_BACKUPS = ["https://nex-velo.nexero.workers.dev", API_BACKUP];
  let mainDownUntil = 0;
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input && input.url;
    const m = typeof url === "string" && url.match(/^(?:https:\/\/nex-velo\.up\.railway\.app)?(\/api\/[^#]*)$/);
    const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
    if (m && method === "GET" && /^\/api\/music\/recommended(\?|$)/.test(m[1])) {
      try { const tracks = await rotatingRecommended(); if (tracks) return new Response(JSON.stringify({ tracks }), { headers: { "content-type": "application/json" } }); } catch {}
    }
    if (!m || method !== "GET") return prevFetch(input, init);
    const path = m[1], bad = (r) => r.status >= 502 && r.status <= 504;
    const tries = [() => prevFetch(input, init), ...API_BACKUPS.map((b) => () => prevFetch(b + path, init))];
    const mainFirst = Date.now() >= mainDownUntil;
    if (!mainFirst) tries.push(tries.shift()); // the main server failed a moment ago, so the backups go first
    let lastRes = null, lastErr = null;
    for (let i = 0; i < tries.length; i++) {
      try { const r = await tries[i](); if (!bad(r)) return r; lastRes = r; } catch (e) { lastErr = e; }
      if (i === 0 && mainFirst) mainDownUntil = Date.now() + 60000;
    }
    if (lastRes) return lastRes;
    throw lastErr;
  };
  window.NV.apiBackup = API_BACKUP;
  void API_MAIN;
  window.NV.loaded.servers = true;
})();
