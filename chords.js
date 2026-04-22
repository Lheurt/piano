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

  // Tier pools are cumulative. Each entry lists the quality symbols that first
  // appear at this tier; effective pool at tier N is union of tiers 1..N.
  var TIER_NEW_QUALITIES = {
    1: ['', 'm'],
    2: ['°', '+'],
    3: ['maj7', 'm7', '7', 'm7♭5', '°7'],
    4: ['sus2', 'sus4', 'add9', '6', 'm6'],
    5: [], // no new qualities; introduces inversions
    6: ['9', 'maj9', 'm9', '11', '13']
  };

  function qualitiesForTier(tier) {
    var out = [];
    for (var t = 1; t <= tier; t++) out = out.concat(TIER_NEW_QUALITIES[t]);
    return out;
  }

  // Tier 1 root pool is white keys only; tiers 2+ are all 12 chromatic roots.
  function rootPcsForTier(tier) {
    return tier === 1 ? WHITE_ROOT_PCS.slice() : [0,1,2,3,4,5,6,7,8,9,10,11];
  }

  // Build the raw pool of {rootName, qualitySymbol} for a tier.
  function buildTierPool(tier) {
    var qualities = qualitiesForTier(tier);
    var rootPcs = rootPcsForTier(tier);
    var pool = [];
    qualities.forEach(function (q) {
      rootPcs.forEach(function (pc) {
        pool.push({ rootName: ROOT_SPELLINGS[pc], qualitySymbol: q });
      });
    });
    return pool;
  }

  // Build a chord entry, optionally as a slash chord with the given bass offset.
  function buildChord(rootName, qualitySymbol, bassOffset /* optional semitone */) {
    var q = QUALITIES[qualitySymbol];
    var rootPc = pitchClassFromRoot(rootName);
    var pcs = pitchClassesFor(rootName, qualitySymbol);
    var bass = null;
    var bassPc = null;
    var displayName = rootName + qualitySymbol;
    if (typeof bassOffset === 'number') {
      bass = toneName(rootName, bassOffset);
      bassPc = (rootPc + bassOffset) % 12;
      displayName = displayName + '/' + bass;
    }
    return {
      root: rootName,
      quality: qualitySymbol,
      bass: bass,
      rootPitchClass: rootPc,
      bassPitchClass: bassPc,
      pitchClasses: pcs,
      displayName: displayName,
      status: 'pending'
    };
  }

  // Return `count` chord entries for a given tier. At tier >= 5, ~1/3 of draws
  // are converted to a slash chord (bass = a non-root tone).
  // No two consecutive entries are identical (by displayName).
  function makeChordPassage(tier, count) {
    count = count || 8;
    if (tier === undefined) tier = 1;
    var pool = buildTierPool(tier);
    if (pool.length === 0) throw new Error('Empty tier pool for tier ' + tier);
    var out = [];
    var lastName = null;
    var guard = 0;
    while (out.length < count) {
      guard++;
      if (guard > count * 50) throw new Error('Passage generation runaway');
      var pick = pool[Math.floor(Math.random() * pool.length)];
      var q = QUALITIES[pick.qualitySymbol];
      var useInversion = tier >= 5 && q.intervals.length > 2 && Math.random() < 0.33;
      var bassOffset = undefined;
      if (useInversion) {
        // Non-root intervals, excluding 0.
        var nonRoot = q.intervals.filter(function (i) { return i !== 0; });
        bassOffset = nonRoot[Math.floor(Math.random() * nonRoot.length)];
      }
      var chord = buildChord(pick.rootName, pick.qualitySymbol, bassOffset);
      if (chord.displayName === lastName) continue;
      out.push(chord);
      lastName = chord.displayName;
    }
    return out;
  }

  // Interval name per semitone offset. Used for both root-position tones
  // and extended (>12) offsets. For offsets beyond one octave, we still use
  // the simple-interval name (add9 -> the 2nd, m9 -> the 2nd, etc.) because
  // our intervals array uses compact in-octave semitones.
  var INTERVAL_NAMES = {
    0:  'Root',
    1:  'Minor 2nd',
    2:  'Major 2nd',
    3:  'Minor 3rd',
    4:  'Major 3rd',
    5:  'Perfect 4th',
    6:  'Diminished 5th',
    7:  'Perfect 5th',
    8:  'Augmented 5th',
    9:  'Major 6th',
    10: 'Minor 7th',
    11: 'Major 7th'
  };

  // One sentence of plain-English character for each quality. Kept deliberately
  // short and pedagogical; paper-and-ink tone, no marketing voice.
  var PROSE = {
    ''     : 'The archetypal "bright" chord — root, major third, and perfect fifth stacked in thirds.',
    'm'    : 'A major triad with the third lowered a semitone — darker, more introspective.',
    '°'    : 'Two minor thirds stacked — an unstable, restless chord that wants to resolve.',
    '+'    : 'Two major thirds stacked — symmetrical and suspended-feeling, common in whole-tone passages.',
    'maj7' : 'Layers a major seventh on a major triad — smooth and resolved, characteristic of tonic in jazz and bossa nova.',
    'm7'   : 'A minor triad with a minor seventh on top — warm, unresolved, the workhorse ii chord of jazz.',
    '7'    : 'A major triad with a minor seventh — the "dominant" sound, leaning strongly toward resolution.',
    'm7♭5' : 'Stacks a minor third, diminished fifth, and minor seventh — the ii chord of a minor key; also called half-diminished.',
    '°7'   : 'Four tones evenly spaced by minor thirds — fully symmetrical, highly tense, resolves in multiple directions.',
    'sus2' : 'Replaces the third with the second — neither major nor minor, with an open, unresolved quality.',
    'sus4' : 'Replaces the third with the fourth — the same ambiguity as sus2 but denser, tending to resolve down to the third.',
    'add9' : 'A major triad with the ninth (same pitch class as the 2nd) added on top — bright and sparkling.',
    '6'    : 'A major triad with the sixth added — relaxed, nostalgic, common in early jazz and ballads.',
    'm6'   : 'A minor triad with the major sixth added — melancholic but not dark, typical of cool-jazz voicings.',
    '9'    : 'A dominant seventh with the ninth added — a richer dominant sound common in blues and funk.',
    'maj9' : 'A major-seventh with the ninth added — lush and cinematic, an extended tonic flavour.',
    'm9'   : 'A minor-seventh with the ninth added — soft and dreamy, characteristic of soul and modal jazz.',
    '11'   : 'A dominant-ninth with the eleventh added; the third is omitted to avoid a clash — airy and modal.',
    '13'   : 'A dominant-ninth with the thirteenth added (eleventh omitted) — the full-bodied dominant of jazz and gospel.'
  };

  function chordExplanation(chord) {
    var q = QUALITIES[chord.quality];
    var intervals = q.intervals.map(function (semi) {
      return {
        name: INTERVAL_NAMES[semi] || (semi + ' semitones'),
        semitones: semi,
        tone: toneName(chord.root, semi)
      };
    });
    return {
      root: chord.root,
      qualityLabel: q.label,
      qualitySymbol: chord.quality,
      intervals: intervals,
      prose: PROSE[chord.quality],
      bass: chord.bass // null when not a slash chord
    };
  }

  // Validate a set of selected MIDI numbers against a chord entry.
  // Returns:
  //   {
  //     ok: boolean,
  //     selectedPcsCorrect: Set<pc>      // PCs that are in the required set
  //     selectedPcsExtra: Set<pc>        // PCs that are NOT in the required set
  //     missingPcs: Set<pc>              // required PCs with no selection
  //     bassWrong: boolean | null        // null for non-inversion chords
  //   }
  function validateChord(selectedMidis, chord) {
    var selected = selectedMidis instanceof Set ? selectedMidis : new Set(selectedMidis);
    if (selected.size === 0) {
      return { ok: false, empty: true };
    }
    var required = new Set(chord.pitchClasses);
    var selectedPcsCorrect = new Set();
    var selectedPcsExtra = new Set();
    selected.forEach(function (m) {
      var pc = ((m % 12) + 12) % 12;
      if (required.has(pc)) selectedPcsCorrect.add(pc);
      else selectedPcsExtra.add(pc);
    });
    var missingPcs = new Set();
    required.forEach(function (pc) {
      if (!selectedPcsCorrect.has(pc)) missingPcs.add(pc);
    });
    var bassWrong = null;
    if (chord.bass) {
      var lowest = Math.min.apply(null, Array.from(selected));
      var lowestPc = ((lowest % 12) + 12) % 12;
      bassWrong = lowestPc !== chord.bassPitchClass;
    }
    var ok = selectedPcsExtra.size === 0 && missingPcs.size === 0 && bassWrong !== true;
    return {
      ok: ok,
      empty: false,
      selectedPcsCorrect: selectedPcsCorrect,
      selectedPcsExtra: selectedPcsExtra,
      missingPcs: missingPcs,
      bassWrong: bassWrong
    };
  }

  var api = {
    QUALITIES: QUALITIES,
    ROOT_SPELLINGS: ROOT_SPELLINGS,
    WHITE_ROOT_PCS: WHITE_ROOT_PCS,
    pitchClassFromRoot: pitchClassFromRoot,
    toneName: toneName,
    pitchClassesFor: pitchClassesFor
  };

  api.TIER_NEW_QUALITIES = TIER_NEW_QUALITIES;
  api.qualitiesForTier = qualitiesForTier;
  api.rootPcsForTier = rootPcsForTier;
  api.buildTierPool = buildTierPool;
  api.buildChord = buildChord;
  api.makeChordPassage = makeChordPassage;

  api.INTERVAL_NAMES = INTERVAL_NAMES;
  api.PROSE = PROSE;
  api.chordExplanation = chordExplanation;

  api.validateChord = validateChord;

  // Populate both environments.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    Object.assign(window, api);
  }
}());
