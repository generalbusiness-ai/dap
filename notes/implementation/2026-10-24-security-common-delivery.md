# Site, application trust, and read-token custody

This common delivery combines three requests while keeping their authority
and review bindings separate:

| Change | Request | Promise | Earlier detail |
| --- | --- | --- | --- |
| Site address window | `a4ba3fbc8045c07ad5b8998fb3c6d7febce07e43` | `a914d7ea8cb90ff35dee7d0439194e6083778e43` | [Site window](2026-10-24-site-address-window.md) |
| Application install trust | `6123e618460eb579e0f61f33591c45f0ae24b32e` | `1fc9f58ddb9211047af3feb263e1f6432d2824e7` | [Install trust](2026-10-24-install-application-trust.md) |
| Unread read-token custody | `ab2efe97626f59fd7367fac58df9cdf20a2fb64f` | `0e27a687c4836c8616ac0307c391dec3a9b99db1` | [Token expiry](2026-10-24-read-token-expiry.md) |

The common delivery is tracked by request
`7dfe31c9c5e25fe5d37cd5e1d9e5c00bb6b9b733`, promise
`4042361eb7c6096fad91932c17fa7392f7ed704f`. The earlier notes retain
their failed runs, partial outcomes, controls, and source-stage limits.
The status below records their later integration and composed-seal evidence.

The Worker retains both trusted Site address forwarding and HostedAgent
application trust forwarding. The storage object schedules credential expiry
and consumes deployment restart directives after its activation diagnostic.
Site counters remain memory-only. Installation trust binds release, publisher,
and host before package transport. Read plaintext cleanup uses bounded alarm
work and the accepted partial legacy policy. It does not revoke provider
tokens or erase generic write-token custody. R11 act revocation is excluded.

## Validation and integration

Original `77265` failed naturally: Scope production compilation passed, Scope
test compilation exited 1 with two TypeScript errors, and later compilers
and all bodies were unrun. The fixture correction added explicit types and
replaced an unsupported credentials-property assertion with portable
Authorization-header absence. The core fetch count, URL, manual-redirect,
and native authority checks stayed unchanged. No production fix was needed.

Continuation `63761` completed all three remaining compiler contexts and its
body with exit 0. The 37 whole files produced 140 exact terminal identities:
138 passed and the two predeclared ordinary recorder cases skipped. The
strict pipeline and outer wrapper still exited 1. That result is retained;
no success classifier was weakened and neither recorder was enabled. Root
accepted the reconciled baseline in
`7751c12fe18c2d8cf9ab9b6af3b3f541f53e930c`. Twenty passed cases lack a
result callback: nineteen archive-driver cases and one file-publication case.
Their terminal outcomes remain available; no missing callback is invented.
The four control files have complete baseline callbacks. The independent
closed audit is held at
`/private/tmp/artroom-security-common-closed-validation-audit-20261024-v1/manifest.json`.

Two actual maintained seals fill three slots: the combined Worker once and
the composed object twice. Receipt
`/private/tmp/artroom-security-r4-r10-r13-union-two-seal-actual-20261024-v1.json`
is 279 bytes, SHA256
`3d5e7b0a0a80e1e44d519fbd066e1d5bbfb5407710c0e5518ae5561c4f6fc549`.
Root allocated the producer in
`22d6ef3ecb326004d3202dbd61bde49bcc577e44` and adopted its values in
`ab65ddb68900fa49d7f54210fdf737d082d25cb0`. These replace the historical
stale parent values. Other adopted seals remain unchanged.

Approved R9 Main `56de75676275e07e02887c7c1b5aaa862668fac6` is now
merged. R9 approval `7b4467f525ce0393e59ae45802c9595b91db0c39` and
landing receipt `f5ef14524a78e3f64d33496e907b91bb20eb148f` remain its
separate delivery record. The R9 integration checkpoint was
`2e0018643174680506bac1ed9cbb7b39a37acc33`, tree
`0b06e3bfee9c4e871d85ac11da5d77d070959a49`. The merge changed only the
R9 implementation note. Production, tests, configuration, lock, and seal map
remain exact, so their earlier source-bound outcomes and seals carry without
a repeat. The validated repair checkpoint below supersedes this integration checkpoint.

## Failed ordinary gate and targeted repair

Ordinary gate original `70364` closed naturally with exit 1 at
`83807bb957cd5322f40ee841899337e7352fe0cf`. Its maintained typecheck
passed; Vitest recorded 3,551 passed, 2 failed and 3 skipped cases across
499 files (3,556 unique terminal IDs), with zero unhandled errors. The
compose restart case failed at `compose.test.ts:214:125`; the first Site
status assertion failed at `scope-index.test.ts:49:113`, returning 503
instead of 404. Later assertions in those cases were not reached. Eighteen
ready and 41 result callbacks were missing, and one ready callback was
duplicated; terminal IDs were unique. Node and Counting tails were unreached.
The failed gate is retained, not relabelled as a pass. Root accepted its
independent audit in `ef616526`; the finite audit manifest is
`/private/tmp/artroom-security-common-gate-independent-audit-20261024-v1/manifest.json`.

