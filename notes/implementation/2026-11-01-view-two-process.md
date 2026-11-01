# Open a card on the process that its calls reach

Status: source implementation. The gate passed at `1dc134fd`. No desktop AI app has rendered this code, so no run shows that the card now reads in the app. No Worker change is needed for the person's session, because the card runs from local processes. The Worker bundle's bytes change at the next deploy.

Request `4d8733712bc7b444217e8dc59f866d8bfd49c026` and promise `12f75101d0fc9494769afa3c7ca88dec4742146f` own this head. It comes from the J2 acceptance, `2082efd9`, which stays open.

## What happened

At 12:17 EST a person ran the J2 steps on the domain fix. The card's frame opened, so the domain was a real fault. The card then showed "This view is no longer retained. Open it again; this call sent no act." The tool's own response, as the app showed it, read "change: ready; manifest 39, revision 1. 1 item."

The planner read the cause in `4d873371`. The app starts each local server twice, and `ViewSessions` keeps views in one process's memory. So the model's call opened the view in one process, and the card's call reached the other. The app's log fits: the card's `tools/call` answered in 1 ms, and that log file shows no call that opened the view.

The first test here reproduces that message: two `apps/views/src/node.ts` processes on one home, where one opens the view and the other answers the card's call. It failed at main by those exact words. The test shows that the two-process shape produces the message. No log from the app names which process took which call, so the routing itself stays a reading.

## What changed

- **`packages/mcp/browser/main.ts`.** The card keeps the call that opened its view. When a call answers `absent`, the card sends that opening call to the process that answered, then reads again. After a press or a move, the card never repeats it, and it says "The server process changed before this press arrived, so nothing was sent. Check the card, then press again."
- **`packages/mcp/src/views/session.ts`.** The refusal now says "This server process holds no view with this key, so no act was sent. Call the view's opening tool with the same key and arguments to open it here." The words tell the model what to do, and a card does it for itself. If the opening call fails, the card says "Ask for a new card in the chat." and it does not say to open it again.
- **`packages/mcp/src/views/declared.ts`.** Each declared resource carried the first built-in card's bytes, with `data-screen="needs-you"`. Each now carries its own screen and `data-declared`, so a declared card names its own opening tool. Each digest covers its own bytes, so `ViewResources.generation` changes for a declared package.
- **`apps/views/README.md`.** A paragraph on the two processes.
- **Tests.** `apps/views/test/two-process.test.mjs` is new. `packages/mcp/test/support/views-host.ts` takes `processes=two`, where the model's calls reach one service and the card's calls reach another over one custody store, and `views-browser.mjs` has four new cases: 28 in all. `view-resources.test.ts` holds the declared resource.

## The choice

The card already calls an opening tool for a declared screen, and the opening tools are visible to `app`. So the card can reopen with no new route or argument. I weighed three ways:

| | Reopen from the card, chosen | View state on disk under the home | One owner process, the other forwards |
|---|---|---|---|
| Held reads | Each process holds its own. Calls that stay on one process sign once. A press on another process signs another `read-token`, a permanent act with no other effect | Repository text up to 40 KiB per read, 4 reads, 128 views, written to disk | Unchanged |
| Pending acts | A built-in screen with a subject reads custody on each read, so both processes offer **Check original request**. A declared screen keeps this in memory only | One record, with a second store to keep correct against custody | Unchanged |
| A signed act must not go twice | The card never repeats a press. See below | The same, plus locks on the view's state | Unchanged while the owner lives |
| New parts | None | A store, its locks, its bounds and its cleanup | A socket, an election, and what happens when the owner dies |
| A restart under a card | Handled: the same path | Handled | Still needs this path |

A restart under a card needs the reopen path anyway, and the other two ways add a store or a socket to solve a smaller remainder. So I chose the reopen.

## How custody behaves under two processes

I read `packages/mcp/src/custody.ts` and the file store in `packages/mcp/src/node.ts`, and the new tests run it. Custody already serves two processes: records live in one directory under the home, each identity has a lock file, capacity and archival run under a lease, and `packages/mcp/test/custody.test.ts` runs a second process against one store. Both `node.ts` processes open the same directory.

Each press takes a new random idempotency key, so the keys do not stop a second press. Three things do:

1. **The card does not repeat a press.** A press that meets no view signs nothing, because `#instance` refuses before any dispatch. A control that repeats the press fails a named assertion.
2. **A built-in card reads custody.** A press on one process while the other waits for its answer is refused, because `#refuseWhileOpen` finds the open record on disk. After a lost reply, the other process offers only **Check original request** on the same record. Controls that remove the check or give each process its own directory fail named assertions.
3. **The scope judges the signed revisions.** Two processes can both pass the check in the moment before either keeps its record. Then both send, and the scope refuses the second act by its revision. This head does not change that, and the tests here use a stand-in that judges nothing, so they do not show it.

