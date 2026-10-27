/** Selection-to-layout boundary. A rebuild spends a new pass's finite
 * allowance on the stored manifest and exact immutable dependencies. */
import { same, natural } from "@generalbusiness/dap-bytes";
import type { Bounds, Digest, FactRef, Head, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { buildJournalArchive, buildJournalPass, convertJournalArchiveV1, JOURNAL_SELECTION_BYTES, journalSelection, journalPassSelection, journalAnchorCopyCount, journalLegacyCopyCount, validateJournalPublicationEntries, JournalPassPreparation, JournalWork, type JournalArchive, type JournalPassArchive, type JournalSelection, type JournalPassSelection, type JournalCost, type JournalFormat, type JournalLayoutResult, type JournalObject, type JournalObjectSource, type JournalAnchorPublication, type JournalLegacyAnchors } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, ArchiveBudget, ArchiveStopped, type ArchiveCapacityRefusal, type ArchiveCost } from "./archive-budget.ts";
import { archiveInput } from "./archive-input.ts";
import { inventoryArchive, inventoryArchiveRoot, type ArchiveInventory, type ArchivePolicyRegistry } from "./archive-inventory.ts";
import type { ArchiveMark, ArchiveRow } from "./archive-row.ts";
import type { Sql } from "./sqlite.ts";
import { ArchivePrefixStopped, type ArchiveSourceFailure, type ArchivePrefixReason } from "./archive-prefix.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { ArchiveReplayAnchors } from "./archive-anchors.ts";
import { readArchiveTextBytes } from "./archive-text.ts";
import type { ArchivePlanFence } from "./archive-plan-fence.ts";
import type { ArchiveForeignExpectedCopy } from "./archive-foreign.ts";
import { archiveReplayScopes, readArchivePublication, writeArchivePublication } from "./archive-publication.ts";
import { archiveFixedLayout } from "./archive-fixed-layout.ts";
import { archiveParentMetadata, forecastArchiveFinish } from "./archive-finish-cost.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES, archivePinReadBytes, readArchivePinAfterReceipt } from "./archive-pin.ts";
import { archivePinValidationWork } from "./archive-inventory-cost.ts";

type LayoutFailure = Extract<JournalLayoutResult, { ok: false }>;
export type ArchiveBuildFailure = (LayoutFailure | { readonly ok: false; readonly reason: ArchivePrefixReason | "rebuild-mismatch" | "manifest" }) & { readonly sourceFailure?: ArchiveSourceFailure };
export type ArchiveBuildResult = { readonly ok: true; readonly archive: JournalArchive } | ArchiveBuildFailure;
export type ArchivePassBuildResult = { readonly ok: true; readonly archive: JournalPassArchive } | ArchiveBuildFailure;
type Parent = { readonly id: string; readonly source: JournalObjectSource } | null;

/** Collect only bytes that the native builder actually reads. The same
 * pass budget pays for admission, anchors and layout. */
