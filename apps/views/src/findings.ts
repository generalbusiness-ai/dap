/**
 * Open findings of the finding successor of the Change definition, by its exact pin. These helpers grant nothing.
 * The lane's merge guard decides. They read the rules the way that guard reads them, so a source is required only while the lane's current rules say so.
 */
import type { Item, MemberRef } from "@generalbusiness/dap-contract";
import { FINDING_DIGESTS } from "../../room/lanes/src/digests-finding.ts";
import { sameOptional, shownText } from "./words.ts";

const RECORDED_FINDING_CHANGE = "sha256:aaf68c3bd82c217312acd7784dfe06bcb7ba6a30a066d0475a7728c62c43a7e7";
export const findingProfile = (pin: unknown): boolean => pin === RECORDED_FINDING_CHANGE || pin === FINDING_DIGESTS.change;
/** The clause a finding's attention row names: the guard that holds the merge, and the item it reads. */
export const FINDING_CLAUSE = "acts.merge#finding-open;items.finding";

export { shownText };

/** The rows of the rules that name this source. The guard holds the merge if any row of that name is required. */
const sourceRows = (rules: Item | null | undefined, source: unknown): { name: string; required?: unknown }[] => {
  const checks = rules?.values["checks"];
  return Array.isArray(checks) ? (checks as { name: string; required?: unknown }[]).filter(check => check.name === source) : [];
};
export const requiredSource = (rules: Item | null | undefined, source: unknown): boolean => sourceRows(rules, source).some(check => check.required === true);
export const sourceRow = (rules: Item | null | undefined, source: unknown): unknown => sourceRows(rules, source).find(check => check.required === true) ?? null;
export const openFindings = (items: readonly Item[]): Item[] => items.filter(item => item.type === "finding" && item.state === "open");
/** Nothing refuses an end before a start, so a reader names that range as malformed. */
export const malformedRange = (finding: Item): boolean => Number(finding.values["end"]) < Number(finding.values["start"]);

const namesMember = (value: unknown, member: MemberRef): boolean => Array.isArray(value) ? value.some(one => sameOptional(one, member)) : sameOptional(value, member);
/**
 * The acts on this finding that the viewer's role and parties let them ask for. The scope decides each one, and `merge` stays refused until someone answers.
 * `version` is the manifest the finding names: the guards of an answer refuse the change's opener and that version's authors.
 */
export function findingActs(finding: Item, proposal: Item, version: Item | undefined, viewer: MemberRef, actions: readonly string[]): string[] {
  const wrote = namesMember(proposal.parties["author"], viewer) || namesMember(version?.parties["authors"], viewer);
  return [
    ...(actions.includes("change.dismiss") && !wrote ? ["resolve-finding-any", "mark-finding-irrelevant"] : []),
    ...(actions.includes("change.check") && sameOptional(finding.parties["reporter"], viewer) ? ["resolve-finding-own"] : []),
    ...(actions.includes("change.propose") && wrote ? ["propose-manifest"] : []),
    ...(actions.includes("change.merge") ? ["merge"] : []),
  ];
}
