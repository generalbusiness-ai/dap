import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { expect, test } from "vitest";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, digestBytes, keyIdOfSecret, sign, utf8 } from "../src/index.ts";
import { definition as empty, secret } from "./fixtures.ts";
import { packApplication, readApplicationPackage, readApplicationReleaseProof } from "../src/application-package.ts";
import { ApplicationPackageValidationError, packApplication2, readApplicationPackage2, readApplicationReleaseProof2, type ApplicationPackageInput2 } from "../src/application-package-v2.ts";
import { readApplicationProjection } from "../src/application-projection.ts";
const signer = { key: keyIdOfSecret(secret), sign: (bytes: Uint8Array) => sign(secret, bytes) };
// Small made-up schema, real package hashes and signatures. This is no
// native validator, host trust, installation, browser or authority witness.
const definition: DeclaredDefinition = { ...empty, items: { note: {
  many: true, max: 10, initial: "open", states: { open: { final: false }, held: { final: false } }, refs: {}, parties: {},
  values: { text: { required: true, fixed: false, of: { type: "text", max: 100 } } },
} }, acts: { touch: { step: "transition", on: "note", grant: "app.edit", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] } } };
function input() {
  const projection = readApplicationProjection({ v: 1, definition: definitionDigest(definition), revision: "revision", sources: {
    note: { item: "note", read: "item", states: ["held", "open"], limit: 1, fields: {
      text: { from: { kind: "value", name: "text" }, of: { type: "text", max: 100 }, nullable: false },
    } },
  } });
  return { name: "ai.generalbusiness.projection-fixture", version: "0.1.0", semantic: {
    ...emptyPackageComposition(), v: 2, entry: definitionDigest(definition), definitions: [{ id: definitionDigest(definition), bytes: canonicalize(definition) }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] }, projections: { "room.note": projection },
    capabilities: [], roles: { member: ["app.edit"] }, predecessor: null,
  }, presentation: {
    v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html; charset=utf-8", bytes: b64url(utf8("<p>Generic view</p>")) }],
    descriptions: {}, resources: {}, views: { note: {
      kind: "card", projection: "room.note", item: "note", revision: "revision", title: "text", summary: null, actor: null, facts: ["state"],
      acts: [{ act: "touch", label: "Touch", needs: "app.edit", when: "state = 'open'" }],
      context: "Note {id} v{revision}", fallback: "Note {id} ({state}): {text}", waiting: {}, refresh: 2000, display: "inline", back: null,
    } },
  } } satisfies ApplicationPackageInput2;
}
function legacySemantic() {
  const { connections: _connections, rights: _rights, exercises: _exercises, groups: _groups,
    order: _order, derivation: _derivation, parameters: _parameters, ...semantic } = input().semantic;
  return semantic;
}
test("v2 binds projections to semantic identity and views only to presentation identity", async () => {
  const first = await packApplication2(input(), signer), repeated = await packApplication2(input(), signer);
  expect(repeated.bytes).toEqual(first.bytes); expect(readApplicationPackage2(first.bytes, first.ids.release)).toEqual(first);
  const view = input(); view.presentation.views.note.acts[0]!.label = "Record touch";
  const presented = await packApplication2(view, signer);
  expect(presented.ids.semantic).toBe(first.ids.semantic); expect(presented.ids.presentation).not.toBe(first.ids.presentation);
  const declared = input(), projection = declared.semantic.projections["room.note"];
  declared.semantic.projections["room.note"] = readApplicationProjection({ ...projection,
    sources: { ...projection.sources, note: { ...projection.sources["note"], states: ["open"] } } });
  expect((await packApplication2(declared, signer)).ids.semantic).not.toBe(first.ids.semantic);
  const version = input(); version.version = "0.1.1";
  const released = await packApplication2(version, signer);
  expect(released.ids.semantic).toBe(first.ids.semantic); expect(released.ids.presentation).toBe(first.ids.presentation); expect(released.ids.release).not.toBe(first.ids.release);
  expect(readApplicationReleaseProof2(first.package.semantic, first.package.release, first.ids.release)).toEqual({ semantic: first.package.semantic, release: first.package.release, ids: first.ids });
  expect(() => readApplicationPackage(first.bytes, null)).toThrow("application-package-invalid");
  expect(() => readApplicationReleaseProof(first.package.semantic, first.package.release, first.ids.release)).toThrow("application-package-invalid");
  const { views: _views, resources: _resources, ...presentation } = input().presentation;
  const legacy = await packApplication({ ...input(), semantic: { ...legacySemantic(), v: 1, projections: {} }, presentation: { ...presentation, v: 1 } }, signer);
  expect(() => readApplicationPackage2(legacy.bytes, null)).toThrow("application-package-invalid");
  // A correctly signed legacy proof with nonempty projections must still
  // refuse. Failure cannot be attributed to a bad signature or envelope v2.
  const nonempty = { ...legacy.package.semantic, projections: input().semantic.projections };
  const semanticId = digestBytes(utf8("dap-application-semantics-1\n" + canonicalize(nonempty)));
  const manifest = { ...legacy.package.release.manifest, semantic: semanticId };
  const signed = { manifest, sig: signer.sign(utf8("dap-application-release-signature-1\n" + canonicalize(manifest))) };
  const releaseId = digestBytes(utf8("dap-application-release-1\n" + canonicalize(signed)));
  expect(() => readApplicationReleaseProof(nonempty, signed, releaseId)).toThrow("application-package-invalid");
});

