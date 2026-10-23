/** Demo-only data over the maintained declarations. Native host data and the
 * local check fixture keep their own bytes. Site forwards fixed principals. */
import type { ActType, DeclaredDefinition, FieldType, Guard } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { room as maintainedRoom } from "./room.ts";
import { site as maintainedSite } from "./site.ts";

const fixedParty = { fixed: true, required: true, list: false, author: false } as const;
const head: FieldType = { type: "record", of: {
  seq: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER, required: true },
  hash: { type: "digest", required: true },
} };
const principal = (name: "sensors" | "climate" | "operator"): Guard => ({ some: { type: "room", states: ["open"],
  where: [{ equals: { a: { slot: name }, b: { signer: true } } }] } });

function principals(definition: DeclaredDefinition, item: "site" | "room"): void {
  const type = definition.items[item]!, establish = definition.acts[definition.genesis]!;
  for (const name of ["sensors", "climate", "operator"] as const) {
    type.parties[name] = { ...fixedParty };
    establish.fields[name] = { type: "member", required: true };
    establish.effects = [...establish.effects, { party: { slot: name, from: { field: name } } }];
  }
  establish.guards = [...establish.guards,
    { differs: { a: { field: "sensors" }, b: { field: "climate" } }, reason: "distinct-demo-principals" },
    { differs: { a: { field: "sensors" }, b: { field: "operator" } }, reason: "distinct-demo-principals" },
    { differs: { a: { field: "climate" }, b: { field: "operator" } }, reason: "distinct-demo-principals" }];
}

export function demoDefinitions(): { site: DeclaredDefinition; room: DeclaredDefinition } {
  const room = structuredClone(maintainedRoom), site = structuredClone(maintainedSite);
  principals(room, "room"); principals(site, "site");
  // Each agent has the native agent role. These bounded singleton-room
  // guards compare the full signing member, never its controller. A range
  // guard uses no fifth `also` subject on raise-alert's existing four.
  for (const act of Object.values(room.acts)) {
    if (act.grant === "grow.sense") act.guards = [...act.guards, { ...principal("sensors"), reason: "not-demo-sensors" }];
    if (act.grant === "grow.climate") act.guards = [...act.guards, { anyOf: [[principal("climate")], [principal("operator")]], reason: "not-demo-climate" }];
  }
  const roomItem = room.items["room"]!, observe = room.acts["observe"]!;
  roomItem.values["commandsAnsweredThrough"] = { fixed: false, required: false, of: head };
  roomItem.values["lastSampledAt"] = { fixed: false, required: false, of: { type: "time" } };
  roomItem.refs["lastReading"] = { fixed: false, required: false, to: { type: "fact", under: room.name, kind: ["observe"] } };
  // Comments admit fields but no guards, subjects or effects. The demo's
  // existing summary entry becomes a Room transition, retaining its kind
  // and payload while binding identity and progress in the same entry.
  observe.step = "transition"; observe.on = "room";
  observe.fields["commandsAnsweredThrough"] = { ...head, required: true };
  observe.fields["targetBasis"] = { ...head, required: true };
  observe.guards = [...observe.guards, { rule: "demo-reading-order", reason: "stale-demo-reading" }];
  observe.effects = [...observe.effects,
    { of: "on", value: { slot: "commandsAnsweredThrough", from: { field: "commandsAnsweredThrough" } } },
    { of: "on", value: { slot: "lastSampledAt", from: { field: "sampledAt" } } },
    { of: "on", ref: { slot: "lastReading", from: "self" } }];
  room.rules["demo-reading-order"] = "(subjects.on.values.lastSampledAt = null or fields.sampledAt >= subjects.on.values.lastSampledAt) and (subjects.on.values.commandsAnsweredThrough = null or (fields.commandsAnsweredThrough.seq >= subjects.on.values.commandsAnsweredThrough.seq and (fields.commandsAnsweredThrough.seq > subjects.on.values.commandsAnsweredThrough.seq or fields.commandsAnsweredThrough.hash = subjects.on.values.commandsAnsweredThrough.hash)))";
  // Autonomous closure records what was actually observed about the heater,
  // rather than implying that a person cut it while nobody was present.
  room.acts["close-incident"]!.fields["resolution"] = { type: "text", max: 1024, required: true };
  const createRoom: ActType = site.acts["create-room"]!;
  createRoom.also = { ...createRoom.also, demoSite: { item: "site", one: true } };
  createRoom.sends = createRoom.sends.map(send => "create" in send && send.create.definition === definitionDigest(maintainedRoom)
    ? { create: { ...send.create, definition: definitionDigest(room), fields: { ...send.create.fields,
      sensors: { slot: "sensors", of: "also.demoSite" }, climate: { slot: "climate", of: "also.demoSite" }, operator: { slot: "operator", of: "also.demoSite" } } } } : send);
  return { site, room };
}
