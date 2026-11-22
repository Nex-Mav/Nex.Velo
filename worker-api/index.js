// Nex.Velo on Cloudflare: one Worker that serves the website, the API (music, games, AI, movies, books, lyrics...),
// the ad-free key system and the Wisp server.
//   /wisp/            Wisp server (WebSocket)       -> lib/wisp-cf.js
//   /api/admin/*, /api/keys/*  ad-free keys (KV)    -> worker/key-worker.js
//   /api/*            everything else in the API    -> lib/api-cf.js
//   anything else     the website (public/)         -> Workers static assets
import { createApp } from "../lib/cf-app.js";
import { registerApi, setEnv } from "../lib/api-cf.js";
import { handleWisp } from "../lib/wisp-cf.js";
import keyWorker from "../worker/key-worker.js";

export { LiveCounter } from "../lib/live-do.js";

const app = createApp();
registerApi(app);

export default {
  async fetch(request, env, ctx) {
    setEnv(env);
    const { pathname } = new URL(request.url);

    if (pathname === "/wisp" || pathname.startsWith("/wisp/")) return handleWisp(request, env);

    if (pathname.startsWith("/api/admin/") || pathname.startsWith("/api/keys/")) return keyWorker.fetch(request, env, ctx);

    if (pathname.startsWith("/api/")) return app.handle(request, env, ctx);

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Nex.Velo is running on Cloudflare. The website files are not attached to this Worker (see worker-api/wrangler.toml).\n", { status: 404 });
  },
};
