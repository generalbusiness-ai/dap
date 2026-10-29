/** Pure wire/ownership tests. Binding and job DTOs are stand-ins, not native admission proof. */
import { expect, test } from "vitest";
import { canonicalize, entryHash, isEntry, isRecord, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest, rulesPolicyProposalV13, type EvidenceBatchRecordV17, type EvidenceBinding } from "@generalbusiness/dap-platform";
import { verifyOwnedCheckoutSnapshot } from "@generalbusiness/dap-git";
import { decodeAsk, encodeAsk, encodeJob } from "../src/container-records.ts";
import { configurationDigest, originOf, signResult } from "../src/index.ts";
import { digest, newKey, T0, world } from "./support.ts";
import { stageOverlay, stageService } from "./support/stage-service.ts";
import { boundStageFixture } from "./support/stage-service.ts";
import { stageOriginOf } from "../src/stage-origin.ts";

test("successor signatures bind the full actual job and semantic binding while legacy fields stay unchanged", async () => {
  const w = world(), read = originOf(w.notice, { entry: w.job, manifest: w.manifest, pinned: digest("a"), activated: { name: "change", state: "active" } });
  if ("not" in read) return expect.fail("The explicit stand-in job must be readable");
  const signer = newKey(), membership = { ...w.fact.at, kind: "membership" as const }, rules = { ...w.fact.at, kind: "rules" as const };
  const evidence: EvidenceBinding = { v: 1, source: "room", stage: "work", checker: { membership, member: "@checker" },
    roomService: { checker: { membership, member: "@checker" }, key: signer.signer.key }, policyGeneration: { rules, seq: 1 }, serviceGeneration: { rules, seq: 1 },
    auditOf: null, subject: { kind: "work", source: w.fact } };
  const options = { now: T0, nonce: new Uint8Array(16) }, outcome = { act: "check" as const, outcome: "passed" as const };
  const old = await signResult(signer.signer, read.job, outcome, null, {}, options);
  expect(Object.keys(old.intent.fields).sort()).toEqual(["configuration", "job", "outcome", "tree"]);
  const signed = await signResult(signer.signer, { ...read.job, evidence }, outcome, null, {}, options);
  expect(verifySignedIntent(signed)).toBe(true);
  expect(signed.intent.actor).toBe(evidence.roomService!.key);
  expect(signed.intent.fields["jobFact"]).toEqual(read.job.fact);
  expect(signed.intent.fields["bindingDigest"]).toBe(evidenceBindingDigest(evidence));
  const tampered = structuredClone(signed);
  tampered.intent.fields["jobFact"] = { ...read.job.fact, hash: digest("b") };
  expect(verifySignedIntent(tampered)).toBe(false);
});

test("the detached RunAsk owns immutable overlay bytes and recovery identity includes their binding", async () => {
  const w = world(), read = originOf(w.notice, { entry: w.job, manifest: w.manifest, pinned: digest("a"), activated: { name: "change", state: "active" } });
  if ("not" in read) return expect.fail("The explicit stand-in job must be readable");
  const immutable = stageOverlay(), job = { ...read.job, commit: immutable.commit, tree: immutable.tree, base: immutable.base, overlay: immutable };
  expect(await verifyOwnedCheckoutSnapshot(immutable)).toBe(true);
  const encoded = encodeAsk({ run: "TEST-stage-overlay", job, configuration: w.config }), identity = encodeJob(job);
  immutable.objects[2]!.data[0] = 0;
  const recovered = decodeAsk(encoded);
  expect(recovered.job.snapshot).toBeUndefined();
  expect(await verifyOwnedCheckoutSnapshot(recovered.job.overlay!)).toBe(true);
  expect(encodeJob(recovered.job)).toBe(identity);
  expect(encodeJob(job)).not.toBe(identity);
  const corrupt = JSON.parse(encoded); corrupt.job.overlay.objects[2].data = "AA";
  expect(() => decodeAsk(JSON.stringify(corrupt))).toThrow();
});

