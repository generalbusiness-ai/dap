# Application-author testing assistance

Source inspected: c44e311c2a31396e5c194e2fb20a8a7824e58bd3, 2026-11-04. This extends report 7f7def61. Read-only design advice; no source or tests changed.

The highest-value product is a shared application test kit: authors state business invariants and supply a small accepted story; dap supplies identities, valid inputs, setup, boundary variations, schedules, shrinking and runnable counterexamples. Support both declarative source and TypeScript authorship through the same compiled definition/package and portable scenario representation. Do not make authors retest Git framing, MCP wire shape, SQLite index algorithms or kernel reservation bookkeeping in each app. Those remain platform responsibilities.

## Current foundations

- docs/cli.md:394: dap check validates local packages, runs listed declarative scenarios, checks projections and replay, and reports explicit TEST authority. dap new emits a starter; dap dev runs the scenario as a preview. These form the development loop already.
- packages/cli/src/application-scenarios.ts: declarative local scenarios have explicit public TEST actors, symbolic facts/revisions, bounded steps, projections and replay. No arbitrary application scenario module is imported.
- packages/derive/test/fixtures.ts exposes Ledger, created, keys and grantOf through dap-derive/testing. The generic Ledger grants every actor every declared action by default. That is convenient for judge tests but needs explicit replacement in authorization scenarios.
- examples/lending/test-support.ts:8-15 repeats definition validation, founding, rule preparation/evaluation, signed submission and expected-revision setup. That is concrete fixture work the platform can absorb.
- spikes/typed-surface/story.ts:28-45 provides a typed story interface for expected act answers, retry, item assertions and projection recording, and emits the CLI's scenario format. It is a design witness, not a published supported authoring SDK. The projection method at :112 records observed state; that is useful characterization, but it is not an independent business oracle.
- spikes/typed-surface/lib.ts:656-669 already exposes per-act refusal metadata outside canonical definition bytes. That is a starting point for strategy discovery. Preserve exact semantics and pins unless an author intentionally changes them.
- Since the prior review, main includes independent MCP contract, Git framing and settlement-ledger work (d372812e0b, da94f45004, c44e311c2a). The application test kit can reuse their approach to seeds and schedules without exporting app-specific test models as general truth.

## Where framework assistance pays off

1. Valid fixture construction.
   Build public TEST actors, explicitly chosen action grants, parent/child scopes, real judged facts, detached values, and symbolic item names. Use a virtual clock and deterministic signer/intent IDs. Execute setup through actual acts. Never populate production state tables directly to create a supposedly reachable application state. A refusal should identify a broken fixture prerequisite separately from the business assertion.

   Default business scenarios should use explicit minimum action sets. Offer all-actions as a labelled convenience mode, not an invisible authority assumption. A wrong-borrower scenario needs another actor who still has the member grant; otherwise it proves only authorization.

2. Boundary input generation.
   Derive basic strategies from declared int/time/text/list/record types, defaults, requiredness and limits. Include UTF-8 byte boundaries, not just string character counts; absent versus null; min/max and one outside each. Build item and fact references from reachable setup histories, then deliberately vary scope/incarnation, type, head or revision for negative cases. Keep malformed bytes separate from legal application command histories.

   Arbitrary expressions cannot generally produce satisfying inputs automatically. Let an author provide a seed story or a custom value supplier for constrained fields. Report unreachable or inconclusive targets, including which earlier check prevented reaching the intended guard. Do not label an earlier generic refusal as coverage of a later business guard.

3. Guard-focused positive/negative pairs.
   Starting from an accepted command, hold grants, revisions, unrelated fields and dependencies valid while changing one business condition. For a borrower-only return policy, use two equally authorized members, borrow as A, attempt return as B with current revisions, require refusal and unchanged borrower/state, then return as A successfully. This policy is hypothetical: the existing Lending definition intentionally lets any member return.

   Crucial limit: deriving a test from a guard can show that guard works but cannot show the author included the right guard. The independently stated borrower-only policy must still fail if the guard is removed.

4. Stateful histories.
   Offer command generators for open/act/retry, advance-to-deadline, deliver, checkpoint and restart, with preconditions and dependency-aware shrinking. Authors add a small model or invariants about their domain: one borrower per thing; stock never negative; an approval belongs to the version reviewed; a terminal item never becomes borrowable again.

   Build legal commands from the current reachable state, but keep expected business transitions in the author's separate model. Count accepted, refused, unavailable, duplicate and skipped commands so a generator that does no work cannot pass silently. Report finite exploration, not exhaustive correctness.

