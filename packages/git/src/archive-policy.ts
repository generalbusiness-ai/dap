/** Private v1 export admission. The A1 inventory/writer must call this before
 * selecting archive bodies. This module neither inventories nor exports. */
import { INVITATION_KEY_MEMBERSHIP } from "@generalbusiness/dap-contract";
import type { Digest } from "@generalbusiness/dap-contract";
import { isDigest } from "@generalbusiness/artroom-bytes";

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
