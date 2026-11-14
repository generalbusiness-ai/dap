/** Lower only declared item names and subject revisions for one body call. */
import type { ActType, FieldValue, Item, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, isRecord } from "@generalbusiness/dap-bytes";
import type { ShapeField } from "./declared.ts";
import { effectiveFields, expectedOf } from "./expected.ts";
import type { ItemName, Revision, Source } from "./act-types.ts";

export class UnavailableActSource extends Error {
  override readonly name = "UnavailableActSource";
  constructor(readonly source: Source) { super("the act names a source that this view cannot resolve"); }
}

export interface ActSymbols {
  item(name: ItemName): number | null;
  revision(source: Source, item: number): number | null;
}

function outputOf(value: unknown): Source | null {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, "output")) return null;
  const source = value["output"];
  if (!isRecord(source) || Object.keys(source).length !== 2 || typeof source["key"] !== "string" || !isDigest(source["version"])) return null;
  return { key: source["key"], version: source["version"] };
}

/** Unknown fields and malformed values stay intact for the shared shape checker. */
export function lowerActNames(act: { readonly on: ItemName | null; readonly fields: Readonly<Record<string, unknown>> },
  fields: Readonly<Record<string, ShapeField>>, symbols: ActSymbols,
  reference?: (source: Source, position: "on" | readonly (string | number)[]) => void): { on: number | null; fields: Record<string, unknown> } {
  const item = (value: ItemName, position: "on" | readonly (string | number)[]): number => {
    const found = symbols.item(value);
    if (found !== null) {
      if (typeof value !== "number") reference?.(value.output, position);
      return found;
    }
    if (typeof value === "number") return value;
    throw new UnavailableActSource(value.output);
  };
  const lower = (type: ShapeField | undefined, value: unknown, path: readonly (string | number)[]): unknown => {
    if (type?.type === "item") {
      if (typeof value === "number") return item(value, path);
      const source = outputOf(value);
      return source === null ? value : item({ output: source }, path);
    }
    if (type?.type === "list" && Array.isArray(value)) return value.map((member, index) => lower(type.of, member, [...path, index]));
    if (type?.type === "record" && isRecord(value)) return Object.fromEntries(Object.entries(value).map(([name, member]) =>
      [name, lower(Object.hasOwn(type.of, name) ? type.of[name] : undefined, member, [...path, name])]));
    return value;
  };
  return { on: act.on === null ? null : item(act.on, "on"), fields: Object.fromEntries(Object.entries(act.fields).map(([name, value]) =>
    [name, lower(Object.hasOwn(fields, name) ? fields[name] : undefined, value, [name])])) };
}

/** Select subjects with the existing resolver, then resolve `after` for that exact item. */
export function lowerActBasis<I extends number | object>(act: ActType,
  items: readonly (Pick<Item, "type" | "refs"> & { readonly id: I })[],
  on: I | null, fields: Readonly<Record<string, FieldValue>>, at: ScopeRef,
  expected: Readonly<Record<string, Revision>>, symbols: { revision(source: Source, item: I): number | null }): Record<string, number> {
  const subjects = expectedOf(act, items.map(item => ({ ...item, revision: item.id })), on, effectiveFields(act, fields, at));
  return Object.fromEntries(Object.entries(expected).map(([name, revision]) => {
    if (typeof revision === "number") return [name, revision];
    const subject = Object.hasOwn(subjects, name) ? subjects[name] : undefined;
    const resolved = subject === undefined ? null : symbols.revision(revision.after, subject);
    if (resolved === null) throw new UnavailableActSource(revision.after);
    return [name, resolved];
  }));
}
