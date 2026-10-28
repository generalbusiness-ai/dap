import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef, type RulesObservation } from "@generalbusiness/dap-contract";
import { canonicalize, isEntry, isFieldValue, signIntent, utf8 } from "@generalbusiness/dap-bytes";
import { valueDigest, type RuleGiven } from "@generalbusiness/dap-derive";
import { d, grantOf, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";
import { CERTIFIED_PUBLICATION_TEXT_BYTES_V17, certifiedCaptureBudgetV17, certifiedPublicationBudgetV17, certifiedPublicationStateV17,
  certifiedPublicationStateWireV17, certifiedPublicationWireV17, evidenceCarryingBudgetV17, evidenceCarryingInputV17, type CertifiedPublicationStateV17 } from "../src/destination-budget-v17.ts";

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
