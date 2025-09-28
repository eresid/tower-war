import { defineConfig } from "@rsbuild/core";

export default defineConfig({
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
});
