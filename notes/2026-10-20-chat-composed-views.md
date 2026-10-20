# Chat-composed views

This note describes how a person gets a live chart of a room's data in an
AI chat. The chat model writes a small view declaration. The host checks it
and shows it in the current view kit. The person can keep the view in the
room and share it.

## 1. What this design is for

A dap room holds scopes. Each scope keeps a journal of signed entries, and
its current items derive from that journal. An application package declares
item types, acts, projections and views. A projection is a named, bounded
read of items or journal rows. A view shows a projection to a person in an
AI chat, through an MCP Apps host. The host draws the view in a frame with
the view kit, and the person acts through the view one item at a time.

A person in the chat asks questions about the room. Text answers some of
them well: a number, a short list, the items that need attention. Text answers
others badly: shape, trend, comparison across many items, a relation
between two measures, and position in a place. A chart answers those.

The chat model can draw a chart itself. A composed view does better in two
ways:

- It shows live data. It reads the room again on a timer, and it states
  when it last read.
- Its marks are items. A tap on a bar, point or cell opens that item's card,
  and the card offers the item's acts.

A composed view needs no new definitions, projections or acts in the
package. The model uses only what the package already declares.

## 2. Terms

The terms appear in the order that later sections use them.

- **Installation.** One installed package in one room. The Rules scope holds
  it as an `installation` item (`packages/platform/src/application-install.ts`).
- **Presentation.** The part of a package that tells hosts how to show it:
  views, resources and assets. A presentation change keeps the package's
  semantic id ([self-contained applications](2026-10-15-self-contained-applications.md),
  section 4 and decision 1).
- **View kit.** The HTML and script that MCP Apps hosts load to draw views
  (`packages/mcp/browser/`). Today it draws `card`, `carousel`, `record` and
  `log` views ([application views](../docs/application-views.md)).
- **View session.** The part of the dap MCP server that reads projections
  for a mounted view and sends the result to the frame
  (`packages/mcp/src/views/session.ts`).
- **Mount.** The data that the view session sends to the frame for one view.
  It is at most 64 KiB of canonical JSON (`session.ts`, the byte check in
  `checked()`).
- **Composed view.** A view that a chat model writes at run time, not a view
  in the package.
- **Declaration.** The JSON document that describes one composed view.
- **Block.** One chart in a declaration.
- **Kind.** The chart type of a block: `line`, `bar`, `scatter`, `plan` or
  `map`.
- **Channel.** A visual property that a field controls: `x`, `y`, `color`
  or `label`.
- **Mark.** One drawn element: a point, a bar, a cell or a map dot.
- **Kept view.** A declaration that a person saved in the room.
- **Catalogue.** A description of an installation's sources and fields,
  written for the chat model.

## 3. How a view is composed

A person asks a question. The model calls `view_catalogue` and receives the
installation's sources, fields and examples. The model writes a declaration
and calls `view_compose`. The view session checks the declaration. If it is
valid, the host mounts it and the frame draws it. If it is not valid, the
tool returns every error at once, and the model can repair the declaration.

The dap MCP server adds three tools and one resource. All four are fixed:
the tool list and the resource list never change at run time.

| Tool | Visible to | Binds | Does |
| --- | --- | --- | --- |
| `view_catalogue` | model | nothing | Returns the catalogue of one installation (section 10). |
| `view_compose` | model and frame | `ui://dap/composed` | Checks a declaration and mounts it. |
| `view_open` | model and frame | `ui://dap/composed` | Lists kept views, or mounts one kept view by name (section 11). |

MCP Apps hosts read the tool list once and bind each tool to its `ui://`
resource then. For that reason, a composed view is data for a resource that
already exists. It is never a new resource or a new tool. The current
app-only tools `view_read` and `view_act` serve composed views as they serve
declared views.

Composed views run where declared views run. Today, declared views are not
connected to `dap mcp --generic` or the hosted endpoint. That connection
comes first.

A composed view contains no acts. Acts appear only in the card that a mark
opens. That card is a package view, so its acts and their labels come from
the package's act declarations. The server holds the key that signs acts. It checks
each act again before it signs, as it does for declared views.

## 4. Declaration form

