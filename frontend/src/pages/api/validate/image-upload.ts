import type { APIRoute } from 'astro';

// ── Constants — mirror Cloudflare Images limits ───────────────────────────────
const CF_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const CF_MAX_DIM = 12_000; // px per side
const CF_MAX_AREA = 100_000_000; // 100 MP
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/heic',
  'image/heif',
]);

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // ── Parse request body ────────────────────────────────────────────────────
  let body: { image_data?: string; mime_type?: string; declared_type?: string };
  try {
    body = await request.json();
  } catch {
    return json({ errors: ['Invalid JSON body'] }, 400);
  }

  const { image_data, mime_type = 'image/jpeg', declared_type = 'unknown' } = body;

  if (!image_data) {
    return json({ errors: ['Missing image_data'] }, 400);
  }

  // ── 1. Format validation ──────────────────────────────────────────────────
  const errors: string[] = [];
  const mime = mime_type.toLowerCase();
  const format_valid = ALLOWED_MIMES.has(mime);
  if (!format_valid) {
    errors.push(`Unsupported format: '${mime_type}'. Allowed: JPEG, PNG, GIF, WebP, SVG, HEIC.`);
  }

  // ── 2. Decode base64 → byte buffer ────────────────────────────────────────
  let imageBytes: Uint8Array;
  try {
    const binaryStr = atob(image_data);
    imageBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) imageBytes[i] = binaryStr.charCodeAt(i);
  } catch {
    return json({
      format_valid: false,
      size_valid: false,
      dimensions_valid: false,
      width: null,
      height: null,
      file_size_bytes: 0,
      errors: ['Invalid base64 image data.'],
      classification: null,
      type_mismatch: false,
      side_warning: null,
    });
  }

  // ── 3. Size validation ────────────────────────────────────────────────────
  const file_size_bytes = imageBytes.byteLength;
  const size_valid = file_size_bytes <= CF_MAX_BYTES;
  if (!size_valid) {
    errors.push(
      `File too large (${(file_size_bytes / 1_048_576).toFixed(1)} MB). Maximum is 10 MB.`
    );
  }

  // ── 4. Proxy to the real document-validation Cloudflare Worker ────────────
  //    DOC_VALIDATION_URL env var must point to the deployed worker, e.g.:
  //    https://document-validation-service.<account>.workers.dev
  //
  //    Astro/Vite exposes server-side env vars via import.meta.env in SSR.
  //    In Cloudflare Workers production, they also live in locals.runtime.env.
  const workerUrl: string | undefined =
    (locals as Record<string, unknown>).runtime?.env?.DOC_VALIDATION_URL ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (import.meta as any).env?.DOC_VALIDATION_URL ??
    (typeof process !== 'undefined' ? process.env.DOC_VALIDATION_URL : undefined);

  if (workerUrl && format_valid && size_valid) {
    try {
      const workerResp = await fetch(`${workerUrl.replace(/\/$/, '')}/validate/image-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data, mime_type, declared_type }),
        signal: AbortSignal.timeout(10_000), // 10 s — workers can be slow on cold start
      });
      if (workerResp.ok) {
        const workerData = await workerResp.json();
        return json(workerData);
      }
      // Worker returned an error — fall through to format-only response below
    } catch {
      // Worker unreachable — fall through
    }
  }

  // ── 5. Dimension check (best-effort — works in Cloudflare Workers & Bun) ──
  let width: number | null = null;
  let height: number | null = null;
  let dimensions_valid = true;

  const isRaster = !['image/svg+xml', 'image/heic', 'image/heif'].includes(mime);

  if (isRaster && format_valid && size_valid && typeof createImageBitmap !== 'undefined') {
    try {
      const blob = new Blob([imageBytes], { type: mime });
      const bmp = await createImageBitmap(blob);
      width = bmp.width;
      height = bmp.height;
      bmp.close();

      if (width > CF_MAX_DIM || height > CF_MAX_DIM) {
        dimensions_valid = false;
        errors.push(
          `Image too large (${width}×${height} px). Maximum is ${CF_MAX_DIM.toLocaleString()} px per side.`
        );
      } else if (width * height > CF_MAX_AREA) {
        dimensions_valid = false;
        errors.push(
          `Image area too large (${((width * height) / 1_000_000).toFixed(0)} MP). Maximum is 100 megapixels.`
        );
      }
    } catch {
      // createImageBitmap unavailable in this runtime — skip, treat as valid
    }
  }

  // ── 6. Return format/size/dimension result — no CV classification ─────────
  //    classification is null when the CV backend is unreachable.
  //    book.astro treats null classification as "valid but unclassified" and
  //    will still allow the upload to proceed if format + size + dimensions pass.
  return json({
    format_valid,
    size_valid,
    dimensions_valid,
    width,
    height,
    file_size_bytes,
    errors,
    classification: null,
    type_mismatch: false,
    side_warning: null,
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
