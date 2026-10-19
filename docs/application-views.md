# Declared application views

Package v2 binds views to named native projections. The generic MCP kit
renders `card`, `carousel`, `record` and `log` views. A `surface` supplies
package-owned HTML. View reads use the installed package's native read
session. View syntax supplies no native authority.

## Typed acts from chat

A view act may declare scalar `parameters` beside fixed native `args`.
Names must be native fields of that act. A field cannot be both a constant
and a parameter. Binding checks its type, bounds and required/default rules.
Supported inputs are `int`, `decimal`, `text` and `enum`, with labels and
required flags. Numeric inputs state units and bounds; decimals also state
a scale of 0–6. Text limits count UTF-8 bytes. Enums name allowed words.

For example, this act fragment accepts EC in mS/cm:

```json
{
  "act": "probe",
  "label": "Add measurements",
  "needs": "grow.tend",
  "when": "state = 'fresh' or state = 'stale'",
  "parameters": {
    "ec": {
      "kind": "decimal", "label": "EC", "unit": "mS/cm",
      "min": 0, "max": 10000, "scale": 3, "required": false
    }
  }
}
```

Declaration bounds use native integer units. Here the derived tool accepts
0–10 mS/cm and converts 2.1 to native integer 2100. Conversion refuses excess
precision rather than rounding. Omitted readings stay absent. An input map
accepts 1–16 scalar fields within 64 KiB; each native field may impose a
smaller limit. Human-unit range endpoints must convert back to the exact
declared native bounds.

The host derives one model tool per parameterized control. Its input names
the mounted `view`, selected `item` and native `revision` from the card
context, a `request` key, and `values`. It accepts no caller-selected target,
native act, signer or expected-subject map. The host repeats current view,
revision, standing and declared-condition checks before signing the native
act. App buttons hand measurement entry to chat.

Keep the same request key and values for a retry. Concurrent duplicates
share one outcome; reusing a key for different values refuses. An unknown
outcome retains the original custody request and offers its check control.
Automatic refresh keeps that captured card and check even if a committed
act with a lost reply has changed the carousel order.
Each view retains at most 32 measurement requests. Accepted input refreshes
the carousel at position zero. Tool results expose context, identity and
receipt; the app-only read carries card details. The context includes the
stable view key, with no private display cut.

## Carousel order

A carousel may order its complete `many` source by one projected integer
or timestamp field:

```json
"order": { "field": "probeTime", "direction": "asc", "missing": "first" }
```

Direction is `asc` or `desc`; missing values go `first` or `last`. Native
item IDs break ties in ascending order. Sorting selects the presentation
row without changing the native projection's row order. Partial item reads,
text fields and other view kinds cannot declare this order.

## Member queues

A carousel over a complete `many` item source may declare `for`:

```json
"for": "'grow.heat' in viewer.grants and item.state = 'open'"
```

The host admits this expression under `restricted@1`. Its input contains:

- `viewer.member`: the authenticated native member reference, including its
  full membership scope. A display handle does not establish this identity.
- `viewer.grants`: that member's current held actions.
- `item`: the selected row's projected fields and its `id`, `type`, `state`
  and `revision` metadata.
- `scope`: the verified full scope of the primary projection.
- `reads`: any named related projection results declared below.

This nested input belongs to `for`. An act's `when` still uses the selected
row's flat fields and metadata. Neither expression supplies native authority.
The caller cannot override the viewer, grants or related-read bindings.

A routed carousel may declare one to four related reads:

```json
"reads": {
  "presence": { "projection": "presence", "scope": "installation" }
}
```

Each name binds to an existing projection of the package's entry definition,
read at the installation's root scope. Related reads accept no caller scope
or item selectors; projections with explicit-item sources cannot bind here.
The rule receives the native result at `reads.presence`, including its
`scope`, `at` and `sources`. These reads use normal native sessions, limits
and access checks. Each contributes an exact scope/head to the card. They
are separate read points, without an atomic snapshot across scopes.

`true` includes an item and `false` excludes it. Missing or nonboolean
evidence and evaluation failures leave an unavailable placeholder. It keeps
the native item identity and read points, with no unassigned body, actor or
acts. An unknown result never becomes an empty queue. The app offers a read
retry and expandable read points. Missing authenticated viewer identity
refuses the opening.

The host rechecks current routing immediately before signing. A false or
unknown result refuses the old control even when the item revision is
unchanged. Native grants and guards still judge the signed act. Explicit
record-by-id views bypass routing and retain ordinary read and act admission.

