# G1: Grow operator views in the generic card kit

Current code includes the joint owned Site → Room → alert path, fixed native
device controls, related-record navigation and bounded zone history. The
sections below retain the development evidence in order. The final gate and
review are still pending; earlier unfinished-boundary notes describe earlier
checkpoints and are superseded by the 19 October sections.

Request `2c5969dc34788e6f130e3e81e0c105f35fa5f7a5`, promise
`811e2f5bbba0b3bb26ee052fb3520048202cc047`. This is a separate G1 head,
`request/g1-operator-views-20261018`, based on unlanded M2b
`5ef3ddfcf32506c5dc6410a0be0a1bf555e8452e`, which includes the frozen M2a
Source `316d103901c46439f0633db876721137847c536e`. This records the starting
point. Source has since landed at `4d8c878c` and M2b at `4b794cf5`, each
with a ratified checker landing audit. G1 reuses their declared form and
does not change either frozen review checkout or its evidence.

The target is the operator's path: overview, alert at the top of the grid,
Authorize as the heater target command, its receipt, and the closed incident.
The package supplies declarations and the grid resource; the host retains
its generic rendering, read, revision, grant and custody boundaries. A grid
surface offers named navigation only. Authorization remains a generic card
act, not a signing API in package script.

The following acceptance checks will have individually named witnesses in the
review request: app-only data; quiet model context; the displayed authorization
receipt; refusal of a stale display before another signature; and host resize
at mobile and desktop card widths. Native judging, projection bytes and replay
will be distinguished from any scripted install, membership or device-owner
ports in the test host. No native device-command outcome, real device, G2
tender/probe or layer acceptance, G3 routing, hosted room, Cloudflare deployment
or G6 browser-room-page embedding is claimed.

Preparation uses a private APFS COW dependency view, audited against the
unchanged lock `3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`:
106 versions, 13 workspace links resolving inside this checkout, zero package
installs. Audit `/tmp/artroom-g1-dependency-view-20261018.json`, SHA-256
`5f63bf43669cf12e42505cc59700a096dc2a7a715cd379f776907318a4063225`.
Only this new clone's Vite caches were removed. This is a version/link audit,
not a tarball integrity claim.

G1 remains in progress; no gate, review approval or completion is claimed.
The detailed morning design also describes site
statistics, current presence, sparklines and manual zone controls. Their data
and action requirements will be checked against the existing declarations;
missing facts will not be invented from a recent event window or a fixture
outcome. The explicit G1 operator path remains the required acceptance target.

## Declaration and custody progress

The package now declares selected alert, incident and zone projections and
records. The grid shows the first live alert above the benches, including the
separate sensor reports, and opens the generic alert record. Closed incidents
link to their first and last entries. Zone rows open the declared zone record.
The alert carousel, activity log, grid and existing Site resource use the same
form. A package resource can navigate but cannot authorize or sign.

Selected-record declarations omit unrelated sources. One-space indentation
keeps the maintained configuration within the existing 64 KiB source-file
limit (54,271 bytes before the fact-format option); no package or projection limit grew.
The initial 91,458-byte and reduced 74,167-byte attempts failed that limit.
The corrected CLI declaration/scenario cases passed, two cases in
`/tmp/artroom-g1-grid-declarations-20261018.log`.

`packages/mcp/test/support/grow-operator.ts` joins the existing maintained
scenario's local Core/SQLite adapter to the real MCP service and custody.
The operator uses the scene's public TEST key. The original signed envelope
goes to native submission without being rewritten or signed again. Read
sessions, installation lookup, role lookup and inventory are stand-ins.
This local adapter founds a developer Room Directory root; it is not a native
Site-to-Room Lane installation. M2b supplies that separate witness.

The focused test `grow-operator.test.ts` first removes standing and checks
that no native intent is signed or submitted. With standing restored, a
current display authorizes the heater target once. Its reported value remains
null. A separately retained stale display refuses before another signature;
duplicate dispatch returns the original outcome without another submission.
Replay remains consistent. An initial signature counter accidentally included
the read-session signature; its failed log is retained. The corrected counter
counts only the native intent domain. This is a measurement correction, not
a change to the admission guard.

## Browser witnesses and a kit correction

