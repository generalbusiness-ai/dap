# Hosted MCP admission and disclosure

For request `9a053402` and promise `abbd5eba`.
The current repair source is `e4051271`, tree `aeeadba2eea82a7d2f697ee3b38313d778fea57a`.
Checker report `6fbde9b8` requested repairs after the first review at `6352d355`.
The comparison base remains main `221e11c3`.
The fresh gate at `e708f454` exited 1.
Its fixture-only follow-up passed the affected compiler and whole Hosted owner at `e4051271`.
Neither follow-up chain turns either failed gate into a gate pass.
New Card evidence and final source correspondence remain owed.
The successful push runs at `77ac8113` remain historical evidence for that earlier source.

## What changed

Read-only `connections` calls retain no operation row and cannot permanently consume the control budget.
Control and cleanup use separate windows of 120 calls per verified key in 60 seconds.
Each purpose bounds identities at 4,096 plus one overflow counter.
Unsafe clocks refuse without resetting counts.

Commit `58bb8c24` adds trusted transport-address admission before public key admission.
The required RPC argument carries the retained `cf-connecting-ip` value.
Both charges use one clock value and disjoint identity prefixes within the existing purpose.
An address refusal allocates no key row.
Missing or malformed addresses share one bucket.
The existing Native scene now floods fresh keys before routed member creation and retirement.
Commit `122c828c` corrects its public counter reads to the new key prefix.
Commit `e708f454` records the two generated visibility records in `docs/mcp-tools.json`.

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

Ordinary writes, dynamic Native act tools, `credential`, and `diff` declare model-only visibility.
The latter two retain their read-only hints.
Trusted declared `view_act` and input tools remain app-callable under retained declarations and bounds.
The Card push workflow now runs `declared-views-browser.mjs` after the card script.
Documentation corrects seven self-signed authentication rows.

## Decisions and why

The checker found that fresh self-signed keys could fill the Worker-wide public window and block other rooms, including retirement.
Address-first admission permits at most 120 new key allocations per canonical address and purpose in one window.
Key rows from adjacent windows can overlap.
A conservative live bound is 240 key rows plus one address row per purpose for that address alone.
The repair adds no table, purpose, migration, timer, or higher cap.
It does not promise immunity to many independent addresses or pre-existing shared-table exhaustion.

Ruling `3ae8a396` adds model-only visibility for `credential` and `diff` while retaining their read-only hints.
The descriptor witness names both tools.
The hosted reference now states stable rules instead of obsolete checkpoint and validation status.

The stored-control limit remains separate.
Each operation starts with a 4 KiB reservation against the ordinary 15 MiB allowance.
Answer expiry credits answer JSON bytes while retaining the tombstone's remaining charge indefinitely.
That remaining charge is not necessarily exactly 4 KiB.
One controller can still exhaust the ordinary allowance.
The 1 MiB retirement reserve remains separate.
S10 request `af11896e` owns row release and controller shares after S4 and the identifier cutover.
This repair does not remove that residual limit.

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
At the first review source, the ten other owner files matched `1674484d` in Git.
At that source, `hosted.ts` matched `3211339e` in Git.
This is historical source-inventory provenance, not proof of the changed repair inputs.
The first repair producer returned 11 records at `58bb8c24` under END `c2af7f22`.
Its whole-service record was unused because this owner requires a complete named inventory.
The adoption check refused before writing a file or making a commit.
Correction START `5a7a6b79` retracts the premature five-change claim in that first END.
The named-service producer then returned 35 records under END `8e5ae304`.
Together with the ten applicable first-producer records, the corrected set contains 45 records: 5 changed and 40 unchanged.
Commit `d203edf6` adopted those five literal updates.
The unused whole-service record and the correction remain in the provenance.

The repair gate at `e708f454` completed under END `388965df` with literal exit 1.
All prechecks and typecheck passed.
Kernel, Node, Counting, and Plain each exited 0.
Node reported 169 tests passed.
Counting reported 56 tests passed.
Plain reported 4,545 tests passed and 1 test skipped.
Native reported 1,131 tests passed, 1 test failed, and 2 tests skipped in 1,134 tests.
Only the H6 matrix failed.
Its held response body crossed a Durable Object context at the `result` read on line 2299, called from line 2338.

