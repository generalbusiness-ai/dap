/** Resolve the revisions an act expects from the items its caller holds.
 * This derives no authority and checks no guard. The scope still judges the
 * signed input and every expected revision at its own head.
 */
import type { FactRef, FieldValue, Item, ScopeRef } from "@generalbusiness/dap-contract";
import { expectedKeys } from "@generalbusiness/dap-derive";

import { isFactRef, isRecord } from "@generalbusiness/dap-bytes";
type ExpectedField = Readonly<Record<string, unknown>> & { type?: string };

interface ExpectedAct {
  step: "open" | "transition" | "comment";
  also: Readonly<Record<string, unknown>>;
}

/** A lawful alias such as __proto__ remains an own enumerable field. */
function put<T>(out: Record<string, T>, name: string, value: T): void {
  Object.defineProperty(out, name, { value, enumerable: true, writable: true, configurable: true });
}

/** A missing field or alias never takes its value from the prototype. */
function ownValue(record: Readonly<Record<string, unknown>> | undefined, name: string): unknown {
  return record !== undefined && Object.hasOwn(record, name) ? record[name] : undefined;
}

type Address = number | object;
type Bound<R = number, I extends Address = number> = Pick<Item, "type" | "refs"> & { readonly id: I; readonly revision: R };
interface Rule { item?: string; one?: true; by?: string; code?: string; via?: { slot: string; of: string } }

/** The act's subjects, resolved over `items`: `subject` gives the item a name selects, and `viaId` gives the ID that a `via` rule's slot holds. */
function subjectsOf<R, I extends Address>(act: ExpectedAct, items: readonly Bound<R, I>[], on: I | null, fields: Readonly<Record<string, FieldValue>>) {
  const bound = new Map<string, Bound<R, I> | null>();
  const viaId = (rule: Rule): Address | undefined => {
    const via = rule.via ? subject(rule.via.of)?.refs[rule.via.slot] : undefined;
    return typeof via === "number" ? via : via && typeof via === "object" && "seq" in via ? (via as FactRef).seq
      : items.find(item => item.id === via)?.id;
  };
  const subject = (name: string): Bound<R, I> | null => {
    if (bound.has(name)) return bound.get(name)!;
    if (name === "on") return items.find((item) => item.id === on) ?? null;
    const rule = ownValue(act.also, name.replace(/^also\./, "")) as Rule | undefined;
    if (!rule || rule.code !== undefined) return null;
    bound.set(name, null);
    const id = viaId(rule);
    const item = rule.one ? items.find((i) => i.type === rule.item) : rule.by !== undefined ? items.find((i) => i.id === ownValue(fields, rule.by!)) : items.find((i) => i.id === id);
    bound.set(name, item ?? null);
    return item ?? null;
  };
  return { subject, viaId };
}

/**
 * The revision of each item the act names, as the summary has it now: the
 * item it is on, the one item of a type, and an item a field names. A name
 * that a rule selects has no key: the scope resolves it. The scope checks
 * every revision again and refuses one that moved.
 */
export function expectedOf<A extends ExpectedAct, R = number, I extends Address = number>(act: A, items: readonly Bound<R, I>[], on: I | null, fields: Readonly<Record<string, FieldValue>>): Record<string, R> {
  const expected: Record<string, R> = {};
  const revisions = new Map<string, { revision: R }>();
  if (expectedKeys(act, []).includes("on") && on !== null) {
    const at = items.find((item) => item.id === on)?.revision;
    if (at !== undefined) revisions.set("on", { revision: at });
  }
  const { subject } = subjectsOf(act, items, on, fields);
  const bound: string[] = [];
  for (const [name, rule] of Object.entries(act.also)) {
    if ((rule as { code?: string }).code !== undefined) continue;
    const item = subject(name);
    if (item) { bound.push(name); revisions.set(name, { revision: item.revision }); }
  }
  for (const name of expectedKeys(act, bound)) {
    const found = revisions.get(name);
    if (found) put(expected, name, found.revision);
  }
  return expected;
}

