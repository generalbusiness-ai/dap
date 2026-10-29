# Apply the authoring rules

## Name the domain objects

A **definition** is the immutable data that a scope pins at genesis. A
**scope** owns one journal and the items that its entries produce. An
**item** has a type, state, and slots. A slot holds a member in `parties`,
a reference in `refs`, or data in `values`.

An **act** is a signed request. Its `grant` names the required action. Its
**guards** state conditions, and its **effects** change items. A **handler**
in `receives` processes a verified message from another scope. A **timed
rule** processes a recorded deadline. A rule expression supplies a named
boolean condition. A **projection** reads native data, and a **view** names
how to display that projection and offer declared acts.
A **capability form** is a versioned guard, effect, or carried-record form
that the contract recognizes. Listing it does not supply its runtime code.

Use the application's nouns. Lending uses `library`, `thing`, `donate`,
`borrow`, `return`, and `cancel`. Grow uses `site`, `room`, `zone`, `device`,
`bench`, `alert`, and `watering`. Small applications can keep one
`definition.ts`, `definition.json`, and `pin.ts`. Larger applications can
compose `room.ts` and `site.ts` from modules such as `device.ts` and
`watering.ts`. Pass the definition name, item dependencies, and vocabulary
to a module rather than hiding those dependencies in mutable global state.

## Put the invariant in its owner

- Put permanent identity in a fixed slot. Required slots must have values
  when an item opens, unless the declaration provides a supported default.
- Use a state guard for a rule such as “only an available thing can be
  borrowed.” Make a terminal business state final when it must never change.
- Use `grant` for the required action and membership for who holds it.
  A grant does not replace state, identity, or evidence guards.
- Use a signer guard when the signer must occupy a party slot. Compare
  full member references, not display handles, in identity rules.
- Use a handler for verified cross-scope input. Scopes share neither
  storage nor a transaction. Do not assume delivery order between senders.
- Use a timed rule for an item's recorded deadline. Use a view condition
  only to offer a control. The native act must enforce the same rule.
- Keep outside-effect outcomes separate from requested targets and sensor
  reports. A recorded request does not prove an outside effect happened.
- Put a change-lane merge's required approvals and checks in the room's
  rules. Direct `publish-file` bypasses those review rules. Control that
  path through definition activation, application creation, and the
  destination's proof of the sender.

## Keep the definition valid

Declare the complete `items`, `acts`, `receives`, `timed`, and `rules` maps,
including empty maps. Give each item its initial state and each slot its
type, requiredness, and mutability. `max` bounds live items of that type,
not the total number of retained final items.

An act has `step`, `on`, `grant`, `also`, `fields`, `guards`, `effects`,
`sends`, and `attention`. Use `open` for a new item and `transition` for an
existing one. A `comment` has no guards, effects, sends, or other items.
The genesis names an open act. It cannot open a timed item or use a hold
effect. Open untimed configuration first when a later item needs a timer.

Effects apply in order. Do not write the same slot twice unless conditions
exclude each other in a form the validator recognizes. Conditions read the
state before the entry. An absent optional source leaves its target slot
unchanged. `null` clears a slot. `"self"` names the entry being written.
Use only the declared effect and operand forms. A rule expression cannot
compute an effect list or replace the scope's judgment with application code.

Use the target's guard and send bounds. The provisional defaults allow
24 written guards, 96 including nested guards, and depth 8. A send list
allows one fan-out over a type whose `max` is at most 32. An unfinished
bounded scan yields `unavailable`; it does not prove a guard false.

Detached text uses `detached: true` and travels beside the signed intent.
The scope retains its bytes separately. The intent, entry, and effects
hold its digest.
Guards, rule expressions, index sends, and sends to non-lane scopes cannot
read that text. The validator refuses those reads as `redactable-read`.
Retain identity or decision facts separately when a rule needs them after
text redaction.

Use `also` to select other local items: `by` selects from a declared field,
`via` follows an item reference slot, and `one` selects a singleton type.
The raw declaration does not infer the field that `by` names. A selected
subject can remain unbound when its optional input is absent. Direct
guards and effects on that unbound subject do not run. Do not rely on
absence as if it proved a required business condition.

