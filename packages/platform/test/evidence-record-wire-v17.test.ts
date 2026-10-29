import { expect, test } from "vitest";
import type { FactRef } from "@generalbusiness/dap-contract";
import { canonicalize, isFieldValue } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest, type EvidenceBinding } from "../src/evidence.ts";
import { d, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { RuleFault, type RuleGiven } from "@generalbusiness/dap-derive";
import { evidenceDestinationRulesV17, evidenceJobRecordWireV17, evidenceRecordEffectV17, readEvidenceJobRecordV17, readEvidenceJobRecordWireV17, readEvidenceServiceWireV17,
  EVIDENCE_RECORD_BYTES_V17, type EvidenceJobRecordV17 } from "../src/destination-evidence-v17.ts";
import { evidenceCapacityWireV17, readEvidenceCapacityAnchorV17, readEvidenceCapacityWireV17 } from "../src/destination-evidence-capacity-v17.ts";

// SCRIPTED facts and pending state exercise the wire grammar only. They do
// not establish Native admission, current signing authority or capacity.
const rules = { ...otherLane, kind: "rules" as const };
const fact = (seq: number): FactRef => ({ at: otherLane, seq, hash: d("a") });
function pending(): EvidenceJobRecordV17 {
  const binding: EvidenceBinding = { v: 1, source: "member", stage: "work", checker: keys.una.member,
    policyGeneration: { rules, seq: 2 }, roomService: null, serviceGeneration: { rules, seq: 0 }, auditOf: null, subject: { kind: "work", source: fact(3) } };
  return { v: 1, job: fact(4), name: "unit", configuration: d("b"), binding, bindingDigest: evidenceBindingDigest(binding), state: "pending",
    admittedAt: null, commit: null, tree: null, base: null, sourceFacts: [fact(3)], commitProof: null, policy: null,
    reuseOwner: null, reuse: null, holdOwner: null, holds: [], policyOwner: null, incident: null, result: null, signer: null,
    decidedAt: null, reason: null, observedGeneration: null, funded: { reuse: false, holds: false, policy: false, incident: false }, countedJob: null,
    reuseRequested: false, deadline: t(60), forJob: null, noticeAt: null, holder: 5, requestAt: 5, covered: [] };
}
test("persisted job effects contain canonical text, retaining semantic nulls without a FieldValue escape", () => {
  const record = pending(), text = evidenceJobRecordWireV17(record), effect = evidenceRecordEffectV17(5, record);
  expect(readEvidenceJobRecordV17(record)).toEqual(record);
  expect(isFieldValue(record)).toBe(false);
  expect(isFieldValue(text)).toBe(true);
  expect(effect).toEqual({ effect: "value", item: 5, slot: "record", value: text });
  expect(readEvidenceJobRecordWireV17(text)).toEqual(record);
  expect(readEvidenceJobRecordWireV17(record)).toBeNull();
  expect(readEvidenceJobRecordV17(text)).toBeNull();
  expect(readEvidenceJobRecordWireV17(` ${text}`)).toBeNull();
  expect(readEvidenceJobRecordWireV17(" ".repeat(EVIDENCE_RECORD_BYTES_V17 + 1))).toBeNull();
  expect(readEvidenceJobRecordWireV17(canonicalize({ ...record, bindingDigest: d("f") }))).toBeNull();
});
test("nullable service marks and capacity reservations also require explicit text wires", () => {
  const service = { mark: null, generation: { rules, seq: 2 } };
  expect(readEvidenceServiceWireV17(canonicalize(service))).toEqual(service);
  expect(readEvidenceServiceWireV17(service)).toBeNull();
  const capacity = { v: 1 as const, owner: 5, generation: { rules, seq: 2 }, holds: null, incidents: [{ name: "published", job: null }] };
  const text = evidenceCapacityWireV17(capacity);
  expect(readEvidenceCapacityAnchorV17(capacity)).toEqual(capacity);
  expect(readEvidenceCapacityWireV17(text)).toEqual(capacity);
  expect(readEvidenceCapacityWireV17(capacity)).toBeNull();
  expect(isFieldValue(capacity)).toBe(false);
  expect(isFieldValue(text)).toBe(true);
});

test("ordinary Native selectors use an exact bounded publication index and cannot turn a foreign admission into a local job", () => {
  // SCRIPTED state ports exercise the actual selector callbacks. They do
  // not authenticate an admission; that remains the native proof reader's
  // responsibility, also checked again by result/recovery guards.
  const rules = evidenceDestinationRulesV17({}), publication = rules["evidence-publication-v17"], admitted = rules["evidence-admitted-job-v17"];
  if (publication?.place !== "also" || !("run" in publication) || admitted?.place !== "also" || !("run" in admitted)) throw Error("The ordinary Native selectors are absent");
  const operation = fact(8), calls: unknown[] = [];
  const given = { resolved: { at: { ...otherLane, kind: "destination" }, fields: { operation } }, state: {
    lookup: (...args: unknown[]) => { calls.push(args); return [12]; },
    item: () => ({ id: 12, type: "publication", refs: { operation } }),
  } } as unknown as RuleGiven;
  expect(publication.run(given, "publication")).toBe(12);
  expect(calls).toEqual([["publication", "operation", canonicalize(operation), 2]]);
  expect(() => publication.run({ ...given, state: { ...given.state, lookup: () => [12, 13] } }, "publication")).toThrow(RuleFault);
  expect(() => publication.run({ ...given, state: { ...given.state, item: () => ({ id: 12, type: "publication", refs: { operation: fact(9) } }) } } as unknown as RuleGiven, "publication")).toThrow(RuleFault);
  expect(admitted.run({ resolved: { at: { ...otherLane, kind: "destination" }, fields: { admission: fact(12) } },
    state: { item: () => { throw Error("A foreign admission must not be guessed by its position"); } } } as unknown as RuleGiven, "evidence-job")).toBeNull();
});
