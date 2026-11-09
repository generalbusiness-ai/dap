# BR-11: split the Worker template and retire old offers

Request: `e1b71b6b697c58723b3340681346f5f7145d345c`.
Promise: `5a3fbb3db7dac1dc652f7403aabbf585641e4212`.

Status: source preparation only. No compiler, test, asset build, or gate has
run for this head. BR-5 holds the validation slot.

## Keep each deployment's configuration separate

`apps/room/wrangler.jsonc` becomes the neutral self-host template. It starts
in enforce mode and names no project bucket, metrics dataset, register, or
credential. The guide copies it to the ignored
`apps/room/wrangler.self-host.jsonc`; `deploy:scope` uses that local copy.
Secrets and Worker deletion commands name the same copy.

`apps/room/wrangler.artroom-scope.jsonc` keeps the old Worker's bindings,
bucket, metrics dataset, and exact migration prefix. It omits the expired
`DEMO_START_CONFIG`. The planner owns the PD-6 live cutover. This head
records no deployment or secret deletion.

The settings inventory covers the new template and the old Worker as
separate configurations. The entry-point inventory names both roots.

## Accept only current offers

The server already accepts only the current wire setting on main
`9e2ac753`. This head removes the remaining client v1 offer decoder and
uses the current decoder for Page Start. Version 2 offers still bind the
exact origin, register, incarnation, closed fields, and response bounds.
Register 17 and Register 26 remain the only supported offer pins.

Saved private custody is a different format. Its existing migration and
exact operation binding remain. A submitted operation keeps its signed
intent and readback path. An old unsubmitted descriptor gains no new offer.
The planner has been asked to confirm this custody boundary.

## Map the removed witnesses

The current cases replace the retired offer setups as follows. No whole
case disappears from either native owner.

- `apps/room/page/test/start.scope.test.ts`: the retired Register 7 exact
  reference and wrong-incarnation queries accompanied the current founding
  scene. The remaining case, “fresh Page Start discovers native Register17,
  retains before dispatch, Checks a lost accepted reply without mutation
  and explicitly Continues the original through enrolled room recovery”,
  still witnesses current offer decoding, pre-dispatch retention, read-only
  Check, and exact Continue. The SDK's bounded discovery case and the
  native offer case below retain exact-reference refusal coverage.
- `packages/scope/test/demo-creation.test.ts`: the Register 7 and Register 8
  fresh, retained-reference, fallback-to-7, and wrong-incarnation refusal
  setup belonged to the retired decoder. The remaining “Register17 offer
  exposes only its configured Artifacts register and admits a previously
  unseen founding key without changing protected reads or waking parked
  work” case witnesses current native founding and exact-reference
  refusal. Its wrong-register, wrong-incarnation, malformed-query,
  protected-read, and parked-work assertions remain.
- `packages/client/test/creation-offer.test.ts`: the bounded same-origin
  discovery case now selects the current exact register. It rejects wire
  version 1 and mismatched scope or incarnation, while accepting the two
  supported current pins. The retired v1 success branch has no successor.
- `packages/cli/test/creation-offer.test.ts`: the preflight case now uses a
  current Register 17 offer with the same wrong incarnation. It still
  stops before transport or recovery preparation, and Check reads no offer.
- `apps/room/page/test/start-custody.test.ts`: the retained-operation case
  now uses Register 17 with the original v1 private-custody format. It keeps
  the founder key, envelope, read-only Check, and exact Continue witnesses.
  The malformed-custody case rejects an obsolete offer before the workflow.
- `apps/room/page/test/start-ui.test.ts`: the old retained request still
  keeps its origin and controls. Its selected offer now fails as retired;
  no v1 offer reaches the scripted successful return.

This change edits no recorded definition, genesis packet, journal, or entry
interpretation. Validation and independent exact-head review remain due.
