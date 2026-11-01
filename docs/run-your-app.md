# Run your app

In [Build a counter](build-a-counter.md) your app ran in memory, with
test keys, and everyone was allowed to do everything. This page runs the
same definition as a real app: on a service you deploy, in a room that
says who is allowed to do what, with people who sign from their own
devices and agents that take part through tools.

A definition on its own, like the tutorial's, runs in a room of the
`application` cohort. You activate the definition in the room's rules and
ask the room's directory to create the scope. A package, which bundles
several definitions with their views, is built with `dap new`, `dap check`
and `dap pack` and installs into a room with `dap install`.
[The dap command](cli.md) says which room cohorts accept a package
today. This page takes the first path.

Step 2 of this page ran on 15 October 2026. Steps 3 to 8 have not been
run end to end for this page. The lending library's first definition went
through the same path on a deployed service on 14 October 2026, as its
[runbook](../examples/lending/runbook.md#the-rehearsal-run-14-october-2026)
records.

## What you need

You need the `my-counter` directory from the tutorial, a Cloudflare
account that can deploy Workers, and a checkout of the dap repository.
[Run your own service](self-host.md) lists the details. On this page,
`dap` means `node packages/cli/bin/dap.js`, run from the root of the
checkout. The command is not published to a registry yet.

## Step 1: Deploy the service

Follow [Run your own service](self-host.md) through the deployment of the
Worker. Stop before you create a room. You now have a service at
`https://<name>.<subdomain>.workers.dev`.

## Step 2: Pin the definition

The service needs your definition as exact bytes, and the digest that
names them. A scope keeps that digest for life.

In `my-counter`, install the bytes package and create `pin.ts`:

```sh
npm install --save-exact @generalbusiness/dap-bytes@0.1.0-dev.2
```

```ts
import { writeFileSync } from "node:fs";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { counter } from "./definition.ts";

const checked = validateDefinition(counter, PROPOSED_BOUNDS, RULE_PROFILES);
if (!checked.ok) {
	console.log(JSON.stringify(checked.problems, null, 2));
	process.exit(1);
}

// The canonical bytes, with no newline at the end: the digest covers exactly these.
const bytes = canonicalize(counter);
writeFileSync("counter.json", bytes);
console.log(`counter.json: ${Buffer.byteLength(bytes)} bytes`);
console.log(`digest: ${checked.definition.digest}`);
```

Run `node pin.ts`. If your definition matches the tutorial's, you see:

```
counter.json: 2135 bytes
digest: sha256:33b7f840f37aad8f023813eb639ebf42b720f0dc635bfe17b4322522d1f7f942
```

Keep `counter.json` exactly as written. Do not open it in an editor that
adds a newline at the end. One extra byte gives a different digest, and
the service refuses the file. The commands below use this digest. Use
your own if you changed the definition.

## Step 3: Create a room for apps

A room holds the members, their roles and the rules. An app needs a room
of the `application` cohort. By default a deployed Worker refuses that
cohort's versions with `unsupported-definition`. To allow them, add this
line to `vars` in `apps/room/wrangler.jsonc` and deploy the Worker again:

```jsonc
"PLATFORM_CREATION_PINS": "[\"platform:register@5\",\"platform:directory@5\",\"platform:membership@4\",\"platform:rules@3\",\"platform:destination@2\",\"platform:inbox@1\"]",
```

Then plan the install from the checkout:

```sh
export DAP_HOME="$(mktemp -d)"
dap install --plan https://<name>.<subdomain>.workers.dev --cohort application --host artifacts --namespace dap-my-room
```

The plan lasts 14 minutes. Finish this step within that time. Set the
Worker's `REGISTER_SCOPE` setting to the planned register ID the command
prints, as [Run your own service](self-host.md) describes, then install
the plan and create the room:

```sh
dap install --planned --cohort application
dap create my-room --handle @rita
```

You are `@rita`, the room's first admin. Keep `DAP_HOME`. It holds your
signing key.

## Step 4: Turn the definition on

The room's rules list the definitions it allows. As an admin, add yours.
Change `~/my-counter` to wherever your directory is:

```sh
dap act activate --on rules --set digest=sha256:33b7f840f37aad8f023813eb639ebf42b720f0dc635bfe17b4322522d1f7f942 --set name=counter --value ~/my-counter/counter.json
```

## Step 5: Start the counter

Ask the room to create the counter from that definition. This signs the
counter's first act, `start`. The room fills in `opener` with you, so
you own the board. You give the target:

```sh
dap act establish-application --on directory --set definition=sha256:33b7f840f37aad8f023813eb639ebf42b720f0dc635bfe17b4322522d1f7f942 --set 'values={"target":3}' --set execution=recorded-do --value ~/my-counter/counter.json
```

`values` must be compact JSON with its keys in order, exactly as shown.
If the answer is lost, do not run the command again. A second run would
create a second counter. Read the directory's journal first, with
`dap log directory`.

The counter is a new scope with its own ID, `sc_...`. List the created
applications in the selected room:

```sh
dap apps
```

Each row shows the name, definition digest and full scope reference.
Copy the counter's `scope` ID for the commands below, where `$COUNTER`
stands for that ID. The command reads at most 25 rows per page and says
whether the page is complete. For another page, run the printed
`dap apps --cursor ...` command. A cursor is bound to the directory head
it was issued at. If it is stale, run `dap apps` again. Only scopes whose
creation is recorded are listed. An unfinished creation still appears in
`dap log directory`, and an absent row is no reason to create again.

## Step 6: Say who may do what

`join` and `say` both need the action `counter.play`. Being a member of
the room does not give it. Give it to each role that should play.

`set-actions` replaces a role's whole list, so start from the current
list and add to it. In a new room, the lists are in membership's first
entry: `dap show membership:0`. Then, for example:

```sh
dap act set-actions --on membership --target 0 --set role=member --set 'actions=[...the member list..., "counter.play"]'
dap act set-actions --on membership --target 0 --set role=admin --set 'actions=[...the admin list..., "counter.play"]'
```

A change of actions may not take effect at once. Scopes reuse what
membership told them for a short time.

## Step 7: Invite people

`dap invite` prints a link that holds a secret. Send it to `@una` only.
`@una` runs `dap join` on their own computer, from a checkout, with a
new empty `DAP_HOME`:

```sh
dap invite @una --role member --keep    # you
dap join artroom-invite:...             # @una
```

## Step 8: Use it

Each person signs with their own key. From the command line:

```sh
dap act join --on $COUNTER
dap act say --on $COUNTER --target 0 --set n=1
```

`--target 0` names the board, item 0. Each command prints `Took effect:`
with the entry it wrote, or `Refused:` with the reason. If `@una` says a
second number in a row, the answer names the guard you wrote:
`not-your-turn`. To read the history and check it:

```sh
dap log $COUNTER
dap verify $COUNTER
```

For an agent, run `dap mcp` with the agent's own `DAP_HOME`. Give the
agent a seat the same way, with an invitation and `dap join`.
[Agents through MCP](mcp.md#connect-an-agent-host) describes the
connection and a seat that records who controls the agent. The server
reads the room and makes one tool for each act your definition declares:
`counter.join` and `counter.say`. A call to `counter.say` looks like
this:

```json
{ "target": "<the counter's sc_ ID>", "on": 0, "fields": { "n": 2 }, "idempotencyKey": "say-2" }
```

The answer is `accepted` or `refused`, with the same reasons. If the
answer is lost, make the same call again, with the same
`idempotencyKey`. The scope does not count it twice.

## The lending library

The same steps run the library you wrote in
[Build a lending library](build-a-lending-library.md). In `pin.ts`,
import `lending` in place of `counter` and write `lending.json`. The
digest is
`sha256:439cd20ea9e0b72294d091d3bdcfe13de8c1f31d5685c40bc7bd2754860784ff`.
Its only first-act field is `opener`, so `values` is `{}`. Give
`lending.member` to the member and admin roles, and `lending.staff` to
admin only.

## Where to go next

- [Write an application](write-an-application.md): the steps of writing a
  definition, where each kind of rule belongs, pins and packages.
- [The dap command](cli.md), [Agents through MCP](mcp.md) and
  [the ten terms](manual/ten-terms.md): every command, tool and word.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources:
[the install cohorts](../packages/cli/src/commands.ts),
[the application list](../packages/cli/src/application-list.ts),
[the directory's establish act](../packages/platform/src/directory.ts), and
[the lending runbook](../examples/lending/runbook.md). Step 2 ran on
15 October 2026 with the published packages at `0.1.0-dev.2`. The other
steps were not run for this revision.
