# Shared test fixtures

K2 gives Derive and Platform one supported internal fixture entry each.
Scope and MCP have separate Node-safe and Worker entries because their
runtime dependencies and lifetime ownership differ. Tests use those entries;
private domain data and adapters retain their own files and meanings.
The original public testing exports retain their existing roles.

Request: `6578efa9e9da839bf0bbb0961ba00b243a8ea06c`.
Builder promise: `d387f722298edf53bf9d6776d9445b930900d422`.
Planner's adopted layout decision: `134333f2`, adopted by `efba35a7`.
The decision allows private modules behind supported entries, separate
Node and Worker entries where required, and builders used by one file to
remain local. This is development work behind the Grow demo.

The final code checkpoint is `de45e45a41a1118ec0d1125fbb3ce8fbb4197d0c`,
tree `c149ed10a33f20a39aca9d5e6d25b277858e20e9`. It includes actual reviewed,
audited and published Grow Main
`7594822ca12d7d2ade130045f966110aaa434569`. The only change after its gate
is this implementation note. The complete candidate has 217 changed paths
against that Main: 189 case files, 27 fixture/compiler-support files and
this note. No production runtime source or package lock changes.

## Supported entries

| Package and entry | Case files | Reason |
| --- | ---: | --- |
| Derive `test/fixtures-entry.ts` | 41 | Pure cases share core helpers and explicitly named domain data; the public SDK core stays separate |
| Platform `test/fixtures-entry.ts` | 21 | Pure cases share judgment/domain builders and keep their original actor bindings |
| Scope `test/fixtures.ts` | 3 | Node MCP consumers need portable packets without Worker or Vitest runtime |
| Scope `test/fixtures-native.ts` | 103 | Native Scope cases need Worker ports and explicit lifetime ownership |
| MCP `test/fixtures.ts` | 10 | Node cases need portable signers, recipe parsing and caller-owned loopback transport |
| MCP `test/fixtures-native.ts` | 11 | Native stories need Room ownership/hooks and their portable recipe parser |

These are static consumer-file counts, not runtime case counts. Private
Node host and capture adapters also use the portable entries. The complete
current symbol/path inventory is
`/tmp/artroom-k2-final-entry-consumers-20261020.json`.

Private modules import their core directly, preventing re-export cycles.
The Node entries do not import Worker or Vitest runtime. MCP's native
entry re-exports only the portable `activityRecipe` helper. The Node-test
compiler excludes that Worker entry alongside its existing Worker adapters;
the native compiler checks it. No ambient allowance or production compiler
option is widened.

Derive shares four copies of clone-and-change through `changedDraft`, using
native `structuredClone` and preserving profiles, bounds, no-op callbacks
and ignored return values. Platform shares four `written` judgments and
three identical checked-definition acceptors. Creation's distinct validation
profile and error wording remain separate. Actor aliases preserve the
original source module, including `membershipRita`, `creationRita` and
`destinationRita`. Distinct Derive forms/held-work data likewise retain
explicit aliases and their original local names in cases.

Scope shares fresh content/Worker bindings, explicit trust serialization
and deterministic TEST signers. Callers retain namespace/bucket references,
trust strings, invalid inputs, initialization times and extra fields.
Seeds 5, 61, 62, 63, 64, 67, 81 and 254 remain explicit and unchanged.
Packet variants, HTTP peer behavior and native lifetime adapters remain
distinct private implementations.

MCP shares its HTTP/wire loopback transport, Counter/lending room claim and
recipe parser, fifteen fixed-seed constructions and four scenario-seed
parses. Each caller retains its own server, peer, hooks, close order,
configuration holds, cohort, activation, role actions and clock advances.
The transport returns the server before awaiting readiness, preserving the
caller's retained server during setup. Node HTTP/stdio over a SCRIPTED scope
service proves that transport boundary; it is not native scope evidence.
Native stories retain their real Room ownership and labelled peer boundaries.

## Preservation and actual Main integration

The final source-only parser comparison against published Main covers all
420 tracked `.test.ts` paths. The path set is exact. For the 189 changed
case files, registration names, callback parameters, inline case matrices
and deadlines are exact. All outer `expect` chains are exact after two
explicit setup mappings:

- Counter and lending each move the same two setup assertions unchanged
  into `claimApplicationRoom`, called once by each original room builder.
  Every remaining expectation stays exact.
