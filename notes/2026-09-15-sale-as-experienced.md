---
date: 2026-09-15
status: >-
  narrative companion to the views note's sale trace. Walks the same positions
  as five people would experience them in a general-purpose dap mobile client.
  It specifies the intended experience and the points where the model shapes
  it; it adopts no UI design, no layout and no visual language.
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
code for sales, bookings or clubs. It renders what a model's `observe`
projection exposes: an anchor for the referent, a thread of visible events,
the current state, and the affordances the viewer holds. When a package
attaches, the client fetches its presentation bindings and renders the new
kinds the same way. There is no per-application app to install.

Every screen element below names the `observe` field it renders. The fields
used are:

- `observe.anchor`: the referent's description as this context exposes it
  (title, ask, photo, status line) and the context it comes from.
- `observe.participants[]`: every current participant and their role. Public
  inside the context.
- `observe.thread[]`: the positions the viewer can read, in order, with
  payloads, plus a header for every position they cannot read.
- `observe.hidden_count`: how many positions in the thread are headers only.
- `observe.offers[]`: for the Sale model, one entry per offer stub, with
  `terms` present only when the viewer can see them.
- `observe.sale`: the sale's status (`open`, `decided`, `closed`) and the
  winning offer id once decided.
- `observe.inspection`: for the Inspection model, the open request if the
  viewer can see it.
- `observe.affordances[]`: the typed event constructors the viewer may emit
  now.
- `observe.paused`: absent, or the position and reason interpretation
  stopped.

A screen must let a newcomer answer three questions without help: what is
this about, what can I do now, and what can I not see and why. Those are the
comprehension criterion from the design note's goals. Each path below is
written so a reader can check that all three are answered at every step.

Positions are the ones in the views note's trace. A step is written
`[position, kind]`, where the position is the one the event eventually
occupies once recorded; Alice writes the listing before anything is
recorded, and it lands at position 1 after the genesis at 0. Audiences: S is the spine, every participant present and
future; M is members, the participants as of that position; otherwise the
named people.

## Alice sells a guitar

**Creating the listing.** Alice opens the app and taps New. The app asks for
a title, a description, an asking price and a photo. It does not ask what
kind of thing this is. Alice writes "Guitar, 1970s dreadnought", sets 800,
and adds a photo. The app signs this as a standalone listing event: a
referent tag, the description and a rendezvous route it will answer on
`[1, Listing]`. Nothing has been sequenced yet; the listing is bytes Alice
holds.

**Choosing a package.** The app offers to open a context around the listing.
Alice picks Sale from a short list of packages her client knows. The client
signs a genesis that adopts the listing as entry 1, pins the Sale package
and the single-writer sequencing profile, and grants Alice the Seller role
with the `dap.invite`, `dap.attach`, `dap.grant`, `dap.disclose` and
`dap.close` capabilities `[0, dap.genesis]`. Her client is the writer.

Alice's screen now shows `observe.anchor` (her title, ask and photo, with
"Sale, you are Seller" as the status line), `observe.participants[]` with one
entry, and `observe.affordances[]`: Invite, Attach package, Close. The thread
has two entries she can read and `observe.hidden_count` is 0.

**Publishing.** Alice taps Share. The app builds an envelope: the listing,
the genesis identity and the route. It is signed bytes with no audience rule;
the app hands it to whatever Alice chooses, a message, a link, a directory.
The envelope is not an event in the context. Alice's screen does not change.

**Join requests arriving.** Bob's client reaches the route. Alice's app shows
a join request: a context-scoped principal, no name unless Bob supplied one,
asking to become Buyer. Alice taps Invite. The client sequences a one-use
invitation for Bob `[2, dap.invite]`, visible only to Alice and Bob. When Bob
redeems it `[3, dap.accept_invite]`, `observe.participants[]` gains "Buyer"
and the thread shows the acceptance. The same happens for Carol
`[4, dap.invite]` `[5, dap.accept_invite]`. Alice's `hidden_count` is still
0: as Seller she can read every position so far.

Alice could instead have set a join policy on the route, "anyone reaching
the route becomes Buyer", and let her client issue invitations without
asking. The narrative keeps the manual path so each invitation is a visible
choice.

**Offers arriving.** Bob's offer arrives as two positions. The stub
`[6, sale.offer]` is visible to every member; the terms
`[7, sale.offer_terms]` are visible to Bob and Alice. Alice's
`observe.offers[]` shows o1 by Buyer Bob with `terms: 700`. Carol's offer
follows the same shape `[8, sale.offer]` `[9, sale.offer_terms]`, and Alice
sees o2 at 750. Her `observe.affordances[]` now lists Counter and Accept
against each offer.

