# Shared test fixtures

K2's MCP preparation shares the scope-service loopback transport, native
application-room claim and recipe-row parser in `test/fixtures.ts`.
The current selected checks pass 21 Node cases and five native cases,
with both owning compiler targets passing. Scope's explicit application
builders pass 28 existing cases in 11 files. Platform's common judgment
helpers pass 170 existing cases in 18 affected files. Derive shares its
native clone-and-change setup and passes 406 cases in 40 affected files.
MCP now has separate Node-safe and Worker-only entries: its two transport
files pass 21 cases and all eleven native entry consumers pass 30.
Remaining fixture consolidation and the final module layout remain ahead.

The first preparation moved the identical loopback transport out of
`http.test.ts` and `wire.test.ts`. Each caller keeps its own stand-in, server, hook,
configuration holds and close order. The factory returns the server before
the listen gate is awaited, preserving the caller's retained server during
setup. Request-body concatenation, JSON response header, streamed response
copy and loopback address stay the same. This is real Node HTTP over the
existing SCRIPTED scope service, not native scope evidence.

Request: `6578efa9e9da839bf0bbb0961ba00b243a8ea06c`.
Builder promise: `d387f722298edf53bf9d6776d9445b930900d422`.
Base: actual Main `dba3e76237250b6ce205d511691554de3d809baf`.
This is interruptible work behind G5a, S2a and G5. No frozen review view
was executed or changed. Dependencies are a private COW copy of unsealed
Main; no package was installed.

The AST-based source inventory finds all 77 outer `expect` chains in the
HTTP file and all 68 in the wire file byte-for-byte unchanged. It parses
TypeScript with the already locked Rolldown parser and executes no test or
repository source. This protects the selected assertion text; it is not a
runtime case-count or complete assertion-helper proof. Imports and setup
are the only changes to those existing test files. No case or deadline is
added or changed.

The owning MCP Node-test TypeScript project passes, and both unchanged
files pass all 21 cases at code/test checkpoint
`4558659714b49d721e07869585bd87ffcb35ff6a`, tree
`41a85b1b8225960d5f65f49721308886f61466ef`. Original process 84481 naturally
exited zero. It ran after the CLI listing's failed gate and documentation
follow-up had closed, with loopback allowed. The raw log reports 4.98
seconds wall and 6.85 summed test time; these are not a measured whole
pipeline or CPU figure. Logs: `/tmp/artroom-k2-mcp-peer-types-20261019.log`
and `/tmp/artroom-k2-mcp-peer-focused-20261019.log`.

These are real Node HTTP/stdio transports and clients over the existing
SCRIPTED scope service. They prove no native scope judgment, provider or
deployment. K2 has no final gate, Source, review, approval or landing.

## Shared MCP room and recipe builders

Matching code checkpoint `7d2779561c6472dfdf6f87f3bff5aafbeb916813`, tree
`2a4610b0dc5117d35363f3e52a2830cb702fdd43`, adds the common room-claim and
recipe builders. Counter and lending keep their explicit distinct cohorts,
activation, role actions, configuration bytes, idempotency keys, clock
advance and scenario bodies. The two identical setup assertions move
unchanged into the common helper, called once by each original room builder.
All remaining expectation expressions and complete actual test-call source
are exact. The Node files retain all 145 expectation chains. The AST
mapping is `/tmp/artroom-k2-mcp-shared-assertion-map-20261019.json`; it is
source evidence, not a runtime case-count proof.

The shared module receives Node's server constructor explicitly. It has no
runtime Node-server or Worker-implementation import. An initial type-only
import of native `Room`/`Agent` still pulled Worker-only source into the
Node compiler. That actual compiler failure is retained in
`/tmp/artroom-k2-mcp-shared-node-types-20261019.log`. Narrow structural
tool/room interfaces corrected the dependency graph; no compiler setting
or ambient type allowance was widened. Both Node-test and native-story
compiler targets now pass.

Original process 40444 naturally exited zero after two sequential focused
commands: HTTP/wire, two files and 21 cases; Counter/lending, two files and
five native cases. Their unchanged case bodies still exercise the real
Node clients/transports and native MCP/scopes respectively, with their
existing scope-service, Git host, scheduler, clock and ownership boundaries
labelled. Private pool adoption ran before the native checks, changing
`8d3d1150…` to `cd50d18a…`, without an install.

