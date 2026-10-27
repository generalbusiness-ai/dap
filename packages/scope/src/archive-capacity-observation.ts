/** Temporary numeric archive diagnostic. It grants no work or admission.
 * Its allocations and stack inspection can affect the original deadline.
 * Only validated target digests and closed numeric geometry are retained.
 * Bodies, SQL and archive path names never enter its state. */
import type { Digest } from "@generalbusiness/dap-contract";
import { isDigest, natural } from "@generalbusiness/dap-bytes";
import { ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";

const AXES = ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const;
const MAX_SITES = 64, MAX_REFUSALS = 16, MAX_FRAMES = 2;
const FLAGS = { unknownSite: 1, sites: 2, refusals: 4, malformed: 8, observer: 16, counter: 32, ledger: 64, custom: 128 } as const;
const zero = (): ArchiveCost => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });
type NumericFields<K extends string> = Readonly<Partial<Record<K, number>>>;
type CostFields<K extends string> = Readonly<Partial<Record<K, Readonly<Partial<ArchiveCost>>>>>;
export const ARCHIVE_FINISH_SCALARS = Object.freeze([
  "stage", "oldRowBytes", "rowContextBytes", "parentObjects", "parentBytes", "parentPresent", "maximum", "legacyAnchors",
  "anchors", "totalAnchors", "publicationUnits", "scopeBase", "scopes", "replayScopesPresent", "atomicFirstAttempt", "pending",
  "entries", "entryBytes", "objects", "copies", "anchorCandidates", "manifestRows", "manifestBytes", "selectionUnits",
  "measuredOmissions", "orderingInputWork", "newRetained", "retainedBytes", "retainedNameUnits", "origins", "files", "format",
] as const);
export const ARCHIVE_FINISH_COSTS = Object.freeze(["setup", "inventory", "input", "sourceLookups", "publication", "selectionReservation", "selection", "body",
  "patch", "commit", "appendEdges", "append", "transfer", "rows", "frontier", "total"] as const);
const LAYOUT_PARTS = ["used", "limits", "patch", "body", "commit"] as const;
const LAYOUT_AXES = ["objects", "trees", "files", "names", "depth", "objectBytes", "outputWork"] as const;
export interface ArchiveFinishQuoteGeometry {
  readonly throughSeq: number;
  readonly throughHash?: Digest;
  readonly scalars?: NumericFields<typeof ARCHIVE_FINISH_SCALARS[number]>;
  readonly costs?: CostFields<typeof ARCHIVE_FINISH_COSTS[number]>;
  readonly layout?: Readonly<Partial<Record<typeof LAYOUT_PARTS[number], NumericFields<typeof LAYOUT_AXES[number]>>>>;
}
const TERMINAL_SCALARS = ["strategy", "state", "reason", "refusalKind", "refusalSite", "metadataMargin", "selectedSeq", "selectedEntries"] as const;
const TERMINAL_COSTS = ["cost", "fixedUsed", "fixedRemaining", "refusalRequested", "refusalReserved", "refusalUsed", "refusalLimit", "refusalShortfall"] as const;
export interface ArchiveTerminalGeometry {
  readonly throughSeq: number | null;
  readonly throughHash?: Digest;
  readonly scalars?: NumericFields<typeof TERMINAL_SCALARS[number]>;
  readonly costs?: CostFields<typeof TERMINAL_COSTS[number]>;
}
export interface ArchiveRowContextGeometry {
  readonly oldRowBytes: number; readonly rowContextBytes: number; readonly snapshotConsumed: boolean;
}
interface CapturedQuote extends ArchiveFinishQuoteGeometry { readonly admitted: ArchiveCost | null }
type Frame = readonly [code: number, line: number, column: number];
interface Site {
  readonly frames: readonly Frame[];
  debitCalls: number; debitReturned: number; debitThrew: number;
  affordabilityCalls: number; affordabilityPassed: number; affordabilityRefused: number; affordabilityThrew: number;
  readonly attemptedDebit: ArchiveCost; readonly admittedDelta: ArchiveCost; readonly attemptedAffordability: ArchiveCost;
  readonly settlementReduction: ArchiveCost;
}
interface FinishDebitAttribution {
  readonly flags: number; readonly complete: boolean; readonly ledgerReconciled: boolean;
  readonly admitted: Readonly<ArchiveCost> | null;
  readonly admittedDelta: Readonly<ArchiveCost>; readonly unattributedAdmittedDelta: Readonly<ArchiveCost>;
  readonly debitCalls: number; readonly droppedSiteCalls: number;
  readonly reservationCalls: number; readonly settlementCalls: number; readonly settlementThrew: number;
  readonly settlementReduction: Readonly<ArchiveCost>; readonly unattributedSettlementReduction: Readonly<ArchiveCost>;
  readonly sites: readonly { readonly frames: readonly Frame[]; readonly debitCalls: number; readonly admittedDelta: Readonly<ArchiveCost>;
    readonly settlementReduction: Readonly<ArchiveCost> }[];
}
interface Reservation {
  readonly owner: Site | null; readonly charge: ArchiveCost;
  settled: boolean;
}
interface Refusal {
  readonly operation: 0 | 1; readonly frames: readonly Frame[] | null;
  readonly requested: ArchiveCost | null; readonly before: ArchiveCost | null; readonly after: ArchiveCost | null;
  readonly result: 0 | 1; readonly error: 0 | 1 | 2 | 3;
}
interface State {
  readonly observed: boolean;
  flags: number; depth: number; debitCalls: number; affordabilityCalls: number; droppedSiteCalls: number; droppedRefusals: number;
  rowContextCalls: number; quoteCalls: number; selectionCalls: number; distinctSelections: number; selectedThroughSeq: number | null;
  readonly admittedDelta: ArchiveCost; readonly unattributedAdmittedDelta: ArchiveCost;
  reservationCalls: number; settlementCalls: number; settlementThrew: number;
  readonly settlementReduction: ArchiveCost; readonly unattributedSettlementReduction: ArchiveCost;
  readonly reservations: WeakMap<object, Reservation>;
  readonly sites: Map<string, Site>; readonly refusals: Refusal[];
  rowContext: ArchiveRowContextGeometry | null; rowContextAdmitted: ArchiveCost | null;
  firstQuote: CapturedQuote | null; lastQuote: CapturedQuote | null; selectedQuote: CapturedQuote | null;
  firstFinishAttribution: FinishDebitAttribution | null;
}
const states = new WeakMap<ArchiveBudget, State>();
const nativeAdmitted = ArchiveBudget.prototype.admitted;

