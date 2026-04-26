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

  async function loadModule() {
    if (!_modulePromise) _modulePromise = import(PKG_URL);
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
      // The constructor accepts either a TF GraphModel or a URL string.
      // It does NOT accept zero arguments.
      return new Cls(MODEL_URL);
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

    // Resample to the package's required 22050 Hz mono.
    const audio22k = resample(float32Buffer, sampleRate, TARGET_SAMPLE_RATE);

    // evaluateModel streams results: it calls the frame callback per chunk
    // with (frames, onsets, contours), and the progress callback with 0..1.
    // It does NOT return anything useful.
    const frameChunks   = [];
    const onsetChunks   = [];
    const contourChunks = [];

    await inst.evaluateModel(
      audio22k,
      (frames, onsets, contours) => {
        frameChunks.push(frames);
        onsetChunks.push(onsets);
        contourChunks.push(contours);
      },
      () => { /* progress — no-op */ }
    );

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

    // Signature: outputToNotesPoly(frames, onsets, contours,
    //   onsetThresh=0.5, frameThresh=0.3, minNoteLen=5, inferOnsets=true,
    //   maxFreq=null, minFreq=null, melodiaTrick=true, energyTol=11)
    const events = toEvents(frames, onsets, contours, 0.5, 0.3);

    const set = new Set();
    if (events) {
      for (const ev of events) {
        if (ev && ev.pitchMidi != null) set.add(ev.pitchMidi | 0);
      }
    }
    return set;
  }

  if (typeof window !== 'undefined') {
    window.basicPitchLoadModel = loadModel;
    window.basicPitchAnalyzeWindow = analyzeWindow;
  }
})();
