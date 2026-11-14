# GS-1: lighter records and notes-only test selection

GS-1 request `b29bd21ebda5346fd5e673cad8471b6e1cc0ec74` and promise
`f3d79f874bd82a5b6d0b3d106912e8048bf1c16d` cover this head. This
source checkpoint implements Parts A and B. Part C's Native-case audit
continues separately and has no implementation or timing result here.

The branch `builder/gs1-short-gate-20261114` starts from repaired combined
head `1c80cef3c7749f1c6220fbdc77ed85491b4c6502` as a local, unlanded
dependency. Main remains `189cf7b64a1501b307b9c73e96ee83641c3bd2de`.
The running combined gate and its checkout receive no changes from this
branch. Integration with the actual combined main remains owed before the
GS-1 gate.

## What changed

`docs/evidence-filing.md` and `docs/testing.md` now state rulings
`f45b355a8d4f2668412c28b6d32fdf13239b70cf` and
`13ea7ab7736cf0dca64313cdaf86e171044e2ef4`: START identifies the
head, tree, and main; one gate writes one external log; END gives its exit,
wall time, stage count lines, and SHA-256. The implementation note cites
that log directly. Cited control outputs stay in the same directory and
have direct path and SHA-256 citations too.

The docs remove mandatory supervisors, source and tool inventories, cache
copies, checksum files, read-only seals, committed evidence manifests,
power conditions, sleep records, and sealed landing records. No head owes
a formal focused interval. The existing focused tool remains optional.
Historical records stand. The document-only follow-up rule, failed-run
history, retention period, and 40,960-byte implementation-note warning
remain.

`scripts/check-notes.mjs` keeps the committed-object size check and removes
the warning about a new evidence filename's extension. Its owner now
requires no extension warning while retaining the byte-limit and
operational-error cases.

`scripts/gate-test-selection.mjs` selects whether the gate runs its test
step. `scripts/gate.sh` skips `npm test` only when the committed merge-base
diff is nonempty and every changed path starts with `notes/`. The skip
prints one line. An empty diff, a `docs/` change, and a mixed change run the
test step. Every other gate step still runs.

## Decisions and bounds

The helper reads the complete base-to-head Git range. It does not inspect
only the last commit, so a final note cannot hide an earlier source change.
It disables rename detection to expose both the removed and added names.
A move from source into `notes/` therefore retains the old source path and
does not skip. NUL framing preserves spaces and newlines in names. Missing
or invalid Git input fails selection instead of skipping tests.

The gate keeps its existing citation and note-size steps before the
conditional test step. It also runs `scripts/check-notes.test.mjs` and the
new selection owner there. The note-size owner moves out of `nodeFiles`,
so a full gate does not run that owner twice. The existing citation owner
already runs before the test step. The tracked-test inventory recognizes
these explicit `node --test` invocations as gate-owned files.

The note-reader source audit distinguishes checkout data from test data:

- `scripts/check-section-citations.test.mjs` reads synthetic reference and
  dated-note strings in Maps. Its real-command case writes reference notes
  into a temporary Git fixture. It does not read the checkout's note
  content. The gate's separate `citations` step does read actual tracked
  notes, including the contract and authority references. Both that step
  and `cite-test` still run for a notes-only head.
- `scripts/check-notes.test.mjs` reads committed synthetic note blobs in
  temporary Git repositories. Its byte-limit, extension, and missing-base
  witnesses stay active through the gate's `notes-test` step. The real
  `notes` step reads the checkout's committed note objects.
- `scripts/gate-test-selection.test.mjs` uses a temporary Git repository
  with synthetic note, docs, and source paths. The gate runs its owner
  before deciding whether to skip the full test step.
- `scripts/format-json.test.mjs` lists actual tracked JSON names and tests
  the evidence-path exclusion. It does not read notes' JSON content. The
  separate format step stays active for selected tracked JSON, including
  eligible JSON under `notes/` outside the evidence directory.
- `scripts/active-source.test.mjs` explicitly excludes `notes/` from its
  source reads. `scripts/check-kernel-boundary.test.mjs` covers kernel
  sources and synthetic fixtures, not checkout notes.
- `packages/cli/test/application-new.test.ts` creates a temporary project
  named `notes`. `packages/scope/test/site-route.test.ts` reads synthetic
  `notes/a.txt`, `notes/b.md`, and `notes/index.md` from its Git fixture.
  Neither owner reads the checkout's `notes/` tree.

Other matches for `notes` in product tests are comments, field names,
declared source names, or path strings. The audit found no product test
that reads the checkout's note content. The actual link checker can read
a note's headings when an active document links to that note. Its gate
step stays active. No Native or product owner moves into the notes-only
path on the strength of a synthetic fixture name.

## Evidence and remaining checks

This checkpoint is source-only. No syntax, compiler, test, control,
generator, build, model, or gate command ran for these changes. No package
production source changes. The changed scripts remain unchecked until the
execution slot permits their development checks. No timing result or
evidence manifest accompanies this note.

| Check | Command or boundary | Result |
|---|---|---|
| Selection owner | `node --test scripts/gate-test-selection.test.mjs` | UNRUN |
| Note-size owner | `node --test scripts/check-notes.test.mjs` | UNRUN |
| Existing gate owners | Whole test-runner and tracked-selection owners after integration | UNRUN |
| Selection control | One named control must turn the notes-only decision into an incorrect skip for a docs or mixed change and fail the existing selection assertion | UNRUN |
| Part C | Native-case inventory, protected paths, ordinary and scale selection, and one measured before-and-after comparison | Pending separate audit |
| Full gate | One `npm run gate` after integration with landed combined main and settled GS-1 scope | UNRUN |
| Review | Architecture, Security, Simplification, and exact-head source and evidence correspondence | UNRUN |

## Open limits

GS-1 owns the remaining development checks, control, Part C disposition,
gate, and review. The request permits splitting Part C if its audit holds
Parts A and B for more than one hour. This checkpoint neither moves a
Native case nor changes a deadline, worker count, runtime assertion, or
scale selection. It claims no faster gate or Native wall time.

The notes-only optimization skips only `npm test`. It does not skip
dependency verification, whitespace, commit checks, citation checks, note
checks, formatting, typechecking, or definition pins. A failure in one of
those steps still stops the gate. The unchanged finalizer can report test
stages as unreached when the test step intentionally skips; the explicit
skip line states why.
