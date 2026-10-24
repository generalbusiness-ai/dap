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
separate delivery record. The common checkpoint is
`2e0018643174680506bac1ed9cbb7b39a37acc33`, tree
`0b06e3bfee9c4e871d85ac11da5d77d070959a49`. The merge changed only the
R9 implementation note. Production, tests, configuration, lock, and seal map
remain exact, so their earlier source-bound outcomes and seals carry without
a repeat. This note will create a later documentation-only checkpoint.

## Four surgical controls

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

Nested compiler, body, and child times overlap these spans and are not added.
The runs used macOS 27.0.1 on arm64 with existing private dependencies
and caches. Load and cache temperature were uncontrolled. These observations
are local validation costs, not a benchmark or total implementation cost.

Only the ordinary common final gate, request-specific exact-head reviews,
and landing remain. Root must
update this note with the closed gate and final checkpoint before delivery.
Settings migration and deployment remain planner-owned. No hosted deployment
or provider enforcement is claimed.
