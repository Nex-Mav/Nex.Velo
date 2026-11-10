// Copies Scramjet, bare-mux and libcurl browser files into public/ so they can be served.
// Finds each folder by looking for a known file, so it doesn't depend on a package's export names.
// Ultraviolet is optional: if it isn't installed, this prints a note and Scramjet still works.

import { cpSync, rmSync, readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, sep } from "node:path";

const base = join("node_modules", "@mercuryworkshop");

function findDir(pkg, marker) {
  const root = join(base, pkg);
  if (!existsSync(root)) throw new Error(`${pkg} is not installed`);
  const all = readdirSync(root, { recursive: true }).filter((p) => !p.split(sep).includes("node_modules"));
  const hits = all.filter((p) => p === marker || p.endsWith(sep + marker)).sort((a, b) => a.length - b.length);
  if (!hits.length) {
    console.error(`Could not find ${marker} in ${pkg}. Files present:\n` + all.slice(0, 80).join("\n"));
    throw new Error(`${marker} not found in ${pkg}`);
  }
  const dir = join(root, dirname(hits[0]));
  console.log(`${pkg}: using ${dir}`);
  return dir;
}

const jobs = [
  ["scramjet", "scramjet.all.js", "scram"],
  ["libcurl-transport", "index.mjs", "libcurl"],
  ["bare-mux", "worker.js", "baremux"],
];

for (const [pkg, marker, dest] of jobs) {
  const src = findDir(pkg, marker);
  rmSync(join("public", dest), { recursive: true, force: true });
  cpSync(src, join("public", dest), { recursive: true });
}

console.log("Assets copied to public/");

// Ultraviolet: copy its scripts into public/uv and write the config next to them.
// The prefix here has to match UV_PREFIX in public/sw.js.
const UV_CONFIG = `self.__uv$config = {
  prefix: "/service/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/uv/uv.handler.js",
  client: "/uv/uv.client.js",
  bundle: "/uv/uv.bundle.js",
  config: "/uv/uv.config.js",
  sw: "/uv/uv.sw.js",
};
`;
try {
  const root = join("node_modules", "@titaniumnetwork-dev", "ultraviolet");
  if (!existsSync(root)) throw new Error("@titaniumnetwork-dev/ultraviolet is not installed");
  const all = readdirSync(root, { recursive: true }).filter((p) => !p.split(sep).includes("node_modules"));
  const hit = all.filter((p) => p === "uv.bundle.js" || p.endsWith(sep + "uv.bundle.js")).sort((a, b) => a.length - b.length)[0];
  if (!hit) throw new Error("uv.bundle.js not found in the package");
  const dir = join(root, dirname(hit));
  console.log(`ultraviolet: using ${dir}`);
  rmSync(join("public", "uv"), { recursive: true, force: true });
  mkdirSync(join("public", "uv"), { recursive: true });
  // the package's own uv.config.js and the debug .map files are left out
  cpSync(dir, join("public", "uv"), { recursive: true, filter: (src) => !/uv\.config\.js$/.test(src) && !/\.map$/.test(src) });
  writeFileSync(join("public", "uv", "uv.config.js"), UV_CONFIG);
  console.log("Ultraviolet copied to public/uv");
} catch (e) {
  console.warn(`Ultraviolet was not copied (${e.message}). Scramjet still works; the Ultraviolet option falls back to it.`);
}

// Print installed versions so mismatches are easy to spot in the build log
for (const pkg of ["scramjet", "libcurl-transport", "bare-mux", "wisp-js"]) {
  try {
    const v = JSON.parse(readFileSync(join(base, pkg, "package.json"), "utf8")).version;
    console.log(`version ${pkg}@${v}`);
  } catch {}
}
try {
  const v = JSON.parse(readFileSync(join("node_modules", "@titaniumnetwork-dev", "ultraviolet", "package.json"), "utf8")).version;
  console.log(`version ultraviolet@${v}`);
} catch {}
