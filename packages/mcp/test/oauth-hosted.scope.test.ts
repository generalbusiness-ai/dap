/** Production hosted controls, issuer, HTTP sessions and Durable Object SQL.
 * Identity rows, authority, clock and reset are explicit TEST stand-ins.
 * These cases do not prove Native enrollment or browser consent. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test, vi } from "vitest";
import type { ControlAction, ControlRequest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, keyIdOfSecret, signControl, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { HostedAgent } from "../src/hosted.ts";
import { McpService } from "../src/service.ts";
import { oauthRedirectPolicy, type OAuthBinding, type OAuthGrantContext } from "../src/oauth-parameters.ts";
import type { Sql } from "../src/sqlite-custody.ts";

const START = Date.parse("2099-01-01T00:00:00Z"), SERVICE = "https://room.example", RESOURCE = SERVICE + "/mcp";
const MEMBER: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "membership" };
const OWNER = new Uint8Array(32).fill(2), AGENT = new Uint8Array(32).fill(3), OTHER = new Uint8Array(32).fill(4);
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const BINDING: OAuthBinding = { client_id: "https://claude.ai/metadata.json", redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", resource: RESOURCE, scope: "mcp", state_digest: digestBytes(utf8("TEST state")) };
const CONTEXT: OAuthGrantContext = { client: { client_id: BINDING.client_id, client_name: "TEST client", redirect_uris: [BINDING.redirect_uri], token_endpoint_auth_method: "none" }, resources: [RESOURCE], redirects: oauthRedirectPolicy()! };
function fixture(sql: Sql, id: string, installed = false) {
  const f = { now: START, wider: false, fault: false, admin: false };
  const agent = new HostedAgent(sql, { id, now: () => f.now, random: n => crypto.getRandomValues(new Uint8Array(n)), oauthResource: () => RESOURCE,
    every: () => () => {},
    ...(installed ? { applicationContent: async () => null } : {}),
    fetch: async () => { throw Error("This fixture sends no Native read"); },
    fault: fence => { if (f.fault && fence === "complete") { f.fault = false; throw Error("TEST reset after code persistence"); } },
    observe: async (_membership, ask) => "member" in ask ? { memberState: "active", controller: ask.member === "@agent" ? "@owner" : null, activeKey: true }
      : ask.key === keyIdOfSecret(AGENT) ? { keyState: "active", memberState: "active", member: "@agent", controller: "@owner", actions: f.wider ? ["issue.open", "change.check"] : ["issue.open"] }
        : { keyState: "active", memberState: "active", member: ask.key === keyIdOfSecret(OWNER) ? "@owner" : "@other", controller: null, actions: f.admin ? ["membership.manage"] : ["issue.open"] },
  });
  sql.exec(`INSERT INTO agent (id, op, seed, key, state, membership, handle, config, created, updated) VALUES (1, 'TEST', ?, ?, 'enrolled', ?, '@agent', ?, ?, ?)`, AGENT, keyIdOfSecret(AGENT), canonicalize(MEMBER), canonicalize({ service: SERVICE }), timeOf(START), timeOf(START));
  const signed = (action: ControlAction, op: string, body: Uint8Array, secret = OWNER) => signControl({ v: 1, action, service: SERVICE, membership: MEMBER, agent: id, actor: keyIdOfSecret(secret), body: digestBytes(body), op, notAfter: timeOf(f.now + 60_000) } satisfies ControlRequest, secret);
  return { f, agent, signed };
}
function pieces(value: unknown): [string, string, string] { expect(typeof value).toBe("string"); const parts = String(value).split("."); expect(parts).toHaveLength(3); return parts as [string, string, string]; }

test("signed grants recheck the current controller role and persist only the code receipt across a reset", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (q, ...v) => state.storage.sql.exec(q, ...v), transaction: run => state.storage.transactionSync(run) };
    const { f, agent, signed } = fixture(sql, state.id.toString()), body = utf8(canonicalize(BINDING));
    try {
      expect((await agent.grant(signed("grant", "other", body, OTHER), body, CONTEXT)).status).toBe(403);
      f.wider = true;
      expect((await agent.grant(signed("grant", "wider", body), body, CONTEXT)).body).toEqual({ error: "unauthorized", rule: "controller-role" });
      expect(sql.exec(`SELECT count(*) AS n FROM oauth_issuer`).toArray()[0]!["n"]).toBe(0);
      f.wider = false;
      const grant = signed("grant", "reset", body); f.fault = true;
      await expect(agent.grant(grant, body, CONTEXT)).rejects.toThrow("TEST reset after code persistence");
      const replay = await agent.grant(grant, body, CONTEXT);
      expect(replay.body).toMatchObject({ codeShown: true }); expect(replay.body).not.toHaveProperty("code");
      expect(sql.exec(`SELECT count(*) AS n FROM oauth_issuer`).toArray()[0]!["n"]).toBe(1);
      expect(sql.exec(`SELECT bearer FROM agent`).toArray()[0]!["bearer"]).toBeNull();
      const changed = utf8(canonicalize({ ...BINDING, state_digest: digestBytes(utf8("another state")) }));
      expect((await agent.grant(signed("grant", "reset", changed), changed, CONTEXT)).body).toEqual({ error: "op", rule: "fingerprint" });
      f.wider = true; f.admin = true;
      expect((await agent.grant(signed("grant", "admin", body), body, CONTEXT)).status).toBe(201);
      const stored = String(sql.exec(`SELECT answer FROM control WHERE op = 'admin'`).toArray()[0]!["answer"]);
      expect(JSON.parse(stored)).toMatchObject({ body: { codeShown: true } }); expect(JSON.parse(stored).body).not.toHaveProperty("code");
    } finally { agent.abrupt(); }
  });
});

test("refresh retains its own sessions and revocation removes only that grant's sessions", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (q, ...v) => state.storage.sql.exec(q, ...v), transaction: run => state.storage.transactionSync(run) };
    const { f, agent, signed } = fixture(sql, state.id.toString()), body = utf8(canonicalize(BINDING));
    const initialize = async (bearer: unknown) => {
      const response = await agent.fetch(new Request(RESOURCE, { method: "POST", headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "TEST grant sessions", version: "1" } } }) }));
      expect(response.status).toBe(200); const id = response.headers.get("mcp-session-id"); expect(id).not.toBeNull(); await response.body?.cancel(); return id!;
    };
    const issue = async (op: string) => {
      const code = await agent.grant(signed("grant", op, body), body, CONTEXT); expect(code.status).toBe(201);
      const [, id, secret] = pieces(code.body["code"]);
      const tokens = await agent.exchangeCode(id, secret, BINDING.client_id, BINDING.redirect_uri, VERIFIER, RESOURCE); expect(tokens.status).toBe(200);
      return { id, tokens };
    };
    try {
      const a = await issue("a"), aSession = await initialize(a.tokens.body["access_token"]);
      const b = await issue("b"), bSession = await initialize(b.tokens.body["access_token"]);
      expect(sql.exec(`SELECT count(*) AS n FROM oauth_session`).toArray()[0]!["n"]).toBe(2);
      const stream = (bearer: unknown) => agent.fetch(new Request(RESOURCE, { headers: { authorization: `Bearer ${bearer}`, "mcp-session-id": aSession, "mcp-protocol-version": "2025-11-25" } }));
      const oldStream = await stream(a.tokens.body["access_token"]); expect(oldStream.status).toBe(200);
      const closingStream = oldStream.text();
      const [, , oldRefresh] = pieces(a.tokens.body["refresh_token"]);
      const next = await agent.refreshGrant(a.id, oldRefresh, BINDING.client_id, RESOURCE); expect(next.status).toBe(200);
      expect(await closingStream).toContain("event: end");
      expect(sql.exec(`SELECT id FROM oauth_session WHERE grant_id = ?`, a.id).toArray().map(r => r["id"])).toEqual([aSession]);
      const resumed = await stream(next.body["access_token"]); expect(resumed.status).toBe(200); await resumed.body?.cancel();
      const revoke = utf8(canonicalize({ grant: a.id }));
      // A widened role must not prevent the controller from revoking access.
      f.wider = true;
      expect((await agent.connectionControl(signed("revoke-grant", "revoke-a", revoke), "revoke-grant", revoke)).status).toBe(200);
      expect(sql.exec(`SELECT id FROM oauth_session`).toArray().map(r => r["id"])).toEqual([bSession]);
      const refused = await agent.fetch(new Request(RESOURCE, { headers: { authorization: `Bearer ${next.body["access_token"]}` } })); expect(refused.status).toBe(401); await refused.body?.cancel();
      expect(await initialize(b.tokens.body["access_token"])).not.toBe(aSession);
      const empty = utf8("{}");
      const listed = await agent.connectionControl(signed("connections", "list", empty), "connections", empty);
      expect((listed.body["connections"] as { id: string }[]).map(c => c.id)).toEqual([b.id]);
      expect((await agent.control(signed("retire", "retire", empty), "retire", empty)).status).toBe(202);
      expect(sql.exec(`SELECT count(*) AS n FROM oauth_issuer WHERE state != 'ended'`).toArray()[0]!["n"]).toBe(0);
      expect(sql.exec(`SELECT count(*) AS n FROM oauth_session`).toArray()[0]!["n"]).toBe(0);
    } finally { agent.abrupt(); }
  });
});


// The loader is an explicit held stand-in; controls, SQL and HTTP are production.
// This witnesses the bearer epoch, not installed-package validation.
test("a held installed-application loader stand-in cannot restore rows or replace the new bearer transport after rotation", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (q, ...v) => state.storage.sql.exec(q, ...v), transaction: run => state.storage.transactionSync(run) };
    const { agent, signed } = fixture(sql, state.id.toString(), true);
    let hold = false, entered!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const loader = vi.spyOn(McpService, "fromInstalledApplication").mockImplementation(async port => {
      if (hold) { entered(); await held; }
      return new McpService(port);
    });
    const empty = utf8("{}");
    const bearer = async (op: string) => {
      const answer = await agent.control(signed("bearer", op, empty), "bearer", empty);
      expect(answer.status).toBe(200);
      expect(typeof answer.body["bearer"]).toBe("string");
      return String(answer.body["bearer"]);
    };
    const initialize = async (token: string) => {
      const response = await agent.fetch(new Request(RESOURCE, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "TEST held loader", version: "1" } } }) }));
      expect(response.status).toBe(200);
      const session = response.headers.get("mcp-session-id");
      expect(session).not.toBeNull();
      await response.body?.cancel();
      return session!;
    };
    let pending: Promise<Response> | undefined;
    try {
      const oldBearer = await bearer("initial");
      const oldSession = await initialize(oldBearer);
      agent.abrupt(); // A reset retains the row that the held opening would restore.
      hold = true;
      pending = agent.fetch(new Request(RESOURCE, { method: "POST", headers: { authorization: `Bearer ${oldBearer}`, "mcp-session-id": oldSession, "mcp-protocol-version": "2025-11-25" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "ping" }) }));
      await started;
      expect(sql.exec(`SELECT id FROM session`).toArray().map(r => r["id"])).toEqual([oldSession]);
      hold = false;
      const newBearer = await bearer("rotated");
      expect(sql.exec(`SELECT count(*) AS n FROM session`).toArray()[0]!["n"]).toBe(0);
      const newSession = await initialize(newBearer);
      expect(newSession).not.toBe(oldSession);
      const replacement = agent.inside();
      expect(replacement.http).not.toBeNull();
      release();
      const refused = await pending;
      expect(refused.status).toBe(401);
      await refused.body?.cancel();
      expect(sql.exec(`SELECT id FROM session`).toArray().map(r => r["id"])).toEqual([newSession]);
      expect(agent.inside().http).toBe(replacement.http);
      expect(agent.inside().service).toBe(replacement.service);
      const resumed = await agent.fetch(new Request(RESOURCE, { headers: { authorization: `Bearer ${newBearer}`, "mcp-session-id": newSession, "mcp-protocol-version": "2025-11-25" } }));
      expect(resumed.status).toBe(200);
      await resumed.body?.cancel();
    } finally {
      release();
      if (pending) await pending.then(response => response.body?.cancel(), () => {});
      loader.mockRestore();
      agent.abrupt();
    }
  });
});
