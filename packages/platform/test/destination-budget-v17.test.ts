import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef, type Incarnation, type RulesObservation } from "@generalbusiness/dap-contract";
import { canonicalize, isEntry, isFieldValue, signIntent, utf8 } from "@generalbusiness/dap-bytes";
import { observationBytes, valueDigest, type Item, type RuleGiven } from "@generalbusiness/dap-derive";
import { d, grantOf, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { evidenceDestinationProfileV17, evidencePolicyV17 } from "../src/destination-evidence-v17.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";
import { CERTIFIED_PUBLICATION_TEXT_BYTES_V17, certifiedCaptureBudgetV17, certifiedPublicationBudgetV17, certifiedPublicationStateV17,
  certifiedPublicationStateWireV17, certifiedPublicationWireV17, certifiedWrittenPlanBudgetV17, evidenceCarryingBudgetV17, evidenceCarryingInputV17, type CertifiedPublicationStateV17 } from "../src/destination-budget-v17.ts";

// SCRIPTED policy observations and facts. These tests exercise byte and
// wire correspondence, not Native certificates or publication authority.
const destination = { ...otherLane, kind: "destination" as const }, rules = { ...otherLane, kind: "rules" as const };
const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
function record(label = "wire"): CertifiedPublicationStateV17 {
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, checks: [], labels: [label], roomService: null,
    extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
    ] });
  if (!proposed.ok) throw Error("The scripted policy is invalid");
  const certificate = { request: fact(1, destination), certificate: fact(2, destination), proof: d("b"), commit: "a".repeat(40) };
  const envelope = { configured: true, policy: proposed.policy, proposal: proposed.digest, certificate };
  const observation: RulesObservation = { subject: "rules", of: rules, head: { seq: 3, hash: d("c") }, revision: 3, definition: "platform:rules@13", at: t(0),
    content: { asked: "rules", approvals: 1, ownerMayReview: false, checks: [], labels: [label], singleControllerException: false,
      extents: valueDigest("artroom-rules-extents-3", envelope), roomService: null, serviceGeneration: { rules, seq: 0 } } };
  return { policy: { observation, input: { rules, destination, extents: envelope }, touched: ["source"], required: [], tree: "a".repeat(40), manifest: fact(4) }, generations: [] };
}
function capture(value: CertifiedPublicationStateV17): Entry {
  return { v: 1, at: destination, seq: 5, prev: d("a"), time: t(0), clamped: false, epoch: 0, prepared: [], uses: [], sends: [],
    input: { type: "outcome", owner: "platform:destination@17", kind: "judge", operation: "4:0", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: {} } },
    effects: [{ effect: "value", item: 4, slot: "passes", value: certifiedPublicationWireV17(value, PROPOSED_BOUNDS) }] };
}
test("nullable captured policy is a strict text value in an otherwise valid entry", () => {
  const value = record(), text = certifiedPublicationWireV17(value, PROPOSED_BOUNDS);
  expect(certifiedPublicationStateV17(value, PROPOSED_BOUNDS)).toEqual(value);
  expect(isFieldValue(value)).toBe(false);
  expect(isFieldValue(text)).toBe(true);
  expect(isEntry(capture(value))).toBe(true);
  expect(certifiedPublicationStateWireV17(text, PROPOSED_BOUNDS)).toEqual(value);
  expect(certifiedPublicationStateWireV17(value, PROPOSED_BOUNDS)).toBeNull();
  expect(certifiedPublicationStateV17(text, PROPOSED_BOUNDS)).toBeNull();
  expect(certifiedPublicationStateWireV17(` ${text}`, PROPOSED_BOUNDS)).toBeNull();
  expect(certifiedPublicationStateWireV17(" ".repeat(CERTIFIED_PUBLICATION_TEXT_BYTES_V17 + 1), PROPOSED_BOUNDS)).toBeNull();
  expect(certifiedPublicationStateWireV17(text, { ...PROPOSED_BOUNDS, entryBytes: utf8(text).length - 1 })).toBeNull();
});
test("capture and future passes budgets include outer text quotes and escapes", () => {
  const value = record(), text = certifiedPublicationWireV17(value, PROPOSED_BOUNDS), budget = certifiedPublicationBudgetV17(value, PROPOSED_BOUNDS);
  expect(budget.recordBytes).toBe(utf8(canonicalize(text)).length);
  expect(budget.recordBytes).toBeGreaterThan(utf8(canonicalize(value)).length);
  const measured = certifiedCaptureBudgetV17(value, PROPOSED_BOUNDS, capture(value));
  expect(measured.admitted).toBe(true);
  const exact = { ...PROPOSED_BOUNDS, entryBytes: measured.captureEntryBytes };
  expect(certifiedCaptureBudgetV17(value, exact, capture(value)).admitted).toBe(true);
  expect(certifiedCaptureBudgetV17(value, { ...exact, entryBytes: exact.entryBytes - 1 }, capture(value)).admitted).toBe(false);
  expect(certifiedPublicationBudgetV17(record("\\".repeat(16)), PROPOSED_BOUNDS).recordBytes)
    .toBeGreaterThan(certifiedPublicationBudgetV17(record("a".repeat(16)), PROPOSED_BOUNDS).recordBytes);
});

