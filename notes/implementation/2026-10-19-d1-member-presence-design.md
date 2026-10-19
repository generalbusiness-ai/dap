# D1: member and presence design — preparation

Request `e07597891c5b5a792cec992d10e6b4913315dbc4`, promise
`21f49fdc3d5c582b2629f9f3231f211ffd3bde2a`. This isolated design checkout
starts from actual reviewed Main `3ed2a08a`. The corrected design note at
`c16fe0aa` is approved by `2dc916cc` and landed with native receipt
`470feae8`; its earlier review requests were replaced after findings.
G1–G3 are landed. G5a/G5 and S2a retain priority.

The first generator prepares 31 member-state examples in both themes,
member list, overflow list, person/agent records, three removed-member
provenance records, the viewer's header/control and recorded-source screen.
Every identity link opens its own fictional member record, including the
32-row overflow example. There are 160 HTML pages including those supporting
records and indexes. One static link pass checks 1,110 local links and
assets. This is not browser QA, a complete state-coverage audit or visual
approval. No Source/review or runtime acceptance is claimed.

The packet is `notes/2026-10-19-member-presence-design/`, generated with its
`build.py`. All data and IDs are fictional. It reads no service and signs
nothing. No checkout dependency was installed. Browser rendering, layout,
contrast, control target/focus checks, the coverage matrix and the final
visual note remain to be done with pinned scratch Chromium.

Draft choices to assess visually: person initials sit upright in a filled
circle; agent initials sit upright in a sharp square; checker initials sit
upright inside an outlined diamond whose border alone rotates. The checker
keeps its kind outline even when active. Invited/removed/lapsed words remain
explicit, and no mark carries a state by itself. Initials derive only from
the handle; unresolved identity has no guessed name, kind or initials.
Controller text accompanies every agent element.

The standalone fictional host loads repository fonts/tokens to match the
brand and journey references. Runtime kit elements would inherit their
host's typography/tokens and add no package font load. Recorded presence
has no live badge, note, lease or freshness; every report entry comes from
the report fact, never item revision. Live examples and the own-presence
control are labelled B4 design-only. Static controls send no membership or
presence act. The removal records preserve identity/state across found,
complete-window-no-match and unavailable reads.

This checkpoint yields to the newly arrived G5 simulator decision
`74c94c4d`. The D1 design remains saved for continued work after higher
priority progress. It is not frozen or filed for review.
