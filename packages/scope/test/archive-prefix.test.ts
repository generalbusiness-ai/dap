/** Native SQLite scalar admission, not complete privacy or integrity proof.
 * The lane certificate and additional/corrupt history rows are stand-ins.
 * Creation, pin writes, SQL sizes, row limits and budget execution are real. */
import { expect, test } from "vitest";
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, newIncarnation, textDigest } from "@generalbusiness/artroom-bytes";
import { ARCHIVE_BOUNDS, ArchiveBudget } from "../src/archive-budget.ts";
import { ARCHIVE_POSITION_METADATA_BYTES, archivePrefixMetadata } from "../src/archive-prefix.ts";
import { ArchiveWindow, openArchiveWindow, type ArchiveWindowCheckpoint } from "../src/archive-window.ts";
import { definition, create, rita } from "./fixtures-native.ts";

const syntheticHash = textDigest("synthetic prefix row, not a verified entry");
const certified = new Set([definition.digest]);
test("native scalar lookahead stops before a whole entry would consume the owner's remaining work, without poisoning or refilling the budget", async () => {
  const lane = await create();
  await lane.did(rita, "remark", { on: 0, fields: { text: "genuine selected native entry" } });
  const selected = await lane.head();
  await lane.did(rita, "remark", { on: 0, fields: { text: "genuine later native entry" } });
  const head = await lane.head();
  const result = await lane.inside(state => {
    const queries: string[] = [], budget = new ArchiveBudget();
    const sql = { exec(query: string, ...args: (string | number | null)[]) { queries.push(query); return state.storage.sql.exec(query, ...args); } };
    const window = openArchiveWindow(sql, lane.at, head, null, PROPOSED_BOUNDS, budget, certified);
    const first = window.next();
    if (first.kind !== "position") return expect.fail("The first native position must fit.");
    const second = window.next();
    if (second.kind !== "position") return expect.fail("The second native position must fit.");
    const used = budget.admitted(), reserve = { inputWork: ARCHIVE_BOUNDS.inputWork - used.inputWork - ARCHIVE_POSITION_METADATA_BYTES };
    const next = window.next(reserve), after = budget.admitted();
    expect(next).toEqual({ kind: "limited" });
    const prefix = window.prefix({ seq: second.position.seq, hash: second.position.hash });
    const finalWorkFits = budget.canSpend(reserve);
    budget.spend(reserve);
    return { first, next, prefix, used, after, finalWorkFits, full: budget.admitted(), extraFits: budget.canSpend({ inputWork: 1 }), queries };
  });
  expect(result.prefix.positions.map(row => row.seq)).toEqual([0, 1]);
  expect(result.prefix.through).toEqual(selected);
  expect(result.after.entries).toBe(result.used.entries);
  expect(result.after.inputWork).toBeGreaterThan(result.used.inputWork);
  expect(result.finalWorkFits).toBe(true);
  expect(result.full.inputWork).toBe(ARCHIVE_BOUNDS.inputWork);
  expect(result.extraFits).toBe(false);
  expect(result.queries.filter(query => query.includes("FROM entry")).every(query => !/json_|SELECT bytes|SELECT \*/.test(query))).toBe(true);
});

test("a native first-position size change cannot reuse the earlier JSON-work reservation", async () => {
  const lane = await create(), head = await lane.head();
  await lane.inside(state => {
    const budget = new ArchiveBudget(), window = openArchiveWindow(state.storage.sql, lane.at, head, null, PROPOSED_BOUNDS, budget, certified);
    // Corrupt native metadata/body after scalar admission; no fake positive.
    state.storage.sql.exec("UPDATE entry SET bytes = bytes || ' ', size = size + 1 WHERE seq = 0");
    expect(() => window.next()).toThrow("archive-mismatch");
  });
});

