/** Canonical trusted packages. These checks establish content/signatures and
 * closure, never native definition admission, installation or screen isolation. */
import { freeze } from "./values.ts";
import type { Digest } from "@generalbusiness/dap-contract";
import { isDigest, parseStrict, parseStrictBytes, utf8, verify } from "./index.ts";
import type { Signer } from "./signer.ts";
import { applicationJson } from "./application-json.ts";
import { ApplicationPackageError, type ApplicationIds, type ApplicationPackage, type ApplicationPackageInput, type ApplicationPackageLimits, type ApplicationReleaseProof, type PackedApplication } from "./application-types.ts";
import { declarations, domain, fail, id, limits, only, presentation, release, semantics } from "./application-package-validation.ts";
export * from "./application-types.ts";

function checked(value: unknown, expected: Digest | null, bounds: ApplicationPackageLimits): { package: ApplicationPackage; ids: ApplicationIds } {
  const body = only(value, "presentation,release,semantic,v"); if (body["v"] !== 1) return fail();
  const semantic = semantics(body["semantic"], bounds), semanticId = id("semantic", semantic, bounds);
  const presented = presentation(body["presentation"], semanticId, bounds), presentationId = id("presentation", presented, bounds);
  const signed = release(body["release"], semanticId, presentationId);
  if (!verify(signed.manifest.publisher, signed.sig, domain("signature", signed.manifest, bounds))) return fail("signature");
  const releaseId = id("release", signed, bounds);
  if (expected !== null && (!isDigest(expected) || expected !== releaseId)) return fail("integrity");
  freeze(body);
  return { package: body as unknown as ApplicationPackage, ids: Object.freeze({ semantic: semanticId, presentation: presentationId, release: releaseId }) };
}

/** Verify a native-install proof without carrying screen assets into
 * the journal. The signed manifest binds the exact semantic/presentation ids;
 * this checks no presentation bytes, operator trust or native host admission. */
export function readApplicationReleaseProof(semantic: unknown, signed: unknown, expectedRelease: Digest,
  overrides: Partial<ApplicationPackageLimits> = {}): ApplicationReleaseProof {
  const bounds = limits(overrides), owned = parseStrict(applicationJson({ semantic, release: signed }, bounds.bytes));
  const body = only(owned, "release,semantic"), checkedSemantic = semantics(body["semantic"], bounds), semanticId = id("semantic", checkedSemantic, bounds);
  const givenRelease = only(body["release"], "manifest,sig"), manifest = only(givenRelease["manifest"], "name,presentation,publisher,semantic,v,version");
  const presentationId = manifest["presentation"];
  if (!isDigest(presentationId)) return fail("integrity");
  const checkedRelease = release(givenRelease, semanticId, presentationId);
  if (!verify(checkedRelease.manifest.publisher, checkedRelease.sig, domain("signature", checkedRelease.manifest, bounds))) return fail("signature");
  const releaseId = id("release", checkedRelease, bounds);
  if (!isDigest(expectedRelease) || releaseId !== expectedRelease) return fail("integrity");
  freeze(body);
  return Object.freeze({ semantic: checkedSemantic, release: checkedRelease, ids: Object.freeze({ semantic: semanticId, presentation: presentationId, release: releaseId }) });
}

/** The wire limit precedes decoding; per-asset encoded allowance precedes
 * base64 decode. Expected release is mandatory for fetched content; null is
 * explicit local inspection. No URI, network or filesystem is touched here. */
export function readApplicationPackage(bytes: Uint8Array, expectedRelease: Digest | null, overrides: Partial<ApplicationPackageLimits> = {}): PackedApplication {
  const bounds = limits(overrides);
  if (!(bytes instanceof Uint8Array) || bytes.length > bounds.bytes) return fail("limit");
  const owned = new Uint8Array(bytes);
  try {
    const parsed = parseStrictBytes(owned), canonical = utf8(applicationJson(parsed, bounds.bytes));
    if (canonical.length !== owned.length || canonical.some((byte, i) => byte !== owned[i])) return fail();
    return { bytes: owned, ...checked(parsed, expectedRelease, bounds) };
  } catch (error) { if (error instanceof ApplicationPackageError) throw error; return fail(); }
}

/** Construct canonical bytes with owned inputs before the first await.
 * Definition edges come from the declarations; unordered source lists are
 * normalized here, while the wire reader accepts only that canonical order. */
export async function packApplication(input: ApplicationPackageInput, signer: Signer, overrides: Partial<ApplicationPackageLimits> = {}): Promise<PackedApplication> {
  const bounds = limits(overrides), publisher = signer.key;
  const owned = parseStrict(applicationJson(input, bounds.bytes)) as ApplicationPackageInput;
  only(owned, "name,presentation,semantic,version");
  only(owned.semantic, "capabilities,definitions,entry,host,predecessor,projections,roles,v");
  only(owned.presentation, "assets,descriptions,entry,v");
  const definitions = [...owned.semantic.definitions].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const roles = Object.fromEntries(Object.entries(owned.semantic.roles).map(([role, actions]) => [role, [...actions].sort()]));
  const semantic = semantics({ ...owned.semantic, definitions, creates: declarations(definitions, bounds).creates, roles,
    capabilities: [...owned.semantic.capabilities].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    host: { ...owned.semantic.host, profiles: [...owned.semantic.host.profiles].sort() } }, bounds);
  const semanticId = id("semantic", semantic, bounds);
  const presented = presentation({ ...owned.presentation, semantic: semanticId, assets: [...owned.presentation.assets].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) }, semanticId, bounds);
  const manifest = { v: 1 as const, name: owned.name, version: owned.version, publisher, semantic: semanticId, presentation: id("presentation", presented, bounds) };
  // Validate labels and IDs before asking the key to sign. Signature syntax
  // below is a placeholder for admission only and is never a release answer.
  release({ manifest, sig: "A".repeat(86) }, semanticId, manifest.presentation);
  const sig = await signer.sign(domain("signature", manifest, bounds));
  const value = { v: 1, semantic, presentation: presented, release: { manifest, sig } };
  const bytes = utf8(applicationJson(value, bounds.bytes));
  return readApplicationPackage(bytes, null, bounds);
}
