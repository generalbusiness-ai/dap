# SeaweedFS as the local bucket for celld on one Mac mini

27 October 2026, 10:45 to 12:55 ET. The record behind the local
self-hosted deployment that the
[self-hosting note](../2026-10-19-self-hosting-on-celld.md) does not
cover: one Mac mini, one celld node, and a bucket on the same machine.
The note's section 10 (decision 10) leaves out an on-premises store;
this record is the evidence for adding one. It follows the
[celld qualification](2026-10-19-celld-qualification.md) of 19 October.

The machine was an Apple M4 Mac mini with 16 GB of memory and macOS
27.0.1. SeaweedFS 4.51 ran as one all-in-one process. celld v0.6.3 ran
as one node with no followers. The room Worker came from main
`4419008a`. Everything listened on 127.0.0.1. Nothing in this record is
a customer procedure, and nothing was filed, committed or deployed
during the run. The trial directory on the mini was deleted afterwards.

**How each figure was taken.** "Node" times come from a `Server-Timing`
header that the qualification entry put on every response. That timer
covers every object call and celld's output gate, including the bucket
proof. It excludes the client, Node startup and the network.
"Client" times are measured by a load driver that calls the command
line's own `command()` inside one Node process on the mini. "CLI" times
are the wall time of one `dap` process on the laptop, through an ssh
tunnel, Node startup included, as on 19 October. Each table row is one
run unless it says otherwise.

## 1. Result

SeaweedFS meets every bucket requirement that celld states
(conditional create, conditional overwrite, read-after-write, exact
ranged reads, list-after-write), and dap ran on celld over it from
install to `verify --all`. No functional blocker was found.

Three findings change how the store must be configured:

1. **SeaweedFS does not fsync before it answers a write**, unless a
   filer storage rule asks for it (`weed/filer/filer.go`,
   `syncWriteContext`). A process kill cannot show this, because the
   page cache survives it. A power loss could lose writes that celld
   has already acknowledged, which breaks celld's guarantee. With the
   rule on, the node's act time went from p50 15 ms to 59 ms, and p99
   from 27 ms to 118 ms (back-to-back runs on the same rooms).
2. **A SeaweedFS restart stops writes for 17 to 30 s**, after a clean
   stop and after a kill alike. The master refuses volume assignment
   for a fixed 15 s warm-up. With celld's default lease of 10 s, celld
   fenced itself and exited with code 3 each time. With
   `CELLD_TTL_MS=60000` it did not fence: one act failed when celld's
   10 s durability budget ran out, with nothing acknowledged, and the
   next act waited 8.3 s and took effect.
3. **Conditional writes that contend for one key take seconds beyond
   two writers.** SeaweedFS serializes them with a lock whose client
   sleeps 1 s on contention (`weed/cluster/lock_client.go`). Each round
   still had exactly one winner. Distinct keys are not affected, and
   one node rarely writes one key from several tasks; a fleet of three
   or more nodes was not tested.

## 2. Correctness of the store

| Check | What ran | Result |
|---|---|---|
| celld's storage test | `celld diagnose` against the SeaweedFS endpoint | "ok bucket conditional write: create, reject-create, update, reject-stale", 0.45 s. Every node start runs the same test |
| Conformance probe | 69 checks with `@aws-sdk/client-s3` 3.1150.0: conditional create and overwrite, `If-Match` on a missing key, ETags, ranges, listing, metadata, objects to 16 MiB, a 3-part multipart upload | All 69 passed. `If-Match` on a missing key answers 404 `NoSuchKey`, which celld's client (`object_store` 0.12.5) treats as a clean refusal. A range past the end answers 416 |
| Races | 9 series, 2,000 rounds of create and of compare-and-swap at 2, 8 and 32 writers, and 3 read-then-increment counters | Every round had exactly one winner, every loser got 412, and no counter lost an increment |
| Kill of SeaweedFS | 8 writers, a compare-and-swap chain and a race loop; kill -9 at 8 s | 41,093 of 41,093 acknowledged creates present and byte-identical; 3,244 counter increments, final value 3,244; 3,951 race rounds, none with two winners |

Time for a conditional write, client wall time:

| Mode | Writers | p50 | p99 | max |
|---|---|---|---|---|
| create, one key | 2 | 4.3 ms | 6.4 ms | 7.5 ms |
| create, one key | 8 | 2,019 ms | 6,028 ms | 6,029 ms |
| create, one key | 32 | 6,033 ms | 30,079 ms | 30,098 ms |
| compare-and-swap, one key | 2 | 3.6 ms | 7.0 ms | 9.0 ms |
| compare-and-swap, one key | 32 | 3,022 ms | 28,058 ms | 30,088 ms |
| create, distinct keys | 32 | 6.9 ms | 12.7 ms | 14.3 ms |

Time until the store answers again after a restart, polled every
100 ms from the start of the new process:

