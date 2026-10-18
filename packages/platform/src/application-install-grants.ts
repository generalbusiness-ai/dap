/** Checked M1 role-addition route: Rules -> its Directory -> its Membership.
 * Membership unions only the selected defaults and sends a native answer.
 * No caller key, application name, or bare scope id substitutes for a pinned
 * sibling reference. Existing cohorts retain their previous definitions. */
import type { FieldValue, PlatformData, ScopeRef } from "@generalbusiness/dap-contract";
import { isScopeRef } from "@generalbusiness/artroom-bytes";
import type { RuleGiven, RuleRequest, Rules } from "@generalbusiness/dap-derive";
import { directory8, directoryRules8 } from "./application.ts";
import { membership6, membershipRules6 } from "./invitation-key.ts";
import { ROLE_LISTS, isActions, type Role } from "./membership.ts";
import { directoryMembership, directoryRulesScope } from "./directory.ts";
import { INSTALL_ROLE_NAMES, TRUSTED_APPLICATION_COHORT, installGrantFields, readInstallAdditions } from "./application-install-wire.ts";

const repository = { repository: { item: "repository", one: true } } as const;
function ref(given: RuleGiven, kind: "membership" | "destination" | "rules"): ScopeRef | null {
  const held = given.state.page("repository", ["open"], null, 1).items[0]?.refs[kind];
  return isScopeRef(held) && held.kind === kind ? held : null;
}
const fieldsOf = (given: RuleGiven) => Object.fromEntries(Object.keys(installGrantFields).map(key => [key, given.resolved.fields[key]]));
const tell = (to: ScopeRef, message: string, fields: unknown): RuleRequest => ({ to, message: { class: "request", type: "tell", body: { message, fields } } });
const establish = directory8.acts["establish"]!;
export const directory11: PlatformData = {
  ...directory8,
  acts: { ...directory8.acts, establish: { ...establish, sends: establish.sends.map(send => "create" in send && send.create.kind === "membership"
    ? { create: { ...send.create, definition: TRUSTED_APPLICATION_COHORT.membership } } : send) } },
  receives: { ...directory8.receives, "application-grants": {
    message: "application-grants", class: "tell", from: { kind: "rules", under: "platform:rules" }, opens: null, also: repository,
    fields: installGrantFields,
    guards: [{ equals: { a: { sender: true }, b: { slot: "rules", of: "also.repository" } }, reason: "not-the-rules" },
      { code: "install-room-ready", row: "M1" }], effects: [],
    sends: [{ code: "install-room-context", row: "M1", always: true, result: {} }, { code: "install-forward-grants", row: "M1", always: true, result: {} }], attention: [],
  } },
};
export const directoryRules11: Rules = {
  ...directoryRules8,
  "install-room-ready": { place: "guard", refusals: ["invalid-install-additions"], run: given => {
    if (!readInstallAdditions(given.resolved.fields["additions"])) return { holds: false, name: "invalid-install-additions" };
    return ref(given, "rules") && ref(given, "membership") && ref(given, "destination") ? { holds: true } : { holds: null, reason: "dependency-unavailable" };
  } },
  "install-room-context": { place: "send", run: given => tell(ref(given, "rules")!, "application-context", {
    ...fieldsOf(given), membership: ref(given, "membership"), destination: ref(given, "destination"),
  }) },
  "install-forward-grants": { place: "send", run: given => tell(ref(given, "membership")!, "application-grants", { ...fieldsOf(given), rules: ref(given, "rules") }) },
};
export const membership7: PlatformData = {
  ...membership6,
  receives: { ...membership6.receives, "application-grants": {
    message: "application-grants", class: "tell", from: { kind: "directory", under: "platform:directory" }, opens: null,
    also: { roster: { item: "roster", one: true } },
    fields: { ...installGrantFields, rules: { type: "scope", kind: "rules", required: true } },
    guards: [{ equals: { a: { sender: true }, b: { slot: "directory", of: "also.roster" } }, reason: "not-the-directory" },
      { code: "install-additions-form", row: "M1" }], effects: [{ code: "install-add-role-actions", row: "M1" }],
    sends: [{ code: "install-grant-answer", row: "M1", result: {} }], attention: [],
  } },
};
function additions(given: RuleGiven): Partial<Record<Role, readonly string[]>> | null {
  const wanted = readInstallAdditions(given.resolved.fields["additions"]);
  const roster = given.resolved.subjects.get("also.roster");
  if (!wanted || !roster) throw Error("checked role additions and roster required");
  const result: Partial<Record<Role, readonly string[]>> = {};
  for (const role of INSTALL_ROLE_NAMES) {
    if (!Object.hasOwn(wanted, role)) continue;
    const current = roster.values[ROLE_LISTS[role]];
    if (!isActions(current)) throw Error("native role list required");
    const union = [...new Set([...current, ...wanted[role]!])];
    if (!isActions(union)) return null;
    result[role] = union;
  }
  return result;
}
export const membershipRules7: Rules = {
  ...membershipRules6,
  "install-additions-form": { place: "guard", refusals: ["invalid-install-additions"], run: given => readInstallAdditions(given.resolved.fields["additions"])
    ? { holds: true } : { holds: false, name: "invalid-install-additions" } },
  "install-add-role-actions": { place: "effect", most: 5, run: given => {
    const next = additions(given), roster = given.resolved.subjects.get("also.roster")!;
    return next === null ? [] : Object.entries(next).map(([role, actions]) => ({ effect: "value", item: roster.id, slot: ROLE_LISTS[role as Role], value: [...actions] as FieldValue }));
  } },
  "install-grant-answer": { place: "send", run: given => {
    const next = additions(given), rules = given.resolved.fields["rules"];
    if (!isScopeRef(rules)) throw Error("checked rules reference required");
    return tell(rules, "application-grant-result", { ...fieldsOf(given), result: next === null ? "refused" : "confirmed", reason: next === null ? "role-actions-full" : "granted" });
  } },
};
// These readers remain the native sibling readers of the inherited factory.
export { directoryMembership, directoryRulesScope };
