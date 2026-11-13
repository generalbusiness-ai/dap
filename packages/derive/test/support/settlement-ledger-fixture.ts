/** Actual judges/fold over the existing made-up marker/Works fixtures.
 * Scope authority, peers, platform callbacks and their numbers are stand-ins.
 * The expected ledger lives in a separate module with no production imports. */
import type { Entry, OperationId } from "@generalbusiness/dap-contract";
import { factRefOf, entryHash } from "@generalbusiness/dap-bytes";
import { applyEntry, checkpointOf, clockOf, entryOf, fits, judgeDelivery, reserved, type Draft, type StateView, type ValidDefinition } from "../../src/index.ts";
import { Scope, arriving, directory, forged, keys, on, otherLane, valid, variant } from "../fixtures.ts";
import { Works, changed, opened, OWNER, TELL, works } from "../fixtures-holds.ts";
import { M } from "../definition-corpus/forms-settles-data.ts";
import { settlesChanges } from "../definition-corpus/settles-variants.ts";
import type { Command, Family } from "./settlement-ledger-model.ts";
declare function structuredClone<T>(value: T): T;

export const markerLedgerDefinition = variant(M, data => {
  settlesChanges.alias(data); settlesChanges.duties(data);
  data.acts.finish = structuredClone(data.acts.close);
  delete data.acts.finish.settles;
});
export const worksLedgerDefinition = valid(changed(works, data => {
  data.capacity = { name: "whole-scope", version: 1 };
  data.acts.settle = structuredClone(data.acts.finish);
  data.acts.settle.settles = { of: "on", in: ["open"] };
  data.items.job.refs.peer = { fixed: true, required: true, to: { type: "scope", kind: "lane" } };
  data.receives.start.effects.push({ ref: { slot: "peer", from: { sender: true } } });
  // One unheld, one-attempt cleanup gives an independently countable
  // four-entry request: two for result/diagnosis and two cleanup outcomes.
  data.outcomes.audit = { code: "audit", row: "P16", attempts: 1 };
  for (const long of [false, true]) data.acts[long ? "ask-long" : "ask-short"] = {
    ...structuredClone(data.acts.finish), effects: [], sends: [{ tell: {
      to: { slot: "peer" }, message: long ? "long" : "short", fields: {},
      result: long ? { applied: [{ code: "after", row: "P16", most: { effects: 0, operations: ["audit"] } }] } : {},
    } }],
  };
}));

