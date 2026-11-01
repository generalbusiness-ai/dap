# Say what a refused change waits on, and give the cards a person's words

Status: source implementation. The gate passed at `f57299c9`. A script drove the renders against a fixture host in Chromium. No person and no desktop AI app has seen these words, and the fixture does not draw the app's Reply box.

Request `c77a42725a72c33f420f9b6f2f21d5297d5c08ef` and promise `958f632c038416f8349894d203b774d2bc1017c9` own this head. The head also takes the rule lines of `219ba382`. It builds on the Page's room-wide list, `7424c6b9`, which lands first.

## What happened

A person ran `apps/views` in the desktop AI app at main `4f9f49a5`, 16:17 to 16:27 EST on 1 November. The record is planner act `c77a4272`, and the unit is `~/play/artroom-evidence/2026-11-01-person-session/`, `SHA256SUMS` `31364c3e`. The session passed its path, and it found seven things a person should not have to read. After **Request changes**, needs you still said to merge the change that the person had refused.

## A merge after a refusal does not pass

The lane refuses a merge while any submitted request for changes stands on the current version, whoever asked and whatever others approved. A new version clears the old request, and its approvals start again. So the card's old words were wrong, and the rule was right. The test `a merge is refused while any request for changes stands on the current version` in `packages/mcp/test/change-view.scope.test.ts` shows it on a real scope.

| Case | The merge's answer | The row |
|---|---|---|
| Refused, with no approvals | refused, `approvals-needed` | waits on the author, and holds `approvals-needed` and `changes-requested` |
| Another member approves | refused, `changes-requested` | still waits on the author |
| The refuser replaces the verdict with an approval | not tried | `Merge change`, with no holds |
| Another reviewer refuses after the merger approved | refused, `changes-requested` | names that reviewer |
| A new version | refused, `approvals-needed` | names the new version and the earlier request |
| A new version, approved | accepted | the row and the lane agree |

## What changed

| Finding | The card now says or does |
|---|---|
| 1. A refused version | Title: `Change 2: "TEST the fix" waits on its author, @una.` Why: `You requested changes on version 2.` Settles: `A new version from the author ends the wait. A reviewer who requested changes can also replace that verdict with a new review. Until then the room refuses a merge of version 2.` The row adds `holds` and `changesRequested`, and its clause becomes `acts.merge#changes-requested;items.review`. `needs_you`, the card and the Page share the one row builder |
| 2. The raw row | The needs-you and work cards have no JSON body. The row sits behind a closed **Exact record** |
| 3. The work card | The two rows were two issue lanes in the J5 room, from run 1 and run 2, each an accepted commitment at item 2. The title is now `Issue 2: TEST J5 run 2 The import fails on large files`, and the line is `@una2, agent of @ana2, accepted this work.` |
| 4. Kickers and receipts | `Change 2, version 3`, `Question 7`, `Review recorded: changes requested.`, `Merge started.` The model's context keeps the entry: `Review recorded: approved. Entry 39.` |
| 5. The first decision card | `FIRST_CARD_TEXT` in `apps/views/src/decision.ts` allows 600 characters and 8 lines. A question that fits shows its whole text and both acts. A longer text keeps Open and shows no part of the text and no act |
| 6. The Reply box | The fullscreen card's bottom padding is 96 px, and the inline card keeps 16 px |
| 7. Empty lists | `No work is open in this room.`, `Nothing in this room needs you.`, `Nothing has changed since your last review.` |
| Rule lines, `219ba382` | `Rule: this lane's rule for a merge after a request for changes.` The digest and the clause stay in the row, in the disclosure, in the model's context, and in an **Exact rule** disclosure on the Page |

Three safety cases hold finding 5, each with a test. A press from an old first card is refused with `revision-moved`. With `at` removed, `bodyAt` still refuses it with `stale-question`. After an unknown outcome the item offers only the check of the original, also after a person pages away and back.

## S2's desktop acceptance

The planner closed that acceptance in `49816870`, except for the actor, and asked for its limits here. Light layouts are witnessed by script only. The app-only tool list and the timeout's recovery are witnessed by test only. The actor chip is request `c6ced04f`.

## Evidence

