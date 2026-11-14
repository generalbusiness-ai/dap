# R: tool-library reservation

Request `5b5b6896fc6cb6507e4e1fab4b2639f8b0157633` and promise
`f68dd9c48d6d54874c20a7f168b59be1c1a45efb` track this work.
Planner ruling `02d4942afa12d67762bafd9d278ea6d575dac82c` sets the
day semantics below.

The three prerequisite witnesses live in
`examples/lending/definition.test.ts` at `1475396522`. Actual PASS act
`6175` records their earlier execution. They check the equality-only
slot form, own-item timed effects, and a named refusal after two
same-head opens with empty expected revisions. This source stage does
not rerun them.

## Definition and witnesses

The production definition adds up to eight live reservations. Each
holds a fixed tool reference, an opaque day label of at most ten bytes,
and the member's explicit `until`. The member opens a reservation only
when no held reservation has the same tool and day. The guard reports
`tool-day-taken`. A timed lapse ends its own reservation; it changes no
tool or other reservation.

Write `day` as `YYYY-MM-DD` in pages and agent requests. This is a
convention, not a guard. Two spellings of one calendar day are two
different slots. The scope never checks that `until` falls on `day`.
It applies no calendar, timezone or interval rule.

The production plain witness checks two spellings as distinct slots,
the named refusal on an occupied slot, and availability after both
reservations lapse without changing the tool. The retained story adds
two members and both admission orders, an expiry outside one day label,
and exact local lapse effects.

The Native Lending scenario reuses its installation and real membership
grants. Both members prepare signed requests at one head with empty
expected revisions. The first succeeds; the unchanged second envelope
must fail at the named guard without another entry. A second slot
reverses the admission order. The scenario checks each stored
reservation and the unchanged tool, then retains its independent replay.
Its Git host and clock remain stand-ins.

The browser's exhaustive refusal tables include reserve. Its existing
circulation model excludes reserve until a separate screen exposes the
reservation fields. No new screen or browser interaction enters R.

## Source-stage status

Root granted source edits only while C2 owns execution. No compiler,
tests, formatter, build, model or producer has run for these production
edits. The typed declaration and story have changed; their generated
JSON and pin still retain the earlier bytes until normal generation
receives an execution grant. The old literal-only pin script cannot
read the current typed authorship and must not generate these outputs.

Lending remains at version `0.2.0`. The committed identifiers and
signatures remain unchanged. After normal generation identifies the
new definition and release inputs, stop for the planner's signing
decision. Raise the version and run the gate only after the planner
signs Lending `0.2.0`, as the request requires. No landing or deployment
follows from this source stage.
