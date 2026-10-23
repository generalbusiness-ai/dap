/** Own admitted workbench promises. This does not own entry enrollment,
 * clipboard work or arbitrary browser tasks. The caller cancels its future
 * workbench timers before retirement joins physical completion. */
export class WorkbenchWork {
  #active = true;
  #pending = new Set<Promise<void>>();
  #retirement: Promise<void> | undefined;
  constructor(private readonly onRetire: () => void = () => {}) {}
  get active(): boolean { return this.#active; }
  run<T>(start: () => Promise<T>): Promise<T> {
    if (!this.#active) return Promise.reject(new Error("The workbench has retired."));
    let work: Promise<T>;
    try { work = Promise.resolve(start()); } catch (error) { work = Promise.reject(error); }
    // Both bookkeeping branches fulfill. Return the actual work promise so
    // callers still observe rejection, without an orphan finally-chain.
    const settled = work.then(() => { this.#pending.delete(settled); }, () => { this.#pending.delete(settled); });
    this.#pending.add(settled);
    return work;
  }
  async idle(): Promise<void> {
    while (this.#pending.size) await Promise.all([...this.#pending]);
  }
  retire(): Promise<void> {
    if (!this.#retirement) {
      this.#active = false;
      let failed = false, failure: unknown;
      try { this.onRetire(); } catch (error) { failed = true; failure = error; }
      this.#retirement = this.idle().then(() => { if (failed) throw failure; });
    }
    return this.#retirement;
  }
}
