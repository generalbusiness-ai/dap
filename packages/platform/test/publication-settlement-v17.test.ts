import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Evidence, type PlatformData, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { factRefOf } from "@generalbusiness/dap-bytes";
import { clockOf, judgeDelivery, operationOpening, released, settleOutcome, type OutcomeGives, type PlatformRules, type Rules } from "@generalbusiness/dap-derive";
import { Ledger, arriving, d, forged, keys, otherLane, sent, t } from "@generalbusiness/dap-derive/testing";
import { checkedPlatformData, written } from "./fixtures.ts";
import { works } from "../../derive/test/definition-corpus/holds-data.ts";
import { destinationPublicationSettlementPendingV17, PUBLICATION_SETTLE_V17, publicationSettlementDataV17, publicationSettlementRulesV17 } from "../src/publication-settlement-v17.ts";

const OWNER = "platform:destination@17" satisfies PlatformDefinition;
type Terminal = "cleaned" | "aborted" | "not-reserved";
/** A SCRIPTED genesis and provider finish stand for authority and cleanup.
 * Actual maintained outcome/delivery judges, fold and release run afterward. */
function fixture(terminal: Terminal = "cleaned", throughReceipt = false) {
  const base: PlatformData = { ...works, name: "platform:destination", capacity: { name: "whole-scope", version: 1 },
    items: { ...works.items, publication: { many: true, max: 4, initial: "queued", states: { queued: { final: false }, published: { final: false }, cleaned: { final: true }, aborted: { final: true }, "not-reserved": { final: true } },
      parties: {}, refs: {}, values: {}, holds: { operations: { judge: 1, receipt: 1 }, requests: 1, items: 1 } },
      receipt: { many: true, max: 4, initial: "owed", states: { owed: { final: false }, written: { final: true } }, parties: {}, values: {},
        refs: { publication: { fixed: true, required: true, to: { type: "item", of: "publication" } } } } },
    receives: { ...works.receives, start: { ...works.receives["start"]!, opens: "publication", effects: [{ code: "begin", row: "TEST", most: { effects: 2, operations: ["judge"] } }] } },
    outcomes: { ...works.outcomes, judge: { code: "judge", row: "TEST", attempts: 1, most: { effects: 3, opens: "receipt", operations: ["receipt"] } },
      receipt: { code: "receipt", row: "TEST", attempts: 1, most: { effects: 2, operations: [] } } } };
  const data = publicationSettlementDataV17(base), definition = checkedPlatformData(data), ledger = new Ledger(definition, "platform:destination");
  const baseRules: Rules = {
    begin: { place: "effect", most: 2, run: given => operationOpening(0, { owner: OWNER, kind: "judge", attempts: 1, for: given.resolved.self }) },
    judge: { place: "outcome", rules: { selects: false, read: false, retries: () => false, most: { effects: 3, requests: 0, operations: 1 },
      derives: (given, operation): OutcomeGives => throughReceipt ? { effects: [
        { effect: "state", item: operation.for!, state: "published" }, { effect: "open", item: given.resolved.self, type: "receipt", state: "owed" },
        { effect: "ref", item: given.resolved.self, slot: "publication", to: operation.for! }],
        opens: [{ owner: OWNER, kind: "receipt", attempts: 1, for: operation.for! }], sends: [] }
        : ({ effects: [{ effect: "state", item: operation.for!, state: terminal }], opens: [], sends: [] }) } },
    receipt: { place: "outcome", rules: { selects: false, read: false, retries: () => false, most: { effects: 2, requests: 0, operations: 0 },
      derives: (_given, operation): OutcomeGives => ({ effects: [{ effect: "state", item: Number(operation.id.split(":")[0]), state: "written" },
        { effect: "state", item: operation.for!, state: terminal }], opens: [], sends: [] }) } },
  };
  const rules = publicationSettlementRulesV17(baseRules, data), platform: PlatformRules = { named: OWNER, rules }, at = { ...otherLane, kind: "destination" as const };
  ledger.fold({ v: 1, at, seq: 0, prev: null, time: t(0), clamped: false, epoch: 0,
    input: { type: "genesis", seed: { v: 1, kind: "destination", definition: OWNER, creator: null, cause: d("c"), ordinal: 0 },
      inc: at.inc, kind: "establish", founding: null, source: null, n: null, message: null, decision: "applied" }, uses: [], prepared: [],
    effects: [{ effect: "open", item: 0, type: "works", state: "open" }, { effect: "party", item: 0, slot: "opener", member: keys.rita.member }], sends: [] });
  const start = { n: 0, to: at, message: { class: "request", type: "tell", body: { message: "start", fields: {} } } } as const;
  const source = forged(otherLane, 500, { type: "checkpoint", through: 0, state: d("a") }, [start]);
  const arrivingStart = { ...start, from: factRefOf(source.entry) };
  ledger.seal(written(judgeDelivery(ledger.state, definition, arrivingStart, { ...arriving(ledger, arrivingStart, source), platform })));
  const holder = ledger.last.seq, finish = ledger.state.operationsFor(holder).find(operation => operation.kind === "judge")!;
  const offer = (operation: typeof finish, result: "confirmed" | "refused" | "unknown", evidence: Evidence) => {
    const judged = settleOutcome(ledger.state, definition, { type: "outcome", operation: operation.id, attempt: 1, result, evidence },
      { clock: clockOf(ledger.state, ledger.now), bounds: PROPOSED_BOUNDS, own: ledger.own, platform });
    ledger.seal(written(judged));
  };
  offer(finish, "confirmed", { basis: "own-answer", body: {} });
  if (throughReceipt) offer(ledger.state.operationsFor(holder).find(operation => operation.kind === "receipt")!, "confirmed", { basis: "own-answer", body: {} });
  const operation = ledger.state.operationsFor(holder).find(operation => operation.kind === PUBLICATION_SETTLE_V17)!;
  const rule = rules["publication-settlement-outcome-v17"];
  if (!rule || rule.place !== "outcome") throw Error("The actual settlement outcome rule must exist");
  const receive = (seq: number, n = 0, withRules = rules) => {
    const arrival = sent(ledger, seq, n);
    return judgeDelivery(ledger.state, definition, arrival.delivered, { ...arriving(ledger, arrival.delivered, arrival.source), platform: { named: OWNER, rules: withRules } });
  };
  return { ledger, definition, data, rules, operation, rule: rule.rules, offer, receive, holder, base };
}

