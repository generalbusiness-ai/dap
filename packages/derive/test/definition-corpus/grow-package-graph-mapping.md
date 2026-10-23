# Grow package-graph corpus origins

Basis: immutable Main `f7b59bf9`. The raw constructors in `package-graph-data.ts`
and `package-graph-variants.ts` share the existing declaration expressions and
mutation callbacks with the owning tests. The tests retain their native
validation wrappers under `PROPOSED_BOUNDS` and `RULE_PROFILES`, with no options.
The corpus calls the raw constructors inside each named test.

`growData` preserves the original conflict and undelivered result edits, then
the supplied callback, child digest, all matching child-create pins, and the
parent's peer pin. `preFailureRelationData` retains the complete Leaf declaration
and both Site/Room changes. Its actual argument sets are `(false, 8)`, `(false, 9)`
and `(true, 9)`. The true case fails its package graph but remains native-valid.

The five named helper families retain all actual arguments: six lifetime
variants; repeated reporters with copies 3 and 2; automatic cycles with both
booleans; all four pairs of cycle alternatives; pending creation with both
booleans. Every good and bad graph input is positive at definition validation.
The 18 moved inline callback occurrences include the two-item factory at copies
3 and 6. Repeated identical declarations retain separate origin names.

The standalone Room with label maximum 81 is positive. Its digest also appears
as a deliberately mismatched peer pin in two graph inputs. Those Site and Room
declarations remain positive and are registered separately.

Changing only package roles, rights, order, connections, composition omission,
signatures, codec bounds, or release selection adds no declaration. Those cases
reuse the baseline or the named variants above. The two retained declarations
in the published Grow package are registered by the shipped corpus shard.

Exactly five future-form variants explicitly set `nativeValidation: false`:
P4 states, P1g reads, P2 spacing, P3 timed sends, and S3 sequenced. They test
unsupported native forms and are excluded from the positive corpus. Their
original test callbacks and refusal assertions remain unchanged.

No runtime result or global corpus completeness is claimed by this mapping.
