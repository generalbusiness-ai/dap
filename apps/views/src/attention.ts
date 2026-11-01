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
export interface QuestionRow { item: Item; clause: string; values: Reasons & { category: string; kicker: string; bodyAt: unknown; currentBody?: boolean; permission: "not-determined" } }
export function questionRows(items: readonly Item[], scope: ScopeRef, viewer: MemberRef, actions: readonly string[]): QuestionRow[] {
  const rows: QuestionRow[] = [];
  for (const item of items) {
    if (item.type !== "approval-request" || item.state !== "open" || !sameOptional(item.parties["requested"], viewer)) continue;
    const ask = items.find(ask => ask.type === "ask" && namesItem(item.refs["ask"], ask.id, scope));
    const currentBody = !!ask && sameOptional(item.refs["bodyAt"], ask.refs["bodyAt"]);
    rows.push({ item, clause: "acts.request-approval;items.approval-request", values: { category: "requested-review", kicker: questionKicker(ask?.id ?? localId(item.refs["ask"])), ...approvalReasons(item, ask, currentBody, ask ? waitingOn(items, ask.id, scope) : []), bodyAt: item.refs["bodyAt"], currentBody, permission: "not-determined" } });
  }
  if (actions.includes("issue.decide")) for (const ask of items) {
    // After the last approval the request leaves this list, and the question still waits for a decision.
    if (ask.type === "ask" && decidable(ask, items, scope)) rows.push({ item: ask, clause: "acts.decide", values: { category: "decision-due", kicker: questionKicker(ask.id), ...decisionReasons(ask, waitingOn(items, ask.id, scope)), bodyAt: ask.refs["bodyAt"], permission: "not-determined" } });
  }
  return rows;
}

/** The lines under a row's title, in the order a person reads them. */
export const whyLine = (reasons: Reasons): string => `Why it is yours: ${reasons.why}`;
export const reasonLines = (reasons: Reasons, rule: { definition: string; clause: string }): string[] => [
  `What settles it: ${reasons.settles}`,
  ...(reasons.waiting ? [`Waiting on this: ${reasons.waiting.join(", ")}.`] : []),
  ruleLine(rule.clause),
];
/** What each kind of rule is about, by the part of its clause before a semicolon. */
const RULE_WORDS: Readonly<Record<string, string>> = {
  "acts.merge": "a merge",
  "acts.merge#changes-requested": "a merge after a request for changes",
  "acts.merge#finding-open": "a finding that holds a merge",
  "acts.decide": "a decision",
  "acts.request-approval": "an approval request",
  "acts.request-review-own": "a review request",
  "items.commitment": "accepted work",
};
/** A rule in words, for a person. The row and the card's record keep the exact definition and clause. */
export const ruleLine = (clause: string): string => {
  const words = RULE_WORDS[clause.split(";")[0]!];
  return words ? `Rule: this lane's rule for ${words}.` : "Rule: this lane's definition decides it.";
};
/** The exact rule, behind a disclosure on the Page. */
export const exactRule = (rule: { definition: string; clause: string }): string => `Definition ${rule.definition}, clause ${rule.clause}.`;
export const READING_LEAVES_OPEN = "Reading this item leaves it open. This list grants no permission.";
export const LIST_GRANTS_NOTHING = "This list grants no permission.";
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

/** The name a person knows a lane by, from its directory row. */
export function laneName(lane: Item | undefined): string {
  const kind = lane?.values["kind"] === "issue" ? "Issue" : lane?.values["kind"] === "pr" || lane?.values["kind"] === "change" ? "Change" : "Lane";
  return `${kind} ${String(lane?.values["number"] ?? "")}${typeof lane?.values["title"] === "string" ? `: ${shownText(lane.values["title"])}` : ""}`.trim();
}
/** What a list could not read or show. A person must not take a short list for the whole room. */
export function notShown(unread: readonly { scope: ScopeRef }[], omittedRows: number): string[] {
  const lanes = new Set(unread.map(row => row.scope.scope)).size;
  return [...lanes ? [`This list could not read ${lanes} lane${lanes === 1 ? "" : "s"}, so it can leave out items there.`] : [], ...omittedRows ? [`This list leaves out ${omittedRows} more item${omittedRows === 1 ? "" : "s"}. Settle some of the items above, then read it again.`] : []];
}
export const lanesLeftOut = (omitted: number): string => `This list leaves out ${omitted} lane${omitted === 1 ? "" : "s"}.`;
/** A question that took its decision. `entry` is the lane entry of the decide act. */
export const decidedLine = (question: string, entry: number | null): string => `Decided question: ${question}${entry === null ? "" : ` (entry ${entry})`}`;

