# Run the O4 hosted connector witness

Use the dedicated `dap-connect` Worker for Claude web, then ChatGPT in
developer mode. The planner deploys and names the live window. The builder
operates the host UIs inside that window. Keep dynamic registration unset.
This procedure changes no register, namespace or binding on `dap-grow`,
`dap-lending` or `dap-demo`.

The [configuration](../apps/room/wrangler.connect.jsonc) deploys closed at
`https://dap-connect.inguz.workers.dev`. Its only placeholder is
`PLANNED_O4_REGISTER_SCOPE`. Its own-agent pins are Register 27,
Directory 26, Membership 13, Rules 10, Destination 20 and Inbox 1.
Its four Durable Object bindings create namespaces for this Worker;
none names another Worker's script. Its private content bucket is
`dap-connect-application-content`. Keep public bucket access off.

## Prepare the closed Worker

1. Record the reviewed source commit, clean tree, exact pinned Wrangler
   tool and the planner's deployment window. Run the CLI from that source
   with locked dependencies from the repository root. Create a new private
   `DAP_HOME` on this laptop for O4's register and founder. Keep it separate
   from every existing room's home. Use a fresh browser identity for the
   ordinary member at the O4 origin.
2. Provision the private content bucket. Set a fresh `SESSION_SECRET` of
   at least 32 cryptographically random bytes through standard input or a
   private file, as [Run your own service](self-host.md) describes. Never
   put the secret in an argument, source file or public evidence.
3. Plan the register from the new founder home:

   ```sh
   DAP_HOME="$O4_FOUNDER_HOME" node packages/cli/bin/dap.js install --plan https://dap-connect.inguz.workers.dev --cohort own-agent --host none
   ```

   The plan creates no room or register. Record its public register ID and
   expiry; retain its exact original privately. Replace the configuration's
   sole placeholder with that ID in the planner's deployment copy. Keep
   `MCP_ENABLED` equal to the string `"false"`. Keep
   `OAUTH_DYNAMIC_REGISTRATION`, `OAUTH_CLIENT_METADATA_ORIGINS` and
   `OAUTH_REDIRECT_URIS` absent: the defaults disable registration and trust
   only the named Claude and ChatGPT metadata origins and callbacks.
4. Deploy that configuration with the pinned Wrangler tool. Use
   `--keep-vars --config apps/room/wrangler.connect.jsonc`. Record the
   returned version and the deployed namespace and bucket identities.
   Confirm that no binding points to another Worker's namespace or bucket.
   Before install, a health register probe can be unavailable because the
   planned register does not yet exist. That is no reason to change its ID.
5. Install the retained plan from the same founder home before it expires:

   ```sh
   DAP_HOME="$O4_FOUNDER_HOME" node packages/cli/bin/dap.js install --planned --cohort own-agent
   ```

   Record the accepted full register reference, including incarnation.
   Check the deployed version and health after install. Confirm that both
   connector URLs and the OAuth routes answer `404` while MCP is closed.
6. Create the witness room from that same home within 900 seconds of the
   install, while the founder can read this keys-policy register:

   ```sh
   DAP_HOME="$O4_FOUNDER_HOME" node packages/cli/bin/dap.js create o4-connect-witness --handle @o4-owner
   ```

   Confirm its actual Directory, Membership, Rules and Destination pins.
   Keep the first room's claim with that home. One planned client home
   creates one room; another room needs a new plan and home.

