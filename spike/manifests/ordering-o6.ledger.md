# O6 bootstrap demonstration and report

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:b269e2d81af32bdd4089968fd8a31065f44adcf8`.
Input: O5 candidate `598170f`, including O3, O2, O1 and V6.

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
