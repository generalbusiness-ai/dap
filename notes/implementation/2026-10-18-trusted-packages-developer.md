# M1 developer half checkpoints

Work in progress under Source child `4735dfeed42d310099ea91521ed3998b74628c20`
and promise `8fb3e144c5ccd8dcc151d673ad89d57380a7bbca`, within M1
`eca1c7ee` / `7ff6cd96`. The developer half remains open. These checkpoints
do not complete install or the browser kit, and are not a submitted Source.

The worktree includes reviewed Main
`fd198c724a53a1f86ee1270fe477ab1d505f4b3f` and the M1 preparation note.
Planner disposition `c643756e5acbdd70c08e8425f8c84629c61e6cc7` was read in
full and ratified by `ac3497ec57ea5367d8e40f8c5f4a0a37a666c0be`.
It confirms the developer/install split, historical Counter support, one
recorded admin install with resumable checked deliveries, exact release/key
trust and a private content store with an installation-bound route. The URI
spelling below is now confirmed by the later planner decision.

## Shared stored-key signer

The client exports `storedWebCryptoSigner` for an existing browser-held
Ed25519 key, including one restored through structured clone/IndexedDB.
Native CryptoKey metadata getters require a private, non-extractable,
sign-only Ed25519 key; ordinary objects or own-property shadows cannot
stand in for that native state. Each call owns the input bytes before its
await and verifies the resulting signature against the named public key.
The returned interface contains only the public key id and sign operation.
It imports, exports, stores, grants and sends nothing.

Counter keeps its application-specific origin, exact pin, membership,
member and binding validation. Its existing initial signing challenge
now uses the shared signer. Lending's generated/stored key uses the same
signer synchronously at its existing boundary. Neither app's storage
schema, key import flow, epoch, request state machine or scope authority
was moved or reinterpreted in this checkpoint. There is no new claim
about arbitrary package code, signing isolation or native enrollment.

Focused SDK/intent checks pass 11 cases (`d1f0d1`, exit 0), using genuine
Node WebCrypto. They cover restored non-extractable keys, original bytes
while caller data changes, signature domains, metadata forgery/shadowing
and mismatched public/private keys. Existing Counter key tests pass two
cases (`599d88`, exit 0), including buffer clearing, restored signatures,
legacy import and a swapped-key refusal. These are Node/key witnesses,
not browser persistence or rendered UI evidence.

The client test typecheck passes (`f9a49e`), and Counter/Lending browser
typechecks pass (`8e2fe1`, `bd9fcf`). Initial SDK test typechecks exposed
the Node generateKey union/overload; an explicit key-pair runtime narrowing
corrected the test factory. No production type assertion bypass was added.

Two one-line controls distinguish by assertion and restore their source:
extractability (`a734eb`, exit 0) and public binding (`0120db`, exit 0).
The first binding control (`91d070`, exit 2) was inconclusive because
Vitest classified the rejected-promise matcher failure as generic Error.
An explicit settled-outcome assertion corrected the witness; the same
fault then produced the intended assertion. The inconclusive result is
not passing evidence.

Dependencies use a private COW copy of the owned A3 view, with all 13
workspace links verified inside the canonical M1 tree and its lock stamp
checked. No package was installed. The first link-audit attempt confused
the `/tmp` alias with `/private/tmp`; canonical roots corrected that audit.

## Portable package format checkpoint

The client now supplies `packApplication` and `readApplicationPackage`.
Neither accesses files, Git, a network, a host store, membership or native
scope execution. They verify the package's bytes, identities, signature
and declared creation closure. Native whole-definition validation and host
admission remain duties of check/install; a decoded package is no grant.

A version-1 package has semantic, presentation and release parts. Its ids
are SHA-256 over a distinct application tag, a newline and canonical JSON:
`dap-application-semantics-1`, `dap-application-presentation-1` and
`dap-application-release-1`. These are application domains; the native scope
domains and judging/replay rules are unchanged. The publisher signs the
manifest in `dap-application-release-signature-1` using its existing key.
The release digest covers that manifest and signature; neither contains its
own release id.

