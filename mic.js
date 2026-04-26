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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createMicStore };
  } else {
    window.micStore = createMicStore();
    window.createMicStore = createMicStore;
  }
})();