test("a one-use metadata checkpoint resumes in a fresh native frame without recounting entries or extending its captured head, and fences a changed reserved footprint", async () => {
  const lane = await create();
  await lane.did(rita, "remark", { on: 0, fields: { text: "first genuine native entry" } });
  await lane.did(rita, "remark", { on: 0, fields: { text: "captured native head" } });
  const head = await lane.head(), queries: string[] = [];
  let checkpoint!: ArchiveWindowCheckpoint, budget!: ArchiveBudget;
  const opened = await lane.inside(state => {
    budget = new ArchiveBudget();
    const sql = { exec(query: string, ...args: (string | number | null)[]) { queries.push(query); return state.storage.sql.exec(query, ...args); } };
    const window = openArchiveWindow(sql, lane.at, head, null, PROPOSED_BOUNDS, budget, certified);
    const first = window.next(), second = window.next();
    if (first.kind !== "position" || second.kind !== "position") return expect.fail("Both native positions must fit.");
    checkpoint = window.checkpoint();
    expect(() => window.next()).toThrow("archive-unavailable");
    expect(() => window.prefix({ seq: second.position.seq, hash: second.position.hash })).toThrow("archive-unavailable");
    return { seqs: [first.position.seq, second.position.seq], cost: budget.admitted() };
  });
  // The first synchronous callback has returned. A real native commit occurs
  // during the asynchronous gap; no old window/frame remains usable.
  await lane.did(rita, "remark", { on: 0, fields: { text: "later native head outside this window" } });
  const live = await lane.head();
  const resumed = await lane.inside(state => {
    const sql = { exec(query: string, ...args: (string | number | null)[]) { queries.push(query); return state.storage.sql.exec(query, ...args); } };
    const window = ArchiveWindow.resume(sql, checkpoint);
    expect(window.budget).toBe(budget);
    expect(() => ArchiveWindow.resume(sql, checkpoint)).toThrow("archive-unavailable");
    const next = window.next();
    if (next.kind !== "position") return expect.fail("The next native position must fit.");
    const prefix = window.prefix(head), end = window.next(), closed = window.checkpoint();
    const beforeDamage = budget.admitted();
    // Restored negative only: a coherent metadata/body-length increase must
    // not reuse the earlier reservation. This is not accepted history.
    const row = state.storage.sql.exec<{ bytes: string; size: number }>("SELECT bytes, size FROM entry WHERE seq = ?", head.seq).one();
    try {
      state.storage.sql.exec("UPDATE entry SET bytes = ?, size = ? WHERE seq = ?", row.bytes + " ", row.size + 1, head.seq);
      expect(() => ArchiveWindow.resume(sql, closed)).toThrow("archive-mismatch");
    } finally { state.storage.sql.exec("UPDATE entry SET bytes = ?, size = ? WHERE seq = ?", row.bytes, row.size, head.seq); }
    return { seq: next.position.seq, prefix, end, beforeDamage, afterDamage: budget.admitted() };
  });
  expect(opened.seqs).toEqual([0, 1]); expect(opened.cost.entries).toBe(2);
  expect(resumed.seq).toBe(2); expect(resumed.prefix.positions.map(p => p.seq)).toEqual([0, 1, 2]);
  expect(resumed.prefix.through).toEqual(head); expect(resumed.prefix.frame.head).toEqual(live);
  expect(resumed.end).toEqual({ kind: "end" });
  expect(resumed.beforeDamage.entries).toBe(3); expect(resumed.afterDamage.entries).toBe(3);
  expect(resumed.beforeDamage.calls).toBeGreaterThan(opened.cost.calls);
  expect(resumed.beforeDamage.inputWork).toBeGreaterThan(opened.cost.inputWork);
  expect(queries.filter(q => q.includes("FROM entry")).every(q => !/json_|SELECT bytes|SELECT \*/.test(q))).toBe(true);
});

