# Clear orphan Site alarms

The full gate passes at P3. The Site regression and native room witness pass,
and the retained audit verifies all 25 capture receipts while preserving
earlier failures and the inconclusive native run. This note and its manifest
form a documents-only tail to P3; source and tests remain unchanged.

## What changed

Request `c30342747abb9cf1a217f29904ac5b903dc41cac`, promise
`d19e54721d55375a9c6b1f9476acbb44eee3760b`, examines idle alarm ownership.
Parent finding `a6847815c845145adddca1476342e52b6a8baf82` owns celld CPU /
roughly 700-cell attribution. Repairing one native Site orphan alarm does
not establish that host-load cause.

When a Site request reserves its generation, the real ScopeIndex scheduler
stores its expiry alarm before provider work. A provider-info failure before
`createToken` enters removes that reservation, but the old cleanup did not
reschedule. The old scheduler also left the platform alarm intact when its
remaining Site wake was null. The final baseline observes zero rows/mints
alongside non-null actual `storage.getAlarm()`.

P1 changes only `packages/scope/src/site/token-reuse.ts` and
`packages/scope/src/worker.ts`, with 11 added and 2 removed lines. After the
existing generation/key/state-scoped pre-mint deletion, cleanup requests
scheduling through the existing flight deadline. A catch preserves the
original answer if scheduling fails or times out; a timed-out schedule can
still finish in the owner's revision loop. When the current Site wake is
null, that loop deletes a non-null actual alarm. For a live wake, its old
rule remains: set an absent or later alarm, preserve an earlier one. The
revision check remains after the awaited alarm read, and the loop reruns
when another scheduling request advances that revision. No mint-entered
ambiguity, generation replacement, token lifetime or provider-revocation
policy changes.

P2 changes only `outbox.ts` JSDoc, not its algorithm. P3 further corrects
that comment: seven logical causes include archive's durable row OR memory
fallback; the driver continuation is not the only memory-held source.
This note gives the complete ownership account here. P3 gives the room
witness its own
physical ScopeIndex owner; it changes no production scheduling algorithm.

## Decisions and alarm ownership

There are two direct persisted-alarm owners. `object.ts:199–207` maps the
ScopeObject alarm port to `storage.setAlarm(ms)` or `deleteAlarm()` and
increments its scheduling revision. `worker.ts:126–157` owns the separate
ScopeIndex Site alarm. JavaScript retry/deadline timers are different from
these persisted Durable Object alarms.

`outbox.ts:68–85` persists deadline/maintenance changes, then selects the
minimum of seven remaining causes. An empty list passes null to the one
ScopeObject alarm port. Clearing one cause preserves another live cause.
The sources and clearing rules are:

- **Timed work:** `turn.ts:413–431` recomputes the earliest live timed target
  after a write, a due-work turn or an alarm turn. `sqlite.ts:637–640` retains
  `meta.deadline`; when no target remains, the turn deletes that key. Future
  deadlines stay exact;
  bounded overdue work uses the configured drain retry delay.
- **Outbox dispatch:** `sqlite.ts:589–598` selects minimum `next` only where
  `held=0` and `ack`, `result`, `diagnosis` are null. In
  `outbox.ts:136–180`, an attempt records its retry before sending and
  re-arbitrates; each completed pass re-arbitrates even when nothing was due.
  Acknowledgment, result or diagnosis removes eligibility. Completed history
  rows remain; their presence is not pending work.
- **Outside attempts:** `sqlite.ts:603–622` contributes minimum `attempt.next`
  where outcome is null. Recording an outcome clears eligibility; parking
  `next` at null removes its alarm contribution but can leave unresolved
  work. A null alarm therefore does not establish operation settlement.
- **Driver continuation:** `operations.ts:524–534` contributes now for another
  page or a drain delay for held replies. No remaining page/reply, or a
  definition that cannot run, clears this memory-only cause and re-arbitrates.
- **Signer maintenance:** `sqlite.ts:642–645` retains its meta wake.
  `object.ts:328–331` schedules activation only for pending signer work or a
  retained wake, and clears an obsolete wake. Bounded alarm maintenance
  clears it when no backlog remains (`object.ts:855–858`).
- **Archive:** `archive-row.ts:318–331` supplies the durable wake and
  `archive-driver.ts:113–130` its fallback. Disabled/empty policy or stopped/
  null work contributes nothing; a retry retains its deadline. A sealed entry
  signals archive work and arbitrates in its actual callback
  (`object.ts:293–298`). Production activation signals eligible work
  (`341–355`); recovery (`412–439`) restores an absent/later platform alarm,
  guarded by scheduling revision and running-alarm state. A null archive wake
  starts no recovery lookup. Confirmed archive idle need not clear another
  owner's global alarm.
- **Credential expiry:** `credential-store.ts:44–69,98–109` combines indexed
  read-plaintext expiry with bounded legacy backfill. Fresh empty custody
  starts with backfill complete; expiry/drop triggers remove indexed work.
  Activation schedules only for a non-null expiry cause
  (`object.ts:334–339`). Local plaintext expiry implies no provider revocation.

