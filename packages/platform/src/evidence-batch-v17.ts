/** Pure closed records for independently opened G17 funding accounts.
 * These functions prove descriptor/slot correspondence, never Native
 * authority, publication state, or five-dimensional capacity. */
import type { FactRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isFactRef, isHead, isRecord, isScopeRef, parseStrict, same, utf8 } from "@generalbusiness/dap-bytes";
import { byteOrder } from "@generalbusiness/dap-derive";
import { isObjectId } from "./reservation.ts";
import { requiredChecksV17, type ReservationPolicyViewV17 } from "./reservation-v17.ts";
import { checkStageV13, rulesPolicyProposalV13, type RulesCheckV13 } from "./rules-policy-v13.ts";
import { evidenceWireV17, readEvidenceWireV17 } from "./evidence-wire-v17.ts";

export const EVIDENCE_BATCH_JOBS_V17 = 8;
export const EVIDENCE_BATCH_ACCOUNTS_V17 = 4;
export interface EvidenceBatchRecordV17 {
  v: 1; publication: FactRef; operation: FactRef; capture: FactRef;
  ordinal: number; total: number; touched: readonly string[];
  checks: readonly RulesCheckV13[]; policy: ReservationPolicyViewV17;
  jobs: readonly { job: FactRef; name: string }[]; planAt: number | null;
}
/** Code slots persist canonical JSON text; the semantic reader below keeps
 * its object-only API for Native logic and owned intermediate values. */
export function readEvidenceBatchWireV17(value: unknown): EvidenceBatchRecordV17 | null {
  const read = readEvidenceWireV17(value, 196608);
  return read.ok ? readEvidenceBatchV17(read.value) : null;
}
export function evidenceBatchWireV17(value: EvidenceBatchRecordV17): string {
  const record = readEvidenceBatchV17(value);
  if (!record) throw Error("Invalid evidence batch record");
  return evidenceWireV17(record, 196608);
}
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null) && Reflect.ownKeys(value).length === keys.length
  && keys.every(key => { const field = Object.getOwnPropertyDescriptor(value, key); return !!field?.enumerable && Object.hasOwn(field, "value"); });
const natural = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const list = (value: unknown, max: number): value is unknown[] => Array.isArray(value) && value.length <= max
  && Reflect.ownKeys(value).length === value.length + 1 && Array.from({ length: value.length }, (_, n) => Object.getOwnPropertyDescriptor(value, String(n)))
    .every(field => !!field?.enumerable && Object.hasOwn(field, "value"));
const owned = <T>(value: T): T => parseStrict(canonicalize(value)) as T;
const sameJob = (a: FactRef, b: FactRef) => a.seq === b.seq && same(a.at, b.at);
function dataOnly(value: unknown, depth = 0, budget = { nodes: 0, text: 0 }, seen = new Set<object>()): boolean {
  if (++budget.nodes > 50000 || depth > 32) return false;
  if (typeof value === "string") { budget.text += value.length; return budget.text <= 196608; }
  if (value === null || typeof value === "boolean" || natural(value)) return true;
  if (typeof value !== "object" || seen.has(value)) return false;
  const array = Array.isArray(value), names = Reflect.ownKeys(value);
  if (array ? Object.getPrototypeOf(value) !== Array.prototype : ![Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null)) return false;
  if (names.length > 4096 || array && (names.length !== value.length + 1 || names.some(name => name !== "length"
    && (typeof name !== "string" || !/^(0|[1-9][0-9]*)$/.test(name) || Number(name) >= value.length)))) return false;
  seen.add(value);
  for (const name of names) {
    if (array && name === "length") continue;
    if (typeof name !== "string") return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, name)!;
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value") || !dataOnly(descriptor.value, depth + 1, budget, seen)) return false;
  }
  seen.delete(value);
  return true;
}

/** Global required checks and touched extent checks select publication
 * obligations. Work descriptors stay in the full policy but are not jobs
 * for this publication. Every selected audit target is included once. */
