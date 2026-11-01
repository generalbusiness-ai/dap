# List what needs a person on the Page's first screen

Status: source implementation. The gate passed at `aa706bd7`. The scene passes on a local Worker in a browser, and a script drove it. No deployed Worker has run this head, and no person has used this screen, so J5's acceptance stays open.

Request `7424c6b9583a9a345affedb16b8f85b20649241c` and promise `8268feb1f346003803e5146499c73a5eae65ccd5` own this head. Request `51ff164cd4193afea7bd5fce77f86af6c90ab002` owns the deployed run and stays open after this head lands.

## What changed

The Page had no list of what needs a person across a room, and a decided question left the screen a person had open. So a person who came back had to open each issue. Now **Needs you** sits at the top of the Issues screen, `#/`, which is the first screen after sign-in.

- **`apps/views/src/needs-you.ts`, new.** The walk over the lanes, its bounds and the lane window moved here from `reads.ts` and `repo-in-ai.ts`. `needs_you` and the Page both call it, so one row builder and one set of words serve both.
- **`apps/views/src/attention.ts`.** It gains `laneName`, `notShown`, `lanesLeftOut` and `decidedLine`. A `pr` lane now reads "Change 3" where the `since` list and card said "Lane 3". The request did not ask for this word.
- **`apps/room/page/src/data.ts`, `view.ts`, `main.ts`.** They add `loadNeedsYou`, `decided` on `IssueView`, the section and `?after=`. `assets.ts` grows by about 13.5 KB.
- **`apps/room/page/test/needs-you-browser.mjs`, new.** It runs the scene. `packages/mcp/test/page-needs-you.test.ts` and `page-needs-you.scope.test.ts` hold the rows and the words on a stand-in and on a real scope.
- **Docs.** `apps/room/docs/page.md`, `apps/views/README.md` and `docs/testing.md` name the section and the script.

## The scene

A script drove headless Chromium against a local Worker from the pinned wrangler. It typed one value, the device link, and after that only pressed and reloaded.

1. `@vic` asks Ana in two issues, and `@rita` decides a third question while Ana is away.
2. Ana redeems the link and lands on the first screen. **Needs you** lists both items, in the order and the words of the `needs_you` server: what needs Ana, why, what settles it, who waits and the rule.
3. After a reload, the list is the same. It also shows the decided question, with who decided it, when and the comment.
4. Ana opens an item, and the issue's screen shows it. That screen keeps the decided question and its text after a reload.
5. No lane head moved, no item changed, and the page sent no act while it read.
6. Ana presses **Approve** and then **Decide**, and each act answers 200. The item leaves the list. Both decided questions remain after a reload.
7. With seven lanes, the list says what it left out. A press reaches the rest, and another press returns to the first lanes.

## Decisions

- **How an item opens.** The row links to `#/issue/<scope>` or `#/change/<scope>`, and that link only reads.
- **What "decided while away" shows.** The list shows decided questions, and it has no read mark, so it cannot tell which are new. The list says so. It holds the newest five for each lane that it read and counts the rest. The issue's screen holds all of them, and the 20 newest show who, when and the text.
- **Withdrawn questions.** The list leaves them out, because the request asks about decided ones.
- **Each `needs_you` category shows.** A browser reads all five. Requested review on a question ran with a real scope in the browser, decision-due in the browser on a stand-in, merge-attention and open-finding on a real scope and a stand-in, and requested review on a change and unknown-merge on a stand-in only.

## What a cut-short list says

| Case | Words |
|---|---|
| Lanes left out, more follow | "This list leaves out 1 lane." and the link **Read the lanes that follow** |
| The last window | "This list leaves out 6 lanes. No lane follows this one." and the link **Read the first lanes** |
| More than 50 rows | "This list leaves out 10 more items. Settle some of the items above, then read it again." |
| An unread lane | "This list could not read 1 lane, so it can leave out items there. Open each one to read it:" and a link to the lane |
| Older decided questions | "This list leaves out 2 older decided questions of" and a link to the lane |
| An unreadable decided query | "This list could not read the decided questions of 1 lane." |
| Nothing found, whole list | "Nothing in this room needs you." |
| Nothing found, cut list | "Nothing in the lanes this list read needs you." |

## Evidence

The head is `aa706bd7136426d09038d2013befba6cb54d7f93`, tree `2a595280`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-page-needs-you/`, `SHA256SUMS` `ebb27a18b2d13dfd432c3a36e28ae4d4ae8dfc81f1cba12fa769306887f77597`. After the gate the head adds this note and its manifest, and it merges main `bea12935`. The merge shares `docs/testing.md` with this head, and the two edits touch the same table row. The focused checks at the merged head and the page workflow's run appear in the review request.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3550 plain and 1025 native tests, 116 Node and 56 Counting | `604688ade7b673fe` |
| The scene | observed run, a script in headless Chromium on a local Worker | `apps/room/page/test/needs-you-browser.mjs` | exit 0: 85 of 85 steps | `acb7e3ed48b70be5` |
| Red: the old Page | observed run: main's bundle on this head's Worker | the same script | exit 1: 38 of 41 steps fail, and the first names "the first screen" | `c0ccb1c791f7a8e6` |
| Controls | observed runs: 5 in the browser, 15 by `scripts/control.mjs`, 5 by hand on `apps/views`, each restored | `controls-index.txt` lists each one | all 25 exit 1 or report DISTINGUISHES. 24 name a failed step or assertion, and `next-reads-same` ends on a timeout that its error log names | `cc488b8300449a77` |
| `apps/views` tests | observed run | `node --test` | exit 0, 22 tests | `a9ab4d1c683900f5` |
| Security entry points | observed run | `node --test scripts/security-entry-points.test.mjs` | exit 0, no seal moved | `5bc4d274a65b3ea2` |
| `test-changed`, before the gate | observed run | `node scripts/test-changed.mjs 3e055104` | exit 1: 2 of 305 fail, on the 30 s limit with no failed assertion: `source-preview.scope.test.ts` and `task-data.scope.test.ts` | `ae527ca908329caa` |
| The same two files | observed run, alone | `npx vitest run --project scope` | exit 0, in 9.9 s. Both also pass in the gate. I did not prove the cause of the two timeouts | `4792508d6deb0adc` |

A token scan of the evidence's files found no link, bearer or session shape. The scan does not read images, so the screens' contents rest on the script's fixture values.

## Open limits

- **The deployed run and a person.** The Worker needs a deployment of the new Page bundle, `apps/room/page/assets.ts`. No definition, migration or wrangler setting changes, and `needs_you` runs locally and needs none. The deployed run and its record close `51ff164c`.
- **Bounds.** The Page applies the lane, row, item and 20 s bounds of `needs_you`. It has no 256 KB byte cut, because that bound guards an MCP answer. It has no request, page or byte counters, and its item count covers membership and lane rows and not the directory's other items.
- **Default rooms.** The walk reads only lanes under the issue definitions that these views know, and each lane of a default `dap install` room uses another definition. So the list on such a room always says that it could not read those lanes, and links them. That is true and noisy, and the planner owns whether to change it.
- **An open finding's row.** The row carries the words and opens the change screen, which shows no finding text. I did not run the answering of a finding from the Page in a browser.
- **No live updates.** The list reads when the screen draws, so a new item appears after a reload or a navigation.
- **Lane order.** The walk keeps `localeCompare`, so a browser in another locale can split the windows differently from the adapter. A walk still reaches every lane.
- **`tsconfig.scope.json`.** The agent could not run it in the worktree, because `@cloudflare/workers-types` was missing from its `node_modules`. The gate's typecheck passed.