`object.ts:388–389,445–465` owns ordinary background dispatch/operations,
first-turn recovery and parked-attempt recovery; these callbacks feed the
same contributors. A real alarm (`843–870`) runs bounded credential/signer,
timed, dispatch, operations and archive work, then always re-arbitrates in
finally. ScopeIndex instead retains Site expiry rows: reservation insertion
(`site/token-reuse.ts:82–90`), scheduling before provider entry (`137–146`),
ready-token expiry scheduling (`155–162`), and the repaired pre-mint cleanup
(`164–179`) feed its revision loop. Its alarm expires Site rows and schedules
again. Ready reuse and unavailable-row rearming also feed this scheduler
(`site/token-reuse.ts:106–121`); bounded expiry runs on acquisition and the
ScopeIndex alarm. Only the pre-mint cleanup/null-wake behavior changes.

## Native witnesses and their limits

The room creates host-none Register21, Directory20, Membership8, Rules10
and Destination16, then seats/keys the founder and discovers Inbox1 through
actual retained create sends. Discovery follows every child. All six must
have applied genesis, active status, no held genesis sends and one native
confirmation per child. P3 maps only this room's logical
`applied-genesis-v1` name to a fresh real physical ScopeIndex using the
existing StartupOwner namespace override. Other namespace methods forward
unchanged. The snapshot asserts both logical and actual physical owner;
that index is not a journal scope or the deployed fixed-name/global owner.

Actual SQLite/getAlarm snapshots require zero eligible pending/held outbox
rows, unresolved requests, operations and attempts (including parked ones);
null dispatch/next-send, timed and signer wakes; no independently enumerated
live timed target; ready signers; no archive, credential or expiry rows;
complete credential backfill; and no pending revocations. Total outbox rows
remain. The owner joins original `waitUntil` promises, then an explicit join
must see zero callbacks before the snapshot. Reads and native eviction/
reactivation preserve metadata and null alarms. No injected acknowledgment,
pending-row deletion or manual alarm clear produces the room result.

One Membership invitation supplies the only live timed target,
`member-invitation-end`. Only Membership may have a stored alarm, at that
exact deadline, including after reactivation. Advancing only the fixture
clock and running the framework's stored alarm must append the timed input,
advance the head by one and lapse the invitation. Callback settlement then
leaves all six alarms null.

The current P3 verbose run and readback retain seven phases: room-created
(five journals), founder-inbox-confirmed (six), normal-read-and-callbacks,
evicted-and-reactivated, one-future-invitation,
future-deadline-after-eviction, and genuine-timed-end-settled. All snapshots
assert logical `applied-genesis-v1` mapped to physical
`idle-room-8fbf704b-102f-44c5-a1a0-ad360c59b626`. Only Membership is armed
in the two invitation phases: `4070908860000`, exactly
`2099-01-01T00:01:00Z`. Its heads are 4 before invitation, 5 while armed
and 6 after its timed end; all other journal alarms and this room-index
alarm stay null. The last phase records 502 cumulative wait calls, not HTTP
request count. Printed ownedCallbacks is literal zero after per-owner
callback-zero assertions, not an independent callback census. Console
formatting collapses nested outbox/timer values to `[Object]`/`[Array]`;
the hash-bound source and passing assertions establish those predicates,
not an invented expansion of the log. The earlier P1 fixed-owner output
and readback remain historical single-file evidence, not the current
owner measurement or global-emptiness proof.

This uses PlatformScope's labelled scripted clock, historical creation
allowlist and inspector reads. Membership authority, cohort rules, native
transport, callbacks, SQLite and stored alarms are real. Host-none opens no
repository/provider operation; this case installs no OutsideDouble, scripted
membership or replacement test authority. It reuses StartupOwner and the
native fixture lifetime/driver: at most 16 discovered owners, 16 create
sends per owner, 128 matched items per timed rule, 64 discovery rounds,
4,096 tracked actions, and the driver's existing 64-round/4,096-work bounds.
Only retained creation retries may advance the clock, within three advances
and eight seconds (four observations). Work has a 30-second limit; the
existing owner has a separate 7.5-second join bound and retains custody on
incomplete closure. The test timeout is 45 seconds. Exceeding any bound is
failure/unknown, never quiescence or physical cancellation.

The new Site cases use separate ScopeIndex names via the existing env-only
settings map: real production class, SQLite, scheduler, RPC and Date.now(),
immediate scripted Artifacts replies, no deployed fixed-name claim. Awaited
RPC results are copied to metadata and disposed locally; no provider
coroutine is held. A wrong remote before mint must leave zero mints/rows and
null actual alarm. With a prior ready row, the same failure must preserve
its generation, row and expiry alarm. Original fixed-owner eviction,
earlier-alarm and plaintext-expiry cases remain unchanged.

Only AFTER measured assertions, Site cleanup retires exact observed key/
generation rows. It deletes only the observed alarm with no row remaining,
preserves successors/different alarms and fails on retained ownership. It
cannot make the measured orphan assertion pass or prove physical eviction
or provider cancellation.

## Failed fixture attempts and focused controls

