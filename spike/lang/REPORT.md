# T1 declaration layer: stop report

T1 stops with a counterexample at candidate
`22444f8536a8932fc758d77bb614a1424635fec3`. Its accepted Sale declaration
confuses the recipients of a counter with the recipients of another person's
refused terms. The unchanged Sale privacy budget catches the disclosure;
the generated budget accepts it. No compiler, declaration, generated module
or runtime semantic change follows that finding.

This is a negative result for this candidate at the pinned boundary, not a
proof that every declaration layer must fail. The plan's stop rule applies.
T2 and T5 should use hand-written packages if commissioned. They are not
started by this report. The fresh author trial, notation trial and any claim
about authoring cost remain uncommissioned.

## Boundary and result

The experiment starts from main
`9c4e04e52ca9f16d3014c9d7d79a148bd039123e`, with the plan's unchanged
`7051486e` foundation boundary. All changes are under `spike/lang/`.
`src/`, `fixtures/`, `manifests/`, `corpus/` and the original `test/` files
are byte-for-byte unchanged. The historical witness boundary records their
SHA-256 hashes in `evidence/witness-boundary.json`.

The first draft was committed as `6a82d61c` before the first compiler,
checker, test or generated-output inspection. The builder had read the
fixtures, repairs and plan; this was not a fresh-agent authoring trial.

| Claim | Outcome at this boundary | Evidence |
|---|---|---|
| A1: derivations reproduce repaired Sale under its frozen manifest | Counterexample | The frozen Sale campaign fails five seeds; unchanged V3-F1 also exposes a private-projection regression |
| A2: diagnosed shapes, regressions and preventions | Unresolved as a complete claim | Four diagnostic shape checks, eleven historical checks, derived tombstones and literal readership pass. The stopped minimal bad-shape declarations and component tests do not establish the entire promised derivation/prevention contract |
| A3: no accepted declaration yields a campaign visibility violation | Counterexample | Accepted Sale fails seeds 35, 56, 105, 110 and 135, with 81 budget findings across frontiers; Booking passes all 200 seeds |

No foundation change was made. The demonstrated defect is in the declaration's
reader policy and the compiler's unchecked relationship to the independent
privacy promise. This result does not show a need to extend the foundation.

## The retained counterexample

`evidence/stop-witness.json` contains the literal `Step[]`, candidate package
identity, diagnostics, verdict, readership and both checker results.
`test/stop.test.ts` asserts each of those observations; it does not merely
print them.

1. Alice invites Bob and Carol as Buyers, and both accept.
2. Bob records public offer `o1` at position 6.
3. Carol submits `offer_terms {offer_id: o1, amount: 777, seller: alice}`
   at position 7.

The fold correctly refuses position 7 with `not_author`. Nevertheless the
shared `sale-parties` audience includes the actor, seller and referenced offer's
author: Carol, Alice and Bob. The frozen Sale manifest allows the terms to
Carol and Alice. Bob reads a private refused payload he should not receive.
The unchanged checker reports exactly:

```
bob@7 budget: bob can read the sale.offer_terms at 7, whose parties are carol+alice
```

The declaration check returns `[]`, and the derived privacy budget returns
`[]`. Deriving both enforcement and checking from the same mistaken maximum
reader declaration does not independently validate that declaration against
the manifest. The missed case is an audience policy for a refused attempt
that selects an unrelated reference's party, not an absence or aggregate.
It refutes prediction 3's proposed class of missed expression.

The hand-written Sale is a clean control: it refuses the same attempt, Bob
cannot read it, and the checker is clean. Removing any single step from the
six-step witness removes the failure. The witness test asserts this deletion
minimality; no general minimality claim is made.

## Recorded checks

| Check | Result |
|---|---|
| Unchanged main, run independently by the coordinating builder | 517 tests: 513 pass, four existing TODOs, zero ordinary failures; normal typecheck passes |
| Strict `lang/tsconfig.json`, including all language sources and emitted modules | Pass |
| Layer checks | 23/23 pass; includes count and absence at each of five sites, local aggregate scope, version ordering, split linkage, derivations and total Sale audiences |
| Exact historical witness checks | 11/11 pass on their first invocation; no witness repairs |
| Evidence-only stop checks | 8/8 pass, meaning the retained defects reproduce and their controls/regressions hold |
| Retained failing campaign scripts | Five full scripts replay to all 81 recorded budget findings |
| Original Club A1/A5 negative checks | Three ordinary tests pass, four executing TODOs retain their original policy failures |
| Frozen Sale and Booking test bodies through candidate-only loader | 34 tests: 32 pass, two Sale failures; 200 seeds per model; 392.7 seconds total |


