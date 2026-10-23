/** Actual Native scalar scouting on one original pass ledger. Closed frames
 * leave only trusted grammar, bounded metadata and a one-use continuation.
 * Every selected prefix still requires fresh whole-prefix inventory. */
import type { Bounds, Digest, FactRef, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isHead, natural } from "@generalbusiness/dap-bytes";
import { type ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import { ArchiveDeclarations } from "./archive-declarations.ts";
import { ArchiveDeclarationPlan } from "./archive-declaration-plan.ts";
import { recordArchiveCurrentDeclarationClosure, recordArchivePotentialDeclarationClosure, type ArchiveDeclarationFootprint } from "./archive-declaration-scout.ts";
import { archiveEntryHeader, archiveEntryPrivacy, recordArchiveSupportMetadata, type ArchiveSupport } from "./archive-entry-metadata.ts";
import { forecastArchiveEntryPrivacy } from "./archive-entry-privacy-cost.ts";
import { ArchiveForeignMetadata, type ArchiveForeignCopy, type ArchiveForeignRecordedScan } from "./archive-foreign.ts";
import { ArchiveForeignPlan } from "./archive-foreign-plan.ts";
import { forecastArchiveForeignBasis, forecastArchiveForeignLookup, forecastArchiveForeignSelection } from "./archive-foreign-cost.ts";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";
import { archiveNativeDataReservation, forecastArchiveInventoryEntry, forecastArchiveInventoryFinal, forecastArchivePrefix } from "./archive-inventory-cost.ts";
import { ArchiveLocalReferences, type ArchiveLocalReferencePlan } from "./archive-local-references.ts";
import { ArchivePlanFence } from "./archive-plan-fence.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import type { ArchivePrivacyPosition } from "./archive-privacy.ts";
import { measureArchiveReferences, type ArchiveReferenceMeasurement } from "./archive-reference-measurements.ts";
import { ArchiveRetainedReader, archiveRetainedExpectationCost } from "./archive-retained.ts";
import { forecastArchiveRetainedPass } from "./archive-row-cost.ts";
import { ArchiveScoutLayout, type ArchiveScoutLayoutQuote } from "./archive-scout-layout.ts";
import { forecastArchiveSourceLookup } from "./archive-source-cost.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { forecastArchiveSupportMetadata } from "./archive-support-cost.ts";
import { ArchiveWindow, openArchiveWindow, openArchiveRootWindow, type ArchiveWindowCheckpoint } from "./archive-window.ts";
import type { Sql } from "./sqlite.ts";
import type { ArchiveRootMetadata } from "./archive-prefix.ts";
import { archiveEntryAnchorCandidates } from "./archive-anchor-candidates.ts";

const empty = (): ArchiveCost => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });
function add(target: ArchiveCost, cost: Partial<ArchiveCost>, times = 1): void {
  for (const key of Object.keys(target) as (keyof ArchiveCost)[]) {
    target[key] += (cost[key] ?? 0) * times;
    if (!natural(target[key])) return stop("limit");
  }
}
interface Row {
  readonly hash: Digest; readonly entryBytes: number; readonly objects: number;
  readonly anchorCandidates: number;
  readonly work: Readonly<ArchiveCost>; readonly uses: number; readonly sources: number; readonly sourceWork: Readonly<ArchiveCost>;
}
export type ArchiveScoutStep = { readonly kind: "end" | "limited" }
  | { readonly kind: "position"; readonly position: ArchivePrivacyPosition;
      readonly plan: ArchiveLocalReferencePlan; readonly measurements: readonly ArchiveReferenceMeasurement[] };
export interface ArchiveScoutFrame {
  readonly scout: ArchiveScout;
  /** Protect an earlier prefix's complete finish cost during this step.
   * A refused debit ends scouting; no completed work is refunded. */
  next(reserve?: Partial<ArchiveCost>): ArchiveScoutStep;
  /** Close before awaiting parent Git work. Every method on this frame
   * refuses after close; resume rechecks the actual Native scope. */
  close(): ArchiveScout;
}

