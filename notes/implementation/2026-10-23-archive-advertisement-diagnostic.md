# Artifacts advertisement refusal diagnostic

This change distinguishes fixed Git v2 advertisement rejection branches. It does not establish which bytes the hosted Artifacts endpoint returned, change protocol acceptance, or add a fallback. Independent Source review found no mandatory issue. The focused checks and the repository gate passed.

Request: `489ad7c9e2c432fc4cac8a20c58fdf62bf6bde4f`. Promise: `5879139ed024aefa7d86caad83a757a36fb0a652`. Original diagnostic basis: accepted Main `132a5e2afe9cdfddbc81ed434eb9a6dbd48ca2b6`.

The candidate was based on accepted K9 Main `84213a7b8c08089fe5afb60ed163d7a484e7ee84` before verification. All five authored paths were unchanged on that Main interval and preserved byte-exact across the fast-forward; only this note records reconciliation. All accepted Main paths outside these five remain exact, including the new validator/corpus and generated Page asset. Root package, lock and existing D1 map are unchanged. The focused continuation below ran on the repaired candidate; the gate is a separate obligation.

## Hosted observation and limits

Planner observation `359cf2d38d8aa224c81659d89fa93564d6d808db` reports Grow version `9c2b53e3` verified 11 of 11 and continued writes, but 21 archive passes across five journals stopped at the first parent advertisement response. The existing diagnostic says `advertisement`; it groups several fixed refusal words. It does not prove the endpoint ignored `Git-Protocol: version=2` or returned a v0 advertisement.

The Artifacts archive adapter selects v2 for isolated object reads. The request carries the version header through the unchanged provider/observer fetch chain. Existing HTTP status, media, redirect and response URL guards precede capability parsing. Legacy ref reads remain separate. Local Git tests explicitly forward the version header to Git; the Artifacts stand-in fabricates its response from that header. Neither demonstrates the hosted service's response.

## Diagnostic boundary

A private WeakMap associates a frozen pair of fixed words with the original Git refusal. Its read-only accessor returns a value only for errors created at the named v2 advertisement sites. The GitRefusal class, reason, what and message remain unchanged. Unknown caller properties cannot inject diagnostic text.

`subtype` identifies first-frame kind/version, trailing bytes after flush, capability packet kind, invalid capability name/value character, empty name/value, or repeated fetch/object-format capability. `firstFrame` is one of `version-2`, `service-upload`, `error`, `other`, or `non-data`. Classification compares bounded fixed literals or the fixed `ERR ` prefix on the already-owned buffer; it does not decode or retain response text. A service marker identifies only that marker, not v0 protocol as a whole.

Malformed packet framing, unsupported object format, absent shallow/filter features, HTTP errors and deadlines retain their existing separate refusals. Bare fetch/object-format handling is unchanged. No URL, object ID, ref, credential, capability value, response body or arbitrary error text enters the marker. There is no extra request, clone, body read, retry, budget charge or fallback. The few fixed comparisons and error-only metadata allocation add diagnostic overhead; they are not admission or performance proof.

The existing parent-read snapshot conditionally includes `advertisement`. Every new ordinal starts without it. The same closed/ordinal guard prevents a late response from changing a frozen pass or later read; successful and unrelated refusal snapshots retain their existing shape.

## Owning evidence

The existing Git rejection matrix now asserts exact fixed details while retaining one GET, no POST/fallback, original generic refusals and immutable detail. The existing Scope parent-read witness uses an explicit service-prefixed fixture response to assert projection through the actual adapter, original request/receiver, one GET, and frozen late-completion behavior. This fixture is not a claim about hosted bytes. Existing positive v2/object/hash/type/deadline witnesses remain intact.

The owning checks cover the Git test compiler (which includes production Source), distinct Scope production/test compilers, the complete Git HTTP file and the complete Scope archive-host file. Root adopted a private physical copy of the closed protocol checkout’s dependencies; no installer ran. The planner owns deployment and later hosted observations. The candidate includes accepted K9 Main `84213a7b8c08089fe5afb60ed163d7a484e7ee84`; later Main changes require source reconciliation before final binding.

## Initial owning attempts

