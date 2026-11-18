# Custody imports and file-store contention

Custody callers now import the client directly. A real two-process witness
checks the kept envelope after a dispatch-lease refusal, and the retired-browser
message no longer claims that an old envelope never left.

NF6 request `9ca6177725e71bab1741ea8dd8c5ad63401e855d`, promise
`60680427a8544dfea8a1db24d3cd512974bf16d9`, and ruling `cb6e8523`
remove NF3's temporary MCP custody aliases after NF5. NF8 request
`0a0da4cad3b711da66c559675ca42ec13dad1a8d` and promise
`d549e07995dd20b90aaf9171d9dbe77de142bb75` add the contention witness
and correct the retired-browser wording from review `b6e9f538`.

The original source starts at actual NF5 main
`57f887ce066448133d0bd0fe611d0935cc6eb0ed`, tree
`5ad88394b9dfc03ec2be385239ffff63d58900e9`.
Fresh branch `builder/nf6-nf8-on-c3-sh1-source-20261115` preserves NF6/NF8
head `bd4ce55857d5158b8be76f581a5d6da7c7587b3a` and merges actual C3/SH1
main `4b198d0fc980327d87347b05a3817106974bf8d7` in
`43d2772`. The normal merge has no conflicts. The three overlapping paths
are additive: `docs/cli.md` retains the lease advice and signed/open-version
policy; `browser-request.ts` retains both independent changes; MCP's
`errors.test.ts` keeps the direct client imports and incoming whole witness.
Old worktrees, refs, dependency views, and evidence remain intact.
At that integration checkpoint, the source was **UNCOMPILED and UNRUN**.
The MCP index seal, canonical comparison, development, browser checks and
gate were still owed; the current evidence below records later results.
No dependency copy, import, AST computation, or project check accompanies
this integration. No release identifier or packet changes.

## Published tooling and FH-2 source composition

Origin act `8995ec247402c4c504fcdbf580a6e9171b5d5547` names published main
`17a917cd73b0528dcf8d2610707c1b3f24afbeaa`. Normal merge
`62205ca2193a9c6ec23579dfc5ae236b5712f52d` takes that actual main on
preserved NF6/NF8 source `1bd8a2c76eaaef18686ba592163b8474d2de5cef`.
Normal merge `16cf270d3b3566f8d90add8e644323f9b1ca8f59` then takes reviewed
FH-2 source `2ccff00a418494b0a85e9215cfab235b302293cd`.
Neither merge has a conflict. The 61 NF paths overlap neither the 22 incoming
tooling paths nor the six FH-2 paths. FH-2 starts at that tooling main and
keeps its intended conditional-check changes.

FH-2 request `efdebe55` and promise `8d8c4c3f` ride this combined head;
[its note](2026-11-15-fh2-staged-hook-checks.md) retains the source boundary.
All three requests keep their separate promises. The existing authentic
8b2 dependency view stays in place; all 17 package/lock metadata files
retain their setup bytes. This composition copies or installs nothing.
At that composition checkpoint, the MCP index expectation remained
untouched. Its computation/adoption, combined development, canonical
comparison, browser checks, gate and review were UNRUN. Hook activation stays with
the planner after landing.

## One home for the custody names

NF6 removes the 35 obsolete NF3 names: 16 root values, 12 root types,
five Node values and two Node types. Their 52 import sites across 50
consumer files now use `@generalbusiness/dap-client` or its `/node`
entry directly. Mixed imports keep their MCP service names, local
aliases, type-only status and dynamic-import behavior. The real NF5
Native custody adapter stays in place.

The MCP SQLite module also drops its otherwise-unused `OUTCOMES_INLINE`
import and re-export. Leaving that export behind would preserve the alias
through MCP's export-star. No SQLite statement or storage behavior
changes. NF4's `Reads`, `ReadSessions` and `ReadPort` remain outside NF6.
MCP's Node entry keeps its actual local `fileStore` import and service
wiring. The NF3 note retains its historical results and names NF6 as the
alias-removal lane.

At the original source checkpoint, the MCP index seal was **OWED** and
its expectation in `scripts/security-entry-points.test.mjs` stayed
untouched. The later reviewed calculation, narrow adoption and whole
security-owner result appear in the current evidence table.

