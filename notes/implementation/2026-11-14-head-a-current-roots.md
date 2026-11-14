# Head A: list only the current registers

This repair follows request `9d3bbe4c`, planner finding `aa2d1b9e`,
and checker verdict `0ee19578`. It starts from landed CUT-A main
`0ad4aa9102fe5f75b692d3adb30c8b00a6914574`. It changes only the
three configurations written by `scripts/register-values.mjs`, this
note, and its evidence manifest. No deployment ran.

## Decisions

The earlier head followed the demo-only `--only` instruction. Lending
and Grow therefore kept their old primary register beside the new one.
Listing an old root selects its creation policy again. The planner
replaced that instruction: every Worker now uses `--only`.

Each command below ran exactly once on 14 November 2026. All returned
zero. I compared every full register scope and genesis argument with
cutover END `53d5a148`; all six values match exactly.

```sh
node scripts/register-values.mjs lending --only \
	--register sc_psbin3zi4ld7kqxg4vdbmb2eudyca64e5mxarz3k4qmklrpyfokq \
	--genesis sha256:2d029ef5f6fd2dfb15a764b0bdeb5583825a7092aa11331253c3d84d3b59882f
node scripts/register-values.mjs grow --only \
	--register sc_wmtd3fkl2cwafzzredeicmrdhtdo2ics6n7kezy6ds4rxaqvaxoa \
	--genesis sha256:a4ff0a4af3264821f265cff95c7a47e5ab8a16eeb5a5cb102c8e6275e3450aa9
node scripts/register-values.mjs demo \
	--register sc_dtqcta4htibueaeycfficyanudk5cz3ssrsugho3qlznvrhw3jxq \
	--genesis sha256:e1d53ac5241fad1445bd8963abbaa6c844c2dcdeced0c2495d3778fa190870b0 \
	--only --start-origin https://dap-demo.inguz.workers.dev \
	--deployment dap-demo --definition platform:register@28
```

The production `readInstalledRegisters` function returns exactly the
single new root for each output. Each `REGISTER_SCOPE` and
`ARTIFACTS_CONFIG.registerScope` equals that root. Each explicit
`INSTALLED_REGISTER_SCOPES` is the same singleton list.

The proof derives the full retired installed-root union from main's
three configurations through that same production reader:

- `sc_c67lq575p5nfkfiwwbr7buodsv6t44i4u6ptcuuhmpcgcduljd7q`
- `sc_yatkl7kuktl2gauvjrt7b2zy7nr6nu55vkzorot2bm5n2umgpbnq`
- `sc_b5q435os6lggypatelcltqzvul4kqxzdaaxpmybvwumsmxwj2djq`
- `sc_zm56yco5zyx7n3kx7e5jcxz55q5wp7y2lcuy2ialj7r7mzzcarjq`

None of those four complete identifiers occurs anywhere in any output
configuration. The check includes both old Demo roots. Demo's version 3
Start offer matches the exact END scope and genesis, origin, deployment,
and `platform:register@28`. Demo adds no tracked `DEPLOYMENT` variable.

Grow's existing `GROW_ARCHIVE_CONFIG` stays byte-for-byte unchanged as a
binding value. Its old archive directory and screen settings remain
under the prior CUT-R instructions. Those settings name an archive
directory, not a register in the retired-root authority check. All
other variable values outside the script's permitted updates also stay
unchanged. I set all three written files to filesystem mode 0644 before
this checkpoint and its gate. Git records mode 100644.

## Final evidence

Script START is `46938035`. Lending ran from 08:41:45.600913 to
08:41:47.558141 UTC, Grow from 08:41:47.588558 to 08:41:48.812447,
and Demo from 08:41:48.843911 to 08:41:50.052496. Monotonic command
times were 1.957210, 1.223869, and 1.208568 seconds. These are observed
durations, not deadlines. The script record was sealed at
08:43:54.453969 UTC, before script END and gate START.
Script END `54f29b9e` preceded root proof acknowledgement `67a9a668`,
planner acknowledgement `75b4421b`, and gate START `ffd78f60`.

The preflight and each command's endpoints read actual escalated AC
Power and power mode 0. Preflight found no competing validation process.
The fresh worktree owns a real dependency directory cloned from CUT-A
without installation. Package locks and inherited markers match
`f2885ca573c095141efbca99a7260d211beb9ae38a7f1b139ce234dc79568b54`.
All 15 relative workspace links resolve inside this worktree and name
their expected packages. No link or marker was rewritten.

