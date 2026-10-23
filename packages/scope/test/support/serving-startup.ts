/** Test-only default-owner observations. No production hook or serving bypass.
 * The original admission runs once; diagnostic custody verification is extra
 * observer work and is not a throughput or per-request CPU measurement. */
import { onTestFinished } from "vitest";
import { OBSERVED_METHODS } from "../../src/operational.ts";
import type { nativeFixtureLifetime } from "./native-fixture-lifetime.ts";
import type { ServingDecision, ServingRequest } from "../../src/serving-admission.ts";
import { boundedParentlessIntent } from "../../src/serving-admission.ts";
import { signedReadForLimits } from "../../src/signed-reads.ts";
import { verifySignedIntent } from "@generalbusiness/dap-bytes";
import { ScopeIndex, type Env } from "../../src/worker.ts";
import type { Binding } from "../../src/namespace.ts";
import { addressKey } from "../../src/limits.ts";
import { DEFAULT_SERVING_LIMITS, servingLimitConfig } from "../../src/serving-limits.ts";

/** Captured only at native object construction. Tests restore this in finally;
 * callers and real native registration callbacks use the same namespace. */
export const startupTest: { index: DurableObjectNamespace | null; owner: StartupOwner | null } = { index: null, owner: null };
interface Count { operation: ServingRequest["kind"]; by: "key" | "address"; identity: string; count: number }

export class StartupServingIndex extends ScopeIndex {
  readonly startup = {
    instance: crypto.randomUUID(), bornAt: Date.now(), calls: 0, complete: true,
    counts: new Map<string, Count>(), decisions: new Map<ServingDecision, number>(),
    defaults: servingLimitConfig(this.env),
  };
  constructor(ctx: DurableObjectState, env: Env) {
    const actual = { ...env };
    delete actual.SERVING_CREATION_KEY_PER_HOUR; delete actual.SERVING_CREATION_ADDRESS_PER_HOUR;
    delete actual.SERVING_READ_KEY_PER_MINUTE; delete actual.SERVING_READ_ADDRESS_PER_MINUTE;
    super(ctx, actual);
  }
  override admitServing(request: ServingRequest, address: string | null): ServingDecision {
    const result = super.admitServing(request, address); // exactly one original decision/accounting action
    const trace = this.startup;
    trace.calls = Math.min(2049, trace.calls + 1);
    if (trace.calls > 2048) { trace.complete = false; return result; }
    trace.decisions.set(result, (trace.decisions.get(result) ?? 0) + 1);
    try {
      let key: string | null = null;
      if (request.kind === "signed-read") {
        const value = signedReadForLimits(request.reader); key = value?.verified ? value.actor : null;
      } else {
        const value = boundedParentlessIntent(request.signed); key = value && verifySignedIntent(value) ? value.intent.actor : null;
      }
      const normalized = addressKey(address);
      for (const [by, identity] of [["key", key], ["address", normalized]] as const) {
        if (identity === null) continue;
        const id = `${request.kind}:${by}:${identity}`, old = trace.counts.get(id);
        if (old) old.count++;
        else if (trace.counts.size < 128) trace.counts.set(id, { operation: request.kind, by, identity, count: 1 });
        else trace.complete = false;
      }
    } catch { trace.complete = false; }
    return result; // diagnostics cannot replace the original verdict
  }
}

/** Bounded reader-class observations at the actual native RPC boundary.
 * No reader/signature/session credential is retained. Owner admissions and
 * dispatched reads are separate counts: a denied attempt never reaches here. */
