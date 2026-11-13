/**
 * Rules 15 of the `base` family (rulings 710a5d76 and 68356c6c, point 4).
 * It is Rules 10, with its typed archive requirements and its device owner
 * relay, and it admits four capability sets: none, `publication-paths@1`,
 * `device-command@1`, and both. An ordinary package names no owner and gets
 * no device grant. A device package names an active owner, as under
 * Rules 10. The installation keeps the declared prefixes, and the creation
 * request carries them to the Directory.
 *
 * Reference fields stay refused: `requireReferenceInstall` admits them only
 * under the Commons Rules pin, by name, and this pin is not that one.
 */
import { DEVICE_COMMAND, type MemberObservation, type PlatformData } from "@generalbusiness/dap-contract";
import { canonicalize, isMemberRef, isRecord, parseStrict, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { observedOf, same, type GuardRule, type RuleGiven, type Rules } from "@generalbusiness/dap-derive";
import { readApplicationReleaseUri } from "./application-codec/application.ts";
import type { PublishedApplicationReleaseProof2 } from "./application-codec/application-v2.ts";
import { REFERENCE_INSTALL_REFUSAL, ReferenceInstallRefusal } from "./application-install-reference.ts";
import { readInstallAdditions } from "./application-install-wire.ts";
import { applicationInstallRules } from "./application-install.ts";
import { archiveDeviceRules, archiveDeviceRulesScope } from "./archive-binding.ts";
import { initialFields, installProof2 } from "./device-application-rules.ts";
import { DEVICE_GENESIS_BYTES, DEVICE_GRANT_BYTES } from "./device-application-wire.ts";
import { applicationCapabilities, type ApplicationCapabilities } from "./publication-paths.ts";
import { rulesMembership } from "./rules-scope.ts";

const install = archiveDeviceRulesScope.acts["install-application"]!;
export const baseRulesScope: PlatformData = {
  ...archiveDeviceRulesScope,
  acts: { ...archiveDeviceRulesScope.acts, "install-application": { ...install,
    fields: { ...install.fields, owner: { type: "member", required: false } } } },
};

const proof = (given: RuleGiven) => installProof2(given, semantic => applicationCapabilities(semantic) !== null);
const capabilities = (checked: PublishedApplicationReleaseProof2): ApplicationCapabilities => {
  const held = applicationCapabilities(checked.semantic);
  if (!held) throw Error("admitted capability set required");
  return held;
};

/** The genesis that the installation keeps: the root's fields, a device grant for a device package, and the declared prefixes. */
function installedGenesis(given: RuleGiven, checked: PublishedApplicationReleaseProof2) {
  const held = capabilities(checked), owner = given.resolved.fields["owner"], fields = initialFields(given, checked);
  if (!fields) return null;
  if (held.device ? !isMemberRef(owner) : owner !== undefined) return null;
  const deviceGrant = held.device && isMemberRef(owner)
    ? { capability: DEVICE_COMMAND, owner, bounds: held.device.bounds, root: checked.semantic.entry, definitions: held.device.definitions } : null;
  return { fields: fields.fields, needsDestination: fields.needsDestination, deviceGrant, publication: held.publication };
}
const genesisText = (held: NonNullable<ReturnType<typeof installedGenesis>>): string => canonicalize({ fields: held.fields,
  ...(held.deviceGrant ? { deviceGrant: held.deviceGrant } : {}), ...(held.publication ? { publication: held.publication } : {}) });

const invalid = { holds: false, name: "invalid-application-package", code: "bad-field" } as const;
export const baseRules: Rules = {
  ...archiveDeviceRules,
  /** An ordinary package names no owner, so no owner's standing is read. */
  "device-owner-standing": { place: "guard", refusals: ["device-owner-not-active"], run: given => {
    const owner = given.resolved.fields["owner"], membership = rulesMembership(given.state);
    const refused = { holds: false, name: "device-owner-not-active" } as const;
    if (owner === undefined) return { holds: true };
    if (!isMemberRef(owner) || !membership || !observedOf(owner.membership, membership)) return refused;
    const observation = given.observed({ member: owner.member })?.observation as MemberObservation | undefined;
    if (!observation || !same(observation.of, owner.membership)) return { holds: null, reason: "dependency-unavailable" };
    return observation.memberState === "active" && observation.activeKey === true
      && (observation.controller === null || observation.controllerActive === true) ? { holds: true } : refused;
  } },
  "application-install-proof": { place: "guard", refusals: ["invalid-application-package", REFERENCE_INSTALL_REFUSAL], run: (given): ReturnType<GuardRule> => {
    try {
      readApplicationReleaseUri(given.resolved.fields["uri"]);
      const checked = proof(given); if (!checked) return { holds: null, reason: "dependency-unavailable" };
      const selected = given.resolved.fields["roles"], raw = given.resolved.fields["values"];
      if (!Array.isArray(selected) || new Set(selected).size !== selected.length || selected.some(role => typeof role !== "string" || !Object.hasOwn(checked.semantic.roles, role)) || typeof raw !== "string") return invalid;
      const values = parseStrict(raw);
      if (!isRecord(values) || canonicalize(values) !== raw || Object.hasOwn(values, "opener") || Object.hasOwn(values, "destination")) return invalid;
      if (!readInstallAdditions(canonicalize(Object.fromEntries(selected.map(role => [role, checked.semantic.roles[role as string]]))))) return invalid;
      const held = installedGenesis(given, checked);
      if (!held || (held.deviceGrant && utf8(canonicalize(held.deviceGrant)).length > DEVICE_GRANT_BYTES)
        || utf8(genesisText(held)).length > DEVICE_GENESIS_BYTES) return invalid;
      return { holds: true };
    } catch (error) {
      return error instanceof ReferenceInstallRefusal ? { holds: false, name: REFERENCE_INSTALL_REFUSAL, code: "bad-field" } : invalid;
    }
  } },
  "application-install-identities": { place: "effect", most: 7, run: given => {
    const checked = proof(given); if (!checked) throw Error("validated install retains its v2 proof");
    const held = installedGenesis(given, checked); if (!held) throw Error("validated genesis required");
    const selected = given.resolved.fields["roles"] as readonly string[];
    const additions = canonicalize(Object.fromEntries(selected.map(role => [role, checked.semantic.roles[role]])));
    if (!readInstallAdditions(additions)) throw Error("validated default-role additions required");
    return [
      { effect: "value", item: given.resolved.self, slot: "declarations", value: checked.semantic.definitions.map(part => ({ digest: part.id, text: textDigest(part.bytes), name: (parseStrict(part.bytes) as { name: string }).name })) },
      { effect: "value", item: given.resolved.self, slot: "additions", value: additions },
      { effect: "value", item: given.resolved.self, slot: "requirements", value: { destination: held.needsDestination, archive: checked.semantic.host.requires?.includes("archive") === true } },
      { effect: "value", item: given.resolved.self, slot: "genesis", value: genesisText(held) },
      { effect: "value", item: given.resolved.self, slot: "definition", value: checked.semantic.entry },
      { effect: "value", item: given.resolved.self, slot: "presentation", value: checked.ids.presentation },
      { effect: "value", item: given.resolved.self, slot: "publisher", value: checked.release.manifest.publisher },
    ];
  } },
  /** The Directory receives the root's fields, and the device grant and prefixes outside them. */
  "application-request-creation": { place: "send", run: given => {
    const rule = applicationInstallRules["application-request-creation"];
    if (!rule || rule.place !== "send") throw Error("native creation rule required");
    const request = rule.run(given);
    if (!request) return null;
    const raw = given.resolved.subjects.get("also.installation")?.values["genesis"];
    const genesis = typeof raw === "string" ? parseStrict(raw) : null;
    if (request.message.class !== "request" || !isRecord(request.message.body) || !isRecord(request.message.body["fields"]) || !isRecord(genesis)
      || !isRecord(genesis["fields"])) throw Error("native installation required");
    return { ...request, message: { ...request.message, body: { ...request.message.body, fields: { ...request.message.body["fields"],
      genesis: canonicalize(genesis["fields"]),
      ...(isRecord(genesis["deviceGrant"]) ? { deviceGrant: canonicalize(genesis["deviceGrant"]) } : {}),
      ...(Array.isArray(genesis["publication"]) ? { publication: canonicalize(genesis["publication"]) } : {}) } } } };
  } },
};
