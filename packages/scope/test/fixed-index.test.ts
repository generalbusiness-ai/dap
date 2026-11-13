/** Actual native SQLite, transaction rollback and object eviction. Direct
 * storage fixtures prove migration/index behavior, not admission of their
 * rows. The scope-full case uses actual sealed turns with the existing lane
 * data, scripted clock and test membership authority. */
import { expect, test } from "vitest";
import { judgeGuardNode } from "../../derive/src/program/guard-value.ts";
import { namedBody } from "../../derive/src/program/structure.ts";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { PROPOSED_BOUNDS, type Effect, type Entry, type GenesisEntry } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, utf8 } from "@generalbusiness/dap-bytes";
import { applyEntry, clockOf, fixedRowsOf, stateDigest, type Item } from "@generalbusiness/dap-derive";
import { fixtureSequence, variant } from "@generalbusiness/dap-derive/testing";
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
  // The direct SQLite witness uses an admitted guard, without claiming act admission for its stored rows.
  data.acts["probe-uniqueness"] = {
    ...data.acts["remark"]!, step: "transition", fields: { needle: { type: "text", max: 64, required: true } },
    guards: [{ none: { type: "job", states: ["live"], where: [{ equals: { a: { slot: "name" }, b: { field: "needle" } } }] }, reason: "handle-in-use" }],
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
    expect(() => store.ensureFixed(indexed)).toThrow("TEST fixed row write failed");
    expect(fixedTables(sql)).toEqual(before);
    expect(store.fixedReady(indexed.digest, at, store.scope()!.head)).toBe(false);
    failRebuild = false;
    store.ensureFixed(indexed);
    expect(store.fixedReady(indexed.digest, at, store.scope()!.head)).toBe(true);
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
    expect(store.fixedReady(indexed.digest, at, store.scope()!.head)).toBe(true);
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

test("rollforward rebuilds a formerly ready index after a base writer advances the actual scope head and items", async context => {
  const lane = await create({}, {}, indexed), signed = lane.remark("TEST base-writer storage specimen");
  const advanced = await lane.inside(state => {
    const sql: Sql = { exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) };
    const store = new SqliteStore(sql), before = store.scope()!, template = JSON.parse(store.stored(0)!.bytes) as GenesisEntry;
    store.ensureFixed(indexed);
    expect(store.fixedReady(indexed.digest, before.at, before.head)).toBe(true);
    const marker = sql.exec("SELECT value FROM fixed_control WHERE id=1").toArray();
    // Emulate the base writer's append/current-item ownership, without any
    // new fixed-index writes. Entries have matching bytes/hashes, but these
    // direct storage openings claim no Authority or act-admission witness.
    store.transaction(() => {
      for (const name of ["base-one", "base-two", "base-three"]) {
        const scope = store.scope()!, id = scope.head.seq + 1;
        const entry: Entry = { ...template, genesis: scope.at.genesis, seq: id, prev: scope.head.hash, input: { type: "act", signed, authority: [], presented: {} }, uses: [], prepared: [], sends: [],
          effects: [{ effect: "open", item: id, type: "job", state: "live" }, { effect: "value", item: id, slot: "name", value: name }] };
        const bytes = canonicalize(entry), hash = entryHash(entry);
        store.append(entry, hash, bytes, utf8(bytes).length);
        store.putItem({ id, type: "job", state: "live", revision: 1, opened: null, parties: {}, refs: {}, values: { name }, attributed: [] });
        store.addCount("job", "live", 1);
        store.setScope({ ...scope, head: { seq: id, hash }, time: entry.time });
      }
    });
    expect(sql.exec("SELECT value FROM fixed_control WHERE id=1").toArray()).toEqual(marker);
    return { before: before.head, after: store.scope()!.head, checkpoint: stateDigest(store.all()) };
  });
  await lane.restart();
  const result = await lane.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    const scope = store.scope()!, readyBefore = store.fixedReady(indexed.digest, scope.at, scope.head);
    store.ensureFixed(indexed);
    // Keep this behavioral assertion first: skipping the marker's head
    // comparison must fail here, rather than at a marker-shape assertion.
    const probe = indexed.declared.acts["probe-uniqueness"]!;
    const body = namedBody(indexed, "act", "probe-uniqueness", "act")!;
    const duplicate = judgeGuardNode({ view: store, definition: indexed, bounds: { ...PROPOSED_BOUNDS, guardScan: 1 }, clock: clockOf(store, scope.time),
      scope, self: scope.head.seq + 1, kind: "probe-uniqueness", fields: { needle: "base-two" }, fieldTypes: probe.fields,
      subjects: new Map(), signer: null, facts: new Map(), prepared: [], used: [] }, body, body.nodes.filter(node => node.category === "guard")[0]!);
    expect(store.fixedCount("job", "name", '"base-two"', ["live"], "normalized")).toBe(1);
    expect(duplicate).toBe("fail");
    expect(store.fixedReady(indexed.digest, scope.at, scope.head)).toBe(true);
    expect(stateDigest(store.all())).toBe(advanced.checkpoint);
    expect(readyBefore).toBe(false);
    return { readyBefore, duplicate, before: advanced.before, after: scope.head };
  });
  (context.task.meta as Record<string, unknown>)["fixedIndexRollforward"] = result;
});