A handler declares its message class, sender kind, fields, and opened item
or `null`. A connected package peer also needs the exact sender definition
and pin. A `relate` handler declares `copies`, which bounds retained
relationship keys over their lifetime. A live-item bound alone may not
prove that total.

A timed rule selects live states and a value slot of type `time`. Its
effects change only its own item and take the item out of those states.
Timed rules have no input fields, signer, or other subjects. Do not create
a cycle of due timed transitions.

Use ordinary guards before a rule expression. Under `restricted@1`, a
rule reads the declared input and subjects, not outside services or an
ambient clock. Declare its name in `rules`, and pass `RULE_PROFILES` when
calling `validateDefinition` directly. Detached text cannot supply a guard
or rule read. Do not bypass a failed validator with a type assertion.

Supported capability names include `hold@1` and `git-read@1`. Their forms
must match the listed version. A runtime or verifier without the needed
code refuses `unsupported-definition`. A fact kind such as `hold@1:check`
can name confirmed, refused, or unknown outcomes. Check its carried result
before treating it as a successful check.

## Add a guarded act and its scenario

Copy a complete neighboring act of the same step rather than constructing
an incomplete row. Preserve its required fields, subject selections,
publication sends, and result clauses when the invariant still needs them.

For example, if the requested policy permits only the borrower to return a
thing, copy Lending's `return` act under the new name `return-own`. Keep
its `lending.member` grant, `content` field, singleton library selection,
effects, and publication send. Replace its guard list with:

```json
[
	{ "state": ["lent"], "reason": "not-lent" },
	{ "signer": ["borrower"], "reason": "not-borrower" }
]
```

The default subject is `on`. Use `"of": "also.library"` when a guard
concerns that selected item. A named expression guard has the form
`{ "rule": "some-rule", "reason": "some-condition-failed" }`, with the
expression stored under `rules["some-rule"]`.

Keep the existing scenario's donation and borrow setup. Save the accepted
donation as `donation`. Declare another public TEST actor named `other`
with a distinct seed and the same `lending.member` action. That actor must
pass authorization so the refusal tests the new guard. Before the
borrower's successful return, add:

```json
{
	"act": {
		"actor": "other",
		"kind": "return-own",
		"on": { "$position": "donation" },
		"expected": {
			"on": { "$revision": { "$position": "donation" } },
			"library": { "$revision": 0 }
		},
		"fields": { "content": "A refused TEST return" }
	},
	"expect": {
		"answer": "refused",
		"reason": "guard-failed",
		"name": "not-borrower"
	}
}
```

Assert that the thing remains `lent`. Then use the actual borrower with
the same new act kind, expect `accepted`, and assert `available` with no
borrower. Include the new scenario in the manifest's `scenarios` list.

`$position` resolves a saved accepted receipt's entry position. `$revision`
reads the current revision of the identified item. Include `on` and every
resolved `also` subject that the act's expected map requires. Scenario
expected-map keys use the declared names, such as `library`, without the
`also.` prefix.

## Distinguish refusal codes from guard names

The current `RefusalReason` type is one global union. It does not narrow
to a separate reason union for each act. A failed named guard returns
`reason: "guard-failed"` and the authored guard reason in `name`.
`unauthorized`, `revision-moved`, `bad-field`, and `final` are native codes,
not names to substitute for that authored guard reason.

Do not add a custom guard name to the global union. Attach it to the guard
and check both `reason` and `name` in the scenario. A guard whose bounded
evaluation cannot finish yields `unavailable`, not a proved refusal.
An accepted response carries a receipt. An uncertain transport result
does not prove acceptance or refusal.

The typed authoring spike can declare grants and reasons and report
per-act refusal metadata. That metadata does not change the native answer
union or canonical definition. Keep the starter's actual imports. Do not
invent a published helper entrypoint from the spike's checkout-only files.

## Check the complete package

The [starter manifest](../assets/starter/dap.application.json) carries the
projection and `presentation.views.notes`. Keep each view's projection,
source names, fields, revision, and act arguments consistent with its
definition. `when` conditions and viewer filters supply no authority.
Surface views declare no acts. Use a card, carousel, or record for native
controls.