T1's first whole Site file reports 3 passes and 4 failures. The first is
already the real non-null-alarm-versus-null assertion at line 281. The next
case starts with that retained alarm, the old fixed-owner eviction times out
with active references, and the later reader case reuses custody instead of
minting its expected token. A cross-Durable-Object I/O abort exception also
appears. Those later outcomes do not independently prove more production
alarm defects. The exact-name focused-1 selector skips all seven cases;
exit zero supplies no invariant evidence. Focused-2 selects one case and
fails the same ordinary alarm assertion with six skips. The unchanged old
eviction case passes alone with six skips. These runs leave the underlying
RPC-disposal/timeout cause unproved.

T2 reports 3 passes / 4 failures: its five-second retirement cleanup timeout
masks both new assertions; old eviction timeout, reader reuse and cross-DO
abort remain. Its compiler pass erases none of these outcomes. The masked
cases prove neither an ordinary alarm assertion nor physical drain.

T3 removes that retirement/held-provider machinery, uses immediate scripted
provider replies and independent native instance names, and preserves the
five original cases byte-for-byte. Its full file reports 6 passes and one
ordinary orphan-alarm assertion at line 225, with no other reported error.
That is the final clean baseline for the two-part P1 repair.

Each P1 control runs only that same owning case. One removes the worker's
null-wake delete; the other removes the cleanup's reschedule. Each first
passes the baseline, then fails the same ordinary assertion at line 225
with six skips; each helper returns zero with `DISTINGUISHES` and restores
exact source bytes/modes. The formal receipts independently retain clean
unchanged P1 HEAD/tree and matching source bytes. Neither control is an
import/setup failure or a whole-suite mutation sweep.

The F2 native continuation then exposes a fixture assumption that the
single-file room passes did not establish: the shared fixture's fixed-name
index cannot be assumed empty for this room. The retained failure is one
room-case fixed-index deep-equality failure, not multiple failures because
case/module/progress repeat its identity. Collapsed output does not reveal
which field differed or its value. Do not assign it to a particular prior
Site row or infer a new production defect from that missing detail.

P3 changes only the room's physical owner selection through the existing
StartupOwner namespace seam. All six journal quiescence, genuine timer,
callback and eviction assertions remain. The source-reviewed patch SHA256
is `079864010ece407bda9756f7229291264b0d3151f0ac485f3b0224d1dd40fa41`.
The whole P3 room file passes, and its metadata names logical
`applied-genesis-v1` plus a distinct `idle-room-<UUID>` physical owner in all
seven phases. This is native real-class ownership under an explicit test
namespace remap; it proves no deployed fixed-owner or global-empty state.
The changed compiler context also passes. The accompanying JSDoc correction
explicitly preserves archive's memory fallback. Because the repair reaches
outside the original Node seal test, F2 continuation evidence cannot close
this work under the single-file exception. The required fresh full gate
at P3 is now closed and passed, with its separate actual receipt below.

## Source identities, evidence and measured cost

- B, landed starting Main: `901a7fa447cfd57659ca9158982df028052a2673`,
  tree `8cbd5572c02f9018d93763eba9a02e59fd4a6797`.
- T1: `cac22ea4ed503f9131ebd5b1290388adc7685fa0`, tree
  `8e3f04e3ffec1d7ad05466ce53b4a0a0193c0f55`.
- T2: `c41771ad3e48a5c2936e0b6066635d815d8a6ef7`, tree
  `a0ce20525aeb1092088508c95b1c6a195df12a53`.
- T3: `d8cac4020c747c3cde4a4fa8da43f1f624104700`, tree
  `ac6bf533e1c0ca2d85fc79672399b5b524f637c1`.
- P1: `4866ee9c2a34e9eac1f0ef047db3e6c7d706ef36`, tree
  `8329a4fb8c8359dbf70430c74d832f675c893e5f`.
- P2, production/comment freeze: `6215285a0ded4942d9b7d8f79c2eac967d1278f3`, tree
  `4c68de3ab85668fedde601831c5e216782b83f34`.
- F1, first seal-only follow-up: `56bc51a74e8080b0b843e52d231c81deb9ae6608`,
  tree `dd76c68d1e21e194856fc137c64c070bc26b4bf6`.
- F2, final seal-only follow-up: `1b066e1a33a8a0f4813f3054b0d858318b6552d1`,
  tree `535203299cb1a4d929a135c17feba127abc35d05`.
- P3, room-owner isolation and complete alarm comment:
  `b69d58cb971013a1bd0d257aa3aca5a5115f4689`, tree
  `c5b5eea6ae6a78b41e36242c01e6b8a41340d3cf`.
- M, later report-only Main: `909d8a1a3b9ada6dd1bed9c49511a479a2428ea6`,
  tree `5e5ba2de78191cbf70dc0ef8c71b0e5844d2ce4c`.

P2 differs from P1 only in the outbox JSDoc. Worker, token and test bytes
remain those of P1; focused results retain their actual P1 source identity.
The overall B-to-P2 diff contains five files: three production-source files
(including that comment) and two owning test files. No dependency,
configuration, shared fixture or scheduling algorithm beyond the Site
repair changes. Main's later advance to M changes only its report, with
no overlap or tested-source change; no gate is relabeled as an M execution.

