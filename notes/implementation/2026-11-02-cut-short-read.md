# A cut-short exact read can run again from its card

## What changed

Request `e4d0cfed4d9c5de0f2ed579c6f02e531df9e1336` and promise
`c43e2ff3f88921fde1b3f00295f60c39512aa394` own this head. Product and test
source freezes at `ebc1e608e2e29432f2120cd4c63989d755d894d5`, tree
`365e708ae18cc8b5748eaa4ac6fc06a607909853`, directly above landed main
`08a16dc652186e3d80c06abab98e2b4d9bc12690`.
The review record adds only this note and its manifest after that frozen source. Product, tests, configuration, and every Card workflow input remain unchanged. The documentation follow-up rule applies. Documentation checkpoint
`cb736c88`, tree `8fde3805`, verifies the initial record. The final record adds
its audit row and manifest unit.

After an exact read stops with a truncated answer, the card keeps the answer
and offers the same read again. An ordinary press makes a new bounded read
without reopening the view. A complete answer still replays from the view
without another credential or read-token signature.

The original cutoff text, commit names, omitted-data words, and reached file
actions remain visible. Reading or refreshing the existing view keeps that
displayed answer. It does not silently retry a signed read. Only another press
requests the read again.

If a complete retained answer no longer fits the current card, the press
returns an error instead of claiming that it showed the answer. The receipt
says: **Diff not shown: the card cannot hold the retained answer. No new request
was signed.** The same rule names Interdiff or File for those reads. The page
and cut stay where they were. The retained answer remains available if a later
card projection fits it, and a successful replay clears that specific refusal.

## The decisions and why

[The view session](../../packages/mcp/src/views/session.ts) retains up to four
distinct displayed exact reads. It still keys each one by the full card
identity and the exact read. A new answer replaces an earlier answer for that
same key instead of using another place in the bounded list.

Only a complete retained answer satisfies another exact-read press. A
truncated answer may name exact commits but still omit work that another read
could reach. The session therefore keeps it for display and file actions while
allowing another call through the existing read port. This applies to any
truncated answer; it does not parse a provider's omission words to guess why
the read stopped. A byte-limited read can reach the same limit again. Another
press offers another attempt, not a promise of completion.

The [browser control](../../packages/mcp/browser/main.ts) enables the current
reader when its displayed answer is truncated. A lone **View diff** also keeps
its reader control on that page, so the person can retry without going back.
The current-reader marker remains. A complete current reader keeps its
existing disabled state. Reader labels, cutoff rendering, styles, and line
layout retain their existing behavior. The generated module includes the
changed control.

Every new read still crosses the existing active-view, cut, busy, offered-read,
and unresolved-original checks. The service then performs its existing fresh
authority, target, captured-view, signing, custody, and credential checks. This
change neither mints a credential itself nor changes the read producer's
limits. Complete replay continues to use already retained text.

The retained-answer branch now checks whether the bounded card projection can
show it. A refused fit reports an error and spends no credential. It does not
return `held: true`. If the same answer fits later, replay succeeds and removes
only this branch's earlier refusal receipt. Other receipts retain their
existing behavior. The existing new-answer refusal still says that the
one-time credential is spent, because that read has already run.

The existing session owner gains two cases at the boundary that owns these
decisions. One scripts a stopped interdiff with no reached paths, then a
complete answer. It checks the preserved cutoff words, two calls for the two
presses, and complete replay with no third call. The other grows the same
card's summary after a complete read so the retained answer no longer fits.
It checks the error, unchanged page and cut, no new call, and recovery when
the summary shrinks. These sources and read ports are stand-ins. They prove
session retention and dispatch rather than a provider timeout.

The existing browser owner also scripts a stopped Git answer followed by a
complete one. The production DOM, bridge, service, view session, signature, and
custody paths run over the TEST scope fixture. At 592 and 320 pixels, the first
press signs one read-token act and shows the cutoff. The next ordinary press
signs a second and shows the complete answer. Going back and choosing the same
read again replays it with two total signatures. No new view opens for retry.

## The final evidence

The [evidence manifest](evidence/2026-11-02-cut-short-read.manifest.json) records
139 files in 6 readonly units. Its SHA-256 is
`e251530ed372bb15fe159676608abd5bf5feb0f012420323bd9a29c3b16afb8a`. Keep every unit for at least 30 days after landing. Whole
Native and CI consoles stay private; public metadata names their hashes and
byte counts.

Local implementation checks ran on an uncommitted draft above `c392901f`.
Initial compiler and session checks preceded the browser-fixture additions
and final receipt-clearing assertion. Their unit says so. The control runner
then ran the whole 19-case session owner after all source changes, and repeated
the normal browser driver at both widths. The later fast-forward to main
`08a16dc6` changed neither the base tree nor any draft source byte. Frozen
source metadata records all seven changed file hashes. Exact-source CI and the
full gate below own final composition.

The Browser plugin was unavailable. Local checks used the cached pinned
Playwright 1.63.0 and Chromium revision 1243 on the shared Mac. The targeted
driver copies the checked-in owner scenario and its unchanged helpers. Its
screenshots show the retry button, wrapped commit IDs, original cutoff, and
omitted-path words at both widths. Both captures received visual inspection.
The Git answers are scripted; no provider or hosted room participates.

