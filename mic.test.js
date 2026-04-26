// mic.test.js — run with `npm test`.

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMicStore } = require('./mic.js');

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
