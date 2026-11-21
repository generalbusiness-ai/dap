# E2: explore a declared scope in MCP

Status: draft. The integrated source and final gate are not yet checked. Do not treat the branch results below as a pass for the final tree.

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

The integrated source commit is `59bc85476710051f9aeb836db842af3b13c63f4b`, tree `4c98fa374f4e6db89481685f02721222177b08e4`. The final rehearsal and gate remain pending. The earlier client commit `427112445d20ff46833a1ada21065bd47c90399c` has tree `c573c8ec8eca17f97a75df7e63dd2b9eee2b26d3`, identical to the tested client checkpoint `a55e0154d47b541bfc6f4e3fc3375fa93223ffae`. The following results do not establish a final integrated gate pass.

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

The client witness used a real native-judged Lending birth and session over a local transport. It compared an explored release's effects with an accepted release, changed the standing, checked a different session and backward clock, and held an exploration across a replica refresh. The refresh witness detects a changed replica generation; the MCP witness separately moves the head. `commands-and-controls.txt`, SHA-256 `a76a6494a3a89ffa01020974035881287e65e93835a71f44638cbfbb46a891aa`, records the MCP commands and earlier fixture repairs. Earlier failed raw runtime logs were overwritten during iteration and cannot be recovered; the retained account does not replace those logs. The final native rerun and gate remain pending.

## Security review and recovery

Review the `McpService` named owner and its module seal, the `hosted-tools.ts` whole-file seal, and the new `explore-result.ts` helper in `scripts/security-entry-points.test.mjs`. Record the helper's owner and update the hosted MCP security inventory after reviewing the final source. Do not refresh seals against an unfinished draft. Run the exact entry-point inventory and the ordinary gate on the clean reviewed candidate. If either fails, preserve its original output, correct the owning source or documentation, and run only the required checks on the new exact candidate. A metadata or seal update alone is not a test result.

## Rehearsal on the Security group

The E2 commits were carried onto Security group `501edfb8addc0fdb233a7c3edfef300ee728dd0f`. The focused rehearsal checked clean source `f68ee82c4700be36871674edbc5803fd257e47c8`, tree `34422b8d83331035f6e292c674bea92d389b7def`. The E2 implementation and tests match the earlier branch. The Security-group source and its existing owner seals remain in the rehearsal.

The native Lending release and moved-final-head witness passed on that source: one passed, two skipped, with 11.29 seconds reported by Vitest and 12.349 seconds elapsed for the command. The sanitized summary is `~/play/artroom-evidence/2026-11-21-e2-on-security-focused/native-summary.log`, SHA-256 `1348b83a381b2888e6630a72fa2c2e4b1ce88426c149389f0df87a975b6e13cd`. The owner cancellation tests passed two of two; `owner.log` has SHA-256 `06d79352d0ed577207391b23c2541d9e7df037402f7b2d0a26f2403f48a8c476`. Client, MCP test, and MCP scope typechecks passed. The two MCP compiler logs are empty; each has SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. The client compiler log has SHA-256 `93d077e30835a17c82425abeab78e368f3aaae2d1ee44b05b5fa8291b6391430`. The security inventory passed 13 of 13; `security.log` has SHA-256 `530450d1597e8010ff25adaf0479fc240a435c404f48e2a720cafbc358ac6a10`. Companion command files in the same directory record the commands, exits, and monotonic durations. No full gate ran in this rehearsal.
