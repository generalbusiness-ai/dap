/** Pure operator root-list policy shared by creation and host wiring. */
import type { ScopeId } from "@generalbusiness/dap-contract";
import { isScopeId, parseStrict, utf8 } from "@generalbusiness/dap-bytes";

/** A supplied list is bounded, distinct, canonical and contains the current root. */
export function installedRegisterScopes(current: ScopeId, raw: unknown): readonly ScopeId[] | null {
  if (raw === undefined) return Object.freeze([current]);
  if (typeof raw !== "string" || utf8(raw).length > 4096) return null;
  try {
    const rows: unknown = parseStrict(raw);
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 32 || rows.some(row => !isScopeId(row))
      || new Set(rows).size !== rows.length || !rows.includes(current)) return null;
    return Object.freeze([...rows] as ScopeId[]);
  } catch { return null; }
}

export interface HostRegisterSettings { REGISTER_SCOPE?: string; INSTALLED_REGISTER_SCOPES?: string }
/** Without a list, preserve the adapter's historical single-root setting.
 * With a list, an explicit creation root must agree with the host setting. */
export function hostRegisterScopes(configured: ScopeId, settings: { REGISTER_SCOPE?: unknown; INSTALLED_REGISTER_SCOPES?: unknown }): readonly ScopeId[] | null {
  if (settings.INSTALLED_REGISTER_SCOPES !== undefined && settings.REGISTER_SCOPE !== undefined
    && settings.REGISTER_SCOPE !== configured) return null;
  return installedRegisterScopes(configured, settings.INSTALLED_REGISTER_SCOPES);
}
