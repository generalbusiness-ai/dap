/**
 * The hosted loop's phases on real scopes: the script's agent and person phases, one after the other, through the production app
 * Worker's fetch, with the hosted default tools and the pinned MCP client. What is real and what stands in is the room fixture's
 * table (`support/room.ts`). The Git host is the STAND-IN `OwnGit`, the scheduler is the fixture's `pause`, and the clock is scripted.
 * The room's register holds the keys policy here. The script's `owner`, `create` and `invite-agent` phases, and its homes, run in
 * `examples/repo-in-ai/hosted-loop/local-run.mjs` against a local Worker. No hosted agent on a deployment runs in this file.
 */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import type { FactRef, MemberId } from "@generalbusiness/dap-contract";
import { b64url, timeOf } from "@generalbusiness/dap-bytes";
import { encodeAgentKeyInvitation, invitationIssueFields, type AgentKeyInvitation } from "@generalbusiness/dap-client";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as cohort } from "@generalbusiness/dap-platform";
import worker from "../../../apps/room/worker.ts";
import { hostedRegistries, hostedTest } from "../../scope/test/worker.ts";
import { created as createRoom, mcpRoom, SERVICE, type Agent, type Room } from "./fixtures-native.ts";
import { agentPhase } from "../../../examples/repo-in-ai/hosted-loop/agent.ts";
import { createAgent } from "../../../examples/repo-in-ai/hosted-loop/control.ts";
import { openHosted } from "../../../examples/repo-in-ai/hosted-loop/hosted-client.ts";
import { HostedSession } from "../../../examples/repo-in-ai/hosted-loop/hosted-session.ts";
import { personPhase, type PersonPort } from "../../../examples/repo-in-ai/hosted-loop/person.ts";
import { publicLine, scanPublic, type PublicResult } from "../../../examples/repo-in-ai/hosted-loop/public.ts";
import { LoopStop, TEXT, type AgentPhase, type PersonPhase } from "../../../examples/repo-in-ai/hosted-loop/words.ts";

// workerd's Request has no `redirect: "error"`. This fixture never redirects, and the script keeps that setting on a real network.
const routed = (url: string | URL, init: RequestInit = {}): Promise<Response> => {
  const { redirect: _redirect, ...rest } = init;
  return worker.fetch(new Request(url, rest), { ...env, REGISTRIES: hostedRegistries(env.REGISTRIES), SCOPES: env.PLATFORM, MCP_ENABLED: "true" } as never);
};
const AGENT = "@agent";

/** The person's session in the fixture: `act` on the same local service, with its own key and home. */
function personOn(rita: Agent): PersonPort {
  return {
    read: (name, args) => rita.ok(name, args),
    act: async (phase, target, digest, kind, input) => {
      const answer = await rita.ok("act", { target: target.scope, digest, kind, fields: input.fields, ...(input.on === undefined ? {} : { on: input.on }), ...(input.values ? { values: input.values } : {}), idempotencyKey: `person-${phase}` });
      expect(answer["answer"], `${phase}: ${JSON.stringify(answer)}`).toBe("accepted");
      return answer["fact"] as FactRef;
    },
  };
}

