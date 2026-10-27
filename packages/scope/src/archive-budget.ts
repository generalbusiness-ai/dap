/** One local inventory pass's admitted work, not a heap or custody proof.
 * Native callers must reserve SQL/parse work before touching the bodies. */
import { natural } from "@generalbusiness/dap-bytes";
import type { Sql, SqlValue } from "./sqlite.ts";

export const ARCHIVE_BOUNDS = Object.freeze({ entries: 4096, attempts: 512, nodes: 64, calls: 16384, metadata: 4 * 1024 * 1024, inputWork: 64 * 1024 * 1024 });
export const ARCHIVE_SECONDS = 30;
export type ArchiveCost = { -readonly [K in keyof typeof ARCHIVE_BOUNDS]: number };
const keys = ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const;
export type ArchiveStopReason = "limit" | "timeout" | "unavailable";
export class ArchiveStopped extends Error {
  constructor(readonly reason: ArchiveStopReason, readonly capacityRefusal: ArchiveCapacityCheck | null = null) { super(`archive-${reason}`); }
}
const zero = (): ArchiveCost => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });
export interface ArchiveCapacityCheck {
  readonly kind: "debit" | "lookahead-reserve" | "window-metadata" | "window-entry" | "finish-quote" | "migration-quote";
  readonly requested: Readonly<ArchiveCost>; readonly reserved: Readonly<ArchiveCost>;
  readonly used: Readonly<ArchiveCost>; readonly limit: Readonly<ArchiveCost>; readonly shortfall: Readonly<ArchiveCost>;
}
export interface ArchiveCapacityRefusal extends ArchiveCapacityCheck {
  readonly site: "prepare-sources" | "scout-open" | "scout-next" | "shape-inventory" | "prepare-finish" | "finish-affordability" | "frontier-capture" | "migration-affordability" | "plan-debit" | "pass-debit";
}
export interface ArchiveCapacityLimited { readonly kind: "limited"; readonly refusal: ArchiveCapacityCheck | null }
class ArchiveLookaheadLimited extends Error {}
type Lookahead<T> = ArchiveCapacityLimited | { readonly kind: "read"; readonly value: T };

/** Limits may only decrease in trusted tests/configuration. There is no
 * reset, top-up, per-entry allowance or uncharged cache path. */