Routed app displays omit the complete native source data held by the server;
they do not present a filtered array as a complete native projection. Model
context carries declared context, identity, read points, navigation and receipts. Automatic
refresh recovers to the first item if the current queue position disappears.
Explicit navigation is not silently redirected, and an unknown original
request keeps its captured card and check. Empty queues retain declared Back
navigation and the refresh interval, so later items can appear.

The [Grow declarations](../examples/grow/check/dap.application.json) contain
separate alert, task and watering carousels. Their first presence rule uses
only the declared last-100 Site entries. A covered arrival and matching
leave can establish a result; older evidence stays unavailable.

## Fact timestamps and display ages

An item projection can select the recorded time of one native fact-ref slot:

```json
"moistureTime": {
  "from": { "kind": "fact-time", "name": "moistureAt" },
  "of": { "type": "time" },
  "nullable": true
}
```

The slot must be a fact ref under the projection's own definition, with
matching optionality. Local entry positions resolve in the captured scope.
Full refs must name that exact scope and match the stored hash. Empty refs
yield null; foreign, future or unavailable evidence refuses the read.
The field uses the same session visibility as the item. It exposes no entry
fields or signer. Journal sources still require history access.

The native owner reads only the selected entry index metadata at the exact
projection head, within the source's existing budget. There is no journal
window or foreign lookup. This relies on the owner's immutable metadata;
it does not independently verify an entry body. The timestamp remains
projected data and does not become a new native value or ref slot.

A view fact can display a timestamp as an age:

```json
{ "field": "moistureTime", "label": "Moisture age", "format": "age" }
```

The card uses the MCP host's clock for display, retaining the absolute
source time. Missing values show a dash. A clock before the reading is
reported explicitly. These ages supply no native admission rule. Package
surfaces may display ages with their device clock and identify that clock
in the interface. Use each retained metric's own fact time: a later act
can leave other values and their ages unchanged.

## Surface resources

`presentation.resources` maps a `ui://` resource name to an HTML asset path.
A surface view names that resource, its projection and its permitted opens:

```json
{
  "kind": "surface",
  "projection": "grid",
  "item": "bench",
  "revision": "revision",
  "resource": "ui://grow/grid",
  "opens": { "bench": "bench-record" },
  "acts": [],
  "context": "Room grid",
  "fallback": "Open the room grid.",
  "waiting": {},
  "refresh": 2000,
  "display": "fullscreen",
  "back": "alerts"
}
```

The host validates projection names, source names, resource ownership and
opening targets when it reads the package. A surface declares no acts.
The kit retains its MCP connection, context reporting and native act
dispatch. The surface receives the same projection object as the SDK and
MCP read, including its native scope and head. It supplies no read adapter.

## Browser API

The resource uses self-contained classic inline scripts. External scripts,
modules, `async` and `defer` are unsupported. The kit mounts body content
and inline styles in a shadow root. During script initialization,
`window.dapSurface` provides this API:

| Member | Value |
| --- | --- |
| `root` | The resource's shadow root |
| `signal` | An abort signal for resource teardown |
| `onData(render)` | Registers one callback for cloned native projection data |
| `open(name, items?)` | Opens a name in the view's `opens` map |

The initialization property is removed after the scripts run. A resource
keeps its API reference in a closure. It does not receive a signer, token
or arbitrary tool callback. The integration assumes trusted package code.
Hostile-code containment is outside this contract.

```html
<p id="head"></p>
<div id="benches"></div>
<script>
(() => {
  const surface = window.dapSurface;
  surface.onData(data => {
    surface.root.querySelector("#head").textContent = `Head ${data.at.seq}`;
    const list = surface.root.querySelector("#benches");
    list.replaceChildren();
    for (const row of data.sources.bench) {
      const button = document.createElement("button");
      button.textContent = row.fields.label;
      button.onclick = () => {
        void surface.open("bench", { bench: row.id });
      };
      list.append(button);
    }
  });
})();
</script>
```

Here `bench-record` must select a projection whose `bench` source uses
`read: "item"`. Source selections are bounded integer IDs and pass through
the ordinary host/native query checks. An undeclared name or an opening
from an inactive surface refuses before dispatch.

## Updates and lifetime

The callback runs when native projection data changes. The kit retains
mounted resources while navigating so local selection can survive Back.
Teardown aborts their signals and releases the retained panels. A script
initialization failure shows an error and omits the partial surface.

An empty projection still reaches the surface with its native head. Its
model context has no invented item identity. A populated surface identifies
its scope and native head, with no item expected-revision set. Projection
data and resource HTML stay on the app-only read path. Context reports use
the declared context template and native identity/read points.

The mounted-view projection, including HTML and data, is bounded to 64 KiB.
The separate native projection protocol permits larger replies; the kit
refuses an oversized mounted view. Each connection retains at most 32
surface resources and 128 view instances.
