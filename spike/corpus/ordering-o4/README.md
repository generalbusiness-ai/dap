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
