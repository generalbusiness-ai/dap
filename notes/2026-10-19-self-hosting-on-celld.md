# Self-hosting dap on celld

19 October 2026, draft 3. Design note for review. Section 12 lists what
changed after each checker review.

Today dap runs only on Cloudflare: Workers, Durable Objects with SQLite,
R2, and Cloudflare Artifacts as the git host. This note says how a
customer runs the same code on their own cloud account, GCP or AWS, with
the fewest parts. It rests on two qualification runs of the unchanged
room Worker on celld, one on a laptop and one on a GCP virtual machine
([the record](implementation/2026-10-19-celld-qualification.md)). It
decides four things:

1. **The self-hosted runtime is celld.** The Worker, its object classes
   and the Workers programming model stay as they are. celld is Deno's
   self-hosted Durable Objects, which Cloudflare is merging into workerd
   as its supported self-hosting path. dap pins one celld version per
   release.
2. **Three couplings get replacements, nothing else changes.** The git
   host gains a bounded host of dap's own, served from the deployment;
   application packages are read through celld's R2 binding over the
   fleet bucket; metrics stay optional and logs go to the journal.
3. **One dap deployment is one celld fleet:** two small virtual machines,
   one object bucket, one TLS proxy, one DNS name. No Kubernetes.
4. **A release ships a host kit:** the prebuilt Worker bundle, the fleet
   configuration, a systemd unit, a Caddy file, and three scripts, `up`,
   `deploy` and `down`, with a GCP version first and an AWS version of
   the same shape.

Not provided: moving live rooms from Cloudflare to a fleet, more than one
region, and an on-premises store without conditional writes. Section 6
lists these with the other constraints.

## 1. Why

A customer who cannot hold a Cloudflare account cannot run dap. The code
does not need Cloudflare: its judges, record, replay, client and command
line are plain JavaScript, and the runtime touches the host through a
few ports. What binds it is three services, and the second qualification
run shows the binding is loose. The room Worker, bundled by the
checkout's own esbuild, created a room and replayed 13 scopes on a
celld node in GCP within an hour of starting, with one change at the
edge for the missing git host. The remaining work is packaging and the
replacements of section 4, not a port.

## 2. What is coupled to Cloudflare today

At main `9554919b`, five source files name a Workers type, out of about
69,000 lines of source. Everything in `contract`, `derive`, `platform`,
`replay`, `bytes`, `git`, `client` and `cli` runs anywhere.

| Coupling | Where | Replacement |
|---|---|---|
| The object class: `ctx.storage.sql.exec`, `transactionSync`, `setAlarm`, `deleteAlarm`, `alarm()`, `ctx.waitUntil`, stubs by `idFromName` with RPC methods | `packages/scope/src/object.ts:169-176`, the MCP objects in `worker.ts:645-702`, `packages/mcp/src/sqlite-custody.ts`. The `Sql` port is two methods (`sqlite.ts:27-30`) | celld implements each of these (section 3). Qualified |
| `WorkerEntrypoint` service binding, `ScopeService` | `worker.ts:522` and the test Worker's `services` | Not documented by celld. `route()` serves the same operations. The page and MCP routes call the namespace directly (H1) |
| Cloudflare Artifacts: the `ARTIFACTS` binding (create, get, delete a repository and mint its tokens) plus smart HTTP | `artifacts-wiring.ts:26-33`, `artifacts-host.ts:32-38`, `packages/git` | dap's own git host (4.2), or the GitHub App adapter that exists (`github-wiring.ts`) |
| R2 bucket for application packages, `get` and `put`, 4 MB a package | `applications/content.ts:17-20`, `applications/bindings.ts` | celld's R2 binding over the fleet bucket (4.3) |
| Analytics Engine `writeDataPoint`, `VERSION_METADATA` | `operational.ts:9`, `metrics.ts:42` | Both are optional today. Nothing to do (4.4) |
| `node:async_hooks` for request correlation | `operational.ts:2` | celld's Node compatibility is partial. It worked in both runs |
| The client address: the `cf-connecting-ip` header, trusted for the join limits and the MCP bearer-failure limit | `worker.ts:320`, `packages/mcp/src/hosted.ts:556` | The proxy sets the header from the connection and the public port is loopback-only (4.6) |
| Static Workers: the homepage, jam | `homepage/wrangler.jsonc`, `apps/jam/wrangler.jsonc` | Static assets of the room Worker, or any static host (decision 2) |
| Wrangler deploy, secrets and migrations | `package.json`, [deploy](../docs/deploy.md) | `celld deploy` (4.5) |
| 79 test files on `cloudflare:test` | `packages/scope/test`, the lane scenarios | Unchanged. workerd is open source and runs the tests anywhere. A celld smoke joins them (H1) |

