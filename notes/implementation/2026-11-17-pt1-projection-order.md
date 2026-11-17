# One parameter order for the application projection

PT-1 (request `61a14dcd`) makes two small corrections left from GW-1 and
SH-2/SH-3.

## The projection parameter order

The room's projection parser
(`packages/scope/src/applications/projection-wire.ts:6`) reads only
`?p=…&atLeast=…`. The application gateway
(`packages/client/src/application-gateway.ts`) allowed either order on
`application-projection`, so it passed `?atLeast=…&p=…` and the room then
refused that request with `invalid-query`. Nothing leaked (checker, approval
`148cb9d2`), but the two rules disagreed.

The planner ruled that one order holds everywhere (ruling `91a20732`). The
gateway now requires `p` as the first query key on `application-projection`
and refuses the other order before the room sees it. The room's parser does
not change. Every client already sends `p` first:
`packages/client/src/http.ts:132` builds `?p=…`, and `minimumPath` appends
`atLeast`.

This changes runtime bytes in the gateway:

- The security seal of `packages/client/src/application-gateway.ts` in
  `scripts/security-entry-points.test.mjs` moves from `738c72e3` to
  `7745e620`, the value that the owner prints for the reviewed source.
- The open pages that bundle the gateway get new presentations, adopted in
  their release identifiers. Open Lending 0.6.0 moves from `1b40301d` to
  `sha256:db139b7398bda6dc5562e4904023e8c067a348c59807d8ad816180dc8cad6180`.
  Open Counter 0.7.0 moves from `36945f1d` to
  `sha256:9d6995c8523ea6e59cbd3dfb4694501fdfe7420ee8e0d59f5e839f9a6529a300`.
  No signed release changes.
- The planner deploys the room Workers and the sandbox after landing.

## The sandbox comment

The comment above `SCREEN_HOSTS` in `apps/sandbox/wrangler.rollout.jsonc` now
names the confirmed items: Grow item 2, Lending item 2 in both Lending rooms,
and Counter item 20. The SH-2 and SH-3 reviews noted that it still said
"item 2" for every screen.

## Tests

`packages/client/test/application-gateway.test.ts` adds a case: the gateway
refuses an `application-projection` read with `atLeast` before `p`. The named
red runs this case against the rule that allowed either order.