Producer: `/private/tmp/artroom-idle-alarms-evidence-20261029`.
Each formal table label cites `command.json`, `process.json`, `receipt.json`,
`source-index.json`, `stdout.log` and `stderr.log` beneath that label.
The manifest also binds complete `operator-inputs` and `finalization` units
through their own indices.
All 25 listed formal processes are closed, with clean unchanged
post-HEAD/tree and matching source bytes. Twenty-four receipts report
complete collection; `unreached-native-1` is inconclusive (`stdout-limit`).
None reports collector timeout. Complete collection implies no test
acceptance; T1/T2 runtime timeouts remain failures. Source-map custody
remains under
`operator-inputs/source-map-1`: `original-source-map.md`,
`original-main-inputs.json`, `landed-input-equivalence.json`. The last record
shows all 25 reviewed source/fixture inputs retain their bytes from old Main
`b98968e50fe7c588862dc85deaff1e61516943fb` (tree
`1e1b2d0c6d16c2a5e4734b611049e0c70d2407c3`) to B. That is finite source
comparison, not a new runtime result or whole-tree equivalence.

The table uses actual command/capture exits, separate stdout/stderr SHA256,
receipt `elapsedSeconds` (command start through source guards) and whole-
capture user+system `hostChildCpuSeconds`. Receipts retain command-only CPU
separately; guest/container CPU and setup CPU are unknown. Costs are not
summed. Cache warmth and unrelated concurrent work are unknown. The retained
hardware/runtime is Darwin arm64, Mac17,7, 18 logical CPUs, 64 GiB RAM,
Node v26.13.0 and npm 11.20.0. Gate-1's snapshot at
23:14:00.768454Z follows its 23:13:47.456488Z finish by 13.311966 s; its
1.63/1.38/1.26 load is subsequent, not concurrent. Both original snapshot
and timing correction remain under `operator-inputs`.

Gate-2's first snapshot (`machine-snapshot-gate-2.json`) retains a blocked
sysctl attempt (exit 1, Operation not permitted), alongside successful
uname/Node/npm observations. Its separate closed follow-up
(`machine-snapshot-gate-2-followup.json`) at 23:38:13.875654Z records the
same hardware and load 3.19/2.58/2.32. Preserve both observations. The
closed gate-2 command spans 23:37:53.594728Z to 23:57:51.090648Z, so both
snapshot timestamps fall inside its actual interval. The load is one
in-run snapshot, not continuous load or per-command CPU attribution;
unrelated concurrent work and cache warmth remain unknown. Counts below
come from actual closed streams. Control commands use
JSON argv to preserve literal newlines; other cells use shell argv notation.
Project commands use cwd
`/Users/hughpyle/play/artroom/.builder-worktrees/idle-scope-alarms-20261029`.
Historical readback cwd is
`/private/tmp/artroom-idle-alarm-readback-20261029-1`; P3 readback cwd is
`/private/tmp`.

`E` in a digest cell means the exact SHA256 of zero bytes:
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
All nonempty stream hashes appear in full.

