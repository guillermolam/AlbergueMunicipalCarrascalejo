/**
 * Retto OCR Worker - NOT WORKING
 * 
 * This worker attempts to use @nekoimageland/retto-wasm for PaddleOCR
 * but the npm package is incompatible with Cloudflare Workers due to:
 * 1. Rolldown bundler generating createRequire(import.meta.url) which crashes
 * 2. Internal module imports that aren't exported in package.json
 * 3. URL-based WASM loading that doesn't work in Workers
 * 
 * ENDPOINT: https://retto-ocr-worker.guillermolam-m.workers.dev
 * STATUS: Not working - needs fundamental package changes
 * 
 * For now, use the existing Tesseract ocr-service at port 8788
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') {
      return new Response(JSON.stringify({
        service: 'retto-ocr',
        status: 'error',
        engine: 'paddleocr-wasm',
        ready: false,
        error: 'Package incompatible with Cloudflare Workers'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Retto OCR not available - using Tesseract instead',
      tesseract_url: 'http://localhost:8788'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};