Measured outer Node command: 5.26 seconds wall and 4.62 CPU. Native command:
6.92 seconds wall and 6.96 CPU. These are separate commands, not a summed
pipeline. The working source stayed unchanged during them; the matching
code checkpoint was saved afterward. Its starting Git HEAD did not yet
contain those uncommitted edits. Exact final file hashes and this limit
are in `/tmp/artroom-k2-mcp-shared-checkpoint-20261019.json`. Raw compiler,
runtime and timing logs use `/tmp/artroom-k2-mcp-shared-*20261019*`.

## Portable Scope application inputs

Matching code checkpoint `4d0cd3d7e3559515bee396ddbf75274cde88a56c`, tree
`f30bf58d8dd3728635aa8f7311289566e5314029`, adds portable Scope builders
for content-host bindings, Worker bindings, one explicit release/publisher
trust setting and fixed TEST signers. It introduces no Worker global,
implicit trust, default cohort or shared fixture ownership.

Each binding call returns a fresh environment and retains the caller's
namespace/bucket references and exact trust string, including deliberately
invalid strings. Existing tests keep their own environment lifetime and
extra fields. Trust serialization retains release/publisher order and the
explicit publisher argument; a provided packet still uses its own manifest
publisher. Fixed seeds 61, 62, 63, 64 and 254 retain their exact keys. The
malformed/partial trust inputs remain explicit. The later follow-up below
factors the remaining three inline Worker environments.

All expectation-expression hashes in the 121 existing Scope case files
remain exact. The owning Scope compiler passes. Original process 8671
naturally exits zero: 11 existing affected files/fixture consumers, 28
cases passed. Before/after hashes match every changed draft source. The
outer command took 22.49 seconds wall and 24.43 CPU (22.85 user plus 1.58
system). These checks use their existing native/workerd, local R2,
scripted peer/clock and host boundaries; they imply no provider operation.
No case or deadline was added or changed.

A separate Node portability probe initially used strip-only TypeScript
loading and failed on an existing client parameter-property class. It
did not show a fixture/runtime bug. The existing installed esbuild0.28.1
then bundled the unchanged fixture module as Node ESM, which imports
successfully with all four exports. No tool package was installed or added.

The failed standalone probe also prevented its chained commit. A subsequent
metadata command incorrectly called the unchanged old Git head a matching
saved checkpoint. That original record is retained as failed metadata at
`/tmp/artroom-k2-scope-builders-checkpoint-20261019.json`; it is not an
accepted checkpoint claim. The corrected
`/tmp/artroom-k2-scope-builders-checkpoint-v2-20261019.json` names the actual
saved commit and verifies all original focused-run source hashes. The
working draft was checked before that matching commit was saved.

Original logs, source hashes, timing, failed/corrected probe and bundle use
`/tmp/artroom-k2-scope-builders-*20261019*`. Selected assertion inventories
use `/tmp/artroom-k2-scope-expect-*20261019*`. No final gate or complete
K2 Source is claimed.

## Shared Platform fixture judgments

Code checkpoint `eac9e7ed5f61c7482e1e9698958a1bdac6a3a0d7`, tree
`36fb62301038a15ee0c610d9103c35a427b3c124`, gives four identical `written`
helpers one home. It returns the original draft by reference and preserves
the exact refusal message. Three identical validation-result acceptors
also share one implementation. Creation's cloned-data validation retains
its distinct profile/options and data-named refusal in a separate builder.
Each labelled scenario keeps its data, grants and ownership. No eager
scenario barrel or fixture cycle is introduced by this step.

The owning compiler passes. All 28 Platform case files are byte-for-byte
unchanged. Original process 22783 naturally exits zero with 18 affected
files and 170 cases passing. Selection follows relative support imports;
no Platform test uses the package-testing alias fallback. The exact
original draft stayed unchanged during the run. Outer time was 2.61
seconds wall and 9.72 CPU (8.41 user plus 1.31 system). These are in-memory
judgment/fixture witnesses with their existing boundaries, not native
storage or provider acceptance.

The first commit check found one extra final blank line in each of three
support files and stopped before committing. A following metadata command
incorrectly called the previous Git head a matching checkpoint. That
record is retained as failed metadata at
`/tmp/artroom-k2-platform-shared-checkpoint-20261019.json`.
The exact passing draft is retained at
`/tmp/artroom-k2-platform-checked-draft-20261019/`. The only later source
differences are those three final newlines, with every non-newline byte
exact. Tests were not repeated for that formatting correction. The corrected
`/tmp/artroom-k2-platform-shared-checkpoint-v2-20261019.json` requires a
clean tree and checks the committed blob of every file before naming the
head. Source snapshots, correction map, compiler and runtime logs use
`/tmp/artroom-k2-platform-*20261019*`. No final gate or Source is claimed.

## Shared Derive draft mutation

