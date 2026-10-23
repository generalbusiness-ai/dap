/** Real native SQLite and turns, A1 objects and eviction. The reviewed
 * policy/authority and manual confirmation are explicit TEST STAND-INS;
 * no host, token, adapter send or production export admission is claimed. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { textDigest } from "@generalbusiness/dap-bytes";
import { ArchiveSegmentCursor, journalV2SegmentPath, journalV2RetainedPath, prepareJournalPass, type JournalArchive, type JournalFormat } from "@generalbusiness/dap-git/journal";
import type { RetainedKey } from "@generalbusiness/dap-derive";
import { planArchive, planArchivePass, planArchiveConversion, rebuildArchive, rebuildArchivePass } from "../src/archive-build.ts";
import { ArchiveRows } from "../src/archive-row.ts";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { inventoryArchive } from "../src/archive-inventory.ts";
import { archivePrefixMetadata } from "../src/archive-prefix.ts";
import { archivePrivacyMetadata } from "../src/archive-privacy.ts";
import { ArchiveLocalReferences, type ArchiveLocalReferencePlan } from "../src/archive-local-references.ts";
import { ArchivePlanFence } from "../src/archive-plan-fence.ts";
import { forecastArchiveInventoryEntry, forecastArchiveInventoryFinal } from "../src/archive-inventory-cost.ts";
import { forecastArchiveRetainedPass } from "../src/archive-row-cost.ts";
import { readRetainedArchivePass } from "../src/archive-retained-pass.ts";
import type { Sql } from "../src/sqlite.ts";
import { at, create, rita, una, type Lane } from "./fixtures-native.ts";
class RecordingInventoryBudget extends ArchiveBudget {
  readonly charges: Partial<ArchiveCost>[] = [];
  override spend(cost: Partial<ArchiveCost>): void { super.spend(cost); this.charges.push({ ...cost }); }
}
const sumCharges = (charges: readonly Partial<ArchiveCost>[]): ArchiveCost => {
  const total: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
  for (const cost of charges) for (const key of Object.keys(total) as (keyof ArchiveCost)[]) total[key] += cost[key] ?? 0;
  return total;
};
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
test("v2 native inventory and restart read only the marked new interval and keep earlier retained paths", async context => {
  const lane = await create({}, {}, base), initial = await lane.head();
  const first = await lane.inside(state => planArchivePass(sqlOf(state), { at: lane.at, through: initial, after: null,
    bounds: PROPOSED_BOUNDS, policies, format: "sha1", parent: null, markedAt: at(0) }, new ArchiveBudget()));
  expect(first.ok, JSON.stringify(first)).toBe(true); if (!first.ok) return;
  await lane.inside(state => { const rows = new ArchiveRows(sqlOf(state), lane.at); rows.target(repository, "sha1"); rows.mark(first.mark); rows.confirm(first.mark.commit); });
  await lane.submit(lane.remark("first new entry"));
  await lane.submit(lane.remark("second new entry"));
  const offer = await lane.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
  await lane.did(rita, "assign", { on: offer.fact.seq, expected: { on: 1 }, fields: { performer: una.member } });
  const through = await lane.head(), parent = parentOf(first.archive);
  const planned = await lane.inside(async state => {
    const sql = sqlOf(state), queried: number[] = [];
    let recording: RecordingInventoryBudget | undefined, pinStart = -1;
    const entryReads: { bytes: unknown; cost: ArchiveCost }[] = [];
    let finalRead: ArchiveCost | undefined;
    const exact: Sql = { transaction: action => state.storage.transactionSync(action), exec(query, ...args) {
      if (recording) {
        if (query.startsWith("SELECT k, octet_length(v) AS bytes, typeof(v) AS type FROM meta ")) pinStart = recording.charges.length - 2;
        if (query.startsWith("SELECT bytes FROM entry WHERE seq = ? AND hash = ? AND size = ?")) {
          entryReads.push({ bytes: args[2], cost: sumCharges(recording.charges.slice(-2)) });
        }
        if (query.startsWith("SELECT hash, size, octet_length(bytes) AS actual FROM entry WHERE seq = ?")) {
          finalRead = sumCharges(recording.charges.slice(pinStart));
        }
      }
      if (/\bFROM entry\b/.test(query)) {
        // Metadata table joins bind trusted names/JSON paths before seq.
        const source = /\b(?:entry\.)?seq\s*(?:=|>=)\s*\?/.exec(query);
        const index = source ? (query.slice(0, source.index).match(/\?/g) ?? []).length : -1;
        queried.push(args[index] as number);
      }
      return sql.exec(query, ...args);
    } };
    const forecast = (source: Sql, budget: ArchiveBudget, damage?: "position" | "plan",
      cutoff: typeof through | "before-last" = through) => source.transaction(() => {
      const prefix = archivePrefixMetadata(source, lane.at, through, PROPOSED_BOUNDS, budget, new Set([base.digest]), initial);
      const support = policies.get(base.digest)!.support;
      const admitted = archivePrivacyMetadata(source, prefix, support, budget);
      const references = new ArchiveLocalReferences(support, PROPOSED_BOUNDS, budget);
      // Observe original comparison charges only; every call still executes
      // the real fence on this same native ledger, including failures.
      const fence = new class extends ArchivePlanFence {
        comparisonMetadata = 0;
        comparisonInputWork = 0;
        record(read: () => void): void {
          const before = budget.admitted();
          try { read(); } finally {
            const after = budget.admitted();
            this.comparisonMetadata += after.metadata - before.metadata;
            this.comparisonInputWork += after.inputWork - before.inputWork;
          }
        }
        override start(prefix: Parameters<ArchivePlanFence["start"]>[0], allowance: ArchiveBudget): void {
          this.record(() => super.start(prefix, allowance));
        }
        override check(position: Parameters<ArchivePlanFence["check"]>[0], plan: Parameters<ArchivePlanFence["check"]>[1]): void {
          this.record(() => super.check(position, plan));
        }
      }(prefix, budget);
      budget.spend({ metadata: 256, inputWork: 512 });
      const paths = new Set<string>();
      const retain = (key: RetainedKey) => {
        const beforePass = budget.admitted(), pass = readRetainedArchivePass(source, key, budget), afterPass = budget.admitted();
        expect(Object.fromEntries(Object.keys(afterPass).map(axis => [axis,
          afterPass[axis as keyof ArchiveCost] - beforePass[axis as keyof ArchiveCost]]))).toEqual(forecastArchiveRetainedPass());
        if (pass !== null && pass < initial.seq + 1) return;
        budget.spend({ metadata: 2048, inputWork: 4096 });
        paths.add(journalV2RetainedPath(initial.seq + 1, key));
      };
      let borrowed: ArchiveLocalReferencePlan | undefined;
      for (const position of admitted.positions) {
        const plan = references.read(source, lane.at, position);
        borrowed = plan;
        if (damage === "plan" && position.seq === through.seq) expect(plan.dependencies.length).toBeGreaterThan(0);
        fence.append(damage === "position" && position.seq === initial.seq + 1 ? { ...position, hash: textDigest("TEST incorrect forecast footprint") } : position,
          damage === "plan" && position.seq === through.seq ? { ...plan, dependencies: [] } : plan);
        for (const { dependency } of plan.dependencies) {
          if (dependency.mode === "required") retain(dependency.key);
          else if (dependency.mode === "probe") for (const choice of dependency.choices) retain(choice.key);
        }
      }
      const prior = admitted.positions.at(-2)!;
      const selectedThrough = cutoff === "before-last" ? { seq: prior.seq, hash: prior.hash } : cutoff;
      const comparison = fence.comparisonCost(selectedThrough), beforeSeal = budget.admitted();
      fence.seal(selectedThrough);
      expect(budget.admitted().inputWork).toBeGreaterThanOrEqual(beforeSeal.inputWork);
      return { fence, positions: admitted.positions, borrowed, paths, comparison, through: selectedThrough };
    });
    for (const damage of ["position", "plan"] as const) {
      const budget = new ArchiveBudget(); let entryBodies = 0, payloadQueries = 0;
      const tracked: Sql = { transaction: exact.transaction, exec(query, ...args) {
        if (query.startsWith("SELECT bytes FROM entry ")) entryBodies++;
        if ((query.includes("FROM retained_input ") && args[0] !== "definition") || query.includes("FROM retained_value ")) payloadQueries++;
        return exact.exec(query, ...args);
      } };
      const held = forecast(tracked, budget, damage); entryBodies = 0; payloadQueries = 0;
      const refused = inventoryArchive(tracked, lane.at, through, PROPOSED_BOUNDS, policies, budget, undefined, initial, held.fence);
      expect(refused).toEqual({ ok: false, reason: "mismatch" });
      if (damage === "position") expect(entryBodies).toBe(0);
      else expect(entryBodies).toBeGreaterThan(0);
      expect(payloadQueries).toBe(0);
    }
    // Later metadata was already inspected and paid. Choose an earlier
    // whole prefix, then perform fresh native admission and comparisons.
    const smallerBudget = new ArchiveBudget(), smaller = forecast(exact, smallerBudget, undefined, "before-last");
    const beforeSmaller = smallerBudget.admitted();
    const smallerInventory = inventoryArchive(exact, lane.at, smaller.through, PROPOSED_BOUNDS, policies, smallerBudget, undefined, initial, smaller.fence);
    expect(smallerInventory.ok, JSON.stringify(smallerInventory)).toBe(true);
    expect(smallerBudget.admitted().metadata).toBeGreaterThan(beforeSmaller.metadata);
    expect(smaller.fence.comparisonMetadata).toBe(smaller.comparison.metadata);
    expect(smaller.fence.comparisonInputWork).toBe(smaller.comparison.inputWork);
    const budget = new RecordingInventoryBudget(); recording = budget;
    const prepared = await prepareJournalPass({ format: "sha1", at: lane.at, after: initial, parent, budget });
    expect(prepared.ok, JSON.stringify(prepared)).toBe(true); if (!prepared.ok) return { value: prepared, queried };
    // The actual projection frame closes before parent I/O. This remains
    // a four-entry fixture, not an adaptive cutoff or host-send witness.
    const held = forecast(exact, budget);
    prepared.preparation.work.metadata(256);
    const grouping = new ArchiveSegmentCursor(64 * 1024 * 1024);
    for (const row of held.positions) {
      const firstSegment = grouping.append(row.seq, row.bytes);
      if (firstSegment !== null) await prepared.preparation.prepare([journalV2SegmentPath(prepared.preparation.first, firstSegment)]);
    }
    for (const path of held.paths) await prepared.preparation.prepare([path]);
    // The caller still has this reference after parent awaits. It cannot
    // change the captured forecast through a borrowed dependency array.
    try { (held.borrowed!.dependencies as unknown[]).length = 0; } catch { /* Frozen metadata. */ }
    const attributed = prepared.preparation.metadataCost();
    const value = await planArchivePass(exact, { at: lane.at, through, after: initial, bounds: PROPOSED_BOUNDS,
      policies, format: "sha1", parent, markedAt: at(1), preparation: prepared.preparation, forecast: held.fence }, budget);
    if (value.ok) {
      expect(held.comparison).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 43432, inputWork: 118976 });
      expect([held.fence.comparisonMetadata, held.fence.comparisonInputWork]).toEqual([43432, 118976]);
      expect(attributed.nodes).toBeGreaterThan(0);
      expect(value.archive.cost.nodes).toBe(value.archive.selection.inventoryCost.nodes + attributed.nodes);
      expect(budget.admitted()).toEqual(value.archive.cost);
      expect(prepared.preparation.metadataCost()).toEqual(attributed); // Payload work was not attributed.
    }
    return { value, queried, comparison: { metadata: held.fence.comparisonMetadata, inputWork: held.fence.comparisonInputWork }, entryReads, finalRead };
  });
  (context.task.meta as Record<string, unknown>)["archivePlanFenceComparison"] = { cost: planned.comparison,
    qualification: "Actual native SQLite fresh inventory invokes the original plan fence start/check methods on the same original budget as metadata preparation and build. Test subclass only observes exact super calls. Genuine native prepared-rule input; TESTpolicy/authority/manual component receipt. No host, adaptive cutoff, export or full-pass claim." };
  (context.task.meta as Record<string, unknown>)["archiveInventoryFixedCost"] = { entryReads: planned.entryReads, finalRead: planned.finalRead,
    qualification: "Observed exact original spend spans before real native inventory entry queries and the final pin/cutoff fence. Same original preparation/build ledger, no second budget or skipped validation. Genuine SQLite/turns/prepared rule, TESTpolicy/authority/manual component receipt, no host/adaptive/export/full-pass claim." };
  expect(planned.entryReads?.map(row => row.bytes)).toEqual([1551, 1552, 1876, 2296]);
  expect(planned.entryReads?.map(row => row.cost.inputWork)).toEqual([51183, 51216, 61908, 75768]);
  for (const read of planned.entryReads ?? []) expect(forecastArchiveInventoryEntry(read.bytes as number)).toEqual(read.cost);
  expect(planned.finalRead).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 4, metadata: 52352, inputWork: 121984 });
  expect(forecastArchiveInventoryFinal(true)).toEqual(planned.finalRead);
  const next = planned.value;
  expect(next.ok, JSON.stringify(next)).toBe(true); if (!next.ok) return;
  expect(planned.queried.length).toBeGreaterThan(0);
  expect(planned.queried.every(position => typeof position === "number" && position > initial.seq)).toBe(true);
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
    // A lowered test ceiling equal to the initial pass's measured nodes
    // detects charging the same preparation twice on restart.
    return rebuildArchivePass(exact, row, parent, new ArchiveBudget({ nodes: next.archive.cost.nodes }));
  });
  expect(rebuilt.ok, JSON.stringify(rebuilt)).toBe(true); if (!rebuilt.ok) return;
  expect(rebuilt.archive.commit).toBe(next.archive.commit);
  expect(rebuilt.archive.objects).toEqual(next.archive.objects);
  expect(rebuilt.archive.cost.nodes).toBe(next.archive.cost.nodes);
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
