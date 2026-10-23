# Platform fixture mapping

The existing platform test wrappers and their validation contexts remain in
place. Only raw declaration construction moves to
`packages/platform/test/definition-corpus-data.ts`. The corpus imports that raw
module rather than `support.ts`, `support-destination.ts` or `support-rules.ts`,
whose existing module initialization validates definitions and creates fixtures.

| Original raw source | Corpus family | Preserved context |
| --- | --- | --- |
| support.ts office | office | PROPOSED_BOUNDS, omitted profiles/options |
| support.ts officeDefinitionFor(named), called by Roster and Scope repository | each catalog membership target | Same raw office with only create.definition changed; existing platform-name guard and checked wrapper remain. This registers the pure parameter family for every supported membership target, including aliases, rather than claiming each target was historically called. |
| support-destination.ts bureau | bureau | PROPOSED_BOUNDS, omitted profiles/options; same NAME scalar and destination pin |
| support-rules.ts registrar and asker | registrar, asker | PROPOSED_BOUNDS, omitted profiles/options |
| support-rules.ts Rulebook creator | each catalog rules target | Same raw registrar with only create.definition changed. Constructor validation and actual named rules choices remain; registry includes supported parameter family and retains aliases. |
| application.test.ts declaration, child, root | small application, child, root→child | PROPOSED_BOUNDS/RULE_PROFILES. Root binds the exact child digest from the shared raw child constructor. |
| application.test.ts publication declared and wrong | destination required; directory optional | Complete declarations used in positive/negative publication policy tests. Wrong policy schema does not mean invalid native declaration. |
| definitions.test.ts asData | membership written role lists | PROPOSED_BOUNDS/PROFILES/platform:true. Exact original role-list/action-field replacements and effect filtering remain. |
| definitions.test.ts at32 | membership list bound 32 | Actual reduced listElements=32 with PROFILES/platform:true; not merged with proposed default bounds. |
| fixtures.ts checkedPlatformData(data), Roster, Rulebook and direct definitions checks | native shape context | All raw catalog aliases get explicit PROFILES/platform:true rows. This covers the existing parameter family; it does not assert that each alias was historically executed by every caller. Separate native.ts rows compile RULE_PROFILES and supply owner evidence domains. |
| definitions.test.ts destination evidence; support-destination destinationDefinition | destination@2 evidence domains | PROPOSED_BOUNDS/PROFILES/platform:true and exact outcomeValueDomains from that pinned code. The no-domain shape context remains separate. |

Application/install/counting/publication/demo/directory/invitation tests use the
same raw catalog definitions under either PROFILES/platform:true or
RULE_PROFILES/platform:true. Native catalog validation with actual owner domains
is separately registered by the corpus owner. The explicit shape-family rows
preserve the profile/options distinction rather than deduplicating only bytes.

Declared values never receive platform options. Native data are never renamed
into declared definitions to bypass marks or outcome evidence. No capability,
pin, field, role table, judgment, expected answer, lifetime, deadline or bound
changes. Existing `checked`, `validateDefinition`, native judgments and history
constructors still run at their original owning call sites.

The deliberately broken Directory declaration, native marks used without the
platform option, timed-opener missing/wrong-kind mutations and metadata-only
fake Seeds remain negative controls; none is registered as a positive raw
native declaration. Positive membership written-role data are included despite
being a validator-only witness with no derived entry.

Source-only implementation; no corpus, compiler, native history or test has run.
