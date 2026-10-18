# M1 developer half: browser kit and package format checkpoints

Work in progress under Source child `4735dfeed42d310099ea91521ed3998b74628c20`
and promise `8fb3e144c5ccd8dcc151d673ad89d57380a7bbca`, within M1
`eca1c7ee` / `7ff6cd96`. The developer half remains open. This checkpoint
does not complete the developer half, install, kit or submitted Source.

The worktree includes reviewed Main
`fd198c724a53a1f86ee1270fe477ab1d505f4b3f` and the M1 preparation note.
Planner disposition `c643756e5acbdd70c08e8425f8c84629c61e6cc7` was read in
full and ratified by `ac3497ec57ea5367d8e40f8c5f4a0a37a666c0be`.
It confirms the developer/install split, historical Counter support, one
recorded admin install with resumable checked deliveries, exact release/key
trust and a private content store with an installation-bound route. The URI
spelling below still needs confirmation before an install entry carries it.

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

## Git release address proposal

Proposed spelling: `git+https://<host>/<repository>.git/@<full-commit>/<path>`.
The commit is lowercase full SHA-1 or SHA-256. Repository and tree-path
segments use canonical percent encoding; queries, fragments, credentials,
floating refs, empty segments and dot segments are refused. The expected
release id accompanies this URI separately. No URI is put inside its own
manifest or Git commit.

Resolution removes `git+` and the `/@<commit>/<path>` suffix to obtain the
HTTPS Git remote, then reads that exact commit's regular blob at that tree
path and checks the expected package/release id. A missing or unsupported
object is a refusal, never a branch/tag/latest fallback. An installer records
the URI only after that resolution and the operator's exact release/key
trust checks. The developer pack reports content ids and its output file;
a URI can name that file after it is committed. This is a proposal pending
planner confirmation, not an existing resolver or published release.

## Remaining developer work

Shared browser joining, storage and request custody; filesystem pack and
native declaration checks; new/dev/check; Counter/Lending package
conversion; and the matching browser evidence remain due. Generated
application asset modules have not been rebuilt for this source checkpoint;
the complete package conversion will replace their host composition.
No full gate has run for M1. It runs once at the completed submitted head,
followed by exact-head independent review. Nothing here is deployed,
published, installed into a room, or accepted as the M1 milestone.
