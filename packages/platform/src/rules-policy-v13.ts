/** Q13 complete evidence policy. Historical Q11 bytes and decisions stay exact. */
import type { Digest, MemberRef } from "@generalbusiness/dap-contract";
import { canonicalize, isKeyId, isMemberRef, isRecord, same, utf8, wellFormed, type CheckSource, type CheckStage, type ServiceMark } from "@generalbusiness/dap-bytes";
import { valueDigest } from "@generalbusiness/dap-derive";
import { firstExtentsV11, judgeExtentsV11, readRulesPolicyV11, rulesPolicyPatternsV11 } from "./rules-policy-v11.ts";
import type { ExtentV11, RulesCheckV11, RulesPolicyRefusalV11, RulesPolicyV11 } from "./rules-policy-v11.ts";

export interface RulesCheckV13 extends RulesCheckV11 {
  source?: CheckSource;
  reuse?: boolean;
  stage?: CheckStage;
  audit?: { check: string; every: 1 };
  holds?: boolean;
}
export interface RulesPolicyV13 extends Omit<RulesPolicyV11, "checks"> {
  checks: readonly RulesCheckV13[];
  roomService: ServiceMark | null;
}
export type RulesPolicyRefusalV13 = RulesPolicyRefusalV11 | "audit-invalid" | "published-reuse" | "holds-stage";
export type RulesPolicyReadV13 = { ok: true; policy: RulesPolicyV13 } | { ok: false; reason: RulesPolicyRefusalV13 };
export type RulesPolicyProposalV13 = { ok: true; policy: RulesPolicyV13; digest: Digest } | { ok: false; reason: RulesPolicyRefusalV13 };
export const RULES_POLICY_V13_DOMAIN = "artroom-rules-policy-2";
export const RULES_POLICY_VALUE_V13 = { domain: RULES_POLICY_V13_DOMAIN, max: 262144 } as const;
export const RULES_EXTENTS_VALUE_V13 = { domain: "artroom-rules-extents-3", max: 262144 } as const;
export const RULES_CONTENT_BYTES_V13 = 49571;
export const checkSourceV13 = (check: Pick<RulesCheckV13, "source">): CheckSource => check.source ?? "member";
export const checkStageV13 = (check: Pick<RulesCheckV13, "stage">): CheckStage => check.stage ?? "landing";
export const checkReuseV13 = (check: Pick<RulesCheckV13, "reuse">): boolean => check.reuse === true;
export const checkHoldsV13 = (check: Pick<RulesCheckV13, "holds">): boolean => check.holds === true;
const own = (value: Record<string, unknown>, key: string) => Object.hasOwn(value, key);
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every(key => own(value, key));
const copyMember = (member: MemberRef): MemberRef => ({ membership: { ...member.membership }, member: member.member });
function dataOnly(value: unknown, depth = 0, budget = { nodes: 0, bytes: 0 }, seen = new Set<object>()): boolean {
  if (++budget.nodes > 20000 || depth > 24) return false;
  if (typeof value === "string") { budget.bytes += value.length; return budget.bytes <= 262144; }
  if (value === null || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) return true;
  if (typeof value !== "object" || seen.has(value)) return false;
  if (Array.isArray(value) ? Object.getPrototypeOf(value) !== Array.prototype
    : ![Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null)) return false;
  seen.add(value);
  const names = Reflect.ownKeys(value);
  if (names.length > 4096) return false;
  if (Array.isArray(value) && (names.length !== value.length + 1 || names.some(name => name !== "length"
    && (typeof name !== "string" || !/^(0|[1-9][0-9]*)$/.test(name) || Number(name) >= value.length)))) return false;
  for (const name of names) {
    if (typeof name !== "string") return false;
    if (Array.isArray(value) && name === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, name)!;
    if (!descriptor.enumerable || !("value" in descriptor) || !dataOnly(descriptor.value, depth + 1, budget, seen)) return false;
  }
  seen.delete(value);
  return true;
}

export function readServiceMarkV13(value: unknown): { ok: true; mark: ServiceMark | null } | { ok: false } {
  if (!dataOnly(value)) return { ok: false };
  if (value === null) return { ok: true, mark: null };
  if (!isRecord(value) || !exact(value, ["checker", "key"]) || !isRecord(value["checker"])
    || typeof value["checker"]["member"] !== "string" || value["checker"]["member"].length > 256
    || !isMemberRef(value["checker"]) || value["checker"].membership.kind !== "membership" || !isKeyId(value["key"])) return { ok: false };
  return { ok: true, mark: { checker: copyMember(value["checker"]), key: value["key"] } };
}

