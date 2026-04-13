/**
 * Cloudflare Worker — Retto (PaddleOCR) WASM inference
 * 
 * Based on: https://github.com/CosteGieF/ort-cloudflare-workers
 * 
 * Works around workerd limitations:
 *   1. WebAssembly.compile() is blocked → use pre-compiled CompiledWasm module
 *   2. import.meta.url is empty → bypass with instantiateWasm callback
 *   3. Dynamic import() rejected → patched in build script
 */

import { Retto } from "@nekoimageland/retto-wasm";

declare const __RETTO_WASM__: WebAssembly.Module;
declare const __MODEL_DET__: ArrayBuffer;
declare const __MODEL_CLS__: ArrayBuffer;
declare const __MODEL_REC__: ArrayBuffer;
declare const __MODEL_DICT__: ArrayBuffer;

let retto: Retto | null = null;
let rettoReady = false;

async function initRetto() {
  if (rettoReady) return;
  
  console.log('[retto] Initializing with pre-compiled WASM...');
  
  const wasmModule = __RETTO_WASM__;
  
  retto = await Retto.load((progress) => {
    console.log(`[retto] Load: ${(progress * 100).toFixed(0)}%`);
  });
  
  await retto.init({
    det_model: __MODEL_DET__,
    cls_model: __MODEL_CLS__,
    rec_model: __MODEL_REC__,
    rec_dict: __MODEL_DICT__,
  });
  
  rettoReady = true;
  console.log('[retto] Ready');
}

function parseExtractedText(text: string, docType: string) {
  const result: Record<string, unknown> = {
    document_number: null,
    first_name: null,
    last_name: null,
    date_of_birth: null,
    nationality: 'ESP',
    gender: null,
  };

  const upper = text.toUpperCase();

  const dniMatch = upper.match(/\b(\d{8}[A-Z])\b/);
  const nieMatch = upper.match(/\b([XYZ]\d{7}[A-Z])\b/);
  
  if (docType?.toUpperCase() === 'NIE' && nieMatch) {
    result.document_number = nieMatch[1];
  } else if (dniMatch) {
    result.document_number = dniMatch[1];
  } else if (nieMatch) {
    result.document_number = nieMatch[1];
  }

  const dateMatch = text.match(/(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{4})/);
  if (dateMatch) {
    result.date_of_birth = `${dateMatch[3]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`;
  }

  return result;
}

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/health') {
      return new Response(JSON.stringify({
        service: 'retto-ocr',
        status: rettoReady ? 'ok' : 'initializing',
        engine: 'paddleocr-wasm',
        ready: rettoReady,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/ocr' && req.method === 'POST') {
      try {
        await initRetto();
        
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
          return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const formData = await req.formData();
        const front = formData.get('front') as File | null;
        
        if (!front) {
          return new Response(JSON.stringify({ error: "Missing 'front' image field" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const frontBuffer = await front.arrayBuffer();
        
        console.log('[retto] Running OCR...');
        const results = [];
        
        for await (const stage of retto!.recognize(frontBuffer)) {
          if (stage.result && stage.result.length > 0) {
            results.push(...stage.result);
          }
        }

        const extractedText = results
          .filter((r: { text: string }) => r.text)
          .map((r: { text: string }) => r.text)
          .join('\n');

        const docType = formData.get('docType')?.toString() || 'DNI';
        const extractedData = parseExtractedText(extractedText, docType);
        
        const confidence = results.length > 0 
          ? results.reduce((sum: number, r: { score: number }) => sum + (r.score || 0), 0) / results.length 
          : 0;

        return new Response(JSON.stringify({
          success: true,
          profile_id: 'retto-' + Math.random().toString(36).substring(2, 15),
          document_type: docType,
          extracted_data: extractedData,
          confidence: confidence,
          raw_text: extractedText,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[retto] Error:', error);
        return new Response(JSON.stringify({ 
          error: 'OCR processing failed',
          message: error instanceof Error ? error.message : String(error)
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};