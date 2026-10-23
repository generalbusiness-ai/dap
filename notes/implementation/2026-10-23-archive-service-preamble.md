# Archive: exact HTTP service preamble before protocol 2

Request `4310427f713429ad268790ced91e1b1b14ff19c9`; promise `9b7471a16ba3f5abae44e6659b44f3cefcd7fd13`. Implementation against accepted Main `27abf6d90db7df1d459ff3da023e09324a89c53a`, applied in an isolated checkout. The focused compilers, baseline and ordinary gate passed. The control produced the intended assertion; its collector also failed on a wording mismatch, retained below.

Planner observation ac4a8cf8 reports 41 first-parent refusals at first-frame-version/service-upload. That proves the service marker appeared; it does not establish the protocol after it. This change accepts exactly one '# service=git-upload-pack' data packet with an optional terminal LF followed by one flush, then requires the existing protocol 2 advertisement. Direct protocol 2 remains supported. No protocol 0 fallback, extra request, provider-text decoding or credential handling is added.

Git's HTTP specification describes service-line/flush framing; its protocol 2 HTTP example starts directly with version 2. This compatibility extension accepts the explicit combination requested by planner, not a claim that the protocol 2 example mandates a preamble. Sources: https://git-scm.com/docs/http-protocol (Smart Server Response); https://git-scm.com/docs/protocol-v2 (HTTP Transport, Capability Advertisement).

The two extra frames count against the existing packet limit and use the same owned response bytes/deadline. Required flush, truncated frames, duplicate service marker, protocol 0 refs and all capability/object/hash/type checks remain fail-closed. Fixed optional postPreamble distinguishes version-2/protocol-0-ref/other/non-data only; no raw line or identifier is retained. Version 2 followed by a malformed capability exposes version-2 as diagnostic context, while successful exchanges need no refusal marker. Missing/truncated packet grammar retains its existing generic framing refusal.

## Focused verification

The tested source checkpoint is `a03d3153dbd2fb09ebb33fa799cb3fff8267089d`, tree `241caf2776b88666fde621bcc40821e8b80979c7`. This report-only update leaves all code and tests unchanged. None of the changed paths owns a mapped security source seal.

Private dependency adoption completed in root session `25064`, with both copy children exiting zero. Root and fourteen workspace manifests plus the lock matched the closed donor. The target contains 6,072 records: 5,499 independent regular files, 541 directories and 32 contained relative links. The lock stamp was copied last. This adopts the existing hidden lock, caches and compatibility bytes; it is not a fresh install or a new compatibility test.

The baseline in root session `3863` ran the Git and Scope test compiler roots, then the complete Git HTTP file (13 cases) and Scope archive-host file (12 cases). All four children exited zero and all 25 cases passed, using the maintained configurations and deadlines. The successful exact-object witness covers the service marker with and without LF, each in exactly one GET and one POST. The refusal tests retain strict framing and fixed post-preamble diagnostics. Scope checks carry those diagnostics through the actual archive transport boundary; they do not prove a live provider response.

The separate control changed only `if (postPreamble !== "version-2")` to `if (postPreamble !== "version-2" || firstFrame === "service-upload")`. The same whole Git file produced 12 passes and the intended failure in its sections/sidebands case. Original stderr records `AssertionError` at `http-read.test.ts:522:35`: the prefixed-object promise was rejected instead of resolving. Negative diagnostics and direct protocol 2 cases still passed. Assertions after that first failure, including the second marker-LF variant, remain baseline-only evidence.

Child `8233` exited one. Root session `7413` also exited one because the collector incorrectly required the word `resolved` in the JSON message, whose wording is `resolving`. The original stderr, JSON, progress and collector error are preserved; this was not rerun. The exact original production bytes, mode and inode were restored. The result is a meaningful negative with a separate collector defect, not a passing control wrapper.

Full source, dependency, tool, environment and ref guards were retained across these runs; only the allowed Vitest result cache changed during tests. Raw evidence is in the three explicit external directories `/private/tmp/artroom-archive-service-preamble-adoption-20261023-v1`, `/private/tmp/artroom-archive-service-preamble-baseline-20261023-v1` and `/private/tmp/artroom-archive-service-preamble-control-20261023-v1`. Wall/inclusive CPU seconds were respectively 5.0862/4.6619, 16.0205/19.3656 and 5.6193/5.8752 on the shared macOS host with inherited caches. Owner totals include nested child work; do not add those overlapping intervals.

## Gate and review evidence

The ordinary gate passed at `eef72769e72515a985191816b469c24c69d222cd`, tree `3227ed32cae1bd43b74db0cc4fded66e2b02974b`. Root session `92235` and child `29743` exited naturally zero. All eight stages passed. Vitest recorded 3,495 passed and three skipped cases across 485 files, followed by 37 passed Node checks and 55 passed Counting browser checks. The complete 3,498-case identity and state multiset matches the prior accepted archive gate. There were no unhandled errors or signals.

The progress stream omitted 20 ready callbacks and 21 result callbacks for cases with terminal framework records. These remain reporting gaps; they do not prove a missing start or physical draining. All bound source, environment, tool, npm, ref and working-directory records were unchanged. Only the existing Vitest results cache changed, retaining its inode. Independent audit `ff860b4cf036bb649ae5da0acfe48fbee56b05a9` confirms the raw results and guards.

Gate wall time was 1,178.6928 seconds and inclusive CPU time was 1,377.3036 seconds on the shared macOS host with inherited caches and concurrent isolated development work. The gate child took 1,175.6943 seconds; its user and system CPU times were 1,211.7710 and 163.7469 seconds. These are nested, overlapping costs.

Two finite, read-only evidence packets retain the original results, failed collector and independent audits. Their helper copies are inert data and must not be executed or imported:

- Focused packet: `/private/tmp/artroom-archive-service-preamble-review-data-20261023-v1/manifest.json`, 82,454 bytes, SHA-256 `df0b556b3a43293a9b46499c5fedc59db1a3b6a511a347ce0ec4d6e0ab681eb4`; 97 leaves containing 82,819,312 bytes.
- Gate packet: `/private/tmp/artroom-archive-service-preamble-gate-review-data-20261023-v1/manifest.json`, 33,568 bytes, SHA-256 `90dc80a651bcef91b751f421e7e44cb54d2c124b27fb74d90e457efda411e01f`; 33 leaves containing 33,256,916 bytes. Captured stage files retain the original claimed hashes and their distinct-copy qualification.

This final update changes only this report. Code and tests are identical to the gated tree. Under `docs/testing.md`, the healthy gate is carried forward without a repeat; the final review receipt supplies the report-only tree and direct documentation checks. Independent exact-head review remains required before landing and pushing. The planner owns deployment and hosted observation. No hosted success is claimed.

If the deployed service sends protocol 0 refs after its preamble, this candidate diagnoses protocol-0-ref and still refuses. It does not unblock hosted archive step 6 in that situation. Hosted protocol 2 and successful archive work remain unproved.
