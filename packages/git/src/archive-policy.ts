/** Private v1 export admission. The A1 inventory/writer must call this before
 * selecting archive bodies. This module neither inventories nor exports. */
import { INVITATION_KEY_MEMBERSHIP } from "@generalbusiness/dap-contract";
import type { Digest } from "@generalbusiness/dap-contract";
import { isDigest } from "@generalbusiness/dap-bytes";

export type ArchiveExportRefusal = "unsupported-credential-cohort" | "unsupported-archive-cohort" | "unsupported-custom-domain" | "unsupported-foreign-copy";
export type ArchiveExportAdmission = { ok: true } | { ok: false; reason: ArchiveExportRefusal };
export interface ArchivePrivacyInventory { readonly customDomains: boolean; readonly foreignCopies: boolean }

/** Reviewed native producer data for the device/archive cohort only. These
 * pins admit export inventory, never credentials, authority or a root journal.
 * The caller derives the digest from its installed VERSION_DATA, not input. */
export const ARCHIVE_NATIVE_DATA: Readonly<Record<string, Digest>> = Object.freeze({
  "platform:directory@16": "sha256:c8c40477f369a19213439eaa1a3263dad1ce16038e5df605b6f7322737380b55",
  "platform:rules@10": "sha256:e10d8861dd5a80168437187a84d5bb3efe70d73825faa0c61ecc368da359a854",
  "platform:destination@12": "sha256:f29353b2ca1f551ab6a7d622bbd57aa6dfc7fc3748358ce709ccee728e4c15df",
});

/** Decision 74a99989. These are candidate public platform configuration
 * places, reviewed with 9a. A domain name alone is never export admission.
 * `data` binds the complete declaration, including the exact place/bound. */
export const ARCHIVE_NATIVE_VALUE_PLACES = Object.freeze([
  // rules-scope.ts: rulesScope.acts.keep-configuration.fields.digest.value.
  { pin: "platform:rules@10", data: ARCHIVE_NATIVE_DATA["platform:rules@10"]!, domain: "artroom-check-configuration-1", place: "acts.keep-configuration.fields.digest.value", max: 32 * 1024 },
  // device-application-rules.ts: deviceApplicationRulesScope overrides
  // install-application; application-install-v2.ts supplies these bounds.
  { pin: "platform:rules@10", data: ARCHIVE_NATIVE_DATA["platform:rules@10"]!, domain: "dap-application-release-2", place: "acts.install-application.fields.release.value", max: 4096 },
  { pin: "platform:rules@10", data: ARCHIVE_NATIVE_DATA["platform:rules@10"]!, domain: "dap-application-semantics-2", place: "acts.install-application.fields.semantic.value", max: 256 * 1024 },
  // destination.ts: destination.outcomes.judge.observes[0].retains[0].
  { pin: "platform:destination@12", data: ARCHIVE_NATIVE_DATA["platform:destination@12"]!, domain: "artroom-rules-extents-1", place: "outcomes.judge.observes.0.retains.0", max: 256 * 1024 },
  // destination.ts: judgeRule.rules.valueDomains; reservation.ts:
  // DESTINATION_CHANGED_SET. No other owner or outcome place is listed.
  { pin: "platform:destination@12", data: ARCHIVE_NATIVE_DATA["platform:destination@12"]!, domain: "artroom-changed-set-1", place: "owners.platform:destination@12.judge", max: 256 * 1024 },
] as const);

/** Mechanical value/selection vocabulary only. The whole-prefix inventory
 * must separately match pin, data, domain and place before selecting bytes. */
export const ARCHIVE_NATIVE_VALUE_DOMAINS: ReadonlySet<string> = new Set(ARCHIVE_NATIVE_VALUE_PLACES.map(row => row.domain));

/** One complete native exception row. The owning inventory separately
 * proves the installed declaration identity before calling this decision. */
export function admitArchiveNativeValuePlace(pin: string, data: Digest, domain: string, max: number, place: string): boolean {
  return ARCHIVE_NATIVE_VALUE_PLACES.some(row => row.pin === pin && row.data === data
    && row.domain === domain && row.max === max && row.place === place);
}

/** Certified digests are trusted reviewer configuration, never request input.
 * The future inventory must inspect the whole cohort; it cannot omit entries.
 * Passing this policy establishes no history integrity or replay completeness. */
/** Pin stage only. Success is not whole-cohort admission or permission to
 * read/export payloads; the complete privacy inventory is still required. */
export function admitArchivePin(definition: string, certified: Pick<ReadonlySet<Digest>, "has">, nativeData?: Digest): ArchiveExportAdmission {
  if (definition !== INVITATION_KEY_MEMBERSHIP) {
    if (definition.startsWith("platform:membership@")) return { ok: false, reason: "unsupported-credential-cohort" };
    if (Object.hasOwn(ARCHIVE_NATIVE_DATA, definition)) return nativeData === ARCHIVE_NATIVE_DATA[definition]
      ? { ok: true } : { ok: false, reason: "unsupported-archive-cohort" };
    if (!isDigest(definition) || !certified.has(definition)) return { ok: false, reason: "unsupported-archive-cohort" };
  }
  return { ok: true };
}

export function admitArchiveExport(definition: string, certified: ReadonlySet<Digest>, inventory: () => ArchivePrivacyInventory, nativeData?: Digest): ArchiveExportAdmission {
  const pin = admitArchivePin(definition, certified, nativeData);
  if (!pin.ok) return pin;
  const privacy = inventory();
  if (privacy.customDomains !== false) return { ok: false, reason: "unsupported-custom-domain" };
  if (privacy.foreignCopies !== false) return { ok: false, reason: "unsupported-foreign-copy" };
  return { ok: true };
}
