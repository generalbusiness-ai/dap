# Signed requests across devices

Status: design for J1 ([plan 032](plans/032-2026-10-17-journey-as-acceptance-target.md), section 2b). The build lands with this note. Code citations hold at main `c1ff846e`.

Ana comments on an issue from a laptop. The page signs the act and sends it. The reply never comes, and then the laptop's battery runs out. Ana opens the room on a phone and wants to know one thing: did the comment land?

Today the page says "this page does not retain it" (`apps/room/page/src/view.ts:222`). J1 keeps a copy of the request where the phone can reach it. This note uses three terms:

- A **copy** is the exact body of one `POST /v1/scopes/:scope/acts` request.
- A copy is **open** while its row exists. No other state exists.
- To **settle** a request is to get the scope's answer for it.

The phone shows "You sent a comment on issue 12 from another device. It has no answer yet." It offers one button, **Check original request**. The steps are these:

1. Before the laptop sends the request, its page keeps a copy in the room's membership object.
2. The phone reads Ana's open copies and finds this one.
3. Ana presses the button. The phone sends the signed intent to the scope's settle route. If the act landed, the scope returns the first entry, and the copy ends.
4. If the scope holds no entry, the phone sends nothing and says when to check again: one minute past `notAfter`. Ana presses the button again after that time. The phone sends the same bytes once, the scope returns the first entry or refuses `expired`, and the copy ends.

The phone signs no act at any step. If Ana reloads the laptop's page, it takes the same path.

## One person holds several keys

One person is one `member` item. Each device is one `key` item, and its `member` ref points at that member (`packages/platform/src/membership.ts:268-273`). So a second device is a second key. A browser key is non-extractable, so it is not a copied key (`packages/client/src/browser-key.ts:22`). A controller links an agent to its person, so it is not a controller (`membership.ts:430`).

**The page cannot make a second key today, so J1 starts there.** The native acts exist: `invite-key` with kind `device`, then `enrol` signed by the new key (`membership.ts:369-376`, `:410-420`). The page creates only `person` and `agent-key` invitations (`apps/room/page/src/connection-custody.ts:15`) and redeems only `join` (`apps/room/page/src/data.ts:305`).

J1 adds a `device-key` invitation: a separate tag with a closed input, as `checker-key` is (`packages/cli/src/invitations.ts:19-24`). An admin's page creates it for an existing member, and the new browser redeems it with `enrol`. Only a role that holds `membership.invite` creates one (`membership.ts:110`).

## 1. Keep the copy in the membership object

Each copy is one row in a new table of the membership scope's object, outside its history, beside `session_request`.

- That object already keeps per-key rows outside history (`packages/scope/src/sessions.ts:406-419`).
- It alone can read a key's standing from its own head (`membership.ts:811`).
- Every host runs its class, `DeployedScope` (`apps/room/wrangler.jsonc:66`, `apps/room/celld/wrangler.json:13`). So J1 needs no new class and no Durable Object migration.

The other real design, a new object per member, isolates load. It costs a one-way migration on every Worker, so the membership object is the better place.

The routes sit under `/v1/scopes/:membership/originals`. `POST` keeps a row and returns 204, 409 `conflict`, 507 `full` or 423 `room-full`. `GET` returns a page of the member's open copies, without bodies. `GET /:digest` returns one copy's exact bytes. `DELETE /:digest` ends a copy.

All four take the session in the `Authorization` header and set `cache-control: no-store`. They answer only on an active membership scope, and otherwise return `not-found`. The page sends acts from three places (`data.ts:1133`, `:1145`, `apps/room/page/src/retained-editor-data.ts:169`), and each keeps the copy first. If the object does not keep it, the page says that nothing was sent.

## 2. Only the same member reads a copy

The object serves a row only when the session's member equals the row's member. No role reads a copy directly: not an admin, a controller, a checker or another member. The recovery key has no session (`membership.ts:642`). Another member's digest returns `not-found`.

A holder of `membership.invite` can reach a copy indirectly. That holder, or the recovery key, can add a key to the member with `invite-key` (`membership.ts:369-376`), and after `enrol` the new key reads the copies. This authority is not new, because the same key can sign as that member. The journal shows both acts.

