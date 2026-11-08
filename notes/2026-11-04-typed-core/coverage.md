# Frozen form coverage

Status: complete design inventory at `7135dc3985694760ff8c80ad07f200ba8f6e767d`.
M1–M2 implements only the first slice described in the contract. No production route has changed; the remaining rows retain their scheduled migration boundaries.

This inventory covers the admitted definition vocabulary and its rule boundaries.
It does not claim to enumerate arbitrary JavaScript rule bodies. The existing
validator governs which combinations are legal. A TypeScript union alone does
not establish admission.

`C` means inspectable composition, `P` means a typed domain primitive, `O` means
an explicit opaque rule boundary, and `S` means metadata or a surrounding judge
stage that remains in place. A row can contain more than one classification.
`M1` through `M8` name the finite deliveries in the [plan](../plans/035-2026-11-04-typed-derivation-core.md).

## Declared vocabulary

Source: `packages/contract/src/definition.ts`, interpreted through
`packages/derive/src/validate/` and the corresponding derive modules.

| Family | Complete constructor or member set | Treatment | Delivery |
|---|---|---|---|
| FieldType (15) | text, int, bool, time, enum, member, item, fact, scope, reference, digest, commit, tree, record, list | P descriptors; C records/lists; preserve all bounds, detached text, requiredness, and defaults | M1, M3 |
| ReferenceValue | document digest or entry fact reference, each with optional fragment | P existing citation value checks and normalization | M3 |
| Operand (14) | field, presented, slot, element, item, signer, sender, source, update, result, scope, intent, none, const | P reads; C resolved projections and binder references | M1, M3 |
| EntryPart (11) | ref, scope, seq, kind, intent, on, time, field, opened, set, carried | P reference/history/capability reads; C nested operand for set | M3 |
| Part | EntryPart; `{of: EntryPart, then: scope or seq}` | C projection after typed read | M3 |
| Where | equals, differs | P semantic equality; C operand children | M3 |
| Range | type, states, where, except | P current count/index/scan policy; C predicates and excluded subjects | M4 |
| Guard (21) | state, signer, notIn, set, unset, equals, differs, some, none, count, every, fact, before, after, rule, each, has, anyOf, distinct, sameSet, capability | C ordered combinations/binders; P domain tests and scans; O rule/capability bodies | M1, M4, M7 |
| Guard modifiers | of, ifPresent, reason | C subject/absence handling; P failure identity | M1, M4 |
| Guard variants | count min/max literal or Operand; fact field+where/presented/element; each where+guards; has where+optional guards; sameSet match+ordered; every field/slot list | C explicit children; P completion and ordering | M4 |
| Condition | if, unless | C ordered three-outcome policy | M1, M4 |
| EffectForm (8) | state, party, ref, value, attribute, hold, redact, capability | C ordering and conditions; P item checks/encoding; O versioned capability operations | M1, M5, M7 |
| Effect sources | explicit null; Operand; party operand array and add/remove; ref self; value time+plusSeconds | C typed sources; P absence, list ordering, reference and time semantics | M1, M5 |
| Effect modifiers | of; state name; attribute slot/of/with; hold open/renew/end and extent; redact slot; capability name/do/with | C source and condition children; P subject, hold, redaction, and ownership rules; O capability operation | M5, M7 |
| AuthorSource (4) | items+slot, subject+slot, each+as+list, list | C source expressions; P complete scans and author union | M5 |
| CapabilityArg (3) | Operand; each+as+value; items+slot | C inputs; P bounded collection; O capability result | M7 |
| SendSource (3) | self, Operand, collect(items, fields) | C sources; P complete scans and normalization | M1, M6 |
| SendForm (4) | create, tell, relate, index | C conditions and payloads; P cause, creation context, directory, fanout and ordinals | M1, M6 |
| Send members | create kind/definition(digest,platform,self)/fields/result; tell to(slot,of)/message/if/fields/result; relate each/to/name/item/state/if/detail/result; index fields | C typed children and clause roots; P destination, creation and output checks | M1, M6 |
| ResultClauses (5) | applied, refused, superseded, undelivered, conflict | C separate effect programs; S clause selection/reconstruction | M6 |
| Notify | slot, of, when before/after, reason, if | C condition; P selected-phase recipient derivation | M5 |
| AlsoRule (3) | by, via, one | S existing resolution; typed resolved handles and declared read metadata | M3, M8 |
| Subject | on, also.name, scope; each where the operand context permits it | C resolved handles and binder scope; S subject resolution | M3, M4 |
| Settles (3) | of+in; copy; of+sets+in | P before/after item test; S relationship-copy shell | M5, M8 |
| ItemType | many, max, states+final, initial, parties, refs, values | P opening/default/slot/finality/live-count semantics | M1, M5 |
| SlotRule and party details | fixed, required, capability; list, max, author | P assignment and ownership constraints | M3, M5, M7 |
| ActType | open/transition/comment; on, also, fields, presents, grant, settles, guards, effects, sends, attention | C body; S input checking, resolution, grant, presentation, settlement shell | M1, M8 |
| ReceiveType | late(within,reason,then); order arrival/source; message, class tell/relate/advisory, from(kind,under,pin), fields, opens, copies, also, settles, guards, effects, sends, attention | C normal and late bodies; S source order, binding, replay reconstruction, copies and freshness | M6, M8 |
| TimedRule | on, states, deadline, effects, attention | C effect program; S due-row selection and totality admission | M8 |
| Definition root | format, level, capacity, name, profile, capabilities, genesis, items, acts, receives, timed, rules | S validation identity; O prepared rule texts; C body roots | M8 |

