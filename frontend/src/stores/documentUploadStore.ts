/**
 * Per-pilgrim state for the DocumentUploadIsland flow.
 * Each pilgrim goes through: login → checking → (verified | doctype → upload)
 */
import { map } from 'nanostores';
import type { PilgrimDocument } from '../pages/api/pilgrim/documents';

export type DocumentUploadPhase =
  | 'login'      // Waiting for email / OAuth sign-in
  | 'checking'   // Calling /api/pilgrim/link-by-email + /api/pilgrim/documents
  | 'verified'   // Valid existing document found in Clerk private_metadata
  | 'doctype'    // Prompting pilgrim to choose DNI or Passport
  | 'upload'     // Actively uploading / validating images
  | 'complete';  // Upload + OCR done, pilgrim step finished

export interface DocumentUploadState {
  phase: DocumentUploadPhase;
  /** Clerk userId for this pilgrim (null until linked). */
  userId: string | null;
  /** Email used to link / create the Clerk account. */
  email: string | null;
  /** Documents retrieved from Clerk private_metadata.documents. */
  existingDocuments: PilgrimDocument[];
  /** The document the pilgrim chose to use (from existing OR newly uploaded). */
  selectedDocument: PilgrimDocument | null;
  /** doc type chosen in the 'doctype' phase */
  chosenDocType: 'dni' | 'passport' | null;
  /** Generic error message shown to the user. */
  error: string | null;
  /** True when loading (spinner visible). */
  loading: boolean;
}

export const MAX_PILGRIMS = 10;

const emptyState = (): DocumentUploadState => ({
  phase: 'login',
  userId: null,
  email: null,
  existingDocuments: [],
  selectedDocument: null,
  chosenDocType: null,
  error: null,
  loading: false,
});

/** One nanostore map per pilgrim slot. */
export const documentUploadStores = Array.from({ length: MAX_PILGRIMS }, () =>
  map<DocumentUploadState>(emptyState())
);

export function resetDocumentUploadStores(count: number): void {
  for (let i = 0; i < MAX_PILGRIMS; i++) {
    documentUploadStores[i].set(emptyState());
  }
  void count;
}

export function getDocumentUploadState(idx: number): DocumentUploadState {
  return documentUploadStores[Math.min(idx, MAX_PILGRIMS - 1)].get();
}

export function updateDocumentUploadState(
  idx: number,
  patch: Partial<DocumentUploadState>
): void {
  const store = documentUploadStores[Math.min(idx, MAX_PILGRIMS - 1)];
  store.set({ ...store.get(), ...patch });
}
