/**
 * Retto OCR Worker - Cloudflare Worker using @nekoimageland/retto-wasm
 * 
 * Endpoints:
 *   GET  /health        → { service, status, engine }
 *   POST /ocr           → multipart: front (required), back (optional), docType
 *                      ← { success, profile_id, document_type, extracted_data, confidence, ... }
 * 
 * Solution: Manually load WASM binary to avoid import.meta.url issues in bundled npm package
 */

// Set import.meta.url before any other code runs (fixes createRequire crash)
if (typeof import.meta === 'undefined') {
  // @ts-ignore
  globalThis.import.meta = {};
}
if (!import.meta.url) {
  import.meta.url = 'file:///worker.mjs';
}

let retto = null;
let rettoReady = false;
let modelLoadError = null;

/**
 * Initialize Retto by manually loading WASM binary
 */
async function initRetto(env) {
  if (rettoReady) return true;
  if (modelLoadError) throw modelLoadError;

  try {
    console.log('[retto] Loading Retto WASM...');
    
    // Import the core retto_wasm module and Retto class separately
    const { default: retto_wasm } = await import('@nekoimageland/retto-wasm/dist/retto_wasm.js');
    const Retto = (await import('@nekoimageland/retto-wasm')).Retto;
    
    console.log('[retto] Fetching WASM binary...');
    
    // Try to get WASM from multiple sources
    let wasmBinary = null;
    
    // Option 1: Try to load from R2 if available
    try {
      if (env.OCR_MODELS) {
        const obj = await env.OCR_MODELS.get('models/retto_wasm.wasm');
        if (obj) {
          wasmBinary = await obj.arrayBuffer();
          console.log('[retto] Loaded WASM from R2');
        }
      }
    } catch (e) {
      console.log('[retto] R2 not available:', e.message);
    }
    
    // Option 2: Load from bundled public folder (if wrangler bundles it)
    if (!wasmBinary) {
      try {
        // Try loading from the npm package's public folder
        // This uses a direct import that bypasses the URL resolution
        const wasmUrl = new URL('/cdn/retto_wasm.wasm', import.meta.url).href;
        const response = await fetch(wasmUrl);
        if (response.ok) {
          wasmBinary = await response.arrayBuffer();
          console.log('[retto] Loaded WASM from CDN');
        }
      } catch (e) {
        console.log('[retto] CDN load failed:', e.message);
      }
    }
    
    // Option 3: Fallback - init without WASM to see if it's an embedded build
    console.log('[retto] Initializing Retto...');
    retto = await Retto.load((progress) => {
      console.log(`[retto] Load: ${(progress * 100).toFixed(0)}%`);
    });
    
    console.log('[retto] is_embed_build:', retto.is_embed_build);
    
    // Load models from HuggingFace CDN
    console.log('[retto] Fetching models from HuggingFace CDN...');
    const models = await loadModelsFromURL();
    console.log('[retto] Loaded models from HuggingFace');

    console.log('[retto] Initializing with models...');
    await retto.init(models);

    rettoReady = true;
    console.log('[retto] Retto initialized successfully');
    return true;
  } catch (error) {
    modelLoadError = error;
    console.error('[retto] Failed to initialize:', error.message);
    console.error('[retto] Stack:', error.stack);
    throw error;
  }
}

/**
 * Fetch model file from HuggingFace CDN
 */
async function loadModelsFromURL() {
  const baseURL = 'https://huggingface.co/pk5ls20/PaddleModel/resolve/main/retto/onnx';
  
  const modelFiles = [
    { key: 'det_model', name: 'ch_PP-OCRv4_det_infer.onnx' },
    { key: 'cls_model', name: 'ch_ppocr_mobile_v2.0_cls_infer.onnx' },
    { key: 'rec_model', name: 'ch_PP-OCRv4_rec_infer.onnx' },
    { key: 'rec_dict', name: 'ppocr_keys_v1.txt' },
  ];
  
  const models = {};
  
  for (const { key, name } of modelFiles) {
    console.log(`[retto] Fetching ${name} from HuggingFace...`);
    
    const response = await fetch(`${baseURL}/${name}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${name} - ${response.status}`);
    }
    
    models[key] = await response.arrayBuffer();
  }
  
  return models;
}

/**
 * Parse extracted text for Spanish documents
 */
