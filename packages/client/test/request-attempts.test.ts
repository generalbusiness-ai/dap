/** Real signatures over labelled stand-in addresses. No service/native
 * authority is inferred from this private local journal. */
import { expect, test } from "vitest";
import { keyIdOfSecret, newIncarnation, scopeIdOf, signIntent, textDigest } from "@generalbusiness/dap-bytes";
import { requestJournal, appendPreparedRequest, markRequestAttempt, type RequestActorIdentity, type RequestEnvelope } from "../src/index.ts";
const seed = new Uint8Array(32).fill(71), publicKey = keyIdOfSecret(seed), definition = textDigest("PUBLIC TEST journal definition");
const ref = (kind: "lane" | "membership") => ({ kind, scope: scopeIdOf({ v: 1, kind, definition, creator: null, cause: textDigest("PUBLIC TEST journal address " + kind), ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(9)) });
const scope = ref("lane"), membership = ref("membership");
const identity: RequestActorIdentity = { origin: "https://journal.test", deployment: "PUBLIC TEST", scope, definition, membership, member: { membership, member: "@journal" }, publicKey };
const envelope = (kind: string): RequestEnvelope => ({ signed: signIntent({ v: 1, to: scope, actor: publicKey, kind, on: null, expected: {}, fields: {}, idempotencyKey: "PUBLIC-TEST-" + kind, notAfter: "2026-10-18T12:05:00Z" }, seed), grants: [], beside: {} });

test("the generic strict journal owns its configured act kinds and preserves exact signed bytes", () => {
  const kinds = ["borrow"], protocol = requestJournal(kinds), allowed = envelope("borrow");
  kinds.push("rules");
  expect(protocol.validEnvelope(allowed, identity)).toBe(true);
  expect(protocol.validEnvelope(envelope("rules"), identity)).toBe(false);
  expect(protocol.validEnvelope({ ...allowed, beside: { signed: envelope("rules").signed } }, identity)).toBe(false);
  expect(protocol.validEnvelope(allowed, { ...identity, scope: { ...scope, inc: newIncarnation(new Uint8Array(16).fill(10)) } })).toBe(false);
  const journal = markRequestAttempt(appendPreparedRequest(allowed), "inflight");
  expect(protocol.validJournal(journal, identity, allowed)).toBe(true);
  expect(protocol.requestBody(allowed)).toBe(JSON.stringify({ signed: allowed.signed, grants: [] }));
  const recorded = markRequestAttempt(journal, "recorded");
  expect(protocol.terminalJournal(recorded, identity, allowed)).toBe(false);
  expect(protocol.terminalJournal(recorded, identity, allowed, true)).toBe(true);
});
