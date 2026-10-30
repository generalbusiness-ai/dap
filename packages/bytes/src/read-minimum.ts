/** One bounded minimum-head wire. Shape grants no access to the named scope. */
import type { ReadMinimum } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrictBytes, utf8 } from "./canonical.ts";
import { b64url, unb64url } from "./encode.ts";
import { isHead, isRecord, isScopeRef } from "./records.ts";

export const READ_MINIMUM_WIRE_BOUNDS = Object.freeze({ bytes: 512, encodedChars: 683 });
const whole = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
/** Only named own data properties. A local producer cannot execute an accessor during admission. */
function record(value: unknown, names: string): Record<string, unknown> | null {
  if (!isRecord(value) || Object.keys(value).sort().join() !== names) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some(descriptor => !("value" in descriptor) || !descriptor.enumerable)) return null;
  return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value as unknown]));
}
/** Own a validated RPC/local input without retaining caller-owned objects. */
export function readMinimum(value: unknown): ReadMinimum | null {
  try {
    const row = record(value, "at,head"), at = row && record(row["at"], "inc,kind,scope");
    if (!row || !at || !isScopeRef(at)) return null;
    const head = typeof row["head"] === "number" ? row["head"] : record(row["head"], "hash,seq");
    const scope = Object.freeze({ scope: at.scope, inc: at.inc, kind: at.kind });
    if (typeof head === "number") return whole(head) ? Object.freeze({ at: scope, head }) : null;
    if (!isHead(head) || !whole(head.seq)) return null;
    return Object.freeze({ at: scope, head: Object.freeze({ seq: head.seq, hash: head.hash }) });
  } catch { return null; }
}
export const isReadMinimum = (value: unknown): value is ReadMinimum => readMinimum(value) !== null;
/** Typed producers preflight the fixed record before bounded serialization. */
export function encodeReadMinimumParameter(value: ReadMinimum): string | null {
  const owned = readMinimum(value);
  if (!owned) return null;
  const bytes = utf8(canonicalize(owned));
  return bytes.length <= READ_MINIMUM_WIRE_BOUNDS.bytes ? b64url(bytes) : null;
}
/** The single atLeast query parameter is canonical unpadded base64url of canonical JSON. */
export function readMinimumParameter(encoded: unknown): ReadMinimum | null {
  const bounds = READ_MINIMUM_WIRE_BOUNDS;
  if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > bounds.encodedChars || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const bytes = unb64url(encoded);
    if (!bytes || bytes.length > bounds.bytes || b64url(bytes) !== encoded) return null;
    const owned = readMinimum(parseStrictBytes(bytes));
    return owned && b64url(utf8(canonicalize(owned))) === encoded ? owned : null;
  } catch { return null; }
}
