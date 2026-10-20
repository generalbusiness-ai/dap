/** Real native SQLite and turns, A1 objects and eviction. The reviewed
 * policy/authority and manual confirmation are explicit TEST STAND-INS;
 * no host, token, adapter send or production export admission is claimed. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { JournalArchive, JournalFormat } from "@generalbusiness/artroom-git/journal";
import { planArchive, rebuildArchive } from "../src/archive-build.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import type { Sql } from "../src/sqlite.ts";
import { at, create, rita, una, type Lane } from "./fixtures-native.ts";
import { archiveDefinition as base, archivePolicies as policies, archiveRepository as repository, archiveSql as sqlOf } from "./support/archive.ts";

async function first(lane: Lane, format: JournalFormat) {
  const through = await lane.head();
  const planned = await lane.inside(state => planArchive(sqlOf(state), { at: lane.at, through, bounds: PROPOSED_BOUNDS, policies, format, parent: null, markedAt: at(0) }, new ArchiveBudget()));
  expect(planned.ok, JSON.stringify(planned)).toBe(true); if (!planned.ok) throw new Error("fixture plan failed");
  await lane.inside(state => { const rows = new ArchiveRows(sqlOf(state), lane.at); rows.target(repository, format); rows.mark(planned.mark); });
  return planned;
}
function parentOf(archive: JournalArchive) {
  const objects = new Map(archive.objects.map(object => [object.id, object]));
  return {
    id: archive.commit,
    source: { async object(id: string, limit: number) {
      const object = objects.get(id);
      return object ? { type: object.type, size: object.data.length, data: object.data.length <= limit ? object.data : null } : null;
    } },
  };
}

// Invariant: after Mark, new native retained inputs and eviction cannot
// change the rebuilt commit or cause reads outside its stored selection.
test.each(["sha1", "sha256"] as const)("rebuilds the exact marked %s objects after a native turn retains a new rule input", async format => {
  const lane = await create({}, {}, base), planned = await first(lane, format);
  await lane.restart();
  const offer = await lane.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  await lane.did(rita, "assign", { on: offer.fact.seq, expected: { on: 1 }, fields: { performer: una.member } });
  const through = await lane.head();
  await lane.restart();
  const read = await lane.inside(async state => {
    const sql = sqlOf(state), row = new ArchiveRows(sql, lane.at).load()!;
    const selected = JSON.parse(row.pending!.manifest), positions = new Set(selected.entries.map((entry: { seq: number }) => entry.seq));
    const keys = new Set(selected.objects.map((object: { key: { kind: string; digest: string; domain?: string } }) => JSON.stringify([object.key.kind === "value" ? object.key.domain : object.key.kind, object.key.digest])));
    const queries: string[] = [];
    const exact: Sql = { transaction: action => state.storage.transactionSync(action), exec(query, ...args) {
      queries.push(query);
      if (query.includes(" FROM entry ")) expect(positions.has(args[0])).toBe(true);
      else if (query.includes(" FROM retained_input ") || query.includes(" FROM retained_value ")) expect(keys.has(JSON.stringify(args.slice(0, 2)))).toBe(true);
      else expect.fail(`rebuild attempted an unlisted query: ${query}`);
      return state.storage.sql.exec(query, ...args);
    } };
    return { built: await rebuildArchive(exact, row, null, new ArchiveBudget()), queries, pending: row.pending };
  });
  expect(read.built.ok, JSON.stringify(read.built)).toBe(true); if (!read.built.ok) return;
  expect(read.pending).toEqual(planned.mark);
  expect(read.built.archive.commit).toBe(planned.archive.commit);
  expect(read.built.archive.objects).toEqual(planned.archive.objects);
  expect(read.queries.length).toBeGreaterThan(0);
  // Manual component confirmation stands in for host read-back in this test.
  await lane.inside(state => { new ArchiveRows(sqlOf(state), lane.at).confirm(planned.mark.commit); });
  const next = await lane.inside(state => planArchive(sqlOf(state), { at: lane.at, through, bounds: PROPOSED_BOUNDS, policies, format, parent: parentOf(planned.archive), markedAt: at(1) }, new ArchiveBudget()));
  expect(next.ok, JSON.stringify(next)).toBe(true); if (!next.ok) return;
  expect(next.archive.commit).not.toBe(planned.archive.commit);
  expect(next.mark.parent).toBe(planned.archive.commit);
  expect(next.archive.selection.objects.some(object => object.key.kind === "rule")).toBe(true);
  expect(await lane.head()).toEqual(through);
}, 20_000);

// Invariant: rebuild never replaces a lost named dependency, and a complete
// build whose ID differs from the stored mark returns no archive objects.
test("stops a missing named input and a differing rebuild without substitution", async () => {
  const lane = await create({}, {}, base), planned = await first(lane, "sha1");
  const wrong = await lane.inside(state => {
    const sql = sqlOf(state), row = new ArchiveRows(sql, lane.at).load()!;
    return rebuildArchive(sql, { ...row, pending: { ...row.pending!, commit: "b".repeat(40) } }, null, new ArchiveBudget());
  });
  expect(wrong).toEqual({ ok: false, reason: "rebuild-mismatch" });
  await lane.inside(state => { state.storage.sql.exec("DELETE FROM retained_input WHERE kind = 'definition' AND digest = ?", base.digest); });
  await lane.restart();
  const missing = await lane.inside(state => { const sql = sqlOf(state), row = new ArchiveRows(sql, lane.at).load()!; expect(row.pending).toEqual(planned.mark); return rebuildArchive(sql, row, null, new ArchiveBudget()); });
  expect(missing).toMatchObject({ ok: false, reason: "missing-input" });
  expect(missing).not.toHaveProperty("archive");
});

test("an empty policy registry still refuses planning before any archive is returned", async () => {
  const lane = await create({}, {}, base), through = await lane.head();
  const refused = await lane.inside(state => planArchive(sqlOf(state), { at: lane.at, through, bounds: PROPOSED_BOUNDS, policies: new Map(), format: "sha1", parent: null, markedAt: at(0) }, new ArchiveBudget()));
  expect(refused).toEqual({ ok: false, reason: "unsupported-archive-cohort" });
});
