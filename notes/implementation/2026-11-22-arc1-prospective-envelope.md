# ARC-1 prospective archive envelope

Decision `95436ee0ab8de28070b404a8e2d8c8ab74a660da` selects B, a prospective admission envelope. The proposed values and boundary are for planner review. A later implementation needs bounds that prove admission can enforce the envelope.

The [archive remedies comparison](2026-11-21-arc1-archive-capacity-amendment.md) records the accepted earlier widest-entry measurement and both remedies. The proposal uses the existing archive pass limits and deadline of 30 seconds.

## Candidate thresholds

The table includes every retained pass in the covered measurements, including prefix passes and the Destination 15 certificate outcome. The maxima are independent per-axis maxima. They do not describe one pass. The proposed thresholds leave room above every listed observation and below each existing ceiling. They are review values, not derived universal bounds.

| Axis | Largest observed | Proposed envelope | Observation to envelope | Current default | Envelope to default |
|---|---:|---:|---:|---:|---:|
| Entries | 21 | 32 | 11 | 4,096 | 4,064 |
| Attempts | 157 | 192 | 35 | 512 | 320 |
| Nodes | 66 | 96 | 30 | 128 | 32 |
| Calls | 551 | 768 | 217 | 16,384 | 15,616 |
| Metadata bytes | 2,603,832 | 3,145,728 | 541,896 | 4,194,304 | 1,048,576 |
| Input-work units | 87,072,715 | 117,440,512 | 30,367,797 | 134,217,728 | 16,777,216 |

The proposed entries and calls limits replace the initial 8 and 512 because the real Rules prefix passes charged 21 entries and 551 calls. The other provisional limits already exceed the observed maxima. The metadata and input-work thresholds reserve one quarter and one eighth of their respective default ceilings. That arithmetic is a margin, not a proof that the remaining work fits. The 30-second deadline is a separate condition; none of the six counters bounds elapsed time.

## What the samples establish

All samples used the original pass ledger and Native journal state. Artifacts and Git, clocks, and scheduling were local test fixtures. They do not establish hosted throughput or provider availability.

- Rules 12 `publish` used five facts from three scopes, with 32 checker configurations sharing one Membership. Its candidate pass used 87,072,715 input-work units. Earlier prefix passes produced the entries, calls, and metadata maxima in the table. Independent checker source correlations and all other source preparation remain outside this sample. Evidence `2106ca59`.
- Signed Lending 0.6.0 installed through Native Rules and trust. Its maximum-field ASCII `donate` used no foreign facts and confirmed after a real prefix. Other acts, escaped strings, authority geometry, and total worst-case work remain unproved. Evidence `b2c942e7`.
- Fifteen genuine Directory cutoffs confirmed separately in the existing shared Base fixture. That fixture used an ordinary founder, not a maximum founder. Evidence `fa2d5d8e`.
- The matching Destination 15 certificate used three distinct facts from three scopes. One pass confirmed the certificate and one real outcome together. The cost is for both entries. Evidence `68fc6d37`.
- Destination 21 admitted a 256-byte founder handle for one signing key. Its genesis had two distinct facts from two scopes. One pass confirmed genesis and one queued suffix. The 32-key founder-list form and the certificate act were not measured. Evidence `428c649d`. The earlier Destination 21 v11 certificate candidate lacked a lawful matching family and produced no candidate archive measurement. Evidence `9c8e9afe`.
- The local J4 manifest was outside the covered policy set. Planner ruling `bd91ac8a` excludes J4 from this comparison and does not change its archive policy.

These samples do not establish the maximum possible source graph, authority history, canonical byte count, or cost of an archive-covered declaration. A sample that confirms says nothing about other accepted entries under that declaration.

## Proposed admission rule

Add an archive eligibility decision at certification, after validating the exact definition and release and before registering archive eligibility. Apply the same check before adding a new native archive policy to the platform catalog. The platform derives the envelope from the validated declaration and checked policy. The Room archive runtime already resolves exact signed release proof and registers policy in `roomArchivePackages`. It can consume the certified eligibility decision when preparing a pass. The proposed certification check precedes that runtime step.

If any required bound is unavailable, arithmetic overflows, or any axis exceeds its threshold, refuse archive eligibility with the closed reason `archive-envelope-exceeded`. This proposal uses the same refusal for an unknown bound and a known excess. It does not prescribe a new wire form or change admission of an existing pin. A new declaration is eligible only when every required bound is established and all six axes fit. A future implementation must specify how that refusal reaches the installation caller before changing the contract.

The estimator must price a complete bounded progress unit, from the actual prior confirmed receipt through final confirmation. It must include source discovery and validation, creator and authority chains, observations, uses and births, declaration and policy support, retained values and text, current parent and append validation, provider preparation, mark, send, readback, and the terminal bookkeeping that releases the unit. It must price each step on all six axes, including repeated work. Deduplicate only when checked identities and actual retention rules prove that work is shared.

For bytes, use the validated maximum canonical UTF-8 encoding, including JSON quoting and escaping at each nesting level, framing, encoded identifiers, and all separately retained copies. A character count or an unescaped field size is not a byte bound. Derive the maximum transitive fact and source references from actual typed fields, observations, sends, native rules, and their bounded dependencies. A 64-source cap is a refusal boundary, not proof that an allowed 64-source graph fits the pass. Count metadata, input work, graph nodes, attempts, calls, and entry operations separately. Use checked arithmetic and the exact existing cost owners.

A progress unit is acceptable only if a separate proof establishes its finite shape and that the driver can finish and confirm it within one original pass. This note does not change the driver, authorize partial publication, or assume such a unit exists. Existing entries that already exceed a future envelope remain unchanged and may still block the confirmed frontier. Their recovery needs a separate decision.

## Proof required before implementation

The implementation proposal must establish the unit's boundaries and the complete cost formulas for each supported native and installed policy. It must cover the actual source and creator graph, independently varying authority and checker references, maximum accepted canonical bytes, immutable parents, privacy classifications, and pending or changed policy. It must prove that every mandatory final step fits alongside the unit rather than using a fresh uncharged budget. It must also state which provider responses or failures can prevent completion and how a monotonic deadline is enforced. Availability, successful provider response, and wall-clock completion are not guaranteed by counter headroom.

If no useful proven envelope fits these thresholds without excluding required declarations, return that result for another planner decision. Do not raise a pass cap or treat these samples as a proof of an admission guarantee.
