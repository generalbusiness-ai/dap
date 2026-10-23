/** Explicit device-command package proof under Rules9. Older pins keep their proofs. */
import type { DeclaredDefinition, FieldValue, MemberObservation, PlatformData } from "@generalbusiness/dap-contract";
import { DEVICE_COMMAND } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isMemberRef, isRecord, parseStrict, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { readApplicationReleaseUri } from "@generalbusiness/dap-bytes/application";
import { readPublishedApplicationReleaseProof2, type PublishedApplicationReleaseProof2 } from "@generalbusiness/dap-bytes/application-v2";
import { same, validateDefinition, type GuardRule, type RuleGiven, type Rules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { applicationInstallRulesScope, applicationInstallRules } from "./application-install.ts";
import { INSTALL_DEFINITION_BYTES, INSTALL_DEFINITIONS, readInstallAdditions } from "./application-install-wire.ts";
import { applicationValues } from "./application.ts";
import { rulesMembership } from "./rules-scope.ts";
import { deviceApplicationRequirement } from "./device-application-package.ts";
import { ARCHIVE_DEVICE_APPLICATION_COHORT } from "./archive-binding-wire.ts";
import { pinnedBy } from "./versions.ts";
import { DEVICE_GENESIS_BYTES, DEVICE_GRANT_BYTES } from "./device-application-wire.ts";

import { APPLICATION_SEMANTIC_VALUE2, APPLICATION_RELEASE_VALUE2 } from "./application-install-v2.ts";
const archiveInstall = (given: RuleGiven): boolean => pinnedBy(given) === ARCHIVE_DEVICE_APPLICATION_COHORT.rules;
const install = applicationInstallRulesScope.acts["install-application"]!;
export const deviceApplicationRulesScope: PlatformData = {
  ...applicationInstallRulesScope,
  items: { ...applicationInstallRulesScope.items, installation: { ...applicationInstallRulesScope.items["installation"]!,
    values: { ...applicationInstallRulesScope.items["installation"]!.values, genesis: { fixed: true, required: true, of: { type: "text", max: DEVICE_GENESIS_BYTES } } },
  } },
  acts: { ...applicationInstallRulesScope.acts, "install-application": { ...install, observes: [{ of: "member", from: { field: "owner" }, max: 1, window: 300, use: "reuse" }],
    guards: [...install.guards, { code: "device-owner-standing", row: "G5a" }], fields: { ...install.fields, owner: { type: "member", required: true },
    semantic: { type: "digest", required: true, value: APPLICATION_SEMANTIC_VALUE2 },
    release: { type: "digest", required: true, value: APPLICATION_RELEASE_VALUE2 },
  } } },
};
function proof(given: RuleGiven): PublishedApplicationReleaseProof2 | null {
  const fields = given.resolved.fields;
  if (!isDigest(fields["semantic"]) || !isDigest(fields["release"])) throw Error("install proof digests required");
  const semantic = given.value(APPLICATION_SEMANTIC_VALUE2.domain, fields["semantic"], APPLICATION_SEMANTIC_VALUE2.max);
  const release = given.value(APPLICATION_RELEASE_VALUE2.domain, fields["release"], APPLICATION_RELEASE_VALUE2.max);
  if (semantic === undefined || release === undefined) return null;
  const checked = readPublishedApplicationReleaseProof2(semantic, release, fields["release"], { bytes: APPLICATION_SEMANTIC_VALUE2.max + APPLICATION_RELEASE_VALUE2.max });
  if (checked.ids.semantic !== fields["semantic"] || !deviceApplicationRequirement(checked.semantic) || (!archiveInstall(given) && checked.semantic.host.requires !== undefined) || checked.semantic.host.profiles.some(profile => profile !== "restricted@1")) throw Error("unsupported install proof");
  for (let index = 0; index < checked.semantic.definitions.length; index++) {
    const part = checked.semantic.definitions[index]!;
    if (utf8(part.bytes).length > INSTALL_DEFINITION_BYTES || fields[`definitionText${index}`] !== textDigest(part.bytes)) throw Error("exact native declaration text required");
    const value = parseStrict(part.bytes), native = validateDefinition(value, given.resolved.bounds, RULE_PROFILES);
    if (!native.ok || native.definition.digest !== part.id || canonicalize(value) !== part.bytes) throw Error("unsupported native definition");
  }
  for (let index = checked.semantic.definitions.length; index < INSTALL_DEFINITIONS; index++) if (fields[`definitionText${index}`] !== undefined) throw Error("unrelated declaration text");
  return checked;
}
function initialFields(given: RuleGiven, checked: PublishedApplicationReleaseProof2): { fields: Record<string, FieldValue>; needsDestination: boolean } | null {
  const signer = given.resolved.signer;
  if (!signer) return null;
  const root = parseStrict(checked.semantic.definitions.find(part => part.id === checked.semantic.entry)!.bytes) as DeclaredDefinition;
  const genesis = root.acts[root.genesis]!, { destination, ...fields } = genesis.fields;
  if (destination && (destination.type !== "scope" || destination.kind !== "destination")) return null;
  const admitted = applicationValues(given.resolved.fields["values"], { ...root, acts: { ...root.acts, [root.genesis]: { ...genesis, fields } } }, signer.member, given.resolved.bounds);
  return admitted ? { fields: admitted, needsDestination: destination !== undefined } : null;
}
function deviceGrant(given: RuleGiven, checked: PublishedApplicationReleaseProof2) {
  const owner = given.resolved.fields["owner"], requirement = deviceApplicationRequirement(checked.semantic);
  if (!isMemberRef(owner) || !requirement) throw Error("device owner and finite package requirement required");
  return { capability: DEVICE_COMMAND, owner, bounds: requirement.bounds, root: checked.semantic.entry, definitions: requirement.definitions };
}
const invalid = { holds: false, name: "invalid-application-package", code: "bad-field" } as const;
export const deviceApplicationRules: Rules = {
  ...applicationInstallRules,
  "device-owner-standing": { place: "guard", refusals: ["device-owner-not-active"], run: given => {
    const owner = given.resolved.fields["owner"], membership = rulesMembership(given.state);
    const refused = { holds: false, name: "device-owner-not-active" } as const;
    if (!isMemberRef(owner) || !membership || membership.scope !== owner.membership.scope || membership.kind !== "membership"
      || membership.inc !== null && membership.inc !== owner.membership.inc) return refused;
    const observation = given.observed({ member: owner.member })?.observation as MemberObservation | undefined;
    if (!observation || !same(observation.of, owner.membership)) return { holds: null, reason: "dependency-unavailable" };
    return observation.memberState === "active" && observation.activeKey === true
      && (observation.controller === null || observation.controllerActive === true) ? { holds: true } : refused;
  } },
  "application-request-creation": { place: "send", run: given => {
    const rule = applicationInstallRules["application-request-creation"];
    if (!rule || rule.place !== "send") throw Error("native creation rule required");
    const request = rule.run(given);
    if (!request) return null;
    const job = given.resolved.subjects.get("also.installation");
    const raw = job?.values["genesis"];
    const genesis = typeof raw === "string" ? parseStrict(raw) : null;
    if (request.message.class !== "request" || !isRecord(request.message.body) || !isRecord(request.message.body["fields"]) || !isRecord(genesis)
      || !isRecord(genesis["fields"]) || !isRecord(genesis["deviceGrant"])) throw Error("native device installation required");
    return { ...request, message: { ...request.message, body: { ...request.message.body,
      fields: { ...request.message.body["fields"], genesis: canonicalize(genesis["fields"]), deviceGrant: canonicalize(genesis["deviceGrant"]) } } } };
  } },
  "application-install-proof": { place: "guard", refusals: ["invalid-application-package"], run: (given): ReturnType<GuardRule> => {
    try {
      readApplicationReleaseUri(given.resolved.fields["uri"]);
      const checked = proof(given); if (!checked) return { holds: null, reason: "dependency-unavailable" };
      const selected = given.resolved.fields["roles"], raw = given.resolved.fields["values"];
      if (!Array.isArray(selected) || new Set(selected).size !== selected.length || selected.some(role => typeof role !== "string" || !Object.hasOwn(checked.semantic.roles, role)) || typeof raw !== "string") return invalid;
      const values = parseStrict(raw);
      if (!isRecord(values) || canonicalize(values) !== raw || Object.hasOwn(values, "opener") || Object.hasOwn(values, "destination")) return invalid;
      if (!readInstallAdditions(canonicalize(Object.fromEntries(selected.map(role => [role, checked.semantic.roles[role as string]])))) || !initialFields(given, checked)) return invalid;
      if (utf8(canonicalize(deviceGrant(given, checked))).length > DEVICE_GRANT_BYTES
        || utf8(canonicalize({ fields: initialFields(given, checked)!.fields, deviceGrant: deviceGrant(given, checked) })).length > DEVICE_GENESIS_BYTES) return invalid;
      return { holds: true };
    } catch { return invalid; }
  } },
  "application-install-identities": { place: "effect", most: 7, run: given => {
    const checked = proof(given); if (!checked) throw Error("validated install retains its v2 proof");
    const genesis = initialFields(given, checked); if (!genesis) throw Error("validated genesis fields required");
    const selected = given.resolved.fields["roles"] as readonly string[];
    const additions = canonicalize(Object.fromEntries(selected.map(role => [role, checked.semantic.roles[role]])));
    if (!readInstallAdditions(additions)) throw Error("validated default-role additions required");
    return [
      { effect: "value", item: given.resolved.self, slot: "declarations", value: checked.semantic.definitions.map(part => ({ digest: part.id, text: textDigest(part.bytes), name: (parseStrict(part.bytes) as DeclaredDefinition).name })) },
      { effect: "value", item: given.resolved.self, slot: "additions", value: additions },
      { effect: "value", item: given.resolved.self, slot: archiveInstall(given) ? "requirements" : "needsDestination", value: archiveInstall(given) ? { destination: genesis.needsDestination, archive: checked.semantic.host.requires?.includes("archive") === true } : genesis.needsDestination },
      { effect: "value", item: given.resolved.self, slot: "genesis", value: canonicalize({ fields: genesis.fields, deviceGrant: deviceGrant(given, checked) }) },
      { effect: "value", item: given.resolved.self, slot: "definition", value: checked.semantic.entry },
      { effect: "value", item: given.resolved.self, slot: "presentation", value: checked.ids.presentation },
      { effect: "value", item: given.resolved.self, slot: "publisher", value: checked.release.manifest.publisher },
    ];
  } },
};