test("native prefix admission binds the original cutoff and full pin before entry JSON/body reads", async () => {
  const lane = await create(), through = await lane.head();
  await lane.did(rita, "remark", { on: 0, fields: { text: "later unrelated input" } });
  const result = await lane.inside(state => {
    const queries: string[] = [], budget = new ArchiveBudget();
    const prefix = archivePrefixMetadata({ exec(query, ...args) { queries.push(query); return state.storage.sql.exec(query, ...args); } }, lane.at, through, PROPOSED_BOUNDS, budget, certified);
    return { prefix, queries, cost: budget.admitted() };
  });
  expect(result.prefix.through).toEqual(through);
  expect(result.prefix.positions.map(row => row.seq)).toEqual([0]);
  expect(result.prefix.pin.at).toEqual(lane.at);
  expect(result.cost.entries).toBe(1);
  expect(result.cost.calls).toBe(7);
  expect(result.queries.filter(query => /FROM entry/.test(query)).every(query => !/json_|SELECT bytes|SELECT \*/.test(query))).toBe(true);
  expect(result.queries.some(query => query.includes("octet_length(bytes)"))).toBe(true);
  expect(result.cost.inputWork).toBeGreaterThan(result.prefix.bytes * 16);
});

test("native incarnation, cutoff, gap and size damage cannot yield prefix admission; an unadmitted pin fails before positions", async () => {
  const lane = await create();
  await lane.did(rita, "remark", { on: 0, fields: { text: "bounded second entry" } });
  const through = await lane.head();
  const result = await lane.inside(state => {
    const read = (at: ScopeRef, head: Head) => {
      const queries: string[] = [];
      try { archivePrefixMetadata({ exec(query, ...args) { queries.push(query); return state.storage.sql.exec(query, ...args); } }, at, head, PROPOSED_BOUNDS, new ArchiveBudget(), certified); return { reason: "admitted", queries }; }
      catch (error) { return { reason: (error as { reason: string }).reason, queries }; }
    };
    const wrongInc = read({ ...lane.at, inc: newIncarnation(new Uint8Array(16).fill(39)) }, through);
    const future = read(lane.at, { ...through, seq: through.seq + 1 });
    const wrongHash = read(lane.at, { ...through, hash: syntheticHash });
    const original = state.storage.sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'scope'").one().v;
    const changed = JSON.parse(original); changed.head.extra = true;
    state.storage.sql.exec("UPDATE meta SET v = ? WHERE k = 'scope'", canonicalize(changed));
    const unknownFrame = read(lane.at, through);
    state.storage.sql.exec("UPDATE meta SET v = ? WHERE k = 'scope'", original);
    state.storage.sql.exec("UPDATE entry SET size = size + 1 WHERE seq = 1");
    const size = read(lane.at, through);
    state.storage.sql.exec("UPDATE entry SET size = size - 1 WHERE seq = 1");
    state.storage.sql.exec("DELETE FROM entry WHERE seq = 1");
    const gap = read(lane.at, through);
    return { wrongInc, future, wrongHash, unknownFrame, size, gap };
  });
  expect(result.wrongInc.reason).toBe("unavailable");
  expect(result.wrongInc.queries.some(query => /FROM entry/.test(query))).toBe(false);
  expect(result.future.reason).toBe("incomplete");
  expect(result.wrongHash.reason).toBe("mismatch");
  expect(result.unknownFrame.reason).toBe("unavailable");
  expect(result.size.reason).toBe("mismatch");
  expect(result.gap.reason).toBe("incomplete");
  // The declaration is a genuine native pin, not an asserted flag.
  // No certificate is granted to it. It fails before any prefix projection.
  const legacy = await create();
  await legacy.did(rita, "remark", { on: 0, fields: { text: "native entry after supplied predecessor" } });
  const legacyHead = await legacy.head();
  for (const streaming of [false, true]) {
    const refusal = await legacy.inside(state => {
      const queries: string[] = [];
      const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) { queries.push(query); return state.storage.sql.exec(query, ...args); } };
      try {
        if (streaming) openArchiveWindow(sql, legacy.at, legacyHead, { seq: 0, hash: legacy.genesis.fact.hash }, PROPOSED_BOUNDS, new ArchiveBudget(), new Set());
        else archivePrefixMetadata(sql, legacy.at, legacy.genesis.fact, PROPOSED_BOUNDS, new ArchiveBudget(), new Set());
        return { reason: "admitted", queries };
      }
      catch (error) { return { reason: (error as { reason: string }).reason, queries }; }
    });
    expect(refusal.reason).toBe("unsupported-archive-cohort");
    expect(refusal.queries.some(query => streaming ? query.includes("FROM entry") : query.includes("octet_length(bytes)"))).toBe(false);
  }
});