Three controls distinguish the old behavior. Restoring reuse of truncated
answers fails the assertion that the next interdiff press calls its read port
again. Ignoring a retained fit failure fails the asserted error result.
Disabling the current truncated reader fails the browser's enabled-state
assertion before a click or timeout. The two session controls each return outer
exit 0 after the expected assertion failure. The browser mutant exits 1 at
592 pixels; its later 320-pixel case is unreached. The normal driver passes
both widths. Exact source and generated-module hashes match after restoration.
No assertion or original deadline changes for a control.

[Card workflow 41433119112](https://github.com/generalbusiness-ai/dap/actions/runs/41433119112)
succeeds at exact frozen source `ebc1e608`. The generated-module check and all
three browser steps pass. This includes the complete owner that contains the
new ordinary-press scenario, alongside the refresh, actor, owned-scope, and
Grow routing checks already in the workflow.

The actual full `gate.exit` is 0, and the terminal source guards match clean head `ebc1e608` and tree `365e708a`. All gate stages pass. The terminal output reports 132 Node passes, 56 Counting passes, 3,567 plain passes with one skip, and 1,029 Native passes with two skips. These counts come from terminal output rather than the optional progress stream. Whole raw test output remains private. Only this documentation record follows the successful source gate.

| Check and checkpoint | Command | Exit | Output SHA-256 |
|---|---|---|---|
| Generated card module; initial draft | node packages/mcp/scripts/views.mjs | 0 | 4c1a2bf8e5b091d5863efe0cc2cf5d90d6a143c4b74b92e4180559d59bca58f9 |
| MCP compiler contexts; initial draft | npm run typecheck --workspace @generalbusiness/dap-mcp | 0 | c1e1f1c2bbd0cff21cb159852caefece8652f03525b695b9f47a14976469405b |
| Whole session owner; initial draft | node node_modules/vitest/vitest.mjs run --project mcp packages/mcp/test/view-sessions.test.ts | 0; 19 cases pass | 3261081d0640ade5fd588895776eabb0adf4586e698652cc17b231691ee9809c |
| Changed browser fixture compiler | node node_modules/typescript/bin/tsc -p packages/mcp/tsconfig.test.json | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| Browser owner syntax | node --check packages/mcp/test/views-browser.mjs | 0 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| Initial ordinary retry and replay; both widths | node --import tsx /private/tmp/artroom-cut-short-read-target.mjs | 0; two total signatures | d4e55900ad4eecc339d1edd8afe1d4f38717b0db953f12cfb1ccfdf60477f44c |
| Reusing a stopped answer distinguishes | node scripts/control.mjs packages/mcp/src/views/session.ts 'const held = instance.reads.find(item => item.of === of && !item.shown.truncated);' 'const held = instance.reads.find(item => item.of === of);' --expect 'a stopped interdiff runs again on the next press and its complete answer then replays' -- . --project mcp packages/mcp/test/view-sessions.test.ts | outer 0; expected assertion fails | e2b4c4a6bf769173f0746e8138f6a53acd4d666bfb522b6d27789e91f04d4db6 |
| Ignoring retained fit distinguishes | node scripts/control.mjs packages/mcp/src/views/session.ts 'if (!this.#showRead(instance, card, held)) {' 'if ((this.#showRead(instance, card, held), false)) {' --expect 'a retained answer that no longer fits reports no new signature and can replay when it fits again' -- . --project mcp packages/mcp/test/view-sessions.test.ts | outer 0; expected assertion fails | 5d31cf731d95cfb73ca5bd8de0a4522e7b9bcd1928c73f1c54ad1adeaaeb73bf |
| Normal ordinary retry after all source changes | node --import tsx /private/tmp/artroom-cut-short-read-target.mjs | 0; both widths | d4e55900ad4eecc339d1edd8afe1d4f38717b0db953f12cfb1ccfdf60477f44c |
| Disabled current retry button distinguishes | node --import tsx /private/tmp/artroom-cut-short-read-target.mjs | child 1 at expected assertion; restored bytes | 357cb9a91363209deb3cee4024a80b4ea0b46349586699f45b260305a9a73803 |
| Exact-source Card workflow at ebc1e608 | gh run view 41433119112 --repo generalbusiness-ai/dap --json headSha,conclusion,status,jobs,url,createdAt,startedAt,updatedAt | 0; workflow success | 745a0df913540cb30826baf43e64db625b65eb3c78b90dd1b5adf085d7079f0b |
| Frozen full gate at ebc1e608; tree 365e708a | /usr/bin/time -p npm run gate | 0; matching source guards | 3063a6672649f6cb20a56bfccb45f09cb64c13d7c2338ddc41bf22742c1c0a84 |
| Documentation checkpoint cb736c88; tree 8fde3805 | whitespace, commit-message, note, link, source and manifest checks in driver.py | 0; 122 initial files; twelve citations; three local links | a3f128ccfff105287af11e30ee25b624849b775648ea641117dd00e0b07e961a |

## The open limits

- Request `e4d0cfed` permits another ordinary attempt after a truncated answer.
  It does not guarantee that the next bounded read finishes. It changes no
  producer limits or omitted-data words.
- Request `353a0ec0` owns the readable diff design. Hugh still chooses a render
  before any new product renderer. This repair changes only the existing
  reader control and session behavior.
- Request `1a44f042` owns the remaining person-operated Goose Desktop checks.
  These scripted browser observations establish no Desktop or hosted outcome.
- Request `3c6ec378` follows this repair in the queue. It owns the mini's Git
  binding and any required GitHub action. The planner owns deployments; none
  forms part of this repair.