The head is `f57299c93c6099bd53eb6876ba5346e8abdedb5c`, tree `1ba01e56`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-card-words/`, `SHA256SUMS` `e3030b8df091a0f4e002d84ffc1cc0dd54eb0872aec8466a12755d97bb628cff`. `gate-first-failed/` holds an earlier gate that stopped on a type error in the Page head's demo script, and the Page head fixed it. The previous session ended during the next gate's native stage. `gate-interrupted-1714/` retains that run, which caught SIGTERM and has no passing terminal outcome. The passing gate here restarted at the same clean head.

After the Page landed at `d56394da`, this branch merged main at `fd44b6b68a2068d07cae76086c526631b1fff367`, tree `b92a46083dc1aaf033f696c3a5f73425533e34d5`. Only notes, manifests and the report differ from the gate checkpoint. Source and tests are unchanged, so this merge adds no gate under `docs/testing.md`. The focused follow-up is `~/play/artroom-evidence/2026-11-01-card-words-merged/`, `SHA256SUMS` `77fcababcf9581e4dda69663a21d0815fd9771f1faf7121d4fd7b4628d69c48d`. [Its manifest](evidence/2026-11-01-card-words-merged.manifest.json) records the source checkpoint and the retained commands. The Card workflow's inputs remain unchanged from `90408884` through this merge.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Merged-head adapter tests | observed run | `node --test apps/views/test/*.test.mjs` | exit 0, 34 tests | `a6f2fa2a5b82bee2` |
| Merged-head focused tests | observed run; a real scope with stand-ins for Git, plus plain session and row tests | `commands.sh`: `change-view.scope.test.ts`, `view-sessions.test.ts`, `page-needs-you.test.ts` | exit 0, 42 tests in 3 files | `3c7702d6f2258a0c` |
| Merged-head card inputs | comparison of Git objects | `git diff --exit-code 90408884 HEAD --` and the card workflow's paths | exit 0, no changed input | `e3b0c44298fc1c14` |
| Merged-head links | observed run | `node scripts/check-doc-links.mjs` | exit 0, 1006 links, no broken link | `05d81cfdd4a20d7f` |
| Gate | observed run | `npm run gate` | exit 0: 3555 plain and 1027 native tests, 130 Node and 56 Counting | `088c53c8a300ab14` |
| Merge trace | observed run on a real scope with stand-ins for Git | `npx vitest run --project scope packages/mcp/test/change-view.scope.test.ts` | exit 0, 24 tests in the scope run | `d04ea37a6609b0d2` |
| Red: finding 1 | observed run with `scripts/control.mjs`: restoring the old holds | `32-control-f1-holds-scope.log` holds the output | DISTINGUISHES | `5fe2b51c1b32377a` |
| Red: findings 2, 3, 4, 5, 7 and the rule line | observed runs: a hand control for each, restored afterward | logs 21 to 27 | each fails its named assertion | `b0b2cb825386ed2d` |
| Red: finding 6 | observed run: no bottom padding | `36-control-f6-bottom-room.log` | fails `BOTTOM ROOM` with a gap of 24 px against 96 px | `4dcb24edfb4676ba` |
| Red: finding 5's binding | observed runs with `scripts/control.mjs` | logs 33 and 58 | DISTINGUISHES. Logs 31 and 56 hold two earlier controls that survived, and logs 33 and 58 replace them | `d001a3c6269f5846` |
| Card script | observed run: a loopback host stands in for the app | `node --import tsx packages/mcp/test/views-browser.mjs` | exit 0, 74 cases | `595bf0a57b5b666f` |
| Renders | observed run, driven by that script, light and dark | `renders/` | no text clipped in any state | `021cfcea4f4c6dd5` |
| J5 work cards | observed read as `@ana2` on the deployed room, with no press | `43-work-cards-j5.log` | two cards a person can tell apart | `56a66ac897304c2c` |
| Card workflow | observed run on GitHub | the run named in the review request | success in run 41355997652 at `90408884`; every card-workflow input is unchanged through this checkpoint | `d40538860623fd4c` |

## Open limits

- **The app's Reply box.** The fixture draws none, so the 96 px rests on a measurement from the person's screenshot. Finding 6 is the one reason to ask a person to look again.
- **A verdict the card cannot replace.** The settles line says that a reviewer who requested changes can replace the verdict. That is true of the lane, and the card offers no act for it, so a person can do it only by the ordinary act tool with `earlier`. The two definitions these views read also have no `withdraw-review` or `dismiss-review`.
- **Words left.** The opened change card prints `Version 2, manifest 6.` and `Lane definition: sha256:…`. The handoff text says `manifest N`, the updates heading shows a scope ID, and the question line says `Your approve act…`. The diff design, `353a0ec0`, reads the change card next.
- **Scripts not run.** I did not run the grow scripts, or the declared scripts other than `declared-views-browser.mjs`.
