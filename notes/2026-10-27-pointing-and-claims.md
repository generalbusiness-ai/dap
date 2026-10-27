# Pointing and claims: the common part of a room and the local part of a package

Status: current. A proposal to the planner, filed on 27 October 2026
against main `6f47bf98`. Nothing here is built. It amends the
[self-contained applications](2026-10-15-self-contained-applications.md)
note (sections 4 and 6) and the
[application packages](2026-10-18-application-packages-and-builder-room.md)
note (sections 2 and 3). It changes no landed document in this head.

## 1. Scene

A room holds a matter that several parties work on: an owner, a
contractor, an insurer, and the agents that act for them. The matter is
about concrete things: a wall, a drawing, a bill, a photograph. What a
thing means differs by party. The owner sees the kitchen they want. The
contractor sees a scope to price. The insurer sees evidence of a date.
The parties can work together without agreement on meaning. They need
agreement only on which thing is meant, and they need a way to record
agreement when they reach it.

An application package adds rules: what counts as a proposal, an
acceptance or a completion, and what each one changes. Every member runs
the same rules and gets the same verdict. That is the strong part. It is
also where an application overreaches. A package can fix the cast,
the decision rights and the closing of a matter before the parties have
claimed any of it. Such a package forces one party's structure on the
others. The
catalogue of use cases shows this in every card that names who decides.

This note separates two parts of a room. The common part lets anyone
point at a thing, say something about it, and sign a claim with named
parties. It needs no application. The local part is each party's own
reading of the record: projections, screens and the words for each act.
A package then enters the common record only through a claim or through
an authority that one party already holds. Section 2 defines the terms.
Section 3 specifies the common part as one package. Section 4 says how
another package reads it. Section 5 makes the local part adoptable by
each member. Section 6 states the rule for item ends. Section 7 gives
the scenarios every package runs. Sections 8 and 9 list the changes and
the slices.

## 2. Terms

- **Thing**: an item that stands for something outside the record, with
  a label and locators. A thing has no final state.
- **Locator**: one way to find a thing: a digest, an address, an
  external identity, a member, or a record of another scope's entry. A
  locator is display data. Nothing verifies it.
- **Pointing**: an act that opens a thing or adds a locator to one. It
  needs no agreement.
- **Statement**: text that one member signs about one or more things. A
  statement is a comment entry. It opens no item.
- **Claim**: an item with named parties and one text. Its kinds are
  `agree`, `dispute`, `close` and `same`.
- **Signature**: a party's act on a claim. The claim takes effect, as
  `agreed`, in the entry of the last signature.
- **Agreeing entry**: that entry. It is the fact that a package presents
  as evidence of consent.
- **Commons**: the package that declares things, statements and claims.
  Every room installs it once.
- **Common part** of a package: its definitions, their guards, effects,
  connections and rights. Every member runs it.
- **Local part** of a package: its projections, screens and act
  descriptions. A member adopts a local part for their own reading.
- **Consent**: the signature of a member whom an act binds. A party slot
  states how a member enters it: by signing, by a claim, or by
  declaration.

## 3. Commons package

The commons is a declared package in the form of the
[packages note](2026-10-18-application-packages-and-builder-room.md).
Its logical name is `ai.generalbusiness.commons`. Its one definition is
named `commons`. A room installs it at creation, and its scope is one
for each room, like the capture scope of the
[capture note](2026-10-21-capture-with-source.md). It holds no server
code and no screens of its own. The generic interface of the host shows
it.

### 3.1 Items

| Item | Many | States | Parties | Values and refs |
|---|---|---|---|---|
| `thing` | yes, at most 100 live | `open` | `pointer`: the author of the opening act, fixed | `label`: text, at most 256 bytes. `digests`: list of at most 16 digests. `addresses`: list of at most 16 texts of at most 1,024 bytes. `members`: list of at most 16 members. `entries`: list of at most 16 records `{ scope: text, seq: int, hash: digest }`. None is fixed. |
| `claim` | yes, at most 100 live | `proposed`; `agreed` final; `withdrawn` final | `proposer`: the author, fixed. `parties`: list of at most 16 members, fixed, required. `signed`: list of at most 16 members, not fixed. | `kind`: enum `agree`, `dispute`, `close`, `same`, fixed. `text`: detached text, at most 64 KiB, fixed. `outcome`: text, at most 64 bytes, for `close`. `about`: list of at most 16 refs to `thing`, fixed. `cites`: list of at most 16 facts of kind `claim`, `sign`, `say` or `point` under `commons`, fixed. `entries`: list of at most 16 records as on `thing`, for an entry of another definition. |

