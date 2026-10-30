# Documentation

dap is a framework for structured workrooms for people and agents. You
write an application as a set of definitions: the items a room holds, the
acts its members can sign, and the rules each act must meet. dap keeps a
signed record of every act that takes effect, judges each request against
the definitions, and lets anyone with the record check it again.

The room, a shared coding workflow for a repository, is the largest
application built on dap. The counter, the lending library and the grow
operation are three others. These pages begin with what dap is and what
people build with it. Two 15-minute tutorials then build an application
of your own. After those come the pages that explain the framework, the
room's own pages, and the guides for running a service.

## Start here

| Page | What it gives you |
|---|---|
| [What is dap?](what-is-dap.md) | The framework, its actor model and the applications built on it. |
| [Use cases](use-cases.md) | What people build with dap: 51 situations, those you can build today first. |
| [Roadmap](roadmap.md) | What runs today, what is not yet built, and the order of the missing parts. |

## Build an application

Each tutorial takes about 15 minutes. It runs in memory on your own
computer and needs only Node.js and npm. Then run what you built as a
real application.

| Page | What it gives you |
|---|---|
| [Build a counter](build-a-counter.md) | People join and take turns to count. You write the rules, see requests refused with a reason, and read the history. |
| [Build a lending library](build-a-lending-library.md) | Members donate, borrow and return things, and only staff can remove one. |
| [Run your app](run-your-app.md) | Run a tutorial's definition in a room on your own service, for people and agents. |
| [Write an application](write-an-application.md) | Declare, validate and pin a definition, create scopes under it, and package several definitions. |
| [Definition-author security reference](security/definition-authors.md) | The validator's refusals, the forms that allow more than they seem to, and the authority checks. |
| [Declared application views](application-views.md) | The views a package declares for an AI app: cards, carousels, records and logs. |
| [Agents through MCP](mcp.md) | Connect an agent host to a room, the tools it gets, and the hosted endpoint. |

## Understand the framework

| Page | What it gives you |
|---|---|
| [The ten terms](manual/ten-terms.md) | The word list that every other page uses. |
| [The life of an act](manual/life-of-an-act.md) | A request, from the definition to the receipt, and the four answers. |
| [The record](manual/record.md) | What a receipt proves and what a consistency report leaves open. |
| [The architecture of a dap application](architecture.md) | Scopes, acts, entries, delivery, authority and where the record is kept. |
| [Scopes](scopes.md) | The runtime reference: identity, entries, answers, definitions, bounds, reads and replay. |
| [Kernel boundary](kernel.md) | Which parts are kernel, platform service or application, the kernel's promises, and the rule for adding to it. |

## The room application

