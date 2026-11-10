# Documentation

Choose what you want to do. Each list starts with the page to read first,
then gives the pages to read next, in order.

## What dap is

dap is a framework for structured workrooms for people and agents. You
write an application as a set of definitions: the items a room holds, the
acts its members can sign, and the rules each act must meet. dap keeps a
signed record of every act that takes effect, judges each request against
the definitions, and lets anyone with the record check it again.
[What is dap?](what-is-dap.md) explains the framework and the applications
built on it. [Use cases](use-cases.md) lists what people build with dap,
and [the roadmap](roadmap.md) says what runs today and what is not built
yet.

## Take part in a room

1. [Join a room and publish one text change](../apps/room/docs/first-change.md):
   join, file an issue and propose a change, in the browser or with the
   command.
2. [Take part from the browser](../apps/room/docs/page.md): start a room,
   join one and find your work on the room page.
3. [Get the dap command](get-dap.md): clone the repository and run the
   command.
4. [The room's terms](../apps/room/docs/room-terms.md): room, member,
   lane, issue, change, review, check and land.
5. [Choose a role and manage membership](../apps/room/docs/roles-and-membership.md):
   roles, invitations and what each role can do.
6. [Review an exact change version](../apps/room/docs/reviewing.md):
   record a verdict on the exact content you read.
7. [Follow a change through publication](../apps/room/docs/landing.md):
   merge a change and confirm its published outcome.
8. [Pages](pages.md): read a room's published repository as a site.
9. [The dap command](cli.md): every command and flag.

## Connect an AI app

1. [Connect an AI app to a room](connect-an-ai-app.md): which apps work
   today, and how to connect Claude Desktop.
2. [The MCP service](mcp.md): the server, its options, every tool and the
   hosted endpoint.
3. [Read a room with the local adapter](../apps/views/README.md): five
   reads and the compact cards, from an enrolled `DAP_HOME`.

## Build an application

1. [Build a counter](build-a-counter.md): a 15-minute tutorial. People
   join and take turns to count.
2. [Build a lending library](build-a-lending-library.md): a 15-minute
   tutorial. Members donate, borrow and return things.
3. [Run your app](run-your-app.md): run a tutorial's definition in a room
   on your own service.
4. [Write an application](write-an-application.md): declare, validate and
   pin a definition, and create scopes under it.
5. [Check and preview a package](check-and-preview-a-package.md): make a
   starter, check it, read a refusal and preview it on your computer.
6. [Package reference](package-reference.md): package composition, its
   checks and device commands.
7. [Declared application views](application-views.md): the cards,
   carousels, records and logs that a package declares for an AI app.
8. [Definition-author security reference](security/definition-authors.md):
   the validator's refusals and the forms that allow more than they seem
   to.
9. [The ten terms](manual/ten-terms.md): the word list that every other
   page uses.
10. [The life of an act](manual/life-of-an-act.md): a request, from the
    definition to the receipt.
11. [The record](manual/record.md): what a receipt proves and what a
    consistency report leaves open.
12. [The architecture of a dap application](architecture.md): scopes,
    acts, entries, delivery, authority and where the record is kept.
13. [Scopes](scopes.md): the runtime reference.
14. [Lanes](../apps/room/docs/lanes.md) and the generated
    [lane reference](lanes-reference.md): the room's issue and change
    definitions.

The applications built on dap are examples to read:

- [The Counter](../apps/counter/README.md), with its
  [deployed stage and device setup](../apps/counter/browser/startup.md).
- [The lending library](../examples/lending/README.md), its
  [operator runbook](../examples/lending/runbook.md) and its
  [demo script](../examples/lending/demo-script.md).
- [The grow runbook](../examples/grow/runbook.md) and the
  [grow design](../notes/2026-10-17-grow-operation-application-design.md).
- [The Jam page](../apps/jam/README.md), a procedural band in the browser.
- [The room application's source](../apps/room/README.md).

## Run a service

1. [Run your own service](self-host.md): choose a Cloudflare account or
   one Mac.
2. [Run your own service on Cloudflare](self-host-cloudflare.md): deploy
   the Worker on your own Cloudflare account, create a room, and invite
   another device.
3. [Run your own service on a Mac](self-host-mac.md): run the service
   with HTTPS on one Mac.
4. [Deploy the scope Worker](deploy.md): the order of steps, the creation
   credential, and what is never written down.
5. [Configure a Git host](hosts.md): no host, Cloudflare Artifacts or
   GitHub.
6. [Operate a service](operate-a-service.md): health and logs, new
   source, rollback, copies of the record, secret rotation, a change of
   register and retirement.
7. [Observe a deployment](operations.md): the health route, `dap status`,
   the metric slots and the deploy check.
8. [Report observed use](usage-report.md): a 30-day report of a Worker's
   use before you retire it.
9. [Run the local Worker](celld.md): the production Worker on celld,
   behind a proxy.
10. [The hosted endpoint](mcp.md#the-hosted-endpoint): turn on `/mcp` and
    OAuth for AI apps.
11. [Run the hosted connector test](o4-connect.md): a test window for
    Claude and ChatGPT on a separate Worker.
12. [Rehearse the demo](demo.md): run and record the repository story
    against a deployment.

## Check the security

To report a vulnerability, follow [the security policy](../SECURITY.md).

1. [Threat model](security/threat-model.md): what dap protects, what an
   attacker can do, the invariants and the tests that check them.
2. [Deployment trust boundaries](security/trust-boundaries.md): resource
   authority and sharing across deployment configurations.
3. [Definition-author security reference](security/definition-authors.md):
   validation refusals and permissive policy forms.
4. [Worker entry points and gates](security/entry-points.md): public
   routes, the checks each one passes, and their limits.
5. [Worker settings and bindings](security/settings.md): setting readers,
   parsers, failure behavior and health meanings.
6. The normative contracts:
   [the scope and replay contract](../notes/2026-10-04-scope-and-replay-contract.md)
   and [authority, effects and publication](../notes/2026-10-04-authority-effects-and-publication.md).
   [Scopes](scopes.md) is the reader's guide to both.

## Contribute

1. [Contribute to dap](contribute.md): set up a checkout, run a test, run
   the gate, and send a pull request.
2. [Test dap](testing.md): where a test goes, focused tests while you
   work, and the gate before review.
3. [File test evidence](evidence-filing.md): the follow-up rule after a
   gate, the evidence directory and manifest, and review.
4. [Testing reference](testing-reference.md): the stand-ins, what the
   gate runs, and the test inventories.
5. [Kernel boundary](kernel.md): which parts are kernel, and the rule for
   adding to the kernel.
6. [Produce the public SDK](public-sdk-release.md): build and check the
   published packages.
7. [Agent instructions](../AGENTS.md): the rules for agents that work in
   this repository.

## Design history

[The notes](../notes/README.md) record how the design got here: dated
design notes, plans, delivery records and reviews. This directory
describes only the current system.

## Source

Checked against main `ca6afe2b` on 10 November 2026. Sources: the pages
this index links.
