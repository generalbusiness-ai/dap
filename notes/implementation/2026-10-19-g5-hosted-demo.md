# G5: hosted Grow demo — preparation

Request `78fba9fca56a28dc75cca37f88a0fbea334bdc2a`, promise
`e60fe0660ce663c14afe242ad6614bacbe91610a`. This separate preparation
starts from reviewed Main `3ed2a08a`. Actual reviewed G5a must land before
the integration witness and final gate. The frozen G5a views have not been
imported, executed or edited. The static page, pure simulation, bounded public
journal reconstruction and per-tick HTTP allowance are prepared and checked
below. Release packet, native tick/catch-up, whole gate, Source/review,
deployment and live acceptance remain pending.

The commissioned Source contains a separate signed demo release, a stateless
bounded cron Worker beside the package, an operator runbook, and the Grow
landing page/home card. G5 precedes P1–P3 and S2b runtime; S2a continues.
Builder local/dry runs create no Cloudflare resource. The operator supplies
the nonsecret trust row, deploys after review, provisions the actual room
and secrets, runs the runbook and records live acceptance. A person taking
an operator act in their AI app is actual acceptance, never a fixture claim.

## Existing boundaries checked

- The source package's semantic value is closed. Cadence and story period
  must be included in the signed packet without adding an unreviewed host
  semantic field. A presentation JSON asset is a possible existing form:
  asset media types admit application/json. The exact asset and simulator
  configuration must be bound by the packet-verification witness. Values
  will be whole minutes and the cron must respect its one-minute floor.
- The public SDK has bounded item queries, entry and history reads. It has
  no direct capability-record query. Reading open commands therefore needs
  a bounded journal reconstruction through public reads, with explicit
  coverage and a refusal to infer absence from an incomplete scan. No
  private SQLite inspection or new host read authority is implied.
- The simulator writes sensor summaries, report-device acts and owner
  answers under one real sensors member. Its catch-up and fault state come
  from the clock, declared period, current targets and journal, without
  private progress state. Native read, act, byte and time bounds, exact
  signed-request recovery and the stop-after-refusal fence still need their
  design and witnesses. Separate those from local physical cancellation.
- Current checked package roles declare admin only. The demo must explicitly
  declare and verify the intended sensor, climate, tender, operator and head
  grower permissions. Controlling an agent is not assumed to grant its
  controller's domain actions. The runbook must prove the actual member/key,
  controller and effective actions through native reads.
- The browser Room join screen redeems an existing person invitation or
  connects an existing config/key. It cannot issue a tender invitation by
  itself. Its uninvited tender-seat count is therefore zero. The Grow page
  will ask visitors to obtain a tender invitation; operator and sensors
  credentials will never be offered. Existing native admin issuance can
  create an explicit bounded invitation; that is different from public
  self-service seating.
- The existing browser page reads its own service and saved connection;
  it offers invitation joining, not a public arbitrary-room query setting.
  The final Grow link must be checked against the actual provisioned room
  and same-origin invitation flow. A generic /page/ address is not yet proof
  of selecting Grow. The deployment/runbook receipt must close that gap.
- Five built pages already exist: home, Room, Library, Counter and Jam.
  The homepage has four destination cards (Room, Library, Counter and docs);
  Jam is built but is not a current card. Adding Grow preserves those five
  pages and produces six built pages with five cards. Nothing commissions
  removing Jam. The strengthened existing build invariant will cover both
  the retained pages and the new Grow page.

## Delivery sequence

Prepare the separate package source/cadence asset, pure simulation and
bounded public-interface tick plan, runbook with a proving read after each
step, and static page using existing brand/header/style. Incorporate actual
G5a Main, then exercise real local native scopes and owner preparations,
including missed ticks and refusal fences. Verify the signed packet's exact
printed publisher/release, build-page invariants and rendered layout, then
run one exact-head gate and request complete independent review.

The operator's post-review receipt must record trust/deployment identity,
actual native room/install and first ticks, actual page-to-room navigation,
and person-in-AI operator act. Until then there is no hosted-demo completion
claim. Archive exit-test work follows the separate demo-room archive slice.

## Static landing page prepared

