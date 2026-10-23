# R8: application screen origins and browser keys

## Status

This is a locally validated, partial R8 source integration, initially based on draft `7d1a0a48d86fa99efc31ff4a24faed86ffa77bbf` and landed Main `25e1248e949ec4da7be3635dc58b85c4085dc48a`, with later landed dependency updates retained. It addresses request `8ced57e3a3d521da8f860426026e6d1dba67ad18` under promise `f157d8dfb290b051e75928c4f29d2112c09309a5`. It does not claim formal R8 acceptance, a final-gate pass or deployment.

The original 26 planned Native cases and four added cleanup controls have now completed successfully across the preserved scoped owners, including real session/stream cancellation acknowledgement and the intentional 30-second late-header expiry. The three additional session lifecycle cases also passed; repeated sandbox/session executions are not counted as additional coverage. The final join owner 12245 passed its owning Page scope compiler and both invitation-version cases with stable guards (root outcome `ff66911eaae9139d7ddf0ef7bed9f8761a1e2e8e`). All original failures and metadata qualifications below remain part of the evidence.

Owning compiler configurations, focused Node checks and the four-case D1 inventory have passed in their recorded stages. The real browser key-custody module harness passed nine cases; the historical rendered Page check passed four, followed by the affected missing-key rendered check and visual review after its layout repair. Maintained Page builds, exact dist/module comparisons and the whole assets witness passed. After the workbench changes, the rebuilt Page passed a fresh four-case rendered check and visual review; downstream Node 37 and Counting 55 also passed. These are distinct scoped observations, not one combined final-head gate or live-provider result. Historical source sections below retain their then-pending wording; this status and the latest recorded outcomes supersede that wording.

## Source behavior

Room-origin application screen requests now redirect only through an exact configured installation descriptor, or refuse. A separate sandbox Worker serves configured HTTPS hosts under `inguz.space`. Its fixed service bindings and finite native-route gateway retain the canonical room origin for signed operations. Both sides must agree on the complete descriptor; no arbitrary upstream or parentless-creation proxy is introduced. Native installation, packet, release and trust checks remain in the screen renderer.

The page stores Ed25519 signing keys as nonexportable WebCrypto keys in IndexedDB. Migration imports an existing legacy seed without changing its public identity, waits for durable persistence, then verifies the stored key before removing the legacy secret. Failed persistence or key verification retains the recoverable legacy value. Startup also converts retained join, start and claim operation records to key references while retaining their operation history and prepared envelopes. The existing distinct claim recovery identity is retained in private browser custody; no new recovery authority or download channel is introduced.

Participating page writers share a Web Lock. This does not promise atomic localStorage compare-and-set against an old or nonparticipating tab. Browser storage denial, failed durable readback and missing key references refuse rather than generate a replacement identity. The shared store is available for the separately requested sign-in flow; this change does not implement that flow.

Browser signing-key downloads are unavailable. Public configuration downloads remain available and grant no access by themselves. Clearing browser data removes the stored access key. Optional CLI Store signer hooks own the complete key namespace: a missing hook-backed key cannot fall back to a raw seed. Filesystem stores without those hooks retain their existing behavior.

## Integration and rollout

The integration retains landed R1 creation admission, environment propagation, cold-release checks and both test service bindings. The new sandbox native gateway passes the same environment through ordinary routing. It does not change historical native definitions, pins, signed releases, archive budgets or price controls.

Planner rollout must configure matching `APPLICATION_SCREEN_HOSTS` descriptors in the room services and `SCREEN_HOSTS` mappings plus fixed ROOM/GROW/LENDING service bindings in the sandbox Worker. Empty mappings refuse by default. DNS/Worker routing for the selected sandbox hosts and the affected room/page services require reviewed deployment. Counter and Lending screen source changes require maintained builds and reviewed new signed releases/trust configuration; historical releases are not silently rewritten. The page bundle likewise requires its maintained build before publication.

## Pending evidence

Formal source review remains required. The ordinary gate and later full test attempt failed as recorded below; subsequent scoped corrections and downstream checks do not constitute a single-head gate exit 0. The browser module harness proves its real WebCrypto/IndexedDB/Web Locks cases, while Native key-storage adapters remain explicitly in-memory stand-ins. This evidence does not establish every Page route in a browser, hosted origin isolation, live accounts or deployed access recovery.

Operator obligations remain: reviewed matching sandbox/Room mappings and service bindings, DNS/routing, reviewed deployment, and maintained Counter/Lending builds with new reviewed signed releases/trust configuration. Historical release pins are unchanged. The separate sign-in flow is not implemented. Clearing browser data can remove access; there is no browser-private-key export or newly invented recovery channel. No live credentials, private operator state or provider acceptance was used.

## Source prerequisites prepared after integration