Commit `e4051271` changes only that test fixture with six added lines and three removed lines.
It materializes the held response body inside the original `room.wait`, observes rejection, and joins the same pending operation before cleanup.
Assertions and deadlines remain.
Production, configuration, shared helpers, and dependencies remain exact to the failed gate source.
The isolated follow-up ran only the affected MCP scope compiler and the whole Hosted owner.
Both literal exits are 0, with empty stderr.
All 24 Hosted tests passed, including H6, with no skips or failures.
START `2d7b6c89` and END `62722920` identify that follow-up.
All gate stages had run, so no other owner, stage, or whole gate repeated.
The checker assesses this isolated follow-up under `docs/evidence-filing.md`.
The failed gate remains exit 1.

## Evidence

### Current repair cycle

The [repair manifest](evidence/2026-11-12-hosted-mcp-s4-repair.manifest.json) indexes the repair originals and curated provenance.
Raw working output remains plain in its original location.
The first manifest stays unchanged at 40,892 bytes, SHA `0127117b742a097f7e07f276763e7de1f608cbb76b5d0a7d71e4e056f46cb467`.
Old failures retain their actual exits.
No repeated owner observations form a synthetic combined pass.

| Repair check | Actual source and command | Actual outcome | Original reference |
|---|---|---|---|
| Initial repair working checks | `d203edf6`; retained reproduction commands | 13 compilers exited 0; 37 tests included 36 passes and 1 obsolete counter-lookup failure | `repair-working-d203edf6/witnesses.report.json`, SHA `114967081b91891d04d6c17dd9a2b1cd6ee002f44dde2bdfcd3dbf0c2e7fa8ca` |
| Unaffected OAuth and visibility owners | `d203edf6`; whole owners | 7 OAuth tests and 6 view tests passed at this head | Same original report; not new-head observations |
| Corrected working continuation | `122c828c`; compiler 18, Hosted, inventory, source-entry, and five ordinary checks | All 9 commands exited 0; Hosted 24 tests, inventory 5 tests, and source-entry 12 tests passed | `repair-working-continuation-122c828c/hosted.report.json`, SHA `67a45abd6d8c3762a84cf118c83817e39021f9de3ec20a21ace26c16befbf602`; START `6e039322`; END `a633b775` |
| First maintained producer | `58bb8c24`; maintained seal functions | 0; 11 records, including 1 unused whole-service record; adoption refused before writes | `repair-maintained-seals-58bb8c24/actual.json`, SHA `9ee611a2d02abe17750838c969995c0e20ff467e380a4ff0006dbd030f9a9c7c` |
| Named service producer | `58bb8c24`; maintained named seals | 0; 35 records; combined applicable set has 5 changed and 40 unchanged records | `repair-service-named-seals-58bb8c24/actual.json`, SHA `f5971dae458e6b8ddeb3e9a917e66e2f292afa08c37f257725176aa8212fb20e` |
| Address and forwarding negative | Whole Hosted and OAuth Native owners on `6352d355` | 1; 29 tests passed and 2 intended failures in 31 tests; create and retire returned `[429,429]` instead of `[201,202]`; address argument was `undefined` instead of `203.0.113.45` | `address-negative-6352d355/owner.report.json`, SHA `c755d74249489913d5b478b01a772bce1e54462fc0ee96e807067106ea253f53` |
| Credential visibility negative | Whole visibility owner on `6352d355` | 1; 5 tests passed and 1 intended failure in 6 tests; credential visibility was `undefined` instead of `["model"]`; this earlier failure masked the diff red | `visibility-negative-6352d355/owner.report.json`, SHA `b8c652efd73fb00301ca77240b93136fce50143fb953db35382136264a82fc2c` |
| Fresh whole gate | `npm run gate`, `e708f454` | 1; only the H6 matrix failed in Native | `repair-gate-e708f454/gate.stdout`, SHA `9aa5957724f5f88f6fd81d438bd51393f1cb3b39d81b55beea16db97fd36561f`; END `388965df` |
| Isolated H6 follow-up | MCP scope compiler and whole Hosted owner, `e4051271` | Both exits 0; 24 tests passed; no failures or skips | `h6-followup-e4051271/owner.report.json`, SHA `0d30295ccfc5f0039cf20cb2d9dbc5aecdb4881c0ff90e3be668055d9b8918a1`; END `62722920` |
| Page source correspondence | `git diff --name-only 77ac8113 e4051271`, read against `.github/workflows/page-browser.yml` | Same 12 changed paths; 0 filter matches; retain Page run 43274401664 under `a8d2f83d` | Prior Page source receipt plus the one-file fixture delta; final source binding still owed |
| Card push CI | Same source push | **PENDING** | **PENDING** |

