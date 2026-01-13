import Alpine from 'alpinejs';
import { initRough } from './runtime_rough';
import { initStoresBridge } from './runtime_stores_bridge';

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

window.Alpine = Alpine;

function onIdle(cb: () => void) {
  const w = window as unknown as { requestIdleCallback?: (fn: () => void) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(cb);
  else setTimeout(cb, 1);
}

function bootstrap() {
  Alpine.start();
  queueMicrotask(() => initStoresBridge());
  requestAnimationFrame(() => initRough());
  onIdle(() => {
    document.dispatchEvent(new CustomEvent('app:ready'));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
