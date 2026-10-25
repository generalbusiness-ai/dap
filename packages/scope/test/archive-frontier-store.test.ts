/** Real native SQLite/transactions and eviction, with mechanical Git
 * trees and TEST-authored Marks. No admitted archive or remote proof. */
import { expect, test } from "vitest";
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { captureJournalParentFrontier, JournalWork, journalV2PassPath, type JournalObject, type JournalParentBinding } from "@generalbusiness/dap-git/journal";
import { JournalObjects } from "../../git/src/journal-objects.ts";
import { patchJournalV2Tree } from "../../git/src/journal-v2-tree.ts";
import { ArchiveFrontiers, type ArchiveFrontierPrepared, type ArchiveFrontierBootstrap, type ArchiveFrontierBootstrapPrepared } from "../src/archive-frontier-store.ts";
import { ARCHIVE_FRONTIER_BYTES, ARCHIVE_FRONTIER_ENCODING_BOUND, archiveFrontierEncodingBound, archiveFrontierRowContextBound, forecastArchiveFrontierFinish } from "../src/archive-frontier-cost.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { ArchiveRows, consumeArchivePlanningSnapshot, type ArchiveMark } from "../src/archive-row.ts";
import { at, create } from "./fixtures-native.ts";
import { archiveRepository, archiveSql } from "./support/archive.ts";
import type { Sql } from "../src/sqlite.ts";
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";

const CONFIRMED = "archive-frontier-confirmed-1", PENDING = "archive-frontier-pending-1";
const repository = digestBytes(utf8(canonicalize(archiveRepository)));
const budget = () => new ArchiveBudget({}, () => 0);
async function fixture(scope: ScopeRef, through: Head, parent: string | null = null, first = 0, repositoryId = repository) {
  const work = new JournalWork(budget()), maker = new JournalObjects("sha1", work);
  const files = [{ path: "journal/v2/head.json", data: utf8(canonicalize({ v: 2, scope, through: through.seq, hash: through.hash })) },
    { path: journalV2PassPath(first), data: utf8("TEST mechanical pass leaf; not an admitted manifest") }];
  const tree = await patchJournalV2Tree(null, null, files, maker, work);
  const commit = maker.commit(tree, parent, 1_700_000_000).id;
  const binding: JournalParentBinding = { format: "sha1", repository: repositoryId, at: scope, through, commit };
  const objects = new Map<string, JournalObject>(maker.objects().map(object => [object.id, object]));
  const source = { object: async (id: string, maximum: number) => {
    const object = objects.get(id); return object ? { type: object.type, size: object.data.length, data: maximum >= object.data.length ? object.data : null } : null;
  } };
  const frontier = await captureJournalParentFrontier(binding, source, budget());
  const mark: ArchiveMark = { commit, parent, through, layout: 2, markedAt: at(0),
    manifest: canonicalize({ format: "artroom-local-inventory-2", after: null, objects: [] }) };
  return { binding, frontier, mark, source };
}
const store = (sql: Sql, scope: ScopeRef, repositoryId = repository) => new ArchiveFrontiers(sql, { at: scope, repository: repositoryId, format: "sha1" });
const values = (sql: Sql) => sql.exec("SELECT k, v FROM meta WHERE k IN (?, ?) ORDER BY k", CONFIRMED, PENDING).toArray();