function replayInput(native: ReturnType<typeof archiveInput>, selection: ConstructorParameters<typeof ArchiveReplayAnchors>[0],
  scopes: readonly ScopeRef[] | undefined, budget: ArchiveBudget, sources?: FixtureArchiveSourcePins, publish = false, legacyAnchors?: JournalLegacyAnchors) {
  let collector: ArchiveReplayAnchors | undefined;
  let replayScopes: readonly ScopeRef[] | undefined;
  try {
    if (scopes || publish) {
      if (publish && scopes && (!Array.isArray(scopes) || scopes.length === 0 || scopes.length > 64)) return budget.stop("limit");
      const identities = scopes ?? [selection.at, ...selection.objects.flatMap(object => object.foreign
        && object.foreign.fact.at.kind !== "register" && object.foreign.fact.at.kind !== "membership" ? [object.foreign.fact.at] : [])];
      const unique = new Map<string, ScopeRef>();
      for (const at of identities) {
        const prior = unique.get(at.scope);
        if (prior && !same(prior, at)) throw new ArchivePrefixStopped("foreign-source-mismatch");
        if (publish && scopes && prior) return budget.stop("unavailable");
        unique.set(at.scope, at);
      }
      if (publish && scopes) for (const object of selection.objects) {
        // These copies already passed inventory's source pin, reviewed
        // privacy and exact content admission. A public producer is a
        // required replay dependency, never a new anchor or export right.
        budget.spend({ inputWork: 1024 });
        const at = object.foreign?.fact.at;
        if (!at || ["register", "membership", "inbox"].includes(at.kind)) continue;
        const prior = unique.get(at.scope);
        if (prior && !same(prior, at)) throw new ArchivePrefixStopped("foreign-source-mismatch");
        if (!prior) {
          if (unique.size === 64) return budget.stop("limit");
          budget.spend({ metadata: 512 });
          unique.set(at.scope, at);
        }
      }
      replayScopes = publish ? archiveReplayScopes([...unique.values()], selection.at, budget) : [...unique.values()];
      collector = new ArchiveReplayAnchors(selection, replayScopes, budget, sources);
    }
  }
  catch (error) {
    if (error instanceof ArchivePrefixStopped || error instanceof ArchiveStopped) return { ok: false as const, reason: error.reason };
    throw error;
  }
  const gathered = collector, failed: { reason?: ArchiveBuildFailure["reason"] } = {};
  const input = gathered ? { ...native, entry: async (seq: number, limit: number) => {
    const bytes = await native.entry(seq, limit);
    try { if (bytes !== null) gathered.entry(bytes, limit); }
    catch (error) {
      if (error instanceof ArchivePrefixStopped || error instanceof ArchiveStopped) failed.reason = error.reason;
      throw error;
    }
    return bytes;
  } } : native;
  let finished: ReturnType<typeof finish> | undefined;
  function finish(success: boolean): { readonly ok: true; readonly anchors?: readonly FactRef[] } | ArchiveBuildFailure {
    if (failed.reason) return { ok: false as const, reason: failed.reason };
    if (!success) return { ok: true as const };
    try {
      if (!finished) {
        const anchors = collector?.finish();
        finished = { ok: true as const, ...(anchors ? { anchors } : {}) };
      }
      return finished;
    } catch (error) {
      if (error instanceof ArchivePrefixStopped || error instanceof ArchiveStopped) return { ok: false as const, reason: error.reason };
      throw error;
    }
  }
  return { ok: true as const, input, finish, scopes: replayScopes, publication: (): JournalAnchorPublication => {
    const result = finish(true);
    if (!result.ok) throw new ArchiveStopped(result.reason === "limit" || result.reason === "timeout" ? result.reason : "unavailable");
    return { anchors: result.anchors ?? [], ...(legacyAnchors ? { legacyAnchors } : {}) };
  } };
}

/** Whole-prefix migration only, before a new Mark. Missing/pruned local
 * inputs or a prefix exceeding the original entry allowance refuse; the
 * remote archive is never used as a substitute input. */
export async function planLegacyArchiveAnchors(sql: Sql, context: { readonly row: ArchiveRow; readonly bounds: Bounds;
  readonly policies: ArchivePolicyRegistry; readonly parent: Parent; readonly legacyAnchorParent?: NonNullable<Parent>;
  readonly fixtureSources?: FixtureArchiveSourcePins; readonly replayScopes?: readonly ScopeRef[];
  readonly preparation?: JournalPassPreparation;
  readonly prepareSources?: (seq: number, budget: ArchiveBudget) => Promise<void> }, budget: ArchiveBudget): Promise<JournalLegacyAnchors | undefined> {
  const old = context.row.confirmed;
  if (context.legacyAnchorParent !== undefined && (!old || old.layout !== 2 || old.anchorsPublished === true
    || context.row.pending !== null || context.legacyAnchorParent.id !== old.commit)) return budget.stop("unavailable");
  if (!old || old.layout !== 2 || old.anchorsPublished === true) return undefined;
  if (!context.parent || context.parent.id !== old.commit || old.through.seq + 1 > ARCHIVE_BOUNDS.entries) return budget.stop("limit");
  const metadataParent = context.legacyAnchorParent ?? context.parent;
  const through = { ...old.through }, at = { ...context.row.at };
  // Retain the complete receipt-bound parent/range validation. Its copy
  // count no longer bounds a signer's authority or an observation head.
  // No missing-object fallback: the trusted driver supplies this separate
  // original bounded remote port only for the unpublished receipt transition.
  await journalLegacyCopyCount({ format: context.row.format, at, through, parent: metadataParent, budget,
    ...(context.preparation ? { preparation: context.preparation } : {}) });
  if (context.prepareSources) for (let seq = 0; seq <= through.seq; seq++) await context.prepareSources(seq, budget);
  const selected = inventoryArchiveRoot(sql, at, through, context.bounds, context.policies, budget, context.fixtureSources);
  if (!selected.ok) throw new ArchiveStopped(selected.reason === "limit" || selected.reason === "timeout" ? selected.reason : "unavailable");
  const inventory = { ...selected.inventory, format: "artroom-local-inventory-2" as const, after: null,
    objects: selected.inventory.objects.map(object => ({ ...object, pass: 0 })), cost: budget.admitted() };
  budget.spend({ inputWork: JOURNAL_SELECTION_BYTES * 3 });
  const bytes = canonicalize(inventory);
  if (bytes.length > JOURNAL_SELECTION_BYTES || utf8(bytes).length > JOURNAL_SELECTION_BYTES) return budget.stop("limit");
  const replay = replayInput(archiveInput(sql, inventory, budget, context.fixtureSources), inventory, context.replayScopes, budget, context.fixtureSources, true);
  if (!replay.ok) throw new ArchiveStopped(replay.reason === "limit" || replay.reason === "timeout" ? replay.reason : "unavailable");
  await validateJournalPublicationEntries(bytes, replay.input, budget);
  const collected = replay.finish(true);
  if (!collected.ok) throw new ArchiveStopped(collected.reason === "limit" || collected.reason === "timeout" ? collected.reason : "unavailable");
  const anchors = collected.anchors ?? [];
  return Object.freeze({ from: 0, through: through.seq, anchors });
}

