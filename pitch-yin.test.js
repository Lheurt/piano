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
