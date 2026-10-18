# A grow operation as a dap application: the interaction and the build

17 October 2026. Design note for review. It describes a second application
on the same fabric as the journey: a growing operation whose people,
agents and sensors share one room. It says what each member sees and does,
and how the application is built once the
[self-contained applications](2026-10-15-self-contained-applications.md)
direction and a generic view description exist. It commissions nothing.
Plan 032 keeps the journey as the main line; this application follows the
journey's exit test (section 7).

The direction was chosen on 17 October after two throwaway prototypes in a
desktop AI app (section 5). The application is fictional. No grower, device
or site is real.

## 1. Why this application

The journey shows software work: a request, a question, a review, a
landing. Everything that needs a person needs them because a review or a
decision is theirs. This application tests three things the journey
cannot:

- **Whether the card kit is generic.** The
  [compact cards design](2026-10-17-compact-cards-design.md) says the kit's
  card takes an item kind, the displayed revision, an actor chip, the
  reasons this item needs this person, at most two acts bound to that
  revision, a one-line model context and a text fallback, and knows
  nothing about lanes. A live temperature grid with an alert is as far
  from a change review as an item gets. If the same card carries it, the
  kit is generic.
- **Authority as the reason something needs you.** A climate agent may
  move vents and fans. It may not touch a heater. The card shows the
  agent's own acts as entries and asks the operator only for what the
  agent may not do. This is the rule question "is this act allowed in this
  context", made visible.
- **A live surface that is also the record.** Readings arrive on their
  own clock. A fault appears, the agent acts, an alert fires, a person
  intervenes, the room recovers, and the incident closes with its entry
  range. The surface the person watches and the journal that outlives the
  service are the same thing.

A fourth point is the one the prototypes made obvious: the card is the
primary place to act, and the chat beside it works just as well. The model
reads a one-line context at every change and calls the application's tools
when asked. Neither replaces the other.

## 2. The operation

A site with three grow rooms. Each room is a 10 × 10 grid of cells, rows A
to J, columns 1 to 10, in four zones. Each zone has a vent, a fan and a
heater. The setpoint is 24° with a band of ±2°. Benches carry plants;
tenders probe them by hand for moisture, conductivity and acidity, measure
height, and count what the sticky traps caught.

The members of the room:

| Member | Kind | Controller | What they may do |
|---|---|---|---|
| Operator | person | | Heaters, setpoint and band; authorize what an agent may not do |
| Head grower | person | | Watering outside the schedule; chemical applications, with a record |
| Day tender, night tender | people | | Probe benches, take tasks, report with evidence, arrive and leave |
| Climate agent | agent | the operator | Vents and fans, inside each zone's limits; raise alerts |
| Irrigation agent | agent | the head grower | Water inside the schedule and amounts; ask for more |
| Room sensors | agent | the operator | Report readings and device states; nothing else |

Every agent names its controller, as the journey's design requires. The
model in a member's own AI app is not a member. When it acts on the
member's behalf, the act is the member's, signed by the host with that
member's key, and the card shows it as theirs.

## 3. Authority

Authority is declared twice, as the
[application guide](../docs/write-an-application.md) describes: an act's
`grant` names the action its signer must hold, and membership says which
role holds which action; the act's guards then decide whether this act,
on this item, in this state, may take effect. Being allowed an action does
not replace the guards.

| Action | Roles | Acts it covers |
|---|---|---|
| `grow.sense` | sensors | `observe`: a reading or a device state |
| `grow.climate` | climate agent, operator | `set-device` on a vent or a fan; `raise-alert`; `close-incident` |
| `grow.heat` | operator | `set-device` on a heater; `set-band`; `authorize` an alert's proposal |
| `grow.water` | irrigation agent, head grower | `water` inside the schedule |
| `grow.water-more` | head grower | `approve-watering` outside the schedule |
| `grow.apply` | head grower | `apply`: a chemical application, with product, rate and reason |
| `grow.tend` | tenders | `probe`, `take-task`, `report-task`, `arrive`, `leave` |

Three guards carry the rest of the story:

- `set-device` reads the device's kind. A heater needs `grow.heat`; the
  guard refuses the climate agent even though it holds `grow.climate`.
- A device in the `error` state refuses `set-device`, and the refusal
  quotes the description the sensors wrote. `error` is the one state for
  every failure; the description says which. The definition does not
  enumerate failure modes.
- `raise-alert` needs the zone out of band and the agent's own devices at
  their limits. An agent cannot ask a person to do its work for it.
- `authorize` and `hold` name the alert's revision. An authorization of
  version 1 after the hold has produced version 2 is refused as stale, in
  one line, and never applied to the new version.

A timed rule returns a held alert to open after 60 seconds, as a new
revision. Another marks a bench stale when no probe has been recorded for
48 hours.