/** Conversion is a bounded re-admission of the confirmed v1 prefix, never
 * a new cutoff or an outstanding v1 attempt. Matching its complete tree
 * establishes byte preservation before any new receipt can be marked. */
type ConversionContext = { readonly row: ArchiveRow; readonly bounds: Bounds; readonly policies: ArchivePolicyRegistry; readonly parent: Parent; readonly markedAt: Timestamp; readonly fixtureSources?: FixtureArchiveSourcePins; readonly replayScopes?: readonly ScopeRef[] };
export function planArchiveConversion(sql: Sql, context: ConversionContext, budget: ArchiveBudget) {
  return planArchiveConversionInternal(false, sql, context, budget);
}
export function planPublishedArchiveConversion(sql: Sql, context: ConversionContext, budget: ArchiveBudget) {
  return planArchiveConversionInternal(true, sql, context, budget);
}
async function planArchiveConversionInternal(publish: boolean, sql: Sql, context: ConversionContext, budget: ArchiveBudget): Promise<ArchiveBuildFailure | { readonly ok: true; readonly archive: JournalPassArchive; readonly mark: ArchiveMark; readonly anchors?: readonly FactRef[] }> {
  const row = context.row, confirmed = row.confirmed;
  if (!confirmed || confirmed.layout === 2 || row.pending || row.stopped || context.parent?.id !== confirmed.commit) return { ok: false, reason: "manifest" };
  const at = { ...row.at }, through = { ...confirmed.through }, commit = confirmed.commit, format = row.format;
  const parent = { ...context.parent }, markedAt = context.markedAt, fixtureSources = context.fixtureSources;
  // Keep the complete legacy omission set for the old-tree comparison,
  // including texts redacted since that receipt. Count available bodies by
  // scalar metadata only; no missing historical count is invented.
  const selected = inventoryArchive(sql, at, through, context.bounds, context.policies, budget, fixtureSources);
  if (!selected.ok) return selected;
  const omittedTexts = selected.inventory.omittedTexts.map(text => {
    const bytes = readArchiveTextBytes(sql, text.key.digest, budget);
    return bytes === null ? text : { ...text, bytes };
  });
  const inventory = { ...selected.inventory, format: "artroom-local-inventory-2" as const, after: null,
    objects: selected.inventory.objects.map(object => ({ ...object, pass: 0 })), omittedTexts, cost: budget.admitted() };
  budget.spend({ inputWork: JOURNAL_SELECTION_BYTES * 3 });
  const manifest = canonicalize(inventory);
  if (manifest.length > JOURNAL_SELECTION_BYTES || utf8(manifest).length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  const replay = replayInput(archiveInput(sql, inventory, budget, fixtureSources), inventory, context.replayScopes, budget, fixtureSources, publish);
  if (!replay.ok) return replay;
  const built = await convertJournalArchiveV1({ format, selection: manifest, input: replay.input, parent, budget, ...(publish ? { publication: replay.publication } : {}) });
  const collected = replay.finish(built.ok);
  if (!collected.ok) return collected;
  if (!built.ok) return built;
  const anchorPublication = publish ? writeArchivePublication(replay.publication(), budget) : undefined;
  return { ...built, ...(publish ? { archive: { ...built.archive, cost: budget.admitted() } } : {}),
    mark: { commit: built.archive.commit, parent: commit, through, manifest, markedAt, layout: 2,
      ...(anchorPublication !== undefined ? { anchorPublication, replayScopes: replay.scopes! } : {}) }, ...(collected.anchors ? { anchors: collected.anchors } : {}) };
}

/** Bounds the metadata before parsing or encoding it. The recorded inventory
 * cost is a work reservation on restart, not evidence of privacy admission.
 * Spending it decreases this pass's original allowance; nothing tops it up. */
function storedSelection(manifest: string, budget: ArchiveBudget, incremental: true): JournalPassSelection | null;
function storedSelection(manifest: string, budget: ArchiveBudget, incremental?: false): JournalSelection | null;
function storedSelection(manifest: string, budget: ArchiveBudget, incremental = false): JournalSelection | JournalPassSelection | null {
  budget.check();
  if (manifest.length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  budget.spend({ inputWork: manifest.length * 3 * 12, metadata: manifest.length * 3 });
  if (utf8(manifest).length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  let value: unknown;
  try { value = parseStrict(manifest); if (canonicalize(value) !== manifest) return null; }
  catch { return null; }
  if (!isRecord(value) || !isRecord(value["cost"])) return null;
  const cost = value["cost"], live = budget.admitted(), additional: Partial<JournalCost> = {};
  if (Object.keys(cost).sort().join(",") !== Object.keys(ARCHIVE_BOUNDS).sort().join(",")) return null;
  for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof JournalCost)[]) {
    const amount = cost[key];
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0 || Object.is(amount, -0) || amount > ARCHIVE_BOUNDS[key]) return null;
    additional[key] = Math.max(0, amount - live[key]);
  }
  budget.spend(additional);
  try { return incremental ? journalPassSelection(manifest, new JournalWork(budget)) : journalSelection(manifest, new JournalWork(budget)); }
  catch (error) {
    if (error instanceof ArchiveStopped) throw error;
    if (error && typeof error === "object" && "reason" in error && (error.reason === "limit" || error.reason === "timeout" || error.reason === "unavailable")) budget.stop(error.reason);
    return null;
  }
}

