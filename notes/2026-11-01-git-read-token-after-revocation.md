# A Git read token after its key is revoked

Status: design, no code is built.

Teo keeps a member key on a laptop. Mara is an admin of the same room. The room publishes to a repository on Cloudflare Artifacts, and Rita operates the Worker.

On Tuesday at 09:40, Teo calls Mara. Someone stole the laptop during the night. Mara runs these commands from Mara's own config directory.

```
dap items membership --query <query>
dap act revoke-key --on membership --target <key-item> --set as=compromised
dap log destination
```

The log has these two rows. The times in this scene are invented.

```
sc_p6xp2lmd...:41  2099-01-01T03:12:00Z  act read-token by key_teoLaptop...; 2 effects, 0 sends
sc_p6xp2lmd...:42  2099-01-01T03:12:01Z  outcome; 0 effects, 0 sends
```

Teo was asleep at 03:12. Mara runs `dap show sc_p6xp2lmd...:42`, and the entry gives the token's handle and its expiry, 03:12 on Wednesday. No `dap` command stops that token, so Mara tells the team four true things:

- The token, if the thief took it, reads the repository for 17 more hours. It also reads each commit that the team publishes in those hours.
- Nobody here knows whether the thief took the token. The credential route writes no entry (`packages/scope/src/object.ts:1011`).
- The journal records no clone, because a clone goes to the host. So treat every commit published before 03:12 on Wednesday as read.
- Membership gives that key no new session. A session that the thief has lasts at most 600 more seconds.

Under this note's recommendation, Mara's Tuesday is different. The token from 03:12 expired at 04:12. The thief also took a token at 09:15, and that token was still live. Mara's log shows what the destination did after the notice.

```
sc_p6xp2lmd...:58  2099-01-01T09:41:07Z  delivery tell from directory:77; 2 effects, 0 sends
sc_p6xp2lmd...:59  2099-01-01T09:41:09Z  outcome; 0 effects, 0 sends
```

`dap show sc_p6xp2lmd...:59` gives this evidence.

```
{ "key": "key_teoLaptop...", "revoked": 1, "gone": 0, "cannot": 0, "left": 0 }
```

Mara can now say: "Cloudflare confirmed the revocation of the one live read token of this key. Commits that we publish after 09:41 are safe from that token." Mara still cannot say that the thief read nothing, because the thief had hours before 09:41.

This note uses these terms:

- A **read token** is the host's credential from the act `read-token` at the destination. It reads one repository.
- The **plaintext** is the secret text of a token. Whoever has the plaintext can use the token.
- The **host ID** is the host's own nonsecret name for a token.
- The **handle** is `dap`'s own name for a token, `read:<digest>`. The host never sees a handle (`packages/scope/src/destination-host.ts:488`).
- To **take** a token is to read its plaintext once, through the credential route.
- **Custody** is the private SQL tables beside a scope's journal. No read of a scope returns them.
- An **observation** is a scope's recorded answer from membership about one key.
- The **expiry** is the time that the host gives as the last moment of a token's life.
- To **revoke a token** is to tell the host to stop it before its expiry. To **revoke a key** is the act `revoke-key` at membership. Each sentence names its object.
- The **notice** is the `compromised` tell. It goes from membership to the directory and on to the destination (`packages/platform/src/membership.ts:521`, `packages/platform/src/directory.ts:359`).
- A **pin** is the definition version that a scope fixes at its genesis (`destination-host.ts:502`).
- A **workspace token** is the host's credential from the step `hold@2:token`. A later section defines what it reads.

A file and line reference marks a fact that I read and did not run. A short file name repeats a path given earlier. References hold at main `ad411431`. A quotation with a URL comes from that page, and I read each page on 2026-11-01. I made no call to any host, Cloudflare account or GitHub App. No test ran for this note, and I read no secret. This note assumes that request `9beb1933` lands, so a key that a notice named gets no new `read-token` and no credential read. That request reaches only the destination. A later section shows that the lane route stays open.

This note recommends four things:

