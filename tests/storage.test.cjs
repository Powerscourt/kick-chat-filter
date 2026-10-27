const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pure, settings, mockApiHub } = require('./helpers.cjs');
const ns = pure();
test('invalid settings fail open, schema migration is deterministic and unknown versions disabled', () => {
  assert.equal(ns.cleanSettings().mode, 'substring');
  assert.equal(ns.cleanSettings('bad').enabled, false);
  assert.equal(ns.cleanSettings({ schemaVersion: 99, terms: ['ahmet'] }).enabled, false);
  const migrated = ns.cleanSettings({ schemaVersion: 0, blockedTerms: [' AHMet ', 'ahmet'], mode: 'bad' });
  assert.deepEqual(JSON.parse(JSON.stringify(migrated)), settings(['AHMet']));
  assert.equal(ns.cleanSettings({ terms: {}, enabled: false }).terms.length, 0);
});
test('storage.local is canonical and subscriptions update multiple store instances', async () => {
  const hub = mockApiHub();
  const one = ns.createSettingsStore(hub.api), two = ns.createSettingsStore(hub.api);
  const events = [];
  const unsubscribe = two.subscribe(value => events.push(value));
  await one.save(settings([' ahmet ', 'AHMET']));
  assert.deepEqual(Array.from((await two.load()).terms), ['ahmet']);
  assert.equal(events.length, 1);
  const reopened = ns.createSettingsStore(mockApiHub(hub.snapshot()).api);
  assert.deepEqual(Array.from((await reopened.load()).terms), ['ahmet']);
  unsubscribe(); assert.equal(hub.listeners.size, 0);
});
test('storage read and write errors propagate so the UI cannot report a false success', async () => {
  const hub = mockApiHub();
  hub.api.storage.local.get = async () => { throw Error('denied'); };
  hub.api.storage.local.set = async () => { throw Error('quota'); };
  const store = ns.createSettingsStore(hub.api);
  await assert.rejects(store.load(), /denied/);
  await assert.rejects(store.save(settings()), /quota/);
});
