/** Semantic declaration rows own headers and body frames within one admission. */
import type { ActType, ItemType, OutcomeMark, ReceiveType, TimedRule } from "@generalbusiness/dap-contract";
import type { Defining } from "../validate/context.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { bindDeclarationRow, declarationOf } from "./declaration.ts";

interface RowDeclarations {
  readonly act: ActType;
  readonly receive: ReceiveType;
  readonly timed: TimedRule;
  readonly item: ItemType;
  readonly outcome: OutcomeMark;
}
export type RowKind = keyof RowDeclarations;
export type RowIdentity = Readonly<object>;
interface RowScope { readonly id: RowIdentity; readonly kind: RowKind; readonly name: string; readonly path: string }
export type RowRead<K extends RowKind = RowKind> = { [P in K]: RowScope & {
  readonly kind: P;
  readonly declaration: Readonly<RowDeclarations[P]>;
} }[K];
const pending = new WeakMap<Defining, RowScope[]>(), active = new WeakMap<Defining, RowScope>();
interface AdmittedRows {
  readonly rows: readonly RowRead[];
  readonly identities: WeakMap<RowIdentity, RowRead>;
  readonly names: ReadonlyMap<RowKind, ReadonlyMap<string, RowRead>>;
}
const admitted = new WeakMap<ValidDefinition, AdmittedRows>(), owners = new WeakMap<RowRead, ValidDefinition>();

/** This scope invokes existing validation immediately; no callback enters a program. */
export function withRow(d: Defining, kind: RowKind, name: string, path: string, read: () => void): void {
  if (active.has(d)) throw new TypeError("declaration row scope is already open");
  const row: RowScope = Object.freeze({ id: Object.freeze({}), kind, name, path });
  const all = pending.get(d) ?? [];
  all.push(row); pending.set(d, all); active.set(d, row);
  try { read(); }
  finally { active.delete(d); }
}
export const currentRow = (d: Defining): RowIdentity | null => active.get(d)?.id ?? null;

/** Final admission resolves semantic row names against its owned declaration. */
export function bindRows(d: Defining, definition: ValidDefinition): void {
  if (active.has(d) || admitted.has(definition)) throw new TypeError("declaration rows have no final admission scope");
  const data = declarationOf(definition);
  const outcomes = (data as typeof data & { readonly outcomes?: Readonly<Record<string, OutcomeMark>> }).outcomes ?? {};
  const declarations = { act: data.acts, receive: data.receives, timed: data.timed, item: data.items, outcome: outcomes };
  const identities = new WeakMap<RowIdentity, RowRead>(), names = new Map<RowKind, Map<string, RowRead>>();
  const rows = Object.freeze((pending.get(d) ?? []).map(scope => {
    const family = declarations[scope.kind];
    if (!Object.hasOwn(family, scope.name)) throw new TypeError("admitted row has no declaration");
    const declaration = family[scope.name]!;
    // The existing validator selected this family before final admission.
    const row = Object.freeze({ ...scope, declaration }) as RowRead;
    const named = names.get(scope.kind) ?? new Map<string, RowRead>();
    if (named.has(scope.name)) throw new TypeError("declaration row was captured twice");
    named.set(scope.name, row); names.set(scope.kind, named); identities.set(row.id, row); owners.set(row, definition);
    bindDeclarationRow(definition, declaration, row.id);
    return row;
  }));
  admitted.set(definition, { rows, identities, names }); pending.delete(d);
}
export const rowsOf = (definition: ValidDefinition): readonly RowRead[] => admitted.get(definition)?.rows ?? [];
export const rowOf = (definition: ValidDefinition, id: RowIdentity): RowRead | null => admitted.get(definition)?.identities.get(id) ?? null;
export function namedRow<K extends RowKind>(definition: ValidDefinition, kind: K, name: string): RowRead<K> | null {
  const row = admitted.get(definition)?.names.get(kind)?.get(name);
  return row?.kind === kind ? row as RowRead<K> : null;
}
export function checkedRow(definition: ValidDefinition, row: RowRead): void {
  if (owners.get(row) !== definition) throw new TypeError("declaration row belongs to another validation");
}
