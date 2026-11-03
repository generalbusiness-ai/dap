/** One deployment Register identity, independent of repository host wiring. */
import type { ScopeId } from "@generalbusiness/dap-contract";
import { isScopeId, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { artifactsConfiguration } from "./artifacts-wiring.ts";

export interface RegisterSettings { REGISTER_SCOPE?: unknown; ARTIFACTS_CONFIG?: unknown; INSTALLED_REGISTER_SCOPES?: unknown }
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
 * Listing a root grants admission policy only; native lineage still proves it. */
export function readInstalledRegisters(settings: RegisterSettings): InstalledRegisterSelection {
  const current = readRegisterScope(settings), raw = settings.INSTALLED_REGISTER_SCOPES;
  if (current.kind !== "pinned") return raw === undefined ? current : { kind: "misconfigured" };
  if (raw === undefined) return { ...current, scopes: Object.freeze([current.scope]) };
  if (typeof raw !== "string" || utf8(raw).length > 4096) return { kind: "misconfigured" };
  try {
    const rows: unknown = parseStrict(raw);
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 32 || rows.some(row => !isScopeId(row))
      || new Set(rows).size !== rows.length || !rows.includes(current.scope)) return { kind: "misconfigured" };
    return { ...current, scopes: Object.freeze([...rows] as ScopeId[]) };
  } catch { return { kind: "misconfigured" }; }
}