| Check / capture | Source | Actual command or argv | Exit and observed outcome | Elapsed s | Host-child CPU s | SHA256 stdout; stderr |
| --- | --- | --- | --- | --- | --- | --- |
| dependency-setup-1 (setup, not test) | B | `npm ci` | 0; locked setup; lock unchanged; clean source. Warnings retained. | 2.079753250 | not retained | `242bf16ca621fb2d804b21dba33abde81f94e4583ad41bb524d57552c08830ec`; stderr `50add94063c86dd023413e8f3b7675c71eaeede581ec7c89e78d48e9a74c568f` |
| baseline-test-types-1 | T1 | `node node_modules/typescript/bin/tsc --noEmit -p packages/scope/tsconfig.test.json` | 0/0; test compiler PASS. | 1.036501209 | 3.637463 | `E`; stderr `E` |
| baseline-idle-room-1 | T1 | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/idle-alarms.test.ts` | 0/0; room witness 1 PASS. | 5.104373583 | 6.644120 | `0c0abaa91cb703af1ad30e58e06a645eb9f56d365760d4027809297a5f2b534f`; stderr `E` |
| baseline-site-token-1 | T1 | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/site-token-reuse.test.ts` | 1/1; 3 PASS / 4 FAIL: orphan assertion plus contaminated setup/eviction/reader failures; Cross-DO abort. | 35.176553541 | 6.856403 | `65c665853733856527ff2dbf62d1a26d6cc69adff21d7a1758f45fb9a8e662a2`; stderr `a57ca76eaa27b48379d10b547beb6b2c0fc7819c186de9610e494c125dfd2bc5` |
| baseline-site-last-alarm-focused-1 | T1 | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/site-token-reuse.test.ts -t 'actual fixed-owner Site RPC clears its last alarm after a joined pre-mint failure'` | 0/0; all 7 SKIP. Selector matched no case; no invariant evidence. | 4.611533125 | 5.994340 | `0578a11b7627ed1b3822cc0b9ea3c4f7f4681fef9aaac661c4332e544216bd46`; stderr `E` |
| baseline-site-last-alarm-focused-2 | T1 | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/site-token-reuse.test.ts -t 'Site RPC clears'` | 1/1; 1 ordinary alarm/null assertion FAIL at 281 / 6 SKIP. | 4.581465833 | 5.978447 | `8c31be840c4fe56c63e05c9aff3873a2f4fb18c55591cde0cda9f038e55f47c2`; stderr `d62041cff441ac933c33a886b1c4aa9b04470f604db24d75361c8bf935fdc79f` |
| baseline-site-legacy-eviction-focused-1 | T1 | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/site-token-reuse.test.ts -t 'survives eviction'` | 0/0; unchanged eviction case 1 PASS / 6 SKIP; cause of whole-file timeout unproved. | 4.609248250 | 5.998507 | `2282f3b9f5a010504e3f899b4883332e349fd9913936d2e3c186fbd4ac14de83`; stderr `E` |
| isolated-baseline-test-types-1 | T2 | `node node_modules/typescript/bin/tsc --noEmit -p packages/scope/tsconfig.test.json` | 0/0; T2 test compiler PASS. | 0.728220791 | 3.969368 | `E`; stderr `E` |
| isolated-baseline-site-token-1 | T2 | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/site-token-reuse.test.ts` | 1/1; 3 PASS / 4 FAIL: 5 s cleanup masks new assertions; old eviction/reader failures and Cross-DO abort. | 44.704379458 | 6.478953 | `299617b6d04e10a7d6d2c178a79594e691cf4843ba24e841da081b4320948f8c`; stderr `c6cadcfa249c632d4ab20f17d9cf2a216071fb468b4a73ea20da02843966b607` |
| simple-baseline-test-types-1 | T3 | `node node_modules/typescript/bin/tsc --noEmit -p packages/scope/tsconfig.test.json` | 0/0; T3 test compiler PASS. | 0.719496291 | 3.602030 | `E`; stderr `E` |
| simple-baseline-site-token-1 | T3 | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/site-token-reuse.test.ts` | 1/1; 6 PASS / 1 ordinary alarm/null assertion FAIL at 225; no other reported error. | 4.658633166 | 6.070138 | `0bfa9808643414899aa5502a9808374f7bdab1b9e22dce5d93c8fa604dc75475`; stderr `9b76bd46e51dc640b3120bf3a8c47e16edc13306fccdb5706d0248b49aa72289` |
| repaired-source-types-1 | P1 | `node node_modules/typescript/bin/tsc --noEmit -p packages/scope/tsconfig.json` | 0/0; production compiler PASS. | 0.357426417 | 1.546630 | `E`; stderr `E` |
| repaired-test-types-1 | P1 | `node node_modules/typescript/bin/tsc --noEmit -p packages/scope/tsconfig.test.json` | 0/0; test compiler PASS. | 0.774855208 | 4.125020 | `E`; stderr `E` |
| repaired-site-token-1 | P1 | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/site-token-reuse.test.ts` | 0/0; whole Site owning file 7 PASS. | 4.788389875 | 6.238351 | `7d91e3532a33ac2786444ac4659c259c179fb9fc503a8bf05058a0f83bcae96b`; stderr `E` |
| repaired-idle-room-1 | P1 | `node node_modules/vitest/vitest.mjs run --project scope --reporter verbose packages/scope/test/idle-alarms.test.ts` | 0/0; room 1 PASS; verbose metadata retains seven phases. | 5.057375667 | 6.548662 | `7a13fae00c5f5df0fd097f0c1f43784afb75d3fd5cd9527552fc106da492400f`; stderr `E` |
| control-empty-site-wake-1 | P1 | `["node","scripts/control.mjs","packages/scope/src/worker.ts","if (actual !== null) await this.ctx.storage.deleteAlarm();","if (actual !== null) { /* control: keep the obsolete alarm */ }","--expect","isolated ScopeIndex Site RPC clears its last alarm","--",".","--project","scope","packages/scope/test/site-token-reuse.test.ts","-t","isolated ScopeIndex Site RPC clears its last alarm"]` | 0/0 control; baseline 1 PASS, mutant 1 ordinary assertion FAIL at 225 / 6 SKIP; DISTINGUISHES; exact restoration. | 10.328177000 | 13.089085 | `E`; stderr `69c9371ca490df2f7f3d7379b8ca0d2a04bd0cd2596c0a4bce8106c614b8df8e` |
| control-reservation-reschedule-1 | P1 | `["node","scripts/control.mjs","packages/scope/src/site/token-reuse.ts","this.#sql.exec(\"DELETE FROM private_site_token WHERE key=? AND generation=? AND state='reserved'\", key, generation).toArray();\n          try { await flight.deadline.wait(this.#schedule()); }","this.#sql.exec(\"DELETE FROM private_site_token WHERE key=? AND generation=? AND state='reserved'\", key, generation).toArray();\n          try { await Promise.resolve(); }","--expect","isolated ScopeIndex Site RPC clears its last alarm","--",".","--project","scope","packages/scope/test/site-token-reuse.test.ts","-t","isolated ScopeIndex Site RPC clears its last alarm"]` | 0/0 control; baseline 1 PASS, mutant 1 ordinary assertion FAIL at 225 / 6 SKIP; DISTINGUISHES; exact restoration. | 9.605455000 | 12.292712 | `E`; stderr `45e485a660128cf03ff5963c08f33a11e8149a7c912525e8721615227fca6377` |
| gate-1 | P2 | `npm run gate` | 1/1; complete, closed; kernel PASS, Node 79 PASS / 1 seal assertion FAIL; Counting/plain/native UNREACHED. | 78.047736459 | 140.400670 | `f77403463cb36616c42725552f00c7602e760b18fd5a020e07d4015deb9071bd`; stderr `E` |
| seal-followup-node-1 | F1 | `node --test scripts/security-entry-points.test.mjs` | 1/1; 9 PASS / 1 source-seal assertion FAIL: same inventory loop next exposes the stale token-reuse seal. | 2.342521416 | 3.016355 | `135fdfab795ed4c8285070d7ad7c2077145492cb1fa148dcf45ad931a6ca57d3`; stderr `E` |
| seal-followup-node-2 | F2 | `node --test scripts/security-entry-points.test.mjs` | 0/0; whole security-entry-points owner 10 PASS. | 2.418779291 | 3.096273 | `57ccfaf0bed9d4f99796a9e7bd5753c267f5289cae6104d9836f9ddb91de2104`; stderr `E` |
| unreached-counting-1 | F2 | `node apps/counter/scripts/test-browser.mjs` | 0/0; previously unreached Counting phase 56 PASS. | 1.880600375 | 3.151649 | `1013cbb3290c931787287c6512f0561865a30e4939f41457313851e154109a67`; stderr `E` |
| unreached-plain-1 | F2 | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts` | 0/0; 323 files PASS; 3109 PASS / 1 SKIP (3110 total), previously unreached in gate. | 66.362441667 | 246.531067 | `ee49192f4c35ddeb617deda043ebcb30579da4d741323356a53d35e882066f32`; stderr `E` |
| native-metadata-readback-1/execution-1 (inspection) | P1 retained output | `/Users/hughpyle/.pyenv/versions/3.14.5/bin/python3 /private/tmp/artroom-idle-alarm-readback-20261029-1/derive.py --stdout /private/tmp/artroom-idle-alarms-evidence-20261029/repaired-idle-room-1/stdout.log --receipt /private/tmp/artroom-idle-alarms-evidence-20261029/repaired-idle-room-1/receipt.json --test-source /Users/hughpyle/play/artroom/.builder-worktrees/idle-scope-alarms-20261029/packages/scope/test/idle-alarms.test.ts --out-dir /private/tmp/artroom-idle-alarm-readback-20261029-1/derived-1` | 0; derivation process closed; seven printed phases; no new native test/audit/acceptance. | 0.031705250 | not retained | `0c87a2f00d408e39e59f57c1bbcb546b50d46c9c43cf4ec4cab9ad73170056c6`; stderr `E` |
| unreached-native-1 | F2 | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts` | 143/125; INCONCLUSIVE stdout-limit; process closed; one observed room-index failure, differing field unknown; no final counts. | 919.704163375 | 1874.668302 | `5ba65d69366a87eaa37b90c7f7fccc9f36b506d922be429bb72f180ea4b35ff6`; stderr `7bfbbe8f02b3bfed4ae38034f75602321f634b31d4b087907f8ded72158047d0` |
| owner-isolation-test-types-1 | P3 | `node node_modules/typescript/bin/tsc --noEmit -p packages/scope/tsconfig.test.json` | 0/0; changed scope test compiler context PASS. | 0.795827833 | 3.969855 | `E`; stderr `E` |
| owner-isolation-room-1 | P3 | `node node_modules/vitest/vitest.mjs run --project scope --reporter verbose packages/scope/test/idle-alarms.test.ts` | 0/0; whole isolated-owner room file 1 PASS; six journal/timer/eviction predicates retained. | 5.289693708 | 6.615773 | `61cef5b659e0bb234ec7576eac2cae4f31dac6b420168e7fb62d7f28f4a53740`; stderr `E` |
| owner-isolation-metadata-readback-1/execution-1 (inspection) | P3 retained output | `/Users/hughpyle/.pyenv/versions/3.14.5/bin/python3 /private/tmp/artroom-idle-alarm-owner-isolation-readback-proposal-20261029/derive-v2.py --stdout /private/tmp/artroom-idle-alarms-evidence-20261029/owner-isolation-room-1/stdout.log --receipt /private/tmp/artroom-idle-alarms-evidence-20261029/owner-isolation-room-1/receipt.json --test-source /private/tmp/artroom-idle-alarms-evidence-20261029/owner-isolation-room-1/source/packages/scope/test/idle-alarms.test.ts --out-dir /private/tmp/artroom-idle-alarm-owner-isolation-readback-executed-20261029-1` | 0; derivation process closed; seven isolated-owner phases / 502 wait calls; no new native test/audit. | 0.034248084 | not retained | `27acc36d455686b2353e4b3d4fc8d843d055a041bcf5d959aa26aa961ca13b39`; stderr `E` |
| gate-2 | P3 | `npm run gate` | 0/0; complete, closed; kernel/Node/Counting/plain/native PASS. Node 80; Counting 56; plain 3109 PASS / 1 SKIP; native 840 PASS / 2 SKIP. | 1197.492454125 | 2530.439629 | `5b9ad6c72f1d356bc899d899bdb3ab6618493839487d9906eb53bf537b70aa8c`; stderr `E` |
| Receipt/hash audit (inspection) | P3 frozen collection | `/Users/hughpyle/.pyenv/versions/3.14.5/bin/python3 /private/tmp/artroom-idle-alarms-final-closure-proposal-v3-20261029/audit.py` | 0; 25 closed captures, no missing leaves, integrity issues or unclosed process; one original inconclusive capture retained. | 1.124776083 | 1.120391 | `0ae9915628d5252c294752cf2472dcb91a1b060d9e4ffe39e6fd03e5372542d3`; stderr `E` |