Not used in production: WebSockets (streams are server-sent events), KV,
D1, Queues, the cache, cron triggers, containers, Workers AI.

## 3. The runtime

celld is a self-hosted, distributed implementation of Workers and
Durable Objects: Rust with V8, one binary per node, Apache-2.0, version
0.6.2 at this writing and labelled beta. On 9 October 2026 Cloudflare
announced that the Deno team is joining it and that celld is being
merged into workerd as the first-class way to self-host. workerd on its
own runs Durable Objects in one process; its cluster attempt over NFS
locks (pull request 6780) was closed in September as too slow. So celld
is the path, and the merged workerd is its successor with the same
application API.

What shapes a deployment:

- **The bucket is the control plane.** The nodes that share one bucket
  are a fleet. The bucket holds the deployments, each cell's replicated
  SQLite log, and the ownership records. Ownership of a cell is one
  conditional write, leases last ten seconds, and fencing epochs stop two
  writers. Amazon S3, Google Cloud Storage, Azure Blob Storage, R2 and
  Tigris qualify. MinIO is not qualified, and Backblaze, Hetzner and
  DigitalOcean Spaces lack the conditional writes.
- **A write is acknowledged only once it survives a failure.** One node
  acknowledges on a bucket proof, so the bucket holds the write before
  the answer. A fleet of two or more acknowledges once every follower
  has fsynced it, and uploads afterwards, so for a while an acknowledged
  write exists only on node disks. Every dap turn is one storage
  transaction and pays this. How much of the GCP run's slower acts is the
  bucket proof is not known (section 7). celld's documents say a
  follower's fsync is much faster than a bucket round trip. That two
  nodes commit faster is the expectation H4 measures, not a result.
- **Each cell has its own SQLite database, with the Workers API.**
  `sql.exec`, `transactionSync` with a 30 second limit, one alarm per
  object confirmed only once its wake record is durable, `idFromName`
  by HMAC over the script name, the class name and the name, RPC stubs
  forwarded to the owner node, `waitUntil`, and migrations with `tag`
  and `new_sqlite_classes` only.
- **No TLS and plaintext peer traffic.** A proxy terminates TLS on the
  public port. The internal port stays on the private network.
- **One fleet runs one application**, and every node loads its latest
  committed deployment. A new deployment is adopted in place: in-flight
  requests finish on the old code, an idle object moves to the new, and
  "two adjacent versions must accept each other's calls".
- **A celld upgrade follows that release's note**, stop-all or rolling.
  Mixed binary versions cannot share a serving fleet.
- **Renaming the Worker script empties every object**, because the
  script name is in the HMAC key of every object id.

## 4. The design

### 4.1 The Worker is unchanged

`apps/room/worker.ts` stays the one entry. The celld project is a second
configuration beside `wrangler.jsonc`: `apps/room/celld/wrangler.json`
with the three object bindings, the two migrations, `nodejs_compat`, the
string vars `DEPLOYMENT` and `SESSION_SECRET`, and the optional package
binding of 4.3. The Cloudflare-only keys stay out of it:
`observability`, `analytics_engine_datasets`, `version_metadata` and
`artifacts`, since celld refuses an unknown key. celld requires the
entry inside its project directory, so the project's `main` is a
two-line file that re-exports the Worker.

