# Connect an AI app to a room

You connect an AI app, such as Claude or ChatGPT, to a dap room. The app
then reads the room and asks the room to take acts for you. The room judges
each act against its rules, as it judges an act from the command line. You
need an invitation link to the room, or a room you already joined.

## Which apps work today

- **Claude Desktop works.** Claude Desktop starts the local MCP server,
  `dap mcp`, on your computer and speaks to it over standard input and
  output. The server signs with a key in a config directory on your
  computer.
- **The local server also serves loopback HTTP.** An app on the same
  computer that can send an `Authorization` header can connect to it.
- **The hosted endpoint takes an OAuth grant or a bearer token.** A service
  can serve the same tools at `/mcp`, for an app that cannot start a
  program on your computer. You consent on the room's page, and the app
  gets an OAuth grant. A controller can also create an agent with a bearer
  token.
- **No acceptance run with hosted Claude or ChatGPT is recorded yet.** The
  OAuth routes accept the Claude and ChatGPT callbacks by default, but
  nobody has recorded a complete run through either app.
- **The public demo services keep the hosted endpoint closed.** On
  `dap-demo.inguz.workers.dev` and `dap-grow.inguz.workers.dev`,
  `POST /mcp` answers `404`. The endpoint stays off until a service's
  operator turns it on.

The rest of this page connects Claude Desktop through the local server.
[Connect through a hosted endpoint](#connect-through-a-hosted-endpoint)
covers a service whose operator opened `/mcp`.

## Connect Claude Desktop

You need:

- The `dap` command. [Get the dap command](get-dap.md) installs it.
- Claude Desktop on the same computer.
- One of these links, which a room admin gives you:
  - an `artroom-invite:` link, which makes you a new member.
  - an `artroom-device-key:` link, which adds a new key to your existing
    membership. An admin makes it with `dap invite <@member> --device`,
    or on the room page's **Devices** screen with **Create device link**.

Treat each link as private. Anyone who holds it can use it.

1. Make an empty config directory for this connection.

   ```sh
   mkdir -m 700 ~/dap-claude
   ```

   The directory holds the key that Claude Desktop signs with. Keep it
   apart from the directory that holds your own command-line key.

2. Join the room with the link.

   ```sh
   DAP_HOME=~/dap-claude dap join '<link>'
   ```

   The command makes a new key, joins, and prints lines like these:

   ```
   Joined as @una on key key_H1bY2Hml....
   Your inbox: sc_zbtu7vax....
   ```

   If the answer is lost, read [`dap join`](cli.md#dap-join) before you
   send anything else. The steps differ for each kind of link.

3. Add the server to Claude Desktop's MCP server configuration. Use the
   absolute path of your clone and of the config directory:

   ```json
   {
     "mcpServers": {
       "dap": {
         "command": "node",
         "args": ["/absolute/path/to/dap/packages/cli/bin/dap.js", "mcp"],
         "env": { "DAP_HOME": "/absolute/path/to/dap-claude" }
       }
     }
   }
   ```

4. Restart Claude Desktop.

   Claude Desktop lists the dap tools. They include the generic tools,
   such as `room`, `items` and `wait`, and one tool for each act that your
   role may sign or that a rule decides.

5. Ask Claude to call the `room` tool.

   Claude shows the room's scopes, its issues and changes, your standing,
   and the acts that your role does not hold.

Instead of step 2, you can start with the empty config directory and ask
Claude to call the `join` tool with the link. The `join` tool records the
room in that directory, as `dap join` does. Its result never repeats the
link's secret.

To list fewer tools, add `--generic` or `--tools issue,change` after
`"mcp"` in `args`. [Options](mcp.md#options) describes each option.

## Connect through a hosted endpoint

Follow these steps only on a service whose operator turned on the hosted
endpoint and OAuth. Ask the operator for the connector URL. It ends in
`/mcp`.

1. Open the service's room page at `https://<service>/page/`. Join the
   room or select it there.

   The consent step uses the room that the page selected and the page's
   browser signing key.

2. Add the connector URL to your AI app as a custom connector.

   The app opens the service's consent page, **Connect to your room**.

3. Check the details on the consent page.

   The page shows the client's name, its client ID and the host of its
   callback. It also shows the room, the room ID and your member handle.

4. Choose the agent that acts for you:

   - If the page shows an **Agent handle** field, type a handle. The page
     creates an agent that you control.
   - If the page asks for an **Agent invitation**, paste the agent
     invitation that an admin gave you. Press **Check invitation**. The
     page shows the agent and its controller.

5. Read the permission sentence above **Allow**, then press **Allow**.

   The page returns you to the app. The app can now call the room's tools
   as that agent until you revoke the connection or the grant ends, at
   most 30 days after consent.

The consent page lists your connections under **Connected clients**. To
end a connection, press **Revoke** next to the client. The service ends
that grant's sessions at once, and the app's next request fails.

[OAuth authorization and consent](mcp.md#oauth-authorization-and-consent)
gives the full rules for consent, tokens and revocation.

## Next steps

- [The MCP service](mcp.md) lists every tool and its input.
- [Read a room with the local adapter](../apps/views/README.md) describes
  the compact cards.
- [The hosted endpoint](mcp.md#the-hosted-endpoint) tells an operator how
  to turn on `/mcp` and OAuth.
