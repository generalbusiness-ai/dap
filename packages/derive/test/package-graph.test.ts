import { expect, test } from "vitest";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { checkPackageGraph, emptyPackageComposition, type PackageGraphInput } from "@generalbusiness/artroom-package-graph";
import { validateDefinition } from "../src/index.ts";
import { RULE_PROFILES } from "../src/rule/index.ts";
import { site } from "../../../examples/grow/site.ts";
import { room } from "../../../examples/grow/room.ts";

// Component witness over actual Grow declarations and native validation.
// This does not yet exercise the public package-byte validator or codec.
function grow(change: (site: DeclaredDefinition, room: DeclaredDefinition) => void = () => {}): PackageGraphInput {
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
  creation.create.definition = childId;
  parent.receives["room-summary"]!.from.pin = childId;
  const parentId = definitionDigest(parent);
  for (const definition of [parent, child]) {
    const native = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
    expect(native.ok ? [] : native.problems).toEqual([]);
  }
  return { entry: parentId, definitions: [{ id: parentId, definition: parent }, { id: childId, definition: child }],
    composition: { ...emptyPackageComposition(), connections: [
      { from: parentId, item: "room", slot: "scope", to: childId },
      { from: childId, item: "room", slot: "site", to: parentId },
    ], order: [{ definition: parentId, handler: "room-summary", by: "any" }] },
    roles: { operator: [...new Set([parent, child].flatMap(definition => Object.values(definition.acts).map(act => act.grant)))] },
  };
}
test("Grow's three retained child slots prove three lifetime relation keys, rather than live maxima alone", () => {
  const input = grow(), checked = checkPackageGraph(input);
  expect(checked.findings).toEqual([]);
  expect(checked.instances).toEqual([{ definition: input.entry, maximum: 1 }, { definition: input.definitions[1]!.id, maximum: 3 }]);
  const insufficient = checkPackageGraph(grow(parent => { parent.receives["room-summary"]!.copies = 2; }));
  expect(insufficient.findings.map(finding => finding.reason)).toEqual(["fan-in-exceeds-copies"]);
  expect(insufficient.findings[0]!.message).toContain("fan-in 3 exceeds copies 2");
  const twoItems = (copies: number) => checkPackageGraph(grow((parent, child) => {
    child.items["room"]!.many = true; child.items["room"]!.max = 2;
    parent.receives["room-summary"]!.copies = copies;
  }));
  expect(twoItems(3).findings.map(finding => finding.reason)).toEqual(["fan-in-exceeds-copies"]);
  expect(twoItems(3).findings[0]!.message).toContain("fan-in 6 exceeds copies 3");
  expect(twoItems(6).findings).toEqual([]);
  const conflicted = checkPackageGraph(grow(parent => {
    const send = parent.acts["create-room"]!.sends[0]!;
    if ("create" in send) send.create.result["conflict"] = [{ state: "failed" }];
  }));
  expect(conflicted.findings.map(finding => finding.reason)).toEqual(["fan-in-unproved"]);
  const recyclable = checkPackageGraph(grow((_parent, child) => { child.items["room"]!.states["ended"] = { final: true }; }));
  expect(recyclable.findings.map(finding => finding.reason)).toEqual(["fan-in-unproved"]);
});

test("Grow endpoints stay bound to the declared child and creator rather than signer-selected peers", () => {
  expect(checkPackageGraph(grow()).findings).toEqual([]);
  const rewritable = grow(parent => {
    parent.acts["rebind-room"] = { step: "transition", on: "room", grant: "grow.configure", fields: { peer: { type: "scope", kind: "lane", required: true } }, also: {},
      guards: [{ state: ["active"] }], effects: [{ ref: { slot: "scope", from: { field: "peer" } } }], sends: [], attention: [] };
  });
  expect(checkPackageGraph(rewritable).findings.map(finding => finding.reason)).toEqual(["unbound-endpoint"]);
  const wrongChild = grow(), original = wrongChild.composition.connections[0]!;
  expect(checkPackageGraph({ ...wrongChild, composition: { ...wrongChild.composition,
    connections: [{ ...original, to: wrongChild.entry }, wrongChild.composition.connections[1]!],
  } }).findings.map(finding => finding.reason)).toEqual(["unbound-endpoint"]);
});

test("Grow's explicit failure clauses, default grants and order each carry a separate package obligation", () => {
  expect(checkPackageGraph(grow()).findings).toEqual([]);
  const incomplete = grow((_parent, child) => {
    const send = child.acts["report-site"]!.sends[0]!;
    if ("relate" in send) delete send.relate.result["undelivered"];
  });
  expect(checkPackageGraph(incomplete).findings.map(finding => finding.reason)).toEqual(["unhandled-result"]);
  const input = grow();
  const ungranted = checkPackageGraph({ ...input, roles: { operator: input.roles["operator"]!.filter(action => action !== "grow.tend") } });
  expect(ungranted.findings.length).toBeGreaterThan(0);
  expect(new Set(ungranted.findings.map(finding => finding.reason))).toEqual(new Set(["ungranted-act"]));
  expect(checkPackageGraph({ ...input, composition: { ...input.composition, order: [] } }).findings.map(finding => finding.reason)).toEqual(["order-undeclared"]);
});

test("Grow rights check declared ownership and warn without claiming complete writer coverage", () => {
  const input = grow(), child = input.definitions[1]!.id;
  const exercises = [{ definition: input.entry, row: "acts.create-room", right: "room-count" }];
  const owned = { ...input, composition: { ...input.composition, rights: { "room-count": { owner: input.entry } }, exercises } };
  expect(checkPackageGraph(owned).findings).toEqual([]);
  expect(checkPackageGraph({ ...owned, composition: { ...owned.composition, rights: { "room-count": { owner: child } } } }).findings.map(finding => finding.reason)).toEqual(["right-not-owned"]);
  const opening = grow(parent => {
    parent.items["report"] = { many: true, max: 3, initial: "received", states: { received: { final: false } }, parties: {}, refs: {}, values: {} };
    parent.receives["room-summary"]!.opens = "report";
  });
  const warnings = checkPackageGraph(opening).findings;
  expect(warnings.map(finding => [finding.reason, finding.severity])).toEqual([["unowned-bound", "warning"]]);
  const acknowledged = { ...opening, composition: { ...opening.composition, rights: { reports: { owner: opening.entry } },
    exercises: [{ definition: opening.entry, row: "receives.room-summary", right: "reports" }],
  } };
  expect(checkPackageGraph(acknowledged).findings).toEqual([]);
});
