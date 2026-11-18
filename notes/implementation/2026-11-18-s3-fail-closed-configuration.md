# S3: configuration that fails closed

S3 (request `066684ef`, promise `4d718dcc`) closes four findings of the
attack-surface review `79daff0f` (report sections 2.1, 2.3 and 2.4). Each
finding is a setting whose absence or disagreement opened a path that the
operator did not choose.

## 2.1: the self-host template names its deployment

A Worker with no `DEPLOYMENT` counts as local, and a local Worker admits any
parentless creation (`packages/scope/src/creation-admission.ts`). The
self-host template `apps/room/wrangler.jsonc` set no `DEPLOYMENT`, and the
self-host guide sent `DEPLOYMENT` as a secret after the first deploy. Between
the deploy and the secret, anyone could found a directory on the new Worker.
The review's witness `trace4.mjs` showed this with the template's settings.

- The template sets `vars.DEPLOYMENT` to `dap-self-host`. A Worker with
  `DEPLOYMENT` and no register pin refuses every creation.
- `docs/self-host-cloudflare.md` step 1 tells the operator to set
  `vars.DEPLOYMENT` to the Worker name. Step 4 sends only `SESSION_SECRET`.
  `docs/deploy.md` gives the same order.
- Test: `creation-admission.test.ts`, "the self-host template's settings
  refuse a directory found before its register pin". The test reads the
  template's `vars` and calls `parentlessCreationAdmission` with them.

Local `wrangler dev` of the unchanged template now refuses parentless
creation. A developer sets `ALLOW_OPEN_CREATION` or removes `DEPLOYMENT`
for a local run.

An operator who already stores `DEPLOYMENT` as a secret deletes that secret
before deploying the template, so that only the var names the deployment.

## 2.3: `/health` names the policy and the missing settings

`/health` showed whether sessions and the register work, but not whether
the Worker admits open creation, serves hosted MCP or reads the index in
register mode. The body gains two members:

- `policy`: `index` (`enforce`, `register` or `invalid`), `mcp` (`open` or
  `closed`) and `openCreation` (true when `DEPLOYMENT` is unset or
  `ALLOW_OPEN_CREATION` is `true`).
- `missing`: the names of absent settings that a deployed Worker needs:
  `DEPLOYMENT`, `SESSION_SECRET`, and `REGISTER_SCOPE` when neither
  `REGISTER_SCOPE` nor `ARTIFACTS_CONFIG` is set.

Neither member shows a value or changes the status.
`docs/operations.md`, `docs/operate-a-service.md` and
`docs/security/settings.md` describe them. `scripts/deploy-check.mjs` reads
at most 4,096 bytes of the body; the body stays under 1 KB.

Tests: `health.test.ts`, the two existing exact-body assertions and
"health names its index mode, hosted MCP and open creation, and the settings
a deployment still lacks".

## 2.4(a): the GitHub root must be an installed register

`REGISTER_SCOPE` pins the register for creation. `GITHUB_APP_CONFIG` names
the register that the GitHub host serves. When the two differed, the GitHub
host served a root that the operator never installed on this Worker.

`readInstalledRegisters` (`packages/scope/src/register-setting.ts`) now
returns `misconfigured` when a valid `GITHUB_APP_CONFIG` names a root that
is neither the pin nor listed in `INSTALLED_REGISTER_SCOPES`. Creation
refuses and `/health` reports `register: unavailable` with status 503. An
unparseable GitHub setting still leaves the GitHub host off and selects
nothing.

The GitHub configuration parser moves from `github-wiring.ts` to a new
module, `packages/scope/src/github-config.ts`. Register selection reads it
there, and the CLI, which imports register selection, builds without the
Worker's GitHub wiring. `github-wiring.ts` re-exports the parser unchanged.

Ruling `e6fd1f7f` chose this refusal. The planner checked the live Workers
first: none holds `GITHUB_APP_CONFIG`, so the refusal stops no deployed
Worker. `docs/deploy.md` names the operator step: list an older GitHub root
in `INSTALLED_REGISTER_SCOPES` before deploying.

Tests: `creation-admission.test.ts`, "Register selection is host-independent
…", and the rewritten case in `health.test.ts` that an older hosted room
with an unlisted GitHub root is unavailable, and available once the root is
listed.

## 2.4(b): the Mac kit leaves hosted MCP closed

`prepare-project.mjs` wrote `MCP_ENABLED: "true"` into every new Mac
project, and `deploy.py` refused a project without it. Hosted MCP opens only
on the exact value `true` (`packages/mcp/src/hosted-tools.ts`).

