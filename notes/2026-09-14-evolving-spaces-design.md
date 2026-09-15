---
date: 2026-09-14
updated: 2026-09-15
status: >-
  draft design for dap. Defines the objects, the foundation (genesis, system
  namespace, two-layer authority, crystallization), semantics, authority,
  boundaries and invariants. View consistency and transition safety are
  hypotheses tested by the companion notes' spikes. No implementation adopted.
views: notes/2026-09-14-one-series-many-views.md
ordering: notes/2026-09-14-ordering.md
---

# Evolving Spaces: minimal design for situational applications

## Thesis

An **evolving space** is a bounded *semantic interaction* embedded in an
unbounded, unstable real-world situation.

People need a legible thing to coordinate around — a sale, trip, claim,
project, search, game, hospital episode — but the social and informational
boundary around that thing is never stable. Participants change; each sees a
different scope; private or specialized sub-interactions form; duplicates
converge; one interaction produces several others. This continues the problem
posed in *Workspaces with Soft Edges*: support fluid discovery and
participation while preserving the integrity and privacy of shared
work.[^softedges]

The design keeps each computational context small and crisp, while making it
cheap to create, extend, connect, and retire contexts.

The substrate is:

> **signed typed events + immutable semantic definitions + one order per
> context + event audiences + deterministic folds that agree across views**

There is no separate application API. User actions, administrative changes,
invitations, semantic extensions, disclosures, scope transfers and
cross-context imports are all events.

A conventional "app" is not one immutable deployed program. It is the
**version-pinned semantic environment accumulated in a participant's view of
an interaction so far**. Participants need compatible interpretations of
shared facts, not identical private state or identical installed models.

---

## 1. Core objects

### Referent

A **referent** is the legible thing the interaction is about: *this guitar*,
*our Italy trip*, *the kitchen renovation*, *this claim*. Referents help
people and agents orient; they do not define computational or permission
boundaries. In this phase a referent is an opaque tag with no resolution
scheme; recognizing that two tags name one thing is an explicit act (§9).

### Event

An **event** is a signed typed assertion or attempted transition. It carries
at minimum an event-kind identity, a payload conforming to that kind's schema,
an actor, references or provenance as needed, and enough semantic identity to
determine how it is to be interpreted.

An event may exist **standalone** — signed, published somewhere, belonging to
no context — or **sequenced** — bound by a context's entry to a position and
predecessor. A sequenced intent also binds the context's genesis, an action
identity for exact retry, and the semantic binding it expects. An event's
audience is derived under pinned rules; it is never a recipient list chosen by
the author.

### Context

A **context** is an explicitly governed scope of decisions: one committed
history establishing precedence within that scope, and declared ways for facts
and decision rights to cross its boundary. Its scope names the model instances,
the state or resources they govern, who may act, and which commitments it may
finalize. It has a stable identity — its genesis — and everything else about
it is derived from its ordered events: participation, authority, audiences,
semantic environment, state.

The test for a boundary: **can each side finalize its permitted decisions
from its own history and explicit immutable imports, without an unrecorded
check of the other side's current state?** A shared exclusive right — to sell
this guitar once, a building's capacity, a budget — needs one owner,
non-overlapping allocations, or an explicit joint protocol. Topic, causal
connection, participant list and hosting do not determine the boundary, and a
context need not be the smallest possible scope.

A context requires no resident agent; assistants are ordinary principals.

### Sequence

A context has one **logical sequencing authority** establishing a total order
over its committed events, with dense positions and an authenticated
predecessor chain:

```text
e0 ≺C e1 ≺C e2 ...          Q(n+1) = fold(Q(n), e(n+1))
```

Order does not emerge from signatures or folds; the genesis pins a
**sequencing profile** saying how the next position is chosen and when it is
final. The mechanism, its trust and failure assumptions, and how the
assignment moves are the ordering note's concern. No global order across
contexts is required.

