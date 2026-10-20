/** Stable pass-owned paths. No cumulative set or relocation decision. */
import { archiveRetainedPath, retainedOfArchivePath, type ArchiveRetainedName } from "./journal-path.ts";
import { refuseJournal } from "./journal-work.ts";

export const JOURNAL_V2_LAST_POSITION = 999_999_999_999;
export function journalV2Position(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0) || value > JOURNAL_V2_LAST_POSITION) return refuseJournal("limit");
  return String(value).padStart(12, "0");
}
function directory(value: number): string {
  const digits = journalV2Position(value);
  return `${digits.slice(0, 3)}/${digits.slice(3, 6)}/${digits.slice(6, 9)}/${digits}`;
}
export function journalV2PassPath(first: number): string { return `journal/v2/passes/${directory(first)}.json`; }
export function journalV2SegmentPath(first: number): string { return `journal/v2/segments/${directory(first)}.jsonl`; }
export function journalV2RetainedPath(first: number, key: ArchiveRetainedName): string {
  return `journal/v2/retained/${directory(first)}/${archiveRetainedPath(key).slice("journal/v1/retained/".length)}`;
}
export type JournalV2Path = { readonly kind: "head" } | { readonly kind: "pass" | "segment"; readonly first: number }
  | { readonly kind: "retained"; readonly first: number; readonly key: ArchiveRetainedName };
/** No alternate padding, misplaced directory or extra component is accepted. */
export function readJournalV2Path(path: string): JournalV2Path | null {
  if (path === "journal/v2/head.json") return { kind: "head" };
  if (typeof path !== "string" || path.length > 1024) return null;
  const match = /^journal\/v2\/(passes|segments|retained)\/([0-9]{3})\/([0-9]{3})\/([0-9]{3})\/([0-9]{12})(.*)$/.exec(path);
  if (!match) return null;
  const [, family, a, b, c, digits, suffix] = match;
  if (a !== digits!.slice(0, 3) || b !== digits!.slice(3, 6) || c !== digits!.slice(6, 9)) return null;
  const first = Number(digits);
  if (family === "passes") return suffix === ".json" ? { kind: "pass", first } : null;
  if (family === "segments") return suffix === ".jsonl" ? { kind: "segment", first } : null;
  const key = retainedOfArchivePath(`journal/v1/retained${suffix}`);
  return key ? { kind: "retained", first, key } : null;
}
