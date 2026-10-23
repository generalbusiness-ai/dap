/** Real native SQLite/transactions and eviction, with mechanical Git
 * trees and TEST-authored Marks. No admitted archive or remote proof. */
import { expect, test } from "vitest";
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { captureJournalParentFrontier, JournalWork, journalV2PassPath, type JournalObject, type JournalParentBinding } from "@generalbusiness/dap-git/journal";
import { JournalObjects } from "../../git/src/journal-objects.ts";
import { patchJournalV2Tree } from "../../git/src/journal-v2-tree.ts";
import { ArchiveFrontiers, type ArchiveFrontierPrepared, type ArchiveFrontierBootstrap, type ArchiveFrontierBootstrapPrepared } from "../src/archive-frontier-store.ts";
import { ARCHIVE_FRONTIER_BYTES, ARCHIVE_FRONTIER_ENCODING_BOUND, forecastArchiveFrontierFinish } from "../src/archive-frontier-cost.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { ArchiveRows, type ArchiveMark } from "../src/archive-row.ts";
import { at, create } from "./fixtures-native.ts";
import { archiveRepository, archiveSql } from "./support/archive.ts";
import type { Sql } from "../src/sqlite.ts";
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";

const CONFIRMED = "archive-frontier-confirmed-1", PENDING = "archive-frontier-pending-1";
const repository = digestBytes(utf8(canonicalize(archiveRepository)));
const budget = () => new ArchiveBudget({}, () => 0);
async function fixture(scope: ScopeRef, through: Head, parent: string | null = null) {
  const work = new JournalWork(budget()), maker = new JournalObjects("sha1", work);
  const files = [{ path: "journal/v2/head.json", data: utf8(canonicalize({ v: 2, scope, through: through.seq, hash: through.hash })) },
    { path: journalV2PassPath(0), data: utf8("TEST mechanical pass leaf; not an admitted manifest") }];
  const tree = await patchJournalV2Tree(null, null, files, maker, work);
  const commit = maker.commit(tree, parent, 1_700_000_000).id;
  const binding: JournalParentBinding = { format: "sha1", repository, at: scope, through, commit };
  const objects = new Map<string, JournalObject>(maker.objects().map(object => [object.id, object]));
  const frontier = await captureJournalParentFrontier(binding, { object: async (id, maximum) => {
    const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: maximum >= object.data.length ? object.data : null } : null;
  } }, budget());
  const mark: ArchiveMark = { commit, parent, through, layout: 2, markedAt: at(0),
    manifest: canonicalize({ format: "artroom-local-inventory-2", after: null, objects: [] }) };
  return { binding, frontier, mark };
}
const store = (sql: Sql, scope: ScopeRef) => new ArchiveFrontiers(sql, { at: scope, repository, format: "sha1" });
const values = (sql: Sql) => sql.exec("SELECT k, v FROM meta WHERE k IN (?, ?) ORDER BY k", CONFIRMED, PENDING).toArray();

test("frontier Mark and promotion share rollback cuts and the pending proof survives native eviction", async () => {
  const lane = await create(), made = await fixture(lane.at, await lane.head());
  await lane.inside(async state => {
    const sql = archiveSql(state), rows = new ArchiveRows(sql, lane.at), frontiers = store(sql, lane.at);
    rows.target(archiveRepository, "sha1", budget());
    expect(await frontiers.readConfirmed(made.binding, budget())).toBeNull();
    const prepared = await frontiers.prepare(made.frontier, made.mark, null, budget());
    // The public view is owned, but is never the prepared authority.
    prepared.frontier.objects[0]!.data.fill(0);
    expect(() => frontiers.stage({ frontier: made.frontier, base: null } as ArchiveFrontierPrepared, budget())).toThrow("archive-row-unavailable");
    expect(() => sql.transaction(() => {
      rows.markAttempt(made.mark, at(1), budget()); frontiers.stage(prepared, budget());
      throw Error("TEST abort after pending frontier write");
    })).toThrow("TEST abort after pending frontier write");
    expect(rows.load(budget())?.pending).toBeNull(); expect(values(sql)).toEqual([]);
    sql.transaction(() => { rows.markAttempt(made.mark, at(1), budget()); frontiers.stage(prepared, budget()); });
    const pending = values(sql); expect(pending).toHaveLength(1);
    expect(utf8(pending[0]!["v"] as string).length).toBeLessThanOrEqual(ARCHIVE_FRONTIER_ENCODING_BOUND);
  });
  await lane.restart();
  await lane.inside(async state => {
    const sql = archiveSql(state), rows = new ArchiveRows(sql, lane.at), frontiers = store(sql, lane.at);
    const pending = await frontiers.readPending(made.binding, made.mark, budget()); expect(pending).not.toBeNull();
    const before = values(sql), row = rows.load(budget());
    expect(() => sql.transaction(() => {
      frontiers.promote(pending!, budget()); rows.confirm(made.mark.commit, budget());
      throw Error("TEST abort after native confirmation");
    })).toThrow("TEST abort after native confirmation");
    expect(values(sql)).toEqual(before); expect(rows.load(budget())).toEqual(row);
    sql.transaction(() => { frontiers.promote(pending!, budget()); rows.confirm(made.mark.commit, budget()); });
    expect(rows.load(budget())).toMatchObject({ pending: null, confirmed: { commit: made.mark.commit, through: made.mark.through, layout: 2 } });
    const base = await frontiers.readConfirmed(made.binding, budget()); expect(base).not.toBeNull();
    expect(base!.frontier).toEqual(made.frontier);
    const source = frontiers.source(base!, budget());
    const first = await source.object(made.mark.commit, 1024); expect(first?.data).not.toBeNull();
    first!.data!.fill(0);
    expect((await source.object(made.mark.commit, 1024))?.data).toEqual(made.frontier.objects[0]!.data);
    expect(values(sql)).toHaveLength(1); expect(values(sql)[0]?.["k"]).toBe(CONFIRMED);
  });
});

