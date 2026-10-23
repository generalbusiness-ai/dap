/** Internal archive grouping only. No inventory, privacy decision or export is performed. */
import { canonicalize, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { archiveSegmentPath } from "./journal-path.ts";
import { GitRefusal } from "./names.ts";

export const ARCHIVE_OBJECT_BYTES = 8 * 1024 * 1024;
const SEGMENT_LINES = 1000;
const DIRECTORY_NAMES = 4096;

export interface ArchiveLine { readonly seq: number; readonly bytes: string }
export interface ArchiveSegment { readonly first: number; readonly last: number; readonly path: string; readonly bytes: Uint8Array }

/** Scalar grouping only, not a claim about the bytes or their admission.
 * Native callers reserve this fixed state before allocation. Failed adds
 * leave the cursor unchanged so an already selected prefix can finish. */
export class ArchiveSegmentCursor {
  readonly #allowance: number;
  #last: number | null = null;
  #lines = 0;
  #size = 0;
  #total = 0;
  #segments = 0;
  constructor(allowance: number) {
    if (!Number.isSafeInteger(allowance) || allowance < 0) throw new GitRefusal("too-large", "journal segment allowance");
    this.#allowance = allowance;
  }
  get bytes(): number { return this.#total; }
  get segmentBytes(): number { return this.#size; }
  get segments(): number { return this.#segments; }
  /** Returns the first position of a new segment, otherwise null. */
  append(seq: number, bytes: number): number | null {
    archiveSegmentPath(seq);
    if (this.#last !== null && seq !== this.#last + 1) throw new GitRefusal("bad-path", "journal entry sequence");
    if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > ARCHIVE_OBJECT_BYTES) throw new GitRefusal("too-large", "journal entry line");
    const starts = this.#lines === 0 || this.#lines === SEGMENT_LINES || this.#size + 1 + bytes > ARCHIVE_OBJECT_BYTES;
    const addition = bytes + (starts ? 0 : 1);
    if (addition > this.#allowance - this.#total) throw new GitRefusal("too-large", "journal segment allowance");
    this.#lines = starts ? 1 : this.#lines + 1;
    this.#size = starts ? bytes : this.#size + addition;
    this.#total += addition; this.#last = seq;
    if (starts) this.#segments++;
    return starts ? seq : null;
  }
}

/**
 * Group an already selected contiguous cohort. The caller supplies a total
 * output allowance. Canonical JSON objects are checked here; native entry
 * validity, chain/hash checks and append-to-parent planning belong to the
 * later layout builder. LF separates lines; there is no trailing LF.
 */
export function archiveSegments(lines: readonly ArchiveLine[], allowance: number): readonly ArchiveSegment[] {
  const grouping = new ArchiveSegmentCursor(allowance);
  const segments: ArchiveSegment[] = [];
  let size = 0, first = 0, last = 0;
  let parts: Uint8Array[] = [];
  const close = () => {
    if (parts.length === 0) return;
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const part of parts) {
      if (at > 0) bytes[at++] = 10;
      bytes.set(part, at); at += part.length;
    }
    segments.push({ first, last, path: archiveSegmentPath(first), bytes });
    parts = []; size = 0;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    archiveSegmentPath(line.seq);
    if (i > 0 && line.seq !== lines[i - 1]!.seq + 1) throw new GitRefusal("bad-path", "journal entry sequence");
    // UTF-8 is at least as long as the code-unit string for canonical JSON.
    // Refuse obvious overflows before parsing or allocating encoded bytes.
    if (typeof line.bytes !== "string" || line.bytes.length > ARCHIVE_OBJECT_BYTES) throw new GitRefusal("too-large", "journal entry line");
    try {
      const value: unknown = parseStrict(line.bytes);
      if (value === null || typeof value !== "object" || Array.isArray(value) || canonicalize(value) !== line.bytes) throw new Error("noncanonical");
    } catch { throw new GitRefusal("bad-path", "journal entry bytes"); }
    const bytes = utf8(line.bytes);
    if (grouping.append(line.seq, bytes.length) !== null) close();
    const addition = bytes.length + (parts.length > 0 ? 1 : 0);
    if (parts.length === 0) first = line.seq;
    parts.push(bytes); size += addition; last = line.seq;
  }
  close();
  return segments;
}

/**
 * Physical suffixes for one complete logical directory. The original name
 * remains the leaf: numeric groups are three digits, digest groups two hex
 * digits. Call separately for each retained kind/domain. The caller must
 * merge parent names before planning; this helper never removes old names.
 */
export function archiveShards(names: readonly string[], kind: "segment" | "retained"): readonly { name: string; path: string }[] {
  if (kind !== "segment" && kind !== "retained") throw new GitRefusal("bad-path", "journal shard kind");
  const pattern = kind === "segment" ? /^[0-9]{12}\.jsonl$/ : /^[0-9a-f]{64}$/;
  const ordered = [...names].sort();
  for (let i = 0; i < ordered.length; i++) {
    if (!pattern.test(ordered[i]!) || ordered[i] === ordered[i - 1]) throw new GitRefusal("bad-path", "journal shard name");
  }
  const width = kind === "segment" ? 3 : 2;
  const result: { name: string; path: string }[] = [];
  const split = (from: number, to: number, depth: number, prefix: string): void => {
    if (to - from <= DIRECTORY_NAMES) {
      for (let i = from; i < to; i++) result.push({ name: ordered[i]!, path: prefix + ordered[i]! });
      return;
    }
    for (let start = from; start < to;) {
      const group = ordered[start]!.slice(depth, depth + width);
      let end = start + 1;
      while (end < to && ordered[end]!.slice(depth, depth + width) === group) end++;
      split(start, end, depth + width, prefix + group + "/");
      start = end;
    }
  };
  split(0, ordered.length, 0, "");
  return result;
}
