# RC-1: refusal classes

Planner request `acf85bfa` asks for a class on each refusal reason. Corrections
`f72736d6` and `e51c1c7e` amend it. Ruling `719235f0` settles the open
questions and permits the kernel export.

## The table

`REFUSAL_CLASSES` in `packages/bytes/src/records.ts` sits beside
`REFUSAL_REASONS`. It maps each `RefusalReason` to one `RefusalClass`. The
class tells a client what a refusal means for the same signed bytes at a later
head of the same scope.

| Class | Meaning | Reasons |
|---|---|---|
| `never` | No later head admits the same bytes. The later answer is the same reason, `floor-back`, `repeat`, or `expired` after `notAfter`. | 6 |
| `protocol` | The client and the scope disagree on the definition or the address. The client stops writing to the scope. | 5 |
| `head` | The reason speaks for the head that judged the bytes. A later head can admit them until `notAfter`. | 25 |

The `protocol` reasons are `misaddressed`, `unknown-act`, `unknown-message`,
`wrong-pin` and `unsupported-definition`. The table has no row for
`wrong-genesis` or `genesis-conflict`, because neither is a refusal reason.

## The `never` reasons and the judge sites

Each `never` row rests on a judge site that a later head cannot undo.

- **`floor-back`.** `packages/derive/src/floor.ts:164` refuses an input floor at
  or below the current floor. The floor only rises, so a later head refuses the
  same input `floor-back` again.
- **`floor-ahead`.** `floor.ts:167` refuses a floor above the receipt's
  `through.seq + 1`. Both numbers sit inside the input. A later head gives the
  same reason, or `floor-back` once its floor reaches the input floor.
- **`floor-keep`.** `floor.ts:173` refuses a keep list that is not ascending,
  or that names a position the scope no longer holds. The shape sits inside the
  input. `archivedPosition` at `floor.ts:26-28` makes an archived position stay
  archived, because the kept set at a later floor never regains it. A later head
  gives the same reason, or `floor-back` once its floor reaches the input floor.
- **`archived`.** `packages/derive/src/operand.ts:371` refuses an act that
  names an own entry below the floor and not kept. The same `archivedPosition`
  rule holds at every later floor, so the later answer is `archived`.
- **`scope-refused`.** `packages/derive/src/judge.ts:243` refuses every act in a
  refused scope, and `packages/derive/src/delivery.ts:168` refuses every
  delivery there. `packages/derive/src/fold.ts:93` sets `refused` only from a
  refused genesis. Only the `activate` effect at `fold.ts:164-165` changes the
  status, and only a confirmation of a provisional scope writes it. A refused
  scope stays refused, so the later answer is `scope-refused`.
- **`late`.** `delivery.ts:267` refuses a delivery whose source time plus the
  handler's `late.within` precedes the commit time. The refusal is a recorded
  decision. A later copy of the same delivery meets `delivery.ts:158` first and
  answers `repeat` of that decision.

## Counterexamples in the `head` class

These reasons can change at a later head, so they stay `head`.

- **`revision-moved`** at `judge.ts:312`. The check compares the intent's
  `expected` revision with the item's revision at the judging head. An intent
  that expects a revision the item has not reached passes once the item
  reaches it.
- **`final`** at `judge.ts:316`. The check reads the item's state at the
  judging head and the `final` flag that the head's definition gives that
  state. The refusal describes the head, not the bytes.
- **`expired`** at `judge.ts:234`. The check compares `notAfter` with
  `clock.asOf`. `clockOf` in `packages/derive/src/time.ts` takes `asOf` from
  the commit's clock reading, so the answer depends on the judging commit and
  not on the bytes alone.

For acts, `expired` at `judge.ts:234` runs before `scope-refused` at
`judge.ts:243` and before the operand read that gives `archived`. After
`notAfter`, a later head answers those acts `expired`. The bytes still never
take effect, so the class stays `never`.

## Tests

`packages/derive/test/refusal-classes.test.ts` holds 11 tests:

- the class counts and the six `never` reasons;
- the floor judge gives `floor-back`, `floor-ahead` and `floor-keep` (by shape
  and by position) at a later head;
- `floor-ahead` and `floor-keep` become `floor-back` once a later floor reaches
  the input floor;
- `archived` holds after the floor rises again;
- `scope-refused` holds after a later confirmation entry without `activate`;
- a later copy of a delivery refused `late` answers `repeat` after the head
  moves.

Run: `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts
--project derive test/refusal-classes.test.ts`, 11 passed. `tsc --noEmit`
is clean for `packages/bytes` and `packages/derive`, both `tsconfig.json` and
`tsconfig.test.json`.