test("carrying request input matches an isEntry-valid applied delivery including its implicit opening and reply", () => {
  const message = { class: "request" as const, type: "tell" as const, body: { message: "evidence-fund", fields: { publication: fact(1, destination) } } };
  const offered: RuleGiven["input"] = { type: "delivery", from: fact(4, destination), n: 0, message };
  const entry: Entry = { v: 1, at: destination, seq: 5, prev: d("a"), time: t(0), clamped: false, epoch: 0, prepared: [], uses: [],
    input: { type: "delivery", from: fact(4, destination), n: 0, message, decision: "applied" },
    effects: [{ effect: "open", item: 5, type: "evidence-batch", state: "funded" }],
    sends: [{ n: 0, to: destination, message: { class: "result", of: { from: fact(4, destination), n: 0 }, outcome: "applied" } }] };
  expect(isEntry(entry)).toBe(true);
  expect(evidenceCarryingInputV17(offered)).toEqual(entry.input);
  const given = { input: offered, uses: [], resolved: { at: destination, self: 5, bounds: PROPOSED_BOUNDS } } as unknown as RuleGiven;
  const measured = evidenceCarryingBudgetV17(given, [{ effect: "open", item: 5, type: "evidence-batch", state: "funded" }], [], [], []);
  expect(measured.entryBytes).toBeGreaterThanOrEqual(utf8(canonicalize(entry)).length);
  expect(measured.write.items).toBe(1);
});

test("carrying act input uses its actual grant authority and presented facts, without internal grant fields", () => {
  const signed = signIntent({ v: 1, to: destination, actor: keys.una.key, kind: "evidence-recover-timeout", on: 0,
    expected: { on: 0, job: 3 }, fields: { admission: fact(3, destination) }, idempotencyKey: "scripted-carrier", notAfter: t(60) }, keys.una.secret);
  const grant = grantOf(keys.una, destination, ["destination.read-token"]), presented = { operation: fact(2) };
  const offered: RuleGiven["input"] = { type: "act", signed, grant, presented };
  const entry: Entry = { v: 1, at: destination, seq: 5, prev: d("a"), time: t(0), clamped: false, epoch: 0, prepared: [], uses: [],
    input: { type: "act", signed, authority: [grant], presented }, effects: [{ effect: "value", item: 3, slot: "record", value: canonicalize({ reason: "\\" }) }], sends: [] };
  expect(isEntry(entry)).toBe(true);
  expect(evidenceCarryingInputV17(offered)).toEqual(entry.input);
  const given = { input: offered, uses: [], resolved: { at: destination, self: 5, bounds: PROPOSED_BOUNDS } } as unknown as RuleGiven;
  expect(evidenceCarryingBudgetV17(given, [{ effect: "value", item: 3, slot: "record", value: canonicalize({ reason: "\\" }) }], [], [], []).entryBytes)
    .toBeGreaterThanOrEqual(utf8(canonicalize(entry)).length);
});


test("published written callbacks and the separate plan dispatch fit before push, with full carrying syntax", () => {
  // SCRIPTED maximum future entries. Native receipt/read dispatch and
  // original capture authority are exercised by the separate real journey.
  const measured = certifiedWrittenPlanBudgetV17(PROPOSED_BOUNDS);
  expect(measured.admitted).toBe(true);
  expect(measured.effects).toBe(13);
  for (const variant of measured.variants) {
    const entry = { ...variant.entry, uses: Array.from({ length: PROPOSED_BOUNDS.usesPerEntry }, (_, n) => ({
      fact: { ...fact(n, destination), seq: Number.MAX_SAFE_INTEGER - n }, content: d("f"),
    })) };
    expect(isEntry(entry), `${variant.name} complete entry`).toBe(true);
    // Independently materialize the full canonical uses array rather than
    // repeating the forecast's size multiplication and comma arithmetic.
    const fullWidthUses = entry.uses.map(use => ({ ...use, fact: { ...use.fact, seq: Number.MAX_SAFE_INTEGER } }));
    expect(variant.entryBytes).toBe(utf8(canonicalize({ ...entry, uses: fullWidthUses })).length + variant.observed);
  }
  const receipt = measured.variants.find(variant => variant.name === "receipt")!;
  expect(receipt.entry.effects.filter(effect => effect.effect === "operation").map(effect => effect.kind))
    .toEqual(["revoke", "reservation-delete", "mint", "evidence-plan", "publication-settle"]);
  const read = measured.variants.find(variant => variant.name === "read")!;
  expect(read.effects).toBe(6);
  expect(read.observed).toBe(observationBytes("rules", PROPOSED_BOUNDS) + 9 * observationBytes("key", PROPOSED_BOUNDS)
    + 65 * observationBytes("member", PROPOSED_BOUNDS) + observationBytes("holders", PROPOSED_BOUNDS, 1) + 75
    + utf8(canonicalize({ ...read.entry.input, observed: [] })).length - utf8(canonicalize(read.entry.input)).length);
  for (const variant of measured.variants) expect(Object.hasOwn(variant.entry.input, "observed")).toBe(false);
  const dispatch = measured.variants.find(variant => variant.name === "evidence-plan")!;
  expect(dispatch.effects).toBe(1);
  expect(dispatch.entry.sends).toHaveLength(1);
  expect(certifiedWrittenPlanBudgetV17({ ...PROPOSED_BOUNDS, entryBytes: measured.entryBytes }).admitted).toBe(true);
  expect(certifiedWrittenPlanBudgetV17({ ...PROPOSED_BOUNDS, entryBytes: measured.entryBytes - 1 }).admitted).toBe(false);
  expect(certifiedWrittenPlanBudgetV17({ ...PROPOSED_BOUNDS, derivedEffects: 10 }).admitted).toBe(false);
  expect(certifiedWrittenPlanBudgetV17({ ...PROPOSED_BOUNDS, sendsPerEntry: 0 }).admitted).toBe(false);
});


