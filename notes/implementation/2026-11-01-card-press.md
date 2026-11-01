# A card's press outlasts a read, and the card recovers when no answer comes

Status: source implementation. The gate passed at `ee6e7d1f`. A script drove Chromium with a loopback host in place of the app, and no desktop AI app has run this code. No Worker change is needed for that app, because the card runs from the local stdio process. The Worker bundle's bytes change at the next deployment.

Request `71d50311974ce1ce888c786e1d50bc488f2ab0ba` and promise `3c7517361fc78a13f67e3f4d0e2c7b5c38a19746` own this head. The request comes from a person's session on J2's change, at 13:43 EST on 1 November.

## What happened

The person pressed **View diff**. `tools/call` took 11.58 s, and `packages/mcp/browser/bridge.ts` gave every host request 10 s. So the card said "tools/call: the host did not reply. No action was retried." The press had signed a `read-token` at destination entry 60, so those words hid a permanent act. The late answer then moved the view's cut in the server, the card kept the old cut, and each later press refused as stale. The server's words said "Read it again", and the card offered no way to read.

## Why that press took 11.58 s

The numbers below come from observed runs under the `agent-a` home at `237d61a6`, in new processes, with each HTTP request logged. They are not the person's process.

| Case | Total | From the press to the act's POST | Requests before the act | From the POST to the answer |
|---|---|---|---|---|
| First press, no wait | 6.28 s | 3.49 s | 12, in series | 2.79 s |
| First press, 27 s after the item read, as in the person's order | 8.88 s | 5.87 s | 12, in series | 3.01 s |
| First press, right after the item read | 4.59 s | 2.88 s | 12, in series | 1.71 s |
| Second press in one process, an interdiff | 2.47 s | 0.80 s | 6, in series | 1.67 s |

So a process's first press costs 2.9 to 5.9 s before the act, and a later press 0.8 s. The first press sends a session POST, four scope reads and the 52 KB retained definition on top of a later press's six requests. Those requests account for all but 26 ms of that time, and local CPU is 57 to 130 ms a press. That covers the person's 5.8 s before the act, and it answers the planner's candidate of a first session under this home: yes, and the scope reads and the definition add to it. These are single runs, so they do not show that the 27 s wait caused the longer time.

The 5.8 s after the act is only partly explained. The destination's entries show that the person's mint took 806 ms. These runs took 1.67 to 3.01 s from the POST to the answer, so about 2.8 s stays unexplained. The person's press was the first `read-token` and Git read on that destination in 64 minutes. A run after a long gap measures that candidate, and its result is not in this note.

This head does not make the press faster. It makes the card wait long enough.

## What changed

- **`packages/mcp/src/views/waits.ts`, new.** `TOOL_WAIT_MS` is 120 s, and the bridge uses it for `tools/call`. A message the app answers itself keeps 10 s.
- **The bound I chose.** The slowest press with one stalled request at each stage takes 113 s: the session 30 s, the act 30 s, the read of the mint 30 s, eight one-second pauses and the Git read 15 s. So the wait is 120 s. A press with several stalled requests at one stage can pass it, and the sum of every request at its limit is several minutes. I did not choose that sum, because the card would look stuck for that long, and the recovery below covers it. A test holds the wait above the 113 s from the constants.
- **`packages/mcp/browser/main.ts`, no answer.** After no answer to a press, the card reads its view again. It says: "The app gave no answer to this press, so the card does not know how it ended. The request may have gone, and a permanent read may have been signed. The card read its view again. Check it before you press again." An act's press says "an act" in place of "a permanent read".
- **The same file, a stale refusal.** On a press or a move, the card reads its view again and says: "The card had changed, so this press sent nothing. It shows the current state now. Check it, then press again."
- **The same file, a read that fails.** When a call gets no answer or finds the server busy, the card offers **Read the card again**. A person is never left with words that name a read and no button.
- **The summary.** The title is underlined, and the summary has an **Open** button. `apps/views/src/change.ts` and `decision.ts` replace the raw digest and `acts.review-verdict / acts.merge` with one sentence: "Open this card to read the change, review it or merge it. The room's rules decide each act." The lane's definition moved to the first line of the change card's body, where a reader of the item page sees it. `apps/views/test/j4-reads.golden.json` changes in five fields only: the reason on three screens and the body on two.

