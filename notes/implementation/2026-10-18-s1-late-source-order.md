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
stays open for the late form. This is a progress note, not a gate, review
or completion claim.

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
No final gate has run.

Dependencies are a private APFS COW copy of the owned G1 view: 106 versions,
13 workspace links inside this checkout and zero installs. Only this copy's
Vite caches were removed. The unchanged lock's SHA-256 is
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
Audit `/tmp/artroom-s1-dependency-view-20261018.json`, SHA-256
`26bf674d6add215c4df453e4501dc93f1fa92e4c02ba345ca815890a205e8806`.
This checks versions and links, not tarball integrity.

## Late-refusal clarification

Clarification request `0784600e23323634638dd7b07197c4b2dee37f74` is with
planner. The approved note says late without a branch writes nothing and
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
