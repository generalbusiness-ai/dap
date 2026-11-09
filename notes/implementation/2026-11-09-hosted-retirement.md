# Hosted retirement ends signing and records the key's end

Security request `b66b8f14`; promise `0875dbf1`; planner ruling `e2fc59d5`.
This head addresses a retired endpoint that kept an active membership key
and its private signing seed. The planner deploys after exact-head review.

## What changed

An authorized retire clears the bearer, all sessions and OAuth grants, sets
the endpoint to retired, and erases its seed in one SQLite transaction.
The seed becomes an empty BLOB because the existing column is `NOT NULL`.
Cached signers reread current state before signing; cached transports also
refuse dispatch after retirement. A later bearer request or unfinished
create cannot revive the endpoint. Loading an already retired row erases
its old retained seed as well.

Retire accepts an empty body or one caller-signed `revoke-key` envelope for
this agent, in this membership, with `as: retired`. The signer must be the
retiring party. The endpoint proves the target key item from its verified
accepted enrollment custody, including archived custody. Missing custody
supplies no guessed target. The endpoint stores the first envelope and
submits only that exact envelope. It never signs a revoke or substitutes
a later envelope. The existing control fingerprint still refuses changed
body bytes under the same operation identity.

A `200` answer means membership shows the key retired or compromised and
the endpoint holds no seed. Otherwise `202` names the pending reason while
the endpoint remains disabled and seedless. Retry checks the recorded key
again and can complete after any admitted admin or recovery revoke. It
resubmits the retained envelope only while that envelope remains valid.

`docs/mcp.md` describes complete and pending retirement, exact retries,
recovery and the existing lifetime of grants another scope already holds.
The route inventory adds the helper as a reviewed whole-file source owner.

## Decisions and limits of the change

Ruling `e2fc59d5` replaces the earlier self-revocation proposal. It keeps
current admin/controller authorization and existing membership meaning.
An ordinary controller without `membership.manage` can disable the endpoint
and erase the seed, but cannot complete a Native revoke alone. Permanent
refusal or an expired envelope requires a separately admitted admin or
recovery act. Keeping the first envelope prevents a retry from silently
choosing a new signer, target or expected revision.

No Native definition, creation family, offer, recorded byte or historical
entry changes. Self-revocation remains a candidate for a later membership
revision. This filed security fix falls under [kernel section 7](../../docs/kernel.md);
it introduces no kernel item. The checker must assess that filing basis.

Other scopes keep their existing grant lifetime of at most 300 seconds.
The direct-scope witness restarts that scope to require a fresh authority
read before checking the revoked key's `unauthorized` refusal. Endpoint
shutdown takes effect before that separate grant lifetime expires.

The maintained source-seal producer ran at `75d4430c`. After the explicit
Worker decoder default repair, the producer at `faa4be6b` gives hosted
owner `c41049c9597e2d2221066d60be526d85a50a730ad22d88ed999e124af6076956`
and helper `8707c99fe68ac3cf7af20a343f92c36b3bb81237b3681ae2a03169df5513882b`.
The metadata manifest retains both runs and patches. All route and gate
assertions remain. Hugh's standing patch approval covers adoption;
independent exact-head review still assesses the changed source.

## Final evidence

The Native scenes use the production endpoint, real membership, SQLite,
restart, direct scope submission and replay. Their clock and one dropped
request before dispatch are explicit TEST stand-ins. They contact no live
room. The admin scene proves an accepted agent act, uncertain revoke,
seed erasure, endpoint refusal, exact-envelope retry, one recorded revoke,
fresh direct-key refusal and consistent replay. The controller scene
proves empty-body pending retirement, permanent refusal, ignored replacement,
expiry and completion after an independent admin act.

Four older endpoint-only retire expectations and the OAuth lifecycle
expectation now require pending `202`. Their authority, stream, session,
budget and non-revival assertions remain. No allowance changes.