The D1 model now reads the Room's public `applicationPage` matcher rather than
its private renderer. A separate finite sandbox table exercises the actual
sandbox HTTP handler and gateway matcher with fixed service stand-ins; the
configuration and named RPC surface are checked separately. Controls change the
actual public prefix, native gateway action list and metadata method while the
reviewed inventory stays fixed. These checks are unrun and establish no native
authority or deployed origin isolation.

At the prerequisite source checkpoint, the two changed existing owner seals
and four additional R8 owner seals were explicitly pending actual maintained
parser computation. Other seals and prior
controls remain intact. The sandbox's new Worker-only tsconfig is included in
the root typecheck command, with no package or lockfile change. No compiler,
inventory test, build or gate has run. The stale page assets and new
screen-release publication obligations above remain open.

## Actual dependency and structural-parser setup

One offline project `npm ci` completed with exit 0. npm's four default
install-script approval warnings were retained without approval or repair.
The owned dependency namespace has six hardlinked executable paths; it is not
claimed to contain only single-link files.

The first compatibility sequence contained a control-flow error: a metadata
precheck refused because lexical string sorting was compared with pathlib
component sorting, but the shell continued to the maintained preparation.
That original preparation exited 0 and changed only the expected private pool
bundle. The failed precheck and successful process remain separate evidence;
compatibility was not rerun. The original compatibility post-source, tool and context checks remain
author-attested through the compact summary; no independently paired full
original post snapshot is claimed. All 6,063 dependency rows were independently
compared, with only that bundle changed. The fresh parser snapshots below
provide a separate full stable interval. This incident is recorded under
`2a071dbe`.

A fresh hard-gated owner then verified the adopted dependency state, wrote the
existing-lock stamp, and ran the maintained six-owner AST extraction once.
The parser exited 0 with no signal or stderr: 0.450774334 seconds elapsed and
0.192165 seconds CPU. Root adopted the six actual outputs. Before adoption the
current source descriptors matched the receipt exactly; all unrelated owner
hashes and matcher controls are retained. Full before/stamped/after snapshots
show only the stamp addition before parsing and identical state during parsing.
These are structural metadata results, not a passed inventory test or native,
browser, build, release or hosted-deployment evidence. Owning validation and the
exact-head gate remain pending.

## First owning validation result

The owning D1 inventory completed once with four exact passes and no failed,
cancelled, skipped or todo cases. Its experimental type-stripping warning was
retained. This is structural evidence, not browser or native authorization proof.

The next focused owner exited 1 naturally with stable input guards. Its first
12 compiler configurations passed. The Lending browser configuration then
reported TS2769: the local fetch options widened `cache: "no-store"` to
`string`, which does not satisfy `RequestCache` in the combined native/gateway
fetch signature. The sandbox compiler and all 33 selected Node cases remained
unrun. The source correction retains the same cache value as a literal type;
it changes no request behavior and adds no ambient types or unsafe cast.

The failed original result is retained. Verification of this correction must
run only the Lending and previously unrun sandbox compiler roots, followed by
the same 33 whole-file Node cases if those compilers pass. The earlier 12 passes
are carried forward; D1 is not repeated. No compiler or test has run on this
correction, and maintained builds, real browser checks, releases, hosted
acceptance and the final gate remain pending.

## Follow-up phase evidence and remaining UI coverage

The Lending literal-type repair and previously unrun sandbox compiler passed.
The maintained focused runner also completed all 33 selected Node cases with
no coverage issues and one actual reporter end event reporting zero unhandled
errors. The original outer owner nevertheless exited 1: its postguard observed
the declared results-cache parent directory's link count change from 2 to 3.
The exact namespace audit found only that descriptor change and the already
allowed 733-byte `results.json` leaf; source, tools and selected environment
matched. Root adopted those phase results and the current state with that
explicit outer-owner failure qualification after independent audit. The failed
original owner is retained, not relabelled as a successful run.

A remaining Start UI witness still expected browser-key downloads. Its narrow
source repair instead supplies the existing signer, requires one public
configuration blob containing no browser seed, and checks that no recovery-key
export control or call exists. The scripted startup migration is explicit;
real custody migration remains covered at its own boundary. Original Start,
legacy offer, reload, Check/Continue, invitation and stale-context controls are
retained. Route rendering now awaits the existing microtask flush before reading
the newly rendered Start input.

The next proposed owning check is only the affected page test compiler and six
whole Node files with 15 cases: settings, claim UI, corrected proposal UI, join,
Start UI and the CLI's existing filesystem invitation/enrollment matrix. The
prior 14 compiler and 33 Node phase results and four D1 passes are carried
forward; only the compiler affected by this test edit is selected again.
These remaining UI checks are unrun. Native sandbox/install/Page checks, actual
browser persistence and origin isolation, maintained builds and reviewed
release/deployment work, and the final gate remain pending.