class MarkerScope extends Scope {
  constructor(readonly budget: number, ordinal: number) { super(markerLedgerDefinition, keys.rita.member, true, ordinal); }
  commit(judgment: { result: string; draft?: Draft }) {
    if (judgment.result !== "write" || !judgment.draft) return judgment.result;
    const copy = this.replay(), entry = entryOf(this.state, judgment.draft, clockOf(this.state, this.now));
    applyEntry(copy, this.definition, entry, entryHash(entry), this.foldOptions);
    if (!fits(copy, this.definition, { scopeEntries: this.budget }, entry.input, judgment.draft.settles)) return "scope-full";
    this.seal(judgment.draft);
    return "written";
  }
}
export class SettlementFixture {
  readonly scope: MarkerScope | Works;
  readonly definition: ValidDefinition;
  #source = 1000;
  #replies = new Map<string, ReturnType<typeof forged>>();
  constructor(readonly family: Family, readonly capacity: number, ordinal: number) {
    this.scope = family === "marker" ? new MarkerScope(capacity, ordinal) : new Works(worksLedgerDefinition, ordinal);
    if (this.scope instanceof Works) {
      this.scope.budget = capacity;
      this.scope.script.begin = ({ resolved }) => opened(0, "step", 1, resolved.self);
    }
    this.definition = this.scope.definition;
  }
  run(command: Command): string {
    const scope = this.scope;
    if (command.kind === "open") {
      return scope instanceof Works ? scope.start()
        : scope.commit(scope.judge(scope.intent(keys.una, "start", { fields: { desk: directory } })));
    }
    if (command.kind === "outcome") {
      if (!(scope instanceof Works)) throw new Error("Works outcome required");
      scope.script.derives = (_kind, _given, operation) => ({ effects: [], sends: [], opens: command.spawn
        ? [{ owner: OWNER, kind: command.spawn, attempts: 1, for: operation.for! }] : [] });
      scope.script.report = () => command.report ? TELL : null;
      return scope.outcome(command.operation as OperationId, 1, command.result);
    }
    if (command.kind === "reply") {
      const origin = scope.entries[command.origin]!.entry, sent = origin.sends[0]!;
      const request = { from: scope.fact(command.origin), n: 0 };
      const send = { n: 0, to: scope.at, message: { class: "result", of: request, outcome: command.result } } as const;
      const key = `${command.origin}:${command.result}`;
      let source = this.#replies.get(key);
      if (!source) {
        source = forged(this.family === "marker" ? directory : otherLane, ++this.#source,
          { type: "delivery", sourceKind: "lane", ...request, message: sent.message as never, decision: command.result }, [send]);
        this.#replies.set(key, source);
      }
      if (scope instanceof Works) scope.script.after = () => opened(0, "audit", 1);
      const arrival = { ...send, from: factRefOf(source.entry, source.sequence.at) };
      return scope.commit(judgeDelivery(scope.state, scope.definition, arrival,
        { ...arriving(scope, arrival, source), ...(scope instanceof Works ? { platform: scope.rules } : {}) }));
    }
    if (command.kind === "checkpoint") {
      return scope.commit({ result: "write", draft: { input: { type: "checkpoint", ...checkpointOf(scope.state) },
        uses: [], prepared: [], effects: [], sends: [], judgesTime: false } });
    }
    const kind = command.kind === "settle" && this.family === "marker" ? "close" : command.kind;
    const also = command.kind === "mark-target" ? { target: scope.item(command.item).refs["target"] as number } : {};
    const fields = command.kind === "point" ? { target: command.target } : command.kind === "mark-target" ? { next: command.next } : {};
    const over = { ...on(scope, command.item, also), fields };
    return scope instanceof Works ? scope.does(kind, over) : scope.commit(scope.judge(scope.intent(keys.una, kind, over)));
  }
  snapshot() { return settlementProjection(this.scope.state, this.definition, this.scope.last, seq => this.scope.entries[seq]!.entry, this.family); }
}

/** Projection of observed obligations only. This never computes an expectation. */
export function settlementProjection(state: StateView, definition: ValidDefinition, last: Entry, origin: (seq: number) => Entry, family: Family) {
  const all = state.all(), amount = reserved(state, definition, last.input);
  return {
    head: all.scope!.head.seq,
    jobs: all.items.filter(item => item.type === "job").map(item => ({ item: item.id, state: item.state,
      ...(family === "marker" ? { a: item.values["a"], b: item.values["b"], target: item.refs["target"] ?? null } : {}) })),
    duties: state.itemDuties().map(duty => ({ item: duty.item, kind: duty.kind, slot: duty.slot, entries: duty.amount.entries, requests: duty.amount.requests }))
      .sort((a, b) => a.item - b.item || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : (a.slot ?? "").localeCompare(b.slot ?? ""))),
    requests: all.requests.filter(request => request.result === null && request.diagnosis?.finding !== "undelivered").map(request => {
      const input = origin(request.seq).input;
      const source = input.type === "act" ? `acts.${input.signed.intent.kind}` : input.type === "outcome" ? `outcomes.${input.kind}` : input.type;
      return { seq: request.seq, n: request.n, source, entries: request.reservation?.entries, requests: request.reservation?.requests, account: state.account(request.seq, request.n) };
    }),
    operations: all.operations.map(operation => ({ id: operation.id, kind: operation.kind, item: operation.for ?? null,
      results: operation.attempts.flatMap(attempt => attempt.outcomes.map(outcome => outcome.result)) })),
    holders: (all.holders ?? []).map(({ item, held }) => ({ item, step: held.operations?.["step"] ?? 0, tidy: held.operations?.["tidy"] ?? 0, requests: held.requests ?? 0 })),
    settled: all.settledHolders ?? [],
    reservation: { entries: amount.entries, requests: amount.requests },
  };
}
