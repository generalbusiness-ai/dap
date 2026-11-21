/** Experimental live logical deltas; no capacity or runtime admission is selected here. */
import type { Bounds, Entry, Item, Digest, TimedRule, ScopeRef } from "@generalbusiness/dap-contract";
import type { StageChange } from "../live-stage.ts";
import { LiveBindings } from "../live-binding.ts";
import { MemoryState } from "../state.ts";
import { applyEntry } from "../fold.ts";
import { own } from "../values.ts";
import type { DrawOptions } from "../draws.ts";
import type { ValidDefinition } from "./index.ts";
import type { Type } from "./context.ts";
import { liveHeldItemEnvelope, livePermanentMetadata, liveStateBuckets, liveTimedAppend } from "./live-envelope.ts";
import { stated } from "./sizes.ts";

export interface LiveMeterSpec {
  readonly types: ReadonlyMap<string, Type>;
  readonly bounds: Bounds;
  readonly deadlines: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly timed: readonly TimedRule[];
  readonly definition: ValidDefinition;
  readonly bindings: LiveBindings;
  readonly timerCosts?: ReadonlyMap<number, number>;
}
export interface LiveDelta { readonly dynamic: number; readonly items: number; readonly timers: number }
const zero = (): LiveDelta => ({ dynamic: 0, items: 0, timers: 0 });
const number = (n: number): number => { if (!Number.isSafeInteger(n)) throw new RangeError("live meter overflow"); return n; };
const plus = (a: number, b: number): number => number(number(a) + number(b));
const product = (a: number, b: number): number => number(number(a) * number(b));
const merge = (a: LiveDelta, b: LiveDelta): LiveDelta => ({ dynamic: plus(a.dynamic, b.dynamic), items: plus(a.items, b.items), timers: plus(a.timers, b.timers) });
const negate = (d: LiveDelta): LiveDelta => ({ dynamic: -d.dynamic, items: -d.items, timers: -d.timers });

// These rows are paid by the per-item or per-definition fixed envelope.
const paid = new Set(["fixedRows", "fixedRaw", "fixedCounts", "fixedDependencies", "fixedRowDependencies", "index", "counts", "keyed", "rows"]);
// Identity and head are paid by livePermanentMetadata at generation start.
const permanent = new Set(["scope", "fixedReady"]);
const dynamic = new Set(["fixedHashes", "relations", "accepted", "requests", "pendingRequests", "decided", "sourceOrder", "creations", "operations", "texts", "prepared", "records", "observed", "holders", "itemDuties", "settledHolders", "accounts", "geneses", "copies"]);
const record = (collection: string, key: unknown, value: unknown): number => stated([collection, key, value]);

/** History values use a per-digest maximum; the producer must retain only valid digests. */
function rowCharge(collection: string, key: unknown, value: unknown): number {
  if (collection === "texts") {
    if (!Array.isArray(value) || value.length !== 3 || !Array.isArray(value[2])) throw new TypeError("invalid text history");
    return plus(record(collection, key, [value[0], value[1], []]), product(value[2].length, 74));
  }
  if (collection === "geneses") {
    if (!Array.isArray(value)) throw new TypeError("invalid genesis history");
    return plus(record(collection, key, []), product(value.length, 74));
  }
  return record(collection, key, value);
}

function itemCharge(value: unknown, spec: LiveMeterSpec, at: ScopeRef): LiveDelta {
  const item = value as Item;
  if (!item || typeof item.type !== "string" || typeof item.state !== "string" || !Array.isArray(item.attributed)) throw new TypeError("invalid live item");
  const type = spec.types.get(item.type);
  if (!type || !type.states.has(item.state)) throw new TypeError("unknown live item state");
  const steps = own(own(spec.deadlines, item.type), item.state) ?? 0;
  if (!Number.isSafeInteger(steps) || steps < 0) throw new RangeError("invalid timed potential");
  // The full actual item includes its attribution exactly once.
  return { dynamic: record("items", item.id, item), items: liveHeldItemEnvelope(spec.definition, type, item, at, spec.bindings),
    timers: product(steps, spec.timerCosts?.get(spec.bindings.type(item.type) ?? -1) ?? liveTimedAppend(type, spec.timed, spec.bounds)) };
}

/** A change is charged from its before/after values; an unknown collection fails closed. */
export function liveDelta(changes: readonly StageChange[], spec: LiveMeterSpec, at: ScopeRef): LiveDelta {
  let delta = zero();
  for (const change of changes) {
    if (paid.has(change.collection) || permanent.has(change.collection)) continue;
    if (change.collection === "items") {
      if (change.hadBefore) delta = merge(delta, negate(itemCharge(change.before, spec, at)));
      if (change.hasAfter) delta = merge(delta, itemCharge(change.after, spec, at));
      continue;
    }
    if (!dynamic.has(change.collection)) throw new TypeError(`unaccounted live collection: ${change.collection}`);
    const before = change.hadBefore ? rowCharge(change.collection, change.key, change.before) : 0;
    const after = change.hasAfter ? rowCharge(change.collection, change.key, change.after) : 0;
    delta = merge(delta, { dynamic: number(after - before), items: 0, timers: 0 });
  }
  return delta;
}

