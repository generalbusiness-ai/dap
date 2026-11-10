# Canonical spelling for new definition sources

Request: `2ad35350`. Promise: `226d9000`. Planner rulings: `0a0286c4` and
`865f4d70`.

Status: source draft. Pin generation, focused checks, archive replay, final
builds, workflow evidence and the gate remain unrun for F.

The decision is **refuse, in canonical mode**. The kernel owns one pure
spelling helper and `validateDefinition` exposes `canonical: true`; the default
stays off. Define normalizes once and validates its output in canonical mode.
The CLI opts in while reading author-listed local definition files before
packing or signing. Its signed-package codecs do not use that source reader.

This addition requires review under [docs/kernel.md section
7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel). Canonical spelling
determines a definition's identity, which the runtime and Replay must interpret
together. A host or application must not choose another spelling algorithm. F
stages the common rule at authoring; the identifiers admission head will enable
it at new-format fold boundaries. F changes no raw `definitionDigest`, Scope
creation, application install, Rules, Directory, archive or Replay call site.

The intended identity delta is exactly eleven current definitions: Grow Room,
Grow Site, demo Room, demo Site and seven Change variants. Grow Site changes
through its embedded Room digest. The maintained lane producer must supply
every new digest; the source draft supplies none.

The exact signed demo Room `b89e7f84…` and Site `d2bc830e…` declarations remain
the only recorded canonicality exclusions. Their packet, signatures, archived
journals and published simulator constants keep their original bytes. Retained
lookup remains in `packages/scope/src/core.ts:375–396` and
`namespace.ts:170–187`; Replay checks retained raw bytes in
`packages/replay/src/verify.ts:1430–1447`. The existing Native archive witness
replays retained demo declarations in
`packages/scope/test/archive-installed.test.ts:1387–1400,1468–1475`; it does
not claim a dump of live pre-F journals.

The evidence incident reader retains the exact historical Change4 pin
`fe3cfa58…` alongside the actual generated current pin. The signed Directory
factory must name the same selected exact parent pin as its genesis seed. Scope
source assembly uses the same finite parent predicate to include the Directory
genesis for both identities. The new case obtains real Native nine-fact proofs
for both parents, then uses a labelled test-only proof transform with
nontrivial same-pin positives and coherent mixed-pin negatives. No name-only
check or independent field allowlist replaces the signed tuple.

F performs no live activation, migration or rollback. The planner applies the
new identities to recreated rooms at the identifier cutover and signs the
release then.

## Evidence pending

The three pure canonical spelling cases cover default subjects, literal and
range boundaries, inherited aliases, projected entry parts and handler source
parts, required empty `has.where`, optional filters, explicit mode on/off and
the current pinned/generated/native corpus. The Native compatibility owner adds
one case with bounded subscenes. Existing Define pin witnesses retain the exact
old twelve/five spelling differences as negative variants.

No result is claimed here. Final evidence will form one table with each actual
command, terminal exit and output digest, after the maintained producers and
booked validation bodies run.
