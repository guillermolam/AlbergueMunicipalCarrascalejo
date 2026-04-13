/**
 * Retto OCR Worker - NOT COMPATIBLE WITH CLOUDFLARE WORKERS
 * 
 * The @nekoimageland/retto-wasm npm package is fundamentally incompatible
 * with Cloudflare Workers because it internally tries to fetch:
 *   file:///public/retto_wasm.wasm
 * 
 * This file:// URL scheme doesn't work in workerd runtime.
 * 
 * The package would need to be forked and modified to support Workers.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path === '/health') {
      return new Response(JSON.stringify({
        service: 'retto-ocr',
        status: 'not-compatible',
        engine: 'paddleocr-wasm',
        ready: false,
        error: 'Package uses file:// URLs which dont work in workerd'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Retto OCR not available',
      message: 'The retto-wasm package is not compatible with Cloudflare Workers',
      alternative: 'Use Tesseract ocr-service at http://localhost:8788'
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};