/** Route syntax only. Decode, native metadata and authorization belong to the
 * Scope-owned operation; no namespace is selected by a malformed request. */
import { APPLICATION_PROJECTION_WIRE_BOUNDS as B } from "@generalbusiness/dap-contract";
import { isScopeId, utf8 } from "@generalbusiness/dap-bytes";
const path = /^https?:\/\/[^/?#]+\/v1\/scopes\/([^/?#]+)\/application-projection\?p=([A-Za-z0-9_-]+)$/;
export function applicationProjectionWire(request: Pick<Request, "url" | "method" | "body">, scope: string):
  { ok: true; encoded: string } | { ok: false; reason: "invalid-query" | "too-large" } {
  if (request.url.length > B.urlBytes || utf8(request.url).length > B.urlBytes) return { ok: false, reason: "too-large" };
  if (request.method !== "GET" || request.body !== null || !isScopeId(scope)) return { ok: false, reason: "invalid-query" };
  const matched = path.exec(request.url);
  if (!matched || matched[0] !== request.url || matched[1] !== scope) return { ok: false, reason: "invalid-query" };
  return matched[2]!.length <= B.encodedChars ? { ok: true, encoded: matched[2]! } : { ok: false, reason: "too-large" };
}