// Stable public source enum: index + 1. Code 0 is this exact bundled module.
// Associate code 0 coordinates with the capture build's own source map offline.
// A source not in this table (and not this module's bundle) is unattributed.
const PUBLIC_CODE_FILES = [
  "packages/git/src/archive-policy.ts",
  "packages/git/src/journal-anchor-legacy-count.ts",
  "packages/git/src/journal-anchor-legacy.ts",
  "packages/git/src/journal-anchors.ts",
  "packages/git/src/journal-append-cost.ts",
  "packages/git/src/journal-closure.ts",
  "packages/git/src/journal-commit-cost.ts",
  "packages/git/src/journal-files.ts",
  "packages/git/src/journal-layout.ts",
  "packages/git/src/journal-local.ts",
  "packages/git/src/journal-manifest.ts",
  "packages/git/src/journal-object-cost.ts",
  "packages/git/src/journal-objects.ts",
  "packages/git/src/journal-pass-cost.ts",
  "packages/git/src/journal-path.ts",
  "packages/git/src/journal-reader-any.ts",
  "packages/git/src/journal-reader.ts",
  "packages/git/src/journal-segments.ts",
  "packages/git/src/journal-selection-cost.ts",
  "packages/git/src/journal-selection.ts",
  "packages/git/src/journal-v2-append.ts",
  "packages/git/src/journal-v2-convert.ts",
  "packages/git/src/journal-v2-frontier.ts",
  "packages/git/src/journal-v2-layout.ts",
  "packages/git/src/journal-v2-manifest.ts",
  "packages/git/src/journal-v2-parent.ts",
  "packages/git/src/journal-v2-path.ts",
  "packages/git/src/journal-v2-preparation.ts",
  "packages/git/src/journal-v2-reader.ts",
  "packages/git/src/journal-v2-tree.ts",
  "packages/git/src/journal-work.ts",
  "packages/git/src/journal.ts",
  "packages/scope/src/archive-act-fields.ts",
  "packages/scope/src/archive-adaptive.ts",
  "packages/scope/src/archive-anchor-candidates.ts",
  "packages/scope/src/archive-anchors.ts",
  "packages/scope/src/archive-bootstrap-cost.ts",
  "packages/scope/src/archive-budget.ts",
  "packages/scope/src/archive-build.ts",
  "packages/scope/src/archive-cutoff.ts",
  "packages/scope/src/archive-declaration-plan.ts",
  "packages/scope/src/archive-declaration-scout.ts",
  "packages/scope/src/archive-declarations.ts",
  "packages/scope/src/archive-delivery-fields.ts",
  "packages/scope/src/archive-digest-fields.ts",
  "packages/scope/src/archive-driver.ts",
  "packages/scope/src/archive-entry-metadata.ts",
  "packages/scope/src/archive-entry-privacy-cost.ts",
  "packages/scope/src/archive-finish-cost.ts",
  "packages/scope/src/archive-fixed-layout.ts",
  "packages/scope/src/archive-foreign-cost.ts",
  "packages/scope/src/archive-foreign-plan.ts",
  "packages/scope/src/archive-foreign.ts",
  "packages/scope/src/archive-frontier-cost.ts",
  "packages/scope/src/archive-frontier-store.ts",
  "packages/scope/src/archive-genesis-fields.ts",
  "packages/scope/src/archive-host-item.ts",
  "packages/scope/src/archive-host.ts",
  "packages/scope/src/archive-input-cost.ts",
  "packages/scope/src/archive-input.ts",
  "packages/scope/src/archive-inventory-cost.ts",
  "packages/scope/src/archive-inventory.ts",
  "packages/scope/src/archive-local-references.ts",
  "packages/scope/src/archive-membership-copy.ts",
  "packages/scope/src/archive-native-root.ts",
  "packages/scope/src/archive-observed.ts",
  "packages/scope/src/archive-operator.ts",
  "packages/scope/src/archive-outcome-values.ts",
  "packages/scope/src/archive-parent-read-diagnostic.ts",
  "packages/scope/src/archive-parent.ts",
  "packages/scope/src/archive-pin.ts",
  "packages/scope/src/archive-plan-fence.ts",
  "packages/scope/src/archive-prefix.ts",
  "packages/scope/src/archive-prepared.ts",
  "packages/scope/src/archive-privacy.ts",
  "packages/scope/src/archive-publication.ts",
  "packages/scope/src/archive-reference-measurements.ts",
  "packages/scope/src/archive-restart.ts",
  "packages/scope/src/archive-retained-pass.ts",
  "packages/scope/src/archive-retained.ts",
  "packages/scope/src/archive-row-cost.ts",
  "packages/scope/src/archive-row.ts",
  "packages/scope/src/archive-schema-cost.ts",
  "packages/scope/src/archive-scout-layout.ts",
  "packages/scope/src/archive-scout.ts",
  "packages/scope/src/archive-send.ts",
  "packages/scope/src/archive-snapshots.ts",
  "packages/scope/src/archive-source-cost.ts",
  "packages/scope/src/archive-source-pins.ts",
  "packages/scope/src/archive-source-window.ts",
  "packages/scope/src/archive-support-cost.ts",
  "packages/scope/src/archive-target.ts",
  "packages/scope/src/archive-text.ts",
  "packages/scope/src/archive-transfer-cost.ts",
  "packages/scope/src/archive-value-policy.ts",
  "packages/scope/src/archive-window.ts",
  "packages/scope/test/archive-capacity-observation.test.ts",
] as const;
const publicCodes = new Map<string, number>(PUBLIC_CODE_FILES.map((path, index) => [path, index + 1]));
const budgetCode = publicCodes.get("packages/scope/src/archive-budget.ts");
function coordinates(): readonly Frame[] | null {
  try {
    const stack = new Error().stack;
    if (typeof stack !== "string") return null;
    const frames: Frame[] = [];
    let skipped = 0, ownFile: string | null = null;
    for (const line of stack.split("\n")) {
      const match = /^\s*at (?:.* \()?(.+):(\d+):(\d+)\)?$/.exec(line);
      if (!match) continue;
      // workerd can omit import.meta.url. The first frame is this fresh
      // Error's own coordinates() frame, so it identifies this exact bundle.
      ownFile ??= match[1]!.replace(/^file:\/\//, "");
      // coordinates(), then the observed spend/reserve/canSpend method.
      if (skipped++ < 2) continue;
      const file = match[1]!.replace(/^file:\/\//, ""), row = Number(match[2]), column = Number(match[3]);
      if (!natural(row) || row === 0 || !natural(column) || column === 0) break;
      const path = /(packages\/(?:scope|git)\/(?:src|test)\/[A-Za-z0-9._/-]+\.[cm]?[jt]s)$/.exec(file)?.[1];
      const code = file === ownFile ? 0 : path === undefined ? undefined : publicCodes.get(path);
      if (code === undefined) break;
      frames.push(Object.freeze([code, row, column]));
      // A direct debit is one charge site. The shared native SQL wrapper
      // needs its immediate caller to identify which read is being charged.
      if (frames.length === 1 && code !== budgetCode && code !== 0) break;
      if (frames.length === MAX_FRAMES) break;
    }
    return frames.length ? Object.freeze(frames) : null;
  } catch { return null; }
}
function fresh(observed: boolean): State {
  return { observed, flags: observed ? 0 : FLAGS.custom, depth: 0, debitCalls: 0, affordabilityCalls: 0, droppedSiteCalls: 0, droppedRefusals: 0,
    reservationCalls: 0, settlementCalls: 0, settlementThrew: 0, settlementReduction: zero(), unattributedSettlementReduction: zero(), reservations: new WeakMap(),
    rowContextCalls: 0, quoteCalls: 0, selectionCalls: 0, distinctSelections: 0, selectedThroughSeq: null,
    admittedDelta: zero(), unattributedAdmittedDelta: zero(), sites: new Map(), refusals: [], rowContext: null, rowContextAdmitted: null,
    firstQuote: null, lastQuote: null, selectedQuote: null, firstFinishAttribution: null };
}
function safely(state: State, work: () => void): void { try { work(); } catch { state.flags |= FLAGS.observer; } }
function count(state: State, value: number): number {
  if (natural(value + 1)) return value + 1;
  state.flags |= FLAGS.counter; return value;
}
function fields(value: unknown, allowed: readonly string[]): Record<string, PropertyDescriptor> | null {
  if (value === null || typeof value !== "object") return null;
  const own = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(own).some(key => typeof key !== "string" || !allowed.includes(key))
    || Object.values(own).some(field => !Object.hasOwn(field, "value"))) return null;
  return own;
}
function numbers<K extends string>(value: unknown, allowed: readonly K[]): Partial<Record<K, number>> | null {
  const own = fields(value, allowed); if (own === null) return null;
  const out: Partial<Record<K, number>> = {};
  for (const key of allowed) if (own[key]) {
    const value: unknown = own[key]!.value;
    if (!natural(value)) return null;
    out[key] = value;
  }
  return out;
}
function vector(value: unknown, complete = false): ArchiveCost | null {
  const own = fields(value, AXES); if (own === null) return null;
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype) return null;
  const out = zero();
  for (const key of AXES) {
    if (!own[key]) {
      if (complete || Object.hasOwn(Object.prototype, key)) return null;
      continue;
    }
    const value: unknown = own[key]!.value;
    if (!natural(value)) return null;
    out[key] = value;
  }
  return out;
}
function costs<K extends string>(value: unknown, allowed: readonly K[]): Partial<Record<K, ArchiveCost>> | null {
  const own = fields(value, allowed); if (own === null) return null;
  const out: Partial<Record<K, ArchiveCost>> = {};
  for (const key of allowed) if (own[key]) {
    const copy = vector(own[key]!.value); if (copy === null) return null;
    out[key] = Object.freeze(copy);
  }
  return out;
}
function add(target: ArchiveCost, amount: ArchiveCost): boolean {
  if (AXES.some(axis => !natural(target[axis] + amount[axis]))) return false;
  for (const axis of AXES) target[axis] += amount[axis];
  return true;
}
function subtract(target: ArchiveCost, amount: ArchiveCost): boolean {
  if (AXES.some(axis => !natural(target[axis] - amount[axis]))) return false;
  for (const axis of AXES) target[axis] -= amount[axis];
  return true;
}
function delta(before: ArchiveCost | null, after: ArchiveCost | null): ArchiveCost | null {
  if (before === null || after === null) return null;
  const out = zero();
  for (const axis of AXES) { out[axis] = after[axis] - before[axis]; if (!natural(out[axis])) return null; }
  return out;
}
const frozenCost = (value: Readonly<ArchiveCost>): Readonly<ArchiveCost> => Object.freeze({ ...value });
const frozenFrames = (frames: readonly Frame[]): readonly Frame[] => Object.freeze(frames.map(frame => Object.freeze([...frame] as const)));
function finishAttribution(state: State, actual: ArchiveCost | null): FinishDebitAttribution {
  const attributed = zero(); let sumValid = true;
  for (const site of state.sites.values()) if (!add(attributed, site.admittedDelta)) sumValid = false;
  if (!add(attributed, state.unattributedAdmittedDelta)) sumValid = false;
  const ledgerReconciled = actual !== null && sumValid
    && AXES.every(axis => actual[axis] === state.admittedDelta[axis] && actual[axis] === attributed[axis]);
  if (!ledgerReconciled) state.flags |= FLAGS.ledger;
  return Object.freeze({ flags: state.flags, complete: state.flags === 0, ledgerReconciled,
    admitted: actual === null ? null : frozenCost(actual), admittedDelta: frozenCost(state.admittedDelta),
    unattributedAdmittedDelta: frozenCost(state.unattributedAdmittedDelta), debitCalls: state.debitCalls,
    reservationCalls: state.reservationCalls, settlementCalls: state.settlementCalls, settlementThrew: state.settlementThrew,
    settlementReduction: frozenCost(state.settlementReduction), unattributedSettlementReduction: frozenCost(state.unattributedSettlementReduction),
    droppedSiteCalls: state.droppedSiteCalls, sites: Object.freeze([...state.sites.values()].map(site => Object.freeze({
      frames: frozenFrames(site.frames), debitCalls: site.debitCalls, admittedDelta: frozenCost(site.admittedDelta),
      settlementReduction: frozenCost(site.settlementReduction) }))) });
}
function admitted(budget: ArchiveBudget, state: State): ArchiveCost | null {
  try {
    const out = vector(nativeAdmitted.call(budget), true);
    if (out === null) state.flags |= FLAGS.malformed;
    return out;
  } catch { state.flags |= FLAGS.observer; return null; }
}
function errorCode(error: unknown): 0 | 1 | 2 | 3 {
  if (error === null || typeof error !== "object") return 0;
  const own = Object.getOwnPropertyDescriptor(error, "reason");
  if (!own || !Object.hasOwn(own, "value")) return 0;
  return own.value === "limit" ? 1 : own.value === "timeout" ? 2 : own.value === "unavailable" ? 3 : 0;
}
function site(state: State, frames: readonly Frame[] | null): Site | null {
  if (frames === null) { state.flags |= FLAGS.unknownSite; return null; }
  const key = frames.map(frame => frame.join(":")).join("/");
  const found = state.sites.get(key); if (found) return found;
  if (state.sites.size === MAX_SITES) {
    state.flags |= FLAGS.sites; state.droppedSiteCalls = count(state, state.droppedSiteCalls); return null;
  }
  const out: Site = { frames, debitCalls: 0, debitReturned: 0, debitThrew: 0, affordabilityCalls: 0, affordabilityPassed: 0,
    affordabilityRefused: 0, affordabilityThrew: 0, attemptedDebit: zero(), admittedDelta: zero(), attemptedAffordability: zero(), settlementReduction: zero() };
  state.sites.set(key, out); return out;
}
function record(state: State, operation: 0 | 1, frames: readonly Frame[] | null, cost: unknown,
  before: ArchiveCost | null, after: ArchiveCost | null, returned: boolean, result: unknown, error: unknown): Site | null {
  const requested = vector(cost), change = delta(before, after), owner = site(state, frames);
  if (requested === null || change === null) state.flags |= FLAGS.malformed;
  if (operation === 0) {
    state.debitCalls = count(state, state.debitCalls);
    if (change !== null && !add(state.admittedDelta, change)) state.flags |= FLAGS.counter;
    if (owner === null && change !== null && !add(state.unattributedAdmittedDelta, change)) state.flags |= FLAGS.counter;
    if (owner) {
      owner.debitCalls = count(state, owner.debitCalls);
      if (returned) owner.debitReturned = count(state, owner.debitReturned); else owner.debitThrew = count(state, owner.debitThrew);
      if (requested !== null && !add(owner.attemptedDebit, requested)) state.flags |= FLAGS.counter;
      if (change !== null && !add(owner.admittedDelta, change)) state.flags |= FLAGS.counter;
    }
  } else {
    state.affordabilityCalls = count(state, state.affordabilityCalls);
    if (change !== null && AXES.some(axis => change[axis] !== 0)) state.flags |= FLAGS.ledger;
    if (owner) {
      owner.affordabilityCalls = count(state, owner.affordabilityCalls);
      if (!returned) owner.affordabilityThrew = count(state, owner.affordabilityThrew);
      else if (result === true) owner.affordabilityPassed = count(state, owner.affordabilityPassed);
      else owner.affordabilityRefused = count(state, owner.affordabilityRefused);
      if (requested !== null && !add(owner.attemptedAffordability, requested)) state.flags |= FLAGS.counter;
    }
  }
  if (!returned || operation === 1 && result !== true) {
    if (state.refusals.length === MAX_REFUSALS) { state.flags |= FLAGS.refusals; state.droppedRefusals = count(state, state.droppedRefusals); }
    else state.refusals.push({ operation, frames, requested, before, after, result: returned ? 0 : 1, error: returned ? 0 : errorCode(error) });
  }
  return owner;
}
function settlement(state: State, handle: object, before: ArchiveCost | null, after: ArchiveCost | null, returned: boolean): void {
  state.settlementCalls = count(state, state.settlementCalls);
  if (!returned) state.settlementThrew = count(state, state.settlementThrew);
  // Settlement is a reduction. Keep the existing nonnegative debit vectors
  // net of that reduction, attributed to the original reservation's site.
  const reduction = delta(after, before), reserved = state.reservations.get(handle);
  if (reduction === null || AXES.some(axis => axis !== "metadata" && axis !== "inputWork" && reduction[axis] !== 0)) {
    state.flags |= FLAGS.malformed; return;
  }
  const changed = AXES.some(axis => reduction[axis] !== 0);
  if (!returned || !reserved || reserved.settled) {
    if (changed) state.flags |= FLAGS.ledger;
    return;
  }
  reserved.settled = true;
  const owner = reserved.owner, net = owner?.admittedDelta ?? state.unattributedAdmittedDelta;
  if (AXES.some(axis => reduction[axis] > reserved.charge[axis] || reduction[axis] > net[axis] || reduction[axis] > state.admittedDelta[axis])
    || !AXES.every(axis => natural(state.settlementReduction[axis] + reduction[axis])
      && natural((owner?.settlementReduction ?? state.unattributedSettlementReduction)[axis] + reduction[axis]))) {
    state.flags |= FLAGS.ledger; return;
  }
  subtract(state.admittedDelta, reduction); subtract(net, reduction);
  add(state.settlementReduction, reduction);
  add(owner?.settlementReduction ?? state.unattributedSettlementReduction, reduction);
}
class ObservedArchiveBudget extends ArchiveBudget {
  override spend(cost: Partial<ArchiveCost>): void {
    const state = states.get(this);
    if (!state || !state.observed || state.depth > 0) return super.spend(cost);
    const before = admitted(this, state), frames = coordinates();
    let returned = false, error: unknown;
    state.depth++;
    try { const result = super.spend(cost); returned = true; return result; }
    catch (caught) { error = caught; throw caught; }
    finally {
      state.depth--;
      safely(state, () => record(state, 0, frames, cost, before, admitted(this, state), returned, undefined, error));
    }
  }
  override reserve(cost: Partial<ArchiveCost>): object {
    const state = states.get(this);
    if (!state || !state.observed || state.depth > 0) return super.reserve(cost);
    const before = admitted(this, state), frames = coordinates();
    let returned = false, handle: object | undefined, error: unknown;
    state.depth++;
    try { handle = super.reserve(cost); returned = true; return handle; }
    catch (caught) { error = caught; throw caught; }
    finally {
      state.depth--;
      safely(state, () => {
        state.reservationCalls = count(state, state.reservationCalls);
        const after = admitted(this, state), owner = record(state, 0, frames, cost, before, after, returned, undefined, error);
        const charge = delta(before, after);
        if (returned && handle !== undefined && charge !== null) state.reservations.set(handle, { owner, charge, settled: false });
      });
    }
  }
  override settle(handle: object, received: number): void {
    const state = states.get(this);
    if (!state || !state.observed || state.depth > 0) return super.settle(handle, received);
    const before = admitted(this, state);
    let returned = false;
    state.depth++;
    try { const result = super.settle(handle, received); returned = true; return result; }
    finally {
      state.depth--;
      safely(state, () => settlement(state, handle, before, admitted(this, state), returned));
    }
  }
  override canSpend(cost: Partial<ArchiveCost>): boolean {
    const state = states.get(this);
    if (!state || !state.observed || state.depth > 0) return super.canSpend(cost);
    const before = admitted(this, state), frames = coordinates();
    let returned = false, result: boolean | undefined, error: unknown;
    try { result = super.canSpend(cost); returned = true; return result; }
    catch (caught) { error = caught; throw caught; }
    finally { safely(state, () => record(state, 1, frames, cost, before, admitted(this, state), returned, result, error)); }
  }
}
/** Original constructor/clock/limits. The budget remains the receipt's exact object. */
export function createObservedArchiveBudget(...args: ConstructorParameters<typeof ArchiveBudget>): ArchiveBudget {
  const budget = new ObservedArchiveBudget(...args); states.set(budget, fresh(true)); return budget;
}
/** Never invoke the factory or read a custom ledger here. */
export function registerCustomArchiveBudget(budget: ArchiveBudget): void { states.set(budget, fresh(false)); }
export function observeArchiveRowContext(budget: ArchiveBudget, input: ArchiveRowContextGeometry): void {
  const state = states.get(budget); if (!state || !state.observed) return;
  safely(state, () => {
    state.rowContextCalls = count(state, state.rowContextCalls);
    const own = fields(input, ["oldRowBytes", "rowContextBytes", "snapshotConsumed"]);
    if (!own || !natural(own["oldRowBytes"]?.value) || !natural(own["rowContextBytes"]?.value)
      || typeof own["snapshotConsumed"]?.value !== "boolean") { state.flags |= FLAGS.malformed; return; }
    state.rowContext = Object.freeze({ oldRowBytes: own["oldRowBytes"]!.value as number,
      rowContextBytes: own["rowContextBytes"]!.value as number, snapshotConsumed: own["snapshotConsumed"]!.value as boolean });
    state.rowContextAdmitted = state.observed ? admitted(budget, state) : null;
  });
}
export function observeArchiveFinishQuote(budget: ArchiveBudget, input: ArchiveFinishQuoteGeometry): void {
  const state = states.get(budget); if (!state || !state.observed) return;
  safely(state, () => {
    state.quoteCalls = count(state, state.quoteCalls);
    const own = fields(input, ["throughSeq", "throughHash", "scalars", "costs", "layout"]);
    if (!own || !natural(own["throughSeq"]?.value)) { state.flags |= FLAGS.malformed; return; }
    let throughHash: Digest | undefined;
    if (own["throughHash"]) {
      const value: unknown = own["throughHash"].value;
      if (!isDigest(value)) { state.flags |= FLAGS.malformed; return; }
      throughHash = value;
    }
    const scalar = own["scalars"] ? numbers(own["scalars"].value, ARCHIVE_FINISH_SCALARS) : {};
    const cost = own["costs"] ? costs(own["costs"].value, ARCHIVE_FINISH_COSTS) : {};
    const work = own["layout"] ? fields(own["layout"].value, LAYOUT_PARTS) : {};
    if (scalar === null || cost === null || work === null) { state.flags |= FLAGS.malformed; return; }
    const layout: Partial<Record<typeof LAYOUT_PARTS[number], NumericFields<typeof LAYOUT_AXES[number]>>> = {};
    for (const part of LAYOUT_PARTS) if (work[part]) {
      const value = numbers(work[part]!.value, LAYOUT_AXES);
      if (value === null) { state.flags |= FLAGS.malformed; return; }
      layout[part] = Object.freeze(value);
    }
    const ledger = state.observed ? admitted(budget, state) : null;
    const quote = Object.freeze({ throughSeq: own["throughSeq"]!.value as number, ...(throughHash !== undefined ? { throughHash } : {}), scalars: Object.freeze(scalar),
      costs: Object.freeze(cost), layout: Object.freeze(layout), admitted: ledger === null ? null : frozenCost(ledger) });
    state.firstQuote ??= quote; state.lastQuote = quote;
    if (scalar.stage === 0 && state.firstFinishAttribution === null) state.firstFinishAttribution = finishAttribution(state, ledger);
  });
}
/** A refresh at the same sequence replaces its quote, without another distinct selection. */
export function observeArchiveSelection(budget: ArchiveBudget, throughSeq: number): void {
  const state = states.get(budget); if (!state || !state.observed) return;
  safely(state, () => {
    state.selectionCalls = count(state, state.selectionCalls);
    if (!natural(throughSeq)) { state.flags |= FLAGS.malformed; return; }
    if (state.selectedThroughSeq !== throughSeq) state.distinctSelections = count(state, state.distinctSelections);
    state.selectedThroughSeq = throughSeq;
    const quote = state.lastQuote?.throughSeq === throughSeq ? state.lastQuote
      : state.selectedQuote?.throughSeq === throughSeq ? state.selectedQuote
      : state.firstQuote?.throughSeq === throughSeq ? state.firstQuote : null;
    state.selectedQuote = quote;
  });
}
function terminal(input: ArchiveTerminalGeometry): ArchiveTerminalGeometry | null {
  const own = fields(input, ["throughSeq", "throughHash", "scalars", "costs"]);
  if (!own || own["throughSeq"] === undefined || own["throughSeq"].value !== null && !natural(own["throughSeq"].value)) return null;
  let throughHash: Digest | undefined;
  if (own["throughHash"]) {
    const value: unknown = own["throughHash"].value;
    if (!isDigest(value)) return null;
    throughHash = value;
  }
  const scalar = own["scalars"] ? numbers(own["scalars"].value, TERMINAL_SCALARS) : {};
  const cost = own["costs"] ? costs(own["costs"].value, TERMINAL_COSTS) : {};
  return scalar === null || cost === null ? null : Object.freeze({ throughSeq: own["throughSeq"].value as number | null,
    ...(throughHash !== undefined ? { throughHash } : {}), scalars: Object.freeze(scalar), costs: Object.freeze(cost) });
}
function completeQuote(quote: ArchiveFinishQuoteGeometry | null): boolean {
  if (!quote || quote.scalars?.stage !== 0 || !quote.costs || !quote.layout
    || ARCHIVE_FINISH_SCALARS.some(key => quote.scalars?.[key] === undefined)
    || ARCHIVE_FINISH_COSTS.some(key => quote.costs?.[key] === undefined)) return false;
  const required = { used: LAYOUT_AXES, limits: LAYOUT_AXES,
    patch: ["objects", "trees", "names", "objectBytes", "outputWork"], body: ["outputWork"],
    commit: ["objects", "objectBytes", "outputWork"] } as const;
  for (const part of LAYOUT_PARTS) for (const key of required[part]) if (quote.layout[part]?.[key] === undefined) return false;
  const sum = zero();
  for (const key of ARCHIVE_FINISH_COSTS) if (key !== "total" && key !== "sourceLookups") {
    const value = vector(quote.costs[key]); if (value === null || !add(sum, value)) return false;
  }
  return AXES.every(axis => sum[axis] === quote.costs?.total?.[axis]);
}
/** Numeric snapshot only. Exploratory refusals are not the terminal cause.
 * No clock/check call, and no call to a custom budget's admitted method. */
