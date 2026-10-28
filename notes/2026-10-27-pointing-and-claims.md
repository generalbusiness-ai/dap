# References, notes and ratifications: how structure enters a room

Status: current. A proposal to the planner, filed on 27 October 2026 and
recut on 28 October against main `a78e0981`. Nothing here is built. It
amends the
[self-contained applications](2026-10-15-self-contained-applications.md)
note (sections 4 and 6), the
[application packages](2026-10-18-application-packages-and-builder-room.md)
note (sections 2 and 3) and the
[capture note](2026-10-21-capture-with-source.md) (section 2). It changes
no landed document in this head.

## 1. Scene

The parties to a matter work together long before they agree. An owner,
a contractor, an insurer and the agents that act for them share a wall,
a drawing, a bill and a photograph. To the owner the drawing is the
kitchen they want, to the contractor a scope to price, to the insurer
evidence of a date. Star and Griesemer called such things boundary
objects: one identity across several working worlds and a different
meaning in each. The parties need to agree only on which thing is meant.
Licklider said the same of any two people at a whiteboard: they
externalize their models so they can be sure they are talking about the
same thing.

Today a room gets its structure from an application's definitions. They
name the parties, say who decides and say when a matter ends, for every
member, from the moment they are installed. That is dap's strong part:
every member runs the same rules and gets the same verdict. It is also
where a room overreaches. The catalogue's rule is that an application's
structure is entered only through a claim of agreement by the parties it
binds, or through an authority that one party already holds. No landed
mechanism enforces it, and no room has a place for the work that comes
before any application: a file dropped in, a remark about it, two
parties settling on words.

This note gives every room that place, and it is small. Four acts that
need no application: reference a thing, write a note, ratify someone
else's note, close your own part. A package then binds a member only by
presenting that member's own ratification of the terms. Each member
keeps a page that says how they read the room. And an item's final state
ends the item, never a party's part of the matter. Section 2 shows where
these four come from. Section 3 defines them. Section 4 shows how they
compose into structure, with the renovation case walked as entries.
Sections 5 and 6 cover pages and closings. Sections 7 to 9 give the
witnesses, the changes and the slices.

## 2. What practice shows

Two records of cooperation between people and agents already exist in
this project, and both descend from the language-action perspective of
Winograd and Flores: a request, a promise, a report, and a requester who
declares satisfaction. The workroom's statement kinds are the
Coordinator's. The keep memory tool's act tags are Flores's later five.
Their use over the last month is the evidence for what a cooperation
vocabulary needs. The counts are a script count over the resident's
projection of the artroom workroom on 28 October 2026, and over the
keep store the same morning. The ephemeral `say` channel leaves no trace
in the projection and is not counted.

| Workroom statements, 1 to 28 October, three agent actors | Count |
|---|---|
| `artifact`, a path at a commit | 34,549 |
| `assert`, free text | 7,877 |
| `request` | 2,650 |
| `promise` | 2,300 |
| `report` | 1,696 |
| `propose` | 15 |
| `dissent` | 0 |

| Other measures | Count |
|---|---|
| Reviews approved, and with changes requested | 473 and 385 |
| Commitments satisfied, and ended cancelled, withdrawn or stale | 1,645 and 754 |
| Requests an actor addressed to itself | 608 of 2,625 |
| Requests whose text reports what the person said | 263 of 2,650 |
| Bases a request rests on, mean | 9.8 |
| Bases a report rests on, mean | 14.5 |
| Bases an assert rests on, mean | 1.8 |
| keep notes in the store | 7,018 |
| keep notes carrying any speech-act tag | 13 |
| keep notes tagged `learning` | 351 |
| keep `now` pages, with open or fulfilled status | 171 |

Six things follow.

- **Reference dominates.** Seven statements in ten point at a file at an
  exact commit. Requests and reports rest mostly on those pointers. Every
  structured act in the record stands on references to concrete things.
- **Free text carries the rest.** Asserts are the second most common act
  and the longest after reports. They hold declines, findings, status
  and disagreement, and only 21 of 7,877 are declines by their own
  words. Nobody sub-typed them.
- **The typed loop that a rule reads is used.** Request, promise, report
  and declared satisfaction ran thousands of times, because the fold
  turns them into a row, a staleness flare and a landing.
- **The typed acts that no rule reads are not used.** `propose` 15 times,
  `dissent` never, and keep's five speech-act tags 13 times in 7,018
  notes, by agents instructed to use them. Disagreement went into review
  verdicts, where nearly half asked for changes, and into prose.
- **Each party ends its own part.** A requester supersedes its request. A
  performer reneges its promise. A quarter of commitments ended that way,
  and nobody closed anyone else's.
