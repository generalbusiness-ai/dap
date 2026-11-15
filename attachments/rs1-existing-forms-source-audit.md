# RS1 existing-form feasibility

Source-only review of approved R head
`8bcdfa34d59aa8184c9c86325f0dd74b4ad2e926`, under request
`e3dff17f7fef7784c7b5474b01fb8600765f1349`. R's local landing was active
while the review began. This report assumes neither a later origin act nor
an RS1 promise filing by root. It changes no checkout, dependency, actor,
producer, version, identifier, or release. No parser, import, compiler,
test, hash calculation, browser, workflow, or executable probe ran.

Read Lending's nested AGENTS.md first: day labels stay YYYY-MM-DD by
convention only; the scope compares at most ten opaque bytes and does not
align until with the day. A lapse changes the reservation alone.

## What the approved definition actually records

- examples/lending/definition.ts:21–26 declares eight live reservations,
  initial held, final lapsed, fixed tool/day/until, and NO holder party.
- Lines77–84 use lending.member, the exact tool/day held-range exclusion,
  and field copies. They record neither a holder nor a staff identity.
- Line86 is the only finalizing reservation transition: timed lapse from
  held to lapsed at until. It has no tool effect.
- Lines6 and examples/lending/roles.ts:3–7 name the existing actions:
  lending.establish, lending.member, lending.staff. Admin gets all three;
  member and agent get only lending.member. The retained story has a
  separate staff actor with ONLY lending.staff (story.ts:16 and retained
  scenarios/application.json), so member authority cannot stand in for staff.
- The library's fixed founder party at definition.ts:10 is an opening
  identity, not the current staff-grant set. The actual story founder is
  its member actor, not its staff actor.

## Per-member live holds fit an existing form

The current schema CAN express the bound. No new contract form is needed.
Use a fixed holder party on the existing reservation item, written from
signer by reserve, not an author-supplied holder field. A different device
key of the same actual MemberRef then does not acquire a different count.

Recommend a maximum of TWO held reservations per member out of the eight
live slots. This leaves six slots outside one member's direct control and
allows a member to reserve two tools or two day labels. This is a proposed
policy number, not a measured product limit or planner decision.

Existing typed spelling for the opening guard is:

```ts
count(range(reservation, ["held"], {
  where: held => [equals(held.slot("holder"), signer)],
}), { max: 1 })
```

That max is the number already held BEFORE the new opening. At most one
existing match permits a second hold; two existing matches refuse a third.
For a one-hold policy the existing none(range...) form could instead require
zero existing matches. Do not set max:2 and describe it as a two-hold bound.

Sources: contract/definition.ts:193–208 defines Range/Where and count's min/
max; define/src/index.ts:301–320 exposes range/count and the filtered range;
validate/guards.ts:193–217 admits the range and integer bound. Runtime
program/guard-value.ts:24–53 scans filtered items and fails when n>max.
program/read-value.ts:44 reads signer as j.signer.member. party.fixed and
on.party(..., signer) already exist at define/src/index.ts:119–124,229,275.
No new counter, index, party algorithm, grant model, form, capability, or
production code follows from that proposal.

## One release act has an unresolved authority problem

A holder-only transition fits existing forms: add final released to the
same reservation, use transition(..., lending.member), require held and
on.signer("holder"), and write only on.to("released"). Both the global live
count and tool/day exclusion stop counting it. Retain tool/day/until/holder
for history and preserve lapse exactly. A staff-only transition separately
fits: use lending.staff and require held, without the holder predicate.

But ONE act that accepts the holder OR any current librarian is not
expressible by the inspected existing authority forms:

1. ActType.grant is ONE required action string, contract/definition.ts:109.
   Typed transition takes one GrantRef, define/src/index.ts:483–497.
2. judge.ts:431–447 first requires a current grant covering that exact
   action/key/scope. This happens before ordinary guard evaluation.
   Choosing lending.staff excludes ordinary member-only holders. Choosing
   lending.member excludes the existing staff-only actor.
3. Guard's closed union at contract/definition.ts:216–238 has anyOf and
   signer-party predicates, but no current-grant/action predicate. anyOf
   can combine existing guards; it cannot bypass the single grant check.
4. judge.ts:442 gives guards signer.member and principal. The signer
   predicate checks declared party slots (program/guard-value.ts:94–108).
   It does not test the actor's current staff grant.
