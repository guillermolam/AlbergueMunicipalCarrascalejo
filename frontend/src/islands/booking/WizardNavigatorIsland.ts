/**
 * WizardNavigatorIsland — Step orchestration and sidebar animation.
 *
 * Owns goToStep(), updateUI(), the progress bar, sidebar circles, and the
 * bottom Back / Next button wiring.  All per-step side effects are injected
 * via the `WizardNavigatorOptions.steps` callback map so this island remains
 * decoupled from step-specific islands.
 *
 * Extracted from the inline <script> block in book.astro (goToStep,
 * visibleStep, updateUI, canProceed, enableNext).
 */

import {
  bookingWizardStore,
  setWizardStep,
  setCanProceed,
  WIZARD_STEPS,
  TOTAL_STEPS,
  visibleStep,
  nextStep as wizNextStep,
  prevStep as wizPrevStep,
} from '../../stores/bookingWizardStore';
import { bookingDatesStore as datesStore } from '../../stores/bookingDatesStore';

export interface WizardNavigatorOptions {
  /**
   * Per-step callbacks called when the navigator *enters* that step.
   * Key is the internal step number (1-7).
   */
  onEnter?: Partial<Record<number, (dir: 'forward' | 'back') => void>>;
  /**
   * Per-step canProceed overrides.
   * Return true/false synchronously; if omitted the island uses built-in logic.
   */
  canProceed?: Partial<Record<number, () => boolean>>;
}

