/** Real native SQLite and turns, A1 objects and eviction. The reviewed
 * policy/authority and manual confirmation are explicit TEST STAND-INS;
 * no host, token, adapter send or production export admission is claimed. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { JournalArchive, JournalFormat } from "@generalbusiness/artroom-git/journal";
import { planArchive, planArchivePass, planArchiveConversion, rebuildArchive, rebuildArchivePass } from "../src/archive-build.ts";
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
function parentOf(archive: Pick<JournalArchive, "objects" | "commit">) {
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

// Invariant: a confirmed v2 receipt bounds both initial inventory and exact
// restart reconstruction to the new interval, even after another turn.
test("v2 native inventory and restart read only the marked new interval and keep earlier retained paths", async () => {
  const lane = await create({}, {}, base), initial = await lane.head();
  const first = await lane.inside(state => planArchivePass(sqlOf(state), { at: lane.at, through: initial, after: null,
    bounds: PROPOSED_BOUNDS, policies, format: "sha1", parent: null, markedAt: at(0) }, new ArchiveBudget()));
  expect(first.ok, JSON.stringify(first)).toBe(true); if (!first.ok) return;
  await lane.inside(state => { const rows = new ArchiveRows(sqlOf(state), lane.at); rows.target(repository, "sha1"); rows.mark(first.mark); rows.confirm(first.mark.commit); });
  await lane.submit(lane.remark("first new entry"));
  await lane.submit(lane.remark("second new entry"));
  const through = await lane.head(), parent = parentOf(first.archive);
  const planned = await lane.inside(async state => {
    const sql = sqlOf(state), queried: number[] = [];
    const exact: Sql = { transaction: action => state.storage.transactionSync(action), exec(query, ...args) {
      if (/\bFROM entry\b/.test(query)) {
        expect(typeof args[0]).toBe("number");
        expect(args[0] as number).toBeGreaterThan(initial.seq);
        queried.push(args[0] as number);
      }
      return sql.exec(query, ...args);
    } };
    const value = await planArchivePass(exact, { at: lane.at, through, after: initial, bounds: PROPOSED_BOUNDS,
      policies, format: "sha1", parent, markedAt: at(1) }, new ArchiveBudget());
    return { value, queried };
  });
  const next = planned.value;
  expect(next.ok, JSON.stringify(next)).toBe(true); if (!next.ok) return;
  expect(planned.queried.length).toBeGreaterThan(0);
  expect(next.archive.newInterval).toEqual([initial.seq + 1, through.seq]);
  expect(next.archive.selection.objects.find(object => object.key.kind === "definition" && object.key.digest === base.digest)?.pass).toBe(0);
  const oldBlobs = new Set(first.archive.objects.filter(object => object.type === "blob").map(object => object.id));
  expect(next.archive.objects.filter(object => object.type === "blob").some(object => oldBlobs.has(object.id))).toBe(false);
  await lane.inside(state => new ArchiveRows(sqlOf(state), lane.at).mark(next.mark));
  await lane.submit(lane.remark("later unselected native entry"));
  await lane.restart();
  const rebuilt = await lane.inside(async state => {
    const sql = sqlOf(state), row = new ArchiveRows(sql, lane.at).load()!, selected = JSON.parse(row.pending!.manifest);
    const positions = new Set(selected.entries.map((entry: { seq: number }) => entry.seq));
    const exact: Sql = { transaction: action => state.storage.transactionSync(action), exec(query, ...args) {
      if (/\bFROM entry\b/.test(query)) expect(positions.has(args[0])).toBe(true);
      else if (!query.includes(" FROM retained_input ") && !query.includes(" FROM retained_value ")) expect.fail(`unselected rebuild query: ${query}`);
      return sql.exec(query, ...args);
    } };
    return rebuildArchivePass(exact, row, parent, new ArchiveBudget());
  });
  expect(rebuilt.ok, JSON.stringify(rebuilt)).toBe(true); if (!rebuilt.ok) return;
  expect(rebuilt.archive.commit).toBe(next.archive.commit);
  expect(rebuilt.archive.objects).toEqual(next.archive.objects);
  await lane.inside(state => new ArchiveRows(sqlOf(state), lane.at).confirm(next.mark.commit));
  expect(await lane.head()).not.toEqual(through);
}, 20_000);

test("native v1 conversion waits for its receipt, rebuilds unchanged after eviction and confirms pass zero before appending", async () => {
  const lane = await create({}, {}, base), planned = await first(lane, "sha1"), parent = parentOf(planned.archive);
  const pending = await lane.inside(state => planArchiveConversion(sqlOf(state), {
    row: new ArchiveRows(sqlOf(state), lane.at).load()!, bounds: PROPOSED_BOUNDS, policies, parent, markedAt: at(1),
  }, new ArchiveBudget()));
  expect(pending).toEqual({ ok: false, reason: "manifest" });
  await lane.inside(state => new ArchiveRows(sqlOf(state), lane.at).confirm(planned.mark.commit));
  await lane.submit(lane.remark("after v1 receipt"));
  const calls: string[] = [];
  const conversionParent = { id: parent.id, source: { object: async (id: string, limit: number) => {
    calls.push(id); return parent.source.object(id, limit);
  } } };
  const converted = await lane.inside(state => planArchiveConversion(sqlOf(state), {
    row: new ArchiveRows(sqlOf(state), lane.at).load()!, bounds: PROPOSED_BOUNDS, policies, parent: conversionParent, markedAt: at(1),
  }, new ArchiveBudget()));
  expect(converted.ok ? "accepted" : converted).toBe("accepted"); if (!converted.ok) return;
  expect(new Set(calls)).toEqual(new Set([planned.mark.commit]));
  expect(converted.mark.through).toEqual(planned.mark.through);
  expect(converted.mark.parent).toBe(planned.mark.commit);
  expect(converted.archive.manifest.retained.every(key => key.pass === 0)).toBe(true);
  await lane.inside(state => new ArchiveRows(sqlOf(state), lane.at).mark(converted.mark));
  await lane.submit(lane.remark("after conversion mark"));
  await lane.restart();
  const rebuilt = await lane.inside(state => rebuildArchivePass(sqlOf(state), new ArchiveRows(sqlOf(state), lane.at).load()!, parent, new ArchiveBudget()));
  expect(rebuilt.ok ? "accepted" : rebuilt).toBe("accepted"); if (!rebuilt.ok) return;
  expect(rebuilt.archive.objects).toEqual(converted.archive.objects);
  expect(rebuilt.archive.commit).toBe(converted.archive.commit);
  const confirmation = await lane.inside(state => {
    const rows = new ArchiveRows(sqlOf(state), lane.at), before = state.storage.sql.exec("SELECT pass FROM retained_input WHERE kind = 'definition' AND digest = ?", base.digest).one();
    const row = rows.confirm(converted.mark.commit);
    const after = state.storage.sql.exec("SELECT pass FROM retained_input WHERE kind = 'definition' AND digest = ?", base.digest).one();
    return { before, after, row };
  });
  expect(confirmation.before).toEqual({ pass: null }); expect(confirmation.after).toEqual({ pass: 0 });
  expect(confirmation.row.confirmed).toEqual({ commit: converted.mark.commit, through: planned.mark.through, layout: 2 });
  const through = await lane.head();
  const appended = await lane.inside(state => planArchivePass(sqlOf(state), { at: lane.at, through, after: planned.mark.through,
    bounds: PROPOSED_BOUNDS, policies, parent: parentOf(converted.archive), format: "sha1", markedAt: at(2),
  }, new ArchiveBudget()));
  expect(appended.ok ? "accepted" : appended).toBe("accepted"); if (!appended.ok) return;
  expect(appended.archive.newInterval).toEqual([planned.mark.through.seq + 1, through.seq]);
  expect(appended.archive.selection.objects.find(key => key.key.kind === "definition")?.pass).toBe(0);
  expect(await lane.head()).toEqual(through);
}, 20_000);
