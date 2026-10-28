/** SCRIPTED policy projection; this tests coverage, not Native authority. */
import { describe, expect, it } from "vitest";
import { evidenceHoldExtentNamesV17 } from "../src/destination-evidence-capacity-v17.ts";
import type { RulesPolicyV13 } from "../src/rules-policy-v13.ts";
import type { FactRef } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { d, keys, otherLane } from "@generalbusiness/dap-derive/testing";
import type { Item, RuleGiven } from "@generalbusiness/dap-derive";
import { evidenceFundCapacityV17, evidencePendingCapacityForecastV17, readEvidenceCapacityWireV17 } from "../src/destination-evidence-capacity-v17.ts";
import type { EvidenceBatchRecordV17 } from "../src/evidence-batch-v17.ts";
import { evidenceBatchWireV17 } from "../src/evidence-batch-v17.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { RULES } from "./support-destination.ts";

describe("published hold coverage", () => {
  const extents: RulesPolicyV13["extents"] = [
    { name: "code", patterns: ["src/**"], checks: [], approvals: 0, approver: "change.review", class: "content" },
    { name: "docs", patterns: ["docs/**"], checks: ["named"], approvals: 0, approver: "change.review", class: "content" },
  ];
  it("funds a globally required check on actual touched extents without a named association", () => {
    expect(evidenceHoldExtentNamesV17({ name: "global", required: true }, extents, ["code"])).toEqual(["code"]);
    expect(evidenceHoldExtentNamesV17({ name: "global", required: true }, extents, ["docs"])).toEqual(["docs"]);
  });
  it("keeps explicit associations and deduplicates their overlap with global coverage", () => {
    expect(evidenceHoldExtentNamesV17({ name: "named", required: true }, extents, ["code", "docs"])).toEqual(["code", "docs"]);
    expect(evidenceHoldExtentNamesV17({ name: "named", required: false }, extents, ["code"])).toEqual(["docs"]);
  });
});

