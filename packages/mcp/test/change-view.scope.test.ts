import { expect, test } from "vitest";
import { DOMAINS, type FactRef, type Intent, type Item, type MemberRef, type ScopeId, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, keyIdOfSecret, signInvitationProof, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import { keys, type Actor } from "@generalbusiness/dap-derive/testing";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, ROLE_LISTS, firstExtents } from "@generalbusiness/dap-platform";
import { J4_DIGESTS, QUESTION_BRIEF_DIGESTS, changeJ4, issueQuestionsBrief } from "@generalbusiness/dap-lanes";
import { diffWithCredential } from "../../git/src/diff.ts";
import { idOf, type ObjectType } from "../../git/src/reader.ts";
import type { EffectAnswer, EffectRequest } from "@generalbusiness/dap-scope";
import { WorkspaceStandIn } from "../../../apps/room/lanes/test/support/workspace.ts";
import { changeSubject } from "../../../apps/views/src/change.ts";
import { decisionSource, questionSubject } from "../../../apps/views/src/decision.ts";
import { RepoInAi } from "../../../apps/views/src/repo-in-ai.ts";
import type { ReviewStore } from "../../../apps/views/src/review-store.ts";
import { McpService, memoryStore, type CustodyStore, type McpConfig } from "../src/index.ts";
import { created, mcpRoom, type Agent, type Room } from "./fixtures-native.ts";

// Real: Native M8 authority, the J4 lane judgments, SQLite, Worker HTTP, read sessions under a TEST secret, McpService in app mode,
// ViewSessions, the Change and Decision adapter, the Collection reads, and `actions` and `act` of the ordinary service.
// STAND-INS: OwnGit for the Git host; WorkspaceStandIn for every hold@2 operation (no fork, no staged repository); the scripted
// clock; the pause scheduler. No provider, hosted room or live Worker runs. A review store is unused here: no card marks a review.
const BRIEF = { bytes: utf8("TEST Brief"), digest: digestBytes(utf8("TEST Brief")) };
const reviewStore = { read: () => [] } as unknown as ReviewStore;

interface Fixture { room: Room; owner: Agent; person: ReturnType<typeof fresh>; una: Agent; host: WorkspaceStandIn; repository: NonNullable<McpConfig["repository"]>; ownerRef: MemberRef; uva: MemberRef }

const fresh = (actor: Actor) => { const secret = crypto.getRandomValues(new Uint8Array(32)); return { ...actor, secret, key: keyIdOfSecret(secret) }; };

const act = async (agent: Pick<Agent, "ok">, target: string | number, kind: string, args: Record<string, unknown> = {}) => {
  const actions = await agent.ok("actions", { scope: target });
  const answer = await agent.ok("act", { target, kind, digest: actions["digest"], ...args, idempotencyKey: crypto.randomUUID() });
  expect(answer["answer"], `${kind}: ${JSON.stringify(answer)}`).toBe("accepted");
  return answer["fact"] as FactRef;
};

async function roomOf(fault?: (request: EffectRequest) => EffectAnswer | null | undefined): Promise<Fixture> {
  const clock = { room: null as Room | null };
  const host = new WorkspaceStandIn("", () => timeOf(clock.room!.now() + 600_000));
  const room = mcpRoom(undefined, { hold: host, ...(fault ? { fault } : {}) });
  clock.room = room;
  // A key per room: the register's identity follows from its founder, and these rooms share one isolate.
  const person = fresh(keys.rita), agentKey = fresh(keys.una);
  const owner = room.agent("owner", { mode: "generic", secret: person.secret });
  await created(room, owner, "generic", ARCHIVE_DEVICE_APPLICATION_COHORT.register);
  const repository = owner.config.repository!, M = room.platform(repository.membership.scope);
  const ownerRef: MemberRef = { membership: repository.membership, member: "@rita" };
  const member = await M.did(person, "add-member", { fields: { handle: "@una", kind: "agent", controller: ownerRef } });
  const seed = new Uint8Array(32).fill(72);
  const invitation = await M.did(person, "invite-key", { expected: await M.expected({ member }), fields: { member, kind: "agent", inviteKey: keyIdOfSecret(seed), inviteEnds: timeOf(room.now() + 3_600_000) } });
  await M.did(agentKey, "enrol", { on: 0, expected: await M.expected({ on: 0, member }), fields: { invitation, proof: signInvitationProof(seed, repository.membership, invitation, agentKey.key) } });
  const roster = await M.item(0), prior = roster.values[ROLE_LISTS.admin] as string[];
  await M.did(person, "set-actions", { on: 0, expected: await M.expected({ on: 0 }), fields: { role: "admin", actions: [...prior, ...["issue.approve", "issue.decide"].filter(action => !prior.includes(action))] } });
  const { inbox: _inbox, ...shared } = repository;
  const una = room.agent("una", { mode: "generic", secret: agentKey.secret, config: { service: owner.config.service, repository: shared, handle: "@una" } });
  host.head = (await room.platform(repository.destination).item(0)).values["head"] as string;
  await act(owner, "rules", "publish", { on: 0, fields: { approvals: 1, ownerMayReview: true, checks: [], labels: [], extents: firstExtents({ approvals: 1, checks: [] }) } });
  await act(owner, "rules", "activate", { fields: { name: "change", digest: J4_DIGESTS.change }, values: [canonicalize(changeJ4)] });
  return { room, owner, person, una, host, repository, ownerRef, uva: { membership: repository.membership, member: "@una" } };
}

