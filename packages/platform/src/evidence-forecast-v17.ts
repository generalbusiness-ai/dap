/** Synthetic maximum future entries only. No forecast fact is recorded or
 * treated as authority. Kernel holder closure owns used-plus-reserved Amount. */
import type { Effect, FactRef, FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize, isFactRef, isRecord, parseStrict, same, utf8 } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest } from "./evidence.ts";
import { observationBytes, operationOpening, type Opening, type RuleEffect, type RuleGiven, type RuleRequest } from "@generalbusiness/dap-derive";
import type { EvidenceJobRecordV17 } from "./destination-evidence-v17.ts";
import { evidenceKeyDigestV17, readEvidenceIndexV17, type EvidenceCandidateV17 } from "./evidence-index-v17.ts";
import type { EvidenceFailureV17, EvidenceHoldRecordV17 } from "./evidence-holds-v17.ts";
import { checkStageV13, readRulesPolicyV13 } from "./rules-policy-v13.ts";
import { evidenceWireV17, readEvidenceWireV17 } from "./evidence-wire-v17.ts";

const MAX = Number.MAX_SAFE_INTEGER;
const HASH = `sha256:${"f".repeat(64)}` as const;
const TIME = "9999-12-31T23:59:59.999Z" as const;
const KEY = `key_${"A".repeat(43)}` as const;
const REASON = "x".repeat(32); // maximum fixed Native summary width
const RELEASE_REASON = "\u0000".repeat(1024);
const bytes = (value: unknown) => utf8(canonicalize(value)).length;
const copy = <T>(value: T): T => parseStrict(canonicalize(value)) as T;
type Row = { item: number; record: EvidenceJobRecordV17 };
type VariantQuote = { name: string; entryBytes: number; effects: number; requests: number };
type Forecast = { admitted: boolean; entryBytes: number; effects: number; variants: readonly VariantQuote[] };
const refused = (): Forecast => ({ admitted: false, entryBytes: 0, effects: 0, variants: [] });
const full = (fact: FactRef): FactRef => ({ at: fact.at, seq: MAX, hash: HASH });
const valueEffect = (item: number, slot: string, value: FieldValue | null): RuleEffect => ({ effect: "value", item, slot, value });
const codeEffect = (item: number, slot: string, value: unknown, max: number): RuleEffect => valueEffect(item, slot, evidenceWireV17(value, max));
const larger = <T>(left: T | null, right: T): T => left !== null && bytes(left) > bytes(right) ? left : right;
const opening = (k: number, open: Opening): Extract<Effect, { effect: "operation" | "attempt" }>[] =>
  operationOpening(k, open).map(effect => {
    if (effect.effect !== "operation" && effect.effect !== "attempt") throw Error("An operation opening has an unsupported forecast effect");
    return effect;
  });

function failure(record: EvidenceJobRecordV17): EvidenceFailureV17 {
  if (record.binding.subject.kind !== "published" || record.commit === null) throw Error("No published forecast subject");
  const publication = full(record.binding.subject.publication);
  return { job: record.job, publication, commit: record.commit, order: { publication: MAX, job: MAX },
    decidedAt: MAX, kind: "error", reason: REASON, result: full(record.job) };
}
function futureHold(held: EvidenceHoldRecordV17, cause: EvidenceFailureV17): EvidenceHoldRecordV17 {
  const release = { kind: "transition" as const, decidedAt: MAX, through: { publication: MAX, job: MAX }, reason: RELEASE_REASON,
    next: { rules: held.key.generation.rules, seq: MAX } };
  return { key: held.key, failure: larger(held.failure, cause), release: larger(held.release, release) };
}
function completeRecord(record: EvidenceJobRecordV17, current: EvidenceJobRecordV17, pending: (job: FactRef) => EvidenceJobRecordV17 | null): EvidenceJobRecordV17 {
  const next = copy(record);
  if (bytes(next) > 196608 || next.holds.length > 8) throw Error("The actual forecast record is over bound");
  next.result = full(record.job); next.signer = KEY; next.decidedAt = MAX; next.noticeAt = MAX;
  next.reason = larger(next.reason, REASON); next.state = "admitted";
  next.admittedAt = MAX; next.countedJob = full(record.job);
  next.observedGeneration = { rules: record.binding.policyGeneration.rules, seq: MAX };
  if (next.reuse !== null) {
    const bucket = readEvidenceIndexV17(next.reuse);
    if (!bucket) throw Error("The actual candidate record is malformed");
    const candidates: EvidenceCandidateV17[] = bucket.candidates.map(candidate => ({ ...candidate,
      admission: MAX, result: full(candidate.job), decidedBy: MAX, outcome: "failed" }));
    for (const job of bucket.pending) {
      const admitted = same(job, current.job) ? current : pending(job);
      if (!admitted || !same(admitted.job, job)) throw Error("A pending candidate has no frozen binding");
      candidates.push({ job, keyDigest: evidenceKeyDigestV17(bucket.key), admission: MAX, result: full(job), decidedBy: MAX,
        key: KEY, checker: admitted.binding.checker, binding: admitted.binding, outcome: "failed" });
    }
    if (candidates.length > 8) throw Error("The complete candidate count is over bound");
    next.reuse = { ...bucket, pending: [], candidates, conflict: candidates.length >= 2
      ? { passed: full(candidates[0]!.job), failed: full(candidates[1]!.job) } : bucket.conflict };
    if (bytes(next.reuse) > 32768) throw Error("The complete candidate record is over bound");
  }
  if (next.holds.length) {
    const cause = failure(current);
    next.holds = next.holds.map(held => futureHold(held, cause));
  }
  if (next.incident !== null) {
    next.incident = { ...next.incident, cause: larger(next.incident.cause, failure(current)), state: "ready", creation: null, child: null,
      reason: larger(next.incident.reason, REASON) };
  }
  if (bytes(next) > 196608) throw Error("The complete future code record is over bound");
  return next;
}