## Remaining UI first attempt

The affected page test compiler passed. The next Node body passed settings,
claim UI and both join cases, then failed the Start UI stale-context assertion.
The correction UI case was unrun and the nine CLI invitation cases remained
unfinished or pending after bail. The original run also reported an unhandled
`location` access after teardown; that error is retained with the failed run.

The stale-context fixture still wrote a legacy `{secret}` row. Current settings
reject that shape, so it resolved to the same empty context captured by Start;
it did not represent a newly selected valid connection. The narrow fixture
correction writes a different valid public-key settings row, awaits the actual
async Open callback, and requires both zero storage writes and exact preservation
of that row. Cleanup joins the callback before removing globals, including on
assertion failure. No product guard, deadline or refusal assertion is weakened.

This correction is unrun. The next proposed check is only the affected page test
compiler and the three still-failed or unrun whole files: Start UI, correction
UI and CLI invitations, 11 cases total. The four actual passes above are carried
forward, not repeated. Native, real browser, build, release and final-gate
obligations remain open.

## Correction UI readiness first attempt

The next owner and child exited 1 naturally with stable guards. The page test
compiler passed, but the correction UI witness asserted after the intermediate
“Opening your room” publication, before the room/change read and editor mount.
It observed zero editor calls and later reported an unhandled `document` access
after teardown. Start was skipped by bail and the nine CLI cases were unfinished;
there were no new terminal passes. Vitest's “aborted by user” end label in this
run is a bail label: the owner recorded no received signals or user interruption.

The narrow fixture correction now waits for a terminal root publication,
excluding only that actual loading heading and accepting failure publications
as terminal. The original one-editor, exact arguments, unavailable publication
and review controls, and later custom native form assertions remain unchanged.
The fixture retains globals until the requested publication settles, including
on assertion failure; it does not claim to drain arbitrary application work.
No product behavior, key authority, wait duration or deadline changes.

This source correction is unrun. The next proposal remains only the affected
page test compiler and the same three whole Node files with 11 cases. Earlier
successful checks are carried forward, not repeated. All original failed runs
and unhandled errors remain preserved; Native/browser/build/release/gate work
is still pending.


The first Native stage at `6eba` ended naturally with stable input guards. All seven install-custody cases passed. Start then failed in the test-only private-key storage adapter: workerd does not support `structuredClone(CryptoKey)`. The remaining 18 cases did not complete. The adapter now retains the actual nonextractable CryptoKey reference in memory while cloning its ordinary record metadata on save and load. This is explicitly a storage stand-in, not evidence of browser key cloning or IndexedDB persistence. Production key storage and Start assertions are unchanged; the repair is unrun. The next stage carries the seven passed cases and selects only the remaining eight files (19 cases), with the affected Page test compiler.

This shared test helper is also imported by the previously passed claim-key-migration, join-custody and start-custody Node files. Those results describe the earlier helper bytes; they do not validate this repair. The final gate must revalidate those consumers. The next focused stage includes both Page test and Page scope compilers because the helper is included directly by the former and imported by Native tests covered by the latter; it does not repeat the healthy Node suite.


The next Native stage at `38d7795` ended naturally with stable input guards. Both Page compilers passed. Start and both host-route cases passed as whole files; the sandbox package cases passed, but its real named-RPC session case received a reply that the existing client could not decode as a session answer. The captured output did not include HTTP status or content type, so it does not establish a product or fixture cause. A test-only diagnostic now records those two fields from the existing session POST response, returns that same response unchanged and preserves all strict session/stream assertions. It reads no body, token or other headers and makes no additional request or clone. The diagnostic is unrun. The next stage carries the three complete passed files (10 cases including the earlier install-custody seven), and selects the remaining six whole files (16 cases), including the whole sandbox file.


The next Native diagnostic at `7936` ended naturally with stable guards. The Scope test compiler passed; the real sandbox session case still failed, with an empty response of status 503 and no content type. This is consistent with a gateway refusal, but an upstream native 503 could also be forwarded; the origin remains unresolved pending stage observation. A transparent test-only delegate now records fixed RPC stage transitions, exact descriptor-match boolean and bounded error name, preserving original receivers, arguments, resolved values and errors with one call per method. It reads no credential/body and adds no RPC or retry. This diagnostic is unrun. The separate browser module harness attempt ended naturally on browser startup timeout with zero cases; its input guards passed. It proves no browser custody behavior. The retained profile and bounded process audit do not establish global browser closure.