/** A bounded new interval, with the previous confirmed position explicit.
 * Every old retained key is named by its stored original pass. */
export type ArchivePassContext = { readonly at: ScopeRef; readonly through: Head; readonly after: Head | null; readonly bounds: Bounds; readonly policies: ArchivePolicyRegistry; readonly format: JournalFormat; readonly parent: Parent; readonly markedAt: Timestamp; readonly fixtureSources?: FixtureArchiveSourcePins; readonly replayScopes?: readonly ScopeRef[]; readonly legacyAnchors?: JournalLegacyAnchors; readonly preparation?: JournalPassPreparation; readonly forecast?: ArchivePlanFence; readonly declarationSizes?: ReadonlyMap<Digest, number | null>; readonly expectedCopies?: ReadonlyMap<Digest, Readonly<ArchiveForeignExpectedCopy>>; readonly retainedSizes?: ReadonlyMap<string, number | null> };
export function planArchivePass(sql: Sql, context: ArchivePassContext, budget: ArchiveBudget) {
  return planArchivePassInternal(inventoryArchive, false, sql, context, budget);
}
/** Fresh full native-root coupling, never a caller-provided admission bit. */
export function planRootArchivePass(sql: Sql, context: ArchivePassContext, budget: ArchiveBudget) {
  return planArchivePassInternal(inventoryArchiveRoot, false, sql, context, budget);
}
/** Actual owning drivers use these closed publication paths. The legacy
 * direct functions above retain their original format/cost test controls. */
