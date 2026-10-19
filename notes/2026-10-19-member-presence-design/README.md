# Member and presence design

This packet shows the member element, member list, member record and the
viewer's own presence control. All data is fixed and fictional. It follows
the [approved member and presence note](../2026-10-18-member-and-presence-ui.md)
at `c16fe0aa`, approved by `2dc916cc` and landed with receipt `470feae8`.
It changes no runtime, membership, authority or presence service.

Open the [light index](examples/index-light.html) or the
[dark index](examples/index-dark.html). The 40 state examples and their
supporting records make 192 HTML pages. Each identity link opens that
member's own fixed record. The examples do not contact a service or sign
an act. Disabled controls show the proposed placement and wording.

## Read identity, standing and presence separately

A person's initials sit upright in a filled circle. An agent's initials
sit upright in a sharp square. A checker's initials sit upright within an
outlined diamond: only its border rotates 45 degrees. Initials use the
first letters of two handle segments, or the first two letters of a
single segment. They use 12 px Open Runde semibold; the handle is always
printed beside them. The 32 px mark is inside a target at least 44 px wide
and high. A long handle/controller wraps without shortening.

The checker keeps its outlined kind shape in every standing state. This
follows the note's outlined-diamond identity rule; it is the explicit
exception to its general active-filled wording. Invited is outlined and
labelled; removed and lapsed are muted and labelled. The removal word uses
the garnet token. Every agent element names its controller or says
controller unavailable. No colour or shape stands for an unprinted word.

An unresolved identity shows Member unavailable and the raw full reference.
It has no guessed handle, kind or initials. Unknown standing omits a role
and says eligibility unknown. An identity link grants no authority.

Recorded presence names the reported room and report entry. It has no live
status, note, lease or freshness. Its here marker compares the full room
address, never the label. A partial address has no here marker. A missing
report fact never becomes an item revision or a guessed entry. The late
opening example keeps entry 2 at head 103, while the recent-activity window
is unknown. The move example names report 108, rather than opening 8 or
revision 2.

Live examples are labelled B4 design only. They include all four status
words, focus without a status, a note, a several-session projection and
known lease freshness. A known lease end permits last seen; an unknown
end supplies neither a badge nor a time. No live executor or renewal is
implemented here.

## Find every required state

Each link has a matching dark example in the index.

| Approved state or boundary | Light example |
|---|---|
| Active person, agent, checker | [Person](examples/person-active-light.html), [agent](examples/agent-active-light.html), [checker](examples/checker-active-light.html) |
| Invited in all three kind shapes | [Person](examples/invited-light.html), [agent](examples/agent-invited-light.html), [checker](examples/checker-invited-light.html) |
| Removed in all three kind shapes | [Person](examples/removed-light.html), [agent](examples/agent-removed-light.html), [checker](examples/checker-removed-light.html) |
| Lapsed in all three kind shapes | [Person](examples/lapsed-light.html), [agent](examples/agent-lapsed-light.html), [checker](examples/checker-lapsed-light.html) |
| Agent controller unavailable | [Controller unavailable](examples/controller-unavailable-light.html) |
| Unresolved identity and unknown standing | [Identity unavailable](examples/identity-unavailable-light.html), [standing unavailable](examples/standing-unavailable-light.html) |
| Holds or does not hold the needed action | [Eligible](examples/eligible-light.html), [ineligible](examples/ineligible-light.html) |
| Four live statuses | [Available](examples/live-available-light.html), [busy](examples/live-busy-light.html), [waiting](examples/live-waiting-light.html), [blocked](examples/live-blocked-light.html) |
| Here, including a focus-only lease | [Here](examples/live-here-light.html), [focus only](examples/live-focus-only-light.html) |
| Reported live note | [Note](examples/live-note-light.html) |
| Several sessions, one labelled projection | [Projection](examples/live-projection-light.html) |
| Known live freshness and lease end | [Lease window](examples/live-lease-light.html) |
| Recorded room, same or different viewer subject | [Here](examples/recorded-here-light.html), [elsewhere](examples/recorded-elsewhere-light.html) |
| Partial room address | [Partial](examples/recorded-partial-light.html) |
| Recorded leave | [Left](examples/recorded-left-light.html) |
| Arrival or leave report fact unavailable | [Arrival](examples/recorded-report-unavailable-light.html), [leave](examples/recorded-left-report-unavailable-light.html) |
| No arrival reported | [Not reported](examples/recorded-not-reported-light.html) |
| Presence source unavailable | [Unavailable](examples/presence-unavailable-light.html) |
| Live absence with known or unknown lease end | [Known](examples/live-absent-known-light.html), [unknown](examples/live-absent-unknown-light.html) |
| Provisioning ready does not imply attendance | [Ready](examples/ready-not-present-light.html) |
| Late opening and exact report fact | [Late opening](examples/late-opening-light.html), [moved report](examples/moved-report-light.html) |
| Long agent handle and controller | [Wrapping](examples/long-identity-light.html) |