Gate-1's only Node failure is `scripts/security-entry-points.test.mjs`.
The four seal values here are parser digests of syntax trees, not raw-file
SHA256 values; the retained failed stdout records bind actual and expected.
ScopeIndex source seal expected
`2883602f5b49f79a54d5d0daa8784b4c099cfdd6e2ac05654ef866fdc78d62dd`,
actual `c427427157118cacbc763f65d5523f598eeb72a0b9a01520f1b088c5bc6dbad5`,
from the reviewed private scheduler repair. It stops before Counting, plain
and native. Receipt SHA256:
`08c4cf44b2ac1cededb40d103381a4840b3fe3b9204b0a965c42234c4175d3dd`.
F1 updates that reviewed ScopeIndex seal, then the same original inventory
loop exposes the stale token-reuse seal: expected
`6868a52935ee8c42e1d38a9216f62e768781c8d18c36f5f8705c2052fb12567d`,
actual `ac9268b1d7718d40ee266d274fea29cb65a30f51a1a36985411e42d2eb71a540`.
F2 adopts both actual maintained-parser seals after review of the intended
production deltas. P2-to-F2 changes exactly those two seal lines/comments
in the same unimported `.mjs` test; every original assertion/case remains.
No production, configuration, dependency, shared helper or compiler input
changes. The whole Node owner passes 10, Counting 56, and plain 3109 with
one skip at F2. These retain their separate outcomes. The later native capture is
inconclusive and leads to the P3 fixture repair above. P3 exceeds the
single-file exception and therefore required gate-2; it does not turn
gate-1, F1 or the
first native attempt into a completed pass.

