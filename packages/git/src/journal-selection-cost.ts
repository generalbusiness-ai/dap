/** Pure work arithmetic for descriptive selection metadata. No records,
 * policy, consumers or bodies are validated or admitted by this module. */
import { natural } from "@generalbusiness/dap-bytes";
import { refuseJournal, type JournalCost } from "./journal-work.ts";

export const JOURNAL_SELECTION_BYTES = 1024 * 1024;
export const JOURNAL_MEASURED_OMISSION_METADATA = 256;
export function journalSelectionJSONReservation(codeUnits: number): { readonly metadata: number; readonly inputWork: number } {
  return { metadata: codeUnits * 3, inputWork: codeUnits * 3 * 8 };
}
export const journalOrderingInputWork = (utf8Bytes: number, rows: number): number =>
  utf8Bytes * (Math.ceil(Math.log2(rows + 1)) + 2);

/** Scalar upper bounds derived by the owning native metadata planner.
 * The ordering total includes top-level keys, per-key consumer descriptions
 * and foreign-source keys, each priced with journalOrderingInputWork.
 * Raw measured omissions include duplicates before parser normalization. */
export interface JournalSelectionFootprint {
  readonly codeUnits: number;
  readonly utf8Bytes: number;
  readonly measuredOmissions: number;
  readonly orderingInputWork: number;
}
export type JournalSelectionForecast = { readonly ok: true; readonly cost: Readonly<JournalCost> }
  | { readonly ok: false; readonly reason: "limit" };

/** Future parser charges only. This is neither a serialization validator
 * nor a reservation, allowance or complete native-pass cost forecast. */
export function forecastJournalSelection(shape: JournalSelectionFootprint): JournalSelectionForecast {
  const { codeUnits, utf8Bytes, measuredOmissions, orderingInputWork } = shape;
  if (![codeUnits, utf8Bytes, measuredOmissions, orderingInputWork].every(natural) || utf8Bytes < codeUnits) return refuseJournal("input");
  if (codeUnits > JOURNAL_SELECTION_BYTES || utf8Bytes > JOURNAL_SELECTION_BYTES || measuredOmissions > 8192) return { ok: false, reason: "limit" };
  const json = journalSelectionJSONReservation(codeUnits);
  const metadata = json.metadata + measuredOmissions * JOURNAL_MEASURED_OMISSION_METADATA;
  const inputWork = metadata + json.inputWork + orderingInputWork;
  if (!natural(metadata) || !natural(inputWork)) return refuseJournal("input");
  return { ok: true, cost: Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata, inputWork }) };
}