test("native legacy rebuild batches hash metadata beside 34000 held payloads and 2000 current items", async context => {
  const heldRows = 34_000, itemRows = 2_000;
  const lane = await create({}, {}, indexed), signed = lane.remark(`TEST public rebuild payload ${"x".repeat(1024)}`);
  const prepared = await lane.inside(state => {
    const actual: Sql = { exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) };
    const setup = new SqliteStore(actual), scope = setup.scope()!, template = JSON.parse(setup.stored(0)!.bytes) as GenesisEntry;
    const payload = { at: scope.at, seq: 0, hash: scope.genesis.hash };
    // Storage scale fixture only: these Entry-shaped payloads have matching
    // hashes but bypass admission, grant checks and item maxima. This is no
    // Room A or 34000-turn admission claim. Setup is outside measurement.
    setup.transaction(() => {
      let previous = scope.head.hash;
      for (let start = 1; start < heldRows; start += 100) {
        const batch: { seq: number; hash: string; time: string; bytes: string; size: number }[] = [];
        for (let seq = start; seq < Math.min(start + 100, heldRows); seq++) {
          const entry: Entry = { ...template, genesis: scope.at.genesis, seq, prev: previous, input: { type: "act", signed, authority: [], presented: {} }, uses: [], prepared: [], effects: [], sends: [] };
          const bytes = canonicalize(entry), hash = entryHash(entry);
          batch.push({ seq, hash, time: entry.time, bytes, size: utf8(bytes).length }); previous = hash;
        }
        actual.exec("INSERT INTO entry(seq,hash,time,bytes,size) SELECT json_extract(value,'$.seq'),json_extract(value,'$.hash'),json_extract(value,'$.time'),json_extract(value,'$.bytes'),json_extract(value,'$.size') FROM json_each(?)", JSON.stringify(batch)).toArray();
      }
      setup.setScope({ ...scope, head: { seq: heldRows - 1, hash: previous } });
      for (let n = 0; n < itemRows; n++) {
        const item: Item = { id: n + 1, type: "job", state: n % 2 ? "gone" : "live", revision: 1, opened: null, parties: {}, refs: {}, attributed: [],
          values: { name: `seed-${n % 50}`, ...(n % 4 === 0 ? { payload } : {}) } };
        setup.putItem(item); setup.addCount(item.type, item.state, 1);
      }
      actual.exec("DELETE FROM fixed_control").toArray();
    });
    const fixture = actual.exec("SELECT COUNT(*) AS heldRows,SUM(size) AS payloadBytes FROM entry").toArray()[0]!;
    return { heldRows: fixture["heldRows"], payloadBytes: fixture["payloadBytes"], at: scope.at, checkpoint: stateDigest(setup.all()) };
  });
  // The test caller clock spans the awaited native callback. Its wall
  // interval includes constructor/instrumentation/reply work, but excludes
  // setup, the full snapshot assertions below, and any admission journey.
  const callerStarted = performance.now();
  const measured = await lane.inside(state => {
    let measuring = false, queries = 0, rowsRead = 0, rowsWritten = 0, returnedTextBytes = 0, metadataBatches = 0, metadataRows = 0;
    const journalQueries: string[] = [];
    const store = new SqliteStore({ transaction: work => state.storage.transactionSync(work), exec: (query, ...bindings) => {
      const cursor = state.storage.sql.exec(query, ...bindings), rows = cursor.toArray();
      if (measuring) {
        queries++; rowsRead += cursor.rowsRead; rowsWritten += cursor.rowsWritten;
        for (const row of rows) for (const value of Object.values(row)) if (typeof value === "string") returnedTextBytes += utf8(value).length;
        if (/\bFROM entry\b/.test(query)) {
          journalQueries.push(query);
          if (query === "SELECT seq,hash FROM entry WHERE seq>? ORDER BY seq LIMIT ?") { metadataBatches++; metadataRows += rows.length; }
        }
      }
      return { toArray: () => rows };
    } });
    const started = performance.now(); measuring = true;
    store.ensureFixed(indexed);
    const nativeClockElapsedMs = performance.now() - started; measuring = false;
    return { nativeClockElapsedMs, nativeClockQualification: "synchronous runtime clock may remain frozen or round; not a host wall/CPU measurement", cpuMs: null,
      queries, rowsRead, rowsWritten, returnedTextBytes, metadataBatches, metadataRows, journalQueries: [...new Set(journalQueries)] };
  });
  const callerRoundTripElapsedMs = performance.now() - callerStarted;
  const metrics = { qualification: "direct SQLite storage fixture; no Room A admission", heldRows: prepared.heldRows, payloadBytes: prepared.payloadBytes, itemRows,
    callerRoundTripElapsedMs, callerTimingQualification: "native callback including constructor/instrumentation/reply; excludes setup and full snapshot assertions", ...measured };
  (context.task.meta as Record<string, unknown>)["fixedIndexLegacyRebuild"] = metrics;
  console.info("TEST native fixed-index legacy rebuild", JSON.stringify(metrics));
  expect(prepared.heldRows).toBe(heldRows);
  expect(measured.metadataRows).toBe(heldRows);
  expect(measured.metadataBatches).toBe(Math.ceil(heldRows / 1024));
  expect(measured.journalQueries).toEqual(["SELECT seq,hash FROM entry WHERE seq>? ORDER BY seq LIMIT ?"]);
  await lane.inside(state => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    const payload = { at: prepared.at, seq: 0, hash: store.scope()!.genesis.hash };
    expect(store.fixedReady(indexed.digest, prepared.at, store.scope()!.head)).toBe(true);
    expect(store.fixedCount("job", "name", '"seed-0"', ["live", "gone"], "normalized")).toBe(40);
    expect(store.fixedCount("job", "payload", "0", ["live"], "normalized")).toBe(500);
    expect(store.fixedCount("job", "payload", canonicalize(payload), ["live"], "raw")).toBe(500);
    expect(stateDigest(store.all())).toBe(prepared.checkpoint);
  });
}, 120_000);

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
        applyEntry(store, history.definition, sealed.entry, sealed.hash, { own: ownOf(store, fixtureSequence(history.scope)) });
      });
    }
    expect(store.stored(1)).toBeNull();
    expect(store.fixedHash(1)).toBeNull();
    expect(store.item(history.item)!.values["stamp"]).toEqual(history.reference);
    expect(store.fixedCount("job", "stamp", "1", ["passed"], "normalized")).toBe(0);
    expect(store.fixedCount("job", "stamp", canonicalize(history.reference), ["passed"], "normalized")).toBe(1);
    // Legacy reconstruction must honor the same retained holes without
    // asking an Own reader for their deleted payloads.
    const checkpoint = stateDigest(store.all());
    sql.exec("DELETE FROM fixed_control").toArray();
    store.ensureFixed(history.definition);
    expect(store.fixedCount("job", "stamp", "1", ["passed"], "normalized")).toBe(0);
    expect(store.fixedCount("job", "stamp", canonicalize(history.reference), ["passed"], "normalized")).toBe(1);
    expect(stateDigest(store.all())).toBe(checkpoint);
  });
  await evictDurableObject(objectOf(name));
  await runInDurableObject(objectOf(name), (_instance, state) => {
    const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
    expect(store.fixedReady(history.definition.digest, history.scope.at, store.scope()!.head)).toBe(true);
    expect(store.stored(1)).toBeNull();
    expect(store.item(history.item)!.values["stamp"]).toEqual(history.reference);
    expect(store.fixedCount("job", "stamp", "1", ["passed"], "normalized")).toBe(0);
    expect(store.fixedCount("job", "stamp", canonicalize(history.reference), ["passed"], "normalized")).toBe(1);
  });
});