The Grow page reuses the existing child-page utility header, shared style,
brand masters and link-preview metadata. The home card links to `/grow/`.
The build retains home, Room, Library, Counter and Jam, adding Grow as the
sixth page and fifth destination card. The existing Node built-output
invariant was strengthened and passed; its first original log is
`/tmp/artroom-g5-hosted-home-first-20261019.log`. No checkout dependency was
installed or changed.

Rendered validation used cached pinned Playwright 1.63.0 and Chromium
153.0.8010.12 because the Browser plugin was not available. The scratch
script `/tmp/artroom-g5-hosted-home-browser-20261019.mjs` builds into its
own scratch directory and serves only those files on local loopback. At
1440×1000 and 390×844, home → Grow renders the expected title, heading,
shared header, separate-fact explanation and invitation guidance without
horizontal overflow, framework overlays or console/page errors. Both
screenshots were inspected; desktop retains the two-column hero and phone
stacks the workflow below the introduction. The browser process and local
server completed naturally with exit 0. Evidence is the matching `.log`
and `report.json`, `grow-1440.png`, `grow-390.png` under the script's
same-named output directory.

The primary link's exact existing Room invitation URL was checked and
clicked through a locally intercepted destination. No external request,
actual Grow room selection, invitation redemption or hosted acceptance was
proved. Actual post-review provisioned-room navigation remains an operator
receipt obligation. No public tender seats or credentials are offered.

## Simulator preparation and public coverage

Two dependent design points are with planner in request `771e183a`,
assertions `c96ffedc` and `9a0f62a3`: an application-journal cursor for
bounded command discovery, and separate sensors/climate principals. Native
Membership has five fixed roles; all agent principals have role `agent`.
A second key alone does not separate their role permissions. The proposed
demo declarations bind fixed principal party slots and exact signer guards,
with Site forwarding them to Room. That proposal and the cursor declaration
are not implemented yet. Owner enrollment must precede G5a installation;
the runbook must use that actual dependency.

The pure simulator now computes transient samples afresh from whole-minute
clock time, the declared one-minute cadence/sixty-minute period, current
zone bands and current device targets. Vent obstruction runs at minutes
10–34 and fan trip at minutes 20–39 of each UTC hour, in zone 2. The clock
clears these fictional faults; no person's repair is inferred. Vents 1 and
4 provide cross-draft; a working local fan cools; cutting the heater cools
the zone during the fault. Only min/max/mean/in-band summaries and reports
are returned; no raw samples or private progress state are retained. A
missed invocation produces the next current reading and does not invent
observations for missing times. This is not the pending native tick/catch-up
witness. The schedule file is prepared under `examples/grow/demo/` but is
not yet a verified signed packet.

The separate public-journal reducer takes a caller-proved closed prefix and
one exact head, then checks every entry's scope, position, predecessor and
computed hash. Its limits are 800 entries, 4 MiB of canonical suffix bytes
and 64 command-record changes. It keeps all open commands, including an
older target superseded by a newer one; only that command's own complete
closure removes it. Wrong full owner identity, gaps, incomplete suffixes,
head mismatch or a false closed-prefix claim refuse. It reads no native
record table. The caller's durable prefix proof and public read/tick wiring
are still pending. The reconstruction test scripts journal entries and
effects; it is no proof of native issuance or settlement.

Focused pure checks passed: two files/three cases in
`/tmp/artroom-g5-hosted-pure-owning-20261019.log`, plus the Grow TypeScript
compiler (`...command-types-final...log`). Preparation compiler failures
remain in the first/corrected/second type logs: the pre-G5a capability union,
a digest fixture's inferred string type and an incorrectly shaped fixture
Seed; they were corrected before the focused pass. The maintained simulator
witness distinguishes ignoring the recorded heater cut (two cases pass,
then one unchanged assertion fails, exact restore). The command witness
distinguishes ignoring the full owner identity (one case passes, then its
unchanged assertion fails, exact restore). Full logs are respectively
`/tmp/artroom-g5-hosted-simulator-control-20261019.log` and
`/tmp/artroom-g5-hosted-command-owner-control-20261019.log`; the standard
helper deletes its disposable JSON directory at exit. No mutation sweep.

