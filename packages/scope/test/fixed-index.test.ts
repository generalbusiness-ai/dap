/** Actual native SQLite, transaction rollback and object eviction. The first
 * case seeds public item rows directly; it proves index persistence/migration,
 * not judgments that opened those rows. The second uses actual sealed turns
 * with the existing lane data, scripted clock and test membership authority. */
import { expect, test } from "vitest";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { applyEntry, fixedRowsOf, stateDigest, type Item } from "@generalbusiness/dap-derive";
import { variant } from "@generalbusiness/dap-derive/testing";
import { structuralFloorHistory } from "../../derive/test/fixed-slot-fixture.ts";
import { ownOf } from "../src/core.ts";
import { SqliteStore, type Sql } from "../src/sqlite.ts";
import { create, definition, objectOf, rita } from "./fixtures-native.ts";

const indexed = variant(definition.declared, data => {
  data.items["job"] = {
    many: true, max: 100, states: { live: { final: false }, gone: { final: true } }, initial: "live", parties: {}, refs: {},
    values: {
      name: { fixed: true, required: false, of: { type: "text", max: 64 } },
      payload: { fixed: true, required: false, of: { type: "record", of: {
        at: { type: "scope", kind: "directory", required: true }, seq: { type: "int", min: 0, max: 100, required: true },
        hash: { type: "digest", required: true },
      } } },
    },
  };
});

const fixedTables = (sql: Sql) => ({
  rows: sql.exec("SELECT * FROM fixed_slot ORDER BY item,slot").toArray(),
  counts: sql.exec("SELECT * FROM fixed_count ORDER BY type,slot,mode,key,state").toArray(),
  dependencies: sql.exec("SELECT * FROM fixed_dependency ORDER BY seq,hash,item,slot").toArray(),
  control: sql.exec("SELECT * FROM fixed_control ORDER BY id").toArray(),
});

test("native fixed counts rebuild legacy current rows atomically, read only state buckets and survive eviction without changing the checkpoint", async () => {
  const lane = await create({}, {}, indexed);
  const initial = await lane.inside(state => {
    const calls: string[] = [];
    let failRebuild = false;
    const sql: Sql = {
      exec(query, ...bindings) {
        calls.push(query);
        if (failRebuild && query.startsWith("INSERT INTO fixed_slot")) throw Error("TEST fixed row write failed");
        return state.storage.sql.exec(query, ...bindings);
      },
      transaction: work => state.storage.transactionSync(work),
    };
    const store = new SqliteStore(sql), at = store.scope()!.at, held = store.stored(0)!;
    const payload = { at, seq: 0, hash: held.hash };
    const job = (id: number, name: string, status: string, value?: typeof payload): Item => ({
      id, type: "job", state: status, revision: 1, opened: null, parties: {}, refs: {},
      values: { name, ...(value ? { payload: value } : {}) }, attributed: [],
    });
    store.transaction(() => {
      for (const item of [job(11, "same", "live", payload), job(12, "same", "gone"), job(13, "other", "live")]) {
        store.putItem(item); store.addCount(item.type, item.state, 1);
      }
      // Simulate pre-upgrade coverage: old raw-slot rows can even have the
      // right cardinality while holding the wrong keys. None proves readiness.
      for (const id of [11, 12, 13]) sql.exec("INSERT INTO item_slot(id,slot,type,state,value) VALUES (?,?,?,?,?)", id, "name", "job", "live", '"wrong"').toArray();
      sql.exec("DELETE FROM fixed_control").toArray();
    });
    const checkpoint = stateDigest(store.all()), before = fixedTables(sql);
    failRebuild = true;
    expect(() => store.ensureFixed(indexed, ownOf(store))).toThrow("TEST fixed row write failed");
    expect(fixedTables(sql)).toEqual(before);
    expect(store.fixedReady(indexed.digest, at)).toBe(false);
    failRebuild = false;
    store.ensureFixed(indexed, ownOf(store));
    expect(store.fixedReady(indexed.digest, at)).toBe(true);
    expect(stateDigest(store.all())).toBe(checkpoint);
    expect(store.fixedCount("job", "payload", "0", ["live"], "normalized")).toBe(1);
    expect(store.fixedCount("job", "payload", canonicalize(payload), ["live"], "raw")).toBe(1);
    expect(store.fixedCount("job", "payload", "null", ["live", "gone"], "normalized")).toBe(2);
    expect(store.fixedAffected(0, held.hash).filter(row => row.type === "job").map(row => [row.item, row.slot])).toEqual([[11, "payload"]]);
    calls.length = 0;
    expect(store.fixedCount("job", "name", '"same"', ["live", "gone", "live"], "normalized")).toBe(2);
    expect(calls).toHaveLength(2);
    expect(calls.every(query => /\bFROM fixed_count\b/.test(query) && !/\bCOUNT\s*\(/i.test(query))).toBe(true);
    // Exact same absolute row writes must not double-charge buckets.
    store.transaction(() => {
      for (const write of fixedRowsOf(indexed, store.item(11)!, at, seq => store.fixedHash(seq))) {
        store.putFixed(write.row, write.dependencies); store.putFixed(write.row, write.dependencies);
      }
    });
    expect(store.fixedCount("job", "name", '"same"', ["live", "gone"], "normalized")).toBe(2);
    return { checkpoint, tables: fixedTables(sql) };
  });
  await lane.restart();
  await lane.inside(state => {
    const sql: Sql = { exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) };
    const store = new SqliteStore(sql), at = store.scope()!.at;
    expect(store.fixedReady(indexed.digest, at)).toBe(true);
    expect(fixedTables(sql)).toEqual(initial.tables);
    expect(stateDigest(store.all())).toBe(initial.checkpoint);
    const before = fixedTables(sql), item = { ...store.item(11)!, state: "gone" };
    const move = () => {
      store.putItem(item); store.addCount("job", "live", -1); store.addCount("job", "gone", 1);
      for (const write of fixedRowsOf(indexed, item, at, seq => store.fixedHash(seq))) store.putFixed(write.row, write.dependencies);
    };
    expect(() => store.transaction(() => { move(); throw Error("TEST abort after bucket changes"); })).toThrow("TEST abort after bucket changes");
    expect(fixedTables(sql)).toEqual(before);
    expect(stateDigest(store.all())).toBe(initial.checkpoint);
    store.transaction(move);
    expect(store.fixedCount("job", "name", '"same"', ["live"], "normalized")).toBe(0);
    expect(store.fixedCount("job", "name", '"same"', ["gone"], "normalized")).toBe(2);
    expect(store.fixedCount("job", "payload", "0", ["gone"], "normalized")).toBe(1);
  });
});

