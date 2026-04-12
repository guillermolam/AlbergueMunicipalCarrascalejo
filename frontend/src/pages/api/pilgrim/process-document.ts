/**
 * POST /api/pilgrim/process-document
 *
 * Unified backend endpoint for document image processing.
 * Replaces all client-side OCR / validation / cropping.
 *
 * Accepts multipart/form-data:
 *   file      — image file (required)
 *   side      — "front" | "back" | "photo" (default: "front")
 *   docType   — "dni" | "passport" (default: "dni")
 *   userId    — Clerk userId for organizing R2 storage path (optional)
 *   backFile  — back image (optional, for combined OCR on front+back)
 *
 * Returns JSON:
 * {
 *   imageUrl:   string | null,   // R2 public URL (null in dev / if upload failed)
 *   ocrFields:  OcrFields | null,
 *   cvInfo:     CvInfo | null,
 *   valid:      boolean,
 *   errors:     string[],
 *   warnings:   string[],
 * }
 */
import type { APIRoute } from 'astro';

export const prerender = false;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OcrFields {
  firstName: string;
  lastName: string;
  lastName2: string; // segundo apellido
  documentNumber: string;
  birthDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  nationality: string;
  gender: string; // "M" | "F" | "X" | ""
  homeAddress: string; // from DOMICILIO on back side (may be empty)
}