The [current evidence manifest](evidence/2026-11-14-head-a-current-roots.manifest.json)
records all 46 sealed script and proof files under
`/Users/hughpyle/play/artroom-evidence/2026-11-14-head-a-current-roots-script`.
Its `SHA256SUMS` digest is
`6347cdd1bd36aaff25387bc9d62114854d4881579d099e30657fd65955e6c92f`.
The proof imports the real production reader and deployment JSONC
parser; it calls no generator or remote service.

The corrected full gate ran once at clean, pushed checkpoint
`259b5cb367b4efd3364b522be2ac80a4e3f10438`, tree
`f965f8232a352cc9818ddbdb230b0f3bb9459643`. It began at
08:48:10.998992 UTC and ended at 09:05:54.131991 UTC. The outer
monotonic timer measured 1,063.110183 seconds; the test stage took
1,035.4 seconds. Gate END is `abe5c2e4`.

Node passed 178 cases, and Counting passed 56. Plain passed 4,616 cases
with one skip across 401 files. Native passed 1,149 cases with two skips
across 291 files. These counts come from complete terminal records,
which report no unhandled errors. The optional live Native callback
stream covers only 1,103 passes. Static, documentation, formatting,
compiler, and definition-pin checks passed; notes reported zero warnings.

The maintained selector recorded `include: false` and
`reason: outside-scale-paths` against main and base `0ad4aa91`. Its
changed-path list contains only the three configurations, this note,
and its manifest; `matchedPaths` is empty. Scale therefore stayed out
of this gate without a selection override. No install, worker override,
timeout change, source edit, repair, or rerun occurred during the gate.

All 54 gate power samples read actual escalated AC Power and power mode
0. The before and after ledgers agree on head, tree, fixed main,
dependency metadata, all 15 local links, clean status, and the three
0644 configuration modes. The final diff from the gated checkpoint
contains only this note and its evidence manifest under `notes/`.
Source and tests remain unchanged.

The gate's 269 raw files live in
`/Users/hughpyle/play/artroom-evidence/2026-11-14-head-a-current-roots-gate`.
Its `SHA256SUMS` digest is
`191b6fc68553430a57380b57f72c32c8ba71d96b895015f7968530d2926d5a51`.
All 315 current script and gate raw files match their sealed checksums
and have no write bits. The tracked manifest lists 107 files directly;
the sealed gate manifest and checksum cover every periodic power file.

The scripts used main `0ad4aa91`; the gate used source `259b5cb3`.
All raw paths below are relative to `/Users/hughpyle/play/artroom-evidence/`.

| Check | Command | Exit | Raw output and SHA256 |
|---|---|---:|---|
| Lending current root | Full Lending command above | 0 | `2026-11-14-head-a-current-roots-script/lending.stdout`: `abac932900b8b8b534403c618678a7372f5034973c7a92ba04be263e69d6110e` |
| Grow current root | Full Grow command above | 0 | `2026-11-14-head-a-current-roots-script/grow.stdout`: `067c823d6617e84e25b669998e119c63c70541b763015291b3a089172c2a0ca8` |
| Demo current root and offer | Full Demo command above | 0 | `2026-11-14-head-a-current-roots-script/demo.stdout`: `af2a11bf09a104f15266bce351c27da7899cf7580ff42d6640351142f18e3702` |
| Production reader, full retired-root union, exact END values, and preserved settings | `node /private/tmp/artroom-head-a-current-roots-proof-20261114.mjs` | 0 | `2026-11-14-head-a-current-roots-script/current-roots-proof.json`: `e7c3b76af0d71c03c6fc62658e3c33a086690c3fa977768672c0b782792f033b` |
| Corrected maintained full gate | `/usr/bin/time -p /opt/homebrew/bin/npm run gate` | 0 | `2026-11-14-head-a-current-roots-gate/gate.stdout`: `e0899a49a705879f4456c1da9bb15420dc748b96f70bb6fef5adbb7b6676ded0` |

The earlier branch remains at
`f8c71ba2a83297051681b3031c04fab36a4d33ed`. Its first full gate
passed, but that configuration retained retired roots and must not
land. Review `56c48bc9` received changes requested. All 425 earlier
sealed raw files and the prior manifest remain untouched. The current
manifest names that history separately; it provides no current gate
coverage.

## Open limits

The corrected gate meets `aa2d1b9e`'s new-gate requirement. The final
review replaces rejected request `56c48bc9` on original implementation
promise `9df71a88`. The separate helper-default change belongs to
CUT-A2 request `cfdd7ffc`, after Head A and R1; it holds neither.

Request `9d3bbe4c` leaves deployment to the planner after approval and
landing. Nobody deploys Grow, Lending, or Demo while the hold remains.