The browser plugin was unavailable. These checks use cached Playwright
1.63.0 and Chromium 153.0.8010.12, without installing a package. The production
kit, generated resources, MCP service, custody, native local judgments and
SQLite projections run inside the existing kit test host. Scope installation,
membership and session authority remain the explicit fixture answers above.

`grow-views-browser.mjs` starts from the alert at the top of the Room grid.
At both 320 and 592 px it opens the generic record, authorizes the heater-off
target, shows the native receipt at entry 138, accepts separately signed
sensor/agent TEST inputs, authorizes restoration, then shows that same
incident closed over entries 136–146. Both runs replay consistently. Heater
target and reported state are checked separately after each authorization;
neither receipt proves device execution. Capture/report directory:
`/tmp/artroom-g1-operator-browser-both-20261018/`.

The browser flow exposed a generic kit bug: a successful record act returned
to summary mode, removing Back and the next controls. Records and logs now
retain detail and their declared display mode after success. Other cards
retain their existing summary behavior. The browser asserts Back after the
refreshed authorized state appears. One focused paired control forces summary
mode again: the unchanged witness fails by the Back assertion, without a
timeout, then passes after exact restoration of source and generated bytes.
Control script, run costs and hashes are recorded in
`/tmp/artroom-g1-record-detail-control-20261018.py` and its JSON/log siblings.
Each run is separately timed (about 6.58 s positive, 2.21 s changed, 6.46 s
restored); these are not a gate or total edit-cost measurement.

The browser checks private source rows are absent from model contexts, no
chat handoff occurs, errors are empty, and the card contains its content at
the measured width without horizontal overflow. The restored 320 px control
also checks unchanged successive contexts are not resent. The separate
390 px closed-scene capture is labelled as a separate fixture, not the
operator flow's closure. Receipt and closure captures at both widths were
visually inspected.

An earlier read-only smoke opened zone records by clicking the tall grid's
zone row at 320/592 px. Its later repetition failed a viewport hit-test during
host resize before any zone act. The full operator witness now follows the
required grid-to-alert path directly; it does not resolve or establish
reliable zone-row navigation. Both the earlier passing evidence
(`/tmp/artroom-g1-views-smoke-stable-20261018/`) and the failed repetition
(`/tmp/artroom-g1-operator-browser-record-20261018/`) remain separate. The
592 px earlier zone capture is scrolled past its heading. Zone records still
show raw centi-degree values and have no manual device controls or sparkline.
This is an explicit remaining presentation limit, not complete morning UI.

The renderer displays an actor's recorded member handle instead of dumping
the entire membership reference. It performs no membership resolution and
does not supply the separately queued member/presence work.

MCP typechecking and the three initial owning files pass: nine cases in
`/tmp/artroom-g1-operator-focused-record-20261018.log`, typecheck in
`/tmp/artroom-g1-operator-type-record-20261018.log`. These are focused checks,
not the final gate. The overview-to-Room witness boundary is with the planner:
the native M2b installation/navigation evidence and this local operator flow
are separate. No fabricated Lane reference joins the developer Directory
root to an apparent native Site. G1 is not submitted for completion yet.

## Resize and fact presentation follow-up

The geometry probe `/tmp/artroom-g1-grid-geometry-20261018.json` confirms all
four zone rows exist and the 320 px card reports its full 1,620 px height.
The failed pointer attempt scrolled after busy became false but before the
host had applied that height. The test now waits for actual containment
after returning to the grid, then scrolls and checks the main viewport hit
before using a real pointer click. Both widths pass, including zone Back and
the complete operator custody/closure path, in
`/tmp/artroom-g1-operator-browser-settled-20261018/`.

Chromium's full-page screenshot also omitted some off-screen nested-frame
pixels despite correct DOM geometry. Captures now temporarily expand only
the outer viewport to fit the measured card height, then restore the usual
1,100 px viewport before interaction. Card widths remain 320/592 px. The
new 320 px image shows all four rows and the footer. The earlier failure and
partial screenshots remain historical evidence; they are not discarded or
described as a production renderer correction.

The same declared fact list now accepts either its existing field-name
string or a bounded presentation descriptor:
`{field, label, scale, unit}`. Only projected integers or native integer
metadata `id`/`revision` can use it. Scale is an integer from 0 to 6; label
and unit lengths are bounded; fields stay unique. It shifts decimal digits
directly, preserving every digit of a safe integer without floating-point
division. Empty values display an em dash. This extends the shared form;
it does not introduce an application interpreter or change projection data,
authority, semantic declarations or captured revisions.

