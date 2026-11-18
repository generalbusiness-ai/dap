# The local Artifacts simulator

Status: findings and recommendations for request `51dd7c02`. Nothing is
adopted. Each adoption step below is a separate request after this note
lands.

Cloudflare's wrangler 4.163.0 (published 2026-11-16) simulates the
Workers `artifacts` binding locally. A repository created under `wrangler
dev` or the Vitest plugin lives in local state, not in a deployed
namespace. See the
[changelog entry](https://developers.cloudflare.com/changelog/post/2026-11-16-local-artifacts-development/).

Today six Wrangler configs under `apps/room` set `"remote": true` on the
binding, so a local `wrangler dev` run writes to the live namespaces. The
tests never touch the real binding: `packages/scope/test/hosts.ts` is a
hand-built stand-in.

## How the probe ran

The probe ran on 2026-11-18 in a scratch directory outside the
repository, with a minimal Worker that calls the binding. Nothing in the
repository, no Wrangler config and no deployed Worker changed. No
Cloudflare account was contacted.

- wrangler 4.163.0, the first release with the simulator.
- git 2.54.0. The simulator needs git 2.32 or later.
- node 26.13.1 and vitest 4.1.12, the repository's pin.
- `@cloudflare/vitest-pool-workers` 0.22.0, the repository's pin, and
  `@cloudflare/vitest-plugin` 1.8.3, the package that replaces it.

The probe ran twice. The first run gave the results. The second run,
at 14:16Z, repeated every step and captured each output with token
values replaced by `<token>`. Each result below was observed in both
runs unless the text says otherwise. The captured outputs are in
`artroom-evidence/2026-11-18-artifacts-simulator-probe/out/`:

| File | Holds | SHA-256 |
| --- | --- | --- |
| `routes.txt` | each binding call and its JSON answer | `c6b7949ea2936324ceaa13842b1828b6957fb8985fd1e83b7ff52eb8210865bd` |
| `git.txt` | clone, push, refused pushes, clone after delete | `9fa789cb39a2c553533a5e9f21418c236f3b1bad523128324bb84946cf1e6c0e` |
| `size.txt` | the 30 MB and 34 MB pushes | `bdd582c846bde55ab0f01860790fc5aeeacdc2b2eb38946cbdaa059568bc0eea` |
| `timing.txt` | start and cycle timings, with commands | `2985236e6391de301400b8f552980532bce116f1cdcf8132678cd70603d580db` |
| `vitest-pool022.txt` | the 0.22.0 pool run | `4e3fe4ed9ef1c07b0e7d197f328bae06033a8ad958c690b7823de5cd51c0ad74` |
| `vitest-plugin183.txt` | the 1.8.3 plugin run | `719150c9c0f4380c8fde240764c75b6c0d0c8e80b5e4c3deec1d11dc8f82e5bc` |

The scripts that made them sit beside them: `routes.sh` (`4e505bc3d508c5d9a66b4203d999e7af9bfab93475fe04f5ce8be77d6d8aea3c`),
`git.sh` (`16a912631d27de8a04425f5ca5d2b563f505186189ea49b2469317652ca50416`), `size.sh` (`7c6aba528f09bdb96df8c881f8c61e28fbfc1ec461e83def3f0f7650966edbdc`),
`cycle.sh` (`c95c757bd7c949aeb450d1bd36fc804cb138a68911d4e10e9c9894aab9bdc1df`), `devstart.sh` (`10b6d1bf99c0c4120f8561828d02557d22f69ed5201fa9f38953061dcdf2cffc`) and
`scrub.sh` (`1e21e23d92fcf720d1b1263d412f2d0569cbbcf26101ebe100d3e00a4c1399df`).

## What matches production

dap calls `get`, `create` and `delete` on the binding, and `revokeToken`
and `createToken` on a repository (`packages/scope/src/artifacts-host.ts`).
Each behavior that dap relies on matched:

| Behavior | Observed under `wrangler dev` |
| --- | --- |
| `create` | Returns `name`, `remote` and a write `token` with a 24-hour expiry. |
| `create` on a taken name | Throws code `ALREADY_EXISTS`. |
| `create` on a bad name | Throws code `INVALID_REPO_NAME`. |
| `get` on a missing name | Throws code `NOT_FOUND`. |
| `delete` | `true` when the repository existed, `false` when it did not. |
| `revokeToken` | `true`, then `false` on a second call; the push endpoint then answers 401 to the token. A malformed token throws `INVALID_INPUT`. |
| `createToken` | Returns `plaintext`, `scope` and `expiresAt`. A read token cannot push. |
| File size bound | A 34 MB blob is refused ("larger than 32 MiB"). A 30 MB blob is accepted. Cloudflare documents the same bound for production. |

The create token is not single-use: it cloned and pushed twice. dap
revokes the token at once, and revocation works, so the difference does
not reach dap.

A standard git client cloned and pushed over the simulator's remote with
the same `Authorization: Bearer` header that `ArtifactsProvider` sends.

## What does not match

- **The remote URL.** The simulator answers with
  `http://127.0.0.1:<port>/git/<namespace>/<name>.git`. dap builds
  `https://<service>/git/<namespace>/<name>.git` in two places
  (`artifacts-host.ts:380`, `site/token-reuse.ts:107`) and compares
  the binding's answer with it. A local run fails that comparison until
  dap takes the remote's scheme and host from configuration.
- **No REST API, SSH, LFS or push events.** dap uses none of them.
- **The pinned test pool.** `@cloudflare/vitest-pool-workers` 0.22.0
  keeps the remote default even with `"remote": false`, and stops for an
  API token. The pool package is deprecated, and its last version is
  0.23.0. `@cloudflare/vitest-plugin` 1.8.3 runs the binding locally, and
  the probe's test needed only its import changed.

The simulator is faithful for every binding call dap makes. It is not a
drop-in: dap's remote URL rule and its test pool both block it today.

## Cost

Measured with wall-clock timers in the probe, not in dap's suite. The
second run's host had a load average near 5.5, and its numbers are the
ones in `timing.txt` and the Vitest output:

| Measure | First run | Second run |
| --- | --- | --- |
| `wrangler dev` start to first answer, cold | 1.08 s | 1.75 s |
| `wrangler dev` start to first answer, warm | 0.81 s | 1.78 s |
| create, clone, commit, push, revoke, delete from a shell, five runs | 0.70 to 0.81 s | 1.33 to 1.44 s |
| create to delete inside workerd | 131 ms | 313 ms |
| the whole Vitest run of that one file | 1.26 s | 1.53 s |

The simulator's Git port changes with a new state directory, and stays
on a restart over the same directory.

## Recommendations

1. **Remote URL for local runs only.** Let `ArtifactsProvider` and the
   token-reuse check accept an `http://127.0.0.1:<port>` remote only
   when the binding is local, through a development or test option.
   Deployed configs keep `https://<service>` and cannot name `http`. The
   check at `token-reuse.ts:107-109` is the proof that the binding
   answers for the expected host, so the head adds a red: a deployed
   config that names an `http://` remote is refused.
2. **The wrangler pin, in its own head.** Move the pin from 4.147.0 to
   4.163.0, the version probed. `package.json` runs `deploy:scope` and
   `deploy:home` through the pin, and `scripts/deploy.mjs` uses it, so
   the next deployment bundles with the new wrangler. That deployment
   needs the usual smoke check and Durable Object rate read.
3. **`remote: true` off the development path.** After steps 1 and 2, drop
   `"remote": true` from the six room configs, so that `wrangler dev`
   uses local repositories. `remote` affects only local development, so
   deployments do not change. Rewrite `docs/self-host-cloudflare.md`
   line 71 to say that local development uses a local repository store
   and never the live namespace.
4. **One workerd scenario over the real local binding.** Move the five
   packages that use the deprecated pool (`packages/scope`,
   `packages/mcp`, `packages/cli`, `apps/room/page`, `apps/room/lanes`)
   to `@cloudflare/vitest-plugin` 1.8.3 or later in one head. Then add
   one scenario to the existing workerd project: create a room
   repository, push an archive pack through `ArtifactsProvider`, read it
   back, and delete it. The probe's 131 to 313 ms suggests that the
   scenario fits the test-overhead budget in `docs/testing.md`. The head measures
   it in dap's suite and states the number.

Steps 1 to 3 are small. Step 4 touches the test tooling of five
packages, so it needs its own full gate.
