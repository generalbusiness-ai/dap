# The Page's room-wide list on dap-demo

Status: evidence for the checker's review. Acceptance `51ff164c` stays open until the checker approves this run and this record lands. Scripts drove every step. No person or desktop AI app ran it. One Mac, separate command-line homes and a browser profile stand in for two devices.

Request `51ff164cd4193afea7bd5fce77f86af6c90ab002` and promise `d63500549fcca74a180b5389537151764a45341b` own this record. The source landed at `d56394da`, after approval `f14c49a2`. The planner deployed it in `de5e0fe8` and released the scene there.

## What the run showed

The room has four issues. The new issues use the Brief definition: 3, the import, and 4, the export. `@una3`, an agent controlled by `@ana3`, asks Ana to choose an import format and waits. `@vic3` asks Ana another question on that issue and one on the export. Rita decides a different export question before Ana's browser joins. The script supplies no elapsed days.

Ana's first device is the real `apps/views` server over stdio, with a script as its host. It returns three rows across the two new issues, with `complete: true`, no unread or omitted scope and no omitted row. Chromium redeems a fresh device-key link on the deployed Page. That link is the only value the script types into a Page form.

The first screen shows all three rows, in the order and words of `needs_you`: what needs Ana, why, what settles it, who waits, and the rule. A reload keeps them. Rita's decided question stays in that list with its author, time and comment. Ana opens the export row and reloads its issue: the open question and Rita's decision, including its body, remain there. Neither fixture lane's head changes, and the browser sends no act during these reads.

Ana then presses the Page's **Approve** and **Decide** buttons on Una's question. Each sends exactly one act and receives 200. Approve leaves Una waiting. Decide wakes Una's real process, which exits 0 and names entry 11. A fresh process reads that entry, then releases the block as entry 12 with Una's own key. `dap verify` exits 0 and says `Result: consistent` for the coverage and trusts it states.

The first device then returns two rows. The Page agrees: the answered item leaves, and Ana's decision stays after a reload. Rita's earlier decision and the export's still-open question also remain.

## What the first stop and the control mean

The old Page control uses the HTML and JavaScript from previous deployed source `0719adce` in this browser. Its data reads still reach dap-demo. It fails 15 of 19 checks, starting with the assertion that the first screen lists what needs Ana. It sends no act. The control changes no Worker deployment.

The first new-Page read attempt shows the three rows and Rita's decision after reload, then times out for 60 s while waiting for the comment action slot after a row press. It writes no final JSON report. `failed-read-1/` retains that attempt. A separate read-only diagnostic then opens the correct issue with its open and decided question, no browser error, no act and no head change. The next run of the same frozen read script passes all 51 checks with unchanged source and room data. The cause of the first timeout stays unproved. This record makes no claim that a fix removed it.

The final Page read passes 43 checks after the acts. The two passing reports, the failed attempt and the diagnostic remain separate.

## The real wait

The wait holds for 535.958 s. Its own fetch log records two streams. At +308.4 s, Node reports `BodyTimeoutError`, `UND_ERR_BODY_TIMEOUT`, with an HTTP/2 stream timeout after 300000 ms. The wait opens stream 2 at +309.6 s. Approval produces a head line at +506.1 s and does not wake it. Decision produces a head line at +535.3 s, and the process cancels that stream when it exits 0.

The exit comes 3950 ms after the Page press, one observed clock difference. The log records 15 requests, all with status 200. The stream error remains in the timeline even though the wait recovers. The fetch tap writes no header or body.

## Evidence

The live source is `d56394da6f1a9cfe5ec605f2b1b829ddf80e93cd`, tree `0b852a36d38ddd9ef25a8e3d58e5f4b8ea6f3f69`. dap-demo reports version `300fb93a-5b81-40fb-a657-9404fc3f6d6d`. Its `page.js` bytes exactly match the frozen witness checkout. That checkout stays clean and at the same head throughout the live run.

