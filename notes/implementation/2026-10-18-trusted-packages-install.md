# M1 host and install work

Work in progress under Source child `873c84041d9259870f42ace3dc8235a59e9c3d17`
and promise `d299657b6432ac7182563dedf27166c9c241e128`, within M1 `eca1c7ee`.
Planner decisions `c643756e` and `866c7ae7` govern the implementation.
The developer half stays frozen at `6aa1e6f0` for its independent review.
This worktree has a separate dependency view and does not change that head.

## Completed preparation

`packages/client/src/application-uri.ts` parses the confirmed immutable
release address without fetching it or granting trust. A full lowercase
40- or 64-character commit selects SHA-1 or SHA-256. The remote is HTTPS,
with a lowercase canonical host and canonically encoded repository/path
segments. Credentials, ports, query, fragment, floating refs, empty/dot
segments, encoded separators and ambiguous UTF-8 spellings refuse. The parsed
value and path array are frozen. Its maximum address length is 4,096
characters and its path maximum is 64 components.

Both focused URI cases pass (`fc3cf9` / session `92094` to `5d0761`, exit 0),
as do client source/test typechecks. The initial source typecheck found a
RegExp tuple assertion and unavailable broad URL types. Indexed captures
and a local declaration of the narrow standard Web URL surface correct
those errors. No DOM dependency or polyfill was added. This checkpoint is
`9db3c51a6`.

`packages/git/src/application-blob.ts` reads a commit, only the trees on the
selected path, and the final regular blob. Each object is checked for type,
size and its exact Git hash in the selected format. A symlink or gitlink
at any selected component refuses; no reference or ancestry lookup exists
in this interface. Payload size is checked before copying or parsing.
The transport must bound its own wire, inflation and reads.

Stated read allowances are 64 KiB per commit, 1 MiB per tree, 8 MiB total
tree bytes, 64 path components and 16 MiB for the blob. A caller may lower
the blob allowance. These are application-reader limits, not native platform
quotas or measured heap bounds.

Two focused cases pass against actual local Git SHA-1 and SHA-256 repositories
(`6ad04b` / session `72121` to `7b7941`, exit 0). They verify exact bytes,
refusal of aliases/submodules, a size refusal without a blob payload read,
absence without fallback, and type/size/hash failures. Git source/test
typechecks pass. This is an object-reader witness with no remote/provider
transport. The checkpoint is `5a1d599ac`.

`packages/scope/src/applications/admission.ts` checks an exact operator-listed
release and publisher, verifies the signed package and validates every native
definition under the host's bounds. Missing trust admits nothing; invalid,
extra-field, oversized, duplicate or ambiguous trust settings refuse as a
whole. Trust alone does not bypass signatures or native validation.
The current host accepts restricted@1 and no application-declared capability
code. Existing native sends to the room's destination stay ordinary factory
and delivery work.

Both focused admission cases pass in workerd (`062601` / session `83963`
to `c9a5c7`, exit 0), using the real current Counter and Lending declarations
and public TEST publisher keys. They distinguish wrong release/key, modified
bytes, unsupported host requirements and an invalid native declaration.
Source/test typechecks pass. Initial test typechecks found an incorrect
fixture import, a possibly absent byte and immutable profile metadata;
correct imports, an explicit byte read and a fresh fixture object fix them.
No scope, grant, store or native installation is created by these checks.

The private dependency view is a filesystem COW clone, with 13 first-party
links verified inside this worktree and 106 installed versions matching the
unchanged lock. No package was installed. The first audit tried an unnecessary
rewrite: the copied relative links already resolved correctly. The corrected
read-only audit accepts and verifies those targets. Only cloned caches were
removed; the frozen developer view stayed untouched.

## Private content checkpoint

`packages/scope/src/applications/content.ts` holds admitted canonical package
bytes in private R2, keyed by exact release id. It exposes no public route,
listing, delete or arbitrary-key method. Trust, signature and native host
checks precede any write. A conditional create refuses replacement; both a
successful write and a competing write require exact checked readback.
A lost successful write reply stays unknown; a later get or retry finds the
same bytes without another write. Corrupt stored bytes refuse without repair.
Metadata and streamed payload allowances precede package parsing.

