// Assembles the deploy directory (dist/) that Prisma Compute ships: the server
// entry, lib/ and the built public/ assets in one self-contained folder. Runs
// after copy-assets.js, so public/ already holds the Scramjet/UV/v86 files.
// api/ (Vercel functions) and worker/ (Cloudflare) stay out: the Node server
// never reads them.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const entry of ["server.js", "lib", "public"]) {
  cpSync(entry, join(dist, entry), { recursive: true });
}

// The deployed files run straight from dist/, so the folder needs its own
// package.json marking them ESM.
writeFileSync(
  join(dist, "package.json"),
  JSON.stringify({ name: "Nex.Velo", version: "1.0.0", private: true, type: "module" }, null, 2) + "\n",
);

console.log("Deploy directory assembled in dist/");
