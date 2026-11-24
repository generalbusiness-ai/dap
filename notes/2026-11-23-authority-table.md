# List who can write each state, and compare two lists

Status: draft 2 for review, 23 November 2026, under request `8b418656`.
Hugh read draft 1 and said "ok by my review". Draft 2 answers the
checker's verdict `332c7cb6`. Nothing is built.

A dap definition answers "who can do this act" one act at a time. The act
names an action in `grant`. A role holds actions. A guard can require the
signer to be in a party slot of the item. The MCP inventory prints that
answer for each act, for example "moves a commitment; needs
issue.promise; from offered, to accepted. Guards: you are this
commitment's offeree" ([MCP reference](../docs/mcp.md)).

A reader who asks about safety has the opposite question: "who can put
this item in this state?" Today the reader finds every act that writes
the state and joins the answers by hand. A change of one act, or of one
role's actions, can open a state to a new role, and no report shows it.

**Guarantee.** For each item state, each slot and each send of a
definition, the table names every act, handler and timed rule that can
write or send it. Each row gives the action that the signer must hold and
each guard that reads the signer.

The table is a reading of the declaration. It runs no judge and needs no
model, so it covers every history of the definition and not a bounded
set. Each name in a code block is a sketch.

## 1. The lending library, as a table

The [lending definition](../examples/lending/definition.ts) and its
[roles](../examples/lending/roles.ts) give this table.

| Item | Change | Written by | Action | Signer must be |
|---|---|---|---|---|
| `library` | opened as `open` | `establish` | `lending.establish` | anyone |
| `thing` | opened as `available` | `donate` | `lending.member` | anyone |
| `thing` | `available` to `lent` | `borrow` | `lending.member` | anyone |
| `thing` | `lent` to `available` | `return` | `lending.member` | anyone |
| `thing` | `available` or `lent` to `gone` | `cancel` | `lending.staff` | anyone |
| `reservation` | opened as `held` | `reserve` | `lending.member` | anyone who has at most one held reservation (`count`) |
| `reservation` | `held` to `released` | `release` | `lending.member` | in `holder` |
| `reservation` | `held` to `released` | `release-by-staff` | `lending.staff` | anyone |
| `reservation` | `held` to `lapsed` | timed rule `lapse` | none | no signer |

The opening act writes each fixed slot one time. Two slots change
later.

| Item | Slot | Change | Written by | Action | Signer must be |
|---|---|---|---|---|---|
| `thing` | `borrower` | set to the signer | `borrow` | `lending.member` | anyone |
| `thing` | `borrower` | cleared | `return` | `lending.member` | anyone |
| `thing` | `borrower` | cleared | `cancel` | `lending.staff` | anyone |
| `thing` | `reason` | set from a field | `cancel` | `lending.staff` | anyone |

Each send is `publish-file` to the library's destination. The signer
supplies the text in the field `content`.

| Sent by | Action | Path | Guard on the item |
|---|---|---|---|
| `donate` | `lending.member` | The field `page`, under the rule `shelf-page` and unused by any thing | none: the act opens the thing |
| `borrow` | `lending.member` | The thing's `page` | `available` |
| `return` | `lending.member` | The thing's `page` | `lent` |
| `cancel` | `lending.staff` | The thing's `page` | `available` or `lent` |
| `publish` | `lending.member` | The `page` of a thing that the signer names | none |

| Role | Actions |
|---|---|
| `admin` | `lending.member`, `lending.staff`, `lending.establish` |
| `member` | `lending.member` |
| `agent` | `lending.member` |

Genesis has its own authority checks. The directory's act
`establish-application` creates the scope, and that act needs
`application.establish`.

Two rows differ. `release` requires the signer to be the `holder`.
`return` has no such guard, so any member can return a thing that another
member borrowed. A library can intend that. The table shows the row, and
the author decides.

The send table shows a second fact. Five acts write a shelf page, and in
each one the signer supplies the text. So a member who can borrow a
thing can also write its page.

## 2. Each column comes from one declared form

| Column | Form |
|---|---|
| Item and change | The act's `step`, its item type, its `state` guards and its state effect. |
| Written by | The act, the handler in `receives`, or the rule in `timed`. |
| Action | The act's `grant`. |
| Signer must be | The act's `signer` and `notIn` guards. Each other guard that reads the signer prints in the row by its form, as the `count` guard of `reserve` does. |
| Send | The act's `sends`: the message, the target slot and each field's source. |
| Role | The package's `roles`. |

