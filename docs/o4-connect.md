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
2. Provision the private content bucket. Set a fresh `SESSION_SECRET` of at
   least 32 cryptographically random bytes through standard input or a private
   file, as [Run your own service on Cloudflare](self-host-cloudflare.md)
   describes. Never put the secret in an argument, source file or public
   evidence.
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

Planner ruling `aa2284b3`, ratified by `e506a7d6`, selects the signed
Grow demo release. It withdraws the earlier Counter choice.
The immutable packet URI is:

```text
git+https://github.com/generalbusiness-ai/dap.git/@74e3251288b9ff3bfecbb0abfb73ec9b76e4d017/examples/grow/demo/application.dap.json
```

The release is
`sha256:71e10ca9499e926a4de1d8294ed83a772051dff677d8b1687bbd8e28e61802fa`.
Its publisher is `key_gg4rXwy4v-kVqveN37_W_FW_-Wvsn3fgsal5z6gxfS0`.
The configuration trusts exactly that release, publisher, and `github.com`.
The ordinary strict package reader rejects this historical package shape.
The production published-package reader explicitly verifies this exact
reviewed release and its signature. Use that installation boundary.

O4 uses the ruling's fallback for both hosts: a read-only Grow card press,
then a separate Native `issue.open` through the same host agent's model tool.
The released member defaults contain `grow.tend`; agent defaults contain
`grow.climate` and `grow.sense`. Installing both defaults would make the
agent role wider than the ordinary member role, so the existing own-agent
guard would refuse enrollment. `take-task` also needs `grow.tend`, and the
vent acts require a fixed demo climate or operator signer.

Install only the released **admin** and **member** defaults. Omit the
**agent** defaults. This keeps the existing agent core actions and the
ordinary member's own-agent guard. No role or guard widens to produce a
card act. The read-only card press and separate Native act remain distinct.

1. Invite `@o4-member` with role `member` from the founder home:

   ```sh
   DAP_HOME="$O4_FOUNDER_HOME" node packages/cli/bin/dap.js invite @o4-member --role member
   ```

   Keep the invitation private. Join it in `/page/` at the O4 origin with
   a fresh browser identity. Confirm that this key belongs to `@o4-member`,
   has role `member`, and holds `membership.own-agent` without admin
   authority. Consent uses that origin's existing browser key.
2. Prepare a third active fixture member `@o4-observer` through a separate
   kept invitation and private client home. Retain its exact accepted
   reference. The demo requires three distinct genesis principals.
   Keep this fixture key separate from the ordinary member's browser key.
3. Prepare a private genesis-values JSON file with `label: "O4 Grow"` and
   full, distinct member references: `operator` is the founder,
   `climate` is `@o4-member`, and `sensors` is `@o4-observer`.
   Set `O4_GROW_OWNER` to the founder's full member reference and
   `O4_GROW_VALUES_FILE` to that values file. Copy the configuration's
   exact one-row `APPLICATION_TRUST` string into the installing CLI's
   environment. Keep MCP closed during setup.
4. Install the immutable packet once, retaining the request key:

   ```sh
   DAP_HOME="$O4_FOUNDER_HOME" node packages/cli/bin/dap.js install \
     'git+https://github.com/generalbusiness-ai/dap.git/@74e3251288b9ff3bfecbb0abfb73ec9b76e4d017/examples/grow/demo/application.dap.json' \
     --release sha256:71e10ca9499e926a4de1d8294ed83a772051dff677d8b1687bbd8e28e61802fa \
     --owner "$O4_GROW_OWNER" --role admin --role member \
     --values "$(cat "$O4_GROW_VALUES_FILE")" --request o4-grow-install-1
   ```

   This value contains public references, not keys. The Worker fetches
   and verifies the exact packet and stores its immutable content in its
   own private `APPLICATION_CONTENT` bucket. No direct upload route or
   cross-Worker bucket forms part of this step. Retain an unknown result
   under this exact request and arguments. Inspect it with `dap application`.
