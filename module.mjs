// The Composer module: deploying it creates the "nex-velo" project on Prisma
// Cloud and runs the Nex.Velo server as its one service.
import { module } from "@prisma/composer";
import service from "./service.mjs";

export default module("nex-velo", ({ provision }) => {
  provision(service);
});
