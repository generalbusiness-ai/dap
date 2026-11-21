# LV3 retained live state

Status: in progress. Parent LV3 request `a76e3655c19ad65e206558c68eef25e3ea19bbf3`
in the [live level design](../2026-11-10-live-level.md).

A live scope must hold its state, accepted intents, and remaining timed
writes within one generation budget. An exact retry uses its original
tick at capacity. A fresh act that would exceed the budget returns
`scope-full` before the turn publishes a change. See ruling `4266b531`.

## Staging and charge

Each live generation folds the actual genesis and confirmation through
the same staged writer it uses for live turns. The writer keeps the
original order on refusal and commits writes synchronously once the
meter accepts them. It stages only touched keys, with copies of touched
index arrays and dependency sets. Ordinary recorded folding uses native
maps and sets. The capacity witness supplies a small test limit so a
short sequence can exercise equality.

The meter charges canonical encoded records, including accepted keys,
held items and attribution, text and observation histories, and per-tick
fixed hashes. It charges each fixed row and dependency edge using the
actual slot value and a maximum for mutable index framing. An unresolved
local reference can later rekey a fixed row. Its raw encoding already
pays for that row and its dependencies. The graph of timed transitions
reserves each item's remaining writes. A timed transition pays for
its new hash, possible item and history growth, and any duty row by
spending one step of that reserve.

The validator rejects a timed cycle. Each permitted timed transition
leaves its source states, so the longest remaining timer chain drops
by at least one. A timed entry contains each new slot value and its
destination state within the entry byte limit. The item's slot keys
already exist. The reserve pays the entry width and safe revision
width, plus a hash and separate detached-history and attribution
growth. A timed party set can add one bounded member to an author
history. Timed list changes can remove members. Each possible whole-scope
deadline, state, or marker duty fits the reserved maximum row. A timed
step can change another fixed row's normalized key, while its raw value
and dependencies stay covered by that row's envelope.

The native witness holds an open watch at tick 1, refuses a fresh act at
capacity, and returns tick 1 for the exact retry. The watch receives no
line until the timer changes the item and publishes tick 2. After the
test raises the limit, the previously refused act applies at tick 3.
The recorded creation summary stays equal throughout.

## Initial generation and ceiling

The declared maximum of an unused fixed reference list once priced one
item above 1 GiB. The meter now prices the fixed values the item holds.
The long-name witness isolates a different cost. A valid 202,418-byte
definition opens one item with a 100,000-byte type name and 32 unset
fixed slots. Its 101,933-byte genesis yields a 23,217,862-byte logical
initial charge because the fixed index repeats the type name in its keys.

Compact live indexes use type, slot, and state ordinals in private
keys and values. Reads and the replay oracle still use the original
names. The compact representation charges 315,910 bytes for the same
long-name creation after pricing the timer metadata. The oracle matches
the snapshot, counts, and dependency iteration order after commit and
rollback. A real parent-created live child charges 3,466 bytes from its
genesis and creator confirmation and opens at tick 1. Its recorded
entries and storage stay equal when the overlay opens.

The planner conditionally approved a 32 MiB logical ceiling under
shipped bounds after the creation arithmetic and native witnesses pass.
The charge measures encoded accounting records. Host heap and multiple
generations in an isolate require separate evidence.

### Initial bound under shipped limits

Let `E` and `D` be the 262,144-byte entry and definition limits. A
judged genesis opens one item. Its type cannot have timed rules.
`newItem` takes each slot default at most once, from the definition.
The applied effects take actual values from the genesis entry. A typed
genesis self-reference already includes its scope ID, so replacing its
null genesis with a digest adds at most 69 bytes. Each original scope
object already has a 55-byte scope ID and more than 14 bytes of keys and
framing. The substitutions are disjoint. The resolver visits list and
record members without duplicating siblings and returns once it replaces
a scope. Thus the resolved effect values take less than `2E` bytes.
`Turn` in `packages/scope/src/turn.ts` checks the applied canonical entry
against `E` before recording it.

Let `R = 2E + D + 128` cover the initial fixed values, including empty
slots and list framing. The compact row keeps the raw value once and
charges its raw and normalized strings and count-key encodings.
Re-encoding canonical JSON as a string takes at most twice its length
plus two delimiters. A normalized local reference replaces a whole
object with its sequence number. The fixed row charges one raw copy and
one string copy. The raw index charges another string copy. Each count
key charges at most twice that string copy. The total coefficient is
`1 + 2 + 2 + 4 + 4 = 13`. A slot's fixed row, raw index, two count rows,
and dependency-list frame together add less than 512 bytes with ordinal
widths of two digits, genesis item ID zero, and 20 bytes per counter.

Each distinct dependency occurs in a disjoint structural reference
of at least 128 encoded bytes. The row ID takes at most 11 bytes as an
encoded string. The dependency key takes at most 96 bytes with a safe
sequence and a digest. Each of its two edges and its reverse bucket
takes at most 143 bytes including the record label and framing. The
512-byte per-dependency allowance adds at most `4R`.

The initial item charges the canonical slot names and defaults from
the definition and resolved values from the entry. With a null signer,
each of up to 16 party effects can add one member of up to 1,760 bytes
to attribution. The 65,536-byte item framing allowance covers these
copies, the slot and list frames, and the fixed-width item metadata.
Bindings use at most two copies of each encoded name. Their records
allow 64 bytes of framing per name across 16 types, 256 states, and
512 slots. Each state bucket and count uses at most 128 bytes with
ordinal keys. The validated definition owns the shared declaration and
type maps. The generation pays for at most 16 timer cost rows and
eight rule ordinals. Together they fit in 1,024 bytes.