With the updated dependencies, the next Native stage at `07b959` ended naturally with stable input guards and Scope test compiler success. Both task-data cases passed as a whole file. The third claim case then failed on its old raw recovery-seed inequality: newly retained records correctly have no `recovery` seed, so both compared values were undefined. The proposed test oracle checks distinct valid recoveryKey references, no raw seed in either record, successful loading/signature verification for both retained identities and their exact public binding in each operation’s own retained native found envelope and full equality with a genuine captured send. Existing operation, envelope, legacy-wrapper and saturation assertions remain. This correction is unrun; browser binding keeps the checkout unchanged. The next Native selection carries task-data two and selects the remaining five whole files (14 cases).

A source follow-up also replaces an undefined legacy-seed output exclusion in the first claim case with explicit no-raw-seed, valid retained recovery reference, successful private-key load and absence of raw private fields in the returned result, preserving the browser session-secret exclusion. This is an unrun oracle repair.


The next Native stage at `8e78` ended naturally with stable guards. Page scope compilation and all three claim cases passed. The sandbox descriptor RPC resolved with an exact match; the native RPC then rejected with `DataCloneError`, yielding the gateway 503. Pinned workerd `v1.20260815.1` Request serialization includes explicitly supplied AbortSignal values and states that those values are not serializable. The client supplies such a signal, and the old nested Request construction inherited it. The gateway now constructs the transferred HTTP message from explicit method, admitted headers, original body and manual redirect, without transferring the signal. Existing local header deadlines, late-response disposal and returned-body cancellation remain. No body is cloned or buffered.

Cloudflare's RPC contract also requires byte-oriented streams. The route's existing relay is now explicitly a byte stream, preserving its zero high-water mark, single upstream read per pull and unchanged once-only release/cancel branches. The scope's internal subscription queue is unchanged, retaining its one-head backpressure accounting; the relay is the outgoing route boundary. This source repair and its unchanged real session/stream/cancellation witness are unrun. These source findings do not establish hosted acceptance or prove that no further runtime transfer boundary remains. Sources: https://raw.githubusercontent.com/cloudflare/workerd/v1.20260815.1/src/workerd/api/http.c++ (Request::serialize) and https://developers.cloudflare.com/workers/runtime-apis/rpc/.

The owning maintained source parser ran once for these two changed owners (owner 21912), ended naturally with full input guards, and root adopted its actual outputs in `52194aa2a538c7e99e022d6334e9b45b04702770`. Only the existing sandbox and sessions seal values are refreshed. This is structural source metadata, not runtime authorization or transfer proof. D1’s four cases, affected compilers and the remaining Native lifecycle coverage are still pending for this repair.

The next D1 attempt (owner 64898) ended naturally with stable guards, but all four cases failed on Node Request’s requirement for `duplex: "half"` when its initializer carries a stream body. The inventory executes the actual Worker handler under Node globals. A local inventory-only Request adapter now supplies that Node option for stream bodies; the product Worker receives no Node-specific change, and the actual matcher/route/seal assertions remain unchanged. This harness repair is unrun. The maintained inventory script is not itself in a source-seal map; the two actual product seal values are unchanged.


## Maintained Page build and data comparison

The maintained Page build (owner 48463) ended naturally with npm exit 0, no signals and all fixed input guards intact. Root recorded the outcome in `de4bc0a7`. It updated only the generated `apps/room/page/assets.ts` among tracked files and wrote the two declared dist files. The script is 827,681 bytes. No package installation or manual bundle edit occurred.

The separately allocated data comparator (`30ce31a3cca30f7594341d11039807560302f2e2`) then ended naturally with PASS and stable pre/post guards. It verified the exact generated module format, its recorded content hashes, HTML equality with both dist and maintained source, and JavaScript equality with dist. This is content equality, not rendered-browser or hosted acceptance. The whole assets test and the four rendered Page startup/key-reference checks remain pending on this checkpoint. Earlier failed runs remain preserved.


## Current RPC cleanup checkpoint (source only)

The corrected D1 owner 41010 passed all four cases with stable guards at `10baa643` (root outcome `1193e4b690d473b3b1a8bb8ff6217c6ee9162167`). The next Native owner 65358 passed Scope production/test and sandbox compilers and all three session lifecycle cases. The sandbox session now returned 200/application-json and all RPC calls resolved, but the strict post-cancel subscription assertion observed open 1/released 0 instead of 0/1. Seven cases remained pending. This establishes an acknowledgement gap at that observation; it does not prove a persistent leak. The whole session file passes carry as historical results; the affected route factoring requires revalidation.

The source proposal now keeps ordinary `native()` responses unchanged and adds a stream-only `nativeStream()` exchange: the response plus a private RPC lifetime capability for its exact already-authorized opening. No caller chooses a stream ID, target or authority. A shared close promise awaits the same object's actual release RPC. Gateway EOF, errors and cancellation await that explicit acknowledgement within the existing transport window, then dispose the transferred body and RPC stubs. Disposal itself is not acknowledgement. Server disposal fallback and gateway late-header cleanup are retained with bounded `ctx.waitUntil` ownership; failure or abrupt client/host loss is not a universal cleanup guarantee. No public HTTP route/header or general ScopeService method is added.

