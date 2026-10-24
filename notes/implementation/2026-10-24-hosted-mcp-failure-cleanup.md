# Hosted MCP failure bounds and authenticated cleanup

This follow-up covers R5 failure-map bounds and control cleanup ordering
under child request `81de9c9be7dd4f2eba58ff522ad6121f72893580` and promise
`216a9ac405978f27f37b16c8dbfbcdbdd1b7c3e2`. It adds no deployment setting
and does not close the remaining R5 bearer work.

## Bounded bearer failures

Each hosted agent keeps an in-memory sliding-minute failure window with
three fixed limits: 4,096 address keys, 64 UTF-8 bytes per address key, and
ten failure timestamps per key. An address over the byte bound is refused
rather than truncated or hashed into another caller's window.

An overlength address or one already at ten recent failures gets `429`
before bearer authentication. Otherwise the bearer is checked first.
A valid bearer from a new bounded address can succeed even when all 4,096
slots are occupied. A failed new address causes expired keys to be pruned;
if every slot is still active, that request gets `429` without adding a key.
Existing active keys are never evicted to admit another address. The normal
failed authentication remains `401` when the failure can be recorded.

Pruning removes only expired timestamps and keys whose timestamps have all
expired. The window is process-local. This change does not add a durable
limiter, reset other clients' active windows, or change native authority.

## Cleanup after control authentication

Agent `bearer` and `retire` controls check the request binding, exact
membership, signature, and current authority before expired control-answer
bodies are removed. A denied control can read the bounded agent context but
does not perform an expiry write. Authorized cleanup and the control
transition remain in the existing transaction. The registry already checks
authority before its reservation and expiry transaction and is unchanged.

This ordering does not remove retained operation identities, shorten answer
retention, rotate a bearer, or retire an agent on a denied request.

## Validation and deployment

All five affected compiler contexts passed across two original invocations.
The first passed MCP production and MCP test, then failed MCP native-test
compilation because two invalid-signature fixtures needed `KeyId` annotations.
No test body ran. The continuation passed MCP native-test, Scope production,
and Scope test compilation, then both whole files: two Node cases and
seventeen Native cases, all 19 passed with no skips or unfinished cases.
The two earlier compiler passes were carried rather than repeated. Root
accepted that baseline in `e84a04c01dd639b2ef9b57f9e854ac1df02b3881`.

Three separate negative controls produced the intended assertion failures:

| Control | Observed failure | Companion results |
|---|---|---|
| Remove the capacity refusal | New failure returns `unauthorized` instead of `limited` at full active capacity | 1 passed |
| Remove the address bound | An overlong address reaches the authentication trap | 1 passed |
| Move cleanup before authentication | An invalid signature clears retained answers and reduces stored usage from 13,435 to 12,445 | 16 passed |

Each completed control has complete terminal case identities, one run end
with no unhandled errors, and checked restoration of the original source
inode, bytes, mode, size and modification time. Other Source, Main refs,
tools and environment remained fixed; only the declared cache and empty
temporary-directory allowances and target change time differed.

The capacity control's wrapper exited 1 despite the intended assertion and
companion pass: its whole-message timeout search matched a normal
`runWithTimeout` stack frame. That original result is preserved and was not
rerun. Independent raw-output and snapshot review established its semantic
result. The remaining controls used primary-message error screening, with
the other assertion, case, terminal and restoration guards unchanged.
The first address-control attempt stopped before mutation or a child because
the capture and invocation had different shell `_` hashes. Its before and
after snapshots are identical. A fresh matching capture preceded the
successful address control.

| Original invocation | Result |
|---|---|
| 24262 | Compiler failure; no test body |
| 32824 | Remaining compiler contexts and 19 cases passed |
| 59118 | Intended capacity assertion; wrapper false rejection preserved |
| 91824 | Address-control preflight failure; no mutation or child |
| 35873 | Address control matched |
| 40366 | Cleanup control matched |

The closed audit and cost ledger are held in
`artroom-security-r5b-closed-validation-cost-evidence-20261024-v2`.
The timing records have different boundaries: two measure the focused Node
process and its descendants; three measure the Python control owner and its
descendants. The first two Python owner CPU costs and the capacity control's
owner wall and CPU costs are unrecorded. Nested child costs are kept separate.
These measurements do not establish complete edit-to-review latency or a
controlled-load, cold-cache benchmark.

The ordinary gate remains pending. There is no new setting. The planner's
current decision (`10f45efc`) keeps hosted MCP unset and closed on the
`dap-grow`, `dap-demo`, and `artroom-scope` Workers, with no tool additions.
The planner found no recorded hosted MCP tool calls; opening a named
Worker requires a future task. This note records no local deployment
or live configuration read. R5 bearer items 4–5 and R15 remain open and
outside this follow-up.
