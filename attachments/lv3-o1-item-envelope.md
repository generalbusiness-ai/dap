# Scratch: fixed item envelope for live O1

This gives a pure validator-local calculation, not a code change. Use `Type`, `Slot`, `Bounds` and `mostBytes` where `format-1.ts` still holds `d.types`. Return an internal map from type name to a checked integer envelope. No export or admission change is needed for this prototype. All addition and multiplication below must reject overflow. `mostBytes` supplies established per-type bounds; this proposal still requires tests that those bounds cover all admitted field values and canonical escaping.

## Encoding algebra

Let `C(v)` be canonical UTF-8 byte length. Let `Q(n) = 2 + 6*n`: a conservative bound on the canonical JSON string encoding of any well-formed string of at most n UTF-8 bytes. Each input byte accounts for at most one six-byte JSON escape; this is derived from the encoder, not an empirical multiplier. Let `A(x1,...,xn) = 2 + max(0,n-1) + sum(xi)` for an array, and `O((k1,x1),...) = 2 + max(0,n-1) + sum(C(ki)+1+xi)` for an object. These take already encoded component lengths. For a stored map key or string value whose contents are themselves canonical JSON of length `n`, pay `Q(n)`, not `n`: this accounts for quotes, backslashes and control characters on the second encoding. Apply Q again if that string is embedded in another canonical key which is itself encoded as a stored string. For statically known declaration names and modes use `C(name)` exactly within constructed JSON; if that constructed JSON becomes a stored string, Q covers its next encoding. `N=20` is the existing `mostBytes(int)` safe-number bound; `H=73` is the existing digest bound. State the separate invariant that ids, revisions and counts remain safe integers, or derive a valid finite-Number representation bound and handle its overflow behavior. No such safe-tick guard is established by this sketch.

The meter represents each map as independently encoded key and value records, each set/array member as a separate encoded record, and container punctuation per record. An implementation must define that framing once. The formulas below include array/object punctuation; per-map/per-set framing must also use a specified finite encoding, not an unpriced JS object allocation. Shared keys, shared row values and deduplicated counts get no discount. Definition-wide constant material (including empty buckets and zero counts) is accounted separately, not multiplied by the number of current items.

## Number of possible local fact dependencies

```
deps(reference) = 1                 // entry variant has exactly one FactRef
deps(fact)      = 1                 // conservative; live validation rejects it
deps(list of T, max m) = min(m, bounds.listElements) * deps(T)
deps(record of members) = sum(deps(member))
deps(other admitted primitive) = 0
```

Optional members are all present for the upper bound; null or missing slots contribute no dependencies. FactRefs of different raw values may deduplicate, which only lowers usage. The reference shape has exactly one `entry` or `document` and a string fragment. `fixedValueOf` traverses nested records and lists, so the recursion counts actual potential local FactRefs even when typed `fact` is disallowed. Party slots have member or list-of-member type and hence zero. Check the `isFactRef`/MemberRef shapes remain disjoint before relying on this last claim. Unknown/marked field types have no finite bound and must yield no envelope; ordinary live definitions do not admit platform marks.

## Per-type calculation

For a slot s, `V_s = max(C(null), mostBytes(s.type, bounds))`. The party list's synthetic type is already in `Slot.type`. Bound the item without attribution by constructing the canonical object from its exact field names and:

- id and revision at N, `opened` at max(H, C(null));
- type at C(type.name), state at the largest C(state name);
- `parties`, `refs`, `values` as objects with each declared slot name and V_s;
- `attributed` as the empty array. The meter charges each actual attributed member separately, including the difference between an empty and nonempty array.

Pay separately for the item-map key and value, plus one state-index element and, pessimistically, an entire `[type,state]` key for that item. Charge the persistent empty state-index keys and zero count rows once per declared state globally. The current item envelope includes final items.

For each fixed slot s define:

```
I = A(C(type.name), C(slot.name), N)  // bytes inside fixed-row id string
D = A(N, H)                          // bytes inside one dependency-key string
R = V_s                              // raw slot canonical bytes
K = V_s                              // normalized slot canonical bytes
P = deps(s.type)
```

`K <= R` follows from `normalValue`: the only semantic change is replacing an entire matching local FactRef object by its contained sequence number; every enclosing array/object retains its keys and punctuation. Bound exact row object `O(type,slot,item,state,raw,key)` with `R` for raw and `Q(K)` for the stored normalized key string. Pay its fixed-row map key `Q(I)`. Pay the raw-index map's `Q(I) + Q(R)`. A count index has a stored key made from `A(C(mode), C(type), C(slot), Q(R or K), C(state))`; the key itself is a string, so its encoding is `Q(A(...))`. Pay two such map records, one raw and one normalized, each with a value at N; compute with C("raw") and C("normalized") respectively. Pay as if both count keys were unique to this row.

Pay the row-dependency map's `Q(I)` key plus an array of P `Q(D)` elements; pay P independent reverse-dependency records, each with `Q(D)` key and a set containing one `Q(I)` row-id element. Include the framing described above. This deliberately counts a shared reverse key and a shared row-id string once per edge. The `D` key holds canonical JSON of a sequence number and digest, then is itself a string when stored or embedded. The outer Q is essential. Recompute the row from the same envelope on rekey; replacing a normalized FactRef can only reduce its normalized encoding, and the full unnormalized envelope already pays for both count keys and all dependencies.

Ordinary declared live items cannot declare platform keyed indexes (`items.ts`); nevertheless an implementation used for any other type must additionally bound each indexed key from its declared fixed slot, its canonical key-as-string, type/slot index keys, row counts and item-id edge. Do not silently assume those maps are empty for genesis until its definition and fold path are checked.

## Outside this envelope

The exhaustive live meter must charge accepted `(actor,idempotencyKey,accepted)` records and their encoded keys; attributed member history and its array framing; observed heads and `geneses` scope/digest index; each per-tick `fixedHashes` entry; detached-text history keys, arrays and digests; and fixed scope/head/fixed-ready metadata. It must enumerate and pay every other map that a genesis or confirmation can populate, including relation/copy, decided, request and pending, creation, source-order, operations, records, preparation, holders, duties, settled-holder and account structures. Do not infer emptiness solely from live acts. The timer reserve must add the maximum fixed-hash and detached-history growth for each remaining chain step; held item envelopes pay item/index changes and cross-item rekeys. The meter must use actual staged post-fold contents, with a transactional writer or an exact clone that includes private indexes, before a fresh act commits.

## Conditions still to prove

`mostBytes` assumes well-formed validated field values and uses existing SCOPE_BYTES, FACT_BYTES and member limits. Verify the creation fold's resolved self references and every live fold effect satisfy those same value guards. Verify its enum/name handling, field-value nesting, stored member-reference rules, count-zero and empty-index behavior. Derive and test a logical encoding of map records and array/set overhead, including all copied keys; logical bytes do not claim to measure V8 heap. Prove safe ids/revisions/counts or define their finite numeric representation and overflow behavior. The last condition is not established by the current `mostBytes(int)` bound: live `revision` increments on each changed item, and no safe-number check was located in the fold. An admitted repeatedly updated item is a concrete form requiring that separate guard or a different numeric bound, even though practical O1 capacity may stop it much earlier. Do not silently impose a new refusal without a planner ruling.
