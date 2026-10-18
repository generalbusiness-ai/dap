# Grow G0 data and standard scenarios

This head supplies the Grow site's two native declarations and their
scenarios. Source request `abdf653c` and promise `f14b646a` sit under G0
`d3a42cb2`. The adopted planner decision `e72e4e83` keeps device-owner
outcomes separately labelled until G5a supplies the native command protocol.

The code includes reviewed Main
`feccbbcfef618ed560e441a7711ce80941b57c22`, tree
`b5a0a28f1b0809bf5b090689761ff5557f3c5998`. Production package source remains
Main's. G0 adds application data, fixtures and test wiring, plus the two
test budgets described below. It changes no
native judge, grant protocol, capability implementation or replay rule.
The [implementation record](2026-10-18-grow-g0-implementation.md) retains
the focused runs, failed attempts, controls and earlier private bridge.

## Two declarations compose the site

`examples/grow/site.ts` is a native directory declaration with three room
rows. Its create send names the exact digest of `room.ts`. The native result
and confirmation make a room active. Site summaries accept only the named
room's native relation. Counts stay unknown until an actual summary arrives.
Later revisions supersede older reports. A site is not an atomic snapshot
of every room.

`room.ts` is a lane declaration composed from device, zone, work and watering
forms. These are application declarations, not new native scope kinds.
The fixture commissions four zones, twelve devices and one hundred benches.
`presence.ts` derives each member's latest location from accepted comments.
It follows the signing member rather than treating a principal as that member.

Device commands write targets. Only sensors write reported state, level and
description. An error blocks ordinary commands. The operator's heater
authorization follows the current alert and proposal. Agents do not inherit
the operator's heater action through a shared principal. A late report can
remain different from the target.

Observe is a comment. Sensors classify a zone with report-zone using that
exact accepted summary and sample time. Climate closure requires an in-band
zone and the exact incident range. There is no recovering state or timed
closure. The two timers are an alert's sixty-second hold and a bench's
forty-eight-hour probe deadline.

Benches retain each metric's own accepted probe reference. Missing metrics
preserve earlier values; zero is valid. EC uses microsiemens per centimetre,
pH uses hundredths and temperature uses hundredths of a degree. Probe time
and deadline remain recorded after the bench becomes stale. A maintenance
report belongs to its named performer and does not replace sensor evidence.

Ordinary watering is inside strict opening and closing endpoints, with an
amount bound per record. An exception cites an actual probe for the same
bench and zone. The head grower approves or declines; irrigation fulfills an
approved request. Apply is a head-grower comment. These are recorded member
statements, not proof of physical watering or chemical application.

## Fixtures retain native history

The owning Grow cases use actual native judges, genesis, rules and replay
in memory. Authority, clock and peer inputs are explicitly scripted.
The site fixture judges child creation, result and confirmation, and retains
the actual foreign entry bytes for replay. It checks sender and revision
binding. This is separate from the single-root CLI fixture below.

The combined room case carries a vent jam, fan trip, cross-draft commands,
heater hold and authorization, simultaneous high-EC watering, maintenance,
late reports, guarded restoration and exact closure. The old signed
authorization is refused by its moved revision. Independent bench deadlines
become stale at their own times. All actual journals replay consistently.

Eight scenario-owner records cite actual accepted command facts but stay
outside native journals, state, capability operations and replay. They do
not simulate a native capability's reply. Device-error remains a stored
sensor report with its description. A native device owner is still G5a work.

Eighteen focused Grow cases passed before this Main refresh. The later
combined room witness strengthens its existing case. Existing Grow code and
tests are unchanged from `08d2445d`; maintained scenario data and preparation
are added afterwards. One-line controls and their intended assertions are
recorded beside each checkpoint. The final required gate is reported through
Gitseq at the completed submitted head.

The first G0 gate passes typecheck and all eighteen Grow cases, but fails
two functional I/O witnesses at the default five-second timeout. One runs
six separate CLI commands. The other validates and extends an archive in
both Git object formats. Both now have explicit thirty-second per-test
budgets. Assertions, fixtures, CLI child limits and archive resource limits
are unchanged. These are harness budgets, not runtime or latency contracts.
Each selected witness passes (`aef1e2`/`9e076f`, `0c4d0d`/`71b0a3`), with
both owning test typechecks (`b11036`). The Git run's temp-directory warning
and fallback to `/tmp` remain in its raw log. The failed gate remains evidence
of a failure, and the revised head requires its own gate.

## Maintained input passes the landed Main CLI

`examples/grow/check/` holds the source config, two scenarios and a labelled
static fixture page. `prepare-check.ts` generates canonical declaration JSON
from `site.ts` and `room.ts` into a new private directory. Existing destinations
are refused. The room scenario is 38,915 bytes and 199 steps. The site has
seven steps. Scenario data stays outside package content identities.

The actual CLI from an isolated checkout of landed Main runs `dap check` on
that prepared directory with empty custody variables (`9a0071`/`679b8e`).
It validates two declarations. The site passes seven steps and replays
through entry 5. The room fault passes 199 steps and replays through entry
160, reporting eight labelled non-native owner records. Stderr is empty.
Semantic id is
`sha256:c000fdac0decf912cd03f37e087638f59e7bf1c6821c9566c4fce04f599d3245`.
Presentation id is
`sha256:923b11ed38f7771ba6a010b18e61a69f46367194f00c0e4b77171000fdbbba9c`.
Both match the earlier private bridge.

The site CLI fixture leaves create sends queued. The selected room runs as
a scripted local directory root. It proves no child transport or hosted
birth. The separately labelled native site fixture supplies the creation
and delivery witness. Both use TEST authority, not enrolled membership.

The root checkout's installed dependency audit found two version mismatches
before any CLI execution or stamp write. It remains untouched. The public
CLI witness instead uses the exact landed Main tree with a verified COW
dependency copy: thirteen local workspace links, 106 matching versions and
zero installs. G0's separate dependency view is also verified. The only lock
change since its earlier view reclassifies the CLI's existing scope dependency
from development to runtime. Its ignored stamp changes only after that audit.

Public CLI logs use `/tmp/artroom-g0-public-main-check-20261018.`. The
prepared directory is recorded in `/tmp/artroom-g0-public-main-prepare-20261018.log`.
No unreviewed developer compiler, new command or dev host is used here.

## G0 acceptance remains bounded

The package declares no native capability or default role grants. Its acts
still require explicit grow actions, supplied by labelled TEST authority in
these fixtures.

This submission is application data and scenario evidence. Its static page
is a labelled fixture. Production screens, room installation, host birth,
physical sensors and devices, provider custody, photos and real archive
admission remain later milestones. G5a precedes G5. No deployment or
arbitrary-package isolation is claimed. Review and landing apply only to
this G0 head, and do not complete M1 or the larger Grow journey.
