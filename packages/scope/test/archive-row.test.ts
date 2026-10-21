/** Real native SQLite bookkeeping and restart. Marks below are explicit
 * test-authored metadata, not admitted inventory, built commits or host proof. */
import { expect, test } from "vitest";
import { canonicalize, digestBytes, domainBytes, utf8 } from "@generalbusiness/artroom-bytes";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { ARCHIVE_ROW_BYTES, ArchiveRows, type ArchiveMark } from "../src/archive-row.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { at, create, type Lane } from "./fixtures-native.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { readRetainedArchivePass } from "../src/archive-retained-pass.ts";
import { archiveSql } from "./support/archive.ts";
import { archivePendingRowBytesUpper, forecastArchiveBookkeeping } from "../src/archive-row-cost.ts";

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
  expect(finishBudget.admitted()).toEqual(original);
  expect(forecastArchiveBookkeeping(sizes)).toEqual({ ok: true, cost: original });
  (context.task.meta as Record<string, unknown>)["archiveRowCost"] = { sizes, cost: finishBudget.admitted(),
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