A declaration is one JSON object. The host refuses any member that this
section does not list.

```json
{
  "v": 1,
  "title": "Moisture by bench",
  "installation": 2,
  "scope": { "scope": "sc_2dn76oxe...", "inc": "in_utplzcz2...", "kind": "lane" },
  "blocks": [
    { "kind": "plan", "projection": "layers", "source": "bench",
      "position": "bench", "color": "moisture", "label": "label" }
  ]
}
```

| Member | Value |
| --- | --- |
| `v` | `1`. |
| `title` | Text, 1 to 80 bytes. |
| `installation` | The item id of an active installation in the room's Rules scope. |
| `scope` | The full reference of the one scope that every block reads: the installation's application scope, or a scope that it created (section 8.1). |
| `refresh` | Optional. Milliseconds between reads, 5,000 to 60,000. The default is 15,000. |
| `blocks` | A list of 1 to 6 blocks. |

Every block has these members:

| Member | Value |
| --- | --- |
| `kind` | `line`, `bar`, `scatter`, `plan` or `map`. It comes first. |
| `title` | Optional text, 1 to 80 bytes. |
| `projection` | The name of a projection of the installation's package. |
| `source` | The name of a source in that projection. |
| `item` | Required when the source reads one chosen item (`read: "item"`): that item's id. Refused for other sources. |
| `filter` | Optional. A list of 1 to 8 conditions (section 8). |

Each kind adds its own members (section 5). A block names projections,
sources and fields only. It holds no data, no types, no scales and no
units. The view session takes those from the package. For that reason, a
model cannot state a type wrongly.

Bounds:

- A declaration is at most 8 KiB of canonical JSON.
- A block has at most 4 series.
- A frame shows the first 2 blocks inline and all blocks in full screen.

## 5. Kinds

Each kind answers one shape of question. The catalogue gives a default kind
for each source shape (section 10).

| Kind | Answers | Reads |
| --- | --- | --- |
| `line` | How does a measure change over time? | Rows with a time field and an integer field. |
| `bar` | How do categories compare? | Rows grouped by an enum or a label field, or by a time bucket. |
| `scatter` | How do two measures relate across items? | Items with two integer fields. |
| `plan` | Where in the room is something true? | Items with a position pair. |
| `map` | Where on Earth is something true? | Items with a location field. |

### 5.1 `line`

| Member | Value |
| --- | --- |
| `x` | A `time` field (a `fact-time` selection is one), or the `time` of a journal row. |
| `y` | An `int` field, or an aggregate `{ "op": ..., "field": ... }` when `bucket` is present. |
| `bucket` | Optional. `hour`, `day`, `week` or `month`, in UTC. Weeks start on Monday. |
| `color` | Optional. An `enum` field, or `"item"` for one series for each item. At most 4 series. |
| `band` | Optional. `{ "source": ..., "item": ..., "low": ..., "high": ... }`: two `int` fields of a source of the same projection that reads one item. `item` is required when that source reads a chosen item. |
| `events` | Optional. `{ "source": ..., "label": ... }`: a journal source of the same projection. Each row draws a marker at its time. |

Without `bucket`, each row is one point. With `bucket`, each bucket is one
point. The frame labels the latest value at the end of each line, instead
of a legend.

### 5.2 `bar`

| Member | Value |
| --- | --- |
| `x` | An `enum` field, the `state` of the row, a `text` field, or a time field with `bucket`. |
| `y` | An aggregate `{ "op": ..., "field": ... }`. `count` needs no field. |
| `bucket` | Required when `x` is a time field. |
| `label` | Optional. A `text` field shown on each bar. |

Bars are horizontal and ranked by value, largest first. Equal values sort
by `x`. A time bucket draws columns in time order instead. A block shows at
most 24 bars and states how many it leaves out.

### 5.3 `scatter`

| Member | Value |
| --- | --- |
| `x`, `y` | Two `int` fields of a source that reads many items. |
| `color` | Optional. An `enum` field with at most 6 values. |
| `label` | Optional. A `text` field. A tap on a point shows it. |

Each item is one point. A source reads at most 100 items, so a block draws
at most 100 points.

### 5.4 `plan`

