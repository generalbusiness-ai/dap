# Slice H1: plans retired and indexed, guides moved, status lines corrected

Planner, 25 October 2026. Request `a22cc5b2` (PD-7 of the technical-debt
review `72a6df7d`). Documents, two listings and one gate line.

## What changed

- 31 plans without live work, the usability packet `027-artroom-usability/`,
  the handoff log (now `retired/credential-cleanup-handoffs.md`) and the
  test-invariants map moved to `notes/plans/retired/`. Plans 010, 014 and
  026 gained `Status: retired; no work follows from it.` Nothing else in
  a moved file changed.
- `notes/plans/README.md` is an index, current plans first;
  `notes/README.md` says what each directory under `notes/` holds.
- `docs/protocol.md`, `docs/release.md` and `docs/policy-pack.md` moved to
  `notes/retired-guides/`. `docs/README.md`, `docs/scopes.md`,
  `docs/kernel.md`, `docs/pages.md`, `docs/testing.md` and the two room
  pages follow the moves; the spikes directory is no longer named in the
  guides.
- `docs/roadmap.md` says the floor's first two slices are built and the
  archive runs on `dap-grow`. Plans 032 and 033 and the history note say
  what is built; the history note's H6 names the application codec under
  `packages/platform/src/application-codec/`.
- `scripts/gate.sh` runs `node scripts/check-doc-links.mjs` after the
  citation tests. Two listings in `scripts/section-citation-findings.json`
  whose target `docs/protocol.md` moved are removed; those citations are
  now unresolved review items, not broken ones.

## Decisions

- Moved files keep their content so history stays readable; links to them
  were updated only where a markdown link would break.
- The status-line gate test of H1 (rule 4) is not in this head; it joins
  BR-7.

## Evidence

| Check | Command | Exit | Result |
|---|---|---|---|
| Links | `node scripts/check-doc-links.mjs` | 0 | 705 links, 0 broken |
| Citations | `node scripts/check-section-citations.mjs` | 0 | 0 broken, 0 listing errors |
| Gate | `npm run gate` at `63165631` | 0 | 3,585 passed, 3 skipped (16:00 to 16:26, 25 October) |

No raw output is retained for this head: the checks above print their
result on one line each, and the gate's own log is the evidence named in
the review request.

## Open limits

- The status-line gate test (H1 rule 4): BR-7.
- Textual mentions of old plan paths inside historical notes stay as
  written.