Two bounded repairs followed: credential expiry reads the clock lazily only
when its queue needs it, preserving diagnostic-before-scheduling order; the
unknown-index fixture now explicitly supplies scripted fixed-owner Site
admission before the unchanged unknown-target lookup. Existing unknown
native, registry and body traps, index counts and status assertions remain.
The admission stand-in does not prove a real quota or provider boundary.

Original targeted continuation `70072` closed 0 at
`6192c115bdcbca302f1d6688be2c2ad8e506cd4c`, tree
`d6e12d17527af33bfbaa9eff6c518f291c15a81d`. Both Scope compilers passed,
and all 26 cases in five whole files passed: compose 9, credential-store 3,
read-token 1, archive-operator 10 and scope-index 3. All 26 collected,
started, result and terminal identities correspond, without retries,
repeats, skips or unhandled errors. This is a targeted repair pass, not a
new ordinary gate pass. Root accepted the audit in
`7eeca2acb53579fb98630e00c3f04017467660a6`; its manifest is
`/private/tmp/artroom-security-common-expiry-clock-repair-independent-audit-20261024-v1/manifest.json`.

One new actual object seal fills its two map slots after the clock repair.
The 141-byte output has SHA256
`40635f96b8bead36fd93f52f0c97c6d033ca3cfd38501a5744f84113bbb51189`
and was adopted in `cb5afa692b2e205afed3b00d6d7a93c6de65773b`.
The repaired object seal is
`d91755dd0f013bc7942d8dc171bcfe90603d2faafd33422bef101f0b3b92290b`.
The Worker seal remains unchanged. The
original two-call receipt above remains historical evidence, not a claim
that the repaired object retained its old seal.

Previously unreached tail original `26900` now closed naturally with exit 0:
all 39 Node cases and all 55 Counting cases passed, without failures,
cancellations, skips or todo cases. Its allocation is
`66700994b2b13b134894ea3d761933a7b35a19f8`, following Source acceptance
`b19a6820ed739e408b2b5a23b32bf884e0f8a54f`. Closed evidence is held at
`/private/tmp/artroom-security-common-unreached-tail-evidence-20261024-v1`.
The before, after-Node and final vectors match: 3,135 Source records, 6,070
dependency records, 60 environment records and Node/npm/Git/lock/stamp pins;
Main and origin remained `56de75676275e07e02887c7c1b5aaa862668fac6`.
No exceptions, errors, signals or unrun cases are reported. This separate
tail pass does not change the failed ordinary gate's outcome. Root accepted
its independent audit in `8ae7d171664db92c312771560185fc270d8d5e03`;
its finite manifest is
`/private/tmp/artroom-security-common-unreached-tail-independent-outcome-audit-20261024-v1/manifest.json`.
The vectors prove recorded boundaries, not continuous memory custody or
physical teardown. The ordinary Node warning is retained; these reporters
supply no separate unhandled-error counter or numeric case IDs.

## Four surgical controls

All four original controls remain source-bound to historical checkpoint
`2e0018643174680506bac1ed9cbb7b39a37acc33`; they were not rerun at the
repaired checkpoint. Their seams remain unchanged, and the new 26-case
continuation supplies the separately qualified repaired behavior evidence.
All four original control owners closed 0 with child exit 1, exact source
restoration, complete case callbacks, and no unhandled errors, signals, or
owner errors. Each used its accepted healthy whole-file baseline without
repeating that baseline.

| Control original | Actual whole-file outcome | Intended assertion |
| --- | --- | --- |
| Exact end `84265` | 1 failed | `read-token.test.ts:177:30`: dropped 0 instead of 1 |
| Diagnostic order `39886` | 6 passed, 4 failed | `archive-operator.test.ts:224:39`: recovery index 1 precedes diagnostic index 2 |
| Scope Site address `63970` | 14 passed, 1 failed | `site-route.test.ts:560:25`: Scope address is null instead of the platform IP |
| Hosted trust `5743` | 7 passed, 1 failed | `application-install-custody.test.ts:354:22`: no package request instead of one |

The exact-end, ordering, and Site controls have independent audits accepted
in `fc19d0176c43c85e1e895091e71d7218b63e81a1`,
`d3a200234ac5f968a137c8c860875bfade693d5f`, and
`c185ff797c987dd46dc4fb95f39a328a0b4aa2d6`. Their finite audit manifests
are recorded in the accompanying evidence roster. The hosted control's independent audit is accepted in
`005490060433ca058b909941345b591f7ade8109`. All four controls are fully
accepted and restored. Their finite manifests and exact raw evidence pins are held in
`/private/tmp/artroom-security-common-actual-delivery-note-source-20261024-v2/evidence-roster.json`.

