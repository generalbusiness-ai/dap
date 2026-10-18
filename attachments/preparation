# M1: trusted packages on the current runtime

Preparation for request `eca1c7eee8851300c7287a95841a6a8ce4b72d5e`,
accepted by `7ff6cd9624aff049148185ff5af198b1c1e3d9bd` after complete A3
entered review `231ec19d`. Source baseline: Main
`0e63ba9296fc5392510fa14a626c1294efe2450a`.

The applications note was read in full at that baseline. Plan 033 was read
at `46f256ae5a0005ecaaf2c51cb9eb8fe50c65c850`. M1 covers trusted packages,
the three identities, pack, the host store and generic route, one install
act, the browser kit, and new/dev/check. Counter and lending must install
by URI into a fresh room without another host deployment. M1 proves no
safety against an arbitrary publisher. M2's presentation boundary,
projections and publication remain separate; G0 may proceed beside M1.

## Current source

| Boundary | Current code | Consequence for M1 |
|---|---|---|
| Host dispatch | `apps/room/fetch.ts:9` imports Counter and lending routes; line 24 dispatches them explicitly | Replace these imports and route clauses with one installed-package route |
| Counter presentation | `apps/counter/src/counting.ts:2` imports `counting-assets.ts`; `apps/counter/scripts/assets.mjs:9` names the generated Worker module | The package carries the built public assets; the host must not compile this asset module |
| Lending presentation | `examples/lending/worker/route.ts:2` imports `assets.ts`; `examples/lending/scripts/assets.mjs:9` names the generated Worker module | The same generic package route must serve this package too |
| Room setup | `packages/cli/src/commands.ts:367` defines explicit cohort selection; line 388 installs the selected register | Room capability setup must be independent of either application |
| Counter cohort | `packages/platform/src/counting-cohort.ts:5` names register6/directory6/membership5; `packages/platform/src/index.ts:155` retains exact catalog pins | Fresh installations must use the generic package path; historical support needs the decision below |
| Definition activation | `packages/platform/src/rules-scope.ts:262` opens one active definition, retaining its exact bytes/closure | Installation needs a package record and a declared protocol, rather than a client hiding several independently signed acts |
| Application creation | `packages/platform/src/application.ts:56` declares `establish-application`; its directory item tracks creating/created/refused/conflict | Reuse the existing checked creation and exact definition closure; preserve the old pins |
| Role actions | `packages/platform/src/membership.ts:472` declares `set-actions`, replacing one whole role list | Package defaults cannot silently overwrite the room's existing grants |
| Browser custody | `examples/lending/browser/storage.ts:11` uses `dap-lending-private-1`; `apps/counter/browser/storage.ts:35` opens `artroom-counting-private-1` | Share the browser kit while preserving binding, expiry, unknown-request recovery and per-tab exclusion |
| CLI dispatch | `packages/cli/src/line.ts:10` lists current commands; `packages/cli/src/main.ts:17` supplies local files and Git | Add developer commands through the owned CLI without fetching tools into a checkout |
| Scenario support | `examples/lending/test-support.ts:1` labels in-memory judges/grants/destination stand-ins; `apps/counter/commitments.test.ts:14` labels its pure scenario | Standard check must distinguish pure scenario/replay from native install, transport and browser evidence |

Neither an application package manifest nor its three-id pack/store/route
protocol exists at this baseline. This source map records code that was
read; it does not transfer the old design note's historical path names into
current source facts.

## Proposed heads

1. **Developer half.** Canonical package reader/writer with semantic,
   presentation and signed-release identities; explicit definition closure
   and creation edges; pack and new/check; the common browser kit and dev
   host. Convert Counter and lending to package source while their existing
   host routes still work until the install half replaces them. Split this
   half further only if an independently reviewable head needs it.
2. **Install half.** Bounded immutable package store/fetch, exact operator
   trust configuration, recorded per-room install, generic routes and the
   one reviewed host deployment. Remove active Counter/lending composition
   and app-specific setup. Show both URI installations in a fresh room and
   use the same package through browser and MCP. Planner owns deployment.

Every submitted implementation head gets one gate and independent exact-head
review. This preparation changes no runtime, manifest schema, dependency,
configuration, room or release. No test or gate was run for this document.

## Decisions requested before encoding the install contract

1. **Historical Counter support.** The request says its cohort must leave
   the host's source, and also says judging/replay must not change. Deleting
   register6/directory6/membership5 support would make existing histories
   unsupported. Recommended interpretation: remove application-specific
   cohort selection from new setup and active host composition, while
   retaining immutable historical catalog/replay support. Confirm whether
   this meets M1, or specify a different historical-support boundary.
2. **Owner of one install and default grants.** Today activation, directory
   creation and role-list updates belong to different scopes. Recommend one
   admin-signed install recorded by a new version of the room's rules
   scope, with explicit pending/active/refused state and checked deliveries
   for activation, role grants and application creation. It is one member
   act, not an atomic transaction across scopes. Existing grants remain;
   only the defaults explicitly confirmed by the admin are added. A failed
   subordinate step stays visible and resumable, and no second signature
   is invented. Confirm this owner/protocol or name the intended alternative.
3. **URI, trust and signed-release envelope.** The settled direction is a
   Git release resolved by URI, not npm. Recommend an exact immutable Git
   commit/path URI plus expected release id; an operator allowlist of exact
   release id and publisher key; and a canonical manifest signed with the
   publisher's existing Ed25519 key, with the release digest covering the
   signed envelope without a self-referential id field. The developer half
   can pack and exercise local fixtures; M1 does not need a public registry
   or a new publish service. Confirm the URI spelling/trust identity and
   envelope contract before they become persistent public bytes.
4. **Host store and generic route.** Recommend one private host-owned
   content store with strict per-package/asset limits and a route bound to
   room, installation and exact presentation id. Neither the route nor a
   same-origin CSP is an isolation boundary; only operator-listed trusted
   packages enter M1. The one host deployment adds the generic store/route,
   after review; subsequent package installs fetch immutable content with
   no redeploy. Confirm the deployment storage binding and route shape,
   or leave their backend choice to builder while retaining this contract.

These recommendations are questions for planner, not adopted decisions.
In particular this note defines no numeric package quota, URI wire format,
new platform pin, installed-package grant or provider configuration.

## Evidence required of implementation

Identity witnesses must separate a screen-only edit from a semantic edit,
verify signatures and closure, and reject missing, altered, duplicate or
unlisted package bodies. The ordinary byte/input bounds apply before parse
or retention; a failed read does not fall back to another URI/version.

Install witnesses must show exact trusted-id admission, admin confirmation,
pending/unknown reply recovery without a duplicate install, native grants
and creation, and a route that opens only after the recorded install is
active. They must also show a refusal for an unlisted release and a package
whose declared host requirements are not supported.

The browser kit must preserve the original signed envelope through lost
answers, reload and concurrent tabs. Existing app-specific storage records
must not be silently reinterpreted. The developer loop must produce a
package, run the standard declared scenario and replay its exact history;
it must label fixture host/authority limits. G0 uses today's scenario
runner until that check path lands. No real device, arbitrary-package
isolation, upgrade or publication claim belongs to these witnesses.