The in-process callers of `ScopeService`, the page and the MCP routes,
call `api(env.SCOPES)` directly, as `route()` does. `ScopeService` stays
for Cloudflare service bindings and the tests.

### 4.2 The git host: dap's own, bounded

Outside Cloudflare there is no Artifacts. The GitHub App adapter works
anywhere but needs an App, five settings and a GitHub account. The
simplest deployment has no second service, so dap serves its own
repositories.

One object class, `GitRepository`, one object per repository, holds the
refs and objects of one repository in its SQLite database and serves
smart HTTP under `/git/<namespace>/<name>.git/`: the two
advertisements, `git-upload-pack` as one pack of every reachable object
with no negotiation, and `git-receive-pack` as one compare-and-swap
command per push, decoded by the git package's existing pack codec.
The register creates a repository and mints its tokens through a
namespace port with the shape of the Artifacts binding, `create`, `get`
and `delete`, so `RegisterHost` and `DestinationHost` are reused with a
third wiring, `self-git-wiring.ts`, selected by the recorded host name
`self`. Tokens are minted per repository with a scope and an end, held
only in the repository object and in the gateway's custody as today.

This is the test suite's Artifacts stand-in made durable: `OwnGit` in
`packages/scope/test/hosts.ts` is 66 lines over the pack codec, and the
qualification ran the production wiring over it. The bounds: one push or
read is at most `maxBytes` of objects, a repository is one cell, a clone
reads the whole repository as one pack, and there are no deltas and no
partial fetches. A room's repository is small by construction, and the
archive note's layout is one ref for each scope with segments of entries,
which this host serves.

The trade-off is independence. The archive note says the git host is "a
second holder of the bytes, apart from the service". A repository inside
the fleet is in the same availability domain as dap. A customer who
wants that independence configures GitHub, or binds the archive to an
external host, and the register's host is recorded at install either
way. The own host is the default because it is the one with nothing
else to run.

### 4.3 Application packages

`ApplicationContentStore` takes `Pick<R2Bucket, "get" | "put">`. celld
accepts the `r2_buckets` key and serves such a binding from the fleet
bucket: a key `k` of the binding's `bucket_name` is the object
`r2/<bucket_name>/k` there, on GCS and on S3 alike. The celld project
carries the binding `APPLICATION_CONTENT` with `bucket_name`
`application-content`, and the trust setting `APPLICATION_TRUST`, with
no code change. Both are omitted only when a deployment installs no
packages. Two limits: on a node without a fleet bucket every R2 method
fails, so packages are a fleet feature and `celld dev` does not cover
them; and neither qualification run installed a package. H4 witnesses
the store on a fleet: a `put`, a conditional `put` refused, a `get`, and
the same bytes read back.

### 4.4 Operations

Logs go to the node's journal. `METRICS` is absent, which the code
already allows. `VERSION_METADATA` is absent and the version is a var
written by the release. The health route is the probe for the proxy
and for the `up` script.

### 4.5 Secrets, deployments and upgrades

`celld deploy` writes the bundle and its string vars to the bucket, and
every node adopts it at its next poll. The vars carry `SESSION_SECRET`,
and the git tokens when GitHub is used. That makes bucket access the
administrative boundary, which it is already: the bucket holds every
cell's state. The kit's `deploy` script reads the secrets from the
cloud's secret store or from a file the operator names, and never
writes them into the kit. A dap release is one `deploy`. A celld upgrade
is a stop and start of the two nodes under that release's rule.

The adjacent-version rule binds dap releases: the RPC methods between
objects and the platform requests must accept the previous release's
calls for the length of one deployment overlap. Cloudflare's deploys
already run two versions side by side, so this is not new.

### 4.6 Ingress and the network

Caddy runs on each node with an automatic certificate for the
customer's name, proxying 443 to celld's public port. DNS names both
nodes. celld's internal port listens on the private address and is
reachable only inside the network. Two nodes in one zone are the
default; two zones of one region when the customer asks.