| Stop | Flags | First read | First write |
|---|---|---|---|
| kill -9 | defaults | 17.9 s | 29.0 s, 30.2 s (two runs) |
| SIGTERM | defaults | 12.3 s | 26.7 s |
| kill -9 | `-master.electionTimeout=1s` | 3.2 s, 3.1 s | 17.7 s, 17.6 s |
| SIGTERM | `-master.electionTimeout=1s` | 3.1 s | 17.6 s |

## 3. dap on celld over SeaweedFS

**The qualification entry**, rebuilt from the 19 October record: the
room Worker unchanged, the Artifacts host bound to an in-memory copy of
the test stand-in `OwnGit`, a `Server-Timing` wrapper, and an
`r2_buckets` binding `APPLICATION_CONTENT`. One change since 19
October: the creation admission in `apps/room/creation-admission.ts`
admits a register install only when the Worker's `ARTIFACTS_CONFIG`
names that register, so the project sets it as a variable. Without it
the install is refused with 403.

**The smoke** (CLI times; compare orders of magnitude only, since the
celld version, the dap source and the client differ from 19 October):

| Step | celld dev, laptop (19 Oct) | One GCP node (19 Oct) | One node, SeaweedFS |
|---|---|---|---|
| install --planned | 632 ms | 1,405 ms | 603 ms |
| create | 2,705 ms | 6,100 ms | 3,048 ms |
| act, p50 of 20 | 571 ms | 1,076 ms | 593 ms |
| a read | 561 ms | 898 ms | 587 ms |
| invite | 558 ms | 1,050 ms | 578 ms |
| verify --all | 2,255 ms, 13 scopes | 66,468 ms, 13 scopes | 14,832 ms, 26 scopes |

Every step exited 0, and `verify --all` reported all 26 scopes
consistent. The room now creates an inbox for each member, so a room
has 26 scopes where it had 13.

**Package store.** A conditional put of 1 KiB and of 4 MiB was applied,
a second conditional put of each was refused, and a get returned the
same bytes. The objects are stored under
`r2/application-content/applications/releases/<sha256>` in the fleet
bucket. This exercises the store's calls on the binding; it is not a
package install.

**Crash and restart.** Each check compares the acts that the client
saw acknowledged with the membership log, entry by entry.

| Test | What happened | Acknowledged acts present |
|---|---|---|
| celld kill -9 during a burst | Restarted after 11 s | 553 of 553, no extras, no duplicates |
| celld kill -9 during a burst, second room | The act in flight got no reply and is absent; first acknowledgement 836 ms after restart | 36 of 36; `verify --all` consistent for 42 scopes |
| SeaweedFS kill -9, default lease | celld fenced itself (exit code 3) at 7.2 s; acts took effect again from 19.4 s | 36 of 36 |
| SeaweedFS kill -9, `CELLD_TTL_MS=60000` | No fence; one act failed with nothing acknowledged, the next took effect after 8.3 s | 17 of 17; every room scope consistent |
| Clean stop and start of both | celld stopped in 25.1 s, SeaweedFS in 25.2 s | Every room scope consistent |

**Drain on one node.** Every SIGTERM of celld logged
`shutdown_handoff_stalled` after 25 s, because one node has no peer to
take its cells. No `node-log close: sealed epoch` line was written, and
`nodes/mini-1.json` stayed with `"draining": true` and no `log` object.
celld's guarantees count a record with no `log` object as safe. The
self-hosting note's section 4.7 calls any end without the sealed line
an unknown drain, so it needs a single-node case.

**Alarms.** For the first time on celld, timed rules were seen to fire.
An invitation of 0.02 hours lapsed with its `timed` entry 2 ms after
its end, in a resident cell. A one-hour invitation whose end crossed
several restarts lapsed 20.2 s late, through a cold wake: celld's waker
scans every 60 s by default.

## 4. Performance

**The node's own time for one act (open point Q5 of the self-hosting
note, one node).** Over 250 sequential `add-member` acts: p50 17 ms,
p95 31 ms, p99 47 ms, max 52 ms. The same run on `celld dev` on the
same machine: p50 12 ms, p99 35 ms. Both include their store's proof.
These runs had no fsync rule; section 1 gives its cost.

Acts under load. Each `add-member` creates a member item and a new
inbox scope. Node times are the `QUALTIME` lines in the celld log for
each run's window.

| Run | Writers | Acks/s | Client p50 / p99 | Node p50 / p99 |
|---|---|---|---|---|
| 1 room, sequential | 1 | 24 | 38 / 73 ms | 17 / 47 ms |
| 4 rooms | 4 | 60 | 62 / 119 ms | 27 / 62 ms |
| 16 rooms | 16 | 121 | 92 / 362 ms | 39 / 93 ms |
| 1 room, 4 writers | 4 | 30 | 125 / 258 ms | 52 / 136 ms |
| 1 room, 16 writers | 16 | 34 | 353 / 972 ms | 133 / 712 ms |
| celld dev, 16 rooms | 16 | 54 | 119 / 1,938 ms | 54 / 1,847 ms |

