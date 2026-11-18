# LA-1: a local Artifacts remote for development and tests

LA-1 is step 1 of `notes/2026-11-18-local-artifacts-simulator.md`. The local
Artifacts simulator answers each repository's remote as
`http://127.0.0.1:<port>/git/<namespace>/<name>.git`. dap built every
remote as `https://<service>/git/<namespace>/<name>.git` and refused a
binding that answered any other remote. This head adds a local option that
accepts the simulator's remote. Deployed configs keep `https://<service>`.

No Wrangler config, pin, package file or deployment changes.

## The change

- `artifactsLocalOrigin` (`packages/scope/src/artifacts-host.ts:112`)
  admits one origin text: `http:`, host `127.0.0.1`, an explicit port, and
  no user, password, path, query or fragment. It refuses `[::1]`: the Git
  transport's `local` mode (`packages/git/src/names.ts:47`) admits plain
  HTTP to `127.0.0.1` alone, and LA-1 does not widen that check. The text
  must equal the parsed URL's own `origin`. So `http://127.1:8787`,
  `HTTP://127.0.0.1:8787` and `http://127.0.0.1:8787/` are refused, because
  the parser folds each one into another spelling.
- `ArtifactsProviderOptions.localOrigin`
  (`packages/scope/src/artifacts-host.ts:63`) is optional. The constructor
  (`artifacts-host.ts:127`) sets the origin to `https://<service>` without
  it. With it, the constructor sets the checked local origin, or throws.
  `#remote` (`artifacts-host.ts:400`) builds every remote from that origin.
  So every identity check, transport and creation check uses one origin.
  With the option, `#transport` (`artifacts-host.ts:402`) also asks the Git
  client for the `local` transport.
- `SiteTokenReuse` takes a sixth constructor argument
  `{ localOrigin?: string }` (`packages/scope/src/site/token-reuse.ts:48`).
  It applies the same check, and throws `Site local origin` on a bad value
  (`token-reuse.ts:50-51`). The expected remote at `token-reuse.ts:113`
  uses the local origin when one is set, else `https://<host>`.

The option replaces the origin. It does not widen the check: with the
option set, the binding must answer for the local origin, and an
`https://<service>` answer is refused.

## Why deployed configs cannot use it

- The only configuration parser, `artifactsConfiguration`
  (`packages/scope/src/artifacts-wiring.ts:49-50`), accepts exactly five
  fields and checks `host` with `artifactsService`, a hostname rule. A
  scheme, a colon or a port fails that rule, so a config that names
  `http://127.0.0.1:8787` is `invalid-config`. A sixth field such as
  `localOrigin` fails the exact-field check.
- The deployed construction sites pass explicit fields and never spread a
  config or an environment into the options:
  `artifacts-wiring.ts:112`, `artifacts-wiring.ts:151`,
  `apps/room/archive.ts:43` and `packages/scope/src/worker.ts:153`. None
  names `localOrigin`. A test reads these four sources and fails if one does.
- No environment variable turns the option on. Only code passes it.

Step 3 of the design note drops `"remote": true` from the room configs.
That head must decide how `wrangler dev` passes the option. This head
gives it no route from configuration.

## Tests

All tests are in the `scope` project. The binding and the Git endpoint are
scripted stand-ins.

| Test | Shows | On main `9255e1f8` |
| --- | --- | --- |
| `artifacts-host.test.ts` "red: a deployed Artifacts config cannot name an http remote…" | A config naming `http://127.0.0.1:8787`, `http://[::1]:8787`, `127.0.0.1:8787`, `http://service.invalid` or `https://service.invalid` is `invalid-config`; an extra `localOrigin` field is refused; `service` cannot name `http`; without the option the provider refuses a loopback or `http://other-host` remote before any token, and a creation at that remote is no answer. | Passes: guards the existing refusal. |
| `artifacts-host.test.ts` "green: the local option accepts the simulator's loopback remote…" | With `localOrigin`, reads go to the loopback remote and a creation answers; an https answer is then refused. Under the option, `http://example.com:8787`, `http://127.0.0.1.evil.test:8787`, userinfo, a path, a query, a fragment, no port, port 80, `localhost`, `[::1]`, `127.1`, `https://127.0.0.1:8787` and the empty text are each refused. Without the option, `https://<service>` is unchanged. | Fails: `artifactsLocalOrigin` is not exported, and the provider ignores the option. |
| `artifacts-host.test.ts` "no deployed wiring passes the local option" | The four deployed construction sources do not name `localOrigin`. | Passes: guard. |
| `site-token-reuse.test.ts` "Site token check refuses the simulator's loopback remote without the local option…" | Without the option, a loopback or `http://other-host` answer is `provider`/`info` with no mint; a config naming `http://127.0.0.1:8787` is `invalid-config`. With the option, the loopback answer mints; an https answer is refused; bad origins throw. | Fails: the option is ignored. |

## Evidence

Files are in `artroom-evidence/2026-11-18-la1-red/`. Each run is
`npx vitest run --project scope artifacts-host site-token-reuse`.

| Run | Result | File | SHA-256 |
| --- | --- | --- | --- |
| LA-1 tests, base source (`9255e1f8`) | 2 of 22 fail: the two option tests | `red.txt` | `53fe2c5d098fecfa9145cdcfdc420c00b71bc26cabcb1a671c2be3058ec4f7c5` |
| LA-1 tests, LA-1 source | 22 pass | `green.txt` | `9ece0a95b48f7f95cd73f846d740ac43d4f07d2d18809dbc541b8501f1ce46dc` |

The seals of `artifacts-host.ts` and `site/token-reuse.ts` in
`scripts/security-entry-points.test.mjs` move to the reviewed source.
The gate runs on the committed head; its START and END acts name
`artroom-evidence/2026-11-18-la1-gate/`.
