# Move the Counter screen to Counter 0.6.0

SH-3 (request `dcc41131`) moves the `counter.inguz.space` screen to the
Counter 0.6.0 installation in counter-witness. Counter 0.6.0 carries the NF-10
fix: an enrolled device binds to the room's service origin, so the hosted
enrollment can keep the device after the room accepts the join.

The planner installed 0.6.0 at 06:29 EST as item 20 (state `active`, release
`sha256:581e5d26a2e035f76a70cc627e76d483f5b9dc63cdea10b198d802cdc2951a8a`,
presentation
`sha256:905a3f7e088278894937f41bd27bf612bafac9b65fe030dbf0e2e0f584cd444f`).
The install created a new Counter scope,
`sc_wpykw53gmvmf7tkqqorsg6a4hic57x5kcuzsvvz33ablh2fnfpwa`, so item 20 starts
with fresh application state. Evidence:
`/Users/hughpyle/play/artroom-evidence/2026-11-17-counter-witness-060-install/`.

## The change

The screen route serves only the installation that its row names, and only
while that installation keeps the row's presentation
(`packages/scope/src/applications/route.ts:79`). Item 11 stays active, so the
row must name item 20.

Three files carry the row, and each now names item 20 and presentation
`905a3f7e` in directory `sc_rgtlrioy5eckfikcapmqdteiw7y4b4lrc7k6use4rqdktn4lnabq`:

- `apps/room/wrangler.lending.jsonc` (`APPLICATION_SCREEN_HOSTS`);
- `apps/sandbox/wrangler.rollout.jsonc` (`SCREEN_HOSTS`), the configuration
  that `scripts/deploy-config.mjs` deploys for the sandbox;
- `scripts/deploy-smoke.test.mjs`, which expects the exact row.

The two Lending rows do not change. After the deployment, no screen serves
item 11.

## Tests

`scripts/deploy-smoke.test.mjs` maps each sandbox row to its room row and
expects the Counter row exactly. The named red runs the test with the item 20
expectation against main's rows.
