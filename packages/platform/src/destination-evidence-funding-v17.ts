/** G17 new-work funding and serial, post-write published checks.
 * A self request opens each holder. Outcomes open only nonholder cursors. */
import type { Bounds, Digest, Entry, FactRef, FieldValue, PlatformData, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isFactRef, isOperationId, isRecord, same } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest } from "./evidence.ts";
import { operationOpening, type Item, type Opening, type Operation, type OutcomeGives, type Own, type RuleEffect, type RuleGiven, type RuleRequest, type Rules, type StateSnapshot, type StateView } from "@generalbusiness/dap-derive";
import { EVIDENCE_BATCH_ACCOUNTS_V17, EVIDENCE_BATCH_JOBS_V17, claimEvidenceBatchJobV17, obligationChecksV17, readEvidenceBatchV17, readEvidenceBatchWireV17, evidenceBatchWireV17, selectEvidenceBatchV17, type EvidenceBatchRecordV17 } from "./evidence-batch-v17.ts";
import { certifiedPublicationStateWireV17, certifiedWrittenPlanBudgetV17, CERTIFIED_PUBLICATION_TEXT_BYTES_V17, evidenceCarryingBudgetV17, type CertifiedPublicationStateV17 } from "./destination-budget-v17.ts";
import { readRulesPolicyObservationV17 } from "./reservation-v17.ts";
import { isObjectId } from "./reservation.ts";
import { readEvidenceWireV17, evidenceWireV17 } from "./evidence-wire-v17.ts";
import { checkSourceV13, checkStageV13 } from "./rules-policy-v13.ts";
import { evidenceOperationOpeningV17 } from "./evidence-opening-v17.ts";

export const PUBLISHED_CHECKS_V17 = "published-checks";
export const EVIDENCE_FUNDING_V17 = "evidence-funding";
export const EVIDENCE_PLAN_V17 = "evidence-plan";
export interface FundingHooksV17 {
  capacityAnchor(given: RuleGiven, publication: Item, snapshot: CertifiedPublicationStateV17): readonly RuleEffect[];
  accountOpening(holder: number, k?: number): readonly RuleEffect[];
  fundCapacity(given: RuleGiven, batch: EvidenceBatchRecordV17): { effects: readonly RuleEffect[]; capacity: FieldValue; policyKey: Digest } | null;
  capacityValid(value: FieldValue): boolean;
  jobState(state: StateView, job: FactRef): { state: string; admittedAt: number | null } | null;
  readyUpdate(given: RuleGiven, publication: Item, accounts: readonly EvidenceBatchRecordV17[]): RuleRequest | null;
}
const owned = <T>(value: T): T => JSON.parse(canonicalize(value)) as T;
const natural = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && !Object.is(value, -0);
const factOf = (own: Own, at: FactRef["at"], seq: number): FactRef | null => {
  const sealed = own(seq);
  return sealed && same(sealed.entry.at, at) && sealed.entry.seq === seq && entryHash(sealed.entry) === sealed.hash ? { at, seq, hash: sealed.hash } : null;
};
/** readFacts normalizes checked own facts to local numbers. Bind that
 * normal form back to the unchanged retained incoming full reference. */
function localFact(given: RuleGiven, name: string): FactRef | null {
  if (given.input.type !== "delivery" || given.input.message.class !== "request" || !isRecord(given.input.message.body)
    || !isRecord(given.input.message.body["fields"])) return null;
  const raw = given.input.message.body["fields"][name], value = given.resolved.fields[name];
  if (!isFactRef(raw)) return null;
  if (same(raw.at, given.resolved.at)) {
    const actual = natural(value) ? factOf(given.own, given.resolved.at, value) : null;
    return actual && same(actual, raw) ? actual : null;
  }
  return isFactRef(value) && same(value, raw) ? raw : null;
}
const batchValue = (item: Pick<Item, "values">) => readEvidenceBatchWireV17(item.values["batch"]);
function batches(state: StateView, operation: FactRef): { item: Item; record: EvidenceBatchRecordV17 }[] | null {
  const ids = state.lookup("evidence-batch", "operation", canonicalize(operation), EVIDENCE_BATCH_ACCOUNTS_V17 + 1);
  if (!ids || ids.length > EVIDENCE_BATCH_ACCOUNTS_V17) return null;
  const rows: { item: Item; record: EvidenceBatchRecordV17 }[] = [];
  for (const id of ids) {
    const item = state.item(id), record = item && batchValue(item);
    if (!item || item.type !== "evidence-batch" || !["funded", "closed"].includes(item.state) || typeof item.values["ready"] !== "boolean"
      || !record || !same(record.operation, operation) || !same(item.refs["operation"], operation)) return null;
    rows.push({ item, record });
  }
  return rows.sort((a, b) => a.record.ordinal - b.record.ordinal);
}
function completeRows(state: StateView, publication: Item): ReturnType<typeof batches> {
  const operation = publication.refs["operation"], scope = state.scope();
  if (!scope || publication.type !== "publication" || publication.opened === null || !isFactRef(operation)) return null;
  const rows = batches(state, operation);
  if (!rows?.length) return null;
  const first = rows[0]!.record;
  return rows.length === first.total && rows.every((row, n) => row.record.ordinal === n && row.record.total === first.total
    && same(row.record.publication, { at: scope.at, seq: publication.id, hash: publication.opened })
    && same(row.record.capture, first.capture) && same(row.record.policy, first.policy) && same(row.record.touched, first.touched)) ? rows : null;
}
/** Readiness is stamped only on the real ordinal-zero account of this exact
 * current publication. No caller-supplied account can replace the folded row. */
