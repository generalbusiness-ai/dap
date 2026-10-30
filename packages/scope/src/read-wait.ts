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
  async until(minimum: ReadMinimum, position: () => Read<FactRef> | Promise<Read<FactRef>>, hash: (seq: number) => Digest | null, active: () => boolean = () => true, floor: () => number = () => 0): Promise<ReadWaitRefusal | null> {
    if (!Number.isFinite(this.milliseconds) || this.milliseconds <= 0) return { ok: false, reason: "unavailable" };
    let expired = false, started = false, cancelTimer = () => {}, wake: (() => void) | null = null, signal: (() => void) | null = null;
    const startTimer = () => {
      if (started) return;
      started = true;
      cancelTimer = this.clock.after(this.milliseconds, () => { expired = true; signal?.(); });
    };
    try {
      for (;;) {
        if (!active()) return { ok: false, reason: "unavailable" };
        // Registration precedes chain refresh and the authority/position check.
        // A seal before registration is seen here; one after it wakes this read.
        let arrivedDuringCheck = false;
        const arrived = new Promise<void>(resolve => { signal = resolve; wake = () => { arrivedDuringCheck = true; resolve(); }; });
        this.#arrivals.add(wake!);
        const read = await position();
        if (!active()) return { ok: false, reason: "unavailable" };
        if (!read.ok) return read;
        const current = read.value;
        if (minimum.at.scope !== current.at.scope || minimum.at.kind !== current.at.kind) return { ok: false, reason: "unavailable" };
        if (minimum.at.inc !== current.at.inc) return { ok: false, reason: "wrong-incarnation" };
        // A seal during asynchronous chain preparation needs another fresh
        // preparation before its position can authorize the final read.
        if (arrivedDuringCheck) {
          if (expired) return { ok: false, reason: "unavailable" };
          startTimer(); // Repeated seals cannot postpone the original wait.
          this.#arrivals.delete(wake!); wake = null; signal = null; continue;
        }
        const seq = typeof minimum.head === "number" ? minimum.head : minimum.head.seq;
        if (current.seq >= seq) {
          // Below the real floor this is ordering only, after authority and
          // exact target checks. The final entry read still answers archived.
          if (typeof minimum.head !== "number" && seq >= floor() && (seq === current.seq ? current.hash : hash(seq)) !== minimum.head.hash) return { ok: false, reason: "unavailable" };
          return null;
        }
        if (expired) return { ok: false, reason: "behind", current };
        startTimer();
        await arrived;
        this.#arrivals.delete(wake!); wake = null; signal = null;
      }
    } finally {
      cancelTimer();
      if (wake) this.#arrivals.delete(wake);
    }
  }
}
