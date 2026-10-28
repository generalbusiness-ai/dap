/** The grow room in the v2 vocabulary. examples/grow/room.ts is the original. */
import type { Operand } from "@generalbusiness/dap-contract";
import { anyOf, by, constant, count, define, differs, enumOf, equals, fact, final, ifPresent, int, isFact, item, itemOf, live, none, nothing, now, open, optional, part, party, permit, plusSeconds, range, ref, refuse, relate, required, rule, scope, self, signer, text, theScope, time, timed, transition, value, via } from "./lib.ts";
import { deviceActs, deviceItem, deviceNotFailed, wateringForms, workForms, zoneActs, zoneItem } from "./grow-forms.ts";

export const ROOM = "grow-room", SITE = "grow-site";

// ---------------------------------------------------------------- items

const roomItem = item("room", {
  states: { open: live },
  refs: { site: ref.once(scope("lane")), siteRoom: ref.once(fact(SITE, "create-room")), lastSiteReport: ref.optional(fact(ROOM, "report-site")) },
  values: { label: value.fixed(text(80)) },
});
/** The room binds each zone to its three devices. */
const zone = zoneItem(ROOM, { vent: ref.optional(itemOf("device")), fan: ref.optional(itemOf("device")), heater: ref.optional(itemOf("device")) });
/** `authorize` also sets a device target; each device knows its zone. */
const device = deviceItem(ROOM, ["authorize"], { zone: ref.fixed(itemOf("zone")) });
const alert = item("alert", {
  many: 4,
  states: { open: live, held: live, authorized: live, closed: final },
  parties: { raisedBy: party.fixed, authorizedBy: party.optional, heldBy: party.optional },
  refs: { zone: ref.fixed(itemOf("zone")), heater: ref.fixed(itemOf("device")), first: ref.fixed(fact(ROOM, "raise-alert")), last: ref.optional(fact(ROOM, "close-incident")) },
  values: { text: value.required(text(1024)), proposal: value.required(text(1024)), target: value.required(enumOf("on", "off")), level: value.required(int(0, 100)), raisedTime: value.fixed(time), holdUntil: value.optional(time) },
});
const incident = item("incident", {
  many: 4,
  states: { open: live, closed: final },
  refs: { alert: ref.fixed(itemOf("alert")), first: ref.fixed(fact(ROOM, "raise-alert")), last: ref.optional(fact(ROOM, "close-incident")) },
});

const zones = zoneActs(zone, ROOM), devices = deviceActs(device);
const work = workForms(ROOM, { zone, device, alert });
const watering = wateringForms(ROOM, { zone, bench: work.bench });

// ---------------------------------------------------------------- combinators

const proposal = { text: required(text(1024)), proposal: required(text(1024)), target: required(enumOf("on", "off")), level: required(int(0, 100)) };
/** A heater is either off at level 0 or on at level 100. */
const heaterProposal = (f: { target: Operand; level: Operand }) => refuse("invalid-heater-proposal", anyOf(
  [equals(f.target, constant("off")), equals(f.level, constant(0))],
  [equals(f.target, constant("on")), equals(f.level, constant(100))],
));
const KINDS = ["vent", "fan", "heater"] as const;

// ---------------------------------------------------------------- the definition