function service(record: EvidenceJobRecordV17, memberBytes: number): unknown {
  return { mark: { checker: { membership: record.binding.checker.membership, member: `@${"\u0000".repeat(memberBytes - 1)}` }, key: KEY },
    generation: { rules: record.binding.policyGeneration.rules, seq: MAX } };
}
function decision(record: EvidenceJobRecordV17): RuleRequest {
  return { to: record.job.at, message: { class: "request", type: "tell", body: { message: "check-decision", fields: {
    job: record.job, decision: { self: true }, reason: REASON, status: "decided", result: full(record.job), countedJob: full(record.job),
    frozenGeneration: canonicalize(record.binding.serviceGeneration), observedGeneration: canonicalize(record.observedGeneration),
    commit: record.commit, tree: record.tree, base: record.base,
  } } } };
}
function incident(record: EvidenceJobRecordV17, memberBytes: number): RuleRequest {
  if (record.binding.subject.kind !== "published") throw Error("No published incident subject");
  const subject = record.binding.subject;
  const triagers = Array.from({ length: 32 }, (_, n) => ({ membership: record.binding.checker.membership,
    member: `@${String(n).padStart(2, "0")}${"\u0000".repeat(memberBytes - 3)}` }));
  return { to: record.job.at, message: { class: "request", type: "tell", body: { message: "published-check-failure", fields: {
    job: record.job, publication: subject.publication, manifest: subject.manifest, result: full(record.job), decision: { self: true },
    cause: canonicalize(record.incident?.cause ?? failure(record)), triagers, policyGeneration: canonicalize(record.binding.policyGeneration),
  } } } };
}
function audit(given: RuleGiven, record: EvidenceJobRecordV17): RuleRequest | null {
  if (record.binding.subject.kind !== "landing" || record.binding.source !== "member" || record.binding.auditOf !== null || !record.policy) return null;
  const parent = record.policy.policy.checks.find(check => check.name === record.name), target = parent?.audit && record.policy.policy.checks.find(check => check.name === parent.audit!.check);
  if (!target) return null;
  const operation = given.state.item(record.binding.subject.publication.seq)?.refs["operation"];
  if (!isFactRef(operation)) throw Error("The audit forecast has no actual publication operation");
  const binding = { ...record.binding, checker: target.checker, source: "room" as const, auditOf: record.countedJob ?? record.job };
  return { to: record.job.at, message: { class: "request", type: "tell", body: { message: "admit-audit-check", fields: {
    operation, manifest: record.binding.subject.manifest, name: target.name, configuration: target.configuration,
    tree: record.tree, commit: record.commit, base: record.base, checker: target.checker, auditOf: binding.auditOf, forJob: record.job,
    binding: canonicalize(binding), bindingDigest: evidenceBindingDigest(binding),
  } } } };
}
/** One proof row per actual configured descriptor, never copies of a whole
 * code record. Existing rows are retained if a policy has since changed. */
