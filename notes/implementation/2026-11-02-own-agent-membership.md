# Members can create agents they control

## What changed

Request `28b5cd84` under promise `8f601a58` adds the opt-in own-agent cohort: Register 27, Directory 26, Membership 13, Rules 10, Destination 20, and Inbox 1. An active person with `membership.own-agent` can add an agent they control and invite its key. The default role table gives that action to admin, maintainer, and member.

`add-own-agent` requires kind and role `agent`, the signer's full controller reference, an unused valid handle, and fewer than eight active controlled agents. Both own-agent steps read the role table in force. They refuse when the agent role contains an action outside the signer's role. An admin signer skips that subset check. The invite also requires an active agent whose recorded controller is the signer.

The production enrollment client accepts the two new opening and invitation facts only under Membership 13. It retains the existing signed-intent, fields, controller, receipt, sibling, key, and inbox checks. The existing invitation issuer still takes the administrative path. O3 owns the consent composition that uses the two own-agent steps.

## Decisions and reasons

Membership 12 and its companion version numbers belong to next-cohort child `39487984`. This head leaves those numbers free. It adds four exact supported pins and updates closed readers for creation, authority, sessions, invitations, application routing, publication provenance, and CLI reporting. It adds no numeric version range. Existing rooms keep their definitions.

The cohort inherits repository binding from Membership 11's family. Register and Destination reuse their declaration data under new identities. Directory creates Membership 13, and the Register's genesis-result verifier checks that exact Directory. Operators must select `--cohort own-agent` and admit that family in their deployment policy. Default creation policy stays byte-for-byte unchanged.

Checker finding `5cf22ef8` adds two bounds to the ordinary-member invitation path. An agent can hold only one live key through `invite-own-agent-key`, counting invited and active keys together. `inviteEnds` must be strictly after the recorded act time and no more than 24 hours later. A pending invitation occupies the slot until it lapses; an enrolled key must be revoked before this path invites its replacement. The administrative invitation step retains its existing policy.

The bounds close a room-wide denial: an ordinary member could otherwise create far-future invited keys until the room reached its 10,000-live-key limit, and even an admin could not revoke those invited keys early. One live key is enough for O3's first connection. The Native guard reads current key pages under the existing room-wide key bound, while the time guard compares against the judge's act time rather than the caller's clock.

The new guards scan only active member pages, with 128 items per page under the existing 10,000-member declaration bound. The capacity guard stops when it sees eight controlled agents. Removing an agent releases its active slot. These guards stay in Native Membership; no HTTP token or MCP tool grants membership authority.

The MCP service change only adds this exact cohort to `McpService.#applicationRoom`. It does not edit `Reads` or member display, so held request `5de93fbc` does not trigger. The Page bundle changes because it embeds platform declarations. The Page join fixture now expects invitation proof for M13, and the CLI refusal fixture names the added supported family.

## Final evidence

The second gated source checkpoint is `5929ca7cd76f180e062fcbf0cd340243fdb2c729`, tree `9285a3daa4436aff5fd30010d3b84a3393b7f181`. Incremental focused runs record their own actual head and dirty status. Their manifest names the final checkpoint and qualifies that history. Each JSON record carries the exact raw output sizes and SHA-256 values; raw output stays private because Native fixtures can print credentials.

The real Native scenario creates the new cohort, admits a person and a checker, and runs both own-agent steps. It proves the member's success, checker refusal, wrong-controller refusal, subset refusal before add and after role widening, admin subset exemption, eight-agent bound, and replacement after removal. The production `enrolAgentKey` client consumes the actual invitation through the routed Worker, with real read sessions and Native inbox proofs. The clock and read-session inspector remain explicit TEST fixtures. Host none runs no Git provider.

Controls 12 and 13 remove the subset decision and allow a ninth agent, respectively. Each fails at its intended assertion, and the control driver restores the source. These controls precede the later enrollment-client addition, which leaves both guard functions unchanged.

