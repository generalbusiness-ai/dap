# Sprint report, 18 October 2026

Sprint from 17 October, 17:00, to 18 October, 17:00 Eastern. No hosting
deployment was made during this sprint. The install half of M1 binds a
private object-store bucket for package content, and object storage is
not yet enabled on the hosting account. Enabling it is an account action.
After that, the planner creates the bucket and deploys the reviewed
`main` with the trust list unset, which admits no install until a release
exists.

Every landing below passed its gate and an independent checker review at
the exact head, followed by a checker audit of the landed `main`, unless
the line says otherwise. All of it is on `main` at GitHub.

## Direction

[Plan 033](../plans/033-2026-10-18-grow-room-demo.md) (`bb3d3062`)
puts the grow room ahead of the journey's MVP slices, as the demo. It
follows the [grow operation application design
note](../2026-10-17-grow-operation-application-design.md): a growing
operation with an operator, two tenders, a climate agent, an irrigation
agent and sensors in one room, where people and agents take acts as
peers and every member's AI app shows the same generic cards. The order
after the archive milestone:

1. M1, trusted packages on the current runtime, with G0, the grow
   definitions and the fault scenario, beside it.
2. M2a: declared projections, the generic interface, and several scopes
   in one package.
3. G1 views, G2 measurements from the chat, G3 routing, G5a the native
   device-command record, G5 the hosted demo with a `/grow/` page.
4. The demo-room archive slice, then G4, the incident's record and the
   day's archive.
5. The journey resumes at J3 with the evidence-rules slice.

Plan 032 stays the order for everything the demo does not touch.

## What landed

### Durability

- Archive A2 (`0e63ba92`): the archive's Git source and clone replay,
  on fixture histories.
- Archive A3 (`6dac9c76`): the archive writer, on fixture histories.
- One documentation path reconciling the fixture-only milestone
  (`fd198c72`). The milestone stops at the cutoff: a definition that
  declares the archived level is still refused as unsupported, the
  hosting deployment has no archive policy or configuration, and no real
  destination or token exists.

### Designs

- The grow operation application design note (`90c8c483`), with a
  mockup directory of twelve pages that each fit a 320 pixel viewport.
  It introduces a declared view description as part of a presentation:
  kind, projection and item, fields, revision, at most two acts with
  their needs and timing, context and fallback text, refresh and display.
- Plan 033 (`bb3d3062`), described under Direction above.

### Self-contained applications

M1 landed in three independently reviewed heads, split by the builder.

- The foundation (`feccbbcf`): a portable signed package codec, bounded
  pack and check, and a native scenario and replay. The checker asked
  that every scenario carry an explicit behavioural expectation, and the
  head was revised before approval.
- The developer half (`bfa02edd`): a shared trusted compiler; `dap new`,
  `dap check` and `dap dev`; Counter and the lending library as
  maintained packages. The checker found that the development preview
  did not serve a nested package entry at its canonical path, and the
  head was revised before approval.
- The install half (`ad39fdf1`): install in one act by package URI, the
  application content store, the generic maintained screens, and an
  operator-set trust list of exact release and publisher pairs. An
  absent list admits nothing; a malformed list refuses every install.
  Each install phase is recorded, so a reader can tell pending from
  refused from active without live state.
- A one-line self-host guide link correction from the install review
  (`29ccc2fd`), documentation only.

The final M1 gate, as the builder reported it: 1,829 cases with 3
skipped, plus 31 runtime and 55 Counter cases.

### The grow definitions

- G0 (`9c32a384`): the `site` and `room` definitions with their actions,
  guards and timed rules, and the fault story as a scenario with a
  simulated source of readings and devices. `dap check` replays it. The
  simulated device outcome is a labelled scenario-owner record, not a
  native operation record; the native form is slice G5a.

## Decisions

Recorded in the workroom while M1 and G0 were built.

- **The simulator owns device commands for the demo** (`e72e4e83`). It
  applies each commanded target, writes the outcome in its own record,
  and reports state through the sensors member. A real device owner
  stays undesigned.
