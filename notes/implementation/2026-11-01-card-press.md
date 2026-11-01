# A card's press outlasts a read, and the card recovers when no answer comes

Status: source implementation. The gate passed at `a1f81b61`. A script drove Chromium with a loopback host in place of the app, and no desktop AI app has run this code. No Worker change is needed for that app, because the card runs from the local stdio process. The Worker bundle's bytes change at the next deployment.

Request `71d50311974ce1ce888c786e1d50bc488f2ab0ba` and promise `3c7517361fc78a13f67e3f4d0e2c7b5c38a19746` own this head. The request comes from a person's session on J2's change, at 13:43 EST on 1 November.

## What happened

The person pressed **View diff**. `tools/call` took 11.58 s, and `packages/mcp/browser/bridge.ts` gave every host request 10 s. So the card said "tools/call: the host did not reply. No action was retried." The press had signed a `read-token` at destination entry 60, so those words hid a permanent act. The late answer then moved the view's cut in the server, the card kept the old cut, and each later press refused as stale. The server's words said "Read it again", and the card offered no way to read.

## Why that press took 11.58 s

The first 5.8 s is reproduced. About 2.8 s of the second 5.8 s is not explained.

The `agent-a` rows come from observed runs at `237d61a6`, in new processes, with each HTTP request logged. The owner's rows are a reconstruction from the app's log and the destination's entry times, and they log no request. Each run signed a real `read-token` on J2's destination. The columns after the first two are sums of steps.

| Case | Total | Before the act | After the act | Requests before the act (their sum) | Mint polls | Git read |
|---|---|---|---|---|---|---|
| A: first press, opening read only | 6.28 s | 3.55 s | 2.73 s | 12 (3.46 s) | 1.48 s | 0.92 s |
| B: first press, 27 s after the item read, as in the person's order | 8.88 s | 5.97 s | 2.91 s | 12 (5.85 s) | 1.68 s | 0.72 s |
| C: first press | 4.59 s | 2.95 s | 1.64 s | 12 (2.85 s) | 0.41 s | 0.93 s |
| C: second press in one process, an interdiff | 2.47 s | 0.85 s | 1.62 s | 6 (0.78 s) | 0.49 s | 0.81 s |
| D: first press after a 64-minute gap on the destination | 8.36 s | 5.17 s | 3.19 s | 12 (5.03 s) | 1.83 s | 0.73 s |
| Owner, the person's press, call 9 | 11.58 s | 5.78 s | 5.80 s | not logged | | |
| Owner, calls 17 and 18 | 7.11 s and 6.30 s | 4.09 s and 3.30 s | 3.02 s and 3.00 s | not logged | | |

**Before the act.** A process's first press sends 12 requests in series, and a later press sends 6. The first press adds a session POST, four scope reads and the 52 KB retained definition. In the logged runs those requests account for all but about 100 ms of the time, and local CPU is 0.06 to 0.18 s a press. So the first press covers the person's 5.8 s, and the planner's candidate of a first session under this home does not need to be true to reach it.

**After the act.** The person's mint took 806 ms by the destination's entries. Case D ran after the same gap as the person's press and took 3.19 s, so one run rules out the gap. The owner's own later presses took 3.0 s, so the owner's home does not explain it either. These leave about 2.8 s of the person's press unaccounted for, and nothing here says which requests took it. Machine or network load at 13:43 is not known.

This head does not make the press faster. It makes the card wait long enough. The slowest press in this table is 11.58 s.

## What changed

- **`packages/mcp/src/views/waits.ts`, new.** `TOOL_WAIT_MS` is 120 s, and the bridge uses it for `tools/call`. A message the app answers itself keeps 10 s.
- **The bound I chose.** The slowest press with one stalled request at each stage takes 113 s: the session 30 s, the act 30 s, the read of the mint 30 s, eight one-second pauses and the Git read 15 s. So the wait is 120 s. A press with several stalled requests at one stage can pass it, and the sum of every request at its limit is several minutes. I did not choose that sum, because the card would look stuck for that long, and the recovery below covers it. A test holds the wait above the 113 s from the constants.
- **`packages/mcp/browser/main.ts`, no answer.** After no answer to a press, the card reads its view again. It says: "The app gave no answer to this press, so the card does not know how it ended. The request may have gone, and a permanent read may have been signed. The card read its view again. Check it before you press again." An act's press says "an act" in place of "a permanent read".
- **The same file, a stale refusal.** On a press or a move, the card reads its view again and says: "The card had changed, so this press sent nothing. It shows the current state now. Check it, then press again."
- **The same file, a read that fails.** When a call gets no answer or finds the server busy, the card offers **Read the card again**. A person is never left with words that name a read and no button.
- **The summary.** The title is underlined, and the summary has an **Open** button. `apps/views/src/change.ts` and `decision.ts` replace the raw digest and `acts.review-verdict / acts.merge` with words that depend on the page and on the acts on offer. A summary says, for example, "Open this card to read the change or merge it. The room's rules decide each act." A change with no act on offer says "Open this card to read the change." An item page says only "The room's rules decide each act.", and nothing when it offers no act. The lane's definition moved to the body's `Rules:` block. `apps/views/test/j4-reads.golden.json` changes in five fields only: the reason on three screens and the body on two.
- **`packages/mcp/src/views/session.ts`, a read that a newer card replaces.** Once the read has returned, a superseded card says "The read was signed, and this card does not show its answer." A read that returned no text says "may have been signed". These replace "no new act was sent", which was false by then. The window is narrow, and I found it by reading: no run has hit it.