5. Confirm exactly one active declared installation with its full scope,
   install item, release, semantic, and presentation IDs. Record its actual
   Grow site scope. With the founder, create the read-only navigation target:

   ```sh
   DAP_HOME="$O4_FOUNDER_HOME" node packages/cli/bin/dap.js act create-room \
     --on "$O4_GROW_SITE" --set 'label=O4 room'
   ```

   Confirm the child room reaches `active`. The card press for each host
   opens **O4 room** from the Grow site card and reads its bench grid.
   It signs no Native act and proves no device execution.
6. Read the actual Membership roster after installation. Require every
   `agentActions` value to occur in `memberActions`. Confirm no Grow
   agent defaults entered the role. Check the ordinary member's role,
   controller identity, and `membership.own-agent` action again.
   A failed subset check stops setup; no role change bypasses it.
7. Prepare the room's reviewed issue profile through the founder's ordinary
   Rules path before the live window. Record its exact definition and
   activation fact. Confirm the existing agent role holds `issue.open`.
   Each host then uses `issue.create` once, with a distinct bounded title:
   **O4 Claude native act** and **O4 ChatGPT native act**. Record the real
   tool schema from that connection. Confirm the Directory's created issue,
   its actual lane genesis and title, and the exact host agent signer.
   A tool's accepted request alone proves no completed Native outcome.

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
4. Record MCP initialize, tools, and the Grow site card. Press its
   **Open O4 room** control, then ask that same agent to create its named
   issue through `issue.create`. Keep these two operations separate.
   Read the journal to confirm
   the exact accepted fact and agent signer, controlled by `@o4-member`.
   A rendered card, a text claim or a tool's accepted request alone proves
   no completed Native outcome.
5. Before ChatGPT consent, record the actual origin of its card frame.
   The configured presentation origin and the top-level ChatGPT page do
   not prove the frame's origin. If the frame uses
   `https://dap-connect.inguz.workers.dev`, stop before consent and report
   it to the planner. If the host exposes no frame before consent, record
   that limit and stop for the planner's ruling. Do not infer an origin
   or consent to reveal it.
6. Leave Claude connected. In ChatGPT developer mode, connect
   `https://dap-connect.inguz.workers.dev/mcp?host=chatgpt` and complete
   consent as the same ordinary member. Verify the metadata client's
   `chatgpt.com` origin and configured callback. Record its distinct agent
   and resource audience, card press and intended Native act.
7. With both hosts connected at once, prove each can still read its own
   card. Record the exact connector URLs and distinct presentation domains.
   Confirm that the member controls both agents. Neither client gets the
   other resource's token or private credentials in public evidence.
8. Revoke the Claude grant from the consent page. Confirm Claude's next
   authenticated call fails with `401`, while ChatGPT still reads. Then
   revoke ChatGPT and confirm its next call fails with `401`. If a host
   hides the HTTP status, retain its UI result and a private bounded trace;
   qualify any status that cannot be observed.
9. The planner sets `MCP_ENABLED` back to `"false"` and deploys before the
   window closes. Confirm `/mcp`, its ChatGPT query and OAuth routes answer
   `404`. Record the closing version. The source configuration remains closed.

A client without an allowlisted metadata document cannot connect with
registration disabled. Record that refusal and stop that host's scene;
do not enable dynamic registration. The planner requires a reviewed
per-address rate limit before any hosted Worker enables it.

## Optional deployed-browser observation

Planner ruling `b608aa47` assigns one optional bounded probe to this window.
With a fresh fixture opening, record the Native stream count, observe one
browser abort or active page close, and record the count afterward. Capture
whether the deployed runtime reports `request.signal`. The configuration
enables the same reviewed request-signal flag as the maintained Workers.
Keep a missing signal or unreleased opening as a failed observation.
This probe must not delay Claude or ChatGPT. If the deployed runtime also
reports no disconnect, the planner owns a later explicit-close design request.

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
- The optional deployed-browser signal and Native count observation, if the
  window permits it, with any failure or omitted probe stated explicitly.
- Actual command exit files, source-before and source-after checks, raw
  output hashes, public file sizes and SHA-256 digests, private indexes
  and a read-only manifest. Preserve failed attempts and their limits.

This configuration and runbook establish no deployed service or host
acceptance. A later record head must bind the real runs to their source,
deployment receipts and sealed evidence after the planner closes MCP.