If an install or creation answer is unknown, retain the original operation
and settle it through its existing continuation. Do not replan an attempted
install, use `--again`, mint another identity or substitute another register
to work around an uncertain answer. See [the install order](deploy.md#the-order).

## Prepare the member and application

Planner ruling `780fcb95` selects Counter, whose source configuration is
`apps/counter/dap.application.json`. Before opening MCP, resolve decision
`735f2a64`: obtain its reviewed immutable signed packet, exact release and
publisher, and a supported ordinary-agent card action. The current live
trust row is Grow's release, not Counter's. Counter's only declared card
acts, Start and Pause, need `counting.control` and the controller's native
signature; an ordinary member's agent lacks both. The other three views
declare no acts. Keep this setup step pending until the reviewed package
or explicit witness ruling supplies those prerequisites.

1. Invite an ordinary person with role `member` from the founder home:

   ```sh
   DAP_HOME="$O4_FOUNDER_HOME" node packages/cli/bin/dap.js invite @o4-member --role member
   ```

   Keep the invitation private. Join it in `/page/` at the O4 origin with
   a fresh browser identity. Select the witness room there. Confirm that
   this key belongs to `@o4-member`, has role `member`, and holds
   `membership.own-agent` without admin authority. Consent uses that
   origin's existing nonextractable browser key; no key export is needed.
2. Record the approved application's immutable URI, release, publisher,
   selected roles and genesis values. Set exactly that `APPLICATION_TRUST`
   row in the planner's deployment copy and the installing CLI environment.
   The checked-in `[]` trusts no package. Keep `MCP_ENABLED` false during
   this setup deployment. Use [trusted application installation](deploy.md#trusted-application-screens)
   and the chosen application's reviewed install procedure.
3. Confirm exactly one active declared installation with its full scope,
   install item, release, semantic and presentation IDs. Hosted composition
   selects that sole installation. A pending, missing or ambiguous install
   supplies no cards. Record the application's intended bounded card press
   and Native act before the live window.

## Connect the two hosts in the live window

1. The planner records the exact version and window, sets `MCP_ENABLED` to
   the string `"true"`, and deploys. Preserve the register, namespaces,
   bucket, application trust and both resource identities.
2. Confirm issuer discovery omits `registration_endpoint`. Confirm
   `POST /oauth/register` returns `400` and `invalid_client_metadata`.
   Record public resource metadata for each connector, preserving its query.
   No OAuth setting or registration fallback changes during the scene.
3. In Claude web, add the custom connector
   `https://dap-connect.inguz.workers.dev/mcp`. Complete its actual OAuth
   flow. On consent, verify the client ID's `claude.ai` origin, the callback,
   selected room, ordinary member controller, agent handle and expiry.
   Press **Allow** with the member's browser key. Retain any unknown
   operation and continue its original request; do not replace the agent.
4. Record MCP initialize, tools and card rendering. Perform the selected
   card press and one intended Native act. Read the journal to confirm
   the exact accepted fact and agent signer, controlled by `@o4-member`.
   A rendered card, a text claim or a tool's accepted request alone proves
   no completed Native outcome.
5. Leave Claude connected. In ChatGPT developer mode, connect
   `https://dap-connect.inguz.workers.dev/mcp?host=chatgpt` and complete
   consent as the same ordinary member. Verify the metadata client's
   `chatgpt.com` origin and configured callback. Record its distinct agent
   and resource audience, card press and intended Native act.
6. With both hosts connected at once, prove each can still read its own
   card. Record the exact connector URLs and distinct presentation domains.
   Confirm that the member controls both agents. Neither client gets the
   other resource's token or private credentials in public evidence.
7. Revoke the Claude grant from the consent page. Confirm Claude's next
   authenticated call fails with `401`, while ChatGPT still reads. Then
   revoke ChatGPT and confirm its next call fails with `401`. If a host
   hides the HTTP status, retain its UI result and a private bounded trace;
   qualify any status that cannot be observed.
8. The planner sets `MCP_ENABLED` back to `"false"` and deploys before the
   window closes. Confirm `/mcp`, its ChatGPT query and OAuth routes answer
   `404`. Record the closing version. The source configuration remains closed.

A client without an allowlisted metadata document cannot connect with
registration disabled. Record that refusal and stop that host's scene;
do not enable dynamic registration. The planner requires a reviewed
per-address rate limit before any hosted Worker enables it.

## Keep the evidence

Retain each original privately and publish only a sanitized, sealed record:

- Reviewed source and tree; tool version; plan and install receipts;
  deployed versions; full public scope references; isolated binding and
  bucket identities; closed, open and closed-again route results.
- Exact Claude web build and ChatGPT build or available build identifier,
  account mode and browser version. Say when a host exposes no build ID.
- Both complete connector URLs; issuer and protected-resource discovery;
  client ID metadata origin and callback; any actual `Origin` header,
  or an explicit statement that the trace observed none.
- Actual MCP `initialize` protocol and capabilities and negotiated
  `ui/initialize` protocol and capabilities for each host. Preserve an
  absent or unsupported handshake as observed; do not infer a version
  from source, host branding or another run.
- Screenshots of each host's consent and card, both hosts connected at
  once, both Native outcomes, each revocation and final endpoint closure.
  Mask credentials, authorization codes, invitation links and private UI.
- Native accepted facts and outcomes bound to their exact agent signers
  and ordinary controller; each grant's revocation result; any missing,
  refused, unknown or incomplete obligation.
- Actual command exit files, source-before and source-after checks, raw
  output hashes, public file sizes and SHA-256 digests, private indexes
  and a read-only manifest. Preserve failed attempts and their limits.

This configuration and runbook establish no deployed service or host
acceptance. A later record head must bind the real runs to their source,
deployment receipts and sealed evidence after the planner closes MCP.