The Site mutant reaches both 429 response assertions before the address
mismatch; its later target and provider count assertion is not reached.
The hosted mutant stops at the missing request assertion, so assertions
355–359 are not reached. The ordering mutants do not reach their later
diagnostic-field assertions. The exact-end mutant does not reach later
checks in its case. Healthy baselines cover those later assertions. The Site
owner and package redirect are stand-ins; these witnesses prove forwarding,
ordering, and local custody, not platform-header authenticity, live provider
behavior, or successful installation. Earlier R4 quota and route controls
and the R10 host-match control retain their separate historical evidence.

## Measured cost and remaining work

| Local recorded span | Wall seconds | Inclusive CPU seconds |
| --- | ---: | ---: |
| Two common affected owners, including the first compiler failure | 209.32 | 204.54 |
| Two-seal producer | 0.42 | 0.27 |
| Four control captures | 3.11 | 2.76 |
| Four control owners | 36.66 | 42.57 |
| Failed ordinary gate `70364` | 1348.03 | 1546.59 |
| Targeted repair continuation `70072` | 10.49 | 15.71 |
| Replacement object seal | 0.17 | 0.22 |
| Previously unreached Node/Counting tail `26900` | 7.60 | 10.48 |
| Sandbox-refused gate launch `51038` (Root-attributed) | 18.76 | 46.79 |
| Failed ordinary gate `90462` | 1291.10 | 1485.21 |
| Isolated Lending diagnostic `10462` | 9.19 | 13.53 |
| Lending fixture-precondition continuation `14055` | 9.04 | 13.21 |
| Passing ordinary gate `61084` | 1317.35 | 1514.79 |

Nested compiler, body, and child times overlap these spans and are not added.
The runs used macOS 27.0.1 on arm64 with existing private dependencies
and caches. Load and cache temperature were uncontrolled. These observations
are local validation costs, not a benchmark or total implementation cost.

Original ordinary gate `70364` remains failed. Its targeted repair
continuation `70072` and previously unreached tail `26900` passed and are
accepted; their separate outcomes are not a whole-gate success.

## Later ordinary gate and Lending follow-up

The sandbox-refused launch `51038` stopped before cases with a localhost
listen `EPERM`. Its run-start header named 499 files, but supplies no case
outcome. It remains a separate infrastructure failure; its outer measurement
is 18.76 wall seconds and 46.79 inclusive CPU seconds, attributed to Root.

Permission-corrected ordinary gate `90462` then closed naturally with exit 1
at `3447b3b2b17d793e2215a3518b2ffdd1e7d92f6b`, tree
`96bc114c4374f56a87b744a068185b413ac0cfd6`. The seven preceding stages,
including all 40 compiler invocations, passed. Vitest recorded 3,552 PASS,
one FAIL and three SKIP across 499 files, with 3,556 unique terminal IDs
and zero unhandled errors. All IDs retain their exact project/file/name
mapping from `70364`; display names can repeat. Eighteen ready and 21 result
callbacks are absent, all for passed terminal cases. No callback is invented.

The compose and scope-index failures from `70364` passed in this gate.
Lending failed at `lending.test.ts:379:43`: expected `current`, received
`behind`. Its underlying reason was not printed, so neither a timeout nor
provider, Site or expiry causation is established. All 140 affected cases
retain the expected 138 PASS and two ordinary SKIP outcomes; all 34
control-baseline cases and all 26 targeted repair cases passed. Node 39 and
Counting 55 were unreached in this gate. Their earlier separate pass remains
historical evidence. The closed audit is
`/private/tmp/artroom-security-common-gate-v3-independent-audit-20261024-v1/manifest.json`.
Root independently reconstructed these comparisons in
`d4ee3d84ee78a7304b32af12851f15e2be647629`.

Isolated diagnostic `10462` passed the Scope test compiler and complete
Lending scenario at `b99ddd8d02a5824797c83064fdc71952a9994c12`.
It retained the added diagnostic assertion payload, without a settle, retry,
read-order or deadline change. The failure was not reproduced and no failing
reason was obtained. This is not a repair or an explanation of `90462`.
Its audit is
`/private/tmp/artroom-common-lending-diagnostic-independent-audit-20261024-v1/manifest.json`.

Source review then found a real fixture-precondition gap: awaiting the return
act receipt does not join its scheduled dispatcher or prove its publish-file
result has been applied. The test now uses the existing bounded fixture
dispatch helper and requires the exact return send's held=false, target,
acknowledgement and applied-result state before the visitor read. All prior
assertions and the original registration and deadline remain. This adds no
product change, quota change, retry or clock advance, and does not establish
that this possible interleaving caused `90462`.

