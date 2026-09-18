---
date: 2026-09-15
status: >-
  narrative companion to the views note's sale trace. Walks the same positions
  as five people would experience them in a general-purpose dap mobile client.
  It specifies the intended experience and the points where the model shapes
  it; it adopts no UI design, no layout and no visual language.
  Verified against the landed spike at main e2fb7ef3 on 2026-09-18 and
  corrected. Positions follow the landed trace, which inserts the Sale model's
  declared join disclosure; see "How to read the positions". Screen fields
  named here are the intended client projection, not the built one: see
  "What the client reads".
design: notes/2026-09-14-evolving-spaces-design.md
views: notes/2026-09-14-one-series-many-views.md
---

# The sale as experienced

## What the app is

Alice sells a guitar. Bob and Carol bid for it without seeing each other's
prices. Ivan inspects it. Dana joins after it is sold and is shown what
Alice chooses to share. This note walks that sale as each of them would
see it on a phone, and says at every step what the design lets the screen
show and what it withholds.

A general-purpose dap mobile app is one client for every package. It has no
code for sales, bookings or clubs. It renders what the context exposes to
the viewer: an anchor for the referent, a thread of visible events, the
current state, and the affordances the viewer holds. When a package
attaches, the client fetches its presentation bindings and renders the new
kinds the same way. There is no per-application app to install.

Some of that comes from the `observe` projection the spike built and some
does not, so the next section says exactly which is which. Where this note
describes a screen, it is describing the intended client, not a built one.

## What the client reads

This section is the one place where intent and implementation differ, so it
states both. The spike built the projection the agreement property compares,
not a client. A screen needs more than that projection carries.