export const room = define({
  name: ROOM,
  genesis: "establish",
  capabilities: [{ name: "device-command", version: 1 }],
  items: [roomItem, zone, device, alert, incident, ...work.items, ...watering.items],
  acts: {
    establish: open(roomItem, "grow.configure", { fields: { label: required(text(80)), site: optional(scope("lane")), siteRoom: optional(fact(SITE, "create-room")) } }, ({ f, on }) => ({
      // A room is either standalone or made by a site: both of site and siteRoom, or neither.
      guards: [anyOf([equals(f.site, nothing), equals(f.siteRoom, nothing)], [differs(f.site, nothing), differs(f.siteRoom, nothing)]), ifPresent(isFact(f.siteRoom)), ifPresent(equals(part(f.siteRoom, "scope"), f.site))],
      effects: [on.value("label", f.label), on.ref("site", f.site), on.ref("siteRoom", f.siteRoom)],
    })),
    "report-site": transition(roomItem, "grow.sense", { fields: { openAlerts: required(int(0, 4)) } }, ({ f, on }) => ({
      guards: [on.in("open"), on.set("site"), on.set("siteRoom"), refuse("wrong-alert-count", count(range(alert, ["open", "held", "authorized"]), { min: f.openAlerts, max: f.openAlerts }))],
      effects: [on.ref("lastSiteReport", self)],
      sends: [relate({ to: on.slot("site"), name: "room-summary", item: on.id, state: "reported", detail: { room: on.slot("siteRoom"), openAlerts: f.openAlerts }, result: { refused: [], undelivered: [] } })],
    })),
    ...zones.acts, ...devices.acts,
    "commission-device": open(device, "grow.configure", { fields: { ...devices.commission.fields, zone: required(itemOf("zone")) }, also: { zone: by(zone, "zone") } }, (ctx) => ({
      guards: [...devices.commission.guards(ctx), refuse("device-already-commissioned", none(range(device, ["active"], { where: (d) => [equals(d.slot("zone"), ctx.f.zone), equals(d.slot("kind"), ctx.f.kind)] })))],
      effects: [...devices.commission.effects(ctx), ctx.on.ref("zone", ctx.f.zone)],
    })),
    ...work.acts, ...watering.acts,
    "bind-zone-devices": transition(zone, "grow.configure", {
      fields: { vent: required(itemOf("device")), fan: required(itemOf("device")), heater: required(itemOf("device")) },
      also: { vent: by(device, "vent"), fan: by(device, "fan"), heater: by(device, "heater") },
    }, ({ f, on, also }) => ({
      guards: [on.in("unobserved", "in-band", "out-of-band"), ...KINDS.flatMap((kind) => [also[kind].in("active"), equals(also[kind].slot("kind"), constant(kind)), equals(also[kind].slot("zone"), on.id)])],
      effects: KINDS.map((kind) => on.ref(kind, f[kind])),
    })),
    "raise-alert": open(alert, "grow.climate", {
      fields: { zone: required(itemOf("zone")), ...proposal },
      also: { zone: by(zone, "zone"), vent: via(device, "also.zone", "vent"), fan: via(device, "also.zone", "fan"), heater: via(device, "also.zone", "heater") },
    }, ({ f, on, also }) => ({
      guards: [
        also.zone.in("out-of-band"), also.vent.in("active"), also.fan.in("active"), also.heater.in("active"), refuse("climate-actions-remain", rule("climate-exhausted")), heaterProposal(f),
        refuse("zone-alert-open", none(range(alert, ["open", "held", "authorized"], { where: (a) => [equals(a.slot("zone"), f.zone)] }))),
      ],
      effects: [on.party("raisedBy", signer), on.ref("zone", f.zone), on.ref("heater", also.heater.id), on.ref("first", self), on.value("text", f.text), on.value("proposal", f.proposal), on.value("target", f.target), on.value("level", f.level), on.value("raisedTime", now)],
    })),
    "open-incident": open(incident, "grow.climate", { fields: { alert: required(fact(ROOM, "raise-alert")) }, also: { alert: by(alert, "alert") } }, ({ f, on, also }) => ({
      guards: [isFact(f.alert), equals(part(f.alert, "scope"), theScope), also.alert.in("open", "held", "authorized"), also.alert.signer("raisedBy"), refuse("incident-exists", none(range(incident, ["open", "closed"], { where: (i) => [equals(i.slot("alert"), also.alert.id)] })))],
      effects: [on.ref("alert", also.alert.id), on.ref("first", f.alert)],
    })),
    hold: transition(alert, "grow.heat", {}, ({ on }) => ({ guards: [on.in("open")], effects: [on.to("held"), on.party("heldBy", signer), on.value("holdUntil", plusSeconds(60))] })),
    authorize: transition(alert, "grow.heat", { also: { heater: via(device, "on", "heater") } }, ({ on, also }) => ({
      guards: [on.in("open"), also.heater.in("active"), equals(also.heater.slot("kind"), constant("heater")), deviceNotFailed(also.heater), refuse("device-limit", rule("authorized-target")), permit("device-command", "allowed", { kind: also.heater.slot("kind") })],
      effects: [
        on.to("authorized"), on.party("authorizedBy", signer),
        also.heater.value("target", on.slot("target")), also.heater.value("level", on.slot("level")), also.heater.ref("targetAt", self), also.heater.capability("device-command", "open", { device: also.heater.slot("kind") }),
      ],
    })),
    "propose-restoration": transition(alert, "grow.climate", { fields: { text: proposal.text, proposal: proposal.proposal }, also: { zone: via(zone, "on", "zone"), vent: via(device, "also.zone", "vent") } }, ({ f, on, also }) => ({
      guards: [on.in("authorized"), on.signer("raisedBy"), also.zone.in("in-band", "out-of-band"), also.vent.in("active"), also.vent.set("reported"), deviceNotFailed(also.vent)],
      effects: [on.to("open"), on.value("text", f.text), on.value("proposal", f.proposal), on.value("target", constant("on")), on.value("level", constant(100)), on.party("authorizedBy", null)],
    })),
    "close-incident": transition(alert, "grow.climate", { fields: { incident: required(itemOf("incident")) }, also: { incident: by(incident, "incident"), zone: via(zone, "on", "zone") } }, ({ on, also }) => ({
      guards: [on.in("open", "held", "authorized"), also.incident.in("open"), also.zone.in("in-band"), on.signer("raisedBy"), equals(also.incident.slot("alert"), on.id), refuse("recovery-not-observed", rule("recovery-evidence"))],
      effects: [on.to("closed"), on.ref("last", self), also.incident.to("closed"), also.incident.ref("last", self)],
    })),
  },
  timed: { ...work.timed, "hold-expired": timed(alert, { states: ["held"], deadline: "holdUntil", effects: (a) => [a.to("open"), a.party("heldBy", null), a.value("holdUntil", null)] }) },
  rules: {
    ...zones.rules, ...devices.rules, ...work.rules, ...watering.rules,
    "climate-exhausted": "(subjects.`also.vent`.values.reported = 'error' or subjects.`also.vent`.values.level >= subjects.`also.vent`.values.maxLevel) and (subjects.`also.fan`.values.reported = 'error' or subjects.`also.fan`.values.level >= subjects.`also.fan`.values.maxLevel)",
    "authorized-target": "(subjects.on.values.target = 'off' and subjects.on.values.level = 0) or (subjects.on.values.target = 'on' and subjects.on.values.level = 100 and subjects.`also.heater`.values.minLevel <= 100 and subjects.`also.heater`.values.maxLevel >= 100)",
    "recovery-evidence": "subjects.`also.zone`.refs.summary > subjects.on.refs.first",
  },
});
export { alert, device, incident, zone };
