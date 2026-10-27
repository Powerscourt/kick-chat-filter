const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, settings, tick, load, mockApiHub } = require('./helpers.cjs');
function setup(t) {
  const f = fixture();
  const controller = f.ns.createFilterController({ ...f, settings: settings(), pollMs: 15 });
  const root = f.ns.kickAdapter.findRoot(f.document);
  t.after(() => { controller.stop(); f.window.close(); });
  controller.start();
  return { ...f, controller, root, rows: () => f.ns.kickAdapter.rows(root) };
}
test('body extraction excludes username, timestamp, badges and emote names', t => {
  const { ns, root, rows } = setup(t);
  assert.equal(ns.kickAdapter.extractText(ns.kickAdapter.bodyFor(rows()[1], root)), 'Merhaba arkadaşlar');
  assert.equal(ns.kickAdapter.extractText(ns.kickAdapter.bodyFor(rows()[3], root)), 'ah met İzmir');
});
test('initial backlog hides complete matching rows, keeps clean username matches and non-chat controls visible', t => {
  const { controller, rows, document } = setup(t);
  assert.equal(rows()[0].getAttribute('data-kcf-hidden'), '1');
  assert.equal(rows()[1].hasAttribute('data-kcf-hidden'), false);
  assert.equal(controller.status().hiddenNow, 2);
  assert.equal(document.querySelectorAll('[data-kcf-hidden]').length, 2);
  assert.equal(document.querySelector('.pinned').hasAttribute('data-kcf-hidden'), false);
  assert.equal(document.querySelector('[contenteditable]').hasAttribute('data-kcf-hidden'), false);
});
test('new messages, in-place text edits and recycled row content reconcile without duplicate counts', async t => {
  const { controller, ns, root, rows } = setup(t);
  const newRow = rows()[0].cloneNode(true); newRow.removeAttribute('data-kcf-hidden'); newRow.dataset.index = '4';
  root.firstElementChild.append(newRow); await tick();
  assert.equal(controller.status().hiddenNow, 3);
  const body = ns.kickAdapter.bodyFor(newRow, root);
  body.firstChild.data = 'Merhaba'; await tick();
  assert.equal(newRow.hasAttribute('data-kcf-hidden'), false);
  body.firstChild.data = 'Ahmet'; newRow.dataset.index = '5'; await tick();
  assert.equal(controller.status().hiddenNow, 3);
  for (let i = 0; i < 5; i++) body.firstChild.data = 'Ahmet';
  await tick(); assert.equal(controller.status().hiddenNow, 3);
  newRow.remove(); await tick();
  assert.equal(controller.status().hiddenNow, 2);
  assert.equal(newRow.hasAttribute('data-kcf-hidden'), false);
  assert.equal(controller.status().pendingRows, 0);
});
test('settings updates restore still-mounted messages and whole-word mode preserves suffix messages', t => {
  const { controller, rows } = setup(t);
  controller.updateSettings(settings(['ahmet'], { mode: 'whole-word' }));
  assert.equal(controller.status().hiddenNow, 1);
  assert.equal(rows()[2].hasAttribute('data-kcf-hidden'), false);
  controller.updateSettings(settings(['ahmet'], { enabled: false }));
  assert.equal(controller.status().hiddenNow, 0);
  controller.updateSettings(settings(['merhaba'])); assert.equal(controller.status().hiddenNow, 1);
  controller.updateSettings(settings([])); assert.equal(controller.status().hiddenNow, 0);
});
test('unknown or changed markup fails open and restores previously hidden rows', async t => {
  const { controller, rows, ns, root } = setup(t);
  ns.kickAdapter.bodyFor(rows()[0], root).className = 'new-body-shape'; await tick();
  assert.equal(rows()[0].hasAttribute('data-kcf-hidden'), false);
  assert.equal(controller.status().state, 'selector-issue');
  root.firstElementChild.className = 'unknown-wrapper'; await tick();
  assert.equal(root.querySelectorAll('[data-kcf-hidden]').length, 0);
  controller.updateSettings(settings([], { enabled: false }));
  assert.equal(controller.status().hiddenNow, 0);
});
test('replaced root, late mount and SPA navigation never accumulate observers or retain old hidden nodes', async t => {
  const { window, root, controller, document } = setup(t);
  const replacement = root.cloneNode(true);
  replacement.querySelectorAll('[data-kcf-hidden]').forEach(row => row.removeAttribute('data-kcf-hidden'));
  root.replaceWith(replacement); await tick();
  assert.equal(root.querySelectorAll('[data-kcf-hidden]').length, 0);
  assert.equal(replacement.querySelectorAll('[data-kcf-hidden]').length, 2);
  window.history.pushState({}, '', '/other-channel'); await tick();
  assert.equal(controller.status().observers, 1);
  replacement.remove(); await tick(); assert.equal(controller.status().state, 'waiting');
  assert.equal(controller.status().observers, 0);
  document.body.append(replacement); await tick(); assert.equal(controller.status().hiddenNow, 2);
  controller.start(); assert.equal(controller.status().observers, 1);
  controller.stop(); assert.equal(controller.status().hiddenNow, 0);
  assert.equal(controller.status().pendingRows, 0);
});
test('two content-script tabs react to the same storage event and unsubscribe on disposal', async t => {
  const hub = mockApiHub({ kcfSettings: settings() });
  const tabs = [fixture(), fixture()];
  t.after(() => tabs.forEach(f => { f.ns.dispose(); f.window.close(); }));
  for (const f of tabs) { f.window.chrome = hub.api; load(f.dom.getInternalVMContext(), ['src/content/index.js']); }
  await tick();
  assert.equal(hub.listeners.size, 2);
  for (const f of tabs) assert.equal(f.document.querySelectorAll('[data-kcf-hidden]').length, 2);
  await tabs[0].ns.createSettingsStore(hub.api).save(settings([], { enabled: false }));
  for (const f of tabs) assert.equal(f.document.querySelectorAll('[data-kcf-hidden]').length, 0);
  tabs[0].ns.dispose(); assert.equal(hub.listeners.size, 1);
});
test('newer storage event wins over a slow initial read and read failures leave chat visible', async t => {
  for (const fail of [false, true]) {
    const f = fixture(), hub = mockApiHub();
    let resolveRead;
    hub.api.storage.local.get = () => fail ? Promise.reject(Error('unavailable')) : new Promise(resolve => { resolveRead = resolve; });
    f.window.chrome = hub.api; load(f.dom.getInternalVMContext(), ['src/content/index.js']);
    if (!fail) {
      await hub.api.storage.local.set({ kcfSettings: settings([], { enabled: false }) });
      resolveRead({ kcfSettings: settings() });
    }
    await tick();
    assert.equal(f.document.querySelectorAll('[data-kcf-hidden]').length, 0);
    f.ns.dispose(); f.window.close();
  }
});

