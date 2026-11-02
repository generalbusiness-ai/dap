# OAuth for the hosted MCP endpoint

Part one describes how a person connects Claude or ChatGPT to a dap room
through the hosted endpoint. Part two specifies the routes, records and
checks. Part three names the builder slices and the evidence for each.

## Part one: the connection a person makes

### Scene

Una is a member of a room on `dap-demo`. She opens Claude, adds a custom
connector, and enters `https://dap-demo.inguz.workers.dev/mcp`. Claude
opens a browser page on that Worker. The page shows the client name
"Claude", the room, and the agent that will act for her: `@una-claude`,
controlled by `@una`. She presses **Allow**. Her browser key adds
`@una-claude` as her agent and signs the grant. Claude receives a
token and lists the room's tools and cards. Una asks it to open the
change view. When Claude presses a card, the act enters the journal as
an act of `@una-claude`, controlled by `@una`. Later Una revokes the
connection from the same page, or an admin removes her. Claude's next
call then fails with `401`.

The agent is a member of kind `agent` with Una as its controller, a
form the membership already defines. One new membership step lets Una
add that agent without an admin, and its guard keeps the agent's role
inside Una's own. The token only lets one host reach one hosted agent.

### Terms

- **Hosted agent.** The Durable Object that holds one agent's key,
  sessions and custody, created by the registry of a repository
  (`docs/mcp.md`, The hosted endpoint).
- **Controller.** The active person recorded on an agent member by
  `add-member`. The registry already accepts the controller's signed
  `create` for that agent (`packages/mcp/src/hosted.ts:132-143`).
- **Client.** The host application that asks for a token, such as
  Claude or ChatGPT, identified by a client ID.
- **Grant.** A control request with the new action `grant`, signed by
  the controller's key or an admin's key. It binds one client, one
  redirect URI, one PKCE challenge and one resource to one agent.
- **Authorization code.** A single-use value that the registry issues
  for a grant and the client exchanges at the token endpoint.
- **Access token.** An opaque value that authenticates calls to `/mcp`
  for one agent and one client, for one hour.
- **Refresh token.** An opaque value that the client exchanges for a
  new access token, for at most 30 days.
- **Static bearer.** Today's `Bearer <agent>.<secret>`, issued by
  `create` and `bearer`. It stays for Goose, scripts and the CLI.

### Who can act

The token stands for one hosted agent. The agent's own key signs every
act, and the native scope judges each act by the agent's membership
and role, as it does today. The access token adds no authority. It
replaces the static bearer only as proof that this caller can reach
this agent.

A grant carries the same signer rule as `create`: an active key of an
active member who holds `membership.manage` or is the agent's recorded
controller (`docs/mcp.md`, Creating an agent). Consent therefore equals
today's controller or admin check.

### How the agent comes to exist

On every membership version so far, `add-member` with `kind: agent`
needs `membership.manage`, and `invite-key` needs `membership.invite`
(`packages/platform/src/membership.ts:371-372`, `:426-427`). The default
role table gives both only to `admin` (`:110`). An ordinary member
therefore cannot add an agent today.

A new membership version, `platform:membership@11`, lets an active
person add an agent that they control. It adds two steps under one new
action, `membership.own-agent`. The default table gives that action to
`admin`, `maintainer` and `member`. The two steps are:

- `add-own-agent` adds a member of kind `agent` whose controller is the
  signer's own member. Its guards: the signer is an active person; the
  new member's role is `agent`; every action of the `agent` role is
  also an action of the signer's role, read from the role table in
  force; and the signer controls fewer than 8 active agents.
- `invite-own-agent-key` invites a key for an agent member whose
  recorded controller is the signer's member. Its guards: the agent is
  active, and the signer is its controller.

The subset guard matters because roles change. With the default table,
the 18 actions of `agent` are all held by `member`, `maintainer` and
`admin`, so each of them passes. A `checker` holds 2 actions, so a
checker cannot add an agent. If an admin later widens the `agent` role
with `set-actions`, that is an admin's decision, as it is today.

The consent page then follows one path for every person. The browser
key signs `add-own-agent`, then `invite-own-agent-key` through the
existing issuer (`issueInvitation` with `kind: "agent-key"`, as the room
page already does in `apps/room/page/src/main.ts:773`), then the grant.
An admin can use `add-member` and `invite-key` instead, with the same
result.

