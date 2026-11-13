/** Real Native creation, Membership authority, SQLite and invitation proof.
 * Clock and read-session inspector are explicit TEST fixtures. Host none
 * starts no Git provider, deployment, consent page or OAuth issuer. */
import { expect, test } from "vitest";
import type { Intent, MemberId, ScopeId, Seed } from "@generalbusiness/dap-contract";
import { b64url, intentDigest, isSeed, scopeIdOf, signIntent, timeOf, timeMs } from "@generalbusiness/dap-bytes";
import { agentKeyInvitationOf, encodeAgentKeyInvitation, invitationIssueFields, invitationRedemptionFields, secretSigner, type Fetch } from "@generalbusiness/dap-client";
import { enrolAgentKey, memoryStore } from "../../cli/src/index.ts";
import { issueOwnAgentInvitation } from "../../cli/src/browser.ts";
import { OWN_AGENT_COHORT as C } from "@generalbusiness/dap-platform";
import { driveFixture, nativeFixtureLifetime } from "./fixtures-native.ts";
import { soon } from "./net.ts";
import { rita, sam, una, vic, routed } from "./repository.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { net, ScriptedClock } from "../src/testing.ts";
import { reader } from "./support.ts";

test("own-agent creation checks the controller, live role subset and eight active agents on Native Membership", async () => {
  const previousClock = net.clock;
  net.clock = new ScriptedClock(timeOf(Date.now()));
  const life = nativeFixtureLifetime(beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader }));
  const nodes = new Map<ScopeId, ReturnType<typeof life.platform>>();
  const track = (name: ScopeId) => {
    let node = nodes.get(name);
    if (!node) { if (nodes.size >= 32) throw Error("Own-agent fixture scope bound"); node = life.platform(name); nodes.set(name, node); }
    return node;
  };
  life.setHold(envelope => { if (isSeed(envelope.to)) track(scopeIdOf(envelope.to)); return false; });
  const settle = () => driveFixture([...nodes.values()], life.wait);
  try {
    const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {},
      fields: { host: "none", namespace: "", policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const seed: Seed = { v: 1, kind: "register", definition: C.register, creator: null, cause: intentDigest(install), ordinal: 0 };
    const R = track(scopeIdOf(seed));
    expect(await life.wait(() => R.stub.create(signIntent(install, rita.secret), C.register))).toMatchObject({ answer: "accepted" });
    await life.wait(async () => R.did(rita, "found", { expected: await R.expected({ register: 0 }), fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } }));
    await settle();
    const found = (await life.wait(() => R.entries())).find(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "found")!;
    const directory = found.sends.find(send => isSeed(send.to) && send.to.kind === "directory")!;
    expect((directory.to as Seed).definition).toBe(C.directory);
    const D = track(scopeIdOf(directory.to as Seed));
    const children = (await life.wait(() => D.entries()))[0]!.sends.filter(send => isSeed(send.to));
    const membership = children.find(send => (send.to as Seed).kind === "membership")!.to as Seed;
    expect(membership.definition).toBe(C.membership);
    expect((children.find(send => (send.to as Seed).kind === "destination")!.to as Seed).definition).toBe(C.destination);
    const M = track(scopeIdOf(membership));
    const seat = await life.wait(async () => M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    const personSecret = b64url(new Uint8Array(32).fill(21));
    const personInvitation = await life.wait(() => M.did(rita, "invite-member", { fields: {
      handle: "@vic", role: "member", ...invitationIssueFields(C.membership, personSecret), inviteEnds: soon(3600),
    } }));
    await life.wait(async () => M.did(vic, "join", { fields: invitationRedemptionFields(C.membership, await M.at(), personInvitation, vic.key, personSecret) }));
    const checker = await life.wait(() => M.did(rita, "add-member", { fields: { handle: "@checker", kind: "checker" } }));
    const checkerSecret = b64url(new Uint8Array(32).fill(22));
    const checkerInvitation = await life.wait(async () => M.did(rita, "invite-key", { expected: await M.expected({ member: checker }), fields: {
      member: checker, kind: "checker", ...invitationIssueFields(C.membership, checkerSecret), inviteEnds: soon(3600),
    } }));
    await life.wait(async () => M.did(una, "enrol", { on: 0, expected: await M.expected({ on: 0, member: checker }), fields: invitationRedemptionFields(C.membership, await M.at(), checkerInvitation, una.key, checkerSecret) }));
    const add = (who: typeof rita, handle: string, controller = "@vic") => life.wait(async () => M.act(who, "add-own-agent", { fields: { handle, kind: "agent", controller: { membership: await M.at(), member: controller as MemberId } } }));
    const invite = (who: typeof rita, member: number, secret: string, revision?: number, ends = soon(3600)) => life.wait(async () => M.act(who, "invite-own-agent-key", { expected: revision === undefined ? await M.expected({ member }) : { member: revision }, fields: {
      member, kind: "agent", ...invitationIssueFields(C.membership, secret), inviteEnds: ends,
    } }));
    expect(await add(una, "@checker-agent", "@checker")).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect(await add(vic, "@other-controller", "@rita")).toMatchObject({ answer: "refused", reason: "guard-failed", name: "not-controller" });
    const originalActions = (await life.wait(() => M.item(0))).values["agentActions"] as string[];
    const setActions = (actions: readonly string[]) => life.wait(async () => M.did(rita, "set-actions", { on: 0, expected: await M.expected({ on: 0 }), fields: { role: "agent", actions: [...actions] } }));
    const wider = [...originalActions, "change.check"];
    await setActions(wider);
    expect(await add(vic, "@too-wide")).toMatchObject({ answer: "refused", reason: "guard-failed", name: "agent-role-wider" });
    const admin = await add(rita, "@admin-agent", "@rita");
    expect(admin).toMatchObject({ answer: "accepted" });
    expect(await invite(rita, (admin as Extract<typeof admin, { answer: "accepted" }>).receipt.fact.seq, b64url(new Uint8Array(32).fill(23)))).toMatchObject({ answer: "accepted" });
    await setActions(originalActions);
    const added = await add(vic, "@first-agent");
    expect(added).toMatchObject({ answer: "accepted" });
    if (added.answer !== "accepted") return;
    const member = added.receipt.fact.seq;
    const agentItem = await life.wait(() => M.item(member));
    expect(agentItem).toMatchObject({ state: "active", values: { role: "agent", kind: "agent" }, parties: { controller: { membership: await life.wait(() => M.at()), member: "@vic" } } });
    const agentSecret = b64url(new Uint8Array(32).fill(24));
    await setActions(wider);
    expect(await invite(vic, member, agentSecret)).toMatchObject({ answer: "refused", reason: "guard-failed", name: "agent-role-wider" });
    await setActions(originalActions);
    expect(await invite(rita, member, agentSecret)).toMatchObject({ answer: "refused", reason: "guard-failed", name: "not-controller" });
    expect(await invite(una, member, agentSecret)).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect(await invite(vic, member, agentSecret, undefined, soon(24 * 3600 + 1))).toMatchObject({ answer: "refused", reason: "guard-failed", name: "own-agent-invitation-window" });
    expect(await invite(vic, member, agentSecret, undefined, soon(0))).toMatchObject({ answer: "refused", reason: "guard-failed", name: "own-agent-invitation-window" });
    const invited = await invite(vic, member, agentSecret, undefined, soon(24 * 3600));
    expect(invited).toMatchObject({ answer: "accepted" });
    if (invited.answer !== "accepted") return;
    expect(await invite(vic, member, b64url(new Uint8Array(32).fill(27)))).toMatchObject({ answer: "refused", reason: "guard-failed", name: "own-agent-key-limit" });
    await settle();
    const membershipRef = await life.wait(() => M.at());
    const enrolExpected = await life.wait(() => M.expected({ on: 0, member }));
    const link = encodeAgentKeyInvitation({ v: 1, kind: "agent-key", service: "https://scopes.test",
      repository: { directory: await life.wait(() => D.at()), membership: membershipRef,
        rules: scopeIdOf(children.find(send => (send.to as Seed).kind === "rules")!.to as Seed),
        destination: scopeIdOf(children.find(send => (send.to as Seed).kind === "destination")!.to as Seed) },
      definition: C.membership, handle: "@first-agent", controller: { membership: membershipRef, member: "@vic" },
      member: added.receipt.fact, invitation: invited.receipt.fact, secret: agentSecret,
      expected: { on: enrolExpected["on"]!, member: enrolExpected["member"]! },
    });
    const store = memoryStore();
    const enrolled = await life.wait(() => enrolAgentKey({ store,
      fetch: (async (url, init) => life.wait(() => routed(url, init))) as Fetch,
      pause: async () => { await settle(); },
    }, link));
    expect(enrolled).toMatchObject({ code: 0 });
    expect((await store.config())?.handle).toBe("@first-agent");
    expect(await invite(vic, member, b64url(new Uint8Array(32).fill(28)))).toMatchObject({ answer: "refused", reason: "guard-failed", name: "own-agent-key-limit" });
    // The ordinary member uses the production retained issuer. The signer
    // and one-second clock skew are explicit TEST ports; Native owns acts.
    const issuerBase = memoryStore(), privateRequests: string[] = [];
    await issuerBase.save({ v: 2, service: "https://scopes.test", key: "browser", handle: "@vic",
      repository: agentKeyInvitationOf(link)!.repository });
    const issuerStore = { ...issuerBase,
      signer: async () => secretSigner(vic.secret),
      secret: async (): Promise<never> => { throw Error("The issuer must not export a seed"); },
      keepPrivate: async (name: string, bytes: Uint8Array) => { await issuerBase.keepPrivate(name, bytes); privateRequests.push(name); },
    };
    let loseOpening = true, actPosts = 0;
    const issuerFetch = (async (url, init) => {
      const response = await life.wait(() => routed(url, init));
      if (init?.method === "POST" && new URL(String(url)).pathname.endsWith("/acts")) {
        actPosts++;
        await settle();
        if (loseOpening) { loseOpening = false; await response.body?.cancel(); throw Error("TEST lost accepted opening response"); }
      }
      return response;
    }) as Fetch;
    const issueContext = { store: issuerStore, fetch: issuerFetch, pause: async () => { await settle(); },
      now: () => timeMs(net.clock.now)! + 1000 };
    const issueInput = { handle: "@issued-agent", hours: 1, controller: { membership: membershipRef, member: "@vic" as MemberId } };
    const operation = crypto.randomUUID();
    const firstIssue = await life.wait(() => issueOwnAgentInvitation(issueContext, issueInput, { operation, privateRequests: [], mode: "new" }));
    expect(firstIssue).toMatchObject({ kind: "own-agent-key", state: "unknown" });
    expect(actPosts).toBe(1);
    const checkedIssue = await life.wait(() => issueOwnAgentInvitation(issueContext, issueInput, { operation, privateRequests: [...privateRequests], mode: "check" }));
    expect(checkedIssue).toMatchObject({ kind: "own-agent-key", state: "prepared" });
    expect(actPosts).toBe(1);
    const continuedIssue = await life.wait(() => issueOwnAgentInvitation(issueContext, issueInput, { operation, privateRequests: [...privateRequests], mode: "continue" }));
    expect(continuedIssue).toMatchObject({ kind: "own-agent-key", state: "verified" });
    expect(actPosts).toBe(2);
    const issuedLink = agentKeyInvitationOf(continuedIssue.link!)!;
    expect(issuedLink).toMatchObject({ definition: C.membership, handle: "@issued-agent", controller: issueInput.controller });
    const issuedEntries = await life.wait(() => M.entries());
    expect(issuedEntries[issuedLink.member.seq]!.input).toMatchObject({ type: "act", signed: { intent: { kind: "add-own-agent" } } });
    expect(issuedEntries[issuedLink.invitation.seq]!.input).toMatchObject({ type: "act", signed: { intent: { kind: "invite-own-agent-key" } } });
    const issuedInvitation = await life.wait(() => M.item(issuedLink.invitation.seq));
    expect(timeMs(issuedInvitation.values["inviteEnds"] as string)! - timeMs(net.clock.now)!).toBeGreaterThanOrEqual(3600_000);
    expect(timeMs(issuedInvitation.values["inviteEnds"] as string)! - timeMs(net.clock.now)!).toBeLessThanOrEqual(3601_000);
    const issuedStore = memoryStore();
    expect(await life.wait(() => enrolAgentKey({ store: issuedStore, fetch: issuerFetch,
      pause: async () => { await settle(); } }, continuedIssue.link!))).toMatchObject({ code: 0 });
    expect((await issuedStore.config())?.handle).toBe("@issued-agent");
    for (let n = 3; n <= 8; n++) expect(await add(vic, `@agent-${n}`)).toMatchObject({ answer: "accepted" });
    expect(await add(vic, "@ninth-agent")).toMatchObject({ answer: "refused", reason: "guard-failed", name: "own-agent-limit" });
    const beforeRemoval = await life.wait(() => M.item(member));
    await life.wait(async () => M.did(rita, "remove-member", { on: member, expected: await M.expected({ on: member }) }));
    expect(await invite(vic, member, b64url(new Uint8Array(32).fill(26)), beforeRemoval.revision + 1)).toMatchObject({ answer: "refused", reason: "guard-failed", name: "member-removed" });
    expect(await add(vic, "@replacement-agent")).toMatchObject({ answer: "accepted" });
  } finally { await settle(); life.release(); net.clock = previousClock; }
});
