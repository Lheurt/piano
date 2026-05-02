# Devices — MIDI and microphone

The Devices view manages the two external input sources Fermata can use in addition to the on-screen keyboard: a MIDI keyboard, and the microphone for acoustic-piano pitch input.

Code: `Views.jsx` (`DevicesView`, `MicSettings`), `midi-helpers.js`, `mic.js`, `pitch-yin.js`.

## MIDI

The browser's Web MIDI API auto-detects connected USB/Bluetooth keyboards. The Devices view shows a single connection row: the device name (or "disconnected") and a status line. There is no manual scan or pairing step — connect a keyboard and it appears.

Wiring:

- `midi-helpers.js` exposes `window.registerMidiCallback(fn)`. Views (`PracticeView`, `ChordsView`) register a callback on mount and unregister on unmount; only one consumer is active at a time.
- The callback receives a pitch name string (e.g. `"C#4"`).

Permissions row shows **Web MIDI: granted**. If a keyboard isn't detected, the troubleshooting list covers the common causes (cable, browser, OS-level claim by another app).

## Microphone

The mic input enables sight-reading or chord drills with an acoustic piano (or voice). Off by default — toggle on in the Devices view. State lives in `window.micStore` (subscribable).

Pitch detection pipeline:

- `mic.js` captures audio from `getUserMedia` and routes it to `pitch-yin.js` (a YIN autocorrelation pitch detector).
- Detected pitches are emitted via `window.registerMicCallback(fn)`. Views consume the same way as MIDI.
- The YIN loop pauses when the browser tab is hidden (battery + CPU).

In the Chords view, mic input is **sequential single-note**: notes are heard one at a time and accumulated into a chord answer (no polyphonic transcription). Earlier polyphonic experiments (Basic Pitch) were removed in favor of this simpler, more reliable flow.

Status labels:

- **Off** — toggle is off
- **Loading** — initializing audio worklet / requesting permission
- **Listening** — actively detecting
- **Error** — getUserMedia failed or audio context could not start

## Privacy

Audio is processed locally in the browser tab. No audio is uploaded or stored.

## Troubleshooting

- HTTPS or `localhost` is required for `getUserMedia` to work.
- If pitch detection is jittery, lower system gain or move closer to the source.
- Some browsers gate audio worklet startup behind a user gesture — toggling the mic off and on usually resolves this.