export function planPublishedArchivePass(sql: Sql, context: ArchivePassContext, budget: ArchiveBudget) {
  return planArchivePassInternal(inventoryArchive, true, sql, context, budget);
}
export function planRootPublishedArchivePass(sql: Sql, context: ArchivePassContext, budget: ArchiveBudget) {
  return planArchivePassInternal(inventoryArchiveRoot, true, sql, context, budget);
}
async function planArchivePassInternal(selectInventory: typeof inventoryArchive, publish: boolean, sql: Sql, context: ArchivePassContext, budget: ArchiveBudget): Promise<ArchiveBuildFailure | { readonly ok: true; readonly archive: JournalPassArchive; readonly mark: ArchiveMark; readonly anchors?: readonly FactRef[] }> {
  const at = { ...context.at }, through = { ...context.through }, after = context.after ? { ...context.after } : null;
  const parent = context.parent ? { ...context.parent } : null, format = context.format, markedAt = context.markedAt, fixtureSources = context.fixtureSources;
  const preparation = context.preparation;
  if (preparation !== undefined && (!(preparation instanceof JournalPassPreparation) || preparation.work.budget !== budget
    || preparation.format !== format || preparation.parent !== (parent?.id ?? null) || !same(preparation.at, at) || !same(preparation.after, after))) return { ok: false, reason: "parent" };
  const selected = selectInventory(sql, at, through, context.bounds, context.policies, budget, fixtureSources, after, context.forecast, context.declarationSizes, context.expectedCopies, context.retainedSizes);
  if (!selected.ok) return selected;
  const owned = ownedPassManifest(selected.inventory, preparation, budget);
  if (!owned.ok) return owned;
  return buildOwnedPass(sql, context, budget, owned.inventory, owned.manifest, publish, parent, format, markedAt, fixtureSources);
}

/** The result never leaves this module. Both paths retain actual native
 * admission and continue from the same owned inventory without a second read. */
function ownedPassManifest(selected: ArchiveInventory, preparation: JournalPassPreparation | undefined, budget: ArchiveBudget) {
  // This stored cost reserves the native inventory on restart. The actual
  // layout metadata is rebuilt and charged again then. Attribute only the
  // exact settled preparation calls, including discarded candidate work;
  // the live ledger and final archive cost keep every original debit.
  let inventory = selected;
  if (preparation) {
    const cost = budget.admitted(), metadata = preparation.metadataCost();
    for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof JournalCost)[]) {
      if (!natural(metadata[key]) || metadata[key] > cost[key]) return { ok: false as const, reason: "unavailable" as const };
      cost[key] -= metadata[key];
    }
    inventory = { ...inventory, cost };
  }
  budget.spend({ inputWork: JOURNAL_SELECTION_BYTES * 3 });
  const manifest = canonicalize(inventory);
  if (manifest.length > JOURNAL_SELECTION_BYTES || utf8(manifest).length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  return { ok: true as const, inventory, manifest };
}

async function buildOwnedPass(sql: Sql, context: ArchivePassContext, budget: ArchiveBudget,
  inventory: ArchiveInventory, manifest: string, publish: boolean, parent: Parent, format: JournalFormat, markedAt: Timestamp, fixtureSources?: FixtureArchiveSourcePins): Promise<ArchiveBuildFailure | { readonly ok: true; readonly archive: JournalPassArchive; readonly mark: ArchiveMark; readonly anchors?: readonly FactRef[] }> {
  const preparation = context.preparation;
  const replay = replayInput(archiveInput(sql, inventory, budget, fixtureSources), inventory, context.replayScopes, budget, fixtureSources, publish, context.legacyAnchors);
  if (!replay.ok) return replay;
  const built = await buildJournalPass({ format, selection: manifest, input: replay.input, parent, budget, ...(publish ? { publication: replay.publication } : {}), ...(preparation ? { preparation } : {}) });
  const collected = replay.finish(built.ok);
  if (!collected.ok) return collected;
  if (!built.ok) return built;
  const anchorPublication = publish ? writeArchivePublication(replay.publication(), budget) : undefined;
  return { ...built, ...(publish ? { archive: { ...built.archive, cost: budget.admitted() } } : {}),
    mark: { commit: built.archive.commit, parent: parent?.id ?? null, through: { ...inventory.through }, manifest, markedAt, layout: 2,
      ...(anchorPublication !== undefined ? { anchorPublication, replayScopes: replay.scopes! } : {}) }, ...(collected.anchors ? { anchors: collected.anchors } : {}) };
}


