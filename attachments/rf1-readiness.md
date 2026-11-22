# RF1 readiness at published d82afed2

Request `3972212d6e9fc0f9e0b458b1b627a1a19aeb111a` is open; it refiles
`7a912d5c` without carrying its old promise. The approved retained-files
design is `notes/2026-10-21-retained-files.md` draft 4, landed `afe0c319`
after review `a92a6f59`. Section 14 requires RF1 through RF4 in order.
The request puts ready archive slices and security requests 1–4 ahead of
RF1. The planner owns its current order among active lanes.

## Published source and missing boundary

No RF1 implementation landing was found in the published history. Search
of `d82afed2` contract, bytes, derive and replay finds no `artroom-file-1`,
`FileRef` or `{ type: "file" }` field. A citation `reference` exists in
`packages/contract/src/definition.ts:71–86`; design section 3 explicitly
says that it does not implement the file field or keeper. `FieldValue` is
general structured data, not proof of a declared file or its row.

The first missing source owner is the cross-package contract/value and
judgment boundary, not an upload endpoint: add the declared file field and
immutable `{ digest, size, media }` value, raw tagged-byte digest, typed
slot and file-row read to the derive/replay path. Existing detached text
checks in `packages/derive/src/validate/{fields,operands,effects,guards,sends}.ts`
are not a complete file rule: `sends.ts:70` permits detached text to a
lane, while section 3 refuses a file in every send. The current entry
`redact` form `packages/contract/src/entry.ts:189` has only `texts`; RF1
needs the specified `files` list without altering historical entries.
`packages/replay/src/verify.ts` has text-specific redaction and trusts,
but no `files` trust. In-memory file rows are the RF1 fixture, not proof
that SQLite, a keeper or upload has shipped.

## Smallest lawful slice and proof

RF1 is one coherent fixture-only head, not a standalone digest helper:
contract and bytes for exact tagged digest/vector, declaration/value and
redaction shape; derive's format validation, allowed-effect-only file
reads, in-memory row-dependent judgment and state/effect handling; replay
without bytes with explicit `files` trust. A missing/pending/redacted row,
size/media mismatch, above-max value or disallowed media must refuse as
specified; lane send must refuse `redactable-read`. Preserve old no-file
canonical bytes, judgments and replay, and all current native limits. RF2
owns SQLite rows, keeper, upload/read routes and runtime capacity; RF3 owns
R2 and transfer recovery. Do not infer either from the RF1 fixture.

Focused owners: bytes domain vector; derive definition/form and judgment
fixtures for witnesses 2 and 3 and judgment portion of 7; replay witness 14
without file bytes and explicit trust; no-file canonical/judgment/replay
controls. Run affected package type contexts and exact owner tests on the
approved source, then one gate and checker review. No test ran here.

## Integration decisions

`docs/kernel.md:144–147` requires review for any new kernel part. RF1
introduces a field/value/effect and judgment input in contract/derive/bytes;
the approved design does not by itself establish that a separate required
kernel filing or checker disposition has been completed. Confirm exact
filing/review before source, not by treating M1a's narrower no-new-kind
ruling as a waiver. M1a touches `contract/src/definition.ts` and
`derive/src/validate/{handlers,shape}.ts`; sequenced H2 touches judgment,
read and replay semantics. Keep their landed behavior and reconcile RF1
on the actual published base, especially canonical entry shape, retained
programs, validation, replay and level-specific admission. Neither overlap
proves a functional conflict or authorizes reordering those lanes.
