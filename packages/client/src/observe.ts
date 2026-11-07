/** One authenticated scope observation. Invalidation notices never settle pending commands or prove current authority. */
import { same } from "@generalbusiness/dap-bytes";
import type { Digest, Head, KeyId, MemberId, PlatformDefinition, Read, ScopeRef, SessionRefusal, Summary } from "@generalbusiness/dap-contract";
import { canonicalize, isHead, isScopeRef, timeMs, timeOf, type Expiry } from "@generalbusiness/dap-bytes";
import type { Session } from "./session.ts";
import { HeadStreamUnavailable, headLines, observationOrigin, type HeadBodyResult } from "./head-stream.ts";

export interface ObservationContext { origin: string; scope: ScopeRef; definition: Digest | PlatformDefinition; membership: ScopeRef; member: MemberId; key: KeyId; deployment: string }
/** Adapter result from actual complete authenticated reads, not a new native wire/proof. */
export interface CompleteSnapshot<T> { scope: ScopeRef; definition: Digest | PlatformDefinition; at: Head; value: T }
export type ObservationState<T> =
  | { status: "connecting" | "refreshing" | "reconnecting"; retained?: CompleteSnapshot<T> }
  | { status: "current"; snapshot: CompleteSnapshot<T> }
  | { status: "fallback"; reason: string; retained?: CompleteSnapshot<T> }
  | { status: "streaming"; retained?: CompleteSnapshot<T> }
  | { status: "retained"; snapshot: CompleteSnapshot<T>; reason: "newer-notice" | "older-snapshot" | "subscription-ended" }
  | { status: "unavailable" | "forbidden" | "expired" | "unsupported" | "error"; reason: string; retained?: CompleteSnapshot<T> }
  | { status: "cancelled" };
export interface ObservationOptions<T> {
  context: ObservationContext; current(): boolean;
  authenticate(signal: Expiry): Promise<{ ok: true; session: Session } | { ok: false; reason: SessionRefusal | "unavailable" | "unsupported" }>;
  snapshot(session: Session, signal: Expiry): Promise<Read<CompleteSnapshot<T>>>;
  open(session: Session, signal: Expiry): Promise<HeadBodyResult>;
  emit(state: ObservationState<T>): void;
  /** Bounds reauthentication, stream handshake and one complete snapshot. */
  seconds?: number; now?: () => number;
  reconnectDelay?(attempt: number, signal: Expiry): Promise<void>;
}
export interface Observation { refresh(): void; cancel(): void; done: Promise<void> }
/** Wrap an actual authenticated Summary read without synthesizing a head or native proof. */
export function completeSummary(read: Read<Summary>): Read<CompleteSnapshot<Summary>> {
  if (!read.ok) return read;
  return { ...read, value: { scope: read.value.scope, definition: read.value.definition, at: read.at, value: read.value } };
}

class Stopped extends Error {}
class ObservationFailure extends Error { constructor(readonly status: "unavailable"|"forbidden"|"expired"|"unsupported"|"error",readonly reason:string){super(reason);} }

