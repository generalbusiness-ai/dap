/** One bounded asynchronous archive pass. No entry, operation or public RPC.
 * Configuration and reviewed policy belong to the trusted object owner. */
import { canonicalize, digestBytes, isDigest, same, utf8 } from "@generalbusiness/dap-bytes";
import type { Bounds, Head, ScopeRef, Seed, Timestamp } from "@generalbusiness/dap-contract";
import { isScopeRef, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { captureJournalParentFrontier, journalRef, type JournalArchive, type JournalPassArchive, type JournalFormat, type JournalObject, type JournalObjectSource } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, ArchiveBudget, ArchiveStopped, type ArchiveCapacityRefusal } from "./archive-budget.ts";
import { archiveParent, copyArchiveObjects } from "./archive-parent.ts";
import { ArchiveFrontiers, type ArchiveFrontierBase, type ArchiveFrontierPrepared } from "./archive-frontier-store.ts";
import { archiveFrontierRowContextBound } from "./archive-frontier-cost.ts";
import { admitArchiveMigration } from "./archive-bootstrap-cost.ts";
import { planPublishedArchiveConversion, rebuildArchive, rebuildArchivePass, type ArchiveFixedFinish } from "./archive-build.ts";
import { planAdaptiveArchivePass, planRootAdaptiveArchivePass, planRootFixedArchivePass, planRootFixedUnpublishedArchivePass } from "./archive-adaptive.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES, archivePinReadBytes, readArchivePin, readArchivePinAfterReceipt } from "./archive-pin.ts";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";
import { ArchiveRows, type ArchiveMark, type ArchiveRow } from "./archive-row.ts";
import { finishArchiveParentRead, startArchiveParentReadPass } from "./archive-parent-read-diagnostic.ts";
import { readArchiveRestart } from "./archive-restart.ts";
import type { DestinationRepository } from "./destination-host.ts";
import type { Sql } from "./sqlite.ts";
import { ARCHIVE_POSITION_METADATA_BYTES } from "./archive-inventory-cost.ts";
import { ArchivePrefixStopped, readArchiveScopeFrame, type ArchiveSourceFailure } from "./archive-prefix.ts";
import { createObservedArchiveBudget, registerCustomArchiveBudget, observeArchiveSelection, readArchiveCapacityObservation } from "./archive-capacity-observation.ts";

export interface ArchiveCredential { readonly id: string; readonly ends: Timestamp; readonly plaintext: string }
export interface ArchiveSend {
  readonly repository: DestinationRepository; readonly at: ScopeRef; readonly ref: string;
  readonly old: string | null; readonly commit: string; readonly objects: readonly JournalObject[];
  readonly credential: ArchiveCredential; readonly allowed: () => boolean;
  /** Only a v2 append uses old tree edges. Validation spends the same pass
   * allowance and derives its own unchanged edges from the exact parent. */
  readonly incremental?: { readonly budget: ArchiveBudget };
}
/** These are trusted bounded I/O ports. Actual adapters must enforce the
 * scope/ref binding again at send, not rely on the driver's earlier check. */
export interface ArchiveProvider {
  format(repository: DestinationRepository, allowed: () => boolean): Promise<JournalFormat>;
  ref(repository: DestinationRepository, ref: string, allowed: () => boolean): Promise<string | null>;
  objects(repository: DestinationRepository, commit: string, most: { readonly bytes: number; readonly objects: number }, allowed: () => boolean): Promise<readonly JournalObject[]>;
  /** One shallow filtered current-parent read and one exact head blob; no history. */
  readParent?(repository: DestinationRepository, commit: string, allowed: () => boolean, budget: ArchiveBudget): Promise<JournalObjectSource>;
  readObject?(repository: DestinationRepository, object: { readonly id: string; readonly type: JournalObject["type"]; readonly maximum: number }, allowed: () => boolean, budget: ArchiveBudget): ReturnType<JournalObjectSource["object"]>;
  mintArchive(repository: DestinationRepository, at: ScopeRef, allowed: () => boolean): Promise<ArchiveCredential | null>;
  sendArchive(request: ArchiveSend): Promise<unknown>;
  revokeArchive(credential: ArchiveCredential): Promise<void>;
}
/** Commissioned fixture wiring only. A0b must supply production admission,
 * policy ownership and configuration before a real room can use this engine. */
