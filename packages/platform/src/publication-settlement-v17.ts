/** G17 publication release uses an identified self-delivery, never an
 * outcome's final-looking state or a timeout. Historical data stays exact. */
import type { FactRef, PlatformData } from "@generalbusiness/dap-contract";
import { entryHash, isEntry, isOperationId, isRecord, same } from "@generalbusiness/dap-bytes";
import { evidenceDigest, operationOpening, operationSettled, RuleFault, type Item, type Operation, type OutcomeGives, type Own, type RuleEffect, type RuleGiven, type Rules, type StateView } from "@generalbusiness/dap-derive";
import { evidenceOperationOpeningV17 } from "./evidence-opening-v17.ts";
import { readFor, targetOf } from "./destination.ts";

export const PUBLICATION_SETTLE_V17 = "publication-settle";
const OWNER = "platform:destination@17";
const TERMINALS = ["cleaned", "aborted", "not-reserved"] as const;
type Terminal = typeof TERMINALS[number];
// Only these inherited kinds can finish a publication. Map through the
// actual data's code name when installing the outer rule wrapper.
const PRODUCERS = ["judge", "push", "read", "receipt", "revoke", "reservation-delete"] as const;
const closingState = (terminal: Terminal) => `closing-${terminal}`;
const messageOf = (terminal: Terminal) => `${PUBLICATION_SETTLE_V17}-${terminal}`;
const terminalOf = (state: string): Terminal | null => TERMINALS.find(terminal => closingState(terminal) === state) ?? null;
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const factAt = (own: Own, at: FactRef["at"], seq: number): FactRef | null => {
  const sealed = own(seq);
  return sealed && isEntry(sealed.entry) && sealed.entry.seq === seq && same(sealed.entry.at, at) && entryHash(sealed.entry) === sealed.hash
    ? { at, seq, hash: sealed.hash } : null;
};
function nativeScope(state: StateView, own: Own): boolean {
  const scope = state.scope(), birth = own(0);
  return !!scope && scope.at.kind === "destination" && !!birth && same(factAt(own, scope.at, 0), { at: scope.at, seq: 0, hash: birth.hash })
    && birth.entry.input.type === "genesis" && birth.entry.input.seed.definition === OWNER && scope.genesis.hash === birth.hash;
}
/** Unknown attempts and pending accounts retain their admitted room. The
 * receiving self-request alone is excluded while its literal settlement runs. */
