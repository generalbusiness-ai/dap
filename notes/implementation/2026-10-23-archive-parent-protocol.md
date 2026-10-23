# Artifacts parent-object reads

The hosted archive retries fail before they fetch the first parent commit.
The reader requires `shallow` and `filter` in the older Git advertisement,
but the server does not advertise both. This candidate adds an explicit
Git protocol v2 path for Artifacts archive parent reads.

Request `66010f21f899a4df8ac7530e18539f05887254cd` and promise
`645d787bbd23c281e9cf92c82f8236b0a07772c7` track the work. The candidate starts
from deployed diagnostic commit `f99ccc239aa305d442e1d0e354fce86ac37d598f`.
The implementation draft is complete and includes accepted Main
`aa016e0e1e6d71a8d466f82e8aff7e9f22ca0250`. Local validation is pending. Hosted v2 filtering
support and a completed archive pass remain unverified.

## The observed failure

Planner observation `122cb2eb086d659fdb2fa49ffd64bb85b6bdd63b` records 35
diagnostics from Worker version `520aa54f` across three of the five objects.
All 35 report `plan`, a loaded `confirmed` row, and `retry` with `unavailable`.
The first parent read requests a commit of at most 1,024 bytes. Its last
phase is `advertisement-response`, with refusal `isolated-capabilities`.
The other two objects still ran the previous Worker version in that sample.

The current reader sends no `Git-Protocol` header and parses only the older
advertisement. Its isolated mode refuses before POST when either required
feature is absent. The diagnostic identifies that refusal, but does not say
which feature is absent or list the server's capabilities.

