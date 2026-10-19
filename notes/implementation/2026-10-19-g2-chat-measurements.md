# G2: measurements from chat

Request `321c54ee381f5453b6a6073ca433505115c5d6df`, promise
`3f6dbedaa6828f3d85823ac83177a47efb588440`. This head starts at audited and
published G1 Main `b54f8880`. G2 takes priority over further P1–P3 work.
P1 is saved separately at `f8b742ab8`; no P1 completion is implied.

The intended head covers declared scalar inputs beside G1's constant native
arguments, the oldest-probe bench carousel and its advancement, and the three
grid layers. No application view code belongs in the host. Native probe values
are moisture 0–100, EC 0–10000 stored in thousandths of mS/cm, pH 0–1400
stored in hundredths, height 0–5000, insects 0–10000 and a note up to 1024
UTF-8 bytes. Human decimal input must convert exactly, without rounding.
Unknown fields, overlapping constants/inputs and ranges outside the native
field's bounds will refuse before signing. Template parameters (P5) are a
separate semantic form.

The native probe keeps a fact reference per supplied metric. Its one overall
probeTime cannot stand for the age of every retained value: omitted metrics
remain old. The three layers must use their own recorded sources and qualify
missing age evidence. Planner decision `2efe6272cfd3d97a475a4cade777f9896cdccc4b`
selects the bounded same-scope fact-time form with the item's read visibility,
and scouting's insect fallback/later time. That decision is implemented.
Temperature retains summaryTime; no native slot, effect or wire allowance is
raised. The test host has no external LLM backend. Its reproducible typed-text
consumer is explicitly scripted. Separate actual Codex command-bridge calls
are labelled observations and are not gates or model API transcripts.

Preparation is a private APFS COW dependency view with zero installs. The
maintained 106 versions, four nested named manifests and 13 internal workspace
links match the frozen G1 donor, with separate manifest inodes. Only the new
checkout's Vite caches were removed. Audit
`/tmp/artroom-g2-dependency-view-20261019.json`, SHA-256
`006fbddb896e866cba4e405e898f1bd40b5279112913a762d90a576e0a1e8a83`.
This is a manifest/link copy check, not a tarball-integrity claim.

The focused and browser witnesses below pass. The first whole G2 gate failed
two integration checks; its corrections and evidence are below. A complete
gate pass is now recorded below; independent exact-head review and landing
are still owed. Routing,
device-owner outcomes, hosting, photos and custody remain separate work.

## Scalar declarations and native binding checkpoint

The act declaration now accepts a bounded `parameters` map beside fixed
`args`, with integer, decimal, text and enum inputs, labels, units, ranges or
allowed words, and required flags. Names come from native fields. Binding
refuses unknown fields, a constant/input overlap, incompatible types, wider
native ranges or a required field without a required input/constant/default.
The form still allows at most two acts on its own selected item.

Package declarations retain native integer bounds. A decimal's scale describes
the human input unit; EC's 0–10000 with scale 3 means 0–10 mS/cm to its tool.
Human decimal numbers exist only in transient input. Conversion shifts decimal
digits exactly into native integers, including exponent spelling, and refuses
excess precision or unsafe results. Omitted readings remain absent. Incoming
flat scalar properties are owned without executing getters, and unknown keys,
non-scalars, excessive bytes and invalid ranges refuse before native fields
are built. Native canonical JSON remains integer-only.

The initial attempt incorrectly sent decimal model input through native
`applicationJson`, which correctly rejected it; declaration bounds are now
native integers, and transient input has its own bounded scalar boundary.
The first owning test compiler also caught index-signature property access;
those accesses are corrected. Failed logs remain historical.
Two owning bytes files pass nine cases in
`/tmp/artroom-g2-parameter-binding-initial-20261019.log`; bytes and MCP owning
compilers pass in `...parameter-binding-types-20261019.log`.
`...decimal-precision-control-20261019.log` disables the divisibility check:
one unchanged scalar assertion fails because fractional readings would be
rounded, the other case passes, and the driver restores the source.

This checkpoint implements parsing, scalar conversion and native schema
binding only. Derived model tools, fresh standing/revision admission, the
carousel, layers and the typed-text journey still need implementation and
owning witnesses. No G2 gate, review or completion is claimed.

## Derived input tools checkpoint

Each parameterized act now derives a stable model-visible tool with human
units, exact precision guidance and a closed values schema. The caller names
the retained view, selected item and revision, and a request key. The host
owns the target, native act, constants, expected subjects and custody key.
It repeats the declared when/standing/revision admission inside the perform
callback, then combines only decoded scalar fields with the fixed constants.
App act calls cannot bypass measurement entry. Their buttons hand off to chat.

