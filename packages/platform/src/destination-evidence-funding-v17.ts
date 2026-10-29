/** G17 new-work funding and serial, post-write published checks.
 * A self request opens each holder. Outcomes open only nonholder cursors. */
import type { Bounds, Digest, Entry, FactRef, FieldValue, PlatformData, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isDigest, isFactRef, isOperationId, isRecord, same, timeMs } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest } from "./evidence.ts";
import { operationOpening, operationSettled, RuleFault, type Item, type Opening, type Operation, type OutcomeGives, type Own, type RuleEffect, type RuleGiven, type RuleRequest, type Rules, type StateSnapshot, type StateView } from "@generalbusiness/dap-derive";
import { claimEvidenceBatchJobV17, obligationChecksV17, readEvidenceBatchV17, readEvidenceBatchWireV17, evidenceBatchWireV17, selectEvidenceBatchV17, type EvidenceBatchRecordV17 } from "./evidence-batch-v17.ts";
import { certifiedPublicationStateWireV17, certifiedWrittenPlanBudgetV17, CERTIFIED_PUBLICATION_TEXT_BYTES_V17, evidenceCarryingBudgetV17, type CertifiedPublicationStateV17 } from "./destination-budget-v17.ts";
import { readRulesPolicyObservationV17 } from "./reservation-v17.ts";
import { isObjectId } from "./reservation.ts";
import { readEvidenceWireV17, evidenceWireV17 } from "./evidence-wire-v17.ts";
import { readBindingTextV17 } from "./destination-evidence-v17.ts";
import { checkSourceV13, checkStageV13 } from "./rules-policy-v13.ts";
import { evidenceOperationOpeningV17 } from "./evidence-opening-v17.ts";