test("a prepared frontier cannot overwrite a changed key or a different native Mark or custody", async () => {
  const lane = await create(), made = await fixture(lane.at, await lane.head());
  await lane.inside(async state => {
    const sql = archiveSql(state), rows = new ArchiveRows(sql, lane.at), frontiers = store(sql, lane.at);
    rows.target(archiveRepository, "sha1", budget());
    const prepared = await frontiers.prepare(made.frontier, made.mark, null, budget());
    expect(() => sql.transaction(() => {
      rows.markAttempt({ ...made.mark, markedAt: at(2) }, at(3), budget()); frontiers.stage(prepared, budget());
    })).toThrow("archive-row-conflict");
    expect(rows.load(budget())?.pending).toBeNull(); expect(values(sql)).toEqual([]);
    sql.exec("INSERT INTO meta(k,v) VALUES (?,?)", PENDING, "TEST intervening state");
    expect(() => sql.transaction(() => {
      rows.markAttempt(made.mark, at(1), budget()); frontiers.stage(prepared, budget());
    })).toThrow("archive-row-conflict");
    expect(rows.load(budget())?.pending).toBeNull();
    await expect(frontiers.readConfirmed(made.binding, budget())).rejects.toThrow("archive-row-conflict");
    sql.exec("DELETE FROM meta WHERE k = ?", PENDING);
    await expect(frontiers.prepare({ ...made.frontier, repository: digestBytes(utf8("TEST wrong repository")) }, made.mark, null, budget())).rejects.toThrow("parent");
    // Neither failed validation nor stale-key comparison installs a record.
    expect(values(sql)).toEqual([]);
    // A valid envelope whose Mark digest contradicts the CURRENT checked
    // native Mark is distinguishable from stale caller input or a forged error.
    const empty = rows.loadSnapshot(budget())!;
    sql.transaction(() => { rows.markAttempt(made.mark, at(1), budget()); frontiers.stage(prepared, budget()); });
    const original = rows.loadSnapshot(budget())!;
    const wrongMark = { ...made.mark, commit: "b".repeat(40) }, wrongBinding = { ...made.binding, commit: wrongMark.commit };
    const stale = await frontiers.readPending(wrongBinding, wrongMark, budget()).then(() => null, error => error);
    expect(stale).toMatchObject({ reason: "conflict" }); expect(frontiers.isCurrentPendingMismatch(stale, budget())).toBe(false);
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", canonicalize({ ...original.row, pending: wrongMark }), "archive-row-1");
    const contradiction = await frontiers.readPending(wrongBinding, wrongMark, budget()).then(() => null, error => error);
    expect(frontiers.isCurrentPendingMismatch(contradiction, budget())).toBe(true);
    expect(frontiers.isCurrentPendingMismatch(new Error("archive-frontier-pending-mismatch"), budget())).toBe(false);
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", original.bytes, "archive-row-1");
    expect(frontiers.isCurrentPendingMismatch(contradiction, budget())).toBe(false);
    // Deliberate fixture restoration after the corruption checks.
    sql.exec("DELETE FROM meta WHERE k = ?", PENDING); sql.exec("UPDATE meta SET v = ? WHERE k = ?", empty.bytes, "archive-row-1");
    // Existing v1 conversion is distinct from missing-v2 bootstrap. The
    // old receipt is real bookkeeping, but its commit is TEST-authored.
    const legacy: ArchiveMark = { commit: "c".repeat(40), parent: null, through: made.mark.through,
      manifest: "TEST old v1 selection", markedAt: at(0) };
    rows.markAttempt(legacy, at(1), budget()); rows.confirm(legacy.commit, budget());
    const converted = await fixture(lane.at, made.mark.through, legacy.commit);
    await expect(frontiers.prepare(converted.frontier, converted.mark, null, budget())).rejects.toThrow("conflict");
    const conversion = frontiers.readConversionBase(budget());
    // Deliberate mutation of the owned public view, not of token authority.
    (conversion.position.through as { hash: string }).hash = digestBytes(utf8("TEST mutable public receipt view"));
    await expect(frontiers.prepare(made.frontier, { ...converted.mark, commit: made.binding.commit }, conversion, budget())).rejects.toThrow("parent");
    const next = await frontiers.prepare(converted.frontier, converted.mark, conversion, budget());
    sql.transaction(() => { rows.markAttempt(converted.mark, at(1), budget()); frontiers.stage(next, budget()); });
    sql.transaction(() => { frontiers.promote(next, budget()); rows.confirm(converted.mark.commit, budget()); });
    expect((await frontiers.readConfirmed(converted.binding, budget()))?.frontier).toEqual(converted.frontier);
    expect(() => frontiers.readConversionBase(budget())).toThrow("conflict");
  });
});

