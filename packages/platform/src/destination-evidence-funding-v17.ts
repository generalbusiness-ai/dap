/** G17 new-work funding and serial, post-write published checks.
 * A self request opens each holder. Outcomes open only nonholder cursors. */
import type { Digest, FactRef, FieldValue, PlatformData } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, evidenceBindingDigest, isFactRef, isRecord, same } from "@generalbusiness/dap-bytes";
import { operationOpening, type Item, type Operation, type OutcomeGives, type Own, type RuleEffect, type RuleGiven, type RuleRequest, type Rules, type StateSnapshot, type StateView } from "@generalbusiness/dap-derive";
import { claimEvidenceBatchJobV17, obligationChecksV17, readEvidenceBatchV17, readEvidenceBatchWireV17, evidenceBatchWireV17, selectEvidenceBatchV17, type EvidenceBatchRecordV17 } from "./evidence-batch-v17.ts";
import { certifiedPublicationStateWireV17, CERTIFIED_PUBLICATION_TEXT_BYTES_V17, evidenceCarryingBudgetV17, type CertifiedPublicationStateV17 } from "./destination-budget-v17.ts";
import { readRulesPolicyObservationV17 } from "./reservation-v17.ts";
import { isObjectId } from "./reservation.ts";
import { readEvidenceWireV17, evidenceWireV17 } from "./evidence-wire-v17.ts";
import { checkSourceV13, checkStageV13 } from "./rules-policy-v13.ts";