Gate-2's receipt SHA256 is
`fa83d34f7ca37b3ffc35927d5cdfdfdfc6626beb86e8ca74d85d2452197a9d80`.
The gate reports Node 80 passes, Counting 56, plain 323 files / 3109 passes
and 1 skip. Native reports 240 passed files plus 1 skipped file, with
840 passed cases and 2 skips. All five stages pass;
Node, Counting, plain and native terminal evidence is complete, with no
unhandled error reported. The native observation summary still labels
scope partial (239 observed modules), with 72 unknown/suite observations
and zero contradictory records. This is not callback-completeness or a
physical drain/celld claim. The gate skips dependency installation because
its dependency view stamp verifies against the current lock; this is not
a fresh npm ci or a fabricated zero-cost install.

The complete closed gate temporary root is retained under
`operator-inputs/gate-detail-gate-2`: 27 files, 44,728,285 bytes, with
copy-record SHA256 `e3539554753fc40f009cca2f59ad8ae1c4a81f330c5f96aefce87a382cc1e7ab`.
Its public review and inventory are `gate-2-public-retention-review.json`
and `gate-2-public-retention-inventory.json` under `operator-inputs`.
The exact two progress files remain at their original operator paths.
Gate-2's six generated Counting files are retained separately under
`operator-inputs/gate-2-counting-generated`; their four MJS files match
the earlier unit, and both metadata changes contain only output-directory
paths. Copies, complete membership and modes were verified before audit.

The historical P1 stdlib readback remains under
`operator-inputs/native-metadata-readback-1`, with its seven closed leaves
and copy record SHA256
`a6fe9cb1e82db998cc4569c151386b0ea8ba944e01e7546a476ce3d7267d31b3`.
Root's reviewed copy reports stable inputs and verified copies. The reader
leaves collapsed outbox/timer values unknown and identifies ownedCallbacks
as a printed literal after source assertions, not an independent census.
This custody/inspection establishes no new runtime result or full audit.
The current P3 reader is retained under
`operator-inputs/owner-isolation-metadata-readback-1`: script SHA256
`c3ac908f100461bb029f0bd3db747e9f67cc3d8e4dcef9854480eac2df78abbe`,
report `56d663ffe9f20327de8d487a194b441be276f46672ac61c151950b82a277a99f`,
derived JSON `4210c0b5ec0b37ebed96d26cabcf6af663a59c512b5973621c50ed4a0c0f3574`.
Its copied closed command/receipt/streams bind the P3 room stdout, receipt
and test source. It leaves collapsed fields unknown and reports actual
logical/physical owner metadata. This inspection adds no runtime test,
callback census, physical drain proof or acceptance audit.