/** Callback expiry raced locally as existing takeBytes does; ignoring transports cannot repaint late data. */
async function bounded<T>(run:(signal:Expiry)=>Promise<T>, parent:Expiry, seconds:number, dispose?:(value:T)=>void):Promise<T>{
  const own=new AbortController();let stopped!:()=>void;let abandoned=false;
  const abort=new Promise<never>((_resolve,reject)=>{stopped=()=>{abandoned=true;own.abort();reject(new Stopped());};});
  parent.addEventListener("abort",stopped);let timeout:ReturnType<typeof setTimeout>|undefined;
  const elapsed=new Promise<never>((_resolve,reject)=>{timeout=setTimeout(()=>{abandoned=true;own.abort();reject(new ObservationFailure("unavailable","read-timeout"));},seconds*1000);});
  try{if(parent.aborted)throw new Stopped();const pending = run(own.signal);void pending.then(value=>{if(abandoned)dispose?.(value);},()=>undefined);return await Promise.race([pending,abort,elapsed]);}
  catch(error){abandoned=true;throw error;}
  finally{parent.removeEventListener("abort",stopped);if(timeout!==undefined)clearTimeout(timeout);}
}
function delay(milliseconds:number,signal:Expiry):Promise<void>{return new Promise((resolve,reject)=>{let timer:ReturnType<typeof setTimeout>|undefined;const stop=()=>{if(timer!==undefined)clearTimeout(timer);signal.removeEventListener("abort",stop);reject(new Stopped());};signal.addEventListener("abort",stop);if(signal.aborted)return stop();timer=setTimeout(()=>{signal.removeEventListener("abort",stop);resolve();},milliseconds);});}
/** Backoff belongs to the observation lifetime, not the timeout of an individual read. */
async function reconnectWait(run:(signal:Expiry)=>Promise<void>,signal:Expiry):Promise<void>{
  let stop!:()=>void;const aborted=new Promise<never>((_resolve,reject)=>{stop=()=>reject(new Stopped());});
  signal.addEventListener("abort",stop);
  try{if(signal.aborted)throw new Stopped();await Promise.race([run(signal),aborted]);}
  finally{signal.removeEventListener("abort",stop);}
}

/** An attempt releases only the controller, timer and body that it acquired. */
class ConnectionAttempt {
  readonly controller = new AbortController();
  readonly ended: Promise<void>;
  private finish!: () => void;
  private renewal: ReturnType<typeof setTimeout> | undefined;
  private body: HeadBodyResult | undefined;
  private readerOwned = false;
  private phase: "opening" | "streaming" | "ended" | "disposed" = "opening";
  renewalExpired = false;
  private readonly lifeAbort = () => this.controller.abort();

  constructor(private readonly lifetime: Expiry) {
    this.ended = new Promise(resolve => { this.finish = resolve; });
    lifetime.addEventListener("abort", this.lifeAbort);
    if (lifetime.aborted) this.controller.abort();
  }
  get signal(): Expiry { return this.controller.signal; }
  get streaming(): boolean { return this.phase === "streaming"; }
  renewIn(milliseconds: number): void {
    this.renewal = setTimeout(() => {
      this.renewalExpired = true;
      this.controller.abort();
      this.finish();
    }, Math.max(1, milliseconds));
  }
  opened(body: HeadBodyResult): void { this.body = body; }
  handToReader(): void { this.readerOwned = true; }
  startStream(): void { this.phase = "streaming"; }
  interrupt(): void { this.controller.abort(); this.finish(); }
  end(): void {
    if (this.phase !== "disposed") this.phase = "ended";
    this.controller.abort();
    this.finish();
  }
  dispose(): void {
    if (this.phase === "disposed") return;
    this.controller.abort();
    if (this.body && !this.readerOwned) disposeBody(this.body);
    if (this.renewal !== undefined) clearTimeout(this.renewal);
    this.lifetime.removeEventListener("abort", this.lifeAbort);
    this.phase = "disposed";
    this.finish();
  }
}

function disposeBody(value: HeadBodyResult): void {
  if (!value.ok) return;
  try { void value.body.getReader().cancel().catch(() => undefined); }
  catch { /* A reader already owns the body, or upstream refuses disposal. */ }
}

interface RefreshCycle {
  readonly generation: number;
  readonly attempt: ConnectionAttempt;
  readonly session: Session;
  readonly fail: (error: unknown) => void;
}
interface RefreshTask { readonly cycle: RefreshCycle; done: Promise<void> }
type RefreshWork = { readonly status: "idle" }
  | { readonly status: "refreshing" | "reread" | "finishing" | "handoff"; readonly task: RefreshTask };

/** Retained data, notice ordering and obsolete-reply checks have one owner. */
class RefreshCoordinator<T> {
  private generation = 0;
  private last: CompleteSnapshot<T> | undefined;
  private latest: Head | undefined;
  private cycle: RefreshCycle | undefined;
  private work: RefreshWork = { status: "idle" };

