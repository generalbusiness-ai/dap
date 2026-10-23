/** Process-local scalar planning only. No SQL port, callback, body or
 * admission is held here. Actual scouting and fresh admission both pay
 * the original budget; these cumulative costs grant no validation credit. */
import type { Digest, Head } from "@generalbusiness/dap-contract";
import { isDigest, isHead, natural, same } from "@generalbusiness/dap-bytes";
import { ARCHIVE_BOUNDS, type ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import type { ArchiveForeignExpectedCopy, ArchiveForeignRecordedScan } from "./archive-foreign.ts";
import { forecastArchiveForeignColdCopy, forecastArchiveForeignRepeat, forecastArchiveForeignScan } from "./archive-foreign-cost.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";

type Work = Pick<ArchiveCost, "attempts" | "calls" | "metadata" | "inputWork">;
interface Row {
  readonly hash: Digest; readonly work: Readonly<Work>;
  readonly declarations: readonly Digest[]; readonly copies: number;
}
interface Copy {
  readonly first: number; readonly copy: Readonly<ArchiveForeignExpectedCopy>; readonly declaration: Digest;
}
const empty = (): Work => ({ attempts: 0, calls: 0, metadata: 0, inputWork: 0 });

/** Worst-case map creation/visit work, including objects from discarded
 * lookahead. Reserve this before lookahead; extraction spends it afresh. */
export function archiveForeignHandoffCost(copies: number): Readonly<ArchiveCost> {
  if (!natural(copies) || copies > ARCHIVE_BOUNDS.attempts) return stop("unavailable");
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 0,
    metadata: 128 + copies * 512, inputWork: 256 + copies * 1024 });
}

export class ArchiveForeignPlan {
  readonly #rows = new Map<number, Row>();
  readonly #copies = new Map<Digest, Copy>();
  readonly #declarations = new Set<Digest>();
  #blocked = false;
  constructor(readonly first: number, readonly budget: ArchiveBudget) {
    budget.spend({ metadata: 256, inputWork: 512 });
    if (!natural(first)) return stop("unavailable");
  }
  /** Append every selected/scouted position, including zero-use entries.
   * A later native frame may scout an old copy cold again; final admission
   * still sees it as a repeat within its single fresh synchronous frame. */
  append(position: ArchivePosition, uses: number, scan: Readonly<ArchiveForeignRecordedScan> | null): void {
    try {
      const budget = this.budget; budget.check();
      if (this.#blocked) return stop("unavailable");
      if (this.#rows.size === ARCHIVE_BOUNDS.entries) return stop("limit");
      if (!natural(position.seq) || !isDigest(position.hash) || !natural(position.bytes) || position.bytes === 0
        || position.seq !== this.first + this.#rows.size || !natural(uses) || uses > ARCHIVE_BOUNDS.attempts) return stop("mismatch");
      if (uses === 0 ? scan !== null : !scan || scan.position.seq !== position.seq || scan.position.hash !== position.hash
        || scan.position.bytes !== position.bytes || scan.uses !== uses || scan.requests.length !== uses) return stop("mismatch");
      budget.spend({ metadata: 256, inputWork: 512 });
      const previous = this.#rows.get(position.seq - 1), work = { ...(previous?.work ?? empty()) };
      let declarations: readonly Digest[] = previous?.declarations ?? Object.freeze([]), copies = previous?.copies ?? 0;
      const add = (cost: Readonly<Work>) => { for (const key of Object.keys(work) as (keyof Work)[]) work[key] += cost[key]; };
      if (scan) {
        add(forecastArchiveForeignScan(uses));
        for (const request of scan.requests) {
          budget.spend({ inputWork: 512 });
          const prior = this.#copies.get(request.content);
          if (request.kind === "repeat") {
            if (!prior || prior.copy.bytes !== request.bytes) return stop("mismatch");
            add(forecastArchiveForeignRepeat(request.bytes));
            continue;
          }
          if (request.copy.bytes !== request.footprint.bytes || request.copy.input !== request.footprint.input
            || request.copy.effects !== request.footprint.effects || !isDigest(request.declaration)) return stop("mismatch");
          if (prior) {
            if (prior.declaration !== request.declaration || !same(prior.copy, request.copy)) return stop("mismatch");
            add(forecastArchiveForeignRepeat(request.copy.bytes));
            continue;
          }
          const cold = forecastArchiveForeignColdCopy(request.footprint);
          if (!cold.ok) return stop("limit");
          add(cold.work);
          budget.spend({ metadata: 512, inputWork: 1024 });
          this.#copies.set(request.content, { first: position.seq, copy: request.copy, declaration: request.declaration }); copies++;
          if (!this.#declarations.has(request.declaration)) {
            if (declarations.length === ARCHIVE_BOUNDS.nodes) return stop("limit");
            budget.spend({ metadata: (declarations.length + 1) * 128, inputWork: (declarations.length + 1) * 256 });
            declarations = Object.freeze([...declarations, request.declaration]); this.#declarations.add(request.declaration);
          }
        }
      }
      if (!Object.values(work).every(natural)) return stop("limit");
      this.#rows.set(position.seq, { hash: position.hash, work: Object.freeze(work), declarations, copies });
    } catch (error) {
      // Partial lookahead is never a future append basis. Earlier complete
      // boundaries remain quotable; none of the attempted work is refunded.
      this.#blocked = true; throw error;
    }
  }
  #row(through: Head): Row {
    this.budget.check();
    if (!isHead(through)) return stop("mismatch");
    const row = this.#rows.get(through.seq);
    if (!row || row.hash !== through.hash) return stop("mismatch");
    return row;
  }
  /** Constant-time whole-boundary quote. The immutable declaration list
   * is explicit: the owner unions it with local/native declaration nodes. */
  quote(through: Head): Readonly<Pick<Row, "work" | "declarations" | "copies">> {
    this.budget.spend({ metadata: 128, inputWork: 256 });
    const row = this.#row(through);
    return Object.freeze({ work: row.work, declarations: row.declarations, copies: row.copies });
  }
  /** Maximum extra copied contents during the next candidate's lookahead.
   * This quote spends its own bookkeeping; no handoff is prepaid. */
  handoffCost(additionalCopies = 0): Readonly<ArchiveCost> {
    this.budget.spend({ metadata: 128, inputWork: 256 });
    if (!natural(additionalCopies)) return stop("unavailable");
    return archiveForeignHandoffCost(Math.min(ARCHIVE_BOUNDS.attempts, this.#copies.size + additionalCopies));
  }
  /** Extract for fresh admission after selecting a whole boundary.
   * Later discarded/partial lookahead copies are visited and charged, but
   * grant no permission or size allowance to the selected prefix. */
  expectedCopies(through: Head): ReadonlyMap<Digest, Readonly<ArchiveForeignExpectedCopy>> {
    this.#row(through);
    this.budget.spend(archiveForeignHandoffCost(this.#copies.size));
    const result = new Map<Digest, Readonly<ArchiveForeignExpectedCopy>>();
    for (const [digest, value] of this.#copies) if (value.first <= through.seq) result.set(digest, value.copy);
    return result;
  }
}