Runs moved by up to 40% with the number of resident and evicted cells,
so these figures do not isolate the store's share under load.

Other measurements:

| Measure | Result | How taken |
|---|---|---|
| Reads, `dap log membership --limit 20` | Node p50 7 ms, p99 17 ms on one room; p50 23 ms, p99 74 ms on 16 rooms in parallel | 200 and 1,600 reads |
| `dap create` | Node time 260 ms per room, 17 requests per room; client p50 2,347 ms | Sum of node times in the creation window over 25 rooms, by script |
| Cold wake | First act on a room with no resident cell: 138 ms client; next acts 34 to 59 ms. Restoring one cell: 63 to 137 ms | One room; celld log, 5 cells |
| Bucket traffic per act | 21.1 S3 requests (8.3 PUT, 10.4 GET, 1.5 DELETE), 278 KB up, 38 KB down | SeaweedFS metrics over about 200 acts |
| Disk per act | SeaweedFS 169 KB, celld work directory 450 KB | `du` over the same acts; most is the new inbox's first snapshot of about 340 KB |
| Space reclaimed | celld's epoch GC deleted objects continuously; SeaweedFS vacuumed a volume on its own at its 30% threshold | Sustained run |
| Idle CPU | celld used 2.25 cores with about 2,000 resident cells and no requests; 0.7% of a core after a restart with few cells | `ps` samples |
| Sustained load, 35 minutes | Node act p50 fell from 27 to 19 ms; no store errors and no celld warnings | 4 rooms acting, 8 reading, one contended room |

## 5. Configuration for one machine

- SeaweedFS: `weed server` bound to 127.0.0.1, with
  `-master.electionTimeout=1s`, `-master.telemetry=false`, the Iceberg
  and Lance listeners off, an explicit `-volume.max` (with `0` all 21
  slots were allocated), and the fsync rule
  `fs.configure -locationPrefix=/buckets/celld-fleet/ -fsync=true`.
- Start SeaweedFS from an environment without AWS variables; it
  registered their key as an administrator.
- celld: a supervisor that restarts without limit after more than one
  lease, `CELLD_TTL_MS=60000`, idle eviction (`CELLD_IDLE_EVICT_S=300`)
  and epoch GC on. `CELLD_LTX_DURABILITY_TIMEOUT_SECS=30` should let
  acts wait through a store restart; it was not tested.
- Start SeaweedFS first, and celld after a write succeeds.
- Backup: stop traffic; stop celld and check its node record has no
  `log` object; wait one lease; stop SeaweedFS; copy its data directory
  and celld's work directory together; start SeaweedFS, then celld.

## 6. Evidence

The raw outputs are in the read-only folder
`~/play/artroom-evidence/2026-10-27-seaweedfs-local-bucket/` with a
`SHA256SUMS` file. The manifest
[2026-10-27-seaweedfs-local-bucket.manifest.json](evidence/2026-10-27-seaweedfs-local-bucket.manifest.json)
lists every file with its size and digest. The full report of the run
is `REPORT.md` in that folder. `WITHHELD.txt` names what was left out:
the trial S3 identity, session secret, qualification token and client
keys, all of which belonged to a store and deployment that no longer
exist; and the celld binary and the reference source of celld,
SeaweedFS and `object_store`, which can be fetched again by the
versions and checksums in `VERSIONS.txt`.

