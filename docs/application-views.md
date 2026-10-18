# Declared application views

Package v2 binds views to named native projections. The generic MCP kit
renders `card`, `carousel`, `record` and `log` views. A `surface` supplies
package-owned HTML. View reads use the installed package's native read
session. View syntax supplies no native authority.

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