Four new local controls cover deferred/rejected release, overlapping EOF/cancel disposal and context-owned late headers. They use labelled service/context stand-ins; the genuine native session, stream and exact cancellation-count oracle remain strict. The late-header control awaits the actual existing transport deadline, without sleep, polling or timeout changes. Product/model review `af80c1e5ac761f60d9e962a1153cf4ab6a868ae8` and control review `2fcb449b2a311e58d08074736ff449f182cc15bc` are source-only. This capability repair, its new controls, new owning compilers and changed D1 seals are not yet runtime-validated. Actual maintained parser values are required before refreshing the affected seal positions.

Root has separately adopted the maintained Page build, exact assets comparison, whole assets test and four rendered startup/key-reference checks at `a6882d9`, all naturally closed with stable guards. Generated assets remain byte-exact from that build in this source proposal. These checks do not establish installed-screen isolation, a new Counter/Lending release, hosted deployment acceptance or a full final-gate pass. Earlier failures and partial-scope limits remain preserved.

The separate missing-key screenshot at the historical rendered checkpoint showed the error message confined to the first 200-pixel grid column. The guarded unavailable-key catch had bypassed the existing entry shell, `.screen` layout and entry marker. A minimal source repair now uses that same shell and marker with the exact existing heading and copy; key custody, storage and CSS are unchanged. This layout repair and its required maintained rebuild/missing-key-only rendered recheck are unrun. The earlier four rendered checks remain evidence only for `a6882d9`.

The maintained owning parser then computed the two changed sandbox/Scope Worker seals once (owner 94572), with natural exit 0 and full source/tool/context/dependency/cache guards intact. Root adopted the actual values in `5560605ff4d6dbbcbff9d0f90c6fba60c8457599`; only their existing seal positions are refreshed. The sessions owner is unchanged. This checkpoint includes the reviewed RPC capability controls and unavailable-key layout repair, but its D1, affected compiler/Native checks, maintained Page rebuild and missing-key rendered recheck remain pending. Parser metadata is not runtime cleanup or browser proof.


The maintained Page rebuild at `db390d73` (owner 27347) ended naturally with npm exit 0 and all input guards intact. Only the generated asset module changed among tracked files; the rebuilt script is 827,775 bytes. The separately allocated data comparator (`eecb1e18710c05f7a61d29e37074a4ef914506d6`) then ended naturally with PASS and exact pre/post guards, confirming module/dist equality and maintained HTML equality. This rebuild includes the missing-key screen layout repair. Its affected rendered refusal check and screenshot remain pending; the earlier four rendered passes describe the preceding bundle. The separate D1 and remaining Native checks are also pending. Earlier failures and browser/module evidence remain preserved.


## Intentional late-header expiry control

Native owner 76453 ended naturally with exit 1 and stable input guards at `8c904872`. Scope production/test, sandbox and Page production compilation passed, as did the whole Page assets case. The first seven sandbox cases passed, including the real native session/stream cancellation release counts and deferred, rejected and overlapping EOF/cancel controls. The eighth sandbox case timed out at its original 30-second test limit; the remaining ten session/archive/install/join cases did not complete. These successful outcomes do not turn the original failed owner into a pass.

The eighth control deliberately withholds response headers until the production `REPLY_SECONDS = 30` expires. Its first response and subsequent cleanup assertions therefore cannot complete within the same 30-second test deadline. Root explicitly authorized a 60-second local allowance for this one intentional expiry witness. Production transport windows, all other case deadlines, capability code, D1 seals and strict assertions remain unchanged. The response wait and its assertions now sit inside the fixture's existing `try/finally`, so failure there also releases its deferred headers and acknowledgement and joins registered background cleanup. This owns the fixture's known deferred work; it is not a universal drain guarantee. The repaired test is unrun.

The current D1 inventory owner 68371 passed all four cases (root outcome `2e92395b`). The affected missing-key rendered check, owner 29319, also passed (root outcome `eaf30d56`), with the exact screenshot visually reviewed and no observed Page errors. Root recorded the known browser closure; this is not a universal process-closure or hosted acceptance claim. These outcomes carry forward without repetition. The next focused proposal is only the affected Scope test compiler and the whole sandbox file plus the ten previously unreached session/archive/install/join cases: 18 cases in five files. Earlier failed owners and all broader release/deployment/final-gate qualifications remain preserved.


The next Native owner 99172 ended naturally with exit 1 and stable guards. Scope test compilation and all eight sandbox cases passed, including the actual late-header expiry (30,005 ms) and strict real RPC cancellation acknowledgement. Both archive MCP, all three device-install and all three session cases passed. The first join-version case then refused its test-provided raw seed; the second was unreached (16 passed, one failed, one unreached). These results preserve the original failed owner and do not imply a full gate pass.

