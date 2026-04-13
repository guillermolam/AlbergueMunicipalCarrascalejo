/**
 * Wizard orchestration store for the /book booking flow.
 *
 * Tracks the current step, per-step completion status, and navigation direction.
 * Drives the sidebar step buttons, progress bar, and bottom nav button labels.
 *
 * Effective visible flow (step 3 is auto-skipped, merged into step 2):
 *   1 → 2 → (3 skip) → 4 → 5 → 6 → 7
 */
import { map } from 'nanostores';

export type StepStatus = 'idle' | 'active' | 'done' | 'error';
export type NavDirection = 'forward' | 'back';

export interface WizardStepConfig {
  /** 0–100 progress percentage for this step */
  pct: number;
  /** Label on the "next" button */
  label: string;
  /** Label on the "back" button, or null if this is the first step */
  back: string | null;
}

/** The 7 internal step configs (step 3 is skipped automatically). */
export const WIZARD_STEPS: WizardStepConfig[] = [
  { pct: 17,  label: 'Continue to Peregrinos →',    back: null },
  { pct: 33,  label: 'Continue to Bed Selection →', back: '← Back to Dates' },
  { pct: 33,  label: 'Continue to Bed Selection →', back: '← Back to Dates' }, // step 3 — auto-skipped
  { pct: 50,  label: 'Continue to Payment →',       back: '← Back to Peregrinos' },
  { pct: 67,  label: 'Continue to Summary →',       back: '← Back to Bed Selection' },
  { pct: 83,  label: 'Confirm Booking',              back: '← Back to Payment' },
  { pct: 100, label: '',                             back: null },
];

export interface WizardState {
  /** Current internal step (1–7; 3 is skipped). */
  currentStep: number;
  /** Whether the "next" button is enabled for the current step. */
  canProceed: boolean;
  /** Last navigation direction — used for animation classes. */
  direction: NavDirection;
  /** Per-step completion flags (index = step - 1). */
  stepStatus: StepStatus[];
}

const initialState: WizardState = {
  currentStep: 1,
  canProceed: false,
  direction: 'forward',
  stepStatus: Array(7).fill('idle') as StepStatus[],
};

export const bookingWizardStore = map<WizardState>(initialState);

// ── Actions ──────────────────────────────────────────────────────────────────

/** Set the current step and update the status of the previous step. */
export function setWizardStep(step: number, dir: NavDirection = 'forward'): void {
  const prev = bookingWizardStore.get().currentStep;
  const statuses = [...bookingWizardStore.get().stepStatus] as StepStatus[];
  if (dir === 'forward' && prev !== step) statuses[prev - 1] = 'done';
  statuses[step - 1] = 'active';
  bookingWizardStore.set({
    ...bookingWizardStore.get(),
    currentStep: step,
    direction: dir,
    stepStatus: statuses,
  });
}

/** Enable or disable the "next" button for the current step. */
export function setCanProceed(can: boolean): void {
  bookingWizardStore.setKey('canProceed', can);
}

/** Map internal step index (1-7, 3 skipped) to visible step number (1-6). */
export function visibleStep(s: number): number {
  if (s <= 2) return s;
  if (s === 3) return 2; // auto-skipped, same visible as step 2
  return s - 1;         // 4→3, 5→4, 6→5, 7→6
}

/** Steps that are auto-skipped (merged into their predecessor). */
const SKIPPED_STEPS = new Set([3]);

/** Total internal steps (1-based). */
export const TOTAL_STEPS = WIZARD_STEPS.length;

/** Next navigable step going forward (skips hidden steps). */
export function nextStep(current: number): number {
  let s = current + 1;
  while (s <= TOTAL_STEPS && SKIPPED_STEPS.has(s)) s++;
  return Math.min(s, TOTAL_STEPS);
}

/** Previous navigable step going back (skips hidden steps). */
export function prevStep(current: number): number {
  let s = current - 1;
  while (s >= 1 && SKIPPED_STEPS.has(s)) s--;
  return Math.max(s, 1);
}

/** Whether a step is the final visible step before confirmation. */
export function isFinalStep(current: number): boolean {
  return current === TOTAL_STEPS;
}

/** Reset wizard to initial state (e.g. after a confirmed booking). */
export function resetWizard(): void {
  bookingWizardStore.set({ ...initialState, stepStatus: Array(7).fill('idle') as StepStatus[] });
}