/** Numeric diagnostic only. It grants no allowance, object or authority. */
export interface ArchiveFixedFinish {
  readonly used: Readonly<ArchiveCost>;
  readonly remaining: Readonly<ArchiveCost>;
  readonly metadataMargin: number;
}

/** Separate scheduling strategy after a capacity retry, not a second
 * attempt in the adaptive caller's already-spent budget. */
type FixedArchivePassContext = ArchivePassContext & {
  readonly oldRowBytes: number; readonly rowContextBytes: number; readonly maximum: number;
  readonly atomicFirstAttempt?: boolean;
  readonly parentHeld: ReadonlyMap<string, JournalObject>; readonly parentUsed: ReadonlySet<string>;
};
export async function planRootFixedPublishedArchivePass(sql: Sql, context: FixedArchivePassContext, budget: ArchiveBudget) {
  if (!context.after || !context.parent || context.through.seq !== context.after.seq + 1 || context.legacyAnchors !== undefined)
    return { ok: false as const, reason: "parent" as const };
  const begun = await budget.wait(() => JournalPassPreparation.begin({ format: context.format, at: context.at,
    after: context.after, parent: context.parent, budget }));
  if (!begun.ok) return begun;
  return finishRootFixedArchivePass(sql, context, begun.preparation, budget);
}

/** Only this owner can supply legacy anchors to the fixed continuation.
 * Complete old-range admission and new inventory share one preparation. */
export async function planRootFixedLegacyArchivePass(sql: Sql, context: FixedArchivePassContext & {
  readonly row: ArchiveRow;
  readonly legacyAnchorParent?: NonNullable<Parent>;
  readonly prepareSources?: (seq: number, budget: ArchiveBudget) => Promise<void>;
}, budget: ArchiveBudget) {
  const old = context.row.confirmed;
  if (!old || old.layout !== 2 || old.anchorsPublished === true || context.row.pending !== null || context.row.stopped !== null
    || !same(context.row.at, context.at) || context.row.format !== context.format
    || !context.after || !same(context.after, old.through) || !context.parent || context.parent.id !== old.commit
    || context.through.seq !== context.after.seq + 1 || context.legacyAnchors !== undefined || context.preparation !== undefined)
    return { ok: false as const, reason: "parent" as const };
  const begun = await budget.wait(() => JournalPassPreparation.begin({ format: context.format, at: context.at,
    after: context.after, parent: context.parent, budget }));
  if (!begun.ok) return begun;
  const preparation = begun.preparation;
  const legacyAnchors = await planLegacyArchiveAnchors(sql, { ...context, preparation }, budget);
  if (!legacyAnchors) return { ok: false as const, reason: "parent" as const };
  if (context.prepareSources) {
    const prepared = await budget.wait(async () => {
      try { await context.prepareSources!(context.through.seq, budget); return { ok: true as const }; }
      catch (error) {
        if (error instanceof ArchivePrefixStopped) return { ok: false as const, error };
        throw error;
      }
    });
    if (!prepared.ok) throw prepared.error;
  }
  return finishRootFixedArchivePass(sql, { ...context, legacyAnchors }, preparation, budget, legacyAnchors.anchors.length);
}

