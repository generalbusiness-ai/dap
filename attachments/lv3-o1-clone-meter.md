# Scratch: live preflight clone and dynamic meter

## Numeric invariant

For every successful live fold, `folded` requires `entry.seq === scope.head.seq + 1`, calls `putFixedHash(entry.seq, hash)` and updates the head to `entry.seq` (fold.ts:115-119, 330, 350-352). `applyLive` admits only acts and timed inputs; neither is a floor. For each changed existing item the fold collects its effects in `now`, then calls `putItem` once with `revision: was.revision + 1` (fold.ts:221-225). An item opens at revision 1; the later hold-attribution rewrite preserves revision (246-253), and live definitions admit no holds. Therefore, with genesis included, `revision <= head.seq + 1`, by induction. A clone whose `#fixedHashes` includes every seq through its head has at least `head.seq + 1` distinct map entries. If logical metering charges each entry at least one byte, and a checked maximum B satisfies `B + 1 < Number.MAX_SAFE_INTEGER`, every admitted tick and item revision are safe. The preflight tick itself is also safe if initial creation head satisfies this invariant and the last admissible state leaves the needed one-step margin. Check B and all additions/multiplications before use. The generation ends on any fault rather than publishing a partially folded candidate.

Proof scope: `putFixedHash` has floor-dependent behavior, so establish that live creation cannot carry a floor and that no admitted live input can add one. Do not infer this merely from current state count. Creation must start with the checked sequence 0, or 0/1 through confirmation, and the count invariant must include both. A candidate is folded before its budget comparison; the induction's one-step margin must establish safe arithmetic before `entryOf` and `applyLive` execute. The currently computed `liveBytes` has no checked-safe-cap proof, so this is a proposed condition, not an existing guarantee.

## Minimal isolated API

Add one module-private or narrowly internal method to `MemoryState`, not to `StateWriter` or checkpoint format:

```
cloneAndInspectLive(): { copy: MemoryState; inventory: LiveInventory }
```

Inside the class construct `copy = new MemoryState()` and define *one registry* of pairs `{name, source, target, category}`, one pair per private Map or Set. Populate each target with the same keys and `structuredClone(value)` for each value. Clone scalar object fields `#floor` and `#scope`; copy the string `#fixedReady`. Sets need a new set and cloned members; all current set members are primitive strings or numbers. Deep copying each value rather than just copying the Map is necessary: `#index` and `#keyed` values are mutated in place with splice, and `#fixedDependencies` values are Sets mutated in place. It also avoids relying on accidental immutability of nested rows, `#texts`, heads, accepted values and other JSON-like records. Confirm every current value is structured-cloneable in both Node and workerd before adoption. Keys in these collections are primitives. The existing optional `tally` is test instrumentation: either copy its numeric value into a new object or explicitly omit it in a live-only API with a test; never alias the original tally.

Registry, exactly once each:

```
covered by item envelope, except definition-global empty keys/counts:
  fixedRows fixedRaw fixedCounts fixedDependencies fixedRowDependencies
  items index counts keyed rows
measured dynamic:
  fixedHashes relations accepted requests pendingRequests decided sourceOrder
  creations operations texts prepared records observed holders itemDuties
  settledHolders accounts geneses copies
scalars measured or definition-global:
  floor scope fixedReady
```

The registry drives both cloning and inventory/meter enumeration, so a field is not accidentally handled in one path only. Since private fields cannot be reflected, the compiler does not automatically prove exhaustiveness: put private field declarations and registry together in a dedicated internal state holder object whose property keys can be exhaustively checked via `satisfies`, or add a source-level inventory test. Do not expose mutable registry references to the caller; inventory either contains cloned values only or returns an already computed charge. Metre an empty map/set's fixed framing according to one explicit logical serialization, and count each independent entry/key/value, set edge and array member even when data shares references.

For `items`, the dynamic charge is the actual per-item `attributed` history, including all framing excluded from E_t. Do not also charge the fixed item body if E_t covers it. Fixed-index rows and dependencies are paid by E_t; global empty buckets and zero counts need their separate definition-derived constant. Use the stored current clone and a public-to-the-internal-module iterator over its items to calculate `sum(E_t + D(t,state)*T_t)`; include final items. The registry's category is a stated coverage claim, not a reason to omit an unproven index. Assert the calculated fixed envelope covers all actual rows in focused tests and settle the static proof before relying on this division.

## Live-only transaction

1. The original remains the read state. Run judgment and create the entry as today. An already accepted exact retry returns before charging new work.
2. Clone state. Apply the entry to the candidate using unchanged `applyLive`; staged reads and fixed-reference rekeying see the candidate's own writes. On failure discard candidate and use existing broken-generation behavior.
3. Charge dynamic rows from the candidate, add definition-global costs and the candidate's item and timer reserves, using checked arithmetic. If an act exceeds B, discard the candidate and return scope-full without notifying or changing the tick. For a timer, the preexisting reserve must prove that its candidate fits; an unexpected violation is a broken-generation fault, not an ordinary timer refusal.
4. On success replace the generation's state with the candidate and notify once. Adapt `#section`/`#told`: they currently compare object identity to detect state updates, and `#state` can no longer be assumed identical across an applied fold. Verify all readers and watches observe the intended state after replacement; no reader should retain a mutable pointer that is expected to follow later updates. The previous `HeldState` item-size subclass cannot be blindly cloned as `MemoryState` and should be replaced by this meter or have its own complete clone path.

This changes only the live caller and adds internal introspection; it does not alter recorded fold operations, their snapshot semantics or their acceptance forms. It necessarily adds a transient whole-state copy, which the logical retained-state budget does not count.

## Complexity and remaining proof

Each attempted write uses O(S) clone time and temporary memory for S total retained collection content, followed by O(S) canonical metering and the ordinary fold/rekey cost. A sequence of n small successful acts can therefore cost O(n²) cumulative work; rejected acts also pay O(S). Sorting is unnecessary if each key/value is measured independently, and must not be introduced merely for counting. Temporaries, canonicalization, rules, watchers, V8 object overhead and the pinned definition are outside this logical budget; O1 must not be described as a physical peak-memory bound on this evidence.

Genesis/confirmation: enumerate the exact allowed creation kinds and their folds, ensure the clone sees every writer-produced collection, fixed-hash record, resolved self reference and observation, and determine how to handle initial actual cost plus timer reserve above B without changing wire behavior by assumption. Prove fixed hashes begin at seq 0, remain contiguous and never face a floor; prove each initial item revision obeys the numeric invariant. Check all actual stored values are canonicalizable and cloneable, including creation rows and optional data.

Timer reserve: prove the recursive E_t envelope covers every material row, both fixed dependency directions, global bucket/count storage, and all nested encoding layers; prove timed effects cannot grow attribution or other measured dynamic categories except hashes and detached histories; calculate T_t for one hash and every possible detached-text append including new history key/container framing. For the graph `D`, show every timed successor has D at most old D minus one and creates no timed item. Then M'+sum(E+D*T) cannot exceed its pre-timer value, including a hash-triggered rekey of another item's row. No test, compiler, gate, or tracked file change accompanies this design.