export function obligationChecksV17(value: unknown, touched: readonly string[]): { ok: true; checks: readonly RulesCheckV13[] } | { ok: false } {
  try {
    const read = rulesPolicyProposalV13(value);
    if (!read.ok || !list(touched, 8) || touched.some(name => typeof name !== "string") || new Set(touched).size !== touched.length) return { ok: false };
    const required = requiredChecksV17(read.policy, touched);
    if (!required.ok) return { ok: false };
    const named = new Set([...read.policy.checks.filter(check => check.required).map(check => check.name),
      ...read.policy.extents.filter(extent => touched.includes(extent.name)).flatMap(extent => extent.checks)]);
    const selected = new Set([...required.checks.map(check => check.name),
      ...read.policy.checks.filter(check => checkStageV13(check) === "published" && named.has(check.name)).map(check => check.name)]);
    for (const check of read.policy.checks) if (selected.has(check.name) && check.audit) selected.add(check.audit.check);
    const checks = read.policy.checks.filter(check => selected.has(check.name)).sort((a, b) => byteOrder(a.name, b.name));
    return checks.length <= 32 ? { ok: true, checks: owned(checks) } : { ok: false };
  } catch { return { ok: false }; }
}

/** Metadata correspondence only. Native readers authenticate the actual
 * Q13 observation/certificate and publication capture independently. */
function readView(value: unknown): ReservationPolicyViewV17 | null {
  if (!exact(value, ["rules", "head", "revision", "proposal", "certificate", "policy", "serviceGeneration"])
    || !isScopeRef(value["rules"]) || value["rules"].kind !== "rules" || !isHead(value["head"])
    || !natural(value["revision"]) || value["revision"] > value["head"].seq || !isDigest(value["proposal"])
    || !exact(value["certificate"], ["request", "certificate", "proof", "commit"])
    || !isFactRef(value["certificate"]["request"]) || !isFactRef(value["certificate"]["certificate"])
    || !isDigest(value["certificate"]["proof"]) || !isObjectId(value["certificate"]["commit"])
    || !exact(value["serviceGeneration"], ["rules", "seq"]) || !same(value["serviceGeneration"]["rules"], value["rules"])
    || !natural(value["serviceGeneration"]["seq"]) || value["serviceGeneration"]["seq"] > value["revision"]) return null;
  const proposal = rulesPolicyProposalV13(value["policy"]);
  return proposal.ok && proposal.digest === value["proposal"] && same(proposal.policy, value["policy"])
    ? owned(value as unknown as ReservationPolicyViewV17) : null;
}

export function readEvidenceBatchV17(value: unknown): EvidenceBatchRecordV17 | null {
  try {
    if (!dataOnly(value) || !exact(value, ["v", "publication", "operation", "capture", "ordinal", "total", "touched", "checks", "policy", "jobs", "planAt"])
      || value["v"] !== 1 || !isFactRef(value["publication"]) || value["publication"].at.kind !== "destination"
      || !isFactRef(value["operation"]) || value["operation"].at.kind !== "lane" || !isFactRef(value["capture"])
      || !same(value["capture"].at, value["publication"].at) || value["capture"].seq < value["publication"].seq
      || !natural(value["ordinal"]) || !natural(value["total"]) || value["total"] < 1 || value["total"] > EVIDENCE_BATCH_ACCOUNTS_V17
      || value["ordinal"] >= value["total"] || !list(value["touched"], 8) || value["touched"].some(name => typeof name !== "string")
      || !list(value["checks"], EVIDENCE_BATCH_JOBS_V17) || !list(value["jobs"], EVIDENCE_BATCH_JOBS_V17)
      || !(value["planAt"] === null || natural(value["planAt"]) && value["planAt"] >= value["capture"].seq)) return null;
    const policy = readView(value["policy"]);
    if (!policy) return null;
    const obligations = obligationChecksV17(policy.policy, value["touched"] as string[]);
    if (!obligations.ok || obligations.checks.length === 0 || value["total"] !== Math.ceil(obligations.checks.length / EVIDENCE_BATCH_JOBS_V17)
      || !same(value["checks"], obligations.checks.slice(value["ordinal"] * EVIDENCE_BATCH_JOBS_V17, (value["ordinal"] + 1) * EVIDENCE_BATCH_JOBS_V17))) return null;
    const checks = value["checks"] as unknown as RulesCheckV13[], jobs: { job: FactRef; name: string }[] = [];
    for (const row of value["jobs"]) {
      if (!exact(row, ["job", "name"]) || !isFactRef(row["job"]) || !same(row["job"].at, value["operation"].at)
        || typeof row["name"] !== "string" || !checks.some(check => check.name === row["name"])) return null;
      const job = row["job"], name = row["name"];
      if (jobs.some(previous => sameJob(previous.job, job))) return null;
      jobs.push({ job, name });
    }
    if (checks.filter(check => !jobs.some(row => row.name === check.name)).length > EVIDENCE_BATCH_JOBS_V17 - jobs.length) return null;
    const record = owned({ ...value, policy, jobs } as unknown as EvidenceBatchRecordV17);
    return utf8(canonicalize(record)).length <= 196608 ? record : null;
  } catch { return null; }
}