## A send can stop at the shared lease

NF5's `Custody.#dispatch` enters the store's existing exclusive section
before invoking delivery. The Node file store uses `capacity.lease` there.
If a live process holds it beyond the existing ten-second wait, custody
throws `locked` after the envelope was persisted as `sent`. That phase
does not prove delivery or an outcome.

One added case in `packages/client/test/custody.test.ts` uses an actual
parent process and child sharing one real file store. A delegated write
first persists `sent`, then starts the child and waits for its ready
line from inside real `store.exclusive`. The parent reaches the unchanged
production dispatch fence and lease timeout. The source asserts locked,
zero deliveries, one build, one signing, no outcomes, and unchanged full
envelope bytes. The child holds until a stdin release message, not an
arbitrary sleep. Existing child modes keep their behavior. The parent
waits for child stream closure before reading the final captured output.

After release, a new Custody instance reopens the same store and uses the
ordinary same-key, same-meaning send path. Its builder throws if called.
The delivery must receive exactly the kept full-envelope bytes once.
A terminal repeat must return the kept accepted answer without building
or delivering again. Finally blocks restore the delegated write and
release/reap the child. The production lease wait, lock/reclaim rules,
Custody implementation and file-store implementation do not change.

The fixture uses a real TEST signature and scripted acceptance, as the
existing custody owner states. It tests real process and file contention,
Custody dispatch and recovery, not a remote scope's acceptance, HTTP
transport, browser durability or hosted authority. Any observed lost or
doubled send must go to the planner before a lock-rule change or an
assertion change. Source review alone supplies no such runtime result.

`docs/cli.md` explains the retained application-install `--request` path;
it does not generalize retry advice to generic commands that sign again.
`docs/mcp.md` explains that shared capacity contention can produce the
current locked words even when another identity holds the lease. Both
preserve the original home, key and arguments. Settle reads an outcome;
an ordinary retry sends the kept envelope. A phase, deadline or lease
time supplies no permission to discard records or remove a living lock.

## Retirement words describe what is known

`RETIRED_REQUEST` still says that the room retired and the browser removed
its old request slot. It drops only “Nothing was sent.” A legacy sent or
unknown envelope may already have left before cutover. The existing join
retirement case now carries both phases, keeps the clear and no-current-
send assertions, and still permits a fresh invitation afterward. Counter
and Lending reuse the same constant. No record migrates or changes shape.

## Current R integration and development results

The earlier sections describe their dated source-only checkpoints. Normal
merge `f84528d3e935fc955c9c998d8b44d39da688e020` takes actual R/E1 main
`c6711b53a368d24c1fad2830ea5634c045999ce1` while preserving both reviewed
client-memoryStore import resolutions and all incoming test bodies.

Planner `c168799e37d1052a7199d29506e57649d6c5c2bd` requires the first
post-signing change to open authored Lending and Counter 0.4.0. Their signed
0.3.0 packets remain immutable. The existing version-conditional reproduction
policy stays intact. Planner `8228f48165d0f0cdb09dcfde3316a19b60cb402d`
assigns these six resulting paths to NF6 once:

- `examples/lending/package.ts`
- `examples/lending/dap.application.json`
- `examples/lending/release-identifiers.json`
- `apps/counter/package.ts`
- `apps/counter/dap.application.json`
- `apps/counter/release-identifiers.json`

The five-promise partition is NF6 62, NF8 6, FH2 6, SD1 5 and LC2 9 paths.
NF6 owns this common report and the whole archive-installed.fixture.ts artifact,
including SD1's two deadline wrappers. SD1 cites that actual NF6 artifact after
filing rather than duplicating it. NF8's distinct report is the whole
custody.test.ts artifact; the three other requests keep their existing notes.

