/** Grow room data with independent targets, reports and installed command answers. */
import type { ActType, DeclaredDefinition, Guard, ItemType, Subject } from "@generalbusiness/dap-contract";
import { deviceForms, deviceNotFailed } from "./device.ts";
import { zoneForms } from "./zone.ts";
import { workForms } from "./work.ts";
import { wateringForms } from "./watering.ts";
import { ROOM, SITE } from "./names.ts";

export { ROOM } from "./names.ts";
const act = (body: Pick<ActType, "step" | "on" | "grant"> & Partial<ActType>): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...body });
const fixed = { fixed: true, required: true } as const, optional = { fixed: false, required: false } as const;
const party = { ...optional, list: false, author: false };
const eq = (a: import("@generalbusiness/dap-contract").Operand, b: import("@generalbusiness/dap-contract").Operand): Guard => ({ equals: { a, b } });
const live = (of: Subject, states: readonly string[]): Guard => ({ of, state: states });
const fact = (kinds: readonly string[]) => ({ type: "fact", under: ROOM, kind: kinds } as const);
const zone = zoneForms(ROOM), device = deviceForms(ROOM, ["authorize"]);
const work = workForms(ROOM);
const watering = wateringForms(ROOM);
device.item.refs["zone"] = { ...fixed, to: { type: "item", of: "zone" } };
const commission = device.acts["commission-device"]!;
commission.fields["zone"] = { type: "item", of: "zone", required: true };
commission.also = { zone: { item: "zone", by: "zone" } };
commission.guards = [...commission.guards, { none: { type: "device", states: ["active"], where: [
  { equals: { a: { slot: "zone" }, b: { field: "zone" } } }, { equals: { a: { slot: "kind" }, b: { field: "kind" } } },
] }, reason: "device-already-commissioned" }];
commission.effects = [...commission.effects, { ref: { slot: "zone", from: { field: "zone" } } }];
for (const kind of ["vent", "fan", "heater"] as const) zone.item.refs[kind] = { ...optional, to: { type: "item", of: "device" } };

const alert: ItemType = { many: true, max: 4, initial: "open", states: { open: { final: false }, held: { final: false }, authorized: { final: false }, closed: { final: true } },
  parties: { raisedBy: { ...fixed, list: false, author: false }, authorizedBy: party, heldBy: party },
  refs: { zone: { ...fixed, to: { type: "item", of: "zone" } }, heater: { ...fixed, to: { type: "item", of: "device" } },
    first: { ...fixed, to: fact(["raise-alert"]) }, last: { ...optional, to: fact(["close-incident"]) } },
  values: { text: { fixed: false, required: true, of: { type: "text", max: 1024 } }, proposal: { fixed: false, required: true, of: { type: "text", max: 1024 } },
    target: { fixed: false, required: true, of: { type: "enum", of: ["on", "off"] } }, level: { fixed: false, required: true, of: { type: "int", min: 0, max: 100 } },
    raisedTime: { ...fixed, of: { type: "time" } }, holdUntil: { ...optional, of: { type: "time" } } },
};
const incident: ItemType = { many: true, max: 4, initial: "open", states: { open: { final: false }, closed: { final: true } }, parties: {}, values: {},
  refs: { alert: { ...fixed, to: { type: "item", of: "alert" } }, first: { ...fixed, to: fact(["raise-alert"]) }, last: { ...optional, to: fact(["close-incident"]) } } };
const proposal = { text: { type: "text", max: 1024, required: true }, proposal: { type: "text", max: 1024, required: true },
  target: { type: "enum", of: ["on", "off"], required: true }, level: { type: "int", min: 0, max: 100, required: true } } as const;
const heaterProposal: Guard = { reason: "invalid-heater-proposal", anyOf: [
  [eq({ field: "target" }, { const: "off" }), eq({ field: "level" }, { const: 0 })],
  [eq({ field: "target" }, { const: "on" }), eq({ field: "level" }, { const: 100 })],
] };

