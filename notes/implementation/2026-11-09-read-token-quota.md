# Bound member read-token reservations at native commit

Request: `908786011e5c0acae29e7b2a7c70b87b0680a948`, item 4 only.
Promise: `3a1d2b78e02d544489d3786415b9ed987c28e3af`.
Rulings: `67b1fb7faa0e17232a72e1588f834001dadbe9e1` and the late-reply answer
`6cf4c1c8eb9b849d8c851a7488f981116672a1da`.

Status: the full gate and both automatic browser workflows passed at
`e180420c11b2e07a091fc58896b77c9885167859`, tree
`99a8e2738aebcb7d10e111f7265d6c0076ad4ccc`. This follow-up changes only
this note and two evidence manifests. All source, tests, configuration,
and generated assets stay equal. Exact-head independent review and
landing remain due. Main `f9eb50bc` is an ancestor. The earlier items of
R13 stay closed. No deployment or live acceptance follows from this note.

## What changed

A Destination now refuses a fresh ninth read-token mint for one member
with `refused/limit`, after authenticating membership and before recording
an operation entry. Several keys of that member share eight slots.
Another member keeps a separate bucket, including an agent controlled by
the same person. Accepted-key retries return their existing receipt or
mismatch and reserve nothing more.

`ReadTokenQuota` owns the private SQLite reservations. Core checks the
bucket in the native commit and inserts its reservation in the accepted
entry's existing transaction. `DestinationHost` binds the operation's
nonsecret handle before the provider await, then records the actual end
or explicit refusal. `CredentialStore` retains genuine late metadata
without plaintext and supplies bounded expiry scheduling.

The public answer type, byte decoder, both exhaustive metric schemas,
and MCP refusal description recognize `limit`. The maintained recipe
bundles that decoder into both Page and OAuth scripts and all four card
resources. Page and OAuth HTML stays equal. Card metadata and styles stay equal. No Worker setting, dependency, lock, definition, genesis packet,
or historical outcome rule changes.

## Decisions and boundaries

### Use the authenticated member, inside one Destination incarnation

The already judged grant supplies the full Membership ScopeRef and member
identity. The current commit view supplies the Destination's full ScopeRef.
Neither a caller key, fixture hint, principal, controller, nor handle prefix
chooses the bucket. No bucket crosses either incarnation.

The check reads at most eight live rows through the bucket index. The
sealed callback writes the entry and reservation in the same SQLite
transaction. A deliberate SQL failure in the Native witness leaves the
entry, quota row, and first-sequence marker absent. The same request then
succeeds. A limit refusal records nothing.

A private first-sequence marker distinguishes pre-upgrade operations from
new reservations that expired. Legacy read markers without a member stay
unassigned and count in no bucket. The change infers no ownership from a
key or token prefix. Existing authenticated plaintext-expiry cleanup
keeps its own meaning.

### Count reservations through their prescribed ends

A known own reply replaces the fallback end with the provider's actual
expiry. Taking or dropping plaintext does not free its slot. An explicit
`minted:false` frees the slot at once. A lost, malformed, or thrown reply
keeps the slot until the operation's opening time plus requested hours
plus ten minutes. The quota counts reservations. It does not prove that a
provider token ended.

Destination 19 keeps its empty-fields, one-hour request. Earlier pins keep
their existing one-to-twenty-four-hour field. Admission and the adapter
share the extracted lifetime helper without changing those contracts.
An already-ended but valid own reply still records `confirmed`, as the
pinned mint-read rule requires.

A genuine reply after fallback expiry records only the pinned
`{token, ends}` metadata. The adapter stores and returns no plaintext,
reopens no reservation, and leaves the replacement's eighth place intact.
The old act's retry returns its original receipt without another slot.
The member needs a new mint to read another token. The Native witness
holds the provider reply while later requests occupy seven places,
expires the old place, accepts its replacement, and then confirms the
late metadata. The next fresh mint still refuses `limit`.

The private due index removes at most 64 reservation rows per pass,
including rows whose plaintext left custody. An unknown fallback beyond
the last representable clock remains open at every valid time and sets
no impossible alarm. It never frees early through a capped timestamp.
Quiet custody samples no other owner's clock.

### Keep the quota in the runtime and name its public refusal

The policy, tables, and native admission hook remain replaceable runtime
service code. The closed public `Answer` vocabulary must name the exact
`limit` reason that clients decode, so an application cannot supply that
part. The addition follows [kernel section 7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel),
under section 7.1's exception for filed R1–R16 security fixes. It adds no
K item, platform name, or definition. No old pinned judgment emits this
new pre-entry refusal, and no recorded entry gains a new meaning.

The existing client answer witness accepts the new refusal only with its
required judged head and still rejects an unknown reason. MCP's existing
every-refusal witness covers its new description. The closed metric maps
retain their exhaustive contract types and reject free text as before.

### Preserve source review and distinguish the Native boundary

