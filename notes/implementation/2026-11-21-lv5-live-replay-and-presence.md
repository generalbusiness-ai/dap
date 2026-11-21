# LV5 live replay and presence

LV5 completes the live level's replay and documents the level. An
opted-in view can display live lease rows through the member element
and send the lease actions offered on its current view cut.

## Decisions

Replay uses the existing live creation predicate. It verifies the
genesis and creator confirmation of a created live scope. After that
pair, a canonical third entry yields a mismatch before replay asks
for that entry's retained inputs. The focused replay control disables
that early rejection. The forged entry then reports incomplete because
its foreign retained input is missing.

Kernel promises 1, 7, and 11 use the sentences in section 4.3 of the
live level note. The one-channel audit names live acts and reads as
"judged, not retained". Section 7 review covers the replay change
under ruling `4b5e0ec2`. LV5 uses the existing entry types, live
predicate, package binding, and app-only tool.

The declared binding uses one source of active lease rows. It names
the member, focus, and expiry aliases and the three lifecycle acts.
The opener supplies the mounted scope as the focus and binds the
member to the signer. A native guard admits one active lease for the
member and focus pair. Renewal and leave target the viewer's own
current row. The declarations require two refresh intervals to fit
inside the lease. The fixture declares a 30-second lease.

The installed native fixture exercises MCP, scope storage, the issued
session, and the live turn. It sees the real authenticated member in
the display table, enters with the full focus reference, renews, and
leaves. An injected clock and timer then drive the actual timed
transition before any later view read. The journal still has its two
creation entries.

The production generated kit renders `here` when both scope reference
fields match. A Chromium test uses scripted host replies to check the
member text and app-only calls with their exact displayed cuts.
On resource teardown, the browser can send leave while the bridge is
available and the view is idle. The timed rule ends a lease when the
close is lost. The planner approved the native and Chromium witness
boundaries.

The generated MCP card resources are reproduced from the updated kit.
The signed packets, authored packages, and open release identifiers
match the landed LV4 tree under `apps/` and `examples/`.

## Focused evidence

The replay and presence checks ran on the isolated LV5 branch carried
onto the passing LV4 review candidate. Failed draft checks remain in the
same evidence directory. Output retained under
`~/play/artroom-evidence/2026-11-21-lv5-focused/`.

| Check | Command | Exit and result | Log | SHA-256 |
|---|---|---|---|---|
| Replay creation | `npm test --workspace @generalbusiness/dap-replay -- test/live-creation.test.ts` | 0, 1 passed | `replay-creation.log` | `bc64d61b41d6ad07c7d8e726f6c6c5937a8be9bd89317011e747df3a9fe9c62e` |
| Replay rejection control on LV2 | `node scripts/control.mjs` with the replay predicate disabled | 0, distinguishes mismatch from incomplete | `replay-control-on-lv2.log` | `c8f7bc88236d782c69b3a8d8dceb81d7d4f791a1277d0dcb3f143f131d6f64b1` |
| Replay types | `npm run typecheck --workspace @generalbusiness/dap-replay` | 0 | `replay-types.log` | `bfa936e6ac3350bc231de0d8a02765e43afc255bf7b9ea23aa4213cb09752357` |
| View binding | Platform Vitest, `test/application-view.test.ts` | 0, 10 passed | `presence-binding-test.log` | `f54b0ff1d3430b095fac76955c8551607f4bcb6b5c51ea71158feda371d650ba` |
| Platform types | `npm run typecheck --workspace @generalbusiness/dap-platform` | 0 | `presence-binding-types-pass.log` | `8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3` |
| Installed scope presence | Scope Vitest, `test/application-live-presence.test.ts` | 0, 3 passed | `scope-presence-pass.log` | `37da2b34e089bcfff6b93f9970500ae89e237185126e5527b17e890f314bcd48` |
| Scope types | `npm run typecheck --workspace @generalbusiness/dap-scope` | 0 | `scope-types-pass.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| MCP declared views and sessions | MCP Vitest, `test/declared-views.test.ts` and `test/view-sessions.test.ts` | 0, 31 passed | `mcp-views-verified.log` | `edb6ad266d7624f537c9660321e7bf9f042f4628bff680e5c18ae31e6ee9d422` |
| MCP types | `npm run typecheck --workspace @generalbusiness/dap-mcp` | 0 | `mcp-typecheck-verified.log` | `c1e1f1c2bbd0cff21cb159852caefece8652f03525b695b9f47a14976469405b` |
| MCP entry-point inventory | `node --test scripts/security-entry-points.test.mjs` | 0, 13 passed | `mcp-security-inventory.log` | `8d378997aeea8e5da5ab96da78663727e5cba002197d49dccbeede337f8b4fb7` |
| Card reproduction | MCP Vitest, `test/view-resources.test.ts` | 0, 6 passed | `lv5-view-resources.log` | `a78ecbe15486cd265362a84e28cd979fcd63a592cfe85a654b135475a8e92298` |
| Pins after the reviewed seal | `timeout 60 npm run pins` | 0, 19.70 s wall | `pins-after-inventory.log` | `8eaa7fed5fac855317c6a74bcadc630ad90a15dce4661e41b3b7fd3bbc7265a3` |
| Browser presence | `node --import tsx packages/mcp/test/presence-browser.mjs` with the pinned browser and host | 0, 2 modes | `lv5-presence-browser.log` | `03daf64415313936d826c02cf233f043e1bc36a17d02778c479198204d88469b` |

The browser used Playwright 1.63.0 and Chromium revision 1243. The
Browser plugin skill was unavailable. The report contains the two
browser cases and their error counts. The screenshot shows two member
rows with different genesis values for the same focus scope ID. The
command file records the build, browser, and resource checks.

| Browser evidence | File | SHA-256 |
|---|---|---|
| Commands and exits | `lv5-browser-commands.txt` | `1cca47e2897ecfe2a021eed69adb53b97546f6f9878d5f844dcdd394061c8c08` |
| Chromium report | `report.json` | `da4fb2895560f4efcda756ddd1b81d5550a60dc132714b08052efa4a4cafed0d` |
| Member element at the passive cut | `presence-passive.png` | `1c4336836c32e32970ffc185b31c8ce15f1927286d980874fcf604cf8b534584` |

## Limits

B4 uses a test package. An authored package can add the opt-in binding
under separate work. Grow still reports activity through its recorded
window. The live runtime can reset a generation. The browser witness
uses the generated kit with a scripted host, and the native witness
supplies the installation and clock authority.
