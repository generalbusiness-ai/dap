/** Raw Grow graph declarations. Native checks remain in the fixture wrapper. */
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest } from "@generalbusiness/dap-contract";
import { definitionDigest, fitsFieldType } from "@generalbusiness/dap-bytes";
import { emptyPackageComposition, type PackageGraphInput } from "@generalbusiness/dap-package-graph";
import { site } from "../../../../examples/grow/site.ts";
import { room } from "../../../../examples/grow/room.ts";
export function growData(change: (site: DeclaredDefinition, room: DeclaredDefinition) => void = () => {}, peerPin?: Digest, extra: readonly DeclaredDefinition[] = []): PackageGraphInput {
  const parent = structuredClone(site), child = structuredClone(room);
  parent.items["room"]!.states["conflicted"] = { final: false };
  const creation = parent.acts["create-room"]!.sends[0]!;
  if (!("create" in creation)) throw new Error("Grow requires its create send");
  creation.create.result["conflict"] = [{ state: "conflicted" }];
  creation.create.result["undelivered"] = [];
  const report = child.acts["report-site"]!.sends[0]!;
  if (!("relate" in report)) throw new Error("Grow requires its relation send");
  report.relate.result = { refused: [], undelivered: [] };
  change(parent, child);
  const childId = definitionDigest(child);
  for (const row of [...Object.values(parent.acts), ...Object.values(parent.receives)]) for (const send of row.sends) {
    if ("create" in send && send.create.definition === definitionDigest(room)) send.create.definition = childId;
  }
  parent.receives["room-summary"]!.from.pin = peerPin ?? childId;
  const parentId = definitionDigest(parent);
  return { bounds: PROPOSED_BOUNDS, entry: parentId, definitions: [{ id: parentId, definition: parent }, { id: childId, definition: child }, ...extra.map(definition => ({ id: definitionDigest(definition), definition }))], literalFits: (type, value) => fitsFieldType(type, value, PROPOSED_BOUNDS),
    composition: { ...emptyPackageComposition(), connections: [
      { from: parentId, item: "room", slot: "scope", to: childId },
      { from: childId, item: "room", slot: "site", to: parentId },
    ], order: [{ definition: parentId, handler: "room-summary", by: "any" }] },
    roles: { operator: [...new Set([parent, child, ...extra].flatMap(definition => Object.values(definition.acts).map(act => act.grant)))] },
  };
}

/** A Room can relate a probe while its independent Leaf creation is pending.
 * A refused creation may free a failed probe, but cannot erase its relation. */
export function preFailureRelationData(failedFinal: boolean, copies = 9): PackageGraphInput {
  const leaf: DeclaredDefinition = { format: "artroom-definition-1", name: "test.grow-probe-leaf", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
    items: { leaf: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {},
      values: { label: { fixed: true, required: true, of: { type: "text", max: 80 } } } } },
    acts: { establish: { step: "open", on: "leaf", grant: "grow.configure", also: {}, fields: {}, guards: [],
      effects: [{ value: { slot: "label", from: { const: "Probe leaf" } } }], sends: [], attention: [] } }, receives: {}, timed: {}, rules: {},
  };
  return growData((parent, child) => {
    parent.receives["room-summary"]!.copies = copies;
    const summary = parent.items["room"]!.refs["summaryAt"]!.to;
    if (summary.type === "fact") summary.kind = ["open-probe", "report-site"];
    child.items["probe"] = { many: true, max: 2, initial: "pending", states: { pending: { final: false }, failed: { final: failedFinal }, conflicted: { final: false } }, parties: {}, refs: {}, values: {} };
    child.acts["open-probe"] = { step: "open", on: "probe", grant: "grow.configure", fields: {}, also: { room: { item: "room", one: true } },
      guards: [{ of: "also.room", set: "site" }, { of: "also.room", set: "siteRoom" }], effects: [], attention: [], sends: [
        { create: { kind: "lane", definition: definitionDigest(leaf), fields: {}, result: { applied: [], refused: [{ state: "failed" }], undelivered: [], conflict: [{ state: "conflicted" }] } } },
        { relate: { to: { slot: "site", of: "also.room" }, name: "room-summary", item: "self", state: "reported",
          detail: { room: { slot: "siteRoom", of: "also.room" }, openAlerts: { const: 0 } }, result: { refused: [], undelivered: [] } } },
      ] };
  }, undefined, [leaf]);
}