export interface CvInfo {
  doc_type: string;
  side: string;
  confidence: number;
  has_photo_region?: boolean;
  has_eu_flag?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const emptyOcrFields = (): OcrFields => ({
  firstName: '',
  lastName: '',
  lastName2: '',
  documentNumber: '',
  birthDate: '',
  expiryDate: '',
  nationality: '',
  gender: '',
  homeAddress: '',
});

// ── R2 upload ─────────────────────────────────────────────────────────────────

/** Upload a file to R2 DOCUMENTS bucket. Returns the public URL or null. */
async function uploadToR2(
  locals: Record<string, unknown>,
  key: string,
  data: ArrayBuffer,
  contentType: string
): Promise<string | null> {
  try {
    // Cloudflare Workers runtime — R2 binding via cloudflare:workers
    // The 'env' from cloudflare:workers is the binding bag (R2, KV, D1, etc.)
    // We import it conditionally to avoid crashing in Node dev mode.
    const cfEnv = (locals['runtime'] as Record<string, unknown> | undefined)?.env as
      | Record<string, unknown>
      | undefined;

    const bucket = cfEnv?.['DOCUMENTS'] as
      | { put: (key: string, body: ArrayBuffer, opts: object) => Promise<unknown> }
      | undefined;

    if (!bucket) return null; // dev / Node adapter — no R2 binding

    await bucket.put(key, data, {
      httpMetadata: { contentType },
    });

    // Public URL — requires the bucket to have public access enabled.
    // Format: https://<bucket>.<account>.r2.cloudflarestorage.com/<key>
    // OR a custom domain set in the Cloudflare R2 dashboard.
    // The DOCUMENTS_PUBLIC_URL env var should be set to the public access URL root.
    const publicRoot: string =
      (cfEnv?.['DOCUMENTS_PUBLIC_URL'] as string | undefined) ??
      'https://documents.albergue-carrascalejo.com';

    return `${publicRoot.replace(/\/$/, '')}/${key}`;
  } catch (err) {
    console.warn('[process-document] R2 upload failed:', err);
    return null;
  }
}

// ── OCR call ──────────────────────────────────────────────────────────────────

interface OcrServiceResponse {
  success: boolean;
  extractedData?: {
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    secondLastName?: string | null;
    documentNumber?: string | null;
    nationality?: string | null;
    dateOfBirth?: string | null;
    expiryDate?: string | null;
    gender?: string | null;
    country?: string | null;
    homeAddress?: string | null;
  };
  confidence?: number;
  warnings?: string[];
  rawText?: string | null;
}

async function callOcrService(
  front: File,
  back: File | null,
  docType: string,
  ocrUrl: string
): Promise<{ fields: OcrFields | null; warnings: string[] }> {
  try {
    const form = new FormData();
    form.set('docType', docType.toUpperCase());
    form.set('front', front, front.name || 'front.jpg');
    if (back) form.set('back', back, back.name || 'back.jpg');

    const resp = await fetch(`${ocrUrl}/ocr`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(20_000),
    });

    if (!resp.ok) {
      return { fields: null, warnings: [`OCR service returned HTTP ${resp.status}`] };
    }

    const data = (await resp.json()) as OcrServiceResponse;
    if (!data.success || !data.extractedData) {
      return { fields: null, warnings: data.warnings ?? [] };
    }

    const d = data.extractedData;
    const fields: OcrFields = {
      firstName: d.firstName ?? d.middleName ?? '',
      lastName: d.lastName ?? '',
      lastName2: d.secondLastName ?? '',
      documentNumber: d.documentNumber ?? '',
      birthDate: d.dateOfBirth ?? '',
      expiryDate: d.expiryDate ?? '',
      nationality: d.nationality ?? d.country ?? '',
      gender: d.gender ?? '',
      homeAddress: d.homeAddress ?? '',
    };

    return { fields, warnings: data.warnings ?? [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OCR service unreachable';
    return { fields: null, warnings: [msg] };
  }
}

// ── Validation call ───────────────────────────────────────────────────────────

interface ValidationResponse {
  format_valid?: boolean;
  size_valid?: boolean;
  dimensions_valid?: boolean;
  errors?: string[];
  type_mismatch?: boolean;
  side_warning?: string | null;
  classification?: CvInfo | null;
}

async function callValidationService(
  file: File,
  declaredType: string,
  validationUrl: string
): Promise<{ cvInfo: CvInfo | null; valid: boolean; errors: string[]; sideWarning: string | null }> {
  try {
    // Convert file to base64 for the existing validation endpoint contract
    const arrayBuf = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    let binaryStr = '';
    for (let i = 0; i < bytes.length; i++) binaryStr += String.fromCharCode(bytes[i]!);
    const b64 = btoa(binaryStr);

    const resp = await fetch(`${validationUrl}/validate/image-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_data: b64,
        mime_type: file.type || 'image/jpeg',
        declared_type: declaredType,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!resp.ok) {
      return { cvInfo: null, valid: true, errors: [], sideWarning: null };
    }

    const data = (await resp.json()) as ValidationResponse;
    const valid =
      data.format_valid !== false &&
      data.size_valid !== false &&
      data.dimensions_valid !== false &&
      !data.type_mismatch;

    return {
      cvInfo: data.classification ?? null,
      valid,
      errors: data.errors ?? [],
      sideWarning: data.side_warning ?? null,
    };
  } catch {
    // Validation service unreachable — treat as valid, no CV info
    return { cvInfo: null, valid: true, errors: [], sideWarning: null };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export const POST: APIRoute = async (context) => {
  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return json({ error: 'Expected multipart/form-data' }, 400);
  }

  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return json({ error: "Missing 'file' field" }, 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return json({ error: 'File too large (max 10 MB)' }, 413);
  }

  const side = (formData.get('side') as string | null) ?? 'front';
  const docType = (formData.get('docType') as string | null) ?? 'dni';
  const userId = (formData.get('userId') as string | null) ?? 'anonymous';
  const backFile = formData.get('backFile') as File | null;

  const ocrUrl = import.meta.env.OCR_SERVICE_URL ?? 'http://localhost:8788';
  const validationUrl = import.meta.env.DOC_VALIDATION_URL ?? 'http://localhost:8787';

  const locals = context.locals as unknown as Record<string, unknown>;

  // ── 1. R2 Upload (non-blocking — fire & await) ────────────────────────────
  const ext = (file.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const r2Key = `documents/${userId}/${Date.now()}-${side}.${ext}`;
  const fileBuffer = await file.arrayBuffer();
  const r2UploadPromise = uploadToR2(locals, r2Key, fileBuffer, file.type || 'image/jpeg');

  // ── 2. OCR (backend Tesseract service) ────────────────────────────────────
  // Recreate File from arrayBuffer since reading it a second time requires a clone
  const fileClone = new File([fileBuffer], file.name || `${side}.jpg`, { type: file.type || 'image/jpeg' });
  const { fields: ocrFields, warnings: ocrWarnings } = await callOcrService(
    fileClone,
    backFile,
    docType,
    ocrUrl
  );

  // ── 3. Image validation + CV classification (backend Worker) ─────────────
  const fileClone2 = new File([fileBuffer], file.name || `${side}.jpg`, { type: file.type || 'image/jpeg' });
  const { cvInfo, valid, errors: validationErrors, sideWarning } = await callValidationService(
    fileClone2,
    docType,
    validationUrl
  );

  // ── 4. Await R2 URL ───────────────────────────────────────────────────────
  const imageUrl = await r2UploadPromise;

  // ── 5. Merge OCR + expiry from CV metadata ────────────────────────────────
  const finalFields: OcrFields = ocrFields ?? emptyOcrFields();

  const allWarnings = [...ocrWarnings, ...(sideWarning ? [sideWarning] : [])];

  return json({
    imageUrl,
    ocrFields: finalFields,
    cvInfo,
    valid,
    errors: validationErrors,
    warnings: allWarnings,
  });
};
