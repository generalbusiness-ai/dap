import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { b64url, canonicalize, definitionDigest, digestBytes, sign, utf8, verify } from "@generalbusiness/dap-bytes";
import { ApplicationPackageValidationError, packApplication2, readApplicationProjection, readApplicationPackage2, readPublishedApplicationPackage2, readPublishedApplicationReleaseProof2, type ApplicationPackageInput2 } from "@generalbusiness/dap-bytes/application-v2";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Guard } from "@generalbusiness/dap-contract";
import { checkPackageGraph, type PackageGraphInput } from "@generalbusiness/dap-package-graph";
import { validateDefinition, validatePackage } from "../src/index.ts";
import { RULE_PROFILES } from "../src/rule/index.ts";
import { room } from "../../../examples/grow/room.ts";
import { keys } from "./fixtures.ts";
import { grow, preFailureRelation, checkedGraph } from "./fixtures-package-graph.ts";
import { DEMO_RELEASE, DEMO_PUBLISHER } from "../../../examples/grow/demo-release.ts";
import { publishedCopies, insufficientCopies, twoItems as twoItemsData, conflictFrees, recyclable as recyclableData, rewritable as rewritableData, missingResult, openingReport, narrowField, unknownMessage, unusedHandler, packerCopies, pairedUnusedHandler, pairedCopies, pairedRebind, pairedMissingResult, pairedUnknownMessage, pairedNarrowField, lifetimeVariantsData, repeatedReporterData, automaticCycleData, cycleAlternativesData, pendingCreationData, differentRoomData } from "./definition-corpus/package-graph-variants.ts";
const lifetimeVariants = () => lifetimeVariantsData().map(row => ({ ...row, input: checkedGraph(row.input) }));
const repeatedReporter = (copies = 3) => checkedGraph(repeatedReporterData(copies));
const automaticCycle = (guarded: boolean, additional: readonly Guard[] = []) => checkedGraph(automaticCycleData(guarded, additional));
const cycleAlternatives = () => cycleAlternativesData().map(row => ({ ...row, good: checkedGraph(row.good), bad: checkedGraph(row.bad) }));
const pendingCreation = (timer: boolean) => checkedGraph(pendingCreationData(timer));
const maintained = JSON.parse(readFileSync(new URL("../../../examples/grow/check/dap.application.json", import.meta.url), "utf8")) as {
  capabilities: ApplicationPackageInput2["semantic"]["capabilities"];
};

// Graph components use actual Grow declarations and native validation.
// The final case also crosses the signed package codec and public validator.
// All variants pass native whole-definition validation first. The backup
// opening makes the aliases reachable without adding a second child creator.

