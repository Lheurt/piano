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
    let _enabling = false;

    async function enable() {
      if (store.getState().enabled || _enabling) return;
      _enabling = true;
      try {
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
        startYin();
      } finally {
        _enabling = false;
      }
    }

    function disable() {
      stopYin();
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

    // Detector loop bootstrapping (browser only — Node tests don't have an
    // AnalyserNode to read from, so startYin returns early).
    let yinLoop = null;
    function startYin() {
      if (typeof window === 'undefined') return;
      if (yinLoop) return;
      const confirmer = createNoteConfirmer({
        onNote: (midi) => { fireMicNote(midi); },
      });
      yinLoop = createYinLoop({
        getAnalyser,
        getSampleRate,
        store,
        confirmer,
      });
      yinLoop.start();
    }
    function stopYin() {
      if (yinLoop) { yinLoop.stop(); yinLoop = null; }
    }

    // Pause the YIN loop while the tab is hidden — browsers throttle audio
    // in background tabs anyway, but stopping the loop avoids stale state
    // and saves a little CPU/battery. Resume on visibility if the mic is
    // still enabled. The mic stream itself stays open across hide/show.
    if (typeof document !== 'undefined') {
      let wasRunning = false;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          wasRunning = !!yinLoop;
          stopYin();
        } else if (wasRunning && store.getState().enabled) {
          startYin();
        }
      });
    }

    return { enable, disable, getAnalyser, getSampleRate, startYin, stopYin };
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

  // ─── YIN detector loop ─────────────────────────────────────────────────────

  function createYinLoop({ getAnalyser, getSampleRate, store, confirmer }) {
    let raf = 0;
    let running = false;
    let lastTickMs = 0;
    const TICK_MS = 33; // ~30 Hz
    let buf = null;

    function tick() {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - lastTickMs < TICK_MS) return;
      lastTickMs = now;

      const analyser = getAnalyser();
      if (!analyser) return;
      if (!buf || buf.length !== analyser.fftSize) buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);

      // Update VU level (RMS).
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      // Smooth a bit so the meter doesn't jitter every frame.
      const prev = store.getState().level;
      store.setState({ level: prev * 0.7 + rms * 0.3 });

      // Skip pitch detection when audio is essentially silent.
      if (rms < 0.005) {
        confirmer.push(null);
        return;
      }
      const detect = (typeof window !== 'undefined' && window.detectPitchMidi)
        ? window.detectPitchMidi
        : null;
      if (!detect) return;
      const midi = detect(buf, getSampleRate());
      confirmer.push(midi);
    }

    return {
      start() {
        if (running) return;
        running = true;
        raf = requestAnimationFrame(tick);
      },
      stop() {
        running = false;
        cancelAnimationFrame(raf);
      },
    };
  }

  // ─── Callback registration ────────────────────────────────────────────────
  // Mirrors registerMidiCallback in audio.js: at most one consumer at a time.

  let _micCallback = null;
  function registerMicCallback(fn) { _micCallback = fn; }
  function fireMicNote(midi) {
    if (_micCallback) {
      // The midi → pitch-name mapping lives in audio.js; reuse it for parity
      // with the MIDI callback contract (which delivers pitch names).
      const name = (typeof window !== 'undefined' && window.midiToName)
        ? window.midiToName(midi)
        : null;
      _micCallback(name, midi);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMicStore, createMic, createNoteConfirmer };
  } else {
    window.micStore = createMicStore();
    window.createMicStore = createMicStore;
    window.createMic = createMic;
    window.createNoteConfirmer = createNoteConfirmer;
    window.createYinLoop = createYinLoop;
    window.registerMicCallback = registerMicCallback;
    window.fireMicNote = fireMicNote;
  }
})();
