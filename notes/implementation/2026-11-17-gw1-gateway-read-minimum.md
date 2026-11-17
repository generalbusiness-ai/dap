# Let installed screens send the read minimum

GW-1 lets the gateway of an installed application screen pass a read's
minimum. Before GW-1, every browser join through an installed screen ended
with "No answer came back that could be trusted", although the room recorded
the join.

## The rule

`applicationGatewayRoute` in `packages/client/src/application-gateway.ts`
decides which room requests an installed screen may send. The browser
transport, the sandbox Worker (`apps/sandbox/worker.ts`) and the scope
Worker (`packages/scope/src/worker.ts`) all call it.

Five reads take a minimum: the summary, `history`, `items`,
`application-projection` and `entries`. On these reads the gateway now
allows one `atLeast` parameter beside the read's own parameters. The value
must be the canonical encoding that `readMinimumParameter` accepts, and it
must name the scope in the path.

The gateway refuses the request in these cases:

- `atLeast` appears twice.
- The value is empty or not canonical.
- The value names another scope.
- Any other parameter appears.
- `atLeast` appears on a read that takes no minimum (`outbox`, `log`,
  `stream`, `query-items`) or on any write.

Each read's own parameters keep their earlier rules.

## Why joins failed

After the room accepts a join, the browser checks the reply in `recorded()`
(`packages/client/src/browser-joining.ts`). That check asks for a member
session, then calls `followReceipt`. `followReceipt` reads the entry with a
minimum (`packages/client/src/handle.ts`), so the HTTP transport adds
`?atLeast=` to the entry path. The entries rule allowed no query, so the
screen transport threw before it sent the request. The page could not
verify the join and reported it as unknown. The NF-A1 audit (act
`e240c288`) traces each step.

## Tests

- `packages/client/test/application-gateway.test.ts` checks each of the five
  reads without a minimum, with its minimum, and with each refused form. It
  also checks that the other reads and the writes still refuse `atLeast`.
- `packages/client/test/browser-joining.test.ts` joins through
  `applicationScreenTransport`. The join settles as joined, and the one
  entry read carries `atLeast`.
- Named red: with main's route at `356fcd11`, both new tests fail and the
  other 13 pass. Evidence:
  `/Users/hughpyle/play/artroom-evidence/2026-11-17-gw1-red/`.

## Deployment and release

The route runs in three places, and each needs its own step:

- The sandbox Worker and the room Workers take the rule when the planner
  deploys them.
- The Lending and Counter browser scripts bundle the route, so their open
  0.5.0 presentations move: Lending `00598706`, Counter `9334159c`. Grow,
  the room page and the MCP cards do not change.
- An installed screen runs the bundle of its installed release. The
  Counter screen on `counter.inguz.space` runs Counter 0.4.0, which keeps
  the old route in the browser. A hosted join through that screen works
  only after the planner signs and installs Counter 0.5.0.

A hosted NF-7 run with a fresh invitation then checks the join through
`counter.inguz.space`.
