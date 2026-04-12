/**
 * DocumentUploadIsland
 * ─────────────────────────────────────────────────────────────────────────────
 * Per-pilgrim document upload orchestrator. One instance per pilgrim slot.
 *
 * Flow:
 *   1. login    — pilgrim enters email (or primary pilgrim uses existing Clerk session)
 *   2. checking — calls /api/pilgrim/link-by-email → returns userId + existingDocs
 *   3a. verified  — valid unexpired doc found → show summary, let user keep or re-upload
 *   3b. doctype   — no valid doc → choose DNI/Passport
 *   4. upload   — uses IdUploadIsland-like upload/OCR/CV flow
 *   5. complete — all done, emits onComplete callback
 *
 * Design:
 *   • Vanilla TypeScript — no SolidJS / React dependency
 *   • All DOM built programmatically (no innerHTML with user-derived strings)
 *   • Smooth CSS transitions using requestAnimationFrame + class toggling
 *   • Reads/writes nanostores from documentUploadStore + bookingStep2Store
 *   • Child upload functionality delegated to IdUploadIsland
 */

import { IdUploadIsland } from './IdUploadIsland';
import {
  resetDocumentUploadStores,
  getDocumentUploadState,
  updateDocumentUploadState,
  MAX_PILGRIMS,
} from '../../stores/documentUploadStore';
import type { PilgrimDocument } from '../../pages/api/pilgrim/documents';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentUploadIslandOptions {
  pilgrimCount: number;
  /** Primary pilgrim's Clerk userId (if already authenticated). */
  primaryUserId?: string | null;
  /** Primary pilgrim's email. */
  primaryEmail?: string | null;
  /** Fired whenever any pilgrim's completion state changes. */
  onCanProceedChange?: (canProceed: boolean) => void;
  /** Per-pilgrim form data to autofill from OCR. */
  personFormData?: Record<string, string>[];
}

// ── SVG constants (static — no user content) ──────────────────────────────────

const SVG_GOOGLE = `<svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-3.59-13.46-8.83l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>`;

const SVG_PILGRIM = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;

const SVG_SHIELD_CHECK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00AB39" stroke-width="2" stroke-linecap="round"><path d="M12 2l7 4v6c0 5-4 8-7 9-3-1-7-4-7-9V6l7-4z"/><polyline points="9 12 11 14 15 10"/></svg>`;

const SVG_DOC_ID = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00AB39" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5 18c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5"/><line x1="15" y1="9" x2="19" y2="9"/><line x1="15" y1="12" x2="19" y2="12"/></svg>`;

const SVG_PASSPORT = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C6BC0" stroke-width="1.7" stroke-linecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 18c0-2.8 2.2-5 5-5s5 2.2 5 5"/></svg>`;

