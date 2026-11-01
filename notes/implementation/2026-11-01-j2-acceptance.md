# J2 acceptance: a reviewer reads a diff and an interdiff in the desktop AI app

Status: acceptance record. J2's done-when in `3cb0b014` holds on a person's report, with the limits below. The planner stated that in `ae716086`. The source landed at `8851f19d`, and the person's session ran main `237d61a6` from a local stdio process against dap-demo, on Worker version `89e59c12`.

Request `2082efd92c58b0ab84fa77fb4f3660c1722b3e4a` and promise `1e1fd1fecaae7a3b6076a2d0a438a5d1569d6ce2` own this record. Landing it closes the request.

## What a person did

The room is the repo-in-ai room on dap-demo, directory `sc_vj3clikjdkracvqipp3dsble4nxgh4ojaa3k4yzcxchnytlc2eqq`. The change is change 2, "Describe the task list in the README", which has three versions.

A person ran the third session at 13:39 EST on 1 November, as `@owner`, with the steps in `~/play/artroom-evidence/2026-11-01-j2-acceptance-4/person-steps.md`. The person reported at 14:04 EST, "retry diff and interdiff all functional". The planner then asked whether the commit IDs on each view matched the table in the steps. The person answered at about 14:08 EST, "yes". The planner's acts `e278f412` and `ae716086` hold those words. At 14:17 EST the person took the screenshot `2-diff.png`, and at 14:20 EST said, "The diff UI looks fine, and also the 'view file' UI works well", then raised the display's readability. The planner's `353a0ec0` holds that message and files the readability as a design request.

The two earlier sessions failed. In the first, at 11:07 EST, the app showed an error in place of the card, and `2026-11-01-view-domain.md` records it. In the second, at 12:17 EST, the card reached another server process, and `2026-11-01-view-two-process.md` records it.

## What the app did

| Question | Answer | Source |
|---|---|---|
| Did the app render the card? | Yes. This is the first time a card from the landed view kit rendered in this app | the person's report; `1-card.png` |
| Did the app take the answer's size? | The person's words are "all functional", and no record names a size. The scripted press measured **View diff** at 10,829 bytes and **Interdiff from Version 1** at 14,638 bytes | `5892d0a6` |
| Did the first press work? | No. **View diff** answered after 11.58 s, the card had stopped waiting at 10 s, and each later press refused as stale | `71d50311` |
| Did the person read the views? | Yes, after reopening the card | the person's report; the journal |
| Does a screenshot show a band? | Yes. `2-diff.png` shows **Interdiff from Version 2 to Version 3**. Its four commit IDs equal step 2 of the table: `aeae3275`, `c296c980`, `92a84227` and `716958a7`, each in full | `2-diff.png`, read by me |

The destination's journal holds three `read-token` acts by the owner's key, at entries 60, 70 and 72: 18:43:52Z, 19:03:53Z and 19:17:28Z. The app's log has `tools/call` ids 13 to 17 from 19:03:08Z to 19:03:49Z, and ids 18 and 19 at 19:17:25Z and 19:17:37Z. So the session signed three reads and read at least a diff, an interdiff and a file. No record names the read that each act carried. By reconstruction, the first act's diff stayed held in the server, and the reopened card showed it with no new signature.

## How step 1 ran

Step 1 ran with no person. A scripted MCP client drove `apps/views/src/node.ts` over stdio under the enrolled `agent-a` home.

- **Bands.** Each view's band equals the answer's commits and `git rev-parse`, for diff, interdiff and file, on all three versions.
- **Signatures.** Each new read signs one `read-token` act. A held read and reading the card sign nothing.
- **Artifacts.** A read token got every commit under `refs/artroom/staged/`. Artifacts advertises those refs, so `git ls-remote` lists them too. `docs/security/trust-boundaries.md` now states that rule, as the planner asked in `afaa217a`.
- **Credentials.** No answer holds the read-session bearer, a workspace token or the provider token's shape. Byte searches of 110 and 98 evidence files find none.

