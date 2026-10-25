import { expect, test } from "vitest";
import type { Digest, MemberId, MemberRef } from "@generalbusiness/dap-contract";
import { valueDigest } from "@generalbusiness/dap-derive";
import { classify, firstExtents, isExtents } from "../src/extents.ts";
import type { ExtentsAsked, ExtentsJudged, Review } from "../src/extents.ts";
import { firstExtentsV11, judgeExtentsV11, readRulesPolicyV11, rulesOwnerMayReviewV11, rulesPolicyPatternsV11, rulesPolicyProposalV11, RULES_POLICY_V11_DOMAIN } from "../src/rules-policy-v11.ts";
import type { ExtentV11, RulesPolicyV11 } from "../src/rules-policy-v11.ts";

// Pure policy decisions over hand-written review/changed-set inputs. These holders stand in for native
// membership observations; no grants, repository proof, certificate or native scope are exercised here.
const member = (name: string): MemberId => `@${name}` as MemberId;
const author = member("author"), owner = member("owner"), reviewer = member("reviewer"), merger = member("merger");
const checker: MemberRef = { membership: { scope: "sc_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", inc: "in_aaaaaaaaaaaaaaaaaaaaaaaaaa", kind: "membership" }, member: member("checker") };
const configuration = `sha256:${"1".repeat(64)}` as Digest;
const check = { name: "unit", configuration, required: true, checker };
const policy = (over: Partial<RulesPolicyV11> = {}): RulesPolicyV11 => ({
  approvals: 1, ownerMayReview: false, checks: [], labels: [], extents: firstExtentsV11({ approvals: 1, checks: [] }), ...over,
});
const extent = (value: RulesPolicyV11, name: string, over: Partial<ExtentV11>): RulesPolicyV11 => ({
  ...value, extents: value.extents.map(row => row.name === name ? { ...row, ...over } : row),
});
const accepted = (value: unknown): RulesPolicyV11 => {
  const read = readRulesPolicyV11(value);
  expect(read.ok).toBe(true);
  if (!read.ok) throw new Error(`policy refused: ${read.reason}`);
  return read.policy;
};
const proposal = (value: unknown) => {
  const read = rulesPolicyProposalV11(value);
  expect(read.ok).toBe(true);
  if (!read.ok) throw new Error(`proposal refused: ${read.reason}`);
  return read;
};
const refusal = (value: unknown) => {
  const read = readRulesPolicyV11(value);
  return read.ok ? null : read.reason;
};
const review = (who: MemberId, holds: readonly string[], ...names: string[]): Review[] => names.map(name => ({ member: who, holds, extent: name }));
type Asked = Omit<ExtentsAsked, "extents" | "ownerMayReview" | "singleControllerException">;
const judged = (value: RulesPolicyV11, paths: readonly string[], over: Partial<Asked> = {}): ExtentsJudged => {
  const answer = judgeExtentsV11(value, {
    touched: classify(value.extents, paths, [], 0), authors: [author], controllersOfAuthors: [], reviews: [], passed: [],
    merger: { member: merger, holds: ["change.merge"] }, controllers: [owner, reviewer], ...over,
  });
  if (!answer.ok) throw new Error(`policy refused: ${answer.reason}`);
  return answer.judgment;
};

test("Q11 requires explicit owner and zero-approval choices, review standing and the protected rules minimum without changing historical draft extents", () => {
  const positive = policy();
  expect(accepted(positive)).toEqual(positive);
  expect(firstExtents({ approvals: 1, checks: [] }).map(row => row.approver)).toEqual(["rules.publish", "change.merge", "change.review"]);
  expect(positive.extents.map(row => row.approver)).toEqual(["change.review", "change.review", "change.review"]);
  expect(positive.extents.every(row => !Object.hasOwn(row, "futurePatterns"))).toBe(true);
  expect([rulesOwnerMayReviewV11({}), rulesOwnerMayReviewV11({ ownerMayReview: null }), rulesOwnerMayReviewV11({ ownerMayReview: false }), rulesOwnerMayReviewV11({ ownerMayReview: true })])
    .toEqual([null, null, false, true]);
  const { ownerMayReview: omitted, ...missingOwner } = positive;
  expect(omitted).toBe(false);
  expect(refusal(missingOwner)).toBe("invalid-policy");
  expect(refusal({ ...positive, ownerMayReview: undefined })).toBe("invalid-policy");
  expect(refusal({ ...positive, certificate: "not part of this policy projection" })).toBe("invalid-policy");
  expect(rulesPolicyProposalV11({ ...positive, certificate: { proof: "presented separately" } })).toEqual({ ok: false, reason: "invalid-policy" });
  expect(rulesPolicyProposalV11({ ...positive, signature: "transport signature", repository: "caller transport choice" })).toEqual({ ok: false, reason: "invalid-policy" });

  const zero = policy({ approvals: 0, extents: firstExtentsV11({ approvals: 0, checks: [] }) });
  expect(refusal(zero)).toBe("approval-opt-in-required");
  expect(refusal({ ...zero, allowZeroApprovals: true })).toBe("approval-opt-in-required");
  const opted = policy({ approvals: 0, allowZeroApprovals: true, extents: firstExtentsV11({ approvals: 0, checks: [], allowZeroApprovals: true }) });
  expect(accepted(opted)).toEqual(opted);
  expect(rulesPolicyProposalV11({ ...opted, approvals: -0 })).toEqual({ ok: false, reason: "invalid-policy" });
  expect(rulesPolicyProposalV11(extent(opted, "source", { approvals: -0 }))).toEqual({ ok: false, reason: "invalid-policy" });
  expect(refusal(extent(opted, "rules", { approvals: 0, allowZeroApprovals: true }))).toBe("rules-extent-required");
  expect(refusal(extent(positive, "rules", { patterns: ["**/AGENTS.md"] }))).toBe("rules-extent-required");
  expect(refusal(extent(positive, "source", { patterns: ["src/**"] }))).toBe("catch-all-required");
  for (const approver of ["rules.publish", "change.merge"]) {
    const proposed = extent(positive, "infrastructure", { approver });
    expect(isExtents(proposed.extents)).toBe(true); // Historical structural grammar remains permissive.
    expect(refusal(proposed)).toBe("approver-not-review");
  }
});

