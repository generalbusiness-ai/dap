/** Lending identity and its allowed acts. The shared client owns the
 * unchanged keep-before-send/recover/Continue protocol. App storage, locks,
 * trusted ports and identity admission remain local to Lending. */
import type { Digest, KeyId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import type { RequestBinding } from "@generalbusiness/dap-client";
export { advanceKeptRequest as advance, validKeptRequest as validKept, keptEnvelopeKey as envelopeKey, KEPT_REQUEST_BYTES as KEPT_BYTES } from "@generalbusiness/dap-client";
export type { RequestBinding as Binding, KeptRequestPhase as Phase, KeptEnvelope as Envelope, KeptRequest as Kept,
  KeptRequestStore as KeptStore, RequestCustodyLock as CustodyLock, KeptRequestSettled as Settled, KeptRequestPorts as Ports } from "@generalbusiness/dap-client";

/** Who acts, where: service, deployment, exact definition and membership pins,
 * signing member and device. The shared request protocol does not admit these. */
export interface LendingIdentity {
  readonly origin: string; readonly deployment: string; readonly scope: ScopeRef; readonly definition: Digest;
  readonly membership: ScopeRef; readonly member: MemberRef; readonly publicKey: KeyId;
}
export const LENDING_ACTS = ["donate", "borrow", "return", "cancel", "publish"] as const;
export const lendingBinding = (identity: LendingIdentity): RequestBinding => ({ scope: identity.scope, publicKey: identity.publicKey, kinds: LENDING_ACTS });
