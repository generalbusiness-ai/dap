/** Canonical screen addresses and owned routing metadata. A context is not
 * authority: read sessions and acts still use the native membership checks. */
import type { Digest, ScopeId } from "@generalbusiness/dap-contract";
import { isDigest, isRecord, isScopeId, isScopeRef, parseStrict } from "@generalbusiness/dap-bytes";
import { applicationJson } from "./application-json.ts";
import type { ApplicationScreenContext } from "./application-types.ts";
export interface ApplicationScreenAddress { readonly directory: ScopeId; readonly item: number; readonly presentation: Digest; readonly base: string; readonly asset: string }
export function applicationScreenPath(directory: ScopeId, item: number, presentation: Digest): string {
  if (!isScopeId(directory) || !Number.isSafeInteger(item) || item < 0 || !isDigest(presentation)) throw Error("Invalid application screen address.");
  return `/applications/${directory}/${item}/${encodeURIComponent(presentation)}/`;
}
export function readApplicationScreenAddress(path: string): ApplicationScreenAddress | null {
  if (path.length > 8192) return null;
  const parts = /^\/applications\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)$/.exec(path);
  if (!parts) return null;
  let presentation: string;
  try { presentation = decodeURIComponent(parts[3]!); } catch { return null; }
  const item = Number(parts[2]);
  if (!isScopeId(parts[1]) || String(item) !== parts[2] || !Number.isSafeInteger(item) || item < 0 || !isDigest(presentation) || encodeURIComponent(presentation) !== parts[3]) return null;
  const asset = parts[4]!;
  if (asset !== "" && asset !== "_/context" && asset.split("/").some(part => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(part))) return null;
  return Object.freeze({ directory: parts[1], item, presentation, base: applicationScreenPath(parts[1], item, presentation), asset });
}
/** Strict owned metadata for this exact page address and origin. */
export function readApplicationScreenContext(value: unknown, address: Pick<ApplicationScreenAddress, "directory" | "item" | "presentation">, origin: string): ApplicationScreenContext {
  const invalid = (): never => { throw Error("Invalid application screen context."); };
  let body: unknown;
  try { body = parseStrict(applicationJson(value, 16 * 1024)); } catch { return invalid(); }
  if (!isRecord(body) || Object.keys(body).sort().join() !== "definition,deployment,destination,directory,ids,item,membership,membershipDefinition,origin,rules,scope,v" || body["v"] !== 1 || body["origin"] !== origin
    || typeof body["deployment"] !== "string" || !body["deployment"] || body["deployment"].length > 128 || (body["membershipDefinition"] !== "platform:membership@7" && body["membershipDefinition"] !== "platform:membership@8")
    || body["item"] !== address.item || !isDigest(body["definition"])) return invalid();
  for (const [field, kind] of Object.entries({ directory: "directory", rules: "rules", membership: "membership", destination: "destination", scope: "lane" })) {
    const ref = body[field]; if (!isScopeRef(ref) || ref.kind !== kind) return invalid(); Object.freeze(ref);
  }
  const ids = body["ids"], directory = body["directory"];
  if (!isScopeRef(directory) || directory.scope !== address.directory || !isRecord(ids) || Object.keys(ids).sort().join() !== "presentation,release,semantic"
    || ![ids["release"], ids["semantic"], ids["presentation"]].every(isDigest) || ids["presentation"] !== address.presentation) return invalid();
  Object.freeze(ids); return Object.freeze(body) as unknown as ApplicationScreenContext;
}
