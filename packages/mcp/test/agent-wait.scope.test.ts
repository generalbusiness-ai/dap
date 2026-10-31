import { expect, test } from "vitest";
import type { Entry, FactRef, Intent, Item, MemberRef, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { canonicalize, isFactRef, keyIdOfSecret, same, signInvitationProof, timeOf } from "@generalbusiness/dap-bytes";
import { secretSigner, type Fetch } from "@generalbusiness/dap-client";
import { keys } from "@generalbusiness/dap-derive/testing";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, ROLE_LISTS } from "@generalbusiness/dap-platform";
import { issueQuestions, QUESTION_DIGESTS } from "@generalbusiness/dap-lanes";
import { McpService, memoryStore, type McpConfig } from "../src/index.ts";
import { created, mcpRoom, type Agent } from "./fixtures-native.ts";
import { drainScheduledFixture, nativeFixtureLifetime } from "../../scope/test/support/native-fixture-lifetime.ts";

// Real Native M8 authority, lane judgments, SQLite, Worker HTTP and read
// sessions under a TEST secret. Git, scripted clock and pause scheduler are
// the existing room fixture's stand-ins. No provider or hosted agent runs.
test("a fresh same-key session resumes only from native records; a real wait timeout records no act", async () => {
  let life!: ReturnType<typeof nativeFixtureLifetime>;
  const room = mcpRoom({ finish: "external", capture: owner => { life = owner; } });
  const owner = room.agent("owner", { mode: "generic", secret: keys.rita.secret });
  const act = async (agent: Pick<Agent, "ok">, target: string, kind: string, args: Record<string, unknown> = {}) => {
    const actions = await agent.ok("actions", { scope: target });
    const answer = await agent.ok("act", { target, kind, digest: actions["digest"], ...args, idempotencyKey: crypto.randomUUID() });
    expect(answer["answer"], `${kind}: ${JSON.stringify(answer)}`).toBe("accepted");
    return answer["fact"] as FactRef;
  };
  try {
    await created(room, owner, "generic", ARCHIVE_DEVICE_APPLICATION_COHORT.register);
    const repository = owner.config.repository!, M = room.platform(repository.membership.scope);
    expect((await M.summary()).value.definition).toBe("platform:membership@8");
    const controller: MemberRef = { membership: repository.membership, member: "@rita" };
    const member = await M.did(keys.rita, "add-member", { fields: { handle: "@una", kind: "agent", controller } });
    const seed = new Uint8Array(32).fill(72);
    const invitation = await M.did(keys.rita, "invite-key", { expected: await M.expected({ member }), fields: {
      member, kind: "agent", inviteKey: keyIdOfSecret(seed), inviteEnds: timeOf(room.now() + 3_600_000),
    } });
    await M.did(keys.una, "enrol", { on: 0, expected: await M.expected({ on: 0, member }), fields: {
      invitation, proof: signInvitationProof(seed, repository.membership, invitation, keys.una.key),
    } });
    expect(await M.item(member)).toMatchObject({ state: "active", values: { kind: "agent", role: "agent" }, parties: { controller } });
    const roster = await M.item(0), prior = roster.values[ROLE_LISTS.admin] as string[];
    await M.did(keys.rita, "set-actions", { on: 0, expected: await M.expected({ on: 0 }), fields: {
      role: "admin", actions: [...prior, ...["issue.approve", "issue.decide"].filter(action => !prior.includes(action))],
    } });
    await act(owner, "rules", "activate", { fields: { name: "issue", digest: QUESTION_DIGESTS.issue }, values: [canonicalize(issueQuestions)] });
    const opening = await act(owner, "directory", "open-issue", { fields: {
      definition: QUESTION_DIGESTS.issue, title: "TEST S5 resume from record", conditions: ["TEST initial terms"],
    } });
    const born = await owner.ok("wait", { scope: "directory", entry: opening.seq });
    expect(born["timedOut"]).toBe(false);
    const issue = (born["created"] as { scope: ScopeId }[])[0]!.scope;
    room.know(issue);

    // New service, signer wrapper, custody and Reads/session caches each time.
    // Only the same TEST key and persisted public room configuration survive.
    const fresh = (saved: McpConfig) => {
      const config = structuredClone(saved), custody = memoryStore(), requests: string[] = [], signed: Intent[] = [];
      const signer = secretSigner(keys.una.secret);
      let pauses = 0;
      const fetch: Fetch = (url, init) => { requests.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`); return room.fetch(url, init); };
      const service = new McpService({ service: config.service, fetch, mode: "generic", custody,
        signer: { key: signer.key, sign: bytes => {
          const text = new TextDecoder().decode(bytes), prefix = `${DOMAINS.intent}\n`;
          if (text.startsWith(prefix)) signed.push(JSON.parse(text.slice(prefix.length)) as Intent);
          return signer.sign(bytes);
        } }, now: room.now, every: () => () => {},
        pause: async waiting => { pauses++; room.advance(1000); await room.pause(waiting); },
        config: { read: async () => structuredClone(config), addRoot: async () => { throw new Error("S5 does not provision a new root."); } },
      });
      return { key: signer.key, requests, signed, custody, pauses: () => pauses,
        ok: async (name: string, args: Record<string, unknown> = {}) => {
          const answer = await room.wait(() => service.call(name, args));
          expect(answer.isError, `${name}: ${JSON.stringify(answer.structuredContent)}`).toBe(false);
          return answer.structuredContent;
        } };
    };
    type Session = ReturnType<typeof fresh>;
    const fact = async (agent: Pick<Agent, "ok">, scope: string, seq: number): Promise<FactRef> => {
      const step = await agent.ok("step", { scope, seq });
      const entry = step["entry"] as Entry;
      expect(entry.seq).toBe(seq); expect(entry.at.scope).toBe(scope);
      return { at: entry.at, seq, hash: step["hash"] as FactRef["hash"] };
    };
    const { inbox: _inbox, ...shared } = repository;
    const saved: McpConfig = { service: owner.config.service, repository: shared, handle: "@una" };
    {
      const first = fresh(saved);
      const own: MemberRef = { membership: repository.membership, member: "@una" };
      const offer = await act(owner, issue, "offer", { fields: { offeree: own } });
      await act(first, issue, "accept", { on: offer.seq, fields: { terms: await fact(first, issue, 0) } });
      const question = await act(first, issue, "ask", { fields: { question: "TEST choose the new terms", body: "TEST person decision required." } });
      await act(first, issue, "request-approval", { fields: { ask: question.seq, bodyAt: question, requested: controller } });
      await act(first, issue, "block", { fields: { commitment: offer.seq, on: question } });
      await drainScheduledFixture(life.platforms, life.wait);
      const before = await room.platform(issue).summary(), nativeCount = (await room.platform(issue).entries()).length;
      const signing = first.signed.length, originals = [...first.custody.records], requests = first.requests.length, clock = room.now();
      const timeout = await first.ok("wait", { scope: issue, item: question.seq, type: "ask", states: ["decided"], seconds: 1 });
      expect(timeout).toMatchObject({ timedOut: true, polls: 1 });
      expect(first.pauses()).toBe(1); expect(room.now() - clock).toBe(1000);
      expect(await room.platform(issue).summary()).toEqual(before);
      expect((await room.platform(issue).entries()).length).toBe(nativeCount);
      expect(first.signed.length).toBe(signing); expect([...first.custody.records]).toEqual(originals);
      expect(first.requests.slice(requests).some(request => request.startsWith("POST ") && /\/(acts|prepare)(\/|$)/.test(request))).toBe(false);
      // One injected scheduler interval represents one second. No wall sleep,
      // no claim of zero auth-session storage writes or physical drain.
    }

    // The owner also reads the question/request from the record, then decides
    // and offers current terms. No first-session progress object survives.
    const live = (await owner.ok("inspect", { scope: issue }))["items"] as Item[];
    const question = live.find(item => item.type === "ask" && item.state === "asked")!;
    const request = live.find(item => item.type === "approval-request" && item.state === "open")!;
    const bodyAt = await fact(owner, issue, typeof question.refs["bodyAt"] === "number" ? question.refs["bodyAt"] : (question.refs["bodyAt"] as FactRef).seq);
    await act(owner, issue, "approve", { fields: { request: request.id, bodyAt, verdict: "approve" } });
    await act(owner, issue, "decide", { on: question.id, fields: { bodyAt } });
    await act(owner, issue, "revise", { on: 0, fields: { conditions: ["TEST new terms after the decision"] } });
    await act(owner, issue, "offer", { fields: { offeree: { membership: repository.membership, member: "@una" } } });
    await drainScheduledFixture(life.platforms, life.wait);
    const membershipHead = (await M.summary()).at;

    const resume = async (agent: Session) => {
      const orientation = await agent.ok("room");
      expect(orientation["cursor"]).toBeUndefined();
      const lane = (orientation["lanes"] as { scope: ScopeId; kind: string; digest: string }[]).find(row => row.kind === "issue" && row.digest === QUESTION_DIGESTS.issue)!;
      expect(lane).toBeDefined();
      const inspected = await agent.ok("inspect", { scope: lane.scope });
      expect(inspected["cursor"]).toBeUndefined();
      const at = inspected["ref"] as ScopeRef;
      const standing = (orientation["standing"] as { key: string; handle: string }[]).find(row => row.key === agent.key)!;
      const membership = (await agent.ok("inspect", { scope: "membership" }))["ref"] as ScopeRef;
      const viewer = { membership, member: standing.handle };
      const items = async (type: string, final = false): Promise<Item[]> => {
        const all: Item[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < 4; page++) {
          const read = await agent.ok("items", { scope: at.scope, type, final, ...(cursor ? { cursor } : {}) });
          all.push(...read["items"] as Item[]); cursor = read["cursor"] as string | undefined;
          if (!cursor) return all;
        }
        throw new Error("S5 record reconstruction exceeded four pages.");
      };
      const local = (ref: unknown): number => {
        if (Number.isSafeInteger(ref) && Number(ref) >= 0) return Number(ref);
        if (isFactRef(ref) && same(ref.at, at)) return ref.seq;
        throw new Error("The recorded S5 reference is unavailable.");
      };
      const commitments = await items("commitment"), blocks = await items("block");
      const block = blocks.find(item => item.state === "blocked" && commitments.some(commitment => commitment.id === local(item.refs["commitment"]) && same(commitment.parties["performer"], viewer)))!;
      expect(block).toBeDefined();
      const asked = (await items("ask", true)).find(item => item.id === local(block.refs["on"]) && item.state === "decided")!;
      expect(asked).toBeDefined();
      const decision = await fact(agent, at.scope, local(asked.refs["decisionAt"]));
      const decisionRead = (await agent.ok("step", { scope: at.scope, seq: decision.seq }))["entry"] as Entry;
      expect(decisionRead.input).toMatchObject({ type: "act", signed: { intent: { kind: "decide", on: asked.id } } });
      const offered = commitments.find(item => item.state === "offered" && same(item.parties["offeree"], viewer))!;
      expect(offered).toBeDefined();
      const terms = await fact(agent, at.scope, local(offered.refs["termsAt"]));
      expect(agent.signed).toEqual([]);
      expect(agent.requests.some(request => request.startsWith("POST ") && request.endsWith("/sessions"))).toBe(true);
      await act(agent, at.scope, "accept", { on: offered.id, fields: { terms } });
      await act(agent, at.scope, "release-block", { on: block.id, fields: { commitment: local(block.refs["commitment"]), answer: decision } });
      expect((await items("block", true)).find(item => item.id === block.id)).toMatchObject({ state: "released" });
      expect((await items("commitment")).find(item => item.id === offered.id)).toMatchObject({ state: "accepted", refs: { termsAt: terms.seq } });
    };
    const restarted = fresh(structuredClone(saved));
    await resume(restarted);
    expect(restarted.key).toBe(keys.una.key);
    expect(restarted.signed.map(intent => intent.kind)).toEqual(["accept", "release-block"]);
    expect(restarted.signed.every(intent => intent.actor === keys.una.key)).toBe(true);
    expect((await M.summary()).at).toEqual(membershipHead);
  } finally {
    // Join the actual owned Native callback frontier before releasing settings.
    // A failed join preserves ownership by throwing before release.
    await drainScheduledFixture(life.platforms, life.wait);
    life.release();
  }
}, 90_000);
