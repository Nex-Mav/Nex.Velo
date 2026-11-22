// Nex.Velo Wisp server for Cloudflare (Workers and Pages Functions).
// Speaks Wisp v1 over a WebSocket and opens the real TCP connections with cloudflare:sockets.
// TLS is done by the browser's libcurl transport, so this server only carries raw bytes.
//
// Used by:
//   wisp-worker/index.js          standalone Worker  -> wss://nex-velo-wisp.<account>.workers.dev/wisp/
//   functions/wisp/[[path]].js    Pages Function     -> wss://<your-pages-site>/wisp/
//
// Known Cloudflare limits (they come from the platform, not from this file):
//   - A Worker cannot open TCP connections to sites that are themselves behind Cloudflare. Those streams are closed as "unreachable".
//   - No UDP.
//   - Outbound port 25 is blocked.
// The site keeps the Railway server and HolyWisp as automatic fallbacks for exactly these cases.

import { connect } from "cloudflare:sockets";

const T_CONNECT = 0x01, T_DATA = 0x02, T_CONTINUE = 0x03, T_CLOSE = 0x04;

// close reasons from the Wisp spec
const R_VOLUNTARY = 0x02, R_NETWORK = 0x03, R_INVALID = 0x41, R_UNREACHABLE = 0x42, R_BLOCKED = 0x47, R_THROTTLED = 0x48;

const BUFFER = 128;          // packets the browser may send on one stream before it must wait for a CONTINUE
const CONTINUE_EVERY = 32;   // tell the browser it can send more after this many packets were written to the socket
const MAX_STREAMS = 256;     // open streams per WebSocket
const BLOCKED_PORTS = new Set([25]);

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "*",
};

const decoder = new TextDecoder();

function packet(type, id, payload) {
  const body = payload || new Uint8Array(0);
  const out = new Uint8Array(5 + body.length);
  out[0] = type;
  new DataView(out.buffer).setUint32(1, id, true);
  out.set(body, 5);
  return out;
}

const u32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; };

// Refuses addresses that point inside a network instead of at the internet.
function blockedHost(host) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan")) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || a >= 224;
  }
  if (h.includes(":")) { // IPv6
    return h === "::" || h === "::1" || h.startsWith("fe8") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb") ||
      h.startsWith("fc") || h.startsWith("fd") || h.startsWith("::ffff:");
  }
  return false;
}

function originAllowed(request, env) {
  const list = String((env && env.ALLOWED_ORIGINS) || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.length) return true;
  const origin = request.headers.get("origin") || "";
  return list.includes(origin);
}

function session(ws) {
  const streams = new Map();
  let ended = false;

  const send = (bytes) => { if (ended || ws.readyState !== 1) return; try { ws.send(bytes); } catch {} };

  function closeStream(id, reason, tellBrowser) {
    const s = streams.get(id);
    if (!s) return;
    streams.delete(id);
    s.dead = true;
    try { s.writer && s.writer.releaseLock(); } catch {}
    try { s.reader && s.reader.cancel().catch(() => {}); } catch {}
    try { s.socket && s.socket.close().catch(() => {}); } catch {}
    if (tellBrowser) send(packet(T_CLOSE, id, new Uint8Array([reason])));
  }

  function onConnect(id, payload) {
    if (id === 0 || streams.has(id)) return;
    if (payload.length < 4) return send(packet(T_CLOSE, id, new Uint8Array([R_INVALID])));
    if (streams.size >= MAX_STREAMS) return send(packet(T_CLOSE, id, new Uint8Array([R_THROTTLED])));

    const kind = payload[0];
    const port = payload[1] | (payload[2] << 8);
    const host = decoder.decode(payload.subarray(3));
    if (kind !== 0x01) return send(packet(T_CLOSE, id, new Uint8Array([R_INVALID]))); // UDP is not available on Workers
    if (!port || BLOCKED_PORTS.has(port) || blockedHost(host)) return send(packet(T_CLOSE, id, new Uint8Array([R_BLOCKED])));

    const s = { socket: null, writer: null, reader: null, queued: 0, processed: 0, opened: false, dead: false };
    streams.set(id, s);
    try {
      s.socket = connect({ hostname: host, port }, { secureTransport: "off", allowHalfOpen: false });
      s.writer = s.socket.writable.getWriter();
      s.reader = s.socket.readable.getReader();
    } catch {
      closeStream(id, R_UNREACHABLE, true);
      return;
    }

    (async () => {
      try {
        await s.socket.opened;
        s.opened = true;
        for (;;) {
          const { value, done } = await s.reader.read();
          if (done || s.dead) break;
          // keep each Wisp packet at a sensible size
          for (let i = 0; i < value.length; i += 65536) send(packet(T_DATA, id, value.subarray(i, i + 65536)));
        }
        closeStream(id, R_VOLUNTARY, true);
      } catch {
        closeStream(id, s.opened ? R_NETWORK : R_UNREACHABLE, true);
      }
    })();
  }

  function onData(id, payload) {
    const s = streams.get(id);
    if (!s || !s.writer) return;
    s.queued++;
    s.writer.write(payload).then(() => {
      s.queued--;
      if (++s.processed % CONTINUE_EVERY === 0 && !s.dead) send(packet(T_CONTINUE, id, u32(Math.max(0, BUFFER - s.queued))));
    }).catch(() => closeStream(id, R_NETWORK, true));
  }

  function shutdown() {
    if (ended) return;
    for (const id of [...streams.keys()]) closeStream(id, R_VOLUNTARY, false);
    ended = true;
  }

  ws.addEventListener("message", (ev) => {
    if (typeof ev.data === "string") return;
    const buf = ev.data;
    if (!(buf instanceof ArrayBuffer) || buf.byteLength < 5) return;
    const bytes = new Uint8Array(buf);
    const id = new DataView(buf).getUint32(1, true);
    const payload = bytes.subarray(5);
    switch (bytes[0]) {
      case T_CONNECT: onConnect(id, payload); break;
      case T_DATA: onData(id, payload); break;
      case T_CLOSE: closeStream(id, R_VOLUNTARY, false); break;
      default: break; // INFO and anything newer is ignored: this server speaks Wisp v1
    }
  });
  ws.addEventListener("close", shutdown);
  ws.addEventListener("error", shutdown);

  // Wisp v1: the server starts by telling the browser how many packets each stream may have in flight.
  send(packet(T_CONTINUE, 0, u32(BUFFER)));
}

export function handleWisp(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if ((request.headers.get("upgrade") || "").toLowerCase() !== "websocket") {
    return new Response("Nex.Velo Wisp server (Cloudflare) is running.\nConnect to it with a WebSocket, e.g. wss://" + new URL(request.url).host + "/wisp/\n", {
      status: 200,
      headers: { ...CORS, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (!originAllowed(request, env)) return new Response("this origin is not allowed", { status: 403 });

  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();
  session(server);
  return new Response(null, { status: 101, webSocket: client });
}
