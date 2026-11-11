# S8 restart boundary and revision fence

This source contract supplements the general certified-publish plan under
request `93adab5279ac0480bfbbc3a33e2588e64a1c3e11` and existing promise
`9c6ef68e7f8eb7a9a2616f9fc9ac1857c14238c4`. It uses exact main
`7177b87be03ced9e2ddae2a5ebfcdfffcc1fda62`. The planner must rule on the
pre-kept boundary below before family source opens. No implementation,
validation, new Native field, command spelling, or custody mechanism enters
this proposal.

## The command recovers kept work

A matching operation has one public identity: signer, full room-family
references and incarnations, branch item, complete policy/proposal digest,
repository, ref, and commit/tree binding. The eventual command input and
its verified public context must fix those values. A changed signer or
binding is not an automatic retry. An ambiguous match stops rather than
selecting the latest or most convenient entry.

If exactly one matching request is kept, recover its actual fact and signed
input. Follow only its selected certificate outcome and exact retained
proof. Pending stays pending; a known refusal stays refused. If the same
publication is already kept, report that fact and distinguish it from the
current policy if the policy later changed. Otherwise publish with that
request's certificate and fresh exact Rules-item revision. A loss after
submission triggers reconciliation, not a new certification request.

Native validates the request, its selected adjacent outcome, proposal,
proof, birth facts, repository, ref, and commit. It does not accept a host
success flag in their place (`rules-certificate.ts:91–123` and
`rules-scope-v11.ts:22–37,51–57`). Exact resubmission of a recovered signed
intent returns its earlier receipt even after expiry; it writes no second
entry (`judge.ts:214–228`). No new local secret or custody file is needed
for these already-kept states. Public signed entries contain the recoverable
envelope; the existing configured signer remains private in its existing
location.

## No kept entry does not mean no prior attempt

Before a matching request is kept, the room cannot reveal an unrecorded
signed intent's idempotency key, deadline, or lost pre-admission refusal.
A complete negative history read proves only that no matching request was
kept through a stated head. It cannot prove that the first process never
signed or submitted anything. A new signed envelope must not be described
as an exact retry of that unknown envelope.

A narrowly safe alternative is a fresh semantic attempt behind an exact
revision fence. It needs the planner's permission because the fresh key
and deadline differ from the unknown first envelope. The proof below
establishes no second accepted request; it does not recover the lost
pre-admission result or promise unconditional completion.

1. Read a fresh authoritative Destination summary, with the exact family
   incarnation, one ready branch, head `H`, and branch revision `r`. Keep
   `r` fixed for this attempt. Do not use a cached summary or combine an
   older history conclusion with a later revision.
2. Verify a complete contiguous, hash-linked prefix from genesis through
   `H`, including its final hash and every entry's full scope reference.
   Search it for the exact public operation identity. Page limits or a
   growing later head do not change the fixed prefix being proved.
3. If there is no match, sign the certification request with `expected.on`
   exactly `r`. Keep that signed envelope in memory for this live attempt.
   Do not refresh the revision or deadline after an ambiguous response.
4. After a lost answer, unavailable answer, or `revision-moved`, reconcile
   from fresh public entries. Recover a matching kept request if one now
   exists. Otherwise return the actual uncertainty or changed context.
   Do not loop by signing another request at a new revision.

`Read.complete` alone is insufficient for step2. History filters rows by
reader authority while `complete` describes storage-page exhaustion
(`reads.ts:143–148,282–292`). A filtered gap, archive floor, missing row,
wrong hash/incarnation, forbidden read, or exhausted command read bound
stops the absence proof. The ordinary authorized session reads the whole
history, but the command must verify coverage rather than assume it
(`reads.ts:117–137`). Read minima prevent a lower response, but do not by
themselves prove a complete prefix (`handle.ts:42–60`).

## Why the fixed revision blocks the late-submit race

The old in-flight envelope is fixed before the restarted command reads its
fresh summary. Its expected branch revision is therefore at most `r` in
the same monotone scope incarnation. If it is lower, Native already
refuses it. If both envelopes expect `r`, at most one can be accepted:

- Certification is a branch transition. Native requires exactly the
  expected subject revisions and refuses a mismatch before effects
  (`destination-v14.ts:41–47`; `judge.ts:282–307`).
- The accepted request always writes the branch's
  `rulesCertificateRequest` value, even when its value matches an older
  value (`destination-v14.ts:68–73`). Folding that effect touches the
  branch and increases its revision once (`fold.ts:117–124,168–173`).
- Judgment and sealing share one transaction. A changed head restarts the
  turn, so two requests cannot both judge and commit at revision `r`
  (`turn.ts:321–342`).

If the old request wins, the restarted envelope fails its revision check
and public reconciliation finds the old kept request. If the new request
wins, the late old envelope fails. If another act moves the branch first,
both may fail: the command reports that state instead of promising progress.
Exact retries of either accepted envelope return the same receipt.

The same fence protects a lost publication reply: Rules publish is a
transition and always writes policy/ref fields, so it advances the Rules
item revision (`rules-scope.ts:203–218`; `rules-scope-v11.ts:86–93`). Recover
the matching publication before any new submission. Changed policy or
multiple candidate publications remain explicit, not silent success.

## Ruling needed before source

Can the command make the fresh revision-fenced semantic attempt when no
matching request is kept, while stating that the original signed envelope
and pre-admission result remain unknown? If yes, the contract above
preserves the no-new-secret/no-new-custody-file condition and the four-command
usual path. Reads, waiting and reconciliation stay inside command2. No
extra normal-path user command or new counting mechanism is needed.

If the required guarantee instead includes recovery of the identical
unrecorded envelope or its lost refusal, existing public entries cannot
establish it. Do not open source on that interpretation without another
planner choice. Archive loss, incomplete authority, concurrency and terminal
refusal also prevent an unconditional completion claim.

The future witness must cover each kept phase, before-kept loss, both
late-submit orders, fixed-revision refusal, lost replies, filtered/archived
coverage and ambiguous matches. It must distinguish offered attempts from
accepted requests and publications. Recheck every premise against the
actual new-family definitions and command implementation after c+d; these
7177 citations do not certify future versions. All checks here are UNRUN.