const historyIndexed = variant(definition.declared, data => {
  data.items["job"] = {
    many: true, max: 8, states: { live: { final: false }, gone: { final: true } }, initial: "live", parties: {}, refs: {},
    values: {
      name: { fixed: true, required: false, of: { type: "text", max: 16 } },
      flag: { fixed: true, required: false, of: { type: "bool" } },
    },
  };
});

type ScanItem = { id: number; state: "live" | "gone"; name: string | null; flag: boolean | null };
// Independent oracle: null means the declared optional slot is empty.
// No production index, normalization, fold or MemoryState helper supplies an expectation.
const scanCount = (items: readonly ScanItem[], slot: "name" | "flag", value: string | boolean | null, states: readonly string[]) =>
  items.filter(item => states.includes(item.state) && item[slot] === value).length;

const historyOrders = [
  ["create-a", "repeat-a", "create-b", "abort-close-a", "restart", "close-a", "rebuild", "create-c", "repeat-b", "legacy-restart", "close-b", "restart", "rebuild", "repeat-a", "abort-create", "restart"],
  ["create-a", "create-b", "repeat-b", "rebuild", "abort-close-b", "create-c", "restart", "close-b", "repeat-b", "legacy-restart", "abort-close-a", "close-a", "rebuild", "restart", "abort-create", "repeat-a"],
  ["create-a", "repeat-a", "create-b", "restart", "abort-create", "rebuild", "close-b", "repeat-b", "legacy-restart", "create-c", "abort-close-a", "restart", "close-a", "repeat-a", "rebuild", "restart"],
  ["create-a", "rebuild", "create-b", "abort-close-a", "repeat-b", "restart", "legacy-restart", "repeat-a", "close-a", "create-c", "rebuild", "abort-close-b", "close-b", "restart", "abort-create", "repeat-b"],
] as const;
const historyValues = [
  { a: { name: "same", flag: true }, b: { name: "same", flag: false }, c: { name: "other", flag: null } },
  { a: { name: "same", flag: false }, b: { name: null, flag: true }, c: { name: "other", flag: false } },
  { a: { name: null, flag: null }, b: { name: "same", flag: true }, c: { name: null, flag: false } },
] as const;