/** The owner's app-mode service, with the Change and Decision adapter. Each call is a new connection with no cards. */
function application(f: Fixture, custody: CustodyStore = memoryStore(), as?: Agent) {
  const config = structuredClone((as ?? f.owner).config), signer = secretSigner(as?.secret ?? f.person.secret);
  const app = new RepoInAi({ service: config.service, signer, config: async () => structuredClone(config), fetch: f.room.fetch, now: f.room.now, reviewStore, brief: BRIEF });
  const signed: Intent[] = [];
  const service = new McpService({ service: config.service, fetch: f.room.fetch, custody, views: decisionSource(app), applicationReads: app.catalogue(), packageBrief: app.brief,
    signer: { key: signer.key, sign: bytes => { const text = new TextDecoder().decode(bytes), prefix = `${DOMAINS.intent}\n`; if (text.startsWith(prefix)) signed.push(JSON.parse(text.slice(prefix.length)) as Intent); return signer.sign(bytes); } },
    readDiff: read => diffWithCredential(read, f.room.git.fetch), now: f.room.now, every: () => () => {}, pause: async waiting => { f.room.advance(1000); await f.room.pause(waiting); },
    config: { read: async () => structuredClone(config), addRoot: async () => { throw new Error("no new root"); } } });
  const call = (name: string, args: Record<string, unknown>) => f.room.wait(() => service.call(name, args));
  return { service, custody, signed, call };
}


const scoped = async (agent: Agent, target: string, kind: string, fields: Record<string, unknown>, key = crypto.randomUUID()) => {
  const actions = await agent.ok("actions", { scope: target });
  return agent.ok("act", { target, kind, digest: actions["digest"], fields, idempotencyKey: key });
};
const refOf = async (agent: Pick<Agent, "ok">, scope: string) => (await agent.ok("inspect", { scope }))["ref"] as ScopeRef;

/** A J4 change that @una opens, under an agent key that the owner controls, with known rules. */
async function changeLane(f: Fixture, title: string): Promise<ScopeRef> {
  const lane = await act(f.una, "directory", "open-pr", { fields: { definition: J4_DIGESTS.change, title, draft: false } });
  const born = await f.una.ok("wait", { scope: "directory", entry: lane.seq });
  const change = (born["created"] as { scope: ScopeId }[])[0]!.scope;
  f.room.know(change);
  await act(f.una, change, "ask-rules", { on: 0 });
  await f.una.ok("wait", { scope: change, type: "rules" });
  for (let n = 0; n < 16; n++) {
    const rules = ((await f.una.ok("inspect", { scope: change }))["items"] as Item[]).find(item => item.type === "rules");
    if (rules?.values["revision"] !== undefined && rules.values["revision"] !== null) break;
    await f.room.pause([change]); f.room.advance(1000);
  }
  return refOf(f.una, change);
}
const settle = async (f: Fixture, scope: string) => { for (let n = 0; n < 8; n++) { await f.room.pause([scope]); f.room.advance(100); } };

/** @una's hold and a workspace instance: real hold@2 acts, with each outside operation answered by WorkspaceStandIn. */
async function workspace(f: Fixture, lane: ScopeRef) {
  const offer = await act(f.una, lane.scope, "offer", { fields: { offeree: f.uva, terms: "TEST work" } });
  await act(f.una, lane.scope, "accept", { on: offer.seq, fields: { terms: offer } });
  const hold = (await act(f.una, lane.scope, "take-hold", { fields: { commitment: offer.seq } })).seq;
  await settle(f, lane.scope);
  const instance = "s6-a";
  for (const [step, fields] of [["instance", { hold, task: lane, instance }], ["token", { hold, instance }]] as const) {
    const done = await f.una.ok("prepare", { resource: lane.scope, capability: "hold@2", step, fields, idempotencyKey: crypto.randomUUID() });
    expect((done["step"] as { answer: { answer: string } }).answer.answer, JSON.stringify(done)).toBe("accepted");
  }
  await settle(f, lane.scope);
  return { hold, instance };
}
/** One version, staged and then proposed. No repository is staged: the stand-in reads back the commit it was given. */
async function propose(f: Fixture, lane: ScopeRef, work: { hold: number; instance: string }, base: string, integration: string, tree: string, previous?: number): Promise<number> {
  const key = crypto.randomUUID(), fields = { hold: work.hold, instance: work.instance, base, integration, tree, complete: true, selected: [], decisions: [], ...(previous === undefined ? {} : { previous }) };
  const staged = await f.una.ok("prepare", { resource: lane.scope, capability: "hold@2", step: "stage", target: lane.scope, kind: "propose-manifest", fields, idempotencyKey: key });
  expect((staged["step"] as { answer: { answer: string } }).answer.answer, JSON.stringify(staged)).toBe("accepted");
  await settle(f, lane.scope);
  const proposed = await scoped(f.una, lane.scope, "propose-manifest", fields, key);
  expect(proposed["answer"], JSON.stringify(proposed)).toBe("accepted");
  return (proposed["fact"] as FactRef).seq;
}
const oid = (c: string) => c.repeat(40);

