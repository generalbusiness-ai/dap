/** Declared item projections. This syntax neither authorizes a read nor
 * changes a native definition. M1 packages still admit empty projections only. */
import type { Digest, FieldType } from "@generalbusiness/dap-contract";
import type { ApplicationDefinition, ApplicationInstallation } from "./application-types.ts";
export type { ApplicationProjectionData, ApplicationProjectionRow } from "@generalbusiness/dap-contract";

type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;
export type ProjectionFieldType = Immutable<FieldType>;
export const APPLICATION_PROJECTION_LIMITS = Object.freeze({
  metadataBytes: 64 * 1024, sources: 8, fields: 32, rows: 100,
  resultBytes: 256 * 1024, textBytes: 64 * 1024, typeDepth: 6, typeNodes: 256,
});
export interface ApplicationProjectionField {
  readonly from: { readonly kind: "value" | "party" | "ref"; readonly name: string };
  readonly of: ProjectionFieldType;
  readonly nullable: boolean;
}
export interface ApplicationProjectionSource {
  /** The native item type. `item` uses an explicit requested item ID; `one`
   * requires a unique matching row; `many` requires the complete bounded set. */
  readonly item: string;
  readonly read: "item" | "one" | "many";
  readonly states: readonly string[];
  readonly limit: number;
  /** id, type, state and revision are native metadata, never field aliases. */
  readonly fields: Readonly<Record<string, ApplicationProjectionField>>;
}
export interface ApplicationReadProjection {
  readonly v: 1;
  readonly definition: Digest;
  readonly sources: Readonly<Record<string, ApplicationProjectionSource>>;
  readonly revision: "revision";
}
/** Native retained declaration metadata, without any application item data. */
export interface ApplicationProjectionDeclaration {
  readonly v: 1;
  readonly installation: ApplicationInstallation;
  readonly name: string;
  readonly projection: ApplicationReadProjection;
  readonly definition: ApplicationDefinition;
}
export class ApplicationProjectionError extends Error {
  constructor(readonly reason: "invalid" | "limit" | "binding" | "incomplete" | "stale" | "unavailable") { super("application-projection-" + reason); }
}