A checker has not reviewed step 1 until this head. My message `986b0da9` said that review comes with the note on a head.

## What the record must label

- **Change 3's acts.** The planner signed `review-verdict` at lane entry 22 and `merge` at entry 23 with the owner's home, for this run, to move the base. No person reviewed change 3 in the room. The destination's result reached the lane at entry 24.
- **A fault in the witness's labels.** `out/client-v1.log` and `out/v1/rows.json` in the first unit say "another key" for lane entries 22 and 24. The record shows `@agent-a`. The sealed files stay as they are, so read the journal over those two labels.
- **Copies of the text.** My message and review for `415fc265` said a frame holds a read's text once. That holds only over the 32 KiB bound. Under the bound, a frame holds the text twice: once in `structuredContent` and once in the fallback text. That is down from six copies.
- **Version 2's diff.** The card showed version 3's diff, because **View diff** reads the current version. The steps cover version 2's diff with `git show` in a terminal, and the interdiffs reach version 2's commits on the card. The planner accepted that in `a9e57c01`. No record shows the person ran that command.

## Evidence

Each unit below is sealed and read-only. This head changes only documents, so it adds no gate of its own.

| Check | How taken | Where | Result | Digest of `SHA256SUMS`, or of the file |
|---|---|---|---|---|
| Step 1, versions 1 and 2 | observed run on dap-demo, scripted client | `~/play/artroom-evidence/2026-11-01-j2-acceptance/` | bands equal `git rev-parse`; largest answer 15,832 bytes before the copies came down | `d7a4e943b1dda8447707b1eb1091f702a89fdb27c408cfa92ac136e96df19321` |
| Step 1, version 3 and the press after the hold | observed run on dap-demo, scripted client | `~/play/artroom-evidence/2026-11-01-j2-acceptance-2/` | bands equal `git rev-parse`; answers byte-identical to those before the hold | `8b514df6b4b3bcd56760e4f6d1eb9a139275d46250b3a4ab6c2bce04c7e8bcd7` |
| The person's steps | written by me | `~/play/artroom-evidence/2026-11-01-j2-acceptance-4/person-steps.md` | the table of commits that the person compared | `4d4220f274dc6e52732966f8b6fac3c0c49b19c5da3532c43d69a7b4e1bc0ff5` |
| The card in the app | a person's screenshot | `~/play/artroom-evidence/2026-11-01-j2-person-3/1-card.png` | the card rendered; it shows no band | `25484604723e3bb99136f025f149c6b31a8115700dac6b167a951974014b3bb1` |
| A band in the app | a person's screenshot | `~/play/artroom-evidence/2026-11-01-j2-person-3/2-diff.png` | the interdiff's band names four commits that equal the table | `f9360817a9201e1fdeb54f35d2842552761ec743747a376e3906eb44a93c8aa0` |
| The person's report | a person's words, relayed by the planner | `e278f412`, `ae716086`, `353a0ec0` | "all functional"; "yes"; "the 'view file' UI works well" | the acts' IDs |
| The reads signed | observed read of the destination under `agent-a`, entry times and act kinds only, at 14:29 EST | `entries.mts 60 95` in `~/play/artroom-evidence/2026-11-01-card-press/timing/` | three `read-token` acts by the owner's key; the acts between them are `agent-a`'s timing runs for `71d50311` | this note's times |

## Open limits

- **A band read by a person.** One screenshot shows one band, and it equals the table. The other bands rest on the person's one "yes", with no list for each band.
- **Not run in the app.** **Request changes** did not run there. The change lane has no new entry from the session. The planner did not ask for it for this clause. The planner's `e278f412` also names the **File** press as not run, and that was true at 14:04 EST. The person's later words and entry 72 show a later read, and no band of a file was compared with the table.
- **The answer's size in the app.** Nothing shows the app's limit, and nothing shows whether it passes `structuredContent`.
- **The press timeout.** The person reopened the card to read, so `71d50311` stays a defect until its head lands. S2's desktop acceptance stays with the planner.