// Deliberately unchecked TEST producer: this tests hostile signed input at
// the byte boundary, independently of pack's refusal before signing. The
// literal topology has exactly one Site -> Room creation edge in every case.
function signedGrowWire(input: PackageGraphInput, omitComposition = false) {
  expect(input.definitions).toHaveLength(2);
  const source = packageInput(input), semantic = { ...source.semantic, creates: [{ from: input.entry, to: input.definitions[1]!.id }] };
  if (omitComposition) for (const key of ["connections", "rights", "exercises", "groups", "order", "derivation", "parameters"]) Reflect.deleteProperty(semantic, key);
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

// The only earlier-shape exception is the already published Grow release.
// No operator key, trust mutation, new signing or network access is involved.
test("published consumption preserves the exact old Grow packet while new pack and validation require composition", async () => {
  const bytes = new Uint8Array(readFileSync(new URL("../../../examples/grow/demo/application.dap.json", import.meta.url)));
  const published = readPublishedApplicationPackage2(bytes, DEMO_RELEASE);
  expect(published.bytes).toEqual(bytes);
  expect(published.ids.release).toBe(DEMO_RELEASE);
  expect(published.package.release.manifest.publisher).toBe(DEMO_PUBLISHER);
  expect(Object.keys(published.package.semantic).sort()).toEqual(["capabilities", "creates", "definitions", "entry", "host", "predecessor", "projections", "roles", "v"]);
  expect(readPublishedApplicationPackage2(bytes, null).ids).toEqual(published.ids);
  expect(readPublishedApplicationReleaseProof2(published.package.semantic, published.package.release, DEMO_RELEASE))
    .toEqual({ semantic: published.package.semantic, release: published.package.release, ids: published.ids });
  expect(() => readApplicationPackage2(bytes, DEMO_RELEASE)).toThrow("application-package-invalid");
  expect(validatePackage(bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, DEMO_RELEASE)).toMatchObject({ ok: false, kind: "codec", reason: "invalid" });
  expect(() => readPublishedApplicationPackage2(bytes, digestBytes(utf8("another release")))).toThrow("application-package-integrity");
  const absent = packageInput(grow()); Reflect.deleteProperty(absent.semantic, "connections");
  let signatures = 0;
  await expect(packApplication2(absent, { key: keys.rita.key, sign: bytes => { signatures++; return sign(keys.rita.secret, bytes); } }))
    .rejects.toThrow("application-package-invalid");
  expect(signatures).toBe(0);
  const unrelated = signedGrowWire(grow(), true);
  expect(validatePackage(unrelated.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, unrelated.release)).toMatchObject({ ok: false, kind: "codec", reason: "invalid" });
  expect(() => readPublishedApplicationPackage2(unrelated.bytes, unrelated.release)).toThrow("application-package-invalid");
  const unproved = signedGrowWire(grow(publishedCopies));
  expect(() => readPublishedApplicationPackage2(unproved.bytes, unproved.release)).toThrow(ApplicationPackageValidationError);
  const complete = signedGrowWire(grow());
  expect(readPublishedApplicationPackage2(complete.bytes, complete.release).ids).toEqual(readApplicationPackage2(complete.bytes, complete.release).ids);
});

test("Grow's three retained child slots prove three lifetime relation keys, rather than live maxima alone", async () => {
  const input = grow(), checked = checkPackageGraph(input);
  expect(checked.findings).toEqual([]);
  expect(checked.instances).toEqual([{ definition: input.entry, maximum: 1 }, { definition: input.definitions[1]!.id, maximum: 3 }]);
  // Hand count: Site live 1+3+32=36; each Room live 1+4+12+4+4+100+32+1+32=190.
  // Three successful children add three creator entries, geneses and results;
  // their backing items and root items add six keys beside the Site's root.
  expect(checked.projected).toMatchObject({ liveItems: { acrossInstall: 606 }, successfulCreation: { entryCeiling: 10, itemKeyCeiling: 7 }, lifetime: { entries: null, itemKeys: null } });
  const insufficient = checkPackageGraph(grow(insufficientCopies));
  expect(insufficient.findings.map(finding => finding.reason)).toEqual(["fan-in-exceeds-copies"]);
  expect(insufficient.findings[0]!.message).toContain("fan-in 3 exceeds copies 2");
  const twoItems = (copies: number) => checkPackageGraph(grow(twoItemsData(copies)));
  expect(twoItems(3).findings.map(finding => finding.reason)).toEqual(["fan-in-exceeds-copies"]);
  expect(twoItems(3).findings[0]!.message).toContain("fan-in 6 exceeds copies 3");
  expect(twoItems(6).findings).toEqual([]);
  const repeated = repeatedReporter();
  expect(checkPackageGraph(repeated).findings, "Both reporting acts update the same three sender/item keys").toEqual([]);
  const packet = await packApplication2(packageInput(repeated), { key: keys.rita.key, sign: bytes => sign(keys.rita.secret, bytes) });
  expect(validatePackage(packet.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, packet.ids.release)).toMatchObject({ ok: true, kind: "graph" });
  // Each Room has one Room key and two Probe keys: the domains are disjoint.
  const separate = checkPackageGraph(preFailureRelation(false, 8));
  expect(separate.findings.map(finding => finding.reason)).toEqual(["fan-in-exceeds-copies"]);
  expect(separate.findings[0]!.message).toContain("fan-in 9 exceeds copies 8");
  const conflicted = checkPackageGraph(grow(conflictFrees));
  expect(conflicted.findings.map(finding => finding.reason)).toEqual(["fan-in-unproved"]);
  const recyclable = checkPackageGraph(grow(recyclableData));
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
  const rewritable = grow(rewritableData);
  expect(checkPackageGraph(rewritable).findings.map(finding => finding.reason)).toEqual(["unbound-endpoint"]);
  const wrongChild = grow(), original = wrongChild.composition.connections[0]!;
  expect(checkPackageGraph({ ...wrongChild, composition: { ...wrongChild.composition,
    connections: [{ ...original, to: wrongChild.entry }, wrongChild.composition.connections[1]!],
  } }).findings.map(finding => finding.reason)).toEqual(["unbound-endpoint"]);
});

test("Grow's explicit failure clauses, default grants and order each carry a separate package obligation", () => {
  expect(checkPackageGraph(grow()).findings).toEqual([]);
  const incomplete = grow(missingResult);
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
  const opening = grow(openingReport);
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
  const different = differentRoomData();
  expect(different.name).toBe(room.name);
  expect(validateDefinition(different, PROPOSED_BOUNDS, RULE_PROFILES).ok).toBe(true);
  expect(checkPackageGraph(grow(() => {}, definitionDigest(different))).findings.map(finding => finding.reason)).toEqual(["wrong-peer"]);
  const tooNarrow = grow(narrowField);
  expect(checkPackageGraph(tooNarrow).findings.map(finding => finding.reason)).toEqual(["field-mismatch"]);
  const missing = grow(unknownMessage);
  expect(checkPackageGraph(missing).findings.map(finding => finding.reason)).toEqual(["unknown-message"]);
  const unreachable = grow(unusedHandler);
  const unused = { ...unreachable, composition: { ...unreachable.composition,
    order: [...unreachable.composition.order, { definition: unreachable.entry, handler: "unused-summary", by: "any" as const }],
  } };
  expect(checkPackageGraph(unused).findings.map(finding => finding.reason)).toEqual(["unreachable-handler"]);
});

function packageInput(input: PackageGraphInput): ApplicationPackageInput2 {
  return { name: "ai.generalbusiness.grow-graph-test", version: "0.1.0", semantic: {
    v: 2, entry: input.entry, definitions: input.definitions.map(part => ({ id: part.id, bytes: canonicalize(part.definition) })).sort((a, b) => a.id.localeCompare(b.id)),
    ...input.composition, host: { execution: "recorded-do", profiles: ["restricted@1"] }, capabilities: maintained.capabilities, predecessor: null,
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
  const rejected = packApplication2(packageInput(grow(packerCopies)), signer);
  await expect(rejected).rejects.toBeInstanceOf(ApplicationPackageValidationError);
  await expect(rejected).rejects.toMatchObject({ findings: [expect.objectContaining({ reason: "fan-in-exceeds-copies" })] });
});

test("Grow's automatic create/report cycle needs an explicit state condition, without claiming termination", () => {
  expect(checkPackageGraph(automaticCycle(true)).findings).toEqual([]);
  expect(checkPackageGraph(automaticCycle(false)).findings.map(finding => finding.reason)).toEqual(["cycle-unacknowledged"]);
  for (const pair of cycleAlternatives()) {
    expect(checkPackageGraph(pair.good).findings, pair.name).toEqual([]);
    expect(checkPackageGraph(pair.bad).findings.map(finding => finding.reason), pair.name).toEqual(["cycle-unacknowledged"]);
  }
});

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
  const alternate = differentRoomData();
  const unreachable = grow(pairedUnusedHandler);
  const unowned = { ...unreachable, composition: { ...unreachable.composition, order: [...unreachable.composition.order,
    { definition: unreachable.entry, handler: "unused-summary", by: "any" as const }] } };
  const cases: { name?: string; reason: string; good: PackageGraphInput; bad: PackageGraphInput }[] = [
    { reason: "fan-in-exceeds-copies", good: base, bad: grow(pairedCopies) },
    { name: "repeated reporting of the same keys", reason: "fan-in-exceeds-copies", good: repeatedReporter(), bad: repeatedReporter(2) },
    { reason: "unbound-endpoint", good: base, bad: grow(pairedRebind) },
    { reason: "wrong-peer", good: base, bad: grow(() => {}, definitionDigest(alternate)) },
    { reason: "unhandled-result", good: base, bad: grow(pairedMissingResult) },
    { reason: "ungranted-act", good: base, bad: { ...base, roles: { operator: base.roles["operator"]!.filter(action => action !== "grow.tend") } } },
    { reason: "right-not-owned", good: right, bad: { ...right, composition: { ...right.composition, rights: { rooms: { owner: base.definitions[1]!.id } } } } },
    { reason: "order-undeclared", good: base, bad: { ...base, composition: { ...base.composition, order: [] } } },
    { reason: "unknown-message", good: base, bad: grow(pairedUnknownMessage) },
    { reason: "field-mismatch", good: base, bad: grow(pairedNarrowField) },
    { reason: "unreachable-handler", good: base, bad: unowned },
    { reason: "cycle-unacknowledged", good: automaticCycle(true), bad: automaticCycle(false) },
    ...cycleAlternatives().map(pair => ({ ...pair, reason: "cycle-unacknowledged" })),
    { reason: "unsettled-pending", good: pendingCreation(true), bad: pendingCreation(false) },
  ];
  for (const pair of cases) {
    const name = pair.name ?? pair.reason;
    const good = signedGrowWire(pair.good), bad = signedGrowWire(pair.bad);
    expect(validatePackage(good.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, good.release), name).toMatchObject({ ok: true, kind: "graph", findings: [] });
    const refused = validatePackage(bad.bytes, PROPOSED_BOUNDS, RULE_PROFILES, {}, bad.release);
    expect(refused, name).toMatchObject({ ok: false, kind: "codec", reason: "invalid" });
    expect(new Set(refused.findings.map(finding => finding.reason)), name).toEqual(new Set([pair.reason]));
    let signatures = 0;
    await expect(packApplication2(packageInput(pair.bad), { key: keys.rita.key, sign: bytes => { signatures++; return sign(keys.rita.secret, bytes); } }), name)
      .rejects.toMatchObject({ findings: expect.arrayContaining([expect.objectContaining({ reason: pair.reason })]) });
    expect(signatures, name).toBe(0);
  }
});
