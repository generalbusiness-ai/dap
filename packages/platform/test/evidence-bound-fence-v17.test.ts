import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef, type ScopeRef, type Sealed } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isEntry, same, signIntent } from "@generalbusiness/dap-bytes";
import { MemoryState, RuleFault, useOf, valueDigest, type Operation, type Own, type RuleGiven } from "@generalbusiness/dap-derive";
import { d, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { readEvidenceBoundFenceV17 } from "../src/evidence-bound-fence-v17.ts";
import { claimEvidenceBatchJobV17, evidenceBatchWireV17, readEvidenceBatchV17 } from "../src/evidence-batch-v17.ts";
import { certifiedPublicationWireV17, type CertifiedPublicationStateV17 } from "../src/destination-budget-v17.ts";
import { destinationEvidencePending, evidenceFrozenBatchMatchesV17, evidenceFrozenBatchV17 } from "../src/destination-evidence-v17.ts";
import { destinationRulesV17 } from "../src/destination-v17.ts";
import { evidenceBindingDigest } from "../src/evidence.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { readRulesPolicyObservationV17, requiredChecksV17 } from "../src/reservation-v17.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";

// SCRIPTED sealed source/state chain. The maintained hash, wire, funding
// proof and sentBy readers run; this is not a Native admission witness.
function boundary(wrongPolicy = false, checkCount = 2) {
  const destination = { ...otherLane, kind: "destination" as const }, rules = { ...otherLane, kind: "rules" as const };
  const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
  const seal = (entry: Entry): Sealed => {
    if (!isEntry(entry)) throw Error("The scripted entry must have the maintained wire shape");
    return { entry, hash: entryHash(entry) };
  };
  const frame = (seq: number, input: Entry["input"], effects: Entry["effects"] = [], sends: Entry["sends"] = [], at: ScopeRef = destination): Entry =>
    ({ v: 1, at, seq, prev: seq === 0 ? null : d("0"), time: t(0), clamped: false, epoch: 0, input, uses: [], prepared: [], effects, sends });
  const manifestEntry = seal(frame(4, { type: "act", signed: signIntent({ v: 1, to: otherLane, actor: keys.una.key, kind: "propose-file", on: null,
    expected: {}, fields: { base: "c".repeat(40) }, idempotencyKey: "TEST-manifest", notAfter: t(60) }, keys.una.secret), authority: [], presented: {} }, [], [], otherLane));
  const manifest: FactRef = { at: otherLane, seq: 4, hash: manifestEntry.hash };
  const names = ["compile", "test", ...Array.from({ length: checkCount - 2 }, (_, n) => `z${String(n).padStart(2, "0")}`)];
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, labels: [], roomService: null,
    checks: names.map(name => ({ name, configuration: d("b"), required: true, checker: keys.una.member })),
    extents: [{ name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" }] });
  if (!proposed.ok) throw Error("The scripted captured policy is invalid");
  const envelope = { configured: true, policy: proposed.policy, proposal: proposed.digest,
    certificate: { request: fact(1, destination), certificate: fact(2, destination), proof: d("c"), commit: "a".repeat(40) } };
  const observation: CertifiedPublicationStateV17["policy"]["observation"] = { subject: "rules", of: rules, head: { seq: 3, hash: d("d") }, revision: 3,
    definition: "platform:rules@13", at: t(0), content: { asked: "rules", approvals: 1, ownerMayReview: false,
      checks: proposed.policy.checks.map(({ name, configuration, required, checker }) => ({ name, configuration, required, checker: checker.member })),
      labels: [], singleControllerException: false, extents: valueDigest("artroom-rules-extents-3", envelope), roomService: null, serviceGeneration: { rules, seq: 0 } } };
  const policyInput = { rules, destination, extents: envelope }, decoded = readRulesPolicyObservationV17(observation, policyInput, t(0));
  const required = requiredChecksV17(proposed.policy, ["source"]);
  if (!decoded.ok || !required.ok) throw Error("The scripted complete policy must decode");
  const snapshot: CertifiedPublicationStateV17 = { policy: { observation, input: policyInput, touched: ["source"], required: required.checks,
    tree: "b".repeat(40), manifest }, generations: [] };
  const genesis = seal(frame(0, { type: "genesis", seed: { v: 1, kind: "destination", definition: "platform:destination@17", creator: null, cause: d("e"), ordinal: 0 },
    inc: destination.inc, kind: "establish", founding: null, source: null, n: null, message: null, decision: "applied" }));
  const publication = seal(frame(2, { type: "timed", item: 2, rule: "TEST-publication", due: t(0) }));
  const publicationFact: FactRef = { at: destination, seq: 2, hash: publication.hash }, operation = fact(1);
  const passes = certifiedPublicationWireV17(snapshot, PROPOSED_BOUNDS);
  const capture = seal(frame(3, { type: "outcome", owner: "platform:destination@17", kind: "judge", operation: "2:0", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: {} } },
    [{ effect: "state", item: 2, state: "reserved" }, { effect: "value", item: 2, slot: "passes", value: passes },
      { effect: "operation", k: 0, owner: "platform:destination@17", kind: "evidence-funding", attempts: 1, for: 2 }]));
  const captureFact: FactRef = { at: destination, seq: 3, hash: capture.hash };
  const fundingMessage = { class: "request" as const, type: "tell" as const, body: { message: "evidence-fund", fields: { publication: publicationFact, operation, capture: captureFact, ordinal: 0 } } };
  const dispatch = seal(frame(4, { type: "outcome", owner: "platform:destination@17", kind: "evidence-funding", operation: "3:0", attempt: 1, result: "confirmed",
    evidence: { basis: "own-answer", body: { capture: captureFact } } }, [], [{ n: 0, to: destination, message: fundingMessage }]));
  const initial = readEvidenceBatchV17({ v: 1, publication: publicationFact, operation, capture: captureFact, ordinal: 0, total: Math.ceil(checkCount / 8),
    touched: ["source"], checks: proposed.policy.checks.slice(0, 8), policy: decoded.view, jobs: [], planAt: null });
  if (!initial) throw Error("The scripted initial funded account must decode");
  const funded = seal(frame(5, { type: "delivery", from: { at: destination, seq: 4, hash: dispatch.hash }, n: 0, message: fundingMessage, decision: "applied" },
    [{ effect: "open", item: 5, type: "evidence-batch", state: "funded" }, { effect: "value", item: 5, slot: "batch", value: evidenceBatchWireV17(initial) }],
    initial.total > 1 ? [{ n: 0, to: destination, message: { ...fundingMessage, body: { message: "evidence-fund", fields: { ...fundingMessage.body.fields, ordinal: 1 } } } }] : []));
  const binding = { v: 1 as const, source: "member" as const, stage: "landing" as const, checker: keys.una.member,
    policyGeneration: { rules, seq: wrongPolicy ? 2 : 3 }, serviceGeneration: { rules, seq: 0 }, roomService: null, auditOf: null,
    subject: { kind: "landing" as const, publication: publicationFact, manifest } };
  const fields = { job: { self: true }, operation, manifest, name: "compile", binding: canonicalize(binding), bindingDigest: evidenceBindingDigest(binding), reuse: true };
  const message = { class: "request" as const, type: "tell" as const, body: { message: "check-fence", fields } };
  const job = seal(frame(10, { type: "act", signed: signIntent({ v: 1, to: otherLane, actor: keys.una.key, kind: "request-check", on: null, expected: {},
    fields: { name: "compile", manifest: 4, configuration: d("b"), binding: canonicalize(binding), bindingDigest: evidenceBindingDigest(binding), checker: binding.checker }, idempotencyKey: "TEST-job", notAfter: t(60) }, keys.una.secret), authority: [], presented: {} },
    [{ effect: "open", item: 10, type: "job", state: "queued" }, { effect: "ref", item: 10, slot: "destination", to: destination },
      { effect: "ref", item: 10, slot: "manifest", to: 4 }, { effect: "party", item: 10, slot: "checker", member: binding.checker },
      ...Object.entries({ name: "compile", configuration: d("b"), binding: canonicalize(binding), bindingDigest: evidenceBindingDigest(binding),
        stage: "landing", deadline: t(60), commit: "a".repeat(40), tree: "b".repeat(40), base: "c".repeat(40) })
        .map(([slot, value]) => ({ effect: "value" as const, item: 10, slot, value }))], [{ n: 0, to: destination, message }], otherLane));
  const jobFact: FactRef = { at: otherLane, seq: 10, hash: job.hash }, claimed = claimEvidenceBatchJobV17(initial, jobFact, "compile");
  if (!claimed.ok) throw Error("The scripted job must fit its reserved slot");
  const input: Entry["input"] = { type: "delivery", from: jobFact, n: 0, message, decision: "applied" };
  const fence = seal({ ...frame(6, input, [{ effect: "value", item: 5, slot: "batch", value: evidenceBatchWireV17(claimed.record) },
    { effect: "operation", k: 0, owner: "platform:destination@17", kind: "evidence-admit", attempts: 1, for: 5 },
    { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null }]), uses: [useOf(jobFact, job.entry)] });
  const history = new Map([[0, genesis], [2, publication], [3, capture], [4, dispatch], [5, funded], [6, fence]]), state = new MemoryState();
  state.setScope({ at: destination, creator: null, status: "active", head: { seq: 6, hash: fence.hash }, time: t(0), genesis: { hash: genesis.hash, source: null, n: null }, held: [] });
  state.putItem({ id: 2, type: "publication", state: "reserved", opened: publication.hash, revision: 2, parties: {}, refs: { operation, manifest, lane: otherLane },
    values: { reservedAt: 3, passes, integration: "a".repeat(40), tree: "b".repeat(40) }, attributed: [] });
  state.putItem({ id: 5, type: "evidence-batch", state: "funded", opened: funded.hash, revision: 2, parties: {}, refs: { operation, lane: otherLane },
    values: { batch: evidenceBatchWireV17(claimed.record) }, attributed: [] });
  state.addCount("evidence-batch", "funded", 1); state.putIndexed("evidence-batch", "operation", canonicalize(operation), 5);
  if (initial.total > 1) state.putRequest({ seq: 5, n: 0, hash: funded.hash, type: "tell", to: destination, result: null, diagnosis: null });
  const admitted: Operation = { id: "6:0", owner: "platform:destination@17", kind: "evidence-admit", most: 1, for: 5, selected: null,
    attempts: [{ attempt: 1, opened: 6, outcomes: [] }] };
  state.putOperation(admitted);
  let retained: Entry | null = job.entry;
  const own: Own = Object.assign((seq: number) => history.get(seq) ?? null, { retained: () => retained });
  const read = () => readEvidenceBoundFenceV17(state, own, admitted, PROPOSED_BOUNDS);
  const given: RuleGiven = { state, own, time: t(0), observed: () => null, value: () => undefined, placed: () => undefined,
    input: { type: "outcome", owner: admitted.owner, kind: admitted.kind, operation: admitted.id, attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: { job: jobFact } } },
    uses: [{ fact: jobFact, entry: job.entry, under: "change@4" }, { fact: manifest, entry: manifestEntry.entry, under: "change@4" }],
    resolved: { at: destination, self: 7, fields: {}, subjects: new Map(), signer: null, bounds: PROPOSED_BOUNDS } };
  const changeFence = (change: (entry: Entry) => Entry) => { const next = seal(change(fence.entry)); history.set(6, next); state.setScope({ ...state.scope()!, head: { seq: 6, hash: next.hash } }); };
  return { state, own, history, read, given, fields, changeFence, fence, job, jobFact, admitted, binding, manifest, manifestEntry,
    claimed: claimed.record, setRetained: (value: Entry | null) => { retained = value; } };
}

test("reconstructs the actual bound fence and retained job without inventing a fence item", () => {
  const fixture = boundary(), read = fixture.read();
  expect(read).not.toBeNull();
  expect(fixture.state.item(fixture.fence.entry.seq)).toBeNull();
  expect(read).toMatchObject({ entry: fixture.fence.entry, source: { at: fixture.fence.entry.at, seq: 6, hash: fixture.fence.hash },
    job: fixture.job.entry, fields: { job: fixture.jobFact, name: "compile" }, holder: { id: 5 }, batch: fixture.claimed,
    birth: { seq: 0, hash: fixture.history.get(0)!.hash }, batchFact: { seq: 5, hash: fixture.history.get(5)!.hash } });
  expect(read?.entry.input.type === "delivery" && read.entry.input.message.class === "request" && read.entry.input.message.body).toMatchObject({ fields: { job: { self: true } } });
  const holder = fixture.state.item(5)!, later = claimEvidenceBatchJobV17(fixture.claimed, { ...fixture.jobFact, seq: 11, hash: d("f") }, "test");
  if (!later.ok) throw Error("Another configured descriptor retains its own reserved slot");
  fixture.state.putItem({ ...holder, revision: holder.revision + 1, values: { ...holder.values, batch: evidenceBatchWireV17(later.record) } });
  expect(fixture.read()?.batch.jobs).toEqual(later.record.jobs);
});

test("the pending host reader echoes a proven job even when admission must reject its closed policy binding", () => {
  // SCRIPTED proven fence, not Native authority. Frozen eligibility is kept
  // separate from the operation's actual retained job identity.
  for (const wrongPolicy of [false, true]) {
    const fixture = boundary(wrongPolicy);
    expect(fixture.read()).not.toBeNull();
    expect(destinationEvidencePending(fixture.state, fixture.own, fixture.admitted, PROPOSED_BOUNDS)).toEqual({ job: fixture.jobFact });
    expect(evidenceFrozenBatchMatchesV17(fixture.binding, "compile", d("b"), fixture.claimed)).toBe(!wrongPolicy);
  }
});

test("the actual frozen-batch predicate accepts an authenticated selected prefix without waiting for its later sibling", () => {
  const fixture = boundary(false, 9), holder = fixture.state.item(5)!;
  expect(fixture.state.lookup("evidence-batch", "operation", canonicalize(fixture.claimed.operation), 5)).toEqual([5]);
  expect(fixture.claimed.total).toBe(2);
  expect(evidenceFrozenBatchV17(fixture.given, fixture.binding, "compile", d("b"), 5, fixture.jobFact)).toEqual(fixture.claimed);
  expect(evidenceFrozenBatchV17(fixture.given, fixture.binding, "z06", d("b"))).toBeNull();
  const foreign = { ...fixture.claimed, capture: { ...fixture.claimed.capture, hash: d("f") } };
  fixture.state.putItem({ ...holder, values: { batch: evidenceBatchWireV17(foreign) } });
  expect(evidenceFrozenBatchV17(fixture.given, fixture.binding, "compile", d("b"), 5, fixture.jobFact)).toBeNull();
  const gap = readEvidenceBatchV17({ ...fixture.claimed, ordinal: 1, checks: fixture.claimed.policy.policy.checks.slice(8), jobs: [] });
  expect(gap).not.toBeNull();
  fixture.state.putItem({ ...holder, values: { batch: evidenceBatchWireV17(gap!) } });
  expect(evidenceFrozenBatchV17(fixture.given, fixture.binding, "z06", d("b"), 5)).toBeNull();
  fixture.state.putItem({ ...holder, values: { batch: canonicalize({ ...fixture.claimed, ordinal: 2 }) } });
  expect(evidenceFrozenBatchV17(fixture.given, fixture.binding, "compile", d("b"), 5)).toBeNull();
});

test("the actual binding field waits only for the exact unexpired source whose original selected carrier is still pending", () => {
  const fixture = boundary(false, 9), source = fixture.job.entry;
  if (source.input.type !== "act") throw Error("The scripted source job must retain its signed request");
  const raw = { ...fixture.fields, name: "z06" };
  const message = { class: "request" as const, type: "tell" as const, body: { message: "check-fence", fields: raw } };
  const job: Entry = { ...source, seq: 11, input: { ...source.input, signed: signIntent({ ...source.input.signed.intent,
    fields: { ...source.input.signed.intent.fields, name: "z06" }, idempotencyKey: "TEST-delayed-source" }, keys.una.secret) },
    effects: source.effects.map((effect): Entry["effects"][number] => {
      if (!("item" in effect) || effect.item !== 10) return effect;
      return effect.effect === "value" && effect.slot === "name" ? { ...effect, item: 11, value: "z06" } : { ...effect, item: 11 };
    }), sends: [{ n: 0, to: fixture.given.resolved.at, message }] };
  expect(isEntry(job)).toBe(true);
  const jobFact: FactRef = { at: job.at, seq: job.seq, hash: entryHash(job) };
  // SCRIPTED source/state proof, with no committed fence or admitted record
  // for this delayed job. The real field predicate chooses whether to wait.
  const given: RuleGiven = { ...fixture.given, input: { type: "delivery", from: jobFact, n: 0, message },
    uses: [{ fact: jobFact, entry: job, under: "change@4" }, { fact: fixture.manifest, entry: fixture.manifestEntry.entry, under: "change@4" }],
    resolved: { ...fixture.given.resolved, fields: { ...raw, job: jobFact } } };
  const rule = destinationRulesV17["evidence-fence-binding-v17"];
  if (rule?.place !== "type") throw Error("The actual bound-fence field rule is required");
  const text = canonicalize(fixture.binding);
  expect(() => rule.run(given, text, { field: "binding" })).toThrow(RuleFault);
  expect(rule.run({ ...given, time: t(60) }, text, { field: "binding" })).toBe(true);
  expect(rule.run({ ...given, input: { type: "delivery", from: { ...jobFact, hash: d("f") }, n: 0, message } }, text, { field: "binding" })).toBe(true);
  const request = fixture.state.request(5, 0)!;
  fixture.state.putRequest({ ...request, result: { seq: 7, clause: "refused" } });
  expect(rule.run(given, text, { field: "binding" })).toBe(true);
  expect(fixture.state.item(11)).toBeNull();
});

test("missing or mismatching retained source bytes and source sends never fall back to the current DTO", () => {
  for (const mutation of [null, { ...boundary().job.entry, seq: 11 }, { ...boundary().job.entry, sends: [] }]) {
    const fixture = boundary(); fixture.setRetained(mutation); expect(fixture.read()).toBeNull();
  }
  const fixture = boundary();
  fixture.changeFence(entry => ({ ...entry, uses: [] })); expect(fixture.read()).toBeNull();
  const repeated = boundary(); repeated.changeFence(entry => ({ ...entry, uses: [...entry.uses, ...entry.uses] })); expect(repeated.read()).toBeNull();
});

test("only the applied original opening with its actual holder and one canonical append is accepted", () => {
  const mutations: ((entry: Entry) => Entry)[] = [
    entry => ({ ...entry, input: entry.input.type === "delivery" && "decision" in entry.input ? { ...entry.input, decision: "refused" } : entry.input }),
    entry => ({ ...entry, effects: [...entry.effects, { effect: "open", item: entry.seq, type: "evidence-slot", state: "pending" }] }),
    entry => ({ ...entry, effects: entry.effects.map(effect => effect.effect === "operation" ? { ...effect, for: 6 } : effect) }),
    entry => ({ ...entry, effects: entry.effects.filter(effect => effect.effect !== "value") }),
    entry => ({ ...entry, effects: [...entry.effects, ...entry.effects.filter(effect => effect.effect === "value")] }),
    entry => ({ ...entry, effects: entry.effects.map(effect => effect.effect === "value" && effect.slot === "batch" && typeof effect.value === "string"
      ? { ...effect, value: ` ${effect.value}` } : effect) }),
  ];
  for (const mutate of mutations) { const fixture = boundary(); fixture.changeFence(mutate); expect(fixture.read()).toBeNull(); }
  const wrongHash = boundary(); wrongHash.history.set(6, { ...wrongHash.fence, hash: d("f") }); expect(wrongHash.read()).toBeNull();
  const wrongCurrent = boundary(); wrongCurrent.state.putOperation({ ...wrongCurrent.admitted, for: 2 }); expect(wrongCurrent.read()).toBeNull();
});

test("a retained batch claim must agree with current immutable funding and the exact source job/name", () => {
  const fixture = boundary(), holder = fixture.state.item(5)!;
  const different = { ...fixture.claimed, jobs: [{ ...fixture.claimed.jobs[0]!, job: { ...fixture.jobFact, hash: d("f") } }] };
  fixture.state.putItem({ ...holder, values: { ...holder.values, batch: evidenceBatchWireV17(different) } });
  expect(fixture.read()).toBeNull();
  const wrongName = boundary();
  wrongName.changeFence(entry => ({ ...entry, effects: entry.effects.map(effect => effect.effect === "value" && effect.slot === "batch"
    ? { ...effect, value: evidenceBatchWireV17({ ...wrongName.claimed, jobs: [{ job: wrongName.jobFact, name: "test" }] }) } : effect) }));
  expect(wrongName.read()).toBeNull();
  const missingBirth = boundary(); missingBirth.history.delete(5); expect(missingBirth.read()).toBeNull();
  const missingGenesis = boundary(); missingGenesis.history.delete(0); expect(missingGenesis.read()).toBeNull();
  const wrongOperation = boundary();
  wrongOperation.changeFence(entry => ({ ...entry, input: entry.input.type === "delivery" && "decision" in entry.input && entry.input.message.class === "request"
    ? { ...entry.input, message: { ...entry.input.message, body: { message: "check-fence", fields: { job: { self: true }, operation: { ...wrongOperation.claimed.operation, hash: d("f") }, name: "compile" } } } }
    : entry.input }));
  expect(wrongOperation.read()).toBeNull();
  expect(same(fixture.claimed.jobs[0]!.job, fixture.jobFact)).toBe(true);
});