The focused unit holds 59 read-only files. Its manifest SHA-256 is `1e361dc02a0f6a07ff89185ee9ea9390667e7445470c8c487e7618c90f89ab73`. The exact historical comparison preserves all 92 earlier pins and all 51 earlier declaration texts, including Membership 11. The resulting catalog holds 96 identities and 53 distinct declaration texts. The focused seal verifies all 52 private raw files by size and digest.

The first frozen gate at `6744f49de2a6603a6516e36120c6521e62812e80`, tree `b802ec968fdeda97b331bdf13585cd260cdfcc07`, exited 1. It passed Node and Counting, then reported three failing plain files: `nothing-sent.test.ts` held the old CLI message, `join.test.ts` omitted M13 from its explicit invitation-proof list, and `assets.test.ts` found the old Page bundle. Native was unreached. That six-file unit remains failed and sealed. Its manifest SHA-256 is `60274b489431ed114d9bc021d6050666533928fa572820203c015d3cfa232f8b`.

Run 26 passes all three whole owners after the two exact expectation updates and the normal Page build. Runs 02, 03, 05, 06, 08, 09, 10, 15, and 18 remain failed; their later numbered records show the compiler, fixture, selector-dispatch, and encoded-link corrections. No deadline or production-behavior assertion was weakened.

The second frozen gate also exited 1. It passed 132 Node cases, 56 Counting cases, all 3,591 plain cases with one skip, and 1,046 Native cases with two skips. One Native setup failed: the generated Register 27 session case inherited `git.example` from the shared fixture, while that Register correctly accepts only `none`, `artifacts`, or `github.com`. Its manifest SHA-256 is `91893c92a9f8f98b7edaa8798d1e7bb67f36f9bdc5d117bdf4b5bef23f99543b`.

The isolated follow-up at `63023896a98cb49cf503dcccff767e8282117d20`, tree `7f47e97cb7405ea8132712c4574daf8992205cb6`, changes only `packages/scope/test/session-reference-native.test.ts`. It selects `github.com` for the exact own-agent family through the fixture's existing parameter. Removing that import and selection restores the entire gated test file. Production source, configuration, dependencies, imported helpers, cases, assertions, and deadlines remain unchanged, and no file imports that test. The owning compiler and all 24 cases of the whole owning Native file pass. Every gate stage had run, so no stage remained to run after the file. This follows the isolated test-file repair rule in `docs/testing.md`; the checker must assess that qualification. Both gates remain failures. The follow-up manifest SHA-256 is `278b31864deaf7e83c735ffdcf870ea529a5b37222afe5334b77f4fc58944d1e`.

