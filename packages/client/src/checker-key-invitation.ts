/** Explicit private checker-key handoff. Encoding is not native authority. */
import { same } from "@generalbusiness/dap-bytes";
import { invitationServiceUrl } from "./invitation-service.ts";
import type { FactRef, ScopeRef, ScopeId } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, isFactRef, isRecord, isScopeId, isScopeRef, parseStrict, unb64url, utf8 } from "@generalbusiness/dap-bytes";
export const CHECKER_KEY_LINK = "artroom-checker-key:";
/** S1 admits this new handoff only under the current native Membership8 pin. */
export const CHECKER_KEY_MEMBERSHIP = "platform:membership@8";
export interface CheckerKeyInvitation {
  v: 1; kind: "checker-key"; service: string;
  repository: { directory: ScopeRef; membership: ScopeRef; rules: ScopeId; destination: ScopeId };
  /** The membership's pinned definition at issuance; the enrolment is verified against the receipt's definition, never a name. */
  definition: typeof CHECKER_KEY_MEMBERSHIP; handle: string;
  member: FactRef; invitation: FactRef; secret: string;
  expected: { on: number; member: number };
}
const closed = (v: unknown, keys: readonly string[]): v is Record<string, unknown> => isRecord(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const revision = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 1;
export function isCheckerKeyInvitation(value: unknown): value is CheckerKeyInvitation {
  try {
    if (!closed(value, ["v", "kind", "service", "repository", "definition", "handle", "member", "invitation", "secret", "expected"]) || value["v"] !== 1 || value["kind"] !== "checker-key" || value["definition"] !== CHECKER_KEY_MEMBERSHIP || typeof value["service"] !== "string" || typeof value["handle"] !== "string" || utf8(value["handle"]).length > 256 || !/^@[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value["handle"])) return false;
    const origin = invitationServiceUrl(value["service"]);
    if (!origin || origin.origin !== value["service"] || origin.pathname !== "/") return false;
    const r = value["repository"];
    if (!closed(r, ["directory", "membership", "rules", "destination"]) || !closed(r["directory"], ["scope", "inc", "kind"]) || !isScopeRef(r["directory"]) || r["directory"].kind !== "directory" || !closed(r["membership"], ["scope", "inc", "kind"]) || !isScopeRef(r["membership"]) || r["membership"].kind !== "membership" || !isScopeId(r["rules"]) || !isScopeId(r["destination"])) return false;
    if (!closed(value["member"], ["at", "seq", "hash"]) || !isFactRef(value["member"]) || !same(value["member"]["at"], r["membership"]) || value["member"]["seq"] < 1 || !closed(value["invitation"], ["at", "seq", "hash"]) || !isFactRef(value["invitation"]) || !same(value["invitation"]["at"], r["membership"]) || value["invitation"]["seq"] <= value["member"]["seq"] || !closed(value["expected"], ["on", "member"]) || !revision(value["expected"]["on"]) || !revision(value["expected"]["member"])) return false;
    if (typeof value["secret"] !== "string" || value["secret"].length > 256) return false;
    const secret = unb64url(value["secret"]);
    return secret !== null && secret.length === 32 && b64url(secret) === value["secret"];
  } catch { return false; }
}
export function checkerKeyInvitationOf(text: string): CheckerKeyInvitation | null {
  try {
    if (!text.startsWith(CHECKER_KEY_LINK) || text.length > 16 * 1024) return null;
    const bytes = unb64url(text.slice(CHECKER_KEY_LINK.length));
    if (!bytes || bytes.length > 12 * 1024) return null;
    const value = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
    return isCheckerKeyInvitation(value) ? value : null;
  } catch { return null; }
}
export function encodeCheckerKeyInvitation(value: CheckerKeyInvitation): string {
  if (!isCheckerKeyInvitation(value)) throw new Error("The checker invitation is not valid.");
  const encoded = CHECKER_KEY_LINK + b64url(utf8(canonicalize(value)));
  if (encoded.length > 16 * 1024) throw new Error("The checker invitation exceeds its bound.");
  return encoded;
}