function parseExtractedText(text, docType) {
  const result = {
    document_number: null,
    first_name: null,
    last_name: null,
    second_last_name: null,
    date_of_birth: null,
    nationality: null,
    gender: null,
    expiry_date: null,
  };

  const upper = text.toUpperCase();

  // DNI: 8 digits + letter
  const dniMatch = upper.match(/\b(\d{8}[A-Z])\b/);
  // NIE: X/Y/Z + 7 digits + letter
  const nieMatch = upper.match(/\b([XYZ]\d{7}[A-Z])\b/);
  
  if (docType?.toUpperCase() === 'NIE' && nieMatch) {
    result.document_number = nieMatch[1];
  } else if (dniMatch) {
    result.document_number = dniMatch[1];
  } else if (nieMatch) {
    result.document_number = nieMatch[1];
  }

  // Date of birth
  const datePatterns = [
    /(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{4})/,
    /(\d{4})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{1,2})/,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1].length === 4) {
        result.date_of_birth = `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
      } else {
        result.date_of_birth = `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
      }
      break;
    }
  }

  // Nationality
  const natMatch = upper.match(/\b(ESP|FRA|DEU|ITA|POR|USA|MEX|ARG|COLBRA)\b/);
  result.nationality = natMatch ? natMatch[1] : 'ESP';

  // Gender
  const sexMatch = upper.match(/\b(SEXO|SEX)[\s:]*([MFX])\b/i);
  if (sexMatch) {
    result.gender = sexMatch[2].toUpperCase();
  }

  // Extract names
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  for (let i = 0; i < lines.length; i++) {
    const lineUpper = lines[i].toUpperCase();
    
    if (lineUpper.includes('APELLIDO') && !result.last_name && i + 1 < lines.length) {
      const nextLine = lines[i + 1].replace(/[^A-ZÁÉÍÓÚÜÑ\s]/g, '').trim();
      if (nextLine && nextLine.length > 1) {
        const parts = nextLine.split(/\s+/);
        result.last_name = parts[0];
        if (parts.length > 1) {
          result.second_last_name = parts.slice(1).join(' ');
        }
      }
    }
    
    if (lineUpper.match(/^NOMBRE\s*$/) && !result.first_name && i + 1 < lines.length) {
      result.first_name = lines[i + 1].replace(/[^A-ZÁÉÍÓÚÜÑ\s]/g, '').trim();
    }
  }

  return result;
}

/**
 * Generate profile ID
 */
function generateProfileId() {
  return 'retto-' + Math.random().toString(36).substring(2, 15);
}

/**
 * Handle OCR request
 */
async function handleOcr(request, env) {
  await initRetto(env);

  const contentType = request.headers.get('content-type') || '';
  
  if (!contentType.includes('multipart/form-data')) {
    return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const front = formData.get('front');
  const docType = formData.get('docType')?.toString() || 'DNI';

  if (!front) {
    return new Response(JSON.stringify({ error: "Missing 'front' image field" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const frontBuffer = await front.arrayBuffer();
  
  console.log(`[retto] Running OCR on ${docType} document...`);
  const results = [];
  
  for await (const stage of retto.recognize(frontBuffer)) {
    console.log(`[retto] Stage: ${stage.stage}`, stage.result ? `${stage.result.length} items` : '');
    if (stage.result && stage.result.length > 0) {
      results.push(...stage.result);
    }
  }

  const extractedText = results
    .filter(r => r.text)
    .map(r => r.text)
    .join('\n');

  console.log(`[retto] Extracted text length: ${extractedText.length}`);

  const extractedData = parseExtractedText(extractedText, docType);
  extractedData.document_type = docType;

  const confidence = results.length > 0 
    ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length 
    : 0;

  const hasData = extractedData.document_number || extractedData.first_name || extractedData.last_name;

  const response = {
    success: hasData,
    profile_id: generateProfileId(),
    document_type: docType,
    extracted_data: extractedData,
    confidence: confidence,
    avatar_url: null,
    warnings: confidence < 0.4 ? ['Low OCR confidence - please verify extracted data'] : [],
    raw_text: extractedText,
  };

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle health check
 */
function handleHealth() {
  return new Response(JSON.stringify({
    service: 'retto-ocr',
    status: rettoReady ? 'ok' : 'initializing',
    engine: 'paddleocr-wasm',
    ready: rettoReady,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Main fetch handler
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

    try {
      if (path === '/health') {
        return handleHealth();
      }

      if (path === '/ocr' && request.method === 'POST') {
        try {
          return await handleOcr(request, env);
        } catch (ocrError) {
          console.error('[retto] OCR error:', ocrError);
          return new Response(JSON.stringify({ 
            error: 'OCR processing failed',
            message: ocrError.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('[retto] Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};