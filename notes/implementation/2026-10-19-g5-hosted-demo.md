# G5: hosted Grow demo — preparation

Request `78fba9fca56a28dc75cca37f88a0fbea334bdc2a`, promise
`e60fe0660ce663c14afe242ad6614bacbe91610a`. This separate preparation
starts from reviewed Main `3ed2a08a`. Actual reviewed G5a must land before
the integration witness and final gate. The frozen G5a views have not been
imported, executed or edited. This has no release packet, private dependency
view, simulator, whole gate, review, deployment or live acceptance yet. The
static landing-page portion and its focused checks are now prepared below.

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