A slot write gives a row of the same shape, with the slot in place of the
states.

The MCP inventory reads the same forms to write its sentences for one
act (`packages/mcp/src/describe.ts`). The
[act environment note](2026-11-14-act-environment.md), section 10, puts
those sentences in one descriptor of an act for every adapter. The table
gives the same forms by item state. The table and the sentences must come
from one reading, so that they cannot differ.

Three forms limit what the table can state.

- **A rule expression.** A `rule` guard can compare the signer with a
  slot. The table does not read expressions. It prints the rule's name in
  the row, and the reader opens the expression.
- **A conditional effect.** An effect with a condition gives a row that
  carries the condition.
- **A handler.** A message from another scope writes the state. The row
  names the sender's definition, and the signer column is empty.

## 3. The author states the rows that must not open

The table is a derived file. An author can also state what the table
must keep true, in the properties file beside the definition:

```ts
only(thing, "gone", { action: "lending.staff" }),
only(reservation, "released", { anyOf: [{ signer: "holder" }, { action: "lending.staff" }] }),
```

`dap check` compares each statement with the table. A new act that moves
a thing to `gone` with `lending.member` fails the first statement, by
name. This check is exact for every history, because the table reads the
form. A row that depends on a rule expression fails a statement until the
author names that rule in it.

These statements are data, and they can travel in a package
([properties in the package](2026-11-23-properties-in-the-package.md)).

**A statement that reads the form is stronger than a property in a
model.** The lending definition allows one held reservation for a tool
and a day. The [declared property](2026-11-23-declared-properties.md)
`one-hold-per-tool-day` shows that fact in a model. The form shows it
for every history, by four facts:

- `reserve` is the only act that opens a held reservation.
- Its first guard refuses an equal tool and day.
- Both slots are fixed.
- No act returns a reservation to `held`.

A later version can add a `unique` statement that reads those four
facts. The first version has `only`.

## 4. A comparison is a diff of two tables

The table is written as a generated file beside the definition, as
`docs/lanes-reference.md` is generated from the lane declarations today.
`npm run pins` fails when the file is not current.

So a change to who can write a state appears as changed lines in the
diff of a head. A reviewer reads "`cancel` | `lending.member`" where the
line said `lending.staff`. The first version needs no other comparison.

Three later uses compare two tables in a command.

- **A new release.** `dap pack` compares the new table with the table of
  the last signed release and prints each row that opens.
- **An upgrade.** A member who holds `application.install` signs
  `upgrade-application` to move an installation to a newer release
  ([the dap command](../docs/cli.md)). The command prints the comparison
  before the member signs.
- **A change of a role's actions.** An admin signs `set-actions` on the
  membership scope, and the act replaces the role's whole list. The
  command prints each act that the role gains and each act that the role
  loses, from the installed definitions.

## 5. What the table does not state

- **The room's live roles.** The table reads the package's `roles`. The
  membership scope of a room holds the roles in force, and an admin
  changes them with `set-actions`. A member who holds `membership.manage`
  can give any role any action. The table prints that fact as its first
  line.
- **Platform rules.** A platform act has an action, and the inventory
  prints it. Its other rules are code
  ([K1](../docs/kernel.md#k1)), and the table does not read code. One
  admin can publish a room's rules alone
  ([threat model](../docs/security/threat-model.md)). The table cannot
  derive that fact.
- **Revocation time.** A scope can use a cached observation of a grant
  inside its window. A removed member can act until the window ends.
- **The host.** The table states what the judges admit. It does not state
  that the host judged every input.

## 6. Kernel placement

The table is a derivation in `packages/define`, and the CLI prints it. No
file and no export enters `packages/contract`, `packages/derive` or
`packages/bytes`. The work adds no CLI command group.

## 7. Steps

1. The table for one definition, as a generated file with a pins check.
   Witness: the three Lending tables of section 1 match a hand-checked
   copy, and a planted `signer` guard on `return` changes one line.
2. `only` statements in `dap check`. Witness: a planted `cancel` with
   `lending.member` fails by name.
3. One reading for the table and the MCP inventory.
4. The three comparisons of section 4, each with its own request.

## 8. What Hugh decides

1. Whether the first version is a generated file that review reads, with
   no comparison command.
2. Whether `return` by any member is the intended design of Lending.
3. Whether step 3 belongs to this work or to a later request of the act
   environment.
