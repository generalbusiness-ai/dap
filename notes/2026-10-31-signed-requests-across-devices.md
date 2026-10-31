# Signed requests across devices

Status: design for J1 ([plan 032](plans/032-2026-10-17-journey-as-acceptance-target.md), section 2b). Nothing here is built, and no case or witness here has run. Code citations hold at main `b686862e`.

Ana comments on an issue from her laptop. The page signs the act and sends it. The reply never comes, and then the laptop's battery runs out. Ana opens the room on her phone and wants to know one thing: did the comment land?

Today nothing can tell her. The page says "this page does not retain it" (`apps/room/page/src/view.ts:222`), and the signed request went with the laptop's memory.

J1 keeps a copy of the request where the phone can reach it. This note uses three terms:

- A **copy** is the exact body of one `POST /v1/scopes/:scope/acts` request.
- A copy is **open** while its row exists. No other state exists.
- To **settle** a request is to get the scope's answer for it.

With J1, the phone shows "You sent a comment on issue 12 from another device. The outcome is unknown." It offers one button, **Check original request**. The steps are these:

1. Before the laptop sends the request, its page keeps a copy in the room's membership object.
2. The phone opens the room, reads Ana's open copies, and finds this one.
3. Ana presses the button. The phone sends the signed intent to the scope's settle route. If the act landed, the scope returns the first entry, and the copy ends.
4. If the scope holds no entry, the phone waits until one minute past `notAfter`. It then sends the same bytes once. The scope returns the first entry or refuses `expired`, and the copy ends.

The phone signs no act at any step. If Ana reloads the laptop's page, it takes the same path.

## One person holds several keys

One person is one `member` item. Each device is one `key` item, and its `member` ref points at that member (`packages/platform/src/membership.ts:268-273`). So a second device is a second key. It is not a copied key and not a controller.

No device can export a browser key. The page makes the key non-extractable (`packages/client/src/browser-key.ts:22`) and offers no export (`apps/room/page/src/browser-key-store.ts:1-2`). A controller links an agent to its person (`membership.ts:430`), and J1 gives a controller no access.

**The page cannot make a second key today, so J1 starts there.** The native acts exist: `invite-key` with kind `device`, then `enrol` signed by the new key (`membership.ts:369-376`, `:410-420`). The page creates only `person` and `agent-key` invitations (`apps/room/page/src/connection-custody.ts:15`), and it redeems only `join` (`apps/room/page/src/data.ts:305`). A person invitation creates another member, so it does not add a device (`apps/room/docs/roles-and-membership.md:40`). The paste route takes a 32-byte seed (`apps/room/page/src/main.ts:872`), and only a key made outside a browser has one.

J1 adds a `device-key` invitation. An admin's page creates it for an existing member, and the new browser redeems it with `enrol`. It reuses the invitation stages and the retained `enrol` of `packages/cli/src/invitations.ts:311`, `:416`. Only a role that holds `membership.invite` creates one (`membership.ts:110`). The two-context witness runs this path, so a person's real second key settles the request.

## 1. Keep the copy in the membership object

Each copy is one row in a new table of the membership scope's object, outside its history. The table sits beside `session_request`.

- That object already keeps per-key rows outside history and deletes them when they expire (`packages/scope/src/sessions.ts:406-419`, `packages/scope/src/object.ts:329`).
- It alone can read a key's standing from its own head when a reader asks (`membership.ts:811`).
- Every host runs its class, `DeployedScope` (`apps/room/wrangler.jsonc:66`, `apps/room/celld/wrangler.json:13`). So J1 needs no new class and no Durable Object migration.
- Every act that needs a grant already reads this object (`packages/scope/README.md:84`). So the copy adds no new dependency to such an act.

The other real design is a new object per member, as `McpAgent` is per agent. It isolates load, and it costs a one-way migration on every Worker and a second route to standing. The membership object is the better place. J1 also does not reuse `packages/mcp/src/sqlite-custody.ts`, because custody's phases describe one server's view of a request, and J1 adds no phase.

| Route, all under `/v1/scopes/:membership/originals` | Does |
|---|---|
| `POST`, body the copy | Keeps the row and reads it back. Returns 204, or 507 `full`. |
| `GET ?cursor=` | Returns one page of the member's open copies: digest, actor, `to`, kind, `on`, `notAfter`, bytes. |
| `GET /:digest` | Returns the copy's exact bytes. |
| `DELETE /:digest` | Ends the copy. A repeat returns the same status. |

