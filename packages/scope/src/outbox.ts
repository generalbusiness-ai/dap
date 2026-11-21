import { countedEntries } from "@generalbusiness/dap-derive";
/**
 * Sending (scope contract, sections 7.2 and 7.4): the dispatcher of the
 * outbox rows that each entry wrote with its sends, and the one alarm that
 * wakes it.
 *
 * Delivery is at least once and may be out of order. Before each dispatch
 * the dispatcher writes, durably, that the attempt is starting; afterwards
 * it writes how the attempt was answered. An attempt with no recorded
 * completion reads as unanswered. A send is dispatched again, after a delay
 * that doubles up to a bound, until transport acknowledges it with the fact
 * of the entry that recorded it. That acknowledgment is bookkeeping, for an
 * advisory as for any other send, and is no entry.
 *
 * A request is given up when its log holds as many routing refusals as the
 * retry policy allows. The dispatcher then offers the scope a `diagnosis`
 * input with the log, through the turn like any other input, and derive's
 * judge decides the finding from the log alone. Only a request is ever
 * diagnosed: a result, a control and an advisory have no result, and are
 * sent until they are acknowledged.
 *
 * A provisional scope's held sends are not dispatched and no attempt of
 * them starts: the fold keeps the list, and the entry that records the
 * confirmation empties it.
 *
 * Nothing here runs inside a storage transaction. A pass runs after a
 * commit and from the object's alarm.
 */

import type { Attempt, Bounds, Entry, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, isScopeRef, parseStrict } from "@generalbusiness/dap-bytes";
import { authoredCutoff, type AuthoredCutoff } from "./authored-cutoff.ts";
import { EXACT_PROOF_RECEIVER_BOUNDS } from "./proof-bytes.ts";
import type { LiveTargetSource } from "./native-live-target.ts";
import { judgeDiagnosis, timeMs, timeOf, type Capabilities } from "@generalbusiness/dap-derive";
import { genuineRetained, ownOf, retainedUsesOf, used, type Scope } from "./core.ts";
import type { Alarm, Clock, Transport } from "./ports.ts";
import type { Dispatched, Outgoing, Store } from "./store.ts";
import { LATE, within } from "./turn.ts";
import { outboxCorrelation, metric } from "./operational.ts";

interface DispatchCounts { attempted: number; acknowledged: number; diagnosed: number }

/**
 * One alarm combines timed deadlines, outbox dispatch, outside-operation
 * attempts, in-memory driver work, signer maintenance, archives, credential
 * expiry and the time bound of original requests. Each persistent owner supplies its retained wake after a restart.
 * Clearing one cause preserves the others; an empty list clears the platform alarm.
 *
 * The alarm is always the earliest remaining wake (authority note, section 5.4,
 * rule 7). This class holds the driver's continuation in memory; it disappears
 * with the work that the process held. The archive callback can also supply
 * its owner's in-memory retry fallback.
 */
export class Wakes {
  readonly #store: Store;
  readonly #alarm: Alarm;
  /** The alarm port the turn uses. */
  readonly deadline: Alarm;
  /** Durable wake owned only by derived signer maintenance. */
  readonly maintenance: Alarm;

  /** False: this scope has no transport, nothing dispatches its sends, and no wake is asked for them. */
  readonly #dispatches: boolean;
  #driver: number | null = null;
  readonly #archive: (() => Timestamp | null) | undefined;
  readonly #credentials: (() => Timestamp | null) | undefined;
  readonly #originals: (() => Timestamp | null) | undefined;

  constructor(store: Store, alarm: Alarm, dispatches = true, archive?: () => Timestamp | null, credentials?: () => Timestamp | null, originals?: () => Timestamp | null) {
    this.#store = store;
    this.#alarm = alarm;
    this.#dispatches = dispatches;
    this.#archive = archive;
    this.#credentials = credentials;
    this.#originals = originals;
    this.deadline = { set: (at) => { store.setDeadline(at); return this.set(); } };
    this.maintenance = { set: (at) => { store.setSignerMaintenance(at); return this.set(); } };
  }

