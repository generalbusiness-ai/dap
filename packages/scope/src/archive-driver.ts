/** One bounded asynchronous archive pass. No entry, operation or public RPC.
 * Configuration and reviewed policy belong to the trusted object owner. */
import type { Bounds, Head, ScopeRef, Seed, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, isScopeRef, timeMs, timeOf } from "@generalbusiness/artroom-bytes";
import { journalId, journalRef, type JournalArchive, type JournalFormat, type JournalObject } from "@generalbusiness/artroom-git/journal";
import { ArchiveBudget, ArchiveStopped } from "./archive-budget.ts";
import { planArchive, rebuildArchive } from "./archive-build.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES, readArchivePin } from "./archive-pin.ts";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";
import { ArchiveRows, type ArchiveRow } from "./archive-row.ts";
import type { DestinationRepository } from "./destination-host.ts";
import type { Sql } from "./sqlite.ts";

export interface ArchiveCredential { readonly id: string; readonly ends: Timestamp; readonly plaintext: string }
export interface ArchiveSend {
  readonly repository: DestinationRepository; readonly at: ScopeRef; readonly ref: string;
  readonly old: string | null; readonly commit: string; readonly objects: readonly JournalObject[];
  readonly credential: ArchiveCredential; readonly allowed: () => boolean;
}
/** These are trusted bounded I/O ports. Actual adapters must enforce the
 * scope/ref binding again at send, not rely on the driver's earlier check. */
export interface ArchiveProvider {
  format(repository: DestinationRepository, allowed: () => boolean): Promise<JournalFormat>;
  ref(repository: DestinationRepository, ref: string, allowed: () => boolean): Promise<string | null>;
  objects(repository: DestinationRepository, commit: string, most: { readonly bytes: number; readonly objects: number }, allowed: () => boolean): Promise<readonly JournalObject[]>;
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
const same = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);

