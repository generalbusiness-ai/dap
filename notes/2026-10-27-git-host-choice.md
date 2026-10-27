# The Git host is the deployer's choice

Status: current. A design note, 27 October 2026, against main
`bb23e50f`. It amends the
[self-hosting note](2026-10-19-self-hosting-on-celld.md) (sections 4.2,
4.7, 9 and 10) and the [hosts page](../docs/hosts.md). Nothing here is
built. Hugh agreed the direction on 27 October for a local deployment
on one machine: celld, one node, a local bucket.

## 1. Scene

A person runs dap on one machine for themselves and a few others. They
want rooms, members, acts, rules, the page and an agent over MCP. They
do not want to run a Git host, hold a GitHub account or an App, or
operate a second service whose only job is to hold a copy of what the
record already holds. Today they cannot have this. A register records a
Git host at install, and the first thing a `found` act does is ask that
host to create a repository. With no host configured, the operation is
recorded and never sent, so no directory is created and `dap create`
waits until it gives up. The CLI even defaults the host to `github.com`.

The self-hosting note answered the missing host by building one: a
bounded Git host of dap's own, slice H2, two to three days of work and a
second thing to run. This note takes the other way first. The Git host
becomes a choice the deployer makes at install, `none`, `artifacts` or
`github.com`, and a room under a host-`none` register is a room without
publication. The record then lives in one place, and the note says so
rather than hiding it. H2 stays available for a deployer who wants a
second holder of the bytes without GitHub.

## 2. Terms

- **Host**: the Git service a register names at install. One of `none`,
  `artifacts` and `github.com`. Recorded on the register and copied to
  the directory and the destination.
- **Publication**: the destination's repository on the host, with the
  branch, its heads, receipts and read tokens.
- **A room without publication**: a room whose register's host is
  `none`. It has a directory, a membership, a rules scope and a
  destination. Its destination has no repository, and its branch is
  `unpublished`.
- **Repository act**: an act or command that reads or writes the
  publication. Section 4 lists them.
- **Second place**: the publication as a holder of the record apart from
  the service, in the sense of the architecture page's durability
  section.

## 3. The choice at install

`dap install` takes `--host none`, `--host artifacts` or
`--host github.com`, and the flag is required: there is no default. The
register's `install` act checks the host against this closed list and
refuses any other text with `host-unknown`. A host-`none` register
records the empty namespace. `artifacts` is accepted only where the
deployment runs on Cloudflare, because the Artifacts binding exists
nowhere else (section 7); on celld the choice is `none` or `github.com`.
A retained plan still has to match the host given, as it does today.

The register's `found` act, on a host-`none` register, does not open
`create-repository`. It sends `create-directory` at once, with no
repository record. Everything downstream reads the absence of the
record as the room's mode. The register's host stays fixed for its
life, as today; section 8 says how a room gains a host later.

## 4. What a room without publication is

The directory creates the membership, the rules scope and the
destination, as it does for every room. The destination is created
without a repository. Its branch starts and stays `unpublished`; it
never declares `first-head`. The destination still exists because it
owns the room's change lanes, reservations and publication state, and
because a room that later gains a host (section 8) must not change
shape to do so. One room shape, two publication states, is the model a
member sees.

The room page shows "No publication" where it shows the repository
name today, and no site links. `dap status` reports the destination as
`unpublished` with no waiting operations, where today a room with a
missing port shows unsent operations in its outbox. `dap create`
finishes when the directory, the membership, the rules scope and the
destination are confirmed; it no longer waits for a first head.

Every repository act is refused with one reason, `no-repository`, and
is never left pending:

