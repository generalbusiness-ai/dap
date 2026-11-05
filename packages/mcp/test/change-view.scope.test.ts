import { expect, test } from "vitest";
import { DOMAINS, type FactRef, type Intent, type Item, type MemberRef, type ScopeId, type ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, keyIdOfSecret, signInvitationProof, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { INVITATION_LINK, invitationIssueFields, secretSigner } from "@generalbusiness/dap-client";
import { keys, type Actor } from "@generalbusiness/dap-derive/testing";
import { valueDigest } from "@generalbusiness/dap-derive";
import { FAILED_CLAIM_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, CONFIGURATION_DOMAIN, ROLE_LISTS, firstExtents } from "@generalbusiness/dap-platform";
import { FINDING_DIGESTS, J4_DIGESTS, QUESTION_BRIEF_DIGESTS, changeFinding, changeJ4, issueQuestionsBrief } from "@generalbusiness/dap-lanes";
import { diffWithCredential, fileWithCredential, interdiffWithCredential } from "../../git/src/diff.ts";
import { idOf, type ObjectType } from "../../git/src/reader.ts";
import type { EffectAnswer, EffectRequest } from "@generalbusiness/dap-scope";
import { WorkspaceStandIn } from "../../../apps/room/lanes/test/support/workspace.ts";
import { loadNeedsYou, openRoom } from "../../../apps/room/page/src/data.ts";
import { changeSubject } from "../../../apps/views/src/change.ts";
import { decisionSource, questionSubject } from "../../../apps/views/src/decision.ts";
import { RepoInAi } from "../../../apps/views/src/repo-in-ai.ts";
import type { ReviewStore } from "../../../apps/views/src/review-store.ts";
import { McpService, ReadSessions, memoryStore, type CustodyStore, type Display, type McpConfig } from "../src/index.ts";
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

async function roomOf(fault?: (request: EffectRequest) => EffectAnswer | null | undefined, cohort: typeof ARCHIVE_DEVICE_APPLICATION_COHORT | typeof FAILED_CLAIM_COHORT = ARCHIVE_DEVICE_APPLICATION_COHORT): Promise<Fixture> {
  const clock = { room: null as Room | null };
  const host = new WorkspaceStandIn("", () => timeOf(clock.room!.now() + 600_000));
  const room = mcpRoom(undefined, { hold: host, ...(fault ? { fault } : {}) });
  clock.room = room;
  // A key per room: the register's identity follows from its founder, and these rooms share one isolate.
  const person = fresh(keys.rita), agentKey = fresh(keys.una);
  const owner = room.agent("owner", { mode: "generic", secret: person.secret });
  await created(room, owner, "generic", cohort.register);
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
  const readSessions = new ReadSessions(), requests: { method: string; path: string }[] = [];
  const fetch: typeof f.room.fetch = async (url, init) => {
    requests.push({ method: init?.method ?? "GET", path: new URL(url).pathname });
    return f.room.fetch(url, init);
  };
  const app = new RepoInAi({ readSessions, service: config.service, signer, config: async () => structuredClone(config), fetch, now: f.room.now, reviewStore, brief: BRIEF });
  const signed: Intent[] = [];
  const service = new McpService({ readSessions, service: config.service, fetch, custody, views: decisionSource(app), applicationReads: app.catalogue(), packageBrief: app.brief,
    signer: { key: signer.key, sign: bytes => { const text = new TextDecoder().decode(bytes), prefix = `${DOMAINS.intent}\n`; if (text.startsWith(prefix)) signed.push(JSON.parse(text.slice(prefix.length)) as Intent); return signer.sign(bytes); } },
    readDiff: read => diffWithCredential(read, f.room.git.fetch), readInterdiff: read => interdiffWithCredential(read, f.room.git.fetch), readFile: read => fileWithCredential(read, f.room.git.fetch), now: f.room.now, every: () => () => {}, pause: async waiting => { f.room.advance(1000); await f.room.pause(waiting); },
    config: { read: async () => structuredClone(config), addRoot: async () => { throw new Error("no new root"); } } });
  const call = (name: string, args: Record<string, unknown>) => f.room.wait(() => service.call(name, args));
  return { service, custody, signed, call, requests };
}


const scoped = async (agent: Agent, target: string, kind: string, fields: Record<string, unknown>, key = crypto.randomUUID()) => {
  const actions = await agent.ok("actions", { scope: target });
  return agent.ok("act", { target, kind, digest: actions["digest"], fields, idempotencyKey: key });
};
const refOf = async (agent: Pick<Agent, "ok">, scope: string) => (await agent.ok("inspect", { scope }))["ref"] as ScopeRef;

/** A change that @una opens, under an agent key that the owner controls, with known rules. */
async function changeLane(f: Fixture, title: string, definition: string = J4_DIGESTS.change): Promise<ScopeRef> {
  const lane = await act(f.una, "directory", "open-pr", { fields: { definition, title, draft: false } });
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
async function workspace(f: Fixture, lane: ScopeRef, who: Agent = f.una, member: MemberRef = f.uva) {
  const offer = await act(who, lane.scope, "offer", { fields: { offeree: member, terms: "TEST work" } });
  await act(who, lane.scope, "accept", { on: offer.seq, fields: { terms: offer } });
  const hold = (await act(who, lane.scope, "take-hold", { fields: { commitment: offer.seq } })).seq;
  await settle(f, lane.scope);
  const instance = "s6-a";
  for (const [step, fields] of [["instance", { hold, task: lane, instance }], ["token", { hold, instance }]] as const) {
    const done = await who.ok("prepare", { resource: lane.scope, capability: "hold@2", step, fields, idempotencyKey: crypto.randomUUID() });
    expect((done["step"] as { answer: { answer: string } }).answer.answer, JSON.stringify(done)).toBe("accepted");
  }
  await settle(f, lane.scope);
  return { hold, instance };
}
/** One version, staged and then proposed. No repository is staged: the stand-in reads back the commit it was given. */
async function propose(f: Fixture, lane: ScopeRef, work: { hold: number; instance: string }, base: string, integration: string, tree: string, previous?: number, who: Agent = f.una): Promise<number> {
  const key = crypto.randomUUID(), fields = { hold: work.hold, instance: work.instance, base, integration, tree, complete: true, selected: [], decisions: [], ...(previous === undefined ? {} : { previous }) };
  const staged = await who.ok("prepare", { resource: lane.scope, capability: "hold@2", step: "stage", target: lane.scope, kind: "propose-manifest", fields, idempotencyKey: key });
  expect((staged["step"] as { answer: { answer: string } }).answer.answer, JSON.stringify(staged)).toBe("accepted");
  await settle(f, lane.scope);
  const proposed = await scoped(who, lane.scope, "propose-manifest", fields, key);
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
    expect((old.card as unknown as { actor: unknown }).actor, "THE VERSION identifies its signed manifest, including the agent controller").toEqual({ kind: "agent", name: "@una", controller: "@rita" });
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

test.each([ARCHIVE_DEVICE_APPLICATION_COHORT, FAILED_CLAIM_COHORT] as const)("witness 4 (%j): View diff signs one read-token act and shows the bounded diff; over the bound the answer says truncated; a commit the host does not hold shows no diff", async cohort => {
  const f = await roomOf(undefined, cohort);
  const tokenFields = cohort.destination === FAILED_CLAIM_COHORT.destination ? {} : { hours: 1 };
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

    const beforePress = a.requests.length;
    const shownDiff = await press(a, "large", item, "view-diff");
    const atAct = a.requests.findIndex((request, index) => index >= beforePress && request.method === "POST" && request.path.endsWith("/acts"));
    expect(atAct).toBeGreaterThanOrEqual(beforePress);
    expect(a.requests.slice(beforePress, atAct), "first press reuses its opening credential, reads fresh authority and target, and discovers no unrelated scope").toEqual([
      { method: "GET", path: "/v1/scopes/" + f.repository.membership.scope },
      { method: "GET", path: "/v1/scopes/" + f.repository.directory.scope },
      { method: "GET", path: "/v1/scopes/" + f.repository.rules },
      { method: "GET", path: "/v1/scopes/" + f.repository.destination },
    ]);
    expect(a.signed.map(intent => [intent.kind, intent.to!.scope])).toEqual([["read-token", f.repository.destination]]);
    // The actual signed envelope reaches the Native Destination: C accepts no duration field.
    expect(a.signed[0]!.fields).toEqual(tokenFields);
    expect(shownDiff.answer).toMatchObject({ base, integration: large.integration, truncated: true });
    const page = shownDiff.display as Shown & { query: { page: string } };
    expect(page.query.page).toBe("diff");
    expect(page.card!.actions).toEqual([]);
    expect(page.card!.body).toContain("+a line of the larger change 0\n");
    expect(page.card!.body).toContain("This diff does not show the whole change.");
    const secrets = [...f.room.git.tokens.keys()];
    for (const secret of secrets) expect(JSON.stringify(shownDiff)).not.toContain(secret);
    // Back to the item page, and its acts return.
    const back = await a.call("view_read", { view: "large", cut: page.cut, page: "item" });
    expect(shown(back.structuredContent).card!.actions.map(action => action.id)).toEqual(["approve", "request-changes"]);

    // The ordinary tool: under the bound, exact endpoints and no truncation; the credential goes once.
    const small = published(f, base, "one short file\n", "small.txt");
    const token = await act(f.owner, "destination", "read-token", { on: 0, fields: tokenFields });
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

    // A completed session from the opening read cannot preserve a grant removed before the press.
    const revoked = application(f), revokedCard = await card(revoked, "revoked", "view_change", changeSubject(lane));
    const membership = f.room.platform(f.repository.membership.scope), roster = await membership.item(0);
    const priorActions = roster.values[ROLE_LISTS.admin] as string[];
    expect(priorActions).toContain("destination.read-token");
    await membership.did(f.person, "set-actions", { idempotencyKey: crypto.randomUUID(), on: 0, expected: await membership.expected({ on: 0 }),
      fields: { role: "admin", actions: priorActions.filter(action => action !== "destination.read-token") } });
    const denied = await press(revoked, "revoked", revokedCard, "view-diff");
    expect(denied.answer["error"], "fresh standing denies the press despite the retained opening credential").toBe("unknown-tool");
    expect(revoked.signed).toEqual([]);
    await membership.did(f.person, "set-actions", { idempotencyKey: crypto.randomUUID(), on: 0, expected: await membership.expected({ on: 0 }), fields: { role: "admin", actions: priorActions } });

    // A SHA-256 commit, which this reader cannot take: the card signs nothing, and no credential goes.
    await propose(f, lane, work, base, "e".repeat(64), "f".repeat(64), hidden);
    const c = application(f);
    const long = await card(c, "long", "view_change", changeSubject(lane));
    const refused = await press(c, "long", long, "view-diff");
    expect(refused.answer["error"], JSON.stringify(refused.answer)).toBe("shape");
    expect(c.signed).toEqual([]);
    expect(refused.display.receipt).toContain("Diff not shown");
    const token2 = await act(f.owner, "destination", "read-token", { on: 0, fields: tokenFields });
    await settle(f, f.repository.destination);
    const direct = await f.owner.call("diff", { entry: token2.seq, base: "e".repeat(64), integration: small.integration });
    expect([direct.isError, direct.structuredContent["error"]]).toEqual([true, "shape"]);
    const unspent = await f.owner.call("diff", { entry: token2.seq, base, integration: small.integration });
    expect(unspent.isError, JSON.stringify(unspent.structuredContent)).toBe(false);
  } finally { await f.room.done(); }
}, 120_000);

/** One STAND-IN commit: flat files, one parent. */
function commitOf(f: Fixture, parent: string, files: Record<string, string>): { commit: string; tree: string } {
  const add = (type: ObjectType, data: Uint8Array): string => { const id = idOf(type, data); f.room.git.objects.set(id, { id, type, data }); return id; };
  const raw = (hex: string) => Uint8Array.from(hex.match(/../g)!.map(pair => parseInt(pair, 16)));
  const entries = Object.keys(files).sort().map(name => { const head = utf8(`100644 ${name}\0`), entry = new Uint8Array(head.length + 20); entry.set(head); entry.set(raw(add("blob", utf8(files[name]!))), head.length); return entry; });
  const data = new Uint8Array(entries.reduce((n, entry) => n + entry.length, 0));
  entries.reduce((at, entry) => { data.set(entry, at); return at + entry.length; }, 0);
  const tree = add("tree", data), who = "TEST <test@example.invalid> 1700000000 +0000";
  return { commit: add("commit", utf8(`tree ${tree}\nparent ${parent}\nauthor ${who}\ncommitter ${who}\n\nTEST\n`)), tree };
}
interface Page extends Shown { query: { page: string }; context: { exact?: { commits: { label: string; id: string }[]; truncated: boolean } }; card?: NonNullable<Shown["card"]> & { readers?: { action: string; label: string; current: boolean }[]; shownRead?: { title: string; commits: { label: string; id: string }[]; truncated: boolean; leftOut: string | null; files: { action: string; label: string }[]; moreFiles: number } } }

test("J2 witness 1: version 2's diff and its interdiff from version 1 each name their exact commits and sign one read each; a file reads at its exact commit; a held read signs nothing", async () => {
  const f = await roomOf();
  try {
    const lane = await changeLane(f, "TEST versions");
    const work = await workspace(f, lane);
    const baseFiles = { "app.txt": "one\ntwo\nthree\n", "base.txt": "first base\n" };
    const b1 = commitOf(f, f.host.head, baseFiles).commit;
    const v1 = commitOf(f, b1, { ...baseFiles, "app.txt": "one\nTWO\nthree\n" });
    const v2 = commitOf(f, b1, { ...baseFiles, "app.txt": "one\nTWO\nTHREE\n" });
    const first = await propose(f, lane, work, b1, v1.commit, v1.tree);
    const second = await propose(f, lane, work, b1, v2.commit, v2.tree, first);

    const a = application(f);
    const item = await card(a, "read", "view_change", changeSubject(lane)) as Page;
    expect(item.card!.readers?.map(reader => [reader.action, reader.label])).toEqual([["view-diff", "View diff"], ["view-interdiff-0", "Interdiff from Version 1"]]);
    expect(item.card!.body).toContain(`Version 1, manifest ${first}. Base: ${b1}. Integration: ${v1.commit}.`);
    expect(JSON.stringify(item.card)).not.toContain("interdiffReads");
    expect(a.signed).toEqual([]);

    // Version 2's diff.
    const diff = await press(a, "read", item, "view-diff"), page = diff.display as Page;
    expect(a.signed.map(intent => [intent.kind, intent.to!.scope])).toEqual([["read-token", f.repository.destination]]);
    expect(page.card!.shownRead).toMatchObject({ title: "Diff of Version 2", truncated: false, leftOut: null, commits: [{ label: "Base of Version 2", id: b1 }, { label: "Integration of Version 2", id: v2.commit }] });
    expect(page.card!.body).toContain(`Diff between two exact commits.\nBase: ${b1}\nIntegration: ${v2.commit}\n`);
    expect(page.card!.body).toContain("-two\n-three\n+TWO\n+THREE\n");
    expect(page.context.exact).toMatchObject({ truncated: false, commits: page.card!.shownRead!.commits });
    expect(page.card!.actions).toEqual([]);

    // What changed since version 1, from the same page.
    const inter = await press(a, "read", page, "view-interdiff-0"), since = inter.display as Page;
    expect(a.signed.map(intent => intent.kind)).toEqual(["read-token", "read-token"]);
    expect(since.card!.shownRead).toMatchObject({ title: "Interdiff from Version 1 to Version 2", truncated: false, commits: [{ label: "Base of both versions", id: b1 }, { label: "Integration of Version 1", id: v1.commit }, { label: "Integration of Version 2", id: v2.commit }] });
    expect(since.card!.body).toContain(`Version 1: base ${b1}, integration ${v1.commit}\nVersion 2: base ${b1}, integration ${v2.commit}\n`);
    expect(since.card!.body).toContain("-three\n+THREE\n");
    expect(since.card!.body).not.toContain("-two\n");
    expect(since.card!.readers!.find(reader => reader.current)?.action).toBe("view-interdiff-0");

    // One file at the exact commit that the interdiff names.
    expect(since.card!.shownRead!.files).toEqual([{ action: "view-file-0", label: "File: app.txt" }]);
    const file = await press(a, "read", since, "view-file-0"), read = file.display as Page;
    expect(a.signed).toHaveLength(3);
    expect(read.card!.shownRead).toMatchObject({ title: "File at Version 2", commits: [{ label: "Commit of Version 2", id: v2.commit }] });
    expect(read.card!.body).toContain(`File at an exact commit.\nCommit: ${v2.commit}\nPath: app.txt\n`);
    expect(read.card!.body!.endsWith("one\nTWO\nTHREE\n")).toBe(true);

    // A held read signs nothing and shows the same words. A browser cannot name another read.
    const again = await press(a, "read", read, "view-diff"), held = again.display as Page;
    expect(a.signed).toHaveLength(3);
    expect(held.card!.shownRead!.title).toBe("Diff of Version 2");
    expect(held.card!.body).toBe(page.card!.body);
    for (const action of ["view-interdiff-1", "view-file-9", "view-file-x", "view-interdiff-"]) {
      const refused = await a.call("view_act", { view: "read", cut: held.cut, action });
      expect([action, refused.isError, refused.structuredContent["reason"]]).toEqual([action, true, "shape"]);
    }
    expect(a.signed).toHaveLength(3);
    for (const secret of f.room.git.tokens.keys()) for (const shownPage of [page, since, read, held, diff.answer, inter.answer]) expect(JSON.stringify(shownPage)).not.toContain(secret);

    // A new version moves the card. The page it showed no longer reads as current.
    const v3 = commitOf(f, b1, { ...baseFiles, "app.txt": "ONE\nTWO\nTHREE\n" });
    await propose(f, lane, work, b1, v3.commit, v3.tree, second);
    const moved = await a.call("view_read", { view: "read", cut: held.cut, refresh: true });
    expect([moved.isError, moved.structuredContent["reason"]]).toEqual([true, "stale"]);
    expect(a.signed).toHaveLength(3);
  } finally { await f.room.done(); }
}, 120_000);

test("J2 witness 2: a rebased version 2 names the new base, shows the change's own edits, names the base's files, and says what it cannot separate", async () => {
  const f = await roomOf();
  try {
    const lane = await changeLane(f, "TEST rebase");
    const work = await workspace(f, lane);
    const baseFiles = { "app.txt": "one\ntwo\nthree\n", "base.txt": "first base\n", "own.txt": "own\n" };
    const b1 = commitOf(f, f.host.head, baseFiles).commit;
    const v1 = commitOf(f, b1, { ...baseFiles, "app.txt": "one\nTWO\nthree\n" });
    const m1 = await propose(f, lane, work, b1, v1.commit, v1.tree);

    // The base moves in base.txt only. Version 2 repeats version 1's edit and adds one in own.txt.
    const b2Files = { ...baseFiles, "base.txt": "second base\n" };
    const b2 = commitOf(f, b1, b2Files).commit;
    const v2 = commitOf(f, b2, { ...b2Files, "app.txt": "one\nTWO\nthree\n", "own.txt": "own edited\n" });
    const m2 = await propose(f, lane, work, b2, v2.commit, v2.tree, m1);
    const a = application(f);
    const item = await card(a, "rebased", "view_change", changeSubject(lane)) as Page;
    expect(item.card!.readers?.map(reader => reader.label)).toEqual(["View diff", "Interdiff from Version 1"]);
    const page = (await press(a, "rebased", item, "view-interdiff-0")).display as Page, text = page.card!.body!;
    expect(page.card!.shownRead!.commits).toEqual([{ label: "Base of Version 1", id: b1 }, { label: "Integration of Version 1", id: v1.commit }, { label: "Base of Version 2", id: b2 }, { label: "Integration of Version 2", id: v2.commit }]);
    expect(text).toContain("Version 2 names a new base.");
    expect(text).toContain("Edited by Version 2, shown below: 1 file.\nCannot separate from the new base, shown below: 0 files.\nThe same edit as Version 1 on the new base, named below: 0 files.\nChanged only by the new base, named below: 1 file.\n");
    expect(text).toContain("+own edited\n");
    expect(text).toContain("Changed only by the new base. These files show no lines:\nbase.txt\n");
    expect(text).not.toContain("second base");

    // The base's next commit edits the very line that the change edits. Version 3 keeps its intent on that line.
    const b3Files = { ...b2Files, "app.txt": "one\ntwo from base\nthree\n" };
    const b3 = commitOf(f, b2, b3Files).commit;
    const v3 = commitOf(f, b3, { ...b3Files, "app.txt": "one\nTWO AND BASE\nthree\n", "own.txt": "own edited\n" });
    await propose(f, lane, work, b3, v3.commit, v3.tree, m2);
    const b = application(f);
    const third = await card(b, "mixed", "view_change", changeSubject(lane)) as Page;
    expect(third.card!.readers?.map(reader => reader.label)).toEqual(["View diff", "Interdiff from Version 2", "Interdiff from Version 1"]);
    const mixed = ((await press(b, "mixed", third, "view-interdiff-0")).display as Page).card!.body!;
    expect(mixed).toContain("Cannot separate from the new base, shown below: 1 file.");
    expect(mixed).toContain("A difference between the two patches can come from the new base or from Version 3. Read both patches:");
    expect(mixed).toContain(`Version 2's patch of app.txt, from base ${b2} to integration ${v2.commit}:`);
    expect(mixed).toContain(`Version 3's patch of app.txt, from base ${b3} to integration ${v3.commit}:`);
    expect(mixed).toContain("-two\n+TWO\n");
    expect(mixed).toContain("-two from base\n+TWO AND BASE\n");
  } finally { await f.room.done(); }
}, 120_000);

test("J2 witness 3: over a bound an interdiff says truncated on the band and in the text and says what it left out; a version the host does not hold shows no lines", async () => {
  const f = await roomOf();
  try {
    const lane = await changeLane(f, "TEST bound");
    const work = await workspace(f, lane);
    const baseFiles = { "app.txt": "one\n" };
    const b1 = commitOf(f, f.host.head, baseFiles).commit;
    const v1 = commitOf(f, b1, { "app.txt": "ONE\n" });
    const m1 = await propose(f, lane, work, b1, v1.commit, v1.tree);
    const v2 = commitOf(f, b1, { "app.txt": Array.from({ length: 5000 }, (_, n) => `a line of the larger version ${n}\n`).join(""), "later.txt": "after the bound\n" });
    const m2 = await propose(f, lane, work, b1, v2.commit, v2.tree, m1);
    const a = application(f);
    const item = await card(a, "bound", "view_change", changeSubject(lane)) as Page;
    expect(item.card!.readers?.map(reader => reader.action)).toEqual(["view-diff", "view-interdiff-0"]);
    const page = (await press(a, "bound", item, "view-interdiff-0")).display as Page, band = page.card!.shownRead!;
    expect(band.truncated).toBe(true);
    expect(band.leftOut ?? "").toMatch(/^the last \d+ lines of the patch of app\.txt and every path after it$/);
    expect(page.context.exact!.truncated).toBe(true);
    expect(page.card!.body!.endsWith(`truncated: the text reached its bound of 40960 bytes. Left out: ${band.leftOut}. This interdiff does not show the whole change.\n`)).toBe(true);
    expect(page.card!.body).not.toContain("after the bound");
    expect(band.commits.map(commit => commit.id)).toEqual([b1, v1.commit, v2.commit]);

    // The host holds no such commit: the read shows no lines, says why, and the credential is gone.
    const v3 = commitOf(f, b1, { "app.txt": "THREE\n" });
    const m3 = await propose(f, lane, work, b1, oid("e"), oid("f"), m2);
    await propose(f, lane, work, b1, v3.commit, v3.tree, m3);
    const b = application(f);
    const later = await card(b, "gone", "view_change", changeSubject(lane)) as Page;
    const absent = await press(b, "gone", later, "view-interdiff-0"), none = absent.display as Page;
    expect(b.signed.map(intent => intent.kind)).toEqual(["read-token"]);
    expect(absent.answer["error"], JSON.stringify(absent.answer)).toBe("diff");
    expect(none.query.page).toBe("item");
    expect(none.receipt ?? "").toContain("Interdiff not shown: The server shows no diff");
    expect(none.receipt ?? "").toContain("The one-time credential is spent.");
    expect(none.card!.shownRead).toBeUndefined();
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

    // Just past notAfter, inside the clock margin, the check still sends nothing.
    const checkAfter = Date.parse(String(early.answer["checkAfter"]));
    const intentEnds = Date.parse(a.signed.at(-1)!.notAfter);
    expect(checkAfter - intentEnds).toBe(60_000);
    f.room.advance(intentEnds + 1000 - f.room.now());
    const margin = await press(a, "merge", early.display, early.display.card!.actions[0]!.id);
    expect([margin.answer["answer"], typeof margin.answer["checkAfter"]], JSON.stringify(margin.answer)).toEqual(["unknown", "string"]);

    // Past the margin the same bytes go once, and the scope refuses them: an answer, and no inference from the clock.
    f.room.advance(checkAfter + 1000 - f.room.now());
    await f.room.pause([lane.scope]);
    const late = await press(a, "merge", margin.display, margin.display.card!.actions[0]!.id);
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

/**
 * A room whose rules name two sources, with the finding successor active beside J4. @check is a checker member with one key. It signs each answer
 * by hand: no runner and no model reviews anything.
 */
async function findingRoom() {
  const f = await roomOf();
  const secret = crypto.getRandomValues(new Uint8Array(32)), signer = { ...fresh(keys.paul), secret, key: keyIdOfSecret(secret) };
  const M = f.room.platform(f.repository.membership.scope), seed = new Uint8Array(32).fill(73), idempotencyKey = () => crypto.randomUUID();
  const member = await M.did(f.person, "add-member", { idempotencyKey: idempotencyKey(), fields: { handle: "@check", kind: "checker" } });
  const invitation = await M.did(f.person, "invite-key", { idempotencyKey: idempotencyKey(), expected: await M.expected({ member }), fields: { member, kind: "checker", inviteKey: keyIdOfSecret(seed), inviteEnds: timeOf(f.room.now() + 3_600_000) } });
  await M.did(signer, "enrol", { idempotencyKey: idempotencyKey(), on: 0, expected: await M.expected({ on: 0, member }), fields: { invitation, proof: signInvitationProof(seed, f.repository.membership, invitation, signer.key) } });
  const { inbox: _inbox, ...shared } = f.repository;
  const check = f.room.agent("check", { mode: "generic", secret, config: { service: f.owner.config.service, repository: shared, handle: "@check" } });
  const configuration = { name: "review", image: `sha256:${"e".repeat(64)}`, environment: {}, steps: [["review"]], judged: { passed: { exit: 0, line: "ok" }, failed: { exit: 1, line: "not ok" } }, limits: { seconds: 600, bytes: 65536 } };
  const config = valueDigest(CONFIGURATION_DOMAIN, configuration);
  await act(f.owner, "rules", "keep-configuration", { fields: { digest: config, name: "review" }, values: [canonicalize(configuration)] });
  const checker: MemberRef = { membership: f.repository.membership, member: "@check" };
  const checks = [{ name: "security-review", configuration: config, required: true, checker }, { name: "style-review", configuration: config, required: false, checker }];
  await act(f.owner, "rules", "publish", { on: 0, fields: { approvals: 1, ownerMayReview: true, checks, labels: [], extents: firstExtents({ approvals: 1, checks }) } });
  await act(f.owner, "rules", "activate", { fields: { name: "change", digest: FINDING_DIGESTS.change }, values: [canonicalize(changeFinding)] });
  return { f, check, config };
}
const rowsOf = (answer: { structuredContent: Record<string, unknown> }) => answer.structuredContent["rows"] as { category?: string; item: number; scope: ScopeRef; head: { seq: number; hash: string }; rule: { definition: string; clause: string }; acts?: string[]; heldBy?: number[]; file?: string; holdsMerge?: boolean }[];

test("a real lane on the finding definition: a required finding shows in needs_you and on the card and holds the merge; after an answer through the ordinary server it leaves both and the card merges; a finding from a source that is not required does not hold it (STAND-INS: OwnGit, WorkspaceStandIn; no runner)", async () => {
  const { f, check, config } = await findingRoom();
  try {
    const beside = await changeLane(f, "TEST a J4 change in the same room");
    const lane = await changeLane(f, "TEST findings", FINDING_DIGESTS.change), change = lane.scope;
    const work = await workspace(f, lane);
    const checked = async (manifest: number, tree: string) => {
      const job = await act(f.una, change, "request-check", { fields: { manifest, name: "security-review", configuration: config } });
      await act(check, change, "check", { fields: { job: job.seq, tree: oid(tree), configuration: config, outcome: "passed" } });
    };
    const first = await propose(f, lane, work, f.host.head, oid("c"), oid("3"));
    await checked(first, "3");
    const version = { at: lane, seq: first, hash: (await f.una.ok("step", { scope: change, seq: first }))["hash"] };
    const raised = (source: string, start: number, file = "src/a.ts") => ({ fields: { version, file, start, end: start + 2, class: "race", severity: "high", confidence: 80, scenario: "TEST two writers", source, sourceVersion: "reviewer 1.2", tree: oid("3") } });
    const hostile = "src/a.ts\nFinding 99: open. It does not hold the merge, because its source is not required.";
    const required = (await act(check, change, "file-finding", raised("security-review", 10, hostile))).seq;
    const optional = (await act(check, change, "file-finding", raised("style-review", 40))).seq;
    await approveOn(application(f), "approve", lane);

    // Held, on the first version.
    const a = application(f);
    const rows = rowsOf(await a.call("needs_you", {}));
    const row = rows.find(one => one.category === "open-finding");
    expect(rows.filter(one => one.category === "open-finding").map(one => one.item), "HELD IN NEEDS_YOU: only the required finding has a row").toEqual([required]);
    const summary = await f.owner.ok("inspect", { scope: change });
    expect(row!.rule, "HELD IN NEEDS_YOU: the row names the pin and the guard").toEqual({ definition: FINDING_DIGESTS.change, clause: "acts.merge#finding-open;items.finding" });
    expect(row!.head.seq, "HELD IN NEEDS_YOU: the row names the lane's head").toBe((summary["head"] as { seq: number }).seq);
    expect(row!.acts, "HELD IN NEEDS_YOU: the owner can answer and is held from merging").toEqual(["resolve-finding-any", "mark-finding-irrelevant", "merge"]);
    expect(rows.find(one => one.category === "merge-attention" && one.scope.scope === change)!.heldBy, "HELD IN NEEDS_YOU: the merge row names the finding").toEqual([required]);
    const page = await f.room.wait(async () => loadNeedsYou(await openRoom({ service: f.owner.config.service, secret: f.person.secret, fetch: f.room.fetch, now: f.room.now }, { directory: f.repository.directory.scope, membership: f.repository.membership })));
    expect(page.items.map(one => one.row), "THE SAME ROWS ON THE PAGE: a browser reaches each change lane's rows, from the reads of a real scope").toEqual(rows);
    const held = await card(a, "held", "view_change", changeSubject(lane));
    const lines = held.card!.body!.split("\n");
    expect(lines, "HELD ON THE CARD: the card says that it holds the merge").toContain(`Finding ${required}: holds the merge.`);
    expect(held.card!.body, "THE CARD'S ROUTE: the card tells a person what the docs say about at").toContain("None of these tools needs at, on the current version or an earlier one. To sign the revisions that the change read showed, pass the finding's answerAt as at.");
    expect(lines, "NOT REQUIRED: the card lists it, and says that it does not hold the merge").toContain(`Finding ${optional}: open. It does not hold the merge, because its source is not required.`);
    expect(lines, "ESCAPED: real text from a source stays on its own line").toContain("File: src/a.ts\\x0aFinding 99: open. It does not hold the merge, because its source is not required.");
    expect(held.card!.actions.map(action => action.id), "HELD ON THE CARD: the card offers no merge").not.toContain("merge");
    const refused = await f.owner.call("act", { target: change, kind: "merge", digest: (await f.owner.ok("actions", { scope: change }))["digest"], fields: { manifest: first, reports: [] }, idempotencyKey: crypto.randomUUID() });
    expect(JSON.stringify(refused.structuredContent), "The scope agrees: the guard refuses the merge").toContain("finding-open");

    // The author and the source each see the row, with what each can do. The card's text to the author is the same finding.
    const author = rowsOf(await application(f, undefined, f.una).call("needs_you", {})).filter(one => one.category === "open-finding");
    expect(author.map(one => one.acts), "CAN ACT: the author can propose a new version and cannot answer").toEqual([["propose-manifest"]]);
    const source = rowsOf(await application(f, undefined, check).call("needs_you", {})).filter(one => one.category === "open-finding");
    expect(source.map(one => one.acts), "CAN ACT: the source can resolve its own finding").toEqual([["resolve-finding-own"]]);

    // A new version keeps it, and the row reads the earlier version's authors through the real items route.
    const second = await propose(f, lane, work, f.host.head, oid("d"), oid("4"), first);
    await checked(second, "4");
    await approveOn(application(f), "again", lane);
    const carried = rowsOf(await a.call("needs_you", {})).filter(one => one.category === "open-finding");
    expect(carried.map(one => [one.item, one.acts]), "A new version keeps the finding in needs_you").toEqual([[required, ["resolve-finding-any", "mark-finding-irrelevant", "merge"]]]);
    const later = await card(a, "later", "view_change", changeSubject(lane));
    expect(later.card!.body, "The range belongs to the version it names").toContain(`Change version: 1, manifest ${first}.`);
    expect(later.card!.actions.map(action => action.id), "A new version keeps the merge held").not.toContain("merge");
    expect(JSON.stringify((await a.call("change", { scope: lane })).structuredContent), "The change tool holds the finding").toContain("holdsMerge");

    // The project entry lists no act tool. The ordinary server answers a finding, as the card and the docs say.
    expect((await a.service.page()).tools.map(tool => tool.name), "The project entry lists no act tool, so the card must name another server").not.toContain("act");
    const plain = f.room.agent("plain", { secret: f.person.secret, config: structuredClone(f.owner.config) });
    expect(await plain.names(), "The ordinary server lists the answers for a holder of change.dismiss").toEqual(expect.arrayContaining(["change.resolve-finding-any", "change.mark-finding-irrelevant"]));
    expect(await f.room.agent("plain-check", { secret: check.secret, config: structuredClone(check.config) }).names(), "The ordinary server lists the answer for a source").toContain("change.resolve-finding-own");
    const answered = { target: change, on: required, fields: { answer: "TEST fixed in the second version" } };
    const answer = await plain.ok("change.resolve-finding-any", { ...answered, idempotencyKey: crypto.randomUUID() });
    expect(answer["answer"], `ANSWER TOOL: with no at, the ordinary tool answers a finding on an earlier version: ${JSON.stringify(answer)}`).toBe("accepted");
    // On the current version, the ordinary tool needs no at.
    const current = { at: lane, seq: second, hash: (await f.una.ok("step", { scope: change, seq: second }))["hash"] };
    const onCurrent = (await act(check, change, "file-finding", { fields: { ...raised("security-review", 90).fields, version: current, tree: oid("4") } })).seq;
    const plainly = await plain.ok("change.mark-finding-irrelevant", { target: change, on: onCurrent, fields: { answer: "TEST one writer" }, idempotencyKey: crypto.randomUUID() });
    expect(plainly["answer"], `ANSWER TOOL: on the current version, the ordinary tool needs no at: ${JSON.stringify(plainly)}`).toBe("accepted");

    // Answered: it leaves both, and the card merges past the finding that is not required.
    const afterRows = rowsOf(await a.call("needs_you", {}));
    expect(afterRows.filter(one => one.category === "open-finding"), "AFTER RESOLVE: the finding leaves needs_you").toEqual([]);
    expect(afterRows.find(one => one.category === "merge-attention" && one.scope.scope === change)!.heldBy, "AFTER RESOLVE: nothing holds the merge row").toEqual([]);
    const cleared = await card(a, "cleared", "view_change", changeSubject(lane));
    expect(cleared.card!.body, "AFTER RESOLVE: the finding leaves the card").not.toContain(`Finding ${required}`);
    expect(cleared.card!.body, "NOT REQUIRED: the other finding stays on the card").toContain(`Finding ${optional}: open. It does not hold the merge`);
    expect(cleared.card!.actions.map(action => action.id), "AFTER RESOLVE: the card offers the merge").toContain("merge");
    // A card read before a later finding still offers its merge. The act reaches the scope, and the guard refuses it.
    const late = (await act(check, change, "file-finding", raised("security-review", 70))).seq;
    const stale = await press(a, "cleared", cleared, "merge");
    expect(JSON.stringify(stale.answer), "The scope refuses the merge of a card read before the finding").toContain("finding-open");
    await act(check, change, "resolve-finding-own", { on: late, fields: { answer: "TEST a re-review no longer finds it" } });
    const fresh = await card(a, "fresh", "view_change", changeSubject(lane));
    expect(fresh.card!.actions.map(action => action.id), "AFTER RESOLVE: a fresh card offers the merge").toContain("merge");
    const merged = await press(a, "fresh", fresh, "merge");
    expect(merged.answer["answer"], `AFTER RESOLVE: the scope accepts the merge the card offers: ${JSON.stringify(merged.answer)}`).toBe("accepted");

    // Beside it, the J4 lane and every other read keep working.
    const bothRead = await a.call("work", {});
    expect((bothRead.structuredContent["unread"] as unknown[]).length, "No lane of this room is unsupported").toBe(0);
    const j4 = await application(f).call("view_change", { view: "j4", subject: changeSubject(beside) });
    expect(j4.structuredContent["status"], "A J4 lane in the same room keeps its card").toBe("ready");
  } finally { await f.room.done(); }
}, 240_000);

// The ordinary tools on a finding, with no `at` and with one. Real: the scope, the finding definition, read sessions and custody.
// STAND-INS: OwnGit and WorkspaceStandIn, as above; no runner. A filed finding is signed by hand by the @check member.
const STAND_INS = "(STAND-INS: OwnGit, WorkspaceStandIn; no runner)";
const QUERY_ITEMS = /\/query-items$/;
const version = async (f: Fixture, lane: ScopeRef, manifest: number) => ({ at: lane, seq: manifest, hash: (await f.una.ok("step", { scope: lane.scope, seq: manifest }))["hash"] });
const filed = (at: unknown, tree: string, start: number) => ({ fields: { version: at, file: "src/a.ts", start, end: start + 2, class: "race", severity: "high", confidence: 80, scenario: "TEST two writers", source: "security-review", sourceVersion: "reviewer 1.2", tree: oid(tree) } });
const reply = (answer: Record<string, unknown>) => [answer["answer"], answer["reason"], answer["name"]].filter(part => part !== undefined);
const finalState = async (agent: Agent, scope: string, id: number) => ((await agent.ok("items", { scope, type: "finding", final: true }))["items"] as Item[]).find(item => item.id === id);

/**
 * A change with two versions and findings on each. `earlier` holds two findings on the first version, and `live` holds one on the second.
 * `plain` is the owner's ordinary server, which holds change.dismiss, and `told` gives the change tool's answerAt.
 */
async function versions(integrator: "una" | "owner" = "una") {
  const { f, check } = await findingRoom();
  const lane = await changeLane(f, "TEST findings on two versions", FINDING_DIGESTS.change), change = lane.scope;
  const who = integrator === "owner" ? f.owner : f.una;
  const work = await workspace(f, lane, who, integrator === "owner" ? f.ownerRef : f.uva);
  const first = await propose(f, lane, work, f.host.head, oid("c"), oid("3"), undefined, who);
  const onFirst = await version(f, lane, first);
  const earlier = [(await act(check, change, "file-finding", filed(onFirst, "3", 10))).seq, (await act(check, change, "file-finding", filed(onFirst, "3", 20))).seq] as const;
  const second = await propose(f, lane, work, f.host.head, oid("d"), oid("4"), first, who);
  const live = (await act(check, change, "file-finding", filed(await version(f, lane, second), "4", 30))).seq;
  const plain = f.room.agent("plain", { secret: f.person.secret, config: structuredClone(f.owner.config) });
  const told = async (id: number) => ((await application(f).call("change", { scope: lane })).structuredContent["change"] as { findings: { id: number; answerAt: Record<string, number> }[] }).findings.find(one => one.id === id)!.answerAt;
  return { f, change, earlier, live, plain, told, first };
}
/** One tool call, with the requests it made and the intent it signed. */
async function answering(agent: Agent, tool: string, args: Record<string, unknown>) {
  const requests = agent.requests.length, signed = agent.signedIntents.length;
  const answer = await agent.ok(tool, { fields: { answer: "TEST answered" }, idempotencyKey: crypto.randomUUID(), ...args });
  return { answer, queries: agent.requests.slice(requests).filter(request => QUERY_ITEMS.test(request)).length, signed: agent.signedIntents.slice(signed) };
}

test(`NO AT, RESOLVE: change.resolve-finding-any answers a finding on an earlier version, and signs that version's final revision ${STAND_INS}`, async () => {
  const { f, change, earlier, plain, told } = await versions();
  try {
    const expected = await told(earlier[0]);
    const done = await answering(plain, "change.resolve-finding-any", { target: change, on: earlier[0] });
    expect(reply(done.answer), `RESOLVE: ${JSON.stringify(done.answer)}`).toEqual(["accepted"]);
    expect(done.signed.map(intent => intent.expected), "RESOLVE: the intent binds what the change read gives").toEqual([expected]);
    expect(done.queries, "RESOLVE: one read of the one version that left the summary").toBe(1);
    expect(await finalState(plain, change, earlier[0]), "RESOLVE: the scope records the answer").toMatchObject({ state: "resolved", values: { answer: "TEST answered" } });
    const again = await answering(plain, "change.resolve-finding-any", { target: change, on: earlier[0] });
    expect(reply(again.answer), "RESOLVE: an answered finding has left the summary, and the scope refuses a second answer").toEqual(["refused", "bad-intent"]);
  } finally { await f.room.done(); }
}, 240_000);

test(`NO AT, IRRELEVANT: change.mark-finding-irrelevant answers a finding on an earlier version, and so does act in generic mode ${STAND_INS}`, async () => {
  const { f, change, earlier, plain } = await versions();
  try {
    const done = await answering(plain, "change.mark-finding-irrelevant", { target: change, on: earlier[0] });
    expect(reply(done.answer), `IRRELEVANT: ${JSON.stringify(done.answer)}`).toEqual(["accepted"]);
    expect(await finalState(plain, change, earlier[0]), "IRRELEVANT: the scope records the answer").toMatchObject({ state: "irrelevant", values: { answer: "TEST answered" } });
    const digest = (await f.owner.ok("actions", { scope: change }))["digest"];
    const generic = await answering(f.owner, "act", { target: change, on: earlier[1], kind: "mark-finding-irrelevant", digest });
    expect(reply(generic.answer), `GENERIC: ${JSON.stringify(generic.answer)}`).toEqual(["accepted"]);
  } finally { await f.room.done(); }
}, 240_000);

test(`NO AT, LIVE VERSION: a finding on the live version answers from the summary, with no extra read ${STAND_INS}`, async () => {
  const { f, change, live, plain, told } = await versions();
  try {
    const expected = await told(live);
    const done = await answering(plain, "change.resolve-finding-any", { target: change, on: live });
    expect(reply(done.answer), `LIVE: ${JSON.stringify(done.answer)}`).toEqual(["accepted"]);
    expect(done.signed.map(intent => intent.expected), "LIVE: the intent binds the live version's revision").toEqual([expected]);
    expect(done.queries, "LIVE: the summary holds the version, so the server reads no final item").toBe(0);
  } finally { await f.room.done(); }
}, 240_000);

test(`EXPLICIT AT: the server signs a given at unchanged and reads nothing for it, and the scope judges it ${STAND_INS}`, async () => {
  const { f, change, earlier, plain, told } = await versions();
  try {
    const expected = await told(earlier[0]);
    const stale = { ...expected, manifest: expected["manifest"]! + 1 };
    const moved = await answering(plain, "change.resolve-finding-any", { target: change, on: earlier[0], at: stale });
    expect(reply(moved.answer), "AT STALE: the scope refuses a revision that moved").toEqual(["refused", "revision-moved"]);
    expect(moved.signed.map(intent => intent.expected), "AT STALE: the server does not refresh it").toEqual([stale]);
    const { manifest: _manifest, ...partial } = expected;
    const short = await answering(plain, "change.resolve-finding-any", { target: change, on: earlier[0], at: partial });
    expect(reply(short.answer), "AT SHORT: the server does not fill in the subject that left the summary, and the scope refuses").toEqual(["refused", "bad-intent"]);
    expect(short.signed.map(intent => intent.expected), "AT SHORT: the server signs what it was given").toEqual([partial]);
    const done = await answering(plain, "change.resolve-finding-any", { target: change, on: earlier[0], at: expected });
    expect(reply(done.answer), `AT: answerAt answers it: ${JSON.stringify(done.answer)}`).toEqual(["accepted"]);
    expect(done.signed.map(intent => intent.expected), "AT: the intent binds what was given").toEqual([expected]);
    expect([moved.queries, short.queries, done.queries], "AT: a given at takes no read of a final item").toEqual([0, 0, 0]);
  } finally { await f.room.done(); }
}, 240_000);

test(`THE SCOPE JUDGES: with no at, an author of the earlier version reaches the guard and the scope refuses ${STAND_INS}`, async () => {
  const { f, change, earlier, plain, first } = await versions("owner");
  try {
    const done = await answering(plain, "change.resolve-finding-any", { target: change, on: earlier[0] });
    expect(reply(done.answer), `GUARD: ${JSON.stringify(done.answer)}`).toEqual(["refused", "guard-failed", "author-cannot-answer"]);
    expect(done.queries, "GUARD: the server read the version the guard reads").toBe(1);
    const finding = ((await plain.ok("inspect", { scope: change }))["items"] as Item[]).find(item => item.id === earlier[0]);
    expect(finding, "GUARD: the finding stays open").toMatchObject({ state: "open", refs: { version: first } });
  } finally { await f.room.done(); }
}, 240_000);

test(`READ REFUSED: if the scope refuses the read of the earlier version, the server signs nothing, and the same key answers once the read works (STAND-IN: the test strips the reader from the item query, and the real scope refuses it) ${STAND_INS}`, async () => {
  const { f, change, earlier } = await versions();
  try {
    const config = structuredClone(f.owner.config), signer = secretSigner(f.person.secret);
    let refusing = true, signs = 0;
    const service = new McpService({ service: config.service, custody: memoryStore(), now: f.room.now, every: () => () => {},
      fetch: async (url, init) => {
        if (!refusing || !QUERY_ITEMS.test(new URL(url).pathname)) return f.room.fetch(url, init);
        const { authorization: _reader, ...headers } = (init?.headers ?? {}) as Record<string, string>;
        return f.room.fetch(url, { ...init, headers });
      },
      signer: { key: signer.key, sign: bytes => { if (new TextDecoder().decode(bytes).startsWith(`${DOMAINS.intent}\n`)) signs++; return signer.sign(bytes); } },
      config: { read: async () => structuredClone(config), addRoot: async () => { throw new Error("no new root"); } } });
    const args = { target: change, on: earlier[0], fields: { answer: "TEST answered" }, idempotencyKey: crypto.randomUUID() };
    const refused = await f.room.wait(() => service.call("change.resolve-finding-any", args));
    expect(refused.structuredContent["error"], `READ REFUSED: a read error: ${JSON.stringify(refused.structuredContent)}`).toBe("read");
    expect(refused.structuredContent["message"], "READ REFUSED: the scope forbids the read").toContain("forbidden");
    expect(signs, "READ REFUSED: nothing was signed").toBe(0);
    refusing = false;
    const answered = await f.room.wait(() => service.call("change.resolve-finding-any", args));
    expect(answered.structuredContent["answer"], `READ REFUSED: the same key answers: ${JSON.stringify(answered.structuredContent)}`).toBe("accepted");
    expect(signs, "READ REFUSED: the one answer is the one signature").toBe(1);
  } finally { await f.room.done(); }
}, 240_000);

/** A second reviewer: a person who joins by the invitation route, as the asking room's members do. */
async function reviewerIn(f: Fixture, handle: string): Promise<Agent> {
  const secret = b64url(crypto.getRandomValues(new Uint8Array(32))), { inbox: _inbox, ...shared } = f.repository;
  const invited = await act(f.owner, "membership", "invite-member", { fields: { handle, role: "member", ...invitationIssueFields("platform:membership@8", secret), inviteEnds: timeOf(f.room.now() + 3_600_000) } });
  const link = `${INVITATION_LINK}${b64url(utf8(JSON.stringify({ v: 1, service: f.owner.config.service, repository: shared, invitation: invited.seq, secret, handle, definition: "platform:membership@8" })))}`;
  const agent = f.room.agent(handle, { mode: "generic", secret: crypto.getRandomValues(new Uint8Array(32)), config: { service: "" } });
  expect((await agent.ok("join", { link, idempotencyKey: "join" }))["answer"]).toBe("accepted");
  return agent;
}
const mergeRowOf = async (a: App) => rowsOf(await a.call("needs_you", {})).find(one => one.category === "merge-attention") as unknown as { needs: string; why: string; settles: string; settledBy: string[]; holds: string[]; changesRequested: number[]; kicker: string; rule: { clause: string } };

// The trace behind the merge row, on the J4 change definition: `acts.merge` holds `none: review, submitted, request-changes, on this manifest` with the reason `changes-requested`, after the approvals guard.
test("a merge is refused while any request for changes stands on the current version, whoever asked and whatever others approved; the row says who it waits on; a new version clears the old request and takes new approvals (STAND-INS: OwnGit, WorkspaceStandIn)", async () => {
  const f = await roomOf();
  try {
    const lane = await changeLane(f, "TEST refused change"), change = lane.scope, work = await workspace(f, lane);
    const ola = await reviewerIn(f, "@ola"), a = application(f);
    const v1 = await propose(f, lane, work, f.host.head, oid("c"), oid("3"));
    const merge = async (manifest: number) => {
      const answer = await f.owner.call("act", { target: change, kind: "merge", digest: (await f.owner.ok("actions", { scope: change }))["digest"], fields: { manifest, reports: [] }, idempotencyKey: crypto.randomUUID() });
      return [answer.structuredContent["answer"], answer.structuredContent["name"] ?? null];
    };
    const verdict = (who: Agent, manifest: number, value: string, earlier?: number) => act(who, change, "review-verdict", { fields: { manifest, verdict: value, ...(earlier === undefined ? {} : { earlier }) } });

    // The person's press: Request changes on the current version, on the card.
    const opened = await card(a, "refuse", "view_change", changeSubject(lane));
    const refusal = await press(a, "refuse", opened, "request-changes");
    expect(refusal.answer["answer"], JSON.stringify(refusal.answer)).toBe("accepted");
    expect(refusal.display.receipt, "RECEIPT: a person reads what was recorded, in words").toBe("Review recorded: changes requested. Signed by @rita (person).");
    const refused = (refusal.answer["fact"] as FactRef).seq;
    expect(await merge(v1), "REFUSED, NO APPROVALS: the approvals guard answers first").toEqual(["refused", "approvals-needed"]);
    let row = await mergeRowOf(a);
    expect(row.needs, "THE ROW DOES NOT SAY MERGE: it waits on the author").toBe(`Change ${String(((await f.owner.ok("inspect", { scope: change }))["items"] as Item[]).find(item => item.type === "proposal")!.values["number"] ?? 0)}: "TEST refused change" waits on its author, @una.`);
    expect(row.why, "WHY: you asked for changes on this version").toBe("You requested changes on version 1.");
    expect(row.settledBy, "SETTLED BY: acts of the pinned definition").toEqual(["propose-manifest", "review-verdict"]);
    for (const named of row.settledBy) expect(changeJ4.acts[named as keyof typeof changeJ4.acts], `SETTLED BY: the definition holds ${named}`).toBeDefined();
    expect([row.changesRequested, row.rule.clause, row.kicker.endsWith("version 1")], "THE ROW'S FIELDS name the review and the guard").toEqual([[refused], "acts.merge#changes-requested;items.review", true]);
    expect(row.holds, "HOLDS: the guards that refuse this merge, in their order").toEqual(["approvals-needed", "changes-requested"]);

    // A mix: another member approves. The approval meets the count, and the one request for changes still refuses the merge.
    const approval = await verdict(ola, v1, "approve");
    expect(await merge(v1), "A MIX OF REVIEWERS: an approval does not outweigh a request for changes").toEqual(["refused", "changes-requested"]);
    row = await mergeRowOf(a);
    expect([row.needs.includes("waits on its author"), row.holds], "A MIX: the row still waits on the author").toEqual([true, ["changes-requested"]]);
    const page = await f.room.wait(async () => loadNeedsYou(await openRoom({ service: f.owner.config.service, secret: f.person.secret, fetch: f.room.fetch, now: f.room.now }, { directory: f.repository.directory.scope, membership: f.repository.membership })));
    expect(page.items.map(one => one.needs), "THE SAME WORDS ON THE PAGE").toEqual(rowsOf(await a.call("needs_you", {})).map(one => (one as unknown as { needs: string }).needs));

    // The room's act list leaves out a second verdict from one person, so the card offers none. The lane's way to replace a verdict names the earlier one, through the ordinary act tool.
    expect((await card(a, "again", "view_change", changeSubject(lane))).card!.actions.map(action => action.id), "A SECOND VERDICT: the card offers no act").toEqual([]);

    // Replaced: nothing holds it, and the row says merge. No merge yet.
    await verdict(f.owner, v1, "approve", refused);
    row = await mergeRowOf(a);
    expect([row.needs.startsWith("Merge change"), row.holds, row.settledBy], "REPLACED: the row says merge again").toEqual([true, [], ["merge"]]);

    // Another reviewer now asks for changes, and the merger has approved. The merge is refused for the merger as well.
    await verdict(ola, v1, "request-changes", approval.seq);
    expect(await merge(v1), "ANOTHER REVIEWER'S REFUSAL holds the merger's merge").toEqual(["refused", "changes-requested"]);
    row = await mergeRowOf(a);
    expect(row.why, "WHY: the row names who asked").toBe("Your role holds change.merge, and @ola requested changes on version 1.");

    // A new version: the old request no longer counts, and neither do the old approvals. The row says what the room needs now.
    const v2 = await propose(f, lane, work, f.host.head, oid("d"), oid("4"), v1);
    expect(await merge(v2), "A NEWER VERSION: the old request is gone, and the approvals start again").toEqual(["refused", "approvals-needed"]);
    row = await mergeRowOf(a);
    expect([row.needs.endsWith("Version 2 needs 1 more approval first."), row.why, row.holds, row.kicker.endsWith("version 2")], "A NEWER VERSION: the row names the new version and the earlier request").toEqual([true, "Your role holds change.merge. @ola requested changes on an earlier version.", ["approvals-needed"], true]);
    await verdict(f.owner, v2, "approve");
    expect((await mergeRowOf(a)).holds, "APPROVED: nothing holds the new version").toEqual([]);
    expect(await merge(v2), "THE ROW AND THE LANE AGREE: the merge passes").toEqual(["accepted", null]);
  } finally { await f.room.done(); }
}, 180_000);

test("the first card: a short question shows its text and acts, and the press binds that text: a revised question refuses an old card's press and a fresh card's press is accepted; a long text offers no act (STAND-INS: OwnGit, WorkspaceStandIn)", async () => {
  const f = await roomOf();
  try {
    await act(f.owner, "rules", "activate", { fields: { name: "issue", digest: QUESTION_BRIEF_DIGESTS.issue }, values: [canonicalize(issueQuestionsBrief)] });
    const opening = await act(f.owner, "directory", "open-issue", { fields: { definition: QUESTION_BRIEF_DIGESTS.issue, title: "TEST first card", conditions: ["TEST condition"] } });
    const issue = ((await f.owner.ok("wait", { scope: "directory", entry: opening.seq }))["created"] as { scope: ScopeId }[])[0]!.scope;
    f.room.know(issue);
    const lane = await refOf(f.owner, issue);
    const first = async (a: App, view: string, ask: number) => { await a.call("view_decision", { view, subject: questionSubject(lane, ask) }); return shown((await a.call("view_read", { view })).structuredContent); };
    const asked = await act(f.una, issue, "ask", { fields: { question: "TEST which?", body: "TEST first text", brief: BRIEF.digest } });
    await act(f.una, issue, "request-approval", { fields: { ask: asked.seq, bodyAt: asked, requested: f.ownerRef } });

    const a = application(f), b = application(f);
    const old = await first(a, "old", asked.seq);
    expect([old.card!.body, old.card!.actions.map(action => action.id), (old.card as unknown as { wholeText?: boolean }).wholeText], "THE FIRST CARD holds the whole text and both acts").toEqual(["TEST first text", ["approve", "request-changes"], true]);
    const displayed = structuredClone(old.card!.identity.at);
    await act(f.una, issue, "revise-ask", { on: asked.seq, fields: { bodyAt: asked, body: "TEST second text" } });
    const stale = await press(a, "old", old, "approve");
    expect([stale.answer["answer"], stale.answer["reason"]], JSON.stringify(stale.answer)).toEqual(["refused", "revision-moved"]);
    expect(a.signed.map(intent => [intent.kind, intent.expected, (intent.fields["bodyAt"] as FactRef).seq]), "THE PRESS BINDS the text this card showed").toEqual([["approve", displayed, asked.seq]]);

    const revised = ((await f.una.ok("inspect", { scope: issue }))["items"] as Item[]).find(item => item.id === asked.seq)!, seq = revised.refs["bodyAt"] as number;
    const bodyAt: FactRef = { at: lane, seq, hash: (await f.una.ok("step", { scope: issue, seq }))["hash"] as FactRef["hash"] };
    await act(f.una, issue, "request-approval", { fields: { ask: asked.seq, bodyAt, requested: f.ownerRef } });
    const fresh = await first(b, "fresh", asked.seq);
    expect(fresh.card!.body, "A FRESH CARD shows the current text").toBe("TEST second text");
    const accepted = await press(b, "fresh", fresh, "request-changes");
    expect(accepted.answer["answer"], JSON.stringify(accepted.answer)).toBe("accepted");
    expect(b.signed.map(intent => [intent.kind, (intent.fields["bodyAt"] as FactRef).seq, intent.fields["verdict"]]), "THE PRESS BINDS the current text").toEqual([["approve", seq, "request-changes"]]);
    expect(accepted.display.receipt, "RECEIPT").toBe("Review recorded: changes requested. Signed by @rita (person).");

    const long = "TEST long text. ".repeat(50);
    const asking = await act(f.una, issue, "ask", { fields: { question: "TEST long?", body: long, brief: BRIEF.digest } });
    await act(f.una, issue, "request-approval", { fields: { ask: asking.seq, bodyAt: asking, requested: f.ownerRef } });
    const c = application(f), kept = await first(c, "long", asking.seq);
    expect([kept.card!.actions, (kept.card as unknown as { wholeText?: boolean }).wholeText], "A LONG TEXT keeps Open, and the first card offers no act").toEqual([[], undefined]);
    const noAct = await c.call("view_act", { view: "long", cut: kept.cut, action: "approve" });
    expect([noAct.isError, noAct.structuredContent["reason"], c.signed], "A LONG TEXT: a press names no act here, and signs nothing").toEqual([true, "shape", []]);
    const item = await c.call("view_read", { view: "long", cut: kept.cut, page: "item" });
    expect(shown(item.structuredContent).card!.actions.map(action => action.id), "A LONG TEXT: Open offers both acts with the whole text").toEqual(["approve", "request-changes"]);
    expect(shown(item.structuredContent).card!.body).toBe(long);
  } finally { await f.room.done(); }
}, 180_000);


// Invariant: a card attributes its exact text's signed entry, while its receipt attributes the actual submitted envelope; agents name their membership controller.
test("signed entries and receipts name their different signers on native room rows (STAND-INS: OwnGit, WorkspaceStandIn)", async () => {
  const f = await roomOf();
  try {
    const M = f.room.platform(f.repository.membership.scope), checkerKey = fresh(keys.paul), seed = new Uint8Array(32).fill(79);
    const member = await M.did(f.person, "add-member", { idempotencyKey: crypto.randomUUID(), fields: { handle: "@check", kind: "checker" } });
    const invitation = await M.did(f.person, "invite-key", { idempotencyKey: crypto.randomUUID(), expected: await M.expected({ member }), fields: { member, kind: "checker", inviteKey: keyIdOfSecret(seed), inviteEnds: timeOf(f.room.now() + 3_600_000) } });
    await M.did(checkerKey, "enrol", { idempotencyKey: crypto.randomUUID(), on: 0, expected: await M.expected({ on: 0, member }), fields: { invitation, proof: signInvitationProof(seed, f.repository.membership, invitation, checkerKey.key) } });
    for (const role of ["agent", "checker"] as const) {
      const roster = await M.item(0), prior = roster.values[ROLE_LISTS[role]] as string[];
      await M.did(f.person, "set-actions", { idempotencyKey: crypto.randomUUID(), on: 0, expected: await M.expected({ on: 0 }), fields: { role, actions: [...prior, ...["issue.comment", "issue.approve"].filter(action => !prior.includes(action))] } });
    }
    const { inbox: _inbox, ...shared } = f.repository;
    const check = f.room.agent("actor-check", { mode: "generic", secret: checkerKey.secret, config: { service: f.owner.config.service, repository: shared, handle: "@check" } });
    await act(f.owner, "rules", "activate", { fields: { name: "issue", digest: QUESTION_BRIEF_DIGESTS.issue }, values: [canonicalize(issueQuestionsBrief)] });
    const opening = await act(f.owner, "directory", "open-issue", { fields: { definition: QUESTION_BRIEF_DIGESTS.issue, title: "TEST signer identities", conditions: ["TEST identify the signer"] } });
    const issue = ((await f.owner.ok("wait", { scope: "directory", entry: opening.seq }))["created"] as { scope: ScopeId }[])[0]!.scope;
    f.room.know(issue);
    const lane = await refOf(f.owner, issue), checkRef: MemberRef = { membership: f.repository.membership, member: "@check" };
    const identities = [
      { agent: f.owner, ref: f.ownerRef, actor: { kind: "person", name: "@rita" }, words: "@rita (person)" },
      { agent: f.una, ref: f.uva, actor: { kind: "agent", name: "@una", controller: "@rita" }, words: "@una (agent, controlled by @rita)" },
      { agent: check, ref: checkRef, actor: { kind: "checker", name: "@check" }, words: "@check (checker)" },
    ];
    const scenes = [];
    for (const [index, author] of identities.entries()) {
      const reviewer = identities[(index + 1) % identities.length]!;
      const asked = await act(author.agent, issue, "ask", { fields: { question: `TEST ${author.actor.kind}'s question`, body: `TEST text signed by ${author.actor.name}.`, brief: BRIEF.digest } });
      await act(author.agent, issue, "request-approval", { fields: { ask: asked.seq, bodyAt: asked, requested: reviewer.ref } });
      await act(reviewer.agent, issue, "comment", { fields: { about: asked, body: "TEST a different signer wrote later." } });
      const a = application(f, memoryStore(), reviewer.agent), view = `actor-${index}`;
      await a.call("view_needs_you", { view: view + "-list" });
      const list = (await a.call("view_read", { view: view + "-list" })).structuredContent["display"] as Display;
      expect(list.card!.actor, "the list attributes the opening entry, not its viewer or later writer").toEqual(author.actor);
      expect(list.card!.actorLabel).toBe("Opening act signed by");
      const opened = await a.call("view_decision", { view, subject: questionSubject(lane, asked.seq) });
      const before = (await a.call("view_read", { view })).structuredContent["display"] as Display;
      expect(before.card!.actor, "THE TEXT's envelope identifies its author, not the reviewer or the latest request's writer").toEqual(author.actor);
      expect(before.card!.actorLabel).toBe("Question text signed by");
      const result = await a.call("view_act", { view, cut: before.cut, action: "approve" });
      const after = result.structuredContent["display"] as Display;
      expect((result.structuredContent["result"] as { structuredContent: Record<string, unknown> }).structuredContent["answer"]).toBe("accepted");
      expect(after.receipt, "THE RECEIPT identifies its different signer from the actual custody envelope").toBe(`Review recorded: approved. Signed by ${reviewer.words}.`);
      expect(after.context.receipt).toContain(`Signed by ${reviewer.words}.`);
      expect(a.signed.map(intent => [intent.kind, intent.actor])).toEqual([["approve", reviewer.agent === check ? checkerKey.key : reviewer.agent === f.una ? keyIdOfSecret(f.una.secret) : f.person.key]]);
      const refreshed = (await a.call("view_read", { view, cut: after.cut, page: "summary", refresh: true })).structuredContent["display"] as Display;
      expect(refreshed.receipt).toBe(after.receipt);
      scenes.push({ kind: author.actor.kind, actor: author.actor, receipt: after.receipt, opened, before, pressed: result, refreshed });
    }
    const record = b64url(utf8(JSON.stringify({ qualification: "Native Membership and Brief issue judgments, real Worker HTTP, read sessions, custody and card adapter. OwnGit, WorkspaceStandIn, clock and pause scheduler are stand-ins. Browser replays these displays and signs nothing.", scenes })));
    const chunks = record.match(/.{1,4096}/g)!;
    chunks.forEach((text, index) => console.log(`ACTOR-RECORD ${index} ${text}`));
    console.log(`ACTOR-RECORD end ${chunks.length} ${digestBytes(utf8(record))}`);
  } finally { await f.room.done(); }
}, 180_000);
