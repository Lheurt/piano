// notes.js — random passage generation
// Dual-environment: works in the browser (populates window.*) and in Node
// (module.exports). Public API:
//   makePassage(clef, count, tier) -> [{ pitch, status, assignedClef? }]
//   tierPool(clef, tier) -> [pitchName, ...]
//   pitchToMidi(pitch) -> number
//
// Tier ranges are inclusive C-to-C MIDI numbers (so "1 octave" includes both
// Cs as anchors). Tier >= 2 includes both enharmonic spellings of every black
// key in range. Tier 4 is added in a later task.

(function () {
  var CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  function pMidi(p) {
    var m = p.match(/^([A-G])([#b]?)(\d)$/);
    if (!m) return -1;
    var pc = CHROMA.indexOf(m[1]);
    if (m[2] === '#') pc++;
    if (m[2] === 'b') pc--;
    return (parseInt(m[3], 10) + 1) * 12 + pc;
  }

  // [loMidi, hiMidi] inclusive. C2=36, C3=48, C4=60, C5=72, C6=84.
  var RANGES = {
    treble: { 1: [60, 72], 2: [60, 72], 3: [60, 84] },
    bass:   { 1: [48, 60], 2: [48, 60], 3: [36, 60] },
    grand:  { 1: [48, 72], 2: [48, 72], 3: [36, 84] },
  };

  var SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  var BLACK_PCS   = { 1: true, 3: true, 6: true, 8: true, 10: true };

  function midiPc(m) { return ((m % 12) + 12) % 12; }
  function midiOctave(m) { return Math.floor(m / 12) - 1; }

  function namesForMidi(m) {
    var pc = midiPc(m);
    var oct = midiOctave(m);
    if (!BLACK_PCS[pc]) return [SHARP_NAMES[pc] + oct];
    return [SHARP_NAMES[pc] + oct, FLAT_NAMES[pc] + oct];
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

  function makePassage(clef, count, tier) {
    count = count || 8;
    if (tier === undefined) tier = 3;
    var pool = tierPool(clef, tier);
    var notes = [];
    var lastMidi = -1;
    for (var i = 0; i < count; i++) {
      var candidates = pool.filter(function (n) { return pMidi(n) !== lastMidi; });
      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      notes.push({ pitch: pick, status: 'pending' });
      lastMidi = pMidi(pick);
    }
    return notes;
  }

  var api = {
    makePassage: makePassage,
    pitchToMidi: pMidi,
    tierPool: tierPool,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') Object.assign(window, api);
}());