The maintained seal producer changed the existing Core and Object named
owners and the whole Destination adapter. New whole-file seals cover
quota and custody. A later decoder repair updates the existing bytes
record seal. All route and gate assertions remain. Hugh's standing future
patch authorization covers adoption of these actual producer outputs.
The focused-closure manifest preserves all three producer outputs and
exact patches. A seal supplies no behavioral test result.

The two quota scenarios use real Native scopes, membership authority,
transactions, SQLite, restart, alarms, and the Artifacts adapter. The
provider replies and clock are explicit TEST stand-ins. The separate
SQLite scenario uses scripted opening entries and grants. It proves
private storage, incarnation, legacy, cleanup-quantum, and final-clock
behavior, without claiming Native authority or a real provider.

The meaningful control disables only Core's limit-return branch. Both
unchanged Native cases then fail their ninth-limit assertions. It keeps
authority, the quota read, and atomic insertion, and restores every tracked
byte before classification. The saved passing baseline needs no repeat.

## Evidence

The selected logic closure covers 54 cases in ten complete owners, 11
Node inventory cases, and four compiler contexts. Its last two Native
cases passed at `e360b00f`; 17 other cases passed with exact static coverage
at `89706f41`. Thirty-five complete-owner terminals at `71e6e574` need the
explicit sealed identity reconciliation: the original static ledger used
a space where Vitest inserts ` > ` between a describe title and its case.
Their actual file, project, pool, literal source titles, and complete
terminal states reconcile. The original run and its verifier remain
failed. Only changed or incomplete owners ran again.

The passing final quota owner retains the original 30-second allowance,
worker ceiling, setup, clock actions, and assertions. The rollback probe
catches its deliberate storage error inside the real object before
returning a plain RPC message and performing the same physical eviction.
The late-provider gate resolves inside its owning Destination context.
Those current witnesses pass. The earlier eviction stall's full cause
remains unproved; none of the failed units becomes a pass.

Each manifest gives the exact head, tree, command output, and immutable
external directory. Durations in those units are observations of the
specified commands or framework cases, not product latency.