The join-version fixture supplied a legacy seed, which enters actual key import. Pinned workerd lacks the native CryptoKey accessors required to validate an imported key; the production signer deliberately trusts its metadata fallback only for keys generated by its own exact nonextractable generateKey call. The proposed fixture instead creates and persists an actual nonextractable key first, then uses a labelled fresh-key selection stand-in returning that independently captured signer. The actual native history actor must equal that signer's key. Unknown-version refusal before sending, exact proof fields, receipt/history hash, invitation-secret exclusion and active invitation assertions are retained. Production key validation is unchanged. This is unrun Native enrollment coverage, not browser import/migration or IndexedDB durability proof; earlier real browser module evidence retains its separate scope.


The final invitation-version owner 12245 ended naturally with exit 0 and full fixed-input guards. The Page scope compiler and both whole-file cases passed using actual generated nonextractable keys with the labelled selection/storage stand-ins described above. This completes the original Native plan plus the four cleanup controls across scoped runs; it does not erase earlier failures or replace the still-required exact-head gate and formal review. Root adopted the result in `ff66911eaae9139d7ddf0ef7bed9f8761a1e2e8e`.


## Final-gate type boundary follow-up

The first R8 final-gate owner 23439 ended naturally with exit 1, stable input guards, unchanged cache and no received signals. Whitespace, helper, citation and citation-test stages passed. Typechecking failed at `sessions.ts` byte-stream enqueue: the CLI, MCP and Lanes Node ambient types require a non-shared ArrayBuffer view, but the upstream `Uint8Array` type permits `ArrayBufferLike`. Tests and the remaining chained script/example/browser/sandbox compiler roots were unreached. This failed original gate remains preserved; the focused results above do not replace it.

The relay now checks that its concrete native chunk has an ArrayBuffer backing and passes a new view over the same buffer, offset and length. It neither copies nor changes the bytes and uses no cast to conceal shared-memory acceptance. The existing byte-queue path already rejects shared buffers; failures retain the original catch/release/close behavior. The actual route creates fresh UTF-8 chunks and transfers them through native RPC; no generic cross-realm buffer contract is claimed. Production windows, cancellation acknowledgement and all test assertions are unchanged. This source repair is unrun, and its changed sessions owner seal requires actual maintained parser computation before adoption. Only the affected failed/unreached compiler roots and existing three session lifecycle cases are proposed before the still-required unreached ordinary test stage.

The maintained single-owner parser, owner 15155, then passed with full input guards, no signals and unchanged cache. Root adopted its actual sessions seal `2c39578d800619bd232c3f375cbd523bcbf3ea22ffa99a052b16f93fc72fe585` in outcome `8c3a28fe8984a8f21caf15b5058ab502c7bb16d6`. Only the existing sessions seal position is refreshed. This is structural parser evidence, not compiler or runtime validation of the byte-view repair. The reviewed 17 affected/unreached compiler configurations and three whole-file session lifecycle cases remain pending, followed by the unreached ordinary test stage; previously successful unrelated gate stages are not repeated.


## Ordinary test-stage follow-up

The 17 affected or previously unreached compiler configurations and all three whole-file session cases passed with full guards (owner 90672, root outcome `c50ebfae182df0479b06763ea48ce21f5b4c4e41`). The separately allocated ordinary test stage, owner 9046, then ended naturally with 2,157 passed, six failed and three skipped cases across 467 files, zero observed unhandled errors and full input guards. Root adopted the failure in `b8915f2cd2d23402d843cfd2975001c975feb422`. This is not a final-gate pass.

One CLI clone regression came from constructing an unused filesystem signer after an actual signed session request had already established the session. The session-reader branch now checks current key availability without a second public-key derivation. Filesystem bytes must still be a 32-byte Uint8Array; a hook-backed store must return its signer and cannot fall back to an available legacy seed. The non-session signed-read path is unchanged. Original derivation-count, exact authorization-header, signature and missing-key/no-read assertions remain, with actual command-entry controls for malformed second reads and missing hook capabilities added. Independent source review `71db03d96cedb0f8894e81089afc00c2cd3502de` is not runtime validation.

The other five failures are in Page UI fixtures (two invitation UI, one joined-shell and two sending cases). Their source still assumes legacy settings or synchronous startup rendering; a separate lifecycle/fixture successor is under source review and has not been applied. The CLI repair in this checkpoint is unrun. All original failures and remaining formal review, final verification, build/browser and operator qualifications remain preserved.


