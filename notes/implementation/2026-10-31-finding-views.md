# Show open findings in needs_you and on the Change card

Status: source implementation. The gate passed at `2055112d`. No Worker runs this code yet, and no browser host has shown the card.

Request `eb4da1f1e4a68c94101369b48ff9c96b2e3959de` and promise `5dc0f9fd4621a68e9756889be3ec14f627ed301e` own this head.

## What changed

A room on the finding definition now keeps its Change card and its S4 views, and a person can see which findings hold a merge.

- **Profile.** `needs_you`, `work`, `change` and the Change card accept change lanes on two exact pins: J4 and its finding successor. Any other pin still reads as unsupported. No generic profile loader exists.
- **`needs_you`.** An open finding from a required source gives a row of category `open-finding`, when the reader has an act that bears on it. The row names its pin, the clause `acts.merge#finding-open;items.finding`, its head, the rules revision, the source's row, the finding and its `acts`. A `merge-attention` row on this profile adds `heldBy`, the IDs of the findings that hold the merge.
- **Change card.** A new **Open findings** section gives each finding's file, range, class, severity, source, source version, change version and filer. Its status line says whether it holds the merge. The card offers no **Merge** while a finding holds it.
- **`change`.** The tool returns each open finding whole, with its scenario, `required`, `holdsMerge` and `answerAt`.
- **Escaping.** The file, class and source version are the source's own text. `shownText` in `apps/views/src/findings.ts` escapes them by the rule of S6's diff path, on the card and in the `needs_you` row.
- **Reference.** `apps/views/README.md` and `docs/mcp.md` describe the rows, the card and the route to answer.

## Decisions

- **No card answers a finding.** The request makes this optional. The ordinary `dap mcp` server already has `change.resolve-finding-any`, `change.mark-finding-irrelevant` and `change.resolve-finding-own`, and the README names them.
- **Keep `at` as the documented route.** The first two tools read revisions from the live summary, and a finding on an earlier version has left it. So the scope refuses them with `bad-intent` unless the caller passes the finding's `answerAt` as `at`. The fix belongs in `packages/mcp/src/service.ts`, which is hosted code outside this request, so the review raises it with the planner.
- **The views read the guard's inputs and decide nothing.** The lane's `merge` guard holds the merge. The views read the same rules row and the same open items, so a card read before a later finding can still offer **Merge**, and the scope refuses it as `finding-open`.

## Evidence

The checkpoint is `2055112de2dc0ac23f76a6786f1870c4030c31a4`, tree `4a0f905ddd7f1d257ec5c30a644eb2c5560e09d2`. It includes main `b686862e`. Raw evidence is in `~/play/artroom-evidence/2026-10-31-finding-views/`, `SHA256SUMS` `5cd97fc2a4d8d3b6ad3e7ce84a0c6e5eff8268042778abc1a1ca44eaf1f1e12e`. The reviewed head adds only this note and its manifest.

Before any change, `gap/gap-run.log` ran a change lane on the finding definition against the S4 reads and the S6 card, at `76cac675`. `needs_you` and `work` answered `unsupported-profile`, `change` answered `change-unavailable` with reason `change-profile-unsupported`, and `view_change` was unavailable. `since` read normally, and the scope refused a held merge. So the gap the request names was real, and only the views had it.

Controls C1 to C24 ran at `6ed502a5`. Two later commits follow them: `1964e8bf` moves one README paragraph, and the merge of main adds S1 and the 31 October report and touches no path these controls read. The real lane's case is `a real lane on the finding definition` in `packages/mcp/test/change-view.scope.test.ts`, and the scripted cases are in `apps/views/test/s4.test.mjs`.

| Done-when item | Controls |
|---|---|
| An open required finding appears in `needs_you` and on the card, and it holds the merge | C1 to C6 |
| After an answer, it leaves both, and the card offers **Merge** | C7 to C10 |
| A finding from a source that is not required does not read as holding the merge | C11 to C13 |
| A room with no finding profile reads as before | C14 to C16, and the golden reads in `apps/views/test/j4-reads.golden.json` |

C17 and C18 hold the exact pins. C19 and C20 cover control and bidi characters. C21 and C22 cover who gets a row. C23 and C24 cover a finding on an earlier version. C7 and C8 use scripted reads, and C9, C10 and the case's own assertions cover the same answer on the real lane.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `f68174f08213cc6d` |
| Gap run at `76cac675` | `vitest --project scope change-view.scope.test.ts -t "GAP RUN"` | 0 | `b242877bdc0f68a7` |
| Controls C1 to C24, one log each | `controls/run-controls.mjs` | 0 each | `f8ba47ddf0750361` |

The gate reports 3236 plain and 901 native tests, 115 Node and 56 Counting.

## Open limits

- **"You can act" is the agent's reading.** A row depends on the reader's role and parties. A controller of an agent author gets no row, and the scope alone decides.
- **Non-finding rooms.** Their reads are byte for byte as before, apart from the catalogue. The catalogue's `revision` and the `change` tool's description change everywhere.
- **Mixed rooms.** A room with both profiles lists `change.merge@656c87eb` and `change.merge@a43e108c`, and no plain name.
- **An older card.** A card read before a finding can still offer **Merge**. The scope refuses it with `finding-open`.
- **An earlier version's read.** If that read fails, `needs_you` answers unavailable for the lane. It does not guess at the findings.
- **Sizes.** The card has 60 KiB, `change` has 256 KiB, and `needs_you` has 50 rows. Long file names can reach the card's budget before the 256 findings a change can hold.
- **Not run.** Nobody ran the card in a browser host, or `apps/views/src/node.ts` itself, or `act` in `--generic` mode for the two dismiss answers or with `at`. No Worker or real room has run this.
