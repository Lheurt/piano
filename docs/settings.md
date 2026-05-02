# Settings

The Settings view is grouped into three sections: **Display**, **Evaluation**, and **Audio**. Today, only a subset of the controls is wired to actual behavior — the rest are placeholders for planned features and have no effect when changed.

Code: `Views.jsx` (`SettingsView`), `i18n.js`, `naming.js`, `locales.js`.

## Display

| Control | Wired? | Behavior |
|---------|--------|----------|
| **Language** | yes | `window.i18n.setLocale(code)` — switches UI strings. Choices come from `window.LOCALES` (`locales.js`). Persists. |
| **Note names** (English ↔ Solfège) | yes | `window.namingStore.setMode('english' \| 'solfege')` — toggles `C D E F G A B` vs `Do Re Mi Fa Sol La Si`. Affects all rendered note names app-wide. Persists. |
| **Show labels** | no | Local state only. No effect today. |
| **Default clef** | no | Local state only; the Practice view defaults to `grand`. |

## Evaluation

| Control | Wired? | Behavior |
|---------|--------|----------|
| **Strict** | no | Local state only. |
| **Timing** (off / loose / strict) | no | Local state only. |

## Audio

| Control | Wired? | Behavior |
|---------|--------|----------|
| **Sound** | no | Local state only. (Per-view **Mute** toggles in Practice and Chords are the wired path; they call `window.setMuted`.) |
| **Metronome BPM** | no | Local state only. |

## Persistence

Wired settings (language, note names) persist via stores defined in `i18n.js` and `naming.js`. Each store exposes `subscribe(fn)` for reactive updates and writes to `localStorage` on change. New settings should follow the same pattern.