All four take the session in the `Authorization` header and set `cache-control: no-store`. The page sends acts from three places (`data.ts:1133`, `:1145`, `apps/room/page/src/retained-editor-data.ts:169`). All three use one function, and it keeps the copy first. If the object does not keep the copy, the page says that nothing was sent. MCP custody follows the same order (`packages/mcp/src/custody.ts:1-5`).

## 2. Only the same member reads a copy

The object serves a row only when the session's member equals the row's member. An admin, a controller, a checker and another member read nothing. The recovery key has no session, because it is never a member's key (`membership.ts:642`). An unknown digest and another member's digest return the same `not-found`.

The object takes these steps at each request:

1. It verifies the session and takes its key, with `holder(reader, "summary")` (`sessions.ts:297`).
2. It reads that key's standing from its own head. The key and the member must both be `active` (`membership.ts:811`).
3. It compares the member handle with the row. A removed handle is never reused (`membership.ts:87`), so no later person inherits a row.

A `POST` adds three conditions. `verifySignedIntent` must pass, `intent.actor` must equal the session's key, and `notAfter` must lie ahead of the object's clock and within the 15-minute bound. So a member cannot keep another person's request as their own.

## 3. A session of the same member proves the reader

The second device already holds two things. One is its own enrolled key. The other is a read session, and the session states its member and its key (`sessions.ts:385`). Membership gives a session only to an active key of an active member (`sessions.ts:378-379`).

The second device does not need the first device's key or session, the invitation secret, an admin, or the recovery key.

**The button makes no signature.** The settle route and the act route take no reader, and the scope judges the bytes alone (`packages/scope/src/worker.ts:489`, `:499`). The list of open copies needs the session.

The page signs for a session under `artroom-session-request-1` when it opens a room and when a session ends (`data.ts:116-118`). It does this with or without J1. J1 cannot remove this signature, because any proof that a device holds a key needs a signature at some point. It is a read credential, and its domain keeps it apart from every intent (`packages/contract/src/session.ts:15-19`).

So J1 makes these exact claims:

- The second device makes no `artroom-intent-1` signature from the lost request until the copy ends.
- It makes no signature of any domain from the button to the answer, while its session is current.
- Its `enrol` is one earlier signature, at setup.

## 4. The copy holds the request and nothing else

The copy is `{ signed, grants, texts?, presented?, values? }`, as `packages/client/src/http.ts:118` writes it. `grants` is always empty from the page. The route's 1 MiB bound applies (`packages/scope/README.md:421`). The copy holds no key and no token.

To send the request again, the page parses the copy and calls the same `transport.submit`. A JSON round trip of JSON text returns the same string, and the witness compares SHA-256 digests to prove it.

**The bytes are plain text to the deployment.** The deployment reads the same bytes at `/acts`. On acceptance, it keeps them in the target's history. The one new exposure is a request that never landed or was refused: it can rest at the host for up to seven days. J1 adds no encryption. The two keys share no secret, because each is a sign-only Ed25519 key. Encryption would also hide nothing from a host that reads the same bytes at `/acts`.

**The copy grants nothing beyond this one act.** The signature covers the whole intent, in the domain `artroom-intent-1`: `to` with its incarnation, `actor`, `kind`, `on`, `expected`, `fields`, `idempotencyKey` and `notAfter` (`packages/contract/src/intent.ts:34-44`).

| Use of the copy | Result | Where |
|---|---|---|
| Send it after it landed | The first entry, and no new entry | `packages/derive/src/judge.ts:218-219` |
| Send it to another scope or incarnation | `misaddressed` | `judge.ts:213` |
| Change any signed member | `bad-intent` | `judge.ts:209` |
| Send it unlanded at or past `notAfter` | `expired` | `judge.ts:224` |
| Change a detached text or value | The scope verifies each one itself | `worker.ts:475` |
| Present its signature as a session or a signed read | Fails: another domain | `session.ts:15-19` |
| Send it unlanded before `notAfter` | Lands once, judged on the signer's standing and signed revisions | `judge.ts:218-224` |

