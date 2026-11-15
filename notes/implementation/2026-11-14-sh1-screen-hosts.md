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

## Development and distinguishing control

At clean `a06fbdec3270df64d4edfe4f2ae227ed41d2fa96`, tree
`3f256ba49a75fbdd2c8c1b8d35eaf3b494a5a439`, the whole 11-case owner
passed in the control's baseline. The room-only presentation change
`78c` → `78d` then produced 10 passes and one direct AssertionError in
that new parity case, line 174. The actual descriptor diff contained
only that presentation mismatch. Helper exit 0, DISTINGUISHES; outer wall
0.2559744159807451 seconds. No skipped/cancelled case, timeout, setup
error, extra baseline or third green supplied the verdict. Source bytes
restored exactly, mode `0644`, SHA-256
`2f2d12eac95d6b0548e2102b953907bbc8968b73e53187f7f9813c2cc277b076`.
END `a4512f2e535e29ae05da1998dc08cc2d5dcddbf9` records that result.

Prefix `E` below is
`/Users/hughpyle/play/artroom-evidence/2026-11-14-sh1-development-control-attempt1`.
`E/command.json` retains the actual whole-owner helper argv, including its
expected case title. The owner command is
`/opt/homebrew/bin/node --test scripts/deploy-smoke.test.mjs` from the checkout.
TAP duration is not the helper's outer wall. This shows tracked-config
consistency, not a deployed screen or browser acceptance.

| Phase at a06fbdec | Result | Raw path | SHA-256 |
|---|---|---|---|
| Whole-owner baseline | 11 pass; 0 fail/skip/cancel; TAP 26.057542 ms | `E/tmp/artroom-control-U2vGAW/before.tap` | `d63bcc56ae854e2034ce79f39808b88a6c7d3fd4b87886ee144ff7fb561ba23d` |
| One-sided descriptor fault | 10 pass/1 direct fail; 0 skip/cancel; TAP 22.641833 ms | `E/tmp/artroom-control-U2vGAW/after.tap` | `8236ae02586f971481e2462a9e0f28c2c3734af064912581373a5d3c4b6e6e6f` |
| Helper verdict | Exit 0/DISTINGUISHES | `E/helper.stderr.log` | `adeab4eeac3a70c4f95c134f92e888e9d9551dcc4e4df891219e888cec7633bb` |
| Terminal/restoration record | Exit 0; wall 0.2559744159807451 s; exact restore | `E/result.json` | `b37b58b102373996b45ca4cb3a2e57823ced6ace9453e3c3e45b02e784594e89` |

## Authentic dependency setup

All 17 root/workspace metadata files matched the owned C3 donor at
`.builder-worktrees/c3-resign-admission-20261114`. SH1's target was absent;
the actual donor stamp matched lock
`8b2ae5f7108ce36cf84753d99d4248d59cc21251d5e01da3da37a111bb495e20`.
One `/bin/cp -cR` copied that donor node_modules into SH1: exit 0, wall
0.7743282919982448 seconds. No install, restamp or donor mutation occurred.
The readback matched 107 installed non-link package metadata records,
15 relative workspace bindings and 57 export files at actual SH1 targets.
Root/scoped namespaces, .bin and both Vite views are owned real directories;
.bin links resolve inside SH1. The already-reviewed compatibility bundle
matches donor and expected after-hash
`cd50d18adce92adb54a3f00410d646b2fe09b3f12c5b833c492bcf5857621b39`.
No compatibility tool or project code ran for setup.

Actual metadata checks, copy argv/exit/wall and readback remain in
`/private/tmp/artroom-sh1-dependency-precopy-20261115.json`,
`/private/tmp/artroom-sh1-dependency-copy-20261115.json` and
`/private/tmp/artroom-sh1-dependency-audit-20261115.json`.
This note-only successor changes no runtime/test/config/package bytes.

Ruling `a1a726099d6ef178dcc7ba7763c38c654d237673` keeps SH1 Grow-only;
Counter follows after its install facts, without holding this head. The gate
follows first-ready ruling `50088553` and displaces no active START.
Required helpers and whole typecheck must pass at the eventual gate head
under `7fe68ffe`. Gate, checker review, planner deployment of
`dap-grow` and sandbox, and the planner's real browser read remain owed.
