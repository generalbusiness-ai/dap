# SH1: screen hosts name installed applications

Request `15c42203905b09822840b5cf30396abf5350a1d6` and existing promise
`1283e5977193a549a21a83b9a4b76561f174ac35` govern this head. Its base is
main `863ca6b2ee23c528af97b352165092c556ca35f9`.

## Grow descriptor

The Grow room Worker and sandbox rollout now name the planner-confirmed
Grow 2.0.0 installation: screen origin `https://grow.inguz.space`, room
origin `https://dap-grow.inguz.workers.dev`, directory
`sc_cu5bjlh3rt4jvcffbxoyu4wye4ckwdf6nyxlpo4adihughrr4ztq`, item 2,
presentation `sha256:2a3adecf80d11e4734d1b63fc43121e7e73197ee16c3448782cec15e586ef78c`.
The sandbox keeps service `GROW`, bound to Worker `dap-grow` and its
`ApplicationScreenService`. The room comment now names the installed
screen instead of a placeholder. Archive policy, trust, register,
packet and identifier files stay unchanged. No Counter or Lending
screen descriptor was supplied or added.

Today one new screen host row requires edits to two tracked config files,
one reviewed full `npm run gate`, and two planner deployments: the room
Worker and sandbox. SH1 also adds the consistency witness below and this
note. These source facts describe the current cost, not a redesign.

## Consistency witness and pending checks

The existing Node owner `scripts/deploy-smoke.test.mjs` gains one case:
“room screen descriptors and sandbox mappings agree in both directions on
the matching Worker service.” It uses the maintained `parseConfig` reader,
reads every room `wrangler*.jsonc`, and compares complete descriptors
against sandbox mappings with the service binding for each room Worker.
A descriptor on either side alone, a different descriptor field or a
binding to another Worker fails. The owner now declares 11 cases by source
count. This is a tracked-config consistency test, not deployed screen proof.

All new validation is UNRUN. The whole owner command is
`/opt/homebrew/bin/node --test scripts/deploy-smoke.test.mjs` from the checkout
root. No dependency setup, parser execution, producer, compiler, test,
control, browser or network operation ran for this checkpoint.

The single proposed control changes only the Grow room descriptor's
presentation suffix `78c` to `78d`, keeping the sandbox exact. The whole
owner must fail the new direct parity assertion. Baseline, mutant and
restoration remain UNRUN; no timeout or unrelated smoke failure counts.

The gate follows first-ready ruling `50088553` and displaces no active
START. Required helpers and whole typecheck must pass at the eventual gate
head under `7fe68ffe`. Gate, checker review, planner deployment of
`dap-grow` and sandbox, and the planner's real browser read remain owed.
