# Pointing and claims: a room's common part and each package's local part

Status: current. A proposal to the planner, filed on 27 October 2026
against main `6f47bf98` and rewritten the same day at main `61fc3e3d`.
Nothing here is built. It amends the
[self-contained applications](2026-10-15-self-contained-applications.md)
note (sections 4 and 6) and the
[application packages](2026-10-18-application-packages-and-builder-room.md)
note (sections 2 and 3). It changes no landed document in this head.

## 1. Scene

The parties to a matter work together long before they agree. An owner,
a contractor, an insurer and the agents that act for them share a wall,
a drawing, a bill and a photograph. To the owner the drawing is the
kitchen they want, to the contractor a scope to price, to the insurer
evidence of a date. Each party is a world of its own, with its own work
and meanings. The shared things are what Star and Griesemer call
boundary objects: one identity across the worlds, a different meaning in
each. To work on a thing together, the parties need to agree only on
which thing it is. Licklider called this externalizing a model: people
make a drawing or an outline so they can be sure they are talking about
the same thing.

Today a room gets its structure from an application's definitions. They
name the parties, say who decides and say when the matter ends, for
every member, from the moment they are installed. That is dap's strong
part: every member runs the same rules and gets the same verdict. It is
also where a room overreaches. Every catalogue card that names who
decides shows it. When the insurer's package calls the claim closed
because its item reached a final state, the family's part closes with
it, unasked. Structure that no party claimed is one world's model forced
on the others.

So a room needs a part that no application defines and that works
without consensus. Anyone can point at a thing, say something about it,
and propose a claim that named parties sign. Consensus, when it comes,
is the words the parties signed, and it binds those parties only. An
application's structure enters the record through such a claim, or
through an authority that one party already holds. Each party then
reads the record through a local part of its own, because readings
differ and the record should not pretend that they agree.

This note proposes four changes. None is built.

1. A commons definition, `platform:commons@1`, created with every room,
   that declares things, statements and claims (section 3).
2. A `consent` rule on every party slot, so that a package binds a
   member only through an agreed claim or a granted authority
   (section 4).
3. Presentation packages that each member adopts for themselves, in
   place of one presentation for the room (section 5).
4. The rule that a final state ends an item and never a party's part of
   the matter, with five witnesses that `dap check` runs for every
   package that reads the commons (sections 6 and 7).

Section 8 lists what changes. Section 9 cuts the work into four slices.

## 2. Terms

- **World**: one party's own work and meanings, in Star and Griesemer's
  sense. The owner, the contractor, the insurer and each one's agent are
  worlds.
- **Thing**: an item that stands for something outside the record, with
  a label and locators and no final state. Its identity is common to
  every world and its meaning is local to each: a boundary object.
- **Locator**: a way to find a thing: a digest, an address, a member, or
  another scope's entry. Display data, verified by nothing.
- **Pointing**: an act that opens a thing or adds a locator. It needs
  nobody's agreement.
- **Statement**: text that one member signs about things, one world's
  reading externalized. A comment entry that opens no item.
- **Claim**: an item with named parties and one fixed text, of kind
  `agree`, `dispute`, `close` or `same`. A standardized form: its words
  and signatures travel between worlds unchanged. Its **target** is the
  package scope whose act it consents to.
- **Consensus**: every named party has signed. The record holds it only
  as an `agreed` claim and never infers it.
- **Agreeing entry**: the entry of the last signature, where the claim
  becomes `agreed`. A package presents it as evidence of consent. It is
  **consumed** once an act of the target scope has bound a member
  through it.
- **Commons**: the definition of things, statements and claims that
  every room has. It is the room's common part: weakly structured, and
  usable by every world without consensus.
- **Common part** of a package: its definitions, guards, effects,
  connections and rights, run by every member. A standard the parties
  adopt, not a boundary object.
- **Local part** of a package: its projections, screens and act
  descriptions, the strong structure of one world. Each member adopts
  one.
- **Consent**: the signature of the member an act binds. A party slot
  says how a member enters it: by signing, by a claim, or by
  declaration.

## 3. Commons definition

The commons is a native platform definition, `platform:commons@1`,
pinned in every creation cohort beside the directory, membership, rules
and destination definitions. Its scope is created with each room, like
the capture scope of the [capture note](2026-10-21-capture-with-source.md).
It is not an installed package: no release is fetched for it and no
trust row admits it, so R11's admission rule (`application-revoked`)
cannot withdraw it from a room. It has no server code and no screens.
The host's generic interface shows it.

### 3.1 Items

Lists hold at most 16. Fixed fields are set at opening and never change.

