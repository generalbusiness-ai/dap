/** Directory15 relays the exact Rules9 grant once, outside domain fields. */
import type { DeviceCommandGrant, PlatformData } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isRecord, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { readDeviceCommandGrant, type RuleGiven, type Rules } from "@generalbusiness/dap-derive";
import { directory11, directoryRules11 } from "./application-install-creation.ts";
import { directoryMembership } from "./directory.ts";
import { DEVICE_GRANT_BYTES } from "./device-application-wire.ts";

const create = directory11.receives["application-create"]!;
export const deviceApplicationDirectory: PlatformData = {
  ...directory11,
  receives: { ...directory11.receives, "application-create": { ...create,
    fields: { ...create.fields, deviceGrant: { type: "text", max: DEVICE_GRANT_BYTES, required: true } },
    guards: [...create.guards, { code: "device-install-grant", row: "G5a" }],
  } },
};

function grantOf(given: RuleGiven): DeviceCommandGrant | null {
  const raw = given.resolved.fields["deviceGrant"], membership = directoryMembership(given.state);
  if (typeof raw !== "string" || utf8(raw).length > DEVICE_GRANT_BYTES || !membership) return null;
  try {
    const value = parseStrict(raw), grant = readDeviceCommandGrant(value, membership);
    if (!grant || canonicalize(value) !== raw || grant.root !== given.resolved.fields["definition"]) return null;
    const catalog = given.state.page("application-catalog", ["retained"], null, 16).items.find(item => item.values["definition"] === grant.root);
    const declarations = catalog?.values["declarations"];
    if (!Array.isArray(declarations) || !grant.definitions.every(id => declarations.some(part => isRecord(part) && part["digest"] === id))) return null;
    return grant;
  } catch { return null; }
}

export const deviceApplicationDirectoryRules: Rules = {
  ...directoryRules11,
  "device-install-grant": { place: "guard", refusals: ["invalid-device-command-grant"], run: given => grantOf(given)
    ? { holds: true } : { holds: false, name: "invalid-device-command-grant" } },
  "create-installed-application": { place: "send", run: given => {
    const rule = directoryRules11["create-installed-application"];
    if (!rule || rule.place !== "send") throw Error("native application creation rule required");
    const request = rule.run(given), grant = grantOf(given);
    if (!request || !grant || !isDigest(given.resolved.fields["definition"]) || request.message.class !== "request" || !isRecord(request.message.body)) throw Error("checked device creation required");
    return { ...request, message: { ...request.message, body: { ...request.message.body,
      creationContext: { v: 2, deviceCommand: grant, delegate: true } } } };
  } },
};