A room whose membership pin predates @11 keeps its rules. There, an
admin adds the agent with controller `@una` and makes its invitation,
and Una opens the link on the consent page. Her key signs the grant as
controller. The registry accepts that signer today.

New rooms take @11 through a creation cohort, so the cohort that pins
it must exist before the live runs.

The page reuses an existing agent when the same controller connects the
same client to the same repository again. It renews by a fresh grant.

### What the person sees

The consent page shows the client name and its redirect host, the
repository and room, the agent handle and its controller, and the
words "This lets <client> act as <agent> in this room until you revoke
it or <date>." It also lists the person's connected clients for that
repository, each with **Revoke**.

The page refuses, with a named reason and no grant, when the browser
holds no key of an active member, when the signer is neither an admin
nor the controller, or when the client or redirect URI fails the checks
in part two.

## Part two: routes, records and checks

All routes live on the scope Worker beside `/mcp`. They exist only
while the hosted endpoint is open (`MCP_ENABLED` is `"true"`). A closed
endpoint answers `404` on each of them, as it does on `/mcp` today.

### Resource server

| Route | Answer |
|---|---|
| `GET /.well-known/oauth-protected-resource/mcp` | RFC 9728 metadata: `resource` is the exact `https://<service>/mcp`, `authorization_servers` is `["https://<service>"]`, `scopes_supported` is `["mcp"]`, `bearer_methods_supported` is `["header"]` |
| `POST`, `GET`, `DELETE /mcp` with no `Authorization` | `401` with `WWW-Authenticate: Bearer resource_metadata="https://<service>/.well-known/oauth-protected-resource/mcp", scope="mcp"` |
| `/mcp` with a bad, expired or revoked access token | `401` with the same header and `error="invalid_token"` |

The hosted agent accepts either a static bearer or an access token. It
checks an access token as it checks a bearer today: the digest in
constant time, the expiry, and the failure window per address. It also
checks that the token's audience equals the configured resource URL and
that its grant is live. A token for another service or resource answers
`401`.

### Authorization server

| Route | What it does |
|---|---|
| `GET /.well-known/oauth-authorization-server` | RFC 8414 metadata. `issuer` is `https://<service>`. `code_challenge_methods_supported` is `["S256"]`. `token_endpoint_auth_methods_supported` is `["none"]`. `client_id_metadata_document_supported` is `true`. `authorization_response_iss_parameter_supported` is `true`. It names the four routes below |
| `GET /oauth/authorize` | The consent page, served on the Worker origin, so it reads the same browser key store as `/page/` (`apps/room/page/src/browser-key-store.ts`) |
| `POST /oauth/register` | RFC 7591 dynamic client registration, for a client that has no client ID metadata document |
| `POST /oauth/token` | Code exchange with PKCE, and refresh |
| `POST /oauth/revoke` | RFC 7009 revocation of an access or refresh token |

### Client identification

A client ID is either an HTTPS URL of a client ID metadata document or
an ID from `POST /oauth/register`. The Worker fetches a metadata
document with the existing bounded fetch, at most 5 KiB, and caches it
for at most one hour.

Redirect URIs must match one entry of a configured list exactly. The
list starts with:

- `https://claude.ai/api/mcp/auth_callback`
- `https://chatgpt.com/connector_platform_oauth_redirect`
- `http://localhost` and `http://127.0.0.1` on any port, for Claude
  Code, with the path that the client registered

No wildcard host is accepted. A registered client can name only URIs
from the list. A deployment setting, `OAUTH_REDIRECT_URIS`, can replace
the list, with the same exact-match rule.

### Grant

A grant is a control request, `artroom-mcp-control-1`, with action
`grant` (`docs/mcp.md`, the control request). Its body digest covers:

```json
{
  "client_id": "https://chatgpt.com/oauth/client.json",
  "redirect_uri": "https://chatgpt.com/connector_platform_oauth_redirect",
  "code_challenge": "<base64url SHA-256 of the verifier>",
  "resource": "https://dap-demo.inguz.workers.dev/mcp",
  "scope": "mcp",
  "state_digest": "<SHA-256 of the client's state>",
  "link": "<agent-key invitation, on a first connection only>"
}
```

The consent page builds the request and signs it with the browser
signer: `sign(taggedBytes(CONTROL_DOMAIN, canonicalBytes(request)))`.
Today only `signControl` exists, and it needs a raw seed
(`packages/bytes/src/session.ts:67-69`). Slice O3 adds a signer-based
variant in `packages/bytes` that both the page and the tests use.

