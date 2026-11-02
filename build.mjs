import { build, context } from "esbuild";
import { cpSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");

rmSync("dist", { recursive: true, force: true });
for (const path of [
  "manifest.json",
  "icons",
  "decks",
  "popup/popup.html",
  "popup/popup.css",
  "options/options.html",
  "options/options.css",
]) {
  cpSync(`src/${path}`, `dist/${path}`, { recursive: true });
}

const options = {
  entryPoints: {
    content: "src/content/index.ts",
    background: "src/background.ts",
    "popup/popup": "src/popup/popup.ts",
    "options/options": "src/options/options.ts",
  },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "firefox140",
  logLevel: "info",
};

if (watch) await (await context(options)).watch();
else await build(options);
