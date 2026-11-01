import { expect, test } from "vitest";
import { canonicalize, digestBytes, itemQueryArgument, itemQueryDigest, readItemQueryParameter, utf8 } from "@generalbusiness/dap-bytes";
import type { Item, MemberRef, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { secretSigner, type Fetch } from "@generalbusiness/dap-client";
import { FINDING_DIGESTS, J4_DIGESTS, QUESTION_DIGESTS } from "@generalbusiness/dap-lanes";
import { SERVICE, StandIn } from "./support/standin.ts";
import { RepoInAi, type Row } from "../../../apps/views/src/repo-in-ai.ts";
import type { ReviewStore } from "../../../apps/views/src/review-store.ts";
import { afterLane, loadNeedsYou, type Room } from "../../../apps/room/page/src/data.ts";

// The Page's list and the real adapter over one STAND-IN: StandIn answers both from memory and judges nothing. These tests show that both make the same rows
// and the same cuts from the same answers. `page-needs-you.scope.test.ts` runs a real lane, and `apps/room/page/test/needs-you-browser.mjs` runs the screen.
const NOW = Date.parse("2099-01-01T00:00:00Z"), TEST_BRIEF = utf8("TEST");
const item = (id: number, type: string, state: string, values: Record<string, unknown> = {}, refs: Record<string, unknown> = {}, parties: Record<string, unknown> = {}) => ({ id, type, state, revision: id, opened: null, values, refs, parties, attributed: [] }) as unknown as Item;

function fixture(actions = ["issue.approve", "issue.decide", "change.merge"]) {
  const signer = secretSigner(new Uint8Array(32).fill(55)), peer = new StandIn(signer.key, "admin", actions);
  const viewer: MemberRef = { membership: peer.membership, member: "@ana" }, vic: MemberRef = { membership: peer.membership, member: "@vic" }, una: MemberRef = { membership: peer.membership, member: "@una" };
  const M = peer.scopes.get(peer.membership.scope)!; M.definition = "platform:membership@8";
  M.items[0] = { ...M.items[0]!, state: "open", refs: { ...M.items[0]!.refs, directory: peer.directory } };
  M.items[1] = item(1, "member", "active", { handle: "@ana", kind: "person", role: "admin" }, {}, { member: viewer, controller: null });
  M.items.push(item(3, "member", "active", { handle: "@vic", kind: "person", role: "member" }, {}, { member: vic, controller: null }), item(4, "member", "active", { handle: "@una", kind: "agent", role: "agent" }, {}, { member: una, controller: viewer }));
  const D = peer.scopes.get(peer.directory.scope)!; D.definition = "platform:directory@16";
  // StandIn holds no item query, and both lists read final items through one. This answers it from the same memory.
  const fetch: Fetch = async (url, init) => {
    const asked = new URL(url), scope = /\/v1\/scopes\/([^/]+)\/query-items$/.exec(asked.pathname)?.[1];
    if (!scope) return peer.fetch(url, init);
    peer.requests.push(`GET ${asked.pathname}`);
    const query = readItemQueryParameter(asked.searchParams.get("q"))!, held = peer.scopes.get(decodeURIComponent(scope) as ScopeId)!;
    const items = [...held.items, ...held.final].filter(one => one.type === query.type && query.states.includes(one.state) && (!query.ids || query.ids.includes(one.id))).sort((a, b) => a.id - b.id);
    return new Response(canonicalize({ ok: true, at: peer.head(held), value: { v: 1, scope: held.ref, query: itemQueryDigest(query), argument: itemQueryArgument(query), items }, complete: true }));
  };
  const session = { service: SERVICE, signer, now: () => NOW, fetch };
  const room: Room = { session, directory: peer.directory.scope, directoryIndex: { scope: peer.directory, definition: D.definition }, membership: peer.membership, rules: peer.rules.scope, destination: peer.destination.scope, key: signer.key, me: null, reader: null, unsessioned: null, definitions: new Map() };
  const app = new RepoInAi({ service: SERVICE, signer, config: async () => peer.config(), now: () => NOW, reviewStore: { read: () => [] } as unknown as ReviewStore, brief: { bytes: TEST_BRIEF, digest: digestBytes(TEST_BRIEF) }, fetch });
  const lane = (definition: string, values: Record<string, unknown> = {}) => { const ref = peer.add("lane", definition as never); D.items.push(item(10 + D.items.length, "lane", "listed", { number: D.items.length, kind: "issue", ...values }, { scope: ref })); return peer.scopes.get(ref.scope)!; };
  const adapter = async (after?: ScopeRef) => (await app.needsYou(after ? { after } : {})).structuredContent as unknown as { rows: Row[]; omittedScopes: ScopeRef[]; omittedRows: number; next: ScopeRef | null; unread: { scope: ScopeRef }[] };
  return { peer, room, viewer, vic, una, lane, adapter };
}
type F = ReturnType<typeof fixture>;
const asked = (f: F, id: number) => item(id, "ask", "asked", { question: `TEST question ${id}` }, { bodyAt: id }, { asker: f.vic });
const request = (f: F, id: number, ask: number) => item(id, "approval-request", "open", {}, { ask, bodyAt: ask }, { requested: f.viewer, requester: f.vic });
const approval = (f: F, id: number, ask: number) => item(id, "approval", "submitted", { verdict: "approve" }, { ask, bodyAt: ask }, { approver: f.viewer });

test("every kind of row on the Page is the row of needs_you, and each names its lane and what settles it", async () => {
  const f = fixture();
  const question = f.lane(QUESTION_DIGESTS.issue, { title: "TEST the import" });
  question.items.push(asked(f, 1), request(f, 2, 1), asked(f, 5), approval(f, 6, 5));
  const change = f.lane(FINDING_DIGESTS.change, { kind: "pr", title: "TEST the fix" });
  change.items.push(item(0, "proposal", "open", { title: "TEST change", number: 4 }), item(1, "rules", "current", { revision: 7, approvals: 1, checks: [{ name: "security-review", required: true, checker: f.vic }] }),
    item(6, "manifest", "current", {}, {}, { authors: [f.una] }), item(12, "finding", "open", { file: "src/a.ts", start: 10, end: 12, class: "race", severity: "high", source: "security-review", sourceVersion: "reviewer 1.2" }, { version: 6 }, { reporter: f.vic }),
    item(10, "review-request", "open", {}, {}, { requested: f.viewer, requester: f.vic }), item(11, "merge", "unknown", {}, { manifest: 6 }, { merger: f.una }));
  const expected = await f.adapter();
  f.peer.requests.length = 0;
  const page = await loadNeedsYou(f.room);
  expect([...new Set(expected.rows.map(row => row["category"]))].sort(), "THE FIXTURE holds each kind").toEqual(["decision-due", "merge-attention", "open-finding", "requested-review", "unknown-merge"]);
  expect(page.failed).toBeNull();
  expect(page.items.map(one => one.row), "THE SAME ROWS, in the same order").toEqual(expected.rows);
  const of = (category: string) => page.items.find(one => one.row["category"] === category)!;
  expect(of("decision-due").kind, "A ROW OPENS its own lane").toBe("issue");
  expect(of("decision-due").lane).toBe("Issue 1: TEST the import");
  expect(of("merge-attention").kind).toBe("change");
  expect(of("merge-attention").lane).toBe("Change 2: TEST the fix");
  expect(of("decision-due").why, "THE WORDS OF apps/views").toBe(`Why it is yours: ${String(of("decision-due").row["why"])}`);
  expect(of("decision-due").lines.at(-1), "THE RULE").toBe("Rule: this lane's rule for a decision.");
  expect(page.unread, "EACH LANE READ").toEqual([]);
  expect(f.peer.requests.filter(line => !line.startsWith("GET ")), "A READ SENDS NO ACT: the Page's list only reads").toEqual([]);
});

test("a finding on an earlier version reads that version, as needs_you does, so an author's row does not change on the Page", async () => {
  const f = fixture(["change.dismiss"]);
  const change = f.lane(FINDING_DIGESTS.change, { kind: "pr" });
  change.items.push(item(0, "proposal", "open", { title: "TEST change" }, {}, { author: f.vic }), item(1, "rules", "current", { revision: 7, checks: [{ name: "security-review", required: true }] }), item(6, "manifest", "current", {}, {}, { authors: [f.vic] }),
    item(12, "finding", "open", { file: "src/a.ts", start: 1, end: 2, source: "security-review" }, { version: 3 }, { reporter: f.vic }));
  f.peer.scopes.get(change.ref.scope)!.final.push(item(3, "manifest", "superseded", {}, {}, { authors: [f.viewer] }));
  const expected = await f.adapter();
  expect(expected.rows, "THE AUTHOR OF THAT VERSION has no act here, on either list").toEqual([]);
  const page = await loadNeedsYou(f.room);
  expect(page.failed).toBeNull();
  expect(page.items.map(one => one.row), "THE SAME ANSWER").toEqual(expected.rows);
});

test("a list of more rows than the bound cuts where needs_you cuts, and counts the same rows", async () => {
  const f = fixture(), lane = f.lane(QUESTION_DIGESTS.issue);
  for (let id = 1; id <= 120; id += 2) lane.items.push(asked(f, id), request(f, id + 1, id));
  const expected = await f.adapter(), page = await loadNeedsYou(f.room);
  expect(expected.rows).toHaveLength(50);
  expect(page.items.map(one => one.row), "THE BOUND: at most 50 rows").toEqual(expected.rows);
  expect(page.omittedRows, "COUNTED: the other 10 rows").toBe(expected.omittedRows);
  expect(page.omittedRows).toBe(10);
});

test("a room of eight lanes walks in the windows of needs_you, an unread lane stays named, and a walk reaches every item", async () => {
  const f = fixture();
  const lanes = Array.from({ length: 8 }, (_, index) => { const lane = f.lane(QUESTION_DIGESTS.issue, { title: `TEST ${index}` }); lane.items.push(asked(f, 1), request(f, 2, 1)); return lane; });
  f.lane(J4_DIGESTS.change, { kind: "pr", title: "TEST no rows" });
  const strange = f.lane("sha256:0000000000000000000000000000000000000000000000000000000000000000", { title: "TEST another definition" });
  const expected = await f.adapter(), first = await loadNeedsYou(f.room);
  expect(first.items.map(one => one.row), "THE FIRST WINDOW").toEqual(expected.rows);
  expect(first.omittedLanes, "COUNTED: the lanes it left out").toBe(expected.omittedScopes.length);
  expect(first.next, "THE LANE TO CONTINUE AFTER").toEqual(expected.next);
  expect(first.omittedLanes).toBe(4);
  const seen = first.items.map(one => one.scope);
  let next = first.next, unread = first.unread.map(one => one.ref.scope), windows = 1;
  while (next) {
    const [page, adapter]: [Awaited<ReturnType<typeof loadNeedsYou>>, Awaited<ReturnType<typeof f.adapter>>] = [await loadNeedsYou(f.room, canonicalize(next)), await f.adapter(next)];
    expect(page.items.map(one => one.row), "THE NEXT WINDOW").toEqual(adapter.rows);
    expect([page.omittedLanes, page.next, page.continued], "THE SAME CUT").toEqual([adapter.omittedScopes.length, adapter.next, true]);
    seen.push(...page.items.map(one => one.scope)); unread.push(...page.unread.map(one => one.ref.scope)); next = page.next; windows++;
  }
  expect(windows).toBe(2);
  expect(seen.sort(), "A WALK REACHES EVERY ITEM").toEqual(lanes.map(lane => lane.ref.scope).sort());
  expect(unread, "ANOTHER DEFINITION: the list names that lane, as needs_you does").toEqual([strange.ref.scope]);
});

test("the list keeps the newest decided questions of a lane, says when and with what comment, and counts the rest with the lane that holds them", async () => {
  const f = fixture(), lane = f.lane(QUESTION_DIGESTS.issue, { title: "TEST the import" });
  for (let seq = 1; seq <= 8; seq++) f.peer.append(lane, { type: "timed", item: 0, rule: "TEST", due: "2099-01-01T00:00:00Z" } as never);
  lane.final.push(...[1, 2, 3, 4, 5, 6, 7].map(id => item(id, "ask", "decided", { question: `TEST question ${id}`, ...(id === 7 ? { decisionComment: "TEST keep\nCSV" } : {}) }, { bodyAt: id, decisionAt: id + 1 }, { asker: f.vic })));
  const page = await loadNeedsYou(f.room);
  expect(page.decided.map(one => one.ask).sort(), "THE NEWEST FIVE").toEqual([3, 4, 5, 6, 7]);
  expect(page.older, "COUNTED, with the lane that holds them").toEqual([{ scope: lane.ref.scope, kind: "issue", lane: "Issue 1: TEST the import", count: 2 }]);
  const newest = page.decided.find(one => one.ask === 7)!;
  expect([newest.line, newest.at, newest.comment], "THE WORDS: the comment stays on one line").toEqual(["Decided question: TEST question 7 (entry 8)", "2099-01-01T00:00:00Z", "TEST keep\\x0aCSV"]);
  expect(newest.by, "A SCRIPTED ENTRY holds no act, so it names nobody").toBeNull();
  const noEntries = await loadNeedsYou({ ...f.room, session: { ...f.room.session, fetch: async (url, init) => /\/entries\//.test(url) ? { status: 500, body: null as never } : f.room.session.fetch!(url, init) } });
  expect(noEntries.decided.map(one => [one.line, one.at]).at(0)?.[1], "A FAILED ENTRY READ leaves the question with its words").toBeNull();
  expect(noEntries.decided.map(one => one.ask).sort(), "THE QUESTIONS STAY").toEqual([3, 4, 5, 6, 7]);
});

test("the list says why it could not be read, and the screen around it still opens", async () => {
  const f = fixture();
  const broken = { ...f.room, session: { ...f.room.session, fetch: async () => { throw new Error("TEST no network"); } } };
  const failed = await loadNeedsYou(broken).catch(error => ({ failed: `THROWN ${String(error)}` }));
  expect(failed.failed, "NO THROW: the Issues screen keeps its list").toMatch(/^This list could not be read\./);
  expect(failed.failed).toMatch(/The list of issues below still opens\.$/);
  f.peer.scopes.get(f.peer.membership.scope)!.items.splice(2);
  expect((await loadNeedsYou(f.room)).failed, "A KEY THAT IS NO MEMBER'S").toBe("This key is not an active member's key, so this list cannot say what needs you.");
});

test("an address that names no lane starts the list at the first lane and says so", async () => {
  const f = fixture(), lane = f.lane(QUESTION_DIGESTS.issue);
  lane.items.push(asked(f, 1), request(f, 2, 1));
  expect(afterLane("TEST not json")).toBeNull();
  expect(afterLane('{"scope":"TEST"}')).toBeNull();
  const page = await loadNeedsYou(f.room, "TEST not json");
  expect([page.lostPlace, page.continued, page.items.length]).toEqual([true, false, 1]);
});
