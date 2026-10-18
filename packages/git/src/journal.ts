/** Pure internal archive composition. No local process or Replay dependency. */
export { buildJournalArchive, type JournalArchive, type JournalLayoutResult, type JournalInputSource } from "./journal-layout.ts";
export { JOURNAL_SELECTION_BYTES, journalSelection, type JournalSelection } from "./journal-selection.ts";
export { JournalWork, type JournalBudget, type JournalCost } from "./journal-work.ts";
export type { JournalFormat, JournalObjectSource } from "./journal-objects.ts";
