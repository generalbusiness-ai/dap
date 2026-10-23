/** Scalar declaration planning, never byte/policy admission. Repeated
 * roots keep every original read/validation/support request. Distinct-node
 * union and fresh whole-prefix admission remain the caller's work. */
import type { Digest, Head } from "@generalbusiness/dap-contract";
import { isDigest, isHead, natural } from "@generalbusiness/dap-bytes";
import { ARCHIVE_BOUNDS, type ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import { forecastArchiveDeclarationClosure, forecastArchivePotentialDeclarationClosure,
  type ArchiveDeclarationFootprint, type ArchivePotentialDeclarationFootprint } from "./archive-declaration-scout.ts";
import { stopArchivePrefix as stop, type ArchivePosition } from "./archive-prefix.ts";

type Work = Pick<ArchiveCost, "attempts" | "calls" | "metadata" | "inputWork">;
interface Row { readonly hash: Digest; readonly work: Readonly<Work>; readonly declarations: readonly Digest[] }
interface DefinitionSize { readonly first: number; readonly bytes: number | null }
export function archiveDeclarationHandoffCost(definitions: number): Readonly<ArchiveCost> {
  if (!natural(definitions) || definitions > ARCHIVE_BOUNDS.nodes) return stop("unavailable");
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 0,
    metadata: 128 + definitions * 256, inputWork: 256 + definitions * 512 });
}
export class ArchiveDeclarationPlan {
  readonly #rows = new Map<number, Row>();
  readonly #sizes = new Map<Digest, DefinitionSize>();
  readonly #rootWork: Readonly<Work>;
  readonly #rootDeclarations: readonly Digest[];
  #blocked = false;
  constructor(readonly first: number, root: ArchiveDeclarationFootprint, readonly budget: ArchiveBudget) {
    budget.spend({ metadata: 256, inputWork: 512 });
    if (!natural(first)) stop("unavailable");
    this.#rootWork = forecastArchiveDeclarationClosure(root, budget);
    let declarations: readonly Digest[] = Object.freeze([]);
    for (const node of root.declarations) declarations = this.#remember(node.digest, node.bytes, first, declarations);
    this.#rootDeclarations = declarations;
  }
  #remember(digest: Digest, bytes: number | null, first: number, declarations: readonly Digest[]): readonly Digest[] {
    if (!isDigest(digest) || bytes !== null && (!natural(bytes) || bytes === 0)) return stop("mismatch");
    const previous = this.#sizes.get(digest);
    if (previous) {
      // A repaired or changed declaration needs a new scout. It cannot
      // silently enlarge a prefix whose earlier quote recorded absence.
      if (previous.bytes !== bytes) return stop("mismatch");
      return declarations;
    }
    if (declarations.length === ARCHIVE_BOUNDS.nodes) return stop("limit");
    this.budget.spend({ metadata: 384 + (declarations.length + 1) * 128,
      inputWork: 768 + (declarations.length + 1) * 256 });
    this.#sizes.set(digest, { first, bytes });
    return Object.freeze([...declarations, digest]);
  }
  append(position: ArchivePosition, roots: readonly ArchivePotentialDeclarationFootprint[]): void {
    try {
      this.budget.check();
      if (this.#blocked) return stop("unavailable");
      if (this.#rows.size === ARCHIVE_BOUNDS.entries) return stop("limit");
      if (!natural(position.seq) || !isDigest(position.hash) || !natural(position.bytes) || position.bytes === 0
        || position.seq !== this.first + this.#rows.size) return stop("mismatch");
      this.budget.spend({ metadata: 256, inputWork: 512 + roots.length * 128 });
      const previous = this.#rows.get(position.seq - 1), work = { ...(previous?.work ?? this.#rootWork) };
      let declarations = previous?.declarations ?? this.#rootDeclarations;
      for (const root of roots) {
        const cost = forecastArchivePotentialDeclarationClosure(root, this.budget);
        for (const key of Object.keys(work) as (keyof Work)[]) work[key] += cost[key];
        for (const node of root.requests) declarations = this.#remember(node.digest, node.bytes, position.seq, declarations);
      }
      if (!Object.values(work).every(natural)) return stop("limit");
      this.#rows.set(position.seq, { hash: position.hash, work: Object.freeze(work), declarations });
    } catch (error) { this.#blocked = true; throw error; }
  }
  #row(through: Head): Row {
    this.budget.check();
    if (!isHead(through)) return stop("mismatch");
    const row = this.#rows.get(through.seq);
    if (!row || row.hash !== through.hash) return stop("mismatch");
    return row;
  }
  /** Constant-time prefix work; declaration digests are immutable and
   * explicit so the owner can union local, native and foreign nodes. */
  quote(through: Head): Readonly<Pick<Row, "work" | "declarations">> {
    this.budget.spend({ metadata: 128, inputWork: 256 });
    const row = this.#row(through);
    return Object.freeze({ work: row.work, declarations: row.declarations });
  }
  handoffCost(additionalDefinitions = 0): Readonly<ArchiveCost> {
    this.budget.spend({ metadata: 128, inputWork: 256 });
    if (!natural(additionalDefinitions)) return stop("unavailable");
    return archiveDeclarationHandoffCost(Math.min(ARCHIVE_BOUNDS.nodes, this.#sizes.size + additionalDefinitions));
  }
  /** Includes null for visited missing candidates. All discarded lookahead
   * keys are visited/charged, but only selected-prefix sizes are returned. */
  sizes(through: Head): ReadonlyMap<Digest, number | null> {
    this.#row(through);
    this.budget.spend(archiveDeclarationHandoffCost(this.#sizes.size));
    const result = new Map<Digest, number | null>();
    for (const [digest, value] of this.#sizes) if (value.first <= through.seq) result.set(digest, value.bytes);
    return result;
  }
}
