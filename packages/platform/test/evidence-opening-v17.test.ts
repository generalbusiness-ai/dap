import { expect, test } from "vitest";
import type { Entry } from "@generalbusiness/dap-contract";
import { canonicalize, factRefOf } from "@generalbusiness/dap-bytes";
import { judgeDelivery, type Operation, type RuleEffect } from "@generalbusiness/dap-derive";
import { evidenceJobOpeningV17 } from "../src/destination-evidence-v17.ts";
import { destinationV17 } from "../src/destination-v17.ts";
import { newEvidenceIndexV17 } from "../src/evidence-index-v17.ts";
import { arriving, d, forged, otherLane } from "@generalbusiness/dap-derive/testing";
import { evidenceOperationOpeningV17 } from "../src/evidence-opening-v17.ts";
// The maintained reservation witness is not in dap-derive/testing's public
// exports. Reuse that narrow test fixture, without importing kernel internals.
import { OWNER, TELL, Works, changed, opened, works, worksDefinition } from "../../derive/test/fixtures-holds.ts";

function selfOpening() {
  // SCRIPTED marked rule and incoming source; the maintained judge, seal
  // and fold do the transformation. This is not G17 Native authority.
  const scope = new Works(worksDefinition);
  let returned: readonly RuleEffect[] = [];
  scope.script.begin = ({ resolved }) => { returned = opened(0, "step", 1, resolved.self); return returned; };
  expect(scope.start()).toBe("written");
  const id = scope.opened()[0]!;
  const operation = scope.state.operation(id);
  if (!operation) throw Error("The maintained fold did not retain the operation");
  return { scope, returned, entry: scope.last, operation };
}

test("numeric self from the actual marked rule seals as self and folds back to the real holder position", () => {
  const { scope, returned, entry, operation } = selfOpening();
  expect(returned.find(effect => effect.effect === "operation")).toEqual({ effect: "operation", k: 0, owner: OWNER, kind: "step", attempts: 1, for: entry.seq });
  expect(entry.effects.find(effect => effect.effect === "operation")).toEqual({ effect: "operation", k: 0, owner: OWNER, kind: "step", attempts: 1, for: "self" });
  expect(operation.for).toBe(entry.seq);
  expect(evidenceOperationOpeningV17(entry, operation)).toBe(true);
  // The maintained replay fold retains the same numeric holder too.
  expect(scope.replay().operation(operation.id)?.for).toBe(entry.seq);
});

test("only the exact sequence, ordinal, owner, kind, attempt ceiling and holder match", () => {
  const { entry, operation } = selfOpening(), before = canonicalize({ entry, operation });
  const changed: Operation[] = [
    { ...operation, id: `${entry.seq + 1}:0` }, { ...operation, id: `${entry.seq}:1` },
    { ...operation, id: `${entry.seq}:00` }, { ...operation, owner: "platform:destination@17" },
    { ...operation, kind: "different" }, { ...operation, most: 2 }, { ...operation, most: 0 },
    { ...operation, for: entry.seq + 1 }, { ...operation, for: Number.NaN },
  ];
  const noHolder = { ...operation }; delete noHolder.for;
  changed.push(noHolder);
  for (const candidate of changed) expect(evidenceOperationOpeningV17(entry, candidate)).toBe(false);
  expect(canonicalize({ entry, operation })).toBe(before);
});

test("numeric and absent holders preserve their own meanings; duplicate or malformed opening rows refuse", () => {
  const { entry, operation } = selfOpening();
  const numeric: Entry = { ...entry, effects: entry.effects.map(effect => effect.effect === "operation" ? { ...effect, for: 0 } : effect) };
  expect(evidenceOperationOpeningV17(numeric, { ...operation, for: 0 })).toBe(true);
  expect(evidenceOperationOpeningV17(numeric, operation)).toBe(false);
  const noHolder: Entry = { ...entry, effects: entry.effects.map(effect => {
    if (effect.effect !== "operation") return effect;
    const rest = { ...effect }; delete rest.for; return rest;
  }) };
  const unbound = { ...operation }; delete unbound.for;
  expect(evidenceOperationOpeningV17(noHolder, unbound)).toBe(true);
  expect(evidenceOperationOpeningV17(noHolder, operation)).toBe(false);
  const opening = entry.effects.find(effect => effect.effect === "operation")!;
  expect(evidenceOperationOpeningV17({ ...entry, effects: [...entry.effects, opening] }, operation)).toBe(false);
  expect(evidenceOperationOpeningV17({ ...entry, seq: -1 }, operation)).toBe(false);
  expect(evidenceOperationOpeningV17({ ...entry, effects: entry.effects.map(effect => effect.effect === "operation" ? { ...effect, k: -1 } : effect) }, operation)).toBe(false);
});

test("a counted outcome's own request is refused, while its actual marked send seals once under the same held operation", () => {
  // SCRIPTED rule/provider boundary; the maintained Native-form judge,
  // reservation ledger and fold enforce the marked-send distinction.
  const { scope, operation } = selfOpening(), head = scope.head;
  scope.script.derives = () => ({ effects: [], sends: [TELL], opens: [] });
  expect(scope.outcome(operation.id, 1, "confirmed")).toBe("unavailable");
  expect(scope.head).toEqual(head);
  scope.script.derives = () => ({ effects: [], sends: [], opens: [] });
  scope.script.report = () => TELL;
  expect(scope.outcome(operation.id, 1, "confirmed")).toBe("written");
  expect(scope.last.sends).toEqual([{ n: 0, ...TELL }]);
  const settled = scope.state.operation(operation.id);
  expect(settled?.for).toBe(operation.for);
  expect(settled?.attempts[0]?.outcomes).toHaveLength(1);
});