test.each(["cleaned", "aborted", "not-reserved"] as const)("%s releases only after its exact refused-local outcome, literal settlement and self ACK", terminal => {
  const f = fixture(terminal);
  expect(f.ledger.item(f.holder).state).toBe(`closing-${terminal}`);
  expect(f.ledger.state.holderSettled(f.holder)).toBe(false);
  expect(released(f.ledger.state, f.definition, f.holder)).not.toBeNull();
  const pending = destinationPublicationSettlementPendingV17(f.ledger.state, f.ledger.own, f.operation);
  expect(pending?.closing.seq).toBe(f.ledger.last.seq);
  expect(f.rule.ready?.(f.ledger.state, f.operation, 1)).toBe(true);
  const proof = f.rule.beforeSend?.(f.ledger.state, f.operation, 1, f.ledger.own);
  if (!proof) throw Error("The local settlement must have its exact own proof");
  f.offer(f.operation, "refused", proof);
  const sending = f.ledger.last.seq;
  expect(f.ledger.last.sends).toHaveLength(1);
  expect(f.ledger.last.sends[0]!.to).toEqual(f.ledger.at);
  f.ledger.seal(written(f.receive(sending)));
  expect(f.ledger.item(f.holder).state).toBe(terminal);
  expect(f.ledger.state.holderSettled(f.holder)).toBe(true);
  const acknowledged = f.ledger.last.seq;
  expect(f.ledger.last.sends[0]?.message.class).toBe("result");
  f.ledger.seal(written(f.receive(acknowledged)));
  expect(f.ledger.state.holder(f.holder)).toBeNull();
  expect(released(f.ledger.state, f.definition, f.holder)).toBeNull();
});

