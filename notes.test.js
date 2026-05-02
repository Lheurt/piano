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
