/** One deployment Register identity, independent of repository host wiring. */
import type { ScopeId } from "@generalbusiness/dap-contract";
import { isScopeId } from "@generalbusiness/dap-bytes";
import { installedRegisterScopes } from "./installed-registers.ts";
import { artifactsConfiguration } from "./artifacts-wiring.ts";
import { gitHubRegisterScope } from "./github-config.ts";

export interface RegisterSettings { REGISTER_SCOPE?: unknown; ARTIFACTS_CONFIG?: unknown; GITHUB_APP_CONFIG?: unknown; INSTALLED_REGISTER_SCOPES?: unknown }
export type RegisterSelection = { readonly kind: "pinned"; readonly scope: ScopeId }
  | { readonly kind: "absent" } | { readonly kind: "misconfigured" };

/** Supplied values must parse and agree. This reads no binding or provider,
 * caches no identity, and preserves the valid Artifacts-only setting. */
export function readRegisterScope(settings: RegisterSettings): RegisterSelection {
  try {
    const explicit = settings.REGISTER_SCOPE, artifacts = settings.ARTIFACTS_CONFIG;
    if (explicit !== undefined && !isScopeId(explicit)) return { kind: "misconfigured" };
    const configured = artifacts === undefined ? null : artifactsConfiguration(artifacts);
    if (artifacts !== undefined && configured === null) return { kind: "misconfigured" };
    if (explicit !== undefined && configured !== null && explicit !== configured.registerScope) return { kind: "misconfigured" };
    const scope = explicit ?? configured?.registerScope;
    return scope === undefined ? { kind: "absent" } : { kind: "pinned", scope };
  } catch { return { kind: "misconfigured" }; }
}

export type InstalledRegisterSelection = { readonly kind: "pinned"; readonly scope: ScopeId; readonly scopes: readonly ScopeId[] }
  | { readonly kind: "absent" } | { readonly kind: "misconfigured" };

/** The operator records historical roots, never a caller or the scope index.
 * Listing a root selects policy; native lineage still proves it. A valid
 * GitHub setting names the root that the GitHub host serves; it must be one
 * of these installed roots (S3, review 79daff0f finding 2.4, ruling e6fd1f7f).
 * An invalid GitHub setting leaves that host off and selects nothing here. */
export function readInstalledRegisters(settings: RegisterSettings): InstalledRegisterSelection {
  const current = readRegisterScope(settings), raw = settings.INSTALLED_REGISTER_SCOPES;
  if (current.kind !== "pinned") return raw === undefined ? current : { kind: "misconfigured" };
  const scopes = installedRegisterScopes(current.scope, raw);
  if (!scopes) return { kind: "misconfigured" };
  const github = settings.GITHUB_APP_CONFIG === undefined ? null : gitHubRegisterScope(settings.GITHUB_APP_CONFIG);
  return github === null || scopes.includes(github) ? { ...current, scopes } : { kind: "misconfigured" };
}