Raw evidence is `~/play/artroom-evidence/2026-11-01-j5-page-acceptance/`, `SHA256SUMS` `12dc8743400c4a4ced187c153b2b81451b55938036e419cdba98a1a5bb6c0cde`, 162 files including `SHA256SUMS`, all read-only. [The manifest](evidence/2026-11-01-j5-page-acceptance.manifest.json) names the files below and the screenshots. `commands.txt` records the commands, the empty first setup launch and the failed metadata check under Python 3.9.6. Setup ran in a separate process session after that empty launch. The metadata check passed with the existing Python 3.14.5 interpreter; the live scene did not rerun for that tool correction.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Deployment | observed HTTP read and byte comparison | `0-check-deployment.mjs` | exit 0, exact Page bytes, sessions ok and register ready | `b3faf9eb8a8ea651` |
| First device | observed stdio run, with a script as host | `5-first-device.mjs` | exit 0, three rows across two issues, complete | `581f4b08eeda8bc9` |
| Old Page control | observed Chromium run against deployed data | `4-roomwide-read.mjs --old-page` | exit 1, first-screen assertion fails, no act | `f02b5793eaf72b59` |
| First opening stop | observed Chromium run | the first `4-roomwide-read.mjs` | exit 1, comment-slot timeout, cause unproved | `4df426aec76a1e6b` |
| Diagnostic | observed read-only Chromium run | `diagnostic-navigation.mjs` | exit 0, correct issue, no error or act, same head | `75705a08e9d52c28` |
| Room-wide read | observed Chromium run, same frozen script after the stop | `4-roomwide-read.mjs` | exit 0, 51 checks, no act, both fixture heads unchanged | `5dab2b9d8dfef863` |
| Approve | observed Page press, no typed act field | `8-page-press.mjs approve Approve` | exit 0, one 200 answer, wait still holds | `efc2bb4bdb544a20` |
| Decide | observed Page press, no typed act field | `8-page-press.mjs decide Decide` | exit 0, one 200 answer, wait exits 0 | `f2cf022b146af21d` |
| Wait timeline | calculation from the process's own observed fetch log | `analyse.mjs` | exit 0, 535.958 s across two streams | `9863f690df9f5b2f` |
| Resume and verify | observed real processes with Una's key | `9-resume.mjs` | exit 0, release at entry 12; verify exit 0 for its stated coverage | `765ed0ec45cd0154` |
| Final list | observed Chromium run after a fresh stdio read | `4-roomwide-read.mjs --after` | exit 0, 43 checks, two rows, decision retained after reload | `838887cf41b96a24` |
| Recorded outcomes and inputs | check of retained files and the frozen checkout | Python 3.14.5 `validate.py` | exit 0, all expected outcomes and input hashes agree | `10f620b314c43827` |
| Text scan | pattern scan; images unscanned | `validate.py` | 142 text files, no matching link, bearer or JWT shape; 17 images unscanned | `10e80d0b4cc7c489` |
| Earlier unit's count | filesystem count and `SHA256SUMS` line count | Python `Path.rglob('*')` and `read_text().splitlines()` | 78 hashed files plus `SHA256SUMS`, 79 files in all | `925574290ac81438` |

The earlier [J5 record](2026-11-01-j5-deployed.md) now counts its 78 hashed files and the checksum file. That corrects the 77-file sentence named by checker `c75de866`; its sealed evidence remains unchanged.

## Limits and owners

- **The first opening timeout.** Its cause remains unproved. The checker reviews the failed and passing attempts under `51ff164c` before that acceptance closes.
- **Devices and people.** A browser profile and separate homes stand in for another device. A script drives Chromium and stdio. This run gives no person or desktop-app observation. The next person's check of the Reply box belongs to `c77a4272`'s recorded limit; the actor chip remains `c6ced04f`.
- **Definition coverage and bounds.** This scene uses the supported Brief definition. The default-room warning and the issue screen's handling of a failed decided query remain `e82c6550`, under `c70dc4bf` and `f14c49a2`. The six-lane and cut-list behavior has the source head's local witness; this deployed run uses four lanes.
- **Review marks.** This scene presses no mark. Its one-device meaning remains `e82c6550`.
- **Enrollment and verification.** Una's key joins through the original scripts' composed `invite-key` and `enrol`. `dap verify` names its coverage and trust assumptions; this record claims that reported result.
- **Later source.** Main's card findings landed at `ce42f582` after this Page deployment. This witness records the deployed Page at `d56394da`. The record merges the already-reviewed main and changes only documentation.
