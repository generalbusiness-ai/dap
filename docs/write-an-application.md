# Write an application

To write a dap application, declare its definitions as data, validate
them, pin their bytes, and create scopes under them. This page gives each
step. For the guided path, take a tutorial first,
[Build a counter](build-a-counter.md) or
[Build a lending library](build-a-lending-library.md), then
[Run your app](run-your-app.md), which runs the tutorial's definition in
a room. [The architecture of a dap application](architecture.md) explains
what the runtime does with a definition.

A definition names the items a scope holds, the acts people and agents
sign, the conditions each act must meet and the changes it records. The
runtime judges those acts, keeps the record and delivers the messages the
definition declares. You write no judging code.

## Start from a template

Start from a template and remove what your application does not need:

- For a first application, start from the `definition.ts` that you wrote
  in [Build a counter](build-a-counter.md) or
  [Build a lending library](build-a-lending-library.md).
- For a small application with turns and a target, start from the
  [Counter definition](../apps/counter/definition.ts).
- For things that members hold, lend and remove, with a member role and a
  staff role, start from the
  [lending definition](../examples/lending/definition.ts).
- For work shaped around issues and changes, start from the room's demo
  profile in [demo.ts](../apps/room/lanes/src/demo.ts). It selects acts
  and handlers from the full lane definitions and keeps their item types
  and timed rules.

After you remove rows, validate the whole result.

## Write a definition in TypeScript

