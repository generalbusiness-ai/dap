# Self-hosted application screens

Status: proposed, for Hugh's decision. Request SH-1. Nothing here is built.
Hugh decided on 17 November 2026 that self-hosted rooms serve their own
application screens, unless the requirements are onerous. Section 4 lists
the requirements.

## Scene

An operator runs a room on a Mac with the host kit: Caddy, celld and
SeaweedFS, one name such as `room.example`. The operator installs Counter.
`dap application` prints the screen URL
`https://room.example/applications/<directory>/<item>/<presentation>/`.
The browser opens it and gets 404. The room never serves package script on
its own origin: `applicationPage` only redirects to a configured screen
origin (`packages/scope/src/applications/route.ts:115-126`), and the
celld project fixes `APPLICATION_SCREEN_HOSTS` at `[]`
(`apps/room/celld/wrangler.json:9`).

With SH-1, the operator adds a second name, `screens.room.example`, to the
certificate and to Caddy, and lists the installation's screen descriptor
when deploying. The printed URL then redirects to
`https://screens.room.example/applications/...`, and the same celld
process serves the screen there. No new process starts.

## 1. The screen origin

The operator chooses one DNS name per installation, for example
`screens.room.example`. The name must:

- resolve to the Mac on every device that opens the screen;
- appear as a subject alternative name in the certificate that Caddy uses;
- appear in the `hosts` list of `dap-host.json`
  (`apps/room/celld/mac/kit.py:24`, `:115-121`).

The kit renders every `hosts` entry into the one Caddy site
(`apps/room/celld/mac/templates/Caddyfile:6-10`). That site already proxies
to celld on loopback, keeps the `Host` header, and sets
`CF-Connecting-IP` from the connection. So the screen name needs no new
Caddy template. A request with any other name matches no site.

`.local` names need care. macOS mDNS answers only the Mac's own one-label
name, so `screens.room.local` does not resolve by itself. The operator uses
a DNS record or a hosts-file entry on each device.

**Parser change.** `isApplicationSandboxOrigin`
(`packages/client/src/application-gateway.ts:19-21`) admits only
`https://<label>.inguz.space`. `readApplicationScreenHost` (`:23-31`)
calls it for every descriptor, in the room, in the sandbox Worker and in
the browser. SH-1 keeps that function and adds a second rule:

- `isSeparateScreenOrigin(screen, room)`: `screen` is an exact `https:`
  origin with a DNS hostname (no IP literal, no port), and its hostname
  differs from the room's hostname.

`readApplicationScreenHost` admits a descriptor when either rule holds.
The existing check that `roomOrigin` differs from `screenOrigin` (`:28`)
stays.

**Browser change.** The screen script bundles the client.
`loadApplicationScreenContext` fetches `/_application-host` only on an
`inguz.space` origin (`packages/client/src/application-screen.ts:25-30`).
On any other origin it reads the context as if the page were on the room
origin, and the context check then fails. SH-1 fetches the descriptor on
every `https:` origin. A 200 answer must parse and name this page's origin,
as today. A 404 keeps the present same-origin path. Any other answer fails
closed. The descriptor comes from the origin that served the script, so the
browser trusts it no more than the script itself.

A screen release signed before SH-1 carries the old client. It cannot open
on a self-hosted screen origin. The first Counter and Lending releases
built after SH-1 can.

## 2. What serves the screen bytes

The hosted sandbox Worker (`apps/sandbox/worker.ts`) reaches each room
Worker through the `ROOM`, `GROW` and `LENDING` service bindings
(`apps/sandbox/wrangler.jsonc:12-16`). It calls four methods of
`ApplicationScreenService` (`packages/scope/src/worker.ts:839-880`):
`screenHost`, `screen`, `native` and `nativeStream`.

A celld fleet cannot repeat that shape. One fleet runs one application, and
celld does not document `WorkerEntrypoint` service bindings
([self-hosting note](2026-10-19-self-hosting-on-celld.md), section 2 and
section 3). A second fleet for the sandbox would need its own bucket,
process and lease, and an HTTP form of the four methods that public
dispatch must never expose. SH-1 does neither.

Instead, the celld entry serves both names from one Worker:

1. `apps/room/celld/worker.ts` (now two re-export lines) gains a `fetch`
   that reads the request host. When the host equals the hostname of one
   `APPLICATION_SCREEN_HOSTS` descriptor, it rebuilds the URL on that
   descriptor's `https:` screen origin and calls the sandbox handler.
   Every other host goes to the unchanged room `fetch`
   (`apps/room/fetch.ts`).
2. The sandbox handler receives a synthesized environment:
   `SCREEN_HOSTS` maps each room descriptor to service `ROOM`, and `ROOM`
   is an in-process object with the four methods.
3. `packages/scope/src/worker.ts:839-880` moves the four method bodies into
   a plain factory, `applicationScreenService(env, ctx)`. The factory
   returns a plain `{ close }` lifetime. `ApplicationScreenService`
   delegates to the factory and wraps the lifetime in
   `ApplicationStreamLifetime`, so its RPC surface does not change.

**Does the sandbox code run unchanged?** Yes. `apps/sandbox/worker.ts`
runs as an imported module with no edit. Its descriptor pin
(`:52-53`) compares the room's setting with itself, because both ends read
one environment. Its route checks, header filter, `set-cookie` removal and
stream cleanup run as on Cloudflare. The smallest change is outside it: the
factory extraction in `packages/scope/src/worker.ts` and the host dispatch
in `apps/room/celld/worker.ts`.