- **The person is not in the record.** The person directing the work is
  not an actor. Their words enter as reported speech inside agents'
  requests, in one request in ten. What they actually use is a page of
  current intentions, rewritten often and read before acting, with
  learnings surfaced beside it by similarity.

Suchman's 1994 objection to the language-action perspective was that
asking people to classify their utterances by speech act imposes a
discipline the work does not want. This record says she was right about
the categories nobody reads and wrong about the loop the fold reads.
People and agents classify where classification pays. So the test for an
act in the common part of a room is not whether its kind is meaningful.
It is whether a rule or a projection reads it. Four pass that test.

## 3. Four acts

- **Party**: a member of the room, acting for one working world.
- **Reference**: a signed pointer to a thing, by a label and locators. It
  is the identity the parties share. It carries no meaning.
- **Note**: signed free text that cites references and other notes. It
  is one party's reading. The record never reconciles two notes.
- **Ratification**: one party's signature on another party's note. It is
  the only act that makes a note bind the signer.
- **Closing**: one party's statement that its own part of a matter is
  closed, with an outcome in its own word.
- **Page**: the note a member keeps current about how they read the
  room. It replaces its previous version.
- **Commons**: the native definition that gives every room these acts.

The commons is `platform:commons@1`, pinned in every creation cohort
beside the directory, membership, rules and destination definitions. Its
scope is created with each room. It is not an installed package: no
release is fetched for it and no trust row admits it, so R11's admission
rule (`application-revoked`) cannot withdraw it. It opens no items, so
it has no live bound of its own. It has no server code and no screens.
The host's generic interface shows it.

Lists hold at most 16. Every act is a comment and so has no guards and
no effects: the entry is the fact.

| Act | Fields |
|---|---|
| `reference` | `label`: text, at most 256 bytes. `digests`: list of digests. `addresses`: list of texts of at most 1,024 bytes. `members`: list of members. `entries`: list of records `{ scope: text, seq: int, hash: digest }`. `of`: an earlier `reference` fact, optional, for adding locators to it or saying that two references are one thing. |
| `note` | `text`: detached, at most 64 KiB. `about`: list of facts of kind `reference`, `note`, `ratify` or `close` under `commons`. `entries`: as on `reference`, for an entry of any other definition. `replaces`: a `note` fact, optional. A note with `replaces` is a page. `presentation`: digest, optional, on a page. |
| `ratify` | `of`: a `note` fact. `text`: optional, at most 1,024 bytes. |
| `close` | `about`: as on `note`. `entries`: as on `reference`. `outcome`: text, at most 64 bytes. `text`: detached, optional. |

One grant, `commons.write`, covers all four acts and is granted to every
member role when the room is created. A room's membership can narrow it
later. A statement about another party's act is a note that cites it.
A disagreement is a note. "These two references are one thing" is a
reference whose `of` names the other. A withdrawal is a note that cites
what it withdraws. None of these needs a kind, because a projection
reads the citation and a person reads the words.

What the commons does not do:

- It verifies no locator. A digest in a reference is a pointer, not a
  retained input. The capture scope retains documents, and a capture act
  names a reference through `about` (section 8).
- It merges and decides nothing. No act of the commons changes an item
  of another definition, and no guard of the commons reads one.
- It hides nothing. Every member reads the commons scope. A private part
  of a matter is a room of its own, as group 3 of the catalogue
  describes.

## 4. How the acts compose into structure

The renovation of cases 29 and 30, as entries. A, the owner, works with
an agent. B is the contractor. C is the insurer.

| Entry | Signer | Rests on | What it adds |
|---|---|---|---|
| 1 | A's agent | nothing | `reference`: "kitchen drawing", with the file's digest and the chat upload's address. The thing now has an identity and no meaning. |
| 2 | A | 1 | `note`: "this is the kitchen we want". |
| 3 | B | 1 | `note`: "scope: remove the 4.2 m wall, reroute two circuits". |
| 4 | C's agent | 1 | `note`: "drawing dated 3 March, before the loss". Three readings stand. The record will never reconcile them. |
| 5 | B | 1, 3 | `note`: the terms. "Change the wall per drawing, 4,000, two weeks." |
| 6 | A | 5 | `ratify` of 5. A now holds B's words and A's signature on them. B signed 5 itself. |
| 7 | B | 5, 6 | The renovation package's `change-order` act, installed under B's own role, presenting 5 as its terms and 6 as A's consent. Structure now exists, for exactly the two who signed, and its item cites the drawing through `about`. |
| 8 | C | 1, 4 | C's claims package decides its own item `decided` under rules only C adopted. |
| 9 | A | 8 | `close` with outcome `disputed`, about C's item. |
| 10 | B | 7 | `close` with outcome `done`, about the change order. |

