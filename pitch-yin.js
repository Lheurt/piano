// pitch-yin.js — YIN fundamental-frequency detector.
// Dual-environment: works in the browser (populates window.detectPitchMidi)
// and in Node (module.exports).

(function () {
  'use strict';

  const THRESHOLD = 0.12;
  const MIN_TAU = 60;     // ≈ 735 Hz at 44.1 kHz — well above C5
  const MAX_TAU = 500;    // ≈ 88 Hz at 44.1 kHz — well below C3

  function difference(buf, maxTau) {
    const d = new Float32Array(maxTau);
    for (let tau = 1; tau < maxTau; tau++) {
      let sum = 0;
      const halfLen = buf.length - tau;
      for (let i = 0; i < halfLen; i++) {
        const delta = buf[i] - buf[i + tau];
        sum += delta * delta;
      }
      d[tau] = sum;
    }
    return d;
  }

  function cumulativeMeanNormalised(d) {
    const out = new Float32Array(d.length);
    out[0] = 1;
    let running = 0;
    for (let tau = 1; tau < d.length; tau++) {
      running += d[tau];
      out[tau] = d[tau] * tau / running;
    }
    return out;
  }

  function absoluteThreshold(dPrime, minTau) {
    for (let tau = minTau; tau < dPrime.length; tau++) {
      if (dPrime[tau] < THRESHOLD) {
        // descend to the local minimum
        while (tau + 1 < dPrime.length && dPrime[tau + 1] < dPrime[tau]) tau++;
        return tau;
      }
    }
    return -1;
  }

  function parabolicInterpolation(dPrime, tau) {
    if (tau <= 0 || tau >= dPrime.length - 1) return tau;
    const s0 = dPrime[tau - 1];
    const s1 = dPrime[tau];
    const s2 = dPrime[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom === 0) return tau;
    return tau + (s2 - s0) / denom;
  }

  function freqToMidi(freq) {
    return Math.round(69 + 12 * Math.log2(freq / 440));
  }

  // detectPitchMidi(Float32Array, sampleRate) → integer MIDI number or null.
  function detectPitchMidi(buf, sampleRate) {
    if (!buf || buf.length < MAX_TAU + 1) return null;
    const maxTau = Math.min(MAX_TAU, Math.floor(buf.length / 2));
    const d = difference(buf, maxTau);
    const dPrime = cumulativeMeanNormalised(d);
    const tau = absoluteThreshold(dPrime, MIN_TAU);
    if (tau < 0) return null;
    const refinedTau = parabolicInterpolation(dPrime, tau);
    const freq = sampleRate / refinedTau;
    if (!isFinite(freq) || freq <= 0) return null;
    return freqToMidi(freq);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detectPitchMidi };
  } else {
    window.detectPitchMidi = detectPitchMidi;
  }
})();