[Cloudflare's Git protocol documentation](https://developers.cloudflare.com/artifacts/api/git-protocol/)
states that Artifacts supports v2 fetch and omits `filter` from its older
protocol. It does not explicitly establish support for the exact v2
`shallow` and `filter tree:0` exchange required here. The planner's bounded
capability probe remains necessary. An ordinary successful clone does not
prove support for isolated object reads. The archive's v2 journal layout is
separate from the Git wire protocol version.

## The provider selects the protocol

The candidate gives `SmartHttpSource` an opt-in protocol within
`isolateObjects`. Artifacts selects that option through its trusted archive
provider construction. GitHub and existing custom providers keep the default
reader. No request field, repository name, or public configuration selects
the option. Ref discovery, closure reads, and writes retain their existing
protocol, including when an isolated source exposes `ref` or `refs`.

An uncached v2 object read makes one capability GET and one fetch POST. Both
carry `Git-Protocol: version=2`. The reader requires SHA-1 and advertised
`shallow` and `filter` features. The POST asks for the exact object ID with
`deepen 1`, `filter tree:0`, `no-progress`, and `done`.
[Git's v2 specification](https://git-scm.com/docs/gitprotocol-v2) permits
wants that were not advertised. This avoids a separate `ls-refs` request.
The server still authorizes and answers the request. A denial remains a
refusal and says nothing about object absence.

The response contains an optional `shallow-info` section followed by a
`packfile` section. A shallow boundary must name the requested object, and
that object must be a commit. The reader accepts an empty shallow section.
It compacts channel-1 pack bytes within its owned response buffer, ignores
bounded channel-2 progress, and refuses channel-3 errors without exposing
their text. The HTTP body must end at its final flush. Extra sections,
acknowledgments after `done`, malformed packets, and trailing bytes refuse.

The verified pack must contain exactly one non-delta object of the requested
type and ID. The existing inflated-size bound, hash verification, bounded
cache, and returned-copy allowance still apply. A server that ignores the
filter cannot make the reader accept a closure. There is no fallback or
internal retry.

## The original reservation still applies

Each parent read reserves two Git calls before I/O, 1,024 units of metadata,
and input work of 32 times its wire allowance. The wire allowance remains
the requested object maximum plus 8 KiB, capped by the transport allowance.
The isolated source retains its existing working and returned-payload bounds.

The capability parser retains fixed flags rather than a reference list or
unknown capability values. Packet counts and wire bytes remain bounded.
Pack compaction copies each data byte at most once within the owned buffer.
These are source bounds on admitted work, not measurements of peak memory,
CPU instructions, or server work.

One original deadline covers advertisement, fetch, framing, and decoding.
Expiry abandons the source. A late response cannot start another operation,
populate its cache, or change the frozen diagnostic. The existing row state,
retry schedule, pass budget, and credential checks remain unchanged.

## Resumption and validation status

The sampled objects already retry every few seconds. The driver preserves a
retry wake when parent reading fails. If the new protocol resolves that
failure, a later wake can continue planning without an operator row reset.
Successful parent reading alone does not establish that planning fits its
budget, reaches Mark, or publishes the legacy anchors.

The maintained D1 parser passed once for the two changed mapped owners.
Its `archive-host.ts` output is
`f16f3972e28d1f2bbdc1e98f60f21bc38be82b2d3a3b851e552e6391eb94d0cd`.
Its `artifacts-host.ts` output is
`80aac5184db427e83c369ab4d0222276fd7e3fe9792edcacc6d2c3ba6e9e8f2a`.
Only those two existing map values were updated. Assertion
`2c528abfc1c50eee961a78ad628e6cc30c112b39` records the natural zero exit,
unchanged inputs, and actual outputs. Evidence is in
`/private/tmp/artroom-archive-parent-protocol-parser-20261023-v1`.
The parser child took 0.482 seconds elapsed. The enclosing guarded operation
took 3.066 seconds. These overlapping times are not added.

The first owning attempt passed the Git test compiler, both Scope compilers,
and all three security-inventory cases. The wrapper then stopped with exit 1
because it incorrectly expected four inventory cases. The Git and Scope test
files did not run. Assertion `f0b5a0064cece1b996b0855b6f277bf4c0e8c9f6`
retains that outcome and the original evidence at
`/private/tmp/artroom-archive-parent-protocol-owning-20261023-v1`.
The guarded attempt took 8.060 seconds elapsed and 12.132 seconds of inclusive
CPU. Healthy parser and inventory results will be carried forward.

Checker finding `9ef50640d5c72c7069cce83a85757609032a80a6` identified an
inherited deadline gap: synchronous expiry could throw before the timer marked
the source abandoned. Cleanup could then clear that timer and make the source
reusable while body cancellation remained pending. The correction makes every detected deadline terminal before cleanup.
The shared body reader rethrows its deadline refusal without waiting for
cancellation. The strengthened response-time and body-time clock witnesses
require the same source to refuse later object and reference reads without
more I/O while cancellation is pending. Local execution is still pending.

The candidate integrates accepted Main before the remaining checks. Its Git
and Scope protocol files have no upstream overlap. The security inventory keeps
Main's accepted owners and fourth case, with only the two measured archive
seals changed. The lock, workspace dependencies, and Vitest configurations are
unchanged. Accepted native fixture wiring includes the scope index, so the
remaining Scope test and final gate use that integrated environment. The prior
compiler results describe their original source. The final gate recompiles the
integrated head.

The affected Git compiler, unrun owning tests, final gate, and exact-head review
remain pending.
The planned Git witness uses real local `git http-backend` with filtering
enabled and without the older non-tip-want permission. It must read an old
commit, a tree, and a blob in two requests each while excluding unrelated
history and a large sibling. Provider tests use explicit identity, credential,
and HTTP stand-ins. They must preserve the existing budget and late-result
checks while showing the different provider protocol choices.

Dependencies were adopted by a private APFS copy from the retained diagnostic
checkout. Assertion `265163c59a9de061ccba02a6b39823978a108e3b` records exact
bytes, private file identities, target-owned links, and unchanged source
checkouts. The existing partial npm metadata, compatibility bytes, and lock
stamp were preserved. This was dependency adoption, not a new installation.

The planner owns deployment and the later hosted observations. The remaining
witness must cover successful parent reads, a completed pass through Mark,
and the resulting archive and legacy-anchor state.
