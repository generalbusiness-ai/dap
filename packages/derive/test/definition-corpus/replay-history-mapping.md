# Replay declaration registration

This shard covers raw positive declaration construction in the replay tests. It does not execute a Ledger, fixture history, judge, validator or test registration on import. Shared fixture data modules and raw changes supply both existing wrappers and corpus rows; no declaration value, digest constant, history input, assertion or deadline is intentionally changed.

`replayHistoryDefinitions` has a source-expanded 66 fixture-context rows and 66 corresponding replay-check contexts. This is a registration count, not an observed validation result or a claim about all possible definitions. Equal bytes retain distinct aliases and context. Construction uses existing default profiles and original platform options. Replay-check rows use RULE_PROFILES; made-up native owner data retains its actual empty outcome-domain mapping except the archive probe's shared declared evidence domain/max. Canonical bytes and digest generation remain the existing protocol functions.

## Source families

| Source | Positive raw declarations and arguments |
| --- | --- |
| world.ts | D desk; P and I ticket, three named aliases |
| staging.ts and verify.test.ts | Lane staging; Gate base and watched/rule aliases; placed proof; holding(1); holding(2); chained probe→after |
| weighing.ts and verify.test.ts | weigh, steps, absent, asked; retain all four aliases even though each pair shares bytes |
| archive-fixtures.ts | notes genesis; outcome-value gate; desk factory with staging digest and staging Lane; notes observation peer; reduced weigher with actual RULES_EXTENTS_VALUE |
| archive-anchor-ranges.test.ts | remarks platform data built from desk/lane; count/identity do not change its declaration |
| capacity.test.ts | large-text/redaction, unknown-items alias, whole-scope anchored receiver, two-byte-spans receiver |
| floor.test.ts | pulse/prove fixture and opt-in pulse/priced-keys declaration |
| child-definitions.test.ts | childDefinitions(true/false), retaining root/branch/leaf/extra aliases; native alias that retains declaration-domain values |
| genesis-bodies.test.ts | eight quiet acts base; whole=false/true genesis bodies; native alias retaining birth and body |
| recovered-bytes.test.ts | original max=40/32768; native text alias; child; transitive target; smallnotes child; sender using exact child digest; refusal target |
| text-refusals.test.ts | earlier-field proof receiver, despite its deliberately forged delivery-size refusal |
| view.test.ts | platform base, declared opt-in duties/finish-other, platform held/discard |
| decisions.test.ts | task base; early/late fields; redacted bare/applied/named/other/invalid/spent/known; floor-proof data with proving200/50 aliases |
| source-order.test.ts and late.test.ts | source-order baseline and late branch=false/true; timestamps and arrival permutations do not create new declaration bytes |
| verify.test.ts | reserved change source, unqualified receiver and declared:change receiver; other ordinary notes histories alias shared notes |

Native Register, Roster and Rulebook declarations imported by these histories retain their native/platform corpus owners and actual caller contexts. They are not re-created here as made-up substitutes. The central native/platform ledger must retain those origin aliases. Application package declarations have their own shard.

## Clear exclusions

- `verify.test.ts` unsupported durability live/sequenced and `definition-format.test.ts` deliberately unsupported format are invalid declaration controls. Their valid notes/Gate baselines remain covered.
- Entry/hash/signature/refusal/anchor rewrites in replay tests are corrupted or incomplete histories, not additional declaration definitions. A valid declaration used in a mismatching history is still included (for example short holding(1), reserved names and smallnotes).
- Body/value/snapshot payloads, retention descriptors, journal manifests, profile code, scope seeds and scope IDs are not definitions. Archive values are not silently registered as declared input.
- watched/ruled/derives/rule callbacks, body/count/size failure inputs, timestamps, arrival order, scope limits and proving positions do not change bytes unless their raw mutation explicitly changes the declaration. Their aliases remain in the source ledger where relevant.
- Unknown native versions, absent retained sources and wrong declaration/hash substitutions are refusal controls. The unchanged correctly hashed baseline is registered, not the intentionally damaged bytes.

The extracted 20 mutation callback bodies correspond to their original text, with only explicit free-variable parameters and shared existing domain identifiers substituted. All 262 original expect-containing source lines in the 13 changed replay history/test files remain unchanged after indentation normalization. These are source continuity checks, not runtime proof. Compilation, the finished corpus/paired control, affected owning files and final gate remain pending root allocation.


## Fixed replay validation contexts

The context-only successor registers the exact fixed bounds used by replay:
capacity's scopeItems 1; view's item3/request2 pair and separate item2/request1
negative-history ceilings; floor's entry155; actual Register entry21/92/93/97;
Deciding's base entry4/3 and field variant entry5. These 12 complete fixed
contexts use RULE_PROFILES and the original platform
option/owner domain maps. A replay capacity mismatch is a history refusal,
not an invalid definition. External owner reservation callbacks do not change
these definition-validation inputs; entry93 is shared by both owner policies.

Combined scopeBytes values in child closure and other replay families are
measured from actual history/declaration/body bytes. The child closure combines
namedDefinitions2 with its measured scopeBytes in the owning witness; no
projected default-byte corpus context is registered. Measured limit/limit-minus-one
arithmetic remains in its unchanged owning witness. Capacity, floor, recovered and genesis-body
history-measured byte limits are not fabricated corpus constants.

verify.test.ts's entryBytes1000 fault checks an oversized encoded target
entry I.0. verify.ts checks that byte ceiling before dispatching the entry to
#replay, where #pin first validates its definition. This encoded-entry negative
therefore stops before a definition validation at that bound; it is excluded
rather than represented as a positive validator context.
