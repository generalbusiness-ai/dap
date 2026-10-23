import { floorMonotonicChange } from "./definition-corpus-data.ts";
/** Actual Native turns, SQLite, eviction and replay of the SAME saved journal.
 * Definition, grants, reader, clock and archive receipt port are test fixtures;
 * this is not evidence of platform authority or Git archive custody. */
import { expect, test } from "vitest";
import type { Entry, FloorInput, Sealed } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/artroom-bytes";
import { applyEntry, MemoryState, stateDigest } from "@generalbusiness/dap-derive";
import { variant } from "@generalbusiness/dap-derive/testing";
import { MemorySource, verify, type MemoryScope } from "@generalbusiness/artroom-replay";
import { floorOwn } from "../../replay/src/floor.ts";
import { Scope } from "../src/core.ts";
import { production } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { testPorts } from "../src/testing.ts";
import { at, create, reader, rita } from "./fixtures-native.ts";
import { archiveDefinition, archiveSql } from "./support/archive.ts";

// Invariant: a new live reference to an archived final item's identity must
// not resurrect its opening, either in SQLite or through a complete clone.
test("Native and complete-clone replay never resurrect an archived final item through a new live reference", async () => {
  const definition = variant(archiveDefinition.declared, floorMonotonicChange());
  const lane = await create({}, {}, definition);
  const opening = await lane.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  expect(opening.fact.seq).toBe(1);
  await lane.did(rita, "finish", { on: 1, expected: { on: 1 } });
  while ((await lane.head()).seq < 150) expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" });
  let journal: MemoryScope = { scope: lane.at, entries: [], retained: [] };
  const capture = async () => {
    const after = journal.entries.at(-1)?.seq ?? -1;
    const rows = await lane.inside(state => {
      const sql = archiveSql(state);
      return { entries: sql.exec("SELECT seq,hash,bytes FROM entry WHERE seq>? ORDER BY seq", after).toArray(),
        retained: sql.exec("SELECT kind,digest,bytes,under FROM retained_input ORDER BY kind,digest").toArray().map(row => ({ kind: row["kind"], digest: row["digest"], bytes: row["bytes"], ...(row["under"] === null ? {} : { under: row["under"] }) })) };
    });
    journal = { ...journal, entries: [...journal.entries, ...rows.entries as unknown as MemoryScope["entries"]], retained: rows.retained as unknown as MemoryScope["retained"] };
  };
  const receipts = new Map<string, FloorInput["receipt"]["through"]>();
  const offer = async (floor: number, keep: number[], commit: string) => {
    const receipt = { commit, through: await lane.head() }; receipts.set(commit, receipt.through);
    await capture(); // Save genuine bytes BEFORE this floor can prune them.
    expect(await lane.inside(state => new Scope(lane.name, new SqliteStore(archiveSql(state)), { ...production(), ...testPorts(lane.c) }, lane.c.bounds).floor({ type: "floor", floor, receipt, keep }))).toMatchObject({ answer: "written" });
    await capture();
  };
  lane.c.clock.now = at(1000);
  await offer(50, [], "e".repeat(40));
  await lane.restart();
  expect(await lane.stub.entry(reader, 1)).toMatchObject({ ok: false, reason: "archived", archived: { floor: 50 } });
  const remembered = await lane.did(rita, "remember", { on: 0, expected: { on: 1 }, fields: { previous: 1 } });
  while ((await lane.head()).seq < 350) expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" });
  lane.c.clock.now = at(3000);
  await offer(200, [remembered.fact.seq], "f".repeat(40));
  await lane.restart();
  const native = await lane.inside(state => {
    const store = new SqliteStore(archiveSql(state));
    return { snapshot: store.all(), stored: store.stored(1), kept: store.floor()!.kept };
  });
  const read = await lane.stub.entry(reader, 1);
  const fact = await lane.act(rita, "remark", { on: 0, fields: { text: "old opening is still archived", proof: opening.fact } });
  expect(await lane.stub.checkpoint()).toMatchObject({ answer: "written" });
  await capture();
  const source = Object.assign(new MemorySource([journal]), { floorReceipt: async (_scope: string, commit: string) => ({ ok: true as const, scope: lane.at, through: receipts.get(commit)!, bytes: 128 }) });
  const replayed = await verify(source, { mode: "replay", scope: lane.name, grants: "as-recorded" });
  expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
  const entries: Sealed[] = journal.entries.map(row => ({ entry: JSON.parse(row.bytes) as Entry, hash: row.hash }));
  const replayState = new MemoryState();
  for (const sealed of entries) applyEntry(replayState, definition, sealed.entry, sealed.hash, { own: floorOwn(replayState, entries), bounds: lane.c.bounds });
  const replayOwn = floorOwn(replayState, entries);
  // Report both sides before the assertions so the old-logic counterexample
  // records the Native missing row AND the clone's resurrected payload.
  console.log("monotonic-floor-observation", canonicalize({ nativeKept: native.kept, nativeStored: native.stored !== null, nativeRead: read, nativeFact: fact, replayKept: replayState.floor()!.kept, replayOwn: replayOwn(1)?.entry.seq ?? null, replayResult: replayed.report.result }));
  expect(native.snapshot.items.find(item => item.id === 1)).toMatchObject({ state: "done" });
  expect(native.snapshot.items.find(item => item.id === 0)?.refs["previous"]).toBe(1);
  expect(native.stored).toBeNull();
  expect(native.kept).not.toContain(1);
  expect(native.kept).toContain(remembered.fact.seq);
  expect(read).toMatchObject({ ok: false, reason: "archived", archived: { floor: 200, commit: "f".repeat(40) } });
  expect(fact).toMatchObject({ answer: "refused", reason: "archived" });
  expect(replayOwn(1)).toBeNull();
  expect(replayOwn.archived!(1)).toMatchObject({ floor: 200 });
  const digest = await lane.inside(state => stateDigest(new SqliteStore(archiveSql(state)).all()));
  expect(stateDigest(replayState.all())).toBe(digest);
}, 60_000);