## 4. The interaction

Each member opens the application in their own AI app, on a laptop or a
phone. The chat carries the narration. The cards carry facts and buttons.

### Morning

The operator asks for the site. An overview card shows the three rooms as
a strip: each room's name, how many of its cells are in band, who is in
it, and whether anything is open. Clicking a room opens its grid card.

The grid card is a heatmap of the hundred cells, a legend with the band,
the count in band with min, mean and max, and one row per zone with its
mean and its three devices. A line under the grid shows what the climate
agent is doing, or that all zones are in band. The card refreshes itself.
Clicking a cell or a zone row opens the zone: a sparkline of its recent
readings against the band, its devices, the two authority rules that
apply, and two acts, which for the operator are heater on or off and vent
open or closed. Back returns to the grid.

The day tender arrives, which is an act. On her phone, "what needs me" is
a carousel, one bench at a time: the benches whose last probe is oldest,
with the last reading and its age. She types "bench C4, moisture 31,
EC 2.1, pH 5.9" into the chat; the model makes the `probe` act for her;
the card advances to the next bench. The grid gains layers: temperature,
moisture, scouting. Each layer shades cells by value and by the age of
the reading, so a bench nobody has probed for two days is visible from
across the site.

### The fault

Vent 2 in room A reads closed with no response to its command. The sensors
record the device as in error, with that description. Zone 2 starts to warm. The climate agent raises fan 2 to full;
the fan trips; the agent opens vents 1 and 4 to full for a cross-draft.
Each of these is an entry, marked as within its authority. The grid shows
zone 2 turning amber, then red, with its row highlighted and its devices
in red.

When zone 2 is out of band and the agent's own devices are at their
limits, the agent raises an alert. Two different cards reach two different
people:

- **The operator** sees the alert at the top of the grid card: "Zone 2 is
  at 27.4° and rising: vent 2 reads closed and does not respond, and fan 2
  has stopped on an overcurrent trip. Cut heater 2 and hold it off until
  zone 2 is back in band. Heaters are outside my authority." The two
  device facts are the sensors' own descriptions, quoted. Two acts, Authorize and Hold 60 s, and a link
  that hands the question to the model in the chat. The model's context
  says what is open and who it waits on.
- **The day tender**, who is in room A, sees a task in her carousel:
  "Check vent 2's actuator in room A, zone 2." She takes it with one tap,
  walks over, frees the jammed vane, and reports it. The report carries a
  photo, kept in the room's custody. The sensors then record vent 2 open.

The operator authorizes. Heater 2 goes off, with the authorization and
the agent's act as two entries. The zone cools. The agent returns vents 1
and 4 to normal, and, because vent 2 is free again, asks once more: "Vent
2 is responding. Restore heater 2?" That too needs the operator, so it is
one more card with two acts. When every cell of zone 2 is in band the
agent closes the incident. The grid card shows "Incident 1 closed · entries
302–318" and fan 2 flagged for maintenance.

### A second thread at the same time

While the incident is open, the irrigation agent finds conductivity high
on row D and wants to water it before its scheduled time. That is outside
its schedule, so it asks the head grower. The head grower's carousel shows
one item: the request, the readings it rests on, and Approve or Decline.
Two things needing two people at once is what the per-member carousel is
for. Neither person sees the other's item unless they ask.

### The record

