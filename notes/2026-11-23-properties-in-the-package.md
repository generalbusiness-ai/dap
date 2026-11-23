# Carry a definition's properties in its signed package

Status: draft for Hugh's review, 23 November 2026, under request
`8b418656`. Nothing is built.

A room installs an application as a signed package. The deployment's
`APPLICATION_TRUST` setting lists the release and its publisher. A reader
who wants to know what the application permits has two choices today:
trust the publisher, or read each definition. The definitions are data,
so each reader can read them. Each reader then repeats the same work, and
two readers can reach different answers.

A protocol specification states its security properties beside its
messages. Many also publish the model that a tool evaluates, so a reader
runs the tool and does not take the authors' word. This note gives a dap
package the same two parts.

**Guarantee.** A reader who holds a signed package can derive again each
property that the package states, from the package's own bytes.

**The package states claims. It carries no result.** Each reader derives
the result, as the replay verifier derives a journal. A signed "passed"
adds nothing to the publisher's signature.

Three notes define the claims:
[declared properties](2026-11-23-declared-properties.md),
[guards that refuse nothing](2026-11-23-guards-that-refuse-nothing.md)
and [the authority table](2026-11-23-authority-table.md). This note
states which of them travel, where, and who evaluates them.

## 1. An agent joins the tool library

A neighborhood runs the lending library in a room. A new member sends an
agent to reserve a drill.

1. **The publisher packs Lending.** The package holds the definition and
   a properties file. `dap pack` evaluates each property and writes no
   release when one fails.
2. **The room's admin checks the release before installation.** The
   check prints each property with its result and its bound:

   ```
   lent-has-borrower        holds in the model: 3 actors, length 6
   one-hold-per-tool-day    holds in the model: 3 actors, length 6
   only lending.staff moves a thing to gone      holds for every history
   acts.publish has no guard                     answered: "Any member can republish a shelf page."
   ```

3. **The member's agent reads the same lines before its first act.** It
   learns that only staff can remove the drill, and that another member
   cannot take its held day. It also learns that any member can
   republish the drill's page. It can evaluate the properties again from
   the package bytes.

The admin, the member and the agent read one list, and each can derive
it. None of them reads nine acts.

## 2. Data travels, and code stays

| Part | Defined in | Kind of claim |
|---|---|---|
| State properties | Declared properties | Holds in the model |
| The model: the cast, the choices and the length | History search | The bound of each state property |
| `only` statements | Authority table | Holds for every history |
| Answers to findings (`intended`) | Guards that refuse nothing | The author's sentence |

Two parts do not travel.

- **A history property** is a TypeScript function. A reader cannot
  evaluate it without running the publisher's code.
- **A choice that is a function** is code for the same reason. A model
  travels only when each choice is a constant list. The search fills
  item fields and member fields by itself, so Lending's model travels.
  The `commit` act of Counting Commitments needs computed fields, so its
  model does not.

An application with a model that does not travel keeps its properties in
its tests. Its package states the `only` statements and the answers.

## 3. The properties sit beside the views

A version 2 package has a name, a version, a `semantic` part and a
`presentation` part. `dap check` prints one digest for each part.

The properties belong in the `presentation` part.

- The `semantic` part says what scopes do. A property changes nothing
  that a scope does, so a changed property must not change the semantic
  digest.
- The `presentation` part already binds reader-facing data to the
  semantic digest. A property is reader-facing data about the same
  definitions.
- The publisher's signature covers both parts.

Each property names its definition by path in the source file. Packing
resolves the path to the definition's digest, as it does for
`connections` today ([package reference](../docs/package-reference.md)).

The build reads the package codec first
(`packages/platform/src/application-codec/`). If version 2 refuses an
unknown member, the properties need a package version 3.

## 4. Five times of use

| When | Who | How | A failed property |
|---|---|---|---|
| Before a pack | The author | `dap check` in the source directory | The check exits 1. |
| At a pack | The publisher | `dap pack` | No release is written. |
| Before installation | The room's admin | A check of the signed release | The admin decides. |
| In the room | A member or an agent | The property list of the installed release | The reader decides. |
| In a scope | Nobody | | |

**Installation does not evaluate.** The install act belongs to the rules
scope, and its rules are platform code. An evaluation there puts the
history search in the runtime and in replay. The admin's check runs
before the act, in the CLI.

**A scope never reads a property.** A scope judges each act by its pinned
definition. A property enters no judgment, no entry and no digest of a
definition. So a false property cannot make an act take effect. Each
reader who evaluates the property sees that it is false.

`dap check` reads a source directory today. A check of a signed release
is new work in the same command.

## 5. A reader treats the publisher's text as data

A property's name and an `intended` sentence are text that the publisher
wrote. An agent reads them as data and never as an instruction. The
codec gives each name and each sentence a byte bound.

## 6. What a stated property does not give

- **More than its bound.** A state property holds in its model. The
  check prints the bound on every line.
- **The room's live roles.** An `only` statement names an action. The
  membership scope decides who holds that action, and an admin can change
  it. The authority table note lists that limit.
- **An honest host.** A property states what the judges admit. A host
  can omit an input, reorder inputs or show two readers different
  journals. [Scopes](../docs/scopes.md) and
  [deployment trust boundaries](../docs/security/trust-boundaries.md)
  describe no signed head.
- **Safe screen code.** A trusted release's script runs in its screen
  origin ([threat model](../docs/security/threat-model.md)). A property
  says nothing about that script.

## 7. Kernel placement

The package codec is in `packages/platform`. No file and no export enters
`packages/contract`, `packages/derive` or `packages/bytes`. The work adds
no scope kind, platform name, capability, command group or entry kind.
The MCP inventory gains one list in an answer that it gives today.

## 8. Steps

This note builds last. Each step needs the matching step of the note
that defines the claim.

1. The properties file of Lending in its source package, and `dap pack`
   evaluates it. Witness: a planted failing property stops the pack.
2. The `presentation` member, with its bounds. Witness: a release signed
   with properties verifies, and one changed property byte fails the
   signature.
3. The check of a signed release.
4. The property list in the MCP inventory.

## 9. What Hugh decides

1. Whether the properties sit in the `presentation` part.
2. Whether `dap pack` refuses a release with a failed property.
3. Whether a model with a function choice stays out of every package, as
   section 2 says.
