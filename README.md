# dap

Structured workrooms for people and agents.

* Web site: [https://dap.generalbusiness.ai](https://dap.generalbusiness.ai/)
* Blog post: [Software and the Cauldron](https://generalbusiness.ai/blog/2026-10-14-baby-cauldron/), ([repo copy](notes/2026-10-14-blog-post-baby-cauldron.md)), including three demo videos
* Source code: [https://github.com/generalbusiness-ai/dap](https://github.com/generalbusiness-ai/dap)

Most software development problems are collaboration problems.

> Working together on a project needs some rules and guardrails: how we apply rules to processes
when there are multiple participants involved.  Agents and people.  In software, this looks like
all the things that _surround_ Git: issues, pull requests, changes, hooks, protection, actions,
agent guidance, and even CI.

> Examples of these rules: You can't close an issue if it's already closed.  You can't close
without choosing a reason.  You can't merge into main if the branch is protected. Every 
change needs a performance budget. You can't add this file without linting it.  If you
change the database, Joe and Kate need to approve.  And so on.

**Dap is a way to build these rules around the whole of a git repo, so that they are
an integral part of it**. Every act is signed, and checked against rules that you define.

* [Try the dap room here](https://dap.generalbusiness.ai/room/)

A team of people and agents file issues, propose changes, review the exact version they read, and
land the changes that meet the rules. The room publishes each landed change to a Git repository.

Dap was built with the help of several concurrent coding agents, using
[gitseq](https://github.com/generalbusiness-ai/gitseq), which is a locally-hosted precursor to dap.
Dap runs on Cloudflare Workers, Durable Objects and Artifacts. It can also
be self-hosted on other services using workerd and celld.

## What is dap, technically?

dap is a framework for building collaborative applications for people and
agents. It is based on an [event-sourced](https://martinfowler.com/eaaDev/EventSourcing.html) [actor model](https://en.wikipedia.org/wiki/Actor_model). You write an
application as a set of definitions. dap keeps the record of what each
participant did, judges every request against those definitions, and lets
anyone with the record check it again.

This is more general-purpose than just a software-development coordination system.
My hope is that dap-style applications are useful for a [very broad](docs/use-cases.md) set of things.

[![The dap model. A person or an agent signs an act and sends it over the command line, MCP or HTTP. A scope judges it against its pinned definition, with guards, rule expressions in a restricted JSONata, and the signer's grants. An act that takes effect becomes an entry in the journal, and its declared effects are folded into the scope's items. The journal can be replayed, entries send messages to other scopes, and a destination scope publishes the files it is sent to a Git repository on Cloudflare Artifacts or GitHub, which serves pages. Dashed lines are planned.](docs/assets/dap-architecture.svg)](docs/architecture.md)


## Four applications built on dap

- **dap-room** holds membership, rules, issues and changes for a
  repository, and publishes approved changes to a Git host. Its pages
  are in [apps/room/docs](apps/room/docs). Start with
  [Join a room and publish one text change](apps/room/docs/first-change.md)
  and [Lanes](apps/room/docs/lanes.md).
  Concurrent changes are settled by [reservation and judgment, not by merging](docs/demo.md#what-the-concurrency-shots-show).
  Its definitions are in [packages/platform](packages/platform) and
  [apps/room/lanes](apps/room/lanes).
- **dap-library** is a lending library for kitchenware and tools. Members
  donate things, borrow them and return them, and staff remove a thing
  that is lost or broken. The source is in
  [examples/lending](examples/lending), and the tutorial
  [Build a lending library](docs/build-a-lending-library.md) writes its
  first definition. Each act also publishes the thing's page to the
  room's repository.
- **dap-counter** keeps a shared count. People and agents join, take
  turns, and each device speaks its number aloud. The source is in
  [apps/counter](apps/counter), and the tutorial
  [Build a counter](docs/build-a-counter.md) builds a smaller version of
  its definition.
- **dap-grow** simulates a growing operation; people with different roles
  share a workspace with sensors and agents. You can manage the operation
  within Claude or other tools, using [MCP-Apps](https://modelcontextprotocol.io/extensions/apps/overview) UI.
  [Grow design note](notes/2026-10-17-grow-operation-application-design.md).

You can [try them out](https://dap.generalbusiness.ai/) on the hosted service.

## Where to read next

- [Run dap in 10 minutes](docs/self-host.md) deploys a room on your own
  Cloudflare account and gives you a link for another device.

- [What is dap?](docs/what-is-dap.md) explains the framework, the actor
  model and the applications.
- [The architecture of a dap application](docs/architecture.md) explains
  scopes, acts, entries, delivery and where the record is kept.
- [Write an application](docs/write-an-application.md) shows how to
  declare item types, acts and invariants, then validate and pin them.
- [The roadmap](docs/roadmap.md) says what runs today and what is not
  yet built, and [Use cases](docs/use-cases.md) is the catalogue behind
  it.
- [The documentation index](docs/README.md) lists every page.

dap is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
