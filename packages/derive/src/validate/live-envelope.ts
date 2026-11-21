/** Experimental logical-byte envelopes for live state. Not connected to validation or admission. */
import type { Bounds, TimedRule } from "@generalbusiness/dap-contract";
import type { ScopeState } from "../state.ts";
import type { LiveBindings } from "../live-binding.ts";
import { fixedRowsOf } from "../fixed-index.ts";
import { canonicalize } from "@generalbusiness/dap-bytes";
import type { Type } from "./context.ts";
import { memberBytes, stated } from "./sizes.ts";

// Logical framing: every independently retained map entry or set edge is a
// canonical JSON array [collection, key, value]. Shared keys are charged once
// per edge. Numbers below bound canonical UTF-8 bytes, not V8 heap bytes.
const checked = (n: number): number => {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError("live envelope exceeds safe arithmetic");
  return n;
};
const add = (...values: number[]): number => values.reduce((n, value) => checked(n + checked(value)), 0);
const times = (n: number, value: number): number => checked(checked(n) * checked(value));
const array = (...values: number[]): number => add(2, Math.max(0, values.length - 1), ...values);
const object = (entries: readonly (readonly [string, number])[]): number =>
  add(2, Math.max(0, entries.length - 1), ...entries.map(([name, value]) => add(stated(name), 1, value)));
/** A canonical JSON text has no literal controls. Re-encoding it as a JSON
 * string doubles at most its quote and backslash bytes, plus two delimiters. */
const quote = (n: number): number => add(2, times(2, n));
const row = (name: string, key: number, value: number): number => array(stated(name), key, value);
const NUMBER = 20, DIGEST = 73, NULL = 4;

/** Persistent empty state buckets and zero counts, paid once per declared state. */
export function liveStateBuckets(type: Type, bindings: LiveBindings): number {
  const id = bindings.type(type.name);
  if (id === undefined) throw new Error("unknown live type");
  return add(...[...type.states.keys()].map(state => {
    const ordinal = bindings.state(type.name, state);
    if (ordinal === undefined) throw new Error("unknown live state");
    const key = stated(canonicalize([id, ordinal]));
    return add(row("index-bucket", key, 2), row("counts", key, array(stated(id), stated(ordinal), NUMBER)));
  }));
}

/** Scope and fixed-ready maxima for an active generation, including future head and clock. */
export function livePermanentMetadata(scope: ScopeState, definitionDigest: string): number {
  // The active scope's identity, creator, genesis and held list are unchanged
  // by live inputs. Pay the current whole object plus worst-case replacements
  // of head seq/hash and time, even though this charges their old values too.
  const scopeMax = add(stated(scope), NUMBER, DIGEST, 26);
  const ready = array(stated(definitionDigest), stated(scope.at.scope), stated(scope.at.genesis), NUMBER, DIGEST);
  return add(row("scope", NULL, scopeMax), row("fixedReady", NULL, quote(ready)));
}

/** One hash and the largest history growth of any timed rule on this type. */
export function liveTimedAppend(type: Type, rules: readonly TimedRule[], bounds: Bounds): number {
  const hash = row("fixedHashes", NUMBER, DIGEST);
  const growth = rules.filter(rule => rule.on === type.name).map(rule => {
    return add(...rule.effects.map(effect => {
      // A timed party set can copy one member into an author slot. The
      // judgeTimed checks each single party member with memberFits. The
      // timed fold has no signer, so one set can add only that member. Count
      // every party set: the validator's Type does not retain author flags.
      if ("party" in effect && effect.party.from !== null && effect.party.list === undefined) return add(checked(memberBytes(bounds)), 1);
      if (!("value" in effect)) return 0;
      const name = effect.value.slot, slot = type.slots.get(name);
      if (!slot || slot.kind !== "value" || slot.type.type !== "text" || !slot.type.detached) return 0;
      const key = quote(array(NUMBER, stated(name)));
      // Paying for a whole new history row also covers appending one digest
      // to an existing row, including its comma and all framing.
      // The dynamic meter uses 74 bytes even for its first digest (rather
      // than 73 with no comma), so include that extra byte for a new row.
      return add(row("texts", key, array(NUMBER, stated(name), array(DIGEST))), 1);
    }));
  });
  // Timed effects can grow the actual item: each written value appears in
  // the bounded entry; the revision can widen to a safe-integer encoding.
  return add(hash, Math.max(0, ...growth), bounds.entryBytes, NUMBER);
}

/** Per-item index envelope based on the fixed values actually held after opening. */
export function liveHeldItemEnvelope(definition: import("./index.ts").ValidDefinition, type: Type, item: import("@generalbusiness/dap-contract").Item, at: import("@generalbusiness/dap-contract").ScopeRef, bindings: LiveBindings): number {
  const typeId = bindings.type(type.name);
  if (typeId === undefined) throw new Error("unknown live type");
  const state = stated(Math.max(0, type.states.size - 1));
  const indexKey = Math.max(...[...type.states.keys()].map(name => stated(canonicalize([typeId, bindings.state(type.name, name)]))));
  const itemId = stated(item.id);
  let total = row("index-edge", indexKey, itemId);
  for (const { row: fixedRow, dependencies } of fixedRowsOf(definition, item, at, () => null)) {
    const rawText = canonicalize(fixedRow.raw), raw = stated(fixedRow.raw), slotId = bindings.slot(type.name, fixedRow.slot);
    if (slotId === undefined) throw new Error("unknown live slot");
    const id = stated(canonicalize([typeId, slotId, item.id]));
    const fixed = object([["item", itemId], ["state", state], ["raw", raw], ["key", quote(raw)]]);
    const rawCount = Math.max(...[...type.states.keys()].map(name => stated(canonicalize([0, typeId, slotId, rawText, bindings.state(type.name, name)]))));
    const normalizedCount = quote(array(stated(1), stated(typeId), stated(slotId), quote(raw), state));
    total = add(total, row("fixedRows", id, fixed), row("fixedRaw", id, stated(rawText)),
      row("fixedCounts", rawCount, NUMBER), row("fixedCounts", normalizedCount, NUMBER), row("fixedRowDependencies", id, 2));
    for (const dependency of dependencies) {
      const dep = stated(canonicalize([dependency.seq, dependency.hash]));
      total = add(total, row("fixedRowDependency-edge", id, dep), row("fixedDependencies", dep, 2), row("fixedDependency-edge", dep, id));
    }
  }
  if (type.indexes?.length) throw new RangeError("live keyed indexes need an envelope");
  return total;
}