test("the Native policy reader accepts an unfixed RecordedRef and rejects a different pinned Rules incarnation", () => {
  // SCRIPTED authenticated observation/value ports isolate the production
  // reader's recorded-reference comparison; no Native authority is invented.
  const policy = record().policy;
  const read = (fixed: readonly Incarnation[], observation = policy.observation) => evidencePolicyV17({
    time: t(0), resolved: { at: destination },
    state: { page: () => ({ items: [{ refs: {}, values: { rules: rules.scope } }] }), incarnations: () => fixed },
    observed: () => ({ observation }), value: () => policy.input.extents,
  } as unknown as RuleGiven);
  expect(read([])).toMatchObject({ rules, revision: policy.observation.revision });
  expect(read([rules.inc])).toMatchObject({ rules, revision: policy.observation.revision });
  expect(keys.una.member.membership.inc).not.toBe(rules.inc);
  expect(read([keys.una.member.membership.inc])).toBeNull();
  expect(read([], { ...policy.observation, of: { ...rules, scope: keys.una.member.membership.scope } })).toBeNull();
  expect(read([rules.inc, keys.una.member.membership.inc])).toBeNull();
});


test("staging with required jobs never reads completion observations, while actual progress still requires them", () => {
  // SCRIPTED policy/carrying row, exercising the production successor hook.
  // No key standing, Native admission or actual publication is simulated.
  const empty = record(), prior = empty.policy.input.extents as Record<string, unknown>;
  const check = { name: "unit", configuration: d("b"), required: true, checker: keys.una.member, stage: "landing" as const };
  const proposed = rulesPolicyProposalV13({ ...(prior["policy"] as Record<string, unknown>), checks: [check] });
  if (!proposed.ok) throw Error("The scripted required policy is invalid");
  const envelope = { ...prior, policy: proposed.policy, proposal: proposed.digest };
  if (empty.policy.observation.content.asked !== "rules") throw Error("The scripted observation must ask Rules");
  const captured: CertifiedPublicationStateV17 = { policy: { ...empty.policy, required: [check],
    input: { ...empty.policy.input, extents: envelope }, observation: { ...empty.policy.observation,
      content: { ...empty.policy.observation.content, checks: [{ name: check.name, configuration: check.configuration, required: check.required, checker: check.checker.member }],
        extents: valueDigest("artroom-rules-extents-3", envelope) } } }, generations: [] };
  const publication = (value: CertifiedPublicationStateV17) => ({ id: 4, type: "publication", values: {
    passes: certifiedPublicationWireV17(value, PROPOSED_BOUNDS),
  } }) as unknown as Item;
  const given = (kind: string) => ({ input: { ...capture(captured).input, kind }, resolved: { bounds: PROPOSED_BOUNDS },
    observed: () => { throw Error("Fresh completion observations remain required"); },
  }) as unknown as RuleGiven;
  const complete = evidenceDestinationProfileV17.complete;
  expect(complete(given("reservation-stage"), publication(captured), [])).toBe(false);
  const passed = [{ name: check.name, job: fact(8), passed: true }];
  expect(complete(given("reservation-stage"), publication(captured), passed)).toBe(false);
  expect(complete(given("evidence-progress"), publication(captured), [])).toBe(false);
  expect(() => complete(given("evidence-progress"), publication(captured), passed)).toThrow("Fresh completion observations remain required");
  expect(complete(given("reservation-stage"), publication(empty), [])).toBe(true);
});