test("distinct successor member and audit check names share the exact configuration bytes and digest, while legacy equality and digest refusal remain", () => {
  const w = world(), read = originOf(w.notice, { entry: w.job, manifest: w.manifest, pinned: digest("a"), activated: { name: "change", state: "active" } });
  if ("not" in read) return expect.fail("The explicit stand-in job must be readable");
  const fixture = stageService(), immutable = stageOverlay(), binding = fixture.snapshot.binding;
  const member = { ...read.job, commit: immutable.commit, tree: immutable.tree, base: immutable.base, overlay: immutable,
    evidence: { ...binding, source: "member" as const, auditOf: null } };
  const audit = { ...member, name: `${member.name}-room-audit`, fact: { ...member.fact, seq: member.fact.seq + 1, hash: digest("b") }, evidence: { ...binding, auditOf: member.fact } };
  const memberAsk = decodeAsk(encodeAsk({ run: "TEST-member", job: member, configuration: w.config }));
  const auditAsk = decodeAsk(encodeAsk({ run: "TEST-audit", job: audit, configuration: w.config }));
  expect(auditAsk.job.name).not.toBe(memberAsk.job.name);
  expect(auditAsk.configuration.name).toBe(memberAsk.configuration.name);
  expect(canonicalize(auditAsk.configuration)).toBe(canonicalize(w.config));
  expect(canonicalize(memberAsk.configuration)).toBe(canonicalize(w.config));
  expect([memberAsk.job.configuration, auditAsk.job.configuration]).toEqual([configurationDigest(w.config), configurationDigest(w.config)]);
  expect(() => encodeAsk({ run: "TEST-wrong-audit-config", job: { ...audit, configuration: digest("f") }, configuration: w.config })).toThrow();
  expect(() => encodeAsk({ run: "TEST-legacy-name", job: { ...read.job, name: audit.name }, configuration: w.config })).toThrow();
  expect(() => encodeAsk({ run: "TEST-invalid-binding", job: { ...audit, evidence: { ...audit.evidence, v: 2 } as unknown as EvidenceBinding }, configuration: w.config })).toThrow();
});

test("successor admission reads bounded canonical record text with nullable semantic binding and no object fallback", () => {
  const fixture = stageService(), read = { entry: fixture.snapshot.job, pinned: fixture.definitions.issue, activated: { name: "issue", state: "active" } };
  const origin = (snapshot: typeof fixture.snapshot) => stageOriginOf(fixture.notice, read, snapshot, fixture.key.signer.key, fixture.definitions);
  expect(isEntry(fixture.snapshot.admission.entry)).toBe(true);
  expect(origin(fixture.snapshot)).toHaveProperty("job");
  const effect = fixture.snapshot.admission.entry.effects.find(effect => effect.effect === "value" && effect.slot === "record");
  if (effect?.effect !== "value" || typeof effect.value !== "string") return expect.fail("The scripted G17 record must use canonical text");
  const parsed = JSON.parse(effect.value);
  expect(parsed.binding.auditOf).toBeNull();
  for (const invalid of [" " + effect.value, "{", " ".repeat(196_609), { v: 1 }]) {
    const snapshot = structuredClone(fixture.snapshot), row = snapshot.admission.entry.effects.find(effect => effect.effect === "value" && effect.slot === "record");
    if (row?.effect !== "value") return expect.fail("The scripted record effect must remain present");
    row.value = invalid;
    snapshot.admission.hash = entryHash(snapshot.admission.entry);
    expect(isEntry(snapshot.admission.entry)).toBe(true);
    expect(origin(snapshot)).toEqual({ not: "stage-origin-mismatch" });
  }
});

