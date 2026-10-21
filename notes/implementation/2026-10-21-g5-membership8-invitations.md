---
title: Membership 8 invitations on the Room page
rests_on:
  - git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:355b0266a8060f3ab323625c9f89265491a571a5
---

# Membership 8 invitations on the Room page

A valid Grow invitation names `platform:membership@8`. The Room page
previously refused that version before sending a request. Its retained
join validator had the same restriction, so changing the first check alone
could not complete enrollment.

The client now exports `INVITATION_MEMBERSHIPS` and
`isInvitationMembership` from `invitation-fields.ts`. The page's admission
check, its retained join validator, and the CLI's person join use that list.
The existing encoder selects each version's fields. Membership 8 sends
`invitation` and `proof`, with no private invitation seed in the signed act.

The page still requires an explicit version, the configured service, full
repository references, a handle, and a positive invitation number. Both
entry points also require native membership data with a `join` act.
Unknown versions retain the existing refusal message. The browser still
requires Web Locks. A narrow capability type lets the native test import
the same custody code and supply its explicit fixture lock.

The generated `apps/room/page/assets.ts` includes the updated page. Its
source command is `npm run build --workspace @generalbusiness/dap-page`.

## Evidence

The focused owning run passes twelve cases across the page, CLI, and native
Worker projects. Seven compiler configurations pass in the same invocation.

- `join-version.scope.test.ts` creates real Membership 6 and Membership 8
  scopes, seats their founder, and issues an invitation. The page's actual
  `joinInvitation` path saves its request, submits over the Worker routes,
  verifies the receipt against its exact native entry, and reports verified
  enrollment. The invitation becomes active. An unknown version sends
  nothing. The native history contains no private invitation seed.
- `join.test.ts` exercises every version in the shared list at the scripted
  HTTP boundary. It verifies proof signatures and preserves the existing
  service and reference refusals. `join-custody.test.ts` checks Membership 6
  and Membership 8 after a lost reply and reload. The service, storage, and
  lock in those Node cases are explicit stand-ins.
- Two focused controls restore the obsolete admission and custody
  restrictions separately. Each compiles and fails the native Membership 8
  verified-enrollment assertion. Both restore every source byte and mode.

The original native regression passes Membership 6 and fails Membership 8
by assertion. Earlier compiler errors, an unseated fixture founder, and a
wrong assumption that the join remains the latest entry are retained as
inconclusive attempts. They provide no success or regression evidence.

## Browser checks

The flow is `/page/#/invitation`, paste an invitation, then observe either
local refusal or a retained request after dispatch. The Browser plugin is
unavailable. Pinned `playwright-core@1.56.1` runs from a scratch directory
with headless Chrome. No project dependency changes are needed.

The final browser run serves the rebuilt page and the Worker's actual brand
assets locally. Desktop at 1280 by 900 and mobile at 390 by 844 pass page
identity, meaningful content, visible images, console, error-overlay,
horizontal-overflow, and interaction checks. An unknown version sends no
request. Membership 8 sends one valid signed proof request. The browser
uses its actual storage, key generation, and Web Locks.

The local browser backend deliberately answers unavailable. The page keeps
the original request and shows **Check status**. This proves rendered
admission and dispatch, not native enrollment in a browser. The native
Worker cases separately prove enrollment and receipt verification. The
first browser attempt omitted logo bytes in its local server. The final
attempt supplies the actual assets and checks that visible images load.

## Review boundary

The exact-head Source record binds the gate result, the changed paths, and
these external evidence manifests:

- `/private/tmp/g5-membership8-page-closed-grant-20261021.json`
- `/private/tmp/g5-membership8-page-source-view-20261021.json`

The grant is a finite leaf map. Every mapped original stays frozen and is
read or copied only, including helpers, snapshots, reports, logs, and the
sealer. Before reading a leaf, its grant and exact leaf bytes, mode, and
hash must match. Execution uses a physically distinct verified regular
copy, with all matching aliases and historical inputs changed first.
There is no permission for adjacent paths or a whole prefix. The mutable
checkouts and their owned dependencies are excluded from the map.

The native fixture's Git host, clock, setup inspector, in-memory page
storage, lock, and driven scheduler are stand-ins. No deployed invitation
or outside provider participates in these checks. After review and landing,
the planner deploys the landed head and runs the real visitor and operator
journey in `examples/grow/runbook.md`. The builder does not deploy.
