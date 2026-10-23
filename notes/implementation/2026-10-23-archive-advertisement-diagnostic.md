# Artifacts advertisement refusal diagnostic

This change distinguishes fixed Git v2 advertisement rejection branches. It does not establish which bytes the hosted Artifacts endpoint returned, change protocol acceptance, or add a fallback. Independent Source review found no mandatory issue. Local verification is in progress.

Request: `489ad7c9e2c432fc4cac8a20c58fdf62bf6bde4f`. Promise: `5879139ed024aefa7d86caad83a757a36fb0a652`. Original diagnostic basis: accepted Main `132a5e2afe9cdfddbc81ed434eb9a6dbd48ca2b6`.

The candidate fast-forwards to accepted K9 Main `84213a7b8c08089fe5afb60ed163d7a484e7ee84` before verification. All five authored paths were unchanged on that Main interval and preserved byte-exact across the fast-forward; only this note records reconciliation. All accepted Main paths outside these five remain exact, including the new validator/corpus and generated Page asset. Root package, lock and existing D1 map are unchanged. Local checks and the gate remain unrun on this candidate.

## Hosted observation and limits

Planner observation `359cf2d38d8aa224c81659d89fa93564d6d808db` reports Grow version `9c2b53e3` verified 11 of 11 and continued writes, but 21 archive passes across five journals stopped at the first parent advertisement response. The existing diagnostic says `advertisement`; it groups several fixed refusal words. It does not prove the endpoint ignored `Git-Protocol: version=2` or returned a v0 advertisement.

The Artifacts archive adapter selects v2 for isolated object reads. The request carries the version header through the unchanged provider/observer fetch chain. Existing HTTP status, media, redirect and response URL guards precede capability parsing. Legacy ref reads remain separate. Local Git tests explicitly forward the version header to Git; the Artifacts stand-in fabricates its response from that header. Neither demonstrates the hosted service's response.

## Diagnostic boundary

A private WeakMap associates a frozen pair of fixed words with the original Git refusal. Its read-only accessor returns a value only for errors created at the named v2 advertisement sites. The GitRefusal class, reason, what and message remain unchanged. Unknown caller properties cannot inject diagnostic text.

`subtype` identifies first-frame kind/version, trailing bytes after flush, capability packet kind, invalid capability name/value character, empty name/value, or repeated fetch/object-format capability. `firstFrame` is one of `version-2`, `service-upload`, `error`, `other`, or `non-data`. Classification compares bounded fixed literals or the fixed `ERR ` prefix on the already-owned buffer; it does not decode or retain response text. A service marker identifies only that marker, not v0 protocol as a whole.

Malformed packet framing, unsupported object format, absent shallow/filter features, HTTP errors and deadlines retain their existing separate refusals. Bare fetch/object-format handling is unchanged. No URL, object ID, ref, credential, capability value, response body or arbitrary error text enters the marker. There is no extra request, clone, body read, retry, budget charge or fallback. The few fixed comparisons and error-only metadata allocation add diagnostic overhead; they are not admission or performance proof.

The existing parent-read snapshot conditionally includes `advertisement`. Every new ordinal starts without it. The same closed/ordinal guard prevents a late response from changing a frozen pass or later read; successful and unrelated refusal snapshots retain their existing shape.

## Planned owning evidence

The existing Git rejection matrix now asserts exact fixed details while retaining one GET, no POST/fallback, original generic refusals and immutable detail. The existing Scope parent-read witness uses an explicit service-prefixed fixture response to assert projection through the actual adapter, original request/receiver, one GET, and frozen late-completion behavior. This fixture is not a claim about hosted bytes. Existing positive v2/object/hash/type/deadline witnesses remain intact.

Planned checks: Git test compiler (also owns production Source), distinct Scope production/test compilers, complete Git HTTP file and complete Scope archive-host file. At the initial Source handoff, no dependencies had been installed or adopted and no parser, compiler, test, control or gate had run. Root has since adopted a private copy of the closed protocol checkout’s dependencies; no installer ran. A single later meaningful control may omit the annotation WeakMap.set: the generic refusal must remain while the exact diagnostic witness fails, followed by exact restoration. Root allocates checks and one ordinary final gate; the planner owns deployment and later hosted observations. The candidate now includes accepted K9 Main `84213a7b8c08089fe5afb60ed163d7a484e7ee84`; later Main changes require source reconciliation before final binding.

## Initial owning attempts

The first owner stopped before launching a project child because its sandbox capture and local-test launch differed at `CODEX_SANDBOX`. The corrected context retained the full environment guard. The next attempt passed compatibility preparation, the Git test compiler and the Scope production compiler, then the Scope test compiler reported TS18047 at the new reset assertion: its result could be null. The assertion now checks the returned object directly against `{ type: "commit" }`, so null still fails the intended witness. No baseline, control or gate ran in these attempts. The failed attempt and successful earlier compiler results retain their original attribution; continuation starts with the repaired Scope test compiler.
