import { expect, test } from "vitest";
import { b64url, canonicalize, definitionDigest, digestBytes, sign, utf8, verify } from "@generalbusiness/artroom-bytes";
import { ApplicationPackageValidationError, packApplication2, readApplicationProjection, type ApplicationPackageInput2 } from "@generalbusiness/artroom-bytes/application-v2";
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { checkPackageGraph, type PackageGraphInput } from "@generalbusiness/artroom-package-graph";
import { validateDefinition, validatePackage } from "../src/index.ts";
import { RULE_PROFILES } from "../src/rule/index.ts";
import { room } from "../../../examples/grow/room.ts";
import { keys } from "./fixtures.ts";
import { grow } from "./fixtures-package-graph.ts";

// Graph components use actual Grow declarations and native validation.
// The final case also crosses the signed package codec and public validator.
// All variants pass native whole-definition validation first. The backup
// opening makes the aliases reachable without adding a second child creator.
function lifetimeVariants(): { name: string; input: PackageGraphInput }[] {
  const backup = (parent: DeclaredDefinition) => {
    const opening = parent.acts["create-room"]!;
    parent.acts["open-backup-slot"] = { ...structuredClone(opening), sends: [] };
  };
  const birthKinds = (child: DeclaredDefinition, kinds: string[]) => {
    const field = child.acts["establish"]!.fields["siteRoom"]!;
    if (field.type !== "fact") return expect.fail("Grow siteRoom must be a fact.");
    field.kind = kinds;
    const slot = child.items["room"]!.refs["siteRoom"]!.to;
    if (slot.type !== "fact") return expect.fail("Grow siteRoom slot must be a fact.");
    slot.kind = kinds;
  };
  return [
    { name: "retiring a confirmed backing slot", input: grow(parent => {
      parent.acts["retire"] = { step: "transition", on: "room", grant: "grow.configure", fields: {}, also: {},
        guards: [{ state: ["active"] }], effects: [{ state: "failed" }], sends: [], attention: [] };
    }) },
    { name: "retiring a backing slot through the Site's selected room", input: grow(parent => {
      parent.items["site"]!.refs["selected"] = { fixed: false, required: false, to: { type: "item", of: "room" } };
      parent.acts["select-room"] = { step: "transition", on: "site", grant: "grow.configure",
        fields: { room: { type: "item", of: "room", required: true } }, also: {}, guards: [],
        effects: [{ ref: { slot: "selected", from: { field: "room" } } }], sends: [], attention: [] };
      parent.acts["retire-selected-room"] = { step: "transition", on: "site", grant: "grow.configure", fields: {},
        also: { selected: { item: "room", via: { of: "on", slot: "selected" } } },
        guards: [{ of: "also.selected", state: ["active"] }],
        effects: [{ of: "also.selected", state: "failed" }], sends: [], attention: [] };
    }) },
    { name: "repeated creation from the singleton Site", input: grow((parent, child) => {
      backup(parent); birthKinds(child, ["open-backup-slot"]);
      const creator = parent.acts["create-room"]!;
      creator.step = "transition"; creator.on = "site"; creator.effects = [];
      creator.fields["slot"] = { type: "item", of: "room", required: true };
      creator.also = { slot: { item: "room", by: "slot" } };
      const send = creator.sends[0]!;
      if (!("create" in send)) return expect.fail("Grow requires its creation.");
      send.create.fields["siteRoom"] = { item: "also.slot" };
      for (const [name, effects] of Object.entries(send.create.result)) send.create.result[name as keyof typeof send.create.result] = effects.map(effect => ({ ...effect, of: "also.slot" }));
    }) },
    { name: "refusal also frees a previous confirmed slot", input: grow((parent, child) => {
      backup(parent); birthKinds(child, ["create-room", "open-backup-slot"]);
      const creator = parent.acts["create-room"]!;
      creator.fields["previous"] = { type: "item", of: "room", required: true };
      creator.also = { previous: { item: "room", by: "previous" } };
      const send = creator.sends[0]!;
      if ("create" in send) send.create.result.refused = [{ state: "failed" }, { of: "also.previous", state: "failed" }];
    }) },
    { name: "recyclable related items", input: grow((_parent, child) => { child.items["room"]!.states["ended"] = { final: true }; }) },
    { name: "a creation conflict frees its backing slot", input: grow(parent => {
      const send = parent.acts["create-room"]!.sends[0]!;
      if ("create" in send) send.create.result.conflict = [{ state: "failed" }];
    }) },
  ];
}

