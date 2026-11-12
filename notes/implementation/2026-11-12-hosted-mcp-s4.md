# Hosted MCP admission and disclosure

For request `9a053402` and promise `abbd5eba`.
The source head is `fe6fa9e7`.
Its tree is `a80d999cb8ffcadd985dce0f40d71ae4e6f96a21`.
The comparison base is main `221e11c3`.
The gate at `12c24841` failed.
The isolated follow-ups below do not turn that result into a gate pass.
Exact-head push CI remains pending.

## What changed

Read-only `connections` calls retain no operation row and cannot permanently consume the control budget.
Control and cleanup use separate windows of 120 calls per verified key in 60 seconds.
Each purpose bounds identities at 4,096 plus one overflow counter.
Unsafe clocks refuse without resetting counts.

`GET /oauth/authorize/context` checks an address window before client resolution.
Invalid successful client documents can enter a finite 60-second negative cache under the exact URL and copied redirect policy.
Network failures, timeouts, and non-200 replies do not enter that cache.

Hosted credential admission checks the current Agent/controller role subset at creation, bearer rotation, code exchange, refresh, and access.
An admin request does not waive that rule.
Creation preflight checks exact Native key association for enrolled Agents.
Only an exact public absence selects pre-enrollment.
`agentRoleDecision` already enforces final association.

A definitive grant refusal leaves no client mapping.
Legacy mappings with unknown origins refuse new consent until room retirement.
The `credential` tool keeps its secret outside `structuredContent`.

The Worker verifies signatures, service, and route before membership registration or client resolution.
The actual custody callback rechecks the private dispatch owner and fresh standing.
A local stop retains the original signed request without inventing a Native outcome.
View `check-original` keeps that request until an authoritative answer settles it.

Ordinary writes and dynamic Native act tools declare model-only visibility.
Trusted declared `view_act` and input tools remain app-callable under retained declarations and bounds.
The Card push workflow now runs `declared-views-browser.mjs` after the card script.
Documentation corrects seven self-signed authentication rows.

## Decisions and why

Finite windows preserve bounded cleanup and existing custody accounting.
Fresh same-head facts prevent a widened Agent role from escaping its controller's authority.
Temporary subset failure or unavailable facts withhold admission without inventing permanent revocation.
Exact owners, SQL candidates, deadlines, clocks, and HTTP epochs guard disclosure after awaits.
A committed mint can withhold plaintext while retaining a secret-free `codeShown` receipt.
That receipt consumes disclosure once and permits neither reminting nor later plaintext recovery.
Code relay to the Registry promises no lease or validity at delivery.

