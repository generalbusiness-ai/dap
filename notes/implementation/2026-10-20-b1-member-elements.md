# B1: bounded member identity and display

Request `7b7cfef1abb0808614ad0d153e7f4914279b8896`, builder promise
`cc7e6e17c265c3d2c34415c309efecad49971f9a`, under compound `11b2f711`.
Planner created the separate milestone through `03e9ea14`, adopted as
`05ed8b2a`. The D1 design is already on Main. This implementation now
incorporates reviewed Main `248aab8f`, including K1, K2 and Grow hosting.
It imports no pending P1 or K3 implementation.

The one original ordinary gate passes at
`a2ffbf6720b1bd30c5393eeaebd6b308793216d2`, tree
`c8bea473b80698e5c3d4f4fc68c3b2cce5ca2a44`. The final change updates only
this report. Complete forty-four-path Source review and native landing
audits remain due. This is B1, not completion of B2 or B3.

## Resolve only disclosed, typed references

The resolver considers typed party, exact-fact signer and journal signer
fields from the captured declared projection. It retains each canonical
full member reference, including membership incarnation. Repeated
references share a membership read. At most 32 distinct references enter
the table; controllers consume that same budget after primary references.
Visible overflow counts distinct references outside the table. Arbitrary
values cause no identity lookup, and routed displays resolve only their
disclosed row. Rejected rows cause no lookup.

Identity, current standing, controller, opening fact and membership read
head remain separate. A roster answer at another head establishes no
action. Displayed actions are evidence, never native admission. Unknown,
missing or refused reads preserve the full recorded reference and an
explicit unavailable identity; they do not guess a name or current key.

The actual native adapter requires a read session bound to the exact
membership and current key. It reads at most 100 member rows, covering all
four standing states, plus one roster row. It follows no cursor and makes
no retry, wider lookup or signed fallback. References outside that window
stay unknown. No key or invitation body enters the display record. The
member table travels beside native data inside the existing 64 KiB view
allowance; it grants no new read or write authority.

## One element and text representation

Party, recorded signer and declared-view actor presentations use the same
member mark and text. Person initials use a circle, agents a square and
checkers a diamond, with upright initials. The mark is 32 px inside a
44 px target. Names and full-reference fallbacks wrap. Invited, removed,
lapsed, current-controller and unavailable states remain visible; removed
uses the garnet word treatment, not an unlabeled color. Measured removed
text contrast is 7.31/7.86 in its two tested palettes.

The public surface API has exactly five names: `member`, `onData`, `open`,
`root`, `signal`. The member factory returns a real HTMLElement with its
styles in the actual shadow root. Native data and member tables are
cloned for callbacks. Abort/context fences prevent late reads, callbacks
or elements from reviving a stale session. A display or an open callback
is not an enrollment, presence write, invitation or grant. This primitive
and its documented use do not claim a general view framework or B2/B3.

## Exact local-fact signer metadata

Planner decision `656d21f5`, adopted as `3879c591`, adds the declared
`fact-signer` source for an existing local fact slot. Contract, byte codec,
client, native projection and renderer carry its nullable member result.
The reference must match the exact scope, sequence and hash. Missing
retention, missing legacy index or hash mismatch yields null for that
field. The reader does not scan old entries, backfill them or infer their
author from today's key/member mapping.

SQLite records `entry_fact_signer(seq, hash, member)` when an authenticated
act is appended, using the matching recorded authority. The entry-delete
trigger clears its index row. It changes no old journal or signed packet.
The indexed left join matches both sequence and hash, reads no entry body
and handles at most 100 references. Each reference reserves 768 bytes of
metadata and its existing call/page budget before SQL. The client removes
this derived signer from ordinary party/ref/value adapters so only the
declared source exposes it. Retained identity and present standing remain
different facts.

The native witnesses cover exact retained authorship, missing retention,
legacy absence and changed-hash refusal. A targeted hash-join bypass makes
the unchanged mismatch assertion fail; the exact source is restored. The
resolver's separate bound control also distinguishes the read ceiling.
Neither is a mutation sweep or an unchanged full-suite rerun.

## Grow and the authority boundary

Planner decision `8d3585a3`, adopted as `b572b939`, keeps the maintained
default role map byte-exact to Main: administrator only, with no new agent
`grow.tend` grant. The required real native probe uses the person Rita.
Agent/controller examples stay available in an alert card. The browser's
agent-prober example has an explicit TEST grant and roster; it is a
presentation stand-in, not evidence of production agent admission.

The Grow grid uses one member element in its last-prober column. It reads
all four declared benchmark fields, including `layers`, and shows missing
signer data as unavailable. `work.ts`, the existing sixteen-effect budget
and metric meanings remain unchanged. No extra operational effect or
default role is added to obtain a screenshot. The signed public Grow demo
packet and its release `sha256:71e10ca9…` remain byte-identical to Main.
Maintained package fixtures are separate. No live demo release, operator
key, invitation, deployment or hosted visitor acceptance is part of B1.

## Owning checks and browser evidence

Focused checks cover resolver bounds/context, routed disclosure, native
member sessions, exact signer reads, client filtering, declared views,
resource freshness, real native application projections and Grow probes.
Their exact original commands, natural closures and TEST boundaries are
retained. A native signer read is not a browser-persistence or provider
result; a browser's fixture identity/grant is not native authority.

The actual Chromium captures cover member/actor states, real mounted API
elements and Grow displays at both widths and palettes. The final Grow
run is original `98919`, naturally zero, with eight PNGs inspected. It
uses actual Core/Node SQLite application data, 100 commissioned benches
and explicitly fictional presentation identities/rosters/grants. The
separate declared-surface browser run also passes. Earlier failed and
intermediate captures remain distinct, including the provisional v5 and
final v6 Grow outputs; no failed setup is called a passing screenshot.