| Item | Live | States | Parties | Values and refs |
|---|---|---|---|---|
| `thing` | 100 | `open`; `retired` final | `pointer`: the opening signer, fixed | `label`: text, at most 256 bytes. `digests`. `addresses`: texts of at most 1,024 bytes. `members`. `entries`: records `{ scope: text, seq: int, hash: digest }`. None fixed. |
| `claim` | 100 `proposed` | `proposed`; `agreed` final; `withdrawn` final | `proposer`: the opening signer, fixed. `parties`: members, fixed, required. `signed`: members. | `kind`: `agree`, `dispute`, `close` or `same`, fixed. `target`: scope reference, fixed, optional. `text`: detached, at most 64 KiB, fixed. `outcome`: text, at most 64 bytes, for `close`. `about`: refs to `thing`, fixed. `cites`: facts of kind `claim`, `sign`, `say` or `point` under `commons`, fixed. `entries`: as on `thing`. |

A thing stays `open` until an admin retires it, so a room keeps
everything it has pointed at. Agreed and withdrawn claims are retained
and do not count. Each bound of 100 is shared. A member holds at most
25 live things and 25 proposed claims of their own, and their next act
is refused `member-share`. So no one member can stop pointing or
claiming for the room. The room's next `point` past 100 is refused
`too-many-things`. A statement is an entry and has no bound.

### 3.2 Acts

| Act | Step | On | Grant | Guards | Effects |
|---|---|---|---|---|---|
| `point` | open | `thing` | `commons.point` | the signer's share is not full | sets `pointer` and the fields given |
| `locate` | transition | `thing` | `commons.point` | `open` | adds locators; removes none |
| `retire` | transition | `thing` | `commons.retire` | `open` | sets `retired`; the thing stays citable by its opening entry |
| `say` | comment | none | `commons.say` | none | the entry holds `text` (detached, at most 64 KiB), `about` and `cites` as on `claim` |
| `withdraw-statement` | comment | none | `commons.say` | the cited `say` entry is the signer's | the entry cites the withdrawn statement |
| `claim` | open | `claim` | `commons.claim` | `parties` holds the signer and no member twice, else `duplicate-party`; for `close`, `dispute` and `same` it is the signer alone; the signer's share is not full | sets the fixed fields; adds the signer to `signed`; sets `agreed` when `parties` has one member |
| `sign` | transition | `claim` | `commons.claim` | `proposed`; the signer is in `parties` and not in `signed` | adds the signer to `signed`; sets `agreed` when the count of `signed` plus one equals the count of `parties` |
| `withdraw-claim` | transition | `claim` | `commons.claim` | `proposed`; the signer is `proposer`, in `parties`, or an admin | sets `withdrawn` |
| `adopt` | comment | none | `commons.adopt` | none | the entry holds `semantic` and `presentation` digests (section 5) |

Every member role is granted `commons.point`, `commons.say`,
`commons.claim` and `commons.adopt` when the room is created.
`commons.retire` goes to admin roles only. A room's membership can
narrow any of them later.

A `close` claim is one world's statement that its part of the matter is
closed. Its `outcome` is that world's own word: `denied`, `withdrawn`,
`partly-met`, `disputed`, `done`, or another. A `dispute` rejects what
`cites` or `entries` names. A `same` says that the things in `about`
are one thing. Each has the signer as its only party, so it takes effect
at once, and none changes any other item.

"Every party has signed" is a count. `claim` refuses a duplicate party,
and `sign` admits only a party not yet in `signed`. So `signed` is
always a subset of `parties` without duplicates, and the counts are
equal exactly when every party has signed. A claim with one party is
`agreed` in its opening entry, and a claim with n parties in the entry
of its nth signature. Witness W2 proves it.

### 3.3 What the commons does not do

- It verifies no locator. A digest in `digests` is a pointer, not a
  retained input. The capture scope retains documents, and a capture act
  points at a thing through `about` (section 8).
- It merges nothing. A `same` claim is evidence that a view can use. The
  two things stay two items.
- It decides nothing. No act of the commons changes an item of another
  definition, and no guard of the commons reads one.
- It hides nothing. Every member reads the commons scope. A private part
  of a matter is a room of its own, as group 3 of the catalogue
  describes.

## 4. How a package reads the commons

A package declares a connection to the commons as an `outside` endpoint,
in the form of the packages note (section 2). The validator proves that
the pinned commons version has the kinds the package names. The package
then uses the commons in two ways.

**About.** Any act can carry
`about: { type: "list", of: { type: "fact", kind: ["point"], under: "commons" }, max: 16 }`.
The fact names the entry that opened a thing. So a reference to a thing
is verified by hash, and a projection can gather every package's entries
about one thing.

**Consent.** A party slot gains a `consent` rule:

