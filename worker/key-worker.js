// Ad-free key server for Cloudflare Workers. Same routes as lib/keys.js, so the website can use either one.
// Needs: a KV namespace bound as KEYS, and a secret named ADMIN_CODE (set both in the Cloudflare dashboard, see worker/README.md).
// Nothing secret is in this file. The admin code only exists as a Cloudflare secret.

const KEY_RE = /^NXVL-\d{4}-\d{4}$/;
const TOKEN_MS = 12 * 60 * 60 * 1000, MAX_MS = 100 * 365 * 86400000;
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST,OPTIONS", "access-control-max-age": "86400" };
const enc = new TextEncoder();

const json = (data, status = 200) => new Response(JSON.stringify({ nxvl: 1, ...data }), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(secret, text) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", k, enc.encode(text)));
}
const safeEq = (a, b) => { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; };
async function makeToken(env) { const p = btoa(JSON.stringify({ exp: Date.now() + TOKEN_MS })); return p + "." + (await hmac(env.ADMIN_CODE + "|nxvl-admin", p)); }
async function tokenOk(env, t) {
  const [p, s] = String(t || "").split("."); if (!p || !s) return false;
  if (!safeEq(await hmac(env.ADMIN_CODE + "|nxvl-admin", p), s)) return false;
  try { return JSON.parse(atob(p)).exp > Date.now(); } catch { return false; }
}
const view = (k) => {
  const now = Date.now(), expired = !!k.expiresAt && k.expiresAt <= now;
  return { key: k.key, label: k.label || "", status: k.revoked ? "revoked" : !k.redeemedAt ? "unused" : expired ? "expired" : "active", lifetime: k.durationMs == null, durationMs: k.durationMs, createdAt: k.createdAt, redeemedAt: k.redeemedAt || null, expiresAt: k.expiresAt || null, timeLeftMs: k.revoked ? 0 : !k.redeemedAt ? k.durationMs : k.expiresAt ? Math.max(0, k.expiresAt - now) : null, user: k.deviceName || "", device: k.deviceId ? String(k.deviceId).slice(0, 8) : "" };
};
const getKey = async (env, code) => { const raw = await env.KEYS.get("k:" + code); return raw ? JSON.parse(raw) : null; };
const putKey = (env, k) => env.KEYS.put("k:" + k.key, JSON.stringify(k));
const randDigits = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    if (req.method !== "POST") return json({ error: "not found" }, 404);
    if (!env.KEYS) return json({ error: "the KEYS storage isn't connected to this worker" }, 503);
    let b = {}; try { b = await req.json(); } catch {}
    if (!b || typeof b !== "object") b = {};
    const ip = req.headers.get("cf-connecting-ip") || "unknown";
    const path = url.pathname;

    if (path === "/api/admin/login") {
      if (!env.ADMIN_CODE) return json({ error: "admin tools are not set up on the server" }, 503);
      const fk = "f:" + ip, f = JSON.parse((await env.KEYS.get(fk)) || "null");
      if (f && f.n >= 5) return json({ error: "too many tries. wait 15 minutes" }, 429);
      if (!safeEq(String(b.code || ""), env.ADMIN_CODE)) { await env.KEYS.put(fk, JSON.stringify({ n: (f ? f.n : 0) + 1 }), { expirationTtl: 900 }); return json({ error: "not a valid code" }, 401); }
      await env.KEYS.delete(fk);
      return json({ token: await makeToken(env), expiresIn: TOKEN_MS });
    }

    if (path.startsWith("/api/admin/")) {
      if (!env.ADMIN_CODE) return json({ error: "ADMIN_CODE is not set on the server" }, 503);
      if (!(await tokenOk(env, b.token))) return json({ error: "admin session expired. enter the admin code again" }, 401);
      if (path === "/api/admin/keys") {
        const names = []; let cursor;
        do { const r = await env.KEYS.list({ prefix: "k:", cursor }); names.push(...r.keys.map((x) => x.name)); cursor = r.list_complete ? null : r.cursor; } while (cursor);
        const all = (await Promise.all(names.map(async (n) => { const raw = await env.KEYS.get(n); return raw ? view(JSON.parse(raw)) : null; }))).filter(Boolean).sort((x, y) => y.createdAt - x.createdAt);
        return json({ keys: all, now: Date.now() });
      }
      if (path === "/api/admin/keys/create") {
        const count = Math.min(20, Math.max(1, Math.floor(Number(b.count) || 1)));
        let ms = null;
        if (b.lifetime !== true) { ms = Math.floor(Number(b.durationMs)); if (!(ms >= 60000) || ms > MAX_MS) return json({ error: "the length has to be between 1 minute and 100 years" }, 400); }
        const made = [];
        for (let i = 0; i < count; i++) {
          let key = ""; for (let t = 0; t < 50; t++) { const c = "NXVL-" + randDigits() + "-" + randDigits(); if (!(await getKey(env, c))) { key = c; break; } }
          if (!key) return json({ error: "couldn't make a unique key" }, 500);
          const k = { key, label: String(b.label || "").slice(0, 60), durationMs: ms, createdAt: Date.now(), redeemedAt: null, expiresAt: null, deviceId: null, deviceName: "", revoked: false };
          await putKey(env, k); made.push(view(k));
        }
        return json({ keys: made });
      }
      const m = path.match(/^\/api\/admin\/keys\/(revoke|restore|reset|delete)$/);
      if (m) {
        const k = await getKey(env, String(b.key || "")); if (!k) return json({ error: "no such key" }, 404);
        if (m[1] === "delete") { await env.KEYS.delete("k:" + k.key); return json({ ok: true, key: null }); }
        if (m[1] === "revoke") k.revoked = true; else if (m[1] === "restore") k.revoked = false; else { k.redeemedAt = null; k.expiresAt = null; k.deviceId = null; k.deviceName = ""; }
        await putKey(env, k); return json({ ok: true, key: view(k) });
      }
      return json({ error: "not found" }, 404);
    }

    if (path === "/api/keys/redeem") {
      const code = String(b.key || "").trim().toUpperCase(), dev = String(b.device || "").slice(0, 64);
      if (!KEY_RE.test(code) || !dev) return json({ error: "that doesn't look like a key. it looks like NXVL-0000-0000" }, 400);
      const k = await getKey(env, code); if (!k || k.revoked) return json({ error: "that key isn't valid" }, 404);
      if (k.redeemedAt && k.deviceId !== dev) return json({ error: "that key is already being used by someone else" }, 409);
      if (!k.redeemedAt) { k.redeemedAt = Date.now(); k.expiresAt = k.durationMs == null ? null : k.redeemedAt + k.durationMs; k.deviceId = dev; k.deviceName = String(b.name || "").slice(0, 40); await putKey(env, k); }
      else if (b.name && String(b.name).slice(0, 40) !== k.deviceName) { k.deviceName = String(b.name).slice(0, 40); await putKey(env, k); }
      if (k.expiresAt && k.expiresAt <= Date.now()) return json({ error: "that key has expired" }, 410);
      return json({ ok: true, active: true, lifetime: k.expiresAt == null, expiresAt: k.expiresAt, now: Date.now() });
    }

    if (path === "/api/keys/check") {
      const k = await getKey(env, String(b.key || "").trim().toUpperCase());
      if (!k || k.revoked || !k.redeemedAt || k.deviceId !== String(b.device || "")) return json({ active: false });
      if (k.expiresAt && k.expiresAt <= Date.now()) return json({ active: false, expired: true });
      return json({ active: true, lifetime: k.expiresAt == null, expiresAt: k.expiresAt, now: Date.now() });
    }
    return json({ error: "not found" }, 404);
  },
};
