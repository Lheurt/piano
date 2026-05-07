# Practice — sight-reading

The Practice view shows a passage of 8 random notes on the grand staff. The user reads each note in sequence and plays it (on-screen keyboard, MIDI device, or microphone). Each note is judged immediately as correct or incorrect, with brief visual feedback before advancing.

Code: `Views.jsx` (`PracticeView`), `notes.js` (`makePassage`), `GrandStaff.jsx`.

## Reading and playing

A playhead marks the current note. Correct notes advance after ~180ms. Incorrect notes flash red and the user retries the same note (no skip). When all 8 are answered, the passage shows a summary and the user starts a new passage with **New**.

When **Show mistakes on staff** is enabled in [Settings](settings.md), an incorrect note also draws a small red dot on the staff at the played pitch's position, vertically aligned with the prompt notehead. This makes the interval between target and played pitch visible while the red flash is active (~420ms). The dot routes to the band matching the played pitch's natural clef in grand mode, or onto the visible band (with ledger lines if needed) in single-clef mode.

Input sources are interchangeable in the same passage:

- **Click** the on-screen keyboard
- **MIDI** keyboard (auto-detected via Web MIDI; see [Devices](devices.md))
- **Microphone** (single-pitch detection via YIN; see [Devices](devices.md))

## Controls

- **Clef toggle** (grand / treble / bass) — switches the staff layout and pitch pool. Changing the clef starts a new passage.
- **Difficulty** (1–4, with `?` info button) — picks the pitch pool. See [Difficulty tiers](#difficulty-tiers) below. The selected tier persists across reloads.
- **Hint** (eye icon, top-right of staff) — when on, highlights the currently-prompted key on the keyboard.
- **Mute** — silences the synth voice that plays back user input.
- **New** — generates a fresh 8-note passage with the current settings.

## Difficulty tiers

Each tier defines a pitch pool per clef. Pools are inclusive C-to-C (so "1 octave" means 8 white keys with both Cs as anchors). Default tier is **3** — it matches what was shipped before tiers existed.

| Tier | Treble | Bass | Grand | Accidentals |
|------|--------|------|-------|-------------|
| 1 | C4–C5 (1 oct) | C3–C4 (1 oct) | C3–C5 (2 oct) | no |
| 2 | C4–C5 | C3–C4 | C3–C5 | yes |
| 3 | C4–C6 (2 oct) | C2–C4 (2 oct) | C2–C6 (4 oct) | yes |
| 4 | C3–C6 (3 oct) | C2–C5 (3 oct) | C2–C6 (4 oct), clef-fuzzed | yes |

The progression deliberately scales two axes: **range** (how far above and below the staff you read) and **chromatic vocabulary** (whether sharps/flats appear). Tier 4 trains a third skill — reading ledger lines.

### What changes at each tier

- **Tier 1** — the staff body, plain. One octave centered on middle C, naturals only. The fastest way to drill the lines and spaces of the active clef without distractions.
- **Tier 2** — adds sharps and flats to the same one-octave window. Both enharmonic spellings appear (`C#4` and `Db4` are both possible prompts).
- **Tier 3** — expands to two octaves per clef (the conventional sight-reading range), accidentals on. This is the default and matches the historical behavior of the app.
- **Tier 4** — adds **ledger-line crawl**. In single-clef mode, the staff extends one octave into the other clef's territory: the treble staff renders down to C3 with stacked ledger lines below; the bass staff renders up to C5 with stacked ledger lines above. Total range stays bounded — past one octave, real piano notation typically uses `8va`/`8vb` brackets rather than more ledger lines, so the tier reflects what you'll actually encounter on a page.

  In **grand mode**, tier 4 keeps the C2–C6 range but **fuzzes the clef assignment** in the overlap zone (C3–C5 inclusive): a note at A3 might be drawn on the treble staff with ledger lines below, instead of in its natural position on the bass staff. Notes outside the overlap (C2–B2 always bass; C♯5–C6 always treble) follow the usual rule. The result is that grand-mode tier 4 trains the same ledger-line reading skill without expanding the range.

## Generation rules

Defined in `notes.js`. Within a tier and clef, the generator picks 8 notes uniformly at random from the pool, with one constraint: no two consecutive notes share the same MIDI number (no immediate repeats). When accidentals are in the pool, both enharmonic spellings of each black key are present, so the same sounding pitch may appear notated either as a sharp or a flat across draws.

## Layout (responsive)

The Practice view always renders the full grand staff and a 4-octave keyboard (C2–C6), regardless of clef or tier. The current clef + tier defines an *active* region — the same pitch pool described under [Difficulty tiers](#difficulty-tiers). Octaves outside that region are greyed on the keyboard, on the orientation strip above it, and on the staff (the inactive clef's band is dimmed). Inside the active region every key is interactive.

The grand staff caps at 760px wide and centers on large displays — beyond that the staff stretches into uncomfortable empty space. The keyboard caps at 1100px (roughly the natural width of 4 octaves at the target key size) and centers as well. Both adapt below their cap. The 900px breakpoint matches the shell layout (bottom-tab bar below, sidebar above): below it the keys are ~40px wide (touch-friendlier), above it ~36px (the sidebar consumes ~280px, so the remaining space packs more keys in). The keyboard is always pannable across the full C2–C6 range when the visible window is smaller than the active region.

- **Phones (~320–600px)** — roughly 1 to 1.5 octaves visible.
- **Tablets and large phones (~600–899px)** — roughly 2 to 3 octaves visible.
- **Desktop (≥900px)** — 2 to 4 octaves visible depending on viewport width; full 4 octaves above ~1400px.

Greyed keys produce no sound. Tapping a greyed key on the on-screen keyboard flashes it red briefly (no scoring impact, no advance). MIDI/mic input that maps to a greyed octave is dropped silently. Greyed regions on the orientation strip are inert too — tapping them does not pan the keyboard.
