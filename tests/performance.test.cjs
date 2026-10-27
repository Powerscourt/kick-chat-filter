const { test } = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { fixture, settings, tick } = require('./helpers.cjs');
test('2000-row backlog and 100 messages/sec burst keep bounded work and release detached rows', async t => {
  const f = fixture(); const root = f.ns.kickAdapter.findRoot(f.document);
  const list = root.firstElementChild, template = list.firstElementChild.cloneNode(true);
  list.replaceChildren();
  const fragment = f.document.createDocumentFragment();
  for (let i = 0; i < 2000; i++) { const row = template.cloneNode(true); row.dataset.index = i; fragment.append(row); }
  list.append(fragment);
  const controller = f.ns.createFilterController({ ...f, settings: settings(['ahmet', ...Array.from({ length: 99 }, (_, i) => `extra-${i}`)]) });
  t.after(() => { controller.stop(); f.window.close(); });
  const memoryBefore = process.memoryUsage().heapUsed;
  const start = performance.now(); controller.start(); const initialMs = performance.now() - start;
  assert.equal(controller.status().hiddenNow, 2000);
  const processed = controller.status().processed;
  const burstStart = performance.now();
  // Ten messages every 100ms = 100 messages/sec, for two seconds.
  for (let batch = 0; batch < 20; batch++) {
    for (let j = 0; j < 10; j++) {
      const row = template.cloneNode(true); row.dataset.index = 2000 + batch * 10 + j;
      list.append(row); list.firstElementChild.remove();
    }
    await tick(100);
  }
  const burstMs = performance.now() - burstStart;
  assert.equal(controller.status().hiddenNow, 2000);
  assert.equal(controller.status().processed - processed, 200, 'arrivals must not rescan the backlog');
  assert.equal(controller.status().observers, 1);
  assert.equal(controller.status().pendingRows, 0);
  list.replaceChildren(); await tick();
  assert.equal(controller.status().hiddenNow, 0);
  assert.equal(controller.status().invalidRows, 0);
  controller.stop();
  if (global.gc) global.gc();
  const memoryAfter = process.memoryUsage().heapUsed;
  t.diagnostic(JSON.stringify({ initialMs: +initialMs.toFixed(1), burstMs: +burstMs.toFixed(1),
    processedArrivalRows: 200, heapBeforeMB: +(memoryBefore/1048576).toFixed(1),
    heapAfterMB: +(memoryAfter/1048576).toFixed(1), gcAvailable: !!global.gc,
    remainingObservers: controller.status().observers, retainedTrackedRows: controller.status().hiddenNow + controller.status().invalidRows }));
  // A local jsdom regression budget, not a claim about live browser paint latency.
  assert.ok(initialMs < 5000, `initial scan exceeded 5s fixture budget: ${initialMs}`);
  assert.ok(burstMs < 6000, `2s simulated burst exceeded 6s fixture budget: ${burstMs}`);
});
