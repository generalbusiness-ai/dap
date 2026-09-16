# O6 bootstrap demonstration and report

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:b269e2d81af32bdd4089968fd8a31065f44adcf8`.
Input: O5 candidate `598170fa5907655bc48c346a2dd4dd98853314a8`,
including O3, O2, O1 and V6.

## Declared demonstration

The new `test/fixtures/o6-bootstrap.ts` is an executable in-process route
registry. It reuses the ordinary v2 codec, Journal, SQLite, invitation
admission and recipient interpretation. It introduces no foundation kind,
admission rule, production dispatcher or network service.

The fixture signs standalone listing L before signing genesis G, which
adopts L. L contains no genesis reference. After Journal creation commits
both signed envelopes, the registry publishes their exact canonical bytes
as `{L,G,route}`. A newcomer reaches that route, receives Alice's actual
signed invitation, verifies its delivered journal view, and independently
signs a redemption using the published genesis and invitation. Admission
must succeed at position 3. The newcomer verifies the resulting headers,
actor signatures, origin adoption, interpretation and participant set.
An exact retry and another after SQLite close/reopen must return the same
receipt without adding entries, consuming another invitation or adding
outbox records. The complete demonstration must run in one process.

Negative cases reject noncanonical/malformed publications, extra fields,
signature tampering, an unadopted signed L, mismatched routes, a different
signed G, an unavailable route, a journal/envelope mismatch and route
replacement. Rejected resolution must leave the initial two-entry journal
unchanged. These checks precede invitation issuance.

Source will be committed before the first measured test and CLI execution.
Results, failures and any repair will be recorded separately. Final report
completion waits for O4's implemented lifecycle, actual measurements and
integration; its expected manifest alone is not evidence of goal 1.

## Limits

The registry trusts the published author's identity as a bootstrap input
and pins that envelope's genesis and initial writer before verifying the
view. It supports one signed listing, one author, one route and one local
database per context. A route is a discovery name, not a capability or
authority to substitute a genesis. The listing and genesis both sign it.

Keys are deterministic test keys. Route delivery uses direct calls, not
HTTP, DNS, a public rendezvous deployment, authenticated transport or a UI.
Invitation issuance is a fixed Seller policy in the fixture. Reopening
requires re-registering the same published envelope; this is not durable
discovery. Close/reopen is not a process-crash experiment; O1–O3 own those
crash measurements. Outbox records are retained, not delivered to an
external service. No production confidentiality, freshness, user study,
host/disk-loss durability or automatic failover is claimed.

## Focused run 1

Source snapshot: `c75894b8312b9046ac5975b4cda1c67149ed850d`.
Dependencies were installed from the committed lockfile with
`npm ci --ignore-scripts --no-audit --no-fund` before execution.
Node `v26.8.2`, Darwin. From `spike/`:

```sh
node --test test/ordering-bootstrap.test.ts
npm run typecheck
node test/fixtures/o6-bootstrap.ts /absolute/path/to/new-journal.db
```

Both tests passed, with zero failures, skips or TODOs. Typecheck passed.
The direct demonstration also exited 0 in one process (recorded PID 28461)
and used a new local SQLite file. Its complete output preserves actual
canonical envelope bytes, signatures, receipt headers and verified view;
it is not a hand-written success transcript.

| Measured item | Value |
|---|---|
| Context | `sha256:0bfc9037fbd0189013eee796dfdb15e98a59cf5a11c7cd7977fcb3d756c235ad` |
| Standalone origin | `sha256:1a2a4d30944bc14b399a54f9c19419201730d6874aed4c4fcb5c697fccca1fd6` |
| Published route | `fixture:ordering-o6/guitar` |
| Positions | 0 genesis, 1 adopted listing, 2 issued invitation, 3 effective redemption |
| Saved receipt on initial append, retry and reopened retry | `sha256:e6ac6a751ec148523bdb59fddf7d7fc641a6c833ae44bc9e66d8017b83bc6839` |
| After reopen | 4 entries, the same 4 pending outbox records, verified view unchanged |

Outputs: [run-1-tests.txt](ordering-o6-runs/run-1-tests.txt),
[typecheck-1.txt](ordering-o6-runs/typecheck-1.txt),
[run-1-demo.json](ordering-o6-runs/run-1-demo.json), and
[run-1.json](ordering-o6-runs/run-1.json) with the exact commands and exits.
The demonstration's stderr was empty and is retained separately.
No implementation repair was needed after the first frozen source.
These are two focused tests and a CLI execution, not a full-suite campaign.
O4 results and integration remain pending.
