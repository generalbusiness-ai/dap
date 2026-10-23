/** Scalar upper bounds from actual Native plans. All probe choices remain
 * undecided; present keys/closures bound possible output, never select it. */
import type { Digest, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isHead, natural, utf8 } from "@generalbusiness/dap-bytes";
import type { RetainedKey } from "@generalbusiness/dap-derive";
import { ArchiveSegmentCursor, journalOrderingInputWork, journalV2PassPath, journalV2RetainedPath, journalV2SegmentPath,
  type JournalV2PlannedFile } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, type ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import type { ArchiveDeclarationFootprint, ArchivePotentialDeclarationFootprint } from "./archive-declaration-scout.ts";
import type { ArchiveLocalReferencePlan } from "./archive-local-references.ts";
import { archiveEntryReadForecast, archiveInputBaseReservation, archiveInputColdRetainedReadForecast } from "./archive-input-cost.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import type { ArchivePrivacyPosition } from "./archive-privacy.ts";
import type { ArchiveReferenceMeasurement } from "./archive-reference-measurements.ts";
import { archiveRetainedColdReadForecast, archiveRetainedReadForecast, archiveRetainedKeyName, archiveRetainedHandoffCost } from "./archive-retained.ts";
import { readRetainedArchivePass } from "./archive-retained-pass.ts";
import type { Sql } from "./sqlite.ts";

type Key = Exclude<RetainedKey, { kind: "text" }>;
type Work = Pick<ArchiveCost, "attempts" | "calls" | "metadata" | "inputWork">;
const zero = (): Work => ({ attempts: 0, calls: 0, metadata: 0, inputWork: 0 });
const add = (total: Work, cost: Partial<ArchiveCost>) => {
  for (const key of Object.keys(total) as (keyof Work)[]) { total[key] += cost[key] ?? 0; if (!natural(total[key])) return stop("limit"); }
};
const nameOf = (key: Key) => canonicalize(key.kind === "value" ? [key.kind, key.domain, key.digest] : [key.kind, key.digest]);
interface ObjectMetadata { readonly key: Key; readonly bytes: number; readonly pass: number | null; readonly first: number }
interface Segment { readonly first: number; readonly bytes: number }
interface Counts {
  readonly objects: number; readonly copies: number; readonly newRetained: number; readonly retainedBytes: number; readonly retainedNameUnits: number;
  readonly keyBytes: number; readonly objectJSONBytes: number;
}
interface Row extends Counts {
  readonly hash: Digest; readonly entryBytes: number; readonly origins: number; readonly consumerBytes: number;
  readonly omissions: number; readonly ancestry: number; readonly input: Readonly<Work>; readonly segments: readonly Segment[];
}
export interface ArchiveScoutLayoutQuote {
  readonly entries: number; readonly entryBytes: number; readonly objects: number; readonly copies: number; readonly newRetained: number;
  readonly anchorCandidates: number;
  readonly retainedBytes: number; readonly retainedNameUnits: number; readonly origins: number;
  readonly manifestRows: number; readonly selectionUnits: number; readonly manifestBytes: number;
  readonly measuredOmissions: number; readonly orderingInputWork: number;
  readonly input: Readonly<Work>; readonly files: readonly JournalV2PlannedFile[];
}

