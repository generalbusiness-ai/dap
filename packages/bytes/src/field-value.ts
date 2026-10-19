/** Native field-value guards, shared by the runtime and package constants. */
import type { Bounds, FieldType, MemberRef } from "@generalbusiness/dap-contract";
import { timeMs } from "./ids.ts";
import { isDigest } from "./hash.ts";
import { isFactRef, isLocalId, isMemberRef, isRecord, isScopeRef } from "./records.ts";
import { utf8, wellFormed } from "./canonical.ts";
/** A member handle within its bound. A slot never holds a longer one, so an entry that lists a slot's members has a known size. */
export const memberFits = (v: MemberRef, bounds: Pick<Bounds, "memberBytes">): boolean => utf8(v.member).length <= bounds.memberBytes;

/** A Git object ID: SHA-1 or SHA-256, lowercase hex. */
const isObjectId = (v: unknown) => typeof v === "string" && /^([0-9a-f]{40}|[0-9a-f]{64})$/.test(v);

/**
 * True when `v` is a value of `type`. An `item` is checked as a local ID
 * only; whether it exists is a question for the state. The value of a
 * detached text is its digest (section 6.2); whether the text is at hand,
 * and within the field's `max`, is a question for what came with the input.
 */
export function fitsFieldType(type: FieldType, v: unknown, bounds: Bounds): boolean {
  switch (type.type) {
    case "text": return type.detached ? isDigest(v) : typeof v === "string" && wellFormed(v) && utf8(v).length <= type.max;
    case "int": return typeof v === "number" && Number.isSafeInteger(v) && !Object.is(v, -0) && v >= type.min && v <= type.max;
    case "bool": return typeof v === "boolean";
    case "time": return timeMs(v) !== null;
    case "enum": return typeof v === "string" && type.of.includes(v);
    case "member": return isMemberRef(v) && memberFits(v, bounds);
    case "item": return isLocalId(v);
    case "fact": return isFactRef(v);
    case "scope": return isScopeRef(v) && v.kind === type.kind;
    case "digest": return isDigest(v);
    case "commit": case "tree": return isObjectId(v);
    case "list": return Array.isArray(v) && v.length <= Math.min(type.max, bounds.listElements) && v.every((e) => fitsFieldType(type.of, e, bounds));
    // Section 6.2: a record has named members. An unknown member is refused, and a member that is not required may be absent.
    case "record": return isRecord(v) && Object.keys(v).every((m) => Object.hasOwn(type.of, m)) && Object.entries(type.of).every(([m, of]) => (Object.hasOwn(v, m) ? fitsFieldType(of, v[m], bounds) : !of.required));
  }
}
