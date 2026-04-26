// mic.test.js — run with `npm test`.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMicStore } = require('./mic.js');

// Node 21+ defines globalThis.navigator as a getter-only property, which
// breaks the simple `globalThis.navigator = mockObj` pattern these tests
// rely on. Convert it to a writable value property once.
{
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  if (desc && typeof desc.get === 'function' && desc.configurable) {
    Object.defineProperty(globalThis, 'navigator', {
      value: globalThis.navigator,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
}

test('createMicStore initial state', () => {
  const s = createMicStore();
  assert.deepEqual(s.getState(), {
    enabled: false,
    permission: 'unknown',
    level: 0,
    status: 'idle',
    error: null,
  });
});

test('setState merges patch and notifies subscribers', () => {
  const s = createMicStore();
  let calls = 0;
  let lastState = null;
  const unsubscribe = s.subscribe((state) => { calls++; lastState = state; });

  s.setState({ enabled: true });
  assert.equal(calls, 1);
  assert.equal(lastState.enabled, true);
  assert.equal(lastState.status, 'idle'); // unchanged

  s.setState({ status: 'listening' });
  assert.equal(calls, 2);
  assert.equal(lastState.enabled, true);
  assert.equal(lastState.status, 'listening');

  unsubscribe();
  s.setState({ level: 0.5 });
  assert.equal(calls, 2); // no further calls after unsubscribe
});

test('subscribe with multiple listeners, unsubscribe removes only that one', () => {
  const s = createMicStore();
  let aCalls = 0, bCalls = 0;
  const unsubA = s.subscribe(() => aCalls++);
  const unsubB = s.subscribe(() => bCalls++);
  s.setState({ level: 0.1 });
  assert.equal(aCalls, 1);
  assert.equal(bCalls, 1);
  unsubA();
  s.setState({ level: 0.2 });
  assert.equal(aCalls, 1);
  assert.equal(bCalls, 2);
  unsubB();
});

const { createMic } = require('./mic.js');

function makeMockTrack() {
  const track = {
    stopped: false,
    onended: null,
    stop() { this.stopped = true; },
  };
  return track;
}

function makeMockStream() {
  const tracks = [makeMockTrack()];
  return {
    tracks,
    getTracks() { return tracks; },
    getAudioTracks() { return tracks; },
  };
}

function makeMockAudioContext() {
  const created = { filters: [], analysers: [], sources: [] };
  const filter = { type: null, frequency: { value: 0 }, connect() {} };
  const analyser = { fftSize: 0, getFloatTimeDomainData() {}, connect() {} };
  return {
    state: 'running',
    sampleRate: 44100,
    resume() { this.state = 'running'; return Promise.resolve(); },
    createMediaStreamSource() {
      const src = { connect() {} };
      created.sources.push(src);
      return src;
    },
    createBiquadFilter() {
      created.filters.push(filter);
      return filter;
    },
    createAnalyser() {
      created.analysers.push(analyser);
      return analyser;
    },
    _created: created,
  };
}

function withMockedBrowser(getUserMediaImpl) {
  const stream = makeMockStream();
  const ctx = makeMockAudioContext();
  const originalNavigator = globalThis.navigator;
  const originalAudioContext = globalThis.AudioContext;
  globalThis.navigator = {
    mediaDevices: { getUserMedia: getUserMediaImpl(stream) },
  };
  globalThis.AudioContext = function () { return ctx; };
  return {
    stream, ctx,
    restore() {
      globalThis.navigator = originalNavigator;
      globalThis.AudioContext = originalAudioContext;
    },
  };
}

test('createMic: enable() acquires stream and updates store', async () => {
  const env = withMockedBrowser((stream) => () => Promise.resolve(stream));
  try {
    const store = createMicStore();
    const mic = createMic(store);
    await mic.enable();
    const s = store.getState();
    assert.equal(s.enabled, true);
    assert.equal(s.permission, 'granted');
    assert.equal(s.status, 'listening');
    assert.equal(env.stream.getAudioTracks()[0].stopped, false);
  } finally { env.restore(); }
});

test('createMic: disable() stops tracks and updates store', async () => {
  const env = withMockedBrowser((stream) => () => Promise.resolve(stream));
  try {
    const store = createMicStore();
    const mic = createMic(store);
    await mic.enable();
    mic.disable();
    const s = store.getState();
    assert.equal(s.enabled, false);
    assert.equal(s.status, 'idle');
    assert.equal(env.stream.getAudioTracks()[0].stopped, true);
  } finally { env.restore(); }
});

test('createMic: enable() handles permission denied', async () => {
  const denied = new Error('NotAllowedError');
  denied.name = 'NotAllowedError';
  const env = withMockedBrowser(() => () => Promise.reject(denied));
  try {
    const store = createMicStore();
    const mic = createMic(store);
    await mic.enable();
    const s = store.getState();
    assert.equal(s.enabled, false);
    assert.equal(s.permission, 'denied');
    assert.equal(s.status, 'error');
  } finally { env.restore(); }
});

test('createMic: enable() handles missing getUserMedia (no mic hardware)', async () => {
  const originalNavigator = globalThis.navigator;
  globalThis.navigator = {}; // no mediaDevices
  try {
    const store = createMicStore();
    const mic = createMic(store);
    await mic.enable();
    const s = store.getState();
    assert.equal(s.enabled, false);
    assert.equal(s.status, 'error');
    assert.match(s.error || '', /not supported|unavailable|microphone/i);
  } finally { globalThis.navigator = originalNavigator; }
});
