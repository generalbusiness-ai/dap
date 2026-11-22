# E2: explore a declared scope in MCP

E2’s full gate stopped in Plain when the client export inventory omitted the new public `explore` entry. The follow-up corrected that inventory and checked the whole test file, the affected compiler context, and the previously unreached Native stage.

E2 adds the read-only MCP tool `explore`. It judges one declared act at a checked scope cut and returns a prediction. The tool does not sign or submit an act, retain an authorization, or write a scope. A later act still goes through the scope's ordinary authority and admission checks. E2 adds no HTTP route, `ScopeApi` method, derive export, Membership replica, or recorded grant.

## Client boundary

`@generalbusiness/dap-client/scope` adds one value export:

```ts
explore<D, K>(replica: Replica<D>, key: string, act: PartialAct<D, K>,
  authority: { session: Session; requestedAt: Timestamp },
  clock: () => Timestamp): Promise<Exploration<D, K>>
```

The host supplies the exact session that authenticates the replica's reader and the local start time of the request that obtained that session. `Reads.sessionRequestedAt` returns the start only while the same session remains in the shared cache. A cache hit does not reset its age. `SessionStanding` supplies the value that the Membership answered at its recorded head. The client uses `judgeExploreGrant` and the existing E1 body judge. It does not turn the value into a grant that Scope can record. The result names the standing and its source, the judgment clock, and `authorityAge` in milliseconds at that clock. That age is a conservative local elapsed-time bound, not a proof that Membership remained unchanged or a measurement of remote clock skew. Session tokens do not enter the result.

C4 keeps its earlier private exploration call, movement result, and absent-grant behavior. E2's admitted result adds a bounded list of changed public or symbolic item names. The result does not expose a private projection alias. A missing reader, session, standing, source, needed fact, or usable clock produces an unavailable result rather than an invented judgment.

## MCP boundary

MCP resolves the target and its act descriptor from its current authenticated inventory. It verifies the full scope reference and pinned definition, folds a bounded authenticated journal into the C2 replica, and compares the first Summary, the judgment cut, and a final Summary. A moved cut or changed session yields unavailable. The returned context keeps the clock and standing used in the judgment. Its authority age ends at that clock. After the final Summary, the host checks that its clock has not moved backward, the same session remains held, and the session has not expired.

The exploration owner admits one active operation. Its 10-second response deadline does not release the physical owner while a fetch or body read remains unsettled. A rejected late cancellation keeps the slot closed for that service instance. Before folding a page, the owner counts its entry bytes. The limit is 4 MiB and 16 pages per exploration. These are logical input bounds, not a V8 heap measurement or a promise about provider buffers. A missing or oversized changed row returns unavailable. A complete MCP result, including its envelope, fits the existing 64 KiB limit. The restricted application read bridge keeps its existing allowlist and does not expose the generic tool.

## Evidence and limits

The original integration commit was `59bc85476710051f9aeb836db842af3b13c63f4b`, tree `4c98fa374f4e6db89481685f02721222177b08e4`. The earlier client commit `427112445d20ff46833a1ada21065bd47c90399c` has tree `c573c8ec8eca17f97a75df7e63dd2b9eee2b26d3`, identical to the tested client checkpoint `a55e0154d47b541bfc6f4e3fc3375fa93223ffae`.