The first owner stopped before launching a project child because its sandbox capture and local-test launch differed at `CODEX_SANDBOX`. The corrected context retained the full environment guard. The next attempt passed compatibility preparation, the Git test compiler and the Scope production compiler, then the Scope test compiler reported TS18047 at the new reset assertion: its result could be null. The assertion now checks the returned object directly against `{ type: "commit" }`, so null still fails the intended witness. No baseline, control or gate ran in these attempts. The failed attempt and successful earlier compiler results retain their original attribution; continuation starts with the repaired Scope test compiler.


## Successful focused continuation

Root session `7889` closed naturally with exit 0 on commit `094565c2bf35b3aa020f85b3ad00ffaf7cad5185`, tree `376771eebddaec938d671581111c7d209065d8c0`, under allocation `0e95b1798689f8c20e2ef9003ea481f13267d3a9`. The repaired Scope test compiler passed. The complete two-file baseline passed all 25 cases: 13 Git and 12 Scope cases.

The sole control omitted the private annotation insertion while preserving generic refusal. Its child exited naturally with 1: 23 cases passed, and the existing Git capability matrix and Artifacts parent-read witness failed their exact diagnostic assertions. Original stderr identified both as `AssertionError`; JSON and terminal framework identities agreed. Neither run had an unhandled error or missing ready callback. The original source bytes were restored before the owner returned. Raw evidence is `/private/tmp/artroom-archive-advertisement-owning-20261023-v3`; the prior attempts remain at the sibling `v1` and `v2` paths.

The continuation took 26.3693 seconds elapsed and 30.6850 seconds inclusive CPU. Its compiler took 0.7254 seconds; baseline 7.9906 seconds; control 6.1170 seconds. These child intervals are inside the owner total and must not be added to it. This was a shared macOS development host with an adopted private dependency pool and existing caches, not an isolated performance comparison. The earlier failed compiler attempt cost 10.9627 seconds elapsed and 14.8954 seconds inclusive CPU; the preflight-only failure cost 5.9998 seconds elapsed and 4.1782 seconds inclusive CPU.

The focused evidence establishes local diagnostic projection and refusal preservation. It does not identify hosted response bytes or establish archive progress.

## Repository gate

The one ordinary `npm run gate` passed on commit `44b415d149a2ff2f6413ab04c3d67cdbefebe7ba`, tree `56466a0b2308cb09155577a9a07c30f61e48f2c7`, under allocation `1d9caf068e9372144827f347f3c6290fe81e5e79`. Root session `1342` and gate child `70782` both ended naturally with exit 0. Whitespace, commit messages, commit tests, helpers, citations, citation tests, typecheck and tests all passed. Vitest reported 3,495 passed and three skipped cases across 485 files; the separate Node checks passed 37 cases and Counting passed 55. These are local checks, not browser or hosted acceptance.

The progress ledger has all 3,498 unique final case identities and no unhandled error. It has 3,486 ready callbacks and 3,484 result callbacks: 12 and 14 passed cases lack those intermediate callbacks. Final results are complete; intermediate progress coverage is not. No extra run was used to fill these reporting gaps.

The before/after comparison preserves all 2,929 source entries, 218 external tool entries, 2,414 npm namespace entries, environment, resolvers, head, tree and clean status. Among 6,072 dependency entries, only the approved Vitest results cache changed, on the same inode. Owner errors and received signals are empty. Raw gate evidence is `/private/tmp/artroom-archive-advertisement-final-gate-20261023-v1`.

The gate child took 1,215.6128 seconds elapsed and 1,417.7389 seconds CPU. The outer owner, including metadata checks, took 1,217.8749 seconds elapsed and 1,419.3968 seconds inclusive CPU. Its test stage took 1,198.28 seconds elapsed and 1,372.26 seconds CPU. These nested intervals overlap and must not be added. The host and cache qualifications above still apply.

The final reporting commit changes only this note after the gated tree. All four implementation and test files remain byte-exact, so the healthy gate is not repeated. The frozen review packet retains the original failed attempts, successful continuation, gate, bindings and immutable source copies. The planner owns deployment and the next hosted observation; this diagnostic alone does not correct or identify the hosted advertisement response.