A projection of the drawing shows one reference, three readings, one
ratified note, two package items and two closings. Nothing was forced.
Entry 4 did not make the drawing C's evidence for A. Entry 7 bound B and
A and nobody else. Entry 8 did not close A's part, and entry 9 did not
end C's item.

Gradual structuring is then one sentence. An entry's structure is what
it rests on. A reference rests on nothing. A note rests on references
and notes, and binds its signer to nothing. A ratification rests on a
note and binds its signer to those words. A package act rests on a
definition, on the terms and on the ratifications of the parties it
writes, and binds them under rules. Later entries cite earlier ones, and
no later entry changes what an earlier one rests on. These are the three
degrees of agreement in the catalogue, the same thing, the same rules
and the same conclusion, read off the record.

**How a package binds a party.** A package that serves a matter declares
a connection to the commons as an `outside` endpoint, in the form of the
packages note (section 2). Any of its acts can carry `about`, a list of
facts of kind `reference` under `commons`, so that its items cite the
things they are about by hash. A party slot gains a `consent` rule:

| `consent` | Meaning | What the validator proves |
|---|---|---|
| `signer` | Only the act's signer enters the slot. | Every effect that writes the slot takes `{ signer: true }`, or `self` for the author. The default. |
| `ratified` | A member enters the slot only on their own ratification of the terms. | Every act that writes the slot presents a `note` fact as `terms` and a `ratify` fact as `consent`, with guards that the consent's `of` is the terms entry, that the consent's signer is the member written, and that the terms entry's `text` digest equals the act's own `terms` field. |
| `declared` | The package writes the slot without the member's signature. | Nothing more. The install screen lists every `declared` slot with the acts that write it, so the admin sees which acts put members into roles unasked. |

A slot with no `consent` and an effect that writes it from a field is
refused `consent-unstated`. The lending library's `borrower`, written by
staff at the desk, is `declared`. A renovation package's `contractor` on
a change order is `ratified`. An act binds one slot at a time, so at
most four presented facts suffice.

A presented ratification is consumed. The host keeps, for each scope,
the ratification entries its acts have bound a member through, as the
certified-rules hardening keeps used certificates, and refuses a second
presentation with `consent-consumed`. "A agrees to this change at this
price" binds A to that change order and to no later one with the same
words. Reading a presented entry's signer needs one new part in the
contract, `signer`, beside `kind`, `intent` and `time` (section 8).

This is the catalogue's rule made mechanical. An act's `grant` field is
the second route, an authority one party already holds, and it is
unchanged.

## 5. Each member's page

A page is a note that replaces the member's previous page. The host
shows each member's latest page in the room's generic interface and in
the model context of their sessions, and it is what the record shows
first when anyone asks what that member is doing. It is the person's own
words in the record, signed by them, where today they are an agent's
report. It is temporary, revised often, and its design matters, as the
catalogue's one-page summary for a healthcare encounter says.

A page can name a `presentation`, the digest of a presentation package
for a semantic id, in the form of the self-contained applications note
(section 5.1). The host serves that member's sessions, in the browser
and over MCP, with the named presentation while its release is in the
Worker's `APPLICATION_TRUST`, checked when each session starts as R11
checks admission on each use. Otherwise the session uses the room's
`present` choice and the host names the reason, `presentation-untrusted`.
A presentation package holds only projections, `ui://` resources and act
descriptions, and the owner's can call an act "variation" where the
contractor's calls it "change order". The act, its guards and its
effects are the same entry either way. A member can compose a
presentation in chat ([chat-composed views](2026-10-20-chat-composed-views.md))
and name it on their page.

## 6. Item ends and party closings

An item's final state ends the item. It never closes a party's part of
the matter. A party closes its own part with `close`. A package does not
declare a final state whose description says that the matter, the claim
or the episode is closed. The validator cannot read meaning, so this is
a rule for authors, checked at review, and the install screen shows each
final state with its description.

So a projection that shows a matter as closed reads the parties'
closings, not an item state. And a closing ends no item: the insurer's
item can end as `decided` while the owner's closing says `disputed`, and
both stand.

## 7. Witnesses

`dap check` (self-contained applications note, gap 11) runs each
package's scenarios. A package that connects to the commons also runs
these five.

