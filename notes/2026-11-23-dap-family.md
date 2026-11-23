# dap-family: family history on dap

Status: draft 1, for request `d7bdfa89`, 2026-11-23. A proposal for
Hugh's ruling. Nothing here is built, and the note asks dap for no
change. Section 13 lists what the application needs that dap lacks.

A family keeps its history together. Members record their relatives,
the events of each life, the places where those events happened and the
sources that prove them. A living person can say "this is me" about a
record and take charge of it. Anyone can read the public part without
an account.

The design has one idea. **Every person is a small record of their
own.** A person, a couple, a place and a source each live in their own
scope, with their own rules and their own history of who said what. A
circle is a room that people join by invitation. A page that shows many
records at once, a tree or a map, reads a projection that anyone can
rebuild from those records and that holds no authority.

How each fact here was established:

- **Read** at main `b0a6439a`: [What is dap](../docs/what-is-dap.md),
  [Scopes](../docs/scopes.md) (identity and genesis, composition,
  reads, who may read), [the roadmap](../docs/roadmap.md),
  `packages/contract/src/bounds.ts`, `packages/contract/src/definition.ts`,
  `packages/contract/src/scope.ts`, `packages/platform/src/membership.ts`
  and `packages/derive/src/validate/effects.ts`.
- **Read** in `~/play/dap-foldkit`: `PLAN.md` sections 1 to 7 and 13,
  `definition/map.ts`, the exports of `app/mapView.ts` and
  `app/locationSearch.ts`.
- **Not verified**: no definition in sections 6 and 7 has been through
  `validateDefinition`. The scale figures of section 12 are estimates.

The first draft and its UI sketches are in `~/play/dap-family`
(`DESIGN.md` and `sketches/index.html`).

## 1. The behavior, in the member's words

**Things**

| Thing | What it is |
|---|---|
| Person | One human being who lived or lives: names, sex, living or deceased, the events of their life |
| Event | Something that happened to a person or a couple, with a date, a place and sources |
| Couple | Two people in a union: marriage, civil union, partnership, or unknown |
| Parentage | One person is a parent of another: birth, adoptive, step, foster, guardian, donor, surrogate, or unknown |
| Place | A point or area, with its names and jurisdictions over time |
| Source | A census, a parish register, a certificate, a book, a web page, an interview |
| Citation | A pointer from one assertion into one source: page, entry, image, transcription |
| External reference | An ID of the same thing elsewhere: Wikidata, FamilySearch, WikiTree, Find a Grave, GeoNames, a URL |
| Circle | People who work on a family history together, with invitations, discussions and tasks |
| Claim | A member's statement "this record is me" |

**Who takes part**

| Role | Can |
|---|---|
| Anonymous viewer | Read public records: the dead, as their stewards publish them. Living people show as "Private" |
| Link viewer | Read what a circle's view link covers, until it ends or is revoked |
| Member | Read the circle's records. Add people, events, sources and comments |
| Subject | A member who claimed a record as themself. Decides what it says and who sees it. Confirms or declines the relationships others assert to them |
| Steward | Looks after a record: settles disputes, chooses preferred facts, retracts errors. A subject is always a steward |
| Circle admin | Invites, removes, changes roles, moderates |
| Agent | Proposes sources, matches and transcriptions. Confirms no claim and chooses no preferred fact |

Not in version 1: DNA, private messages, large media, editing another
circle's living records.

## 2. Principles

1. **One record for each real person, eventually.** Duplicate trees are
   the main failure of genealogy sites at scale. The design aims at one
   shared graph of people. A circle works on part of it and copies none.
2. **Authority is local and small.** Every write goes to one small
   scope that owns what it writes. No act needs two scopes to agree at
   once. Scopes compose by messages, judged by the receiver.
3. **No fan-in on the write path.** A source cited by fifty million
   people, a place where a million were born, an ancestor of a billion:
   none receives a message for each mention. Reverse lookups come from
   the index (section 9).
4. **The narrower side owns an edge.** A parentage belongs to the
   child's record. A couple has its own record. No record holds an
   unbounded list of descendants.
5. **Assertions, not overwrites.** When two sources disagree, both
   assertions stay with their citations, and a steward marks one as
   preferred.
