(() => {
  'use strict';
  const ns = globalThis.KCF = globalThis.KCF || {};
  // NFC both before and after locale folding keeps canonically equivalent text equal.
  function normalize(text) {
    return String(text).normalize('NFC').toLocaleLowerCase('tr').normalize('NFC');
  }
  function sanitizeTerms(terms) {
    if (!Array.isArray(terms)) return [];
    const seen = new Set();
    return terms.filter(term => {
      if (typeof term !== 'string' || !term.trim()) return false;
      const key = normalize(term.trim());
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(term => term.trim().normalize('NFC'));
  }
  Object.assign(ns, { normalize, sanitizeTerms });
})();
