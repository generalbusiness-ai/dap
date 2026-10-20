/** Written forms only. The native caller still validates each definition. */
import type { Digest } from "@generalbusiness/dap-contract";
import type { PackageConnection, PackageGraphDefinition } from "./types.ts";

export const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const array = (value: unknown): readonly unknown[] => Array.isArray(value) ? value : [];
export const own = (value: Readonly<Record<string, unknown>>, key: string): unknown => Object.hasOwn(value, key) ? value[key] : undefined;
export interface GraphRow {
  readonly owner: PackageGraphDefinition;
  readonly family: "acts" | "receives" | "timed";
  readonly name: string;
  readonly path: string;
  readonly logical: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly primary: string | null;
  readonly opens: boolean;
}
export interface GraphSend {
  readonly row: GraphRow;
  readonly index: number;
  readonly kind: "create" | "tell" | "relate" | "index";
  readonly path: string;
  readonly data: Readonly<Record<string, unknown>>;
}
export interface GraphWriter {
  readonly row: GraphRow;
  readonly path: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly clause?: { readonly send: GraphSend; readonly outcome: string };
}
export interface GraphCreate { readonly send: GraphSend; readonly target: Digest }

export function graphRows(definitions: readonly PackageGraphDefinition[]): GraphRow[] {
  const rows: GraphRow[] = [];
  for (const owner of definitions) for (const family of ["acts", "receives", "timed"] as const) {
    for (const [name, written] of Object.entries(owner.definition[family])) {
      const data = record(written), path = `${family}.${name}`;
      const primary = family === "receives" ? data["opens"] : data["on"];
      const row: GraphRow = { owner, family, name, path, logical: path, data, primary: typeof primary === "string" ? primary : null,
        opens: family === "acts" ? data["step"] === "open" : family === "receives" && typeof primary === "string" };
      rows.push(row);
      const late = record(data["late"]);
      if (family === "receives" && Object.hasOwn(late, "then")) {
        const branch = record(late["then"]);
        rows.push({ ...row, path: `${path}.late.then`, data: { ...data, guards: [], effects: branch["effects"] ?? [], sends: branch["sends"] ?? [], attention: branch["attention"] ?? [] } });
      }
    }
  }
  return rows;
}
export function graphSends(rows: readonly GraphRow[]): GraphSend[] {
  return rows.flatMap(row => array(row.data["sends"]).flatMap((value, index) => {
    const form = record(value), kinds = (["create", "tell", "relate", "index"] as const).filter(kind => Object.hasOwn(form, kind));
    return kinds.length === 1 ? [{ row, index, kind: kinds[0]!, path: `${row.path}.sends.${index}`, data: record(form[kinds[0]!]) }] : [];
  }));
}
export function graphWriters(rows: readonly GraphRow[], sends: readonly GraphSend[]): GraphWriter[] {
  return [...rows.flatMap(row => array(row.data["effects"]).map((effect, i) => ({ row, path: `${row.path}.effects.${i}`, data: record(effect) }))),
    ...sends.flatMap(send => Object.entries(record(send.data["result"])).flatMap(([outcome, effects]) => array(effects).map((effect, i) => ({ row: send.row, path: `${send.path}.${send.kind}.result.${outcome}.${i}`, data: record(effect), clause: { send, outcome } }))))];
}
export function graphCreates(sends: readonly GraphSend[], definitions: ReadonlySet<Digest>): GraphCreate[] {
  return sends.flatMap(send => {
    if (send.kind !== "create") return [];
    const target = send.data["definition"] === "self" ? send.row.owner.id : send.data["definition"];
    return typeof target === "string" && definitions.has(target as Digest) ? [{ send, target: target as Digest }] : [];
  });
}
export function subjectType(row: GraphRow, subject: unknown = "on", seen = new Set<string>()): string | null {
  if (subject === "on" || subject === undefined) return row.primary;
  if (typeof subject !== "string" || !subject.startsWith("also.") || seen.has(subject)) return null;
  seen.add(subject);
  const selected = record(own(record(row.data["also"]), subject.slice(5)));
  if (typeof selected["item"] === "string") return selected["item"];
  const via = record(selected["via"]), prior = subjectType(row, via["of"], seen);
  if (!prior || typeof via["slot"] !== "string") return null;
  const item = record(own(record(row.owner.definition.items), prior)), slot = record(own(record(item["refs"]), via["slot"])), target = record(slot["to"]);
  return target["type"] === "item" && typeof target["of"] === "string" ? target["of"] : null;
}
export function sendEndpoint(send: GraphSend, connections: readonly PackageConnection[]): PackageConnection | null {
  const source = record(send.data["to"]);
  if (typeof source["slot"] !== "string") return null;
  const type = subjectType(send.row, source["of"]);
  return type ? connections.find(edge => edge.from === send.row.owner.id && edge.item === type && edge.slot === source["slot"]) ?? null : null;
}
export function finalStates(definition: PackageGraphDefinition, type: string): ReadonlySet<string> {
  const item = record(own(record(definition.definition.items), type));
  return new Set(Object.entries(record(item["states"])).filter(([, state]) => record(state)["final"] === true).map(([name]) => name));
}
export const countOf = (value: unknown): bigint | null => typeof value === "number" && Number.isSafeInteger(value) && value >= 1 ? BigInt(value) : null;
export const reportedCount = (value: bigint | null): number | string | null => value === null ? null : value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
