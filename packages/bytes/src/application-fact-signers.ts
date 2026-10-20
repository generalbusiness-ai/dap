/** Recorded signer metadata from the native owner of an exact local fact.
 * Scope/head/hash binding is checked; this is not entry-body verification,
 * current-key inference or permission to look up a foreign fact. */
import type { Digest, Head, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isHead, isMemberRef, isRecord, parseStrict } from "./index.ts";
import { applicationJson } from "./application-json.ts";
import { APPLICATION_PROJECTION_LIMITS as B, ApplicationProjectionError } from "./application-projection-types.ts";
import type { ApplicationProjectionFactRef } from "./application-fact-times.ts";

export interface ApplicationFactSignerRead {
  readonly scope: ScopeRef;
  readonly at: Head;
  readonly entries: readonly { readonly seq: number; readonly hash: Digest | null; readonly signer: MemberRef | null }[];
}
const unavailableFactSigner = (): never => { throw new ApplicationProjectionError("unavailable"); };
export function readApplicationFactSigners(value: unknown, scope: ScopeRef, at: Head, refs: readonly ApplicationProjectionFactRef[]): ReadonlyMap<number, MemberRef | null> {
  const owned: unknown = parseStrict(applicationJson(value, B.metadataBytes));
  if (!isRecord(owned) || Object.keys(owned).sort().join() !== "at,entries,scope" || !isHead(owned["at"])
    || canonicalize(owned["scope"]) !== canonicalize(scope) || canonicalize(owned["at"]) !== canonicalize(at)
    || !Array.isArray(owned["entries"]) || owned["entries"].length !== refs.length) return unavailableFactSigner();
  const signers = new Map<number, MemberRef | null>();
  for (let i = 0; i < refs.length; i++) {
    const entry: unknown = owned["entries"][i], ref = refs[i]!;
    if (!isRecord(entry) || Object.keys(entry).sort().join() !== "hash,seq,signer" || entry["seq"] !== ref.seq
      || entry["hash"] !== null && !isDigest(entry["hash"])
      || entry["signer"] !== null && (!isMemberRef(entry["signer"]) || entry["hash"] === null)) return unavailableFactSigner();
    // Retention, a missing append-time index, or an incorrect fact hash
    // makes this field unavailable without hiding the other item fields.
    signers.set(ref.seq, entry["hash"] === null || ref.hash !== null && entry["hash"] !== ref.hash ? null : entry["signer"] as MemberRef | null);
  }
  return signers;
}
