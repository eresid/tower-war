import { defineConfig } from "@rsbuild/core";

export default defineConfig(({ env }) => ({
  server: {
    port: 4010,
  },
  html: {
    template: "./index.html",
  },
  source: {
    entry: {
      main: "./src/index.ts",
    },
  },
  output: {
    assetPrefix: env === "production" ? "./" : "/",
    distPath: { root: "dist2" },
  },
}));
