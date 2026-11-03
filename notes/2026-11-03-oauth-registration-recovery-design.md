# Recover dynamic client registration capacity

Request: `c37ba98f`. Builder promise: `e597584a`.
Checker finding: `35b3a7a0`, carried by O3 approval `353c62ec`.

## Registration lifetime

Keep the existing maximum of 1,000 registered clients. A new registration
remains available for one hour unless a Native-authorized grant protects it.
An anonymous context or metadata lookup never extends that lifetime.
Registration atomically removes expired rows before it checks capacity.
A full table with no expired row still returns temporary unavailability.
New IDs remain random and never replace a live row.

A signed grant may retain its registered client for at most the existing
30-day grant lifetime. This internal retention call runs only after the
agent verifies the signed control and fresh Native authority. It checks the
same immutable normalized client record in the global registry and refuses
an absent, expired, or changed registration. The registry returns an exact
retention deadline. The issuer cannot create a grant that ends after that
deadline. Metadata-document clients keep their existing independent cache.

The existing code and token rows already bind the client, redirect and
resource. Token exchange and refresh keep those checks. A registration
expiration does not replace a client identity, rewrite a binding, or extend
a grant. The client must register again to start another authorization after
its registration expires. Its existing authorization lasts at most through
the deadline that protected the registration.

## Ordering and migration

The retention call adds an await before issue. After that await, the agent
rereads Native authority and its own current state and checks the signed
control's deadline again. It issues nothing after retirement, loss of
standing, a late reply, or retention failure. A retained registration alone
provides no authority to issue a code.

Keep the agent's control serialisation and retained-operation rules. A
completed grant replay returns its retained answer and does not renew the
registration. A retention that succeeds before a later refusal may protect
the row until its bounded deadline. That conservative reservation needs no
cross-object rollback, cannot outlive 30 days, and requires an authorized
Native caller. Anonymous callers cannot create it.

Migrate old rows conservatively: an existing row without a lifetime receives
a single deadline 30 days after migration. That covers grants issued before
the upgrade. Persist the migration once. Constructing a new object must not
renew a migrated row. The table and every cleanup remain bounded by the
existing 1,000-row cap.

## Witnesses

Strengthen the existing real-SQL registry owner. Fill its actual limit, show
that client 1,001 refuses while every row remains valid, advance the injected
clock past one unused registration's deadline, then show client 1,001 succeeds.
Keep a protected client valid across unused-row cleanup. Resolve an unused
client repeatedly and prove that lookup cannot renew it. Reconstruct the
registry and prove that both deadlines persist. Cover the old-schema
migration without extending it on reconstruction.

Use the real Native grant owner for retention ordering, exact bindings and
the deadline cap. Hold the retention reply, retire the agent or remove the
controller's standing, release the reply, and require no issued code. A
control that restores permanent rows must fail capacity recovery. A control
that renews on public lookup must fail anonymous-lookup expiry.

Run the affected owning compilers and files and one frozen full gate. Seal
the evidence, obtain exact-head review and check retirement coverage before
landing. O4 stays closed until this reviewed head lands and the planner
chooses its dedicated Worker and deployment.
