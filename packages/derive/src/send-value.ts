/** Encode one typed value at a message boundary. Preserve the last missing reference. */
import type { FactRef, FieldType, SelfMark } from "@generalbusiness/dap-contract";
import { isSequenceRef } from "@generalbusiness/dap-bytes";
import type { Judging } from "./guards.ts";
import { isLocalId, isObject, own } from "./values.ts";

export function sendValue(j: Pick<Judging, "self" | "scope" | "view" | "own">, value: unknown, type: FieldType | null): { value: unknown; unresolved: string | null } {
  let unresolved: string | null = null;
  const local = (id: unknown): SelfMark | FactRef | null => {
    if (id === j.self) return { self: true };
    const opened = isLocalId(id) ? j.view.item(id)?.opened : null;
    if (!opened) unresolved = `item ${String(id)}`;
    if (!isSequenceRef(j.scope.at)) { unresolved = `unsealed entry ${String(id)}`; return null; }
    return opened ? { at: j.scope.at, seq: id as number, hash: opened } : null;
  };
  const fact = (v: unknown): unknown => {
    if (!isLocalId(v)) return v;
    if (v === j.self) return { self: true } satisfies SelfMark;
    const kept = j.own?.(v);
    if (!kept) unresolved = `entry ${v}`;
    if (!isSequenceRef(j.scope.at)) { unresolved = `unsealed entry ${v}`; return null; }
    return kept ? ({ at: j.scope.at, seq: v, hash: kept.hash } satisfies FactRef) : null;
  };
  const wire = (v: unknown, of: FieldType | null): unknown => {
    if (v === null) return null;
    if (of?.type === "item") return local(v);
    if (of?.type === "fact") return fact(v);
    if (of?.type === "list" && Array.isArray(v)) return v.map(member => wire(member, of.of));
    if (of?.type === "record" && isObject(v)) return Object.fromEntries(Object.entries(v).map(([name, member]) => [name, wire(member, own(of.of, name) ?? null)]));
    return v;
  };
  return { value: wire(value, type), unresolved };
}