Ruling `3ae8a396` requires a fresh gate and repair CI evidence.
Ruling `a8d2f83d` retains Page run 43274401664 from `77ac8113` when no Page-filter input differs.
The command is `git diff --name-only 77ac8113 e4051271`, read against `.github/workflows/page-browser.yml`.
All 12 changed paths at `e708f454` fall outside that workflow's two path lists.
The sole later change at `e4051271` is the Hosted fixture, which also matches neither list.
The note and repair manifest also match neither list.
Final source and document-only tree correspondence remains owed.
No Page dispatch or trigger-only edit is permitted.
The changed service selects Card on push, so its new actual run remains owed.
Earlier baseline, association, and Transport records keep their original heads and qualifications.
A changed witness owner needs its actual source correspondence and required current evidence.
The prior-negative correspondence receipt is source reasoning only.
Ruling `0528fc25` retains the eight baseline reds, association control, and Transport records under their own heads and source qualifications.
The aggregate-budget case is one of those eight reds.
Its baseline failure checks eighteen read-only listings and the subsequent create.
The later `keyCalls` declaration and changed counter reads cannot execute before that deciding assertion.
The source prefix before the declaration stays byte-exact from `6352d355` to `e708f454`.
The preserved baseline backport contains no `keyCalls` identifier.
The item 1 source-order proof indexed by the repair manifest records that reasoning; its SHA is `9b12b0046926637cb42a3769b73f9205fc5a7c5b60648cfe8178ec047e162ef4`.
No historical result becomes a result of the current head.

Ruling `63368b81` also governs preservation of the repair gate internals.
One rename moved `/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.QV1wyDYMMp` to `~/play/artroom-evidence/2026-11-12-s4-repair-gate-e708f454/internals`.
The original `internals-preservation.json` records exact device, inode, mode, size, and hash correspondence for all 34 entries.
No raw copy or seal occurred.

### First review cycle: historical

The [first-cycle manifest](evidence/2026-11-12-hosted-mcp-s4.manifest.json) indexes unchanged plain originals.
It is curated provenance, not raw output.
Its source checkpoint is `fe6fa9e7`, tree `a80d999cb8ffcadd985dce0f40d71ae4e6f96a21`.
Every row keeps the head that actually ran.
Counts come from the original reports, without adding repeated owner observations into a combined pass.

Commands below document reproduction, rather than claim a complete original argv receipt.
`V(P, F)` denotes `node node_modules/vitest/vitest.mjs run --config vitest.config.ts --project P F`.
The recipe run also retained the default and JSON reporters; its literal command appears in the manifest.
The manifest retains START and END identifiers, original stream and report references, and literal exit-file references.
Native scale omission came from the unchanged gate selection, `outside-scale-paths`; no worker or test deadline override applied.
All output paths below start with `~/play/artroom-evidence/2026-11-12-s4-`.

