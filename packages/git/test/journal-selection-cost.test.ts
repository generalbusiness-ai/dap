/** Mechanical descriptive metadata only. No native inventory, retained
 * consumer truth, privacy, judgment, confirmation or export is claimed. */
import { expect, test } from "vitest";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { ArchiveBudget, type ArchiveCost } from "../../scope/src/archive-budget.ts";
import { journalKeyName, journalOrdered, journalPassSelection } from "../src/journal-selection.ts";
import { forecastJournalSelection, journalOrderingInputWork, JOURNAL_SELECTION_BYTES } from "../src/journal-selection-cost.ts";
import { JournalWork } from "../src/journal-work.ts";
import { syntheticJournal } from "./support/journal.ts";

const difference = (after: ArchiveCost, before: ArchiveCost): ArchiveCost => Object.fromEntries(
  Object.keys(after).map(key => [key, after[key as keyof ArchiveCost] - before[key as keyof ArchiveCost]]),
) as ArchiveCost;

test("selection parsing and byte ordering keep their original charged work", () => {
  const fixture = syntheticJournal(3), budget = new ArchiveBudget({}, () => 0), work = new JournalWork(budget);
  const objects = structuredClone(fixture.description.objects).map(object => ({ ...object, pass: 0 }));
  objects.push(structuredClone(objects[0]!));
  objects[1]!.consumers.push(structuredClone(objects[1]!.consumers[0]!));
  const omitted = { ...fixture.description.omittedTexts[0]!, bytes: 7 };
  budget.spend({ entries: 3, attempts: 2 });
  const bytes = canonicalize({ ...fixture.description, format: "artroom-local-inventory-2", after: null,
    objects, omittedTexts: [omitted, structuredClone(omitted)], cost: budget.admitted() });
  const before = budget.admitted(), selected = journalPassSelection(bytes, work), after = budget.admitted();
  const names = ["a", "雪", "🙂", "q\"\\", "\u0001"];
  const orderedBefore = budget.admitted(), ordered = journalOrdered(names, value => value, work), orderedAfter = budget.admitted();
  expect(selected.objects).toHaveLength(2); expect(selected.omitted).toHaveLength(1);
  expect(ordered).toHaveLength(names.length);
  const groups = [...selected.objects, ...selected.omitted].map(row => ({ rows: row.consumers.length,
    utf8Bytes: row.consumers.reduce((n, consumer) => n + utf8(consumer.description).length, 0) }));
  const objectBytes = selected.objects.reduce((n, row) => n + utf8(journalKeyName(row.key)).length, 0);
  const omissionBytes = selected.omitted.reduce((n, row) => n + utf8(journalKeyName(row)).length, 0);
  const shape = { codeUnits: bytes.length, utf8Bytes: utf8(bytes).length, measuredOmissions: 2,
    orderingInputWork: journalOrderingInputWork(objectBytes, selected.objects.length)
      + journalOrderingInputWork(omissionBytes, selected.omitted.length)
      + groups.reduce((n, group) => n + journalOrderingInputWork(group.utf8Bytes, group.rows), 0) };
  // Recorded with the original parser before extraction. Duplicate raw
  // omissions are charged; duplicate consumers are normalized for ordering.
  const original = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 11879, inputWork: 107581 };
  expect(difference(orderedAfter, orderedBefore)).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 60 });
  expect(difference(after, before)).toEqual(original);
  expect(shape).toEqual({ codeUnits: 3789, utf8Bytes: 3789, measuredOmissions: 2, orderingInputWork: 4766 });
  expect(forecastJournalSelection(shape)).toEqual({ ok: true, cost: original });
  // Both wire limits remain independent of the work allowance.
  expect(forecastJournalSelection({ ...shape, codeUnits: JOURNAL_SELECTION_BYTES + 1, utf8Bytes: JOURNAL_SELECTION_BYTES + 1 }))
    .toEqual({ ok: false, reason: "limit" });
  expect(forecastJournalSelection({ ...shape, codeUnits: JOURNAL_SELECTION_BYTES / 2 + 1, utf8Bytes: JOURNAL_SELECTION_BYTES + 1 }))
    .toEqual({ ok: false, reason: "limit" });
});