test("a self-addressed made-up source cannot consume the real holder's final settlement", () => {
  const f = fixture(), closing = destinationPublicationSettlementPendingV17(f.ledger.state, f.ledger.own, f.operation)!.closing;
  const before = JSON.stringify(f.ledger.state.holder(f.holder));
  const request = { n: 0, to: f.ledger.at, message: { class: "request", type: "tell", body: { message: "publication-settle-cleaned", fields: { publication: f.holder, closing } } } } as const;
  // Invalid input is made up explicitly. It is not a recorded Native send.
  const source = { ...forged(f.ledger.at, 90, { type: "checkpoint", through: 0, state: d("e") }, [request]), under: "platform:destination" };
  const delivered = { ...request, from: factRefOf(source.entry) };
  const judged = judgeDelivery(f.ledger.state, f.definition, delivered, { ...arriving(f.ledger, delivered, source), platform: { named: OWNER, rules: f.rules } });
  const draft = written(judged);
  expect(draft.input).toMatchObject({ type: "delivery", decision: "refused", reason: { code: "bad-field" } });
  expect(draft.bound).toBeUndefined();
  f.ledger.seal(draft);
  expect(JSON.stringify(f.ledger.state.holder(f.holder))).toBe(before);
  expect(f.ledger.item(f.holder).state).toBe("closing-cleaned");
  expect(f.ledger.state.holderSettled(f.holder)).toBe(false);
});

test("a publication-sponsored receipt operation retains its actual target birth and immutable publication link", () => {
  const f = fixture("cleaned", true), receipt = f.ledger.state.item(2)!;
  expect(receipt.type).toBe("receipt");
  expect(receipt.state).toBe("written");
  expect(receipt.refs["publication"]).toBe(f.holder);
  expect(destinationPublicationSettlementPendingV17(f.ledger.state, f.ledger.own, f.operation)?.closing.seq).toBe(3);
  const proof = f.rule.beforeSend?.(f.ledger.state, f.operation, 1, f.ledger.own);
  if (!proof) throw Error("The actual receipt link must allow local settlement");
  // SCRIPTED corrupted current link must not override the actual birth.
  f.ledger.state.putItem({ ...receipt, refs: { ...receipt.refs, publication: 0 } });
  expect(destinationPublicationSettlementPendingV17(f.ledger.state, f.ledger.own, f.operation)).toBeNull();
  expect(f.rule.beforeSend?.(f.ledger.state, f.operation, 1, f.ledger.own)).toBeNull();
  f.ledger.state.putItem(receipt);
  f.offer(f.operation, "refused", proof);
  f.ledger.seal(written(f.receive(f.ledger.last.seq)));
  expect(f.ledger.item(f.holder).state).toBe("cleaned");
  expect(f.ledger.state.holderSettled(f.holder)).toBe(true);
});

test("unknown cleanup and pending accounts hold the operation before its pure local send", () => {
  const f = fixture(), original = f.ledger.state.operation("1:0")!;
  f.ledger.state.putOperation({ ...original, attempts: original.attempts.map(attempt => ({ ...attempt, outcomes: attempt.outcomes.map(outcome => ({ ...outcome, result: "unknown" })) })) });
  expect(f.rule.ready?.(f.ledger.state, f.operation, 1)).toBe(false);
  expect(f.rule.beforeSend?.(f.ledger.state, f.operation, 1, f.ledger.own)).toBeNull();
  expect(f.ledger.item(f.holder).state).toBe("closing-cleaned");
  expect(f.ledger.state.holderSettled(f.holder)).toBe(false);
  const pending = fixture();
  // SCRIPTED pending self-request/account: no provider or transport ran.
  pending.ledger.state.putRequest({ seq: 0, n: 1, hash: pending.ledger.fact(0).hash, type: "tell", to: pending.ledger.at, result: null, diagnosis: null });
  pending.ledger.state.putAccount({ seq: 0, n: 1, item: pending.holder });
  expect(pending.rule.ready?.(pending.ledger.state, pending.operation, 1)).toBe(false);
  expect(pending.rule.beforeSend?.(pending.ledger.state, pending.operation, 1, pending.ledger.own)).toBeNull();
});