The focused closure contains 39 cases across five complete owners. The
24-case hosted owner passes at `ffc97d5d`. Four other complete owners with
15 passes, Node's 11 inventory cases and Scope source typechecking retain
their separate evidence at `172ca878`. The decoder follow-up manifest
contains the explicit post-failure reconciliation for those four owners;
its original whole unit remains failed. Only the hosted test and note or
evidence changed after that runtime head. Frozen hashes establish equality
for production, configuration, dependencies, seals and completed owners.

The seed-erasure control omits only the transaction's seed assignment and
its SQL binding. The unchanged whole 24-case owner runs once with `--bail=0`.
Both new cases fail at the intended SQLite assertions: zero expected bytes,
32 actual bytes. The other 22 cases pass. The driver restores every tracked
byte and closes its process group. No skip, timeout or unhandled error occurs.
The original report verifier exits `1` because Vitest abbreviates the first
object error in JSON. A separate metadata reconciliation reads the full
same-run stderr and confirms both exact seed-only diffs. Its exit is `0`.
The original verifier and result remain unchanged; no control repeats.

The only full gate, at `522949c7` / `d53308958b879d84a0790d12145f17118388f8bb`,
**failed with actual `gate.exit` 1**. All pre-typecheck checks passed. The
focused compiler plan had omitted MCP's Worker-only `tsconfig.scope.json`.
That context found two errors where the new witness's RPC seed type allowed
`string | Uint8Array`. The gate reached no main test stage.