Sequenced and effective are distinct. An event can hold a position and be
ineffective. Missing content or an unsupported runtime *pauses*
interpretation; a pause is never a verdict.

### Audience and view

An event's **audience** is the set of principals permitted to read its
complete payload. Its initial audience is derived from the preceding state
and the signed event under an already active, pinned audience rule; later
authorized `disclose` events may extend it; it never shrinks.

At frontier `n`, participant `p` sees `V(p,n)`: the subsequence through `n`
whose audiences include `p` as of that frontier, positions preserved. Hidden
positions carry authenticated commitments and linkage sufficient to verify
the chain without their payloads.

Each participant folds their own view with the same pinned programs for the
models they share. A seller's room and a buyer's thread are two renderings of
one series; neither is stored. The required property is

```text
fold(V(p,n)) = observe(p, fold(S[0..n]), n)
```

where `observe` is a model-declared projection of state, outcomes, bindings
and affordances, and **presentation bindings may render only what `observe`
exposes** — so nothing the application shows can escape the property. The
complete-series fold is a specification oracle, not an access grant. The
views note carries the trace, the use cases, the authoring cost and the spike.

### Perspective

A **perspective** is the set of referents, contexts and views visible and
relevant to one actor. A view is a precise subsequence within one context; a
perspective spans contexts. No global situation graph is required.

---

## 2. The foundation

Everything an application can do rests on a small fixed set of things the
system itself defines. This section is the single statement of what those
are.

### Names and the system namespace

Every kind, model, capability, role and presentation artifact has a
**logical name** — reverse-DNS, dot-separated — and a **content id**. The
content id is the truth (§7); the name is what authors write in bindings,
audience rules and capability predicates, and what humans and agents read.
Every name in a declaration resolves through the view's pinned environment to
exactly one content id; a name that resolves to two is a binding error
surfaced at attach, never at fold time.

The prefix **`ai.generalbusiness.dap.`** is the **system namespace**. Only the
foundation package pinned in a context's genesis may define names under it;
the foundation fold refuses any application attach that declares a name with
that prefix. Applications use their own prefixes (`com.example.sale.offer`).
Namespacing therefore does three jobs: it marks what the foundation owns and
an application cannot shadow; it makes bootstrapping legible (the first
events in any context are all system kinds); and it keeps authored
declarations readable. It does not supply identity — collisions are
impossible by content id and merely *illegal* by name.

Below, system names are written without the prefix: `dap.attach` means
`ai.generalbusiness.dap.attach`.

### Genesis

A genesis is entry 0 of a context: a signed system event, `dap.genesis`, that
pins — completely and in one place —

1. the **foundation package** by content id: the system kinds, their folds,
   audience rules and capabilities;
2. the **runtime profile** by identity: the expression language, numeric
   rules, bounds and any helper contracts under which every fold in this
   context runs;
3. the **sequencing profile**: ordering-control keys or validator
   configuration, commitment verification rules, fault assumptions, and the
   transition rule for changing the assignment;
4. the **initial assignment**: the writer key or validator set for epoch 0;
5. **initial grants**: the capabilities held at position 0 — at minimum who
   may `dap.attach`, `dap.invite` and `dap.grant`, otherwise nothing can
   happen;
6. **initial bindings**: application packages attached at genesis, with their
   binding resolutions (may be none);
7. **origin events**: zero or more standalone signed events adopted, in
   declared order, as entries 1..k, with their bytes retained and actor
   signatures verified;
8. **referents**.

The runtime profile is a genesis pin so that a context's history is
replayable forever under one language; **which language** is an open decision
in this phase. The bounded JSONata subset carried by atseq and Tailapps is the
incumbent with two implementations of evidence; the foundation must pin *a*
profile identity before any fold can be authored.

### System kinds

The foundation package defines these kinds. Each row gives the audience rule
the foundation declares for it and the capability its actor must hold. These
are not per-application choices.