// Deliberately unchecked TEST producer: this tests hostile signed input at
// the byte boundary, independently of pack's refusal before signing. The
// literal topology has exactly one Site -> Room creation edge in every case.
function signedGrowWire(input: PackageGraphInput) {
  expect(input.definitions).toHaveLength(2);
  const source = packageInput(input), semantic = { ...source.semantic, creates: [{ from: input.entry, to: input.definitions[1]!.id }] };
  const domain = (tag: string, value: unknown) => utf8(`${tag}\n${canonicalize(value)}`);
  const semanticId = digestBytes(domain("dap-application-semantics-2", semantic));
  const presentation = { ...source.presentation, semantic: semanticId };
  const manifest = { v: 2, name: source.name, version: source.version, publisher: keys.rita.key,
    semantic: semanticId, presentation: digestBytes(domain("dap-application-presentation-2", presentation)) };
  const signedBytes = domain("dap-application-release-signature-2", manifest), sig = sign(keys.rita.secret, signedBytes);
  expect(verify(keys.rita.key, sig, signedBytes)).toBe(true);
  const release = { manifest, sig };
  return { bytes: utf8(canonicalize({ v: 2, semantic, presentation, release })), release: digestBytes(domain("dap-application-release-2", release)) };
}

test("Grow's three retained child slots prove three lifetime relation keys, rather than live maxima alone", async () => {
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
  const validWire = signedGrowWire(input);
  expect(validatePackage(validWire.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, validWire.release)).toMatchObject({ ok: true, kind: "graph" });
  for (const variant of lifetimeVariants()) {
    expect(checkPackageGraph(variant.input).findings.map(finding => finding.reason), variant.name).toEqual(["fan-in-unproved"]);
    let signatures = 0;
    const packed = packApplication2(packageInput(variant.input), { key: keys.rita.key, sign: bytes => { signatures++; return sign(keys.rita.secret, bytes); } });
    await expect(packed, variant.name).rejects.toMatchObject({ findings: [expect.objectContaining({ reason: "fan-in-unproved" })] });
    expect(signatures, variant.name).toBe(0);
    const hostile = signedGrowWire(variant.input);
    expect(validatePackage(hostile.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, hostile.release), variant.name).toMatchObject({
      ok: false, kind: "codec", reason: "invalid", findings: [expect.objectContaining({ reason: "fan-in-unproved" })],
    });
  }
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

test("Grow rights check declared ownership and warn without claiming complete writer coverage", async () => {
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
  const packet = await packApplication2(packageInput(opening), { key: keys.rita.key, sign: bytes => sign(keys.rita.secret, bytes) });
  expect(validatePackage(packet.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, packet.ids.release)).toMatchObject({
    ok: true, kind: "graph", findings: [expect.objectContaining({ reason: "unowned-bound", severity: "warning" })],
  });
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
  expect(validatePackage(packet.bytes, PROPOSED_BOUNDS, RULE_PROFILES, { bytes: packet.bytes.length }, packet.ids.release)).toMatchObject({ ok: true });
  for (const bounds of [{ bytes: packet.bytes.length - 1 }, { definitions: 1 }]) {
    expect(validatePackage(packet.bytes, PROPOSED_BOUNDS, RULE_PROFILES, bounds)).toMatchObject({
      ok: false, kind: "codec", reason: "limit", findings: [expect.objectContaining({ reason: "bounds" })],
    });
  }
  const rejected = packApplication2(packageInput(grow(parent => { parent.receives["room-summary"]!.copies = 2; })), signer);
  await expect(rejected).rejects.toBeInstanceOf(ApplicationPackageValidationError);
  await expect(rejected).rejects.toMatchObject({ findings: [expect.objectContaining({ reason: "fan-in-exceeds-copies" })] });
});

function automaticCycle(guarded: boolean) {
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
}

test("Grow's automatic create/report cycle needs an explicit state condition, without claiming termination", () => {
  expect(checkPackageGraph(automaticCycle(true)).findings).toEqual([]);
  expect(checkPackageGraph(automaticCycle(false)).findings.map(finding => finding.reason)).toEqual(["cycle-unacknowledged"]);
});

function pendingCreation(timer: boolean) {
  return grow(parent => {
  parent.items["room"]!.values["deadline"] = { fixed: false, required: false, of: { type: "time" } };
  const create = parent.acts["create-room"]!;
  create.effects = [...create.effects, { value: { slot: "deadline", from: { time: { plusSeconds: 30 } } } }];
  parent.acts["settle-room"] = { step: "transition", on: "room", grant: "grow.configure", also: {}, fields: {},
    guards: [{ state: ["pending"] }], settles: { of: "on", in: ["pending"] }, effects: [{ state: "active" }], sends: [], attention: [] };
  if (timer) parent.timed["creation-expired"] = { on: "room", states: ["pending"], deadline: "deadline", effects: [{ state: "conflicted" }], attention: [] };
  });
}

test("Grow's declared pending creation work needs its own timed exit without recycling a successful child slot", () => {
  const settled = checkPackageGraph(pendingCreation(true));
  expect(settled.findings).toEqual([]);
  expect(settled.instances[1]!.maximum).toBe(3);
  expect(checkPackageGraph(pendingCreation(false)).findings.map(finding => finding.reason)).toEqual(["unsettled-pending"]);
});

// These intentional future-form inputs bypass native validation in the
// fixture. No current Native or future-slice admission is claimed for them.
test("planned definition forms refuse by name before signing and from correctly signed package bytes", async () => {
  const cases: { name: string; change: (parent: DeclaredDefinition, child: DeclaredDefinition) => void }[] = [
    { name: "P4 states", change: parent => { Object.assign(parent.acts["create-room"]!, { states: ["pending"] }); } },
    { name: "P1g reads", change: parent => { Object.assign(parent.acts["create-room"]!, { reads: ["room"] }); } },
    { name: "P2 spacing", change: parent => { Object.assign(parent.receives["room-summary"]!, { spacing: { seconds: 5 } }); } },
    { name: "P3 timed sends", change: (_parent, child) => { Object.assign(child.timed[Object.keys(child.timed)[0]!]!, { sends: [] }); } },
    { name: "S3 sequenced", change: parent => { Object.assign(parent, { level: "sequenced" }); } },
  ];
  const good = signedGrowWire(grow());
  expect(validatePackage(good.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, good.release)).toMatchObject({ ok: true, kind: "graph" });
  for (const variant of cases) {
    const input = grow(variant.change, undefined, [], { nativeValidation: false });
    expect(checkPackageGraph(input).findings.map(finding => finding.reason), variant.name).toEqual(["unsupported-form"]);
    let signatures = 0;
    await expect(packApplication2(packageInput(input), { key: keys.rita.key, sign: bytes => { signatures++; return sign(keys.rita.secret, bytes); } }), variant.name)
      .rejects.toMatchObject({ findings: [expect.objectContaining({ reason: "unsupported-form" })] });
    expect(signatures, variant.name).toBe(0);
    const signed = signedGrowWire(input);
    expect(validatePackage(signed.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, signed.release), variant.name).toMatchObject({
      ok: false, kind: "codec", reason: "invalid", findings: [expect.objectContaining({ reason: "unsupported-form" })],
    });
  }
});

// The paired inputs pass whole native validation. This protects the two byte
// boundaries separately from the component cases: no signature for authoring
// refusals, and a named refusal even for an unchecked but validly signed wire.
test("P1 graph refusals retain their sole reason through packing and signed package validation", async () => {
  const base = grow(), right = { ...base, composition: { ...base.composition, rights: { rooms: { owner: base.entry } },
    exercises: [{ definition: base.entry, row: "acts.create-room", right: "rooms" }] } };
  const alternate = structuredClone(room), label = alternate.items["room"]!.values["label"]!.of;
  if (label.type !== "text") return expect.fail("Grow label must be text.");
  label.max = 81;
  const unreachable = grow(parent => { parent.receives["unused-summary"] = { ...structuredClone(parent.receives["room-summary"]!), message: "unused-summary" }; });
  const unowned = { ...unreachable, composition: { ...unreachable.composition, order: [...unreachable.composition.order,
    { definition: unreachable.entry, handler: "unused-summary", by: "any" as const }] } };
  const cases: { reason: string; good: PackageGraphInput; bad: PackageGraphInput }[] = [
    { reason: "fan-in-exceeds-copies", good: base, bad: grow(parent => { parent.receives["room-summary"]!.copies = 2; }) },
    { reason: "unbound-endpoint", good: base, bad: grow(parent => {
      parent.acts["rebind-room"] = { step: "transition", on: "room", grant: "grow.configure", fields: { peer: { type: "scope", kind: "lane", required: true } }, also: {},
        guards: [{ state: ["active"] }], effects: [{ ref: { slot: "scope", from: { field: "peer" } } }], sends: [], attention: [] };
    }) },
    { reason: "wrong-peer", good: base, bad: grow(() => {}, definitionDigest(alternate)) },
    { reason: "unhandled-result", good: base, bad: grow((_parent, child) => { const send = child.acts["report-site"]!.sends[0]!; if ("relate" in send) delete send.relate.result.undelivered; }) },
    { reason: "ungranted-act", good: base, bad: { ...base, roles: { operator: base.roles["operator"]!.filter(action => action !== "grow.tend") } } },
    { reason: "right-not-owned", good: right, bad: { ...right, composition: { ...right.composition, rights: { rooms: { owner: base.definitions[1]!.id } } } } },
    { reason: "order-undeclared", good: base, bad: { ...base, composition: { ...base.composition, order: [] } } },
    { reason: "unknown-message", good: base, bad: grow((_parent, child) => {
      const send = structuredClone(child.acts["report-site"]!.sends[0]!); if ("relate" in send) send.relate.name = "unknown-summary";
      child.acts["report-site"]!.sends = [...child.acts["report-site"]!.sends, send];
    }) },
    { reason: "field-mismatch", good: base, bad: grow(parent => { const field = parent.receives["room-summary"]!.fields["openAlerts"]!; if (field.type === "int") field.max = 3; }) },
    { reason: "unreachable-handler", good: base, bad: unowned },
    { reason: "cycle-unacknowledged", good: automaticCycle(true), bad: automaticCycle(false) },
    { reason: "unsettled-pending", good: pendingCreation(true), bad: pendingCreation(false) },
  ];
  for (const pair of cases) {
    const good = signedGrowWire(pair.good), bad = signedGrowWire(pair.bad);
    expect(validatePackage(good.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, good.release), pair.reason).toMatchObject({ ok: true, kind: "graph", findings: [] });
    const refused = validatePackage(bad.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, bad.release);
    expect(refused, pair.reason).toMatchObject({ ok: false, kind: "codec", reason: "invalid" });
    expect(new Set(refused.findings.map(finding => finding.reason)), pair.reason).toEqual(new Set([pair.reason]));
    let signatures = 0;
    await expect(packApplication2(packageInput(pair.bad), { key: keys.rita.key, sign: bytes => { signatures++; return sign(keys.rita.secret, bytes); } }), pair.reason)
      .rejects.toMatchObject({ findings: expect.arrayContaining([expect.objectContaining({ reason: pair.reason })]) });
    expect(signatures, pair.reason).toBe(0);
  }
});
