/**
 * Client-side image validation for Cloudflare Images constraints.
 */

export const CF_ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/heic',
  'image/heif',
]);

export const CF_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const CF_MAX_DIM = 12_000; // px per side
export const CF_MAX_AREA = 100_000_000; // 100 MP

export interface FileValidationResult {
  ok: boolean;
  error?: string;
  width?: number;
  height?: number;
}

export async function validateImageFile(file: File): Promise<FileValidationResult> {
  // Normalise type: some browsers report '' for HEIC — fall back to extension
  let mimeType = file.type.toLowerCase();
  if (!mimeType) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const extMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    mimeType = extMap[ext] ?? '';
  }

  if (!CF_ALLOWED_TYPES.has(mimeType)) {
    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'this format';
    return {
      ok: false,
      error: `${ext} files are not supported. Please use JPG, PNG, WebP, HEIC or GIF.`,
    };
  }

  if (file.size > CF_MAX_BYTES) {
    const mb = (file.size / 1_048_576).toFixed(1);
    return { ok: false, error: `File too large (${mb} MB). Maximum allowed size is 10 MB.` };
  }

  // SVG / HEIC browsers cannot decode raster dimensions — skip
  if (mimeType === 'image/svg+xml' || mimeType === 'image/heic' || mimeType === 'image/heif') {
    return { ok: true };
  }

  // Decode dimensions via <img>
  try {
    const url = URL.createObjectURL(file);
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('decode'));
      };
      img.src = url;
    });
    if (dims.w > CF_MAX_DIM || dims.h > CF_MAX_DIM) {
      return {
        ok: false,
        error: `Image too large (${dims.w}×${dims.h} px). Maximum is 12,000 px per side.`,
      };
    }
    if (dims.w * dims.h > CF_MAX_AREA) {
      const mp = ((dims.w * dims.h) / 1_000_000).toFixed(0);
      return {
        ok: false,
        error: `Image area too large (${mp} MP). Maximum is 100 megapixels.`,
      };
    }
    return { ok: true, width: dims.w, height: dims.h };
  } catch {
    return { ok: false, error: 'Cannot read image. Please try a different file.' };
  }
}