const titled = (proposal: Item | undefined): string => proposal ? `change ${String(proposal.values["number"] ?? proposal.id)}: ${quoted(proposal.values["title"])}` : "this change";

/** The line above a card's title: the name a person knows the subject by. The card's identity keeps the exact item and revision. */
export const questionKicker = (ask: number | null): string => `Question ${ask ?? "with no number"}`;
export const changeKicker = (proposal: Item | undefined, version: number | null): string => `Change ${String(proposal?.values["number"] ?? proposal?.id ?? "with no number")}${version === null ? "" : `, version ${version}`}`;
/** The receipt line of an accepted act. The context a model reads adds the entry. */
export const reviewRecorded = (verdict: "approve" | "request-changes"): string => `Review recorded: ${verdict === "approve" ? "approved" : "changes requested"}.`;
export const DECISION_RECORDED = "Decision recorded.";
export const MERGE_STARTED = "Merge started.";

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

const version_ = (version: number | null): string => version === null ? "this version" : `version ${version}`;
const sentence = (text: string): string => `${text[0]!.toUpperCase()}${text.slice(1)}`;
/** What stops a merge of this version: the guards of `acts.merge`, in their order, each with its reason and its words. Findings come from the finding profile's guard. */
export interface MergeHold { reason: string; words: string }
export function mergeHolds(items: readonly Item[], manifest: Item, rules: Item | undefined | null, findings: readonly number[], version: number | null, scope: ScopeRef): MergeHold[] {
  const holds: MergeHold[] = [], label = sentence(version_(version));
  const reviews = items.filter(item => item.type === "review" && item.state === "submitted" && namesItem(item.refs["manifest"], manifest.id, scope));
  const given = reviews.filter(item => item.values["verdict"] === "approve").length, needed = rules?.values["approvals"], revision = rules?.values["revision"];
  if (manifest.values["complete"] !== true) holds.push({ reason: "not-complete", words: `${label} is not complete yet.` });
  const merging = items.find(item => item.type === "merge" && ["intended", "committed", "unknown"].includes(item.state));
  if (merging) holds.push({ reason: "merge-in-progress", words: `Merge ${merging.id} must finish first.` });
  if (revision === undefined || revision === null || typeof needed !== "number") holds.push({ reason: "rules-unknown", words: "The rules of this change are not known yet." });
  else if (given < needed) holds.push({ reason: "approvals-needed", words: `${label} needs ${needed - given} more approval${needed - given === 1 ? "" : "s"} first.` });
  if (reviews.some(item => item.values["verdict"] === "request-changes")) holds.push({ reason: "changes-requested", words: `Someone requested changes on ${version_(version)}.` });
  const checks = rules?.values["checks"];
  for (const check of Array.isArray(checks) ? checks as { name?: unknown; required?: unknown; configuration?: unknown }[] : []) {
    if (check.required !== true || typeof check.name !== "string") continue;
    if (!items.some(item => item.type === "job" && item.state === "passed" && item.values["name"] === check.name && namesItem(item.refs["manifest"], manifest.id, scope) && (check.configuration === undefined || item.values["configuration"] === check.configuration)))
      holds.push({ reason: "required-check-not-passed", words: `The check ${shownText(check.name)} must pass first.` });
  }
  if (findings.length) holds.push({ reason: "finding-open", words: findings.length === 1 ? `Open finding ${findings[0]} holds the merge first.` : `Open findings ${findings.join(", ")} hold the merge first.` });
  return holds;
}
/** Who asked for changes on this version, and on an earlier one. A request for changes counts only on the version it names. */
export function changeRequests(items: readonly Item[], manifest: Item, scope: ScopeRef): { current: Item[]; earlier: Item[] } {
  const reviews = items.filter(item => item.type === "review" && item.state === "submitted" && item.values["verdict"] === "request-changes");
  const on = (item: Item) => namesItem(item.refs["manifest"], manifest.id, scope);
  return { current: reviews.filter(on), earlier: reviews.filter(item => !on(item)) };
}
const askedForChanges = (reviews: readonly Item[], viewer: MemberRef): { you: boolean; others: string[] } => ({
  you: reviews.some(item => sameOptional(item.parties["reviewer"], viewer)),
  others: [...new Set(reviews.filter(item => !sameOptional(item.parties["reviewer"], viewer)).map(item => named(item.parties["reviewer"])))],
});
const listed = (names: readonly string[]): string => names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)!}` : names[0] ?? "";

/**
 * The merge row. A merge act names one version, and the lane refuses it while any submitted request for changes stands on that version, whoever asked and whatever other reviews say.
 * So a refused version waits on its author. A new version takes a new review: the old request no longer counts, and the old approvals do not count either.
 */
export function mergeReasons(proposal: Item | undefined, version: number | null, holds: readonly MergeHold[], requests: { current: readonly Item[]; earlier: readonly Item[] }, viewer: MemberRef): Reasons {
  if (requests.current.length) {
    const { you, others } = askedForChanges(requests.current, viewer), author = proposal?.parties["author"];
    const who = you ? listed(["You", ...others]) : listed(others);
    return {
      needs: `${sentence(titled(proposal))} waits on ${sameOptional(author, viewer) ? "you, its author" : `its author, ${named(author)}`}.`,
      why: you ? `${who} requested changes on ${version_(version)}.` : `Your role holds change.merge, and ${who} requested changes on ${version_(version)}.`,
      settles: `A new version from the author ends the wait. A reviewer who requested changes can also replace that verdict with a new review. Until then the room refuses a merge of ${version_(version)}.`,
      settledBy: ["propose-manifest", "review-verdict"],
    };
  }
  const { you, others } = askedForChanges(requests.earlier, viewer);
  const earlier = you || others.length ? ` ${listed([...you ? ["You"] : [], ...others])} requested changes on an earlier version.` : "";
  return {
    needs: `Merge ${titled(proposal)}.${holds.length ? ` ${holds.map(hold => hold.words).join(" ")}` : ""}`,
    why: `Your role holds change.merge.${earlier}`,
    settles: `A merge act on the current version settles it.${holds.length ? " The room refuses that act until then." : ""}`,
    settledBy: ["merge"],
  };
}

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

/** How many of a commitment's conditions a card names, and how much of each. The record holds them all. */
const SHOWN_CONDITIONS = 3, SHOWN_CONDITION = 200;
const WORK_STATE: Readonly<Record<string, string>> = { offered: "has an offer of this work", proposed: "proposed terms for this work", accepted: "accepted this work" };
const clipped = (text: string): string => text.length > SHOWN_CONDITION ? `${text.slice(0, SHOWN_CONDITION)}…` : text;
/** The words of one row of the Work list: the lane it is in, who holds it, and what holds it up. Two rows of two lanes read apart by the lane's name. */
export function workWords(row: { lane: string; state: unknown; agent: MemberRef; controller: MemberRef; terms: Record<string, unknown>; blocks: readonly Item[]; changes: readonly unknown[] }): { kicker: string; title: string; summary: string; lines: string[] } {
  const conditions = Array.isArray(row.terms["conditions"]) ? row.terms["conditions"].filter((one): one is string => typeof one === "string") : [];
  const shown = conditions.slice(0, SHOWN_CONDITIONS).map(one => clipped(shownText(one))), more = conditions.length - shown.length;
  const on = row.blocks.map(block => localId(block.refs["on"])).filter((id): id is number => id !== null);
  return { kicker: "Work", title: row.lane, summary: `${row.agent.member}, agent of ${row.controller.member}, ${WORK_STATE[String(row.state)] ?? `holds this work in the state ${shownText(row.state)}`}.`,
    lines: [...shown.length ? [`Conditions: ${shown.join("; ")}${more ? `; and ${more} more` : ""}.`] : [], ...on.length ? [`Blocked on question ${on.join(", ")}.`] : [], ...row.changes.length ? [`Linked change${row.changes.length === 1 ? "" : "s"}: ${row.changes.length}.`] : []] };
}