test('verified action-menu sibling never joins body text and does not disable ordinary rows', async t => {
  const { controller, rows, document } = setup(t);
  const menu = document.createElement('div');
  menu.className = 'absolute hidden';
  const button = document.createElement('button'); button.textContent = 'ahmet action'; menu.append(button);
  rows()[1].firstElementChild.append(menu); await tick();
  assert.equal(rows()[1].hasAttribute('data-kcf-hidden'), false);
  rows()[0].firstElementChild.append(menu.cloneNode(true)); await tick();
  assert.equal(rows()[0].getAttribute('data-kcf-hidden'), '1');
  assert.equal(controller.status().hiddenNow, 2);
});

test('verified reply shape excludes quoted text while inline mentions count as body text', async t => {
  const { controller, rows, document, root, ns } = setup(t);
  const row = rows()[1], group = row.firstElementChild, box = group.firstElementChild;
  const reply = document.createElement('div'); reply.className = 'flex flex-col wrap-break-word';
  const quote = document.createElement('button'); quote.textContent = 'Replying to ahmet: blocked quote';
  box.className = 'wrap-break-word'; box.replaceWith(reply); reply.append(quote, box);
  await tick();
  assert.equal(row.hasAttribute('data-kcf-hidden'), false, 'quoted text is not the current body');
  const body = ns.kickAdapter.bodyFor(row, root);
  const mention = document.createElement('button'); mention.textContent = '@Ahmet'; body.append(mention);
  await tick();
  assert.equal(row.getAttribute('data-kcf-hidden'), '1', 'visible mention belongs to the message body');
  const divider = document.createElement('div'); divider.dataset.index = '99';
  const line = document.createElement('div'); line.className = 'group';
  for (const className of ['h-px grow', 'text-sm font-semibold', 'h-px grow']) {
    const part = document.createElement('div'); part.className = className; part.textContent = 'ahmet'; line.append(part);
  }
  divider.append(line); root.firstElementChild.append(divider); await tick();
  assert.equal(divider.hasAttribute('data-kcf-hidden'), false);
  assert.equal(controller.status().state, 'active');
});

test('background-tab animation throttling cannot retain an accumulating stream of detached candidates', async t => {
  const f = fixture();
  f.window.requestAnimationFrame = () => 7;
  f.window.cancelAnimationFrame = () => {};
  const controller = f.ns.createFilterController({ ...f, settings: settings() });
  controller.start();
  t.after(() => { controller.stop(); f.window.close(); });
  const root = f.ns.kickAdapter.findRoot(f.document);
  for (let i = 0; i < 20; i++) {
    const row = root.firstElementChild.firstElementChild.cloneNode(true);
    row.dataset.index = 10 + i;
    root.firstElementChild.append(row); await tick(1);
    row.remove(); await tick(1);
  }
  assert.equal(controller.status().pendingRows, 0);
  assert.equal(controller.status().hiddenNow, 2);
});
