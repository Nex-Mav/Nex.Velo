// The Nex.Velo service declaration: the running unit Prisma Compute boots.
// The app is plain Node source (no bundler), so its build output is the dist/
// folder the build script assembles, and its packages stay external — the
// deploy traces them from dist/server.js and stages what it imports.
import { compute } from "@prisma/composer-prisma-cloud";
import node from "@prisma/composer/node";

export default compute({
  name: "web",
  deps: {},
  build: node({
    module: import.meta.url,
    dir: "./dist",
    entry: "server.js",
    dependencies: "external",
  }),
});
