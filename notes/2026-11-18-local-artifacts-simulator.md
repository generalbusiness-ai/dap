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

The probe files are in
`artroom-evidence/2026-11-18-artifacts-simulator-probe`. Every result
below was observed in that run unless it says "documented".

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
| `revokeToken` | `true`, then `false` on a second call; git then refuses the token. A malformed token throws `INVALID_INPUT`. |
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

Measured with wall-clock timers in the probe, not in dap's suite:

- `wrangler dev` start to its first answer: 1.08 s cold, 0.81 s warm.
- One create, clone, commit, push, revoke and delete cycle from a shell:
  0.70 to 0.81 s over five runs.
- The same create-to-delete sequence inside workerd: 131 ms. The whole
  Vitest run of that one file: 1.26 s.

## Recommendations

1. **Remote URL from configuration, and the wrangler pin.** Let
   `ArtifactsProvider` and the token-reuse check take the remote's scheme
   and host from the host options, with `https://<service>` as the
   default. In the same head, move the wrangler pin from 4.147.0 to
   4.163.0, the version probed. This head changes no deployed behavior.
2. **`remote: true` off the development path.** After step 1, drop
   `"remote": true` from the six room configs, so that `wrangler dev`
   uses local repositories. `remote` affects only local development, so
   deployments do not change. Rewrite `docs/self-host-cloudflare.md`
   line 71 to say that local development uses a local repository store
   and never the live namespace.
3. **One workerd scenario over the real local binding.** Move the five
   packages that use the deprecated pool (`packages/scope`,
   `packages/mcp`, `packages/cli`, `apps/room/page`, `apps/room/lanes`)
   to `@cloudflare/vitest-plugin` 1.8.3 or later in one head. Then add
   one scenario to the existing workerd project: create a room
   repository, push an archive pack through `ArtifactsProvider`, read it
   back, and delete it. The probe's 131 ms suggests that the scenario
   fits the test-overhead budget in `docs/testing.md`. The head measures
   it in dap's suite and states the number.

Steps 1 and 2 are small. Step 3 touches the test tooling of five
packages, so it needs its own full gate.