## Evidence

The head is `1dc134fd454585e4a46345f6d1ffae984fe6fe6a`, tree `37253795`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-view-two-process/`, `SHA256SUMS` `8a5312efe0f8943bd5a9e0b3dc8e874a73b22d24d0e09ed2f74471dc97e545cc`.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3537 plain and 1022 native tests, 116 Node and 56 Counting | `7590f085969596ea` |
| Declared card script | observed run at this head, once: the two-process change touches `declared.ts`, and an earlier chained run of this script ended with a Node crash line and no captured reason | `node --import tsx packages/mcp/test/declared-views-browser.mjs` | exit 0, by `declared-script/run.log` | `271093f08585e55f` |
| Red at main | observed run at `89e59c12`: two real processes on one home, over a stand-in on loopback | `node --test apps/views/test/two-process.test.mjs`, the first form of the test, kept as `red/two-process.test-at-main.mjs` | exit 1: `This view is no longer retained. Open it again; this call sent no act.` | `36b114a9e6f00727` |
| Two processes | observed run at this source: real processes on one home, over a stand-in on loopback that judges nothing | same command | exit 0: 3 passed | `21e69a37627b294a` |
| Control: the old words | observed run, the change applied by hand, because `scripts/control.mjs` refuses `apps/views` as no package directory. Source clean afterward | `controls/run-process.sh` | the refusal's test fails by an assertion | `7247c87de254a4b7` |
| Control: no custody check | the same | same | `The second press sent no act` fails | `3ff93749ec06acb4` |
| Control: one custody directory per process | the same | same | 3 tests fail by assertions | `a369ea7dbdd0ce3c` |
| Card in Chromium | observed run: the card's bytes in a sandboxed frame. Two services in one host process stand in for two processes, and a loopback host stands in for the app | `node --import tsx packages/mcp/test/views-browser.mjs` | exit 0: 28 of 28 cases, no errors | `4a0efde4bb227e20` |
| Workflow | observed GitHub Actions run 41332615607 at `1dc134fd` | `git push origin builder/view-two-process-20261101` | success in every step: 28 of 28 cases on Linux | `28dfba133b95523b` |
| Control: no reopen | observed run, with the card rebuilt. Source clean afterward | `controls/run.sh` | exit 1: `The card opens its view on the process that its calls reach` | `2ddf64e5098ce09a` |
| Control: the press repeats | the same | same | exit 1: `The press that met no view signed nothing, and the card did not repeat it` | `6ab3226e8aafcca0` |
| Control: a declared card keeps the first screen | the same | same | exit 1: `A declared card names its own opening tool` | `4aeb37ea8339d05c` |
| Real path on the deployed Worker | observed run at 12:39 EST at `1dc134fd`: two real `node.ts` processes on `dap-demo`, in the J2 room, under `agent-a`. A script stands in for the app and calls in the app's shape. One **View diff** press signed one permanent `read-token` act | `witness/two-processes.mjs` | exit 0. The other process answers `absent` in 1 ms, opens the same identity in 1151 ms, and reads change 2. The press answers in 7272 ms, 10,855 bytes, and names version 3's two commits. The model's process keeps its own view | `21da55fdaaee6247` |
| The app's log | read from the app's log: times, methods and IDs only | `app-log/dap-views-12-17.txt` | the 12:17 session, with the 1 ms answer | `6649b55736249db4` |

The gate ran at `1dc134fd`. This head merged main at `674bed78` before that gate.

## Open limits

- **Whether the card now reads in the app.** The next person's session decides. The planner owns asking for it.
- **Other routing.** If a host sent each card call to a different process, a card would get refusals and no second act, and it could fail to settle: `reopen` makes one attempt per call. The logs show one connection for the card's calls. The builder owns a change if a session shows otherwise.
- **Which card is current.** Each process keeps its own `#current`. If processes restart and an older card in the chat reads after a newer one, the older card becomes current on that process, and the newer card's press says that a newer card replaced it. It signs nothing, and a new card clears it. The builder owns this if a person meets it.
- **A model's input act on the other process.** A declared `view_input_*` call from the model reaches the model's process, while the card has moved on the other. If the selected item differs, the call answers "The selected item or revision changed." and signs nothing. No session has run this on the desktop app. The grow room's chat inputs meet it, and the builder owns the fix after J2.
- **A declared screen after a lost reply.** Its **Check original request** lives in one process's memory, so another process does not offer it. The custody record stays, and the model's `settle` tool reads it.
- **`Unrecognized Content-Security-Policy directive 'webrtc'`.** The app's console showed these three lines on the 12:17 session. No file in `packages/mcp` or `apps/views` holds that word, and the card loaded, so this head leaves them.
- **The press took 7.3 s in the witness.** Earlier runs took 1.4 to 3.9 s. One sample, on a machine running a gate.