function publicationPasses(given: RuleGiven, record: EvidenceJobRecordV17): { value: unknown; signers: number } {
  if (record.binding.subject.kind !== "landing" || !record.policy) throw Error("No captured landing policy");
  const stored = readEvidenceWireV17(given.state.item(record.binding.subject.publication.seq)?.values["passes"], given.resolved.bounds.entryBytes);
  const raw = stored.ok ? stored.value : null;
  if (!isRecord(raw) || !Array.isArray(raw["generations"]) || raw["generations"].length > 32 || !isRecord(raw["policy"])) throw Error("No captured passes record");
  const captured = raw["policy"], required = captured["required"], input = captured["input"];
  if (!Array.isArray(required) || required.length > 32 || !isRecord(input) || !isRecord(input["extents"])) throw Error("No complete captured policy");
  const frozen = readRulesPolicyV13(input["extents"]["policy"]);
  if (!frozen.ok) throw Error("The captured full policy is malformed");
  const names = new Set<string>();
  for (const requiredCheck of required) {
    if (!isRecord(requiredCheck) || typeof requiredCheck["name"] !== "string") throw Error("A required descriptor is malformed");
    const check = frozen.policy.checks.find(check => check.name === requiredCheck["name"]);
    if (!check || checkStageV13(check) !== "landing" || !same(check, requiredCheck) || names.has(check.name)) throw Error("A required descriptor is not the frozen landing check");
    names.add(check.name);
  }
  for (const check of frozen.policy.checks) if (required.some(row => isRecord(row) && row["name"] === check.name) && check.audit) names.add(check.audit.check);
  if (names.size > 32) throw Error("The required signer cohort is over bound");
  const generations = new Map<string, unknown>();
  for (const row of raw["generations"]) {
    if (!isRecord(row) || typeof row["name"] !== "string") throw Error("Malformed captured pass row");
    generations.set(row["name"], row);
  }
  for (const check of frozen.policy.checks) generations.set(check.name, {
    name: check.name, job: full(record.job), passed: false, proof: { result: full(record.job), key: KEY, decided: MAX,
      configuration: check.configuration, checker: check.checker, tree: record.tree, proposal: record.policy.proposal },
  });
  if (generations.size > 32) throw Error("The full passes record is over bound");
  return { value: { ...raw, generations: [...generations.values()] }, signers: names.size };
}

