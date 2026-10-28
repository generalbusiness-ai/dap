/** New cohort wiring only. Earlier native data and defaults remain exact. */
import type { Rules } from "@generalbusiness/dap-derive";
import { isRecord, isSeed } from "@generalbusiness/dap-bytes";
import { archiveRegister, hardenedCertifiedRulesDirectory } from "./archive-binding.ts";
import { deviceApplicationDirectoryRules } from "./device-application-directory.ts";
import { EVIDENCE_RULES_COHORT } from "./evidence-cohort.ts";

export const evidenceRulesRegister = archiveRegister;
// Membership remains version 8. Child Rules/Destination pins are selected
// by the new exact directory identity, rather than by a changed old body.
export const evidenceRulesDirectory = hardenedCertifiedRulesDirectory;
export const evidenceRulesDirectoryRules: Rules = {
  ...deviceApplicationDirectoryRules,
  "create-rules": { place: "send", run: given => {
    const rule = deviceApplicationDirectoryRules["create-rules"];
    if (!rule || rule.place !== "send") throw Error("native rules creation rule required");
    const request = rule.run(given);
    if (!request || !isSeed(request.to) || request.to.definition !== EVIDENCE_RULES_COHORT.rules
      || request.message.class !== "request" || request.message.type !== "create"
      || !isRecord(request.message.body) || !isRecord(request.message.body["fields"])) {
      throw Error("evidence rules sibling creation required");
    }
    return { ...request, message: { ...request.message, body: { ...request.message.body,
      fields: { ...request.message.body["fields"], ownerMayReview: false } } } };
  } },
};