export function evidenceFundingReadyV17(state: StateView, publication: Item): boolean {
  return completeRows(state, publication)?.[0]?.item.values["ready"] === true;
}
/** Empty obligations require no account. Nonempty obligations require the exact complete set. */
export function evidenceFundingCompleteV17(state: StateView, publication: Item): boolean {
  const rows = completeRows(state, publication);
  if (rows) return true;
  const wire = readEvidenceWireV17(publication.values["passes"], CERTIFIED_PUBLICATION_TEXT_BYTES_V17);
  const passes = wire.ok ? wire.value : null;
  if (!isRecord(passes) || !isRecord(passes["policy"]) || !isRecord(passes["policy"]["observation"]) || !Array.isArray(passes["policy"]["touched"])) return false;
  const observation = passes["policy"]["observation"] as unknown as CertifiedPublicationStateV17["policy"]["observation"];
  const input = passes["policy"]["input"] as CertifiedPublicationStateV17["policy"]["input"];
  const decoded = readRulesPolicyObservationV17(observation, input, observation.at);
  const selected = decoded.ok ? obligationChecksV17(decoded.view.policy, passes["policy"]["touched"] as string[]) : null;
  return selected?.ok === true && selected.checks.length === 0;
}
function captured(own: Own, at: ScopeRef, publication: Item, snapshot: CertifiedPublicationStateV17) {
  const policy = snapshot.policy, read = readRulesPolicyObservationV17(policy.observation, policy.input, policy.observation.at);
  const selected = read.ok ? obligationChecksV17(read.view.policy, policy.touched) : null;
  const ref = factOf(own, at, publication.id), operation = publication.refs["operation"];
  return read.ok && selected?.ok && ref && isFactRef(operation) ? { ref, operation, view: read.view, checks: selected.checks, touched: policy.touched } : null;
}
/** The actual capture and its pre-guard forecast use this same opening. */
export function evidenceFundingCaptureV17(given: RuleGiven, publication: Item, snapshot: CertifiedPublicationStateV17): Opening | null {
  const selected = captured(given.own, given.resolved.at, publication, snapshot);
  if (!selected) throw Error("The captured funding policy is unavailable");
  if (selected.checks.some(check => checkStageV13(check) === "published") && !certifiedWrittenPlanBudgetV17(given.resolved.bounds).admitted)
    throw Error("The published check plan exceeds its future carrying entry");
  return selected.checks.length ? { owner: "platform:destination@17", kind: EVIDENCE_FUNDING_V17, attempts: 1, for: publication.id } : null;
}
function captureSource(state: StateView, own: Own, capture: FactRef) {
  const at = state.scope()?.at, birth = own(0), source = own(capture.seq);
  if (!at || !same(capture.at, at) || !same(factOf(own, at, capture.seq), capture)) return null;
  const writes = source?.entry.effects.filter(effect => effect.effect === "value" && effect.slot === "passes") ?? [];
  const write = writes.length === 1 ? writes[0] : null, item = write?.effect === "value" ? state.item(write.item) : null;
  if (!birth || birth.entry.input.type !== "genesis" || birth.entry.input.seed.definition !== "platform:destination@17"
    || !same(factOf(own, at, 0), { at, seq: 0, hash: birth.hash }) || state.scope()?.genesis.hash !== birth.hash
    || !source || source.entry.input.type !== "outcome" || source.entry.input.owner !== "platform:destination@17"
    || !["judge", "read"].includes(source.entry.input.kind) || source.entry.input.result !== "confirmed"
    || !item || item.type !== "publication" || item.values["reservedAt"] !== capture.seq
    || !source.entry.effects.some(effect => effect.effect === "state" && effect.item === item.id && effect.state === "reserved")) return null;
  const raw = write?.effect === "value" ? readEvidenceWireV17(write.value, CERTIFIED_PUBLICATION_TEXT_BYTES_V17) : null;
  const current = readEvidenceWireV17(item.values["passes"], CERTIFIED_PUBLICATION_TEXT_BYTES_V17);
  if (!raw?.ok || !current.ok || !isRecord(raw.value) || !isRecord(current.value)
    || !isRecord(raw.value["policy"]) || !same(raw.value["policy"], current.value["policy"])) return null;
  return { at, item, write: write!, entry: source.entry };
}
function readCaptureAt(state: StateView, own: Own, capture: FactRef, bounds: Bounds) {
  const source = captureSource(state, own, capture);
  if (!source) return null;
  const snapshot = source.write.effect === "value" ? certifiedPublicationStateWireV17(source.write.value, bounds) : null;
  const selected = snapshot && captured(own, source.at, source.item, snapshot);
  return selected?.checks.length ? { ...selected, capture, snapshot: snapshot!, source: source.entry, total: Math.ceil(selected.checks.length / EVIDENCE_BATCH_JOBS_V17) } : null;
}
interface FundingProofContext {
  captures: Map<string, ReturnType<typeof readCaptureAt>>;
  births: Map<string, EvidenceBatchRecordV17>;
}
/** One immutable judge invocation owns these bounded proof results. A new
 * public read or callback always starts with empty maps. */
const fundingProofContext = (): FundingProofContext => ({ captures: new Map(), births: new Map() });
function captureAt(state: StateView, own: Own, capture: FactRef, bounds: Bounds, proof = fundingProofContext()) {
  const at = state.scope()?.at;
  if (!at || !same(at, capture.at)) return null;
  const key = canonicalize({ at, capture });
  if (proof.captures.has(key)) return proof.captures.get(key)!;
  const selected = readCaptureAt(state, own, capture, bounds);
  proof.captures.set(key, selected);
  return selected;
}
function fundingOpening(entry: Entry, id: string, publication: number, kind = EVIDENCE_FUNDING_V17): boolean {
  if (!isOperationId(id)) return false;
  const [seq, k] = id.split(":").map(Number), rows = entry.effects.filter(effect => effect.effect === "operation" && effect.k === k);
  if (seq !== entry.seq || rows.length !== 1 || rows[0]!.effect !== "operation") return false;
  const row = rows[0]!;
  return row.owner === "platform:destination@17" && row.kind === kind && row.attempts === 1
    && (row.for === "self" ? entry.seq : row.for) === publication;
}
/** Only a real pending opening at the original reserved capture is offered. */
export function destinationEvidenceFundingPending(state: StateView, own: Own, operation: Operation): { capture: FactRef } | null {
  try {
    if (operation.owner !== "platform:destination@17" || operation.kind !== EVIDENCE_FUNDING_V17 || operation.most !== 1 || operation.for === undefined) return null;
    const at = state.scope()?.at, capture = at && factOf(own, at, Number(operation.id.split(":")[0]));
    const source = capture && captureSource(state, own, capture);
    return source && source.item.id === operation.for && evidenceOperationOpeningV17(source.entry, operation) ? { capture } : null;
  } catch { return null; }
}
function fundRequest(at: ScopeRef, batch: Pick<EvidenceBatchRecordV17, "publication" | "operation" | "capture">, ordinal: number): RuleRequest {
  return { to: at, message: { class: "request", type: "tell", body: { message: "evidence-fund", fields: {
    publication: batch.publication, operation: batch.operation, capture: batch.capture, ordinal,
  } } } };
}
const immutableBatch = (batch: EvidenceBatchRecordV17) => ({ publication: batch.publication, operation: batch.operation, capture: batch.capture,
  ordinal: batch.ordinal, total: batch.total, touched: batch.touched, checks: batch.checks, policy: batch.policy });
function batchAt(state: StateView, own: Own, entry: Entry, bounds: Bounds, depth: number, proof: FundingProofContext, birth?: FactRef): EvidenceBatchRecordV17 | null {
  const at = state.scope()?.at, input = entry.input;
  if (!at || depth >= EVIDENCE_BATCH_ACCOUNTS_V17 || input.type !== "delivery" || input.message.class !== "request" || input.message.type !== "tell"
    || !("decision" in input) || input.decision !== "applied" || !same(input.from.at, at) || !isRecord(input.message.body) || input.message.body["message"] !== "evidence-fund"
    || !isRecord(input.message.body["fields"])) return null;
  const fields = input.message.body["fields"], { publication, operation, capture, ordinal } = fields;
  if (Object.keys(fields).sort().join() !== "capture,operation,ordinal,publication" || !isFactRef(publication) || !isFactRef(operation)
    || !isFactRef(capture) || !natural(ordinal) || ordinal >= EVIDENCE_BATCH_ACCOUNTS_V17 || depth + ordinal >= EVIDENCE_BATCH_ACCOUNTS_V17) return null;
  // Depth and ordinal checks precede reuse. Only exact sealed births enter
  // the map; a proposed future delivery never becomes a retained fact.
  if (birth && (!same(birth.at, at) || !same(entry.at, birth.at) || entry.seq !== birth.seq || entryHash(entry) !== birth.hash)) return null;
  const key = birth ? canonicalize(birth) : null;
  if (key !== null && proof.births.has(key)) return proof.births.get(key)!;
  const selected = captureAt(state, own, capture, bounds, proof), sender = own(input.from.seq);
  if (!selected || !same(selected.ref, publication) || !same(selected.operation, operation) || ordinal >= selected.total
    || !sender || !same(factOf(own, at, input.from.seq), input.from)) return null;
  const sent = sender.entry.sends.find(send => send.n === input.n);
  if (!sent || !same(sent.to, at) || !same(sent.message, input.message)) return null;
  if (ordinal === 0) {
    const origin = sender.entry.input;
    if (origin.type !== "outcome" || origin.owner !== "platform:destination@17" || origin.kind !== EVIDENCE_FUNDING_V17 || origin.result !== "confirmed"
      || origin.evidence.basis !== "own-answer" || !isRecord(origin.evidence.body) || Object.keys(origin.evidence.body).join() !== "capture"
      || !same(origin.evidence.body["capture"], capture) || !fundingOpening(selected.source, origin.operation, publication.seq)) return null;
  } else {
    const previous = batchAt(state, own, sender.entry, bounds, depth + 1, proof, input.from), retained = state.item(sender.entry.seq);
    const row = retained && batchValue(retained);
    if (!previous || previous.ordinal !== ordinal - 1 || !same(previous.capture, capture) || !same(previous.publication, publication)
      || !same(previous.operation, operation) || !retained || retained.type !== "evidence-batch" || !["funded", "closed"].includes(retained.state)
      || retained.opened !== sender.hash || !row || !same(immutableBatch(row), immutableBatch(previous))) return null;
  }
  const writes = entry.effects.filter(effect => effect.effect === "value" && effect.item === entry.seq && effect.slot === "batch");
  const opened = entry.effects.filter(effect => effect.effect === "open");
  if (writes.length !== 1 || writes[0]!.effect !== "value" || opened.length !== 1 || opened[0]!.effect !== "open"
    || opened[0]!.item !== entry.seq || opened[0]!.type !== "evidence-batch" || opened[0]!.state !== "funded") return null;
  const batch = readEvidenceBatchWireV17(writes[0]!.value);
  const expected = readEvidenceBatchV17({ v: 1, publication, operation, capture, ordinal, total: selected.total,
    touched: selected.touched, checks: selected.checks.slice(ordinal * EVIDENCE_BATCH_JOBS_V17, (ordinal + 1) * EVIDENCE_BATCH_JOBS_V17), policy: selected.view, jobs: [], planAt: null });
  if (!batch || !expected || !same(batch, expected)) return null;
  if (key !== null) proof.births.set(key, batch);
  return batch;
}
/** Current mutable job/plan fields never replace the original funding proof.
 * At most sixteen actual deliveries are followed, always ordinal-1. */