CLI owning check `22006` passed both production and test compilers, then failed the clone test at its new malformed-custody oracle. The command intentionally propagates a generic malformed-key error; only its declared command/transport/source refusals become command results. The fixture now awaits that exact rejection and independently requires two custody reads and no summary HTTP request. Production error handling, the original derivation/signature/missing-key controls and the hook-backed missing-signer/no-seed-fallback controls are unchanged. The original natural failure and intact input guards remain evidence; the corrected test is pending an affected-only check.


## Workbench fixture lifecycle proposal (unrun)

The five remaining ordinary-test failures belong to scripted Page UI fixtures. Invitation UI mocked join custody without the new startup migration entrypoint and inspected rendering immediately after an asynchronous import/redraw. Joined-shell and sending fixtures retained raw-seed settings without browser key storage ports. The proposed fixtures instead use public-key settings, named signer ports and an explicitly separate startup-migration stand-in. Unexpected key signing, creation, import or settings writes are trapped. Original invitation, identity, stale-selection, action-count, draft and refusal assertions remain. No browser key-storage or native authority proof is claimed for these ports.

Independent review `0e8db914a8d2ab226fedd4997a410b6793556b05` found that render readiness alone did not join detached draw/action continuations before globals were removed. A maintained workbench owner now tracks actual rendering, workbench submission/source-load and creation-follow read promises. Its explicit retirement closes admission, invalidates old draws, cancels the existing future follow timer and waits for already admitted work, including rejection. The bookkeeping chains fulfill; detached application failures retain explicit reporting. Normal active operation starts synchronously, with existing permission, transport, timer and test deadlines unchanged. The owner does not claim shutdown of entry enrollment, connection/download, clipboard work or arbitrary browser tasks.

Joined-shell and sending fixtures serialize successors and retire on framework completion. They release every held scripted input before awaiting application settlement and restore globals only after that join. Actual action promises replace guessed microtask drains; observable render barriers remain for partial-state assertions. The invitation UI keeps its separate retirement queue and gains the explicit migration port and terminal-render readiness. Six new cheap controls exercise nested admission, rejection completion, retained in-flight work, retirement failure, queued successor exclusion and a late imported owner. These source changes and controls are unrun.

Because Main runtime source changes, a fresh maintained Page build, generated-assets comparison and affected rendered/browser checks are required after source review and owning validation. The existing bundle and historical browser outcomes do not validate this proposal. The ordinary test failure, all previous failures, final verification/formal review and operator rollout limits remain preserved.


Before any owning Page execution at `18a2cd04`, source review found a same-turn retirement race in the fixture helper. A directly released work promise could fulfill `Promise.race` before rejection propagated through the retired-signal reaction. `wait()` now rechecks current ownership after awaiting the race and before returning its value. This is a source-only correction; the earlier Page V1 preparation remains unused, and no pass is claimed at that head. The existing successor-exclusion control distinguishes the retired-body continuation. Main runtime code, original UI assertions and deadlines are unchanged by this correction.

The independent CLI follow-up owner 48690 passed the owning CLI test compiler and whole clone case with full guards. Root adopted the result in `222f5895457c79e6a3905b1216a4d9f35b7fd252`. The earlier owner 22006 failure and its rejection-oracle correction remain recorded above. The next Page proposal is still only its production/test compilers and four whole Node files (12 cases), with fresh bindings; maintained rebuild/assets, affected browser checks and remaining final verification stay separate.


The first owning Page stage, owner 62190, ended naturally with exit 1, full fixed-input guards and unchanged cache. Page production compilation passed. Page test compilation then reported TS6133 for the second sending fixture's unused local `main`; none of the 12 UI/lifecycle cases ran. That local now is removed while the same awaited `fixture.load()` still owns the imported module, and the existing awaited rendered barrier remains. The first fixture's used `main` reference is unchanged. This narrow correction is unrun. The next proposal carries the production compiler pass and selects only Page test compilation plus the same four whole files/12 cases. The original failed owner remains preserved.


The next Page owner 32065 ended naturally with exit 1 and full input guards. Page test compilation, all six lifecycle controls, the joined-shell case and all three invitation UI cases passed. The first sending case then timed out at its unchanged five-second limit; the second was unreached. The ten whole-file passes carry forward, while the failed owner remains preserved.

Source inspection found that both sending data-module mocks omit the maintained `sessionKey` helper now used by Main's real room verification. The first fixture also supplies an empty failure renderer and recognizes only a rail or one key-error heading, so a generic terminal error could leave its render wait pending instead of reaching the original assertions. The precise timed-out wait was not observed. The unexecuted scalar-stage diagnostic was abandoned; its assignment bug was never applied.

The narrow fixture proposal forwards the actual maintained `sessionKey` in both mocks. The first also forwards the actual `Unreadable` class used by the actual failure renderer, publishes that real renderer into its DOM stand-in and accepts any terminal heading except the known intermediate Opening heading. Original room/signing validation, UI assertions, action counts, cleanup ownership and five-second deadlines remain unchanged. This correction is unrun; only Page test compilation and the whole two-case sending file are proposed next. No healthy Page file, production compiler or broader suite is repeated.


