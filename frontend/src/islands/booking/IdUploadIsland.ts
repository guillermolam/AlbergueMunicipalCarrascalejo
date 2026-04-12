/**
 * IdUploadIsland - vanilla TypeScript class for Step 2 per-pilgrim ID upload zones.
 * All innerHTML usage in this file is safe: only static template strings with numeric
 * indices (no user-supplied strings). This is equivalent to the original book.astro inline code.
 */

// OCR + CV types (no client-side engine — all processing is via backend services)
import type { ExtractedFields, CvInfo } from '../../lib/ocr';
// Light client-side check (format + size only) before sending to backend
import { validateImageFile } from '../../lib/imageValidation';
import {
  pilgrimDocStores,
  pilgrimFiles,
  resetDocStores,
  getPilgrimDocState,
  updatePilgrimDocState,
  MAX_UPLOAD_PILGRIMS,
} from '../../stores/bookingStep2Store';

export interface IdUploadIslandOptions {
  pilgrimCount: number;
  onComplete?: (allDone: boolean) => void;
  personFormData?: Record<string, string>[];
  onCanProceedChange?: (canProceed: boolean) => void;
}

// Suppress unused import lint - stores are used for side-effects and re-export
void pilgrimDocStores;

const SVG_DNI_FRONT = `<svg width="86" height="54" viewBox="0 0 86 54" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="82" height="51" rx="4" fill="black" opacity="0.06"/><rect width="84" height="52" rx="4" fill="#FDF8F2"/><rect x="1" y="4" width="5" height="14" fill="#c60b1e"/><rect x="1" y="18" width="5" height="16" fill="#f1bf00"/><rect x="1" y="34" width="5" height="14" fill="#c60b1e"/><rect x="7" y="0" width="73" height="9" fill="#c60b1e" opacity="0.88"/><rect x="67" y="0" width="13" height="9" fill="#f1bf00" opacity="0.95"/><rect x="10" y="20" width="18" height="23" rx="2" fill="#E0D5C5"/><ellipse cx="19" cy="27.5" rx="4" ry="4.5" fill="#AFA09A"/><path d="M11 43 Q15 37 19 36.5 Q23 37 27 43" fill="#AFA09A"/><rect x="32" y="13" width="34" height="2" rx="1" fill="#5D4E37" opacity="0.18"/><rect x="32" y="17" width="27" height="1.8" rx="0.9" fill="#5D4E37" opacity="0.14"/><rect x="0.5" y="0.5" width="83" height="51" rx="3.5" fill="none" stroke="#D4A574" stroke-width="1"/></svg>`;

const SVG_DNI_BACK = `<svg width="86" height="54" viewBox="0 0 86 54" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="82" height="51" rx="4" fill="black" opacity="0.06"/><rect width="84" height="52" rx="4" fill="#FDF8F2"/><rect x="1" y="4" width="5" height="14" fill="#c60b1e"/><rect x="1" y="18" width="5" height="16" fill="#f1bf00"/><rect x="1" y="34" width="5" height="14" fill="#c60b1e"/><rect x="9" y="12" width="16" height="28" rx="2" fill="white" stroke="#e0e0e0" stroke-width="0.5"/><circle cx="51" cy="26" r="11" fill="white" stroke="#e0e0e0" stroke-width="0.5"/><rect x="8" y="42" width="68" height="2.5" rx="0.5" fill="#E8E0D0"/><rect x="8" y="46.5" width="68" height="2.5" rx="0.5" fill="#E8E0D0"/><rect x="0.5" y="0.5" width="83" height="51" rx="3.5" fill="none" stroke="#D4A574" stroke-width="1"/></svg>`;

const SVG_PASSPORT_PAGE = `<svg width="58" height="82" viewBox="0 0 58 82" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="56" height="80" rx="4" fill="black" opacity="0.08"/><rect width="56" height="80" rx="3.5" fill="#F2EBF4"/><rect x="0" y="0" width="56" height="11" rx="3.5" fill="#7B4F8A" opacity="0.75"/><rect x="5" y="15.5" width="22" height="18" rx="2" fill="#E8E0D0"/><ellipse cx="16" cy="21.5" rx="4" ry="4.5" fill="#AFA09A"/><path d="M6.5 33 Q11 27 16 26.5 Q21 27 25.5 33" fill="#AFA09A"/><rect x="30" y="15" width="22" height="2" rx="1" fill="#5D4E37" opacity="0.20"/><rect x="3" y="55" width="50" height="7" rx="1" fill="#E8E0D8" opacity="0.7"/><rect x="3" y="64" width="50" height="7" rx="1" fill="#E8E0D8" opacity="0.7"/><rect x="0.5" y="0.5" width="55" height="79" rx="3" fill="none" stroke="#C9A8CC" stroke-width="1"/></svg>`;