type App = ReturnType<typeof application>;
interface Shown { cut: number; status: string; receipt?: string; card?: { body?: string; identity: { at: Record<string, number>; item: string; revision: string }; actions: { id: string; label: string; purpose: string }[]; unresolvedOriginal?: boolean; diffAvailable?: boolean; diffSigned?: true } }
const shown = (structured: Record<string, unknown>): Shown => structured["display"] as Shown;
/** Open a card and read its item page, where a card shows its acts. */
async function card(a: App, view: string, tool: string, subject: string): Promise<Shown> {
  const opened = await a.call(tool, { view, subject });
  expect(opened.structuredContent["status"], JSON.stringify(opened.structuredContent)).toBe("ready");
  const summary = shown((await a.call("view_read", { view })).structuredContent);
  if (summary.card?.unresolvedOriginal) return summary; // The card keeps this page until the original check.
  const item = await a.call("view_read", { view, cut: summary.cut, page: "item" });
  expect(item.isError, JSON.stringify(item.structuredContent)).toBe(false);
  return shown(item.structuredContent);
}
const press = async (a: App, view: string, at: Shown, action: string) => {
  const answer = await a.call("view_act", { view, cut: at.cut, action });
  const result = answer.structuredContent["result"] as { structuredContent: Record<string, unknown> } | undefined;
  return { answer: result?.structuredContent ?? answer.structuredContent, display: answer.structuredContent["display"] as Shown };
};

test("witness 1: an old card's approval is refused after a newer version and signs the revisions it displayed; a fresh card's approval is accepted", async () => {
  const f = await roomOf();
  try {
    const lane = await changeLane(f, "TEST old and fresh cards");
    const work = await workspace(f, lane);
    const v1 = await propose(f, lane, work, f.host.head, oid("c"), oid("3"));
    const a = application(f), b = application(f);
    const old = await card(a, "old", "view_change", changeSubject(lane));
    expect(old.card!.actions.map(action => action.id)).toEqual(["approve", "request-changes"]);
    expect(old.card!.body).toContain(`Integration: ${oid("c")}`);
    expect(old.card!.body).toContain(`Base: ${f.host.head}`);
    const displayed = structuredClone(old.card!.identity.at);

    const v2 = await propose(f, lane, work, f.host.head, oid("d"), oid("4"), v1);
    const refused = await press(a, "old", old, "approve");
    expect([refused.answer["answer"], refused.answer["reason"]], JSON.stringify(refused.answer)).toEqual(["refused", "revision-moved"]);
    expect(a.signed.map(intent => [intent.kind, intent.fields["manifest"], intent.expected])).toEqual([["review-verdict", v1, { manifest: displayed["manifest"], proposal: displayed["proposal"] }]]);
    expect(refused.display.receipt).toContain("refused (revision-moved");

    const fresh = await card(b, "fresh", "view_change", changeSubject(lane));
    expect(fresh.card!.identity.item).toBe(String(v2));
    expect(fresh.card!.body).toContain(`Integration: ${oid("d")}`);
    expect(fresh.card!.body).toContain("Version 2, manifest");
    const accepted = await press(b, "fresh", fresh, "approve");
    expect(accepted.answer["answer"], JSON.stringify(accepted.answer)).toBe("accepted");
    const reviews = ((await f.owner.ok("inspect", { scope: lane.scope }))["items"] as Item[]).filter(item => item.type === "review");
    expect(reviews.map(item => [item.state, item.values["verdict"], item.refs["manifest"]])).toEqual([["submitted", "approve", v2]]);
  } finally { await f.room.done(); }
}, 120_000);

