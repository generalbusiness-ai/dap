# Bind a Counter device to the room's service origin

NF-10 (request `e08158be`) fixes the hosted Counter enrollment that NF-7 runs
3 and 4 stopped. In run 4 (act `c2c171d3`), the join, the session request and
the confirmation read all answered 200. Then the page refused to keep the
enrolled device.

## Cause

An installed screen runs on its own host, for example
`https://counter.inguz.space`. The room's service runs on another origin, for
example `https://dap-lending.inguz.workers.dev`.

- The platform states the service origin in the screen context on purpose.
  `loadApplicationScreenContext` reads the screen-host record and sets
  `context.origin` to its `roomOrigin`.
- `readApplicationInvitation` matches each invitation's service against
  `context.origin`. The context must therefore keep the service origin.
- `installed.ts` binds the enrolled device with
  `applicationDeviceIdentity(context, …)`, so the binding names the service
  origin. The Counter client already uses `identity.origin` as the service
  origin for its transports and its request custody.
- `deviceSigner` checked the binding against `location.origin`, the screen
  host. The device store calls `deviceSigner` when it saves a device, so the
  save threw after every successful hosted join.

No platform change fixes this. A context that named the screen host would make
the page refuse every invitation.

## The change

`deviceSigner(device, origin)` and `privateDeviceStore(origin, installed)` take
the service origin that each binding must name. `main.ts` gives the screen
context's origin on an installed screen, and `location.origin` on the demo
page, which serves the room and the page from one origin. Demo-file import
appears only on the demo page and uses the same value.

## Other screens

Only the Counter made this assumption:

- Lending already binds to the service origin:
  `examples/lending/browser/main.ts:22` sets
  `serviceOrigin = screen?.origin ?? location.origin`.
- `packages/client/src/creation-offer.ts:38` compares an origin with
  `location.origin`, but only the platform room page (`apps/room/page/src/claim.ts`
  and `start-custody.ts`) uses it, and the service origin serves that page.
- Grow has no installed screen.

## Release

This is an open-version change to Counter 0.6.0 on top of NF-9. The open
Counter 0.6.0 presentation in `apps/counter/release-identifiers.json` moves
from `76ad09f8` to
`sha256:905a3f7e088278894937f41bd27bf612bafac9b65fe030dbf0e2e0f584cd444f`. The hosted
fix follows the order of the 0.5.0 move (planner act `c149a886`):

1. The planner signs Counter 0.6.0.
2. A head adds the 0.6.0 trust rows, and the planner deploys it.
3. The planner installs 0.6.0, which assigns a new item.
4. A head moves the `counter.inguz.space` screen row to that item, and the
   planner deploys it.
5. The planner issues invitation 5, and NF-7 run 5 joins through the screen.

## Tests

`apps/counter/browser/device-key.test.ts`: a device bound to a service origin
signs while the page runs on another host, and a check against the page's own
origin or a third origin is refused. The named red runs this case against the
check on `location.origin`.
