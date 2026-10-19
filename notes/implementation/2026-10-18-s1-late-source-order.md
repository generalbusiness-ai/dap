# S1: late deliveries and source order

Request `b42d3b741986eb8f171e353ad3cb3704f202be9b`, promise
`1de1f7be5eec7f9e02c5fa5e4e527ee23477b5a1`. This branch starts from reviewed
Main `165d5a86fe8c1868f3069efad61a435a5417bde2`. The approved sequenced note's
section 6 and packages note's section 4.1 govern; amendments `b53643f2` and
`d66ec837` replace the original lag guard and either-arrival-order wording.
The saved G1 branch remains separate and incomplete. The independent
source-order/source-time child is request `0a66c7072fcddeda1e483f7df78051480bf55942`,
promise `9f3dc1b5b8fac97d054c9736eee14747e650268f`. Earlier child attempt
`79a5a3b5` was ineffective because the promise alone carried no inheritable
target; the effective request also rests on the parent request. The parent
stays open for the late form. This note records the child's exact gate
evidence. Checker review and landing remain separate; parent S1 is not complete.

## Current source-order behavior

A tell handler may declare `order: "source"`; absent order and `arrival`
retain arrival behavior. The receiver records its highest applied `(seq, n)`
for each source scope, source incarnation and handler message. The validator
already requires one tell dispatch for that message and sender kind. A lower
pair that arrives after a higher applied pair gets a native `superseded`
decision and authenticated result. Lower-first applies both; higher-first
applies the higher and supersedes the lower. This does not provide a latest
value guarantee, detect a gap or order different senders.

Only an applied delivery advances the index. Refusals and superseded
decisions do not. The fold derives this bookkeeping from the journal; the
verifier uses the same fold. Memory state, SQLite and replay's historical
view carry it. Empty snapshots omit the new optional member. SQLite uses one
primary-key lookup per source/handler and one row per distinct applied
source/incarnation/handler. This derived index grows no faster than the
applied deliveries already retained by the journal/inbox; it is not a fixed
heap bound or an additional application capability record.

The contract also admits `EntryPart` `time`. A handler's `{ source: "time" }`
reads its verified source entry's time, not the receiver clock or a field in
the delivered payload. The existing source-operand restriction to handlers
continues to apply. Reading this recorded timestamp alone does not judge the
current time; the future late form will do that separately.

## Focused evidence so far

The derive witness covers increasing and reversed source pairs, two ordinals
in one source entry, exact repeat without another entry, separate handlers,
separate source scopes, an empty frontier for another incarnation, arrival
mode, malformed order values and order outside tell handlers. A refused
higher pair leaves the frontier empty so a lower valid pair can apply.

Replay accepts both genuine arrival orders, preserves the frontier at past
heads and refuses a tampered last superseded decision changed to applied.
The native witness uses actual Durable Objects and SQLite, with eviction
before each delivery and again before an exact repeat; it inspects the
persisted frontier and its whole-fixture snapshot. The NET fixture supplies
explicit per-key grants, reader access and transport, not enrollment or
provider authority. Replay of the actual native journals passes in
`/tmp/artroom-s1-native-journal-replay-20261018.log`.

The initial fixture incorrectly tried to send to an act field instead of a
declared endpoint slot; validation refused it before judgment. The corrected
fixture writes a mutable peer reference and uses that slot. A later test
expected the word `duplicate`; the existing native result is `repeat`. These
failed attempts remain in `/tmp/artroom-s1-source-order-initial-20261018.log`
and `/tmp/artroom-s1-source-order-endpoint-20261018.log`.

The first three-file run passed four cases, including actual storage and
eviction, in `/tmp/artroom-s1-source-order-native-replay-initial-20261018.log`.
The tamper and source-time additions have separate passing focused logs.
Two paired controls distinguish the new invariants. Removing suppression
fails the applied-pair assertion; recording refusals in the frontier fails
the empty-frontier assertion. Both run only the owning derive file and
restore its changed source. Logs:
`/tmp/artroom-s1-source-order-guard-control-20261018.log` and
`/tmp/artroom-s1-source-order-applied-frontier-control-20261018.log`.
There is no mutation sweep or repeated whole suite.

Derive and replay typechecks passed initially. Scope typechecking found the
new StateView method missing from the outside-state adapter; it was added,
then Scope and replay typechecks passed. After the source-time and native
journal additions, all three owning package typechecks pass in
`/tmp/artroom-s1-dap-derive-type-time-native-20261018.log`,
`/tmp/artroom-s1-artroom-scope-type-time-native-20261018.log` and
`/tmp/artroom-s1-artroom-replay-type-time-native-20261018.log`.
The first gate failed; the corrected gate below passes.

