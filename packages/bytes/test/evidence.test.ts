import { expect, test } from "vitest";
import type { EvidenceBinding, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, evidenceBindingDigest, newIncarnation, readEvidenceBinding } from "../src/index.ts";

const scope = (kind: ScopeRef["kind"]): ScopeRef => ({ scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind });
const binding = (): EvidenceBinding => ({ v: 1, source: "room", stage: "work",
  checker: { membership: scope("membership"), member: "@checker" },
  policyGeneration: { rules: scope("rules"), seq: 2 },
  roomService: { checker: { membership: scope("membership"), member: "@checker" }, key: `key_${b64url(new Uint8Array(32))}` },
  serviceGeneration: { rules: scope("rules"), seq: 1 }, auditOf: null,
  subject: { kind: "work", source: { at: scope("lane"), seq: 4, hash: `sha256:${"1".repeat(64)}` } },
});

test("a binding owns its nested facts and its digest distinguishes native generations and incarnations", () => {
  const original = binding(), owned = readEvidenceBinding(original);
  expect(owned).toEqual(original);
  if (!owned) return expect.fail("The explicit binding must be readable");
  const digest = evidenceBindingDigest(owned);
  original.serviceGeneration.seq++;
  // Explicit public TEST bytes produce another canonical 16-byte incarnation.
  original.checker.membership.inc = newIncarnation(new Uint8Array(16).fill(1));
  expect(evidenceBindingDigest(owned)).toBe(digest);
  expect(evidenceBindingDigest(original)).not.toBe(digest);
  const recreated = binding(); recreated.policyGeneration.rules.inc = newIncarnation(new Uint8Array(16).fill(1));
  expect(evidenceBindingDigest(recreated)).not.toBe(digest);
  expect(readEvidenceBinding({ ...binding(), stage: "landing" })).toBeNull();
  expect(readEvidenceBinding({ ...binding(), callerKey: binding().roomService!.key })).toBeNull();
  let invoked = false;
  const accessor = { ...binding() };
  Object.defineProperty(accessor, "roomService", { enumerable: true, get() { invoked = true; return null; } });
  expect(readEvidenceBinding(accessor)).toBeNull(); expect(invoked).toBe(false);
});