**What `observe` actually returns today** (`spike/src/observe.ts`):
`participants` (a flat list of principal ids, without roles), `closed` (the
foundation's own close, which is not `sale.close`), `kinds` and `bindings`
(the semantics this principal would judge by), `outcomes` (per position the
principal can see, with per-model effectiveness and reason), `models` (one
projection per attached model) and `affordances` (a sorted list of kind
strings).

**What a screen needs on top of that, and where it comes from.** The
per-position thread and the count of unreadable positions come from the
serving side, `Context.view(p, n)` and `Context.hiddenCount(p, n)`, not from
`observe`. A pause is the interpreter's return value, `Paused {at, reason,
last}`, not a field of `observe`. An **anchor** — a title, a photo, a status
line, and the context a status came from — is **not implemented anywhere**;
the fixture's listing carries only a referent tag and an asking price, and
O6's published listing adds a description and a route. Nothing composes a
referent across contexts.

So the paths below are written as a client would want them, and each names
where the value lives today:

- **anchor**: aspirational. Nearest real data: `observe.models.sale.referent`
  and `.ask`.
- **participants**: `observe.participants`, ids only; roles must be read from
  the foundation's grant history.
- **thread** and **hidden count**: `Context.view()` / `Context.hiddenCount()`.
- **offers**: `observe.models.sale.offers[]`, each `{id, author, position,
  status, replaces, amount, counter}`, where `amount` and `counter` are
  `null` — present but withheld — for anyone who is neither the offer's
  author nor the seller. `status` is `open`, `withdrawn`, `replaced`,
  `accepted` or `declined`.
- **sale**: `observe.models.sale.status`, one of `unopened`, `open`,
  `decided`, `closed`, with the winner in `.accepted`.
- **inspection**: `observe.models.inspection.requests[]`. The harness package
  declares one kind, a request. There is no result kind and no request
  status.
- **affordances**: `observe.affordances`, kind strings only. They carry no
  payload shape and no target, so "Accept o3" and "Accept o2" are one entry.
- **pause**: the interpreter's `Paused`, surfaced by a client.

A screen must let a newcomer answer three questions without help: what is
this about, what can I do now, and what can I not see and why. Those are the
comprehension criterion from the design note's goals. Each path below is
written so a reader can check that all three are answered at every step.

## How to read the positions

A step is written `[position, kind]`, where the position is the one the event
eventually occupies once recorded; Alice writes the listing before anything
is recorded, and it lands at position 1 after the genesis at 0. Audiences: S
is the spine, every participant present and future; M is members, the
participants as of that position; otherwise the named people.

**The positions here are the landed trace, which is the views note's table
plus one event.** The Sale model declares that when a participant joins, the
seller discloses to them every effective offer, withdraw and accept recorded
before their join (`config.joinDisclosure`). Ivan is the only person in this
trace who joins after offers exist, so exactly one such disclosure occurs, at
position 14, and every position the views note numbers 14 to 19 moves up by
one. The landed trace therefore ends at 20, not 19.

That disclosure is not a detail of presentation. Without it the trace does
not satisfy the property at all: replayed literally, it leaves five
violations, the first being Ivan judging Bob's replacement at the shifted
position with `no_such_offer` where the oracle says effective. The model was
repaired to close that gap, and the repair is one of the six semantic fixes
that put Sale over its authoring budget. A reader assessing that budget
should notice that this narrative's most interesting participant is the one
whose story the repair exists to make true.

## Alice sells a guitar

**Creating the listing.** Alice opens the app and taps New. The app asks for
a description, an asking price and a photo. It does not ask what kind of
thing this is. Alice writes "Guitar, 1970s dreadnought", sets 800, and adds a
photo. The app signs this as a standalone listing event: a referent tag, the
description and a rendezvous route it will answer on `[1, Listing]`. Nothing
has been sequenced yet; the listing is bytes Alice holds.

(Implementation note: the spike's `sale.listing` carries a referent tag and
an asking price; O6's published listing adds a description and a route. No
title or photo field exists in any landed schema. A client that wants an
anchor needs them added.)

**Choosing a package.** The app offers to open a context around the listing.
Alice picks Sale from a short list of packages her client knows. The client
signs a genesis that adopts the listing as entry 1, pins the Sale package
and a single-writer sequencing profile, and grants Alice the Seller role
with the `dap.invite`, `dap.attach`, `dap.grant`, `dap.disclose` and
`dap.close` capabilities `[0, dap.genesis]`. In this trace Alice's client is
also the writer. That is the fixture's simplification: the ordering spike's
bootstrap pins a handover profile in which the writer and the control key are
principals distinct from the seller, so nothing here should be read as saying
the seller must hold the pen.

Alice's screen now shows the anchor (her description, ask and photo, with
"Sale, you are Seller" as the status line), one participant, and her
affordances: Invite, Attach package, Grant, Disclose and Close — every system
kind whose capability she holds, from position 0 onward. The thread has two
entries she can read and her hidden count is 0.

**Publishing.** Alice taps Share. The app builds an envelope: the listing,
the signed genesis and the route. It is signed bytes with no audience rule;
the app hands it to whatever Alice chooses, a message, a link, a directory.
The envelope is not an event in the context. Alice's screen does not change.
The ordering spike implements exactly this envelope and its route, and its
report records what that does and does not establish.

**Join requests arriving.** Bob's client reaches the route. Alice's app shows
a join request: a context-scoped principal, no name unless Bob supplied one,
asking to become Buyer. Alice taps Invite. The client sequences a one-use
invitation for Bob `[2, dap.invite]`, visible only to Alice and Bob. When Bob
redeems it `[3, dap.accept_invite]`, her participants list gains "Buyer"
and the thread shows the acceptance. The same happens for Carol
`[4, dap.invite]` `[5, dap.accept_invite]`. Alice's hidden count is still
0: as Seller she can read every position so far.

This narrative keeps the manual path so that each invitation is a visible
choice. **It is the path the spike did not build.** The implemented
rendezvous takes the other option: the route mints a Buyer invitation from
Alice for whoever reaches it, refusing only a principal it cannot parse.
There is no prompt and no admission decision, and the system kind that would
carry one, `dap.admit`, is deliberately not in this version and folds to
`not_in_v1`. So the fixed-policy path is real and the deliberating seller is
the aspiration. Anyone reading this note for what admission should feel like
should know that the spike has not tested it, and that the Club model, which
did try to decide admissions, is the spike's one outright failure.

**Offers arriving.** Bob's offer arrives as two positions. The stub
`[6, sale.offer]` is visible to every member; the terms
`[7, sale.offer_terms]` are visible to Bob and Alice. Alice's
Her offers show o1 by Buyer Bob with `amount: 700`. Carol's offer
follows the same shape `[8, sale.offer]` `[9, sale.offer_terms]`, and Alice
sees o2 at 750. Her affordances now include Counter and Accept. They name
kinds, not targets, so it is the client that decides which offer a tap
applies to.

**Countering.** Alice counters Bob's offer at 780 `[10, sale.counter]`. The
counter is visible to Alice and Bob only. Her offers show o1 still `open`,
now carrying `counter: 780`.

**Attaching Inspection.** Alice decides an inspection would help. She taps
Attach package and picks Inspection
`[11, dap.attach]`. The attach is spine: every participant, present and
future, sees the sale gain an Inspection model from position 12 onward. Her
client fetches the package and its presentation bindings. Nothing before
position 12 is reinterpreted.

**Inviting Ivan.** The Inspection package defines an Inspector role. Alice
invites Ivan `[12, dap.invite]`; he accepts `[13, dap.accept_invite]`. Her
participants list gains "Inspector".

**The join disclosure.** Ivan has joined a sale that already has offers, and
the Sale model declares that the seller must hand a joiner the public shape
of what they missed. Alice's client sequences it without asking her:
`[14, dap.disclose]`, naming positions 6 and 8 to Ivan, the two offer stubs
effective at his join. It is a members event, so Bob and Carol see that it
happened and to whom, though not what it carried. Alice is not consulted,
because this is the model's declared dependency and not her choice; she
could not have withheld it and still had a model that satisfies the
property.

Carol's inspection request `[15, inspection.request]` reaches Alice, Carol
and Ivan; Alice's inspection view shows it.

**A replaced offer.** Bob replaces o1 with o3 `[16, sale.offer]`
`[17, sale.offer_terms]`. The stub says o3 replaces o1; the terms say 780.
Alice's offers show o1 as replaced and o3 at 780.

**Accepting, twice.** Alice is on a slow connection. She taps Accept on o3,
and while that intent is still in flight her screen has not changed: her
view is still at 17, Accept is still an affordance on every open offer, and
she taps Accept on o2 as well, meaning to accept the higher one and
unsure which she tapped first. Her client signs both intents from the view
she had. The writer orders them: o3 first `[18, sale.accept]`, o2 second
`[19, sale.accept]`.

Position 18 is visible to every member. The Sale fold checks only public
state: the stub o3 exists, is not withdrawn, is not replaced, the sale is
open. All true. That Alice may accept at all is the foundation's check, made
before the model sees the event, not part of the Sale fold. The sale's status
becomes `decided` with `accepted: o3`, and her offers show o3 accepted and o2
declined. Accept and Counter leave her Sale affordances; Close, Disclose,
Invite, Attach and Grant remain, because those are the foundation's and she
still holds them.

Position 19 is judged at its own position: the sale is already decided, so
it is ineffective. Her thread shows position 19 with "no effect: sale
already decided", from the model's own reason `already_decided`. Every member
sees the same entry with the same reason, because the decision at 18 and the
state it changed are public. Nothing
was drawn that the model did not offer; the second tap was offered by a
view that had not yet learned the first tap's result.

Alice's screen answers the three questions here in the same way as
everyone's. What is this about: the anchor. What can I do now: Close or
Disclose. What can I not see: nothing, and the hidden count says 0.

**Closing.** Alice taps Close `[20, sale.close]`. The close is spine. The
sale's status becomes `closed` and its affordances are empty. The anchor's
status line reads "Sold", and the client attributes it to this context.
(`sale.close` ends the sale, not the context: the foundation's own `dap.close`
is a different event, and the Inspection package keeps offering its request
affordance after the sale is closed. A real package would gate that; this
fixture does not.)

## Bob buys the guitar

**Finding it.** Bob receives the envelope as a link. His app opens it and
renders the listing from the envelope's bytes: description, ask, photo. This is
not a view of the context; it is the standalone listing. The app says so:
"Not joined. Request to join as Buyer." That button is the route.

**Joining.** Bob taps it. His client sends a join request to the route.
Nothing is sequenced until Alice issues the invitation `[2, dap.invite]`.
Bob's client receives the capability and redeems it `[3, dap.accept_invite]`.
The acceptance embeds the signed invitation, so every other member can
verify Bob's grants from the acceptance alone.

**What he sees on entry.** Bob's client receives the spine from position 0:
the genesis, the listing, and every spine event so far, plus position 2,
his own invitation, which is addressed to him. It also receives an
authenticated header for every position whose audience excludes him. At
this moment there is none, so his hidden count is 0. The anchor shows the
listing with "Sale, you are Buyer". Participants show Seller and Buyer. His
affordances are Offer and its terms: the split is two kinds, and a client
that drew only one button would be hiding half the model.

When Carol joins `[4, dap.invite]` `[5, dap.accept_invite]`, Bob sees a
second Buyer appear in his participants list. He sees a header for
position 4 and his hidden count becomes 1. He can read position 5.

**Offering.** Bob taps Offer and enters 700. His client emits two events:
the stub `[6, sale.offer]`, which every member sees, and the terms
`[7, sale.offer_terms]`, which Alice and Bob see. Bob's offers show o1 with
`amount: 700`.

Carol's offer arrives as a stub `[8, sale.offer]` and terms
`[9, sale.offer_terms]`. Bob sees o2 by the other Buyer, with no terms, and
his hidden count becomes 2. The screen shows "another buyer has offered;
amount not visible to you".

**Being countered.** Alice's counter `[10, sale.counter]` reaches Bob.
His offers show o1 with `counter: 780`, still `open` — the counter is a
field on the stub, not a status. His affordances now include Withdraw, and
replacing is not a separate kind: a replacement is another `sale.offer` that
names what it replaces, with its own terms event beside it.

**The package changes.** Alice attaches Inspection `[11, dap.attach]`. Bob's
client fetches the package and renders its kinds from position 12. Ivan
joins `[12, dap.invite]` `[13, dap.accept_invite]`; Bob sees the invite as
a header and the acceptance in the clear. His participants list gains
Inspector. Alice's join disclosure to Ivan `[14, dap.disclose]` is readable
to Bob as an act: he sees that the seller disclosed two positions to the
Inspector, and not what they were. Carol's inspection request
`[15, inspection.request]` is a header to him. His hidden count is now 4.

**Replacing.** Bob taps Replace offer and enters 780. Two events again: the
stub `[16, sale.offer]` saying o3 replaces o1, and the terms
`[17, sale.offer_terms]`. His offers show o1 replaced and o3 at 780.

**Winning.** Alice's accept `[18, sale.accept]` reaches every member. Bob's
sale status becomes `decided` with `accepted: o3`, and his offers show o3
accepted at 780, because as its author he can see the amount. The screen
reads "Your offer was accepted".

Position 19 arrives as an ineffective accept of o2. Bob's thread shows it
with "no effect: sale already decided". It does not change his state.

**Close.** `[20, sale.close]` closes the sale. Bob's affordances for the
Sale model are empty. The anchor reads "Sold, to you", attributed to this
context. His hidden count is 4, shown as numbered gaps at positions 4, 9, 12
and 15. The headers say nothing about what kind of event each hides, and the
screen does not guess.

## Carol makes an offer and loses

Carol's path is Bob's path in a different thread. The differences are what
she sees of Bob.

**Joining.** Carol finds the envelope, requests to join, is invited
`[4, dap.invite]` and accepts `[5, dap.accept_invite]`. On entry her client
receives the spine from 0 and a header for position 2, Bob's invitation.
She sees participants with Seller and two Buyers,
no offers yet, and a hidden count of 1.

**Bob offers first.** The stub `[6, sale.offer]` is visible to Carol: o1 by
the other Buyer. The terms `[7, sale.offer_terms]` are a header.
her offers show o1 with no amount; her hidden count is 2.

**Offering.** Carol offers 750 `[8, sale.offer]` `[9, sale.offer_terms]`.
Her offers show o1 (other buyer, amount withheld) and o2 (hers, 750).

**Watching a hidden counter.** Alice counters Bob `[10, sale.counter]`.
Carol receives a header. Her hidden count becomes 3. Her thread shows
"one position you cannot read" between her offer and the next visible
event. She cannot tell what kind it was.

**Asking for an inspection.** The Inspection package attaches
`[11, dap.attach]`; Carol's client fetches it. Ivan joins
`[12, dap.invite]` `[13, dap.accept_invite]`. Carol's affordances gain
Request inspection. Alice's join disclosure to Ivan `[14, dap.disclose]` is
readable to her as an act, without its contents. She taps Request inspection
against her own offer `[15, inspection.request]`. Alice, Carol and Ivan can
read it, and it appears in her inspection view.

**Bob replaces his offer.** The stub `[16, sale.offer]` is visible to Carol:
o3 by the other Buyer replaces o1. The terms `[17, sale.offer_terms]` are
a header. Her hidden count is now 5. Her screen shows o1 replaced by o3,
amount not visible.

**Losing.** Alice accepts o3 `[18, sale.accept]`. The fold runs on public
state for Carol exactly as for everyone: o3 exists, not withdrawn, not
replaced, sale open. Her sale status becomes `decided` with `accepted: o3`,
and her offers show o2 declined and o3 accepted, amount not visible. The
screen reads "Another offer was accepted". Her inspection request is now
pointless, but nothing in the fixture says so: the harness Inspection package
has no request status and no result kind, and it keeps offering Request
inspection to everyone even after the sale is decided. That is a gap in the
fixture, not a property of the design.

**Position 19 from Carol's side.** Alice's accept of o2 arrives. Carol can
read it: it names her offer. The fold refuses it for the same public reason
it refused it for Alice: the sale is already decided. Carol's thread shows
"Seller attempted to accept your offer; no effect: sale already decided".
This is the position the views note calls the point of the trace. Carol
judges the event exactly as Alice does, because everything the judgement
depends on is in her view.

**Close.** `[20, sale.close]`. The anchor reads "Sold", attributed to this
context. Her hidden count is 5: numbered gaps at 2, 7, 10, 12 and 17, with
no kind shown for any of them.

## Ivan inspects

Ivan is the reason the Sale model has a declared join disclosure, and his
path is the one that changed most between the views note's table and the
landed model. Read it as the answer to "what does a person who arrives late
actually get?".

**Invited into a running context.** Ivan has never seen the listing. He
receives an invitation from Alice's client `[12, dap.invite]` and accepts
`[13, dap.accept_invite]`. At that moment his client holds the spine from 0
and headers for every position whose audience excludes him: 2, 4, 6, 7, 8, 9
and 10. The stubs at 6 and 8 are members audience, and members means the
participants as of that position; Ivan was not one. His hidden count is 7.

**What the model hands him.** It does not stay 7. Because he joined a sale
that already had offers, Alice's client immediately sequences the model's
declared join disclosure `[14, dap.disclose]`, naming positions 6 and 8 to
him: the two offer stubs that were effective when he arrived. His hidden
count drops to 5, with gaps at 2, 4, 7, 9 and 10 — the three invitations
addressed to others, and the two private terms. He can now see that Bob
offered and that Carol offered. He cannot see either amount, and no
disclosure will give him one.

This is not a convenience. Without it Ivan would hold a header for o1 and
then meet Bob's replacement saying "o3 replaces o1", with no o1 in his view.
His fold would refuse it as `no_such_offer` while every other participant
recorded it as effective, and the property would fail. Replayed without the
disclosure, the trace leaves five such violations, and Ivan's is the first.

**What he is entitled to.** The anchor shows the listing with "Sale, you are
Inspector". Participants show Seller, two Buyers and himself. His offers show
o1 and o2 as open, both with no amount. The sale status is `open`. His Sale
affordances are empty: the Inspector role carries no Sale capabilities. His
Inspection affordance, in this fixture, is Request inspection from the moment
he joins — the harness package offers it to every participant without
condition, which a real package would not do.

**The one request.** Carol's request `[15, inspection.request]` names him.
His inspection view shows it from the request's own payload: offer o2,
requested by Buyer Carol. He can see that o2 exists, because the stub was
disclosed to him, but not what it is worth. He records his finding outside
this trace: the harness package declares a request kind and nothing else, so
there is no result event to sequence and no status that ever changes.

When Bob replaces his offer `[16, sale.offer]`, Ivan reads the stub as a
member and, holding o1 from the disclosure, shows o1 replaced and o3 open.
The terms `[17, sale.offer_terms]` are a header, so his hidden count becomes
6. The accept `[18, sale.accept]` and the ineffective accept
`[19, sale.accept]` are readable and he judges both exactly as Alice does.
The close `[20, sale.close]` is spine. At the end his offers read o1
replaced, o2 declined, o3 accepted — the same shape Alice sees, with every
figure withheld.

That is the honest summary of a late arrival under this model: **the same
shape, none of the numbers.**

**A pause.** Suppose Ivan's client cannot fetch the Inspection package
when it processes position 11. The client does not skip the attach or
guess. Interpretation stops with `Paused {at: 11, reason:
package_unavailable, last}`, where `last` is the view through position 10.
The screen shows the thread through 10, the anchor as of 10, and
"Interpretation paused at 11: a package this context uses is not
available". No affordances are offered past that point. When the package
arrives the client replays — in the landed implementation, from the genesis
every time, not from 11 — and the screen catches up. A pause is never
presented as a verdict on any event.

## Dana joins after the close

The views note's table stops at the close, so everything from here is this
note's own extension. The landed tests cover a late join of this shape but
not this exact continuation, so read the mechanism as verified and the
position numbers as illustrative.

**Invited as co-Seller.** After the sale closes, Alice invites her partner
Dana as a second Seller `[21, dap.invite]` and Dana accepts
`[22, dap.accept_invite]`. Alice's intention is that Dana can see how the
sale went.

**What arrives with her.** Dana's client receives the spine from 0: genesis,
listing, every invitation acceptance, the attach, the close, and her own
invitation at 21. It receives headers for every position whose audience
excluded her: the three invitations addressed to others (2, 4, 12), every
terms event, the counter, the inspection request, Alice's join disclosure to
Ivan at 14, and the members-audience stubs and accepts at 6, 8, 16, 18 and
19. Membership at join gives no retroactive access; the audience of an event
is set at its position, and Dana was not a member then. That is 14 hidden
positions.

She does not hold them for long. Dana has joined a sale that has offers, so
the model's join disclosure fires for her exactly as it did for Ivan: Alice's
client sequences `[23, dap.disclose]` naming the effective stubs and the
effective accept — 6, 8, 16 and 18 — leaving 10 hidden. Her sale status is
`closed`; the close is spine, so she knew the sale had ended before she could
see anything about it.

**What Alice can add, and what she cannot.** Alice taps Disclose, wanting to
show Dana how the sale went, including the amounts. **The model refuses.**
Its declared disclosure policy permits the listing, offer stubs, withdrawals,
accepts, the close, invitations and attaches. It **forbids disclosing
`sale.offer_terms`, `sale.counter` and the inspection request** — precisely
the events that carry the numbers. So Alice may add the ineffective accept at
19 and the three invitations at 2, 4 and 12, and nothing else. Dana's hidden
count settles at 6: both buyers' terms, Alice's counter, o3's terms, the
inspection request, and the disclosure act Alice sent Ivan.

Even if the policy allowed it, disclosure would not help: the Sale projection
withholds an offer's amount from anyone who is neither its author nor the
seller, and Dana is neither. She would receive the bytes and still read
`null`.

**After disclosure.** Dana's client replays and shows the newly readable
positions in their original places, not appended at 23. Her offers read o1
replaced, o2 declined, o3 accepted, `winner o3`, **with no figures at all**.
Her screen answers the three questions: this is the guitar sale, closed; she
can do nothing in the Sale model because it is closed; six positions remain
unreadable, and the screen says the audience was set before she joined.

That is the design's privacy claim doing real work against its owner's
intention. Alice is the seller, she holds `dap.disclose`, she is adding a
second Seller she trusts, and she still cannot hand over the prices. A reader
who wants that to be possible is asking for a different disclosure policy,
and should say so as a change to the model rather than to the foundation.

Had the Inspection package been unavailable during that replay, Dana's
client would have paused at 11 with the rebuilt projection through 10,
including the newly disclosed stubs, and said so. That projection is her view
under the visibility basis of 23, processed through 10; it is not her view as
of 10.

## What the model makes visible on the screen

The paths above are written so the constraints show. A client may soften
them in presentation; it may not hide them.

- **Participation is public inside the context.** Every member sees every
  other member as a context-scoped principal with a role. Carol sees Bob on
  entry; Bob learns a second Buyer exists when Carol's acceptance is
  recorded at 5.
- **Offer existence is public among the members at the time, and the model
  closes the gap for joiners.** A stub is readable by everyone who was a
  member when it was recorded, and tells them who offered and whether the
  offer was withdrawn or replaced. Someone who joins later would hold only
  its header, so the Sale model declares that the seller discloses every
  effective stub and accept to a joiner at their join, as Ivan and Dana show.
  That declaration is not optional decoration: without it the trace does not
  satisfy the property. The acceptance, not the stub, is what names the
  winner. Only the terms are private to author and seller, and the model's
  disclosure policy forbids disclosing them to anyone else.
- **The hidden count is shown.** Every screen states how many positions the
  viewer cannot read, as numbered gaps. A header says nothing about the kind
  of event it hides, so the client labels nothing it cannot establish from
  what the viewer can read.
- **Pauses are shown as pauses.** When a package or a disclosed dependency
  is missing, the screen stops at the last interpretable position and says
  why. A pause is never rendered as a refusal or a success.
- **One invitation per responder.** Joining is a request to a route, then an
  invitation, then an acceptance. The envelope alone joins nobody. A client
  may automate the invitation under a stated policy; it cannot skip it.
- **The audience is set at the position.** A late joiner sees the spine and
  any earlier event addressed to them, such as their own invitation, and
  nothing else from before they joined, until someone discloses. The screen
  says that this is why the positions are hidden.
- **A disclosure is itself a members event.** Every member sees that someone
  disclosed, which positions and to whom — never the payloads behind it. Bob
  and Carol both watch Alice hand Ivan his backlog at 14 without learning
  what it contained.
- **What may be disclosed is the model's decision, not the discloser's.**
  The Sale model names the kinds that may ever be handed on, and the private
  terms are not among them. A seller who wants to share a price cannot, and
  the projection would withhold it even if she could.
- **The anchor is composed by the client.** The referent's title, photo and
  status would come from an anchor over one or more contexts, which nothing
  in the spike implements. When the
  status says "Sold", the client attributes it to the context that decided
  it. If the same referent appears in another context, that context's
  status is shown separately, not merged.
- **Affordances are the model's, not the client's.** What a person can do is
  exactly what `observe.affordances` lists. A control the model does not
  offer is not drawn. An intent signed from a view that has since moved on is
  sequenced and judged at its own position like any other, as Alice's
  position 19 shows. Today that list is kind strings with no target, so a
  client still has to decide for itself which offer an Accept applies to; and
  the harness Inspection package offers its request to everyone at all times,
  including after the sale is decided, which is a gap in the fixture rather
  than a statement about the design.
