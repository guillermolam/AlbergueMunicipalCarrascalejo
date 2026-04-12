/**
 * DOM helper utilities shared across all booking islands.
 *
 * Extracted from the inline helpers in book.astro.
 * No innerHTML — all DOM construction uses the DOM API.
 */

/** Remove all child nodes from an element. Avoids innerHTML for security. */
export function clearEl(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Parse a trusted static SVG string into an SVGElement.
 * ONLY call with compile-time constant SVG strings — never with user input.
 */
export function parseSVG(svgStr: string): SVGElement {
  const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
  return doc.documentElement as unknown as SVGElement;
}

// ── Document Illustration SVGs ──────────────────────────────────────────────
// These are static, trusted compile-time constants. They are rendered via
// parseSVG() — no user-controlled data is ever interpolated into them.
// DNI proportions ≈ 85.6×54 mm (ID-1); passport page portrait 58×82.

export const SVG_DNI_FRONT = `<svg width="86" height="54" viewBox="0 0 86 54" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="86" height="54" rx="4" fill="#EAF6FF"/>
  <rect x="1" y="1" width="84" height="52" rx="3.5" stroke="#B0CFEA" stroke-width="1"/>
  <!-- Flag strip -->
  <rect x="2" y="2" width="8" height="50" rx="2" fill="#C8102E"/>
  <rect x="4" y="14" width="4" height="26" fill="#F1BF00"/>
  <!-- Photo placeholder -->
  <rect x="13" y="8" width="18" height="23" rx="2" fill="#C9DFF0"/>
  <line x1="13" y1="8" x2="31" y2="31" stroke="#A0BFDA" stroke-width="0.5"/>
  <!-- Text lines -->
  <rect x="35" y="10" width="46" height="3" rx="1.5" fill="#B0BFCC" opacity="0.7"/>
  <rect x="35" y="16" width="36" height="3" rx="1.5" fill="#B0BFCC" opacity="0.6"/>
  <rect x="35" y="22" width="42" height="3" rx="1.5" fill="#B0BFCC" opacity="0.5"/>
  <rect x="35" y="28" width="30" height="3" rx="1.5" fill="#B0BFCC" opacity="0.4"/>
  <!-- Chip -->
  <rect x="13" y="35" width="11" height="8" rx="1" fill="#D4AC0D" stroke="#C09D0A" stroke-width="0.5"/>
  <line x1="13" y1="38" x2="24" y2="38" stroke="#C09D0A" stroke-width="0.5"/>
  <line x1="13" y1="40" x2="24" y2="40" stroke="#C09D0A" stroke-width="0.5"/>
  <line x1="17" y1="35" x2="17" y2="43" stroke="#C09D0A" stroke-width="0.5"/>
  <line x1="20" y1="35" x2="20" y2="43" stroke="#C09D0A" stroke-width="0.5"/>
  <!-- MRZ lines -->
  <rect x="3"  y="46" width="80" height="2" rx="1" fill="#90A8B8" opacity="0.5"/>
  <rect x="3"  y="50" width="80" height="2" rx="1" fill="#90A8B8" opacity="0.5"/>
</svg>`;

export const SVG_DNI_BACK = `<svg width="86" height="54" viewBox="0 0 86 54" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="86" height="54" rx="4" fill="#EAF6FF"/>
  <rect x="1" y="1" width="84" height="52" rx="3.5" stroke="#B0CFEA" stroke-width="1"/>
  <!-- Flag strip -->
  <rect x="2" y="2" width="8" height="50" rx="2" fill="#C8102E"/>
  <rect x="4" y="14" width="4" height="26" fill="#F1BF00"/>
  <!-- Address section -->
  <rect x="13" y="6" width="70" height="3" rx="1.5" fill="#B0BFCC" opacity="0.5"/>
  <rect x="13" y="12" width="58" height="3" rx="1.5" fill="#B0BFCC" opacity="0.5"/>
  <rect x="13" y="18" width="50" height="3" rx="1.5" fill="#B0BFCC" opacity="0.4"/>
  <!-- Machine-readable zone header -->
  <rect x="13" y="27" width="24" height="2" rx="1" fill="#8899AA" opacity="0.6"/>
  <!-- Barcode strip (representing PDF417 or machine data) -->
  <rect x="13" y="32" width="4"  height="10" rx="0.5" fill="#445566" opacity="0.7"/>
  <rect x="19" y="32" width="2"  height="10" rx="0.5" fill="#445566" opacity="0.7"/>
  <rect x="23" y="32" width="3"  height="10" rx="0.5" fill="#445566" opacity="0.6"/>
  <rect x="28" y="32" width="5"  height="10" rx="0.5" fill="#445566" opacity="0.7"/>
  <rect x="35" y="32" width="2"  height="10" rx="0.5" fill="#445566" opacity="0.6"/>
  <rect x="39" y="32" width="4"  height="10" rx="0.5" fill="#445566" opacity="0.7"/>
  <rect x="45" y="32" width="3"  height="10" rx="0.5" fill="#445566" opacity="0.5"/>
  <rect x="50" y="32" width="6"  height="10" rx="0.5" fill="#445566" opacity="0.7"/>
  <rect x="58" y="32" width="2"  height="10" rx="0.5" fill="#445566" opacity="0.6"/>
  <rect x="62" y="32" width="4"  height="10" rx="0.5" fill="#445566" opacity="0.7"/>
  <rect x="68" y="32" width="3"  height="10" rx="0.5" fill="#445566" opacity="0.6"/>
  <rect x="73" y="32" width="5"  height="10" rx="0.5" fill="#445566" opacity="0.7"/>
  <!-- MRZ lines -->
  <rect x="3"  y="46" width="80" height="2" rx="1" fill="#90A8B8" opacity="0.5"/>
  <rect x="3"  y="50" width="80" height="2" rx="1" fill="#90A8B8" opacity="0.5"/>
</svg>`;

export const SVG_PASSPORT_PAGE = `<svg width="58" height="82" viewBox="0 0 58 82" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="58" height="82" rx="3" fill="#FFF0F5"/>
  <rect x="0.5" y="0.5" width="57" height="81" rx="2.5" stroke="#D8A0B0" stroke-width="1"/>
  <!-- Header bar -->
  <rect x="0" y="0" width="58" height="10" rx="3" fill="#8B0000" opacity="0.85"/>
  <rect x="0" y="7"  width="58" height="3"  fill="#8B0000" opacity="0.85"/>
  <!-- Coat of arms placeholder -->
  <circle cx="29" cy="5" r="3.5" fill="#F1BF00" opacity="0.9"/>
  <rect x="27" y="10" width="4" height="3" fill="#F1BF00" opacity="0.5"/>
  <!-- Photo box -->
  <rect x="6" y="15" width="20" height="26" rx="2" fill="#C9DFF0"/>
  <line x1="6" y1="15" x2="26" y2="41" stroke="#A0BFDA" stroke-width="0.5"/>
  <!-- Personal data lines -->
  <rect x="30" y="16" width="24" height="2.5" rx="1.2" fill="#B0BFCC" opacity="0.7"/>
  <rect x="30" y="21" width="18" height="2.5" rx="1.2" fill="#B0BFCC" opacity="0.6"/>
  <rect x="30" y="26" width="22" height="2.5" rx="1.2" fill="#B0BFCC" opacity="0.5"/>
  <rect x="30" y="31" width="16" height="2.5" rx="1.2" fill="#B0BFCC" opacity="0.5"/>
  <rect x="30" y="36" width="20" height="2.5" rx="1.2" fill="#B0BFCC" opacity="0.4"/>
  <!-- Signature line -->
  <rect x="6" y="45" width="46" height="1" rx="0.5" fill="#C8A0A0" opacity="0.6"/>
  <path d="M10 44 Q14 42 16 44 Q18 46 22 43" stroke="#8B4050" stroke-width="0.8" fill="none"/>
  <!-- Visa/stamp area -->
  <circle cx="44" cy="58" r="10" stroke="#8B0000" stroke-width="0.8" fill="none" stroke-dasharray="2 1" opacity="0.4"/>
  <circle cx="44" cy="58" r="7"  stroke="#8B0000" stroke-width="0.5" fill="none" opacity="0.3"/>
  <rect x="39" y="56" width="10" height="4" rx="1" fill="#8B000022"/>
  <!-- MRZ -->
  <rect x="3" y="72" width="52" height="2.5" rx="1" fill="#90A8B8" opacity="0.5"/>
  <rect x="3" y="77" width="52" height="2.5" rx="1" fill="#90A8B8" opacity="0.5"/>
</svg>`;