export function evidenceFutureEntriesV17(given: RuleGiven, current: Row, owners: readonly Row[], pending: (job: FactRef) => EvidenceJobRecordV17 | null,
  settlement: readonly RuleEffect[] = []): Forecast {
  try {
    const bounds = given.resolved.bounds, record = current.record;
    const uses = Math.max(5, given.uses.length);
    if (!record.policy || !record.commit || !record.tree || !record.base || owners.length > 4 || bounds.memberBytes < 3
      || !Number.isSafeInteger(bounds.usesPerEntry) || uses > bounds.usesPerEntry) return refused();
    const distinct = new Map<number, Row>([[current.item, current]]);
    for (const owner of owners) {
      const prior = distinct.get(owner.item);
      if (prior && !same(prior.record, owner.record)) return refused();
      distinct.set(owner.item, owner);
    }
    const completed = new Map<number, EvidenceJobRecordV17>();
    for (const [id, row] of distinct) completed.set(id, completeRecord(row.record, record, pending));
    const main = completed.get(current.item)!;
    const related = main.binding.stage === "published" ? main.holdOwner : main.reuseOwner;
    if (related !== null && !completed.has(related)) return refused();
    const updated = [current.item, ...(related !== null && related !== current.item ? [related] : [])];
    const rowEffects = updated.flatMap(id => [codeEffect(id, "record", completed.get(id)!, 196608), { effect: "state" as const, item: id, state: "reuse-anchor-timedout" }]);
    const result = [...rowEffects, codeEffect(MAX, "service", service(main, bounds.memberBytes), 16384), valueEffect(current.item, "deadline", null),
      { effect: "state" as const, item: main.requestAt, state: "settled" }, ...settlement];
    const base = { v: 1, at: given.resolved.at, seq: MAX, prev: HASH, time: TIME, clamped: false, epoch: 0, prepared: [],
      // Typed origins retain at most five named facts. Already observed
      // provenance can be larger and is never dropped from the quote.
      uses: Array.from({ length: uses }, () => ({ fact: full(record.job), content: HASH })) };
    const outcome = (kind: string) => ({ type: "outcome", operation: `${MAX}:${MAX}`, attempt: MAX, owner: "platform:destination@17", kind,
      result: "confirmed", evidence: { basis: "own-answer", body: { job: record.job } }, observed: [] });
    const attempt: RuleEffect = { effect: "attempt", operation: `${MAX}:${MAX}`, attempt: MAX, result: "confirmed", selected: false };
    const observation = observationBytes("rules", bounds) + observationBytes("member", bounds) + 9 * observationBytes("key", bounds)
      + observationBytes("holders", bounds, 32) + 12; // commas between complete ObservationUse envelopes
    const variants: { name: string; input: unknown; effects: readonly RuleEffect[]; sends: readonly RuleRequest[]; observed: number }[] = [];
    const messages = [decision(main)];
    const progress = main.binding.stage === "landing" ? opening(0,
      { owner: "platform:destination@17", kind: "evidence-progress", attempts: 1, for: main.holder }) : [];
    variants.push({ name: "result", input: outcome("evidence-result"), effects: [attempt, ...result, ...progress], sends: messages, observed: observation });
    if (main.binding.subject.kind === "landing") {
      const publication = main.binding.subject.publication.seq;
      const openings = [opening(0, { owner: "platform:destination@17", kind: "reservation-delete", attempts: 3, for: publication }),
        opening(1, { owner: "platform:destination@17", kind: "mint", attempts: 1, for: publication })].flat();
      // Progress reads already sealed Native decisions. Its separate key
      // cohort covers the frozen required/audit descriptors, at most32; no member or
      // holder observation is borrowed from the earlier result entry.
      const passes = publicationPasses(given, main);
      const progressObservation = observationBytes("rules", bounds) + passes.signers * observationBytes("key", bounds) + passes.signers + 1;
      const progressRecord = [codeEffect(current.item, "record", main, 196608), codeEffect(MAX, "service", service(main, bounds.memberBytes), 16384)];
      const auditRequest = audit(given, main), auditOpening = auditRequest ? opening(2,
        { owner: "platform:destination@17", kind: "evidence-audit", attempts: 1, for: main.holder }) : [];
      variants.push({ name: "landing-success", input: outcome("evidence-progress"), effects: [attempt, ...progressRecord,
        codeEffect(publication, "passes", passes.value, bounds.entryBytes), valueEffect(publication, "checkDeadline", null), ...openings,
        ...(auditRequest ? [valueEffect(current.item, "auditOpenedAt", MAX), ...auditOpening] : [])],
        sends: [decision(main)], observed: progressObservation });
      if (auditRequest) variants.push({ name: "audit-dispatch", input: outcome("evidence-audit"), effects: [attempt], sends: [auditRequest], observed: 0 });
      variants.push({ name: "landing-failure", input: outcome("evidence-progress"), effects: [attempt, ...progressRecord,
        { effect: "state", item: publication, state: "cleanup-aborted" }, valueEffect(publication, "reason", "required-check-failed"),
        { effect: "ref", item: MAX, slot: "slot", to: null }, ...openings], sends: [decision(main)], observed: progressObservation });
    }
    variants.push({ name: "timeout", input: { type: "timed", item: current.item, rule: "evidence-reuse-deadline", due: TIME },
      effects: [{ effect: "state", item: current.item, state: "reuse-anchor-timedout" }, valueEffect(current.item, "timeoutReason", "check-timeout"),
        { effect: "ref", item: current.item, slot: "timeoutDecision", to: MAX }, valueEffect(current.item, "deadline", null)], sends: [], observed: 0 });
    if (main.incident) {
      const notice = opening(0, { owner: "platform:destination@17", kind: "evidence-notice", attempts: 1, for: main.holder });
      // A result with unavailable triagers keeps the cause and opens one
      // held notice. Its complete capacity pointer settlement is included.
      variants.push({ name: "result-notice", input: outcome("evidence-result"), effects: [attempt, ...result,
        valueEffect(current.item, "noticeOpenedAt", MAX), ...notice], sends: [decision(main)], observed: observation });
      variants.push({ name: "notice", input: outcome("evidence-notice"), effects: [attempt, codeEffect(current.item, "record", main, 196608),
        { effect: "state", item: current.item, state: "decided" }], sends: [incident(main, bounds.memberBytes)], observed: observationBytes("holders", bounds, 32) + 1 });
    }
    let entryBytes = 0, effects = 0, admitted = true;
    const quotes: VariantQuote[] = [];
    for (const variant of variants) {
      const size = bytes({ ...base, input: variant.input, effects: variant.effects, sends: variant.sends.map((send, n) => ({ n: MAX - n, ...send })) }) + variant.observed;
      quotes.push({ name: variant.name, entryBytes: size, effects: variant.effects.length, requests: variant.sends.length });
      entryBytes = Math.max(entryBytes, size); effects = Math.max(effects, variant.effects.length);
      if (size > bounds.entryBytes || variant.effects.length > Math.min(16, bounds.derivedEffects)
        || variant.effects.filter(effect => effect.effect === "open").length > 1 || variant.sends.length > bounds.sendsPerEntry) admitted = false;
    }
    return { admitted, entryBytes, effects, variants: quotes };
  } catch { return refused(); }
}