The last row is the copy's one power. It can finish only the act that the signer already asked for. The page that receives a copy also verifies the signature and confirms that the actor is a key of its own member. Otherwise it shows the row as unreadable and sends nothing.

## 5. The scope's answer ends the copy

J1 reuses the route of S6 (`apps/views/README.md:109-119`, `packages/mcp/src/service.ts:1009-1016`):

1. The page asks the settle route (`packages/scope/src/core.ts:795-810`).
2. If the scope holds no entry, the page shows the time to press again, `notAfter` plus `EXPIRY_MARGIN_MS` (`service.ts:190`). That constant moves to the client package, and both callers use it.
3. After that time, the page sends the same bytes once. The scope returns the first entry or refuses `expired` (`judge.ts:218-224`).

An `accepted` answer that `followReceipt` verifies ends the copy, as `data.ts:317` does for a join. `archived`, `mismatch` and `refused` end it too. `unavailable` and a lost reply leave it open. A `DELETE` ends the copy, and J1 adds no state.

In the ordinary case, the first device deletes the copy right after its answer. If that `DELETE` fails, the copy stays open until a device presses the button.

These rules complete the route:

- **Time bound.** A row with no answer goes seven days past `notAfter`, the length of `packages/mcp/src/hosted.ts:50`. Each request to these routes deletes such rows first, as `sessions.ts:419` does, and needs no alarm.
- **Other acts.** While a copy is open at a scope, the page offers only the button at that scope, through `uncertain` (`apps/room/page/src/actions.ts:16`). The S6 card follows the same rule.
- **Two devices.** If both send the copy, they send the same bytes, and the scope returns the same result to each.
- **Next view.** The page reads with `atLeast` set to the answer's fact (`packages/contract/src/read.ts:17`, DX-A2), so its next view holds the entry.
- **Who ends a copy.** The object does not judge the answer. A session of the member can delete its own row. That loses only the button, and the journal stays true.
- **Caps.** The object allows 64 rows and 16 MiB per member, and 1 GiB per membership object. It charges bytes at the `POST`. A `POST` over a cap returns 507 `full`. The page then sends nothing and shows the open copies to settle first.

## 6. A lost device loses no copy

The copy never lived on the lost device.

- **Ana holds another key.** She settles the request from it. The lost key stays active until someone revokes it.
- **Someone revokes the key.** The `revoke-key` act needs `membership.manage` or the recovery key (`membership.ts:508`). The member can still read that key's copies. A landed act still returns its first entry, because the judge looks there first. An unlanded act is refused. Either answer ends the copy.
- **A thief holds the device.** The thief can sign until the revocation, and the copy adds nothing to that. The copy routes refuse the revoked key at once, because they read standing from the head. The thief's session can read other scopes for up to 600 more seconds (`sessions.ts:45-48`).
- **Ana held only that device.** An admin invites a new `device` key for the same member. The new key reads her open copies within the seven days. The recovery key does this when she was the last admin. A person invitation creates a new member, who reads nothing.
- **The time bound passed, or the member was removed.** No one reads the copy. The journal still holds any act that landed.

A copy restores no key and no standing.

## 7. Kernel change

