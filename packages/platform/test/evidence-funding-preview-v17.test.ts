/** SCRIPTED source/state/capacity hooks. Real funding rules and encoded values
 * own this carrying-budget boundary; this is not Native funding authority. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Bounds, type Effect, type Entry, type FactRef, type Input, type RulesObservation, type Sealed } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isEntry } from "@generalbusiness/dap-bytes";
import { MemoryState, valueDigest, type RuleEffect, type RuleGiven, type Rules } from "@generalbusiness/dap-derive";
import { d, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { certifiedPublicationWireV17, evidenceCarryingBudgetV17, type CertifiedPublicationStateV17 } from "../src/destination-budget-v17.ts";
import { fundingRules } from "../src/destination-evidence-funding-v17.ts";
import { destinationV17 } from "../src/destination-v17.ts";
import { evidenceWireV17 } from "../src/evidence-wire-v17.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";

function fundingPreview() {
  const destination = { ...otherLane, kind: "destination" as const }, rules = { ...otherLane, kind: "rules" as const };
  const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, roomService: null, labels: ['TEST\\"'],
    checks: [{ name: "published", configuration: d("b"), required: true, checker: keys.una.member, stage: "published" }],
    extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
    ] });
  if (!proposed.ok) throw Error("The scripted funding policy is invalid");
  const certificate = { request: fact(1, destination), certificate: fact(2, destination), proof: d("c"), commit: "a".repeat(40) };
  const envelope = { configured: true, policy: proposed.policy, proposal: proposed.digest, certificate };
  const observation: RulesObservation = { subject: "rules", of: rules, head: { seq: 3, hash: d("d") }, revision: 3, definition: "platform:rules@13", at: t(0),
    content: { asked: "rules", approvals: 1, ownerMayReview: false, checks: [{ name: "published", configuration: d("b"), required: true, checker: keys.una.member.member }],
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
  const request = { class: "request" as const, type: "tell" as const, body: { message: "evidence-fund", fields: { publication: publicationFact, operation, capture: { self: true }, ordinal: 0 } } };
  const capture = seal(3, { type: "outcome", owner: "platform:destination@17", kind: "judge", operation: "2:0", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: {} } },
    [{ effect: "state", item: 2, state: "reserved" }, { effect: "value", item: 2, slot: "passes", value: certifiedPublicationWireV17(snapshot, PROPOSED_BOUNDS) }], [{ n: 0, to: destination, message: request }]);
  const captureFact: FactRef = { at: destination, seq: 3, hash: capture.hash };
  const state = new MemoryState();
  state.putItem({ id: 2, type: "publication", state: "reserved", revision: 3, opened: publication.hash, parties: {}, refs: { operation }, values: {}, attributed: [] });
  const own = (seq: number): Sealed | null => seq === 0 ? genesis : seq === 2 ? publication : seq === 3 ? capture : null;
  // A bounded capacity-hook stand-in with escaping large enough that the
  // actual carrying entry, rather than the earlier capture, owns the byte edge.
  const capacity = evidenceWireV17({ test: "\\".repeat(32_768) }, 196_608);
  const base: Rules = { "evidence-fence-v17": { place: "guard", refusals: [], run: () => ({ holds: true }) },
    "evidence-open-v17": { place: "effect", most: 1, run: () => [] } };
  const configured = fundingRules(base, { fundCapacity: () => ({ effects: [], capacity, policyKey: d("f") }), capacityValid: value => value === capacity,
    jobState: () => null, readyUpdate: () => null });
  const guard = configured["evidence-fund-v17"], effects = configured["evidence-fund-open-v17"];
  if (guard?.place !== "guard" || effects?.place !== "effect") throw Error("The actual funding guard and effect are required");
  const given = (over: Partial<Bounds> = {}): RuleGiven => ({ state, own, time: t(0), uses: [], observed: () => null, value: () => undefined, placed: () => undefined,
    input: { type: "delivery", from: captureFact, n: 0, message: request }, resolved: { at: destination, self: 4, fields: { publication: publicationFact, operation, capture: captureFact, ordinal: 0 }, subjects: new Map(), signer: null, bounds: { ...PROPOSED_BOUNDS, ...over } } });
  const type = destinationV17.receives["evidence-fund"]!.opens;
  if (!type) throw Error("The actual receive must implicitly open its batch");
  const implicit: RuleEffect = { effect: "open", item: 4, type, state: destinationV17.items[type]!.initial };
  return { given, guard, effects, implicit, capacity };
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
