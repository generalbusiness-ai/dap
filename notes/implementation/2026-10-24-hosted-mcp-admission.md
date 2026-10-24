# Hosted MCP admission: R5 slice A

This local implementation covers R5 items 1–3 under request
`12fb37c9a498042cd16c10fe9bda16a276baf1df` and promise
`a42f84f6bcc5d914fc3dcd98965019cd2fd5bd62`, based on kernel checkpoint
`6c15e85f2a76af89fb9d1e995e47aa3206e9a577`. It does not close parent R5.

## Admission behavior

The Worker serves hosted MCP only when `MCP_ENABLED` is exactly `"true"`,
`REGISTRIES` and `AGENTS` are bound, and `MCP_TOOL_ADDITIONS` is absent or
valid. Missing opt-in or malformed additions return `404` before body
reads or namespace addressing. Additions are a JSON array of distinct
known generic tool names, at most 1,024 characters and 18 names.

The hosted default omits `create`, `install_application`, `credential`,
`prepare`, `join`, `record`, `step`, and `text`. Explicit additions can
restore them. Existing service mode still controls `actions` and `act`.
The policy passes `genericTools` to the service; an omitted policy keeps
local Node MCP defaults. Room frontend forwarding preserves the actual
Worker settings. No live configuration is inferred from Source.

Named derived calls take a fresh inventory snapshot for each attempt and
use the list's selection and standing predicates. Dispatch then checks the
actual target's membership, so a grant on one scope cannot admit the same
operation on another ungranted scope. Generic `act`, `prepare` with a
kind, and view actions share that target check. Generic
`install_application` applies it before package resolution or custody work.
This extends admission only; it makes no R9 trust-schema claim.
Code-granted invitation
operations, action-null operations, and unknown standing retain existing
behavior. Client admission grants no native authority; the scope still
judges the act.

## Verification and rollout

Compiler, test, paired-control, actual source-seal, and gate outcomes are
pending. The affected validation selection is planned but has not run; no
case count or successful outcome is claimed. No runtime success or hosted
behavior is claimed in this note.
The preserved October 22 preparation was read as inert historical Source,
not adopted as current implementation or verification evidence.

Before rollout, the planner must inventory existing hosted agents and the
tools they use under request `92d54432`, choose explicit opt-in and additions
per Worker, and
deploy after review of the exact head. The explicit deployment choice
remains pending. Leaving opt-in unset closes the
endpoint, including its control routes. No live agent, custody, bearer,
secret, usage, or deployment state was read for this slice.

Parent R5 items 4–7 remain open: bearer expiry, plaintext-answer removal
and legacy migration, stream-expiry behavior, failure-map bounds, and
expiry-write authentication ordering. This slice does not change or
verify those behaviors. R15 retirement and seed-removal work is excluded.
The planner's tool inventory, rollout, and any hosted check remain separate
obligations.
