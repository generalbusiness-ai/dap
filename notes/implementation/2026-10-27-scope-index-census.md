# Registered-scope census

Status: owning checks, distinguishing controls and the repaired-head gate
passed. Exact-head review, landing and hosted observations remain due.

Child `f51f16f4`, under promise `d28d9bcd`, adds a bounded census of the
Worker's registered full scope references and genesis hashes. Its base is
landed Main `7b22054759a1989dece040ee05fe7de9f6793e92`, tree
`c88b4d9a82c2991311be87e25c85397bb60e6d87`. Archive settlement and the
R14 documents child landed before implementation started.

## Decisions and boundaries

Ruling `c0789349` replaces the original member-session design with a
standing signed-read predicate. Each page names `census`, the deployment's
pinned Register and its exact cursor. The fixed index owner compares its
stored full Register reference and genesis hash with a bounded exact native
proof. Only the verified founding `install` actor can read the page.
Membership sessions, invitations, founders lists and caller-selected roots
grant no census authority. Operator key succession remains out of scope.

The existing `artifactsRegisterScope` accessor supplies the host pin. The
later host-choice slice owns moving its setting; this head adds no setting.
Supported exact Register pins, applied genesis, seed address, incarnation,
founding install signature and cause remain checked. Ordinary signed-read
causal windows and the existing manifest pin-reader algorithm are unchanged.

The exact `proofSource` seam returns the same sealed genesis fact without
the alarm recovery performed by `nativeBirth`. Its existing sender fences
bound SQL, bytes and time. The census waits at most ten seconds and one MiB,
then rechecks the signed request's expiry and pinned row. There is no new
object RPC, replay row, native turn, index column or registration call.
The existing key read limiter runs once after operator authorization and
enforce-mode admission.

Existing cold object construction can initialize schema, control rows and
maintenance state. The denial witness distinguishes that initialization
from the census's read-only index and proof operations on active objects.
It does not claim that every cold constructor is write-free.

The HTTP page is exactly `{rows,next}`. `next:null` states that no row
followed the page at its read; a full final page needs no extra request.
Each page contains at most 100 rows. The CLI shares the existing 4,096-row
bound and derives its page bound from it. One finite deadline and byte
allowance cover custody, signatures, requests and response reads.

The CLI publishes only a complete, nonempty existing v1 manifest containing
its configured Directory root. Incomplete remote collection prints one
bounded JSON record and never reaches publication. Publication retains the
exclusive local save behavior. A timed-out remote continuation cannot later
publish a file. A local save failure can occur after the complete file is
linked; `output-unavailable` gives no publication acknowledgment and does
not prove that the path is absent. This existing save behavior is unchanged.

Route and setting inventories describe the new fixed-owner boundary. Their
structural witnesses use labelled authority stand-ins; genuine authorization
and genesis behavior belong to the native witnesses.

## Evidence

Raw output will be retained under
`/Users/hughpyle/play/artroom-evidence/2026-10-27-scope-index-census/`.
The complete collector is indexed and sealed after its last write. Initial
failures, the inconclusive control baseline and corrected runs stay separate.

