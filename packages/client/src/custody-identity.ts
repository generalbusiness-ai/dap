/** Private custody primitives. Structure is not authority. */
import { isDefinitionName, isKeyId, isRecord, isScopeRef, utf8 } from "@generalbusiness/dap-bytes";
import type { Identity } from "./custody.ts";

export const KEY_BYTES = 128;
const keyBytes = (key: unknown): boolean => typeof key === "string" && utf8(key).length >= 1 && utf8(key).length <= KEY_BYTES;
export const validKey = keyBytes;

/** Preserve generic custody's existing identity grammar, including extra members. */
export function isCustodyIdentity(identity: unknown): identity is Identity {
  if (!isRecord(identity) || typeof identity["service"] !== "string" || !isKeyId(identity["signer"]) || !validKey(identity["key"]) ||
    (identity["membership"] !== null && !isScopeRef(identity["membership"])) ||
    !(isScopeRef(identity["target"]) || (isRecord(identity["target"]) && isDefinitionName(identity["target"]["create"])))) return false;
  return true;
}