Concurrent duplicate input keys share one promise. Completed retries return
the original context and receipt even after advancement or lost standing;
changed meanings refuse. There are at most 32 retained inputs per view.
Unknown outcomes retain the original custody request and its check button,
including after a carousel refresh, and offer no successor measurement.
Accepted outcomes refresh position zero for the forthcoming oldest-first
order. Model results contain only the opening context/identity and receipt;
private card data and raw native response fields stay out of this path.

The two MCP owning files pass ten cases in
`/tmp/artroom-g2-model-input-focused-20261019.log`. These use scripted model
calls, read answers and a perform callback that counts admission; they prove
neither an LLM call nor a native accepted probe. The owning test and browser
compilers pass. Their first test-compiler attempt found missing `required`
flags in three fixture fields and index-signature access; these are fixed.
`...model-input-admission-control-20261019.log` removes the current admission
call: two cases pass and the unchanged lost-standing assertion fails. The
driver restores the source. Native Grow, ordering, age/layer and browser
journeys still need implementation and owning evidence.

## Carousel order checkpoint

A carousel may declare one integer or timestamp field from its complete
`many` source, ascending/descending direction and missing-first/last. Ties
use ascending native item IDs. Binding refuses text/absent fields, partial
item reads, other view kinds and executable or unknown order properties.
Selection sorts a copy, leaving the exact projection data in native order.
The accepted input's refresh selects the newly oldest item at position zero.

The owning bytes file passes eight cases in
`/tmp/artroom-g2-carousel-order-binding-initial-20261019.log`; the two MCP
files pass eleven in `...carousel-order-native-time-20261019.log`, including
missing readings, tied times, both directions and post-accept advancement.
Both owning compilers pass. Initial fixture timestamps incorrectly included
`.000Z`, which native canonical time refuses; they now use the native form.
The test compiler also required narrowing the item/journal source union.
`...carousel-order-control-20261019.log` removes ordering: three cases pass
and the unchanged oldest-first assertion fails. The source is restored.

The two-clock age option is ruled out: bench has 11 native value slots with
a limit of 12, and probe already uses all 16 allowed effects. Two extra clocks
would exceed both limits. A same-scope fact-time projection from the existing
per-metric fact refs is proposed to planner; no allowance is raised and no
metric's age is inferred from the overall probe time.

## Native measurement checkpoint

Grow declares a `benches` carousel ordered by `probeTime`, with the six
optional native measurement fields, and the same form on a bench record.
EC and pH display in human units. The TEST operator helper may select the
existing tender actor; its default heat-operator path is unchanged.
The new sections are compact JSON to stay inside the existing 64 KiB source
metadata allowance (65,033 bytes). The initial expanded source exceeded
that allowance and refused before preparation; the allowance is unchanged.

`/tmp/artroom-g2-grow-measurement-native-local-facts-20261019.log` passes the
Core/SQLite owned Site/Room witness. C4 is actually probed first on October16,
then the other99 benches on October17. The October18 stale event changes
C4's revision before submission. Lost `grow.tend` and that stale revision
refuse without an MCP signature. The current call signs one native `probe`
on item45/revision3 with exactly moisture31/EC2100/pH590/note. It records
entry225, leaves height/insects and their refs absent, refreshes to A1/item22,
and repeats without a second signature. Supplied metrics point to225 and
the native journal replays consistently.

Literal-assertion tightening had three failed attempts: it initially confused
item revision with journal position, omitted the native Site summary/result
round trip when counting entries, and expected a full fact in Core's internal
local entry-ref slots. The witness now keeps those boundaries distinct;
failed logs remain historical. The unchanged G1 operator case passed in
`...grow-measurement-exact-native-20261019.log`; the MCP owning compiler
passes in `...grow-measurement-types-20261019.log`.
The typed text and consumer fields in this witness are explicitly scripted;
an actual-model invocation, age layers and browser proof are still owed.

## Fact-time prototype checkpoint (read policy superseded below)

The generic projection may select `from: {kind: "fact-time", name: slot}`.
Binding requires a native fact ref under this definition's name, time output
and matching optionality. Local entry-number refs resolve only under the
captured scope; full refs must name that exact scope and match its hash.
Future, foreign, conflicting, missing and malformed evidence refuses. Absent
refs remain null. The client keeps the timestamp as projected data and does
not fabricate a native value or ref slot for subject/guard resolution.

