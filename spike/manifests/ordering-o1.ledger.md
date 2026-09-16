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

## Final integration boundary

Merge `3c88770` incorporates exact V6 candidate
`05c98e2d778124648834b9b00e772a6ad270a870`, including V4 main
`5eff67d81fbbb025f91951571a9f029c0481812a` and the V5/V6 evidence.
Only README required conflict resolution: the V4, V5, V6 and O1 sections
are all retained. Context's deterministic nonce option and foundation's
reviewed authorization behavior merged without a source conflict.
Earlier O1 and V6 ledgers and raw results remain intact.

The O1 view follow-up delivers original actor proof bytes to authorized
readers and independently verifies the complete header prefix, visible
signatures and origin adoption. Outbox callback records are frozen so a
callback cannot alter which saved identity is acknowledged. These source
changes precede the final full run; its exact source and result will be
recorded separately after completion.

## Integrated run 2 and QA finding

Source: `6bd263f029df0ea2c49a9e04dcf1fba4bf7f6962`.
Commands: `npm test`, `npm run typecheck`, `git diff --check` from `spike`.
Result: exit 0; **179 tests, 178 passed, 0 ordinary failures, 1 TODO**.
Focused O1 checks: 49/49. Typecheck and whitespace check passed.
Full run: 110.9 seconds. Exact output: [run-2.txt](ordering-o1-runs/run-2.txt).
The TODO is the incoming Club second-admission counterexample, retained by
user choice. Its inherited test annotation says repair pending; this O1
record does not commission or claim that repair. The frozen Club manifest
still passes while that stronger plan expectation fails.

All 600 current manifest seeds had zero violations. Coverage:

| Campaign | Measured coverage |
|---|---|
| Sale 200 | 942 joins; 199 attaches; 1,722 disclosures; 195 offers; 25 replacements; 147 withdrawals; 157 counters; 114 accepts, 20 effective; 295 closes; 11,047 entries; zero private disclosures and effective Inspection attaches; 118 unbound Inspection requests |
| Booking 200 | 955 joins; 198 attaches; 1,629 disclosures; 2,553 requests; 1,497 occupancies, 652 effective and 471 linked; 383 frees; 419 cancels, 324 effective; 1,630 ticks; 12,000 entries |
| Club 200 | 991 joins; 200 attaches; 1,939 disclosures; 629 applications; 1,575 votes, 1,001 effective; 343 admits, 126 effective; 514 standings; 246 grants; 11,939 entries |

Incoming V4/V6 generator changes mean run 2's Sale seed numbers are not the
same event streams as run 1. These measurements do not relabel old snapshots.
The model manifests and packages remain those of the supplied V6 candidate.

After this run, independent internal QA demonstrated a missing ownership
boundary at this exact source. Two `Journal` facades over one backend held
separate folds. Facade A revoked Alice's invite authority; stale facade B
then issued an invitation and accepted it as effective, joining Bob and
consuming the token. Reopen correctly found the invitation unauthorized and
acceptance ineffective, so live and replay state disagreed. Run 2's existing
checks did not cover this sequence. The source snapshot and output are kept;
a single-facade ownership repair and exact regression follow in a new snapshot.

## Ownership correction and final scoped validation

The follow-up enforces one live `Journal` per backend with a private weak
ownership map. A second facade is rejected before it can create another
admission fold. `Journal.close()` invalidates the facade and closes SQLite;
a fresh backend handle rebuilds state on reopen. Legacy direct backend close
remains compatible with callers that discard the old facade and handle.
The profile and regression specify this ownership rule explicitly.

The exact QA sequence is retained as a prevention regression: reject facade B,
revoke through A, record the unauthorized invitation, refuse its acceptance
without consuming it, close/reopen, compare state, and recover an exact retry
with the same ineffective verdict. Memory facade release/reopen is checked too.
A test-only attempt to clone function-bearing foundation state was corrected
to compare the retained closed facade's state; no runtime behavior was changed
for that test issue.

Run 3 source: `bdb275f4c5c9e3fa8756a5a7dd709b76d857e249`.
Fresh commands from `spike`:
`node --test test/journal.test.ts test/codec.test.ts test/ordering-lifecycle.test.ts`,
`npm run typecheck`, and `git diff --check`.
Result: **50/50 passed**, zero failures/TODOs; typecheck and whitespace check
passed. Exact output: [run-3.txt](ordering-o1-runs/run-3.txt). This includes
25 journal, 15 codec, and 10 lifecycle tests. Environment: Node 26.8.2,
SQLite 3.53.4, Darwin arm64; focused run 1.63 seconds. This correction changes
only Journal ownership, its tests and profile documentation; the legacy
visibility campaign path is unchanged from run 2. Accordingly run 2 remains
the measured 600-seed integration result, and the final scoped run does not
pretend to be another campaign.

## Identities and scope

- Profile: `dap.fixture.single-writer/1`; document SHA-256:
  `sha256:fbc4d00e3f3eca6401541359642cdcf013c2c9ff821c2300d7afe8774b77e8fc`.
- Codec source SHA-256:
  `sha256:39e2060dd76bf8f6ec2e6378be79e663a1b983671277d927257b8f7b2a10d96f`.
- Fixed vector file SHA-256:
  `sha256:255fa95a57bcd5ccd136512e1b6f2429f8e05750a6648284d2e03db3eb421969`.
- Lifecycle manifest: `sha256:63be83e60036a5936569c478da7a8c7be6b8ab1c744d59ef3296b7d6182b5a9d`.
- Lifecycle coverage: 20 healthy boundaries, 27 adverse branches, and 115
  changed-genesis variants; exact owner/state comparison hooks are executable.
- Signed traces use different envelope commitments from legacy body IDs.
  Existing safe-integer fixture identities and visibility policies are retained.
- O1 adds zero application model-policy fixes and zero application kinds;
  it does not relabel any historical visibility campaign.
- No O2–O6 completion is claimed. O1 supplies the crash machinery and expected
  lifecycle traces for those later tasks.

The promise covers application-process crashes on the same host and intact
local disk. It excludes power/host/disk loss, malicious equivocation or rollback,
filesystem-lock failures, and concurrent writers using independent copies.


The integrated campaign identities are unchanged from V6:

| Experiment | Manifest | Package |
|---|---|---|
| Sale | `sha256:2377e5df338aaa854a56540092bf286aab0ef2dceb563dff6a0fcbdb4633aec9` | `sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85` |
| Booking | `sha256:cb4514f4967891077ad78e1dd0fba4c17438fb32b98cd8bd790df8531b35dd16` | `sha256:0556de5c337344eaa15afcbbbf5d22aa82c384bd6841d4ffb0c07185d4b7ec27` |
| Club | `sha256:806ae62febaa0b28f35fcc7099bcb00db73a61d0921806c911e993b6db808fde` | `sha256:ef19bdaf2a70813266ab7e490ac3759580df0613efc382bef8bf5b4a96523f4e` |
