// chords.test.js — run with `npm test` (uses Node's built-in test runner).

const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./chords.js');

test('QUALITIES has all 19 entries', () => {
  assert.equal(Object.keys(C.QUALITIES).length, 19);
});

test('major triad intervals are [0,4,7]', () => {
  assert.deepEqual(C.QUALITIES[''].intervals, [0, 4, 7]);
});

test('every quality has a label and intervals[]', () => {
  for (const key of Object.keys(C.QUALITIES)) {
    const q = C.QUALITIES[key];
    assert.ok(q.label, 'missing label for ' + key);
    assert.ok(Array.isArray(q.intervals) && q.intervals.length >= 3, 'bad intervals for ' + key);
  }
});

test('11th chord omits the 3rd (no semitone 4)', () => {
  assert.ok(!C.QUALITIES['11'].intervals.includes(4));
});

test('13th chord omits the 11th (no semitone 5)', () => {
  assert.ok(!C.QUALITIES['13'].intervals.includes(5));
});

test('ROOT_SPELLINGS has 12 canonical spellings', () => {
  assert.equal(C.ROOT_SPELLINGS.length, 12);
  assert.deepEqual(C.ROOT_SPELLINGS,
    ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']);
});

test('pitchClassFromRoot round-trips spelling table', () => {
  for (let pc = 0; pc < 12; pc++) {
    assert.equal(C.pitchClassFromRoot(C.ROOT_SPELLINGS[pc]), pc);
  }
});

test('toneName returns canonical spelling', () => {
  assert.equal(C.toneName('C', 4), 'E');
  assert.equal(C.toneName('C', 3), 'E♭');
  assert.equal(C.toneName('F', 4), 'A');
  assert.equal(C.toneName('F', 3), 'A♭'); // Fm's 3rd
});

test('pitchClassesFor computes a sorted PC set', () => {
  assert.deepEqual(C.pitchClassesFor('C', ''),    [0, 4, 7]);
  assert.deepEqual(C.pitchClassesFor('C', 'm'),   [0, 3, 7]);
  assert.deepEqual(C.pitchClassesFor('C', 'maj7'),[0, 4, 7, 11]);
  // F minor = F A♭ C = PCs 5, 8, 0 -> sorted 0, 5, 8
  assert.deepEqual(C.pitchClassesFor('F', 'm'),   [0, 5, 8]);
});
