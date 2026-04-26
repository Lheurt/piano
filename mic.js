// mic.js — microphone capture, lifecycle, and pitch-detector orchestration.
// Dual-environment: store is testable in Node; browser-only pieces (getUserMedia,
// AudioContext) are guarded so tests can run headless.

(function () {
  'use strict';

  // In Node 21+ `navigator` is a getter-only property on globalThis, which
  // makes test-time mocking via simple assignment silently fail (or throw in
  // strict mode). Redefine it as a plain writable value once so that tests
  // can do `globalThis.navigator = mockObj` and the change sticks.
  if (typeof module !== 'undefined') {
    var _navDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    if (_navDesc && typeof _navDesc.get === 'function' && _navDesc.configurable) {
      Object.defineProperty(globalThis, 'navigator', {
        value: globalThis.navigator,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  }

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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMicStore, createMic };
  } else {
    window.micStore = createMicStore();
    window.createMicStore = createMicStore;
    window.createMic = createMic;
  }
})();