| Act or command | Today | Without publication |
|---|---|---|
| `read-token` (`mint-read`), the `credential` route and MCP tool | mints a host token | refused `no-repository` |
| `dap clone`, with or without `--archive` | signs `read-token`, runs `git clone` | refused `no-repository` before signing |
| `dap remote` | prints the repository record | prints `no-repository` and the room's mode |
| `dap edit`, `dap propose` | need a published head | refused `no-repository` |
| `dap merge` of a change lane to the publication | reserve, judge, push, receipt | refused `no-repository` at `reserve` |
| `bind-archive` on the directory | binds the journal archive to a repository on the register's host | refused `no-repository` |
| `certify-rules-tree` on the destination | reads the rules tree from the repository | refused `no-repository` |
| `publish-file` route | writes a file into the repository | refused `no-repository` |
| site route `/site/<directory>/HEAD/<path>` | reads the repository over smart HTTP | 404 with body `no-repository` |

The rules-tree certificate has one consequence for the creation cohort.
The rules scope versions that require the certificate (v11 and v12, on
register@19 and @20) cannot publish rules without a repository. A
host-`none` deployment therefore pins a creation cohort whose rules
scope does not require it (rules@10) until section 9's later slice
gives the certificate a form that reads the rules tree from the scope.
The install screen says which cohorts a host-`none` register admits.

What keeps working, and is witnessed as such (section 10, W1):
`dap create`; members, `dap invite` and `dap join`; every act of every
native and installed definition, and the rules that judge them; the
page; MCP; issues; retained files, which live in the scope or the
bucket and never in the repository; application package install from a
`git+https` release URI, whose fetch uses the application content wiring
and the trust list, not the register's host; `dap verify` and
`dap verify --all`, which replay journals from the service and never
touch a host.

## 5. Durability without a second place

The architecture page names three places the record lives: the scope's
own storage, the publication, and replay as the independent reader.
Without publication the second place is absent. There are no receipts
to keep apart from the service, and no `dap clone --archive`. The note
does not soften this. A host-`none` deployment holds the record in the
service alone, and its operator's backup is the whole of its
durability.

For celld that backup is the stopped-fleet backup the self-hosting note
defines in section 4.7: the bucket and every node's work directory,
taken in celld's order, with the drain checked. The host kit's `backup`
script is therefore not optional for a host-`none` deployment, and the
kit's documentation says so on the first page. The SeaweedFS evaluation
running on the Mac mini decides what the local bucket is; its note
feeds section 4.7 and this section with the measured copy time of a
stopped fleet. Replay stays the independent check: `dap verify --all`
on a restored fleet proves the restored record's chain, hashes and
signatures, which is the same guarantee it gives today.

A deployer who wants the second place chooses `github.com`, or the own
host H2 when it is built. The choice is per register, so one deployment
can hold both kinds of room.

## 6. Where H2 goes

H2, dap's own bounded Git host, is kept as a later option and ordered
after the host kit. The self-hosting note's decision 3 changes: the
default host for a self-hosted deployment is the deployer's choice, and
the first local deployment uses `none`. H2 is the answer for a deployer
who wants a second holder without GitHub and is willing to run it.
Nothing in H2's design changes; only its place in the order. H1 (the
celld project in the repository, request `99918e60`) keeps its scope,
with one change: the kit's example install uses `--host none`.

## 7. Artifacts outside Cloudflare

A repository on Artifacts is readable from outside Cloudflare over smart
HTTP with a read token, which is how `dap clone` works today. Creating a
repository and minting its tokens go through the Workers binding, which
has no public interface. So a celld deployment cannot have `artifacts`
as a register's host, and the install act refuses it there with
`host-unavailable`. This is recorded, not worked around.

## 8. Gaining a host later

The register's host stays fixed. A room without publication gains a
host through the destination, not the register: a later slice makes the
destination's repository a binding, in the form of the archive binding,
made by an admin act `bind-repository` that names a host the deployment
serves and a namespace the port's authority admits. The port checks the
binding as it checks a register today. Until that slice lands, a room
without publication stays without publication, and a person who wants
to publish creates a room under a register with a host and moves the
content by proposal. The note states the rule now so that the
destination of section 4 is already the right shape: one destination,
whose repository may be absent, present from creation, or bound later.

## 9. Statements that change

