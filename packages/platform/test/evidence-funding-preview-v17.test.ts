/** SCRIPTED source/state/capacity hooks. Real funding rules and encoded values
 * own this carrying-budget boundary; this is not Native funding authority. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Bounds, type Effect, type Entry, type FactRef, type Input, type RulesObservation, type Sealed } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isEntry } from "@generalbusiness/dap-bytes";
import { MemoryState, valueDigest, type RuleEffect, type RuleGiven, type RuleRequest, type Rules } from "@generalbusiness/dap-derive";
import { d, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { certifiedPublicationWireV17, evidenceCarryingBudgetV17, type CertifiedPublicationStateV17 } from "../src/destination-budget-v17.ts";
import { evidenceFundingCompleteV17, evidenceFundingReadyV17, fundingRules } from "../src/destination-evidence-funding-v17.ts";
import { evidenceReadyUpdateV17 } from "../src/destination-evidence-v17.ts";
import { evidenceBatchWireV17, readEvidenceBatchWireV17 } from "../src/evidence-batch-v17.ts";
import { destinationV17 } from "../src/destination-v17.ts";
import { evidenceWireV17 } from "../src/evidence-wire-v17.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";

function fundingPreview(options: { checks?: number; productionReady?: boolean; stageFirst?: boolean } = {}) {
  const destination = { ...otherLane, kind: "destination" as const }, rules = { ...otherLane, kind: "rules" as const };
  const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, roomService: null, labels: ['TEST\\"'],
    checks: Array.from({ length: options.checks ?? 1 }, (_, n) => ({ name: `published${n}`, configuration: d("b"), required: true, checker: keys.una.member, stage: "published" })),
    extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
    ] });
  if (!proposed.ok) throw Error("The scripted funding policy is invalid");
  const certificate = { request: fact(1, destination), certificate: fact(2, destination), proof: d("c"), commit: "a".repeat(40) };
  const envelope = { configured: true, policy: proposed.policy, proposal: proposed.digest, certificate };
  const observation: RulesObservation = { subject: "rules", of: rules, head: { seq: 3, hash: d("d") }, revision: 3, definition: "platform:rules@13", at: t(0),
    content: { asked: "rules", approvals: 1, ownerMayReview: false, checks: proposed.policy.checks.map(({ name, configuration, required, checker }) => ({ name, configuration, required, checker: checker.member })),
      labels: ['TEST\\"'], singleControllerException: false, extents: valueDigest("artroom-rules-extents-3", envelope), roomService: null, serviceGeneration: { rules, seq: 0 } } };
  const snapshot: CertifiedPublicationStateV17 = { policy: { observation, input: { rules, destination, extents: envelope }, touched: ["source"], required: [], tree: "b".repeat(40), manifest: fact(4) }, generations: [] };
  const seal = (seq: number, input: Input, effects: Effect[], sends: Entry["sends"] = []): Sealed => {
    const entry: Entry = { v: 1, at: destination, seq, prev: d("0"), time: t(0), clamped: false, epoch: 0, input, uses: [], prepared: [], effects, sends };
    if (!isEntry(entry)) throw Error("The scripted funding entry must retain the real wire shape");
    return { entry, hash: entryHash(entry) };
  };
  const genesis = seal(0, { type: "genesis", seed: { v: 1, kind: "destination", definition: "platform:destination@17", creator: null, cause: d("e"), ordinal: 0 },
    inc: destination.inc, kind: "establish", founding: null, source: null, n: null, message: null, decision: "applied" }, []);
  const publication = seal(2, { type: "timed", item: 2, rule: "TEST-publication", due: t(0) }, []);
  const publicationFact: FactRef = { at: destination, seq: 2, hash: publication.hash }, operation = fact(1);
  const requests = Array.from({ length: Math.ceil((options.checks ?? 1) / 8) }, (_, ordinal) => ({ class: "request" as const, type: "tell" as const,
    body: { message: "evidence-fund", fields: { publication: publicationFact, operation, capture: { self: true }, ordinal } } }));
  const capture = seal(3, { type: "outcome", owner: "platform:destination@17", kind: "judge", operation: "2:0", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: {} } },
    [{ effect: "state", item: 2, state: "reserved" }, { effect: "value", item: 2, slot: "passes", value: certifiedPublicationWireV17(snapshot, PROPOSED_BOUNDS) }], requests.map((message, n) => ({ n, to: destination, message })));
  const captureFact: FactRef = { at: destination, seq: 3, hash: capture.hash };
  const state = new MemoryState();
  state.setScope({ at: destination, creator: null, status: "active", head: { seq: 3, hash: capture.hash }, time: t(0), genesis: { hash: genesis.hash, source: null, n: null }, held: [] });
  state.putItem({ id: 2, type: "publication", state: "reserved", revision: 3, opened: publication.hash, parties: {}, refs: { operation, lane: operation.at },
    values: { reservedAt: 3, integration: "a".repeat(40), tree: snapshot.policy.tree, passes: certifiedPublicationWireV17(snapshot, PROPOSED_BOUNDS) }, attributed: [] });
  state.addCount("publication", "reserved", 1);
  const staged = options.stageFirst === true;
  const stage = seal(4, { type: "outcome", owner: "platform:destination@17", kind: "reservation-stage", operation: "3:0", attempt: 1, result: "confirmed",
    evidence: { basis: "own-answer", body: { seen: "a".repeat(40), tree: snapshot.policy.tree } } }, []);
  state.putOperation({ id: "3:0", owner: "platform:destination@17", kind: "reservation-stage", most: 1, attempts: [], selected: null, for: 2 });
  const own = (seq: number): Sealed | null => seq === 0 ? genesis : seq === 2 ? publication : seq === 3 ? capture : seq === 4 && staged ? stage : null;
  // A bounded capacity-hook stand-in with escaping large enough that the
  // actual carrying entry, rather than the earlier capture, owns the byte edge.
  const capacity = evidenceWireV17({ test: "\\".repeat(32_768) }, 196_608);
  const baseUpdate: RuleRequest = { to: operation.at, message: { class: "request", type: "relate", body: { name: "publication", item: publicationFact,
    state: "reserved", detail: { operation, outcome: "committed" } } } };
  // This callback stands for the base rule's already-decided current stage
  // result. Funding readiness still uses the real retained staging reader.
  const base: Rules = { "evidence-fence-v17": { place: "guard", refusals: [], run: () => ({ holds: true }) },
    "evidence-open-v17": { place: "effect", most: 1, run: () => [] },
    "publication-update": { place: "send", run: () => baseUpdate },
    "reservation-stage": { place: "outcome", rules: { selects: true, read: false, retries: () => false, most: { effects: 0, requests: 0, operations: 0 },
      derives: () => ({ effects: [], sends: [], opens: [] }) } } };
  const configured = fundingRules(base, { fundCapacity: () => ({ effects: [], capacity, policyKey: d("f") }), capacityValid: value => value === capacity,
    jobState: () => null, readyUpdate: options.productionReady ? evidenceReadyUpdateV17 : () => null });
  const guard = configured["evidence-fund-v17"], effects = configured["evidence-fund-open-v17"];
  if (guard?.place !== "guard" || effects?.place !== "effect") throw Error("The actual funding guard and effect are required");
  const self = options.productionReady ? 5 : 4;
  const given = (over: Partial<Bounds> = {}, ordinal = 0): RuleGiven => ({ state, own, time: t(0), uses: [], observed: () => null, value: () => undefined, placed: () => undefined,
    input: { type: "delivery", from: captureFact, n: ordinal, message: requests[ordinal] ?? { class: "request", type: "tell", body: {} } },
    resolved: { at: destination, self: self + ordinal, fields: { publication: publicationFact, operation, capture: captureFact, ordinal }, subjects: new Map(), signer: null, bounds: { ...PROPOSED_BOUNDS, ...over } } });
  const type = destinationV17.receives["evidence-fund"]!.opens;
  if (!type) throw Error("The actual receive must implicitly open its batch");
  const implicit: RuleEffect = { effect: "open", item: self, type, state: destinationV17.items[type]!.initial };
  const batch = (at: RuleGiven, emitted: readonly RuleEffect[]) => {
    const values: Record<string, import("@generalbusiness/dap-contract").FieldValue | null> = { ready: false };
    for (const effect of emitted) if (effect.effect === "value" && effect.item === at.resolved.self) values[effect.slot] = effect.value;
    state.putItem({ id: at.resolved.self, type: "evidence-batch", state: "funded", revision: at.resolved.self, opened: d("d"), parties: {}, refs: { operation, lane: operation.at }, values, attributed: [] });
    // The real fold updates both the item count and index. MemoryState refuses
    // an index whose indexed-row count differs from its complete type count.
    state.addCount("evidence-batch", "funded", 1);
    state.putIndexed("evidence-batch", "operation", canonicalize(operation), at.resolved.self);
  };
  const stamp = (emitted: readonly RuleEffect[]) => {
    for (const effect of emitted) if (effect.effect === "value" && effect.slot === "ready") {
      const item = state.item(effect.item); if (!item || item.type !== "evidence-batch") throw Error("A real batch marker must be stamped");
      state.putItem({ ...item, values: { ...item.values, ready: effect.value } });
    }
  };
  return { given, guard, effects, implicit, capacity, state, configured, baseUpdate, batch, stamp };
}

test("the actual funding preview includes its implicit batch open at exact byte and effect edges without emitting it twice", () => {
  const fixture = fundingPreview(), given = fixture.given();
  expect(fixture.guard.run(given)).toEqual({ holds: true });
  const emitted = fixture.effects.run(given);
  expect(emitted.some(effect => effect.effect === "open")).toBe(false);
  expect(emitted.filter(effect => effect.effect === "value" && effect.slot === "capacity")).toMatchObject([{ value: fixture.capacity }]);
  const actual = [fixture.implicit, ...emitted], quote = evidenceCarryingBudgetV17(given, actual, [], [], []);
  const missingOpen = evidenceCarryingBudgetV17(given, emitted, [], [], []);
  expect(quote.admitted).toBe(true);
  expect(quote.write.items).toBe(1);
  expect(missingOpen.write.items).toBe(0);
  expect(quote.entryBytes).toBeGreaterThan(missingOpen.entryBytes);
  expect(fixture.guard.run(fixture.given({ entryBytes: quote.entryBytes }))).toEqual({ holds: true });
  expect(fixture.guard.run(fixture.given({ entryBytes: quote.entryBytes - 1 }))).toEqual({ holds: false, name: "evidence-funding-unavailable" });
  expect(() => fixture.effects.run(fixture.given({ entryBytes: quote.entryBytes - 1 }))).toThrow();
  expect(fixture.guard.run(fixture.given({ derivedEffects: actual.length }))).toEqual({ holds: true });
  expect(fixture.guard.run(fixture.given({ derivedEffects: actual.length - 1 }))).toEqual({ holds: false, name: "evidence-funding-unavailable" });
  expect(() => fixture.effects.run(fixture.given({ derivedEffects: actual.length - 1 }))).toThrow();
  expect(canonicalize(fixture.effects.run(fixture.given({ entryBytes: quote.entryBytes })))).toBe(canonicalize(emitted));
});

test("stage-first funding stamps the actual ordinal-zero account when the final account has another item", () => {
  const fixture = fundingPreview({ checks: 9, productionReady: true, stageFirst: true });
  const send = fixture.configured["evidence-funding-ready-v17"];
  if (send?.place !== "send") throw Error("The actual funding send is required");
  const first = fixture.given(), firstEffects = fixture.effects.run(first);
  expect(firstEffects.some(effect => effect.effect === "value" && effect.slot === "ready")).toBe(false);
  expect(send.run(first)).toBeNull();
  fixture.batch(first, firstEffects);
  expect(fixture.state.count("evidence-batch", "funded")).toBe(1);
  expect(evidenceFundingCompleteV17(fixture.state, fixture.state.item(2)!)).toBe(false);
  const final = fixture.given({}, 1), effects = fixture.effects.run(final);
  expect(fixture.guard.run(final)).toEqual({ holds: true });
  expect(send.run(final)).not.toBeNull();
  expect(effects.filter(effect => effect.effect === "value" && effect.slot === "ready")).toEqual([{ effect: "value", item: first.resolved.self, slot: "ready", value: true }]);
  expect(first.resolved.self).not.toBe(final.resolved.self);
  fixture.batch(final, effects); fixture.stamp(effects);
  expect(fixture.state.count("evidence-batch", "funded")).toBe(2);
  const publication = fixture.state.item(2)!;
  expect(evidenceFundingReadyV17(fixture.state, publication)).toBe(true);
  expect(evidenceFundingReadyV17(fixture.state, { ...publication, opened: d("e") })).toBe(false);
  expect(send.run(final)).toBeNull();
  const zero = fixture.state.item(first.resolved.self)!, record = readEvidenceBatchWireV17(zero.values["batch"]);
  if (!record) throw Error("The actual encoded ordinal-zero account is required");
  fixture.state.putItem({ ...zero, values: { ...zero.values, batch: evidenceBatchWireV17({ ...record, publication: { ...record.publication, hash: d("e") } }) } });
  expect(evidenceFundingReadyV17(fixture.state, publication)).toBe(false);
});

test("a newly opening batch zero can carry readiness, while fund-first stage completion stamps that same retained marker once", () => {
  const early = fundingPreview({ productionReady: true, stageFirst: true }), earlyGiven = early.given();
  expect(early.state.item(earlyGiven.resolved.self)).toBeNull();
  const earlyEffects = early.effects.run(earlyGiven);
  expect(earlyEffects.filter(effect => effect.effect === "value" && effect.slot === "ready")).toEqual([{ effect: "value", item: earlyGiven.resolved.self, slot: "ready", value: true }]);
  const fixture = fundingPreview({ productionReady: true }), given = fixture.given(), funded = fixture.effects.run(given);
  expect(funded.some(effect => effect.effect === "value" && effect.slot === "ready")).toBe(false);
  fixture.batch(given, funded);
  const stage = fixture.configured["reservation-stage"], send = fixture.configured["publication-update"], operation = fixture.state.operation("3:0");
  if (stage?.place !== "outcome" || !stage.rules.derives || send?.place !== "send" || !operation) throw Error("The actual stage wrapper and operation are required");
  const current: RuleGiven = { ...given, input: { type: "outcome", owner: "platform:destination@17", kind: "reservation-stage", operation: "3:0", attempt: 1, result: "confirmed",
    evidence: { basis: "own-answer", body: { seen: "a".repeat(40), tree: "b".repeat(40) } } },
    resolved: { ...given.resolved, self: 9, outcome: { selected: true, further: false } } };
  expect(send.run(current)).toEqual(fixture.baseUpdate);
  const result = stage.rules.derives(current, operation, true);
  expect(result.effects).toEqual([{ effect: "value", item: given.resolved.self, slot: "ready", value: true }]);
  fixture.stamp(result.effects);
  expect(send.run(current)).toBeNull();
  expect(stage.rules.derives(current, operation, true).effects).toEqual([]);
});

test("zero obligations preserve the base stage update without inventing a funding account or publication value", () => {
  const fixture = fundingPreview({ checks: 0, productionReady: true }), publication = fixture.state.item(2)!;
  expect(evidenceFundingCompleteV17(fixture.state, publication)).toBe(true);
  expect(evidenceFundingReadyV17(fixture.state, publication)).toBe(false);
  const stage = fixture.configured["reservation-stage"], send = fixture.configured["publication-update"], operation = fixture.state.operation("3:0");
  if (stage?.place !== "outcome" || !stage.rules.derives || send?.place !== "send" || !operation) throw Error("The stage wrapper is required");
  const given = fixture.given(), current: RuleGiven = { ...given, input: { type: "outcome", owner: "platform:destination@17", kind: "reservation-stage", operation: "3:0", attempt: 1, result: "confirmed",
    evidence: { basis: "own-answer", body: { seen: "a".repeat(40), tree: "b".repeat(40) } } }, resolved: { ...given.resolved, self: 9, outcome: { selected: true, further: false } } };
  expect(send.run(current)).toEqual(fixture.baseUpdate);
  expect(stage.rules.derives(current, operation, true).effects).toEqual([]);
  expect(fixture.state.count("evidence-batch", "funded")).toBe(0);
  expect(Object.hasOwn(destinationV17.items["publication"]!.values, "evidenceReady")).toBe(false);
  expect(Object.keys(destinationV17.items["publication"]!.values).length).toBeLessThanOrEqual(12);
  expect(destinationV17.items["evidence-batch"]!.values["ready"]).toMatchObject({ of: { type: "bool" }, default: false });
});