**The proxy owns the client address.** The Worker trusts the
`cf-connecting-ip` header: `worker.ts:320` passes it to the join limits,
and `packages/mcp/src/hosted.ts:556` keys the bearer-failure limit on
it. Cloudflare sets that header from the connection. celld's ingress
copies the request's headers and sets nothing, and a plain Caddy reverse
proxy passes an unknown header through, so a caller could choose its own
address and evade both limits, or send none and share one empty key. So
the kit makes the header the proxy's: Caddy overwrites `CF-Connecting-IP`
with the verified remote address on every request, whatever the client
sent; celld's public listener binds to loopback, so only the proxy on the
same node reaches it; the firewall opens 443 and 80 and nothing else to
the public; and the internal port stays on the private address. The
header then reaches the Worker and the hosted MCP object as it does on
Cloudflare. This changes the serving transport and no judgment. H3's
witnesses: a forged header arrives at the Worker as the connecting
address, a request without the header gets the connecting address, and
two clients at different addresses get separate join windows. `celld dev`
has no proxy, and H1's smoke sends the header itself.

### 4.7 Where the record is, and how it is kept

The record is the bucket plus the nodes' disks. A node's work directory,
`CELLD_WATCH`, holds its SQLite databases and its replication logs, and
in fleet mode an acknowledged write can be on the owner's and one
follower's disk and not yet in the bucket. A new owner recovers that
tail from a surviving follower, and needs at least one current follower
to return its complete range. So a copy of the bucket taken while the
fleet serves is not a backup: it can lack acknowledged writes, or hold
an open recovery record whose tail is on a disk that no longer exists.
The kit treats these as rules:

- **Node disks persist and nodes keep their names.** Each node's work
  directory is on its persistent disk, and each node has a fixed
  `CELLD_NODE` name. A restart is the same node. Nothing wipes a work
  directory while the fleet is live.
- **A node stops only gracefully, and a drain is a checked outcome.** On
  SIGTERM celld answers 503, lets accepted requests finish, proves each
  cell durable, publishes its snapshot, and releases the cell to a peer,
  within `CELLD_SHUTDOWN_TOTAL_MS`, 40 seconds by default. The unit sets
  `TimeoutStopSec` above it. But the process can reach its own deadline,
  stop with exit code 0, and leave an open log record whose acknowledged
  tail is only on that disk, for the next process or a peer to recover.
  So the kit never reads a clean exit as a complete handoff. A drain is
  complete only when both hold: the stopped process's shutdown log has
  the line `node-log close: sealed epoch`, and the node's record in the
  bucket, `nodes/<node>.json`, is `sealed` or absent. An absent record
  proves the session never acknowledged past the bucket, and a sealed
  one proves recovery completed. Any other end, `open` or `recovering`,
  a missing line, a deadline cut, a bucket that was slow or unreachable
  at the stop, is an unknown drain: the kit keeps the VM, its work
  directory and its name, refuses to replace or delete it, and the same
  node restarts to recover by celld's normal path.
- **A node is replaced only after a complete drain.** Stop it, check the
  drain, then remove the VM, then start the replacement with the same
  name, and never two at once.
- **The supervisor restarts without limit and waits a lease lifetime.**
  A fenced node exits with code 3 and only a restart returns it. The
  unit sets `Restart=always`, no start limit, and `RestartSec` above
  `CELLD_TTL_MS`, 10 seconds by default.
- **A backup is the stopped-fleet backup celld defines**: the bucket and
  every node's work directory, with the node names, peer addresses and
  directories preserved. The kit takes it in celld's order: stop
  application traffic at the proxies and stop any deployment writer;
  stop every node and its supervisor, so nothing restarts during the
  copy; check every drain as above; wait for every node lease to expire;
  copy the bucket and each work directory; start the supervisors and the
  proxies. A restore puts both back under the same names and loses
  everything after the backup. A copy of the bucket alone is never
  called a backup, on one node or on two.

