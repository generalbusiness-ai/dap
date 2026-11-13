/** Explicit private handoff of a second device key of one existing member. Encoding is not native authority. */
import { same } from "@generalbusiness/dap-bytes";
import { invitationServiceUrl } from "./invitation-service.ts";
import { isInvitationMembership } from "./invitation-fields.ts";
import type { FactRef, ScopeRef, ScopeId } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, isFactRef, isRecord, isScopeId, isScopeRef, parseStrict, unb64url, utf8 } from "@generalbusiness/dap-bytes";
export const DEVICE_KEY_LINK = "artroom-device-key:";
export interface DeviceKeyInvitation {
  v: 1; kind: "device-key"; service: string;
  repository: { directory: ScopeRef; membership: ScopeRef; rules: ScopeId; destination: ScopeId };
  /** The membership's pinned definition at issuance; the enrolment is verified against the receipt's definition, never a name. */
  definition: string; handle: string;
  invitation: FactRef; secret: string;
  expected: { on: number; member: number };
}
const closed = (v: unknown, keys: readonly string[]): v is Record<string, unknown> => isRecord(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const revision = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 1;
export function isDeviceKeyInvitation(value: unknown): value is DeviceKeyInvitation {
  try {
    if (!closed(value, ["v", "kind", "service", "repository", "definition", "handle", "invitation", "secret", "expected"]) || value["v"] !== 1 || value["kind"] !== "device-key" || !isInvitationMembership(value["definition"]) || typeof value["service"] !== "string" || typeof value["handle"] !== "string" || utf8(value["handle"]).length > 256 || !/^@[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value["handle"])) return false;
    const origin = invitationServiceUrl(value["service"]);
    if (!origin || origin.origin !== value["service"] || origin.pathname !== "/") return false;
    const r = value["repository"];
    if (!closed(r, ["directory", "membership", "rules", "destination"]) || !closed(r["directory"], ["scope", "genesis"]) || !isScopeRef(r["directory"]) || !closed(r["membership"], ["scope", "genesis"]) || !isScopeRef(r["membership"]) || !isScopeId(r["rules"]) || !isScopeId(r["destination"])) return false;
    if (!closed(value["invitation"], ["at", "seq", "hash"]) || !isFactRef(value["invitation"]) || !same(value["invitation"]["at"], r["membership"]) || value["invitation"]["seq"] < 1) return false;
    const expected = value["expected"];
    if (!closed(expected, ["on", "member"]) || !revision(expected["on"]) || !revision(expected["member"])) return false;
    if (typeof value["secret"] !== "string" || value["secret"].length > 256) return false;
    const secret = unb64url(value["secret"]);
    return secret !== null && secret.length === 32 && b64url(secret) === value["secret"];
  } catch { return false; }
}
export function deviceKeyInvitationOf(text: string): DeviceKeyInvitation | null {
  try {
    if (!text.startsWith(DEVICE_KEY_LINK) || text.length > 16 * 1024) return null;
    const bytes = unb64url(text.slice(DEVICE_KEY_LINK.length));
    if (!bytes || bytes.length > 12 * 1024) return null;
    const value = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
    return isDeviceKeyInvitation(value) ? value : null;
  } catch { return null; }
}
export function encodeDeviceKeyInvitation(value: DeviceKeyInvitation): string {
  if (!isDeviceKeyInvitation(value)) throw new Error("The device invitation is not valid.");
  const encoded = DEVICE_KEY_LINK + b64url(utf8(canonicalize(value)));
  if (encoded.length > 16 * 1024) throw new Error("The device invitation exceeds its bound.");
  return encoded;
}
