# T3 obligation contract, frozen before fixtures

Baseline: main `9c4e04e52ca9f16d3014c9d7d79a148bd039123e`.
Request: dap #7441 (`0bd3df1c`). No T3 fixture has run when this file is committed.

## Form and authority

A model declares `then oblige <role> to <act> [within <observed clock>]`.
An effective guard or an explicitly listed effective system trigger creates a
folded record with a stable id, its source position and model, the role, an act
kind and declared input, blocked dependent kinds, and an optional deadline.
A participant's performing event names the record in `payload.obligation`.
The model's declared matcher checks its kind and input; the foundation checks
the record is open and the actor holds every capability defining its role.
Normal authority for the act is checked independently. An obligation grants
nothing. Every role holder sees the card, including one who lacks the act's
capability. Only an effective matched act fulfils it; duplicate performance is
refused. Exact-payload matching is the default; a model may declare a recipe
matcher pinned in its descriptor identity.

Time means a public, effective `dap.observe` fact `{clock: integer}` from a
participant with the observe capability. Time never moves backwards. A record
is open at its deadline and lapsed strictly after it. Lapsed records persist and
cannot be performed. A missing performance never invents a system act.

An obligated performance and a clock used by this form are public protocol
facts: the foundation requires their spine readership. This makes completion
and lapse replayable by later joiners. Existing non-obligation system acts keep
their existing audiences. The form does not confer a general private-obligation
facility: these fixtures declare public triggers and public recipe inputs.

## Sale and the Ivan@15 window

On every effective join, Sale obliges its disclosure role to `dap.disclose`,
with a recipe naming the newcomer, the exclusive join cutoff, and the declared
public dependency kinds: offer, withdrawal and acceptance. The recipe is the
same in the newcomer and incumbent views; it contains no hidden prior payload.
While any join disclosure is open or lapsed, all Sale business kinds except
the listing and close are ineffective with `obligation_open` or
`obligation_lapsed`. The newcomer's current view remains exactly the events
already readable: an open card provides no stub, amount or decision. Close and
unrelated inspection remain available. Thus Bob's replacement at Ivan's
frontier 15, in the original trace with disclosure missing, must be refused in
both oracle and Ivan's view, and neither fold gains a replacement stub.

The performing client reads its own projection and supplies every effective
position of the declared public kinds before the cutoff, including those it
previously read by disclosure. It emits an ordinary `dap.disclose`, naming the
obligation. The matcher checks the right recipient, earlier unique integer
positions, and the absence of extraneous payload keys. Completeness of the
backlog and its permitted kinds are a stated client conformance assumption,
as in the original serving policy, not authenticated from hidden bodies by a
newcomer. A client omitting a dependency is outside that contract; a separate
negative control will test and report that boundary. After conforming
performance the card is fulfilled and dependent acts resume. Lapse leaves
those acts blocked. There is no implicit recovery or cancellation.

## Club

An effective admission obliges the grant role to grant Member to the actor of
the named target. Its public recipe contains only the target commitment. The
performing client selects the actor from its own readable target body. The
matcher checks a current participant is named and that the sole granted role is
Member. Selecting the correct target actor is a client conformance assumption:
publishing the entire target body as evidence would expose a private Club
application. The public card cannot authenticate that hidden-source relation. This preserves the
original Club grant policy, including its known invalid-target defect: this
form does not silently repair V5-A5 by requiring the target be an application.

While this grant is open or lapsed, Club business acts are ineffective; the
admission record remains and the applicant has no Member capability. A
conforming client holds grant authority and the named target body, performs the
grant once, and never invents the target actor from hidden state. Club's join
backlog is also expressed by the same disclosure recipe, so neither old
`Script.joinDisclosure` nor `applyEffects` performs these obligations.

## Frozen controls and expected state

- Delayed Sale: Bob's `o1` exists before Ivan joins. At the join the card is open;
  Ivan sees no `o1`; Bob's attempted `o2` replacement before performance is
  ineffective and business state remains one stub. Correct disclosure fulfils
  the card, reveals `o1` to Ivan, and the next replacement becomes effective.
- Missing Sale: the same open card survives time at its deadline, becomes
  lapsed only after it, and remains lapsed after an attempted late performance.
  Replacement stays ineffective and the business state stays one stub.
- Mismatch: wrong act, wrong role holder, wrong obligation id and wrong
  recipient cannot fulfil the card or change protected business state.
  A role holder without disclosure authority receives the ordinary
  `unauthorized` verdict. Reusing a fulfilled record is refused.
- Delayed Club: after a valid admission and before its grant, admission count is
  one and Member is absent. A dependent application is blocked without changing
  applications. Correct performance grants Member and fulfils the record.
- Every control asserts literal state at its intervening prefixes alongside
  view equality. Sale and Club campaigns use the original seeds 1–200 and
  bounds; immediate conforming clients perform cards between generated steps.
  Original Club V5-A5 invalid-target cases must still produce invariant failures.

Any repair after this frozen contract is named in the report. Claims concern
these executed fixtures and conforming clients, not arbitrary notification
systems, human response, or complete-backlog authentication.

Pre-run correction, before implementation or fixtures: parent review identified
that embedding a Club target body in a public grant would leak its private
statement. The contract now keeps that body private and states correct-target
selection as client conformance; a wrong-target negative control must expose
this boundary. The previous frozen version remains in git history.
