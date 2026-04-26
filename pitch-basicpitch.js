// pitch-basicpitch.js — lazy wrapper around @spotify/basic-pitch.
// Browser-only. Loads the package + model from a CDN on first analyzeWindow().
//
// Contract (what consumers depend on):
//   window.basicPitchLoadModel()                         → Promise (idempotent)
//   window.basicPitchAnalyzeWindow(float32Array, sampleRate) → Promise<Set<number>>
//
// The heavy import() only fires on first call — nothing is downloaded at page load.

(function () {
  'use strict';

  // esm.sh serves npm packages as ESM with their dependencies bundled.
  const PKG_URL = 'https://esm.sh/@spotify/basic-pitch@1';

  // Single in-flight promise for the module import, cached after resolution.
  let _modulePromise = null;

  // Single in-flight promise for the BasicPitch instance, cached after resolution.
  let _instancePromise = null;

  // ─── Module loading ─────────────────────────────────────────────────────────

  async function loadModule() {
    if (!_modulePromise) {
      _modulePromise = import(PKG_URL);
    }
    return _modulePromise;
  }

  // Public alias: loadModel() is the name the task contract exposes.
  async function loadModel() {
    return loadModule();
  }

  // ─── Instance creation ───────────────────────────────────────────────────────
  // The package exports a BasicPitch class. Different versions differ on whether
  // the constructor requires a model URL argument.

  async function getInstance() {
    if (_instancePromise) return _instancePromise;
    _instancePromise = (async () => {
      const mod = await loadModule();

      // Resolve the class — it may be a named export or sit under .default.
      const Cls = mod.BasicPitch
               || (mod.default && mod.default.BasicPitch)
               || mod.default;

      if (typeof Cls !== 'function') {
        throw new Error(
          'Basic Pitch: BasicPitch class not found on imported module. ' +
          'Got keys: ' + Object.keys(mod).join(', ')
        );
      }

      // v1 of the package accepts an optional model URL; try no-arg first, then
      // with the canonical model path published alongside the package on esm.sh.
      let inst;
      try {
        inst = new Cls();
      } catch (_noArg) {
        // If the no-arg constructor throws, the version almost certainly needs
        // a model URL.  The standard model distributed with the package:
        const MODEL_URL = 'https://esm.sh/@spotify/basic-pitch@1/model/model.json';
        try {
          inst = new Cls(MODEL_URL);
        } catch (err) {
          throw new Error(
            'Basic Pitch: instantiation failed with and without model URL. ' +
            'Actual error: ' + (err && err.message || String(err)) + '. ' +
            'You may need to verify the model URL for this CDN-served version.'
          );
        }
      }

      return inst;
    })();
    return _instancePromise;
  }

  // ─── MIDI set helpers ────────────────────────────────────────────────────────

  // Convert an array of note-event objects into a Set of integer MIDI numbers.
  // The package has used several field names across versions; try them all.
  function eventsToMidiSet(events) {
    const set = new Set();
    if (!events) return set;
    for (const ev of events) {
      const m = ev.pitchMidi != null ? ev.pitchMidi
              : ev.midiNote  != null ? ev.midiNote
              : ev.midi      != null ? ev.midi
              : ev.pitch     != null ? ev.pitch
              : null;
      if (m != null) set.add(m | 0); // coerce to integer
    }
    return set;
  }

  // ─── Public analyzeWindow ────────────────────────────────────────────────────

  async function analyzeWindow(float32Buffer, _sampleRate) {
    const [inst, mod] = await Promise.all([getInstance(), loadModule()]);

    // evaluateModel is the standard entry point on the BasicPitch instance.
    if (typeof inst.evaluateModel !== 'function') {
      throw new Error(
        'Basic Pitch: evaluateModel() not available on instance. ' +
        'Instance keys: ' + Object.keys(inst).filter(k => typeof inst[k] === 'function').join(', ')
      );
    }

    const result = await inst.evaluateModel(float32Buffer);
    const { frames, onsets, contours } = result;

    // Resolve the helper that converts frames/onsets/contours to note events.
    // Different versions expose it under different names.
    const toEvents = mod.outputToNotesPoly
                   || (mod.default && mod.default.outputToNotesPoly)
                   || mod.noteFramesToTime
                   || (mod.default && mod.default.noteFramesToTime)
                   || mod.addPitchBendsToNoteEvents  // unlikely, but catch odd exports
                   || null;

    if (typeof toEvents !== 'function') {
      throw new Error(
        'Basic Pitch: events helper not found on module. ' +
        'Tried: outputToNotesPoly, noteFramesToTime. ' +
        'Actual module exports: ' + Object.keys(mod).join(', ')
      );
    }

    // Thresholds: onset 0.5, frame 0.3 are sensible defaults for clean piano audio.
    const events = toEvents(frames, onsets, contours, 0.5, 0.3);
    return eventsToMidiSet(events);
  }

  // ─── Expose on window ────────────────────────────────────────────────────────

  if (typeof window !== 'undefined') {
    window.basicPitchLoadModel = loadModel;
    window.basicPitchAnalyzeWindow = analyzeWindow;
  }
})();