test("Q11 retains owned complete policy fields and only explicit bounded exact future-pattern occurrences", () => {
  const base = policy({ checks: [check], labels: ["bug", ""], singleControllerException: false, allowZeroApprovals: false });
  const raw = { ...base, labels: [...base.labels], checks: [{ ...check, checker: { membership: { ...checker.membership }, member: checker.member } }],
    extents: base.extents.map(row => ({ ...row, patterns: [...row.patterns], checks: [...row.checks] })) };
  const originalProposal = proposal(raw), owned = originalProposal.policy;
  // Independent protocol input: the entire accepted proposal, not only its extents.
  expect(owned).toEqual(raw);
  expect(RULES_POLICY_V11_DOMAIN).toBe("artroom-rules-policy-1");
  expect(originalProposal.digest).toBe(valueDigest("artroom-rules-policy-1", raw));
  const reordered = { extents: raw.extents, labels: raw.labels, checks: raw.checks, ownerMayReview: raw.ownerMayReview,
    approvals: raw.approvals, allowZeroApprovals: raw.allowZeroApprovals, singleControllerException: raw.singleControllerException };
  expect(proposal(reordered).digest).toBe(originalProposal.digest);
  // The same extents with a different checker configuration/owner choice are a different proposal.
  const revised = proposal({ ...base, ownerMayReview: true, checks: [{ ...check, configuration: `sha256:${"2".repeat(64)}` as Digest }], labels: ["release"] });
  expect(revised.policy.extents).toEqual(owned.extents);
  expect(revised.digest).not.toBe(originalProposal.digest);
  const absentChoices = proposal(policy({ checks: [check], labels: ["bug", ""] }));
  expect(absentChoices.digest).not.toBe(originalProposal.digest);
  expect(Object.hasOwn(absentChoices.policy, "allowZeroApprovals")).toBe(false);
  expect(Object.hasOwn(absentChoices.policy, "singleControllerException")).toBe(false);
  const extentChoices = proposal(extent(base, "source", { allowZeroApprovals: false, futurePatterns: [] }));
  expect(extentChoices.policy.extents[2]).toEqual({ ...owned.extents[2], allowZeroApprovals: false, futurePatterns: [] });
  expect(extentChoices.digest).not.toBe(originalProposal.digest);
  raw.labels[0] = "changed";
  raw.checks[0]!.checker.membership.kind = "rules";
  raw.extents[0]!.patterns[0] = "changed";
  expect([owned.labels, owned.checks[0]!.checker.membership.kind, owned.extents[0]!.patterns[0], owned.singleControllerException, owned.allowZeroApprovals])
    .toEqual([["bug", ""], "membership", "**/AGENTS.md", false, false]);
  expect(originalProposal.digest).toBe(valueDigest("artroom-rules-policy-1", owned));
  expect(refusal(extent(base, "source", { checks: ["unknown"] }))).toBe("extent-check-unknown");
  expect(refusal({ ...base, checks: [check, check] })).toBe("invalid-policy");
  expect(refusal({ ...base, labels: ["\ud800"] })).toBe("invalid-policy");

  const future = extent(base, "rules", { futurePatterns: ["**/AGENTS.md"] });
  expect(proposal(future).digest).not.toBe(originalProposal.digest);
  expect(rulesPolicyPatternsV11(accepted(future)).find(row => row.pattern === "**/AGENTS.md")).toEqual({ pattern: "**/AGENTS.md", future: true });
  for (const futurePatterns of [["**/agents.md"], ["not-owned/**"], ["**/AGENTS.md", "**/AGENTS.md"]]) {
    expect(refusal(extent(base, "rules", { futurePatterns }))).toBe("invalid-policy");
  }
  expect(refusal(extent(base, "source", { futurePatterns: ["**/AGENTS.md"] }))).toBe("invalid-policy");
  const repeated = { ...future, extents: [...future.extents, { name: "instructions", patterns: ["**/AGENTS.md"], approvals: 1, approver: "change.review", checks: [], class: "content" as const }] };
  expect(rulesPolicyPatternsV11(accepted(repeated)).filter(row => row.pattern === "**/AGENTS.md"))
    .toEqual([{ pattern: "**/AGENTS.md", future: true }, { pattern: "**/AGENTS.md" }]);

  const atLimit = "é".repeat(128); // 256 UTF-8 bytes, not 256 characters.
  expect(accepted(extent(base, "infrastructure", { patterns: [atLimit], futurePatterns: [atLimit] })).extents[1]!.patterns).toEqual([atLimit]);
  expect(refusal(extent(base, "infrastructure", { patterns: [atLimit + "é"] }))).toBe("invalid-policy");
  const patterns = Array.from({ length: 32 }, (_, i) => `future-${i}/**`);
  expect(accepted(extent(base, "infrastructure", { patterns, futurePatterns: patterns })).extents[1]!.futurePatterns).toEqual(patterns);
  expect(refusal(extent(base, "infrastructure", { patterns: [...patterns, "extra/**"], futurePatterns: [...patterns, "extra/**"] }))).toBe("invalid-policy");

  // An owned projection is not an immutable authority token. A caller that changes it
  // must decode/hash again; the changed approver cannot reuse the accepted digest.
  const changed = proposal(base);
  changed.policy.extents[0]!.approver = "change.merge";
  expect(rulesPolicyProposalV11(changed.policy)).toEqual({ ok: false, reason: "approver-not-review" });
});

