(() => {
  'use strict';
  const ns = globalThis.KCF;
  // Verified in live Kick DOM on 2026-10-27. Decision/evidence: docs/PHASE_A.md.
  const ROOT = '#chatroom-messages[data-testid="chatroom-messages"]';
  const ROW = 'div[data-index]';
  function findRoot(document) {
    const roots = document.querySelectorAll(ROOT);
    return roots.length === 1 ? roots[0] : null;
  }
  function isRow(row, root) {
    return !!row?.matches?.(ROW) && row.parentElement?.parentElement === root
      && row.parentElement.matches('div.no-scrollbar.relative')
      && /^\d+$/.test(row.getAttribute('data-index'));
  }
  function rows(root) {
    return Array.from(root.querySelectorAll(ROW)).filter(row => isRow(row, root));
  }
  function closestRow(node, root) {
    const element = node?.nodeType === 1 ? node : node?.parentElement;
    const row = element?.closest(ROW);
    return isRow(row, root) ? row : null;
  }
  function bodyFor(row, root) {
    if (!isRow(row, root) || row.children.length !== 1) return null;
    const group = row.firstElementChild;
    if (!group.matches('div.group')) return null;
    const boxes = group.querySelectorAll(':scope > div.break-words, :scope > div.wrap-break-word.flex-col');
    if (boxes.length !== 1) return null;
    let box = boxes[0];
    // Verified reply form: quote button first; actual sender/body in the second child.
    if (box.matches('div.wrap-break-word.flex-col')) {
      if (box.children.length !== 2 || box.firstElementChild.tagName !== 'BUTTON'
        || !box.lastElementChild.matches('div.wrap-break-word')) return null;
      box = box.lastElementChild;
    }
    if (box.children.length !== 2) return null;
    const [identity, body] = box.children;
    if (!identity.matches('div.inline-flex') || !body.matches('span.font-normal')) return null;
    if (identity.querySelectorAll('button[title][data-prevent-expand]').length !== 1) return null;
    if (body.querySelector('input, textarea, [contenteditable], script, style')) return null;
    return body;
  }
  function isNonMessage(row, root) {
    if (!isRow(row, root)) return false;
    const group = row.firstElementChild;
    return !!group?.matches('div.group')
      && group.querySelectorAll(':scope > div.h-px.grow').length === 2
      && group.querySelectorAll(':scope > div.text-sm.font-semibold').length === 1
      && !group.querySelector('span.font-normal, button[title][data-prevent-expand]');
  }
  function extractText(body) {
    function read(node) {
      if (node.nodeType === 3) return node.data;
      if (node.nodeType !== 1) return '';
      // Emote names are deliberately not keywords in v1. Keep a boundary between words.
      if (node.matches('img, svg, [data-emote-id], [hidden], [aria-hidden="true"]')) return ' ';
      if (node.tagName === 'BR') return '\n';
      return Array.from(node.childNodes, read).join('');
    }
    return read(body);
  }
  ns.kickAdapter = { ROOT, ROW, findRoot, rows, isRow, closestRow, bodyFor, isNonMessage, extractText };
})();