export class ArchiveBudget {
  readonly #limits: ArchiveCost;
  readonly #used = zero();
  readonly #until: number;
  #last: number;
  #stopped: ArchiveStopReason | null = null;
  #reserve: ArchiveCost | null = null;
  #lookaheadBlocked = false;
  #lookaheadRefusal: ArchiveCapacityCheck | null = null;
  #asyncLookahead = false;
  readonly #reservations = new WeakMap<object, Readonly<ArchiveCost>>();
  #unsettledMetadata = 0;
  #releasedMetadata = 0;
  #settlementRefusal: "none" | "unknown-reservation" | "invalid-received" = "none";
  constructor(limits: Partial<ArchiveCost> = {}, readonly now: () => number = () => performance.now(), milliseconds = ARCHIVE_SECONDS * 1000) {
    if (!natural(milliseconds) || milliseconds > ARCHIVE_SECONDS * 1000 || Object.keys(limits).some(key => !(keys as readonly string[]).includes(key))) throw new ArchiveStopped("limit");
    this.#limits = { ...ARCHIVE_BOUNDS, ...limits };
    for (const key of keys) if (!natural(this.#limits[key]) || this.#limits[key] > ARCHIVE_BOUNDS[key]) throw new ArchiveStopped("limit");
    this.#last = now();
    if (!Number.isFinite(this.#last)) throw new ArchiveStopped("unavailable");
    this.#until = this.#last + milliseconds;
  }
  stop(reason: ArchiveStopReason, refusal: ArchiveCapacityCheck | null = null): never {
    this.#stopped ??= reason;
    throw new ArchiveStopped(this.#stopped, this.#stopped === reason ? refusal : null);
  }
  check(): void {
    if (this.#stopped) throw new ArchiveStopped(this.#stopped);
    const time = this.now();
    if (!Number.isFinite(time) || time < this.#last) this.stop("unavailable");
    this.#last = time;
    if (time >= this.#until) this.stop("timeout");
    if (this.#lookaheadBlocked) throw new ArchiveLookaheadLimited();
  }
  /** Scheduling check against this same original allowance. A false result
   * spends nothing and does not stop the pass. It grants no I/O admission. */
  canSpend(cost: Partial<ArchiveCost>): boolean {
    this.check();
    if (Object.keys(cost).some(key => !(keys as readonly string[]).includes(key))) this.stop("limit");
    for (const key of keys) {
      const n = cost[key] ?? 0;
      if (!natural(n)) this.stop("limit");
    }
    return keys.every(key => (cost[key] ?? 0) <= this.#limits[key] - this.#used[key]);
  }
  /** Refusal-only observation of a validated affordability decision. No clock,
   * debit or admission; callers attach it to that operation's result, never
   * treat an earlier exploratory refusal as the pass's terminal cause. */
  capacityRefusal(cost: Partial<ArchiveCost>, kind: ArchiveCapacityCheck["kind"], reserve: Partial<ArchiveCost> = {}): ArchiveCapacityCheck | null {
    if ([cost, reserve].some(value => Object.keys(value).some(key => !(keys as readonly string[]).includes(key)))
      || keys.some(key => !natural(cost[key] ?? 0) || !natural(reserve[key] ?? 0))) return null;
    const shortfall = zero();
    for (const key of keys) {
      const combined = (cost[key] ?? 0) + (reserve[key] ?? 0);
      // An unsafe intermediate can round back to an apparently safe but
      // incorrect shortfall. Absence is more honest than a guessed axis.
      if (!natural(combined)) return null;
      shortfall[key] = Math.max(0, combined - (this.#limits[key] - this.#used[key]));
      if (!natural(shortfall[key])) return null;
    }
    if (!keys.some(key => shortfall[key] > 0)) return null;
    return { kind, requested: { ...zero(), ...cost }, reserved: { ...zero(), ...reserve },
      used: { ...this.#used }, limit: { ...this.#limits }, shortfall };
  }
  spend(cost: Partial<ArchiveCost>): void {
    const fits = this.canSpend(cost);
    if (this.#reserve !== null) {
      if (!fits || keys.some(key => (cost[key] ?? 0) + this.#reserve![key] > this.#limits[key] - this.#used[key])) {
        this.#lookaheadRefusal = this.capacityRefusal(cost, "debit", this.#reserve);
        this.#lookaheadBlocked = true;
        throw new ArchiveLookaheadLimited();
      }
    } else if (!fits) this.stop("limit", this.capacityRefusal(cost, "debit"));
    for (const key of keys) this.#used[key] += cost[key] ?? 0;
  }
  /** Admit the complete read ceiling before I/O. Only this budget can
   * settle the opaque handle; an abandoned read keeps its full charge. */
  reserve(cost: Partial<ArchiveCost>): object {
    const copy = { ...cost };
    this.spend(copy);
    const handle = Object.freeze({});
    const held = Object.freeze({ ...zero(), ...copy });
    this.#reservations.set(handle, held);
    this.#unsettledMetadata += held.metadata;
    return handle;
  }
  /** Release only unused byte allowance after a completed, bounded read.
   * Calls, nodes, entries and attempts have happened and remain charged.
   * Byte-proportional input work rounds up; fixed work belongs in spend().
   * No settlement can revive a stopped pass or move its original deadline. */
  settle(handle: object, received: number): void {
    this.check();
    const held = this.#reservations.get(handle);
    if (!held) { this.#settlementRefusal = "unknown-reservation"; this.stop("limit"); }
    if (!natural(received) || received > held.metadata) {
      this.#settlementRefusal = "invalid-received"; this.stop("limit");
    }
    const released = held.metadata - received;
    if (!natural(this.#releasedMetadata + released)) this.stop("unavailable");
    const inputWork = held.metadata === 0 ? held.inputWork : Math.ceil(held.inputWork * received / held.metadata);
    this.#reservations.delete(handle);
    this.#used.metadata -= released;
    this.#used.inputWork -= held.inputWork - inputWork;
    this.#unsettledMetadata -= held.metadata;
    this.#releasedMetadata += released;
  }
  /** Copied scalars only. Reserved includes every debit before refunds;
   * settled includes outstanding reservations at their full ceilings. */
  reservationCosts(): Readonly<{ metadataReserved: number; metadataSettled: number; unsettledMetadata: number;
    settlementRefusal: "none" | "unknown-reservation" | "invalid-received" }> {
    return { metadataReserved: this.#used.metadata + this.#releasedMetadata, metadataSettled: this.#used.metadata,
      unsettledMetadata: this.#unsettledMetadata, settlementRefusal: this.#settlementRefusal };
  }
  #beginLookahead(reserve: Partial<ArchiveCost>, asynchronous: boolean): ArchiveCapacityLimited | null {
    this.check();
    if (this.#reserve !== null) return this.stop("unavailable");
    if (!this.canSpend(reserve)) return { kind: "limited", refusal: this.capacityRefusal(reserve, "lookahead-reserve") };
    this.#reserve = { ...zero(), ...reserve };
    this.#asyncLookahead = asynchronous;
    return null;
  }
  #limitedLookahead(error: unknown): boolean {
    if (!(error instanceof ArchiveLookaheadLimited) && !this.#lookaheadBlocked) return false;
    // Helpers may translate a refused query/read to missing. Real terminal
    // stops and the original deadline still take precedence over shortage.
    try { this.check(); }
    catch (pending) { if (!(pending instanceof ArchiveLookaheadLimited)) throw pending; }
    return true;
  }
  #endLookahead(): void { this.#reserve = null; this.#lookaheadBlocked = false; this.#lookaheadRefusal = null; this.#asyncLookahead = false; }
  /** Protect an already selected prefix's finish forecast while doing only
   * synchronous metadata lookahead. Completed work stays spent; only unused
   * read-byte reservations settle after a completed receipt.
   * Refusal happens before the next debit/SQL and leaves this same budget
   * usable for finishing. This creates no allowance or admission rights. */
  lookahead<T>(reserve: Partial<ArchiveCost>, read: () => T): Lookahead<T> {
    const limited = this.#beginLookahead(reserve, false);
    if (limited) return limited;
    try {
      const value = read();
      if (value !== null && (typeof value === "object" || typeof value === "function") && "then" in value) return this.stop("unavailable");
      this.check();
      return { kind: "read", value };
    } catch (error) {
      if (this.#limitedLookahead(error)) return { kind: "limited", refusal: this.#lookaheadRefusal };
      throw error;
    } finally { this.#endLookahead(); }
  }
  /** Structured immutable-parent metadata work only, after closing the
   * native frame. The callback must settle all work before returning; it
   * may not detach tasks. This is no cancellation lease or I/O admission.
   * Every awaited read shares the original allowance and deadline. */
  lookaheadAsync<T>(reserve: Partial<ArchiveCost>, read: () => Promise<T>): Promise<Lookahead<T>> {
    const limited = this.#beginLookahead(reserve, true);
    if (limited) return Promise.resolve(limited);
    return this.#readLookaheadAsync(read);
  }
  async #readLookaheadAsync<T>(read: () => Promise<T>): Promise<Lookahead<T>> {
    try {
      const value = await this.wait(read);
      this.check();
      return { kind: "read", value };
    } catch (error) {
      if (this.#limitedLookahead(error)) return { kind: "limited", refusal: this.#lookaheadRefusal };
      throw error;
    } finally { this.#endLookahead(); }
  }
  /** Includes projected metadata in the same cumulative input-work ledger.
   * The caller separately reserves repeated parsing/hashing work. */
  native(sql: Pick<Sql, "exec">, reservation: (query: string, args: readonly SqlValue[]) => { metadata: number; inputWork: number },
    received?: (rows: readonly Record<string, SqlValue>[]) => number): Pick<Sql, "exec"> {
    return { exec: (query, ...args) => {
      this.check();
      if (!query.startsWith("SELECT ") || query.includes(";")) this.stop("unavailable");
      try {
        const cost = reservation(query, args);
        if (!natural(cost.metadata) || !natural(cost.inputWork)) this.stop("limit");
        const debit = { calls: 1, metadata: cost.metadata, inputWork: cost.inputWork + cost.metadata };
        const handle = received ? this.reserve(debit) : (this.spend(debit), null);
        const rows = sql.exec(query, ...args).toArray();
        this.check();
        if (handle !== null) this.settle(handle, received!(rows));
        return { toArray: () => { this.check(); return rows; } };
      } catch (error) {
        if (error instanceof ArchiveStopped || error instanceof ArchiveLookaheadLimited) throw error;
        if (this.#lookaheadBlocked) this.check();
        return this.stop("unavailable");
      }
    } };
  }
  /** Uses the original remaining time. A late read cannot start another
   * SQL call or return a value for cache/manifest installation. Physical
   * cancellation of an uncooperative provider is outside this class. */
  async wait<T>(work: () => Promise<T>): Promise<T> {
    this.check();
    if (this.#reserve !== null && !this.#asyncLookahead) return this.stop("unavailable");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expire = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { this.#stopped ??= "timeout"; reject(new ArchiveStopped(this.#stopped)); }, Math.max(0, this.#until - this.#last));
    });
    try {
      return await Promise.race([(async () => { this.check(); const value = await work(); this.check(); return value; })(), expire]);
    } catch (error) {
      if (error instanceof ArchiveStopped || error instanceof ArchiveLookaheadLimited) throw error;
      if (this.#lookaheadBlocked) this.check();
      return this.stop("unavailable");
    }
    finally { if (timer !== undefined) clearTimeout(timer); }
  }
  admitted(): ArchiveCost { return { ...this.#used }; }
  /** A subordinate native read can only spend the original remaining time. */
  remaining(): number { this.check(); return Math.max(0, Math.floor(this.#until - this.#last)); }
}