## Read the kit-owned screens

The [member list](examples/members-light.html) shows six members and where
they last reported. The [bounded list](examples/members-overflow-light.html)
shows 32 resolved references and explicitly leaves five unresolved. It does
not hide a second resolution pass.

The [person record](examples/record-person-light.html) and
[agent record](examples/record-agent-light.html) show known identity, role,
controller where relevant, keys and their states, opening entry and current
recorded presence. Admin membership controls belong on these kit-owned
screens. They remain disabled in this design. The record examples show
three separate removal reads: [found](examples/record-removed-found-light.html),
[not found in the complete 100-entry window](examples/record-removed-old-light.html),
and [unavailable](examples/record-removed-unavailable-light.html). All preserve
the known removed state.

The viewer's [own header](examples/own-header-light.html) opens
[their own live control](examples/own-presence-light.html). Status, a
160-byte note and service-held focus appear there. Another member's presence
has no write control. The [recorded-source screen](examples/own-recorded-light.html)
offers no live control. All live screens state that B4 execution is pending.

## Inspect the renders

The [rendering record](rendering.json) names the pinned tools, source hashes,
raw screenshot hashes, dimensions, interactions and contrast measurements.
The committed contact sheets show every primary example in both themes
at each viewport:

- [Light phone](renders/contact-light-390.png)
- [Dark phone](renders/contact-dark-390.png)
- [Light desktop](renders/contact-light-1440.png)
- [Dark desktop](renders/contact-dark-1440.png)

Full-size selected card crops include the
[member list](renders/members-light-390.png),
[agent record](renders/record-agent-light-1440.png),
[own control](renders/own-presence-dark-390.png),
[long identity](renders/long-identity-light-390.png) and
[known live freshness](renders/live-lease-dark-390.png).
The crops retain the card's actual layout width; the rendering record
names the surrounding viewport. The contact sheets are reduced previews.

Playwright 1.63.0 with Chromium 153.0.8010.12 rendered all 192 pages at
1440×1000 and 390×1000. Browser plugin not available; the pinned browser
package and cached binary were used from scratch. All 384 page/width checks
found meaningful content, correct titles, no horizontal overflow, no
framework overlay, no relevant console errors and 44-pixel targets. The
member-record click and own-control keyboard route passed in both themes,
including visible focus. Identity links use their visible handle, kind,
standing word and controller as their accessible names; no shortened label
hides those words. Five stress screens also fit 320 px and CSS
zoom 200%; this is not browser-toolbar zoom.

Text, muted text, accent and removal text pass 4.5:1 against both surfaces.
The lowest measured pair is muted text on light bone at 4.824:1. These
measurements do not claim disabled native control-border contrast or
screen-reader testing. Screenshots were inspected as contact sheets and
selected full-size crops.

## Rebuild the fixed examples

From the repository root:

```sh
python3 notes/2026-10-19-member-presence-design/build.py
```

The script uses Python's standard library and writes the fixed HTML and
manifest inside this packet. It reads no service. The standalone preview
loads the repository's Open Runde, Teletype33 and Sometype Mono fonts and
brand tokens. A future runtime element would inherit its host's fonts and
tokens, with no package font request. The surface remains sharp, quiet and
flat, matching the compact-card and journey designs.

The retained scratch renderer is
`/tmp/artroom-d1-browser-20261019.mjs`; its hash and original output are in
rendering.json and the review evidence. It served repository files only on
loopback, used the existing pinned browser, and installed no dependency.
The first sandboxed server attempt was refused before a browser opened.
The allowed original, expanded and accessible-name follow-up renders all
ended normally. The final follow-up recaptured all pages after removing
shortened aria-labels; all 192 primary PNGs match the preceding capture
byte for byte, including the committed previews.
No hosted service, membership act, deployment or native receipt was produced.
