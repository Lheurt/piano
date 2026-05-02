# Chords — chord recognition

The Chords view shows a chord symbol (e.g. `Cmaj7`, `F♯m`, `G/B`). The user plays the matching pitches on the keyboard. A passage is 8 chords.

Code: `ChordsView.jsx`, `chords.js` (theory + tier pools), `ChordStack.jsx` (chord-symbol render).

## Tiers

A 6-tier difficulty selector in the HUD controls the chord pool. Tiers are **cumulative** — tier N includes everything from tiers 1..N. The `?` button opens an info panel describing each tier's contents.

| Tier | New qualities | Roots | Inversions |
|------|---------------|-------|------------|
| 1 | major, minor | white keys only (C D E F G A B) | no |
| 2 | diminished (°), augmented (+) | all 12 chromatic | no |
| 3 | maj7, m7, 7, m7♭5, °7 | all 12 | no |
| 4 | sus2, sus4, add9, 6, m6 | all 12 | no |
| 5 | *(no new qualities)* | all 12 | yes — ~⅓ of draws use slash voicings (e.g. `C/E`) |
| 6 | 9, maj9, m9, 11, 13 | all 12 | yes |

Definitions in `chords.js`: `TIER_NEW_QUALITIES`, `qualitiesForTier`, `rootPcsForTier`, `makeChordPassage`.

The chord tier currently does not persist across reloads (defaults to tier 1).

## Input flows

The Chords view supports three input modes that drive the same validation:

- **Click** — tap keys on the on-screen keyboard. Selected keys highlight gray. Press **Check** to validate.
- **MIDI** — sequential entry: pressing each key adds it to the selection (lights green if it's part of the chord, red if not). Bypasses the manual Check step.
- **Microphone** — sequential single-note entry, same as MIDI. Notes are detected one at a time via YIN. See [Devices](devices.md) for mic setup.

A wrong key in sequential mode (mic/MIDI) is rejected immediately. In click mode, the user composes their answer freely and submits with Check.

## Validation

`window.validateChord(selectedMidiSet, currentChord)` (in `chords.js`) compares pitch classes. For inversions (slash chords like `C/E`), the **lowest sounding note** must match the bass note named after the slash; the upper voices match the chord's pitch classes regardless of octave or order.

## Controls

- **Clef toggle / tier selector** — top-right of the HUD
- **`?` info panel** — explains the tiers
- **Play** — sounds the user's current selection
- **Clear** — empties the selection
- **Check** — submits the selection (manual flow)
- **New** — next passage
- **Mute** — silences synth playback of user input