A thing has no final state, so a room keeps every thing it has pointed
at. The bound of 100 is a bound to measure (section 10). A claim is
live only while it is proposed, so agreed and withdrawn claims do not
count against the bound. A statement is an entry and has no bound of
its own.

### 3.2 Acts

| Act | Step | On | Grant | Guards | Effects |
|---|---|---|---|---|---|
| `point` | open | `thing` | `commons.point` | none | sets `pointer` to the signer and the fields given |
| `locate` | transition | `thing` | `commons.point` | the thing is `open` | adds the given locators to the lists; removes none |
| `say` | comment | none | `commons.say` | none | the entry holds `text` (detached, at most 64 KiB), `about` (list of at most 16 refs to `thing`) and `cites` (as on `claim`) |
| `withdraw-statement` | comment | none | `commons.say` | the cited `say` entry's signer is the signer | the entry cites the withdrawn statement |
| `claim` | open | `claim` | `commons.claim` | `parties` holds the signer; for `close` and `dispute`, `parties` is the signer alone | sets `proposer`, `parties`, `kind`, `text`, `about`, `cites`, `entries`; adds the signer to `signed`; sets `agreed` when `parties` has one member |
| `sign` | transition | `claim` | `commons.claim` | the claim is `proposed`; `parties` holds the signer; `signed` does not | adds the signer to `signed`; sets `agreed` when every member of `parties` is in `signed` |
| `withdraw-claim` | transition | `claim` | `commons.claim` | the claim is `proposed`; the signer is `proposer` | sets `withdrawn` |
| `adopt` | comment | none | `commons.adopt` | none | the entry holds `semantic` (digest) and `presentation` (digest); section 5 |

The three grants `commons.point`, `commons.say` and `commons.claim` are
granted to every member role at install. `commons.adopt` is granted to
every member role as well. A room's membership can narrow any of them
later, under its own rules.

A claim of kind `close` is one party's statement that its part of the
matter is closed. Its `outcome` is the party's own word for it:
`denied`, `withdrawn`, `partly-met`, `disputed`, `done`, or another.
A claim of kind `dispute` is one party's statement that it does not
accept what `cites` or `entries` names. A claim of kind `same` says that
the things in `about` are one thing. Each takes effect at once, because
its parties are the signer alone. None of them changes any other item.

The condition "every member of `parties` is in `signed`" is a condition
on an effect. The first slice chooses its form, as a conditional effect
over the two lists or as a rule expression, and proves it with witness
W2 (section 7). In either form, a claim with one party is
`agreed` in its opening entry. A claim with n parties is `agreed` in
the entry of its nth distinct signature.

### 3.3 What the commons does not do

- It verifies no locator. A digest in `digests` is a pointer, not a
  retained input. A document is retained by the capture scope, and a
  capture act points at a thing with an `about` field (section 8).
- It merges nothing. A `same` claim is evidence that a view can use. The
  two things stay two items.
- It decides nothing. No act of the commons changes an item of another
  definition, and no guard of the commons reads one.
- It hides nothing. Every member of the room reads the commons scope, as
  every member reads every scope of a room today. A private part of a
  matter is a room of its own, as group 3 of the catalogue describes.

## 4. How a package reads the commons

A package that serves a matter declares a connection to the commons as
an `outside` endpoint, in the form of the packages note (section 2).
The validator proves that the host's commons definition has the kinds
the package names. Then the package uses the commons in two ways.

**About.** Any act can carry a field
`about: { type: "list", of: { type: "fact", kind: ["point"], under: "commons" }, max: 16 }`.
The fact names the entry that opened a thing. So a reference from any
package to a thing is verified by hash, and a projection can gather every
entry of every package about one thing.

**Consent.** A party slot gains a `consent` rule:

| `consent` | Meaning | What the validator proves |
|---|---|---|
| `signer` | Only the act's signer enters this slot. | Every effect that writes the slot takes its source from `{ signer: true }`, or from `self` for the author. |
| `claim` | A member enters this slot only with their signature on a claim. | Every act that writes the slot presents a fact of kind `claim` or `sign` under `commons`, and its guards require that the agreeing entry's `signed` holds the member written, that `parties` holds the act's signer, and that the claim is `agreed`. |
| `declared` | The package writes the slot from a field or another slot, without the member's signature. | Nothing more. The install screen lists every `declared` slot with the acts that write it, so the admin sees which acts put members into roles without their consent. |

The default is `signer`. A slot with no `consent` and an effect that
writes it from a field is refused `consent-unstated`. The lending
library's `borrower`, written by staff at the desk, is `declared`. The
issue definition's `performer`, written by `accept` from the signer, is
`signer`. A renovation package's `contractor` on a change order is
`claim`.

