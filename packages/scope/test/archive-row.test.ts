/** Real native SQLite bookkeeping and restart. Marks below are explicit
 * test-authored metadata, not admitted inventory, built commits or host proof. */
import { expect, test } from "vitest";
import { canonicalize } from "@generalbusiness/artroom-bytes";
import { ARCHIVE_ROW_BYTES, ArchiveRows, type ArchiveMark } from "../src/archive-row.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { at, create, type Lane } from "./fixtures-native.ts";

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
test("preserves a single immutable mark across a native restart and later turn", async () => {
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
  await expect(rows(lane, store => store.target({ ...repository, id: "other-repository" }, "sha1"))).rejects.toThrow("archive-row-conflict");
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
