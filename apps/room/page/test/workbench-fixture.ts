/** Fixture ownership, not a simulated browser storage/crypto implementation. */
interface Lifecycle { idle(): Promise<void>; retire(): Promise<void> }
interface MainModule { workbenchLifecycle: Lifecycle }
export class WorkbenchFixture {
  #retired = false;
  #retiredSignal: Promise<void>;
  #signal!: () => void;
  #loads = new Set<Promise<void>>();
  #lifetimes = new Set<Lifecycle>();
  #retirements = new Map<Lifecycle, Promise<void>>();
  #failures: unknown[] = [];
  #releases: (() => void)[] = [];
  #closing: Promise<void> | undefined;
  constructor() { this.#retiredSignal = new Promise(resolve => { this.#signal = resolve; }); }
  current(): void { if (this.#retired) throw new Error("Workbench fixture has finished"); }
  release(action: () => void): void { this.#releases.push(action); if (this.#retired) action(); }
  async wait<T>(start: () => Promise<T>): Promise<T> {
    this.current();
    const work = start();
    const value = await Promise.race([work, this.#retiredSignal.then(() => { throw new Error("Workbench fixture has finished"); })]);
    this.current();
    return value;
  }
  #retire(life: Lifecycle): void {
    if (this.#retirements.has(life)) return;
    let closing: Promise<void>;
    try { closing = life.retire(); } catch (error) { closing = Promise.reject(error); }
    // Observe rejection immediately; bookkeeping itself always fulfills.
    this.#retirements.set(life, closing.then(() => {}, error => { this.#failures.push(error); }));
  }
  async load<T extends MainModule>(start: () => Promise<T>): Promise<T> {
    this.current();
    const work = start();
    const settled = work.then(module => {
      this.#lifetimes.add(module.workbenchLifecycle);
      if (this.#retired) this.#retire(module.workbenchLifecycle);
      this.#loads.delete(settled);
    }, () => { this.#loads.delete(settled); });
    this.#loads.add(settled);
    return this.wait(() => work);
  }
  retire(): Promise<void> {
    if (!this.#closing) {
      this.#retired = true; this.#signal();
      // Release all held scripted inputs before joining application work.
      for (const release of this.#releases) { try { release(); } catch (error) { this.#failures.push(error); } }
      for (const life of this.#lifetimes) this.#retire(life);
      this.#closing = (async () => {
        // An admitted import may expose its owner only after retirement starts.
        await Promise.all([...this.#loads]);
        for (const life of this.#lifetimes) this.#retire(life);
        await Promise.all([...this.#retirements.values()]);
        if (this.#failures.length) throw new AggregateError(this.#failures, "Workbench fixture retirement failed");
      })();
    }
    return this.#closing;
  }
}
export class WorkbenchFixtures {
  #tail: Promise<void> = Promise.resolve();
  #blocked: unknown;
  run(onFinished: (close: () => Promise<void>) => void, body: (fixture: WorkbenchFixture) => Promise<void>): Promise<void> {
    const fixture = new WorkbenchFixture(); onFinished(() => fixture.retire());
    const running = this.#tail.then(async () => {
      if (this.#blocked) throw this.#blocked;
      fixture.current();
      try { await body(fixture); }
      finally {
        try { await fixture.retire(); }
        catch (error) { this.#blocked = error; throw error; }
      }
    });
    // A body failure permits a successor only after physical retirement.
    this.#tail = running.then(() => {}, () => {});
    return running;
  }
}
export const workbenchFixtures = new WorkbenchFixtures();