export class StartupReadTrace {
  calls = 0;
  complete = true;
  readonly counts = new Map<string, number>();
  record(method: string, args: unknown[]): void {
    // api.at forwards exactly one bounded operational envelope. Inspect only
    // the existing method/argument array; keep its identity, result and errors
    // opaque and forward the original RPC unchanged in startupScopes.
    if (method === "observed") {
      if (args.length !== 4 || typeof args[0] !== "string" || !(OBSERVED_METHODS as readonly string[]).includes(args[0])
        || !Array.isArray(args[1]) || args[1].length > 8) { this.complete = false; return; }
      method = args[0]; args = args[1]; // one unwrap only; nested observed is not in OBSERVED_METHODS
    }
    const position = method === "queryItems" || method === "applicationProjection" ? 1
      : ["summary", "items", "history", "entry", "outbox", "outboxItem", "log", "retained", "incidents", "waiting", "credential", "requests", "stream"].includes(method) ? 0 : null;
    if (position === null) return;
    this.calls = Math.min(2049, this.calls + 1);
    if (this.calls > 2048) { this.complete = false; return; }
    const reader = args[position];
    const category = typeof reader === "string" && reader.startsWith("Signed ") ? "signed"
      : typeof reader === "string" && reader.startsWith("Session ") ? "session" : "other";
    const name = `${category}:${method}`;
    if (this.counts.has(name) || this.counts.size < 64) this.counts.set(name, (this.counts.get(name) ?? 0) + 1);
    else this.complete = false;
  }
  snapshot() { return { calls: this.calls, complete: this.complete, counts: [...this.counts].sort(([a], [b]) => a.localeCompare(b)) }; }
}
export function startupScopes<T extends Binding>(binding: T, trace: StartupReadTrace): T {
  const owner = startupTest.owner; // never let a stale wrapper borrow a later owner
  return new Proxy(binding, { get(_namespace, property) {
    if (property !== "get") {
      const value = Reflect.get(binding, property, binding);
      return typeof value === "function" ? value.bind(binding) : value;
    }
    return (...getArgs: unknown[]) => {
      // This is the local namespace method, not a remote stub's .apply RPC.
      const target = Reflect.apply(binding.get, binding, getArgs) as Record<string, (...args: unknown[]) => unknown>;
      return new Proxy({}, { get(_unused, method) {
        if (method === "then" || typeof method !== "string") return undefined;
        return (...args: unknown[]) => { owner?.assertOpen(); trace.record(method, args); return target[method]!(...args); };
      } });
    };
  } });
}

/** Read only through runInDurableObject in the owning test, not an RPC API. */
export function startupSnapshot(instance: StartupServingIndex) {
  const trace = instance.startup;
  return { instance: trace.instance, observedAt: Date.now(), calls: trace.calls, complete: trace.complete,
    defaults: trace.defaults ? { ...trace.defaults } : null, counts: [...trace.counts.values()].map(value => ({ ...value })),
    decisions: [...trace.decisions].map(([decision, count]) => ({ decision, count })) };
}
export function startupReport(before: ReturnType<typeof startupSnapshot>, after: ReturnType<typeof startupSnapshot>, reads: ReturnType<StartupReadTrace["snapshot"]>) {
  const key = after.counts.filter(row => row.operation === "signed-read" && row.by === "key");
  const address = after.counts.filter(row => row.operation === "signed-read" && row.by === "address");
  const creationKey = after.counts.filter(row => row.operation === "creation" && row.by === "key");
  const creationAddress = after.counts.filter(row => row.operation === "creation" && row.by === "address");
  const maximumCreationsPerKey = Math.max(0, ...creationKey.map(row => row.count));
  const maximumCreationsPerAddress = Math.max(0, ...creationAddress.map(row => row.count));
  const maximumSignedReadsPerKey = Math.max(0, ...key.map(row => row.count));
  const maximumSignedReadsPerAddress = Math.max(0, ...address.map(row => row.count));
  return { before, after, dispatchedReads: reads,
    complete: before.calls === 0 && before.complete && after.complete && reads.complete && before.instance === after.instance
      && after.observedAt >= before.observedAt && after.observedAt - before.observedAt < 60_000,
    maximumCreationsPerKey, maximumCreationsPerAddress, maximumSignedReadsPerKey, maximumSignedReadsPerAddress,
    requiresDefaultAdjustment: maximumSignedReadsPerKey > DEFAULT_SERVING_LIMITS.readKey / 3 || maximumSignedReadsPerAddress > DEFAULT_SERVING_LIMITS.readAddress / 3,
    qualification: "Actual default-owner admissions versus dispatched native reader classes, separately counted. Extra diagnostic custody verification and bounded metadata bookkeeping are observer overhead; not throughput/CPU evidence. Object reset/overflow/overlong phase makes measurement incomplete. No credentials retained." };
}