The semantic part holds the entry definition, canonical definition bytes
and their existing native digests, derived creation edges, execution/profile
requirements, requested capabilities/bounds, default roles/actions and
predecessor. M1's projection place is explicitly empty. Edges come from the
actual declarations' static create sends; every referenced declaration must
be present, and every packaged declaration must be reachable from the entry.
Required native profiles/capabilities cannot be omitted, and role defaults
cannot name actions absent from the packaged acts. These are consistency
checks, not a replacement for the native validator or M2's capability bounds.

The presentation part names exactly its semantic id and contains the entry
asset, static assets (safe paths, media types and canonical base64url bytes),
and act/field descriptions. A screen/description edit keeps semantic identity
and changes presentation/release. A role or declaration edit changes the
semantic identity and the presentation that binds it. Name, version or
publisher changes only the release, when the other parts are unchanged.
Input sets are sorted deterministically; duplicates, unrelated definitions,
unsafe paths, case aliases and file/directory prefix conflicts are refused.

Caller allowances are finite and can only be lowered: 16 MiB wire package,
64 assets, 2 MiB per decoded asset and 8 MiB total, 17 definitions with
256 KiB each, and 64 KiB semantic/presentation metadata. They are package
format limits, not adopted platform/history quotas or measured heap bounds.
The wire bound precedes JSON decoding; encoded asset size precedes base64
decoding. The in-memory writer measures JSON escapes, nodes and depth before
serialization, refuses getters without invoking them, and owns its inputs
before awaiting a signer. Returned package objects are frozen.

Six focused package cases pass (`76100c`, exit 0), including stable repeated
packs, separate edit identities, Unicode/escaped description round-trip,
actual signatures and expected ids, missing/extra/altered declarations,
hidden requirements/grants, wire/asset limits, unsafe asset aliases and input
mutation during signing. The earlier combined package/key run passed eight
cases (`1f5bc5`). Production client typecheck passes (`589203`); the test
typecheck passed after using mutable corruption fixtures and explicit index
access (`da1f92`). Initial readonly/index typing failures remain failed
attempts rather than passing results.

Two focused controls distinguish by their intended assertions and restore
source: bypassing the publisher signature check accepts a mismatched signer
(`a9948c`); dropping exact reachability admits an unrelated definition
(`e872ae`). Both normal runs pass six cases and both controls exit 0. Logs
use the `/tmp/artroom-m1-package-` prefix. No full M1 gate or Source has been
submitted for this checkpoint.

## Confirmed Git release address

The Node-only `dap pack [directory] [--out file] [--publisher key-name]`
now reads `dap.application.json`, checks each listed native declaration with
`validateDefinition` and `RULE_PROFILES`, and writes a signed package through
an existing named key (default `operator`). It creates no key or room config,
and publishes complete bytes with an exclusive hard link; an existing file
or symlink is not replaced. Temporary/output files are owner-only. Printed
lines contain the file and public identities; a held key copy is cleared.

The source config names its entry definition file, complete definition list,
host requirements, projections, capabilities, roles, predecessor, and a
presentation with entry, descriptions and `{path, file, mediaType}` assets.
Source JSON may have ordinary whitespace; packaged native bytes are canonical.
Source paths stay below the explicitly chosen root without dot segments.
Directory symlinks, leaf symlinks and non-regular files are refused. File size
is checked before a fixed-size descriptor read and JSON/base64 work, with
metadata checked afterwards. These checks detect ordinary concurrent edits;
they do not promise hostile-filesystem isolation or a whole-directory snapshot.
Current native validation uses `PROPOSED_BOUNDS`; installation still validates
under the host's actual bounds. A browser bundle is still due; the scenario
layer below now connects this pack preparation to `check`.

