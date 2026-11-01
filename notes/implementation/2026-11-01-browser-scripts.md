# Repair three failing browser scripts and run them in workflows

Status: source implementation. The gate passed at `2f2fadd1`. These are test scripts and their workflows, so no Worker change is needed. A script drove Chromium on one Mac, on a GitHub runner and in an `ubuntu:24.04` arm64 container that stands in for the runner.

Request `988ae8726bd9839f30669d891d21257257f744a7` and promise `d9b909a57fffbd3a4d20ee77407df601ff0a1065` own this head.

## What failed, and what I decided

Each of the three scripts now runs in a workflow, so a change that breaks one fails a run at that commit. I deleted no script.

| Script | Cause | Decision and reason |
|---|---|---|
| `packages/mcp/test/owned-scopes-browser.mjs` | A stale fixture. `2160d982` moved the grid view to the `layers` projection and removed the EC button, and the fixture still answered `grid`. | Repair. No person runs it. It is the only script that follows two rooms from the Grow site and checks each room's state and the back path, and the repair is four lines. |
| `apps/room/page/test/screens.mjs` | The recorder called the Worker with `{}`, which has crashed since `4f7c1455`. Behind that, the script had fallen behind the page. | Repair. Nothing ran it for ten days. A grep of the other page scripts finds no 320 or 390 pixel width, no target or text size check, no zoom and no Tab or Escape check. |
| `scripts/demo-captures.ts --recorded` | On a Mac, **Save changes** moved out of the form. On Linux, Vitest printed colour codes before the first record line, so the old pattern lost a chunk, `JSON.parse` failed and Node printed the whole text. | Repair. `docs/demo.md` tells a person to run this script's deployment form on recording day, and that form shares this code. |

## What changed

- **`.github/workflows/page-browser.yml`, new.** It runs `screens.mjs` and three forms of `demo-captures.ts`.
- **`.github/workflows/views-browser.yml`.** It runs `owned-scopes-browser.mjs` in its own step, and it also watches that script and `examples/grow/check/**`.
- **`scripts/demo/recorder-output.ts`, new.** It removes colour codes, checks the line count and a digest, and never quotes the record, which holds fixture signing keys. Seven Node tests hold it.
- **`screens.mjs`.** It writes only under `VIEW_CAPTURE_OUT`, and it requires `CHROMIUM`. The 33 tracked files under `apps/room/page/test/screenshots/` are gone, because no current document embeds them and a run no longer rewrites tracked files. Older notes name them as they stood.
- **`demo-captures.ts`.** It exits 2 when a tool is missing, where it used to exit 0.
- **`docs/testing.md`, `docs/demo.md` and `apps/room/docs/page.md`.** They say what runs where.

## What loses coverage

- **The tracked screenshots.** No test read them, and Git history keeps them.
- **The last request section.** `screens.mjs` no longer opens it, because it now sits inside the hidden inspect body. `actions.test.ts:106` still checks its text.
- **The primary review form.** The script now checks the dialog that **Review change** opens, because the inline form no longer exists.

## Evidence

The head is `2f2fadd18a1a8da73a838f482ed9a7942ceb7d45`, tree `18afbccf`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-browser-scripts/`, `SHA256SUMS` `9b8e6d84d05fcddeb02d33ccb82645b7575342fb5a168ca39e402bf99dacf206`. The card workflow's run 41346896436 and the page workflow's run 41346896550 succeeded at `2f2fadd1`. After the gate the head adds this note and its manifest. The Mac runs and the controls ran at the commit before the trailers and the merge of main, with the same tree as the amended source commit, `a4008516`.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3541 plain and 1024 native tests, 123 Node and 56 Counting | `7e9e0b091eb33d0b` |
| `owned-scopes-browser.mjs` | observed run on a Mac | `node --import tsx` | exit 0 | `302806f8154897d9` |
| `screens.mjs` | observed run on a Mac | `node` | exit 0, tree clean after | `2e9d563aaf841e5c` |
| `demo-captures.ts`, three forms | observed runs on a Mac | `--recorded`, `--claim-witness`, `--label-witness` | exit 0 each | `28db434b4f04327a` |
| The same five | observed runs in the Linux container, by hand | the workflow's commands | exit 0 each | `06369dc2c9d0a7d4` |
| Control: rooms share state | observed run: the room's scope leaves the panel key in `surface.ts`, module rebuilt | `owned-scopes-browser.mjs` | exit 1, the assertion at line 88 | `89c8b17a48c84b37` |
| Control: a refusal with no guard | observed run | `screens.mjs` | exit 1, "The refusal dialog does not name its guard." | `a2cd989627ea1419` |
| Control: no brand files | observed run | `screens.mjs` | exit 1, "Browser errors" | `1707d96b15527bd3` |
| Control: a confirmation with no value | observed run | `--recorded` | exit 1, "Rule confirmation does not name" | `9e584997c68ca3a4` |
| Control: no colour handling | observed run | recorder tests | exit 1, the colour test | `45289312ba325d71` |
| Control: no line check | observed run | recorder tests | exit 1, two named tests | `734f4048b4ae556d` |
| Other hand-run scripts | observed runs before the commit | `declared-members`, `grow-measurements`, `grow-members` | exit 0 each | `ef7e873ca75e34e7` |
| `grow-routing-browser.mjs` | observed run before the commit | `node --import tsx` | exit 1 at line 89 | `0c579baaf97259b8` |

`superseded/` holds runs the head repeated. One had a digest mismatch, and one had the browser paths unset.

## Open limits

- **One script still fails.** `grow-routing-browser.mjs` can time out at line 89, and it passed earlier the same day. The card rebuilds at each refresh, every 2 seconds, and that closes the **Read points** section. This is a product fault, so I left the script and the card as they stand. `docs/testing.md` names it, and request `76a1c020` owns the repair.
- **The deployment form.** `demo-captures.ts` against a deployed Worker did not run, because it needs one. It shares the repaired code.
- **Colour on a Mac.** I did not find why a Mac's piped Vitest output has no colour, even with `FORCE_COLOR=1`. The repair does not depend on the answer.
- **Scripts that need a local Worker.** `no-session-screens.mjs`, `mcp-second-device.mjs`, `issue-questions-browser.mjs` and `two-devices.mjs` did not run for this head. `docs/testing.md` lists what each needs.
