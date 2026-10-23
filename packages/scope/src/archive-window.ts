/** Scalar lookahead for an adaptive pass. This is not dependency, privacy
 * or payload admission. The owner still classifies the selected prefix. */
import type { Bounds, Digest, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isHead, natural, timeMs } from "@generalbusiness/dap-bytes";
import { JOURNAL_V2_LAST_POSITION } from "@generalbusiness/dap-git/journal";
import { ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import { ARCHIVE_POSITION_METADATA_BYTES, ARCHIVE_PRIVACY_JSON_PASSES, archivePrefixMetadata, readArchiveScopeFrame, stopArchivePrefix as stop, type ArchivePosition, type ArchivePrefix } from "./archive-prefix.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES, readArchivePin, readArchivePinAfterReceipt } from "./archive-pin.ts";
import type { Sql } from "./sqlite.ts";
import { archiveRootMetadata } from "./archive-prefix.ts";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";

type Step = { readonly kind: "position"; readonly position: ArchivePosition } | { readonly kind: "end" | "limited" };
/** Process-local, opaque and one-use. This holds metadata and the original
 * budget, never a SQL port, transaction, certificate or payload admission. */
export interface ArchiveWindowCheckpoint { readonly kind: "archive-window-checkpoint" }
interface Continuation {
  readonly head: Head; readonly base: ArchivePrefix;
  readonly bounds: Pick<Bounds, "entryBytes" | "sendsPerEntry">;
  readonly budget: ArchiveBudget; readonly positions: ArchivePosition[]; readonly next: number;
}
const continuations = new WeakMap<ArchiveWindowCheckpoint, Continuation>();
function readPosition(sql: Pick<Sql, "exec">, seq: number, bounds: Pick<Bounds, "entryBytes">, budget: ArchiveBudget): ArchivePosition {
  const rows = budget.native(sql, () => ({ metadata: ARCHIVE_POSITION_METADATA_BYTES, inputWork: 0 })).exec(
    "SELECT seq, CASE WHEN typeof(hash) = 'text' AND octet_length(hash) = 71 THEN hash ELSE NULL END AS hash, CASE WHEN typeof(size) = 'integer' THEN size ELSE NULL END AS size, octet_length(bytes) AS actual, typeof(bytes) AS type FROM entry WHERE seq = ? LIMIT 1", seq).toArray();
  if (rows.length !== 1) return stop("incomplete");
  const row = rows[0]!;
  if (row["seq"] !== seq || !isDigest(row["hash"]) || row["type"] !== "text" || !natural(row["size"]) || row["size"] === 0 || row["size"] > bounds.entryBytes || row["actual"] !== row["size"]) return stop("mismatch");
  return { seq, hash: row["hash"], bytes: row["size"] };
}
const add = (a: Partial<ArchiveCost>, b: Partial<ArchiveCost>): Partial<ArchiveCost> => {
  const result = { ...a };
  for (const key of Object.keys(b) as (keyof ArchiveCost)[]) result[key] = (a[key] ?? 0) + b[key]!;
  return result;
};

/** One synchronous native read frame. `reserve` is a forecast of work the
 * owner still needs, not a debit, refund or second allowance. Every actual
 * metadata query and JSON-work reservation uses the original budget. */
export class ArchiveWindow {
  #positions: ArchivePosition[] = [];
  #next: number;
  #closed = false;
  constructor(readonly sql: Pick<Sql, "exec">, readonly head: Head, readonly base: ArchivePrefix,
    readonly bounds: Pick<Bounds, "entryBytes" | "sendsPerEntry">, readonly budget: ArchiveBudget) {
    this.#next = base.positions[0]!.seq;
  }
  #check(): void { this.budget.check(); if (this.#closed) return stop("unavailable"); }
  next(reserve: Partial<ArchiveCost> = {}): Step {
    this.#check();
    if (this.#next > this.head.seq) return { kind: "end" };
    // Validate the forecast even when a later bound would decide first.
    this.budget.canSpend(reserve);
    const metadata = { calls: 1, metadata: ARCHIVE_POSITION_METADATA_BYTES, inputWork: ARCHIVE_POSITION_METADATA_BYTES };
    if (!this.budget.canSpend(add(reserve, metadata))) return { kind: "limited" };
    const held = readPosition(this.sql, this.#next, this.bounds, this.budget);
    if (this.#next === this.head.seq && held.hash !== this.head.hash) return stop("mismatch");
    if (this.#next === this.base.positions[0]!.seq && (held.hash !== this.base.positions[0]!.hash || held.bytes !== this.base.positions[0]!.bytes)) return stop("mismatch");
    // The first position's original JSON reservation was already paid by
    // archivePrefixMetadata. Later positions pay the same unchanged debit.
    if (this.#next !== this.base.positions[0]!.seq) {
      const cost = { entries: 1, inputWork: held.bytes * ARCHIVE_PRIVACY_JSON_PASSES };
      if (!this.budget.canSpend(add(reserve, cost))) return { kind: "limited" };
      this.budget.spend(cost);
    }
    this.#next++;
    const position = Object.freeze(held);
    this.#positions.push(position);
    return { kind: "position", position };
  }
  /** A candidate beyond `through` may have consumed work; selecting an
   * earlier whole boundary refunds none of it. No partial entry is kept. */
  prefix(through: Head): ArchivePrefix {
    this.#check();
    if (!isHead(through)) return stop("mismatch");
    const first = this.base.positions[0]!.seq, position = this.#positions[through.seq - first];
    if (!position || position.hash !== through.hash) return stop("mismatch");
    const positions = this.#positions.slice(0, through.seq - first + 1);
    return { ...this.base, through: { ...through }, positions, bytes: positions.reduce((n, row) => n + row.bytes, 0) };
  }
  /** Close this native frame before any await. The private position array
   * moves to the one-use handle; no earlier debit is reset or replayed. */
  checkpoint(): ArchiveWindowCheckpoint {
    this.#check();
    this.budget.spend({ metadata: 256, inputWork: 512 });
    const checkpoint = Object.freeze({ kind: "archive-window-checkpoint" as const });
    continuations.set(checkpoint, { head: this.head, base: this.base, bounds: this.bounds, budget: this.budget, positions: this.#positions, next: this.#next });
    this.#closed = true;
    return checkpoint;
  }
  /** The owner calls this only inside a fresh synchronous native frame.
   * Resume rechecks identity, scope frame and the last reserved footprint.
   * Earlier plans remain informational: the final inventory must re-admit
   * the whole selected prefix and compare byte plans before any payload. */
  static resume(sql: Pick<Sql, "exec">, checkpoint: ArchiveWindowCheckpoint): ArchiveWindow {
    const held = continuations.get(checkpoint);
    if (!held) return stop("unavailable");
    continuations.delete(checkpoint); // Even a failed fence consumes this handle.
    const { budget, base, bounds, head } = held;
    budget.check();
    budget.spend({ inputWork: 4 * (ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES) });
    const pinSql = budget.native(sql, () => ({ metadata: ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES, inputWork: 0 }));
    const pin = base.after ? readArchivePinAfterReceipt(pinSql, base.pin.at) : readArchivePin(pinSql, base.pin.at);
    if (!pin) { budget.check(); return stop("unavailable"); }
    if (canonicalize(pin) !== canonicalize(base.pin)) return stop("mismatch");
    const frame = readArchiveScopeFrame(sql, base.pin.at, pin, bounds, budget);
    if (canonicalize(frame.genesis) !== canonicalize(base.frame.genesis) || timeMs(frame.time)! < timeMs(base.frame.time)!) return stop("mismatch");
    if (frame.head.seq < head.seq) return stop("incomplete");
    if (frame.head.seq === head.seq && frame.head.hash !== head.hash) return stop("mismatch");
    const last = held.positions.at(-1) ?? base.positions[0]!;
    const position = readPosition(sql, last.seq, bounds, budget);
    if (position.hash !== last.hash || position.bytes !== last.bytes) return stop("mismatch");
    budget.spend({ metadata: 256, inputWork: 512 });
    const next = new ArchiveWindow(sql, head, { ...base, pin, frame }, bounds, budget);
    next.#positions = held.positions; next.#next = held.next;
    return next;
  }
}

export function openArchiveWindow(sql: Pick<Sql, "exec">, at: ScopeRef, head: Head, after: Head | null,
  bounds: Pick<Bounds, "entryBytes" | "sendsPerEntry" | "definitionBytes">, budget: ArchiveBudget,
  certified: Pick<ReadonlySet<Digest>, "has">): ArchiveWindow {
  if (!isHead(head) || after !== null && (!isHead(after) || after.seq >= head.seq)) return stop("unavailable");
  if (head.seq > JOURNAL_V2_LAST_POSITION) return stop("limit");
  const base = archivePrefixMetadata(sql, at, "next", bounds, budget, certified, after);
  if (head.seq > base.frame.head.seq) return stop("incomplete");
  if (head.seq === base.frame.head.seq && head.hash !== base.frame.head.hash) return stop("mismatch");
  return new ArchiveWindow(sql, Object.freeze({ ...head }), base, Object.freeze({ ...bounds }), budget);
}

/** Fresh full root and closure finish before a window is returned. */
export function openArchiveRootWindow(sql: Pick<Sql, "exec">, at: ScopeRef, head: Head, after: Head | null,
  bounds: Bounds, budget: ArchiveBudget, reviewed: ArchivePolicyRegistry) {
  if (!isHead(head) || after !== null && (!isHead(after) || after.seq >= head.seq)) return stop("unavailable");
  if (head.seq > JOURNAL_V2_LAST_POSITION) return stop("limit");
  const root = archiveRootMetadata(sql, at, "next", bounds, budget, reviewed, after, undefined, undefined, head), base = root.prefix;
  return { window: new ArchiveWindow(sql, Object.freeze({ ...head }), base, Object.freeze({ ...bounds }), budget), root };
}