Five focused filesystem/CLI cases pass (`a1212a`, exit 0), including both
real Counter and Lending declaration files, repeated exact package bytes,
file/symlink output preservation, pre-sign native rule refusal, path and
source allowances, key custody, extra-role refusal and the actual `dap` bin
from an external working directory with a TEST key and no room config.
The first run (`6c00e0`, exit 1) found a fixture's `/var` versus `/private/var`
alias mismatch; resolving its temporary root corrected the assertion.
Production typecheck passes (`c5e1b3`), as does the final CLI test typecheck
(`22dcb1`). No tool installation or manifest/lock change was needed.

Native-rule admission (`7d4780`/`49d33f`) and pre-read source allowance
(`e69a5e`/`4d5196`) controls each exit 0: normal runs pass five cases, and
the fault fails one intended assertion. Source is restored. The allowance
fault reaches the portable codec's later limit instead of the filesystem
refusal, distinguishing the earlier boundary. The first native control
(`ddb03a`, exit 2) selected Node's runner because the CLI package's test script
contains both runners; it is inconclusive. The corrected invocation uses the
client package's Vitest runner with explicit CLI root/config and this one file.

A retained local pack example is
`/tmp/artroom-m1-pack-example-20261018/application.dap.json` (6,417 bytes).
It contains the real Lending definition and a labelled static fixture page,
signed by the public TEST seed of 32 bytes all equal to 23. This is a pack
format witness, not the converted Lending screen, a trusted release or an
installation. Its output is recorded in
`/tmp/artroom-m1-pack-example-output-20261018.json`:

- Semantic: `sha256:fb39c9f3f2acac8abf44f49de60b7a244068e7d54df11f8684d65053f7c601fd`.
- Presentation: `sha256:3920d45cb70638480a53682b2c6340e2da71efa8a1f7c64e13456704f3781418`.
- Release: `sha256:5e4a2a6d52ded4ecc881e55c2fcba21cdb63914261013f526e832baed9c5be2b`.
- Publisher: `key_Md6-VdN8cidosTcTHKpghwgLLgtguUvXhdFFdc-kmLw`.

Confirmed spelling: `git+https://<host>/<repository>.git/@<full-commit>/<path>`.
The commit is lowercase full SHA-1 or SHA-256. Repository and tree-path
segments use canonical percent encoding; queries, fragments, credentials,
floating refs, empty segments and dot segments are refused. The host is
lowercase; the repository spelling ends in `.git` without a trailing slash.
The full commit's 40/64-digit length selects the fetched object format.
The expected
release id accompanies this URI separately. No URI is put inside its own
manifest or Git commit.

Resolution removes `git+` and the `/@<commit>/<path>` suffix to obtain the
HTTPS Git remote, then reads that exact commit's regular blob at that tree
path and checks the expected package/release id. Symlinks, submodules and
out-of-grammar paths are refused; the byte bound precedes parsing. A missing
or unsupported object is a refusal, never a branch/tag/latest fallback.
An installer records
the URI only after that resolution and the operator's exact release/key
trust checks. The developer pack reports content ids and its output file;
a URI can name that file after it is committed. Request `739aac5e` received
full planner disposition `866c7ae716eb22ec472e3f4ea3006817ea1da602`, read in
full and ratified by `f0f35bf76e8dbf76553868118127a5c30d4e3131`. Install's
future CLI takes the URI and expected release id as separate arguments,
such as `--release`; its URI already contains `@`. The applications note's
earlier command sketch is left unchanged until the install half lands, as
directed. This confirms the format; a resolver and published release remain
due. The retained pack example remains a public TEST/static-page fixture.

## Local native runner checkpoint

The next local checkpoint supplies `LocalApplicationScope` for the forthcoming
scenario/dev commands. It uses the existing native `Scope` commit code and
`SqliteStore` over Node's in-memory SQLite. A narrow `scope/runtime` entry
exports these pieces without importing the Cloudflare object class. Native
judge, fold, rule, timer, identity and replay implementations are unchanged.
The CLI's existing workspace scope dependency moves from development to
runtime in its manifest and matching lock entry. No resolved version changes,
download, install or tool probe is involved.

