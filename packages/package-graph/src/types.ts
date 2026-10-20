/** Composition metadata carries no guard, effect or executable judgment. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";

export interface PackageConnection { readonly from: Digest; readonly item: string; readonly slot: string; readonly to: Digest | "outside" }
export interface PackageExercise { readonly definition: Digest; readonly row: string; readonly right: string }
export interface PackageGroup { readonly name: string; readonly members: readonly { readonly name: string; readonly definition: Digest }[]; readonly lifetime: { readonly seconds: number } }
export interface PackageOrder { readonly definition: Digest; readonly handler: string; readonly by: "any" | { readonly right: string } | { readonly group: string } }
export type PackageDerivation = { readonly parent: Digest; readonly patch: Readonly<Record<string, unknown>> }
  | { readonly parent: Digest; readonly parameters: Readonly<Record<string, number | string>> };
export interface PackageParameter { readonly type: "int" | "text"; readonly default: number | string; readonly min?: number; readonly max?: number }
export interface PackageComposition {
  readonly connections: readonly PackageConnection[];
  readonly rights: Readonly<Record<string, { readonly owner: Digest }>>;
  readonly exercises: readonly PackageExercise[];
  readonly groups: readonly PackageGroup[];
  readonly order: readonly PackageOrder[];
  readonly derivation: Readonly<Record<Digest, PackageDerivation>>;
  readonly parameters: Readonly<Record<string, PackageParameter>>;
}
export interface PackageGraphDefinition { readonly id: Digest; readonly definition: DeclaredDefinition }
export type PackageCheckReason = "unknown-message" | "field-mismatch" | "unreachable-handler" | "fan-in-unproved" | "fan-in-exceeds-copies"
  | "unbound-endpoint" | "wrong-peer" | "group-member-not-singleton" | "unhandled-result" | "unsettled-pending" | "ungranted-act"
  | "right-not-owned" | "unowned-bound" | "order-undeclared" | "reads-outside-group" | "sequenced-for-nothing" | "unsequenced-read-target"
  | "cycle-unacknowledged" | "unreachable-state" | "patch-fails" | "sealed-row" | "parameter-bounds" | "bounds" | "unsupported-form";
export interface PackageFinding {
  readonly definition: Digest | null;
  readonly row: string;
  readonly check: string;
  readonly reason: PackageCheckReason;
  readonly severity: "refusal" | "warning";
  readonly message: string;
}

/** Format allowances, further constrained by the codec's metadata byte limit.
 * These are not native scope or heap quotas. */
export const PACKAGE_COMPOSITION_LIMITS = Object.freeze({ connections: 4096, rights: 128, exercises: 4096, groups: 32, members: 128, order: 4096, derivation: 17, parameters: 128, nameUnits: 64 * 1024 });
export const emptyPackageComposition = (): PackageComposition => ({ connections: [], rights: {}, exercises: [], groups: [], order: [], derivation: {}, parameters: {} });