| `consent` | Meaning | What the validator proves |
|---|---|---|
| `signer` | Only the act's signer enters the slot. | Every effect that writes the slot takes `{ signer: true }`, or `self` for the author. |
| `claim` | A member enters the slot only by signing a claim. | Every act that writes the slot presents a `claim` or `sign` fact under `commons`, with the guards below. |
| `declared` | The package writes the slot without the member's signature. | Nothing more. The install screen lists every `declared` slot and the acts that write it, so the admin sees which acts put members into roles unasked. |

The default is `signer`. A slot with no `consent` and an effect that
writes it from a field is refused `consent-unstated`. The lending
library's `borrower`, written by staff at the desk, is `declared`. A
renovation package's `contractor` on a change order is `claim`.

A guard reads a presented claim as two entries: the opening entry, which
fixed `parties`, `text` and `target`, and the agreeing entry. It checks
that both name one claim and that `target` is the act's own scope. It
checks that `parties` holds the member written, that `signed` holds
every party, and that the `text` digest equals the act's own `terms`
field. So an acceptance names the exact words the parties signed, and a
claim signed for one room's package cannot be carried into another.

A presented claim is consumed. The host keeps, for each scope, the
agreeing entries its acts have bound a member through, as the
certified-rules hardening keeps used certificates. It refuses a second
presentation with `consent-consumed`. "The contractor agrees to this
change at this price" binds the contractor to that change order and to
no later one with the same words.

This is the catalogue's rule. A package's structure is entered only
through a claim of agreement by the parties it binds, or through an
authority that one party already holds. An act's `grant` field is the
second route, unchanged.

## 5. Local parts, adopted by each member

The self-contained applications note gives a package one presentation
id, adopted for the whole room by the admin's `present` act. The worlds
of a matter do not share one reading, and the record should not pretend
that they do.

A **presentation package** names one semantic id and holds only a local
part: projections, `ui://` resources and act descriptions. Anyone can
ship one for a semantic id. The host checks that every projection in it
reads only that semantic id's definitions, as the presentation boundary
(self-contained applications note, section 5.1) already requires.

A member adopts a presentation with the commons act `adopt`, naming the
semantic id and the presentation id. It binds nobody and changes nothing
for anyone else. The host serves that member's sessions, in the browser
and over MCP, with the adopted presentation. The room's `present` choice
stays as the default for the rest. The record shows which reading each
member used from which position. When a dispute turns on what a screen
showed, that is the fact to cite.

An adopted presentation is served only while its release is in the
Worker's `APPLICATION_TRUST`, the list that admits installed packages.
The host checks the list when each session starts, as R11 checks
admission on each use. Otherwise the session uses the room's default and
the host names the reason, `presentation-untrusted`. An act description
can mislabel an act, so a presentation enters a session only on the
operator's trust.

Act descriptions are part of the local part. The owner's presentation
can call an act "variation" where the contractor's calls it "change
order". The act, its guards and its effects are the same entry either
way. The room is a coincident boundary: one outline, filled by each
world in its own way.

A presentation is the thick side of the interface, and Licklider's
plastic medium. A person reads the record through views rendered as
`ui://` resources ([application views](../docs/application-views.md)).
An agent reads the same projection through the generic tools. The
objects at the boundary between a person and their agent, and between
one party and another, are the same entries under different surfaces. A
member can compose a presentation in chat
([chat-composed views](2026-10-20-chat-composed-views.md)) and adopt it
with the same act.

## 6. Item ends and party closings

An item's final state ends the item. It never closes a world's part of
the matter. A party closes its own part with a `close` claim. A package
does not declare a final state whose description says that the matter,
the claim or the episode is closed. The validator cannot read meaning,
so this is a rule for authors, checked at review, and the install screen
shows each final state with its description.

So a projection that shows a matter as closed reads the parties' `close`
claims, not an item state. And a `close` claim ends no item: the
insurer's claim item can end as `decided` while the owner's `close` says
`disputed`, and both stand.

## 7. Scenarios every package runs

`dap check` (self-contained applications note, gap 11) runs each
package's scenarios. A package that connects to the commons also runs
these five. They are the test for overreach.

