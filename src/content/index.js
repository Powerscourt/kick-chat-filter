(() => {
  'use strict';
  const ns = globalThis.KCF;
  if (ns.booted) return;
  ns.booted = true;
  const api = globalThis.browser || globalThis.chrome;
  const store = ns.createSettingsStore(api);
  let controller = null;
  let revision = 0;
  let storageError = false;
  let current = ns.cleanSettings();
  let stopped = false;
  const unsubscribe = store.subscribe(value => {
    revision++;
    storageError = false;
    current = value;
    controller?.updateSettings(value);
  });
  const listener = (message, sender, respond) => {
    if (message?.type !== 'kcf:status') return;
    respond({ ...(controller?.status() || { state: 'waiting', hiddenNow: 0 }),
      enabled: current.enabled, storageError, liveValidation: 'pending' });
  };
  api.runtime.onMessage.addListener(listener);
  const loadedAt = revision;
  store.load().then(value => {
    if (revision === loadedAt) current = value;
  }).catch(() => {
    if (revision === loadedAt) { storageError = true; current = ns.cleanSettings({ enabled: false }); }
  }).finally(() => {
    if (stopped) return;
    controller = ns.createFilterController({ window, document, settings: current });
    controller.start();
  });
  function onPageHide() {
    stopped = true;
    controller?.stop();
  }
  function onPageShow() {
    stopped = false;
    controller?.start();
  }
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  // Kept for explicit teardown during development; no page-world access.
  ns.dispose = () => {
    stopped = true; controller?.stop(); unsubscribe();
    api.runtime.onMessage.removeListener(listener);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
  };
})();
