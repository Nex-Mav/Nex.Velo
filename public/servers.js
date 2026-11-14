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
    const t0 = performance.now(), ok = await testWisp(url);
    if (ok) { ms[url] = Math.round(performance.now() - t0); speed[url] = ms[url] + " ms"; } else { delete ms[url]; speed[url] = "unreachable"; }
    render(); return ok;
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

  /* ----- automatic switch to the backup Wisp server ----- */
  // While on the backup, the server you chose is remembered here and is checked again every round. When it answers, it is used again.
  const HOME_KEY = "nexvelo.wisp-home";
  let checking = false;
  async function watch() {
    if (checking || document.hidden || settings.wispAuto === false) return;
    checking = true;
    try {
      let home = LS.get(HOME_KEY, "");
      if (home && settings.wisp !== BACKUP_WISP) { LS.del(HOME_KEY); home = ""; } // you picked another server yourself
      if (home) {
        if (await testWisp(home, 6000)) { await window.NV.setWisp(home); LS.del(HOME_KEY); toast("your server is back, switching to it"); render(); }
        return;
      }
      const cur = window.NV.activeWisp();
      if (cur === BACKUP_WISP) return;
      if (await testWisp(cur, 7000) || await testWisp(cur, 7000)) return; // one more try so a short hiccup doesn't switch anything
      if (!(await testWisp(BACKUP_WISP, 8000))) return;
      if (settings.wisp !== BACKUP_WISP) LS.set(HOME_KEY, settings.wisp);
      await window.NV.setWisp(BACKUP_WISP);
      toast("the Wisp server stopped answering, so the backup server is being used"); render();
    } catch {} finally { checking = false; }
  }
  setTimeout(watch, 15000);
  setInterval(watch, 45000);

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
    const viaMain = () => prevFetch(input, init), viaBackup = () => prevFetch(API_BACKUP + path, init);
    const [first, second] = Date.now() < mainDownUntil ? [viaBackup, viaMain] : [viaMain, viaBackup];
    try {
      const r = await first();
      if (!bad(r)) return r;
      if (first === viaMain) mainDownUntil = Date.now() + 60000;
      try { const r2 = await second(); if (!bad(r2)) return r2; } catch {}
      return r;
    } catch (e) {
      if (first === viaMain) mainDownUntil = Date.now() + 60000;
      return second(); // throws if this one fails too
    }
  };
  window.NV.apiBackup = API_BACKUP;
  void API_MAIN;
  window.NV.loaded.servers = true;
})();
