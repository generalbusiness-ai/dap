/**
 * One real default-256 SQLite/McpService population. Destination@3 boundary
 * entries use real derive/platform judgment; membership, sessions and HTTP
 * authority remain SCRIPTED. This is not hosted or sealed-floor acceptance.
 */
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
import { expect, test, vi } from "vitest";
import type { SignedIntent } from "@generalbusiness/dap-contract";
import { DOMAINS, SESSION_DOMAINS } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isRecord, timeOf, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { CustodyError, EXPIRY_MARGIN_MS, identityId, type CustodyStore, type Identity } from "@generalbusiness/dap-client";
import { sqliteStore, SQLITE_CUSTODY_BOUNDS, type Sql, type SqlValue } from "../src/sqlite-custody.ts";
import { McpService } from "../src/service.ts";
import { fixedSigner } from "./fixtures.ts";
import { absenceDestination } from "./support/absence-destination.ts";
import { SERVICE, StandIn } from "./support/standin.ts";

/** The existing Node SQLite adapter: transactions remain real, including rollback. */
function nodeSql(): Sql & { db: DatabaseSync } {
  const db = new DatabaseSync(":memory:");
  let depth = 0;
  return { db,
    exec: (query, ...bindings) => {
      const statement = db.prepare(query);
      const args = bindings.map(b => b instanceof ArrayBuffer ? new Uint8Array(b) : b) as never[];
      const rows = /^\s*SELECT/i.test(query) ? statement.all(...args) : (statement.run(...args), []);
      return { toArray: () => rows as Record<string, SqlValue>[] };
    },
    transaction: closure => {
      if (depth > 0) return closure();
      db.exec("BEGIN"); depth++;
      try { const result = closure(); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
      finally { depth--; }
    },
  };
}

test("a full real SQLite custody population frees one slot only after a valid other-signer head reaches the latest signing expiry", async () => {
  const setupStarted = performance.now();
  const sql = nodeSql();
  try {
    let now = Date.parse("2099-01-01T00:00:00Z");
    const fixed = fixedSigner(25), stand = new StandIn(fixed.key);
    const destination = absenceDestination(stand);
    const store = sqliteStore(sql, SQLITE_CUSTODY_BOUNDS, () => now);
    let actSignatures = 0, sessionSignatures = 0, otherSignatures = 0, dispatches = 0, countRefusals = 0, servedLogRows = 0, servedLogBytes = 0;
    const requests: Record<string, number> = {};
    const submitted: SignedIntent[] = [];
    const signer = { key: fixed.key, sign: (bytes: Uint8Array) => {
      const text = new TextDecoder().decode(bytes);
      if (text.startsWith(`${DOMAINS.intent}\n`)) actSignatures++;
      else if (text.startsWith(`${SESSION_DOMAINS.request}\n`)) sessionSignatures++;
      else otherSignatures++;
      return fixed.sign(bytes);
    } };
    // Observe the genuine admission refusal, preserving its exception and every
    // store operation. Public failure wording intentionally omits count/budget.
    const custody: CustodyStore = { ...store, async exclusive<T>(work: () => Promise<T>): Promise<T> {
      try { return await store.exclusive(work); }
      catch (error) {
        if (error instanceof CustodyError && error.why.held === "full" && error.why.reason === "count") countRefusals++;
        throw error;
      }
    } };
    const service = new McpService({ service: SERVICE, signer, custody, now: () => now,
      config: { read: async () => stand.config(), addRoot: async () => { throw Error("The witness grants no root"); } },
      fetch: async (url, init) => {
        const path = new URL(url).pathname, method = init?.method ?? "GET";
        const route = path.split("/")[4] ?? "summary";
        requests[`${method} ${route}`] = (requests[`${method} ${route}`] ?? 0) + 1;
        if (method === "POST" && path === `/v1/scopes/${stand.destination.scope}/acts`) {
          dispatches++;
          if (typeof init?.body !== "string") throw Error("The actual ACT dispatch needs its encoded body");
          const body = JSON.parse(init.body) as { signed: SignedIntent };
          submitted.push(body.signed);
          // Lose the request before the scripted service can append it. This
          // records a real ACT dispatch, not a Native acceptance or receipt.
          throw Error("SCRIPTED lost target ACT reply before acceptance");
        }
        const reply = await stand.fetch(url, init);
        if (method === "GET" && path === `/v1/scopes/${stand.destination.scope}/log`) {
          // StandIn returns the transport's small reply shape. Wrap its actual
          // stream once; inspect only a clone and pass the original byte branch.
          if (!(reply.body instanceof ReadableStream)) expect.fail("The scripted log reply needs its actual byte stream");
          const response = new Response(reply.body, { status: reply.status });
          const bytes = await response.clone().arrayBuffer();
          const decoded: unknown = JSON.parse(new TextDecoder().decode(bytes));
          if (!isRecord(decoded) || !isRecord(decoded["value"]) || !Array.isArray(decoded["value"]["entries"])) {
            expect.fail("The observed log reply must contain its actual entries array");
          }
          servedLogRows += decoded["value"]["entries"].length;
          servedLogBytes += bytes.byteLength;
          return { ...reply, body: response.body };
        }
        return reply;
      },
    });
    const recovery = vi.spyOn(service.reads, "recoverAbsent");
    console.info(JSON.stringify({ witness: "ce2-default256", phase: "sqlite-and-real-destination-setup",
      milliseconds: performance.now() - setupStarted, targetEntries: destination.ledger.entries.length,
      used: store.used(), reserved: store.reserved() }));
    async function current(identity: Identity) {
      const record = await service.custody.find(identity);
      if (!record) throw Error("The actual call must leave its custody original");
      return record;
    }
    async function phase<T>(name: string, run: () => Promise<T>): Promise<T> {
      const start = performance.now();
      const before = { actSignatures, sessionSignatures, otherSignatures, dispatches, servedLogRows, servedLogBytes, helperCalls: recovery.mock.calls.length, requests: { ...requests } };
      try { return await run(); }
      finally {
        const requestDelta = Object.fromEntries(Object.entries(requests).map(([route, count]) => [route, count - (before.requests[route] ?? 0)]));
        console.info(JSON.stringify({ witness: "ce2-default256", phase: name, milliseconds: performance.now() - start,
          actSignatures: actSignatures - before.actSignatures, sessionSignatures: sessionSignatures - before.sessionSignatures,
          otherSignatures: otherSignatures - before.otherSignatures, dispatches: dispatches - before.dispatches, helperCalls: recovery.mock.calls.length - before.helperCalls,
          requests: requestDelta, servedLogRows: servedLogRows - before.servedLogRows, servedLogBytes: servedLogBytes - before.servedLogBytes, targetEntries: destination.ledger.entries.length,
          unresolved: (await store.unresolved()).length, used: store.used(), reserved: store.reserved() }));
      }
    }
    const call = (key: string) => service.call("repository.read-token", { on: 0, fields: { hours: 1 }, idempotencyKey: key });
    const keys = Array.from({ length: 256 }, (_, i) => `ce2-${i.toString().padStart(3, "0")}`);
    const fresh = "ce2-256";
    await phase("initialization", async () => {
      await service.page();
      expect(await store.unresolved()).toEqual([]);
      expect([actSignatures, dispatches]).toEqual([0, 0]);
    });
    await phase("one-real-256-load", async () => {
      for (const key of keys) await call(key);
      const unresolved = await store.unresolved();
      expect(unresolved.map(row => row.key).sort()).toEqual(keys);
      expect([actSignatures, dispatches, submitted.length]).toEqual([256, 256, 256]);
      expect(new Set(submitted.map(signed => signed.intent.idempotencyKey)).size).toBe(256);
      expect(submitted.every(verifySignedIntent)).toBe(true);
    });
    const identity: Identity = { service: SERVICE, membership: stand.membership, signer: signer.key, target: stand.destination, key: keys[0]! };
    const record = await current(identity), index = record.signings.length - 1;
    expect(record.phase).toBe("unknown");
    expect(record.binding.pinned).toBe("platform:destination@3");
    expect(record.envelope.signed).toEqual(submitted[0]);
    const notAfter = record.signings[index]!.notAfter, expiry = Date.parse(notAfter);
    expect(Number.isFinite(expiry)).toBe(true);
    // One stable local clock for both proof branches; only the journal head
    // moves. The margin admits a proof attempt, not a scope-time assertion.
    now = expiry + EXPIRY_MARGIN_MS + 1;
    stand.sessionEnds = timeOf(now + 600_000);
    expect(service.custody.dead(record.signings[index]!)).toBe(true);
    const original = canonicalize(record), originalEnvelope = canonicalize(record.envelope);
    const id = identityId(identity), originalIdentityCharge = store.identity(id), originalReserved = store.reserved();
    const originals = new Map<string, string>();
    for (const row of await store.unresolved()) originals.set(row.id, canonicalize(await store.read(row.id)));
    async function blocked() {
      const before = [actSignatures, dispatches, countRefusals];
      const result = await call(fresh);
      expect(result.isError).toBe(true);
      expect(result.structuredContent["error"]).toBe("custody");
      expect([actSignatures, dispatches, countRefusals]).toEqual([before[0], before[1], before[2]! + 1]);
      expect((await store.unresolved()).length).toBe(256);
    }
    await phase("not-found-only-remains-full", async () => {
      const before = [actSignatures, dispatches];
      const settled = await service.custody.settle(identity, async envelope => {
        const read = await service.reads.transport.settle(stand.destination.scope, envelope.signed);
        return read.ok ? read.value : read.reason === "archived" ? read : null;
      });
      expect(settled?.decided).toBeNull();
      expect(canonicalize(await current(identity))).toBe(original);
      expect([actSignatures, dispatches]).toEqual(before);
      await blocked();
    });
    async function publicSettle() {
      const before = [actSignatures, dispatches];
      const result = await service.call("settle", { target: "destination", idempotencyKey: identity.key });
      expect(result.isError).toBe(true);
      expect(result.structuredContent["error"]).toBe("custody");
      for (const field of ["answer", "receipt", "refused"]) expect(result.structuredContent).not.toHaveProperty(field);
      expect([actSignatures, dispatches]).toEqual(before);
      return result;
    }
    await phase("verified-head-before-expiry", async () => {
      const pair = destination.appendAt(expiry - 1, "ce2-other-before-expiry");
      expect(pair.sealed.entry.input.type).toBe("act");
      if (pair.sealed.entry.input.type !== "act") expect.fail("The boundary entry must be an ACT");
      expect(pair.sealed.entry.input.signed.intent.actor).toBe(destination.otherSigner);
      expect(destination.otherSigner).not.toBe(signer.key);
      expect(pair.sealed.entry.seq).toBe(pair.previous.entry.seq + 1);
      expect(pair.sealed.entry.prev).toBe(pair.previous.hash);
      expect(pair.sealed.hash).toBe(entryHash(pair.sealed.entry));
      expect(Date.parse(pair.sealed.entry.time)).toBe(expiry - 1);
      const early = await publicSettle();
      expect(early.structuredContent["message"]).toContain("The verified scope journal has no entry at or past this request's expiry.");
      expect(early.structuredContent["next"]).toContain("after the scope records a later entry at or past the request's expiry");
      expect(canonicalize(await current(identity))).toBe(original);
      expect(store.identity(id)).toEqual(originalIdentityCharge);
      expect(store.reserved()).toBe(originalReserved);
      await blocked();
    });
    await phase("verified-head-at-expiry", async () => {
      const pair = destination.appendAt(expiry, "ce2-other-at-expiry");
      expect(pair.sealed.entry.input.type).toBe("act");
      if (pair.sealed.entry.input.type !== "act") expect.fail("The boundary entry must be an ACT");
      expect(pair.sealed.entry.input.signed.intent.actor).toBe(destination.otherSigner);
      expect(pair.sealed.entry.input.signed.intent.idempotencyKey).not.toBe(identity.key);
      expect(pair.sealed.entry.seq).toBe(pair.previous.entry.seq + 1);
      expect(pair.sealed.entry.prev).toBe(pair.previous.hash);
      expect(pair.sealed.hash).not.toBe(pair.previous.hash);
      expect(pair.sealed.hash).toBe(entryHash(pair.sealed.entry));
      expect(Date.parse(pair.sealed.entry.time)).toBe(expiry);
      await publicSettle();
      const ended = await current(identity);
      expect(ended.phase).toBe("refused");
      expect(ended.signings[index]!.closed).toBe(true);
      expect(canonicalize(ended.envelope)).toBe(originalEnvelope);
      expect(await service.custody.decided(id, ended)).toMatchObject({ unsent: destination.ledger.head });
      expect(await service.custody.decided(id, ended)).not.toHaveProperty("answer");
      expect((await store.unresolved()).length).toBe(255);
      expect(store.identity(id).reserved).toBe(0);
      expect(store.reserved()).toBe(originalReserved - originalIdentityCharge.reserved);
      for (const [other, bytes] of originals) if (other !== id) expect(canonicalize(await store.read(other))).toBe(bytes);
    });
    await phase("retained-proof-reused-without-act-or-new-proof", async () => {
      const ended = await current(identity);
      const retained = canonicalize(ended), outcomes = canonicalize(await service.custody.outcomes(id, ended));
      const capacity = { unresolved: canonicalize(await store.unresolved()), used: store.used(), reserved: store.reserved(), identity: store.identity(id) };
      const activity = () => ({ actSignatures, dispatches, helperCalls: recovery.mock.calls.length,
        logRequests: requests["GET log"] ?? 0, servedLogRows, servedLogBytes });
      const before = activity();
      async function reused(result: Awaited<ReturnType<typeof call>>) {
        expect(result.isError).toBe(true);
        expect(result.structuredContent["error"]).toBe("custody");
        expect(result.structuredContent["message"]).toMatch(/absence proof/);
        for (const field of ["answer", "refused", "receipt"]) expect(result.structuredContent).not.toHaveProperty(field);
        expect(activity()).toEqual(before);
        const freshRecord = await current(identity);
        expect(freshRecord.phase).toBe("refused");
        expect(canonicalize(freshRecord)).toBe(retained);
        expect(canonicalize(freshRecord.envelope)).toBe(originalEnvelope);
        expect(canonicalize(await service.custody.outcomes(id, freshRecord))).toBe(outcomes);
        expect({ unresolved: canonicalize(await store.unresolved()), used: store.used(), reserved: store.reserved(), identity: store.identity(id) }).toEqual(capacity);
      }
      // An ordinary retry does not initiate a new proof or resend an expired ACT.
      await reused(await call(identity.key));
      // A later explicit settle reuses the same retained unsent proof as well.
      await reused(await service.call("settle", { target: "destination", idempotencyKey: identity.key }));
    });
    await phase("same-fresh-257th-actually-signs-and-dispatches", async () => {
      const before = [actSignatures, dispatches];
      await call(fresh);
      expect([actSignatures, dispatches]).toEqual([before[0]! + 1, before[1]! + 1]);
      const last = submitted.at(-1)!;
      expect(last.intent.idempotencyKey).toBe(fresh);
      expect(last.intent.actor).toBe(signer.key);
      expect(verifySignedIntent(last)).toBe(true);
      expect(last.intent.to).toEqual(stand.destination);
      const kept = await current({ ...identity, key: fresh });
      expect(kept.phase).toBe("unknown");
      expect(kept.envelope.signed).toEqual(last);
      expect((await store.unresolved()).length).toBe(256);
    });
  } finally { sql.db.close(); }
});