  /** When the operations driver next has work that is in memory only, in milliseconds, or null. The next `set` uses it. */
  driver(at: number | null): void { this.#driver = at; }

  /** Set the alarm at the earliest of the wakes, or clear it when there is none. */
  set(): void | Promise<void> {
    const deadline = this.#store.deadline();
    const dispatch = this.#dispatches ? this.#store.nextDispatch() : null;
    const maintenance = this.#store.signerMaintenance();
    const archive = this.#archive?.() ?? null;
    const credentials = this.#credentials?.() ?? null;
    const originals = this.#originals?.() ?? null;
    const at = [deadline === null ? null : timeMs(deadline), dispatch, this.#store.nextSend(), this.#driver, maintenance === null ? null : timeMs(maintenance), archive === null ? null : timeMs(archive), credentials === null ? null : timeMs(credentials), originals === null ? null : timeMs(originals)].filter((ms): ms is number => ms !== null);
    return this.#alarm.set(at.length === 0 ? null : timeOf(Math.min(...at)));
  }
}

const ROUTING: readonly Dispatched["answer"][] = ["wrong-genesis", "not-found"];

export class Dispatcher {
  readonly #scope: Scope;
  readonly #store: Store;
  readonly #transport: Transport;
  readonly #clock: Clock;
  readonly #liveTarget: LiveTargetSource | undefined;
  readonly #wakes: Wakes;
  readonly #bounds: Bounds;
  /** For the clause of a diagnosis, which may hold a capability effect (section 6.11). */
  readonly #capabilities: Capabilities | undefined;
  #running: Promise<number> | null = null;
  #again = false;

  constructor(scope: Scope, store: Store, ports: { transport: Transport; clock: Clock; capabilities?: Capabilities | null; liveTarget?: LiveTargetSource }, wakes: Wakes, bounds: Bounds) {
    this.#capabilities = ports.capabilities ?? undefined;
    this.#scope = scope;
    this.#store = store;
    this.#transport = ports.transport;
    this.#liveTarget = ports.liveTarget;
    this.#clock = ports.clock;
    this.#wakes = wakes;
    this.#bounds = bounds;
  }

  /**
   * Dispatch what is due, until nothing is. One pass runs at a time: a call
   * while one runs joins it, and the pass looks once more before it ends.
   * Resolves with the number of dispatches and diagnoses it made.
   */
  run(): Promise<number> {
    this.#again = true;
    return (this.#running ??= (async () => {
      let made = 0;
      const counts: DispatchCounts = { attempted: 0, acknowledged: 0, diagnosed: 0 };
      try {
        while (this.#again) {
          this.#again = false;
          made += await this.#pass(counts);
        }
      } finally {
        this.#running = null;
      }
      metric({ kind: "dispatch", place: "dispatch", end: "ok", a: counts.attempted, b: counts.acknowledged, c: counts.diagnosed });
      return made;
    })());
  }