test("real scalar rows admit exactly 4096 positions and refuse 4097 without JSON inspection", async () => {
  const lane = await create();
  const result = await lane.inside(state => {
    const sql = state.storage.sql;
    sql.exec("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 4096) INSERT INTO entry (seq, hash, time, bytes, size) SELECT x, ?, 'synthetic', '{}', 2 FROM n", syntheticHash);
    const metadata = JSON.parse(sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'scope'").one().v);
    metadata.head = { seq: 4096, hash: syntheticHash };
    sql.exec("UPDATE meta SET v = ? WHERE k = 'scope'", canonicalize(metadata));
    const budget = new ArchiveBudget();
    const prefix = archivePrefixMetadata(sql, lane.at, { seq: 4095, hash: syntheticHash }, PROPOSED_BOUNDS, budget, certified);
    const overflowBudget = new ArchiveBudget();
    let overflow = "admitted";
    try { archivePrefixMetadata(sql, lane.at, metadata.head, PROPOSED_BOUNDS, overflowBudget, certified); }
    catch (error) { overflow = (error as { reason: string }).reason; }
    return { rows: prefix.positions.length, cost: budget.admitted(), overflow, overflowCost: overflowBudget.admitted() };
  });
  expect(result.rows).toBe(4096);
  expect(result.cost.entries).toBe(4096);
  expect(result.cost.metadata).toBeLessThan(4 * 1024 * 1024);
  expect(result.overflow).toBe("limit");
  expect(result.overflowCost.entries).toBe(0);
});

test("stored bytes over the cumulative JSON-work allowance refuse before entry JSON or body projection", async () => {
  const lane = await create();
  const result = await lane.inside(state => {
    const sql = state.storage.sql, bytes = '"' + "x".repeat(128 * 1024 - 2) + '"';
    sql.exec("WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x + 1 FROM n WHERE x < 33) INSERT INTO entry (seq, hash, time, bytes, size) SELECT x, ?, 'synthetic', ?, ? FROM n", syntheticHash, bytes, bytes.length);
    const metadata = JSON.parse(sql.exec<{ v: string }>("SELECT v FROM meta WHERE k = 'scope'").one().v);
    metadata.head = { seq: 33, hash: syntheticHash };
    sql.exec("UPDATE meta SET v = ? WHERE k = 'scope'", canonicalize(metadata));
    const queries: string[] = [], budget = new ArchiveBudget();
    let reason = "admitted";
    try { archivePrefixMetadata({ exec(query, ...args) { queries.push(query); return sql.exec(query, ...args); } }, lane.at, metadata.head, PROPOSED_BOUNDS, budget, certified); }
    catch (error) { reason = (error as { reason: string }).reason; }
    return { reason, queries, cost: budget.admitted() };
  });
  expect(result.reason).toBe("limit");
  expect(result.cost.entries).toBe(0); // atomic aggregate reservation failed
  expect(result.queries.filter(query => /FROM entry/.test(query)).every(query => !/json_|SELECT bytes|SELECT \*/.test(query))).toBe(true);
  expect(result.cost.inputWork).toBeLessThan(1024 * 1024); // sizing, not the large JSON bodies
});