export const room: DeclaredDefinition = {
  format: "artroom-definition-1", name: ROOM, profile: { name: "restricted", version: 1 }, capabilities: [{ name: "device-command", version: 1 }], genesis: "establish",
  items: { room: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {
    site: { fixed: true, required: false, to: { type: "scope", kind: "lane" } }, siteRoom: { fixed: true, required: false, to: { type: "fact", under: SITE, kind: ["create-room"] } }, lastSiteReport: { ...optional, to: fact(["report-site"]) },
  }, values: { label: { ...fixed, of: { type: "text", max: 80 } } } }, zone: zone.item, device: device.item, alert, incident, ...work.items, ...watering.items },
  acts: {
    establish: act({ step: "open", on: "room", grant: "grow.configure", fields: { label: { type: "text", max: 80, required: true }, site: { type: "scope", kind: "lane", required: false }, siteRoom: { type: "fact", under: SITE, kind: ["create-room"], required: false } },
      guards: [{ anyOf: [
        [eq({ field: "site" }, { none: true }), eq({ field: "siteRoom" }, { none: true })],
        [{ differs: { a: { field: "site" }, b: { none: true } } }, { differs: { a: { field: "siteRoom" }, b: { none: true } } }],
      ] }, { fact: { field: "siteRoom" }, ifPresent: true }, { equals: { a: { field: "siteRoom", part: "scope" }, b: { field: "site" } }, ifPresent: true }],
      effects: [{ value: { slot: "label", from: { field: "label" } } }, { ref: { slot: "site", from: { field: "site" } } }, { ref: { slot: "siteRoom", from: { field: "siteRoom" } } }],
    }),
    "report-site": act({ step: "transition", on: "room", grant: "grow.sense", fields: { openAlerts: { type: "int", min: 0, max: 4, required: true } },
      guards: [live("on", ["open"]), { set: "site" }, { set: "siteRoom" }, { count: { type: "alert", states: ["open", "held", "authorized"], min: { field: "openAlerts" }, max: { field: "openAlerts" } }, reason: "wrong-alert-count" }],
      effects: [{ ref: { slot: "lastSiteReport", from: "self" } }],
      sends: [{ relate: { to: { slot: "site" }, name: "room-summary", item: { item: "on" }, state: "reported", detail: { room: { slot: "siteRoom" }, openAlerts: { field: "openAlerts" } }, result: {} } }],
    }),
    ...zone.acts, ...device.acts, ...work.acts, ...watering.acts,
    "bind-zone-devices": act({ step: "transition", on: "zone", grant: "grow.configure",
      fields: { vent: { type: "item", of: "device", required: true }, fan: { type: "item", of: "device", required: true }, heater: { type: "item", of: "device", required: true } },
      also: Object.fromEntries(["vent", "fan", "heater"].map(kind => [kind, { item: "device", by: kind }])),
      guards: [live("on", ["unobserved", "in-band", "out-of-band"]), ...(["vent", "fan", "heater"] as const).flatMap(kind => [live(`also.${kind}`, ["active"]), eq({ slot: "kind", of: `also.${kind}` }, { const: kind }), eq({ slot: "zone", of: `also.${kind}` }, { item: "on" })])],
      effects: ["vent", "fan", "heater"].map(slot => ({ ref: { slot, from: { field: slot } } })),
    }),
    "raise-alert": act({ step: "open", on: "alert", grant: "grow.climate", fields: { zone: { type: "item", of: "zone", required: true }, ...proposal },
      also: { zone: { item: "zone", by: "zone" }, vent: { item: "device", via: { of: "also.zone", slot: "vent" } }, fan: { item: "device", via: { of: "also.zone", slot: "fan" } }, heater: { item: "device", via: { of: "also.zone", slot: "heater" } } },
      guards: [live("also.zone", ["out-of-band"]), live("also.vent", ["active"]), live("also.fan", ["active"]), live("also.heater", ["active"]), { rule: "climate-exhausted", reason: "climate-actions-remain" }, heaterProposal,
        { none: { type: "alert", states: ["open", "held", "authorized"], where: [{ equals: { a: { slot: "zone" }, b: { field: "zone" } } }] }, reason: "zone-alert-open" }],
      effects: [{ party: { slot: "raisedBy", from: { signer: true } } }, { ref: { slot: "zone", from: { field: "zone" } } }, { ref: { slot: "heater", from: { item: "also.heater" } } }, { ref: { slot: "first", from: "self" } },
        ...["text", "proposal", "target", "level"].map(slot => ({ value: { slot, from: { field: slot } } })), { value: { slot: "raisedTime", from: { time: { plusSeconds: 0 } } } }],
    }),
    "open-incident": act({ step: "open", on: "incident", grant: "grow.climate", fields: { alert: { ...fact(["raise-alert"]), required: true } }, also: { alert: { item: "alert", by: "alert" } },
      guards: [{ fact: { field: "alert" } }, eq({ field: "alert", part: "scope" }, { scope: true }), live("also.alert", ["open", "held", "authorized"]), { of: "also.alert", signer: ["raisedBy"] },
        { none: { type: "incident", states: ["open", "closed"], where: [{ equals: { a: { slot: "alert" }, b: { item: "also.alert" } } }] }, reason: "incident-exists" }],
      effects: [{ ref: { slot: "alert", from: { item: "also.alert" } } }, { ref: { slot: "first", from: { field: "alert" } } }],
    }),
    hold: act({ step: "transition", on: "alert", grant: "grow.heat", guards: [live("on", ["open"])],
      effects: [{ state: "held" }, { party: { slot: "heldBy", from: { signer: true } } }, { value: { slot: "holdUntil", from: { time: { plusSeconds: 60 } } } }],
    }),
    authorize: act({ step: "transition", on: "alert", grant: "grow.heat", also: { heater: { item: "device", via: { of: "on", slot: "heater" } } },
      guards: [live("on", ["open"]), live("also.heater", ["active"]), eq({ slot: "kind", of: "also.heater" }, { const: "heater" }), deviceNotFailed("also.heater"), { rule: "authorized-target", reason: "device-limit" },
        { capability: { name: "device-command", guard: "allowed", with: { kind: { slot: "kind", of: "also.heater" } } } }],
      effects: [{ state: "authorized" }, { party: { slot: "authorizedBy", from: { signer: true } } },
        { of: "also.heater", value: { slot: "target", from: { slot: "target", of: "on" } } }, { of: "also.heater", value: { slot: "level", from: { slot: "level", of: "on" } } }, { of: "also.heater", ref: { slot: "targetAt", from: "self" } },
        { of: "also.heater", capability: { name: "device-command", do: "open", with: { device: { slot: "kind" } } } }],
    }),
    "propose-restoration": act({ step: "transition", on: "alert", grant: "grow.climate", fields: { text: proposal.text, proposal: proposal.proposal },
      also: { zone: { item: "zone", via: { of: "on", slot: "zone" } }, vent: { item: "device", via: { of: "also.zone", slot: "vent" } } },
      guards: [live("on", ["authorized"]), { signer: ["raisedBy"] }, live("also.zone", ["in-band", "out-of-band"]), live("also.vent", ["active"]), { of: "also.vent", set: "reported" }, deviceNotFailed("also.vent")],
      effects: [{ state: "open" }, { value: { slot: "text", from: { field: "text" } } }, { value: { slot: "proposal", from: { field: "proposal" } } },
        { value: { slot: "target", from: { const: "on" } } }, { value: { slot: "level", from: { const: 100 } } }, { party: { slot: "authorizedBy", from: null } }],
    }),
    "close-incident": act({ step: "transition", on: "alert", grant: "grow.climate", fields: { incident: { type: "item", of: "incident", required: true } },
      also: { incident: { item: "incident", by: "incident" }, zone: { item: "zone", via: { of: "on", slot: "zone" } } },
      guards: [live("on", ["open", "held", "authorized"]), live("also.incident", ["open"]), live("also.zone", ["in-band"]), { signer: ["raisedBy"] },
        eq({ slot: "alert", of: "also.incident" }, { item: "on" }), { rule: "recovery-evidence", reason: "recovery-not-observed" }],
      effects: [{ state: "closed" }, { ref: { slot: "last", from: "self" } }, { of: "also.incident", state: "closed" }, { of: "also.incident", ref: { slot: "last", from: "self" } }],
    }),
  },
  receives: {},
  timed: { ...work.timed, "hold-expired": { on: "alert", states: ["held"], deadline: "holdUntil", effects: [{ state: "open" }, { party: { slot: "heldBy", from: null } }, { value: { slot: "holdUntil", from: null } }], attention: [] } },
  rules: { ...zone.rules, ...device.rules, ...work.rules, ...watering.rules,
    "climate-exhausted": "(subjects.`also.vent`.values.reported = 'error' or subjects.`also.vent`.values.level >= subjects.`also.vent`.values.maxLevel) and (subjects.`also.fan`.values.reported = 'error' or subjects.`also.fan`.values.level >= subjects.`also.fan`.values.maxLevel)",
    "authorized-target": "(subjects.on.values.target = 'off' and subjects.on.values.level = 0) or (subjects.on.values.target = 'on' and subjects.on.values.level = 100 and subjects.`also.heater`.values.minLevel <= 100 and subjects.`also.heater`.values.maxLevel >= 100)",
    "recovery-evidence": "subjects.`also.zone`.refs.summary > subjects.on.refs.first",
  },
};