test("a genuinely judged native opening rolled back at scope-full leaves no item, fixed row, hash or count after restart", async () => {
  const lane = await create({ scopeEntries: 3 });
  expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written", fact: { seq: 1 } });
  const inspect = () => lane.inside(state => {
    const sql: Sql = { exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) };
    const store = new SqliteStore(sql);
    return { checkpoint: stateDigest(store.all()), tables: fixedTables(sql), held: sql.exec("SELECT seq,hash FROM entry ORDER BY seq").toArray() };
  });
  const before = await inspect();
  expect(await lane.act(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } }))
    .toMatchObject({ answer: "refused", reason: "scope-full" });
  expect(await inspect()).toEqual(before);
  await lane.restart();
  expect(await inspect()).toEqual(before);
});

test("a fixture-judged floor rekeys a retained final structural value before actual SQLite payload deletion and keeps the result across eviction", async () => {
  // Creation authority, grants and archive receipt come from the in-memory
  // fixture. Native SQLite append/fold, deletion, transaction and eviction are
  // real; this is not native creation or archive-receipt admission evidence.
  const history = structuralFloorHistory(true), name = history.scope.at.scope;
  await runInDurableObject(objectOf(name), (_instance, state) => {
    const sql: Sql = { exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) };
    const store = new SqliteStore(sql);
    expect(store.scope()).toBeNull(); // Never clear an existing owner to run this fixture.
    for (const sealed of history.scope.entries) {
      if (sealed.entry.seq === history.floor) {
        expect(store.item(history.item)!.state).toBe("passed");
        expect(store.fixedCount("job", "stamp", "1", ["passed"], "normalized")).toBe(1);
        expect(store.fixedCount("job", "stamp", canonicalize(history.reference), ["passed"], "normalized")).toBe(0);
        expect(store.stored(1)).not.toBeNull();
      }
      store.transaction(() => {
        const bytes = canonicalize(sealed.entry);
        store.append(sealed.entry, sealed.hash, bytes, utf8(bytes).length);
        if (sealed.entry.seq === 0) store.retain({ kind: "definition", digest: history.definition.digest, bytes: canonicalize(history.definition.declared) });
        applyEntry(store, history.definition, sealed.entry, sealed.hash, { own: ownOf(store) });
      });
    }
    expect(store.stored(1)).toBeNull();
    expect(store.fixedHash(1)).toBeNull();
    expect(store.item(history.item)!.values["stamp"]).toEqual(history.reference);
    expect(store.fixedCount("job", "stamp", "1", ["passed"], "normalized")).toBe(0);
    expect(store.fixedCount("job", "stamp", canonicalize(history.reference), ["passed"], "normalized")).toBe(1);
  });
  await evictDurableObject(objectOf(name));
  await runInDurableObject(objectOf(name), (_instance, state) => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    expect(store.fixedReady(history.definition.digest, history.scope.at)).toBe(true);
    expect(store.stored(1)).toBeNull();
    expect(store.item(history.item)!.values["stamp"]).toEqual(history.reference);
    expect(store.fixedCount("job", "stamp", "1", ["passed"], "normalized")).toBe(0);
    expect(store.fixedCount("job", "stamp", canonicalize(history.reference), ["passed"], "normalized")).toBe(1);
  });
});
