# Run the local Worker

Run the production room Worker with the celld release named in
[`celld.version`](../apps/room/celld/celld.version), Node 26 and the
checkout's locked dependencies. The local project is named `dap-celld-local`,
separate from the deployed `artroom-scope` configuration. It keeps the four
Durable Object bindings and all three migration tags from the room configuration.
It has no Git host, application content bucket or committed secret.

For persistent services and HTTPS on one Mac, use
[Run on a Mac](self-host.md#run-on-a-mac).

1. Obtain the release named in
   [`celld.version`](../apps/room/celld/celld.version). Verify its GitHub
   release attestation. Put the executable outside the checkout.
2. Add the checkout's `node_modules/.bin` to `PATH` for the existing esbuild.
3. Create a private CLI directory and retain the host-none install plan.

   ```sh
   export PATH="$PWD/node_modules/.bin:$PATH"
   export DAP_HOME="$(mktemp -d)"
   PHASE=plan BASE=http://127.0.0.1:9876 node scripts/celld-smoke.mjs
   ```

4. Create `apps/room/celld/.dev.vars` with mode `0600`. Set
   `REGISTER_SCOPE` to the printed register ID. Generate a `SESSION_SECRET`
   of at least 32 bytes directly into this private file. Keep its value out
   of shell history and logs. The project already sets `DEPLOYMENT` and
   enforce-mode indexing. Keep the original plan and CLI directory.
5. Start the pinned runtime in another terminal.

   ```sh
   /absolute/path/to/celld dev apps/room/celld --port 9876 --logs --no-watch
   ```

6. Run the smoke once against this direct loopback listener.

   ```sh
   PHASE=run BASE=http://127.0.0.1:9876 CELLD_LOCAL_NO_PROXY=1 node scripts/celld-smoke.mjs
   ```

The smoke installs the retained plan, creates one unpublished room, makes
member acts, joins a separate member, verifies its journals and reads actual
register readiness. Its output contains public metadata only. A failed run
keeps its original requests and refuses a replacement run in that directory.
Inspect that state before deciding how to reconcile it. Do not discard an
uncertain operation or replace it with a fresh plan.

The local runtime keeps state in `.celld/dev` across restarts. Do not use
`--clean` on state you need. These flags and private variable files follow
the [pinned celld documentation](https://github.com/denoland/celld/blob/v0.6.3/docs/README.md#develop-an-application-locally).
This local exercise establishes no backup or fleet recovery.

## Exercise service identity behind a proxy

Set `PUBLIC_ORIGIN` to the exact public HTTPS origin when the proxy sends
internal HTTP to the Worker. It is nonsecret configuration. An unset value
uses the request URL origin. An invalid explicit value fails closed. Neither
`Forwarded` nor `X-Forwarded-*` supplies service identity. The proxy must
supply the trusted client address. `CELLD_LOCAL_NO_PROXY=1` is only for the
direct loopback smoke above.

Run the kept proxy witness with the explicit pinned executable:

```sh
CELLD_BIN=/absolute/path/to/celld node scripts/test-celld-proxy.mjs
```

This driver creates a temporary test TLS proxy, uses a per-client test CA,
and forwards to the actual local celld Worker. It owns a private runtime
configuration and CLI custody. It checks signed MCP creation, initialization,
a room tool, bearer rotation and retirement, then fresh unset and forwarded-only
origin refusals. It closes its processes and retains private test state for
inspection. It does not install trust globally or provide a production proxy,
TLS profile, supervisor, drain procedure or fleet kit. Those belong to H3 in
the [self-hosting design](../notes/2026-10-19-self-hosting-on-celld.md).

The [CI workflow](../.github/workflows/celld-smoke.yml) obtains the pinned
release, verifies its attestation and runs the same driver. A local pass does
not establish that a remote CI job has run.