export const PUBLISHED_CHECKS_V17 = "published-checks";
export interface FundingHooksV17 {
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
const batchValue = (item: Pick<Item, "values">) => readEvidenceBatchWireV17(item.values["batch"]);
function batches(state: StateView, operation: FactRef): { item: Item; record: EvidenceBatchRecordV17 }[] | null {
  const ids = state.lookup("evidence-batch", "operation", canonicalize(operation), 5);
  if (!ids || ids.length > 4) return null;
  const rows: { item: Item; record: EvidenceBatchRecordV17 }[] = [];
  for (const id of ids) {
    const item = state.item(id), record = item && batchValue(item);
    if (!item || !record || !same(record.operation, operation)) return null;
    rows.push({ item, record });
  }
  return rows.sort((a, b) => a.record.ordinal - b.record.ordinal);
}
function completeRows(state: StateView, publication: Item): ReturnType<typeof batches> {
  const operation = publication.refs["operation"];
  if (!isFactRef(operation)) return null;
  const rows = batches(state, operation);
  if (!rows?.length) return null;
  const first = rows[0]!.record;
  return rows.length === first.total && rows.every((row, n) => row.record.ordinal === n && row.record.total === first.total
    && row.record.publication.seq === publication.id && same(row.record.publication, first.publication)
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
function captured(given: RuleGiven, publication: Item, snapshot: CertifiedPublicationStateV17) {
  const policy = snapshot.policy, read = readRulesPolicyObservationV17(policy.observation, policy.input, policy.observation.at);
  const selected = read.ok ? obligationChecksV17(read.view.policy, policy.touched) : null;
  const ref = factOf(given.own, given.resolved.at, publication.id), operation = publication.refs["operation"];
  return read.ok && selected?.ok && ref && isFactRef(operation) ? { ref, operation, view: read.view, checks: selected.checks, touched: policy.touched } : null;
}
/** Called by the reservation capture, with the exact snapshot it is writing. */
export function evidenceFundingRequestsV17(given: RuleGiven, publication: Item, snapshot: CertifiedPublicationStateV17) {
  const selected = captured(given, publication, snapshot);
  if (!selected) throw Error("The captured funding policy is unavailable");
  return Array.from({ length: Math.ceil(selected.checks.length / 8) }, (_, ordinal) => ({ to: given.resolved.at,
    message: { class: "request" as const, type: "tell" as const, body: { message: "evidence-fund", fields: {
      publication: selected.ref, operation: selected.operation, capture: { self: true }, ordinal,
    } } } }));
}
function fundingProposal(given: RuleGiven): EvidenceBatchRecordV17 | null {
  if (given.input.type !== "delivery" || given.input.message.class !== "request" || given.input.message.type !== "tell"
    || !same(given.input.from.at, given.resolved.at)) return null;
  const { publication, operation, capture, ordinal } = given.resolved.fields;
  if (!isFactRef(publication) || !isFactRef(operation) || !isFactRef(capture) || !natural(ordinal) || ordinal > 3
    || !same(publication.at, given.resolved.at) || !same(capture, given.input.from)) return null;
  const birth = given.own(0), source = given.own(capture.seq), item = given.state.item(publication.seq);
  if (!birth || birth.entry.input.type !== "genesis" || birth.entry.input.seed.definition !== "platform:destination@17"
    || !source || source.entry.input.type !== "outcome" || source.entry.input.owner !== "platform:destination@17"
    || !["judge", "read"].includes(source.entry.input.kind) || source.entry.input.result !== "confirmed"
    || !source.entry.effects.some(effect => effect.effect === "state" && effect.item === publication.seq && effect.state === "reserved")
    || !same(factOf(given.own, given.resolved.at, capture.seq), capture) || !same(factOf(given.own, given.resolved.at, publication.seq), publication)
    || !item || item.type !== "publication" || !same(item.refs["operation"], operation)) return null;
  // The actual retained self-send is the authority; a caller cannot synthesize a batch.
  const actual = source.entry.sends.find(send => send.n === (given.input.type === "delivery" ? given.input.n : -1));
  if (!actual || !same(actual.to, given.resolved.at) || actual.message.class !== "request" || actual.message.type !== "tell"
    || !isRecord(actual.message.body) || actual.message.body["message"] !== "evidence-fund" || !isRecord(actual.message.body["fields"])) return null;
  const fields = actual.message.body["fields"];
  if (Object.keys(fields).sort().join() !== "capture,operation,ordinal,publication" || !same(fields["publication"], publication)
    || !same(fields["operation"], operation) || fields["ordinal"] !== ordinal || !same(fields["capture"], { self: true })) return null;
  const writes = source.entry.effects.filter(effect => effect.effect === "value" && effect.item === item.id && effect.slot === "passes");
  const write = writes.length === 1 ? writes[0] : null;
  const snapshot = write?.effect === "value" ? certifiedPublicationStateWireV17(write.value, given.resolved.bounds) : null;
  const selected = snapshot && captured(given, item, snapshot);
  if (!selected || !same(selected.ref, publication) || ordinal >= Math.ceil(selected.checks.length / 8)) return null;
  return readEvidenceBatchV17({ v: 1, publication, operation, capture, ordinal, total: Math.ceil(selected.checks.length / 8),
    touched: selected.touched, checks: selected.checks.slice(ordinal * 8, ordinal * 8 + 8), policy: selected.view, jobs: [], planAt: null });
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
    && opening!.entry.effects.some(effect => effect.effect === "operation" && effect.for === operation.for && effect.kind === PUBLISHED_CHECKS_V17 && effect.owner === operation.owner)
    ? { item, plan, rows, selected } : null;
}
/** Host can acknowledge only the actual pending plan fact, never a fabricated job. */
export function destinationPublishedChecksPending(state: StateView, own: Own, operation: Operation): { plan: FactRef } | null {
  const selected = planFor(state, own, operation);
  const plan = selected && factOf(own, selected.plan.publication.at, selected.item.id);
  return plan ? { plan } : null;
}
function appendWrittenPlan(given: RuleGiven, result: OutcomeGives): OutcomeGives {
  const writes = result.effects.filter((effect): effect is Extract<RuleEffect, { effect: "state" }> => effect.effect === "state" && effect.state === "written");
  if (!writes.length) return result;
  if (writes.length !== 1) throw Error("A publication wrote more than one receipt");
  const receipt = given.state.item(writes[0]!.item), publicationId = receipt?.refs["publication"] ?? receipt?.values["publication"];
  const publication = typeof publicationId === "number" ? given.state.item(publicationId) : null;
  if (!receipt || !publication || publication.type !== "publication") return result;
  const rows = publishedRows(given.state, publication);
  if (!rows) {
    if (evidenceFundingCompleteV17(given.state, publication)) return result;
    throw Error("The written publication has no complete funding accounts");
  }
  if (!rows.length || rows.some(row => row.record.planAt !== null)) return result;
  const ref = factOf(given.own, given.resolved.at, receipt.id), manifest = publication.refs["manifest"];
  if (!ref || !isFactRef(manifest)) throw Error("The written publication has no exact receipt or manifest");
  const first = rows[0]!;
  // The written entry keeps its legacy single possible opened type. This
  // bounded self-delivery opens the nonholder cursor after its fact exists.
  return { ...result, sends: [...result.sends, { to: given.resolved.at, message: { class: "request", type: "tell", body: {
    message: "evidence-plan-open", fields: { publication: first.record.publication, operation: first.record.operation, receipt: ref,
      written: { self: true }, manifest },
  } } }] };
}
function planProposal(given: RuleGiven): { plan: PublishedPlanV17; accounts: NonNullable<ReturnType<typeof completeRows>>; holder: number } | null {
  if (given.input.type !== "delivery" || given.input.message.class !== "request" || given.input.message.type !== "tell" || !same(given.input.from.at, given.resolved.at)) return null;
  const { publication, operation, receipt, written, manifest } = given.resolved.fields;
  if (![publication, operation, receipt, written, manifest].every(isFactRef)) return null;
  const p = publication as FactRef, r = receipt as FactRef, w = written as FactRef, m = manifest as FactRef;
  if (!same(w, given.input.from) || !same(p.at, given.resolved.at) || !same(r.at, given.resolved.at)) return null;
  const item = given.state.item(p.seq), receiptItem = given.state.item(r.seq), source = given.own(w.seq), birth = given.own(0);
  if (!item || item.type !== "publication" || !receiptItem || receiptItem.type !== "receipt" || receiptItem.state !== "written"
    || !same(item.refs["operation"], operation) || !same(item.refs["manifest"], m) || (receiptItem.refs["publication"] ?? receiptItem.values["publication"]) !== item.id
    || receiptItem.values["commit"] !== item.values["integration"] || !same(factOf(given.own, given.resolved.at, p.seq), p) || !same(factOf(given.own, given.resolved.at, r.seq), r)
    || !source || !same(factOf(given.own, given.resolved.at, w.seq), w) || source.entry.input.type !== "outcome" || source.entry.input.owner !== "platform:destination@17"
    || !["receipt", "read"].includes(source.entry.input.kind) || source.entry.input.result !== "confirmed"
    || !source.entry.effects.some(effect => effect.effect === "state" && effect.item === r.seq && effect.state === "written")
    || !birth || birth.entry.input.type !== "genesis" || birth.entry.input.seed.definition !== "platform:destination@17") return null;
  const retained = source.entry.sends.find(send => send.n === (given.input.type === "delivery" ? given.input.n : -1));
  if (!retained || !same(retained.to, given.resolved.at) || retained.message.class !== "request" || retained.message.type !== "tell" || !isRecord(retained.message.body)
    || retained.message.body["message"] !== "evidence-plan-open" || !isRecord(retained.message.body["fields"])) return null;
  const fields = retained.message.body["fields"];
  if (Object.keys(fields).sort().join() !== "manifest,operation,publication,receipt,written" || !same(fields["publication"], p) || !same(fields["receipt"], r)
    || !same(fields["operation"], operation) || !same(fields["manifest"], m) || !same(fields["written"], { self: true })) return null;
  const accounts = completeRows(given.state, item), rows = publishedRows(given.state, item), holder = given.resolved.subjects.get("also.batch");
  if (!accounts || !rows?.length || accounts.some(row => row.record.planAt !== null) || !holder || holder.id !== rows[0]!.item.id) return null;
  const manifestEntry = given.uses.find(use => same(use.fact, m))?.entry, base = manifestEntry?.input.type === "act" ? manifestEntry.input.signed.intent.fields["base"] : null;
  if (!isObjectId(base)) return null;
  return { plan: { v: 1, publication: p, receipt: r, written: w.seq, operation: operation as FactRef, base, cursor: 0, total: rows.length }, accounts, holder: holder.id };
}
function planEffects(given: RuleGiven, value: NonNullable<ReturnType<typeof planProposal>>): readonly RuleEffect[] {
  const effects: RuleEffect[] = [{ effect: "open", item: given.resolved.self, type: "published-plan", state: "pending" },
    { effect: "value", item: given.resolved.self, slot: "plan", value: planWire(value.plan) },
    ...value.accounts.map(row => ({ effect: "value" as const, item: row.item.id, slot: "batch", value: evidenceBatchWireV17({ ...row.record, planAt: given.resolved.self }) }))];
  for (const effect of operationOpening(0, { owner: "platform:destination@17", kind: PUBLISHED_CHECKS_V17, attempts: 1, for: value.holder })) {
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
      capture: { type: "fact", kind: ["platform:destination@17:judge", "platform:destination@17:read"], under: "platform:destination", required: true }, ordinal: { type: "int", min: 0, max: 3, required: true } },
    guards: [{ code: "evidence-fund-v17", row: "E5" }], effects: [{ code: "evidence-fund-open-v17", row: "E5", most: { effects: 16, operations: [] } }], sends: [{ code: "evidence-funding-ready-v17", row: "E5", result: {} }], attention: [] };
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
  return { ...base, receives, items: { ...base.items,
    publication: { ...publication, values: { ...publication.values, evidenceReady: { fixed: false, required: true, of: { type: "bool" }, default: false } }, holds: { ...publication.holds!, decisions: publicationDecisions, requests: (publication.holds?.requests ?? 0) + 5 } },
    "evidence-batch": { many: true, max: 8192, initial: "funded", states: { funded: { final: false } }, parties: {},
      refs: { operation: { fixed: true, required: true, to: { type: "fact", kind: ["merge"], under: "change" } }, lane: { fixed: true, required: true, to: { type: "scope", kind: "lane" } } },
      indexes: ["operation", "policyKey"], holds: { operations: { "evidence-admit": 8, "evidence-result": 8, "evidence-notice": 8, "evidence-progress": 16, "published-checks": 8 }, requests: 58, items: 25, decisions: { "check-fence": 8, checked: 8, "evidence-plan-open": 1 } },
      values: { batch: { fixed: false, required: true, of: { type: "code", code: "evidence-batch-record-v17", row: "E5" } },
        capacity: { fixed: false, required: true, of: { type: "code", code: "evidence-capacity-anchor-v17", row: "E5" } }, policyKey: { fixed: true, required: true, of: { type: "digest" } } } },
    "published-plan": { many: true, max: 2048, initial: "pending", states: { pending: { final: false }, complete: { final: true } }, parties: {}, refs: {},
      values: { plan: { fixed: false, required: true, of: { type: "code", code: "evidence-published-plan-v17", row: "E5" } } } },
  }, outcomes: { ...outcomes, [PUBLISHED_CHECKS_V17]: { code: "evidence-published-checks-v17", row: "E5", attempts: 1, origin: "rule", most: { effects: 2, operations: [PUBLISHED_CHECKS_V17] } } } };
}
export function fundingRules(base: Rules, hooks: FundingHooksV17): Rules {
  const fence = base["evidence-fence-v17"], open = base["evidence-open-v17"];
  if (fence?.place !== "guard" || open?.place !== "effect") throw Error("Funding requires the G17 fence rules");
  const next: Record<string, Rules[string]> = { ...base };
  // The receive's `opens` adds this before the code effects. Quote it once,
  // but leave its emission to deriveEffects so the carrying entry has one open.
  const implicitBatchOpen = (given: RuleGiven): RuleEffect => ({ effect: "open", item: given.resolved.self, type: "evidence-batch", state: "funded" });
  const ready = (given: RuleGiven, batch: EvidenceBatchRecordV17): RuleRequest | null => {
    const publication = given.state.item(batch.publication.seq), previous = batches(given.state, batch.operation);
    if (!publication || !previous) return null;
    const accounts = [...previous.map(row => row.record), batch].sort((a, b) => a.ordinal - b.ordinal);
    if (accounts.length !== batch.total || accounts.some((row, n) => row.ordinal !== n || row.total !== batch.total
      || !same(row.publication, batch.publication) || !same(row.capture, batch.capture) || !same(row.policy, batch.policy))) return null;
    return hooks.readyUpdate(given, publication, accounts);
  };
  const funded = (given: RuleGiven) => {
    const batch = fundingProposal(given);
    if (!batch) return null;
    const rows = batches(given.state, batch.operation);
    if (!rows || rows.some(row => row.record.ordinal === batch.ordinal || !same(row.record.capture, batch.capture))) return null;
    const capacity = hooks.fundCapacity(given, batch);
    if (!capacity || !hooks.capacityValid(capacity.capacity)) return null;
    const effects: RuleEffect[] = [...capacity.effects,
      { effect: "ref", item: given.resolved.self, slot: "operation", to: batch.operation }, { effect: "ref", item: given.resolved.self, slot: "lane", to: batch.operation.at },
      { effect: "value", item: given.resolved.self, slot: "batch", value: evidenceBatchWireV17(batch) },
      { effect: "value", item: given.resolved.self, slot: "capacity", value: capacity.capacity }, { effect: "value", item: given.resolved.self, slot: "policyKey", value: capacity.policyKey }];
    const update = ready(given, batch);
    if (update) effects.push({ effect: "value", item: batch.publication.seq, slot: "evidenceReady", value: true });
    return evidenceCarryingBudgetV17(given, [implicitBatchOpen(given), ...effects], [], update ? [update] : [], []).admitted ? { batch, ...capacity } : null;
  };
  next["evidence-fund-v17"] = { place: "guard", refusals: ["evidence-funding-unavailable"], run: given => funded(given) ? { holds: true } : { holds: false, name: "evidence-funding-unavailable" } };
  next["evidence-fund-open-v17"] = { place: "effect", most: 16, run: given => {
    const value = funded(given); if (!value) throw Error("A funding request lost its capacity proof");
    const effects: RuleEffect[] = [...value.effects,
      { effect: "ref", item: given.resolved.self, slot: "operation", to: value.batch.operation }, { effect: "ref", item: given.resolved.self, slot: "lane", to: value.batch.operation.at },
      { effect: "value", item: given.resolved.self, slot: "batch", value: evidenceBatchWireV17(value.batch) },
      { effect: "value", item: given.resolved.self, slot: "capacity", value: value.capacity }, { effect: "value", item: given.resolved.self, slot: "policyKey", value: value.policyKey }];
    const update = ready(given, value.batch);
    if (update) effects.push({ effect: "value", item: value.batch.publication.seq, slot: "evidenceReady", value: true });
    if (!evidenceCarryingBudgetV17(given, [implicitBatchOpen(given), ...effects], [], update ? [update] : [], []).admitted) throw Error("A funding record exceeds its carrying entry");
    return effects;
  } };
  next["evidence-funding-ready-v17"] = { place: "send", run: given => {
    const batch = fundingProposal(given); return batch ? ready(given, batch) : null;
  } };
  next["evidence-batch-record-v17"] = { place: "type", run: (_given, value) => readEvidenceBatchWireV17(value) !== null };
  next["evidence-published-plan-v17"] = { place: "type", run: (_given, value) => readPlanWire(value) !== null };
  next["evidence-plan-batch-v17"] = { place: "also", bind: items => {
    const rows = items.map(item => ({ id: item.id, record: batchValue(item) })).sort((a, b) => (a.record?.ordinal ?? -1) - (b.record?.ordinal ?? -1));
    if (!rows.length || rows.some((row, n) => !row.record || row.record.ordinal !== n || row.record.total !== rows.length)) return null;
    return rows.find(row => row.record!.checks.some(check => checkStageV13(check) === "published"))?.id ?? null;
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
  const publicationUpdate = next["publication-update"];
  const releasedUpdate = (given: RuleGiven): { request: RuleRequest; publication: Item } | null => {
    if (publicationUpdate?.place !== "send") return null;
    const request = publicationUpdate.run(given);
    if (!request || request.message.class !== "request" || request.message.type !== "relate" || !isRecord(request.message.body)) return null;
    const body = request.message.body, detail = body["detail"];
    if (body["name"] !== "publication" || !isFactRef(body["item"]) || !isRecord(detail) || detail["outcome"] !== "committed") return null;
    const publication = given.state.item(body["item"].seq);
    if (!publication || publication.type !== "publication" || !same(body["item"].at, given.resolved.at)
      || !same(publication.refs["operation"], detail["operation"]) || publication.values["evidenceReady"] === true
      || !evidenceFundingCompleteV17(given.state, publication)) return null;
    // A committed stage update is produced only by the retained base rule's
    // exact current outcome. Fund-first uses it; stage-first uses readyUpdate.
    return { request, publication };
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
        return update ? { ...result, effects: [...result.effects, { effect: "value", item: update.publication.id, slot: "evidenceReady", value: true }] } : result;
      } } };
  }
  const judge = next["judge"];
  if (judge?.place === "outcome" && judge.rules.derives) {
    const most = judge.rules.most;
    if (!most) throw Error("Funding requires the judge's complete finite budget");
    next["judge"] = { ...judge, rules: { ...judge.rules, most: { ...most, effects: 16, requests: 5 },
      derives: (given, operation, selected) => {
        const result = judge.rules.derives!(given, operation, selected);
        const captures = result.effects.filter(effect => effect.effect === "value" && effect.slot === "passes");
        if (captures.length !== 1 || captures[0]!.effect !== "value") return result;
        const effect = captures[0]!, publication = given.state.item(effect.item), snapshot = certifiedPublicationStateWireV17(effect.value, given.resolved.bounds);
        if (!publication || !snapshot) return result;
        return { ...result, sends: [...result.sends, ...evidenceFundingRequestsV17(given, publication, snapshot)] };
      } } };
  }
  const push = next["push"];
  if (push?.place === "outcome") next["push"] = { ...push, rules: { ...push.rules,
    holds: (given, operation) => {
      const publication = operation.for === undefined ? null : given.state.item(operation.for);
      const rows = publication && completeRows(given.state, publication);
      return !!publication && evidenceFundingCompleteV17(given.state, publication) && (rows === null || rows.every(row => hooks.capacityValid(row.item.values["capacity"]!)))
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
      next[name] = { ...rule, rules: { ...rule.rules, most: { ...most, requests: most.requests + 1 }, derives: (given, operation, selected) => appendWrittenPlan(given, rule.rules.derives!(given, operation, selected)) } };
    }
  }
  next["evidence-published-checks-v17"] = { place: "outcome", rules: { selects: false, read: false, retries: () => false,
    most: { effects: 2, requests: 1, operations: 1 }, origin: (_given, operation) => Number(operation.id.split(":")[0]), unknown: () => ({}),
    wellFormed: (result, evidence, given) => {
      if (result !== "confirmed") return isRecord(evidence.body) && Object.keys(evidence.body).length === 0;
      const operation = given.input.type === "outcome" ? given.state.operation(given.input.operation) : null;
      const pending = operation && destinationPublishedChecksPending(given.state, given.own, operation);
      return result === "confirmed" && evidence.basis === "own-answer" && isRecord(evidence.body) && Object.keys(evidence.body).join() === "plan" && !!pending && same(evidence.body["plan"], pending.plan);
    }, derives: (given, operation) => {
      const current = planFor(given.state, given.own, operation);
      if (!current || given.input.type !== "outcome" || given.input.result !== "confirmed") return { effects: [], sends: [], opens: [] };
      const { plan, selected } = current, written = factOf(given.own, given.resolved.at, plan.written);
      if (!written) throw Error("The published plan lost its actual written fact");
      const check = selected.check, policy = selected.record.policy;
      const binding = { v: 1 as const, source: checkSourceV13(check), stage: "published" as const, checker: check.checker,
        policyGeneration: { rules: policy.rules, seq: policy.revision }, roomService: policy.policy.roomService, serviceGeneration: policy.serviceGeneration, auditOf: null,
        subject: { kind: "published" as const, publication: plan.publication, receipt: plan.receipt, written, manifest: (given.state.item(plan.publication.seq)!.refs["manifest"] as FactRef) } };
      const publication = given.state.item(plan.publication.seq)!, cursor = plan.cursor + 1;
      const following = current.rows[cursor];
      return { effects: [{ effect: "value", item: current.item.id, slot: "plan", value: planWire({ ...plan, cursor }) },
        ...(cursor === plan.total ? [{ effect: "state" as const, item: current.item.id, state: "complete" }] : [])],
        sends: [{ to: plan.operation.at, message: { class: "request", type: "tell", body: { message: "admit-published-check", fields: {
          operation: plan.operation, manifest: binding.subject.manifest, name: check.name, configuration: check.configuration,
          commit: publication.values["integration"], tree: publication.values["tree"], base: plan.base,
          checker: check.checker, binding: canonicalize(binding), bindingDigest: evidenceBindingDigest(binding),
        } } } }], opens: following ? [{ owner: "platform:destination@17", kind: PUBLISHED_CHECKS_V17, attempts: 1, for: following.item.id }] : [] };
    } } };
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
      fact(batch.policy.certificate.request); fact(batch.policy.certificate.certificate);
      if (batch.planAt !== null) positions.add(batch.planAt);
    } else if (item.type === "published-plan" && item.state === "pending") {
      const plan = readPlanWire(item.values["plan"]); if (!plan) throw Error("A retained published plan is malformed");
      positions.add(item.id); fact(plan.publication); fact(plan.receipt); positions.add(plan.written);
    }
  }
  for (const seq of positions) {
    const value = own(seq);
    if (!value || !same(value.entry.at, at) || value.entry.seq !== seq || entryHash(value.entry) !== value.hash) throw Error("A funding source is unavailable");
    yield seq;
  }
}
