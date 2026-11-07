/* Live wallpapers: animated backgrounds that react to the mouse (or your finger). Drawn on one canvas inside the wallpaper layer.
   Six styles: aurora, gradient flow, constellation, waves, bubbles, ripples. With "reduce motion" switched on in your system,
   they are drawn once and stay still. They pause when the tab is hidden, and use the theme's colours when a pop theme is on. */
(() => {
  "use strict";
  const NV = window.NV;
  if (!NV || NV.live) return;
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BASE = ["#ff5fc8", "#5ee7ff", "#9b6bff", "#ffd166", "#39ff88", "#ff7a3d"];
  const rand = (a, b) => a + Math.random() * (b - a);
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const mix = (a, b, t) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); const c = (s) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); return `rgb(${c(16)},${c(8)},${c(0)})`; };

  let cv = null, ctx = null, raf = 0, id = null, host = null, W = 0, H = 0, Q = 1, last = 0, T = 0, pal = BASE, S = {};
  const M = { x: 0, y: 0, tx: 0, ty: 0, has: false, vx: 0, vy: 0, down: false }; // the pointer, smoothed

  const palette = () => { // the theme's own colours first, so the wallpaper matches it
    const cs = getComputedStyle(document.documentElement), pick = (n) => { const v = cs.getPropertyValue(n).trim(); return /^#[0-9a-f]{6}$/i.test(v) ? v : ""; };
    const a = pick("--accent"), b = pick("--accent2");
    return document.documentElement.dataset.pop && a ? [a, b || a, ...BASE.filter((c) => c !== a && c !== b)] : BASE;
  };

  /* ---------- the styles ---------- */
  const MODES = {
    aurora: { // soft glowing blobs that drift, and slide along with the pointer (each at its own depth)
      q: 0.4,
      init() { S.blobs = Array.from({ length: 7 }, (_, i) => ({ bx: rand(0, W), by: rand(0, H), vx: rand(-14, 14), vy: rand(-14, 14), r: rand(0.26, 0.46) * Math.max(W, H), c: pal[i % pal.length], ph: rand(0, 6.28), depth: rand(0.15, 0.75) })); },
      frame(dt) {
        ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#0a0716"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "screen";
        for (const b of S.blobs) {
          b.bx += (b.vx + Math.sin(T * 0.3 + b.ph) * 10) * dt; b.by += (b.vy + Math.cos(T * 0.26 + b.ph) * 10) * dt;
          if (b.bx < -b.r * 0.2 || b.bx > W + b.r * 0.2) b.vx *= -1; if (b.by < -b.r * 0.2 || b.by > H + b.r * 0.2) b.vy *= -1;
          b.x = b.bx + (M.has ? (M.x - W / 2) * b.depth * 0.55 : 0); b.y = b.by + (M.has ? (M.y - H / 2) * b.depth * 0.55 : 0);
          const near = M.has ? Math.max(0, 1 - Math.hypot(M.x - b.x, M.y - b.y) / (b.r * 1.1)) : 0, g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          g.addColorStop(0, rgba(b.c, 0.4 + near * 0.22)); g.addColorStop(1, rgba(b.c, 0)); ctx.fillStyle = g; ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        }
        if (M.has) { const r = Math.max(W, H) * 0.16, g = ctx.createRadialGradient(M.x, M.y, 0, M.x, M.y, r); g.addColorStop(0, "rgba(255,255,255,.2)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(M.x - r, M.y - r, r * 2, r * 2); }
      },
    },
    flow: { // a smooth sweep through black, deep colour and white, tilted by the pointer
      q: 0.3,
      init() {},
      frame() {
        const stops = ["#000000", "#12104a", "#4a1fa8", "#c0307a", "#ff7a3d", "#ffe9c4", "#ffffff", "#ffe9c4", "#c0307a", "#2a1470", "#000000"];
        const ramp = (u) => { u = ((u % 1) + 1) % 1; const f = u * (stops.length - 1), i = Math.floor(f); return mix(stops[i], stops[Math.min(i + 1, stops.length - 1)], f - i); };
        const mx = M.has ? M.x / W : 0.5 + Math.sin(T * 0.1) * 0.25, my = M.has ? M.y / H : 0.5 + Math.cos(T * 0.08) * 0.2;
        const a = 0.6 + (mx - 0.5) * 1.2 + Math.sin(T * 0.05) * 0.3, L = Math.hypot(W, H) * 0.75, cx = W * (0.35 + mx * 0.3), cy = H * (0.35 + my * 0.3);
        const g = ctx.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
        for (let i = 0; i <= 24; i++) g.addColorStop(i / 24, ramp(i / 24 * 0.9 - T * 0.018));
        ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.28)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      },
    },
    stars: { // dots that join up when they are close, and scatter from the pointer
      q: 1,
      init() { const n = Math.min(130, Math.round((W * H) / 11000)); S.p = Array.from({ length: n }, (_, i) => ({ x: rand(0, W), y: rand(0, H), vx: rand(-14, 14), vy: rand(-14, 14), r: rand(1, 2.4), c: pal[i % pal.length] })); },
      frame(dt) {
        ctx.globalCompositeOperation = "source-over"; const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#070a1c"); g.addColorStop(1, "#150a2e"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const link = 120 * Q, push = 140 * Q;
        for (const p of S.p) {
          p.x += p.vx * dt * Q; p.y += p.vy * dt * Q;
          if (M.has) { const dx = p.x - M.x, dy = p.y - M.y, d = Math.hypot(dx, dy); if (d < push && d > 0.1) { const f = (1 - d / push) * 260 * dt; p.x += (dx / d) * f; p.y += (dy / d) * f; } }
          if (p.x < 0) p.x += W; else if (p.x > W) p.x -= W; if (p.y < 0) p.y += H; else if (p.y > H) p.y -= H;
        }
        ctx.lineWidth = 1;
        for (let i = 0; i < S.p.length; i++) {
          const a = S.p[i];
          for (let j = i + 1; j < S.p.length; j++) { const b = S.p[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < link) { ctx.strokeStyle = rgba(a.c, (1 - d / link) * 0.45); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
          if (M.has) { const d = Math.hypot(a.x - M.x, a.y - M.y); if (d < link * 1.6) { ctx.lineWidth = 1.4; ctx.strokeStyle = rgba("#ffffff", (1 - d / (link * 1.6)) * 0.85); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(M.x, M.y); ctx.stroke(); ctx.lineWidth = 1; } }
          ctx.fillStyle = rgba(a.c, 0.95); ctx.beginPath(); ctx.arc(a.x, a.y, a.r * Q, 0, 6.283); ctx.fill();
        }
      },
    },
    waves: { // layers of waves that swell under the pointer
      q: 0.7,
      init() {},
      frame() {
        ctx.globalCompositeOperation = "source-over"; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a0b24"); g.addColorStop(1, "#1b0f3d"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const layers = 5, mx = M.has ? M.x : W * (0.5 + Math.sin(T * 0.2) * 0.3), my = M.has ? M.y / H : 0.5;
        for (let l = 0; l < layers; l++) {
          const base = H * (0.38 + l * 0.12), amp = 14 + l * 7, sp = 0.4 + l * 0.12, c = pal[l % pal.length];
          ctx.beginPath(); ctx.moveTo(0, H);
          for (let x = 0; x <= W; x += 8) {
            const bump = Math.exp(-(((x - mx) / (W * 0.18)) ** 2)) * (1 - my) * 70;
            ctx.lineTo(x, base + Math.sin(x * 0.006 + T * sp + l) * amp + Math.sin(x * 0.013 - T * sp * 0.7) * amp * 0.5 - bump);
          }
          ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = rgba(c, 0.5); ctx.fill();
        }
      },
    },
    bubbles: { // bubbles float up, and pop when the pointer touches them
      q: 1,
      init() { S.b = Array.from({ length: Math.min(34, Math.round((W * H) / 38000)) }, () => this.make(true)); S.fx = []; },
      make(any) { return { x: rand(0, W), y: any ? rand(0, H) : H + rand(20, 120), r: rand(10, 46) * Math.min(1.2, Q + 0.2), vy: rand(14, 42), ph: rand(0, 6.28), c: pal[Math.floor(rand(0, pal.length))] }; },
      pop(b) { for (let i = 0; i < 12; i++) { const a = rand(0, 6.283), v = rand(40, 150); S.fx.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: b.c }); } Object.assign(b, this.make(false)); },
      frame(dt) {
        ctx.globalCompositeOperation = "source-over"; const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#1a0b3a"); g.addColorStop(1, "#0b1a3a"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for (const b of S.b) {
          b.y -= b.vy * dt; b.x += Math.sin(T * 0.8 + b.ph) * 14 * dt;
          if (b.y < -b.r * 2) Object.assign(b, this.make(false));
          if (M.has && Math.hypot(M.x - b.x, M.y - b.y) < b.r + 6) { this.pop(b); continue; }
          const g2 = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
          g2.addColorStop(0, "rgba(255,255,255,.55)"); g2.addColorStop(0.35, rgba(b.c, 0.18)); g2.addColorStop(1, rgba(b.c, 0.5));
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill(); ctx.strokeStyle = rgba(b.c, 0.7); ctx.lineWidth = 1.5; ctx.stroke();
        }
        for (let i = S.fx.length - 1; i >= 0; i--) { const f = S.fx[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 90 * dt; f.life -= dt * 1.6; if (f.life <= 0) { S.fx.splice(i, 1); continue; } ctx.fillStyle = rgba(f.c, f.life * 0.9); ctx.beginPath(); ctx.arc(f.x, f.y, 2.6 * f.life * Q, 0, 6.283); ctx.fill(); }
      },
      click() { if (!S.b) return; for (const b of S.b) if (Math.hypot(M.x - b.x, M.y - b.y) < b.r + 14) { this.pop(b); break; } },
    },
    ripples: { // a field of dots that swell and shimmer around the pointer
      q: 1,
      init() { S.gap = Math.max(24, Math.round(28 * Q)); S.rings = []; },
      frame(dt) {
        ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#050a18"; ctx.fillRect(0, 0, W, H);
        const gap = S.gap, cols = Math.ceil(W / gap) + 1, rows = Math.ceil(H / gap) + 1, mx = M.has ? M.x : W / 2 + Math.cos(T * 0.4) * W * 0.3, my = M.has ? M.y : H / 2 + Math.sin(T * 0.5) * H * 0.3;
        for (let i = S.rings.length - 1; i >= 0; i--) { S.rings[i].t += dt; if (S.rings[i].t > 2.4) S.rings.splice(i, 1); }
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const x = c * gap, y = r * gap, dx = x - mx, dy = y - my, d = Math.hypot(dx, dy);
          let k = Math.exp(-d / (190 * Q)) * (0.55 + 0.45 * Math.sin(d / (24 * Q) - T * 4));
          for (const ring of S.rings) { const dd = Math.hypot(x - ring.x, y - ring.y), w = Math.exp(-(((dd - ring.t * 380 * Q) / (46 * Q)) ** 2)) * (1 - ring.t / 2.4); k += w; }
          const idle = 0.12 + 0.1 * Math.sin(x * 0.02 + T) * Math.cos(y * 0.02 - T * 0.8), s = Math.max(0.6, (1.2 + (k + idle) * 4.4) * Q), ox = d > 0.1 ? (dx / d) * k * 9 * Q : 0, oy = d > 0.1 ? (dy / d) * k * 9 * Q : 0;
          ctx.fillStyle = rgba(pal[(c + r + Math.floor(T * 0.6)) % pal.length], Math.min(1, 0.25 + k * 0.7 + idle)); ctx.beginPath(); ctx.arc(x + ox, y + oy, s, 0, 6.283); ctx.fill();
        }
      },
      click() { S.rings && S.rings.push({ x: M.x, y: M.y, t: 0 }); },
    },
  };

  /* ---------- engine ---------- */
  function size() {
    if (!cv || !host) return;
    const mode = MODES[id]; Q = mode ? mode.q : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    W = Math.max(2, Math.round(innerWidth * Q * (Q === 1 ? dpr : 1))); H = Math.max(2, Math.round(innerHeight * Q * (Q === 1 ? dpr : 1)));
    cv.width = W; cv.height = H;
    if (mode) { S = {}; mode.init(); if (reduce() || document.hidden) draw(0); }
  }
  function toCanvas(e) { const x = e.clientX / innerWidth * W, y = e.clientY / innerHeight * H; M.tx = x; M.ty = y; if (!M.has) { M.x = x; M.y = y; } M.has = true; }
  function onMove(e) { if (!reduce()) toCanvas(e); }
  function onDown(e) { if (reduce()) return; toCanvas(e); M.x = M.tx; M.y = M.ty; const m = MODES[id]; if (m && m.click) m.click.call(m); }
  function onLeave() { M.has = false; }
  function draw(dt) {
    const m = MODES[id]; if (!m || !ctx) return;
    M.x += (M.tx - M.x) * Math.min(1, dt * 9); M.y += (M.ty - M.y) * Math.min(1, dt * 9);
    ctx.globalCompositeOperation = "source-over"; m.frame.call(m, dt);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; T += dt; draw(dt);
  }
  function run() { cancelAnimationFrame(raf); raf = 0; if (!id || reduce() || document.hidden) { if (id) draw(0); return; } last = performance.now(); raf = requestAnimationFrame(loop); }

  function start(newId, el) {
    if (!MODES[newId] || !el) return stop();
    if (cv && id === newId && host === el) return;
    stop(); id = newId; host = el; pal = palette();
    cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true"); cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
    ctx = cv.getContext("2d"); el.appendChild(cv); size();
    addEventListener("pointermove", onMove, { passive: true }); addEventListener("pointerdown", onDown, { passive: true }); document.addEventListener("pointerleave", onLeave);
    addEventListener("resize", size); document.addEventListener("visibilitychange", run); run();
  }
  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    removeEventListener("pointermove", onMove); removeEventListener("pointerdown", onDown); document.removeEventListener("pointerleave", onLeave); removeEventListener("resize", size); document.removeEventListener("visibilitychange", run);
    if (cv) cv.remove(); cv = ctx = host = null; id = null; S = {}; M.has = false;
  }
  function retint() { if (!id) return; pal = palette(); const m = MODES[id]; if (m) { S = {}; m.init(); } }

  NV.live = { start, stop, retint, ids: Object.keys(MODES), running: () => id };
  NV.loaded.live = true;
  if (NV.onLiveReady) NV.onLiveReady();
})();