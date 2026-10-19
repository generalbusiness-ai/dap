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
missing age evidence. A bounded same-scope fact-time read or two retained
per-layer clocks are under consideration; temperature already has summaryTime.
The test host has no external LLM backend. Its typed-text tool consumer will
be labelled as scripted and distinguished from a separate actual-model
invocation. Host parsing will not be presented as model behavior. These form
boundaries are stated to planner while independent schema work proceeds.

Preparation is a private APFS COW dependency view with zero installs. The
maintained 106 versions, four nested named manifests and 13 internal workspace
links match the frozen G1 donor, with separate manifest inodes. Only the new
checkout's Vite caches were removed. Audit
`/tmp/artroom-g2-dependency-view-20261019.json`, SHA-256
`006fbddb896e866cba4e405e898f1bd40b5279112913a762d90a576e0a1e8a83`.
This is a manifest/link copy check, not a tarball-integrity claim.

No G2 code gate, review, landing or acceptance witness exists yet. Routing,
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

## Fact-time projection checkpoint

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
Fact-time requires history access even without a journal source, and the
native owner's final authority check still runs after metadata reads.

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
