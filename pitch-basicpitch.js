// pitch-basicpitch.js — lazy wrapper around @spotify/basic-pitch.
// Browser-only. Loads the package + model from a CDN on first analyzeWindow().
//
// Contract:
//   window.basicPitchLoadModel()                               → Promise (idempotent)
//   window.basicPitchAnalyzeWindow(float32Array, sampleRate)   → Promise<Set<number>>
//
// The dynamic import only fires on first call — nothing is downloaded at page load.

(function () {
  'use strict';

  const PKG_URL   = 'https://esm.sh/@spotify/basic-pitch@1';
  // The TF.js GraphModel served alongside the npm package.
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@spotify/basic-pitch@1.0.1/model/model.json';
  // Basic Pitch is hard-coded to 22050 Hz mono Float32Array input.
  const TARGET_SAMPLE_RATE = 22050;

  let _modulePromise = null;
  let _instancePromise = null;

  function log(...args) {
    if (typeof console !== 'undefined') console.log('[basic-pitch]', ...args);
  }

  async function loadModule() {
    if (!_modulePromise) {
      log('importing package from', PKG_URL);
      _modulePromise = import(PKG_URL).then((m) => {
        log('package loaded; exports:', Object.keys(m).join(', '));
        return m;
      });
    }
    return _modulePromise;
  }

  async function loadModel() {
    return getInstance();
  }

  async function getInstance() {
    if (_instancePromise) return _instancePromise;
    _instancePromise = (async () => {
      const mod = await loadModule();
      const Cls = mod.BasicPitch || (mod.default && mod.default.BasicPitch);
      if (typeof Cls !== 'function') {
        throw new Error(
          'Basic Pitch: BasicPitch class not found. Module keys: ' +
          Object.keys(mod).join(', ')
        );
      }
      log('instantiating BasicPitch with model URL', MODEL_URL);
      const inst = new Cls(MODEL_URL);
      // The constructor stores a Promise<GraphModel> on inst.model. Await it
      // here so the first analyzeWindow() call doesn't pay the model-download
      // cost; pre-loading via loadModel() actually pre-loads, not just imports.
      if (inst.model && typeof inst.model.then === 'function') {
        log('awaiting graph model download...');
        try {
          inst.model = await inst.model;
          log('graph model ready');
        } catch (err) {
          log('graph model failed to load:', err && err.message);
          throw err;
        }
      }
      return inst;
    })();
    return _instancePromise;
  }

  // Linear-interpolation resample. Adequate because piano content sits well
  // below the post-resample Nyquist (11025 Hz at 22050 Hz target).
  function resample(input, fromRate, toRate) {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const srcIdx = i * ratio;
      const i0 = Math.floor(srcIdx);
      const frac = srcIdx - i0;
      const i1 = Math.min(input.length - 1, i0 + 1);
      out[i] = input[i0] * (1 - frac) + input[i1] * frac;
    }
    return out;
  }

  // Concatenate a list of 2D arrays (rows-of-rows) into a single 2D array.
  function concat2D(chunks) {
    if (chunks.length === 0) return [];
    if (chunks.length === 1) return chunks[0];
    const out = [];
    for (const c of chunks) for (const row of c) out.push(row);
    return out;
  }

  async function analyzeWindow(float32Buffer, sampleRate) {
    const [inst, mod] = await Promise.all([getInstance(), loadModule()]);

    if (typeof inst.evaluateModel !== 'function') {
      throw new Error(
        'Basic Pitch: evaluateModel() not on instance. Methods: ' +
        Object.keys(inst).filter(k => typeof inst[k] === 'function').join(', ')
      );
    }

    log('resampling', float32Buffer.length, 'samples from', sampleRate, 'to', TARGET_SAMPLE_RATE, 'Hz');
    const audio22k = resample(float32Buffer, sampleRate, TARGET_SAMPLE_RATE);

    const frameChunks   = [];
    const onsetChunks   = [];
    const contourChunks = [];

    log('running evaluateModel on', audio22k.length, 'samples');
    await inst.evaluateModel(
      audio22k,
      (frames, onsets, contours) => {
        frameChunks.push(frames);
        onsetChunks.push(onsets);
        contourChunks.push(contours);
      },
      () => { /* progress — no-op */ }
    );
    log('evaluateModel done; chunks:', frameChunks.length);

    const frames   = concat2D(frameChunks);
    const onsets   = concat2D(onsetChunks);
    const contours = concat2D(contourChunks);

    const toEvents = mod.outputToNotesPoly ||
                     (mod.default && mod.default.outputToNotesPoly);
    if (typeof toEvents !== 'function') {
      throw new Error(
        'Basic Pitch: outputToNotesPoly() not exported. Module keys: ' +
        Object.keys(mod).join(', ')
      );
    }

    // onsetThresh, frameThresh: Spotify's defaults (0.5 / 0.3) are tuned for
    // clean studio recordings and tend to miss middle voices on piano chords
    // captured via a laptop mic. Lowering both — especially onset — surfaces
    // the third note in triads at the cost of slightly more false positives.
    const events = toEvents(frames, onsets, contours, 0.3, 0.2);
    log('outputToNotesPoly produced', events ? events.length : 0, 'note events');

    const set = new Set();
    if (events) {
      for (const ev of events) {
        if (ev && ev.pitchMidi != null) set.add(ev.pitchMidi | 0);
      }
    }
    log('returning detected MIDI set:', Array.from(set).sort((a, b) => a - b).join(','));
    return set;
  }

  if (typeof window !== 'undefined') {
    window.basicPitchLoadModel = loadModel;
    window.basicPitchAnalyzeWindow = analyzeWindow;
  }
})();
