import { subscribe } from 'nanostores';
import {
  dailyGoalKm,
  currentStageProgress,
  remainingDays,
  setDailyGoal,
  setStageProgress,
  syncProgressToServer,
} from '../stores/app';

type Unsub = () => void;
const unsubs: Unsub[] = [];

function setText(el: Element, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

function render() {
  document
    .querySelectorAll("[data-store='dailyGoalKm']")
    .forEach((el) => setText(el, String(dailyGoalKm.get())));
  document
    .querySelectorAll("[data-store='stageProgress']")
    .forEach((el) => setText(el, String(currentStageProgress.get())));
  document
    .querySelectorAll("[data-store='remainingDays']")
    .forEach((el) => setText(el, String(remainingDays.get())));
}

function schedule(fn: () => void | Promise<void>) {
  queueMicrotask(() => {
    void fn();
  });
}

function scheduleSync() {
  const tick = () => void syncProgressToServer();
  const w = window as unknown as { requestIdleCallback?: (fn: () => void) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(tick);
  else setTimeout(tick, 50);
}

function onActionClick(e: Event) {
  const t = e.target as HTMLElement | null;
  if (!t) return;
  const el = t.closest<HTMLElement>('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  if (!action) return;
  schedule(async () => {
    if (action === 'goal:inc') await setDailyGoal(1);
    if (action === 'goal:dec') await setDailyGoal(-1);
    if (action === 'stage:inc') await setStageProgress(5);
    if (action === 'stage:dec') await setStageProgress(-5);
    if (action === 'progress:sync') scheduleSync();
  });
}

export function initStoresBridge() {
  render();
  unsubs.push(subscribe(dailyGoalKm, render));
  unsubs.push(subscribe(currentStageProgress, render));
  unsubs.push(subscribe(remainingDays, render));
  document.addEventListener('click', onActionClick, { passive: true });
}