6. **The living control their own record.** A living person's details
   are private by default. A claim makes the person the record's
   subject.
7. **Erasable where it must be.** Details that identify a living person
   are detached, so a `redact` effect can remove them (section 8.4).
8. **Reads at scale come from projections.** The browser folds a
   replica only of the records it edits.
9. **Definitions change slowly.** A scope pins its definition for life,
   and succession to a new scope is designed and not built
   ([roadmap](../docs/roadmap.md#rules-that-change-after-creation)).
   The person definition stays small, its vocabularies stay open where
   history is open (event kinds, name types, place types), and policy
   that will change lives in the circle.

## 3. Identity, claims and invitations

### 3.1 Three identities

| Identity | Is | Lives in |
|---|---|---|
| Key | A device key that signs acts | A browser or the command line. An account has several |
| Account | A participant with a handle | A circle's membership today. An account scope later (G1) |
| Person record | A human being, alive or dead | A person scope |

An account is not a person record. Most records have no account: the
dead, and the living who never joined. Some accounts have no record: an
agent, a researcher, a member who has not found themself yet. A
**claim** links the two, and the person scope holds it.

### 3.2 A claim

A claim is an item in a person scope with the states `offered`,
`pending`, `confirmed`, `declined`, `withdrawn`, `released` and
`lapsed`.

- `claim-self` opens a `pending` claim. A guard refuses it while
  another claim is `confirmed`, and on a record marked deceased.
- `confirm-claim` is signed by a steward, or by the confirmed subject of
  a parent, child, sibling or partner record. The second case reads the
  relationship copies of section 5.3.
- On confirmation the claimant becomes the **subject** and a
  **steward**, and the record's visibility becomes `private` unless the
  subject chooses otherwise.
- A living child's record names a guardian as steward. A child's claim
  after the age that the circle's policy sets ends the guardian's
  stewardship unless the child keeps it.
- `release-claim` ends the subject's control. The member stays a
  steward until they remove themself.

### 3.3 Invitations

Each invitation is a membership invitation (`invite-member` in
`platform:membership`: a secret's hash, an end time, a role) and a
circle item that says what the invitation is for.

**Unbound.** "Join the Callan family circle."

1. The inviter signs `invite` on the circle, with an optional note and
   an optional **hint**: a person in the circle and a relation, such as
   "great-grandson of Peg Callan". The hint binds nothing.
2. The invitee opens the link. The page makes a device key and joins
   the membership, as dap-room's invitation link does.
3. **Find yourself.** The page searches the circle with the invitee's
   name and the hint. Picking a record signs `claim-self`, which waits
   for a confirmation.
4. **Add yourself.** With no match, the page signs `add-person` on the
   circle: living, private, with the invitee as subject and only
   steward.
5. **Connect.** The page turns the hint into parentage assertions. An
   assertion that names a claimed living person shows on that person's
   record only after they confirm it.

**Bound.** "Ruth, we have a record for you. Is this you?"

1. A steward of an unclaimed record P, living or of unknown status,
   signs `invite-bound` on the circle with P. The circle sends
   `tell offer-claim` to P with the invitation's hash and end time. P
   opens a claim in state `offered`. A guard refuses the offer while P
   has a confirmed claim or another open offer.
2. The invitee joins the membership with a new key and sees P as it
   stands.
3. **That's me.** The page signs `redeem-claim` on P with the
   invitation's secret. P checks the secret against the hash, as `join`
   does in membership, and the claim becomes `confirmed` in one act.
   The steward vouched when they invited.
4. **Review.** The page walks the subject through each recorded fact:
   keep, correct, hide or remove. It then asks who may see the record.
5. **Not me.** The invitee declines. P records the declined offer, the
   inviter receives a notice, and the invitee stays a member with no
   claim.

A timed rule on P lapses the offer at the invitation's end. The inviter
can revoke it earlier.

### 3.4 Viewers with no account

**Anonymous.** A viewer with no key reads the public projection
(section 9.3). No anonymous reader reads a scope. The projection holds
no living person's details. Where a living person sits between two
public people, the projection shows a "Private" box with no name, so
the shape of the tree survives.

**Link viewer.** A circle admin signs `make-view-link`. The link carries
a read capability: the records it covers, whether it covers the living
people the circle may show, and an end time. Revocation is one act.

Either viewer can select **Ask to join**, which makes a key and sends a
join request that an admin answers with an invitation.

## 4. The record model

The model follows GEDCOM X and GEDCOM 7 where they agree, so import and
export stay close to direct.

**Person.** Names, each with a type (birth, married, also known as,
religious, nickname, other), given names, surname, prefix, suffix,
language, script, and the name as the source wrote it. Sex as recorded,
and an optional gender that the subject sets. Living status: living,
deceased or unknown. Events, citations, external references, media and
notes. One preferred name, birth and death; the others are alternatives.

**Event.** A kind as open text with a recommended list (birth,
baptism, census, residence, occupation, emigration, immigration,
naturalisation, military, death, burial, probate; for a couple
engagement, marriage, separation, divorce). A date (below). A place
scope, the place as written, and a copy of its point for the map. An
age if the source gives one. A description. Its citations. A state:
`asserted`, `disputed` or `retracted`.

**Date.** A record with `calendar` (gregorian, julian, hebrew,
french-republican, islamic, other), `qualifier` (exact, about,
estimated, calculated, before, after, between, from-to), `y`, `m`, `d`,
`y2`, `m2`, `d2`, `dual` (the second year of 1712/13), `text` (as
written) and `sort` (days since 1 January 1 CE, proleptic Gregorian). A
rule expression checks that `sort` agrees with the other members, so no
client files 1712 under 1812.

**Couple.** Two persons, a kind, a state (current, ended, unknown), its
events and citations. A person with several partners has several
couples. Partners have no fixed roles.

**Parentage.** A parent, a child, a kind, optionally the couple the
child belongs to, citations and a state. A tree groups parentages into
families. Siblings, grandparents and cousins are derived.

**Place.** Names over time, each with a language and a date range. A
type (open text). A point in integer microdegrees as in dap-foldkit,
and an optional area by the digest of its GeoJSON. Jurisdictions over
time: "Skibbereen was in County Cork, in the United Kingdom of Great
Britain and Ireland, from 1801 to 1922". External references and
comments.

**Source and citation.** A source is shared: title, creator, date,
kind, repository, external references, media. A citation lives in the
record it supports and names its source scope: locator, URL and access
time, a transcription as a detached text, and an evaluation in the
Genealogical Proof Standard's terms (original, derivative or authored;
primary, secondary or undetermined information; direct, indirect or
negative evidence).

**Media.** A photograph, scan or recording is kept by content digest
outside the journal (G6).

## 5. Scopes

### 5.1 The definitions

| Definition | One for each | Owns | Size over a life |
|---|---|---|---|
| `family-person` | Person | Names, sex, status, events, parentages to its parents, citations, references, media, notes, claims, stewards, visibility, merge status | 20 to 500 entries |
| `family-couple` | Couple | Partners, kind, events, citations | 5 to 50 |
| `family-place` | Place | Names, point, area, jurisdictions, references, comments | 5 to 100 |
| `family-source` | Source | Description, repository, references, media, page transcriptions | 5 to 50 |
| `family-circle` | Circle | Policy, the IDs of its people, invitations, view links, tasks, discussions | Grows. A busy circle starts a new discussion scope before 100 000 entries |
| `platform:membership` | Circle | Members, keys, roles, invitations | As in dap-room |
| `family-merge` | Merge proposal | The two records, field choices, approvals, outcome | 5 to 30 |
| live presence | Circle | Each member's viewport and selection | Nothing kept |

### 5.2 Messages between them

```
family-circle --create--> family-person, family-couple
family-circle --tell offer-claim--> family-person
family-person (child) --relate parent-of--> family-person (parent)
family-person (child) --relate child-in--> family-couple
family-couple --relate partner-in--> family-person (each partner)
family-merge --tell merge-into--> family-person (duplicate)
family-person (duplicate) --relate redirect--> its neighbours
family-person --index--> family-circle
events and citations name places and sources by ID; no message
```

- A parentage is an item in the child's scope, which relates
  `parent-of` to the parent and `child-in` to the couple if named. The
  parent's `relate` handler declares `copies` (proposed: 512). A
  person with more children is read from the index.
- A couple is its own scope and relates `partner-in` to each partner.
- The circle holds the IDs of its people, not their records.

### 5.3 What the copies are for

The copies that `relate` leaves in a person scope give it three facts
with no read of another scope:

- Who may confirm a claim on this record: the confirmed subjects of its
  parents, children and partners.
- What a living subject must confirm. A link asserted by someone else
  arrives as a copy in state `proposed`. The subject's `confirm-link`
  or `decline-link` acts on it. The asserting record keeps its
  assertion either way, and the projections show the link only once it
  is confirmed or the subject is not a claimed living person.
- Whom to tell: a `notify` to the stewards of the related record.

## 6. Definitions

Sketches. Each names its item types and acts. Field and slot shapes
follow `definition/map.ts` of dap-foldkit. The bounds of
`packages/contract/src/bounds.ts` apply: 16 item types, 64 acts, 12
values and 12 references for each item type, 8 sends for each act, 64
elements in a list.

### 6.1 `family-person@1`

| Item | Many | States | Parties | Refs | Values |
|---|---|---|---|---|---|
| `person` (genesis) | no | `open`, `merged` (final) | `subject`, `stewards` (list, 16), `creator` | `mergedInto` (scope) | `living`, `sex`, `gender` (detached), `visibility`, `prefName`, `prefBirth`, `prefDeath` |
| `name` | 64 | `asserted`, `disputed`, `retracted` | `author` | | `type`, `given`, `surname`, `prefix`, `suffix`, `asWritten`, `lang`, `citations` |
| `event` | 512 | as `name` | `author` | `place` (scope) | `kind`, `date` (record), `placeText`, `lat`, `lng`, `age`, `description` (detached), `citations` |
| `parentage` | 16 | as `name` | `author` | `parent`, `couple` (scopes) | `kind`, `citations` |
| `citation` | 1024 | `cited`, `retracted` | `author` | `source` (scope) | `locator`, `url`, `accessed`, `transcript` (detached), `quality` (record) |
| `extref` | 128 | `listed`, `removed` | `author` | | `system`, `id`, `url` |
| `media` | 256 | `listed`, `removed` | `author` | | `digest`, `kind`, `caption` (detached), `date`, `place` |
| `note` | 256 | `posted`, `deleted` | `author` | | `text` (detached), `on` (item) |
| `claim` | 64 | section 3.2 | `claimant`, `decidedBy` | `circle` (scope) | `inviteHash`, `inviteEnds`, `evidence` (detached) |
| `dispute` | 512 | `open`, `resolved` | `author`, `resolver` | | `on` (item), `reason` (detached), `outcome` |

For a living person, the names, free text and transcriptions are
detached (section 8.4).

| Acts | Who | Guards |
|---|---|---|
| `open-person` (genesis, by `create` from a circle) | the circle | Creator, subject and stewards from the message |
| `add-name`, `add-event`, `add-parentage`, `cite`, `add-extref`, `add-media` | a steward; any contributor when the record is deceased and public | |
| `edit-*`, `retract-*` | the author or a steward | State is `asserted`. A retraction keeps the item |
| `dispute`, `resolve` | any member who reads it; a steward resolves | The item is `asserted` |
| `prefer` | a steward | The item exists and is not retracted |
| `set-living`, `set-visibility` | a steward; only the subject when there is one | `public` refused for a living or presumed living record unless the subject signs |
| `add-steward`, `remove-steward` | a steward | The subject cannot be removed |
| `claim-self`, `confirm-claim`, `redeem-claim`, `decline-claim`, `withdraw-claim`, `release-claim` | section 3.2 | `redeem-claim`: state `offered`, the secret hashes to `inviteHash`, before `inviteEnds` |
| `confirm-link`, `decline-link` | the subject | The copy is `proposed` |
| `note`, `delete-note`, `moderate-note` | as in `shared-map` | |
| `redact` | the subject; a steward of a living record | Drops the bytes |

Handlers: `offer-claim` (tell, from a circle), `merge-into` and
`unmerge` (tell, from a merge), and the relations `parent-of`,
`partner-in`, `member-of` and `redirect`. Timed: an offered claim lapses
at `inviteEnds`.

### 6.2 `family-couple@1`

One genesis item `couple`: `partners` (two scopes), `kind`, `state`, and
the `event`, `citation`, `note` and `dispute` items of a person. The
genesis relates `partner-in` to each partner. When a partner is a
claimed living person, projections wait for that person's
`confirm-link`. The couple scope does not wait.

### 6.3 `family-circle@1`

| Item | Note |
|---|---|
| `circle` (genesis) | Title, home person, policy: who adds people, the default visibility, the guardianship age, the presumed-living horizon |
| `person-ref` (50 000) | One for each person scope the circle works on |
| `invitation` | `unbound` or `bound` (names a person scope). `issued`, `redeemed`, `declined`, `revoked`, `lapsed` |
| `view-link` | Coverage, whether it includes living people, end. `active`, `revoked`, `lapsed` |
| `task` | A research task, with an assignee and the records it is about |
| `thread`, `post` | Discussions |

Acts: `add-person` and `add-couple` send `create`. `include` adds an
existing person scope. `invite-bound` also sends `tell offer-claim`.
Others: `invite`, `revoke-invitation`, `make-view-link`,
`revoke-view-link`, and the task and discussion acts. Membership roles:
`viewer`, `contributor`, `steward`, `admin`, `agent`.

### 6.4 `family-place@1` and `family-source@1`

`family-place` holds `place` (genesis: type, point, area digest),
`name`, `jurisdiction`, `extref` and `comment` as in `shared-map`.
`family-source` holds `source` (genesis), `repository`, `extref`,
`media` and `page`.

The act that adds an event can create its place. The seed of a place
from an outside gazetteer names that gazetteer's ID. Two members who
pick GeoNames 2961423 at the same moment then name the same scope,
because a scope's ID is the digest of its seed
([Identity and genesis](../docs/scopes.md#identity-and-genesis)).

### 6.5 `family-merge@1`

One item `merge`: `survivor` and `duplicate` (person scopes), field
choices, an approval from a steward of each, and a state: `proposed`,
`approved`, `executing`, `done`, `failed`, `undone`. On approval it
sends `tell merge-into` to the duplicate. The duplicate copies its
assertions to the survivor by its own sends, becomes `merged`, and
relates `redirect` to its neighbours, which point their copies at the
survivor. Result clauses record each answer. An undo is a second merge
scope that runs the inverse. The duplicate keeps its whole record.

## 7. Two flows

### 7.1 Add a parent

1. On Patrick's page the member selects **Add father**. With no record
   for him, the page signs `add-person` on the circle, which sends
   `create`. The new box shows at once, marked as not confirmed, as
   dap-foldkit marks a new place.
2. The page signs `add-parentage` on Patrick's scope.
3. Patrick's scope relates `parent-of` to the father. Each receiver
   judges the copy in its own turn.
4. The index takes both entries, and the tree around Patrick shows the
   father.

If step 2 fails, the father remains a person with no relatives, and the
circle lists him under "unconnected".

### 7.2 A dispute

Ann records Patrick's birth as about 1838 from a gravestone. Brendan
records a baptism in 1841. Both events stay with their citations.
Brendan opens a `dispute` on Ann's event: "Gravestone ages are often
rounded; the baptism is primary information." A steward signs `prefer`
on Brendan's event and resolves the dispute. Ann's event stays as an
alternative, and a later reader sees the argument and who settled it.

## 8. Visibility and privacy

### 8.1 Living

A record is **presumed living** unless it is marked deceased or its
latest dated event, or its birth estimated from relatives, is 110 or
more years ago. A circle's policy can lower the horizon to 100.

### 8.2 Classes

| Visibility | Readers | Default for |
|---|---|---|
| `private` | Stewards and subject | A claimed living person |
| `circle` | Members of the circles that include it | An unclaimed living person; a new record |
| `public` | Everyone, through the public projection | A deceased person, once a steward publishes it |

A fact can also be **restricted** (cause of death, adoption, a criminal
record) to stewards only. dap has no private views inside one record,
so a restricted fact is a detached value that the scope serves only to
stewards (G2).

### 8.3 Where the rule holds

| Reader | Enforced by |
|---|---|
| Member | The scope's read authorization (G2) |
| Index | Each row carries the visibility class and the circles. The index answers a reader only with what that reader may read. A private record shows to others as an opaque ID |
| Public projection | The publisher selects public records. It never publishes a living or presumed living person unless the subject signed `public` |
| Agent | The rules of a member with the agent role |

### 8.4 Erasure

The journal is permanent and replayed. Details that identify a living
person are therefore detached: the journal carries a digest, the scope
holds the bytes, and a `redact` effect drops them. dap redacts a
detached text today. A living person's dates are integers in an event's
`date` record, so they need a detached value of another type, and the
event's `sort` is kept to the year (G10). After a redaction every
projection rebuilds from the redacted record.

## 9. Reading at scale

### 9.1 The graph index

The index projects person, couple, place and source scopes into tables
for the questions a page asks: the neighbourhood of a person (N
generations up, M down, partners and siblings) in one request; name
search with phonetic keys (Daitch-Mokotoff, Beider-Morse, Soundex) and
date and place ranges; events by place and time as map tiles; and
possible duplicates. `index` messages and each scope's journal feed it.
It is sharded by person ID with the person's edges, it holds no
authority, and each row carries the scope position it was built from,
so a page can tell when the index is behind its own replica.

### 9.2 The browser

The page folds a replica, as dap-foldkit does, only of what it may
write now: the focused person, their couples and the circle. A person
scope is small, so a fold from entry 0 takes milliseconds and needs no
state seed. Everything else on the screen comes from the index.

### 9.3 The public projection

A publisher folds each public record into static files: a page and a
JSON document for each public person, place and source, map tiles of
public events, and a sitemap. Anonymous viewers and search engines read
only these. dap's Site handler serves a room's published Git pages to
an anonymous request today. At 10⁹ pages the target needs to be an
object store behind a CDN (G3).

## 10. The map

| From dap-foldkit | Use here |
|---|---|
| `app/mapView.ts`: MapLibre, OpenFreeMap styles, the globe camera, saved view, pins, tooltips, `flyTo` | A module, with event pins |
| `app/locationSearch.ts`: Photon geocoding and coordinates | The fallback after the place gazetteer |
| `shared-map`'s `place` and `comment` | The shape of `family-place` |
| Pending marks for unconfirmed acts | The same, for events and places |
| Live presence and member viewports | Collaborators researching together |
| The client of `PLAN.md` section 13 and [the scope client note](2026-11-13-scope-client.md) | Every form |

New layers:

- **Life path**: one person's events in order, joined by a line.
- **Lineage**: ancestors' birthplaces coloured by generation, with an
  arc from each parent's birthplace to the child's.
- **Family in year Y**: each living person in the neighbourhood at
  their latest known residence before Y.
- **Density**: events by kind, clustered.
- **Context**, outside the record: the borders of a year from a
  historical boundaries dataset, and events from Wikidata.

A time slider runs from the earliest to the latest year in view. It
animates **Family in year Y** across generations and filters every
other layer to a window, by each event's `sort`.

## 11. The client

A foldkit application, as dap-foldkit is. Views: **Tree** (pedigree,
descendants, hourglass and fan around a focus person; each box shows
years, a living mark, a claimed mark, a pending mark and a dispute
mark), **Person** (events with a small map, relationships, sources,
discussion, and the scope's journal as the record's history), **Map**,
**Timeline**, **Sources**, **Circle** (members and the record each
claims, invitations, view links, tasks), **Inbox** (claims to confirm,
links that name the member, disputes on records they steward) and
**Public** (Person, Tree and Map over the public projection, read
only).

## 12. Scale, approximately

| Quantity | Estimate | Note |
|---|---|---|
| Person records, eventually | 10⁹ to 10¹⁰ | About 10¹¹ people have ever lived |
| Entries in a person scope | 20 to 500 | dap's bound is 100 000 |
| Bytes in a person scope | 50 to 500 kB | 10⁹ scopes come to 50 to 500 TB of journals |
| Scopes for each person | about 1.5 | A person and half a couple |
| Fold of a person in the browser | a few ms | dap-foldkit measured about 55 ms for each 1 000 entries |
| Busiest place, source, ancestor | 10⁶ events, 10⁸ citations, 10⁹ descendants | None receives a message for each; copies are kept for children only |
| Index | The dominant cost | One shard read for each generation of a neighbourhood |

## 13. What dap provides, and what this needs

| | Need | dap at `b0a6439a` | Candidate request |
|---|---|---|---|
| G1 | One account across circles; a person scope that accepts signers from several memberships | `MemberRef` names its membership, so a party slot can hold members of several circles. A read session and grants come from one room's membership. A personal account across records is not designed | An account scope, or a rule for a signer whose grant comes from another membership |
| G2 | Readers from a scope's own state; restricted values for stewards | A read session covers the scopes of one repository. A signed read covers a key's own entries and their causes. Private views in one record are not designed | Readers declared from party slots and relationship copies |
| G3 | Public pages at very large scale; view-link capabilities | Site serves a room's published Git pages anonymously. Publication from a fold runs for Git | An object-store target; a read capability for a view link |
| G4 | Application scope kinds | `ScopeKind` is a fixed list of ten, and a `scope` field names one kind | An application kind, or a stated choice among `task`, `lane`, `commons` and `order` |
| G5 | Application scopes that create and relate to each other | A native test-host witness passes across rooms under v1 installation. V2 packages cannot yet declare an external receive port | The receive port for v2 packages. A check of 512 copies against `scopeRecords` |
| G6 | Media | Files and capture with a stated source are designed, not built | The file store, with detached-text custody |
| G7 | One feed of many scopes into an index | An `index` row goes to the scope's directory | A projection feed for 10⁹ scopes |
| G8 | Import of a GEDCOM file of 10 000 people | An entry sends at most 104 messages, and a fan-out covers 32 items | A batch path, or many signed acts under one custody |
| G9 | Presence | Live and Recorded run | None. Presence uses the live level as dap-foldkit does |
| G10 | Erasure of values that are not text | `redact` names a detached text slot | Detached values of other types |
| G11 | Definitions that last decades | Succession to a new scope is designed, not built | Succession; until then a small person definition |

## 14. Order of work

| Stage | Content | Needs |
|---|---|---|
| F0 | `family-person`, `family-couple` and `family-circle` pass `validateDefinition`. In-memory tests of a parentage relate and a bound claim across two scopes | None |
| F1 | One circle in one room. Person and couple scopes are children of the circle and read through the room's session. Tree, Person and Map. Both kinds of invitation. Every member reads every record | G4, G5 |
| F2 | The index for one circle, name search, neighbourhood reads, GEDCOM import and export | G7, G8 at small scale |
| F3 | Shared source and place scopes. Lineage and year layers, the time slider | |
| F4 | The public projection, anonymous viewers, view links | G3 |
| F5 | A person scope that two circles include. Accounts across circles. Living privacy by class | G1, G2, G10 |
| F6 | Merges, duplicate hints, moderation of the public graph | |
| F7 | Presence while researching together. Agents as research assistants | |

F1 is a family tree for one family. F5 is the first step past it, and
the step that needs dap to change.

## 15. Open questions

1. **A persona for each source?** The strict evidence model keeps one
   persona for each person as each source describes them, and a
   conclusion person that groups personas. It undoes bad merges better
   and costs a scope or an item for each persona. This note keeps
   assertions with citations in one person scope. Revisit at F6.
2. **Who stewards a public record that no one looks after?** The
   circles that include it, or a global moderation role.
3. **A couple with one partner outside every circle of the other.** Its
   readers follow the more private partner.
4. **Guardian to child.** The age, and what happens when a parent and
   an adult child disagree about the child's record.
5. **Notes in the person or the circle?** A note in the person reaches
   every circle. A circle's discussion stays in the circle.
6. **Historical boundaries.** Which dataset, and whether places carry
   their own areas.
7. **Names across scripts.** One phonetic key across Cyrillic, Greek,
   Hebrew, Arabic and Chinese names.