- Three install-custody expressions replace an inline Worker environment
  argument with the identical fresh bindings builder. Requests, expected
  statuses and matchers stay exact; this is not raw source identity for
  those three expressions.

The complete map is
`/tmp/artroom-k2-prepared-case-preservation-20261020.json`, produced by its
adjacent `.mjs` source-only tool using the already pinned Rolldown parser.
It is not a runtime count, complete assertion-helper equivalence, load
stability or hosted-acceptance proof. No case, assertion result, case-specific
limit, deadline, grant, owner or scenario boundary is weakened.

S2a Main `fb390d88` was integrated at `f856a6ee9`. The initial merge's
four conflicts have all twelve stage blobs retained in
`/tmp/artroom-k2-integrate-s2a-conflicts-20261020/`. Three case conflicts
preserve Main's nonimport source byte-exact: Platform versions, archive
privacy and archive target. The application fixture keeps Main's new
`requireArchive` parameter and host requirement, plus K2's identical signer
and trust builders. Main's newer Device/archive consumers then adopt the
same entries. All 165 outer expectations in that follow-up remain exact.

Published Grow Main was integrated cleanly at `055a54d9`, without a shared
Main mutation. The final Grow file coalesces five fixture imports and uses
the exact fresh bindings builder. Its 94 parsed expect-call nodes and both
cases retain their original source. Capture still reads the exact committed
signed demo packet. No frozen review original, dependency or tool was
executed or edited during either integration.

## Line counts

Both sides count the same test TypeScript paths from published Grow Main,
including its newer S2a/G5 cases. This avoids comparing different feature
sets or the request's older, then-unlanded 1,939-case reference.

| Package | Main 7594822c | K2 | Change |
| --- | ---: | ---: | ---: |
| Derive | 10,632 | 10,629 | -3 |
| Platform | 5,942 | 5,940 | -2 |
| Scope | 22,162 | 22,151 | -11 |
| MCP | 7,831 | 7,853 | +22 |

The net change is plus six lines. The result is clearer supported entries
and fewer copied builders; no overall line reduction is claimed. Exact
counts are in `/tmp/artroom-k2-prepared-line-counts-20261020.json`. The original
baseline was Main `dba3e762`, whose actual gate had 1,926 passing Vitest cases
and three skips. Later Main additions explain the current count.

## Native lending preparation after the first gate

