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

Run 1 source: `5219ad71de4d34fd7f70682c22b1c98fd5fff182`.
Commands: `npm test`, `npm run typecheck`, `git diff --check` from `spike`.
Result: **136/136 tests passed**, typecheck and whitespace check passed.
Node 26.8.2; full run 69.0 seconds. Exact output is retained in
[run-1.txt](ordering-o1-runs/run-1.txt).

The 200-seed Sale campaign had zero violations. Coverage: 946 joins,
199 attaches, 1,716 disclosures, 273 offers, 31 replacements, 175 withdrawals,
159 counters, 111 acceptance attempts, 18 effective accepts, 279 closes,
11,171 entries, zero private disclosures, zero effective Inspection attaches,
and 120 unbound Inspection requests. V3's reviewed seven-fix overrun and
historical corpus are unchanged; this is a fresh integration run over the
legacy visibility path, not a signed replay of all 200 seeds.

After run 1, audit identified a wire presentation omission: signed readable
views did not carry original envelope bytes, although full-journal verification
worked. The follow-up adds bytes only to readable signed view entries and
verifies views independently, including every participant/frontier of the
signed V1 traces. Focused journal checks now pass 24/24; typecheck passes. Run 1 establishes its recorded checks, not that
missing recipient-facing proof path.

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