function quiet(state: StateView, holder: number, operation: string, receiving?: { seq: number; n: number }): boolean {
  return state.operationsFor(holder).every(candidate => candidate.id === operation || operationSettled(candidate))
    && state.accountsOf(holder).every(account => {
      if (receiving && account.seq === receiving.seq && account.n === receiving.n) return true;
      const request = state.request(account.seq, account.n);
      return !!request && (request.result !== null || request.diagnosis?.finding === "undelivered");
    });
}
function producerFor(state: StateView, own: Own, operation: Operation, publication: Item): boolean {
  const at = state.scope()!.at, source = own(Number(operation.id.split(":")[0]));
  if (!source || !factAt(own, at, source.entry.seq) || !evidenceOperationOpeningV17(source.entry, operation)) return false;
  let receipt: Item | null = null;
  if (operation.kind === "receipt") receipt = targetOf(state, own, operation);
  else if (operation.kind === "read") {
    const target = readFor(state, own, operation);
    if (target !== "receipt") return typeof target === "object" && target !== null && target.type === "publication" && target.id === publication.id;
    const input = source.entry.input, write = input.type === "outcome" ? state.operation(input.operation) : null;
    const opened = write && own(Number(write.id.split(":")[0]));
    if (!write || write.owner !== OWNER || write.kind !== "receipt" || !opened || !factAt(own, at, opened.entry.seq)
      || !evidenceOperationOpeningV17(opened.entry, write)) return false;
    receipt = targetOf(state, own, write);
  } else return operation.for === publication.id;
  if (receipt?.type !== "receipt") return false;
  const birth = own(receipt.id), fact = factAt(own, at, receipt.id);
  if (!birth || !fact || receipt.opened !== fact.hash || (receipt.refs["publication"] ?? receipt.values["publication"]) !== publication.id) return false;
  const opens = birth.entry.effects.filter(effect => effect.effect === "open" && effect.item === receipt.id && effect.type === "receipt");
  const links = birth.entry.effects.filter(effect => (effect.effect === "ref" || effect.effect === "value")
    && effect.item === receipt.id && effect.slot === "publication"
    && (effect.effect === "ref" ? effect.to === publication.id : effect.value === publication.id));
  return opens.length === 1 && links.length === 1;
}
function opening(state: StateView, own: Own, operation: Operation): { item: Item; closing: FactRef; terminal: Terminal } | null {
  if (!nativeScope(state, own) || !isOperationId(operation.id) || operation.owner !== OWNER || operation.kind !== PUBLICATION_SETTLE_V17
    || operation.most !== 1 || operation.for === undefined || !same(state.operation(operation.id), operation)) return null;
  const item = state.item(operation.for), terminal = item && terminalOf(item.state), source = own(Number(operation.id.split(":")[0]));
  const at = state.scope()!.at, closing = source && factAt(own, at, source.entry.seq), birth = item && factAt(own, at, item.id);
  if (!item || item.type !== "publication" || !terminal || !source || !closing || !birth || item.opened !== birth.hash
    || !evidenceOperationOpeningV17(source.entry, operation)) return null;
  const rows = source.entry.effects.filter(effect => effect.effect === "state" && effect.item === item.id && effect.state === closingState(terminal));
  const input = source.entry.input;
  if (input.type === "outcome") {
    const original = state.operation(input.operation);
    if (!original || original.owner !== OWNER || original.kind !== input.kind || !producerFor(state, own, original, item)
      || !original.attempts.some(attempt => attempt.attempt === input.attempt && attempt.outcomes.some(outcome => outcome.seq === source.entry.seq
        && outcome.result === input.result && outcome.evidence === evidenceDigest(input.evidence)))) return null;
  }
  const producer = input.type === "outcome" && input.owner === OWNER && PRODUCERS.some(kind => kind === input.kind) && input.result !== "unknown"
    || input.type === "delivery" && "decision" in input && input.decision === "applied" && input.message.class === "request"
      && input.message.type === "tell" && isRecord(input.message.body) && input.message.body["message"] === "withdraw";
  return rows.length === 1 && producer ? { item, closing, terminal } : null;
}
export function destinationPublicationSettlementPendingV17(state: StateView, own: Own, operation: Operation): { closing: FactRef } | null {
  try { const found = opening(state, own, operation); return found ? { closing: found.closing } : null; } catch { return null; }
}
/** Shared with pre-capture forecasts: the extra counted operation belongs
 * to the complete closure before the publication is taken. No future hash. */
export function publicationSettlementProjectionV17(given: RuleGiven, result: OutcomeGives): OutcomeGives {
  const final = result.effects.filter((effect): effect is Extract<RuleEffect, { effect: "state" }> => effect.effect === "state"
    && TERMINALS.some(terminal => terminal === effect.state) && (given.state.item(effect.item)?.type === "publication"
      || result.effects.some(open => open.effect === "open" && open.item === effect.item && open.type === "publication")));
  if (!final.length) return result;
  if (final.length !== 1 || !nativeScope(given.state, given.own) || given.input.type === "outcome" && given.input.result === "unknown")
    throw new RuleFault("The publication terminal projection has no single decisive native source");
  const row = final[0]!, terminal = TERMINALS.find(value => value === row.state)!;
  if (result.opens.some(open => open.kind === PUBLICATION_SETTLE_V17) || terminalOf(given.state.item(row.item)?.state ?? ""))
    throw new RuleFault("A publication cannot open a replacement settlement");
  return { ...result, effects: result.effects.map(effect => effect === row ? { ...row, state: closingState(terminal) } : effect),
    opens: [...result.opens, { owner: OWNER, kind: PUBLICATION_SETTLE_V17, attempts: 1, for: row.item }] };
}

