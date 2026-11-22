// A very small Fastify-style router for Cloudflare Workers.
// It only has what Nex.Velo's API files use: app.get / app.post, app.addHook("onRequest"), req.query / params / headers / body,
// and reply.code / header / send / stream. That lets the same route code run on Workers.

const enc = new TextEncoder();

function compile(path) {
  const parts = path.split("/").filter(Boolean);
  return (pathname) => {
    const segs = pathname.split("/").filter(Boolean);
    const params = {};
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p === "*") { params["*"] = segs.slice(i).join("/"); return params; }
      if (segs[i] === undefined) return null;
      if (p.startsWith(":")) { try { params[p.slice(1)] = decodeURIComponent(segs[i]); } catch { params[p.slice(1)] = segs[i]; } }
      else if (p !== segs[i]) return null;
    }
    return segs.length === parts.length ? params : null;
  };
}

// An async generator (or iterable) of Uint8Array / strings -> a web ReadableStream
export function streamFrom(iter) {
  const it = iter[Symbol.asyncIterator] ? iter[Symbol.asyncIterator]() : iter[Symbol.iterator]();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await it.next();
        if (done) controller.close();
        else controller.enqueue(typeof value === "string" ? enc.encode(value) : value);
      } catch (e) { controller.error(e); }
    },
    cancel() { try { it.return && it.return(); } catch {} },
  });
}

class Reply {
  constructor() { this.statusCode = 200; this.headers = new Headers(); this.payload = undefined; this.sent = false; }
  code(n) { this.statusCode = n; return this; }
  status(n) { return this.code(n); }
  header(k, v) { this.headers.set(k, String(v)); return this; }
  send(payload) { this.payload = payload; this.sent = true; return this; }
  // Streams text to the browser while it is being produced (used for the AI's answers).
  // fn(write, isClosed): write(string|Uint8Array)
  stream(fn, contentType = "text/event-stream") {
    const { readable, writable } = new TransformStream();
    const w = writable.getWriter();
    let closed = false;
    const write = (s) => { if (closed) return; w.write(typeof s === "string" ? enc.encode(s) : s).catch(() => { closed = true; }); };
    (async () => {
      try { await fn(write, () => closed); } catch {}
      closed = true;
      try { await w.close(); } catch {}
    })();
    if (!this.headers.has("content-type")) this.headers.set("content-type", contentType);
    if (!this.headers.has("cache-control")) this.headers.set("cache-control", "no-cache");
    return this.send(readable);
  }
  toResponse(returned) {
    let body = this.sent ? this.payload : returned;
    if (body === this) body = this.payload;
    const h = this.headers;
    if (body === undefined || body === null) return new Response(null, { status: this.statusCode, headers: h });
    if (body instanceof ReadableStream || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
      if (!h.has("content-type")) h.set("content-type", "application/octet-stream");
      return new Response(body, { status: this.statusCode, headers: h });
    }
    if (typeof body === "string") {
      if (!h.has("content-type")) h.set("content-type", "text/plain; charset=utf-8");
      return new Response(body, { status: this.statusCode, headers: h });
    }
    if (!h.has("content-type")) h.set("content-type", "application/json; charset=utf-8");
    return new Response(JSON.stringify(body), { status: this.statusCode, headers: h });
  }
}

export function createApp() {
  const routes = [];
  const hooks = [];
  const app = {
    get: (path, fn) => routes.push({ method: "GET", match: compile(path), fn }),
    post: (path, fn) => routes.push({ method: "POST", match: compile(path), fn }),
    addHook: (name, fn) => { if (name === "onRequest") hooks.push(fn); },
    addContentTypeParser: () => {}, // not needed: bodies are read below
    async handle(request) {
      const url = new URL(request.url);
      const reply = new Reply();
      const query = {};
      for (const [k, v] of url.searchParams) query[k] = v;
      const headers = {};
      request.headers.forEach((v, k) => { headers[k] = v; });
      const req = { url: url.pathname + url.search, method: request.method, query, params: {}, headers, body: undefined, raw: request };
      try {
        for (const hook of hooks) { await hook(req, reply); if (reply.sent) return reply.toResponse(); }
        const method = request.method === "HEAD" ? "GET" : request.method;
        for (const r of routes) {
          if (r.method !== method) continue;
          const params = r.match(url.pathname);
          if (!params) continue;
          req.params = params;
          if (method === "POST") {
            const type = headers["content-type"] || "";
            try { req.body = /json/i.test(type) ? await request.json() : /^text\//i.test(type) ? await request.text() : undefined; } catch { req.body = undefined; }
          }
          const out = await r.fn(req, reply);
          return reply.toResponse(out);
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { "content-type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: { "content-type": "application/json" } });
      }
    },
  };
  return app;
}
