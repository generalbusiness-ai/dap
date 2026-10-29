/** SCRIPTED source/state/capacity hooks. Real funding rules and encoded values
 * own this carrying-budget boundary; this is not Native funding authority. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Bounds, type Effect, type Entry, type FactRef, type Input, type RulesObservation, type Sealed } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isEntry, isRecord } from "@generalbusiness/dap-bytes";
import { MemoryState, clockOf, evidenceDigest, operationOpening, outcomeOf, ownersOf, validateDefinition, valueDigest, type Opening, type Operation, type OutcomeGives, type RuleEffect, type RuleGiven, type RuleRequest, type Rules } from "@generalbusiness/dap-derive";
import { d, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { certifiedPublicationWireV17, certifiedWrittenPlanBudgetV17, evidenceCarryingBudgetV17, type CertifiedPublicationStateV17 } from "../src/destination-budget-v17.ts";
import { EVIDENCE_FUNDING_V17, EVIDENCE_PLAN_V17, destinationEvidenceFundingPending, destinationEvidencePlanPending, evidenceFundedBatchV17, evidenceFundingCaptureV17, evidenceFundingCompleteV17, fundingRules } from "../src/destination-evidence-funding-v17.ts";
import { evidenceBatchWireV17, readEvidenceBatchWireV17 } from "../src/evidence-batch-v17.ts";
import { destinationV17 } from "../src/destination-v17.ts";
import { evidenceWireV17 } from "../src/evidence-wire-v17.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";
import { requiredChecksV17 } from "../src/reservation-v17.ts";

function fundingPreview(options: { checks?: number; stageFirst?: boolean; stage?: "landing" | "published"; firstBatch?: number; pushResult?: OutcomeGives } = {}) {
  const destination = { ...otherLane, kind: "destination" as const }, rules = { ...otherLane, kind: "rules" as const };
  const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, roomService: null, labels: ['TEST\\"'],
    checks: Array.from({ length: options.checks ?? 1 }, (_, n) => ({ name: `published${n}`, configuration: d("b"), required: true, checker: keys.una.member, stage: options.stage ?? "published" })),
    extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
    ] });
  if (!proposed.ok) throw Error("The scripted funding policy is invalid");
  const required = requiredChecksV17(proposed.policy, ["source"]);
  if (!required.ok) throw Error("The scripted landing obligations are invalid");
  const certificate = { request: fact(1, destination), certificate: fact(2, destination), proof: d("c"), commit: "a".repeat(40) };
  const envelope = { configured: true, policy: proposed.policy, proposal: proposed.digest, certificate };
  const observation: RulesObservation = { subject: "rules", of: rules, head: { seq: 3, hash: d("d") }, revision: 3, definition: "platform:rules@13", at: t(0),
    content: { asked: "rules", approvals: 1, ownerMayReview: false, checks: proposed.policy.checks.map(({ name, configuration, required, checker }) => ({ name, configuration, required, checker: checker.member })),
      labels: ['TEST\\"'], singleControllerException: false, extents: valueDigest("artroom-rules-extents-3", envelope), roomService: null, serviceGeneration: { rules, seq: 0 } } };
  const snapshot: CertifiedPublicationStateV17 = { policy: { observation, input: { rules, destination, extents: envelope }, touched: ["source"], required: required.checks, tree: "b".repeat(40), manifest: fact(4) }, generations: [] };
  const seal = (seq: number, input: Input, effects: Effect[], sends: Entry["sends"] = []): Sealed => {
    const entry: Entry = { v: 1, at: destination, seq, prev: d("0"), time: t(0), clamped: false, epoch: 0, input, uses: [], prepared: [], effects, sends };
    if (!isEntry(entry)) throw Error("The scripted funding entry must retain the real wire shape");
    return { entry, hash: entryHash(entry) };
  };
  const genesis = seal(0, { type: "genesis", seed: { v: 1, kind: "destination", definition: "platform:destination@17", creator: null, cause: d("e"), ordinal: 0 },
    inc: destination.inc, kind: "establish", founding: null, source: null, n: null, message: null, decision: "applied" }, []);
  const publication = seal(2, { type: "timed", item: 2, rule: "TEST-publication", due: t(0) }, []);
  const publicationFact: FactRef = { at: destination, seq: 2, hash: publication.hash }, operation = fact(1);
  const capture = seal(3, { type: "outcome", owner: "platform:destination@17", kind: "judge", operation: "2:0", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: {} } },
    [{ effect: "state", item: 2, state: "reserved" }, { effect: "value", item: 2, slot: "passes", value: certifiedPublicationWireV17(snapshot, PROPOSED_BOUNDS) },
      ...((options.checks ?? 1) ? [{ effect: "operation" as const, k: 1, owner: "platform:destination@17" as const, kind: EVIDENCE_FUNDING_V17, attempts: 1, for: 2 },
        { effect: "attempt" as const, operation: { k: 1 }, attempt: 1, result: "opened" as const, selected: null }] : [])]);
  const captureFact: FactRef = { at: destination, seq: 3, hash: capture.hash };
  const state = new MemoryState();
  state.setScope({ at: destination, creator: null, status: "active", head: { seq: 3, hash: capture.hash }, time: t(0), genesis: { hash: genesis.hash, source: null, n: null }, held: [] });
  state.putItem({ id: 2, type: "publication", state: "reserved", revision: 2, opened: publication.hash, parties: {}, refs: { operation, lane: operation.at },
    values: { reservedAt: 3, integration: "a".repeat(40), tree: snapshot.policy.tree, passes: certifiedPublicationWireV17(snapshot, PROPOSED_BOUNDS) }, attributed: [] });
  state.addCount("publication", "reserved", 1);
  const staged = options.stageFirst === true;
  const stage = seal(4, { type: "outcome", owner: "platform:destination@17", kind: "reservation-stage", operation: "3:0", attempt: 1, result: "confirmed",
    evidence: { basis: "own-answer", body: { seen: "a".repeat(40), tree: snapshot.policy.tree } } }, []);
  state.putOperation({ id: "3:0", owner: "platform:destination@17", kind: "reservation-stage", most: 1, attempts: [], selected: null, for: 2 });
  const history = new Map<number, Sealed>([[0, genesis], [2, publication], [3, capture], ...(staged ? [[4, stage] as [number, Sealed]] : [])]);
  const own = (seq: number): Sealed | null => history.get(seq) ?? null;
  state.putOperation({ id: "3:1", owner: "platform:destination@17", kind: EVIDENCE_FUNDING_V17, most: 1, attempts: [], selected: null, for: 2 });
  // A bounded capacity-hook stand-in with escaping large enough that the
  // actual carrying entry, rather than the earlier capture, owns the byte edge.
  const capacity = evidenceWireV17({ test: "\\".repeat(32_768) }, 196_608);
  const baseUpdate: RuleRequest = { to: operation.at, message: { class: "request", type: "relate", body: { name: "publication", item: publicationFact,
    state: "reserved", detail: { operation, outcome: "committed" } } } };
  // SCRIPTED inherited stage, push and receipt callbacks expose whether
  // funding adds a gate to work that those callbacks already allow.
  const stageOpens: Opening[] = [{ owner: "platform:destination@17", kind: "push", attempts: 3, for: 2 }, { owner: "platform:destination@17", kind: "mint", attempts: 1, for: 2 }];
  const stageResult: OutcomeGives = { effects: [], sends: [], opens: stageOpens };
  const base: Rules = { "evidence-fence-v17": { place: "guard", refusals: [], run: () => ({ holds: true }) },
    "evidence-open-v17": { place: "effect", most: 1, run: () => [] },
    "publication-update": { place: "send", run: () => baseUpdate },
    "reservation-stage": { place: "outcome", rules: { selects: true, read: false, retries: () => false, most: { effects: 4, requests: 0, operations: 2 }, derives: () => stageResult } },
    push: { place: "outcome", rules: { selects: true, read: false, retries: () => false, holds: () => true, ready: () => true,
      most: { effects: 20, requests: 1, operations: 6 }, derives: () => options.pushResult ?? { effects: [], sends: [], opens: [] } } },
    receipt: { place: "outcome", rules: { selects: false, read: false, retries: () => false, most: { effects: 1, requests: 0, operations: 0 },
      derives: (_given, operation) => ({ effects: [{ effect: "state", item: operation.for!, state: "written" }], sends: [], opens: [] }) } },
    "deciding-read": { place: "outcome", rules: { selects: false, read: true, retries: () => false, most: { effects: 17, requests: 1, operations: 5 },
      derives: (_given, operation) => ({ effects: [{ effect: "state", item: operation.for!, state: "written" }], sends: [], opens: [] }) } } };
  const configured = fundingRules(base, { fundCapacity: () => ({ effects: [], capacity, policyKey: d("f") }), capacityValid: value => value === capacity,
    jobState: () => null });
  const guard = configured["evidence-fund-v17"], effects = configured["evidence-fund-open-v17"];
  if (guard?.place !== "guard" || effects?.place !== "effect") throw Error("The actual funding guard and effect are required");
  const self = options.firstBatch ?? 6;
  const fundingSend = configured["evidence-funding-dispatch-v17"];
  if (fundingSend?.place !== "send") throw Error("The actual counted funding dispatch is required");
  const fundingGiven: RuleGiven = { state, own, time: t(0), uses: [], observed: () => null, value: () => undefined, placed: () => undefined,
    input: { type: "outcome", owner: "platform:destination@17", kind: EVIDENCE_FUNDING_V17, operation: "3:1", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: { capture: captureFact } } },
    resolved: { at: destination, self: 5, fields: {}, subjects: new Map(), signer: null, bounds: PROPOSED_BOUNDS } };
  const first = fundingSend.run(fundingGiven);
  const dispatchEntry = seal(5, { type: "outcome", owner: "platform:destination@17", kind: EVIDENCE_FUNDING_V17, operation: "3:1", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: { capture: captureFact } } }, [],
    first ? [{ n: 0, ...first }] : []);
  history.set(5, dispatchEntry);
  const given = (over: Partial<Bounds> = {}, ordinal = 0): RuleGiven => {
    const source = history.get(ordinal === 0 ? 5 : self + ordinal - 1);
    const sent = source?.entry.sends.find(send => send.message.class === "request" && isRecord(send.message.body)
      && send.message.body["message"] === "evidence-fund" && isRecord(send.message.body["fields"]) && send.message.body["fields"]["ordinal"] === ordinal);
    return { state, own, time: t(0), uses: [], observed: () => null, value: () => undefined, placed: () => undefined,
      input: { type: "delivery", from: source ? { at: destination, seq: source.entry.seq, hash: source.hash } : captureFact, n: sent?.n ?? 0,
        message: sent?.message.class === "request" ? sent.message : { class: "request", type: "tell", body: {} } },
      // Actual readFacts normal forms: own facts are numbers, foreign merge stays full.
      resolved: { at: destination, self: self + ordinal, fields: { publication: publicationFact.seq, operation, capture: captureFact.seq, ordinal }, subjects: new Map(), signer: null, bounds: { ...PROPOSED_BOUNDS, ...over } } };
  };
  const type = destinationV17.receives["evidence-fund"]!.opens;
  if (!type) throw Error("The actual receive must implicitly open its batch");
  const implicit: RuleEffect = { effect: "open", item: self, type, state: destinationV17.items[type]!.initial };
  const batch = (at: RuleGiven, emitted: readonly RuleEffect[]) => {
    const values: Record<string, import("@generalbusiness/dap-contract").FieldValue | null> = {};
    for (const effect of emitted) if (effect.effect === "value" && effect.item === at.resolved.self) values[effect.slot] = effect.value;
    const dispatch = configured["evidence-funding-ready-v17"];
    if (dispatch?.place !== "send" || at.input.type !== "delivery" || at.input.message.class !== "request") throw Error("The actual serial batch dispatcher is required");
    const request = dispatch.run(at), requests = request ? [{ n: 0, ...request }] : [];
    const born = seal(at.resolved.self, { ...at.input, message: at.input.message, decision: "applied" }, [{ ...implicit, item: at.resolved.self }, ...emitted],
      [...requests, { n: requests.length, to: at.input.from.at, message: { class: "result", of: { from: at.input.from, n: at.input.n }, outcome: "applied" } }]);
    history.set(at.resolved.self, born);
    state.putItem({ id: at.resolved.self, type: "evidence-batch", state: "funded", revision: 1, opened: born.hash, parties: {}, refs: { operation, lane: operation.at }, values, attributed: [] });
    // The real fold updates both the item count and index. MemoryState refuses
    // an index whose indexed-row count differs from its complete type count.
    state.addCount("evidence-batch", "funded", 1);
    state.putIndexed("evidence-batch", "operation", canonicalize(operation), at.resolved.self);
    apply(at.resolved.self, emitted);
    state.setScope({ ...state.scope()!, head: { seq: born.entry.seq, hash: born.hash } });
  };
  const apply = (seq: number, emitted: readonly RuleEffect[]) => {
    const touched = new Set<number>();
    for (const effect of emitted) if (effect.effect === "value" || effect.effect === "state") {
      const item = state.item(effect.item); if (!item) throw Error("A scripted effect must name its retained item");
      const revision = item.id === seq || touched.has(item.id) ? item.revision : item.revision + 1;
      touched.add(item.id);
      if (effect.effect === "state" && effect.state !== item.state) { state.addCount(item.type, item.state, -1); state.addCount(item.type, effect.state, 1); }
      state.putItem(effect.effect === "value" ? { ...item, revision, values: { ...item.values, [effect.slot]: effect.value } } : { ...item, revision, state: effect.state });
    } else if (effect.effect === "operation") {
      const holder = effect.for === "self" ? seq : effect.for;
      state.putOperation({ id: `${seq}:${effect.k}`, owner: effect.owner, kind: effect.kind, most: effect.attempts, selected: null,
        ...(holder === undefined ? {} : { for: holder }), attempts: [{ attempt: 1, opened: seq, outcomes: [] }] });
    }
  };
  const retain = (given: RuleGiven, result: OutcomeGives) => {
    if (given.input.type !== "outcome") throw Error("The scripted receipt retains an actual outcome input");
    const emitted = [...result.effects, ...result.opens.flatMap((open, k) => operationOpening(k, open))];
    const sealed = seal(given.resolved.self, given.input, emitted);
    history.set(sealed.entry.seq, sealed); apply(sealed.entry.seq, emitted);
    state.setScope({ ...state.scope()!, head: { seq: sealed.entry.seq, hash: sealed.hash } });
    return sealed;
  };
  return { given, guard, effects, implicit, capacity, state, configured, base, stageResult, baseUpdate, batch, apply, retain, seal, history, own, captureFact, fundingGiven, snapshot };
}

test("the actual funding preview includes its implicit batch open at exact byte and effect edges without emitting it twice", () => {
  const fixture = fundingPreview({ stage: "landing" }), given = fixture.given();
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

test("published obligations refuse before capture or new work when the future written plan cannot fit, even though the funding entry fits", () => {
  const fixture = fundingPreview(), current = fixture.given(), emitted = fixture.effects.run(current);
  const constrained = fixture.given({ derivedEffects: 10 });
  expect(evidenceCarryingBudgetV17(constrained, [fixture.implicit, ...emitted], [], [], []).admitted).toBe(true);
  const future = certifiedWrittenPlanBudgetV17(constrained.resolved.bounds);
  expect(future.admitted).toBe(false);
  expect(future.effects).toBeGreaterThan(constrained.resolved.bounds.derivedEffects);
  expect(() => evidenceFundingCaptureV17(constrained, fixture.state.item(2)!, fixture.snapshot)).toThrow("future carrying entry");
  expect(fixture.guard.run(constrained)).toEqual({ holds: false, name: "evidence-funding-unavailable" });
  expect(() => fixture.effects.run(constrained)).toThrow();
  const landing = fundingPreview({ stage: "landing" }), landingGiven = landing.given({ derivedEffects: 10 });
  expect(evidenceFundingCaptureV17(landingGiven, landing.state.item(2)!, landing.snapshot)).not.toBeNull();
  expect(landing.guard.run(landingGiven)).toEqual({ holds: true });
});

test("SCRIPTED inherited stage updates and push permissions do not wait for the complete funding set", () => {
  for (const [checks, count] of [[0, 0], [9, 0], [9, 1]]) {
    const fixture = fundingPreview({ checks, stageFirst: true });
    if (count) { const given = fixture.given(); fixture.batch(given, fixture.effects.run(given)); }
    expect(evidenceFundingCompleteV17(fixture.state, fixture.state.item(2)!)).toBe(checks === 0);
    const stage = fixture.configured["reservation-stage"], send = fixture.configured["publication-update"], push = fixture.configured["push"], operation = fixture.state.operation("3:0")!;
    if (stage?.place !== "outcome" || !stage.rules.derives || send?.place !== "send" || push?.place !== "outcome") throw Error("The inherited callbacks are required");
    const given = fixture.given(), current: RuleGiven = { ...given, input: { type: "outcome", owner: "platform:destination@17", kind: "reservation-stage", operation: "3:0", attempt: 1,
      result: "confirmed", evidence: { basis: "own-answer", body: { seen: "a".repeat(40), tree: "b".repeat(40) } } } };
    expect(send.run(current)).toEqual(fixture.baseUpdate);
    expect(stage.rules.derives(current, operation, true)).toEqual(fixture.stageResult);
    const staged = { ...current, resolved: { ...current.resolved, self: 10 } };
    fixture.retain(staged, fixture.stageResult);
    const pushOperation = fixture.state.operation("10:0")!;
    const offered: RuleGiven = { ...staged, input: { type: "outcome", owner: pushOperation.owner, kind: "push", operation: pushOperation.id, attempt: 1,
      result: "confirmed", evidence: { basis: "own-answer", body: {} } } };
    expect(push.rules.holds?.(offered, pushOperation)).toBe(true);
    expect(push.rules.ready?.(fixture.state, pushOperation, 1)).toBe(true);
    expect(fixture.state.count("evidence-batch", "funded")).toBe(count);
  }
});

test("a SCRIPTED crowded inherited push keeps its allowance of 20 effects and adds only the receipt lookup key", () => {
  const crowded: OutcomeGives = { effects: [
    { effect: "value", item: 2, slot: "token", value: null }, { effect: "state", item: 2, state: "published" },
    { effect: "ref", item: 0, slot: "slot", to: null }, { effect: "value", item: 0, slot: "head", value: "a".repeat(40) },
    { effect: "open", item: 30, type: "receipt", state: "owed" },
    { effect: "value", item: 30, slot: "publication", value: 2 }, { effect: "value", item: 30, slot: "commit", value: "a".repeat(40) },
    { effect: "value", item: 0, slot: "judging", value: 40 },
  ], sends: [], opens: [
    { owner: "platform:destination@17", kind: "revoke", attempts: 3, for: 2 },
    { owner: "platform:destination@17", kind: "receipt", attempts: 3, for: 2 },
    { owner: "platform:destination@17", kind: "mint", attempts: 1, for: 2 },
    { owner: "platform:destination@17", kind: "judge", attempts: 1, for: 40 },
  ] };
  const fixture = fundingPreview({ pushResult: crowded }), rule = fixture.configured["push"], read = fixture.configured["deciding-read"];
  if (rule?.place !== "outcome" || !rule.rules.derives || !rule.rules.most || read?.place !== "outcome") throw Error("The inherited producer profiles are required");
  const operation: Operation = { id: "4:0", owner: "platform:destination@17", kind: "push", most: 3, for: 2, selected: null, attempts: [{ attempt: 1, opened: 4, outcomes: [] }] };
  const before = fixture.given(), given: RuleGiven = { ...before, input: { type: "outcome", owner: operation.owner, kind: operation.kind, operation: operation.id, attempt: 1,
    result: "confirmed", evidence: { basis: "own-answer", body: { send: "accepted", seen: "a".repeat(40) } } }, resolved: { ...before.resolved, self: 30 } };
  const unchanged = canonicalize(crowded), result = rule.rules.derives(given, operation, true);
  expect(rule.rules.most.effects).toBe(20);
  expect(read.rules.most?.effects).toBe(17);
  expect(result).toEqual({ ...crowded, effects: [...crowded.effects, { effect: "value", item: 30, slot: "publicationKey", value: 2 }] });
  // Most excludes the automatic outcome attempt. This scripted callback
  // exceeds the evidence admission cap without exceeding its own allowance.
  expect(result.effects.length + 2 * result.opens.length).toBeGreaterThan(16);
  expect(result.effects.length + 2 * result.opens.length).toBeLessThanOrEqual(rule.rules.most.effects);
  expect(canonicalize(crowded)).toBe(unchanged);
});

function owedReceipt(fixture: ReturnType<typeof fundingPreview>, position: number) {
  const publication = fixture.state.item(2)!, commit = publication.values["integration"]!;
  const born = fixture.seal(position, { type: "outcome", owner: "platform:destination@17", kind: "push", operation: "4:0", attempt: 1,
    result: "confirmed", evidence: { basis: "own-answer", body: {} } }, [
    { effect: "open", item: position, type: "receipt", state: "owed" },
    { effect: "value", item: position, slot: "publication", value: 2 }, { effect: "value", item: position, slot: "publicationKey", value: 2 },
    { effect: "value", item: position, slot: "commit", value: commit },
  ]);
  fixture.history.set(position, born);
  fixture.state.putItem({ id: position, type: "receipt", state: "owed", opened: born.hash, revision: 1, parties: {}, refs: {},
    values: { publication: 2, publicationKey: 2, evidenceWrittenAt: null, commit }, attributed: [] });
  fixture.state.addCount("receipt", "owed", 1);
  fixture.state.putIndexed("receipt", "publicationKey", canonicalize(2), position);
  fixture.state.setScope({ ...fixture.state.scope()!, head: { seq: position, hash: born.hash } });
  fixture.state.putItem({ ...publication, state: "published", refs: { ...publication.refs, manifest: fixture.snapshot.policy.manifest } });
  fixture.state.addCount("publication", "reserved", -1); fixture.state.addCount("publication", "published", 1);
  const operation: Operation = { id: `${position}:0`, owner: "platform:destination@17", kind: "receipt", most: 1, selected: null,
    for: position, attempts: [{ attempt: 1, opened: position, outcomes: [] }] };
  fixture.state.putOperation(operation);
  const write = (self: number, kind: "receipt" | "read" = "receipt") => {
    const rule = fixture.configured[kind === "receipt" ? "receipt" : "deciding-read"];
    if (rule?.place !== "outcome" || !rule.rules.derives) throw Error("The actual receipt wrapper is required");
    const current: Operation = kind === "receipt" ? operation : { ...operation, id: `${position}:1`, kind: "read" };
    fixture.state.putOperation(current);
    const before = fixture.given(), given: RuleGiven = { ...before, input: { type: "outcome", owner: current.owner, kind: current.kind, operation: current.id, attempt: 1,
      result: "confirmed", evidence: { basis: "own-answer", body: kind === "receipt" ? { send: "accepted", seen: commit } : { seen: commit } } }, resolved: { ...before.resolved, self, fields: {} } };
    return { given, result: rule.rules.derives(given, current, false) };
  };
  return { write, position };
}

test("SCRIPTED receipt-first and fund-first schedules open one original plan, and an unknown original never opens a replacement", () => {
  const values = destinationV17.items["receipt"]!.values;
  expect(values["publication"]).toMatchObject({ fixed: true, required: false });
  expect(Object.hasOwn(values["publication"]!, "default")).toBe(false);
  expect(values["publicationKey"]).toMatchObject({ fixed: true, required: true, default: 0, of: { type: "int" } });
  for (const receiptFirst of [true, false]) {
    const fixture = fundingPreview({ checks: 9, firstBatch: receiptFirst ? 20 : 6 });
    const first = fixture.given();
    let receipt: ReturnType<typeof owedReceipt>, opened: number;
    if (receiptFirst) {
      receipt = owedReceipt(fixture, 6);
      // An owed receipt permits the original carrier but is not a written
      // proof from which that carrier can open a plan.
      expect(fixture.guard.run(first)).toEqual({ holds: true });
      const partial = fixture.effects.run(first);
      expect(partial.some(effect => effect.effect === "operation" && effect.kind === EVIDENCE_PLAN_V17)).toBe(false);
      fixture.batch(first, partial);
      const written = receipt.write(21);
      expect(written.result.opens).toEqual([]);
      fixture.retain(written.given, written.result);
      const pending = fixture.given({}, 1), final = { ...pending, resolved: { ...pending.resolved, self: 22 } };
      expect(fixture.guard.run(final)).toEqual({ holds: true });
      const effects = fixture.effects.run(final);
      expect(effects.filter(effect => effect.effect === "operation" && effect.kind === EVIDENCE_PLAN_V17)).toMatchObject([{ for: first.resolved.self }]);
      fixture.batch(final, effects); opened = 22;
    } else {
      fixture.batch(first, fixture.effects.run(first));
      const final = fixture.given({}, 1), effects = fixture.effects.run(final);
      expect(effects.some(effect => effect.effect === "operation" && effect.kind === EVIDENCE_PLAN_V17)).toBe(false);
      fixture.batch(final, effects);
      receipt = owedReceipt(fixture, 10);
      // The real read outcome uses the deciding-read rule key. Recovery
      // must schedule the same plan when funding completed first.
      const written = receipt.write(11, "read");
      expect(written.result.opens).toEqual([{ owner: "platform:destination@17", kind: EVIDENCE_PLAN_V17, attempts: 1, for: first.resolved.self }]);
      fixture.retain(written.given, written.result); opened = 11;
    }
    const holder = fixture.state.item(first.resolved.self)!;
    expect(holder.values["planOpenedAt"]).toBe(opened);
    const original = fixture.state.operation(`${opened}:0`);
    if (!original) throw Error("The actual operation opening and initial attempt must fold before the marker is read");
    expect(original.attempts[0]?.opened).toBe(opened);
    const proof = destinationEvidencePlanPending(fixture.state, fixture.own, original);
    expect(proof?.written.seq).toBe(receiptFirst ? 21 : 11);
    expect(fixture.state.item(receipt.position)!.revision).toBe(2);
    expect(fixture.state.item(receipt.position)!.values["evidenceWrittenAt"]).toBe(receiptFirst ? 21 : 11);
    if (!proof) throw Error("The original plan must retain its actual written proof");
    const written = fixture.history.get(proof.written.seq)!;
    const missingDecision: Entry = { ...written.entry, effects: written.entry.effects.filter(effect => !(effect.effect === "state" && effect.state === "written")) };
    expect(isEntry(missingDecision)).toBe(true);
    fixture.history.set(proof.written.seq, { entry: missingDecision, hash: entryHash(missingDecision) });
    expect(destinationEvidencePlanPending(fixture.state, fixture.own, original)).toBeNull();
    fixture.history.set(proof.written.seq, written);
    expect(destinationEvidencePlanPending(fixture.state, fixture.own, original)).toEqual(proof);
    const evidence = { basis: "none" as const, body: {} };
    const unknown = fixture.seal(opened + 1, { type: "outcome", owner: original.owner, kind: original.kind, operation: original.id, attempt: 1,
      result: "unknown", evidence }, [{ effect: "attempt", operation: original.id, attempt: 1, result: "unknown", selected: null }]);
    fixture.history.set(unknown.entry.seq, unknown);
    fixture.state.setScope({ ...fixture.state.scope()!, head: { seq: unknown.entry.seq, hash: unknown.hash } });
    fixture.state.putOperation({ ...original, attempts: [{ ...original.attempts[0]!, outcomes: [{ seq: unknown.entry.seq, result: "unknown", evidence: evidenceDigest(evidence), selected: null }] }] });
    const retained = canonicalize(fixture.state.operation(original.id)), repeat = receipt.write(opened + 2, "read");
    expect(repeat.result.opens).toEqual([]);
    expect(repeat.result.effects.some(effect => effect.effect === "value" && effect.slot === "planOpenedAt")).toBe(false);
    expect(fixture.state.item(first.resolved.self)!.values["planOpenedAt"]).toBe(opened);
    expect(canonicalize(fixture.state.operation(original.id))).toBe(retained);
  }
});

test("one counted initial send retains the original capture and proves a serial chain of at most four accounts", () => {
  const fixture = fundingPreview({ checks: 32 }), pending = fixture.state.operation("3:1")!;
  expect(destinationEvidenceFundingPending(fixture.state, fixture.own, pending)).toEqual({ capture: fixture.captureFact });
  const outcome = fixture.configured["evidence-funding-outcome-v17"], send = fixture.configured["evidence-funding-dispatch-v17"];
  if (outcome?.place !== "outcome" || !outcome.rules.derives || send?.place !== "send") throw Error("The actual counted funding forms are required");
  expect(outcome.rules.derives(fixture.fundingGiven, pending, false).sends).toEqual([]);
  expect(send.run(fixture.fundingGiven)).toMatchObject({ message: { body: { fields: { ordinal: 0, capture: fixture.captureFact } } } });
  expect(destinationV17.outcomes[EVIDENCE_FUNDING_V17]!.send).toMatchObject({ once: true, code: "evidence-funding-dispatch-v17" });
  for (let ordinal = 0; ordinal < 4; ordinal++) {
    const context = fixture.given({}, ordinal);
    expect(context.resolved.fields["capture"]).toBe(fixture.captureFact.seq);
    expect(context.resolved.fields["publication"]).toBe(2);
    expect(fixture.guard.run(context)).toEqual({ holds: true });
    const emitted = fixture.effects.run(context); fixture.batch(context, emitted);
    const current = fixture.state.item(context.resolved.self)!;
    expect(evidenceFundedBatchV17(fixture.state, fixture.own, current, PROPOSED_BOUNDS)?.ordinal).toBe(ordinal);
  }
  expect(fixture.state.count("evidence-batch", "funded")).toBe(4);
  expect(evidenceFundingCompleteV17(fixture.state, fixture.state.item(2)!)).toBe(true);
});

test("the maintained owner and ledger settle the actual funding marked send, while the old zero-request ceiling leaves it unavailable", () => {
  // SCRIPTED retained capture and state, with the real G17 declaration,
  // actual funding rules and maintained combined marked-send settlement.
  const fixture = fundingPreview(), pending = fixture.state.operation("3:1");
  if (!pending) throw Error("The captured funding operation is required");
  fixture.state.putOperation({ ...pending, attempts: [{ attempt: 1, opened: 3, outcomes: [] }] });
  const validated = validateDefinition(destinationV17, PROPOSED_BOUNDS, undefined, { platform: true });
  if (!validated.ok) throw Error("The real G17 declaration must validate");
  const rule = fixture.configured["evidence-funding-outcome-v17"];
  if (rule?.place !== "outcome" || !rule.rules.most) throw Error("The funding rule needs its complete local ceiling");
  const settle = (rules: Rules, capture = fixture.captureFact) => outcomeOf(fixture.state, validated.definition,
    { type: "outcome", operation: pending.id, attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: { capture } } },
    ownersOf(validated.definition, { named: "platform:destination@17", rules }, null,
      { clock: clockOf(fixture.state, t(0)), bounds: PROPOSED_BOUNDS, own: fixture.own, ran: { clock: false } }));
  const legacy: Rules = { ...fixture.configured, "evidence-funding-outcome-v17": { ...rule,
    rules: { ...rule.rules, most: { ...rule.rules.most, requests: 0 } } } };
  expect(settle(legacy)).toEqual({ result: "unavailable", reason: "unavailable" });
  const settled = settle(fixture.configured);
  expect(settled.result).toBe("write");
  if (settled.result !== "write") throw Error("A correctly counted funding answer must write");
  expect(settled.draft.sends).toEqual([{ n: 0, to: fixture.captureFact.at,
    message: { class: "request", type: "tell", body: { message: "evidence-fund", fields: {
      publication: { at: fixture.captureFact.at, seq: 2, hash: fixture.history.get(2)!.hash },
      operation: fixture.state.item(2)!.refs["operation"], capture: fixture.captureFact, ordinal: 0,
    } } } }]);
  expect(settled.draft.effects).toEqual([{ effect: "attempt", operation: pending.id, attempt: 1, result: "confirmed", selected: null }]);
  expect(settle(fixture.configured, { ...fixture.captureFact, hash: d("e") })).toMatchObject({ result: "refused", reason: "bad-input" });
  // Derivation itself never mutates or settles the retained operation.
  expect(fixture.state.operation(pending.id)?.attempts[0]?.outcomes).toEqual([]);
});

test("new funding binds actual local normal forms and refuses after withdrawal, while existing proof permits legitimate mutable fields", () => {
  const fixture = fundingPreview(), context = fixture.given();
  expect(fixture.guard.run(context)).toEqual({ holds: true });
  const fullLocalShortcut: RuleGiven = { ...context, resolved: { ...context.resolved, fields: { ...context.resolved.fields, capture: fixture.captureFact } } };
  expect(fixture.guard.run(fullLocalShortcut)).toEqual({ holds: false, name: "evidence-funding-unavailable" });
  const publication = fixture.state.item(2)!;
  fixture.state.putItem({ ...publication, state: "aborted" });
  expect(fixture.guard.run(context)).toEqual({ holds: false, name: "evidence-funding-unavailable" });
  fixture.state.putItem(publication);
  fixture.batch(context, fixture.effects.run(context));
  const current = fixture.state.item(context.resolved.self)!, original = readEvidenceBatchWireV17(current.values["batch"]);
  if (!original) throw Error("A real batch wire is required");
  const changed = { ...original, planAt: 100, jobs: [{ name: original.checks[0]!.name, job: { at: original.operation.at, seq: 40, hash: d("a") } }] };
  const mutable = { ...current, values: { ...current.values, batch: evidenceBatchWireV17(changed) } };
  fixture.state.putItem(mutable);
  expect(evidenceFundedBatchV17(fixture.state, fixture.own, mutable, PROPOSED_BOUNDS)).toEqual(changed);
  fixture.state.putItem({ ...publication, state: "published" });
  expect(evidenceFundedBatchV17(fixture.state, fixture.own, mutable, PROPOSED_BOUNDS)).toEqual(changed);
  const forged = { ...mutable, values: { ...mutable.values, batch: evidenceBatchWireV17({ ...changed, capture: { ...changed.capture, hash: d("b") } }) } };
  fixture.state.putItem(forged);
  expect(evidenceFundedBatchV17(fixture.state, fixture.own, forged, PROPOSED_BOUNDS)).toBeNull();
});
