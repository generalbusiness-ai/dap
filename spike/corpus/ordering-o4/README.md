# O4 reproduction and evidence

The formal records are in `../../manifests/ordering-o4-runs`. Each run JSON
names the exact source commit, lifecycle manifest, opening rule, runtime and
package content ids. Check out that source before replay: the scope profile
intentionally rejects evidence for a different implementation identity.
Do not replay historical packets with today's runtime and call the result a
reproduction. Earlier contracts remain in their original source commits.

Run 1 source is `ee86290f753cbfe3efcd9dcbb3128697d6b38016`; run 2 source is
`b35b267ea5392e5361905018ee350ec4df07aa55`. In a detached worktree at the named
source, install the locked dependencies with `npm ci --prefix spike`, then:

```
DAP_O4_RECORD_DIR=/tmp/o4-reproduced-observations node --test \
  spike/test/scope-proof.test.ts \
  spike/test/ordering-scope-lifecycle.test.ts \
  spike/test/ordering-scope-evidence.test.ts \
  spike/test/ordering-scope-regressions.test.ts
npm run typecheck --prefix spike
npm test --prefix spike
```

Use a new observation directory. The sink writes canonical JSON with actual
states, receipts, identities and public proof bytes; optional JavaScript
`undefined` diagnostic fields use the explicit marker `{"$undefined":true}`.
This diagnostic encoding is separate from the strict signed-wire codec.
No expected state is fed into the scope runtime. Genesis mutation records
retain each path, operation, actual verdict or recognized diagnostic.

The healthy records contain all 20 observed boundaries and the actual
complete signed F genesis. Each source release names its commitment.
The 27 adverse-case records retain every attempted action, receipt/verdict,
head, owner and right status for memory and SQLite. Two mutation records
cover all 209 fully materialized variants on each backend. The historical
115-template mutation cases were expectations only; this count is generated
from the larger actual signed genesis rather than that abstract template.

`scope-proof.test.ts` covers strict certificate/packet shape, missing public
openings, frontier writer authority through handover, narrower audience
refusals, member detection of dishonest signed omissions, dependency replay,
and full/public verdict differentials on both stores.
`ordering-scope-evidence.test.ts` adds actual revoked-release and withdrawn-o3
source branches, destination activation failures, r=p+1/source-prefix pins,
later-frontier proof equivalence, byte-level privacy, and materialized genesis
mutations. `ordering-scope-regressions.test.ts` preserves base composite
handler refusals, stale bindings, cold replay, the original Sale trace and
pre-attach as-of views.

The alternate-source utility creates explicit fork/fault fixtures from actual
signed prefixes. It never changes the healthy branches' heads. Later-frontier
proof material is a real signed extension with an already-released semantic
refusal. Bad-release proofs contain actual signed attempts and their grant
history. A faulty-writer certificate helper is labeled separately from the
honest producer; the producer continues to refuse narrower authority bodies.
A writer who signs omitted public bodies lies outside the completeness trust
guarantee. That is a retained negative, not a destination effectiveness oracle.

Development snapshots, scripts and raw outputs are in `development/README.md`.
The retained attached-handler shell probe records its original fixed working
directory; to replay it elsewhere, point that `cd` at a detached worktree of
its stated `df68429` source. Running it against repaired source demonstrates
the correction, not the original failure.


The goal-1 followup preserves the original full-suite source and adds a
bounded historical matrix at `faf26c07d1cadf073a92bac0bb7b01ed3d6333ec`.
Run `node --test spike/test/ordering-scope-regressions.test.ts` at that source,
optionally setting a new `DAP_O4_RECORD_DIR`, to reproduce run 4. It checks all
five actual source/destination participant readers at bases 0–10 and 0–19
after completed transfer on memory and SQLite, against captured actual signed
histories and independently executed original Sale projections/outcomes.
The two matrix files are source-history audit records, containing each
reader's legitimate source view and full synthetic source folds; they are
separate from the public transfer proof and destination-view packets.


For the G1/G2 revision, use the exact run-5 source in its JSON record. The
manifest is `d94090b2`, with 29 adverse branches. Include
`spike/test/ordering-scope-phase.test.ts` alongside the four earlier O4 test
files to exercise admitted intervening events, failed and successful exact
retries, closed/authorization gates, malformed packets and post-commit error
recovery. Run 5 measures that focused subset within one full noncampaign run:

```
DAP_O4_RECORD_DIR=/tmp/o4-g2-observations node --test \
  --test-skip-pattern='case [57], the campaign:' 'spike/test/**/*.test.ts'
npm run typecheck --prefix spike
```

The three 200-seed campaigns are explicitly excluded from this run. Their
last O4 full measurement remains source `b35b267`, before G1/G2. New observation
files include the committed failure envelopes and real cold-retry result;
deterministic handler exceptions remain failures, never policy verdicts.


Run 7 is the /3 movable-writer revision. Use its exact recorded source;
run-5/run-6 /2 packets remain historical. The lifecycle manifest and public
opening rule are unchanged, while the scope implementation and generated
context/export/proof identities change. The five O4 files can be reproduced
with a fresh observation directory:

```
DAP_O4_RECORD_DIR=/tmp/o4-v3-observations node --test \
  spike/test/scope-proof.test.ts \
  spike/test/ordering-scope-lifecycle.test.ts \
  spike/test/ordering-scope-evidence.test.ts \
  spike/test/ordering-scope-regressions.test.ts \
  spike/test/ordering-scope-phase.test.ts
npm run typecheck --prefix spike
```

