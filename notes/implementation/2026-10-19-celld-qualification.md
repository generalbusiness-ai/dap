# celld qualification: the room Worker on a laptop and on one GCP node

19 October 2026. The record behind
[Self-hosting dap on celld](../2026-10-19-self-hosting-on-celld.md).
Two runs of the unchanged room Worker on celld v0.6.2, first with
`celld dev` on the laptop, then on one `e2-small` virtual machine in
`us-east1` with a Google Cloud Storage bucket as the fleet store. Both
passed. The source was main `426504d8`. Nothing in this record is a
customer procedure.

**How every time was taken.** Each step is one command of the `dap`
command line, timed by wall clock on the laptop around the whole
process, Node startup included. Reads and acts both pay it. The node's
own turn time was not measured.

## What ran

The celld project lived in a scratch directory, not in the checkout,
with four files.

`wrangler.json`:

```json
{
  "name": "artroom-scope",
  "main": "qual-worker.ts",
  "compatibility_date": "2026-08-15",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": { "bindings": [
    { "name": "SCOPES", "class_name": "DeployedScope" },
    { "name": "REGISTRIES", "class_name": "McpRegistry" },
    { "name": "AGENTS", "class_name": "McpAgent" } ] },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["DeployedScope"] },
    { "tag": "v2", "new_sqlite_classes": ["McpRegistry", "McpAgent"] } ]
}
```

The GCP copy carried `vars` for `DEPLOYMENT`, `SESSION_SECRET` and
`QUAL_REGISTER_SCOPE`. The laptop copy read them from `.dev.vars`.
celld refused the checkout's `wrangler.jsonc` keys `observability`,
`analytics_engine_datasets`, `version_metadata` and `artifacts`, and
refused a `main` outside its project directory.

`qual-worker.ts` re-exports the checkout's routes and the two MCP object
classes, and replaces the scope class with one whose `wiring` serves the
Artifacts host path through an in-memory stand-in:

```ts
export class DeployedScope<E extends Env = Env> extends ScopeObject<E> {
  protected scopes(): Binding { return this.env.SCOPES; }
  protected override wiring(_name: string | undefined): Wiring {
    const registerScope = (this.env as { QUAL_REGISTER_SCOPE?: string }).QUAL_REGISTER_SCOPE ?? "";
    const bindings = {
      ARTIFACTS_CONFIG: canonicalize({ registerScope, namespace: "qual", host: "service.invalid", maxBytes: 8 * 1024 * 1024, credentialIdentity: "adapter-attempt" }),
      ARTIFACTS_NAMESPACE: "qual",
      ARTIFACTS: stand.ns,
    };
    return {
      ports: namespace(this.scopes()),
      authority: (given) => repositoryAuthority({ ...given, reader: membershipIn(this.scopes()) }),
      outside: (given) => artifactsOutside(given, this.ctx.storage.sql, bindings, stand.fetch, snapshotReaderOf(this.scopes())),
      ...sessionWiring(() => sessionsOf(this.env.SESSION_SECRET, this.env.DEPLOYMENT), this.scopes()),
    };
  }
}
```

`own-git.ts` is `OwnGit`, `OwnedPack` and `receive` from
`packages/scope/test/hosts.ts` with vitest's `expect` replaced by thrown
errors and the scripted clock by `Date.now()`. Its state is one isolate's
memory. A recycled isolate starts empty and adopts the repository name
the caller addresses. The smoke's repository was created and published
within seconds, inside one isolate's life, in both runs.

The smoke, in two phases around the register pin:

```sh
# PHASE=plan
dap install --plan "$BASE" --host artifacts --namespace qual      # prints the register id
# the id goes into QUAL_REGISTER_SCOPE; celld dev restarts, or celld deploy runs again
# PHASE=run
dap install --planned
dap verify register
dap create qual --handle @owner
for i in 1..20: dap act add-member --on membership --set handle=@m$i --set kind=checker
dap acts membership; dap status; dap log destination
dap invite @guest --role member
dap verify --all
```

## Run 1: the laptop

`celld dev . --port 9876 --logs --no-watch` with the checkout's
`node_modules/.bin/esbuild` on `PATH`. Build and serve in about one
second. `/health` answered dap's own JSON with status 503 and
`register: unconfigured`, as it does when `ARTIFACTS_CONFIG` is absent
from the environment, which the qualification wiring bypasses.

| Step | Wall time | Exit |
|---|---|---|
| plan | 541 ms | 0 |
| install --planned | 632 ms | 0 |
| verify register | 558 ms | 0 |
| create | 2705 ms | 0 |
| act, 20 of them | p50 571 ms, min 559, max 638 | all 0 |
| acts (a read) | 561 ms | 0 |
| status | 644 ms | 0 |
| log destination | 589 ms | 0 |
| invite | 558 ms | 0 |
| verify --all | 2255 ms | 0 |

