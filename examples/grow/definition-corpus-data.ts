/** Pure declarations shared with the Grow judgment witnesses.
 * This module validates nothing and constructs no history, actor key or service. */
import type { DeclaredDefinition, FieldValue } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { deviceCommandRow as row } from "../../packages/derive/test/fixtures-device-command.ts";
import { define, item, live, normalize, open } from "@generalbusiness/dap-define";
import { deviceActs, deviceItem, growVocabulary, zoneActs, zoneItem } from "./authoring/forms.ts";
import { site } from "./site.ts";
import { room } from "./room.ts";

const rootItem = item("root", { initial: "open", states: { open: live } });

export function deviceTestDefinition(): DeclaredDefinition {
  const under = "grow-device-fixture", vocabulary = growVocabulary();
  const device = deviceItem(under), forms = deviceActs(device, vocabulary);
  return normalize(define({
    name: under, genesis: "establish", grants: vocabulary.g, reasons: vocabulary.r,
    capabilities: [{ name: "device-command", version: 1 }], items: [rootItem, device],
    acts: { establish: open(rootItem, vocabulary.g.configure, {}, () => ({})), ...forms.acts },
  }));
}

export function zoneTestDefinition(): DeclaredDefinition {
  const under = "grow-zone-fixture", vocabulary = growVocabulary();
  const zone = zoneItem(under), forms = zoneActs(zone, under, vocabulary);
  return normalize(define({
    name: under, genesis: "establish", grants: vocabulary.g, reasons: vocabulary.r,
    items: [rootItem, zone],
    acts: { establish: open(rootItem, vocabulary.g.configure, {}, () => ({})), ...forms.acts },
  }));
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
