import { expect, test } from "vitest";
import { b64url, scopeIdOf, textDigest, utf8, canonicalize } from "@generalbusiness/dap-bytes";
import { AGENT_KEY_LINK, CHECKER_KEY_LINK, agentKeyInvitationOf, checkerKeyInvitationOf, encodeCheckerKeyInvitation, type CheckerKeyInvitation } from "../src/index.ts";

// Codec witness only. Native authority and independent checker keys have a
// separate native membership witness; encoding grants no authority.
test.each([{ definition: "platform:membership@8", directory: "platform:directory@16" }, { definition: "platform:membership@12", directory: "platform:directory@25" }] as const)("checker links on $definition cannot carry an agent controller or change handoff kind", pins => {
  const ref = (kind: "directory" | "membership") => ({ scope: scopeIdOf({ v: 1, kind, definition: kind === "directory" ? pins.directory : pins.definition, creator: null, cause: textDigest("SCRIPTED checker codec " + kind), ordinal: 0 }), genesis: textDigest("TEST genesis 19") });
  const membership = ref("membership"), directory = ref("directory");
  const value: CheckerKeyInvitation = { v: 1, kind: "checker-key", service: "https://checkers.test", repository: { directory, membership, rules: directory.scope, destination: directory.scope }, definition: pins.definition, handle: "@checker", member: { at: membership, seq: 4, hash: textDigest("SCRIPTED checker member") }, invitation: { at: membership, seq: 6, hash: textDigest("SCRIPTED checker invitation") }, secret: b64url(new Uint8Array(32).fill(12)), expected: { on: 1, member: 5 } };
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
    { ...value, definition: "platform:membership@10" },
    { ...value, definition: "platform:membership@11" },
    { ...value, definition: "platform:membership@13" },
    { ...value, kind: "agent-key" },
    { ...value, invitation: { ...value.invitation, at: { ...membership, genesis: textDigest("TEST genesis 20") } } },
    { ...value, secret: b64url(new Uint8Array(31)) },
  ]) {
    expect(checkerKeyInvitationOf(CHECKER_KEY_LINK + b64url(utf8(canonicalize(bad))))).toBeNull();
    expect(() => encodeCheckerKeyInvitation(bad as CheckerKeyInvitation)).toThrow("not valid");
  }
  expect(checkerKeyInvitationOf(CHECKER_KEY_LINK + "a".repeat(16 * 1024))).toBeNull();
});