The first ordinary gate at `f1d18820` naturally exits one: 1,976 Vitest
passes, one failed native lending case and three existing skips. Whitespace
and all type checks pass; later Node and Counter phases are not reached.
The second `g.look()` expects current but receives behind/no-query-reply.
Its original exception is hidden by the transport; the 621ms case duration
is not evidence of a ten-second query deadline. Cost is 521.9888 seconds
elapsed / 752.5481 child CPU. All 2,349 tracked source rows stay exact;
5,530 private dependency rows differ only in allowed Vitest results output.
Lock/stamp stay exact, the checkout is clean and no package is installed.
Original gate logs/closure/inventories use
`/tmp/artroom-k2-final-gate-20261020`; full phases are retained from
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.uMvZ6Xz6br`.

A focused run `59291` with bounded exception logging passes the unchanged
case and recovers no exception. A controlled native interleave `48436`
then dispatches only real pending L/G replies between item reads and
history, without scripting replies or adding an act. Both item queries
read head20; an existing publication reply advances it to21; history reads21.
The projector refuses `application-projection-stale`, and the original
unchanged current-status assertion fails with the same behind/no-query-reply
message. This establishes an actual fixture preparation defect. It does
not recover or conclusively identify the original gate's hidden exception.

The saved repair `de45e45a` adds one existing `settle(L, G)` call and its
comment before the first historical multi-read projection. It finishes
earlier publication replies before the fixture expects a static view.
No assertion, case, deadline, native runtime or projection refusal changes.
The same prepared interleave `28068` passes the whole case naturally zero;
its passing log does not expose console head markers. Separate explicit
head capture `49714` therefore intentionally stops after the second read:
queries, before/after dispatch and history all read the identical head21,
and readStatus is current. That natural-one diagnostic stop is not a
passing case or gate. Every diagnostic edit is restored byte-exact.
Raw helpers/logs/closures use `/tmp/artroom-k2-lending-*20261020*`.
The negative control requires its recorded pre-repair inputs; the prepared
controls require their recorded repaired inputs. Independent execution must
copy the matching historical bytes and retarget all original paths.

The final source-only comparison above includes this preparation and
reconfirms all 420 test paths, 189 changed case files, original registration
metadata and explicitly mapped expectations. The setup change warrants a
new ordinary gate; no unchanged whole suite was repeated. No general load
stability or physical-draining conclusion follows from these controls.

## Verification and retained limits

The changed-preparation ordinary gate `32605` naturally exits zero at
`de45e45a` / tree `c149ed10`: 413 Vitest files pass, one file is skipped;
1,977 cases pass and three existing cases are skipped. The later Node phase
passes 31 cases and Counter passes 55. All compilers and whitespace pass.
This matches the actual published Main case counts without adding cases.
Gate cost is 510.5506 seconds elapsed / 741.3214 child CPU; outer elapsed
including inventories is 511.9225 seconds. Shared warm macOS27.0.1 arm64,
Node26.12.0/npm11.20.0, load averages 1.948/1.900/1.950; no exclusive-host
claim. No package is installed.

All 2,349 tracked source rows stay exact before/after. All 5,530 private
dependency rows stay exact except one Vitest results-cache file. The lock
and private dependency stamp stay exact; the checkout stays clean.
The raw test log retains the deliberately scripted reset/retention faults
and Git binary-body warnings. The two earlier resolve-pending diagnostics
remain separate observations; this successful gate makes no general
stability or physical-draining claim.

Original gate helper, log, natural closure and inventories use
`/tmp/artroom-k2-prepared-gate-20261020`. Complete phase output is under
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.BhmBrkrQQu`;
Counter's evidence is under
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/artroom-counting-node-uDPFMC`.
Every named leaf is retained in the finite review map. No whole suite is
repeated after the final note-only edit.

Focused checks ran while each fixture boundary changed. The final
integration check `95191` passes all four owning compiler groups, portable
Node entry loading, three selected Node files/nine cases and eight native
files/25 cases. It covers resolved conflicts, all Device installation
variants, archive contexts/targets/privacy, custody and maintained Grow.
Final Grow check `40416` passes Scope/Grow compilers, portable Node entry
loading and both native demo cases: 16.1719 seconds outer elapsed and
22.3322 child CPU. Earlier owning checks include Derive's 40 files/406 cases,
Platform's 20 files/179 cases, Scope's 97 files/343 cases plus its separately
owned denial case, and MCP's eleven native files/30 cases. These are
separate focused observations, not an aggregated gate or stability claim.

Original failures and diagnostics remain available:

- Grouped MCP signer check `99684` passes 75 cases and fails two HTTP
  replacement assertions. One expects four streams with incumbent B but
  observes three and no B; the next cannot open its initial held streams.
  The unchanged entire HTTP file alone passes all nine cases in `69584`.
  The cause remains unclassified. Neither result is discarded.
- Selected native checks `99569` and `44218` each pass three files/eight
  cases and naturally exit zero, but print a late
  `EnvironmentTeardownError: Closing rpc while "resolve" was pending`.
  Narrowing the export is not claimed to fix it. No clean-output,
  physical-draining or general stability conclusion is drawn.
- An early type-only native Room import pulled Worker source into the
  Node compiler; narrow structural test ports corrected that dependency.
  A strip-only Node portability probe failed on an existing parameter
  property; bundling with installed esbuild then loaded the same module.
  TypeScript 7's default package root lacked the previous parser API, so
  source tools use the already pinned Rolldown parser.
- Early metadata files incorrectly named a previous Git head after a
  stopped commit. They remain marked as failed observations; corrected v2
  records require a clean checkpoint and exact committed bytes. Platform's
  final-newline correction is explicitly separated from its passing draft.
  A wrong `denial` selector ran no test before the owning `scope-denial`
  selector passed. Output-exists guards retain earlier evidence unchanged.

Raw focused logs, compiler output, source inventories, failed/corrected
metadata, assertion maps and natural process closures use the finite
`/tmp/artroom-k2-*` leaves named in the review evidence map. The gated
code's older implementation note is retained as an exact historical Git
snapshot, including its full preparation history. No original result was
removed or relabelled as infrastructure.

This work performs no provider operation, package installation, publication
of an SDK or Cloudflare deployment. Planner's actual hosted Grow acceptance
remains open under `cc069da1` / `2fcf3c3a`; local code landing and this fixture
work do not settle it. Complete K2 review, native landing and publication
remain separate actions after this note.