1. Keep the Artifacts host ID in private custody. Keep no plaintext on either host.
2. Let a notice open one operation, `revoke-reads`, that revokes the key's tokens by host ID on Artifacts.
3. Make one hour the only read token lifetime on both hosts, in a new Destination pin.
4. Leave the workspace token as it is, and say plainly what it keeps.

## A read token serves one clone or one agent's Git work

This section says who has a token and for how long, because the lifetime and the revocation need to fit that practice.

Three paths lead to a read token today:

- **`dap clone`.** The command mints a token, reads it once, and gives it to one `git clone` through the environment. The token is in no printed line and in no file (`docs/cli.md:604-610`). With `--archive`, the same command also makes one fetch of the journal refs (`packages/cli/src/commands.ts:1132-1135`). A later `git fetch` needs a new token (`docs/cli.md:630`). So a longer lifetime here gives one thing: time for one clone to finish.
- **The local MCP server, `dap mcp`.** An agent signs `repository.read-token` with its hours, then reads the plaintext with the tool `credential` (`docs/mcp.md:1236`, `:1661`). The agent's own Git then has the plaintext. This path is the only one where a token can outlast one Git process.
- **`diff` and View diff.** The server spends the token on one bounded read. View diff asks for one hour (`packages/mcp/src/service.ts:491`).

The hosted MCP server omits `credential` and `diff` (`packages/mcp/src/hosted-tools.ts:4`). So a hosted agent never has a read token. The source of the room page (`apps/room/page/src`) has no `read-token`. I found no doc and no code that plans an agent session across hours on one read token.

Workspace work already runs on shorter tokens with renewal. A workspace token lasts at most 900 seconds, and a hold keeps two tokens at once so that a holder can renew (`packages/derive/src/capability/hold.ts:93`, `:283`). Cloudflare's own advice has the same shape: "Give tokens short lifetimes, and re-issue a fresh token for each agent session." (<https://developers.cloudflare.com/artifacts/concepts/best-practices/>)

## Artifacts revokes a token by ID, and GitHub needs the plaintext

This section says what each host takes, from the host's own pages, and compares that with the code.

| Host | What it takes | Source |
|---|---|---|
| Artifacts, binding | The plaintext or the host ID: "Revoke a token by plaintext or ID." and "@returns true if revoked, false if not found." | Cloudflare's published types, `@cloudflare/workers-types` 5.20261101.1, `index.d.ts`, `ArtifactsRepo.revokeToken`, <https://unpkg.com/@cloudflare/workers-types@5.20261101.1/index.d.ts> |
| Artifacts, binding page | The signature only: "`revokeToken(tokenOrId)`". The page does not say what each form does. | <https://developers.cloudflare.com/artifacts/api/workers-binding/> |
| Artifacts, REST | The host ID: "Route: `DELETE /artifacts/namespaces/:namespace/tokens/:id`". A Cloudflare API token with **Artifacts** > **Edit** authorizes it. | <https://developers.cloudflare.com/artifacts/api/rest-api/>, <https://developers.cloudflare.com/artifacts/guides/authentication/> |
| GitHub | The plaintext, as the request's own credential: "Revokes the installation token you're using to authenticate as an installation and access this endpoint." The path is `DELETE /installation/token`. | <https://docs.github.com/en/rest/apps/installations#revoke-an-installation-access-token> |

GitHub gives no ID to revoke by. The 201 reply to the token request lists `token`, `expires_at`, `permissions`, `repository_selection`, `repositories` and three `single_file` fields. None of them is a token ID (<https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app>). No endpoint on the installations page revokes another token. The only other tool that I found is broad: `PUT /app/installations/{installation_id}/suspended` "blocks the app from accessing the account's resources" (same page). It stops every room on that installation, and the page does not say that a token already minted stops.

Artifacts gives the ID in the reply to `createToken`. The types give `id` with "Unique token ID.", and `plaintext` with "Plaintext token (only returned at creation time)." The REST page shows the same four members, with `expires_at` in place of `expiresAt`. The binding page names only `plaintext` and `expiresAt`, so that page alone does not settle the ID.

