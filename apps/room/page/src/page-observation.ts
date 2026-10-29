/** Own observation and fallback reads independently of a particular draw.
 * Retirement joins physical load/poll callbacks: an ignoring transport can
 * delay that join after the local deadline. Stream cleanup follows the client
 * observer's local cancellation contract, which does not prove physical drain. */
import { observeScope, type CompleteSnapshot, type Observation, type ObservationOptions, type ObservationState } from "@generalbusiness/dap-client";
import { same } from "@generalbusiness/dap-bytes";
import type { Head, Summary } from "@generalbusiness/dap-contract";

export interface PageObservationSource {
  initial: CompleteSnapshot<Summary>;
  options: Omit<ObservationOptions<Summary>, "emit" | "current">;
  poll(signal: AbortSignal): Promise<CompleteSnapshot<Summary>>;
}
export interface PageObservationBinding {
  key: string;
  interval: number;
  head?: Head;
  current(): boolean;
  load(signal: AbortSignal): Promise<PageObservationSource>;
  changed(): Promise<void>;
  polling(line: string | null): void;
}
interface OwnedObservation {
  binding: PageObservationBinding; lifetime: AbortController; read?: AbortController;
  timer?: ReturnType<typeof setTimeout>; observation?: Observation; polling: boolean;
  head?: CompleteSnapshot<Summary>["at"];
}
export function pollingInterval(value: unknown): number {
  if (value === undefined) return 5_000;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1_000 || value > 60_000) throw new RangeError("The update interval is between 1 and 60 seconds.");
  return value;
}

export class PageObservation {
  #owned: OwnedObservation | undefined;
  #work = new Set<Promise<void>>();
  #active = true;
  #track<T>(pending: Promise<T>): Promise<T> {
    const settled = pending.then(() => { this.#work.delete(settled); }, () => { this.#work.delete(settled); });
    this.#work.add(settled); return pending;
  }
  #stop(): void {
    const owned = this.#owned; if (!owned) return;
    this.#owned = undefined; owned.lifetime.abort(); owned.read?.abort();
    if (owned.timer !== undefined) clearTimeout(owned.timer);
    owned.observation?.cancel(); owned.binding.polling(null);
    if (owned.observation) void this.#track(owned.observation.done);
  }
  cancel(): void { this.#stop(); }
  async idle(): Promise<void> { while (this.#work.size) await Promise.all([...this.#work]); }
  async retire(): Promise<void> { this.#active = false; this.#stop(); await this.idle(); }
  bind(binding: PageObservationBinding): void {
    const interval = pollingInterval(binding.interval);
    if (!this.#active) return;
    if (this.#owned?.binding.key === binding.key && this.#owned.binding.interval === interval) return;
    this.#stop();
    const owned: OwnedObservation = { binding, lifetime: new AbortController(), polling: false };
    this.#owned = owned;
    const current = () => this.#active && this.#owned === owned && !owned.lifetime.signal.aborted && binding.current();
    const stopPolling = () => {
      owned.polling = false; owned.read?.abort();
      if (owned.timer !== undefined) clearTimeout(owned.timer);
      delete owned.timer; if (current()) binding.polling(null);
    };
    let physical: Promise<unknown> | undefined;
    const runRead = async <T>(start: (signal: AbortSignal) => Promise<T>): Promise<T> => {
      if (physical) throw new Error("The previous observation read has not ended.");
      const read = new AbortController(); owned.read = read;
      const stop = () => read.abort(); owned.lifetime.signal.addEventListener("abort", stop);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const abort = new Promise<never>((_resolve, reject) => {
        read.signal.addEventListener("abort", () => reject(new Error("Observation read ended.")), { once: true });
        timer = setTimeout(stop, interval);
      });
      try {
        const work = this.#track(start(read.signal)); physical = work;
        void work.then(() => { if (physical === work) physical = undefined; }, () => { if (physical === work) physical = undefined; });
        return await Promise.race([work, abort]);
      }
      finally { clearTimeout(timer); owned.lifetime.signal.removeEventListener("abort", stop); if (owned.read === read) delete owned.read; }
    };
    void this.#track((async () => {
      try {
        const source = await runRead(binding.load); if (!current()) return;
        if (binding.head) owned.head = binding.head;
        const accept = async (snapshot: CompleteSnapshot<Summary>) => {
          if (!current() || !same(snapshot.scope, source.initial.scope) || snapshot.definition !== source.initial.definition) return;
          if (owned.head && snapshot.at.seq < owned.head.seq) return;
          if (owned.head && snapshot.at.seq === owned.head.seq && snapshot.at.hash !== owned.head.hash) { stopPolling(); owned.observation?.cancel(); return; }
          if (!owned.head || !same(owned.head, snapshot.at)) { owned.head = snapshot.at; await binding.changed(); }
        };
        const schedule = () => {
          if (!current() || !owned.polling || owned.timer !== undefined) return;
          owned.timer = setTimeout(() => {
            delete owned.timer;
            void this.#track((async () => {
              try { const snapshot = await runRead(source.poll); if (current() && owned.polling) await accept(snapshot); }
              catch { /* A failed read supplies no new head or mutation result. */ }
              finally { schedule(); }
            })());
          }, interval);
        };
        const emit = (state: ObservationState<Summary>) => {
          if (!current()) return;
          if (state.status === "fallback") {
            owned.polling = true;
            binding.polling(`Live updates unavailable. Checking every ${interval / 1_000} ${interval === 1_000 ? "second" : "seconds"}.`); schedule();
          } else if (state.status === "streaming") stopPolling();
          else if (["forbidden", "unsupported", "error", "cancelled"].includes(state.status)) stopPolling();
          else if (state.status === "current") void this.#track(accept(state.snapshot));
        };
        await accept(source.initial); if (!current()) return;
        owned.observation = observeScope({ ...source.options, current, emit });
      } catch { /* A missing authenticated initial scope offers no observation. */ }
    })());
  }
}
