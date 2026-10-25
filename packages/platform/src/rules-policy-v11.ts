/** Q11-only policy decisions. No repository, clock, storage or native grants are read here.
 * Certificate/tree verification and global required-job provenance belong to the native consumer. */
import type { Digest, MemberRef } from "@generalbusiness/dap-contract";
import { isDigest, isMemberRef, isRecord, utf8, wellFormed } from "@generalbusiness/dap-bytes";
import { valueDigest } from "@generalbusiness/dap-derive";
import { firstExtents, isExtents, judgeExtents, RULES_EXTENT, RULES_PATTERNS } from "./extents.ts";
import type { Extent, ExtentsAsked, ExtentsJudged } from "./extents.ts";

export interface ExtentV11 extends Extent {
  allowZeroApprovals?: boolean;
  futurePatterns?: readonly string[];
}
export interface RulesCheckV11 { name: string; configuration: Digest; required: boolean; checker: MemberRef }
/** The complete publish proposal, excluding certificate, signature and transport fields. */
export interface RulesPolicyV11 {
  approvals: number;
  ownerMayReview: boolean;
  checks: readonly RulesCheckV11[];
  labels: readonly string[];
  extents: readonly ExtentV11[];
  allowZeroApprovals?: boolean;
  singleControllerException?: boolean;
}
export type RulesPolicyRefusalV11 = "invalid-policy" | "approval-opt-in-required" | "approver-not-review"
  | "rules-extent-required" | "catch-all-required" | "extent-check-unknown";
export type RulesPolicyReadV11 = { ok: true; policy: RulesPolicyV11 } | { ok: false; reason: RulesPolicyRefusalV11 };
export const RULES_POLICY_V11_DOMAIN = "artroom-rules-policy-1";
export type RulesPolicyProposalV11 = { ok: true; policy: RulesPolicyV11; digest: Digest }
  | { ok: false; reason: RulesPolicyRefusalV11 };

