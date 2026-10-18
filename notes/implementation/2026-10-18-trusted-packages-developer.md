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

## Remaining developer work

Shared browser joining, storage and request custody; browser bundling;
new/dev; Counter/Lending package
conversion; and the matching browser evidence remain due. Generated
application asset modules have not been rebuilt for this source checkpoint;
the complete package conversion will replace their host composition.
No full gate has run for M1. It runs once at the completed submitted head,
followed by exact-head independent review. Nothing here is deployed,
published, installed into a room, or accepted as the M1 milestone.
