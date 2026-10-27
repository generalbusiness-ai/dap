# Registered-scope census

Status: owning checks and both controls passed. The first gate stopped in
the shared-helper check before any suite. Its repair and gate remain due.

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
The checkpoint, final manifest and read-only seal remain due.

| Check | Command | Exit | Output SHA-256 |
| --- | --- | --- | --- |
| Initial compiler contexts | `types/receipt.json` | 1 | `types/output.log`: `97ba2820f58b4ae248e7c0ca34da58296f50b6dd39ac5d6a9e8c56e3be7d455e` |
| Initial CLI and signed-read tests | `plain/receipt.json` | 0 | `plain/output.log`: `338f36f102964f0d8c3ef5d95474856b0d05b5906dabdcaa6d2fa2937c008dce` |
| Initial Native census witnesses | `native/receipt.json` | 1 | `native/output.log`: `90449a65934e63ebebbf40058ce5dd8dacbe8df20c3335fd40fb7fd67fd99c0b` |
| Route and setting inventories | `inventory/receipt.json` | 0 | `inventory/output.log`: `6b45989950ab8bf65ed620861e25d4d6a3cbe8580496797e6fd470c8cf85d387` |
| Compiler follow-up | `types-followup/receipt.json` | 0 | `types-followup/output.log`: `389c9027c3954cf176c3b2c7076f55c42c090dfb6deed0dfaba722f34a6badce` |
| Native follow-up | `native-followup/receipt.json` | 1 | `native-followup/output.log`: `f61762942d1a655af4ab6ece5fc66cce8f4025b24481f78d01c8d7a70bb38792` |
| Corrected Native clock witness | `native-clock-followup/receipt.json` | 0 | `native-clock-followup/output.log`: `508b26691e65413f9c9ee10e40a19ed8b843383f9f6b195dc5b7b58b4f178bf1` |
| CLI clock witness compiler | `cli-types-clock-followup/receipt.json` | 0 | `cli-types-clock-followup/output.log`: `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` |
| Install-signer control | `control-install-signer/receipt.json` | 0 | `control-install-signer/output.log`: `7f74f4971b17cbb1329809380063d153e3c6fe1b263e2287a1cb4068a800cd76` |
| Manifest-bound control, inconclusive runner selection | `control-complete-manifest-bound/receipt.json` | 2 | `control-complete-manifest-bound/output.log`: `4af9fa2255104edac05d6ae8f4c035517565de313cc4e7269553b0d3c0eaedc2` |
| Manifest-bound control, explicit Vitest project | `control-complete-manifest-bound-followup/receipt.json` | 0 | `control-complete-manifest-bound-followup/output.log`: `1046edc6a3b078acbea0e67b5d458c3a891b4e67a87c0843259de92b8bf67aef` |
| First ordinary gate, suites unreached | `gate/receipt.json` | 1 | `gate/output.log`: `93668fdcbe0ba5b0e3da5d01895bf126518b2e2e2c38f348a30a21b42f20a385` |
| Follow-up, controls and ordinary gate | Pending | Pending | Pending |

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
reviewed module seal. The first gate remains failed; a repaired-head gate
is still due. No whole suite from that gate has been repeated.

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