A guard reads the presented agreeing entry with the `presented` operand
and its parts. Two encodings are possible. In the first, the act
presents the agreeing entry alone, and the guard reads `parties` and
`text` as that entry set them. In the second, the act presents the
claim's opening entry beside it, and the guard reads `parties` and
`text` from the opening entry. The slice that builds the first `claim`
slot chooses one and proves witness W3 with it. In both, the guard
compares the claim's `text` digest with the act's own `terms` field. So
an acceptance under the package names the exact words the parties
signed.

This is the rule the catalogue states. A package's structure is entered
only through a claim of agreement by the parties it binds, or through an
authority that one party already holds. The `grant` field of an act is
the second route. It is unchanged.

## 5. Local parts, adopted by each member

The self-contained applications note gives a package one presentation
id, adopted for the whole room by the admin's `present` act. That makes
the room's reading of the record one reading. The parties of a matter do
not share one reading, and the record should not pretend that they do.

A **presentation package** is a package whose manifest names one
semantic id and holds only a local part: projections, `ui://` resources
and act descriptions. The semantic package's publisher can ship one, and
anyone else can ship another for the same semantic id. The host checks
that every projection in it reads only the definitions of that semantic
id. The presentation boundary of the self-contained applications note
(section 5.1) already requires that.

A member adopts a presentation for themselves with the commons act
`adopt`. The act names the semantic id and the presentation id. It binds
nobody, and it changes no scope, grant or projection of anyone else. The
host serves that member's sessions, in the browser and over MCP, with
the adopted presentation. The room's `present` act stays as the default
for members who adopted nothing. A member can adopt again at any time,
and the record shows which reading each member used from which position.
When a dispute turns on what a screen showed, that is the fact to cite.

Act descriptions are part of the local part. The owner's presentation
can call an act "variation" where the contractor's calls it "change
order". The act, its guards and its effects are the same entry either
way.

A presentation is the thick side of the interface. A person reads the
record through views that the host renders as `ui://` resources
([application views](../docs/application-views.md)). An agent reads
the same projection through the generic tools. Neither world adapts to
the other's medium, because both read one declared projection. The
objects at the boundary between a person and their agent, and between
one party and another, are the same entries under different surfaces. A
member can compose their own presentation in chat, as the
[chat-composed views](2026-10-20-chat-composed-views.md) note describes,
and adopt it with the same `adopt` act.

## 6. Item ends and party closings

An item's final state ends the item. It never closes a party's part of
the matter. A party closes its own part with a commons claim of kind
`close`. A package does not declare a final state whose description says
that the matter, the claim or the episode is closed. The validator cannot
read meaning, so this is a rule for authors, checked at review, and the
install screen shows each final state with its description so that the
admin can read it.

Two consequences follow. A projection that shows a matter as closed
reads the parties' `close` claims, not an item state. And a party's
`close` claim does not end any item: the insurer's claim item can end as
`decided` while the owner's `close` says `disputed`, and both stand.

## 7. Scenarios every package runs

`dap check` (self-contained applications note, gap 11) runs each
package's scenarios. Three scenarios are added for every package that
connects to the commons. They are the test for overreach.

| Witness | Scenario | Passes when |
|---|---|---|
| W1 | **Structure after pointing.** A room holds three things, two statements and one agreed claim between A and B, and no package. The package is installed. A signs the package's first act, with the earlier claim presented. | The act takes effect. The entry's `about` names the earlier things by their opening entries. No earlier entry changes. |
| W2 | **Agreement in the last signature.** A claim names A, B and C. A signs at opening, B signs, C signs. | The claim is `proposed` after A and after B, and `agreed` in C's entry. A second signature by B is refused. A one-party `close` is `agreed` in its opening entry. |
| W3 | **Consent before binding.** The package's act writes B into a `claim` slot. A signs it with no claim presented, then with a claim that B has not signed, then with a claim whose text differs from the act's `terms`, then with the agreed claim. | The first three are refused with the reasons the guards name. The fourth takes effect. |
| W4 | **Two readings.** A adopts presentation P, B adopts presentation Q, both for the package's semantic id. Both read the entry of W3. | Each member's session returns the entry under its own projection and description. No shared act was needed, and the two `adopt` entries are in the record. |
| W5 | **Close without agreement.** The package's item reaches its final state. B signs a `close` claim with outcome `disputed`. | The item is final. B's claim is `agreed`. A projection of the matter shows both, and shows the matter as closed for B only. |

The renovation cases 29 and 30 are the exit test: a matter room that
starts from an owner's files and a private chat, where the contractor
joins later and installs its own package and its own presentation, and
where the owner's screen and the contractor's screen show the same
entries under different words.