test("an admitted anchor opens the real initial state before its projection through the maintained outcome judge", () => {
  // SCRIPTED holder/provider and proof-free item use the exact G17 state
  // grammar. The real judge/seal/fold enforce initialization, not admission.
  const declared = destinationV17.items["evidence-job"]!;
  const checked = changed(works, data => {
    data.items["evidence-job"] = { many: true, max: 10, initial: declared.initial, states: declared.states, parties: {}, refs: {}, values: {} };
    data.items["job"].holds.items = 1;
    data.outcomes["step"].most = { ...data.outcomes["step"].most, effects: 1, opens: "evidence-job" };
  });
  if (!checked.ok) throw Error("The scripted initialization boundary must validate");
  const scope = new Works(checked.definition);
  scope.script.begin = ({ resolved }) => opened(0, "step", 1, resolved.self);
  expect(scope.start()).toBe("written");
  const operation = scope.opened()[0]!, before = scope.head;
  const index = newEvidenceIndexV17({ room: otherLane, tree: "a".repeat(40), name: "unit", configuration: d("b"), source: "member", stage: "work" });
  if (!index) throw Error("The scripted candidate index must fit");
  const record = { state: "admitted" as const, funded: { holds: false, policy: false, reuse: true, incident: false }, reuse: index, incident: null, noticeAt: null };
  scope.script.derives = (_kind, given) => ({ effects: [{ effect: "open", item: given.resolved.self, type: "evidence-job", state: "reuse-anchor" }], sends: [], opens: [] });
  expect(scope.outcome(operation, 1, "confirmed")).toBe("unavailable");
  expect(scope.head).toEqual(before);
  scope.script.derives = (_kind, given) => ({ effects: evidenceJobOpeningV17(given.resolved.self, record), sends: [], opens: [] });
  expect(scope.outcome(operation, 1, "confirmed")).toBe("written");
  expect(scope.last.effects.filter(effect => effect.effect === "open" || effect.effect === "state")).toEqual([
    { effect: "open", item: scope.last.seq, type: "evidence-job", state: declared.initial },
    { effect: "state", item: scope.last.seq, state: "reuse-anchor" },
  ]);
  expect(scope.state.item(scope.last.seq)?.state).toBe("reuse-anchor");
  expect(scope.replay().item(scope.last.seq)?.state).toBe("reuse-anchor");
});


test("a funded bound delivery can open its counted operation but cannot open even a nonholder item", () => {
  // SCRIPTED lane/holder; actual delivery, reservation ledger, judge and
  // fold enforce section17a. No G17 source authority is claimed here.
  const checked = changed(works, data => {
    data.items["job"].refs["lane"] = { fixed: true, required: true, to: { type: "scope", kind: "lane" } };
    data.items["job"].holds.items = 1;
    data.items["job"].holds.decisions = { follow: 1 };
    data.items["evidence-job"] = { many: true, max: 10, initial: "job", states: { job: { final: false } }, parties: {}, refs: {}, values: {} };
    data.receives["follow"] = { message: "follow", class: "tell", from: { kind: "lane" }, opens: null,
      also: { job: { item: "job", by: "job" } }, fields: { job: { type: "item", of: "job", required: true } },
      bound: { of: "also.job", where: [{ equals: { a: { sender: true }, b: { slot: "lane", of: "also.job" } } }] },
      guards: [], effects: [{ code: "after", row: "P16", most: { effects: 2, opens: "evidence-job", operations: ["step"] } }], sends: [], attention: [] };
  });
  if (!checked.ok) throw Error("The scripted bound boundary must validate");
  const scope = new Works(checked.definition);
  scope.script.begin = given => [{ effect: "ref", item: given.resolved.self, slot: "lane", to: otherLane }, ...opened(0, "step", 1, given.resolved.self)];
  expect(scope.start()).toBe("written");
  const holder = scope.last.seq, before = scope.head;
  const message = { class: "request", type: "tell", body: { message: "follow", fields: { job: holder } } } as const;
  const source = forged(otherLane, 999, { type: "checkpoint", through: 0, state: scope.entries[0]!.hash }, [{ n: 0, to: scope.at, message }]);
  const arrival = { from: factRefOf(source.entry), n: 0, to: scope.at, message };
  const take = () => {
    const judged = judgeDelivery(scope.state, scope.definition, arrival, { ...arriving(scope, arrival, source), platform: scope.rules });
    // Ledger.seal supplies the actual retained source via foldOptions;
    // Works.commit's extra trial fold has no bound-delivery source context.
    if (judged.result === "write") scope.seal(judged.draft);
    return judged.result;
  };
  scope.script.after = given => [{ effect: "open", item: given.resolved.self, type: "evidence-job", state: "job" }];
  expect(take()).toBe("unavailable");
  expect(scope.head).toEqual(before);
  scope.script.after = () => opened(0, "step", 1, holder);
  expect(take()).toBe("write");
  expect(scope.last.effects.some(effect => effect.effect === "open")).toBe(false);
  const operation = scope.state.operation(`${scope.last.seq}:0`);
  expect(operation?.for).toBe(holder);
  expect(scope.replay().operation(`${scope.last.seq}:0`)?.for).toBe(holder);
  expect(scope.last.sends).toHaveLength(1);
});
