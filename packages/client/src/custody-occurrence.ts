/** Private occurrence data. No store, current permission or signing authority. */
import { canonicalize, isDigest, isKeyId, isPlatformDefinition, isRecord, isScopeRef, natural, parseStrict } from "@generalbusiness/dap-bytes";
import type { SigningAuthorization } from "./authorization.ts";
import type { CustodyRecord, DeliveryOccurrence, Identity } from "./custody.ts";
import { isCustodyIdentity, validKey } from "./custody-identity.ts";

/** Own exactly the occurrence selected for dispatch, without stricter raw admission. */
export function deliveryOccurrenceOf(record: CustodyRecord): DeliveryOccurrence {
  const signing = record.signings.length - 1;
  return structuredClone({ identity: record.identity, attempt: record.attempt,
    signing, intent: record.signings[signing]!.intent,
    ...(record.signings[signing]!.authorization ? { authorization: record.signings[signing]!.authorization } : {}) });
}

function bad(): never { throw new TypeError("malformed custody occurrence metadata"); }
function exact(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!isRecord(value) || !required.every(name => Object.hasOwn(value, name))
    || Object.keys(value).some(name => !required.includes(name) && !optional.includes(name))) return bad();
  return value;
}
function identity(value: unknown): Identity {
  const row = exact(value, ["service", "membership", "signer", "target", "key"]);
  if (!isCustodyIdentity(row)) return bad();
  let target: Identity["target"];
  if (isScopeRef(row.target)) target = { scope: row.target.scope, genesis: row.target.genesis };
  else {
    const create = exact(row.target, ["create"])["create"];
    if (!isDigest(create) && !isPlatformDefinition(create)) return bad();
    target = { create };
  }
  return { service: row.service,
    membership: row.membership === null ? null : { scope: row.membership.scope, genesis: row.membership.genesis },
    signer: row.signer, target, key: row.key };
}
function readSigningAuthorization(value: unknown): SigningAuthorization {
  const row = exact(value, ["identity", "position", "permission"]), who = exact(row["identity"], ["key", "owner", "scope"]);
  const key = who["key"], owner = who["owner"], scope = who["scope"], position = row["position"], permission = row["permission"];
  if (typeof key !== "string" || !validKey(key) || !isKeyId(owner) || !isScopeRef(scope) || !natural(position) || !natural(permission)) return bad();
  return { identity: { key, owner, scope: { scope: scope.scope, genesis: scope.genesis } }, position, permission };
}

/** New closed marker grammar only. Generic custody-v2 records keep their existing admission. */
export function readDeliveryOccurrence(value: unknown): DeliveryOccurrence {
  let owned: unknown;
  try { owned = parseStrict(canonicalize(value)); } catch { return bad(); }
  const row = exact(owned, ["identity", "attempt", "signing", "intent"], ["authorization"]);
  const attempt = row["attempt"], signing = row["signing"], intent = row["intent"];
  if (!natural(attempt) || attempt < 1 || !natural(signing) || !isDigest(intent)) return bad();
  return { identity: identity(row["identity"]), attempt, signing, intent,
    ...(Object.hasOwn(row, "authorization") ? { authorization: readSigningAuthorization(row["authorization"]) } : {}) };
}
