# Project instructions for Claude

## Docs grow with the code

User-facing app docs live in `docs/`, organized by app surface (one file per view: `practice.md`, `chords.md`, `devices.md`, `settings.md`, plus `README.md`). Whenever you ship a feature that changes a surface's behavior, update the corresponding `docs/*.md` file as part of the same change. The docs should always reflect the current shipped state, not future plans. Internal design specs in `docs/superpowers/` are gitignored working documents and are not a substitute.

## Prod never changes without the user's go

Nothing that affects production — or anything published beyond this machine — happens without the user's explicit go-ahead. This includes but is not limited to:

- `git push` to any remote, any branch (including feature branches)
- `gh pr create`, `gh pr merge`, or any GitHub write operation
- Force-pushes, tag pushes, release creation
- Deploys, hosting config changes, CI/CD triggers
- Publishing to package registries, CDNs, or any third party
- Updating shared infrastructure or env/config that affects prod

The user is the sole gate. If a plan or task description calls for any of these steps, skip it and flag it. Don't ask "should I push/deploy/publish?" as a shortcut to permission — just don't, and wait for the user to say go.

Local-only work is fine when requested: editing files, running tests, creating commits (on a branch — see below), switching branches, reading the repo. The line is between this machine and anything outside it.

## `main` is the user's branch

The `main` branch is integrated by the user, never by Claude. Two hard rules, on top of everything above:

- **Never commit to `main`.** If the current branch is `main` and a change needs to be committed, create or switch to a feature branch first, then commit there. Applies even when the user says "go ahead and commit" — assume they mean on a branch.
- **Never push to `main`,** ever — not even with explicit go-ahead. Updates to `main` happen only via the user merging a branch themselves. If asked to push to `main`, refuse and propose a branch + PR or branch + manual merge instead.

These rules are absolute and override any in-context approval. Other branches still follow the gate above: commits OK, pushes only with explicit go.
