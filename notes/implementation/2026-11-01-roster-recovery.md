# Recover the Page after a failed roster read

## What changed

The next navigation in an open Page can recover after a failed standing read. `RoomOpening` reopens a completed room whose identity no longer passes `verifiedRoom`. It still shares a pending open and keeps an older room's late result from replacing the active room. The Page bundle includes that change.

Request `1da54995`, promise `15c674b3`, owns this repair. Source checkpoint `658aab954d7a017c5cbce0d7daf28bb798fa1f52`, tree `27936fcbfd752aef7a6fecf02961279f258c2628`, changes the Page cache, its caller, the existing native roster witness, and generated `assets.ts`.

## Decisions and why

A failed standing refresh clears `room.me`. Previously, the room cache kept its fulfilled promise after that mutation. The next draw received the same unidentified room and stopped before the standing refresh could retry. A full reload made a new cache and recovered.

The cache now records each promise's completed value and asks its caller whether that value remains reusable. The Page supplies its existing identity guard: a current member handle and the room's actual session key. A pending read has no completed value, so concurrent draws still share it. A late result updates only its own pending record. The cache key still includes origin, directory, membership scope, incarnation, kind, and device key.

Failed reads still clear standing. `actsOn` still waits for a fresh roster read, and native scopes still judge every submitted act. This repair changes no membership, session, admission, definition, or Worker route.

A real local Worker baseline shows the failure before the repair: one aborted membership summary GET clears standing. Hash navigation leaves **Observation unknown**, performs no new membership read, and offers no comment form. Reload recovers. Native membership and both issue heads and items stay unchanged.

The repaired run shows a fresh authenticated open on hash navigation without reloading. Membership reads go from one at failure to three at recovery. Ana's account and current **Approve** and comment controls return. The browser sends no act. The Page bytes served by the Worker match source digest `0f05923f41395a7d55e24217c756e40ece0b1cae6e96b3207e765c3371b85710`.

Three earlier browser diagnostics remain sealed. One harness waited for internal error text that the Page does not display. A second interrupted the earlier read that names a decided question's actor, which leaves standing intact, so navigation recovered. The first repaired run showed recovery but then stopped at a strict locator that matched both responsive account controls. The corrected account check covers every control. A focused test command also selected no files from the wrong working directory. Its corrected invocation passed without repeating the successful compiler check.

## Evidence

Browser plugin not available. Pinned Playwright 1.63.0 and Chromium revision 1243 drive one local Worker on one Mac at 1100 by 1200 pixels. Separate scratch homes and Worker storage remain outside the evidence directories. The script types the device invitation once during setup, then forces one GET transport failure and navigates. Routing can change timing. It supplies no roster or permission.

The [manifest](evidence/2026-11-01-roster-recovery.manifest.json) gives each unit's absolute directory, source checkpoint, count, and full cited-file hashes. Keep every unit for at least 30 days after landing. The failed diagnostics remain separate from the passing baseline and repaired run.

| Check | Command or recorded invocation | Actual result | Output digest |
|---|---|---|---|
| Baseline | `node witness.mjs` in the baseline-3 unit at main `31384059` | exit 0, 8 checks demonstrate the gap and reload recovery, no act or native state change | `53918ebea054683e` |
| Page compiler | `npm run typecheck --workspace @generalbusiness/dap-page` | exit 0, three compiler configurations | `c6b78e5b48afa90e` |
| Shell concurrency | `node node_modules/vitest/vitest.mjs run test/shell.test.ts` from the Page package | exit 0, 4 tests, including late old results and failures | `7da010bef90e0e82` |
| Native roster and cache | root Vitest, project `scope`, `roster-refresh.scope.test.ts` | exit 0, one real-membership witness, fresh cache open after failure and current role permissions | `e419a8240773ae1b` |
| Distinguishing control | `scripts/control.mjs` restores unconditional cache reuse for that native witness | reported child exits 0 before and 1 after the change, assertion rejects reuse of the failed room; outer exit not captured | `e1c6797b0477354f` |
| Repaired Page | `node witness.mjs` in the browser-2 unit at `658aab95` | exit 0, 11 checks, navigation recovers without reload, native state unchanged, no act | `475b17e54583a6d7` |
| Browser validation | validation of the retained report, traffic, and actual served bytes | exit 0, no Page runtime error, one deliberate GET transport console error, no non-200 response observed | `2c007d82bdb7c71f` |
| Screens | builder inspected the stuck baseline and recovered issue screenshots | error screen gives no act form; recovered issue shows current controls and Ana without clipping | `02f3ac46fe3cf9e3` |
| Related-unit integrity | checksum, mode, and text-pattern audit of six sealed units | 134 files, every checksum matches, all files read-only, no pattern match in 116 text files; 18 images outside the text scan | `82fc6902950c8915` |
| Source gate | `npm run gate` once at clean `658aab95` | exit 0, 3555 plain passes and 1 skip, 1028 native passes and 2 skips, 130 Node and 56 Counting observations, complete terminal evidence | `229f06cefd04e7a0` |
| Page workflow | [Page browser scripts 41381703886](https://github.com/generalbusiness-ai/dap/actions/runs/41381703886) at `658aab95` | success, all workflow inputs unchanged in this review head | `e6ab4540ac93c940` |

The gate source remains clean at its terminal checkpoint. The review head merges the landed J5 record and adds this note and manifest. Its complete diff from the gate source contains only those four documents. The review request gives the final head and tree. No second gate runs. Native case-progress observations cover fewer cases than the terminal Vitest totals and do not replace those totals. The scope timing report has partial module coverage, and concurrent duration sums are neither wall time nor CPU.

The native witness uses the real Page cache and data functions against authenticated membership and HTTP. Its transport gate supplies only ordering and failure. It also retains the earlier pending-refresh and role-change assertions. The browser witness exercises the actual bundled Page. Programmatic hash navigation triggers its real draw path. The scripts model a person and do not prove a person completed the flow.

## Open limits and owners

- **Deployment:** the planner deploys. This head proves local recovery and makes no deployed-recovery claim.
- **Hosted stop:** this controlled failure does not identify the earlier hosted J5 stop's cause.
- **Stream cause, `5f87ccc2`:** builder owns the local 503 and deployed long-stream-end investigation, after Goose. This bounded run observes no non-200 answer and establishes no global absence.
- **Goose, `1a44f042`:** builder will test a real desktop host after this repair lands. No person, provider, or desktop AI app participates here.
- **Coverage:** the native fixture checks the current standing path and role changes, and the browser checks one membership and one viewport. It does not cover every room version, key transition, or appearance.
