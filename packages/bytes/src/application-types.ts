/** Trusted application package v1. Content identity is not host admission. */
import type { Base64Url, Digest, KeyId } from "@generalbusiness/dap-contract";

export const APPLICATION_PACKAGE_LIMITS = Object.freeze({
  bytes: 16 * 1024 * 1024, assets: 64, assetBytes: 2 * 1024 * 1024,
  totalAssetBytes: 8 * 1024 * 1024, definitions: 17, definitionBytes: 256 * 1024,
  metadataBytes: 64 * 1024,
});
/** These are package-format caller allowances, not platform or heap quotas. */
export type ApplicationPackageLimits = { readonly [K in keyof typeof APPLICATION_PACKAGE_LIMITS]: number };
export class ApplicationPackageError extends Error {
  constructor(readonly reason: "invalid" | "limit" | "integrity" | "signature" | "closure") { super(`application-package-${reason}`); }
}
export interface ApplicationDefinition { readonly id: Digest; readonly bytes: string }
export interface ApplicationCreation { readonly from: Digest; readonly to: Digest }
export interface ApplicationCapability { readonly name: string; readonly bounds: Readonly<Record<string, unknown>> }
export interface ApplicationSemantics {
  readonly v: 1;
  readonly entry: Digest;
  readonly definitions: readonly ApplicationDefinition[];
  readonly creates: readonly ApplicationCreation[];
  readonly host: { readonly execution: "recorded-do"; readonly profiles: readonly string[]; readonly requires?: readonly "archive"[] };
  /** Projection syntax belongs to M2a; v1 M1 admits this empty place only. */
  readonly projections: Readonly<Record<string, never>>;
  readonly capabilities: readonly ApplicationCapability[];
  readonly roles: Readonly<Record<string, readonly string[]>>;
  readonly predecessor: Digest | null;
}
export interface ApplicationAsset { readonly path: string; readonly mediaType: string; readonly bytes: Base64Url }
export interface ApplicationPresentation {
  readonly v: 1;
  readonly semantic: Digest;
  readonly entry: string;
  readonly assets: readonly ApplicationAsset[];
  readonly descriptions: Readonly<Record<string, { readonly text: string; readonly fields: Readonly<Record<string, string>> }>>;
}
export interface ApplicationManifest {
  readonly v: 1;
  readonly name: string;
  readonly version: string;
  readonly publisher: KeyId;
  readonly semantic: Digest;
  readonly presentation: Digest;
}
export interface ApplicationRelease { readonly manifest: ApplicationManifest; readonly sig: Base64Url }
export interface ApplicationPackage { readonly v: 1; readonly semantic: ApplicationSemantics; readonly presentation: ApplicationPresentation; readonly release: ApplicationRelease }
export interface ApplicationIds { readonly semantic: Digest; readonly presentation: Digest; readonly release: Digest }
/** A verified semantic body and signed release only. It carries no screen
 * bytes and is not a complete application package or host trust decision. */
export interface ApplicationReleaseProof { readonly semantic: ApplicationSemantics; readonly release: ApplicationRelease; readonly ids: ApplicationIds }
export interface PackedApplication { readonly bytes: Uint8Array; readonly ids: ApplicationIds; readonly package: ApplicationPackage }
export interface ApplicationPackageInput {
  readonly name: string; readonly version: string;
  readonly semantic: Omit<ApplicationSemantics, "creates">;
  readonly presentation: Omit<ApplicationPresentation, "semantic">;
}

/** Public routing metadata of one native active installation. This is not a
 * grant or a read session and exposes no application item data. */
export interface ApplicationRoom { readonly directory: import("@generalbusiness/dap-contract").ScopeRef; readonly rules: import("@generalbusiness/dap-contract").ScopeRef }
export interface ApplicationInstallation extends ApplicationRoom {
  /** Filled by current native routing metadata. Legacy metadata used M7. */
  readonly membershipDefinition?: "platform:membership@7" | "platform:membership@8";
  readonly membership: import("@generalbusiness/dap-contract").ScopeRef;
  readonly destination: import("@generalbusiness/dap-contract").ScopeRef;
  readonly scope: import("@generalbusiness/dap-contract").ScopeRef;
  readonly item: number; readonly definition: Digest; readonly ids: ApplicationIds;
}
export interface ApplicationScreenContext extends ApplicationInstallation { readonly v: 1; readonly origin: string; readonly deployment: string; readonly membershipDefinition: "platform:membership@7" | "platform:membership@8" }