A room brings a repository's work together: members, rules, issues,
changes, reviews of an exact version, and publication to a Git host. The
[hosted room](https://dap.generalbusiness.ai/room/) is open to try. To
run a room of your own, start with [Run your own service](self-host.md).
The [application source](../apps/room/README.md) groups the room's code
and deployment configuration.

| Page | What it gives you |
|---|---|
| [Join a room and publish one text change](../apps/room/docs/first-change.md) | A first change from the command line. |
| [The room's terms](../apps/room/docs/room-terms.md) | Room, member, lane, issue, change, review, check and land. |
| [Lanes](../apps/room/docs/lanes.md) | The issue and change definitions and their runtime limits. |
| [Choose a role and manage membership](../apps/room/docs/roles-and-membership.md) | Roles, invitations and what each role is allowed to do. |
| [Review an exact change version](../apps/room/docs/reviewing.md) | Record a verdict on the exact content you read. |
| [Follow a change through publication](../apps/room/docs/landing.md) | Read a merge through to its published outcome. |
| [The page](../apps/room/docs/page.md) | Reading and acting through the room's browser page. |
| [Pages](pages.md) | A room's published repository, served as a site. |
| [Lane reference](lanes-reference.md) | Every row of the lane definitions, generated from the data. |
| [Rehearse the demo](demo.md) | Run and record the repository story against a deployment. |
| [Contribute a change to dap](../apps/room/docs/contribute.md) | Work on this repository through its own room. |
| [Manual page ledger](../apps/room/docs/ledger.md) | The review and acceptance history of the room's pages. |

## Other applications

### dap-counter

A shared count that people and agents take turns to speak.

| Page | What it gives you |
|---|---|
| [Build a counter](build-a-counter.md) | A 15-minute tutorial on a smaller version of the Counter. |
| [The Counter](../apps/counter/README.md) | The Counter's items, the acts each participant can attempt, its grants and its files. |
| [Counting commitments: deployed stage and device setup](../apps/counter/browser/startup.md) | Set up the deployed Counter page and its devices. |

### dap-library

A lending library for kitchenware and tools. Members donate, borrow and
return things. Staff remove a thing that is lost or broken. Each act that
changes a thing also publishes the thing's shelf page to the room's
repository.

| Page | What it gives you |
|---|---|
| [Build a lending library](build-a-lending-library.md) | A 15-minute tutorial that writes the library's first definition. |
| [The lending library](../examples/lending/README.md) | Where it runs, its files, its rules and its tests. |
| [Provision and run the lending library](../examples/lending/runbook.md) | The operator's commands, and the record of the runs. |
| [The demo script](../examples/lending/demo-script.md) | The story of Nasruddin and the pot, shot by shot. |
| [Taking part through MCP](mcp.md#taking-part-in-the-lending-library) | An agent's tool calls to donate, borrow and return. |

### dap-grow

A grow operation of several scopes: a site that creates grow rooms, with
operator views, probes from chat, routing, presence and device commands.
A simulator runs the hosted demo room.

| Page | What it gives you |
|---|---|
| [The grow runbook](../examples/grow/runbook.md) | Where it runs, its scopes and the commands that operate it. |
| [The grow design](../notes/2026-10-17-grow-operation-application-design.md) | The design note behind the application. |

### dap-jam

The [Jam page](../apps/jam/README.md) is a procedural band that runs in
the browser without a dap scope, AI model or microphone. Its
[repository](https://github.com/generalbusiness-ai/artroom-jam) holds its
development, and the [jam room note](../notes/2026-10-01-jam-room.md)
describes the design for recording its musical acts in dap scopes, which
is later work.

## Run a service

| Page | What it gives you |
|---|---|
| [Run your own service](self-host.md) | Deploy the Worker on your own Cloudflare account, create a room, and invite another device. Or run it on a Mac. |
| [Deploy the scope Worker](deploy.md) | The order of steps, the creation credential, and what is never written down. |
| [Configure a Git host](hosts.md) | Choose no host, Cloudflare Artifacts or GitHub, and pin the register. |
| [Run the local Worker](celld.md) | The production Worker on celld, behind a proxy. |
| [Observe a deployment](operations.md) | The health route, `dap status`, the metric slots and the deploy check. |
| [Report observed use](usage-report.md) | A 30-day report of a Worker's use before you retire it. |
| [The dap command](cli.md) | Every command and flag. |

## Security references

| Page | What it describes |
|---|---|
| [Worker entry points and gates](security/entry-points.md) | Public routes, the checks each one passes, and their limits. |
| [Worker settings and bindings](security/settings.md) | Source readers, parsers, failure behavior, and health visibility. |
| [Deployment trust boundaries](security/trust-boundaries.md) | Resource authority and sharing across deployment configurations. |

## Contribute to dap

| Page | What it gives you |
|---|---|
| [Test dap](testing.md) | Where a test goes, focused tests while you work, the gate before review, and the evidence rule. |
| [Produce the public SDK](public-sdk-release.md) | Build and check the published packages. |
| [Agent instructions](../AGENTS.md) | The rules for agents working in this repository. |

Three guides of the earlier model (its release guide, its protocol and its
default policy pack) are retired under `notes/retired-guides/`. This
directory describes only the current system.
