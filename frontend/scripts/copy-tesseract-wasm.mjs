#!/usr/bin/env node
/**
 * copy-tesseract-wasm.mjs
 *
 * Copies the tesseract-wasm WASM artifacts from node_modules into
 * public/tesseract/ so they are served as static files at runtime.
 *
 * Run manually:   pnpm setup:tesseract
 * Or add a postinstall hook if needed.
 *
 * The traineddata files (spa.traineddata, eng.traineddata) are NOT copied
 * here — they must be downloaded separately once:
 *   curl -L -o public/tesseract/spa.traineddata \
 *     https://github.com/tesseract-ocr/tessdata_fast/raw/main/spa.traineddata
 *   curl -L -o public/tesseract/eng.traineddata \
 *     https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata
 */

import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = resolve(__dir, '..');

const src  = resolve(root, 'node_modules/tesseract-wasm/dist');
const dest = resolve(root, 'public/tesseract');

mkdirSync(dest, { recursive: true });

const files = [
  'tesseract-core.wasm',
  'tesseract-core-fallback.wasm',
  'tesseract-worker.js',
];

for (const f of files) {
  copyFileSync(resolve(src, f), resolve(dest, f));
  console.log(`  copied  ${f}`);
}

// Warn if traineddata files are missing
for (const td of ['spa.traineddata', 'eng.traineddata']) {
  if (!existsSync(resolve(dest, td))) {
    console.warn(`  WARNING: ${td} not found in public/tesseract/ — download it:`);
    console.warn(`    curl -L -o public/tesseract/${td} https://github.com/tesseract-ocr/tessdata_fast/raw/main/${td}`);
  } else {
    console.log(`  present ${td}`);
  }
}

console.log('\ntesseract-wasm artifacts ready in public/tesseract/');
