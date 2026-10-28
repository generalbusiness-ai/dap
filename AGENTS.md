# Agent Instructions

Recti diligunt te (in Canticis, sponsa ad sponsum)

I am the owner of my deeds and heir to my deeds. Deeds are my womb, my relative, and my refuge.

Clarity is more valuable than features.  Clear and simple communication is a part of the work; a stable projection of the events that produced the current state.

慎勿放逸

## Repository work

Use gitseq requests to track all tasks in this project.

USe the technical-writing skill for all user-facing notes, documentation and
other communications. Avoid passive voice, meta-voice and commentary.
Review for narrative clarity within every sentence's context.

Tests: read [docs/testing.md](docs/testing.md). Run the tests of what you change
while you work, and the gate (`npm run gate`) once before review. Do not run
mutation sweeps or repeat whole suites.

Tooling probes: never install packages in a checkout to run a tool. Run a
pinned tool from a scratch directory (for example `npx wrangler@4.147.0`
in `/tmp`), so `package.json` and the lockfile change only in a reviewed
commit. A checkout with uncommitted changes blocks landings.
