/** Pure wire/ownership tests. Binding and job DTOs are stand-ins, not native admission proof. */
import { expect, test } from "vitest";
import { canonicalize, entryHash, evidenceBindingDigest, isEntry, verifySignedIntent, type EvidenceBinding } from "@generalbusiness/dap-bytes";
import { verifyOwnedCheckoutSnapshot } from "@generalbusiness/dap-git";
import { decodeAsk, encodeAsk, encodeJob } from "../src/container-records.ts";
import { configurationDigest, originOf, signResult } from "../src/index.ts";
import { digest, newKey, T0, world } from "./support.ts";
import { stageOverlay, stageService } from "./support/stage-service.ts";
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
