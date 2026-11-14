// Ad-free keys (NXVL-0000-0000) and the admin tools that make them.
// Every check happens here on the server. The admin code is never in the website's files: set it as the ADMIN_CODE variable on Railway.
// Keys are saved in a JSON file. On Railway, add a Volume mounted at /data, or keys are lost whenever the server is redeployed.

import { randomBytes, randomInt, createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";

const FILE = process.env.KEYS_FILE || join(process.env.KEYS_DIR || (existsSync("/data") ? "/data" : "./.data"), "ad-keys.json");
const SECRET = randomBytes(32).toString("hex"); // admin sessions stop working when the server restarts, which is fine
const TOKEN_MS = 12 * 60 * 60 * 1000;
const MAX_MS = 100 * 365 * 86400000;
const KEY_RE = /^NXVL-\d{4}-\d{4}$/;

let keys = {};
try { keys = JSON.parse(readFileSync(FILE, "utf8")) || {}; } catch {}
function save() {
  try { mkdirSync(dirname(FILE), { recursive: true }); const tmp = FILE + ".tmp"; writeFileSync(tmp, JSON.stringify(keys, null, 1)); renameSync(tmp, FILE); }
  catch (e) { console.warn("[keys] couldn't save " + FILE + ":", String(e?.message || e)); }
}

const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const sign = (p) => createHmac("sha256", SECRET).update(p).digest("base64url");
const makeToken = () => { const p = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_MS })).toString("base64url"); return p + "." + sign(p); };
function tokenOk(t) {
  const [p, s] = String(t || "").split(".");
  if (!p || !s || !safeEq(sign(p), s)) return false;
  try { return JSON.parse(Buffer.from(p, "base64url").toString()).exp > Date.now(); } catch { return false; }
}

// at most 5 wrong admin codes per 15 minutes from one address
const fails = new Map();
const ipOf = (req) => String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
function locked(ip) { const f = fails.get(ip); return !!f && f.n >= 5 && Date.now() - f.t < 15 * 60 * 1000; }
function fail(ip) { const f = fails.get(ip); if (!f || Date.now() - f.t > 15 * 60 * 1000) fails.set(ip, { n: 1, t: Date.now() }); else { f.n++; f.t = Date.now(); } }

const view = (k) => {
  const now = Date.now(), expired = !!k.expiresAt && k.expiresAt <= now;
  return { key: k.key, label: k.label || "", status: k.revoked ? "revoked" : !k.redeemedAt ? "unused" : expired ? "expired" : "active", lifetime: k.durationMs == null, durationMs: k.durationMs, createdAt: k.createdAt, redeemedAt: k.redeemedAt || null, expiresAt: k.expiresAt || null, timeLeftMs: k.revoked ? 0 : !k.redeemedAt ? k.durationMs : k.expiresAt ? Math.max(0, k.expiresAt - now) : null, user: k.deviceName || "", device: k.deviceId ? String(k.deviceId).slice(0, 8) : "" };
};
const newKey = () => { for (let i = 0; i < 50; i++) { const c = "NXVL-" + String(randomInt(0, 10000)).padStart(4, "0") + "-" + String(randomInt(0, 10000)).padStart(4, "0"); if (!keys[c]) return c; } throw new Error("couldn't make a unique key"); };

