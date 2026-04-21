// notes.js — random passage generation
// Exposes: window.makePassage(clef, count, accidentals), window.pitchToMidi(pitch)
//
// Treble notes (C4–C5) route to the treble staff via clefForPitch.
// Bass notes (C3–B3) route to the bass staff.
// C4 sits on the treble staff (one ledger below), so BASS stops at B3.

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

  var TREBLE     = ['C4','D4','E4','F4','G4','A4','B4','C5'];
  var BASS       = ['C3','D3','E3','F3','G3','A3','B3'];
  var TREBLE_ACC = ['C#4','Db4','D#4','Eb4','F#4','Gb4','G#4','Ab4','A#4','Bb4'];
  var BASS_ACC   = ['C#3','Db3','D#3','Eb3','F#3','Gb3','G#3','Ab3','A#3','Bb3'];

  function makePassage(clef, count, accidentals) {
    count = count || 8;
    var treble = accidentals ? TREBLE.concat(TREBLE_ACC) : TREBLE;
    var bass   = accidentals ? BASS.concat(BASS_ACC)     : BASS;
    var pool =
      clef === 'treble' ? treble :
      clef === 'bass'   ? bass   :
      treble.concat(bass);

    var notes    = [];
    var lastMidi = -1;
    for (var i = 0; i < count; i++) {
      var candidates = pool.filter(function (n) { return pMidi(n) !== lastMidi; });
      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      notes.push({ pitch: pick, status: 'pending' });
      lastMidi = pMidi(pick);
    }
    return notes;
  }

  window.makePassage = makePassage;
  window.pitchToMidi = pMidi;
}());
