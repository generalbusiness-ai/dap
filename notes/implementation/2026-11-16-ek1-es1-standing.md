# EK-1 and ES-1: the standing value, the value check and the session answer

Base: main `d6c863bb`, after C4. EK-1 (`f976e00b`) and ES-1 (`41cafc07`) share one head.

## What the head changes

1. `packages/derive` splits the value checks of the grant guard out of `judgeGrant`. One private function, `checkGrantValue`, runs them. `judgeGrant` calls it and runs the use guards between its first and second part. A new export, `judgeExploreGrant`, calls it with no use guards, for a standing that the caller supplies. The grant that it returns has no `fresh` member. That grant can sign the unsigned body of an Explore (`judgeActBody`). It is never recordable authority and never serves a row of `observes`.
2. A session answer carries the signer's standing when the request asks for it with `?standing=1`. The scope returns the value that it already computed for the session's checks and claims. The client keeps the value with the token. The CLI cache keeps it with the token. The MCP inventory reads its standing from it.
3. The MCP inventory asks `judgeExploreGrant` for each action of the value. `standingFrom` only shows the value (role, handle, key). It decides no action.

## Kernel surface

The kernel export is `judgeExploreGrant`, and nothing else. Its caller outside `packages/derive` is `packages/mcp/src/inventory.ts:133`. The signature writes the standing as `Omit<Observation, "at">`, the question as a `Pick` of `GrantAsked` with the `asOf` of `Clock`, and the returned grant as `Omit<Grant, "fresh">`. Each is a type that the kernel exports today, so none gets a name. `BodyJudgeContext` is a private alias in `judge.ts:107`: no caller outside `packages/derive` names it. `revoked` (`grant.ts:64`) takes `Pick<Observation, "keyState" | "memberState">`. Every earlier caller still satisfies it.

A test pins the recorded bytes: `canonicalize(grantFrom(use))` equals a text that the test writes from the eight members of the base `grantFrom`, and the value check gives the same text without `fresh` (`packages/derive/test/forms-grant.test.ts`).

## Which refusals end the session

A submit that the scope refuses for authority ends the cached session, so the next read asks again and gets the current standing. The scope's grant check is `judgeGrant` (`packages/derive/src/grant.ts:357`). It fails for seven conditions: key, revoked, key-state, action, within, not-after and controller (`Unheld`, `grant.ts:257`). The scope collects each one as an empty list of grants (`packages/scope/src/authority.ts:336`) and answers `refused` with `unauthorized` (`packages/scope/src/core.ts:683`). The judge of an act gives the same reason when no grant is current (`packages/derive/src/judge.ts:459`) or a rule does not pass the key (`judge.ts:469`). A grant that is not canonical values gives it too (`core.ts:773,869`).

The set is therefore one reason: `unauthorized`. `AUTHORITY_REFUSALS` (`packages/client/src/reads.ts:49`) holds it, and `authorityRefusal` (`reads.ts:52`) tests an answer against it. The CLI connection (`packages/cli/src/command-support.ts:224`) and the MCP service (`packages/mcp/src/service.ts:863`) call it. The seven names of `Unheld` do not travel in the answer.

`authority-unavailable` is an `unavailable` answer. The scope judged nothing about the key, so nothing ends (`authority.ts:339`, `judge.ts:458,468`).

## The member kind

`kind` is a fixed field of the member item. The inventory reads it from that item in the membership summary that it already reads for the handle (`readInventory`, `packages/mcp/src/inventory.ts`), and passes the items to `standingFrom`. The function reads nothing. It finds the active member of the caller's active key and states that item's `kind`, only when the key and the member are active. If the summary is not held, or holds no such item, `kind` is absent. `kind` decides no action: eligibility goes only through `judgeExploreGrant`.

The MCP service uses the kind in one place, `#keepsOriginals` (`packages/mcp/src/service.ts`), which keeps its exclusion: an agent or a checker server does not keep originals. A test pins the kind present with the member item held and absent without it (`packages/mcp/test/reads.test.ts`).

## What an agent sees while the standing is unknown

The standing is unknown when the membership gave no session (`no-session`), when the Worker ignored the option or the value failed a check (`no-standing`). The inventory then has no role and no action for the caller. `room` lists the membership as "your standing here is unknown", with that reason. The list keeps every act that names a grant. Each description says "needs <grant>; your standing here is unknown", and the scope decides at the send.

## The option and its limits

`POST /v1/scopes/<membership>/sessions?standing=1` answers `{ok, token, session, standing}`. Without the option the answer has exactly the three members, and `packages/scope/test/sessions.test.ts` pins that. Any other `standing` in the query is `400 bad-request` before the body is read.

Only the MCP server and the CLI ask, through `requestSession(..., { standing: true })`. The room page, the application screens, the joining flow and the index command send the request that they sent before. The sandbox gateway allows no query on the sessions route (`packages/client/src/application-gateway.ts`), so a screen in the sandbox must not ask, and the gateway refuses `standing` (`docs/security/entry-points.md`, sandbox row). E2 opens the gateway to it.

The rolling pair is not run in the test harness. The owner test uses two stand-ins: the old route is the current route with the query dropped, and the old reader is a copy of its three-member rule. The planner runs the true pair at the deployment, in both orders: the new client against the deployed older Worker before the deployment, and the client of `91610da9` against the new Worker after it. The default path, with no option, is the older behaviour by construction.

## Tests

Every test is new, except for a few changed expectations in existing tests.
