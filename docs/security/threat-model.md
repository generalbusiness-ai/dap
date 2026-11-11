# Threat model

This reference states what dap protects, what an attacker can do, what
the model assumes, and the checks in the repository. The
[entry-point inventory](entry-points.md) and the
[setting inventory](settings.md) give the route, configuration and
pre-gate work behind each boundary.
[Deployment trust boundaries](trust-boundaries.md) names shared resources.
None of these pages proves a deployed setting or provider access control.

## What the model protects

The model protects five things. Each one has an invariant in
[Invariants and their limits](#invariants-and-their-limits), and that
table states the qualification.

| Protected | Invariant |
|---|---|
| The effect of an act. An ordinary declared act takes effect only with a grant. | `grant` |
| Outside systems. A forged or mismatched origin reaches no provider. | `sealed-operation` |
| A room's content. A read session opens only the reads in its claims. | `session-membership` |
| The set of scopes. Only a target's verified genesis registers it. | `verified-genesis` |
| Credentials. A read token or workspace token leaves private custody only once. | `credential-custody` |

A deployment also holds a secret and bindings that carry authority:
`SESSION_SECRET`, `ARTIFACTS`, `APPLICATION_CONTENT`, `REGISTRIES`,
`AGENTS`, `SCOPE_INDEX`, `SCOPES` and `METRICS`.
[What each resource protects](trust-boundaries.md#what-each-resource-protects)
states the authority and the boundary of each one.

## What the attacker can do

The attacker can generate keys, submit malformed or signed requests, choose
foreign references and run a trusted application's script. A valid signature
proves custody of a key. It grants no membership or review authority by
itself. A stolen operator secret, compromised Worker or malicious provider
crosses the trust boundaries described below.

## Trust assumptions and residual exposure

The Worker and its Durable Object bindings enforce private custody. Whoever
holds a deployment's `SESSION_SECRET` can mint that deployment's read-session
claims. Artifacts namespace and R2 bindings confer resource authority across
all Workers that share them. Code checks narrow their use but do not create
separate provider namespaces.
[Deployment trust boundaries](trust-boundaries.md) lists those shared
resources and the revocation windows.

A trusted release's JavaScript runs in its configured screen origin. Trust
in a publisher remains trust in that code. Definition validation checks
well-formed data and finite work, not the author's policy intent. The
definition-author reference's
[fail-open list](definition-authors.md#fail-open-authoring-list) includes valid
vacuous guards and permissive review thresholds.

The admin role governs a room's Rules. Every admin holds `rules.publish`,
so any one admin publishes Rules alone. Under `rules@10` and `rules@14`, a
`publish` can lower every threshold outside the fixed minimum of the
`rules` extent. That minimum governs file landings, not the `publish` act.
No guard of `publish` asks for a second key. A compromised admin key can
publish Rules under which a landing outside the `rules` extent needs no
review.

A refused act answers `judgedAt` with the scope's head: its sequence number
and hash. So a caller who knows a scope ID learns how far that scope's
journal has grown and the digest of its head. The caller needs no
membership for this answer.

## Invariants and their limits

The [witness inventory](#witnesses) names executable tests by file and
literal case name. Its invariant keys refer to these claims:

| Invariant | Required behavior and qualification |
|---|---|
| `grant` | An ordinary declared act takes effect only with an observed grant for its key, action and scope. Expired or unavailable standing cannot authorize a fresh act. Trusted platform acts and genesis have their own pinned authority rules. A cached observation can remain valid during its defined window; revocation is not instantaneous across scopes. |
| `sealed-operation` | An outside operation starts from its committed opening entry and exact operation, attempt and scope. A forged or mismatched origin reaches no provider. This applies to native operation effects. Authenticated reads, proof fetches, telemetry and provider readiness probes can precede an act's commit. The [entry-point inventory](entry-points.md) records that work. |
| `session-membership` | A room read session opens only the reads in its claims, for its exact deployment and Membership reference, until expiry. It opens no other room's ordinary scope. The pinned Register has a separate read policy for rooms it created, described in [Deployment trust boundaries](trust-boundaries.md). A revoked key can retain an already-issued session until its end. |
| `verified-genesis` | In enforce mode, an unknown scope ID reaches no target object, and only a target's verified applied genesis registers it. Native creation is an explicit exception: after serving admission, a refused creation can leave unregistered target storage. In register mode, any unknown, well-formed scope ID reaches `registerKnown()` on a new target object. Constructing that object writes the full schema, and no serving window bounds an unsigned request on this path. Neither mode establishes that no physical object exists without a genesis. |
| `credential-custody` | A read or workspace token leaves private custody only once, to the session key that prepared it and only while the token and its recorded use remain eligible. Journal entries contain no token plaintext. A provider credential already disclosed to that key remains governed by its provider lifetime and revocation behavior. |

The `verified-genesis` row states the limit of that invariant. The software
does not promise zero target SQL for a native creation that passes serving
admission and then fails judgment. The index's
fixed owner is another object; its lookup witness checks real SQLite and
read-only lookup separately. A register-mode backfill or an enforce-mode
rollout needs its own [operator evidence](../deploy.md).

The tracked file `apps/room/wrangler.artroom-scope.jsonc` selects
`register` for the Worker `artroom-scope`. The other tracked Worker files
under `apps/room/` select `enforce`. They configure `dap-self-host`,
`dap-demo`, `dap-grow`, `dap-lending`, `dap-commons`, `dap-connect` and
`dap-celld-local`.

## Authority observations and cache bounds

A held observation that already denies an ordinary grant causes
`unauthorized` before provenance, receiver policy, foreign facts or a queued
turn. Null or unavailable standing proves no denial. Native grant marks
retain their recovery-key and action-null checks, and the commit rechecks
authority at its own head and clock. Only the alarm drains timed work;
other inputs cannot pass a due transition.

Two kinds of act reach foreign reads before the judge refuses them. One
kind carries a native grant mark, such as `found` or `join`. The other
kind is an act whose standing read came back null. Each such act fetches
up to `usesPerEntry` foreign facts through the scope index. Each fetch has
`fetchSeconds` to answer. `PROPOSED_BOUNDS` sets these to 128 facts and 10
seconds.

The scope-index census route also works before its final check. It
verifies the request signature and applies the signed-read serving windows
of one key and one address. The census owner then reads the register's
genesis proof, up to 1 MiB within 10 seconds. Only after that read does it
compare the founding actor with the caller.

A remote authority run reserves a signing-key place only after a checked
Membership observation grants current standing. Once-only grants count too:
a sealed entry can retain their highest observed head. Unknown keys and
failed reads take no place and keep no signer observation. `limit` needs
4,096 keys with standing in that run. A new object run starts empty.
Membership's own folded authority uses no remote signer cache.

An admitted key's observed retirement, compromise or member removal stays
for the run. A separate FIFO keeps at most 4,096 revoked keys that were
never admitted. An eviction from the denied FIFO makes the Membership reads
in flight at that instant unanswered for every key, and each caller retries.
Handles already held stay valid while their own record remains: admitted
handles consult their kept record, and denied handles require the same FIFO
record. Only an act from a distinct revoked key that the FIFO does not hold
causes an eviction. A cache miss reads Membership again. For a
never-admitted key that leaves the FIFO, the run no longer remembers an
exact permanent denial: it relies on a fresh trusted Membership read and
Membership's irreversible retirement and removal. Distinct real revoked
keys can cause cache eviction and require another read. Unknown or
unanswered throwaway keys cannot cause that eviction. The signer-key cache
bound does not replace signature checks, local history or the commit's
current observation checks.
The separate `Further.read` reusable-observation store keeps at most 4,096
records and 8 MiB of retained payload bytes. It measures each subject name,
observation, read and last-use metadata, and every stored value copy. A
replacement keeps its FIFO place. An oversized answer serves its own input
but removes an older cached answer of the same name and is not reused.
Eviction forces a fresh read without adding a refusal. The production path
reads the same Native object's append-only history, so that fresh read does
not return an older head than the dropped answer. Each input pins a record
when `hand()` first exposes it, while deliberate freshness and head rereads
remain. These ceilings bound the reusable store's payload, not JavaScript
heap size or the records held separately by simultaneous inputs. Replay
uses the recorded observations and retained values, not this live store.

## Witnesses

The grant judge uses explicit scripted grants. The authority witness runs
real ScopeObject turns with a labelled Membership stand-in. The order
witness also uses a real foreign entry and alarm, with scripted admission
and resolver ports. The key-bound witness uses the real authority port
with synthetic key IDs below signature admission. The outside
operation witness runs real SQLite dispatch with a scripted provider, while
the host adapter witness uses platform judgments in memory and private
SQLite custody. Neither one proves a live provider effect.

The session witness runs real native room scopes. The index witnesses use
trap namespaces for absence and real ScopeObject genesis checks for
registration. The read-token witness runs native scopes with its scripted
outside host. The workspace credential witness checks real SQL custody with
scripted recorded state. See [stand-ins and what they show](../testing-reference.md#stand-ins-and-what-they-show).

```dap-security-witnesses
[
  {
    "invariant": "grant",
    "path": "packages/derive/test/judge.test.ts",
    "name": "a wrong requester fails its named guard with a grant and fails the grant check without it"
  },
  {
    "invariant": "grant",
    "path": "packages/scope/test/authority.test.ts",
    "name": "an observation admits inside its window and is reused there; at its window it is outside, and with membership silent the act is not judged and uses no key; a ten-second kind is read for its one commit, an act or a step of a capability (a scripted step, a stand-in); after a restart nothing read is used"
  },
  {
    "invariant": "grant",
    "path": "packages/scope/test/authority-order.test.ts",
    "name": "a failed authority observation reaches no receiver or foreign work and drains no timer; only the alarm drains before an authorized retry"
  },
  {
    "invariant": "grant",
    "path": "packages/scope/test/authority.test.ts",
    "name": "an authority run charges only 4096 keys with standing, reserves concurrent arrivals after their read, keeps old keys usable and resets in a new run"
  },
  {
    "invariant": "grant",
    "path": "packages/scope/test/authority.test.ts",
    "name": "more than 4096 unknown or unanswered signer reads do not charge a run or prevent a newly joined member's standing"
  },
  {
    "invariant": "grant",
    "path": "packages/scope/test/authority.test.ts",
    "name": "evicting a never-admitted revoked key invalidates its older in-flight active answer and reads Membership again"
  },
  {
    "invariant": "sealed-operation",
    "path": "packages/scope/test/operations.test.ts",
    "name": "T19: an attempt is recorded before it is sent, and sent at most once; a stop between the send and the outcome leaves `unknown`, which a restart, elapsed time, a later attempt that succeeds, a new ref and a listing do not settle, and its own late answer does"
  },
  {
    "invariant": "sealed-operation",
    "path": "packages/scope/test/destination-host.test.ts",
    "name": "forged requests and mismatched configured repositories never reach the provider"
  },
  {
    "invariant": "session-membership",
    "path": "packages/scope/test/sessions.test.ts",
    "name": "T15: a session reads the scopes of its own repository and no other, until its end on the reading scope's clock; a revoked key keeps its session and gets no new one; an abandoned reader is released at once and once; and a session's end closes a stream at its next send, with no byte"
  },
  {
    "invariant": "verified-genesis",
    "path": "packages/scope/test/scope-index.test.ts",
    "name": "unknown foreign facts, site and application lookups and hosted registry reach no target"
  },
  {
    "invariant": "verified-genesis",
    "path": "packages/scope/test/scope-index.test.ts",
    "name": "unknown scope gate touches no target and only the native target's applied genesis registers"
  },
  {
    "invariant": "credential-custody",
    "path": "packages/scope/test/read-token.test.ts",
    "name": "a member mints a read token and reads it once; a second read, another member's session, a read with no session and a read at its end are each forbidden; a key that is no member's is refused; the plaintext is in no entry and is gone from custody; the destination verifies consistent"
  },
  {
    "invariant": "credential-custody",
    "path": "packages/scope/test/workspace-credential.test.ts",
    "name": "workspace credential refuses a wrong preparing key, preserves SQL custody and hands off exactly once"
  }
]
```

`node scripts/security-witnesses.mjs` checks that each row names one literal
`test` or `it` declaration with a callback in a tracked test file. It parses
the source without importing or running the test. Comments and string
specimens do not count. It does not prove the assertion's meaning, test
reachability, current success, full suite coverage or a deployed result.
The fixed Node owner exercises a missing declaration that remains present
only as a comment, so a text search cannot satisfy this check.

The existing witness owners keep their original runtime cases, pools and
deadlines. This documentation adds no Native test or second copy of a
security invariant. An implementation note records actual validation at the
head under review.

[Report a vulnerability](../../SECURITY.md#report-a-vulnerability) gives the
private reporting path.
