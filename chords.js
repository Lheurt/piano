// chords.js — chord theory primitives, tier pools, prompt generation, validation.
// Dual-environment: works in the browser (populates window.*) and in Node (module.exports).

(function () {
  // All 19 qualities. Key = canonical chord-symbol suffix (empty = major).
  // intervals = semitone offsets from root, sorted ascending.
  var QUALITIES = {
    ''     : { label: 'major',           intervals: [0, 4, 7] },
    'm'    : { label: 'minor',           intervals: [0, 3, 7] },
    '°'    : { label: 'diminished',      intervals: [0, 3, 6] },
    '+'    : { label: 'augmented',       intervals: [0, 4, 8] },
    'maj7' : { label: 'major 7',         intervals: [0, 4, 7, 11] },
    'm7'   : { label: 'minor 7',         intervals: [0, 3, 7, 10] },
    '7'    : { label: 'dominant 7',      intervals: [0, 4, 7, 10] },
    'm7♭5' : { label: 'half-diminished', intervals: [0, 3, 6, 10] },
    '°7'   : { label: 'diminished 7',    intervals: [0, 3, 6, 9] },
    'sus2' : { label: 'sus2',            intervals: [0, 2, 7] },
    'sus4' : { label: 'sus4',            intervals: [0, 5, 7] },
    'add9' : { label: 'add9',            intervals: [0, 2, 4, 7] },
    '6'    : { label: '6',               intervals: [0, 4, 7, 9] },
    'm6'   : { label: 'minor 6',         intervals: [0, 3, 7, 9] },
    '9'    : { label: 'dominant 9',      intervals: [0, 2, 4, 7, 10] },
    'maj9' : { label: 'major 9',         intervals: [0, 2, 4, 7, 11] },
    'm9'   : { label: 'minor 9',         intervals: [0, 2, 3, 7, 10] },
    '11'   : { label: '11',              intervals: [0, 2, 5, 7, 10] },   // 3rd omitted
    '13'   : { label: '13',              intervals: [0, 2, 4, 7, 9, 10] } // 11th omitted
  };

  // Canonical spelling per chromatic pitch class (0 = C ... 11 = B).
  var ROOT_SPELLINGS = [
    'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'
  ];

  var WHITE_ROOT_PCS = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B

  // PC (0..11) from a root display name like 'C', 'F♯', 'E♭'.
  function pitchClassFromRoot(name) {
    var idx = ROOT_SPELLINGS.indexOf(name);
    if (idx >= 0) return idx;
    throw new Error('Unknown root spelling: ' + name);
  }

  // Letter name of a tone `offsetSemitones` above a root, using the canonical
  // spelling table. E.g., tonesFor('C', 4) -> 'E'; tonesFor('C', 3) -> 'E♭'.
  function toneName(rootName, offsetSemitones) {
    var rootPc = pitchClassFromRoot(rootName);
    return ROOT_SPELLINGS[(rootPc + offsetSemitones) % 12];
  }

  // Pitch-class set for a (root, quality) combination, as sorted array.
  function pitchClassesFor(rootName, qualitySymbol) {
    var q = QUALITIES[qualitySymbol];
    if (!q) throw new Error('Unknown quality: ' + qualitySymbol);
    var rootPc = pitchClassFromRoot(rootName);
    var set = q.intervals.map(function (i) { return (rootPc + i) % 12; });
    return set.slice().sort(function (a, b) { return a - b; });
  }

  var api = {
    QUALITIES: QUALITIES,
    ROOT_SPELLINGS: ROOT_SPELLINGS,
    WHITE_ROOT_PCS: WHITE_ROOT_PCS,
    pitchClassFromRoot: pitchClassFromRoot,
    toneName: toneName,
    pitchClassesFor: pitchClassesFor
  };

  // Populate both environments.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    Object.assign(window, api);
  }
}());
