/** Resolve genesis-origin self only at positions selected by declared types. */
import type { FactRef, FieldType } from "@generalbusiness/dap-contract";
import { isGenesisSelfRef, isRecord, resolveGenesisSelf } from "@generalbusiness/dap-bytes";

export function resolveGenesisValue(type: FieldType | undefined, value: unknown, origin: FactRef): unknown {
  if (!type) return value;
  if (type.type === "scope" && isGenesisSelfRef(value)) {
    const full = resolveGenesisSelf(value, origin);
    return full ?? value;
  }
  if (type.type === "member" && isRecord(value) && isGenesisSelfRef(value["membership"])) {
    const membership = resolveGenesisSelf(value["membership"], origin);
    return membership ? { ...value, membership } : value;
  }
  if (type.type === "list" && Array.isArray(value)) return value.map(member => resolveGenesisValue(type.of, member, origin));
  if (type.type === "record" && isRecord(value)) return Object.fromEntries(Object.entries(value).map(([name, member]) => [name, resolveGenesisValue(Object.hasOwn(type.of, name) ? type.of[name] : undefined, member, origin)]));
  return value;
}