The typed helpers are optional. The tutorials write each definition as
plain objects with the types of `@generalbusiness/dap-contract`, and that
form stays valid. `@generalbusiness/dap-define` runs only from a checkout
of this repository, because its publication has not run (see
[Release status](#release-status)). Its package exports its TypeScript
source, `src/index.ts`, and declares no `bin` command. Plain `node` refuses
that source with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, because the source
uses a TypeScript parameter property. Keep a file that imports the
helpers in the checkout, and run it with `tsx` from the repository root:

```sh
node --import tsx my-definition.ts
```

`npm ci` in the checkout installs `tsx` 4.21.0, a dependency of the CLI
package.

Import the authoring helpers from `@generalbusiness/dap-define`. Declare
items and acts as values, then pass them to `define`. Call `compile` on the
whole definition before you pin it. The compiler runs the existing
validator and reports the act, form, and offending value for a finding.
Keep the compiled JSON beside its authored source.

```ts
import {
	compile, define, grants, item, live, open, required, text, value,
} from "@generalbusiness/dap-define";

const permit = grants({ establish: "example.establish" });
const root = item("root", {
	states: { open: live },
	values: { label: value.fixed(text(40)) },
});
const establish = open(root, permit.establish, {
	fields: { label: required(text(40)) },
}, ({ f, on }) => ({ effects: [...on.take(f, "label")] }));
const authored = define({
	name: "example", genesis: "establish", grants: permit,
	items: [root], acts: { establish },
});
const { definition, digest, refusals } = compile(authored);
```

Use the same six patterns throughout the definition:

- Read slots and apply effects through a subject such as `on`, an `also`
  item, or the item that a range scans.
- Quantify over items with `none`, `some`, `count`, and `sameSet`. Quantify
  over list elements with `each`, `has`, and `distinct`.
- Wrap conditions with `when`, `anyOf`, `ifPresent`, and `require`.
- Send messages with `tell`, `create`, `relate`, and `index`.
- Write handlers with `receive`, using the same subjects and forms as acts.
- Pass declared item and act values into modules as explicit arguments.

Use `by` or `via` once to declare another subject. Use `siblings` when one
subject reads another sibling. Compare reads with primitive literals in
`equals`, `differs`, and range predicates. Use `on.take` for fields whose
names match their destination slots. Pass the slot names in effect order.

Declare grants with `grants` and refusal names with `reasons`. Use those
values in acts and guards. The compiler checks the declared names and
returns per-act `refusals` beside the definition. Write an inline `rule`
where the guard uses it. `define` collects its expression in `rules`.

When you author the package too, declare its roles first with
`declareRoles` from `@generalbusiness/dap-define/package`. Its `grant`
method accepts only an action held by those roles. Pass the returned
grant to an act and the same `roles` value to `manifest`. The manifest's
type checks reject an act whose action no role holds.

Act fields that contain record lists expose their declared members inside
list callbacks. For a list read from a fetched fact, declare its members
with `elements(list, "memberName")`. An unannotated list exposes only
`self`. Keep ordinary operands as plain data and modules as functions.
Use `elementMember(row, "self")` to read a declared member named `self`;
`row.self` reads the whole element.

Use `reference(fragmentBytes)` for a document or entry citation. The bound
limits its optional UTF-8 fragment. A citation grants no authority and
retains no dependency. Wrap the type in `required` or `optional`, as for
other fields, and let `compile` check the bound.

Use `withDefault(optional(type), start)` for an act field with a default.
Use `on.every(fieldOrSlot, ...states)` for a list of local items and
`on.notSigner(...partySlots)` to exclude the signer. `some(range(...))`
requires a matching item. To send a bounded report, put
`collect(range(...), members)` in a send field. Use `authorsOf(range(...),
partySlot)` as an additional source of an attribution effect.

To compare a fetched field fact with the current input, use
`isFact(f.report, [equals({ field: "label" }, f.label)])`. The left read
names a field in the fetched entry; the right read names the current
input. Only a field fact accepts these comparisons. Pass `where` and
`except` in `sameSet` options to filter its item range before it matches
the list's keys. The filter reads the scanned item, not a list element.

Redact a detached text with `on.redact(slot)`. Declare a settlement mark
with `value.required(bool, false)` and `on.settlesBy(mark, ...states)`.
Set that mark only to `constant(true)`. In a `relate` handler, use
`update("state")`, `update("item")`, or `update("revision")`. Use
`resultReason` only in a send's result effects. A timed rule can notify
a party slot through `attention`; its notice takes no condition.

Pass durability and capacity as `define` options, for example
`level: { name: "recorded", version: 1 }` and
`capacity: { name: "whole-scope", version: 1 }`. Omit either option to keep
it out of the pinned bytes. Pass handler `late`, `order`, and `copies`
options directly to `receive`, and result clauses directly to the send
helper. Use `part(read, { of: entryPart, then: "scope" })` for a compound
entry part. These existing options need no separate constructors.

Keep these four forms distinct:

- **Builders:** author item, act, handler, and module values that compile
  into the pinned declaration.
- **Derivations:** compute the pin, field types, available acts, and input
  schemas from the declaration. Do not author copies of these results.
- **Annotations:** keep labels, units, refusal words, and view descriptions
  in typed sidecars keyed by the definition's names, outside the pin.
- **Code:** type implementations such as a shelf fold or voice controller
  from the definition's values.

Reference platform definitions by their types. Do not author platform
membership, destination, or rules definitions through these helpers.

The compiled declaration remains the data that a scope pins and judges.
Importing authored code gives that code no authority over the scope.
Use the [generated vocabulary](../spikes/typed-surface/VOCABULARY.md) to
find helper names and forms. The [Lending definition](../examples/lending/definition.ts),
[Counter commitments](../apps/counter/commitments.ts),
[Grow Room](../examples/grow/authoring/room.ts),
[Grow Site](../examples/grow/authoring/site.ts),
[Change](../apps/room/lanes/authoring/change.ts), and
[Issue](../apps/room/lanes/authoring/issue.ts) show complete values.

Grow and the lanes keep authoring offline. Runtime wrappers import one
generated JSON artifact per definition. Lane wrappers import their types
from the authoring modules with `import type`. Grow wrappers retain the
mutable contract type that its demo variants use. Runtime paths never
import Define or an authoring module by value.

To record an additive extension, pass a compiled parent and the child
definition to `extend`. Preserve every inherited form. `compile` returns
the parent's digest and the added item, act, handler, timed-rule and rule
names as `provenance`. This metadata stays outside the definition's
serialized bytes. Package derivation and parameters remain reserved.

When an effect attributes authorship, name both subjects. In
`target.attribute("authors", work)`, the effect writes the `authors` party
slot on `target`. Its nested `attribute.of` names `work`, whose author
slots supply those authors. The effect's outer `of` names `target`.

To check all six authored definitions against their retained JSON and pins, run:

```sh
node --import tsx scripts/check-definition-pins.mjs
```

The gate runs this check without changing the retained files. If a file
differs, inspect the authored change before you regenerate and review its
new pin. To regenerate Grow, run the same command with `--write grow`.
To regenerate the lanes and their descendants, run
`node apps/room/lanes/scripts/pin.mjs`. The lane producer writes both
base parents before it imports a descendant. Its opt-in successor modes
check the parents without rewriting them.

### Release status

`@generalbusiness/dap-define` is in the release plan, and its
compiled-output check and publication have not run.

## Declare the item types

Write the item types first, in the definition's `items`.

An item type names its states, initial state and final states. Its slots
hold people (`parties`), references (`refs`) and values (`values`). Say
whether a slot is required and whether it may change. Say how many items
of the type the scope may hold.

For example, [Build a lending library](build-a-lending-library.md)
declares a `thing` item. Its states are `available`, `lent` and the final
state `gone`, and a new thing starts `available`. Its `parties` hold the
fixed `donor` and the changeable `borrower`. Its `values` hold a fixed
`name` and `description` and a changeable `reason`. The library holds at
most 64 things (`many: true, max: 64`). [Build a counter](build-a-counter.md)
declares one `board` item (`many: false, max: 1`) and at most eight
`player` items.

For larger item types, read the [issue](../apps/room/lanes/src/issue.ts) and
[change](../apps/room/lanes/src/change.ts) declarations beside the
[generated row reference](lanes-reference.md). Keep the names your
application needs and remove the others.

## Declare the acts

Write the acts in `acts`. Each act says whether it opens an item,
changes an item or comments. It declares the fields the signer supplies,
the action in `grant` that the signer must be allowed to take, the guards
that must hold, the effects it writes, and the messages and notices it
sends.

The library's `borrow` act changes a `thing`, so its `step` is
`transition`. The signer supplies no fields and needs `lending.member`.
Its one guard requires the state `available`. Its effects move the thing
to `lent` and make the signer its `borrower`. The counter's `say` act
takes a field `n` and needs `counter.play`. Its first guard requires the
state `counting`. Each of the other three names a refusal reason, such as
`not-your-turn`. Its last effect moves the board
to `done` when `n` equals the board's `target`.

Then write the handlers in `receives` and the timed rules in `timed`.
A handler says what a message from another scope changes. A timed rule
says what changes when a recorded deadline passes. Both are events the
application declares as part of the same definition.

## Put each invariant where it lives

Write each invariant as a plain sentence before you choose its form.

| Invariant | Where it lives |
|---|---|
| Only a player may count. | The counter's `say` guard `{ some: { ...players, where: [isSigner] }, reason: "not-a-player" }`. |
| Nobody counts twice in a row. | The `say` guard `{ notIn: ["last"], reason: "not-your-turn" }`. |
| Each number is one more than the last. | The rule expression `next-number`, `fields.n = subjects.on.values.count + 1`, which a `say` guard names. |
| A finished count cannot change. | `done` is a final state of the counter's `board` item. |
| A thing that is lent cannot be borrowed again until it is returned. | The lending `borrow` guard `{ state: ["available"] }`. |
| Only staff remove a thing from the library. | The lending `cancel` act names `lending.staff` in its `grant` field. In the rehearsal room, membership gives that action to the `admin` role only. |
| A person may count only when allowed to. | The `say` act names `counter.play` in its `grant` field, and membership says who is allowed to take it. Being allowed does not replace the act's guards. |
| Each recorded attempt at an outside effect is sent at most once, including across restarts. | The platform's operation ledger and driver. The application inherits this rule. |
| Publishing a change to the rules extent needs the controller's approval. | The room's published rules configuration, which its controller may change. The destination judges the change against that configuration. |

For an outside effect, a lost answer does not mean that nothing happened.
The durable send mark remains, and the attempt may have an `unknown`
outcome. The original mutation is not sent again. A new attempt must be
opened by an entry under its owner's rules. See the
[operation driver](../packages/scope/src/operations.ts).

A definition is pinned for the life of its scope. Removing an act or
changing a guard makes a new definition with a new digest. Activating that
definition lets the directory create new lanes under it. Existing lanes
keep the digest they pinned. Room rules, such as required approvals and
checks, have their own published revisions. See [Scopes](scopes.md) and
[Lanes](../apps/room/docs/lanes.md) for those boundaries.

## Choose the durability level

A definition without `level` uses recorded durability: the runtime
commits its journal before it answers with a receipt. You can declare
that requirement explicitly with `level: { name: "recorded", version: 1 }`.
The explicit member changes the definition's bytes and digest. It does not
change an existing scope's pin. The Live and Sequenced levels are not
built. The validator refuses their declarations as
`unsupported-definition`.

An archive is a binding of the room, not of a definition. A signed
package can require it with `host.requires: ["archive"]`, and
installation in a room without the binding ends with
`archive-unavailable`. An admin binds an archive when the room is
created or later with `bind-archive`.
A binding does not prove that any journal has been
exported. [The dap command](cli.md) lists the creation cohorts that can
bind one.

## Validate the whole definition

`validateDefinition(definition, bounds, profiles)` checks the whole
declaration before a scope pins it. It checks names and forms, required
slots, effects, counts and the space needed for timed entries. It returns
the validated definition or the problems that refuse it.

Use the installation's bounds. The supplied examples use
`PROPOSED_BOUNDS`. These numbers are provisional. If the definition
declares rule expressions, pass `RULE_PROFILES` from
`@generalbusiness/dap-derive/rule` as the third argument, as the
[Counter's tests](../apps/counter/definition.test.ts) do. Each tutorial's
`run.ts` makes the same call before it runs the definition. The
[lane definition tests](../apps/room/lanes/test/definitions.test.ts) show
the validator calls for the room's lane definitions and their demo
profiles, which declare no rule expressions.

The imports below use the published SDK names. The lane demo definitions
are checkout-only source, because the public SDK has no lanes package.
From the repository root, with its workspace dependencies installed, this
command validates both demo profiles:

```sh
node --input-type=module <<'JS'
import { PROPOSED_BOUNDS } from '@generalbusiness/dap-contract';
import { validateDefinition } from '@generalbusiness/dap-derive';
import { issueDemo, changeDemo } from './apps/room/lanes/src/demo.ts';
for (const definition of [issueDemo, changeDemo]) {
	const result = validateDefinition(definition, PROPOSED_BOUNDS);
	if (!result.ok) {
		console.error(JSON.stringify(result.problems));
		process.exitCode = 1;
	} else {
		console.log(`${definition.name}: valid, ${result.definition.digest}`);
	}
}
JS
```

It prints:

```
issue: valid, sha256:82a938c8f54ddcac7974ca688ebea7d51c35d2aa70f4e3729965e9f915bc464e
change: valid, sha256:d86c64ae0a570165660a6eb4d75153b8c2f59c9cdaec2ecc789e2c38524a17a2
```

To validate your own declaration, give the validator the whole value and
its bounds. Resolve the reported problems before you pin. Validation
checks the declaration's form. It does not show that a host, an outside
adapter or a whole application journey works.

## Pin the definition's bytes

Pin the canonical JSON of the validated definition and its digest. A
scope records that digest at genesis. The digest covers the whole value
in the definition's byte domain, so changing any row changes it.

Keep the declaration, its canonical bytes and its digest together. The
Counter keeps them in [definition.ts](../apps/counter/definition.ts),
[definition.json](../apps/counter/definition.json) and
[pin.ts](../apps/counter/pin.ts), and its test checks that the three
agree. The room's lane package keeps its declarations in `src`, readable
JSON in `definitions` and digests in `src/digests.ts`. Its
[pin script](../apps/room/lanes/scripts/pin.mjs) writes every lane
definition and its digest. Its
[reference script](../apps/room/lanes/scripts/reference.mjs) writes the
row reference, [lanes-reference.md](lanes-reference.md).

To pin the lane definitions and check the reference, run from the
repository root:

```sh
node apps/room/lanes/scripts/pin.mjs
node apps/room/lanes/scripts/reference.mjs --check
```

The pin script prints one line per definition, with its digest and the
size of its formatted JSON. The reference check prints
`docs/lanes-reference.md is current` when the page matches the
declarations. After you edit a lane declaration, the pin script writes
its new bytes and digest. Generate the reference from the same
declarations before you review them.

## Write scenarios

Author a local scenario with `tell` from
`@generalbusiness/dap-define/story`. Give it the definition, projections,
explicit public TEST seeds, grants and founding fields. Its act methods
check field names and types against that definition. Each act reads its
expected item revisions from the fold, including the items that the
maintained `also` resolver selects.

For each step, supply an `OutcomeAssertion` with every entry's input,
ordered effects and sends. Supply empty lists explicitly when the step
writes nothing. `advance` requires the complete timed firings for that
step. Generation refuses a different judge answer or any unasserted
entry, effect, send or firing. These checks stay with the step that owns
them; they add no fields to scenario v1.

The [Lending story](../examples/lending/story.ts) is the complete example.
It emits the retained
[scenario file](../examples/lending/scenarios/application.json), including
its refused membership and path cases. The story's `projection` steps
read their rows from the same fold. Keep author-supplied projection
metadata in the order you want it in the JSON file. `dap check` consumes
the generated v1 JSON through its existing scenario path.

A scenario states one invariant and shows the acts that reach it. Include
the refused path that distinguishes the invariant, as well as the path
that takes effect. Each tutorial's `run.ts` is a small scenario: it signs
acts that take effect and acts that the scope refuses, and prints each
answer. For a package,
[Check and preview a package](check-and-preview-a-package.md) shows a
scenario file that `dap check` runs. For the demo profile, the
[story scenario](../apps/room/lanes/test/story.scope.test.ts) covers an
open extent and a controlled extent. The
[real-room scenarios](../apps/room/lanes/test/wiring.scope.test.ts) cover
membership, rules and publication together.

Read each scenario's stated boundary. These scenarios run real scopes
and their rules, with a stand-in host and changed set. They do not run a
hosted application or a checker runner. A live run is separate evidence.
[Test dap](testing.md) explains how to choose and run the witnesses for a
change.

## Create a scope under the definition

A definition takes effect when a scope pins it at genesis. There are two
paths.

**A lane in an existing room.** The room's rules scope keeps the list of
active definitions. A member who holds `rules.activate`, an admin by
default, signs `activate` with the definition's digest and its canonical
bytes. The room's directory then creates new lanes under it. The command
reads the `--value` file at the path you give. For the demo profile of
the change lane, run this from the repository root, where the pin script
wrote readable `apps/room/lanes/definitions/change-demo.json`. Canonicalize
that value before passing it to the byte-preserving client:

```sh
node --input-type=module -e 'import { readFileSync } from "node:fs"; import { canonicalize, parseStrict } from "@generalbusiness/dap-bytes"; process.stdout.write(canonicalize(parseStrict(readFileSync("apps/room/lanes/definitions/change-demo.json", "utf8"))))' > /tmp/change-demo.canonical.json
dap act activate --on rules --set digest=sha256:d86c64ae0a570165660a6eb4d75153b8c2f59c9cdaec2ecc789e2c38524a17a2 --set name=change --value /tmp/change-demo.canonical.json
```

Lanes that already exist keep the digest they pinned.

**A new application scope.** [Run your app](run-your-app.md) walks
through this path with the counter tutorial's definition. A room created
with `dap install --cohort application` has a directory whose act
`establish-application` creates one scope under a definition that the
rules scope has already activated. The act takes the definition's
digest, the other genesis fields as canonical JSON in `values`, and
`execution=recorded-do`. The directory supplies the signer as the
genesis `opener`. The definition and every definition it creates must
use no capabilities, and the genesis fields may not be facts, items or
detached texts. Membership must then allow the intended members to take
the definition's own actions, such as `counting.control`. Enrollment
alone allows none.
[The dap command](cli.md#an-explicitly-selected-application-room) lists
the install and create commands and the custody each one needs.

The lending library's [runbook](../examples/lending/runbook.md) has the
commands for this path: `activate`, `establish-application` and
`set-actions` for each role. Its rehearsal section records them run on a
deployed service on 14 October 2026, under the library's first
definition. `--value` sends a file exactly as it is, and the digest
covers the canonical value bytes. The runbook parses the readable source
and writes that canonical value first.

Validation, pins and creation check the declaration and its record. They
do not show that a host, an outside adapter or a whole application
journey works. A live run is separate evidence.

## Package several definitions

For a package with one declared entry, use `items`, `entries`,
`projection` and `manifest` from `@generalbusiness/dap-define/package`.
Choose the slots to display, layout, roles, assets and browser entry.
The builders derive field types and nullability, sorted states and act
lists, host profile, capabilities and scope-reference connections from
the definition. The
[Lending package](../examples/lending/package.ts) and
[Counter package](../apps/counter/package.ts) author their existing
manifest data this way.

Bind views with `views(definition, projections, roles)` from the same
subpath. Select a projection and source through `card`, `carousel`,
`record`, or `log`. The callback supplies `row`, `text`, and `when`.
Use `text` holes for templates and `when` holes for flat row references
in conditions. Item rows also supply `act(kind, label, when, options)`;
that helper derives the required grant from the selected native act.
Its optional `args` and `parameters` use that act's declared fields.
Journal rows expose no act constructor.

Choose an actor from the selected member fields. Use selected integer
fields for scaled facts and time fields for age facts. Context and
fallback templates can also use the callback's `waiting` reference.
The manifest checks back targets after you supply the complete view
map. The host still admits conditions, checks current authority, and
submits native acts through its ordinary guards.

To put several definitions in one signed package, read
[Package reference](package-reference.md) and
[Check and preview a package](check-and-preview-a-package.md). A room of
the `base` cohort installs the package.

## Publish a file from an act

A room of the `application-publication` cohort has a destination that
publishes a file when an application's act asks it to. That cohort is not
among the cohorts a new room can be created with today, so a new
`application` room cannot publish files from an act. The lending
library's rehearsal room is
one that can. [The dap command](cli.md) lists the current cohorts.

Declare a genesis field named `destination`, with type `scope` and kind
`destination`. Keep that reference in a fixed item slot. The directory
supplies its own recorded destination, including its incarnation. Do not
include `destination` in the caller's genesis `values`. The factory
refuses it even when the definition declares no such field.

Declare a `tell` to that slot with message `publish-file`, fields `path`
and `content`, and result clauses for `refused` and `undelivered`. The
path is at most 1,024 bytes, and the UTF-8 text is at most 65,536 bytes.
The [lending definition](../examples/lending/definition.ts) shows this
form. Its guards further restrict paths to the shelf and keep each path
owned by one thing, including after that thing is gone.

An application of the room can overwrite any ordinary repository path.
The host refuses reserved paths and the rules control extents, as
[Application file publication](application-views.md#application-file-publication)
describes. The room's change-review rules do not govern
`publish-file`. Control remains at activation and creation: a member needs
`rules.activate` to activate the definition and `application.establish` to
create its scope. Activate only definitions whose writes you trust. The
destination proves that its own directory created the sender before it
pushes the file.

The act takes effect before the destination pushes. A successful act or
delivery does not prove that its page is published. Read the destination's
receipt to connect the sending entry and send ordinal to its commit. For
the same sender and path, a later source position (entry number, then
send ordinal) supersedes older unsent work even if it arrives first. An
unknown push keeps the publication slot and is never resent. Later work
waits behind it.

## Source

Checked against main `6bfb6e16` on 10 November 2026. Sources:
[the definition forms](../packages/contract/src/definition.ts),
[the validator](../packages/derive/src/validate/index.ts),
[the package validation](../packages/platform/src/validate-package.ts),
[the lane pin script](../apps/room/lanes/scripts/pin.mjs),
[the lending definition](../examples/lending/definition.ts), and
[the Grow device forms](../examples/grow/authoring/forms.ts). The validation and
pin commands on this page ran on 12 October 2026 at main `d309b6b9`, and
the printed digests are from that run. The same validation at main
`6bfb6e16` prints the same digests. The scope-creation commands were
not run for this revision. The text about consuming the published Grow
release that an earlier revision carried is kept in
[the relocated text of the 30 October
review](../notes/implementation/2026-10-30-docs-relocated-text.md).
