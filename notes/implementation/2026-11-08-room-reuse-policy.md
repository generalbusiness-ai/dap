# Require a room cache reuse policy

Request `b32c8fbd` requires each `RoomOpening` caller to supply its reuse
predicate. The constructor no longer defaults to unconditional reuse.
The Page still passes `verifiedRoom`; the generic string witness now passes
an explicit `() => true`. A caller that omits the predicate cannot compile.

The pending-read sharing, failed-read recovery and late old-room code stays
unchanged. The existing four-case shell owner and one-case native roster
refresh owner remain the witnesses for those behaviors.

## Validation

At source `6713f84d11afa840926e4d907c03d6e76659408c`, tree
`d382d4de76eb50260ec6ea3dc303b3ee6093034b`, all three Page compiler
contexts passed. The complete shell owner passed four cases, and the native
roster-refresh owner passed one. The pipeline exited 0, kept the checkout
clean and closed its process group.

One compiler control omitted the predicate at the actual Page caller.
The compiler exited 1 with only `TS2554` at `src/main.ts:149`. The driver
verified that intended refusal and restored every tracked byte. No restored
rerun ran.

The [focused manifest](evidence/2026-11-08-room-reuse-focused.manifest.json)
has SHA-256 `f8f280f7930a041ab4e131b605d97da42977add337407ffbe3b4563ea6fd2a26`.
Its 22 public files sit under
`~/play/artroom-evidence/2026-11-08-room-reuse-validation`. The three private
inventories retain 250 launch files, 10 focused-runner files and 12 compiler
control files. Every original remains read-only. The first sealing attempt
stopped when it tried to add a file inside the focused runner's sealed
directory; the corrected inventory sits beside those unchanged originals.
No check ran again during finalization.

Planner ruling `c5c24191` permits one shared gate for this item and BR-12.
They use two stacked heads because `gs review-request` refuses artifacts
from two promises at one head. RoomOpening comes first; BR-12 follows.
Each keeps its own promise, note, artifacts and review request. Both reviews
must approve before the ordered landings. If only one item wins approval,
that item needs a gate at a head that holds it alone.

After integrating published main `f1ec237c`, the Page source and owner files
still matched the focused checkpoint. The asset recipe then passed once at
`cc7f75d63f8a953dceaeff6c2c7cd8f4997d2fff`, tree
`788ceb2516075408235277bc033d57f869ff7068`. Only `assets.ts` changed.
Page HTML, OAuth HTML and OAuth JavaScript stayed byte-equal.

The [build manifest](evidence/2026-11-08-room-reuse-build.manifest.json)
has SHA-256 `bc02a00c974f3a5fc866934fc3c695050966c933276a49ed841735bd500f6cab`.
It lists 18 read-only files under
`~/play/artroom-evidence/2026-11-08-room-reuse-build`, including `build.exit`,
`result.json` and the four generated browser files. The generated module has
SHA-256 `35459483398f83bc3525dee550007145dd10b64f76afb00160c12744b50fc320`.

The [Page workflow run 42558851410](https://github.com/generalbusiness-ai/dap/actions/runs/42558851410)
passed at combined stack head `99092048`: screenshots, recorded demo captures,
the create-room witness and the local-label witness all passed. The
[CI manifest](evidence/2026-11-08-room-br12-page-ci.manifest.json), digest
`581821bde41515056ed51dddab2694c68c5eca468f47bc91c700116bb2987722`, retains
the completed run metadata, its full private logs and the workflow-path
comparison. The later integration of main `cf0487da` adds only the approved
self-hosting note. Every Page workflow path stays byte-equal.

BR-12's separate focused checks and configured-count control have also
finished. The one shared top-head gate remains due. No live acceptance or
deployment follows from these checks.
