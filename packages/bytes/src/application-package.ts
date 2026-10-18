/** Canonical trusted packages. These checks establish content/signatures and
 * closure, never native definition admission, installation or screen isolation. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, digestBytes, isDigest, isKeyId, isRecord, parseStrict, parseStrictBytes, unb64url, utf8, verify } from "./index.ts";
import type { Signer } from "./signer.ts";
import { applicationJson } from "./application-json.ts";
import { APPLICATION_PACKAGE_LIMITS, ApplicationPackageError, type ApplicationCreation, type ApplicationDefinition, type ApplicationIds, type ApplicationPackage, type ApplicationPackageInput, type ApplicationPackageLimits, type ApplicationPresentation, type ApplicationRelease, type ApplicationReleaseProof, type ApplicationSemantics, type PackedApplication } from "./application-types.ts";
export * from "./application-types.ts";

const TAGS = { semantic: "dap-application-semantics-1", presentation: "dap-application-presentation-1", release: "dap-application-release-1", signature: "dap-application-release-signature-1" } as const;
const fail = (reason: ApplicationPackageError["reason"] = "invalid"): never => { throw new ApplicationPackageError(reason); };
const same = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
const token = /^[a-zA-Z][a-zA-Z0-9_.-]*$/;
const assetPath = /^(?:[A-Za-z0-9][A-Za-z0-9._-]{0,63}\/)*[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const only = (value: unknown, keys: string): Record<string, unknown> => isRecord(value) && Object.keys(value).sort().join() === keys ? value : fail();
const text = (value: unknown, most: number, pattern?: RegExp): string => {
  if (typeof value !== "string" || value.length === 0 || value.length > most || utf8(value).length > most || pattern && !pattern.test(value)) return fail();
  return value;
};
const list = (value: unknown, most: number): readonly unknown[] => Array.isArray(value) && value.length <= most ? value : fail("limit");
function limits(overrides: Partial<ApplicationPackageLimits>): ApplicationPackageLimits {
  if (Object.keys(overrides).some(key => !Object.hasOwn(APPLICATION_PACKAGE_LIMITS, key))) return fail("limit");
  const result = { ...APPLICATION_PACKAGE_LIMITS, ...overrides };
  for (const key of Object.keys(result) as (keyof ApplicationPackageLimits)[]) if (!Number.isSafeInteger(result[key]) || result[key] < 1 || result[key] > APPLICATION_PACKAGE_LIMITS[key]) return fail("limit");
  return result;
}
function domain(kind: keyof typeof TAGS, value: unknown, bounds: ApplicationPackageLimits): Uint8Array {
  const head = utf8(`${TAGS[kind]}\n`), body = utf8(applicationJson(value, bounds.bytes));
  const bytes = new Uint8Array(head.length + body.length); bytes.set(head); bytes.set(body, head.length); return bytes;
}
const id = (kind: "semantic" | "presentation" | "release", value: unknown, bounds: ApplicationPackageLimits): Digest => digestBytes(domain(kind, value, bounds));

/** Derived from the actual immutable declarations, not a caller's supplied
 * edge list. Native whole-definition validation still belongs to check/install. */
