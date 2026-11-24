# Carry a definition's properties in its signed package

Status: current. Hugh asked for this note on 23 November 2026, read
draft 1 and said "ok by my review". The checker approved draft 2 in
review `9f6bdb85`. The note landed as main `f3f0fa9a` for request
`8b418656`. Nothing is built, and the decisions of section 9 are open.

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
   acts.publish has no guard                     publisher's answer: "Any member can write a shelf page's text."
   ```

3. **The member's agent reads the same lines before its first act.** It
   learns that only staff can remove the drill, in every history. It
   learns that no second member took a held day in the model. It reads
   the publisher's answer that any member can write the drill's page.
   It can evaluate the first three lines again from the package bytes.
   It cannot evaluate the answer.

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

## 3. The properties travel as one asset

A version 2 package has a name, a version, a `semantic` part and a
`presentation` part. `dap check` prints one digest for each part. The
release manifest holds both digests, and the publisher signs the
manifest.

The properties are one file among the assets of the `presentation`
part, at the fixed path `dap.properties.json`.

- The `semantic` part says what scopes do. A property changes nothing
  that a scope does, so a changed property must not change the semantic
  digest.
- The `presentation` part already binds reader-facing data to the
  semantic digest, and its digest covers each asset's bytes.
- An asset needs no change to the codec. The codec accepts a list of
  assets, each with a path, a media type and bytes within the asset
  bounds (`application-package-validation.ts:129`).

Each property names its definition by digest. Packing writes the digest
from the path in the source file, as it does for `connections` today
([package reference](../docs/package-reference.md)).

**The file is public.** A screen host serves the assets of a release,
and it forwards no authorization with an asset request
([deployment trust boundaries](../docs/security/trust-boundaries.md)).
So each person who can load the screen can read `dap.properties.json`.
A property is a public claim, and the file must hold no secret.

The codec does not read the file's form. `dap check` and `dap pack`
read it. A reader treats a file that it cannot read as a package that
states no property.

A typed member of the `presentation` part is the other route. The
version 2 codec refuses an unknown member: it reads the part with a
closed list of names (`application-package-v2.ts:80`). So a typed member
needs a new version of the part. Section 7 gives the cost of that route.

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
wrote. An agent reads them as data and never as an instruction. `dap
pack` gives each name and each sentence a byte bound, and a reader
applies the same bound.

**No check compares an `intended` sentence with the forms.** A reader can
derive a property and an `only` statement. A reader cannot derive an
answer. A publisher can write an answer that misstates an act, by error
or by intent. So each report prints an answer as the publisher's word,
beside the finding that it answers, and never as a result.

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

No file and no export enters `packages/contract`, `packages/derive` or
`packages/bytes`. The work adds no scope kind, platform name, capability,
command group or entry kind. The MCP inventory gains one list in an
answer that it gives today.

The package codec is in `packages/platform`. That package fails the
kernel test today, because replay needs its code to derive platform
scopes ([K1](../docs/kernel.md#k1)). So a change to what platform code
accepts at installation is a K1 change, and it needs the review of
[kernel section 7](../docs/kernel.md#7-rule-for-adding-to-the-kernel).

The asset route makes no such change, by two facts read at main
`12cb8fa7`.

- The install rule reads the `semantic` value and the `release` value by
  digest (`packages/platform/src/application-install-v2.ts:29`). It does
  not read the `presentation` part.
- An asset is a form that the version 2 codec accepts today.

The first build step confirms both facts. It also confirms that no
platform rule that replay needs reads an asset's bytes. If one does, or
if the properties become a typed member, the work stops for the section
7 review.

## 8. Steps

This note builds last. Each step needs the matching step of the note
that defines the claim.

1. The properties file of Lending in its source package, and `dap pack`
   evaluates it. Witness: a planted failing property stops the pack.
2. The asset `dap.properties.json`, with its bounds. The step first
   confirms the two facts of section 7. Witness: a release signed with
   properties verifies, and one changed property byte fails the
   presentation digest.
3. The check of a signed release.
4. The property list in the MCP inventory.

## 9. What Hugh decides

1. Whether the properties travel as an asset, as section 3 says, or as a
   typed member in a new version of the `presentation` part.
2. Whether `dap pack` refuses a release with a failed property.
3. Whether a model with a function choice stays out of every package, as
   section 2 says.