| Kind | Audience | Requires | Effect |
|---|---|---|---|
| `dap.genesis` | everyone | — | entry 0; pins items 1–8 above |
| `dap.attach` | everyone, unless the event names a narrower set | `dap.attach` | activates packages and their binding resolutions from `n+1` |
| `dap.invite` | inviter, invitee | `dap.invite` | creates a one-use invitation capability carrying a role or grants |
| `dap.accept_invite` | everyone | the invitation capability | the actor becomes a participant with the invited grants |
| `dap.grant`, `dap.revoke` | everyone | `dap.grant` | capability or role change; authority is shared state |
| `dap.disclose` | recipients, actor | `dap.disclose` | extends the audience of named earlier positions |
| `dap.admit` | as declared by the admitting model | `dap.admit` | admits an external assertion as a local event of a named kind |
| `dap.observe` | everyone | `dap.observe` | an ambient fact — time, a draw, a measurement — asserted by a designated actor |
| `dap.close` | everyone | `dap.close` | the context stops admitting application events |
| `dap.scope.release` | everyone | `dap.scope.release` | freezes or releases named rights for a described transition |
| `dap.scope.activate` | everyone | — | first entry of a destination context binding a release |
| `dap.seq.request` | everyone | `dap.seq.request` | application authority *asks* for an ordering change |
| `dap.seq.assign`, `dap.seq.seal` | everyone | ordering-control keys | *enact* an assignment change or seal a head |

Two defaults follow from the views property and are deliberate:
**participation and authority are visible to everyone** (`accept_invite`,
`grant`, `revoke`), because `everyone` in every other rule is computed from
them and a hidden revocation is a consistency failure by definition. Private
authority structures need separate contexts. And **a narrow `dap.attach` is
legal but is the author's risk**: its kinds' audiences are bounded by the
attach's audience, and the consistency checker is what catches a narrow
attachment that changes a shared outcome.

The foundation itself evolves by `dap.attach` of a new foundation version
under the old foundation's rules — the same mechanism as everything else, and
the reason the system namespace is a prefix rather than a fixed list.

### Two layers of authority

There are two authority systems, and they are kept apart on purpose:

- **Ordering control** is held by the keys or validators named in the
  sequencing profile. It enacts assignment, handover and sealing through
  `dap.seq.assign` / `dap.seq.seal`. Every reader verifies the ordering-control
  chain — genesis plus every `dap.seq.*` entry — **without running any
  application fold**, because those entries are system kinds with audience
  `everyone` and self-contained proofs.
- **Application authority** is folded from grants. It can *request* an
  ordering change (`dap.seq.request`) and the profile's keys may honour it; a
  profile may delegate enactment to a folded capability, but then readers
  must fold to verify, and the default profile does not.

Between them sits **transport admission**. The sequencer accepts a submission
only with a **transport credential**: issued by the serving party — which runs
the fold and knows who participates — to current participants, or the
one-use invitation capability itself for exactly one `dap.accept_invite`. The
sequencer never folds; the serving party bridges folded participation to
kernel admission. In the first trusted profile the sequencer and serving party
are one host, and the distinction is a contract, not a deployment.

### Crystallization and origin

A context begins when someone signs a genesis. Two mechanisms connect that to
events that existed before it, and together they cover both "join my room"
and "respond and tear off":

- **Adoption.** A genesis may name standalone signed events as origin entries
  1..k. Any holder of a standalone event may adopt it; the same event can be
  entry 1 of many contexts. Adopted origins are visible to every participant.
- **Invitation.** A standalone event may carry an invitation capability into
  an already-existing context — the listing is published *from* the seller's
  context and says "redeem this to become a Buyer here."

So an initiator who wants one room with private threads crystallizes first
and publishes an event carrying an invitation; responders redeem it and their
responses are sequenced in that context. An initiator who wants tear-offs
publishes an event carrying only a rendezvous route; either party may
crystallize a context adopting the initiating event and the response as
origins, and invite the other. Which happens is decided by what the published
event carries, not by a framework switch.