| Member | Value |
| --- | --- |
| `position` | The name of a position pair that the package declares (section 6), or `{ "x": ..., "y": ... }`. |
| `color` | An `enum` field, the `state` of the row, or an `int` field. |
| `label` | Optional. A `text` field. |

Each position field has at most 64 values. An `int` field's declared range
can span at most 64 integers, and an `enum` field has at most 64 values. A
wider field is refused with `position-range`. A plan therefore has at most
4,096 cells.

A plan has no axes. Its cells keep equal width and height. An `enum` colour
takes the fixed categorical palette. An `int` colour takes a sequential
ramp from the field's declared minimum to its declared maximum.

### 5.5 `map`

| Member | Value |
| --- | --- |
| `location` | A `location` field (section 7). |
| `color` | Optional. An `enum` field, the `state` of the row, or an `int` field. |
| `label` | Optional. A `text` field. |
| `outline` | Optional. `"world"` (the default) or the name of an outline that the package declares. |

Each item is one dot. Items with no location appear in a count under the
map.

## 6. Positions and outlines

A plan places items by two fields. A position field is one of these:

- an `int` field with a declared minimum and maximum;
- an `enum` field, in the order that the definition declares its values.

A decimal measure in dap is an `int` with a presentation scale, so an
`int` field also covers decimal positions.

The x field runs left to right. The y field runs top to bottom. The plan
has one cell for each pair of values in the two ranges. When two items
share a cell, the cell takes the colour of the item with the lowest id and
shows the count. A tap on the cell lists the items.

The package presentation can name position pairs and supply an outline. Both
are presentation changes only. They keep the semantic id.

```json
"positions": {
  "bench": { "projection": "layers", "source": "bench", "x": "column", "y": "row", "outline": "house" }
},
"outlines": { "house": "outlines/house.json" }
```

A package declares at most 8 outlines. Section 6.1 gives their form.

Grow is the test case. Each bench has `row`, an enum from `A` to `J`, and
`column`, an int from 1 to 10 (`examples/grow/work.ts`). A plan over the
`bench` source with these two fields draws the 100 benches in their room
layout. Today a package surface draws that grid with its own HTML and
script (`examples/grow/check/grid.html`). The plan answers the same question
with no package code.

### 6.1 Outline format

An outline lets the frame draw walls, zones or borders behind the marks. An
outline asset is one JSON object of at most 32 KiB of canonical JSON:

```json
{ "v": 1, "kind": "plan",
  "paths": [ { "points": [[0, 0], [500, 0], [500, 1000], [0, 1000]], "closed": true, "label": "Zone 1" } ] }
```

| Member | Value |
| --- | --- |
| `v` | `1`. |
| `kind` | `plan` or `geo`. |
| `paths` | A list of 1 to 256 paths. |
| `points` | A list of 2 to 4,096 points. Each point is a pair of integers. All paths together hold at most 8,192 points. |
| `closed` | `true` joins the last point to the first. |
| `label` | Optional text, 1 to 40 bytes. |

The two kinds use different coordinates:

- **`plan`.** A point is `[x, y]` in hundredths of a cell, from the top
  left corner of the plan. x is from 0 to 100 times the number of columns.
  y is from 0 to 100 times the number of rows. The position pair that names
  the outline fixes the columns and rows.
- **`geo`.** A point is `[lon, lat]` in microdegrees of longitude and
  latitude, within the bounds of section 7.1. The coordinates are not
  projected. The frame projects them for the map.

Package validation checks each outline with the presentation. A point out of
range, a wrong kind or an oversized asset is refused. A position pair names
only a `plan` outline. A map block names only a `geo` outline.

## 7. Location values and maps

A map needs a place on Earth for each item. The contract has no field type
for that today. This design adds one.

### 7.1 Location field type

A `location` value is a record of two integers in microdegrees (millionths
of a degree):

```json
{ "lat": 40712800, "lon": -74006000 }
```

- `lat` is from -90,000,000 to 90,000,000.
- `lon` is from -180,000,000 to 179,999,999.
- One microdegree is about 0.11 m at the equator.

A definition declares the field as `{ "type": "location" }`. Two locations
are equal when both members are equal. The contract defines no other
operation on them. Canonical JSON writes the value as it writes any record.
The type joins the field types in `packages/contract/src/definition.ts`, so
it needs a new contract revision.

