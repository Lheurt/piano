# Fermata

Piano sight-reading + chord trainer. Plain HTML + React 18 (CDN) + Babel standalone — no build step.

## Run locally

```
make serve   # python3 -m http.server 8000
```

Then open http://localhost:8000. Babel fetches `.jsx` files via HTTP, so opening `index.html` directly with `file://` won't work.

## Layout

`index.html` is the only entry. `App.jsx` switches between desktop shell and a narrow (mobile) shell at the 900 px breakpoint.

## Components

- `App.jsx` — root, responsive shell switch
- `Shell.jsx` — desktop header + side nav
- `Views.jsx` — `PracticeView` (sight-reading), `DevicesView`, `SettingsView`, `HelpView`, `MicSettings`
- `ChordsView.jsx` — chord identification practice
- `GrandStaff.jsx` — SVG grand staff (treble + bass), 2 octaves per clef with ledger lines
- `ChordStack.jsx` — single-clef chord notation for hint panels
- `PannableKeyboard.jsx` — interactive piano with minimap + drag-to-pan; range and minimap variant set per use site. Requires `midi-helpers.js` to be loaded first.

## Scripts loaded by `index.html`

`audio.js`, `midi-helpers.js`, `pitch-yin.js`, `mic.js`, `notes.js`, `chords.js` are loaded as plain scripts before any `.jsx`.

## Styles

- `colors_and_type.css` — design tokens
- `kit.css` — app-scoped component styles, including `.m-*` for the mobile shell
- `pannable-keyboard.css` — styles for `PannableKeyboard`

## Tests

```
npm test
```

Runs `node --test` against `*.test.js` (chords, mic, pitch-yin).
