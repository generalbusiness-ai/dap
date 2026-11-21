# LV3 retained live state

Status: prototype. Parent LV3 request `a76e3655c19ad65e206558c68eef25e3ea19bbf3`
in the [live level design](../2026-11-10-live-level.md).

A live scope must hold its state, accepted intents, and remaining timed
writes within one generation budget. An exact retry uses its original
tick at capacity. A fresh act that would exceed the budget returns
`scope-full` before the turn publishes a change. See ruling `4266b531`.

## Staging and charge

The prototype opts into staging when the native test supplies a meter
policy. It folds the actual genesis and confirmation through the same
staged writer it uses for live turns. The writer keeps the original order
on refusal and commits writes synchronously once the meter accepts them.
It stages only touched keys, with copies of touched index arrays and
dependency sets. Ordinary recorded folding uses native maps and sets.

The meter charges canonical encoded records, including accepted keys,
held items and attribution, text and observation histories, and per-tick
fixed hashes. It charges each fixed row and dependency edge using the
actual slot value and a maximum for mutable index framing. An unresolved
local reference can later rekey a fixed row. Its raw encoding already
pays for that row and its dependencies. The graph of timed transitions
reserves each item's remaining writes. A timed transition pays for
its new hash, possible item and history growth, and any duty row by
spending one step of that reserve.

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

The production ceiling and key representation await a planner decision.
The logical charge measures the declared accounting records. Host heap
use requires separate evidence.

## Focused evidence

Logs under `~/play/artroom-evidence/2026-11-21-lv3-o1-prototype/`.

| Check | Result | Log | SHA-256 |
|---|---|---|---|
| Derive transaction, meter, and live forms | 44 passed | `artroom-o1-tight-derive.log` | `28eb61c7b98baba4b6dd0ca1d9d5fbb856f5c9d1a4825f60facb085e19dac0d4` |
| Native live reads and watch | 6 passed | `artroom-o1-tight-scope.log` | `dd1fdb83baaf94ea9fdbdbc269b6c3adc3c6863c70dca1f2c238b0e82178bcdc` |
| Derive and scope types | exit 0 | `artroom-o1-tight-types.log` | `647fb66b0f3dcaf4943cbaa1162101919f76abb59425d21c4d3d57fecf5f4ee4` |
| Admitted long-name creation | 1 passed | `artroom-o1-long-name.log` | `1af7c2c8cf133c92aade0a57625440c3975f507468cce3b62afb2e8b07cdcb2c` |