  constructor(
    private readonly options: ObservationOptions<T>,
    private readonly context: ObservationContext,
    private readonly seconds: number,
    private readonly usable: () => boolean,
    private readonly emit: (state: ObservationState<T>) => void,
  ) {}

  retained(): { retained?: CompleteSnapshot<T> } { return this.last ? { retained: this.last } : {}; }
  nextGeneration(): number { return ++this.generation; }
  invalidateGeneration(): void { this.generation++; }
  check(generation: number): void {
    if (!this.usable() || generation !== this.generation) throw new Stopped();
  }
  first(notice: Head): void {
    if (this.last && notice.seq === this.last.at.seq && notice.hash !== this.last.at.hash) {
      throw new ObservationFailure("error", "head-hash-conflict");
    }
    this.latest = notice;
  }
  notice(notice: Head): void {
    if (this.latest && notice.seq === this.latest.seq && notice.hash !== this.latest.hash
      || this.last && notice.seq === this.last.at.seq && notice.hash !== this.last.at.hash) {
      throw new ObservationFailure("error", "head-hash-conflict");
    }
    if (!this.latest || notice.seq > this.latest.seq) {
      this.latest = notice;
      this.refresh();
    }
  }
  activate(cycle: RefreshCycle): void {
    this.check(cycle.generation);
    this.cycle = cycle;
  }
  release(cycle: RefreshCycle): void {
    if (this.cycle === cycle) this.cycle = undefined;
  }
  async joined(cycle: RefreshCycle): Promise<void> {
    if (this.work.status !== "idle" && this.work.task.cycle === cycle) await this.work.task.done;
  }
  refresh(): void {
    const cycle = this.cycle;
    if (!cycle) return;
    if (this.work.status !== "idle") {
      // A completion callback can invalidate after the read loop finishes but
      // before its promise releases the occupied slot.
      const status = this.work.status === "finishing" || this.work.status === "handoff" ? "handoff" : "reread";
      this.work = { status, task: this.work.task };
      return;
    }
    const task: RefreshTask = { cycle, done: Promise.resolve() };
    this.work = { status: "refreshing", task };
    task.done = this.read(task).catch(error => cycle.fail(error)).finally(() => {
      if (this.work.status === "idle" || this.work.task !== task) return;
      const handoff = this.work.status === "handoff";
      this.work = { status: "idle" };
      if (handoff && this.eligible(cycle)) {
        void delay(0, cycle.attempt.signal).then(() => {
          if (this.eligible(cycle)) this.refresh();
        }, () => undefined);
      }
    });
  }
  private eligible(cycle: RefreshCycle): boolean {
    return this.cycle === cycle && cycle.attempt.streaming && !cycle.attempt.signal.aborted
      && this.usable() && cycle.generation === this.generation;
  }
  private async read(task: RefreshTask): Promise<void> {
    const { cycle } = task;
    for (;;) {
      this.work = { status: "refreshing", task };
      this.check(cycle.generation);
      this.emit({ status: "refreshing", ...this.retained() });
      const read = await bounded(signal => this.options.snapshot(cycle.session, signal), cycle.attempt.signal, this.seconds);
      this.check(cycle.generation);
      if (!read.ok) throw new ObservationFailure(read.reason === "forbidden" ? "forbidden" : "unavailable", read.reason);
      const snapshot = read.value;
      if (!read.complete || read.next !== undefined || !isHead(snapshot.at) || !isScopeRef(snapshot.scope)
        || !isHead(read.at) || !same(read.at, snapshot.at) || !same(snapshot.scope, this.context.scope)
        || snapshot.definition !== this.context.definition) {
        throw new ObservationFailure("error", "incomplete-or-mismatched-snapshot");
      }
      if (this.last && snapshot.at.seq === this.last.at.seq && snapshot.at.hash !== this.last.at.hash
        || this.latest && snapshot.at.seq === this.latest.seq && snapshot.at.hash !== this.latest.hash) {
        throw new ObservationFailure("error", "head-hash-conflict");
      }
      if (this.last && snapshot.at.seq < this.last.at.seq) {
        this.emit({ status: "retained", snapshot: this.last, reason: "older-snapshot" });
      } else {
        this.last = snapshot;
        if (!cycle.attempt.streaming) this.emit({ status: "retained", snapshot, reason: "subscription-ended" });
        else if (this.latest && snapshot.at.seq < this.latest.seq) {
          this.emit({ status: "retained", snapshot, reason: "newer-notice" });
          this.work = { status: "reread", task };
        } else this.emit({ status: "current", snapshot });
      }
      // Public emit callbacks may request a refresh synchronously.
      if (this.needsReread(task)) await delay(0, cycle.attempt.signal);
      else { this.work = { status: "finishing", task }; return; }
    }
  }
  private needsReread(task: RefreshTask): boolean {
    return this.work.status === "reread" && this.work.task === task;
  }
}

