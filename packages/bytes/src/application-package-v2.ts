/** Versioned projections and presentation declarations. The legacy reader
 * is never widened; neither codec admits native execution or viewer rights. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
import { digestBytes, isDigest, isRecord, parseStrict, parseStrictBytes, utf8, verify } from "./index.ts";
import { applicationJson } from "./application-json.ts";
import { ApplicationPackageError, type ApplicationIds, type ApplicationPackageLimits } from "./application-types.ts";
import { declarations, fail, limits, only, presentation as presentation1, release as release1, semantics as semantics1 } from "./application-package-validation.ts";
import { bindApplicationProjection } from "./application-projection-binding.ts";
import { bindApplicationViews } from "./application-view-binding.ts";
import { isApplicationViewResource } from "./application-view.ts";
import type { Signer } from "./signer.ts";
import type { ApplicationPackage2, ApplicationPackageInput2, ApplicationPresentation2, ApplicationRelease2, ApplicationReleaseProof2, ApplicationSemantics2, PackedApplication2 } from "./application-v2-types.ts";
export * from "./application-v2-types.ts";

const TAGS = { semantic: "dap-application-semantics-2", presentation: "dap-application-presentation-2", release: "dap-application-release-2", signature: "dap-application-release-signature-2" } as const;
function domain(kind: keyof typeof TAGS, value: unknown, bounds: ApplicationPackageLimits): Uint8Array {
  const head = utf8(TAGS[kind] + "\n"), body = utf8(applicationJson(value, bounds.bytes));
  const bytes = new Uint8Array(head.length + body.length); bytes.set(head); bytes.set(body, head.length); return bytes;
}
const id = (kind: "semantic" | "presentation" | "release", value: unknown, bounds: ApplicationPackageLimits): Digest => digestBytes(domain(kind, value, bounds));
function binding<T>(work: () => T): T {
  try { return work(); }
  catch (error) { if (error instanceof ApplicationPackageError) throw error; return fail(); }
}
function semantics(value: unknown, bounds: ApplicationPackageLimits): ApplicationSemantics2 {
  const body = only(value, "capabilities,creates,definitions,entry,host,predecessor,projections,roles,v");
  if (body["v"] !== 2 || !isRecord(body["projections"])) return fail();
  // Reuse the unchanged closure, requirements and role validation. Only this
  // explicit v2 entry point supplies the separately checked projection place.
  const base = semantics1({ ...body, v: 1, projections: {} }, bounds);
  const projections = body["projections"];
  if (Object.keys(projections).length > 32) return fail("limit");
  const covered = new Set<Digest>();
  for (const [name, given] of Object.entries(projections)) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(name) || !isRecord(given) || !isDigest(given["definition"])) return fail();
    const part = base.definitions.find(part => part.id === given["definition"]);
    if (!part) return fail("closure");
    binding(() => bindApplicationProjection(given, parseStrict(part.bytes) as DeclaredDefinition)); covered.add(part.id);
  }
  if (base.definitions.some(part => !covered.has(part.id))) return fail("closure");
  applicationJson({ host: base.host, roles: base.roles, capabilities: base.capabilities, projections }, bounds.metadataBytes);
  return body as unknown as ApplicationSemantics2;
}
function presentation(value: unknown, semantic: ApplicationSemantics2, semanticId: Digest, bounds: ApplicationPackageLimits): ApplicationPresentation2 {
  const body = only(value, "assets,descriptions,entry,resources,semantic,v,views");
  if (body["v"] !== 2 || !isRecord(body["resources"])) return fail();
  const { views: _views, resources: _resources, ...legacy } = body;
  const base = presentation1({ ...legacy, v: 1 }, semanticId, bounds);
  const resources = body["resources"];
  if (Object.keys(resources).length > 32) return fail("limit");
  for (const [uri, path] of Object.entries(resources)) {
    if (!isApplicationViewResource(uri) || typeof path !== "string") return fail();
    const asset = base.assets.find(asset => asset.path === path);
    if (!asset || !/^text\/html(?:; charset=utf-8)?$/.test(asset.mediaType)) return fail("closure");
  }
  const views = binding(() => bindApplicationViews(body["views"], semantic.projections, semantic.definitions));
  for (const view of Object.values(views)) if (view.kind === "surface" && !Object.hasOwn(resources, view.resource)) return fail("closure");
  applicationJson({ descriptions: base.descriptions, views, resources }, bounds.metadataBytes);
  return body as unknown as ApplicationPresentation2;
}
function release(value: unknown, semantic: Digest, presentation: Digest): ApplicationRelease2 {
  const body = only(value, "manifest,sig"), manifest = only(body["manifest"], "name,presentation,publisher,semantic,v,version");
  if (manifest["v"] !== 2) return fail();
  release1({ ...body, manifest: { ...manifest, v: 1 } }, semantic, presentation);
  return body as unknown as ApplicationRelease2;
}
function freeze(value: unknown): void {
  if (value !== null && typeof value === "object") { for (const part of Object.values(value)) freeze(part); Object.freeze(value); }
}
function signed(semantic: ApplicationSemantics2, value: unknown, expected: Digest | null, bounds: ApplicationPackageLimits): { release: ApplicationRelease2; ids: ApplicationIds } {
  const semanticId = id("semantic", semantic, bounds), body = only(value, "manifest,sig");
  if (!isRecord(body["manifest"]) || !isDigest(body["manifest"]["presentation"])) return fail();
  const presentationId = body["manifest"]["presentation"], checked = release(value, semanticId, presentationId);
  if (!verify(checked.manifest.publisher, checked.sig, domain("signature", checked.manifest, bounds))) return fail("signature");
  const releaseId = id("release", checked, bounds);
  if (expected !== null && (!isDigest(expected) || releaseId !== expected)) return fail("integrity");
  return { release: checked, ids: Object.freeze({ semantic: semanticId, presentation: presentationId, release: releaseId }) };
}
export function readApplicationReleaseProof2(semantic: unknown, release: unknown, expected: Digest,
  overrides: Partial<ApplicationPackageLimits> = {}): ApplicationReleaseProof2 {
  const bounds = limits(overrides), owned = only(parseStrict(applicationJson({ semantic, release }, bounds.bytes)), "release,semantic");
  const checked = semantics(owned["semantic"], bounds);
  if (!isDigest(expected)) return fail("integrity");
  const proof = signed(checked, owned["release"], expected, bounds); freeze(owned);
  return Object.freeze({ semantic: checked, ...proof });
}
export function readApplicationPackage2(bytes: Uint8Array, expected: Digest | null, overrides: Partial<ApplicationPackageLimits> = {}): PackedApplication2 {
  const bounds = limits(overrides);
  if (!(bytes instanceof Uint8Array) || bytes.length > bounds.bytes) return fail("limit");
  const ownedBytes = new Uint8Array(bytes);
  try {
    const parsed = parseStrictBytes(ownedBytes), canonical = utf8(applicationJson(parsed, bounds.bytes));
    if (canonical.length !== ownedBytes.length || canonical.some((byte, i) => byte !== ownedBytes[i])) return fail();
    const body = only(parsed, "presentation,release,semantic,v"); if (body["v"] !== 2) return fail();
    const checked = semantics(body["semantic"], bounds), semanticId = id("semantic", checked, bounds);
    const presented = presentation(body["presentation"], checked, semanticId, bounds);
    const proof = signed(checked, body["release"], expected, bounds);
    if (proof.ids.presentation !== id("presentation", presented, bounds)) return fail("integrity");
    freeze(body); return { bytes: ownedBytes, ids: proof.ids, package: body as unknown as ApplicationPackage2 };
  } catch (error) { if (error instanceof ApplicationPackageError) throw error; return fail(); }
}
export async function packApplication2(input: ApplicationPackageInput2, signer: Signer, overrides: Partial<ApplicationPackageLimits> = {}): Promise<PackedApplication2> {
  const bounds = limits(overrides), publisher = signer.key;
  const owned = parseStrict(applicationJson(input, bounds.bytes)) as ApplicationPackageInput2;
  only(owned, "name,presentation,semantic,version");
  only(owned.semantic, "capabilities,definitions,entry,host,predecessor,projections,roles,v");
  only(owned.presentation, "assets,descriptions,entry,resources,v,views");
  const definitions = [...owned.semantic.definitions].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const checked = semantics({ ...owned.semantic, definitions, creates: declarations(definitions, bounds).creates,
    roles: Object.fromEntries(Object.entries(owned.semantic.roles).map(([role, actions]) => [role, [...actions].sort()])),
    capabilities: [...owned.semantic.capabilities].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    host: { ...owned.semantic.host, profiles: [...owned.semantic.host.profiles].sort() } }, bounds);
  const semanticId = id("semantic", checked, bounds);
  const presented = presentation({ ...owned.presentation, semantic: semanticId,
    assets: [...owned.presentation.assets].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) }, checked, semanticId, bounds);
  const manifest = { v: 2 as const, name: owned.name, version: owned.version, publisher, semantic: semanticId, presentation: id("presentation", presented, bounds) };
  release({ manifest, sig: "A".repeat(86) }, semanticId, manifest.presentation);
  const sig = await signer.sign(domain("signature", manifest, bounds));
  return readApplicationPackage2(utf8(applicationJson({ v: 2, semantic: checked, presentation: presented, release: { manifest, sig } }, bounds.bytes)), null, bounds);
}