Four focused cases pass (`6eb8e9` / session `99813` to `11236e`, exit 0),
with an actual local R2 binding for create races, independent-store readback,
unknown-reply recovery, corruption and refusal without a grant. The race
schedules two actual misses before conditional puts; exactly one write wins.
A separate labelled metadata/body stand-in proves an oversized body is
cancelled before reading. No provider bucket is used. Scope source/test
typechecks pass; the only new binding so far is in the test configuration.

R2 replaces the initial SQLite store direction because the package's 16 MiB
wire allowance exceeds the [documented 2 MB SQL row limit](https://developers.cloudflare.com/durable-objects/platform/limits/).
[The R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
supports conditional puts and returns null on a failed condition. This
implementation choice does not change native scope persistence. A production
private bucket/binding and generic route remain part of the reviewed install
head before planner provisioning/deployment.

## Resolution orchestration checkpoint

`applications/resolve.ts` parses the immutable address, refuses an unlisted
release before opening a transport, walks the exact Git blob, checks the
signed release/native support, closes the source and then stores admitted
bytes. A cached package never substitutes for resolving the requested URI.
The transport receives the exact parsed format, commit and path. There is
no branch/tag fallback. Transport and close failures are reported without
raw transport details.

Both focused cases pass (`4ac325` / session `44207` to `b5d242`, exit 0),
with real signatures/native validation and local R2. Git objects and their
transport are explicitly in memory; the real Git-object-store witnesses
remain separate. The cases distinguish a changed URI despite an existing
cache entry, wrong file bytes, no network for unlisted/malformed requests,
source closing and no store write on failure. This adds no actual host Git
transport or claim about either format's network support.

Scope now declares its existing client workspace dependency at runtime,
where host admission/resolution uses it. The lock changes only that one
workspace record; no package key, version, resolution or integrity changes.
All 13 local workspace links and 106 installed versions match. Audit
`/tmp/artroom-m1-install-client-runtime-dependency-20261018.json` precedes
refreshing this private view's ignored lock stamp. The lock SHA-256 is
`bf2d909d256e00845edf6fdaad6eb67a5f54305aac42bb8baa9c927567f23295`.
No package was installed and the developer view remains unchanged.

## Host fetch decision pending

Request `9640b02a` asks the planner to settle one concrete transport gap.
The existing Worker-compatible `SmartHttpSource` is explicitly SHA-1-only;
Node native Git supports both formats. The format-neutral reader above does
not add a network transport. The choice is whether M1 must add SHA-256 host
transport now or explicitly refuse that format without fetching/fallback.
A CLI upload alone would not independently establish the URI-to-commit
binding at the host; no such substitution is made.

## Remaining implementation

The host needs a private content store keyed by content id and a route bound
to room, installation and exact presentation. The private R2 store above is separate from application scope state.
Only admitted immutable bytes enter it. The production binding and route
remain part of the reviewed install head, before planner deployment.

A new immutable rules version must record one admin-signed install and its
selected default roles. Existing generic native operations and checked
messages can record host admission and each activation/grant/create step.
The host's trust decision must be retained as native evidence; a rule cannot
read an unrecorded current environment setting. Package metadata, native
definition extents and the original install intent must remain bound to
that exact release. Existing grants remain, and each selected addition is
confirmed. Unknown replies resume the original step; no second signature or
cross-scope transaction is invented. Pending, active and refused remain
visible. This is a design direction, not an implemented native operation.

Fresh ordinary room creation, generic room/browser binding, native install,
MCP use and route opening after activation remain owed. The final head removes
active Counter/Lending routes, embedded assets and application-specific
cohort selection while preserving historical catalog pins and replay.
The public command sketch is updated only when that implementation lands.

No final install gate, Source review, room installation, arbitrary-package
isolation, upgrade, npm publication, provider/archive/device acceptance or
deployment is claimed. Planner owns publication and the host deployment
under Hugh's existing authorization.
