/**
 * PilgrimCardIsland — Redesigned
 * ─────────────────────────────────────────────────────────────────────────────
 * Pokémon-card style booking wizard that matches the /profile page aesthetic.
 *
 * Visual: dark-green header · parchment body · sketchy SVG filter · green inputs
 * Fonts:  Cabin Sketch · Patrick Hand · Shadows Into Light (loaded by Layout)
 *
 * Wizard phases (per-card):
 *   email_opt → otp → upload_front → upload_back? → form → done
 *   (logged-in primary user skips email_opt & otp)
 *
 * OTP delivery: uses window.Clerk.client.signIn.create({ strategy:'email_code' })
 *   → real Clerk email delivery, no custom backend required.
 *   Falls back to POST /api/pilgrim/send-code (which logs the code in dev).
 *
 * Security: DOM built with createElement/textContent/appendChild only.
 *   No innerHTML with user-derived strings. Static SVG via DOMParser.
 */

import { setPilgrimData, getPilgrimData } from '../../stores/bookingPilgrims';
import type { FieldKey } from '../../stores/bookingPilgrims';
import { updatePilgrimDocState } from '../../stores/bookingStep2Store';
import { updateDocumentUploadState } from '../../stores/documentUploadStore';
import type { ExtractedFields } from '../../lib/ocr';

// ── Exported types ────────────────────────────────────────────────────────────

export interface OcrFields {
  firstName?: string;
  lastName?: string;
  lastName2?: string;
  documentNumber?: string;
  birthDate?: string;
  expiryDate?: string;
  nationality?: string;
  gender?: string;
  homeAddress?: string;
}

/** Convert OcrFields (all-optional, includes homeAddress) → ExtractedFields (all-required, no homeAddress). */
function toExtractedFields(o: OcrFields | null | undefined): ExtractedFields | null {
  if (!o) return null;
  return {
    firstName: o.firstName ?? '',
    lastName: o.lastName ?? '',
    lastName2: o.lastName2 ?? '',
    documentNumber: o.documentNumber ?? '',
    birthDate: o.birthDate ?? '',
    expiryDate: o.expiryDate ?? '',
    nationality: o.nationality ?? '',
    gender: o.gender ?? '',
  };
}

export interface PilgrimCompleteData {
  userId: string;
  email: string;
  docType: string;
  ocrFields: OcrFields;
  formData: Record<string, string>;
  avatarDataUrl: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  frontBackValid: boolean;
}

export interface PilgrimCardOptions {
  pilgrimIndex: number;
  pilgrimLabel: string;
  onComplete?: (data: PilgrimCompleteData) => void;
  onAvatarChange?: (dataUrl: string) => void;
  loggedInEmail?: string;
  loggedInUserId?: string;
}

// ── Wizard phases ─────────────────────────────────────────────────────────────

type Phase =
  | 'email_opt'   // enter/skip email
  | 'otp'         // 6-digit code
  | 'upload'      // upload front (and back for DNI/NIE)
  | 'form'        // fill pilgrim info
  | 'done';       // complete

type DocType = 'dni' | 'nie' | 'passport';

interface ClerkMetaSnapshot {
  imageUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  publicMetadata: Record<string, unknown>;
  unsafeMetadata: Record<string, unknown>;
  hasGoogleAuth: boolean;
}

interface CardState {
  phase: Phase;
  email: string;
  userId: string | null;
  docType: DocType;
  uploadStep: 'front' | 'back';   // which side we're currently uploading
  frontImageUrl: string | null;
  backImageUrl: string | null;
  frontOcrFields: OcrFields | null;
  backOcrFields: OcrFields | null;
  avatarDataUrl: string | null;
  uploading: boolean;
  frontBackValid: boolean | null;
  mismatches: Array<{ field: string; front: string; back: string }>;
  errorMsg: string | null;
  clerkSignIn: unknown;   // pending Clerk signIn attempt
  clerkMeta: ClerkMetaSnapshot | null; // loaded once from window.Clerk.user
}

// ── CSS (injected once per page) ──────────────────────────────────────────────

const PKD_STYLE_ID = 'pkd-island-styles';

