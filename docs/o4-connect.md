# Test a hosted connector

Use a separate Worker to connect Claude web and ChatGPT developer mode to
the [hosted endpoint](hosted-mcp.md), and to revoke each
connection. The Worker has its own register, Durable Object namespaces and
private content bucket, so the test changes no other Worker. Keep dynamic
registration unset.

[`apps/room/wrangler.connect.jsonc`](../apps/room/wrangler.connect.jsonc)
is a closed configuration of this kind. It creates its four Durable Object
namespaces for that Worker and names its own private content bucket.

## Prepare the closed Worker

1. Copy the configuration. Give the Worker its own name, `DEPLOYMENT`
   value and private content bucket. Confirm that no binding names another
   Worker's namespace or bucket. Keep public bucket access off.
2. Set `MCP_RESOURCE_URLS` to one connector URL for each host, for example
   `https://<your-worker>/mcp` and `https://<your-worker>/mcp?host=chatgpt`.
   Set `MCP_CARD_ORIGINS` for the same URLs, as
   [Cards from an installed application](hosted-mcp.md#cards-from-an-installed-application)
   describes. Keep `MCP_ENABLED` equal to the string `"false"`.
3. Keep `OAUTH_DYNAMIC_REGISTRATION`, `OAUTH_CLIENT_METADATA_ORIGINS` and
   `OAUTH_REDIRECT_URIS` absent. The defaults disable registration and
   trust only the Claude and ChatGPT metadata origins and callbacks.
4. Provision the private content bucket. Set a fresh `SESSION_SECRET` of
   at least 32 cryptographically random bytes through standard input or a
   private file, as [Run your own service on Cloudflare](self-host-cloudflare.md)
   describes. Never put the secret in an argument, a source file or public
   evidence.
5. Create a new private `DAP_HOME` for the test's register and founder.
   Keep it separate from the home of every other room. Plan the register
   from that home:

   ```sh
   DAP_HOME="$FOUNDER_HOME" node packages/cli/bin/dap.js install --plan https://<your-worker> --cohort own-agent --host none
   ```

   The plan creates no room or register. Set `REGISTER_SCOPE` to the
   planned register ID.
6. Deploy the configuration with the pinned Wrangler tool and
   `--keep-vars --config <your-configuration>`. Before the install, the
   health register probe can report the register as unavailable. Do not
   change the register ID for that reason.
7. Install the retained plan from the same home before it expires:

   ```sh
   DAP_HOME="$FOUNDER_HOME" node packages/cli/bin/dap.js install --planned --cohort own-agent
   ```

   Check the deployed version and health after the install. Confirm that
   both connector URLs and the OAuth routes answer `404` while MCP is
   closed.
8. Create the test room from that same home within 900 seconds of the
   install:

   ```sh
   DAP_HOME="$FOUNDER_HOME" node packages/cli/bin/dap.js create connector-test --handle @owner
   ```

   One planned client home creates one room. Another room needs a new plan
   and a new home.

If an install or creation answer is unknown, keep the original operation
and settle it through its continuation. Do not replan an attempted
install, use `--again` or mint another identity to work around an
uncertain answer. See [the install order](deploy.md#the-order).

## Prepare the member

1. Invite an ordinary member from the founder home:

   ```sh
   DAP_HOME="$FOUNDER_HOME" node packages/cli/bin/dap.js invite @member --role member
   ```

   Keep the invitation private. Join it in `/page/` at the Worker's origin
   with a fresh browser identity. Confirm that the key belongs to
   `@member`, has role `member`, and holds `membership.own-agent` without
   admin authority. Consent uses that origin's browser key.
2. To show a card, install one trusted application, as
   [Trusted application screens](deploy.md#trusted-application-screens)
   describes. Keep MCP closed during setup. After the install, read the
   Membership roster. For a controller who is not an admin, the server
   requires the agent role's actions to stay within the controller's role.
3. Choose one act that the agent role holds, such as opening an issue,
   for each host to sign through its model tool.

## Connect the two hosts

1. Set `MCP_ENABLED` to the string `"true"` and deploy. Keep the register,
   namespaces, bucket, application trust and connector URLs unchanged.
2. Confirm that issuer discovery omits `registration_endpoint`. Confirm
   that `POST /oauth/register` returns `400` and `invalid_client_metadata`.
3. In Claude web, add the custom connector `https://<your-worker>/mcp`.
   Complete its OAuth flow. On the consent page, check the client ID's
   `claude.ai` origin, the callback, the selected room, the controller,
   the agent handle and the expiry. Press **Allow** with the member's
   browser key. If the answer is unknown, continue the original request.
   Do not replace the agent.
4. Read the MCP initialize result, the tool list and the card. Ask the
   agent to sign its chosen act. Read the journal to confirm the fact and
   the agent signer that `@member` controls. A rendered card, a text claim
   or an accepted tool request alone proves no completed act.
5. Before you consent in ChatGPT, record the actual origin of its card
   frame. If the frame uses the Worker's own origin, stop before consent.
6. Leave Claude connected. In ChatGPT developer mode, connect
   `https://<your-worker>/mcp?host=chatgpt` and complete consent as the
   same member. Check the client's `chatgpt.com` origin and callback.
7. With both hosts connected, confirm that each can read its own card and
   that the member controls both agents.
8. Revoke the Claude grant from the consent page. Confirm that Claude's
   next authenticated call fails with `401` while ChatGPT still reads.
   Revoke ChatGPT and confirm that its next call fails with `401`.
9. Set `MCP_ENABLED` back to `"false"` and deploy. Confirm that `/mcp`,
   its ChatGPT query and the OAuth routes answer `404`.

A client without an allowed metadata document cannot connect while
registration is disabled. Record that refusal and stop that host's test.
Do not enable dynamic registration for the test. A hosted Worker needs a
per-address rate limit before it enables registration.

## Keep the evidence

Keep each original privately. Publish only a record with secrets removed:

- The source commit, tool version, plan and install receipts, deployed
  versions, full scope references, and the route results while closed,
  open and closed again.
- Each host's build or available build identifier, account mode and
  browser version.
- Both connector URLs, issuer and protected-resource discovery, and each
  client's metadata origin and callback.
- The MCP `initialize` and `ui/initialize` results that each host sent.
  Keep an absent handshake as observed.
- Screenshots of consent, cards, both hosts connected, each act, each
  revocation and the final closure. Mask credentials, authorization codes,
  invitation links and private UI.
- The accepted facts with their agent signers and controller, and each
  revocation result.
