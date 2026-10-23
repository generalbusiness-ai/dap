/** Values of the field types of section 6.2, as they appear in an intent, a slot and an effect. */

import { SCOPE_KINDS, byteOrder, isFactRef, isLocalId, isMemberRef, isRecord, isScopeRef } from "@generalbusiness/dap-bytes";

/** The scope kinds, from the bytes package, which holds the one guard of each identifier. */
export { SCOPE_KINDS };

/**
 * What a record holds under a name, or undefined. For every record keyed by
 * a name that a definition, an intent or a message chose: a field, a slot,
 * an item type, a state, an act, a rule, a handler, a relationship. Only an
 * own property is a member of such a record, so `__proto__`, `constructor`
 * and `toString` are names like any other, and a name the record does not
 * hold resolves to nothing. Such a record is built so that each name is an
 * own property: by `JSON.parse`, the strict parser, `Object.fromEntries`,
 * a spread, or a computed key in a literal. It is never built by assigning
 * to `record[name]`, which for `__proto__` sets the prototype instead.
 */
export const own = <T>(record: Readonly<Record<string, T>> | null | undefined, name: string): T | undefined =>
  (record !== null && record !== undefined && Object.hasOwn(record, name) ? record[name] : undefined);

/** The guards of a reference and of a position are the bytes package's, beside the other fixed records of the contract. */
export { isFactRef, isLocalId, isMemberRef, isScopeRef, isRecord as isObject };

export { fitsFieldType as isValue, memberFits } from "@generalbusiness/dap-bytes";

/**
 * Section 6.2: a member of a record is named after what holds the record,
 * with a dot. `k.item` is the member `item` of the record that `k` names.
 * `held` gives what a name holds, or undefined when nothing has that name. A
 * name that holds something is read whole, also when it has a dot. Null:
 * nothing has the name, or what it leads to is no record with that member.
 */
export function memberOf(held: (name: string) => unknown, name: string): unknown {
  const whole = held(name);
  if (whole !== undefined) return whole;
  for (let dot = name.indexOf("."); dot !== -1; dot = name.indexOf(".", dot + 1)) {
    let value = held(name.slice(0, dot));
    if (value === undefined) continue;
    for (const member of name.slice(dot + 1).split(".")) value = isRecord(value) ? own(value, member) : undefined;
    return value ?? null;
  }
  return null;
}

/** Equality of two values: equal canonical JSON. An empty slot or an absent field is `null`, and equals only another. */
export { same } from "@generalbusiness/dap-bytes";

/** Byte order of two strings: by their UTF-8 bytes (section 5.2). */
export { byteOrder };
