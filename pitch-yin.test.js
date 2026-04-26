// pitch-yin.test.js — run with `npm test`.

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectPitchMidi } = require('./pitch-yin.js');

const SAMPLE_RATE = 44100;
const WINDOW_SIZE = 2048;

function sineWindow(frequencyHz, sampleRate = SAMPLE_RATE, length = WINDOW_SIZE) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = Math.sin(2 * Math.PI * frequencyHz * i / sampleRate);
  }
  return out;
}

test('detects A4 (440 Hz) as MIDI 69', () => {
  const buf = sineWindow(440);
  const midi = detectPitchMidi(buf, SAMPLE_RATE);
  assert.equal(midi, 69);
});

const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

test('detects every MIDI note from C3 (48) to C5 (72) as a sine', () => {
  for (let midi = 48; midi <= 72; midi++) {
    const buf = sineWindow(midiToFreq(midi));
    const detected = detectPitchMidi(buf, SAMPLE_RATE);
    assert.equal(detected, midi,
      `expected MIDI ${midi} (${CHROMATIC[midi % 12]}${Math.floor(midi/12)-1}), got ${detected}`);
  }
});

test('returns null for silence', () => {
  const buf = new Float32Array(WINDOW_SIZE); // all zeros
  assert.equal(detectPitchMidi(buf, SAMPLE_RATE), null);
});

test('returns null or out-of-piano-range for noise', () => {
  const buf = new Float32Array(WINDOW_SIZE);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.random() * 2 - 1;
  // White noise has no clear period; YIN should reject it. May occasionally
  // produce a value if the random seed is unlucky; the safer assertion is
  // "either null or out of normal piano range".
  const result = detectPitchMidi(buf, SAMPLE_RATE);
  assert.ok(result === null || result < 36 || result > 84,
    `noise should not detect as a piano note; got ${result}`);
});

test('detects a piano-like waveform (fundamental + 2nd + 3rd harmonics)', () => {
  // Real piano tones have strong harmonics. YIN should still find the fundamental.
  const fundamental = midiToFreq(60); // C4
  const buf = new Float32Array(WINDOW_SIZE);
  for (let i = 0; i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    buf[i] =
      1.00 * Math.sin(2 * Math.PI * fundamental       * t) +
      0.45 * Math.sin(2 * Math.PI * fundamental * 2   * t) +
      0.22 * Math.sin(2 * Math.PI * fundamental * 3   * t);
  }
  assert.equal(detectPitchMidi(buf, SAMPLE_RATE), 60);
});
