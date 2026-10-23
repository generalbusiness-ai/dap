# Scope lookup admission: R2 source preparation

Request `2694fd64`, continuing security item R2 in `954bf397`, promise
`48fac5fd`. This is unverified source work on the isolated `223b4c74`
basis. It has not been compiled, parsed, tested, committed or deployed.
R1's current repair is separate and must be preserved when this work is
integrated after its landing.

The adopted rulings `3fd5bec0` and `2c18d9be` permit one fixed SQLite
index while requiring an unknown lookup to avoid the named target object
entirely. The fixed object is `ScopeIndex`, named `applied-genesis-v1` in
the `SCOPE_INDEX` binding of each deployment. Its constructor writes
nothing. An empty-index lookup reads `sqlite_master` once; a populated
lookup then reads one primary-key row. Neither lookup writes. These are
index statements, not zero-SQL claims for the whole request.

The lazy namespace adapter checks the index before calling either
`idFromName` or `get` on the target namespace. Production scope reads,
foreign facts, proof/birth reads, membership reads, site and application
lookups use it. Hosted agent creation checks membership before addressing
its per-membership registry or reading the body. Native creation remains
an explicit exception: the existing serving admission and native judgment
still decide it. An admitted but natively refused creation may retain
target storage, does not register, and is unreachable to later indexed
lookups. This is the residual accepted by ruling `2c18d9be`; there is no
general storage-initialization rewrite.

The adapter's transport identity is stable for the same raw scope binding,
index binding and effective mode. Only that adapter is cached, in weak maps
with at most three mode variants per binding pair; every actual lookup RPC
still asks the index afresh. This preserves the health reader's existing
single-flight and five-second readiness cache. Changed mode or index
binding selects another adapter. The v2 source review found that making a
fresh wrapper per fetch would break that identity contract; the source
repair includes a held production-fetch concurrency and cache witness.
No runtime failure or pass is claimed for that finding.

After a creation judgment has committed, the target checks its own entry
zero against its own stored full reference, hash and ID-derived seed,
and requires an applied genesis before calling the internal index.
Caller-supplied entry bytes are never used. Index insertion is idempotent;
a conflicting genesis hash refuses. Index failure does not change the
committed native answer. An exact creation retry can register from the
same stored genesis. No public registration or global-index listing route
is added.

`SCOPE_INDEX_MODE` defaults to `enforce`. Only the exact string `register`
permits an unindexed lookup to reach the old target path and ask the
target to register itself from its stored genesis. Invalid mode values
and missing index configuration fail closed. Old schema-only objects
cannot register. The setting is a deployment transition, not authority
for a native act. The three Worker configurations add the new SQLite
class migration; the planner owns reviewed deployment and mode changes.

## Operator rollout

Rulings `9a583cfd` and `14a5e292` accept listed-set verification and fix this order for
each of `artroom-scope`, `dap-grow` and `dap-lending`. The planner performs
the steps after source review and records the saved manifest and verification
under the deployment record. No deployment has occurred in this source work.

1. Against the pre-index deployed code, inventory the planner's known roots
   and their reachable scopes through ordinary authenticated reads. Save a
   bounded manifest of observed full scope IDs and verified applied-genesis
   facts, with the deployment and root provenance. This is the inventory dry
   run; do not switch to register mode before saving it. Missing authority,
   incomplete traversal or unavailable genesis is an incomplete inventory,
   not permission to guess an entry.
2. Deploy the reviewed head with `SCOPE_INDEX_MODE=register` and retain this
   version as the rollback target.
3. Sweep exactly the saved manifest through ordinary authenticated reads,
   and read back each listed genesis. This step can
   write: an unknown legacy target proves its own stored applied genesis and
   registers itself. Manifest bytes do not prove registration and are never
   submitted to the index as proof. This readback proves only that each
   listed genesis answers, not indexing. Preserve failures for retry; do not
   omit a failed row or substitute another identity.
4. Deploy `SCOPE_INDEX_MODE=enforce` and record the configuration.
5. Repeat the exact manifest through ordinary authenticated reads under
   enforce, checking each full identity and genesis. Report listed, verified,
   unavailable and mismatched counts, and retain the exact manifest. A listed
   scope that answers under enforce is indexed. This proves indexed
   reachability of that listed set with its verified genesis; it
   does not prove that the index contains no other scopes. An unlisted entry
   still requires its own verified applied genesis and may belong to another
   room outside this inventory.
6. If any listed scope is missing or mismatched at step 5, the planner
   immediately redeploys register mode using the step-2 version. Record the
   affected IDs as an operator rollout failure, resweep the failed scope,
   then repeat steps 4 and 5. Do not drop it from the saved manifest.

Under enforce, known indexed IDs answer without registration writes.
Unknown target and registry lookups remain closed before addressing those
objects. There is no mode-query route; the planner records the deployment
configuration used for verification.

There is no global index listing/count route, new admin route, provider
write, third mode or per-request bypass. A member's ordinary reads do not
disclose other rooms. The planner must supply its known root inventory;
existing CLI room discovery deliberately excludes other rooms created by
the same register. A later register-mode sweep is not a no-write dry run.

The operator command remains source work to propose separately: bounded
authenticated discovery can reuse the existing `verify --all` traversal,
but it does not yet save and consume this exact ID/genesis manifest. Do not
run a guessed command or claim rollout tooling is complete. Its narrow
extension should save the pre-index manifest, sweep only its listed IDs,
and emit the qualified counts above without a global index API.

Prepared witnesses exercise read-only real-SQL index lookup, idempotent
and conflicting insertion, target-namespace traps for unknown foreign,
site, application and registry lookups, and actual native applied/refused
genesis registration with outage/retry and register-mode controls. Index
transport traps are labelled stand-ins; they do not establish deployed
Cloudflare storage behavior. Owning AST seals are explicitly pending,
including both `object.ts` placements. The native tests, full gate and
hosted rollout have not run.
