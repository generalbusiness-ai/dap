/** Production Worker OAuth routes, registry, hosted agent and Native scopes.
 * Session inspector, clock, signer custody and scheduling are explicit TEST
 * ports. No browser, deployed host or real Git provider belongs here. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { ControlAction, FactRef, MemberId } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, keyIdOfSecret, signControlWith, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { INVITATION_LINK, encodeAgentKeyInvitation, invitationIssueFields, secretSigner, signedIntent } from "@generalbusiness/dap-client";
import { OWN_AGENT_COHORT } from "@generalbusiness/dap-platform";
import { issueOwnAgentInvitation } from "../../cli/src/browser.ts";
import { memoryStore } from "../../cli/src/store.ts";
import { hostedTest } from "../../scope/test/worker.ts";
import { mcpRoute } from "../../scope/src/worker.ts";
import worker from "../../../apps/room/worker.ts";
import { created, mcpRoom, SERVICE, type Agent, type Room } from "./fixtures-native.ts";
import type { OAuthBinding } from "../src/oauth-parameters.ts";

const REDIRECT = "https://claude.ai/api/mcp/auth_callback", RESOURCE = SERVICE + "/mcp", VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const routed = (path: string, init?: RequestInit) => worker.fetch(new Request(SERVICE + path, init), { ...env, SCOPES: env.PLATFORM, MCP_ENABLED: "true" });

test("closed or malformed OAuth policy refuses new routes before namespace lookup", async () => {
  let lookups = 0;
  const tripwire = { idFromName: () => { lookups++; throw Error("Unexpected namespace lookup"); }, idFromString: () => { lookups++; throw Error("Unexpected namespace lookup"); } };
  const paths = ["/.well-known/oauth-authorization-server", "/oauth/authorize", "/oauth/authorize/context", "/oauth/register", "/oauth/token", "/oauth/revoke", "/mcp/agents/grant", "/mcp/agents/connections", `/mcp/agents/${"a".repeat(64)}/grant`, `/mcp/agents/${"a".repeat(64)}/connections`, `/mcp/agents/${"a".repeat(64)}/revoke-grant`];
  for (const settings of [{ MCP_ENABLED: "false" }, { MCP_ENABLED: "true", OAUTH_REDIRECT_URIS: "{}" }, { MCP_ENABLED: "true", OAUTH_CLIENT_METADATA_ORIGINS: "{}" }]) {
    for (const path of paths) {
      const response = await mcpRoute(new Request(SERVICE + path, { method: path.includes("well-known") || path.includes("authorize") ? "GET" : "POST" }), { ...settings, REGISTRIES: tripwire, AGENTS: tripwire } as unknown as Parameters<typeof mcpRoute>[1]);
      expect(response?.status, path).toBe(404);
    }
  }
  expect(lookups).toBe(0);
  const response = await mcpRoute(new Request(SERVICE + "/.well-known/oauth-protected-resource/mcp"), { MCP_ENABLED: "true", OAUTH_CLIENT_METADATA_ORIGINS: "{}", REGISTRIES: tripwire, AGENTS: tripwire } as unknown as Parameters<typeof mcpRoute>[1]);
  expect(response?.status).toBe(200); expect(lookups).toBe(0);
  const insecure = await mcpRoute(new Request("http://room.example/.well-known/oauth-authorization-server"), { MCP_ENABLED: "true", REGISTRIES: tripwire, AGENTS: tripwire } as unknown as Parameters<typeof mcpRoute>[1]);
  expect(insecure?.status).toBe(404); expect(lookups).toBe(0);
});
async function join(room: Room, admin: Agent, handle: string, definition: string): Promise<Agent> {
  const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const invitation = await admin.ok("member.invite", { fields: { handle, role: "member", ...invitationIssueFields(definition as "platform:membership@2", secret), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: "invite-" + handle });
  const { inbox: _inbox, ...repository } = admin.config.repository!;
  const link = INVITATION_LINK + b64url(utf8(JSON.stringify({ v: 1, service: SERVICE, repository, invitation: (invitation["fact"] as FactRef).seq, secret, handle, definition })));
  const person = room.agent(handle.slice(1));
  expect((await person.ok("join", { link, idempotencyKey: "join-" + handle }))["answer"]).toBe("accepted"); return person;
}
async function invitation(room: Room, admin: Agent, owner: Agent, own: boolean): Promise<string> {
  const M = owner.config.repository!.membership;
  if (own) {
    const store = memoryStore(); await store.save({ v: 1, service: SERVICE, key: "browser", handle: owner.config.handle!, repository: owner.config.repository! });
    const custody = { ...store, signer: async () => secretSigner(owner.secret), secret: async (): Promise<never> => { throw Error("No raw seed export"); } };
    const issued = await room.wait(() => issueOwnAgentInvitation({ store: custody, fetch: room.fetch, pause: waiting => room.pause(waiting), now: () => room.now() + 1000 },
      { handle: "@oauth-agent", hours: 1, controller: { membership: M, member: owner.config.handle as MemberId } }, { operation: crypto.randomUUID(), privateRequests: [], mode: "new" }));
    expect(issued.state).toBe("verified"); return issued.link!;
  }
  const added = await admin.ok("member.add", { fields: { handle: "@oauth-agent", kind: "agent", controller: owner.config.handle! }, idempotencyKey: "add-agent" });
  const member = added["fact"] as FactRef, secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const invited = await admin.ok("key.invite", { fields: { member: member.seq, kind: "agent", ...invitationIssueFields("platform:membership@2", secret), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: "invite-agent" });
  const membership = room.platform(M.scope), roster = await room.wait(() => membership.item(0)), item = await room.wait(() => membership.item(member.seq));
  const { inbox: _inbox, ...repository } = owner.config.repository!;
  return encodeAgentKeyInvitation({ v: 1, kind: "agent-key", service: SERVICE, repository, definition: "platform:membership@2", handle: "@oauth-agent", controller: { membership: M, member: owner.config.handle as MemberId }, member, invitation: invited["fact"] as FactRef, secret, expected: { on: roster.revision, member: item.revision } });
}

test.each([false, true])("routed public-client grants enroll once for an ordinary controller (own-agent pin: %s)", async own => {
  const room = mcpRoom(); hostedTest.now = () => room.now(); hostedTest.pause = waiting => room.pause(waiting);
  try {
    const admin = room.agent("rita"), definition = own ? OWN_AGENT_COHORT.membership : "platform:membership@2";
    await created(room, admin, "default", own ? OWN_AGENT_COHORT.register : "platform:register@3");
    const owner = await join(room, admin, "@oauth-owner", definition), other = await join(room, admin, "@other", definition);
    const M = owner.config.repository!.membership, link = await invitation(room, admin, owner, own);
    const registration = await room.wait(() => routed("/oauth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "TEST OAuth host", redirect_uris: [REDIRECT] }) }));
    expect(registration.status).toBe(201); expect(registration.headers.get("cache-control")).toBe("no-store");
    const client = await registration.json() as { client_id: string };
    const binding: OAuthBinding = { client_id: client.client_id, redirect_uri: REDIRECT, code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", resource: RESOURCE, scope: "mcp", state_digest: digestBytes(utf8("TEST state")) };
    const control = async (path: string, action: ControlAction, agent: string | null, body: unknown, op: string, signer = owner) => {
      const bytes = utf8(canonicalize(body as never)), request = { v: 1 as const, action, service: SERVICE, membership: M, agent, actor: keyIdOfSecret(signer.secret), body: digestBytes(bytes), op, notAfter: timeOf(room.now() + 60_000) };
      const signed = await signControlWith(request, secretSigner(signer.secret));
      return room.wait(() => routed(path, { method: "POST", headers: { authorization: `Control ${b64url(utf8(canonicalize(request)))}.${signed.sig}`, "content-type": "application/json" }, body: new Uint8Array(bytes) }));
    };
    const form = (path: string, values: Record<string, string>) => room.wait(() => routed(path, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: client.client_id, ...values }).toString() }));
    const firstBody = { ...binding, link };
    if (own) {
      hostedTest.faultAt = "complete";
      expect((await control("/mcp/agents/grant", "grant", null, firstBody, "first")).status).toBe(503);
    }
    const first = await control("/mcp/agents/grant", "grant", null, firstBody, "first");
    expect(first.status).toBe(own ? 200 : 201);
    const firstAnswer = await first.json() as { agent: string; code?: string; codeShown?: boolean };
    const id = firstAnswer.agent; expect(id).toMatch(/^[0-9a-f]{64}$/);
    if (own) { expect(firstAnswer.codeShown).toBe(true); expect(firstAnswer).not.toHaveProperty("code"); }
    const grant = async (op: string) => { const response = await control(`/mcp/agents/${id}/grant`, "grant", id, binding, op); expect(response.status).toBe(201); return (await response.json() as { code: string }).code; };
    const code = own ? await grant("after-lost-code") : firstAnswer.code!;
    const exchanged = async (given: string, verifier = VERIFIER) => form("/oauth/token", { grant_type: "authorization_code", code: given, redirect_uri: REDIRECT, code_verifier: verifier, resource: RESOURCE });
    expect((await exchanged(code, "x".repeat(43))).status).toBe(400);
    const tokensResponse = await exchanged(code); expect(tokensResponse.status).toBe(200);
    const tokens = await tokensResponse.json() as { access_token: string; refresh_token: string };
    const initialize = (bearer: string) => room.wait(() => routed("/mcp", { method: "POST", headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "TEST Native OAuth host", version: "1" } } }) }));
    const initialized = await initialize(tokens.access_token); expect(initialized.status).toBe(200); await initialized.body?.cancel();
    expect((await exchanged(code)).status).toBe(400);
    const reused = await initialize(tokens.access_token); expect(reused.status).toBe(401); await reused.body?.cancel();
    expect((await control(`/mcp/agents/${id}/grant`, "grant", id, binding, "unrelated", other)).status).toBe(403);
    const membership = room.platform(M.scope), roster = await room.wait(() => membership.item(0)), actions = roster.values["agentActions"] as string[];
    const setActions = (values: string[]) => room.wait(async () => {
      const signed = await signedIntent(secretSigner(admin.secret), { to: M, kind: "set-actions", on: 0, expected: await membership.expected({ on: 0 }), fields: { role: "agent", actions: values } }, { now: room.now() });
      expect(await membership.stub.submit(signed, [])).toMatchObject({ answer: "accepted" });
    });
    await setActions([...actions, "change.check"]);
    expect((await control(`/mcp/agents/${id}/grant`, "grant", id, binding, "wider")).status).toBe(403);
    await setActions(actions);
    const nextResponse = await exchanged(await grant("refresh")); expect(nextResponse.status).toBe(200);
    const next = await nextResponse.json() as typeof tokens;
    const refreshed = await form("/oauth/token", { grant_type: "refresh_token", refresh_token: next.refresh_token, resource: RESOURCE }); expect(refreshed.status).toBe(200);
    const rotated = await refreshed.json() as typeof tokens;
    expect((await form("/oauth/token", { grant_type: "refresh_token", refresh_token: next.refresh_token, resource: RESOURCE })).status).toBe(400);
    const revokedByReuse = await initialize(rotated.access_token); expect(revokedByReuse.status).toBe(401); await revokedByReuse.body?.cancel();
    const finalResponse = await exchanged(await grant("final")); const final = await finalResponse.json() as typeof tokens;
    expect((await form("/oauth/revoke", { token: final.refresh_token })).status).toBe(200);
    const revoked = await initialize(final.access_token); expect(revoked.status).toBe(401); await revoked.body?.cancel();
    const connections = await control("/mcp/agents/connections", "connections", null, { after: null }, "connections"); expect(connections.status).toBe(200);
    expect((await connections.json() as { agents: { agent: string }[] }).agents.map(a => a.agent)).toEqual([id]);
    const entries = await room.wait(() => membership.entries());
    expect(entries.filter(e => e.input.type === "act" && e.input.signed.intent.kind === "enrol")).toHaveLength(1);
    await room.wait(() => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(id)), (_instance, state) => {
      const row = state.storage.sql.exec(`SELECT state, bearer, bearer_expires FROM agent`).toArray()[0]!;
      expect(row).toMatchObject({ state: "enrolled", bearer: null, bearer_expires: null });
      const answers = JSON.stringify(state.storage.sql.exec(`SELECT answer FROM control`).toArray());
      expect(answers).not.toContain(code); expect(answers).not.toContain(tokens.access_token); expect(answers).not.toContain(tokens.refresh_token);
    }));
    await room.wait(() => runInDurableObject(env.REGISTRIES.get(env.REGISTRIES.idFromName(M.scope)), (_instance, state) => {
      const answers = JSON.stringify(state.storage.sql.exec(`SELECT answer FROM control`).toArray());
      expect(answers).not.toContain(code); expect(answers).not.toContain(tokens.access_token); expect(answers).not.toContain(tokens.refresh_token);
    }));
  } finally { hostedTest.now = null; hostedTest.pause = null; hostedTest.faultAt = null; room.done(); }
});