| Check | Retained result and SHA-256 |
| --- | --- |
| Client E1, C4 and E2 focus | 16 passed. `~/play/artroom-evidence/2026-11-21-e2-client-focused/client-tests.log`, `81f78c06c1c4c8504d5ce7993cd636ae7355795c94b373c6cf8d79711d992f9c`. The later E2-only focus passed two cases: `client-final-tests.log`, `53bb10730985f3d4905c3ee37b7e0287a344f4cf9e69cf285f4d45a7970acb94`. |
| Client typecheck | Passed at the earlier client tree. `client-final-types.log`, `93d077e30835a17c82425abeab78e368f3aaae2d1ee44b05b5fa8291b6391430`. |
| Client authority control | Removing the checked grant made the native-judged release admission fail, while the cache test passed. The source was restored. `control.log`, `92111b65fb4fd86490514cb52278ae1ee9e13d966cccc707884afcccde54ac5d`. |
| MCP focus before cancellation repair | 12 passed in four files. `~/play/artroom-evidence/2026-11-21-e2-mcp-focused/unit.log`, `e2d3c4482baa5af4f9bd769e286fc28e9d8e870ee12ce206bdebea5181b5919a`. |
| Native Lending before cancellation repair | One passed and two skipped in 7.84 seconds. The test explored a real authenticated release without an act write and refused a deliberately moved head. `native-sanitized.log`, `e2061b9f766330c73f6d44a748fd1d835f675ceb8a6faddcb92bac765f15e470`. The native pass predates the later failure-only cancellation repair. |
| Owner control after cancellation repair | Two passed. `cancellation-control.txt`, `65c1fcdbcf97b9fbe24673c101a4a828cdf094273c20beaf51a8298bdf0f41d0`. The retained record also reports both MCP test and scope compiler contexts passed after that repair; it does not include raw compiler output. |
| Security inventory | 13 passed after the reviewed owner seals and documentation changes. `~/play/artroom-evidence/2026-11-21-e2-mcp-focused/security-inventory.log`, `40086c12b27b7cf610ef5456c19d85736c0f31cdba78c9fea4af3a0690f665df`. |
| Documentation links | 1,264 checked, none broken. `doc-links.log`, `07b2b6936bf4d3e1afd968aa3d654d6cbbf431787a9b3cf6bb1b8dd9c3690295`. |

The client witness used a real native-judged Lending birth and session over a local transport. It compared an explored release's effects with an accepted release, changed the standing, checked a different session and backward clock, and held an exploration across a replica refresh. The refresh witness detects a changed replica generation; the MCP witness separately moves the head. `commands-and-controls.txt`, SHA-256 `a76a6494a3a89ffa01020974035881287e65e93835a71f44638cbfbb46a891aa`, records the MCP commands and earlier fixture repairs. Earlier failed raw runtime logs were overwritten during iteration and cannot be recovered; the retained account does not replace those logs.

## Security review and recovery

Review the `McpService` named owner and its module seal, the `hosted-tools.ts` whole-file seal, and the new `explore-result.ts` helper in `scripts/security-entry-points.test.mjs`. Record the helper's owner and update the hosted MCP security inventory after reviewing the final source. Do not refresh seals against an unfinished draft. Run the exact entry-point inventory and the ordinary gate on the clean reviewed candidate. If either fails, preserve its original output, correct the owning source or documentation, and run only the required checks on the new exact candidate. A metadata or seal update alone is not a test result.

## Rehearsal on the Security group

The E2 commits were carried onto Security group `501edfb8addc0fdb233a7c3edfef300ee728dd0f`. The focused rehearsal checked clean source `f68ee82c4700be36871674edbc5803fd257e47c8`, tree `34422b8d83331035f6e292c674bea92d389b7def`. The E2 implementation and tests match the earlier branch. The Security-group source and its existing owner seals remain in the rehearsal.

The native Lending release and moved-final-head witness passed on that source: one passed, two skipped, with 11.29 seconds reported by Vitest and 12.349 seconds elapsed for the command. The sanitized summary is `~/play/artroom-evidence/2026-11-21-e2-on-security-focused/native-summary.log`, SHA-256 `1348b83a381b2888e6630a72fa2c2e4b1ce88426c149389f0df87a975b6e13cd`. The owner cancellation tests passed two of two; `owner.log` has SHA-256 `06d79352d0ed577207391b23c2541d9e7df037402f7b2d0a26f2403f48a8c476`. Client, MCP test, and MCP scope typechecks passed. The two MCP compiler logs are empty; each has SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. The client compiler log has SHA-256 `93d077e30835a17c82425abeab78e368f3aaae2d1ee44b05b5fa8291b6391430`. The security inventory passed 13 of 13; `security.log` has SHA-256 `530450d1597e8010ff25adaf0479fc240a435c404f48e2a720cafbc358ac6a10`. Companion command files in the same directory record the commands, exits, and monotonic durations. No full gate ran in this rehearsal.

## Page asset reproduction

At rehearsal head `a14e7471bacbba9100cb835bea26c72f6eb74a1d`, the first `timeout 60 npm run pins` passed formal sources, compatibility, security, and release reproduction, then failed the Page asset comparison. Its retained output, `~/play/artroom-evidence/2026-11-21-e2-on-security-focused/pins-preflight.log`, has SHA-256 `afdd0d637007b3bdb167057d8d917525a0eb6fc54d86c072bb7d4549112b76c5`. The repository generator `node apps/room/page/scripts/assets.mjs` refreshed `apps/room/page/assets.ts`. The targeted Page reproduction then passed; `page-regeneration.log` has SHA-256 `a9f6c618f9159535430368ee73cdc40d3270a40305fbfdca7f27db1dc97c94c6`.

