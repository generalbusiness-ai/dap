# Hosted MCP bearer expiry and one-time delivery

This implementation covers R5C under child request `a3e54dcf6aa8fd305c5cffca4ef65a62e6100462` and
promise `fb529297627a453b7f844979779ab0b27867fd15`. Planner decision
`855dd86db35a986ce2b09eafcffd7fb4bc3b661e` fixes the cutover and stream
policy. All five compiler contexts and all 31 affected assertions have
passed, but affected validation remains failed because its latest run had
one unhandled rejection. No healthy affected baseline is established.
Controls, gate, review and deployment remain pending. This note claims no
completed parent R5.

## Contract

A successful fresh create or signed bearer renewal returns the token only
in that response, with `bearerExpires`. Expiry is fixed at issuance commit
plus 30 days. Neither use, replay, reset nor unrelated configuration writes
extends it. A fresh signed renewal checks current controller or admin
membership authority and does not need the expired bearer to authenticate.

Stored creation and control answers in the agent and registry contain no
plaintext token. Replays retain the original HTTP status and stable
metadata, with `bearerShown: true` and the operation's original
`bearerExpires`. Later renewal cannot rewrite an earlier receipt. Existing
fingerprint-conflict and stale `409` rules and seven-day receipt retention
remain. Non-bearer refusals and retire answers retain their shape.

If the first response is lost after commit, retry returns the already-shown
receipt. A new signed renewal provides a new token. Concurrent duplicates
have at most one plaintext response. Resets before commit preserve the
same agent, key and native enrol envelope and can finish issuance once.
No plaintext is persisted to make reset recovery appear successful.

Legacy active digests without a valid stored expiry fail closed at
cutover. Their receipt expiry is null. The planner renews live hosted-agent
tokens explicitly during deployment and records the step; there is no
grace deadline or activation-time renewal. No new lifetime setting or
caller-chosen duration is introduced.

The versioned migration is atomic within each agent or registry object's
construction. It is not one cross-object cutover. Renewal activates the
agent but not its repository registry, which holds a third copy of the
old creation answer. A dormant registry's raw answer remains until that
registry activates. The planner must activate relevant registries through
the existing control plane as well as renew live agents, or explicitly
record lazy, incomplete dormant cleanup. No new enumeration or operator API
is implied. A new-code request runs its object's migration before it can
return a stored answer. Full deployment-wide cleanup is not claimed by
this source or a single agent renewal.

New requests after expiry fail bearer admission. Open legacy streams and
modern listens close via existing HTTP lifecycle hooks and bounded timer
rechecks, with no 30-day timer or Durable Object alarm. Calls already
admitted finish under their original native/custody fences. A pending
opening must not resurrect a closed layer. This does not change the
separate 30-minute legacy session idle rule or local Node MCP lifetime.

## Remaining evidence

The existing hosted creation/reset, control-authority, retention and HTTP
lifecycle witnesses must establish one-time delivery, exact deadline
boundaries, renewal, no durable token copies, migration accounting and
stream cleanup. Source preparation is not their outcome. The planner's
explicit cutover renewal and hosted check remain deployment obligations.
R15 retirement and seed deletion are excluded; native membership authority
and accepted creation remain unchanged.

The maintained parser supplied the hosted and HTTP owner seals from the
reviewed production source. Those two existing map slots were updated after
raw source hashes were checked. This is a source identity check, not a test
result. The modern stream-opening deadline race and test protocol metadata
were corrected during source review, before any runtime invocation.

The first affected invocation at `acfbe8c1` stopped in the production
compiler: TypeScript could not infer the paginated migration cursor row
and operation key across the loop. Explicit row and key annotations retain
the existing runtime checks and values. The other compiler contexts and
all test bodies were unrun; this original failure remains evidence.

The affected invocation `99714` at `86a5325f` passed all five compiler
contexts, then failed the first HTTP idle case at line 72: the stateless
modern probe expected 200 but received 404. The probe sent `ping`, which
that protocol removes. Complete client metadata exposed the unsupported
method instead of stopping at an earlier metadata error. The fixture now
uses `server/discover` in both its method header and body, retaining the
active legacy session ID and every idle-state assertion. It also checks the
successful discovery result, so an HTTP 200 protocol error cannot stand in
for a valid probe. Production code and all deadlines are unchanged.

That failed run establishes no passing body or healthy file. The first
idle case failed, its other three cases were unfinished, the nine HTTP
loopback cases were skipped, and all 18 native cases were unrun. Repeated
callbacks for four skipped loopback identities do not prove repeated bodies
or a healthy file. The correction has not been compiled or run.

The single hosted-lifetime stream case now retains every HTTP layer it
creates and closes them in `finally`, including after a failed guard
assertion. Its assertions, explicit abrupt-discard sequence and deadlines
are unchanged. This cleanup is required for the proposed due-close
negative control; it is not an observed passing outcome. Controls still
need a naturally passing affected baseline before allocation.

The continuation `66450` at `a959edc4` passed the MCP test compiler and all
31 affected assertions. The other four compiler results carried from
`99714` because their inputs were unchanged. The continuation still failed:
its deliberate legacy-migration SQL trigger produced one unhandled remote
rejection despite the test's passing rejection assertion. All 31 assertion
passes are retained; this is not a healthy affected run or control baseline.

The migration witness now invokes the same actual instance's synchronous
`used()` method inside `runInDurableObject`. A local catch owns only that
call's expected failure and returns a tagged result. Assertions outside the
callback require the failure and its scripted message. The original SQL
trigger, complete rollback snapshot, retry, one-time budget credit and
renewal checks remain. No global rejection filter or production change was
added. This correction has not been compiled or run.