**Countering.** Alice counters Bob's offer at 780 `[10, sale.counter]`. The
counter is visible to Alice and Bob only. `observe.offers[]` shows o1 as
"countered at 780" for Alice.

**Attaching Inspection.** Alice decides an inspection would help. She taps
Attach package and picks Inspection
`[11, dap.attach]`. The attach is spine: every participant, present and
future, sees the sale gain an Inspection model from position 12 onward. Her
client fetches the package and its presentation bindings. Nothing before
position 12 is reinterpreted.

**Inviting Ivan.** The Inspection package defines an Inspector role. Alice
invites Ivan `[12, dap.invite]`; he accepts `[13, dap.accept_invite]`.
`observe.participants[]` gains "Inspector". Carol's inspection request
`[14, inspection.request]` reaches Alice, Carol and Ivan; Alice's
`observe.inspection` shows it as open.

**A replaced offer.** Bob replaces o1 with o3 `[15, sale.offer]`
`[16, sale.offer_terms]`. The stub says o3 replaces o1; the terms say 780.
Alice's `observe.offers[]` shows o1 as replaced and o3 at 780.

**Accepting, twice.** Alice is on a slow connection. She taps Accept on o3,
and while that intent is still in flight her screen has not changed: her
view is still at 16, Accept is still an affordance on every open offer, and
she taps Accept on o2 as well, meaning to accept the higher one and
unsure which she tapped first. Her client signs both intents from the view
she had. The writer orders them: o3 first `[17, sale.accept]`, o2 second
`[18, sale.accept]`.

Position 17 is visible to every member. The fold checks only public state:
the stub o3 exists, is not withdrawn, is not replaced, the sale is open,
Alice holds `sale.accept_offer`. All true. `observe.sale` becomes
`decided, winner o3`. `observe.offers[]` shows o3 accepted and o2 declined.
Her affordances shrink to Close and Disclose; Accept and Counter are gone.

Position 18 is judged at its own position: the sale is already decided, so
it is ineffective. Her thread shows position 18 with "no effect: sale
already decided". Every member sees the same entry with the same reason,
because the decision at 17 and the state it changed are public. Nothing
was drawn that the model did not offer; the second tap was offered by a
view that had not yet learned the first tap's result.

Alice's screen answers the three questions here in the same way as
everyone's. What is this about: the anchor. What can I do now: Close or
Disclose. What can I not see: nothing, and `hidden_count` says 0.

**Closing.** Alice taps Close `[19, sale.close]`. The close is spine.
`observe.sale` becomes `closed`. `observe.affordances[]` for the Sale model
is empty. The anchor's status line reads "Sold", and the client attributes
it to this context.

## Bob buys the guitar

**Finding it.** Bob receives the envelope as a link. His app opens it and
renders the listing from the envelope's bytes: title, ask, photo. This is
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
this moment there is none, so `observe.hidden_count` is 0. `observe.anchor` shows the listing with "Sale,
you are Buyer". `observe.participants[]` shows Seller and Buyer.
`observe.affordances[]` shows Offer.

When Carol joins `[4, dap.invite]` `[5, dap.accept_invite]`, Bob sees a
second Buyer appear in `observe.participants[]`. He sees a header for
position 4 and `observe.hidden_count` becomes 1. He can read position 5.

**Offering.** Bob taps Offer and enters 700. His client emits two events:
the stub `[6, sale.offer]`, which every member sees, and the terms
`[7, sale.offer_terms]`, which Alice and Bob see. Bob's `observe.offers[]`
shows o1 with `terms: 700`.

Carol's offer arrives as a stub `[8, sale.offer]` and terms
`[9, sale.offer_terms]`. Bob sees o2 by the other Buyer, with no terms, and
`observe.hidden_count` becomes 2. The screen shows "another buyer has
offered; amount not visible to you".

**Being countered.** Alice's counter `[10, sale.counter]` reaches Bob.
`observe.offers[]` shows o1 countered at 780. His affordances now include
Replace offer and Withdraw.

**The package changes.** Alice attaches Inspection `[11, dap.attach]`. Bob's
client fetches the package and renders its kinds from position 12. Ivan
joins `[12, dap.invite]` `[13, dap.accept_invite]`; Bob sees the invite as
a header and the acceptance in the clear. `observe.participants[]` gains
Inspector. Carol's inspection request `[14, inspection.request]` is a
header to Bob. `observe.hidden_count` is now 4.

**Replacing.** Bob taps Replace offer and enters 780. Two events again: the
stub `[15, sale.offer]` saying o3 replaces o1, and the terms
`[16, sale.offer_terms]`. His `observe.offers[]` shows o1 replaced and o3
at 780.

**Winning.** Alice's accept `[17, sale.accept]` reaches every member. Bob's
`observe.sale` becomes `decided, winner o3`. His `observe.offers[]` shows o3
accepted at 780, because he can see the terms. The screen reads "Your offer
was accepted".