P3 repair provenance now lives under `operator-inputs/source-repair-1`:
`owner-isolation-proposal.diff` retains SHA256
`079864010ece407bda9756f7229291264b0d3151f0ac485f3b0224d1dd40fa41`;
`actual-repair.diff` SHA256 is
`923362bac2859bdc175910fbfa5befb6c8383f4f6622580be656df251f4595b2`.
`provenance.json` distinguishes the applied proposal from the additional
archive-fallback comment correction, with unchanged worker/token behavior,
shared fixtures, configuration and dependencies.

The native attempt's receipt SHA256 is
`6dfe4b440c44733d27bdfabe8896b91d79c0a051cddec730f65b50ed702276f9`.
It retained exactly 32 MiB stdout and read/dropped a further 1,526 bytes;
stderr retained 2,865 bytes. It ended without a final test summary. The
one observed failed room case remains a failure observation inside an
inconclusive capture, not an inferred suite count or pass. Retained privacy
review `operator-inputs/native-phase-1-public-retention-review.json`, SHA256
`dd5891745bd66287208034c90e073ce581e1e32ccec665693c687b519904f453`,
binds the exact streams and closed observation unit, with its bounded
public-byte review qualifications. `native-phase-1-group-observation.json`
records no listed members for the old process group after closure; this
proves neither escaped-descendant absence nor physical cancellation/drain.

The Root-reviewed gate-2 collector has SHA256
`7f66261cb4d774afb39100b99ff6160bdd431a4d0b0284acc5f88135c721c592`.
Its only change raises each stdout/stderr cap from 32 to 128 MiB; all other
collection bounds/policy remain. The first native capture keeps its original
collector, limit and outcome; a larger cap does not recover its dropped
bytes or change that inconclusive outcome. Gate-2 has its own actual
receipt. This cap governs the collector's outer streams. The full gate
redirects its test output to a separate `test.log` (35,328,623 bytes),
retained in the complete temporary-output unit under the 2 GiB total bound.
The normal-full-pass closure pins both actual collector versions and
checks each old capture against its original cap.

Root retained 25 closed gate-1 detail files / 5,711,124 bytes under
`operator-inputs/gate-detail-gate-1`. Its copy record
`operator-inputs/gate-detail-gate-1-copy-record.json` SHA256 is
`7ba322d1b728b37a2f012776f33bd72d5e31be36b8e4232995bdc54336d225cb`.
It verifies that selected custody, not another gate/test or final audit.

Setup's receipt records identical before/after repository lock digests at B.
Its npm warning/audit output remains unchanged; no audit fix or install-script
approval follows from that setup.

The durable evidence root is
`/Users/hughpyle/play/artroom-evidence/2026-10-29-idle-alarms`.
Its repository manifest is
`notes/implementation/evidence/2026-10-29-idle-alarms.manifest.json`.
Preparation completed with exclusive copies and exact byte/mode readback.
The audit input held 397 files / 101,002,739 bytes; the prepared state holds
403 files / 101,132,159 bytes after audit results and preparation metadata.
These are different collection stages, not the final indexed count.

`finalization/receipt-audit.json` has SHA256
`aa1bf8e04c80be60b286e4f03b03d8241be4b92a05d5cd4c1ae64a2655ea898b`;
`finalization/receipt-table.md` has SHA256
`a9d5239539fe3d07f8cb88bb68476922b3cc1263b0393a8f2247f83153218023`.
The audit checks source Git blobs/modes, task and checkpoint identities,
closed process and actual exit records, stream accounting, both collector
profiles and stable collection membership. It executes no project code.
The incomplete-label list is empty (no missing files); the distinct
inconclusive list contains only `unreached-native-1`.

Finalization binds this exact note, creates the manifest and root
`SHA256SUMS` as its last RAW write, and verifies every indexed byte and mode
before and after removing write bits. Its caller terminal stays outside
RAW. The manifest records final indexed counts and both collector sources;
verify it with the root and directory indices rather than inferring a seal
from the audit alone. Keep evidence read-only for at least 30 days after
landing; removal requires a planner act naming the manifest.

## Open limits

- Request `c30342747abb9cf1a217f29904ac5b903dc41cac` owns exact-head
  checker review and landing. Gate-2 passes at P3; gate-1 and F1 remain
  failed, and the first native continuation remains inconclusive. Evidence
  integrity and a gate pass do not grant checker approval.
- Parent finding `a6847815c845145adddca1476342e52b6a8baf82` retains celld CPU /
  700-cell attribution. No host/deployment action or physical cadence,
  eviction, CPU-cause or host-wide idle observation ran here.
- This bounded host-none cohort rejects every listed backlog and parked
  unknown operation. It establishes no universal application/deployment
  idle state; a null alarm can coexist with unresolved work elsewhere.
- Provider/configuration and room clocks/inspection remain TEST inputs.
  Logs retain metadata/TEST source, not private signed bodies or real host
  custody. Isolated instances and the unchanged fixed-name case retain
  distinct boundaries. T1/T2 timeout/abort and RPC-disposal causes remain
  unproved. P3 deliberately measures a fresh physical room-index owner,
  not deployed fixed-owner/global emptiness. The first native mismatch's
  precise field/value and any prior Site-row attribution remain unknown.
