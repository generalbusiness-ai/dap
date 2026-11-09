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

The Page asset build, workflow citation, BR-12 focused checks and the shared
gate remain due. No live acceptance or deployment follows from these checks.