### 7.2 Outlines behind the dots

The map draws dots over country borders. By default it sends no request to
any third party.

The composed resource bundles public-domain country borders at 1:110m
scale. In a compact topology format these are 107,761 bytes (measured). A
decoder for that format is 7,169 bytes, and a projection module is 36,329
bytes (measured, minified). Together they add about 151 KB. That is 14% of the
1 MiB resource budget (estimate from the measured parts).

A package can declare a finer regional outline, such as states or sales
territories, as a `geo` outline. The 32 KiB bound of section 6.1 applies.
The state borders of one large country at 1:10m scale are 114,554 bytes in
longitude and latitude (measured). A package outline of that kind must be
simplified to fit. The same borders also exist already projected to a plane,
in 82,031 bytes (measured). Projected coordinates are not a `geo` outline.

The map uses one projection, Equal Earth, for the bundled borders and for
package outlines. The frame fits the view to the extent of the dots, with a
10% margin and a span of at least 2 degrees. A map has no zoom and no pan.

### 7.3 Map tiles

Map tiles from a tile server are not part of this design. A tile server
would receive each viewer's map view. Also, the resource policy is one
policy for every room on a host, so one room cannot opt in alone.

## 8. Reads, filters and aggregation

### 8.1 What a block reads

Every block reads the declaration's `scope`. The view session accepts the
scope only when both of these hold:

- the scope's genesis pins the definition of every block's projection;
- the scope belongs to the installation. It is the installation's
  application scope, or its genesis names as creator a scope that belongs
  to the installation.

The session reads each genesis in that chain and follows at most 4 creator
steps. It never searches for a scope or guesses one. Otherwise it refuses
the declaration with `scope`. For Grow, the Site is the installation's
application scope, and the Site created Room A, so Room A belongs to the
installation.

A source that reads one chosen item takes the block's `item` as its item
selection. A missing or unknown item refuses the read with `item`.

The view session reads the named projection through the current read
path, at one head for all sources of the block. The current bounds apply
(`packages/bytes/src/application-projection-types.ts`):

- a `many` source returns at most 100 items, and a larger set refuses the
  read as `incomplete`;
- a journal source reads at most the last entries of its declared window,
  1 to 100, at the head;
- one projection result is at most 256 KiB.

A block covers only the rows that the read returns. A `line` or a time
`bar` states the range it covers. When a journal source returns as many
entries as its declared window, the block says that older entries are not
shown.
Longer history needs a history read. This design does not add one.

### 8.2 Filters

A filter is a list of conditions. A row passes when every condition holds.

```json
"filter": [
  { "field": "state", "op": "in", "value": ["fresh", "stale"] },
  { "field": "probeTime", "op": "within", "value": "P7D" }
]
```

| Field type | Operators | Value |
| --- | --- | --- |
| `int` | `=`, `!=`, `<`, `<=`, `>`, `>=` | An integer in native units. |
| `enum`, `text`, `state` | `=`, `!=`, `in` | A string, or a list of 1 to 16 strings for `in`. |
| `bool` | `=` | `true` or `false`. |
| `time` | `<`, `>`, `within`, `older-than` | An RFC 3339 UTC time for `<` and `>`. A duration `PnD` or `PTnH` for the others, at most 366 days. |

The view session compiles each filter to one `restricted@1` expression and
evaluates it with the current evaluator. A view therefore has one
expression language. That profile reads no clock. So before it evaluates
a filter, the session converts each time field in the input to integer
milliseconds since 1970-01-01T00:00:00Z. It also replaces each relative
duration with a fixed bound. That bound is the session's read time minus
the duration. The frame shows that read time as the view's "as of" time.

Null values and times follow fixed rules. The compiler writes them into
each expression, so the evaluator's own null handling never decides a
result:

- A condition on a null value is false. The one exception is `!=`: it is
  true for a null value.
- `within` passes a time t when bound ≤ t ≤ read time.
- `older-than` passes a time t when t < bound.
- A time after the read time passes neither `within` nor `older-than`.
- `<` and `>` compare strictly.