/** Fold actual stored creation entries through the same staged delta path. */
export function liveCreation(definition: ValidDefinition, entries: readonly { entry: Entry; hash: Digest }[], spec: LiveMeterSpec, options: DrawOptions = {}): { state: MemoryState; charge: LiveDelta; fixed: number } {
  const state = MemoryState.stagedLive(spec.bindings);
  let charge = zero();
  for (const { entry, hash } of entries) {
    state.liveTransaction(() => applyEntry(state, definition, entry, hash, options), changes => {
      const at = state.scope()?.at;
      if (!at) throw new Error("creation fold has no scope");
      charge = merge(charge, liveDelta(changes, spec, at));
      return true;
    });
  }
  const scope = state.scope();
  if (!scope || scope.status !== "active") throw new TypeError("creation did not activate a live scope");
  let fixed = plus(livePermanentMetadata(scope, definition.digest), spec.bindings.logicalBytes);
  for (const type of spec.types.values()) fixed = plus(fixed, liveStateBuckets(type, spec.bindings));
  // The compiled declaration and validated type maps are shared with the
  // pinned definition. This generation owns the reference list and costs.
  fixed = plus(fixed, record("timerRules", null, spec.timed.map((_, i) => i)));
  for (const [ordinal, amount] of spec.timerCosts ?? []) fixed = plus(fixed, record("timerCost", ordinal, amount));
  return { state, charge, fixed };
}

// Experimental handoff: the validator has already checked these exact slots.
const liveTypes = new WeakMap<ValidDefinition, ReadonlyMap<string, Type>>();
export function rememberLiveTypes(definition: ValidDefinition, types: ReadonlyMap<string, Type>): void { liveTypes.set(definition, types); }
export function liveMeterSpec(definition: ValidDefinition, bounds: Bounds): LiveMeterSpec {
  const types = liveTypes.get(definition);
  if (!types) throw new Error("no validated live type handoff");
  // Live validation admits no holder capability.
  if (definition.holdTypes.length) throw new Error("unsupported live holder accounting");
  const bindings = new LiveBindings(types);
  const timed = Object.values(definition.declared.timed);
  const timerCosts = new Map<number, number>();
  for (const [name, type] of types) {
    let duty = 0;
    if (definition.declared.capacity?.name === "whole-scope") {
      const max = Number.MAX_SAFE_INTEGER;
      const amount = { entries: max, items: max, records: max, bytes: max, requests: max };
      const marks = own(definition.markers, name)?.marks ?? [];
      const duties = [{ item: max, kind: "deadline", slot: null, amount }, { item: max, kind: "state", slot: null, amount },
        ...marks.map(slot => ({ item: max, kind: "mark", slot, amount }))];
      // Pay a full maximal row each step, regardless of what it replaces.
      duty = record("itemDuties", max, duties);
    }
    const ordinal = bindings.type(name);
    if (ordinal === undefined) throw new Error("missing live type ordinal");
    timerCosts.set(ordinal, plus(liveTimedAppend(type, timed, bounds), duty));
  }
  return { definition, bindings, types, bounds, timed, deadlines: definition.deadlines, timerCosts };
}

/** The live generation's logical byte ceiling; this is not a host heap limit. */
export const LIVE_LIMIT = 32 * 1024 * 1024;

/** Initial charge plus four entry widths and each declared type's bounded growth. */
export function liveLimit(initial: number, spec: LiveMeterSpec): number {
  const natural = (value: number): number => {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("invalid live limit operand");
    return Math.min(value, LIVE_LIMIT);
  };
  const sum = (a: number, b: number) => Math.min(LIVE_LIMIT, natural(a) + natural(b));
  const multiply = (a: number, b: number) => {
    a = natural(a); b = natural(b);
    return a === 0 || b === 0 ? 0 : a > Math.floor(LIVE_LIMIT / b) ? LIVE_LIMIT : a * b;
  };
  const entry = natural(spec.bounds.entryBytes);
  let total = sum(natural(initial), multiply(4, entry));
  for (const [name, item] of Object.entries(spec.definition.declared.items)) {
    const ordinal = spec.bindings.type(name), timer = ordinal === undefined ? undefined : spec.timerCosts?.get(ordinal);
    if (ordinal === undefined || timer === undefined) throw new Error("missing live timer cost");
    const states = Object.values(own(spec.deadlines, name) ?? {});
    const steps = states.reduce((maximum, value) => Math.max(maximum, natural(value)), 0);
    const each = sum(entry, multiply(steps, timer));
    total = sum(total, multiply(Math.min(natural(item.max), natural(spec.bounds.scopeItems)), each));
  }
  return total;
}