const REQUIRED = ["approvals", "ownerMayReview", "checks", "labels", "extents"];
const OPTIONAL = ["allowZeroApprovals", "singleControllerException"];
const EXTENT_REQUIRED = ["name", "patterns", "approvals", "approver", "checks", "class"];
const EXTENT_OPTIONAL = ["allowZeroApprovals", "futurePatterns"];
const has = (record: Record<string, unknown>, key: string): boolean => Object.hasOwn(record, key);
const members = (record: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean =>
  required.every(key => has(record, key)) && Object.keys(record).every(key => required.includes(key) || optional.includes(key));
/** Bound code units before encoding, so even refused input has a bounded allocation. */
const text = (value: unknown, max: number, min = 1): value is string =>
  typeof value === "string" && value.length >= min && value.length <= max && wellFormed(value) && utf8(value).length <= max;
const texts = (value: unknown, count: number, bytes: number, min = 1): value is string[] => {
  if (!Array.isArray(value) || value.length > count) return false;
  for (const entry of value) if (!text(entry, bytes, min)) return false;
  return true;
};
const distinct = (value: readonly string[]): boolean => new Set(value).size === value.length;
const approvals = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 64 && !Object.is(value, -0);
const boolOption = (record: Record<string, unknown>, key: string): boolean => !has(record, key) || typeof record[key] === "boolean";

/** Both establish and publish must carry an own boolean; absent is not false. */
export function rulesOwnerMayReviewV11(fields: unknown): boolean | null {
  return isRecord(fields) && has(fields, "ownerMayReview") && typeof fields["ownerMayReview"] === "boolean"
    ? fields["ownerMayReview"] : null;
}

/** Decode an exact policy into caller-owned records, retaining explicit false versus absence.
 * The caller first applies its canonical-envelope and native member-handle bounds. This reader bounds
 * policy lists and text fields; it does not certify pattern coverage, configure policy or verify standing. */
export function readRulesPolicyV11(value: unknown): RulesPolicyReadV11 {
  const no = (reason: RulesPolicyRefusalV11): RulesPolicyReadV11 => ({ ok: false, reason });
  if (!isRecord(value) || !members(value, REQUIRED, OPTIONAL) || !approvals(value["approvals"])
    || rulesOwnerMayReviewV11(value) === null || !boolOption(value, "allowZeroApprovals") || !boolOption(value, "singleControllerException")
    || !texts(value["labels"], 32, 64, 0) || !Array.isArray(value["checks"]) || value["checks"].length > 32
    || !Array.isArray(value["extents"]) || value["extents"].length < 1 || value["extents"].length > 8) return no("invalid-policy");
  const checks: RulesCheckV11[] = [];
  for (const check of value["checks"] as unknown[]) {
    if (!isRecord(check) || !members(check, ["name", "configuration", "required", "checker"])
      || !text(check["name"], 128, 0) || !isDigest(check["configuration"]) || typeof check["required"] !== "boolean" || !isMemberRef(check["checker"])) return no("invalid-policy");
    checks.push({ name: check["name"], configuration: check["configuration"], required: check["required"],
      checker: { membership: { ...check["checker"].membership }, member: check["checker"].member } });
  }
  if (!distinct(checks.map(check => check.name))) return no("invalid-policy");
  const extents: ExtentV11[] = [];
  for (const extent of value["extents"] as unknown[]) {
    if (!isRecord(extent) || !members(extent, EXTENT_REQUIRED, EXTENT_OPTIONAL) || !text(extent["name"], 64) || !approvals(extent["approvals"])
      || !texts(extent["patterns"], 32, 256) || !texts(extent["checks"], 32, 128) || !text(extent["approver"], 64)
      || !boolOption(extent, "allowZeroApprovals")
      || has(extent, "futurePatterns") && (!texts(extent["futurePatterns"], 32, 256) || !distinct(extent["futurePatterns"])
        || !extent["futurePatterns"].every(pattern => (extent["patterns"] as string[]).includes(pattern)))) return no("invalid-policy");
    // Reuse the historical structural grammar and matcher without admitting its permissive approvers.
    const base = Object.fromEntries(EXTENT_REQUIRED.map(key => [key, extent[key]]));
    if (!isExtents([base])) return no("invalid-policy");
    const parsed = base as unknown as Extent;
    extents.push({ ...parsed, patterns: [...parsed.patterns], checks: [...parsed.checks],
      ...(has(extent, "allowZeroApprovals") ? { allowZeroApprovals: extent["allowZeroApprovals"] as boolean } : {}),
      ...(has(extent, "futurePatterns") ? { futurePatterns: [...extent["futurePatterns"] as string[]] } : {}) });
  }
  if (!distinct(extents.map(extent => extent.name))) return no("invalid-policy");
  if (extents.some(extent => extent.approver !== "change.review")) return no("approver-not-review");
  const protectedExtent = extents.find(extent => extent.name === RULES_EXTENT);
  if (!protectedExtent || protectedExtent.approvals < 1 || protectedExtent.class !== "authority"
    || !RULES_PATTERNS.every(pattern => protectedExtent.patterns.includes(pattern))) return no("rules-extent-required");
  if (value["approvals"] === 0 && value["allowZeroApprovals"] !== true
    || extents.some(extent => extent.approvals === 0 && extent.allowZeroApprovals !== true)) return no("approval-opt-in-required");
  if (extents.filter(extent => extent.patterns.length === 0).length !== 1) return no("catch-all-required");
  const names = new Set(checks.map(check => check.name));
  if (extents.some(extent => extent.checks.some(name => !names.has(name)))) return no("extent-check-unknown");
  return { ok: true, policy: { approvals: value["approvals"], ownerMayReview: value["ownerMayReview"] as boolean,
    checks, labels: [...value["labels"]], extents,
    ...(has(value, "allowZeroApprovals") ? { allowZeroApprovals: value["allowZeroApprovals"] as boolean } : {}),
    ...(has(value, "singleControllerException") ? { singleControllerException: value["singleControllerException"] as boolean } : {}) } };
}

/** One complete accepted-policy projection for both certification and publish. Hash that owned
 * decoder result itself: no second field list can omit a check, label or explicit optional choice.
 * The returned policy is owned but mutable. Keep it unexposed during use. If it is mutated or
 * exposed across an await, revalidate and recompute the proposal before using its digest.
 * Native callers still owe canonical-envelope/member bounds and certificate/standing verification;
 * this digest grants no authority and does not configure policy or certify repository coverage. */
export function rulesPolicyProposalV11(value: unknown): RulesPolicyProposalV11 {
  const decoded = readRulesPolicyV11(value);
  return decoded.ok ? { ...decoded, digest: valueDigest(RULES_POLICY_V11_DOMAIN, decoded.policy) } : decoded;
}

/** Draft extents, not a configured policy. Never invent future-pattern permission. */
export function firstExtentsV11(rules: { approvals: number; checks: readonly { name: string; required: boolean }[]; allowZeroApprovals?: boolean }): readonly ExtentV11[] {
  return firstExtents(rules).map(extent => ({ ...extent, patterns: [...extent.patterns], checks: [...extent.checks], approver: "change.review",
    ...(extent.name !== RULES_EXTENT && rules.allowZeroApprovals === true ? { allowZeroApprovals: true } : {}) }));
}

/** Structural input for the separately authenticated tree verifier. Duplicates across extents remain occurrences. */
export function rulesPolicyPatternsV11(policy: RulesPolicyV11): readonly { pattern: string; future?: boolean }[] {
  return policy.extents.flatMap(extent => extent.patterns.map(pattern => ({ pattern,
    ...(extent.futurePatterns?.includes(pattern) ? { future: true } : {}) })));
}

export type RulesPolicyJudgmentV11 = { ok: true; judgment: ExtentsJudged } | { ok: false; reason: RulesPolicyRefusalV11 };
/** The caller supplies authenticated review/changed-set evidence. Global required jobs remain a separate G14 guard.
 * Reuse the old judgment: it already requires rules.publish in addition to the extent approver for rules,
 * forces owner independence there, and preserves the declared single-controller exception without waiving checks. */
export function judgeExtentsV11(value: unknown, asked: Omit<ExtentsAsked, "extents" | "ownerMayReview" | "singleControllerException">): RulesPolicyJudgmentV11 {
  const decoded = readRulesPolicyV11(value);
  if (!decoded.ok) return decoded;
  return { ok: true, judgment: judgeExtents({ ...asked, extents: decoded.policy.extents, ownerMayReview: decoded.policy.ownerMayReview,
    singleControllerException: decoded.policy.singleControllerException === true }) };
}