H4 holds the kit to this: stop the owner and watch the peer recover the
acknowledged tail; replace one VM by the procedure; take a stopped-fleet
backup and restore it into a fresh fleet; and force a drain to end
unknown, by making the bucket unreachable from the node during the stop,
and show that `drain` reports unknown, `down` refuses to remove the VM,
and `backup` refuses to call its copy complete.

For a verifiable history apart from the service, the archive binding of
the sequenced note's section 4 points at a git host, which may be the
own host or an external one. Restoring a scope from an archive is not
built, and a kit cannot promise it (section 6).

## 5. Packaging for the simplest deployment

The release artifact `dap-host-<version>.tar.gz` holds:

| Path | What |
|---|---|
| `worker/worker.js` | The room Worker, bundled by esbuild at release time, with the Cloudflare-only imports left external |
| `worker/wrangler.json` | The celld project of 4.1, with `vars` placeholders and the optional package binding |
| `celld.version` | The pinned celld tag |
| `celld.service` | The unit: `Restart=always`, no start limit, `RestartSec` above the lease, `TimeoutStopSec` above the shutdown bound, `CELLD_WATCH` on the persistent disk, a fixed `CELLD_NODE`, the public listener on loopback |
| `Caddyfile` | The proxy: the DNS name as the one substitution, 443 to the loopback port, `CF-Connecting-IP` overwritten with the remote address |
| `up.gcp.sh`, `up.aws.sh` | Create the parts for one cloud |
| `deploy.sh` | `celld deploy` of `worker/` to the bucket, with the vars filled from the operator's secret source |
| `drain.sh` | Stop one node gracefully, then check the drain by the two conditions of 4.7: the sealed-close line in the shutdown log and a sealed or absent node record in the bucket. Exits non-zero on an unknown drain and says what it found |
| `backup.sh` | The stopped-fleet backup of 4.7, in celld's order, refusing to report a complete copy after an unknown drain |
| `down.gcp.sh`, `down.aws.sh` | Drain both nodes, and remove the parts only when both drains are complete. An unknown drain stops the script with the VM and its disk kept |

**GCP.** `up.gcp.sh` takes a project, a region and a DNS name and makes:
one bucket with uniform access, a service account with object admin on
that bucket and nothing else, two `e2-small` instances with that account,
the `cloud-platform` scope and a persistent disk for the work directory,
a firewall rule for 443 and 80 from anywhere and for the internal port
inside the VPC only, and a startup script that installs the pinned
celld, writes the unit with `--bucket gs://`, `--listen` on loopback
and `--internal-listen` and `--advertise` on the private address,
installs Caddy, and starts both. The operator
points the DNS name at the two addresses, runs `deploy.sh`, and follows
[Run dap in 10 minutes](../docs/self-host.md) from the `dap install`
step with `--host self`. The qualification used the same pieces by hand,
one node, in about four minutes from bucket to serving.

**AWS.** The same script shape over the AWS command line: an S3 bucket,
an instance profile with `s3:*Object*` and `s3:ListBucket` on that
bucket, two `t3.small` instances with the profile, a security group with
the same two rules, the same startup script with `--bucket s3://` and the
region. celld's S3 client takes the instance profile from the standard
credential chain. The AWS run is slice H5, and its details follow it.

**What the operator does, in order.** Choose a DNS name. Run `up`. Set
the DNS record. Run `deploy`. Run `dap install --plan`, put the register
id into the vars, run `deploy` again, then `dap install --planned` and
`dap create`. Everything after that is the existing guide.

Kubernetes adds nothing here. celld does its own placement, balancing and
takeover. A cluster would need a headless service for the peer port, a
network policy to keep it private, and a recreate strategy for the
stop-all celld upgrades. A customer who runs everything in Kubernetes can
wrap the same binary and bucket, and the kit does not stop them.

## 6. Trade-offs and future constraints

- **A commit pays for durability, and the price is unmeasured.** One
  node waits for a bucket proof, a fleet for a follower's fsync. The GCP
  run's acts were slower than the laptop's, and how much of that is the
  proof, the network, process startup or the node's work is not known
  (section 7). The kit makes two nodes the default for failover, and H4
  measures the turn on one node and on two before any number reaches a
  customer.