The page posts the grant to `POST /mcp/agents/<agent>/grant`. The
registry checks it with the existing control rules: signature, service,
membership and incarnation, body digest, deadline, and the signer's
current authority. It then asks the agent's object to record an
authorization code. The code is single use, lives 60 seconds, and binds
the client, redirect URI, challenge, resource and agent. The page then
redirects to `redirect_uri` with `code`, `state` and `iss`.

On a first connection the hosted agent does not exist yet. The page
then posts the grant to `POST /mcp/agents/grant` with the agent-key
invitation as `link`, as `create` takes it today. The registry creates
and enrols the agent as `create` does, but mints no static bearer, and
records the code as above.

The control route keeps its replay and `op` rules. A grant never
returns a token to the browser.

### Tokens

`POST /oauth/token` with `grant_type=authorization_code` checks the
code, the client ID, the redirect URI, and the verifier against the
challenge. It answers within the client's limit, 10 seconds for Claude.
It returns:

- an access token `<agent>.<grant>.<secret>`, one hour, audience the
  resource URL;
- a refresh token, at most 30 days from the grant, never later than a
  retire or a revocation.

The agent's object stores only digests. A refresh rotates the refresh
token for a public client. A reused old refresh token revokes the whole
grant and answers `invalid_grant`. Before each refresh, the object reads
the membership now and refuses when the agent or its controller is no
longer an active member, or the agent's key is revoked.

`retire`, `key.revoke` of the agent key, `member.remove` of the agent
or its controller, and `POST /oauth/revoke` end the grant. The next
call answers `401`. Native refusal of the agent's acts still follows
the membership at once, as today.

### Origin

`/mcp` refuses every `Origin` header with `403` today
(`packages/mcp/src/hosted.ts:656`, `packages/mcp/src/http.ts:216`). Host
backends do not run in a browser, and no source says whether they send
`Origin`. Slice O4 records what Claude and ChatGPT send. If either sends
one, a deployment setting `MCP_ALLOWED_ORIGINS` names it exactly, as
plan 031 allows (`notes/plans/031-2026-10-12-generic-mcp-service.md:604`).
The OAuth routes are separate. The consent page posts to its own origin,
and the token endpoint takes the client's server-to-server call.

### Budgets

Each grant, code and token row counts against the agent's existing
16 MiB control budget (`packages/mcp/src/hosted.ts:43`). An agent holds
at most 8 live grants. A ninth grant ends the oldest one. The
registration route holds at most 1,000 registered clients per Worker
and answers `507` when full.

## Part three: slices and evidence

Each slice is one reviewed head with a frozen gate. None of them opens
hosted MCP on a deployed Worker. The planner opens it on `dap-demo` for
slice O4 only.

| Slice | Builds | Evidence |
|---|---|---|
| O1 | Resource server: the protected-resource route, the `401` challenge, access-token checks beside the static bearer, audience binding | A scripted client gets `401` with the header, reads the metadata, and calls `/mcp` with a test-issued token. Controls: wrong audience, expired token, retired agent |
| O2 | `platform:membership@11` with `add-own-agent` and `invite-own-agent-key`, and a creation cohort that pins it | Native tests: a member adds and invites an agent they control. Controls: a checker signer, a ninth agent, a controller who is not the signer, an `agent` role wider than the signer's role. Every earlier pin and declaration text stays unchanged |
| O3 | Authorization server: metadata, client ID documents and registration, the redirect list, the consent page, the `grant` control action, codes, the token and revoke routes, refresh rotation | A browser test on a local Worker runs the full code flow with PKCE for an ordinary member on @11 and for an invited controller on an older pin. Controls: wrong verifier, reused code, unlisted redirect, a signer who is neither admin nor controller, reused refresh token |
| O4 | Live runs, after O1 to O3 and hosted cards `288d5988` land | The builder adds dap as a custom connector in Claude web, then ChatGPT developer mode, controls each UI, consents as an ordinary member, makes one card press and one act, and revokes. Record host builds, the `initialize` and `ui/initialize` versions, any `Origin` sent, and screenshots |

O1 and O2 do not depend on each other. O3 needs both.

Goose and Gemini follow O4. Gemini adds the verification file, the
fixed-list profile and JSON in text (matrix tasks 7 to 9).