Anyone can ask "what happened in room A today?" The model answers from the
journal, through the application's read tool, and names the entries. At
the end of the day the room's journals are archived under the
[journal archive design](2026-10-09-shared-language-volatile-acts.md#15-journal-archive-in-git-amendment-12-october-2026),
so the record outlives the service.

### What the cards do not do

They do not restate themselves in the chat. An ordinary act updates the
card in place and records a receipt in the model's context; the chat
receives a message only when the person hands off to the model. They do
not act on a stale revision. They do not let an agent's screen sign a
person's act, or a person's screen sign a room act: the host signs only
the installation's own declared acts, as section 5.1 of the applications
note requires.

## 5. What the prototypes showed

Two throwaway prototypes ran inside a desktop AI app under the MCP Apps
extension, with fictional data and no room. They are behaviour references,
outside the repository; no code from them is proposed for it.

The first was one card that advanced in place through a software task:
asked, working, question, review, landed. The second was the grow room of
section 2 with one zone, a fault on a timer, the agent's own acts, an alert
with Authorize and Hold, a zone screen with a sparkline and two acts, a
vent in error that refused a command, recovery, and a closed incident with
its entry range.

What held in both:

- The card was the primary place to act, and the chat worked equally well.
  The model called the application's tools when asked and otherwise stayed
  quiet, because the tool text described the card instead of its data and
  the context line told it what was on screen.
- A view that polls through the host kept a live surface current without
  a chat turn. The frame grew and shrank with its content.
- An old card refused an out-of-date act in one line.
- Authority as the reason for an alert read naturally: the agent's acts
  were entries, and the card asked only for what it may not do.

What they did not show: more than one person; a phone; a real device; a
host that pushes changes to a view instead of being polled; and media in
custody.

## 6. How it is built

### 6.1 The package

One package, under the applications note's section 4: a manifest, one or
more definitions, read projections, presentation, act descriptions,
scenarios and an upgrade path.

**Scopes.** One `site` scope for the site, and one `room` scope per grow
room. The site scope holds the rooms and who is present where. A room
scope holds its zones, devices, benches, readings, alerts, incidents,
tasks and watering requests. Two scopes share no storage, so a room's
incident never waits on another room.

**Items.** `zone` (band, setpoint, state in or out of band; refs to its
devices), `device` (kind; state `open`, `closed`, `on`, `off` or `error`;
level; and, in `error`, the description the sensors wrote, such as
"commanded open, reads closed, no response"), `bench` (last probe values and the entry that recorded
them), `alert` (states `open`, `held`, `authorized`, `closed`; parties: the
agent that raised it and the member who authorized; values: text,
proposal, revision), `incident` (refs to its alert and its first and last
entries), `task` (states `offered`, `taken`, `done`; party: the performer;
ref: the report's evidence) and `watering` (states `asked`, `approved`,
`declined`, `done`). Each change to an item raises its revision, and an
act names the revisions it expects.

**Acts.** Section 3 lists them with their actions. `observe` is a
comment-form act: it writes a reading summary and any device state change,
and nothing else. `set-device` is a transition with the device-kind guard.
`raise-alert` opens an alert; `authorize`, `hold` and `close-incident`
transition it. `probe`, `take-task` and `report-task` are the tenders'
acts. `arrive` and `leave` are comment-form acts on the site scope.

**Timed rules and handlers.** The hold expiry and the stale-bench rule are
timed rules. A handler lets the site scope receive each room's open-alert
count, so the overview reads one projection.

**Capabilities.** The package requests two. First, a bounded outside read
of the sensor gateway's latest samples, so the live grid shows the current
second without an entry per second; the journal keeps what decisions
depend on, not every sample (section 6.4). Second, custody of files sent
with a report, for the tender's photo. Notifications come later, with the
journey's attention work. Each capability is bounded by what the manifest
declares and the admin grants at install.

**Scenarios.** The fault story of section 4 is the package's first
scenario: readings, the agent's acts, the alert, a hold, an authorization,
recovery and closure, with the refusals of a stale authorization and of a
command to a device in error. `dap check` runs and replays it. The simulated
room from the prototype becomes that scenario's source of readings.

### 6.2 The views, described generically

The applications note puts presentation in the package as `ui://`
resources bound to the projections. This application adds the view
description that makes most of those resources unnecessary. The kit ships
the generic kinds; a package declares its views as data; the room's MCP
endpoint derives the tools; the kit renders each view inside any host.

A view declaration says, for one view:

- **its projection**: which read projection it shows, and for which item;
- **its kind**: `card` for one item, `carousel` for the items that need
  the viewer, `record` for a full item with Back, `log` for entries, or
  `surface` for a package-supplied resource such as the heatmap;
- **its fields**: which projection fields are the title, the summary, the
  actor chip and the facts;
- **its revision**: the field every act binds to;
- **its acts**: at most two, each with its act, its label, a rule
  expression saying when it is offered, and the action the viewer must
  hold for it to be offered at all;
- **its context**: a template for the one line the model keeps;
- **its fallback**: a template for the text a host without views shows;
- **its refresh**: how often the view asks the host for the projection
  again, until hosts can push;
- **its display**: inline or full screen, and what Back returns to.

Two of this application's views, as a sketch of the form:

```json
{
  "alert": {
    "kind": "card", "projection": "room.alert", "item": "alert",
    "title": "text", "summary": "proposal", "actor": "raisedBy",
    "revision": "revision",
    "acts": [
      { "act": "authorize", "label": "Authorize", "needs": "grow.heat", "when": "state = 'open'" },
      { "act": "hold", "label": "Hold 60 s", "needs": "grow.heat", "when": "state = 'open'" }
    ],
    "context": "Alert {id} v{revision} open: {text} The agent asks the operator to {proposal}",
    "fallback": "Alert {id}: {text} Proposal: {proposal}",
    "refresh": "2s", "display": "inline"
  },
  "grid": {
    "kind": "surface", "projection": "room.grid", "resource": "ui://grow/grid",
    "opens": { "zone": "zone", "alert": "alert" },
    "context": "{room}: {inBand} of 100 cells in band; {status}",
    "fallback": "{room}: {inBand} of 100 cells in band, min {min}, mean {mean}, max {max}. {status}",
    "refresh": "2s", "display": "inline"
  }
}
```

The `alert` card needs no package code: the kit renders it from the
declaration and the projection. The `grid` surface is static presentation
in the package, a heatmap that reads its projection through the host and
opens the declared zone and alert views. It can do nothing else, because
it runs in the sandbox origin with no keys (applications note, section
5.1).

From the declarations the room's MCP endpoint derives, for each view, a
tool the model may call, which returns the fallback text and the card's
identity, and a view-only tool, which returns the projection to the view.
The model never receives the card's data in its tool text; it receives
the context line through the host. This is the contract the journey's
cards design already states, applied to a second application.

The view description is part of the presentation id, not the semantic id,
so a room adopts a changed view with one `present` act and no new install.

### 6.3 The hosts

The same resources serve every host. A desktop AI app and a phone's chat
app render them under the MCP Apps extension, with the per-application
sandbox origin and the content security policy that the package's
resource metadata declares. The dap web host, when it exists, renders the
same resources in its own page. The kit's phone layout stacks the grid
above the zone rows from 320 px wide, with the targets the cards design
requires.

The model in each member's app sees that member's context and tools. The
host signs that member's acts with that member's key, so the irrigation
agent's request cannot be approved from a tender's app, however the model
is asked. Agents are members with agent keys and named controllers; the
climate agent runs wherever its controller runs it and signs with its
own key.

### 6.4 The record

The journal records what decisions depend on. Sensors write one reading
summary per room every five minutes, and a threshold entry when a zone
leaves or enters the band: a few hundred entries a day. The live grid
reads the gateway's latest samples through the bounded outside read, and
the zone sparkline reads the recorded summaries. The whole-scope capacity
bounds now being built apply to each room scope; a room's readings cannot
crowd out its acts, because the summaries are few and the acts are fewer.

Every act by a person or an agent is an entry. An incident's record is
its entry range. The day's journals are archived in Git and replay without
the runtime, which is the archive milestone's point. A reading summary
that fails to arrive is recorded as missing, not filled in.

## 7. Order and slices

This application follows the journey. It needs the S2 card kit, which the
journey builds, and M1 of the applications note, which makes a package
installable. It should not reorder plan 032. The slices, once both exist:

- **G0. Definition and scenario.** The `site` and `room` definitions of
  section 6.1 with their actions, guards and timed rules; the fault story
  as a scenario with a simulated source of readings; `dap check` passes
  and replays it. Done when the scenario's refusals and closures match
  section 4.
- **G1. Views on the kit.** The alert, zone, carousel and log views as
  declarations; the grid as a surface resource; the derived tools. Done
  when the operator's path of section 4 runs inside a test host with the
  kit's existing checks: app-only data, quiet context, receipts, stale
  refusals, resize.
- **G2. Measurements from the chat.** The tenders' probe act through the
  model, the bench carousel and the three grid layers. Done when a probe
  typed in a chat appears in the layer and advances the carousel.
- **G3. Routing.** Alerts to the holders of the authority they need, tasks
  to the tenders present in the room, requests to the head grower. Done
  when the fault produces the two cards of section 4 for two members and
  the watering request a third.
- **G4. Record and archive.** The incident's entry range, "what happened
  today" from the read tool, and the day's archive. Done when the archived
  journal replays and the model's answer names entries that exist.

Exit test: three people on their own devices, each in their own AI app,
in one room, through the fault story, with the agents running under their
controllers. The same shape as the journey's exit test, with different
people.

## 8. Open questions

1. **Pushing changes to a view.** Polling through the host every two
   seconds worked in the prototype. Whether hosts will let a server
   notify a view, and at what rate, decides the `refresh` field's future.
2. **Readings as entries or as outside reads.** Section 6.4 keeps samples
   outside the journal and summaries inside. The line between the two is
   a policy the package declares; the right default needs the capacity
   bounds to land first.
3. **Presence.** `arrive` and `leave` as acts are enough for routing. A
   device's own location is not used, and should not be without a
   separate decision.
4. **Evidence for a report.** A photo in custody is the first kind. What a
   report may claim from it, and who may read it, is the custody design's
   question, not this note's.
5. **The agent's limits as data.** Section 3 puts the climate agent's
   limits in guards. Whether a room's admin can change them without a new
   definition is the rules question the evidence-rules design opened for
   landings, applied to devices.

## Source

Written by the planner from the self-contained applications note (sections
3, 4, 5.1, 7 and 8), the compact cards design, the journey views design,
plan 032, the ten terms, the application guide, the use-case catalogue's
sweep entry for feeds and sensors, and the two prototypes of section 5.
The prototypes' observations were made on one desktop AI app and one
stand-in host; they claim nothing about other hosts. Nothing in this note
was run against the dap runtime.