export function publicationSettlementDataV17(base: PlatformData): PlatformData {
  const publication = base.items["publication"];
  if (!publication?.holds || base.outcomes[PUBLICATION_SETTLE_V17]) throw Error("Publication settlement is installed exactly once on a holder");
  const states = { ...publication.states }, decisions = { ...publication.holds.decisions }, receives = { ...base.receives };
  const kinds = [...PRODUCERS.filter(kind => base.outcomes[kind]).map(kind => `${OWNER}:${kind}`), "withdraw"];
  for (const terminal of TERMINALS) {
    if (states[terminal]?.final !== true) throw Error("The intended publication terminal must remain final");
    const closing = closingState(terminal), message = messageOf(terminal);
    states[closing] = { final: false }; decisions[message] = 1;
    receives[message] = { message, class: "tell", from: { kind: "destination", under: "platform:destination" }, opens: null,
      fields: { publication: { type: "item", of: "publication", required: true }, closing: { type: "fact", kind: kinds, under: "platform:destination", required: true } },
      also: { publication: { item: "publication", by: "publication" } },
      bound: { of: "also.publication", where: [{ equals: { a: { sender: true }, b: { scope: true } } }] },
      settles: { of: "also.publication", in: [closing] },
      guards: [{ of: "also.publication", state: [closing] }, { code: "publication-settlement-source-v17", row: "E5" }],
      effects: [{ of: "also.publication", state: terminal }], sends: [], attention: [] };
  }
  const reserve = receives["reserve"];
  if (reserve) receives["reserve"] = { ...reserve, guards: reserve.guards.map(guard => "none" in guard && guard.none.type === "publication"
    ? { ...guard, none: { ...guard.none, states: [...new Set([...(guard.none.states ?? []), ...TERMINALS.map(closingState)])] } } : guard) };
  const withdraw = receives["withdraw"];
  if (withdraw) receives["withdraw"] = { ...withdraw, effects: withdraw.effects.map(effect => "code" in effect && effect.code === "withdraw-unpublished"
    ? { ...effect, most: { effects: 14, opens: "publication", operations: ["judge", "mint", "reservation-delete", PUBLICATION_SETTLE_V17] } } : effect) };
  const outcomes = { ...base.outcomes };
  for (const kind of PRODUCERS) {
    const old = outcomes[kind]; if (!old) continue;
    if (!old.most) throw Error("A publication producer must declare its complete operation closure");
    outcomes[kind] = { ...old, most: { ...old.most, operations: [...new Set([...(old.most.operations ?? []), PUBLICATION_SETTLE_V17])] } };
  }
  outcomes[PUBLICATION_SETTLE_V17] = { code: "publication-settlement-outcome-v17", row: "E5", attempts: 1, origin: "rule",
    most: { effects: 0, operations: [] }, send: { code: "publication-settlement-send-v17", row: "E5", once: true, result: {} } };
  return { ...base, items: { ...base.items, publication: { ...publication, states, holds: { ...publication.holds,
    operations: { ...publication.holds.operations, [PUBLICATION_SETTLE_V17]: 1 }, requests: (publication.holds.requests ?? 0) + 1, decisions } } }, receives, outcomes };
}

