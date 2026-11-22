// Counts visitors who are online right now. A Worker can run in many places at once, so the count has to live in one spot:
// this Durable Object. It keeps everything in memory (no storage writes), so it fits the free plan.
export class LiveCounter {
  constructor() { this.visitors = new Map(); }
  count() { const now = Date.now(); for (const [id, t] of this.visitors) if (now - t > 60000) this.visitors.delete(id); return this.visitors.size; }
  async fetch(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    if (url.pathname === "/ping" && /^[a-z0-9-]{8,48}$/i.test(id)) this.visitors.set(id, Date.now());
    return new Response(JSON.stringify({ count: this.count() }), { headers: { "content-type": "application/json" } });
  }
}
