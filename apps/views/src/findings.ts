/**
 * Open findings of the finding successor of the Change definition, by its exact pin. These helpers grant nothing.
 * The lane's merge guard decides. They read the rules the way that guard reads them, so a source is required only while the lane's current rules say so.
 */
import type { Item, MemberRef } from "@generalbusiness/dap-contract";
import { FINDING_DIGESTS } from "@generalbusiness/dap-lanes";
import { sameOptional } from "./reads.ts";

export const findingProfile = (pin: unknown): boolean => pin === FINDING_DIGESTS.change;
/** The clause a finding's attention row names: the guard that holds the merge, and the item it reads. */
export const FINDING_CLAUSE = "acts.merge#finding-open;items.finding";

const asByte = (c: string): string => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`;
const asUnit = (c: string): string => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
/**
 * Author-controlled text as one line of data, by the rule of `shownPath` in `packages/git/src/diff.ts`: a backslash and each C0 control or DEL
 * appear as \xNN, and each C1 control, bidi control or line separator appears as \uNNNN. A finding's text cannot start a line of the card or reorder one.
 */
export function shownText(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\u0000-\u001f\\\u007f]/g, asByte).replace(/[\u0080-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g, asUnit);
}

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