At each request, the object verifies the session and takes its key (`sessions.ts:297`). It reads that key's standing from its own head, and the key and the member must both be `active`. It then compares the member handle with the row. A removed handle is never reused (`membership.ts:87`).

A `POST` has four more conditions:

- `verifySignedIntent` passes, and `intent.actor` equals the session's key. So a member cannot keep another person's request.
- `notAfter` lies ahead of the object's clock and within the 15-minute bound.
- `kind` is at most 256 bytes. The rest of a row has one form, so 64 rows always fit the list's reply: a row is under 1,900 bytes, 64 rows are under 121,600 bytes, and the client's bound on a reply is 1,052,672 bytes. `packages/scope/src/originals.ts` states the arithmetic.
- The digest is new, or the bytes match. The digest covers only the signed intent, and `texts`, `presented` and `values` travel unsigned. The same digest with the same bytes returns 204 and charges nothing. The same digest with other bytes returns 409 and keeps the first.

**J1 widens what a session can do.** Today a session only reads (`sessions.ts:297-300`). Under J1 a token also reads the bytes of the member's unlanded requests, can deliver one, and can delete a row. A deletion loses only the button, and the journal stays true. A `POST` needs the signature, so the token can make a copy only of a request that its key signed. The digest does not cover the unsigned parts, so a holder can delete a row and keep it again with other unsigned parts, or make a row from a request that the key already signed and that has not expired. The scope verifies those parts when they are sent, and the signature still binds the act, so this grants nothing. J1 corrects the texts that say a session controls nothing (`packages/client/src/session.ts:4`, `packages/contract/src/session.ts:4`, and "Read sessions" in `packages/scope/README.md`).

**The routes use `holder(reader, "summary")` and add no `ReadName`.** A new name needs no kernel change: `ReadName` lives in `packages/scope/src/ports.ts:220`, and the contract holds `reads` as strings (`packages/contract/src/session.ts:41`). But it narrows nothing. `readsOf` gives every member the same list (`sessions.ts:331-335`), and a session request cannot ask for less (`session.ts:32`). It also costs: `isClaims` refuses an unknown name (`sessions.ts:139`), so a new token fails every read at an object that runs old code. The member compare does the real work.

| Who holds a person's session today | Reach under J1 |
|---|---|
| The room page, in memory (`data.ts:91`) | The intended reader. |
| Local `dap mcp` and its views, in memory (`packages/mcp/src/reads.ts:26`, `packages/mcp/src/views/member-reads.ts:11`, `apps/views/src/reads.ts:55`), and the CLI, in private device storage (`docs/architecture.md:260`) | The token reaches copies, and the same machine holds a key that signs as the person. J1 adds no tool. |
| An application page | None. A screen loses `authorization` (`apps/sandbox/worker.ts:59`), and the gateway list omits these routes (`packages/client/src/application-gateway.ts:55`). |
| Hosted `McpAgent` | None. Its session states the agent (`packages/mcp/src/hosted.ts:428`), and the compare fails. |

A hosted MCP server should not reach the bytes of a person's unlanded acts, and under J1 it does not. A later head that gives a hosted server a person's session adds the `ReadName` and withholds it there.

## 3. A session of the same member proves the reader

The second device already holds its own enrolled key and a read session. The session states its member and key (`sessions.ts:385`), and only an active key of an active member gets one (`sessions.ts:378-379`). The device does not need the first device's key or session, the invitation secret, an admin, or the recovery key.

**The button makes no signature.** The settle route and the act route take no reader, and the scope judges the bytes alone (`packages/scope/src/worker.ts:489`, `:499`). The page signs for a session under `artroom-session-request-1` when it opens a room and when a session ends (`data.ts:116-118`), with or without J1. Any proof that a device holds a key needs a signature at some point, and this one's domain keeps it apart from every intent (`packages/contract/src/session.ts:15-19`).

So the second device makes no `artroom-intent-1` signature until the copy ends. It makes no signature of any domain from the button to the answer while its session is current. Its `enrol` is one earlier signature, at setup. After the answer, the page redraws, and its key store checks the stored key by signing 32 random bytes with no domain (`apps/room/page/src/browser-key-store.ts:43`). The store discards that signature, and the check predates J1.