for (const [orderIndex, commands] of historyOrders.entries()) for (const [valuesIndex, values] of historyValues.entries()) {
  test(`native fixed counts equal a direct item scan through storage history ${orderIndex + 1}.${valuesIndex + 1}`, async context => {
    // Real SQLite fold, transaction and eviction; Entry-shaped storage inputs
    // bypass admission. This proves no signer authority or application journey.
    const lane = await create({}, {}, historyIndexed), items: ScanItem[] = [];
    const ids = new Map<string, number>();
    let nextSeq = 1;
    const check = async (command: string) => lane.inside(state => {
      const sql: Sql = { exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) };
      const store = new SqliteStore(sql);
      store.ensureFixed(historyIndexed);
      const actual = sql.exec("SELECT record FROM item WHERE type=? ORDER BY id", "job").toArray().map(row => {
        const item = JSON.parse(row["record"] as string) as Item;
        return { id: item.id, state: item.state, name: item.values["name"], flag: item.values["flag"] };
      });
      expect(actual, `${command}: authoritative items`).toEqual(items);
      for (const [slot, needles] of [["name", ["same", "other", "absent", null]], ["flag", [true, false, null]]] as const) {
        for (const value of needles) for (const states of [["live"], ["gone"], ["live", "gone"]]) for (const mode of ["raw", "normalized"] as const) {
          expect(store.fixedCount("job", slot, JSON.stringify(value), states, mode), `${command}: ${slot}=${value}, ${states}, ${mode}`)
            .toBe(scanCount(items, slot, value, states));
        }
      }
    });
    await check("initial");
    for (const command of commands) {
      const tag = command.endsWith("-b") ? "b" : command.endsWith("-c") ? "c" : "a";
      const descriptor = command === "abort-create" ? { name: "other", flag: false } : values[tag];
      const opening = command.startsWith("create-") || command === "abort-create" || command === "legacy-restart";
      const closing = command.startsWith("close-") || command.startsWith("abort-close-");
      const aborting = command.startsWith("abort-");
      const target = ids.get(tag);
      const signed = lane.remark(`TEST fixed history ${orderIndex}.${valuesIndex}: ${command}`);
      if (command === "restart") await lane.restart();
      else await lane.inside(state => {
        const sql: Sql = { exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) };
        const store = new SqliteStore(sql);
        if (command === "rebuild") {
          const checkpoint = stateDigest(store.all());
          for (const table of ["fixed_control", "fixed_dependency", "fixed_count", "fixed_slot"]) sql.exec(`DELETE FROM ${table}`).toArray();
          store.ensureFixed(historyIndexed);
          expect(stateDigest(store.all())).toBe(checkpoint);
        } else if (command.startsWith("repeat-")) {
          expect(target).toBeDefined();
          store.transaction(() => {
            for (const write of fixedRowsOf(historyIndexed, store.item(target!)!, store.scope()!.at, seq => store.fixedHash(seq))) {
              store.putFixed(write.row, write.dependencies);
              store.putFixed(write.row, write.dependencies);
            }
          });
        } else {
          const scope = store.scope()!, template = JSON.parse(store.stored(0)!.bytes) as GenesisEntry;
          expect(scope.head.seq + 1).toBe(nextSeq);
          const effects: Effect[] = [];
          if (opening) {
            effects.push({ effect: "open", item: nextSeq, type: "job", state: "live" });
            if (descriptor.name !== null) effects.push({ effect: "value", item: nextSeq, slot: "name", value: descriptor.name });
            if (descriptor.flag !== null) effects.push({ effect: "value", item: nextSeq, slot: "flag", value: descriptor.flag });
          } else {
            expect(closing && target !== undefined && items.some(item => item.id === target && item.state === "live")).toBe(true);
            effects.push({ effect: "state", item: target!, state: "gone" });
          }
          const entry: Entry = { ...template, genesis: scope.at.genesis, seq: nextSeq, prev: scope.head.hash, input: { type: "act", signed, authority: [], presented: {} }, uses: [], prepared: [], effects, sends: [] };
          const bytes = canonicalize(entry), hash = entryHash(entry);
          const write = () => {
            store.append(entry, hash, bytes, utf8(bytes).length);
            if (command === "legacy-restart") {
              // Base writer: matching journal/current rows, no fixed writes.
              store.putItem({ id: nextSeq, type: "job", state: "live", revision: 1, opened: hash, parties: {}, refs: {}, values: { ...descriptor }, attributed: [] });
              store.addCount("job", "live", 1);
              store.setScope({ ...scope, head: { seq: nextSeq, hash }, time: entry.time });
            } else applyEntry(store, historyIndexed, entry, hash);
          };
          if (aborting) {
            const checkpoint = stateDigest(store.all());
            expect(() => store.transaction(() => { write(); throw Error("TEST abort complete fixed fold"); })).toThrow("TEST abort complete fixed fold");
            expect(stateDigest(store.all())).toBe(checkpoint);
          } else {
            const marker = sql.exec("SELECT value FROM fixed_control WHERE id=1").toArray();
            expect(store.fixedReady(historyIndexed.digest, scope.at, scope.head)).toBe(true);
            store.transaction(write);
            if (command === "legacy-restart") expect(sql.exec("SELECT value FROM fixed_control WHERE id=1").toArray()).toEqual(marker);
          }
        }
      });
      if (command === "legacy-restart") await lane.restart(); // No intervening index query or rebuild.
      if (!aborting && (opening || closing)) {
        if (opening) {
          items.push({ id: nextSeq, state: "live", ...descriptor });
          if (command !== "legacy-restart") ids.set(tag, nextSeq);
        } else items.find(item => item.id === target)!.state = "gone";
        nextSeq++;
      }
      await check(command);
    }
    (context.task.meta as Record<string, unknown>)["fixedIndexScanHistory"] = { commands: [...commands], items: items.length, oracle: "literal item array with direct primitive equality", authority: "storage fold fixture, not native act admission" };
  });
}
