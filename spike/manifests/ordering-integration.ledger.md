# O2, O3 and O5 integration record

This branch combines the existing implementations under their original
requests and promises; it creates no additional application protocol.

- O2 request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:98ff871890cf837d129fd08371ba3a0a83dce890`.
- O3 request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:5ac2d896497117bc9cae0ca5c8e9d6375d092de3`.
- O5 request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:8c67d385336192e5f19e60b4b9a82eeec1519d36`.

Integration merge `a3a8353106c23a38ccf81fa6bb4785927ca815aa` combines O5
candidate `598170fa5907655bc48c346a2dd4dd98853314a8` (which includes O2 and
O3) with corrected O1/V6 candidate `4cfc69376fbd513c4cacf5baa0d32c316797cf89`.
Original implementation branches and every historical run remain unchanged.
O1 is undergoing independent re-review; this integration is preparatory and
claims no review approval for any component.

The only conflict is in Journal's constructor and submission error handling.
The resolution acquires the private backend lease, authenticates the full
ordering chain, checks backendAssignment against its derived state, and
passes the lease into Context.restore. A failed construction releases that
lease. The submission path retains O3's explicit controlVerdict result; its
catch both marks needsReopen and invalidates the lease. O1's Context.submit
exception handler and raw/closed Context ownership checks are retained
unchanged. No other production edit or performance patch is included.

## Validation scope

The frozen integration will run the existing append, codec, journal,
lifecycle, retry, handover, independent control-verifier and actual-journal
control integration tests, followed by typecheck. This exercises the shared
append boundary, both backend ownership/error paths, process crash schedules,
control transitions and permission-isolated verifier subprocesses.

Another 600-seed campaign is deferred until O1's independent re-review returns
unless a concrete defect requires one. Earlier campaigns remain results of
their recorded source commits; none is relabelled as this integration's run.
This merge adds no further model, manifest, or corpus repair beyond the integrated O1/V6 corrections. The known Club
negative results and Sale budget overrun remain as reported in V6.

## Reporting paths

The O2, O3 and O5 implementation ledgers remain their respective reporting
artifacts at the common candidate head. Each points to this shared integration
record and keeps its own historical scope and measurements. This shared
record and its run outputs belong with O3's shared Journal integration; O2 and
O5 can cite them as supporting evidence without acquiring another promise.


## Focused integration run 1

Frozen source: `671400d8d44b661084918a2a70edb917662ec51e`.
All 138 focused tests passed, with zero failures, skips or TODOs; typecheck
passed. The groups were 62 append/codec/journal/lifecycle checks, nine O2
retry/admission checks, 12 O3 handover checks, and 55 O5 isolated-verifier
checks. Actual test duration was 1,839.4 ms on Node 26.8.2. Exact commands,
component heads, source and exit codes are recorded in
[run-1.json](ordering-integration-runs/run-1.json); the complete output is
[run-1.txt](ordering-integration-runs/run-1.txt).

The final record commit changes only this integration ledger, the three
component reporting ledgers and the two run records. Runtime and test files
remain exactly those of the frozen source. No test or protocol repair was
needed after the merge. A scoped whitespace check covers source, tests and
edited prose; raw historical diagnostics retain their original bytes.

All original O1/O2/O3/O5 branch tips remain unchanged. This candidate adds no
main merge, publication or review approval. The additional visibility campaign
remains deferred as stated above.


## G1/G2 integration boundary

The next integration combines the first common candidate
`3dc6b0953f91661edcc059b56157d349ff31c5b1` with O1 candidate
`aaa447d9e5ac4d88f07f144d46f2f5e63752c399`. O1's own combined measurement
belongs to `2c727b7d8db28c17b51a0aaa34ea5151f2eb44a4` and its run 14; the aggregate receives a separate frozen
source and focused run below. All earlier source identities and raw outputs
remain unchanged. This is preparatory integration pending O1 acceptance and
the independent reviews of O2, O3 and O5.

The only merge conflict is the profile's appended sections. The resolution
retains both O3's planned-handover profile and O4's completeness obligations,
including O1's exact-backend-object lease and raw-Context error boundaries.
The runtime merges without manual edits: Context's cached position/header
hash check runs inside append serialization before retry/admission; O3's
ordering gate remains after exact retry, followed by ordinary transport
admission for application events. Stale and errored Contexts become inactive.
Journal's existing ordering verification, lease handling and control verdicts
are unchanged. The lifecycle manifest is
`sha256:d94090b21ce42f2eec4a046558b3a776895d82905c2096a19df1f5f02e011f86`;
the public-opening rule remains
`sha256:475b415bbf8b16ccdb1bea078174712c57f2b2955ece9338d762abd60228bad8`.

The focused run will use run 1's eight test files plus the new
`test/context-freshness.test.ts`, followed by typecheck. This includes the
new raw/owned stale-fold and error regressions alongside retry, handover and
independent control verification. It does not execute O4 transfers or repeat
the 600-seed visibility campaign. Historical model outcomes and budgets
remain those reported in V6.


## Focused integration run 2

Frozen source: `2a57bd2ab0b1e30912f1e2bc044951d71477c5cc`. This is the single merge of final O1 candidate
`aaa447d9e5ac4d88f07f144d46f2f5e63752c399` into the first common candidate.
All **149 focused tests passed**, with zero failures, skips or TODOs;
typecheck passed. The groups were 73 append/codec/journal/freshness/lifecycle
checks, nine O2 retry/admission checks, 12 O3 handover checks, and 55 O5
independent control-verifier checks. Test duration was 2,197.2 ms on Node
26.8.2. Exact source, component heads, commands and exit codes are in
[run-2.json](ordering-integration-runs/run-2.json); raw output is in
[run-2.txt](ordering-integration-runs/run-2.txt).

The record commit adds only this ledger, the three component ledger links
and the two run records. No runtime or test changed after the frozen source,
and the focused run required no further repair. Original run 1 and every
component run remain byte-identical. No 600-seed campaign, O4 runtime result,
review approval, main merge or publication is claimed. The component reporting
artifacts share the resulting candidate and cite this exact boundary.
