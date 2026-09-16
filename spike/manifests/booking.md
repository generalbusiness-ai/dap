# Experiment manifest: Booking

Frozen before the baseline (spike plan §4.7). The field-split-plus-time
shape of the views note: a booking's existence is public, its purpose
and its booker are private, and expiry depends on an ambient clock. The
model is authored by an agent under spike plan §4.5 from this manifest
and the notes; the fix count is the measurement of design note goal 2.

## Package

`fixtures/booking.ts`, pinned by module, config `{room: 'room-1'}` and
schemas. The kinds, audiences and capability contracts are the split
schema of spike plan §4.1 and are predeclared here, not fixes:

| Kind | Audience | Requires | Payload |
|---|---|---|---|
| `com.example.booking.request` | booker and admin | `request` | `room`, `start`, `end`, `purpose`, `admin` |
| `com.example.booking.occupancy` | members | `publish` | `booking_id`, `room`, `start`, `end` |
| `com.example.booking.cancel_request` | booker and admin | `request` | `booking_id`, `admin` |
| `com.example.booking.free` | members | `publish` | `booking_id` |
| `dap.observe` (system) | members | `dap.observe` | `fact: {clock}` |

Roles: Admin (`publish`), Booker (`request`). The clock is a designated
participant holding `dap.observe`; the model opts in to ambient facts
(`ambient: true`) and folds every effective observation. The booking id
is the content id of the request event (`ctx.id` in the fold): globally
unique, opaque, and it does not reveal the booker. Intervals are
half-open, `[start, end)`, in integer ticks.

## Promises

1. No two effective occupancies overlap on the room while both are
   unexpired and unfreed.
2. Whether a slot is occupied is visible to all members.
3. An occupancy expires when the clock reaches or passes its `end`;
   expired occupancies do not occupy.
4. A second publication of an occupancy with the same booking id is
   ineffective (`duplicate_id`); updating a booking is free then publish.
5. A free is effective only for an existing occupancy that is not
   already free, by a holder of `publish`.
6. A cancel is effective only by the request's booker.

## Privacy budget (maximum readers)

- Purpose and the booker's identity: the booker and the admin.
- Occupancy and free facts: members; they carry no booker.
- Participation: spine.

The budget is checked on what a participant can read and on the
projection: a request or cancel readable by anyone but its booker and
the admin is a violation; for a principal other than the admin, every
request in their observation is their own; and no occupancy carries a
`purpose` or a `booker`. (Amended after run 1 per checker's V3-F1; the
run-1 check was projection-only.)

Revised after checker report `5014a7f1`, V4-F1 and V4-F2: the readable
guard also checks every occupancy, free and `dap.observe`, including
ineffective attempts. A public-kind event signed by a Booker must not be
readable outside that actor and the admin; a booking id linked to a
booker by such an event must not expose that link to another reader.
Booker grants are derived from effective spine events. The guard checks
public payloads, including nested observation facts, for `booker` and
`purpose` fields. This is a new manifest revision, not evidence that the
earlier guard covered those cases. Deliberate publication of private
fields by an authorized admin or clock is a hostile-client limitation:
the guard must detect it; the fixture does not enforce closed payload
schemas at admission.

The revision after run 8 also rejects claimed-party exemptions: a public
payload's own `booker` value cannot authorize a reader to see private
fields. Every non-admin reader is checked, including when that field
names the reader. Nested fields are checked by the same rule.

## Projection shape

`observe` for the `booking` model returns, for a principal `p`:

```text
{
  now: number | null,                            // the latest clock p can see
  occupancies: [ { id, room, start, end, position,
                   status: 'active' | 'expired' | 'freed' } ],   // every occupancy p can see, by position
  requests: [ { id, room, start, end, purpose, booker, position,
                status: 'pending' | 'published' | 'cancelled' } ] // only requests p can read
}
```

Occupancy `status` and `now` are shared outcomes. Outcome reasons are
compared too; the vocabulary is `overlap`, `duplicate_id`,
`no_such_occupancy`, `already_free`, `not_booker`, `already_cancelled`,
`malformed`, `unhandled`.

## Constraint inventory and budget

One cross-partition constraint: no overlap. Budget (spike plan §4.3): at
most 2 fixes and at most 1 added kind. The request/occupancy split is
predeclared. Fixes are recorded in `manifests/booking.ledger.md`.

## Domain and bounds

At most 6 participants, at most 60 positions, seeds 1 to 200. One room.
Integer ticks from 0; the clock never runs backwards. Requests start in
`[0, 40)` and last 1 to 6 ticks. Multi-room routing is out of scope.

## Predeclared cases

1. **Two requests, one slot.** Two bookers request the same slot; the
   admin publishes one occupancy; the other request stays pending and a
   publication for it is `overlap`.
2. **Free exactly one.** Two non-overlapping occupancies; the admin
   frees one; the other stays active; freeing the freed one again is
   `already_free`.
3. **Duplicate publication.** A second occupancy with the same booking id
   is `duplicate_id`.
4. **Only the admin publishes.** A booker's occupancy is `unauthorized`
   (foundation), before any model rule.
5. **Expiry.** The clock reaches an occupancy's end: it is `expired` in
   every member's projection, and an overlapping occupancy is now
   effective.
6. **Cross-view (spike plan §4.1, from checker's review 05048fbb).** An
   occupancy is recorded before J joins; an overlapping publication after
   J joins is rejected by the full fold while J holds only the first's
   header; freeing the earlier occupancy has the same missing input. The
   candidate must supply public history or explicit evidence without
   exposing the booker; whether the predeclared schema already does so
   is recorded, and any repair after the baseline counts.
7. **The campaign.** Seeds 1 to 200 with joins, disclosures, a narrow
   side attach, ineffective attempts, requests, publications, cancels,
   frees and clock ticks: zero violations of the property, the pause
   rule, the invariants and the privacy budget.

## Invariants (evaluated on the oracle's state and the recorded entries)

- No effective occupancy overlaps an earlier effective occupancy on the
  room that was neither freed nor expired at its position.
- No two effective occupancies carry the same booking id.
- Every effective occupancy and free was made by a holder of `publish`
  at its position.
- Every effective free names an earlier effective occupancy not already
  freed.
- Every effective cancel was made by the actor of the request it names.