The code matches the types and then drops the ID:

- The local type says `createToken` answers `{ id, plaintext, scope, expiresAt }`, and that `revokeToken` takes "A token's plaintext or its ID" (`packages/scope/src/artifacts-host.ts:29-32`). This repository's type is a statement of what the code expects. It is no proof about the host.
- `mintRead` reads `expiresAt`, `plaintext` and `scope`, and returns the handle as `id`. It never reads the host's `id` (`artifacts-host.ts:314-325`).
- `revoke` passes the plaintext to `revokeToken` (`artifacts-host.ts:327-334`). So do `createRepository`, `revokeCredential` and the internal `#read` (`:272`, `:293`, `:415`).
- `workspaceMint` keeps the host's `id`, and `workspaceRevoke` passes that ID to `revokeToken` (`:131`, `:133-136`). This code path already revokes by ID. Only a stand-in binding has run it.
- GitHub's `revoke` sends the plaintext to `DELETE /installation/token` (`packages/scope/src/github-host.ts:138-142`, `packages/git/src/github.ts:159-161`).

So `notes/implementation/2026-11-01-signed-read-refusal.md` gives the wrong reason for Artifacts when it says that `revokeToken` takes the plaintext. On Artifacts, the service cannot revoke a taken token today because `mintRead` drops the ID. On GitHub, the reason is at the host.

### Three real calls settle what the pages leave open

The planner can run these calls. I ran none of them. Each one needs a throwaway repository and no room.

1. **Artifacts, by ID.** Mint `createToken("read", 3600)`, and run `git ls-remote` with the plaintext. Run `revokeToken(id)`, and run `git ls-remote` again. Record the reply, the refusal and the delay. This call also tests the `hold@2` revocation path above. Compare the ID with the secret by program, with no output of the secret. The REST page's example ID repeats the first 16 digits of its example token. No page says that an ID contains no part of the secret.
2. **Artifacts, in flight.** Mint a token for 60 seconds, the documented minimum. Run `git clone` over a throttled link so that the pack outlasts the token. Repeat with `revokeToken(id)` during the download. Record whether the clone finishes.
3. **GitHub, in flight.** Start the same throttled clone with an installation token. Send `DELETE /installation/token` during the download, and then run `git ls-remote`. Repeat once with a clone that outlasts one hour.

## Keep the Artifacts ID, and never keep the plaintext

This section weighs each kept value, and it traces how a revocation would run.

### A write token's `revoke` shows the shape, and it does not fit as it stands

A write token's revocation runs in these steps today:

1. A notice reaches the rule `abort-if-behind`. If the key is behind the publication in the slot, the rule opens one `revoke` for the publication and empties its `token` slot (`packages/platform/src/destination.ts:2004-2021`).
2. `mintRevoked` finds the `mint` operation from the entry that opened the `revoke` (`destination.ts:924`).
3. The host port reads the plaintext from custody, binds the attempt with `expectRevoke`, and runs `provider.revoke` (`destination-host.ts:227-236`).
4. A confirmed outcome drops the plaintext (`destination-host.ts:352-356`). A `revoke` has 3 attempts, and `refused` or `unknown` opens the next (`destination.ts:75`, `:2171-2183`).

Three parts of that shape do not fit a read token:

- **One slot against many tokens.** A publication has one token at a time. A key can have any number of read tokens, because each `read-token` act adds its own `mint-read` count (`destination.ts:527`).
- **No item.** A read token's outcome yields nothing, and no item names the token. The rule says: "A read token is not revoked by an operation" (`destination.ts:2323-2333`). So no slot names it.
- **No plaintext.** `take` clears the plaintext as it returns the token (`packages/scope/src/credential-store.ts:305-311`).

### The plaintext gives too little for its custody

GitHub needs the plaintext. To revoke a token later, the service keeps the secret after it gives the token to a member. This table lists what that custody means.