Private APFS COW dependencies were copied from the idle clean S2b checkout,
without executing or modifying the donor. Audit
`/tmp/artroom-g5-hosted-dependency-view-20261019.json`, SHA-256
`1c2795792c513f27cf91b558b8f24ef42bc9f324aeada6372bdef772dd59fd8f`,
checks 127 manifest bytes/distinct inodes and 28 contained links, including
13 workspaces. Lock/stamp stays `3546b538…`; zero installs, no copied Vite
caches to clear. This is not a tarball-integrity check. No whole gate,
Source/review, provider resource, deployment or live acceptance is claimed.

## Public read and per-tick allowance

`readCommandJournal` now reads at most four public history pages through
one named head. It starts at the current native read interface's explicit
decimal position cursor, then follows the server's opaque continuations.
It accepts no missing page as completion and passes the whole selected
chain to the reducer. Newer entries can arrive while it reads; they do not
replace the named head or advance its acknowledged prefix. Native coverage
and the application cursor are still integration obligations.

The per-invocation HTTP wrapper allows only the configured service origin,
named scopes and the required public summary, query, history, entry,
session, settlement, act and preparation routes. Preliminary limits are
96 reads, 48 mutations, 256 KiB of request bodies, 4 MiB of retained reply
chunks and a 45-second wall window. The driver will also use a five-second
SDK per-request deadline. After the wall window no new request begins and
a late reply is discarded; an already-started remote act can still have
taken effect. The first chunk crossing the byte allowance is not retained,
cancellation is requested, and the local send fence closes immediately,
even if cancellation waits. This is not a claim that the remote act was
cancelled or that no over-limit chunk crossed the network.

Focused command/public-page and HTTP-budget checks pass (two files/two
cases), log `/tmp/artroom-g5-hosted-public-budget-owning-20261019.log`;
compiler log has the same prefix with `types`. The budget witness uses
scripted HTTP bytes. It proves no native bounds refusal or owner step.
An initial control selection was ambiguous and changed nothing; the next
exact one-line control exposed an assertion but the helper classified its
promise rejection as inconclusive. The test now joins its pending read
before asserting the fence. The same precise one-line bypass then gives
one pass → one unchanged boolean assertion failure → exact restore,
`/tmp/artroom-g5-hosted-budget-control-joined-20261019.log`. Earlier control
logs remain retained; only the joined control is distinguishing evidence.
No whole suite or mutation sweep was run.

## Signed schedule consumer prepared

`simulatorRelease` uses the existing package-v2 reader to verify an exact
expected release and signature, checks the exact expected publisher, then
loads only the signed `simulator.json` asset with media type
`application/json` and at most 1024 decoded bytes. The strict schedule
reader checks the whole-minute cadence and period. No deployment trust row
or publisher secret is stored in this Source.

Its focused witness uses real package codecs/signatures, the public TEST
publisher and temporary maintained fixture declarations. It verifies the
prepared schedule, refuses a wrong expected publisher or release, and
refuses an invalid schedule even when it is validly signed. This is not
verification of the final demo packet; that packet and its actual printed
publisher/release still need to be produced after the dependent declaration
decisions and actual G5a integration. The initial compiler caught the
nullable base64 decoder result, and the first witness setup incorrectly
passed already-derived package fields into the strict pack input. Both
preparation failures remain in their original logs and were corrected.
The focused case and compiler then passed, logs
`/tmp/artroom-g5-hosted-release-corrected-owning-20261019.log` and
`/tmp/artroom-g5-hosted-release-types-final-20261019.log`. The one-line
publisher-comparison bypass distinguishes one pass → one unchanged
assertion failure → exact restore, retained in
`/tmp/artroom-g5-hosted-release-publisher-control-20261019.log`.

## Operator runbook draft

`examples/grow/runbook.md` now records the known native cohort, immutable
packet URI shape, retained request/enrollment recovery, proving reads at
each phase and live visitor/person acceptance. It uses the actual configured
repository origin (`generalbusiness-ai/artroom.git`) and records the
owner-before-install dependency. It explicitly marks the pending principal,
cursor, final packet and Worker commands as unfinished; no placeholder is
presented as an executed step. It offers no public tender seat and separates
the existing Room invitation destination from actual provisioned-room
navigation. The runbook is preparation, not a deployment receipt. This
addition changes documents only and runs no tests or provider command.
