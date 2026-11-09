# Require a room cache reuse policy

Request `b32c8fbd` requires each `RoomOpening` caller to supply its reuse
predicate. The constructor no longer defaults to unconditional reuse.
The Page still passes `verifiedRoom`; the generic string witness now passes
an explicit `() => true`. A caller that omits the predicate cannot compile.

The pending-read sharing, failed-read recovery and late old-room code stays
unchanged. The existing four-case shell owner and one-case native roster
refresh owner remain the witnesses for those behaviors.

## Validation

This source preparation has not run a compiler, test, asset build or gate.
The control runner gate owns the single executable slot. Page compiler
contexts, the two complete owners, the asset build, the required gate and
the Page workflow citation remain due before review. No acceptance or
deployment follows from this source preparation.