- **Acknowledged writes live on node disks before they reach the
  bucket, and a clean exit does not prove they left.** The work
  directories persist, nodes keep their names, a drain is checked by the
  sealed-close line and the node's bucket record, an unknown drain keeps
  the VM, the supervisor restarts without limit after a lease lifetime,
  and a backup is celld's stopped-fleet backup of the bucket and every
  work directory (4.7). A bucket copy, of a serving fleet or alone, is
  not one.
- **The proxy owns the client address.** The join limits and the MCP
  bearer-failure limit key on `cf-connecting-ip`, which only the proxy
  may set (4.6). A deployment that exposes celld's port without the
  proxy has no address limits.
- **Packages need a fleet.** The R2 binding fails on a node without a
  fleet bucket, so `celld dev` does not cover them, and neither run
  installed one. H4 witnesses the store.
- **celld is beta and is being merged into workerd.** The application API
  is Cloudflare's and does not move. The node's command line, the bucket
  layout and the upgrade rules may. The kit pins a celld version per dap
  release, and H4 reruns the qualification on each bump.
- **The bucket is the administrative boundary.** Its credentials are
  fleet administrator access, and the deployment vars live in it. Keep
  them to one fleet. When celld gains a secrets mechanism, the kit moves
  the vars there.
- **The script name and the migration tags are permanent.** Both are in
  every object's identity. The kit fixes `name` to `artroom-scope` and
  never adds a class rename, delete or transfer.
- **Adjacent dap releases must accept each other's calls** across
  objects. This becomes a release check.
- **The own git host is not independent of the service** and serves
  whole repositories as one pack within `maxBytes`. A customer who needs
  a full git host, or independence, configures GitHub or binds the archive
  outside.
- **Alarms were not witnessed firing on schedule.** Nothing in the
  qualification has a timed rule. The GCP node logged thirty warnings in
  22 seconds while deferring one cell's wake-record maintenance after a
  conditional write "may have committed", and recovered. H4 witnesses a
  timed rule and a takeover with the grow package.
- **No on-premises store yet.** celld needs conditional writes and
  read-after-write consistency, and the qualified stores are the five
  named in section 3. A customer with only MinIO waits for celld to
  qualify it.
- **Live rooms do not move.** Object identities differ between fleets,
  and nothing restores a scope from its archive. A self-hosted customer
  starts new rooms. Restore from archive is the next design, after
  A4 and A5 of the archive note.
- **One region.** celld's fleet is one bucket in one region. Multi-region
  is out of scope for it and for this note.
- **No Windows nodes.** Linux x86-64 and ARM64 only.
- **Every run above measured command-line wall time.** The node's own
  turn time needs a timer in the Worker before a number goes in the
  customer's documentation.

## 7. What the qualification showed

Both runs did the same thing: a planned install, `dap create`, twenty
`add-member` acts, one invite, and `dap verify --all`. All 13 scopes
replayed consistent in both. Times are the command line's wall clock on
the laptop, including Node startup. The record has the commands and the
full output.

| Step | celld on the laptop | celld on one GCP node |
|---|---|---|
| `dap create`, five scopes and the first publication | 2.7 s | 6.1 s |
| One act, p50 of 20 | 571 ms | 1076 ms |
| One read | 561 ms | 898 ms |
| Health round trip | about 1 ms | about 110 ms |
| `dap verify --all`, 13 scopes | 2.3 s | 66 s |

These figures do not isolate anything. An act on GCP took about 505 ms
longer than on the laptop, and about 180 ms longer than a different read
command on GCP. Process startup, the network, the node's work and the
bucket proof are all inside those differences, with unmatched samples,
and the 66 seconds of replay say nothing about how much the node
contributed. The one claim they support is that every step worked. The
node's own turn time, on one node and on two, is H4's timer. The pinned
redeploy was adopted in place within 60 seconds with no restart.

## 8. Changes to existing documents

