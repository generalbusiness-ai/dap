# Typed definition authoring

`@generalbusiness/dap-define` composes declared definition data from typed
item, act, and handler values. `compile` normalizes that data, checks its
declared grant and reason vocabulary, runs the definition validator, and
returns the declaration, digest, findings, and per-act refusal metadata.

`@generalbusiness/dap-define/package` derives package metadata and
projections from the definition value. `declareRoles` declares the action
union before acts use it. The manifest checks role coverage and projected
view fields in TypeScript and again at runtime.

`@generalbusiness/dap-define/story` writes scenario v1 data over the
maintained judges and fold. Each step asserts its complete entries,
effects, sends and timed firings during generation. TEST actor seeds and
scripted grants supply its local authority. The resulting JSON remains
the input to `dap check`.

`extend` marks an additive child of a compiled definition. `compile`
returns its parent digest and added form names as `provenance`; that
metadata never enters the pinned definition. Package derivation and
parameters remain unbuilt.

Follow [Write an application](../../docs/write-an-application.md) for the
authoring workflow. The
[generated vocabulary](../../spikes/typed-surface/VOCABULARY.md)
lists the forms. The
[readability note](../../notes/2026-10-29-typed-surface-readability.md)
records the settled helper choices. The compiler accepts plain operands.
Modules remain functions of explicit dependencies.

The package exposes the authoring API. Its dependencies supply the public
contract, canonical bytes, and definition validator. It does not expose the
kernel's typed program as an authoring format.

Run the package's focused tests with:

```sh
npm test --workspace @generalbusiness/dap-define
```

The package typecheck also checks positive and negative list-member
examples under the repository's strict TypeScript settings. Grow Room and
Change fixtures compare canonical spelling until their pin migration;
the Grow Site fixture keeps the current Room pin and compares exact data.