// The state below is an explicit SCRIPTED arithmetic port. Actual self-send,
// certificate and holder authority are tested by the owning Native story.
describe("exact pre-publication capacity identities", () => {
  const destination = { ...otherLane, kind: "destination" as const };
  const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
  function batch(seq: number, touched: readonly string[]): EvidenceBatchRecordV17 {
    const check = { name: "global", configuration: d("b"), required: true, checker: keys.una.member, stage: "published" as const, holds: true };
    const read = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, checks: [check], labels: [], roomService: null,
      extents: [
        { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
        { name: "code", patterns: ["src/**"], approvals: 1, approver: "change.review", checks: [], class: "content" },
        { name: "docs", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
      ] });
    if (!read.ok) throw Error("The scripted policy is invalid");
    return { v: 1, publication: fact(seq, destination), operation: fact(seq), capture: fact(seq + 1, destination), ordinal: 0, total: 1, checks: [check], touched,
      policy: { rules: RULES, head: { seq: 15, hash: d("c") }, revision: 10, proposal: read.digest, policy: read.policy,
        certificate: { request: fact(3, destination), certificate: fact(4, destination), proof: d("d"), commit: "a".repeat(40) }, serviceGeneration: { rules: RULES, seq: 5 } }, jobs: [], planAt: null };
  }
  function scripted(self: number, counts = { keys: 0, holds: 0, policyGenerations: 0, incidents: 0 }, anchor?: { id: number; capacity: unknown }): RuleGiven {
    const branch = { id: 0, type: "branch", state: "ready", values: { evidenceCounts: counts }, refs: {}, parties: {} } as unknown as Item;
    return { input: { type: "delivery", from: fact(20, destination), n: 0, message: { class: "request", type: "tell", body: { message: "evidence-fund", fields: {} } } },
      time: "2026-10-28T00:00:00.000Z", uses: [], resolved: { at: destination, self, bounds: PROPOSED_BOUNDS },
      state: { page: () => ({ items: [branch], more: false }), lookup: () => anchor ? [anchor.id] : [],
        item: (id: number) => id === 0 ? branch : anchor && id === anchor.id ? { id, values: { capacity: anchor.capacity } }
          : [10, 30, 40, 50].includes(id) ? { id, type: "publication", refs: { manifest: fact(5) }, values: {} } : null,
        scope: () => ({ at: destination, head: { seq: 90, hash: d("a") } }) },
    } as unknown as RuleGiven;
  }
  it("reserves a hold key once across publications and adds only newly touched keys", () => {
    const first = evidenceFundCapacityV17(scripted(100), batch(10, ["code"]));
    expect(first).not.toBeNull();
    const counts = { keys: 0, holds: 1, policyGenerations: 1, incidents: 1 };
    const repeated = evidenceFundCapacityV17(scripted(101, counts, { id: 100, capacity: first!.capacity }), batch(30, ["code"]));
    expect(repeated?.effects.find(effect => effect.effect === "value" && effect.slot === "evidenceCounts")).toMatchObject({ value: { ...counts, incidents: 2 } });
    const expanded = evidenceFundCapacityV17(scripted(102, counts, { id: 100, capacity: first!.capacity }), batch(40, ["code", "docs"]));
    expect(expanded?.effects.find(effect => effect.effect === "value" && effect.slot === "evidenceCounts")).toMatchObject({ value: { ...counts, holds: 2, incidents: 2 } });
  });
  it("refuses a selected holds obligation with no associated or touched extent before funding", () => {
    expect(evidenceFundCapacityV17(scripted(100), batch(10, []))).toBeNull();
  });
  it("reserves three publication identities before work and refuses a fourth without eviction", () => {
    const first = evidenceFundCapacityV17(scripted(100), batch(10, ["code"]));
    expect(first).not.toBeNull();
    let capacity = first!.capacity;
    for (const [n, seq] of [30, 40].entries()) {
      const next = evidenceFundCapacityV17(scripted(101 + n, { keys: 0, holds: 1, policyGenerations: 1, incidents: 1 + n }, { id: 100, capacity }), batch(seq, ["code"]));
      expect(next).not.toBeNull();
      const update = next!.effects.find(effect => effect.effect === "value" && effect.item === 100 && effect.slot === "capacity");
      if (!update || update.effect !== "value") throw Error("The scripted shared anchor was not reserved");
      capacity = update.value!;
    }
    const slots = readEvidenceCapacityWireV17(capacity)!.holds![0]!.pending;
    expect(slots.map(slot => [slot.publication.seq, slot.job, slot.admittedAt])).toEqual([[10, null, null], [30, null, null], [40, null, null]]);
    const before = JSON.stringify(capacity);
    expect(evidenceFundCapacityV17(scripted(103, { keys: 0, holds: 1, policyGenerations: 1, incidents: 3 }, { id: 100, capacity }), batch(50, ["code"]))).toBeNull();
    expect(JSON.stringify(capacity)).toBe(before);
  });
  it("future carriers quote all frozen potential extent keys and all three bound pointers, beyond the sparse current anchor", () => {
    const source = batch(10, ["code"]), first = evidenceFundCapacityV17(scripted(100), source);
    expect(first).not.toBeNull();
    const given = scripted(101, { keys: 0, holds: 1, policyGenerations: 1, incidents: 1 }, { id: 100, capacity: first!.capacity });
    const original = given.state.item.bind(given.state);
    const future = evidencePendingCapacityForecastV17({ ...given, state: { ...given.state, item: (id: number) => id === 100
      ? { ...original(id)!, values: { capacity: first!.capacity, batch: evidenceBatchWireV17(source) } } : original(id) } }, 100, otherLane);
    const effect = future[0];
    if (!effect || effect.effect !== "value") throw Error("The actual future carrier helper gave no capacity");
    const decoded = readEvidenceCapacityWireV17(effect.value)!;
    expect(readEvidenceCapacityWireV17(first!.capacity)!.holds!.map(row => row.key.extent)).toEqual(["code"]);
    expect(decoded.holds!.map(row => row.key.extent).sort()).toEqual(["code", "docs", "rules"]);
    expect(decoded.holds!.every(row => row.pending.length === 3 && row.pending.every(slot => slot.job !== null && slot.admittedAt !== null))).toBe(true);
    expect(JSON.stringify(effect.value).length).toBeGreaterThan(JSON.stringify(first!.capacity).length);
  });
});
