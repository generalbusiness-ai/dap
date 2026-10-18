# dap-room

Room is the repository application built on dap. Its
[guides](docs/first-change.md), [lane definitions](lanes/README.md) and
[browser page](docs/page.md) live here. The framework and public platform
SDK remain under `packages/`.

[worker.ts](worker.ts) exports the existing Scope and MCP classes and adds
Room, brand, and the generic installed-application route in [fetch.ts](fetch.ts).
Counter and Lending are ordinary trusted packages, built from their maintained
sources and installed by immutable Git URI. The host contains neither app's
route or compiled asset module.

[wrangler.jsonc](wrangler.jsonc) owns the `artroom-scope` deployment and its
private application-content binding. The dated lending configuration is
retained for its historical service; it is not the generic M1 deployment target.
The [deployment guide](../../docs/deploy.md) describes host trust and storage.
Reviewed source is published and deployed by the planner under the user's
current authorization.

Build the Room page locally from the repository root with:

```sh
npm run build --workspace @generalbusiness/dap-page
```

This writes the app-owned asset module used by its route. It does not
publish it. [Testing](../../docs/testing.md) describes focused checks and
the single gate before Source review.
