const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, load, root, mockApiHub, tick } = require('./helpers.cjs');
test('keyboard submission, literal text, deduplication, removal and storage failures are visible and safe', async t => {
  const f = fixture(fs.readFileSync(path.join(root, 'src/popup/popup.html'), 'utf8'));
  t.after(() => { f.window.dispatchEvent(new f.window.Event('pagehide')); f.window.close(); });
  const hub = mockApiHub(); f.window.chrome = hub.api;
  load(f.dom.getInternalVMContext(), ['src/shared/strings.js', 'src/popup/popup.js']); await tick();
  const get = id => f.document.getElementById(id);
  const submit = async text => { get('term').value = text; get('add-form').dispatchEvent(new f.window.Event('submit', { cancelable: true })); await tick(); };
  assert.equal(get('empty').hidden, false);
  await submit(' '); assert.match(get('feedback').textContent, /Please enter/);
  await submit(' Ahmet '); assert.equal(get('terms').children.length, 1);
  await submit('ahmet'); assert.match(get('feedback').textContent, /already/);
  await submit('<img src=x onerror=alert(1)>');
  assert.equal(get('terms').querySelectorAll('img').length, 0);
  assert.equal(get('terms').children.length, 2);
  get('terms').querySelector('button').click(); await tick(); assert.equal(get('terms').children.length, 1);
  hub.api.storage.local.set = async () => { throw Error('quota'); };
  await submit('fail'); assert.match(get('feedback').textContent, /Could not save/);
  assert.equal(get('terms').children.length, 1);
  assert.equal(get('term').value, 'fail');
});


test('English is the default and switching to Turkish persists across popup reopening without changing filter rules', async t => {
  const hub = mockApiHub();
  function open() {
    const f = fixture(fs.readFileSync(path.join(root, 'src/popup/popup.html'), 'utf8'));
    f.window.chrome = hub.api;
    load(f.dom.getInternalVMContext(), ['src/shared/strings.js', 'src/popup/popup.js']);
    t.after(() => { f.window.dispatchEvent(new f.window.Event('pagehide')); f.window.close(); });
    return f;
  }
  const first = open(); await tick();
  const get = id => first.document.getElementById(id);
  assert.equal(first.document.documentElement.lang, 'en');
  assert.equal(get('add').textContent, 'Add');
  get('term').value = 'Ahmet'; get('add-form').dispatchEvent(new first.window.Event('submit', { cancelable: true })); await tick();
  get('language').click(); await tick();
  assert.equal(first.document.documentElement.lang, 'tr');
  assert.equal(get('add').textContent, 'Ekle');
  assert.equal(get('feedback').textContent, 'Kaydedildi.');
  assert.equal(get('terms').querySelector('button').textContent, 'Kaldır');
  assert.equal(first.document.querySelector('.status').getAttribute('aria-label'), 'Sohbet durumu');
  assert.match(get('context').textContent, /Sekmeye/);
  assert.deepEqual(hub.snapshot().kcfSettings.terms, ['Ahmet']);
  const second = open(); await tick();
  assert.equal(second.document.documentElement.lang, 'tr');
  assert.equal(second.document.getElementById('language').getAttribute('aria-checked'), 'true');
  get('language').click(); await tick();
  assert.equal(second.document.documentElement.lang, 'en', 'open popups follow the saved language');
  assert.equal(get('feedback').textContent, 'Saved.');
});


test('home stays focused on filtering and settings saves matching mode without losing a keyword draft', async t => {
  const f = fixture(fs.readFileSync(path.join(root, 'src/popup/popup.html'), 'utf8'));
  t.after(() => { f.window.dispatchEvent(new f.window.Event('pagehide')); f.window.close(); });
  const hub = mockApiHub(); f.window.chrome = hub.api;
  load(f.dom.getInternalVMContext(), ['src/shared/strings.js', 'src/popup/popup.js']); await tick();
  const get = id => f.document.getElementById(id);
  assert.equal(get('home-panel').hidden, false);
  assert.equal(get('settings-panel').hidden, true);
  assert.equal(get('mode').closest('section').id, 'settings-panel');
  assert.equal(f.document.querySelector('[data-i18n="subtitle"]').textContent, 'Hide chat messages');
  get('term').value = 'unfinished phrase';
  get('settings-button').click();
  assert.equal(get('home-panel').hidden, true);
  assert.equal(get('settings-panel').hidden, false);
  assert.equal(get('settings-button').getAttribute('aria-expanded'), 'true');
  get('mode').value = 'whole-word'; get('mode').dispatchEvent(new f.window.Event('change')); await tick();
  assert.equal(hub.snapshot().kcfSettings.mode, 'whole-word');
  assert.equal(get('settings-panel').hidden, false, 'saving must not force the user back home');
  get('language').click(); await tick();
  assert.equal(get('settings-heading').textContent, 'Ayarlar');
  assert.equal(get('settings-button').getAttribute('aria-label'), 'Ayarlar');
  f.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(get('home-panel').hidden, false);
  assert.equal(get('settings-panel').hidden, true);
  assert.equal(get('term').value, 'unfinished phrase');
  assert.equal(f.document.activeElement.id, 'settings-button');
});
