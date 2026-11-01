# Run the local Worker

Run the production room Worker on your machine with celld, the runtime
release named in [`celld.version`](../apps/room/celld/celld.version). You
need Node 26 and the checkout's locked dependencies.
[`apps/room/celld/wrangler.json`](../apps/room/celld/wrangler.json)
configures the local Worker `dap-celld-local`, separate from the deployed
`artroom-scope`. It keeps the four Durable Object bindings and all three
migration tags of the room configuration. It has no Git host, no
application content bucket and no committed secret.

To run persistent services with HTTPS on one Mac, follow
[Run on a Mac](self-host.md#run-on-a-mac).

1. Obtain the release named in
   [`celld.version`](../apps/room/celld/celld.version). Verify its GitHub
   release attestation. Put the executable outside the checkout.
2. Add the checkout's `node_modules/.bin` to `PATH` for the existing esbuild.
3. Create a private CLI directory and plan a `--host none` install. Keep
   the plan.

   ```sh
   export PATH="$PWD/node_modules/.bin:$PATH"
   export DAP_HOME="$(mktemp -d)"
   PHASE=plan BASE=http://127.0.0.1:9876 node scripts/celld-smoke.mjs
   ```

4. Create `apps/room/celld/.dev.vars` with mode `0600`. Set
   `REGISTER_SCOPE` to the printed register ID. Generate a `SESSION_SECRET`
   of at least 32 bytes directly into this private file. Keep its value out
   of shell history and logs. The project already sets `DEPLOYMENT` and
   enforce-mode indexing. Keep the original plan and the CLI directory.
5. Start the pinned runtime in another terminal.

   ```sh
   /absolute/path/to/celld dev apps/room/celld --port 9876 --logs --no-watch
   ```

6. Run the smoke test once against this direct loopback listener.

   ```sh
   PHASE=run BASE=http://127.0.0.1:9876 CELLD_LOCAL_NO_PROXY=1 node scripts/celld-smoke.mjs
   ```

The smoke test installs the planned register, creates one unpublished room,
makes member acts, joins a second member, verifies the journals and reads
the register's readiness. Its output holds public metadata only. A failed
run keeps its original requests and refuses a second run in that
directory. Inspect that state before you decide how to reconcile it. Do not
discard an uncertain operation or replace it with a new plan.

The local runtime keeps state in `.celld/dev` across restarts. Do not use
`--clean` on state you need. The flags and the private variable file follow
the [celld documentation for v0.6.3](https://github.com/denoland/celld/blob/v0.6.3/docs/README.md#develop-an-application-locally).
The local runtime has no backup or recovery.

## Exercise service identity behind a proxy

When a proxy sends internal HTTP to the Worker, set `PUBLIC_ORIGIN` to the
exact public HTTPS origin. The setting is not secret. When it is unset, the
Worker uses the request URL's origin. An invalid value closes the features
that need the origin. Neither `Forwarded` nor `X-Forwarded-*` supplies
service identity. The proxy must supply the trusted client address.
`CELLD_LOCAL_NO_PROXY=1` is only for the direct loopback smoke test above.

Run the proxy test with the pinned executable:

```sh
CELLD_BIN=/absolute/path/to/celld node scripts/test-celld-proxy.mjs
```

The script creates a temporary TLS proxy with a test CA for each client
and forwards to the local celld Worker. It keeps its own private runtime
configuration and CLI custody. It checks signed MCP creation,
initialization, a room tool, bearer rotation and retirement. Then it checks
that the Worker refuses a request with no origin setting and a request
that names its origin only in forwarded headers. It stops its processes and
keeps its private test state for inspection. It installs no trust
globally. It is not a production proxy, TLS profile, supervisor or drain
procedure.

The [CI workflow](../.github/workflows/celld-smoke.yml) downloads the pinned
release, verifies its attestation and runs the same script.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [apps/room/celld/wrangler.json](../apps/room/celld/wrangler.json), [apps/room/celld/celld.version](../apps/room/celld/celld.version), [scripts/celld-smoke.mjs](../scripts/celld-smoke.mjs), [scripts/test-celld-proxy.mjs](../scripts/test-celld-proxy.mjs), [packages/scope/src/public-origin.ts](../packages/scope/src/public-origin.ts).
The commands on this page were not run for this revision.