| Part of custody | What it means |
|---|---|
| Rows | Each taken token keeps `plaintext` in `private_credential` until its expiry. Today `take` clears it (`credential-store.ts:33-37`, `:309`). |
| Encryption | The column is `TEXT`, with no encryption in `dap`. The platform says: "All Durable Object data, including metadata, is encrypted at rest." and "Encryption keys are managed by Cloudflare" (<https://developers.cloudflare.com/durable-objects/reference/data-security/>). |
| Expiry queue | The row stays in `private_credential_expiry` until the alarm clears it, at most 64 rows in one quantum (`credential-store.ts:113`). Delivery of an alarm has no exact time (`docs/security/entry-points.md:699-700`). |
| Who can reach it | Any code that runs in the object, so any Worker that the operator deploys. No read, entry or RPC method returns the row today (`credential-store.ts:2-3`). |
| A stolen backup | `dap` has no backup export. The platform's recovery API reaches back 30 days (<https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/>). A copy of the object's database has every token that was live at that moment, until that token expires. Today the copy has unread tokens, live write tokens and setup tokens, and no token that a member took. |
| The promise | `docs/security/trust-boundaries.md:82` says that the service keeps no plaintext of a token that a member has read. That sentence becomes false. |

The gain on GitHub is small, because GitHub expires the token within about one hour. A revocation there would run as `revoke-reads` does below, with the plaintext in place of the host ID. I recommend that the service keep no plaintext of a taken token, on either host.

### The ID needs one column and one operation

On Artifacts the ID gives the whole gain with no secret. The ID alone opens nothing: revocation needs the Worker's binding or a Cloudflare API token. Real call 1 checks that the ID contains no part of the secret.

The custody change is small. `private_read_credential` gains `host_id` and `actor`, the key that signed the act. Both stay in custody, and both stay after the token's expiry, as the other metadata do today (`credential-store.ts:9-10`). A stolen backup then shows each token's host ID and its key, and it opens no repository. I keep the ID out of the journal because no reader needs it. `hold@2` already writes its host ID into an entry (`hold.ts:889`), so real call 1 matters there too.

### One operation, `revoke-reads`, runs from the notice

The notice opens one new operation on the branch. This table compares it with `revoke`.

| | `revoke` today | `revoke-reads` proposed |
|---|---|---|
| Opened by | The rule `abort-if-behind`, `most: 6` | A new rule among the notice's effects, `most: 2` |
| `for` | The publication | The branch |
| Attempts | 3 | 3 |
| Outcome `most` | `effects: 6, operations: []` (`destination.ts:577`) | `effects: 0, operations: []` |
| What one attempt sends | One host call | At most 64 host calls, one for each row of that key not yet handled |
| Evidence | `{ token }` | `{ key, revoked, gone, cannot, left }` |

The host port selects the rows with `actor` equal to the notice's key and an expiry still ahead. It runs `revokeToken(host_id)` for each row, and it marks each row handled. The evidence counts four groups:

- `revoked`: the host returned true.
- `gone`: the host returned false, so the token was absent or had expired. The types say only "false if not found", and a repeat after a lost reply also lands here.
- `cannot`: the row has no host ID. Every GitHub token lands here, so Mara still sees the number. `dap log destination` gives each token's expiry.
- `left`: rows that this attempt did not reach.

The result is `confirmed` when `left` is 0, and `refused` otherwise, so the ledger opens the next attempt. A lost reply is `unknown`, and it also opens the next attempt. Three attempts reach 192 tokens. Past that, `left` says how many remain, and those tokens expire within the hour.

A `mint-read` in flight needs no extra work. Under request `9beb1933`, a token that the host mints after the notice cannot leave custody, so nobody has it.

This operation has three costs:

- **A new kind of attempt.** One attempt sends many host calls. The driver's rule so far is one request for one attempt (`packages/git/src/host.ts:9-11`). A row's handled mark makes a repeat safe.
- **A fixed budget.** An operation of a held kind draws on a holder's count, and a delivery has no `adds` (`packages/derive/src/draws.ts:14-17`, `:41-46`). So the branch needs a fixed count. I propose `"revoke-reads": 16` in `branch.holds.operations` (`destination.ts:198`). The rule opens nothing at 0, and the notice still lands. A room past 16 such notices has only the time bound. Each held operation also reserves room in the scope (`packages/derive/src/held.ts`). I did not compute that total against the validator's limit.
- **One host's behaviour.** The operation gives more on Artifacts than on GitHub. Mara reads `cannot` to know the difference.

I recommend this operation after the lifetime change. An hour still matters on Artifacts, because a team that has lost a key can publish a fix in that hour. The planner decides whether `revoke-reads` follows the lifetime change, and the two can land apart.

## One hour is the right longest lifetime on both hosts

This section weighs a shorter limit with renewal against the work that needs a token to last.

### Neither host says what a request in flight meets at expiry

Git sends the token as a header on each HTTP request of one process. Git's page says of `http.extraHeader`: "Pass an additional HTTP header when communicating with a server." (<https://git-scm.com/docs/git-config>) The protocol is "stateless from the perspective of the HTTP server side". A client first runs ref discovery and then a `POST` (<https://git-scm.com/docs/gitprotocol-http>). A new clone has no commits to offer, so the reply to its last `POST` carries the pack. So a slow download is one long reply to one authenticated request. I read that from the protocol page and did not trace a run.

A clone longer than the token therefore depends on the host, and neither host documents the case:

- **GitHub.** "Using an expired token produces a status code of 401 - Unauthorized" (<https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app>). Also, "When a token has expired or has been revoked, it can no longer be used to authenticate Git and API requests." (<https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation>) Neither sentence speaks of a reply in flight.
- **Artifacts.** The Git protocol page states the token's format, `art_v1_<40 hex>?expires=<unix_seconds>`, and it says nothing about a reply in flight (<https://developers.cloudflare.com/artifacts/api/git-protocol/>).

So the answer is unknown. Real calls 2 and 3 settle it. A token that expires between two requests of one clone fails at the next request. I expect that gap to last seconds on a new clone, and nobody measured it. If a clone fails, `dap clone` prints `git clone exited with <code>; the token was read and is not kept.` (`commands.ts:1139`), and a new `dap clone` starts over.

### Renewal goes through membership, so a revoked key gets nothing

A new token needs an accepted `read-token` act and a session of the key that signed it. Those two steps give the shorter lifetime its value:

- After a notice, the destination refuses the act, under request `9beb1933`.
- Before a notice, the act gets `unauthorized` once the scope's observation of the key is 300 seconds old (`packages/derive/src/grant.ts:33`).
- Membership issues no session to a revoked key. A session already issued lasts at most 600 seconds (`packages/scope/src/sessions.ts:93`).

So each new token needs a key that membership still accepts. One hour makes that check happen at least once an hour.

### The slowest link that one hour serves is about 2.2 Mbit/s

This table shows what each limit asks of a clone of the largest new repository. That size is "1 GB for repos created on or after 2026-09-29" (<https://developers.cloudflare.com/artifacts/platform/limits/>). The numbers are arithmetic and no one measured them. They assume a pack about the size of the stored repository, and they matter only if a host cuts a reply at expiry. An older repository can reach 10 GB, so it needs ten times the speed.

| Longest lifetime | Slowest link for 1 GB | Longest time a token outlasts its key's revocation | Notes |
|---|---|---|---|
| 900 seconds | 8.9 Mbit/s | 900 s + 600 s | GitHub cannot match it. |
| 1 hour | 2.2 Mbit/s | 3600 s + 600 s | GitHub's own lifetime. |
| 4 hours | 0.56 Mbit/s | 14400 s + 600 s | No doc or report here asks for it. |
| 24 hours | 0.093 Mbit/s | 86400 s + 600 s | Today's limit on Artifacts. |

I recommend one hour, for three reasons:

- **One sentence for both hosts.** GitHub says: "The installation access token will expire after 1 hour." (<https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation>), and the client accepts up to 65 minutes (`github.ts:146`). With one hour on Artifacts, Mara needs no table of hosts for the time bound.
- **Nothing here needs more.** `dap clone` and View diff already default to one hour. A local agent can renew.
- **It removes 23 hours from the worst case.** A token from before the revocation expires within the hour on both hosts. That stays true where `revoke-reads` fails.

One hour has these costs:

- **A very slow clone can fail on Artifacts.** Suppose that real call 2 shows that Artifacts cuts a reply at expiry. Then a 1 GB clone below 2.2 Mbit/s fails every time. `dap clone` has no shallow form (`commands.ts:1056`). GitHub has that limit today.
- **An agent renews.** A local agent that fetches across hours needs one act and three reads for each token (`docs/mcp.md:2218`, `:2233`). The destination's journal gains two entries for each token.
- **A new pin.** The next section gives that change. Older rooms gain nothing from it.

### The change takes a new Destination pin and leaves `READ_TOKEN_HOURS` alone

`READ_TOKEN_HOURS` is `{ min: 1, max: 24 }` (`destination.ts:83`). It feeds the field `hours` of `destination2` (`destination.ts:529`), and later versions spread those acts (`destination.ts:550`, `:2798`, `:3038`). `packages/platform/src/native-declarations.generated.ts` has 8 declarations with that maximum. So an edit of the constant alters the bytes of pinned definitions. The host's `#hours` and the CLI read the same constant (`destination-host.ts:485`, `commands.ts:1052`). With a lower constant, an older pin's act with `hours: 24` gets no token.

The new pin declares a `read-token` with no `hours` field, and its host path asks for 3600 seconds. The new `dap clone` drops `--hours` for that pin. The constant stays for older pins. No backward compatibility is needed, so new rooms take the new pin and older rooms stay as they are.

## A workspace token reads and writes one fork for about 15 minutes

This section traces the second credential that the same route gives out. Practice comes first. A hold gives one member a private fork for one piece of work on Artifacts. The holder pushes there, and then asks the room to stage a named commit.

- **Route.** `DestinationHost` and `WorkspaceHost` share one object method. `credential` passes to the outside port for a destination, or for a lane whose definition lists `hold@2` (`object.ts:1027-1028`, `packages/scope/src/worker.ts:626`). `WorkspaceHost.credential` gives the plaintext once, to the key that prepared the step, while the hold and the instance stay current (`packages/scope/src/workspace-host.ts:155-171`).
- **Lifetime.** At most 900 seconds, and less if the hold has less time left (`workspace-host.ts:115`, `artifacts-host.ts:123`). The other purposes, `fork-read` and `staging`, ask for at most 120 seconds, and `credential` refuses them (`workspace-host.ts:159`).
- **What it reads.** A `write` scope on the hold's fork (`workspace-host.ts:113`). Cloudflare's table gives `write` the commands `git clone`, `git fetch`, `git pull` and `git push` (<https://developers.cloudflare.com/artifacts/api/git-protocol/>). The fork starts with the room's default branch and the seed commit (`artifacts-host.ts:148`, `:160-172`). "A fork creates a new repo that starts from an existing repo's history, then diverges independently with its own tokens" (<https://developers.cloudflare.com/artifacts/concepts/how-artifacts-works/>). The token does not open the room's repository, and later room commits do not reach the fork through this path.
- **A revoked key keeps it.** The token lasts to its expiry. No notice reaches a lane, because membership tells the directory and the directory tells the destination (`directory.ts:359-371`). Request `9beb1933` works from that notice, so the lane's credential route stays open to the named key while its session lasts.
- **A new one stops early.** The step `token` needs an observation of the key at most 10 seconds old. It spends that observation (`hold.ts:570`, `grant.ts:33`). So a revoked key mints no new workspace token after about 10 seconds. Its last token expires about 910 seconds after the revocation, plus the delay before the host mints it and the clock difference.
- **Revocation exists.** A hold's release, its expiry and a new holder each move a live token to `revoking`. The host then revokes the token by ID (`hold.ts:538-540`, `workspace-host.ts:150`). In `issue-j4`, only the holder can sign `release-hold`, so Teo can do it from another key. An admin has no such act in that definition. The timed rule `hold-end` has the same effect at the hold's deadline.

So a thief can read one fork and push to it for about 15 minutes. `stage` takes only the commit that a signed step names (`workspace-host.ts:230`, `:243`), so a push alone reaches nothing in the room. I recommend no change to the definition, because 15 minutes do not justify a notice to every lane. Mara can ask Teo to release the hold from another key, and the team then treats the fork's later commits as untrusted. The planner decides whether a lane learns of a notice.

One smaller fact belongs here. `private_workspace_token` is outside the expiry queue, so an unread plaintext stays until a read or a confirmed revocation clears it (`workspace-host.ts:18-22`, `:151`, `:168`). That row can outlast its token, and the plaintext opens nothing after the expiry.

## What Mara can say depends on the pin and the host

This section gives the true sentence for each case, with the time bound counted from the key's revocation. Each bound adds the clock difference. A late notice is the reason for the 600 seconds, because a session can take a token until the notice lands. A new `SESSION_SECRET` ends those sessions sooner for every member, and it revokes no token.

| Case | Longest time that a read token still works | What Mara can say |
|---|---|---|
| Older pin, Artifacts | 24 hours + 600 s | "Read the token's expiry in `dap show`. Commits published before that time are exposed." |
| Older pin, GitHub | about 1 hour + 600 s | The same sentence, with a shorter time. |
| New pin, GitHub | about 1 hour + 600 s | "The log says how many tokens we cannot revoke, and each expires within the hour." |
| New pin, Artifacts, `revoke-reads` confirmed with `left` 0 | Until the host applies the revocation, and no page gives that delay | "The host confirmed each revocation. Commits after that time are safe from these tokens." |
| New pin, Artifacts, `left` above 0 or all attempts unknown | 1 hour + 600 s | "Some tokens are not revoked. The rest expire within the hour." |
| A key revoked as `retired`, or a removed member | The token's expiry | No notice goes out, so nothing is revoked (`membership.ts:501`, `:521`). |

Rita has one more tool on Artifacts for older pins. `GET /artifacts/namespaces/:namespace/repos/:name/tokens` lists each token's `id`, `scope` and `state`, and `DELETE .../tokens/:id` revokes one (<https://developers.cloudflare.com/artifacts/api/rest-api/>). The list names no key, so Rita revokes every active `read` token of the repository. Every member then runs `dap clone` again, and one of the service's own 120-second reads can fail with an unknown outcome. `wrangler artifacts` lists `issue-token` and no revocation (<https://developers.cloudflare.com/artifacts/api/wrangler/>). The docs need a step for this in [Respond to a stolen key](../docs/security/trust-boundaries.md#respond-to-a-stolen-key). I recommend that step whatever the planner decides about the design, because it needs no code. Nobody here has run it.

These things stay open under every answer:

- **What the thief already has.** A key can mint a token and run a clone at any moment between the theft and the revocation. A revocation recalls no copy. Every commit published before the revocation counts as read.
- **Rooms on older pins.** They keep 24 hours and no `revoke-reads`, because a pin is fixed at genesis.
- **Other reads by the key.** Signed reads of a scope last up to 1200 seconds after the revocation ([that section](../docs/security/trust-boundaries.md#a-git-read-token-outlasts-the-bound)).
- **Other rooms.** Each room that enrolled the key needs its own revocation.
- **Who read what.** The journal has no record of a clone. Artifacts offers `pull` metrics by repository, and its `cloned` and `fetched` events have an empty `payload` (<https://developers.cloudflare.com/artifacts/observability/metrics/>, <https://developers.cloudflare.com/artifacts/guides/event-subscriptions/>). No `dap` code reads them. So Rita can see that some clone happened after 09:41, and nobody can tie a clone to a token.
- **The fork.** It keeps its copy after the hold's release, because automatic fork deletion is not built (`docs/hosts.md:185`).
