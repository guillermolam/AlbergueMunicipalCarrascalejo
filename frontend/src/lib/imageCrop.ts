/**
 * Face crop and avatar upload helpers.
 */

/** Brief toast for non-critical booking-flow notifications. */
export function showBookingToast(message: string, color = '#5D4E37'): void {
  let toast = document.getElementById('booking-toast') as HTMLDivElement | null;
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'booking-toast';
    toast.style.cssText = [
      'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(2rem)',
      'background:#fff;border:1.5px solid #D4A574;border-radius:12px',
      "padding:0.55rem 1.2rem;font-family:'Patrick Hand',cursive;font-size:0.88rem",
      'box-shadow:0 4px 18px rgba(0,0,0,0.12);z-index:9999',
      'transition:opacity 300ms,transform 300ms;opacity:0;pointer-events:none',
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.style.color = color;
  toast.textContent = message;
  // Animate in
  requestAnimationFrame(() => {
    toast!.style.opacity = '1';
    toast!.style.transform = 'translateX(-50%) translateY(0)';
  });
  // Animate out after 2.8 s
  setTimeout(() => {
    toast!.style.opacity = '0';
    toast!.style.transform = 'translateX(-50%) translateY(2rem)';
  }, 2800);
}

/** Convert a base64 JPEG data URL to a File object for Clerk's setProfileImage(). */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, b64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

/**
 * Upload a cropped face image to Clerk as the authenticated user's profile picture.
 * Fire-and-forget — does not block the booking flow.
 * Only applicable for pilgrim 0 (the booking account holder).
 */
export async function uploadAvatarToClerk(dataUrl: string): Promise<void> {
  try {
    const w = window as unknown as Record<string, unknown> & {
      Clerk?: {
        load?: () => Promise<void>;
        user?: { setProfileImage: (opts: { file: File }) => Promise<void> } | null;
      };
    };
    // Wait for Clerk to initialise (it may not be ready immediately)
    if (!w.Clerk?.user) {
      try {
        await w.Clerk?.load?.();
      } catch {
        /* Clerk not available — skip */
      }
    }
    const user = w.Clerk?.user;
    if (!user) return; // Not logged in — nothing to do
    const file = dataUrlToFile(dataUrl, 'pilgrim-avatar.jpg');
    await user.setProfileImage({ file });
    // Show a brief toast
    showBookingToast('Foto de perfil actualizada ✓', '#00AB39');
  } catch (err) {
    // Non-fatal — avatar upload failure must never interrupt booking
    console.warn('[clerk] Avatar upload failed:', err);
  }
}

/**
 * Crop the face/photo region from a document image using Canvas API.
 * For EU ID card front: face is in the left ~32% of the landscape card.
 * For passport page:    face is in the left ~35% of the portrait page.
 * Returns a data URL (JPEG, 256×256) suitable for Clerk setProfileImage().
 */
export async function cropFaceForAvatar(file: File, _docType: string): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const isLandscape = w > h;

      // Define crop region based on document type and orientation
      let sx: number, sy: number, sw: number, sh: number;
      if (isLandscape) {
        // ID card front: face occupies left ~32% of the card, vertically centred
        sw = Math.round(w * 0.32);
        sh = Math.round(h * 0.82);
        sx = Math.round(w * 0.03);
        sy = Math.round(h * 0.09);
      } else {
        // Passport portrait page: face top-left, roughly 38% wide × 42% tall
        sw = Math.round(w * 0.38);
        sh = Math.round(h * 0.42);
        sx = Math.round(w * 0.04);
        sy = Math.round(h * 0.06);
      }

      const OUT = 256;
      const canvas = document.createElement('canvas');
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Fit the cropped region into a square with white background
      const ratio = sw / sh;
      let dw: number, dh: number, dx: number, dy: number;
      if (ratio > 1) {
        dw = OUT;
        dh = Math.round(OUT / ratio);
        dx = 0;
        dy = Math.round((OUT - dh) / 2);
      } else {
        dh = OUT;
        dw = Math.round(OUT * ratio);
        dy = 0;
        dx = Math.round((OUT - dw) / 2);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUT, OUT);
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