## 4. The copy holds the request and nothing else

The copy is `{ signed, grants, texts?, presented?, values? }`, as `packages/client/src/http.ts:118` writes it, with `grants` empty and the route's 1 MiB bound. It holds no key and no token. To send it again, the page parses it and calls the same `transport.submit`.

**The bytes are plain text to the deployment.** The deployment reads the same bytes at `/acts`. On acceptance, it keeps them in the target's history. The one new exposure is a request that never landed or was refused: it rests at the host for up to seven days. J1 adds no encryption: the two keys share no secret, and the host reads the same bytes at `/acts`.

**The copy grants nothing beyond this one act.** The signature covers the whole intent, in the domain `artroom-intent-1`: `to` with its incarnation, `actor`, `kind`, `on`, `expected`, `fields`, `idempotencyKey` and `notAfter` (`packages/contract/src/intent.ts:34-44`).

| Use of the copy | Result | Where |
|---|---|---|
| Send it after it landed | The first entry, and no new entry | `packages/derive/src/judge.ts:218-219` |
| Send it to another scope or incarnation | `misaddressed` | `judge.ts:213` |
| Change any signed member | `bad-intent` | `judge.ts:209` |
| Send it unlanded at or past `notAfter` | `expired` | `judge.ts:224` |
| Change a detached text or value | The scope verifies each one itself | `worker.ts:475` |
| Present its signature as a session or a signed read | Fails: another domain | `session.ts:15-19` |
| Hold a stolen session of the member | Reads, delivers or deletes the member's copies until `ends`, at most 600 seconds. Can make a copy only of a request that its key signed, and the unsigned parts can differ. The scope verifies them when they are sent | `sessions.ts:385` |
| Send it unlanded before `notAfter` | Lands once, judged on the signer's standing and signed revisions | `judge.ts:218-224` |

The last row is the copy's one power. It can finish only the act that the signer already asked for. The page that receives a copy verifies the signature and the actor's member, and otherwise sends nothing.

## 5. The scope's answer ends the copy

J1 reuses the route of S6 (`apps/views/README.md`, "Change card", and `packages/mcp/src/service.ts:1009-1016`). The time to send is `notAfter` plus `EXPIRY_MARGIN_MS` (`service.ts:190`), and that constant moves to the client package.

An `accepted` answer that `followReceipt` verifies ends the copy, as `data.ts:317` does for a join. `archived`, `mismatch` and `refused` end it too. `unavailable` and a lost reply leave it open. A `DELETE` ends the copy, and in the ordinary case the first device sends it right after its answer. The next view reads with `atLeast` set to the answer's fact (`packages/contract/src/read.ts:17`, DX-A2).

These rules complete the route:

- **Clocks.** The second device times the send by its own clock, as S6's server does. If that clock runs more than one minute ahead of the scope's, the act can land when Ana expected a refusal. Its signed revisions still bind it.
- **A request in flight.** A row exists from before the send until the answer. No device can tell an ordinary request from a lost one before the margin passes, and J1 adds no row age. So another key shows the same line and button for both. The button sends nothing before the margin.
- **The lock follows the key that signed.** The page offers only the button at a scope in two cases. One is today's fence in that page's memory (`apps/room/page/src/main.ts:636-639`, `uncertain` at `apps/room/page/src/actions.ts:16`). The other is an open row whose `intent.actor` is this page's key, so the lock survives a reload, as the S6 card's does. Neither adds state. A second tab in one browser holds the same key, so it follows the lock too.
- **Another key keeps its acts.** Each act signs its own revisions, and the scope orders them. At worst Ana comments twice, with the line in view. The lock holds one key at one scope, at most until the margin passes. If the act landed, the button ends it at once.
- **Time bound.** A row with no answer goes seven days past `notAfter`, plus the delay of the object's one alarm. `Wakes.set` takes the minimum of its causes (`packages/scope/src/outbox.ts:79-87`), so one cause cannot clear another. Membership already shares the alarm with `key-invitation-end` (`membership.ts:551`). J1 adds one cause beside `credentials`, on the model of `CredentialStore.expiryWake` (`packages/scope/src/credential-store.ts:98`, `packages/scope/src/object.ts:861-870`). A `DELETE` leaves the wake, and an early wake clears itself.
- **Caps.** The object allows 64 rows and 16 MiB per member, and 1 GiB per membership object. Over a member's cap, the route returns `full`. The page sends nothing and says "You have too many open requests".
- **A full object.** On the object's cap, `keep` first drops rows of members who are no longer active or who hold no active key, in a bounded quantum of 16 members and 64 rows. It then checks the cap again, and a later `keep` continues. A retired key of a member with another active key keeps its rows. If the object is still full, the route returns `room-full`, and the page says that the room has no space. The object's cap does not refuse a request to this membership scope, so an admin can still remove a member. The member's own caps still apply.
- **A stop around the keep.** The page's check runs before the keep. If anything stops the send after the keep, the page ends the row, because a row reads "You sent" and a press past the margin sends its bytes.
- **A failed read.** A failed list is not an empty list. The page says that it could not read the open requests, and it keeps the last rows it read, so the lock and the button stay.
- **A failed renewal.** A page that held a session and failed to renew it stops the send and says why. The next send asks for a session again.

