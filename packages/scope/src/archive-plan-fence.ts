/** Immutable metadata forecast, never payload admission. Final inventory
 * still re-admits the whole prefix inside one fresh native read frame. */
import type { Head } from "@generalbusiness/dap-contract";
import { natural, same } from "@generalbusiness/dap-bytes";
import type { LocalRetainedPlan } from "@generalbusiness/dap-derive";
import { ARCHIVE_BOUNDS, type ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import type { ArchiveLocalReferencePlan } from "./archive-local-references.ts";
import type { ArchivePrivacyPosition, ArchivePrivacyPrefix } from "./archive-privacy.ts";
import { stopArchivePrefix as stop, type ArchivePrefix } from "./archive-prefix.ts";
import { checkArchiveFieldSource } from "./archive-digest-fields.ts";

/** Only caller-owned, acyclic native metadata enters here. Freeze it in
 * place, paying each visited node/string before retaining it. The returned
 * upper bound includes worst-case JSON escapes for later comparison. No
 * SQL port, callback or payload record can cross the frame in this value. */
function sealPlanMetadata(value: unknown, budget: ArchiveBudget, depth = 0): number {
  budget.check();
  if (depth > 32) return stop("limit");
  budget.spend({ metadata: 32, inputWork: 64 });
  if (value === null) return 4;
  if (typeof value === "string") {
    budget.spend({ metadata: value.length * 2, inputWork: value.length * 8 });
    return value.length * 6 + 2;
  }
  if (typeof value === "number") { if (!natural(value)) return stop("mismatch"); return 32; }
  if (typeof value === "boolean") return 5;
  if (typeof value !== "object") return stop("mismatch");
  let size = 2;
  if (Array.isArray(value)) {
    budget.spend({ metadata: value.length * 32, inputWork: value.length * 32 });
    for (const child of value) size += 1 + sealPlanMetadata(child, budget, depth + 1);
  } else {
    for (const key in value) if (Object.hasOwn(value, key)) {
      budget.spend({ inputWork: key.length * 8 });
      size += key.length * 6 + 4 + sealPlanMetadata((value as Record<string, unknown>)[key], budget, depth + 1);
    }
  }
  Object.freeze(value);
  return size;
}
function samePlanMetadata(left: unknown, leftSize: number, right: unknown, budget: ArchiveBudget): boolean {
  const size = leftSize + sealPlanMetadata(right, budget);
  budget.spend({ metadata: size * 3, inputWork: size * 8 });
  return same(left, right);
}
const prefixBasis = (prefix: ArchivePrefix) => ({ pin: prefix.pin, genesis: prefix.frame.genesis, after: prefix.after ?? null });
/** Capture the original seal's actual work; fresh comparison must repeat
 * that seal and pay both sides' original comparison reservation again. */
function captureComparison(value: unknown, budget: ArchiveBudget): { size: number; metadata: number; inputWork: number } {
  budget.spend({ metadata: 128, inputWork: 256 }); // New forecast bookkeeping.
  const before = budget.admitted(), size = sealPlanMetadata(value, budget), after = budget.admitted();
  return { size, metadata: after.metadata - before.metadata + size * 6,
    inputWork: after.inputWork - before.inputWork + size * 16 };
}

/** One process-local forecast, consumed once by a fresh inventory. Plans
 * come from actual scalar projection; their frozen values confer no class,
 * declaration, privacy, retained-byte or replay admission. */
export class ArchivePlanFence {
  readonly #budget: ArchiveBudget;
  readonly #basis: ReturnType<typeof prefixBasis>;
  readonly #basisSize: number;
  readonly #basisMetadata: number;
  readonly #basisInputWork: number;
  readonly #first: number;
  readonly #rows = new Map<number, { readonly position: ArchivePrivacyPosition; readonly plan: ArchiveLocalReferencePlan; readonly size: number;
    readonly comparisonMetadata: number; readonly comparisonInputWork: number }>();
  #through: Head | null = null;
  #started = false;
  #checked = 0;
  #finished = false;
  constructor(prefix: ArchivePrefix, budget: ArchiveBudget) {
    budget.spend({ metadata: 256, inputWork: 512 });
    if (prefix.after === undefined || prefix.positions.length === 0) stop("unavailable");
    this.#budget = budget; this.#first = prefix.positions[0]!.seq;
    this.#basis = prefixBasis(prefix);
    const basis = captureComparison(this.#basis, budget);
    this.#basisSize = basis.size; this.#basisMetadata = basis.metadata; this.#basisInputWork = basis.inputWork;
  }
  append(position: ArchivePrivacyPosition, plan: ArchiveLocalReferencePlan): void {
    const budget = this.#budget; budget.check();
    if (this.#through !== null || this.#started) return stop("unavailable");
    checkArchiveFieldSource(position);
    if (position.seq !== this.#first + this.#rows.size) return stop("mismatch");
    if (this.#rows.size === ARCHIVE_BOUNDS.entries) return stop("limit");
    budget.spend({ metadata: 256, inputWork: 512 });
    const captured = captureComparison(plan, budget), previous = this.#rows.get(position.seq - 1);
    const comparisonMetadata = (previous?.comparisonMetadata ?? this.#basisMetadata) + captured.metadata;
    const comparisonInputWork = (previous?.comparisonInputWork ?? this.#basisInputWork) + captured.inputWork;
    if (!natural(comparisonMetadata) || !natural(comparisonInputWork)) return stop("limit");
    const owned = Object.freeze({ seq: position.seq, hash: position.hash, bytes: position.bytes, input: position.input });
    this.#rows.set(position.seq, { position: owned, plan, size: captured.size, comparisonMetadata, comparisonInputWork });
  }
  /** Future start/check work for this whole prefix when its fresh plan
   * matches. No comparison is skipped or prepaid. Mismatching metadata
   * still fails through the real comparison and original allowance. */
  comparisonCost(through: Head): Readonly<ArchiveCost> {
    const budget = this.#budget; budget.spend({ metadata: 128, inputWork: 256 });
    if (this.#started) return stop("unavailable");
    const row = this.#rows.get(through.seq);
    if (!row || row.position.hash !== through.hash) return stop("mismatch");
    return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 0,
      metadata: row.comparisonMetadata, inputWork: row.comparisonInputWork });
  }
  sealCost(through: Head): Partial<ArchiveCost> {
    this.#budget.spend({ metadata: 128, inputWork: 256 });
    const row = this.#rows.get(through.seq);
    if (this.#started || this.#through !== null || !row || row.position.hash !== through.hash) return stop("mismatch");
    return { inputWork: (this.#first + this.#rows.size - 1 - through.seq) * 32 };
  }
  /** Select an earlier whole boundary after metadata lookahead. Discarded
   * projections grant no refund: all their reads, seals and quotes remain
   * spent on the original ledger. The selected prefix is consumed once. */
  seal(through: Head): void {
    this.#budget.check();
    if (this.#through !== null || this.#started) return stop("unavailable");
    const seq = through.seq, hash = through.hash, selected = this.#rows.get(seq)?.position;
    if (!selected || selected.hash !== hash) return stop("mismatch");
    const last = this.#first + this.#rows.size - 1;
    this.#budget.spend({ inputWork: (last - seq) * 32 });
    for (let next = seq + 1; next <= last; next++) { this.#budget.check(); this.#rows.delete(next); }
    this.#through = Object.freeze({ seq, hash });
  }
  /** Called only after fresh whole-prefix privacy/classification, before
   * the first local entry body. Even a failed comparison consumes it. */
  start(prefix: ArchivePrivacyPrefix, budget: ArchiveBudget): void {
    budget.check();
    if (budget !== this.#budget || this.#started || this.#through === null) return stop("unavailable");
    this.#started = true;
    if (prefix.through.seq !== this.#through.seq || prefix.through.hash !== this.#through.hash || prefix.positions.length !== this.#rows.size
      || !samePlanMetadata(this.#basis, this.#basisSize, prefixBasis(prefix), budget)) return stop("mismatch");
    for (const position of prefix.positions) {
      const expected = this.#rows.get(position.seq)?.position;
      if (!expected || position.hash !== expected.hash || position.bytes !== expected.bytes || position.input !== expected.input) return stop("mismatch");
    }
  }
  /** Byte-derived plan, in original order with duplicates and probe choices
   * intact. Compare before any retained rule/value/snapshot body selection. */
  check(position: ArchivePrivacyPosition, plan: LocalRetainedPlan): void {
    const budget = this.#budget; budget.check();
    if (!this.#started || this.#finished || position.seq !== this.#first + this.#checked) return stop("unavailable");
    const expected = this.#rows.get(position.seq);
    const actual: ArchiveLocalReferencePlan = { dependencies: plan.dependencies,
      ancestrySnapshot: plan.ancestry ? { digest: plan.ancestry.snapshot.digest, count: plan.ancestry.snapshot.count } : null };
    if (!expected || !samePlanMetadata(expected.plan, expected.size, actual, budget)) return stop("mismatch");
    this.#checked++;
  }
  finish(): void {
    this.#budget.check();
    if (!this.#started || this.#finished || this.#checked !== this.#rows.size) return stop("unavailable");
    this.#finished = true;
  }
}