export class ArchiveScout {
  readonly #rows = new Map<number, Row>();
  readonly #layout: ArchiveScoutLayout;
  readonly #sourceWork = empty();
  readonly #copies = new Map<Digest, Readonly<ArchiveForeignCopy>>();
  readonly #facts = new Map<string, Digest>();
  readonly #sources = new Set<string>();
  readonly #visited: Set<Digest>;
  readonly #references: ArchiveLocalReferences;
  readonly #support: ArchiveSupport;
  readonly #rootWork: Readonly<ArchiveCost>;
  readonly #rootCoupled: boolean;
  readonly #first: number;
  readonly #named: ArchiveSupport["named"];
  readonly declarations: ArchiveDeclarationPlan;
  readonly foreign: ArchiveForeignPlan;
  readonly fence: ArchivePlanFence;
  #checkpoint: ArchiveWindowCheckpoint | null = null;
  #blocked = false;
  #finished = false;
  #frameOpen = false;
  private constructor(readonly at: ScopeRef, readonly head: Head, readonly after: Head | null,
    readonly bounds: Bounds, readonly reviewed: ArchivePolicyRegistry, readonly budget: ArchiveBudget,
    window: ArchiveWindow, support: ArchiveSupport, root: ArchiveDeclarationFootprint, visited: Set<Digest>,
    readonly fixtureSources?: FixtureArchiveSourcePins, rootCoupled = false) {
    this.#rootCoupled = rootCoupled;
    budget.spend({ metadata: 512, inputWork: 1024 });
    this.#support = support; this.#named = support.named; this.#visited = visited;
    this.#first = window.base.positions[0]!.seq;
    this.declarations = new ArchiveDeclarationPlan(this.#first, root, budget);
    this.foreign = new ArchiveForeignPlan(this.#first, budget);
    this.fence = new ArchivePlanFence(window.base, budget);
    this.#references = new ArchiveLocalReferences(support, bounds, budget);
    const work = empty();
    if (!isDigest(support.named)) add(work, archiveNativeDataReservation(bounds.definitionBytes));
    add(work, forecastArchiveSupportMetadata(recordArchiveSupportMetadata(support, budget)));
    this.#rootWork = Object.freeze(work);
    this.#layout = new ArchiveScoutLayout(this.at, this.#first, root, window.sql, budget);
  }
  static open(sql: Pick<Sql, "exec">, at: ScopeRef, head: Head, after: Head | null, bounds: Bounds,
    reviewed: ArchivePolicyRegistry, budget: ArchiveBudget, fixtureSources?: FixtureArchiveSourcePins): ArchiveScoutFrame {
    return ArchiveScout.#open(sql, at, head, after, bounds, reviewed, budget, fixtureSources, false);
  }
  static openRoot(sql: Pick<Sql, "exec">, at: ScopeRef, head: Head, after: Head | null, bounds: Bounds,
    reviewed: ArchivePolicyRegistry, budget: ArchiveBudget, fixtureSources?: FixtureArchiveSourcePins): ArchiveScoutFrame {
    return ArchiveScout.#open(sql, at, head, after, bounds, reviewed, budget, fixtureSources, true);
  }
  static #open(sql: Pick<Sql, "exec">, at: ScopeRef, head: Head, after: Head | null, bounds: Bounds,
    reviewed: ArchivePolicyRegistry, budget: ArchiveBudget, fixtureSources: FixtureArchiveSourcePins | undefined, coupled: boolean): ArchiveScoutFrame {
    const finish = (window: ArchiveWindow, completed?: ArchiveRootMetadata): ArchiveScoutFrame => {
      const named = window.base.pin.seed.definition, policy = reviewed.get(named);
      if (!policy || !policy.review || policy.review.length > 512 || policy.support.named !== named) return stop("unsupported-archive-cohort");
      const visited = completed?.visited ?? new Set<Digest>(), declarations = completed?.declarations ?? new ArchiveDeclarations(new ArchiveRetainedReader(sql, budget), bounds, reviewed, visited);
      const { definition } = completed ?? declarations.root(named);
      const root = recordArchiveCurrentDeclarationClosure(declarations, definition.digest);
      const scout = new ArchiveScout(Object.freeze({ ...at }), Object.freeze({ ...head }), after && Object.freeze({ ...after }),
        Object.freeze({ ...bounds }), reviewed, budget, window, { ...policy.support, definition }, root, visited, fixtureSources, completed !== undefined);
      return scout.#frame(window);
    };
    if (coupled) {
      const completed = openArchiveRootWindow(sql, at, head, after, bounds, budget, reviewed);
      return finish(completed.window, completed.root);
    }
    return finish(openArchiveWindow(sql, at, head, after, bounds, budget, { has: digest => reviewed.has(digest) }));
  }
  #source(fact: FactRef): Readonly<ArchiveForeignCopy> | null {
    this.budget.spend(forecastArchiveForeignLookup());
    const content = this.#facts.get(canonicalize(fact));
    return content === undefined ? null : this.#copies.get(content) ?? null;
  }
  #recordCopies(scan: Readonly<ArchiveForeignRecordedScan>): void {
    for (const request of scan.requests) if (request.kind === "cold") {
      const prior = this.#copies.get(request.content), copy = request.copy, key = canonicalize(copy.fact);
      if (prior) {
        if (prior.bytes !== copy.bytes || prior.pin !== copy.pin || canonicalize(prior.fact) !== key) return stop("foreign-source-mismatch");
        continue;
      }
      const oldContent = this.#facts.get(key);
      if (oldContent !== undefined && oldContent !== request.content) return stop("foreign-source-mismatch");
      const policy = this.reviewed.get(copy.pin);
      if (!policy) return stop("unsupported-archive-cohort");
      this.budget.spend({ metadata: 1024, inputWork: 2048 });
      this.#copies.set(request.content, Object.freeze({ content: request.content, bytes: copy.bytes, fact: copy.fact,
        pin: copy.pin, under: policy.support.definition.declared.name }));
      this.#facts.set(key, request.content);
      const source = canonicalize(copy.fact.at);
      if (!this.#sources.has(source)) {
        this.budget.spend({ metadata: 128, inputWork: 256 });
        add(this.#sourceWork, forecastArchiveSourceLookup(request.footprint.declarationUnits));
        this.#sources.add(source);
      }
    }
  }
  #advance(window: ArchiveWindow, reader: ArchiveRetainedReader, declarations: ArchiveDeclarations,
    foreign: ArchiveForeignMetadata | undefined, reserve: Partial<ArchiveCost>): ArchiveScoutStep {
    const next = window.next(reserve);
    if (next.kind !== "position") return next;
    const position = next.position, source = { kind: "local" as const, position }, budget = this.budget;
    const header = archiveEntryHeader(window.sql, source, budget), previous = this.#rows.get(position.seq - 1);
    if (header.seq !== position.seq || header.at.scope !== this.at.scope || header.at.inc !== this.at.inc || header.at.kind !== this.at.kind) return stop("mismatch");
    const previousHash = previous?.hash ?? this.after?.hash ?? null;
    if (header.prev !== previousHash) return stop("mismatch");
    if (!this.reviewed.get(this.#named)!.entryTypes.has(header.input)) return stop("unsupported-archive-cohort");
    let scan: Readonly<ArchiveForeignRecordedScan> | null = null;
    if (header.uses) {
      if (!foreign) return stop("unsupported-foreign-copy");
      foreign.scan(position, header.uses); scan = foreign.recorded(position); this.#recordCopies(scan);
    }
    archiveEntryPrivacy(window.sql, source, header, this.#support, budget);
    const candidates = archiveEntryAnchorCandidates(window.sql, position, this.bounds.entryBytes, budget);
    this.foreign.append(position, header.uses, scan);
    const classified = Object.freeze({ ...position, input: header.input });
    const plan = this.#references.read(window.sql, this.at, classified, { source: fact => this.#source(fact) });
    const roots = [];
    for (const { dependency } of plan.dependencies) {
      if (dependency.mode === "required" && dependency.key.kind === "definition") {
        const root = recordArchivePotentialDeclarationClosure(declarations, dependency.key.digest);
        if (!root.complete) return stop("incomplete"); roots.push(root);
      } else if (dependency.mode === "probe") for (const { key } of dependency.choices) if (key.kind === "definition") roots.push(recordArchivePotentialDeclarationClosure(declarations, key.digest));
    }
    this.declarations.append(position, roots);
    for (const { dependency } of plan.dependencies) {
      const keys = dependency.mode === "text" ? [] : dependency.mode === "probe" ? dependency.choices.map(choice => choice.key) : [dependency.key];
      for (const key of keys) if (key.kind === "entry") {
        const copy = this.#copies.get(key.digest);
        if (!copy) return stop("unsupported-foreign-copy"); reader.registerCopy(copy);
      }
    }
    const measured = measureArchiveReferences(reader, plan.dependencies, this.bounds, true);
    this.fence.append(classified, plan);
    const reads = this.#layout.append(window.sql, classified, plan, measured.measurements, roots);
    const privacy = forecastArchiveEntryPrivacy(header);
    if (!privacy.ok) return stop("limit");
    const work = { ...(previous?.work ?? this.#rootWork) };
    add(work, privacy.cost); add(work, forecastArchiveInventoryEntry(position.bytes)); add(work, reads);
    const deliveryLookup = header.input === "delivery" && Object.values(this.#support.definition.declared.receives).some(handler => handler.from.under !== undefined);
    add(work, forecastArchiveForeignLookup(), header.uses + Number(deliveryLookup));
    budget.spend({ metadata: 384, inputWork: 768 });
    const anchorCandidates = (previous?.anchorCandidates ?? 0) + candidates;
    if (!natural(anchorCandidates)) return stop("limit");
    this.#rows.set(position.seq, { hash: position.hash, entryBytes: (previous?.entryBytes ?? 0) + position.bytes,
      anchorCandidates,
      objects: this.#layout.objects, work: Object.freeze(work), uses: (previous?.uses ?? 0) + header.uses, sources: this.#sources.size,
      sourceWork: Object.freeze({ ...this.#sourceWork }) });
    return { kind: "position", position: classified, plan, measurements: measured.measurements };
  }
  #frame(window: ArchiveWindow): ArchiveScoutFrame {
    let closed = false;
    const check = () => { this.budget.check(); if (closed || this.#finished) return stop("unavailable"); };
    const reader = new ArchiveRetainedReader(window.sql, this.budget);
    const declarations = new ArchiveDeclarations(reader, this.bounds, this.reviewed, this.#visited);
    const foreign = this.fixtureSources ? new ArchiveForeignMetadata(window.sql, this.fixtureSources, this.reviewed, this.bounds,
      this.budget, this.#visited, this.#named, { record: true }) : undefined;
    this.#frameOpen = true;
    return Object.freeze({ scout: this,
      next: (reserve: Partial<ArchiveCost> = {}): ArchiveScoutStep => {
        check(); if (this.#blocked) return stop("unavailable");
        try {
          const result = this.budget.lookahead(reserve, () => this.#advance(window, reader, declarations, foreign, reserve));
          if (result.kind === "limited") { this.#blocked = true; return result; }
          if (result.value.kind === "limited") this.#blocked = true;
          return result.value;
        } catch (error) { this.#blocked = true; throw error; }
      },
      close: (): ArchiveScout => { check(); this.#checkpoint = window.checkpoint(); closed = true; this.#frameOpen = false; return this; },
    });
  }
  resume(sql: Pick<Sql, "exec">): ArchiveScoutFrame {
    this.budget.check();
    const checkpoint = this.#checkpoint; this.#checkpoint = null;
    if (!checkpoint || this.#finished || this.#blocked) return stop("unavailable");
    return this.#frame(ArchiveWindow.resume(sql, checkpoint));
  }
  #row(through: Head): Row {
    this.budget.check();
    if (!isHead(through)) return stop("mismatch");
    const row = this.#rows.get(through.seq);
    if (!row || row.hash !== through.hash) return stop("mismatch");
    return row;
  }
  /** Future fresh inventory only, including every possible retained probe
   * and closure. Quoting pays bookkeeping; it never prepays admission. */
  inventoryCost(through: Head): Readonly<ArchiveCost> {
    this.budget.spend({ metadata: 256, inputWork: 512 });
    const row = this.#row(through), prefix = forecastArchivePrefix({ entries: through.seq - this.#first + 1,
      entryBytes: row.entryBytes, afterReceipt: this.after !== null, nativeData: !isDigest(this.#named) && !this.#rootCoupled, definitionBytes: this.bounds.definitionBytes });
    if (!prefix.ok) return stop("limit");
    const declarations = this.declarations.quote(through), foreign = this.foreign.quote(through), work = { ...row.work };
    this.budget.spend({ metadata: 128 * (declarations.declarations.length + foreign.declarations.length),
      inputWork: 256 * (declarations.declarations.length + foreign.declarations.length) });
    const nodes = new Set([...declarations.declarations, ...foreign.declarations]);
    if (!isDigest(this.#named)) nodes.delete(this.#support.definition.digest);
    // Every narrowed final read/omission pays the new size fence. Extra
    // lookup attempts in row.work are conservatively included as well.
    add(work, archiveRetainedExpectationCost(), declarations.work.attempts + row.work.attempts);
    add(work, { nodes: nodes.size }); add(work, prefix.cost); add(work, declarations.work); add(work, foreign.work);
    add(work, this.fence.comparisonCost(through)); add(work, forecastArchiveRetainedPass(), row.objects);
    add(work, forecastArchiveForeignSelection(foreign.copies));
    add(work, { metadata: foreign.copies * 512, inputWork: foreign.copies * 1024 });
    add(work, forecastArchiveForeignLookup(), foreign.copies); // add() of each selected copied entry
    add(work, forecastArchiveForeignBasis(row.sources)); add(work, forecastArchiveInventoryFinal(this.after !== null));
    return Object.freeze(work);
  }
  /** Possible Git output and Native immutable-input work. This retains
   * every present probe choice; final byte validation alone selects keys. */
  layout(through: Head): ArchiveScoutLayoutQuote {
    const row = this.#row(through), quote = this.#layout.quote(through, row.sources, row.anchorCandidates), copies = this.foreign.quote(through).copies;
    const input = empty(); add(input, quote.input); add(input, row.sourceWork);
    add(input, { metadata: row.sources * 512 + copies * 512, inputWork: row.sources * 1024 + copies * 1024 });
    return Object.freeze({ ...quote, input: Object.freeze(input) });
  }
  /** Exact handoff/pruning work after the final candidate. Earlier-prefix
   * lookahead must instead protect the fixed maximum cardinalities. */
  selectionCost(through: Head): Readonly<ArchiveCost> {
    this.#row(through);
    const work = empty();
    add(work, this.declarations.handoffCost()); add(work, this.foreign.handoffCost());
    add(work, this.#layout.handoffCost()); add(work, this.fence.sealCost(through));
    return Object.freeze(work);
  }
  /** Choose once, after closing the last frame. Discarded candidate state
   * remains charged. Caller must separately reserve handoffs and pruning. */
  select(through: Head): { readonly forecast: ArchivePlanFence;
    readonly declarationSizes: ReadonlyMap<Digest, number | null>;
    readonly expectedCopies: ReturnType<ArchiveForeignPlan["expectedCopies"]>; readonly retainedSizes: ReadonlyMap<string, number | null> } {
    this.#row(through);
    if (this.#frameOpen || this.#finished) return stop("unavailable");
    const declarationSizes = this.declarations.sizes(through), expectedCopies = this.foreign.expectedCopies(through), retainedSizes = this.#layout.sizes(through);
    this.fence.seal(through); this.#finished = true; this.#checkpoint = null;
    return { forecast: this.fence, declarationSizes, expectedCopies, retainedSizes };
  }
}
