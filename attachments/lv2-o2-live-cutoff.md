# Stop a proven live-target retry at the sender's authored deadline

O2 request `a9455de4` and the planner's direction on `147a340a` call for two entries in the recorded sender. An authored timed transition settles the sender's item. A `delivery-unavailable` diagnosis stops automatic dispatch and preserves the request's late-result path. The live scope keeps its `retry` answer with reason `unavailable` and writes no delivery entry.

Use the existing timed rule and finding. Add an optional evidence member to the diagnosis so replay can check why this sender stopped retrying this exact send.

## The originating act names one request and one deadline

The O2 sender uses a pinned declaration derived from the fixture ticket. Reuse the authored form in `pausing` in `packages/derive/test/definition-corpus/compose-variants.ts`. The base `ticket.acts.ask` in `fixture-data.ts` emits one `tell`. Keep that single send.

- The signed `ask` supplies the full destination in `fields.desk` and a future timestamp in `fields.until`. Its effects set the opened request item's fixed `desk` and `until` slots. The authored `until` is independent of the intent's `notAfter`.
- The accepted entry's sequence `s` is the ID of the opened `request` item. Its only send, `s.0`, is a `tell` whose full `to` equals the item's `desk`. The supported binding requires the pinned `ask` form, the opening effect, the exact ordinal, and the full target. An act with multiple sends or an address by seed falls outside this form.
- The rule `timed.pause` takes the item from `asked` to nonfinal `paused` at `until`. The recorded timed input holds the item ID, rule name, and due timestamp. An authentic result can still run the original send's result clause after that transition.

The fixture test “a late result sets a timer again” in `packages/derive/test/compose.test.ts` shows a timed item, retry diagnoses, and late results. That fixture duplicates the tell. O2 uses one tell so the item and ordinal identify one request.

## The diagnosis records the cutoff evidence

Keep `input.of = { seq: s, n: 0 }`, `finding: "delivery-unavailable"`, and the real, nonempty attempt log. At least one logged attempt must have answered `retry` for this cutoff. Keep the ordinary attempt codes and timestamps. The scheduler uses no synthetic attempt and treats no retry as a routing refusal.

Add optional `input.liveCutoff = { timed: { seq, hash }, definition: digest }`. The timed pointer names a sealed entry of the sender before the diagnosis. The definition digest names canonical retained declaration bytes. The single `Entry.uses` member cites the target's genesis:

- `fact.at` is the exact `origin.sends[0].to`, `fact.seq` is 0, and `fact.hash` is the target reference's genesis.
- `content` is the content digest of the canonical genesis bytes, as produced by `useOf`. `kind` is the checked genesis seed's scope kind.
- The checked genesis's `input.seed.definition` equals `liveCutoff.definition`. A digest of a declaration provides this proof. A platform name or the retained row's producer label cannot provide it.

The sender obtains the two objects through bounded source and declaration reads. It uses `admitSequenceGenesis` to check the genesis against both fields of the target reference. It checks the declaration's canonical bytes and definition-domain digest under `definitionBytes`. The active format validator must admit the declaration with `level: { name: "live", version: 1 }`. Retain the genesis as an `entry` under `uses[0].content` and the declaration as a `definition` under the pinned digest, atomically with the diagnosis.

## Once the timed entry commits, the sender can stop dispatch

The scheduler applies the cutoff only to the pinned one-tell form and with the proof above. For an eligible send, the retry wake is no later than `until`. An early wake checks the cutoff and starts no extra network attempt. At the cutoff, the recorded turn first drains the due timed rule. The dispatcher then offers the diagnosis. If the timed entry or diagnosis cannot yet commit, retry that local work without starting another delivery. Recheck the pending request and any acknowledgment before writing the diagnosis.

Keep a transport attempt already in progress in the real log. Do not start a new attempt at or after the cutoff when the sender holds the proof and has a real retry. An authentic acknowledgment or result that wins the race follows the existing path. If the origin has no eligible authored cutoff, the log names no retry, the proof is missing, or the declaration is recorded, use the ordinary retry schedule. The timed transition still settles the item independently.

Charge both retained objects at their bounded byte sizes. The whole-scope path must reserve or otherwise account for the proof and the later result. The diagnosis must also respect the general retained byte limit. If the sender cannot retain the proof within those limits, use ordinary dispatch. The timed item's reservation does not pay for new retained evidence.

