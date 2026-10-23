/** Real native install/authority, SQLite retention, issued read session,
 * private local R2, generic Room route and journal projection. Git/repository
 * host, clock, scheduler and setup inspector are explicit fixtures. No live
 * provider, deployed host, arbitrary package containment or browser runs. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { canonicalize, isSeed, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { encodeApplicationProjectionQuery, readApplicationProjectionReply } from "@generalbusiness/dap-bytes/application-v2";
import { DOMAINS, ITEM_QUERY_BOUNDS, PROPOSED_BOUNDS, type ApplicationProjectionQuery, type ScopeRef } from "@generalbusiness/dap-contract";
import { DECLARED_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { requestSession, sessionRequest, ScopeHandle, httpTransport, bindingTransport, secretSigner, signedApplicationInstall, ApplicationPackageError, type ServiceBinding } from "@generalbusiness/dap-client";
import { McpService, memoryStore as custodyStore, type ServerPort } from "@generalbusiness/dap-mcp";
import nativeWorker from "../../../apps/room/worker.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationCounterFactTimePacket2, applicationWorkerBindings, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture } from "./fixtures-native.ts";
import { rita, routed } from "./repository.ts";
import { soon, net } from "./net.ts";
import { Scope } from "../src/core.ts";
import { production } from "../src/ports.ts";
import { ReadPreparation } from "../src/read-preparation.ts";
import { SessionPreparation } from "../src/session-preparation.ts";
import { PreparationFlights } from "../src/preparation-flight.ts";
import { sessionReferencesIn } from "../src/namespace.ts";
import { ApplicationProjections } from "../src/applications/projection.ts";
import { applicationDeclarationsIn } from "../src/applications/projection-source.ts";
import { SqliteStore, type SqlValue } from "../src/sqlite.ts";
import { authenticateSession, mintSession, readerOf, type Sessions } from "../src/sessions.ts";
import { create } from "./support.ts";
import { ItemQueryBudget } from "../src/item-query-budget.ts";
import { applicationProjectionFactSigners } from "../src/applications/projection-fact-signers.ts";

// Invariant: all 100 exact local fact references fit native SQLite's binding
// limit, without entry bodies or more than the existing source allowance.
// Authenticated remarks use the repository's TEST authority and clock.
test("fact signer metadata reads 100 exact references on native SQLite", async () => {
  const lane = await create();
  for (let i = 0; i < 100; i++) await lane.did(rita, "remark", { on: 0, fields: { text: `TEST signer fact ${i}` } });
  const head = await lane.head();
  await lane.inside(state => {
    const sql = state.storage.sql;
    const refs = sql.exec("SELECT seq,hash FROM entry WHERE seq>0 ORDER BY seq LIMIT 100").toArray().map(row => ({ seq: row["seq"] as number, hash: row["hash"] as `sha256:${string}` }));
    expect(refs).toHaveLength(100);
    const reader = { exec(query: string, ...args: SqlValue[]) {
      expect(query).not.toMatch(/\bbytes\b/);
      return sql.exec(query, ...args);
    } };
    const frame = { scope: { at: lane.at, head } } as Parameters<typeof applicationProjectionFactSigners>[1];
    const budget = new ItemQueryBudget("session", () => true);
    let result: ReturnType<typeof applicationProjectionFactSigners> = null, failure: unknown = null;
    try { result = applicationProjectionFactSigners(reader, frame, refs, budget); }
    catch (error) { failure = error; }
    expect(failure, "100 exact references must fit native SQLite's binding limit").toBeNull();
    expect(result?.entries.map(({ seq, hash }) => ({ seq, hash }))).toEqual(refs);
    expect(budget.admitted().total).toMatchObject({ candidates: 100, metadata: 76800, calls: 2, bodies: 0, payloadBytes: 0 });
  });
}, 30000);

test("native installed projection reads exact journal state and survives R2 deletion and eviction", async () => {
  const room = await sessionRoom(C.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The native cohort needs its three siblings.");
  const packet = await applicationCounterFactTimePacket2(), f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet);
  const peer = applicationHttpPeer(f), bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) {
      life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
      await life.wait(() => node.restart());
    }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const selection = { rules: await life.wait(() => A.at()), uri: f.uri, release: packet.ids.release, roles: ["admin", "member"] as const, values: { target: 7 } };
    // The existing SDK install keeps its v1 codec strict.
    await expect(signedApplicationInstall(secretSigner(rita.secret), packet.bytes, selection, { now: life.now() })).rejects.toBeInstanceOf(ApplicationPackageError);
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: custodyStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }),
        addRoot: async () => { throw Error("Native installs are discovered through Directory."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)),
    };
    const mcp = new McpService(port);
    const args = { uri: f.uri, release: packet.ids.release, roles: ["admin", "member"], values: { target: 7 }, idempotencyKey: "TEST-native-v2-install" };
    const accepted = await life.wait(() => mcp.call("install_application", args));
    expect(accepted.isError, JSON.stringify(accepted.structuredContent)).toBe(false);
    expect(accepted.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    const job = Number(accepted.structuredContent["item"]);
    const installAds = peer.ads();
    expect((await life.wait(() => mcp.call("install_application", args))).structuredContent).toMatchObject({ item: job, retained: true });
    expect(peer.ads()).toBe(installAds);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const create = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.kind === "lane");
    expect(create).toBeDefined(); if (!create || !isSeed(create.to)) return;
    const app = life.platform(scopeIdOf(create.to));
    await driveFixture([R, D, M, A, G, app], life.wait);
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope: await life.wait(() => app.at()) } });
    const asked = sessionRequest(await life.wait(() => M.at()), rita.secret, soon(60), crypto.randomUUID());
    const session = await life.owner.required(() => requestSession("https://scopes.test", M.name, asked, { fetch: routed }));
    expect(session.ok).toBe(true); if (!session.ok) return;
    const query: ApplicationProjectionQuery = { v: 1, scope: await life.wait(() => app.at()), directory: await life.wait(() => D.at()), install: job, projection: "board", items: {} };
    const activityQuery = { ...query, projection: "activity" };
    const metadata = await life.wait(() => (A.object as unknown as { applicationProjectionDeclaration(directory: ScopeRef, item: number, name: string): Promise<unknown> }).applicationProjectionDeclaration(query.directory, job, "board"));
    expect(metadata).toMatchObject({ projection: packet.package.semantic.projections["board"] });
    expect(await life.wait(() => (D.object as unknown as { applicationRoom(): Promise<unknown> }).applicationRoom())).toEqual({ directory: query.directory, rules: await life.wait(() => A.at()) });
    const read = async (q = query, authorization: string | null = session.session.reader()) => life.owner.required(async () => {
      const response = await life.wait(() => nativeWorker.fetch(new Request(`https://scopes.test/v1/scopes/${app.name}/application-projection?p=${encodeApplicationProjectionQuery(q)}`, {
        headers: authorization === null ? {} : { authorization },
      }), bindings));
      const bytes = new Uint8Array(await response.arrayBuffer());
      return { status: response.status, value: readApplicationProjectionReply(bytes, q), raw: new TextDecoder().decode(bytes) };
    });
    expect(await read(query, null)).toMatchObject({ status: 403, value: { ok: false, reason: "forbidden" } });
    expect(await read()).toMatchObject({ status: 409, value: { ok: false, reason: "incomplete" } });
    const emptyActivity = await read(activityQuery);
    expect(emptyActivity.value).toMatchObject({ ok: true, value: { sources: { events: [] } } });
    if (!emptyActivity.value?.ok) throw Error("An empty recent journal selection must be readable.");
    const emptyViews = new McpService({ ...port, custody: custodyStore(), declaredViews: { bytes: packet.bytes, release: packet.ids.release, item: job } });
    const emptyOpening = await life.wait(() => emptyViews.call("view_activity", { view: "empty-activity" }));
    expect(emptyOpening.structuredContent).toMatchObject({ status: "empty", identity: null });
    expect(emptyOpening.content[0]!.text).toContain("no matching entries in its recent window");
    expect(emptyOpening.structuredContent).not.toHaveProperty("data");
    expect((await life.wait(() => emptyViews.call("view_read", { view: "empty-activity" }))).structuredContent).toMatchObject({ display: {
      status: "empty", data: emptyActivity.value.value, context: { projection: [{ scope: app.name, ...emptyActivity.value.value.at }], entriesRead: [] },
    } });
    const emptySurface = await life.wait(() => emptyViews.call("view_overview", { view: "empty-overview" }));
    expect(emptySurface.structuredContent).toMatchObject({ status: "empty", identity: null });
    expect(emptySurface.structuredContent).not.toHaveProperty("surface");
    expect((await life.wait(() => emptyViews.call("view_read", { view: "empty-overview" }))).structuredContent).toMatchObject({ display: {
      status: "empty", data: emptyActivity.value.value, surface: { resource: "ui://fixture/activity", opens: {} },
      context: { projection: [{ scope: app.name, ...emptyActivity.value.value.at }], entriesRead: [] },
    } });
    await life.wait(() => app.did(rita, "initialize", { expected: { configuration: 1 } }));
    const first = await read();
    expect(first.status, first.raw).toBe(200); expect(first.value?.ok).toBe(true); if (!first.value?.ok) return;
    expect(first.value.value.sources["board"]).toMatchObject([{ type: "board", state: "paused", revision: 1, fields: { lastNumber: 0 } }]);
    expect(first.value.value.at).toEqual((await life.wait(() => app.summary())).at);
    expect(first.raw).toBe(canonicalize(first.value));
    const activity = await read(activityQuery);
    expect(activity.status, activity.raw).toBe(200);
    expect(activity.value).toMatchObject({ ok: true, value: { at: first.value.value.at, sources: { events: [{ type: "initialize", state: "sealed", fields: { actor: { membership } } }] } } });
    if (!activity.value?.ok) throw Error("The native activity projection must be readable.");
    expect(activity.value.value.sources["events"]![0]!.entry).toEqual({ at: query.scope, seq: first.value.value.at.seq, hash: first.value.value.at.hash });
    // Local issuer fixture removes only history from the actual issued claims.
    const actual = authenticateSession(() => room.sessions, session.session.reader());
    if (!("claims" in actual)) throw Error("The original native-issued session must open.");
    expect(activity.value.value.sources["events"]![0]!.fields["actor"]).toEqual({ membership, member: actual.claims.member });
    const noHistory = readerOf(mintSession(room.sessions, { ...actual.claims, reads: actual.claims.reads.filter(read => read !== "history") }));
    expect(await read(activityQuery, noHistory)).toMatchObject({ status: 403, value: { ok: false, reason: "forbidden" } });
    const clockQuery = { ...query, projection: "clock" }, clock = await read(clockQuery);
    expect(clock.status, clock.raw).toBe(200);
    expect(clock.value).toMatchObject({ ok: true, value: { at: first.value.value.at, sources: { board: [{ fields: {
      seenTime: activity.value.value.sources["events"]![0]!.time,
      seenBy: { membership, member: actual.claims.member },
    } }] } } });
    // Fact timestamps expose item metadata, with the same item visibility.
    // A journal window still requires history, as checked above.
    expect((await read(clockQuery, noHistory)).raw).toBe(clock.raw);
    const noScopeRead = readerOf(mintSession(room.sessions, { ...actual.claims, reads: actual.claims.reads.filter(read => !["summary", "items", "query-items"].includes(read)) }));
    expect(await read(query, noScopeRead)).toMatchObject({ status: 403, value: { ok: false, reason: "forbidden" } });
    expect(await read(clockQuery, noScopeRead)).toMatchObject({ status: 403, value: { ok: false, reason: "forbidden" } });
    const mcpRead = await life.wait(() => mcp.reads.projection(membership, query));
    expect(canonicalize(mcpRead)).toBe(first.raw);
    expect((await life.wait(() => mcp.call("application_installation", { item: job }))).structuredContent).toMatchObject({ item: job, state: "active", scope: query.scope });
    const http = httpTransport("https://scopes.test", { fetch: (url, init) => nativeWorker.fetch(new Request(url, init), bindings) });
    const binding = bindingTransport(env.PLATFORM_API as unknown as ServiceBinding);
    for (const transport of [http, binding]) {
      const bytes = await life.owner.required(() => transport.applicationProjection(app.name, session.session.reader(), encodeApplicationProjectionQuery(query)!));
      expect(bytes).toBe(first.raw);
      const value = await life.owner.required(() => new ScopeHandle(transport, app.name, session.session.reader()).applicationProjection(query));
      expect(value).toEqual(first.value);
      expect(await life.owner.required(() => transport.applicationProjection(app.name, session.session.reader(), encodeApplicationProjectionQuery(activityQuery)!))).toBe(activity.raw);
    }
    expect(await read({ ...query, install: job + 100 })).toMatchObject({ status: 409, value: { ok: false, reason: "query-not-ready" } });
    const ads = peer.ads(); await env.APPLICATION_CONTENT.delete(f.key);
    await life.wait(() => A.restart()); await life.wait(() => app.restart());
    expect((await read()).raw).toBe(first.raw); expect(peer.ads()).toBe(ads);
    expect((await read(clockQuery)).raw).toBe(clock.raw);
    // Real native storage and production read owner. Only the post-body
    // session-configuration loss is scripted; it changes no roster or key.
    const finalAuthority = await life.wait(() => runInDurableObject(app.object, async (_instance, state) => {
      const results = [];
      for (const kind of ["board", "activity", "clock"]) for (const fault of kind === "board" ? ["none", "sessions"] : kind === "clock" ? ["none", "sessions", "missing"] : ["none", "sessions", "oversize"]) {
        const raw = { exec: (sql: string, ...args: SqlValue[]) => state.storage.sql.exec(sql, ...args), transaction: <T>(work: () => T) => state.storage.transactionSync(work) };
        const store = new SqliteStore(raw), core = new Scope(app.name, store, production(), PROPOSED_BOUNDS);
        let sessions: Sessions | null = room.sessions, bodies = 0, metadata = 0;
        const sql = { exec(text: string, ...args: SqlValue[]) {
          const cursor = raw.exec(text, ...args);
          if (fault === "oversize" && text.startsWith("SELECT seq,hash,time,size FROM entry WHERE")) {
            const rows = cursor.toArray();
            return { toArray: () => rows.map((row, i) => i === 0 ? { ...row, size: ITEM_QUERY_BOUNDS.payloadBytes + 1 } : row) };
          }
          if (text.startsWith(kind === "activity" ? "SELECT bytes FROM entry WHERE seq=? AND hash=?" : "SELECT record FROM item")) { bodies++; if (fault === "sessions" && kind !== "clock") sessions = null; }
          if (kind === "clock" && text.startsWith("SELECT seq,hash,time FROM entry WHERE seq IN")) {
            metadata++; if (fault === "sessions") sessions = null;
            if (fault === "missing") return { toArray: () => [] };
          }
          return cursor;
        } };
        const preparation = new ReadPreparation(sql, { policy: () => "projection-authority-test-v1", declared: bytes => core.validate(bytes), platform: named => core.platform(named) });
        const sessionPreparation = new SessionPreparation(preparation, () => sessions, net.clock, sessionReferencesIn(env.PLATFORM));
        const owner = new ApplicationProjections({ name: app.name, sql, sessions: () => sessions, clock: net.clock, sessionPreparation,
          flights: new PreparationFlights(), source: applicationDeclarationsIn(env.PLATFORM) });
        results.push({ kind, fault, result: await owner.read(encodeApplicationProjectionQuery({ ...query, projection: kind }), session.session.reader()), bodies, metadata });
      }
      return results;
    }));
    expect(finalAuthority.map(row => row.result.ok ? "ok" : row.result.reason)).toEqual(["ok", "sessions-unavailable", "ok", "sessions-unavailable", "too-large", "ok", "sessions-unavailable", "unavailable"]);
    expect(finalAuthority.map(row => row.bodies)).toEqual([1, 1, first.value.value.at.seq + 1, first.value.value.at.seq + 1, 0, 1, 1, 1]);
    expect(finalAuthority.map(row => row.metadata)).toEqual([0, 0, 0, 0, 0, 1, 1, 1]);
    const board = first.value.value.sources["board"]![0]!;
    const signerQuery = { ...query, projection: "signer" };
    const signerFields = async () => {
      const result = await read(signerQuery, noHistory);
      expect(result.status, result.raw).toBe(200);
      expect(result.value?.ok, result.raw).toBe(true);
      return result.value?.ok ? result.value.value.sources["board"]![0]!.fields : null;
    };
    expect(await signerFields()).toEqual({ seenBy: { membership, member: actual.claims.member } });
    // Actual SQLite retention/index faults, restored byte-for-byte before
    // the original scenario continues. No history scan or key lookup is
    // substituted for an absent exact fact or a legacy unindexed entry.
    const seen = first.value.value.at;
    const retained = await life.wait(() => runInDurableObject(app.object, (_instance, state) => ({
      entry: state.storage.sql.exec("SELECT * FROM entry WHERE seq=?", seen.seq).toArray()[0]!,
      signer: state.storage.sql.exec("SELECT * FROM entry_fact_signer WHERE seq=?", seen.seq).toArray()[0]!,
      item: state.storage.sql.exec("SELECT record FROM item WHERE id=?", board.id).one()['record'] as string,
    })));
    try {
      await life.wait(() => runInDurableObject(app.object, (_instance, state) => state.storage.sql.exec("DELETE FROM entry_fact_signer WHERE seq=?", seen.seq).toArray()));
      await life.wait(() => app.restart());
      expect(await signerFields()).toEqual({ seenBy: null });
      await life.wait(() => runInDurableObject(app.object, (_instance, state) => state.storage.sql.exec("INSERT INTO entry_fact_signer (seq,hash,member) VALUES (?,?,?)", retained.signer['seq']!, retained.signer['hash']!, retained.signer['member']!).toArray()));
      const altered = JSON.parse(retained.item); altered.refs.seen = { at: query.scope, seq: seen.seq, hash: textDigest("PUBLIC TEST changed probe fact hash") };
      await life.wait(() => runInDurableObject(app.object, (_instance, state) => state.storage.sql.exec("UPDATE item SET record=? WHERE id=?", canonicalize(altered), board.id).toArray()));
      expect(await signerFields()).toEqual({ seenBy: null });
      await life.wait(() => runInDurableObject(app.object, (_instance, state) => state.storage.sql.exec("UPDATE item SET record=? WHERE id=?", retained.item, board.id).toArray()));
      await life.wait(() => runInDurableObject(app.object, (_instance, state) => {
        state.storage.sql.exec("DELETE FROM entry WHERE seq=?", seen.seq).toArray();
        expect(state.storage.sql.exec("SELECT seq FROM entry_fact_signer WHERE seq=?", seen.seq).toArray()).toEqual([]);
      }));
      expect(await signerFields()).toEqual({ seenBy: null });
    } finally {
      await life.wait(() => runInDurableObject(app.object, (_instance, state) => state.storage.transactionSync(() => {
        state.storage.sql.exec("UPDATE item SET record=? WHERE id=?", retained.item, board.id).toArray();
        const e = retained.entry, s = retained.signer;
        state.storage.sql.exec("INSERT OR REPLACE INTO entry (seq,hash,time,bytes,size,actor,idem,intent) VALUES (?,?,?,?,?,?,?,?)", e['seq']!, e['hash']!, e['time']!, e['bytes']!, e['size']!, e['actor']!, e['idem']!, e['intent']!).toArray();
        state.storage.sql.exec("INSERT OR REPLACE INTO entry_fact_signer (seq,hash,member) VALUES (?,?,?)", s['seq']!, s['hash']!, s['member']!).toArray();
      })));
    }
    expect(await signerFields()).toEqual({ seenBy: { membership, member: actual.claims.member } });
    await life.wait(() => app.did(rita, "reset", { on: board.id, expected: { on: board.revision }, fields: { generation: 1 } }));
    const updated = await read(); expect(updated.status, updated.raw).toBe(200); if (!updated.value?.ok) return;
    expect(updated.value.value.sources["board"]![0]!.revision).toBe(board.revision + 1);
    expect(updated.value.value.at).not.toEqual(first.value.value.at);
    expect((await life.wait(() => A.entries())).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "install-application")).toHaveLength(1);
    let viewSignatures = 0;
    const signer = secretSigner(rita.secret);
    const views = new McpService({ ...port, custody: custodyStore(), declaredViews: { bytes: packet.bytes, release: packet.ids.release, item: job },
      signer: { key: signer.key, sign: bytes => { if (new TextDecoder().decode(bytes).startsWith(`${DOMAINS.intent}\n`)) viewSignatures++; return signer.sign(bytes); } },
    });
    expect((await life.wait(() => views.call("view_board", { view: "paused" }))).isError).toBe(false);
    const paused = await life.wait(() => views.call("view_read", { view: "paused" }));
    expect(paused.structuredContent).toMatchObject({ display: { card: { declared: { data: updated.value.value } } } });
    const currentActivity = await read(activityQuery);
    if (!currentActivity.value?.ok) throw Error("The updated activity projection must be readable.");
    expect((await life.wait(() => views.call("view_activity", { view: "activity" }))).isError).toBe(false);
    expect((await life.wait(() => views.call("view_read", { view: "activity" }))).structuredContent).toMatchObject({ display: {
      query: { page: "item" }, card: { identity: { kind: "entry", at: {} }, actions: [], declared: { kind: "log", data: currentActivity.value.value } },
      context: { entriesRead: [], reviewIntended: [] },
    } });
    expect((await life.wait(() => views.call("view_act", { view: "activity", cut: 0, action: "pause" }))).structuredContent).toMatchObject({ error: "view", reason: "shape" });
    expect((await life.wait(() => views.call("view_overview", { view: "overview" }))).isError).toBe(false);
    expect((await life.wait(() => views.call("view_read", { view: "overview" }))).structuredContent).toMatchObject({ display: {
      query: { page: "item" }, card: { identity: { kind: "scope", revision: String(currentActivity.value.value.at.seq), at: {} }, actions: [],
        declared: { kind: "surface", data: currentActivity.value.value, surface: { resource: "ui://fixture/activity", opens: {} } } },
      context: { entriesRead: [], reviewIntended: [] },
    } });
    expect((await life.wait(() => views.call("view_act", { view: "overview", cut: 0, action: "pause" }))).structuredContent).toMatchObject({ error: "view", reason: "shape" });
    expect(viewSignatures).toBe(0);
    const start = async () => {
      const current = (await read()).value;
      if (!current?.ok) throw Error("The board must be readable before the native control.");
      await life.wait(() => app.did(rita, "start", { on: board.id, expected: { on: current.value.sources["board"]![0]!.revision } }));
    };
    const open = async (view: string) => {
      const opening = await life.wait(() => views.call("view_board", { view }));
      expect(opening.isError, JSON.stringify(opening.structuredContent)).toBe(false);
      expect(JSON.stringify(opening)).not.toContain("lastNumber");
      const detail = await life.wait(() => views.call("view_read", { view, cut: 0, page: "item" }));
      expect(detail.structuredContent).toMatchObject({ display: { cut: 1, card: { actions: [{ id: "pause" }] } } });
    };
    await start(); await open("stale");
    const opened = (await read()).value; if (!opened?.ok) throw Error("Expected open board.");
    await life.wait(() => app.did(rita, "pause", { on: board.id, expected: { on: opened.value.sources["board"]![0]!.revision } }));
    expect((await life.wait(() => views.call("view_act", { view: "stale", cut: 1, action: "pause" }))).structuredContent).toMatchObject({ error: "view", reason: "stale" });
    expect(viewSignatures).toBe(0);
    await start(); await open("current");
    expect((await life.wait(() => views.call("view_act", { view: "current", cut: 1, action: "pause" }))).structuredContent).toMatchObject({ result: { structuredContent: { answer: "accepted" } } });
    expect(viewSignatures).toBe(1);
    await start(); await open("role-loss");
    const roster = await life.wait(() => M.item(0)), actions = roster.values["adminActions"] as readonly string[];
    await life.wait(() => M.did(rita, "set-actions", { on: 0, expected: { on: roster.revision }, fields: { role: "admin", actions: actions.filter(action => action !== "counting.control") } }));
    expect((await life.wait(() => views.call("view_act", { view: "role-loss", cut: 1, action: "pause" }))).structuredContent).toMatchObject({ error: "view", reason: "stale" });
    expect(viewSignatures).toBe(1);
    const changedRoster = await life.wait(() => M.item(0));
    await life.wait(() => M.did(rita, "set-actions", { on: 0, expected: { on: changedRoster.revision }, fields: { role: "admin", actions } }));
    await open("role-restored");
    expect((await life.wait(() => views.call("view_act", { view: "role-restored", cut: 1, action: "pause" }))).structuredContent).toMatchObject({ result: { structuredContent: { answer: "accepted" } } });
    expect(viewSignatures).toBe(2);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); life.release(); }
}, 30_000);