An initial text history repeats once the encoded slot name in its value
and at most twice in its key. Across all 12 value slots those names fit
in `3D`. Each detached digest costs 74 bytes, with at most 16 effects.
The `4D + 12 × 512` allowance also pays the keys and record framing.

| Component | Conservative bound in bytes |
|---|---:|
| Fixed rows, keys, and edges | 13,387,904 |
| Actual item, including attribution and names | 1,114,112 |
| Type, state, and slot bindings | 574,464 |
| State buckets and counts | 32,768 |
| Detached history | 1,054,720 |
| Scope metadata, creation rows, and duties | 278,528 |
| Generation timer metadata | 1,024 |
| Total | 16,443,520 |

Genesis and confirmation each add a fixed hash and can add one decided
row. Each hash fits in 128 bytes and each decided row fits in 512.
Scope and fixed-ready records together fit in 2 KiB with fixed-width
scope, creator, source, head, and time fields. Confirmation activates
the existing item. The live declaration cannot open operations or
holds, and genesis and control inputs carry no observations. Whole-scope
capacity can add a state duty and up to 12 declared marker duties at
genesis. Each duty has five safe integer fields. Their encoded marker
names fit in `D` and their records fit in the 16 KiB that also covers
the creation rows. There is no timed duty for the genesis item.

The generation limit is the smaller of 32 MiB and the initial charge
plus its growth allowance. The allowance starts at four entry widths.
For each declared type it adds the smaller of its item maximum and the
scope item limit, times one entry width plus the type's longest timer
reserve. The amount saturates at the ceiling. The limit stays fixed for
the generation, and each fresh turn must fit its actual post-fold charge.

## Focused evidence

Logs under `~/play/artroom-evidence/2026-11-21-lv3-o1-prototype/`.

| Check | Result | Log | SHA-256 |
|---|---|---|---|
| Derive transaction, meter, and live forms | 44 passed | `artroom-o1-tight-derive.log` | `28eb61c7b98baba4b6dd0ca1d9d5fbb856f5c9d1a4825f60facb085e19dac0d4` |
| Native live reads and watch | 6 passed | `artroom-o1-tight-scope.log` | `dd1fdb83baaf94ea9fdbdbc269b6c3adc3c6863c70dca1f2c238b0e82178bcdc` |
| Derive and scope types | exit 0 | `artroom-o1-tight-types.log` | `647fb66b0f3dcaf4943cbaa1162101919f76abb59425d21c4d3d57fecf5f4ee4` |
| Admitted long-name creation | 1 passed | `artroom-o1-long-name.log` | `1af7c2c8cf133c92aade0a57625440c3975f507468cce3b62afb2e8b07cdcb2c` |
| Compact derive and recorded-state oracle | 45 passed | `artroom-o1-compact-derive.log` | `fa0c3a16e44cdb9f50a67af66d827df164100deca23e3a88b90de5351264a5f4` |
| Compact native scope watch | 6 passed | `artroom-o1-compact-scope.log` | `ff8f4954bb58b68a37a21bfa20deb8453af3ade07d117adfa2e87e8b46c23624` |
| Compact derive and scope types | exit 0 | `artroom-o1-compact-types.log` | `647fb66b0f3dcaf4943cbaa1162101919f76abb59425d21c4d3d57fecf5f4ee4` |
| Compact long-name creation and snapshot | 1 passed | `artroom-o1-compact-long.log` | `d94873a2255171e5b3e6f660470425456eef4d51492ce12e4d99ed35ceba30f5` |
| Confirmed native child overlay | 1 passed | `native-creation.log` | `a163e1097fb0a3c56b316b64b94e81b537355ce909ecf1f3aee26ca2620a16b7` |

Production wiring logs under `~/play/artroom-evidence/2026-11-21-lv3-o1-gate/`.

| Check | Result | Log | SHA-256 |
|---|---|---|---|
| Production derive and allowance | 47 passed | `artroom-o1-ship-derive.log` | `9542e4682201431b6e7ba86b71611d107ec70511db744486e3f05cc6594ce540` |
| Production native reads, creation, and turns | 15 passed | `artroom-o1-ship-scope.log` | `caf77fc1d7fd125b443128bdaa5e545cecb29ea1c70810ddd68759a6186097d5` |
| Contract, platform, derive, and scope types | exit 0 | `artroom-o1-ship-types.log` | `477416ba79aaf832b119f2e99474f32d6cb18c13be2f2636eee584d93ca3892c` |
| Security entry-point inventory | 13 passed | `artroom-o1-ship-security.log` | `6afca70bbd2e6460dfe0c515f6d7015b877350fddabf20ffb6ba74abef578be3` |
| Marker duty and own-name accounting | 7 passed | `artroom-o1-marker-derive.log` | `982361921480320c5995edb0ca373326adaaebedeb138240ed8bfc54f98e10ed` |
| Native marked timer and creation | 8 passed | `artroom-o1-marker-scope.log` | `8bbd3b40596cfc91458806c0b0e5f4912103cf9b024b736fb153b986f22c9d31` |