async function finishRootFixedArchivePass(sql: Sql, context: FixedArchivePassContext,
  preparation: JournalPassPreparation, budget: ArchiveBudget, legacyAnchorCount = 0) {
  const selected = inventoryArchiveRoot(sql, context.at, context.through, context.bounds, context.policies,
    budget, context.fixtureSources, context.after);
  if (!selected.ok) return selected;
  const owned = ownedPassManifest(selected.inventory, preparation, budget);
  if (!owned.ok) return owned;
  const shape = sql.transaction(() => archiveFixedLayout(sql, owned.inventory, utf8(owned.manifest).length,
    context.bounds.entryBytes, budget, context.fixtureSources));
  // The actual inventory has completed. No inventory/map-handoff forecast
  // is credited or subtracted from admitted(). Later reads admit their own
  // ceilings; only unused byte reservations can settle after a receipt.
  budget.spend({ metadata: shape.files.length * 128, inputWork: shape.files.length * 256 });
  const paths = shape.files.filter(file => file.path !== "journal/v2/head.json" && !file.path.endsWith("/pass.json"))
    .map(file => file.path);
  await preparation.prepare(paths);
  // This path prepares parent edges after inventory. Rebind the actual
  // current native identity after that await without selecting bodies again.
  budget.spend({ inputWork: archivePinValidationWork() });
  const current = readArchivePinAfterReceipt(budget.native(sql, () => ({
    metadata: ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES, inputWork: 0,
  }), archivePinReadBytes), context.at);
  const policy = current && context.policies.get(current.seed.definition);
  if (!current || !policy?.review || policy.support.named !== current.seed.definition) return { ok: false as const, reason: "mismatch" as const };
  const parent = archiveParentMetadata(context, budget);
  const empty = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
  // Two bounded numeric vectors and their diagnostic handoff. No callback,
  // new read, serialization or clock observation is supplied to diagnostics.
  budget.spend({ metadata: 512, inputWork: 1024 });
  const remaining = forecastArchiveFinish(context, preparation, shape, context.through, empty,
    context.oldRowBytes, context.rowContextBytes, parent, empty, legacyAnchorCount, budget);
  if (remaining === null) return { ok: false as const, reason: "limit" as const };
  const fixedFinish: ArchiveFixedFinish = Object.freeze({ used: Object.freeze(budget.admitted()),
    remaining: Object.freeze({ ...remaining }), metadataMargin: 64 * 1024 });
  const withMargin = { ...remaining, metadata: remaining.metadata + fixedFinish.metadataMargin };
  if (!budget.canSpend(withMargin)) {
    const refusal = budget.capacityRefusal(remaining, "finish-quote", { metadata: 64 * 1024 });
    const capacityRefusal: ArchiveCapacityRefusal | null = refusal && { ...refusal, site: "finish-affordability" };
    return { ok: false as const, deferred: "capacity" as const, capacityRefusal, fixedFinish };
  }
  const built = await buildOwnedPass(sql, { ...context, preparation }, budget, owned.inventory, owned.manifest, true,
    context.parent, context.format, context.markedAt, context.fixtureSources);
  return built.ok ? { ...built, parentObjects: parent.ids, rowContextBytes: context.rowContextBytes, fixedFinish } : built;
}

/** Restart follows the marked interval and pass references exactly. It
 * neither inventories today's rows nor reads a prior journal entry. */
export async function rebuildArchivePass(sql: Sql, row: ArchiveRow, parent: Parent, budget: ArchiveBudget, fixtureSources?: FixtureArchiveSourcePins): Promise<ArchivePassBuildResult> {
  const mark = row.pending ? { ...row.pending, through: { ...row.pending.through } } : null, at = { ...row.at }, format = row.format, base = parent ? { ...parent } : null;
  if (!mark || mark.layout !== 2 || mark.parent !== (base?.id ?? null)) return { ok: false, reason: "manifest" };
  const selection = storedSelection(mark.manifest, budget, true);
  if (!selection || !same(selection.at, at) || !same(selection.through, mark.through)) return { ok: false, reason: "manifest" };
  const conversion = row.confirmed !== null && row.confirmed.layout !== 2;
  if (conversion && (selection.after !== null || !same(mark.through, row.confirmed!.through))
    || !conversion && !same(selection.after, row.confirmed?.through ?? null)) return { ok: false, reason: "manifest" };
  let input: ReturnType<typeof archiveInput>;
  try { input = archiveInput(sql, selection, budget, fixtureSources); }
  catch (error) {
    if (error instanceof ArchivePrefixStopped) return { ok: false, reason: error.reason, ...(error.sourceFailure ? { sourceFailure: error.sourceFailure } : {}) };
    throw error;
  }
  const publication = mark.anchorPublication === undefined ? undefined : readArchivePublication(mark.anchorPublication,
    journalAnchorCopyCount(selection.objects, new JournalWork(budget)), (selection.after?.seq ?? -1) + 1, budget, [at]);
  const replay = publication ? replayInput(input, selection, mark.replayScopes, budget, fixtureSources, true, publication.legacyAnchors) : null;
  if (replay && !replay.ok) return replay;
  // A missing producer in a stored Mark must refuse, not be repaired by
  // today's composition rule while silently accepting a different closure.
  if (replay?.ok) {
    const actual = replay.scopes, expected = mark.replayScopes;
    if (!actual || !expected) return { ok: false, reason: "rebuild-mismatch" };
    // Both lists were just validated at <=64 full refs. Pay the existing
    // binding-comparison rate before visiting them; no JSON scratch is made.
    budget.spend({ inputWork: actual.length * 1024 });
    if (actual.length !== expected.length) return { ok: false, reason: "rebuild-mismatch" };
    for (let index = 0; index < actual.length; index++) {
      const a = actual[index]!, b = expected[index]!;
      if (a.scope !== b.scope || a.inc !== b.inc || a.kind !== b.kind) return { ok: false, reason: "rebuild-mismatch" };
    }
  }
  const build = conversion ? convertJournalArchiveV1 : buildJournalPass;
  const built = await build({ format, selection: mark.manifest, input: replay?.ok ? replay.input : input, parent: base, budget,
    ...(replay?.ok && publication ? { publication: () => {
      const actual = replay.publication();
      if (!same(actual, publication)) return budget.stop("unavailable");
      return actual;
    } } : {}) });
  if (!built.ok) return built;
  if (built.archive.commit !== mark.commit) return { ok: false, reason: "rebuild-mismatch" };
  return built;
}