| Check | Actual argv | Exit | Output SHA-256 |
| --- | --- | --- | --- |
| Initial compiler contexts: FAILED | `["npm", "run", "typecheck", "--workspace", "@generalbusiness/dap-scope", "--workspace", "@generalbusiness/dap-cli", "--workspace", "@generalbusiness/dap-client"]` | 1 | `types/output.log`: `97ba2820f58b4ae248e7c0ca34da58296f50b6dd39ac5d6a9e8c56e3be7d455e` |
| Initial CLI/signed reads | `["node", "node_modules/vitest/vitest.mjs", "run", "--project", "cli", "--project", "client", "packages/cli/test/scope-index-census-command.test.ts", "packages/cli/test/scope-index-command.test.ts", "packages/client/test/signed-read.test.ts"]` | 0 | `plain/output.log`: `338f36f102964f0d8c3ef5d95474856b0d05b5906dabdcaa6d2fa2937c008dce` |
| Initial Native: FAILED | `["node", "node_modules/vitest/vitest.mjs", "run", "--project", "scope", "packages/scope/test/scope-index-census.test.ts", "packages/cli/test/scope-index-census.scope.test.ts"]` | 1 | `native/output.log`: `90449a65934e63ebebbf40058ce5dd8dacbe8df20c3335fd40fb7fd67fd99c0b` |
| Route/settings inventories | `["node", "--test", "scripts/security-entry-points.test.mjs", "scripts/security-settings.test.mjs"]` | 0 | `inventory/output.log`: `6b45989950ab8bf65ed620861e25d4d6a3cbe8580496797e6fd470c8cf85d387` |
| Compiler follow-up | `["npm", "run", "typecheck", "--workspace", "@generalbusiness/dap-scope", "--workspace", "@generalbusiness/dap-cli"]` | 0 | `types-followup/output.log`: `389c9027c3954cf176c3b2c7076f55c42c090dfb6deed0dfaba722f34a6badce` |
| Native follow-up: FAILED | `["node", "node_modules/vitest/vitest.mjs", "run", "--project", "scope", "packages/scope/test/scope-index-census.test.ts", "packages/cli/test/scope-index-census.scope.test.ts"]` | 1 | `native-followup/output.log`: `f61762942d1a655af4ab6ece5fc66cce8f4025b24481f78d01c8d7a70bb38792` |
| CLI clock-repair types | `["npm", "run", "typecheck", "--workspace", "@generalbusiness/dap-cli"]` | 0 | `cli-types-clock-followup/output.log`: `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` |
| Native clock-repair follow-up | `["node", "node_modules/vitest/vitest.mjs", "run", "--project", "scope", "packages/scope/test/scope-index-census.test.ts", "packages/cli/test/scope-index-census.scope.test.ts"]` | 0 | `native-clock-followup/output.log`: `508b26691e65413f9c9ee10e40a19ed8b843383f9f6b195dc5b7b58b4f178bf1` |
| Install-signer control: DISTINGUISHES | `["node", "scripts/control.mjs", "packages/scope/src/scope-index-census.ts", " \|\| founding.intent.actor !== signed.request.actor", "", "--expect", "census admits the native founding install signer", "--", "packages/scope", "test/scope-index-census.test.ts", "--project", "scope"]` | 0 | `control-install-signer/output.log`: `7f74f4971b17cbb1329809380063d153e3c6fe1b263e2287a1cb4068a800cd76` |
| Row-bound control: INCONCLUSIVE baseline | `["node", "scripts/control.mjs", "packages/cli/src/scope-index-census-command.ts", "if (page.length > INDEX_INVENTORY_BOUNDS.scopes - scopes.length) return stop(\"over-bound\", \"row-limit\");", "", "--expect", "census fits exactly the existing row bound", "--", "packages/cli", "test/scope-index-census-command.test.ts"]` | 2 | `control-complete-manifest-bound/output.log`: `4af9fa2255104edac05d6ae8f4c035517565de313cc4e7269553b0d3c0eaedc2` |
| Row-bound control: DISTINGUISHES | `["node", "scripts/control.mjs", "packages/cli/src/scope-index-census-command.ts", "if (page.length > INDEX_INVENTORY_BOUNDS.scopes - scopes.length) return stop(\"over-bound\", \"row-limit\");", "", "--expect", "census fits exactly the existing row bound", "--", ".", "--project", "cli", "packages/cli/test/scope-index-census-command.test.ts"]` | 0 | `control-complete-manifest-bound-followup/output.log`: `1046edc6a3b078acbea0e67b5d458c3a891b4e67a87c0843259de92b8bf67aef` |
| First gate: FAILED before any suite | `["npm", "run", "gate"]` | 1 | `gate/output.log`: `93668fdcbe0ba5b0e3da5d01895bf126518b2e2e2c38f348a30a21b42f20a385` |
| Shared-owner helper repair | `["node", "scripts/check-shared-helpers.mjs"]` | 0 | `shared-helper-repair/output.log`: `ae0cc4263c79509a1aac93ac04fb6a2c46e0bb7b663054171562564bced0a0b1` |
| Scope types after helper repair | `["npm", "run", "typecheck", "--workspace", "@generalbusiness/dap-scope"]` | 0 | `scope-types-helper-repair/output.log`: `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| Signer control at repaired head: DISTINGUISHES | `["node", "scripts/control.mjs", "packages/scope/src/scope-index-census.ts", " \|\| founding.intent.actor !== signed.request.actor", "", "--expect", "census admits the native founding install signer", "--", "packages/scope", "test/scope-index-census.test.ts", "--project", "scope"]` | 0 | `control-install-signer-helper-repair/output.log`: `3deb2a451ee9550d57f723884a3c172d86293e067d33e394d22f53d9a0f0292c` |
| Repaired-head ordinary gate | `["npm", "run", "gate"]` | 0 | `gate-followup/output.log`: `b6c16b10fe676a12779ec92c745a823b1f56a67499e06e0e2a4520becac2d3bc` |
| Closed-gate reconciliation | Derived closed records; not a command invocation | n/a | `gate-analysis.json`: `6633c0e0c3298b858a6537681f8bd83e62c23a7716b71bf4230918d4655f9b79` |

These four independent commands ran in parallel at clean checkpoint
`0fbfc2a6b9c190df9de190b5b0906ef7d04e50ae`, tree
`2e4217aa785a8035c8ba49a25dd896da9e20f264`. Each terminated naturally,
retained its actual output and verified unchanged tracked bytes and modes.
The plain checks passed 15 tests; the inventories passed 11. The compiler
found two test literal-inference errors. Native checks passed two cases
and failed two witness assertions: the session observer does not observe
Signed reads, and the integration version report was unready. These are
pre-gate results, not a failed or passing gate. Repairs and later results
will remain distinct. No hosted census or deployment is claimed.

At clean `50602fab6413fe23ff9bcfa8a1f0b9a4d7265a0d`, tree
`4c191646b5efc7b9427771473da955f262e8f136`, both compiler contexts
passed. All three Native server cases passed; the CLI integration remained
unready, now retaining every row's `forbidden` outcome. Signed reads invoke
their own policy and do not call the Session observer. The false observer
expectation was removed while the actual authority assertions remained.

Source review found that the fixture's native clock starts in 2099, while
the CLI context signed ordinary reads on the 2026 host clock. The repair
keeps host-clock signing for census and gives the unchanged ordinary
readers the owned native clock. It changes no production authorization.
The corrected Native integration and compiler follow-up passed at clean
`fcdb791c0120ae06d72dba68c9839d75ace61848`, tree
`409e7e0bd78b03ec8b04d097668504f8c1e3ebb6`. All four Native cases
passed. The actual CLI census and unchanged version reader cover ten
registered scopes; the existing inventory still covers only its repository.

The install-signer control changed the real member's Signed response from
403 to 200. The row-bound control changed an oversized census into a saved
complete manifest. Each failed a named assertion and restored its source.
The first row-bound attempt selected Node from the package's mixed test
script and failed before mutation; it is inconclusive. The explicit root
Vitest project then distinguished the fault.

The first gate ran once at that checkpoint and stopped at the shared-helper
check: the new module duplicated `same`, already owned by the bytes package.
No kernel, Node, Counting, plain or Native suite was reached. The repair
imports that owner's identical canonical equality function and updates the
reviewed module seal. The first gate remains failed.
The repaired-head gate is reported below.
The first gate reached no suite, so none was repeated from that run.

## Final validation and reporting tail

The final source checkpoint is
`0d9663a5479589e89b2c4a49e84affd8fb622bb7`,
tree `fab3764df3bf18be2448a26f550c0304e547b749`.
All other tracked blobs, symlink targets and executable modes match the gate
snapshots. Only this implementation note and its manifest follow that
checkpoint. Root binds the final review head after committing the reports.

The Native clock repair is fixture-only. Census signing retains the actual
host clock; ordinary reads in the fixture use its owned 2099 clock. This
aligns readers without changing production authorization or proving a hosted
clock policy. Three real server cases and one real CLI integration passed
under the test Worker; labelled host, scheduler and other fixture stand-ins
remain. The active-object read-only denial witness does not establish that
cold object construction writes nothing.

The fleet/version witness uses ten actual Native birth registrations.
The full-page SQLite witness adds 90 explicit TEST metadata rows.
It proves a full 100-row page under genuine operator authority;
it establishes no additional Native births.

Removing the founding-install actor equality made the unchanged denial
assertion observe HTTP 200 rather than 403. Removing the total manifest row
bound made the unchanged next-row assertion observe complete publication
rather than row-limit refusal. The controls loaded unchanged test files,
failed named assertions and restored exact source bytes. No formal mutant
TypeScript compiler context was run. The first package-level row-bound control
had no passing baseline, exited 2 and is inconclusive; the root-project
follow-up distinguishes. None of these controls establishes hosted results.

The shared-helper repair and Scope compiler context passed at the repaired
head. The signer control distinguished again at that same checkpoint.
The first gate naturally exited 1 before any kernel, Node, Counting, plain or
Native suite ran. Its original outputs and context stay separate. The
repaired-head `npm run gate` naturally returned exit 0. Its runner records
956.000741125 seconds wall and
2034.792967000 child CPU seconds, with unchanged source and no
collection errors. These are whole-command observations, not sums of phase
or concurrent case durations. Terminal identities reconcile as follows:

node: 70 passed, 0 failed, 0 skipped, 0 todo.

counting: 55 passed, 0 failed, 0 skipped, 0 todo.

plain: 2877 passed, 0 failed, 1 skipped, 0 todo.

native: 813 passed, 0 failed, 2 skipped, 0 todo.

These counts use the maintained summary identities. Case durations remain
concurrent observations, separate from whole-command wall time and CPU.

No unhandled or reporting errors remain in the reconciled gate result.
Callback gaps and module/case distinctions remain in `gate-analysis.json`;
a passing terminal is not a claim that every optional callback appeared.

The recorded machine is Mac17,7, arm64,
with 18 logical CPUs. It runs Darwin 27.2.0.
Node is v26.12.1. Load before the repaired gate was
2.23681640625, 2.89599609375, 2.83837890625.
The machine is shared; other workload was not controlled. Dependencies were
warm and lock-verified. OS file-cache state and post-gate load were not
measured. No speedup, isolated CPU cause or hosted performance claim follows.

Across all 16 retained check, control and gate command receipts,
the validation window is 1954.388861179 seconds from the earliest
recorded start to the latest end. This includes gaps and overlap; it is not
a sum of command walls. Summed child CPU is 2178.315427000 seconds over
those same commands. This measured edit-validation cost includes the failed
first gate and repaired gate separately; it is not the repaired gate's
whole-command wall or CPU alone. Preparation, editing and report assembly
are outside these command receipts.

The collector has 132 files and 78574114 bytes, including its
root `SHA256SUMS`. The index excludes itself; the complete manifest includes
it. The manifest SHA-256 is
`ce302d79f341398e5551b48a927decaf431974f79422280bd4b0337c5d731f2a`.
All raw files and directories are read-only after the last write. Retain
this evidence for at least 30 days after landing.

The finalizer and its phase receipt describe reporting only. The phase
receipt has `exit:null`, not a final process result or completed seal.
Actual post-seal status is printed outside the collector. Assembly runs no
repository check, test, gate, hosted query or deployment.

An earlier read-only report preflight caught an overlong prose line.
Its source and root-observed failure record remain in the collector.
That invocation wrote no report or seal and ran no repository check.


## Open obligations

The planner deploys the reviewed source to all three hosted Workers and
records the first census and version report for each, under `f51f16f4`.
Native fixtures and local tests establish no hosted fleet result.

The index is insert-only. A registration inserted below an advancing cursor
can be missed during the reported `startedAt` to `endedAt` window.
Unregistered legacy objects remain a gap, even after a complete census.
Parent R14 `bb763efa` owns retirement decisions from this qualified
observation, the static inventory, v1 report and use cases. Definition
succession and K1 still govern native-version retirement. Zero observation
does not prove absence or authorize retirement.

Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f51f16f4e23d8a1e02a54dbb302f1dba4fb14513`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:c078934976a5d59c57ae13b65404ec2fa650225a`
