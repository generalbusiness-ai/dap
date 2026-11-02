/**
 * The cards a person reads, for the browser script. Real: the views adapter, McpService, the view sessions and the card bundle.
 * STAND-INS: StandIn answers every scope read and accepts every act, and nothing judges these rows. A press closes the lane's open requests here, so the card moves on as a room's would.
 * `packages/mcp/test/change-view.scope.test.ts` runs the same words on a real lane. No provider app runs, so its Reply box is not shown.
 */
import { canonicalize, digestBytes, itemQueryArgument, itemQueryDigest, readItemQueryParameter, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { secretSigner, signedIntent } from "@generalbusiness/dap-client";
import { DOMAINS, type Intent, type Item, type MemberRef } from "@generalbusiness/dap-contract";
import { QUESTION_DIGESTS, changeJ4, issueQuestionsBrief } from "@generalbusiness/dap-lanes";
import { changeSubject } from "../../../../apps/views/src/change.ts";
import { decisionSource, questionSubject } from "../../../../apps/views/src/decision.ts";
import { RepoInAi } from "../../../../apps/views/src/repo-in-ai.ts";
import type { ReviewStore } from "../../../../apps/views/src/review-store.ts";
import { McpService, memoryStore } from "../../src/index.ts";
import { SERVICE, StandIn } from "./standin.ts";

const NOW = Date.parse("2099-01-01T00:00:00Z");
const item = (id: number, type: string, state: string, values: Record<string, unknown> = {}, refs: Record<string, unknown> = {}, parties: Record<string, unknown> = {}) => ({ id, type, state, revision: id, opened: null, values, refs, parties, attributed: [] }) as unknown as Item;
const SHORT = "TEST The import keeps its old row format for one more release. Say yes or ask for changes.";
const LONG = "TEST The import keeps its old row format for one more release, and every reader of the old format moves in the following release. ".repeat(12);

/** One room of one scene. `subject` is what the card opens, for the screens that take one. */
export async function wordsFixture(scene: string) {
  const base = secretSigner(new Uint8Array(32).fill(47)), signed: Intent[] = [];
  const signer = { key: base.key, sign: (bytes: Uint8Array) => { const text = new TextDecoder().decode(bytes), prefix = `${DOMAINS.intent}\n`; if (text.startsWith(prefix)) signed.push(JSON.parse(text.slice(prefix.length)) as Intent); return base.sign(bytes); } };
  const peer = new StandIn(signer.key, "admin", ["issue.approve", "issue.decide", "change.merge", "change.review"]);
  const viewer: MemberRef = { membership: peer.membership, member: "@rita" }, other: MemberRef = { membership: peer.membership, member: "@vic" };
  const scopes = peer.scopes as unknown as Map<string, { definition: string; ref: { scope: string }; items: Item[]; final: Item[]; entries: unknown[]; retained: Map<string, string> }>;
  const M = scopes.get(peer.membership.scope)!, D = scopes.get(peer.directory.scope)!;
  M.definition = "platform:membership@8"; D.definition = "platform:directory@16";
  M.items[1] = item(1, "member", "active", { handle: "@rita", kind: "person", role: "admin" }, {}, { member: viewer, controller: null });
  M.items.push(item(3, "member", "active", { handle: "@vic", kind: "person", role: "member" }, {}, { member: other, controller: null }));
  (M.items[0]!.refs as Record<string, unknown>)["directory"] = peer.directory;
  const lane = (definition: unknown, kind: string, title: string) => {
    const ref = peer.add("lane", definition as never), number = D.items.length;
    D.items.push(item(10 + number, "lane", "created", { number, kind, title }, { scope: ref }));
    return scopes.get(ref.scope)!;
  };
  const question = async (body: string) => {
    const state = lane(issueQuestionsBrief, "issue", "TEST the import"), at = state.ref as never;
    const intent = await signedIntent(base, { to: at, kind: "ask", fields: { question: "TEST Does the import keep the old format?", body: textDigest(body), brief: BRIEF.digest } }, { now: NOW });
    const opening = peer.append(state as never, { type: "act", signed: intent, authority: [], presented: {} } as never), seq = opening.entry.seq;
    while (state.entries.length < 6) peer.append(state as never, { type: "timed", item: 0, rule: "TEST history position", due: "2099-01-01T00:00:00Z" } as never);
    state.items.push(item(seq, "ask", "asked", { question: "TEST Does the import keep the old format?", body: textDigest(body), brief: BRIEF.digest }, { bodyAt: seq }, { asker: other }),
      item(5, "approval-request", "open", {}, { ask: seq, bodyAt: seq }, { requested: viewer, requester: other }));
    state.retained.set(`text ${textDigest(body)}`, canonicalize(body));
    return questionSubject(at, seq);
  };
  const change = (extra: Item[]) => {
    const state = lane(changeJ4, "pr", "TEST the fix"), author: MemberRef = { membership: peer.membership, member: "@una" };
    state.items.push(item(0, "proposal", "open", { title: "TEST the fix", number: 2 }, {}, { author }),
      item(1, "rules", "current", { revision: 7, approvals: 1, ownerMayReview: false, checks: [], extents: [{ name: "source", class: "content" }] }),
      item(6, "manifest", "current", { base: "b".repeat(40), integration: "c".repeat(40), tree: "3".repeat(40), complete: true, selected: [] }, {}, { authors: [author] }), ...extra);
    state.final.push(item(5, "manifest", "superseded", { base: "b".repeat(40), integration: "a".repeat(40), tree: "2".repeat(40), complete: true, selected: [] }, {}, { authors: [author] }));
    while (state.entries.length <= 20) peer.append(state as never, { type: "timed", item: 0, rule: "TEST change position", due: "2099-01-01T00:00:00Z" } as never);
    return state;
  };
  const work = (performer: `@${string}`, controller: MemberRef, title: string) => {
    const agent: MemberRef = { membership: peer.membership, member: performer }, state = lane(QUESTION_DIGESTS.issue, "issue", title);
    M.items.push(item(M.items.length + 10, "member", "active", { kind: "agent", role: "agent", handle: performer }, {}, { member: agent, controller }));
    state.items.push(item(1, "intent", "open", { conditions: ["TEST Large files import"] }, { conditionsAt: 0 }),
      item(2, "commitment", "accepted", { conditions: ["TEST Large files import"] }, { conditionsAt: 0, termsAt: 2 }, { performer: agent }));
  };

  let subject: string | undefined;
  if (scene === "merge-waits") change([item(10, "review", "submitted", { verdict: "request-changes" }, { manifest: 6 }, { reviewer: viewer })]);
  else if (scene === "question-row" || scene === "decision-short") subject = await question(SHORT);
  else if (scene === "decision-long") subject = await question(LONG);
  else if (scene === "change") subject = changeSubject(change([item(10, "review-request", "open", {}, {}, { requested: viewer, requester: other })]).ref as never);
  else if (scene === "work") { work("@una", other, "TEST first import"); work("@una2", viewer, "TEST second import"); }
  else if (scene !== "empty") throw new Error(`No words scene ${scene}.`);

  const fetcher = async (url: string, init?: Parameters<StandIn["fetch"]>[1]) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/query-items")) {
      const query = readItemQueryParameter(parsed.searchParams.get("q")), state = scopes.get(query!.scope.scope)!;
      const rows = [...state.items, ...state.final].filter(row => row.type === query!.type && query!.states.includes(row.state) && (query!.ids === null || query!.ids.includes(row.id))).sort((a, b) => a.id - b.id);
      return new Response(canonicalize({ ok: true, at: peer.head(state as never), value: { v: 1, scope: state.ref, query: itemQueryDigest(query!), argument: itemQueryArgument(query!), items: rows }, complete: true }), { headers: { "content-type": "application/json" } }) as unknown as Awaited<ReturnType<StandIn["fetch"]>>;
    }
    const answer = await peer.fetch(url, init);
    if (init?.method === "POST" && parsed.pathname.endsWith("/acts")) for (const state of scopes.values()) for (const row of state.items) if ((row.type === "approval-request" || row.type === "review-request") && row.state === "open") (row as { state: string }).state = "met";
    return answer;
  };
  const app = new RepoInAi({ service: SERVICE, signer, config: async () => peer.config(), now: () => NOW, brief: BRIEF, reviewStore: { read: () => [] } as unknown as ReviewStore, fetch: fetcher as never });
  const custody = memoryStore();
  const process_ = () => new McpService({ service: SERVICE, signer, custody, now: () => NOW, views: decisionSource(app), applicationReads: app.catalogue(), packageBrief: app.brief, fetch: fetcher as never,
    config: { read: async () => peer.config(), addRoot: async () => { throw new Error("no new root"); } } });
  return { service: process_(), process: process_, signed, scope: peer, complete: () => {}, ...(subject ? { subject } : {}) };
}
const BRIEF = { bytes: utf8("TEST Brief"), digest: digestBytes(utf8("TEST Brief")) };
