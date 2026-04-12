/**
 * Retto OCR Worker - Cloudflare Worker using @nekoimageland/retto-wasm
 * 
 * Endpoints:
 *   GET  /health        → { service, status, engine }
 *   POST /ocr           → multipart: front (required), back (optional), docType
 *                      ← { success, profile_id, document_type, extracted_data, confidence, ... }
 * 
 * Models are loaded from:
 *   1. R2 bucket: OCR_MODELS binding (models/ folder)
 *   2. HuggingFace Hub (fallback)
 *   3. Bundled (if available in deployment)
 */

let retto = null;
let rettoReady = false;
let modelLoadError = null;

/**
 * Initialize Retto WASM with models
 */
async function initRetto(env) {
  if (rettoReady) return true;
  if (modelLoadError) throw modelLoadError;

  try {
    console.log('[retto] Loading Retto WASM...');
    const Retto = await import('@nekoimageland/retto-wasm');
    
    // Try to load models - multiple strategies
    let models = null;
    
    // Strategy 1: Try R2 bucket first
    try {
      models = await loadModelsFromR2(env);
      console.log('[retto] Loaded models from R2');
    } catch (r2Error) {
      console.log('[retto] R2 not available, trying HuggingFace Hub:', r2Error.message);
    }
    
    // Strategy 2: Fallback to embedded models or HF Hub
    if (!models) {
      console.log('[retto] Trying embedded/default models...');
      // The init() without models will try to use embedded models
      // or download from HF if configured
    }

    console.log('[retto] Initializing Retto with models...');
    retto = await Retto.Retto.load((progress) => {
      console.log(`[retto] Loading: ${(progress * 100).toFixed(0)}%`);
    });

    if (models) {
      await retto.init(models);
    } else {
      // Try default initialization (uses embedded or HF)
      await retto.init();
    }

    rettoReady = true;
    console.log('[retto] Retto initialized successfully');
    return true;
  } catch (error) {
    modelLoadError = error;
    console.error('[retto] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Fetch model file from R2 bucket
 */
async function loadModelsFromR2(env) {
  const bucket = env.OCR_MODELS;
  if (!bucket) {
    throw new Error('OCR_MODELS R2 binding not configured');
  }
  
  const modelFiles = [
    'ch_PP-OCRv4_det_infer.onnx',
    'ch_ppocr_mobile_v2.0_cls_infer.onnx',
    'ch_PP-OCRv4_rec_infer.onnx',
    'ppocr_keys_v1.txt',
  ];
  
  const models = {};
  
  for (const filename of modelFiles) {
    const key = `models/${filename}`;
    console.log(`[retto] Fetching ${key} from R2...`);
    
    const object = await bucket.get(key);
    if (!object) {
      throw new Error(`Model file not found in R2: ${key}`);
    }
    
    const arrayBuffer = await object.arrayBuffer();
    
    // Map to expected model names
    const modelKey = filename.replace('ch_PP-OCRv4_', '').replace('ch_ppocr_mobile_v2.0_', '').replace('_infer.onnx', '_model');
    if (filename.includes('det')) models.det_model = arrayBuffer;
    else if (filename.includes('cls')) models.cls_model = arrayBuffer;
    else if (filename.includes('rec')) models.rec_model = arrayBuffer;
    else if (filename.includes('dict') || filename.includes('keys')) models.rec_dict = arrayBuffer;
  }
  
  // Verify we have all required models
  if (!models.det_model || !models.rec_model) {
    throw new Error('Missing required models from R2');
  }
  
  return models;
}

/**
 * Map document type to Retto-compatible format
 */
function getLangFromDocType(docType) {
  switch (docType?.toUpperCase()) {
    case 'DNI':
    case 'NIE':
      return 'spa'; // Spanish
    case 'PASSPORT':
      return 'eng'; // English
    default:
      return 'spa+eng'; // Both
  }
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

  // Document number patterns
  // DNI: 8 digits + letter (e.g., 12345678A)
  // NIE: X/Y/Z + 7 digits + letter (e.g., X1234567A)
  const dniMatch = upper.match(/\b(\d{8}[A-Z])\b/);
  const nieMatch = upper.match(/\b([XYZ]\d{7}[A-Z])\b/);
  
  if (docType?.toUpperCase() === 'NIE' && nieMatch) {
    result.document_number = nieMatch[1];
  } else if (dniMatch) {
    result.document_number = dniMatch[1];
  } else if (nieMatch) {
    result.document_number = nieMatch[1];
  }

  // Date of birth - various formats
  const datePatterns = [
    /(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{4})/,  // DD MM YYYY
    /(\d{4})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{1,2})/,  // YYYY MM DD
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

  // Nationality - 3-letter codes
  const natMatch = upper.match(/\b(ESP|FRA|DEU|ITA|POR|GBR|USA|MEX|ARG|COL|BRA|MAR)\b/);
  if (natMatch) {
    result.nationality = natMatch[1];
  } else {
    result.nationality = 'ESP'; // Default to Spanish
  }

  // Gender
  const sexMatch = upper.match(/\b(SEXO|SEX)[\s:]*([MFX])\b/i);
  if (sexMatch) {
    result.gender = sexMatch[2].toUpperCase();
  }

  // Extract names - this is a simplified version
  // A full implementation would use the regex patterns from the existing parser
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const nameKeywords = ['APELLIDOS', 'NOMBRE', 'SURNAME', 'NAME', 'APELLIDO'];
  
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
  // Initialize Retto if needed
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
  const back = formData.get('back');
  const docType = formData.get('docType')?.toString() || 'DNI';

  if (!front) {
    return new Response(JSON.stringify({ error: "Missing 'front' image field" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Convert file to ArrayBuffer
  const frontBuffer = await front.arrayBuffer();
  
  // Run OCR
  console.log(`[retto] Running OCR on ${docType} document...`);
  const results = [];
  
  for await (const stage of retto.recognize(frontBuffer)) {
    console.log(`[retto] Stage: ${stage.stage}`, stage.result ? `${stage.result.length} items` : '');
    if (stage.result && stage.result.length > 0) {
      results.push(...stage.result);
    }
  }

  // Extract text from results
  const extractedText = results
    .filter(r => r.text)
    .map(r => r.text)
    .join('\n');

  console.log(`[retto] Extracted text length: ${extractedText.length}`);

  // Parse into structured data
  const extractedData = parseExtractedText(extractedText, docType);
  extractedData.document_type = docType;

  // Calculate confidence (simplified)
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

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route requests
      if (path === '/health') {
        return handleHealth();
      }

      if (path === '/ocr' && request.method === 'POST') {
        return handleOcr(request, env);
      }

      // Unknown endpoint
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