Position 18 arrives as an ineffective accept of o2. Bob's thread shows it
with "no effect: sale already decided". It does not change his state.

**Close.** `[19, sale.close]` closes the sale. Bob's affordances for the
Sale model are empty. The anchor reads "Sold, to you", attributed to this
context. `observe.hidden_count` is 4. The client shows four numbered gaps
at positions 4, 9, 12 and 14. The headers say nothing about what kind of
event each hides, and the screen does not guess.

## Carol makes an offer and loses

Carol's path is Bob's path in a different thread. The differences are what
she sees of Bob.

**Joining.** Carol finds the envelope, requests to join, is invited
`[4, dap.invite]` and accepts `[5, dap.accept_invite]`. On entry her client
receives the spine from 0 and a header for position 2, Bob's invitation.
She sees `observe.participants[]` with Seller and two Buyers, an empty
`observe.offers[]`, and `observe.hidden_count` 1.

**Bob offers first.** The stub `[6, sale.offer]` is visible to Carol: o1 by
the other Buyer. The terms `[7, sale.offer_terms]` are a header.
`observe.offers[]` shows o1 with no terms; `observe.hidden_count` is 2.

**Offering.** Carol offers 750 `[8, sale.offer]` `[9, sale.offer_terms]`.
Her `observe.offers[]` shows o1 (other buyer, terms hidden) and o2 (hers,
750).

**Watching a hidden counter.** Alice counters Bob `[10, sale.counter]`.
Carol receives a header. `observe.hidden_count` becomes 3. Her thread shows
"one position you cannot read" between her offer and the next visible
event. She cannot tell what kind it was.

**Asking for an inspection.** The Inspection package attaches
`[11, dap.attach]`; Carol's client fetches it. Ivan joins
`[12, dap.invite]` `[13, dap.accept_invite]`. Carol's affordances gain
Request inspection. She taps it against her own offer
`[14, inspection.request]`. Alice, Carol and Ivan can read it.
`observe.inspection` shows it as open for Carol.

**Bob replaces his offer.** The stub `[15, sale.offer]` is visible to Carol:
o3 by the other Buyer replaces o1. The terms `[16, sale.offer_terms]` are
a header. `observe.hidden_count` is now 5. Her screen shows o1 replaced by
o3, amount not visible.

**Losing.** Alice accepts o3 `[17, sale.accept]`. The fold runs on public
state for Carol exactly as for everyone: o3 exists, not withdrawn, not
replaced, sale open, Alice is Seller. `observe.sale` becomes
`decided, winner o3`. Carol's `observe.offers[]` shows o2 declined and o3
accepted, amount not visible. The screen reads "Another offer was accepted".
Her `observe.inspection` shows the request as moot; Request inspection
leaves her affordances.

**Position 18 from Carol's side.** Alice's accept of o2 arrives. Carol can
read it: it names her offer. The fold refuses it for the same public reason
it refused it for Alice: the sale is already decided. Carol's thread shows
"Seller attempted to accept your offer; no effect: sale already decided".
This is the position the views note calls the point of the trace. Carol
judges the event exactly as Alice does, because everything the judgement
depends on is in her view.

**Close.** `[19, sale.close]`. The anchor reads "Sold", attributed to this
context. `observe.hidden_count` is 5: numbered gaps at 2, 7, 10, 12 and 16,
with no kind shown for any of them.

## Ivan inspects

**Invited into a running context.** Ivan has never seen the listing. He
receives an invitation from Alice's client `[12, dap.invite]` and accepts
`[13, dap.accept_invite]`. On entry his client receives the spine from 0
and headers for every position whose audience excludes him. That is
positions 2, 4, 6, 7, 8, 9 and 10. The stubs at 6 and 8 are members
audience, and members means the participants as of that position; Ivan was
not one. `observe.hidden_count` is 7.

**What he is entitled to.** `observe.anchor` shows the listing with "Sale,
you are Inspector". `observe.participants[]` shows Seller, two Buyers and
himself. `observe.offers[]` is empty: the offers were made before he
joined. `observe.sale` is `open`. His Sale affordances are empty: the
Inspector role carries no Sale capabilities. His Inspection affordances are
empty too, until a request exists.

