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

The deploy command now refuses a batch before any upload when a previous
receipt has the same dry-run bundle hash and the same configuration bytes
as the current build. This applies to all five names. A previous receipt
must now carry a bundle hash.

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
`SANDBOX_DEPLOYED`, the sandbox's settings, the unchanged-build refusal and
the sandbox smoke command.

## Decisions and why

The request says the sandbox refuses "like the others" when the dry-run
bundle equals the previous receipt's bundle. At main `28aa0446` no name
had that refusal. This head adds it for all five names, so the five names
behave the same. The refusal also compares configuration bytes. A sandbox
mapping change edits only `SCREEN_HOSTS` and leaves the bundle unchanged;
a bundle-only comparison would refuse that deployment.

The refusal runs after every dry run and before any upload, as the other
preflight checks do. A dry run never refuses, so an operator can still
compare hashes.

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

UNRUN. The builder ran no test, gate, Wrangler or smoke command at this
head; root schedules validation. Expected owners:
`scripts/deploy.test.mjs` (12 cases) and `scripts/deploy-smoke.test.mjs`
(10 cases), then `npm run gate` once.

| Check | Command | Exit | Output and SHA-256 |
| --- | --- | --- | --- |
| Deploy and smoke owners | `node --test scripts/deploy.test.mjs scripts/deploy-smoke.test.mjs` | UNRUN | UNRUN |
| Full gate | `npm run gate` | UNRUN | UNRUN |

## Open limits

Request `60f5b713` owns these:

- Scripted Wrangler and scripted fetch witnesses prove no deployment, edge
  behaviour or DNS. The planner runs the first real sandbox deployment and
  smoke through the commands.
- The unmapped read needs DNS for `unmapped-smoke.inguz.space`. The route
  `*.inguz.space/*` covers the host; a missing DNS record makes the read
  fail before the Worker answers.
- The 403 read needs an existing room behind the mapped host that refuses
  an unauthenticated summary read.
