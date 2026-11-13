import { expect, test } from "vitest";
import { b64url, keyIdOfSecret, signInvitationProof, verifyInvitationProof } from "../src/index.ts";
import type { ScopeRef } from "@generalbusiness/dap-contract";

// Invariant: an invitation signature is useful only for its exact membership
// sequence, invitation item and joining key; the private seed is not a proof.
test("invitation proofs cannot be reused for another key, invitation or scope sequence", () => {
  const seed = new Uint8Array(32).fill(73), actor = keyIdOfSecret(new Uint8Array(32).fill(74));
  const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"4b".repeat(32)}` };
  const key = keyIdOfSecret(seed), proof = signInvitationProof(seed, scope, 4, actor);
  expect(verifyInvitationProof(key, proof, scope, 4, actor)).toBe(true);
  expect(verifyInvitationProof(key, proof, scope, 4, keyIdOfSecret(new Uint8Array(32).fill(76)))).toBe(false);
  expect(verifyInvitationProof(key, proof, scope, 5, actor)).toBe(false);
  expect(verifyInvitationProof(key, proof, { ...scope, genesis: `sha256:${"4d".repeat(32)}` as const }, 4, actor)).toBe(false);
  expect(verifyInvitationProof(key, proof, { ...scope, scope: `sc_${"b".repeat(52)}` } as ScopeRef, 4, actor)).toBe(false);
  expect(verifyInvitationProof(key, b64url(seed), scope, 4, actor)).toBe(false);
});
