# Read and answer a question on the Page's issue screen

Status: source implementation. The gate passed at `9541f0ba`. The Page is served by the Worker, so a person sees this only after the planner deploys it. The J5 scene on the deployed Worker, `756bb8b9`, runs after that deployment.

Request `dd70e463fc61b989c76c8107dc6c41acc1e704e8` and promise `b6a8333ed538d6f8cc832141eb39278e0731c294` own this head. It comes from the J5 scene of 1 November (`126b5961`) and the planner's ruling `4e97323a`.

## The scene

Ana returns on a second device and opens issue 1 on the Page. Under **Questions**, Ana reads each open question with its text. A question that needs Ana also says what needs Ana, why it is theirs, what settles it, who waits on it and the rule. Ana reads one, and it stays open. Ana presses **Approve**, and then **Decide**, and types nothing. Each act lands, and the row changes after each press.

Before this head, the screen showed none of this. `approve` and `decide` sat among raw forms that asked for a JSON fact that the Page did not show.

## What changed

- **`apps/views/src/attention.ts`** now holds the question rows, the lines under a row and the answers a viewer can press. `apps/views` and the Page both call `questionRows`, `reasonLines`, `whyLine` and `questionOffers`, so there is one set of words. It also adds `otherRequestLine`, for a request that names another member, because `apps/views` had no words for that case.
- **`apps/views/src/words.ts`** is new and holds `sameOptional` and `shownText`. They moved so that `attention.ts` reaches no room read and no Node module. The old modules re-export them.
- **`apps/room/page/src/data.ts`.** `loadIssue` returns `questions`, read from one summary. It reads and checks the entry of the question's text, so an answer carries an exact fact. A name that disagrees with the record gets no answer.
- **`apps/room/page/src/view.ts` and `main.ts`.** The issue screen lists the questions. Each answer is a form with one button, under `data-act`, so the shell's fence holds it during a send. A press goes through the same `send` as every other act. The raw forms stay under **Advanced**.
- **The Devices screen** names `dap join` in the words under a new link.
- **`notes/implementation/2026-11-01-view-two-process.md`.** One sentence now says "by its revision or its guards", as the checker asked in `853a7367`.

The Page imports `apps/views/src/attention.ts` by relative path, because `apps/views` is not a package. `attention.ts` imports the two question digest files by path for the same reason: the package's index would bring every definition into the Page's bundle. The Page's asset module grew by 7,446 bytes.

## Evidence

The head is `9541f0ba63607e1b5ac1e318defd319b61c4b42b`, tree `2349f870`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-page-questions/`, `SHA256SUMS` `76cfdec4062430169f052e5d75aa6e2cf945c3663709ee16cb2c218c4d4afc93`.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3538 plain and 1024 native tests, 116 Node and 56 Counting | `a8269445cc9599ac` |
| Real scope | observed run in the gate: Native M8, the lane's judgments and Worker HTTP. The Git host, the clock and the scheduler are stand-ins | `packages/mcp/test/page-questions.scope.test.ts` | 2 tests: the row's words equal the adapter's row, reading adds no entry, both answers land, and a request on older text offers no answer | the gate's log |
| The scene in a browser | observed run. A script drove Chromium against a local Worker from the pinned wrangler, on one Mac. The script typed one value, the device link. The real `apps/views` server supplied the words to compare | `node apps/room/page/test/issue-questions-browser.mjs` | exit 0: 21 of 21 steps, 2 acts, each answered 200 | `2af4e83d94c6b683` |
| The old screen | observed run at main `237d61a6`, by `WITNESS_ROOT` | `controls/run.sh` | exit 1: 9 words checks fail, and the script finds no **Approve** | `e173ebf9f69e4401` |
| Control: no answers | observed run with the source edited and the bundle rebuilt | same | exit 1: no **Approve** | `45bd715b4fd292cb` |
| Control: a second set of words | the same | same | exit 1: `the screen shows why it is yours, in the words of apps/views` | `5488602eb5d4a88e` |
| Control: reading signs | the same. An earlier run stopped on a script error, so the witness gained a named check and I ran this one again | `controls/run-read-signs.sh` | exit 1: `reading signed nothing` | `c8abf36a63587c33` |
| Control: no `dap join` words | the same | `controls/run.sh` | exit 1: `the Devices screen names dap join` | `5e50692b2a3f1b00` |
| Screens | saved by the same run | `witness/screens/` | opened, approved, decided, Devices | `7f849db69352f165` |

## Open limits

- **No deployed run yet.** A script drove a browser against a local Worker. No person has used this screen. The J5 scene owns the deployed run.
- **A row with no button.** A viewer whose role lacks `issue.approve` reads the row and gets no button and no reason, as on the card. The scope would refuse the act. The room's rules decide this, and the words can come at this screen's next edit.
- **The Brief.** The Page holds no Brief, so it shows the digest and the sentence "Approval does not approve the Brief or conditions." The card withholds its answers when its retained Brief differs. The Page cannot compare, so it offers them, and the scope judges the text at `bodyAt`.
- **The issue list.** The list does not mark an issue that needs the person. A person opens the issue to learn that. The planner limited this head to the issue screen.
- **A question on another definition.** The list covers the two question pins, as `needs_you` does. Other definitions show no **Questions** section.
- **`apps/views` and the default install.** The witness installs the `commons` cohort, because `apps/views` refuses the directory of a default `dap install` with `directory-unsupported`. The Page does not depend on that. A person on such a room gets the Page's list and no card. Next cohort `8a8902f3` owns that choice.