A root is created by a retained signed `found` intent and the real native
genesis judge. It uses the local root-directory convention already used by
the application declaration tests, not a hosted install or a manufactured
child genesis/confirmation. Submit and advance call the native commit/alarm
methods; replay calls the native verifier against actual stored journal and
retained bytes. The source bounds each page's row count and reports its bytes.
The SQL adapter runs the owned schema statements and transactions; the whole
database is private to this development session and is discarded on close.

Actors and action lists are explicit, owned copies. This is scripted local
authority: null freshness proofs and synthetic membership/issued references
are labelled stand-ins, never native enrollment or production authorization.
Replay uses the verifier's existing `as-recorded` mode and lists authority
among its trusts. No app role or all-actions default widens the supplied list.
Production port defaults keep transport absent and outside effects closed.
Lending sends remain journalled without a destination/Git publication; foreign
dependencies unavailable to this single-scope adapter are not fabricated.
This is not Durable Object eviction/restart, hosted durability, cross-scope
delivery, device ownership or browser evidence. The runner foundation at
`051a57701` exposed no check/dev command. The scenario layer below now
connects it to `check`; dev remains due.

The initial three focused native/SQLite cases pass (`e41123`), and the final
four-case file passes with a real due timer (`a58d70`). It covers Counter
founding, initialization, joining, exact retries without a new entry, refusal
after caller-owned actions change, Lending restricted-rule refusal and queued
send, native replay, altered-history refusal, missing retained definitions,
closed scope access and deadline behavior. The first clock fixture was refused
as unsupported (`df3bfc`); the explicit native validation diagnostic (`08a49f`)
identified the existing prohibition on a timed genesis item. The corrected
fixture opens an untimed root and schedules a timed item through an ordinary
judged act. No native rule was relaxed.

Actor-copy (`73271a`/`52165a`) and due-turn (`8769bb`/`0d3b78`) controls both
exit 0, each with four normal passes and one intended fault assertion.
Removing the copy lets a caller widen the held grant; skipping the alarm turn
leaves a due item waiting. Sources are restored. Scope production typecheck
passes (`c3e8fc`); final CLI test/production-source typecheck passes (`f22cf5`).
Evidence logs use `/tmp/artroom-m1-local-`.