export class ArchiveScoutLayout {
  readonly #sizes = new Map<string, { readonly first: number; readonly bytes: number | null }>();
  readonly #bodyKeys = new Set<string>();
  readonly #objects = new Map<string, ObjectMetadata>();
  readonly #rows = new Map<number, Row>();
  readonly #segments = new ArchiveSegmentCursor(8 * 1024 * 1024);
  readonly #rootConsumers: number;
  #counts: Counts = { objects: 0, copies: 0, newRetained: 0, retainedBytes: 0, retainedNameUnits: 0, keyBytes: 0, objectJSONBytes: 0 };
  #retainedInput: Work = zero();
  constructor(readonly at: ScopeRef, readonly first: number, root: ArchiveDeclarationFootprint, sql: Pick<Sql, "exec">, readonly budget: ArchiveBudget) {
    budget.spend({ metadata: 512, inputWork: 1024 });
    this.#rootConsumers = root.declarations.length;
    for (const node of root.declarations) {
      this.#recordSize({ kind: "definition", digest: node.digest }, node.bytes, first);
      this.#remember(sql, { kind: "definition", digest: node.digest }, node.bytes, first);
    }
  }
  get objects(): number { return this.#objects.size; }
  #recordSize(key: RetainedKey | { readonly kind: "text"; readonly digest: Digest }, bytes: number | null, first: number): string {
    this.budget.spend({ metadata: 1024, inputWork: 2048 });
    const name = archiveRetainedKeyName(key), previous = this.#sizes.get(name);
    if (previous) { if (previous.bytes !== bytes) return stop("mismatch"); return name; }
    if (this.#sizes.size === ARCHIVE_BOUNDS.attempts) return stop("limit");
    this.#sizes.set(name, { first, bytes }); return name;
  }
  #remember(sql: Pick<Sql, "exec">, key: Key, bytes: number, first: number): void {
    // Domain spelling is finite (archive retained paths also enforce it).
    // Charge before serializing even a repeated candidate's name.
    this.budget.spend({ metadata: 1024, inputWork: 2048 });
    const name = nameOf(key), prior = this.#objects.get(name);
    if (prior) { if (prior.bytes !== bytes) return stop("mismatch"); return; }
    if (this.#objects.size === ARCHIVE_BOUNDS.attempts) return stop("limit");
    const path = journalV2RetainedPath(this.first, key);
    const pass = readRetainedArchivePass(sql, key, this.budget);
    if (pass !== null && pass > this.first) return stop("mismatch");
    const counts = { ...this.#counts };
    counts.objects++; counts.keyBytes += utf8(name).length;
    if (key.kind === "entry") counts.copies++;
    // Full object descriptor except consumers. The path's ASCII escaped
    // domain spelling bounds both key strings; 512 covers fact/pin/pass.
    counts.objectJSONBytes += 512 + path.length * 2;
    if (pass === null || pass === this.first) {
      counts.newRetained++; counts.retainedBytes += bytes; counts.retainedNameUnits += name.length;
      add(this.#retainedInput, archiveInputColdRetainedReadForecast(bytes));
    }
    if (!Object.values(counts).every(natural)) return stop("limit");
    this.#counts = counts;
    this.#objects.set(name, Object.freeze({ key: Object.freeze({ ...key }), bytes, pass, first }));
  }
  append(sql: Pick<Sql, "exec">, position: ArchivePrivacyPosition, plan: ArchiveLocalReferencePlan,
    measurements: readonly ArchiveReferenceMeasurement[], roots: readonly ArchivePotentialDeclarationFootprint[]): Readonly<Work> {
    this.budget.check();
    if (position.seq !== this.first + this.#rows.size) return stop("mismatch");
    for (const root of roots) for (const node of root.requests) {
      this.#recordSize({ kind: "definition", digest: node.digest }, node.bytes, position.seq);
      if (node.bytes !== null) this.#remember(sql, { kind: "definition", digest: node.digest }, node.bytes, position.seq);
    }
    const reads = zero();
    for (const measurement of measurements) {
      if (measurement.plan.dependency.mode === "text") {
        this.#recordSize(measurement.plan.dependency.key, measurement.textBytes ?? null, position.seq);
        add(reads, archiveRetainedReadForecast(null)); continue;
      }
      for (const candidate of measurement.candidates) {
        if (candidate.heldBytes === undefined) return stop("unavailable");
        const name = this.#recordSize(candidate.key, candidate.heldBytes, position.seq);
        // All non-declaration payloads are unavailable until final privacy
        // and closure admission completes. Their first request is cold on
        // that fresh reader. A later possible request still prices the
        // higher cached path, including an oversized Unicode candidate.
        add(reads, candidate.key.kind === "definition" || this.#bodyKeys.has(name)
          ? archiveRetainedReadForecast(candidate.heldBytes) : archiveRetainedColdReadForecast(candidate.bytes));
        this.budget.spend({ metadata: 128, inputWork: 256 }); this.#bodyKeys.add(name);
        if (candidate.bytes !== null) this.#remember(sql, candidate.key, candidate.bytes, position.seq);
      }
    }
    const previous = this.#rows.get(position.seq - 1);
    let origins = previous?.origins ?? this.#rootConsumers, consumerBytes = previous?.consumerBytes ?? this.#rootConsumers * 768;
    let omissions = previous?.omissions ?? 0, ancestry = previous?.ancestry ?? 0;
    const sizes = new Map<Digest, number>();
    this.budget.spend({ metadata: roots.length * 128, inputWork: roots.length * 256 });
    for (const root of roots) sizes.set(root.root, root.requests.filter(node => node.bytes !== null).length);
    // The PlanFence has already paid/frozen each metadata node. Reserve
    // serialization using its worst JSON escape bound, before allocation.
    for (const measurement of measurements) {
      const dependency = measurement.plan.dependency;
      const upper = this.#jsonUpper(dependency);
      this.budget.spend({ metadata: upper, inputWork: upper * 8 });
      const bytes = utf8(canonicalize(dependency)).length;
      if (dependency.mode === "text") {
        if (measurement.textBytes !== null && measurement.textBytes !== undefined) { omissions++; origins++; consumerBytes += bytes + 32; }
        continue;
      }
      let count = 1;
      if (dependency.mode === "required" && dependency.key.kind === "definition") count = sizes.get(dependency.key.digest) ?? 0;
      if (dependency.mode === "probe") for (const { key } of dependency.choices) if (key.kind === "definition") count = Math.max(count, sizes.get(key.digest) ?? 0);
      // One requested consumer plus each possible archive-only child. This
      // upper bound chooses no probe winner and takes no deduplication credit.
      origins += count; consumerBytes += Math.max(bytes, 768) * count;
    }
    if (plan.ancestrySnapshot) { ancestry++; origins++; }
    const starts = this.#segments.append(position.seq, position.bytes), old = previous?.segments ?? [];
    this.budget.spend({ metadata: 256 + (old.length + 1) * 128, inputWork: 512 + (old.length + 1) * 256 });
    const segments = starts === null ? [...old.slice(0, -1), { first: old.at(-1)!.first, bytes: this.#segments.segmentBytes }]
      : [...old, { first: starts, bytes: position.bytes }];
    const input = { ...this.#retainedInput }; add(input, archiveEntryReadForecast((previous?.entryBytes ?? 0) + position.bytes));
    // The byte term is linear; each earlier entry still needs its own
    // request + size/body calls and fixed metadata.
    const earlierEntries = position.seq - this.first;
    add(input, { attempts: earlierEntries, calls: earlierEntries * 2, metadata: earlierEntries * 128, inputWork: earlierEntries * 384 });
    this.#rows.set(position.seq, Object.freeze({ ...this.#counts, hash: position.hash, entryBytes: (previous?.entryBytes ?? 0) + position.bytes,
      origins, consumerBytes, omissions, ancestry, input: Object.freeze(input), segments: Object.freeze(segments) }));
    return Object.freeze(reads);
  }
  #jsonUpper(value: unknown, depth = 0): number {
    this.budget.spend({ metadata: 32, inputWork: 64 });
    if (depth > 32) return stop("limit");
    if (value === null) return 4;
    if (typeof value === "string") return value.length * 6 + 2;
    if (typeof value === "number") return 32;
    if (typeof value === "boolean") return 5;
    if (typeof value !== "object") return stop("mismatch");
    let bytes = 2;
    if (Array.isArray(value)) for (const child of value) bytes += 1 + this.#jsonUpper(child, depth + 1);
    else for (const [key, child] of Object.entries(value)) bytes += key.length * 6 + 4 + this.#jsonUpper(child, depth + 1);
    return bytes;
  }
  handoffCost(): Partial<ArchiveCost> {
    this.budget.spend({ metadata: 128, inputWork: 256 });
    return archiveRetainedHandoffCost(this.#sizes.size);
  }
  sizes(through: Head): ReadonlyMap<string, number | null> {
    if (!isHead(through) || this.#rows.get(through.seq)?.hash !== through.hash) return stop("mismatch");
    this.budget.spend(archiveRetainedHandoffCost(this.#sizes.size));
    const sizes = new Map<string, number | null>();
    for (const [key, held] of this.#sizes) if (held.first <= through.seq) sizes.set(key, held.bytes);
    return sizes;
  }
  quote(through: Head, sources: number, anchorCandidates: number): ArchiveScoutLayoutQuote {
    this.budget.spend({ metadata: 512 + this.#objects.size * 128, inputWork: 1024 + this.#objects.size * 256 });
    if (!isHead(through) || !natural(sources) || !natural(anchorCandidates)) return stop("mismatch");
    const row = this.#rows.get(through.seq);
    if (!row || row.hash !== through.hash) return stop("mismatch");
    const entries = through.seq - this.first + 1, keyRows = row.objects + row.omissions + sources;
    const selectionUnits = 1280 + entries * 128 + row.objectJSONBytes + row.consumerBytes + row.ancestry * 512 + sources * 512;
    const manifestBytes = 768 + row.objectJSONBytes + row.omissions * 320 + sources * 512;
    const orderingInputWork = journalOrderingInputWork(row.consumerBytes, row.origins)
      + journalOrderingInputWork(row.keyBytes + row.omissions * 96 + sources * 256, keyRows);
    // This file consists entirely of the selected immutable metadata; its
    // exact byte count needs no entry or retained payload read.
    this.budget.spend({ metadata: 1024, inputWork: 8192 });
    const headBytes = utf8(canonicalize({ v: 2, scope: this.at, through: through.seq, hash: through.hash })).length;
    const files: JournalV2PlannedFile[] = [{ path: "journal/v2/head.json", bytes: headBytes }, { path: journalV2PassPath(this.first), bytes: manifestBytes },
      ...row.segments.map(segment => ({ path: journalV2SegmentPath(this.first, segment.first), bytes: segment.bytes }))];
    for (const object of this.#objects.values()) if (object.first <= through.seq && (object.pass === null || object.pass === this.first)) files.push({ path: journalV2RetainedPath(this.first, object.key), bytes: object.bytes });
    const input = { ...row.input }; add(input, archiveInputBaseReservation(entries, row.objects));
    return Object.freeze({ entries, entryBytes: row.entryBytes, objects: row.objects, copies: row.copies, newRetained: row.newRetained, anchorCandidates,
      retainedBytes: row.retainedBytes, retainedNameUnits: row.retainedNameUnits, origins: row.origins, manifestRows: row.objects + row.omissions,
      selectionUnits, manifestBytes, measuredOmissions: row.omissions, orderingInputWork, input: Object.freeze(input), files: Object.freeze(files.map(file => Object.freeze(file))) });
  }
}