Code checkpoint `34538a82613d91a07bf83b932e094acb6a608d5a`, tree
`84f152f978054ac087b0b0479b2628cde0d0b1f3`, shares four copies of the
native clone-and-change step. Each caller retains its existing bounds,
profiles, platform flag, validation result or accepted-definition return.
Default no-op callbacks and ignored callback return values are unchanged.
The helper uses native `structuredClone`, preserving its values and
failure behavior. It does not substitute a JSON round trip. The local
clone declaration is generic, matching that native operation.

The owning Derive compiler passes. All 42 existing Derive case files are
byte-for-byte unchanged. The original focused command naturally exits
zero with 40 affected files and 406 passing cases. Selection follows
relative support imports and resolves the package testing alias to the
main fixture module. The four draft source hashes match before and after
the run and match their saved Git blobs. Outer time was 1.58 seconds wall
and 11.87 CPU (11.00 user plus 0.87 system). These are existing in-memory
Derive witnesses, with no new native storage or provider claim.

Logs, selection, source hashes and the clean matching checkpoint use
`/tmp/artroom-k2-derive-draft-*20261019*`. No case, assertion or deadline
changed. No final K2 gate or Source is claimed.

## Remaining Scope binding and signer copies

Code checkpoint `01c9446866b6cefa2a0b8bf4c3192c79911dabed`, tree
`43e3251797f14f506ce57cbdf155062a3200d292`, replaces the last three
identical application Worker environments with the shared builder. It
also shares the fixed signer construction in the v2, owned-scope and
fact-time packet helpers and the unrelated native query signer. Seeds
67 and 5 stay exact. The existing client's `secretSigner` implementation
is the same key/sign closure those packet helpers previously built by
hand. Each caller keeps its original initialization time and fresh seed.

All 14 native cases in five affected files and all 17 Node cases in three
MCP packet-consumer files pass. Both owning compiler projects pass. The
original command naturally exits zero, with all five changed source
hashes exact before/after and equal to their saved Git blobs. Native time
was 10.53 seconds wall/12.24 CPU; Node time was 1.39 wall/2.66 CPU.
No case, deadline, native ownership or peer behavior changed.

Of the 82 expectation expressions in the install-custody file, three
change only the inline environment argument. Substituting the exact
shared builder makes every complete expression byte-exact; requests,
expected statuses and matchers are unchanged. All 14 expressions in the
query-lifetime file remain byte-exact. The assertion map explicitly
retains the original and replacement hashes; it does not claim raw text
identity for those three expressions. Other affected case files are
unchanged. These checks retain the existing native and scripted-peer
boundaries and make no provider or browser acceptance claim.

Original source, assertion map, selection, compiler/runtime logs and the
clean matching checkpoint use
`/tmp/artroom-k2-scope-final-builders-*20261019*`. This is a focused
follow-up after real source changes, not a repeated gate. Final K2 fixture-entry work, gate and Source remain ahead.

## MCP entry boundaries

Code checkpoint `4d9676e14f68dbf8e224ef0e82f782d6aa9fb347`, tree
`fecd5cf71aedef3e5a5d0d067ecf695df2b9673a`, implements the adopted two-entry
boundary. `packages/mcp/test/fixtures.ts` supplies the Node-safe loopback
peer and recipe parser. It has no Worker or test-framework runtime import.
`fixtures-native.ts` supplies the common claim builder and re-exports the
existing private room/story adapters. All eleven native consumers import
that entry; its private modules retain their ownership and lifetimes.
Counter/lending keep their explicit cohorts and activation steps.

The common claim's implementation is byte-exact except one final EOF blank
line; its two setup assertions remain exact. All 569 outer expectation
expressions in the eleven consumer files are byte-for-byte exact. Both
owning compiler projects pass. The Node compiler excludes only the new
Worker fixture entry beside its existing Worker adapters; the Worker
project checks that entry. No ambient type allowance or production
compiler option is widened.

Original process 76785 naturally exits zero. The two existing Node
transport files pass 21 cases, 5.36 seconds wall/4.61 CPU. All eleven
changed native consumers pass 30 cases, 46.74 seconds wall/50.07 CPU.
The raw native log retains the deliberately scripted complete-reset fault;
these local tests retain their existing TEST/stand-in boundaries. No case,
assertion, limit or deadline changes.

The existing pinned esbuild bundles the Node entry as standalone ESM,
which imports successfully under Node outside Vitest and exports exactly
`activityRecipe` and `loopbackScopePeer`. No tool is installed. This is a
module-loading check, not browser, provider or native admission evidence.
All fourteen changed draft hashes match before/after the focused command
and their saved Git blobs; the checkpoint is verified clean. Logs, source
snapshots, assertion inventories and checkpoint use
`/tmp/artroom-k2-mcp-entries-*20261019*`. No final K2 gate or Source yet.

