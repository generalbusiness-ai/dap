/** One pre-opened local operation settles a finite account. It never
 * settles a provider callback or discards a timed/unknown job. */
import type { Bounds, Entry, FactRef, PlatformData } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isEntry, isFactRef, isOperationId, isRecord, same, utf8 } from "@generalbusiness/dap-bytes";
import { evidenceDigest, operationSettled, type Item, type Operation, type Own, type RuleEffect, type RuleGiven, type RuleRequest, type Rules, type StateView } from "@generalbusiness/dap-derive";

export const EVIDENCE_ACCOUNT_SETTLE_V17 = "evidence-account-settle";
export interface EvidenceAccountSettlementHooksV17 {
  /** With Own, also prove every deciding/refusal entry, not only its fold. */
  terminal(state: StateView, holder: Item, own?: Own): boolean;
}
export function evidenceAccountOpeningV17(holder: number, k = 0): readonly RuleEffect[] {
  return [{ effect: "operation", k, owner: "platform:destination@17", kind: EVIDENCE_ACCOUNT_SETTLE_V17, attempts: 1, for: holder },
    { effect: "attempt", operation: { k }, attempt: 1, result: "opened", selected: null }];
}
/** Full fixed settlement carriers are quoted before the holder is taken.
 * No observations or opaque records occur on these local turns. */
