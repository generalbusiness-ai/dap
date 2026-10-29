/** SCRIPTED scope/admission shape fixture. No Native scope judged these
 * entries. This owns service retry/deadline behavior, never Native authority. */
import type { Answer, Effect, Entry, FactRef, FieldValue, Input, ScopeRef, Sealed, Send, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isEntry, signIntent, timeOf, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest, rulesPolicyProposalV13, RULES_PATTERNS, type EvidenceBatchRecordV17, type EvidenceBinding, type StageSnapshot } from "@generalbusiness/dap-platform";
import { idOf, type OwnedCheckoutSnapshot } from "@generalbusiness/dap-git";
import { CheckerService, configurationDigest, Outcomes, type Scopes } from "../../src/index.ts";
import { configuration, digest, lane, MemoryDurable, newKey, ScriptedRunner, T0 } from "../support.ts";

export function stageOverlay(): OwnedCheckoutSnapshot {
  const treeBytes = new Uint8Array(), tree = idOf("tree", treeBytes);
  const body = (parent?: string) => utf8(`tree ${tree}\n${parent ? `parent ${parent}\n` : ""}author TEST <test@invalid> 1 +0000\ncommitter TEST <test@invalid> 1 +0000\n\nTEST\n`);
  const baseBytes = body(), base = idOf("commit", baseBytes), commitBytes = body(base), commit = idOf("commit", commitBytes);
  return { commit, tree, base, objects: [{ id: tree, type: "tree", data: treeBytes }, { id: base, type: "commit", data: baseBytes }, { id: commit, type: "commit", data: commitBytes }] };
}

