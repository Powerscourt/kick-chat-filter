(() => {
  'use strict';
  const ns = globalThis.KCF;
  const wordCharacter = /[\p{L}\p{M}\p{N}_]/u;
  function wholePhrase(text, term) {
    let from = 0;
    while (from <= text.length) {
      const index = text.indexOf(term, from);
      if (index < 0) return false;
      // Spread handles astral Unicode code points at either edge, unlike text[index-1].
      const before = index ? Array.from(text.slice(Math.max(0, index - 2), index)).at(-1) : '';
      const after = Array.from(text.slice(index + term.length, index + term.length + 2))[0] || '';
      if (!wordCharacter.test(before) && !wordCharacter.test(after)) return true;
      from = index + 1;
    }
    return false;
  }
  function compileMatcher(settings) {
    const terms = ns.sanitizeTerms(settings.terms).map(ns.normalize);
    if (!settings.enabled || !terms.length) return () => false;
    return body => {
      const text = ns.normalize(body);
      return terms.some(term => settings.mode === 'whole-word'
        ? wholePhrase(text, term) : text.includes(term));
    };
  }
  Object.assign(ns, { compileMatcher });
})();
