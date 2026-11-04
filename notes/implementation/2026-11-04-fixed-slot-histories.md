# Fixed counts match a direct scan through storage lifecycles

Request `fd0cec33e5bc073fc72b21a2b4d5e3cf2af5b70a` asks for one guarantee: fixed-slot counts agree with the items they index through writes, rollback, restart, and rebuild. A readiness marker for an old head cannot establish readiness for the current items.

The source change touches only `packages/scope/test/fixed-index.test.ts`. Twelve histories contain sixteen commands each, for 192 commands and four persistent items per history. Four command orders combine with three sets of text, Boolean, and empty optional values. Each history includes ordinary creates and final transitions, repeated absolute row writes, aborted creates and transitions, object eviction, clear and rebuild, and a legacy append followed by eviction.

## Compare the counts with literal items

The expected state is a small array of item IDs, live or final states, and literal text or Boolean values. `null` represents an empty optional slot. The oracle filters that array by state membership and direct equality. It uses no production index, normalization, fold, or `MemoryState` helper to compute an expected count.

After every completed command, the test compares the stored item projection with the array. It then queries present, absent, and empty text values, true, false, and empty Boolean values, across live, final, and combined states. Both raw and normalized count modes must match the same direct scan. `JSON.stringify` formats only the actual primitive query keys.

The actual side uses SQLite and the real `applyEntry` fold for ordinary writes. Repeated absolute writes call the actual `fixedRowsOf` and `putFixed` twice. Those helpers never supply an expected answer. Aborted transactions roll back the complete append and fold. The semantic checkpoint, stored items, and count answers stay unchanged. Clear and rebuild preserve the semantic checkpoint and restore the same answers.

A legacy append plus eviction is one compound command. It writes matching journal and current-item rows without fixed writes, checks that the marker bytes remain unchanged, and evicts before any index query or rebuild. The next check must rebuild for the new head and count the appended duplicate. No intervening read refreshes the marker.

These are storage fixtures. The recorded entries bypass admission, so the tests establish SQLite, fold, transaction, eviction, and index behavior. They establish no signer authority or application journey.

## Keep the existing witnesses and expose a wrong head

The existing rollforward witness now asserts its fixed count before its duplicate guard and readiness assertions. Its base-writer setup stays intact. The separate 34,000-entry rebuild witness remains byte for byte unchanged, including its 2,000 current items and original deadline. The derive fixed-slot owner remains unchanged.

Both compiler contexts pass. The two complete affected owners pass all twenty cases: three derive cases and seventeen native storage cases, including the twelve new histories. The focused body takes 12.41 seconds on the shared Darwin arm64 Mac with Node 26.13.0 and existing cloned dependencies. The Vite cache began empty after setup moved the copied cache aside; other workroom activity continued, and no controlled-load measurement ran. This timing includes the existing scale witness and does not estimate production cost.

One manual control removes only the current-head equality comparison in `fixedReady`. The unchanged existing rollforward witness and new history 1.1 both pass before the fault. With the comparison removed, both fail by count assertions:

- The existing witness counts zero appended matches instead of one.
- The new history counts one live `same` value instead of the direct scan's two after `legacy-restart`.

The helper restores exact source bytes. Its retained copy changes only scratch-output retention. Both runs select the same two cases and skip the other fifteen native owner cases. No timeout or unloaded file supplies the distinction, and no mutation sweep runs.

## Evidence

Frozen source `410a94667cb4702327a54375c24913dd7fc93145` has tree `ba93294dca04a3dd4cfff1a497b66a57e2b9c9ae`. The sealing check compares the focused input snapshots with those Git bytes and verifies that the scale witness remains unchanged.

The [focused manifest](evidence/2026-11-04-fixed-slot-histories-focused-validation.manifest.json) names ten sealed public files. Its SHA-256 is `b3a85f93f80c1db875a0dee0f0c72b6a327599741b5c0ce5630fa6080f2b0624`. The retention record inventories 1,023 private original files and separately names the three files for an initial setup refusal. That setup guard stopped before creating a worktree because the planning conversation moved its own files. Later metadata preserves the refusal; the original assertion has only tool-transcript custody. A new setup records the changed shared path and succeeds. No package installs occur.

| Check | Command or record | Result and retained file |
|---|---|---|
| Compiler contexts | Existing TypeScript compiler with `packages/scope/tsconfig.test.json` and `packages/derive/tsconfig.test.json` | Both exit zero; exact commands and separate times in `commands.json` |
| Complete affected owners | Existing Vitest with projects `derive` and `scope`, selecting both fixed-slot owners | Twenty passing cases; `case-ledger.json` and private complete reports |
| History budget and input identity | Runtime case metadata plus frozen Git comparison | Twelve histories, sixteen commands each, four persistent items each; `result.json` and `source-audit.json` |
| Head-binding fault | Existing control helper with retained scratch output, filtering the two named witnesses | Two pass before, two count assertions fail after, exact restoration; `control-result.json` |
| Scale witness and custody | SHA-256 comparison and raw-file inventories | Scale body unchanged; `source-audit.json` and `private-retention.json` |

Retain the evidence for at least 30 days and record any later removal in a workroom act.

The complete [gate manifest](evidence/2026-11-04-fixed-slot-histories-gate-validation.manifest.json) names 13 public files and inventories 2,277 private originals. I read the actual `gate.exit` as `exit 0`. The unchanged gate ran once at the frozen source above in 1,831.82 seconds on the same shared Darwin arm64 Mac. Focused checks had warmed the worktree's Vite cache, and other workroom activity continued. This is no controlled-load or production-cost measurement.

All four terminal phases completed: 135 Node, 56 Counting, 3,911 plain with 1 skip, and 1,090 Native with 2 skips. There were no contradictory records or unhandled errors. The record retains 99 suite or unknown observations and the skipped Page recorder's missing final module duration.

Source and dependency snapshots match, every focused input matches frozen Git, and the owned process group closed. Every gate log began in durable storage. The recorded `mktemp` wrapper changes only output placement. The archive owner passed in 307,801 ms with its already-landed instrumentation. Request `64552d40` still has no established historical cause.

The gate manifest SHA-256 is `ceb04393f597869df458dff21b4e9a08e3d1837ff5af52277ec96c2d0def4881`. Together with the focused manifest, all 23 public files match their digests and remain read-only. Retain the gate originals under the same evidence rule.

Only this note and the two manifests follow gate tree `ba93294dca04a3dd4cfff1a497b66a57e2b9c9ae`. Source and tests remain unchanged. The review records the candidate tree and documentation checks. [Test dap](../../docs/testing.md#follow-up-after-a-gate) requires no repeated whole gate for this documentation-only follow-up. These paths require no Card workflow or deployment.