The native owner reads only the selected seq/hash/time index metadata, in
at-most-100-key batches. It charges candidates and a conservative 160 bytes
per row to the source's existing page allowance before each lookup; it does
not read entry bodies, scan a recent window, reset a budget, call a peer or
raise an allowance. Pure checks bind the metadata to the same captured head
and exact selected refs. This relies on the native owner's immutable entry
metadata, and is not an independent cryptographic entry-body verification.
This prototype required history access even without a journal source;
planner decision `2efe6272` supersedes that restriction below. The native
owner's final authority check still runs after metadata reads.

Two owning bytes files pass six cases in
`/tmp/artroom-g2-fact-time-local-ref-bytes-20261019.log`. The native production
owner passes in `...fact-time-final-authority-20261019.log`, including actual
installed Counter reads, history denial, eviction, missing evidence and
session loss after metadata. The budget file passes three cases in
`...fact-time-budget-focused-20261019.log`; the client observation file passes
in `...fact-time-client-boundary-20261019.log`. Scope, client and MCP owning
compilers pass. Initial attempts exposed local entry-number refs in native
item replies, a readonly fixture effect array, and an overly broad SQL
stand-in argument type; these are corrected, with failed logs retained.

`...fact-time-history-control-20261019.log` removes fact-time's history
requirement and the unchanged native denial assertion fails. The separate
`...fact-time-budget-control-20261019.log` removes the metadata charge: two
cases pass and the unchanged admitted-cost assertion fails. Both drivers
restore source. Grow's per-metric layers and old-ref journey still need to
consume this form; this checkpoint makes no G2 acceptance claim.

## Grow ages and layers checkpoint

Grow's bench carousel and record select each metric's own fact timestamp.
Age facts bind only to time fields, retain the absolute native timestamp,
show missing evidence as absent and report a clock before the reading instead
of inventing a fresh age. Card ages use the MCP host's clock for display only.
The grid declares a separate, smaller `layers` projection; the original `grid`
projection used by maintained native scenarios is unchanged. Compact source
sections keep metadata at 62,231 bytes without raising its allowance.

The application-owned grid HTML now switches temperature, moisture and
scouting, shows value and age, fades readings at least two days old, and opens
the declared zone or bench record on cell selection. Scouting colour conveys
presence/age, with no inferred severity. Layer ages use the device clock and
say so; they report unavailable time or a clock behind the reading. A local
minute timer updates ages without model context traffic. Browser verification
is still owed for these HTML changes.

The stable mounted-view key is now part of the context line/metadata so the
model can address an input tool after app navigation. No volatile display cut
is exposed. The model input fixture builds its routing fields from that
public context. Production card resources have been rebuilt from source.

`/tmp/artroom-g2-native-age-old-fact-20261019.log` passes three MCP cases;
`...age-form-binding-20261019.log` passes nine bytes cases. The unchanged G1
operator and new native layer-data case pass in
`...grow-layers-native-data-20261019.log`. C4's metric fact124 remains readable
at head224, outside the last100 entries. Before/after layers retain exact
25→31 moisture and baseline→leaf-edge-curl note with their own timestamps.
`...sparse-native-alarm-drain-20261019.log` then proves an EC-only probe on
October20 makes the bench fresh while moisture/scouting stay two days old.
Initial sparse-probe attempts captured revisions before the bounded native
alarm drain finished and correctly refused `revision-moved`; the fixture now
finishes those alarm turns before its next explicit actor call. No guard or
budget was relaxed. Owning compilers pass; age/context/resource checks pass
nine cases in `...age-context-card-resources-20261019.log`.

No G2 gate, browser acceptance, actual-model invocation, review or landing has
run. The final head still owes those checks and its complete evidence map.

## Decided read policy and final focused witnesses

Planner decision `2efe6272` was read in full and adopted. Fact-time follows
the item's session visibility, exposing timestamp metadata only. A session
without history receives the same clock-only projection bytes; removing
scope visibility refuses both the item and fact-time reads. Journal windows
still require history. The native scope witness passes in
`/tmp/artroom-g2-fact-time-same-item-read-20261019.log`. Its first denial
fixture removed `items` while still granting the `summary` visibility used
for live rows; the corrected fixture removes all scope-read visibility.
The older history-control evidence belongs only to the superseded prototype.
`...fact-time-item-access-control-20261019.log` adds that obsolete restriction
back: the unchanged same-item-access assertion fails, then source is restored.
The builder's attempt to ratify the planner assertion was ineffective because
it lacks the ratifier role; adoption is acknowledged without claiming force
from that attempt. The planner's addressed decision is the design basis.