The **published copy** of an initiating event is ungoverned bytes — whoever
has it has it; discovery and transport are outside the semantic model. The
**adopted copy** is governed by the context's audience rules. They are the
same signed bytes; only the second has a position.

---

## 3. Semantics: packages, artifacts, bindings, environments

Reusable semantics are published as immutable **packages** — the unit of
authorship, publication, reuse, review and trust. A package may contain
**kinds** (payload schemas), **models** (state schema, accepted kinds, folds,
audience rules, `observe`, invariants, affordances), **capabilities and
roles**, **presentation** (renderers, composers, views), and **bindings** —
typed relationships between artifacts, first-class rather than implicit:

```text
Offer              handled-by   Sale
Offer              requires     sale.make_offer
Offer              rendered-by  OfferCard
InspectionResult   handled-by   Inspection
InspectionResult   handled-by   Sale
```

Models declare which kinds they handle. Several models may consume one event,
each in its own state namespace; cross-namespace reads are declared and
evaluated against the preceding state; updates commit atomically. When
attaching creates ambiguity — two handlers for one kind, two audience rules,
two renderers — **the `dap.attach` event carries the resolution**: exactly one
audience policy per kind, a declared order for handlers, and the renderer
binding. An attach with unresolved ambiguity is ineffective. Attaching a
handler can never widen a kind's audience.

Four questions about an event are distinct: **known** (its kind resolves in
the view), **sequenced** (kernel admission; has a position), **authorized**
(pinned rules permit this actor's attempt here), **effective** (a handling
model accepts the transition). Effectiveness is per handling model. An
unhandled kind is a verdict; an unavailable definition is a pause.

An intent whose **expected binding is no longer active** at its position is
ineffective with `stale_binding`, never rewritten. Unrelated private
attachments do not change a shared kind's binding and so do not stale shared
acts. (Carried from atseq, where it was proven.)

The active, fully resolved composition in a view is its **semantic
environment**: an immutable closure of package and artifact content ids,
bindings and the runtime profile, derived from genesis and the effective
`dap.attach` events visible in that view. There need not be one environment
for everyone in a context. Failure to fetch a package pauses the viewer; it
does not remove them from an audience.

Presentation is a separate **presentation environment**: packages publish
default bindings; clients may replace non-semantic presentation. A renderer
binds only to a model's `observe` projection.

---

## 4. No separate API

The model derives the actions available to a principal:

```text
state:      current_offer = #23    sale_status = open
affordances(seller):   RejectOffer(#23)   AcceptOffer(#23)   CounterOffer(#23, amount=?)
```

Affordances are typed event constructors. A human client binds them to
controls; an agent sees the same constructors and emits the same events.
Framework operations are the system kinds of §2. "No separate API" means one
*semantic* vocabulary; discovery, submission, fetching and query still need
transport interfaces.

---

## 5. Lifecycle: semantics can precede the space

```text
standalone initiating event
        │  carries semantics + invitation capability and/or rendezvous route
        ▼
responses
        │  ├──► redeem invitation → sequenced in the initiator's context
        │  └──► reach the rendezvous → either party crystallizes, adopting both
        ▼
sequenced interaction
        ├── attach packages      ├── invite, grant, disclose
        ├── admit assertions     ├── spawn, split, join
        └── close, become inert, or continue as something else
```

This supports intent-first interaction: an actor publishes a structured
intention without first entering a provider's application.[^vrm] The
rendezvous route should let a responder use an interaction-specific identity
and disclose a persistent one only when required — the abstract pattern of
Qredo's unpublished Rendezvous Protocol.[^qrp]

