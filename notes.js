// notes.js — random passage generation
// Dual-environment: works in the browser (populates window.*) and in Node
// (module.exports). Public API:
//   makePassage(clef, count, tier) -> [{ pitch, status, assignedClef? }]
//   tierPool(clef, tier) -> [pitchName, ...]
//   pitchToMidi(pitch) -> number
//
// Tier ranges are inclusive C-to-C MIDI numbers (so "1 octave" includes both
// Cs as anchors). Tier >= 2 includes both enharmonic spellings of every black
// key in range.

(function () {
  // [loMidi, hiMidi] inclusive. C2=36, C3=48, C4=60, C5=72, C6=84.
  var RANGES = {
    treble: { 1: [60, 72], 2: [60, 72], 3: [60, 84], 4: [48, 84] },
    bass:   { 1: [48, 60], 2: [48, 60], 3: [36, 60], 4: [36, 72] },
    grand:  { 1: [48, 72], 2: [48, 72], 3: [36, 84], 4: [36, 84] },
  };

  var SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  var BLACK_PCS   = { 1: true, 3: true, 6: true, 8: true, 10: true };

  function pMidi(p) {
    var m = p.match(/^([A-G])([#b]?)(\d)$/);
    if (!m) return -1;
    var pc = SHARP_NAMES.indexOf(m[1]);
    if (m[2] === '#') pc++;
    if (m[2] === 'b') pc--;
    return (parseInt(m[3], 10) + 1) * 12 + pc;
  }

  function midiPc(m) { return ((m % 12) + 12) % 12; }
  function midiOctave(m) { return Math.floor(m / 12) - 1; }

  function namesForMidi(m) {
    var pc = midiPc(m);
    var oct = midiOctave(m);
    if (!BLACK_PCS[pc]) return [SHARP_NAMES[pc] + oct];
    return [SHARP_NAMES[pc] + oct, FLAT_NAMES[pc] + oct];
  }

  // Note-name drill ranges. Built from "ledger lines around the staff" rather
  // than C-to-C octave anchors used by makePassage's RANGES.
  //   Treble staff body = E4..F5 (MIDI 64..77).
  //   Bass staff body   = G2..A3 (MIDI 43..57).
  // Tier 1: staff body. Tier 2: +1 ledger. Tier 3/4: +2 ledgers. Tier 4: +accidentals.
  var FLASH_RANGES = {
    treble: { 1: [64, 77], 2: [60, 81], 3: [57, 84], 4: [57, 84] },
    bass:   { 1: [43, 57], 2: [40, 60], 3: [36, 64], 4: [36, 64] },
  };

  function noteFlashTierPool(tier, clef) {
    var range = FLASH_RANGES[clef] && FLASH_RANGES[clef][tier];
    if (!range) throw new Error('No flash range for clef=' + clef + ' tier=' + tier);
    var includeAccidentals = tier === 4;
    var pool = [];
    for (var m = range[0]; m <= range[1]; m++) {
      var isBlack = !!BLACK_PCS[midiPc(m)];
      if (isBlack && !includeAccidentals) continue;
      var names = namesForMidi(m);
      for (var i = 0; i < names.length; i++) pool.push(names[i]);
    }
    return pool;
  }

  function makeNoteFlash(tier, clef, avoidMidi) {
    var range = FLASH_RANGES[clef] && FLASH_RANGES[clef][tier];
    if (!range) throw new Error('No flash range for clef=' + clef + ' tier=' + tier);
    var includeAccidentals = tier === 4;

    // Build a pool of MIDI values weighted to natural pcs unless accidentals on.
    var midis = [];
    for (var m = range[0]; m <= range[1]; m++) {
      var isBlack = !!BLACK_PCS[midiPc(m)];
      if (isBlack && !includeAccidentals) continue;
      if (m !== avoidMidi) midis.push(m);
    }
    // Defensive: if avoidMidi exhausted the pool (single-note tier corners),
    // fall back to the unfiltered pool.
    if (midis.length === 0) {
      for (var m2 = range[0]; m2 <= range[1]; m2++) {
        var isBlack2 = !!BLACK_PCS[midiPc(m2)];
        if (isBlack2 && !includeAccidentals) continue;
        midis.push(m2);
      }
    }

    var midi = midis[Math.floor(Math.random() * midis.length)];
    var pc = midiPc(midi);
    var oct = midiOctave(midi);

    if (!BLACK_PCS[pc]) {
      var name = SHARP_NAMES[pc] + oct;   // e.g., "E4"
      return { midi: midi, displayPitch: name, letter: SHARP_NAMES[pc], accidental: null };
    }

    // Black key with accidentals on: pick sharp or flat spelling 50/50.
    var asSharp = Math.random() < 0.5;
    if (asSharp) {
      var sharpName = SHARP_NAMES[pc] + oct;        // e.g., "F#4"
      return { midi: midi, displayPitch: sharpName, letter: sharpName.charAt(0), accidental: '#' };
    } else {
      var flatName = FLAT_NAMES[pc] + oct;          // e.g., "Gb4"
      return { midi: midi, displayPitch: flatName, letter: flatName.charAt(0), accidental: 'b' };
    }
  }

  function tierPool(clef, tier) {
    var range = RANGES[clef] && RANGES[clef][tier];
    if (!range) throw new Error('No range for clef=' + clef + ' tier=' + tier);
    var includeAccidentals = tier >= 2;
    var pool = [];
    for (var m = range[0]; m <= range[1]; m++) {
      var isBlack = !!BLACK_PCS[midiPc(m)];
      if (isBlack && !includeAccidentals) continue;
      var names = namesForMidi(m);
      for (var i = 0; i < names.length; i++) pool.push(names[i]);
    }
    return pool;
  }

  function activeRangeForPractice(clef, tier) {
    var range = RANGES[clef] && RANGES[clef][tier];
    if (!range) throw new Error('No range for clef=' + clef + ' tier=' + tier);
    return { loMidi: range[0], hiMidi: range[1] };
  }

  function makePassage(clef, count, tier) {
    count = count || 8;
    if (tier === undefined) tier = 3;
    var pool = tierPool(clef, tier);
    var fuzzGrandClef = (clef === 'grand' && tier === 4);
    var notes = [];
    var lastMidi = -1;
    for (var i = 0; i < count; i++) {
      var candidates = pool.filter(function (n) { return pMidi(n) !== lastMidi; });
      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      var note = { pitch: pick, status: 'pending' };
      if (fuzzGrandClef) {
        var midi = pMidi(pick);
        // Overlap zone is C3..C5 inclusive (MIDI 48..72).
        if (midi >= 48 && midi <= 72) {
          note.assignedClef = Math.random() < 0.5 ? 'treble' : 'bass';
        }
      }
      notes.push(note);
      lastMidi = pMidi(pick);
    }
    return notes;
  }

  var api = {
    makePassage: makePassage,
    pitchToMidi: pMidi,
    tierPool: tierPool,
    activeRangeForPractice: activeRangeForPractice,
    noteFlashTierPool: noteFlashTierPool,
    makeNoteFlash: makeNoteFlash,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') Object.assign(window, api);
}());