Visibility follows the immutable [MCP Apps specification, Visibility section](https://github.com/modelcontextprotocol/ext-apps/blob/298e884ec3f02daba085acdb02042d73bd00b355/specification/2026-01-26/apps.mdx#visibility).
The host must reject app calls to tools whose visibility excludes `app`.
Ruling `ec9ba020` exempts trusted declared `view_act` and input tools.
Trusted package scripts can submit declared actions without a click under the member's authority.
Visibility metadata does not authenticate UI origin.
A noncompliant host still reaches the server's ordinary membership, grant, and Native guards.

Eight test-only backports distinguish against unchanged baseline production at `7177b87b`.
Item 6 adds a baseline-only signature-order case because the baseline has no equivalent witness.
The association fault disables the enrolled-identity preflight guard.
The original `60283b41` attempt survived.
The strengthened witness at `12c24841` expects 403 where the fault returns 201.

The whole-file hash of `http.ts` changed outside the protected `HttpGeneration` class.
`OAuthHttpLayers` remains unchanged.
Ruling `1a42c068` requires the full Transport check and statechart while retaining earlier fault controls.
Those bounded results cover transport, not S4 authority or end-to-end completion.

The gate at `12c24841` exited 1 after all prechecks and compiler checks passed.
Its Node stage reported 166 tests passed and 3 tests failed.
All failures came from obsolete access objects in `apps/views/test/s4.test.mjs`.
Counting, Plain, and Native did not run.

Commit `7c0fcc3b` changes only three fixture arguments into access factories.
Imports, assertions, and compiler inputs remain unchanged.
The `docs/evidence-filing.md` isolated-file exception permits the owner and unreached stages.
That follow-up passed all 26 tests in the Node owner and all 56 Counting tests.
Plain then reported 4,544 tests passed, 1 test failed, and 1 test skipped.
The sole failure was the generated MCP reference's obsolete credential description.

The repair corrected `docs/mcp.md`; the maintained inventory writer refreshed `docs/mcp-tools.json`.
The complete inventory owner then passed all 5 tests.
Commit `3b22c08f` records that documentation repair.
The Native continuation at that head reported 1,130 tests passed, 2 tests failed, and 2 tests skipped.
Both failures came from `packages/mcp/test/recipes.scope.test.ts` expecting the credential in structured content.

Commit `fe6fa9e7` changes only that fixture's credential extraction and assertions.
The fixture checks public structured metadata separately from the credential text.
The affected compiler command exited 0.
The whole recipe owner then passed both tests.
Production, shared helpers, dependencies, and configuration remain unchanged across these isolated repairs.
All three failed runs retain exit 1.

The maintained producer at `1674484d` produced 53 records for 11 owners, including 16 changes, under END `d37efa54`.
The hosted-only successor at `3211339e` produced one updated source seal under END `63e472d6`.
Commit `6c379107` adopted that seal.
The ten other owner files still match `1674484d` in Git.
`hosted.ts` still matches `3211339e` in Git.
This is source-inventory provenance, not a new parse or current runtime claim.

## Evidence

The [evidence manifest](evidence/2026-11-12-hosted-mcp-s4.manifest.json) indexes unchanged plain originals.
It is curated provenance, not raw output; no raw copy or seal accompanies this filing.
Its source checkpoint is `fe6fa9e7`, tree `a80d999cb8ffcadd985dce0f40d71ae4e6f96a21`.
Every row keeps the head that actually ran.
Counts come from the original reports, without adding repeated owner observations into a combined pass.

Commands below document reproduction, rather than claim a complete original argv receipt.
`V(P, F)` denotes `node node_modules/vitest/vitest.mjs run --config vitest.config.ts --project P F`.
The recipe run also retained the default and JSON reporters; its literal command appears in the manifest.
The manifest retains each command's START, END, original streams, reports, and literal exit-file references.
Native scale omission came from the unchanged gate selection, `outside-scale-paths`; no worker or test deadline override applied.
All output paths below start with `~/play/artroom-evidence/2026-11-12-s4-`.

| Check | Command and checkpoint | Actual exit and result | Original output |
|---|---|---|---|
| Whole gate | `npm run gate`, `12c24841` | 1; Node 166 tests passed, 3 tests failed | `gate-12c24841/gate.stdout`, SHA `a010b64cd56600b83a37a328903339584e8aa114ea3240e8078ff5cdec54856c` |
| Repaired Node owner | `node --test apps/views/test/s4.test.mjs`, `7c0fcc3b` | 0; 26 tests passed | `gate-followup-7c0fcc3b/node.stdout`, SHA `8f5c2f6d0c5042f3eed237caf097a70cc7daab749ba6292befb73660a9a2b0e0` |
| Counting | `node apps/counter/scripts/test-browser.mjs`, `7c0fcc3b` | 0; 56 tests passed | `gate-followup-7c0fcc3b/counting.stdout`, SHA `2f8e848b35e5c12fcb450622d121b18d3eba42cf036dcfd102b344340188a99a` |
| Plain | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts`, `7c0fcc3b` | 1; 4,544 tests passed, 1 tests failed, 1 tests skipped | `gate-followup-7c0fcc3b/plain.stdout`, SHA `2de74e18fc480d8df03fd12fb8ecd924f286e65b6c92545502741659356e82bc` |
| Repaired documentation owner | `MCP_WRITE_DOCS=1 V(mcp, packages/mcp/test/inventory.test.ts)`, `7c0fcc3b` plus document repair | 0; 5 tests passed; documents adopted at `3b22c08f` | `inventory-doc-followup-7c0fcc3b/stdout`, SHA `9b35b950eff303ccd9992bd6002208ac8fb2fa3dc2da62f27b2dab11bc1060ff` |
| Native | `ARTROOM_SCALE_MODE=omit node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts`, `3b22c08f` | 1; 1,130 tests passed, 2 tests failed, 2 tests skipped | `native-followup-3b22c08f/stdout`, SHA `eb4fec920be96ac49d8146620c815db02c9312e61136342f1c4caaa616a8275c` |
| Recipe compiler | `node node_modules/typescript/bin/tsc -p packages/mcp/tsconfig.scope.json`, `fe6fa9e7` | 0 | `recipes-followup-fe6fa9e7/compiler.stderr`, SHA `cc593850aa32823435ef1eb01031bf1ea3321568b991bcc04837cafe7db80e79` |
| Repaired recipe owner | `V(scope-stories, packages/mcp/test/recipes.scope.test.ts)`, `fe6fa9e7` | 0; 2 tests passed | `recipes-followup-fe6fa9e7/owner.report.json`, SHA `01d4abbcb94a1596b9877346f851850a3fef3b2cc71b2899dbe4fef5485ebbf2` |
| item1-connections-budget | `V(scope-stories, packages/mcp/test/hosted.scope.test.ts)`, baseline `7177b87b` | 1; 23 tests passed, 1 intended assertion failure | `negative-item1-7177b87b/owner.report.json`, SHA `65f9c9ae5e5aa6e20cdb8eff22322ef76de4dc223a21ad022714c09e6fcddc11` |
| item2a-context-address | `V(scope-stories, packages/mcp/test/oauth-native.scope.test.ts)`, baseline `7177b87b` | 1; 5 tests passed, 1 intended assertion failure | `negative-seven-7177b87b/item2a-context-address/owner.report.json`, SHA `202fdd8b8118e4bf0b48b5dbf8a087352cfae5e37a348940e2f0ed59d377b185` |
| item2b-invalid-cache | `V(scope-stories, packages/mcp/test/oauth-clients.scope.test.ts)`, baseline `7177b87b` | 1; 3 tests passed, 1 intended assertion failure | `negative-seven-7177b87b/item2b-invalid-cache/owner.report.json`, SHA `5ac526de69c38fb40ae2980745a6b70ba90b876889fe4ee338236ce21d6f7590` |
| item3-admin-subset | `V(scope-stories, packages/mcp/test/oauth-hosted.scope.test.ts)`, baseline `7177b87b` | 1; 2 tests passed, 1 intended assertion failure | `negative-seven-7177b87b/item3-admin-subset/owner.report.json`, SHA `ee01e992309042b29bd4986c5efe31070c4fafaf6c5ce0e94ec6738040397da1` |
| item4-tool-visibility | `V(mcp, packages/mcp/test/view-resources.test.ts)`, baseline `7177b87b` | 1; 5 tests passed, 1 intended assertion failure | `negative-seven-7177b87b/item4-tool-visibility/owner.report.json`, SHA `d8c5676f224737a6ff4b274b27d01352d03ecbd01f2fc8954c3350002ed064ee` |
| item5a-refused-mapping | `V(scope-stories, packages/mcp/test/oauth-hosted.scope.test.ts)`, baseline `7177b87b` | 1; 2 tests passed, 1 intended assertion failure | `negative-seven-7177b87b/item5a-refused-mapping/owner.report.json`, SHA `d5105c61dfa1cc844c0183d37b32a3133414838bd6f12386d825a5c0ee2fa76a` |
| item5b-credential-placement | `V(mcp, packages/mcp/test/errors.test.ts)`, baseline `7177b87b` | 1; 17 tests passed, 1 intended assertion failure | `negative-seven-7177b87b/item5b-credential-placement/owner.report.json`, SHA `b7261b8dc6de3ba08d31f227ece77f3978f95fe772fa6bb47e402b9138f3b503` |
| item6-signature-order | `V(scope-stories, packages/mcp/test/oauth-native.scope.test.ts)`, baseline `7177b87b` | 1; 6 tests passed, 1 intended assertion failure | `negative-seven-7177b87b/item6-signature-order/owner.report.json`, SHA `2f7b91f330c95118790453fe24b1a153df1b151df43a27b8111fee67a69b28a2` |
| Association before | `V(scope-stories, packages/mcp/test/hosted.scope.test.ts)`, `12c24841` | 0; 24 tests passed | `association-control-12c24841/before.json`, SHA `1eaaa7a8597af5b75500a69b522bd6e17f0010c8cc3daf9154565f3cf95f5c38` |
| Association fault | Same owner; disable only the preflight association guard, `12c24841` | 1; 23 tests passed, 1 intended assertion failure | `association-control-12c24841/after.json`, SHA `54a5832e1b364447270d18c2f4b7be5e9700f3008041e10a1df5a1a7e2025b2c` |
| Earlier association survivor | Same owner and fault, `60283b41` | 0 before and 0 after; 24 tests passed in each; no distinction | `association-control-60283b41/after.json`, SHA `2ca0b0b150c106e68480b8a8fe2b04be9ace7a52d9f4cc7787c97ac30d1cd6b4` |
| Transport | `node verification/state-machines/check.mjs Transport`, `60283b41` | 0; 5 distinct states, source property passed | `transport-60283b41/check.stdout`, SHA `d4756f05f8745f2bfb1bd37c0d99ebc875bfcad04347c8d4d2c7ffd9f163f35e` |
| Transport statechart | Retained `statechart.ts` with `model/Transport.tla`, `--config model/Transport.cfg`, `--view model/view.mjs`, `--out chart`; full recipe in manifest | 0; 5 reached states | `transport-60283b41/chart.stdout`, SHA `cf0ea3bb51f64684a576a5b859b22ac513c38435c432b6552d1b20827f94dc02` |
| Maintained source inventory | Maintained `sourceSeal` and `namedSourceSeals`, `1674484d` | 0; 53 records for 11 owners | `maintained-ast11-078b9f98/actual.json`, SHA `42c8d3b59f8cd03f1d8140f7c61f1bbce217507c55ba59fa6e7927d6be65098d` |
| Hosted inventory successor | Maintained `sourceSeal`, `3211339e` | 0; 1 record | `maintained-hosted-ast1-3211339e/actual.json`, SHA `8f642e19d9729a867a52108103e96000c10a2204535ecd938dd84d2cd44d929c` |
| Page push CI | Completed source, tests, workflow, and note head; push only | Pending | Pending |
| Card push CI | Same head; includes declared-view script; push only | Pending | Pending |

Planner ruling `63368b81` authorized one preservation rename of the gate internals.
The old path was `/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.B7C5Syb8Cc`.
The current path is `~/play/artroom-evidence/2026-11-12-s4-gate-12c24841/internals`.
Root act `f059af51` records unchanged inode identity, modes, and bytes for all 30 entries.
These internals show the failed gate and supply no acceptance claim.

## Open limits and owners

- S4 request `9a053402` still requires exact-head push CI, final evidence filing, and checker review.
- External host enforcement remains **UNKNOWN** under S4 request `9a053402` and ruling `ec9ba020`.
  Card browser CI does not establish the four external hosts' behavior.
- Rulings `3ec2bcad` and `3a5c4448` require one push of the completed source, tests, workflow, and note.
  Read that head's Page and Card push runs without dispatch.
  One document-only follow-up adds the actual results to the note and manifest.
  That follow-up needs no push run of its own.
  Every other path must equal the CI source head, with both trees named for checker comparison.
  A failed push run requires repair and evidence from the new source head.
- Failed focused windows retain ENDs `c08c82fc`, `b15604a3`, `e6dc87ef`, and `c57544cd`.
  The Native working failure under END `a1f16270` also remains an original failure.
  Later success does not rewrite these failures.
- S4 request `9a053402` keeps hosted MCP disabled until the reviewed head lands.
  This note authorizes no Worker configuration change or live O4 window.