[Card browser run 41565388797](https://github.com/generalbusiness-ai/dap/actions/runs/41565388797) and [Page browser run 41565388918](https://github.com/generalbusiness-ai/dap/actions/runs/41565388918) succeeded at `5929ca7c`. Only the isolated Native test changes afterwards, so all Card and Page workflow inputs stay unchanged. Their manifest SHA-256 is `5c60f726c9937da7baaae20a12dd3068849c377e33f2d6184d0a08271ad62ae7`. Those five earlier sealed units hold 87 files. They describe the first review head and its evidence. Checker `5cf22ef8` accepted the isolated-test qualification and required the two production invitation bounds, so the repaired source needs a fresh frozen gate and current browser runs. These are browser scripts, not deployed host acceptance.

The following rows cite the JSON run record. Each record identifies its exact command, exit, and both raw-output hashes. Elapsed times in those records measure the outer process on the shared Mac; they do not claim isolated CPU or production latency.

| Check | Command | Exit | Record SHA-256 |
|---|---|---:|---|
| 01-platform-compiler | `node node_modules/typescript/bin/tsc -p packages/platform/tsconfig.json --noEmit` | 0 | `e6d419a9f1518dff4b07c66b66feea9e1d4d39c4e4d32240a79dbca60b30d559` |
| 02-scope-test-compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 1 | `3afbd77bc786435d13343c34f8323a97a6be78472eb82b21aaf0742bd5b828c9` |
| 03-scope-test-compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 1 | `e421981afff711e29e5e2ed2dacc749dd03780be4487a7554de9b0a092203a2c` |
| 04-scope-test-compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 0 | `d557628fa1036886e0c365c26cf83ca3a135735655dcfdb511b5dfd9f2f60a0d` |
| 05-own-agent-native | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/own-agent-membership.test.ts --reporter=verbose` | 1 | `2d9ebd27f24d1d71360b5a82e391b01a3c219a4b353d250d8a8c9b84f1bbeffc` |
| 06-own-agent-native | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/own-agent-membership.test.ts --reporter=verbose` | 1 | `675d3137d7a603d74dea74cf7dd5e1a7f51ab9f63c9e12e14667c8f8c3df5c1a` |
| 07-version-pins | `node node_modules/vitest/vitest.mjs run --project platform packages/platform/test/versions.test.ts --reporter=verbose` | 0 | `d5d981e7b8df1c9260333ffb88851261935a33f9be84707c131241c6958f790f` |
| 08-own-agent-native | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/own-agent-membership.test.ts --reporter=verbose` | 1 | `0ffdcceb7d4d09e5f3c67abf516303466b9acff39364c02e5ffd693a9a6f3582` |
| 09-own-agent-native | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/own-agent-membership.test.ts --reporter=verbose` | 1 | `97c278c034a9f8a251edc22aee7e5859ceb6876b9d1b8d9ea41ff813ebc6076e` |
| 10-own-agent-native | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/own-agent-membership.test.ts --reporter=verbose` | 1 | `c0c0f36d38b5d55014b15838e501e37a9cf7fb2ea24ad9fc3d88d3f4b0404b6a` |
| 11-own-agent-native | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/own-agent-membership.test.ts --reporter=verbose` | 0 | `14237d0da814a6a0151f6495ca4033fa22ab8639e82e2aae41b4b9564a039d26` |
| 12-role-subset-control | `node scripts/control.mjs packages/platform/src/own-agent-membership.ts agent.every(action => own.includes(action)) true --expect own-agent creation -- . --project scope packages/scope/test/own-agent-membership.test.ts` | 0 | `b0778cb634200a31f73e16c1ffd4a0755c7910d0053081a781e3f908fa3c3349` |
| 13-capacity-control | `node scripts/control.mjs packages/platform/src/own-agent-membership.ts ++count >= 8 ++count > 8 --expect own-agent creation -- . --project scope packages/scope/test/own-agent-membership.test.ts` | 0 | `35fb67aa345b9498819bc70a7ec9de76fbc559b1c6c2407b13d20528eee9a786` |
| 14-owning-compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 0 | `d00bfcd6f02e13813e7085053c8a388680831090423c828b95510e30d46ba45d` |
| 15-cli-cohort | `node node_modules/vitest/vitest.mjs run --project cli packages/cli/test/install-cohort.test.ts --reporter=verbose` | 1 | `815826cba73a8efaf5d88f6f985e00e8fe4e420cc14177a814e09f119e21b40c` |
| 16-creation-policy-native | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/creation-versions.test.ts --reporter=verbose` | 0 | `dc04cd44d5379a707e3d9a3cc671c9e4bb52aec1e216e43814bf4afc1fe54a4f` |
| 17-cli-cohort | `node node_modules/vitest/vitest.mjs run --project cli packages/cli/test/install-cohort.test.ts --reporter=verbose` | 0 | `e4b979d39687512f87f84514f1dde4b928bb097f5a6ae9f575d21be12516c370` |
| 18-native-enrol-compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 1 | `25a7d8dc67768033ed98a09492bf44883107e103b5350b48272bac9554df647a` |
| 19-native-enrol-compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 0 | `48d6a551e1356f70b50ea99b2b81a386a0dd33430057e28594b04bb59c1cc1ab` |
| 20-native-client-enrol | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/own-agent-membership.test.ts --reporter=verbose` | 0 | `91675d23c2e55520bf0091868496d2173d637762d2fd36f2b7569d11b0500694` |
| 21-entrypoint-owners | `node --test scripts/security-entry-points.test.mjs` | 0 | `ee6606e934e68180ec5750784bf0279152115a686d650a663f3591881cb014a5` |
| 22-cli-source-compiler | `node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.json` | 0 | `28102aba1b4151c4e0370422631df2f464f0d98484e42c37524a867459de9d4d` |
| 23-mcp-source-compiler | `node node_modules/typescript/bin/tsc -p packages/mcp/tsconfig.json` | 0 | `f6659ec98d19c563a523f0c826957c9d5e42aadad3527b836a49f71fbd904c25` |
| 24-scope-source-compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.json` | 0 | `fd996c66af7770d1e7eceed3d3bac53a23197ec7b70b3c1198f7966f6f1be1b3` |
| 25-page-bundle-build | `npm run build --workspace @generalbusiness/dap-page` | 0 | `cad78dd48da043b3e0ce38745abe88f1a1c230959cd968824e709fdc7e981d95` |
| 26-gate-failure-owners | `node node_modules/vitest/vitest.mjs run --project cli --project page packages/cli/test/nothing-sent.test.ts apps/room/page/test/join.test.ts apps/room/page/test/assets.test.ts --reporter=verbose` | 0 | `50f3b50b137a4b23499916d1427d25d8d7a2177fdb39215d100473e0fd555e7d` |
| First frozen gate | `npm run gate` | 1 | `eefc80cc657bd86fba50c35aaa2dc3929ad981cf1aac002aa424c93e33934095` |
| Second frozen gate | `npm run gate` | 1 | `c1d082578eadabe61e549d0af82e52d86e73b8901749b5c01eeaa076a9ae2b0c` |
| Isolated Native compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 0 | `8cf9d675915b6a60e7d29131717560fb3ff2be3e9ec8abb0eac6062dc756d5f5` |
| Whole repaired Native owner | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/session-reference-native.test.ts --reporter=verbose` | 0 | `df4aca06e0376338823549260a822c0b3d81ac9374e9ece1519b93fce1b5487e` |
| Exact isolated-repair proof | `git diff 5929ca7c 63023896; remove only the new host selection and compare all bytes` | 0 | `d430ab2da609259a1671c5a8b38fd8010f91bb5ae3ad6cb0b2f3b28ffd9968da` |
| Card browser workflow | `gh run view 41565388797 --json conclusion,headSha,jobs` | 0 | `4bb0a8112708547e926defdf3c305164610bc553f905a61000003d9ca59acd7f` |
| Page browser workflow | `gh run view 41565388918 --json conclusion,headSha,jobs` | 0 | `5eb5b382e336e3f23cddec47bf65066f8a8f5f0ce5c5d501e002b949220f1b11` |

Manifests: [focused](evidence/2026-11-02-own-agent-focused.manifest.json), [first-gate](evidence/2026-11-02-own-agent-gate.manifest.json), [second-gate](evidence/2026-11-02-own-agent-gate-fixed.manifest.json), [session-followup](evidence/2026-11-02-own-agent-session-followup.manifest.json), [ci](evidence/2026-11-02-own-agent-ci.manifest.json).

## Open limits

- O3, under the OAuth design `notes/2026-11-02-hosted-mcp-oauth.md`, owns the consent page, own-agent invitation issuance composition, grant, issuer, code exchange, refresh, and revocation routes. O2 does not implement them.
- O4 owns real-host consent and simultaneous connector acceptance after the planner deploys and opens one Worker. O2 changes no deployment setting and grants no deployed acceptance.
- G3 `3c6ec378` and transport diagnosis `6ce82b92` retain their own publication evidence. The witness room stays unchanged under ruling `90f79edf`. This cohort does not settle its unknown stage.
- Next-cohort child `39487984` keeps its reserved numbers and remains separate. Request `5de93fbc` still waits for a `Reads` or member-display owner edit.