export function claimEvidenceBatchJobV17(value: EvidenceBatchRecordV17, job: FactRef, name: string): { ok: true; record: EvidenceBatchRecordV17 } | { ok: false; reason: "batch-invalid" | "batch-full" } {
  const record = readEvidenceBatchV17(value);
  if (!record || !isFactRef(job) || !same(job.at, record.operation.at) || !record.checks.some(check => check.name === name)) return { ok: false, reason: "batch-invalid" };
  const prior = record.jobs.find(row => sameJob(row.job, job));
  if (prior) return same(prior.job, job) && prior.name === name ? { ok: true, record } : { ok: false, reason: "batch-invalid" };
  const jobs = [...record.jobs, { job, name }];
  if (jobs.length > EVIDENCE_BATCH_JOBS_V17 || record.checks.filter(check => !jobs.some(row => row.name === check.name)).length > EVIDENCE_BATCH_JOBS_V17 - jobs.length) return { ok: false, reason: "batch-full" };
  return { ok: true, record: { ...record, jobs: owned(jobs) } };
}

export function selectEvidenceBatchV17(values: readonly EvidenceBatchRecordV17[], job: FactRef, name?: string): { ok: true; record: EvidenceBatchRecordV17 } | { ok: false; reason: "batch-invalid" | "batch-full" } {
  if (!list(values, EVIDENCE_BATCH_ACCOUNTS_V17) || !values.length || !isFactRef(job)) return { ok: false, reason: "batch-invalid" };
  const records = values.map(readEvidenceBatchV17);
  if (records.some(record => record === null)) return { ok: false, reason: "batch-invalid" };
  const rows = (records as EvidenceBatchRecordV17[]).sort((a, b) => a.ordinal - b.ordinal), first = rows[0]!;
  if (rows.length > first.total || rows.some((row, ordinal) => row.ordinal !== ordinal || row.total !== first.total
    || !same(row.publication, first.publication) || !same(row.operation, first.operation) || !same(row.capture, first.capture)
    || !same(row.policy, first.policy) || !same(row.touched, first.touched))) return { ok: false, reason: "batch-invalid" };
  const allJobs = rows.flatMap(row => row.jobs);
  if (allJobs.some((row, index) => allJobs.slice(0, index).some(other => sameJob(other.job, row.job)))) return { ok: false, reason: "batch-invalid" };
  const existing = rows.find(row => row.jobs.some(held => sameJob(held.job, job)));
  if (existing) {
    const held = existing.jobs.find(row => sameJob(row.job, job))!;
    return same(held.job, job) && (name === undefined || name === held.name) ? { ok: true, record: existing } : { ok: false, reason: "batch-invalid" };
  }
  if (name === undefined) return { ok: false, reason: "batch-invalid" };
  const selected = rows.find(row => row.checks.some(check => check.name === name));
  if (!selected) return { ok: false, reason: "batch-invalid" };
  const claimed = claimEvidenceBatchJobV17(selected, job, name);
  return claimed.ok ? { ok: true, record: selected } : claimed;
}
