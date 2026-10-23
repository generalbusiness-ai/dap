/** One bounded asynchronous archive pass. No entry, operation or public RPC.
 * Configuration and reviewed policy belong to the trusted object owner. */
import { same } from "@generalbusiness/dap-bytes";
import type { Bounds, Head, ScopeRef, Seed, Timestamp } from "@generalbusiness/dap-contract";
import { isScopeRef, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { journalId, journalRef, type JournalArchive, type JournalPassArchive, type JournalFormat, type JournalObject, type JournalObjectSource } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, ArchiveBudget, ArchiveStopped } from "./archive-budget.ts";
import { ARCHIVE_TRANSFER_OBJECTS, archiveObjectListMetadata, archiveObjectCopyWork } from "./archive-transfer-cost.ts";
import { planPublishedArchiveConversion, rebuildArchive, rebuildArchivePass } from "./archive-build.ts";
import { planAdaptiveArchivePass, planRootAdaptiveArchivePass } from "./archive-adaptive.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES, readArchivePin, readArchivePinAfterReceipt } from "./archive-pin.ts";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";
import { ArchiveRows, type ArchiveRow } from "./archive-row.ts";
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
  #copy(objects: readonly JournalObject[], format: JournalFormat, budget: ArchiveBudget): Map<string, JournalObject> {
    if (!Array.isArray(objects) || objects.length > ARCHIVE_TRANSFER_OBJECTS) budget.stop("limit");
    budget.spend({ metadata: archiveObjectListMetadata(objects.length) });
    let size = 0;
    const owned = new Map<string, JournalObject>();
    for (const object of objects) {
      budget.check(); journalId(format, object.id);
      if (!(object.data instanceof Uint8Array) || !["commit", "tree", "blob"].includes(object.type) || owned.has(object.id)) budget.stop("unavailable");
      if (object.data.length > this.#maximum - size) budget.stop("limit");
      size += object.data.length; budget.spend({ inputWork: archiveObjectCopyWork(object.data.length) });
      owned.set(object.id, { id: object.id, type: object.type, data: new Uint8Array(object.data) });
    }
    return owned;
  }
  async #parent(row: ArchiveRow, budget: ArchiveBudget, allowed: () => boolean) {
    const id = row.pending?.parent ?? row.confirmed?.commit ?? null;
    if (row.pending?.layout === 2 || !row.pending) {
      const held = new Map<string, JournalObject>(), used = new Set<string>(); let bytes = 0;
      if (id === null) return { parent: null, held, used };
      const read = this.#options.provider.readObject;
      if (!read) return budget.stop("unavailable");
      const source: JournalObjectSource = {
        object: async (key, maximum) => {
          const object = held.get(key);
          return object ? { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null } : null;
        },
        boundedObject: async (key, type, maximum) => {
          budget.check(); let object = held.get(key);
          if (!object) {
            const got = await budget.wait(() => read.call(this.#options.provider, { ...row.repository }, { id: key, type, maximum }, allowed, budget));
            if (got === null) return null;
            if (!(got.data instanceof Uint8Array) || got.type !== type || got.size !== got.data.length || got.size > maximum || got.size > this.#maximum - bytes) return budget.stop("unavailable");
            object = this.#copy([{ id: key, type, data: got.data }], row.format, budget).get(key)!;
            bytes += object.data.length; held.set(key, object);
          }
          used.add(key);
          return { type: object.type, size: object.data.length, data: object.data.length <= maximum ? object.data : null };
        },
      };
      return { parent: { id, source }, held, used };
    }
    const held = id === null ? new Map<string, JournalObject>() : this.#copy(await budget.wait(() => this.#options.provider.objects({ ...row.repository }, id, { bytes: this.#maximum, objects: 8192 }, allowed)), row.format, budget);
    const used = new Set<string>();
    const parent = id === null ? null : { id, source: { object: async (key: string, most: number) => {
      const object = held.get(key);
      if (!object) return null;
      if (object.data.length > most) return { type: object.type, size: object.data.length, data: null };
      used.add(key); return { type: object.type, size: object.data.length, data: object.data };
    } } };
    return { parent, held, used };
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
        if (seen === row.pending!.commit) { step = "confirm"; return done(this.#confirmed(rows, row, budget)); }
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
      const previous = await this.#parent(row, budget, allowed);
      const prepareSources = "production" in this.#options ? this.#options.sources : undefined;
      step = "sources";
      const preparedSources = prepareSources ? await budget.wait(() => prepareSources(row!.confirmed?.layout === 2 ? row!.confirmed.through : null,
        row!.pending?.through ?? through, budget, !!row!.pending)) : null;
      const sources = preparedSources?.pins ?? this.#options.fixtureSources;
      let archive: JournalArchive | JournalPassArchive;
      let selectedParentObjects: readonly string[] | undefined;
      if (row.pending) {
        step = "rebuild";
        const rebuild = row.pending.layout === 2 ? rebuildArchivePass : rebuildArchive;
        const rebuilt = await rebuild(this.#options.sql, row, previous.parent, budget, sources);
        if (!rebuilt.ok) { rows.stop(rebuilt.reason, "where" in rebuilt ? rebuilt.where ?? null : null, budget); return done({ state: "stopped", next: null, reason: rebuilt.reason }); }
        archive = rebuilt.archive;
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
            atomicFirstAttempt: "production" in this.#options,
            parentHeld: previous.held, parentUsed: previous.used, maximum: this.#maximum }, budget);
          if (adaptive.ok) selectedParentObjects = adaptive.parentObjects;
          else if (adaptive.reason === "mismatch") return done({ state: "retry", next: scheduled ?? this.#later(0), reason: adaptive.reason });
          planned = adaptive;
        }
        if (!planned.ok) { rows.stop(planned.reason, "where" in planned ? planned.where ?? null : null, budget); return done({ state: "stopped", next: null, reason: planned.reason }); }
        archive = planned.archive;
        step = "mark";
        if ("production" in this.#options) {
          const first = scheduled ?? this.#later(0);
          if (first === null) { budget.stop("unavailable"); return done({ state: "retry", next: null, reason: "unavailable" }); }
          row = rows.markAttempt(planned.mark, first, budget); scheduled = first;
        } else row = rows.mark(planned.mark, budget);
      }
      const next = scheduled ?? this.#later(row.attempts);
      if (next === null) { budget.stop("unavailable"); return done({ state: "retry", next: null, reason: "unavailable" }); }
      if (row.attempts === 0) row = rows.attempt(next, budget);
      scheduled = next;
      const all = new Map<string, JournalObject>();
      for (const id of selectedParentObjects ?? previous.used) all.set(id, previous.held.get(id)!);
      for (const object of archive.objects) all.set(object.id, object);
      step = "copy";
      const objects = [...this.#copy([...all.values()], row.format, budget).values()];
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
      if (seen === archive.commit) { step = "confirm"; return done(this.#confirmed(rows, row, budget)); }
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
  #confirmed(rows: ArchiveRows, row: ArchiveRow, budget: ArchiveBudget): ArchivePass {
    const mark = row.pending!, latest = this.#options.current();
    const next = mark.layout !== 2 || latest && latest.head.seq > mark.through.seq ? this.#options.clock() : null;
    rows.confirm(mark.commit, budget, next); this.#fallback = null;
    return { state: "confirmed", next };
  }
}