The Browser plugin was unavailable, so the recorded fallback uses pinned
Playwright 1.63.0 and Chromium 153.0.8010.12 in a private test profile.
Exactly 134 explicit browser-tool regular files were physically copied
from the D1 finite grant, with exact bytes, hashes and current modes,
distinct inodes and originals rechecked unchanged. That is 218,115,377
bytes and zero installs. Browser profiles, adjacent caches and private
custody are not part of any review grant. The finite Source map names only
those explicit tools, closed artifacts and screenshots.

## Main integration and retained failures

The owned checkout is `/tmp/artroom-builder-b1-member-elements-20261020`,
branch `request/b1-member-elements-20261020`. Its current code includes
actual reviewed K2/G5/K1 Main. Original conflict stages remain: the earlier
fact-time fixture conflict has three stages, and the K1 integration has
three conflicts with nine stages. No conflict exit is reported as a clean
merge. The former keeps Main's fixture signer plus B1's extra field; the
latter keeps B1's member-aware projections with Main's shared helpers.

The first K1 resolution driver writes two files and stops at its MCP
replacement assertion. A subsequent staging step briefly includes the
unresolved MCP markers, but no project execution or commit uses them.
All three are corrected before checking. The partial files, stages and
final resolution are retained. The first full compiler then fails on an
unused local series `text` helper. The correction names it `seriesText`
and uses it for latest/lowest/highest samples, preserving units and times;
Main's global `displayText` keeps its different meaning. One initial
correction assumes the wrong signature and stops before writing. The
failed input and corrected hashes remain evidence.

Affected workspace compilers then pass in v2; the six configurations that
the first failed pipeline never reached pass separately in v3. The v2
Node command names a nonexistent member-elements file and actually runs
only seven declared-view cases; no member cases are claimed for it. The
subsequent real selection passes three member cases and two resource cases
but fails generated-resource freshness. The old generated module is
retained, the owned generator rebuilds all four cards, and the unchanged
freshness case passes separately. Two byte files/eight cases and three
native files/three cases then pass. These are separate runs, not one
passing pipeline. Their logs use `/tmp/b1-k1-main-*20261020*`.

Earlier failures also remain: the native Grow fixture tries an unplanned
seventeenth effect; the agent probe is refused by the unchanged role map;
several person/captured-session/browser setups require correction; a
missing `layers` field stops the first grid fixture. Each corrected run
keeps its actual scope. A whitespace error is mistakenly committed after
a printed failing check; the next document-only commit removes it. No
gate or Source is issued at that failed-check checkpoint.

The Page generator then refreshes its module for the combined source,
SHA-256 `d5afe13249a20b4a53ebe4187ad4ec2ce331b5d2473d8687bc10a2d900f2ec93`.
This happens before B1's first gate, with the old module saved. Main
`248aab8f` incorporates cleanly with no conflicts: all nine imported paths
match Main and all forty-four authored paths retain their bytes/modes.
Its three affected homepage/Jam Node cases pass. The old gate helper,
prepared for `f489ac8b`/43 paths, remains unrun; a new independently copied
and retargeted helper runs the actual current-head gate below.

## One original gate and full review

Original process `75657` naturally exits zero at clean `a2ffbf6720b1`,
tree `c8bea473`: all compilers, helper and whitespace checks pass. There
are 415 passed Vitest files and one skipped file, 1,985 passed cases and
three existing skips. All 33 Node and 55 Counter Node cases pass. No
full-suite retry or package install occurs.

Measured `npm run gate` wall time is 540.967489250 seconds; child CPU is
787.204203000 seconds. Its test step reports 531.2 seconds wall and 752.6
CPU; these are that run's step figures, not sums of separate runs. The
shared warm macOS 27.0.1 arm64 host runs Node 26.12.0/npm 11.20.0, initial
load 2.56/2.56/2.99. All 2,580 tracked source rows retain exact bytes and
modes; all 5,530 dependency rows remain exact except the owned Vitest
result cache. The lock stamp remains exact and the checkout stays clean.
Original argv, full inputs/outputs and natural closure are
`/tmp/b1-current-main-gate-v2-20261020*`; raw phase logs are under
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.fwSnGp2b3f`.

Raw output retains deliberate reset/retention faults, four Git body text
warnings and an unclassified different-Durable-Object I/O /
RefcountedCanceler diagnostic in the runner's abort path. A passing
assertion or zero exit supplies no case attribution, infrastructure
classification, clean-output, general stability or physical-draining
conclusion. The final candidate changes only this report after the gate;
its two tree hashes are recorded, without repeating unchanged suites.

The full earlier report is preserved by Git at `a2ffbf67` and as
`/tmp/b1-prior-primary-20261020.md`. Closed failure inputs, controls,
raw logs, conflicts, copies, tools and captures remain in the explicit
finite Source map. Path prefixes above are locators, not adjacent grants.
No unrecorded old mode or full input is invented from today's files.

Every granted original source, dependency, script, helper, sealer and log
is permanently frozen: never execute or edit originals, including after
approval or landing. Physically copy only named regular leaves and
contained links, preserve modes and distinct inodes, retarget every path
and use matching historical inputs before copied execution. Nested maps
grant no additional files or links. No operator/publisher/agent private
custody, browser profile, shared cache, provider or deployment grant is
included. Return all findings together in one complete exact-head review
of all forty-four paths. Planner alone owns Cloudflare and hosted work.