export class ArchiveDriver {
  readonly #options: FixtureArchiveDriverOptions;
  readonly #maximum: number;
  #rows: ArchiveRows | null = null;
  #running: Promise<ArchivePass> | null = null;
  #disabled = false;
  #fallback: Timestamp | null = null;
  constructor(options: FixtureArchiveDriverOptions) {
    if (options.policies.fixture !== "archive-policies" || options.target.fixture !== "archive-target" || options.provider.fixture !== "archive-provider") throw new Error("archive fixture ports required");
    this.#options = { ...options, bounds: { ...options.bounds }, policies: { ...options.policies }, target: { fixture: "archive-target", resolve: options.target.resolve.bind(options.target) } };
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
    if (!Array.isArray(objects) || objects.length > 8192) budget.stop("limit");
    budget.spend({ metadata: objects.length * 128 });
    let size = 0;
    const owned = new Map<string, JournalObject>();
    for (const object of objects) {
      budget.check(); journalId(format, object.id);
      if (!(object.data instanceof Uint8Array) || !["commit", "tree", "blob"].includes(object.type) || owned.has(object.id)) budget.stop("unavailable");
      if (object.data.length > this.#maximum - size) budget.stop("limit");
      size += object.data.length; budget.spend({ inputWork: object.data.length * 4 });
      owned.set(object.id, { id: object.id, type: object.type, data: new Uint8Array(object.data) });
    }
    return owned;
  }
  async #parent(row: ArchiveRow, budget: ArchiveBudget, allowed: () => boolean) {
    const id = row.pending?.parent ?? row.confirmed?.commit ?? null;
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
    let active = true, credential: ArchiveCredential | null = null, scheduled: Timestamp | null = null;
    const allowed = (): boolean => { if (!active) return false; try { budget.check(); return true; } catch { return false; } };
    try {
      const rows = this.#store();
      if (!rows || this.#options.policies.registry.size === 0) return { state: "disabled", next: null };
      budget.spend({ inputWork: 4 * (ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES) });
      const current = this.#options.current()!;
      const at = { ...current.at }, through = { ...current.head };
      const pin = readArchivePin(budget.native(this.#options.sql, () => ({ metadata: ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES, inputWork: 0 })), at);
      budget.check();
      if (!pin) return { state: "retry", next: this.#later(0), reason: "unavailable" };
      const policy = this.#options.policies.registry.get(pin.seed.definition);
      if (!policy || !policy.review || policy.support.named !== pin.seed.definition) { this.#disabled = true; return { state: "disabled", next: null }; }
      let row = rows.load(budget);
      if (row?.stopped) return { state: "stopped", next: null, reason: row.stopped.reason };
      const now = timeMs(this.#options.clock());
      if (now === null) { budget.stop("unavailable"); return { state: "retry", next: null, reason: "unavailable" }; }
      if (row?.next && timeMs(row.next)! > now) return { state: "retry", next: row.next };
      const indexed = rows.wake(budget);
      if (!row?.pending && indexed && timeMs(indexed)! > now) return { state: "retry", next: indexed };
      if (!row) {
        scheduled = this.#later(0);
        if (scheduled === null) return { state: "retry", next: null, reason: "unavailable" };
        rows.defer(scheduled, budget);
        const repository = await budget.wait(() => this.#options.target.resolve(at, { ...pin.seed, creator: pin.seed.creator ? { ...pin.seed.creator } : null }, budget));
        if (!repository) return { state: "retry", next: this.#later(0), reason: "unavailable" };
        const captured = { ...repository };
        const format = await budget.wait(() => this.#options.provider.format({ ...captured }, allowed));
        row = rows.target(captured, format, budget);
      }
      if (!same(row.at, at)) budget.stop("unavailable");
      const ref = journalRef(at.scope);
      // Resolve an outstanding attempt before reconstructing or minting again.
      if (row.pending) {
        const next = this.#later(row.attempts);
        if (next === null) { budget.stop("unavailable"); return { state: "retry", next: null, reason: "unavailable" }; }
        row = rows.attempt(next, budget); scheduled = next;
        const seen = await budget.wait(() => this.#options.provider.ref({ ...row!.repository }, ref, allowed));
        if (seen === row.pending!.commit) return this.#confirmed(rows, row, budget);
        if (seen !== row.pending!.parent) { rows.stop("conflict", ref, budget); return { state: "stopped", next: null, reason: "conflict" }; }
      } else if (row.confirmed && row.confirmed.through.seq >= through.seq) {
        rows.clearWake(budget); this.#fallback = null; return { state: "idle", next: null };
      }
      if (!row.pending) {
        scheduled ??= this.#later(0);
        if (scheduled === null) return { state: "retry", next: null, reason: "unavailable" };
        rows.defer(scheduled, budget);
      }
      const previous = await this.#parent(row, budget, allowed);
      let archive: JournalArchive;
      if (row.pending) {
        const rebuilt = await rebuildArchive(this.#options.sql, row, previous.parent, budget, this.#options.fixtureSources);
        if (!rebuilt.ok) { rows.stop(rebuilt.reason, "where" in rebuilt ? rebuilt.where ?? null : null, budget); return { state: "stopped", next: null, reason: rebuilt.reason }; }
        archive = rebuilt.archive;
      } else {
        const planned = await planArchive(this.#options.sql, { at, through, bounds: this.#options.bounds, policies: this.#options.policies.registry, format: row.format, parent: previous.parent, markedAt: this.#options.clock(), ...(this.#options.fixtureSources ? { fixtureSources: this.#options.fixtureSources } : {}) }, budget);
        if (!planned.ok) { rows.stop(planned.reason, "where" in planned ? planned.where ?? null : null, budget); return { state: "stopped", next: null, reason: planned.reason }; }
        archive = planned.archive; row = rows.mark(planned.mark, budget);
      }
      const next = scheduled ?? this.#later(row.attempts);
      if (next === null) { budget.stop("unavailable"); return { state: "retry", next: null, reason: "unavailable" }; }
      if (row.attempts === 0) row = rows.attempt(next, budget);
      scheduled = next;
      const all = new Map<string, JournalObject>();
      for (const id of previous.used) all.set(id, previous.held.get(id)!);
      for (const object of archive.objects) all.set(object.id, object);
      const objects = [...this.#copy([...all.values()], row.format, budget).values()];
      credential = await budget.wait(() => this.#options.provider.mintArchive({ ...row!.repository }, { ...at }, allowed));
      if (!credential) return { state: "retry", next, reason: "unavailable" };
      const sendingAt = timeMs(this.#options.clock());
      if (timeMs(credential.ends) === null || sendingAt === null || timeMs(credential.ends)! <= sendingAt) budget.stop("unavailable");
      // The own send reply never substitutes for read-back, including loss.
      await budget.wait(() => this.#options.provider.sendArchive({ repository: { ...row!.repository }, at: { ...at }, ref, old: row!.pending!.parent, commit: archive.commit, objects, credential: credential!, allowed }));
      const seen = await budget.wait(() => this.#options.provider.ref({ ...row!.repository }, ref, allowed));
      if (seen === archive.commit) return this.#confirmed(rows, row, budget);
      if (seen !== row.pending!.parent) { rows.stop("conflict", ref, budget); return { state: "stopped", next: null, reason: "conflict" }; }
      return { state: "retry", next };
    } catch (error) {
      const reason = error instanceof ArchiveStopped ? error.reason : "unavailable";
      this.#fallback = scheduled ?? this.#later(0); return { state: "retry", next: this.#fallback, reason };
    } finally {
      active = false;
      if (credential) { try { budget.check(); await budget.wait(() => this.#options.provider.revokeArchive(credential!)); } catch { /* The short-lived credential may expire; it is never recorded. */ } }
    }
  }
  #confirmed(rows: ArchiveRows, row: ArchiveRow, budget: ArchiveBudget): ArchivePass {
    const mark = row.pending!, latest = this.#options.current();
    const next = latest && latest.head.seq > mark.through.seq ? this.#options.clock() : null;
    rows.confirm(mark.commit, budget, next); this.#fallback = null;
    return { state: "confirmed", next };
  }
}