| Check | Command | Exit code | Output digest (sha256) |
|---|---|---|---|
| Versions and checksums | downloads checked against published digests | not recorded | `6af149e5f69fab22bc18ff76c49bd5b1fd8258bdb027b77beeedddc5ad0d31db` (`VERSIONS.txt`) |
| celld storage test | `celld diagnose --bucket s3://celld-fleet --endpoint …` | not recorded; output line "ok bucket conditional write: create, reject-create, update, reject-stale" | `78c8afb62e98c58944cc854227a110326efca61a7fbaa08841e944f8afacfa88` (`raw/mini-logs/diagnose-1.txt`) |
| Conformance | `node probe/conformance.mjs` | not recorded; summary 69 checks, 0 failures, 6 notes | `7d43812c5b1b42e50219dc6ed99c69ece2e4b621f8b19b51d8ee2c2e66709afe` (`results-conformance-1.jsonl`) |
| Races | `node probe/race.mjs`, 9 series | not recorded; every series PASS | `5d418b27c191c9fca8e145c0c2d6c13796d356edb4e59c7895fbc5e2fe288ae1` (`results-race-suite.txt`) |
| SeaweedFS kill -9 | `node probe/crash.mjs`, check phase | not recorded; result PASS | `a39b378f30a2f54cacc72a3f07ced5681419fc68848ecd2e63ad2f5e8e00e641` (`raw/mini-logs/wcrash-w1/check.json`) |
| Store restart times | `scripts/weed-restart-avail.sh` | not recorded | `36057b9b76ea46d1c4a289ad7a31d26996629d5be99455a755899b0a88e3579b` (`raw/mini-logs/weed-restart-avail.jsonl`) |
| Smoke | `node scripts/smoke.mjs`, PHASE=run | 0 for every step | `3dd95e7cb53776a7a4a102ecdd57f7dc4b946ffac829e09583901eb3523b1c83` (`runs/smoke-1/steps.jsonl`) |
| Package store | `GET /__qual/r2` | HTTP 200, `"ok":true` | `5977107d11a5f79b45e29c2bad91fcc89fe597d7276fd2e71afa5ecdcce124d9` (`results-r2-witness.txt`) |
| celld kill -9, first room | `dap verify --all` after restart | 1: stopped at its 64-scope bound | `23e54d43da0e21197dd800d08cdf8fbf8d17673f227d84679d77570b1e25e59b` (`raw/mini-logs/crash-c1/verify-all.json`) |
| celld kill -9, second room | `dap verify --all`, second run | 0 | `495823843cff3540070d5ed9331310b74bcf77122383a59be554a9341b7aa6cf` (`raw/mini-logs/crash-c2/verify-all-2.json`) |
| celld exits and restarts | supervisor log | 3 after the store kill with the default lease, 0 after each SIGTERM | `939fc644893f3781518b3914c7ec3c10d86f61db864f194b9f7eaf4d290b0da9` (`raw/mini-logs/celld-exits.txt`) |
| Register from a second room | `dap verify --all` from room c2 | 1: register `missing-dependency` | `c76a655f68d9437bdbac5d447a8c8af5ef6a2af7cabe844886b2c0325874825c` (`raw/mini-logs/verify-c2-final.json`) |
| Sequential acts, client times | load driver, 250 acts | 0 for all 250 | `101c10266a1ab25e5e40574820e95b849e37d4f6eb866a9a7ec37673b1aa9125` (`raw/mini-logs/perf/seq-r1.jsonl`) |
| 16 rooms in parallel | load driver, 800 acts | 0 for all 800 | `40378d9e70bbcf75e4ed67ebc54bb4196f5bfa3374144be638f505b276bbcfa9` (`raw/mini-logs/perf/p16.json`) |
| celld dev comparison | load driver suite | 0 for every act | `3074a92a5e24354367226b81495c422b8a0f45b502d34a72b4742281d2d11969` (`raw/mini-logs/perf/dev-suite.txt`) |
| Sustained run | load driver, 35 minutes, snapshots every 60 s | not recorded | `4f7f181745b08abbc314fedd0ec9ee4cede69c5b86c2adaa2b159e00a55e89c3` (`raw/mini-logs/sustained/snaps.jsonl`) |
| Full report | — | — | `2b84620a795fc69150c5ee339c514fac6d8cae909d1ca6e9f7f3b9466ff2c5cf` (`REPORT.md`) |

## 7. Open limits

- **dap: about 1,000 members per room.** From about 1,000 members,
  `add-member` answers 503 "guard-incomplete". The range guard on the
  member handle scans at most `guardScan` (1,000) items
  (`packages/derive/src/guards.ts`). Owned by the planner's request
  for the problems this run found.
- **dap: sessions.** `REQUESTS_PER_KEY` (64, `packages/scope/src/sessions.ts`)
  per key and scope answers 429 to new sessions. Reads then fall back to
  signed reads, which were refused or saw fewer entries; one
  `verify --all` reported a false "incomplete" this way. Same owner.
- **dap: `verify --all`.** It stops at 64 scopes; on a room with 578
  members it took 585 s to report that. From a room other than the
  register's first one it cannot verify the register, and the same
  rule stops the key creating another room once its last signature is
  no longer recent. Same owner.
- **celld at idle.** Resident cells cost CPU: 2.25 cores at about 2,000
  cells. After each restart celld restored about 700 cells with no
  request; the cause is not isolated and fits cells with armed alarms.
  Same owner, to find whether dap arms those alarms.
- **Single-node drain** never seals (section 3). Owned by the
  self-hosting note's next draft.
- **Creation admission** needs `ARTIFACTS_CONFIG` even off Cloudflare.
  Owned by the Git host choice note (request `cc0bf648`).
- **Not measured:** server-sent event streams, acts that create no
  scope, two-node fleets, power loss, and the store's volume-slot cap.
- **One machine, one version, about two hours.** celld does not
  qualify SeaweedFS. SeaweedFS 4.49 to 4.51 were released within three
  days, so the pinned version needs review before use.
