# O4 development findings before the certificate decision

These are development tests of the initial `scope-proof.ts` helper, not a
frozen O4 lifecycle measurement. The source and test are retained in the
commit introducing this record. The helper and test matched those used by
the runs; other uncommitted runtime files were being developed concurrently,
so the logs are not attributed retroactively to a clean whole-tree snapshot.

Twelve actual signed-journal proof checks: seven passed, five failed. The
helper accepted top-level private extras and proofs omitting an attach,
grant, revoke or withdrawal body while retaining its header. The omission
diagnostics demonstrate restored capability after hidden revoke and a false
effective acceptance after hidden withdrawal. No expected lifecycle result
was substituted for a source fold.

Root escalated the completeness proposal under workroom request
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:8a1f2a6564492e67c2ea4af0f2379255748793ea`.
A certificate prototype is permitted, but a formal O4 baseline awaits the
checker decision about the frozen manifest. The source writer would attest
the public opening set's completeness, not release effectiveness; the
recipient must still authenticate and replay source semantics and grants.

`lifecycle-dev1.txt` is the first development lifecycle comparison at source
`051472e` and historical manifest `63be83e6`: 25 passes, 3 failures across the
healthy test (all 20 boundaries) and 27 adverse tests. Failures were a missing
fixture recovery grant, an incorrect fixture assertion that unauthorized
system scope releases have narrow audiences, and the historical `closed`
expectation versus the unchanged Sale model's `not_open` reason. This is a
recorded development run, not the revised formal O4 baseline.

`public-proof-cert-tests.txt` records the helper's 26-pass development run.
Its exact test blob is `55c2120b9ad746564c5455dc38b955e2956eea08` and scope-proof
source blob is `cfb16f09b4e6adc9a3a5222515bf2e1cf35380db`. Other O4 fixture files
were being edited concurrently; this is a file-boundary record, not a
whole-tree snapshot claim. It turns the original five omissions/extras
failures into verified rejections and records the dishonest-writer limit.

The earlier assumption that unauthorized `dap.scope.release` becomes actor-only
is withdrawn: the existing foundation keeps this system kind on the spine.
The real hostile release is therefore honestly certifiable, and independent
scope replay returns `unauthorized_release`. The producer's narrow-audience
refusal remains tested for application kinds with attach ceilings.

`evidence-dev1.txt` records source `df68429`: 4 passes and 2 failures. A wrong
release pointer to a hidden observe position failed earlier at
`ineffective_release` than the test expected. The materialized-genesis driver
omitted its participant transport credential and therefore received an
admission refusal before it could test destination binding. Both are driver
issues; neither was converted into a false no-activation success.

`evidence-dev2.txt` records the next development check: 5 passes and 1 failure.
Relative to `df68429`, the test corrected the transport credential and allowed
the observed earlier hidden-position refusal; runtime source was unchanged.
The changed-genesis driver then correctly failed on removing Alice's grant:
the valid changed genesis made activation `unauthorized`, preceding destination
comparison. Root chose to preserve authorization ordering and amend the
pre-baseline expectation, not invent a new profile validity constraint.

`evidence-dev3.txt` records source `1a337d0`: 7 passes and 1 failure. Both
actual withdrawal branches passed. A malformed replacement of the genesis
origin array reached Journal's missing-origin-proof guard, which the test
did not recognize. The next source adds a strict origin-body shape check in
the selected scope profile before any journal is created; unexpected errors
still fail the mutation campaign.

`evidence-dev4.txt` records source `09ca8ea`: 8/8 pass, including all materialized
genesis mutations, both real withdrawn-source branches and the revised
changed-grant authorization precedence. This remains development evidence.

`attached-handler-repro.sh/.txt` preserve independent helper QA at exact clean
source `df68429b44d168444b7013ab77ae8f697f9f639b`. A signed SQLite branch attached
an additional refusing handler at S18; the base composite verdict refused at
S19, but ScopeJournal incorrectly spent R_fulfil. The probe uses the retained
scope-proof test module as the synthetic descriptor's hash anchor. The first
probe attempt stopped on a non-file module URL before creating a world; the
kept script is the successful reproduction. The correction requires every
other handler to be effective before replacing Scope's own placeholder
verdict and has a live/cold regression on both backends.

`regressions-dev1.txt` records source `9567950` after integrating O3 `c527584d`
and O1 repair `03a943dd`: 4/4 pass, including attached-handler live/cold refusals
on memory and SQLite, original Sale 0–19 outcomes/readability and exact
pre-attach view replay. The merge keeps O3's control admission and verdicts
while adding O1's private backend lease and both error invalidation paths.