| Campaign | Seeds | Entries | Failing seeds | Findings |
|---|---:|---:|---|---|
| Derived Sale | 200 | 11,069 | 35, 56, 105, 110, 135 | 81 budget findings across frontiers; no equality, pause or invariant failures |
| Derived Booking | 200 | 12,000 | None | None |

The complete five failing Sale scripts, genesis nonces and every finding are
retained under `evidence/sale-campaign/`; their replay tests do not regenerate
them. All five concern terms delivered to a referenced offer's author despite
the refusing actor being someone else. Sale made zero private disclosures in
this campaign. Booking covered 652 effective occupancies (471 linked to
requests), 324 effective cancels and 1,630 clock ticks. Passing Booking's
campaign establishes its bounded prevention result, not general soundness.

The other frozen-suite failure is V3-F1: after authorized hostile disclosure
of Bob's terms to Carol, the original projection still returns `amount: null`;
the generated query returns `700`. The reader annotation is checked statically
but `privateValue` only evaluates its child at runtime. It does not derive the
party-based projection mask the original fixture requires. The unchanged
privacy budget detects the disclosure; this remains an additional uncorrected
A1 regression. `test/stop.test.ts` retains it with a hand-written control.
The suites' printed historical repair totals belong to their original ledgers,
not to T1.

The historical tests pin Dana at frontier 7 in Sale run-1 seed 158, including
`accepted: o3` versus `null` and `no_such_offer`; Dana at frontier 20 in
manifest case 3; run-6 seeds 172 (Carol at 4), 181 and 200 (Bob at 4); and the
wrong-party effective run-1 counter with Carol's budget violation at 7.
They retain tombstone seeds 72, 96 and 172 at position 4. The exact
`fd1e23b` source reproduces Bob's missing position 10 while the checker is
clean; only the required readership detects that under-delivery.

The derived Sale separately preserves all three tombstone regressions and the
literal trace's readership, including Bob at 10. A deliberately narrowed
emitted offer audience is detected by the unchanged checker, with a clean
control. Original Club A1 and A5 tests are unchanged; Club is statically
refused for the members-visible vote's hidden application reference. Its
omitted business guard is not caught or repaired by the visibility check.

The loader in `test/derived-loader.ts` redirects exactly the two current
fixture module URLs to their generated counterparts. Test bodies, manifests,
checker and generator are unmodified; historical models retain their own URLs.
This mechanism selects a candidate and does not change an expectation.

## Repairs, effort and limits

`evidence/ledger.md` records every invocation and correction. After the first
draft there was one semantic compile-caught repair: distinguish a payload
lookup key from a payload-supplied recipient. Its class is audience derivation
from asserted payload; blame is the layer, not another party's client.
One diagnostic-only correction selected the V3-F2 witness rather than the
late-joiner witness. Type-only issues and loader-compatible exports are
recorded separately. No checker-caught semantic repair was made after the
counterexample.

Pre-freeze design work also cost effort. Review identified three gaps before
`6a82d61c`: derived-column expressions were missing; mixed-reader columns
needed an actual linked split builder; and a sibling row read incorrectly
exempted an aggregate from complete-relation checking. Those were addressed
before execution. Their placement before the first commit does not make them
costless. The independent witness work, historical-source recovery, compiler
and runtime construction, manifest-loader adapter, repeated strict checks and
counterexample reduction also form part of the effort.

| Text measured | Source lines | Source bytes | Emitted lines | Emitted bytes |
|---|---:|---:|---:|---:|
| Sale declaration | 50 | 6,585 | 1,748 | 48,667 |
| Booking declaration | 35 | 5,585 | 1,308 | 40,666 |

The hand-written fixtures have 389 and 337 lines respectively. Sale's literal
line count meets the under-one-fifth prediction, but the declarations use
long, dense lines and share a substantial layer: 132 compiler lines, 187
runtime lines, 61 schema/builder lines and 34 split-builder lines at the
candidate. This is not a measured authoring-cost improvement. Generated code
inlines the runtime so descriptor identity covers executable helpers.

Incomplete gates are not converted into passes. The stopped layer has no
claim to a complete schema validator or general symbolic proof system.
Affordances use the actual fold guards over declared candidate payload domains;
that proves offered candidates pass those guards, not that every possible
payload has been covered. The bad-shape declarations are minimal diagnostic representations, not full
reimplementations of the retained historical models. Their replay evidence
uses those exact historical models. The compiler's negative operator tests do
not prove that arbitrary untyped expression objects are safe. The report makes no
production, human-comprehension or general soundness claim.

To reproduce the core negative result from `spike`:

```
node --test lang/test/layer.test.ts lang/test/witnesses.test.ts lang/test/stop.test.ts
npm exec -- tsc -p lang/tsconfig.json
```

To reproduce the recorded frozen-suite experiment:

```
node --import ./lang/test/derived-loader.ts --test test/sale.test.ts test/booking.test.ts
```
