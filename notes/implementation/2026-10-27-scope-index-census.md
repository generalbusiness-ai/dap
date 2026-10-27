# Registered-scope census and admission repair

Status: checker-requested admission repair is prepared. Fresh checks, gate
and exact-head review remain due.

Child `f51f16f4`, under promise `d28d9bcd`, adds a bounded census of the
Worker's registered full scope references and genesis hashes. This recut
also repairs review `ca32d20f` of head `b5deace0`. It is based on Main
`c7b7d1b8f1bd68361b83b6fac6e820a8fde95c9e`, tree
`d6d9df00daf8363ac32fdcf5891f9cd8654adbbb`. That Main change added only
the sprint report. Archive settlement and R14 documents landed first.

## Decisions and boundaries

Ruling `c0789349` uses a standing signed-read predicate. Each page names
`census`, the deployment-pinned Register and its exact cursor. The fixed
owner binds its stored Register reference and genesis hash to a bounded
exact native proof, then checks the supported Register pin, applied genesis,
seed address and incarnation, and verified founding `install` signature,
cause and actor. Member sessions and caller-selected roots grant no access.
Ordinary causal windows and operator key succession are unchanged.

The existing `artifactsRegisterScope` accessor supplies the pin. The later
host-choice slice owns moving its setting. Census adds no setting, index
column, replay record, registration call or native turn. The exact
`proofSource` seam avoids the recovery scheduling of `nativeBirth` while
checking the same sealed genesis fact within its existing byte, SQL and
time bounds. The owner rechecks expiry, pin and row after waiting.

### Admission before proof work

The first review approved the architecture and simplification but found a
security gap: the inner key limiter ran only after the operator check.
A self-created non-operator key could therefore trigger the singleton
owner's row lookup and up to a ten-second, one-MiB proof read on every
request, with no address or key window before that work.

The route now passes the trusted transport address to the existing
`admitServing` path after request-form and signature admission. Its address
and key windows run before `owner.list`, its row lookup or proof RPC.
`invalid` maps to `forbidden`; rate and availability decisions keep their
existing fixed responses. The absent-index outcome remains distinct.
The inner rate call is removed, so an operator request is charged once.
The owner still checks operator authority before revealing its mode.

Window counters are memory-only. Existing cold object construction can
initialize schema, control rows and maintenance state. Active-object
read-only denials do not prove that every cold constructor is write-free.
Forwarded headers supply no trusted transport identity.

The new Native witness uses the real fixed index, counters, SQLite and
Register proof. A labelled binding spy forwards actual proof bytes and
counts calls. It checks a non-operator's first forbidden request, repeated
key and shared-address refusals before another proof, a fresh key/address
control, and an operator's first success and second limit refusal under a
one-read limit. The structural witness checks trusted-address forwarding
through the actual matcher and helper with labelled admission stand-ins.

### Pages and complete-only output

Pages remain exactly `{rows,next}`, with at most 100 rows. `next:null` is
an explicit end, including a full final page. The CLI shares the existing
4,096-row bound, derives at most 42 page attempts, and keeps one deadline
and byte allowance across custody, signatures, requests and response reads.
It accepts no redirect, retry, session fallback or partial manifest.

Only a complete nonempty census containing the configured Directory root
reaches the existing exclusive file saver, in the unchanged v1 manifest
form. Every invocation prints one fixed JSON outcome line. A timed-out
remote continuation cannot publish later. A local save error can happen
after the complete file is linked; `output-unavailable` acknowledges no
publication and does not prove that the path is absent.

The manifest parser and version reader are unchanged. The existing Native
integration uses ten real birth registrations and ordinary Signed reads on
the owned native clock, which starts in 2099. Census uses the host clock.
The 100-row SQLite page witness adds 90 explicit TEST metadata rows; it
claims no extra native births. The older inventory remains repository-only.

## Evidence

The previous collector remains sealed and unchanged. Its 132 files and
78,574,114 bytes match the committed manifest, SHA-256
`ce302d79f341398e5551b48a927decaf431974f79422280bd4b0337c5d731f2a`.
Its passing gate describes the security-rejected predecessor, not this
repair. The copied previous report retains the earlier failures, controls,
clock qualifications and exact checkpoints.

Fresh evidence is retained at
`/Users/hughpyle/play/artroom-evidence/2026-10-27-scope-index-census-admission-repair/`.
The complete manifest, checkpoint, fresh results and seal remain due.

| Check | Command or comparison | Exit | Output SHA-256 |
| --- | --- | --- | --- |
| Predecessor byte and read-only verification | `previous-evidence.json` | 0 | Pending |
| Admission repair checks and gate | Pending source freeze | Pending | Pending |

No fresh check or gate pass is claimed by this draft. The new gate is
required because production admission changed; the old gate is historical.

## Open obligations

The planner deploys the reviewed source to all three hosted Workers and
records the first census and version report for each, under `f51f16f4`.
No local Native witness establishes a hosted observation or deployment.

The insert-only index can miss registrations inserted below an advancing
cursor during the reported time window. Unregistered legacy objects remain
a gap even after a complete census. Parent R14 `bb763efa` owns retirement
decisions from qualified observations, static inventory, v1 reports and
use cases. Definition succession and K1 govern native-version retirement.
Zero observation proves no absence and authorizes no retirement.

Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f51f16f4e23d8a1e02a54dbb302f1dba4fb14513`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:c078934976a5d59c57ae13b65404ec2fa650225a`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:ca32d20f27772dbbd0f558fb73865902b2e31c41`