  async #pass(counts: DispatchCounts): Promise<number> {
    let made = 0;
    for (;;) {
      const now = timeMs(this.#clock.read())!;
      const due = this.#store.outgoing(now, this.#bounds.deliveryBatch);
      if (due.length === 0) break;
      for (const send of due) {
        // The clock can move while an earlier row waits on a remote peer.
        let now = timeMs(this.#clock.read())!;
        const ends = performance.now() + this.#bounds.dispatchSeconds * 1000;
        const candidate = this.#cutoff(send);
        if (candidate && !this.#current(send)) continue;
        let proof: boolean | null | undefined;
        if (candidate && send.attempts.some(a => a.answer === "retry") && this.#liveTarget) {
          const left = Math.floor(ends - performance.now());
          proof = left > 0 ? await this.#liveTarget.read(candidate.target, Math.min(left, EXACT_PROOF_RECEIVER_BOUNDS.milliseconds)) : null;
          if (!this.#current(send)) continue;
          now = timeMs(this.#clock.read())!;
          if (proof === true) {
            let receipt = this.#store.liveCutoffReceipt(send.seq, send.n);
            if (receipt || timeMs(candidate.due)! <= now) {
              if (!receipt && this.#pending(candidate)) {
                await this.#scope.alarm();
                if (!this.#current(send)) continue;
                now = timeMs(this.#clock.read())!;
                receipt = this.#store.liveCutoffReceipt(send.seq, send.n);
              }
              if (receipt) { await this.#giveUp(send, now, counts, candidate); made++; continue; }
              if (this.#pending(candidate)) {
                this.#store.attempted(send.seq, send.n, send.attempts, now + this.#bounds.drainRetrySeconds * 1000);
                made++; continue;
              }
            }
          }
        }
        const refused = send.attempts.filter((a) => ROUTING.includes(a.answer)).length;
        if (send.message.class === "request" && refused >= this.#bounds.routingRefusals) await this.#giveUp(send, now, counts);
        else { await this.#dispatch(send, now, counts, candidate, proof === true, ends); await this.#clamp(send, now, ends, proof); }
        made++;
      }
    }
    await this.#wakes.set();
    return made;
  }

  /** Check the current durable row after every asynchronous operation. */
  #current(send: Outgoing): boolean {
    const row = this.#store.outboxItem(send.seq, send.n);
    return !!row && !row.held && !row.acknowledged && !row.result && !row.diagnosis
      && canonicalize(row.to) === canonicalize(send.to) && canonicalize(row.attempts) === canonicalize(send.attempts);
  }

  #cutoff(send: Outgoing): AuthoredCutoff | null {
    const definition = this.#scope.pinned()?.definition, scope = this.#store.scope(), stored = this.#store.stored(send.seq);
    if (!definition || !scope || !stored || stored.hash !== send.hash || !isScopeRef(send.to)) return null;
    try {
      const entry = parseStrict(stored.bytes) as Entry;
      const result = authoredCutoff(definition, entry, { at: scope.at, seq: send.seq, hash: send.hash }, send.n);
      return result && canonicalize(result.target) === canonicalize(send.to) && canonicalize(entry.sends.find(row => row.n === send.n)?.message) === canonicalize(send.message) ? result : null;
    } catch { return null; }
  }

  #pending(cutoff: AuthoredCutoff): boolean {
    const definition = this.#scope.pinned()?.definition, rule = definition?.declared.timed[cutoff.rule];
    const item = this.#store.item(cutoff.item);
    return !!rule && !!item && item.type === rule.on && rule.states.includes(item.state) && item.values[rule.deadline] === cutoff.due;
  }

  /** A proven live target can wake no later than the authored deadline. */
  async #clamp(send: Outgoing, now: number, ends: number, proof?: boolean | null): Promise<void> {
    const row = this.#store.outboxItem(send.seq, send.n);
    if (!row || row.held || row.acknowledged || row.result || row.diagnosis || !row.attempts.length
      || !row.attempts.some(a => a.answer === "retry")) return;
    const current = { ...send, attempts: row.attempts }, cutoff = this.#cutoff(current);
    if (!cutoff || !this.#liveTarget) return;
    const left = Math.floor(ends - performance.now());
    const known = proof === undefined ? left > 0 ? await this.#liveTarget.read(cutoff.target, Math.min(left, EXACT_PROOF_RECEIVER_BOUNDS.milliseconds)) : null : proof;
    if (known !== true || !this.#current(current)) return;
    now = timeMs(this.#clock.read())!;
    if (!this.#pending(cutoff) && !this.#store.liveCutoffReceipt(send.seq, send.n)) return;
    this.#store.attempted(send.seq, send.n, current.attempts, Math.max(now, Math.min(timeMs(cutoff.due)!, now + this.#delay(current.attempts.length))));
  }

  /** The delay before the attempt after the `count`th: the first delay, doubled each time, up to the longest. */
  #delay(count: number): number {
    const { dispatchRetrySeconds, dispatchRetryMaxSeconds } = this.#bounds;
    return Math.min(dispatchRetrySeconds * 2 ** Math.min(count - 1, 30), dispatchRetryMaxSeconds) * 1000;
  }

  /** One dispatch of one send, with its record before and after. */
  async #dispatch(send: Outgoing, now: number, counts: DispatchCounts, cutoff: AuthoredCutoff | null, proven: boolean, ends: number): Promise<void> {
    const o2 = cutoff !== null;
    const { seq, n } = send;
    const store = this.#store;
    const at: Timestamp = timeOf(now);
    const logged = (answer: Dispatched["answer"]): Dispatched[] => [...send.attempts, { at, answer }];
    const next = now + this.#delay(send.attempts.length + 1);
    // Section 7.4: the attempt is recorded before it is sent, as unanswered. The alarm is set for its retry before the send
    // leaves, so a scope that stops here is woken and sends again.
    if (o2 && !this.#current(send)) return;
    if (o2 && performance.now() >= ends) {
      store.attempted(seq, n, send.attempts, now + this.#bounds.drainRetrySeconds * 1000);
      return;
    }
    // For a recognized retry, arm its wake with the existing real log.
    // The new unanswered marker is written only when transport can start.
    const preflight = o2 && send.attempts.some(a => a.answer === "retry");
    store.attempted(seq, n, preflight ? send.attempts : logged("none"), next);
    if (!preflight) { counts.attempted++; outboxCorrelation(`${seq}.${n}`); }
    await this.#wakes.set();
    if (o2 && !this.#current(preflight ? send : { ...send, attempts: logged("none") })) return;
    const nowAfterWake = timeMs(this.#clock.read())!;
    if (cutoff && proven && preflight
      && (store.liveCutoffReceipt(seq, n) || timeMs(cutoff.due)! <= nowAfterWake && this.#pending(cutoff))) {
      store.attempted(seq, n, send.attempts, nowAfterWake);
      return;
    }
    const seconds = o2 ? Math.max(0, (ends - performance.now()) / 1000) : this.#bounds.dispatchSeconds;
    if (o2 && seconds <= 0) return;
    if (preflight) { store.attempted(seq, n, logged("none"), next); counts.attempted++; outboxCorrelation(`${seq}.${n}`); }
    const scope = store.scope()!;
    const envelope = { to: send.to, from: { at: scope.at, seq, hash: send.hash }, n, message: send.message };
    const answer = await within(() => this.#transport.send(envelope), seconds);
    // No answer in time, or none at all: the record stays as it was written.
    if (answer === LATE || answer === null) return;
    if (o2 && !this.#current({ ...send, attempts: logged("none") })) return;
    if (answer.answer === "recorded") {
      store.acknowledge(seq, n, logged("acknowledged"), answer.fact);
      counts.acknowledged++;
      return;
    }
    // A routing refusal by the resolver of the name, or an answer that decided nothing. `source-unverified` to a send of this
    // scope's own sealed entry is logged as a retryable answer: it is not a routing refusal, and it recorded nothing.
    const attempts = logged(answer.answer === "routing" ? answer.reason : "retry");
    const refused = attempts.filter((a) => ROUTING.includes(a.answer)).length;
    // A request that has now met the retry policy is given up in this pass, not after the delay.
    store.attempted(seq, n, attempts, send.message.class === "request" && refused >= this.#bounds.routingRefusals ? now : next);
  }

  /**
   * Section 7.4, "When a request cannot be delivered": a `diagnosis` input
   * with the log, judged in the scope's turn. Written or already written,
   * the request leaves the outgoing sends. Not written now, as when the
   * scope is busy, it is offered again after the drain's retry delay.
   */
  async #giveUp(send: Outgoing, now: number, counts: DispatchCounts, cutoff?: AuthoredCutoff): Promise<void> {
    const { seq, n } = send;
    const store = this.#store;
    const bounds = this.#bounds;
    const definition = this.#scope.pinned()?.definition;
    // One read of the origin through Own, with its retained uses (ruling a94bfa4d, item 1c). A missing or invalid origin or use
    // writes nothing now, as a missing origin did.
    const sequence = this.#scope.localSequence();
    const kept = sequence ? retainedUsesOf(ownOf(store, sequence), seq) : null;
    // The log as the contract's entry holds it. A request that was acknowledged is never given up.
    const attempts = send.attempts.map((a): Attempt => ({ at: a.at, answer: a.answer === "acknowledged" ? "none" : a.answer }));
    let written = false;
    if (definition && kept && sequence) {
      const origin = kept.origin.entry;
      // The judge reads genuine retained uses as facts. A local statement is no Fetched; a clause that names one finds it missing.
      const facts = genuineRetained(kept.uses);
      const end = await this.#scope.turns.run<boolean>({
        asks: () => [],
        judge: (view, clock) => {
          if (cutoff && (!this.#current(send) || !store.liveCutoffReceipt(seq, n))) return { verdict: "answer", answer: false };
          const judged = judgeDiagnosis(view, definition, { of: { seq, n }, attempts }, { clock, bounds, facts, prepared: [], origin, own: ownOf(store, sequence), capabilities: this.#capabilities, platform: this.#scope.pinned()?.platform ?? undefined });
          switch (judged.result) {
            case "write":
              // Room for this entry was counted when the request was sent (section 9.2).
              if (countedEntries(view) >= bounds.scopeEntries) return { verdict: "answer", answer: false };
              return { verdict: "write", draft: judged.draft, retain: used(judged.draft, facts, kept.uses), sealed: () => true, unfit: () => false, full: () => false };
            case "repeat": return { verdict: "answer", answer: true };
            case "due": return { verdict: "stop" };
            default: return { verdict: "answer", answer: false };
          }
        },
      });
      written = end.end === "answer" && end.answer;
    }
    if (written) counts.diagnosed++;
    else if (!cutoff || this.#current(send)) store.attempted(seq, n, send.attempts, now + bounds.drainRetrySeconds * 1000);
  }
}