`packages/mcp/src/service.ts` exports `VIEW_DIFF_POLLS` for the test, so its seal moved. The test reads `DIFF_READ_MS` from the Git package's source, because `scripts/active-source.test.mjs` keeps that package out of this package's tests.

## The person's steps

The planner asked me to move the person's steps to this head. J2's acceptance met its done-when on the person's reports at 14:04 and 14:08 EST, so no further session is owed for J2, and I did not move them. The worktree `j2-accept-20261101` stays at `237d61a6`. A later session needs that worktree moved to main.

## Evidence

The head is `ee6e7d1fb65e88861d65c5263c02157df207e9ab`, tree `fc50fcf7`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-card-press-head/`, `SHA256SUMS` `da4726243abd09af0501222ac8f57b24be73bde42be665a1746de9bc86110d5a`. The card workflow's run 41341774176 succeeded at `ee6e7d1f`, the source commit. After the gate the head adds this note and its manifest, and merges main. The merge touches no card path.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3539 plain and 1024 native tests, 116 Node and 56 Counting | `9ddf02a949207a1f` |
| First gate | observed run, failed | `npm run gate` | exit 1 at typecheck: a test imported the bridge, which needs the DOM. The wait moved to `waits.ts` | `71c33a6dcefd3421` |
| Second gate | observed run, failed | `npm run gate` | exit 1 at `active-source`: a test imported the Git package. The test now reads the constant from source | `47303ce9dc9d7c6b` |
| The card's script | observed run in Chromium on one Mac, a loopback host in place of the app, the real service over a fixture scope, and a fixture Git read | `node --import tsx packages/mcp/test/views-browser.mjs` | exit 0: 30 of 30 cases. `signed-read-11600` has a real clock. `read-outlasts-wait` has a SCRIPTED clock: the wait is 1 s and the read 3 s | `8c37aee5a6b660ca` |
| Control: the old wait | observed run with the wait at 10 s, card rebuilt | `controls/run-after-move.sh` | exit 1: the 11.6 s read never shows | `741e5c98dd3f02ea` |
| Control: no recovery | observed run, card rebuilt | `controls/run.sh` | exit 1: no words for no answer | `7de4bf7d3edfff92` |
| Control: a stale press refuses | observed run, card rebuilt | `controls/run.sh` | exit 1: no recovery words | `c2fa43b5eb3956a5` |
| Control: no read button | observed run, card rebuilt | `controls/run.sh` | exit 1: no **Read the card again** | `5e0c4c22067c1bc3` |
| Control: no **Open** | observed run, card rebuilt | `controls/run.sh` | exit 1: no **Open** | `f3d72429b9ed7b8c` |
| Control: a short wait | observed run with `scripts/control.mjs`, 100 s | `controls/short-wait-pin-3.log` holds the output | exit 0: the wait test fails by an assertion | `7e058ec1b2b47185` |
| Other card scripts | observed runs at the commit before the wait moved | `declared-views`, `declared-surfaces`, `grow-views` | exit 0 each | `af9a988cad300982` |
| The press's time | observed runs on dap-demo under `agent-a`, each request logged. Each signed a real `read-token` in J2's room | `timing-interim/` holds the logs | the table above | `f242e85bb2749ffd` |

The controls in `controls/run.sh` ran before the wait moved to `waits.ts`, and that move changes no behaviour.

## Open limits

- **The app has not run this.** Nothing shows the app's own limit on a tool call. If the app cuts a call first, the card gets an error and takes the no-answer path.
- **A late answer.** The bridge drops a late answer. The card learns the new state from its next read or press, and it does not read again by itself once the server finishes.
- **The first press's cost.** A process's first press still takes 2.9 to 5.9 s before the act. Fewer requests there would help a person more than a longer wait, and this head does not attempt that.
- **The other 2.8 s.** The cause of the person's time after the act is not determined.
- **The Work list's card.** `apps/views/src/decision.ts` still builds one card's summary from the rule's digest and clause, at the branch that serves the Work list. The person's card was the change card, and this head does not change that branch.