test("frontier size and work are admitted before body reads or writes, without refunding a rollback", async () => {
  const lane = await create(), made = await fixture(lane.at, await lane.head());
  await lane.inside(async state => {
    const sql = archiveSql(state), queries: string[] = [];
    const counted: Sql = { ...sql, exec(query, ...args) { queries.push(query); return sql.exec(query, ...args); } };
    const frontiers = store(counted, lane.at);
    await expect(frontiers.readConfirmed(made.binding, new ArchiveBudget({ metadata: 0 }, () => 0))).rejects.toThrow("archive-limit");
    expect(queries).toEqual([]);
    sql.exec("INSERT INTO meta(k,v) VALUES (?,?)", CONFIRMED, "x".repeat(ARCHIVE_FRONTIER_BYTES + 1));
    await expect(frontiers.readConfirmed(made.binding, budget())).rejects.toThrow("archive-row-limit");
    expect(queries).toHaveLength(1); expect(queries[0]).toContain("octet_length");
    sql.exec("DELETE FROM meta WHERE k = ?", CONFIRMED);
    // A missing pending key must not inspect or hash a legacy Mark.
    queries.length = 0;
    expect(await frontiers.readPending(made.binding, null as unknown as ArchiveMark, new ArchiveBudget({ metadata: 192 }, () => 0))).toBeNull();
    expect(queries).toHaveLength(2);
    const rows = new ArchiveRows(sql, lane.at); rows.target(archiveRepository, "sha1", budget());
    const prepared = await frontiers.prepare(made.frontier, made.mark, null, budget()); rows.markAttempt(made.mark, at(1), budget());
    const measured = budget();
    expect(() => sql.transaction(() => { frontiers.stage(prepared, measured); throw Error("TEST measure rollback"); })).toThrow("TEST measure rollback");
    const spent = measured.admitted(); expect(spent.calls).toBeGreaterThan(0); expect(spent.metadata).toBeGreaterThan(0);
    expect(values(sql)).toEqual([]);
    queries.length = 0;
    const short = new ArchiveBudget({ calls: spent.calls - 1 }, () => 0);
    expect(() => frontiers.stage(prepared, short)).toThrow("archive-limit");
    expect(queries.every(query => query.startsWith("SELECT "))).toBe(true);
    expect(values(sql)).toEqual([]); expect(rows.load(budget())?.pending).toEqual(made.mark);
    expect(short.admitted().calls).toBe(spent.calls - 1);
    const rowSize = sql.exec("SELECT octet_length(v) AS size FROM meta WHERE k = ?", "archive-row-1").toArray()[0]!["size"];
    expect(typeof rowSize).toBe("number");
    const forecast = forecastArchiveFrontierFinish({ hasBase: false, markUnits: made.mark.manifest.length, markedRowBytes: rowSize as number });
    expect(forecast.ok).toBe(true);
    const finishing = budget(), exact = await frontiers.prepare(made.frontier, made.mark, null, finishing);
    sql.transaction(() => { frontiers.stage(exact, finishing); });
    sql.transaction(() => { frontiers.promote(exact, finishing); rows.confirm(made.mark.commit, budget()); });
    if (forecast.ok) for (const key of Object.keys(forecast.cost) as (keyof typeof forecast.cost)[])
      expect(finishing.admitted()[key], `Include all remaining frontier ${key}`).toBeLessThanOrEqual(forecast.cost[key]);
  });
});