## 6. A lost device loses no copy

The copy never lived on the lost device, so another key of the same member settles it.

- **Someone revokes the key** (`membership.ts:508`). The member still reads that key's copies. A landed act still returns its first entry, and an unlanded one is refused. Either answer ends the copy. Before the revocation a thief can sign, and the copy adds nothing to that. After it, the copy routes refuse that key at once, and its session reads other scopes for up to 600 more seconds (`sessions.ts:45-48`).
- **Ana held only that device.** An admin invites a new `device` key for the same member. It reads the open copies within the seven days, unless a full object dropped them first, because the member held no active key. The recovery key does this for a last admin.
- **The time bound passed, or the member was removed.** No one reads the copy, and a full object can drop it. The journal holds any act that landed.

A copy restores no key and no standing.

## 7. Kernel change

J1 needs no kernel change. It meets none of the conditions in [`docs/kernel.md`, section 7](../docs/kernel.md#7-rule-for-adding-to-the-kernel). It adds no file, export or type to `packages/contract`, `packages/derive` or `packages/bytes`, and it corrects one comment in `packages/contract/src/session.ts`. It adds no scope kind, platform name, capability name, field type, reason code or `platform:membership` version. `docs/kernel.md` section 7.1 does not hold J1, because J1 adds no tool family and no new entry kind.

[Plan 032](plans/032-2026-10-17-journey-as-acceptance-target.md) section 7 lists draft changes and holds no route. If J1 comes to need a contract export, it follows `docs/kernel.md` section 7.

## 8. Test and witness

**The test** is `apps/room/page/test/original-copy.scope.test.ts`, in the `scope` project, on real scopes through the Worker's routes with an injected clock.

| Case | Observes |
|---|---|
| `a second key of one member settles a lost reply` | The "Reply lost" column of the witness table. |
| `an act that never arrived ends refused expired` | The "Never arrived" column, and no `/acts` before the margin. |
| `another member and a revoked key read nothing` | `not-found` and `forbidden`. A retired first key's copy stays readable by the second key. |
| `a copy lands nowhere else` | Each row of the "Use of the copy" table. |
| `a full cap sends nothing` | The 64th copy passes. The 65th returns `full`, and no `/acts` follows. A full object returns `room-full`. |
| `a repeat with other bytes keeps the first` | Same bytes: 204 and no charge. Other bytes: 409, and `GET` returns the first. A lane scope returns `not-found`. |
| `an open copy locks only its own key` | During a held request, the second key sees the button and its own act lands. The first key's reloaded page offers only the button until the margin passes. |
| `an idle object drops a row at seven days` | With no request, the alarm deletes the row past the bound and keeps it before. A live `key-invitation-end` still fires. |
| `a long kind keeps no row, and 64 rows fit the list's reply` | A `kind` of 257 bytes returns `bad-request`. 64 rows of the longest `kind` come back in one reply, within the arithmetic. |
| `a failed read keeps the last rows and the lock` | A lost reply and a refused read each report a failure, with the last rows and the lock. A good read ends the failure. An empty list stays an empty list. |
| `a full object drops the rows of a member who left or holds no key` | A removed member's rows and those of a member with no active key go, and the keep passes. A retired key's rows stay while its member holds another key. |
| `a full object still takes a request to membership, under the member's own caps` | A request to this scope passes the full object, and an admin removes a member through the page. The member's own cap still returns `full`. Another incarnation gets no exception. |
| `a full object and a full member say different things` | The page's two sentences, each exact, and no `/acts` after either. |
| `a full object frees a bounded quantum at each keep` | One keep drops at most 64 rows and examines at most 16 members. The next keep continues from where the last stopped. |
| `a stop around the keep leaves no row` | A stop before the keep makes no request to the copy routes. A stop after it ends the row, on both of `act`'s paths, and no `/acts` follows. A row that the page cannot end stays, and the words say so. |
| `a room change after the editor's keep ends the copy and sends nothing` (in `retained-editor.scope.test.ts`) | The retained editor's check after the keep stops the send and ends the row. |
| `a page that held a session and failed to renew it stops the send` | No `/acts`, and the exact sentence. A page that opens on signed reads sends as it did, with no copy. The next send after the connection returns renews, keeps and sends. |
| `an answer lifts only this page's own fence` | An answer lifts this key's fence at the row's scope. Another key's answer, and a press with no answer, lift nothing. |

The landing's evidence measures the two added requests per act, in round trips, under this Worker's local test or better.

**The witness** is `apps/room/page/test/two-devices.mjs`. `playwright-core` stays outside the checkout, and the gate does not run it (`apps/room/page/test/screens.mjs:1-8`). It uses a local Worker from a pinned `wrangler`, because playback verifies no signature (`screens.mjs:14`). Two `browser.newContext()` calls give two devices with separate IndexedDB stores. The second enrols through the `device-key` invitation. The first then closes, and the second reloads before the press. The "Never arrived" column uses a third context in the first context's place, with the same second context. The witness also checks three things that the table does not count: a failed read keeps the line, the button and the lock; a stopped keep sends nothing, and the next send clears its words; and a press on the page that sent the request lifts that page's fence.

The witness counts in three places:

- **Requests.** A `context.route` handler logs every POST to `/acts` with its body's SHA-256. "Reply lost" calls `route.fetch()` and then `route.abort()`. "Never arrived" calls `route.abort()` alone.
- **Signatures.** `context.addInitScript` wraps `crypto.subtle.sign` and logs the domain tag, the bytes up to the first newline (`packages/bytes/src/domains.ts:15-16`). A browser key signs only through that call (`browser-key.ts:55-57`). The first context's one intent shows that the counter works. The witness closes the window of the table's fourth row at the scope's reply, and it reports the key store's check apart.
- **Journal.** The witness compares each entry's `input.signed` with the first context's bytes.

| Observed | Reply lost | Never arrived |
|---|---|---|
| First device's `/acts` that reached the Worker | 1 | 0 |
| Second device's `/acts` | 0 | 1, same SHA-256 |
| Second device's `artroom-intent-1` signatures | 0 | 0 |
| Signatures of any domain, button to answer | 0 | 0 |
| Entries under that idempotency key | 1, the first device's bytes | 0 |

"Never arrived" waits about six minutes of real time (`packages/client/src/intent.ts:71`, plus the margin).

## 9. Limits and deployment

These limits apply to J1:

- **The page only.** Plan 032 says "every person's act". J1 closes that condition for the room page only. `dap mcp` and the CLI keep their custody on their machine, and a phone cannot see those requests. The routes take any session, so a writer needs no new design.
- **The planner's ruling on other writers** (act `d64edebe`). J1's head closes the plan's condition for the room page, and the condition stays open for other writers.
  - **`dap mcp`.** The builder owns this writer, as one small follow-up after J1 lands. It uses the same routes and the same rules, when the service holds a person's session. Its witness sends a request through `dap mcp` and loses the reply. The page on a second device then settles the request, and nothing goes out twice. J1 does not build this writer.
  - **The CLI.** The CLI stays with its private device storage.
  - **A hosted agent.** A hosted agent's custody stays separate, because a hosted agent holds its own keys.
- **No session, no copy.** `join`, `enrol` and start requests keep their browser custody, because their signer holds no session yet. A page that opens on signed reads behaves as it does today: it keeps no copy, and it sends.
- **A page that lost its session.** The page remembers in memory that it held a session. A reload forgets this, so a page that reloads during the failure opens on signed reads and sends with no copy.
- **Connection requests skip the copy.** `issueInvitation` (`apps/room/page/src/connection-custody.ts`) signs through the shared helper of `packages/cli`, which keeps its own record in that browser. The page has read `room.me` by then, so the signer can hold a session, and a second device still cannot see the request. This is a choice of this build, and a later head can route it through the copy.
- **`issueDeviceKey` keeps a copy and skips the lock and the fence.** It calls `act` directly, so the copy exists and the button settles it, but the page's checks in `send` do not run. A second press can make a second invitation while the first is open. After a lost reply, the secret is gone: the page held it only in that call, so a landed invitation has no link. The admin makes another link, and the first invitation ends at its `inviteEnds`, 24 hours later.
- **A device link's `expected` goes stale.** The link states the revisions of the roster and of the member when the link was made. A later `enrol` or `invite-key` on that member moves them, so a second outstanding link gets `revision-moved`. The admin makes that link again.
- **A held request can hide an act.** A row locks one key at one scope, until `notAfter` plus the margin, about six minutes for a page's five-minute intent. Other keys keep their acts. An opening act also locks the directory, so that key opens nothing new for that time. A lock on membership can delay that key's own `revoke-key`, and a second admin or the recovery key still acts. A slow device clock extends the lock, and the way out is another device.
- **A room that cannot make space.** A room with no removal possible and every member active stays full until rows end, at most seven days past each `notAfter`. Removing a member frees their rows only when a later `keep` finds the object full. A request to this membership scope passes 1 GiB, so only each member's own 16 MiB bounds those rows.
- **A row the page cannot end.** If the send stops after the keep and the `DELETE` fails too, the row stays, and the page's words say so. A press past the margin sends its bytes. The scope refuses `expired`, unless a device clock runs ahead.
- **A first read that fails.** A page with no earlier read has no rows to keep, so it says that the read failed and it shows no lock. Its keep then decides whether a send goes.
- **`kind` has a bound here.** The page cannot keep, and so cannot send, an act whose `kind` is over 256 bytes.
- **`/originals` tells a scope's kind.** It answers 404 at a scope that is no membership scope, and 403 at a membership scope with no token. So a caller with no token learns which kind a scope is.
- **No proof of absence.** A missing row does not show that no act was sent. The journal stays the only proof.
- **Redaction.** A copy can hold a redacted text until the copy ends.
- **Cost.** Each act adds two requests to the membership object: `POST originals` before the send and `DELETE originals` after the answer. The page also adds one entry read at the target that verifies the receipt, and one `GET originals` per draw of a view. While copies are open, a draw also lists the room's lanes. An observed run of 10 comments through the page, in Chromium, against a local `wrangler dev` Worker on loopback, gave these times from Chromium's `responseEnd`. They state the Worker's own work and no network distance.

  | Request | Requests per comment | Median | Longest |
  |---|---|---|---|
  | `POST originals` | 1 | 3.475 ms | 8.421 ms |
  | `DELETE originals` | 1 | 3.781 ms | 12.625 ms |
  | `POST acts`, for comparison | 1 | 7.534 ms | 11.24 ms |
  | `GET originals` | 1 or 2, one per draw | 2.269 ms | 10.071 ms |

  A hosted room adds one real round trip to each of these requests. The run measured none.

Hosted code changes are `packages/scope/src/originals.ts` and the routes and wake in `object.ts`, `worker.ts` and `outbox.ts`. The page gains its writer and button in a rebuilt `apps/room/page/assets.ts`.

The planner deploys all three room Workers in a later deployment. J1 has no migration, so a rollback stays possible, and the time bound stops until new code runs again.

The deployment has one cost. Objects run old code for some minutes after a deployment. During that time the copy route returns 404, so every page act in that room fails with "nothing was sent", and each view says that it could not read the open requests. Both end when the new code runs.