## 8. Statements that change

The slices change these with their code. This head changes nothing.

| Where | Today | After |
|---|---|---|
| [self-contained applications](2026-10-15-self-contained-applications.md), section 4 | One presentation id for each package, adopted by the room. | A presentation package for a semantic id, adopted by each member (section 5). |
| The same note, section 3, principle 6 | One read projection serves screens, MCP and agents. | Unchanged for each presentation. A member's sessions use the member's adopted presentation. |
| The same note, gap 11 | `dap check` runs a package's scenarios. | And witnesses W1 to W5 for a package that connects to the commons. |
| [packages note](2026-10-18-application-packages-and-builder-room.md), section 2, `connections` | `to: outside` for a platform scope. | The commons is an `outside` endpoint whose kinds the validator checks. |
| The same note, section 3 | The validator's checks. | The `consent` checks of section 4. |
| [capture note](2026-10-21-capture-with-source.md), section 2 | No field names a thing. | Every capture act gains `about`, a list of at most 16 facts of kind `point` under `commons`. |
| `packages/contract/src/definition.ts`, `ItemType.parties` | `SlotRule & { list, max, author }` | And `consent?: "signer" \| "claim" \| "declared"`. |
| [write an application](../docs/write-an-application.md) | Declare the item types first. | Point at the commons first; declare `consent` on each party slot; final states end items. |
| [roadmap](../docs/roadmap.md) | No row for the common part of a room. | One row: pointing and claims, with the commons package and member presentations. |
| [use cases](../docs/use-cases.md), "What a reusable application needs to say" | One list. | Two lists, fixed for everyone and left to each party, on the catalogue head filed with this note. |

## 9. Slices

Each slice is a request to the builder, in this order. None is filed by
this note.

- **PC1. The commons package.** The definition of section 3, validated
  and pinned, installed at room creation by the host's default cohort,
  shown by the generic interface. Witness W2. Measures the bound of 100
  things on the demo rooms.
- **PC2. Consent on party slots.** The `consent` rule, the validator's
  checks, the install screen's list of `declared` slots, and the first
  `claim` slot in a package. Witnesses W1 and W3.
- **PC3. Member presentations.** The presentation package form, the
  `adopt` act, and the host's per-session presentation in the browser
  and over MCP. Witness W4. After the presentation boundary of the
  self-contained applications note (M2).
- **PC4. Closings and the matter projection.** The `close` claim in the
  room's views, and the three catalogue scenarios in `dap check`.
  Witness W5, and the renovation exit test with the matter package of
  the file-first direction.

## 10. Bounds to measure

- Things for each room: 100 live in PC1. A room that points at more
  refuses `point` with `too-many-things`. The demo rooms report their
  count after one month.
- Claims proposed at once: 100. Agreed and withdrawn claims are final
  and retained.
- Locators for each thing: 16 of each kind.
- Parties on a claim: 16.

## 11. Use cases and directions served

- Catalogue cases 29 and 30 (renovation, the exit test), 27 (home
  claim: the family's `close` beside the insurer's decision), 01
  (medical bill: a reading beside a captured bill), 32 (guitar sale: a
  claim between buyer and seller as the acceptance's consent), 42
  (community budget: `close` and `dispute` beside a shared decision),
  and the sweep's sale that later gains inspection and escrow
  (W1, structure after pointing).
- The dap-spike's direction note, section 3: one substrate carries both
  the unstructured relationship and the structured one, and a space
  gains structure part-way through. Section 5: three kinds of record,
  and standing that changes.
- The dap-spike's design note, section 1: the referent as the person's
  anchor, one name with many meanings. Invariant 11: contexts overlap
  around shared referents without any claiming the whole. Section 7,
  rule 6: presentation versions are independent of meaning.
- The file-first matter room direction: whoever starts, a room is the
  same thing; data first, rendering second.
- The self-contained applications note, decision 1: presentation is
  outside the semantic content id. This note takes that one step
  further, to one presentation for each member.
- The chat-composed views note: a view that a member composes in chat
  is a presentation package for that member, and the record shows that
  they adopted it.

## Source

Written from `docs/use-cases.md`, `docs/roadmap.md`,
`docs/write-an-application.md`, `packages/contract/src/definition.ts`
and `packages/contract/src/application-projection.ts` at main
`6f47bf98`; the self-contained applications, packages, capture,
retained files and definition succession notes; and the dap-spike's
design and direction notes at `9d738e2e`. The frame comes from Star and
Griesemer (1989), Star (2010), Bowker and Star (1999, chapter 9) and
Licklider and Taylor (1968). Nothing was run for this note.
