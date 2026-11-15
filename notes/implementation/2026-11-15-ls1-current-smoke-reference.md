# LS-1: current references in the local Worker smoke

## Source and scope

Request `3bacbc5ea3b32d60c9c09c4cc53163eb8705d956` and promise
`630a37a06c656fc848ec4d270bbbb0eb13f5a151` govern LS-1.
The source rides CB-1, whose separate request is `b5f200f2` and promise
is `9b083032`. One combined head and gate serve both requests.

Branch `builder/cb1-ls1-source-20261115` starts at preserved CB-1 head
`8a5880b6716dab2691a2115498125d06f347d15b`. Merge
`bfb565eed9db00b01ce10d6c62b68349f7dbaafe` takes actual main
`4b198d0fc980327d87347b05a3817106974bf8d7` without conflicts.
The old CB-1 branch, dependency view, and evidence remain intact.

## Current reference and public failure boundary

The smoke loads `isScopeRef` from `packages/bytes/src/records.ts` through
its existing pinned CLI loader. The shared codec checks register,
directory, and membership references before the smoke emits their exact
`{scope, genesis}` projection. It rejects the retired `{scope, inc, kind}`
shape and added fields. No old-shape fallback remains.

Both invitation and joined-store checks compare membership scope and
genesis. A matching scope with another genesis fails the identity check.
Rules, destination, and inbox remain ScopeIds. The actual `verify register`,
`verify --all`, and exact seven-scope coverage checks still establish roles.
Base planning, retained plan ownership, and the one-run custody marker keep
their existing behavior.

The proxy adds `operation` to its public failure metadata. The selector
accepts only a genuine `CelldSmokeError` with a maintained operation name.
Every other error produces `null`. It emits no message, stack, cause,
invitation, signature, signing key, or other arbitrary error property.
The existing private scratch-path metadata and private log retention keep
their scope. LS-1 changes no TLS, Worker, SDK, trust, lease, retry, or
process ownership behavior.

## Witnesses and limits

The existing `scripts/celld-smoke.test.mjs` owner retains its five cases
and adds two. The first calls the actual validation, projection, and
membership-comparison boundary used by the smoke. It covers current
references, property order, malformed and retired references, and a
same-scope/different-genesis membership. The second calls the exact
operation selector used by the proxy with private sentinel error fields,
an unknown operation, and a foreign error. These are script boundaries;
they do not substitute for a real Worker or prove the whole proxy flow.

Metadata-only inspection on 15 November found `CELLD_BIN` unset and no
`celld` executable on PATH or at `/Users/hughpyle/bin/celld`,
`/Users/hughpyle/.local/bin/celld`, `/opt/homebrew/bin/celld`, or
`/usr/local/bin/celld`. No binary, version probe, proxy, server, network
request, installer, or project import ran during this source work.
This search does not claim that no celld binary exists elsewhere.

| Boundary | Current result | Remaining obligation |
| --- | --- | --- |
| Existing Node owner and its two new cases | UNRUN | Run with the combined CB-1 and LS-1 gate. |
| Shared-codec loader and current combined source | UNRUN | Required preflight and gate at the reviewed head. No AST expectation refresh occurred. |
| Actual local Worker and TLS proxy | UNRUN; no binary at the inspected paths | If no reviewed binary becomes available, the post-publication Local Worker smoke workflow on main supplies this witness. LS-1 stays open until that workflow passes. |
| CB-1 fleet and Security scope | Prior results retain their original heads | Fleet machine, public Counter release, Security review, and CB-2 remain separately owed. No operator or privileged step ran. |
