import { expect, test } from "vitest";
import { b64url, newIncarnation, scopeIdOf, textDigest, utf8, canonicalize } from "@generalbusiness/dap-bytes";
import { AGENT_KEY_LINK, CHECKER_KEY_LINK, agentKeyInvitationOf, checkerKeyInvitationOf, encodeCheckerKeyInvitation, type CheckerKeyInvitation } from "../src/index.ts";

// Codec witness only. Native authority and independent checker keys have a
// separate Membership8 witness; encoding grants no authority.
test("checker links require exact Membership8 context and cannot carry an agent controller or change handoff kind", () => {
  const ref = (kind: "directory" | "membership") => ({ kind, scope: scopeIdOf({ v: 1, kind, definition: kind === "directory" ? "platform:directory@16" : "platform:membership@8", creator: null, cause: textDigest("SCRIPTED checker codec " + kind), ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(19)) });
  const membership = ref("membership"), directory = ref("directory");
  const value: CheckerKeyInvitation = { v: 1, kind: "checker-key", service: "https://checkers.test", repository: { directory, membership, rules: directory.scope, destination: directory.scope }, definition: "platform:membership@8", handle: "@checker", member: { at: membership, seq: 4, hash: textDigest("SCRIPTED checker member") }, invitation: { at: membership, seq: 6, hash: textDigest("SCRIPTED checker invitation") }, secret: b64url(new Uint8Array(32).fill(12)), expected: { on: 1, member: 5 } };
  const encoded = encodeCheckerKeyInvitation(value);
  expect(encoded).toBe(CHECKER_KEY_LINK + b64url(utf8(canonicalize(value))));
  expect(checkerKeyInvitationOf(encoded)).toEqual(value);
  expect(agentKeyInvitationOf(encoded)).toBeNull();
  expect(agentKeyInvitationOf(AGENT_KEY_LINK + encoded.slice(CHECKER_KEY_LINK.length))).toBeNull();
  expect(checkerKeyInvitationOf("artroom-invite:" + encoded.slice(CHECKER_KEY_LINK.length))).toBeNull();
  for (const bad of [
    { ...value, controller: { membership, member: "@founder" } },
    { ...value, signingKey: "never a handoff" },
    { ...value, definition: "platform:membership@7" },
    { ...value, kind: "agent-key" },
    { ...value, invitation: { ...value.invitation, at: { ...membership, inc: newIncarnation(new Uint8Array(16).fill(20)) } } },
    { ...value, secret: b64url(new Uint8Array(31)) },
  ]) {
    expect(checkerKeyInvitationOf(CHECKER_KEY_LINK + b64url(utf8(canonicalize(bad))))).toBeNull();
    expect(() => encodeCheckerKeyInvitation(bad as CheckerKeyInvitation)).toThrow("not valid");
  }
  expect(checkerKeyInvitationOf(CHECKER_KEY_LINK + "a".repeat(16 * 1024))).toBeNull();
});
