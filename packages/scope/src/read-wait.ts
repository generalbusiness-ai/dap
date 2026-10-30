/** Ephemeral head arrivals. No storage transaction, turn or durable alarm. */
import type { Digest, FactRef, Read, ReadMinimum } from "@generalbusiness/dap-contract";
import type { ProofTimer } from "./genesis-proof.ts";

export type ReadWaitRefusal = Extract<Read<never>, { ok: false }>;
const timer: ProofTimer = { now: () => Date.now(), after(ms, work) { const id = setTimeout(work, ms); return () => clearTimeout(id); } };
export class ReadWait {
  readonly #arrivals = new Set<() => void>();
  constructor(readonly milliseconds: number, readonly clock: ProofTimer = timer) {}
  /** Called after a seal. Resolve notices only; readers run after the turn. */
  sealed(): void {
    const waiting = [...this.#arrivals]; this.#arrivals.clear();
    for (const wake of waiting) wake();
  }
  /** Authentication supplies each position, including the timeout position. */
  async until(minimum: ReadMinimum, position: () => Read<FactRef>, hash: (seq: number) => Digest | null, active: () => boolean = () => true): Promise<ReadWaitRefusal | null> {
    if (!Number.isFinite(this.milliseconds) || this.milliseconds <= 0) return { ok: false, reason: "unavailable" };
    let expired = false, started = false, cancelTimer = () => {}, wake: (() => void) | null = null;
    try {
      for (;;) {
        if (!active()) return { ok: false, reason: "unavailable" };
        // Registration precedes the synchronous authorization/position check.
        // A seal before registration is seen here; one after it wakes this read.
        const arrived = new Promise<void>(resolve => { wake = resolve; });
        this.#arrivals.add(wake!);
        const read = position();
        if (!read.ok) return read;
        const current = read.value;
        if (minimum.at.scope !== current.at.scope || minimum.at.kind !== current.at.kind) return { ok: false, reason: "unavailable" };
        if (minimum.at.inc !== current.at.inc) return { ok: false, reason: "wrong-incarnation" };
        const seq = typeof minimum.head === "number" ? minimum.head : minimum.head.seq;
        if (current.seq >= seq) {
          if (typeof minimum.head !== "number" && (seq === current.seq ? current.hash : hash(seq)) !== minimum.head.hash) return { ok: false, reason: "unavailable" };
          return null;
        }
        if (expired) return { ok: false, reason: "behind", current };
        if (!started) {
          started = true;
          cancelTimer = this.clock.after(this.milliseconds, () => { expired = true; wake?.(); });
        }
        await arrived;
        this.#arrivals.delete(wake!); wake = null;
      }
    } finally {
      cancelTimer();
      if (wake) this.#arrivals.delete(wake);
    }
  }
}
