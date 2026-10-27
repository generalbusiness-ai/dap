/** Q11 and Q12 Page presentation from one complete authenticated summary.
 * This is not a native observation, certificate verification or permission. */
import type { Digest, Item, ScopeId } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isFactRef, isRecord, same, utf8 } from "@generalbusiness/dap-bytes";
import { rulesPolicyProposalV11, type RulesPolicyV11 } from "@generalbusiness/dap-platform";

export const Q11_READ_ONLY = "Certified rules are read-only in this page. No user-facing publish command is available yet.";
export type RulesSummaryV11 = { configured: false; policy: null } | { configured: true; policy: RulesPolicyV11; proposal: Digest };
const fits = (value: unknown): boolean => { try { return utf8(canonicalize(value)).length <= 262144; } catch { return false; } };

export function rulesSummaryV11(item: Item, destination: ScopeId): RulesSummaryV11 | null {
  if (item.type !== "rules" || item.state !== "current") return null;
  const values = item.values;
  if (values["configured"] === false) return ["policy", "proposal", "certificate"].every(key => values[key] === undefined || values[key] === null)
    ? { configured: false, policy: null } : null;
  if (values["configured"] !== true) return null;
  const proposal = rulesPolicyProposalV11(values["policy"]);
  if (!proposal.ok || proposal.digest !== values["proposal"]) return null;
  const { policy } = proposal, certificate = values["certificate"];
  if (!isRecord(certificate) || Object.keys(certificate).length !== 4 || !["request", "certificate", "proof", "commit"].every(key => Object.hasOwn(certificate, key))
    || !isFactRef(certificate["request"]) || !isFactRef(certificate["certificate"]) || !isDigest(certificate["proof"])
    || typeof certificate["commit"] !== "string" || !/^(?!0{40}$)[0-9a-f]{40}$/.test(certificate["commit"])
    || certificate["request"].at.kind !== "destination" || certificate["request"].at.scope !== destination
    || !same(certificate["request"].at, certificate["certificate"].at) || certificate["request"].seq >= certificate["certificate"].seq) return null;
  if (["approvals", "ownerMayReview", "checks", "labels", "extents", "singleControllerException"]
    .some(key => !Object.hasOwn(values, key) || values[key] === undefined)) return null;
  if (!same(values["approvals"], policy.approvals) || !same(values["ownerMayReview"], policy.ownerMayReview)
    || !same(values["checks"], policy.checks) || !same(values["labels"], policy.labels) || !same(values["extents"], policy.extents)
    || values["singleControllerException"] !== (policy.singleControllerException === true)) return null;
  // Derive the exact full envelope for size/correspondence only. No named
  // observation or retained-value authentication is asserted by this view.
  if (!fits({ configured: true, policy, proposal: proposal.digest, certificate })) return null;
  return { configured: true, policy, proposal: proposal.digest };
}
