import type { APIRoute } from 'astro';

// On-demand SSR: accepts a multipart upload of an ID document image and returns
// OCR-extracted fields via the Tesseract-based OCR service running on :8788.
//
// Routes:
//  1. Mock mode  → empty extractedData (pilgrim fills form manually)
//  2. Real mode  → HTTP POST to OCR_SERVICE_URL (default http://localhost:8788)
export const prerender = false;

// Matches the native Tesseract OCR service's OcrResponse shape (camelCase from serde)
interface OcrServiceResponse {
  success:       boolean;
  profileId:     string;
  documentType:  string;
  extractedData: {
    firstName:      string | null;
    middleName:     string | null;
    lastName:       string | null;
    secondLastName: string | null;
    documentNumber: string | null;
    documentType:   string | null;
    nationality:    string | null;
    dateOfBirth:    string | null;
    homeAddress:    string | null;
    country:        string | null;
    hasPhoto:       boolean;
  };
  confidence: number;
  avatarUrl:  string | null;
  warnings:   string[];
  rawText:    string | null;
}

// Shape that `book.astro` client-side script expects
interface FrontendExtractedData {
  firstName:      string;
  middleName:     string;
  lastName:       string;
  secondLastName: string;
  birthDate:      string;   // YYYY-MM-DD
  nationality:    string;
  documentNumber: string;
  homeAddress:    string;
  country:        string;
  avatarUrl:      string | null;
}

function mapResponse(raw: OcrServiceResponse): FrontendExtractedData {
  const d = raw.extractedData ?? {};
  return {
    firstName:      d.firstName      ?? '',
    middleName:     d.middleName     ?? '',
    lastName:       d.lastName       ?? '',
    secondLastName: d.secondLastName ?? '',
    birthDate:      d.dateOfBirth    ?? '',
    nationality:    d.nationality    ?? d.country ?? '',
    documentNumber: d.documentNumber ?? '',
    homeAddress:    d.homeAddress    ?? '',
    country:        d.country        ?? '',
    avatarUrl:      raw.avatarUrl    ?? null,
  };
}

export const POST: APIRoute = async ({ request }) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Expected multipart/form-data' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const docType   = (formData.get('docType') as string | null)?.toUpperCase() ?? '';
  const frontFile = formData.get('front') as File | null;

  if (!frontFile || !docType) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: docType, front' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (frontFile.size > 10 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'File too large (max 10 MB)' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiMode = import.meta.env.PUBLIC_API_MODE ?? 'mock';

  // ── 1. Mock mode ───────────────────────────────────────────────────────────
  if (apiMode !== 'real') {
    const empty: FrontendExtractedData = {
      firstName: '', middleName: '', lastName: '', secondLastName: '',
      birthDate: '', nationality: '', documentNumber: '',
      homeAddress: '', country: '', avatarUrl: null,
    };
    return new Response(
      JSON.stringify({ success: true, extractedData: empty, confidence: 0, mock: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 2. Real mode: forward to Tesseract OCR service (native binary on :8788) ─
  const ocrForm = new FormData();
  ocrForm.set('docType', docType);
  ocrForm.set('front', frontFile, frontFile.name);
  const backFile = formData.get('back') as File | null;
  if (backFile) ocrForm.set('back', backFile, backFile.name);

  const ocrServiceUrl = import.meta.env.OCR_SERVICE_URL ?? 'http://localhost:8788';

  try {
    const res = await fetch(`${ocrServiceUrl}/ocr`, {
      method: 'POST',
      body: ocrForm,
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          success: false, extractedData: null, confidence: 0,
          warnings: [`OCR service returned HTTP ${res.status}`],
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const raw = (await res.json()) as OcrServiceResponse;

    if (!raw.success) {
      return new Response(
        JSON.stringify({
          success: false,
          extractedData: null,
          confidence: raw.confidence,
          warnings: raw.warnings,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        profileId:     raw.profileId,
        documentType:  raw.documentType,
        extractedData: mapResponse(raw),
        confidence:    raw.confidence,
        warnings:      raw.warnings,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({
        success: false, extractedData: null, confidence: 0,
        warnings: ['OCR service unavailable — asegúrese de que el servicio OCR está activo en :8788'],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