Root accepted the fixture proposal in
`86cfa9b405b3055392ea70818d4ddaacb20b79ad`. Complete Lending witness
`14055` and its Scope test compiler passed at
`c215460f083d55f243c68440a89f0fbb1274098c`, tree
`4d3c78b94d3b9d71a4b79ef264c9850be325b311`. The complete scenario retained
its original visitor-current, later donation, 64-thing and replay assertions;
no per-assertion execution counters are supplied. Collected, start, result,
end and JSON evidence agree on its one PASS, with no retry, repeat or
unhandled error. Three recorded Source/tool/workspace/alias boundaries pass.
This isolated result does not prove suite stability or the original cause.
The fixture and follow-up audit manifests are
`/private/tmp/artroom-security-common-lending-return-fixture-source-20261024-v1/manifest.json`
and
`/private/tmp/artroom-common-lending-return-focused-independent-audit-20261024-v1/manifest.json`.
Their exact payload sizes and SHA-256 values are in the accompanying report
proposal's `evidence-roster.json`.

## Required ordinary-gate resubmission

Checker review `a4cdaecc395635ca470fcce2d11e1e78a6b9d87f` at
`3447b3b2b17d793e2215a3518b2ffdd1e7d92f6b` found no code defect, but
requested changes because an ordinary gate had not passed after the
production repair. The 26-case continuation and separate tails do not meet
that requirement. The four request bindings carry to the resubmission.

Fresh ordinary gate `61084` closed naturally with exit 0 at
`c215460f083d55f243c68440a89f0fbb1274098c`, tree
`4d3c78b94d3b9d71a4b79ef264c9850be325b311`, under allocation
`a084a91461f1ef52987d22eb74e5f462ec443345`. All eight ordinary stages
passed, including 40 compiler invocations. Vitest recorded 3,553 PASS and
three ordinary SKIP outcomes across 499 files (498 passed, one skipped),
with 3,556 unique terminal IDs. Its run ended at
`2026-10-24T21:40:48.388Z` with zero unhandled errors.

Every ID retains its exact project/file/name mapping from both `70364` and
`90462`; display names can repeat. Relative to `90462`, only Lending changes
from FAIL to PASS. Relative to `70364`, compose and scope-index change from
FAIL to PASS. The full affected set retains 138 PASS and two ordinary SKIP
outcomes. All 34 control-baseline and 26 repair cases pass, as does the
complete Lending scenario. Complete case success supports reaching its later
assertions; no per-assertion execution counters or original-cause proof are
claimed.

There are 3,536 ready callbacks and 3,535 result callbacks: 20 ready and 21
result callbacks are absent, all for passed terminal cases. There are no
duplicate or unexpected callback IDs; full terminal outcomes remain retained.
Both ordinary tails actually ran in this gate: all 39 Node and 55 Counting
cases passed, each with zero failures, cancellations, skips or todo cases.
Their raw titles and summaries are retained. These reporters supply no
numeric case IDs or separate unhandled-error counter. The experimental Node
warning remains in the raw log; no path named by Counting output was followed.

The before and after checkpoints are equal and clean. Recorded lock, literal
lock-hash stamp, Node and npm descriptors match. All 17 original/copied stage
pairs match exact bytes, sizes, SHA-256 values and recorded physical
descriptors. The owner reports no errors and the npm child exits 0 without a
signal. These checks prove the recorded boundaries, not continuous memory
custody, a full dependency lifetime census or a Main-ref binding.

The independent audit manifest is
`/private/tmp/artroom-security-common-gate-v4-independent-audit-20261024-v1/manifest.json`
(1,450 bytes, SHA-256
`2e8643d9d06146b90a3678f40fc08ef71dfa580c64971c92b9371ba5a86a2b66`).
Its `audit.json` is 8,897 bytes, SHA-256
`62adc24007a9f5846e3b65ace409ba7d6aef79295a3dfd9e8ff661cc669440b2`.
Root independently reconstructed the result and accepted its closed outcome
in `5598747d962d526061e022a19754e63e4e0606a6`. Root then authenticated
the independent audit and its finite inputs and adopted it in
`29ad36ec579af56283987d9209d776c4b19ac018`.

The failed `70364` and `90462` gates, refused `51038` launch, separate repair
and historical tails, and both isolated Lending passes remain distinct.
This fresh gate passes at its exact tested head; it does not prove the cause
of an earlier failure or universal suite stability. Request-specific review
approval and landing remain pending.

Only report text is proposed after the tested code. Production, tests,
configuration, lock and seal map remain unchanged by this report proposal.
The reporting artifact must identify the final documentation-only head and
its relation to the gate's exact tested head. Request-specific resubmission,
approval and landing remain pending. Settings migration and deployment
remain planner-owned. No hosted deployment or provider enforcement is claimed.
