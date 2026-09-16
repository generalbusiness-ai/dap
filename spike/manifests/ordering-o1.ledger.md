# O1 implementation and validation record

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:bd246dce91a664112690703f808129a5db76a534`.
Base: `7bd311f221c62615c55b659f0a693e42db887fba`, the landed V3 tree.
Branch: `request/o1-profile-codec-journal`.

The implementation follows [the O1 profile](../ordering-profile.md). It adds
an authenticated boundary to the existing append operation; SQLite supplies
storage and serialization only. The lifecycle manifest is expected data for
O4, not an implemented transfer fold.

## Development checks

Before the full integration campaign, focused checks passed: codec 15/15,
journal 23/23, lifecycle 10/10, and TypeScript. The journal checks include
actual SIGKILL of child processes at eight append boundaries, two initial
creation boundaries, and publication before acknowledgment. Separate checks
cover exclusive ownership, asynchronous delivery failure, SQL position
corruption, authenticated replay, and uncertain-response reconciliation.

A bounded codec-agent review found three integration defects before this
snapshot: an asynchronous delivery could be acknowledged early; SQL keys
were not compared with embedded positions; and legacy safe-integer hashing
rejected signed invitations/origins containing fractional JSON numbers.
All were corrected with focused regressions. A test-only TypeScript
assertion-overload error was corrected during development. No full seeded
campaign was run before the source snapshot below.

## Full integration run

Pending on this source snapshot. The next record commit will identify this
exact source commit, preserve the test output and report the result. The
historical Sale ledger and its source-bound corpus remain unchanged.

## Identities and scope

- Profile: `dap.fixture.single-writer/1`.
- Lifecycle manifest: `sha256:63be83e60036a5936569c478da7a8c7be6b8ab1c744d59ef3296b7d6182b5a9d`.
- Lifecycle coverage: 20 healthy boundaries, 27 adverse branches, and 115
  changed-genesis variants; exact owner/state comparison hooks are executable.
- Signed traces use different envelope commitments from legacy body IDs.
  Existing safe-integer fixture identities and visibility policies are retained.
- No model-policy fix is claimed and no V3 historical campaign is relabeled.
- No O2–O6 completion is claimed. O1 supplies the crash machinery and expected
  lifecycle traces for those later tasks.

The promise covers application-process crashes on the same host and intact
local disk. It excludes power/host/disk loss, malicious equivocation or rollback,
filesystem-lock failures, and concurrent writers using independent copies.
