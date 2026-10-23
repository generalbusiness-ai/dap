/** Versioned projections and presentation declarations. The legacy reader
 * is never widened; neither codec admits native execution or viewer rights. */
import { freeze } from "./values.ts";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest } from "@generalbusiness/dap-contract";
import { digestBytes, fitsFieldType, isDigest, isRecord, parseStrict, parseStrictBytes, utf8, verify } from "./index.ts";
import { applicationJson } from "./application-json.ts";
import { ApplicationPackageError, type ApplicationIds, type ApplicationPackageLimits } from "./application-types.ts";
import { declarations, fail, limits, only, presentation as presentation1, release as release1, semantics as semantics1 } from "./application-package-validation.ts";
import { bindApplicationProjection } from "./application-projection-binding.ts";
import { bindApplicationViews } from "./application-view-binding.ts";
import { isApplicationViewResource } from "./application-view.ts";
import { checkPackageGraph, PackageCompositionError, readPackageComposition } from "@generalbusiness/dap-package-graph";
import { ApplicationPackageValidationError } from "./application-v2-types.ts";
import type { Signer } from "./signer.ts";
import type { ApplicationPackage2, ApplicationPackageInput2, ApplicationPresentation2, ApplicationRelease2, ApplicationReleaseProof2, ApplicationSemantics2, PackedApplication2, PublishedApplicationSemantics2, PublishedApplicationReleaseProof2, PublishedPackedApplication2 } from "./application-v2-types.ts";
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
const EARLIER_KEYS = "capabilities,creates,definitions,entry,host,predecessor,projections,roles,v";
const COMPOSITION_KEYS = "capabilities,connections,creates,definitions,derivation,entry,exercises,groups,host,order,parameters,predecessor,projections,rights,roles,v";
// Temporary publication boundary commissioned by decision b966ef3f. These
// public identities equal platform/demo-release.ts, checked against the actual
// committed packet. Retire only with a separately reviewed replacement release,
// trust row and installed-room upgrade. New pack/validate never use this row.
const EARLIER_RELEASE = "sha256:71e10ca9499e926a4de1d8294ed83a772051dff677d8b1687bbd8e28e61802fa";
const EARLIER_PUBLISHER = "key_gg4rXwy4v-kVqveN37_W_FW_-Wvsn3fgsal5z6gxfS0";
function earlierPublication(semantic: unknown, release: unknown, bounds: ApplicationPackageLimits): boolean {
  if (!isRecord(semantic) || Object.keys(semantic).sort().join() !== EARLIER_KEYS) return false;
  if (!isRecord(release) || !isRecord(release["manifest"]) || release["manifest"]["publisher"] !== EARLIER_PUBLISHER
    || id("release", release, bounds) !== EARLIER_RELEASE) return fail();
  return true;
}
function semantics(value: unknown, bounds: ApplicationPackageLimits, earlier: boolean): PublishedApplicationSemantics2 {
  const body = only(value, earlier ? EARLIER_KEYS : COMPOSITION_KEYS);
  if (body["v"] !== 2 || !isRecord(body["projections"])) return fail();
  // Reuse the unchanged closure, requirements and role validation. Only this
  // explicit v2 entry point supplies the separately checked projection place.
  const { connections, rights, exercises, groups, order, derivation, parameters, ...legacy } = body;
  const base = semantics1({ ...legacy, v: 1, projections: {} }, bounds);
  let composition;
  try { if (!earlier) composition = readPackageComposition({ connections, rights, exercises, groups, order, derivation, parameters }, new Set(base.definitions.map(part => part.id))); }
  catch (error) {
    if (error instanceof PackageCompositionError) throw new ApplicationPackageValidationError([{ definition: null, row: error.path, check: "composition", reason: error.reason, severity: "refusal", message: error.message }]);
    throw error;
  }
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
  applicationJson({ host: base.host, roles: base.roles, capabilities: base.capabilities, projections, ...composition }, bounds.metadataBytes);
  // Shared composition obligations are checked before signing and when
  // reading. Whole native definition admission remains validatePackage's job.
  if (earlier) return body as unknown as PublishedApplicationSemantics2;
  if (!composition) return fail();
  let graph;
  try {
    graph = checkPackageGraph({ bounds: PROPOSED_BOUNDS, entry: base.entry,
      definitions: base.definitions.map(part => ({ id: part.id, definition: parseStrict(part.bytes) as DeclaredDefinition })),
      composition, roles: base.roles, literalFits: (type, value) => fitsFieldType(type, value, PROPOSED_BOUNDS) });
  } catch { return fail(); }
  if (graph.findings.some(finding => finding.severity === "refusal")) throw new ApplicationPackageValidationError(graph.findings);
  return body as unknown as ApplicationSemantics2;
}
function presentation(value: unknown, semantic: PublishedApplicationSemantics2, semanticId: Digest, bounds: ApplicationPackageLimits): ApplicationPresentation2 {
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
  const views = binding(() => bindApplicationViews(body["views"], semantic.projections, semantic.definitions, semantic.entry));
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
function signed(semantic: PublishedApplicationSemantics2, value: unknown, expected: Digest | null, bounds: ApplicationPackageLimits): { release: ApplicationRelease2; ids: ApplicationIds } {
  const semanticId = id("semantic", semantic, bounds), body = only(value, "manifest,sig");
  if (!isRecord(body["manifest"]) || !isDigest(body["manifest"]["presentation"])) return fail();
  const presentationId = body["manifest"]["presentation"], checked = release(value, semanticId, presentationId);
  if (!verify(checked.manifest.publisher, checked.sig, domain("signature", checked.manifest, bounds))) return fail("signature");
  const releaseId = id("release", checked, bounds);
  if (expected !== null && (!isDigest(expected) || releaseId !== expected)) return fail("integrity");
  return { release: checked, ids: Object.freeze({ semantic: semanticId, presentation: presentationId, release: releaseId }) };
}
function readProof2(semantic: unknown, release: unknown, expected: Digest,
  overrides: Partial<ApplicationPackageLimits>, published: boolean): PublishedApplicationReleaseProof2 {
  const bounds = limits(overrides), owned = only(parseStrict(applicationJson({ semantic, release }, bounds.bytes)), "release,semantic");
  const checked = semantics(owned["semantic"], bounds, published && earlierPublication(owned["semantic"], owned["release"], bounds));
  if (!isDigest(expected)) return fail("integrity");
  const proof = signed(checked, owned["release"], expected, bounds); freeze(owned);
  return Object.freeze({ semantic: checked, ...proof });
}
export function readApplicationReleaseProof2(semantic: unknown, release: unknown, expected: Digest,
  overrides: Partial<ApplicationPackageLimits> = {}): ApplicationReleaseProof2 {
  return readProof2(semantic, release, expected, overrides, false) as ApplicationReleaseProof2;
}
/** Consumption only: explicit earlier-shape selection for the one published
 * release above; every full-composition shape uses the ordinary strict checks. */
export function readPublishedApplicationReleaseProof2(semantic: unknown, release: unknown, expected: Digest,
  overrides: Partial<ApplicationPackageLimits> = {}): PublishedApplicationReleaseProof2 {
  return readProof2(semantic, release, expected, overrides, true);
}
function readPackage2(bytes: Uint8Array, expected: Digest | null, overrides: Partial<ApplicationPackageLimits>, published: boolean): PublishedPackedApplication2 {
  const bounds = limits(overrides);
  if (!(bytes instanceof Uint8Array) || bytes.length > bounds.bytes) return fail("limit");
  const ownedBytes = new Uint8Array(bytes);
  try {
    const parsed = parseStrictBytes(ownedBytes), canonical = utf8(applicationJson(parsed, bounds.bytes));
    if (canonical.length !== ownedBytes.length || canonical.some((byte, i) => byte !== ownedBytes[i])) return fail();
    const body = only(parsed, "presentation,release,semantic,v"); if (body["v"] !== 2) return fail();
    const checked = semantics(body["semantic"], bounds, published && earlierPublication(body["semantic"], body["release"], bounds)), semanticId = id("semantic", checked, bounds);
    const presented = presentation(body["presentation"], checked, semanticId, bounds);
    const proof = signed(checked, body["release"], expected, bounds);
    if (proof.ids.presentation !== id("presentation", presented, bounds)) return fail("integrity");
    freeze(body); return { bytes: ownedBytes, ids: proof.ids, package: body as unknown as ApplicationPackage2<PublishedApplicationSemantics2> };
  } catch (error) { if (error instanceof ApplicationPackageError) throw error; return fail(); }
}
export function readApplicationPackage2(bytes: Uint8Array, expected: Digest | null, overrides: Partial<ApplicationPackageLimits> = {}): PackedApplication2 {
  return readPackage2(bytes, expected, overrides, false) as PackedApplication2;
}
/** Verify/install/screens/replay boundary. Never a retry after strict failure,
 * and never selected by a caller flag, URI, publisher alone or omitted fields. */
export function readPublishedApplicationPackage2(bytes: Uint8Array, expected: Digest | null, overrides: Partial<ApplicationPackageLimits> = {}): PublishedPackedApplication2 {
  return readPackage2(bytes, expected, overrides, true);
}
export async function packApplication2(input: ApplicationPackageInput2, signer: Signer, overrides: Partial<ApplicationPackageLimits> = {}): Promise<PackedApplication2> {
  const bounds = limits(overrides), publisher = signer.key;
  const owned = parseStrict(applicationJson(input, bounds.bytes)) as ApplicationPackageInput2;
  only(owned, "name,presentation,semantic,version");
  only(owned.semantic, "capabilities,connections,definitions,derivation,entry,exercises,groups,host,order,parameters,predecessor,projections,rights,roles,v");
  only(owned.presentation, "assets,descriptions,entry,resources,v,views");
  const definitions = [...owned.semantic.definitions].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const checked = semantics({ ...owned.semantic, definitions, creates: declarations(definitions, bounds).creates,
    roles: Object.fromEntries(Object.entries(owned.semantic.roles).map(([role, actions]) => [role, [...actions].sort()])),
    capabilities: [...owned.semantic.capabilities].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    host: { ...owned.semantic.host, profiles: [...owned.semantic.host.profiles].sort() } }, bounds, false) as ApplicationSemantics2;
  const semanticId = id("semantic", checked, bounds);
  const presented = presentation({ ...owned.presentation, semantic: semanticId,
    assets: [...owned.presentation.assets].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) }, checked, semanticId, bounds);
  const manifest = { v: 2 as const, name: owned.name, version: owned.version, publisher, semantic: semanticId, presentation: id("presentation", presented, bounds) };
  release({ manifest, sig: "A".repeat(86) }, semanticId, manifest.presentation);
  const sig = await signer.sign(domain("signature", manifest, bounds));
  return readApplicationPackage2(utf8(applicationJson({ v: 2, semantic: checked, presentation: presented, release: { manifest, sig } }, bounds.bytes)), null, bounds);
}
