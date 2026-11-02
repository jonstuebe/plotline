import { registerSW } from 'virtual:pwa-register';

type UpdateHandler = () => void;

let handlers: UpdateHandler[] = [];
let update: ((reload?: boolean) => Promise<void>) | null = null;
let pending = false;

/** Don't ask the server for a new version more often than this. */
const CHECK_INTERVAL_MS = 60_000;

/**
 * Registers the service worker and remembers when a new version is waiting.
 * Browsers only look for a new service worker on a page load, which an installed app resumed from the
 * background never does, so this also checks whenever the app comes back to the foreground and hourly.
 */
export function initPwa(): void {
  update = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      handlers.forEach((handler) => handler());
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      let lastCheck = Date.now();
      const check = () => {
        if (pending || !navigator.onLine || Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
        lastCheck = Date.now();
        registration.update().catch(() => {
          // Offline or the server hiccuped; the next check will try again.
        });
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.setInterval(check, 60 * 60_000);
    },
  });
}

/** Calls back when a new version is ready, including one that arrived before subscribing. */
export function onUpdateAvailable(handler: UpdateHandler): () => void {
  handlers.push(handler);
  if (pending) handler();
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}

/** Activates the waiting service worker and reloads into the new version. */
export function applyUpdate(): void {
  void update?.(true);
}