const PKD_CSS = `
/* === PilgrimCardIsland — Pokémon card style === */
/* Fonts are served locally by Astro's built-in font system (astro.config.mjs).
   No @import needed here — @font-face rules are injected at the layout level. */

.pkd-card {
  --gd: #1a3a2e;
  --gm: #2d5a3d;
  --g:  #00ab39;
  --gl: #e8f5e9;
  --parchment: #faf7f0;
  --ink: #1a2a1a;
  --font-h: var(--font-patrick-hand);
  --font-sk: var(--font-cabin-sketch);
  --font-di: var(--font-shadows-into-light);

  background: var(--parchment);
  border: 4px solid var(--gd);
  border-radius: 18px;
  padding: 6px;
  box-shadow:
    0 2px 0 rgba(0,0,0,.18),
    4px 6px 24px rgba(0,0,0,.14),
    inset 0 1px 0 rgba(255,255,255,.7);
  filter: url(#sk);
  position: relative;
  width: 340px;
  max-width: 96vw;
  margin: 0 auto;
  font-family: var(--font-h);
}
.pkd-inner {
  border: 2px solid rgba(0,171,57,.35);
  border-radius: 13px;
  overflow: hidden;
  background: var(--parchment);
  filter: none;
  display: flex;
  flex-direction: column;
}

/* Header strip */
.pkd-header {
  background: linear-gradient(135deg, var(--gd) 0%, var(--gm) 100%);
  padding: .5rem .85rem;
  display: flex;
  align-items: center;
  gap: .45rem;
  min-height: 42px;
}
.pkd-badge {
  font-family: var(--font-sk);
  font-size: .7rem;
  letter-spacing: .18em;
  color: rgba(255,255,255,.9);
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 4px;
  padding: .1rem .5rem;
  flex-shrink: 0;
}
.pkd-header-email {
  font-family: var(--font-h);
  font-size: .7rem;
  color: #a7f3d0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 130px;
  flex: 1;
}
.pkd-header-spacer { flex: 1; }
.pkd-header-step {
  font-family: var(--font-sk);
  font-size: .65rem;
  color: rgba(255,255,255,.7);
  letter-spacing: .06em;
}
.pkd-change-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,.35);
  border-radius: 5px;
  color: rgba(255,255,255,.8);
  font-family: var(--font-h);
  font-size: .68rem;
  padding: .15rem .5rem;
  cursor: pointer;
  flex-shrink: 0;
}
.pkd-change-btn:hover { border-color: #fff; color: #fff; }

/* Art frame */
.pkd-art {
  padding: .65rem .85rem .45rem;
  cursor: default;
}
.pkd-art-frame {
  position: relative;
  border: 2px solid var(--gd);
  border-radius: 10px;
  overflow: hidden;
  background: linear-gradient(160deg, #d4edd9 0%, #b8dfc0 50%, #c5e8ca 100%);
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pkd-art-img {
  width: 100%; height: 100%; object-fit: cover;
}
.pkd-art-initials {
  font-family: var(--font-sk);
  font-size: 3.5rem;
  color: var(--gd);
  opacity: .45;
  user-select: none;
}

/* Upload zone (replaces art frame during upload step) */
.pkd-drop-zone {
  width: 100%; height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .4rem;
  cursor: pointer;
  transition: background .15s;
}
.pkd-drop-zone.drag-over {
  background: rgba(0,171,57,.12);
}
.pkd-drop-label {
  font-family: var(--font-sk);
  font-size: .82rem;
  letter-spacing: .12em;
  color: var(--gd);
}
.pkd-drop-hint {
  font-family: var(--font-h);
  font-size: .72rem;
  color: var(--gm);
  opacity: .8;
}
.pkd-drop-thumb {
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
.pkd-drop-file {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

/* Name row */
.pkd-name-row {
  padding: .3rem .85rem .05rem;
}
.pkd-name {
  font-family: var(--font-di);
  font-size: 1.2rem;
  color: var(--ink);
  line-height: 1.2;
}
.pkd-name.placeholder {
  opacity: .35;
  font-size: 1rem;
}

/* Doc-type selector row */
.pkd-doctype-row {
  display: flex;
  gap: .35rem;
  padding: .25rem .85rem .3rem;
}
.pkd-dt-btn {
  font-family: var(--font-h);
  font-size: .75rem;
  padding: .2rem .55rem;
  border: 1.5px solid rgba(0,171,57,.45);
  border-radius: 20px;
  background: transparent;
  color: var(--gm);
  cursor: pointer;
  transition: all .15s;
}
.pkd-dt-btn.active {
  background: var(--gd);
  color: #fff;
  border-color: var(--gd);
  font-weight: 700;
}
.pkd-dt-btn:hover:not(.active) {
  background: rgba(0,171,57,.1);
}

/* Wizard body (scrollable within card) */
.pkd-body {
  padding: .55rem .85rem .45rem;
  border-top: 1px dashed rgba(0,171,57,.25);
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,171,57,.3) transparent;
}

/* Step progress dots */
.pkd-progress {
  display: flex;
  align-items: center;
  gap: .35rem;
  margin-bottom: .6rem;
}
.pkd-prog-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: rgba(0,171,57,.2);
  border: 1px solid rgba(0,171,57,.4);
  transition: all .2s;
}
.pkd-prog-dot.done {
  background: var(--g);
  border-color: var(--gd);
}
.pkd-prog-dot.active {
  background: var(--gd);
  border-color: var(--gd);
  transform: scale(1.3);
}
.pkd-prog-label {
  font-family: var(--font-h);
  font-size: .68rem;
  color: #888;
  margin-left: .2rem;
}

/* Form inputs */
.pkd-label {
  font-family: var(--font-h);
  font-size: .68rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 1px;
  display: block;
}
.pkd-input {
  width: 100%;
  height: 2.1rem;
  padding: 0 .55rem;
  box-sizing: border-box;
  border: 1.5px solid rgba(0,171,57,.4);
  border-radius: 7px;
  font-family: var(--font-h);
  font-size: .82rem;
  color: var(--ink);
  background: #fff;
  outline: none;
  transition: border-color .15s;
}
.pkd-input:focus {
  border-color: var(--g);
  box-shadow: 0 0 0 3px rgba(0,171,57,.1);
}
.pkd-input.filled { border-color: rgba(0,171,57,.55); }
.pkd-input.error  { border-color: #dc2626; }

/* Phone input row */
.pkd-phone-row {
  display: flex;
  gap: .3rem;
}
.pkd-cc-select {
  width: 80px;
  flex-shrink: 0;
  height: 2.1rem;
  border: 1.5px solid rgba(0,171,57,.4);
  border-radius: 7px;
  font-family: var(--font-h);
  font-size: .75rem;
  color: var(--ink);
  background: #fff;
  padding: 0 .3rem;
  outline: none;
  cursor: pointer;
}
.pkd-cc-select:focus { border-color: var(--g); }

/* Gender radio */
.pkd-gender-row {
  display: flex;
  align-items: center;
  gap: .6rem;
  height: 2.1rem;
}
.pkd-gender-lbl {
  display: flex;
  align-items: center;
  gap: .25rem;
  font-family: var(--font-h);
  font-size: .82rem;
  color: var(--ink);
  cursor: pointer;
}
.pkd-gender-lbl input { accent-color: var(--g); }

/* Grid rows */
.pkd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: .35rem; }
.pkd-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .35rem; }
.pkd-stack { display: flex; flex-direction: column; gap: .25rem; }
.pkd-section { margin-bottom: .55rem; }

/* Divider */
.pkd-divider {
  border: none;
  border-top: 1px dashed rgba(0,171,57,.25);
  margin: .45rem 0;
}

/* CTA button */
.pkd-btn {
  width: 100%;
  padding: .55rem .75rem;
  border-radius: 9px;
  background: var(--gd);
  color: #fff;
  border: 2px solid var(--gd);
  font-family: var(--font-h);
  font-size: .88rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .4rem;
  transition: background .15s, transform .1s;
  letter-spacing: .02em;
  margin-top: .3rem;
}
.pkd-btn:hover:not(:disabled) {
  background: var(--gm);
  transform: translateY(-1px);
}
.pkd-btn:disabled { opacity: .55; cursor: not-allowed; }
.pkd-btn.secondary {
  background: transparent;
  color: var(--gm);
  border-color: rgba(0,171,57,.5);
  font-weight: 400;
  margin-top: .2rem;
}
.pkd-btn.secondary:hover:not(:disabled) {
  background: rgba(0,171,57,.08);
}

/* OTP boxes */
.pkd-otp-row {
  display: flex;
  gap: .4rem;
  justify-content: center;
  margin: .5rem 0;
}
.pkd-otp-box {
  width: 2.4rem;
  height: 2.9rem;
  text-align: center;
  border: 2px solid rgba(0,171,57,.45);
  border-radius: 8px;
  font-size: 1.4rem;
  font-family: var(--font-sk);
  color: var(--gd);
  background: #fff;
  outline: none;
  transition: border-color .15s;
}
.pkd-otp-box:focus { border-color: var(--g); box-shadow: 0 0 0 3px rgba(0,171,57,.12); }

/* Status chips */
.pkd-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: .35rem;
}
.pkd-chip {
  font-family: var(--font-h);
  font-size: .62rem;
  padding: 1px 7px;
  border-radius: 99px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.pkd-chip.ok  { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
.pkd-chip.err { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.pkd-chip.warn{ background: #fef9c3; color: #713f12; border: 1px solid #fde047; }

/* Error banner */
.pkd-error {
  background: #fee2e2;
  border: 1.5px solid #fca5a5;
  color: #991b1b;
  border-radius: 7px;
  padding: .4rem .6rem;
  font-size: .78rem;
  margin-top: .35rem;
  display: flex;
  align-items: center;
  gap: .35rem;
}

/* Card footer */
.pkd-footer {
  background: rgba(0,171,57,.06);
  border-top: 1px dashed rgba(0,171,57,.25);
  padding: .35rem .85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pkd-footer-email {
  font-family: var(--font-h);
  font-size: .68rem;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}
.pkd-footer-status {
  font-family: var(--font-sk);
  font-size: .68rem;
  color: rgba(0,171,57,.6);
}

/* Email step illustration */
.pkd-illus {
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Spinner */
@keyframes pkd-spin { to { transform: rotate(360deg); } }
.pkd-spin { animation: pkd-spin .9s linear infinite; display: inline-block; }

/* Done circle */
.pkd-done-circle {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: #d1fae5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: .5rem auto;
}

/* Upload progress bar */
.pkd-progress-bar {
  height: 3px;
  background: rgba(0,171,57,.15);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: .45rem;
}
.pkd-progress-bar-fill {
  height: 100%;
  background: var(--g);
  border-radius: 3px;
  transition: width .3s ease;
}

/* Mismatch alert */
.pkd-mismatch {
  background: #fef9c3;
  border: 1.5px solid rgba(234,179,8,.5);
  border-radius: 7px;
  padding: .4rem .6rem;
  font-size: .73rem;
  color: #713f12;
  margin-top: .35rem;
}

/* Email input row */
.pkd-email-row {
  display: flex;
  gap: .35rem;
  align-items: flex-end;
}
.pkd-email-row .pkd-input {
  flex: 1;
}

/* ── 3D hover tilt on the whole card ── */
.pkd-card {
  transition: transform .4s cubic-bezier(.23,1,.32,1), box-shadow .4s;
  transform-style: preserve-3d;
}
.pkd-card:hover {
  transform: perspective(900px) rotateY(-4deg) rotateX(2deg) translateY(-4px);
  box-shadow:
    10px 20px 48px rgba(0,0,0,.22),
    0 2px 0 rgba(0,0,0,.18),
    inset 0 1px 0 rgba(255,255,255,.7);
}

/* ── Done phase: tabbed artistic card ── */
.pkd-done-body {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 560px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,171,57,.3) transparent;
}

/* Avatar zone */
.pkd-done-avatar-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: .75rem .85rem .25rem;
  background: linear-gradient(180deg, rgba(26,58,46,.05) 0%, transparent 100%);
}
.pkd-done-avatar-ring {
  position: relative;
  width: 78px; height: 78px;
  border-radius: 50%;
  padding: 3px;
  background: conic-gradient(var(--g) 0deg 200deg, var(--gm) 200deg 360deg);
  box-shadow: 0 0 0 3px rgba(0,171,57,.15), 0 6px 22px rgba(0,0,0,.18);
  flex-shrink: 0;
}
.pkd-done-avatar-img,
.pkd-done-avatar-initials {
  width: 100%; height: 100%;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.pkd-done-avatar-img img { width:100%;height:100%;object-fit:cover;border-radius:50% }
.pkd-done-avatar-initials {
  background: linear-gradient(135deg, var(--gd), var(--gm));
  font-family: var(--font-sk);
  font-size: 1.8rem; color: #fff; letter-spacing: .06em;
}
.pkd-done-name {
  font-family: var(--font-di);
  font-size: 1.08rem; color: var(--ink);
  margin: .35rem 0 .08rem; text-align: center; line-height: 1.2;
}
.pkd-done-completed-badge {
  font-family: var(--font-sk);
  font-size: .6rem; letter-spacing: .12em; color: #fff;
  background: linear-gradient(90deg, var(--gd), var(--g));
  border-radius: 99px; padding: .12rem .65rem; margin-top: .08rem;
}

/* Tabs */
.pkd-done-tabs {
  display: flex;
  margin: .4rem .6rem 0;
  border-bottom: 2px solid rgba(0,171,57,.12);
}
.pkd-done-tab {
  flex: 1; padding: .38rem .2rem .35rem;
  background: none; border: none;
  border-bottom: 2.5px solid transparent; margin-bottom: -2px;
  font-family: var(--font-sk); font-size: .62rem; letter-spacing: .05em; color: #bbb;
  cursor: pointer; transition: color .18s, border-color .18s;
  display: flex; align-items: center; justify-content: center; gap: .2rem;
  white-space: nowrap;
}
.pkd-done-tab.active   { color: var(--gd); border-bottom-color: var(--g); }
.pkd-done-tab:hover:not(.active) { color: var(--gm); }

/* Panels */
.pkd-done-panels   { padding: .45rem .7rem .2rem; }
.pkd-done-panel    { display: flex; flex-direction: column; gap: .42rem; }
.pkd-done-panel.hidden { display: none; }

/* Panel header */
.pkd-done-panel-hdr {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: .02rem;
}
.pkd-done-panel-title {
  display: flex; align-items: center; gap: .2rem;
  font-family: var(--font-sk); font-size: .58rem; letter-spacing: .1em;
  color: var(--gd); text-transform: uppercase; opacity: .65;
}
.pkd-done-panel-edit {
  font-family: var(--font-h); font-size: .64rem; color: var(--gm);
  background: rgba(0,171,57,.06); border: 1.5px solid rgba(0,171,57,.22);
  border-radius: 7px; padding: .14rem .48rem; cursor: pointer;
  transition: all .15s; display: flex; align-items: center; gap: .2rem;
}
.pkd-done-panel-edit:hover { background: var(--gl); border-color: var(--g); transform: scale(1.04); }

/* Identity hero block */
.pkd-done-id-hero {
  display: flex; align-items: center; justify-content: space-between; gap: .5rem;
  background: linear-gradient(135deg, rgba(26,58,46,.06) 0%, rgba(0,171,57,.03) 100%);
  border-radius: 12px; border: 1px solid rgba(0,171,57,.12); padding: .55rem .7rem;
}
.pkd-done-id-left  { display: flex; flex-direction: column; gap: .2rem; flex: 1; min-width: 0; }
.pkd-done-doc-badge {
  display: inline-flex; align-items: center; gap: .2rem;
  background: var(--gd); color: #fff;
  font-family: var(--font-sk); font-size: .58rem; letter-spacing: .1em;
  padding: .12rem .45rem; border-radius: 5px; width: fit-content;
}
.pkd-done-doc-num {
  font-family: 'Courier New', monospace; font-size: .98rem; font-weight: 700;
  color: var(--ink); letter-spacing: .07em; overflow: hidden; text-overflow: ellipsis;
}
.pkd-done-dob-small {
  font-family: var(--font-h); font-size: .67rem; color: #888;
  display: flex; align-items: center; gap: .22rem;
}

/* Age circle */
.pkd-done-age-circle {
  width: 50px; height: 50px; flex-shrink: 0; border-radius: 50%;
  background: conic-gradient(var(--g) 0deg 260deg, rgba(0,171,57,.12) 260deg 360deg);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 3px 10px rgba(0,171,57,.18), inset 0 0 0 4px var(--parchment);
}
.pkd-done-age-num { font-family: var(--font-sk); font-size: .9rem; font-weight:700; color: var(--gd); line-height:1; }
.pkd-done-age-lbl { font-family: var(--font-h); font-size: .46rem; color: #888; line-height:1; margin-top:.06rem; }

/* Expiry row */
.pkd-done-expiry-row {
  display: flex; align-items: center; gap: .35rem;
  font-family: var(--font-h); font-size: .72rem; color: var(--ink);
  background: rgba(255,255,255,.8); border: 1px solid rgba(0,171,57,.08);
  border-radius: 9px; padding: .28rem .6rem;
}
.pkd-done-expiry-pill {
  display: inline-flex; align-items: center; gap: .18rem;
  font-family: var(--font-h); font-size: .59rem; font-weight:700;
  padding: .1rem .4rem; border-radius: 99px; margin-left: auto;
}
.pkd-done-expiry-pill.valid   { background:#d1fae5; color:#065f46; }
.pkd-done-expiry-pill.warn    { background:#fef9c3; color:#713f12; }
.pkd-done-expiry-pill.expired { background:#fee2e2; color:#991b1b; }

/* Gender + nationality badges */
.pkd-done-badges-row { display:flex; flex-wrap:wrap; gap:.38rem; }
.pkd-done-gender-badge {
  display:inline-flex; align-items:center; gap:.28rem;
  background: rgba(0,171,57,.07); border: 1.5px solid rgba(0,171,57,.2);
  border-radius: 9px; padding: .22rem .52rem;
  font-family: var(--font-h); font-size: .72rem; color: var(--gd);
}
.pkd-done-gender-icon {
  display:flex; align-items:center; justify-content:center;
  width:16px; height:16px; flex-shrink:0;
}
.pkd-done-gender-icon svg { display:block; }
.pkd-done-nat-badge {
  display:inline-flex; align-items:center; gap:.28rem;
  background:#f0f9ff; border:1.5px solid #bae6fd;
  border-radius:9px; padding:.22rem .52rem;
  font-family:var(--font-h); font-size:.72rem; color:#0369a1;
}

/* Contact rows */
.pkd-done-contact-row {
  display:flex; align-items:center; gap:.48rem;
  background:rgba(255,255,255,.85); border:1px solid rgba(0,171,57,.09);
  border-radius:11px; padding:.42rem .62rem; transition:box-shadow .15s;
}
.pkd-done-contact-row:hover { box-shadow:0 2px 8px rgba(0,171,57,.08); }
.pkd-done-contact-icon {
  flex-shrink:0; width:22px; height:22px;
  display:flex; align-items:center; justify-content:center;
  color: var(--gm);
}
.pkd-done-contact-icon svg { display:block; }
.pkd-done-contact-info { flex:1; min-width:0; }
.pkd-done-contact-label {
  font-family:var(--font-h); font-size:.54rem; color:#999;
  text-transform:uppercase; letter-spacing:.06em;
}
.pkd-done-contact-val {
  font-family:var(--font-h); font-size:.78rem; color:var(--ink); font-weight:600;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.pkd-done-contact-val.muted { color:#bbb; font-weight:400; }

/* Address block */
.pkd-done-addr-block {
  background: linear-gradient(145deg,#fff 0%,#f5fdf7 100%);
  border:1px solid rgba(0,171,57,.12); border-radius:12px;
  padding:.52rem .7rem; display:flex; flex-direction:column; gap:.26rem;
}
.pkd-done-addr-line {
  display:flex; align-items:center; gap:.38rem;
  font-family:var(--font-h); font-size:.76rem; color:var(--ink);
}
.pkd-done-addr-line.muted { color:#bbb; font-style:italic; }
.pkd-done-addr-icon {
  flex-shrink:0; width:16px; height:16px;
  display:flex; align-items:center; justify-content:center;
  opacity:.65; color: var(--gm);
}
.pkd-done-addr-icon svg { display:block; }

/* Document view button(s) */
.pkd-done-doc-btns {
  display:flex; gap:.4rem; margin:.22rem .7rem .45rem;
}
.pkd-done-doc-view-btn {
  flex:1; display:flex; align-items:center; justify-content:center; gap:.4rem;
  padding:.48rem .8rem;
  background: linear-gradient(135deg, var(--gd) 0%, var(--gm) 100%);
  color:#fff; border:none; border-radius:11px;
  font-family:var(--font-sk); font-size:.68rem; letter-spacing:.07em;
  cursor:pointer; transition:transform .15s, box-shadow .15s;
  box-shadow:0 3px 10px rgba(0,0,0,.12);
}
.pkd-done-doc-view-btn:hover { transform:translateY(-2px); box-shadow:0 5px 16px rgba(0,0,0,.18); }

/* Flag image */
.pkd-flag-img {
  width: 20px; height: 14px;
  object-fit: cover; border-radius: 2px;
  border: 1px solid rgba(0,0,0,.08);
  flex-shrink: 0; vertical-align: middle;
}

/* Google auth badge on avatar */
.pkd-done-google-badge {
  position: absolute;
  bottom: 0; right: 0;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px rgba(0,171,57,.3), 0 0 10px rgba(0,171,57,.5);
  display: flex; align-items: center; justify-content: center;
  font-size: .75rem;
  animation: pkd-glow-pulse 2.5s ease-in-out infinite;
}
@keyframes pkd-glow-pulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(0,171,57,.3), 0 0 8px rgba(0,171,57,.4); }
  50%       { box-shadow: 0 0 0 3px rgba(0,171,57,.5), 0 0 16px rgba(0,171,57,.7); }
}

/* Image viewer modal */
.pkd-img-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9500;
  background: rgba(0,0,0,.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: pkd-fade-in .18s ease;
}
@keyframes pkd-fade-in { from { opacity:0 } to { opacity:1 } }
.pkd-img-modal-inner {
  position: relative;
  max-width: min(680px, 95vw);
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.pkd-img-modal-title {
  color: #fff;
  font-family: var(--font-sk, 'Cabin Sketch', cursive);
  font-size: .9rem;
  letter-spacing: .1em;
  text-align: center;
}
.pkd-img-modal-img {
  max-width: 100%;
  max-height: calc(90dvh - 80px);
  border-radius: 10px;
  object-fit: contain;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
  display: block;
}
.pkd-img-modal-close {
  position: absolute;
  top: -14px;
  right: -14px;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: #fff;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
  transition: transform .12s;
}
.pkd-img-modal-close:hover { transform: scale(1.1); }
`;