test("the Decision card: an old card's approval reaches the scope and is refused after a revision; a fresh card's approval is accepted", async () => {
  const f = await roomOf();
  try {
    await act(f.owner, "rules", "activate", { fields: { name: "issue", digest: QUESTION_BRIEF_DIGESTS.issue }, values: [canonicalize(issueQuestionsBrief)] });
    const opening = await act(f.owner, "directory", "open-issue", { fields: { definition: QUESTION_BRIEF_DIGESTS.issue, title: "TEST question", conditions: ["TEST condition"] } });
    const issue = ((await f.owner.ok("wait", { scope: "directory", entry: opening.seq }))["created"] as { scope: ScopeId }[])[0]!.scope;
    f.room.know(issue);
    const lane = await refOf(f.owner, issue);
    const asked = await act(f.una, issue, "ask", { fields: { question: "TEST which?", body: "TEST first text", brief: BRIEF.digest } });
    await act(f.una, issue, "request-approval", { fields: { ask: asked.seq, bodyAt: asked, requested: f.ownerRef } });
    const a = application(f), b = application(f);
    const old = await card(a, "old", "view_decision", questionSubject(lane, asked.seq));
    expect(old.card!.actions.map(action => action.id)).toEqual(["approve", "request-changes"]);
    const displayed = structuredClone(old.card!.identity.at);
    await act(f.una, issue, "revise-ask", { on: asked.seq, fields: { bodyAt: asked, body: "TEST second text" } });
    const refused = await press(a, "old", old, "approve");
    expect([refused.answer["answer"], refused.answer["reason"]], JSON.stringify(refused.answer)).toEqual(["refused", "revision-moved"]);
    expect(a.signed.map(intent => [intent.kind, intent.expected])).toEqual([["approve", displayed]]);
    // Under the new text, a new request. The fresh card shows that text and its approval is accepted.
    const revised = ((await f.una.ok("inspect", { scope: issue }))["items"] as Item[]).find(item => item.id === asked.seq)!;
    const seq = revised.refs["bodyAt"] as number, read = await f.una.ok("step", { scope: issue, seq });
    const bodyAt: FactRef = { at: lane, seq, hash: read["hash"] as FactRef["hash"] };
    await act(f.una, issue, "request-approval", { fields: { ask: asked.seq, bodyAt, requested: f.ownerRef } });
    const fresh = await card(b, "fresh", "view_decision", questionSubject(lane, asked.seq));
    expect(fresh.card!.body).toBe("TEST second text");
    const accepted = await press(b, "fresh", fresh, "approve");
    expect(accepted.answer["answer"], JSON.stringify(accepted.answer)).toBe("accepted");
    expect(b.signed.map(intent => [intent.kind, intent.expected])).toEqual([["approve", fresh.card!.identity.at]]);
    // A decided Question is final and leaves the live summary. The act is on that item. A card that showed it signs what it showed, and the scope refuses it.
    const c = application(f), d = application(f);
    const first = await card(c, "first", "view_decision", questionSubject(lane, asked.seq));
    const second = await card(d, "second", "view_decision", questionSubject(lane, asked.seq));
    expect([first.card!.actions.map(action => action.id), second.card!.actions.map(action => action.id)]).toEqual([["decide"], ["decide"]]);
    const decided = await press(c, "first", first, "decide");
    expect(decided.answer["answer"], JSON.stringify(decided.answer)).toBe("accepted");
    const onFinal = await press(d, "second", second, "decide");
    expect(d.signed.map(intent => [intent.kind, intent.expected])).toEqual([["decide", second.card!.identity.at]]);
    expect(onFinal.answer["answer"], JSON.stringify(onFinal.answer)).toBe("refused");
  } finally { await f.room.done(); }
}, 120_000);

/** STAND-IN for an outside fault: two refused pushes, then an attempt with no answer, and no read back: the destination cannot tell. */
const lostPush = (git: () => Room["git"], armed: () => boolean) => (request: EffectRequest): EffectAnswer | null | undefined => {
  if (!armed()) return undefined;
  if (request.kind === "push") return request.attempt < 3 ? { result: "refused", evidence: { basis: "own-answer", body: { send: "refused", seen: git().refs.get("refs/heads/main")! } } } : null;
  if (request.kind === "read") return null;
  return undefined;
};
const fileContent = "# TEST\n\nA file the room publishes.\n";
const proposeFile = async (f: Fixture, lane: ScopeRef) => {
  const base = (await f.room.platform(f.repository.destination).item(0)).values["head"] as string;
  const proposed = await act(f.una, lane.scope, "propose-file", { fields: { base, path: "TEST.md", digest: digestBytes(utf8(fileContent)), size: utf8(fileContent).length, content: fileContent } });
  return { base, manifest: proposed.seq };
};
const approveOn = async (a: App, view: string, lane: ScopeRef) => {
  const at = await card(a, view, "view_change", changeSubject(lane));
  expect(at.card!.actions.map(action => action.id)).toEqual(["approve", "request-changes"]);
  const done = await press(a, view, at, "approve");
  expect(done.answer["answer"], JSON.stringify(done.answer)).toBe("accepted");
};

