import { expect, test } from "vitest";
import type { Item, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isRecord, keyIdOfSecret, newIncarnation, scopeIdOf } from "@generalbusiness/dap-bytes";
import { Session } from "@generalbusiness/dap-client";
import { RULES_PATTERNS, rulesPolicyProposalV11 } from "@generalbusiness/dap-platform";
import { rulesSummaryV11, Q11_READ_ONLY } from "../src/rules-summary-v11.ts";
import { act, type Room } from "../src/data.ts";

const digest = digestBytes(new Uint8Array([1]));
const ref = (kind: ScopeRef["kind"], ordinal: number): ScopeRef => ({ scope: scopeIdOf({ v: 1, kind, definition: digest, creator: null, cause: digest, ordinal }), inc: newIncarnation(new Uint8Array(16).fill(ordinal)), kind });
const Q = ref("rules", 1), M = ref("membership", 2), G = ref("destination", 3), D = ref("directory", 4);
const item = (values: unknown): Item => ({ id: 0, type: "rules", state: "current", revision: 2, opened: digest, values: JSON.parse(canonicalize(values)), refs: { published: 1 }, parties: {}, attributed: [] });

test("Q11 summary presentation owns the complete policy and refuses contradictions without inventing published draft extents", () => {
  // Handwritten signed-summary contents, not native certificate provenance.
  const made = rulesPolicyProposalV11({ approvals: 1, ownerMayReview: false, checks: [], labels: [], extents: [
    { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
    { name: "other", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
  ] });
  if (!made.ok) throw Error("Strict fixture policy must be valid");
  const certificate = { request: { at: G, seq: 1, hash: digest }, certificate: { at: G, seq: 2, hash: digest }, proof: digest, commit: "a".repeat(40) };
  const values = { ...made.policy, singleControllerException: false, configured: true, policy: made.policy, proposal: made.digest, certificate };
  const summaryItem = item(values), read = rulesSummaryV11(summaryItem, G.scope);
  expect(read).toEqual({ configured: true, policy: made.policy, proposal: made.digest });
  const missingChecks: Record<string, unknown> = { ...values };
  delete missingChecks["checks"];
  expect(rulesSummaryV11(item(missingChecks), G.scope)).toBeNull();
  const inputPolicy = summaryItem.values["policy"];
  if (!isRecord(inputPolicy) || !Array.isArray(inputPolicy["labels"])) throw Error("Fixture policy labels must be mutable JSON");
  inputPolicy["labels"].push("caller mutation");
  expect(read?.policy?.labels).toEqual([]);
  expect(rulesSummaryV11(summaryItem, G.scope)).toBeNull();
  expect(rulesSummaryV11(item({ configured: false }), G.scope)).toEqual({ configured: false, policy: null });
  expect(rulesSummaryV11(item({ configured: false, policy: {} }), G.scope)).toBeNull();
});

test("Q11 Page writes refuse before intent signing or mutation transport", async () => {
  let signatures = 0, mutations = 0;
  const key = keyIdOfSecret(new Uint8Array(32)), now = () => Date.parse("2026-10-25T00:00:00Z");
  const room: Room = { session: { service: "https://room.test", now,
    signer: { key, sign: async () => { signatures++; throw Error("Must not sign a Q11 write"); } },
    fetch: async (_url, init) => {
      if ((init?.method ?? "GET") !== "GET") { mutations++; throw Error("Must not mutate"); }
      return Response.json({ ok: true, complete: true, at: { seq: 1, hash: digest }, value: { scope: Q, definition: "platform:rules@11", status: "active", time: "2026-10-25T00:00:00Z", counts: [], items: [] } });
    } }, directory: D.scope, membership: M, rules: Q.scope, destination: G.scope, key, me: null,
    reader: new Session("SCRIPTED-session", { v: 1, deployment: "SCRIPTED", membership: M, member: "@reader", key, reads: ["summary"], ends: "2026-10-25T01:00:00Z" }),
    unsessioned: null, directoryIndex: null, definitions: new Map() };
  await expect(act(room, Q.scope, "publish")).rejects.toThrow(Q11_READ_ONLY);
  expect([signatures, mutations]).toEqual([0, 0]);
});
