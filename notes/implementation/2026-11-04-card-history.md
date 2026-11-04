# A late card reply keeps its original request

The card stops waiting after 120 seconds. A successful reply can arrive
later, after the service has retained its result. The old bridge discarded
that request at the timeout, so the card offered no recovery when its
original reply arrived. The unchanged-source regression fails on that
missing completion signal.

Request `1c7dddfb` and promise `bc908c9f` own this change. Source
`ee9781b3398f35ac40e44a8acca85e5de14b3020`, tree
`030639b65693c9db6a43111d95849a31d07b5622`, adds recovery and compares
one hundred short histories with an independent ledger. Four browser
histories check the rendered controls. The parent report's section 5
names the required boundaries: `7f7def61:attachments/testing-strategy.md`.

## Read the original after its late reply

`AppBridge` keeps an expired request only when its caller registers a late
completion callback. The caller still rejects once at `TOOL_WAIT_MS=120000`.
When the matching reply arrives, the bridge removes that original and
signals its callback once. The bridge does not resolve the expired waiter,
repeat its tool call, or inspect a different request's reply. The existing
32-request bound also covers these retained originals. Teardown clears
them and cannot settle an expired waiter again.

`main.ts` registers that callback for `view_act`. The same live view then
shows “A late reply arrived” and **Read the card again**. That button uses
`view_read` to read the retained result. The callback also preserves the
cue when the late reply arrives during the timeout handler's own reread.
A different or closed view ignores the callback. The generated module
contains the rebuilt application. No timeout, RPC method, protocol
revision, automatic retry, or server admission rule changes.

The fix addresses a code property that the earlier Goose wait exposed.
It supplies no new Goose recovery scene. The planner must deploy the
landed source before a host can exercise it.

## Compare independent expectations after each command

`card-history-ledger.ts` imports no production module. It holds literal
expectations for two receiving processes, their mounted and active views,
the visible cut, one gated original, complete or truncated retained reads,
waiter completion, exact-original checks, and admitted read and write
counts. The fixture drives real `AppBridge`, `viewTools`, and
`ViewSessions`; each command compares the resulting snapshot with the
ledger. Expected values never come from the actual display.

The joint fixture uses scripted DOM, parent messages, projection, native
dispatch, and admission ports. Its counters stand in for signatures after
real admission. These plain tests establish lifecycle and accounting at
that boundary. They establish no cryptographic signing, native authority,
provider, device, or real-host outcome.

Ten literal histories cover late complete results, explicit retries after
truncation, process changes, stale cuts, supersession before and after
admission, unknown native originals, exact-original checks, and teardown.
Eighty-nine seeded legal histories vary those event orders without
consulting production state. The 99 joint histories are distinct and
contain 1,268 commands, with 7–20 commands per history. A separate named
bridge regression makes one hundred new plain histories:
`a late reply after the card timeout settles the original without repeating its call`.

Relay, admission, and result gates choose event order. Fake timers expire
the actual caller wait. No new history waits for elapsed application time.
Generated histories finish with teardown and at most one explicit closed-card
probe. They do not repeat terminal checkpoints.
`history-ledger.json` retains the counts and their regeneration command.

Three manual controls distinguish plausible faults:

| Fault | Named witness | Required distinction |
| --- | --- | --- |
| Discard an expired original | Standalone late-reply regression | One late completion becomes zero. |
| Reuse a truncated read as complete | `001 truncated read needs an explicit new read before complete replay` | The explicit retry must admit a second read. |
| Admit a superseded view | `003 superseded pre-admission read spends no signature` | A superseded press must spend zero signatures before admission. |

Each control passes its unchanged witness, introduces one source fault,
then fails by assertion. Each restores the exact source bytes. No mutation
sweep ran. The first control attempt remains inconclusive: the helper's
timeout regex matched “timed out” in an assertion description. The final
attempt changes only that description and retains the raw child reports.
Its control helper changes only cleanup so those reports survive.

## Check four rendered histories at the source head