5. ruleInput at derive/src/guards.ts:144–157 exposes signer MemberRef,
   fields, subjects and fetched facts. It exposes no current grant actions.
   A rule expression therefore cannot supply the missing authority check.

The runtime's native grant mark is a platform-specific authority path, not
a portable application form to attach to Lending without a new pin/form.
A historical set-actions fact is not proof of a CURRENT staff grant. Adding
all staff to member, using the library founder, trusting an input role, or
minting an authority token would not establish the required OR permission.
Do not implement one of those substitutes.

Concrete proposal for planner before production code:

- `release`: transition the held reservation under `lending.member`, require
  its fixed holder party to match signer, then write final `released`.
- `release-by-staff`: transition the held reservation under `lending.staff`,
  then write the SAME final `released` state. It needs no holder match.
- `reserve`: write `holder` from signer and require the filtered count to be
  at most1 before opening, giving K=2 held reservations per MemberRef. Keep
  the global8, the existing tool/day exclusion, and the unchanged lapse.

There is NO existing shared action that implements both permissions without
changing grants or weakening authority. `lending.member` serves holders but
also ordinary nonholder members and does not cover the staff-only actor.
`lending.staff` serves librarians but not member-only holders.
`lending.establish` is a separate founding action. An admin holding both
member and staff actions does not make either action an OR predicate.

Root can ask planner to approve these TWO existing-form acts and K2 rather
than inventing a one-act form, a grant mutation, or a role-labelled proxy.
The one-act/current-holder-or-current-staff combination is the gap. This
report adds no act, grant, state, party, or form on its own. Implementation
must wait for that disposition.

## Scenario and README work after that disposition

Keep the current named tool/day conflict, two opaque spellings, the existing
clock/lapse cases, and exact tool-unchanged assertions. Extend the existing
story rather than replacing its authority fixtures:

- The actual holding member releases. A second member's same tool/day
  request must then take that slot; a nonholder member must not release it.
- The actual staff actor releases another member's hold using the authority
  route the planner approves. Preserve a member-only/nonholder refusal.
- Exercise the chosen per-member limit with different tool/day labels so
  tool-day-taken does not hide it. Final release or lapse frees that member's
  count; other members' held reservations do not count against that member.

Until has NO application maximum. The current time field only checks
Timestamp syntax (bytes/src/field-value.ts:33 uses timeMs); reserve contains
no upper-bound or day-alignment guard. README must say that directly.
Release and a per-member cap address one member filling the book; they do
not prove a global fairness or finite-waiting property when all eight slots
are legitimately occupied. Keep the eight-slot global bound and current
calendar/timezone convention.

The declaration tests currently keep a prerequisite reservation-contract
fixture distinct from production. Preserve that distinction. Changing the
real reservation party/state/act requires its existing definition/canonical
JSON/pin and story producer correspondence checks, not only that old fixture.
The retained story already has member, neighbour, staff and visitor actors;
no invented standing or operator key is needed for the later cases.

## Version and optional manifest work

RS1 is the first successor to Lending0.3.0: update BOTH authored package.ts
and dap.application.json to0.4.0 when implementation is authorized. It stays
open. Do not change immutable0.3 packets, trust, deployed application state,
Grow or Counter releases, or block the planner's0.3 signing/installation.
The normal canonical comparison remains a later executable obligation and
must show Grow/Counter tuples unchanged. No identifier is computed here.
The later gate stays behind the four-promise side head and CB1/LS1.

Ruling3991b73ba260a11a1562711d39e4950b054ff079 permits an optional few-line
manifest capabilities option. Current define/src/package.ts:129–139 lacks
that option, and line150 derives only runtime definition capabilities.
Lending's package.ts currently overrides its result with publication-paths@1
and prefix shelf/, under packages/define/test/package.test.ts correspondence.
A later optional input/defaulted output could remove the spread if it stays
small and preserves that exact descriptor. Do not conflate the definition's
hold/git-read/device-command capabilities with application publication
metadata. The define package has no Platform dependency, so importing a
Platform capability type would widen dependencies rather than remain that
few-line option. Settle the local type and equality witness in source review
before adding it. It is optional and does not solve the release authority gap.

All proposed code, scenario, README, generator, normal pack comparison,
preflight, gate and checker work remain UNRUN. This audit is a feasibility
finding, not implementation, validation, release approval or acceptance.