Scouting now shows note/insect inputs, including a recorded zero count.
It uses insectsTime when a note is absent and the later timestamp when both
exist. The record retains each metric's separate age. Native zero-insect and
old-note evidence pass in `...scouting-zero-insects-native-20261019.log`.
The source config is 62,875 bytes, below the unchanged 64 KiB allowance.
The authoring guide documents parameters, order, fact-time and display ages
in `docs/application-views.md`; 502 relative links pass with none broken.

Final form inspection corrected coercion of array-shaped order enums and
refuses decimal bounds whose advertised human-unit endpoints cannot convert
back exactly. Eleven cases pass in
`...final-form-boundaries-20261019.log`. Plain absent facts now show a dash,
and bench facts use explicit percent/mm units.

## Browser and model observations

The production card build includes stable view routing in context, chat
handoff buttons, Back from a carousel and read-only recovery when a model
input advances the server display between app polls. Busy automatic reads
reschedule; stale navigation is not repeated. A lost reply that follows a
committed probe must retain its captured card/check on automatic refresh,
even when native sorting has moved that bench. The scripted committed-unknown
case and existing session cases pass in
`...unknown-committed-carousel-20261019.log`. Removing this retention gives
three passing cases and one unchanged item-identity assertion failure in
`...unknown-committed-carousel-control-20261019.log`, with source restored.

The maintained browser driver is
`packages/mcp/test/grow-measurements-browser.mjs`. It uses cached Playwright
1.63.0, Chromium153.0.8010.12, existing tsx4.21.0 and Node26.12.0, with zero
installs. Browser plugin tools were unavailable. Direct Node strip-only mode
initially refused TypeScript parameter properties; the existing tsx runner
is the supported invocation. The first 320 px journey passed its native/UI
checks but exposed a long select overflowing the card; a flex-width fix
resolved it. Logs/captures from these attempts are historical.

`/tmp/artroom-g2-browser-decided-20261019/` contains the reproducible final
scripted 320/592 px captures, proof and report. C4 is oldest among100 benches.
The typed consumer supplies31/2.1/5.9/note, producing one native `probe` on
item45/revision3 at entry231 and advancing to A1/item22. Before/after moisture
is25 at2d then31 at0m; scouting baseline at2d becomes leaf-edge-curl at0m.
Temperature is24°C at0m. A1 has an older note plus a later insect count;
A2's zero insects is present, and missing A3 scouting remains striped.
Layer switches and unchanged refreshes add no model context. Private reads
are app-only, context has no raw card fields, resize applies, neither width
overflows, browser errors are empty and the native journal replays.

`/tmp/artroom-g2-live-decided-20261019/` is a separate live observation.
The current Codex assistant read only the exposed tool schema and public
context, chose the fixture prompt's human-unit inputs, and called that local
MCP tool through a command bridge. Its exact request, result and attribution
are retained beside the browser proof. One signature/native entry231,
advancement, refreshed layers and replay pass. The host contains no LLM
backend. This is one labelled observation, not an external model API
transcript, a prose-accuracy measure or a gate. Earlier live/scripted230
observations are historical; the extra older A1 note makes the final entry231.

The unchanged G1 browser driver passes both320/592 px six-intent journeys and
the separate390 px closed-incident case in
`/tmp/artroom-g2-g1-browser-compat-20261019/`. The prior G1 evidence remains
immutable; these are new compatibility observations in this checkout.
All browser processes are closed; the final successful scripted/live runs
closed with exit0. Initial failed attempts remain labelled. The live bridge
now pauses stdin after its caller signal so it exits without an EOF prompt.

## First whole-gate failure and corrections

At `a7acb9a2850c3544b86bb3c44b7b1c2bed2466e6`, tree
`d0b9873e53121c3c7796867ad8ae5d1a87d36541`, original PTY86264 closed1.
The dependency check skipped installation and whitespace/type checks passed.
The full Vitest phase passed395 files/1915 cases, failed2 files/2 cases and
skipped1 file/3 cases. Chained Node and Counting phases did not run. This
attempt is not a passing gate. Assertion
`0204ebac6af50a68474125d7e25d2a100f5adb9f` records that result.

The Page build was stale after the client projection adapter changed; the
owned Grow test compared the new surface's `layers` projection to the old
`grid` read. The correction regenerates Page from maintained inputs, keeps
the original grid assertions, then adds an SDK `layers` read and exact view
parity through the same real installation. No admission or test assertion
was weakened. The owning cases pass separately in
`/tmp/artroom-g2-page-assets-after-gate-20261019.log` and
`...owned-layers-parity-after-gate-20261019.log`; the scope test compiler and
whitespace check pass. This failure requires a new complete gate.

