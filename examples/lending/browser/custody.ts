/** Lending identity and its allowed acts. `Custody` in the shared client
 * keeps each request before it is sent, and settles it after a lost reply
 * with a read. App storage, locks, trusted ports and identity admission remain
 * local to Lending. */
import type { Digest, KeyId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import type { BrowserRequestTarget } from "@generalbusiness/dap-client";
export type { BrowserCustodyLock as CustodyLock } from "@generalbusiness/dap-client";

/** Who acts, where: service, deployment, exact definition and membership pins,
 * signing member and device. The shared request protocol does not admit these. */
export interface LendingIdentity {
  readonly origin: string; readonly deployment: string; readonly scope: ScopeRef; readonly definition: Digest;
  readonly membership: ScopeRef; readonly member: MemberRef; readonly publicKey: KeyId;
}
export const LENDING_ACTS = ["donate", "borrow", "return", "cancel", "publish"] as const;
/** The custody target of this identity's lending requests: the lending scope, signed by this device as a member. */
export const lendingTarget = (identity: LendingIdentity): BrowserRequestTarget => ({ service: identity.origin, membership: identity.membership, signer: identity.publicKey, target: identity.scope });
