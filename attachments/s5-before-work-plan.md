# S5: Check authority before foreign work

Plan only for request `7ceefd43` and builder promise `ad443a7a`. The source
checkpoint is main `7177b87be03ced9e2ddae2a5ebfcdfffcc1fda62`. Execution waits
after the cutover family. This packet changes no source or authority and runs
no helper, application import, parser, compiler, test, control, build, TLC,
or capture. Root must review the choices below before any patch.

## Two design decisions need a planner ruling

1. Supply the census install signer as a public deployment pin, or maintain
   one authenticated durable projection for the selected Register. The
   current index cannot supply that identity. Prefer the deployment pin if
   the planner accepts the explicit configuration and rollout cost.
2. Approve a deny-only, shared local authority preflight for Native marks.
   An arbitrary mark cannot safely run with missing foreign inputs. The
   narrow preflight must defer whenever those inputs could affect its answer.
   It must never grant authority or write an entry.

Neither decision follows from moving the existing signature check. Both
need an explicit source contract before implementation.

## What the source proves now

`ScopeIndexCensus.list` verifies the signed-read shape, signature, target,
cursor, expiry, and registered Register identity before `ports.proof`.
`requestOf` does not know the authorized install signer. The actor comparison
comes after `proofEntry` and the applied genesis checks. A valid self-signed
nonoperator therefore reads the full proof before `forbidden`.

`known_scope` stores only scope, incarnation, kind, and genesis digest.
Those values bind the exact proof but do not reveal its signer. The seed's
cause is an intent digest. It cannot be inverted to obtain an actor. Index
presence remains a reachability fact, never Native authority.

`Scope.submit` already reads standing first and rejects an ordinary string
grant when a usable standing answer contains no qualifying grant. It keeps
Native fallback deliberately. Null standing means no usable observation,
not evidence of unauthorized standing. Before the full judge, the remaining
path still builds receiver policy and fetches named foreign facts.

The full judge also reads fact fields before check9. A native grant rule
receives local state and subjects, but can also inspect `uses`, values and
observations. Calling every mark early with an empty fact list could turn
missing evidence into a false denial. Returning `unauthorized` for every
null standing answer would break recovery and other mark-based authority.

## Census: obtain a trusted expected actor without a lazy bootstrap

### Preferred option: a public deployment pin

Add one exact, bounded descriptor for the currently selected Register's
install signer. The descriptor binds scope, incarnation, genesis digest,
and actor. Its name and wire spelling need the planner's ruling. Use the
existing canonical key/reference decoders, without trimming or coercion.
It is public metadata, not a private key or another read credential.

The fixed index owner reads this descriptor from trusted deployment settings.
It compares its Register tuple with the registered tuple, then compares the
verified request actor with the descriptor actor. A mismatch returns
`forbidden` before addressing the Register proof port. A malformed, absent,
or stale descriptor fails closed without a proof read. The planner must
choose whether the missing descriptor is `unavailable` or `forbidden`.
It must not mean an empty census or an unknown index.

A matching actor still owes every existing proof check: exact fact/body
binding, byte and time bounds, sequence0, null previous entry, applied
genesis, supported Register pin, root seed/address, incarnation, install
kind, signed parentless founding intent, cause digest, and actor equality.
The pin is only an early denial filter. It cannot replace proof authority.
Recheck the descriptor, current Register pin, registered tuple, request
expiry, and deadline after the await, alongside the existing rechecks.

Migration does not rewrite any room or index row. Before deploying S5, the
operator derives the descriptor from each deployment's already sealed and
verified Register genesis and installs it with the code/settings change.
The existing census installer keeps working from the first cold request.
A deployment with no valid descriptor stays closed until configured. No
request may fill that gap by asking for its own proof first. The deployment
runbook must cover register replacement and rollback as one bound pair.
This agent reads no private key, room custody, or live Worker for that work.

This option adds configuration and its documentation, but no cache, table,
unbounded history, invalidation map, or public registration authority.

### Alternative: one authenticated durable projection

