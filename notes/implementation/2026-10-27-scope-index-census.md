# Registered-scope census

Status: implementation and witnesses are being prepared. Checks, gate and
exact-head review remain due.

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
| Owning checks and ordinary gate | Pending source freeze | Pending | Pending |

No completed test, gate, hosted census or deployment is claimed by this
draft. The final note will distinguish actual check results and controls.

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