## MCP deterministic signer builders

Code checkpoint `55fc061f257c6b9736fcc33a79f7a38e2bded0a9`, tree
`ef0767c4b55c5465d2ca4158f46c16b76e1d41c5`, adds `fixedSigner` and
`scenarioSigner` to the same Node-safe fixture entry. Fifteen inline
fixed-seed constructions and four identical hex-seed parses now call those
builders. Every fill byte and scenario seed stays at its original call site;
hex matching/parsing is unchanged. Random keys and raw arrays shared with
other assertions stay local. No setup ownership or cleanup moves.

All 384 outer expectation expressions in the nine changed case files are
exact. Both owning compilers pass. Original grouped process99684 reports
75 passes and two actual HTTP replacement assertions failed, in eleven
files. One expected four streams with incumbent B but observed three and
no incumbent B; the following case failed waiting for a held stream.
The unchanged whole HTTP file alone then passes all nine cases in original
process69584. No cause is established and neither result is discarded;
this is no general stability conclusion. No assertion or deadline changes.

The remaining steps, not reached after that failure, complete in original
process99615: both native recipe consumers pass five cases, 5.82 seconds
wall/7.08 CPU. Standalone bundling and Node import outside Vitest pass with
all four exported builders. The copied seed17 and repeated hex11 identities
agree. A standalone local fixture host returns HTTP200 and its expected
title in normal and declared modes, then closes both peers. This checks
Node loading and the existing host lifetime, not rendered browser behavior.
No package is installed. Source hashes stay exact through all runs and
match the clean checkpoint's Git blobs. The first grouped Node command
took11.07seconds wall/36.39CPU; separate timings are retained in the logs.

Evidence uses `/tmp/artroom-k2-mcp-signers-*20261019*`. The first redundant
assertion-inventory invocation stopped at its output-exists guard; its
existing results were not overwritten. A fresh v2 output after import
placement cleanup reconfirms all384exact expressions. No whole suite or
final gate has been repeated. K2 entry consolidation and final review
remain ahead.

## Scope fixture entries

Node entry checkpoint `f48547d7aee58737672a98044ad092cbe33f73e1`, tree
`841b0b08850871b1431924d6115b7100dde61008`, exposes the four common
input builders and five pure packet builders through test/fixtures.ts.
The private fixtures-core.ts is byte-exact to the prior portable builder
module. Private packet and native resolver adapters import that core,
preventing an eager re-export initialization cycle. Distinct packet
scenarios and defaults remain separate. Three Scope cases, three Node MCP
cases and the scripted browser host now import the supported pure entry.
All232outerexpectation expressions remain exact.

Original process81341 naturally exits zero: both owning compilers pass,
three MCP files pass17cases (1.58seconds wall/2.98CPU), three native Scope
files pass3cases (6.85/8.27). Standalone bundle/import of the Scope entry
and a standalone local MCP host both pass outside Vitest. Normal and
declared fixture modes return200/expectedtitle and close their peers.
No rendered-browser, provider or native admission conclusion follows.

Worker entry checkpoint `6d452d9abf0162d90b89e15df1c6886dd7116a1d`, tree
`996c74268e707fa238a35b0124f5d2570c5b3269`, adds a nine-line
fixtures-native.ts. It re-exports the same private support, lifetime,
resolver, HTTP peer and session builders, plus the portable entry. All98
changed Scope case files only change/coalesce their imports;2961outer
expectation expressions remain exact. Private implementation, clocks,
owners, hooks, cohorts, case-specific limits and cleanup are unchanged.
Node MCP and script consumers keep using fixtures.ts and do not load the
Worker entry or Vitest runtime.

Original process7601 naturally exits zero: owning Scope compiler passes,
main Scope project runs97changedfiles and343cases, all pass. It takes
58.62seconds wall/63.36CPU. The original labelled scripted SQLite retention
faults remain in its log. Its98thselectedfile is intentionally excluded by
that project and belongs to scope-denial. Original process24771 naturally
exits zero in that owning project: one file, one case passes. The first
selector attempt used the nonexistent project name denial and ran no test;
its failed log remains. The root configuration supplied the corrected
scope-denial name. No test or config change was needed.
Source hashes stay exact through both phases and match their clean Git
checkpoints. Evidence uses `/tmp/artroom-k2-scope-node-entry-*20261019*`
and `/tmp/artroom-k2-scope-native-entry-*20261019*`. Final gate and Source
remain ahead.