The zone record now shows Minimum 23 °C, Mean 26.5 °C, Maximum 27.4 °C,
Setpoint 24 °C, Band (±) 2 °C and In band 10 benches. Its context/fallback
no longer assumes a denominator of 25. Fallback explicitly names the native
temperature units where its template retains raw values. The maintained
configuration is now 54,860 bytes, still inside the original limit.
`formatFact` also handles negative fractions, zero, missing values, six
decimal places and MAX_SAFE_INTEGER exactly; non-integer values refuse.

Four owning bytes/MCP files pass ten cases in
`/tmp/artroom-g1-fact-format-boundaries-20261018.log`. Bytes and MCP
typechecks pass in the two `fact-format-*-type-20261018.log` files. The
non-integer-field binding control removes one condition, fails by the
unchanged descriptor-binding assertion, then restores the source:
`/tmp/artroom-g1-fact-integer-binding-control-20261018.log`.
The Page's owning build also ran; its generated bytes stayed unchanged.

The final formatted browser witness passes at both widths and the separate
390 px closed scene in
`/tmp/artroom-g1-operator-browser-formatted-20261018/`. Celsius text,
settled zone navigation, quiet context, two operator envelopes, separate
reported state, native receipts, exact same-incident closure and replay
remain checked. Both formatted zone captures were visually inspected.
The overview boundary, manual zone controls and sparkline remain separate
unfinished work; this is still not a full G1 completion or a final gate.

## Owned Site → Room continuity (19 October)

Planner decision `eae6f61d` requires one joint overview path, constant native
arguments on device records, and a bounded journal series. This checkpoint
implements the first part. The generic controls and series remain unfinished.

The browser fixture now creates a Directory launcher, Site and Room through
actual Core/SQLite creation, source delivery, result and confirmation entries.
The Site's retained Room reference selects the descendant through production
`projectionScopeOwned`, before the same Room supplies its grid, alert and
operator controls. No Lane reference or genesis is manufactured. The Node
adapter exposes the existing native namespace, birth and read-preparation
helpers; its background dispatcher and outside transport remain closed.
Installation lookup, read sessions, membership and per-key grants remain
fixtures. Manual transport delivers actual recorded native sends. This is
not production installation, enrollment, provider admission or device execution.

The native Room confirmation adds one journal position. A separate literal
owned-room scene relocates the original fixture's positive item/revision and
entry references by one; root item and genesis remain zero. Business outcomes
and temperatures stay literal. The original developer-root scenario is unchanged.
An initial relocation missed nested expected revisions and failed at step 3;
that fixture correction precedes the passing native custody test.

Other initial failures remain in the focused logs: the Node typecheck exposed
a Cloudflare-only ID type (now a generic opaque binding ID); the native path
refused Site creation while provisional (fixed by delivering its actual
confirmation); and the first whole browser run completed both open-incident
widths but failed preparing the closed scene because it counted closed alerts
as open. The sensor report now counts native open/held/authorized rows and
advances the receiving Site's test clock to the scene time before delivery.
No application guard was bypassed to make these fixtures pass.

`/tmp/artroom-g1-owned-operator-site-report-20261019.log` passes the native
custody test; `/tmp/artroom-g1-owned-operator-type-reported-20261019.log` and
`/tmp/artroom-g1-owned-scope-type-20261019.log` pass the owning typechecks.
The corrected browser run is
`/tmp/artroom-g1-owned-operator-browser-corrected-20261019/`: 320 and 592 px
flows select Site → Room → alert, sign two operator requests, preserve target
versus reported state, close incident 138 over entries 137–149 and replay
consistent. Both have 100 benches and no horizontal overflow. A separate
390 px closed scene reaches Room head 163. Site and receipt screenshots were
visually inspected. The failed earlier run and its partial captures remain
historical evidence. This checkpoint has no final gate or review request.

## Constant device controls and related records

The shared view act form now accepts optional constant `args`. Each supplied
field must exist and pass the native literal guard; every required field
must be supplied or have a declared default. The native guard moved unchanged
from derive into bytes and derive re-exports it, avoiding a second validator.
Two choices may name the same native act with different fixed fields. Their
retained IDs include the declaration index, while the signed native act name
stays unchanged. Renewed admission compares the complete fixed argument set
as well as current standing, row and secondary revisions.

