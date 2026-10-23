/** Mechanical Git layout only. Test-authored selected descriptors do not
 * establish native admission, history, receipts, confirmation or export. */
import { expect, test } from "vitest";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget, type ArchiveCost } from "../../scope/src/archive-budget.ts";
import { buildJournalPass } from "../src/journal-v2-layout.ts";
import { prepareJournalPass } from "../src/journal-v2-preparation.ts";
import { journalKeyName, journalPassSelection } from "../src/journal-selection.ts";
import { forecastJournalSelection, journalOrderingInputWork } from "../src/journal-selection-cost.ts";
import { forecastJournalCommit } from "../src/journal-commit-cost.ts";
import { forecastJournalPassBody } from "../src/journal-pass-cost.ts";
import { manifestOfPass } from "../src/journal-v2-manifest.ts";
import { journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath } from "../src/journal-v2-path.ts";
import { selectedInput, syntheticJournal } from "./support/journal.ts";

test("future Git layout stages cover the actual finish on the same original budget", async context => {
  const fixture = syntheticJournal(3), calls: string[] = [], budget = new ArchiveBudget();
  budget.spend({ entries: 3, attempts: 2 });
  const wire = canonicalize({ ...fixture.description, format: "artroom-local-inventory-2", after: null,
    objects: fixture.description.objects.map(row => ({ ...row, pass: 0 })), cost: budget.admitted() });
  const opened = await prepareJournalPass({ format: "sha1", at: fixture.at, after: null, parent: null, budget });
  expect(opened.ok, JSON.stringify(opened)).toBe(true); if (!opened.ok) return;
  const preparation = opened.preparation, work = preparation.work;
  // Actual descriptive parser and manifest operate on test metadata only.
  // Their scout charges stay spent; finish will pay for them again.
  const selected = journalPassSelection(wire, work), manifest = canonicalize(manifestOfPass(selected, "sha1", null, work));
  const head = canonicalize({ v: 2, scope: fixture.at, through: selected.through.seq, hash: selected.through.hash });
  const entryBytes = selected.entries.reduce((n, row) => n + row.bytes, 0), segmentBytes = entryBytes + selected.entries.length - 1;
  const paths = [{ path: "journal/v2/head.json", bytes: utf8(head).length },
    { path: journalV2PassPath(0), bytes: utf8(manifest).length },
    { path: journalV2SegmentPath(0), bytes: segmentBytes },
    ...selected.objects.map(row => ({ path: journalV2RetainedPath(0, row.key), bytes: row.bytes }))];
  await preparation.prepare(paths.slice(2).map(row => row.path));
  const patch = preparation.forecast(paths);
  expect(patch.ok).toBe(true); if (!patch.ok) return;
  const objects = [...selected.objects, ...selected.omitted];
  const ordering = journalOrderingInputWork(selected.objects.reduce((n, row) => n + utf8(journalKeyName(row.key)).length, 0), selected.objects.length)
    + journalOrderingInputWork(selected.omitted.reduce((n, row) => n + utf8(journalKeyName(row)).length, 0), selected.omitted.length)
    + objects.reduce((n, row) => n + journalOrderingInputWork(row.consumers.reduce((m, consumer) => m + utf8(consumer.description).length, 0), row.consumers.length), 0);
  const parser = forecastJournalSelection({ codeUnits: wire.length, utf8Bytes: utf8(wire).length, measuredOmissions: 0, orderingInputWork: ordering });
  expect(parser.ok).toBe(true); if (!parser.ok) return;
  const shape = { entries: selected.entries.length, entryBytes,
    origins: objects.reduce((n, row) => n + row.consumers.length, selected.ancestryUnwalked.length),
    newRetained: selected.objects.length, retainedNameUnits: selected.objects.reduce((n, row) => n + journalKeyName(row.key).length, 0),
    retainedBytes: selected.objects.reduce((n, row) => n + row.bytes, 0), manifestRows: objects.length, selectionUnits: wire.length };
  const commit = forecastJournalCommit("sha1", false, 1_700_000_002);
  const forecast = forecastJournalPassBody(shape);
  expect(forecast.ok).toBe(true); if (!forecast.ok) return;
  expect(calls).toEqual([]); // Every forecast precedes source payload reads.
  const before = budget.admitted(), built = await buildJournalPass({ format: "sha1", selection: wire,
    input: selectedInput(fixture, calls), parent: null, budget, preparation });
  expect(built.ok, JSON.stringify(built)).toBe(true); if (!built.ok) return;
  const after = budget.admitted(), delta = Object.fromEntries(Object.keys(after).map(key => [key,
    after[key as keyof ArchiveCost] - before[key as keyof ArchiveCost]])) as ArchiveCost;
  (context.task.meta as Record<string, unknown>)["sharedPassFinishGeometry"] = { delta, patch: patch.cost,
    parser: parser.cost, body: forecast.cost, commit: commit.cost, qualification: "New f651 physical path geometry only; original per-unit fees unchanged, no native admission/export." };
  // The body receipt predates fee extraction and stays unchanged. The
  // total is a separately measured shared-pass geometry receipt; the old
  // layout total is preserved in closed evidence, not silently repriced.
  expect(shape).toEqual({ entries: 3, entryBytes: 1874, origins: 3, newRetained: 2,
    retainedNameUnits: 164, retainedBytes: 48, manifestRows: 3, selectionUnits: 2347 });
  expect(delta).toEqual({ entries: 0, attempts: 2, nodes: 0, calls: 5, metadata: 34158, inputWork: 156777 });
  expect(forecast.cost).toEqual({ entries: 0, attempts: 2, nodes: 0, calls: 5, metadata: 11241, inputWork: 59803 });
  expect(forecast.layoutWork).toEqual({ outputWork: 1876 });
  const stages = [parser.cost, forecast.cost, patch.cost, commit.cost];
  expect(Object.fromEntries(Object.keys(delta).map(key => [key,
    stages.reduce((n, row) => n + row[key as keyof ArchiveCost], 0)]))).toEqual(delta);
  expect(calls).toHaveLength(5);
});