test.each(["landing", "published"] as const)("%s origin proves the applied bound fence and actual funded batch, with no slot-opening fallback", stage => {
  const fixture = boundStageFixture(stage), differentKey = newKey().signer.key;
  const origin = (snapshot: typeof fixture.snapshot) => stageOriginOf(fixture.notice,
    { entry: snapshot.job, pinned: fixture.definitions.change, activated: { name: "change", state: "active" } }, snapshot, fixture.key.signer.key, fixture.definitions);
  expect(origin(fixture.snapshot)).toHaveProperty("job");
  const source = (snapshot: typeof fixture.snapshot, seq: number) => {
    const found = snapshot.sources.find(source => source.entry.seq === seq && source.entry.at.kind === "destination");
    if (!found) throw Error("The scripted source must be present");
    return found;
  };
  const batchEffect = (snapshot: typeof fixture.snapshot, seq = 9) => {
    const found = source(snapshot, seq).entry.effects.find(effect => effect.effect === "value" && effect.slot === "batch");
    if (found?.effect !== "value" || typeof found.value !== "string") throw Error("The scripted batch text must be present");
    return found;
  };
  type Mutable<T> = T extends readonly (infer Row)[] ? Mutable<Row>[] : T extends object ? { -readonly [Key in keyof T]: Mutable<T[Key]> } : T;
  const changeBatch = (snapshot: typeof fixture.snapshot, change: (batch: Mutable<EvidenceBatchRecordV17>) => void, seq = 9) => {
    const row = batchEffect(snapshot, seq);
    if (typeof row.value !== "string") throw Error("The scripted batch text must remain present");
    const batch: Mutable<EvidenceBatchRecordV17> = JSON.parse(row.value);
    change(batch); row.value = canonicalize(batch);
    if (seq === 6) {
      const input = source(snapshot, 6).entry.input;
      if (input.type !== "delivery" || input.message.class !== "request" || !isRecord(input.message.body)) throw Error("The scripted birth request is required");
      input.message.body["fields"] = { publication: batch.publication, operation: batch.operation, capture: batch.capture, ordinal: batch.ordinal };
    }
  };
  const changePolicy = (snapshot: typeof fixture.snapshot, change: (batch: Mutable<EvidenceBatchRecordV17>) => void) => {
    for (const seq of [6, 9]) changeBatch(snapshot, batch => {
      change(batch);
      const parsed = rulesPolicyProposalV13(batch.policy.policy);
      if (!parsed.ok) throw Error("The mutated frozen policy must remain valid");
      batch.policy.proposal = parsed.digest;
    }, seq);
  };
  // Rehash changed scripted sources and their exact retained fact list, so
  // these controls reach proof correspondence rather than stale-byte rejection.
  const reseal = (snapshot: typeof fixture.snapshot) => {
    for (const source of snapshot.sources) { expect(isEntry(source.entry)).toBe(true); source.hash = entryHash(source.entry); }
    const row = snapshot.admission.entry.effects.find(effect => effect.effect === "value" && effect.slot === "record");
    if (row?.effect !== "value" || typeof row.value !== "string") throw Error("The scripted admission record must be present");
    const record = JSON.parse(row.value);
    record.sourceFacts = snapshot.sources.map(source => ({ at: source.entry.at, seq: source.entry.seq, hash: source.hash }));
    row.value = canonicalize(record); snapshot.admission.hash = entryHash(snapshot.admission.entry);
  };
  const cases: readonly [string, (snapshot: typeof fixture.snapshot) => void][] = [
    ["forbidden evidence-slot opening", snapshot => { source(snapshot, 9).entry.effects.push({ effect: "open", item: 9, type: "evidence-slot", state: "pending" }); }],
    ["wrong holder", snapshot => { batchEffect(snapshot).item = 7; }],
    ["wrong admission ordinal", snapshot => { const input = snapshot.admission.entry.input; if (input.type === "outcome") input.operation = "9:1"; }],
    ["self holder is not the existing batch", snapshot => { const row = source(snapshot, 9).entry.effects.find(effect => effect.effect === "operation"); if (row?.effect === "operation") row.for = "self"; }],
    ["wrong operation kind", snapshot => { const row = source(snapshot, 9).entry.effects.find(effect => effect.effect === "operation"); if (row?.effect === "operation") row.kind = "evidence-result"; }],
    ["wrong attempt opening", snapshot => { const row = source(snapshot, 9).entry.effects.find(effect => effect.effect === "attempt"); if (row?.effect === "attempt") row.attempt = 2; }],
    ["missing batch birth", snapshot => { snapshot.sources = snapshot.sources.filter(source => source.entry.seq !== 6); }],
    ["foreign batch incarnation", snapshot => { source(snapshot, 6).entry.at = { ...snapshot.destination, inc: `in_${"b".repeat(26)}` }; }],
    ["unapplied batch birth", snapshot => { const input = source(snapshot, 6).entry.input; if (input.type === "delivery" && "decision" in input) input.decision = "refused"; }],
    ["wrong batch birth message", snapshot => { const input = source(snapshot, 6).entry.input;
      if (input.type !== "delivery" || input.message.class !== "request" || !isRecord(input.message.body)) throw Error("The scripted birth request is required");
      input.message.body["message"] = "unrelated-fund";
    }],
    ["wrong batch birth fields", snapshot => { const input = source(snapshot, 6).entry.input;
      if (input.type !== "delivery" || input.message.class !== "request" || !isRecord(input.message.body) || !isRecord(input.message.body["fields"])) throw Error("The scripted birth fields are required");
      input.message.body["fields"]["ordinal"] = 1;
    }],
    ["missing exact job claim", snapshot => changeBatch(snapshot, batch => { batch.jobs = []; })],
    ["duplicate job claim", snapshot => changeBatch(snapshot, batch => { batch.jobs.push(batch.jobs[0]!); })],
    ["changed full job hash", snapshot => changeBatch(snapshot, batch => { batch.jobs[0]!.job.hash = digest("e"); })],
    ["wrong descriptor name", snapshot => changeBatch(snapshot, batch => { batch.jobs[0]!.name = "another"; })],
    ["noncanonical batch text", snapshot => { const row = batchEffect(snapshot); row.value = " " + row.value; }],
    ["malformed batch text", snapshot => { batchEffect(snapshot).value = "{"; }],
    ["oversized batch text", snapshot => { batchEffect(snapshot).value = " ".repeat(196_609); }],
    ["unrelated batch capture", snapshot => changeBatch(snapshot, batch => { batch.capture.hash = digest("e"); }, 6)],
    ["wrong frozen policy generation", snapshot => { for (const seq of [6, 9]) changeBatch(snapshot, batch => { batch.policy.revision = 2; batch.policy.head.seq = 2; }, seq); }],
    ["wrong full Rules incarnation", snapshot => { for (const seq of [6, 9]) changeBatch(snapshot, batch => {
      const rules = { ...batch.policy.rules, inc: `in_${"b".repeat(26)}` as const };
      batch.policy.rules = rules; batch.policy.serviceGeneration.rules = rules;
    }, seq); }],
    ["wrong frozen service generation", snapshot => { for (const seq of [6, 9]) changeBatch(snapshot, batch => { batch.policy.serviceGeneration.seq = 0; }, seq); }],
    ["wrong publication operation", snapshot => { for (const seq of [6, 9]) changeBatch(snapshot, batch => { batch.operation.hash = digest("e"); }, seq); }],
    ["wrong frozen service mark", snapshot => changePolicy(snapshot, batch => { if (batch.policy.policy.roomService) batch.policy.policy.roomService.key = differentKey; })],
    ["wrong descriptor configuration", snapshot => changePolicy(snapshot, batch => { batch.checks[0]!.configuration = digest("e"); batch.policy.policy.checks[0]!.configuration = digest("e"); })],
    ["wrong descriptor source", snapshot => changePolicy(snapshot, batch => { batch.checks[0]!.source = "member"; batch.policy.policy.checks[0]!.source = "member"; })],
    ["wrong descriptor stage", snapshot => changePolicy(snapshot, batch => { const next = stage === "landing" ? "published" : "landing"; batch.checks[0]!.stage = next; batch.policy.policy.checks[0]!.stage = next; })],
    ["wrong descriptor checker", snapshot => changePolicy(snapshot, batch => { batch.checks[0]!.checker.member = "@other"; batch.policy.policy.checks[0]!.checker.member = "@other"; })],
  ];
  for (const [label, mutate] of cases) {
    const snapshot = structuredClone(fixture.snapshot); mutate(snapshot); reseal(snapshot);
    expect(origin(snapshot), label).toEqual({ not: "stage-origin-mismatch" });
  }
});
