import type { Json } from '../src/canon.ts';

export type Expr = Json | { op: string; [key: string]: unknown };
export type Visibility = 'spine' | 'members' | string;
export interface Readers { recipients: Expr[]; }
export interface Column { type: string; readers?: Visibility; max?: Visibility; derive?: Expr; }
export interface Table {
  readers: Visibility;
  max: Visibility;
  columns: Record<string, Column>;
  key: string;
  /** All assignments retain their producing position; latest picks by position. */
  versioned?: boolean;
}
export interface Guard { test: Expr; reason: string; }
export interface Reference {
  table: string;
  key: Expr;
  reason: string;
  optional?: Expr;
  equals?: { field: string; value: Expr; reason: string };
  /** Retained only for diagnosed bad declarations. */
  trustPayload?: boolean;
}
export interface Act {
  kind: string;
  readers: Visibility;
  max: Visibility;
  capability?: string;
  schema: Record<string, string>;
  guards: (Guard | Reference)[];
  writes: { table: string; values: Record<string, Expr> }[];
  /** Candidate payload domains; the actual fold guards decide the offer. */
  candidates?: Expr;
  ambient?: boolean;
  grant?: { roles: string[]; principalFrom: string };
}
export interface Declaration {
  name: string;
  model: string;
  roles: Record<string, string[]>;
  readers: Record<string, Readers>;
  tables: Record<string, Table>;
  acts: Act[];
  query: Expr;
  invariants: { test: Expr; reason: string }[];
  /** Foundation dependency kinds whose payloads can be disclosed. */
  supportDisclosure: string[];
  backlogBy: string;
}

export const lit = (value: Json): Expr => ({ op: 'literal', value });
export const path = (value: string): Expr => ({ op: 'path', value });
export const get = (value: Expr, field: string): Expr => ({ op: 'get', value, field });
export const obj = (fields: Record<string, Expr>): Expr => ({ op: 'object', fields });
export const arr = (...values: Expr[]): Expr => ({ op: 'array', values });
export const op = (name: string, ...args: Expr[]): Expr => ({ op: name, args });
export const choose = (test: Expr, yes: Expr, no: Expr): Expr => ({ op: 'if', test, yes, no });
export const read = (table: string, mode: string, options: { key?: Expr; where?: Expr; select?: Expr; as?: string } = {}): Expr => ({ op: 'read', table, mode, ...options });
export const privateValue = (readers: string, value: Expr): Expr => ({ op: 'private', readers, value });
export const guard = (test: Expr, reason: string): Guard => ({ test, reason });
