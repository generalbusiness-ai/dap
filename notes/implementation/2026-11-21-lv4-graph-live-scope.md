# LV4 graph: a live scope in the package graph

This note covers LV4-G (request `bcde5286`), the graph part of head LV4
of the [live level note](../2026-11-10-live-level.md), sections 3.8 and
8, as its own head. The tool part (the app-only MCP tool, the client
call and `dap act`) stays with LV4 (request `627719c9`) and follows LV3.

## What changed

- `definitionLevel` in `packages/package-graph/src/model.ts` reads the
  level that a definition pins. An absent level is `recorded`.
- Each row of `PackageGraphReport.instances` now carries `level` beside
  `definition` and `maximum`. The graph report names every live scope of
  the package.
- `packagePorts` in `packages/package-graph/src/ports.ts` refuses a
  `tell` or `relate` whose connected endpoint is a live definition. It
  does not then look for a handler, so the send has one finding:

  | Field | Value |
  |---|---|
  | check | `port-typing` |
  | reason | `send-to-live` |
  | row | the send, for example `acts.count-tally.sends.0` |
  | message | `The connected definition is live. A live scope admits no message after its creation.` |

- `PackageCheckReason` gains `send-to-live`.
  `docs/package-reference.md` names the refusal and the level in the
  report.
- A `create` send to a live definition stays valid. The genesis result
  of the live child is the creation result, as section 3.1 states.

## Generated output and open versions

The room page and the Lending and Counter presentations bundle the
package graph. `node apps/room/page/scripts/assets.mjs` rebuilt
`apps/room/page/assets.ts`. The presentation identifiers of the open
versions Lending 0.7.0 and Counter 0.8.0 changed, and their
`release-identifiers.json` files record the new identifiers. No signed
version changes.

## Witnesses

The fixture `liveTallyData(tell, live)` in
`packages/derive/test/definition-corpus/package-graph-variants.ts` adds a
Tally child to the Grow package. The Tally is `liveBase(live)` from
`live-data.ts`. The Site gains a `tally` item and a `create-tally` act.
With `tell`, the Site also gains a `count-tally` act that tells the Tally
through the endpoint that the applied creation result wrote. Every
definition passes native validation, and the definition corpus registers
each one.

The test `a package with a live child passes, and a send to the live
child refuses send-to-live alone` in
`packages/platform/test/package-graph.test.ts` holds three cases:

| Case | Input | Expected |
|---|---|---|
| A package with one live scope passes | `liveTallyData(false)` | no findings; the Tally's instance row has level `live` |
| A package that sends to its live scope is refused | `liveTallyData(true)` | one finding, `send-to-live`, at `acts.count-tally.sends.0` |
| Control: the same package with a recorded Tally | `liveTallyData(true, false)` | one finding, `unknown-message` |

## The control

A package that sends to a recorded target and passes cannot be built in
the current graph. A handler must pin its sender's digest (`wrong-peer`),
and the Site's `create` send already names the Tally's digest, so a
Tally handler cannot pin the Site. Every in-package message today goes
from a child to its creator, as Grow's Room relates to its Site, and a
live scope never creates.

The control therefore changes only the Tally's level. The recorded Tally
gets `unknown-message` and not `send-to-live`, so the refusal follows the
level. Grow's baseline package is the case of a send to a recorded target
that passes. The planner accepted this control (ruling on `d88f7bcb`,
point 2, in request `bcde5286`).

## Other findings

- `stagedFindings` refuses a sequenced definition only when `level` is
  the string `"sequenced"`. The contract writes the level as
  `{ name: "sequenced", version: 1 }`, so this check does not give a
  natively valid sequenced definition the `unsupported-form` refusal
  that `docs/package-reference.md` describes. This head leaves that
  check as it is.
- `projectedUse` counts a live scope's entries as it counts a recorded
  scope's. A live scope keeps only its two creation entries, so the
  ceiling stays an upper bound.
