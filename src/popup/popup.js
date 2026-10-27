(() => {
  'use strict';
  const ns = globalThis.KCF;
  let t = ns.translations.en;
  let feedbackKey = '';
  const api = globalThis.browser || globalThis.chrome;
  const store = ns.createSettingsStore(api);
  const $ = id => document.getElementById(id);
  let settings;
  let saving = false;
  let revision = 0;
  function localize(language = 'en') {
    t = ns.translations[language];
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t[el.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t[el.dataset.i18nAria]); });
    $('term').placeholder = t.termLabel;
    $('language').setAttribute('aria-label', `${t.language}: Türkçe`);
    $('language').title = `${t.language}: English / Türkçe`;
    feedback(feedbackKey);
  }
  function feedback(key) { feedbackKey = key; $('feedback').textContent = t[key] || ''; }
  localize();
  function render() {
    localize(settings.language);
    $('language').setAttribute('aria-checked', String(settings.language === 'tr'));
    $('enabled').checked = settings.enabled;
    $('mode').value = settings.mode;
    $('terms').replaceChildren();
    $('empty').hidden = settings.terms.length > 0;
    for (const term of settings.terms) {
      const li = document.createElement('li');
      const span = document.createElement('span'); span.textContent = term;
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = t.remove;
      button.setAttribute('aria-label', `${t.remove}: ${term}`);
      button.addEventListener('click', async () => {
        if (await save(current => ({ ...current, terms: current.terms.filter(value => ns.normalize(value) !== ns.normalize(term)) }), 'removed')) {
          $('term').focus();
        }
      });
      li.append(span, button); $('terms').append(li);
    }
    document.querySelectorAll('input, button, select').forEach(el => { el.disabled = saving; });
    void refreshStatus();
  }
  async function save(change, message = 'saved') {
    if (saving || !settings) return false;
    saving = true; render();
    let ok = false;
    try {
      const latest = await store.load();
      settings = await store.save(change(latest));
      feedback(message); ok = true;
    } catch { feedback('saveError'); }
    finally { saving = false; render(); void refreshStatus(); }
    return ok;
  }
  $('add-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !settings) return;
    const term = $('term').value.trim().normalize('NFC');
    if (!term) { feedback('emptyInput'); $('term').focus(); return; }
    if (settings.terms.some(value => ns.normalize(value) === ns.normalize(term))) {
      feedback('duplicate'); return;
    }
    if (await save(current => ({ ...current, terms: [...current.terms, term] }), 'added')) $('term').value = '';
    $('term').focus();
  });
  function showSettings(open) {
    $('home-panel').hidden = open;
    $('settings-panel').hidden = !open;
    $('settings-button').setAttribute('aria-expanded', String(open));
  }
  $('settings-button').addEventListener('click', () => { showSettings($('settings-panel').hidden); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('settings-panel').hidden) {
      event.preventDefault();
      showSettings(false);
      $('settings-button').focus();
    }
  });
  $('language').addEventListener('click', () => { void save(value => ({ ...value, language: value.language === 'en' ? 'tr' : 'en' })); });
  $('enabled').addEventListener('change', () => { const enabled = $('enabled').checked; void save(value => ({ ...value, enabled })); });
  $('mode').addEventListener('change', () => { const mode = $('mode').value; void save(value => ({ ...value, mode })); });
  async function refreshStatus() {
    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { $('context').textContent = t.unsupported; $('count').textContent = ''; return; }
      // No tabs/activeTab permission: messaging needs neither, and no tab URL is read.
      const status = await api.tabs.sendMessage(tab.id, { type: 'kcf:status' });
      $('context').textContent = status.storageError ? t.storageError : !status.enabled ? t.disabled
        : status.state === 'selector-issue' ? t.selectorIssue : status.state === 'active' ? t.active : t.waiting;
      $('count').textContent = t.count + status.hiddenNow;
    } catch { $('context').textContent = t.unavailable; $('count').textContent = ''; }
  }
  const unsubscribe = store.subscribe(value => { revision++; settings = value; render(); });
  const loadedAt = revision;
  store.load().then(value => { if (revision === loadedAt) settings = value; render(); })
    .catch(() => { feedback('loadError'); });
  void refreshStatus();
  const timer = setInterval(refreshStatus, 1000);
  window.addEventListener('pagehide', () => { clearInterval(timer); unsubscribe(); }, { once: true });
})();