export function stageService() {
  const key = newKey(), author = newKey(), overlay = stageOverlay();
  const at = (kind: ScopeRef["kind"]): ScopeRef => ({ ...lane, kind });
  const destination = at("destination"), membership = at("membership"), rules = at("rules"), directory = at("directory");
  const checker = { membership, member: "@checker" as const }, definitions = { issue: digest("a"), change: digest("b") };
  const fact = (sealed: Sealed): FactRef => ({ at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash });
  const sealed = (scope: ScopeRef, seq: number, input: Input, effects: Effect[], sends: Send[] = []): Sealed => {
    const entry: Entry = { v: 1, at: scope, seq, prev: digest("0"), time: timeOf(T0), clamped: false, epoch: 0, input, uses: [], prepared: [], effects, sends };
    if (!isEntry(entry)) throw Error("The scripted admission shape must be structurally valid");
    return { entry, hash: entryHash(entry) };
  };
  const act = (kind: string, fields: Record<string, FieldValue>): Input => ({ type: "act", signed: signIntent({ v: 1, to: lane, actor: author.signer.key,
    kind, on: null, expected: {}, fields, idempotencyKey: `TEST-${kind}`, notAfter: timeOf(T0 + 60_000) }, author.secret), authority: [], presented: {} });
  const source = sealed(lane, 3, act("stage-work", { commit: overlay.commit }), [{ effect: "open", item: 3, type: "work-source", state: "staged" }, { effect: "value", item: 3, slot: "commit", value: overlay.commit }]);
  const binding: EvidenceBinding = { v: 1, source: "room", stage: "work", checker, roomService: { checker, key: key.signer.key },
    policyGeneration: { rules, seq: 1 }, serviceGeneration: { rules, seq: 1 }, auditOf: null, subject: { kind: "work", source: fact(source) } };
  const bindingDigest = evidenceBindingDigest(binding), deadline = timeOf(T0 + 1_800_000);
  const send: Send = { n: 0, to: destination, message: { class: "request", type: "tell", body: { message: "work-check-fence", fields: { job: { self: true } } } } };
  const job = sealed(lane, 7, act("request-work-check", { source: fact(source) }), [
    { effect: "open", item: 7, type: "job", state: "queued" }, { effect: "party", item: 7, slot: "checker", member: checker },
    ...Object.entries({ name: configuration.name, configuration: configurationDigest(configuration), deadline, commit: overlay.commit,
      binding: canonicalize(binding), bindingDigest, stage: "work" }).map(([slot, value]) => ({ effect: "value", item: 7, slot, value } as Effect)),
  ], [send]);
  const jobFact = fact(job);
  const genesis = sealed(destination, 0, { type: "genesis", seed: { v: 1, kind: "destination", definition: "platform:destination@17", creator: directory, cause: digest("c"), ordinal: 0 },
    inc: destination.inc, kind: "establish", founding: null, source: { at: directory, seq: 1, hash: digest("d") }, n: 0, message: { class: "request", type: "create", body: {} }, decision: "applied" }, []);
  const pending = sealed(destination, 4, { type: "delivery", from: jobFact, n: 0, message: send.message as Extract<Input, { type: "delivery"; decision: unknown }>["message"], decision: "applied" }, [
    { effect: "open", item: 4, type: "evidence-request", state: "open" },
    { effect: "operation", k: 0, owner: "platform:destination@17", kind: "evidence-admit", attempts: 1, for: "self" },
    { effect: "attempt", operation: "4:0", attempt: 1, result: "opened", selected: null },
  ]);
  const sources = [genesis, pending, source];
  const record = { v: 1, state: "admitted", job: jobFact, name: configuration.name, configuration: configurationDigest(configuration), binding, bindingDigest,
    commit: overlay.commit, tree: overlay.tree, base: overlay.base, admittedAt: 5, holder: 4, sourceFacts: sources.map(fact) };
  const admission = sealed(destination, 5, { type: "outcome", operation: "4:0", attempt: 1, owner: "platform:destination@17", kind: "evidence-admit", result: "confirmed", evidence: { basis: "own-answer", body: { job: jobFact } } }, [
    { effect: "attempt", operation: "4:0", attempt: 1, result: "confirmed", selected: true }, { effect: "open", item: 5, type: "evidence-job", state: "open" }, { effect: "value", item: 5, slot: "record", value: canonicalize(record) },
  ]);
  const snapshot: StageSnapshot = { v: 1, destination, job, admission, binding, sources, ...overlay };
  const runner = new ScriptedRunner(), durable = new MemoryDurable(), outcomes = new Outcomes(durable);
  const submitted: SignedIntent[] = [], accepted = new Set<string>();
  let now = T0, n = 0, current = true, loseReply = false, stageReads = 0;
  const answer = (signed: SignedIntent): Answer => ({ answer: "accepted", receipt: { fact: { at: signed.intent.to!, seq: 30, hash: digest("e") }, definition: definitions.issue, intent: null, effects: [], sends: [], epoch: 0 } });
  const scopes: Scopes = {
    entry: async (_scope, seq) => seq === 7 ? structuredClone(job) : null,
    pinned: async () => definitions.issue, activated: async () => ({ name: "issue", state: "active" }),
    configuration: async () => canonicalize(configuration), standing: async () => ({ state: now < Date.parse(deadline) ? "requested" : "timed-out", expected: { job: 1 } }),
    stageSnapshot: async (_scope, signed) => { stageReads++; if (!verifySignedIntent(signed)) throw Error("Invalid scripted read signature"); return current ? structuredClone(snapshot) : { refused: "wrong-source" }; },
    prepare: async () => { throw Error("Immutable stage jobs must never mint a legacy read token"); },
    submit: async (_scope, signed) => {
      if (!verifySignedIntent(signed)) throw Error("Invalid scripted result signature");
      submitted.push(signed);
      if (accepted.has(canonicalize(signed))) return answer(signed);
      accepted.add(canonicalize(signed));
      if (loseReply) { loseReply = false; throw Error("TEST accepted reply lost"); }
      return answer(signed);
    },
  };
  const service = new CheckerService({ signer: key.signer, scopes, runner, outcomes, evidenceDefinitions: definitions, clock: () => now, random: length => new Uint8Array(length).fill(++n) });
  return { service, scopes, runner, outcomes, key, snapshot, jobFact, submitted, definitions, sealed, act,
    notice: { lane, job: jobFact, name: configuration.name, tree: overlay.tree },
    expire: () => { now = T0 + 1_800_001; }, loseReply: () => { loseReply = true; }, withdraw: () => { current = false; }, stageReads: () => stageReads };
}

/** SCRIPTED bound-fence proof. The pure batch decoder runs; no Native
 * funding, activation, admission or checker authority is claimed here. */