The original failed command took494.63 elapsed/696.04 summed process CPU
seconds (599.70 user/96.34 system). Its test phase took486.20 elapsed/664.78
CPU seconds; typecheck8.2/31.0. This was one warm shared macOS27.0.1 arm64
machine with18 CPUs and starting load2.07/1.81/1.73, zero installs. It is
not exclusive CPU, physical heap or total edit cost. Log
`/tmp/artroom-g2-gate-20261019.log`, outer time `...gate-20261019.outer.time`,
raw logs `/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.9YLcELuT4f`.

## Passing complete gate and exact-code review handoff

At `1a1c4abe84ddd5736359dd2271e888e8c4b402e8`, tree
`cceb89850edcd5392bcf2c83b66e3a3845d9aa36`, original PTY35426 closed0.
The clean checkout skipped installation from its verified lock stamp.
Whitespace and typecheck passed. Vitest passed397 files/1917 cases with
1 file/3 cases skipped; Node31 and Counting55 passed. Assertion
`aaa3c56632c8ab92f2d523cfe7d83f0149194ccd` records this corrected pass.
The failed a7ac attempt remains failed and separately retained.

Outer elapsed485.82/summed process CPU688.02 seconds (591.77user/96.25sys).
Typecheck took8.25elapsed/31.68CPU seconds; test477.34/656.12. The warm
shared macOS27.0.1 arm64 machine had18 CPUs, Node26.12.0 and starting
load1.73/2.04/2.09, with no other builder test/compiler/browser process at
the gate's start. This is not exclusive CPU, heap, provider usage or total
edit cost. Log `/tmp/artroom-g2-final-gate-20261019.log`, SHA-256
`9760ad4533ac68a5976bb4a8a3830394f140245bf26920cc9f45678b934c9298`;
raw `/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.uqePaJQ5fK`.

Post-gate exact-code evidence is in
`/tmp/artroom-g2-gated-browser-20261019/` (scripted320/592) and
`/tmp/artroom-g2-gated-live-20261019/` (separate labelled live320 observation).
Both original processes closed0. A clean-head input manifest records all41
changed files before those runs; every hash remained unchanged afterwards.
One signature/entry231, nextA1, metric ages, zero-insect/later-time scouting,
quiet context, app-only reads, resize, no overflow/errors and replay pass.
These directories supersede the earlier observations for exact-code review;
the earlier evidence remains historical. The live observation is not a gate.

The finite map is
`/private/tmp/artroom-g2-review-evidence-map-20261019.json`; its digest is in
the primary artifact and review request to avoid a self-referential note.
It includes the candidate files, gated/checkpoint Git snapshots, owned logs,
controls, browser proof/captures, raw gate outputs, dependency manifests and
the new sealer. Only this evidence note differs from the passing code head.
Every listed leaf, the sealer, this source checkout and its dependency view
freeze at sealing. No adjacent-directory, credential/custody, provider,
push or deployment right is granted by the map. Unchanged tracked code is
available through the exact review commit. Older frozen G1/S1/M2 views and
sealers remain untouched.

Review should name these owning boundaries:

- `packages/bytes/test/application-view-parameters.test.ts`: exact scalar
  conversion, native bounds/precision, omission and closed declarations.
- `packages/mcp/test/declared-view-inputs.test.ts`: context-routed tools,
  current pre-sign admission, duplicate retention and committed-unknown
  carousel retention, with explicit scripted read/perform ports.
- `packages/mcp/test/grow-measurements.test.ts`: actual owned Core/SQLite
  probe/signature, old fact outside the journal window, missing metric nulls,
  sparse EC/scouting ages, fresh layers and native replay. Install, membership,
  session and standing lookups remain stand-ins.
- `packages/scope/test/application-projection-native.test.ts`: production
  read owner, exact recorded timestamp, same-item-session access/denial,
  missing evidence, final authority and eviction. The extended Counter
  definition is a native fixture, not a production Counter change.
- `packages/bytes/test/application-projection-binding.test.ts`: non-fact
  slot and foreign-under refusal. `packages/scope/test/item-query-budget.test.ts`
  owns the unchanged budget boundary with labelled SQL stand-ins.
- `packages/scope/test/grow-owned-scopes.test.ts`: actual installation and
  Site-to-Room ownership, retained original grid coverage and SDK/view parity
  for the separate declared layers source.
- `packages/mcp/test/grow-measurements-browser.mjs`: reproducible scripted
  text/schema/native/UI path, both widths and all three layer/navigation cases.

G2 remains unreviewed and unlanded at this handoff. Planner owns later
publication and any Cloudflare work; no builder push/deployment is claimed.
