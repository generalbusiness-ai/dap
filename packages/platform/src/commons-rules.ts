/** Rules14 retains the signed Commons requirement and relays it to Directory22. */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { isRecord } from "@generalbusiness/dap-bytes";
import type { Rules } from "@generalbusiness/dap-derive";
import { archiveDeviceRulesScope } from "./archive-binding.ts";
import { deviceApplicationRules } from "./device-application-rules.ts";

const installation = archiveDeviceRulesScope.items["installation"]!;
export const commonsRulesScope: PlatformData = { ...archiveDeviceRulesScope,
  items: { ...archiveDeviceRulesScope.items, installation: { ...installation,
    values: { ...installation.values, requirements: { fixed: true, required: true,
      of: { type: "record", of: {
        destination: { type: "bool", required: true },
        archive: { type: "bool", required: true },
        commons: { type: "bool", required: true },
      } },
    } },
  } },
};
export const commonsRules: Rules = { ...deviceApplicationRules,
  "application-stage-definitions": { place: "send", run: given => {
    const rule = deviceApplicationRules["application-stage-definitions"];
    if (!rule || rule.place !== "send") throw Error("Native application staging rule required");
    const request = rule.run(given);
    if (!request) return null;
    const body = request.message.class === "request" ? request.message.body : null;
    const fields = isRecord(body) ? body["fields"] : null;
    if (!isRecord(body) || !isRecord(fields) || !Number.isSafeInteger(fields["job"])) throw Error("Native installation staging fields required");
    const requirements = given.state.item(fields["job"] as number)?.values["requirements"];
    if (!isRecord(requirements) || typeof requirements["commons"] !== "boolean") throw Error("Retained Commons requirement required");
    return { ...request, message: { class: "request", type: "tell", body: { ...body,
      fields: { ...fields, needsCommons: requirements["commons"] },
    } } };
  } },
};
