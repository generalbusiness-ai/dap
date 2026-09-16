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