The validator currently admits `recorded@1` durability and the legacy capacity
form or `whole-scope@1`. The broader `level` type does not admit live or sequenced
durability. Preserve profile and capability support checks. Do not enlarge the
language during migration.

## Platform vocabulary

Sources: `packages/contract/src/platform.ts`, `observes.ts`, and
`packages/derive/src/marks.ts`. M7 represents hooks at their existing positions.
M8 checks that the retained shell supplies every hook's original context.

| Family | Complete alternatives or members | Treatment |
|---|---|---|
| Seven mark places | grant, also, type, guard, effect, send, outcome | O named, versioned hook and original fault behavior; C surrounding forms |
| GrantMark | code, row, optional grant fallback | S current grant-first policy; O fallback rule |
| AlsoMark and BindingMark | item; index and key for binding | S resolution and indexed candidate restriction; O selector |
| TypeMark | type code, code, row | O value check with existing identity and assignment rules |
| Effect mark and MarkMost | effects, operations, opens | P output bounds, conflicts, operation/attempt joining, and reservations; O result |
| SendMark | result, always | C clause roots; P null/send validation, ordinal, required presence; O result |
| OutcomeMark | send, attempts, most, origin, observes | S outcome dispatch and capacity; O rule |
| OutcomeSend | result effect marks, once | S once policy; O send and clause effects |
| PlatformAct | marked forms, coded/value-place fields, observes, adds | S observation and held capacity; C body; O hooks |
| PlatformReceive | marked forms, coded fields, bound(of,where) | S binding policy; C where/body; O hooks |
| PlatformItem | coded slots, indexes, holds | P slot checks; S index and capacity metadata |
| Held | operations, requests, items, decisions | S reservation accounting |
| PlatformTimedRule | opens reservation-delete/mint with attempts | P existing destination-specific opener; S restricted admission |
| StandingReservation | item, slot, entries, max | S monotone capacity accounting |
| ValuePlace | digest value(domain,max) | S retained-value requirements; O native value reads |
| Observe (5 shapes) | member from SubjectSource; key/member from rule (+second); rules (+retains); definitions; holders(action,most) | S freshness/retention, window/use/without; C SubjectSource; O rule-selected subjects |
| SubjectSource | Operand; each+as+value | C typed source/body |
| ClauseObserves | applied, refused, superseded, conflict | S retained observation inputs; no undelivered observations |
| Origin | opening, rule | S existing uses provenance; O rule origin |
| PlatformRule | grant run/refusals; also run or bind; type run; guard run/refusals; effect run/most; send run; outcome rules; optional clock | O typed hook signatures with full supplied context |
| RuleEffect (8) | open, state, party, list, ref, value, operation, attempt | P returned-effect validation and encoding |
| OutcomeRule | reservation, valueDomains, values, selects, read, closure, most, ready, beforeSend, publicationOrigin, retries, holds, wellFormed, unknown, derives, origin, subjects | O callback interiors; S scheduler, evidence, observation and reservation hooks |
| PlatformRules | named, rules, floorReferences | S version identity and retention floor; O callback |

Invalid combinations remain invalid. Examples include bound handlers with
source ordering, a pin, or a late policy; timed capability effects or marks;
and observation rows on `undelivered`. Timed operation opens remain restricted
to the existing destination publication forms and exact bounds.

## Capabilities and prepared rules

