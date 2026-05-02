// midi-helpers.js — note-name <-> MIDI conversions, exposed on window.
// Required by PannableKeyboard.jsx.

(function () {
  var SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var BLACK_OFFSETS = { 'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5 };

  function midiToName(m) {
    var pc = ((m % 12) + 12) % 12;
    var oct = Math.floor(m / 12) - 1;
    return SHARP[pc] + oct;
  }

  function nameToMidi(n) {
    var m = n.match(/^([A-G])([#b]?)(-?\d)$/);
    if (!m) return null;
    var letter = m[1], acc = m[2], oct = parseInt(m[3], 10);
    var base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter];
    var pc = base + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
    return (oct + 1) * 12 + pc;
  }

  window.midiToName = midiToName;
  window.nameToMidi = nameToMidi;
}());
