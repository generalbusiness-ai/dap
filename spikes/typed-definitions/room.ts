/**
 * Spike: a room handle typed from the definition value, over the in-memory
 * judges. Each act kind is a method whose argument type is the act's own
 * fields. The handle also derives what the client had to compute by hand:
 * the `expected` revisions of the act's item and of each `also` item, from
 * the definition's `also` rules and the current fold.
 *
 * Nothing here judges. Every call signs an intent and submits it to the real
 * judge and fold; the answer is the judge's.
 */
import type { DeclaredDefinition, FieldType, FieldValue } from "@generalbusiness/dap-contract";
import type { AskedOf, Kind } from "@generalbusiness/dap-client";
import { prepareRules } from "@generalbusiness/dap-derive";
import { evaluateRules } from "@generalbusiness/dap-derive/rule";
import type { Actor, Context, Ledger } from "@generalbusiness/dap-derive/testing";

type Judged = ReturnType<Ledger["submit"]>;
export type Acts<D extends DeclaredDefinition> = { readonly [K in Kind<D>]: (asked: AskedOf<D, K>) => Promise<Judged> };

export interface Room<D extends DeclaredDefinition> {
  readonly definition: D;
  /** The acts one actor may sign, typed per kind. */
  as(who: Actor): Acts<D>;
  /** The one live item of a type that is not `many`, or the item with that id. */
  item(id: number): ReturnType<Ledger["item"]>;
  one(type: keyof D["items"] & string): ReturnType<Ledger["item"]>;
}

/** The revisions an intent must expect: its own item, and each `also` item the definition resolves from the fold. */
function expected<D extends DeclaredDefinition>(definition: D, s: Ledger, kind: string, on: number | null | undefined, fields: Record<string, FieldValue>): Record<string, number> {
  const act = definition.acts[kind]!;
  const out: Record<string, number> = {};
  if (typeof on === "number") out["on"] = s.item(on).revision;
  for (const [alias, rule] of Object.entries(act.also)) {
    if ("one" in rule) { const live = s.state.page(rule.item, Object.keys(definition.items[rule.item]!.states), null, 1).items[0]; if (live) out[alias] = live.revision; }
    else if ("by" in rule) { const id = fields[rule.by]; if (typeof id === "number") out[alias] = s.item(id).revision; }
  }
  return out;
}

export function room<const D extends DeclaredDefinition>(definition: D, s: Ledger, context: (s: Ledger) => Context = () => ({})): Room<D> {
  const as = (who: Actor): Acts<D> =>
    new Proxy({} as Acts<D>, {
      get: (_, kind: string) => async (asked: { on?: number | null; fields?: Record<string, FieldValue>; expected?: Record<string, number> }) => {
        const fields = asked.fields ?? {};
        const over = { ...(typeof asked.on === "number" ? { on: asked.on } : {}), expected: asked.expected ?? expected(definition, s, kind, asked.on, fields), fields };
        const signed = s.intent(who, kind, over), ctx = s.context(context(s));
        const prepared = await evaluateRules(prepareRules(s.state, s.definition, { act: signed, context: ctx }));
        return s.submit(signed, { ...context(s), prepared });
      },
    });
  return {
    definition, as,
    item: (id) => s.item(id),
    one: (type) => s.state.page(type, Object.keys(definition.items[type]!.states), null, 1).items[0]!,
  };
}

// ---------------------------------------------------------------- what an interface can derive

/** One input of a form for an act: its name, how to show it, and the limits the scope will check. */
export interface Input { name: string; kind: FieldType["type"]; required: boolean; max?: number; min?: number; options?: readonly string[] }

/** The form an interface shows for an act: every field of the act, from the definition alone. */
export function formFor(definition: DeclaredDefinition, kind: string): Input[] {
  return Object.entries(definition.acts[kind]!.fields).map(([name, f]) => ({
    name, kind: f.type, required: f.required,
    ...("max" in f ? { max: f.max } : {}), ...("min" in f ? { min: f.min } : {}), ...(f.type === "enum" ? { options: f.of } : {}),
  }));
}

/** The acts an interface offers on an item of a type, by what state the item is in: a transition whose first state guard admits that state. */
export function actsOn(definition: DeclaredDefinition, type: string, state: string): string[] {
  return Object.entries(definition.acts).filter(([, a]) => a.step === "transition" && a.on === type
    && a.guards.every((g) => !("state" in g) || g.of !== undefined || g.state.includes(state))).map(([kind]) => kind);
}