function clearEl(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function parseSVG(svgStr: string): SVGElement {
  const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
  return doc.documentElement as unknown as SVGElement;
}

export class IdUploadIsland {
  private container: HTMLElement;
  private opts: IdUploadIslandOptions;
  private activePersonStep2 = 0;
  private mounted = false;

  constructor(container: HTMLElement, opts: IdUploadIslandOptions) {
    this.container = container;
    this.opts = opts;
  }

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    const count = Math.min(Math.max(this.opts.pilgrimCount, 1), MAX_UPLOAD_PILGRIMS);
    resetDocStores(count);
    this.activePersonStep2 = 0;
    this.container.textContent = '';
    for (let i = 0; i < count; i++) {
      this.container.appendChild(this.buildPilgrimSlot(i));
    }
    const slot0 = document.getElementById('pslot-0');
    if (slot0) slot0.style.display = '';
  }

  destroy(): void {
    this.container.textContent = '';
    this.mounted = false;
  }

  setPilgrimCount(n: number): void {
    this.opts.pilgrimCount = n;
    this.mounted = false;
    this.mount();
  }

  private slotEl(idx: number, suffix: string): HTMLElement {
    return document.getElementById(`pslot-${idx}-${suffix}`) as HTMLElement;
  }

  private setDocIcons(idx: number, docType: string): void {
    const frontWrap = document.getElementById(`pslot-${idx}-front-doc-icon`);
    const backWrap = document.getElementById(`pslot-${idx}-back-doc-icon`);
    if (!frontWrap) return;
    clearEl(frontWrap);
    frontWrap.appendChild(parseSVG(docType === 'passport' ? SVG_PASSPORT_PAGE : SVG_DNI_FRONT));
    if (backWrap) {
      clearEl(backWrap);
      if (docType !== 'passport') {
        backWrap.appendChild(parseSVG(SVG_DNI_BACK));
      }
    }
  }

  private restoreUploadPlaceholder(
    el: HTMLElement,
    idx: number,
    side: 'front' | 'back',
    docType: string
  ): void {
    clearEl(el);
    el.style.display = '';
    const isFront = side === 'front';
    const iconId = `pslot-${idx}-${side}-doc-icon`;
    const labelText = isFront
      ? `Front of ${docType === 'passport' ? 'passport' : 'ID'}`
      : 'Back of ID';

    const iconSpan = document.createElement('span');
    iconSpan.id = iconId;
    iconSpan.className = 'upload-doc-icon';
    // Static SVG markup — no user-supplied content
    iconSpan.innerHTML =
      docType === 'passport' && isFront
        ? `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00AB39" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="9" r="2.5"/><path d="M6 18c0-3 3-5 6-5s6 2 6 5"/></svg>`
        : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${isFront ? '#00AB39' : '#D4A574'}" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M3 5l2-2h4l2 2"/></svg>`;

    const p1 = document.createElement('p');
    p1.className = 'upload-label';
    p1.textContent = labelText;
    const p2 = document.createElement('p');
    p2.className = 'upload-hint';
    p2.textContent = 'Click or drag image to upload';
    const p3 = document.createElement('p');
    p3.className = 'upload-formats';
    p3.textContent = 'JPG \u00b7 PNG \u00b7 WebP \u00b7 HEIC \u00b7 GIF  \u00b7  max 10 MB';

    el.appendChild(iconSpan);
    el.appendChild(p1);
    el.appendChild(p2);
    el.appendChild(p3);
  }

  private renderUploadedFilePreview(
    contentEl: HTMLElement,
    file: File,
    side: 'front' | 'back',
    valid: boolean | null,
    ocrFields?: ExtractedFields | null,
    cvInfo?: CvInfo | null,
    idx: number = this.activePersonStep2
  ): void {
    clearEl(contentEl);
    contentEl.style.display = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'display:flex;flex-direction:column;align-items:stretch;gap:0;padding:0.6rem 0.75rem 0.75rem;width:100%;box-sizing:border-box';

    const topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0.35rem';

    const thumb = document.createElement('img');
    thumb.style.cssText =
      'max-width:120px;max-height:76px;border-radius:6px;object-fit:cover;border:1.5px solid #D4A574;box-shadow:0 2px 8px rgba(0,0,0,0.10)';
    thumb.src = URL.createObjectURL(file);
    thumb.onload = () => URL.revokeObjectURL(thumb.src);
    topRow.appendChild(thumb);

    const info = document.createElement('div');
    info.style.cssText =
      "font-family:var(--font-patrick-hand);font-size:0.78rem;color:#7D6E5A;text-align:center;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    info.textContent = file.name;
    topRow.appendChild(info);

    if (valid === true) {
      const badge = document.createElement('span');
      badge.style.cssText =
        "font-family:var(--font-patrick-hand);font-size:0.8rem;color:#00AB39;display:flex;align-items:center;gap:0.25rem";
      // Static SVG badge — no user content
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00AB39" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Verified`;
      topRow.appendChild(badge);
    } else if (valid === false) {
      const badge = document.createElement('span');
      badge.style.cssText =
        "font-family:var(--font-patrick-hand);font-size:0.8rem;color:#EF5350;display:flex;align-items:center;gap:0.25rem";
      // Static SVG badge — no user content
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF5350" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Invalid`;
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.style.cssText =
        "margin-left:0.4rem;font-family:var(--font-patrick-hand);font-size:0.75rem;color:#5D4E37;background:none;border:1px solid #D4A574;border-radius:6px;padding:0.1rem 0.5rem;cursor:pointer";
      retryBtn.textContent = 'Retry';
      retryBtn.onclick = () => {
        const input = this.slotEl(idx, `${side}-input`) as HTMLInputElement;
        if (input) {
          input.value = '';
          input.click();
        }
      };
      badge.appendChild(retryBtn);
      topRow.appendChild(badge);
    } else {
      const badge = document.createElement('span');
      badge.style.cssText =
        "font-family:var(--font-patrick-hand);font-size:0.8rem;color:#888;display:flex;align-items:center;gap:0.25rem";
      // Static SVG badge — no user content
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Validating\u2026`;
      topRow.appendChild(badge);
    }

    wrapper.appendChild(topRow);

    const ps = getPilgrimDocState(idx);
    if (side === 'front' && ps?.avatarDataUrl) {
      const avatarRow = document.createElement('div');
      avatarRow.style.cssText = 'display:flex;justify-content:center;margin-top:0.35rem';
      const av = document.createElement('img');
      av.src = ps.avatarDataUrl;
      av.alt = 'Foto recortada';
      av.title = 'Foto extra\u00edda del documento';
      av.style.cssText =
        'width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #00AB39;box-shadow:0 2px 6px rgba(0,0,0,0.15)';
      avatarRow.appendChild(av);
      wrapper.appendChild(avatarRow);
    }

    const fieldRows: [string, string][] = [];
    if (ocrFields) {
      if (ocrFields.firstName) fieldRows.push(['Nombre', ocrFields.firstName.toUpperCase()]);
      if (ocrFields.lastName) fieldRows.push(['Primer apellido', ocrFields.lastName.toUpperCase()]);
      if (ocrFields.lastName2)
        fieldRows.push(['Segundo apellido', ocrFields.lastName2.toUpperCase()]);
      if (ocrFields.documentNumber)
        fieldRows.push(['N\u00fam. documento', ocrFields.documentNumber]);
      if (ocrFields.birthDate) fieldRows.push(['F. nacimiento', ocrFields.birthDate]);
      if (ocrFields.expiryDate) fieldRows.push(['V\u00e1lido hasta', ocrFields.expiryDate]);
      if (ocrFields.nationality)
        fieldRows.push(['Nacionalidad', ocrFields.nationality.toUpperCase()]);
      if (ocrFields.gender) {
        const genderLabel =
          ocrFields.gender === 'M'
            ? 'Masculino'
            : ocrFields.gender === 'F'
              ? 'Femenino'
              : ocrFields.gender === 'X'
                ? 'No binario'
                : ocrFields.gender;
        fieldRows.push(['Sexo', genderLabel]);
      }
    }
    if (cvInfo) {
      const docTypeLabel: Record<string, string> = {
        eu_id_card: 'EU ID Card',
        passport: 'Pasaporte',
        dni: 'DNI / NIE',
        unknown: 'Desconocido',
      };
      fieldRows.push(['Tipo doc.', docTypeLabel[cvInfo.doc_type] ?? cvInfo.doc_type]);
      fieldRows.push([
        'Cara',
        cvInfo.side === 'front' ? 'Frontal' : cvInfo.side === 'back' ? 'Trasera' : cvInfo.side,
      ]);
      fieldRows.push(['Confianza CV', `${Math.round(cvInfo.confidence * 100)}%`]);
    }

    if (fieldRows.length > 0) {
      const divider = document.createElement('div');
      divider.style.cssText = 'height:1px;background:rgba(212,165,116,0.35);margin:0.5rem 0 0.4rem';
      wrapper.appendChild(divider);

      const grid = document.createElement('div');
      grid.style.cssText =
        'display:grid;grid-template-columns:auto 1fr;gap:0.2rem 0.6rem;align-items:baseline;width:100%';

      fieldRows.forEach(([lbl, val]) => {
        const labelEl = document.createElement('span');
        labelEl.style.cssText =
          "font-family:var(--font-patrick-hand);font-size:0.7rem;color:#9E8B77;white-space:nowrap;text-align:right;padding-right:0.1rem";
        labelEl.textContent = lbl + ':';
        const valueEl = document.createElement('span');
        valueEl.style.cssText =
          "font-family:var(--font-patrick-hand);font-size:0.76rem;color:#3E2C1C;font-weight:600;word-break:break-word;line-height:1.3";
        valueEl.textContent = val;
        grid.appendChild(labelEl);
        grid.appendChild(valueEl);
      });
      wrapper.appendChild(grid);
    } else if (valid === null) {
      const scanningEl = document.createElement('div');
      scanningEl.style.cssText =
        "text-align:center;font-family:var(--font-patrick-hand);font-size:0.75rem;color:#9E8B77;margin-top:0.4rem";
      scanningEl.textContent = 'Escaneando documento\u2026';
      wrapper.appendChild(scanningEl);
    }

    contentEl.appendChild(wrapper);
  }

  private showUploadError(idx: number, side: 'front' | 'back', message: string): void {
    const content = this.slotEl(idx, `${side}-content`);
    clearEl(content);
    const errDiv = document.createElement('div');
    errDiv.style.cssText =
      "padding:1rem;text-align:center;font-family:var(--font-patrick-hand);font-size:0.87rem;color:#EF5350;display:flex;flex-direction:column;align-items:center;gap:0.4rem";
    const NS3 = 'http://www.w3.org/2000/svg';
    const errSvg = document.createElementNS(NS3, 'svg') as SVGSVGElement;
    errSvg.setAttribute('width', '28');
    errSvg.setAttribute('height', '28');
    errSvg.setAttribute('viewBox', '0 0 24 24');
    errSvg.setAttribute('fill', 'none');
    errSvg.setAttribute('stroke', '#EF5350');
    errSvg.setAttribute('stroke-width', '2');
    errSvg.setAttribute('stroke-linecap', 'round');
    const ci = document.createElementNS(NS3, 'circle');
    ci.setAttribute('cx', '12');
    ci.setAttribute('cy', '12');
    ci.setAttribute('r', '10');
    errSvg.appendChild(ci);
    const li = document.createElementNS(NS3, 'line');
    li.setAttribute('x1', '12');
    li.setAttribute('y1', '8');
    li.setAttribute('x2', '12');
    li.setAttribute('y2', '12');
    errSvg.appendChild(li);
    const li2 = document.createElementNS(NS3, 'line');
    li2.setAttribute('x1', '12');
    li2.setAttribute('y1', '16');
    li2.setAttribute('x2', '12.01');
    li2.setAttribute('y2', '16');
    errSvg.appendChild(li2);
    errDiv.appendChild(errSvg);
    const txt = document.createElement('span');
    txt.textContent = message;
    errDiv.appendChild(txt);
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.style.cssText =
      "margin-top:0.25rem;font-family:var(--font-patrick-hand);font-size:0.82rem;color:#5D4E37;background:none;border:1px solid #D4A574;border-radius:8px;padding:0.2rem 0.6rem;cursor:pointer";
    retry.textContent = 'Try another file';
    retry.onclick = () => {
      const input = this.slotEl(idx, `${side}-input`) as HTMLInputElement;
      if (input) {
        input.value = '';
        input.click();
      }
    };
    errDiv.appendChild(retry);
    content.appendChild(errDiv);
    const inp = this.slotEl(idx, `${side}-input`) as HTMLInputElement;
    if (inp) inp.value = '';
  }

  /** Exposed for DocumentUploadIsland — skip doc-card selection, go straight to upload UI. */
  showUploadPhaseForSlot(idx: number, docType: string): void {
    updatePilgrimDocState(idx, { docType, phase: 'upload' });

    const icon = this.slotEl(idx, 'selected-doc-icon');
    const label = this.slotEl(idx, 'selected-doc-label');
    const uploadBackEl = this.slotEl(idx, 'upload-back');
    if (docType === 'dni') {
      icon.textContent = '\uD83E\uDEAA';
      label.textContent = 'DNI / NIE / EU ID';
      uploadBackEl.style.display = '';
    } else {
      icon.textContent = '\uD83D\uDCD8';
      label.textContent = 'Passport';
      uploadBackEl.style.display = 'none';
    }
    this.setDocIcons(idx, docType);

    const frontContent = this.slotEl(idx, 'front-content');
    const backContent = this.slotEl(idx, 'back-content');
    clearEl(frontContent);
    clearEl(backContent);
    this.restoreUploadPlaceholder(frontContent, idx, 'front', docType);
    this.restoreUploadPlaceholder(backContent, idx, 'back', docType);
    this.slotEl(idx, 'upload-complete').style.display = 'none';
    document.getElementById(`pslot-${idx}-cv-warning`)?.remove();

    pilgrimFiles[idx] = { frontFile: null, backFile: null };
    updatePilgrimDocState(idx, {
      frontValid: null,
      backValid: null,
      frontOcrFields: null,
      backOcrFields: null,
      frontCvInfo: null,
      backCvInfo: null,
      validationError: null,
    });

    const docCardsEl = document
      .getElementById(`pslot-${idx}`)!
      .querySelector('.doc-cards') as HTMLElement;
    const uploadPhaseEl = this.slotEl(idx, 'upload-phase');
    docCardsEl.classList.add('phase-out');
    setTimeout(() => {
      docCardsEl.style.display = 'none';
      docCardsEl.classList.remove('phase-out');
      uploadPhaseEl.style.display = '';
      uploadPhaseEl.classList.remove('phase-out');
    }, 380);
    this.notifyCanProceed();
  }

  private notifyCanProceed(): void {
    const can = this.computeCanProceed();
    this.opts.onComplete?.(can);
    this.opts.onCanProceedChange?.(can);
  }

  private computeCanProceed(): boolean {
    const count = Math.min(Math.max(this.opts.pilgrimCount, 1), MAX_UPLOAD_PILGRIMS);
    for (let i = 0; i < count; i++) {
      const s = getPilgrimDocState(i);
      const files = pilgrimFiles[i];
      const needBack = s.docType === 'dni';
      if (
        s.docType === null ||
        files.frontFile === null ||
        (needBack && files.backFile === null) ||
        s.frontValid === false ||
        (needBack && s.backValid === false)
      )
        return false;
    }
    return true;
  }

  private async handleUpload(idx: number, side: 'front' | 'back', file: File): Promise<void> {
    // ── 1. Quick client-side format + size check (avoids unnecessary backend round-trip) ──
    const validation = await validateImageFile(file);
    if (!validation.ok) {
      this.showUploadError(idx, side, validation.error!);
      return;
    }

    // Store file reference + show "validating" state immediately
    if (side === 'front') {
      pilgrimFiles[idx].frontFile = file;
      updatePilgrimDocState(idx, { frontValid: null });
    } else {
      pilgrimFiles[idx].backFile = file;
      updatePilgrimDocState(idx, { backValid: null });
    }

    const contentEl = this.slotEl(idx, `${side}-content`);
    this.renderUploadedFilePreview(contentEl, file, side, null, null, null, idx);

    // Show upload-complete bar with "processing" state
    const ps = getPilgrimDocState(idx);
    const needBack = ps.docType === 'dni';
    const hasFront = pilgrimFiles[idx].frontFile !== null;
    const hasBack = pilgrimFiles[idx].backFile !== null;
    if (hasFront) {
      const nameEl = this.slotEl(idx, 'file-name');
      if (nameEl)
        nameEl.textContent =
          needBack && hasBack ? 'Front + Back uploaded' : (pilgrimFiles[idx].frontFile?.name ?? file.name);
      this.slotEl(idx, 'upload-complete').style.display = '';
    }

    // ── 2. Backend processing (OCR + validation + R2 upload) ────────────────
    (async () => {
      try {
        const currentPs = getPilgrimDocState(idx);
        const form = new FormData();
        form.set('file', file, file.name || `${side}.jpg`);
        form.set('side', side);
        form.set('docType', currentPs.docType ?? 'dni');

        // Include back file for combined OCR when available
        const backFile = pilgrimFiles[idx].backFile;
        if (side === 'front' && backFile) form.set('backFile', backFile, backFile.name || 'back.jpg');

        let resp: Response;
        try {
          resp = await fetch('/api/pilgrim/process-document', {
            method: 'POST',
            body: form,
            signal: AbortSignal.timeout(25_000),
          });
        } catch {
          // Network error — treat as valid (don't block the flow)
          this.resolveProcessing(idx, side, file, true, null, null, null);
          return;
        }

        if (!resp.ok) {
          this.resolveProcessing(idx, side, file, true, null, null, null);
          return;
        }

        const data = (await resp.json()) as {
          imageUrl?: string | null;
          ocrFields?: ExtractedFields | null;
          cvInfo?: CvInfo | null;
          valid?: boolean;
          errors?: string[];
          warnings?: string[];
        };

        const valid = data.valid !== false;
        const ocrFields = data.ocrFields ?? null;
        const cvInfo = data.cvInfo ?? null;
        const imageUrl = data.imageUrl ?? null;

        // Persist R2 URL if available
        if (imageUrl) {
          updatePilgrimDocState(idx, { ...(side === 'front' ? {} : {}) });
          // Store R2 URL in slot metadata for later use by DocumentUploadIsland
          (pilgrimFiles[idx] as unknown as Record<string, unknown>)[`${side}Url`] = imageUrl;
        }

        this.resolveProcessing(idx, side, file, valid, ocrFields, cvInfo, data.errors ?? null);

        // Show side-mismatch warning banner if needed
        const wrapEl = this.slotEl(idx, 'upload-phase');
        const warning = data.warnings?.find((w) =>
          w.toLowerCase().includes('side') || w.toLowerCase().includes('mismatch')
        );
        if (wrapEl) {
          let banner = document.getElementById(`pslot-${idx}-cv-warning`);
          if (warning) {
            if (!banner) {
              banner = document.createElement('div');
              banner.id = `pslot-${idx}-cv-warning`;
              banner.style.cssText =
                "margin:0.5rem 0;padding:0.6rem 1rem;background:#FFF8E1;border:1.5px solid #FFB300;border-radius:10px;font-family:var(--font-patrick-hand);font-size:0.87rem;color:#5D4E37;display:flex;align-items:center;gap:0.5rem";
              wrapEl.insertBefore(banner, wrapEl.firstChild);
            }
            banner.textContent = warning;
          } else if (banner) {
            banner.remove();
          }
        }

        // Upload avatar to Clerk after front image is processed
        if (side === 'front' && valid) {
          // Avatar crop is handled server-side; if OCR returns a face crop URL, use it
          // For now, upload the original file as the profile picture
          const { uploadAvatarToClerk } = await import('../../lib/imageCrop');
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            updatePilgrimDocState(idx, { avatarDataUrl: dataUrl });
            if (idx === 0) {
              uploadAvatarToClerk(dataUrl).catch(() => { /* non-fatal */ });
            }
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error('[process-document] Backend error:', err);
        this.resolveProcessing(idx, side, file, true, null, null, null);
      }
    })();
  }

  /** Applies backend result to state and re-renders the preview card. */
  private resolveProcessing(
    idx: number,
    side: 'front' | 'back',
    file: File,
    valid: boolean,
    ocrFields: ExtractedFields | null,
    cvInfo: CvInfo | null,
    errors: string[] | null
  ): void {
    const errMsg = errors?.length ? errors.join('; ') : null;

    if (side === 'front') {
      updatePilgrimDocState(idx, {
        frontValid: valid,
        validationError: valid ? null : errMsg,
        ...(ocrFields ? { frontOcrFields: ocrFields } : {}),
        ...(cvInfo ? { frontCvInfo: cvInfo } : {}),
      });
    } else {
      updatePilgrimDocState(idx, {
        backValid: valid,
        ...(ocrFields ? { backOcrFields: ocrFields } : {}),
        ...(cvInfo ? { backCvInfo: cvInfo } : {}),
      });
    }

    // Autofill step-3 form fields from OCR
    if (ocrFields && idx === this.activePersonStep2) {
      const fSet = (id: string, val: string) => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el && val && !el.value) el.value = val;
      };
      fSet('f-first', ocrFields.firstName);
      fSet('f-last', ocrFields.lastName);
      fSet('f-last2', ocrFields.lastName2);
      fSet('f-dob', ocrFields.birthDate);
      fSet('f-nat', ocrFields.nationality);
    }
    if (ocrFields && this.opts.personFormData) {
      const d = this.opts.personFormData[idx] ?? {};
      if (ocrFields.firstName) d['f-first'] = ocrFields.firstName;
      if (ocrFields.lastName) d['f-last'] = ocrFields.lastName;
      if (ocrFields.lastName2) d['f-last2'] = ocrFields.lastName2;
      if (ocrFields.birthDate) d['f-dob'] = ocrFields.birthDate;
      if (ocrFields.nationality) d['f-nat'] = ocrFields.nationality;
      this.opts.personFormData[idx] = d;
    }

    // Re-render preview with full data
    const currentFile = side === 'front' ? pilgrimFiles[idx].frontFile : pilgrimFiles[idx].backFile;
    const freshContent = this.slotEl(idx, `${side}-content`);
    if (currentFile === file && freshContent) {
      const freshPs = getPilgrimDocState(idx);
      this.renderUploadedFilePreview(
        freshContent,
        file,
        side,
        valid,
        ocrFields ?? (side === 'front' ? freshPs.frontOcrFields : freshPs.backOcrFields),
        cvInfo ?? (side === 'front' ? freshPs.frontCvInfo : freshPs.backCvInfo),
        idx
      );
    }

    this.notifyCanProceed();
  }

  private buildPilgrimSlot(idx: number): HTMLElement {
    const slot = document.createElement('div');
    slot.id = `pslot-${idx}`;
    slot.className = 'pilgrim-slot';
    slot.style.display = 'none';

    // Build the slot DOM using DOM APIs to avoid innerHTML with dynamic content
    const docCards = document.createElement('div');
    docCards.className = 'doc-cards';
    docCards.id = `pslot-${idx}-doc-cards`;

    // DNI card button
    const dniBtn = this.makeDocCardButton(
      'dni',
      'Select DNI, NIE or EU ID Card',
      'dni-illus',
      `<svg viewBox="0 0 280 180" fill="none"><rect x="10" y="10" width="260" height="160" rx="12" fill="#E8F5E9" stroke="#00AB39" stroke-width="3"/><rect x="165" y="55" width="85" height="100" rx="8" fill="#C8E6C9" stroke="#00AB39" stroke-width="2"/><circle cx="207" cy="90" r="22" fill="#A5D6A7"/><path d="M190,148 Q207,130 224,148" fill="#81C784"/></svg>`,
      'DNI / NIE / EU ID Cards',
      'Spanish DNI, NIE or any EU/EEA national ID card',
      'green',
      'Requires front + back photos'
    );
    docCards.appendChild(dniBtn);

    // Passport card button
    const passBtn = this.makeDocCardButton(
      'passport',
      'Select Passport',
      'pass-illus',
      `<svg viewBox="0 0 280 180" fill="none"><rect x="40" y="8" width="200" height="164" rx="10" fill="#DBEAFE" stroke="#3B82F6" stroke-width="2.5"/><circle cx="140" cy="100" r="50" fill="none" stroke="#3B82F6" stroke-width="1.5" opacity="0.5"/><circle cx="140" cy="100" r="35" fill="none" stroke="#3B82F6" stroke-width="1.5" opacity="0.5"/></svg>`,
      'Passport',
      'International Passport',
      'blue',
      'Requires photo page only'
    );
    docCards.appendChild(passBtn);
    slot.appendChild(docCards);

    // Upload phase
    const uploadPhase = document.createElement('div');
    uploadPhase.className = 'upload-phase';
    uploadPhase.id = `pslot-${idx}-upload-phase`;
    uploadPhase.style.display = 'none';

    // Selected doc bar
    const selBar = document.createElement('div');
    selBar.className = 'selected-doc-bar';
    const selInfo = document.createElement('div');
    selInfo.className = 'selected-doc-info';
    const selIcon = document.createElement('span');
    selIcon.className = 'selected-doc-icon';
    selIcon.id = `pslot-${idx}-selected-doc-icon`;
    selIcon.textContent = '\uD83E\uDEAA';
    const selLabel = document.createElement('span');
    selLabel.className = 'selected-doc-label';
    selLabel.id = `pslot-${idx}-selected-doc-label`;
    selLabel.textContent = 'DNI / ID Card';
    selInfo.appendChild(selIcon);
    selInfo.appendChild(selLabel);
    const changeBtn = document.createElement('button');
    changeBtn.type = 'button';
    changeBtn.className = 'change-doc-btn';
    changeBtn.id = `pslot-${idx}-change-doc-btn`;
    changeBtn.textContent = 'Change \u21ba';
    selBar.appendChild(selInfo);
    selBar.appendChild(changeBtn);
    uploadPhase.appendChild(selBar);

    // Upload zone inner
    const zoneInner = document.createElement('div');
    zoneInner.className = 'upload-zone-inner';

    const frontFace = this.makeFace(idx, 'front');
    const backFace = this.makeFace(idx, 'back');
    backFace.id = `pslot-${idx}-upload-back`;
    zoneInner.appendChild(frontFace);
    zoneInner.appendChild(backFace);
    uploadPhase.appendChild(zoneInner);

    // Upload complete bar
    const uploadComplete = document.createElement('div');
    uploadComplete.className = 'upload-complete';
    uploadComplete.id = `pslot-${idx}-upload-complete`;
    uploadComplete.style.display = 'none';
    const uploadedRow = document.createElement('div');
    uploadedRow.className = 'uploaded-file-row';
    const checkDiv = document.createElement('div');
    checkDiv.className = 'uploaded-file-check';
    // Static SVG check mark — no user content
    checkDiv.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M 5 13 Q 7 15 9 16 Q 11 14 18 6" stroke="#00AB39" stroke-width="2.5" stroke-linecap="round" fill="none" class="check-draw"></path></svg>`;
    const fileName = document.createElement('span');
    fileName.className = 'uploaded-file-name';
    fileName.id = `pslot-${idx}-file-name`;
    fileName.textContent = 'document.jpg';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'uploaded-file-remove';
    removeBtn.id = `pslot-${idx}-file-remove`;
    removeBtn.setAttribute('aria-label', 'Remove file');
    removeBtn.textContent = '\u00d7';
    uploadedRow.appendChild(checkDiv);
    uploadedRow.appendChild(fileName);
    uploadedRow.appendChild(removeBtn);
    uploadComplete.appendChild(uploadedRow);
    uploadPhase.appendChild(uploadComplete);
    slot.appendChild(uploadPhase);

    // ── Bind events ──────────────────────────────────────────────────────────
    slot.querySelectorAll('.doc-card').forEach((card) => {
      card.addEventListener('click', () => {
        const dt = (card as HTMLElement).dataset.doc!;
        this.showUploadPhaseForSlot(idx, dt);
      });
      card.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ')
          (card as HTMLElement).click();
      });
    });

    changeBtn.addEventListener('click', () => {
      const uploadPhaseEl = this.slotEl(idx, 'upload-phase');
      const docCardsEl = slot.querySelector('.doc-cards') as HTMLElement;
      uploadPhaseEl.classList.add('phase-out');
      setTimeout(() => {
        uploadPhaseEl.style.display = 'none';
        uploadPhaseEl.classList.remove('phase-out');
        this.slotEl(idx, 'upload-complete').style.display = 'none';
        this.slotEl(idx, 'front-content').style.display = '';
        this.slotEl(idx, 'back-content').style.display = '';
        const cvWarn = document.getElementById(`pslot-${idx}-cv-warning`);
        if (cvWarn) cvWarn.remove();
        pilgrimFiles[idx] = { frontFile: null, backFile: null };
        updatePilgrimDocState(idx, {
          docType: null,
          frontValid: null,
          backValid: null,
          frontOcrFields: null,
          backOcrFields: null,
          frontCvInfo: null,
          backCvInfo: null,
          validationError: null,
        });
        this.notifyCanProceed();
        docCardsEl.style.display = '';
        docCardsEl.classList.add('phase-in');
        setTimeout(() => docCardsEl.classList.remove('phase-in'), 420);
      }, 330);
    });

    (['front', 'back'] as const).forEach((side) => {
      const input = slot.querySelector(`#pslot-${idx}-${side}-input`) as HTMLInputElement;
      if (!input) return;
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) this.handleUpload(idx, side, input.files[0]);
      });
      const face = input.closest('.upload-face') as HTMLElement | null;
      if (face) {
        face.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).tagName !== 'INPUT') input.click();
        });
        face.addEventListener('keydown', (e) => {
          if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ')
            input.click();
        });
      }
    });

    removeBtn.addEventListener('click', () => {
      this.slotEl(idx, 'upload-complete').style.display = 'none';
      const currentDocType = getPilgrimDocState(idx).docType;
      pilgrimFiles[idx] = { frontFile: null, backFile: null };
      updatePilgrimDocState(idx, {
        frontValid: null,
        backValid: null,
        frontOcrFields: null,
        backOcrFields: null,
        frontCvInfo: null,
        backCvInfo: null,
        validationError: null,
        avatarDataUrl: null,
      });
      const docType = currentDocType ?? 'dni';
      this.restoreUploadPlaceholder(this.slotEl(idx, 'front-content'), idx, 'front', docType);
      this.restoreUploadPlaceholder(this.slotEl(idx, 'back-content'), idx, 'back', docType);
      const fi = this.slotEl(idx, 'front-input') as HTMLInputElement;
      const bi = this.slotEl(idx, 'back-input') as HTMLInputElement;
      if (fi) fi.value = '';
      if (bi) bi.value = '';
      this.notifyCanProceed();
    });

    return slot;
  }

  private makeDocCardButton(
    docType: string,
    ariaLabel: string,
    illustrationClass: string,
    illustrationSvg: string,
    name: string,
    desc: string,
    dotClass: string,
    req: string
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'doc-card';
    btn.dataset.doc = docType;
    btn.type = 'button';
    btn.setAttribute('aria-label', ariaLabel);

    // Static SVG background — no user content
    const bgSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    bgSvg.setAttribute('class', 'doc-card-bg');
    bgSvg.setAttribute('preserveAspectRatio', 'none');
    bgSvg.setAttribute('aria-hidden', 'true');
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '4');
    bgRect.setAttribute('y', '4');
    bgRect.setAttribute('width', 'calc(100% - 8px)');
    bgRect.setAttribute('height', 'calc(100% - 8px)');
    bgRect.setAttribute('fill', 'white');
    bgRect.setAttribute('stroke', '#D4A574');
    bgRect.setAttribute('stroke-width', '3');
    bgRect.setAttribute('rx', '20');
    bgSvg.appendChild(bgRect);
    btn.appendChild(bgSvg);

    const inner = document.createElement('div');
    inner.className = 'doc-card-inner';
    const illus = document.createElement('div');
    illus.className = `doc-illustration ${illustrationClass}`;
    // Static SVG illustration markup — no user input
    illus.innerHTML = illustrationSvg;
    inner.appendChild(illus);
    const h3 = document.createElement('h3');
    h3.className = 'doc-name';
    h3.textContent = name;
    const p1 = document.createElement('p');
    p1.className = 'doc-desc';
    p1.textContent = desc;
    const p2 = document.createElement('p');
    p2.className = 'doc-req';
    const dot = document.createElement('span');
    dot.className = `req-dot ${dotClass}`;
    p2.appendChild(dot);
    p2.appendChild(document.createTextNode(` ${req}`));
    inner.appendChild(h3);
    inner.appendChild(p1);
    inner.appendChild(p2);
    btn.appendChild(inner);
    return btn;
  }

  private makeFace(idx: number, side: 'front' | 'back'): HTMLElement {
    const face = document.createElement('div');
    face.className = 'upload-face';
    face.setAttribute('role', 'button');
    face.setAttribute('tabindex', '0');

    const borderSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    borderSvg.setAttribute('class', 'upload-border');
    borderSvg.setAttribute('aria-hidden', 'true');
    borderSvg.setAttribute('preserveAspectRatio', 'none');
    const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    borderRect.setAttribute('x', '3');
    borderRect.setAttribute('y', '3');
    borderRect.setAttribute('width', 'calc(100% - 6px)');
    borderRect.setAttribute('height', 'calc(100% - 6px)');
    borderRect.setAttribute('fill', 'white');
    borderRect.setAttribute('stroke', side === 'front' ? '#00AB39' : '#D4A574');
    borderRect.setAttribute('stroke-width', '2.5');
    borderRect.setAttribute('rx', '16');
    borderRect.setAttribute('stroke-dasharray', '8,5');
    borderSvg.appendChild(borderRect);
    face.appendChild(borderSvg);

    const content = document.createElement('div');
    content.className = 'upload-content';
    content.id = `pslot-${idx}-${side}-content`;

    const iconSpan = document.createElement('span');
    iconSpan.id = `pslot-${idx}-${side}-doc-icon`;
    iconSpan.className = 'upload-doc-icon';
    const strokeColor = side === 'front' ? '#00AB39' : '#D4A574';
    // Static SVG camera icon — no user content
    iconSpan.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" class="upload-cam-icon"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="12" cy="12" r="3.5"></circle><path d="M3 5l2-2h4l2 2"></path></svg>`;

    const labelP = document.createElement('p');
    labelP.className = 'upload-label';
    labelP.textContent = side === 'front' ? 'Front of ID' : 'Back of ID';
    const hintP = document.createElement('p');
    hintP.className = 'upload-hint';
    hintP.textContent = 'Click or drag image to upload';
    const fmtP = document.createElement('p');
    fmtP.className = 'upload-formats';
    fmtP.textContent =
      'JPG \u00b7 PNG \u00b7 WebP \u00b7 HEIC \u00b7 GIF \u00a0\u00b7\u00a0 max 10 MB';

    content.appendChild(iconSpan);
    content.appendChild(labelP);
    content.appendChild(hintP);
    content.appendChild(fmtP);
    face.appendChild(content);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept =
      '.jpg,.jpeg,.png,.gif,.webp,.svg,.heic,.heif,image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/heic,image/heif';
    input.className = 'upload-input';
    input.id = `pslot-${idx}-${side}-input`;
    face.appendChild(input);

    return face;
  }
}