export function evidenceSettlementBudgetV17(bounds: Bounds) {
  const max = Number.MAX_SAFE_INTEGER, hash = `sha256:${"f".repeat(64)}` as const;
  const at = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "destination" } as const;
  const fact: FactRef = { at, seq: max, hash }, use = { fact, content: hash }, operation = `${max}:${max}` as const;
  const variants: Entry[] = [];
  for (const work of [true, false]) {
    const message = { class: "request", type: "tell", body: { message: work ? "evidence-work-settle" : "evidence-batch-settle",
      fields: { holder: fact, [work ? "job" : "operation"]: fact } } } as const;
    const frame = { v: 1 as const, at, seq: max, prev: hash, time: "9999-12-31T23:59:59.999Z", clamped: false, epoch: 0 as const,
      uses: [], prepared: [] };
    variants.push({ ...frame, input: { type: "outcome", owner: "platform:destination@17", kind: EVIDENCE_ACCOUNT_SETTLE_V17, operation, attempt: 1,
      result: "refused", evidence: { basis: "own-answer", body: { holder: fact } } },
      effects: [{ effect: "attempt", operation, attempt: 1, result: "refused", selected: null }], sends: [{ n: max, to: at, message }] });
    variants.push({ ...frame, input: { type: "delivery", from: fact, n: max, decision: "applied", message },
      effects: [{ effect: "state", item: max, state: work ? "settled" : "closed" }], sends: [{ n: max, to: at,
        message: { class: "result", of: { from: fact, n: max }, outcome: "applied" } }] });
  }
  for (const terminal of ["cleaned", "aborted", "not-reserved"]) {
    const message = { class: "request", type: "tell", body: { message: `publication-settle-${terminal}`, fields: { publication: max, closing: fact } } } as const;
    const frame = { v: 1 as const, at, seq: max, prev: hash, time: "9999-12-31T23:59:59.999Z", clamped: false, epoch: 0 as const, uses: [], prepared: [] };
    variants.push({ ...frame, input: { type: "outcome", owner: "platform:destination@17", kind: "publication-settle", operation, attempt: 1,
      result: "refused", evidence: { basis: "own-answer", body: { closing: fact } } },
      effects: [{ effect: "attempt", operation, attempt: 1, result: "refused", selected: null }], sends: [{ n: max, to: at, message }] });
    variants.push({ ...frame, input: { type: "delivery", from: fact, n: max, decision: "applied", message },
      effects: [{ effect: "state", item: max, state: terminal }], sends: [{ n: max, to: at,
        message: { class: "result", of: { from: fact, n: max }, outcome: "applied" } }] });
  }
  const measured = variants.map(entry => ({ entry, bytes: utf8(canonicalize(entry)).length + bounds.usesPerEntry * utf8(canonicalize(use)).length
    + Math.max(0, bounds.usesPerEntry - 1) }));
  return { admitted: Number.isSafeInteger(bounds.usesPerEntry) && bounds.usesPerEntry >= 0 && measured.every(row => row.bytes <= bounds.entryBytes
    && row.entry.effects.length <= Math.min(16, bounds.derivedEffects) && row.entry.sends.length <= bounds.sendsPerEntry),
    entryBytes: Math.max(...measured.map(row => row.bytes)), variants: measured };
}
const accountType = (item: Item) => item.type === "evidence-request" || item.type === "evidence-batch";
/** Folded bookkeeping is necessary but not sufficient for closure. */
export function evidenceAccountLedgerClosedV17(state: StateView, holder: Item, settlement: Operation,
  excluded?: { seq: number; n: number }): boolean {
  if (!accountType(holder) || settlement.for !== holder.id || settlement.owner !== "platform:destination@17"
    || settlement.kind !== EVIDENCE_ACCOUNT_SETTLE_V17 || settlement.most !== 1) return false;
  for (const operation of state.operationsFor(holder.id)) if (operation.id !== settlement.id && !operationSettled(operation)) return false;
  for (const account of state.accountsOf(holder.id)) {
    if (excluded && account.seq === excluded.seq && account.n === excluded.n) continue;
    const request = state.request(account.seq, account.n);
    if (!request || request.result === null) return false;
  }
  return true;
}
function original(state: StateView, own: Own, operation: Operation): { holder: Item; fact: FactRef } | null {
  if (!isOperationId(operation.id)) return null;
  const scope = state.scope(), holder = operation.for === undefined ? null : state.item(operation.for), genesis = own(0);
  const born = holder && own(holder.id), opening = own(Number(operation.id.split(":")[0]));
  if (!scope || scope.at.kind !== "destination" || !genesis || !isEntry(genesis.entry) || genesis.entry.input.type !== "genesis" || genesis.entry.input.seed.definition !== "platform:destination@17"
    || genesis.entry.seq !== 0 || entryHash(genesis.entry) !== genesis.hash || genesis.hash !== scope.genesis.hash || !same(genesis.entry.at, scope.at)
    || !same(state.operation(operation.id), operation) || !holder || !accountType(holder) || !born || !opening || born.hash !== holder.opened
    || !isEntry(born.entry) || entryHash(born.entry) !== born.hash || !same(born.entry.at, scope.at) || born.entry.seq !== holder.id
    || opening.entry.seq !== holder.id || opening.hash !== born.hash || operation.owner !== "platform:destination@17"
    || operation.kind !== EVIDENCE_ACCOUNT_SETTLE_V17 || operation.most !== 1 || operation.attempts.length !== 1
    || operation.attempts[0]!.attempt !== 1 || operation.attempts[0]!.opened !== born.entry.seq) return null;
  const input = born.entry.input;
  if (input.type !== "delivery" || input.message.class !== "request" || input.message.type !== "tell" || !("decision" in input) || input.decision !== "applied"
    || !isRecord(input.message.body) || input.message.body["message"] !== (holder.type === "evidence-request" ? "work-check-fence" : "evidence-fund")) return null;
  const opened = born.entry.effects.filter(effect => effect.effect === "open");
  if (opened.length !== 1 || opened[0]!.effect !== "open" || opened[0]!.type !== holder.type || opened[0]!.item !== holder.id
    || opened[0]!.state !== (holder.type === "evidence-request" ? "pending" : "funded")) return null;
  const k = Number(operation.id.split(":")[1]), rows = opening.entry.effects.filter(effect => effect.effect === "operation" && effect.k === k);
  if (rows.length !== 1 || rows[0]!.effect !== "operation" || rows[0]!.owner !== operation.owner || rows[0]!.kind !== operation.kind
    || rows[0]!.attempts !== 1 || (rows[0]!.for === "self" ? opening.entry.seq : rows[0]!.for) !== holder.id
    || !born.entry.effects.some(effect => effect.effect === "attempt" && effect.attempt === 1 && effect.result === "opened"
      && (typeof effect.operation === "string" ? effect.operation === operation.id : effect.operation.k === k))) return null;
  return { holder, fact: { at: scope.at, seq: holder.id, hash: born.hash } };
}
function proof(state: StateView, own: Own, operation: Operation, hooks: EvidenceAccountSettlementHooksV17,
  excluded?: { seq: number; n: number }) {
  const held = original(state, own, operation);
  return held && evidenceAccountLedgerClosedV17(state, held.holder, operation, excluded) && hooks.terminal(state, held.holder, own) ? held : null;
}
function request(state: StateView, own: Own, operation: Operation, hooks: EvidenceAccountSettlementHooksV17): RuleRequest | null {
  const held = proof(state, own, operation, hooks), scope = state.scope();
  if (!held || !scope) return null;
  const work = held.holder.type === "evidence-request", identity = work ? held.holder.values["job"] : held.holder.refs["operation"];
  if (!isFactRef(identity)) return null;
  return { to: scope.at, message: { class: "request", type: "tell", body: { message: work ? "evidence-work-settle" : "evidence-batch-settle",
    fields: { holder: held.fact, [work ? "job" : "operation"]: identity } } } };
}
function receiver(given: RuleGiven, hooks: EvidenceAccountSettlementHooksV17, candidate?: Item, mutable = true): boolean {
  if (given.input.type !== "delivery" || given.input.message.class !== "request" || given.input.message.type !== "tell"
    || !same(given.input.from.at, given.resolved.at)) return false;
  const n = given.input.n;
  const source = given.own(given.input.from.seq), holder = candidate ?? given.resolved.subjects.get("also.holder");
  if (!source || source.hash !== given.input.from.hash || entryHash(source.entry) !== source.hash || !holder
    || source.entry.input.type !== "outcome" || source.entry.input.owner !== "platform:destination@17"
    || source.entry.input.kind !== EVIDENCE_ACCOUNT_SETTLE_V17 || source.entry.input.result !== "refused" || source.entry.input.attempt !== 1
    || source.entry.input.evidence.basis !== "own-answer") return false;
  const operation = given.state.operation(source.entry.input.operation), held = operation && original(given.state, given.own, operation);
  const digest = evidenceDigest(source.entry.input.evidence);
  if (!operation || !held || operation.attempts.length !== 1 || operation.attempts[0]!.attempt !== 1
    || !operation.attempts[0]!.outcomes.some(outcome => outcome.seq === source.entry.seq && outcome.result === "refused"
      && outcome.evidence === digest)
    || held.holder.id !== holder.id || !isRecord(source.entry.input.evidence.body)
    || Object.keys(source.entry.input.evidence.body).join() !== "holder" || !same(source.entry.input.evidence.body["holder"], held.fact)) return false;
  const sent = source.entry.sends.filter(send => send.n === n);
  if (sent.length !== 1 || !same(sent[0]!.to, given.resolved.at) || !same(sent[0]!.message, given.input.message)
    || !isRecord(given.input.message.body) || !isRecord(given.input.message.body["fields"])) return false;
  const fields = given.input.message.body["fields"], work = holder.type === "evidence-request", key = work ? "job" : "operation";
  if (Object.keys(fields).sort().join() !== ["holder", key].sort().join() || !same(fields["holder"], held.fact)
    || !same(fields[key], work ? holder.values["job"] : holder.refs["operation"])) return false;
  return !mutable || proof(given.state, given.own, operation, hooks, { seq: source.entry.seq, n: given.input.n }) !== null;
}
export function evidenceAccountSettlementDataV17(base: PlatformData): PlatformData {
  const receives = { ...base.receives }, items = { ...base.items };
  for (const work of [true, false]) {
    const type = work ? "evidence-request" : "evidence-batch", item = items[type];
    if (!item?.holds) throw Error("A settlement account must reserve its complete closure");
    const message = work ? "evidence-work-settle" : "evidence-batch-settle", key = work ? "job" : "operation";
    items[type] = { ...item, states: { ...item.states, ...(work ? {} : { closed: { final: true } }) }, holds: { ...item.holds,
      operations: { ...item.holds.operations, [EVIDENCE_ACCOUNT_SETTLE_V17]: 1 }, requests: (item.holds.requests ?? 0) + (work ? 1 : 0),
      decisions: { ...item.holds.decisions, [message]: 1 } } };
    receives[message] = { message, class: "tell", from: { kind: "destination", under: "platform:destination" }, opens: null,
      also: { holder: { item: type, index: key, key, code: "evidence-settlement-holder-v17", row: "E5" } },
      fields: { holder: { type: "code", code: "evidence-settlement-holder-field-v17", row: "E5", required: true },
        [key]: { type: "fact", kind: [work ? "request-work-check" : "merge"], under: work ? "issue" : "change", required: true } },
      bound: { of: "also.holder", where: [{ equals: { a: { field: key }, b: { slot: key, of: "also.holder" } } }] },
      settles: { of: "also.holder", in: work ? ["pending", "waiting"] : ["funded"] },
      guards: [{ state: work ? ["pending", "waiting"] : ["funded"], of: "also.holder" }, { code: "evidence-settlement-proof-v17", row: "E5" }], effects: [{ state: work ? "settled" : "closed", of: "also.holder" }], sends: [], attention: [] };
  }
  return { ...base, items, receives, outcomes: { ...base.outcomes, [EVIDENCE_ACCOUNT_SETTLE_V17]: {
    code: "evidence-settlement-outcome-v17", row: "E5", attempts: 1, origin: "rule", most: { effects: 0, operations: [] },
    send: { code: "evidence-settlement-send-v17", row: "E5", once: true, result: {} } } } };
}
export function evidenceAccountSettlementRulesV17(base: Rules, hooks: EvidenceAccountSettlementHooksV17): Rules {
  return { ...base,
    // This check runs before binding, so an unrelated sender cannot spend
    // the account's one settlement decision by provoking a later refusal.
    "evidence-settlement-holder-field-v17": { place: "type", run: (given, value) => {
      if (!isFactRef(value) || !same(value.at, given.resolved.at)) return false;
      const holder = given.state.item(value.seq);
      return !!holder && accountType(holder) && holder.opened === value.hash && receiver(given, hooks, holder, false);
    } },
    "evidence-settlement-holder-v17": { place: "also", bind: (items, fields) => {
      const raw = fields["holder"], id = typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0 ? raw : isFactRef(raw) ? raw.seq : null;
      if (id === null || items.length > 16) return null;
      return items.filter(item => item.id === id).length === 1 ? id : null;
    } },
    "evidence-settlement-proof-v17": { place: "guard", refusals: ["account-not-closed"], run: given => receiver(given, hooks) ? { holds: true } : { holds: false, name: "account-not-closed" } },
    "evidence-settlement-outcome-v17": { place: "outcome", rules: { selects: false, read: false, retries: () => false,
      most: { effects: 0, requests: 1, operations: 0 }, origin: (_given, operation) => Number(operation.id.split(":")[0]),
      ready: (state, operation) => {
        const holder = operation.for === undefined ? null : state.item(operation.for);
        return !!holder && evidenceAccountLedgerClosedV17(state, holder, operation) && hooks.terminal(state, holder);
      }, beforeSend: (state, operation, _attempt, own) => {
        const held = proof(state, own, operation, hooks);
        return held ? { basis: "own-answer", body: { holder: held.fact } } : null;
      }, unknown: () => ({}),
      wellFormed: (result, answer, given) => {
        if (result === "unknown") return isRecord(answer.body) && Object.keys(answer.body).length === 0;
        if (result !== "refused" || answer.basis !== "own-answer" || !isRecord(answer.body) || Object.keys(answer.body).join() !== "holder"
          || given.input.type !== "outcome") return false;
        const operation = given.state.operation(given.input.operation), held = operation && proof(given.state, given.own, operation, hooks);
        return !!held && same(answer.body["holder"], held.fact);
      }, derives: () => ({ effects: [], sends: [], opens: [] }) } },
    "evidence-settlement-send-v17": { place: "send", run: given => {
      const operation = given.input.type === "outcome" && given.input.result === "refused" ? given.state.operation(given.input.operation) : null;
      return operation ? request(given.state, given.own, operation, hooks) : null;
    } },
  };
}