| Witness | Scenario | Passes when |
|---|---|---|
| W1 | **Structure after pointing.** A room holds three things, two statements and an agreed claim between A and B, and no package. The package is installed. A signs its first act with the claim presented. | The act takes effect. Its `about` names the earlier things by their opening entries. No earlier entry changes. |
| W2 | **Agreement in the last signature.** A claim names A, B and C. A signs at opening, then B, then C. | `proposed` after A and after B, `agreed` in C's entry. A second signature by B is refused. A one-party `close` is `agreed` at opening. |
| W3 | **Consent before binding.** The package's act writes B into a `claim` slot. A signs it five times: with no claim, with a claim B has not signed, with a claim whose text differs from the act's `terms`, with the agreed claim, and with the same claim on a second act. | The first three are refused with the reasons the guards name. The fourth takes effect. The fifth is refused `consent-consumed`. |
| W4 | **Two readings.** A adopts presentation P and B adopts Q, both for the package's semantic id. C adopts R, whose release is not trusted. All three read the entry of W3. | A and B get the entry under their own projection and descriptions. C's `adopt` is recorded, and C's session uses the room default with reason `presentation-untrusted`. No shared act was needed. |
| W5 | **Close without agreement.** The package's item reaches its final state. B signs a `close` claim with outcome `disputed`. | The item is final. B's claim is `agreed`. A projection shows both, and shows the matter closed for B only. |

The renovation cases 29 and 30 are the exit test. A matter room starts
from an owner's files and a private chat. The contractor joins later
with its own package and presentation, and the two screens show the
same entries under different words. The note also serves cases 01, 27,
32 and 42, the file-first matter room direction, and the dap-spike's
design note (the referent as anchor, invariant 11, rule 6) and
direction note (sections 3 and 5).

## 8. Statements that change

The slices change these with their code. This head changes nothing.

| Where | Today | After |
|---|---|---|
| [self-contained applications](2026-10-15-self-contained-applications.md), section 4 | One presentation id for each package, adopted by the room. | A presentation package for a semantic id, adopted by each member. |
| The same note, section 3, principle 6, and gap 11 | One read projection serves screens, MCP and agents. `dap check` runs a package's scenarios. | A member's sessions use the member's adopted presentation. `dap check` also runs W1 to W5. |
| [packages note](2026-10-18-application-packages-and-builder-room.md), sections 2 and 3 | `to: outside` for a platform scope. The validator's checks. | The commons is an `outside` endpoint whose kinds the validator checks. The `consent` checks of section 4. |
| [capture note](2026-10-21-capture-with-source.md), section 2 | No field names a thing. | Every capture act gains `about`: facts of kind `point` under `commons`. |
| `packages/contract/src/definition.ts`, `ItemType.parties` | `SlotRule & { list, max, author }` | And `consent?: "signer" \| "claim" \| "declared"`. |
| [write an application](../docs/write-an-application.md) and [roadmap](../docs/roadmap.md) | Declare the item types first. No roadmap row. | Point at the commons first, declare `consent` on each party slot, final states end items. One roadmap row. |
| [kernel page](../docs/kernel.md), K1, and each Worker's `PLATFORM_CREATION_PINS` | 73 pinned versions. Register, directory, membership, rules and destination. | 74, with `platform:commons@1` in every creation cohort. |
| The host's session start | Serves the room's `present` choice. | Serves the member's adopted presentation when its release is trusted. |
| [use cases](../docs/use-cases.md), "What a reusable application needs to say" | Two lists, at main `260a9782`. | A link to this note. |

## 9. Slices

Each slice is a request to the builder, in this order. None is filed by
this note.

- **PC1. The commons definition.** Section 3, pinned in the three
  Workers' creation cohorts, created with the room, shown by the generic
  interface. Witness W2, and the exhaustion case: one member opens 25
  things and proposes 25 claims, the next of each is refused
  `member-share`, another member still points and claims, and an admin
  retires a thing. Measures the bound of 100 on the demo rooms.
- **PC2. Consent on party slots.** The `consent` rule, the validator's
  checks, the install screen's list of `declared` slots, and the first
  `claim` slot in a package. Witnesses W1 and W3.
- **PC3. Member presentations.** The presentation package form, the
  `adopt` act, the trust check at session start, and the per-session
  presentation in the browser and over MCP. Witness W4. After the
  presentation boundary (M2).
- **PC4. Closings and the matter projection.** The `close` claim in the
  room's views and the five witnesses in `dap check`. Witness W5, and
  the renovation exit test with the matter package of the file-first
  direction.

## Source

Written from `docs/use-cases.md`, `docs/roadmap.md`,
`docs/write-an-application.md` and `packages/contract/src/definition.ts`
at main `6f47bf98`, from the self-contained applications, packages,
capture, retained files and definition succession notes, and from the
dap-spike's design and direction notes at `9d738e2e`. World, boundary
object, standardized form, coincident boundary and cooperation without
consensus are Star and Griesemer's terms (1989), read with Star (2010)
and Bowker and Star (1999, chapter 9). Externalized models, "the same
thing" and the plastic medium are Licklider and Taylor's (1968).
Nothing was run. Recut on 27 October after the checker's review
8164acf4 at main `260a9782`, and rewritten for length and a clearer
scene the same day.
