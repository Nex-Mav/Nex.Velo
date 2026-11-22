// Cloudflare Pages Function: the same Wisp server, on the Pages site's own address (wss://<your-site>/wisp/).
// It matches /wisp, /wisp/ and anything under it. The site tries this address automatically as its "same host" server.
import { handleWisp } from "../../lib/wisp-cf.js";

export const onRequest = (context) => handleWisp(context.request, context.env);
