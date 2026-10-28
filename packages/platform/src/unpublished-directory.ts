/** Directory20 keeps the room control item while its repository value is absent. */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { isRecord } from "@generalbusiness/dap-bytes";
import type { Rules } from "@generalbusiness/dap-derive";
import { archiveDeviceDirectory } from "./archive-binding.ts";
import { deviceApplicationDirectoryRules } from "./device-application-directory.ts";

const repository = archiveDeviceDirectory.items["repository"]!, establish = archiveDeviceDirectory.acts["establish"]!;
const bind = archiveDeviceDirectory.acts["bind-archive"]!;
export const unpublishedDirectory: PlatformData = {
  ...archiveDeviceDirectory,
  items: { ...archiveDeviceDirectory.items, repository: { ...repository,
    values: { ...repository.values, repository: { ...repository.values["repository"]!, required: false } } } },
  acts: { ...archiveDeviceDirectory.acts,
    establish: { ...establish, fields: { ...establish.fields, repository: { ...establish.fields["repository"]!, required: false } } },
    "bind-archive": { ...bind, guards: [{ code: "has-repository", row: "G1" }, ...bind.guards] },
  },
};
export const unpublishedDirectoryRules: Rules = {
  ...deviceApplicationDirectoryRules,
  "has-repository": { place: "guard", refusals: ["no-repository"], run: given => {
    const held = given.state.item(given.resolved.self);
    return held?.values["repository"] == null ? { holds: false, name: "no-repository" } : { holds: true };
  } },
  "create-destination": { place: "send", run: given => {
    const rule = deviceApplicationDirectoryRules["create-destination"];
    if (!rule || rule.place !== "send") throw Error("Native destination creation rule required");
    const request = rule.run(given);
    if (!request || !isRecord(request.message.body) || !isRecord(request.message.body["fields"])) throw Error("Native destination creation fields required");
    const { repository: value, ...fields } = request.message.body["fields"];
    return { ...request, message: { ...request.message, body: { ...request.message.body,
      fields: value === undefined ? fields : { ...fields, repository: value } } } };
  } },
};
