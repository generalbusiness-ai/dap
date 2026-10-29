/** Grow Room composes explicit modules. The original is examples/grow/room.ts. */
import type { Operand } from "@generalbusiness/dap-contract";
import {
  anyOf, by, constant, count, define, differs, enumOf, equals, fact, final,
  ifPresent, int, isFact, item, itemOf, live, none, now, open, optional, part,
  party, permit, plusSeconds, range, ref, require, relate, required, rule, scope,
  self, siblings, signer, text, theScope, time, timed, transition, value, via,
} from "./lib.ts";
import {
  deviceActs, deviceItem, deviceNotFailed, growVocabulary, wateringForms,
  workForms, zoneActs, zoneItem,
} from "./grow-forms.ts";

export const ROOM = "grow-room", SITE = "grow-site";
const vocabulary = growVocabulary();
const { g, r } = vocabulary;

// ---------------------------------------------------------------- items

const roomItem = item("room", {
  initial: "open", states: { open: live },
  refs: { site: ref.once(scope("lane")), siteRoom: ref.once(fact(SITE, "create-room")), lastSiteReport: ref.optional(fact(ROOM, "report-site")) },
  values: { label: value.fixed(text(80)) },
});
/** The room binds each zone to its three devices. */
const zone = zoneItem(ROOM, { vent: ref.optional(itemOf("device")), fan: ref.optional(itemOf("device")), heater: ref.optional(itemOf("device")) });
/** Each device knows its zone. authorize also sets its heater target. */
const device = deviceItem(ROOM, ["authorize"], { zone: ref.fixed(itemOf(zone)) });
const alert = item("alert", {
  many: 4,
  initial: "open", states: { open: live, held: live, authorized: live, closed: final },
  parties: { raisedBy: party.fixed, authorizedBy: party.optional, heldBy: party.optional },
  refs: { zone: ref.fixed(itemOf(zone)), heater: ref.fixed(itemOf(device)), first: ref.fixed(fact(ROOM, "raise-alert")), last: ref.optional(fact(ROOM, "close-incident")) },
  values: { text: value.required(text(1024)), proposal: value.required(text(1024)), target: value.required(enumOf("on", "off")), level: value.required(int(0, 100)), raisedTime: value.fixed(time), holdUntil: value.optional(time) },
});
const incident = item("incident", {
  many: 4,
  initial: "open", states: { open: live, closed: final },
  refs: { alert: ref.fixed(itemOf(alert)), first: ref.fixed(fact(ROOM, "raise-alert")), last: ref.optional(fact(ROOM, "close-incident")) },
});

const zones = zoneActs(zone, ROOM, vocabulary);
const devices = deviceActs(device, vocabulary);
const work = workForms(ROOM, { zone, device, alert }, vocabulary);
const watering = wateringForms(ROOM, { zone, bench: work.bench }, vocabulary);

// ---------------------------------------------------------------- combinators

const proposal = { text: required(text(1024)), proposal: required(text(1024)), target: required(enumOf("on", "off")), level: required(int(0, 100)) };
/** A heater is either off at level 0 or on at level 100. */
const heaterProposal = (f: { target: Operand; level: Operand }) => require(anyOf(
  [equals(f.target, "off"), equals(f.level, 0)],
  [equals(f.target, "on"), equals(f.level, 100)],
), r.invalidHeaterProposal);
const KINDS = ["vent", "fan", "heater"] as const;

// ---------------------------------------------------------------- the definition

