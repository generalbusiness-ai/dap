/** Pure raw declarations shared with the original Grow judgment witnesses.
 * This module validates nothing and constructs no history, actor key or service. */
import type { DeclaredDefinition, FieldValue } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { deviceCommandRow as row } from "../../packages/derive/test/fixtures-device-command.ts";
import { deviceForms } from "./device.ts";
import { zoneForms } from "./zone.ts";
import { site } from "./site.ts";
import { room } from "./room.ts";

export function deviceTestDefinition(): DeclaredDefinition {
  const under = "grow-device-fixture", forms = deviceForms(under);
  return { format: "artroom-definition-1", name: under, profile: { name: "restricted", version: 1 }, capabilities: [{ name: "device-command", version: 1 }], genesis: "establish",
  items: { root: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: {}, refs: {}, values: {} }, device: forms.item },
  acts: { establish: { step: "open", on: "root", grant: "grow.configure", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] }, ...forms.acts }, receives: {}, timed: {}, rules: forms.rules };
}

export function zoneTestDefinition(): DeclaredDefinition {
  const under = "grow-zone-fixture", forms = zoneForms(under);
  return { format: "artroom-definition-1", name: under, profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
  items: { root: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: {}, refs: {}, values: {} }, zone: forms.item },
  acts: { establish: { step: "open", on: "root", grant: "grow.configure", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] }, ...forms.acts }, receives: {}, timed: {}, rules: forms.rules };
}

export function simulatorTickParentDefinition(room: DeclaredDefinition, fields: Record<string, FieldValue>): DeclaredDefinition {
  return { ...room, name: "test.grow-tick-parent", capabilities: [], genesis: "start",
    items: { root: { many: false, max: 1, initial: "ready", states: { ready: { final: false } }, parties: {}, refs: {}, values: {} } },
    acts: { start: row({ step: "open", on: "root", grant: "found", guards: [] }),
      spawn: row({ on: "root", grant: "found", guards: [], sends: [{ create: { kind: "lane", definition: definitionDigest(room),
        fields: Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, { const: value }])), result: {} } }] }) },
    receives: {}, timed: {}, rules: {},
  };
}

/** The nativeCreatedSite helper keeps only its input's genesis/root and
 * sends the exact input digest with the original field selectors. */
export function growSiteLauncherDefinition(definition: DeclaredDefinition): DeclaredDefinition {
  const launcherDefinition = structuredClone(definition);
  launcherDefinition.name = "test.grow-site-launcher";
  // The launcher owns no Site reports: its own name cannot stand in for the
  // Site's self-fact type. Keep only the actual creation row and root item.
  launcherDefinition.items = { site: definition.items["site"]! };
  launcherDefinition.acts = { [definition.genesis]: structuredClone(definition.acts[definition.genesis]!) };
  launcherDefinition.receives = {}; launcherDefinition.timed = {}; launcherDefinition.rules = {};
  launcherDefinition.acts[launcherDefinition.genesis]!.sends = [{ create: { kind: "lane", definition: definitionDigest(definition), fields: Object.fromEntries(Object.keys(definition.acts[definition.genesis]!.fields).map(name => [name, { field: name }])), result: {} } }];
  return launcherDefinition;
}

/** The Site test rebinds both declared child places to its actual Room variant. */
export function siteForRoomDefinition(childDefinition: DeclaredDefinition): DeclaredDefinition {
  const parentDefinition = structuredClone(site), send = parentDefinition.acts["create-room"]!.sends[0]!;
  if (!("create" in send)) throw new Error("site fixture requires a declared create send");
  send.create.definition = definitionDigest(childDefinition);
  parentDefinition.receives["room-summary"]!.from.pin = definitionDigest(childDefinition);
  return parentDefinition;
}

/** A valid native sender whose relation deliberately addresses another row. */
export function misaddressedRoomDefinition(): DeclaredDefinition {
  const misaddressed = structuredClone(room), send = misaddressed.acts["report-site"]!.sends[0]!;
  if (!("relate" in send)) throw new Error("room fixture requires a declared relation send");
  send.relate.detail["room"] = { const: 2 };
  return misaddressed;
}
