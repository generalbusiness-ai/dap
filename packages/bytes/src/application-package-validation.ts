/** Internal strict v1 validators shared by the versioned package codecs.
 * The legacy semantic validator continues to admit empty projections only. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, digestBytes, isDigest, isKeyId, isRecord, parseStrict, unb64url, utf8 } from "./index.ts";
import { applicationJson } from "./application-json.ts";
import { APPLICATION_PACKAGE_LIMITS, ApplicationPackageError, type ApplicationCreation, type ApplicationDefinition, type ApplicationPackageLimits, type ApplicationPresentation, type ApplicationRelease, type ApplicationSemantics } from "./application-types.ts";

const TAGS = { semantic: "dap-application-semantics-1", presentation: "dap-application-presentation-1", release: "dap-application-release-1", signature: "dap-application-release-signature-1" } as const;
export const fail = (reason: ApplicationPackageError["reason"] = "invalid"): never => { throw new ApplicationPackageError(reason); };
const same = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
const token = /^[a-zA-Z][a-zA-Z0-9_.-]*$/;
const assetPath = /^(?:[A-Za-z0-9][A-Za-z0-9._-]{0,63}\/)*[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export const only = (value: unknown, keys: string): Record<string, unknown> => isRecord(value) && Object.keys(value).sort().join() === keys ? value : fail();
const text = (value: unknown, most: number, pattern?: RegExp): string => {
  if (typeof value !== "string" || value.length === 0 || value.length > most || utf8(value).length > most || pattern && !pattern.test(value)) return fail();
  return value;
};
const list = (value: unknown, most: number): readonly unknown[] => Array.isArray(value) && value.length <= most ? value : fail("limit");
export function limits(overrides: Partial<ApplicationPackageLimits>): ApplicationPackageLimits {
  if (Object.keys(overrides).some(key => !Object.hasOwn(APPLICATION_PACKAGE_LIMITS, key))) return fail("limit");
  const result = { ...APPLICATION_PACKAGE_LIMITS, ...overrides };
  for (const key of Object.keys(result) as (keyof ApplicationPackageLimits)[]) if (!Number.isSafeInteger(result[key]) || result[key] < 1 || result[key] > APPLICATION_PACKAGE_LIMITS[key]) return fail("limit");
  return result;
}
export function domain(kind: keyof typeof TAGS, value: unknown, bounds: ApplicationPackageLimits): Uint8Array {
  const head = utf8(`${TAGS[kind]}\n`), body = utf8(applicationJson(value, bounds.bytes));
  const bytes = new Uint8Array(head.length + body.length); bytes.set(head); bytes.set(body, head.length); return bytes;
}
export const id = (kind: "semantic" | "presentation" | "release", value: unknown, bounds: ApplicationPackageLimits): Digest => digestBytes(domain(kind, value, bounds));

/** Derived from the actual immutable declarations, not a caller's supplied
 * edge list. Native whole-definition validation still belongs to check/install. */
export function declarations(definitions: readonly ApplicationDefinition[], bounds: ApplicationPackageLimits) {
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
      const sends = [...handler["sends"]];
      if (Object.hasOwn(handler, "late")) {
        const late = handler["late"];
        if (!isRecord(late)) return fail();
        if (Object.hasOwn(late, "then")) {
          const branch = late["then"];
          if (!isRecord(branch)) return fail();
          if (Object.hasOwn(branch, "sends")) {
            if (!Array.isArray(branch["sends"])) return fail();
            sends.push(...branch["sends"]);
          }
        }
      }
      for (const send of sends) {
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
export function semantics(value: unknown, bounds: ApplicationPackageLimits): ApplicationSemantics {
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
export function presentation(value: unknown, semantic: Digest, bounds: ApplicationPackageLimits): ApplicationPresentation {
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
export function release(value: unknown, semantic: Digest, presentation: Digest): ApplicationRelease {
  const body = only(value, "manifest,sig"), manifest = only(body["manifest"], "name,presentation,publisher,semantic,v,version");
  if (manifest["v"] !== 1 || !isKeyId(manifest["publisher"]) || manifest["semantic"] !== semantic || manifest["presentation"] !== presentation) return fail("integrity");
  text(manifest["name"], 256, /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/);
  text(manifest["version"], 64, /^[A-Za-z0-9][A-Za-z0-9.+_-]*$/);
  if (typeof body["sig"] !== "string" || !/^[A-Za-z0-9_-]{86}$/.test(body["sig"])) return fail("signature");
  return body as unknown as ApplicationRelease;
}