export function readArchiveCapacityObservation(budget: ArchiveBudget, input: ArchiveTerminalGeometry) {
  const state = states.get(budget); if (!state) return null;
  const captured: { value: ArchiveTerminalGeometry | null } = { value: null };
  if (state.observed) safely(state, () => { captured.value = terminal(input); if (captured.value === null) state.flags |= FLAGS.malformed; });
  const end = captured.value;
  const actual = state.observed ? admitted(budget, state) : null;
  const ledgerReconciled = actual !== null && AXES.every(axis => actual[axis] === state.admittedDelta[axis]);
  if (state.observed && !ledgerReconciled) state.flags |= FLAGS.ledger;
  return { version: 1, qualification: "Numeric diagnostic only; observer overhead can affect the original timeout. No source, body or admission authority.",
    debitAttribution: state.observed ? "observed" as const : "unavailable" as const,
    debitAttributionComplete: state.observed && state.flags === 0,
    finishGeometryComplete: state.observed && state.rowContext !== null && completeQuote(state.firstQuote),
    observationComplete: state.observed && state.flags === 0 && state.rowContext !== null && completeQuote(state.firstQuote)
      && isDigest(state.firstQuote?.throughHash) && end !== null,
    flags: state.flags, ledgerReconciled, admitted: actual, admittedDelta: { ...state.admittedDelta }, unattributedAdmittedDelta: { ...state.unattributedAdmittedDelta },
    reservationCalls: state.reservationCalls, settlementCalls: state.settlementCalls, settlementThrew: state.settlementThrew,
    settlementReduction: { ...state.settlementReduction }, unattributedSettlementReduction: { ...state.unattributedSettlementReduction },
    debitCalls: state.debitCalls, affordabilityCalls: state.affordabilityCalls, droppedSiteCalls: state.droppedSiteCalls, droppedRefusals: state.droppedRefusals,
    sites: [...state.sites.values()].map(row => ({ ...row, frames: row.frames.map(frame => [...frame]), attemptedDebit: { ...row.attemptedDebit },
      admittedDelta: { ...row.admittedDelta }, attemptedAffordability: { ...row.attemptedAffordability }, settlementReduction: { ...row.settlementReduction } })),
    refusals: state.refusals.map(row => ({ ...row, frames: row.frames?.map(frame => [...frame]) ?? null,
      requested: row.requested && { ...row.requested }, before: row.before && { ...row.before }, after: row.after && { ...row.after } })),
    rowContextCalls: state.rowContextCalls, quoteCalls: state.quoteCalls, selectionCalls: state.selectionCalls,
    distinctSelections: state.distinctSelections, selectedThroughSeq: state.selectedThroughSeq,
    firstFinishAttribution: state.firstFinishAttribution,
    rowContext: state.rowContext, rowContextAdmitted: state.rowContextAdmitted && { ...state.rowContextAdmitted }, firstQuote: state.firstQuote, selectedQuote: state.selectedQuote, lastCompleteQuote: state.lastQuote, terminal: end };
}