Whether several responses become **views of one context** (private threads,
one shared decision) or **separate contexts** (independent order, trust and
lifecycle; the same origin adopted by each) is decided by what the initiating
event carries. Separate contexts do not enforce a shared constraint merely by
sharing a referent; they need a common decision authority or a coordinating
context. Choose separate contexts when independence is wanted, or when the
view-consistency property cannot be met at acceptable disclosure cost.

---

## 6. Evolving semantics

A view may begin as `Search + Candidate + Comment` and accumulate `+ Sale
+ Negotiation + Inspection + Escrow`:

```text
H1 ── e1 e2 e3 ── attach(Sale) ──► H2 ── e4 e5 ── attach(Inspection) ──► H3
```

Every committed event has an exact answer to *what semantics applied here?*
`dap.attach` at `n` is judged under the preceding environment and authority;
if effective it activates from `n+1`, with its state initialization or
migration, bindings and outcome as one atomic transition. An ineffective
attach leaves the old environment. There is **no backfill**: a model never
applies to events before its activation, and later disclosure of an old attach
reveals its original boundary, not today's version.

---

## 7. Versioning

Immutable content identity for truth; logical names and human versions for
discovery:

```text
logical name:  com.example.market.sale     human version: 2.4.1     content id: <hash>
```

A published environment pins the exact closure, like a lockfile. Rules:

1. **Old events never change meaning.** Replay uses the bindings and runtime
   active at their positions; disclosure changes who can reconstruct that
   meaning, not its effect.
2. **Semantic upgrades activate at an exact ordered boundary.**
3. **Event kinds are immutable contracts.** New versions get new content ids
   under the same logical name; a later model may handle several generations.
4. **Model migration is explicit and deterministic**, pinned at the boundary.
5. **Large discontinuities may create a new context.**
6. **Presentation versions are independent** unless they affect meaning.
7. **Grants pin exact capability content ids.** A newer package never
   silently enlarges authority.
8. **Signed attempts preserve their expected binding** (§3, `stale_binding`).
9. **Replay retains the complete required closure.** A content id identifies;
   it does not keep bytes, runtime or keys available.

---

## 8. Identity, access and authority

A **principal** is the identity that signs events. No global identity system
is required. Human-friendly identifiers are discovery mechanisms: `invite
you@example.com as Buyer` resolves to an existing principal or delivers a
one-use invitation capability whose redemption binds a signing principal to
the pending grants.[^nip05]

Two questions are never conflated: **which events may this principal read at
this frontier** (audience policy, enforced by the serving party or an
encryption protocol) and **what events may this principal cause to become
effective** (application capability). One context-wide decryption key cannot
enforce different audiences.

A **capability** is semantic authority scoped by kind, model, state and payload
predicates; a **role** is a named bundle of capabilities, and stays optional:

```text
com.example.sale.withdraw_own_offer:
    permits com.example.sale.WithdrawOffer
    when offer.author == actor and sale.status == open

role Buyer:   sale.make_offer, sale.withdraw_own_offer
role Seller:  sale.accept_offer, sale.reject_offer
```

Grants and revocations are `dap.grant` / `dap.revoke` events, visible to
everyone (§2), folded into authority state — so *was Bob authorized to make
event #42 when it was committed?* is determinate for every viewer. Refusing an
act must not disclose its private payload.

### Disclosure

Role membership is evaluated when an event's initial audience is set; joining
later reveals nothing earlier. `dap.disclose{positions, to}` extends the
audience of past events; it is visible to its recipients and its actor, and
to nobody else unless further disclosed. The recipient may need to rebuild
from the earliest newly visible position with original order and semantic
boundaries, and the disclosure must carry the dependencies needed to
interpret those events — attachments, grants, prior decisions. Otherwise the
recipient pauses, or consumes a separately typed summary under an explicit
attestation policy; a summary is not replay. An as-of query before the
disclosure keeps the earlier audience, so caches identify both their verified
prefix and their visibility basis. **How dependency completeness is checked**
— by the discloser's client, by the serving party, or by the recipient's
pause — is the one open decision here.