| Witness | Scenario | Passes when |
|---|---|---|
| W1 | **Structure after references.** A room holds entries 1 to 6 of section 4 and no package. The package is installed, and B signs the change-order act presenting 5 and 6. | The act takes effect. Its `about` names the drawing by entry 1. No earlier entry changes. |
| W2 | **Consent before binding.** B signs the act five times: with no ratification, with B's own ratification of 5, with A's ratification of another note, with entry 6, and again with entry 6 on a second act. | The first three are refused with the reasons the guards name. The fourth takes effect. The fifth is refused `consent-consumed`. |
| W3 | **Two readings.** A's page names presentation P and B's names Q, both for the package's semantic id. C's page names R, whose release is not trusted. All three read entry 7. | A and B get the entry under their own projection and descriptions. C's page is recorded, and C's session uses the room default with reason `presentation-untrusted`. |
| W4 | **Close without agreement.** Entries 8 to 10. | C's item is final. A's and B's closings are recorded. A projection shows the matter closed for A and B in their own words, and C's item ended, and none of the three changed another. |
| W5 | **The person's own words.** A, a person, writes a page and a note. A's agent writes a note that cites both. | The projection shows A's words signed by A, and the agent's note as the agent's. Nothing reports A's words as the agent's. |

## 8. Statements that change

The slices change these with their code. This head changes nothing.

| Where | Today | After |
|---|---|---|
| [self-contained applications](2026-10-15-self-contained-applications.md), section 4 | One presentation id for each package, adopted by the room. | A presentation named on each member's page (section 5). |
| The same note, gap 11 | `dap check` runs a package's scenarios. | And W1 to W5 for a package that connects to the commons. |
| [packages note](2026-10-18-application-packages-and-builder-room.md), sections 2 and 3 | `to: outside` for a platform scope. The validator's checks. | The commons is an `outside` endpoint whose kinds the validator checks. The `consent` checks of section 4. |
| [capture note](2026-10-21-capture-with-source.md), section 2 | No field names a reference. | Every capture act gains `about`: facts of kind `reference` under `commons`. |
| `packages/contract/src/definition.ts` | `ItemType.parties` is `SlotRule & { list, max, author }`. `EntryPart` has no signer. | `consent?: "signer" \| "ratified" \| "declared"`. `EntryPart` gains `"signer"`. `PlatformDefinition` gains `commons`. |
| [write an application](../docs/write-an-application.md) and [roadmap](../docs/roadmap.md) | Declare the item types first. No roadmap row. | Cite references first, declare `consent` on each party slot, final states end items. One roadmap row. |
| [kernel page](../docs/kernel.md), K1, and each Worker's `PLATFORM_CREATION_PINS` | 73 pinned versions. Register, directory, membership, rules and destination. | 74, with `platform:commons@1` in every creation cohort. |
| The host's session start and generic interface | Serves the room's `present` choice. | Serves the presentation on the member's page when trusted. Shows references, notes and pages. |
| [use cases](../docs/use-cases.md), "Pointing at things, and claims of agreement" and "Three kinds of statement" | "Pointing" and "a claim of agreement" as a signed act by several. | "Referencing", and agreement as a note with each party's ratification. A link to this note. |

## 9. Slices

Each slice is a request to the builder, in this order. None is filed by
this note.

- **PC1. The commons definition.** Section 3, pinned in the three
  Workers' creation cohorts, created with the room, shown by the generic
  interface. Witnesses W1 without the package act, and W5.
- **PC2. Consent on party slots.** The `consent` rule, the `signer`
  part, the validator's checks, consumption, the install screen's list
  of `declared` slots, and the first `ratified` slot in a package.
  Witnesses W1 and W2.
- **PC3. Pages and presentations.** Pages in the model context and the
  generic interface, the trust check at session start, and the
  per-session presentation in the browser and over MCP. Witness W3.
  After the presentation boundary (M2).
- **PC4. Closings and the matter projection.** Closings in the room's
  views, the matter projection of section 4, and the five witnesses in
  `dap check`. Witness W4, and the renovation exit test with the matter
  package of the file-first direction.

## Source

Written from `docs/use-cases.md`, `docs/roadmap.md`,
`docs/write-an-application.md`, `packages/contract/src/definition.ts`
and `packages/contract/src/scope.ts` at main `a78e0981`, from the
self-contained applications, packages, capture, retained files and
definition succession notes, and from the dap-spike's design and
direction notes at `9d738e2e`. The counts in section 2 are a script
count over `gs status -json` of the artroom workroom (frontier depth
81838) and over `keep list` on 28 October 2026. Boundary object and the
working worlds that share one are Star and Griesemer's, "Institutional
Ecology, 'Translations' and Boundary Objects" (1989), read with Star,
"This is Not a Boundary Object" (2010). Externalized models and "the
same thing" are Licklider and Taylor's, "The Computer as a
Communication Device" (1968). The language-action perspective is
Winograd and Flores, Understanding Computers and Cognition (1986), and
Flores, Graves, Hartfield and Winograd, "Computer Systems and the Design
of Organizational Interaction" (1988). The objection is Suchman, "Do
Categories Have Politics?" (1994), with Winograd's reply, "Categories,
Disciplines, and Social Coordination" (1994). Nothing else was run.
