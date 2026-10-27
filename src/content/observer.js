(() => {
  'use strict';
  const ns = globalThis.KCF;
  const MARKER = 'data-kcf-hidden';
  function createFilterController({ window, document, adapter = ns.kickAdapter, settings, pollMs = 750 }) {
    let root = null;
    let observer = null;
    let timer = null;
    let frame = null;
    let active = false;
    let lastPath = window.location.pathname;
    let matches = ns.compileMatcher(settings);
    const pending = new Set();
    const hidden = new Set();
    const invalid = new Set();
    let processed = 0;
    function restore(row) { row.removeAttribute(MARKER); hidden.delete(row); }
    function prune() {
      for (const row of pending) if (!root?.contains(row)) pending.delete(row);
      for (const row of hidden) if (!root?.contains(row)) restore(row);
      for (const row of invalid) if (!root?.contains(row)) invalid.delete(row);
    }
    function process(row) {
      if (!root?.contains(row)) { restore(row); invalid.delete(row); return; }
      processed++;
      const body = adapter.bodyFor(row, root);
      if (!body) {
        restore(row);
        if (adapter.isNonMessage?.(row, root)) invalid.delete(row);
        else invalid.add(row);
        return;
      }
      invalid.delete(row);
      if (matches(adapter.extractText(body))) {
        if (!hidden.has(row)) { row.setAttribute(MARKER, '1'); hidden.add(row); }
      } else restore(row);
    }
    function flush() {
      frame = null;
      const batch = Array.from(pending);
      pending.clear();
      for (const row of batch) process(row);
      prune();
    }
    function queue(row) { if (row) pending.add(row); }
    function schedule() {
      if (frame === null && pending.size) frame = window.requestAnimationFrame(flush);
    }
    function mutations(records) {
      for (const record of records) {
        queue(adapter.closestRow(record.target, root));
        if (record.type === 'attributes' && !adapter.closestRow(record.target, root)) {
          for (const row of new Set([...hidden, ...invalid, ...adapter.rows(root)])) queue(row);
        }
        for (const node of record.addedNodes || []) {
          queue(adapter.closestRow(node, root));
          if (node.nodeType === 1 && !adapter.closestRow(node, root)) {
            for (const row of node.querySelectorAll(adapter.ROW)) if (adapter.isRow(row, root)) queue(row);
          }
        }
      }
      // Prune even removal-only batches, so detached rows are never retained.
      prune();
      schedule();
    }
    function detach() {
      observer?.disconnect(); observer = null;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null; pending.clear();
      for (const row of hidden) row.removeAttribute(MARKER);
      hidden.clear(); invalid.clear(); root = null;
    }
    function scan() {
      if (!root) return;
      for (const row of new Set([...hidden, ...invalid, ...adapter.rows(root)])) process(row);
      prune();
    }
    function reconcile() {
      const path = window.location.pathname;
      const found = adapter.findRoot(document);
      if (path === lastPath && found === root) return;
      lastPath = path;
      detach();
      root = found;
      if (!root) return;
      observer = new window.MutationObserver(mutations);
      // Attributes limited to structural/body changes: never observe our own marker.
      observer.observe(root, { childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['class', 'data-index', 'data-emote-id', 'hidden', 'aria-hidden'] });
      scan();
    }
    return {
      start() {
        if (active) return;
        active = true;
        reconcile();
        // Cheap single-ID lookup for mount/replacement/SPA; no document-wide observer.
        timer = window.setInterval(reconcile, pollMs);
      },
      stop() {
        active = false;
        window.clearInterval(timer); timer = null; detach();
      },
      updateSettings(value) { matches = ns.compileMatcher(value); reconcile(); scan(); },
      status() {
        prune();
        return { state: !root ? 'waiting' : invalid.size ? 'selector-issue' : 'active',
          hiddenNow: hidden.size, invalidRows: invalid.size, processed,
          observers: observer ? 1 : 0, pendingRows: pending.size };
      },
      reconcile
    };
  }
  Object.assign(ns, { MARKER, createFilterController });
})();
