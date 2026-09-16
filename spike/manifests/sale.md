# Experiment manifest: Sale

Frozen before the baseline (spike plan §4.7). The partition-plus-decision
shape of the views note: offers are private in their amounts and public
in their existence, and one decision spans both. The model is authored by
an agent under the protocol of spike plan §4.5, from this manifest and
the notes; the fix count is the measurement of design note goal 2.

## Package

`fixtures/sale.ts`, pinned by module, config and schemas. The kinds, their
audiences and their capability contracts are the split schema of the views
note (*The trace*) and are predeclared here, not fixes:

| Kind | Audience | Requires | Payload |
|---|---|---|---|
| `com.example.sale.listing` | spine (origin) | none: origins are exempt | `referent`, `ask` |
| `com.example.sale.offer` | members | `make_offer` | `offer_id`, optional `replaces` |
| `com.example.sale.offer_terms` | author and seller | `make_offer` | `offer_id`, `amount`, `seller` |
| `com.example.sale.withdraw` | members | `withdraw_own_offer` | `offer_id` |
| `com.example.sale.counter` | seller and author | `counter` | `offer_id`, `amount`, `author` |
| `com.example.sale.accept` | members | `accept_offer` | `offer_id` |
| `com.example.sale.close` | spine | `close` | `outcome` |

Roles: Seller (`accept_offer`, `counter`, `close`), Buyer (`make_offer`,
`withdraw_own_offer`), Inspector (nothing). The Inspection package
(`fixtures/inspection.ts`) is harness-provided for the mid-stream attach
of the trace and is not measured: `com.example.inspection.request`, audience
requester, seller and inspector, no capability.

## Promises

1. At most one offer is accepted.
2. An accept is effective only for an existing, open, unwithdrawn,
   unreplaced stub, while the sale is open, by a holder of `accept_offer`.
3. Every offerer's view shows the decision.
4. The winner and the seller see the accepted amount.
5. A withdrawal or a replacement is effective only by the stub's author.
6. Nothing is effective after close.

## Privacy budget (maximum readers)

- Amount and counter of an offer: its author and the seller.
- Inspection request: requester, seller, inspector.
- Participation: all present and future participants (spine).
- Offer stubs, withdrawals, accepts: members when recorded, subject to
  disclosure.

The budget is checked on the projection: no principal's observation
carries an amount or a counter of an offer they did not author unless
they are the seller, and no inspection request they are not party to.

## Projection shape

`observe` for the `sale` model returns, for a principal `p`:

```text
{
  status: 'unopened' | 'open' | 'decided' | 'closed',
  referent, ask, seller,                         // from the listing, or null
  offers: [ { id, author, position,             // stubs p can see, by position
              status: 'open' | 'withdrawn' | 'replaced' | 'accepted' | 'declined',
              replaces: id | null,               // as the stub names it, seen or not
              amount: number | null,             // null unless p is author or seller
              counter: number | null } ],        // null unless p is author or seller
  accepted: id | null,                           // when p can see the decision
  acceptedAmount: number | null                  // seller and winner only
}
```

`status` and `accepted` are shared outcomes: they must agree with the
oracle in every view where the deciding events are visible. Outcome
reasons are compared too; the vocabulary is `not_open`, `no_such_offer`,
`withdrawn`, `replaced`, `already_decided`, `not_author`,
`duplicate_offer`, `malformed`, `unhandled`.

## Constraint inventory and budget

One cross-partition constraint: one accepted offer. Budget (spike plan
§4.3): at most 2 fixes and at most 1 added kind. The stub split is
predeclared. Fixes are recorded in `manifests/sale.ledger.md`.

## Domain and bounds

At most 6 participants, at most 60 positions, seeds 1 to 200. Integer
amounts. One listing per context. Offer ids are chosen by the offerer and
must be unique in the context. No time: expiry is Booking's problem.

## Predeclared cases

1. **The trace.** The views note's positions 0 to 19 replay from the
   narrative with the audiences of the table; the readability of each
   position for Alice, Bob, Carol and Ivan follows from those audiences
   (`saleTrace` in `sale.ts`); the projections at 19 are the literal ones
   in `sale.ts`; position 17 is effective and position 18 is ineffective
   with `already_decided` for every participant who can see it.
2. **Replacement with a hidden predecessor.** Ivan, who joins at 13,
   holds only the header of o1's stub and sees o3 replacing it: he
   interprets o3 as open, and a later accept of o1 is ineffective for
   everyone.
3. **Late joiner after the decision.** Dana joins after position 17 and
   before close. A second accept after she joins is ineffective in every
   view; her observation equals the oracle's at every frontier; a
   disclosure of 17 to her keeps equality under the new basis.
4. **Late joiner judging a public event on a hidden fact.** Dana joins
   after o2's stub and before its withdrawal; the withdrawal and a later
   accept of o2 are judged the same way in every view.
5. **The campaign.** Seeds 1 to 200 with joins, disclosures, a narrow side
   attach, ineffective attempts, replacements, withdrawals, counters and
   accepts: zero violations of the property, the pause rule, the
   invariants and the privacy budget.

## Invariants (evaluated on the oracle's state)

- At most one effective accept in the series.
- Every effective accept names a stub that was recorded earlier, not
  withdrawn, not replaced, and was made by an actor holding `accept_offer`
  at that position while the sale was open.
- Every effective withdrawal or replacement names a stub by the same actor.
- No sale event is effective after an effective close.