Filters are presentation only. They grant nothing and hide nothing that the
viewer cannot read in another way.

### 8.3 Aggregation

The view session aggregates. The frame receives buckets and marks, not raw
rows.

| Operation | Result |
| --- | --- |
| `count` | The number of rows. |
| `sum` | The exact integer sum. A sum outside the safe integer range is an error. |
| `mean` | The sum divided by the count, rounded half away from zero to the field's native unit. |
| `min`, `max` | The smallest or largest value. |

Edge rules:

- `count` with no field counts rows. `count` with a field counts the rows that
  have a value in that field. The other operations use only values that
  are not null.
- A bucket or group with no rows has no mark. For `sum`, `mean`, `min` and
  `max`, a bucket or group whose values are all null has no mark either. The
  block summary names it as having no values.
- A bucket starts at its first instant and ends before the next bucket
  starts, in UTC.
- Line points sort by x. Equal x values sort by item id, then by journal
  position. Series sort by the declared order of the colour field's values,
  or by item id for `"item"`. More than 4 series refuses the block with
  `series-limit`.
- A row with a null x, y, position or location has no mark. A null colour
  draws the mark in the neutral colour, labelled "none". The block summary
  counts the rows that it leaves out.
- A bar group with a null x is labelled "none" and sorts last.

Byte bounds:

- A mark label is cut to at most 80 bytes, at a character boundary, and ends
  with an ellipsis.
- A block summary is at most 1 KiB.
- The session builds the whole mount, with its outlines, and then applies
  the current 64 KiB check to its canonical JSON. A larger mount refuses the
  view with `too-large`. The error states each block's size, so the model
  can narrow its filters. The session drops nothing silently.

## 9. Freshness and marks

### 9.1 "As of" and stale data

Each mount carries its read point: the scope, the head position and hash,
and the session's read time. The frame shows the read time as "as of".

The frame reads again after each `refresh` interval. Data is stale in two
cases:

- the last good read is older than two refresh intervals;
- the latest read refused, for example as `stale` or `incomplete`.

A stale view keeps its last marks, draws them in grey, and shows "stale
since" with the time and the reason.

### 9.2 Marks open cards

The package presentation can map an item type to one of its own views:

```json
"opens": { "bench": "bench", "zone": "zone" }
```

A tap on a mark shows the mark's exact values, its time and its item label.
When the mark stands for one item, the frame also offers to open that item
in the mapped view. It opens the view through `view_read` with the
declaration's scope and the item's id. It never looks an item up by its
label. A mark that aggregates several items opens nothing. A type with no
mapped view shows values only.

## 10. Catalogue, errors and repair

### 10.1 Catalogue

`view_catalogue` takes an installation item id. It returns only what a model
needs to write a declaration:

- the scopes that a declaration can name in `scope`. The first is the
  installation's application scope. Then come the scopes that `scope`
  references in items of listed scopes name, up to 4 steps and 32 scopes.
  Each comes with its definition and a label;
- each projection and source of the package, with the source's read form and
  row limit;
- each field, with its type, bounds, enum values in declared order,
  nullability, and the label, scale and unit that the presentation gives;
- the position pairs and location fields, and the outlines;
- the default kind for each source (below);
- the acts that the viewer holds, with their labels and parameters. The
  model then sends a request to act to chat and the input tools;
- one worked example for each kind, built from this installation's sources
  where it can.

Default kinds:

| Source shape | Default kind |
| --- | --- |
| A time field and an integer field | `line` |
| An enum or label field and an aggregate | `bar` |
| Two integer fields for each item | `scatter` |
| A position pair | `plan` |
| A location field | `map` |

The package presentation can give each source field a label, a scale and a
unit:

```json
"fields": { "layers.bench.moisture": { "label": "Moisture", "scale": 0, "unit": "%" } }
```

Axes, legends and tap details use these. A field with no entry shows its
name and its native integer.

A catalogue is at most 64 KiB. A larger catalogue returns its sources in
pages.

### 10.2 Errors

`view_compose` checks the whole declaration and returns every error at
once. Every error has the same five members:

| Member | Value |
| --- | --- |
| `code` | One code from the list below. |
| `pointer` | A JSON Pointer (RFC 6901) to the member at fault. |
| `message` | One sentence. |
| `allowed` | The allowed values, at most 64, in catalogue order. An empty list when the member has no finite set of values. |
| `more` | The number of allowed values that the list leaves out. `0` when it lists them all. |

The `more` member tells a model that the list is cut. It is the only member
beyond the four that the request names.

Codes: `version`, `unknown-member`, `missing-member`, `bytes`, `title`,
`installation`, `scope`, `item`, `block-limit`, `kind`, `projection`,
`source`, `field`, `field-type`, `channel`, `series-limit`, `aggregate`,
`bucket`, `filter-operator`, `filter-value`, `position`, `position-range`,
`location`, `outline`, `overflow`, `too-large`.

For example:

```json
{ "code": "field", "pointer": "/blocks/0/color",
  "message": "The source bench has no field moist.",
  "allowed": ["moisture", "ec", "ph", "state", "label"], "more": 0 }
```

### 10.3 Repair

`view_compose` takes an `attempt` number from 1 to 3. The first call is
attempt 1. The model can repair the declaration twice. When attempt 3 also
fails, the result tells the model to stop and to answer in text.

Repair fixes declarations that are not valid. It does not fix a valid chart
that answers the wrong question. The acceptance check measures both
(section 14).

## 11. Kept and shared views

A person can keep a composed view. A kept view is a room item, so it lasts
across chats and it can be shared.

The next Rules version adds a `view` item type with three acts:

| Act | Does | Needs |
| --- | --- | --- |
| `keep-view` | Opens a `view` item with the installation, a name of 1 to 64 bytes and the declaration as text of at most 8 KiB. The signer is its keeper. | `views.keep` |
| `share-view` | Marks the view as shared. | `views.share` |
| `drop-view` | Closes the view. | its keeper, or `views.share` |

A name is unique among the open views of one installation. A Rules scope
holds at most 256 open views.

The declaration holds its `scope` and any `item` values, so a kept view
reads the same scope and items each time it opens.

The native act stores the declaration as text. It does not check the
declaration. `view_open` checks it each time it mounts the view, against the
installation as it is then. A kept view that no longer passes shows its
errors instead of a chart.

`view_open` with no name lists the viewer's own kept views and every shared
view. It does not list another member's unshared views. That rule governs
lists, not secrecy: any member who can read the Rules journal can read every
kept declaration.

A kept view can become part of the package. The declaration moves into the
presentation's `views` as a view of kind `chart`, with the same blocks.
That is a presentation change, so it keeps the semantic id. It reaches a
room in the next release, through the normal review and install.

## 12. Renderer and resource

The composed resource `ui://dap/composed` holds the current kit, a chart
renderer and the bundled country borders.

- The renderer is our own SVG code. It never calls `eval` or `new Function`.
  The MCP Apps resource policy does not allow them.
- Colours come from the host's CSS variables. The categorical palette has 6
  colours, chosen to stay distinct for common colour-vision deficiencies.
- Each block fits a 720 px card and stays readable at 320 px. Ranked
  horizontal bars, at most 4 series and labels at line ends make that work.
- Each block also has a text summary: the latest value of each series, the
  top bars, or the count in each colour. The model and screen readers read
  the summary.

Today each kit resource is about 37 KB, and a resource can be 1 MiB
(`packages/mcp/src/views/resources.ts`). The renderer, the borders and the
map code fit in that budget with room left (section 7.2).

## 13. What changes where

| Place | Change |
| --- | --- |
| Contract | The `location` field type, in a new contract revision. |
| Platform | The next Rules version adds the `view` item and its three acts. |
| Package presentation | Optional `fields`, `positions`, `outlines` and `opens` members, and the `chart` view kind. All are presentation changes. |
| MCP server | `view_catalogue`, `view_compose` and `view_open`; declaration checks; filter compilation; aggregation in the view session. |
| View kit | The composed resource, with the renderer and the bundled borders. |
| Grow package | A `bench` position pair and field labels, as a presentation change. |

Declared views must reach `dap mcp --generic` and the hosted endpoint
before composed views can (section 3).

## 14. Acceptance check

The check uses a fixed set of room questions and a real chat model through
an MCP Apps host.

