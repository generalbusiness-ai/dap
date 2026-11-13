import { expect, test } from "vitest";
import { b64url, canonicalize, scopeIdOf, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { CHECKER_KEY_LINK, DEVICE_KEY_LINK, checkerKeyInvitationOf, deviceKeyInvitationOf, encodeDeviceKeyInvitation, type DeviceKeyInvitation } from "../src/index.ts";

// Codec witness only. `original-copy.scope.test.ts` enrols a real second key with this link; encoding grants no authority.
test("device links are a closed tag that no other invitation's reader takes", () => {
  const ref = (kind: "directory" | "membership") => ({ scope: scopeIdOf({ v: 1, kind, definition: kind === "directory" ? "platform:directory@16" : "platform:membership@8", creator: null, cause: textDigest("SCRIPTED device link"), ordinal: 0 }), genesis: textDigest(`TEST genesis ${kind === "directory" ? 1 : 2}`) });
  const membership = ref("membership"), directory = ref("directory");
  const value: DeviceKeyInvitation = { v: 1, kind: "device-key", service: "https://devices.test", repository: { directory, membership, rules: directory.scope, destination: directory.scope }, definition: "platform:membership@8", handle: "@ana", invitation: { at: membership, seq: 4, hash: textDigest("SCRIPTED invitation") }, secret: b64url(new Uint8Array(32).fill(7)), expected: { on: 3, member: 2 } };
  const encoded = encodeDeviceKeyInvitation(value);
  expect(encoded).toBe(DEVICE_KEY_LINK + b64url(utf8(canonicalize(value))));
  expect(deviceKeyInvitationOf(encoded)).toEqual(value);
  expect(checkerKeyInvitationOf(CHECKER_KEY_LINK + encoded.slice(DEVICE_KEY_LINK.length))).toBeNull();
  expect(deviceKeyInvitationOf("artroom-invite:" + encoded.slice(DEVICE_KEY_LINK.length))).toBeNull();
  for (const bad of [
    { ...value, controller: { membership, member: "@founder" } },
    { ...value, kind: "checker-key" },
    { ...value, definition: "platform:register@21" },
    { ...value, service: "https://devices.test/path" },
    { ...value, invitation: { ...value.invitation, at: { ...membership, genesis: textDigest("TEST genesis 20") } } },
    { ...value, secret: b64url(new Uint8Array(31)) },
    { ...value, expected: { on: 0, member: 2 } },
  ]) {
    expect(deviceKeyInvitationOf(DEVICE_KEY_LINK + b64url(utf8(canonicalize(bad))))).toBeNull();
    expect(() => encodeDeviceKeyInvitation(bad as DeviceKeyInvitation)).toThrow("not valid");
  }
});
