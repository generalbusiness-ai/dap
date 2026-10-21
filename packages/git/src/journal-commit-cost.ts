/** Commit construction and its extra row in the final objects() exposure.
 * Scalar future work only: no object bytes, validation credit or allowance. */
import { JOURNAL_IDENTITY, JOURNAL_LAST_SECOND, JOURNAL_MESSAGE, journalFormat, type JournalFormat } from "./journal-objects.ts";
import { journalObjectReservation, journalResultMetadata } from "./journal-object-cost.ts";
import { refuseJournal, type JournalCost } from "./journal-work.ts";

export interface JournalCommitForecast {
  readonly cost: Readonly<JournalCost>;
  readonly layoutWork: { readonly objects: 1; readonly outputWork: number; readonly objectBytes: number };
}

/** Complements a tree-patch forecast, which already prices its own result
 * rows. Unknown future entry time uses the largest supported timestamp.
 * This does not price parent reads, transport or append validation. */
export function forecastJournalCommit(format: JournalFormat, hasParent: boolean, seconds = JOURNAL_LAST_SECOND): JournalCommitForecast {
  journalFormat(format);
  if (typeof hasParent !== "boolean") return refuseJournal("input");
  if (!Number.isSafeInteger(seconds) || seconds < 0 || Object.is(seconds, -0) || seconds > JOURNAL_LAST_SECOND) return refuseJournal("timestamp");
  const width = format === "sha1" ? 40 : 64;
  // All commit headers, identity and message characters are ASCII.
  const identity = JOURNAL_IDENTITY.length + String(seconds).length + 7;
  const body = 6 + width + (hasParent ? 8 + width : 0) + identity * 2 + 20 + JOURNAL_MESSAGE.length;
  const make = journalObjectReservation("commit", body), metadata = make.metadata + journalResultMetadata(1);
  return Object.freeze({
    cost: Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata, inputWork: metadata + make.inputWork }),
    layoutWork: Object.freeze({ objects: 1 as const, outputWork: make.outputWork, objectBytes: body }),
  });
}
