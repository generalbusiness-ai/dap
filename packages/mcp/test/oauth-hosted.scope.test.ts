/** Production hosted controls, issuer, HTTP sessions and Durable Object SQL.
 * Identity rows, authority, clock and reset are explicit TEST stand-ins.
 * These cases do not prove Native enrollment or browser consent. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test, vi } from "vitest";
import type { ControlAction, ControlRequest, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, keyIdOfSecret, signControl, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { hostedRolePort, HostedAgent, HostedRegistry, CONTROL_ROW_BYTES, type ControlAnswer, type HostedRoleRead, hostedAgentIdentity } from "../src/hosted.ts";
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
  const f = { now: START, wider: false, fault: false, admin: false, roleReads: 0,
    roleHold: null as Promise<void> | null, onRole: null as (() => void) | null, lastRandom: "" };
  const agent = new HostedAgent(sql, { id, now: () => f.now, random: n => { const bytes = crypto.getRandomValues(new Uint8Array(n)); f.lastRandom = b64url(bytes); return bytes; }, oauthResource: () => RESOURCE,
    every: () => () => {},
    ...(installed ? { applicationContent: async () => null } : {}),
    fetch: async () => { throw Error("This fixture sends no Native read"); },
    fault: fence => { if (f.fault && fence === "complete") { f.fault = false; throw Error("TEST reset after code persistence"); } },
    roleStanding: hostedRolePort(async asked => {
      if (!("agent" in asked)) return { status: "unavailable" };
      f.roleReads++; f.onRole?.();
      const actions = f.wider ? ["issue.open", "change.check"] : ["issue.open"];
      const controllerActions = f.admin ? ["membership.manage", "issue.open"] : ["issue.open"];
      const ownerActor = asked.actor === keyIdOfSecret(OWNER);
      const facts: HostedRoleRead = { status: "observed", of: { ...MEMBER }, head: { seq: f.roleReads, hash: digestBytes(utf8("TEST role head " + f.roleReads)) },
        agent: { member: "@agent", state: "active", role: "agent", activeKey: true, controller: "@owner", actions: [...actions] },
        agentKey: { key: keyIdOfSecret(AGENT), keyState: "active", member: "@agent", memberState: "active", controller: "@owner", actions: [...actions] },
        controller: { member: "@owner", state: "active", role: f.admin ? "admin" : "member", activeKey: false, controller: null, actions: [...controllerActions] },
        actor: asked.actor === null ? null : { key: asked.actor, keyState: "active", member: ownerActor ? "@owner" : "@other", memberState: "active", controller: null,
          actions: ownerActor ? [...controllerActions] : ["issue.open"] } };
      await f.roleHold;
      return facts;
    }),
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
    const observedIdentity = agent.roleIdentity();
    expect(observedIdentity).toEqual({ status: "observed", identity: { agent: state.id.toString(), op: "TEST", state: "enrolled", membership: MEMBER, key: keyIdOfSecret(AGENT), handle: "@agent" } });
    if (observedIdentity.status !== "observed") return expect.fail("the fixture's stored identity must be observed");
    const identity = observedIdentity.identity;
    expect(Object.keys(identity).sort()).toEqual(["agent", "handle", "key", "membership", "op", "state"]);
    expect(hostedAgentIdentity(state.id.toString(), observedIdentity)).toEqual(observedIdentity);
    expect(hostedAgentIdentity(state.id.toString(), { status: "observed", identity: { ...identity, configuration: "PRIVATE" } })).toEqual({ status: "unavailable" });
    identity.membership.kind = "lane";
    expect(agent.roleIdentity()).toMatchObject({ status: "observed", identity: { membership: MEMBER } });
    sql.exec(`UPDATE agent SET key = ? WHERE id = 1`, "TEST malformed key");
    expect(agent.roleIdentity()).toEqual({ status: "unavailable" });
    sql.exec(`UPDATE agent SET key = ?, membership = ? WHERE id = 1`, keyIdOfSecret(AGENT), "{");
    expect(agent.roleIdentity()).toEqual({ status: "unavailable" });
    sql.exec(`UPDATE agent SET membership = ? WHERE id = 1`, canonicalize(MEMBER));
    expect(() => sql.transaction(() => {
      sql.exec(`DELETE FROM agent WHERE id = 1`);
      expect(agent.roleIdentity()).toEqual({ status: "absent", agent: state.id.toString() });
      throw Error("TEST absent identity rollback");
    })).toThrow("TEST absent identity rollback");
    expect(agent.roleIdentity()).toMatchObject({ status: "observed", identity: { key: keyIdOfSecret(AGENT) } });
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
      expect((await agent.grant(signed("grant", "admin-wider", body), body, CONTEXT)).body).toEqual({ error: "unauthorized", rule: "controller-role" });
      expect(sql.exec(`SELECT id FROM oauth_issuer WHERE op = 'admin-wider'`).toArray()).toEqual([]);
      f.wider = false;
      expect((await agent.grant(signed("grant", "admin", body), body, CONTEXT)).status).toBe(201);
      const stored = String(sql.exec(`SELECT answer FROM control WHERE op = 'admin'`).toArray()[0]!["answer"]);
      expect(JSON.parse(stored)).toMatchObject({ body: { codeShown: true } }); expect(JSON.parse(stored).body).not.toHaveProperty("code");

      // Actual Registry SQL/reservation/mapping code. Peer, role facts, clock and handoff outcomes are explicit stand-ins.
      const registryObject = env.REGISTRIES.get(env.REGISTRIES.newUniqueId());
      await runInDurableObject(registryObject, async (_registry, registryState) => {
        const db: Sql = { exec: (query, ...values) => registryState.storage.sql.exec(query, ...values), transaction: run => registryState.storage.transactionSync(run) };
        const target = "a".repeat(64), legacyTarget = "b".repeat(64);
        const newClient = BINDING.client_id + "?TEST-separate-new-binding";
        const flags = { now: START, wider: false, roleEntered: null as (() => void) | null, identity: "observed" as "observed" | "absent" | "unavailable", calls: 0,
          result: { status: 400, body: { error: "invalid_request" } } as ControlAnswer,
          roleHold: null as Promise<void> | null, handoffHold: null as Promise<void> | null };
        const identity = { agent: target, op: "TEST original creation", state: "enrolled", membership: MEMBER, key: keyIdOfSecret(AGENT), handle: "@agent" };
        const peer = { roleIdentity: async () => flags.identity === "observed" ? { status: "observed", identity: { ...identity, membership: { ...MEMBER } } } : flags.identity === "absent" ? { status: "absent", agent: target } : { status: "unavailable" },
          create: async (): Promise<ControlAnswer> => { throw Error("Registry existing-grant witness must not create or enroll"); },
          grant: async (): Promise<ControlAnswer> => { flags.calls++; await flags.handoffHold; return flags.result; } };
        db.exec(`CREATE TABLE oauth_agent (controller TEXT NOT NULL, client_id TEXT NOT NULL, agent TEXT NOT NULL UNIQUE, handle TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY (controller, client_id))`);
        db.exec(`INSERT INTO oauth_agent (controller, client_id, agent, handle, created) VALUES ('@owner', ?, ?, '@legacy-agent', ?)`, BINDING.client_id, legacyTarget, timeOf(START));
        db.exec(`CREATE TABLE control_budget (k TEXT PRIMARY KEY, v INTEGER NOT NULL)`);
        db.exec(`INSERT INTO control_budget (k, v) VALUES ('used', ?)`, CONTROL_ROW_BYTES);
        const registry = new HostedRegistry(db, { now: () => flags.now, mintId: () => { throw Error("Existing grant allocated another Agent"); }, agent: () => peer,
          observe: async () => { throw Error("Existing grant used the mixed-head authority path"); },
          roleStanding: hostedRolePort(async asked => {
            if (!("agent" in asked)) throw Error("Existing-grant fixture received an unexpected actor-only read");
            const actions = flags.wider ? ["issue.open", "change.check"] : ["issue.open"];
            const facts: HostedRoleRead = { status: "observed", of: MEMBER, head: { seq: 3, hash: digestBytes(utf8("TEST Registry head")) },
              agent: { member: "@agent", state: "active", role: "agent", activeKey: true, controller: "@owner", actions: [...actions] },
              agentKey: { key: identity.key, keyState: "active", member: "@agent", memberState: "active", controller: "@owner", actions: [...actions] },
              controller: { member: "@owner", state: "active", role: "member", activeKey: false, controller: null, actions: ["issue.open"] },
              actor: { key: keyIdOfSecret(OWNER), keyState: "active", member: "@owner", memberState: "active", controller: null, actions: ["issue.open"] } };
            expect(asked.agentKey).toBe(identity.key); // A nullable Registry key is never the enrollment-null path.
            flags.roleEntered?.();
            await flags.roleHold;
            return facts;
          }) });
        const used = () => Number(db.exec(`SELECT v FROM control_budget WHERE k = 'used'`).toArray()[0]!["v"]);
        const mapping = () => db.exec(`SELECT * FROM oauth_agent WHERE controller = '@owner' AND client_id = ?`, newClient).toArray()[0];
        const legacy = db.exec(`SELECT * FROM oauth_agent WHERE agent = ?`, legacyTarget).toArray()[0]!;
        expect(legacy["pending_op"]).toBeNull(); // Ruled legacy origin remains unknown, never confirmed.
        expect(used()).toBe(CONTROL_ROW_BYTES);
        db.exec(`INSERT INTO agents (agent, handle, key, state, created) VALUES (?, '@agent', NULL, 'enrolled', ?)`, target, timeOf(START));
        const existing = (op: string, client_id = newClient) => {
          const body = utf8(canonicalize({ ...BINDING, client_id }));
          const signed = signControl({ v: 1, action: "grant", service: SERVICE, membership: MEMBER, agent: target, actor: keyIdOfSecret(OWNER), body: digestBytes(body), op, notAfter: timeOf(START + 60_000) } satisfies ControlRequest, OWNER);
          return registry.grantExisting(signed, body, SERVICE, { ...CONTEXT, client: { ...CONTEXT.client, client_id } });
        };
        const legacyRefusal = await existing("TEST new Agent same legacy binding", BINDING.client_id);
        expect(legacyRefusal.status).toBe(503); expect(legacyRefusal.body).toEqual({ error: "temporarily_unavailable" });
        expect(db.exec(`SELECT * FROM oauth_agent WHERE agent = ?`, legacyTarget).toArray()[0]).toEqual(legacy);
        expect(flags.calls).toBe(0); expect(used()).toBe(CONTROL_ROW_BYTES);
        flags.identity = "absent";
        expect((await existing("TEST missing exact Agent")).status).toBe(503);
        expect(flags.calls).toBe(0); expect(mapping()).toBeUndefined();
        flags.identity = "observed"; flags.wider = true;
        expect((await existing("TEST before reserve wide")).body).toEqual({ error: "unauthorized", rule: "controller-role" });
        expect(flags.calls).toBe(0); expect(mapping()).toBeUndefined(); expect(used()).toBe(CONTROL_ROW_BYTES);
        flags.wider = false;
        const baseline = used();
        expect((await existing("TEST definitive refusal")).status).toBe(400);
        expect(mapping()).toBeUndefined();
        expect(used()).toBe(baseline + CONTROL_ROW_BYTES); // Full owned mapping, including op bytes, credited exactly once.
        const afterRefusal = used(), callsAfterRefusal = flags.calls;
        expect((await existing("TEST definitive refusal")).status).toBe(400);
        expect(used()).toBe(afterRefusal); expect(flags.calls).toBe(callsAfterRefusal);
        flags.result = { status: 503, body: { error: "unavailable" } };
        expect((await existing("TEST pending mapping")).status).toBe(503);
        expect(mapping()!["pending_op"]).toBe("TEST pending mapping");
        const whilePending = used();
        expect((await existing("TEST competing mapping op")).status).toBe(409);
        expect(used()).toBe(whilePending);
        flags.result = { status: 201, body: { agent: target, grant: "TEST grant", code: "TEST single-show code" } };
        expect((await existing("TEST pending mapping")).body["code"]).toBe("TEST single-show code");
        expect(mapping()!["pending_op"]).toBe("");
        expect(used()).toBe(whilePending - utf8("TEST pending mapping").length);
        const confirmed = { ...mapping()! }, confirmedUsed = used(), confirmedCalls = flags.calls;
        const receipt = await existing("TEST pending mapping");
        expect(receipt.body).toMatchObject({ codeShown: true }); expect(receipt.body).not.toHaveProperty("code");
        expect(used()).toBe(confirmedUsed); expect(flags.calls).toBe(confirmedCalls);
        flags.result = { status: 400, body: { error: "invalid_request" } };
        expect((await existing("TEST established mapping refusal")).status).toBe(400);
        expect(mapping()).toEqual(confirmed); expect(used()).toBe(confirmedUsed + CONTROL_ROW_BYTES);

        let releaseRole!: () => void, enteredRole!: () => void;
        const reachedRole = new Promise<void>(resolve => { enteredRole = resolve; });
        flags.roleEntered = enteredRole;
        flags.roleHold = new Promise<void>(resolve => { releaseRole = resolve; });
        const beforeRoleCalls = flags.calls, beforeRoleUsed = used();
        const pendingRole = existing("TEST held native owner");
        await reachedRole;
        db.exec(`UPDATE agents SET handle = '@replacement' WHERE agent = ?`, target);
        releaseRole();
        expect((await pendingRole).status).toBe(409);
        expect(flags.calls).toBe(beforeRoleCalls); expect(used()).toBe(beforeRoleUsed);
        expect(db.exec(`SELECT op FROM control WHERE op = 'TEST held native owner'`).toArray()).toHaveLength(0);
        flags.roleHold = null; flags.roleEntered = null;
        db.exec(`UPDATE agents SET handle = '@agent' WHERE agent = ?`, target);

        let entered!: () => void, releaseHandoff!: () => void;
        const reached = new Promise<void>(resolve => { entered = resolve; });
        const heldPeer = { ...peer, grant: async (): Promise<ControlAnswer> => { flags.calls++; entered(); await flags.handoffHold; return flags.result; } };
        // The actual peer port is a fixed object; replace its one test-owned method for this held outcome.
        peer.grant = heldPeer.grant;
        flags.result = { status: 201, body: { agent: target, grant: "TEST committed while held", code: "TEST withheld code" } };
        flags.handoffHold = new Promise<void>(resolve => { releaseHandoff = resolve; });
        const pendingHandoff = existing("TEST changed mapping while held");
        await reached;
        db.exec(`UPDATE oauth_agent SET created = 'TEST replacement mapping' WHERE controller = '@owner' AND client_id = ?`, newClient);
        releaseHandoff();
        const withheld = await pendingHandoff;
        expect(withheld.status).toBe(409); expect(withheld.body).toMatchObject({ codeShown: true }); expect(withheld.body).not.toHaveProperty("code");
        expect(mapping()!["created"]).toBe("TEST replacement mapping");
        expect(db.exec(`SELECT state FROM control WHERE op = 'TEST changed mapping while held'`).toArray()[0]!["state"]).toBe("reserved");
        expect(db.exec(`SELECT * FROM oauth_agent WHERE agent = ?`, legacyTarget).toArray()[0]).toEqual(legacy);
        const clockReached = new Promise<void>(resolve => { entered = resolve; });
        flags.handoffHold = new Promise<void>(resolve => { releaseHandoff = resolve; });
        const pendingClock = existing("TEST backward postcommit clock");
        await clockReached;
        flags.now = START - 1;
        releaseHandoff();
        const clockWithheld = await pendingClock;
        expect(clockWithheld.status).toBe(503); expect(clockWithheld.body).toMatchObject({ codeShown: true }); expect(clockWithheld.body).not.toHaveProperty("code");
        expect(db.exec(`SELECT state FROM control WHERE op = 'TEST backward postcommit clock'`).toArray()[0]!["state"]).toBe("reserved");
        flags.now = START;
      });

      // Role/key facts and time are stand-ins. The actual Agent, Issuer and SQL
      // keep the one-shot outcome and resumable control through final denial.
      f.admin = false;
      const beforeLate = f.roleReads;
      let enteredLate!: () => void, releaseLate!: () => void;
      const lateEntered = new Promise<void>(resolve => { enteredLate = resolve; });
      const lateRelease = new Promise<void>(resolve => { releaseLate = resolve; });
      f.onRole = () => { if (f.roleReads === beforeLate + 3) { f.wider = true; f.roleHold = lateRelease; enteredLate(); } };
      const lateSigned = signed("grant", "late-subset", body);
      const lateIssue = agent.grant(lateSigned, body, CONTEXT);
      await lateEntered;
      const keptIssue = sql.exec(`SELECT id, row, state FROM oauth_issuer WHERE op = 'late-subset'`).toArray();
      const keptUsage = sql.exec(`SELECT v FROM control_budget WHERE k = 'used'`).toArray();
      expect(keptIssue).toHaveLength(1);
      expect(sql.exec(`SELECT state, answer FROM control WHERE op = 'late-subset'`).toArray()).toEqual([{ state: "reserved", answer: null }]);
      releaseLate(); f.roleHold = null; f.onRole = null;
      const lateResult = await lateIssue;
      expect(lateResult.status).toBe(403);
      expect(lateResult.body).toEqual({ error: "unauthorized", rule: "controller-role", agent: state.id.toString(), grant: keptIssue[0]!["id"], codeShown: true, state_digest: BINDING.state_digest,
        next: "This attempt committed a one-shot credential but returned no credential plaintext. Its retained receipt cannot redisplay the secret. Do not expect a later role change or same-operation replay to recover it." });
      expect(sql.exec(`SELECT id, row, state FROM oauth_issuer WHERE op = 'late-subset'`).toArray()).toEqual(keptIssue);
      expect(sql.exec(`SELECT v FROM control_budget WHERE k = 'used'`).toArray()).toEqual(keptUsage);
      expect(sql.exec(`SELECT state, answer FROM control WHERE op = 'late-subset'`).toArray()).toEqual([{ state: "reserved", answer: null }]);
      f.wider = false;
      const lateReplay = await agent.grant(lateSigned, body, CONTEXT);
      expect(lateReplay.body).toEqual({ agent: state.id.toString(), grant: keptIssue[0]!["id"], codeShown: true, state_digest: BINDING.state_digest });
      expect(sql.exec(`SELECT id, row, state FROM oauth_issuer WHERE op = 'late-subset'`).toArray()).toEqual(keptIssue);
      expect(sql.exec(`SELECT state FROM control WHERE op = 'late-subset'`).toArray()[0]!["state"]).toBe("complete");

      // A caller-side final role read is another real await. A changed private
      // config or already-redeemed code cannot settle that stale code response.
      for (const change of ["configuration", "redeemed"] as const) {
        const beforeFinal = f.roleReads;
        let enteredFinal!: () => void, releaseFinal!: () => void;
        const finalEntered = new Promise<void>(resolve => { enteredFinal = resolve; });
        const finalRelease = new Promise<void>(resolve => { releaseFinal = resolve; });
        f.onRole = () => { if (f.roleReads === beforeFinal + 4) { f.roleHold = finalRelease; enteredFinal(); } };
        const op = "final-" + change;
        const pending = agent.grant(signed("grant", op, body), body, CONTEXT);
        await finalEntered;
        const kept = sql.exec(`SELECT id, row FROM oauth_issuer WHERE op = ?`, op).toArray()[0]!;
        const keptId = kept["id"];
        if (typeof keptId !== "string") expect.fail("The committed fixture must hold its actual issuer id.");
        const secret = f.lastRandom; // In-memory TEST random stand-in only.
        const originalConfig = sql.exec(`SELECT config FROM agent WHERE id = 1`).toArray()[0]!["config"];
        if (typeof originalConfig !== "string") expect.fail("The committed fixture must hold its original configuration bytes.");
        let redeemed: Awaited<ReturnType<typeof agent.exchangeCode>> | null = null;
        try {
          if (change === "configuration") sql.exec(`UPDATE agent SET config = ? WHERE id = 1`, canonicalize({ service: SERVICE, tools: [] }));
          else {
            f.roleHold = null; // The prior read already captured finalRelease.
            redeemed = await agent.exchangeCode(keptId, secret, BINDING.client_id, BINDING.redirect_uri, VERIFIER, RESOURCE);
            expect(redeemed.status).toBe(200);
          }
        } finally { releaseFinal(); f.roleHold = null; f.onRole = null; }
        const withheld = await pending;
        expect(withheld.status).toBe(409);
        expect(withheld.body).toMatchObject({ error: "op", rule: "stale", grant: kept["id"], codeShown: true });
        expect(withheld.body).not.toHaveProperty("code");
        expect(sql.exec(`SELECT state, answer FROM control WHERE op = ?`, op).toArray()).toEqual([{ state: "reserved", answer: null }]);
        if (change === "configuration") sql.exec(`UPDATE agent SET config = ? WHERE id = 1`, originalConfig);
        else {
          expect(redeemed?.body["access_token"]).toEqual(expect.any(String));
          expect(sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, keptId).toArray()[0]!["state"]).toBe("active");
          const consumed = sql.exec(`SELECT row, state FROM oauth_issuer WHERE id = ?`, keptId).toArray();
          expect(JSON.parse(String(consumed[0]!["row"]))).toMatchObject({ codeUsed: true });
          const tokenRows = sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, keptId).toArray();
          const historical = await agent.grant(signed("grant", op, body), body, CONTEXT);
          expect(historical.body).toMatchObject({ grant: kept["id"], codeShown: true });
          expect(historical.body).not.toHaveProperty("code");
          expect(historical.body).not.toHaveProperty("access_token");
          expect(historical.body).not.toHaveProperty("refresh_token");
          expect(sql.exec(`SELECT row, state FROM oauth_issuer WHERE id = ?`, keptId).toArray()).toEqual(consumed);
          expect(sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, keptId).toArray()).toEqual(tokenRows);
        }
      }

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
      f.wider = false;
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
