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

Root and an independent Sol reviewer found no production defect. Test
source is prepared; compiler, test, control, ordinary-gate, and hosted
validation remain pending. The maintained source parser computed the updated
hosted seal; its inventory test has not run. Root will record closed
outcomes before review. The targeted witnesses cover fixed capacity, expired-only pruning,
authentication at capacity, early refusal, and denied-control write ordering.

There is no new setting. The planner redeploys the reviewed head using the
slice A opt-in and tool-addition settings chosen for that Worker. This note
records no deployment or live configuration read. R5 bearer items 4–5, R15,
and the live agent/tool inventory remain open and outside this follow-up.

The first affected invocation at `4da26520` passed the MCP production and
test compiler contexts, then stopped in the native MCP test compiler. Two
invalid-signature fixtures supplied the helper's string-typed key where a
`KeyId` was required. Their existing derived key values now carry explicit
type annotations. No test body ran; the failure and unreached obligations
remain in the external evidence. Runtime assertions and deadlines are unchanged.
