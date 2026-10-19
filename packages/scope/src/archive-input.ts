/** Exact immutable-selection reads for a build or rebuild. No head read,
 * inventory, retention enumeration, foreign copy or detached-text fallback. */
import { natural } from "@generalbusiness/artroom-bytes";
import { RETAINED_INPUT_BYTES, type Digest } from "@generalbusiness/dap-contract";
import { isDigest, utf8 } from "@generalbusiness/artroom-bytes";
import { checkedRetainedKey, type RetainedKey } from "@generalbusiness/dap-derive";
import { ARCHIVE_BOUNDS, ArchiveBudget } from "./archive-budget.ts";
import { ArchiveRetainedReader } from "./archive-retained.ts";
import type { Sql } from "./sqlite.ts";

export interface ArchiveInputSelection {
  readonly entries: readonly { readonly seq: number; readonly hash: Digest; readonly bytes: number }[];
  readonly objects: readonly { readonly key: RetainedKey; readonly bytes: number }[];
}
const nameOf = (key: RetainedKey): string => JSON.stringify(key.kind === "value" ? [key.kind, key.domain, key.digest] : [key.kind, key.digest]);
export interface ArchiveInput {
  entry(seq: number, limit: number): Promise<string | null>;
  retained(key: RetainedKey, limit: number): Promise<string | null>;
}

/** Selection admission belongs to the caller before construction. Rebuilds
 * decode their stored selection, never select against today's retained set.
 * Every call uses the original budget, including missing and cached reads. */
export function archiveInput(sql: Sql, selection: ArchiveInputSelection, budget: ArchiveBudget): ArchiveInput {
  budget.check();
  if (selection.entries.length > ARCHIVE_BOUNDS.entries || selection.objects.length > ARCHIVE_BOUNDS.attempts) budget.stop("limit");
  budget.spend({ metadata: selection.entries.length * 128 + selection.objects.length * 256, inputWork: selection.entries.length * 256 + selection.objects.length * 512 });
  const entries = new Map<number, { readonly hash: string; readonly bytes: number }>();
  for (const entry of selection.entries) {
    if (!natural(entry.seq) || !natural(entry.bytes) || entry.bytes === 0 || !isDigest(entry.hash) || entries.has(entry.seq)) budget.stop("unavailable");
    entries.set(entry.seq, { hash: entry.hash, bytes: entry.bytes });
  }
  const objects = new Map<string, { readonly key: RetainedKey; readonly bytes: number }>();
  for (const object of selection.objects) {
    const key = checkedRetainedKey(object.key);
    if (key.kind === "entry" || !natural(object.bytes) || object.bytes === 0 || object.bytes > RETAINED_INPUT_BYTES || objects.has(nameOf(key))) budget.stop("unavailable");
    objects.set(nameOf(key), { key: { ...key }, bytes: object.bytes });
  }
  const retained = new ArchiveRetainedReader(sql, budget);
  return {
    async entry(seq, limit) {
      budget.spend({ attempts: 1, inputWork: 256 });
      const selected = entries.get(seq);
      if (!selected || !natural(seq) || limit !== selected.bytes) return null;
      return sql.transaction(() => {
        const sizes = budget.native(sql, () => ({ metadata: 128, inputWork: 0 })).exec("SELECT hash, octet_length(bytes) AS size, typeof(bytes) AS type FROM entry WHERE seq = ? LIMIT 1", seq).toArray();
        if (sizes.length === 0) return null;
        const row = sizes[0];
        if (sizes.length !== 1 || row?.["hash"] !== selected.hash || row["size"] !== selected.bytes || row["type"] !== "text") return null;
        budget.spend({ inputWork: selected.bytes * 8 });
        const bodies = budget.native(sql, () => ({ metadata: 0, inputWork: selected.bytes })).exec("SELECT bytes FROM entry WHERE seq = ? AND hash = ? AND typeof(bytes) = 'text' AND octet_length(bytes) = ? LIMIT 1", seq, selected.hash, selected.bytes).toArray();
        const bytes = bodies[0]?.["bytes"];
        if (bodies.length !== 1 || typeof bytes !== "string" || bytes.length > selected.bytes || utf8(bytes).length !== selected.bytes) return null;
        budget.check(); return bytes;
      });
    },
    async retained(key, limit) {
      budget.check();
      key = checkedRetainedKey(key);
      const selected = objects.get(nameOf(key));
      if (!selected || limit !== selected.bytes) { budget.spend({ attempts: 1, inputWork: 256 }); return null; }
      return sql.transaction(() => {
        const read = retained.read(selected.key, selected.bytes);
        if (read === null) return null;
        budget.spend({ inputWork: read.bytes.length * 3 });
        return utf8(read.bytes).length === selected.bytes ? read.bytes : null;
      });
    },
  };
}