/** Initial planning uses the native synchronous inventory and its explicit
 * caller-owned fixture/reviewed policy registry. It does not mark or send. */
export async function planArchive(sql: Sql, context: { readonly at: ScopeRef; readonly through: Head; readonly bounds: Bounds; readonly policies: ArchivePolicyRegistry; readonly format: JournalFormat; readonly parent: Parent; readonly markedAt: Timestamp; readonly fixtureSources?: FixtureArchiveSourcePins; readonly replayScopes?: readonly ScopeRef[] }, budget: ArchiveBudget): Promise<ArchiveBuildFailure | { readonly ok: true; readonly archive: JournalArchive; readonly mark: ArchiveMark; readonly anchors?: readonly FactRef[] }> {
  const at = { ...context.at }, through = { ...context.through }, parent = context.parent ? { ...context.parent } : null, format = context.format, markedAt = context.markedAt;
  const fixtureSources = context.fixtureSources;
  const selected = inventoryArchive(sql, at, through, context.bounds, context.policies, budget, fixtureSources);
  if (!selected.ok) return selected;
  budget.spend({ inputWork: JOURNAL_SELECTION_BYTES * 3 });
  const manifest = canonicalize(selected.inventory);
  if (manifest.length > JOURNAL_SELECTION_BYTES || utf8(manifest).length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  const replay = replayInput(archiveInput(sql, selected.inventory, budget, fixtureSources), selected.inventory, context.replayScopes, budget, fixtureSources);
  if (!replay.ok) return replay;
  const built = await buildJournalArchive({ format, selection: manifest, input: replay.input, parent, budget });
  const collected = replay.finish(built.ok);
  if (!collected.ok) return collected;
  if (!built.ok) return built;
  return { ...built, mark: { commit: built.archive.commit, parent: parent?.id ?? null, through: { ...selected.inventory.through }, manifest, markedAt }, ...(collected.anchors ? { anchors: collected.anchors } : {}) };
}

/** No new inventory is computed after Mark. The caller supplies only the
 * marked parent's bounded object port; current head/retained sets are unread. */
export async function rebuildArchive(sql: Sql, row: ArchiveRow, parent: Parent, budget: ArchiveBudget, fixtureSources?: FixtureArchiveSourcePins): Promise<ArchiveBuildResult> {
  const mark = row.pending ? { ...row.pending, through: { ...row.pending.through } } : null, at = { ...row.at }, format = row.format, base = parent ? { ...parent } : null;
  if (!mark || mark.parent !== (base?.id ?? null)) return { ok: false, reason: "manifest" };
  const selection = storedSelection(mark.manifest, budget);
  if (!selection || !same(selection.at, at) || !same(selection.through, mark.through)) return { ok: false, reason: "manifest" };
  let input: ReturnType<typeof archiveInput>;
  try { input = archiveInput(sql, selection, budget, fixtureSources); }
  catch (error) {
    if (error instanceof ArchivePrefixStopped) return { ok: false, reason: error.reason, ...(error.sourceFailure ? { sourceFailure: error.sourceFailure } : {}) };
    throw error;
  }
  const built = await buildJournalArchive({ format, selection: mark.manifest, input, parent: base, budget });
  if (!built.ok) return built;
  if (built.archive.commit !== mark.commit) return { ok: false, reason: "rebuild-mismatch" };
  return built;
}
