/** Deployment creation policy. Historical loading and replay never use it. */
import type { PlatformDefinition } from "@generalbusiness/dap-contract";
import { isPlatformDefinition, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { COMMONS_COHORT, ARCHIVE_DEVICE_PUBLICATION_COHORT, UNPUBLISHED_COHORT, platform } from "@generalbusiness/dap-platform";

export interface PlatformCreationSettings { PLATFORM_CREATION_PINS?: unknown }
export interface PlatformCreationPolicy { readonly pins: readonly PlatformDefinition[] }
// Retain the existing hosted baseline and admit the related host-none family.
// This does not change any recorded pin or the CLI's hosted default choice.
const newest = [...new Set([...Object.values(ARCHIVE_DEVICE_PUBLICATION_COHORT), ...Object.values(UNPUBLISHED_COHORT), ...Object.values(COMMONS_COHORT)])];
const defaults: PlatformCreationPolicy = Object.freeze({ pins: Object.freeze([...newest]) });
/** Undefined is the absent setting, including an explicitly undefined field.
 * Null is invalid. No caller-owned array or mutable setting survives parsing. */
export function readPlatformCreationPolicy(settings: PlatformCreationSettings): PlatformCreationPolicy | null {
  const raw = settings.PLATFORM_CREATION_PINS;
  if (raw === undefined) return defaults;
  if (typeof raw !== "string" || raw.length > 8192 || utf8(raw).length > 8192) return null;
  try {
    const rows: unknown = parseStrict(raw);
    if (!Array.isArray(rows) || rows.length > 128 || new Set(rows).size !== rows.length
      || !rows.every((pin): pin is PlatformDefinition => isPlatformDefinition(pin) && platform(pin) !== null)) return null;
    return Object.freeze({ pins: Object.freeze([...new Set<PlatformDefinition>([...newest, ...rows])]) });
  } catch { return null; }
}
export function permitsNewPlatformScope(policy: PlatformCreationPolicy | null, pin: PlatformDefinition): boolean {
  return policy !== null && policy.pins.includes(pin);
}
/** Raw local engine adapters have no injected deployment policy. DeployedScope
 * always injects readPlatformCreationPolicy, even without DEPLOYMENT. */
export function injectedPlatformCreationPolicy(settings: PlatformCreationSettings & { DEPLOYMENT?: string }): PlatformCreationPolicy | null | undefined {
  return settings.DEPLOYMENT !== undefined || Object.hasOwn(settings, "PLATFORM_CREATION_PINS") ? readPlatformCreationPolicy(settings) : undefined;
}