test("a missing-v2 seed binds an opaque exact native context and installs only confirmed bytes", async () => {
  const lane = await create(), made = await fixture(lane.at, await lane.head());
  await lane.inside(async state => {
    const sql = archiveSql(state), queries: string[] = [];
    const counted: Sql = { ...sql, exec(query, ...args) { queries.push(query); return sql.exec(query, ...args); } };
    const rows = new ArchiveRows(sql, lane.at), frontiers = store(counted, lane.at);
    rows.target(archiveRepository, "sha1", budget());
    const first = await frontiers.prepare(made.frontier, made.mark, null, budget());
    sql.transaction(() => { rows.markAttempt(made.mark, at(1), budget()); frontiers.stage(first, budget()); });
    sql.transaction(() => { frontiers.promote(first, budget()); rows.confirm(made.mark.commit, budget()); });
    // Explicit pre-upgrade native fixture: receipt stays, both new keys absent.
    sql.exec("DELETE FROM meta WHERE k = ?", CONFIRMED);
    const before = rows.loadSnapshot(budget())!, wake = sql.exec("SELECT v FROM meta WHERE k = ?", "archive-wake-1").toArray();
    const context = frontiers.beginConfirmedBootstrap(budget()); expect(context).not.toBeNull();
    const finish = frontiers.bootstrapFinish(context!); expect(finish.ok).toBe(true);
    await expect(frontiers.prepareConfirmedBootstrap({ binding: made.binding } as ArchiveFrontierBootstrap, made.frontier, budget())).rejects.toThrow("unavailable");
    expect(() => frontiers.installConfirmedBootstrap({ frontier: made.frontier } as ArchiveFrontierBootstrapPrepared, budget())).toThrow("unavailable");
    // Deliberately mutate a deep public view; the private binding still wins.
    (context!.binding.through as { hash: string }).hash = digestBytes(utf8("TEST untrusted public binding"));
    await expect(frontiers.prepareConfirmedBootstrap(context!, { ...made.frontier, repository: digestBytes(utf8("TEST other repository")) }, budget())).rejects.toThrow("parent");
    const preparation = budget(), ready = await frontiers.prepareConfirmedBootstrap(context!, made.frontier, preparation);
    sql.exec("INSERT INTO meta(k,v) VALUES (?,?)", PENDING, "TEST intervening frontier");
    expect(() => frontiers.installConfirmedBootstrap(ready, budget())).toThrow("conflict");
    sql.exec("DELETE FROM meta WHERE k = ?", PENDING);
    sql.exec("UPDATE meta SET v = v || ' ' WHERE k = ?", "archive-row-1");
    expect(() => frontiers.installConfirmedBootstrap(ready, budget())).toThrow("conflict");
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", before.bytes, "archive-row-1");
    const measured = budget();
    expect(() => sql.transaction(() => { frontiers.installConfirmedBootstrap(ready, measured); throw Error("TEST rollback seed"); })).toThrow("TEST rollback seed");
    expect(values(sql)).toEqual([]); expect(rows.loadSnapshot(budget())!.bytes).toBe(before.bytes);
    const spent = measured.admitted(); queries.length = 0;
    expect(() => frontiers.installConfirmedBootstrap(ready, new ArchiveBudget({ calls: spent.calls - 1 }, () => 0))).toThrow("archive-limit");
    expect(queries.every(query => query.startsWith("SELECT "))).toBe(true); expect(values(sql)).toEqual([]);
    ready.frontier.objects[0]!.data.fill(0);
    const installing = budget(), base = frontiers.installConfirmedBootstrap(ready, installing);
    expect(base.frontier).toEqual(made.frontier);
    expect(rows.loadSnapshot(budget())!.bytes).toBe(before.bytes);
    expect(sql.exec("SELECT v FROM meta WHERE k = ?", "archive-wake-1").toArray()).toEqual(wake);
    expect(values(sql).map(row => row["k"])).toEqual([CONFIRMED]);
    expect(() => frontiers.installConfirmedBootstrap(ready, budget())).toThrow("conflict");
    if (finish.ok) for (const key of Object.keys(finish.cost) as (keyof typeof finish.cost)[])
      expect(preparation.admitted()[key] + installing.admitted()[key], `Bootstrap local finish ${key}`).toBeLessThanOrEqual(finish.cost[key]);
  });
  await lane.restart();
  await lane.inside(async state => {
    const frontiers = store(archiveSql(state), lane.at), base = await frontiers.readConfirmed(made.binding, budget());
    expect(base?.frontier).toEqual(made.frontier);
  });
});