export function initWizardNavigatorIsland(opts: WizardNavigatorOptions = {}): void {
  // ── DOM refs ──
  const progFill       = document.getElementById('prog-fill');
  const progText       = document.getElementById('prog-text');
  const progPct        = document.getElementById('prog-pct');
  const mobileStepLabel = document.getElementById('mobile-step-label');
  const btnBack        = document.getElementById('btn-back')   as HTMLButtonElement | null;
  const btnNext        = document.getElementById('btn-next')   as HTMLButtonElement | null;
  const wizNav         = document.getElementById('wiz-nav');

  // ── Local step state (mirrors bookingWizardStore) ──
  let currentStep = bookingWizardStore.get().currentStep;

  // ── Built-in canProceed logic ──
  function defaultCanProceed(): boolean {
    const s = datesStore.get();
    switch (currentStep) {
      case 1:
        return !!(s.checkin && s.checkout);
      case 2:
        // Delegated to IdUploadIsland / PilgrimCardIsland via onCanProceedChange callback;
        // return false here — those islands call enableNext() directly.
        return false;
      case 3:
        return true;
      case 4:
        return !!(s.bed);
      case 5:
      case 6:
        return true;
      default:
        return false;
    }
  }

  function resolveCanProceed(): boolean {
    const override = opts.canProceed?.[currentStep];
    return override ? override() : defaultCanProceed();
  }

  function enableNext(yes: boolean): void {
    if (btnNext) btnNext.disabled = !yes;
    setCanProceed(yes);
  }

  // ── Sidebar step button painter (extracted to reduce cognitive complexity) ──
  function paintStepBtn(btn: HTMLElement, step: number): void {
    const circle = btn.querySelector('.step-circle');
    const num    = btn.querySelector('.step-num');
    const lbl    = btn.querySelector('.step-label');
    const dot    = btn.querySelector('.step-dot');
    const bg     = circle?.querySelector('svg > circle:first-child')  as SVGCircleElement | null;
    const ring   = circle?.querySelector('svg > circle:nth-child(2)') as SVGCircleElement | null;

    if (step < currentStep) {
      // Done
      circle?.classList.remove('active', 'done');
      circle?.classList.add('done');
      if (lbl) lbl.textContent = '✓ ' + (lbl.textContent ?? '').replace('✓ ', '');
      lbl?.classList.add('active');
      num?.classList.remove('inactive');
      dot?.classList.remove('active');
      if (bg)   { bg.setAttribute('fill', '#e8f5e9'); bg.setAttribute('stroke', '#00ab39'); }
      if (ring) ring.setAttribute('stroke', 'rgba(0,171,57,0.15)');
    } else if (step === currentStep) {
      // Active
      circle?.classList.add('active');
      circle?.classList.remove('done');
      lbl?.classList.add('active');
      num?.classList.remove('inactive');
      if (dot) { dot.classList.add('active'); (dot as HTMLElement).style.display = ''; }
      if (bg)   { bg.setAttribute('fill', '#00ab39'); bg.setAttribute('stroke', '#005a1e'); bg.setAttribute('stroke-width', '2.5'); }
      if (ring) ring.setAttribute('stroke', 'rgba(255,255,255,0.2)');
    } else {
      // Future
      circle?.classList.remove('active', 'done');
      lbl?.classList.remove('active');
      num?.classList.add('inactive');
      dot?.classList.remove('active');
      if (bg)   { bg.setAttribute('fill', '#FFF9F0'); bg.setAttribute('stroke', '#D4A574'); bg.setAttribute('stroke-width', '2'); }
      if (ring) ring.setAttribute('stroke', 'rgba(212,165,116,0.15)');
    }
  }

  // ── updateUI ──
  function updateUI(): void {
    const cfg = WIZARD_STEPS[currentStep - 1];
    if (!cfg) return;
    const vStep = visibleStep(currentStep);

    // Progress bar
    if (progFill)        progFill.style.width = `${cfg.pct}%`;
    if (progText)        progText.textContent = `Step ${vStep} of 6`;
    if (progPct)         progPct.textContent  = `${cfg.pct}% Complete`;
    if (mobileStepLabel) mobileStepLabel.textContent = `Step ${vStep} of 6`;

    // Nav bar — hide entirely on the final confirmation step
    if (currentStep === TOTAL_STEPS) {
      if (wizNav) wizNav.style.display = 'none';
      return;
    }
    if (wizNav) wizNav.style.display = '';

    // Back button — show with label, or hide on step 1
    if (btnBack) {
      if (cfg.back) {
        btnBack.style.display = '';
        const lbl = btnBack.querySelector('.nav-btn-label') as HTMLElement | null;
        if (lbl) lbl.textContent = cfg.back;
      } else {
        btnBack.style.display = 'none';
      }
    }

    // Next button — hide on step 6 (Summary) where btn-confirm is the CTA
    if (btnNext) {
      const isSummaryStep = currentStep === 6;
      btnNext.style.display = isSummaryStep ? 'none' : '';
      const lbl = btnNext.querySelector('.nav-btn-label') as HTMLElement | null;
      if (lbl) lbl.textContent = cfg.label;
    }

    // Sidebar circles — set SVG attrs directly (CSS cascade unreliable with SVG filters)
    document.querySelectorAll<HTMLElement>('.step-btn').forEach((btn) => {
      const s = Number.parseInt(btn.dataset.step ?? '0', 10);
      paintStepBtn(btn, s);
    });

    enableNext(resolveCanProceed());
  }

  // ── goToStep ──
  // Callers are responsible for resolving skip-steps via wizNextStep/wizPrevStep.
  // goToStep animates the transition to the given step number directly.
  function goToStep(next: number, dir: 'forward' | 'back' = 'forward'): void {
    const currentPanel = document.getElementById(`step-${currentStep}`);
    const nextPanel    = document.getElementById(`step-${next}`);
    if (!currentPanel || !nextPanel) return;

    currentPanel.style.animation =
      dir === 'forward'
        ? 'step-exit 280ms ease forwards'
        : 'step-exit-back 280ms ease forwards';

    setTimeout(() => {
      currentPanel.classList.add('hidden');
      currentPanel.style.animation = '';

      currentStep = next;
      setWizardStep(next, dir);

      nextPanel.classList.remove('hidden');
      nextPanel.style.animation =
        dir === 'forward'
          ? 'step-enter 380ms cubic-bezier(0.34,1.56,0.64,1) forwards'
          : 'step-enter-back 380ms cubic-bezier(0.34,1.56,0.64,1) forwards';

      // Per-step callbacks
      opts.onEnter?.[next]?.(dir);

      updateUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 260);
  }

  // ── Wire nav buttons ──

  btnNext?.addEventListener('click', () => {
    if (btnNext.disabled) return;
    if (currentStep < TOTAL_STEPS) goToStep(wizNextStep(currentStep), 'forward');
  });

  btnBack?.addEventListener('click', () => {
    if (currentStep > 1) goToStep(wizPrevStep(currentStep), 'back');
  });

  // ── Wire sidebar step buttons ──
  document.querySelectorAll<HTMLElement>('.step-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = Number.parseInt(btn.dataset.step ?? '0', 10);
      if (!target || target === currentStep) return;
      // Only allow navigating back (not jumping forward)
      if (target < currentStep) goToStep(target, 'back');
    });
  });

  // ── Expose enableNext for use by child islands ──
  // window.__wizEnableNext is declared on the Window interface (env.d.ts / global.d.ts)
  // so this assignment is fully type-safe without any cast.
  window.__wizEnableNext = enableNext;

  // ── Subscribe to wizard store (step changes from external sources) ──
  bookingWizardStore.subscribe((state) => {
    if (state.currentStep !== currentStep) {
      currentStep = state.currentStep;
      updateUI();
    }
  });

  // ── Subscribe to dates store — re-evaluate canProceed reactively ──
  // When on step 1 (dates) or step 4 (beds), store changes should update
  // the Next button without requiring explicit onCanProceed callbacks.
  datesStore.subscribe(() => {
    enableNext(resolveCanProceed());
  });

  // ── Initial render ──
  updateUI();
}
