/** One deployment Register identity, independent of repository host wiring. */
import type { ScopeId } from "@generalbusiness/dap-contract";
import { isScopeId } from "@generalbusiness/dap-bytes";
import { artifactsConfiguration } from "./artifacts-wiring.ts";

export interface RegisterSettings { REGISTER_SCOPE?: unknown; ARTIFACTS_CONFIG?: unknown }
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
