/**
 * POST /api/pilgrim/validate-sides
 *
 * Body: { frontFields: OcrFields, backFields: OcrFields, docType: string }
 *
 * Compares key fields between the front and back of an identity document
 * to catch OCR mismatches (common with cheap scan apps).
 *
 * Returns:
 *   { valid: boolean, mismatches: Mismatch[], warnings: string[] }
 */
import type { APIRoute } from 'astro';

export const prerender = false;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OcrFields {
  firstName?: string;
  lastName?: string;
  lastName2?: string;
  documentNumber?: string;
  birthDate?: string;   // YYYY-MM-DD
  expiryDate?: string;  // YYYY-MM-DD
  nationality?: string;
  gender?: string;      // "M" | "F" | "X"
}

interface Mismatch {
  field: string;
  front: string;
  back: string;
}

interface ValidateSidesResult {
  valid: boolean;
  mismatches: Mismatch[];
  warnings: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalize(s: string | undefined): string {
  if (!s) return '';
  return s.trim().toUpperCase();
}

/**
 * Compute Levenshtein edit distance between two strings.
 * We only care about distances 0 and 1 for the "allow 1 OCR error" rule,
 * so we short-circuit early for performance.
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2; // definitely > 1

  // Full DP for short strings (identity docs — names ≤ ~40 chars)
  const m = a.length;
  const n = b.length;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? j) + 1,      // deletion
        (curr[j - 1] ?? i) + 1,  // insertion
        (prev[j - 1] ?? i - 1) + cost // substitution
      );
      // Early-exit optimization (we only need to know ≤1 vs >1)
      if (i === j && curr[j]! > 1 && Math.abs(m - n) <= 0) return 2;
    }
    prev.splice(0, n + 1, ...curr.slice(0, n + 1));
  }
  return curr[n] ?? 2;
}

/** Returns true if the two normalized strings are "close enough" (edit distance ≤ 1). */
function fuzzyEqual(a: string, b: string): boolean {
  return editDistance(a, b) <= 1;
}

// ── Validation logic ──────────────────────────────────────────────────────────

function validateSides(
  front: OcrFields,
  back: OcrFields,
  docType: string
): ValidateSidesResult {
  const mismatches: Mismatch[] = [];
  const warnings: string[] = [];

  const nf = (s?: string) => normalize(s);

  // lastName — allow 1-char diff (common OCR error on accented chars)
  const fLast = nf(front.lastName);
  const bLast = nf(back.lastName);
  if (fLast && bLast && !fuzzyEqual(fLast, bLast)) {
    mismatches.push({ field: 'lastName', front: fLast, back: bLast });
  } else if (fLast && bLast && fLast !== bLast) {
    warnings.push(`Apellido: ligera discrepancia (${fLast} / ${bLast}) — posible error OCR`);
  }

  // birthDate — exact match required
  const fDob = nf(front.birthDate);
  const bDob = nf(back.birthDate);
  if (fDob && bDob && fDob !== bDob) {
    mismatches.push({ field: 'birthDate', front: fDob, back: bDob });
  }

  // gender — exact match required (M / F / X)
  const fGender = nf(front.gender);
  const bGender = nf(back.gender);
  if (fGender && bGender && fGender !== bGender) {
    mismatches.push({ field: 'gender', front: fGender, back: bGender });
  }

  // nationality — exact match if both present
  const fNat = nf(front.nationality);
  const bNat = nf(back.nationality);
  if (fNat && bNat && fNat !== bNat) {
    mismatches.push({ field: 'nationality', front: fNat, back: bNat });
  }

  // documentNumber — only for passport
  if (docType === 'passport') {
    const fDoc = nf(front.documentNumber);
    const bDoc = nf(back.documentNumber);
    if (fDoc && bDoc && !fuzzyEqual(fDoc, bDoc)) {
      mismatches.push({ field: 'documentNumber', front: fDoc, back: bDoc });
    }
  }

  // Warn about missing MRZ fields on back
  if (!back.birthDate && !back.documentNumber) {
    warnings.push('No se detectó zona MRZ en el reverso. Verifique la orientación de la imagen.');
  }

  return {
    valid: mismatches.length === 0,
    mismatches,
    warnings,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST: APIRoute = async (context) => {
  let body: { frontFields?: unknown; backFields?: unknown; docType?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.frontFields || typeof body.frontFields !== 'object') {
    return jsonResponse({ error: 'frontFields is required' }, 400);
  }
  if (!body.backFields || typeof body.backFields !== 'object') {
    return jsonResponse({ error: 'backFields is required' }, 400);
  }

  const docType = typeof body.docType === 'string' ? body.docType.toLowerCase() : 'dni';

  const result = validateSides(
    body.frontFields as OcrFields,
    body.backFields as OcrFields,
    docType
  );

  return jsonResponse(result);
};
