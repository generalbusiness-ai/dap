/** Stable pass-owned paths. No cumulative set or relocation decision. */
import { archiveRetainedPath, domainOfArchiveSegment, retainedOfArchivePath, type ArchiveRetainedName } from "./journal-path.ts";
import { refuseJournal } from "./journal-work.ts";

export const JOURNAL_V2_LAST_POSITION = 999_999_999_999;
export function journalV2Position(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0) || value > JOURNAL_V2_LAST_POSITION) return refuseJournal("limit");
  return String(value).padStart(12, "0");
}
function directory(value: number): string {
  const digits = journalV2Position(value);
  return `${digits.slice(0, 10).match(/../g)!.join("/")}/${digits}`;
}
const passDirectory = (first: number): string => `journal/v2/passes/${directory(first)}/`;
export function journalV2PassPath(first: number): string { return `${passDirectory(first)}pass.json`; }
export function journalV2SegmentPath(pass: number, first = pass): string {
  const position = journalV2Position(first);
  if (first < pass) return refuseJournal("tree");
  return `${passDirectory(pass)}${position}.jsonl`;
}
export function journalV2RetainedPath(first: number, key: ArchiveRetainedName): string {
  return `${passDirectory(first)}${archiveRetainedPath(key).slice("journal/v1/retained/".length)}`;
}
export type JournalV2Path = { readonly kind: "head" } | { readonly kind: "pass"; readonly first: number }
  | { readonly kind: "segment"; readonly first: number; readonly pass: number }
  | { readonly kind: "retained"; readonly first: number; readonly key: ArchiveRetainedName };

/** Directory syntax and pre-I/O bounds for the shared pass layout. Numeric
 * trees have at most100 names. The pass's own segment/kind names and its
 * retained trees have their separate original file/retained bounds. */
export function journalV2Directory(prefix: string): { readonly kind: "fixed" | "numeric" | "pass" | "retained";
  readonly maximum: number; readonly bytes: number } | null {
  if (prefix === "" || prefix === "journal/") return { kind: "fixed", maximum: 1, bytes: 295 };
  if (prefix === "journal/v2/") return { kind: "fixed", maximum: 2, bytes: 2 * 295 };
  if (typeof prefix !== "string" || prefix.length > 1024 || !prefix.startsWith("journal/v2/passes/") || !prefix.endsWith("/")) return null;
  const tail = prefix.slice("journal/v2/passes/".length, -1), parts = tail ? tail.split("/") : [];
  if (parts.slice(0, Math.min(parts.length, 5)).some(part => !/^[0-9]{2}$/.test(part))) return null;
  if (parts.length <= 5) return { kind: "numeric", maximum: 100, bytes: 100 * (parts.length === 5 ? 51 : 41) };
  const first = parts[5]!;
  if (!/^[0-9]{12}$/.test(first) || parts.slice(0, 5).join("") !== first.slice(0, 10)) return null;
  if (parts.length === 6) return { kind: "pass", maximum: 4096, bytes: 4096 * 58 };
  const kind = parts[6];
  if (parts.length === 7 && ["definition", "entry", "rule", "snapshot"].includes(kind!)) return { kind: "retained", maximum: 512, bytes: 512 * 104 };
  if (kind === "value") {
    if (parts.length === 7) return { kind: "retained", maximum: 512, bytes: 512 * 295 };
    if (parts.length === 8 && domainOfArchiveSegment(parts[7]) !== null) return { kind: "retained", maximum: 512, bytes: 512 * 104 };
  }
  return null;
}
/** No alternate padding, misplaced directory or extra component is accepted. */
export function readJournalV2Path(path: string): JournalV2Path | null {
  if (path === "journal/v2/head.json") return { kind: "head" };
  if (typeof path !== "string" || path.length > 1024) return null;
  const match = /^journal\/v2\/passes\/((?:[0-9]{2}\/){5})([0-9]{12})\/(.+)$/.exec(path);
  if (!match) return null;
  const [, pairs, digits, suffix] = match;
  if (pairs!.replaceAll("/", "") !== digits!.slice(0, 10)) return null;
  const first = Number(digits);
  if (suffix === "pass.json") return { kind: "pass", first };
  const segment = /^([0-9]{12})\.jsonl$/.exec(suffix!);
  if (segment) return Number(segment[1]) < first ? null : { kind: "segment", pass: first, first: Number(segment[1]) };
  const key = retainedOfArchivePath(`journal/v1/retained/${suffix}`);
  return key ? { kind: "retained", first, key } : null;
}