export function evidenceFundedBatchV17(state: StateView, own: Own, item: Item, bounds: Bounds): EvidenceBatchRecordV17 | null {
  return fundedBatch(state, own, item, bounds, fundingProofContext());
}
function fundedBatch(state: StateView, own: Own, item: Item, bounds: Bounds, proof: FundingProofContext): EvidenceBatchRecordV17 | null {
  try {
    const actual = state.item(item.id), entry = own(item.id), batch = batchValue(item), at = state.scope()?.at;
    if (!actual || !same(actual, item) || item.type !== "evidence-batch" || !["funded", "closed"].includes(item.state) || !entry || !at
      || !same(factOf(own, at, item.id), { at, seq: item.id, hash: item.opened }) || !batch) return null;
    const initial = batchAt(state, own, entry.entry, bounds, 0, proof, { at, seq: item.id, hash: entry.hash });
    return initial && same(immutableBatch(batch), immutableBatch(initial)) ? batch : null;
  } catch { return null; }
}
function fundingProposal(given: RuleGiven, proof = fundingProofContext()): EvidenceBatchRecordV17 | null {
  if (given.input.type !== "delivery" || given.input.message.class !== "request" || given.input.message.type !== "tell") return null;
  // Preview the one implicit open and actual stored initial record. No
  // future hash is needed to prove the already sealed incoming send.
  const publication = localFact(given, "publication"), operation = localFact(given, "operation"), capture = localFact(given, "capture"), ordinal = given.resolved.fields["ordinal"];
  if (!publication || !operation || !capture || !natural(ordinal)) return null;
  const selected = captureAt(given.state, given.own, capture, given.resolved.bounds, proof);
  if (!selected || given.state.item(selected.ref.seq)?.state !== "reserved" || !same(publication, selected.ref)
    || !same(operation, selected.operation) || ordinal >= selected.total) return null;
  if (selected.checks.some(check => checkStageV13(check) === "published") && !certifiedWrittenPlanBudgetV17(given.resolved.bounds).admitted) return null;
  const batch = readEvidenceBatchV17({ v: 1, publication, operation, capture, ordinal, total: selected.total,
    touched: selected.touched, checks: selected.checks.slice(ordinal * EVIDENCE_BATCH_JOBS_V17, (ordinal + 1) * EVIDENCE_BATCH_JOBS_V17), policy: selected.view, jobs: [], planAt: null });
  if (!batch) return null;
  const preview: Entry = { v: 1, at: given.resolved.at, seq: given.resolved.self, prev: null, time: given.time, clamped: false, epoch: 0,
    input: { ...given.input, message: given.input.message, decision: "applied" }, uses: [], prepared: [], effects: [{ effect: "open", item: given.resolved.self, type: "evidence-batch", state: "funded" },
      { effect: "value", item: given.resolved.self, slot: "batch", value: evidenceBatchWireV17(batch) }], sends: [] };
  return batchAt(given.state, given.own, preview, given.resolved.bounds, 0, proof);
}
interface PublishedPlanV17 { v: 1; publication: FactRef; receipt: FactRef; written: number; operation: FactRef; base: string; cursor: number; total: number }
function readPlan(value: unknown): PublishedPlanV17 | null {
  return isRecord(value) && Object.keys(value).sort().join() === "base,cursor,operation,publication,receipt,total,v,written" && value["v"] === 1
    && isFactRef(value["publication"]) && isFactRef(value["receipt"]) && same(value["publication"].at, value["receipt"].at) && isFactRef(value["operation"])
    && isObjectId(value["base"])
    && natural(value["written"]) && natural(value["cursor"]) && natural(value["total"]) && value["total"] >= 1 && value["total"] <= 32 && value["cursor"] <= value["total"]
    ? owned(value as unknown as PublishedPlanV17) : null;
}
const PLAN_BYTES_V17 = 196608;
function readPlanWire(value: unknown): PublishedPlanV17 | null {
  const wire = readEvidenceWireV17(value, PLAN_BYTES_V17);
  return wire.ok ? readPlan(wire.value) : null;
}
function planWire(value: PublishedPlanV17): string {
  if (!readPlan(value)) throw Error("A published plan is malformed");
  return evidenceWireV17(value, PLAN_BYTES_V17);
}
function publishedRows(state: StateView, publication: Item) {
  const rows = completeRows(state, publication);
  return rows?.flatMap(row => row.record.checks.filter(check => checkStageV13(check) === "published").map(check => ({ ...row, check }))) ?? null;
}
function planFor(state: StateView, own: Own, operation: Operation) {
  if (operation.owner !== "platform:destination@17" || operation.kind !== PUBLISHED_CHECKS_V17 || operation.for === undefined || operation.most !== 1) return null;
  const opening = own(Number(operation.id.split(":")[0]));
  const candidates = opening?.entry.effects.flatMap(effect => effect.effect === "value" && effect.slot === "plan" ? [effect.item] : []) ?? [];
  if (candidates.length !== 1) return null;
  const item = state.item(candidates[0]!), plan = item && readPlanWire(item.values["plan"]);
  const publication = plan && state.item(plan.publication.seq), rows = publication && publishedRows(state, publication), selected = plan && rows?.[plan.cursor];
  const written = plan && own(plan.written), receipt = plan && state.item(plan.receipt.seq);
  const birth = item && own(item.id), initialValues = birth?.entry.effects.filter(effect => effect.effect === "value" && effect.item === item!.id && effect.slot === "plan") ?? [];
  const initial = initialValues.length === 1 && initialValues[0]!.effect === "value" ? readPlanWire(initialValues[0]!.value) : null;
  if (!plan || !publication || !birth || item!.opened !== birth.hash || !same(factOf(own, plan.publication.at, item!.id), { at: plan.publication.at, seq: item!.id, hash: birth.hash })
    || !initial || initial.cursor !== 0 || !same({ ...initial, cursor: plan.cursor }, plan)
    || birth.entry.input.type !== "delivery" || !("decision" in birth.entry.input) || birth.entry.input.decision !== "applied"
    || birth.entry.input.message.class !== "request" || !isRecord(birth.entry.input.message.body) || birth.entry.input.message.body["message"] !== "evidence-plan-open"
    || !same(factOf(own, plan.publication.at, plan.publication.seq), plan.publication)
    || !same(factOf(own, plan.receipt.at, plan.receipt.seq), plan.receipt) || !same(publication.refs["operation"], plan.operation)
    || !receipt || receipt.type !== "receipt" || receipt.state !== "written" || (receipt.refs["publication"] ?? receipt.values["publication"]) !== publication.id
    || receipt.values["commit"] !== publication.values["integration"] || !written || written.entry.input.type !== "outcome"
    || written.entry.input.owner !== "platform:destination@17" || !["receipt", "read"].includes(written.entry.input.kind) || written.entry.input.result !== "confirmed"
    || !written.entry.effects.some(effect => effect.effect === "state" && effect.item === receipt.id && effect.state === "written")) return null;
  return item && item.type === "published-plan" && item.state === "pending" && plan && rows && rows.length === plan.total && selected && selected.item.state === "funded" && selected.item.id === operation.for
    && (selected.record.planAt === null || selected.record.planAt === item.id)
    && evidenceOperationOpeningV17(opening!.entry, operation)
    ? { item, plan, rows, selected } : null;
}
/** Host can acknowledge only the actual pending plan fact, never a fabricated job. */
export function destinationPublishedChecksPending(state: StateView, own: Own, operation: Operation): { plan: FactRef } | null {
  const selected = planFor(state, own, operation);
  const plan = selected && factOf(own, selected.plan.publication.at, selected.item.id);
  return plan ? { plan } : null;
}
function writtenPlan(given: RuleGiven, result: OutcomeGives) {
  const writes = result.effects.filter((effect): effect is Extract<RuleEffect, { effect: "state" }> => effect.effect === "state" && effect.state === "written");
  if (!writes.length) return null;
  if (writes.length !== 1) throw Error("A publication wrote more than one receipt");
  const receipt = given.state.item(writes[0]!.item), publicationId = receipt?.refs["publication"] ?? receipt?.values["publication"];
  const publication = typeof publicationId === "number" ? given.state.item(publicationId) : null;
  if (!receipt || !publication || publication.type !== "publication") return null;
  const rows = publishedRows(given.state, publication);
  if (!rows) {
    if (evidenceFundingCompleteV17(given.state, publication)) return null;
    throw Error("The written publication has no complete funding accounts");
  }
  if (!rows.length || rows.some(row => row.record.planAt !== null)) return null;
  const ref = factOf(given.own, given.resolved.at, receipt.id), manifest = publication.refs["manifest"];
  if (!ref || !isFactRef(manifest)) throw Error("The written publication has no exact receipt or manifest");
  const first = rows[0]!, holder = completeRows(given.state, publication)?.find(row => row.record.ordinal === 0);
  if (!holder || holder.item.state !== "funded" || !evidenceFundedBatchV17(given.state, given.own, holder.item, given.resolved.bounds)) throw Error("The written plan has no original funded holder");
  return { publication: first.record.publication, operation: first.record.operation, receipt: ref, manifest, holder: holder.item.id };
}
function appendWrittenPlan(given: RuleGiven, result: OutcomeGives): OutcomeGives {
  const plan = writtenPlan(given, result);
  if (plan && !certifiedWrittenPlanBudgetV17(given.resolved.bounds).admitted) throw Error("The published check plan exceeds its future carrying entry");
  return plan ? { ...result, opens: [...result.opens, { owner: "platform:destination@17", kind: EVIDENCE_PLAN_V17, attempts: 1, for: plan.holder }] } : result;
}
function planOpening(state: StateView, own: Own, operation: Operation) {
  if (operation.owner !== "platform:destination@17" || operation.kind !== EVIDENCE_PLAN_V17 || operation.most !== 1 || operation.for === undefined) return null;
  const at = state.scope()?.at, entry = own(Number(operation.id.split(":")[0]));
  const holder = state.item(operation.for), batch = holder && batchValue(holder);
  if (!at || !entry || !holder || holder.type !== "evidence-batch" || holder.state !== "funded" || !batch || batch.ordinal !== 0
    || !same(factOf(own, at, entry.entry.seq), { at, seq: entry.entry.seq, hash: entry.hash }) || !evidenceOperationOpeningV17(entry.entry, operation)
    || entry.entry.input.type !== "outcome" || entry.entry.input.owner !== "platform:destination@17" || !["receipt", "read"].includes(entry.entry.input.kind)
    || entry.entry.input.result !== "confirmed") return null;
  const rows = entry.entry.effects.filter(effect => effect.effect === "state" && effect.state === "written"), receipt = rows.length === 1 && rows[0]!.effect === "state" ? state.item(rows[0]!.item) : null;
  const publication = state.item(batch.publication.seq), receiptFact = receipt && factOf(own, at, receipt.id), written = factOf(own, at, entry.entry.seq);
  if (!receipt || receipt.type !== "receipt" || receipt.state !== "written" || !publication || publication.type !== "publication"
    || !same(factOf(own, at, publication.id), batch.publication) || !same(publication.refs["operation"], batch.operation)
    || (receipt.refs["publication"] ?? receipt.values["publication"]) !== publication.id || receipt.values["commit"] !== publication.values["integration"]
    || !isFactRef(publication.refs["manifest"]) || !receiptFact || !written) return null;
  return { batch, publication, receipt: receiptFact, written, manifest: publication.refs["manifest"] };
}
export function destinationEvidencePlanPending(state: StateView, own: Own, operation: Operation): { written: FactRef } | null {
  try { const source = planOpening(state, own, operation); return source ? { written: source.written } : null; } catch { return null; }
}
function planProposal(given: RuleGiven): { plan: PublishedPlanV17; accounts: NonNullable<ReturnType<typeof completeRows>>; holder: number } | null {
  const proof = fundingProofContext();
  if (given.input.type !== "delivery" || given.input.message.class !== "request" || given.input.message.type !== "tell" || !same(given.input.from.at, given.resolved.at)) return null;
  const p = localFact(given, "publication"), operation = localFact(given, "operation"), r = localFact(given, "receipt"), w = localFact(given, "written"), m = localFact(given, "manifest");
  if (!p || !operation || !r || !w || !m) return null;
  if (!same(p.at, given.resolved.at) || !same(r.at, given.resolved.at) || !same(w.at, given.resolved.at)) return null;
  const item = given.state.item(p.seq), receiptItem = given.state.item(r.seq), source = given.own(given.input.from.seq), writtenEntry = given.own(w.seq), birth = given.own(0);
  if (!item || item.type !== "publication" || !receiptItem || receiptItem.type !== "receipt" || receiptItem.state !== "written"
    || !same(item.refs["operation"], operation) || !same(item.refs["manifest"], m) || (receiptItem.refs["publication"] ?? receiptItem.values["publication"]) !== item.id
    || receiptItem.values["commit"] !== item.values["integration"] || !same(factOf(given.own, given.resolved.at, p.seq), p) || !same(factOf(given.own, given.resolved.at, r.seq), r)
    || !source || !same(factOf(given.own, given.resolved.at, source.entry.seq), given.input.from) || source.entry.input.type !== "outcome" || source.entry.input.owner !== "platform:destination@17"
    || source.entry.input.kind !== EVIDENCE_PLAN_V17 || source.entry.input.result !== "confirmed" || source.entry.input.evidence.basis !== "own-answer"
    || !isRecord(source.entry.input.evidence.body) || Object.keys(source.entry.input.evidence.body).join() !== "written" || !same(source.entry.input.evidence.body["written"], w)
    || !writtenEntry || !same(factOf(given.own, given.resolved.at, w.seq), w) || writtenEntry.entry.input.type !== "outcome" || writtenEntry.entry.input.owner !== "platform:destination@17"
    || !["receipt", "read"].includes(writtenEntry.entry.input.kind) || writtenEntry.entry.input.result !== "confirmed"
    || !writtenEntry.entry.effects.some(effect => effect.effect === "state" && effect.item === r.seq && effect.state === "written")
    || !birth || birth.entry.input.type !== "genesis" || birth.entry.input.seed.definition !== "platform:destination@17") return null;
  const retained = source.entry.sends.find(send => send.n === (given.input.type === "delivery" ? given.input.n : -1));
  if (!retained || !same(retained.to, given.resolved.at) || !same(retained.message, given.input.message) || retained.message.class !== "request" || retained.message.type !== "tell" || !isRecord(retained.message.body)
    || retained.message.body["message"] !== "evidence-plan-open" || !isRecord(retained.message.body["fields"])) return null;
  const fields = retained.message.body["fields"];
  if (Object.keys(fields).sort().join() !== "manifest,operation,publication,receipt,written" || !same(fields["publication"], p) || !same(fields["receipt"], r)
    || !same(fields["operation"], operation) || !same(fields["manifest"], m) || !same(fields["written"], w)) return null;
  const accounts = completeRows(given.state, item), rows = publishedRows(given.state, item), holder = given.resolved.subjects.get("also.batch");
  if (!accounts || !rows?.length || accounts.some(row => row.record.planAt !== null || !fundedBatch(given.state, given.own, row.item, given.resolved.bounds, proof))
    || !holder || holder.state !== "funded" || holder.id !== accounts[0]!.item.id || !fundingOpening(writtenEntry.entry, source.entry.input.operation, holder.id, EVIDENCE_PLAN_V17)) return null;
  const manifestEntry = given.uses.find(use => same(use.fact, m))?.entry, base = manifestEntry?.input.type === "act" ? manifestEntry.input.signed.intent.fields["base"] : null;
  if (!isObjectId(base)) return null;
  return { plan: { v: 1, publication: p, receipt: r, written: w.seq, operation: operation as FactRef, base, cursor: 0, total: rows.length }, accounts, holder: holder.id };
}
function planEffects(given: RuleGiven, value: NonNullable<ReturnType<typeof planProposal>>): readonly RuleEffect[] {
  const firstPublished = value.accounts.find(row => row.record.checks.some(check => checkStageV13(check) === "published"));
  if (!firstPublished || firstPublished.item.state !== "funded") throw Error("The published plan has no check account");
  const effects: RuleEffect[] = [{ effect: "open", item: given.resolved.self, type: "published-plan", state: "pending" },
    { effect: "value", item: given.resolved.self, slot: "plan", value: planWire(value.plan) },
    { effect: "value", item: firstPublished.item.id, slot: "batch", value: evidenceBatchWireV17({ ...firstPublished.record, planAt: given.resolved.self }) }];
  for (const effect of operationOpening(0, { owner: "platform:destination@17", kind: PUBLISHED_CHECKS_V17, attempts: 1, for: firstPublished.item.id })) {
    if (effect.effect !== "operation" && effect.effect !== "attempt") throw Error("An operation opening returned an unsupported effect");
    effects.push(effect);
  }
  return effects;
}
export function fundingData(base: PlatformData): PlatformData {
  const receives = { ...base.receives };
  const publication = base.items["publication"]!;
  const publicationDecisions = Object.fromEntries(Object.entries(publication.holds?.decisions ?? {}).filter(([name]) => !["check-fence", "checked"].includes(name)));
  for (const name of ["check-fence", "checked"]) {
    const old = receives[name]!;
    receives[name] = { ...old, also: { ...old.also, batch: { item: "evidence-batch", index: "operation", key: "operation", code: "evidence-batch-select-v17", row: "E5" } },
      bound: { of: "also.batch", where: [{ equals: { a: { sender: true }, b: { slot: "lane", of: "also.batch" } } }] },
      effects: old.effects.map(effect => "code" in effect && effect.code === "evidence-open-v17" ? { ...effect, most: { ...effect.most!, effects: effect.most!.effects + 1 } } : effect) };
  }
  receives["evidence-fund"] = { message: "evidence-fund", class: "tell", from: { kind: "destination", under: "platform:destination" }, opens: "evidence-batch", also: {},
    fields: { publication: { type: "fact", kind: ["reserve"], under: "platform:destination", required: true }, operation: { type: "fact", kind: ["merge"], under: "change", required: true },
      capture: { type: "fact", kind: ["platform:destination@17:judge", "platform:destination@17:read"], under: "platform:destination", required: true }, ordinal: { type: "int", min: 0, max: EVIDENCE_BATCH_ACCOUNTS_V17 - 1, required: true } },
    guards: [{ code: "evidence-fund-v17", row: "E5" }], effects: [{ code: "evidence-fund-open-v17", row: "E5", most: { effects: 16, operations: ["evidence-account-settle"] } }], sends: [{ code: "evidence-funding-ready-v17", row: "E5", result: {} }], attention: [] };
  receives["evidence-plan-open"] = { message: "evidence-plan-open", class: "tell", from: { kind: "destination", under: "platform:destination" }, opens: null,
    also: { batch: { item: "evidence-batch", index: "operation", key: "operation", code: "evidence-plan-batch-v17", row: "E5" } },
    bound: { of: "also.batch", where: [{ equals: { a: { field: "operation" }, b: { slot: "operation", of: "also.batch" } } }] },
    fields: { publication: { type: "fact", kind: ["reserve"], under: "platform:destination", required: true }, operation: { type: "fact", kind: ["merge"], under: "change", required: true },
      receipt: { type: "fact", kind: ["platform:destination@17:push", "platform:destination@17:read"], under: "platform:destination", required: true },
      written: { type: "fact", kind: ["platform:destination@17:receipt", "platform:destination@17:read"], under: "platform:destination", required: true },
      manifest: { type: "fact", kind: ["propose-manifest", "propose-file"], under: "change", required: true } },
    guards: [{ code: "evidence-plan-v17", row: "E5" }], effects: [{ code: "evidence-plan-open-v17", row: "E5", most: { effects: 8, opens: "published-plan", operations: [PUBLISHED_CHECKS_V17] } }], sends: [], attention: [] };
  const outcomes = { ...base.outcomes };
  if (outcomes["reservation-stage"]) outcomes["reservation-stage"] = { ...outcomes["reservation-stage"]!, most: { ...outcomes["reservation-stage"]!.most, effects: 16 } };
  for (const name of ["judge", "read", "receipt"]) {
    const old = outcomes[name]; if (!old?.most) continue;
    const extra = name === "judge" ? [EVIDENCE_FUNDING_V17] : name === "read" ? [EVIDENCE_FUNDING_V17, EVIDENCE_PLAN_V17] : [EVIDENCE_PLAN_V17];
    outcomes[name] = { ...old, most: { ...old.most, effects: 16, operations: [...new Set([...(old.most.operations ?? []), ...extra])] } };
  }
  return { ...base, receives, items: { ...base.items,
    publication: { ...publication, holds: { ...publication.holds!, operations: { ...publication.holds?.operations, [EVIDENCE_FUNDING_V17]: 1 }, decisions: publicationDecisions, requests: (publication.holds?.requests ?? 0) + 5 } },
    "evidence-batch": { many: true, max: 8192, initial: "funded", states: { funded: { final: false }, closed: { final: true } }, parties: {},
      refs: { operation: { fixed: true, required: true, to: { type: "fact", kind: ["merge"], under: "change" } }, lane: { fixed: true, required: true, to: { type: "scope", kind: "lane" } } },
      indexes: ["operation", "policyKey"], holds: { operations: { "evidence-admit": 2, "evidence-result": 2, "evidence-notice": 2, "evidence-progress": 4, "evidence-audit": 2, [EVIDENCE_PLAN_V17]: 1, "published-checks": 2, "evidence-account-settle": 1 }, requests: 18, items: 7, decisions: { "check-fence": 2, checked: 2, "evidence-plan-open": 1, "evidence-batch-settle": 1 } },
      values: { batch: { fixed: false, required: true, of: { type: "code", code: "evidence-batch-record-v17", row: "E5" } },
        capacity: { fixed: false, required: true, of: { type: "code", code: "evidence-capacity-anchor-v17", row: "E5" } }, policyKey: { fixed: true, required: true, of: { type: "digest" } },
        ready: { fixed: false, required: true, of: { type: "bool" }, default: false } } },
    "published-plan": { many: true, max: 2048, initial: "pending", states: { pending: { final: false }, complete: { final: true } }, parties: {}, refs: {},
      values: { plan: { fixed: false, required: true, of: { type: "code", code: "evidence-published-plan-v17", row: "E5" } } } },
  }, outcomes: { ...outcomes,
    [EVIDENCE_FUNDING_V17]: { code: "evidence-funding-outcome-v17", row: "E5", attempts: 1, origin: "rule", most: { effects: 6, opens: "evidence-capacity", operations: [] }, send: { code: "evidence-funding-dispatch-v17", row: "E5", once: true, result: {} } },
    [EVIDENCE_PLAN_V17]: { code: "evidence-plan-outcome-v17", row: "E5", attempts: 1, origin: "rule", most: { effects: 0, operations: [] }, send: { code: "evidence-plan-dispatch-v17", row: "E5", once: true, result: {} } },
    [PUBLISHED_CHECKS_V17]: { code: "evidence-published-checks-v17", row: "E5", attempts: 1, origin: "rule", most: { effects: 3, operations: [PUBLISHED_CHECKS_V17] }, send: { code: "evidence-published-dispatch-v17", row: "E5", once: true, result: {} } } } };
}
export function fundingRules(base: Rules, hooks: FundingHooksV17): Rules {
  const fence = base["evidence-fence-v17"], open = base["evidence-open-v17"];
  if (fence?.place !== "guard" || open?.place !== "effect") throw Error("Funding requires the G17 fence rules");
  const next: Record<string, Rules[string]> = { ...base };
  // The receive's `opens` adds this before the code effects. Quote it once,
  // but leave its emission to deriveEffects so the carrying entry has one open.
  const implicitBatchOpen = (given: RuleGiven): RuleEffect => ({ effect: "open", item: given.resolved.self, type: "evidence-batch", state: "funded" });
  const ready = (given: RuleGiven, batch: EvidenceBatchRecordV17): { request: RuleRequest; marker: number } | null => {
    const publication = given.state.item(batch.publication.seq), previous = batches(given.state, batch.operation);
    if (!publication || publication.type !== "publication" || publication.opened !== batch.publication.hash || !previous
      || !same(factOf(given.own, given.resolved.at, publication.id), batch.publication)) return null;
    const accounts = [...previous.map(row => row.record), batch].sort((a, b) => a.ordinal - b.ordinal);
    if (accounts.length !== batch.total || accounts.some((row, n) => row.ordinal !== n || row.total !== batch.total
      || !same(row.publication, batch.publication) || !same(row.capture, batch.capture) || !same(row.policy, batch.policy) || !same(row.touched, batch.touched))) return null;
    const zero = previous.find(row => row.record.ordinal === 0);
    if ((zero && zero.item.values["ready"] !== false) || (!zero && batch.ordinal !== 0)) return null;
    const marker = zero?.item.id ?? given.resolved.self;
    const request = hooks.readyUpdate(given, publication, accounts);
    return request ? { request, marker } : null;
  };
  // One optional mark: earlier accounts advance the serial chain; only
  // the final account can announce readiness. Fund-first readiness remains
  // the inherited later reservation-stage send.
  const dispatch = (given: RuleGiven, batch: EvidenceBatchRecordV17): RuleRequest | null => batch.ordinal + 1 < batch.total
    ? fundRequest(given.resolved.at, batch, batch.ordinal + 1) : ready(given, batch)?.request ?? null;
  const funded = (given: RuleGiven) => {
    const proof = fundingProofContext(), batch = fundingProposal(given, proof);
    if (!batch) return null;
    const rows = batches(given.state, batch.operation);
    if (!rows || rows.some(row => row.record.ordinal === batch.ordinal || !same(row.record.capture, batch.capture)
      || !fundedBatch(given.state, given.own, row.item, given.resolved.bounds, proof))) return null;
    const capacity = hooks.fundCapacity(given, batch);
    if (!capacity || !hooks.capacityValid(capacity.capacity)) return null;
    const effects: RuleEffect[] = [...capacity.effects,
      { effect: "ref", item: given.resolved.self, slot: "operation", to: batch.operation }, { effect: "ref", item: given.resolved.self, slot: "lane", to: batch.operation.at },
      { effect: "value", item: given.resolved.self, slot: "batch", value: evidenceBatchWireV17(batch) },
      { effect: "value", item: given.resolved.self, slot: "capacity", value: capacity.capacity }, { effect: "value", item: given.resolved.self, slot: "policyKey", value: capacity.policyKey }, ...hooks.accountOpening(given.resolved.self)];
    const update = ready(given, batch);
    if (update) effects.push({ effect: "value", item: update.marker, slot: "ready", value: true });
    const request = dispatch(given, batch);
    return evidenceCarryingBudgetV17(given, [implicitBatchOpen(given), ...effects], [], request ? [request] : [], []).admitted ? { batch, ...capacity } : null;
  };
  next["evidence-fund-v17"] = { place: "guard", refusals: ["evidence-funding-unavailable"], run: given => funded(given) ? { holds: true } : { holds: false, name: "evidence-funding-unavailable" } };
  next["evidence-fund-open-v17"] = { place: "effect", most: 16, run: given => {
    const value = funded(given); if (!value) throw Error("A funding request lost its capacity proof");
    const effects: RuleEffect[] = [...value.effects,
      { effect: "ref", item: given.resolved.self, slot: "operation", to: value.batch.operation }, { effect: "ref", item: given.resolved.self, slot: "lane", to: value.batch.operation.at },
      { effect: "value", item: given.resolved.self, slot: "batch", value: evidenceBatchWireV17(value.batch) },
      { effect: "value", item: given.resolved.self, slot: "capacity", value: value.capacity }, { effect: "value", item: given.resolved.self, slot: "policyKey", value: value.policyKey }, ...hooks.accountOpening(given.resolved.self)];
    const update = ready(given, value.batch);
    if (update) effects.push({ effect: "value", item: update.marker, slot: "ready", value: true });
    const request = dispatch(given, value.batch);
    if (!evidenceCarryingBudgetV17(given, [implicitBatchOpen(given), ...effects], [], request ? [request] : [], []).admitted) throw Error("A funding record exceeds its carrying entry");
    return effects;
  } };
  next["evidence-funding-ready-v17"] = { place: "send", run: given => {
    const batch = fundingProposal(given); return batch ? dispatch(given, batch) : null;
  } };
  next["evidence-batch-record-v17"] = { place: "type", run: (_given, value) => readEvidenceBatchWireV17(value) !== null };
  next["evidence-published-plan-v17"] = { place: "type", run: (_given, value) => readPlanWire(value) !== null };
  next["evidence-plan-batch-v17"] = { place: "also", bind: items => {
    const rows = items.map(item => ({ id: item.id, record: batchValue(item) })).sort((a, b) => (a.record?.ordinal ?? -1) - (b.record?.ordinal ?? -1));
    if (!rows.length || rows.some((row, n) => !row.record || row.record.ordinal !== n || row.record.total !== rows.length)) return null;
    return rows[0]?.id ?? null;
  } };
  next["evidence-plan-v17"] = { place: "guard", refusals: ["published-plan-unavailable"], run: given => {
    const value = planProposal(given);
    return value && evidenceCarryingBudgetV17(given, planEffects(given, value), [], [], []).admitted ? { holds: true } : { holds: false, name: "published-plan-unavailable" };
  } };
  next["evidence-plan-open-v17"] = { place: "effect", most: 8, run: given => {
    const value = planProposal(given); if (!value) throw Error("A published plan lost its recorded written source");
    return planEffects(given, value);
  } };
  next["evidence-batch-select-v17"] = { place: "also", bind: (items, fields) => {
    const job = fields["job"], name = fields["name"];
    if (!isFactRef(job)) return null;
    const records = items.map(batchValue); if (records.some(row => row === null)) return null;
    const selected = selectEvidenceBatchV17(records as EvidenceBatchRecordV17[], job, typeof name === "string" ? name : undefined);
    return selected.ok ? items.find(item => item.state === "funded" && batchValue(item)?.ordinal === selected.record.ordinal)?.id ?? null : null;
  } };
  next["evidence-fence-v17"] = { ...fence, run: (given: RuleGiven) => {
    const old = fence.run(given); if (!old.holds || given.input.type !== "delivery" || given.input.message.class !== "request" || given.input.message.type !== "tell"
      || !isRecord(given.input.message.body) || given.input.message.body["message"] !== "check-fence") return old;
    const item = given.resolved.subjects.get("also.batch"), batch = item && batchValue(item), job = given.resolved.fields["job"], name = given.resolved.fields["name"];
    return batch && isFactRef(job) && typeof name === "string" && claimEvidenceBatchJobV17(batch, job, name).ok ? old : { holds: false, name: "not-this-check" };
  } };
  next["evidence-open-v17"] = { ...open, most: open.most + 1, run: (given: RuleGiven): readonly RuleEffect[] => {
    const effects = open.run(given), item = given.resolved.subjects.get("also.batch");
    if (!item) return effects;
    const batch = batchValue(item), job = given.resolved.fields["job"], name = given.resolved.fields["name"];
    const claimed = batch && isFactRef(job) && typeof name === "string" ? claimEvidenceBatchJobV17(batch, job, name) : null;
    if (!claimed?.ok) throw Error("An admitted job lost its batch slot");
    return [...effects, { effect: "value", item: item.id, slot: "batch", value: evidenceBatchWireV17(claimed.record) }];
  } };
  const publicationUpdate = next["publication-update"];
  const releasedUpdate = (given: RuleGiven): { request: RuleRequest; marker: number | null } | null => {
    if (publicationUpdate?.place !== "send") return null;
    const request = publicationUpdate.run(given);
    if (!request || request.message.class !== "request" || request.message.type !== "relate" || !isRecord(request.message.body)) return null;
    const body = request.message.body, detail = body["detail"];
    if (body["name"] !== "publication" || !isFactRef(body["item"]) || !isRecord(detail) || detail["outcome"] !== "committed") return null;
    const publication = given.state.item(body["item"].seq);
    if (!publication || publication.type !== "publication" || !same(body["item"].at, given.resolved.at)
      || !same(factOf(given.own, given.resolved.at, publication.id), body["item"])
      || !same(publication.refs["operation"], detail["operation"]) || evidenceFundingReadyV17(given.state, publication)
      || !evidenceFundingCompleteV17(given.state, publication)) return null;
    // A committed stage update is produced only by the retained base rule's
    // exact current outcome. Fund-first uses it; stage-first uses readyUpdate.
    return { request, marker: completeRows(given.state, publication)?.[0]?.item.id ?? null };
  };
  if (publicationUpdate?.place === "send") next["publication-update"] = { ...publicationUpdate, run: (given: RuleGiven) => {
    const request = publicationUpdate.run(given);
    if (!request || request.message.class !== "request" || request.message.type !== "relate" || !isRecord(request.message.body)
      || !isRecord(request.message.body["detail"]) || request.message.body["detail"]["outcome"] !== "committed") return request;
    return releasedUpdate(given)?.request ?? null;
  } };
  const stage = next["reservation-stage"];
  if (stage?.place === "outcome" && stage.rules.derives) {
    const most = stage.rules.most;
    if (!most) throw Error("Funding requires the stage's complete finite budget");
    next["reservation-stage"] = { ...stage, rules: { ...stage.rules,
      most: { ...most, effects: 16 }, derives: (given, operation, selected): OutcomeGives => {
        const result = stage.rules.derives!(given, operation, selected), update = releasedUpdate(given);
        return update?.marker !== null && update?.marker !== undefined
          ? { ...result, effects: [...result.effects, { effect: "value", item: update.marker, slot: "ready", value: true }] } : result;
      } } };
  }
  for (const name of ["judge", "read"]) {
    const rule = next[name];
    if (rule?.place !== "outcome" || !rule.rules.derives) continue;
    const most = rule.rules.most; if (!most) throw Error("Funding requires the capture's complete finite budget");
    next[name] = { ...rule, rules: { ...rule.rules, most: { ...most, effects: 16, operations: most.operations + 1 },
      derives: (given, operation, selected) => {
        const result = rule.rules.derives!(given, operation, selected);
        const captures = result.effects.filter(effect => effect.effect === "value" && effect.slot === "passes");
        if (captures.length === 0) return result;
        if (captures.length !== 1 || captures[0]!.effect !== "value") throw Error("A capture has more than one policy snapshot");
        const effect = captures[0]!, publication = given.state.item(effect.item), snapshot = certifiedPublicationStateWireV17(effect.value, given.resolved.bounds);
        if (!publication || !snapshot) throw Error("The capture's actual policy is unavailable");
        const opening = evidenceFundingCaptureV17(given, publication, snapshot);
        return opening ? { ...result, opens: [...result.opens, opening] } : result;
      } } };
  }
  const push = next["push"];
  if (push?.place === "outcome") next["push"] = { ...push, rules: { ...push.rules,
    holds: (given, operation) => {
      const publication = operation.for === undefined ? null : given.state.item(operation.for);
      const rows = publication && completeRows(given.state, publication);
      return !!publication && evidenceFundingCompleteV17(given.state, publication) && (rows === null || rows.every(row => hooks.capacityValid(row.item.values["capacity"]!)))
        && (!rows?.some(row => row.record.checks.some(check => checkStageV13(check) === "published")) || certifiedWrittenPlanBudgetV17(given.resolved.bounds).admitted)
        && (push.rules.holds?.(given, operation) ?? true);
    },
    ready: (state, operation, attempt) => {
      const publication = operation.for === undefined ? null : state.item(operation.for);
      const rows = publication && completeRows(state, publication);
      return !!publication && evidenceFundingCompleteV17(state, publication) && (rows === null || rows.every(row => hooks.capacityValid(row.item.values["capacity"]!)))
        && (push.rules.ready?.(state, operation, attempt) ?? true);
    } } };
  for (const name of ["receipt", "read"]) {
    const rule = next[name];
    if (rule?.place === "outcome" && rule.rules.derives) {
      const most = rule.rules.most;
      if (!most) throw Error("Funding requires the receipt/read's complete finite budget");
      next[name] = { ...rule, rules: { ...rule.rules, most: { ...most, operations: most.operations + 1 }, derives: (given, operation, selected) => appendWrittenPlan(given, rule.rules.derives!(given, operation, selected)) } };
    }
  }
  const fundingAnswer = (given: RuleGiven): { effects: readonly RuleEffect[]; request: RuleRequest | null } => {
    if (given.input.type !== "outcome" || given.input.result !== "confirmed") return { effects: [], request: null };
    const operation = given.state.operation(given.input.operation), pending = operation && destinationEvidenceFundingPending(given.state, given.own, operation);
    const source = pending && captureAt(given.state, given.own, pending.capture, given.resolved.bounds), publication = source && given.state.item(source.ref.seq);
    if (!source || !publication) throw Error("The funding answer lost its actual captured publication");
    const effects = hooks.capacityAnchor(given, publication, source.snapshot);
    const request = fundRequest(given.resolved.at, { publication: source.ref, operation: source.operation, capture: source.capture }, 0);
    if (!evidenceCarryingBudgetV17(given, effects, [], [request], []).admitted) throw Error("The funding anchor exceeds its carrying entry");
    return { effects, request };
  };
  next["evidence-funding-outcome-v17"] = { place: "outcome", rules: { selects: false, read: false, retries: () => false,
    most: { effects: 6, requests: 1, operations: 0 }, origin: (_given, operation) => Number(operation.id.split(":")[0]), unknown: () => ({}),
    wellFormed: (result, evidence, given) => {
      if (result !== "confirmed") return isRecord(evidence.body) && Object.keys(evidence.body).length === 0;
      const operation = given.input.type === "outcome" ? given.state.operation(given.input.operation) : null;
      const pending = operation && destinationEvidenceFundingPending(given.state, given.own, operation);
      return evidence.basis === "own-answer" && isRecord(evidence.body) && Object.keys(evidence.body).join() === "capture" && !!pending && same(evidence.body["capture"], pending.capture);
    }, derives: given => ({ effects: fundingAnswer(given).effects, sends: [], opens: [] }) } };
  next["evidence-funding-dispatch-v17"] = { place: "send", run: given => {
    return fundingAnswer(given).request;
  } };
  next["evidence-plan-outcome-v17"] = { place: "outcome", rules: { selects: false, read: false, retries: () => false,
    most: { effects: 0, requests: 1, operations: 0 }, origin: (_given, operation) => Number(operation.id.split(":")[0]), unknown: () => ({}),
    wellFormed: (result, evidence, given) => {
      if (result !== "confirmed") return isRecord(evidence.body) && Object.keys(evidence.body).length === 0;
      const operation = given.input.type === "outcome" ? given.state.operation(given.input.operation) : null;
      const pending = operation && destinationEvidencePlanPending(given.state, given.own, operation);
      return evidence.basis === "own-answer" && isRecord(evidence.body) && Object.keys(evidence.body).join() === "written" && !!pending && same(evidence.body["written"], pending.written);
    }, derives: () => ({ effects: [], sends: [], opens: [] }) } };
  next["evidence-plan-dispatch-v17"] = { place: "send", run: given => {
    if (given.input.type !== "outcome" || given.input.result !== "confirmed") return null;
    const operation = given.state.operation(given.input.operation), source = operation && planOpening(given.state, given.own, operation);
    if (!source || !evidenceFundedBatchV17(given.state, given.own, given.state.item(operation!.for!)!, given.resolved.bounds)) return null;
    return { to: given.resolved.at, message: { class: "request", type: "tell", body: { message: "evidence-plan-open", fields: {
      publication: source.batch.publication, operation: source.batch.operation, receipt: source.receipt, written: source.written, manifest: source.manifest,
    } } } };
  } };
  const published = (given: RuleGiven, operation: Operation): OutcomeGives => {
    const current = planFor(given.state, given.own, operation);
    if (!current || given.input.type !== "outcome" || given.input.result !== "confirmed") return { effects: [], sends: [], opens: [] };
    const { plan, selected } = current, written = factOf(given.own, given.resolved.at, plan.written);
    if (!written) throw Error("The published plan lost its actual written fact");
    const check = selected.check, policy = selected.record.policy;
    const binding = { v: 1 as const, source: checkSourceV13(check), stage: "published" as const, checker: check.checker,
      policyGeneration: { rules: policy.rules, seq: policy.revision }, roomService: policy.policy.roomService, serviceGeneration: policy.serviceGeneration, auditOf: null,
      subject: { kind: "published" as const, publication: plan.publication, receipt: plan.receipt, written, manifest: (given.state.item(plan.publication.seq)!.refs["manifest"] as FactRef) } };
    const publication = given.state.item(plan.publication.seq)!, cursor = plan.cursor + 1, following = current.rows[cursor];
    return { effects: [{ effect: "value", item: current.item.id, slot: "plan", value: planWire({ ...plan, cursor }) },
      ...(selected.record.planAt === null ? [{ effect: "value" as const, item: selected.item.id, slot: "batch", value: evidenceBatchWireV17({ ...selected.record, planAt: current.item.id }) }] : []),
      ...(cursor === plan.total ? [{ effect: "state" as const, item: current.item.id, state: "complete" }] : [])],
      sends: [{ to: plan.operation.at, message: { class: "request", type: "tell", body: { message: "admit-published-check", fields: {
        operation: plan.operation, manifest: binding.subject.manifest, name: check.name, configuration: check.configuration,
        commit: publication.values["integration"], tree: publication.values["tree"], base: plan.base,
        checker: check.checker, binding: canonicalize(binding), bindingDigest: evidenceBindingDigest(binding),
      } } } }], opens: following ? [{ owner: "platform:destination@17", kind: PUBLISHED_CHECKS_V17, attempts: 1, for: following.item.id }] : [] };
  };
  next["evidence-published-checks-v17"] = { place: "outcome", rules: { selects: false, read: false, retries: () => false,
    most: { effects: 4, requests: 1, operations: 1 }, origin: (_given, operation) => Number(operation.id.split(":")[0]), unknown: () => ({}),
    wellFormed: (result, evidence, given) => {
      if (result !== "confirmed") return isRecord(evidence.body) && Object.keys(evidence.body).length === 0;
      const operation = given.input.type === "outcome" ? given.state.operation(given.input.operation) : null;
      const pending = operation && destinationPublishedChecksPending(given.state, given.own, operation);
      return result === "confirmed" && evidence.basis === "own-answer" && isRecord(evidence.body) && Object.keys(evidence.body).join() === "plan" && !!pending && same(evidence.body["plan"], pending.plan);
    }, derives: (given, operation) => ({ ...published(given, operation), sends: [] }) } };
  next["evidence-published-dispatch-v17"] = { place: "send", run: given => {
    if (given.input.type !== "outcome") return null;
    const operation = given.state.operation(given.input.operation);
    return operation ? published(given, operation).sends[0] ?? null : null;
  } };
  return next;
}