export function registerKeys(app) {
  const body = (req) => (req.body && typeof req.body === "object" ? req.body : {});
  const admin = (req, reply) => { if (!process.env.ADMIN_CODE) { reply.code(503); return { error: "ADMIN_CODE is not set on the server" }; } if (!tokenOk(body(req).token)) { reply.code(401); return { error: "admin session expired. enter the admin code again" }; } return null; };

  app.post("/api/admin/login", async (req, reply) => {
    const ip = ipOf(req), code = String(body(req).code || "");
    if (!process.env.ADMIN_CODE) { reply.code(503); return { error: "admin tools are not set up on the server" }; }
    if (locked(ip)) { reply.code(429); return { error: "too many tries. wait 15 minutes" }; }
    if (!safeEq(code, process.env.ADMIN_CODE)) { fail(ip); reply.code(401); return { error: "not a valid code" }; }
    fails.delete(ip);
    return { token: makeToken(), expiresIn: TOKEN_MS };
  });

  app.post("/api/admin/keys", async (req, reply) => { const e = admin(req, reply); if (e) return e; return { keys: Object.values(keys).map(view).sort((a, b) => b.createdAt - a.createdAt), now: Date.now() }; });

  app.post("/api/admin/keys/create", async (req, reply) => {
    const e = admin(req, reply); if (e) return e;
    const b = body(req), count = Math.min(20, Math.max(1, Math.floor(Number(b.count) || 1)));
    let ms = null;
    if (b.lifetime !== true) { ms = Math.floor(Number(b.durationMs)); if (!(ms >= 60000) || ms > MAX_MS) { reply.code(400); return { error: "the length has to be between 1 minute and 100 years" }; } }
    const made = [];
    for (let i = 0; i < count; i++) { const key = newKey(); keys[key] = { key, label: String(b.label || "").slice(0, 60), durationMs: ms, createdAt: Date.now(), redeemedAt: null, expiresAt: null, deviceId: null, deviceName: "", revoked: false }; made.push(view(keys[key])); }
    save(); return { keys: made };
  });

  const act = (name, fn) => app.post("/api/admin/keys/" + name, async (req, reply) => {
    const e = admin(req, reply); if (e) return e;
    const k = keys[String(body(req).key || "")]; if (!k) { reply.code(404); return { error: "no such key" }; }
    fn(k); save(); return { ok: true, key: keys[k.key] ? view(k) : null };
  });
  act("revoke", (k) => { k.revoked = true; });
  act("restore", (k) => { k.revoked = false; });
  act("reset", (k) => { k.redeemedAt = null; k.expiresAt = null; k.deviceId = null; k.deviceName = ""; }); // lets it be used again from a new device, with its full time
  act("delete", (k) => { delete keys[k.key]; });

  // used by the people who type a key into About
  app.post("/api/keys/redeem", async (req, reply) => {
    const b = body(req), code = String(b.key || "").trim().toUpperCase(), dev = String(b.device || "").slice(0, 64);
    if (!KEY_RE.test(code) || !dev) { reply.code(400); return { error: "that doesn't look like a key. it looks like NXVL-0000-0000" }; }
    const k = keys[code]; if (!k || k.revoked) { reply.code(404); return { error: "that key isn't valid" }; }
    if (k.redeemedAt && k.deviceId !== dev) { reply.code(409); return { error: "that key is already being used by someone else" }; }
    if (!k.redeemedAt) { k.redeemedAt = Date.now(); k.expiresAt = k.durationMs == null ? null : k.redeemedAt + k.durationMs; k.deviceId = dev; k.deviceName = String(b.name || "").slice(0, 40); save(); }
    else if (b.name && String(b.name).slice(0, 40) !== k.deviceName) { k.deviceName = String(b.name).slice(0, 40); save(); }
    if (k.expiresAt && k.expiresAt <= Date.now()) { reply.code(410); return { error: "that key has expired" }; }
    return { ok: true, active: true, lifetime: k.expiresAt == null, expiresAt: k.expiresAt, now: Date.now() };
  });

  // the page asks again from time to time, so a revoked or expired key stops working
  app.post("/api/keys/check", async (req) => {
    const b = body(req), k = keys[String(b.key || "").trim().toUpperCase()];
    if (!k || k.revoked || !k.redeemedAt || k.deviceId !== String(b.device || "")) return { active: false };
    if (k.expiresAt && k.expiresAt <= Date.now()) return { active: false, expired: true };
    return { active: true, lifetime: k.expiresAt == null, expiresAt: k.expiresAt, now: Date.now() };
  });
}