test("Q11 counted reviewers need change.review plus protected rules.publish and preserve author/controller independence", () => {
  const value = policy();
  const protectedChange = (holds: readonly string[]) => judged(value, ["AGENTS.md"], { reviews: review(reviewer, holds, "rules") });
  expect([protectedChange(["change.review"]).met, protectedChange(["rules.publish"]).met, protectedChange(["change.review", "rules.publish"]).met]).toEqual([false, false, true]);
  const infra = (holds: readonly string[]) => judged(value, [".gitignore"], { reviews: review(reviewer, holds, "infrastructure") });
  expect([infra(["change.merge"]).met, infra(["change.review"]).met]).toEqual([false, true]);
  const self = judged({ ...value, ownerMayReview: true }, ["AGENTS.md", "src/a.ts"], {
    reviews: [...review(author, ["change.review", "rules.publish"], "rules", "source")],
  });
  expect(self.unmet).toEqual(["rules", "source"]);
  const agent = { authors: [member("agent")], controllersOfAuthors: [owner], reviews: review(owner, ["change.review", "rules.publish"], "rules", "source") };
  expect(judged({ ...value, ownerMayReview: true }, ["AGENTS.md", "src/a.ts"], agent).unmet).toEqual(["rules"]);
  expect(judged(value, ["AGENTS.md", "src/a.ts"], agent).unmet).toEqual(["rules", "source"]);
  expect(judged(value, ["src/a.ts"], { controllersOfAuthors: null, reviews: review(reviewer, ["change.review"], "source") }).met).toBe(false);
  expect(judged({ ...value, ownerMayReview: true }, ["src/a.ts"], { controllersOfAuthors: null, reviews: review(reviewer, ["change.review"], "source") }).met).toBe(true);
});

test("Q11 single-controller exception stays explicit and cannot waive checks, landing standing or a refused changed path", () => {
  const value = extent(policy({ singleControllerException: true, checks: [check] }), "rules", { checks: ["unit"] });
  const own: Partial<Asked> = { authors: [owner], controllers: [owner], merger: { member: owner, holds: ["change.merge"] }, passed: ["unit"] };
  const result = judged(value, ["AGENTS.md"], own);
  expect([result.met, result.extents[0]!.counted, result.extents[0]!.exception]).toEqual([true, [], owner]);
  expect(judged({ ...value, singleControllerException: false }, ["AGENTS.md"], own).met).toBe(false);
  expect(judged(value, ["AGENTS.md"], { ...own, controllers: null }).met).toBe(false);
  expect(judged(value, ["AGENTS.md"], { ...own, authors: [member("agent")], controllersOfAuthors: [owner] }).met).toBe(true);
  expect(judged(value, ["AGENTS.md"], { ...own, authors: [member("agent")], controllersOfAuthors: null }).met).toBe(false);
  expect(judged(value, ["AGENTS.md"], { ...own, passed: [] }).extents[0]!.lacks).toEqual(["checks"]);
  expect(judged(value, ["AGENTS.md"], { ...own, merger: { member: owner, holds: [] } }).extents[0]!.lacks).toEqual(["grant"]);
  const refused = classify(value.extents, ["AGENTS.md"], [{ path: "AGENTS.md", tree: "new", resolves: null }], 0);
  const unknown = classify(value.extents, ["AGENTS.md"], [], null);
  for (const touched of [refused, unknown]) {
    const answer = judged(value, ["AGENTS.md"], { ...own, touched });
    expect([answer.met, answer.extents[0]!.exception]).toEqual([false, null]);
  }
});