In each item projection source, list `states` in strictly increasing
lexical order, without duplicates. Canonical object-key sorting does not
reorder arrays.

For package v2, include `connections`, `rights`, `exercises`, `order`,
`groups`, `derivation`, and `parameters`. Use explicit empty arrays or
objects where appropriate. A definition path must already appear in
`definitions`. Packing resolves those paths to exact digests.

An external scope slot still needs an endpoint declaration. For the
Lending definition stored as `definition.json`, replace an empty
`connections` array with:

```json
[
	{ "from": "definition.json", "item": "library", "slot": "destination", "to": "outside" }
]
```

Use the actual path listed in `definitions`. This binds the package port;
it supplies neither a concrete destination reference nor permission to
publish. Omission yields `unbound-endpoint` for the slot and its sends.

A scenario must also supply every required founding field. A scope
reference has `scope`, `inc`, and `kind`. It is neither a definition digest
nor a record with an `id` field. For a local scenario with a declared
`staff` actor and external effects disabled, the founding value can use
this public TEST reference:

```json
{
	"actor": "staff",
	"fields": {
		"opener": {
			"$member": "staff"
		},
		"destination": {
			"scope": "sc_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			"inc": "in_aaaaaaaaaaaaaaaaaaaaaaaaaa",
			"kind": "destination"
		}
	}
}
```

The reference is a local stand-in, not a created destination or a delivery
witness. For live work, use the actual destination's full reference.

Run `dap check <source-root> [--config <relative-file>]` after generation.
Fix reported refusals. Investigate warnings such as `unowned-bound` rather
than treating them as proof of a business constraint. The package check
also runs every listed local scenario. Public TEST actors and stand-in
destinations prove local behavior, not room membership, actual publication,
or physical-device operation.

The starter includes a [leaf sender definition](../assets/starter/signal.json)
whose known digest pins the main definition's handler. The local scenario
does not deliver queued cross-scope messages. Package validation checks
that declared connection, but only a native delivery witness can show the
sender and receiver processing it together.

For direct validation, use the whole declaration with
`validateDefinition(definition, bounds, RULE_PROFILES)`. Use the target's
bounds. `PROPOSED_BOUNDS` is provisional. Do not validate an isolated row
and call the whole definition valid.

## Pack and install

Keep source, canonical definition data, and digest together. Use the
application's own generator. An authoring newline is not part of the
canonical definition bytes supplied through `--value`.

After checks pass, use an existing publisher key and a new output path:

```sh
dap pack <source-root> --config <relative-file> --publisher <existing-key> --out <new-packet-path>
```

Before installation, commit the packet and retain its printed release and
publisher. The host operator must trust that exact release and publisher.
The caller needs `application.install` in a compatible room. An ordinary
v2 package currently needs an existing historical `declared-application`
room. New room creation does not offer that family. Device-command and
archive packages have separate room and owner requirements. Do not choose
one merely to make an ordinary package installable.

Use the immutable packet URI, expected release, and one retained request:

```sh
dap install <git+https-uri> --release <release-id> --request <kept-key> --role <selected-default-role>
```

Role defaults propose grants. Omitting `--role` selects none. A package
does not grant authority by declaring defaults. Read back the active
installation and actual application scope. Retain an uncertain original
request and use its status path instead of sending a replacement.

Unsupported forms still refuse. Recorded execution is the supported
default. Sequenced groups, derivation, package parameter bindings, timed sends,
and unimplemented capability code do not become available through a
successful source build. A package signature proves identity, not a live
host, outside effect, complete journey, or migration of existing scopes.

Read the current [package install requirements](https://github.com/generalbusiness-ai/artroom/blob/main/docs/cli.md),
[application reference](https://github.com/generalbusiness-ai/artroom/blob/main/docs/write-an-application.md),
[view reference](https://github.com/generalbusiness-ai/artroom/blob/main/docs/application-views.md),
and [scope forms](https://github.com/generalbusiness-ai/artroom/blob/main/docs/scopes.md)
when the request exceeds this bundled path.
