/**
 * Per-pilgrim document upload state for Step 2 of the booking wizard.
 * Uses nanostores map (in-memory only — File objects cannot be serialized).
 */
import { map } from 'nanostores';
import type { ExtractedFields, CvInfo } from '../lib/ocr';

export interface PilgrimDocState {
  docType: string | null;
  phase: 'cards' | 'upload';
  frontValid: boolean | null;
  backValid: boolean | null;
  validationError: string | null;
  avatarDataUrl: string | null;
  frontOcrFields: ExtractedFields | null;
  backOcrFields: ExtractedFields | null;
  frontCvInfo: CvInfo | null;
  backCvInfo: CvInfo | null;
  // Note: File objects can't be serialized, store them in memory only
}

// In-memory file storage (not serializable to JSON)
export interface PilgrimFileState {
  frontFile: File | null;
  backFile: File | null;
}

export const MAX_UPLOAD_PILGRIMS = 10;

const emptyDocState = (): PilgrimDocState => ({
  docType: null,
  phase: 'cards',
  frontValid: null,
  backValid: null,
  validationError: null,
  avatarDataUrl: null,
  frontOcrFields: null,
  backOcrFields: null,
  frontCvInfo: null,
  backCvInfo: null,
});

// Per-pilgrim nanostores maps (one per slot)
export const pilgrimDocStores = Array.from({ length: MAX_UPLOAD_PILGRIMS }, () =>
  map<PilgrimDocState>(emptyDocState())
);

// In-memory file references (File objects can't be in nanostores)
export const pilgrimFiles: PilgrimFileState[] = Array.from({ length: MAX_UPLOAD_PILGRIMS }, () => ({
  frontFile: null,
  backFile: null,
}));

export function resetDocStores(count: number): void {
  for (let i = 0; i < MAX_UPLOAD_PILGRIMS; i++) {
    pilgrimDocStores[i].set(emptyDocState());
    pilgrimFiles[i] = { frontFile: null, backFile: null };
  }
  // Suppress unused-parameter lint while keeping the signature intentional
  void count;
}

export function getPilgrimDocState(idx: number): PilgrimDocState {
  return pilgrimDocStores[Math.min(idx, MAX_UPLOAD_PILGRIMS - 1)].get();
}

export function updatePilgrimDocState(idx: number, patch: Partial<PilgrimDocState>): void {
  const store = pilgrimDocStores[Math.min(idx, MAX_UPLOAD_PILGRIMS - 1)];
  store.set({ ...store.get(), ...patch });
}