The first NF comparison at f84528d3 exited 0 in 2.715588042 s but found
Lending/Counter presentation drift against signed 0.3.0. The STOP under
`a7f24240fc3d79a7f6b38652407832ad31a20a14` led to c168799e, rather than
changing a signed packet. After the four version raises, normal comparison
and apply END `3f54a4e6fe4c760b42fc09b41add62fd0c08b7b7` records the
measured 0.4.0 tuples. Comparison exited 0 in 1.930009459 s; apply exited 0
in 0.251189125 s. Commit
`18f119c22a545afc8f63a61ee20545c993fb765d`, tree
`b1bc269a87c28afcee935687eefa71041e6a278d`, changes only the two measured
presentation fields. Grow, every entry, every definition and every semantic
identifier stay exact; the other 4,899 tracked entries match d74faace.
Lending presentation is
`sha256:d78b401aea6982c17a79532228236dfa64d234b73693153d0f8dcb9264a2bbed`;
Counter is
`sha256:a1d387bf8110d3612aad71ef0c84cf3457753b7c759955a39bb2cd535cce7586`.
The old “NF5 Grow identifiers changed:false” apply label is legacy output,
not a new NF5 run. Both streams retain only the module.register deprecation
warning. Neither signed packet, signature or trust changed in that commit.

The maintained whole-module MCP index calculation at 20caa2d4 returned
`95ab1f1ddd97466f7de1322a5cb1fbbef4172dd4b281bc7ce9b1a58e8e5e3f36`.
Commit 27e01659 adopts only that existing expectation row. The source-seal
value is the normalized AST result, not a raw-file digest. Incoming E1 judge
and expected rows remain exact. Whole Security then passes all 12 cases;
its stdout retains one stripTypeScriptTypes experimental warning and stderr
is empty. Passing that owner does not supply checker's independent Security
conclusion.

Current development results bind clean source
`27e0165938ec563420c1fecce6364d11c14f4afb`, tree
`66ccd762db65d34a8f9e95f59071984a32c2c7be`. Main and origin were
`c6711b53a368d24c1fad2830ea5634c045999ce1`.
The full gate passed under END `9d48f8f053c936598e8de3d441ed9b5e08c2241c`.
The local Page/Card browser interval passed all twelve steps under START
`1487c651e724953c67149527286eea494bb3ca68` and END
`9264fbca49df5a75c004929c7e7ae18f3521be00`. All steps exited 0 with no error or
unreached step. The 26 source guards matched the same clean head, tree and main;
all children terminated and root reaped session 89290. The outer wall was
257.253067459 s. `D=E/2026-11-15-nf-browser-27e0165938ec-attempt1` retains the
safe outputs and actual argv in `D/result.json` — `a498ca9d34370a74ed4e32849a1c095d420d1604d1fbf7b236b730d100c88f66`.
Browser scripts ran locally on macOS at this head. The Linux workflows have
not run at this head.

`E=artroom-evidence`;
`B=E/2026-11-15-nf-lc2-bounded-owners-attempt1`,
`T=E/2026-11-15-nf-lc2-exact-head-preflight-attempt1`,
`S=E/2026-11-15-nf-lc2-security-owner-attempt1`,
`P=E/2026-11-15-nf-lc2-page-assets-owner-attempt1`,
`I=E/2026-11-15-nf-open04-compare-only-attempt1`,
`M=E/2026-11-15-nf-lc2-mcp-index-source-seal-attempt1`,
`G=E/2026-11-15-nf6-nf8-fh2-sd1-lc2-full-gate-attempt1`,
`F=G/controls/fh2` and `L=G/controls/lc2`.
Exact argv/cwd/exits/walls remain in each result.json. The control copies
retain the original digests and child reports; originals remain intact.

The seven bounded commands pass serially under their normal configs, worker
limits and deadlines. The 31-case custody owner includes the actual second-
process dispatch-lease case, which passes in 10,741.589334 ms. Recovery sends
the same kept bytes once; a later terminal repeat does not deliver again.
The 10-case browser-joining owner retains the sent/unknown retirement cases
and the separate truly unsigned case. These are actual owned-process/store
and scripted-acceptance boundaries, not remote acceptance, browser durability
or proof of every schedule. No lock rule, runtime port, unsent category or
bounded model changed.

The LC2 baseline passes the one whole reproduction case at matching candidate
and detached-scratch source. It supplies that required owner once. The two
subsequent failures are intended REDs, not passing runs: missing packet row
at 71:8, then the equal-version guard's “Raise the version” assertion at
90:184. The latter restores both Lending version literals to 0.3.0 and uses
the retained measured NF03 f99 tuple, preserving the earlier source assertion;
Counter remains 0.4.0. No new producer, synthetic expected value, packet edit
or assertion change supplied the RED. Root's END classifies the actual reports;
the controller's CAPTURED_FOR_ROOT_REVIEW status alone supplies no verdict.
All four fault files and 0644 modes restore exactly. Both source checkouts
remain clean; no third green ran.

