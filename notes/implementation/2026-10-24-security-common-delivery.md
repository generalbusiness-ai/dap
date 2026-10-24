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
The status below supersedes their pending integration and composed-seal text.

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

Nested compiler, body, and child times overlap these spans and are not added.
The runs used macOS 27.0.1 on arm64 with existing private dependencies
and caches. Load and cache temperature were uncontrolled. These observations
are local validation costs, not a benchmark or total implementation cost.

The ordinary common gate remains failed. Its targeted repair continuation
and separate previously unreached tail passed and are accepted. This report
is the only change after validated tree
`d6e12d17527af33bfbaa9eff6c518f291c15a81d`; source, tests, configuration,
lock and seal map carry unchanged. The reporting artifact identifies the
exact later documentation-only head. Request-specific exact-head review and
landing remain pending. No whole-gate success is claimed from these separate
continuations.
Settings migration and deployment remain planner-owned. No hosted deployment
or provider enforcement is claimed.
