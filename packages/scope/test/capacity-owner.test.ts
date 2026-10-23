import { capacityHoldReaderChange, capacityTokenOwnerChange } from "./definition-corpus-data.ts";
import { env } from "cloudflare:workers";
import { httpSource, verify } from "@generalbusiness/artroom-replay";
import { fixtureRoute as route } from "./support/serving-route.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry} from "@generalbusiness/dap-contract";
import { parseStrict } from "@generalbusiness/artroom-bytes";
import { JOB_READ_ACTION, ownerReservations, reserved } from "@generalbusiness/dap-derive";
import { grantOf, variant } from "@generalbusiness/dap-derive/testing";
import { SqliteStore } from "../src/index.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { controls } from "../src/testing.ts";
import { wired } from "./outside.ts";
import { Lane, START, at, creation, definition, stubOf, reader, una, vic } from "./fixtures-native.ts";

test("native capacity admits a hold reader without local holds and preserves its empty owner reservation through eviction and replay", async () => {
  const under = variant(definition.declared, capacityHoldReaderChange());
  expect(under.holdTypes).toEqual([]);
  const asked = creation(at(61), under), c = controls(asked.name, START);
  wired.set(asked.name, () => ({ capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE }));
  try {
    const created = await stubOf(asked.name).create(asked.signed, under.declared);
    expect(created.answer).toBe("accepted");
    if (created.answer !== "accepted") throw new Error(`hold reader must create: ${JSON.stringify(created)}`);
    const scope = new Lane(asked.name, c, created.receipt.fact.at, created.receipt, asked.signed);
    await scope.did(una, "touch", { on: 0, expected: { on: 1 } });
    const inspect = () => scope.inside(state => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
      return { owner: ownerReservations(CAPABILITY_CODE, store, under), keys: store.keyCounts(), snapshot: store.all() };
    });
    const before = await inspect();
    expect(before.owner).toEqual({ entries: 0, items: 0, records: 0, bytes: 0, requests: 0 });
    expect(before.keys.records).toBe(0);
    expect(await scope.act(una, "inspect", { on: 0, expected: { on: 1 } })).toMatchObject({ answer: "refused", reason: "capability-refused", name: "not-staged" });
    expect(await inspect()).toEqual(before);
    await scope.restart();
    expect(await inspect()).toEqual(before);
    const source = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES);
      return { status: response.status, body: response.body };
    } });
    const replayed = await verify(source, { mode: "replay", scope: scope.name, grants: "as-recorded", capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, bounds: c.bounds });
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  } finally { wired.delete(asked.name); }
});

test("native read-token reservations keep their entry bytes after the mint replaces its key and the object is evicted", async () => {
  // Real scope, native preparation/outcome code, SQLite, driver and eviction.
  // Lane data and authority are fixtures. The host answer below is a
  // stand-in, not a token minted at any provider. No raw record is injected.
  const under = variant(definition.declared, capacityTokenOwnerChange());
  const asked = creation(at(60), under), c = controls(asked.name, START);
  c.bounds = { ...c.bounds, scopeRecords: 1 };
  let sends = 0;
  wired.set(asked.name, () => ({ capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, outside: {
    accepts: (owner, kind) => owner === "git-read@1" && kind === "mint",
    send: async () => { sends++; return { result: "confirmed", evidence: { basis: "own-answer", body: { token: "tok_capacity_probe", ends: at(1700) } } }; },
  } }));
  try {
    const created = await stubOf(asked.name).create(asked.signed, under.declared);
    if (created.answer !== "accepted") throw new Error(`capacity owner scope must create: ${JSON.stringify(created)}`);
    const scope = new Lane(asked.name, c, created.receipt.fact.at, created.receipt, asked.signed);
    await scope.did(una, "publish", { fields: { checks: [{ name: "ci", checker: vic.member }] } });
    const job = await scope.did(una, "request-check", { fields: { name: "ci" } });
    expect(await scope.stub.prepare(scope.intent(vic, "git-read@1:job-read", { fields: { job: job.fact } }), [grantOf(vic, scope.at, [JOB_READ_ACTION])], "git-read@1", "job-read")).toMatchObject({ answer: "accepted" });
    await (scope.object as unknown as { effect(): Promise<number> }).effect();
    const inspect = () => scope.inside(state => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
      const head = parseStrict(store.stored(store.scope()!.head.seq)!.bytes) as Entry;
      return { keys: store.keyCounts(), token: store.record("git-read@1", "token", [1])?.state, owner: ownerReservations(CAPABILITY_CODE, store, under), pending: reserved(store, under, head.input, CAPABILITY_CODE), snapshot: store.all() };
    });
    const before = await inspect();
    expect([sends, before.keys.records, before.token]).toEqual([1, 1, "live"]);
    expect(before.owner).toEqual({ entries: 6, items: 0, records: 0, bytes: 6 * PROPOSED_BOUNDS.entryBytes, requests: 0 });
    expect(before.pending).toEqual({ entries: 7, items: 0, records: 0, bytes: 7 * PROPOSED_BOUNDS.entryBytes, requests: 0 });
    await scope.restart();
    expect(await inspect()).toEqual(before);
    expect(sends).toBe(1);
    // Updating minting -> live spent no second key. A different job would
    // create a second token record and must be refused at the same ceiling.
    const second = await scope.did(una, "request-check", { fields: { name: "ci" } });
    const beforeRefusal = await inspect();
    expect(await scope.stub.prepare(scope.intent(vic, "git-read@1:job-read", { fields: { job: second.fact } }), [grantOf(vic, scope.at, [JOB_READ_ACTION])], "git-read@1", "job-read")).toMatchObject({ answer: "refused", reason: "scope-full", name: "scopeRecords" });
    expect(await inspect()).toEqual(beforeRefusal);
    expect(sends).toBe(1);
    // Read the real journal and retained inputs through native HTTP routes.
    // The verifier trusts this fixture's recorded authority, and its host
    // answer remains synthetic; capability/owner derivation is native code.
    const source = httpSource("https://scope.test", { reader, fetch: async (url, init) => {
      const response = await route(new Request(url, init), env.SCOPES);
      return { status: response.status, body: response.body };
    } });
    const options = { mode: "replay", scope: scope.name, grants: "as-recorded", capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, bounds: c.bounds } as const;
    const replayed = await verify(source, options);
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
    const over = await verify(source, { ...options, bounds: { ...c.bounds, scopeRecords: 0 } });
    expect([over.report.result, over.report.at?.seq, over.why]).toEqual(["mismatch", 3, "the entry exceeds scopeRecords: Used plus Reserved is over its ceiling"]);
  } finally { wired.delete(asked.name); }
});