| Document | Change |
|---|---|
| [Run dap in 10 minutes](../docs/self-host.md) | A second path, "On your own cloud", from the kit's `up` to `dap create`, with its own measured run |
| [Configure a Git host](../docs/hosts.md) | A section for host `self`: what it serves, its bounds, its tokens |
| [Deploy the scope Worker](../docs/deploy.md) | The celld project file and which settings become vars |
| [The architecture of a dap application](../docs/architecture.md) | "How it is deployed today" gains the second runtime in one paragraph |

## 9. Slices

| Slice | What | After |
|---|---|---|
| H1 | The celld project in the repository: `apps/room/celld/`, the direct-call change for the page and MCP routes, the qualification smoke as a script that sends the address header itself, and a CI job that runs it against `celld dev` | Now |
| H2 | The own git host: `GitRepository`, the smart HTTP route, the `self` wiring, tokens, bounds; witnesses: the lane story over host `self`, a real `git clone` and `git push` from a laptop, a push refused `stale` | H1 |
| H3 | The host kit and the GCP scripts with the unit, the proxy, `drain` and `down` of 4.7, the second self-host path in the docs with a measured run; witnesses: the three address witnesses of 4.6, and a node replaced by the procedure | H1, H2 |
| H4 | Two-node fleet qualification: the grow package with a timed rule; stop the owner and watch the peer recover the acknowledged tail; a node replaced by the procedure; a stopped-fleet backup restored into a fresh fleet; a drain forced to end unknown by an unreachable bucket, with `drain`, `down` and `backup` refusing as 4.7 says; the package store's `put`, refused conditional `put`, `get` and readback; a celld version bump under its release rule; a timer in the Worker for the node's own turn time on one node and on two | H3 |
| H5 | The AWS scripts and their measured run | H3 |

H1 is a day. H2 is two to three days. H3 and H5 are a day each. H4 is a
day. None of them goes ahead of the grow demo of plan 033.

## 10. Decisions

1. The self-hosted runtime is celld, pinned per release, with the Worker
   unchanged. Not a host of dap's own over Node and SQLite, which would
   mean owning single-writer fencing, the hard part celld does.
2. One dap deployment is one fleet. The homepage and jam are static
   assets, not a second fleet.
3. The default git host for self-hosting is dap's own bounded host,
   recorded as host `self`. GitHub stays the external option, Artifacts
   stays Cloudflare's.
4. Application packages are read through celld's R2 binding over the
   fleet bucket.
5. Metrics are absent and logs go to the journal. The version is a var.
6. Secrets are deployment vars in the bucket for the first version, read
   from the operator's secret source by the `deploy` script.
7. Two nodes, one bucket, Caddy, one DNS name, no Kubernetes.
8. The proxy owns the client address, and celld's public port is
   reachable only from the proxy on its node.
9. Node work directories persist, nodes keep their names, stops are
   graceful and a drain is a checked outcome, an unknown drain keeps the
   node, the supervisor restarts without limit after a lease lifetime,
   and a backup is celld's stopped-fleet backup of the bucket and every
   work directory.
10. Not provided: moving live rooms, more than one region, an
    on-premises store, Windows.

## 11. Open points

| Point | Question | Proposed |
|---|---|---|
| Q1 | Whether a real `git clone` accepts the own host's upload-pack with no negotiation | H2's witness decides. If not, the host answers the client's `want` lines with the same whole pack |
| Q2 | How the `deploy` script reads secrets on each cloud | Secret Manager on GCP and Secrets Manager on AWS, with a file as the fallback |
| Q3 | Whether the archive binding should refuse the own host as its target | No. It is recorded as the host, and the docs say what independence it lacks |
| Q4 | Whether the CI job of H1 runs on every head or on heads that touch the scope package | On heads that touch `packages/scope`, `packages/mcp` or `apps/room` |
| Q5 | The node's own turn time, single node and fleet | H4's timer |

## 12. Changes in drafts 2 and 3

Review `783a1530` of draft 2 found F2, F3 and F4 resolved and held
approval on one part of F1.