- `prepare-project.mjs` writes neither `MCP_ENABLED` nor
  `MCP_TOOL_ADDITIONS`.
- `deploy.py` and `prepare-github.mjs` accept both unset, or
  `MCP_TOOL_ADDITIONS` alone as `"[]"`, or the earlier pair `"true"` and
  `"[]"`. They refuse any other value.

Tests: `test_deploy.py`, `test/prepare-project.test.mjs` and
`test/prepare-github.test.mjs`.

## 2.4(c): celld trusts the caller address only from its proxy

On a Mac host, Caddy sets `CF-Connecting-IP` and proxies to celld on
`127.0.0.1:28900`. Any local process could call that port with its own
`CF-Connecting-IP` and choose the caller address that the Worker reads.

- The installer writes a per-install token to `private/proxy-token` (32
  random bytes, base64url, mode 0600, owned by the service user).
- The Caddy service reads the token into Caddy's environment. The Caddyfile
  sends it as `X-Dap-Proxy-Token`. `header_up` replaces any value that a
  client sends in either header.
- The Caddyfile sets `admin off`. Caddy's admin API on `localhost:2019`
  would otherwise give any local process the adapted configuration, token
  included. The kit does not use the admin API.
- `deploy.py` passes the token to the Worker as `CELLD_PROXY_TOKEN` through
  a private staged copy of the project (directory 0700, files 0600). The
  operator's project stays unchanged.
- `packages/scope/src/caller-address.ts` rewrites the request at the two
  entry points, `packages/scope/src/worker.ts` and `apps/room/fetch.ts`.
  With `CELLD_PROXY_TOKEN` set, the Worker removes the token header, and it
  removes `cf-connecting-ip` unless the token matches. The comparison runs
  in constant time. With the setting unset, as on Cloudflare, the request
  passes unchanged. Every later reader, including the hosted MCP Durable
  Object, sees only an admitted address.

A Mac host installed before this change has no token file, so `deploy.py`
and the Caddy service refuse it. The owner reinstalls under a new prefix
(ruling `7d2ec9f8`; no kit install serves rooms today).

Tests: `caller-address.test.ts`, `test_install.py` (token helpers and the
rendered Caddyfile) and `test_deploy.py` (the staged project). No test runs
Caddy or `install()` itself, which needs sudo.

## Evidence

Each red runs the S3 tests against the base `782fa2b4`. Files are in
`artroom-evidence/2026-11-18-s3-red/`.

| Run | Result | File | SHA-256 |
|---|---|---|---|
| Health and admission, base source | 5 of 10 fail | `policy-red.txt` | `df343080ac08d5d30b0d34627b8632d40fcf13a4ec9146652e016268f00ac87d` |
| Health and admission, S3 source | 10 pass | `policy-green.txt` | `1a012a013e92a165146ddb1d9c5d11a5941205b21b4e59a5586eb4058b481687` |
| Mac kit Python, base | 1 failure, 4 errors | `kit-python-red.txt` | `81e76f4f03d69c0a82104e752982e1cff38acfec29b723b7ba070e772ca806c0` |
| Mac kit Python, S3 | 20 pass | `kit-python-green.txt` | `a41e1969b9dd0af04b06086e73ad08774983d5e41e938f59263d0a78e81aaf2a` |
| Mac kit Node, base | 3 of 16 fail | `kit-node-red.txt` | `c499015f653da6204f269ba350b9240f4897f5acc433ad361f092ee5ab5f0a6c` |
| Mac kit Node, S3 | 16 pass | `kit-node-green.txt` | `b08f9ff47b5e9b477506bea358a3b6ad896f853984a2a2cf6fe4d3176af2feef` |
| Caller address, base | module missing | `address-red.txt` | `fdec159337ad1be2626928bc1484eaacaa69694690625f0742b8286090261edf` |
| Caller address, S3 | 1 pass | `address-green.txt` | `265aa2b2ce1c89a23c0993ec504b9183155d663f344cb49ceb2476d05ee28bb7` |

The caller-address red fails because the module is new; it shows no
behavior of the base. The `admin off` assertion joined `test_install.py`
after its red was recorded; that test was already red, and the base
Caddyfile has no `admin off` line.

## After deployment

Read `/health` on each deployed Worker. `missing` is `[]`, `policy.index`
matches the Worker's `SCOPE_INDEX_MODE`, and `policy.openCreation` is
`false` on every deployed room Worker.
