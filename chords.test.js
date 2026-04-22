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

test('qualitiesForTier is cumulative', () => {
  assert.deepEqual(C.qualitiesForTier(1), ['', 'm']);
  assert.deepEqual(C.qualitiesForTier(2), ['', 'm', '°', '+']);
  // Tier 6 includes every quality
  assert.equal(C.qualitiesForTier(6).length, 19);
});

test('rootPcsForTier: tier 1 is white keys, tier 2+ is chromatic', () => {
  assert.deepEqual(C.rootPcsForTier(1), [0, 2, 4, 5, 7, 9, 11]);
  assert.equal(C.rootPcsForTier(2).length, 12);
  assert.equal(C.rootPcsForTier(6).length, 12);
});

test('tier 1 pool = 14 (7 white-key roots x 2 qualities)', () => {
  assert.equal(C.buildTierPool(1).length, 14);
});

test('buildChord root position has bass=null', () => {
  const c = C.buildChord('C', 'maj7');
  assert.equal(c.bass, null);
  assert.equal(c.displayName, 'Cmaj7');
  assert.deepEqual(c.pitchClasses, [0, 4, 7, 11]);
});

test('buildChord with bass offset sets slash-chord fields', () => {
  const c = C.buildChord('C', '', 4); // C major, E in bass
  assert.equal(c.bass, 'E');
  assert.equal(c.bassPitchClass, 4);
  assert.equal(c.displayName, 'C/E');
});

test('makeChordPassage returns `count` entries with pending status', () => {
  const p = C.makeChordPassage(1, 8);
  assert.equal(p.length, 8);
  for (const c of p) assert.equal(c.status, 'pending');
});

test('makeChordPassage: no two consecutive entries share a displayName', () => {
  for (let i = 0; i < 10; i++) {
    const p = C.makeChordPassage(3, 8);
    for (let j = 1; j < p.length; j++) {
      assert.notEqual(p[j].displayName, p[j-1].displayName);
    }
  }
});

test('makeChordPassage: no slash chords below tier 5', () => {
  for (let i = 0; i < 10; i++) {
    const p = C.makeChordPassage(4, 8);
    for (const c of p) assert.equal(c.bass, null);
  }
});

test('makeChordPassage: tier 5+ produces some slash chords across many runs', () => {
  let slashCount = 0;
  let total = 0;
  for (let i = 0; i < 30; i++) {
    for (const c of C.makeChordPassage(5, 8)) {
      total++;
      if (c.bass) slashCount++;
    }
  }
  // ~33% expected; be loose to avoid flakiness.
  assert.ok(slashCount > total * 0.15, 'slash rate too low: ' + slashCount + '/' + total);
  assert.ok(slashCount < total * 0.55, 'slash rate too high: ' + slashCount + '/' + total);
});

test('PROSE has an entry for every quality', () => {
  for (const q of Object.keys(C.QUALITIES)) {
    assert.ok(C.PROSE[q] && C.PROSE[q].length > 20, 'missing/short prose for ' + q);
  }
});

test('INTERVAL_NAMES covers 0..11', () => {
  for (let i = 0; i <= 11; i++) assert.ok(C.INTERVAL_NAMES[i], 'missing ' + i);
});

test('chordExplanation on Cmaj7 lists four intervals with correct tones', () => {
  const chord = C.buildChord('C', 'maj7');
  const e = C.chordExplanation(chord);
  assert.equal(e.root, 'C');
  assert.equal(e.qualityLabel, 'major 7');
  assert.equal(e.qualitySymbol, 'maj7');
  assert.equal(e.bass, null);
  assert.deepEqual(e.intervals.map(i => i.tone), ['C', 'E', 'G', 'B']);
  assert.deepEqual(e.intervals.map(i => i.name),
    ['Root', 'Major 3rd', 'Perfect 5th', 'Major 7th']);
});

test('chordExplanation carries bass for slash chords', () => {
  const chord = C.buildChord('C', '', 4); // C/E
  const e = C.chordExplanation(chord);
  assert.equal(e.bass, 'E');
});

test('chordExplanation on Fm uses flat spelling for A♭', () => {
  const chord = C.buildChord('F', 'm');
  const e = C.chordExplanation(chord);
  assert.deepEqual(e.intervals.map(i => i.tone), ['F', 'A♭', 'C']);
});

test('validateChord: empty selection is not ok', () => {
  const chord = C.buildChord('C', '');
  const r = C.validateChord(new Set(), chord);
  assert.equal(r.ok, false);
  assert.equal(r.empty, true);
});

test('validateChord: exact PC match is ok', () => {
  const chord = C.buildChord('C', '');               // {0, 4, 7}
  const r = C.validateChord(new Set([60, 64, 67]), chord); // C4 E4 G4
  assert.equal(r.ok, true);
});

test('validateChord: octave-shifted and doubled tones still ok', () => {
  const chord = C.buildChord('C', '');
  // C3(48) E4(64) G4(67) C4(60) — duplicated C across octaves
  const r = C.validateChord(new Set([48, 60, 64, 67]), chord);
  assert.equal(r.ok, true);
});

test('validateChord: extra tone fails', () => {
  const chord = C.buildChord('C', '');
  const r = C.validateChord(new Set([60, 63, 64, 67]), chord); // adds E♭
  assert.equal(r.ok, false);
  assert.ok(r.selectedPcsExtra.has(3));
});

test('validateChord: missing tone fails', () => {
  const chord = C.buildChord('C', 'maj7'); // {0, 4, 7, 11}
  const r = C.validateChord(new Set([60, 64, 67]), chord); // B missing
  assert.equal(r.ok, false);
  assert.ok(r.missingPcs.has(11));
});

test('validateChord: slash chord requires bass pc in lowest note', () => {
  const chord = C.buildChord('C', '', 4); // C/E, bassPc = 4
  // E3(52) G3(55) C4(60) — E is lowest -> ok
  const r1 = C.validateChord(new Set([52, 55, 60]), chord);
  assert.equal(r1.ok, true);
  assert.equal(r1.bassWrong, false);
  // C3(48) E3(52) G3(55) — C is lowest -> bass wrong
  const r2 = C.validateChord(new Set([48, 52, 55]), chord);
  assert.equal(r2.ok, false);
  assert.equal(r2.bassWrong, true);
});

test('validateChord: root-position chord has bassWrong=null', () => {
  const chord = C.buildChord('C', '');
  const r = C.validateChord(new Set([60, 64, 67]), chord);
  assert.equal(r.bassWrong, null);
});