Source: `packages/contract/src/capability.ts` and existing capability validation.
M7 uses opaque, versioned boundaries with typed argument trees. Records, steps,
reserved requests, owned slots, and runtime support checks remain in their
current owners. Shared declarations do not merge versioned semantics.

| Version | Records | Guards | Effects | Preparation steps |
|---|---|---|---|---|
| hold@1 | root, pin, check, receiver-pin, fork, token, instance | staged, pin, license, settled | pin-hold, pin-release, license, settle | stage, check, instance, token, retire, retry |
| hold@2 | root, pin, check, receiver-pin, fork, token, instance | staged, pin, license, settled | pin-hold, pin-release, license, settle | stage, check, instance, token, retire, retry |
| git-read@1 | token | ancestry | none | job-read |
| device-command@1 | command | allowed | open | answer |

Retain hold receiver-pin request reservations and device-command numbered
answer reservations. Device-command owns `outcome` and `outcomeAt` slots.
Capability arguments, record state sets, refusal names, and implementation
availability remain authoritative in the versioned table and runtime. A template
string that spells another version does not establish runtime support.

Declared `rules` retain their restricted JSONata source, preparation algorithm,
fingerprint, and budget behavior. The typed program exposes the rule invocation
and prescribed inputs. It cannot claim a derivative, exact dependency set, or
internal explanation for the source expression.

## Completion rule

The migration ends when every admitted constructor above has an inspectable
composition, typed primitive, or named opaque boundary at its existing site;
every retained shell requirement has an explicit input/metadata contract;
all body execution routes use the new representation; and the obsolete form
walkers have no production callers. Corpus lowering plus behavior witnesses
must establish this coverage. Counting syntax rows alone cannot establish it.

Execution remains complete through opaque primitives. Explanation remains
truthful but coarse at those primitives. Dependency analysis remains conservative
and can return unknown. Differentiation and exact cost analysis require a
separate supported-primitive contract. They are not completion conditions here.

`baseline.json` records hashes of the reviewed contract and semantic sources.
Run `node notes/2026-11-04-typed-core/check-baseline.mjs` to detect source drift.
The check verifies frozen bytes, not semantic completeness. Any changed source
requires review of its inventory rows and witnesses before refreshing the hashes.

## M5 implementation mapping

The vocabulary above stays frozen. The
[M5 implementation record](../implementation/2026-11-07-typed-core-m5.md)
tracks its source draft, evidence, and remaining gate and review obligations.

| Boundary | Current source and treatment |
|---|---|
| Eight ordinary effects and four attribution sources | `validate/effects.ts` records `program/effect-plan.ts` instructions from its existing successful branches. `effects.ts` executes them with the shared item, value, range, history and Native joining leaves. |
| Hold form | `validate/hold.ts` reports its already-validated action and extent read to the effect recorder. `deriveHold` retains the concrete operation. |
| Effect and attention conditions | `program/structure.ts` captures actual groups and lexical identities after final admission. `program/condition-value.ts` preserves before-state order, recursive unbound skips, and incomplete results. |
| Attention recipients | `validate/sends.ts` records the resolved slot, phase and reason; the effect executor derives recipients from that instruction. Send interpretation stays in M6. |
| Item settlement | `validate/handlers.ts` records body-owned state or once-mark plans. `program/settlement.ts` holds the shared before/after decision. Relationship-copy orchestration stays in M8. |
| Returned Native effects | `outcomes.ts` enters the existing joining leaf through `joinReturnedEffects`, without presenting fabricated forms as admitted syntax. Native interiors stay in M7. |
| Clock summary | `declaredClockReads` uses the same owned value source as execution and still visits every declared condition. Callers also retain actual Native `ran.clock`. |

Production instruction coverage does not extend the first-slice prototype's
`lower`, `explain`, or `dependencies` grammar. Unsupported forms still reject
the whole prototype body. No precise dependency or explanation claim follows
for an opaque rule, capability interior, attribution, or settlement.

## M6 source checkpoint

The [M6 implementation record](../implementation/2026-11-07-typed-core-m6.md)
records closed ordinary send plans, actual send occurrences and future result
roots, the explicit Native join boundary, and reservation attribution. Production
send and clause execution now uses those admitted instructions in the local
candidate. This extends execution coverage without extending the prototype
explanation or dependency visitors. Their whole-body unsupported result remains
conservative. Native interiors remain M7 work, and final orchestration remains
M8 work. Focused owners, exact-source Page CI, and the single M6 gate pass. Independent
review and landing remain pending.