/** An admin's two acts and the agent-key link: a fixture for `invite-agent`, whose engine runs in the local run. */
async function inviteLink(room: Room, rita: Agent): Promise<{ link: string; secret: string }> {
  const membership = rita.config.repository!.membership, definition = "platform:membership@8" as AgentKeyInvitation["definition"];
  const added = await rita.ok("member.add", { fields: { handle: AGENT, kind: "agent", controller: "@rita" }, idempotencyKey: "add-agent" });
  expect(added["answer"], JSON.stringify(added)).toBe("accepted");
  const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const invited = await rita.ok("key.invite", { fields: { member: (added["fact"] as FactRef).seq, kind: "agent", ...invitationIssueFields(definition, secret), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: "invite-agent" });
  expect(invited["answer"], JSON.stringify(invited)).toBe("accepted");
  const items = (await rita.ok("inspect", { scope: "membership" }))["items"] as { type: string; revision: number; values: Record<string, unknown> }[];
  const { inbox: _inbox, ...repository } = rita.config.repository!;
  const invitation: AgentKeyInvitation = { v: 1, kind: "agent-key", service: SERVICE, repository, definition, handle: AGENT, controller: { membership, member: "@rita" as MemberId },
    member: added["fact"] as FactRef, invitation: invited["fact"] as FactRef, secret,
    expected: { on: items.find(item => item.type === "roster")!.revision, member: items.find(item => item.type === "member" && item.values["handle"] === AGENT)!.revision } };
  return { link: encodeAgentKeyInvitation(invitation), secret };
}

test("the hosted loop's phases reach a proposal on the default tools, each from a new session that holds only the bearer", async () => {
  const room = mcpRoom();
  hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
  const previous = hostedTest.toolSettings;
  hostedTest.toolSettings = { MCP_ENABLED: "true" };
  hostedTest.now = () => room.now();
  hostedTest.pause = async waiting => { room.advance(1000); await room.pause(waiting); };
  try {
    const rita = room.agent("rita", { mode: "add" });
    await createRoom(room, rita, "default", cohort.register);
    const person = personOn(rita), transcript: PublicResult[] = [];
    const personRun = async (phase: PersonPhase) => { const result = await room.wait(() => personPhase(phase, person, AGENT)); transcript.push(result); return result; };

    await personRun("roles"); await personRun("rules"); await personRun("activate-issue"); await personRun("activate-change");
    const { link, secret } = await inviteLink(room, rita);
    const secretKey = rita.secret;
    const issued = await room.wait(() => createAgent(routed as never, { secret: secretKey, now: room.now }, SERVICE, rita.config.repository!.membership, link));
    expect(issued.state).toBe("issued");
    const bearer = (issued as { bearer: string }).bearer;
    await personRun("open-issue"); await personRun("offer");

    // The agent's only road: the Worker's /mcp, as the script's client sends it. Every other address stops the phase.
    const requests: string[] = [];
    const fetchPort = (async (url: string | URL | Request, init?: RequestInit) => { requests.push(new URL(url instanceof Request ? url.url : url).pathname); return routed(url instanceof Request ? url.url : url, init); }) as typeof fetch;
    const sessions: (string | null)[] = [];
    const agentRun = async (phase: AgentPhase, mode: "new" | "check" | "continue" = "new") => {
      const port = await room.wait(() => openHosted(SERVICE, bearer, fetchPort));
      const waited = { listTools: (c?: string) => room.wait(() => port.listTools(c)), getPrompt: (n: string, a: Record<string, string>) => room.wait(() => port.getPrompt(n, a)), callTool: (n: string, a: Record<string, unknown>) => room.wait(() => port.callTool(n, a)), sessionId: () => port.sessionId(), close: () => room.wait(() => port.close()) };
      const session = new HostedSession(waited);
      try {
        const result = await agentPhase(phase, session, mode).catch((error: unknown) => { if (error instanceof LoopStop) return { stopped: error.word }; throw error; });
        expect(result, phase).not.toHaveProperty("stopped");
        sessions.push(session.sessionDigest());
        transcript.push(result as PublicResult);
        return { result: result as PublicResult, session };
      } finally { await session.close(); }
    };

    const listed = await agentRun("agent-tools");
    expect(listed.result.values?.["listed"]).toBeGreaterThan(listed.result.values?.["generic"] as number);
    await agentRun("agent-accept"); await agentRun("agent-ask"); await agentRun("agent-request"); await agentRun("agent-block");
    await agentRun("agent-wait-open");
    await personRun("approve"); await personRun("decide"); await personRun("revise"); await personRun("offer-new");
    await agentRun("agent-wait");
    const resumed = await agentRun("agent-resume");
    expect(resumed.session.calls.filter(name => name.includes(".")), "the fresh session rebuilds and signs nothing").toEqual([]);
    await agentRun("agent-accept-new"); await agentRun("agent-release");
    await agentRun("agent-open-change"); await agentRun("agent-link"); await agentRun("agent-propose");
    const verified = await agentRun("agent-verify");
    expect(verified.result.values?.["issueOrder"]).toEqual(["offer", "accept", "ask", "request-approval", "block", "approve", "decide", "revise", "offer", "accept", "release-block"]);
    expect(verified.result.values?.["changeOrder"]).toEqual(["link-own", "propose-file"]);
    expect(verified.result.values?.["driver"]).toBe("script");
    expect(verified.result.values?.["baseIsHead"], "the stand-in Git host's head is the base the proposal signed").toBe(true);
    expect(verified.result.values?.["standIn"]).toBe(false);
    expect(verified.result.values?.["modelChoseStep"]).toBe(false);

    // A rerun from a new session finds each original by its key on the agent object. It reuses the fact and adds no entry.
    for (const phase of ["agent-accept", "agent-ask", "agent-request", "agent-block", "agent-accept-new", "agent-release", "agent-open-change", "agent-link", "agent-propose"] as const) {
      const first = transcript.find(row => row.phase === phase)!;
      const again = await agentRun(phase, "check");
      expect(again.result.facts, phase).toEqual(first.facts);
      expect(again.result.values?.["reused"], phase).toBe(true);
      expect(again.session.calls.filter(name => name.includes(".")), phase).toEqual([]);
    }
    expect((await agentRun("agent-verify")).result.values?.["entries"], "the reruns added no entry").toBe(verified.result.values?.["entries"]);

    expect(new Set(requests)).toEqual(new Set(["/mcp"]));
    expect(new Set(sessions).size, "each phase opened its own session").toBe(sessions.length);
    expect(sessions.every(id => id !== null)).toBe(true);
    const lines = transcript.map(publicLine).join("");
    expect(scanPublic(lines, [bearer, bearer.slice(bearer.indexOf(".") + 1), link, secret, b64url(secretKey), TEXT.body, TEXT.question, TEXT.comment, TEXT.content, ...TEXT.conditions, ...TEXT.newConditions])).toEqual([]);
  } finally { hostedTest.toolSettings = previous; hostedTest.now = null; hostedTest.clientRegistry = null; hostedTest.pause = null; room.done(); }
}, 90_000);
