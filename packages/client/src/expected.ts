/** Resolve the revisions an act expects from the items its caller holds.
 * This derives no authority and checks no guard. The scope still judges the
 * signed input and every expected revision at its own head.
 */
import type { FactRef, FieldValue, Item } from "@generalbusiness/dap-contract";

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

type Bound = Pick<Item, "id" | "type" | "revision" | "refs">;
interface Rule { item?: string; one?: true; by?: string; code?: string; via?: { slot: string; of: string } }

/** The act's subjects, resolved over `items`: `subject` gives the item a name selects, and `viaId` gives the ID that a `via` rule's slot holds. */
function subjectsOf(act: ExpectedAct, items: readonly Bound[], on: number | null, fields: Readonly<Record<string, FieldValue>>) {
  const bound = new Map<string, Bound | null>();
  const viaId = (rule: Rule): number | undefined => {
    const via = rule.via ? subject(rule.via.of)?.refs[rule.via.slot] : undefined;
    return typeof via === "number" ? via : via && typeof via === "object" && "seq" in via ? (via as FactRef).seq : undefined;
  };
  const subject = (name: string): Bound | null => {
    if (bound.has(name)) return bound.get(name)!;
    if (name === "on") return items.find((item) => item.id === on) ?? null;
    const rule = ownValue(act.also, name.replace(/^also\./, "")) as Rule | undefined;
    if (!rule || rule.code !== undefined) return null;
    bound.set(name, null);
    const id = viaId(rule);
    const item = rule.one ? items.find((i) => i.type === rule.item) : rule.by !== undefined && typeof ownValue(fields, rule.by) === "number" ? items.find((i) => i.id === ownValue(fields, rule.by!)) : items.find((i) => i.id === id);
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
export function expectedOf<A extends ExpectedAct>(act: A, items: readonly Bound[], on: number | null, fields: Readonly<Record<string, FieldValue>>): Record<string, number> {
  const expected: Record<string, number> = {};
  if (act.step === "transition" && on !== null) {
    const at = items.find((item) => item.id === on)?.revision;
    if (at !== undefined) expected["on"] = at;
  }
  const { subject } = subjectsOf(act, items, on, fields);
  for (const [name, rule] of Object.entries(act.also)) {
    if ((rule as { code?: string }).code !== undefined) continue;
    const item = subject(name);
    if (item) put(expected, name, item.revision);
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
    return id !== undefined && rule.item !== undefined && subject(name) === null ? [{ type: rule.item, id }] : [];
  });
}
