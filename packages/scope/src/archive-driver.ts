/** One bounded asynchronous archive pass. No entry, operation or public RPC.
 * Configuration and reviewed policy belong to the trusted object owner. */
import { canonicalize, digestBytes, same, utf8 } from "@generalbusiness/dap-bytes";
import type { Bounds, Head, ScopeRef, Seed, Timestamp } from "@generalbusiness/dap-contract";
import { isScopeRef, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { captureJournalParentFrontier, journalRef, type JournalArchive, type JournalPassArchive, type JournalFormat, type JournalObject, type JournalObjectSource } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, ArchiveBudget, ArchiveStopped } from "./archive-budget.ts";
import { archiveParent, copyArchiveObjects } from "./archive-parent.ts";
import { ArchiveFrontiers, type ArchiveFrontierBase, type ArchiveFrontierPrepared } from "./archive-frontier-store.ts";
import { planPublishedArchiveConversion, rebuildArchive, rebuildArchivePass } from "./archive-build.ts";
import { planAdaptiveArchivePass, planRootAdaptiveArchivePass } from "./archive-adaptive.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES, readArchivePin, readArchivePinAfterReceipt } from "./archive-pin.ts";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";
import { ArchiveRows, type ArchiveMark, type ArchiveRow } from "./archive-row.ts";
import { finishArchiveParentRead, startArchiveParentReadPass } from "./archive-parent-read-diagnostic.ts";
import type { DestinationRepository } from "./destination-host.ts";
import type { Sql } from "./sqlite.ts";
import { readArchiveScopeFrame } from "./archive-prefix.ts";

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
    const budget = this.#options.budget?.() ?? new ArchiveBudget();
    startArchiveParentReadPass(budget);
    // Temporary pass diagnostic: fixed categories and already-loaded scalars
    // only. It adds no archive read, admission, retry or persistent state.
    let step = "row-load", detail = "none", caught = "none";
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
      const pin = readPin(budget.native(this.#options.sql, () => ({ metadata: ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES, inputWork: 0 })), at);
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
        const captured = await budget.lookaheadAsync(finish.cost, async () => {
          const remote = await this.#parent(row!, budget, allowed, frontiers, null);
          if (remote.parent === null) return budget.stop("unavailable");
          return captureJournalParentFrontier(context.binding, remote.parent.source, budget);
        });
        if (captured.kind === "limited") return done({ state: "retry", next: scheduled, reason: "limit" });
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
      const preparedSources = prepareSources ? await budget.wait(() => prepareSources(row!.confirmed?.layout === 2 ? row!.confirmed.through : null,
        row!.pending?.through ?? through, budget, !!row!.pending)) : null;
      const sources = preparedSources?.pins ?? this.#options.fixtureSources;
      let archive: JournalArchive | JournalPassArchive;
      let mark: ArchiveMark;
      let selectedParentObjects: readonly string[] | undefined;
      if (row.pending) {
        step = "rebuild";
        const rebuild = row.pending.layout === 2 ? rebuildArchivePass : rebuildArchive;
        const rebuilt = await rebuild(this.#options.sql, row, previous.parent, budget, sources);
        if (!rebuilt.ok) { rows.stop(rebuilt.reason, "where" in rebuilt ? rebuilt.where ?? null : null, budget); return done({ state: "stopped", next: null, reason: rebuilt.reason }); }
        archive = rebuilt.archive;
        mark = row.pending;
      } else {
        step = "plan";
        const common = { bounds: this.#options.bounds, policies: this.#options.policies.registry, parent: previous.parent,
          markedAt: this.#options.clock(), ...(sources ? { fixtureSources: sources } : {}),
          ...(preparedSources?.replayScopes ? { replayScopes: preparedSources.replayScopes } : {}) };
        let planned: Awaited<ReturnType<typeof planPublishedArchiveConversion>>;
        if (row.confirmed && row.confirmed.layout !== 2) {
          if (row.confirmed.through.seq >= ARCHIVE_BOUNDS.entries) return budget.stop("limit");
          if (preparedSources?.prepare) for (let seq = 0; seq <= row.confirmed.through.seq; seq++) await preparedSources.prepare(seq, budget);
          planned = await planPublishedArchiveConversion(this.#options.sql, { ...common, row }, budget);
        }
        else {
          const adaptive = await ("production" in this.#options ? planRootAdaptiveArchivePass : planAdaptiveArchivePass)(this.#options.sql, { ...common, at, through,
            ...(preparedSources?.prepare ? { prepareSources: preparedSources.prepare } : {}),
            after: row.confirmed?.through ?? null, format: row.format, row,
            atomicFirstAttempt: true,
            parentHeld: previous.held, parentUsed: previous.used, maximum: this.#maximum }, budget);
          if (adaptive.ok) selectedParentObjects = adaptive.parentObjects;
          else if (adaptive.reason === "mismatch") return done({ state: "retry", next: scheduled ?? this.#later(0), reason: adaptive.reason });
          planned = adaptive;
        }
        if (!planned.ok) { rows.stop(planned.reason, "where" in planned ? planned.where ?? null : null, budget); return done({ state: "stopped", next: null, reason: planned.reason }); }
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
        const frontier = await captureJournalParentFrontier({ ...identity, commit: mark.commit, through: mark.through }, {
          object: async (id, maximum) => {
            const object = all.get(id);
            return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
          },
        }, budget);
        pendingFrontier = await frontiers.prepare(frontier, mark, base ?? conversionBase, budget);
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
      caught = error instanceof ArchiveStopped ? error.reason : "other";
      const reason = error instanceof ArchiveStopped ? error.reason : "unavailable";
      this.#fallback = scheduled ?? this.#later(0); return done({ state: "retry", next: this.#fallback, reason });
    } finally {
      active = false;
      const parentRead = finishArchiveParentRead(budget);
      if (credential) { try { budget.check(); await budget.wait(() => this.#options.provider.revokeArchive(credential!)); } catch { /* The short-lived credential may expire; it is never recorded. */ } }
      try {
        const reason = observed.outcome?.reason;
        const known = ["limit", "timeout", "unavailable", "conflict", "mismatch", "parent", "missing-input", "rebuild-mismatch", "unsupported-archive-cohort"];
        const position = (value: number | null) => value !== null && Number.isSafeInteger(value) && value >= 0 ? value : null;
        console.info("archive-pass-diagnostic-v1", {
          step, detail, rowPhaseAtLoad: phase, confirmed: position(confirmed), pending: position(pending), attemptsAtLoad: position(attempts), hasNext,
          attempted, state: observed.outcome?.state ?? "threw", reason: reason === undefined ? "none" : known.includes(reason) ? reason : "other",
          caught: known.includes(caught) ? caught : caught === "none" ? "none" : "other", cost: budget.admitted(), parentRead,
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