The sending follow-up owner 14118 ended naturally with exit 0, full fixed-input guards and no signals at `409f09af`. Page test compilation and both whole-file sending cases passed (552 ms and 48 ms); root adopted the result in `69b49322ce8e8708e10fc1dc2e0a3ad196f7056d`. Together with the ten earlier healthy Page cases, all twelve affected UI/lifecycle cases have now completed across preserved scoped owners. Repeated compiler attempts are not counted as additional coverage. This does not replace remaining final verification or prove every Page route in a browser.

Before that follow-up, root's first allocation derivation incorrectly expected a null placeholder rather than `ROOT_ALLOCATION_PENDING`. Derivation stopped without creating the allocated binding, but root still launched the owner. It failed immediately with FileNotFoundError before guards, compiler, tests or evidence-directory creation. This remains a root preparation failure, not a product/test result; its used owner is retained as DATA. A fresh physical owner and bindings were prepared for the successful follow-up, without reinstalling or changing source, dependency or cache inputs.

The workbench runtime change still requires the maintained Page rebuild, exact generated-assets comparison and affected rendered browser validation at a fresh clean head. No prior bundle/browser result is relabelled as validation of the new owner. Original failed stages, the narrowed workbench-only retirement scope, operator rollout obligations and formal review/final-verification limits remain preserved.

The maintained Page rebuild, owner 6666, ended naturally with exit 0, no signals and full fixed-input guards at `86c00342`. The only tracked generated change is `apps/room/page/assets.ts`; no bundle was edited manually. Its generated module is 885,265 bytes, containing the 829,165-byte JavaScript bundle (SHA-256 `5b358ea34619dbd72a9cda0a6e6ec4e885cc5edb2c6b3d14f7f179f57fd42212`). The 26,184-byte HTML is unchanged. Only the generated JavaScript hash and literal changed in the module.

The separately allocated comparator passed all four data comparisons; root explicitly adopted it in `3d1515732b56576bb4a0764d2481bfd976dd4cee` (the earlier `940974d0` was its allocation). The generated module's HTML equals both maintained source and dist HTML, and its JavaScript equals dist JavaScript. This establishes content equality, not browser behavior. Affected rendered browser checks, remaining final verification, formal review and operator rollout remain pending. The healthy nine browser custody cases are not repeated or relabelled as workbench validation.


## Final local verification reconciliation

The original ordinary gate owner 23439 failed typechecking at the relay byte-view boundary; tests were unreached. After the narrow source correction and actual seal refresh, owner 90672 passed all 17 affected or previously unreached compiler configurations and the three session cases. The original failed gate remains preserved; these follow-ups are not reported as that gate passing.

The later full test owner 9046 ended naturally with 2,157 passed, six failed and three skipped across 467 files, with zero unhandled errors and stable guards. Its CLI clone failure was corrected and closed by owner 48690. For the five Page fixture failures, owner 32065 passed ten affected UI/lifecycle cases, and owner 14118 passed the remaining two sending cases after the source-established mock corrections. Original failures, intermediate compiler/fixture failures and the zero-body root preparation error remain recorded above. All twelve affected Page cases completed across those scoped owners, including six new lifecycle controls; this is not a count of twelve original failures. Repeated executions are not additional coverage.

After the maintained rebuild and data comparison recorded above, rendered browser owner 21428 ended naturally with exit 0: all four cases passed, no Page errors, full input guards, browser closed, profile removed and completion uncertainty false. Root visually reviewed both 1,024 × 768 screenshots: the Start form and missing-key message were clear. Root adopted this result in `0723fc0ca495fb9d28c9e940c8a8a662b4dbdf7a`. This fresh rendered check validates the rebuilt local Page startup, migration, reference reload and missing-reference refusal; it does not submit a native room creation or prove deployed isolation. The healthy nine-case custody harness was not repeated.

Downstream owner 72534 passed Node 37 and Counting 55 with full guards, no signals and no collector errors; root adopted it in `295eaf78e10305e1d7b4b07dfa65ae4cd55d8c3c`. These checks and the rendered browser check kept source, dependencies and cache unchanged at `8d5dd80e`. The whole assets test passed in the earlier full test attempt before the latest rebuild; the current generated-content invariant is supplied by maintained build 6666 and the separate exact module/dist/source data comparison, not by relabelling that historical test.

All previously unreached executable gate content has now been covered through the recorded owning chain, whose provenance still requires formal review. This closes the planned local owning follow-ups. It does not claim a single-head `npm run gate` exit 0, formal R8 acceptance, operator rollout, new Counter/Lending releases, hosted acceptance or completion of the separate sign-in request. The scope and rollout limits above remain in force.
