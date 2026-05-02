# Fermata — App documentation

Fermata is a piano sight-reading and chord-recognition trainer. These docs describe what each app surface does, organized by what the user sees, not by code module. They reflect the **current shipped state** — not roadmap.

## Surfaces

- [Practice](practice.md) — sight-reading drill (read a note from the staff, play it on the keyboard)
- [Chords](chords.md) — chord-recognition drill (read a chord symbol, play the notes)
- [Devices](devices.md) — MIDI keyboard and microphone input
- [Settings](settings.md) — language, note naming, evaluation, audio

## Conventions

- Single-line entries describe behavior; code references use `file.ext` or `file.ext:line`.
- "Today" means the current state of `main`. When a feature changes, update its doc in the same commit.
- Internal design specs (gitignored) live in `docs/superpowers/specs/`. They are working documents, not product documentation.