The generated Page JavaScript changed from SHA-256 `5e73d7c0b7cb9839bfa6d4bc0ccc2cec89008476dad3f975e8e6eb17ba6833df` to `e76cd829347c5864494a3f3d094c22d1d7a0575ca8286dcda925a9f9ca705a11`, with 1,334,728 UTF-8 bytes in each. The first visible difference is minified identifier allocation. Both HTML files, their inline CSS, and the OAuth JavaScript kept their hashes. `page-before.json` and `page-after.json` in the same evidence directory record each component. The Page imports the client package whose source E2 changed; this identifies the shared build dependency, but the reproduced output does not by itself prove a semantic change in the browser.

A second pins invocation passed Page, release, card, and examples, then failed the MCP documentation inventory because the `explore` reference did not match the tool's exact description. `pins-corrected.log`, SHA-256 `14f3ec860fb58e401eba5065ed243da892ca5880c9549974e148bcb52bbea8af`, retains that result.

The MCP reference now uses the tool's exact description and schema. The generated `docs/mcp-tools.json` adds one `explore` tool and leaves every previous entry unchanged. The owning inventory test passed six cases; `inventory-repair.log` has SHA-256 `aa6889312d82a086e6be0fa468de83dc2f074c7faf1ba2561d2e222ba446084c`. The final timed pins check passed all stages in 23.545 seconds; `pins-final.log` has SHA-256 `c9a7cbdbe2cfc5639e96ac670bf844e6a84766d3ace5566e6f2e5ee020573e15`. It ran on base `a14e7471` with the Page asset, MCP reference, generated inventory, and this note in the working tree.

## Integration on published Main

The combined snapshot at published Main `536e2efcfb855c8d78c43341d49a0a72d33ec391` supplied the base for the six E2 commits. The clean full-gate head was `63c11ace5f754cf0d2603f71dc5b984ba68b62aa`, tree `b9630b3495eab7fd9bdf77c0eea0f188c0687ceb`. The clean follow-up head was `79f374e3eb2f634c4c8d0c85074a7fd9830742af`, tree `0286f9c02799be8b64f53f82204927747223e570`. Its only source diff added `"explore"` to the expected export inventory in `packages/client/test/replica.test.ts`. The test file has no importers and keeps its previous cases, deadlines, and assertions about production behavior. Production code, shared helpers, configuration, and dependencies match the full-gate head.

The limited follow-up used the procedure in [File test evidence](../../docs/evidence-filing.md#follow-up-after-a-gate). The failed gate and the follow-up cover separate runs.

| Check | Retained result and SHA-256 |
| --- | --- |
| Full gate | Exit 1 in 428.81 seconds. Static checks, typecheck, definition pins, workspace pins, kernel, Node (246 cases), and Counting (60 cases) passed. Plain finished with 5,094 passed, one skipped, and one failed. The failure came from the export inventory. The gate stopped before Native. Scale selected omit because the change fell outside scale paths. `~/play/artroom-evidence/2026-11-22-63c11ace-e2-gate/gate.txt`, `c40a315bd5fcb7fff272352ab670974e2162044e2ee5fe23d841af2f00476cc6`. |
| Whole client export test file | 31 passed. `~/play/artroom-evidence/2026-11-22-63c11ace-e2-gate/limited-followup/replica.log`, `ded062293ebb2ae96671f2c7e31288ed75aa01fe1682dd0d0b3a59f67de14e0d`. |
| Client test compiler context | Exit 0 in 0.49 seconds. `~/play/artroom-evidence/2026-11-22-63c11ace-e2-gate/limited-followup/client-test-types.log`, `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. |
| Native stage | Exit 0 in 566.83 seconds. 303 files passed and one skipped. 1,240 cases passed and two skipped. Scale remained omitted. `~/play/artroom-evidence/2026-11-22-63c11ace-e2-gate/limited-followup/native.log`, `0493022d7a2e503f9304f4b8e30115942ab933678f2cbacdcd5cfcf50152978b`. |
| Native ownership crossings | Zero lost, four stale, and zero with no owner. `~/play/artroom-evidence/2026-11-22-63c11ace-e2-gate/limited-followup/native-crossings.txt`, `0ba9101fa678dc9e156ca12160e49e1aee6a81223a74a8707c15c9de4fa9d2b5`. |
