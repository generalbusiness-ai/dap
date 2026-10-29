/** SCRIPTED policy projection; this tests coverage, not Native authority. */
import { describe, expect, it } from "vitest";
import { evidenceHoldExtentNamesV17 } from "../src/destination-evidence-capacity-v17.ts";
import type { RulesPolicyV13 } from "../src/rules-policy-v13.ts";
import type { Entry, FactRef } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isEntry, isFactRef, isRecord, utf8 } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest, type EvidenceBinding } from "../src/evidence.ts";
import { EVIDENCE_BINDING_TEXT_V17, readBindingTextV17 } from "../src/destination-evidence-v17.ts";
import { d, keys, otherLane } from "@generalbusiness/dap-derive/testing";
import { valueDigest, type Item, type RuleGiven } from "@generalbusiness/dap-derive";
import { evidenceCapacityAnchorOpeningV17, evidenceCapacityPolicyKeyV17, evidenceCapacityPolicyV17, evidenceCapacityWireV17, evidenceFundCapacityV17, evidencePendingCapacityForecastV17, readEvidenceCapacityWireV17 } from "../src/destination-evidence-capacity-v17.ts";
import type { EvidenceBatchRecordV17 } from "../src/evidence-batch-v17.ts";
import { certifiedBoundFenceBudgetV17, certifiedPublicationWireV17, type CertifiedPublicationStateV17 } from "../src/destination-budget-v17.ts";
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
  function snapshot(source: EvidenceBatchRecordV17): CertifiedPublicationStateV17 {
    const policy = source.policy, envelope = { configured: true, policy: policy.policy, proposal: policy.proposal, certificate: policy.certificate };
    return { policy: { observation: { subject: "rules", of: RULES, head: policy.head, revision: policy.revision, definition: "platform:rules@13", at: "2026-10-28T00:00:00.000Z",
      content: { asked: "rules", approvals: 1, ownerMayReview: false, checks: policy.policy.checks.map(({ name, configuration, required, checker }) => ({ name, configuration, required, checker: checker.member })),
        labels: [], singleControllerException: false, extents: valueDigest("artroom-rules-extents-3", envelope), roomService: null, serviceGeneration: policy.serviceGeneration } },
      input: { rules: RULES, destination, extents: envelope }, touched: [...source.touched], required: [], tree: "b".repeat(40), manifest: fact(5) }, generations: [] };
  }
  type Anchor = { id: number; capacity: string; policy: string };
  function initialAnchor(source = batch(10, ["code"])): Anchor {
    return { id: 2, capacity: evidenceCapacityWireV17({ v: 1, owner: 2, generation: { rules: RULES, seq: source.policy.revision }, holds: [], incidents: [] }),
      policy: certifiedPublicationWireV17(snapshot(source), PROPOSED_BOUNDS) };
  }
  function afterFunding(anchor: Anchor, funded: NonNullable<ReturnType<typeof evidenceFundCapacityV17>>): Anchor {
    const effect = funded.effects.find(effect => effect.effect === "value" && effect.item === anchor.id && effect.slot === "capacity");
    if (!effect) return anchor;
    if (effect.effect !== "value" || typeof effect.value !== "string") throw Error("The scripted generation update must retain canonical text");
    return { ...anchor, capacity: effect.value };
  }
  function scripted(self: number, counts = { keys: 0, holds: 0, policyGenerations: 1, incidents: 0 }, anchor: Anchor | null = initialAnchor()): RuleGiven {
    const branch: Item = { id: 0, type: "branch", state: "ready", values: {}, refs: { evidenceLedger: 1 }, parties: {}, opened: d("a"), revision: 1, attributed: [] };
    const ledger: Item = { id: 1, type: "evidence-ledger", state: "ready", values: { counts }, refs: {}, parties: {}, opened: d("a"), revision: 1, attributed: [] };
    const generation = { rules: RULES, seq: 10 }, policyKey = evidenceCapacityPolicyKeyV17(generation);
    const capacity: Item | null = anchor ? { id: anchor.id, type: "evidence-capacity", state: "ready", opened: d("a"), revision: anchor.id, parties: {},
      refs: { capture: fact(11, destination) }, values: { capacity: anchor.capacity, policy: anchor.policy, policyKey }, attributed: [] } : null;
    const captured: Entry = { v: 1, at: destination, seq: 11, prev: d("a"), time: "2026-10-28T00:00:00.000Z", clamped: false, epoch: 0,
      input: { type: "outcome", owner: "platform:destination@17", kind: "judge", operation: "10:0", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: {} } }, uses: [], prepared: [], effects: [], sends: [] };
    return { input: { type: "delivery", from: fact(20, destination), n: 0, message: { class: "request", type: "tell", body: { message: "evidence-fund", fields: {} } } },
      time: "2026-10-28T00:00:00.000Z", uses: [], resolved: { at: destination, self, bounds: PROPOSED_BOUNDS },
      own: (seq: number) => seq === 11 ? { entry: captured, hash: entryHash(captured) } : null,
      state: { page: (type: string) => ({ items: type === "branch" ? [branch] : type === "evidence-ledger" ? [ledger] : type === "evidence-capacity" && capacity ? [capacity] : [], more: false }),
        lookup: (type: string, index: string, key: string) => type === "evidence-capacity" && index === "policyKey" && key === canonicalize(policyKey) && capacity ? [capacity.id] : [],
        item: (id: number) => id === 0 ? branch : id === 1 ? ledger : capacity && id === capacity.id ? capacity
          : [10, 30, 40, 50].includes(id) ? { id, type: "publication", refs: { manifest: fact(5) }, values: { reservedAt: id + 1 } } : null,
        scope: () => ({ at: destination, head: { seq: 90, hash: d("a") } }) },
    } as unknown as RuleGiven;
  }
  it("charges the policy generation when its nonholder anchor opens, before any batch reserves incidents or holds", () => {
    const source = batch(10, ["code"]), given = scripted(2, { keys: 0, holds: 0, policyGenerations: 0, incidents: 0 }, null);
    const publication = given.state.item(10);
    if (!publication) throw Error("The scripted captured publication is required");
    const effects = evidenceCapacityAnchorOpeningV17(given, publication, snapshot(source));
    expect(effects).toHaveLength(6);
    expect(effects.filter(effect => effect.effect === "open")).toEqual([{ effect: "open", item: 2, type: "evidence-capacity", state: "ready" }]);
    expect(effects.find(effect => effect.effect === "value" && effect.slot === "counts")).toMatchObject({ item: 1,
      value: { keys: 0, holds: 0, policyGenerations: 1, incidents: 0 } });
    const value = effects.find(effect => effect.effect === "value" && effect.slot === "capacity");
    if (value?.effect !== "value") throw Error("The nonholder anchor retains its initial capacity");
    expect(readEvidenceCapacityWireV17(value.value)).toEqual({ v: 1, owner: 2, generation: { rules: RULES, seq: 10 }, holds: [], incidents: [] });
    expect(evidenceFundCapacityV17(given, source)).toBeNull(); // The opening must fold before a batch can spend it.
  });
  it("reserves a hold key once across publications and adds only newly touched keys", () => {
    const owner = initialAnchor(), first = evidenceFundCapacityV17(scripted(100, undefined, owner), batch(10, ["code"]));
    expect(first).not.toBeNull();
    expect(readEvidenceCapacityWireV17(first!.capacity)).toMatchObject({ owner: 2, holds: null });
    const anchor = afterFunding(owner, first!);
    const counts = { keys: 0, holds: 1, policyGenerations: 1, incidents: 1 };
    const repeated = evidenceFundCapacityV17(scripted(101, counts, anchor), batch(30, ["code"]));
    expect(repeated?.effects.find(effect => effect.effect === "value" && effect.slot === "counts")).toMatchObject({ item: 1, value: { ...counts, incidents: 2 } });
    const expanded = evidenceFundCapacityV17(scripted(102, counts, anchor), batch(40, ["code", "docs"]));
    expect(expanded?.effects.find(effect => effect.effect === "value" && effect.slot === "counts")).toMatchObject({ item: 1, value: { ...counts, holds: 2, incidents: 2 } });
  });
  it("refuses prefunding one effect below the complete admission with a distinct generation anchor", () => {
    // The generation already owns its nonholder anchor. The job may own
    // the hold or follow another job owner. Both require the separate
    // generation-capacity update and the one automatic attempt record.
    const source = batch(10, ["code"]), given = scripted(100);
    const at = (derivedEffects: number): RuleGiven => ({ ...given, resolved: { ...given.resolved,
      bounds: { ...given.resolved.bounds, derivedEffects } } });
    expect(evidenceFundCapacityV17(at(13), source)).not.toBeNull();
    expect(evidenceFundCapacityV17(at(12), source)).toBeNull();
  });
  it("prefunds the no-item bound fence with all future claims, fact uses and its implicit reply", () => {
    const source = batch(10, ["code"]), quote = certifiedBoundFenceBudgetV17(PROPOSED_BOUNDS, source, fact(5));
    expect(quote).toMatchObject({ admitted: true, effects: 3 });
    expect(certifiedBoundFenceBudgetV17({ ...PROPOSED_BOUNDS, entryBytes: quote.entryBytes }, source, fact(5)).admitted).toBe(true);
    expect(certifiedBoundFenceBudgetV17({ ...PROPOSED_BOUNDS, entryBytes: quote.entryBytes - 1 }, source, fact(5)).admitted).toBe(false);
    expect(certifiedBoundFenceBudgetV17({ ...PROPOSED_BOUNDS, derivedEffects: 2 }, source, fact(5)).admitted).toBe(false);
    expect(certifiedBoundFenceBudgetV17({ ...PROPOSED_BOUNDS, usesPerEntry: 3 }, source, fact(5)).admitted).toBe(false);
    expect(certifiedBoundFenceBudgetV17({ ...PROPOSED_BOUNDS, sendsPerEntry: 0 }, source, fact(5)).admitted).toBe(false);
  });
  it("quotes a full job fact and independently serialized maximum escaped closed binding, even when policy-ineligible", () => {
    const source = batch(10, ["code"]), quote = certifiedBoundFenceBudgetV17(PROPOSED_BOUNDS, source, fact(5));
    const binding = (slashes: number): EvidenceBinding => ({ v: 1, source: "member", stage: "published", checker: keys.una.member,
      policyGeneration: { rules: RULES, seq: 0 }, serviceGeneration: { rules: RULES, seq: 0 }, auditOf: null,
      roomService: { checker: { ...keys.una.member, member: `@m${"\\".repeat(slashes)}` }, key: keys.una.key },
      subject: { kind: "published", publication: source.publication, manifest: fact(5), receipt: fact(6, destination), written: fact(7, destination) } });
    // A backslash takes exactly two bytes inside canonical binding JSON.
    // Fill the closed text cap, then serialize it again as a real Entry
    // field rather than repeating the production carrier-size formula.
    const padding = Math.floor((EVIDENCE_BINDING_TEXT_V17 - utf8(canonicalize(binding(0))).length) / 2);
    const closed = binding(padding), text = canonicalize(closed), digest = evidenceBindingDigest(closed);
    expect(utf8(text).length).toBeGreaterThanOrEqual(EVIDENCE_BINDING_TEXT_V17 - 1);
    expect(readBindingTextV17(text, digest)).toEqual(closed);
    expect(utf8(canonicalize(text)).length).toBeGreaterThan(utf8(text).length + 1000);
    expect(quote.bindingCarrierBytes).toBe(2 * EVIDENCE_BINDING_TEXT_V17 + 2);
    const shell = quote.variants[0]!, input = shell.input;
    if (input.type !== "delivery" || !("decision" in input) || input.decision !== "applied" || input.message.class !== "request"
      || input.message.type !== "tell" || !isRecord(input.message.body) || !isRecord(input.message.body["fields"])) throw Error("A bound fence forecast must retain its full wire shape");
    const fields: Record<string, unknown> = { ...input.message.body["fields"], binding: text, bindingDigest: digest };
    expect(isFactRef(fields["job"])).toBe(true);
    const entry: Entry = { ...shell, uses: Array.from({ length: 5 }, (_, n) => ({ fact: { ...fact(Number.MAX_SAFE_INTEGER - n, destination), hash: d("f") }, content: d("f") })),
      input: { ...input, message: { class: "request", type: "tell", body: { message: "check-fence", fields } } } };
    expect(isEntry(entry)).toBe(true);
    const full = utf8(canonicalize(entry)).length;
    const marked = { ...entry, input: { ...entry.input, message: { class: "request", type: "tell", body: { message: "check-fence", fields: { ...fields, job: { self: true } } } } } };
    expect(full).toBeGreaterThan(utf8(canonicalize(marked)).length);
    expect(full).toBeLessThanOrEqual(quote.entryBytes);
  });
  it("refuses a selected holds obligation with no associated or touched extent before funding", () => {
    expect(evidenceFundCapacityV17(scripted(100), batch(10, []))).toBeNull();
  });
  it("reserves three publication identities before work and refuses a fourth without eviction", () => {
    let anchor = initialAnchor();
    const first = evidenceFundCapacityV17(scripted(100, undefined, anchor), batch(10, ["code"]));
    expect(first).not.toBeNull();
    anchor = afterFunding(anchor, first!);
    for (const [n, seq] of [30, 40].entries()) {
      const next = evidenceFundCapacityV17(scripted(101 + n, { keys: 0, holds: 1, policyGenerations: 1, incidents: 1 + n }, anchor), batch(seq, ["code"]));
      expect(next).not.toBeNull();
      const update = next!.effects.find(effect => effect.effect === "value" && effect.item === 2 && effect.slot === "capacity");
      if (!update || update.effect !== "value") throw Error("The scripted shared anchor was not reserved");
      anchor = afterFunding(anchor, next!);
    }
    const slots = readEvidenceCapacityWireV17(anchor.capacity)!.holds![0]!.pending;
    expect(slots.map(slot => [slot.publication.seq, slot.job, slot.admittedAt])).toEqual([[10, null, null], [30, null, null], [40, null, null]]);
    const before = JSON.stringify(anchor.capacity);
    expect(evidenceFundCapacityV17(scripted(103, { keys: 0, holds: 1, policyGenerations: 1, incidents: 3 }, anchor), batch(50, ["code"]))).toBeNull();
    expect(JSON.stringify(anchor.capacity)).toBe(before);
  });
  it("future carriers quote all frozen potential extent keys and all three bound pointers, beyond the sparse current anchor", () => {
    const source = batch(10, ["code"]), owner = initialAnchor(source), first = evidenceFundCapacityV17(scripted(100, undefined, owner), source);
    expect(first).not.toBeNull();
    const anchor = afterFunding(owner, first!), given = scripted(101, { keys: 0, holds: 1, policyGenerations: 1, incidents: 1 }, anchor);
    const future = evidencePendingCapacityForecastV17(given, 2, otherLane);
    const effect = future[0];
    if (!effect || effect.effect !== "value") throw Error("The actual future carrier helper gave no capacity");
    const decoded = readEvidenceCapacityWireV17(effect.value)!;
    expect(readEvidenceCapacityWireV17(first!.capacity)!.holds).toBeNull();
    expect(readEvidenceCapacityWireV17(anchor.capacity)!.holds!.map(row => row.key.extent)).toEqual(["code"]);
    expect(decoded.holds!.map(row => row.key.extent).sort()).toEqual(["code", "docs", "rules"]);
    expect(decoded.holds!.every(row => row.pending.length === 3 && row.pending.every(slot => slot.job !== null && slot.admittedAt !== null))).toBe(true);
    expect(JSON.stringify(effect.value).length).toBeGreaterThan(JSON.stringify(anchor.capacity).length);
  });
  it("rejects an anchor with a borrowed owner or a policy generation that its strict policy text does not describe", () => {
    const source = batch(10, ["code"]), anchor = initialAnchor(source), held = readEvidenceCapacityWireV17(anchor.capacity)!;
    expect(evidenceCapacityPolicyV17(scripted(100, undefined, anchor).state, 2, PROPOSED_BOUNDS)).toEqual(source.policy.policy);
    const wrongOwner = { ...anchor, capacity: evidenceCapacityWireV17({ ...held, owner: 100 }) };
    expect(evidenceFundCapacityV17(scripted(100, undefined, wrongOwner), source)).toBeNull();
    const wrongGeneration = { ...anchor, capacity: evidenceCapacityWireV17({ ...held, generation: { ...held.generation, seq: 11 } }) };
    expect(evidenceCapacityPolicyV17(scripted(100, undefined, wrongGeneration).state, 2, PROPOSED_BOUNDS)).toBeNull();
    expect(evidenceFundCapacityV17(scripted(100, undefined, wrongGeneration), source)).toBeNull();
  });
});
