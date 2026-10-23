/** Mechanical selected descriptors over real Git objects/entry bytes.
 * No native admission, archive receipt, remote confirmation or export. */
import { expect, test } from "vitest";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget, type ArchiveCost } from "../../scope/src/archive-budget.ts";
import { buildJournalPass } from "../src/journal-v2-layout.ts";
import { prepareJournalPass } from "../src/journal-v2-preparation.ts";
import { verifyJournalAppend } from "../src/journal-v2-append.ts";
import { journalV2PassPath, journalV2SegmentPath } from "../src/journal-v2-path.ts";
import type { JournalObject } from "../src/journal-objects.ts";
import { selectedInput, syntheticJournal } from "./support/journal.ts";
import { forecastJournalAppendFixed } from "../src/journal-append-cost.ts";

test("append forecasts charge repeated head walks and old and new changed edges", async context => {
  const fixture = syntheticJournal(4), setup = new ArchiveBudget();
  setup.spend({ entries: 3, attempts: 2 });
  const oldHead = { seq: 2, hash: fixture.description.entries[2]!.hash };
  const initial = await buildJournalPass({ format: "sha1", selection: canonicalize({ ...fixture.description,
    format: "artroom-local-inventory-2", after: null, through: oldHead, entries: fixture.description.entries.slice(0, 3),
    objects: fixture.description.objects.map(row => ({ ...row, pass: 0 })), cost: setup.admitted() }),
    input: selectedInput(fixture), parent: null, budget: setup });
  expect(initial.ok, JSON.stringify(initial)).toBe(true); if (!initial.ok) return;
  const held = new Map<string, JournalObject>(initial.archive.objects.map(row => [row.id, row]));
  const reads: string[] = [], source = { object: async (id: string, maximum: number) => {
    reads.push(id); const row = held.get(id);
    return row ? { type: row.type, size: row.data.length, data: row.data.length <= maximum ? row.data : null } : null;
  } };
  const parent = { id: initial.archive.commit, source }, budget = new ArchiveBudget();
  budget.spend({ entries: 1 });
  const nextHead = { seq: 3, hash: fixture.description.entries[3]!.hash };
  const selection = canonicalize({ ...fixture.description, format: "artroom-local-inventory-2", after: oldHead,
    entries: fixture.description.entries.slice(3), objects: [], omittedTexts: [], cost: budget.admitted() });
  const opened = await prepareJournalPass({ format: "sha1", at: fixture.at, after: oldHead, parent, budget });
  expect(opened.ok, JSON.stringify(opened)).toBe(true); if (!opened.ok) return;
  const preparation = opened.preparation;
  await preparation.prepare([journalV2SegmentPath(3)]);
  const manifest = canonicalize({ v: 2, through: nextHead, parent: parent.id, format: "sha1", entries: [3, 3], retained: [], omitted: [] });
  const head = canonicalize({ v: 2, scope: fixture.at, through: nextHead.seq, hash: nextHead.hash });
  const readBefore = reads.length;
  const sizes = [{ path: "journal/v2/head.json", bytes: utf8(head).length },
    { path: journalV2PassPath(3), bytes: utf8(manifest).length },
    { path: journalV2SegmentPath(3), bytes: fixture.description.entries[3]!.bytes }];
  // A getter must not rewrite the scalar used by a later forecast stage.
  const borrowed = sizes.map(row => {
    let reads = 0;
    return { path: row.path, get bytes() { return ++reads === 1 ? row.bytes : 0; } };
  });
  const forecast = preparation.forecast(borrowed);
  expect(forecast.ok).toBe(true); if (!forecast.ok) return;
  expect(reads.length).toBe(readBefore);
  const edges = forecast.appendEdges;
  expect(edges?.ok).toBe(true); if (!edges?.ok) return;
  // Sizes pinned from the original validator, not returned by new prices.
  const fixed = forecastJournalAppendFixed({ oldCommitBytes: 199, newCommitBytes: 247, oldHeadBytes: 232, newHeadBytes: 232 });
  expect(fixed.ok).toBe(true); if (!fixed.ok) return;
  const built = await buildJournalPass({ format: "sha1", selection, input: selectedInput(fixture), parent, budget, preparation });
  expect(built.ok, JSON.stringify(built)).toBe(true); if (!built.ok) return;
  for (const row of built.archive.objects) held.set(row.id, row);
  reads.length = 0;
  const before = budget.admitted();
  expect(await verifyJournalAppend({ format: "sha1", at: fixture.at, old: parent.id, commit: built.archive.commit, source, budget })).toEqual({ ok: true });
  const after = budget.admitted(), delta = Object.fromEntries(Object.keys(after).map(key => [key,
    after[key as keyof ArchiveCost] - before[key as keyof ArchiveCost]])) as ArchiveCost;
  (context.task.meta as Record<string, unknown>)["sharedPassAppendGeometry"] = { delta, edges: edges.cost, fixed: fixed.cost,
    objectReads: reads.length, distinctReadIds: new Set(reads).size,
    qualification: "New f651 physical path geometry only, original append-validator fees unchanged. Mechanical selected metadata, not native receipts/export." };
  expect([held.get(parent.id)!.data.length, held.get(built.archive.commit)!.data.length,
    utf8(canonicalize({ v: 2, scope: fixture.at, through: oldHead.seq, hash: oldHead.hash })).length, utf8(head).length])
    .toEqual([199, 247, 232, 232]);
  // Separately measured shared-pass geometry; original per-unit fees and
  // the fixed receipt above remain unchanged. Old layout evidence is kept.
  expect(delta).toEqual({ entries: 0, attempts: 32, nodes: 16, calls: 64, metadata: 24304, inputWork: 47876 });
  expect([reads.length, new Set(reads).size]).toEqual([64, 25]);
  expect(Object.fromEntries(Object.keys(delta).map(key => [key,
    edges.cost[key as keyof ArchiveCost] + fixed.cost[key as keyof ArchiveCost]]))).toEqual(delta);
  const upper = forecastJournalAppendFixed();
  expect(upper.ok).toBe(true); if (!upper.ok) return;
  expect(upper.cost).toEqual({ entries: 0, attempts: 4, nodes: 0, calls: 8, metadata: 6656, inputWork: 46080 });
  expect(upper.cost.metadata).toBeGreaterThan(fixed.cost.metadata);
  expect(upper.cost.inputWork).toBeGreaterThan(fixed.cost.inputWork);
});
