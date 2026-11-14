/** One internal Rules proof response. The archive caller reserves this full
 * ceiling before RPC, settles at actual UTF-8 bytes and pays parse/check work.
 * No HTTP route, session, provider call or archive permission comes from it. */
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrict, same, utf8 } from "@generalbusiness/dap-bytes";
import type { StateView } from "@generalbusiness/dap-derive";
import { APPLICATION_RELEASE_VALUE2, APPLICATION_SEMANTIC_VALUE2 } from "../../../platform/src/application-install-v2.ts";
import { applicationJson } from "../../../platform/src/application-codec/application.ts";
import { applicationArchiveProof, checkApplicationArchiveProof, type ApplicationArchiveProof } from "../../../platform/src/application-archive-reader.ts";
import type { Store } from "../store.ts";
import type { SqliteStore } from "../sqlite.ts";
import { archiveDeclarationValidationWork } from "../archive-inventory-cost.ts";
import { PREPARATION_BOUNDS } from "../preparation-budget.ts";

export type { ApplicationArchiveProof, ArchiveInstallation } from "../../../platform/src/application-archive-reader.ts";
/** The original semantic/release ceilings plus 4 KiB for the fixed set of
 * scope references, IDs, publisher and field names. No presentation bytes. */
export const APPLICATION_ARCHIVE_PROOF_BYTES = APPLICATION_SEMANTIC_VALUE2.max + APPLICATION_RELEASE_VALUE2.max + 4096;
/** Fixed item-record work: the response size cannot refund the sender's
 * Rules/installation metadata read. This changes no service/kernel cap. */
export const APPLICATION_ARCHIVE_PROOF_METADATA_WORK = PREPARATION_BOUNDS.metadata * 64;
/** Both the sender and receiver validate the complete signed proof. */
export const APPLICATION_ARCHIVE_PROOF_VALIDATION_WORK = 2 * archiveDeclarationValidationWork(1);
/** Debit METADATA_WORK separately so response settlement cannot refund it. */
export const APPLICATION_ARCHIVE_PROOF_WORK = APPLICATION_ARCHIVE_PROOF_METADATA_WORK + APPLICATION_ARCHIVE_PROOF_BYTES * APPLICATION_ARCHIVE_PROOF_VALIDATION_WORK;
type ArchiveProofStore = StateView & Pick<Store, "retainedSize" | "retained"> & Pick<SqliteStore, "itemBytes" | "itemPositions">;
export interface ApplicationArchiveProofExpected { readonly named: string; readonly rules: ScopeRef; readonly directory: ScopeRef; readonly item: number }

export function readApplicationArchiveProof(bytes: unknown, expected: ApplicationArchiveProofExpected): ApplicationArchiveProof | null {
  try {
    if (typeof bytes !== "string" || bytes.length > APPLICATION_ARCHIVE_PROOF_BYTES || utf8(bytes).length > APPLICATION_ARCHIVE_PROOF_BYTES) return null;
    const raw: unknown = parseStrict(bytes);
    if (applicationJson(raw, APPLICATION_ARCHIVE_PROOF_BYTES) !== bytes) return null;
    const proof = checkApplicationArchiveProof(raw, expected.named);
    return proof && same(proof.installation.rules, expected.rules) && same(proof.installation.directory, expected.directory)
      && proof.installation.item === expected.item ? proof : null;
  } catch { return null; }
}

/** Sender checks stored size before selecting a body. Both values and the
 * complete wire object are bounded before serialization or response copying. */
export function storedApplicationArchiveProof(state: ArchiveProofStore,
  named: string, directory: ScopeRef, item: number): string | null {
  try {
    if (!Number.isSafeInteger(item) || item < 0) return null;
    // Inspect only scalar SQL size metadata before applicationInstallation
    // can select or parse either complete item record (including attributed).
    const rules = state.itemPositions("rules", null, 2), jobBytes = state.itemBytes(item);
    if (rules.length !== 1 || !Number.isSafeInteger(rules[0]!.id) || rules[0]!.id < 0
      || !Number.isSafeInteger(rules[0]!.size) || rules[0]!.size < 1 || jobBytes === null
      || !Number.isSafeInteger(jobBytes) || jobBytes < 1
      || rules[0]!.size > PREPARATION_BOUNDS.metadata || jobBytes > PREPARATION_BOUNDS.metadata - rules[0]!.size) return null;
    const proof = applicationArchiveProof(state, named, directory, item, (domain, digest, most) => {
      const size = state.retainedSize("value", digest, domain);
      if (size === null || !Number.isSafeInteger(size) || size < 1 || size > most) return undefined;
      const held = state.retained("value", digest, domain);
      if (!held || held.bytes.length > size || utf8(held.bytes).length !== size) return undefined;
      const value: unknown = parseStrict(held.bytes);
      return canonicalize(value) === held.bytes ? value : undefined;
    });
    return proof ? applicationJson(proof, APPLICATION_ARCHIVE_PROOF_BYTES) : null;
  } catch { return null; }
}
