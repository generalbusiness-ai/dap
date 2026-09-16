# Club A5 negative evidence

These are measured outputs from source snapshot
`e627460daf788d6dbf6d3f8cbaa28f8f0fc0368b`, added after checker #1805.
They do not change the original manifest or its predeclarations.

Each JSON file retains the full linked trace, the original policy
expectation, observed outcomes for five readers, invariant findings and
a deletion-minimal invariant failure. The full traces show two effective
votes and an effective admit naming something that is not an effective
application, followed by a Member grant. The minima can end at the first
incorrect vote; the full traces retain the admission/grant evidence.

At that snapshot, run `node --test test/club-a5.test.ts` from `spike/`.
The test verifies that the independent invariant rejects each trace and
that reader agreement does not establish the policy. A child TODO asserts
the original requirement: both votes and admission must be ineffective,
and no admission grant may follow. All three TODOs execute and fail.

`steps` and `minimal` use `corpus/club/replay.ts`'s linked format. Stored
entry ids are labels from the full trace; replay remaps references when
deletion changes a position or id. All three minima were checked for
single-deletion minimality before these output records were committed.
No policy repair is commissioned.