export interface FixtureArchiveProvider extends ArchiveProvider { readonly fixture: "archive-provider" }
export interface FixtureArchivePolicies { readonly fixture: "archive-policies"; readonly registry: ArchivePolicyRegistry }
export interface FixtureArchiveTarget {
  readonly fixture: "archive-target";
  resolve(at: ScopeRef, seed: Seed, budget: ArchiveBudget): Promise<DestinationRepository | null>;
}
export interface ArchiveTarget {
  resolve(at: ScopeRef, seed: Seed, budget: ArchiveBudget): Promise<DestinationRepository | null>;
}
export interface RoomArchiveDriverOptions extends Omit<FixtureArchiveDriverOptions, "policies" | "provider" | "target"> {
  readonly production: "room-binding";
  readonly policies: { readonly registry: ArchivePolicyRegistry };
  readonly target: ArchiveTarget;
  readonly provider: ArchiveProvider;
  readonly admit: (at: ScopeRef, seed: Seed) => boolean;
  /** Fresh bounded source identity preparation, charged to the same pass. */
  readonly sources?: (after: Head | null, through: Head, budget: ArchiveBudget, exact: boolean) => Promise<{ readonly pins: FixtureArchiveSourcePins; readonly replayScopes?: readonly ScopeRef[]; readonly prepare?: (seq: number, budget: ArchiveBudget) => Promise<void> }>;
}
export interface FixtureArchiveDriverOptions {
  readonly sql: Sql;
  readonly current: () => { readonly at: ScopeRef; readonly head: Head } | null;
  readonly clock: () => Timestamp;
  readonly bounds: Bounds;
  readonly policies: FixtureArchivePolicies;
  /** Immutable graph metadata prepared through the existing fixture reader. */
  readonly fixtureSources?: FixtureArchiveSourcePins;
  readonly target: FixtureArchiveTarget;
  readonly provider: FixtureArchiveProvider;
  readonly maxBytes?: number;
  /** Trusted test/configuration may lower the existing pass allowance. */
  readonly budget?: () => ArchiveBudget;
}
export interface ArchivePass { readonly state: "idle" | "disabled" | "retry" | "stopped" | "confirmed"; readonly next: Timestamp | null; readonly reason?: string }