## 3. Isolation

The screen origin and the room origin are different browser origins.
SH-1 keeps these properties:

- **No room cookies.** No room route sets a cookie. The sandbox removes
  `set-cookie` from every answer (`apps/sandbox/worker.ts:101-102`).
- **No room keys.** The room page keeps device keys in its own origin's
  storage. A script on `screens.room.example` cannot read it. A screen
  enrols its own device key, bound to the room by
  `applicationDeviceIdentity`.
- **No room routes on the screen origin.** The host dispatch runs before
  any room route. On a screen host, the sandbox admits only the
  descriptor, the pinned screen path, and the native read and act routes
  of `applicationGatewayRoute` (`application-gateway.ts:39-78`). The page,
  OAuth, MCP, demo and brand routes answer 404 there.
- **No ambient authority on byte requests.** The sandbox drops
  `authorization` from screen byte requests (`apps/sandbox/worker.ts:58-61`).
  The screen's content policy sets `connect-src 'self'`.
- **The room judges every act.** Forwarded native requests reach the
  room's own parsers, session checks and membership gates.

**Hosted behavior.** The hosted sandbox Worker keeps its route
`*.inguz.space/*` and its bindings, so no other name reaches it. Hosted
room entries do not import `apps/room/celld/worker.ts`. On an
`inguz.space` page the browser fetches the descriptor as today. The wider
parser admits more descriptors, but each hosted configuration names only
`inguz.space` origins. A new check in `scripts/deploy-smoke.test.mjs`
keeps every tracked hosted descriptor inside `isApplicationSandboxOrigin`.

## 4. Owner steps and work size

### Owner steps, existing fleet

1. Choose one screen name per installation, for example
   `screens.room.example`.
2. Make the name resolve to the Mac: add a DNS record, or add a hosts-file
   entry on each device.
3. Make a new certificate that names the room name and the screen name.
   Use new file paths. `certificate.sh` does not overwrite files.
4. In `dap-host.json`, add the screen name to `hosts`, and set the new
   certificate and key paths.
5. Run the kit's new `reconfigure` command with `sudo`. It renders the
   Caddy file and host configuration again and restarts Caddy only.
6. On each device that trusted the old self-signed certificate, compare
   the new fingerprint and trust the new certificate. Skip this step for
   a certificate from a public issuer.
7. Install a Counter or Lending release built after SH-1.
8. Copy the directory, item and presentation from the screen URL that
   `dap application` prints. Write them, with both origins, to a screen
   host file.
9. Run the new `stage-screens.mjs` helper. It copies the private project
   to a new directory with the screen host setting and the celld entry.
   It keeps the session secret.
10. Deploy the new project with `deploy.py`.
11. Open the printed screen URL. Confirm that it redirects to the screen
    name and that the screen opens.

A new installation folds steps 3 to 5 into the first install and step 9
into `prepare-project.mjs`. New processes: none. Caddy, celld and
SeaweedFS stay one process each. A `.local` alias through `dns-sd -P` would
add one process per name. SH-1 does not provide it.

### Source changes

| Change | Files | Lines, about | Tests |
|---|---|---|---|
| `isSeparateScreenOrigin` in `readApplicationScreenHost` | `application-gateway.ts` | 15 | `application-gateway.test.ts`: admit `screens.room.example`; refuse same host, IP, `http:`, port; `inguz.space` unchanged. 30 lines |
| Descriptor fetch on every `https:` origin | `application-screen.ts` | 10 | `application-gateway.test.ts`: 200 binds, 404 keeps same-origin, 503 fails. 25 lines |
| `applicationScreenService` factory | `packages/scope/src/worker.ts` | 40 moved, 15 new | Existing `application-sandbox.test.ts` covers the class unchanged |
| Host dispatch in the celld entry | `apps/room/celld/worker.ts` | 35 | New workerd test: bytes and an act on the screen host; room routes 404 there; room host unchanged; no `set-cookie`. 90 lines |
| Screen host setting in prepare and deploy; entry path | `prepare-project.mjs`, `deploy.py`, `application-settings.mjs`, new `stage-screens.mjs` | 80 | `test_deploy.py`: admit a checked setting whose `roomOrigin` is `PUBLIC_ORIGIN`; refuse others. 50 lines |
| `reconfigure` command | `kit.py`, `install.sh` | 45 | `test_install.py`: renders, keeps data, restarts only Caddy. 40 lines |
| Pins and documents | `security-entry-points.test.mjs`, `celld-smoke.test.mjs`, `deploy-smoke.test.mjs`, `docs/self-host-mac.md`, `docs/security/entry-points.md` | 60 | The pins are tests |

Total: about 11 files, 240 source lines, 235 test lines and 50 lines of
documentation. One builder head, then one fleet witness. Separately, the
publisher signs new Counter and Lending releases with the changed client,
and each raises its minor version.

## Open questions

- celld v0.6.3 must build `request.url` from the `Host` header that Caddy
  sends. The code does not show this. The fleet witness checks it first.
- Hugh decides whether a DNS record or hosts-file entry per device is
  acceptable for `.local` rooms, or whether the kit must publish an mDNS
  alias.