export const room = define({
  name: ROOM,
  grants: g,
  reasons: r,
  genesis: "establish",
  capabilities: [{ name: "device-command", version: 1 }],
  items: [roomItem, zone, device, alert, incident, ...work.items, ...watering.items],
  acts: {
    establish: open(roomItem, g.configure, { fields: { label: required(text(80)), site: optional(scope("lane")), siteRoom: optional(fact(SITE, "create-room")) } }, ({ f, on }) => ({
      // A Site-created Room supplies both references.
      // A standalone Room supplies neither.
      guards: [
        anyOf(
          [equals(f.site, null), equals(f.siteRoom, null)],
          [differs(f.site, null), differs(f.siteRoom, null)],
        ),
        ifPresent(isFact(f.siteRoom)),
        ifPresent(equals(part(f.siteRoom, "scope"), f.site)),
      ],
      effects: [...on.take(f, "label", "site", "siteRoom")],
    })),
    "report-site": transition(roomItem, g.sense, { fields: { openAlerts: required(int(0, 4)) } }, ({ f, on }) => ({
      guards: [on.in("open"), on.set("site"), on.set("siteRoom"), require(count(range(alert, ["open", "held", "authorized"]), { min: f.openAlerts, max: f.openAlerts }), r.wrongAlertCount)],
      effects: [on.ref("lastSiteReport", self)],
      sends: [relate({ to: on.slot("site"), name: "room-summary", item: on.id, state: "reported", detail: { room: on.slot("siteRoom"), openAlerts: f.openAlerts }, result: { refused: [], undelivered: [] } })],
    })),
    ...zones.acts, ...devices.acts,
    // by(zone) also declares the required zone input field.
    "commission-device": open(device, g.configure, { fields: devices.commission.fields, also: { zone: by(zone) } }, (ctx) => ({
      guards: [...devices.commission.guards(ctx), require(none(device, ["active"], (d) => [equals(d.slot("zone"), ctx.f.zone), equals(d.slot("kind"), ctx.f.kind)]), r.deviceAlreadyCommissioned)],
      effects: [...devices.commission.effects(ctx), ctx.on.ref("zone", ctx.f.zone)],
    })),
    ...work.acts, ...watering.acts,
    "bind-zone-devices": transition(zone, g.configure, {
      also: { vent: by(device, "vent"), fan: by(device, "fan"), heater: by(device, "heater") },
    }, ({ f, on, also }) => ({
      guards: [
        on.in("unobserved", "in-band", "out-of-band"),
        ...KINDS.flatMap((kind) => [
          also[kind].in("active"),
          equals(also[kind].slot("kind"), kind),
          equals(also[kind].slot("zone"), on.id),
        ]),
      ],
      effects: [...on.take(f, ...KINDS)],
    })),
    "raise-alert": open(alert, g.climate, {
      fields: proposal,
      also: siblings({ zone: by(zone) }, ($) => ({
        vent: via(device, $.zone, "vent"),
        fan: via(device, $.zone, "fan"),
        heater: via(device, $.zone, "heater"),
      })),
    }, ({ f, on, also }) => ({
      guards: [
        also.zone.in("out-of-band"),
        also.vent.in("active"),
        also.fan.in("active"),
        also.heater.in("active"),
        require(rule("climate-exhausted",
          "(subjects.`also.vent`.values.reported = 'error' or " +
          "subjects.`also.vent`.values.level >= subjects.`also.vent`.values.maxLevel) and " +
          "(subjects.`also.fan`.values.reported = 'error' or " +
          "subjects.`also.fan`.values.level >= subjects.`also.fan`.values.maxLevel)"
        ), r.climateActionsRemain),
        heaterProposal(f),
        require(none(alert, ["open", "held", "authorized"], (a) => [equals(a.slot("zone"), f.zone)]), r.zoneAlertOpen),
      ],
      effects: [on.party("raisedBy", signer), on.ref("zone", f.zone), on.ref("heater", also.heater.id), on.ref("first", self), ...on.take(f, "text", "proposal", "target", "level"), on.value("raisedTime", now)],
    })),
    "open-incident": open(incident, g.climate, { fields: { alert: required(fact(ROOM, "raise-alert")) }, also: { alert: by(alert) } }, ({ f, on, also }) => ({
      guards: [isFact(f.alert), equals(part(f.alert, "scope"), theScope), also.alert.in("open", "held", "authorized"), also.alert.signer("raisedBy"), require(none(incident, ["open", "closed"], (i) => [equals(i.slot("alert"), also.alert.id)]), r.incidentExists)],
      effects: [on.ref("alert", also.alert.id), on.ref("first", f.alert)],
    })),
    hold: transition(alert, g.heat, {}, ({ on }) => ({
      guards: [on.in("open")],
      effects: [
        on.to("held"),
        on.party("heldBy", signer),
        on.value("holdUntil", plusSeconds(60)),
      ],
    })),
    authorize: transition(alert, g.heat, { also: (on) => ({ heater: via(device, on, "heater") }) }, ({ on, also }) => ({
      guards: [
        on.in("open"),
        also.heater.in("active"),
        equals(also.heater.slot("kind"), "heater"),
        deviceNotFailed(also.heater, r),
        require(rule("authorized-target",
        "(subjects.on.values.target = 'off' and subjects.on.values.level = 0) or " +
        "(subjects.on.values.target = 'on' and subjects.on.values.level = 100 and " +
        "subjects.`also.heater`.values.minLevel <= 100 and " +
        "subjects.`also.heater`.values.maxLevel >= 100)"
        ), r.deviceLimit),
        permit("device-command", "allowed", { kind: also.heater.slot("kind") }),
      ],
      effects: [
        on.to("authorized"),
        on.party("authorizedBy", signer),
        also.heater.value("target", on.slot("target")),
        also.heater.value("level", on.slot("level")),
        also.heater.ref("targetAt", self),
        also.heater.capability("device-command", "open", {
          device: also.heater.slot("kind"),
        }),
      ],
    })),
    "propose-restoration": transition(alert, g.climate, {
      fields: { text: proposal.text, proposal: proposal.proposal },
      also: (on) => siblings({ zone: via(zone, on, "zone") }, ($) => ({
        vent: via(device, $.zone, "vent"),
      })),
    }, ({ f, on, also }) => ({
      guards: [
        on.in("authorized"), on.signer("raisedBy"),
        also.zone.in("in-band", "out-of-band"),
        also.vent.in("active"), also.vent.set("reported"),
        deviceNotFailed(also.vent, r),
      ],
      effects: [
        on.to("open"),
        ...on.take(f, "text", "proposal"),
        on.value("target", constant("on")),
        on.value("level", constant(100)),
        on.party("authorizedBy", null),
      ],
    })),
    "close-incident": transition(alert, g.climate, { also: (on) => ({ incident: by(incident), zone: via(zone, on, "zone") }) }, ({ on, also }) => ({
      guards: [
        on.in("open", "held", "authorized"),
        also.incident.in("open"), also.zone.in("in-band"),
        on.signer("raisedBy"),
        equals(also.incident.slot("alert"), on.id),
        require(rule("recovery-evidence",
          "subjects.`also.zone`.refs.summary > subjects.on.refs.first",
        ), r.recoveryNotObserved),
      ],
      effects: [
        on.to("closed"), on.ref("last", self),
        also.incident.to("closed"), also.incident.ref("last", self),
      ],
    })),
  },
  timed: {
    ...work.timed,
    "hold-expired": timed(alert, {
      states: ["held"], deadline: "holdUntil",
      effects: (a) => [a.to("open"), a.party("heldBy", null), a.value("holdUntil", null)],
    }),
  },
});
export { alert, device, incident, zone };
