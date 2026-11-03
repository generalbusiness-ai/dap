/** Production HTTP, Wire, grant checker and grant-layer manager with actual
 * Durable Object SQLite. Scope replies, standing, session persistence and
 * timers are explicit stand-ins. No RPC cancellation or membership judgment
 * belongs to this component witness. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { MemberId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import { McpHttp } from "../src/http.ts";
import { OAuthAccess, type OAuthAccessGrant } from "../src/oauth-access.ts";
import { OAuthHttpLayers } from "../src/oauth-http.ts";
import { McpService } from "../src/service.ts";
import { memoryStore } from "../src/custody.ts";
import type { Sql } from "../src/sqlite-custody.ts";
import { LEGACY, Wire } from "../src/wire.ts";
import { StandIn, SERVICE } from "./support/standin.ts";

test("grant stream cancellation releases timers and a held standing refresh cannot extend the previous read deadline", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    const start = Date.parse("2099-01-01T00:00:00Z");
    let now = start, serial = 0;
    const signer = secretSigner(new Uint8Array(32).fill(22));
    const scopes = new StandIn(signer.key); scopes.sessionEnds = "2100-01-01T00:00:00Z";
    const membership: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "membership" };
    let entered!: () => void, release!: () => void;
    const standingEntered = new Promise<void>(resolve => { entered = resolve; });
    const standingRelease = new Promise<void>(resolve => { release = resolve; });
    let hold = false;
    const access = new OAuthAccess(sql, { now: () => now, agent: () => ({ state: "enrolled", membership, key: signer.key, handle: "@agent" }), charge: () => {},
      observe: async (_membership, ask) => {
        if (hold) { entered(); await standingRelease; }
        return "key" in ask ? { keyState: "active", memberState: "active", member: "@agent", controller: "@owner" } : { memberState: "active" };
      } });
    const id = b64url(new Uint8Array(32).fill(1)), secret = b64url(new Uint8Array(32).fill(2));
    const grant: OAuthAccessGrant = { controller: "@owner" as MemberId, resource: SERVICE + "/mcp", created: start, ends: start + 86_400_000,
      accessIssued: start, accessExpires: start + 3_600_000, accessDigest: digestBytes(utf8(secret)) };
    sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, id, canonicalize(grant), start);
    const candidate = access.inspect(id, secret, grant.resource)!;
    expect(await access.standing(candidate)).toBe(true);
    const timers = new Map<number, { due: number; run: () => Promise<void> }>();
    const schedule = (delay: number, run: () => Promise<void>) => { const token = ++serial; timers.set(token, { due: now + delay, run }); return () => { timers.delete(token); }; };
    const layers = new OAuthHttpLayers(access, { now: () => now, schedule });
    const service = new McpService({ service: SERVICE, signer, fetch: scopes.fetch, custody: memoryStore(), now: () => now, every: () => () => {},
      config: { read: async () => scopes.config(), addRoot: async () => {} } });
    const http = await layers.open(candidate, async layer => {
      const result = new McpHttp({ wire: new Wire(service), now: () => now, bodyBytes: 1024 * 1024,
        authorized: () => true, mintSession: () => "TEST-session", lifetime: { get expires() { return layer.deadline; }, schedule },
        streamsChanged: () => layers.watch(candidate) });
      result.restore([{ id: "TEST-session", version: LEGACY, initialized: true, capabilities: {}, listed: null, created: start }]);
      return result;
    });
    expect(http).not.toBeNull();
    const open = () => http!.handle(new Request(SERVICE + "/mcp", { method: "GET", headers: { "mcp-protocol-version": LEGACY, "mcp-session-id": "TEST-session" } }));
    const first = await open(); expect(first.status).toBe(200);
    expect(http!.streams).toBe(1); expect(timers.size).toBe(2);
    await first.body!.cancel();
    expect(http!.streams).toBe(0); expect(timers.size).toBe(0);
    const second = await open(); expect(second.status).toBe(200);
    hold = true; now = start + 30_000;
    const due = [...timers].filter(([, job]) => job.due <= now);
    const refreshing = due.map(([token, job]) => { timers.delete(token); return job.run(); });
    await standingEntered;
    now = start + 60_000;
    for (const [token, job] of [...timers]) if (job.due <= now && timers.delete(token)) await job.run();
    expect(await second.text(), "the old lease closes while the next authority read remains held").toContain("event: end");
    expect(http!.streams).toBe(0);
    release(); await Promise.all(refreshing);
    expect(timers.size).toBe(0);
    await layers.closeAll();
    hold = false;
    expect(await access.standing(candidate, true)).toBe(true);
    let releaseOpening!: () => void;
    const heldOpening = new Promise<void>(resolve => { releaseOpening = resolve; });
    const lateHttp = new McpHttp({ wire: new Wire(service), now: () => now, bodyBytes: 1024, authorized: () => true, mintSession: () => "TEST-late-session" });
    const pendingOpen = layers.open(candidate, async () => { await heldOpening; return lateHttp; });
    const order: string[] = [];
    const retiring = layers.closeGrant(id, true).then(() => { order.push("closed"); });
    // Explicit TEST scheduler event: release the held load on the next turn.
    // This compares event order, not a measured timing threshold.
    await new Promise<void>(resolve => setTimeout(() => { order.push("opening released"); releaseOpening(); resolve(); }, 0));
    await retiring;
    expect(await pendingOpen).toBeNull();
    expect(order).toEqual(["closed", "opening released"]);
  });
});