J1 needs no kernel change. It meets none of the conditions in [`docs/kernel.md`, section 7](../docs/kernel.md#7-rule-for-adding-to-the-kernel):

- It adds no file or export to `packages/contract`, `packages/derive` or `packages/bytes`.
- It adds no scope kind, platform name, capability name, field type or reason code. `full` is a route word, not a contract refusal.
- `ScopeApi` and `Transport` stay as they are. The routes live in `packages/scope`, the helper lives in `packages/client`, and both are platform services.
- It needs no new `platform:membership` version. The table sits outside the fold, and `invite-key`, `enrol` and kind `device` exist.
- `docs/kernel.md` section 7.1 does not hold J1, because J1 adds no tool family and no new entry kind.

The section 7 of `notes/plans/032-2026-10-17-journey-as-acceptance-target.md` lists draft changes and holds no route. If a review finds that J1 needs a contract export, J1 follows `docs/kernel.md` section 7.

## 8. Test and witness

**The test** is `apps/room/page/test/original-copy.scope.test.ts`, in the `scope` project, on real scopes through the Worker's routes with an injected clock.

| Case | Observes |
|---|---|
| `a second key of one member settles a lost reply` | One entry. The second key's signer signs no `artroom-intent-1` bytes, and its fetch posts no `/acts`. |
| `an act that never arrived ends refused expired` | No `/acts` before `notAfter` plus the margin. Then one `/acts` body with the first body's SHA-256. The answer is `expired`, the scope has no entry, and the row is gone. |
| `another member and a revoked key read nothing` | `not-found` and `forbidden`. A retired first key's copy stays readable by the second key. |
| `a copy lands nowhere else` | Each row of the "Use of the copy" table. |
| `a full cap sends nothing` | The 64th copy passes. The 65th returns `full`, and no `/acts` follows. |

Four controls each turn a named case red:

- The page keeps the copy after it sends.
- The object omits the member compare.
- The button signs a new intent.
- The page sends before the margin passes.

**The witness** is `apps/room/page/test/two-devices.mjs`. As with `screens.mjs`, `playwright-core` stays outside the checkout, and the gate does not run it (`apps/room/page/test/screens.mjs:1-8`). It runs against a local Worker started by a pinned `wrangler` from a scratch directory, because playback verifies no signature (`screens.mjs:14`). Two `browser.newContext()` calls give two IndexedDB stores, so they are two devices. The second enrols through the `device-key` invitation. The first context then closes, and the second reloads before Ana presses the button.

The witness counts in three places:

- **Requests.** A `context.route` handler on each context logs every POST to `/acts` and `/settle` with its body's SHA-256. "Reply lost" calls `route.fetch()` and then `route.abort()`. "Never arrived" calls `route.abort()` alone.
- **Signatures.** `context.addInitScript` wraps `crypto.subtle.sign` before page code runs and logs the bytes up to the first newline, the domain tag (`packages/bytes/src/domains.ts:15-16`). A browser key signs only through that call (`browser-key.ts:55-57`). The first context's one `artroom-intent-1` shows that the counter works.
- **Journal.** The witness reads the scope's entries and compares `input.signed` with the first context's bytes.

| Observed | Reply lost | Never arrived |
|---|---|---|
| First device's `/acts` that reached the Worker | 1 | 0 |
| Second device's `/settle` | 1 | At least 1 |
| Second device's `/acts` | 0 | 1, same SHA-256 |
| Second device's `artroom-intent-1` signatures | 0 | 0 |
| Signatures of any domain, button to answer | 0 | 0 |
| Entries under that idempotency key | 1, the first device's bytes | 0 |
| Answer | The first entry | Refused `expired` |
| Open copies at the close | 0 | 0 |

"Never arrived" waits about six minutes of real time: the five-minute lifetime (`packages/client/src/intent.ts:71`) plus the margin. A session lasts ten minutes, so one session covers the wait.

## 9. Limits and deployment

These limits apply to J1:

- **The page only.** Plan 032 says "every person's act". J1 keeps copies of acts that the room page signs. `dap mcp` and the CLI keep their custody on their machine, and a phone cannot see those requests. The routes take any session, so a later head can add a writer with no new design.
- **No session, no copy.** `join`, `enrol`, start and connection requests keep their browser custody, because their signer holds no session yet. A page on signed reads behaves as it does today, with today's words.
- **An admin adds the device.** Only a role with `membership.invite` creates a `device-key` invitation.
- **No proof of absence.** A missing row does not show that no act was sent, and the list is no audit. The journal stays the only proof.
- **A person presses the button.** No device sends a copy on its own. A refused copy gets no new signature, so Ana signs a new act from a fresh view.
- **Multi-step tasks.** A copy settles one step. The retained editor's task state stays in the page that holds it.
- **Redaction.** A copy can hold a redacted text until the copy ends.
- **Cost.** Each act adds two requests to the membership object. Nobody has measured this.

Hosted code changes:

- `packages/scope/src/originals.ts` is new, with the table and the four routes in `object.ts` and `worker.ts`.
- The page gains its writer and button, a rebuilt `apps/room/page/assets.ts`, and new words at `view.ts:222` and `main.ts:219`.
- `scripts/security-entry-points.test.mjs` gains seals, and `packages/scope/README.md` gains rows.

The planner deploys all three room Workers after the J4 witness closes. J1 has no migration, so a rollback stays possible, and the table stays inert under old code. Objects run old code for some minutes after a deployment. During that time the copy route returns 404, and the page reports that nothing was sent. J1 changes no room's rules and no membership pin.
