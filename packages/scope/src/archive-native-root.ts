/** Complete native root check on one fresh synchronous frame. */
import type { Bounds, PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { derivable, outcomeValueDomains, runnable, validateDefinition, type ValidDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { platform } from "@generalbusiness/dap-platform";
import type { ArchiveBudget } from "./archive-budget.ts";
import { archiveNativeDataReservation } from "./archive-inventory-cost.ts";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";

function checkNative(named: PlatformDefinition, bounds: Bounds, reviewed: ArchivePolicyRegistry, budget: ArchiveBudget) {
  const policy = reviewed.get(named);
  if (!policy || !policy.review || policy.review.length > 512 || policy.support.named !== named) return stop("unsupported-archive-cohort");
  budget.spend(archiveNativeDataReservation(bounds.definitionBytes));
  const supplied = platform(named);
  if (!supplied) return stop("unsupported-archive-cohort");
  const bytes = canonicalize(supplied.data);
  if (utf8(bytes).length > bounds.definitionBytes) return stop("limit");
  const outcomes = outcomeValueDomains(supplied.data, supplied.rules);
  const checked = validateDefinition(supplied.data, bounds, RULE_PROFILES, { platform: true, outcomeValues: outcomes });
  if (!checked.ok || canonicalize(policy.support.definition.declared) !== bytes) return stop("unsupported-archive-cohort");
  if (!runnable(checked.definition, supplied.rules) || !derivable(checked.definition, policy.support.capabilities)) return stop("unsupported-archive-cohort");
  return { definition: checked.definition, bytes, outcomes, policy, supplied };
}
/** Standalone root keeps its complete immediate operation and old price. */
export function validateArchiveNativeRoot(named: PlatformDefinition, bounds: Bounds, reviewed: ArchivePolicyRegistry, budget: ArchiveBudget): ValidDefinition {
  return checkNative(named, bounds, reviewed, budget).definition;
}