function receiver(given: RuleGiven): boolean {
  const input = given.input;
  if (input.type !== "delivery" || input.message.class !== "request" || input.message.type !== "tell" || !exact(input.message.body, ["message", "fields"])
    || !same(input.from.at, given.resolved.at)) return false;
  const source = given.own(input.from.seq), entry = source?.entry, arrived = input.message.body["fields"];
  if (!source || !entry || !same(factAt(given.own, given.resolved.at, input.from.seq), input.from) || entry.input.type !== "outcome"
    || entry.input.owner !== OWNER || entry.input.kind !== PUBLICATION_SETTLE_V17 || entry.input.attempt !== 1 || entry.input.result !== "refused"
    || entry.input.evidence.basis !== "own-answer" || !exact(entry.input.evidence.body, ["closing"]) || !exact(arrived, ["publication", "closing"])) return false;
  const operation = given.state.operation(entry.input.operation), found = operation && opening(given.state, given.own, operation);
  const evidence = evidenceDigest(entry.input.evidence);
  if (!operation || !found || !same(entry.input.evidence.body["closing"], found.closing) || !same(arrived["closing"], found.closing)
    || arrived["publication"] !== found.item.id || given.resolved.subjects.get("also.publication")?.id !== found.item.id
    || !(given.resolved.fields["closing"] === found.closing.seq || same(given.resolved.fields["closing"], found.closing))
    || input.message.body["message"] !== messageOf(found.terminal)
    || !operation.attempts.some(attempt => attempt.attempt === 1 && attempt.outcomes.some(outcome => outcome.seq === entry.seq && outcome.result === "refused"
      && outcome.evidence === evidence))
    || !entry.sends.some(send => send.n === input.n && same(send.to, given.resolved.at) && same(send.message, input.message))) return false;
  return quiet(given.state, found.item.id, operation.id, { seq: entry.seq, n: input.n });
}
/** Install outermost, after the successor funding and evidence rules. */
export function publicationSettlementRulesV17(base: Rules, data: PlatformData): Rules {
  const rules: Rules = { ...base };
  for (const kind of PRODUCERS) {
    const mark = data.outcomes[kind], rule = mark && base[mark.code];
    if (!mark) continue;
    if (!rule || rule.place !== "outcome" || !rule.rules.derives || !rule.rules.most) throw Error("A publication producer must have a finite projection");
    rules[mark.code] = { ...rule, rules: { ...rule.rules, most: { ...rule.rules.most, operations: rule.rules.most.operations + 1 },
      derives: (given, operation, selected) => publicationSettlementProjectionV17(given, rule.rules.derives!(given, operation, selected)) } };
  }
  const withdraw = base["withdraw-unpublished"];
  if (withdraw?.place === "effect") rules["withdraw-unpublished"] = { ...withdraw, most: withdraw.most + 2, run: given => {
    const effects = withdraw.run(given), projected = publicationSettlementProjectionV17(given, { effects, sends: [], opens: [] });
    const ordinal = effects.filter(effect => effect.effect === "operation").length;
    return [...projected.effects, ...projected.opens.flatMap((open, n) => operationOpening(ordinal + n, open))];
  } };
  rules["publication-settlement-source-v17"] = { place: "guard", refusals: ["publication-settlement-unavailable"],
    run: given => receiver(given) ? { holds: true } : { holds: false, name: "publication-settlement-unavailable" } };
  rules["publication-settlement-outcome-v17"] = { place: "outcome", rules: {
    selects: false, read: false, retries: () => false, most: { effects: 0, requests: 1, operations: 0 },
    origin: (_given, operation) => Number(operation.id.split(":")[0]), unknown: () => ({}),
    ready: (state, operation, attempt) => attempt === 1 && operation.for !== undefined && terminalOf(state.item(operation.for)?.state ?? "") !== null
      && quiet(state, operation.for, operation.id),
    beforeSend: (state, operation, attempt, own) => {
      const found = attempt === 1 && opening(state, own, operation);
      return found && quiet(state, found.item.id, operation.id) ? { basis: "own-answer", body: { closing: found.closing } } : null;
    },
    wellFormed: (result, evidence, given) => {
      if (result === "unknown") return exact(evidence.body, []);
      const operation = given.input.type === "outcome" ? given.state.operation(given.input.operation) : null;
      const found = operation && opening(given.state, given.own, operation);
      return result === "refused" && evidence.basis === "own-answer" && exact(evidence.body, ["closing"]) && !!found
        && same(evidence.body["closing"], found.closing) && quiet(given.state, found.item.id, operation!.id);
    }, derives: () => ({ effects: [], sends: [], opens: [] }),
  } };
  rules["publication-settlement-send-v17"] = { place: "send", run: given => {
    if (given.input.type !== "outcome" || given.input.result !== "refused") return null;
    const operation = given.state.operation(given.input.operation), found = operation && opening(given.state, given.own, operation);
    if (!operation || !found || !quiet(given.state, found.item.id, operation.id)) return null;
    return { to: given.resolved.at, message: { class: "request", type: "tell", body: { message: messageOf(found.terminal), fields: { publication: found.item.id, closing: found.closing } } } };
  } };
  return rules;
}
