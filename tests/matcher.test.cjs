const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pure, settings } = require('./helpers.cjs');
const ns = pure();
test('default substring and optional whole-word satisfy every acceptance example', () => {
  const examples = [
    ['ahmet', 'Ahmet burada', true, true], ['ahmet', 'mehmet ve ahmet', true, true],
    ['ahmet', 'ahmetler', true, false], ['ahmet', 'merhaba', false, false],
    ['izmir', 'İzmir güzel', true, true], ['ışık', 'IŞIK', true, true],
    ['kötü söz', 'Bu kötü söz kullanıldı', true, true]
  ];
  for (const [term, body, substring, whole] of examples) {
    assert.equal(ns.compileMatcher(settings([term]))(body), substring, body);
    assert.equal(ns.compileMatcher(settings([term], { mode: 'whole-word' }))(body), whole, body);
  }
});
test('terms trim, deduplicate canonically and ignore invalid entries without interpreting HTML', () => {
  assert.deepEqual(Array.from(ns.sanitizeTerms([' ', null, 3, ' İzmir ', 'izmir', 'İzmi\u0072', 'IŞIK', 'ışık', 'ko\u0308tü', 'kötü'])), ['İzmir', 'IŞIK', 'kötü']);
  assert.equal(ns.compileMatcher(settings([]))('anything'), false);
  assert.equal(ns.compileMatcher(settings(['ahmet'], { enabled: false }))('ahmet'), false);
  assert.equal(ns.compileMatcher(settings(['x', 'y']))('y'), true);
  assert.equal(ns.compileMatcher(settings(['<img src=x onerror=alert(1)>']))('<img src=x onerror=alert(1)>'), true);
});
test('Turkish folding is deliberate, accents preserved and NFC combining forms equal', () => {
  for (const [term, body, expected] of [
    ['izmir', 'İZMİR', true], ['ışık', 'IŞIK', true], ['I', 'i', false], ['I', 'ı', true],
    ['KICK', 'kick', false], ['kötü', 'ko\u0308tu\u0308', true], ['cafe', 'café', false],
    ['🙂', 'merhaba 🙂', true], ['İ', 'i', true]
  ]) assert.equal(ns.compileMatcher(settings([term]))(body), expected, `${term}/${body}`);
});
test('Unicode phrase boundaries keep suffixes and identifiers visible but allow punctuation and emoji', () => {
  const match = ns.compileMatcher(settings(['ışık', 'kötü söz', 'ahmet'], { mode: 'whole-word' }));
  for (const body of ['“IŞIK!”', '🙂ahmet🙂', 'https://example.invalid/ahmet?x=1', '(kötü söz)', "ahmet'in", 'ahmetler ahmet']) assert.equal(match(body), true, body);
  for (const body of ['ışıklar', '_ahmet', 'ahmet2', '𐐀ahmet', 'ahmet𐐀', 'ahmet\u0301', 'kötü sözler']) assert.equal(match(body), false, body);
});
test('long text, literal regex-looking rules and many terms remain predictable', () => {
  const terms = Array.from({ length: 500 }, (_, i) => `rule-${i}`);
  const match = ns.compileMatcher(settings([...terms, '[a-z]+', '終わり']));
  assert.equal(match('x'.repeat(100000) + '終わり'), true);
  assert.equal(ns.compileMatcher(settings(['[a-z]+']))('hello'), false);
});
