// mic.js — microphone capture, lifecycle, and pitch-detector orchestration.
// Dual-environment: store is testable in Node; browser-only pieces (getUserMedia,
// AudioContext) are guarded so tests can run headless.

(function () {
  'use strict';

  // ─── Store ─────────────────────────────────────────────────────────────────

  function createMicStore() {
    let state = {
      enabled: false,
      permission: 'unknown', // 'unknown' | 'granted' | 'denied'
      level: 0,
      status: 'idle',        // 'idle' | 'listening' | 'loading' | 'error'
      error: null,
    };
    const listeners = new Set();

    return {
      getState() { return state; },
      setState(patch) {
        state = Object.assign({}, state, patch);
        listeners.forEach((fn) => fn(state));
      },
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
  }

  // ─── Capture lifecycle ─────────────────────────────────────────────────────

  function createMic(store) {
    let stream = null;
    let ctx = null;
    let analyser = null;

    async function enable() {
      if (store.getState().enabled) return;
      if (!globalThis.navigator || !globalThis.navigator.mediaDevices ||
          !globalThis.navigator.mediaDevices.getUserMedia) {
        store.setState({
          enabled: false,
          status: 'error',
          error: 'Microphone API not supported in this browser.',
        });
        return;
      }
      try {
        stream = await globalThis.navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (err) {
        const denied = err && (err.name === 'NotAllowedError' ||
                                err.name === 'SecurityError');
        store.setState({
          enabled: false,
          permission: denied ? 'denied' : store.getState().permission,
          status: 'error',
          error: err && err.message || String(err),
        });
        return;
      }

      ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 80;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(highpass);
      highpass.connect(analyser);

      const tracks = stream.getAudioTracks();
      tracks.forEach((t) => {
        t.onended = () => {
          // OS revoke or unplug
          disable();
          store.setState({ status: 'error', error: 'Microphone disconnected.' });
        };
      });

      store.setState({
        enabled: true,
        permission: 'granted',
        status: 'listening',
        error: null,
      });
    }

    function disable() {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      analyser = null;
      // Keep ctx around — closing it on every toggle is wasteful, and AudioContexts
      // are expensive to construct. It will be GC'd with the page.
      store.setState({
        enabled: false,
        status: 'idle',
        level: 0,
      });
    }

    function getAnalyser() { return analyser; }
    function getSampleRate() { return ctx ? ctx.sampleRate : 44100; }

    return { enable, disable, getAnalyser, getSampleRate };
  }

  // ─── Note confirmer ────────────────────────────────────────────────────────
  // A pitch must appear in 3 consecutive frames (±1 semitone wobble OK) before
  // firing. Re-trigger requires a null frame or a different note in between.

  const CONFIRM_FRAMES = 3;
  const WOBBLE_SEMITONES = 1;

  function createNoteConfirmer({ onNote }) {
    let canonical = null;   // the pitch we're trying to confirm
    let count = 0;
    let lastFired = null;   // the most recently fired note, or null after reset

    function push(midi) {
      if (midi === null) {
        canonical = null;
        count = 0;
        lastFired = null; // null frame = release; next note can fire
        return;
      }
      if (canonical === null) {
        canonical = midi;
        count = 1;
        return;
      }
      if (Math.abs(midi - canonical) <= WOBBLE_SEMITONES) {
        count++;
        if (count === CONFIRM_FRAMES && canonical !== lastFired) {
          lastFired = canonical;
          onNote(canonical);
        }
      } else {
        // different note — start counting it
        canonical = midi;
        count = 1;
        lastFired = null;
      }
    }

    return { push };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMicStore, createMic, createNoteConfirmer };
  } else {
    window.micStore = createMicStore();
    window.createMicStore = createMicStore;
    window.createMic = createMic;
    window.createNoteConfirmer = createNoteConfirmer;
  }
})();