Optional record links select a projected native local-item reference into a
record source of the same definition. They do not sign. The zone record links
to heater and vent records; each device record offers two same-item native
controls. Surface resources remain read-only. The maintained configuration is
60,712 bytes, below the existing 64 KiB limit.

The final focused run passes four files and 16 cases in
`/tmp/artroom-g1-device-record-final-focused-20261019.log`; four owning compiler
configs pass in `...device-record-final-types-20261019.log`. The native Grow
witness signs exact `set-heater` on/off and `set-vent` close fields through MCP
custody and Core/SQLite, preserves reported state, hides controls for a device
reporting error, and replays consistently. Pure fixtures separately check
bound field types, distinct choices and altered/stale admission.
`/tmp/artroom-g1-constant-field-binding-control-20261019.log` disables the one
literal check: four cases still pass and the unchanged constant-binding case
fails by assertion. The driver restores the source.

The full browser evidence is
`/tmp/artroom-g1-manual-device-browser-site-20261019/`. At both widths it keeps
the alert journey, then navigates Zone → heater and vent, signs four further
fixed native controls, and returns through the grid to the Site. A separate
sensor actor reports the closed alert count through the actual Room relation;
the Site reaches head 5 and shows zero open alerts. Room head 155 replays
consistent. The separate closed scene remains head 163. Heater-off and Site
closure captures were visually inspected; target off remains visibly separate
from sensor report on. Earlier attempts failed on fixture label capitalization
and a navigation race before Zone 1 had rendered; those failed logs/captures
remain historical. One test-packet attempt also supplied derived package keys
where pack input excludes them, and an initial test typecheck lacked union
narrowing; both were corrected before the passing run. No gate or review yet.


## Bounded native zone history

A record may declare `series: {source, field, label, scale, unit, last}`.
`source` names an existing journal source in that record's projection, so all
samples share its captured native head. Binding requires a non-null integer
field, an uncollapsed entries source, matching native on-item types and
1–64 samples within its declared limit. The host filters on native `on`,
keeps the last N entries in journal order and preserves each exact integer,
source time and fact reference. No collect, secondary lookup, sample synthesis
or smoothing runs. The renderer draws only these points, joined in source-time
order, and provides exact latest/lowest/highest values with times and an
expandable native-entry sample list. An empty window states that it has no
recorded samples. This is a recent window, not lifetime history or presence.

Grow's zone projection uses `report-zone` mean values in its existing 100-entry
window, with last 64, scale 2 and °C. The configuration is 61,269 bytes. The
shared exact decimal formatter now serves both facts and series labels.
The native custody witness reads Zone 2's literal 2400/2650 samples at
12:00/12:05 from the actual Room journal and checks the device links. Pure
presentation fixtures cover bounded selection, another item's later sample,
source facts/times, exact fallback and an empty selected-item window.
Four files pass 15 cases in
`/tmp/artroom-g1-zone-series-boundaries-corrected-20261019.log`; bytes, MCP and
browser compilers pass in `...zone-series-types-20261019.log`.

The selected-item control is
`/tmp/artroom-g1-series-selected-item-control-20261019.log`: disabling that
filter makes the unchanged case include another item's 8000 reading and fail
by assertion; six other cases pass and the source is restored. An initial
series-only declaration fixture accidentally inherited an act that required
new fields; it failed binding and was corrected to offer no controls. The
first series browser probe also counted before the newly selected Zone had
rendered; it is retained as a failed navigation probe, not a chart regression.

Final browser evidence is
`/tmp/artroom-g1-zone-series-browser-settled-20261019/`. Both 320/592 px flows
show two native samples while hot and three after cooling. The expanded
320 px capture shows exact temperatures, times and entries 126/130, with no
invented points. Both journeys still sign six operator intents, keep sensor
reports separate, close incident 138 over entries 137–149, return to Site
head 5 with zero alerts and replay Room head 155 consistent. The independent
390 px closed scene reaches head 163. The narrow series capture was visually
inspected. All authority and deployment boundaries stated above still apply.
The Page's owning build ran before the code checkpoint. No final gate result
or review approval is claimed by this development note yet.