| Where | Today | After |
|---|---|---|
| `packages/platform/src/register.ts`, `install` | copies `host` as text | checks `host` against `none`, `artifacts`, `github.com`; refuses `host-unknown` |
| The same, `found` | opens `create-repository` first | on host `none`, sends `create-directory` at once with no repository record |
| `packages/platform/src/directory.ts`, `establish` | requires the repository record | accepts its absence and passes it on |
| `packages/platform/src/destination.ts`, `establish` | stores the repository; branch `empty`, then `first-head` | without a repository, branch `unpublished`; repository acts refuse `no-repository` |
| `packages/cli/src/commands.ts`, install | `--host` defaults to `github.com` | `--host` required; `none` accepted |
| `dap remote`, `dap clone`, `dap edit`, `dap propose`, `dap merge` | assume a repository | refuse `no-repository` before signing or waiting |
| `packages/cli/src/claim.ts` | waits for the destination's first head | waits for the four confirmed scopes only |
| Room page and `dap status` | show the repository name | show "No publication" and `unpublished` |
| Site route | 503 `host-not-configured` when there is no reader | 404 `no-repository` for a room without publication |
| [hosts page](../docs/hosts.md) | two hosts | three choices, the required flag, the room without publication |
| [architecture page](../docs/architecture.md), durability | three places | the second place is absent under host `none`; the operator's backup covers the record |
| [self-hosting note](2026-10-19-self-hosting-on-celld.md), 4.2 and decision 3 | own host is the default | deployer's choice; `none` first; H2 later |
| [kernel page](../docs/kernel.md), K1 | 73 pinned versions | 76: one new register, directory and destination version each |
| Creation cohorts | pin register@17 and later | a host-`none` deployment pins a cohort without the rules certificate |

## 10. Slices

Each slice is a request to the builder, in this order. None is filed by
this note.

- **G1. Host `none`.** The register, directory and destination versions
  of section 9; the CLI flag, the refusals and the shortened wait; the
  page and `dap status` wording; the site route. Witnesses: W1, a room
  created under a host-`none` register on the test Worker, with every
  act in section 4's "keeps working" list taken and every repository
  act refused `no-repository`, none pending; W2, `dap install --host
  other` refused `host-unknown` and `--host artifacts` refused
  `host-unavailable` where the binding is absent; W3, `dap verify
  --all` consistent on that room. One gate and exact-head review.
- **G2. Documents.** The hosts, architecture, cli and self-host pages
  and the self-hosting note's sections 4.2, 4.7, 9 and 10, in one
  documents-only head after G1.
- **G3. `bind-repository`.** The destination's repository as a binding
  (section 8), with the port's authority check and a witness that a
  room without publication gains a host and publishes its first head.
- **G4. A certificate without a repository.** `certify-rules-tree` reads
  the rules tree from the scope, so the certified-rules cohorts work
  under host `none`.

G1 goes before H1. G2 follows G1. G3 and G4 come after the first local
deployment runs.

## 11. Use cases and directions served

- The file-first matter room direction: a room is the same thing
  whoever starts it and wherever it runs; a private room on one machine
  is the smallest case of it.
- The self-hosting note's section 1: the code does not need Cloudflare.
  With host `none` it also does not need a Git host, which removes the
  largest of the three couplings for the local case.
- Catalogue group 3, private matters: a family or a small practice that
  keeps its record on its own machine and publishes nothing.
- The dap-spike's direction note, section 3: one substrate carries the
  unstructured and the structured relationship. A room without
  publication is that substrate with nothing else attached.
- The OS-lens kernel boundary: the publication was never part of the
  kernel; this note makes that explicit by letting a room exist without
  it.

## Source

Written from `packages/platform/src/register.ts`, `directory.ts` and
`destination.ts`, `packages/scope/src/worker.ts`, `register-host.ts`,
`destination-host.ts` and `site/route.ts`, `packages/cli/src/commands.ts`
and `claim.ts`, `docs/hosts.md`, `docs/architecture.md` and
`docs/kernel.md` at main `bb23e50f`, and the self-hosting note at
`6eaae3f7`. The map of repository-dependent paths was read at that main
on 27 October. Nothing was run for this note.
