/** Destination16 records an unpublished branch and refuses repository work. */
import type { PlatformData, ScopeId } from "@generalbusiness/dap-contract";
import type { Item, RecordedRef, Rules, StateView } from "@generalbusiness/dap-derive";
import { destination4, destinationRules4 } from "./destination.ts";
import { destinationV14, destinationRulesV14 } from "./destination-v14.ts";
import { RULES_CERTIFICATE_KIND } from "./rules-certificate.ts";
import { referenceOf } from "./rules-scope.ts";

/** Destination16 also retains its sibling references before publication. */
export const unpublishedDestinationBranch = (state: Pick<StateView, "page">): Item | null => {
  const branch = state.page("branch", ["unpublished", "empty", "ready"], null, 1).items[0] ?? null;
  // Preserve the inherited representation of heterogeneous item references.
  return branch && Object.hasOwn(branch.values, "slot") ? { ...branch, refs: { ...branch.refs, slot: branch.values["slot"] ?? null, judging: branch.values["judging"] ?? null } } : branch;
};
const heldId = (state: Pick<StateView, "page">, slot: "membership" | "rules"): ScopeId | null => {
  const id = unpublishedDestinationBranch(state)?.values[slot];
  return typeof id === "string" ? (id as ScopeId) : null;
};
export const unpublishedDestinationMembership = (state: Pick<StateView, "page" | "incarnations">): RecordedRef | null => referenceOf(state, heldId(state, "membership"), "membership");
export const unpublishedDestinationRulesScope = (state: Pick<StateView, "page" | "incarnations">): RecordedRef | null => referenceOf(state, heldId(state, "rules"), "rules");

const branch = destination4.items["branch"]!, establish = destination4.acts["establish"]!;
const certificate = destinationV14.acts[RULES_CERTIFICATE_KIND]!;
const guarded = { code: "has-repository", row: "G1" } as const;
export const unpublishedDestination: PlatformData = {
  ...destination4,
  items: { ...destination4.items, branch: { ...branch,
    states: { ...branch.states, unpublished: { final: false } },
    values: { ...branch.values, repository: { ...branch.values["repository"]!, required: false },
      rulesCertificateRequest: destinationV14.items["branch"]!.values["rulesCertificateRequest"]! } } },
  acts: Object.fromEntries(Object.entries({ ...destination4.acts, [RULES_CERTIFICATE_KIND]: certificate }).map(([name, act]) => [name,
    name === "establish" ? { ...establish, fields: { ...establish.fields, repository: { ...establish.fields["repository"]!, required: false } } }
      : { ...act, guards: [guarded, ...act.guards] }])),
  receives: Object.fromEntries(Object.entries(destination4.receives).map(([name, handler]) => [name,
    { ...handler, guards: [guarded, ...handler.guards] }])),
  outcomes: { ...destination4.outcomes, [RULES_CERTIFICATE_KIND]: destinationV14.outcomes[RULES_CERTIFICATE_KIND]! },
};
export const unpublishedDestinationRules: Rules = {
  ...destinationRules4,
  // Rules10 does not demand certificates. Keep the named repository act and
  // its established request checks without changing ordinary publication.
  ...Object.fromEntries(Object.entries(destinationRulesV14).filter(([name]) => [
    "rules-certificate-binding-v14", "rules-certificate-request-v14", "rules-certificate-open-v14", "rules-certificate-outcome-v14",
  ].includes(name))),
  "has-repository": { place: "guard", refusals: ["no-repository"], run: given => {
    const held = given.state.page("branch", ["unpublished", "empty", "ready"], null, 1).items[0];
    return held?.values["repository"] == null ? { holds: false, name: "no-repository" } : { holds: true };
  } },
  "declare-first-head": { place: "effect", most: 2, run: given => {
    if (given.resolved.fields["repository"] === undefined) return [{ effect: "state", item: given.resolved.self, state: "unpublished" }];
    const rule = destinationRules4["declare-first-head"];
    if (!rule || rule.place !== "effect") throw Error("Native first-head rule required");
    return rule.run(given);
  } },
};
