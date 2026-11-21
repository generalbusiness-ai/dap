# O2 deadline binding and recorded proof

Planner ruling `5b462751` calls for an authored item timeout and the existing `delivery-unavailable` finding. The receiver returns `retry/unavailable`. The sender stops automatic dispatch and can still record a late authentic result.

## An authored deadline can identify this send

The native O2 reproduction uses the base `ticket` declaration in `packages/derive/test/definition-corpus/fixture-data.ts`. `ask` opens a `request` item, writes its fixed `desk` reference, and emits one `tell` to that reference. The item has no time slot and the ticket has no timed rule.

The existing `pausing` fixture modifier in `packages/derive/test/definition-corpus/compose-variants.ts` provides the authored form. `ask` sets `request.values.until` from a required time field when it opens the item. `timed.pause` reads `until` in state `asked` and moves the item to `paused`. Reuse that form with the base fixture's single `tell`. The declaration can keep `paused` nonfinal so a later authentic result can still change the item.

For an accepted `ask` at sequence `s`, the opening effect gives the item ID `s` and the only `tell` has outbox ID `s.0`. The sealed send's full `to` equals the item's fixed `desk`. The corresponding timed entry records `input.item = s`, `input.rule = "pause"`, and `input.due` equal to the slot when the rule ran. A sender can derive that association from the pinned declaration and its own entries. Check the origin's act, opening effect, single send, exact ordinal, and full target. A generic association by item ID alone would be ambiguous when an act emits several requests.

The X12 test in `packages/derive/test/compose.test.ts`, “a late result sets a timer again,” witnesses the timeout, a diagnosis for each request ordinal, and late authentic results. Its `composeChange6` duplicates the `tell`, so it also shows why an item deadline alone cannot select one send. The test calls the diagnosis judge directly. It does not witness dispatch selecting the cutoff, and its destination is a recorded desk.

## The current diagnosis proves the log and the request identity

`judgeDiagnosis` in `packages/derive/src/settle.ts` reads `view.request(of.seq, of.n)` for valid local IDs. An existing diagnosis returns a repeat. Otherwise the sender must be active, with no timed rule due. The request must exist, have no recorded result, and have a nonempty attempt log whose timestamps and answer codes pass validation.

At least one `retry` or `none` makes the finding `delivery-unavailable`. An all-routing-refusal log makes it `undelivered`. The unavailable draft has no effects, sends, or fact uses and does not judge time. The judge does not check a cutoff, inspect the target's definition, or impose a retry-count threshold. `Dispatcher.#pass` owns the current routing-refusal threshold. `Dispatcher.#giveUp` reads the sealed origin and retained uses, runs the judge in the sender's turn, and requires room for the entry. The committed diagnosis removes that exact row from the SQLite dispatch query. See `packages/scope/src/outbox.ts` and `packages/scope/src/sqlite.ts`.

The closed existing diagnosis input records `of`, `finding`, and `attempts`. Replay passes those same values to the judge. `of` leads to the exact target `ScopeRef` through the sealed origin. The log can establish that a retry occurred. It can carry no proof of the target's durability level.

## The smallest change adds evidence to replay

Keep the finding and the ordinary diagnosis path. For the live-only cutoff, bind the send's `to` to canonical genesis bytes and validate the declaration whose digest the genesis seed pins. The declaration proves `live@1`. The runtime must retain those two objects and the same judgment must read them in offline replay. A target name, a digest label, or a plain retry cannot take the place of the bytes.

The existing entry envelope has a `uses` field that can cite the target's exact genesis. The genesis provides the digest for a retained declaration dependency. A narrow replay-contract change could reserve that use for the live-cutoff variant of `delivery-unavailable` and keep the existing diagnosis input fields. The judge currently derives an empty `uses` list for that finding, so this still changes the diagnosis contract. If the planner prefers an explicit discriminator or wants the diagnosis to cite the exact local timed entry, use an optional evidence member in `packages/contract/src/entry.ts` and admit it in `packages/bytes/src/records.ts`.

Either form needs the same input checks in `packages/derive/src/settle.ts` and `packages/replay/src/verify.ts`, plus sender scheduling and evidence retention in `packages/scope`. Leave old diagnoses on their original path. A missing proof or a recorded target stays on the ordinary retry path.