Dependencies are a private APFS COW copy of the owned G1 view: 106 versions,
13 workspace links inside this checkout and zero installs. Only this copy's
Vite caches were removed. The unchanged lock's SHA-256 is
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
Audit `/tmp/artroom-s1-dependency-view-20261018.json`, SHA-256
`26bf674d6add215c4df453e4501dc93f1fa92e4c02ba345ca815890a205e8806`.
This checks versions and links, not tarball integrity.

## Late-refusal clarification

At implementation start, clarification request
`0784600e23323634638dd7b07197c4b2dee37f74` was with planner.
The approved note says late without a branch writes nothing and
fires the sender's refused clause. Today a verified request refusal writes
the decision and exactly one authenticated result send. A non-writing
delivery refusal maps to retry/unavailable and cannot fire that clause.
Builder proposed retaining the ordinary refused decision/result, with no
handler effects/sends, and reason `guard-failed` with the declared name.
Checker independently confirmed the conflict in `91c866dc` and its further
sequenced-refusal consequences in `b92bd90c`. Those source findings are not
planner adoption. The implementation will not invent a no-entry result
protocol or silently reinterpret the approved design. Clock-behind must
remain unavailable before any time-judging decision is written.

## First gate and correction

The first gate at clean `8c117af37df12167793f52676b35195254cd2885`, tree
`33dd4cd1b9cc7b5301a4514584cbbbdd31830882`, failed. Original PTY 29743
terminated at `d5c5c7`, exit 1. It passed typechecking and 385 Vitest files /
1,872 cases; two files / two cases failed and one file / three cases skipped.
The chained Node and Counter checks did not run.

The Page asset needed regeneration because its bundle includes the changed
operand validator. The owning build regenerated `apps/room/page/assets.ts`.
The native Lending story's second read returned `behind` where its unchanged
assertion expected `current`. Its original failure omitted the read reason.
The assertion now includes at most 1,000 characters of diagnostic JSON; its
expected behavior and all story obligations remain unchanged. A focused run
of the Page asset, native Lending story and native source-order file passes,
three files / three cases, in
`/tmp/artroom-s1-gate-correction-focused-20261018.log`. This is not a demonstrated
Lending fix. The original transient freshness mismatch remains an explicit
qualification, alongside the existing runtime warnings in the raw log.

First-gate evidence is `/tmp/artroom-s1-source-order-gate-20261018.log`, outer
time `/tmp/artroom-s1-source-order-gate-outer-20261018.time` and raw directory
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.HZh183bm3b/`.
Typechecking took 8.1 s elapsed / 30.7 s CPU; the test command took 489.8 s /
660.5 s. The measured outer gate took 498.12 s elapsed / 691.46 s CPU
(592.69 user + 98.77 system). These are the failed attempt's costs, not a
passing gate or total edit cost. The machine was shared arm64 macOS 27.0.1,
starting load 1.65 / 1.74 / 1.79, with the warm private COW dependency view.
Other G1 browser work ran concurrently; this was not exclusive CPU or a heap
measurement. Installs were skipped against the unchanged audited lock.

## Corrected gate and review boundary

The corrected gate passes at clean `b44a8e255c36dd4654e07c6cc406d3633b5805ba`,
tree `f2f45bc1d73a76e06c91557fbf612c605b02e8d5`. Original PTY 59168 terminated
at `4f4b19`, exit 0: 387 Vitest files / 1,874 cases pass; one file / three
cases skip; chained Node 31 and Counter 55 pass. Log
`/tmp/artroom-s1-source-order-gate-corrected-20261018.log`, raw directory
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.Hj1O6L6CX0/`,
outer time `/tmp/artroom-s1-source-order-gate-corrected-outer-20261018.time`.
Typechecking took 8.2 s elapsed / 31.4 s CPU; tests 472.8 s / 644.4 s.
The measured outer gate took 481.25 s elapsed / 676.04 s CPU
(578.57 user + 97.47 system). The shared arm64 macOS 27.0.1 host started at
load 1.24 / 2.43 / 2.49. The private COW view was warm after the failed
attempt and focused correction; independent G1 work ran concurrently.
These are gate costs, not exclusive CPU, heap or total edit-cost figures.
The earlier Lending mismatch remains qualified evidence, not a claimed fix.

Only this note changes after that passing code/test head. Per
`docs/testing.md`, the gate is not repeated for a documentation-only evidence
commit. The review candidate and tree are named by its filed artifacts and
review request. Its scope is source order plus the authenticated source-time
operand, not the late form or the whole parent.

Planner decision `a692fd0d` subsequently resolves the late wording: ordinary
authenticated refusal entry/result, new code `late` with the declared name,
and clock-behind before any entry. Builder ratified it at `5a8f1709`.
The late form proceeds independently under child request `4353d842`, promise
`6201d371`, in a different checkout based initially on this unlanded source
candidate. That checkout does not change this review's source or evidence,
and its unreviewed late behavior is not covered by this gate.