| Check and source | Command | Actual result | Manifest SHA-256 |
|---|---|---|---|
| First focused, `16a3847c` | Frozen Node and compiler driver | Node 11 passed; Scope source failed `TS2322` for missing `limit`; Native unrun | [manifest](evidence/2026-11-09-r13-failed-source-compiler.manifest.json) `66de9014e2a55a08948bb02bcb4b707f6b4dc8d0da387e517ace1a6ab905413f` |
| Decoder seal, `42e9afa5` | Complete Node inventory owner | Exit 1: 10 passed, one stale decoder-seal assertion; compilers and application unrun | [manifest](evidence/2026-11-09-r13-failed-refusal-seal.manifest.json) `b69127a68443831ade7286bd9447bc9c9a14464df9024d462f912f0038b765e6` |
| Refusal description, `b938e497` | Frozen Node and compiler driver | Node 11 passed; Scope source failed `TS2741`; application unrun | [manifest](evidence/2026-11-09-r13-failed-refusal-description.manifest.json) `54b1e2fdad9337128f87c8fc76813c587e84837b3c0d163729ea3ac597964477` |
| First application body, `71e6e574` | `node scripts/focused-check.mjs <frozen-plan> <new-unit>` | Four compilers passed; body exit 1: 39 passed, one wrong unknown-basis expectation, three bail skips, eleven uncollected. Static full-title verification also failed | [manifest](evidence/2026-11-09-r13-failed-unknown-basis.manifest.json) `5e80040f24b407c5bb7ad3686b80817c32e593894e59f53eff35431175bfa929` |
| Narrow follow-up, `89706f41` | Scope test compiler and five complete Native owners | Compiler passed; body exit 1: 17 passed, quota scenario timed out, second unfinished | [manifest](evidence/2026-11-09-r13-failed-quota-timeout.manifest.json) `cf3d46eed2aba655e8e690295d89faeb959e760ec56c13591183767cfc86e9e8` |
| Phase diagnostic, `78f09695` | Same two-case quota owner with fixed nonsecret phase labels | Exit 1: repeated unchanged-budget timeout at physical eviction after rollback row checks | [manifest](evidence/2026-11-09-r13-failed-quota-phase.manifest.json) `5f12f8643d0fc9833cae97f74c6666dbb962623198803628924fe04527718e83` |
| Probe annotation, `83543042` | Scope test compiler | Exit 1: `TS2352`; no quota body ran | [manifest](evidence/2026-11-09-r13-failed-rollback-probe-type.manifest.json) `7a6e04ead77b9092c83ee15fe5738a9358ffac55b358497ae484f13c1b842e1e` |
| Typed probe, `22a4b9f4` | Compiler and complete quota owner | Compiler passed; first case passed; late gate caused cross-object I/O, ten unhandled errors, and timeout | [manifest](evidence/2026-11-09-r13-failed-late-context.manifest.json) `2dcf066791ed52abce37608a842f72a796d0051f11bd2711f1341c36d7c03348` |
| Conclusive logic closure, `e360b00f` | Saved frozen drivers and complete-owner reconciliation | Final compiler/body/driver exits 0; both Native quota cases passed. Qualified selected closure: 54 cases, ten owners, 11 Node cases, four compilers | [manifest](evidence/2026-11-09-r13-focused-closure.manifest.json) `b364fecd7228062145ce1b841135f5253b1a6ebfa9ef5c2fb944458e90a746c9` |
| Named admission control, `00239447` | Same unchanged two-case owner with only the limit-return branch disabled | Owner exit 1, verifier exit 0; both intended assertions fail, no unhandled errors, source restored | [manifest](evidence/2026-11-09-r13-admission-control.manifest.json) `28ff20678a22a4c201a1d42d1e7c3993d321d689043468b532d2da0b3dcdfb6a` |
| Page build, `d5b4d8f7` | `node apps/room/page/scripts/assets.mjs` | Build and driver exit 0; both scripts changed, both HTML entries equal, only generated module changed | [manifest](evidence/2026-11-09-r13-page-assets.manifest.json) `60345323d4c31aabfc29c21b00da6da5f71db5e54ab6789804b2029a5794875f` |
| Complete asset owner, `1fc483ce` | Page test compiler and `apps/room/page/test/assets.test.ts` | Compiler/body/driver exits 0; one complete case, exact coverage, no errors | [manifest](evidence/2026-11-09-r13-page-asset-owner.manifest.json) `25ffb1a84255d802496f86233bdf731dd570e8ad9fd98713853b94da7efbdee2` |
| Card build, `0abaa6c3` | `node packages/mcp/scripts/views.mjs` | Build and driver exit 0; four resource digests changed, metadata and styles equal | [manifest](evidence/2026-11-09-r13-card-assets.manifest.json) `27da092887f7e65f1fbabed2766f19819168aa518d7fda612a2f2dbacd1cbc57` |
| Complete card resource owner, `8512c99c` | MCP test compiler and `packages/mcp/test/view-resources.test.ts` | Compiler/body/driver exits 0; six complete cases, exact coverage, no errors | [manifest](evidence/2026-11-09-r13-card-resource-owner.manifest.json) `fb1e046758b3f28032c6e7c8622d693a9c0c17308b636f747ebf62a5855e4a31` |
| [Card CI 42602787058](https://github.com/generalbusiness-ai/dap/actions/runs/42602787058), `e180420c` | Freshness, card, Grow room, and Grow routing commands | Automatic push attempt 1 passed all required commands | [manifest](evidence/2026-11-09-r13-browser-ci.manifest.json) `52bdf1a4c86c9560d531db84363c50631c1d9c350c543d75941fd84ea6dbbfec` |
| [Page CI 42602786995](https://github.com/generalbusiness-ai/dap/actions/runs/42602786995), `e180420c` | Screenshots, recorded demo, create-room, and local-label commands | Automatic push attempt 1 passed all four commands | [manifest](evidence/2026-11-09-r13-browser-ci.manifest.json) `52bdf1a4c86c9560d531db84363c50631c1d9c350c543d75941fd84ea6dbbfec` |
| Full gate, `e180420c` | `npm run gate` | Actual `gate.exit` 0 read. Node 142, Counting 56, Plain 4,028, Native 1,115 passed; Plain one skip, Native two skips. Every stage passed; no report or unhandled errors | [manifest](evidence/2026-11-09-r13-gate.manifest.json) `4d72b28e47579c84ded8e0253cca28422c73ac5cd39bde1ad7033a841bbffadf` |

The final gate covers the complete composition, independently of the
qualified focused closure. Its actual scale selection omits all six
`scope-scale` cases: no changed path belongs to the declared scale families.
This gate adds no archive-scale attempt or pass. Watch `64552d40` stays
open. All 102 unknown observations reconcile as 34 Node file wrappers,
with no additional cases or contradictions. Every tracked byte stays
equal throughout the gate, and its owned process group closes. Eleven
process samples find no other local validation body. Samples do not
prove uninterrupted isolation. The gate's outer monotonic elapsed time
is 942.014 seconds, separate from stage and case timings.

Both browser manifests retain complete raw GitHub log ZIPs and API
receipts. The workflows upload no downloadable screenshot artifact.
Their successes establish the maintained automated browser scenes,
with their declared stand-ins, and no live room acceptance.

## Open limits and deployment

Request `90878601` owns this head's review, landing, and deployment handoff.
The planner deploys the runtime and Page bundle after review. No new
setting, Wrangler edit, recorded migration, or definition activation is
needed. The two new private tables and their indexes start empty.

Legacy tokens remain unassigned and do not count toward new buckets.
Unknown reservations may expire without proof that a provider token ended.
The tests use provider stand-ins and establish no hosted provider or live
room acceptance. This head makes no J5 acceptance claim.
