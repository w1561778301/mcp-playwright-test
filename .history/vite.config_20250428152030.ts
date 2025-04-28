/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description:
 */
import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MCPPlaywrightTest",
      fileName: (format) => `index.${format === "es" ? "mjs" : "js"}`,
    },
    rollupOptions: {
      external: [
        "@modelcontextprotocol/sdk",
        "playwright",
        "simple-git",
        "express",
        "path",
        "fs",
        "os",
        "url",
        "http",
        "https",
      ],
      output: {
        globals: {
          "@modelcontextprotocol/sdk": "MCP",
          playwright: "Playwright",
          "simple-git": "SimpleGit",
          express: "Express",
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    nodePolyfills({
      include: ["crypto"],
      globals: {
        process: true,
        Buffer: true,
      },
    }),
  ],
});