5. Time and asynchronous schedules.
   Provide before/at/after deadline strategies, deterministic clocks, gated message ordering, duplicates, lost replies, unknown outcomes and restarts at named boundaries. A reservation app then checks expiry and late confirmation without sleeps. A review app explores stale approvals and changing manifests. A device app checks that a requested target never appears as a confirmed result until its actual owner answers.

   Do not promise eventual completion without stated delivery, time and capacity assumptions. Only vary delivery orders the platform actually permits; do not fabricate legal command histories from arbitrary recorded entries.

6. Projection and interaction checks.
   Let the author's domain model decide expected projection rows and offered actions. Generate pagination, empty/full states, exact text-size cutoffs and refreshes after acts. A model state can populate dap dev for interactive inspection. Keep observed-output snapshots separate from assertions about desired behavior.
   
   Platform-owned contract suites validate MCP Apps messages, view freshness and custody. App tests verify that their declared view offers the intended acts, shows relevant state and preserves application meaning. Pair a small selected browser set with the fast local tests.

7. Portable replay and runtime promotion.
   Use one portable scenario artifact for handwritten declarative tests, compiled TypeScript stories, generated failures, dap check, and dap dev. Include definition/package identity, public fixture actors, seed, time, schedule, symbolic dependencies, expected results and the failing invariant. A failure becomes a short ordinary scenario that an author can review and commit.

   Run most generated cases locally. Promote only relevant minimized histories to the real deployment runtime for transaction rollback, alarm scheduling, restart and transport lifetimes. Label scripted authority, native execution and external-provider evidence separately. The same journal replay is a consistency check; it is not an independent proof of the author's business policy.

8. Definition-change feedback.
   Compare canonical definitions and their strategy dependencies. A changed guard suggests accepted/refused pairs; a changed grant suggests role cases; changed sends/timers suggest ordering and expiry; changed projections suggest view assertions. Unchanged compiled semantics should preserve test plans even if TypeScript source layout changes. Avoid silently rewriting expected output after a policy edit. Existing scopes retain their old definition pin.

## Recommended common design

Create one test-only plan representation above the immutable application definition. JSON authors write a declarative plan using existing scenario assertions plus a small set of named generic strategies. TypeScript authors obtain typed act/field/item handles and can supply custom generators, predicates and small models in their trusted test process. That process emits the same portable scenario format for the CLI. Do not add arbitrary TypeScript execution to the declarative scenario loader.

Keep fixture mechanics, exploration choices and expected business behavior distinct:
- Fixture mechanics come from dap: keys, signing, grants, rule preparation, facts, revisions, clock, execution, journal and cleanup.
- Exploration draws from declarations and optional author hints: legal values, commands, boundaries and scheduling.
- Expected policy comes from the author: predicates, accepted/refused seeds, abstract transitions or an external contract.

Generated strategies can validate declaration conformance. They must not turn the production judge's observed answer into the expected business answer. A compiler-equivalence check can compare TypeScript output to pinned JSON or a maintained reference; a round trip through the same compiler is weaker.

Store strategy metadata and source locations outside canonical definition bytes. Emit source paths for JSON and TypeScript so a counterexample points to the act/guard/module an author can change. No testing annotation should silently change a scope's definition digest.

## Small, staged delivery

First: stabilize the shared scenario/fixture API and publish its supported boundary. Wrap repeated setup in one explicit harness. Add typed symbolic act/item handles and declarative equivalents. Retain JSON scenario interchange and the current CLI's execution safety.

Second: add schema boundary strategies and targeted negative pairs around author-supplied accepted stories, with honest guard reachability reporting. This provides value before a full model-checking surface.

Third: add bounded command histories, deterministic schedules and dependency-aware shrinking. Save each failure as an ordinary scenario loadable by dap check and dap dev. Use existing local execution; add only the native fixtures needed for the promised boundary.

Fourth: add impact-based selection and readable semantic coverage reports: which declared transitions, refusal witnesses and schedule boundaries ran, which targets remain unreachable, and which user invariants were checked. Do not make per-field or line-count quotas the acceptance target.

Acceptance should include two applications, one raw declarative and one typed, each adding a real business rule with a short accepted story and independent invariant. Remove the new guard: the same test must fail at the intended assertion. Vary names and input bounds without rewriting fixture plumbing. Replay the minimized generated failure through the CLI and inspect the same history in the preview. Measure author-written fixture lines, diagnosis quality and iteration time; do not judge the feature by generated case count.

No gate or suite ran for this advice-only follow-up. The earlier gate result belongs to a different source head and is not current verification evidence.
