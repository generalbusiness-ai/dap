/**
 * The words of one attention row: what needs you, why it is yours, and what settles it. These words grant nothing.
 * `settledBy` names the act or delivery of the row's pinned definition that closes the item, so a reader can check it against the definition.
 * The clause on the row names the rule. Text that a member wrote goes through `shownText`, so it stays one line of data.
 */
import type { Item, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { isMemberRef } from "@generalbusiness/dap-bytes";
import { shownText } from "./findings.ts";
import { sameOptional } from "./reads.ts";

export interface Reasons { needs: string; why: string; settles: string; settledBy: string[]; waiting?: string[] }
const named = (member: unknown): string => isMemberRef(member) ? member.member : "a member";
const quoted = (value: unknown): string => typeof value === "string" ? `"${shownText(value)}"` : "with no title";
const namesItem = (ref: unknown, id: number, scope: ScopeRef): boolean => ref === id || !!ref && typeof ref === "object" && "seq" in ref && ref.seq === id && "at" in ref && sameOptional(ref.at, scope);

/** The agents whose accepted work is blocked on this question. */
export function waitingOn(items: readonly Item[], ask: number, scope: ScopeRef): string[] {
  const blocked = items.filter(item => item.type === "block" && item.state === "blocked" && namesItem(item.refs["on"], ask, scope));
  const commitments = blocked.map(block => items.find(item => item.type === "commitment" && namesItem(block.refs["commitment"], item.id, scope)));
  return [...new Set(commitments.map(item => item?.parties["performer"] ?? item?.parties["offeree"]).filter(isMemberRef).map(member => member.member))];
}
const withWaiting = (reasons: Reasons, waiting: string[]): Reasons => waiting.length ? { ...reasons, waiting } : reasons;

/** A request to approve a question. The approve act binds the current text, so a request on older text needs its requester. */
export function approvalReasons(request: Item, ask: Item | undefined, current: boolean, waiting: string[]): Reasons {
  const id = typeof request.refs["ask"] === "number" ? request.refs["ask"] : (request.refs["ask"] as { seq?: number } | undefined)?.seq;
  const why = `${named(request.parties["requester"])} asked you by name.`;
  if (!ask) return { needs: `A request about question ${id}, which has closed.`, why, settles: `${named(request.parties["requester"])} withdraws this request with withdraw-approval-request. The question took its final state with the request still open.`, settledBy: ["withdraw-approval-request"] };
  if (!current) return withWaiting({ needs: `Question ${ask.id} changed after ${named(request.parties["requester"])} asked you: ${quoted(ask.values["question"])}.`, why, settles: `${named(request.parties["requester"])} withdraws this request with withdraw-approval-request. The approve act refuses it as stale-question, and a new request can name the new text.`, settledBy: ["withdraw-approval-request"] }, waiting);
  return withWaiting({ needs: `Approve or request changes on question ${ask.id}: ${quoted(ask.values["question"])}.`, why, settles: "Your approve act on the current text closes this request, with the verdict approve or request-changes.", settledBy: ["approve"] }, waiting);
}

/** A question whose guards now let someone decide it. */
export const decisionReasons = (ask: Item, waiting: string[]): Reasons => withWaiting({
  needs: `Decide question ${ask.id}: ${quoted(ask.values["question"])}.`,
  why: "Your role holds issue.decide, and the approvals on the current text are in.",
  settles: "A decide act on the current text records the decision and closes the question.",
  settledBy: ["decide"],
}, waiting);

/** May this question be decided now: no open request and no request for changes on its current text, and at least one approval. The decide act's guards say the same. */
export function decidable(ask: Item, items: readonly Item[], scope: ScopeRef): boolean {
  const onText = (item: Item) => namesItem(item.refs["ask"], ask.id, scope) && sameOptional(textAt(item.refs["bodyAt"]), textAt(ask.refs["bodyAt"]));
  const approvals = items.filter(item => item.type === "approval" && item.state === "submitted" && onText(item));
  return ask.state === "asked" && !items.some(item => item.type === "approval-request" && item.state === "open" && onText(item))
    && approvals.some(item => item.values["verdict"] === "approve") && !approvals.some(item => item.values["verdict"] === "request-changes");
}
const textAt = (ref: unknown): number | null => typeof ref === "number" ? ref : ref && typeof ref === "object" && "seq" in ref && typeof ref.seq === "number" ? ref.seq : null;

const titled = (proposal: Item | undefined): string => proposal ? `change ${String(proposal.values["number"] ?? proposal.id)}: ${quoted(proposal.values["title"])}` : "this change";

export const reviewReasons = (request: Item, proposal: Item | undefined): Reasons => ({
  needs: `Review ${titled(proposal)}.`,
  why: `${named(request.parties["requester"])} asked you by name.`,
  settles: "Your review-verdict act that names this request closes it.",
  settledBy: ["review-verdict"],
});

export const unknownMergeReasons = (merge: Item, viewer: MemberRef): Reasons => ({
  needs: `Merge ${merge.id} of this change has no known outcome.`,
  why: sameOptional(merge.parties["merger"], viewer) ? "You signed this merge." : `Your agent ${named(merge.parties["merger"])} signed this merge.`,
  settles: "The destination's publication delivery settles it. Check the original request, and do not merge again.",
  settledBy: ["publication"],
});

export const mergeReasons = (proposal: Item | undefined, heldBy: readonly number[] | undefined): Reasons => ({
  needs: `Merge ${titled(proposal)}.${heldBy?.length ? ` Open finding ${heldBy.join(", ")} holds the merge first.` : ""}`,
  why: "Your role holds change.merge.",
  settles: "A merge act on the current version settles it.",
  settledBy: ["merge"],
});

const WHY_FINDING: Readonly<Record<string, string>> = {
  "resolve-finding-any": "Your role holds change.dismiss.",
  "resolve-finding-own": "You reported it.",
  "propose-manifest": "You wrote this change, and a new version can answer it.",
  merge: "Your role holds change.merge, and this finding holds that merge.",
};
/** Each act in `settledBy` closes the finding. `acts` on the row says which acts this viewer can ask for. */
export const findingReasons = (finding: Item, acts: readonly string[]): Reasons => ({
  needs: `Answer finding ${finding.id} on ${shownText(finding.values["file"])}. It holds the merge.`,
  why: acts.flatMap(act => WHY_FINDING[act] ?? []).join(" "),
  settles: "An answer closes it: the source resolves it, or a holder of change.dismiss resolves it or marks it irrelevant.",
  settledBy: ["resolve-finding-own", "resolve-finding-any", "mark-finding-irrelevant"],
});