## Replay ties the cutoff to the same send

Replay first derives the originating act and its folded effects under the sender's pinned definition. The diagnosis judge uses `of` to recover the one actual `tell`, its opened item, and its authored `until`. Replay already runs `judgeTimed` for the referenced entry. The new check binds that entry's local sequence and hash to the same item, rule, and due time, and requires that the diagnosis follow that entry and occur at or after `until`. The runtime and replay apply the same checks through `judgeDiagnosis`.

Replay uses the diagnosis's retained genesis and declaration. The verifier checks the genesis structure, scope ID, incarnation hash, content digest, and source kind. It checks the canonical declaration against the genesis pin and the explicit digest, then runs the validator and checks `live@1`. The proof covers an immutable identity and needs no read of the target's current state. A replay can check both objects from sender retention. It continues to trust the sender's log of the delivery attempts, as for every diagnosis.

If a named retained object is unavailable, replay reports `incomplete` at the diagnosis. Bytes that cannot supply the named object, including a wrong content digest or invalid canonical encoding, follow the retained-input `incomplete` path. If the available objects contradict the diagnosis, replay reports `mismatch`. Examples include a different target incarnation or scope kind, a declaration that contradicts the seed pin, a validated recorded target, or a timed pointer that names another item or deadline. A diagnosis with malformed evidence fields fails entry admission. Replay never treats an invalid cutoff claim as an ordinary diagnosis.

An ordinary diagnosis has no `liveCutoff` member. It retains its log-based judgment and byte shape. Both paths keep `delivery-unavailable` effects empty and the protocol request open for an authentic late result. The outbox excludes the row from automatic dispatch as soon as the diagnosis commits.

## The explicit evidence member keeps the retained inputs visible

The envelope alone can carry the genesis through `Entry.uses`. The current judge emits an empty use list for an ordinary `delivery-unavailable` diagnosis. Reinterpreting a nonempty use list as a cutoff would save an input member, but the declaration digest would be visible only after opening the genesis. The current retained dependency plan identifies required objects from the entry. The implicit form would also have to infer which local timed entry authorized the cutoff.

The optional member makes both dependencies explicit. It keeps the existing input kind, finding, and log vocabulary. To approve this design under `docs/kernel.md` section 7, approve the following changes together.

- `packages/contract/src/entry.ts` and `packages/bytes/src/records.ts` define and admit the optional member and its exact shape.
- `packages/derive/src/settle.ts` checks the authored binding, local timed evidence, and target proof. `packages/derive/src/retained-plan.ts` declares the definition dependency so archive planning can retain it along with the genesis use.
- `packages/scope/src/outbox.ts` selects the eligible row and schedules its cutoff. The scope's source-read and commit paths check and retain the proof.
- `packages/replay/src/verify.ts` supplies the verified objects to the same judge and rejects an unproved cutoff. The existing genesis-use path must admit the retained immutable proof without requiring the target's current live state.

## Witnesses

- **Red.** Use the one-tell authored sender against an active live target on the NET shared clock. Force a real retry before `until`, drain the timer at the deadline, and show that the current sender moves the item but keeps retrying. The retained 63-second run already shows the unmodified dispatcher retrying past intent expiry. Its fixture lacks `until`.
- **Green.** At `until - 1 ms`, the sender has no cutoff diagnosis. At `until`, it first commits the timed entry and then the exact-send `delivery-unavailable` diagnosis. After an eviction and after advancing beyond the maximum retry delay, the send has no further automatic attempts. The live receiver still answers `retry/unavailable` and its stored rows equal the creation snapshot. Replay of the sender with the retained proof rederives both entries.
- **Controls.** Use a recorded target with the same retry answer and the same authored deadline. Its item timer still runs and its send retains its ordinary retry schedule. Withhold target proof before the cutoff and check the same fallback. Remove a named retained object from the replay fixture and expect `incomplete`. Supply an available proof bound to another incarnation, or bind the diagnosis to another timed entry, and expect `mismatch`. Keep the existing X12 late-result witness for the original finding.

Approve the optional evidence member and the shared replay rule before starting O2 source work. LV3 and LV5 retain build priority.