export const PUBLISHED_CHECKS_V17 = "published-checks";
export const EVIDENCE_FUNDING_V17 = "evidence-funding";
export const EVIDENCE_PLAN_V17 = "evidence-plan";
export interface FundingHooksV17 {
  fundCapacity(given: RuleGiven, batch: EvidenceBatchRecordV17): { effects: readonly RuleEffect[]; capacity: FieldValue; policyKey: Digest } | null;
  capacityValid(value: FieldValue): boolean;
  jobState(state: StateView, job: FactRef): { state: string; admittedAt: number | null } | null;
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
  const ids = state.lookup("evidence-batch", "operation", canonicalize(operation), 5);
  if (!ids || ids.length > 4) return null;
  const rows: { item: Item; record: EvidenceBatchRecordV17 }[] = [];
  for (const id of ids) {
    const item = state.item(id), record = item && batchValue(item);
    if (!item || item.type !== "evidence-batch" || item.state !== "funded"
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
function captureAt(state: StateView, own: Own, capture: FactRef, bounds: Bounds) {
  const source = captureSource(state, own, capture);
  if (!source) return null;
  const snapshot = source.write.effect === "value" ? certifiedPublicationStateWireV17(source.write.value, bounds) : null;
  const selected = snapshot && captured(own, source.at, source.item, snapshot);
  return selected?.checks.length ? { ...selected, capture, source: source.entry, total: Math.ceil(selected.checks.length / 8) } : null;
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
function batchAt(state: StateView, own: Own, entry: Entry, bounds: Bounds, depth: number): EvidenceBatchRecordV17 | null {
  const at = state.scope()?.at, input = entry.input;
  if (!at || depth > 3 || input.type !== "delivery" || input.message.class !== "request" || input.message.type !== "tell"
    || !("decision" in input) || input.decision !== "applied" || !same(input.from.at, at) || !isRecord(input.message.body) || input.message.body["message"] !== "evidence-fund"
    || !isRecord(input.message.body["fields"])) return null;
  const fields = input.message.body["fields"], { publication, operation, capture, ordinal } = fields;
  if (Object.keys(fields).sort().join() !== "capture,operation,ordinal,publication" || !isFactRef(publication) || !isFactRef(operation)
    || !isFactRef(capture) || !natural(ordinal) || ordinal > 3 || depth + ordinal > 3) return null;
  const selected = captureAt(state, own, capture, bounds), sender = own(input.from.seq);
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
    const previous = batchAt(state, own, sender.entry, bounds, depth + 1), retained = state.item(sender.entry.seq);
    const row = retained && batchValue(retained);
    if (!previous || previous.ordinal !== ordinal - 1 || !same(previous.capture, capture) || !same(previous.publication, publication)
      || !same(previous.operation, operation) || !retained || retained.type !== "evidence-batch" || retained.state !== "funded"
      || retained.opened !== sender.hash || !row || !same(immutableBatch(row), immutableBatch(previous))) return null;
  }
  const writes = entry.effects.filter(effect => effect.effect === "value" && effect.item === entry.seq && effect.slot === "batch");
  const opened = entry.effects.filter(effect => effect.effect === "open");
  if (writes.length !== 1 || writes[0]!.effect !== "value" || opened.length !== 1 || opened[0]!.effect !== "open"
    || opened[0]!.item !== entry.seq || opened[0]!.type !== "evidence-batch" || opened[0]!.state !== "funded") return null;
  const batch = readEvidenceBatchWireV17(writes[0]!.value);
  const expected = readEvidenceBatchV17({ v: 1, publication, operation, capture, ordinal, total: selected.total,
    touched: selected.touched, checks: selected.checks.slice(ordinal * 8, ordinal * 8 + 8), policy: selected.view, jobs: [], planAt: null });
  return batch && expected && same(batch, expected) ? batch : null;
}
/** Current mutable job/plan fields never replace the original funding proof.
 * At most four actual deliveries are followed, always ordinal-1. */
export function evidenceFundedBatchV17(state: StateView, own: Own, item: Item, bounds: Bounds): EvidenceBatchRecordV17 | null {
  try {
    const actual = state.item(item.id), entry = own(item.id), batch = batchValue(item), at = state.scope()?.at;
    if (!actual || !same(actual, item) || item.type !== "evidence-batch" || item.state !== "funded" || !entry || !at
      || !same(factOf(own, at, item.id), { at, seq: item.id, hash: item.opened }) || !batch) return null;
    const initial = batchAt(state, own, entry.entry, bounds, 0);
    return initial && same(immutableBatch(batch), immutableBatch(initial)) ? batch : null;
  } catch { return null; }
}
/** Receipt.publicationKey is a fixed, successor-only index. Final receipts stay
 * indexed, so a late original carrier never scans retained history. */
function publicationReceipt(state: StateView, own: Own, publication: Item) {
  const at = state.scope()?.at, ids = state.lookup("receipt", "publicationKey", canonicalize(publication.id), 2);
  if (!at || !ids || ids.length !== 1) return null;
  const item = state.item(ids[0]!), receipt = item && factOf(own, at, item.id), born = receipt && own(receipt.seq);
  if (!item || item.type !== "receipt" || !["owed", "written"].includes(item.state) || item.values["publication"] !== publication.id
    || item.values["publicationKey"] !== publication.id || item.values["commit"] !== publication.values["integration"] || !receipt || !born
    || born.entry.input.type !== "outcome" || born.entry.input.owner !== "platform:destination@17"
    || !["push", "read"].includes(born.entry.input.kind) || born.entry.input.result !== "confirmed"
    || !born.entry.effects.some(effect => effect.effect === "open" && effect.item === item.id && effect.type === "receipt")
    || !born.entry.effects.some(effect => effect.effect === "value" && effect.item === item.id && effect.slot === "publication" && effect.value === publication.id)
    || !born.entry.effects.some(effect => effect.effect === "value" && effect.item === item.id && effect.slot === "commit" && effect.value === item.values["commit"])) return null;
  return { item, receipt };
}
function writtenReceipt(state: StateView, own: Own, publication: Item) {
  const found = publicationReceipt(state, own, publication), at = state.scope()?.at;
  if (!found || !at || found.item.state !== "written") return null;
  const position = found.item.values["evidenceWrittenAt"], written = natural(position) ? factOf(own, at, position) : null, source = written && own(written.seq);
  if (!written || !source || source.entry.input.type !== "outcome" || source.entry.input.owner !== "platform:destination@17"
    || !["receipt", "read"].includes(source.entry.input.kind) || source.entry.input.result !== "confirmed"
    || !source.entry.effects.some(effect => effect.effect === "state" && effect.item === found.item.id && effect.state === "written")) return null;
  return { ...found, written };
}
function carrierPublication(state: StateView, own: Own, publication: FactRef): boolean {
  const item = state.item(publication.seq);
  return !!item && item.type === "publication" && same(factOf(own, publication.at, item.id), publication)
    && item.values["withdrawDecided"] !== true && (["reserved", "publishing", "unresolved"].includes(item.state)
      || publicationReceipt(state, own, item) !== null);
}
/** The marker names the actual operation-opening entry, never a future plan.
 * A marked unknown or pending operation must not be replaced. */
function planScheduled(state: StateView, own: Own, holder: number): boolean {
  const marked = state.item(holder)?.values["planOpenedAt"];
  if (marked === undefined || marked === null) return false;
  const source = natural(marked) ? own(marked) : null, at = state.scope()?.at;
  const marks = source?.entry.effects.filter(effect => effect.effect === "value" && effect.item === holder && effect.slot === "planOpenedAt" && effect.value === marked) ?? [];
  const openings = source?.entry.effects.filter(effect => effect.effect === "operation" && effect.owner === "platform:destination@17" && effect.kind === EVIDENCE_PLAN_V17) ?? [];
  const opening = openings.length === 1 ? openings[0] : null;
  const operation = source && opening?.effect === "operation" ? state.operation(`${source.entry.seq}:${opening.k}`) : null;
  const ordinal = opening?.effect === "operation" ? opening.k : null;
  if (!source || !at || !same(factOf(own, at, source.entry.seq), { at, seq: source.entry.seq, hash: source.hash })
    || marks.length !== 1 || !operation || operation.for !== holder || operation.most !== 1 || !evidenceOperationOpeningV17(source.entry, operation)
    || !operation.attempts.some(attempt => attempt.attempt === 1 && attempt.opened === marked)
    || !source.entry.effects.some(effect => effect.effect === "attempt" && typeof effect.operation !== "string" && effect.operation.k === ordinal
      && effect.attempt === 1 && effect.result === "opened" && effect.selected === null))
    throw Error("The original published plan opening is unavailable");
  return true;
}
/** A real original setup still pending may delay its own landing fence.
 * A refusal, unrelated source or ended publication never becomes a wait. */
function landingCarrierPending(given: RuleGiven, binding: NonNullable<ReturnType<typeof readBindingTextV17>>): boolean {
  const input = given.input;
  if (binding.subject.kind !== "landing" || input.type !== "delivery" || input.message.class !== "request"
    || input.message.type !== "tell" || !isRecord(input.message.body) || input.message.body["message"] !== "check-fence") return false;
  const fields = given.resolved.fields, job = fields["job"], operationFact = fields["operation"], name = fields["name"];
  const publication = given.state.item(binding.subject.publication.seq), from = input.from;
  if (!isFactRef(job) || !same(job, from) || !isFactRef(operationFact) || typeof name !== "string" || !publication || publication.type !== "publication"
    || publication.state !== "reserved" || publication.values["withdrawDecided"] === true || !same(binding.subject.publication, factOf(given.own, given.resolved.at, publication.id))
    || !same(publication.refs["operation"], operationFact) || !same(publication.refs["manifest"], binding.subject.manifest)
    || !same(publication.refs["lane"], job.at) || !same(fields["manifest"], binding.subject.manifest)) return false;
  const source = given.uses.find(use => same(use.fact, job))?.entry;
  if (!source || !same(source.at, job.at) || source.seq !== job.seq || entryHash(source) !== job.hash
    || !source.effects.some(effect => effect.effect === "open" && effect.item === job.seq && effect.type === "job")
    || !source.sends.some(send => send.n === input.n && same(send.to, given.resolved.at) && same(send.message, input.message))) return false;
  const value = (slot: string): unknown => {
    const rows = source.effects.filter(effect => effect.effect === "value" && effect.item === job.seq && effect.slot === slot);
    return rows.length === 1 && rows[0]!.effect === "value" ? rows[0]!.value : undefined;
  };
  const ref = (slot: string): unknown => {
    const rows = source.effects.filter(effect => effect.effect === "ref" && effect.item === job.seq && effect.slot === slot);
    return rows.length === 1 && rows[0]!.effect === "ref" ? rows[0]!.to : undefined;
  };
  const manifest = ref("manifest"), parties = source.effects.filter(effect => effect.effect === "party" && effect.item === job.seq && effect.slot === "checker");
  const deadline = timeMs(value("deadline")), now = timeMs(given.time);
  if (deadline === null || now === null || deadline <= now) return false;
  const configuration = value("configuration"), manifestSource = given.uses.find(use => same(use.fact, binding.subject.kind === "landing" ? binding.subject.manifest : null))?.entry;
  if (!manifestSource || manifestSource.input.type !== "act" || !["propose-manifest", "propose-file"].includes(manifestSource.input.signed.intent.kind)
    || value("base") !== manifestSource.input.signed.intent.fields["base"]) return false;
  if (value("name") !== name || value("binding") !== fields["binding"] || value("bindingDigest") !== fields["bindingDigest"] || value("stage") !== "landing"
    || !isDigest(configuration) || !same(ref("destination"), given.resolved.at)
    || !(same(manifest, binding.subject.manifest) || manifest === binding.subject.manifest.seq && same(source.at, binding.subject.manifest.at))
    || parties.length !== 1 || parties[0]!.effect !== "party" || !same(parties[0]!.member, binding.checker)
    || value("commit") !== publication.values["integration"] || value("tree") !== publication.values["tree"]) return false;
  if (source.input.type === "act") {
    if (source.input.signed.intent.kind !== "request-check" || !same(source.input.signed.intent.to, job.at) || binding.auditOf !== null) return false;
  } else {
    if (source.input.type !== "delivery" || source.input.message.class !== "request" || source.input.message.type !== "tell" || !("decision" in source.input) || source.input.decision !== "applied"
      || !same(source.input.from.at, given.resolved.at) || !isRecord(source.input.message.body) || source.input.message.body["message"] !== "admit-audit-check" || binding.auditOf === null) return false;
    const sender = given.own(source.input.from.seq), sent = sender?.entry.sends.find(send => send.n === (source.input.type === "delivery" ? source.input.n : -1));
    if (!sender || !same(factOf(given.own, given.resolved.at, sender.entry.seq), source.input.from) || sender.entry.input.type !== "outcome"
      || sender.entry.input.owner !== "platform:destination@17" || sender.entry.input.kind !== "evidence-audit" || sender.entry.input.result !== "confirmed"
      || !sent || !same(sent.to, job.at) || !same(sent.message, source.input.message)) return false;
  }
  const captureSeq = publication.values["reservedAt"], capture = natural(captureSeq) ? factOf(given.own, given.resolved.at, captureSeq) : null;
  const selected = capture && captureAt(given.state, given.own, capture, given.resolved.bounds), rows = batches(given.state, operationFact);
  if (!selected || !rows || !same(selected.ref, binding.subject.publication) || !same(selected.operation, operationFact)
    || !same(binding.policyGeneration, { rules: selected.view.rules, seq: selected.view.revision })
    || !same(binding.serviceGeneration, selected.view.serviceGeneration) || !same(binding.roomService, selected.view.policy.roomService)
    || !selected.checks.some(check => check.name === name && check.configuration === configuration && checkStageV13(check) === "landing"
      && checkSourceV13(check) === binding.source && same(check.checker, binding.checker)) || rows.length >= selected.total) return false;
  if (rows.some((row, n) => row.record.ordinal !== n || row.record.total !== selected.total || !same(row.record.capture, selected.capture)
    || !evidenceFundedBatchV17(given.state, given.own, row.item, given.resolved.bounds))) return false;
  // A proved selected carrier is enough for this job's admission. Later
  // sibling carriers do not confer authority on the selected descriptor.
  if (rows.some(row => row.record.checks.some(check => check.name === name && check.configuration === configuration))) return false;
  let dispatch: Entry | null = null;
  if (rows.length) dispatch = given.own(rows[rows.length - 1]!.item.id)?.entry ?? null;
  else {
    const openings = selected.source.effects.filter(effect => effect.effect === "operation" && effect.owner === "platform:destination@17" && effect.kind === EVIDENCE_FUNDING_V17);
    const opening = openings.length === 1 ? openings[0] : null, original = opening?.effect === "operation" ? given.state.operation(`${selected.source.seq}:${opening.k}`) : null;
    if (!original || original.for !== publication.id || original.most !== 1 || !evidenceOperationOpeningV17(selected.source, original)
      || !original.attempts.some(attempt => attempt.attempt === 1 && attempt.opened === selected.source.seq)) return false;
    if (!operationSettled(original)) return original.sent !== true;
    const confirmed = original.attempts.flatMap(attempt => attempt.outcomes).find(outcome => outcome.result === "confirmed");
    const sealed = confirmed && given.own(confirmed.seq);
    if (!sealed || !same(factOf(given.own, given.resolved.at, sealed.entry.seq), { at: given.resolved.at, seq: sealed.entry.seq, hash: sealed.hash })
      || sealed.entry.input.type !== "outcome" || sealed.entry.input.operation !== original.id || sealed.entry.input.attempt !== 1
      || sealed.entry.input.owner !== "platform:destination@17" || sealed.entry.input.kind !== EVIDENCE_FUNDING_V17 || sealed.entry.input.result !== "confirmed"
      || sealed.entry.input.evidence.basis !== "own-answer" || !isRecord(sealed.entry.input.evidence.body) || !same(sealed.entry.input.evidence.body["capture"], selected.capture)) return false;
    dispatch = sealed.entry;
  }
  const request = fundRequest(given.resolved.at, { publication: selected.ref, operation: selected.operation, capture: selected.capture }, rows.length);
  const sends = dispatch?.sends.filter(send => same(send.to, request.to) && same(send.message, request.message)) ?? [];
  const sent = sends.length === 1 ? sends[0] : null, retained = dispatch && sent ? given.state.request(dispatch.seq, sent.n) : null;
  return !!dispatch && !!sent && !!retained && retained.hash === entryHash(dispatch) && retained.type === "tell"
    && same(retained.to, given.resolved.at) && retained.result === null && retained.diagnosis?.finding !== "undelivered";
}
function fundingProposal(given: RuleGiven): EvidenceBatchRecordV17 | null {
  if (given.input.type !== "delivery" || given.input.message.class !== "request" || given.input.message.type !== "tell") return null;
  // Preview the one implicit open and actual stored initial record. No
  // future hash is needed to prove the already sealed incoming send.
  const publication = localFact(given, "publication"), operation = localFact(given, "operation"), capture = localFact(given, "capture"), ordinal = given.resolved.fields["ordinal"];
  if (!publication || !operation || !capture || !natural(ordinal)) return null;
  const selected = captureAt(given.state, given.own, capture, given.resolved.bounds);
  if (!selected || !carrierPublication(given.state, given.own, selected.ref) || !same(publication, selected.ref)
    || !same(operation, selected.operation) || ordinal >= selected.total) return null;
  if (selected.checks.some(check => checkStageV13(check) === "published") && !certifiedWrittenPlanBudgetV17(given.resolved.bounds).admitted) return null;
  const batch = readEvidenceBatchV17({ v: 1, publication, operation, capture, ordinal, total: selected.total,
    touched: selected.touched, checks: selected.checks.slice(ordinal * 8, ordinal * 8 + 8), policy: selected.view, jobs: [], planAt: null });
  if (!batch) return null;
  const preview: Entry = { v: 1, at: given.resolved.at, seq: given.resolved.self, prev: null, time: given.time, clamped: false, epoch: 0,
    input: { ...given.input, message: given.input.message, decision: "applied" }, uses: [], prepared: [], effects: [{ effect: "open", item: given.resolved.self, type: "evidence-batch", state: "funded" },
      { effect: "value", item: given.resolved.self, slot: "batch", value: evidenceBatchWireV17(batch) }], sends: [] };
  return batchAt(given.state, given.own, preview, given.resolved.bounds, 0);
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
  if (!plan || !publication || !same(factOf(own, plan.publication.at, plan.publication.seq), plan.publication)
    || !same(factOf(own, plan.receipt.at, plan.receipt.seq), plan.receipt) || !same(publication.refs["operation"], plan.operation)
    || !receipt || receipt.type !== "receipt" || receipt.state !== "written" || (receipt.refs["publication"] ?? receipt.values["publication"]) !== publication.id
    || receipt.values["commit"] !== publication.values["integration"] || !written || written.entry.input.type !== "outcome"
    || written.entry.input.owner !== "platform:destination@17" || !["receipt", "read"].includes(written.entry.input.kind) || written.entry.input.result !== "confirmed"
    || !written.entry.effects.some(effect => effect.effect === "state" && effect.item === receipt.id && effect.state === "written")) return null;
  return item && item.type === "published-plan" && item.state === "pending" && plan && rows && rows.length === plan.total && selected && selected.item.id === operation.for
    && evidenceOperationOpeningV17(opening!.entry, operation)
    ? { item, plan, rows, selected } : null;
}
/** Host can acknowledge only the actual pending plan fact, never a fabricated job. */
export function destinationPublishedChecksPending(state: StateView, own: Own, operation: Operation): { plan: FactRef } | null {
  const selected = planFor(state, own, operation);
  const plan = selected && factOf(own, selected.plan.publication.at, selected.item.id);
  return plan ? { plan } : null;
}
function receiptPublicationKey(result: OutcomeGives): OutcomeGives {
  const opened = result.effects.filter(effect => effect.effect === "open" && effect.type === "receipt");
  if (!opened.length) return result;
  if (opened.length !== 1 || opened[0]!.effect !== "open") throw Error("A publication opened more than one receipt");
  const receipt = opened[0]!.item, links = result.effects.filter(effect => effect.effect === "value" && effect.item === receipt && effect.slot === "publication");
  if (!links.length) return result; // The first-head receipt keeps publication unset and only the metadata default.
  if (links.length !== 1 || links[0]!.effect !== "value" || !natural(links[0]!.value) || links[0]!.value === 0) throw Error("A receipt lost its positive publication identity");
  return { ...result, effects: [...result.effects, { effect: "value", item: receipt, slot: "publicationKey", value: links[0]!.value }] };
}
function writtenPlan(given: RuleGiven, result: OutcomeGives) {
  const writes = result.effects.filter((effect): effect is Extract<RuleEffect, { effect: "state" }> => effect.effect === "state" && effect.state === "written");
  if (!writes.length) return null;
  if (writes.length !== 1) throw Error("A publication wrote more than one receipt");
  const receipt = given.state.item(writes[0]!.item), publicationId = receipt?.refs["publication"] ?? receipt?.values["publication"];
  const publication = typeof publicationId === "number" ? given.state.item(publicationId) : null;
  if (!receipt || !publication || publication.type !== "publication") return null;
  const rows = publishedRows(given.state, publication);
  // A written receipt may precede its original NEW WORK carriers. The
  // final carrier then opens the same plan from this actual written proof.
  if (!rows) return null;
  if (!rows.length || rows.some(row => row.record.planAt !== null)) return null;
  const ref = factOf(given.own, given.resolved.at, receipt.id), manifest = publication.refs["manifest"];
  if (!ref || !isFactRef(manifest)) throw Error("The written publication has no exact receipt or manifest");
  const first = rows[0]!, holder = completeRows(given.state, publication)?.find(row => row.record.ordinal === 0);
  if (!holder || !evidenceFundedBatchV17(given.state, given.own, holder.item, given.resolved.bounds)) throw Error("The written plan has no original funded holder");
  if (planScheduled(given.state, given.own, holder.item.id)) return null;
  return { publication: first.record.publication, operation: first.record.operation, receipt: ref, manifest, holder: holder.item.id };
}
function appendWrittenPlan(given: RuleGiven, result: OutcomeGives): OutcomeGives {
  const effects = [...result.effects];
  for (const effect of result.effects) if (effect.effect === "state" && effect.state === "written") {
    const receipt = given.state.item(effect.item), publication = receipt?.values["publication"];
    if (receipt?.type === "receipt" && natural(publication) && publication > 0 && given.state.item(publication)?.type === "publication")
      effects.push({ effect: "value", item: receipt.id, slot: "evidenceWrittenAt", value: given.resolved.self });
  }
  const plan = writtenPlan(given, result);
  if (plan && !certifiedWrittenPlanBudgetV17(given.resolved.bounds).admitted) throw Error("The published check plan exceeds its future carrying entry");
  return plan ? { ...result,
    effects: [...effects, { effect: "value", item: plan.holder, slot: "planOpenedAt", value: given.resolved.self }],
    opens: [...result.opens, { owner: "platform:destination@17", kind: EVIDENCE_PLAN_V17, attempts: 1, for: plan.holder }] } : { ...result, effects };
}
function planOpening(state: StateView, own: Own, operation: Operation) {
  if (operation.owner !== "platform:destination@17" || operation.kind !== EVIDENCE_PLAN_V17 || operation.most !== 1 || operation.for === undefined) return null;
  const at = state.scope()?.at, entry = own(Number(operation.id.split(":")[0]));
  const holder = state.item(operation.for), batch = holder && batchValue(holder);
  if (!at || !entry || !holder || holder.type !== "evidence-batch" || holder.state !== "funded" || !batch || batch.ordinal !== 0
    || holder.values["planOpenedAt"] !== entry.entry.seq
    || !same(factOf(own, at, entry.entry.seq), { at, seq: entry.entry.seq, hash: entry.hash }) || !evidenceOperationOpeningV17(entry.entry, operation)
    || !entry.entry.effects.some(effect => effect.effect === "value" && effect.item === holder.id && effect.slot === "planOpenedAt" && effect.value === entry.entry.seq)
    || !planScheduled(state, own, holder.id)) return null;
  const publication = state.item(batch.publication.seq), proof = publication && writtenReceipt(state, own, publication);
  if (!publication || publication.type !== "publication" || !same(factOf(own, at, publication.id), batch.publication)
    || !same(publication.refs["operation"], batch.operation) || !isFactRef(publication.refs["manifest"]) || !proof
    || !captureSource(state, own, batch.capture)) return null;
  if (entry.entry.input.type === "outcome") {
    if (entry.entry.input.owner !== "platform:destination@17" || !["receipt", "read"].includes(entry.entry.input.kind)
      || entry.entry.input.result !== "confirmed" || proof.written.seq !== entry.entry.seq) return null;
  } else {
    const input = entry.entry.input, last = state.item(entry.entry.seq), funded = last && batchValue(last);
    const birth = entry.entry.effects.filter(effect => effect.effect === "value" && effect.item === entry.entry.seq && effect.slot === "batch");
    const initial = birth.length === 1 && birth[0]!.effect === "value" ? readEvidenceBatchWireV17(birth[0]!.value) : null;
    const fields = input.type === "delivery" && input.message.class === "request" && isRecord(input.message.body) && isRecord(input.message.body["fields"]) ? input.message.body["fields"] : null;
    if (input.type !== "delivery" || input.message.class !== "request" || input.message.type !== "tell" || !("decision" in input) || input.decision !== "applied"
      || !same(input.from.at, at) || !isRecord(input.message.body) || input.message.body["message"] !== "evidence-fund"
      || !fields || Object.keys(fields).sort().join() !== "capture,operation,ordinal,publication" || !last || last.type !== "evidence-batch" || last.state !== "funded" || last.opened !== entry.hash
      || !funded || !initial || !same(immutableBatch(initial), immutableBatch(funded)) || initial.jobs.length !== 0 || initial.planAt !== null
      || !same(fields["publication"], batch.publication) || !same(fields["operation"], batch.operation) || !same(fields["capture"], batch.capture) || fields["ordinal"] !== funded.ordinal
      || funded.ordinal + 1 !== funded.total || !same(funded.publication, batch.publication) || !same(funded.capture, batch.capture)
      || proof.written.seq >= entry.entry.seq) return null;
    const sender = own(input.from.seq), sent = sender?.entry.sends.find(send => send.n === input.n);
    if (!sender || !same(factOf(own, at, input.from.seq), input.from) || !sent || !same(sent.to, at) || !same(sent.message, input.message)) return null;
  }
  return { batch, publication, receipt: proof.receipt, written: proof.written, manifest: publication.refs["manifest"] };
}
export function destinationEvidencePlanPending(state: StateView, own: Own, operation: Operation): { written: FactRef } | null {
  try { const source = planOpening(state, own, operation); return source ? { written: source.written } : null; } catch { return null; }
}
function planProposal(given: RuleGiven): { plan: PublishedPlanV17; accounts: NonNullable<ReturnType<typeof completeRows>>; holder: number } | null {
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
  if (!accounts || !rows?.length || accounts.some(row => row.record.planAt !== null || !evidenceFundedBatchV17(given.state, given.own, row.item, given.resolved.bounds))
    || !holder || holder.id !== accounts[0]!.item.id) return null;
  const original = given.state.operation(source.entry.input.operation), opening = original && planOpening(given.state, given.own, original);
  if (!original || !opening || original.for !== holder.id || !same(opening.written, w) || !same(opening.receipt, r)) return null;
  const manifestEntry = given.uses.find(use => same(use.fact, m))?.entry, base = manifestEntry?.input.type === "act" ? manifestEntry.input.signed.intent.fields["base"] : null;
  if (!isObjectId(base)) return null;
  return { plan: { v: 1, publication: p, receipt: r, written: w.seq, operation: operation as FactRef, base, cursor: 0, total: rows.length }, accounts, holder: holder.id };
}
function planEffects(given: RuleGiven, value: NonNullable<ReturnType<typeof planProposal>>): readonly RuleEffect[] {
  const effects: RuleEffect[] = [{ effect: "open", item: given.resolved.self, type: "published-plan", state: "pending" },
    { effect: "value", item: given.resolved.self, slot: "plan", value: planWire(value.plan) },
    ...value.accounts.map(row => ({ effect: "value" as const, item: row.item.id, slot: "batch", value: evidenceBatchWireV17({ ...row.record, planAt: given.resolved.self }) }))];
  const firstPublished = value.accounts.find(row => row.record.checks.some(check => checkStageV13(check) === "published"));
  if (!firstPublished) throw Error("The published plan has no check account");
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
    receives[name] = { ...old, ...(name === "check-fence" ? { fields: { ...old.fields, binding: { type: "code", code: "evidence-fence-binding-v17", row: "E5", required: true } } } : {}), also: { ...old.also, batch: { item: "evidence-batch", index: "operation", key: "operation", code: "evidence-batch-select-v17", row: "E5" } },
      bound: { of: "also.batch", where: [{ equals: { a: { sender: true }, b: { slot: "lane", of: "also.batch" } } }] },
      effects: old.effects.map(effect => "code" in effect && effect.code === "evidence-open-v17" ? { ...effect, most: { ...effect.most!, effects: effect.most!.effects + 1 } } : effect) };
  }
  receives["evidence-fund"] = { message: "evidence-fund", class: "tell", from: { kind: "destination", under: "platform:destination" }, opens: "evidence-batch", also: {},
    fields: { publication: { type: "fact", kind: ["reserve"], under: "platform:destination", required: true }, operation: { type: "fact", kind: ["merge"], under: "change", required: true },
      capture: { type: "fact", kind: ["platform:destination@17:judge", "platform:destination@17:read"], under: "platform:destination", required: true }, ordinal: { type: "int", min: 0, max: 3, required: true } },
    guards: [{ code: "evidence-fund-v17", row: "E5" }], effects: [{ code: "evidence-fund-open-v17", row: "E5", most: { effects: 16, operations: [EVIDENCE_PLAN_V17] } }], sends: [{ code: "evidence-funding-ready-v17", row: "E5", result: {} }], attention: [] };
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
  for (const name of ["judge", "push", "read", "receipt"]) {
    const old = outcomes[name]; if (!old?.most) continue;
    const extra = name === "judge" ? [EVIDENCE_FUNDING_V17] : name === "read" ? [EVIDENCE_FUNDING_V17, EVIDENCE_PLAN_V17] : name === "receipt" ? [EVIDENCE_PLAN_V17] : [];
    outcomes[name] = { ...old, most: { ...old.most, effects: name === "push" ? old.most.effects : 16, operations: [...new Set([...(old.most.operations ?? []), ...extra])] } };
  }
  return { ...base, receives, items: { ...base.items,
    receipt: { ...base.items["receipt"]!, indexes: [...new Set([...(base.items["receipt"]!.indexes ?? []), "publicationKey"])], values: { ...base.items["receipt"]!.values,
      publicationKey: { fixed: true, required: true, of: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER }, default: 0 },
      evidenceWrittenAt: { fixed: false, required: false, of: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER } } } },
    publication: { ...publication, holds: { ...publication.holds!, operations: { ...publication.holds?.operations, [EVIDENCE_FUNDING_V17]: 1 }, decisions: publicationDecisions, requests: (publication.holds?.requests ?? 0) + 5 } },
    "evidence-batch": { many: true, max: 8192, initial: "funded", states: { funded: { final: false } }, parties: {},
      refs: { operation: { fixed: true, required: true, to: { type: "fact", kind: ["merge"], under: "change" } }, lane: { fixed: true, required: true, to: { type: "scope", kind: "lane" } } },
      indexes: ["operation", "policyKey"], holds: { operations: { "evidence-admit": 8, "evidence-result": 8, "evidence-notice": 8, "evidence-progress": 16, "evidence-audit": 8, [EVIDENCE_PLAN_V17]: 1, "published-checks": 8 }, requests: 59, items: 25, decisions: { "check-fence": 8, checked: 8, "evidence-plan-open": 1 } },
      values: { batch: { fixed: false, required: true, of: { type: "code", code: "evidence-batch-record-v17", row: "E5" } },
        capacity: { fixed: false, required: true, of: { type: "code", code: "evidence-capacity-anchor-v17", row: "E5" } }, policyKey: { fixed: true, required: true, of: { type: "digest" } },
        planOpenedAt: { fixed: false, required: false, of: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER } } } },
    "published-plan": { many: true, max: 2048, initial: "pending", states: { pending: { final: false }, complete: { final: true } }, parties: {}, refs: {},
      values: { plan: { fixed: false, required: true, of: { type: "code", code: "evidence-published-plan-v17", row: "E5" } } } },
  }, outcomes: { ...outcomes,
    [EVIDENCE_FUNDING_V17]: { code: "evidence-funding-outcome-v17", row: "E5", attempts: 1, origin: "rule", most: { effects: 0, operations: [] }, send: { code: "evidence-funding-dispatch-v17", row: "E5", once: true, result: {} } },
    [EVIDENCE_PLAN_V17]: { code: "evidence-plan-outcome-v17", row: "E5", attempts: 1, origin: "rule", most: { effects: 0, operations: [] }, send: { code: "evidence-plan-dispatch-v17", row: "E5", once: true, result: {} } },
    [PUBLISHED_CHECKS_V17]: { code: "evidence-published-checks-v17", row: "E5", attempts: 1, origin: "rule", most: { effects: 2, operations: [PUBLISHED_CHECKS_V17] }, send: { code: "evidence-published-dispatch-v17", row: "E5", once: true, result: {} } } } };
}
export function fundingRules(base: Rules, hooks: FundingHooksV17): Rules {
  const fence = base["evidence-fence-v17"], open = base["evidence-open-v17"];
  if (fence?.place !== "guard" || open?.place !== "effect") throw Error("Funding requires the G17 fence rules");
  const next: Record<string, Rules[string]> = { ...base };
  // The receive's `opens` adds this before the code effects. Quote it once,
  // but leave its emission to deriveEffects so the carrying entry has one open.
  const implicitBatchOpen = (given: RuleGiven): RuleEffect => ({ effect: "open", item: given.resolved.self, type: "evidence-batch", state: "funded" });
  const dispatch = (given: RuleGiven, batch: EvidenceBatchRecordV17): RuleRequest | null => batch.ordinal + 1 < batch.total
    ? fundRequest(given.resolved.at, batch, batch.ordinal + 1) : null;
  // Only the final actual carrier may catch up an already written receipt.
  // The receipt callback uses the same marker when carriers won the race.
  const latePlan = (given: RuleGiven, batch: EvidenceBatchRecordV17): RuleEffect[] => {
    if (batch.ordinal + 1 !== batch.total) return [];
    const prior = batches(given.state, batch.operation), publication = given.state.item(batch.publication.seq);
    if (!prior || !publication || !writtenReceipt(given.state, given.own, publication)) return [];
    const rows = [...prior.map(row => row.record), batch].sort((a, b) => a.ordinal - b.ordinal);
    if (rows.length !== batch.total || rows.some((row, n) => row.ordinal !== n || row.total !== batch.total
      || !same(row.capture, batch.capture) || !same(row.publication, batch.publication))
      || !rows.some(row => row.checks.some(check => checkStageV13(check) === "published")) || rows.some(row => row.planAt !== null)) return [];
    const holder = prior.find(row => row.record.ordinal === 0)?.item.id ?? given.resolved.self;
    if (planScheduled(given.state, given.own, holder)) return [];
    return [{ effect: "value", item: holder, slot: "planOpenedAt", value: given.resolved.self },
      { effect: "operation", k: 0, owner: "platform:destination@17", kind: EVIDENCE_PLAN_V17, attempts: 1, for: holder },
      { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null }];
  };
  const funded = (given: RuleGiven) => {
    const batch = fundingProposal(given);
    if (!batch) return null;
    const rows = batches(given.state, batch.operation);
    if (!rows || rows.some(row => row.record.ordinal === batch.ordinal || !same(row.record.capture, batch.capture)
      || !evidenceFundedBatchV17(given.state, given.own, row.item, given.resolved.bounds))) return null;
    const capacity = hooks.fundCapacity(given, batch);
    if (!capacity || !hooks.capacityValid(capacity.capacity)) return null;
    const effects: RuleEffect[] = [...capacity.effects,
      { effect: "ref", item: given.resolved.self, slot: "operation", to: batch.operation }, { effect: "ref", item: given.resolved.self, slot: "lane", to: batch.operation.at },
      { effect: "value", item: given.resolved.self, slot: "batch", value: evidenceBatchWireV17(batch) },
      { effect: "value", item: given.resolved.self, slot: "capacity", value: capacity.capacity }, { effect: "value", item: given.resolved.self, slot: "policyKey", value: capacity.policyKey }];
    effects.push(...latePlan(given, batch));
    const request = dispatch(given, batch);
    return evidenceCarryingBudgetV17(given, [implicitBatchOpen(given), ...effects], [], request ? [request] : [], []).admitted ? { batch, ...capacity } : null;
  };
  next["evidence-fence-binding-v17"] = { place: "type", clock: true, run: (given, value) => {
    const binding = readBindingTextV17(value, given.resolved.fields["bindingDigest"]);
    if (!binding) return false;
    if (landingCarrierPending(given, binding)) throw new RuleFault("The original landing carrier setup is still pending");
    return true;
  } };
  next["evidence-fund-v17"] = { place: "guard", refusals: ["evidence-funding-unavailable"], run: given => funded(given) ? { holds: true } : { holds: false, name: "evidence-funding-unavailable" } };
  next["evidence-fund-open-v17"] = { place: "effect", most: 16, run: given => {
    const value = funded(given); if (!value) throw Error("A funding request lost its capacity proof");
    const effects: RuleEffect[] = [...value.effects,
      { effect: "ref", item: given.resolved.self, slot: "operation", to: value.batch.operation }, { effect: "ref", item: given.resolved.self, slot: "lane", to: value.batch.operation.at },
      { effect: "value", item: given.resolved.self, slot: "batch", value: evidenceBatchWireV17(value.batch) },
      { effect: "value", item: given.resolved.self, slot: "capacity", value: value.capacity }, { effect: "value", item: given.resolved.self, slot: "policyKey", value: value.policyKey }];
    effects.push(...latePlan(given, value.batch));
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
    return selected.ok ? items.find(item => batchValue(item)?.ordinal === selected.record.ordinal)?.id ?? null : null;
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
  for (const name of ["push", "deciding-read"]) {
    const rule = next[name];
    if (rule?.place !== "outcome" || !rule.rules.derives || !rule.rules.most) continue;
    next[name] = { ...rule, rules: { ...rule.rules, derives: (given, operation, selected) => receiptPublicationKey(rule.rules.derives!(given, operation, selected)) } };
  }
  for (const name of ["judge", "deciding-read"]) {
    const rule = next[name];
    if (rule?.place !== "outcome" || !rule.rules.derives) continue;
    const most = rule.rules.most; if (!most) throw Error("Funding requires the capture's complete finite budget");
    next[name] = { ...rule, rules: { ...rule.rules, most: { ...most, effects: name === "judge" ? 16 : most.effects, operations: most.operations + 1 },
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
  for (const name of ["receipt", "deciding-read"]) {
    const rule = next[name];
    if (rule?.place === "outcome" && rule.rules.derives) {
      const most = rule.rules.most;
      if (!most) throw Error("Funding requires the receipt/read's complete finite budget");
      next[name] = { ...rule, rules: { ...rule.rules, most: { ...most, effects: name === "receipt" ? most.effects + 4 : most.effects, operations: most.operations + 1 }, derives: (given, operation, selected) => appendWrittenPlan(given, rule.rules.derives!(given, operation, selected)) } };
    }
  }
  next["evidence-funding-outcome-v17"] = { place: "outcome", rules: { selects: false, read: false, retries: () => false,
    most: { effects: 0, requests: 1, operations: 0 }, origin: (_given, operation) => Number(operation.id.split(":")[0]), unknown: () => ({}),
    wellFormed: (result, evidence, given) => {
      if (result !== "confirmed") return isRecord(evidence.body) && Object.keys(evidence.body).length === 0;
      const operation = given.input.type === "outcome" ? given.state.operation(given.input.operation) : null;
      const pending = operation && destinationEvidenceFundingPending(given.state, given.own, operation);
      return evidence.basis === "own-answer" && isRecord(evidence.body) && Object.keys(evidence.body).join() === "capture" && !!pending && same(evidence.body["capture"], pending.capture);
    }, derives: () => ({ effects: [], sends: [], opens: [] }) } };
  next["evidence-funding-dispatch-v17"] = { place: "send", run: given => {
    if (given.input.type !== "outcome" || given.input.result !== "confirmed") return null;
    const operation = given.state.operation(given.input.operation), pending = operation && destinationEvidenceFundingPending(given.state, given.own, operation);
    const source = pending && captureAt(given.state, given.own, pending.capture, given.resolved.bounds);
    return source ? fundRequest(given.resolved.at, { publication: source.ref, operation: source.operation, capture: source.capture }, 0) : null;
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
      ...(cursor === plan.total ? [{ effect: "state" as const, item: current.item.id, state: "complete" }] : [])],
      sends: [{ to: plan.operation.at, message: { class: "request", type: "tell", body: { message: "admit-published-check", fields: {
        operation: plan.operation, manifest: binding.subject.manifest, name: check.name, configuration: check.configuration,
        commit: publication.values["integration"], tree: publication.values["tree"], base: plan.base,
        checker: check.checker, binding: canonicalize(binding), bindingDigest: evidenceBindingDigest(binding),
      } } } }], opens: following ? [{ owner: "platform:destination@17", kind: PUBLISHED_CHECKS_V17, attempts: 1, for: following.item.id }] : [] };
  };
  next["evidence-published-checks-v17"] = { place: "outcome", rules: { selects: false, read: false, retries: () => false,
    most: { effects: 3, requests: 1, operations: 1 }, origin: (_given, operation) => Number(operation.id.split(":")[0]), unknown: () => ({}),
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
      for (let n = 0; n < 5 && source; n++) {
        positions.add(source.seq);
        if (source.input.type === "delivery" && source.input.message.class === "request" && isRecord(source.input.message.body)
          && source.input.message.body["message"] === "evidence-fund") { fact(source.input.from); source = own(source.input.from.seq)?.entry; }
        else if (source.input.type === "outcome" && source.input.kind === EVIDENCE_FUNDING_V17) {
          positions.add(Number(source.input.operation.split(":")[0])); break;
        } else throw Error("A retained funding source chain is malformed");
      }
      positions.add(0);
      fact(batch.policy.certificate.request); fact(batch.policy.certificate.certificate);
      if (batch.planAt !== null) positions.add(batch.planAt);
      const marker = item.values["planOpenedAt"];
      if (marker !== undefined && marker !== null) {
        if (!natural(marker)) throw Error("A plan opening marker is malformed");
        positions.add(marker);
        const receipts = snapshot.items.filter(receipt => receipt.type === "receipt" && receipt.values["publication"] === batch.publication.seq);
        if (receipts.length !== 1 || receipts[0]!.state !== "written") throw Error("A plan opening lost its exact written receipt");
        const writtenAt = receipts[0]!.values["evidenceWrittenAt"];
        if (!natural(writtenAt)) throw Error("A plan opening lost its written position");
        positions.add(receipts[0]!.id); positions.add(writtenAt);
      }
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
