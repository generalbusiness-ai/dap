# BR-11: split the Worker template and retire old offers

Request: `e1b71b6b697c58723b3340681346f5f7145d345c`.
Promise: `5a3fbb3db7dac1dc652f7403aabbf585641e4212`.

Status: the CLI adapter repair and its Page asset are prepared. The
entry-point owner must check the new seal, then the CLI compiler and five
unrun contexts must pass before the thirteen unrun Vitest cases start.
The two client compiler contexts keep their pass. No control or gate ran.

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
  version 1 at an exact retired register reference and mismatched scope
  or incarnation, while accepting the two
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

## Validation

The single maintained asset build at `23742c6e`, tree `90718804`, exited 0.
Only `apps/room/page/assets.ts` changed. Page HTML and both OAuth entries
stayed equal, every other tracked input stayed equal, and the process group
closed. The build used the existing esbuild 0.28.1 and pinned Node 26.13.0;
it installed nothing. Its [build manifest](evidence/2026-11-09-br11-assets.manifest.json),
digest `e78cdb0b0cb5414976ffa50277933a3f5fcd5540b3b7b75ad9f41ed53363b27e`,
seals 21 files. Focused checks and the gate remain due.

The first focused run at `b132c932`, tree `f64f9549`, exited 1 in Node:
9 passes and 5 failures across 14 cases. All three settings cases passed.
The entry-point owner reported five `Route without Worker` failures because
`documentedInventory` did not yet allow the new `dap-self-host` heading.
All eight compiler contexts and all thirteen Vitest cases remained unrun.
Every tracked input stayed equal, and the Node process group closed.

The [failed-inventory manifest](evidence/2026-11-09-br11-failed-inventory.manifest.json),
digest `021f776412dd293c9031694ce51591656f85d9e37b59dd1e2bfe02c8ac78ac4d`,
seals 14 public files and retains 20 private originals. This failure stays
failed. The repair adds only the new heading to the finite parser list.
The next pipeline reruns the complete eleven-case entry-point owner and
then starts the previously unrun compiler and Vitest phases. The passed
settings owner and compatibility preflight do not repeat.

At integrated head `cbef2afd`, tree `124d2c72`, the repaired entry-point
owner passed all eleven cases. The client source and test compiler contexts
then passed. The CLI source compiler exited 1 with TS2367 at `claim.ts:195`:
its v1-only `purpose` spread remained after `CreationOffer` became v2-only.
The five later compiler contexts and all thirteen Vitest cases remained
unrun. Source hashes stayed equal and both process groups closed.

The [failed-compiler manifest](evidence/2026-11-09-br11-failed-cli-compiler.manifest.json),
digest `aafbcd9fcdfcff1d55f8096071b8fb22c3dcf670b55964a25a3777413914c2f3`,
seals 18 public files and retains 34 private originals. It preserves the
Node and client compiler passes alongside the failed CLI compiler. No
failed result becomes a pass.

The repair removes the retired CLI `purpose` spread and the obsolete
reference to that field in its refusal message. Current offers keep their
same revision, host, namespace, and policy values. The maintained parser
returns source seal
`92958130e0851a08c30f66e96abcbaf5596d37711ffbf1a7ecc9ace9c2df5879`.
The corresponding one-literal baseline update keeps every route and gate
assertion. Hugh's standing patch authorization applies. Because that sealed
source changes, the entry-point owner must run again. The unchanged client
compiler contexts and settings owner keep their conclusive results.
The Page asset must rebuild after this CLI change.

The required Page rebuild after the CLI repair ran once at `2fc38c44`,
tree `ee4542cc`, and exited 0. Only `assets.ts` changed. Page HTML and both
OAuth entries stayed equal, and the process group closed. The
[CLI-repair build manifest](evidence/2026-11-09-br11-cli-offer-assets.manifest.json),
digest `bd55d320770d10188a729049118633fcb781350c019f20b924ae80cad84dc67e`,
seals 21 files. The earlier build remains evidence for its earlier source.
No compiler, test, or gate repeats during sealing.
