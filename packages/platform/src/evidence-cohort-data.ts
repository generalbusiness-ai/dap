/** New cohort wiring only. Earlier native data and defaults remain exact. */
import type { PlatformData, RulesObservation } from "@generalbusiness/dap-contract";
import type { Rules } from "@generalbusiness/dap-derive";
import { isDigest, isRecord, isSeed, same } from "@generalbusiness/dap-bytes";
import { archiveRegister, hardenedCertifiedRulesDirectory } from "./archive-binding.ts";
import { deviceApplicationDirectoryRules } from "./device-application-directory.ts";
import { EVIDENCE_RULES_COHORT } from "./evidence-cohort.ts";
import { definitionClosure, definitionDependencies } from "./definition-input.ts";
import { directoryRulesScope } from "./directory.ts";

export const evidenceRulesRegister = archiveRegister;
// Membership remains version 8. Child Rules/Destination pins are selected
// by the new exact directory identity, rather than by a changed old body.
const openPr = hardenedCertifiedRulesDirectory.acts["open-pr"]!;
export const evidenceRulesDirectory: PlatformData = { ...hardenedCertifiedRulesDirectory,
  acts: { ...hardenedCertifiedRulesDirectory.acts, "open-pr": { ...openPr,
    // Change4 creates Issue4: both declarations must have their own retained place.
    fields: { ...openPr.fields, dependency1: definitionDependencies["dependency1"]! },
  } },
};
export const evidenceRulesDirectoryRules: Rules = {
  ...deviceApplicationDirectoryRules,
  "definition-active": { place: "guard", refusals: ["not-activated", "unsupported-definition"], run: given => {
    const unavailable = { holds: null, reason: "dependency-unavailable" } as const;
    const digest = given.resolved.fields["definition"], rules = directoryRulesScope(given.state);
    const observation = given.observed({ asked: "definitions" })?.observation as RulesObservation | undefined;
    if (!isDigest(digest) || !rules || !observation || !same(observation.of, rules) || observation.content.asked !== "definitions") return unavailable;
    if (!observation.content.active.some(active => active.digest === digest)) return { holds: false, name: "not-activated" };
    // Use only the declared, digest-matched places. Unnamed caller values and
    // cached declarations cannot complete this creation's dependency closure.
    const checked = definitionClosure(given, "definition");
    if (checked.result === "unavailable") return unavailable;
    return checked.result === "ready" ? { holds: true } : { holds: false, name: "unsupported-definition", code: "unsupported-definition" };
  } },
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
