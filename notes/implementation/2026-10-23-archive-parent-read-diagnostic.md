# Parent-read diagnostics

This change extends the existing `archive-pass-diagnostic-v1` record to locate
the hosted stall within the first parent Git read. It does not repair the
stall or establish that a pass reaches Mark. The implementation is based on
deployed commit `1d8663ff62ac0e8ab64e8614c90e4b16bc000d82`.

Request `020e03ab09a5361be4d9d12962bda397d8e7b4f5` and promise
`d04fde54465542ff9e977a84e5b2dd5750fd13d5` track this diagnostic. Original
request `66010f21f899a4df8ac7530e18539f05887254cd` remains unresolved.

## Why the existing counters are insufficient

Planner observation `95fbd80b704652ea06fd987b234e0a18a2a1b356` reports nine
passes across all five journals. Each stopped at `plan`, with one admitted
attempt, zero entries, and no pending Mark. Six returned `timeout`, and three
returned `unavailable`.

The parent source is lazy. Planning first reads the confirmed parent commit,
either through legacy-anchor receipt validation or `JournalPassPreparation`.
That read precedes candidate source preparation and scouting. A second Git
object would spend another attempt. The observed counters therefore narrow
the failure to the first parent commit operation.

The 16 or 17 calls reconcile with row load, pin and wake reads, target discovery,
and the first Git-object reservation. Three or four target births reserve
256 KiB each, and two item queries each reserve 256 KiB. Most reported metadata
and input work were charged before the Git transport. Those counters do not
measure pack size or identify the stalled network operation.

## The additional observation

The record gains one `parentRead` object. It contains only:

- `ordinal`: the requested object's number within this pass, or zero.
- `type`: `commit`, `tree`, `blob`, or `none`.
- `maximum`: the existing requested byte bound, or zero.
- `phase`: `source`, `token`, `identity`, `object`, `advertisement-request`,
  `advertisement-response`, `object-request`, `object-response`, `complete`,
  or `none`.
- `refusal`: a fixed category selected from known Git refusal words, `other`,
  or `none`. Arbitrary exception text is never emitted.

`token` covers the existing read-token port. `identity` covers the existing
repository identity port. A request phase means the existing fetch has begun.
A response phase means that fetch returned its original `Response`; the body
read, framing, or decoding may still be outstanding. `complete` means the
provider returned the requested object after its existing type and live-pass
checks. It does not establish later journal receipt validation or publication.

The diagnostic stores one small snapshot per budget in a private weak map.
Each admitted provider read replaces that snapshot. The original call budget
bounds the ordinal. The driver freezes the snapshot when the pass enters its
existing cleanup, before any cleanup await. A late response or rejection cannot
rewrite the frozen pass record. An older read cannot overwrite a later read.

The fetch observation preserves the original receiver and request argument,
returns the exact original response, and rethrows the original exception.
The provider also preserves its original result and
exception. The change adds no network request, body access, retry, transport
fallback, clock read, budget allowance, or persistent state. Existing operation
order, cleanup, prices, capacities, and deadlines remain. Observation has
runtime overhead and can affect timing; this is not a performance measurement.

## Validation status

The first owning run passed both mapped-owner parser calls, all three inventory
Node cases, and the Scope production and test compilers. The combined native
invocation passed all 13 driver cases and the first eight host cases. It then
failed a new late-error assertion in the GitHub exact-object case. Three host
cases remained pending under bail. The raw JSON's aggregate pending count is
zero, but its individual assertion records correctly mark those three pending.

The failed assertion expected the injected raw exception from the GitHub
identity fetch. The existing GitHub client converts that exception into
`GitHubFailure` before the archive provider receives it. The test now injects
the late error at the token port, whose exact error identity is observable.
The held successful identity read and all other assertions remain unchanged.
The complete 12-case host file then passed naturally in the allocated follow-up.
The successful driver file, parser, inventory cases, and compilers were not
repeated. The compilers passed before that two-line test-only correction. The
ordinary gate remains pending. No hosted call has run for this change.

Evidence is in `/private/tmp/artroom-archive-parent-read-owning-20261023-v1`.
Each command was timed separately. Parser elapsed time was 0.50 seconds,
inventory 0.65 seconds, production compiler 0.55 seconds, and test compiler
0.65 seconds. The failed native invocation took 11.36 seconds elapsed,
10.65 user CPU seconds, and 1.29 system CPU seconds. All 2,783 Source rows
remained identical through that invocation. The only observed changes to
existing dependency rows were the Vite results cache and `.vite-temp` metadata.
The host follow-up is retained separately in
`/private/tmp/artroom-archive-parent-read-host-followup-20261023-v1`. It took
4.56 seconds elapsed, 4.89 user CPU seconds, and 0.78 system CPU seconds.
Across both attempts, all 6,070 fixed dependency rows remained unchanged.
Only the existing Vite results cache and `.vite-temp` metadata changed among
the full 6,072-row dependency namespace. The Node executable also stayed
identical. Local fixtures supply the identity, credentials, and HTTP replies;
their passes do not reproduce the hosted provider or establish its cause.
Dependencies were copied privately with APFS `cp -cR` from the quiescent deployed
checkout. The package lock and its installed stamp match exactly. All 32 copied
symlinks resolve inside this checkout, every regular dependency has a distinct
inode from its source, and the private pool bundle has the reviewed compatibility
hash. The source dependency namespace was unchanged. No package was installed.

The test-only `local-archive-command.ts` is also copied exactly from Main commit
`4d9aa2cfb79737dfa5dee4dbbe4d096eddd161f5`. Its SHA-256 is
`57110dd7b4435155e834d32153bff1269ad28e043e4400ad5cc448f32c20d433`.
That already-landed correction overlaps the two independent read-only command
runs and awaits both closures. It preserves the existing 30-second witness.
Its canonical approval is `637d89f1fa6302868616e751ec5197d72a6b172c`,
landing receipt is `b4068e47ee3d402281a41dcd8799d141d41fd834`, and helper
artifact is `1276931f8e359e5e4fe726873fc9978dd9a1d704`. Reusing those exact
bytes adds no helper difference from Main and makes no new timing claim.

The existing exact-object adapter witness now holds the token, identity,
advertisement, and object awaits. It checks the fixed snapshot, unchanged
result, request list, budget charges, and late completion. It also checks an
identical rejected error, private-word omission, and a late rejection after
freeze. Its unsupported-capability control retains the original refusal.
The existing native driver witness checks the expanded marker schema and the
all-`none` transport observation for its stand-in provider.

The actual maintained parser produced `archive-driver.ts` seal
`35510dbb61c75496ac3e0e363d49d1137284671cc4c383582222cca8ee0a3e6d`
and `archive-host.ts` seal
`894a844fce26846a955b717669d5913f7ccd57c6a4eab6d729bd24815717edec`.
Only those two inventory values were replaced. The new diagnostic module is
not added as an invented mapped owner. The planner owns deployment and any new
hosted observation. Local passes do not establish the hosted stall's cause.