`packages/mcp/src/service.ts` exports `VIEW_DIFF_POLLS` for the test, so its seal moved. The test reads `DIFF_READ_MS` from the Git package's source, because `scripts/active-source.test.mjs` keeps that package out of this package's tests.

## The person's steps

The planner first asked me to move the person's steps to this head. J2's acceptance met its done-when on the person's reports at 14:04 and 14:08 EST, so I did not move them, and the planner's `7429dad3` agrees. That act asks for one short session after this head lands, which covers a first press in the app, **Request changes** and the Needs you card.

## Evidence

The head is `a1f81b618400c2e08a04f4657573d87c68742fb2`, tree `02f9b1da`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-card-press-head-2/`, `SHA256SUMS` `09c166a0b5abda93b68a8b61ed1b6c6413c9945991e7a1dd6faba40909f130cf`. The card workflow's run 41345198903 succeeded at `a1f81b61`, the source commit. After the gate the head adds this note and its manifest. The first round's evidence stays in `first-round/`, and the checker's `aeaf2ab2` asked for the second round.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3543 plain and 1024 native tests, 117 Node and 56 Counting | `81ece543ddab276a` |
| First gate | observed run, failed | `npm run gate` | exit 1 at typecheck: a test imported the bridge, which needs the DOM. The wait moved to `waits.ts` | `71c33a6dcefd3421` |
| Second gate | observed run, failed | `npm run gate` | exit 1 at `active-source`: a test imported the Git package. The test now reads the constant from source | `47303ce9dc9d7c6b` |
| The first round's gate | observed run at `ee6e7d1f`, before the checker's changes | `npm run gate` | exit 0 | `9ddf02a949207a1f` |
| The card's script | observed run in Chromium on one Mac, a loopback host in place of the app, the real service over a fixture scope, and a fixture Git read | `node --import tsx packages/mcp/test/views-browser.mjs` | exit 0: 30 of 30 cases. `signed-read-11600` has a real clock. `read-outlasts-wait` has a SCRIPTED clock: the wait is 1 s and the read 3 s | `8c37aee5a6b660ca` |
| Control: the old wait | observed run with the wait at 10 s, card rebuilt | `controls/run-after-move.sh` | exit 1: the 11.6 s read never shows | `741e5c98dd3f02ea` |
| Control: no recovery | observed run, card rebuilt | `controls/run.sh` | exit 1: no words for no answer | `7de4bf7d3edfff92` |
| Control: a stale press refuses | observed run, card rebuilt | `controls/run.sh` | exit 1: no recovery words | `c2fa43b5eb3956a5` |
| Control: no read button | observed run, card rebuilt | `controls/run.sh` | exit 1: no **Read the card again** | `5e0c4c22067c1bc3` |
| Control: no **Open** | observed run, card rebuilt | `controls/run.sh` | exit 1: no **Open** | `f3d72429b9ed7b8c` |
| Control: a short wait | observed run with `scripts/control.mjs`, 100 s | `controls/short-wait-pin-3.log` holds the output | exit 0: the wait test fails by an assertion | `7e058ec1b2b47185` |
| Control: no signed words | observed run with `scripts/control.mjs` | `controls/no-signed-words.log` holds the output | exit 0: "says that it signed" fails by an assertion | `e7aa208fd0949c86` |
| Control: the words ignore the page | observed run with a logged edit | `controls/run.sh` | exit 1: an item page says "Open this card" | `d3a2b0fe0df0af77` |
| Control: the words ignore the acts | observed run with a logged edit | `controls/run.sh` | exit 1: a change offers review it does not offer | `890482a17f80b947` |
| Other card scripts | observed runs at the commit before the wait moved | `declared-views`, `declared-surfaces`, `grow-views` | exit 0 each | `af9a988cad300982` |
| The press's time | observed runs on dap-demo under `agent-a`, each request logged. Five presses signed real `read-token` acts in J2's room. The agent's script failed once at 15:01 and signed nothing | `timing/` holds the logs, with its own `SHA256SUMS` | the table above | `e0ed83143a0a6116` |

The controls in `controls/run.sh` ran before the wait moved to `waits.ts`, and that move changes no behaviour.

## Open limits

- **The app has not run this.** Nothing shows the app's own limit on a tool call. If the app cuts a call first, the card gets an error and takes the no-answer path.
- **A late answer.** The bridge drops a late answer. The card learns the new state from its next read or press, and it does not read again by itself once the server finishes.
- **The first press's cost.** A process's first press still takes 3 to 6 s before the act. The planner's `7429dad3` put that in the builder's own item, `368ddc87`.
- **The other 2.8 s.** The cause of the person's time after the act is not determined. No run repeated it.
- **The Work list's card.** `apps/views/src/decision.ts` still builds one card's summary from the rule's digest and clause, and `reasonLines` prints the pair on the needs-you screen. The person's card was the change card, and this head does not change either. The builder owns a request for the words, filed from the checker's `aeaf2ab2`.