| Finding | Answer |
|---|---|
| F1 (P1), remaining part: a drain was inferred from a clean exit, though celld can reach its own deadline, exit 0 and leave an open log record, so the procedure could discard the only acknowledged tail or export an incomplete backup | 4.7: a drain is complete only when the shutdown log has `node-log close: sealed epoch` and the node's bucket record is sealed or absent; any other end is unknown, keeps the VM, its directory and its name, and refuses replacement, deletion and any complete-backup claim. A backup is celld's stopped-fleet backup, bucket and every work directory with names, addresses and directories preserved, taken after stopping traffic, deployment writers, nodes and supervisors and waiting for the leases to expire. Section 5's `drain`, `backup` and `down`. H4's forced unknown drain. Decision 9 |

Review `9c5dadcc` of draft 1 requested four changes.

| Finding | Answer |
|---|---|
| F1 (P1): a bucket copy omits acknowledged writes held on node disks, and the supervisor rules were missing | 4.7 rewritten: the record is the bucket plus the node disks; persistent work directories and fixed node names; graceful stop within the shutdown bound with `TimeoutStopSec` above it; restart without limit after a lease lifetime; a backup is a stopped-fleet backup; node replacement by the procedure. The unit, `drain` and `down` in section 5. H4's witnesses. Decision 9 |
| F2 (P2): the timings claimed a 70 to 180 ms bucket proof and a two-node improvement they cannot isolate | The causal bounds are gone from sections 3, 6 and 7 and from the record. The tables stay as observed command-line wall times. The node's turn time is H4's timer, and the two-node expectation is named as unmeasured |
| F3 (P2): `r2_buckets` was excluded and required at once, and `celld dev` has no bucket | 4.1 excludes only the four Cloudflare-only keys. 4.3 states the optional `APPLICATION_CONTENT` binding, its `bucket_name` and prefix in the fleet bucket, `APPLICATION_TRUST`, that every R2 method fails without a fleet bucket, and that neither run installed a package. H4 witnesses the store |
| F4 (P2): the `cf-connecting-ip` header trust was an unlisted coupling, forgeable behind celld and a plain proxy | Section 2 lists it. 4.6 makes the header the proxy's: overwritten from the remote address, celld's public port on loopback, the firewall closed to all but 443 and 80. Three witnesses in H3. Decision 8 |

## Sources

- The two runs: [celld qualification record](implementation/2026-10-19-celld-qualification.md).
- celld, at the pinned tag v0.6.2:
  [README](https://raw.githubusercontent.com/denoland/celld/v0.6.2/docs/README.md)
  (shutdown, rollout, environment variables),
  [guarantees](https://raw.githubusercontent.com/denoland/celld/v0.6.2/docs/guarantees.md)
  (acknowledgement, recovery, the supervisor, the node record's states,
  and "Start a fleet with this format" for the stopped-fleet backup),
  [Cloudflare compatibility](https://raw.githubusercontent.com/denoland/celld/v0.6.2/docs/cloudflare-compat.md),
  [R2](https://raw.githubusercontent.com/denoland/celld/v0.6.2/docs/services/r2.md),
  [Durable Objects](https://celld.dev/docs/services/durable-objects/),
  [limitations](https://celld.dev/docs/limitations/),
  [the repository](https://github.com/denoland/celld).
- Caddy, [`reverse_proxy` headers](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers).
- [Deno is joining Cloudflare](https://blog.cloudflare.com/deno-joins-cloudflare/), 9 October 2026.
- [workerd pull request 6780](https://github.com/cloudflare/workerd/pull/6780), closed 11 September 2026.
- In this repository: [Run dap in 10 minutes](../docs/self-host.md),
  [Configure a Git host](../docs/hosts.md),
  [Deploy the scope Worker](../docs/deploy.md),
  the archive note's section 15 in
  [shared language and volatile acts](2026-10-09-shared-language-volatile-acts.md),
  and [the sequenced level and the order scope](2026-10-18-sequenced-level-and-order-scope.md), section 4.