The [Card workflow run 41832859529](https://github.com/generalbusiness-ai/dap/actions/runs/41832859529)
succeeds at the exact source head. Its pinned Playwright 1.63.0 and Chromium
revision 1243 run 104 card cases, four Grow room cases, and two Grow routing
cases. The four new card histories check:

1. A late complete reply exposes a read-only recovery button. Reading the
   original keeps one `view_act` call and one fixture read-token signature.
2. A truncated result needs an explicit retry. The retry signs once more;
   replaying the later complete result signs nothing.
3. A missing receiving view signs nothing. Opening that view never repeats
   the stopped press; the next explicit press signs once.
4. Teardown after timeout acknowledges once. A late reply cannot revive
   the card, change its text, or show a recovery cue.

These histories use the real generated card, service, and fixture token
signing. Their parent and Git answers remain stand-ins. The harness
installs the context clock before navigation and advances the actual
120-second timer. Playwright documents the [context-wide clock and timer
behavior](https://playwright.dev/docs/api/class-clock). Each history also
checks the existing protocol, console, layout, and target constraints.
The workflow uploads no screenshots or report artifacts; the retained
console summaries and successful exact-head steps support this citation.

## Validation and retained failures

The final preflight builds the generated module, checks both browser
scripts, compiles all four MCP contexts, and passes all 129 affected view
and bridge cases. Its owner body takes 1.34 seconds elapsed, with 2.01 user
and 0.31 system CPU seconds. These measurements describe one focused run
on the shared Mac with copied, owned dependencies. They are not the full
gate or a comparison with another machine.

The record retains two compiler-placement failures. The first places the
DOM bridge witness in the Node test context. Moving that witness to the
browser context fixes the missing globals. The first joint fixture then
pulls the Node service graph into that browser context. Keeping the joint
fixture under the Node tests, with narrow test-only DOM globals, separates
the compiler contexts. Neither failed attempt ran an owner body.

Every raw run output begins in its durable evidence unit. Some early
source copies were added after their runs and checked against hashes
recorded before the commands. The copy records state that qualification.
The sealed focused manifest retains the original failing witness,
compiler failures, inconclusive control, successful controls, final
preflight, exact-source CI, commands, timings, and input identities. Raw
originals remain owner-only and read-only; public metadata contains no
test custody.

The [focused manifest](evidence/2026-11-04-card-history-validation.manifest.json)
has SHA-256 `886d09da508e63fb9398db8083450d4ec10482c7e7db6fbb16cd2f3f16970a25`. It indexes ten read-only public files and the
retention records for ten private raw units. Each row below cites the
structured output summary in `unit-results.json`, SHA-256 `8bbda7c2d1e9859b810cfcd74ed3fd6e5075c6c6b31b0c3c57776d895a693dbe`.
That file identifies the source hashes, original reports, exits, and
counts for each named unit. Commands run from the task worktree unless
the row names the GitHub runner.

| Check | Command | Exit | Output summary |
| --- | --- | --- | --- |
| Named late reply on C44 | `vitest run --project mcp view-sessions-history` with the retained one-case selection | 1, assertion | `unit-results.json`: `late-before` |
| Initial Node compiler placement | `tsc -p packages/mcp/tsconfig.test.json` | 1 | `unit-results.json`: `late-after` |
| Corrected standalone bridge placement | Test and browser `tsc` contexts, then `vitest run --project mcp view-sessions-history packages/mcp/browser/bridge.test.ts` | 0, eleven cases | `unit-results.json`: `late-after-browser-context` |
| Initial joint fixture placement | Test and browser `tsc` contexts | 1 in browser context | `unit-results.json`: `model-initial` |
| Corrected joint fixture | Both compiler contexts, then `vitest run --project mcp view-sessions-history` | 0, eleven cases | `unit-results.json`: `model-node-context` |
| Expanded histories | Both compiler contexts, then the same history owner selection | 0, one hundred cases | `unit-results.json`: `generated-initial` |
| Preliminary late control | Retained `control.mjs` copy and named standalone witness | 2, inconclusive | `unit-results.json`: `controls` |
| Three final controls | Retained helper with the three exact source faults and named witnesses from `controls.json` | 0 for all distinctions | `unit-results.json`: `controls-final` |
| Generated module and script syntax | `node packages/mcp/scripts/views.mjs` and `node --check` for both scripts | 0 | `unit-results.json`: `render-preflight` |
| Four MCP compiler contexts | `npm run typecheck --workspace @generalbusiness/dap-mcp` | 0 | `unit-results.json`: `render-preflight` |
| Affected owners | Compatibility backport, then `vitest run --project mcp view-sessions packages/mcp/browser/bridge.test.ts` | 0, 129 cases | `unit-results.json`: `render-preflight` |
| Pinned rendered workflow | GitHub runner: three maintained browser scripts in run 41832859529 | 0, 104 card, four room, and two routing cases | `unit-results.json`: `ci` |
| Complete frozen gate | `npm run gate` | 0, actual `gate.exit` read | Gate `result.json`, SHA-256 `c1819afe51f09298503dda95752a09b2d0ee34ed95e2a7798486a2ac9fd2910d` |

The [gate manifest](evidence/2026-11-04-card-history-gate-validation.manifest.json)
has SHA-256 `1f38e8777badffc4cda7af2878fdc45a8ede5884404d43193c79ee9ba840f6b0`. It indexes thirteen read-only public files
and hashes the inventory of 2,276 private originals. The actual gate runs
at the source head and tree above. It takes 1,623.11 seconds elapsed and
passes 135 Node, 56 Counting, 3,911 plain cases with one skip, and 1,078
Native cases with two skips. All four terminal phases are complete, with
zero contradictory records and zero unhandled errors. The record retains
99 suite or unknown observations and the skipped Page recorder's absent
final module duration.

The source and dependency snapshots match, and the owned process group
closes. Every focused input matches the frozen Git source. A recorded
PATH wrapper changes only where bare `mktemp -d` creates the gate's stage
directory, so raw output begins in durable storage. It changes no source,
test, command, deadline, or pass condition. The archive owner passes in
264,522 ms. That observation identifies no historical archive cause.

Only this note and two manifests follow the gate. Source, tests, browser
scripts, workflow, generated bytes, and dependencies remain unchanged.
The review request records the source and candidate trees and the exact
three documentation paths. The documentation checks cover that follow-up;
no whole gate repeats.

## Open limits

- The Goose parent `1a44f042` owns its historical ten-row host record.
  This source change supplies no new Goose late-recovery acceptance.
- O4 member join `c7a090dc` still waits for working browser control. Its
  invitation remains unused. Fixture CI establishes no live ChatGPT or
  Claude behavior, sandbox origin, concurrent host, or revocation result.
- The planner deploys the landed source before a live window. This record
  performs no deployment.
- Archive cause `64552d40` stays open. A passing owner supplies no cause
  or repair for the earlier failure.
- The finite card histories expose the stated lifecycle boundary. Their
  scripted ports and small ledger establish no general native authority
  guarantee. Fixed-slot request `fd0cec33` and explicit-grants request
  `0ca13069` own their separate testing changes.