FH2's separate maintained control baseline passes all five whole Git-hook
cases. The sole if(true) fault then produces four passes and the direct named
Markdown-only failure: the real scratch Git commit refuses missing Prettier,
so accepted.status is 1 rather than 0. It changes no shared-hook activation.
The helper and raw TAP retain their original classification and deadlines;
all source bytes and 0644 modes restore. No third green ran.

## Dated source-only checkpoint and current evidence

The first seven rows preserve the original source-only checkpoint's UNRUN
status. Current rows follow them; later development does not relabel an old
checkpoint. The actual current raw records establish their stated boundaries.

| Check | Owning boundary | Result |
|---|---|---|
| Compilers | Actual affected client, MCP, scope, CLI, page, view and example contexts after source review | UNRUN |
| File-store witness | Whole client `custody.test.ts`, including its real child | UNRUN |
| Retirement wording | Whole client `browser-joining.test.ts` | UNRUN |
| NF6 callers | Owning MCP, Native scope/CLI/page and maintained Node example owners from the reviewed inventory | UNRUN |
| Browser helper callers | Existing declared-member and owned-scope workflows | UNRUN |
| MCP entry seal | Root's later reviewed source computation/adoption, then whole security owner | OWED; UNRUN |
| Final gate and review | One combined head at its permitted queue position | UNRUN |
| Normal open-0.4 comparison and apply, END 3f54a4e6fe4c760b42fc09b41add62fd0c08b7b7 | Existing normal producer at d74faace, then retained-candidate apply | Comparison exit 0 in 1.930009459 s; apply exit 0 in 0.251189125 s. Only two measured presentation fields change in 18f119c2; Grow/entries/definitions/semantics exact. `I/result.json` — `13d4f87fe24e774075c48ba540e2d851e5074d8beedfb7458b3bac11bace86c4`; `I/preparation/comparison.json` — `fe0405c6852af90f24b0fa4e37d1c3141ae25aa5e944780049462eb86c6bc0e3`; actual apply record `I/apply-result.json` |
| MCP index calculation and one-row adoption, END b1b15c5d9fa3047fe824d3cb9296a2281d9d93b0 | Maintained sourceSeal API at 20caa2d4; only existing expectation adopted in 27e01659 | Exit 0 in 0.622955292 s; actual normalized AST value 95ab1f1ddd97466f7de1322a5cb1fbbef4172dd4b281bc7ce9b1a58e8e5e3f36. No second calculation or bulk refresh. `M/result.json` — `5b32773466cce319fe92a1e576664ccb1a34bfd67c804893c37f1a9b052db864`; stdout `39651cdca83a7c108a464924a71a959e93bb622aa783888e4f103a37750109a1`, stderr `ddf4f1f59c0ce4c738c93826f6318138b76a8f27b9a8c07d629709474458c286` retain module.register and stripTypeScriptTypes warnings |
| Current exact-head preflight, END 7300a4c1361c600fdbc52f8da3f360b4e703bd2b | Fetch, shared helpers, WHOLE npm typecheck once at 27e | All 0; 0.283590583, 0.596663333 and 16.459192000 s; outer 17.551862333 s. `T/helpers.stdout.log` — `af00848d1b94433533085adfecd184e68584914cce159b58ead29f4dab584502`; `T/typecheck.stdout.log` — `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a` |
| Current whole Security, END 966cb7daf2c9d6e15ae7045d4e883d5a54d0ed70 | `node --test scripts/security-entry-points.test.mjs` | 0; 12 PASS, 3.886222833 s; no failure/skip/todo. `S/stdout.tap` — `a615f2ab428c653583b8f086e3d84bc13f1e5dc20d4b87d251f072abdb523da0` |
| Current whole Page assets, END db69671cea75bf65ccda726e45659ded39024f02 | Compatibility, then complete actual assets owner | Both 0; compat 0.080366667 s/copied:false/cd50 unchanged; owner 1 passed in 0.994253500 s; outer 1.213191917 s. Maintained write:false producer, assets equal, no separate producer/write. `P/result.json` — `3834d38151cf1c99f47b5ae855400558660f198448f22ab1098631fe4a4680fa`; `P/page-assets.json` — `dd26fcd27c8c079b57114d070eab201e2e63d6093c579bbdfab617eda8d60711` |
| Current Scale registration/selection guard | Whole scripts/scale-selection.test.mjs | 0; 7 passed in 0.620228666 s. `B/scale-selection.stdout.log` — `7237a1cfbdcf51b86b6ff7ce11a34c7a20bb559c53130d5a7c2bafcb625f4582`; no Native fixture executes in these source-string witnesses |
| Current shared-helper owner | Whole scripts/check-shared-helpers.test.mjs | 0; 2 passed in 0.153247916 s. `B/helpers-owner.stdout.log` — `84e3cf7664b1bce6660249020c850218027c92cab4a3356f8e13fcb65f0962a8` |
| Current dynamic MJS consumers | Whole views decision, commons-bill witness and repo-in-ai session owners | 0; 13 passed in 4.810192041 s. `B/dynamic-mjs.stdout.log` — `53108f6362e15e228d63ce35443d8793e1a6fea144bac0e8006a6b0aa5178143` |
| Current formatter owner | Whole scripts/format-json.test.mjs | 0; 1 passed in 0.158079084 s. `B/formatter-owner.stdout.log` — `394cdc9e97c28e2a264115ddedea53f42f3bce14447ec6cb4f75dfac27df1e27` |
| Current file-store/retirement owners | Whole client custody.test.ts and browser-joining.test.ts | 0; 31 custody and 10 joining cases passed in 25.058655708 s. `B/client-owners.stdout.log` — `13a87c696b5383f6b48ec73f90272c8a86b5b218da2ebe612fb3be45e19ac223`; native JSON in `B/client-owners.json` |
| Current MCP caller | Whole MCP errors.test.ts | 0; 20 passed in 1.244440250 s. `B/mcp-errors.stdout.log` — `45c3686b0cbbf00c2e660c46ba3c8b92971c50c6fc11abf3d4ac950f5a14b675` |
| Current CLI examples/configuration | Whole application-examples.test.ts and demo-config.test.ts | 0; 3 examples and 6 configuration cases passed in 6.366250250 s. `B/cli-examples-config.stdout.log` — `0290ce6d17e3bb0537071b9847bf4ba6c9bdd27f040b767185f5eafe100e32f6` |
| Seven bounded-command aggregate, END d7aa80aacaf11222cd00a70ffc8c16a0d8de9e51 | Exact argv in B/result.json, seven serial whole-owner commands | All 0; outer 38.901086833 s, zero failed/pending/skip/todo, all stderr empty; children reaped, clean source unchanged. `B/result.json` — `72873a8a8c7a59696012025889435bb2ed567f5b3486f909d9cf82eff5b10b23` |
| LC2 baseline and both distinguishing REDs, END 60571fe4556bcccb2dc00d41f483af779256fe8c | Whole one-case reproduction owner once baseline and once for each fault | Baseline: 1 passed, exit 0 in 3.271128208 s. Missing-row: 1 failed, exit 1 in 2.310296958 s at 71:8. Signed-version: 1 failed, exit 1 in 2.446507709 s at 90:184; outer 10.768153000 s, no signal, exact restore. `L/result.json` — `6620eaad8d1644288f54ac7ebbbdc1c23df4100e51ab531317dc584dabc741ac`; baseline JSON `180ea88dfcea98e4b607cdc9e4de5644102035e93e712b25c2c86f0da6644630`, missing-row `8fe0d653f4d9efc91d3709aa434d74b39308c7dd53d3ca9e6c237b8c1f291b3f`, signed-version `b76bbb6c1135952572069a23bde3cb5c2ee819a6472df271a848f5a4d48bbe9f` |
| FH2 control, END efcb650949bc154ed5156b62a196a7fc86613a73 | Retention-only maintained helper, whole five-case Git-hooks owner | Exit 0, DISTINGUISHES in 9.175240458 s; baseline 5 passed, mutant 4 passed and 1 direct AssertionError at 117:10; no timeout/skip/todo, exact restore. `F/result.json` — `2451458b5f930db7b6b6653cf2b6c4d9c8968bebc6acda1086794ee68ba05d5b`; helper stderr `7b4465ad7ff1abf6f124279339368636326ccfc905d672c26494a4bb750dff01` |
| Full combined gate, END 9d48f8f053c936598e8de3d441ed9b5e08c2241c | One normal npm run gate at unchanged 27e01659/tree 66ccd762, main/origin c6711b53 | Exit 0; child wall 1620.579566916 s, outer wall 1620.829315250 s; no signal/spawn/controller error, children reaped. Node 202 passed; Counting 56 passed; Plain 4858 passed/1 skipped; Native 1158 passed/2 skipped. `G/gate.log` — `44a9865875f439993459f0f78655acc3475b54615a65b838ec78aae452f2daf9`; `G/result.json` — `2586c1eaaf03602b6ee983d43e0ad8ff66fe8972517006125d9b266eaf0476e6` |
| Gate Scale and timing boundary | Natural all/changed-scale-path; actual 22 passing cases across 13 whole owners | Native wall 1282098.070041 ms includes Scale; no separate Scale-only wall exists. The 1528492 ms module-duration sum is concurrent, not wall. Terminal records for all four test stages complete; scope-stories remains partial with 129 unknown/suite observations and zero contradictions. Raw `G/stage-logs/test-evidence/stages.json`, `scale-selection.json` and `native.jsonl` |
| Local browser step: page-screens | `node apps/room/page/test/screens.mjs` | Exit 0; 17.529864917 s. `D/page-screens/checks.json` — `21f68e71dfda95f6954db5c7562da0590451607190cc65c5a9b112d6770112f0` |
| Local browser step: demo-captures | `node --import tsx --no-warnings scripts/demo-captures.ts --recorded --out C/demo-captures` | Exit 0; 36.755955958 s. `D/demo-captures/checks.json` — `d17031032f93fa5a6c263678574c427f16e1654b33b26aa86207fd58053db7de` |
| Local browser step: claim-witness | `node --import tsx --no-warnings scripts/demo-captures.ts --recorded --claim-witness --out C/claim-witness` | Exit 0; 36.829022709 s. `D/claim-witness/claim-checks.json` — `8e052f71f47afb6d5fa89a0bf7395819af782d8e40ac3b23f80f111925035ecc` |
| Local browser step: label-witness | `node --import tsx --no-warnings scripts/demo-captures.ts --recorded --label-witness --out C/label-witness` | Exit 0; 36.874369625 s. `D/label-witness/label-checks.json` — `f69fc18ab99b518b6ce312dadefbfe43387ea405f9a89e4c75fd399a51db98c1` |
| Local browser step: card-producer | `node packages/mcp/scripts/views.mjs` | Exit 0; 0.093766542 s. `D/card-producer.stdout.log` — `4c1a2bf8e5b091d5863efe0cc2cf5d90d6a143c4b74b92e4180559d59bca58f9` |
| Local browser step: card-equality | `git diff --exit-code -- packages/mcp/src/views/generated.ts` | Exit 0; 0.008272167 s. `D/card-equality.stdout.log` — `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Local browser step: card-compatibility | `node scripts/cloudflare-pool-compat.mjs` | Exit 0; 0.081959542 s. `D/card-compatibility.stdout.log` — `cfe75b41014176b8c76fbc2b5807e38e83dca0ed3547f50f4e253bca1c72d55f` |
| Local browser step: views-browser | `node --import tsx packages/mcp/test/views-browser.mjs` | Exit 0; 64.819457584 s. `D/views-browser/safe-summary.json` — `93b7db504f663f4609570546927c6804f99b823a07436c8a27d945d334675fde` |
| Local browser step: declared-views-browser | `node --import tsx packages/mcp/test/declared-views-browser.mjs` | Exit 0; 5.730823625 s. `D/declared-views-browser/report.json` — `06022993083560614bf51f203bd8e53c5ab3bb05be9e6368932c3ae8c43ed099` |
| Local browser step: owned-scopes-browser | `node --import tsx packages/mcp/test/owned-scopes-browser.mjs` | Exit 0; 3.970795000 s. `D/owned-scopes-browser/report.json` — `e7ba27ef94d0761bf28dd021d35e6dbef2702f095183e7361acefb3f190b48a7` |
| Local browser step: grow-routing-browser | `node --import tsx packages/mcp/test/grow-routing-browser.mjs` | Exit 0; 50.714177375 s. `D/grow-routing-browser/report.json` — `8c3d5efbc6c60590d60a2f9bfb218dd76fcc7b18d6b02bbda6761a878c76a9e7` |
| Local browser step: declared-members-browser | `node --import tsx packages/mcp/test/declared-members-browser.mjs` | Exit 0; 2.331537000 s. `D/declared-members-browser/report.json` — `79296828485e6d209323c52021397e76194895c4022b31699bc1d4760a01c4b7` |
| Local browser completion, END 9264fbca49df5a75c004929c7e7ae18f3521be00 | Nine browser commands, producer, equality and compatibility; source unchanged | All twelve steps exited 0; outer 257.253067459 s; 26 exact source guards, no errors or unreached steps, all children reaped. `D/result.json` — `a498ca9d34370a74ed4e32849a1c095d420d1604d1fbf7b236b730d100c88f66`; `D/safe-export.json` — `13b72f5ddc27ba877be22239d2e4ead1cc293b1725b2b1607bccf65035e27e08` |

The normal gate passed once. Kernel, every static/typecheck/definition-pin
stage and every other pre-test check passed; notes reported zero warnings.
Installation skipped on the genuine matching dependency stamp. The log starts
at the exact clean head/tree and ends gate passed. Root retained the reported
stage tree, six generated Counting witness files and the 17 explicit safe
LC2/FH2 control records without changing originals. No worker, instrumentation
or deadline override supplied the result.

Independent checker and Security conclusions, landing and publication
remain owed. Local gate success establishes no hosted
installation, provider, physical-room or deployment outcome.

## Local browser results and limits

The twelve table commands ran in the NF worktree. `node` means
`/opt/homebrew/bin/node`; `C=/private/tmp/artroom-nf-browser-27e0165938ec-attempt1`
was the private runtime output root. The result retains each command's exact
environment and cwd. The producer's generated file stayed equal, and
compatibility reported copied:false with its cd50 bytes unchanged.
Playwright 1.63.0 used Chromium 153.0.8010.12, revision 1243. Actual report
version fields remain null where that script did not report a version.

Page reports contain 19 layouts, six recorded-demo screens, the claim guards
and two label observations. Card reports contain 104 observations and 59
contracts, with seven declared-view, four owned-scope, two Grow-routing and
four declared-member observations. These are report observations, not unit
test counts. Root read all eight safe reports and streams and inspected twelve
representative PNGs without a concrete visual finding. The controlled Page
422 author-cannot-review response was expected. Card stderr contains only
Node module.register warnings.

The claim path uses production Page UI and actor-bound native readonly
eligibility, with intercepted founding transport loss as a stand-in. No
founding request reached Scope admission. The label path seeds a local label
in private browser settings over native reads; it submits no founding or
native name mutation. The recorded-demo route retains its recorded inputs.
These local fixtures establish no hosted installation, provider, physical
device, native completion or NF7 outcome.

Root retained 46 inspected safe files plus the safe-export index, including
twelve viewed PNGs. `D/safe-export.json` records their existing digests.
`D/views-browser/safe-summary.json` is a derived numeric/boolean/label
projection, not the raw report. Its digest is
`93b7db504f663f4609570546927c6804f99b823a07436c8a27d945d334675fde`.
The raw views report and two Grow proof-width JSON files remain private
because they contain protocol/context/markup or signed-request payloads.
Auxiliary records, caches and other images were not selected for export;
that does not classify those unselected files as secrets. Originals remain
intact; no script reran to create the safe projection.

The final documentation successor changes only the four existing NF6/NF8,
FH2, SD1 and LC2 implementation notes. Its source, tests, identifiers, packets,
configs and dependency metadata remain those of gated
`27e0165938ec563420c1fecce6364d11c14f4afb`, tree
`66ccd762db65d34a8f9e95f59071984a32c2c7be`. Root's later source checkpoint
names the final commit and tree.