---

## 9. Boundaries and composition

Three things are kept separate: **causal structure** (what an act depends on;
new links can connect existing contexts), **decision scope** (which
transitions share precedence and which rights they may exercise; changed only
by explicit spawn, split, delegation or join), and **sequencing assignment**
(which keys may commit the next entries; changed by authorized handover
without changing scope or identity).

Where boundaries can be drawn:

| Activity | Possible boundary | Shared decision that still needs one owner |
|---|---|---|
| Inspection during a sale | separate context returning a signed result | accepting an offer stays in the sale |
| Several buyer negotiations | private views of one sale, or separate negotiations returning proposals | the right to sell once cannot be copied into every negotiation |
| Bookings for different rooms | separate room contexts if resources are independent | building-wide capacity needs an allocator |
| Independent project tasks | each gets a bounded budget and returns a result | reclaiming budget needs a protocol |
| Two projects sharing a budget | separate proposals with one allocator, or joined allocation scopes | concurrent spending is judged against one budget |

A late participant or a private conversation usually needs only a different
view. Two activities with identical participants may still deserve separate
scopes. The criterion is semantic and declared, not a graph cut.

### Crossing a boundary

Contexts interact through explicit signed **assertions** —
`{source_context, source_head, referents, statement, provenance, signature}`
— and three operations stay distinct: **link provenance** (reference an
external act; no local effect, no authority), **admit a result**
(`dap.admit`: an authorized local event imports a statement from an exact
source prefix; its effect occurs at the import's position; the source is
never live-read), and **join scopes** (transfer future responsibilities into
one order with explicit reconciliation).

Invariant: **a view's canonical state depends only on its authenticated
visible history — including disclosures and admitted assertions — and pinned
immutable definitions.** A private context can export "transport arranged"
without its deliberation. Whose assertions a model admits is that model's
folded rule; **whose attestation a destination trusts in a scope transfer is
named in the destination's genesis** — trust is pinned, not inferred. A
signature proves origin, not hidden premises.

The CTEG graft is the closest formal analogue: it connects a parent event to a
completed child graph's root while keeping the child's construction
opaque.[^cteg] `dap.admit` is the operational counterpart; it never
interleaves two logs and never establishes joint authority.

### Changing a boundary

| Operation | Decision scope | Sequencing |
|---|---|---|
| **Spawn** | child gets a declared mandate; parent keeps its responsibilities | child: own genesis and assignment |
| **Split** | `dap.scope.release` at the source; `dap.scope.activate` at the destination against verified release evidence | distinct contexts, independent orders |
| **Join** | each source releases to one agreed destination with reconciliation rules | destination orders the combined *future* |
| **Move** | unchanged | `dap.seq.assign` from an exact head |
| **Import / present together** | `dap.admit`, or render several histories side by side | unchanged |

What must hold: a release is verified effective — or attested by a principal
the destination genesis names — before activation; an exclusive right is never
live in two places; old proposals are not retargeted; a join orders the
future only; and release-then-activate may *block*, because a timeout cannot
restore source authority while delayed activation remains possible. The
protocols and failure cases are in the ordering note.

---

## 10. Minimal invariants

1. **Every event is typed and signed.**
2. **Every effective transition uses exactly pinned model, binding and
   runtime semantics.**
3. **Each context's sequencing profile establishes one committed order under
   stated fault assumptions; views preserve that order.**
4. **No global order across contexts is required.**
5. **Folds and migrations are deterministic; time, randomness and external
   facts enter as `dap.observe` events.**
6. **Sequenced does not imply effective; unavailable interpretation supplies
   no verdict.**
7. **Semantic changes are explicit ordered events and never reinterpret
   history.**
8. **Authorization is derived from ordered grants and revocations and pinned
   capability content ids.**
9. **Audience and application authority are distinct; both obey pinned
   rules.**
