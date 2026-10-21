/** Shared writer arithmetic only. These numbers do not reserve work or
 * validate a payload; actual construction still charges the original work. */
import type { JournalObjectType } from "./journal-objects.ts";

export function journalObjectReservation(type: JournalObjectType, size: number): { readonly outputWork: number; readonly metadata: number; readonly inputWork: number } {
  const bytes = `${type} ${size}\0`.length + size;
  return { outputWork: bytes, metadata: 256, inputWork: bytes * 3 };
}
export const journalTreeRowMetadata = (rows: number): number => rows * 512;
export const journalResultMetadata = (objects: number): number => objects * 64;