function ensurePkdStyles(): void {
  if (document.getElementById(PKD_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = PKD_STYLE_ID;
  s.textContent = PKD_CSS;
  document.head.appendChild(s);
}

// ── Static SVG icons ──────────────────────────────────────────────────────────

function parseSvg(str: string): SVGElement {
  return new DOMParser()
    .parseFromString(str, 'image/svg+xml')
    .documentElement as unknown as SVGElement;
}

/** Wrap a parsed SVG in an inline-flex <span> for use inside text content. */
function iconSpan(svgStr: string, extraCss = ''): HTMLSpanElement {
  const s = document.createElement('span');
  s.style.cssText = `display:inline-flex;align-items:center;flex-shrink:0${extraCss ? ';' + extraCss : ''}`;
  s.appendChild(parseSvg(svgStr));
  return s;
}

const I_UPLOAD =
  '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2d5a3d" stroke-width="1.8" stroke-linecap="round">' +
  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
  '<polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

const I_CHECK =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round">' +
  '<polyline points="20 6 9 17 4 12"/></svg>';

const I_CHECK_SM =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
  '<polyline points="20 6 9 17 4 12"/></svg>';

const I_X_SM =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
  '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

const I_WARN_SM =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
  '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
  '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

const I_MAIL =
  '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2d5a3d" stroke-width="1.5" stroke-linecap="round">' +
  '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
  '<path d="M2 7l10 7 10-7"/></svg>';

const I_PERSON_LG =
  '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#1a3a2e" stroke-width="1.2" stroke-linecap="round" opacity=".3">' +
  '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

const I_SPIN =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="pkd-spin">' +
  '<circle cx="12" cy="12" r="10" stroke-opacity=".2"/>' +
  '<path d="M12 2a10 10 0 0 1 10 10"/></svg>';

// ── Done-card icons (small, currentColor — inherits from parent CSS color) ──

const I_ID_CARD =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="2" y="5" width="20" height="14" rx="2"/>' +
  '<circle cx="8" cy="12" r="2.2"/>' +
  '<path d="M14 9h4M14 13h3"/></svg>';

const I_PHONE_TAB =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.97-.97a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

const I_HOME_TAB =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' +
  '<polyline points="9 22 9 12 15 12 15 22"/></svg>';

const I_PENCIL =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
  '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

const I_CALENDAR =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="3" y="4" width="18" height="18" rx="2"/>' +
  '<line x1="16" y1="2" x2="16" y2="6"/>' +
  '<line x1="8" y1="2" x2="8" y2="6"/>' +
  '<line x1="3" y1="10" x2="21" y2="10"/></svg>';

const I_CLOCK =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="12" cy="12" r="10"/>' +
  '<polyline points="12 6 12 12 16 14"/></svg>';

const I_MAIL_SM =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
  '<path d="M2 7l10 7 10-7"/></svg>';

const I_PHONE_SM =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.97-.97a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

const I_MAP_PIN =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>' +
  '<circle cx="12" cy="10" r="3"/></svg>';

const I_GLOBE =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="12" cy="12" r="10"/>' +
  '<line x1="2" y1="12" x2="22" y2="12"/>' +
  '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

const I_FILE_SM =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
  '<polyline points="14 2 14 8 20 8"/>' +
  '<line x1="16" y1="13" x2="8" y2="13"/>' +
  '<line x1="16" y1="17" x2="8" y2="17"/></svg>';

const I_DOC_BADGE =
  '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="2" y="5" width="20" height="14" rx="2"/>' +
  '<line x1="7" y1="11" x2="7" y2="11"/>' +
  '<line x1="12" y1="10" x2="17" y2="10"/>' +
  '<line x1="12" y1="14" x2="17" y2="14"/></svg>';

const I_MALE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="10" cy="14" r="5"/>' +
  '<line x1="19" y1="5" x2="14.14" y2="9.86"/>' +
  '<polyline points="15 5 19 5 19 9"/></svg>';

const I_FEMALE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="12" cy="8" r="5"/>' +
  '<line x1="12" y1="13" x2="12" y2="21"/>' +
  '<line x1="9" y1="18" x2="15" y2="18"/></svg>';

const I_GENDER_OTHER =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="12" cy="11" r="5"/>' +
  '<line x1="12" y1="16" x2="12" y2="21"/>' +
  '<line x1="9" y1="19" x2="15" y2="19"/>' +
  '<line x1="19" y1="3" x2="15.14" y2="6.86"/>' +
  '<polyline points="15 3 19 3 19 7"/></svg>';

// ── Country codes ─────────────────────────────────────────────────────────────

const COUNTRY_CODES: Array<{ code: string; dial: string; flag: string }> = [
  { code: 'ES', dial: '+34', flag: '🇪🇸' },
  { code: 'PT', dial: '+351', flag: '🇵🇹' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧' },
  { code: 'NL', dial: '+31',  flag: '🇳🇱' },
  { code: 'BE', dial: '+32',  flag: '🇧🇪' },
  { code: 'CH', dial: '+41',  flag: '🇨🇭' },
  { code: 'AT', dial: '+43',  flag: '🇦🇹' },
  { code: 'PL', dial: '+48',  flag: '🇵🇱' },
  { code: 'US', dial: '+1',   flag: '🇺🇸' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺' },
  { code: 'BR', dial: '+55',  flag: '🇧🇷' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽' },
  { code: 'AR', dial: '+54',  flag: '🇦🇷' },
  { code: 'KR', dial: '+82',  flag: '🇰🇷' },
  { code: 'JP', dial: '+81',  flag: '🇯🇵' },
];

const COUNTRIES: Array<{ code: string; code2: string; name: string }> = [
  { code: 'ESP', code2: 'ES', name: 'España' },
  { code: 'PRT', code2: 'PT', name: 'Portugal' },
  { code: 'FRA', code2: 'FR', name: 'Francia' },
  { code: 'DEU', code2: 'DE', name: 'Alemania' },
  { code: 'ITA', code2: 'IT', name: 'Italia' },
  { code: 'GBR', code2: 'GB', name: 'Reino Unido' },
  { code: 'NLD', code2: 'NL', name: 'Países Bajos' },
  { code: 'BEL', code2: 'BE', name: 'Bélgica' },
  { code: 'CHE', code2: 'CH', name: 'Suiza' },
  { code: 'AUT', code2: 'AT', name: 'Austria' },
  { code: 'POL', code2: 'PL', name: 'Polonia' },
  { code: 'USA', code2: 'US', name: 'Estados Unidos' },
  { code: 'CAN', code2: 'CA', name: 'Canadá' },
  { code: 'AUS', code2: 'AU', name: 'Australia' },
  { code: 'BRA', code2: 'BR', name: 'Brasil' },
  { code: 'MEX', code2: 'MX', name: 'México' },
  { code: 'ARG', code2: 'AR', name: 'Argentina' },
  { code: 'KOR', code2: 'KR', name: 'Corea del Sur' },
  { code: 'JPN', code2: 'JP', name: 'Japón' },
];

/** Return the flagsapi.com URL for a 2-letter country code. */
function flagImgUrl(alpha2: string): string {
  return `https://flagsapi.com/${alpha2.toUpperCase()}/flat/24.png`;
}

/** Resolve a 3-letter (alpha-3) or 2-letter (alpha-2) code → alpha-2. */
function toAlpha2(code: string): string {
  if (!code) return '';
  const upper = code.toUpperCase();
  if (upper.length === 2) return upper;
  const entry = COUNTRIES.find(c => c.code === upper);
  return entry?.code2 ?? '';
}

/** Build a small flag <img> element from any country code. Returns null if code unknown. */
function flagImg(code: string): HTMLImageElement | null {
  const alpha2 = toAlpha2(code);
  if (!alpha2) return null;
  const img = document.createElement('img');
  img.src = flagImgUrl(alpha2);
  img.alt = alpha2;
  img.className = 'pkd-flag-img';
  img.width = 20;
  img.height = 14;
  return img;
}

/** Get dial flag from COUNTRY_CODES by 2-letter code. */
function _dialFlag(cc: string): string {
  return COUNTRY_CODES.find(c => c.code === cc.toUpperCase())?.flag ?? '';
}
// Kept for future use (phone-prefix display)
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// ── DOM helpers ───────────────────────────────────────────────────────────────

type TagName = keyof HTMLElementTagNameMap;

function el<K extends TagName>(
  tag: K,
  cls = '',
  text?: string
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function attr(n: Element, attrs: Record<string, string>): void {
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
}

function clear(n: Element): void {
  while (n.firstChild) n.firstChild.remove();
}

// ── PilgrimCardIsland ─────────────────────────────────────────────────────────

export class PilgrimCardIsland {
  private readonly container: HTMLElement;
  private readonly opts: PilgrimCardOptions;
  private readonly state: CardState;
  private root: HTMLElement | null = null;

  // Live input refs (for auto-fill)
  private otpBoxes: HTMLInputElement[] = [];
  private emailInputRef: HTMLInputElement | null = null;

  // Edit modal overlay (fullscreen popup)
  private editModalOverlay: HTMLElement | null = null;

  constructor(container: HTMLElement, opts: PilgrimCardOptions) {
    this.container = container;
    this.opts = opts;
    ensurePkdStyles();

    const stored = getPilgrimData(opts.pilgrimIndex);
    this.state = {
      phase: opts.loggedInUserId ? 'done' : 'email_opt',
      email: opts.loggedInEmail ?? stored['f-email'] ?? '',
      userId: opts.loggedInUserId ?? null,
      docType: (stored['f-doc-type'] as DocType) || 'dni',
      uploadStep: 'front',
      frontImageUrl: null,
      backImageUrl: null,
      frontOcrFields: null,
      backOcrFields: null,
      avatarDataUrl: null,
      uploading: false,
      frontBackValid: null,
      mismatches: [],
      errorMsg: null,
      clerkSignIn: null,
      clerkMeta: null,
    };
    // Load Clerk avatar + metadata (async, non-blocking)
    this.loadClerkMeta();
  }

  /** Read window.Clerk.user for avatar URL and all metadata, then refresh. */
  private loadClerkMeta(): void {
    try {
      const user = window.Clerk?.user;
      if (!user) return;

      this.state.clerkMeta = this.createClerkMetaSnapshot(user);

      if (this.opts.loggedInUserId) {
        this.applyLoggedInUserPrefill(user);
      }

      if (this.state.phase === 'done' && this.root) this.renderPhase();
    } catch {
      // ignore — Clerk may not be ready yet
    }
  }

  private createClerkMetaSnapshot(user: {
    imageUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    publicMetadata?: unknown;
    unsafeMetadata?: unknown;
    externalAccounts?: Array<{ provider?: string }>;
  }): ClerkMetaSnapshot {
    const hasGoogleAuth = user.externalAccounts?.some(a => a.provider === 'google') ?? false;
    return {
      imageUrl: user.imageUrl ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      publicMetadata: (user.publicMetadata as Record<string, unknown>) ?? {},
      unsafeMetadata: (user.unsafeMetadata as Record<string, unknown>) ?? {},
      hasGoogleAuth,
    };
  }

  private applyLoggedInUserPrefill(user: {
    firstName?: string | null;
    lastName?: string | null;
    unsafeMetadata?: unknown;
  }): void {
    const existing = getPilgrimData(this.opts.pilgrimIndex);
    const patch: Partial<Record<string, string>> = {};
    const unsafe = (user.unsafeMetadata ?? {}) as Record<string, unknown>;

    this.fillBaseClerkFields(existing, patch, user);
    this.fillUnsafeMetadataFields(existing, patch, unsafe);

    if (Object.keys(patch).length === 0) return;

    setPilgrimData(this.opts.pilgrimIndex, patch as Parameters<typeof setPilgrimData>[1]);
    if (patch['f-email']) this.state.email = patch['f-email'];
  }

  private fillBaseClerkFields(
    existing: ReturnType<typeof getPilgrimData>,
    patch: Partial<Record<string, string>>,
    user: { firstName?: string | null; lastName?: string | null }
  ): void {
    if (!existing['f-first'] && user.firstName) patch['f-first'] = user.firstName;
    if (!existing['f-last'] && user.lastName) patch['f-last'] = user.lastName;
    if (!existing['f-email'] && this.opts.loggedInEmail) patch['f-email'] = this.opts.loggedInEmail;
  }

  private fillUnsafeMetadataFields(
    existing: ReturnType<typeof getPilgrimData>,
    patch: Partial<Record<string, string>>,
    unsafe: Record<string, unknown>
  ): void {
    const safeKeys = [
      'f-last2', 'f-dob', 'f-doc-num', 'f-doc-type', 'f-expiry', 'f-gender',
      'f-nat', 'f-nat-code', 'f-phone', 'f-phone-cc', 'f-addr', 'f-addr2',
      'f-zip', 'f-city', 'f-country', 'f-country-code',
    ] as const;

    for (const key of safeKeys) {
      if (!existing[key] && typeof unsafe[key] === 'string') {
        patch[key] = unsafe[key];
      }
    }
  }

  mount(): void {
    this.root = this.buildShell();
    clear(this.container);
    this.container.appendChild(this.root);
    this.renderPhase();

    // If Clerk wasn't ready at constructor time, retry after a short delay
    // (Clerk SDK loads async — user object may not be available immediately)
    if (this.opts.loggedInUserId && !this.state.clerkMeta) {
      const retry = () => {
        this.loadClerkMeta();
        if (!this.state.clerkMeta) {
          setTimeout(retry, 600);
        }
      };
      setTimeout(retry, 300);
    }
  }

  destroy(): void {
    if (this.editModalOverlay) {
      this.editModalOverlay.remove();
      this.editModalOverlay = null;
    }
    clear(this.container);
    this.root = null;
  }

  // ── Shell (permanent outer structure) ─────────────────────────────────────

  private buildShell(): HTMLElement {
    const card = el('div', 'pkd-card');
    const inner = el('div', 'pkd-inner');
    card.appendChild(inner);
    return card;
  }

  private getInner(): HTMLElement {
    return this.root!.firstElementChild as HTMLElement;
  }

  // ── Phase renderer ─────────────────────────────────────────────────────────

  private renderPhase(): void {
    if (!this.root) return;
    const inner = this.getInner();
    clear(inner);
    inner.appendChild(this.buildHeader());

    switch (this.state.phase) {
      case 'email_opt':
        inner.appendChild(this.buildArtFrame('email'));
        inner.appendChild(this.buildNameRow());
        inner.appendChild(this.buildEmailBody());
        break;
      case 'otp':
        inner.appendChild(this.buildArtFrame('otp'));
        inner.appendChild(this.buildNameRow());
        inner.appendChild(this.buildOtpBody());
        break;
      case 'upload':
        inner.appendChild(this.buildArtFrame('upload'));
        inner.appendChild(this.buildNameRow());
        inner.appendChild(this.buildDocTypeRow());
        inner.appendChild(this.buildUploadBody());
        break;
      case 'form':
        inner.appendChild(this.buildArtFrame('avatar'));
        inner.appendChild(this.buildNameRow());
        inner.appendChild(this.buildFormBody());
        break;
      case 'done':
        // Done uses its own full-card layout (avatar + all data); no artFrame/nameRow
        inner.appendChild(this.buildDoneCard());
        break;
    }
    inner.appendChild(this.buildFooter());
  }

  // ── HEADER ─────────────────────────────────────────────────────────────────

  private buildHeader(): HTMLElement {
    const h = el('div', 'pkd-header');
    const badge = el('span', 'pkd-badge', this.opts.pilgrimLabel.toUpperCase());
    h.appendChild(badge);

    // Only show email in header during mid-wizard phases; done card shows it in Contacto tab
    if (this.state.email && this.state.phase !== 'email_opt' && this.state.phase !== 'done') {
      const emailEl = el('span', 'pkd-header-email', this.state.email);
      h.appendChild(emailEl);
    } else {
      h.appendChild(el('span', 'pkd-header-spacer'));
    }

    // Step indicator
    const stepLabels: Record<Phase, string> = {
      email_opt: '1/4',
      otp:       '2/4',
      upload:    (this.state.phase === 'upload' && this.state.uploadStep === 'back') ? '3b/4' : '3/4',
      form:      '4/4',
      done:      '✓',
    };
    h.appendChild(el('span', 'pkd-header-step', stepLabels[this.state.phase]));

    if ((this.state.phase === 'form' || this.state.phase === 'done') && !this.opts.loggedInUserId) {
      const cb = el('button', 'pkd-change-btn', 'Editar email');
      cb.addEventListener('click', () => {
        this.state.phase = 'email_opt';
        this.state.errorMsg = null;
        this.renderPhase();
      });
      h.appendChild(cb);
    }

    return h;
  }

  // ── ART FRAME ──────────────────────────────────────────────────────────────

  private buildArtFrame(mode: 'email' | 'otp' | 'upload' | 'avatar' | 'done'): HTMLElement {
    const wrap = el('div', 'pkd-art');
    const frame = el('div', 'pkd-art-frame');

    switch (mode) {
      case 'email':
        this.renderEmailArt(frame);
        break;
      case 'otp':
        this.renderOtpArt(frame);
        break;
      case 'upload':
        this.renderUploadArt(frame);
        break;
      case 'avatar':
        this.renderAvatarArt(frame);
        break;
      case 'done':
        this.renderDoneArt(frame);
        break;
    }

    wrap.appendChild(frame);
    return wrap;
  }

  private renderEmailArt(frame: HTMLElement): void {
    const illus = el('div', 'pkd-illus');
    illus.appendChild(parseSvg(I_PERSON_LG));
    frame.appendChild(illus);
  }

  private renderOtpArt(frame: HTMLElement): void {
    const illus = el('div', 'pkd-illus');
    illus.appendChild(parseSvg(I_MAIL));
    frame.appendChild(illus);
  }

  private renderUploadArt(frame: HTMLElement): void {
    const side = this.state.uploadStep;
    const imageUrl = side === 'front' ? this.state.frontImageUrl : this.state.backImageUrl;

    if (this.state.uploading) {
      const illus = el('div', 'pkd-illus');
      illus.appendChild(parseSvg(I_SPIN));
      frame.appendChild(illus);
    } else if (imageUrl) {
      const img = el('img', 'pkd-drop-thumb');
      attr(img, {
        src: imageUrl,
        alt: side === 'front' ? 'Anverso del documento' : 'Reverso del documento',
      });
      frame.appendChild(img);
      this.attachDropHandlers(frame, side);
    } else {
      this.renderUploadZone(frame, side);
      this.attachDropHandlers(frame, side);
    }

    this.appendUploadFileInput(frame, side);
  }

  private renderUploadZone(frame: HTMLElement, side: 'front' | 'back'): void {
    const zone = el('div', 'pkd-drop-zone');
    zone.appendChild(parseSvg(I_UPLOAD));
    zone.appendChild(el('div', 'pkd-drop-label', side === 'front' ? 'FRENTE' : 'DORSO'));
    zone.appendChild(el('div', 'pkd-drop-hint', 'Arrastra o haz clic'));
    frame.appendChild(zone);
  }

  private appendUploadFileInput(frame: HTMLElement, side: 'front' | 'back'): void {
    const fi = el('input', 'pkd-drop-file');
    attr(fi, {
      type: 'file',
      accept: 'image/jpeg,image/png,image/webp,image/heic',
      'aria-label': side === 'front' ? 'Seleccionar imagen del anverso' : 'Seleccionar imagen del reverso',
    });
    fi.addEventListener('change', () => {
      const f = fi.files?.[0];
      if (f) void this.handleFile(f, side);
    });
    frame.appendChild(fi);
  }

  private renderAvatarArt(frame: HTMLElement): void {
    if (this.state.avatarDataUrl) {
      const img = el('img', 'pkd-art-img');
      img.src = this.state.avatarDataUrl;
      img.alt = 'Foto del peregrino';
      frame.appendChild(img);
      return;
    }

    const initials = this.getInitials();
    frame.appendChild(el('span', 'pkd-art-initials', initials));
  }

  private renderDoneArt(frame: HTMLElement): void {
    if (!this.state.avatarDataUrl) {
      const done = el('div', 'pkd-done-circle');
      done.appendChild(parseSvg(I_CHECK));
      frame.appendChild(done);
      return;
    }

    const img = el('img', 'pkd-art-img');
    img.src = this.state.avatarDataUrl;
    img.alt = 'Foto del peregrino';
    frame.appendChild(img);

    const overlay = el('div');
    overlay.style.cssText = 'position:absolute;bottom:8px;right:8px;background:rgba(22,163,74,.9);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center';
    overlay.appendChild(parseSvg(I_CHECK_SM));
    frame.appendChild(overlay);
  }

  private attachDropHandlers(frame: HTMLElement, side: 'front' | 'back'): void {
    frame.addEventListener('dragover', (e) => {
      e.preventDefault();
      frame.querySelector('.pkd-drop-zone')?.classList.add('drag-over');
    });
    frame.addEventListener('dragleave', () => {
      frame.querySelector('.pkd-drop-zone')?.classList.remove('drag-over');
    });
    frame.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      frame.querySelector('.pkd-drop-zone')?.classList.remove('drag-over');
      const f = e.dataTransfer?.files?.[0];
      if (f) void this.handleFile(f, side);
    });
  }

  // ── NAME ROW ───────────────────────────────────────────────────────────────

  private buildNameRow(): HTMLElement {
    const row = el('div', 'pkd-name-row');
    const stored = getPilgrimData(this.opts.pilgrimIndex);
    const first = stored['f-first'];
    const last = stored['f-last'];
    const fullName = [first, last].filter(Boolean).join(' ');

    if (fullName) {
      row.appendChild(el('div', 'pkd-name', fullName));
    } else {
      row.appendChild(el('div', 'pkd-name placeholder', this.opts.pilgrimLabel));
    }
    return row;
  }

  // ── DOC TYPE ROW ───────────────────────────────────────────────────────────

  private buildDocTypeRow(): HTMLElement {
    const row = el('div', 'pkd-doctype-row');
    const types: Array<[DocType, string]> = [['dni','DNI'],['nie','NIE'],['passport','Pasaporte']];
    for (const [val, lbl] of types) {
      const btn = el('button', `pkd-dt-btn${this.state.docType === val ? ' active' : ''}`, lbl);
      btn.addEventListener('click', () => {
        this.state.docType = val;
        setPilgrimData(this.opts.pilgrimIndex, { 'f-doc-type': val });
        updatePilgrimDocState(this.opts.pilgrimIndex, { docType: val });
        this.renderPhase();
      });
      row.appendChild(btn);
    }
    return row;
  }

  // ── FOOTER ─────────────────────────────────────────────────────────────────

  private buildFooter(): HTMLElement {
    const f = el('div', 'pkd-footer');
    // In done phase, email shows in the Contacto tab — footer shows pilgrim label instead
    const footerLeft = this.state.phase === 'done'
      ? this.opts.pilgrimLabel
      : (this.state.email || 'sin email');
    f.appendChild(el('span', 'pkd-footer-email', footerLeft));
    const yearEl = el('span', 'pkd-footer-status');
    yearEl.textContent = this.state.phase === 'done' ? '✓ Completado' : new Date().getFullYear().toString();
    f.appendChild(yearEl);
    return f;
  }

  // ── PROGRESS DOTS ──────────────────────────────────────────────────────────

  private buildProgressDots(currentStep: number, totalSteps: number, label: string): HTMLElement {
    const row = el('div', 'pkd-progress');
    for (let i = 0; i < totalSteps; i++) {
      const dot = el('div', `pkd-prog-dot${this.getProgressDotState(i, currentStep)}`);
      row.appendChild(dot);
    }
    row.appendChild(el('span', 'pkd-prog-label', label));
    return row;
  }

  private getProgressDotState(index: number, currentStep: number): string {
    if (index < currentStep) return ' done';
    if (index === currentStep) return ' active';
    return '';
  }

  private autocompleteForField(key: FieldKey): 'email' | 'tel' | 'off' {
    if (key.includes('email')) return 'email';
    if (key.includes('phone')) return 'tel';
    return 'off';
  }

  // ── EMAIL PHASE ────────────────────────────────────────────────────────────

  private buildEmailBody(): HTMLElement {
    const body = el('div', 'pkd-body');
    body.appendChild(this.buildProgressDots(0, 4, 'Identificación'));

    const section = el('div', 'pkd-section');

    const lbl = el('label', 'pkd-label', 'Email de contacto (opcional)');
    section.appendChild(lbl);

    const emailRow = el('div', 'pkd-email-row');
    const input = el('input', 'pkd-input') as HTMLInputElement;
    attr(input, { type: 'email', placeholder: 'peregrino@email.com', autocomplete: 'email' });
    input.value = this.state.email;
    input.addEventListener('input', () => { this.state.email = input.value.trim(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void this.sendOtp(); });
    this.emailInputRef = input;
    emailRow.appendChild(input);
    section.appendChild(emailRow);
    body.appendChild(section);

    const sendBtn = el('button', 'pkd-btn');
    sendBtn.appendChild(parseSvg(I_MAIL));
    sendBtn.appendChild(document.createTextNode(' Enviar código'));
    sendBtn.addEventListener('click', () => void this.sendOtp());
    body.appendChild(sendBtn);

    const skipBtn = el('button', 'pkd-btn secondary', 'Continuar sin email →');
    skipBtn.addEventListener('click', () => {
      this.state.phase = 'upload';
      this.state.errorMsg = null;
      this.renderPhase();
    });
    body.appendChild(skipBtn);

    if (this.opts.loggedInEmail && this.state.email !== this.opts.loggedInEmail) {
      const hint = el('p');
      hint.style.cssText = 'margin:.5rem 0 0;font-size:.72rem;color:#555;font-family:var(--font-h)';
      hint.appendChild(document.createTextNode('¿Reservas para ti? '));
      const link = el('a');
      link.href = '#';
      link.textContent = `Usar ${this.opts.loggedInEmail}`;
      link.style.cssText = 'color:#00ab39;text-decoration:underline;cursor:pointer';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.state.email = this.opts.loggedInEmail!;
        if (this.emailInputRef) this.emailInputRef.value = this.state.email;
      });
      hint.appendChild(link);
      body.appendChild(hint);
    }

    if (this.state.errorMsg) body.appendChild(this.buildError(this.state.errorMsg));
    return body;
  }

  // ── OTP PHASE ──────────────────────────────────────────────────────────────

  private buildOtpBody(): HTMLElement {
    const body = el('div', 'pkd-body');
    body.appendChild(this.buildProgressDots(1, 4, 'Verificación'));

    const info = el('p');
    info.style.cssText = 'margin:0 0 .5rem;font-size:.78rem;color:#555;text-align:center;font-family:var(--font-h)';
    info.textContent = `Código enviado a ${this.state.email}`;
    body.appendChild(info);

    const row = el('div', 'pkd-otp-row');
    this.otpBoxes = [];
    for (let i = 0; i < 6; i++) {
      const box = el('input', 'pkd-otp-box') as HTMLInputElement;
      attr(box, { type: 'text', maxlength: '1', inputmode: 'numeric', pattern: '[0-9]', autocomplete: 'one-time-code' });
      const idx = i;
      box.addEventListener('input', () => {
        box.value = box.value.replaceAll(/\D/g, '').slice(-1);
        if (box.value && idx < 5) this.otpBoxes[idx + 1]?.focus();
        if (this.otpBoxes.every((b) => b.value)) void this.verifyOtp();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) this.otpBoxes[idx - 1]?.focus();
      });
      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const digits = (e.clipboardData?.getData('text') ?? '').replaceAll(/\D/g, '').slice(0, 6);
        digits.split('').forEach((d, j) => { if (this.otpBoxes[j]) this.otpBoxes[j].value = d; });
        const next = this.otpBoxes.findIndex((b) => !b.value);
        (next >= 0 ? this.otpBoxes[next] : this.otpBoxes[5])?.focus();
        if (digits.length === 6) void this.verifyOtp();
      });
      this.otpBoxes.push(box);
      row.appendChild(box);
    }
    body.appendChild(row);

    const verifyBtn = el('button', 'pkd-btn', 'Verificar →');
    verifyBtn.addEventListener('click', () => void this.verifyOtp());
    body.appendChild(verifyBtn);

    const resend = el('p');
    resend.style.cssText = 'margin:.5rem 0 0;text-align:center;font-size:.72rem;font-family:var(--font-h)';
    const link = el('a');
    link.href = '#'; link.textContent = 'Reenviar código';
    link.style.cssText = 'color:#00ab39;text-decoration:underline;cursor:pointer';
    link.addEventListener('click', (e) => { e.preventDefault(); this.state.phase = 'email_opt'; this.renderPhase(); });
    resend.appendChild(document.createTextNode('¿No llegó? '));
    resend.appendChild(link);
    body.appendChild(resend);

    if (this.state.errorMsg) body.appendChild(this.buildError(this.state.errorMsg));
    requestAnimationFrame(() => this.otpBoxes[0]?.focus());
    return body;
  }

  // ── UPLOAD PHASE ───────────────────────────────────────────────────────────

  private buildUploadBody(): HTMLElement {
    const body = el('div', 'pkd-body');
    const isBack = this.state.uploadStep === 'back';
    const stepN = isBack ? 3 : 2;
    const progressLabel = isBack ? 'Reverso del documento' : 'Anverso del documento';
    const stored = getPilgrimData(this.opts.pilgrimIndex);

    body.appendChild(this.buildProgressDots(stepN, 4, progressLabel));
    body.appendChild(this.buildUploadProgressBar(isBack));
    this.appendUploadSpinnerIfNeeded(body);
    body.appendChild(this.buildUploadStatusChips(stored));
    this.appendUploadMessages(body);
    this.appendUploadActions(body, isBack);

    return body;
  }

  private buildUploadProgressBar(isBack: boolean): HTMLElement {
    const pBar = el('div', 'pkd-progress-bar');
    const pFill = el('div', 'pkd-progress-bar-fill');
    pFill.style.width = isBack ? '75%' : '50%';
    pBar.appendChild(pFill);
    return pBar;
  }

  private appendUploadSpinnerIfNeeded(body: HTMLElement): void {
    if (!this.state.uploading) return;

    const spin = el('div');
    spin.style.cssText = 'text-align:center;padding:.5rem;font-size:.8rem;color:#555;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:.35rem';
    spin.appendChild(parseSvg(I_SPIN));
    spin.appendChild(document.createTextNode('Procesando documento…'));
    body.appendChild(spin);
  }

  private buildUploadStatusChips(stored: ReturnType<typeof getPilgrimData>): HTMLElement {
    const chips = el('div', 'pkd-chips');

    if (this.state.frontImageUrl) {
      const frontChip = this.state.frontOcrFields?.firstName
        ? this.createUploadChip('ok', I_CHECK_SM, ' Frente OK')
        : this.createUploadChip('warn', I_WARN_SM, ' Frente sin OCR');
      chips.appendChild(frontChip);
    }

    if (this.state.backImageUrl && this.state.docType !== 'passport') {
      const backChip = this.state.backOcrFields?.documentNumber
        ? this.createUploadChip('ok', I_CHECK_SM, ' Reverso + MRZ')
        : this.createUploadChip('warn', I_WARN_SM, ' Reverso sin MRZ');
      chips.appendChild(backChip);
    }

    if (stored['f-first']) {
      chips.appendChild(this.createUploadChip('ok', I_CHECK_SM, ' Datos extraídos'));
    }

    return chips;
  }

  private createUploadChip(cls: 'ok' | 'warn', iconSvg: string, text: string): HTMLElement {
    const chip = el('span', `pkd-chip ${cls}`);
    chip.appendChild(parseSvg(iconSvg));
    chip.appendChild(document.createTextNode(text));
    return chip;
  }

  private appendUploadMessages(body: HTMLElement): void {
    if (this.state.errorMsg) body.appendChild(this.buildError(this.state.errorMsg));
    if (this.state.frontBackValid === false && this.state.mismatches.length > 0) {
      body.appendChild(this.buildMismatchAlert());
    }
  }

  private appendUploadActions(body: HTMLElement, isBack: boolean): void {
    const frontDone = !!this.state.frontImageUrl && !this.state.uploading;
    const backDone = !!this.state.backImageUrl && !this.state.uploading && isBack;
    const canManualFill = this.state.uploading || !!this.state.frontImageUrl;

    if (frontDone && !isBack) {
      this.appendFrontUploadActions(body);
    }
    if (backDone) {
      this.appendGoToFormButton(body);
    }
    if (!canManualFill) {
      this.appendManualFillButton(body);
    }
  }

  private appendFrontUploadActions(body: HTMLElement): void {
    if (this.state.docType === 'passport') {
      this.appendGoToFormButton(body);
      return;
    }

    const nextBtn = el('button', 'pkd-btn', '→ Subir Reverso');
    nextBtn.addEventListener('click', () => {
      this.state.uploadStep = 'back';
      this.renderPhase();
    });
    body.appendChild(nextBtn);

    const skipBack = el('button', 'pkd-btn secondary', 'Omitir reverso →');
    skipBack.addEventListener('click', () => {
      this.state.phase = 'form';
      this.renderPhase();
    });
    body.appendChild(skipBack);
  }

  private appendGoToFormButton(body: HTMLElement): void {
    const nextBtn = el('button', 'pkd-btn', '→ Rellenar datos');
    nextBtn.addEventListener('click', () => {
      this.state.phase = 'form';
      this.renderPhase();
    });
    body.appendChild(nextBtn);
  }

  private appendManualFillButton(body: HTMLElement): void {
    const skipAll = el('button', 'pkd-btn secondary', 'Rellenar manualmente →');
    skipAll.addEventListener('click', () => {
      this.state.phase = 'form';
      this.renderPhase();
    });
    body.appendChild(skipAll);
  }

  // ── FORM PHASE ─────────────────────────────────────────────────────────────

  private buildFormBody(): HTMLElement {
    const body = el('div', 'pkd-body');
    body.appendChild(this.buildProgressDots(3, 4, 'Datos del peregrino'));

    const idx = this.opts.pilgrimIndex;
    const stored = getPilgrimData(idx);

    // Helper: create a labeled input
    const field = (key: FieldKey, label: string, type = 'text', placeholder = ''): HTMLElement => {
      const wrap = el('div', 'pkd-stack');
      const lbl = el('label', 'pkd-label', label);
      attr(lbl, { for: `pkd-${idx}-${key}` });
      const inp = el('input', `pkd-input${stored[key] ? ' filled' : ''}`) as HTMLInputElement;
      attr(inp, { id: `pkd-${idx}-${key}`, type, placeholder, autocomplete: this.autocompleteForField(key) });
      inp.value = stored[key] ?? '';
      inp.addEventListener('change', () => this.saveField(key, inp.value.trim()));
      inp.addEventListener('input', () => {
        inp.classList.toggle('filled', inp.value.length > 0);
      });
      wrap.appendChild(lbl);
      wrap.appendChild(inp);
      return wrap;
    };

    // Section 1: Identity
    const sec1 = el('div', 'pkd-section');
    const grid1 = el('div', 'pkd-grid2');
    grid1.appendChild(field('f-first', 'Nombre', 'text', 'Nombre'));
    const docNum = field('f-doc-num', 'Nº Documento', 'text', '12345678A');
    grid1.appendChild(docNum);
    sec1.appendChild(grid1);

    const grid2 = el('div', 'pkd-grid2');
    grid2.appendChild(field('f-last', 'Apellido 1', 'text', 'Primer apellido'));
    grid2.appendChild(field('f-last2', 'Apellido 2', 'text', 'Segundo apellido'));
    sec1.appendChild(grid2);
    body.appendChild(sec1);

    // Section 2: Personal data
    const sec2 = el('div', 'pkd-section');
    const grid3 = el('div', 'pkd-grid2');
    grid3.appendChild(field('f-dob', 'Nacimiento', 'date'));
    grid3.appendChild(field('f-expiry', 'Caducidad', 'date'));
    sec2.appendChild(grid3);

    // Gender + Nationality
    const grid4 = el('div', 'pkd-grid2');

    // Gender radio
    const genderWrap = el('div', 'pkd-stack');
    genderWrap.appendChild(el('span', 'pkd-label', 'Sexo'));
    const gRow = el('div', 'pkd-gender-row');
    for (const [val, lbl] of [['M','Hombre'],['F','Mujer'],['X','Otro']] as [string,string][]) {
      const lbEl = el('label', 'pkd-gender-lbl');
      const rb = el('input') as HTMLInputElement;
      attr(rb, { type: 'radio', name: `pkd-gender-${idx}`, value: val });
      if (stored['f-gender'] === val) rb.checked = true;
      rb.addEventListener('change', () => this.saveField('f-gender', val));
      lbEl.appendChild(rb);
      lbEl.appendChild(document.createTextNode(lbl));
      gRow.appendChild(lbEl);
    }
    genderWrap.appendChild(gRow);
    grid4.appendChild(genderWrap);

    // Nationality
    const natWrap = el('div', 'pkd-stack');
    natWrap.appendChild(el('span', 'pkd-label', 'Nacionalidad'));
    const natSel = el('select', 'pkd-input') as HTMLSelectElement;
    natSel.style.height = '2.1rem';
    for (const c of COUNTRIES) {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.name} (${c.code})`;
      if (stored['f-nat-code'] === c.code || stored['f-nat'] === c.code) opt.selected = true;
      natSel.appendChild(opt);
    }
    // Allow free text as fallback
    const natInp = el('input', `pkd-input${stored['f-nat'] ? ' filled' : ''}`) as HTMLInputElement;
    attr(natInp, { placeholder: 'ESP', maxlength: '3', style: 'display:none' });
    natInp.value = stored['f-nat'] ?? '';
    natSel.addEventListener('change', () => {
      const v = natSel.value;
      this.saveField('f-nat-code', v);
      this.saveField('f-nat', v);
    });
    natWrap.appendChild(natSel);
    grid4.appendChild(natWrap);
    sec2.appendChild(grid4);
    body.appendChild(sec2);

    // Divider
    body.appendChild(el('hr', 'pkd-divider'));

    // Section 3: Contact
    const sec3 = el('div', 'pkd-section');
    sec3.appendChild(el('span', 'pkd-label', 'Contacto'));

    // Email
    const emailWrap = el('div', 'pkd-stack');
    emailWrap.appendChild(el('label', 'pkd-label', 'Email'));
    const emailInp = el('input', `pkd-input${stored['f-email'] ? ' filled' : ''}`) as HTMLInputElement;
    attr(emailInp, { id: `pkd-${idx}-f-email`, type: 'email', placeholder: 'peregrino@email.com', autocomplete: 'email' });
    emailInp.value = this.state.email || stored['f-email'] || '';
    emailInp.addEventListener('change', () => this.saveField('f-email', emailInp.value.trim()));
    emailWrap.appendChild(emailInp);
    sec3.appendChild(emailWrap);

    // Phone
    const phoneLbl = el('span', 'pkd-label', 'Teléfono');
    sec3.appendChild(phoneLbl);
    sec3.appendChild(this.buildPhoneInput('f-phone', 'f-phone-cc', stored));

    body.appendChild(sec3);

    // Section 4: Address
    body.appendChild(el('hr', 'pkd-divider'));
    const sec4 = el('div', 'pkd-section');
    sec4.appendChild(el('span', 'pkd-label', 'Dirección'));
    sec4.appendChild(field('f-addr', 'Calle / Número', 'text', 'Calle Mayor 1'));
    sec4.appendChild(field('f-addr2', 'Piso / Escalera', 'text', '2ºA'));

    const grid5 = el('div', 'pkd-grid3');
    grid5.appendChild(field('f-zip', 'C.P.', 'text', '28001'));
    grid5.appendChild(field('f-city', 'Ciudad', 'text', 'Madrid'));
    // Country select
    const ctryWrap = el('div', 'pkd-stack');
    ctryWrap.appendChild(el('span', 'pkd-label', 'País'));
    const ctrySel = el('select', 'pkd-input') as HTMLSelectElement;
    ctrySel.style.height = '2.1rem';
    for (const c of COUNTRIES) {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.name;
      if (stored['f-country-code'] === c.code || stored['f-country'] === c.code) opt.selected = true;
      ctrySel.appendChild(opt);
    }
    ctrySel.addEventListener('change', () => {
      this.saveField('f-country-code', ctrySel.value);
      this.saveField('f-country', ctrySel.value);
    });
    ctryWrap.appendChild(ctrySel);
    grid5.appendChild(ctryWrap);
    sec4.appendChild(grid5);
    body.appendChild(sec4);

    // Section 5: Emergency contact
    body.appendChild(el('hr', 'pkd-divider'));
    const sec5 = el('div', 'pkd-section');
    sec5.appendChild(el('span', 'pkd-label', 'Contacto de emergencia'));
    sec5.appendChild(field('f-ec-name', 'Nombre', 'text', 'Nombre del contacto'));
    sec5.appendChild(this.buildPhoneInput('f-ec-phone', 'f-ec-phone-cc', stored));
    body.appendChild(sec5);

    // Field completion chips
    body.appendChild(this.buildFieldChips(stored));

    // Complete button
    const completeBtn = el('button', 'pkd-btn');
    completeBtn.appendChild(parseSvg(I_CHECK_SM));
    completeBtn.appendChild(document.createTextNode(' Completar peregrino'));
    completeBtn.addEventListener('click', () => void this.handleComplete());
    body.appendChild(completeBtn);

    if (this.state.errorMsg) body.appendChild(this.buildError(this.state.errorMsg));
    return body;
  }

  // ── PHONE INPUT ────────────────────────────────────────────────────────────

  private buildPhoneInput(
    phoneKey: FieldKey,
    ccKey: FieldKey,
    stored: ReturnType<typeof getPilgrimData>
  ): HTMLElement {
    const row = el('div', 'pkd-phone-row');

    const ccSel = el('select', 'pkd-cc-select');
    for (const c of COUNTRY_CODES) {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.flag} ${c.dial}`;
      if (stored[ccKey] === c.code) opt.selected = true;
      ccSel.appendChild(opt);
    }
    ccSel.addEventListener('change', () => this.saveField(ccKey, ccSel.value));
    row.appendChild(ccSel);

    const inp = el('input', `pkd-input${stored[phoneKey] ? ' filled' : ''}`);
    attr(inp, { type: 'tel', placeholder: '600 000 000' });
    inp.value = stored[phoneKey] ?? '';
    inp.addEventListener('change', () => {
      this.saveField(phoneKey, inp.value.trim());
      inp.classList.toggle('filled', inp.value.length > 0);
    });
    row.appendChild(inp);

    return row;
  }

  // ── FIELD CHIPS ────────────────────────────────────────────────────────────

  private buildFieldChips(stored: ReturnType<typeof getPilgrimData>): HTMLElement {
    const wrap = el('div', 'pkd-chips');
    const checks: Array<[FieldKey, string]> = [
      ['f-first','nombre'],['f-last','ap1'],['f-dob','nac.'],
      ['f-doc-num','doc'],['f-nat','nac'],['f-email','email'],
      ['f-phone','tel'],['f-addr','dir'],['f-city','ciudad'],
    ];
    for (const [key, label] of checks) {
      const filled = !!stored[key];
      const chip = el('span', `pkd-chip ${filled ? 'ok' : 'err'}`);
      chip.appendChild(parseSvg(filled ? I_CHECK_SM : I_X_SM));
      chip.appendChild(document.createTextNode(` ${label}`));
      wrap.appendChild(chip);
    }
    return wrap;
  }

  // ── DONE PHASE — tabbed artistic card ────────────────────────────────────

  private buildDoneCard(): HTMLElement {
    const wrap = el('div', 'pkd-done-body');
    const stored = getPilgrimData(this.opts.pilgrimIndex);
    const meta = this.state.clerkMeta;

    wrap.appendChild(this.buildDoneAvatarZone(stored, meta));

    const { tabsRow, panelsWrap } = this.buildDoneTabs(stored);
    wrap.appendChild(tabsRow);
    wrap.appendChild(panelsWrap);

    this.appendDoneDocButtons(wrap);
    return wrap;
  }

  private buildDoneAvatarZone(
    stored: ReturnType<typeof getPilgrimData>,
    meta: ClerkMetaSnapshot | null
  ): HTMLElement {
    const avatarZone = el('div', 'pkd-done-avatar-zone');
    const ringWrap = el('div');
    ringWrap.style.cssText = 'position:relative;display:inline-block';

    const ring = el('div', 'pkd-done-avatar-ring');
    const avatarUrl = this.state.avatarDataUrl ?? meta?.imageUrl ?? null;
    if (avatarUrl) {
      const inner = el('div', 'pkd-done-avatar-img');
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = 'Avatar';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
      inner.appendChild(img);
      ring.appendChild(inner);
    } else {
      const initials = el('div', 'pkd-done-avatar-initials', this.getInitials());
      ring.appendChild(initials);
    }
    ringWrap.appendChild(ring);

    if (meta?.hasGoogleAuth) {
      const gBadge = el('div', 'pkd-done-google-badge');
      gBadge.setAttribute('title', 'Google conectado');
      gBadge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
      ringWrap.appendChild(gBadge);
    }
    avatarZone.appendChild(ringWrap);

    const fullName = [
      stored['f-first'] || meta?.firstName || '',
      stored['f-last'] || meta?.lastName || '',
      stored['f-last2'] || '',
    ].filter(Boolean).join(' ') || this.opts.pilgrimLabel;
    avatarZone.appendChild(el('p', 'pkd-done-name', fullName));
    avatarZone.appendChild(el('span', 'pkd-done-completed-badge', '✓ COMPLETADO'));
    return avatarZone;
  }

  private buildDoneTabs(stored: ReturnType<typeof getPilgrimData>): { tabsRow: HTMLElement; panelsWrap: HTMLElement } {
    const tabsRow = el('div', 'pkd-done-tabs');
    const panelsWrap = el('div', 'pkd-done-panels');

    type TabSection = 'identity' | 'contact' | 'address';
    const tabs: Array<{ iconSvg: string; label: string; section: TabSection }> = [
      { iconSvg: I_ID_CARD, label: 'Identidad', section: 'identity' },
      { iconSvg: I_PHONE_TAB, label: 'Contacto', section: 'contact' },
      { iconSvg: I_HOME_TAB, label: 'Domicilio', section: 'address' },
    ];

    const tabEls: HTMLButtonElement[] = [];
    const panelEls: HTMLElement[] = [];

    tabs.forEach((def, tabIdx) => {
      const tab = el('button', `pkd-done-tab${tabIdx === 0 ? ' active' : ''}`);
      tab.appendChild(iconSpan(def.iconSvg));
      tab.appendChild(document.createTextNode(` ${def.label}`));
      tab.addEventListener('click', () => {
        tabEls.forEach((t, j) => t.classList.toggle('active', j === tabIdx));
        panelEls.forEach((p, j) => p.classList.toggle('hidden', j !== tabIdx));
      });
      tabsRow.appendChild(tab);
      tabEls.push(tab);

      const panelClass = tabIdx === 0 ? 'pkd-done-panel' : 'pkd-done-panel hidden';
      const panel = el('div', panelClass);
      const hdr = el('div', 'pkd-done-panel-hdr');
      const titleSpan = el('span', 'pkd-done-panel-title');
      titleSpan.appendChild(iconSpan(def.iconSvg, 'margin-right:.25rem'));
      titleSpan.appendChild(document.createTextNode(def.label));
      hdr.appendChild(titleSpan);

      const editBtn = el('button', 'pkd-done-panel-edit');
      editBtn.appendChild(iconSpan(I_PENCIL, 'margin-right:.2rem'));
      editBtn.appendChild(document.createTextNode('Editar'));
      editBtn.addEventListener('click', () => this.openEditModal(def.section));
      hdr.appendChild(editBtn);
      panel.appendChild(hdr);

      if (def.section === 'identity') this.appendIdentityPanel(panel, stored);
      else if (def.section === 'contact') this.appendContactPanel(panel, stored);
      else this.appendAddressPanel(panel, stored);

      panelsWrap.appendChild(panel);
      panelEls.push(panel);
    });

    return { tabsRow, panelsWrap };
  }

  private appendDoneDocButtons(wrap: HTMLElement): void {
    const hasFront = !!this.state.frontImageUrl;
    const hasBack = !!this.state.backImageUrl;
    if (!hasFront && !hasBack) return;

    const docBtnRow = el('div', 'pkd-done-doc-btns');
    if (hasFront) {
      const btn = el('button', 'pkd-done-doc-view-btn');
      btn.appendChild(parseSvg(I_FILE_SM));
      btn.appendChild(document.createTextNode(' Anverso'));
      btn.addEventListener('click', () => this.openImageModal(this.state.frontImageUrl!, 'ANVERSO'));
      docBtnRow.appendChild(btn);
    }
    if (hasBack) {
      const btn = el('button', 'pkd-done-doc-view-btn');
      btn.appendChild(parseSvg(I_FILE_SM));
      btn.appendChild(document.createTextNode(' Reverso'));
      btn.addEventListener('click', () => this.openImageModal(this.state.backImageUrl!, 'REVERSO'));
      docBtnRow.appendChild(btn);
    }

    wrap.appendChild(docBtnRow);
  }

  // ── DONE CARD PANEL BUILDERS ──────────────────────────────────────────────

  private appendIdentityPanel(panel: HTMLElement, stored: ReturnType<typeof getPilgrimData>): void {
    // Hero: doc badge + number left / age circle right
    const hero = el('div', 'pkd-done-id-hero');
    const leftCol = el('div', 'pkd-done-id-left');

    const docType = (stored['f-doc-type'] || 'DNI').toUpperCase();
    const docBadge = el('span', 'pkd-done-doc-badge');
    docBadge.appendChild(iconSpan(I_DOC_BADGE, 'margin-right:.22rem'));
    docBadge.appendChild(document.createTextNode(docType));
    leftCol.appendChild(docBadge);
    leftCol.appendChild(el('div', 'pkd-done-doc-num', stored['f-doc-num'] || '— — —'));

    const dob = stored['f-dob'];
    if (dob) {
      const dobRow = el('div', 'pkd-done-dob-small');
      dobRow.appendChild(iconSpan(I_CALENDAR, 'opacity:.6;margin-right:.25rem'));
      dobRow.appendChild(document.createTextNode(this.fmtDate(dob)));
      leftCol.appendChild(dobRow);
    }
    hero.appendChild(leftCol);

    const age = this.calcAge(dob ?? '');
    if (age !== null) {
      const circle = el('div', 'pkd-done-age-circle');
      circle.appendChild(el('span', 'pkd-done-age-num', String(age)));
      circle.appendChild(el('span', 'pkd-done-age-lbl', 'años'));
      hero.appendChild(circle);
    }
    panel.appendChild(hero);

    // Expiry with status pill
    const expiry = stored['f-expiry'];
    if (expiry) {
      const { iconSvg: statusIconSvg, text, cls } = this.expiryStatus(expiry);
      const row = el('div', 'pkd-done-expiry-row');
      row.appendChild(iconSpan(I_CLOCK, 'opacity:.5;margin-right:.28rem'));
      row.appendChild(document.createTextNode(`Caduca: ${this.fmtDate(expiry)}`));
      const pill = el('span', `pkd-done-expiry-pill ${cls}`);
      if (statusIconSvg) pill.appendChild(parseSvg(statusIconSvg));
      pill.appendChild(document.createTextNode(` ${text}`));
      row.appendChild(pill);
      panel.appendChild(row);
    }

    // Gender badge + nationality badge with flag
    const gender = stored['f-gender'];
    const natCode = stored['f-nat-code'] || stored['f-nat'];
    if (gender || natCode) {
      const badgesRow = el('div', 'pkd-done-badges-row');
      if (gender) {
        const { iconSvg: gIconSvg, label: gLabel } = this.genderDisplay(gender);
        const badge = el('span', 'pkd-done-gender-badge');
        const gIconEl = el('span', 'pkd-done-gender-icon');
        gIconEl.appendChild(parseSvg(gIconSvg));
        badge.appendChild(gIconEl);
        badge.appendChild(document.createTextNode(` ${gLabel}`));
        badgesRow.appendChild(badge);
      }
      if (natCode) {
        const nBadge = el('span', 'pkd-done-nat-badge');
        const flag = flagImg(natCode);
        if (flag) nBadge.appendChild(flag);
        const natName = COUNTRIES.find(c => c.code === natCode || c.code2 === natCode)?.name ?? natCode;
        nBadge.appendChild(document.createTextNode(` ${natName}`));
        badgesRow.appendChild(nBadge);
      }
      panel.appendChild(badgesRow);
    }
  }

  private appendContactPanel(panel: HTMLElement, stored: ReturnType<typeof getPilgrimData>): void {
    const email = stored['f-email'] || this.state.email;
    const emailRow = el('div', 'pkd-done-contact-row');
    const emailIcon = el('span', 'pkd-done-contact-icon');
    emailIcon.appendChild(parseSvg(I_MAIL_SM));
    emailRow.appendChild(emailIcon);
    const ei = el('div', 'pkd-done-contact-info');
    ei.appendChild(el('div', 'pkd-done-contact-label', 'Email'));
    ei.appendChild(el('div', `pkd-done-contact-val${email ? '' : ' muted'}`, email || '—'));
    emailRow.appendChild(ei);
    panel.appendChild(emailRow);

    const cc = stored['f-phone-cc'];
    const phoneNum = stored['f-phone'];
    const ccEntry = COUNTRY_CODES.find(c => c.code === cc);
    const phoneDisplay = phoneNum ? `${ccEntry?.dial ?? ''} ${phoneNum}`.trim() : null;
    const phoneRow = el('div', 'pkd-done-contact-row');
    const phoneIcon = el('span', 'pkd-done-contact-icon');
    if (cc) {
      const flag = flagImg(cc);
      if (flag) {
        phoneIcon.style.cssText = 'flex-direction:column;gap:1px';
        phoneIcon.appendChild(flag);
      } else {
        phoneIcon.appendChild(parseSvg(I_PHONE_SM));
      }
    } else {
      phoneIcon.appendChild(parseSvg(I_PHONE_SM));
    }
    phoneRow.appendChild(phoneIcon);
    const pi = el('div', 'pkd-done-contact-info');
    const dialLabel = ccEntry ? ` ${ccEntry.dial}` : '';
    pi.appendChild(el('div', 'pkd-done-contact-label', `Teléfono${dialLabel}`));
    pi.appendChild(el('div', `pkd-done-contact-val${phoneDisplay ? '' : ' muted'}`, phoneDisplay || '—'));
    phoneRow.appendChild(pi);
    panel.appendChild(phoneRow);
  }

  private appendAddressPanel(panel: HTMLElement, stored: ReturnType<typeof getPilgrimData>): void {
    const block = el('div', 'pkd-done-addr-block');
    const addLine = (iconSvgStr: string, text: string, muted = false): void => {
      const line = el('div', `pkd-done-addr-line${muted ? ' muted' : ''}`);
      const iconEl = el('span', 'pkd-done-addr-icon');
      iconEl.appendChild(parseSvg(iconSvgStr));
      line.appendChild(iconEl);
      line.appendChild(document.createTextNode(text));
      block.appendChild(line);
    };
    const addr1 = stored['f-addr'];
    const addr2 = stored['f-addr2'];
    const zip   = stored['f-zip'];
    const city  = stored['f-city'];
    const cc    = stored['f-country-code'] || stored['f-country'];

    if (addr1) addLine(I_HOME_TAB, addr1 + (addr2 ? `, ${addr2}` : ''));
    else addLine(I_HOME_TAB, 'Sin dirección', true);
    if (zip || city) addLine(I_MAP_PIN, [zip, city].filter(Boolean).join(' '));
    if (cc) {
      const line = el('div', 'pkd-done-addr-line');
      const iconEl = el('span', 'pkd-done-addr-icon');
      iconEl.appendChild(parseSvg(I_GLOBE));
      line.appendChild(iconEl);
      const flag = flagImg(cc);
      if (flag) { flag.style.cssText += ';margin-right:.3rem'; line.appendChild(flag); }
      const countryName = COUNTRIES.find(c => c.code === cc || c.code2 === cc)?.name ?? cc;
      line.appendChild(document.createTextNode(countryName));
      block.appendChild(line);
    }
    panel.appendChild(block);
  }

  // ── CARD HELPERS ─────────────────────────────────────────────────────────

  private calcAge(dob: string): number | null {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 0 && age < 150 ? age : null;
  }

  private fmtDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private expiryStatus(expiry: string): { iconSvg: string; text: string; cls: string } {
    const d = new Date(expiry);
    if (Number.isNaN(d.getTime())) return { iconSvg: '', text: '?', cls: '' };
    const now = new Date();
    const soon = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
    if (d < now)   return { iconSvg: I_X_SM,    text: 'Caducado',      cls: 'expired' };
    if (d < soon)  return { iconSvg: I_WARN_SM,  text: 'Caduca pronto', cls: 'warn' };
    return { iconSvg: I_CHECK_SM, text: 'Válido', cls: 'valid' };
  }

  private genderDisplay(gender: string): { iconSvg: string; label: string } {
    const g = gender.toUpperCase();
    if (g === 'M' || g === 'MALE'   || g === 'HOMBRE') return { iconSvg: I_MALE,         label: 'Hombre' };
    if (g === 'F' || g === 'FEMALE' || g === 'MUJER')  return { iconSvg: I_FEMALE,       label: 'Mujer' };
    return { iconSvg: I_GENDER_OTHER, label: 'Otro' };
  }

  // ── EDIT MODAL (per-section) ───────────────────────────────────────────────

  private openEditModal(section: 'identity' | 'contact' | 'address' = 'identity'): void {
    if (this.editModalOverlay) return;

    const sectionMeta: Record<string, { iconSvg: string; label: string }> = {
      identity: { iconSvg: I_ID_CARD,   label: 'Identidad' },
      contact:  { iconSvg: I_PHONE_TAB, label: 'Contacto' },
      address:  { iconSvg: I_HOME_TAB,  label: 'Domicilio' },
    };
    const { iconSvg: modalIconSvg, label } = sectionMeta[section];

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:1rem';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeEditModal(); });

    const dialog = document.createElement('div');
    dialog.style.cssText = 'position:relative;width:min(520px,100%);max-height:90dvh;overflow-y:auto;background:#faf7f0;border:3px solid #1a3a2e;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column';

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:.6rem 1rem;background:linear-gradient(135deg,#1a3a2e 0%,#2d5a3d 100%);border-radius:15px 15px 0 0;position:sticky;top:0;z-index:2';
    const hdrTitle = document.createElement('span');
    hdrTitle.style.cssText = "color:#fff;font-family:'Cabin Sketch',cursive;font-size:.9rem;letter-spacing:.05em;display:flex;align-items:center;gap:.4rem";
    // Use iconSpan so color:#a7f3d0 flows into stroke="currentColor" on the SVG
    hdrTitle.appendChild(iconSpan(modalIconSvg, 'color:#a7f3d0;flex-shrink:0'));
    hdrTitle.appendChild(document.createTextNode(`${label.toUpperCase()} — ${this.opts.pilgrimLabel}`));
    hdr.appendChild(hdrTitle);
    const closeX = document.createElement('button');
    closeX.textContent = '✕';
    closeX.setAttribute('aria-label', 'Cerrar');
    closeX.style.cssText = 'background:none;border:none;color:#fff;font-size:1.25rem;cursor:pointer;line-height:1;padding:0 .2rem';
    closeX.addEventListener('click', () => this.closeEditModal());
    hdr.appendChild(closeX);
    dialog.appendChild(hdr);

    // Section-specific form
    const formBody = this.buildSectionForm(section);
    formBody.style.cssText = 'padding:.75rem 1rem;flex:1;overflow-y:auto';
    dialog.appendChild(formBody);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:.6rem;padding:.7rem 1rem;border-top:1px solid rgba(212,165,116,.3);background:#faf7f0;position:sticky;bottom:0;z-index:2;border-radius:0 0 15px 15px';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = "padding:.5rem 1.1rem;border:2px solid #d4a574;border-radius:10px;background:#fff9f0;color:#5d4e37;font-family:'Patrick Hand',cursive;font-size:.88rem;cursor:pointer";
    cancelBtn.addEventListener('click', () => this.closeEditModal());
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '✓ Guardar';
    saveBtn.style.cssText = "padding:.5rem 1.4rem;border:none;border-radius:10px;background:#00ab39;color:#fff;font-family:'Cabin Sketch',cursive;font-size:.88rem;font-weight:700;cursor:pointer";
    saveBtn.addEventListener('click', () => { void this.handleComplete(); this.closeEditModal(); });
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    dialog.appendChild(footer);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    this.editModalOverlay = overlay;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { this.closeEditModal(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  }

  /** Build a focused form for a single section (used in the per-section edit modal). */
  private buildSectionForm(section: 'identity' | 'contact' | 'address'): HTMLElement {
    const body = el('div', 'pkd-body');
    const idx = this.opts.pilgrimIndex;
    const stored = getPilgrimData(idx);

    if (section === 'identity') {
      this.appendIdentitySectionForm(body, idx, stored);
    } else if (section === 'contact') {
      this.appendContactSectionForm(body, idx, stored);
    } else {
      this.appendAddressSectionForm(body, idx, stored);
    }

    return body;
  }

  private buildSectionField(
    idx: number,
    stored: ReturnType<typeof getPilgrimData>,
    key: FieldKey,
    label: string,
    type = 'text',
    placeholder = ''
  ): HTMLElement {
    const wrap = el('div', 'pkd-stack');
    const lbl = el('label', 'pkd-label', label);
    attr(lbl, { for: `pkd-${idx}-${key}-m` });
    const inp = el('input', `pkd-input${stored[key] ? ' filled' : ''}`);
    attr(inp, { id: `pkd-${idx}-${key}-m`, type, placeholder });
    inp.value = stored[key] ?? '';
    inp.addEventListener('change', () => this.saveField(key, inp.value.trim()));
    inp.addEventListener('input', () => inp.classList.toggle('filled', inp.value.length > 0));
    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    return wrap;
  }

  private appendIdentitySectionForm(
    body: HTMLElement,
    idx: number,
    stored: ReturnType<typeof getPilgrimData>
  ): void {
    const g1 = el('div', 'pkd-grid2');
    g1.appendChild(this.buildSectionField(idx, stored, 'f-first', 'Nombre'));
    g1.appendChild(this.buildSectionField(idx, stored, 'f-doc-num', 'Nº Documento', 'text', '12345678A'));
    body.appendChild(g1);

    const g2 = el('div', 'pkd-grid2');
    g2.appendChild(this.buildSectionField(idx, stored, 'f-last', 'Apellido 1'));
    g2.appendChild(this.buildSectionField(idx, stored, 'f-last2', 'Apellido 2'));
    body.appendChild(g2);

    const g3 = el('div', 'pkd-grid2');
    g3.appendChild(this.buildSectionField(idx, stored, 'f-dob', 'Fecha nacimiento', 'date'));
    g3.appendChild(this.buildSectionField(idx, stored, 'f-expiry', 'Caducidad', 'date'));
    body.appendChild(g3);

    this.appendIdentityDocTypeControls(body, idx, stored);
    this.appendIdentityGenderControls(body, idx, stored);
    this.appendIdentityNationalityControls(body, stored);
  }

  private appendIdentityDocTypeControls(
    body: HTMLElement,
    _idx: number,
    stored: ReturnType<typeof getPilgrimData>
  ): void {
    const dtWrap = el('div', 'pkd-stack');
    dtWrap.appendChild(el('span', 'pkd-label', 'Tipo documento'));
    const dtRow = el('div', 'pkd-doctype-row');

    for (const [val, lbl] of [['dni', 'DNI'], ['nie', 'NIE'], ['passport', 'Pasaporte']] as [string, string][]) {
      const btn = el('button', `pkd-dt-btn${stored['f-doc-type'] === val ? ' active' : ''}`, lbl);
      btn.addEventListener('click', () => {
        this.state.docType = val as DocType;
        this.saveField('f-doc-type', val);
        dtRow.querySelectorAll('.pkd-dt-btn').forEach((b) => b.classList.toggle('active', b.textContent === lbl));
      });
      dtRow.appendChild(btn);
    }

    dtWrap.appendChild(dtRow);
    body.appendChild(dtWrap);
  }

  private appendIdentityGenderControls(
    body: HTMLElement,
    idx: number,
    stored: ReturnType<typeof getPilgrimData>
  ): void {
    const genderWrap = el('div', 'pkd-stack');
    genderWrap.appendChild(el('span', 'pkd-label', 'Sexo'));
    const gRow = el('div', 'pkd-gender-row');

    for (const [val, lbl] of [['M', 'Hombre'], ['F', 'Mujer'], ['X', 'Otro']] as [string, string][]) {
      const lbEl = el('label', 'pkd-gender-lbl');
      const rb = el('input');
      attr(rb, { type: 'radio', name: `pkd-gender-${idx}-m`, value: val });
      if (stored['f-gender'] === val) rb.checked = true;
      rb.addEventListener('change', () => this.saveField('f-gender', val));
      lbEl.appendChild(rb);
      lbEl.appendChild(document.createTextNode(lbl));
      gRow.appendChild(lbEl);
    }

    genderWrap.appendChild(gRow);
    body.appendChild(genderWrap);
  }

  private appendIdentityNationalityControls(body: HTMLElement, stored: ReturnType<typeof getPilgrimData>): void {
    const natWrap = el('div', 'pkd-stack');
    natWrap.appendChild(el('span', 'pkd-label', 'Nacionalidad'));
    const natSel = el('select', 'pkd-input');
    natSel.style.height = '2.1rem';

    for (const c of COUNTRIES) {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.name} (${c.code})`;
      if (stored['f-nat-code'] === c.code || stored['f-nat'] === c.code) opt.selected = true;
      natSel.appendChild(opt);
    }

    natSel.addEventListener('change', () => {
      this.saveField('f-nat-code', natSel.value);
      this.saveField('f-nat', natSel.value);
    });

    natWrap.appendChild(natSel);
    body.appendChild(natWrap);
  }

  private appendContactSectionForm(
    body: HTMLElement,
    _idx: number,
    stored: ReturnType<typeof getPilgrimData>
  ): void {
    const emailWrap = el('div', 'pkd-stack');
    emailWrap.appendChild(el('label', 'pkd-label', 'Email'));
    const emailInp = el('input', `pkd-input${stored['f-email'] ? ' filled' : ''}`);
    attr(emailInp, { type: 'email', placeholder: 'peregrino@email.com', autocomplete: 'email' });
    emailInp.value = this.state.email || stored['f-email'] || '';
    emailInp.addEventListener('change', () => this.saveField('f-email', emailInp.value.trim()));
    emailWrap.appendChild(emailInp);
    body.appendChild(emailWrap);

    body.appendChild(el('span', 'pkd-label', 'Teléfono'));
    body.appendChild(this.buildPhoneInput('f-phone', 'f-phone-cc', stored));
  }

  private appendAddressSectionForm(
    body: HTMLElement,
    idx: number,
    stored: ReturnType<typeof getPilgrimData>
  ): void {
    body.appendChild(this.buildSectionField(idx, stored, 'f-addr', 'Calle / Número', 'text', 'Calle Mayor 1'));
    body.appendChild(this.buildSectionField(idx, stored, 'f-addr2', 'Piso / Escalera', 'text', '2ºA'));

    const g = el('div', 'pkd-grid3');
    g.appendChild(this.buildSectionField(idx, stored, 'f-zip', 'C.P.', 'text', '28001'));
    g.appendChild(this.buildSectionField(idx, stored, 'f-city', 'Ciudad', 'text', 'Madrid'));

    const ctryWrap = el('div', 'pkd-stack');
    ctryWrap.appendChild(el('span', 'pkd-label', 'País'));
    const ctrySel = el('select', 'pkd-input');
    ctrySel.style.height = '2.1rem';
    for (const c of COUNTRIES) {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.name;
      if (stored['f-country-code'] === c.code || stored['f-country'] === c.code) opt.selected = true;
      ctrySel.appendChild(opt);
    }
    ctrySel.addEventListener('change', () => {
      this.saveField('f-country-code', ctrySel.value);
      this.saveField('f-country', ctrySel.value);
    });
    ctryWrap.appendChild(ctrySel);
    g.appendChild(ctryWrap);
    body.appendChild(g);
  }

  private closeEditModal(): void {
    if (!this.editModalOverlay) return;
    this.editModalOverlay.remove();
    this.editModalOverlay = null;
    // Re-render done card to reflect any saved changes
    this.renderPhase();
  }

  // ── IMAGE VIEWER MODAL ─────────────────────────────────────────────────────

  private openImageModal(url: string, title: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'pkd-img-modal-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const inner = document.createElement('div');
    inner.className = 'pkd-img-modal-inner';

    const titleEl = document.createElement('p');
    titleEl.className = 'pkd-img-modal-title';
    titleEl.textContent = title;
    inner.appendChild(titleEl);

    const img = document.createElement('img');
    img.src = url;
    img.alt = title;
    img.className = 'pkd-img-modal-img';
    inner.appendChild(img);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'pkd-img-modal-close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Cerrar imagen');
    closeBtn.addEventListener('click', () => overlay.remove());
    inner.appendChild(closeBtn);

    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
  }

  // ── ERROR / MISMATCH ───────────────────────────────────────────────────────

  private buildError(msg: string): HTMLElement {
    const d = el('div', 'pkd-error');
    d.appendChild(parseSvg(I_WARN_SM));
    d.appendChild(document.createTextNode(msg));
    return d;
  }

  private buildMismatchAlert(): HTMLElement {
    const d = el('div', 'pkd-mismatch');
    const title = el('div');
    title.style.cssText = 'font-weight:700;margin-bottom:.2rem;display:flex;align-items:center;gap:4px;font-size:.73rem';
    title.appendChild(parseSvg(I_WARN_SM));
    title.appendChild(document.createTextNode('Discrepancias frente/reverso:'));
    d.appendChild(title);
    for (const m of this.state.mismatches) {
      const row = el('div');
      row.style.cssText = 'font-size:.7rem';
      row.textContent = `${m.field}: "${m.front}" ↔ "${m.back}"`;
      d.appendChild(row);
    }
    return d;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getInitials(): string {
    const stored = getPilgrimData(this.opts.pilgrimIndex);
    const f = stored['f-first']?.[0] ?? 'P';
    const l = stored['f-last']?.[0] ?? '';
    return (f + l).toUpperCase();
  }

  private saveField(key: FieldKey, value: string): void {
    setPilgrimData(this.opts.pilgrimIndex, { [key]: value } as Partial<Record<FieldKey, string>>);
    // Update chips live
    const chips = this.root?.querySelector('.pkd-chips');
    if (chips) {
      const stored = getPilgrimData(this.opts.pilgrimIndex);
      chips.replaceWith(this.buildFieldChips(stored));
    }
    // Update name row live
    const nameEl = this.root?.querySelector('.pkd-name');
    if (nameEl) {
      const stored = getPilgrimData(this.opts.pilgrimIndex);
      const full = [stored['f-first'], stored['f-last']].filter(Boolean).join(' ');
      nameEl.textContent = full || this.opts.pilgrimLabel;
      nameEl.classList.toggle('placeholder', !full);
    }
  }

  // ── API: send OTP via Clerk ────────────────────────────────────────────────

  private async parseJson<T>(res: Response): Promise<T> {
    return res.json() as Promise<T>;
  }

  private async sendOtp(): Promise<void> {
    const email = this.state.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.state.errorMsg = 'Introduce un email válido.';
      this.renderPhase();
      return;
    }

    this.state.errorMsg = null;

    // Try Clerk frontend SDK first (sends real email)
    const clerk = window.Clerk;

    if (clerk?.client?.signIn) {
      try {
        const signIn = await clerk.client.signIn.create({
          strategy: 'email_code',
          identifier: email,
        });
        this.state.clerkSignIn = signIn;
        this.state.phase = 'otp';
        this.renderPhase();
        return;
      } catch (e) {
        console.warn('[PilgrimCard] Clerk signIn.create failed, falling back:', e);
      }
    }

    // Fallback: our custom send-code endpoint (logs code in dev)
    try {
      const res = await fetch('/api/pilgrim/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await this.parseJson<{ success?: boolean; error?: string; _devCode?: string }>(res);
      if (data.success) {
        this.state.phase = 'otp';
        if (data._devCode) console.info(`[DEV] OTP: ${data._devCode}`);
      } else {
        this.state.errorMsg = data.error ?? 'Error enviando el código.';
      }
    } catch {
      this.state.errorMsg = 'Error de red. Inténtalo de nuevo.';
    }
    this.renderPhase();
  }

  // ── API: verify OTP ────────────────────────────────────────────────────────

  private async verifyOtp(): Promise<void> {
    const code = this.otpBoxes.map((b) => b.value).join('');
    if (code.length !== 6) return;

    this.state.errorMsg = null;

    // Try Clerk verification first
    const signIn = this.state.clerkSignIn as
      | { attemptFirstFactor: (opts: Record<string, unknown>) => Promise<{ status: string; createdUserId?: string }> }
      | null;

    if (signIn) {
      try {
        const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
        if (result.status === 'complete') {
          this.state.userId = result.createdUserId ?? null;
          this.state.phase = 'upload';
          this.state.clerkSignIn = null;
          setPilgrimData(this.opts.pilgrimIndex, { 'f-email': this.state.email });
          updateDocumentUploadState(this.opts.pilgrimIndex, { phase: 'doctype', email: this.state.email, userId: this.state.userId ?? '' });
          this.renderPhase();
          return;
        }
        this.state.errorMsg = 'Código incorrecto. Inténtalo de nuevo.';
      } catch (e) {
        this.state.errorMsg = (e instanceof Error) ? e.message : 'Código incorrecto.';
      }
      this.renderPhase();
      return;
    }

    // Fallback: custom verify-code endpoint
    try {
      const res = await fetch('/api/pilgrim/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.state.email, code }),
      });
      const data = await this.parseJson<{
        success?: boolean; error?: string; userId?: string;
        pilgrimData?: Partial<Record<FieldKey, string>>;
      }>(res);
      if (data.success && data.userId) {
        this.state.userId = data.userId;
        this.state.phase = 'upload';
        if (data.pilgrimData) setPilgrimData(this.opts.pilgrimIndex, data.pilgrimData);
        setPilgrimData(this.opts.pilgrimIndex, { 'f-email': this.state.email });
        updateDocumentUploadState(this.opts.pilgrimIndex, { phase: 'doctype', email: this.state.email, userId: data.userId });
      } else {
        this.state.errorMsg = data.error ?? 'Código incorrecto.';
      }
    } catch {
      this.state.errorMsg = 'Error de red. Inténtalo de nuevo.';
    }
    this.renderPhase();
  }

  // ── API: process document ──────────────────────────────────────────────────

  private async handleFile(file: File, side: 'front' | 'back'): Promise<void> {
    const validationError = this.validateFileForUpload(file);
    if (validationError) {
      this.state.errorMsg = validationError;
      this.renderPhase();
      return;
    }

    this.setLocalUploadPreview(side, file);
    const form = this.buildProcessDocumentForm(file, side);

    try {
      const res = await fetch('/api/pilgrim/process-document', { method: 'POST', body: form });
      const data = await this.parseJson<{ imageUrl?: string | null; ocrFields?: OcrFields | null; valid?: boolean }>(res);

      this.state.uploading = false;
      this.applyProcessedDocumentResult(side, data, file);
      this.finalizeDocumentValidation();
    } catch {
      this.state.uploading = false;
      this.state.errorMsg = 'Error procesando el documento. Inténtalo de nuevo.';
    }

    this.renderPhase();
  }

  private validateFileForUpload(file: File): string | null {
    if (file.size > 10 * 1024 * 1024) return 'Archivo demasiado grande (máx. 10 MB).';

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowed.includes(file.type)) return 'Formato no soportado. Usa JPG, PNG, WEBP o HEIC.';

    return null;
  }

  private setLocalUploadPreview(side: 'front' | 'back', file: File): void {
    const localUrl = URL.createObjectURL(file);
    if (side === 'front') this.state.frontImageUrl = localUrl;
    else this.state.backImageUrl = localUrl;

    this.state.uploading = true;
    this.state.errorMsg = null;
    this.renderPhase();
  }

  private buildProcessDocumentForm(file: File, side: 'front' | 'back'): FormData {
    const form = new FormData();
    form.set('file', file);
    form.set('side', side);
    form.set('docType', this.state.docType);
    form.set('userId', this.state.userId ?? 'anonymous');
    return form;
  }

  private applyProcessedDocumentResult(
    side: 'front' | 'back',
    data: { imageUrl?: string | null; ocrFields?: OcrFields | null; valid?: boolean },
    file: File
  ): void {
    if (side === 'front') {
      this.applyFrontDocumentResult(data, file);
    } else {
      this.applyBackDocumentResult(data);
    }
  }

  private applyFrontDocumentResult(
    data: { imageUrl?: string | null; ocrFields?: OcrFields | null; valid?: boolean },
    file: File
  ): void {
    if (data.imageUrl) this.state.frontImageUrl = data.imageUrl;
    if (data.ocrFields) {
      this.state.frontOcrFields = data.ocrFields;
      this.autoFill(data.ocrFields);
      void this.extractAvatar(file);
    }
    updatePilgrimDocState(this.opts.pilgrimIndex, {
      frontValid: data.valid ?? true,
      frontOcrFields: toExtractedFields(data.ocrFields),
    });
  }

  private applyBackDocumentResult(data: { imageUrl?: string | null; ocrFields?: OcrFields | null; valid?: boolean }): void {
    if (data.imageUrl) this.state.backImageUrl = data.imageUrl;
    if (data.ocrFields) this.state.backOcrFields = data.ocrFields;

    updatePilgrimDocState(this.opts.pilgrimIndex, {
      backValid: data.valid ?? true,
      backOcrFields: toExtractedFields(data.ocrFields),
    });
  }

  private finalizeDocumentValidation(): void {
    if (this.state.docType === 'passport') {
      if (this.state.frontOcrFields) this.state.frontBackValid = true;
      return;
    }

    if (this.state.frontOcrFields && this.state.backOcrFields) {
      void this.validateSides();
    }
  }

  private async validateSides(): Promise<void> {
    if (!this.state.frontOcrFields || !this.state.backOcrFields) return;
    try {
      const res = await fetch('/api/pilgrim/validate-sides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontFields: this.state.frontOcrFields, backFields: this.state.backOcrFields, docType: this.state.docType }),
      });
      const data = await this.parseJson<{ valid: boolean; mismatches: Array<{ field: string; front: string; back: string }>; warnings: string[] }>(res);
      this.state.frontBackValid = data.valid;
      this.state.mismatches = data.mismatches ?? [];
      updatePilgrimDocState(this.opts.pilgrimIndex, { validationError: data.valid ? null : 'Mismatch' });
    } catch {
      this.state.frontBackValid = null;
    }
    this.renderPhase();
  }

  private async extractAvatar(frontFile: File): Promise<void> {
    try {
      const bmp = await createImageBitmap(frontFile);
      const canvas = document.createElement('canvas');
      const cw = Math.round(bmp.width * 0.3);
      const ch = Math.round(bmp.height * 0.4);
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(bmp, 0, 0, cw, ch, 0, 0, cw, ch);
      bmp.close();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      this.state.avatarDataUrl = dataUrl;
      this.opts.onAvatarChange?.(dataUrl);
      updatePilgrimDocState(this.opts.pilgrimIndex, { avatarDataUrl: dataUrl });
      if (this.state.userId) {
        void fetch('/api/user/update-avatar', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: this.state.userId, imageDataUrl: dataUrl }),
        });
      }
    } catch { /* non-blocking */ }
  }

  private autoFill(fields: OcrFields): void {
    const map: Partial<Record<FieldKey, string>> = {};
    const s = (k: FieldKey, v: string | undefined) => { if (v) map[k] = v; };
    s('f-first', fields.firstName);
    s('f-last', fields.lastName);
    s('f-last2', fields.lastName2);
    s('f-dob', fields.birthDate);
    s('f-expiry', fields.expiryDate);
    s('f-doc-num', fields.documentNumber);
    s('f-gender', fields.gender);
    if (fields.nationality) {
      s('f-nat', fields.nationality);
      s('f-nat-code', fields.nationality);
    }
    if (fields.homeAddress) s('f-addr', fields.homeAddress);
    setPilgrimData(this.opts.pilgrimIndex, map);

    // Update live inputs
    for (const [key, val] of Object.entries(map)) {
      const inp = document.getElementById(`pkd-${this.opts.pilgrimIndex}-${key}`) as HTMLInputElement | null;
      if (inp && val) { inp.value = val; inp.classList.add('filled'); }
    }
  }

  // ── Complete ───────────────────────────────────────────────────────────────

  private async handleComplete(): Promise<void> {
    const stored = getPilgrimData(this.opts.pilgrimIndex);

    // Persist document to Clerk (fire-and-forget)
    if (this.state.userId) {
      void fetch('/api/pilgrim/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.state.userId,
          document: {
            id: `doc-${Date.now()}-${this.opts.pilgrimIndex}`,
            type: this.state.docType,
            country: stored['f-country-code'] || stored['f-country'] || 'ESP',
            expirationDate: stored['f-expiry'] || '',
            images: [
              ...(this.state.frontImageUrl ? [{ side: 'front', url: this.state.frontImageUrl, uploadedAt: new Date().toISOString() }] : []),
              ...(this.state.backImageUrl  ? [{ side: 'back',  url: this.state.backImageUrl,  uploadedAt: new Date().toISOString() }] : []),
            ],
            verified: this.state.frontBackValid === true,
            uploadedAt: new Date().toISOString(),
            ocrFields: this.state.frontOcrFields ?? {},
          },
        }),
      });
    }

    const completeData: PilgrimCompleteData = {
      userId: this.state.userId ?? '',
      email: this.state.email,
      docType: this.state.docType,
      ocrFields: this.state.frontOcrFields ?? {},
      formData: stored as unknown as Record<string, string>,
      avatarDataUrl: this.state.avatarDataUrl,
      frontImageUrl: this.state.frontImageUrl,
      backImageUrl: this.state.backImageUrl,
      frontBackValid: this.state.frontBackValid ?? false,
    };

    this.state.phase = 'done';
    this.renderPhase();
    this.opts.onComplete?.(completeData);
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function mount(container: HTMLElement, options: PilgrimCardOptions): () => void {
  const island = new PilgrimCardIsland(container, options);
  island.mount();
  return () => island.destroy();
}
