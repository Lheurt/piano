// audio.js — piano synthesis + Web MIDI input
// Exposes: window.playNote(pitchName), window.initMIDI(onConnect, onDisconnect),
//          window.registerMidiCallback(fn)

(function () {
  'use strict';

  let _ctx = null;
  let _midiCallback = null;
  let _muted = false;

  // ─── AudioContext ──────────────────────────────────────────────────────────

  function getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // ─── Pitch utilities ───────────────────────────────────────────────────────

  const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  function nameToMidi(pitch) {
    const m = pitch.match(/^([A-G])([#b]?)(\d)$/);
    if (!m) return null;
    const [, letter, acc, octStr] = m;
    let pc = CHROMATIC.indexOf(letter);
    if (pc < 0) return null;
    if (acc === '#') pc += 1;
    if (acc === 'b') pc -= 1;
    return (parseInt(octStr, 10) + 1) * 12 + pc;
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function midiToName(midi) {
    return CHROMATIC[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  // ─── Piano synthesis ───────────────────────────────────────────────────────
  // Additive synthesis: harmonic series + percussive noise burst.
  // Decay time scales with register — lower notes sustain much longer.

  function playNote(pitch) {
    if (_muted) return;
    const ac = getCtx();
    const midi = nameToMidi(pitch);
    if (midi === null) return;

    const freq = midiToFreq(midi);
    const now  = ac.currentTime;

    // Decay: ~3 s at C3, ~0.5 s at C6
    const decay = 3.2 * Math.pow(2, -(midi - 48) / 36);
    const peak  = 0.40;

    // Master envelope: 3 ms linear attack → exponential decay
    const master = ac.createGain();
    master.connect(ac.destination);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(peak, now + 0.003);
    master.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    // Harmonic partials — sine waves with slight inharmonicity
    // (real piano strings are stiffer at high partials, making them sharper)
    [
      { n: 1, g: 1.00 },
      { n: 2, g: 0.45 },
      { n: 3, g: 0.22 },
      { n: 4, g: 0.09 },
      { n: 5, g: 0.04 },
      { n: 6, g: 0.02 },
    ].forEach(({ n, g }) => {
      const inharmonic = 1 + 0.00016 * n * n;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * n * inharmonic;
      gain.gain.value = g;
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + decay + 0.05);
    });

    // Brief hammer-strike noise — band-passed around the fundamental
    const noiseFrames = Math.floor(ac.sampleRate * 0.025);
    const noiseBuf    = ac.createBuffer(1, noiseFrames, ac.sampleRate);
    const noiseData   = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseFrames; i++) noiseData[i] = Math.random() * 2 - 1;

    const filt = ac.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freq * 3.5;
    filt.Q.value = 0.8;

    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0.07, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.connect(filt);
    filt.connect(noiseGain);
    noiseGain.connect(ac.destination);
    src.start(now);
    src.stop(now + 0.025);
  }

  // ─── Web MIDI ──────────────────────────────────────────────────────────────

  function registerMidiCallback(fn) {
    _midiCallback = fn;
  }

  function wireInput(input) {
    input.onmidimessage = (evt) => {
      const [status, noteNum, velocity] = evt.data;
      const cmd = status & 0xf0;
      if (cmd === 0x90 && velocity > 0) {        // note on
        const pitch = midiToName(noteNum);
        playNote(pitch);
        if (_midiCallback) _midiCallback(pitch);
      }
    };
  }

  function initMIDI(onConnect, onDisconnect) {
    if (!navigator.requestMIDIAccess) return;

    navigator.requestMIDIAccess({ sysex: false })
      .then((access) => {
        access.inputs.forEach((input) => {
          wireInput(input);
          if (onConnect) onConnect(input.name);
        });

        access.onstatechange = (evt) => {
          const port = evt.port;
          if (port.type !== 'input') return;
          if (port.state === 'connected') {
            wireInput(port);
            if (onConnect) onConnect(port.name);
          } else {
            if (onDisconnect) onDisconnect(port.name);
          }
        };
      })
      .catch(() => {/* MIDI permission denied — silent, virtual keyboard still works */});
  }

  window.playNote             = playNote;
  window.midiToName           = midiToName;
  window.setMuted             = (val) => { _muted = val; };
  window.initMIDI             = initMIDI;
  window.registerMidiCallback = registerMidiCallback;
}());
