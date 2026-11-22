// Standalone Cloudflare Worker that runs the Nex.Velo Wisp server.
// Any path works (/wisp/ is the one the site uses). Deployed by .github/workflows/deploy-wisp-worker.yml
import { handleWisp } from "../lib/wisp-cf.js";

export default {
  fetch(request, env) {
    return handleWisp(request, env);
  },
};
