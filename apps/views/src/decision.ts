import { canonicalize, isMemberRef, isScopeRef, utf8 } from "@generalbusiness/dap-bytes";
import type { FieldValue, Item, ScopeRef } from "@generalbusiness/dap-contract";
import { ViewError, type ActLike, type Card, type CardAction, type LocalReviewCapture, type ViewSource } from "@generalbusiness/dap-mcp";
import { captureInput } from "./capture.ts";
import { changeProjection } from "./change.ts";
import { RepoInAi, questionDefinition, result, type Context, type Row } from "./repo-in-ai.ts";
import { sameOptional, Unread } from "./reads.ts";
import { ReviewStoreError } from "./review-store.ts";

export const questionSubject = (scope: ScopeRef, ask: number): string => JSON.stringify([scope, ask]);
function selector(subject: string | undefined): { scope: ScopeRef; ask: number } {
  if (!subject || subject.length > 256) throw new Unread("question-selector");
  const value: unknown = JSON.parse(subject);
  if (!Array.isArray(value) || value.length !== 2 || !isScopeRef(value[0]) || !Number.isSafeInteger(value[1]) || value[1] < 0) throw new Unread("question-selector");
  return { scope: value[0], ask: value[1] as number };
}
const localId = (value: unknown): number | null => typeof value === "number" ? value : value && typeof value === "object" && "seq" in value && typeof value["seq"] === "number" ? value["seq"] : null;
export function captureQuestionAction(context: Context, kind: "approve" | "decide", request?: Item, verdict: "approve" | "request-changes" = "approve"): CardAction {
  const definition = questionDefinition(context.definition); if (!definition) throw new Unread("question-profile-unsupported");
  const fields: Record<string, FieldValue> = kind === "approve" ? { request: request!.id, bodyAt: context.bodyAt, verdict } : { bodyAt: context.bodyAt };
  const on = kind === "decide" ? context.ask.id : null, act = definition.acts[kind]! as unknown as ActLike;
  return { id: kind === "approve" ? verdict : "decide", label: kind === "decide" ? "Decide" : verdict === "approve" ? "Approve" : "Request changes", purpose: "approve", kind,
    args: { ...captureInput(act, context.items, context.scope, on, fields) } };
}
function questionActions(context: Context): CardAction[] {
  if (!context.briefMatches || context.ask.state !== "asked") return [];
  const requests = context.requests.filter(item => item.state === "open" && localId(item.refs["bodyAt"]) === context.bodyAt.seq);
  const mine = requests.find(item => sameOptional(item.parties["requested"], context.viewer));
  if (mine && context.actions.includes("issue.approve") && !sameOptional(context.ask.parties["asker"], context.viewer)) return [captureQuestionAction(context, "approve", mine), captureQuestionAction(context, "approve", mine, "request-changes")];
  const approvals = context.approvals.filter(item => localId(item.refs["bodyAt"]) === context.bodyAt.seq);
  if (context.actions.includes("issue.decide") && !requests.length && approvals.some(item => item.values["verdict"] === "approve") && !approvals.some(item => item.values["verdict"] === "request-changes")) return [captureQuestionAction(context, "decide")];
  return [];
}
/** What a list left out, and how to reach what follows. Empty when the list left out no lane. */
function lanesLeft(data: Readonly<Record<string, unknown>>, screen: string): string {
  const omitted = (data["omittedScopes"] as unknown[]).length, next = data["next"];
  if (omitted === 0) return "";
  // The Work list takes no cursor, so it names the omission and offers no scope.
  if (screen === "work") return ` This list leaves out ${omitted} lane${omitted === 1 ? "" : "s"}. The Work list reads only the first lanes.`;
  return ` This list leaves out ${omitted} lane${omitted === 1 ? "" : "s"}.${isScopeRef(next) ? ` To read the lanes that follow, open this screen again with scope ${canonicalize(next)}.` : " No lane follows this one. To read the first lanes, open this screen with no scope."}`;
}
export function decisionSource(app: RepoInAi): ViewSource {
  return {
    initialPage: (screen, subject) => screen === "change" && subject === undefined ? "updates" : "summary",
    // A card of one exact subject signs acts; a list of heads or rows signs none.
    checksOriginals: query => query.subject !== undefined,
    listsAfterScope: true,
    read: async (query, _access, minimum) => {
      try {
        // A scope on a list names the lane that the list continues after. No other screen takes one.
        if (query.scope !== undefined && (query.subject !== undefined || query.screen === "decision" || query.screen === "work")) return { status: "unavailable", position: 0, count: 0, fallback: "Only the needs-you and updates lists continue after a lane." };
        if (query.screen === "decision") {
          const selected = selector(query.subject), { context } = await app.question(selected.scope, selected.ask, minimum);
          const actions = questionActions(context), at = actions[0] && !actions[0].local ? actions[0].args["at"] as Record<string, number> : { on: context.ask.revision };
          const card: Card = { identity: { item: String(context.ask.id), kind: "ask", revision: String(context.ask.revision), subject: { scope: context.scope.scope, item: context.ask.id }, at },
            title: String(context.ask.values["question"]), summary: context.brief === null ? "Legacy Question: no Brief binding." : context.briefMatches ? "Question text under its immutable Brief. Approval does not approve the Brief or conditions." : "The retained Brief resource does not match this Question.",
            body: context.body, reasons: [`${context.definition} acts.approve / acts.decide; native admission still decides`],
            projection: [{ scope: context.scope.scope, seq: context.head.seq, hash: context.head.hash }], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], actions,
            fallback: "Use context for the exact text versions, requests, approvals, comments and conditions." };
          if (utf8(canonicalize(card)).length > 60 * 1024) return { status: "incomplete", position: 0, count: 0, fallback: "Question body exceeds this card's display budget. No approval is offered; read the bounded context." };
          return { status: "ready", position: 0, count: 1, card, fallback: card.fallback };
        }
        if (query.screen === "change" && query.subject !== undefined) return await changeProjection(app, query.subject, minimum);
        if (minimum !== undefined) return { status: "unavailable", position: 0, count: 0, fallback: "This screen does not support a receipt read minimum." };
        const after = query.scope === undefined ? {} : { after: query.scope };
        const response = query.screen === "work" ? await app.work() : query.screen === "change" ? await app.since(after) : await app.needsYou(after);
        if (response.isError) return { status: "unavailable", position: 0, count: 0, fallback: "This bounded read is unavailable." };
        const data = response.structuredContent, rows = data["rows"] as Row[];
        const left = lanesLeft(data, query.screen);
        if (!rows.length) return { status: data["complete"] ? "empty" : "incomplete", position: 0, count: 0, fallback: data["complete"] ? "No current rows in the reviewed scope selection." : `No rows in the readable selection; omissions remain.${left}` };
        const position = Math.min(query.position, rows.length - 1), current = rows[position]!;
        const points = data["heads"] as LocalReviewCapture["heads"];
        const ranges = query.screen === "change" ? rows.map(row => ({ scope: row.scope.scope, from: row.head.seq, to: row.head.seq })) : [];
        const entries = ranges.map(range => ({ scope: range.scope, seq: range.from, text: "A new native head since your explicit local mark. This summary does not claim a full journal review." }));
        const actions: CardAction[] = [];
        // A mark covers the heads this window displayed, so a lane outside the window stays unreviewed.
        if (query.screen === "change" && (data["unread"] as unknown[]).length === 0 && data["omittedRows"] === 0 && isScopeRef(data["directory"]) && isMemberRef(data["viewer"])) actions.push({ id: "mark-reviewed", label: "Mark reviewed", purpose: "mark-reviewed", local: true,
          capture: { service: app.options.service, directory: data["directory"], viewer: data["viewer"], key: app.options.signer.key, heads: points, ranges } });
        const card: Card = { identity: { item: String(current.item), kind: current.type, revision: String(current.head.seq), subject: { scope: current.scope.scope, item: current.item }, at: {} },
          title: query.screen === "change" ? "Heads since your explicit review mark" : current.type, summary: `${current.rule.definition} ${current.rule.clause}`,
          reasons: ["This projection explains attention; it grants no permission.", ...(left ? [left.trim()] : [])], body: JSON.stringify(current, null, 2), projection: points.map(point => ({ scope: point.scope.scope, seq: point.head.seq, hash: point.head.hash })),
          reviewIntended: ranges, unavailable: [], entries, waitsOn: [], settles: [], actions, fallback: `Read the named bounded tool for exact rows, heads and omissions.${left}` };
        return { status: "ready", position, count: rows.length, card, fallback: card.fallback };
      } catch (error) {
        if (!(error instanceof Unread) && !(error instanceof SyntaxError)) throw error;
        if (error instanceof Unread && error.reason === "read-minimum-scope") return { status: "unavailable", position: 0, count: 0, fallback: "The receipt minimum does not name this exact Question scope and incarnation." };
        return { status: "unavailable", position: 0, count: 0, fallback: "The selected subject or bounded read is unavailable." };
      }
    },
    // The revisions the card displayed are signed. A revised Question reaches the scope, and the scope refuses it.
    admit: async query => {
      if (query.screen !== "decision") return;
      let context: Context;
      try {
        const selected = selector(query.subject);
        ({ context } = await app.question(selected.scope, selected.ask));
      } catch {
        throw new ViewError("stale", "The selected Question could not be read again. Read the card again; no request was signed.");
      }
      if (!context.briefMatches) throw new ViewError("stale", "The Brief no longer matches this Question. Read the card again; no request was signed.");
    },
    markReviewed: async (capture, { admit }) => {
      try {
        // Selects no lane, so the capture's own lanes can be the window it displayed.
        await app.collect(async collection => {
          if (capture.service !== app.options.service || capture.key !== app.options.signer.key || !sameOptional(capture.directory, collection.directory) || !sameOptional(capture.viewer, collection.viewer)) throw new Unread("review-binding");
          for (const point of capture.heads) {
            if (!collection.inRoom(point.scope) && !sameOptional(point.scope, collection.membership) && !sameOptional(point.scope, collection.directory)) throw new Unread("outside-room");
            const frame = await collection.frame(point.scope); if (!sameOptional(frame.head, point.head)) throw new Unread("head-changed");
          }
        }, undefined, true);
        const status = await app.options.reviewStore.mark(capture, admit);
        return result({ localStatus: status });
      } catch (error) {
        if (error instanceof Unread || error instanceof ReviewStoreError || error instanceof ViewError) return result({ localStatus: "unavailable", reason: error.reason }, true);
        return result({ localStatus: "unavailable", reason: "local-review-write" }, true);
      }
    },
  };
}