test("frontier Mark and promotion share rollback cuts and the pending proof survives native eviction", async () => {
  const lane = await create(), made = await fixture(lane.at, await lane.head());
  await lane.inside(async state => {
    const sql = archiveSql(state), rows = new ArchiveRows(sql, lane.at), frontiers = store(sql, lane.at);
    rows.target(archiveRepository, "sha1", budget());
    expect(await frontiers.readConfirmed(made.binding, budget())).toBeNull();
    const preparing = budget(), beforePrepare = preparing.admitted();
    const prepared = await frontiers.prepareFromSource(made.source, made.mark, null, preparing);
    expect(preparing.admitted().nodes - beforePrepare.nodes, "Capture the nine actual tree nodes once").toBe(9);
    expect(archiveFrontierEncodingBound(made.mark.through.seq)).toBe(8744);
    const narrow = forecastArchiveFrontierFinish({ hasBase: false, through: made.mark.through.seq,
      markUnits: made.mark.manifest.length, markedRowBytes: 4096 });
    const full = forecastArchiveFrontierFinish({ hasBase: false, markUnits: made.mark.manifest.length, markedRowBytes: 4096 });
    expect(narrow.ok && full.ok).toBe(true);
    if (narrow.ok && full.ok) expect(full.cost.metadata - narrow.cost.metadata).toBeGreaterThan(750_000);
    expect(preparing.admitted().metadata - beforePrepare.metadata).toBeLessThan(256 * 1024);
    // The public view is owned, but is never the prepared authority.
    prepared.frontier.objects[0]!.data.fill(0);
    expect(() => frontiers.stage({ frontier: made.frontier, base: null } as ArchiveFrontierPrepared, budget())).toThrow("archive-row-unavailable");
    expect(() => store(sql, lane.at).stage(prepared, budget())).toThrow("archive-row-unavailable");
    expect(() => sql.transaction(() => {
      rows.markAttempt(made.mark, at(1), budget()); frontiers.stage(prepared, budget());
      throw Error("TEST abort after pending frontier write");
    })).toThrow("TEST abort after pending frontier write");
    expect(rows.load(budget())?.pending).toBeNull(); expect(values(sql)).toEqual([]);
    sql.transaction(() => { rows.markAttempt(made.mark, at(1), budget()); frontiers.stage(prepared, budget()); });
    const pending = values(sql); expect(pending).toHaveLength(1);
    expect(utf8(pending[0]!["v"] as string).length).toBeLessThanOrEqual(ARCHIVE_FRONTIER_ENCODING_BOUND);
    // An untrusted stored envelope larger than this receipt's profile is
    // refused before JSON/base64 decoding, below the independent 64 KiB cap.
    sql.exec("UPDATE meta SET v=? WHERE k=?", " ".repeat(archiveFrontierEncodingBound(made.mark.through.seq) + 1), PENDING);
    try { await expect(frontiers.readPending(made.binding, made.mark, budget())).rejects.toMatchObject({ reason: "limit" }); }
    finally { sql.exec("UPDATE meta SET v=? WHERE k=?", pending[0]!["v"]!, PENDING); }
    expect(values(sql)).toEqual(pending);
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
    // Source-owned preparation still hashes every object and checks the
    // real commit edge before it can create private stage authority.
    const wrongEdge = await fixture(lane.at, made.mark.through, "f".repeat(40));
    // The declared Mark agrees with the empty native base. Only the actual
    // hash-valid commit edge disagrees, so capture must reject that edge.
    await expect(frontiers.prepareFromSource(wrongEdge.source, { ...wrongEdge.mark, parent: null }, null, budget())).rejects.toThrow("parent");
    const corrupt = { object: async (id: string, maximum: number) => {
      const value = await made.source.object(id, maximum);
      if (value === null || value.data === null || id !== made.mark.commit) return value;
      const data = new Uint8Array(value.data); data[0] = data[0]! ^ 1;
      return { ...value, data };
    } };
    await expect(frontiers.prepareFromSource(corrupt, made.mark, null, budget())).rejects.toThrow("object-mismatch");
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
  // SQLite measures UTF-8 JSON bytes, not JS string length. Exercise quote,
  // backslash, escaped controls, BMP and astral characters in the real row.
  const escapedRepository = { ...archiveRepository, namespace: 'TEST "\\\n\t雪🌱' };
  const repositoryId = digestBytes(utf8(canonicalize(escapedRepository)));
  const lane = await create(), made = await fixture(lane.at, await lane.head(), null, 0, repositoryId);
  await lane.inside(async state => {
    const sql = archiveSql(state), queries: string[] = [];
    const projectionPrefix = "SELECT json_extract(v, '$.at') AS at,";
    let raceBeforeProjection: string | null = null, projectedRaceRows: number | null = null;
    const counted: Sql = { ...sql, exec(query, ...args) {
      queries.push(query);
      const racing = raceBeforeProjection !== null && query.startsWith(projectionPrefix);
      if (racing) {
        const replacement = raceBeforeProjection!; raceBeforeProjection = null;
        // Deliberate test-only intervening write inside stage's transaction.
        sql.exec("UPDATE meta SET v = ? WHERE k = ?", replacement, "archive-row-1").toArray();
      }
      const cursor = sql.exec(query, ...args);
      return racing ? { toArray() { const rows = cursor.toArray(); projectedRaceRows = rows.length; return rows; } } : cursor;
    } };
    const frontiers = store(counted, lane.at, repositoryId);
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
    const rows = new ArchiveRows(sql, lane.at), planningBudget = budget();
    const oldRow = rows.target(escapedRepository, "sha1", planningBudget);
    const planning = rows.prepareCapacityDeferral(oldRow, () => at(60), planningBudget).planning!;
    expect(planning).toBeDefined();
    const ownedRowBytes = consumeArchivePlanningSnapshot(planning.token, sql, planning.row, planningBudget);
    expect(ownedRowBytes).toBe(utf8(canonicalize(planning.row)).length);
    const ownedContextBytes = archiveFrontierRowContextBound(planning.row, ownedRowBytes);
    expect(ownedContextBytes).toBeLessThan(archiveFrontierRowContextBound(planning.row));
    expect(() => consumeArchivePlanningSnapshot(planning.token, sql, planning.row, planningBudget)).toThrow("archive-row-unavailable");
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
    const defaultForecast = forecastArchiveFrontierFinish({ hasBase: false, through: made.mark.through.seq,
      markUnits: made.mark.manifest.length, markedRowBytes: rowSize as number });
    const forecast = forecastArchiveFrontierFinish({ hasBase: false, through: made.mark.through.seq, captureFromSource: true,
      markUnits: made.mark.manifest.length, markedRowBytes: rowSize as number });
    expect(defaultForecast.ok && forecast.ok).toBe(true);
    if (defaultForecast.ok && forecast.ok)
      expect(defaultForecast.cost.nodes - forecast.cost.nodes, "Reserve one extraction instead of extraction plus validation").toBe(9);
    // Unknown/persisted frontiers retain the complete validation path.
    const validating = budget(); await frontiers.prepare(made.frontier, made.mark, null, validating);
    if (defaultForecast.ok) for (const key of Object.keys(defaultForecast.cost) as (keyof typeof defaultForecast.cost)[])
      expect(validating.admitted()[key], `Default unknown-frontier ${key}`).toBeLessThanOrEqual(defaultForecast.cost[key]);
    const markedNative = rows.loadSnapshot(budget())!, contextBytes = ownedContextBytes;
    expect(contextBytes).toBeGreaterThanOrEqual(1024); expect(contextBytes).toBeLessThan(32 * 1024);
    const contextForecast = forecastArchiveFrontierFinish({ hasBase: false, through: made.mark.through.seq, captureFromSource: true,
      rowContextBytes: contextBytes, markUnits: made.mark.manifest.length, markedRowBytes: rowSize as number });
    expect(contextForecast.ok).toBe(true);
    const finishing = budget(), exact = await frontiers.prepareFromSource(made.source, made.mark, null, finishing, contextBytes);
    expect(finishing.admitted().nodes, "Source-owned preparation visits the nine trees once").toBe(9);
    // Compare two actual stage debits on identical native bytes. The default
    // token above retains 32 KiB; the source-owned token uses a checked bound.
    queries.length = 0;
    const narrowStage = budget();
    expect(() => sql.transaction(() => { frontiers.stage(exact, narrowStage); throw Error("TEST narrow context rollback"); })).toThrow("TEST narrow context rollback");
    expect(values(sql)).toEqual([]); expect(rows.loadSnapshot(budget())!.bytes).toBe(markedNative.bytes);
    const scalarIndex = queries.findIndex(query => query.startsWith("SELECT octet_length(json_extract("));
    const projectionIndex = queries.findIndex(query => query.startsWith(projectionPrefix));
    expect(scalarIndex).toBeGreaterThanOrEqual(0); expect(projectionIndex).toBeGreaterThan(scalarIndex);
    expect(queries[scalarIndex]).toContain("AS atBytes"); expect(queries[scalarIndex]).toContain("AS repositoryBytes");
    expect(queries[scalarIndex]).toContain("AS confirmedBytes");
    const projected = sql.exec("SELECT octet_length(json_extract(v, '$.at')) AS a, octet_length(json_extract(v, '$.repository')) AS r, CASE WHEN json_type(v, '$.confirmed') = 'null' THEN 0 ELSE octet_length(json_extract(v, '$.confirmed')) END AS c FROM meta WHERE k = ?", "archive-row-1").toArray()[0]!;
    expect(1024 + (projected["a"] as number) + (projected["r"] as number) + (projected["c"] as number)).toBeLessThanOrEqual(contextBytes);
    expect(narrowStage.admitted().calls).toBe(spent.calls);
    expect(narrowStage.admitted().metadata).toBeLessThan(spent.metadata);
    expect(narrowStage.admitted().inputWork).toBeLessThan(spent.inputWork);
    if (forecast.ok && contextForecast.ok) {
      expect(forecast.cost.nodes).toBe(contextForecast.cost.nodes); expect(forecast.cost.calls).toBe(contextForecast.cost.calls);
      // Finish has two row checks. Its saving must match their actual
      // per-check difference, including native metadata folded into work.
      expect(forecast.cost.metadata - contextForecast.cost.metadata).toBe(2 * (spent.metadata - narrowStage.admitted().metadata));
      expect(forecast.cost.inputWork - contextForecast.cost.inputWork).toBe(2 * (spent.inputWork - narrowStage.admitted().inputWork));
    }
    const largerRepository = { ...markedNative.row.repository, namespace: markedNative.row.repository.namespace + "x".repeat(contextBytes) };
    expect(utf8(canonicalize(largerRepository)).length).toBeLessThanOrEqual(25600);
    const largerContext = canonicalize({ ...markedNative.row, repository: largerRepository });
    // Growth after preparation is refused by numeric sizes before context
    // strings cross the SQL boundary. The failed call cannot write a key.
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", largerContext, "archive-row-1").toArray();
    queries.length = 0;
    try {
      expect(() => frontiers.stage(exact, budget())).toThrow("archive-row-limit");
      expect(queries.some(query => query.startsWith("SELECT octet_length(json_extract("))).toBe(true);
      expect(queries.some(query => query.startsWith(projectionPrefix))).toBe(false);
      expect(queries.every(query => query.startsWith("SELECT "))).toBe(true); expect(values(sql)).toEqual([]);
      expect(sql.exec("SELECT v FROM meta WHERE k = ?", "archive-row-1").toArray()[0]!["v"]).toBe(largerContext);
    } finally { sql.exec("UPDATE meta SET v = ? WHERE k = ?", markedNative.bytes, "archive-row-1").toArray(); }
    // A same-total-size race cannot evade the individual measured-length
    // fence: grow repository text while consuming inert trailing padding.
    const extra = utf8(largerContext).length - utf8(markedNative.bytes).length;
    expect(extra).toBeGreaterThan(0);
    const paddedBefore = markedNative.bytes + " ".repeat(extra + 64), paddedAfter = largerContext + " ".repeat(64);
    expect(utf8(paddedAfter).length).toBe(utf8(paddedBefore).length);
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", paddedBefore, "archive-row-1").toArray();
    queries.length = 0; projectedRaceRows = null; raceBeforeProjection = paddedAfter;
    try {
      expect(() => frontiers.stage(exact, budget())).toThrow("archive-row-conflict");
      expect(raceBeforeProjection).toBeNull();
      expect(projectedRaceRows, "Refuse the enlarged repository before any projected row crosses SQL").toBe(0);
      expect(queries.some(query => query.startsWith("SELECT octet_length(json_extract("))).toBe(true);
      expect(queries.filter(query => query.startsWith(projectionPrefix))).toHaveLength(1);
      expect(queries.every(query => query.startsWith("SELECT "))).toBe(true); expect(values(sql)).toEqual([]);
      expect(sql.exec("SELECT v FROM meta WHERE k = ?", "archive-row-1").toArray()[0]!["v"]).toBe(paddedBefore);
    } finally { raceBeforeProjection = null; sql.exec("UPDATE meta SET v = ? WHERE k = ?", markedNative.bytes, "archive-row-1").toArray(); }
    // Equal lengths still require the original scope and repository hash
    // checks. These rows pass the size fences, then fail identity validation.
    const wrongInc = markedNative.row.at.inc === "in_aaaaaaaaaaaaaaaaaaaaaaaaaa" ? "in_bbbbbbbbbbbbbbbbbbbbbbbbbb" : "in_aaaaaaaaaaaaaaaaaaaaaaaaaa";
    const wrongName = (markedNative.row.repository.name.startsWith("x") ? "y" : "x") + markedNative.row.repository.name.slice(1);
    const wrongIdentities = [
      canonicalize({ ...markedNative.row, at: { ...markedNative.row.at, inc: wrongInc } }),
      canonicalize({ ...markedNative.row, repository: { ...markedNative.row.repository, name: wrongName } }),
    ];
    for (const wrong of wrongIdentities) {
      expect(wrong).not.toBe(markedNative.bytes); expect(utf8(wrong).length).toBe(utf8(markedNative.bytes).length);
      queries.length = 0; projectedRaceRows = null; raceBeforeProjection = wrong;
      try {
        expect(() => frontiers.stage(exact, budget())).toThrow("archive-row-conflict");
        expect(raceBeforeProjection).toBeNull(); expect(projectedRaceRows).toBe(1);
        expect(queries.every(query => query.startsWith("SELECT "))).toBe(true); expect(values(sql)).toEqual([]);
        expect(rows.loadSnapshot(budget())!.bytes).toBe(markedNative.bytes);
      } finally { raceBeforeProjection = null; }
    }
    sql.transaction(() => { frontiers.stage(exact, finishing); });
    sql.transaction(() => { frontiers.promote(exact, finishing); rows.confirm(made.mark.commit, budget()); });
    if (forecast.ok) for (const key of Object.keys(forecast.cost) as (keyof typeof forecast.cost)[])
      expect(finishing.admitted()[key], `Include all remaining frontier ${key}`).toBeLessThanOrEqual(forecast.cost[key]);
    if (contextForecast.ok) for (const key of Object.keys(contextForecast.cost) as (keyof typeof contextForecast.cost)[])
      expect(finishing.admitted()[key], `Include the bounded native context ${key}`).toBeLessThanOrEqual(contextForecast.cost[key]);
    // A loaded base keeps its already-spent validation. The next finish
    // must cover actual stage/promotion while fencing changed larger keys
    // before their bodies, including within the independent 64 KiB cap.
    const base = await frontiers.readConfirmed(made.binding, budget()); expect(base).not.toBeNull();
    const next = await fixture(lane.at, { ...made.mark.through, seq: made.mark.through.seq + 1 }, made.mark.commit, made.mark.through.seq + 1, repositoryId);
    const nextPlanningBudget = budget(), nextRow = rows.load(nextPlanningBudget)!;
    const nextPlanning = rows.prepareCapacityDeferral(nextRow, () => at(60), nextPlanningBudget).planning!;
    expect(nextPlanning).toBeDefined();
    const nextOwnedBytes = consumeArchivePlanningSnapshot(nextPlanning.token, sql, nextPlanning.row, nextPlanningBudget);
    const nextContextBytes = archiveFrontierRowContextBound(nextPlanning.row, nextOwnedBytes);
    expect(nextContextBytes).toBeLessThan(archiveFrontierRowContextBound(nextPlanning.row));
    // Compare the original six-per-unit ceiling with the owned-byte bound,
    // separately from the older 32 KiB fallback comparison above.
    const genericContextBytes = archiveFrontierRowContextBound(nextPlanning.row);
    const genericContextQuote = forecastArchiveFrontierFinish({ hasBase: true, through: next.mark.through.seq, captureFromSource: true,
      rowContextBytes: genericContextBytes, markUnits: next.mark.manifest.length, markedRowBytes: 16 * 1024 });
    const ownedContextQuote = forecastArchiveFrontierFinish({ hasBase: true, through: next.mark.through.seq, captureFromSource: true,
      rowContextBytes: nextContextBytes, markUnits: next.mark.manifest.length, markedRowBytes: 16 * 1024 });
    expect(genericContextQuote.ok && ownedContextQuote.ok).toBe(true);
    if (genericContextQuote.ok && ownedContextQuote.ok) {
      expect(genericContextQuote.cost.metadata - ownedContextQuote.cost.metadata).toBe(2 * 5 * (genericContextBytes - nextContextBytes));
      expect(genericContextQuote.cost.inputWork - ownedContextQuote.cost.inputWork).toBe(2 * 13 * (genericContextBytes - nextContextBytes));
      for (const key of ["entries", "attempts", "nodes", "calls"] as const)
        expect(ownedContextQuote.cost[key]).toBe(genericContextQuote.cost[key]);
    }
    const future = budget(), ready = await frontiers.prepareFromSource(next.source, next.mark, base, future, nextContextBytes);
    expect(future.admitted().nodes, "Loaded-base source-owned preparation visits nine trees once").toBe(9);
    rows.markAttempt(next.mark, at(2), budget());
    const marked = rows.loadSnapshot(budget())!.bytes;
    const nextProjection = sql.exec("SELECT octet_length(json_extract(v, '$.at')) AS a, octet_length(json_extract(v, '$.repository')) AS r, octet_length(json_extract(v, '$.confirmed')) AS c FROM meta WHERE k = ?", "archive-row-1").toArray()[0]!;
    expect(1024 + (nextProjection["a"] as number) + (nextProjection["r"] as number) + (nextProjection["c"] as number)).toBeLessThanOrEqual(nextContextBytes);
    const confirmed = values(sql)[0]!["v"] as string;
    const changed = "x".repeat(ARCHIVE_FRONTIER_ENCODING_BOUND + 1);
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", changed, CONFIRMED);
    queries.length = 0;
    const fenced = new ArchiveBudget({ metadata: 192 }, () => 0);
    expect(() => frontiers.stage(ready, fenced)).toThrow("archive-row-conflict");
    expect(queries).toHaveLength(1); expect(queries[0]).toContain("octet_length");
    expect(fenced.admitted().metadata).toBe(96);
    expect(values(sql)[0]!["v"]).toBe(changed); expect(rows.load(budget())?.pending).toEqual(next.mark);
    // Equal byte length is insufficient: even a one-byte change must fail
    // the paid BLOB equality without projecting or parsing the body.
    const sameSize = "!" + confirmed.slice(1);
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", sameSize, CONFIRMED);
    queries.length = 0;
    expect(() => frontiers.stage(ready, budget())).toThrow("archive-row-conflict");
    expect(queries).toHaveLength(2); expect(queries[1]).toContain("CAST(v AS BLOB)");
    expect(values(sql)[0]!["v"]).toBe(sameSize); expect(rows.loadSnapshot(budget())!.bytes).toBe(marked);
    expect(queries.every(query => query.startsWith("SELECT "))).toBe(true);
    // Exact restoration of deliberate concurrent-change fixtures.
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", confirmed, CONFIRMED);
    const nextRowSize = sql.exec("SELECT octet_length(v) AS size FROM meta WHERE k = ?", "archive-row-1").toArray()[0]!["size"];
    expect(typeof nextRowSize).toBe("number");
    const nextForecast = forecastArchiveFrontierFinish({ hasBase: true, through: next.mark.through.seq, captureFromSource: true,
      rowContextBytes: nextContextBytes, markUnits: next.mark.manifest.length, markedRowBytes: nextRowSize as number });
    expect(nextForecast.ok).toBe(true);
    sql.transaction(() => { frontiers.stage(ready, future); });
    const staged = values(sql).find(row => row["k"] === PENDING)!["v"] as string;
    const changedPending = "!" + staged.slice(1);
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", changedPending, PENDING);
    queries.length = 0;
    expect(() => frontiers.promote(ready, budget())).toThrow("archive-row-conflict");
    expect(queries).toHaveLength(4); expect(queries[3]).toContain("CAST(v AS BLOB)");
    expect(queries.every(query => query.startsWith("SELECT "))).toBe(true);
    expect(values(sql).find(row => row["k"] === PENDING)!["v"]).toBe(changedPending);
    expect(rows.loadSnapshot(budget())!.bytes).toBe(marked);
    // The same owned token remains usable after exact fixture restoration.
    sql.exec("UPDATE meta SET v = ? WHERE k = ?", staged, PENDING);
    sql.transaction(() => { frontiers.promote(ready, future); rows.confirm(next.mark.commit, budget()); });
    if (nextForecast.ok) for (const key of Object.keys(nextForecast.cost) as (keyof typeof nextForecast.cost)[])
      expect(future.admitted()[key], `Include loaded-base frontier ${key}`).toBeLessThanOrEqual(nextForecast.cost[key]);
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