/** Own the observation lifetime and each connect/stream/renew/reconnect attempt. */
class ObservationConnection<T> {
  private readonly lifetime = new AbortController();
  private attempt: ConnectionAttempt | undefined;
  private cancelled = false;
  private readonly refreshes: RefreshCoordinator<T>;
  readonly done: Promise<void>;

  constructor(
    private readonly options: ObservationOptions<T>,
    private readonly context: ObservationContext,
    private readonly seconds: number,
  ) {
    this.refreshes = new RefreshCoordinator(options, context, seconds, () => this.usable(), state => this.emit(state));
    this.done = this.run();
  }
  private usable(): boolean { return !this.lifetime.signal.aborted && this.options.current(); }
  private emit(state: ObservationState<T>): void {
    if (this.usable()) this.options.emit(state);
    else this.cancel();
  }
  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.refreshes.invalidateGeneration();
    this.lifetime.abort();
    this.attempt?.controller.abort();
    if (this.options.current()) this.options.emit({ status: "cancelled" });
  }
  refresh(): void {
    if (!this.usable()) { this.cancel(); return; }
    this.refreshes.refresh();
  }
  private async run(): Promise<void> {
    let failures = 0;
    let outage = false;
    const fallback = (reason: string) => {
      if (!outage) { outage = true; this.emit({ status: "fallback", reason, ...this.refreshes.retained() }); }
    };
    while (this.usable()) {
      const generation = this.refreshes.nextGeneration();
      const active = new ConnectionAttempt(this.lifetime.signal);
      this.attempt = active;
      let cycle: RefreshCycle | undefined;
      try {
        this.emit({ status: failures ? "reconnecting" : "connecting", ...this.refreshes.retained() });
        const auth = await bounded(signal => this.options.authenticate(signal), active.signal, this.seconds);
        this.refreshes.check(generation);
        if (!auth.ok) throw new ObservationFailure(auth.reason === "unauthorized" ? "forbidden" : auth.reason === "expired" ? "expired" : auth.reason === "unsupported" ? "unsupported" : "unavailable", auth.reason);
        const session = auth.session;
        if (session.claims.deployment !== this.context.deployment || !same(session.claims.membership, this.context.membership)
          || session.claims.member !== this.context.member || session.claims.key !== this.context.key || !session.claims.reads.includes("summary")) {
          throw new ObservationFailure("error", "session-context-mismatch");
        }
        const now = this.options.now ?? Date.now;
        const ends = timeMs(session.claims.ends);
        if (ends === null || session.endedBy(timeOf(now()))) throw new ObservationFailure("expired", "session-expired");
        active.renewIn(ends - now());
        const opened = await bounded(signal => this.options.open(session, signal), active.signal, this.seconds, disposeBody);
        active.opened(opened);
        this.refreshes.check(generation);
        if (!opened.ok) throw new ObservationFailure(opened.reason === "forbidden" ? "forbidden" : opened.reason === "unsupported" ? "unsupported" : "unavailable", opened.reason);
        const lines = headLines(opened.body, active.signal);
        active.handToReader();
        const first = await bounded(() => lines.next(), active.signal, this.seconds);
        this.refreshes.check(generation);
        if (first.done) throw new ObservationFailure("unavailable", "stream-ended-before-head");
        this.refreshes.first(first.value);
        failures = 0;
        outage = false;
        active.startStream();
        this.emit({ status: "streaming", ...this.refreshes.retained() });
        this.refreshes.check(generation);
        let streamFailure: ObservationFailure | undefined;
        const pump = (async () => {
          try {
            for await (const notice of lines) {
              this.refreshes.check(generation);
              this.refreshes.notice(notice);
            }
          } catch (error) {
            if (!(error instanceof Stopped) && !active.signal.aborted) {
              streamFailure = error instanceof ObservationFailure ? error : new ObservationFailure("error", "malformed-head-stream");
            }
          } finally { active.end(); }
        })();
        let refreshFailure: ObservationFailure | undefined;
        cycle = {
          generation, attempt: active, session,
          fail: error => {
            if (!(error instanceof Stopped)) refreshFailure = error instanceof ObservationFailure ? error : new ObservationFailure("unavailable", "snapshot-read-failed");
            // The pump owns stream completion; interrupt only wakes its owner.
            active.interrupt();
          },
        };
        this.refreshes.activate(cycle);
        this.refreshes.refresh();
        await active.ended;
        active.controller.abort();
        await pump;
        await this.refreshes.joined(cycle);
        this.refreshes.release(cycle);
        if (streamFailure) throw streamFailure;
        if (refreshFailure) throw refreshFailure;
        this.refreshes.check(generation);
        fallback(active.renewalExpired ? "session-expired" : "stream-ended");
        failures++;
        this.emit({ status: "reconnecting", ...this.refreshes.retained() });
      } catch (error) {
        if (error instanceof Stopped) {
          if (!this.usable()) break;
          fallback(active.renewalExpired ? "session-expired" : "stream-interrupted");
          failures++;
        } else {
          const failure = error instanceof ObservationFailure ? error : error instanceof HeadStreamUnavailable
            ? new ObservationFailure("unavailable", error.reason) : new ObservationFailure("unavailable", "observation-transport-failed");
          if (failure.status === "unavailable" || failure.status === "expired") fallback(failure.reason);
          this.emit({ status: failure.status, reason: failure.reason, ...this.refreshes.retained() });
          if (["forbidden", "unsupported", "error"].includes(failure.status)) break;
          failures++;
        }
      } finally {
        active.dispose();
        if (cycle) this.refreshes.release(cycle);
        if (this.attempt === active) this.attempt = undefined;
      }
      if (this.usable()) {
        try {
          await reconnectWait(signal => this.options.reconnectDelay?.(failures, signal)
            ?? delay(Math.min(30000, 1000 * 2 ** Math.min(failures - 1, 5)), signal), this.lifetime.signal);
        } catch { break; }
      }
    }
    if (!this.options.current() && !this.cancelled) this.cancel();
  }
}

export function observeScope<T>(options: ObservationOptions<T>): Observation {
  const context = JSON.parse(canonicalize(options.context)) as ObservationContext;
  Object.freeze(context.scope);
  Object.freeze(context.membership);
  Object.freeze(context);
  const seconds = options.seconds ?? 30;
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 300) throw new RangeError("An observation read bound is more than zero and at most300seconds.");
  if (!observationOrigin(context.origin) || !isScopeRef(context.scope) || !isScopeRef(context.membership)
    || typeof context.deployment !== "string" || !context.deployment || context.deployment.length > 128) {
    throw new Error("Observation needs an exact origin and full native references.");
  }
  const connection = new ObservationConnection(options, context, seconds);
  return { refresh: () => connection.refresh(), cancel: () => connection.cancel(), done: connection.done };
}