/** Preserve explicit choices in the owned policy; defaults are semantic only. */
export function readRulesPolicyV13(value: unknown): RulesPolicyReadV13 {
  const no = (reason: RulesPolicyRefusalV13): RulesPolicyReadV13 => ({ ok: false, reason });
  if (!dataOnly(value) || !isRecord(value) || !own(value, "roomService") || !Array.isArray(value["checks"]) || value["checks"].length > 32) return no("invalid-policy");
  const mark = readServiceMarkV13(value["roomService"]);
  if (!mark.ok) return no("invalid-policy");
  const checks: RulesCheckV13[] = [], base: Record<string, unknown>[] = [];
  for (const row of value["checks"]) {
    if (!isRecord(row) || Object.keys(row).some(key => !["name", "configuration", "required", "checker", "source", "reuse", "stage", "audit", "holds"].includes(key))
      || own(row, "source") && (typeof row["source"] !== "string" || !["member", "room"].includes(row["source"]))
      || own(row, "stage") && (typeof row["stage"] !== "string" || !["work", "landing", "published"].includes(row["stage"]))
      || ["reuse", "holds"].some(key => own(row, key) && typeof row[key] !== "boolean")) return no("invalid-policy");
    const ordinary = Object.fromEntries(["name", "configuration", "required", "checker"].filter(key => own(row, key)).map(key => [key, row[key]]));
    base.push(ordinary);
    const extra: Partial<RulesCheckV13> = {};
    for (const key of ["source", "reuse", "stage", "holds"] as const) if (own(row, key)) Object.assign(extra, { [key]: row[key] });
    if (own(row, "audit")) {
      const audit = row["audit"];
      if (!isRecord(audit) || !exact(audit, ["check", "every"]) || audit["every"] !== 1 || typeof audit["check"] !== "string"
        || audit["check"].length > 128 || !wellFormed(audit["check"]) || utf8(audit["check"]).length > 128) return no("audit-invalid");
      extra.audit = { check: audit["check"], every: 1 };
    }
    checks.push(extra as RulesCheckV13);
  }
  const legacy = readRulesPolicyV11(Object.fromEntries(Object.entries(value).filter(([key]) => key !== "roomService").map(([key, field]) => [key, key === "checks" ? base : field])));
  if (!legacy.ok) return legacy;
  const complete = checks.map((extra, index) => ({ ...legacy.policy.checks[index]!, ...extra }));
  for (const check of complete) {
    if (checkStageV13(check) === "published" && checkReuseV13(check)) return no("published-reuse");
    if (checkStageV13(check) !== "published" && checkHoldsV13(check)) return no("holds-stage");
    if (check.audit) {
      const target = complete.find(candidate => candidate.name === check.audit!.check);
      if (checkSourceV13(check) !== "member" || checkStageV13(check) !== "landing" || !target || target === check
        || checkSourceV13(target) !== "room" || checkStageV13(target) !== "landing" || target.configuration !== check.configuration || checkReuseV13(target)) return no("audit-invalid");
    }
  }
  const policy: RulesPolicyV13 = { ...legacy.policy, checks: complete, roomService: mark.mark };
  if (utf8(canonicalize(policy)).length > RULES_POLICY_VALUE_V13.max) return no("invalid-policy");
  return { ok: true, policy };
}
export function rulesPolicyProposalV13(value: unknown): RulesPolicyProposalV13 {
  const read = readRulesPolicyV13(value);
  return read.ok ? { ...read, digest: valueDigest(RULES_POLICY_V13_DOMAIN, read.policy) } : read;
}
export const rulesPolicyPatternsV13 = (policy: RulesPolicyV13) => rulesPolicyPatternsV11(policy);
export const firstExtentsV13 = firstExtentsV11;
export function judgeExtentsV13(value: unknown, asked: Parameters<typeof judgeExtentsV11>[1]) {
  const read = readRulesPolicyV13(value);
  if (!read.ok) return read;
  const { roomService: _mark, ...policy } = read.policy;
  const landing = policy.checks.filter(check => checkStageV13(check) === "landing"), names = new Set(landing.map(check => check.name));
  return judgeExtentsV11({ ...policy, checks: landing.map(({ name, configuration, required, checker }) => ({ name, configuration, required, checker })),
    extents: policy.extents.map(extent => ({ ...extent, checks: extent.checks.filter(name => names.has(name)) })) }, asked);
}
/** Exact distinct transport members, including a service with no named check. */
export function rulesPolicyCheckersV13(policy: RulesPolicyV13): readonly MemberRef[] {
  const members = [...policy.checks.map(check => check.checker), ...(policy.roomService ? [policy.roomService.checker] : [])];
  return members.filter((member, index) => members.findIndex(other => same(member, other)) === index).map(copyMember);
}
export type { ExtentV11 };