test("witness 2: with a merge unknown, a merge from any card is refused, and the merger's fresh card offers only the original check", async () => {
  let room: Room | null = null, faulty = false;
  const f = await roomOf(request => lostPush(() => room!.git, () => faulty)(request));
  room = f.room;
  try {
    const lane = await changeLane(f, "TEST unknown merge");
    const { manifest } = await proposeFile(f, lane);
    const a = application(f), stale = application(f), self = application(f);
    await approveOn(a, "approve", lane);
    const ready = await card(a, "merge", "view_change", changeSubject(lane));
    expect(ready.card!.actions.map(action => action.id)).toEqual(["merge"]);
    const old = await card(stale, "old", "view_change", changeSubject(lane));
    expect(old.card!.actions.map(action => action.id)).toEqual(["merge"]);
    const displayed = structuredClone(old.card!.identity.at);

    const mainBefore = f.room.git.refs.get("refs/heads/main");
    faulty = true;
    const merged = await press(a, "merge", ready, "merge");
    expect(merged.answer["answer"], JSON.stringify(merged.answer)).toBe("accepted");
    const mergeId = (merged.answer["fact"] as FactRef).seq;
    for (let n = 0; n < 8; n++) { f.room.advance(2000); await f.room.pause([f.repository.destination, lane.scope]); }
    const finals = await f.owner.ok("items", { scope: lane.scope, type: "merge", final: true });
    expect(finals["items"], "the merge is not final").toEqual([]);
    const item = await f.room.platform(lane.scope).item(mergeId);
    expect(item.state).toBe("unknown");
    expect(f.room.git.refs.get("refs/heads/main")).toBe(mainBefore);

    // A card from before the unknown outcome, with another custody home, so no custody check can see the merge. It signs what it
    // displayed, and the scope refuses.
    const refused = await press(stale, "old", old, "merge");
    expect([refused.answer["answer"], refused.answer["reason"], refused.answer["name"]], JSON.stringify(refused.answer)).toEqual(["refused", "guard-failed", "merge-in-progress"]);
    expect(stale.signed.map(intent => [intent.kind, intent.fields["manifest"], intent.expected])).toEqual([["merge", manifest, displayed]]);

    // The same request by the ordinary act tool, with current revisions.
    const direct = await scoped(f.owner, lane.scope, "merge", { manifest, reports: [] });
    expect([direct["answer"], direct["name"]], JSON.stringify(direct)).toEqual(["refused", "merge-in-progress"]);

    // A fresh card of the key that signed the merge: only the original check.
    const signedBefore = self.signed.length;
    const fresh = await card(self, "fresh", "view_change", changeSubject(lane));
    expect(fresh.card!.unresolvedOriginal).toBe(true);
    expect(fresh.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
    expect(fresh.card!.body).toContain(`Merge ${mergeId}: unknown.`);
    const noSuch = await self.call("view_act", { view: "fresh", cut: fresh.cut, action: "merge" });
    expect([noSuch.isError, noSuch.structuredContent["reason"]]).toEqual([true, "shape"]);
    expect(self.signed.length).toBe(signedBefore);

    // This connection holds no custody of the merge, and the merge exists. So its check claims nothing about the merge.
    const elsewhere = await press(self, "fresh", fresh, "check-original");
    expect(elsewhere.answer["answer"], JSON.stringify(elsewhere.answer)).toBe("not-found");
    expect(elsewhere.answer["sentence"]).toContain("This server keeps no record");
    expect(elsewhere.answer["next"]).toContain("does not show that the act was not sent");
    expect(JSON.stringify(elsewhere.answer)).not.toMatch(/sign with/i);
    expect(elsewhere.display.receipt).toContain("does not show that it was not sent");
    expect(self.signed.length).toBe(signedBefore);

    // The check of the very connection that sent it signs nothing and reports the act.
    const sentBefore = a.signed.length;
    const mine = await card(a, "after", "view_change", changeSubject(lane));
    expect(mine.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
    const checked = await press(a, "after", mine, "check-original");
    expect([checked.answer["answer"], (checked.answer["fact"] as FactRef).seq], JSON.stringify(checked.answer)).toEqual(["accepted", mergeId]);
    expect(a.signed.length).toBe(sentBefore);

    // A member whose key did not sign the merge is offered no act at all, and the card names the merger.
    const peer = application(f, undefined, f.una);
    const theirs = await card(peer, "peer", "view_change", changeSubject(lane));
    expect(theirs.card!.actions).toEqual([]);
    expect(theirs.card!.unresolvedOriginal).toBeUndefined();
    expect(theirs.card!.body).toContain("@rita (person) started it.");
  } finally { await f.room.done(); }
}, 120_000);

test("witness 5: the owner approves and merges through the Change card, under real rules and membership, and the destination publishes (STAND-IN: OwnGit)", async () => {
  const f = await roomOf();
  try {
    const before = f.room.git.refs.get("refs/heads/main")!;
    await act(f.owner, "rules", "activate", { fields: { name: "issue", digest: QUESTION_BRIEF_DIGESTS.issue }, values: [canonicalize(issueQuestionsBrief)] });
    const opening = await act(f.owner, "directory", "open-issue", { fields: { definition: QUESTION_BRIEF_DIGESTS.issue, title: "TEST linked issue", conditions: ["TEST the file lands"] } });
    const issue = ((await f.owner.ok("wait", { scope: "directory", entry: opening.seq }))["created"] as { scope: ScopeId }[])[0]!.scope;
    f.room.know(issue);
    const issueRef = await refOf(f.owner, issue);
    const asked = await act(f.una, issue, "ask", { fields: { question: "TEST ship it?", body: "TEST body", brief: BRIEF.digest } });
    const request = await act(f.una, issue, "request-approval", { fields: { ask: asked.seq, bodyAt: asked, requested: f.ownerRef } });
    await act(f.owner, issue, "approve", { fields: { request: request.seq, bodyAt: asked, verdict: "approve" } });
    const decided = await act(f.owner, issue, "decide", { on: asked.seq, fields: { bodyAt: asked } });

    const lane = await changeLane(f, "TEST complete merge");
    await act(f.una, lane.scope, "link-own", { fields: { issue: issueRef, how: "manual" } });
    const { base } = await proposeFile(f, lane);
    const a = application(f);

    // No approval yet: the rules need one, so the card offers review and no merge.
    const first = await card(a, "first", "view_change", changeSubject(lane));
    expect(first.card!.actions.map(action => action.id)).toEqual(["approve", "request-changes"]);
    expect(first.card!.body).toContain("Approvals needed: 1. Given: 0. The owner may review: yes.");
    expect(first.card!.body).toContain(`Base: ${base}`);
    expect(first.card!.body).toContain("This version holds one file, TEST.md");
    expect(first.card!.diffAvailable).toBeUndefined();
    expect(first.card!.body).toContain("Condition: TEST the file lands");
    expect(first.card!.body).toContain(`Decided question: TEST ship it? (entry ${decided.seq})`);
    const approved = await press(a, "first", first, "approve");
    expect(approved.answer["answer"], JSON.stringify(approved.answer)).toBe("accepted");

    const second = await card(a, "second", "view_change", changeSubject(lane));
    expect(second.card!.body).toContain("@rita (person): approve.");
    expect(second.card!.body).toContain("Approvals needed: 1. Given: 1.");
    expect(second.card!.actions.map(action => action.id)).toEqual(["merge"]);
    const merged = await press(a, "second", second, "merge");
    expect(merged.answer["answer"], JSON.stringify(merged.answer)).toBe("accepted");
    const mergeId = (merged.answer["fact"] as FactRef).seq;
    const published = await f.owner.ok("wait", { scope: lane.scope, item: mergeId, type: "merge", states: ["published", "refused", "aborted"] });
    expect((published["item"] as Item).state, JSON.stringify(published)).toBe("published");
    const after = (await f.room.platform(f.repository.destination).item(0)).values["head"] as string;
    expect(after).not.toBe(before);
    expect(f.room.git.refs.get("refs/heads/main")).toBe(after);
    expect(f.room.git.pushes.filter(push => push.ref === "refs/heads/main").at(-1)).toMatchObject({ commit: after, old: before });

    const read = await a.call("change", { scope: lane });
    expect(read.isError, JSON.stringify(read.structuredContent)).toBe(false);
    const change = read.structuredContent["change"] as { reviews: { reviewerIs: string; values: { verdict: string } }[]; linked: { conditions: string[] }[]; mergeKeys?: unknown };
    expect(change.reviews.map(review => [review.reviewerIs, review.values.verdict])).toEqual([["@rita (person)", "approve"]]);
    expect(change.linked[0]!.conditions).toEqual(["TEST the file lands"]);
    expect(change.mergeKeys).toBeUndefined();
    const done = await card(a, "done", "view_change", changeSubject(lane));
    expect(done.card!.actions).toEqual([]);
    expect(done.card!.body).toContain(`Merge ${mergeId}: published.`);
  } finally { await f.room.done(); }
}, 120_000);

/** A STAND-IN repository's objects, added by object ID, as a workspace would have published them to the destination's repository. */
function published(f: Fixture, base: string, file: string, name = "big.txt"): { integration: string; tree: string } {
  const add = (type: ObjectType, data: Uint8Array): string => { const id = idOf(type, data); f.room.git.objects.set(id, { id, type, data }); return id; };
  const blob = add("blob", utf8(file));
  const raw = (hex: string) => Uint8Array.from(hex.match(/../g)!.map(pair => parseInt(pair, 16)));
  const head = utf8(`100644 ${name}\0`), entry = new Uint8Array(head.length + 20);
  entry.set(head); entry.set(raw(blob), head.length);
  const tree = add("tree", entry);
  const who = "TEST <test@example.invalid> 1700000000 +0000";
  return { integration: add("commit", utf8(`tree ${tree}\nparent ${base}\nauthor ${who}\ncommitter ${who}\n\nTEST\n`)), tree };
}

test("witness 4: View diff signs one read-token act and shows the bounded diff; over the bound the answer says truncated; a commit the host does not hold shows no diff", async () => {
  const f = await roomOf();
  try {
    const lane = await changeLane(f, "TEST diff");
    const work = await workspace(f, lane);
    const base = f.host.head;
    const large = published(f, base, Array.from({ length: 5000 }, (_, n) => `a line of the larger change ${n}\n`).join(""));
    const manifest = await propose(f, lane, work, base, large.integration, large.tree);
    const a = application(f);
    const item = await card(a, "large", "view_change", changeSubject(lane));
    expect([item.card!.diffAvailable, item.card!.diffSigned]).toEqual([true, true]);
    expect(JSON.stringify(item.card)).not.toContain("diffRead");
    // A diff page before the one signed read is refused: reading a card signs nothing.
    const early = await a.call("view_read", { view: "large", cut: item.cut, page: "diff" });
    expect([early.isError, early.structuredContent["reason"]]).toEqual([true, "shape"]);
    expect(a.signed).toEqual([]);

    const shownDiff = await press(a, "large", item, "view-diff");
    expect(a.signed.map(intent => [intent.kind, intent.to!.scope])).toEqual([["read-token", f.repository.destination]]);
    expect(shownDiff.answer).toMatchObject({ base, integration: large.integration, truncated: true });
    const page = shownDiff.display as Shown & { query: { page: string } };
    expect(page.query.page).toBe("diff");
    expect(page.card!.actions).toEqual([]);
    expect(page.card!.body).toContain("+a line of the larger change 0\n");
    expect(page.card!.body).toContain("truncated: the text reached its bound of 40960 bytes. This diff does not show the whole change.");
    const secrets = [...f.room.git.tokens.keys()];
    for (const secret of secrets) expect(JSON.stringify(shownDiff)).not.toContain(secret);
    // Back to the item page, and its acts return.
    const back = await a.call("view_read", { view: "large", cut: page.cut, page: "item" });
    expect(shown(back.structuredContent).card!.actions.map(action => action.id)).toEqual(["approve", "request-changes"]);

    // The ordinary tool: under the bound, exact endpoints and no truncation; the credential goes once.
    const small = published(f, base, "one short file\n", "small.txt");
    const token = await act(f.owner, "destination", "read-token", { on: 0, fields: { hours: 1 } });
    await settle(f, f.repository.destination);
    const whole = await f.owner.ok("diff", { entry: token.seq, base, integration: small.integration });
    expect(whole).toMatchObject({ base, integration: small.integration, truncated: false, files: expect.any(Number) });
    expect(whole["text"]).toContain("--- /dev/null\n+++ b/small.txt\n@@ -0,0 +1,1 @@\n+one short file\n");
    expect(whole["text"]).not.toContain("truncated");
    const spent = await f.owner.call("diff", { entry: token.seq, base, integration: small.integration });
    expect([spent.isError, spent.structuredContent["error"]]).toEqual([true, "credential"]);

    // An integration commit the host does not hold: no diff, and the card says so.
    const hidden = await propose(f, lane, work, base, oid("e"), oid("f"), manifest);
    const b = application(f);
    const absent = await card(b, "absent", "view_change", changeSubject(lane));
    expect(absent.card!.identity.item).toBe(String(hidden));
    const none = await press(b, "absent", absent, "view-diff");
    expect(none.answer["error"], JSON.stringify(none.answer)).toBe("diff");
    expect((none.display as Shown & { query: { page: string } }).query.page).toBe("item");
    expect(none.display.receipt).toContain("Diff not shown: The server shows no diff");
    expect(none.display.card!.body).not.toContain("truncated");

    // A SHA-256 commit, which this reader cannot take: the card signs nothing, and no credential goes.
    await propose(f, lane, work, base, "e".repeat(64), "f".repeat(64), hidden);
    const c = application(f);
    const long = await card(c, "long", "view_change", changeSubject(lane));
    const refused = await press(c, "long", long, "view-diff");
    expect(refused.answer["error"], JSON.stringify(refused.answer)).toBe("shape");
    expect(c.signed).toEqual([]);
    expect(refused.display.receipt).toContain("Diff not shown");
    const token2 = await act(f.owner, "destination", "read-token", { on: 0, fields: { hours: 1 } });
    await settle(f, f.repository.destination);
    const direct = await f.owner.call("diff", { entry: token2.seq, base: "e".repeat(64), integration: small.integration });
    expect([direct.isError, direct.structuredContent["error"]]).toEqual([true, "shape"]);
    const unspent = await f.owner.call("diff", { entry: token2.seq, base, integration: small.integration });
    expect(unspent.isError, JSON.stringify(unspent.structuredContent)).toBe(false);
  } finally { await f.room.done(); }
}, 120_000);

test("after a lost reply and a restart, a fresh card over the same custody offers only the original check, signs nothing, and then reports the outcome", async () => {
  const f = await roomOf();
  try {
    const lane = await changeLane(f, "TEST restart");
    await proposeFile(f, lane);
    const custody = memoryStore();
    const first = application(f, custody);
    const at = await card(first, "card", "view_change", changeSubject(lane));
    f.room.loseNextReply("/acts");
    const lost = await press(first, "card", at, "approve");
    expect(lost.answer["error"], JSON.stringify(lost.answer)).toBe("transport");
    expect(lost.display.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
    const sent = first.signed.length;

    // A new service: no retained card and no pending map. Only custody and the record remain.
    const second = application(f, custody);
    const opened = await card(second, "again", "view_change", changeSubject(lane));
    expect(opened.card!.unresolvedOriginal).toBe(true);
    expect(opened.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
    const unrelated = await second.call("view_act", { view: "again", cut: opened.cut, action: "approve" });
    expect(unrelated.isError).toBe(true);
    const checked = await press(second, "again", opened, "check-original");
    expect(checked.answer["answer"], JSON.stringify(checked.answer)).toBe("accepted");
    expect([first.signed.length, second.signed]).toEqual([sent, []]);
    const reviews = ((await f.owner.ok("inspect", { scope: lane.scope }))["items"] as Item[]).filter(item => item.type === "review");
    expect(reviews).toHaveLength(1);
    // Custody now holds the outcome, so the next card reads the record again.
    const after = await card(second, "after", "view_change", changeSubject(lane));
    expect(after.card!.unresolvedOriginal).toBeUndefined();
    expect(after.card!.actions.map(action => action.id)).toEqual(["merge"]);
  } finally { await f.room.done(); }
}, 120_000);

test("an act that never arrived: a retained card signs nothing, the check sends nothing before notAfter, and after it the scope's refusal frees the card", async () => {
  const f = await roomOf();
  try {
    const lane = await changeLane(f, "TEST never arrived");
    await proposeFile(f, lane);
    const custody = memoryStore();
    const a = application(f, custody), other = application(f, custody);
    await approveOn(a, "approve", lane);
    const ready = await card(a, "merge", "view_change", changeSubject(lane));
    const retained = await card(other, "retained", "view_change", changeSubject(lane));
    expect([ready.card!.actions.map(action => action.id), retained.card!.actions.map(action => action.id)]).toEqual([["merge"], ["merge"]]);
    const merges = async () => (await f.owner.ok("items", { scope: lane.scope, type: "merge" }))["items"];

    f.room.dropNextRequest("/acts");
    const lost = await press(a, "merge", ready, "merge");
    expect(lost.answer["error"], JSON.stringify(lost.answer)).toBe("transport");
    expect(await merges(), "the merge never arrived").toEqual([]);
    const signed = a.signed.length;

    // A retained card over the same custody: no second merge is signed, although no guard at the scope would stop it.
    const held = await other.call("view_act", { view: "retained", cut: retained.cut, action: "merge" });
    expect([held.isError, held.structuredContent["reason"]], JSON.stringify(held.structuredContent)).toEqual([true, "stale"]);
    expect(other.signed).toEqual([]);

    // Before notAfter the act could still land. The check says when to ask again, and sends nothing.
    const early = await press(a, "merge", lost.display, lost.display.card!.actions[0]!.id);
    expect([early.answer["answer"], typeof early.answer["checkAfter"]], JSON.stringify(early.answer)).toEqual(["unknown", "string"]);
    expect(early.answer["next"]).toContain("Check the original request again after");
    expect(early.answer["next"]).not.toContain("same tool");
    expect(early.display.receipt).toContain(`check the original request after ${String(early.answer["checkAfter"])}`);
    expect(early.display.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
    expect(await merges(), "the check sent nothing").toEqual([]);

    // After notAfter the same bytes go once, and the scope refuses them: an answer, and no inference from the clock.
    f.room.advance(16 * 60_000);
    await f.room.pause([lane.scope]);
    const late = await press(a, "merge", early.display, early.display.card!.actions[0]!.id);
    expect([late.answer["answer"], late.answer["phase"], late.answer["reason"]], JSON.stringify(late.answer)).toEqual(["refused", "refused", "expired"]);
    expect(late.display.receipt).toContain("refused (expired)");
    expect(a.signed.length, "the check signs nothing").toBe(signed);
    expect(await merges(), "the expired act took no effect").toEqual([]);

    // Custody holds an outcome now, so a fresh card offers its acts, and a new merge is a new request.
    const fresh = await card(other, "fresh", "view_change", changeSubject(lane));
    expect(fresh.card!.unresolvedOriginal).toBeUndefined();
    expect(fresh.card!.actions.map(action => action.id)).toEqual(["merge"]);
    const merged = await press(other, "fresh", fresh, "merge");
    expect(merged.answer["answer"], JSON.stringify(merged.answer)).toBe("accepted");
  } finally { await f.room.done(); }
}, 120_000);