**The one request.** Carol's request `[14, inspection.request]` names him.
`observe.inspection` shows it from the request's own payload: offer o2,
requested by Buyer Carol. He cannot read the stub at 8, so the screen says
"offer o2; details unavailable to you". It does not say when the offer was
made, because nothing he can read establishes that.
`observe.affordances[]` gains Record result. He records his finding (outside this trace). He never sees the
amount of the offer he inspected. When Bob replaces his offer
`[15, sale.offer]`, Ivan can read that stub: he is a member now. It says
o3 replaces o1, and Ivan holds only a header for o1, so his
`observe.offers[]` shows o3 as open and nothing about o1. The terms
`[16, sale.offer_terms]` are a header, and `observe.hidden_count` is 8. The
accept `[17, sale.accept]` and the ineffective accept `[18, sale.accept]`
are readable, and the close `[19, sale.close]` is spine.

If Alice wants Ivan to see the offer he is inspecting, she discloses
position 8 to him. Nothing in the model does that for her; the screen shows
the gap.

**A pause.** Suppose Ivan's client cannot fetch the Inspection package
when it processes position 11. The client does not skip the attach or
guess. `observe.paused` becomes `{at: 11, reason: package unavailable}`.
The screen shows the thread through position 10, the anchor as of 10, and
"Interpretation paused at 11: a package this context uses is not
available". No affordances are offered past that point. When the package
arrives, interpretation resumes from 11 and the screen catches up. A pause
is never presented as a verdict on any event.

## Dana joins after the close

**Invited as co-Seller.** After the sale closes, Alice invites her partner
Dana as a second Seller `[20, dap.invite]` and Dana accepts
`[21, dap.accept_invite]`. Alice's intention is that Dana can see how the
sale went.

**Before disclosure.** Dana's client receives the spine from 0: genesis,
listing, every invitation acceptance, the attach, the close, and her own
invitation at 20. It receives headers for every position whose audience excluded her:
the three invitations addressed to others (2, 4, 12), every terms event,
the counter and the inspection request. It also receives only headers for
the members-audience stubs and accepts at positions 6, 8, 15, 17 and 18,
because membership at join gives no retroactive access; the audience of an
event is set at its position and Dana was not a member then.

So Dana's `observe.thread[]` is the spine, her invitation at 20, and
headers.
`observe.hidden_count` is 13. `observe.sale` is `closed`; the close is
spine, so she knows the sale ended. She does not know who won or what was
offered. `observe.offers[]` is empty. Her screen answers the three
questions: this is the guitar sale, closed; she can do nothing in the Sale
model because it is closed; she cannot see 13 positions because their
audience was set before she joined, and the screen says that.

**Disclosure.** Alice taps Disclose, picks Dana, and selects the positions
she wants Dana to read: the stubs and accepts, Bob's terms and the counter.
Her client checks the dependencies and includes them. Alice sequences
`[22, dap.disclose]` naming positions 6, 7, 8, 10, 15, 16, 17 and 18 to
Dana. The disclose is visible to Alice and Dana.

**After disclosure.** Dana's client replays from position 6, the earliest
newly visible position, with the original order and the semantic
environment active at each position. Position 11's attach is spine, so the
replay already had it. Dana's `observe.thread[]` now shows those positions
in their original places, not appended at 22. `observe.offers[]` shows o1
at 700 countered at 780, o2 with no terms, o3 at 780 accepted.
`observe.sale` still reads `closed`, now with `winner o3`.
`observe.hidden_count` drops to 5: the invitations, Carol's terms and the
inspection request, which Alice did not disclose.

Dana's screen marks the disclosed positions as "disclosed to you at 22".
Anyone who asks the client for the view as of position 21 gets the earlier
one, with 13 hidden positions.

Had the Inspection package been unavailable during that replay, Dana's
client would have paused at 11 with the rebuilt projection through 10,
including the newly disclosed offers, and `observe.paused` would say so.
That projection is her view under the visibility basis of 22, processed
through 10; it is not her view as of 10.

## What the model makes visible on the screen

The paths above are written so the constraints show. A client may soften
them in presentation; it may not hide them.

- **Participation is public inside the context.** Every member sees every
  other member as a context-scoped principal with a role. Carol sees Bob on
  entry; Bob learns a second Buyer exists when Carol's acceptance is
  recorded at 5.
- **Offer existence is public among the members at the time.** A stub is
  readable by everyone who was a member when it was recorded, and tells
  them who offered and whether the offer was withdrawn or replaced. Someone
  who joins later holds only its header until it is disclosed, as Ivan and
  Dana show. The acceptance, not the stub, is what names the winner. Only
  the terms are private to author and seller.
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
- **The anchor is composed by the client.** The referent's title, photo and
  status come from `observe.anchor` of one or more contexts. When the
  status says "Sold", the client attributes it to the context that decided
  it. If the same referent appears in another context, that context's
  status is shown separately, not merged.
- **Affordances are the model's, not the client's.** What a person can do is
  exactly `observe.affordances[]`. A control the model does not offer is not
  drawn. An intent signed from a view that has since moved on is sequenced
  and judged at its own position like any other, as Alice's position 18
  shows.