If automatic source-derived metadata is preferred, keep one bounded row for
the selected Register tuple and install signer. Derive it from the exact
applied Native genesis through the trusted registration/migration boundary.
Do not accept an actor field from a caller's claimed registration. A malformed
or conflicting tuple never overwrites the authenticated row.

`ScopeObject.registerKnown` already derives registration from its own checked
stored entry, so that boundary is a candidate. It would need to carry the
signer only after the same install-proof validation. The public census rows
remain exactly at+genesis. The projected actor must not leak into that API.

Existing rows need a bounded, explicit operator backfill before serving S5.
The backfill reads only the selected Register, under the existing exact proof
bounds. It does not scan every scope. A cold object can read the durable row
without another proof. An empty or conflicting row fails closed until repair.
Do not learn it lazily from the first anonymous caller, from a caller-supplied
actor, or from an in-memory cache that loses its truth on restart.

This option avoids a separate actor setting but costs schema migration,
authenticated projection plumbing, proactive backfill, and conflict/restart
witnesses. It changes `object.ts` and registration wiring as well as census.
It must preserve old rooms without trusting their old actor-less rows as if
they were complete. Root must refer this choice to the planner before edits.

## Core: stop only work that cannot change the authority answer

Keep signature/shape checks and accepted-key lookup before new work. Recheck
accepted identity after each existing await, so an exact receipt or mismatch
wins over lost authority, release admission, or foreign dependencies.
A new preflight must not consume an idempotency key.

Use a shared pure authority decision boundary, not a second authorization
policy in `core.ts`. Its result may be a proven denial, unavailable authority,
or defer. It may never be accepted, granted, or a draft. It runs synchronously
on the current local view and reading and must preserve the existing local
checks and their refusal precedence. A result whose prerequisites are not
available defers to the existing path.

For an ordinary grant with null standing, the safe negative result is
`authority-unavailable`, not `unauthorized`. For a usable empty grant set,
keep the existing `unauthorized` result. A late, throwing, discarded, or
wrong-context standing handle remains unavailable. A limit remains limit.
Never manufacture an empty grant set from any of those cases.

For a Native mark, first preserve the ordinary-grant success route. If it has
no qualifying grant, only a reviewed local-only denial predicate may stop
before foreign work. Share that predicate with the actual Native grant rule.
Examples worth auditing are the founding-key and recovery-key comparisons.
An invitation selector also needs its actual local subjects and fields.
Do not infer local-only behavior from a rule name or version number.

The likely implementation is an internal deny-only hook or shared helper
with explicit input requirements, owned by the Native rule implementation
and consumed by the common authority preflight. No hook means defer.
No foreign read, value, observation, unresolved subject, or grant-dependent
input may be silently replaced with null or an empty list. If an answer
requires such an input, fetch only through the existing guarded path and
keep `dependency-unavailable` when that dependency cannot be proved.

Root must approve that boundary before a patch. If sharing the actual
predicate requires a new rule interface or changes check ordering, root
must refer the precise API and precedence to the planner. Do not add a
Native-version allowlist, blanket grant-mark refusal, lazy proof evaluator,
or Proxy-based simulation as a substitute for that ruling.

Early denial happens before release provenance, receiver policy, foreign
fact reads, observation rows, and the turn queue when those operations cannot
change its result. It writes no timer, retained input, claim, operation,
alarm, or grant mark. Valid fallback, recovery, and evidence-dependent paths
still take the full judge and commit revalidation. Native full judgment
remains the sole positive authority path.

A refusal keeps `judgedAt` exactly as ruled. It still exposes the current
count and digest to someone who knows the scope ID. Preserve and cite that
threat-model fact. This head proposes no response redaction.

## The two counted-read witnesses

Add or strengthen one whole-owner witness for each requested item. Freeze
actual cases and compiler inputs only after the family and design rulings.
No tests or case counts have been executed or collected for this plan.