/** Sole owner for these opt-in startup phases. A timeout stops new measured
 * work; it does not cancel work already in flight. Incomplete joins retain
 * the namespace/session/provider ownership and fail closed. */
export class StartupOwner {
  readonly #index: DurableObjectNamespace;
  readonly #roots = new Set<Promise<unknown>>();
  readonly #actions = new Set<Promise<unknown>>();
  #life: ReturnType<typeof nativeFixtureLifetime> | null = null;
  #stopping = false;
  #teardown = false;
  #finish: Promise<void> | null = null;
  #close = async () => {};
  #release = () => {};
  constructor(index: DurableObjectNamespace) {
    if (startupTest.owner || startupTest.index) throw new Error("Startup ownership already held");
    this.#index = index; startupTest.index = index; startupTest.owner = this;
    onTestFinished(() => this.finish()); // the only finish hook for this opt-in lifetime
  }
  assertOpen(): void {
    if (startupTest.owner !== this || startupTest.index !== this.#index || this.#stopping && !this.#teardown)
      throw new Error("Startup owner stopped new work");
  }
  attach(life: ReturnType<typeof nativeFixtureLifetime>, release: () => void): void {
    this.assertOpen();
    if (this.#life) throw new Error("Startup lifetime already attached");
    this.#life = life; this.#release = release;
  }
  closeWith(close: () => Promise<void>): void { this.assertOpen(); this.#close = close; }
  #track<T>(set: Set<Promise<unknown>>, action: () => Promise<T>): Promise<T> {
    this.assertOpen();
    if (set.size >= 128) throw new Error("Startup pending work bound exceeded");
    const pending = Promise.resolve().then(() => { this.assertOpen(); return action(); }); set.add(pending);
    return pending.then(value => { set.delete(pending); return value; }, error => { set.delete(pending); throw error; });
  }
  run<T>(action: () => Promise<T>): Promise<T> { return this.#track(this.#roots, action); }
  wait<T>(action: () => Promise<T>): Promise<T> { return this.#track(this.#actions, action); }
  async #join(set: Set<Promise<unknown>>): Promise<void> {
    for (let pass = 0; set.size && pass < 128; pass++) await Promise.allSettled([...set]);
    if (set.size) throw new Error("Startup work did not settle");
  }
  async #callbacks(): Promise<void> {
    const life = this.#life; if (!life) return;
    let total = 0;
    for (let pass = 0; pass < 64; pass++) {
      await this.#join(this.#actions);
      const nodes = life.platforms(); let callbacks = 0;
      if (nodes.length > 256) throw new Error("Startup native scope bound exceeded");
      for (const node of nodes) {
        const result = await life.wait(() => (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks());
        if (!Number.isSafeInteger(result.callbacks) || result.callbacks < 0) throw new Error("Invalid startup callback count");
        callbacks += result.callbacks; total += result.callbacks;
        if (total > 4096) throw new Error("Startup callback bound exceeded");
      }
      if (!callbacks && !this.#actions.size && life.platforms().length === nodes.length) return;
    }
    throw new Error("Startup callbacks did not settle");
  }
  /** After actual caller completion, before the measured AFTER snapshot. Joins
   * callbacks only: no effect pump, clock advance, new protocol or fake row. */
  async quiesce(): Promise<void> { this.assertOpen(); await this.#callbacks(); this.assertOpen(); }
  finish(): Promise<void> {
    if (this.#finish) return this.#finish;
    this.#stopping = true;
    this.#finish = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const join = (async () => {
          await this.#join(this.#roots); await this.#join(this.#actions); await this.#callbacks();
          // Only cleanup's Client.close may dispatch after measured work stopped.
          // The complete root has settled before this permission is entered.
          this.#teardown = true;
          try { await this.#close(); } finally { this.#teardown = false; }
          await this.#join(this.#actions); await this.#callbacks();
        })();
        await Promise.race([join, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("Startup join incomplete; ownership retained, no cancellation claimed")), 7500); })]);
        if (startupTest.owner !== this || startupTest.index !== this.#index) throw new Error("Startup ownership changed before release");
        this.#release(); this.#life?.release();
        startupTest.owner = null; startupTest.index = null;
      } finally { if (timer !== undefined) clearTimeout(timer); }
    })();
    return this.#finish;
  }
}
