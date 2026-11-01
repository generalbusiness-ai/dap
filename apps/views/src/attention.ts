/**
 * The words of one attention row: what needs you, why it is yours, and what settles it. These words grant nothing.
 * `settledBy` names the act or delivery of the row's pinned definition that closes the item, so a reader can check it against the definition.
 * The clause on the row names the rule. Text that a member wrote goes through `shownText`, so it stays one line of data.
 * The room's Page imports this file too, so a person reads the same words on the Page and on a card. Keep its imports free of room reads and of Node.
 */
import type { Item, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { isMemberRef } from "@generalbusiness/dap-bytes";
import { QUESTION_BRIEF_DIGESTS } from "../../room/lanes/src/digests-questions-brief.ts";
import { QUESTION_DIGESTS } from "../../room/lanes/src/digests-questions.ts";
import { sameOptional, shownText } from "./words.ts";

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

/** The two definitions whose question acts these words describe. */
export const questions = (pin: unknown): boolean => pin === QUESTION_DIGESTS.issue || pin === QUESTION_BRIEF_DIGESTS.issue;

/** Each question row for this viewer, at one read of a lane's live items: a request that names them, then a question they may decide. */
export interface QuestionRow { item: Item; clause: string; values: Reasons & { category: string; bodyAt: unknown; currentBody?: boolean; permission: "not-determined" } }
export function questionRows(items: readonly Item[], scope: ScopeRef, viewer: MemberRef, actions: readonly string[]): QuestionRow[] {
  const rows: QuestionRow[] = [];
  for (const item of items) {
    if (item.type !== "approval-request" || item.state !== "open" || !sameOptional(item.parties["requested"], viewer)) continue;
    const ask = items.find(ask => ask.type === "ask" && namesItem(item.refs["ask"], ask.id, scope));
    const currentBody = !!ask && sameOptional(item.refs["bodyAt"], ask.refs["bodyAt"]);
    rows.push({ item, clause: "acts.request-approval;items.approval-request", values: { category: "requested-review", ...approvalReasons(item, ask, currentBody, ask ? waitingOn(items, ask.id, scope) : []), bodyAt: item.refs["bodyAt"], currentBody, permission: "not-determined" } });
  }
  if (actions.includes("issue.decide")) for (const ask of items) {
    // After the last approval the request leaves this list, and the question still waits for a decision.
    if (ask.type === "ask" && decidable(ask, items, scope)) rows.push({ item: ask, clause: "acts.decide", values: { category: "decision-due", ...decisionReasons(ask, waitingOn(items, ask.id, scope)), bodyAt: ask.refs["bodyAt"], permission: "not-determined" } });
  }
  return rows;
}

/** The lines under a row's title, in the order a person reads them. */
export const whyLine = (reasons: Reasons): string => `Why it is yours: ${reasons.why}`;
export const reasonLines = (reasons: Reasons, rule: { definition: string; clause: string }): string[] => [
  `What settles it: ${reasons.settles}`,
  ...(reasons.waiting ? [`Waiting on this: ${reasons.waiting.join(", ")}.`] : []),
  `Rule: ${rule.definition} ${rule.clause}.`,
];
export const READING_LEAVES_OPEN = "Reading this item leaves it open. This list grants no permission.";
export const APPROVAL_LIMIT = "Approval does not approve the Brief or conditions.";
/** A request that names someone else. It is not this viewer's to answer. */
export const otherRequestLine = (request: Item, current: boolean): string => `${named(request.parties["requester"])} asked ${named(request.parties["requested"])} to approve${current ? "" : " an earlier text of"} this question.`;

const localId = (value: unknown): number | null => typeof value === "number" ? value : value && typeof value === "object" && "seq" in value && typeof value["seq"] === "number" ? value["seq"] : null;
export interface QuestionOffer { kind: "approve" | "decide"; verdict?: "approve" | "request-changes"; request?: Item; label: string }
export const offerLabel = (kind: "approve" | "decide", verdict: "approve" | "request-changes" = "approve"): string => kind === "decide" ? "Decide" : verdict === "approve" ? "Approve" : "Request changes";
/** The answers this viewer can press on the question's text at `bodyAt`. The scope still judges each act. */
export function questionOffers(ask: Item, requests: readonly Item[], approvals: readonly Item[], bodyAt: number, viewer: MemberRef, actions: readonly string[]): QuestionOffer[] {
  const open = requests.filter(item => item.state === "open" && localId(item.refs["bodyAt"]) === bodyAt);
  const mine = open.find(item => sameOptional(item.parties["requested"], viewer));
  if (mine && actions.includes("issue.approve") && !sameOptional(ask.parties["asker"], viewer)) return (["approve", "request-changes"] as const).map(verdict => ({ kind: "approve", verdict, request: mine, label: offerLabel("approve", verdict) }));
  const onText = approvals.filter(item => localId(item.refs["bodyAt"]) === bodyAt);
  if (actions.includes("issue.decide") && !open.length && onText.some(item => item.values["verdict"] === "approve") && !onText.some(item => item.values["verdict"] === "request-changes")) return [{ kind: "decide", label: offerLabel("decide") }];
  return [];
}

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
