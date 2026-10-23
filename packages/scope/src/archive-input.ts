/** Exact immutable-selection reads for a build or rebuild. No head read,
 * inventory, retention enumeration or detached-text fallback. Foreign copies
 * require their marked source/pin pairs to match the fixture configuration. */
import { natural } from "@generalbusiness/dap-bytes";
import { RETAINED_INPUT_BYTES, type Digest, type FactRef, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isFactRef, isPlatformDefinition, isScopeRef, utf8 } from "@generalbusiness/dap-bytes";
import { checkedRetainedKey, type RetainedKey } from "@generalbusiness/dap-derive";
import { ARCHIVE_BOUNDS, ArchiveBudget } from "./archive-budget.ts";
import { ArchiveRetainedReader, type ArchiveRetainedCopy } from "./archive-retained.ts";
import { ArchivePrefixStopped } from "./archive-prefix.ts";
import { ARCHIVE_SOURCE_PINS, type ArchiveSourceBasis, type FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import type { Sql } from "./sqlite.ts";
import { ARCHIVE_INPUT_REQUEST_WORK, ARCHIVE_ENTRY_SIZE_METADATA, archiveEntryBodyWork, archiveInputBaseReservation, archiveInputRetainedPostWork } from "./archive-input-cost.ts";

export interface ArchiveInputSelection {
  readonly entries: readonly { readonly seq: number; readonly hash: Digest; readonly bytes: number }[];
  readonly objects: readonly { readonly key: RetainedKey; readonly bytes: number; readonly foreign?: { readonly fact: FactRef; readonly pin: Digest | PlatformDefinition } }[];
  readonly foreignSources?: readonly ArchiveSourceBasis[];
}
const nameOf = (key: RetainedKey): string => JSON.stringify(key.kind === "value" ? [key.kind, key.domain, key.digest] : [key.kind, key.digest]);
export interface ArchiveInput {
  entry(seq: number, limit: number): Promise<string | null>;
  retained(key: RetainedKey, limit: number): Promise<string | null>;
}

/** Selection admission belongs to the caller before construction. Rebuilds
 * decode their stored selection, never select against today's retained set.
 * Every call uses the original budget, including missing and cached reads. */
export function archiveInput(sql: Sql, selection: ArchiveInputSelection, budget: ArchiveBudget, fixtureSources?: FixtureArchiveSourcePins): ArchiveInput {
  budget.check();
  if (selection.entries.length > ARCHIVE_BOUNDS.entries || selection.objects.length > ARCHIVE_BOUNDS.attempts) budget.stop("limit");
  budget.spend(archiveInputBaseReservation(selection.entries.length, selection.objects.length));
  const entries = new Map<number, { readonly hash: string; readonly bytes: number }>();
  for (const entry of selection.entries) {
    if (!natural(entry.seq) || !natural(entry.bytes) || entry.bytes === 0 || !isDigest(entry.hash) || entries.has(entry.seq)) budget.stop("unavailable");
    entries.set(entry.seq, { hash: entry.hash, bytes: entry.bytes });
  }
  const objects = new Map<string, { readonly key: RetainedKey; readonly bytes: number }>();
  const sources = new Map<string, { readonly source: ArchiveSourceBasis; readonly genesis: Digest; used: boolean }>();
  const basis = selection.foreignSources ?? [];
  if (basis.length > ARCHIVE_SOURCE_PINS) budget.stop("limit");
  budget.spend({ metadata: basis.length * 512, inputWork: basis.length * 1024 });
  for (const source of basis) {
    if (!isScopeRef(source.at) || !isDigest(source.pin) && !isPlatformDefinition(source.pin) || sources.has(canonicalize(source.at))) budget.stop("unavailable");
    const configured = fixtureSources?.get(source.at, budget);
    if (!configured) throw new ArchivePrefixStopped("foreign-source-unavailable");
    if (configured.pin !== source.pin) throw new ArchivePrefixStopped("foreign-source-mismatch");
    sources.set(canonicalize(source.at), { source: { at: { ...source.at }, pin: source.pin }, genesis: configured.genesis, used: false });
  }
  const copies: ArchiveRetainedCopy[] = [];
  for (const object of selection.objects) {
    const key = checkedRetainedKey(object.key);
    if (!natural(object.bytes) || object.bytes === 0 || object.bytes > RETAINED_INPUT_BYTES || objects.has(nameOf(key))) budget.stop("unavailable");
    if (key.kind === "entry") {
      const foreign = object.foreign;
      if (!foreign || !isFactRef(foreign.fact)) throw new ArchivePrefixStopped("foreign-source-unavailable");
      const source = sources.get(canonicalize(foreign.fact.at));
      if (!source || source.source.pin !== foreign.pin || foreign.fact.seq === 0 && foreign.fact.hash !== source.genesis) throw new ArchivePrefixStopped("foreign-source-mismatch");
      source.used = true;
      copies.push({ content: key.digest, bytes: object.bytes, fact: foreign.fact, pin: foreign.pin });
    } else if (object.foreign !== undefined) budget.stop("unavailable");
    objects.set(nameOf(key), { key: { ...key }, bytes: object.bytes });
  }
  if ([...sources.values()].some(source => !source.used)) throw new ArchivePrefixStopped("foreign-source-mismatch");
  const retained = new ArchiveRetainedReader(sql, budget, copies);
  return {
    async entry(seq, limit) {
      budget.spend({ attempts: 1, inputWork: ARCHIVE_INPUT_REQUEST_WORK });
      const selected = entries.get(seq);
      if (!selected || !natural(seq) || limit !== selected.bytes) return null;
      return sql.transaction(() => {
        const sizes = budget.native(sql, () => ({ metadata: ARCHIVE_ENTRY_SIZE_METADATA, inputWork: 0 })).exec("SELECT hash, octet_length(bytes) AS size, typeof(bytes) AS type FROM entry WHERE seq = ? LIMIT 1", seq).toArray();
        if (sizes.length === 0) return null;
        const row = sizes[0];
        if (sizes.length !== 1 || row?.["hash"] !== selected.hash || row["size"] !== selected.bytes || row["type"] !== "text") return null;
        budget.spend({ inputWork: archiveEntryBodyWork(selected.bytes) });
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
      if (!selected || limit !== selected.bytes) { budget.spend({ attempts: 1, inputWork: ARCHIVE_INPUT_REQUEST_WORK }); return null; }
      return sql.transaction(() => {
        const read = retained.read(selected.key, selected.bytes);
        if (read === null) return null;
        budget.spend({ inputWork: archiveInputRetainedPostWork(read.bytes.length) });
        return utf8(read.bytes).length === selected.bytes ? read.bytes : null;
      });
    },
  };
}