10. **Cross-context state enters only through explicit `dap.admit`.**
11. **Contexts may overlap around shared referents without any claiming the
    whole situation.**
12. **The same affordances drive humans and agents; there is no parallel
    API.**
13. **Published reusable semantics and one-off generated semantics use one
    mechanism.**
14. **A context may begin late and end early.**
15. **Audience grows only through explicit `dap.disclose`; replay preserves
    original positions.**
16. **A view has every dependency of its visible outcomes, including
    semantics and authority.**
17. **Folding each view agrees with the complete-series fold on `observe`,
    and presentation renders only `observe`.**
18. **Scope transfers preserve prior outcomes and never duplicate exclusive
    authority; sequencing moves preserve the committed prefix.**
19. **Ordering control is verifiable from system-kind entries alone, without
    any application fold.**
20. **Only the pinned foundation defines names under
    `ai.generalbusiness.dap.`.**

Invariants 16–18 are hypotheses until the companion spikes test them.

---

## 11. Precedents

Three earlier implementations share this lineage. They are precedents, not a
choice of Git, atproto, Nostr, MLS, SQL, JSONata or a renderer.

- **Gitseq** (`8e77fc25`): the boundary between authenticated order and
  application interpretation; a bounded, pure, versioned native-helper design
  (specified, not implemented).[^gitseq]
- **Atseq** (`e5856bd9`): a completed, independently reviewed spike with
  retained definitions, activation at an exact boundary, unchanged signed
  retries with `stale_binding`-style refusal, atomic projection/frontier
  updates and offline reconstruction. It did not test private subsequence
  folds or migrations; its measured full-prefix costs argue for cold replay as
  an oracle with incremental paths measured separately.[^atseq]
- **Noseq** (`1c158d80`): bounded confidentiality and recovery investigations
  that make retained decryption inputs, historical authority and serving trust
  explicit. No completed confidential runtime; its rule that local resource
  failures are never application verdicts is adopted here.[^noseq]

---

## References

[^softedges]: Hugh Pyle, [*Workspaces with Soft Edges*](https://cabezal.com/ppt/soft_edges.pdf) (2001), especially pp. 1 and 3. Motivation, not a specification of subsequence folds.

[^vrm]: Doc Searls, [*UCP needs VRM*](https://projectvrm.org/2026/08/22/ucp-needs-vrm/) (2026).

[^cteg]: Simon Foldvik, [*Causal-Temporal Event Graphs*](https://arxiv.org/html/2604.17557v1), arXiv:2604.17557v1 (2026), §2.2, §3.1, §4. Opaque construction is not confidential payload; no view-consistency result follows.

[^nip05]: [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md). Identification and discovery, not proof of a person or of authority.

[^qrp]: Qredo Rendezvous Protocol, unpublished prior work; only the abstract pattern is retained.

[^gitseq]: Gitseq [architecture](../../gitseq/docs/reference/architecture.md), [stable extensions draft](../../gitseq/notes/2026-08-27-jsonata-ddl-stable-extensions.md), [adoption assessment](../../gitseq/notes/2026-09-04-tailapps-jsonataddl-adoption.md), at `8e77fc25519b62b76ec89b0a2fb1311d92fa0baa`.

[^atseq]: Atseq [spike completion](../../atseq/notes/2026-09-06-atseq-spike-completion.md), [evolution](../../atseq/docs/evolution.md), [folder](../../atseq/src/runtime/folder.ts), at `e5856bd9c538b35c2dce4e87d51800f1eaa090f9`.

[^noseq]: Noseq [protocol candidate](../../noseq/docs/protocol-v0.md), [confidentiality and recovery](../../noseq/docs/confidentiality-and-recovery.md), [Atseq assessment](../../noseq/notes/2026-09-07-atseq-final-assessment.md), at `1c158d8044cd53ceed5cd191f1f423613c3c571e`.