| Check | Command and checkpoint | Actual exit and result | Original output |
|---|---|---|---|
| Whole gate | `npm run gate`, `12c24841` | 1; Node 166 tests passed, 3 tests failed | `gate-12c24841/gate.stdout`, SHA `a010b64cd56600b83a37a328903339584e8aa114ea3240e8078ff5cdec54856c` |
| Repaired Node owner | `node --test apps/views/test/s4.test.mjs`, `7c0fcc3b` | 0; 26 tests passed | `gate-followup-7c0fcc3b/node.stdout`, SHA `8f5c2f6d0c5042f3eed237caf097a70cc7daab749ba6292befb73660a9a2b0e0` |
| Counting | `node apps/counter/scripts/test-browser.mjs`, `7c0fcc3b` | 0; 56 tests passed | `gate-followup-7c0fcc3b/counting.stdout`, SHA `2f8e848b35e5c12fcb450622d121b18d3eba42cf036dcfd102b344340188a99a` |
| Plain | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts`, `7c0fcc3b` | 1; 4,544 tests passed, 1 test failed, 1 test skipped | `gate-followup-7c0fcc3b/plain.stdout`, SHA `2de74e18fc480d8df03fd12fb8ecd924f286e65b6c92545502741659356e82bc` |
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
| Document checks | Whitespace; commit messages; JSON format; links; notes, `77ac8113`; commands in manifest | Five actual exits 0; 27 commit messages; 1,244 local links; 0 broken links; 0 note warnings | `doc-checks-77ac8113/links.stdout`, SHA `f90b71f006cb2174e66220512f6ab350d3d652d6dba486bead8397799324dd9c` |
| Page push CI | [43274401664](https://github.com/generalbusiness-ai/dap/actions/runs/43274401664), push attempt 1 at `77ac8113` | Success; all 12 GitHub steps succeeded | `push-ci-77ac8113/page-job-verbatim.log`, SHA `1232a2bba2c3ac42e95dbfc3bb7ad6be3d0830cf53b5e900dccc7afa86bace47` |
| Card push CI | [43274401667](https://github.com/generalbusiness-ai/dap/actions/runs/43274401667), push attempt 1 at `77ac8113` | Success; all 14 GitHub steps succeeded | `push-ci-77ac8113/card-job-verbatim.log`, SHA `7dbe64881a94ae070f36b037c7206c68a7567c336dc9180fc13fb2151e16cf04` |

Planner ruling `63368b81` authorized one preservation rename of the gate internals.
The old path was `/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.B7C5Syb8Cc`.
The current path is `~/play/artroom-evidence/2026-11-12-s4-gate-12c24841/internals`.
Root act `f059af51` records unchanged inode identity, modes, and bytes for all 30 entries.
These internals show the failed gate and supply no acceptance claim.

The push checked source head `77ac811360192d76945a24a1c30568e9dfccae1b`, tree `489b1b24db7f80d24cb06ab37406d454f8a984c9`.
The `6352d355` documentation follow-up changed only its note and manifest; every other path then equalled that CI source tree.
That historical post-commit correspondence receipt at `~/play/artroom-evidence/2026-11-12-s4-final-document-correspondence.json` records both actual trees and the exact two-path difference.
The historical review request names those trees.
The current production repair cannot use that correspondence as its CI proof.
The first Card log retrieval exited 1 because the CLI refused ANSI bytes.
The explicit verbatim capture exited 0 and retained the original bytes.
GitHub reports successful steps; those statuses do not supply separate numeric child-exit receipts.

## Open limits and owners

- S4 request `9a053402` requires the new Card push result, final source correspondence, checker review of the failed gate and isolated follow-up, and landing.
  Checker `6fbde9b8` accepted the earlier isolated follow-up chain for `fe6fa9e7` but requested this repair.
- External host enforcement remains **UNKNOWN** under S4 request `9a053402` and ruling `ec9ba020`.
  Card browser CI does not establish the four external hosts' behavior.
- Rulings `3ec2bcad` and `3a5c4448` governed the two successful historical push runs and their document-only record.
  No workflow dispatch ran in that historical cycle.
  The repair needs its own source push and Card observation before a document-only CI record under `3a5c4448`.
  Ruling `a8d2f83d` retains Page evidence subject to the final path-filter comparison.
- Failed focused windows retain ENDs `c08c82fc`, `b15604a3`, `e6dc87ef`, and `c57544cd`.
  The Native working failure under END `a1f16270` also remains an original failure.
  Later success does not rewrite these failures.
- S10 request `af11896e` owns controller shares and retained-charge release after S4 and cutover.
  S10 must land before hosted MCP opens for rooms with unknown members.
- S4 request `9a053402` keeps hosted MCP disabled until the reviewed head lands.
  This note authorizes no Worker configuration change or live O4 window.
