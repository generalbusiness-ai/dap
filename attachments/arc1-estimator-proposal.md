# ARC-1 estimator proposal

This is a source-only proposal for planner review. It changes no archive driver, eligibility, admission or refusal. Existing eligible data and accepted application behavior remain unchanged. The landed ARC-1 note proposes thresholds, not a proof.

## Unit and aggregation

Price one complete monotonic progress unit from an actual immutable confirmed receipt and parent through selection of the next legal complete prefix and its confirmed publication. Include source preparation, declarations and authority, every candidate examined, lookahead and discarded work, retained/text/foreign reads, parent validation, provider preparation, mark, send, readback and terminal bookkeeping. Sum charges on the same ledger using checked arithmetic. Count repeated work each time its owner charges it. Deduplicate only when checked full identities and the actual visited/retention lifecycle prove a shared charge. No fresh finish budget, partial-publication assumption or inferred provider success is permitted.

Derive each component from the actual charge owners rather than multiplying observed pass costs:

- **entries:** all inspected and selected positions plus any required suffix and repeated selection (`packages/scope/src/archive-prefix.ts`).
- **attempts:** every source lookup, foreign copy, retained/text read and journal/provider attempt (`archive-source-pins.ts`, `archive-foreign.ts`, `archive-retained.ts`, `archive-text.ts`, `packages/git/src/journal-objects.ts`).
- **nodes:** separately charged distinct source, declaration, anchor and journal nodes (`archive-foreign.ts`, `archive-declarations.ts`, `archive-anchors.ts`, `packages/git/src/journal-v2-reader.ts`). Apply sharing only at each owner's real visited set.
- **calls:** SQL and every native, provider and parent operation, including confirmation (`archive-budget.ts`, `archive-host.ts`, `archive-row.ts`, journal owners).
- **metadata:** each reservation/settlement and retained or copied maximum canonical UTF-8 encoding, including nesting, escaping, framing and identifiers (`archive-budget.ts`, `archive-entry-metadata.ts`, `archive-declaration-scout.ts`, `packages/git/src/journal-selection-cost.ts`).
- **inputWork:** sum each owner's parse, validation, SQL projection, copy, sort, preparation and serialization multiplier, including repeated and retained work (`archive-budget.ts`, `archive-bootstrap-cost.ts`, `archive-anchors.ts`, `packages/git/src/journal-pass-cost.ts`).

The first recheck is **nodes**. The measured independent maximum is 66, the proposed threshold 96 and the current default 128. Compute a union of actual separately charged node sets for one complete unit, preserving independent full ScopeRefs and declaration digests. The 64 source-pin cap in `archive-source-pins.ts` is a refusal limit for that component, not a total-node or success bound. A cap or overflow produces an unknown/exceeded estimate, not evidence that a legal unit fits. Recheck the other five axes and the original 30-second deadline independently after a finite shape is proven.

## Existing coverage and unknowns

`packages/git/src/archive-policy.ts` lists exact native pin/data pairs. Directory 16–19, 25, 27, 28; Rules 10–12, 15, 16; Destination 12–15, 19, 21; and Register 20 appear in that list. Register 20 is a separate eligible producer row, not a fifth measured family or proof of a measured Register maximum. Exact signed installed release selection can admit the measured Lending 0.6.0 family through `roomArchivePackages`; it is not a native pin row. Pin membership does not establish export authority, privacy, source completeness or estimator eligibility.

- **Directory:** unknown maximum genuine founder, authority and independent source graph, prior parent and canonical byte closure. Fifteen ordinary-founder cutoffs do not bound it.
- **Rules:** unknown transitive checker Membership/authority source graph and sharing, retained closure and escaped bytes. The 32-checker sample shared one Membership and cannot bound independent memberships.
- **Destination:** unknown maximum legal founder-list and certificate source graph, matched family and retained outcome closure. The failed v11 attempt is no cost witness.
- **Lending:** unknown maximum over every admitted act and rule, authority ancestry, release closure and escaped payloads. The tested donation had no foreign facts.
- **Register 20:** exact producer row exists, but no bounded unit or dedicated retained measurement is established by the landed note. Treat its estimate as unknown, without changing its current admission.

The six current operational caps and independently observed maxima in the landed note are limits and measurements, respectively. Neither supplies the missing declaration-to-progress-unit maximum. If an input or checked sum is unavailable, report the estimate as unknown for that family. This proposal does not create `archive-envelope-exceeded` or alter any existing application/archive eligibility.

## First proof input

Prioritize a checked maximum for the **distinct node identities and their reachable birth/declaration/authority closure for one Rules 12 publish with 32 independently valid checker memberships**. This tests the narrow nodes margin and the largest currently unmeasured correlation in the highest input-work sample. Start with Rules 12's pinned declaration and publish transport in `packages/platform/src/rules-scope-v11.ts` and its policy/checker validation in `packages/platform/src/rules-policy-v13.ts`, then trace exact source preparation and charging in `packages/scope/src/archive-source-pins.ts`, `archive-foreign.ts`, `archive-declarations.ts`, and `archive-anchors.ts`. Include actual Register/Directory/Membership birth constraints and distinguish full `(scope, genesis)` identities. Prove each required equality or independence from admission, not the fixture's shared Membership. Include declaration-node and anchor-node counts under their separate visited sets. If current admitted metadata cannot bound transitive ancestry or checked node sharing, state the exact missing input and stop; do not replace it with the 64-source refusal cap.