**Census witness.** Extend `scope-index-census.test.ts` and its existing
proof-forwarding Native fixture. The fixture already counts exact proof RPCs
and currently expects one read for a fresh valid nonoperator. With trusted
actor metadata present, assert zero proof calls for that same signed request,
no target lookup, no active-object writes, and `forbidden`. This assertion
fails at7177. The real installer must still perform the exact Native proof
and obtain its existing page. Include first-call/cold-object, stale tuple,
changed pin during await, and the chosen migration/missing-metadata behavior
inside the reviewed witness. Keep serving windows and one charge unchanged.
The TEST metadata source must derive from the genuine sealed install signer,
not merely name the request actor.

**Core witness.** Extend `authority-order.test.ts` using real ScopeObject,
SQLite, signing and an actual foreign producer entry. Count membership,
release-provenance, receiver-policy, resolver, and turn/timer calls. A sound
ordinary act with null standing currently fetches its declared foreign fact;
assert unavailable authority with zero receiver/foreign reads and no head
change. That count fails at7177. A definitive Native local denial must obey
the same zero-read rule without disabling valid recovery/fallback.

Bind the Native subcase to the actual post-family form and shared predicate.
Current Register/Membership marks mostly consume local fields; do not invent
a deployed Native form with an extra foreign fact just to obtain a failing
test. If a mechanism fixture is needed to exercise a mark with fact inputs,
label the scripted rule/declaration boundary explicitly and seek root's
approval. The real fallback/recovery owners remain required regression proof.

Preserve accepted retry and mismatch with dependencies absent, authorized
foreign-fact retention and replay, dependency-unavailable on a needed failed
read, action-null grants, real recovery, last-admin guards, limit refusal,
head changes during standing awaits, and alarms that drain only on their
ordinary authorized path. Prefer strengthening existing assertions over
adding mirror tests for the helper.

## Owners and validation boundaries

Candidate census owners are `scope-index-census.ts`, `worker.ts:ScopeIndex`,
a strict settings decoder and deployment/runbook/settings references.
The projection alternative additionally owns `scope-index.ts`,
`object.ts:ScopeObject.registerKnown`, and trusted registration transport.
No new actor appears in `ScopeRegistration` or its public page by default.

Candidate Core owners are `core.ts:Scope.submit`, a shared derive authority
helper, and only the Native predicates whose local requirements are proved.
`derive/src/judge.ts`, `derive/src/marks.ts`, and the affected platform grant
owners need review if the approved sharing boundary changes them. Do not
change Native rule behavior or historical declaration bytes incidentally.

Whole affected owners include census, authority-order, answers, actual
Membership/recovery, and affected derive grant/field/judge tests. Derive the
full import/read-input compiler closure, aliases, and Node standing-check
owners from the actual successor. Preserve pools, workers and deadlines.
Run the two reviewed counted-read failures against the cited old source only
under a separately booked bounded control plan. Run no mutation sweep or
blind repeat. The eventual head owes static checks, one gate, exact-head
checker review, and maintained CI selected by actual source paths.

The security inventory currently seals `scope-index-census.ts` and
`scope-index.ts` as whole owners, `Scope` in core as a named owner,
`ScopeIndex` and module/import wiring in worker, `ScopeObject` if changed,
and `derive/src/judge.ts`. After reviewed source changes, use the maintained
source-only seal producer at an authorized slot and review the exact owner
delta. This plan neither produces new hashes nor changes the seal table.

I read the client-observation and outside-effects skills, their coverage,
README and models. Client Observation covers client/observe.ts publication,
not Core authority reads. Effects covers Operations pass/send/answer/offer
and SQLite markSent, not the prefetch gate. The proposed bounded owners sit
outside those protected functions. Preserve their bytes and record the
correspondence. No existing TLA+ result proves S5's zero-foreign-read rule.
If implementation changes those covered lifecycle boundaries, reread the
applicable skill, review correspondence, and book only its required model,
real-source witness and targeted control. Never stamp an unchecked coverage
hash or treat a source hash as a refinement proof.

All implementation and validation remain pending. The actual family may
change references, actors and rule fields, so this7177 plan is not a frozen
future selector. Rebase and re-audit before any source opens.

Builder only. Never as_planner. Never run rm -rf or rm -f.
