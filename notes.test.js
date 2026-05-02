// notes.test.js — run with `npm test` (uses Node's built-in test runner).

const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('./notes.js');

test('tier 1 treble = C4 to C5 naturals', () => {
  assert.deepEqual(N.tierPool('treble', 1),
    ['C4','D4','E4','F4','G4','A4','B4','C5']);
});

test('tier 1 bass = C3 to C4 naturals', () => {
  assert.deepEqual(N.tierPool('bass', 1),
    ['C3','D3','E3','F3','G3','A3','B3','C4']);
});

test('tier 1 grand = C3 to C5 naturals', () => {
  assert.deepEqual(N.tierPool('grand', 1),
    ['C3','D3','E3','F3','G3','A3','B3',
     'C4','D4','E4','F4','G4','A4','B4','C5']);
});

test('tier 1 has zero accidentals across all clefs', () => {
  for (const clef of ['treble','bass','grand']) {
    for (const p of N.tierPool(clef, 1)) {
      assert.ok(!/[#b]/.test(p), `${p} is accidental in tier 1 ${clef}`);
    }
  }
});

test('tier 2 treble: same C4–C5 range, both enharmonic spellings included', () => {
  const pool = N.tierPool('treble', 2);
  // Naturals C4..C5 = 8; black-key pcs in range = 5 (C#,D#,F#,G#,A#);
  // 5 * 2 spellings = 10 accidental names. Total = 18.
  assert.equal(pool.length, 18);
  for (const expected of ['C#4','Db4','D#4','Eb4','F#4','Gb4','G#4','Ab4','A#4','Bb4']) {
    assert.ok(pool.includes(expected), `tier 2 treble missing ${expected}`);
  }
});

test('tier 2 grand: union of treble and bass tier-2 pools', () => {
  const pool = N.tierPool('grand', 2);
  // C3..C5 = 25 MIDI; 15 naturals + 10 black keys * 2 spellings = 35 names.
  assert.equal(pool.length, 35);
});

test('tier 3 treble = C4–C6 with accidentals', () => {
  const pool = N.tierPool('treble', 3);
  // C4..C6 = 25 MIDI; 15 naturals + 10 black keys * 2 spellings = 35 names.
  assert.equal(pool.length, 35);
  assert.ok(pool.includes('C4'));
  assert.ok(pool.includes('C6'));
  assert.ok(pool.includes('A#5'));
  assert.ok(pool.includes('Bb5'));
});

test('tier 3 bass = C2–C4 with accidentals', () => {
  const pool = N.tierPool('bass', 3);
  assert.equal(pool.length, 35);
  assert.ok(pool.includes('C2'));
  assert.ok(pool.includes('C4'));
});

test('tier 3 grand = C2–C6 with accidentals', () => {
  const pool = N.tierPool('grand', 3);
  // C2..C6 = 49 MIDI; 29 naturals + 20 black keys * 2 spellings = 69 names.
  assert.equal(pool.length, 69);
});

test('makePassage produces 8 notes by default', () => {
  const notes = N.makePassage('grand', undefined, 3);
  assert.equal(notes.length, 8);
  for (const n of notes) {
    assert.equal(n.status, 'pending');
    assert.ok(typeof n.pitch === 'string');
  }
});

test('makePassage default tier (omitted) is 3', () => {
  // Tier 3 treble pool is C4–C6: every MIDI must be in [60, 84].
  for (let trial = 0; trial < 20; trial++) {
    const notes = N.makePassage('treble', 8);
    for (const n of notes) {
      const m = N.pitchToMidi(n.pitch);
      assert.ok(m >= 60 && m <= 84,
        `pitch ${n.pitch} (midi ${m}) out of tier-3 treble range`);
    }
  }
});

test('makePassage produces no immediate MIDI repeats', () => {
  for (let trial = 0; trial < 50; trial++) {
    const notes = N.makePassage('grand', 8, 3);
    for (let i = 1; i < notes.length; i++) {
      assert.notEqual(N.pitchToMidi(notes[i].pitch),
                      N.pitchToMidi(notes[i-1].pitch));
    }
  }
});

test('tier 4 treble = C3–C6 with accidentals', () => {
  const pool = N.tierPool('treble', 4);
  // C3..C6 = 37 MIDI; 22 naturals + 15 black keys * 2 spellings = 52 names.
  assert.equal(pool.length, 52);
  assert.ok(pool.includes('C3'));   // crawled-down anchor
  assert.ok(pool.includes('B3'));
  assert.ok(pool.includes('C6'));
  assert.ok(pool.includes('F#3'));  // accidentals in the crawled octave
  assert.ok(pool.includes('Gb3'));
});

test('tier 4 bass = C2–C5 with accidentals', () => {
  const pool = N.tierPool('bass', 4);
  // C2..C5 = 37 MIDI; same shape as tier 4 treble.
  assert.equal(pool.length, 52);
  assert.ok(pool.includes('C2'));
  assert.ok(pool.includes('C5'));   // crawled-up anchor
  assert.ok(pool.includes('B4'));
  assert.ok(pool.includes('F#4'));
});

test('tier 4 grand = C2–C6 (same range as tier 3)', () => {
  const pool = N.tierPool('grand', 4);
  // Same shape as tier 3 grand.
  assert.equal(pool.length, 69);
});

test('grand tier 4 attaches assignedClef in the overlap zone (C3–C5)', () => {
  let inOverlap = 0;
  let withClef = 0;
  let outsideOverlap = 0;
  for (let trial = 0; trial < 100; trial++) {
    const notes = N.makePassage('grand', 8, 4);
    for (const n of notes) {
      const m = N.pitchToMidi(n.pitch);
      if (m >= 48 && m <= 72) {
        inOverlap++;
        if (n.assignedClef === 'treble' || n.assignedClef === 'bass') withClef++;
      } else {
        outsideOverlap++;
        assert.equal(n.assignedClef, undefined,
          `${n.pitch} (midi ${m}) is outside the overlap but got clef ${n.assignedClef}`);
      }
    }
  }
  assert.ok(inOverlap > 0, 'expected some overlap-zone notes across 100 trials');
  assert.ok(outsideOverlap > 0, 'expected some outside-overlap notes across 100 trials');
  assert.equal(withClef, inOverlap,
    'every overlap-zone note in grand tier 4 must have an assignedClef');
});

test('grand tier 4 fuzzes both clef choices', () => {
  // Across many trials the overlap-zone clef should land both treble and bass.
  let treble = 0, bass = 0;
  for (let trial = 0; trial < 200; trial++) {
    const notes = N.makePassage('grand', 8, 4);
    for (const n of notes) {
      if (n.assignedClef === 'treble') treble++;
      if (n.assignedClef === 'bass') bass++;
    }
  }
  assert.ok(treble > 0, 'expected at least one treble assignment');
  assert.ok(bass > 0, 'expected at least one bass assignment');
});

test('tiers 1–3 never attach assignedClef (any clef)', () => {
  for (const clef of ['treble','bass','grand']) {
    for (const tier of [1, 2, 3]) {
      for (let trial = 0; trial < 20; trial++) {
        const notes = N.makePassage(clef, 8, tier);
        for (const n of notes) {
          assert.equal(n.assignedClef, undefined,
            `${clef} tier ${tier} attached assignedClef ${n.assignedClef} to ${n.pitch}`);
        }
      }
    }
  }
});

test('single-clef tier 4 never attaches assignedClef', () => {
  for (const clef of ['treble','bass']) {
    for (let trial = 0; trial < 20; trial++) {
      const notes = N.makePassage(clef, 8, 4);
      for (const n of notes) {
        assert.equal(n.assignedClef, undefined,
          `${clef} tier 4 attached assignedClef ${n.assignedClef} to ${n.pitch}`);
      }
    }
  }
});
