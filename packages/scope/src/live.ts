/**
 * The live turn (live note, sections 3.3, 3.6 and 3.7): how an act and a
 * timed rule of an active live scope take effect. It is a platform service
 * of the runtime host. The kernel admits the level and refuses an entry
 * after the confirmation; this file runs the judges of `derive` over state
 * in memory, and writes nothing to storage.
 *
 * A generation is one life of this object in memory. It starts from the
 * fold of the scope's two creation entries, which the journal holds, and
 * ends when the object ends. An act that names another generation is
 * answered `reset`, and nothing is judged.
 *
 * The tick takes the place of the sequence. The state in memory has a head
 * like any folded state: its `seq` is the tick, and its hash is the hash of
 * the entry that `entryOf` builds for the last applied input. That entry is
 * never sealed or stored. So the judges and the fold run unchanged, an item
 * that an act opens takes the tick as its ID, and two generations repeat the
 * same IDs.
 *
 * Each section here is synchronous, so two inputs never interleave inside
 * one. An act waits in one place: the evaluation of its rules. If the tick
 * moves meanwhile, the act starts again, within the turn's bound on
 * restarts.
 */

import type { Bounds, Entry, Grant, SignedIntent, UnavailableReason } from "@generalbusiness/dap-contract";
import { CanonicalError, canonicalize, entryHash, isGrant, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { actionOf, applyEntry, applyLive, clockOf, entryOf, judgeAct, judgeTimed, LAST_MS, liveActive, MemoryState, liveCreation, liveDelta, liveMeterSpec, nextDue, own, prepareRules, timeMs, timeOf, windowOf } from "@generalbusiness/dap-derive";
import type { Clock as Reading, Draft, JudgeContext, LiveDelta, LiveMeterSpec, RuleInput, StateView, ValidDefinition } from "@generalbusiness/dap-derive";
import type { LiveAnswer } from "@generalbusiness/dap-platform";
import type { FreshActAdmission, FreshActAdmissionDecision } from "./applications/act-admission.ts";
// A cycle with core.ts: heldBy is read only when an act runs, after both modules have loaded.
import { heldBy, type Pinned } from "./core.ts";
import type { Asked, LiveTimer, Ports, Standing } from "./ports.ts";
import type { Store } from "./store.ts";
import { LATE, isSigned, turnDeadline } from "./turn.ts";

/** The key of a scope object's live turn. A symbol is no RPC method: only code in the object's own isolate reaches it. */
export const liveTurnsOf = Symbol("live turns");

/** What a live read and the watch show: the generation, its tick, and the state in memory at that tick. The view changes with the next input. */
export interface LiveGeneration { readonly generation: string; readonly tick: number; readonly view: StateView }

/** Phase one of the authority port for one act (`Scope`'s read, within the fetch time limit). */
export type LiveStanding = (asked: Asked) => Promise<Standing | "limit" | null>;

/** Includes every valid deadline when searching for the next timer. */
const LAST_DEADLINE = timeOf(LAST_MS);
/** The longest delay that `setTimeout` keeps. */
const LONGEST = 2 ** 31 - 1;

/** The runtime's timer: one `setTimeout` at a time. */
export function timeoutTimer(): LiveTimer {
  let handle: ReturnType<typeof setTimeout> | undefined;
  return {
    set(milliseconds, fire) {
      if (handle !== undefined) clearTimeout(handle);
      handle = milliseconds === null ? undefined : setTimeout(fire, Math.min(Math.max(0, milliseconds), LONGEST));
    },
  };
}

/** The apply step failed in the fold, so the state in memory may hold part of an input. The generation ends. */
class Broken extends Error {}

const unavailable = (reason: UnavailableReason): LiveAnswer => ({ answer: "unavailable", reason });

export class LiveTurns {
  readonly #store: Store;
  readonly #ports: Pick<Ports, "clock" | "random" | "rules" | "capabilities" | "freshActAdmission">;
  readonly #bounds: Bounds;
  readonly #pinned: () => Pinned | null;
  readonly #standing: LiveStanding;
  readonly #timer: LiveTimer;
  readonly #meterPolicy: { limit: number; used: number } | undefined;
  #generation: string;
  #state: MemoryState | null = null;
  #meter: { spec: LiveMeterSpec; charge: LiveDelta; fixed: number; policy: { limit: number; used: number } } | null = null;
  #changed: ((generation: string, tick: number) => void) | null = null;

  constructor(store: Store, ports: Pick<Ports, "clock" | "random" | "rules" | "capabilities" | "freshActAdmission" | "liveTimer" | "liveMeter">, bounds: Bounds, pinned: () => Pinned | null, standing: LiveStanding) {
    this.#store = store;
    this.#ports = ports;
    this.#bounds = bounds;
    this.#pinned = pinned;
    this.#standing = standing;
    this.#timer = ports.liveTimer ?? timeoutTimer();
    this.#meterPolicy = ports.liveMeter;
    this.#generation = this.#mint();
  }

  /** The current generation's value. A new object, or a fault in memory, mints another. */
  get generation(): string { return this.#generation; }

  /** Told after each input that changed live state, with the generation and the new tick, and when a fault starts a new generation. A listener that fails changes nothing. */
  onChanged(told: (generation: string, tick: number) => void): void { this.#changed = told; }

  /** The live state now, or null: the scope is not an active live scope, or its creation entries do not fold. */
  current(): LiveGeneration | null {
    const live = this.#live();
    if (!live) return null;
    return { generation: this.#generation, tick: live.state.scope()!.head.seq, view: live.state };
  }

  /**
   * One live act (live note, section 3.3). `generation`: the generation
   * that its sender last read. The checks and the judge are a recorded
   * act's: the signature, `notAfter` against the clock, the grant read from
   * the membership scope, the `expected` revision of each item, the guards
   * and the effects. A repeat of an applied intent in this generation is
   * answered with the tick that applied it.
   */
  async act(signed: SignedIntent, grants: readonly Grant[], generation: unknown): Promise<LiveAnswer> {
    const pinned = this.#pinned();
    const scope = this.#store.scope();
    if (!pinned?.definition || !scope || pinned.definition.declared.level?.name !== "live") return unavailable("unavailable");
    if (scope.status === "provisional") return unavailable("scope-provisional");
    const reset = (): LiveAnswer => ({ answer: "reset", generation: this.#generation });
    if (generation !== this.#generation) return reset();
    const definition = pinned.definition;
    const first = this.#live();
    if (!first) return scope.status === "refused" ? { answer: "refused", reason: "scope-refused", generation: this.#generation, tick: scope.head.seq } : unavailable("unavailable");
    const refused = (reason: Extract<LiveAnswer, { answer: "refused" }>["reason"], name?: string): LiveAnswer =>
      ({ answer: "refused", reason, ...(name === undefined ? {} : { name }), generation: this.#generation, tick: this.#tick() });
    if (!isSigned(signed)) return refused("bad-intent");
    const intent = signed.intent;
    const act = own(definition.declared.acts, intent.kind);

    // Before the turn, as for a recorded act: one read of the signer's authority, unless this generation applied the intent.
    let standing: Standing | null = null;
    let admission: Awaited<ReturnType<FreshActAdmission["read"]>> = null;
    const admissionPort = this.#ports.freshActAdmission;
    const known = () => first.state.accepted(intent.actor, intent.idempotencyKey) !== null;
    const admissionRefusal = (): LiveAnswer | null => {
      if (!admissionPort) return null;
      let decision: FreshActAdmissionDecision = "unavailable";
      try { decision = admission?.current() ?? "unavailable"; } catch { /* missing proof is unavailable */ }
      if (decision === "allowed") return null;
      return decision === "unavailable" ? unavailable("dependency-unavailable") : refused(decision);
    };
    if (!known()) {
      const read = await this.#standing({ scope: scope.at, signed, action: act ? actionOf(act, definition) : null,
        grants: (Array.isArray(grants) ? grants : []).filter(isGrant), window: windowOf(definition, scope.kind, intent.kind) });
      if (generation !== this.#generation) return reset();
      if (read === "limit" && !known()) return refused("limit");
      standing = read === "limit" ? null : read;
      if (admissionPort && !known()) {
        try { admission = await admissionPort.read(); } catch { /* missing proof is unavailable */ }
        if (generation !== this.#generation) return reset();
        const refusal = known() ? null : admissionRefusal();
        if (refusal) return refusal;
      }
    }
    const context = (view: StateView, clock: Reading): Omit<JudgeContext, "prepared"> => ({
      clock, bounds: this.#bounds, facts: [], presented: {}, capabilities: this.#ports.capabilities ?? undefined,
      membership: standing?.membership ?? null, grants: standing === null ? null : heldBy(standing, view, clock),
    });

    const accepted = (state: MemoryState): LiveAnswer | null => {
      if (state.accepted(intent.actor, intent.idempotencyKey) === null) return null;
      const judged = judgeAct(state, definition, signed, { ...context(state, this.#clock(state)), prepared: [] });
      if (judged.result === "accepted-before") return { answer: "applied", generation: this.#generation, tick: judged.seq };
      if (judged.result === "refused") return refused(judged.reason, judged.name);
      if (judged.result === "mismatch") return refused("bad-intent", judged.reason);
      if (judged.result === "unavailable") return unavailable(judged.reason);
      return null;
    };

    for (let restarts = 0; ; restarts++) {
      // Before the rules: what is due runs first, and the walk that finds the rules judges nothing.
      const before = this.#section(definition, (state): LiveAnswer | { tick: number; asks: RuleInput[] } => {
        const repeat = accepted(state);
        if (repeat) return repeat;
        if (restarts > this.#bounds.turnRestarts) return unavailable("busy");
        const drained = this.#drain(state, definition);
        if (drained) return drained;
        return { tick: state.scope()!.head.seq, asks: prepareRules(state, definition, { act: signed, context: { ...context(state, this.#clock(state)), prepared: [] } }) };
      });
      if ("answer" in before) return before;
      const prepared = before.asks.length === 0 ? [] : await turnDeadline(() => this.#ports.rules.evaluate(before.asks), this.#bounds.preparationSeconds);
      if (generation !== this.#generation) return reset();
      const done = this.#section(definition, (state): LiveAnswer | "again" => {
        const repeat = accepted(state);
        if (repeat) return repeat;
        if (prepared === LATE) return unavailable("unavailable");
        if (state.scope()!.head.seq !== before.tick) return "again";
        const clock = this.#clock(state);
        const judged = judgeAct(state, definition, signed, { ...context(state, clock), prepared });
        switch (judged.result) {
          case "write": {
            const refusal = admissionRefusal();
            if (refusal) return refusal;
            const applied = this.#apply(state, definition, judged.draft, clock);
            return typeof applied === "number" ? { answer: "applied", generation: this.#generation, tick: applied }
              : applied === "full" ? refused("scope-full", "liveBytes") : refused(applied === "size" ? "bad-field" : "unauthorized");
          }
          case "accepted-before": return { answer: "applied", generation: this.#generation, tick: judged.seq };
          case "refused": return refused(judged.reason, judged.name);
          // The live answers have no mismatch. The key belongs to another intent of this signer in this generation.
          case "mismatch": return refused("bad-intent", judged.reason);
          case "unavailable": return unavailable(judged.reason);
          case "due": return "again";
        }
      });
      if (done !== "again") return done;
    }
  }

  /** Runs every due timed rule now, as the timer does, and sets the timer for the next deadline. */
  drain(): void {
    const definition = this.#pinned()?.definition;
    if (!definition) return;
    this.#section(definition, (state) => this.#drain(state, definition));
    if (this.#state) this.#arm(this.#state, definition);
  }

  /** One synchronous section over this generation's state. A fault in the fold ends the generation, and the input is unavailable. */
  #section<T>(definition: ValidDefinition, work: (state: MemoryState) => T): T | LiveAnswer {
    const live = this.#live();
    if (!live) return unavailable("unavailable");
    const tick = live.state.scope()!.head.seq;
    try {
      return work(live.state);
    } catch (error) {
      if (!(error instanceof Broken)) throw error;
      this.#reset();
      return unavailable("unavailable");
    } finally {
      const state = this.#state;
      if (state === live.state && state.scope()!.head.seq !== tick) this.#told(state, definition);
    }
  }

  /**
   * Live note, section 3.6: while a timed rule is due, judge it and apply
   * it, one at a time, within the turn's bound on timed attempts. Null:
   * nothing more is due. A transition that is due while the clock is behind
   * waits, as in a recorded scope.
   */
  #drain(state: MemoryState, definition: ValidDefinition): LiveAnswer | null {
    for (let attempts = 0; ; attempts++) {
      const clock = this.#clock(state);
      const due = nextDue(state, definition, clock.asOf);
      if (!due) return null;
      if (attempts >= this.#bounds.timedAttemptsPerTurn) return unavailable("busy");
      const judged = judgeTimed(state, definition, due, { clock, bounds: this.#bounds, capabilities: this.#ports.capabilities ?? undefined });
      if (judged.result === "dropped") continue;
      if (judged.result === "unavailable") return unavailable(judged.reason);
      // The validator bounds a timed entry's size. A timed input that cannot be an entry is a fault, as in the recorded drain.
      if (typeof this.#apply(state, definition, judged.draft, clock) !== "number") return unavailable("unavailable");
    }
  }

  /** The draft as the entry it would be at this tick, its hash, and the fold of it into memory. The new tick, or why it cannot be an entry. */
  #apply(state: MemoryState, definition: ValidDefinition, draft: Draft, clock: Reading): number | "size" | "form" | "full" {
    const entry = entryOf(state, draft, clock);
    let bytes: string;
    try {
      bytes = canonicalize(entry);
    } catch (error) {
      if (error instanceof CanonicalError) return "form";
      throw error;
    }
    if (utf8(bytes).length > this.#bounds.entryBytes) return "size";
    try {
      const meter = this.#meter;
      if (!meter) applyLive(state, definition, entry, entryHash(entry), { bounds: this.#bounds });
      else {
        let next = meter.charge;
        const committed = state.liveTransaction(() => applyLive(state, definition, entry, entryHash(entry), { bounds: this.#bounds }), changes => {
          const delta = liveDelta(changes, meter.spec, state.scope()!.at);
          next = { dynamic: meter.charge.dynamic + delta.dynamic, items: meter.charge.items + delta.items, timers: meter.charge.timers + delta.timers };
          const total = meter.fixed + next.dynamic + next.items + next.timers;
          if (![next.dynamic, next.items, next.timers, total].every(Number.isSafeInteger) || total < 0) throw new Error("live meter arithmetic");
          return total <= meter.policy.limit;
        });
        if (!committed) { if (entry.input.type === "timed") throw new Error("live timer exceeded its reserve"); return "full"; }
        meter.charge = next;
        meter.policy.used = meter.fixed + next.dynamic + next.items + next.timers;
      }
    } catch (error) {
      throw new Broken(error instanceof Error ? error.message : "the live fold failed");
    }
    return entry.seq;
  }

  /** The state of this generation, folded from the stored creation entries on first use. Null: no active live scope, or entries that do not fold. */
  #live(): { state: MemoryState } | null {
    const definition = this.#pinned()?.definition;
    const scope = this.#store.scope();
    if (!definition || !scope || !liveActive(definition, scope)) return null;
    if (this.#state) return { state: this.#state };
    let state: MemoryState;
    try {
      const entries = [];
      for (let seq = 0; seq <= scope.head.seq; seq++) {
        const kept = this.#store.stored(seq);
        if (!kept) return null;
        entries.push({ entry: parseStrict(kept.bytes) as Entry, hash: kept.hash });
      }
      if (this.#meterPolicy) {
        const spec = liveMeterSpec(definition, this.#bounds);
        const made = liveCreation(definition, entries, spec, { bounds: this.#bounds });
        const used = made.fixed + made.charge.dynamic + made.charge.items + made.charge.timers;
        if (!Number.isSafeInteger(used) || used > this.#meterPolicy.limit) return null;
        this.#meterPolicy.used = used;
        this.#meter = { spec, charge: made.charge, fixed: made.fixed, policy: this.#meterPolicy };
        state = made.state;
      } else {
        state = new MemoryState();
        for (const kept of entries) applyEntry(state, definition, kept.entry, kept.hash, { bounds: this.#bounds });
      }
    } catch {
      return null;
    }
    if (state.scope()?.head.hash !== scope.head.hash) return null;
    this.#state = state;
    this.#arm(state, definition);
    return { state };
  }

  #tick(): number { return this.#state?.scope()?.head.seq ?? this.#store.scope()?.head.seq ?? 0; }
  #clock(state: StateView): Reading { return clockOf(state, this.#ports.clock.read()); }

  /** A new generation: the state in memory is dropped with its deadlines, and the next use folds the creation entries again. */
  #reset(): void {
    this.#generation = this.#mint();
    this.#state = null;
    this.#meter = null;
    this.#timer.set(null, () => undefined);
    try { this.#changed?.(this.#generation, this.#store.scope()?.head.seq ?? 0); } catch { /* a notice was lost, and no state */ }
  }

  #told(state: MemoryState, definition: ValidDefinition): void {
    this.#arm(state, definition);
    try { this.#changed?.(this.#generation, state.scope()!.head.seq); } catch { /* a notice was lost, and no state */ }
  }

  /** The timer, at the earliest deadline that the state holds. A deadline that has passed is retried after the drain's retry delay. */
  #arm(state: MemoryState, definition: ValidDefinition): void {
    const next = definition.timedTypes.length === 0 ? null : nextDue(state, definition, LAST_DEADLINE);
    if (!next) return this.#timer.set(null, () => undefined);
    const now = timeMs(this.#ports.clock.read())!;
    const wait = timeMs(next.due)! - now;
    this.#timer.set(wait > 0 ? wait : this.#bounds.drainRetrySeconds * 1000, () => this.drain());
  }

  #mint(): string {
    return [...this.#ports.random.bytes(16)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
}