export function boundStageFixture(stage: "landing" | "published" = "landing") {
  const fixture = stageService(), { snapshot: work, sealed, act, key } = fixture;
  const destination = work.destination, checker = work.binding.checker, rules = work.binding.policyGeneration.rules;
  const fact = (value: Sealed): FactRef => ({ at: value.entry.at, seq: value.entry.seq, hash: value.hash });
  const operation: FactRef = { at: lane, seq: 2, hash: digest("2") };
  const manifest = sealed(lane, 3, act("propose-manifest", {}), [{ effect: "open", item: 3, type: "manifest", state: "proposed" }]);
  const publication = sealed(destination, 2, { type: "delivery", from: operation, n: 0, message: { class: "request", type: "tell", body: { message: "reserve", fields: {} } }, decision: "applied" }, [
    { effect: "open", item: 2, type: "publication", state: "reserved" }, { effect: "ref", item: 2, slot: "operation", to: operation },
  ]);
  const receipt = sealed(destination, 4, { type: "outcome", operation: "2:0", attempt: 1, owner: "platform:destination@17", kind: "receipt", result: "confirmed", evidence: { basis: "own-answer", body: {} } }, [
    { effect: "open", item: 4, type: "receipt", state: "written" },
  ]);
  const binding: EvidenceBinding = { ...work.binding, stage, subject: stage === "landing"
    ? { kind: "landing", publication: fact(publication), manifest: fact(manifest) }
    : { kind: "published", publication: fact(publication), manifest: fact(manifest), receipt: fact(receipt), written: fact(receipt) } };
  const parsed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, roomService: binding.roomService,
    checks: [{ name: configuration.name, configuration: configurationDigest(configuration), required: true, checker, source: "room", stage }], labels: [], extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "other", patterns: [], approvals: 1, approver: "change.review", checks: [configuration.name], class: "content" },
    ] });
  if (!parsed.ok) throw Error("The scripted bound policy must be valid");
  const batch: EvidenceBatchRecordV17 = { v: 1, publication: fact(publication), operation, capture: { at: destination, seq: 4, hash: digest("4") }, ordinal: 0, total: 1,
    touched: ["other"], checks: parsed.policy.checks, jobs: [], planAt: null,
    policy: { rules, head: { seq: 1, hash: digest("1") }, revision: 1, proposal: parsed.digest, policy: parsed.policy, serviceGeneration: binding.serviceGeneration,
      certificate: { request: { at: destination, seq: 1, hash: digest("1") }, certificate: { at: destination, seq: 1, hash: digest("1") }, proof: digest("f"), commit: work.commit } } };
  const birth = sealed(destination, 6, { type: "delivery", from: { at: destination, seq: 5, hash: digest("5") }, n: 0,
    message: { class: "request", type: "tell", body: { message: "evidence-fund", fields: { publication: batch.publication, operation: batch.operation, capture: batch.capture, ordinal: batch.ordinal } } }, decision: "applied" }, [
    { effect: "open", item: 6, type: "evidence-batch", state: "funded" }, { effect: "value", item: 6, slot: "batch", value: canonicalize(batch) },
  ]);
  const send: Send = { n: 0, to: destination, message: { class: "request", type: "tell", body: { message: "check-fence", fields: { job: { self: true }, operation, manifest: fact(manifest) } } } };
  const automatic: Send = { n: 0, to: lane, message: { class: "request", type: "tell", body: { message: "admit-published-check", fields: {} } } };
  const sender = sealed(destination, 8, { type: "outcome", operation: "6:0", attempt: 1, owner: "platform:destination@17", kind: "published-checks", result: "confirmed", evidence: { basis: "own-answer", body: {} } }, [], [automatic]);
  const job = sealed(lane, 7, stage === "landing" ? act("request-check", {}) : { type: "delivery", from: fact(sender), n: 0,
    message: automatic.message as Extract<Input, { type: "delivery"; decision: unknown }>["message"], decision: "applied" }, [
    { effect: "open", item: 7, type: "job", state: "queued" }, { effect: "party", item: 7, slot: "checker", member: checker },
    ...Object.entries({ name: configuration.name, configuration: configurationDigest(configuration), deadline: timeOf(T0 + 1_800_000), commit: work.commit,
      tree: work.tree, base: work.base, binding: canonicalize(binding), bindingDigest: evidenceBindingDigest(binding), stage })
      .map(([slot, value]) => ({ effect: "value", item: 7, slot, value } as Effect)),
  ], [send]);
  const pending = sealed(destination, 9, { type: "delivery", from: fact(job), n: 0,
    message: send.message as Extract<Input, { type: "delivery"; decision: unknown }>["message"], decision: "applied" }, [
    { effect: "value", item: 6, slot: "batch", value: canonicalize({ ...batch, jobs: [{ job: fact(job), name: configuration.name }] }) },
    { effect: "operation", k: 0, owner: "platform:destination@17", kind: "evidence-admit", attempts: 1, for: 6 },
    { effect: "attempt", operation: "9:0", attempt: 1, result: "opened", selected: null },
  ]);
  const sources = [work.sources[0]!, publication, manifest, birth, pending, ...(stage === "published" ? [receipt, sender] : [])];
  const record = { v: 1, state: "admitted", job: fact(job), name: configuration.name, configuration: configurationDigest(configuration), binding, bindingDigest: evidenceBindingDigest(binding),
    commit: work.commit, tree: work.tree, base: work.base, admittedAt: 10, holder: 6, sourceFacts: sources.map(fact) };
  const admission = sealed(destination, 10, { type: "outcome", operation: "9:0", attempt: 1, owner: "platform:destination@17", kind: "evidence-admit", result: "confirmed", evidence: { basis: "own-answer", body: { job: fact(job) } } }, [
    { effect: "attempt", operation: "9:0", attempt: 1, result: "confirmed", selected: true }, { effect: "open", item: 10, type: "evidence-job", state: "job" },
    { effect: "value", item: 10, slot: "record", value: canonicalize(record) },
  ]);
  const snapshot: StageSnapshot = { ...work, job, admission, binding, sources };
  return { snapshot, key, definitions: fixture.definitions, notice: { lane, job: fact(job), name: configuration.name, tree: work.tree }, pending, birth, publication };
}