| Room | Question | Expected |
| --- | --- | --- |
| Grow | How is EC trending in zone 2? | `line` |
| Grow | Where is it too dry right now? | `plan` |
| Grow | Does runoff EC track feed EC across benches? | `scatter` |
| Software work | Changes landed per day this week | `bar` with day buckets |
| Software work | Do big changes wait longer for review? | `scatter` |
| Sales | Pipeline by stage | `bar` |
| Sales | Deal size against days in stage | `scatter` |
| Sales | Prospects by territory | `map` |
| Lending | Loans per month | `line` or `bar` |
| Lending | Where are the overdue books shelved? | `plan` |
| Grow | Which benches need water? | text, not a chart |
| Software work | What is waiting on review? | text, not a chart |

Each question runs three times. The check reports:

- the first-pass validity rate: the share of first attempts that pass;
- the validity rate after repair: the share that pass within three attempts;
- the wrong-chart rate: in a reviewed sample of valid charts, the share
  that do not answer the question (wrong field, aggregate, filter or kind);
- for the two text questions, whether the model answered in text.

Targets: 85% on the first pass, 95% after repair, and at most 10% wrong
charts in the reviewed sample.

The Grow plan is a separate pass condition. A composed plan over the
`bench` source draws 100 benches in a 10 by 10 layout, coloured by
moisture. A tap on a bench opens the bench card. The package adds no code.

## 15. Evidence

These findings shaped the kinds and the rules. Each carries its evidence
label: measured, survey, catalog, proxy, estimate or opinion. The research
reports are outside this repository.

| Finding | Label |
| --- | --- |
| A time-series chart is on 75% to 95% of operational dashboards in three public corpora of 2,851 dashboard files. | measured |
| A bar chart is in 60% of 25,620 public business dashboards from one service. Bars are 30.9% of charts in one news chart service. | measured |
| 70% to 76% of surveyed practitioners use scatter plots. Scatter is 24.4% of charts in one public spreadsheet chart corpus. | survey; measured |
| Status grid panels for operations tools have 67 million to 863 million downloads. | proxy |
| Every surveyed industrial and device monitor tool offers a site or floor view. | catalog |
| In three public corpora of operational dashboards, a map is on 0.6%, 23.6% and 9.9% of dashboards. Maps are 15.1% of charts in one news chart service and appear in 25% of public business dashboards from one service. One business service reports maps as under 1% of its visualizations. | measured |
| In one tool's usage logs, people changed the automatically chosen mark type in 560 of 8,248 field placements (6.8%). | measured |
| A schema with actual enum values in the prompt raised accuracy by up to 8.6 points. Two unused tables in the prompt cost 9.4 points. | measured |
| Errors that list the allowed values raised task success from 14 of 50 to 36 of 50. | measured |
| One general chart grammar passed validity in 84.5% of first attempts, 95.3% after one repair and 96.1% after two. | measured |
| In one benchmark, wrong charts (21.4%) outnumber charts that fail to run (3.3%). | measured |
| In one study, 73.8% of errors were in the data part of the chart specification. | measured |
| A general chart grammar runtime is 779,077 bytes, 74% of the 1 MiB resource budget, and it needs run-time code generation. | measured |
| A small set of chart modules is 105,913 to 122,553 bytes, with no `eval`. | measured |
| Pie charts are 3% to 7% of measured charts, although 62.5% of practitioners report that they make them. | measured; survey |
| Several model-authored interface formats chose a few fixed chart kinds rather than a grammar. | catalog |

No published test compares a grammar subset with a small set of chart kinds
for model validity. The acceptance check in section 14 measures that for
dap.

## 16. Not in this design

- **Code in a nested frame.** A view could run model-written code in a
  nested frame with an opaque origin and no network. The code would talk to
  the kit by message. Whether MCP Apps hosts allow that nested frame under their
  content security policies is not known. This design does not depend on
  it.
- **Map tiles** (section 7.3).
- **State timelines.** These need a projection that exposes a field's
  state changes over time.
- **Cross-filtering, brushing, zoom, pan and drill-down.**
- **Acts on many items at once.** The carousel takes items one at a time.
- **History reads** beyond a journal source's declared window (section 8.1).