The private Node adapter has been exercised on Node 26.12.0. Node's
[SQLite module history](https://nodejs.org/api/sqlite.html) puts unflagged
availability at 22.13.0 (23.4.0 in the 23 series); it also distinguishes the
older Buffer bindings from general typed-array bindings added in 22.14.0.
The adapter uses Buffer for a binary binding. The scenario layer below loads
it lazily with a supported-runtime check; dev must follow the same rule so
existing CLI commands retain their Node 22.0.0 launcher contract.
No older-Node local runtime witness is claimed here.
The four local native cases still pass after the Buffer binding adjustment
(`715d63`, exit 0).

## Declarative scenarios and check

`dap check [directory]` now prepares the same package in memory with an
internal public TEST publisher, validates its native definitions, prints
semantic/presentation pins, runs every listed scenario, and requires native
replay in replay mode to be consistent. It prints each requested capability
and its exact canonical declared bounds. This audit lists requests; native
host admission and screen-code review are separate. No TEST release id is
presented as a publishable release. Check writes no package and does not read
the CLI config directory, operator key or existing room setup.

The source config may list at most 32 distinct `scenarios` paths. Each is
captured with the existing regular-file/path checks and 64 KiB pre-read bound.
Source metadata now also checks the leaf with `lstat` before opening; the
descriptor's no-follow/type/size/metadata checks remain. Scenario paths are
developer inputs, outside package identity: adding one leaves all three ids
unchanged, and `pack` does not require developer test files to be present.
Check refuses an absent or empty scenario list, missing files or an invalid
list rather than reporting an empty test run as success.

Scenario version 1 has `name`, native `time`, explicit `actors`, `founding`
and 1–256 `steps`. Each of 1–16 actors has a public TEST seed (64 lowercase
hex digits), member handle and at most 64 distinct action names. No role or
wildcard supplies actions. Seeds are never printed and held copies are cleared.
The parsed JSON is owned before asynchronous signing/imports. The local scope
receives owned actor/action copies as well. These are the scripted grants and
unjudged references described above, not enrollment or authority freshness.

Steps are `act` with an exact accepted/refused expectation, optional `save`,
`retry` of those retained signed bytes, monotonic `advance`, or `assert` of
an item's state, revision or named value/party/ref slots. Empty assertions,
unknown fields and unrecognized step types fail. Fields can explicitly name
`$member`, existing `$scope: self`, `$revision` of a local item, or labelled
`$reference` membership/destination stand-ins. Resolved values have a finite
10,000-node/32-depth allowance per step. No scenario JavaScript or application
server module is loaded. Scenario/step errors identify the failing position.

Only the local scenario path dynamically imports the Node SQLite adapter,
after the unflagged-runtime check. Ordinary pack/room commands still have no
SQLite import. Tests exercise the version boundary predicate; an actual
Node 22.0.0 run of these new commands is not yet evidence. Current actual-bin
and runtime witnesses use Node 26.12.0.

The final combined scenario/pack/actual-bin run passes 11 cases in two files
(`746d31`/`0f87fd`, exit 0). After the explicit leaf metadata check, its seven
filesystem/pack/check cases still pass (`7a76fe`/`6cb716`, exit 0). The initial
scenario-only run (`8a25af`) passes three cases and the first combined run
(`a2c3ef`/`b59bfc`) passes ten; the added input-ownership case makes four
scenario cases and eleven combined. The actual `dap check` runs from
an external directory even with custody variables that would make configDir
fail; a real Lending scenario donates, retries, asserts and refuses an
unauthorized cancellation, then replays. The source fixtures are real native
Counter/Lending declarations with labelled static fixture pages, not converted
production screens. Requested extra capability bounds are printed without
executing an external effect.

Three one-line controls distinguish and restore source: final replay-mode/
consistency guard (`601d8d`/`cb3d0f`), owned expectations before an await
(`2ce061`/`cba2e7`), and exact native answer comparison (`309d99`/`ac4c11`).
Each exits 0 with four normal passes and one intended assertion failure.
The verifier-report fault test is explicitly scripted (mismatch or integrity
mode); the underlying native replay also has the genuine altered-byte and
missing-retained-input witnesses above. CLI test/source typecheck passes
(`baa9ca`). Evidence uses `/tmp/artroom-m1-check-` and
`/tmp/artroom-m1-scenario-`. No full M1 gate has run.

## Accepted facts and non-native scenario-owner records

The standard scenario layer now also resolves `$fact` only from an actual
accepted receipt saved by `act` or `retry`. Missing names, refused requests
and arbitrary fact objects cannot supply one. This lets a recorded summary
be cited by a later native act without a fabricated head or receipt.

An explicit `owner-record` step holds a labelled non-native scenario-owner
outcome (`confirmed`, `refused` or `unknown`) beside such an accepted request.
It changes no native state, writes no entry, executes no effect and is outside
the native replay claim. Each command fact gets at most one scenario record.
The CLI prints that boundary and count separately. This is the G0 boundary
settled by `e72e4e83`; it supplies no G5a native operation, reservation,
freshness proof or owner signature. A declaration can record intent while the
scenario owner supplies fictional outcomes; neither is evidence of a device.

Thirteen focused scenario/pack/bin cases pass (`fa1bf1`/`2f4992`, exit 0),
with test/source typecheck (`a64ad1`). The fact test uses a clearly labelled
Counter fixture augmented by a typed citation comment: a tap of the real
native submit sees exactly the accepted initialize receipt in that comment,
and the saved citation fact in the owner record. Native replay stays at
sequence 3 after the side record and retry. The actual Lending check bin now
has five scenario steps and one explicitly non-native record; replay remains
through sequence 1. These are additional local format witnesses, not changes
to the production Counter/Lending declarations or completed package conversion.

Two focused controls restore source and distinguish one intended assertion
each, with six normal scenario cases: falling back to the current native head
for a missing accepted receipt (`d8b7be`/`eecd64`), and admitting a duplicate
owner outcome (see `/tmp/artroom-m1-scenario-owner-duplicate-control-20261018.log`).
Both exit 0. No repeated full gate or publication accompanied this bridge.

## Retaining a signature before submission

A `sign` step now requires `save` and accepts the same bounded actor,
kind, local item, fields and expected revisions as `act`. It signs and
retains the request without submitting it, admitting it or creating a fact.
A later `retry` submits exactly those original signed bytes. It preserves
their expected revisions, idempotency key and expiry; it does not resolve
revisions again or renew a signature. The ordinary SDK's five-minute
lifetime remains unchanged. This is needed for G0's authorization signed
before a hold, submitted after the alert revision changes.

The native Counter/SQLite case signs reset, checks that no reset occurred,
then submits a separate reset before the saved request. The latter refuses
with the native revision-moved reason and writes no new entry. A second
request submitted after its original expiry refuses expired. Both actual
histories replay consistently. Unknown/duplicate save names and extra step
fields refuse; an unsubmitted signature cannot supply an accepted fact or
scenario-owner record.

The seven scenario cases pass (`0862e1`/`84e3a1`). Production/test
typechecks pass (`e6890e`, `34b659`). The initial invocation
`2e03d2` found no tests because it used the package config from the wrong
root; it is not a test pass.

Two targeted controls distinguish and restore source, each with seven normal
passes and one intended assertion failure: admitting a phantom accepted fact
for a sign-only step (`334b4a`/`f1c393`), and re-signing a transition
at retry time (`d02d35`/`724b43`). The latter fails on the changed
notAfter value, before a renewed request can be mistaken for retained bytes.
An earlier broader retry fault (`ede906`/`ad2ef3`) also broke an
initialize retry before reaching the retained transition. Although the
control tool exited 0, that failure is not counted as the deferred-signature
witness; the narrowed control above reaches the intended assertion.
Logs use `/tmp/artroom-m1-deferred-sign-` and
`/tmp/artroom-m1-control-deferred-`. No native signature, lifetime,
idempotency, revision or replay behavior changed.

## Selecting a local definition within the package

A scenario may now name an explicit `definition` digest already inside
the package's verified definition closure. Omission selects the package
entry. The local runner rechecks the signed package bytes and refuses a
selection outside that closure before constructing its SQLite scope.
It uses the selected definition's native digest in the actual root seed and
genesis. The result and CLI output name that local root definition.

This permits G0's one package to retain site as its entry while checking a
room's own scenario. Each run is still one scripted local directory root.
It does not deliver child requests, create a native multi-scope host,
replace M2a, or make the separately judged G0 multi-scope fixture a hosted
application. The definition selection is developer scenario data and changes
no package identity.

Nineteen focused scenario/local/pack/bin cases pass
(`dee125`/`0c279c`, exit 0); test/source typecheck passes
(`420566`). The selected-root case packages the real Counter beneath a
small explicitly labelled parent fixture and runs Counter's native scenario
against its selected digest. Omitting that selection cannot accidentally
run Counter beneath the parent; null, malformed, floating and absent digests
are refused. A one-line control that ignores the selected root distinguishes
the intended assertion and restores source (`5b52e9`/`43c2fb`; see
`/tmp/artroom-m1-control-selected-root-20261018.log` for the assertion).
No native seed, closure, genesis, judge or replay
implementation changed. No gate or publication ran.

## Explicit TEST principals

Scenario actors may name another explicitly listed TEST actor as their
`principal`. Omission means no principal. The scenario runner resolves the
named member into its scripted grant; it adds no actions from the principal
and does not infer a role or membership delegation. Unknown names, null and
malformed labels refuse. This lets the Grow scenario name each simulated
agent's controller while preserving the stated fixture-authority boundary.

The existing native Counter case now reads its accepted join entry through
the actual SQLite history source and checks the recorded grant: subject is
the agent, principal is the named controller, and actions remain only
counting.join. An outsider with the same principal and no actions is still
refused. Replay remains consistent with authority explicitly trusted.

The first control attempt (`d4c4a2`/`44c100`, exit 2) had no passing
baseline. Its diagnostic run (`69f020`/`df63ff`, exit 1) exposed a
mistaken fixture expectation: Counter's participant agent party has
`author: false`, so its item attribution remains empty. The corrected
witness reads the native recorded grant instead of changing that application
or native attribution behavior. Removing the principal now distinguishes
the intended grant assertion (`79cd96`/`4e8dd0`; see
`/tmp/artroom-m1-control-scenario-principal-fixed-20261018.log`).
The normal run has eight passes and the fault one intended assertion failure;
source is restored. No native authority or attribution implementation changed.

## Shared request custody

The client now exports Lending's existing request-custody protocol as
`advanceKeptRequest`, `validKeptRequest`, `keptEnvelopeKey` and their
request/store/port types. Lending's custody file keeps its local identity,
allowed act names and compatibility exports, and delegates to that shared
implementation. The moved phase/validation/advance code is unchanged apart
from its application-specific comment. It signs nothing, clears nothing
and admits no grants, detached text or presented facts in a kept envelope.

The caller still supplies its private slot, lock, current-context check and
trusted submit/receipt/settlement ports. The protocol commits inflight before
an authorized send, checks an accepted receipt against the scope's recorded
request, and preserves the original envelope across unknown outcomes.
Ordinary recovery is read-only. Explicit Continue can resend only the kept
envelope. Scope, key and allowed kinds remain bound by the validator.
This extraction does not supply browser storage, joining or transport
admission, and does not replace Counter's separate stricter attempt journal.
Those migrations remain due.

The existing five Lending custody cases and one publication case pass
(`702ef7`, exit 0). Client and Lending browser source typechecks pass
(`b723d3`, `49d0c1`). They use actual signatures and explicitly scripted
storage/submit/record ports, not native HTTP, browser persistence or enrollment.
Three hand controls restore source and distinguish the required behavior:
skipping the committed inflight mark (`a46587`/`282222`, two intended
assertions), recovery that posts without Continue (`77d1f9`/`7fc98c`,
one), and accepting another signing key (`01e409`/`f6edf6`, one).
Each has five normal passes and exits 0. Logs use
`/tmp/artroom-m1-shared-custody-` and
`/tmp/artroom-m1-control-shared-custody-`.
No package, lockfile or native runtime changed; no install or gate ran.
Generated application assets will be rebuilt with the complete package
conversion and its rendered browser evidence.

## Shared device generation and private browser slots

The client now generates a native non-extractable Ed25519 device pair through
`generateBrowserDeviceKey`, returning its public name and opaque native key
objects. It exports only the raw public key while deriving that name, then
admits the private key through the existing stored-key signer. It stores,
enrolls and sends nothing. Lending delegates generation to it while keeping
its concrete DOM types and its existing identity/key/storage checks.

`browserPrivateSlots` supplies bounded host-owned database, store and lock
names, IndexedDB transaction commits and Web Locks serialization. It owns a
save's structured-cloneable value before waiting for the database to open.
Write failures abort the transaction. Callers still validate identities and
values, choose namespaces and hold the lock around read/compare/write
sequences. Lending preserves its existing database/store/lock names and slot
keys, so existing records need no migration. Its remembered device, kept join
and act stores now delegate to these shared primitives. Session tokens are
not added to storage.

These are trusted-host primitives, not a presentation isolation boundary.
Counter's separate epoch store and stricter attempt journal remain unchanged.
The new SDK module declares only the narrow browser operations it uses, so
the client still requires no DOM or Workers type library. Public consumers
see opaque native keys; Lending adapts these to its existing browser types.
The initial opaque-key type alias broke one browser witness's DOM metadata
read (`c2ed1c`, exit 1). Keeping the app's concrete adapter fixes the
typecheck without weakening native key admission.

Two actual Node WebCrypto cases pass (`1b830f`, then
`a43481`, exit 0): generated/restored keys sign original bytes, the public
binding verifies, private export refuses, and forged/extractable/mismatched
stored keys refuse. A generation control changing non-extractable to
extractable distinguishes the intended assertion and restores source
(`d95693`, exit 0). Client source/test and Lending browser typechecks pass
(`791a44`, `781e96`, `a887c4`, `6a77b5`, `e546ed`,
`125961`). No dependency or lockfile changed and no package was installed.

### Native browser witness

The flow is: mount a device, lose a submit reply, reload, read/check the
kept request, serialize two tabs, then Continue the exact original request.
This uses the existing Lending storage witness through the real current
source, plus a direct caller-mutation check on the shared slots.

The Browser plugin and its browser skill are absent. Following the frontend
testing skill, the run uses cached, pinned Playwright 1.63.0 and Chromium
153.0.8010.12 in a fresh temporary profile, against
`http://127.0.0.1:5197/`. The scratch fixture and screenshots are outside
the repository. The first sandboxed server bind failed EPERM (`c0ed74`);
the sandboxed browser launch failed macOS bootstrap (`d0928d`). The
local-only server and temporary test browser then ran with the required
execution permission. Neither failure is a browser pass.

The first actual browser run passes (`2c26a3`/`dd2391`). A final
normal run also passes (`d6ce77`, exit 0), with matching output under
`/tmp/artroom-m1-browser-slots-20261018/normal/`:

| Check | Result |
|---|---|
| Intended URL/title and meaningful content | Pass |
| Framework overlay and relevant console errors | None |
| Desktop 960 by 720 and mobile 390 by 844 screenshots | Inspected |
| Actual IndexedDB key save/reload | Same public key; private key non-extractable |
| Actual retained-envelope reload | Same hash and valid signature |
| Check after reload | Unknown, zero submits |
| Two tabs using the same Web Lock | Second waits until release |
| Explicit Continue | One submit of the original envelope |
| Caller mutation while save opens the database | Stored original value |

Transport, lost-reply and recorded-receipt answers are explicitly scripted.
This proves the browser primitives and retained-envelope flow, not native
HTTP acceptance, enrollment, a live room or production screens.

A targeted browser control removes the owned input copy. The native browser
assertion then sees changed instead of original (`61c558`/`021a11`,
control exit 0), and the server/browser close before the source is restored.
The original baseline was the preceding successful browser run. The scratch
harness initially reused screenshot paths between normal and control runs;
the final normal run above puts its matching screenshots/result hashes in a
separate directory. Earlier overwritten screenshots are not its evidence.
The normal images show the lost-reply state and the saved-original value;
they are fixture UI, not proposed application design.

Harness, result, control log and PNGs are under
`/tmp/artroom-m1-browser-slots-20261018/`; terminal logs use
`/tmp/artroom-m1-browser-slots-`. Final server handle 64409 was stopped
and followed to terminal exit 143 (`ada233`); no dev server or browser
remains live. No gate, publication, install or deployment ran.

## Remaining developer work

Shared browser joining and Counter storage/custody migration; browser
bundling; new/dev; Counter/Lending package
conversion; and the matching browser evidence remain due. Generated
application asset modules have not been rebuilt for this source checkpoint;
the complete package conversion will replace their host composition.
No full gate has run for M1. It runs once at the completed submitted head,
followed by exact-head independent review. Nothing here is deployed,
published, installed into a room, or accepted as the M1 milestone.