`create` printed the directory, membership, rules and destination with
"each created and confirmed" and the definitions
`platform:directory@3, platform:membership@2, platform:rules@2,
platform:destination@3`. The destination's log held its genesis, one
confirm delivery from the directory, and six outcome entries from the
stand-in's publication. `verify --all` reported "consistent" for the
register, the directory, membership at entry 45, rules, the destination
at entry 7 with no cleanup owed, and eight inboxes: 13 scopes.

An earlier attempt with host `git.example`, which no wiring serves, gave
up after 120 reads waiting for the directory, as the command line
documents. The register's `found` entry showed 8 effects and 0 sends:
the claim waits for the repository's creation. That is the control for
the stand-in: without a host, no room.

celld's log showed 26 isolate startups during the run and no error. It
never logged an alarm event.

## Run 2: one GCP node

Project `dap-hosting`, zone `us-east1-b`. Made by script in this order:
the bucket `dap-celld-qual-10190827` with uniform access through the
JSON API, object admin on it for the default compute service account,
one `e2-small` Debian 12 instance with the `cloud-platform` scope and a
startup script that installs celld v0.6.2 under `/opt/celld` and runs it
from a systemd unit as

```
celld --bucket gs://dap-celld-qual-10190827 --listen 0.0.0.0:8080 --internal-listen <private ip>:8081 --advertise <private ip>:8081
```

and a firewall rule for port 8080 from the laptop's address only. The
bundle was written to the bucket from the laptop with
`celld deploy <project> --bucket gs://... --json`: "Bundled artroom-scope
(0.04 sec)", "Uploaded artroom-scope (2.08 sec)". The node answered
`/health` 30 seconds after the instance was created. The pinned redeploy
after the plan phase was adopted in place: the run started 60 seconds
after it and found the pin.

Two quirks of the laptop, not of celld: this machine's `gcloud storage`
commands crash on Python 3.14 (`ssl.PROTOCOL_TLSv1` is gone), so the
bucket was made and deleted through the JSON API; and the application
default credential was of type `impersonated_service_account`, which
celld's GCS client rejects, so the `authorized_user` block inside it was
copied to a file for the deploy and deleted after the run.

| Step | Wall time | Exit |
|---|---|---|
| health, five samples | 111, 127, 108, 108, 113 ms | |
| plan | 605 ms | 0 |
| install --planned | 1405 ms | 0 |
| verify register | 694 ms | 0 |
| create | 6100 ms | 0 |
| act, 20 of them | p50 1076 ms, min 1014, max 1314 | all 0 |
| acts (a read) | 898 ms | 0 |
| status | 9558 ms | 0 |
| log destination | 926 ms | 0 |
| invite | 1050 ms | 0 |
| verify --all | 66468 ms | 0 |

Every scope replayed consistent, 13 as before.

**The node's journal**, read over SSH after the run. The node ran alone:
"fleet durability requested and no peer is available; writes wait for
the bucket". Thirty `WARN celld::actor: wake maintenance deferred` lines
for one cell between 12:30:52 and 12:31:14 UTC, each ending
"conditional write gs://.../wake/retired/DeployedScope:82ca….json may
have committed", during the create step. They stopped on their own and
no step failed. Event counts for the whole run: 261 ship-loop ledgers,
80 lease renewals, 26 isolate startups, one `initial_deployment_found`,
one `deployment_generation_adopted`, one `deployment_generation_freed`.
No alarm event.

**Teardown.** The instance, the firewall rule, and the bucket with its
348 objects were deleted after the run. The project remains.

## What the two runs establish, and what they do not

Established on celld, both on the laptop and on GCP: the Worker bundle
with `nodejs_compat` and `AsyncLocalStorage`; the three object classes
with SQLite transactions; RPC between objects by name; the creation
chain from the register through the directory to membership, rules, the
destination and eight inboxes; outside operations with recorded
outcomes, through the stand-in; a delivery to an inbox; replay of every
scope; a redeploy adopted in place.

Not established: alarms firing on schedule, since nothing in the run has
a timed rule; a fleet of two nodes and a takeover; a real git host; TLS;
a celld upgrade; the node's own turn time; the application package
store, since neither run installed a package and every R2 method fails
on a node without a fleet bucket, which `celld dev` is. The timings
isolate nothing: an act on GCP took about 505 ms longer than on the
laptop and about 180 ms longer than a different read command on GCP,
with process startup, the network, the node's work and the bucket proof
all inside those differences. No number here bounds the single-node
commit cost.
