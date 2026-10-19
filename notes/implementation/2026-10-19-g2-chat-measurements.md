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