/** Retain only declared local positions; code-value integers are never guessed facts. */
export function* evidenceFundingFloorReferencesV17(snapshot: StateSnapshot, own: Own): Iterable<number> {
  if (!snapshot.scope) return;
  const at = snapshot.scope.at, positions = new Set<number>();
  const fact = (value: FactRef) => { if (same(value.at, at)) positions.add(value.seq); };
  for (const item of snapshot.items) {
    if (item.type === "evidence-batch") {
      const batch = batchValue(item); if (!batch) throw Error("A retained funding batch is malformed");
      positions.add(item.id); fact(batch.publication); fact(batch.capture);
      // The original dispatch and prior ordinal deliveries are a bounded
      // proof chain, even after their requests and operations have settled.
      let source = own(item.id)?.entry;
      let rooted = false;
      for (let n = 0; n <= EVIDENCE_BATCH_ACCOUNTS_V17 && source; n++) {
        positions.add(source.seq);
        if (source.input.type === "delivery" && source.input.message.class === "request" && isRecord(source.input.message.body)
          && source.input.message.body["message"] === "evidence-fund") { fact(source.input.from); source = own(source.input.from.seq)?.entry; }
        else if (source.input.type === "outcome" && source.input.kind === EVIDENCE_FUNDING_V17) {
          positions.add(Number(source.input.operation.split(":")[0])); rooted = true; break;
        } else throw Error("A retained funding source chain is malformed");
      }
      if (!rooted) throw Error("A funding source chain exceeds its fixed account bound");
      positions.add(0);
      fact(batch.policy.certificate.request); fact(batch.policy.certificate.certificate);
      if (batch.planAt !== null) positions.add(batch.planAt);
    } else if (item.type === "published-plan" && item.state === "pending") {
      const plan = readPlanWire(item.values["plan"]); if (!plan) throw Error("A retained published plan is malformed");
      positions.add(item.id); fact(plan.publication); fact(plan.receipt); positions.add(plan.written);
      const opened = own(item.id)?.entry;
      if (!opened || opened.input.type !== "delivery" || opened.input.message.class !== "request") throw Error("A published plan has no actual dispatch source");
      fact(opened.input.from);
    }
  }
  for (const seq of positions) {
    const value = own(seq);
    if (!value || !same(value.entry.at, at) || value.entry.seq !== seq || entryHash(value.entry) !== value.hash) throw Error("A funding source is unavailable");
    yield seq;
  }
}