test("v2 refuses changed signatures, missing projections and unbound views before signing", async () => {
  const packet = await packApplication2(input(), signer);
  const changed = JSON.parse(new TextDecoder().decode(packet.bytes)); changed.presentation.views.note.fallback = "Changed {text}";
  expect(() => readApplicationPackage2(utf8(canonicalize(changed)), packet.ids.release)).toThrow("application-package-integrity");
  expect(() => readApplicationReleaseProof2(packet.package.semantic, { ...packet.package.release, sig: "A".repeat(86) }, packet.ids.release)).toThrow("application-package-signature");
  let calls = 0; const tracked = { key: signer.key, sign: (bytes: Uint8Array) => { calls++; return signer.sign(bytes); } };
  const missing = input(); missing.semantic.projections = {} as typeof missing.semantic.projections;
  await expect(packApplication2(missing, tracked)).rejects.toThrow("application-package-closure");
  const wrong = input(); wrong.presentation.views.note.projection = "not-declared";
  await expect(packApplication2(wrong, tracked)).rejects.toThrow("application-package-invalid");
  const getter = input(); let gets = 0;
  Object.defineProperty(getter.semantic, "projections", { enumerable: true, get() { gets++; return {}; } });
  await expect(packApplication2(getter, tracked)).rejects.toThrow("application-package-invalid");
  expect(calls).toBe(0); expect(gets).toBe(0);
});

test("v2 signs explicit composition, refuses ambiguous references and keeps later forms unsupported", async () => {
  const plain = await packApplication2(input(), signer), id = definitionDigest(definition);
  expect(plain.package.semantic).toMatchObject({ connections: [], rights: {}, exercises: [], groups: [], order: [], derivation: {}, parameters: {} });
  const composed: ApplicationPackageInput2 = { ...input(), semantic: { ...input().semantic,
    rights: { ["__proto__"]: { owner: id } }, exercises: [{ definition: id, row: "acts.touch", right: "__proto__" }],
  } };
  const packet = await packApplication2(composed, signer);
  expect(packet.ids.semantic).not.toBe(plain.ids.semantic);
  expect(readApplicationPackage2(packet.bytes, packet.ids.release).package.semantic.exercises).toEqual(composed.semantic.exercises);
  for (const exercises of [[...composed.semantic.exercises!, ...composed.semantic.exercises!], [{ definition: digestBytes(utf8("not in this package")), row: "acts.touch", right: "__proto__" }]]) {
    await expect(packApplication2({ ...composed, semantic: { ...composed.semantic, exercises } }, signer)).rejects.toMatchObject({ findings: [{ reason: "bounds" }] });
  }
  for (const future of [{ groups: [{ name: "group", members: [{ name: "member", definition: id }], lifetime: { seconds: 60 } }] },
    { parameters: { rooms: { type: "int" as const, default: 3, min: 1, max: 10 } } }, { derivation: { [id]: { parent: id, patch: {} } } }]) {
    const refused = packApplication2({ ...input(), semantic: { ...input().semantic, ...future } }, signer);
    await expect(refused).rejects.toBeInstanceOf(ApplicationPackageValidationError);
    await expect(refused).rejects.toMatchObject({ findings: [{ reason: "unsupported-form" }] });
  }
});

test("a signed host requirement names archive explicitly and refuses unknown or ambiguous requirements", async () => {
  const original = await packApplication2(input(), signer);
  const requested: ApplicationPackageInput2 = { ...input(), semantic: { ...input().semantic, host: { ...input().semantic.host, requires: ["archive"] } } };
  const required = await packApplication2(requested, signer);
  expect(required.ids.semantic).not.toBe(original.ids.semantic);
  expect(readApplicationPackage2(required.bytes, required.ids.release).package.semantic.host.requires).toEqual(["archive"]);
  for (const requires of [[], ["unknown"], ["archive", "archive"], "archive", null]) {
    const bad: ApplicationPackageInput2 = input(); Reflect.set(bad.semantic.host, "requires", requires);
    await expect(packApplication2(bad, signer)).rejects.toThrow("application-package-invalid");
  }
});

test("a child created only by a late replacement belongs to the signed package closure", async () => {
  const child: DeclaredDefinition = { ...empty, name: "test.late-child" }, childId = definitionDigest(child);
  const parent: DeclaredDefinition = { ...empty, name: "test.late-parent", receives: {
    spawn: { class: "tell", message: "spawn", from: { kind: "directory" }, opens: null, also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [],
      late: { within: { seconds: 30 }, reason: "old-spawn", then: { sends: [{ create: { kind: "directory", definition: childId, fields: {}, result: {} } }] } } },
  } }, parentId = definitionDigest(parent);
  // The shared declaration-closure reader is exercised through v1 here;
  // v2 additionally requires a bound projection for each definition.
  const { views: _views, resources: _resources, ...presentation } = input().presentation;
  const packet: Parameters<typeof packApplication>[0] = { ...input(), semantic: { ...legacySemantic(), v: 1, entry: parentId, projections: {}, roles: {},
    definitions: [{ id: parentId, bytes: canonicalize(parent) }] }, presentation: { ...presentation, v: 1 } };
  let calls = 0; const tracked = { key: signer.key, sign: (bytes: Uint8Array) => { calls++; return signer.sign(bytes); } };
  await expect(packApplication(packet, tracked)).rejects.toThrow("application-package-closure");
  expect(calls).toBe(0);
  const complete = await packApplication({ ...packet, semantic: { ...packet.semantic, definitions: [...packet.semantic.definitions, { id: childId, bytes: canonicalize(child) }] } }, tracked);
  expect(complete.package.semantic.creates).toEqual([{ from: parentId, to: childId }]);
  expect(readApplicationPackage(complete.bytes, complete.ids.release).ids).toEqual(complete.ids);
});