const SVG_SPINNER = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg>`;

const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00AB39" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const SVG_WARN = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F57C00" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  css?: string,
  textContent?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (css) node.style.cssText = css;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function clearEl(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Fade-in an element from opacity 0 → 1 over `ms` ms. */
function fadeIn(node: HTMLElement, ms = 280): void {
  node.style.opacity = '0';
  node.style.transition = `opacity ${ms}ms ease`;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      node.style.opacity = '1';
    })
  );
}

/** Slide-in a panel (translateY -12px → 0) + fade. */
function slideIn(node: HTMLElement, ms = 320): void {
  node.style.opacity = '0';
  node.style.transform = 'translateY(-12px)';
  node.style.transition = `opacity ${ms}ms ease, transform ${ms}ms ease`;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      node.style.opacity = '1';
      node.style.transform = 'translateY(0)';
    })
  );
}

/** Fade-out animation helper (available for future interactive removal UX). */
function _fadeOut(node: HTMLElement, ms = 220): Promise<void> {
  return new Promise((resolve) => {
    node.style.transition = `opacity ${ms}ms ease`;
    node.style.opacity = '0';
    setTimeout(() => {
      resolve();
    }, ms + 20);
  });
}
// Kept for future use (animated tab/card removal)
void (_fadeOut as unknown);

function parseSVG(svgStr: string): SVGElement {
  const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
  return doc.documentElement as unknown as SVGElement;
}

/** Check whether a document is valid (not expired). */
function isDocValid(doc: PilgrimDocument): boolean {
  if (!doc.expirationDate) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return new Date(doc.expirationDate) >= now;
}

/** Find the most recent, valid document from an array. */
function bestDocument(docs: PilgrimDocument[]): PilgrimDocument | null {
  const valid = docs.filter(isDocValid);
  if (!valid.length) return null;
  return valid.sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )[0]!;
}

function formatExpiry(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

const DOC_TYPE_LABELS: Record<string, string> = {
  dni: 'DNI',
  nie: 'NIE',
  passport: 'Pasaporte',
  eu_id_card: 'EU ID Card',
};

// ── Inject animation keyframes once ──────────────────────────────────────────

function injectStyles(): void {
  if (document.getElementById('du-island-styles')) return;
  const s = document.createElement('style');
  s.id = 'du-island-styles';
  s.textContent = `
    .du-card {
      background: #fff;
      border-radius: 16px;
      border: 1.5px solid #E8DDD0;
      box-shadow: 0 2px 12px rgba(93,78,55,0.08);
      overflow: hidden;
      transition: box-shadow 0.25s ease, border-color 0.25s ease;
      margin-bottom: 1.25rem;
    }
    .du-card:hover { box-shadow: 0 4px 20px rgba(93,78,55,0.14); }
    .du-card.du-verified { border-color: #00AB39; box-shadow: 0 2px 14px rgba(0,171,57,0.12); }
    .du-card.du-complete { border-color: #00AB39; }

    .du-header {
      background: linear-gradient(135deg, #FDF4E8 0%, #F5EBD5 100%);
      padding: 0.9rem 1.1rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      border-bottom: 1px solid rgba(212,165,116,0.35);
    }
    .du-header-icon {
      width: 34px; height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4A574, #B8895A);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
      box-shadow: 0 1px 5px rgba(180,130,80,0.3);
    }
    .du-header-text { flex: 1; min-width: 0; }
    .du-pilgrim-label {
      font-family: var(--font-patrick-hand);
      font-size: 0.78rem;
      color: #9E8B77;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.05rem;
    }
    .du-pilgrim-name {
      font-family: var(--font-patrick-hand);
      font-size: 1.05rem;
      font-weight: 700;
      color: #3E2C1C;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .du-badge {
      font-family: var(--font-patrick-hand);
      font-size: 0.78rem;
      padding: 0.2rem 0.6rem;
      border-radius: 20px;
      display: flex; align-items: center; gap: 0.3rem;
      flex-shrink: 0;
    }
    .du-badge-verified { background: #E8F5E9; color: #00AB39; border: 1px solid #A5D6A7; }
    .du-badge-uploading { background: #E3F2FD; color: #1565C0; border: 1px solid #90CAF9; }
    .du-badge-pending { background: #FFF8E1; color: #F57C00; border: 1px solid #FFE082; }

    .du-body {
      padding: 1.1rem 1.25rem 1.25rem;
    }

    /* Login panel */
    .du-login-panel { display: flex; flex-direction: column; gap: 0.85rem; }
    .du-divider {
      display: flex; align-items: center; gap: 0.5rem;
      font-family: var(--font-patrick-hand); font-size: 0.8rem; color: #9E8B77;
    }
    .du-divider::before, .du-divider::after {
      content: ''; flex: 1; height: 1px; background: #E8DDD0;
    }

    /* Buttons */
    .du-btn {
      font-family: var(--font-patrick-hand);
      font-size: 0.95rem;
      border-radius: 10px;
      padding: 0.6rem 1.1rem;
      cursor: pointer;
      border: none;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: filter 0.15s ease, transform 0.1s ease;
    }
    .du-btn:hover { filter: brightness(0.96); transform: translateY(-1px); }
    .du-btn:active { transform: translateY(0); }
    .du-btn-google {
      background: #fff;
      border: 1.5px solid #D4A574 !important;
      color: #3E2C1C;
      border: none;
    }
    .du-btn-primary {
      background: linear-gradient(135deg, #00AB39, #00831E);
      color: #fff;
    }
    .du-btn-secondary {
      background: linear-gradient(135deg, #5C6BC0, #3949AB);
      color: #fff;
    }
    .du-btn-outline {
      background: #fff;
      border: 1.5px solid #D4A574 !important;
      color: #5D4E37;
    }
    .du-btn-danger-outline {
      background: #fff;
      border: 1.5px solid #EF5350 !important;
      color: #EF5350;
    }
    .du-btn:disabled {
      opacity: 0.55; cursor: not-allowed; transform: none !important; filter: none !important;
    }

    /* Email input */
    .du-email-input {
      font-family: var(--font-patrick-hand);
      font-size: 0.95rem;
      padding: 0.6rem 0.85rem;
      border: 1.5px solid #D4A574;
      border-radius: 10px;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      background: #FDFAF6;
      color: #3E2C1C;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .du-email-input:focus {
      border-color: #00AB39;
      box-shadow: 0 0 0 3px rgba(0,171,57,0.12);
    }
    .du-email-input::placeholder { color: #B0A090; }

    /* Verified doc card */
    .du-doc-summary {
      background: #F1FBF4;
      border: 1.5px solid #A5D6A7;
      border-radius: 12px;
      padding: 0.85rem 1rem;
      display: flex; flex-direction: column; gap: 0.5rem;
    }
    .du-doc-field-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.2rem 0.65rem;
      align-items: baseline;
    }
    .du-doc-field-label {
      font-family: var(--font-patrick-hand);
      font-size: 0.72rem;
      color: #9E8B77;
      white-space: nowrap;
      text-align: right;
    }
    .du-doc-field-value {
      font-family: var(--font-patrick-hand);
      font-size: 0.8rem;
      font-weight: 700;
      color: #1B5E20;
    }

    /* Doc type cards */
    .du-doctype-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .du-doctype-card {
      border: 2px solid #E8DDD0;
      border-radius: 14px;
      padding: 1.1rem 0.9rem;
      cursor: pointer;
      background: #FDFAF6;
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      text-align: center;
    }
    .du-doctype-card:hover {
      border-color: #00AB39;
      box-shadow: 0 2px 10px rgba(0,171,57,0.12);
      background: #F1FBF4;
    }
    .du-doctype-card.selected {
      border-color: #00AB39;
      background: #F1FBF4;
      box-shadow: 0 2px 10px rgba(0,171,57,0.15);
    }
    .du-doctype-card-title {
      font-family: var(--font-patrick-hand);
      font-size: 0.95rem;
      font-weight: 700;
      color: #3E2C1C;
    }
    .du-doctype-card-desc {
      font-family: var(--font-patrick-hand);
      font-size: 0.75rem;
      color: #9E8B77;
    }

    /* Spinner animation */
    @keyframes du-spin { to { transform: rotate(360deg); } }
    .du-spinner { animation: du-spin 0.9s linear infinite; }

    /* Checking state */
    .du-checking {
      display: flex; flex-direction: column; align-items: center;
      gap: 0.75rem; padding: 1.5rem 0;
      font-family: var(--font-patrick-hand);
      color: #9E8B77; font-size: 0.9rem;
    }

    /* Error */
    .du-error {
      background: #FFF3F3;
      border: 1.5px solid #FFCDD2;
      border-radius: 10px;
      padding: 0.65rem 0.9rem;
      font-family: var(--font-patrick-hand);
      font-size: 0.85rem;
      color: #C62828;
      display: flex; align-items: flex-start; gap: 0.4rem;
    }

    /* Complete banner */
    .du-complete-banner {
      background: linear-gradient(135deg, #E8F5E9, #F1FBF4);
      border: 2px solid #A5D6A7;
      border-radius: 12px;
      padding: 0.85rem 1.1rem;
      display: flex; align-items: center; gap: 0.65rem;
      font-family: var(--font-patrick-hand);
    }
    .du-complete-text { flex: 1; }
    .du-complete-title { font-size: 0.95rem; font-weight: 700; color: #1B5E20; }
    .du-complete-sub { font-size: 0.78rem; color: #388E3C; margin-top: 0.1rem; }

    /* Upload phase host */
    .du-upload-host {
      border: 1.5px dashed #D4A574;
      border-radius: 14px;
      overflow: hidden;
      margin-top: 0.5rem;
    }

    /* Pilgrim tab selector */
    .du-tabs {
      display: flex; gap: 0; border-bottom: 1.5px solid #E8DDD0; overflow-x: auto;
      scrollbar-width: none;
    }
    .du-tabs::-webkit-scrollbar { display: none; }
    .du-tab {
      font-family: var(--font-patrick-hand);
      font-size: 0.88rem;
      padding: 0.6rem 1rem;
      cursor: pointer;
      background: none;
      border: none;
      color: #9E8B77;
      border-bottom: 2.5px solid transparent;
      margin-bottom: -1.5px;
      white-space: nowrap;
      transition: color 0.15s, border-color 0.15s;
      display: flex; align-items: center; gap: 0.35rem;
    }
    .du-tab:hover { color: #5D4E37; }
    .du-tab.active { color: #3E2C1C; font-weight: 700; border-bottom-color: #D4A574; }
    .du-tab.done { color: #00AB39; }
    .du-tab.done.active { border-bottom-color: #00AB39; }

    /* Heading inside body */
    .du-section-title {
      font-family: var(--font-patrick-hand);
      font-size: 0.82rem;
      color: #9E8B77;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-bottom: 0.65rem;
    }
  `;
  document.head.appendChild(s);
}

// ── Main class ────────────────────────────────────────────────────────────────

export interface DocumentUploadIslandOptions {
  pilgrimCount: number;
  primaryUserId?: string | null;
  primaryEmail?: string | null;
  onCanProceedChange?: (canProceed: boolean) => void;
  personFormData?: Record<string, string>[];
}

export class DocumentUploadIsland {
  private container: HTMLElement;
  private opts: DocumentUploadIslandOptions;
  private mounted = false;
  /**
   * Single shared IdUploadIsland managing all N pilgrim slots (pslot-0…N-1).
   * DocumentUploadIsland moves each pslot div into the active tab panel when
   * the pilgrim reaches the 'upload' phase, then calls showUploadPhaseForSlot.
   */
  private sharedIdIsland: IdUploadIsland | null = null;
  /** Hidden container that holds pslot-* divs when not in the active tab. */
  private idIslandContainer: HTMLElement | null = null;
  /** Cards wrapper (outer UI frame). */
  private outerCard: HTMLElement | null = null;

  constructor(container: HTMLElement, opts: DocumentUploadIslandOptions) {
    this.container = container;
    this.opts = opts;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    injectStyles();

    const count = Math.min(Math.max(this.opts.pilgrimCount, 1), MAX_PILGRIMS);
    resetDocumentUploadStores(count);

    clearEl(this.container);

    // ── Hidden container for the shared IdUploadIsland (all pilgrim slots live here
    //    when not being shown in the active tab panel) ────────────────────────────
    this.idIslandContainer = document.createElement('div');
    this.idIslandContainer.style.display = 'none';
    this.idIslandContainer.id = 'du-id-island-container';
    this.container.appendChild(this.idIslandContainer);

    // Mount the shared IdUploadIsland now so all pslot-* elements are created
    this.sharedIdIsland = new IdUploadIsland(this.idIslandContainer, {
      pilgrimCount: count,
      personFormData: this.opts.personFormData,
      onCanProceedChange: () => {
        // Check if any pilgrim in 'upload' phase has just completed
        this.checkAndAdvanceCompletedUploads(count);
        this.notifyCanProceed();
      },
    });
    this.sharedIdIsland.mount();

    // Pre-link primary pilgrim if already authenticated
    if (this.opts.primaryUserId && this.opts.primaryEmail) {
      updateDocumentUploadState(0, {
        userId: this.opts.primaryUserId,
        email: this.opts.primaryEmail,
      });
    }

    // Build the outer tabbed card
    this.outerCard = this.buildOuterCard(count);
    this.container.appendChild(this.outerCard);

    // If primary pilgrim is already known, auto-advance to checking
    if (this.opts.primaryUserId) {
      this.doCheckDocuments(0, this.opts.primaryUserId);
    }
  }

  destroy(): void {
    this.sharedIdIsland?.destroy();
    this.sharedIdIsland = null;
    clearEl(this.container);
    this.mounted = false;
  }

  setPilgrimCount(n: number): void {
    this.opts.pilgrimCount = n;
    this.mounted = false;
    this.destroy();
    this.mount();
  }

  // ── Outer card with tab bar ─────────────────────────────────────────────────

  private buildOuterCard(count: number): HTMLElement {
    const card = el('div');
    card.className = 'du-card';

    const tabs = el('div');
    tabs.className = 'du-tabs';
    tabs.id = 'du-tabs';

    const bodyWrap = el('div');
    bodyWrap.id = 'du-body-wrap';

    for (let i = 0; i < count; i++) {
      // Tab button
      const tab = el('button');
      tab.type = 'button';
      tab.className = 'du-tab' + (i === 0 ? ' active' : '');
      tab.id = `du-tab-${i}`;
      tab.dataset.pilgrimIdx = String(i);
      tab.appendChild(parseSVG(SVG_PILGRIM));
      tab.appendChild(document.createTextNode(i === 0 ? ' Tú' : ` Peregrino ${i + 1}`));
      tab.addEventListener('click', () => this.activatePilgrimTab(i, count));
      tabs.appendChild(tab);

      // Per-pilgrim body panel
      const panel = el('div');
      panel.id = `du-panel-${i}`;
      panel.style.display = i === 0 ? '' : 'none';
      const body = this.buildPilgrimBody(i);
      panel.appendChild(body);
      bodyWrap.appendChild(panel);
    }

    card.appendChild(tabs);
    card.appendChild(bodyWrap);
    return card;
  }

  private activatePilgrimTab(idx: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const tab = document.getElementById(`du-tab-${i}`);
      const panel = document.getElementById(`du-panel-${i}`);
      if (!tab || !panel) continue;
      if (i === idx) {
        tab.classList.add('active');
        panel.style.display = '';
        slideIn(panel, 240);
      } else {
        tab.classList.remove('active');
        panel.style.display = 'none';
      }
    }
  }

  // ── Per-pilgrim body ────────────────────────────────────────────────────────

  private buildPilgrimBody(idx: number): HTMLElement {
    const body = el('div');
    body.id = `du-body-${idx}`;
    body.className = 'du-body';

    // Header row (icon + label + status badge)
    const header = this.buildHeader(idx);
    body.appendChild(header);

    const separator = el('div', 'height:1px;background:rgba(212,165,116,0.28);margin:0.85rem 0 0.9rem');
    body.appendChild(separator);

    // Phase container — content swaps in here
    const phaseHost = el('div');
    phaseHost.id = `du-phase-${idx}`;
    body.appendChild(phaseHost);

    // ⚠️ IMPORTANT: renderPhase uses document.getElementById which requires the element
    // to already be in the DOM. Since we're building the body before it's mounted,
    // we build the initial panel DIRECTLY here instead of calling renderPhase.
    // renderPhase() IS called correctly for all subsequent phase transitions.
    const initialPanel = this.buildInitialPanel(idx);
    fadeIn(initialPanel, 280);
    phaseHost.appendChild(initialPanel);

    return body;
  }

  /** Build the initial panel for a pilgrim at mount time (before entering the DOM). */
  private buildInitialPanel(idx: number): HTMLElement {
    const state = getDocumentUploadState(idx);
    // Primary pilgrim (idx=0) with known userId goes to 'checking' immediately;
    // all others start with 'login'.
    if (state.phase === 'checking') return this.buildCheckingPanel();
    return this.buildLoginPanel(idx);
  }

  private buildHeader(idx: number): HTMLElement {
    const header = el('div');
    header.style.cssText = 'display:flex;align-items:center;gap:0.65rem';

    const icon = el('div');
    icon.className = 'du-header-icon';
    icon.style.cssText =
      'width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#D4A574,#B8895A);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;box-shadow:0 1px 5px rgba(180,130,80,0.3)';
    icon.appendChild(parseSVG(SVG_PILGRIM));
    header.appendChild(icon);

    const textWrap = el('div', 'flex:1;min-width:0');
    const label = el(
      'div',
      "font-family:var(--font-patrick-hand);font-size:0.72rem;color:#9E8B77;text-transform:uppercase;letter-spacing:0.06em",
      idx === 0 ? 'Peregrino principal' : `Peregrino ${idx + 1}`
    );
    const name = el(
      'div',
      "font-family:var(--font-patrick-hand);font-size:1rem;font-weight:700;color:#3E2C1C;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
    );
    name.id = `du-header-name-${idx}`;
    name.textContent = idx === 0 ? (this.opts.primaryEmail ?? 'Tú') : 'Sin identificar';
    textWrap.appendChild(label);
    textWrap.appendChild(name);
    header.appendChild(textWrap);

    const badge = el('div');
    badge.id = `du-header-badge-${idx}`;
    badge.className = 'du-badge du-badge-pending';
    badge.appendChild(parseSVG(SVG_WARN));
    badge.appendChild(document.createTextNode(' Pendiente'));
    header.appendChild(badge);

    return header;
  }

  // ── Phase renderer ──────────────────────────────────────────────────────────

  private renderPhase(idx: number): void {
    const host = document.getElementById(`du-phase-${idx}`);
    if (!host) return;
    const state = getDocumentUploadState(idx);

    clearEl(host);
    let panel: HTMLElement;

    switch (state.phase) {
      case 'login':
        panel = this.buildLoginPanel(idx);
        break;
      case 'checking':
        panel = this.buildCheckingPanel();
        break;
      case 'verified':
        panel = this.buildVerifiedPanel(idx);
        this.updateHeaderBadge(idx, 'verified');
        break;
      case 'doctype':
        panel = this.buildDoctypePanel(idx);
        this.updateHeaderBadge(idx, 'upload');
        break;
      case 'upload':
        panel = this.buildUploadPanel(idx);
        this.updateHeaderBadge(idx, 'upload');
        break;
      case 'complete':
        panel = this.buildCompletePanel(idx);
        this.updateHeaderBadge(idx, 'verified');
        this.updateTab(idx, 'done');
        break;
      default:
        panel = el('div');
    }

    fadeIn(panel, 280);
    host.appendChild(panel);
  }

  private updateHeaderBadge(idx: number, type: 'verified' | 'upload' | 'pending'): void {
    const badge = document.getElementById(`du-header-badge-${idx}`);
    if (!badge) return;
    clearEl(badge);
    badge.className = 'du-badge';
    if (type === 'verified') {
      badge.classList.add('du-badge-verified');
      badge.appendChild(parseSVG(SVG_CHECK));
      badge.appendChild(document.createTextNode(' Verificado'));
    } else if (type === 'upload') {
      badge.classList.add('du-badge-uploading');
      badge.appendChild(document.createTextNode('Subiendo'));
    } else {
      badge.classList.add('du-badge-pending');
      badge.appendChild(parseSVG(SVG_WARN));
      badge.appendChild(document.createTextNode(' Pendiente'));
    }
  }

  private updateTab(idx: number, status: 'done' | 'active' | 'default'): void {
    const tab = document.getElementById(`du-tab-${idx}`);
    if (!tab) return;
    tab.classList.toggle('done', status === 'done');
  }

  // ── Phase: login ────────────────────────────────────────────────────────────

  private buildLoginPanel(idx: number): HTMLElement {
    const wrap = el('div');
    wrap.className = 'du-login-panel';

    const title = el(
      'div',
      "font-family:var(--font-patrick-hand);font-size:0.88rem;color:#5D4E37;margin-bottom:0.15rem",
      idx === 0
        ? 'Inicia sesión para verificar tu identidad'
        : 'Introduce el email de este peregrino para vincular su perfil'
    );
    wrap.appendChild(title);

    // Error placeholder
    const errorEl = el('div');
    errorEl.id = `du-login-error-${idx}`;
    errorEl.style.display = 'none';
    wrap.appendChild(errorEl);

    // Google sign-in button (only for primary pilgrim or any pilgrim for social login)
    const googleBtn = el(
      'button',
      'width:100%',
      ''
    ) as HTMLButtonElement;
    googleBtn.type = 'button';
    googleBtn.className = 'du-btn du-btn-google';
    googleBtn.style.width = '100%';
    googleBtn.appendChild(parseSVG(SVG_GOOGLE));
    googleBtn.appendChild(document.createTextNode('Continuar con Google'));
    googleBtn.addEventListener('click', () => this.handleGoogleLogin(idx, errorEl));
    wrap.appendChild(googleBtn);

    // Divider
    const divider = el('div');
    divider.className = 'du-divider';
    divider.textContent = 'o con email';
    wrap.appendChild(divider);

    // Email input
    const emailInput = el('input') as HTMLInputElement;
    emailInput.type = 'email';
    emailInput.id = `du-email-input-${idx}`;
    emailInput.className = 'du-email-input';
    emailInput.placeholder = 'email@ejemplo.com';
    emailInput.autocomplete = 'email';
    if (idx === 0 && this.opts.primaryEmail) {
      emailInput.value = this.opts.primaryEmail;
    }
    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') continueBtn.click();
    });
    wrap.appendChild(emailInput);

    // Continue button
    const continueBtn = el('button', 'width:100%') as HTMLButtonElement;
    continueBtn.type = 'button';
    continueBtn.className = 'du-btn du-btn-primary';
    continueBtn.style.width = '100%';
    continueBtn.textContent = 'Continuar →';
    continueBtn.addEventListener('click', async () => {
      const emailVal = emailInput.value.trim();
      if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        this.showLoginError(idx, 'Introduce un email válido.');
        return;
      }
      this.hideLoginError(idx);
      await this.handleEmailContinue(idx, emailVal);
    });
    wrap.appendChild(continueBtn);

    return wrap;
  }

  private showLoginError(idx: number, msg: string): void {
    const el2 = document.getElementById(`du-login-error-${idx}`);
    if (!el2) return;
    clearEl(el2);
    el2.className = 'du-error';
    el2.style.display = '';
    el2.appendChild(parseSVG(SVG_WARN));
    el2.appendChild(document.createTextNode(msg));
    fadeIn(el2, 200);
  }

  private hideLoginError(idx: number): void {
    const el2 = document.getElementById(`du-login-error-${idx}`);
    if (el2) el2.style.display = 'none';
  }

  private async handleGoogleLogin(_idx: number, _errorEl: HTMLElement): Promise<void> {
    // Use Clerk's client-side API to open Google OAuth popup
    const clerk = (window as { Clerk?: { openSignIn?: (opts?: object) => void } }).Clerk;
    if (clerk?.openSignIn) {
      clerk.openSignIn({
        afterSignInUrl: window.location.href,
        redirectUrl: window.location.href,
      });
    } else {
      // Clerk not loaded yet — redirect to auth page
      window.location.href = `/auth?from=${encodeURIComponent(window.location.pathname)}`;
    }
  }

  private async handleEmailContinue(idx: number, email: string): Promise<void> {
    updateDocumentUploadState(idx, { phase: 'checking', email, loading: true, error: null });
    this.renderPhase(idx);

    try {
      const resp = await fetch('/api/pilgrim/link-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!resp.ok) {
        const err = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${resp.status}`);
      }

      const data = (await resp.json()) as {
        userId: string;
        exists: boolean;
        documents: PilgrimDocument[];
      };

      updateDocumentUploadState(idx, {
        userId: data.userId,
        existingDocuments: data.documents,
        loading: false,
      });

      // Update header name
      const nameEl = document.getElementById(`du-header-name-${idx}`);
      if (nameEl) nameEl.textContent = email;

      // Update tab label
      const tab = document.getElementById(`du-tab-${idx}`);
      if (tab) {
        clearEl(tab);
        tab.appendChild(parseSVG(SVG_PILGRIM));
        const short = email.split('@')[0]!.slice(0, 12);
        tab.appendChild(document.createTextNode(` ${short}`));
      }

      this.doCheckDocuments(idx, data.userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      updateDocumentUploadState(idx, { phase: 'login', loading: false, error: msg });
      this.renderPhase(idx);
      this.showLoginError(idx, msg);
    }
  }

  // ── Phase: checking ─────────────────────────────────────────────────────────

  private buildCheckingPanel(): HTMLElement {
    const wrap = el('div');
    wrap.className = 'du-checking';

    const spinnerWrap = el('div');
    spinnerWrap.className = 'du-spinner';
    spinnerWrap.style.color = '#D4A574';
    spinnerWrap.appendChild(parseSVG(SVG_SPINNER));
    wrap.appendChild(spinnerWrap);

    wrap.appendChild(el('div', undefined, 'Verificando documentos\u2026'));
    return wrap;
  }

  private async doCheckDocuments(idx: number, userId: string): Promise<void> {
    // Fetch documents for this userId
    try {
      const resp = await fetch(`/api/pilgrim/documents?userId=${encodeURIComponent(userId)}`, {
        signal: AbortSignal.timeout(8_000),
      });

      if (!resp.ok && resp.status !== 401) {
        throw new Error(`HTTP ${resp.status}`);
      }

      if (resp.status === 401) {
        // Caller is not authenticated — if primary pilgrim, redirect to auth
        if (idx === 0) {
          updateDocumentUploadState(idx, { phase: 'login', loading: false });
          this.renderPhase(idx);
          return;
        }
        // For additional pilgrims, the API route will return 403 (not the primary)
        // Still proceed to doctype selection
        updateDocumentUploadState(idx, { phase: 'doctype', loading: false });
        this.renderPhase(idx);
        return;
      }

      const data = (await resp.json()) as { documents?: PilgrimDocument[] };
      const docs: PilgrimDocument[] = Array.isArray(data.documents) ? data.documents : [];

      updateDocumentUploadState(idx, { existingDocuments: docs });

      const best = bestDocument(docs);
      if (best) {
        updateDocumentUploadState(idx, { phase: 'verified', selectedDocument: best });
      } else {
        updateDocumentUploadState(idx, { phase: 'doctype' });
      }
    } catch {
      // Network error or timeout — go straight to doctype selection
      updateDocumentUploadState(idx, { phase: 'doctype', loading: false });
    }

    this.renderPhase(idx);
    this.notifyCanProceed();
  }

  // ── Phase: verified ─────────────────────────────────────────────────────────

  private buildVerifiedPanel(idx: number): HTMLElement {
    const state = getDocumentUploadState(idx);
    const doc = state.selectedDocument;

    const wrap = el('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:0.9rem';

    // Shield + title
    const titleRow = el('div', 'display:flex;align-items:center;gap:0.55rem');
    titleRow.appendChild(parseSVG(SVG_SHIELD_CHECK));
    const titleText = el(
      'span',
      "font-family:var(--font-patrick-hand);font-size:0.97rem;font-weight:700;color:#1B5E20",
      'Documento válido encontrado'
    );
    titleRow.appendChild(titleText);
    wrap.appendChild(titleRow);

    if (doc) {
      const docCard = el('div');
      docCard.className = 'du-doc-summary';

      const typeLabel = el(
        'div',
        "font-family:var(--font-patrick-hand);font-size:0.88rem;font-weight:700;color:#1B5E20;margin-bottom:0.35rem",
        DOC_TYPE_LABELS[doc.type] ?? doc.type
      );
      docCard.appendChild(typeLabel);

      const grid = el('div');
      grid.className = 'du-doc-field-grid';

      const addField = (label: string, value: string | undefined) => {
        if (!value) return;
        const lbl = el('span', undefined, label + ':');
        lbl.className = 'du-doc-field-label';
        const val = el('span', undefined, value);
        val.className = 'du-doc-field-value';
        grid.appendChild(lbl);
        grid.appendChild(val);
      };

      addField('País', doc.country);
      if (doc.ocrFields?.firstName || doc.ocrFields?.lastName) {
        const fullName = [doc.ocrFields?.firstName, doc.ocrFields?.lastName, doc.ocrFields?.lastName2]
          .filter(Boolean)
          .join(' ');
        addField('Nombre', fullName);
      }
      if (doc.ocrFields?.documentNumber) addField('Nº documento', doc.ocrFields.documentNumber);
      if (doc.ocrFields?.birthDate) addField('F. nacimiento', doc.ocrFields.birthDate);
      addField('Válido hasta', doc.expirationDate ? formatExpiry(doc.expirationDate) : undefined);

      docCard.appendChild(grid);

      // Images count indicator
      if (doc.images?.length) {
        const imgRow = el(
          'div',
          "font-family:var(--font-patrick-hand);font-size:0.75rem;color:#66BB6A;margin-top:0.35rem",
          `${doc.images.length} imagen${doc.images.length !== 1 ? 'es' : ''} almacenada${doc.images.length !== 1 ? 's' : ''}`
        );
        docCard.appendChild(imgRow);
      }

      wrap.appendChild(docCard);
    }

    // Action buttons
    const btnRow = el('div', 'display:flex;gap:0.65rem;flex-wrap:wrap');

    const useBtn = el('button', 'flex:1') as HTMLButtonElement;
    useBtn.type = 'button';
    useBtn.className = 'du-btn du-btn-primary';
    useBtn.style.flex = '1';
    useBtn.textContent = '✓ Usar este documento';
    useBtn.addEventListener('click', () => {
      updateDocumentUploadState(idx, { phase: 'complete' });
      this.renderPhase(idx);
      this.notifyCanProceed();
    });

    const reuploadBtn = el('button', '') as HTMLButtonElement;
    reuploadBtn.type = 'button';
    reuploadBtn.className = 'du-btn du-btn-outline';
    reuploadBtn.textContent = 'Subir nuevo';
    reuploadBtn.addEventListener('click', () => {
      updateDocumentUploadState(idx, { phase: 'doctype', selectedDocument: null });
      this.renderPhase(idx);
    });

    btnRow.appendChild(useBtn);
    btnRow.appendChild(reuploadBtn);
    wrap.appendChild(btnRow);

    return wrap;
  }

  // ── Phase: doctype ──────────────────────────────────────────────────────────

  private buildDoctypePanel(idx: number): HTMLElement {
    const wrap = el('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:0.9rem';

    const title = el('div', undefined, 'Selecciona el tipo de documento');
    title.className = 'du-section-title';
    wrap.appendChild(title);

    const grid = el('div');
    grid.className = 'du-doctype-grid';

    // DNI/NIE card
    const dniCard = el('div');
    dniCard.className = 'du-doctype-card';
    dniCard.style.cursor = 'pointer';
    const dniIcon = el('div');
    dniIcon.appendChild(parseSVG(SVG_DOC_ID));
    dniCard.appendChild(dniIcon);
    const dniTitle = el('div', undefined, 'DNI / NIE / EU ID');
    dniTitle.className = 'du-doctype-card-title';
    dniCard.appendChild(dniTitle);
    const dniDesc = el('div', undefined, 'Requiere foto frontal y trasera');
    dniDesc.className = 'du-doctype-card-desc';
    dniCard.appendChild(dniDesc);
    dniCard.addEventListener('click', () => {
      updateDocumentUploadState(idx, { chosenDocType: 'dni', phase: 'upload' });
      this.renderPhase(idx);
    });
    grid.appendChild(dniCard);

    // Passport card
    const passCard = el('div');
    passCard.className = 'du-doctype-card';
    passCard.style.cursor = 'pointer';
    const passIcon = el('div');
    passIcon.appendChild(parseSVG(SVG_PASSPORT));
    passCard.appendChild(passIcon);
    const passTitle = el('div', undefined, 'Pasaporte');
    passTitle.className = 'du-doctype-card-title';
    passCard.appendChild(passTitle);
    const passDesc = el('div', undefined, 'Solo foto de la página de datos');
    passDesc.className = 'du-doctype-card-desc';
    passCard.appendChild(passDesc);
    passCard.addEventListener('click', () => {
      updateDocumentUploadState(idx, { chosenDocType: 'passport', phase: 'upload' });
      this.renderPhase(idx);
    });
    grid.appendChild(passCard);

    wrap.appendChild(grid);
    return wrap;
  }

  // ── Phase: upload ───────────────────────────────────────────────────────────

  private buildUploadPanel(idx: number): HTMLElement {
    const state = getDocumentUploadState(idx);
    const docType = state.chosenDocType ?? 'dni';

    const wrap = el('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:0.9rem';

    // Back button
    const backBtn = el('button', '') as HTMLButtonElement;
    backBtn.type = 'button';
    backBtn.className = 'du-btn du-btn-outline';
    backBtn.style.cssText = 'align-self:flex-start;padding:0.3rem 0.75rem;font-size:0.82rem';
    backBtn.textContent = '← Cambiar tipo';
    backBtn.addEventListener('click', () => {
      // Return pslot-${idx} back to hidden container
      this.returnSlotToContainer(idx);
      updateDocumentUploadState(idx, { phase: 'doctype', chosenDocType: null });
      this.renderPhase(idx);
    });
    wrap.appendChild(backBtn);

    // Upload slot host — the pslot-${idx} div will be moved here from the hidden container
    const slotHost = el('div');
    slotHost.id = `du-slot-host-${idx}`;
    slotHost.className = 'du-upload-host';
    slotHost.style.cssText = 'overflow:visible;border:none;margin-top:0.25rem';
    wrap.appendChild(slotHost);

    // Move pslot-${idx} into slotHost and trigger upload phase
    // Use a microtask to ensure slotHost is in the DOM
    Promise.resolve().then(() => {
      const pslot = document.getElementById(`pslot-${idx}`);
      if (!pslot) return;
      // Show pslot and move it into the tab panel
      pslot.style.display = '';
      slotHost.appendChild(pslot);
      // Tell IdUploadIsland to skip the doc-card selection and show the upload UI
      this.sharedIdIsland?.showUploadPhaseForSlot(idx, docType);
    });

    return wrap;
  }

  /** Move a pslot element back to the hidden idIslandContainer. */
  private returnSlotToContainer(idx: number): void {
    const pslot = document.getElementById(`pslot-${idx}`);
    if (!pslot || !this.idIslandContainer) return;
    pslot.style.display = 'none';
    this.idIslandContainer.appendChild(pslot);
  }

  private handleUploadComplete(idx: number): void {
    import('../../stores/bookingStep2Store').then(({ getPilgrimDocState: getStep2State }) => {
      const step2State = getStep2State(idx);
      const state = getDocumentUploadState(idx);
      const fields = (step2State.frontOcrFields ?? step2State.backOcrFields) || null;
      const docType = state.chosenDocType ?? 'dni';

      const newDoc: PilgrimDocument = {
        id: crypto.randomUUID(),
        type: docType === 'passport' ? 'passport' : 'dni',
        country: fields?.nationality ?? 'ESP',
        expirationDate: fields?.expiryDate
          ? new Date(fields.expiryDate).toISOString().split('T')[0]!
          : new Date(Date.now() + 5 * 365 * 86400_000).toISOString().split('T')[0]!,
        images: [],
        verified: step2State.frontValid === true,
        uploadedAt: new Date().toISOString(),
        ocrFields: fields
          ? {
              firstName: fields.firstName || undefined,
              lastName: fields.lastName || undefined,
              lastName2: fields.lastName2 || undefined,
              documentNumber: fields.documentNumber || undefined,
              birthDate: fields.birthDate || undefined,
              nationality: fields.nationality || undefined,
              gender: fields.gender || undefined,
            }
          : undefined,
      };

      updateDocumentUploadState(idx, { selectedDocument: newDoc, phase: 'complete' });

      // Move pslot back to hidden container
      this.returnSlotToContainer(idx);

      // Persist to Clerk private_metadata
      const currentState = getDocumentUploadState(idx);
      if (currentState.userId) {
        fetch('/api/pilgrim/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentState.userId, document: newDoc }),
        }).catch(() => { /* non-fatal */ });
      }

      this.renderPhase(idx);
      this.notifyCanProceed();
    });
  }

  // ── Phase: complete ─────────────────────────────────────────────────────────

  private buildCompletePanel(idx: number): HTMLElement {
    const state = getDocumentUploadState(idx);
    const doc = state.selectedDocument;

    const wrap = el('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:0.85rem';

    const banner = el('div');
    banner.className = 'du-complete-banner';

    const iconWrap = el('div', 'flex-shrink:0');
    iconWrap.appendChild(parseSVG(SVG_SHIELD_CHECK));
    banner.appendChild(iconWrap);

    const textWrap = el('div');
    textWrap.className = 'du-complete-text';

    const title = el('div', undefined, 'Documento verificado');
    title.className = 'du-complete-title';
    textWrap.appendChild(title);

    const sub = el(
      'div',
      undefined,
      doc
        ? `${DOC_TYPE_LABELS[doc.type] ?? doc.type} · Válido hasta ${formatExpiry(doc.expirationDate)}`
        : 'Listo para continuar'
    );
    sub.className = 'du-complete-sub';
    textWrap.appendChild(sub);
    banner.appendChild(textWrap);
    wrap.appendChild(banner);

    // Change doc button
    const changeBtn = el('button', '') as HTMLButtonElement;
    changeBtn.type = 'button';
    changeBtn.className = 'du-btn du-btn-outline';
    changeBtn.style.cssText = 'align-self:flex-start;padding:0.3rem 0.75rem;font-size:0.82rem';
    changeBtn.textContent = '↩ Cambiar documento';
    changeBtn.addEventListener('click', () => {
      // Return pslot to hidden container (if it was moved during upload phase)
      this.returnSlotToContainer(idx);
      updateDocumentUploadState(idx, { phase: 'doctype', selectedDocument: null, chosenDocType: null });
      this.renderPhase(idx);
      this.notifyCanProceed();
    });
    wrap.appendChild(changeBtn);

    return wrap;
  }

  // ── Can-proceed logic ───────────────────────────────────────────────────────

  private notifyCanProceed(): void {
    this.opts.onCanProceedChange?.(this.computeCanProceed());
  }

  private computeCanProceed(): boolean {
    const count = Math.min(Math.max(this.opts.pilgrimCount, 1), MAX_PILGRIMS);
    for (let i = 0; i < count; i++) {
      const s = getDocumentUploadState(i);
      if (s.phase !== 'complete' && s.phase !== 'verified') return false;
    }
    return true;
  }

  /**
   * Called whenever IdUploadIsland fires onCanProceedChange.
   * Checks each pilgrim in 'upload' phase — if their upload is now valid,
   * advances them to 'complete' and updates the header badge + tab.
   */
  private checkAndAdvanceCompletedUploads(count: number): void {
    import('../../stores/bookingStep2Store').then(({ getPilgrimDocState, pilgrimFiles }) => {
      for (let i = 0; i < count; i++) {
        const duState = getDocumentUploadState(i);
        if (duState.phase !== 'upload') continue;

        const step2 = getPilgrimDocState(i);
        const files = pilgrimFiles[i];
        const needBack = step2.docType === 'dni';
        const uploadDone =
          step2.docType !== null &&
          files.frontFile !== null &&
          (!needBack || files.backFile !== null) &&
          step2.frontValid === true &&
          (!needBack || step2.backValid === true);

        if (uploadDone) {
          this.handleUploadComplete(i);
        }
      }
    });
  }
}