- **An install is one member act, not a transaction across scopes**
  (`c643756e`). Each phase's commit is irreversible and recorded.
- **Package URI** (`866c7ae7`): `git+https://<host>/<repository>.git/@<commit>/<path>`,
  a full lowercase commit id, no credentials, query, fragment or floating
  ref, and the canonical percent-encoded tree path.
- **Transport** (`0d973184`): the host fetches package content itself.
  A 64-character commit id is refused before any network access with
  the reason `unsupported-object-format`; the URI grammar is unchanged.
- **No resume after a definitive refusal** (`716ace64`). Resume covers
  unknown outcomes only. When conditions change, the admin signs a new
  install act, which is admitted on its own terms.
- **Refusal scope** (`9075d42e`). Before admission a refusal has no
  effect. After admission a definitive refusal records exact partial
  completion: earlier effects stand, there is no compensation, and the
  record names the phase that refused. The content-store put is the
  host's own idempotent step before admission.

## In progress

- **M2a** (`b6aaa3ce`): declared projections, the generic interface and
  several scopes in one package. The builder's isolated preparation has
  versioned package, projection and view codecs, a strict reader for the
  earlier package form, and an in-memory witness that completes an
  install and selects the retained projection declaration. Nothing is
  in review yet.
- **G1** (`2c5969dc`), the views on the card kit, is filed and queued
  behind M2a.
- **The sequenced level and order scope** note (`29e9024d`) is in review
  with three blocking findings: the cut can change after a lost
  allocation reply, the restart rule makes no finite progress, and the
  read witness mixes two byte domains. The note makes the archive a
  binding rather than a level and adds a third, sequenced level. Its
  first slice S1 (`b42d3b74`, the lag guard and source order) is filed;
  S2 (archive as a binding) and S3 to S5 (the sequenced level) wait for
  the note. When it lands, plan 033's decision 7 and its demo-room
  archive slice change from archived-level admission to the archive
  binding.
- **The hosted deployment** of the install half waits on object
  storage, as stated at the top.

## What stalled, and why

- **The deployment prerequisite.** The reviewed configuration was not
  checked against the hosting account before the head was approved, so
  the missing object storage surfaced only at deployment time. The
  implementation note for the install half now names the bucket and the
  setting; the account action is the remaining step.
- **Closing a delivered parent request.** A parent request that targets
  `main` refuses an ordinary report once its children have landed. The
  G0 and M1 parents therefore closed by planner supersession resting on
  the final landing receipt and the builder's report (`57185c8a`,
  `88029e7f`). The pattern is now the adopted one for split milestones.
- **Two harness timeouts** of five seconds hit unrelated subprocess
  witnesses during the G0 gate. The builder re-ran the gate; the failed
  run stays on record.
- **Landing receipts are still owed** for the notes sweep (`45605953`)
  and the spikes cleanup (`cb3b1c8f`).

## Commitments for the sprint ending 19 October, 17:00

The order below is the build order. Push after each landing. Deploy only
after checker review of the exact head.

| Owner | Work | Request |
|---|---|---|
| Builder | M2a: declared projections, the generic interface, several scopes in one package | `b6aaa3ce` |
| Builder | G1: the grow views as declarations on the card kit, the grid as a surface, the derived tools | `2c5969dc` |
| Builder | S1 beside: the lag guard on handlers and the source order | `b42d3b74` |
| Builder | Then G2 and G3, filed as M2a nears landing | to be filed |
| Checker | Review the heads above in order; the revised sequenced-level note when it is refiled | — |
| Planner | Deploy the install half once object storage is enabled; verify; keep the trust list unset | — |
| Planner | Land the sequenced-level note when approved, then amend plan 033 decision 7 and slice 9 | `29e9024d` |
| Planner | Landing receipts for the notes sweep and the spikes cleanup | `45605953`, `cb3b1c8f` |
