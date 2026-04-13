#!/usr/bin/env node
/**
 * Build script: esbuild + post-process patches for @nekoimageland/retto-wasm in Cloudflare Workers.
 * 
 * Based on: https://github.com/CosteGieF/ort-cloudflare-workers
 * 
 * Root problem: workerd blocks WebAssembly.compile() and import.meta.url is empty
 * Solution: three patches applied after esbuild bundles the code
 */

import esbuild from "esbuild";
import { cpSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, ".worker");
const RETTO_DIST = resolve(__dirname, "node_modules/@nekoimageland/retto-wasm/dist");
const RETTO_PUBLIC = resolve(__dirname, "node_modules/@nekoimageland/retto-wasm/dist/public");

// Cleanup
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

console.log("[build] esbuild ...");

await esbuild.build({
  entryPoints: [resolve(__dirname, "src/index.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  platform: "browser",
  outfile: resolve(OUT_DIR, "index.js"),
  sourcemap: true,
  minify: false,
  external: [
    "node:async_hooks", 
    "cloudflare:workers",
    "node:module",
    "node:worker_threads",
    "module",  // for createRequire
    "worker_threads",
  ],
  alias: {
    "@nekoimageland/retto-wasm": resolve(RETTO_DIST, "index.js"),
    "@nekoimageland/retto-wasm/dist/retto_wasm.js": resolve(RETTO_DIST, "retto_wasm.js"),
  },
});

console.log("[build] copying assets ...");
cpSync(resolve(RETTO_PUBLIC, "retto_wasm.wasm"), resolve(OUT_DIR, "retto_wasm.wasm"));

console.log("[build] patching bundle ...");
let code = readFileSync(resolve(OUT_DIR, "index.js"), "utf8");

// Patch 1: preamble — static import for WASM module
const preamble = [
  `import __RETTO_WASM__ from "./retto_wasm.wasm";`,
  `globalThis.__RETTO_WASM__ = __RETTO_WASM__;`,
].join("\n") + "\n";
code = preamble + code;

// Patch 2: inject instantiateWasm on Emscripten Module config
// Find the config object that has numThreads and inject instantiateWasm
const configMatch = code.match(/let\s+(\w+)\s*=\s*\{\s*numThreads/);
if (configMatch) {
  const configVar = configMatch[1];
  console.log(`[build]   found config var: ${configVar}`);
  
  // Find where it's passed to the factory function
  const factoryMatch = code.match(new RegExp(`(\\w+)\\(${configVar}\\)`));
  if (factoryMatch) {
    const factoryName = factoryMatch[1];
    const injectSnippet = `${configVar}.instantiateWasm = (imports, cb) => { var inst = new WebAssembly.Instance(__RETTO_WASM__, imports); cb(inst, __RETTO_WASM__); return inst.exports; };`;
    
    // Inject before the factory call
    code = code.replace(
      new RegExp(`(\\w+\\(${configVar}\\)\\.then\\(`),
      injectSnippet + " $1"
    );
    console.log(`[build]   injected instantiateWasm on config var "${configVar}"`);
  }
}

// Patch 3: kill dynamic import() — workerd rejects at module analysis time
let dynamicImportCount = 0;
code = code.replace(/await import\([\s\S]*?\)/g, (match) => {
  if (/await import\(\s*["'`]/.test(match)) return match;
  dynamicImportCount++;
  return 'await Promise.reject(new Error("dynamic import disabled in workerd"))';
});
console.log(`[build]   patched ${dynamicImportCount} dynamic import() call(s)`);

// Patch 4: fix URL creation - replace file:// URLs with valid fallback
// The retto package uses new URL("public/retto_wasm.wasm", import.meta.url)
code = code.replace(
  /new URL\("public\/retto_wasm\.wasm", import\.meta\.url\)/g,
  'new URL("./retto_wasm.wasm", "file:///worker.mjs")'
);

// Patch 5: silence or fix import.meta.url issues
// Replace any undefined import.meta.url with fallback
code = code.replace(
  /import\.meta\.url(?!\s*\??\.|\s*\[)/g,
  'import.meta.url || "file:///worker.mjs"'
);

writeFileSync(resolve(OUT_DIR, "index.js"), code);

console.log(`[build] done — .worker/index.js (${(code.length / 1024).toFixed(0)} KB)`);

for (const f of ["index.js", "retto_wasm.wasm"]) {
  if (!existsSync(resolve(OUT_DIR, f))) throw new Error(`Missing ${f} in .worker/`);
}
console.log("[build] all assets verified ✓");

console.log("\nDeploy with:");
console.log("  wrangler deploy .worker/index.js --no-bundle");