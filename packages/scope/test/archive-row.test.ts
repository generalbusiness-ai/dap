/** Real native SQLite bookkeeping and restart. Marks below are explicit
 * test-authored metadata, not admitted inventory, built commits or host proof. */
import { expect, test } from "vitest";
import { canonicalize, digestBytes, domainBytes, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { ARCHIVE_ROW_BYTES, ArchiveRows, type ArchiveMark } from "../src/archive-row.ts";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { at, create, type Lane } from "./fixtures-native.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { readRetainedArchivePass } from "../src/archive-retained-pass.ts";
import { archiveSql } from "./support/archive.ts";
import { ARCHIVE_CONFIRMED_ROW_BYTES, archivePendingRowBytesUpper, forecastArchiveBookkeeping } from "../src/archive-row-cost.ts";

const repository = { host: "fixture-host", namespace: "fixture-room", name: "archive-fixture", id: "fixture-repository" };
const rows = <T>(lane: Lane, work: (store: ArchiveRows) => T) => lane.inside(state => work(new ArchiveRows({ exec: (query, ...args) => state.storage.sql.exec(query, ...args), transaction: action => state.storage.transactionSync(action) }, lane.at)));
async function refusal(action: Promise<unknown>, reason: string): Promise<void> {
  let rejected = false, message = "";
  try { await action; } catch (error) { rejected = true; message = error instanceof Error ? error.message : String(error); }
  expect(rejected, "the conflicting mark must be refused").toBe(true);
  expect(message).toContain(reason);
}

// Invariant: one exact outstanding mark survives eviction and later native
// entries; a stale/other confirmation cannot clear it or advance the prefix.
test("preserves a single immutable mark across a native restart and later turn", async context => {
  const lane = await create(), head = await lane.head();
  const mark: ArchiveMark = { commit: "a".repeat(40), parent: null, through: { ...head }, manifest: canonicalize({ fixture: "named metadata only", entries: [{ seq: head.seq, hash: head.hash }], retained: [] }), markedAt: at(0) };
  expect(await rows(lane, store => store.load())).toBeNull();
  expect(await rows(lane, store => store.target(repository, "sha1"))).toMatchObject({ pending: null, confirmed: null });
  const marked = await rows(lane, store => store.mark(mark));
  expect(marked.pending).toEqual(mark);
  expect(await rows(lane, store => store.mark({ ...mark }))).toEqual(marked);
  await lane.restart();
  expect((await rows(lane, store => store.load()))?.pending).toEqual(mark);
  await lane.submit(lane.remark("later native fixture turn"));
  const later = await lane.head(); expect(later.seq).toBeGreaterThan(head.seq);
  expect((await rows(lane, store => store.load()))?.pending).toEqual(mark);
  await refusal(rows(lane, store => store.mark({ ...mark, commit: "b".repeat(40) })), "archive-row-outstanding");
  await expect(rows(lane, store => store.confirm("b".repeat(40)))).rejects.toThrow("archive-row-conflict");
  expect((await rows(lane, store => store.load()))?.pending).toEqual(mark);
  const confirmed = await rows(lane, store => store.confirm(mark.commit));
  expect(confirmed).toMatchObject({ pending: null, confirmed: { commit: mark.commit, through: head } });
  expect(await lane.head()).toEqual(later);
  await expect(rows(lane, store => store.mark({ ...mark, parent: mark.commit }))).rejects.toThrow();
  const ruleBytes = canonicalize({ fixture: "old retained rule" }), rule = { kind: "rule" as const, digest: digestBytes(utf8(ruleBytes)) };
  const value = { kind: "value" as const, domain: DOMAINS.snapshot, digest: digestBytes(domainBytes(DOMAINS.snapshot, {})) };
  const snapshot = await lane.inside(state => {
    const sql = archiveSql(state), before = new SqliteStore(sql).all();
    sql.exec("INSERT INTO retained_input(kind,digest,bytes) VALUES (?,?,?)", rule.kind, rule.digest, ruleBytes);
    sql.exec("INSERT INTO retained_value(domain,digest,bytes) VALUES (?,?,?)", value.domain, value.digest, "{}");
    // Deliberate old-schema fixture, not a native journal transition.
    state.storage.transactionSync(() => {
      sql.exec("CREATE TABLE old_retained_input(kind TEXT NOT NULL,digest TEXT NOT NULL,bytes TEXT NOT NULL,under TEXT,PRIMARY KEY(kind,digest)) WITHOUT ROWID");
      sql.exec("INSERT INTO old_retained_input SELECT kind,digest,bytes,under FROM retained_input");
      sql.exec("DROP TABLE retained_input"); sql.exec("ALTER TABLE old_retained_input RENAME TO retained_input");
      sql.exec("CREATE TABLE old_retained_value(domain TEXT NOT NULL,digest TEXT NOT NULL,bytes TEXT NOT NULL,PRIMARY KEY(domain,digest)) WITHOUT ROWID");
      sql.exec("INSERT INTO old_retained_value SELECT domain,digest,bytes FROM retained_value");
      sql.exec("DROP TABLE retained_value"); sql.exec("ALTER TABLE old_retained_value RENAME TO retained_value");
    });
    expect(new SqliteStore(sql).all()).toEqual(before);
    expect([rule, value].map(key => readRetainedArchivePass(sql, key, new ArchiveBudget()))).toEqual([null, null]);
    return before;
  });
  // TEST-authored conversion metadata, not a built or admitted archive.
  const conversion: ArchiveMark = { commit: "c".repeat(40), parent: mark.commit, through: head, layout: 2, markedAt: at(0),
    manifest: canonicalize({ format: "artroom-local-inventory-2", after: null, objects: [{ key: rule, pass: 0 }, { key: value, pass: 0 }] }) };
  await rows(lane, store => store.mark(conversion));
  await lane.inside(state => {
    const sql = archiveSql(state), fail = new ArchiveRows({ ...sql, exec(query, ...args) {
      if (query.startsWith("INSERT INTO meta") && args[0] === "archive-row-1") throw Error("TEST failed receipt save");
      return sql.exec(query, ...args);
    } }, lane.at);
    expect(() => fail.confirm(conversion.commit)).toThrow("TEST failed receipt save");
    expect([rule, value].map(key => readRetainedArchivePass(sql, key, new ArchiveBudget()))).toEqual([null, null]);
    expect(new ArchiveRows(sql, lane.at).load()?.pending).toEqual(conversion);
  });
  expect((await rows(lane, store => store.confirm(conversion.commit))).confirmed).toEqual({ commit: conversion.commit, through: head, layout: 2 });
  await lane.restart();
  expect(await lane.inside(state => {
    const sql = archiveSql(state);
    expect(new SqliteStore(sql).all()).toEqual(snapshot);
    return [rule, value].map(key => readRetainedArchivePass(sql, key, new ArchiveBudget()));
  })).toEqual([0, 0]);
  const nextBytes = canonicalize({ fixture: "later retained rule" }), nextKey = { kind: "rule" as const, digest: digestBytes(utf8(nextBytes)) };
  await lane.inside(state => { state.storage.sql.exec("INSERT INTO retained_input(kind,digest,bytes) VALUES (?,?,?)", nextKey.kind, nextKey.digest, nextBytes); });
  const nextMark: ArchiveMark = { commit: "d".repeat(40), parent: conversion.commit, through: later, layout: 2, markedAt: at(0),
    manifest: canonicalize({ format: "artroom-local-inventory-2", after: head, objects: [{ key: rule, pass: 0 }, { key: value, pass: 0 }, { key: nextKey, pass: head.seq + 1 }] }) };
  // Price only these real bookkeeping transitions. The mark and retained
  // rows are explicit test metadata, not an admitted or exported archive.
  const finishBudget = new ArchiveBudget();
  const sizes = await rows(lane, store => {
    const previous = store.load(); // Test setup, outside the measured ledger.
    const oldRowBytes = utf8(canonicalize(previous)).length;
    const upper = archivePendingRowBytesUpper(oldRowBytes, utf8(nextMark.manifest).length);
    const forecast = forecastArchiveBookkeeping({ oldRowBytes, markedRowBytes: upper, attemptedRowBytes: upper,
      manifestUnits: nextMark.manifest.length, newRetained: 1 });
    expect(forecast.ok).toBe(true); if (!forecast.ok) throw Error("bookkeeping forecast refused");
    const marked = store.mark(nextMark, finishBudget), markedRowBytes = utf8(canonicalize(marked)).length;
    const attempted = store.attempt(at(1), finishBudget), attemptedRowBytes = utf8(canonicalize(attempted)).length;
    expect(Math.max(markedRowBytes, attemptedRowBytes)).toBeLessThanOrEqual(upper);
    return { oldRowBytes, markedRowBytes, attemptedRowBytes, manifestUnits: nextMark.manifest.length, newRetained: 1 };
  });
  await expect(rows(lane, store => store.target({ ...repository, id: "other-repository" }, "sha1"))).rejects.toThrow("archive-row-conflict");
  expect(await lane.inside(state => [rule, value, nextKey].map(key => readRetainedArchivePass(archiveSql(state), key, new ArchiveBudget())))).toEqual([0, 0, null]);
  await rows(lane, store => store.confirm(nextMark.commit, finishBudget));
  // Captured from the actual original native ledger before extraction.
  const original = { entries: 0, attempts: 0, nodes: 0, calls: 14, metadata: 5175, inputWork: 19120795 };
  expect(sizes).toEqual({ oldRowBytes: 501, markedRowBytes: 1344, attemptedRowBytes: 1362, manifestUnits: 528, newRetained: 1 });
  const compactConfirmation = { ...original, inputWork: 12_878_491 };
  expect(finishBudget.admitted()).toEqual(compactConfirmation);
  expect(original.inputWork - finishBudget.admitted().inputWork).toBe(6_242_304);
  expect(forecastArchiveBookkeeping(sizes)).toEqual({ ok: true, cost: compactConfirmation });
  (context.task.meta as Record<string, unknown>)["archiveRowCost"] = { sizes, original, cost: finishBudget.admitted(),
    qualification: "Actual SQLite mark, attempt and confirm only on one original default ledger. Test-authored marks and retained rows are not native archive admission, built commits, host receipts or export. Setup row read uses a separate setup budget; no full-pass claim." };
  await lane.restart();
  expect(await lane.inside(state => [rule, value, nextKey].map(key => readRetainedArchivePass(archiveSql(state), key, new ArchiveBudget())))).toEqual([0, 0, head.seq + 1]);
  await expect(rows(lane, store => store.mark({ ...mark, parent: nextMark.commit, through: { seq: later.seq + 1, hash: later.hash } }))).rejects.toThrow("archive-row-unavailable");
});

// Invariant: a restart probes bounded metadata before loading a row body;
// corruption or work exhaustion never mutates the outstanding state.
test("refuses an oversized or corrupt native row before using it", async () => {
  const lane = await create();
  await rows(lane, store => store.target(repository, "sha256"));
  const original = await rows(lane, store => store.load());
  await expect(rows(lane, store => store.load(new ArchiveBudget({ calls: 0 })))).rejects.toThrow("archive-limit");
  expect(await rows(lane, store => store.load())).toEqual(original);
  const calls = await lane.inside(state => {
    state.storage.sql.exec("UPDATE meta SET v = CAST(zeroblob(?) AS TEXT) WHERE k = 'archive-row-1'", ARCHIVE_ROW_BYTES + 1);
    const queries: string[] = [], store = new ArchiveRows({ exec(query, ...args) { queries.push(query); return state.storage.sql.exec(query, ...args); }, transaction: action => state.storage.transactionSync(action) }, lane.at);
    expect(() => store.load()).toThrow("archive-row-limit");
    return queries;
  });
  expect(calls.filter(query => query.startsWith("SELECT v FROM meta"))).toEqual([]);
  await lane.inside(state => { state.storage.sql.exec("UPDATE meta SET v = ? WHERE k = 'archive-row-1'", '{"v":1,"v":1}'); });
  await expect(rows(lane, store => store.load())).rejects.toThrow("archive-row-unavailable");
});

// Invariant: retry scheduling never replaces the marked bytes, new turns do
// not shorten its backoff, and a persisted stop cannot silently restart.
test("persists retries and stops with a small wake index", async () => {
  const lane = await create(), head = await lane.head();
  const mark: ArchiveMark = { commit: "a".repeat(40), parent: null, through: head, manifest: canonicalize({ fixture: "metadata only" }), markedAt: at(0) };
  await rows(lane, store => { store.target(repository, "sha1"); store.mark(mark); store.attempt(at(30)); store.signal(at(1)); });
  await lane.restart();
  expect(await rows(lane, store => store.wake())).toBe(at(30));
  expect(await rows(lane, store => store.load())).toMatchObject({ pending: mark, attempts: 1, next: at(30), stopped: null });
  const calls = await lane.inside(state => {
    const queries: unknown[][] = [], store = new ArchiveRows({ exec(query, ...args) { queries.push([query, ...args]); return state.storage.sql.exec(query, ...args); }, transaction: action => state.storage.transactionSync(action) }, lane.at);
    expect(store.wake()).toBe(at(30)); return queries;
  });
  expect(calls).toHaveLength(1); expect(calls[0]?.[1]).toBe("archive-wake-1");
  await rows(lane, store => { store.stop("conflict"); store.signal(at(60)); });
  await lane.restart();
  expect(await rows(lane, store => store.wake())).toBeNull();
  expect(await rows(lane, store => store.load())).toMatchObject({ pending: mark, stopped: { reason: "conflict" } });
  await expect(rows(lane, store => store.confirm(mark.commit))).rejects.toThrow("archive-row-stopped");
});

// Real SQLite transaction cutoffs. Metadata Marks below are TEST-authored;
// this proves bookkeeping atomicity, not inventory admission or host custody.
test("atomic initial Mark and attempt preserve the target on rollback and recover exact committed bytes", async context => {
  const lane = await create(), head = await lane.head();
  const mark: ArchiveMark = { commit: "e".repeat(40), parent: null, through: head, layout: 2,
    manifest: canonicalize({ format: "artroom-local-inventory-2", after: null, objects: [] }), markedAt: at(0) };
  await rows(lane, store => { store.target(repository, "sha1"); store.defer(at(30)); });
  const target = await rows(lane, store => store.load()), failures: unknown[] = [];
  for (const cut of ["before-row", "after-row", "after-wake"] as const) {
    const receipt = await lane.inside(state => {
      const sql = archiveSql(state), budget = new ArchiveBudget(); let writes = 0;
      const interrupted = new ArchiveRows({ ...sql, exec(query, ...args) {
        const rowWrite = query.startsWith("INSERT INTO meta") && args[0] === "archive-row-1";
        const wakeWrite = query.startsWith("INSERT INTO meta") && args[0] === "archive-wake-1";
        if (rowWrite && cut === "before-row") throw Error("TEST atomic cutoff");
        const result = sql.exec(query, ...args);
        if (rowWrite || wakeWrite) writes++;
        if (rowWrite && cut === "after-row" || wakeWrite && cut === "after-wake") throw Error("TEST atomic cutoff");
        return result;
      } }, lane.at);
      expect(() => interrupted.markAttempt(mark, at(30), budget)).toThrow("TEST atomic cutoff");
      expect(new ArchiveRows(sql, lane.at).load()).toEqual(target);
      expect(new ArchiveRows(sql, lane.at).wake()).toBe(at(30));
      // SQL rollback never refunds work already charged before that cut.
      expect(budget.admitted().inputWork).toBeGreaterThan(6_344_704);
      return { cut, writes, cost: budget.admitted() };
    });
    failures.push(receipt); await lane.restart();
    expect(await rows(lane, store => store.load())).toEqual(target);
    expect(await rows(lane, store => store.wake())).toBe(at(30));
  }
  const budget = new ArchiveBudget();
  const sizes = await rows(lane, store => {
    const oldRowBytes = utf8(canonicalize(store.load())).length;
    const attempted = store.markAttempt(mark, at(30), budget), attemptedRowBytes = utf8(canonicalize(attempted)).length;
    expect(attempted).toMatchObject({ repository, pending: mark, attempts: 1, next: at(30) });
    return { oldRowBytes, markedRowBytes: attemptedRowBytes, attemptedRowBytes, manifestUnits: mark.manifest.length,
      newRetained: 0, atomicFirstAttempt: true };
  });
  await lane.restart();
  expect(await rows(lane, store => store.load())).toMatchObject({ pending: mark, attempts: 1, next: at(30) });
  expect(await rows(lane, store => store.wake())).toBe(at(30));
  await rows(lane, store => {
    // A duplicate logical initial call cannot increment or replace backoff.
    expect(store.markAttempt({ ...mark }, at(60))).toMatchObject({ pending: mark, attempts: 1, next: at(30) });
    expect(() => store.markAttempt({ ...mark, commit: "f".repeat(40) }, at(60))).toThrow("archive-row-outstanding");
    expect(() => store.markAttempt({ ...mark, parent: "f".repeat(40) }, at(60))).toThrow();
    expect(() => store.markAttempt({ ...mark, commit: "invalid-format" }, at(60))).toThrow();
    expect(() => store.markAttempt({ ...mark, manifest: "" }, at(60))).toThrow();
    expect(() => store.markAttempt(mark, "invalid" as typeof mark.markedAt)).toThrow();
  });
  await rows(lane, store => store.confirm(mark.commit, budget));
  expect(forecastArchiveBookkeeping(sizes)).toEqual({ ok: true, cost: budget.admitted() });
  // The prior separate-operation price control is preserved; this forecast
  // differs only by the actually absent intermediate load/checks/save.
  const separate = forecastArchiveBookkeeping({ ...sizes, atomicFirstAttempt: false });
  expect(separate.ok).toBe(true);
  if (separate.ok) expect(separate.cost.inputWork - budget.admitted().inputWork).toBe(
    6_344_704 + 96 + sizes.markedRowBytes * 13 + sizes.manifestUnits * 16);
  (context.task.meta as Record<string, unknown>)["atomicArchiveMark"] = { failures, sizes, cost: budget.admitted(),
    qualification: "Actual SQLite row/wake writes, rollback after each persistence boundary, eviction and exact metadata recovery; TEST-authored Mark is not archive admission or provider acceptance. Target persisted before all measured transitions. No work refunded on rollback." };
  await rows(lane, store => store.stop("conflict"));
  await expect(rows(lane, store => store.markAttempt(mark, at(60)))).rejects.toThrow("archive-row-stopped");
});

test("atomic initial persistence recovers a legacy attempts-zero Mark without changing its identity", async () => {
  const lane = await create(), head = await lane.head();
  const mark: ArchiveMark = { commit: "a".repeat(40), parent: null, through: head,
    manifest: canonicalize({ fixture: "legacy metadata only" }), markedAt: at(0) };
  await rows(lane, store => { store.target(repository, "sha1"); store.mark(mark); });
  await lane.restart();
  expect(await rows(lane, store => store.load())).toMatchObject({ pending: mark, attempts: 0, next: null });
  await rows(lane, store => store.markAttempt(mark, at(30)));
  await lane.restart();
  expect(await rows(lane, store => store.load())).toMatchObject({ pending: mark, attempts: 1, next: at(30) });
  // Ordinary pending retries keep their original separate transition.
  await rows(lane, store => store.attempt(at(60)));
  expect(await rows(lane, store => store.load())).toMatchObject({ pending: mark, attempts: 2, next: at(60) });
});

// Component metadata only: the maximum reference/position and padded Mark
// below are not genuine entries, archive admission or a provider receipt.
test("compact confirmation bounds escaped and Unicode metadata while target, pending and stopped saves keep the full reservation", async () => {
  const fields = ["\u0000".repeat(1024), ("\u0000\"\\🎵é".repeat(170) + "safe")];
  for (const [index, field] of fields.entries()) {
    expect(field.length).toBe(1024);
    const lane = await create();
    await lane.inside(state => {
      const sql = archiveSql(state), at = { ...lane.at, kind: "destination" as const };
      const repository = { host: field, id: field, name: field, namespace: field };
      const format = index === 0 ? "sha256" as const : "sha1" as const;
      const through = { seq: Number.MAX_SAFE_INTEGER, hash: `sha256:${"f".repeat(64)}` as const };
      const mark: ArchiveMark = { commit: "f".repeat(format === "sha256" ? 64 : 40), parent: null, through, layout: 2,
        manifest: canonicalize({ format: "artroom-local-inventory-2", at, through, after: null, objects: [], padding: "x".repeat(64 * 1024) }),
        anchorPublication: canonicalize({ anchors: [] }), replayScopes: [at], markedAt: timeOf(0) };
      const charges: Partial<ArchiveCost>[] = [], budget = new class extends ArchiveBudget {
        override spend(cost: Partial<ArchiveCost>): void { super.spend(cost); charges.push({ ...cost }); }
      }();
      const store = new ArchiveRows(sql, at);
      store.target(repository, format, budget);
      expect(charges.filter(cost => cost.calls === 2 && cost.inputWork === 6_340_608)).toHaveLength(1);
      charges.length = 0;
      const pending = store.markAttempt(mark, timeOf(1), budget);
      expect(utf8(canonicalize(pending)).length).toBeGreaterThan(ARCHIVE_CONFIRMED_ROW_BYTES);
      expect(charges.filter(cost => cost.calls === 2 && cost.inputWork === 6_340_608)).toHaveLength(1);
      expect(charges.filter(cost => cost.inputWork === 4096 && cost.calls === undefined)).toHaveLength(1);
      charges.length = 0;
      const wake = timeOf(Date.UTC(9999, 11, 31, 23, 59, 59) + 1);
      const confirmed = store.confirm(mark.commit, budget, wake), encoded = canonicalize(confirmed);
      expect(confirmed).toEqual({ v: 1, at, repository, format,
        confirmed: { commit: mark.commit, through, layout: 2, anchorsPublished: true }, pending: null, attempts: 0, next: null, stopped: null });
      expect(utf8(encoded).length).toBeLessThanOrEqual(25_087);
      expect(utf8(encoded).length).toBeLessThan(ARCHIVE_CONFIRMED_ROW_BYTES);
      expect(charges.filter(cost => cost.calls === 2 && cost.inputWork === 98_304)).toHaveLength(1);
      expect(charges.filter(cost => cost.inputWork === 4096 && cost.calls === undefined)).toHaveLength(1);
      const storedRows = sql.exec("SELECT v FROM meta WHERE k = 'archive-row-1'").toArray();
      const wakeRows = sql.exec("SELECT v FROM meta WHERE k = 'archive-wake-1'").toArray();
      expect(storedRows).toHaveLength(1);
      expect(wakeRows).toHaveLength(1);
      const stored = storedRows[0]?.['v'], storedWake = wakeRows[0]?.['v'];
      if (typeof storedWake !== "string") expect.fail("the stored wake must be text");
      expect(stored).toBe(encoded);
      expect(storedWake).toBe(canonicalize({ pending: false, stopped: false, next: wake }));
      expect(utf8(storedWake).length).toBeLessThan(128);
      charges.length = 0;
      store.stop("TEST stopped metadata", null, budget);
      expect(charges.filter(cost => cost.calls === 2 && cost.inputWork === 6_340_608)).toHaveLength(1);
      // Existing shape checks still refuse malformed/expanded metadata;
      // no cheap path is available just because pending is null.
      const beforeBad = budget.admitted(), badRepository = { ...repository, extra: "not in the row schema" };
      expect(() => store.target(badRepository, format, budget)).toThrow("archive-row-unavailable");
      expect(() => store.target({ ...repository, host: "x".repeat(1025) }, format, budget)).toThrow("archive-row-unavailable");
      expect(budget.admitted()).not.toEqual(beforeBad); // Actual guarded row loads still pay.
      const stoppedRows = sql.exec("SELECT v FROM meta WHERE k = 'archive-row-1'").toArray();
      expect(stoppedRows).toHaveLength(1);
      expect(stoppedRows[0]?.['v']).toBe(canonicalize(store.load()));
    });
    await lane.restart();
    expect(await lane.inside(state => new ArchiveRows(archiveSql(state), { ...lane.at, kind: "destination" }).load()?.stopped?.reason)).toBe("TEST stopped metadata");
  }
});

// Real native transaction, retained pass update and eviction. Marks are
// explicit component fixtures, not admitted archives or remote receipts.
test("compact confirmation rolls back both writes and retained updates, then accepts its exact budget after restart", async () => {
  const lane = await create(), through = await lane.head();
  const ruleBytes = canonicalize({ fixture: "confirmation retained rule" });
  const key = { kind: "rule" as const, digest: digestBytes(utf8(ruleBytes)) };
  const mark: ArchiveMark = { commit: "a".repeat(40), parent: null, through, layout: 2,
    manifest: canonicalize({ format: "artroom-local-inventory-2", at: lane.at, through, after: null, objects: [{ key, pass: 0 }] }),
    anchorPublication: canonicalize({ anchors: [] }), replayScopes: [lane.at], markedAt: at(0) };
  await lane.inside(state => {
    const sql = archiveSql(state), store = new ArchiveRows(sql, lane.at);
    sql.exec("INSERT INTO retained_input(kind,digest,bytes) VALUES (?,?,?)", key.kind, key.digest, ruleBytes);
    store.target(repository, "sha1"); store.markAttempt(mark, at(30));
  });
  const failedCost = await lane.inside(state => {
    const sql = archiveSql(state), original = new ArchiveRows(sql, lane.at).load(), budget = new ArchiveBudget();
    let writes = 0;
    const failed = new ArchiveRows({ ...sql, exec(query, ...args) {
      const result = sql.exec(query, ...args);
      if (query.startsWith("INSERT INTO meta") && (args[0] === "archive-row-1" || args[0] === "archive-wake-1")) writes++;
      if (query.startsWith("INSERT INTO meta") && args[0] === "archive-wake-1") throw Error("TEST after confirmation second write");
      return result;
    } }, lane.at);
    expect(() => failed.confirm(mark.commit, budget)).toThrow("TEST after confirmation second write");
    expect(writes).toBe(2);
    expect(new ArchiveRows(sql, lane.at).load()).toEqual(original);
    expect(readRetainedArchivePass(sql, key, new ArchiveBudget())).toBeNull();
    expect(new ArchiveRows(sql, lane.at).wake()).toBe(at(30));
    return budget.admitted();
  });
  await lane.restart();
  await lane.inside(state => {
    const sql = archiveSql(state), original = new ArchiveRows(sql, lane.at).load();
    expect(original?.pending).toEqual(mark);
    let writes = 0;
    const store = new ArchiveRows({ ...sql, exec(query, ...args) {
      if (query.startsWith("INSERT INTO meta")) writes++;
      return sql.exec(query, ...args);
    } }, lane.at);
    const short = new ArchiveBudget({ inputWork: failedCost.inputWork - 1 });
    expect(() => store.confirm(mark.commit, short)).toThrow("archive-limit");
    expect(writes).toBe(0);
    expect(new ArchiveRows(sql, lane.at).load()).toEqual(original);
    expect(readRetainedArchivePass(sql, key, new ArchiveBudget())).toBeNull();
    expect(new ArchiveRows(sql, lane.at).wake()).toBe(at(30));
  });
  await lane.restart();
  const actual = await lane.inside(state => {
    const sql = archiveSql(state), exact = new ArchiveBudget(failedCost), store = new ArchiveRows(sql, lane.at);
    const confirmed = store.confirm(mark.commit, exact);
    expect(confirmed.pending).toBeNull();
    expect(confirmed.confirmed).toEqual({ commit: mark.commit, through, layout: 2, anchorsPublished: true });
    expect(readRetainedArchivePass(sql, key, new ArchiveBudget())).toBe(0);
    expect(store.wake()).toBeNull();
    expect(exact.admitted()).toEqual(failedCost);
    return confirmed;
  });
  await lane.restart();
  expect(await rows(lane, store => store.load())).toEqual(actual);
});
