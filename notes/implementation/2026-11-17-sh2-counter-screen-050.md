# Move the Counter screen to Counter 0.5.0

SH-2 (request `b73d88bc`) moves the `counter.inguz.space` screen to the
Counter 0.5.0 installation in counter-witness. The planner installed 0.5.0
at 02:46 EST as item 11 (state `active`, presentation
`sha256:9334159c91ea2df5d25e75aaa265b0ccb8b8ceac7a564b8eb46d0b7be57d2af4`).
Evidence: `artroom-evidence/2026-11-17-counter-witness-050-install/`.

## The change

The screen route serves only the installation that its row names, and only
while that installation keeps the row's presentation
(`packages/scope/src/applications/route.ts:79`). An install of 0.5.0 opens a
new item and leaves item 2 active, so the row must name item 11.

Three files carry the row, and each now names item 11 and presentation
`9334159c` in directory `sc_rgtlrioy5eckfikcapmqdteiw7y4b4lrc7k6use4rqdktn4lnabq`:

- `apps/room/wrangler.lending.jsonc` (`APPLICATION_SCREEN_HOSTS`);
- `apps/sandbox/wrangler.rollout.jsonc` (`SCREEN_HOSTS`), the configuration
  that `scripts/deploy-config.mjs` deploys for the sandbox.
  `apps/sandbox/wrangler.jsonc` keeps an empty list;
- `scripts/deploy-smoke.test.mjs`, which expects the exact row.

The two Lending rows do not change. Item 2 stays active with its old state,
but no screen serves it after the deployment.

## Tests

`scripts/deploy-smoke.test.mjs` maps each sandbox row to its room row and
expects the Counter row exactly. Two reds fail on its Counter assertion,
"Counter 0.5.0 (item 11) uses its exact installed screen descriptor through
dap-lending":

- main's room and sandbox rows (item 2, presentation `52378055`);
- the new room row with main's sandbox row, a deployment that moves only
  one side.

Evidence: `artroom-evidence/2026-11-17-sh2-red/`.

## Deployment

The planner deploys dap-lending and the sandbox, then reads the screen
through `counter.inguz.space`. Item 11 has fresh application state. The
room's membership carries over, so the NF-7 witnesses stay members.
