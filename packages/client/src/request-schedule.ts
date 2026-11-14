/** One timer owns retry wakeups, signing deaths and send deadlines (client note section 7). */
import { Lost } from "./custody.ts";

export interface ClientClock {
  now(): number;
  set(run: () => void, delay: number): unknown;
  clear(timer: unknown): void;
}
export const wallClock: ClientClock = {
  now: () => Date.now(),
  set: (run, delay) => setTimeout(run, delay),
  clear: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
};
interface Due { at: number; run(): void }

export class RequestSchedule {
  readonly #due = new Map<object, Due>();
  readonly #pending = new Set<() => void>();
  #timer: unknown;
  #armed = false;
  #closed = false;
  constructor(readonly clock: ClientClock) {}

  at(key: object, at: number, run: () => void): void {
    if (this.#closed) return;
    this.#due.set(key, { at, run });
    this.#arm();
  }
  cancel(key: object): void { this.#due.delete(key); this.#arm(); }

  /** Ignore every reply after the deadline or close. No second timer accompanies an in-flight send. */
  bounded<T>(work: () => Promise<T>): Promise<T> {
    if (this.#closed) return Promise.reject(new Lost());
    const key = {}, deadline = this.clock.now() + 30_000;
    return new Promise<T>((resolve, reject) => {
      let active = true;
      const finish = (run: () => void): void => {
        if (!active) return;
        active = false;
        this.#pending.delete(stop);
        this.cancel(key);
        run();
      };
      const stop = (): void => finish(() => reject(new Lost()));
      this.#pending.add(stop);
      this.at(key, deadline, stop);
      Promise.resolve().then(() => { if (!active) throw new Lost(); return work(); }).then(value => finish(() => this.clock.now() >= deadline ? reject(new Lost()) : resolve(value)), error => finish(() => reject(error)));
    });
  }

  close(): void {
    this.#closed = true;
    for (const stop of [...this.#pending]) stop();
    this.#due.clear();
    if (this.#armed) this.clock.clear(this.#timer);
    this.#armed = false;
  }

  #arm(): void {
    if (this.#armed) this.clock.clear(this.#timer);
    this.#armed = false;
    if (this.#closed || this.#due.size === 0) return;
    const first = Math.min(...[...this.#due.values()].map(due => due.at));
    this.#armed = true;
    this.#timer = this.clock.set(() => {
      this.#armed = false;
      const now = this.clock.now();
      for (const [key, due] of [...this.#due]) {
        if (due.at > now || this.#due.get(key) !== due) continue;
        this.#due.delete(key);
        due.run();
      }
      this.#arm();
    }, Math.max(0, first - this.clock.now()));
  }
}
