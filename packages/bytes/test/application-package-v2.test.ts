import { expect, test } from "vitest";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, digestBytes, keyIdOfSecret, sign, utf8 } from "../src/index.ts";
import { definition as empty, secret } from "./fixtures.ts";
import { packApplication, readApplicationPackage, readApplicationReleaseProof } from "../src/application-package.ts";
import { packApplication2, readApplicationPackage2, readApplicationReleaseProof2, type ApplicationPackageInput2 } from "../src/application-package-v2.ts";
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
    v: 2, entry: definitionDigest(definition), definitions: [{ id: definitionDigest(definition), bytes: canonicalize(definition) }],
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
  const legacy = await packApplication({ ...input(), semantic: { ...input().semantic, v: 1, projections: {} }, presentation: { ...presentation, v: 1 } }, signer);
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
