import { expect, test } from "vitest";
import { journalSelection } from "../src/journal-selection.ts";
import { JournalWork } from "../src/journal-work.ts";
import { forecastArchiveEntryPrivacy } from "../../scope/src/archive-entry-privacy-cost.ts";
import { described, syntheticJournal } from "./support/journal.ts";

// Descriptive metadata and scalar pricing only. This synthetic selection
// supplies no native floor judgment, privacy admission or archive custody.
test("floor consumer metadata can cross the archive boundary while unknown inputs fail closed", () => {
  const fixture = syntheticJournal(2);
  const consumer = fixture.description.objects[1]!.consumers[0] as { origin: { input: string } };
  consumer.origin.input = "floor";
  const chosen = described(fixture);
  expect(journalSelection(chosen.selection, new JournalWork(chosen.budget)).objects
    .flatMap(object => object.consumers).some(reason => reason.origin.input === "floor")).toBe(true);
  expect(forecastArchiveEntryPrivacy({ input: "floor", effects: 0 })).toEqual({ ok: true,
    cost: { entries: 0, attempts: 0, nodes: 0, calls: 1, metadata: 512, inputWork: 512 } });
  consumer.origin.input = "unreviewed-input";
  const unknown = described(fixture);
  expect(() => journalSelection(unknown.selection, new JournalWork(unknown.budget))).toThrow("journal-layout-input");
  expect(() => forecastArchiveEntryPrivacy({ input: "unreviewed-input" as never, effects: 0 })).toThrow("archive-unavailable");
});
