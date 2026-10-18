/** Session-authorized declared application read wire. No field here grants
 * authority or changes the native definition pinned by a scope. */
import type { Digest, FactRef, ScopeRef, Timestamp } from "./scope.ts";
import type { Head } from "./result.ts";
import type { FieldValue } from "./intent.ts";
export const APPLICATION_PROJECTION_WIRE_BOUNDS = Object.freeze({ queryBytes: 4096, encodedChars: 5462, urlBytes: 8192, sessionChars: 4104,
  sources: 8, fields: 32, rows: 100, resultBytes: 256 * 1024 + 1024 });
export interface ApplicationProjectionQuery {
  readonly v: 1;
  readonly scope: ScopeRef;
  readonly directory: ScopeRef;
  readonly install: number;
  readonly projection: string;
  readonly items: Readonly<Record<string, number>>;
}
interface ApplicationProjectionRowFields {
  readonly id: number;
  readonly type: string;
  readonly state: string;
  readonly revision: number;
  /** Complete returned data, including nested field values, is frozen. */
  readonly fields: Readonly<Record<string, FieldValue | null>>;
}
/** A journal seq is a display identity/revision, never a signable item
 * revision. A journal row always carries both its explicit fact and time. */
export type ApplicationProjectionRow = ApplicationProjectionRowFields & (
  { readonly entry?: never; readonly time?: never } | { readonly entry: Readonly<FactRef>; readonly time: Timestamp }
);
export interface ApplicationProjectionData {
  readonly v: 1;
  readonly projection: Digest;
  readonly scope: Readonly<ScopeRef>;
  readonly at: Readonly<Head>;
  readonly sources: Readonly<Record<string, readonly ApplicationProjectionRow[]>>;
}
export const APPLICATION_PROJECTION_REFUSALS = Object.freeze(["invalid-query", "forbidden", "unavailable", "incomplete", "stale", "too-large", "query-not-ready", "clock-behind", "sessions-unavailable", "wrong-scope"] as const);
export type ApplicationProjectionRefusal = typeof APPLICATION_PROJECTION_REFUSALS[number];
export type ApplicationProjectionRead = { ok: true; query: Digest; value: ApplicationProjectionData } | { ok: false; reason: ApplicationProjectionRefusal };