/**
 * The items that a `via` name of the act selects and `items` does not hold. A slot of another subject names such an item, not the
 * caller, and a final item has left the live summary. The scope still binds it and requires its revision. A name that a field
 * selects stays out: the caller named that item, and the summary alone answers for it.
 */
export function viaLeft<A extends ExpectedAct>(act: A, items: readonly Bound[], on: number | null, fields: Readonly<Record<string, FieldValue>>): { type: string; id: number }[] {
  const { subject, viaId } = subjectsOf(act, items, on, fields);
  return Object.entries(act.also).flatMap(([name, value]) => {
    const rule = value as Rule, id = viaId(rule);
    return typeof id === "number" && rule.item !== undefined && subject(name) === null ? [{ type: rule.item, id }] : [];
  });
}

/**
 * The first subject whose item the caller's `items` do not hold, or null. The act's primary lacks when `on` names no held row.
 * A subject that a field names lacks when the field names no held row. A subject that a `via` selects lacks when its slot names
 * an item that `items` does not hold. Such a subject is not absent: the scope selects an item for it, and the caller cannot
 * give its revision. A subject whose rule selects nothing is absent, and this function never names it. One rule serves the
 * client's `now` and the MCP result's `now`.
 */
export function lackedSubject<A extends ExpectedAct>(act: A, items: readonly Bound[], on: number | null, fields: Readonly<Record<string, FieldValue>>): string | null {
  if (expectedKeys(act, []).includes("on") && on !== null && !items.some(item => item.id === on)) return "on";
  const { subject, viaId } = subjectsOf(act, items, on, fields);
  for (const [name, value] of Object.entries(act.also)) {
    const rule = value as Rule;
    if (rule.code !== undefined) continue;
    if (rule.by !== undefined) {
      const named = ownValue(fields, rule.by);
      if (typeof named === "number" && !items.some(item => item.id === named)) return name;
    } else if (rule.via !== undefined && rule.item !== undefined && typeof viaId(rule) === "number" && subject(name) === null) return name;
  }
  return null;
}

/** The final states an item type declares, byte-sorted, as an item query takes them. An undeclared type has none. */
export function finalStates(declared: unknown): string[] {
  const states = isRecord(declared) ? declared["states"] : undefined;
  return isRecord(states) ? Object.keys(states).filter((state) => { const row = states[state]; return isRecord(row) && row["final"] === true; }).sort() : [];
}

/**
 * The fields as the scope will read them, for resolving the act's subjects only, never signed. Two steps, as derive takes them:
 * readFields gives each declared field the caller gave, else its declared default (an own value, else `default`; an absent
 * optional with no default stays absent); then readFacts puts each local fact, one whose scope and genesis hash are the
 * target's, as its `seq`, in a declared fact field and in the lists and records that hold one. A foreign fact stays a fact, so
 * its `seq` never names a local item. The intent carries the fields as given: the original fact, and no default.
 */
export function effectiveFields(act: { fields: Readonly<Record<string, ExpectedField>> }, fields: Readonly<Record<string, FieldValue>>, at: Pick<ScopeRef, "scope" | "genesis"> | null): Record<string, FieldValue> {
  const local = (v: unknown): boolean => at !== null && isFactRef(v) && v.at.scope === at.scope && v.at.genesis === at.genesis;
  const normal = (type: ExpectedField | undefined, value: unknown): unknown => {
    if (type?.type === "list" && Array.isArray(value)) return value.map((v) => normal(type["of"] as ExpectedField, v));
    if (type?.type === "record" && isRecord(value)) {
      const out: Record<string, unknown> = {};
      for (const name of Object.keys(value)) put(out, name, normal(ownValue(type["of"] as Record<string, ExpectedField>, name) as ExpectedField | undefined, ownValue(value, name)));
      return out;
    }
    return type?.type === "fact" && local(value) ? (value as FactRef).seq : value;
  };
  const out: Record<string, FieldValue> = {};
  for (const [name, type] of Object.entries(act.fields)) {
    const value = Object.hasOwn(fields, name) ? ownValue(fields, name) : type["default"];
    if (value !== undefined) put(out, name, normal(type, value) as FieldValue);
  }
  return out;
}
