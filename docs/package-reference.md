# Package reference

A signed application package carries one or more definitions. Version 2
of the package records how those definitions fit together, and it can
require a host capability such as `device-command@1`.
[Write an application](write-an-application.md) gives the steps to write
each definition.
[Check and preview a package](check-and-preview-a-package.md) gives the
steps to check a package and run it on your computer.

A room of the `base` cohort installs a version 2 package that requires no
host capability, one that requires `device-command@1`, as
[Device commands](#device-commands) describes, and one that declares
`publication-paths@1`. [Creation cohorts](cli.md#creation-cohorts) lists
the cohorts.

## Composition of several definitions

A version 2 package describes how its definitions fit together. Each
scope still pins its own whole definition. Package metadata names the
connections and responsibilities between those definitions. It does not
give a member an action or replace a native guard.

The signed semantic value carries seven composition places:

| Place | What it declares |
|---|---|
| `connections` | A scope slot, identified by definition, item type and slot, and the definition it reaches, or `outside`. |
| `rights` | A name and the one definition that owns it. |
| `exercises` | The act or handler rows that exercise each declared right. |
| `order` | Each handler's ordering choice: `any` or a declared right. |
| `groups` | Reserved for sequenced groups. Use an empty array. |
| `derivation` | Reserved for derived definitions. Use an empty object. |
| `parameters` | Reserved for parameter bindings. Use an empty object. |

In `dap.application.json`, references to definitions are paths already
listed in `definitions`. Packing resolves them to the captured
definitions' exact digests. Include all seven composition places in the
source file and the signed version 2 value, with explicit empty arrays or
objects where a place is reserved. Both `packApplication2` and
`validatePackage` refuse a missing place. Packing never fills in an
omitted place.

For example, the [Grow source](../examples/grow/check/dap.application.json)
connects the Site's child slot to the Room definition:

```json
{
  "connections": [
    { "from": "site.json", "item": "room", "slot": "scope", "to": "room.json" },
    { "from": "room.json", "item": "room", "slot": "site", "to": "site.json" }
  ],
  "rights": { "room-count": { "owner": "site.json" } },
  "exercises": [
    { "definition": "site.json", "row": "acts.create-room", "right": "room-count" }
  ],
  "order": [
    { "definition": "site.json", "handler": "room-summary", "by": "any" }
  ],
  "groups": [],
  "derivation": {},
  "parameters": {}
}
```

This excerpt shows the composition shape, not a complete package. A
connected handler's `from.under` names its sender definition and its
`from.pin` names that definition's exact digest. Runtime delivery checks
the pin against verified native birth metadata. A same-name definition
with another digest cannot take the declared peer's place.

The package codec checks composition during packing, before signing, and
when reading signed bytes. `validatePackage(bytes, bounds, profiles)`
from `@generalbusiness/dap-platform/package-validation` also validates every
native definition and returns the graph findings and projected counts. The
release on npm at `0.1.0-dev.2` does not export that path yet, and `dap check`
runs the same function from a checkout. Pass the same bounds
and rule profiles you use for whole-definition validation.

The graph checks endpoint writers, port field types, handler reachability,
result clauses, timed exits for pending work, default-role action coverage,
declared right ownership and handler order. Automatic send or create
cycles need a stated state condition. This structural check gives no
storm or termination bound. Rights and exercises describe the listed
rows. They do not discover every writer of a business constraint.

A relation's `copies` counts retained keys over its lifetime. A live item
maximum alone cannot prove that count, because a final item may free a
slot for another key. The validator refuses an unproved count as
`fan-in-unproved` and a proved count above `copies` as
`fan-in-exceeds-copies`. Grow's three retained Room slots prove three
senders for its singleton Room item, so `copies: 3` passes and
`copies: 2` refuses. If each Room instead relates two nonfinal items, the
required count is six.

Run `dap check <directory>` to validate a source package and its listed
local scenarios. `dap pack <directory>` refuses the same composition
findings before it writes a release. Both print findings as rows naming
the definition, row, check, severity, reason and message. A `refusal`
stops validation. A `warning`, such as `unowned-bound`, is reported on a
package that passes. Resolve a warning in the application's design or
explain why it is safe.

Check also reports live item allowances, successful-creation entry and
item-key ceilings, and any unproved lifetime totals. Creation-path figures
exclude failures, repeated inputs, timed work and outside scopes. They do
not promise that a scope's retained bounds accept the application, and
they measure no physical memory or provider quota.

Groups, group ordering, declared reads, sequenced definitions, row
`states`, handler `spacing`, timed sends, derivation and parameters refuse
with `unsupported-form` until the slices that own them are implemented.
Existing native `late` handlers remain available. A local scenario's TEST
authority is separate from installation, live membership and a provider.

## Device commands

A package v2 may require the host's finite `device-command@1` capability:

```json
{"name":"device-command@1","bounds":{"kinds":["fan","heater","vent"],"owners":1}}
```

List kinds in sorted order. The requirement names no owner identity.
Install in a device cohort (`archive-device-application` or
`archive-device-publication`), and choose an existing full member
reference with `--owner`. The native install checks that member's current
membership. This cohort runs host capability code, never code supplied by
the package. At most eight package definitions may use the capability.
The installed root may delegate its grant to one permitted child
generation, as Grow's Site does for Room.

The definition declares device-command version 1. A target-writing effect
sets target, level and its own targetAt, then opens the bound device's
command through the capability. Only the capability may write the optional
outcome and outcomeAt slots. Its owner's `answer` preparation names the
full command fact and closes it as confirmed, refused or unknown. Each
open command reserves one answer. A sensor report changes reported fields
independently. An older answer closes its own command without replacing
the current outcome. A missing answer leaves outcome empty. Without an
installed grant, target acts open no command. See the
[Grow device forms](../examples/grow/authoring/forms.ts).

Local `dap check` scenarios may name a public TEST actor with
`deviceOwner` and use `prepare` steps for native answers. `$position`
resolves a saved accepted receipt's position, and `$fact` resolves its
full fact. The
[Grow fault scenario](../examples/grow/check/fault-scenario.json)
uses these references and checks native command records. The scenario
proves no production grant or physical device action.

## Source

Sources:
[the package codec](../packages/platform/src/application-codec/application-package-v2.ts),
[the package validation](../packages/platform/src/validate-package.ts),
[the device-command bounds](../packages/contract/src/device-command.ts) and
[the Grow device forms](../examples/grow/authoring/forms.ts).