export class ArchiveDriver {
  readonly #options: FixtureArchiveDriverOptions | RoomArchiveDriverOptions;
  readonly #maximum: number;
  #rows: ArchiveRows | null = null;
  #running: Promise<ArchivePass> | null = null;
  #disabled = false;
  #fallback: Timestamp | null = null;
  constructor(options: FixtureArchiveDriverOptions | RoomArchiveDriverOptions) {
    if (!("production" in options) && (options.policies.fixture !== "archive-policies" || options.target.fixture !== "archive-target" || options.provider.fixture !== "archive-provider")) throw new Error("archive fixture ports required");
    if ("production" in options && options.production !== "room-binding") throw new Error("archive room binding required");
    this.#options = "production" in options
      ? { ...options, bounds: { ...options.bounds }, policies: { ...options.policies }, target: { resolve: options.target.resolve.bind(options.target) } }
      : { ...options, bounds: { ...options.bounds }, policies: { ...options.policies }, target: { fixture: "archive-target", resolve: options.target.resolve.bind(options.target) } };
    this.#maximum = options.maxBytes ?? 8 * 1024 * 1024;
    if (!Number.isSafeInteger(this.#maximum) || this.#maximum < 1 || this.#maximum > 8 * 1024 * 1024) throw new Error("archive byte allowance is out of range");
  }
  #store(): ArchiveRows | null {
    const current = this.#options.current();
    return current && isScopeRef(current.at) ? this.#rows ??= new ArchiveRows(this.#options.sql, current.at) : null;
  }
  /** Internal deployment directive; no pass, host call, native turn or Mark. */
  restart(raw: unknown): "applied" | "already-applied" | "refused" {
    if (this.#running || this.#disabled || this.#options.policies.registry.size === 0) return "refused";
    try {
      const budget = new ArchiveBudget(), now = this.#options.clock();
      const command = readArchiveRestart(raw,now,budget), next = this.#later(0), rows = this.#store();
      return command && next && rows && same(command.at,this.#options.current()?.at) ? rows.restart(command,next,now,budget) : "refused";
    } catch { return "refused"; }
  }
  /** Scheduling only: never waits on a host or reads a manifest. */
  committed(): void {
    if (this.#disabled || this.#options.policies.registry.size === 0) return;
    try { this.#store()?.signal(this.#options.clock()); } catch { this.#fallback = this.#later(0); }
  }
  wake(): Timestamp | null {
    if (this.#disabled || this.#options.policies.registry.size === 0) return null;
    try {
      const stored = this.#store()?.wake() ?? null;
      if (stored === null) return this.#fallback;
      if (this.#fallback === null) return stored;
      return timeMs(stored)! < timeMs(this.#fallback)! ? stored : this.#fallback;
    } catch { return this.#fallback ?? this.#later(0); }
  }
  run(): Promise<ArchivePass> {
    return this.#running ??= this.#pass().then(result => {
      this.#fallback = result.state === "retry" ? result.next : null;
      return result;
    }).finally(() => { this.#running = null; });
  }
  #later(attempts: number): Timestamp | null {
    try {
      const now = timeMs(this.#options.clock());
      if (now === null) return null;
      const { dispatchRetrySeconds: first, dispatchRetryMaxSeconds: last } = this.#options.bounds;
      const delay = Math.min(last, first * 2 ** Math.min(32, attempts)) * 1000;
      return Number.isSafeInteger(delay) && delay > 0 ? timeOf(now + delay) : null;
    } catch { return null; }
  }
  async #parent(row: ArchiveRow, budget: ArchiveBudget, allowed: () => boolean, frontiers: ArchiveFrontiers, base: ArchiveFrontierBase | null) {
    return archiveParent(row, this.#options.provider, this.#maximum, budget, allowed,
      base === null ? null : { frontier: base.frontier, source: frontiers.source(base, budget) });
  }
  async #pass(): Promise<ArchivePass> {
    const suppliedBudget = this.#options.budget?.();
    const budget = suppliedBudget ?? ("production" in this.#options ? createObservedArchiveBudget() : new ArchiveBudget());
    if (suppliedBudget) registerCustomArchiveBudget(budget);
    startArchiveParentReadPass(budget);
    // Temporary pass diagnostic: fixed categories and already-loaded scalars
    // only. It adds no archive read, admission, retry or persistent state.
    let step = "row-load", detail = "none", caught = "none";
    let capacityRefusal: ArchiveCapacityRefusal | null = null;
    let fixedFinish: ArchiveFixedFinish | null = null;
    let sourceFailure: ArchiveSourceFailure | null = null;
    // Capture codes: 0 no planner, 1 adaptive, 2 fixed published,
    // 3 fixed unpublished, 4 conversion, 5 pending rebuild.
    let captureStrategy = 0, captureThrough: number | null = null, captureSelected: number | null = null;
    let captureThroughHash: Head["hash"] | undefined;
    let captureEntries: number | undefined;
    let phase = "unknown", confirmed: number | null = null, pending: number | null = null, attempts = 0, hasNext = false;
    const observed: { outcome?: ArchivePass } = {};
    const done = (value: ArchivePass): ArchivePass => { observed.outcome = value; return value; };
    let active = true, credential: ArchiveCredential | null = null, scheduled: Timestamp | null = null, deferred = false, attempted = false;
    const allowed = (): boolean => { if (!active) return false; try { budget.check(); return true; } catch { return false; } };
    try {
      const rows = this.#store();
      if (!rows || this.#options.policies.registry.size === 0) return done({ state: "disabled", next: null });
      budget.spend({ inputWork: 4 * (ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES) });
      const current = this.#options.current()!;
      const at = { ...current.at }, through = { ...current.head };
      let row = rows.load(budget);
      phase = !row ? "absent" : row.stopped ? "stopped" : row.pending ? "pending" : row.confirmed ? "confirmed" : "target";
      confirmed = row?.confirmed?.through.seq ?? null; pending = row?.pending?.through.seq ?? null;
      attempts = row?.attempts ?? 0; hasNext = row?.next !== null && row?.next !== undefined;
      if (row?.stopped) return done({ state: "stopped", next: null, reason: row.stopped.reason });
      step = "pin";
      const readPin = row?.confirmed?.layout === 2 ? readArchivePinAfterReceipt : readArchivePin;
      const pin = readPin(budget.native(this.#options.sql, () => ({ metadata: ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES, inputWork: 0 }), archivePinReadBytes), at);
      budget.check();
      if (!pin) return done({ state: "retry", next: this.#later(0), reason: "unavailable" });
      if ("production" in this.#options && !this.#options.admit(at, pin.seed)) { this.#disabled = true; return done({ state: "disabled", next: null }); }
      const policy = this.#options.policies.registry.get(pin.seed.definition);
      if (!policy || !policy.review || policy.support.named !== pin.seed.definition) { this.#disabled = true; return done({ state: "disabled", next: null }); }
      const now = timeMs(this.#options.clock());
      if (now === null) { budget.stop("unavailable"); return done({ state: "retry", next: null, reason: "unavailable" }); }
      step = "due-check";
      if (row?.next && timeMs(row.next)! > now) { detail = "not-due"; return done({ state: "retry", next: row.next }); }
      const indexed = rows.wake(budget);
      if (!row?.pending && indexed && timeMs(indexed)! > now) { detail = "wake-not-due"; return done({ state: "retry", next: indexed }); }
      // Production resolves its binding every pass. Preserve the original
      // pre-I/O retry contract before that additional await, even without a
      // payload row. A due pending Mark gets exactly its existing attempt
      // transition/backoff, once; a pre-Mark pass only updates the wake index.
      if ("production" in this.#options) {
        if (row?.pending) {
          scheduled = this.#later(row.attempts);
          if (scheduled === null) return done({ state: "retry", next: null, reason: "unavailable" });
          row = rows.attempt(scheduled, budget); attempted = true;
        } else {
          scheduled = this.#later(0);
          if (scheduled === null) return done({ state: "retry", next: null, reason: "unavailable" });
          rows.defer(scheduled, budget); deferred = true;
        }
      }
      step = "target";
      const productionTarget = "production" in this.#options ? await budget.wait(() => this.#options.target.resolve(at, { ...pin.seed, creator: pin.seed.creator ? { ...pin.seed.creator } : null }, budget)) : null;
      if ("production" in this.#options && (!productionTarget || row && !same(row.repository, productionTarget))) {
        detail = productionTarget ? "target-different" : "target-missing";
        return done({ state: "retry", next: scheduled, reason: "unavailable" });
      }
      if (!row) {
        if (!deferred) {
          scheduled = this.#later(0);
          if (scheduled === null) return done({ state: "retry", next: null, reason: "unavailable" });
          rows.defer(scheduled, budget); deferred = true;
        }
        const repository = productionTarget ?? await budget.wait(() => this.#options.target.resolve(at, { ...pin.seed, creator: pin.seed.creator ? { ...pin.seed.creator } : null }, budget));
        if (!repository) return done({ state: "retry", next: this.#later(0), reason: "unavailable" });
        const captured = { ...repository };
        step = "format";
        const format = await budget.wait(() => this.#options.provider.format({ ...captured }, allowed));
        row = rows.target(captured, format, budget);
        // Initial target persistence replaces the wake index. Reestablish
        // its charged retry before any parent/source await.
        deferred = false;
      }
      if (!same(row.at, at)) budget.stop("unavailable");
      // Bind native witnesses to this exact repository identity. Repository
      // strings were bounded by ArchiveRows before this serialization.
      budget.spend({ metadata: 32 * 1024, inputWork: 32 * 1024 * 12 });
      const identity = { at, format: row.format, repository: digestBytes(utf8(canonicalize(row.repository))) };
      const frontiers = new ArchiveFrontiers(this.#options.sql, identity);
      let pendingFrontier: ArchiveFrontierPrepared | null = null;
      const ref = journalRef(at.scope);
      // Resolve an outstanding attempt before reconstructing or minting again.
      if (row.pending) {
        captureStrategy = 5; captureThrough = row.pending.through.seq; captureThroughHash = row.pending.through.hash;
        if (!attempted) {
          const next = this.#later(row.attempts);
          if (next === null) { budget.stop("unavailable"); return done({ state: "retry", next: null, reason: "unavailable" }); }
          row = rows.attempt(next, budget); scheduled = next; attempted = true;
        }
        step = "pending-readback";
        const seen = await budget.wait(() => this.#options.provider.ref({ ...row!.repository }, ref, allowed));
        if (row.pending!.layout === 2) {
          try { pendingFrontier = await frontiers.readPending({ ...identity, commit: row.pending!.commit, through: row.pending!.through }, row.pending!, budget); }
          catch (error) {
            // Only a store-owned contradiction of the still-current Mark
            // is corruption. Stale state and resource failures keep retrying.
            const stopped = this.#options.sql.transaction(() => {
              if (!frontiers.isCurrentPendingMismatch(error, budget)) return false;
              rows.stop("rebuild-mismatch", null, budget); return true;
            });
            if (stopped) return done({ state: "stopped", next: null, reason: "rebuild-mismatch" });
            throw error;
          }
        }
        if (seen === row.pending!.commit) { step = "confirm"; return done(this.#confirmed(rows, row, budget, frontiers, pendingFrontier)); }
        if (seen !== row.pending!.parent) { rows.stop("conflict", ref, budget); return done({ state: "stopped", next: null, reason: "conflict" }); }
      } else if (row.confirmed?.layout === 2 && row.confirmed.through.seq >= through.seq) {
        if ("production" in this.#options) {
          // Target I/O may have let a genuine turn seal after the initial
          // cutoff. Recheck charged Native identity/head in a fresh frame;
          // never clear its pending wake from the old snapshot.
          const latest = this.#options.sql.transaction(() => readArchiveScopeFrame(this.#options.sql, at, pin, this.#options.bounds, budget));
          if (latest.head.seq > row.confirmed.through.seq) return done({ state: "retry", next: scheduled });
        }
        rows.clearWake(budget); this.#fallback = null; return done({ state: "idle", next: null });
      }
      if (!row.pending && !deferred) {
        scheduled ??= this.#later(0);
        if (scheduled === null) return done({ state: "retry", next: null, reason: "unavailable" });
        rows.defer(scheduled, budget); deferred = true;
      }
      step = "parent";
      const base = pendingFrontier !== null ? pendingFrontier.base : row.confirmed?.layout === 2
        ? await frontiers.readConfirmed({ ...identity, commit: row.confirmed.commit, through: row.confirmed.through }, budget) : null;
      if (row.confirmed?.layout === 2 && base === null) {
        step = "bootstrap";
        const context = frontiers.beginConfirmedBootstrap(budget);
        if (context === null) return done({ state: "retry", next: scheduled });
        if (!same(context.binding, { ...identity, commit: row.confirmed.commit, through: row.confirmed.through })) return budget.stop("unavailable");
        const finish = frontiers.bootstrapFinish(context);
        if (!finish.ok) return budget.stop("limit");
        if (!admitArchiveMigration(this.#maximum, budget, finish.cost, context.binding.through.seq,
          refusal => { capacityRefusal = refusal && { ...refusal, site: "migration-affordability" }; })) return done({ state: "retry", next: scheduled, reason: "limit" });
        const readParent = this.#options.provider.readParent;
        if (!readParent) return budget.stop("unavailable");
        const captured = await budget.lookaheadAsync(finish.cost, async () => {
          // Current-parent only: exact commit and current trees, then the
          // separately bounded head blob. No complete closure or fallback.
          const source = await budget.wait(() => readParent.call(this.#options.provider,
            { ...row!.repository }, context.binding.commit, allowed, budget));
          return captureJournalParentFrontier(context.binding, source, budget);
        });
        if (captured.kind === "limited") {
          capacityRefusal = captured.refusal && { ...captured.refusal, site: "frontier-capture" };
          return done({ state: "retry", next: scheduled, reason: "limit" });
        }
        const prepared = await frontiers.prepareConfirmedBootstrap(context, captured.value, budget);
        if (!allowed()) return budget.stop("unavailable");
        frontiers.installConfirmedBootstrap(prepared, budget);
        // Migration uses this pass's original allowance. The existing wake
        // starts selection and append in a later pass without a budget reset.
        return done({ state: "retry", next: scheduled });
      }
      const conversionBase = pendingFrontier === null && row.confirmed !== null && row.confirmed.layout !== 2 && (!row.pending || row.pending.layout === 2)
        ? frontiers.readConversionBase(budget) : null;
      const previous = await this.#parent(row, budget, allowed, frontiers, base);
      const prepareSources = "production" in this.#options ? this.#options.sources : undefined;
      step = "sources";
      const preparedSources = prepareSources ? await budget.wait(async () => {
        try { return await prepareSources(row!.confirmed?.layout === 2 ? row!.confirmed.through : null,
          row!.pending?.through ?? through, budget, !!row!.pending); }
        catch (error) {
          // Preserve only the prepaid metadata; wait() retains its original
          // pending unavailable/timeout/debit classification. Late settlements
          // cannot change a completed pass diagnostic.
          if (active && error instanceof ArchivePrefixStopped) sourceFailure = error.sourceFailure ?? null;
          throw error;
        }
      }) : null;
      const sources = preparedSources?.pins ?? this.#options.fixtureSources;
      let archive: JournalArchive | JournalPassArchive;
      let mark: ArchiveMark;
      let selectedParentObjects: readonly string[] | undefined;
      let selectedRowContextBytes: number | undefined;
      if (row.pending) {
        step = "rebuild";
        const rebuild = row.pending.layout === 2 ? rebuildArchivePass : rebuildArchive;
        const rebuilt = await rebuild(this.#options.sql, row, previous.parent, budget, sources);
        if (!rebuilt.ok) { sourceFailure = rebuilt.sourceFailure ?? null; rows.stop(rebuilt.reason, "where" in rebuilt ? rebuilt.where ?? null : null, budget); return done({ state: "stopped", next: null, reason: rebuilt.reason }); }
        archive = rebuilt.archive;
        mark = row.pending;
      } else {
        step = "plan";
        // Only unpublished old v2 receipts need the historical pass metadata.
        // This explicit transition port is never the native append source and
        // is never consulted for pending rebuild or published steady state.
        const legacyAnchorParent = row.confirmed?.layout === 2 && row.confirmed.anchorsPublished !== true && base !== null
          ? (await this.#parent(row, budget, allowed, frontiers, null)).parent : null;
        const common = { bounds: this.#options.bounds, policies: this.#options.policies.registry, parent: previous.parent,
          markedAt: this.#options.clock(), ...(sources ? { fixtureSources: sources } : {}),
          ...(preparedSources?.replayScopes ? { replayScopes: preparedSources.replayScopes } : {}) };
        let planned: Awaited<ReturnType<typeof planPublishedArchiveConversion>>;
        if (row.confirmed && row.confirmed.layout !== 2) {
          captureStrategy = 4; captureThrough = through.seq; captureThroughHash = through.hash;
          if (row.confirmed.through.seq >= ARCHIVE_BOUNDS.entries) return budget.stop("limit");
          if (preparedSources?.prepare) for (let seq = 0; seq <= row.confirmed.through.seq; seq++) await preparedSources.prepare(seq, budget);
          planned = await planPublishedArchiveConversion(this.#options.sql, { ...common, row }, budget);
        }
        else {
          const capacity = rows.prepareCapacityDeferral(row, count => this.#later(count), budget);
          // A previous genuine capacity wake chooses this strategy before
          // planning spends its allowance. Unpublished receipts still admit
          // their complete old range; no exhausted-pass fallback.
          const fixed = "production" in this.#options && capacity.priorCapacityDeferrals > 0
            && row.confirmed?.layout === 2 && base !== null;
          let selectedThrough = through;
          if (fixed) {
            const seq = row.confirmed!.through.seq + 1;
            const next = this.#options.sql.transaction(() => budget.native(this.#options.sql,
              () => ({ metadata: ARCHIVE_POSITION_METADATA_BYTES, inputWork: 0 })).exec(
              "SELECT hash FROM entry WHERE seq = ? AND typeof(hash) = 'text' AND octet_length(hash) = 71 LIMIT 1", seq).toArray());
            if (next.length !== 1 || !isDigest(next[0]?.["hash"]) || seq > through.seq) return budget.stop("unavailable");
            selectedThrough = { seq, hash: next[0]["hash"] };
            if (seq === through.seq && selectedThrough.hash !== through.hash) return budget.stop("unavailable");
          }
          const planner = fixed ? (row.confirmed!.anchorsPublished === true ? planRootFixedArchivePass : planRootFixedUnpublishedArchivePass)
            : "production" in this.#options ? planRootAdaptiveArchivePass : planAdaptiveArchivePass;
          captureStrategy = fixed ? row.confirmed!.anchorsPublished === true ? 2 : 3 : 1;
          captureThrough = selectedThrough.seq;
          captureThroughHash = selectedThrough.hash;
          const adaptive = await planner(this.#options.sql, { ...common, at, through: selectedThrough,
            ...(legacyAnchorParent ? { legacyAnchorParent } : {}),
            ...(preparedSources?.prepare ? { prepareSources: preparedSources.prepare } : {}),
            after: row.confirmed?.through ?? null, format: row.format, row: capacity.planning?.row ?? row,
            ...(capacity.planning ? { rowSnapshot: capacity.planning.token } : {}),
            atomicFirstAttempt: true,
            parentHeld: previous.held, parentUsed: previous.used, maximum: this.#maximum }, budget);
          if (adaptive.ok) {
            captureSelected = adaptive.mark.through.seq;
            captureEntries = captureSelected - (row.confirmed?.through.seq ?? -1);
            observeArchiveSelection(budget, captureSelected);
          }
          if ("fixedFinish" in adaptive) fixedFinish = adaptive.fixedFinish;
          if (!adaptive.ok && "deferred" in adaptive) {
            // Only genuine capacity shortage escalates the durable wake.
            // Its write was reserved before lookahead, not after exhaustion.
            scheduled = capacity.persist();
            capacityRefusal = adaptive.capacityRefusal;
            return done({ state: "retry", next: scheduled, reason: "limit" });
          }
          if (!adaptive.ok && "capacityRefusal" in adaptive) capacityRefusal = adaptive.capacityRefusal ?? null;
          if (adaptive.ok) { selectedParentObjects = adaptive.parentObjects; selectedRowContextBytes = adaptive.rowContextBytes; }
          else if (adaptive.reason === "mismatch") return done({ state: "retry", next: scheduled ?? this.#later(0), reason: adaptive.reason });
          planned = adaptive;
        }
        if (!planned.ok) { sourceFailure = planned.sourceFailure ?? null; rows.stop(planned.reason, "where" in planned ? planned.where ?? null : null, budget); return done({ state: "stopped", next: null, reason: planned.reason }); }
        archive = planned.archive;
        mark = planned.mark;
      }
      const next = scheduled ?? this.#later(row.attempts);
      if (next === null) { budget.stop("unavailable"); return done({ state: "retry", next: null, reason: "unavailable" }); }
      const all = new Map<string, JournalObject>();
      for (const id of selectedParentObjects ?? previous.used) all.set(id, previous.held.get(id)!);
      for (const object of archive.objects) all.set(object.id, object);
      if (mark.layout === 2 && pendingFrontier === null) {
        step = "frontier";
        pendingFrontier = await frontiers.prepareFromSource({
          object: async (id, maximum) => {
            const object = all.get(id);
            return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
          },
        }, mark, base ?? conversionBase, budget, selectedRowContextBytes ?? archiveFrontierRowContextBound(row));
        step = "mark";
        row = this.#options.sql.transaction(() => {
          const marked = rows.markAttempt(mark, next, budget);
          frontiers.stage(pendingFrontier!, budget);
          return marked;
        });
      } else if (!row.pending) row = rows.markAttempt(mark, next, budget);
      if (row.attempts === 0) row = rows.attempt(next, budget);
      scheduled = next;
      step = "copy";
      const objects = [...copyArchiveObjects([...all.values()], row.format, budget, this.#maximum).values()];
      step = "mint";
      credential = await budget.wait(() => this.#options.provider.mintArchive({ ...row!.repository }, { ...at }, allowed));
      if (!credential) return done({ state: "retry", next, reason: "unavailable" });
      const sendingAt = timeMs(this.#options.clock());
      if (timeMs(credential.ends) === null || sendingAt === null || timeMs(credential.ends)! <= sendingAt) budget.stop("unavailable");
      // The own send reply never substitutes for read-back, including loss.
      step = "send";
      await budget.wait(() => this.#options.provider.sendArchive({ repository: { ...row!.repository }, at: { ...at }, ref, old: row!.pending!.parent, commit: archive.commit, objects, credential: credential!, allowed,
        ...(row!.confirmed?.layout === 2 ? { incremental: { budget } } : {}) }));
      step = "readback";
      const seen = await budget.wait(() => this.#options.provider.ref({ ...row!.repository }, ref, allowed));
      if (seen === archive.commit) { step = "confirm"; return done(this.#confirmed(rows, row, budget, frontiers, pendingFrontier)); }
      if (seen !== row.pending!.parent) { rows.stop("conflict", ref, budget); return done({ state: "stopped", next: null, reason: "conflict" }); }
      return done({ state: "retry", next });
    } catch (error) {
      if (error instanceof ArchivePrefixStopped) sourceFailure = error.sourceFailure ?? null;
      // Preserve a terminal planner debit if a subsequent row stop encounters
      // that same stopped budget; never borrow an exploratory refusal.
      if (error instanceof ArchiveStopped && error.capacityRefusal) capacityRefusal = { ...error.capacityRefusal, site: "pass-debit" };
      else if (!(error instanceof ArchiveStopped) || error.reason !== "limit") capacityRefusal = null;
      caught = error instanceof ArchiveStopped ? error.reason : "other";
      const reason = error instanceof ArchiveStopped ? error.reason : "unavailable";
      this.#fallback = scheduled ?? this.#later(0); return done({ state: "retry", next: this.#fallback, reason });
    } finally {
      active = false;
      const parentRead = finishArchiveParentRead(budget);
      if (credential) { try { budget.check(); await budget.wait(() => this.#options.provider.revokeArchive(credential!)); } catch { /* The short-lived credential may expire; it is never recorded. */ } }
      try {
        const reason = observed.outcome?.reason;
        const known = ["limit", "timeout", "unavailable", "conflict", "mismatch", "parent", "missing-input", "rebuild-mismatch", "unsupported-archive-cohort", "foreign-source-unavailable"];
        const position = (value: number | null) => value !== null && Number.isSafeInteger(value) && value >= 0 ? value : null;
        const cost = budget.admitted();
        const states = ["idle", "disabled", "retry", "stopped", "confirmed"];
        const refusalKinds = ["debit", "lookahead-reserve", "window-metadata", "window-entry", "finish-quote", "migration-quote"];
        const refusalSites = ["prepare-sources", "scout-open", "scout-next", "shape-inventory", "prepare-finish", "finish-affordability", "frontier-capture", "migration-affordability", "plan-debit", "pass-debit"];
        const capacityObservation = readArchiveCapacityObservation(budget, {
          throughSeq: captureThrough,
          ...(captureThroughHash !== undefined ? { throughHash: captureThroughHash } : {}),
          scalars: {
            strategy: captureStrategy, state: states.indexOf(observed.outcome?.state ?? "") + 1,
            // 0 absent, 1 unrecognised, then the existing known-reason order.
            reason: reason === undefined ? 0 : known.indexOf(reason) + 2,
            ...(captureSelected !== null ? { selectedSeq: captureSelected } : {}),
            ...(captureEntries !== undefined ? { selectedEntries: captureEntries } : {}),
            ...(fixedFinish ? { metadataMargin: fixedFinish.metadataMargin } : {}),
            ...(capacityRefusal ? { refusalKind: refusalKinds.indexOf(capacityRefusal.kind) + 1,
              refusalSite: refusalSites.indexOf(capacityRefusal.site) + 1 } : {}),
          },
          costs: { cost, ...(fixedFinish ? { fixedUsed: fixedFinish.used, fixedRemaining: fixedFinish.remaining } : {}),
            ...(capacityRefusal ? { refusalRequested: capacityRefusal.requested, refusalReserved: capacityRefusal.reserved,
              refusalUsed: capacityRefusal.used, refusalLimit: capacityRefusal.limit, refusalShortfall: capacityRefusal.shortfall } : {}) },
        });
        console.info("archive-pass-diagnostic-v1", {
          step, detail, rowPhaseAtLoad: phase, confirmed: position(confirmed), pending: position(pending), attemptsAtLoad: position(attempts), hasNext,
          attempted, state: observed.outcome?.state ?? "threw", reason: reason === undefined ? "none" : known.includes(reason) ? reason : "other",
          caught: known.includes(caught) ? caught : caught === "none" ? "none" : "other", cost,
          reservationCosts: ArchiveBudget.prototype.reservationCosts.call(budget),
          parentRead, capacityRefusal, fixedFinish, sourceFailure, capacityObservation,
        });
      } catch { /* Observation cannot replace the original archive result. */ }
    }
  }
  #confirmed(rows: ArchiveRows, row: ArchiveRow, budget: ArchiveBudget, frontiers: ArchiveFrontiers, frontier: ArchiveFrontierPrepared | null): ArchivePass {
    const mark = row.pending!, latest = this.#options.current();
    const next = mark.layout !== 2 || latest && latest.head.seq > mark.through.seq ? this.#options.clock() : null;
    this.#options.sql.transaction(() => {
      if (frontier !== null) frontiers.promote(frontier, budget);
      rows.confirm(mark.commit, budget, next);
    });
    this.#fallback = null;
    return { state: "confirmed", next };
  }
}
