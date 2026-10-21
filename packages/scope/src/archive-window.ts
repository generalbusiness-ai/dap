/** Scalar lookahead for an adaptive pass. This is not dependency, privacy
 * or payload admission. The owner still classifies the selected prefix. */
import type { Bounds, Digest, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, isHead, natural } from "@generalbusiness/artroom-bytes";
import { JOURNAL_V2_LAST_POSITION } from "@generalbusiness/artroom-git/journal";
import { ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import { ARCHIVE_POSITION_METADATA_BYTES, ARCHIVE_PRIVACY_JSON_PASSES, archivePrefixMetadata, stopArchivePrefix as stop, type ArchivePosition, type ArchivePrefix } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";

type Step = { readonly kind: "position"; readonly position: ArchivePosition } | { readonly kind: "end" | "limited" };
const add = (a: Partial<ArchiveCost>, b: Partial<ArchiveCost>): Partial<ArchiveCost> => {
  const result = { ...a };
  for (const key of Object.keys(b) as (keyof ArchiveCost)[]) result[key] = (a[key] ?? 0) + b[key]!;
  return result;
};

/** One synchronous native read frame. `reserve` is a forecast of work the
 * owner still needs, not a debit, refund or second allowance. Every actual
 * metadata query and JSON-work reservation uses the original budget. */
export class ArchiveWindow {
  readonly #positions: ArchivePosition[] = [];
  #next: number;
  constructor(readonly sql: Pick<Sql, "exec">, readonly head: Head, readonly base: ArchivePrefix,
    readonly bounds: Pick<Bounds, "entryBytes">, readonly budget: ArchiveBudget) {
    this.#next = base.positions[0]!.seq;
  }
  next(reserve: Partial<ArchiveCost> = {}): Step {
    this.budget.check();
    if (this.#next > this.head.seq) return { kind: "end" };
    // Validate the forecast even when a later bound would decide first.
    this.budget.canSpend(reserve);
    const metadata = { calls: 1, metadata: ARCHIVE_POSITION_METADATA_BYTES, inputWork: ARCHIVE_POSITION_METADATA_BYTES };
    if (!this.budget.canSpend(add(reserve, metadata))) return { kind: "limited" };
    const rows = this.budget.native(this.sql, () => ({ metadata: ARCHIVE_POSITION_METADATA_BYTES, inputWork: 0 })).exec(
      "SELECT seq, CASE WHEN typeof(hash) = 'text' AND octet_length(hash) = 71 THEN hash ELSE NULL END AS hash, CASE WHEN typeof(size) = 'integer' THEN size ELSE NULL END AS size, octet_length(bytes) AS actual, typeof(bytes) AS type FROM entry WHERE seq = ? LIMIT 1", this.#next).toArray();
    if (rows.length !== 1) return stop("incomplete");
    const row = rows[0]!;
    if (row["seq"] !== this.#next || !isDigest(row["hash"]) || row["type"] !== "text" || !natural(row["size"]) || row["size"] === 0 || row["size"] > this.bounds.entryBytes || row["actual"] !== row["size"]
      || this.#next === this.head.seq && row["hash"] !== this.head.hash) return stop("mismatch");
    if (this.#next === this.base.positions[0]!.seq && (row["hash"] !== this.base.positions[0]!.hash || row["size"] !== this.base.positions[0]!.bytes)) return stop("mismatch");
    // The first position's original JSON reservation was already paid by
    // archivePrefixMetadata. Later positions pay the same unchanged debit.
    if (this.#next !== this.base.positions[0]!.seq) {
      const cost = { entries: 1, inputWork: row["size"] * ARCHIVE_PRIVACY_JSON_PASSES };
      if (!this.budget.canSpend(add(reserve, cost))) return { kind: "limited" };
      this.budget.spend(cost);
    }
    const position = Object.freeze({ seq: this.#next++, hash: row["hash"], bytes: row["size"] });
    this.#positions.push(position);
    return { kind: "position", position };
  }
  /** A candidate beyond `through` may have consumed work; selecting an
   * earlier whole boundary refunds none of it. No partial entry is kept. */
  prefix(through: Head): ArchivePrefix {
    this.budget.check();
    if (!isHead(through)) return stop("mismatch");
    const first = this.base.positions[0]!.seq, position = this.#positions[through.seq - first];
    if (!position || position.hash !== through.hash) return stop("mismatch");
    const positions = this.#positions.slice(0, through.seq - first + 1);
    return { ...this.base, through: { ...through }, positions, bytes: positions.reduce((n, row) => n + row.bytes, 0) };
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
