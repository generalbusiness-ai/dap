# Archive upload-pack response status

This change records the exact HTTP status of a refused Git response. It does not repair the deployed archive failure or change which responses are accepted. Source review and the focused owning checks are complete. The ordinary gate has passed. Final review and the planner's next deployed tail remain pending.

Planner observation 542908c73853732070c83a687021f4947aa09564 reports 40 passes on deployed Main5253 refusing after the upload-pack POST: HTTP 4xx, text/plain, no redirect and an exact response URL. That evidence does not distinguish 400, 401, 403, 404, 411 or 415. The new integer lets the next tail make that distinction without retaining a body, raw header, status text or URL. A status alone will still not establish the full hosted cause.

The existing private HttpResponseRefusalDetail object gains status. Its single existing status getter read is retained; only integers in 0..599 enter the frozen diagnostic. Zero accommodates native opaque/error responses. Invalid stand-in numeric metadata yields no detail and keeps the original refusal. The ordinary strict admission expression, request bytes, headers, credentials, redirect policy, cancellation and fixed GitRefusal remain unchanged. Metadata getter exceptions still cannot replace that refusal. The existing Scope observer already forwards the typed object, so no production forwarding change or extra response read is needed.

The current direct v2 fetch has no identified mismatch with the reviewed Git grammar: arbitrary-object want, advertised shallow/filter arguments and implicit SHA1 are supported by the specification. [Git protocol v2](https://git-scm.com/docs/gitprotocol-v2)

Cloudflare documents v2 fetch and repository read-token fetch permission, but not every shallow/filter combination. Those general claims do not prove this deployed exchange works. [Artifacts Git protocol](https://developers.cloudflare.com/artifacts/api/git-protocol/)

Workers sets Content-Length automatically for fixed TypedArray bodies. The current Uint8Array request provides no Source basis for a manual length-header repair. [Workers Request](https://developers.cloudflare.com/workers/runtime-apis/request/#set-the-content-length-header)

The existing Git diagnostic case adds the six text/plain 4xx specimens, preserving all earlier media, redirect, URL, cancellation, privacy and metadata-exception assertions. Nonfinite, fractional and out-of-range stand-in statuses cannot enter the diagnostic. The existing Artifacts Scope case now requires the exact 503 value in its forwarded snapshot. No case registration, deadline, request or native policy changes.

The cause remains unresolved. The earlier read-only Source diagnosis is 6755bf8bb3415e14c535e4b8b8a3d111e7bf452e under request 47e150155104ba77f05cb98c1dc00e63d5e3daf2 and promise 10a7322f1bf7e011f9636502117deee0896230dd. It found no auth drop, body rewrite or supported protocol fallback. This diagnostic is the smallest supported next step before another planner-owned tail; no hosted calls occurred during preparation.

## Focused checks

The focused run used clean `5d7eda5dbefca177ec1921002c2a2696beb13e8f`
(tree `c23e37ee99d4a6cf76e21dc909d2b59b0629decc`). Git test, Scope
production and Scope test compilers all exited 0. The whole Git14 and Scope12
baseline passed all 26 cases. The status-field omission control then ran the
whole Git14 file: 13 passed and the existing bounded-response case failed
with the intended raw `AssertionError`, because exact status 201 was absent.
Later assertions in that failed case are established by the baseline, not
by the control. Both runs have complete ready/result/final case identities,
no unhandled errors and no signals.

Root observed original session 58972 close naturally with exit 0 (tool
chunk `297970`). Owner PID 4565 recorded baseline child 4840 exiting 0 and
control child 6222 exiting 1. Owner wall time was 26.616 seconds; inclusive
CPU was 30.759 seconds. These totals include guards and nested children;
do not add overlapping child costs again. The original raw result is
`/private/tmp/artroom-archive-post-status-owning-evidence-20261023-v2/result.json`
(5,363 bytes, SHA-256 `b6afd46f8051c166ca8e925d6041e210e51b911d9b6ed503321ec773155bf737`).

Full fixed Source, dependency, external-tool, environment and checkout
guards match. The only temporary Source change was the exact planned
control omission; the original bytes, physical descriptor and clean status
were restored. Declared generated cache/temp allowances were recorded
separately; this is not a claim that cache bytes stayed unchanged. Root
and independent retained-data audits agree on the raw case identities,
control failure and restoration. Their exact file pins are recorded below.

The first owner Source version was held unexecuted after a restoration
review finding. V2 corrected it before capture and execution. This was a
Source correction, not a failed runtime or a test retry.

## Remaining work

The ordinary gate passed at the same tested checkpoint. Final review and
the planner-owned deployed tail remain pending. The diagnostic still does
not establish a hosted cause or change request/admission behavior.

## Frozen owning evidence

The focused evidence is retained separately in
`/private/tmp/artroom-archive-post-status-owning-review-data-20261023-v1/manifest.json`
(128,606 bytes, SHA-256
`ebaf6d7ad80be9e929665a97515e66fb9b3ae9a966ff01ca57dc1fce7b4c8702`).
Root observed copy session `c1df11` close naturally with exit 0. The packet
contains 139 enumerated inputs plus closure records and manifest: 142 leaves,
105,166,890 bytes. It includes the correction identifying the original
508-byte compiler plan. This is an owning-evidence freeze, not an ordinary
gate result or hosted acceptance.

Every copied program and Source proposal is permanently inert DATA. The
packet grants no execution, import, application, adjacent-file or transitive
read rights. Copying preserves closed successes and intended failures; it
does not create new validation. The ordinary gate evidence remains outside this owning-only packet; its
separate freeze is now complete and cited below.

## Ordinary gate

Root observed original session 38936 close naturally with exit 0
(tool chunk `ce4414`). The npm gate child 19757 exited 0 without a signal.
All eight stages passed: whitespace, commit messages, commit-test, helpers,
citations, cite-test, typecheck and test. The framework completed exactly
3,502 unique case identities across 487 files: 3,499 passed and the same
three planned cases skipped, with no unhandled errors. The Node groups
passed 4, 7, 37 and 55 cases. These are actual outcomes, not static counts.

The raw progress has 3,482 ready and 3,482 result callbacks. Twenty final
identities lack each callback type. Final framework rows match the complete
reviewed identity/state ledger; absent callbacks remain reported gaps, not
inferred starts or proof of teardown drain.

The retained-data audit found no evidence issues and reconciled the complete
fixed Source, external tools, environment, checkout/Main refs and dependency
namespace. The sole dependency change was the declared existing Vitest
results cache. The gated head/tree remain
`5d7eda5dbefca177ec1921002c2a2696beb13e8f` /
`c23e37ee99d4a6cf76e21dc909d2b59b0629decc`. This report-only successor
changes no tested code, test or seal; no healthy gate repeat follows.

Outer wall time was 1,250.943 seconds and inclusive CPU was 1,455.837 seconds.
The gate child used 1,248.365 seconds wall time. Child and stage costs overlap
the outer totals and must not be added again. The audit was run only after
closure, under root's separate command `dae08c`, which exited 0; original natural closure
remains root-observed, not an auditor wait of the original process.

Audit: `/private/tmp/artroom-archive-post-status-final-gate-independent-audit-20261023-v1.json`
(39,540 bytes, SHA-256
`42fa2c151ec2f40467585410b055d2c08544f8f31dd337d5e1534dde7ddc0d2b`).

The separate gate evidence freeze completed under root's original copy
command `8fa8ad`, which closed naturally with exit 0. Its manifest is
`/private/tmp/artroom-archive-post-status-final-gate-review-data-20261023-v1/manifest.json`
(45,152 bytes, SHA-256
`b76e040eb5b57e97720d609c03a56a49fc1e8f312b4ecef5d7881c92aa77dde9`).
It contains 47 enumerated inputs plus two closure copies and the manifest:
50 leaves, 36,272,065 bytes. The independent copy audit is complete:
`/private/tmp/artroom-archive-post-status-final-gate-release-independent-audit-20261023-v1.json`
(2,574 bytes, SHA-256
`1ab20e7493d25f79ceb54fe1df5fff2b54f3abdab7a60152b9d4ed818104892f`).
This gate packet and the
owning packet remain separate; all copied programs are permanently inert
DATA with no execution, import, application or transitive read rights.
Neither packet establishes a hosted probe, deployment or provider cause.
Final review and the planner-owned deployed tail remain pending.