## Scope and counts

Before counts include every `.ts` file under each package's `test/`
directory, including case files and support files. They are an explicit
inventory, not a claim that every domain scenario is duplicated.

| Package | Before | Current | Change |
| --- | ---: | ---: | ---: |
| Derive | 10,312 | 10,309 | -3 |
| Platform | 5,851 | 5,841 | -10 |
| Scope | 21,402 | 21,411 | +9 |
| MCP | 7,829 | 7,852 | +23 |

The first peer extraction adds five lines overall; the portable shared
MCP module now adds 21 in total, including explicit runtime ports and
boundary comments. The Scope application builders add 29; the Platform
helpers remove 10; the Derive helper adds four. The current combined
increase is 19 after the Scope, MCP and Derive entry work. The Scope Node
entry adds four lines and the Worker entry removes27 by coalescing imports;
MCP signer sharing adds eight. No overall line reduction is claimed.
Full per-file baseline counts/hashes are in
`/tmp/artroom-k2-before-lines-20261019.json`; the selected assertion
inventories and tool are `/tmp/artroom-k2-expect-*20261019*`.

Planner decision `134333f22cd6e60b5f689add41e6f75068f1b611`, adopted by
`efba35a7075db6e440ddc2bcbfff2d07944989c0`, confirms one supported fixture
entry per package, with private domain modules. Two named entries are
allowed where needed: Node-safe builders and Worker-only lifetime helpers.
The final note must name which tests use each and why. Distinct scenario
data stays distinct; a builder used by one file only need not move.

The remaining work finishes those entries and removes the remaining
hand-built binding/peer copies named by the request. Scope's pure packet
helpers are imported by Node MCP tests; native lifetime code imports Worker
APIs and ownership hooks. Node script consumers must also avoid eager
Vitest imports. Shared builders need a private core where re-exporting
scenario modules would otherwise create initialization cycles. Derive's
existing testing entry is also a public SDK input, so distinct private
scenario data must not be pulled into that package accidentally.

The read-only inventory and concrete Node consumers are recorded in
`/tmp/artroom-k2-fixture-survey-20261019.json` and
`/tmp/artroom-k2-fixture-runtime-boundary-20261019.json`. The decision
changes no assertion, case, limit or deadline requirement. Final K2 gate
and complete Source still remain ahead, behind G5a, S2a and G5.

Actual Main's passing Vitest count is 1,926 with three existing skips. The
request's survey cites the unlanded G5a head's 1,939; its extra cases are
not silently imported or claimed here. The final gate must retain the
actual integrated base's case count and all existing assertions/limits.


## Derive internal fixture entry

`packages/derive/test/fixtures-entry.ts` is the supported internal case
entry. It re-exports the existing public core and explicitly names the
private domain builders. The public `fixtures.ts` and all 13 private
modules remain byte-exact to this phase's baseline `d97bb5ea3`; the SDK's
existing `./testing` export is unchanged. Private modules keep importing
the core directly, so the new entry creates no re-export initialization
cycle. Distinct forms and held-work data are named `formsWorks`,
`holdsWorks` and their definition aliases; the held-work class and owner
are `HoldsWorks` and `HOLDS_OWNER`. Tests retain their original local names.

All 40 affected cases now use one entry, replacing 63 fixture import
statements. The parser verifies every local binding still resolves to the
same original module and exported name, with its original type-only flag.
Removing the old/new fixture imports leaves byte-exact case source. Thus
case bodies, assertions, comments, clocks and deadlines remain unchanged.
Fourteen original fixture files, including the public core, hash exactly.
The new entry adds 16 lines and import coalescing removes 23, for seven
fewer lines in this phase; Derive now has 10,309 test TypeScript lines,
three fewer than the original 10,312-line inventory. This is no overall
line-reduction claim for K2.

Original process 62620 naturally exits zero. The owning Derive source/test
compilers pass and all 40 changed files/406 existing cases pass. Cost is
2.2698 seconds outer elapsed and 13.9532 seconds child CPU on the shared
warm macOS arm64 host. The parser/provenance record is
`/tmp/artroom-k2-derive-canonical-entry-20261020.json`; original compiler,
case and compatibility-guard logs and closure use
`/tmp/artroom-k2-derive-canonical-focused-20261020-`. The TypeScript 7 package
exports version metadata at its default root rather than the previous
parser API; the transformation uses the checkout's already pinned
Rolldown TypeScript parser, as the earlier K2 preservation tools do. No
package was installed. Platform's internal entry and actual Main/G5
integration remain ahead of the final gate and Source.
