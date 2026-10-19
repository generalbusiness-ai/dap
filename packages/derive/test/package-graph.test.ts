import { expect, test } from "vitest";
import { b64url, canonicalize, definitionDigest, fitsFieldType, sign, utf8 } from "@generalbusiness/artroom-bytes";
import { ApplicationPackageValidationError, packApplication2, readApplicationProjection, type ApplicationPackageInput2 } from "@generalbusiness/artroom-bytes/application-v2";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest } from "@generalbusiness/dap-contract";
import { checkPackageGraph, emptyPackageComposition, type PackageGraphInput } from "@generalbusiness/artroom-package-graph";
import { validateDefinition, validatePackage } from "../src/index.ts";
import { RULE_PROFILES } from "../src/rule/index.ts";
import { site } from "../../../examples/grow/site.ts";
import { room } from "../../../examples/grow/room.ts";
import { keys } from "./fixtures.ts";

// Graph components use actual Grow declarations and native validation.
// The final case also crosses the signed package codec and public validator.
function grow(change: (site: DeclaredDefinition, room: DeclaredDefinition) => void = () => {}, peerPin?: Digest): PackageGraphInput {
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
    if ("create" in send && send.create.definition !== "self") send.create.definition = childId;
  }
  parent.receives["room-summary"]!.from.pin = peerPin ?? childId;
  const parentId = definitionDigest(parent);
  for (const definition of [parent, child]) {
    const native = validateDefinition(definition, PROPOSED_BOUNDS, RULE_PROFILES);
    expect(native.ok ? [] : native.problems).toEqual([]);
  }
  return { bounds: PROPOSED_BOUNDS, entry: parentId, definitions: [{ id: parentId, definition: parent }, { id: childId, definition: child }], literalFits: (type, value) => fitsFieldType(type, value, PROPOSED_BOUNDS),
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
  // Hand count: Site live 1+3=4; each Room live 1+4+12+4+4+100+32+1+32=190.
  // Three successful children add three creator entries, geneses and results;
  // their backing items and root items add six keys beside the Site's root.
  expect(checked.projected).toMatchObject({ liveItems: { acrossInstall: 574 }, successfulCreation: { entryCeiling: 10, itemKeyCeiling: 7 }, lifetime: { entries: null, itemKeys: null } });
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

test("Grow ports check the actual peer digest, message reachability and transmitted field types", () => {
  expect(checkPackageGraph(grow()).findings).toEqual([]);
  const different = structuredClone(room), label = different.items["room"]!.values["label"]!.of;
  if (label.type !== "text") return expect.fail("Grow label must be text");
  label.max = 81;
  expect(different.name).toBe(room.name);
  expect(validateDefinition(different, PROPOSED_BOUNDS, RULE_PROFILES).ok).toBe(true);
  expect(checkPackageGraph(grow(() => {}, definitionDigest(different))).findings.map(finding => finding.reason)).toEqual(["wrong-peer"]);
  const tooNarrow = grow(parent => {
    const field = parent.receives["room-summary"]!.fields["openAlerts"]!;
    if (field.type === "int") field.max = 3;
  });
  expect(checkPackageGraph(tooNarrow).findings.map(finding => finding.reason)).toEqual(["field-mismatch"]);
  const missing = grow((_parent, child) => {
    const send = structuredClone(child.acts["report-site"]!.sends[0]!);
    if ("relate" in send) send.relate.name = "unknown-summary";
    child.acts["report-site"]!.sends = [...child.acts["report-site"]!.sends, send];
  });
  expect(checkPackageGraph(missing).findings.map(finding => finding.reason)).toEqual(["unknown-message"]);
  const unreachable = grow(parent => {
    parent.receives["unused-summary"] = { ...structuredClone(parent.receives["room-summary"]!), message: "unused-summary" };
  });
  const unused = { ...unreachable, composition: { ...unreachable.composition,
    order: [...unreachable.composition.order, { definition: unreachable.entry, handler: "unused-summary", by: "any" as const }],
  } };
  expect(checkPackageGraph(unused).findings.map(finding => finding.reason)).toEqual(["unreachable-handler"]);
});

function packageInput(input: PackageGraphInput): ApplicationPackageInput2 {
  return { name: "ai.generalbusiness.grow-graph-test", version: "0.1.0", semantic: {
    v: 2, entry: input.entry, definitions: input.definitions.map(part => ({ id: part.id, bytes: canonicalize(part.definition) })).sort((a, b) => a.id.localeCompare(b.id)),
    ...input.composition, host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: [], predecessor: null,
    roles: Object.fromEntries(Object.entries(input.roles).map(([role, actions]) => [role, [...actions].sort()])),
    projections: Object.fromEntries(input.definitions.map((part, index) => {
      const type = part.definition.acts[part.definition.genesis]!.on!;
      return [`summary${index}`, readApplicationProjection({ v: 1, definition: part.id, revision: "revision", sources: {
        summary: { item: type, read: "item", states: Object.keys(part.definition.items[type]!.states).sort(), limit: 1,
          fields: { label: { from: { kind: "value", name: "label" }, of: { type: "text", max: 80 }, nullable: false } } },
      } })];
    })),
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html; charset=utf-8", bytes: b64url(utf8("<p>Grow graph fixture</p>")) }],
    descriptions: {}, resources: {}, views: {},
  } };
}
test("the public package byte validator checks signed Grow bytes and preserves the hand-counted instance report", async () => {
  const input = grow(), signer = { key: keys.rita.key, sign: (bytes: Uint8Array) => sign(keys.rita.secret, bytes) };
  const packet = await packApplication2(packageInput(input), signer);
  const checked = validatePackage(packet.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, packet.ids.release);
  expect(checked.ok ? [] : checked).toEqual([]);
  expect(checked.kind).toBe("graph");
  if (checked.kind !== "graph") return;
  expect(checked.findings).toEqual([]);
  expect(checked.definitions).toHaveLength(2);
  expect(checked.report.instances.find(part => part.definition === input.definitions[1]!.id)?.maximum).toBe(3);
  expect(validatePackage(packet.bytes, PROPOSED_BOUNDS, RULE_PROFILES, { bytes: packet.bytes.length - 1 })).toMatchObject({ ok: false, kind: "codec", reason: "limit" });
  const rejected = packApplication2(packageInput(grow(parent => { parent.receives["room-summary"]!.copies = 2; })), signer);
  await expect(rejected).rejects.toBeInstanceOf(ApplicationPackageValidationError);
  await expect(rejected).rejects.toMatchObject({ findings: [expect.objectContaining({ reason: "fan-in-exceeds-copies" })] });
});

test("Grow's automatic create/report cycle needs an explicit state condition, without claiming termination", () => {
  const cyclic = (guarded: boolean) => {
    const input = grow((parent, child) => {
      const creator = structuredClone(parent.acts["create-room"]!.sends[0]!);
      parent.acts["create-room"]!.sends = [];
      const handler = parent.receives["room-summary"]!;
      handler.opens = "room"; handler.copies = 6;
      handler.fields["label"] = { type: "text", max: 80, required: true };
      handler.effects = [{ value: { slot: "label", from: { field: "label" } } }, ...handler.effects];
      handler.sends = [creator];
      if (!guarded) handler.guards = handler.guards.filter(guard => !("state" in guard));
      const siteRoom = child.items["room"]!.refs["siteRoom"]!.to, incoming = child.acts["establish"]!.fields["siteRoom"]!;
      if (siteRoom.type === "fact") siteRoom.kind = ["create-room", "room-summary"];
      if (incoming.type === "fact") { incoming.kind = ["create-room", "room-summary"]; incoming.required = true; }
      const summary = parent.items["room"]!.refs["summaryAt"]!.to;
      if (summary.type === "fact") summary.kind = ["establish", "report-site"];
      const report = child.acts["report-site"]!.sends[0]!;
      if (!("relate" in report)) throw new Error("Grow report must relate");
      report.relate.detail["label"] = { slot: "label" };
      const atBirth = structuredClone(report);
      atBirth.relate.detail = { room: { field: "siteRoom" }, openAlerts: { const: 0 }, label: { field: "label" } };
      child.acts["establish"]!.sends = [atBirth];
    });
    return { ...input, composition: { ...input.composition, rights: { rooms: { owner: input.entry } }, exercises: [{ definition: input.entry, row: "receives.room-summary", right: "rooms" }] } };
  };
  expect(checkPackageGraph(cyclic(true)).findings).toEqual([]);
  expect(checkPackageGraph(cyclic(false)).findings.map(finding => finding.reason)).toEqual(["cycle-unacknowledged"]);
});

test("Grow's declared pending creation work needs its own timed exit without recycling a successful child slot", () => {
  const pending = (timer: boolean) => grow(parent => {
    parent.items["room"]!.values["deadline"] = { fixed: false, required: false, of: { type: "time" } };
    const create = parent.acts["create-room"]!;
    create.effects = [...create.effects, { value: { slot: "deadline", from: { time: { plusSeconds: 30 } } } }];
    parent.acts["settle-room"] = { step: "transition", on: "room", grant: "grow.configure", also: {}, fields: {},
      guards: [{ state: ["pending"] }], settles: { of: "on", in: ["pending"] }, effects: [{ state: "active" }], sends: [], attention: [] };
    if (timer) parent.timed["creation-expired"] = { on: "room", states: ["pending"], deadline: "deadline", effects: [{ state: "conflicted" }], attention: [] };
  });
  const settled = checkPackageGraph(pending(true));
  expect(settled.findings).toEqual([]);
  expect(settled.instances[1]!.maximum).toBe(3);
  expect(checkPackageGraph(pending(false)).findings.map(finding => finding.reason)).toEqual(["unsettled-pending"]);
});