function declarations(definitions: readonly ApplicationDefinition[], bounds: ApplicationPackageLimits) {
  const edges = new Map<string, ApplicationCreation>();
  const profiles = new Set<string>(), capabilities = new Set<string>(), actions = new Set<string>();
  for (const part of definitions) {
    only(part, "bytes,id");
    if (!isDigest(part.id) || typeof part.bytes !== "string") return fail();
    if (part.bytes.length > bounds.definitionBytes || utf8(part.bytes).length > bounds.definitionBytes) return fail("limit");
    const parsed = parseStrict(part.bytes);
    if (!isRecord(parsed) || parsed["format"] !== "artroom-definition-1" || !isRecord(parsed["acts"]) || !isRecord(parsed["receives"]) || canonicalize(parsed) !== part.bytes) return fail();
    if (definitionDigest(parsed as unknown as DeclaredDefinition) !== part.id) return fail("integrity");
    const profile = only(parsed["profile"], "name,version");
    const versioned = (name: unknown, version: unknown): string => {
      const label = text(name, 48, /^[a-z][a-z0-9-]*$/);
      if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1) return fail();
      return `${label}@${version}`;
    };
    profiles.add(versioned(profile["name"], profile["version"]));
    for (const capability of list(parsed["capabilities"], 32)) {
      const member = only(capability, "name,version"); capabilities.add(versioned(member["name"], member["version"]));
    }
    for (const act of Object.values(parsed["acts"])) if (isRecord(act) && typeof act["grant"] === "string") actions.add(act["grant"]);
    for (const handler of [...Object.values(parsed["acts"]), ...Object.values(parsed["receives"])]) {
      if (!isRecord(handler) || !Array.isArray(handler["sends"])) return fail();
      for (const send of handler["sends"]) {
        if (!isRecord(send)) return fail();
        if (!Object.hasOwn(send, "create")) continue;
        const create = send["create"];
        if (!isRecord(create)) return fail();
        const child = create["definition"];
        if (child === "self") continue;
        if (!isDigest(child)) return fail("closure");
        edges.set(`${part.id}/${child}`, { from: part.id, to: child });
      }
    }
  }
  return { creates: [...edges.values()].sort((a, b) => `${a.from}/${a.to}` < `${b.from}/${b.to}` ? -1 : 1), profiles, capabilities, actions };
}
function ordered(values: readonly string[]): void { if (values.some((value, index) => index > 0 && values[index - 1]! >= value)) fail(); }
function semantics(value: unknown, bounds: ApplicationPackageLimits): ApplicationSemantics {
  const body = only(value, "capabilities,creates,definitions,entry,host,predecessor,projections,roles,v");
  if (body["v"] !== 1 || !isDigest(body["entry"]) || body["predecessor"] !== null && !isDigest(body["predecessor"])) return fail();
  const definitions = list(body["definitions"], bounds.definitions) as readonly ApplicationDefinition[];
  if (definitions.length === 0) return fail("closure");
  const declared = declarations(definitions, bounds), edges = declared.creates; ordered(definitions.map(part => part.id));
  const ids = new Set(definitions.map(part => part.id));
  if (!ids.has(body["entry"]) || !same(body["creates"], edges)) return fail("closure");
  const reached = new Set<Digest>(), queue = [body["entry"]];
  while (queue.length) {
    const next = queue.shift()!; if (reached.has(next)) continue;
    if (!ids.has(next)) return fail("closure"); reached.add(next);
    for (const edge of edges) if (edge.from === next && !reached.has(edge.to)) queue.push(edge.to);
  }
  if (reached.size !== ids.size) return fail("closure");
  const host = only(body["host"], "execution,profiles");
  if (host["execution"] !== "recorded-do") return fail();
  const profiles = list(host["profiles"], 16).map(profile => text(profile, 64, /^[a-z][a-z0-9-]*@[1-9][0-9]*$/)); ordered(profiles);
  if ([...declared.profiles].some(profile => !profiles.includes(profile))) return fail("integrity");
  if (!isRecord(body["projections"]) || Object.keys(body["projections"]).length !== 0) return fail();
  const capabilities = list(body["capabilities"], 32);
  const names = capabilities.map(capability => {
    const entry = only(capability, "bounds,name");
    text(entry["name"], 64, /^[a-z][a-z0-9.-]*@[1-9][0-9]*$/);
    if (!isRecord(entry["bounds"])) return fail();
    applicationJson(entry["bounds"], bounds.metadataBytes); return entry["name"] as string;
  }); ordered(names);
  if ([...declared.capabilities].some(capability => !names.includes(capability))) return fail("integrity");
  const roles = body["roles"];
  if (!isRecord(roles) || Object.keys(roles).length > 16) return fail();
  for (const [role, actions] of Object.entries(roles)) {
    text(role, 64, token); const named = list(actions, 64).map(action => text(action, 128, token)); ordered(named);
    if (named.some(action => !declared.actions.has(action))) return fail("integrity");
  }
  applicationJson({ host, roles, capabilities, projections: body["projections"] }, bounds.metadataBytes);
  return body as unknown as ApplicationSemantics;
}
function presentation(value: unknown, semantic: Digest, bounds: ApplicationPackageLimits): ApplicationPresentation {
  const body = only(value, "assets,descriptions,entry,semantic,v");
  if (body["v"] !== 1 || body["semantic"] !== semantic) return fail("integrity");
  const entry = text(body["entry"], 256, assetPath), paths: string[] = [], folded = new Set<string>(); let total = 0;
  for (const asset of list(body["assets"], bounds.assets)) {
    const part = only(asset, "bytes,mediaType,path");
    const path = text(part["path"], 256, assetPath);
    if (path.split("/").some(piece => piece === "." || piece === "..") || folded.has(path.toLowerCase())) return fail();
    folded.add(path.toLowerCase()); paths.push(path);
    text(part["mediaType"], 128, /^[a-z][a-z0-9.+-]*\/[a-z0-9.+-]+(?:; charset=utf-8)?$/);
    const encoded = part["bytes"];
    if (typeof encoded !== "string" || encoded.length > Math.ceil(bounds.assetBytes / 3) * 4 || !/^[A-Za-z0-9_-]*$/.test(encoded)) return fail("limit");
    const data = unb64url(encoded);
    if (!data || data.length > bounds.assetBytes || data.length > bounds.totalAssetBytes - total) return fail("limit");
    if (b64url(data) !== encoded) return fail(); total += data.length;
  }
  ordered(paths);
  if (!paths.includes(entry) || paths.some(path => {
    const parts = path.toLowerCase().split("/");
    return parts.slice(0, -1).some((_part, index) => folded.has(parts.slice(0, index + 1).join("/")));
  })) return fail();
  const descriptions = body["descriptions"];
  if (!isRecord(descriptions)) return fail();
  applicationJson(descriptions, bounds.metadataBytes);
  for (const [act, description] of Object.entries(descriptions)) {
    text(act, 128, token); const part = only(description, "fields,text"); text(part["text"], 4096);
    if (!isRecord(part["fields"])) return fail();
    for (const [name, hint] of Object.entries(part["fields"])) { text(name, 128, token); text(hint, 4096); }
  }
  return body as unknown as ApplicationPresentation;
}
function release(value: unknown, semantic: Digest, presentation: Digest): ApplicationRelease {
  const body = only(value, "manifest,sig"), manifest = only(body["manifest"], "name,presentation,publisher,semantic,v,version");
  if (manifest["v"] !== 1 || !isKeyId(manifest["publisher"]) || manifest["semantic"] !== semantic || manifest["presentation"] !== presentation) return fail("integrity");
  text(manifest["name"], 256, /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/);
  text(manifest["version"], 64, /^[A-Za-z0-9][A-Za-z0-9.+_-]*$/);
  if (typeof body["sig"] !== "string" || !/^[A-Za-z0-9_-]{86}$/.test(body["sig"])) return fail("signature");
  return body as unknown as ApplicationRelease;
}
function freeze(value: unknown): void { if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } }
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