The extra duplicate-commitment records contain explicitly faulty-writer
packets with real actor envelopes, newly signed headers and completeness
certificates. They retain actual destination refusal and the subsequent
honest activation. They are not honest producer outputs. This revision does
not overwrite any prior packet or rerun the historical campaigns implicitly.


Run 8 is the combined K1–K4 correction, measured at
`2ee1b43a9fc7c3af2b99d991f36d78a4dbcde443`. Its manifest is `a766fe56`,
opening rule `701403e9`, scope implementation `942f4d20`, Scope package
`0a3201ea` and Inspection package `18a886c1`; full identities are recorded
in `manifests/ordering-o4-runs/run-8.json`. All earlier runs retain their
original packages, rules and failure/source boundaries.

From that exact source and the repository root, reproduce into a fresh
external directory:

```sh
DAP_O4_RECORD_DIR=/tmp/o4-k1-k4-observations node --test \
  --test-reporter=tap --test-skip-pattern='case [57], the campaign:' \
  'spike/test/**/*.test.ts'
npm run typecheck --prefix spike
```

The retained `run-8-runner.py` accepts checkout, exact source SHA and a fresh
output-directory argument, verifies a clean frozen source before/after each
command, and captures identities and file hashes. `run-8-summary.mjs` derives
actual proof/context IDs and case counts from those observations; it does not
run a second lifecycle or supply expected outcomes. The 144 passing O4 checks
are a subset of the one 469-test noncampaign command, not an additional run.
The 92 new observations include K1 malformed-input continuations, K3 failed
member transfers and K4 derived disclosure. The K2 lookup-sweep counts are
in the raw TAP and run-8 JSON. Three 200-seed campaigns remain excluded.


L3 retains the unbound-member denial of certification at `e0467ae9` and
regression-only `cfeb3599` in `manifests/ordering-o4-runs/l3-before*`.
The original checker source is copied unchanged; fresh before outputs show
an effective D release stranded by proof refusal. New rule /3 and focused
signed observations are a separate component boundary, not new run-8 data.
Old /1 and both /2 rule declarations and their packets remain unchanged.
See the L3 ledger subsection for exact measured sources and commands.


The L3 focused run is `d987cd149c0fa0eda85235f0f8f10a56012d3bf2`:
55/55 and typecheck pass, with 14 signed observations under `l3-observations`.
From that source, run only the four focused files:

```sh
DAP_O4_RECORD_DIR=/tmp/o4-l3-observations node --test \
  spike/test/ordering-scope-unbound.test.ts \
  spike/test/ordering-scope-completeness.test.ts \
  spike/test/scope-proof.test.ts spike/test/ordering-lifecycle.test.ts
npm run typecheck --prefix spike
```

`l3-focused.json` pins source/runtime/test/manifest plus dependency and compiler
configuration hashes. It records the unchanged checker probe's fresh passing
output as a separate command, not extra tests in the 55-check count.


Run 9 is the combined L1–L3 repair at frozen source
`f8987d22890e7cf2471d7124544c539d69c0a835`, with opening rule `/3` (`9e9bcbdd`),
manifest `92ad0023`, scope implementation `cbc58a25` and Scope package
`21195fc7`. Full identities and actual backend/proof hashes are in
`manifests/ordering-o4-runs/run-9.json`; all 100 fresh observations and the
original process records are under `ordering-o4-runs/run-9/`.

The one noncampaign invocation produced a complete TAP report: 492 tests,
488 pass, zero ordinary failures, four retained Club TODOs, including all
167 O4 checks. **The wrapper then exited 1 while parsing a TAP-escaped V6
diagnostic. The Node child exit status was not persisted and remains unknown.**
The saved `runner-failed.py` and `wrapper-error.txt` retain that boundary.
`resume.py` re-parsed existing output, retained the problematic line verbatim
and ran typecheck only (exit 0); no tests were repeated. The raw result remains
unchanged, including `exitCode: null` for the noncampaign child.

The same noncampaign command shown for run 8 applies at this exact source
with a fresh `DAP_O4_RECORD_DIR`; the three named campaigns stay excluded.
The retained failed/recovery scripts document the actual measurement, not a
recommended reusable runner. `summary.mjs` only derives IDs and counts from
the completed observations. Package/lock/tsconfig hashes are now included in
the frozen source index. All 475 evidence files indexed from e046 remain
byte-identical; original component failures and rule versions are historical.


### M1 correction to run-9 record provenance

The run-9 paragraph above uses “original” and “unchanged” too broadly.
`resume.py` **created** `run-9/result.json` after the first wrapper had failed;
that file is recovered metadata derived from the saved complete TAP, plus
its own typecheck command. `wrapper-error.txt` is a later paraphrase, not an
original stderr capture. Read `result.json` → `unparsedDiagnostics` for the
exact parser error and retained raw diagnostic. The files themselves are
preserved unchanged; this appended correction does not relabel their origin.
The builder child's process exit remains unknown. The independent checker
later reran source `f8987d22` and head `15b660ca` with Node exit 0, but those
separate observations do not recover the earlier builder exit status.
The runtime id covers 16 named sources; the 94-blob run-9 index separately
pins broader source and configuration, including `observe.ts` and `corpus.ts`.
