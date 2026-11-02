/** Real native births, member authority, SQLite, delivery and first-head rules.
 * The clock, setup read inspector and Git host answers are TEST fixtures.
 * No GitHub installation, celld deployment or real Git write runs here. */
import { expect, test } from "vitest";
import type { Intent, ScopeId, Seed } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, isSeed, scopeIdOf, signIntent, textDigest } from "@generalbusiness/dap-bytes";
import { invitationIssueFields, invitationRedemptionFields } from "@generalbusiness/dap-client";
import { firstHeadCommit, REPOSITORY_BINDING_COHORT as B } from "@generalbusiness/dap-platform";
import { issueDemo, DEMO_DIGESTS } from "../../../apps/room/lanes/src/index.ts";
import { driveFixture, nativeFixtureLifetime } from "./fixtures-native.ts";
import { soon } from "./net.ts";
import { rita, sam, vic } from "./repository.ts";
import { beginSessionFixture } from "./session-settings.ts";

test("native room content survives administrator binding and first-head publication; an enrolled member cannot bind", async () => {
  const life = nativeFixtureLifetime(beginSessionFixture({ secret: null, sessions: false, inspector: null }), { required: false });
  const nodes = new Map<ScopeId, ReturnType<typeof life.platform>>();
  const track = (name: ScopeId) => {
    let node = nodes.get(name);
    if (!node) { if (nodes.size >= 32) throw Error("Binding fixture scope bound"); node = life.platform(name); nodes.set(name, node); }
    return node;
  };
  life.setHold(envelope => { if (isSeed(envelope.to)) track(scopeIdOf(envelope.to)); return false; });
  const settle = async () => {
    for (let round = 0; round < 32; round++) {
      const before = nodes.size;
      await driveFixture([...nodes.values()], life.wait);
      let callbacks = 0;
      for (const node of nodes.values()) {
        const joined = await life.wait(() => (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks());
        if (!Number.isSafeInteger(joined.callbacks) || joined.callbacks < 0 || joined.callbacks > 256) throw Error("Binding fixture callback bound");
        callbacks += joined.callbacks;
      }
      if (nodes.size === before && callbacks === 0) return;
    }
    throw Error("Binding fixture did not settle");
  };
  try {
    const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {},
      fields: { host: "none", namespace: "", policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const seed: Seed = { v: 1, kind: "register", definition: B.register, creator: null, cause: intentDigest(install), ordinal: 0 };
    const R = track(scopeIdOf(seed));
    expect(await life.wait(() => R.stub.create(signIntent(install, rita.secret), B.register))).toMatchObject({ answer: "accepted" });
    await life.wait(async () => R.did(rita, "found", { expected: await R.expected({ register: 0 }), fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } }));
    await settle();
    const found = (await life.wait(() => R.entries())).find(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "found")!;
    const directory = found.sends.find(send => isSeed(send.to) && send.to.kind === "directory")!;
    const D = track(scopeIdOf(directory.to as Seed));
    const children = (await life.wait(() => D.entries()))[0]!.sends.filter(send => isSeed(send.to));
    const child = (kind: string) => track(scopeIdOf(children.find(send => (send.to as Seed).kind === kind)!.to as Seed));
    const M = child("membership"), A = child("rules"), G = child("destination");
    const seat = await life.wait(async () => M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    const invitationSecret = b64url(new Uint8Array(32).fill(17));
    const invitation = await life.wait(async () => M.did(rita, "invite-member", { fields: {
      handle: "@member", role: "member", ...invitationIssueFields(B.membership, invitationSecret), inviteEnds: soon(3600),
    } }));
    await life.wait(async () => M.did(vic, "join", { fields: invitationRedemptionFields(B.membership, await M.at(), invitation, vic.key, invitationSecret) }));
    await settle();
    await life.wait(async () => {
      const intent = await A.intent(rita, "activate", { fields: { digest: DEMO_DIGESTS.issue, name: "issue" } });
      expect(await A.stub.submit(intent, [], { values: [canonicalize(issueDemo)] })).toMatchObject({ answer: "accepted" });
    });
    const body = "TEST issue written before a repository is bound.";
    const opened = await life.wait(async () => D.stub.submit(await D.intent(rita, "open-issue", {
      expected: await D.expected({ repository: 0 }), fields: { definition: DEMO_DIGESTS.issue, title: "TEST before binding", body: textDigest(body), conditions: ["Keep this content"] },
    }), [], { values: [canonicalize(issueDemo)], texts: [body] }));
    expect(opened).toMatchObject({ answer: "accepted" });
    await settle();
    const opening = (await life.wait(() => D.entries())).find(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "open-issue")!;
    const I = track(scopeIdOf(opening.sends.find(send => isSeed(send.to) && send.to.kind === "lane")!.to as Seed));
    const contentBefore = await life.wait(() => I.entries()), directoryBefore = await life.wait(() => D.entries());
    expect((await life.wait(() => G.item(0))).state).toBe("unpublished");
    const repository = { host: "github.com", namespace: "TEST-account", name: "TEST-repo", id: "71" };
    const bind = async (who: typeof rita) => life.wait(async () => G.act(who, "bind-repository", {
      on: 0, expected: await G.expected({ on: 0 }), fields: { repository, why: "TEST attach this existing room" },
    }));
    let publish = false, minted = false, commit = "";
    const calls: string[] = [];
    life.outside(G.name, given => ({
      accepts: (_owner, kind) => publish && (kind === "first-head" || kind === "mint" && !minted || kind === "revoke"),
      send: async request => {
        life.active(); calls.push(request.kind);
        if (request.kind === "mint") { minted = true; return { result: "confirmed", evidence: { basis: "own-answer", body: { token: "TEST-binding-token", ends: soon(600) } } }; }
        if (request.kind === "revoke") return { result: "confirmed", evidence: { basis: "own-answer", body: { token: "TEST-binding-token" } } };
        if (request.kind !== "first-head") return expect.fail("Only declared fixture effects reach this port");
        commit = firstHeadCommit(given.state, given.own, given.state.operation(request.operation)!, "sha1");
        return { result: "confirmed", evidence: { basis: "own-answer", body: { send: "accepted", seen: commit } } };
      },
    }));
    await G.restart();
    // Hold the scripted Git port while testing authority. An erroneously
    // accepted member act must fail the assertion without starting a host task.
    expect(await bind(vic)).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect((await life.wait(() => G.item(0))).values["repository"]).toBeNull();
    publish = true;
    expect(await bind(rita)).toMatchObject({ answer: "accepted" });
    await settle();
    expect(commit).toMatch(/^[0-9a-f]{40}$/);
    expect(await life.wait(() => G.item(0))).toMatchObject({ state: "ready", values: { repository, head: commit } });
    expect(await life.wait(() => D.item(0))).toMatchObject({ values: { repository } });
    expect(await life.wait(() => I.entries())).toEqual(contentBefore);
    expect((await life.wait(() => D.entries())).slice(0, directoryBefore.length)).toEqual(directoryBefore);
    expect(calls.filter(kind => kind === "mint")).toHaveLength(1);
    expect(calls.filter(kind => kind === "first-head")).toHaveLength(1);
    expect(await bind(rita)).toMatchObject({ answer: "refused", reason: "guard-failed" });
  } finally { await settle(); life.release(); }
});
