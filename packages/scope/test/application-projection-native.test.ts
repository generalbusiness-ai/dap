/** Real native install/authority, SQLite retention, issued read session,
 * private local R2, generic Room route and journal projection. Git/repository
 * host, clock, scheduler and setup inspector are explicit fixtures. No live
 * provider, deployed host, arbitrary package containment or browser runs. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { canonicalize, isSeed, scopeIdOf, textDigest } from "@generalbusiness/artroom-bytes";
import { encodeApplicationProjectionQuery, readApplicationProjectionReply } from "@generalbusiness/artroom-bytes/application-v2";
import { PROPOSED_BOUNDS, type ApplicationProjectionQuery, type ScopeRef } from "@generalbusiness/dap-contract";
import { DECLARED_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { requestSession, sessionRequest } from "@generalbusiness/artroom-client";
import nativeWorker from "../../../apps/room/worker.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationCounterPacket2 } from "./support/application-v2-fixture.ts";
import { applicationResolverFixture } from "./support/application-fixture.ts";
import { applicationHttpPeer } from "./support/application-http-peer.ts";
import { sessionRoom } from "./support/session-room.ts";
import { dispatchFixture, driveFixture, effectFixture } from "./support/native-fixture-lifetime.ts";
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
import type { Sessions } from "../src/sessions.ts";

test("native installed projection reads exact journal state and survives R2 deletion and eviction", async () => {
  const room = await sessionRoom(C.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The native cohort needs its three siblings.");
  const packet = await applicationCounterPacket2("state = 'open'", "native"), f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet);
  const peer = applicationHttpPeer(f), bindings = { SCOPES: env.PLATFORM, APPLICATION_CONTENT: env.APPLICATION_CONTENT, APPLICATION_TRUST: JSON.stringify(f.trust) };
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) {
      life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
      await life.wait(() => node.restart());
    }
    const signed = await life.wait(() => A.intent(rita, "install-application", { fields: {
      uri: f.uri, release: packet.ids.release, semantic: packet.ids.semantic, roles: ["admin", "member"], values: '{"target":7}',
      ...Object.fromEntries(packet.package.semantic.definitions.map((part, i) => [`definitionText${i}`, textDigest(part.bytes)])),
    } }));
    const accepted = await life.wait(() => A.stub.submit(signed, [], { values: [canonicalize(packet.package.semantic), canonicalize(packet.package.release)], texts: packet.package.semantic.definitions.map(part => part.bytes) }));
    expect(accepted.answer).toBe("accepted"); if (accepted.answer !== "accepted") return;
    const job = accepted.receipt.fact.seq;
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
    await life.wait(() => app.did(rita, "initialize", { expected: { configuration: 1 } }));
    const first = await read();
    expect(first.status, first.raw).toBe(200); expect(first.value?.ok).toBe(true); if (!first.value?.ok) return;
    expect(first.value.value.sources["board"]).toMatchObject([{ type: "board", state: "paused", revision: 1, fields: { lastNumber: 0 } }]);
    expect(first.value.value.at).toEqual((await life.wait(() => app.summary())).at);
    expect(first.raw).toBe(canonicalize(first.value));
    expect(await read({ ...query, install: job + 100 })).toMatchObject({ status: 409, value: { ok: false, reason: "query-not-ready" } });
    const ads = peer.ads(); await env.APPLICATION_CONTENT.delete(f.key);
    await life.wait(() => A.restart()); await life.wait(() => app.restart());
    expect((await read()).raw).toBe(first.raw); expect(peer.ads()).toBe(ads);
    // Real native storage and production read owner. Only the post-body
    // session-configuration loss is scripted; it changes no roster or key.
    const finalAuthority = await life.wait(() => runInDurableObject(app.object, async (_instance, state) => {
      const results = [];
      for (const fault of [false, true]) {
        const raw = { exec: (sql: string, ...args: SqlValue[]) => state.storage.sql.exec(sql, ...args), transaction: <T>(work: () => T) => state.storage.transactionSync(work) };
        const store = new SqliteStore(raw), core = new Scope(app.name, store, production(), PROPOSED_BOUNDS);
        let sessions: Sessions | null = room.sessions, bodies = 0;
        const sql = { exec(text: string, ...args: SqlValue[]) {
          const cursor = raw.exec(text, ...args);
          if (text.startsWith("SELECT record FROM item")) { bodies++; if (fault) sessions = null; }
          return cursor;
        } };
        const preparation = new ReadPreparation(sql, { policy: () => "projection-authority-test-v1", declared: bytes => core.validate(bytes), platform: named => core.platform(named) });
        const sessionPreparation = new SessionPreparation(preparation, () => sessions, net.clock, sessionReferencesIn(env.PLATFORM));
        const owner = new ApplicationProjections({ name: app.name, sql, sessions: () => sessions, clock: net.clock, sessionPreparation,
          flights: new PreparationFlights(), source: applicationDeclarationsIn(env.PLATFORM) });
        results.push({ fault, result: await owner.read(encodeApplicationProjectionQuery(query), session.session.reader()), bodies });
      }
      return results;
    }));
    expect(finalAuthority.map(row => row.result.ok ? "ok" : row.result.reason)).toEqual(["ok", "sessions-unavailable"]);
    expect(finalAuthority.map(row => row.bodies)).toEqual([1, 1]);
    const board = first.value.value.sources["board"]![0]!;
    await life.wait(() => app.did(rita, "reset", { on: board.id, expected: { on: board.revision }, fields: { generation: 1 } }));
    const updated = await read(); expect(updated.status, updated.raw).toBe(200); if (!updated.value?.ok) return;
    expect(updated.value.value.sources["board"]![0]!.revision).toBe(board.revision + 1);
    expect(updated.value.value.at).not.toEqual(first.value.value.at);
    expect((await life.wait(() => A.entries())).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "install-application")).toHaveLength(1);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); life.release(); }
}, 30_000);
