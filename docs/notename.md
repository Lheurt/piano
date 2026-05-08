# Note name — flashcard

The Note name view shows one note on a staff and asks the user to tap the matching letter on a button bar at the bottom. Octave is irrelevant — every C is a "C." If accidentals are on, the user reads through the ♯/♭ and taps the underlying letter.

Code: `NoteNameView.jsx`, `NoteFlash.jsx` (single-note staff renderer), `notes.js` (`makeNoteFlash`, `noteFlashTierPool`).

## Loop

The session is an endless flashcard loop. There is no fixed passage length and no Done state.

- **Right letter** — green flash on the button, the prompted note plays through the synth, the prompt advances. Counter increments: `total++`; `correct++` only if this was the first tap on this prompt.
- **Wrong letter** — red flash on the button. Prompt stays put. The prompt is marked "missed" so the eventual right tap will not increment `correct`.

The HUD shows `correct / total first try` — first-try accuracy out of completed prompts.

The **Reset stats** button zeros both counters. Stats do not persist across reloads or view changes.

## Tiers

Four cumulative difficulty tiers. The `?` button opens a panel describing each.

| Tier | Range above/below staff | Accidentals |
|------|-------------------------|-------------|
| 1 | Staff body only (5 lines + 4 spaces) | no |
| 2 | + 1 ledger line above and below | no |
| 3 | + 2 ledger lines above and below (full envelope) | no |
| 4 | Full envelope, accidentals on | yes |

Tier 4 draws both ♯ and ♭ spellings of each black key across draws (e.g. F♯ and G♭ for the same sounding pitch). The answer is determined by the staff line/space, not the accidental.

Tier persists across reloads (`fermata.notename.tier`).

## Clef

Treble (𝄞) or bass (𝄢) toggle in the HUD, independent of tier. The active clef sets which staff is drawn and which range table is used. Persists across reloads (`fermata.notename.clef`).

## Answer bar

Seven letter buttons at the bottom, in C-D-E-F-G-A-B order — matches the Do-Re-Mi sequence in solfège mode. The buttons display:

- **English mode:** `C  D  E  F  G  A  B`
- **Solfège mode:** `Do  Re  Mi  Fa  Sol  La  Si`

Names track the global note-naming setting in [Settings](settings.md), so the bar updates live when the user toggles English ↔ Solfège.

## Audio

Right taps play the prompted note through the synth at the actual sounding pitch (so the user hears the F4 they just identified). Wrong taps are silent. Respects the global mute toggle.

## Inputs

Tap-only — no keyboard, no MIDI, no microphone. The drill is intentionally about reading the staff and identifying the letter.
