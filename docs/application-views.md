# Declared application views

This reference is for an author who writes an application package and
wants members to see its items and take its acts from an AI app. It
describes each field you can declare in a view, and what the host checks.

An AI app shows a package's views only after a room installs the package.
No room that a current Worker creates installs an ordinary package, one
that requires no host capability. A room of a current device cohort
installs a package that requires `device-command@1`, such as Grow, as
[Device commands](package-reference.md#device-commands) describes.

Four terms recur:

- **Package v2.** The version 2 application package that `dap pack`
  builds from `dap.application.json`. Its `presentation.views` holds the
  views, and
  [Composition of several definitions](package-reference.md#composition-of-several-definitions)
  describes the rest of it.
- **Projection.** A named read that the package declares in its
  `projections` over one of its definitions. Each projection has sources
  of items or journal entries, and fields taken from them. Every view
  binds to one projection.
- **The MCP kit.** The generic card screens that dap's MCP server serves
  as MCP Apps resources. It renders `card`, `carousel`, `record` and
  `log` views in an AI app, as [Compact cards](mcp.md#compact-cards)
  describes. A `surface` view supplies the package's own HTML instead.
- **Native.** What the scope runtime itself holds and checks: the
  definition's acts and fields, the grants, the entries and the read
  sessions. A view only declares how to show native data. It grants no
  authority, and every read uses the installed package's native read
  session.

## A minimal view

The smallest view is one projection and one `card` over it. The example
below fits the notes starter that `dap new` writes, which
[Check and preview a package](check-and-preview-a-package.md) uses.
Views exist only in a version 2 package. Its `presentation` holds
`resources` and `views` beside `entry`, `assets` and `descriptions`. The
package also lists all seven places of
[Composition of several definitions](package-reference.md#composition-of-several-definitions).

The projection reads the starter's `note` items and two of their slots:

```json
"projections": {
  "notes": {
    "v": 1,
    "definition": "definition.json",
    "revision": "revision",
    "sources": {
      "note": {
        "item": "note",
        "read": "many",
        "states": ["done", "open"],
        "limit": 32,
        "fields": {
          "text": {
            "from": { "kind": "value", "name": "text" },
            "of": { "type": "text", "max": 280 },
            "nullable": false
          },
          "writer": {
            "from": { "kind": "party", "name": "writer" },
            "of": { "type": "member" },
            "nullable": false
          }
        }
      }
    }
  }
}
```

The card binds to that projection's `note` source, in
`presentation.views`:

```json
"views": {
  "note": {
    "kind": "card",
    "projection": "notes",
    "item": "note",
    "revision": "revision",
    "title": "text",
    "summary": null,
    "actor": "writer",
    "facts": ["state"],
    "acts": [],
    "context": "Note {id}: {state}",
    "fallback": "Note {id}",
    "waiting": {},
    "refresh": 5000,
    "display": "inline",
    "back": null
  }
}
```

A projection has four members:

| Member | Rule |
|---|---|
| `v` | `1` |
| `definition` | A path that the package lists in `definitions`. Packing replaces it with that definition's digest. |
| `revision` | `"revision"` |
| `sources` | One to eight named sources |

An item source has five members:

| Member | Rule |
|---|---|
| `item` | An item type of the definition |
| `read` | `item`, `one` or `many` |
| `states` | 1 to 16 states of that item type, each named once, in sorted order |
| `limit` | 1 for `item` and `one`, and 1 to 100 for `many` |
| `fields` | At most 32 named fields. No field is named `id`, `type`, `state` or `revision`. |

Each field has three members:

| Member | Rule |
|---|---|
| `from` | The slot's `kind`, which is `value`, `party`, `ref`, `fact-time` or `fact-signer`, and its `name` |
| `of` | Exactly the slot's native type. A party slot that holds one member has the type `{ "type": "member" }`. |
| `nullable` | `true` exactly when the native slot is not required. A `fact-signer` field is never required, so its `nullable` is `true`. |

A `card`, `carousel`, `record` or `log` view has these members:

| Member | Rule |
|---|---|
| `kind` | `card`, `carousel`, `record` or `log`. A `surface` has other members, as [Surface resources](#surface-resources) describes. |
| `projection` | A projection that the package declares |
| `item` | A source of that projection. Its rows supply the item identity and the template fields. |
| `revision` | `"revision"` |
| `title` | A field of the source, or `id`, `type`, `state` or `revision` |
| `summary` | Such a field, or `null` |
| `actor` | A source field of type `member`, or `null` |
| `facts` | At most 16 such fields, each named once |
| `acts` | At most two acts. A card with no acts signs nothing. [Typed acts from chat](#typed-acts-from-chat) describes an act. |
| `context`, `fallback` | Text of at most 4,096 bytes. `{name}` inserts a field of the source or `id`, `type`, `state` or `revision`. |
| `waiting` | At most 16 templates, each keyed by a state of the item type |
| `refresh` | The refresh interval in milliseconds, 1,000 to 60,000 |
| `display` | `inline` or `fullscreen` |
| `back` | Another view of the package, or `null` |

`dap check` binds each projection and view to the definition it names. A
view that names a missing field refuses the package with
`application-package-invalid` and exit 1. So does a projection field whose
`of` or `nullable` differs from the native slot. A scenario step can state
the rows that a projection reads. The row count and each stated value must
match:

```json
{ "projection": { "name": "notes", "sources": { "note": [
  { "id": 1, "state": "done", "fields": { "text": "A first note." } }
] } } }
```

## Typed acts from chat

A view act may declare scalar `parameters` beside fixed native `args`.
Names must be native fields of that act. A field cannot be both a constant
and a parameter. Binding checks its type, bounds and required/default rules.
Supported inputs are `int`, `decimal`, `text` and `enum`, with labels and
required flags. Numeric inputs state units and bounds. Decimals also state
a scale of 0 to 6. Text limits count UTF-8 bytes. Enums name allowed words.

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
0 to 10 mS/cm and converts 2.1 to native integer 2100. Conversion refuses excess
precision rather than rounding. Omitted readings stay absent. An input map
accepts 1 to 16 scalar fields within 64 KiB, and each native field may impose
a smaller limit. Human-unit range endpoints must convert back to the exact
declared native bounds.

The host derives one model tool per parameterized control. Its input names
the mounted `view`, selected `item` and native `revision` from the card
context, a `request` key, and `values`. It accepts no caller-selected target,
native act, signer or expected-subject map. The host repeats current view,
revision, standing and declared-condition checks before signing the native
act. App buttons hand measurement entry to chat.

Keep the same request key and values for a retry. Concurrent duplicates
share one outcome. Reusing a key for different values refuses. An unknown
outcome retains the original custody request and offers its check control.
Automatic refresh keeps that captured card and check even if a committed
act with a lost reply has changed the carousel order.
Each view retains at most 32 measurement requests. Accepted input refreshes
the carousel at position zero. Tool results expose context, identity and
receipt, and the app-only read carries card details. The context includes the
stable view key, with no private display cut.

## Carousel order

A carousel may order its complete `many` source by one projected integer
or timestamp field:

```json
"order": { "field": "probeTime", "direction": "asc", "missing": "first" }
```

Direction is `asc` or `desc`. Missing values go `first` or `last`. Native
item IDs break ties in ascending order. Sorting selects the presentation
row without changing the native projection's row order. Partial item reads,
text fields and other view kinds cannot declare this order.

## Member queues

A carousel over a complete `many` item source may declare `for`:

```json
"for": "'grow.heat' in viewer.grants and item.state = 'open'"
```

The host accepts this expression only in the `restricted@1` rule profile. Its input contains:

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
or item selectors. A projection with an explicit-item source cannot bind here.
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
record-by-id views skip routing, and the host checks their reads and acts
as it checks any other.

A routed carousel shows only the items that its `for` rule includes. The
app never receives the complete source data that the server holds, and
never presents the filtered list as the whole projection. Model
context carries declared context, identity, read points, navigation and receipts. Automatic
refresh recovers to the first item if the current queue position disappears.
Explicit navigation is not silently redirected, and an unknown original
request keeps its captured card and check. Empty queues retain declared Back
navigation and the refresh interval, so later items can appear.

The [Grow declarations](../examples/grow/check/dap.application.json) contain
separate alert, task and watering carousels. Their presence rule reads
the Site's bounded per-member presence items. An admin provisions an item
in `unknown`. Only its member's `arrive` and `leave` acts report location.
The task rule treats missing and unknown items as unavailable, away as
unassigned, and present as assigned only when the room's full scope matches.
Other members' reports do not erase this recorded state. The separate
`presence-activity` projection is a recent journal log, not occupancy.

The presence item's `reportedAt` slot has native type `fact` and is written
from `self`. Its raw local value is the report's entry position, qualified
by the projection's complete Site reference, its scope ID and genesis. It is not the
item revision. A reader can resolve that known position directly to its
entry and hash. A refused, missing or unavailable lookup supplies no fact.
Provisioning leaves the room and report slots null.

## Fact timestamps, signers and display ages

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
yield null. Foreign, future or unavailable evidence refuses the read.
The field uses the same session visibility as the item. It exposes no entry
fields or signer. Journal sources still require history access.

The native owner reads only the selected entry index metadata at the exact
projection head, within the source's existing budget. There is no journal
window or foreign lookup. The time comes from the owner's immutable entry
metadata, and the read does not check the entry body. The timestamp remains
projected data and does not become a new native value or ref slot.

An item can also select the member recorded as signing its named local fact:

```json
"lastProber": {
  "from": { "kind": "fact-signer", "name": "lastProbe" },
  "of": { "type": "member" },
  "nullable": true
}
```

The same native fact-slot and scope rules apply. A signer field must be
nullable even when its native fact slot is required. This field uses the
entry's recorded authority subject for its actor key. It never resolves a
key through current membership. A missing fact, mismatched hash, absent
recorded member or unavailable index gives null, and the surface should
say "Last prober unavailable". The rest of the item remains visible.
The native owner writes this bounded metadata with new entries and removes
it when the entry is deleted. The owner does not scan or backfill existing
entries, so their signer stays unavailable. Reads use the source's existing metadata
budget, select no entry bodies, and require the same item visibility.

A view fact can display a timestamp as an age:

```json
{ "field": "moistureTime", "label": "Moisture age", "format": "age" }
```

The card uses the MCP host's clock for display, retaining the absolute
source time. Missing values show a dash. A clock before the reading is
reported explicitly. An age is for display only, and no act takes effect
or is refused because of it. Package
surfaces may display ages with their device clock and identify that clock
in the interface. Use each retained metric's own fact time, because a
later act can leave other values and their ages unchanged.

## Links and series on a record

A view other than a `surface` may declare `links`, and a `record` view may
declare a `series`. The [Grow declarations](../examples/grow/check/dap.application.json)
use both on the zone record:

```json
"links": [
	{ "view": "heater", "field": "heater", "label": "Open heater controls" },
	{ "view": "vent", "field": "vent", "label": "Open vent controls" }
],
"series": {
	"source": "history", "field": "mean", "label": "Mean temperature history",
	"scale": 2, "unit": "°C", "last": 64
}
```

`links` lists at most 16 read-only ways to open another view from the
selected item. Each link has three fields:

| Field | Rule |
|---|---|
| `view` | A `record` view of this package whose projection reads the same definition, and whose `item` source reads one item (`read: "item"`) |
| `field` | A field of the viewing source whose type is a reference to an item of that same type |
| `label` | The button text, at most 80 bytes |

No two links may name the same view and field. A link opens the linked
record at the item that the field names. It signs nothing.

`series` shows the last native journal samples of one integer field for
the selected item. It has six fields:

| Field | Rule |
|---|---|
| `source` | A journal source of the same projection that reads `entries`, with no `latestBy`, and whose acts all act on the record's item type |
| `field` | A non-nullable integer field of that source |
| `label` | The series title, at most 80 bytes |
| `scale` | The decimal shift for display, 0 to 6 |
| `unit` | The unit text, at most 16 characters and 32 bytes, with no outer spaces |
| `last` | How many samples to show, 1 to 64. The source's `limit` must be at least this number |

The card shows each sample with its value, source time and entry. Its
text form names the latest, the lowest and the highest sample. When the
source's window holds no sample for the item, the card says so. A sample
without an entry, a time or an integer value makes the series
unavailable. A series runs no expression and joins nothing.

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
dispatch. The surface receives the native projection, including its scope
and head, with a member display table beside its rows. It supplies no read
adapter. The table is for display, and it grants no authority.

## Browser API

The resource uses self-contained classic inline scripts. External scripts,
modules, `async` and `defer` are unsupported. The kit mounts body content
and inline styles in a shadow root. During script initialization,
`window.dapSurface` provides this API:

| Member | Value |
| --- | --- |
| `root` | The resource's shadow root |
| `signal` | An abort signal for resource teardown |
| `onData(render)` | Registers one callback for cloned native projection data and `data.members` |
| `member(ref)` | Returns the kit's identity and standing element for a full member reference |
| `open(name, items?, scope?)` | Opens a name in the view's `opens` map, optionally at a full scope reference |

The initialization property is removed after the scripts run. A resource
keeps its API reference in a closure. It does not receive a signer, token
or arbitrary tool callback. The kit runs the package's code as trusted
code, in the same document as its own tool bridge. A package script can
post its own `tools/call` message to the host through `window.parent`, as
the bridge does. Install only a package whose code you trust.

A trusted package script can submit any action declared by one of the
package's views without a click, using the member's authority. Release trust
admits that code. The retained view, revision, current grants and native
guards still constrain the action. A click is not an authority boundary.

Ordinary write tools and dynamic Native act tools carry
`_meta.ui.visibility: ["model"]`. The MCP Apps host must refuse an app call
to those tools. `view_act` and declared input tools remain app-callable;
they admit only the retained view's declared actions and inputs. The server
receives the same authenticated tool call from either origin. It does not
use visibility as proof of who called. If a host does not enforce this
metadata, the server still applies its ordinary membership, grants and
native guards; visibility adds no server-side refusal.

The [MCP Apps Visibility section](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx#visibility)
defines this host check. Omitting visibility exposes a tool to both model
and app callers.

The service resolves typed party and journal signer fields into
`data.members.records`, keyed by the canonical full member reference.
The membership genesis is part of that key. The table holds at most 32
distinct references, including controllers. `data.members.overflow` counts
references beyond the limit, and the kit shows that count. A reference
outside the table, or one the service cannot read, renders as Member
unavailable with its full raw reference. The element never guesses a name.

Use `surface.member(row.fields.lastProber)` for a projected member field.
The kit shares its stylesheet with the shadow root and inherits the host's
fonts and tokens. `onData` runs again when the display table changes, even
when the native projection has not changed. The API offers no membership
act or presence write, and the kit has no member-record screens.

Resolution uses one authenticated membership window of at most 100 member
items, including final states, and one roster item. It follows no cursor.
A member outside that window remains unavailable. A roster from another
read head leaves action eligibility unknown. So the table is not a
complete membership list, and it does not show whether a member's act
would take effect.

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
The separate native projection protocol permits larger replies, and the
kit refuses an oversized mounted view. Each connection retains at most 32
surface resources and 128 view instances.

## Views as notes

[Boundary objects in use](../notes/2026-10-28-boundary-objects-in-use.md),
section 9, designs a different home for views. There, a view is a `note`
that the host runs. Its text is a declaration or code, and its `about`
names its sources: notes and documents by reference, and a package's
projections. The host ships built-in views: a thread, a table over notes,
a timeline, an image with regions, and two versions side by side. A
declaration adds a shape or a computed column to one of them. A view may
write any act its member may sign, and the host shows the act and signs
it on the member's action. Code views run in the sandbox domain. None of
that is built. Today a view lives in a package's `presentation`, binds to
the package's projections, and a `surface` declares no acts.

## Application file publication

An application's `publish-file` send may write any valid ordinary path in
its own room. The host reserves `.github/`, root and `docs/` CODEOWNERS,
`AGENTS.md`, `CLAUDE.md`, and current Rules control extents. The check also
follows control-file aliases. It runs before a provider push on both
historical pins and current rooms.

The journal records the existing `host-refused` reason. The separate host
answer identifies the reserved path or control extent; it adds no new field
to historical Native evidence. A missing authenticated Rules policy permits
no publication. Ordinary paths, including Lending shelf pages, retain their
existing behavior. One application can still overwrite another's ordinary
file. Declared per-application prefixes belong to a later Rules and
Destination revision, as [fold publication, section 6](../notes/2026-10-13-fold-publication.md#6-authority)
states. No new package declaration or setting is required today.

## Source

The field tables, limits, examples, browser API, member table and file
publication were checked against main `6bfb6e16` on 10 November 2026. The
statements about routing, fact time, fact signers and surface lifetime
keep their check against main `5dc9765f` on 30 October 2026. Sources:
[`application-view.ts`](../packages/platform/src/application-codec/application-view.ts),
[`application-view-binding.ts`](../packages/platform/src/application-codec/application-view-binding.ts),
[`application-view-parameters.ts`](../packages/platform/src/application-codec/application-view-parameters.ts),
[`declared.ts`](../packages/mcp/src/views/declared.ts),
[`session.ts`](../packages/mcp/src/views/session.ts),
[Grow declarations](../examples/grow/check/dap.application.json),
[boundary objects in use](../notes/2026-10-28-boundary-objects-in-use.md).