The isolated repair at `f34e58db` / `099ed063be78ca6a903ec00aad87faad3ca374f5`
returns a numeric array across the callback and constructs the same local
`Uint8Array`. Only that test and explanatory note or evidence differ from
the failed gate. Production, imported code, shared helpers, configuration,
dependencies, cases, assertions, line count and deadlines stay equal. No
other file imports the test. The checker must assess this repair under the
[isolated-test follow-up rule](../../docs/testing.md#follow-up-after-a-gate).

The follow-up passes the failed MCP Worker context, unreached MCP browser
context, and all ten unreached root contexts. It then runs the entire
previously unreached `npm test` body, including the complete hosted owner,
and the unconditional summary. Actual `test.exit`, `summary.exit` and
`followup.exit` are all `0`: Node 142, Counting 56, Plain 4,028 plus one skip,
and Native 1,117 plus two skips. Reports show no contradiction, failure,
report error or unhandled error. The 102 unknown observations are 34 Node
file wrappers, not unresolved leaf cases. The source stays equal and the
owned process group closes. Scale correctly omits because no scale-family
path changed; no archive attempt or pass follows. The failed gate stays
failed; this follow-up supplies its missing checks without a gate repeat.

The follow-up classification also preserves two metadata limits: its frozen
task's booking placeholder points to durable booking `91c559d3`, and the
failed gate task retained unused R13 count/control fields. Those fields
never decide execution or coverage. The actual frozen R15 control input
and all terminal results remain explicit in the sealed classification.

| Check / checkpoint | Command | Actual exit and output manifest SHA-256 |
|---|---|---|
| Source-seal producers / `75d4430c`, `faa4be6b` | `node /private/tmp/artroom-r15-source-seal-producer-20261109.mjs` and `node /private/tmp/artroom-r15-decoder-source-seal-producer-20261109.mjs` | Metadata only; [manifest](evidence/2026-11-09-r15-source-seal-metadata.manifest.json) `9a185af05e47bc7baa82799b223e6566a43ccf45b2490254dfe26abd7d17d4df` |
| First focused / `40ab4e2d` | `python3 /private/tmp/artroom-r15-focused-20261109.py` | `1`: decoder compiler error; [manifest](evidence/2026-11-09-r15-failed-source-compiler.manifest.json) `cb6df4d892e872c6b3c55534b3e8dc2e023d1590f46289af65c8263e9fa59703` |
| Decoder follow-up / `172ca878` | `python3 /private/tmp/artroom-r15-decoder-followup-20261109.py` | `1`: 37 passes, failed expected revisions, one pending; original ledger also failed; [manifest](evidence/2026-11-09-r15-failed-revoke-witness.manifest.json) `a0c4bfee5e081f0e218c5b02284a4ceb9954e098a2bafb908e45d6de4923d8dd` |
| Final-key probe / `58d65173` | `python3 /private/tmp/artroom-r15-revoke-followup-20261109.py` | `1`: 22 passes, failed live-item probe, one pending; [manifest](evidence/2026-11-09-r15-failed-final-key-probe.manifest.json) `7e629696462d4d65151505445ab9c3f6a3911802ea0e2596637885a09f5fe704` |
| Direct sidecar / `5fd0601b` | `python3 /private/tmp/artroom-r15-key-standing-followup-20261109.py` | `1`: 22 passes, missing original sidecar, one pending; [manifest](evidence/2026-11-09-r15-failed-direct-sidecar.manifest.json) `a36f1ec12fbae56f64ac34a2b9f3f248e620d4a612d146910b5b7846f42cbb62` |
| Direct revision / `65e8bd07` | `python3 /private/tmp/artroom-r15-direct-sidecar-followup-20261109.py` | `1`: 22 passes, stale expected revision, one pending; [manifest](evidence/2026-11-09-r15-failed-direct-revision.manifest.json) `c5ead18b8bc7a6c4959c7b337b4e4229fde3bf7d8644fa63f1fa1bbc1f7bbcf1` |
| Replay source / `8ad48f37` | `python3 /private/tmp/artroom-r15-direct-revision-followup-20261109.py` | `1`: 22 passes, partial signed-read history, one pending; [manifest](evidence/2026-11-09-r15-failed-replay-source.manifest.json) `6fafc7fc8eb9525855726f7b7d905925a087a51de9a87b4e53bc84ad60339449` |
| Complete focused owner / `ffc97d5d` | `python3 /private/tmp/artroom-r15-replay-session-followup-20261109.py` | `0`: both selected compilers and all 24 cases; [manifest](evidence/2026-11-09-r15-complete-focused.manifest.json) `63bf106da1d57709b7bc962b725116e90893f8bd34f71be53c060e9c594d7558` |
| Seed-erasure control / `ffc97d5d` | `python3 /private/tmp/artroom-r15-seed-erasure-control-20261109.py` | Owner `1`, original verifier `1`, metadata reconciliation `0`; [manifest](evidence/2026-11-09-r15-seed-erasure-control.manifest.json) `fd91826fbf26c1d509f9ce5c54a45c9d2f24debf7c8ba91e941da7f16dc3b648` |
| Original gate / `522949c7` | `npm run gate` | `1`, isolated test type errors; [manifest](evidence/2026-11-09-r15-failed-gate.manifest.json) `c6e97f7d97bfebd5b830d219e97521283aee9c6d7d987f1c2924520cd95d319e` |
| Targeted follow-up / `f34e58db` | `python3 /private/tmp/artroom-r15-gate-followup-20261109.py` | `0`: 12 contexts, complete unreached test body and summary; [manifest](evidence/2026-11-09-r15-gate-followup.manifest.json) `d17b8439110bb1730658244ef9065c187bb3a275bb257e3a3dfe2589aaa6933e` |

The follow-up's outer monotonic time is 933.281 seconds. Waited-child CPU
is 2,014.203 seconds; driver CPU is 3.663 seconds. These are separate
measurements from case-duration sums. The Mac uses owned dependency and
Vite state with pinned Node 26.13.0, TypeScript 7.0.2 and Vitest 4.1.12.
Process samples find no other validation body; samples cannot prove
continuous isolation. Raw reports, TEST custody and request bodies stay in
read-only external retention. The committed manifests bind all cited files.
The final review head adds only this note and two manifests after `f34e58db`.

## Open limits and deployment

- `b66b8f14`: exact-head checker review, routine landing and planner deployment
  remain due. No new setting, activation or recorded migration is required.
  The private retirement table starts empty and old retired seeds erase on load.
- `b66b8f14`: existing cross-scope grant lifetime remains at most 300 seconds.
  The planner's later membership revision may consider self-revocation.
- `64552d40`: archive observation stays open. This gate never reached Native;
  its follow-up omitted scale. Neither run adds an archive-scale pass.
- R15 establishes no deployed-room or J5 acceptance result.
