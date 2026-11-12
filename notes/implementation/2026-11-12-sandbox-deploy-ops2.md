# Deploy and smoke the sandbox Worker

Request `60f5b713` (OPS-2).

## What changed

`scripts/deploy.mjs` and `scripts/deploy-smoke.mjs` accept a fifth name,
`sandbox`. It names the Worker `dap-application-sandbox` and its tracked
configuration `apps/sandbox/wrangler.rollout.jsonc`.

`scripts/deploy-config.mjs` replaces the four-name set with one table of
names. Each row holds the configuration path and whether the Worker owns a
migration history. `configPath`, the new `hasMigrations` and the new
`hostedNames` read that table. The usage text of both commands comes from
`hostedNames`.

The deploy command builds the sandbox with the same pinned Wrangler
4.147.0, `--keep-vars` and external scratch directory as the room Workers.
It writes the same receipt: commit, configuration hash, dry-run bundle
hash, Worker version and time. `checkMigrations` returns no tags for a
name without a migration history. It refuses such a configuration if the
current or the deployed version declares `migrations` or
`durable_objects`.

When a previous receipt has the same dry-run bundle hash and the same
configuration bytes as the current build, the deploy command prints that
name as `unchanged`. It sends nothing and writes no receipt for that name,
deploys the other names and exits 0. This applies to all five names. A
previous receipt must now carry a bundle hash.

The new `smokeSandbox` takes the mapped screen host and a room scope from
`--host` and `--room`. The source names no room. It makes five reads:

| Read | Expected | Where `apps/sandbox/worker.ts` answers |
| --- | --- | --- |
| `GET /` on the mapped host | 404, no body | Line 48: the path is not `/_application-host`, not a screen address, and `applicationGatewayRoute` refuses a first segment other than `site` or `v1`. |
| `GET /site/x` on the mapped host | 404 | Line 48: `applicationGatewayRoute` requires `parts[1]` to equal the mapped directory and at least four parts. |
| `GET /applications/x` on the mapped host | 404 | Line 48: `readApplicationScreenAddress` needs four segments after `/applications/`, and the gateway refuses the first segment. |
| `GET /v1/scopes/<room>` on the mapped host | 403, `{"ok":false,"reason":"forbidden"}` | Line 48 admits the route. Lines 52 and 53 check the bound service's descriptor; a mismatch answers 503. Line 87 calls `native`, and line 130 returns the room's own answer. `route` in `packages/scope/src/worker.ts` answers an unauthenticated summary read with `READ_STATUS.forbidden`, 403. |
| `GET /` on `unmapped-smoke.<parent domain>` | 404 | Lines 41 and 42: no `SCREEN_HOSTS` row matches the origin. |

`docs/operate-a-service.md` lists five names in one command, adds
`SANDBOX_DEPLOYED`, the sandbox's settings, the unchanged-name skip and
the sandbox smoke command.

`packages/mcp/test/sqlite-custody.test.ts` gives the store the test clock.
Commit `dd315954` cherry-picks that fix from NF-1 under ruling `0f1ef8ea`.
Main `33836693` carries the same bytes, so the landing does not change the
file.

## Decisions and why

The request asked for the sandbox to refuse "like the others" when the
dry-run bundle equals the previous receipt's bundle. At main `28aa0446` no
name had that check. Planner ruling `c7585e08` replaces the refusal with a
skip: an unchanged name sends nothing, and the run continues with the
other names. The skip holds for all five names. It also compares
configuration bytes. A sandbox mapping change edits only `SCREEN_HOSTS`
and leaves the bundle unchanged, so that change still deploys.

The comparison runs after every dry run, inside the deployment loop. A dry
run never skips, so an operator can still compare hashes.

The sandbox smoke derives the unmapped host from the mapped host: the
label `unmapped-smoke` under the same parent domain. It refuses when that
host is a tracked mapping. A fixed label keeps runs comparable. The smoke
also refuses a `--host` that the tracked `SCREEN_HOSTS` does not map, and
a `--room` that is not a scope identifier.

Only the 403 read shows that the mapping and the service binding work.
The 404 reads show that the sandbox serves no unrouted path. A 404 on the
mapped root does not by itself tell a mapped host from an unmapped one.

The first sandbox receipt can start from `--deployed
sandbox=221e11c33428068e0b95ffaa30aa0d294186b3c0`. `apps/sandbox` and the
gateway sources are unchanged between that commit and `28aa0446`, so that
dry-run bundle should equal the running bundle `be14bc37`.

## Final evidence

The [manifest](evidence/2026-11-12-sandbox-deploy-ops2.manifest.json)
lists each cited file with its bytes and SHA-256. Paths are relative to
`~/play/artroom-evidence`. The gated head is `fea6ab4d`, tree
`265059ce522724ea0f49b45f1a4159e8d6b53f6f`, on base main `28aa0446`. No
command in this head ran Wrangler, a deployment or a smoke against a
Worker.

| Check | Head and command | Exit and result | Output |
| --- | --- | --- | --- |
| Deploy and smoke owners | `fea6ab4d`: `node --test scripts/deploy.test.mjs scripts/deploy-smoke.test.mjs` | 0. 22 of 22 passed: `deploy.test.mjs` 12, `deploy-smoke.test.mjs` 10 | `2026-11-12-ops2-owners-fea6ab4d/owners.stdout` |
| Skip control | `fea6ab4d`: `node scripts/control.mjs scripts/deploy.mjs` with the skip condition replaced by `false`, `--expect 'the sandbox deploys its own configuration'`, on `scripts/deploy.test.mjs` | 0, distinguishes. Before: 12 passed. After: 11 passed and 1 failed by a strict deep-equal assertion in "the sandbox deploys its own configuration and a name with an unchanged bundle and configuration sends nothing" | `2026-11-12-ops2-control-fea6ab4d/control.stderr` |
| First gate | `fea6ab4d`: `npm run gate` | 130. The builder interrupted it in the Node project, during planner deployment window `b89fe9cf` | `2026-11-12-ops2-gate-fea6ab4d/gate.stdout` |
| Gate | `fea6ab4d`: `npm run gate` | 0. Node 172 of 172, Counting 56 of 56, Plain 4,545 of 4,546 with 1 skip, Native 1,132 of 1,134 with 2 skips. START `5bd95074`, END `61303c04` | `2026-11-12-ops2-gate-fea6ab4d-2/gate.stdout` |

Each gate's internal temp directory moved into its evidence directory
under ruling `63368b81`. Each directory's `internals-move.json` records
both paths.

No Card or Page workflow filter names a path in this head, so no
workflow run applies.

The custody test has no artifact in this head. NF-1 owns the file, and
main already carries the same bytes.

The control in `2026-11-12-ops2-control-dd315954` tested the refusal that
ruling `c7585e08` replaced. It is not evidence for this head.

## Open limits

Request `60f5b713` owns these:

- Scripted Wrangler and scripted fetch witnesses prove no deployment, edge
  behaviour or DNS. The planner runs the first real sandbox deployment and
  smoke through the commands.
- The unmapped read needs DNS for `unmapped-smoke.inguz.space`. The route
  `*.inguz.space/*` covers the host, and ruling `c7585e08` states that a
  wildcard DNS record exists. No run in this head read the host.
- The 403 read needs an existing room behind the mapped host that refuses
  an unauthenticated summary read.
