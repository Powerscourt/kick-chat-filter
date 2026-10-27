(() => {
  'use strict';
  const ns = globalThis.KCF;
  const SETTINGS_KEY = 'kcfSettings';
  function cleanSettings(value) {
    const defaults = { schemaVersion: 1, enabled: true, terms: [], mode: 'substring', language: 'en' };
    if (value === undefined || value === null) return defaults;
    if (typeof value !== 'object' || Array.isArray(value)) return { ...defaults, enabled: false };
    if (value.schemaVersion !== undefined && value.schemaVersion !== 0 && value.schemaVersion !== 1) {
      return { ...defaults, enabled: false };
    }
    return {
      schemaVersion: 1,
      enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
      terms: ns.sanitizeTerms(value.terms ?? value.blockedTerms),
      mode: value.mode === 'whole-word' ? 'whole-word' : 'substring',
      language: value.language === 'tr' ? 'tr' : 'en'
    };
  }
  function createSettingsStore(api) {
    return {
      async load() {
        const data = await api.storage.local.get(SETTINGS_KEY);
        return cleanSettings(data[SETTINGS_KEY]);
      },
      async save(value) {
        const settings = cleanSettings(value);
        await api.storage.local.set({ [SETTINGS_KEY]: settings });
        return settings;
      },
      subscribe(callback) {
        const listener = (changes, area) => {
          if (area === 'local' && Object.hasOwn(changes, SETTINGS_KEY)) {
            callback(cleanSettings(changes[SETTINGS_KEY].newValue));
          }
        };
        api.storage.onChanged.addListener(listener);
        return () => api.storage.onChanged.removeListener(listener);
      }
    };
  }
  Object.assign(ns, { SETTINGS_KEY, cleanSettings, createSettingsStore });
})();
