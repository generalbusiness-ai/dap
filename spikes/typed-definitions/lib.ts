/**
 * Spike: a declared definition written as TypeScript.
 *
 * The functions here build the same data that `DeclaredDefinition` holds, and
 * nothing else: the kernel still pins and judges data. What they add is names
 * in the types. An item's states, parties, values and refs, and an act's
 * fields, are known to the compiler, so a guard that names a slot the item
 * does not have, or an effect that moves to a state the item does not
 * declare, is an editor error.
 *
 * Shallow on purpose: `const` type parameters and `keyof`, no template-literal
 * parsing. The literal types flow through to `declaredHandle`, so the typed
 * client gets each act's fields as a precise type.
 */
import type {
  ActType, AlsoRule, DeclaredDefinition, EffectForm, FieldType, FieldValue, Guard, ItemType, Notify, Operand, Range,
  ResultClauses, ScopeKind, SendForm, Source, Subject, TimedRule, Where,
} from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";

// ---------------------------------------------------------------- field types

export const text = <const M extends number>(max: M) => ({ type: "text", max }) as const;
export const int = <const A extends number, const B extends number>(min: A, max: B) => ({ type: "int", min, max }) as const;
export const bool = { type: "bool" } as const;
export const time = { type: "time" } as const;
export const member = { type: "member" } as const;
export const itemOf = <const T extends string>(of: T) => ({ type: "item", of }) as const;
export const scope = <const K extends ScopeKind>(kind: K) => ({ type: "scope", kind }) as const;
export const enumOf = <const V extends readonly string[]>(of: V) => ({ type: "enum", of }) as const;
export const list = <const E extends FieldType, const M extends number>(of: E, max: M) => ({ type: "list", of, max }) as const;
export const record = <const M extends Record<string, FieldType & { required: boolean }>>(of: M) => ({ type: "record", of }) as const;
export const fact = <const K extends readonly string[], const U extends string>(kind: K, under: U) => ({ type: "fact", kind, under }) as const;

/** An act's fields: each type, and whether the intent must carry it. */
export type Fields = Record<string, FieldType & { required: boolean; default?: FieldValue }>;
export const required = <const T extends FieldType>(type: T) => ({ ...type, required: true }) as const;
export const optional = <const T extends FieldType>(type: T) => ({ ...type, required: false }) as const;

// ---------------------------------------------------------------- slots and items

type PartySlot = ItemType["parties"][string];
type ValueSlot = ItemType["values"][string];
type RefSlot = ItemType["refs"][string];

export const party = {
  /** Set when the item opens and never changed. */
  fixed: { fixed: true, required: true, list: false, author: false } as const satisfies PartySlot,
  /** May be empty, and may change. */
  optional: { fixed: false, required: false, list: false, author: false } as const satisfies PartySlot,
};
export const value = {
  fixed: <const T extends FieldType>(of: T) => ({ fixed: true, required: true, of }) as const,
  optional: <const T extends FieldType>(of: T) => ({ fixed: false, required: false, of }) as const,
  /** Always set, may change; `start` is the value at opening. */
  required: <const T extends FieldType, const V extends FieldValue>(of: T, start?: V) =>
    ({ fixed: false, required: true, of, ...(start === undefined ? {} : { default: start }) }) as const,
};
export const ref = {
  fixed: <const T extends FieldType>(to: T) => ({ fixed: true, required: true, to }) as const,
  optional: <const T extends FieldType>(to: T) => ({ fixed: false, required: false, to }) as const,
};

export const live = { final: false } as const;
export const final = { final: true } as const;

/** An item type with its name. The name is what acts, ranges and `also` rules refer to. */
export interface ItemDef<N extends string = string, T extends ItemType = ItemType> { readonly name: N; readonly type: T }

export function item<
  const N extends string,
  const S extends Record<string, { final: boolean }>,
  const P extends Record<string, PartySlot> = {},
  const R extends Record<string, RefSlot> = {},
  const V extends Record<string, ValueSlot> = {},
>(name: N, spec: { many?: number; states: S; initial?: keyof S & string; parties?: P; refs?: R; values?: V }) {
  const initial = (spec.initial ?? Object.keys(spec.states)[0]!) as keyof S & string;
  return {
    name,
    type: { many: spec.many !== undefined, max: spec.many ?? 1, states: spec.states, initial, parties: (spec.parties ?? {}) as P, refs: (spec.refs ?? {}) as R, values: (spec.values ?? {}) as V },
  } as const;
}

export type States<I extends ItemDef> = keyof I["type"]["states"] & string;
export type Parties<I extends ItemDef> = keyof I["type"]["parties"] & string;
export type Values<I extends ItemDef> = keyof I["type"]["values"] & string;
export type Refs<I extends ItemDef> = keyof I["type"]["refs"] & string;
export type Slots<I extends ItemDef> = Parties<I> | Values<I> | Refs<I>;

// ---------------------------------------------------------------- operands

export const signer = { signer: true } as const;
export const constant = <const V extends FieldValue>(value: V) => ({ const: value }) as const;
export const element = <const E extends string>(name: E) => ({ element: name }) as const;
export const plusSeconds = (seconds: number) => ({ time: { plusSeconds: seconds } }) as const;
export const self = "self" as const;

/**
 * Forms about one subject: the act's own item, an `also` item, or the item a
 * range scans. Every name is checked against that item's declaration.
 */
export interface Of<I extends ItemDef> {
  readonly item: I;
  slot(name: Slots<I>): Operand;
  state(states: readonly States<I>[]): Guard;
  signer(parties: readonly Parties<I>[]): Guard;
  to(state: States<I>): EffectForm;
  party(slot: Parties<I>, from: Source | readonly Operand[]): EffectForm;
  value(slot: Values<I>, from: Source | { time: { plusSeconds: number } }): EffectForm;
  ref(slot: Refs<I>, from: "self" | Source): EffectForm;
}

function of<I extends ItemDef>(item: I, subject?: Subject): Of<I> {
  const at = subject === undefined ? {} : { of: subject };
  return {
    item,
    slot: (name) => ({ slot: name, ...at }),
    state: (states) => ({ ...at, state: states }),
    signer: (parties) => ({ ...at, signer: parties }),
    to: (state) => ({ ...at, state }),
    party: (slot, from) => ({ ...at, party: { slot, from } }),
    value: (slot, from) => ({ ...at, value: { slot, from } }),
    ref: (slot, from) => ({ ...at, ref: { slot, from } }),
  };
}

// ---------------------------------------------------------------- guards

export const equals = (a: Operand, b: Operand) => ({ equals: { a, b } }) as const;
export const differs = (a: Operand, b: Operand) => ({ differs: { a, b } }) as const;
export const rule = (name: string): Guard => ({ rule: name });

/** The items of a type in the given states (every state when none is given); `where` reads the scanned item's slots. */
export function range<I extends ItemDef>(item: I, states?: readonly States<I>[], more: { where?: (it: Of<I>) => readonly Where[]; except?: readonly Subject[] } = {}): Range {
  return {
    type: item.name,
    states: states ?? (Object.keys(item.type.states) as States<I>[]),
    ...(more.where ? { where: more.where(of(item)) } : {}),
    ...(more.except ? { except: more.except } : {}),
  };
}
export const none = (items: Range): Guard => ({ none: items });
export const some = (items: Range): Guard => ({ some: items });
export const count = (items: Range, bounds: { min?: number | Operand; max?: number | Operand }): Guard => ({ count: { ...items, ...bounds } });
export const sameSet = (set: { list: Operand; as: string; key: Operand; items: Range; match?: readonly Where[]; ordered?: boolean }): Guard => ({ sameSet: set });

/** Apply an effect, a send or a notice only when every guard of `if` holds, or when not every guard of `unless` holds. */
export const when = <F extends object>(form: F, condition: { if?: readonly Guard[]; unless?: readonly Guard[] }) => ({ ...form, ...condition });

// ---------------------------------------------------------------- sends

export const tell = (send: { to: Operand; message: string; fields: Record<string, "self" | Operand>; if?: readonly Guard[]; result?: ResultClauses }): SendForm =>
  ({ tell: { to: send.to as { slot: string; of?: Subject }, message: send.message, ...(send.if ? { if: send.if } : {}), fields: send.fields, result: send.result ?? {} } });

// ---------------------------------------------------------------- acts

export const one = <I extends ItemDef>(item: I) => ({ item, rule: { item: item.name, one: true } as const });
export const by = <I extends ItemDef>(item: I, field: string) => ({ item, rule: { item: item.name, by: field } as const });
type AlsoSpec = Record<string, { item: ItemDef; rule: AlsoRule }>;

/** What the body of an act may name: its fields, its own item, and each `also` item, all typed. */
export interface Ctx<I extends ItemDef, F extends Fields, AL extends AlsoSpec> {
  readonly f: { readonly [K in keyof F & string]: { field: K } };
  readonly on: Of<I>;
  readonly also: { readonly [K in keyof AL & string]: Of<AL[K]["item"]> };
}
export interface Body { guards?: readonly Guard[]; effects?: readonly EffectForm[]; sends?: readonly SendForm[]; attention?: readonly Notify[] }

function act<S extends ActType["step"], I extends ItemDef, const F extends Fields, const AL extends AlsoSpec>(
  step: S, on: I, grant: string, spec: { fields?: F; also?: AL }, body?: (ctx: Ctx<I, F, AL>) => Body,
) {
  const fields = (spec.fields ?? {}) as F;
  const also = (spec.also ?? {}) as AL;
  const ctx = {
    f: Object.fromEntries(Object.keys(fields).map((k) => [k, { field: k }])),
    on: of(on),
    also: Object.fromEntries(Object.entries(also).map(([k, a]) => [k, of(a.item, `also.${k}`)])),
  } as unknown as Ctx<I, F, AL>;
  const b = body?.(ctx) ?? {};
  return {
    step, on: on.name, grant,
    also: Object.fromEntries(Object.entries(also).map(([k, a]) => [k, a.rule])) as { [K in keyof AL]: AL[K]["rule"] },
    fields, guards: b.guards ?? [], effects: b.effects ?? [], sends: b.sends ?? [], attention: b.attention ?? [],
  };
}
type ActSpec<F extends Fields, AL extends AlsoSpec> = { fields?: F; also?: AL };
export const open = <I extends ItemDef, const F extends Fields = {}, const AL extends AlsoSpec = {}>(on: I, grant: string, spec: ActSpec<F, AL> = {}, body?: (ctx: Ctx<I, F, AL>) => Body) => act("open", on, grant, spec, body);
export const transition = <I extends ItemDef, const F extends Fields = {}, const AL extends AlsoSpec = {}>(on: I, grant: string, spec: ActSpec<F, AL> = {}, body?: (ctx: Ctx<I, F, AL>) => Body) => act("transition", on, grant, spec, body);
export const comment = <I extends ItemDef, const F extends Fields = {}, const AL extends AlsoSpec = {}>(on: I, grant: string, spec: ActSpec<F, AL> = {}, body?: (ctx: Ctx<I, F, AL>) => Body) => act("comment", on, grant, spec, body);

// ---------------------------------------------------------------- timed rules

export function timed<I extends ItemDef>(on: I, spec: { states: readonly States<I>[]; deadline: Values<I>; effects: (it: Of<I>) => readonly EffectForm[]; attention?: readonly Notify[] }): TimedRule {
  return { on: on.name, states: spec.states, deadline: spec.deadline, effects: spec.effects(of(on)), attention: spec.attention ?? [] };
}

// ---------------------------------------------------------------- the definition

type ItemsOf<L extends readonly ItemDef[]> = { [I in L[number] as I["name"]]: I["type"] };

export function define<const N extends string, const L extends readonly ItemDef[], const A extends Record<string, ActType>, const G extends keyof A & string>(spec: {
  name: N; genesis: G; items: L; acts: A;
  receives?: DeclaredDefinition["receives"]; timed?: Record<string, TimedRule>; rules?: Record<string, string>; capabilities?: DeclaredDefinition["capabilities"];
}) {
  return {
    format: "artroom-definition-1", name: spec.name, profile: { name: "restricted", version: 1 }, capabilities: spec.capabilities ?? [], genesis: spec.genesis,
    items: Object.fromEntries(spec.items.map((i) => [i.name, i.type])) as ItemsOf<L>,
    acts: spec.acts, receives: spec.receives ?? {}, timed: spec.timed ?? {}, rules: spec.rules ?? {},
  } as const;
}

// ---------------------------------------------------------------- compile-time findings

export interface Finding { act: string; rule: string; names: string; message: string }

/**
 * The checks a builder can make that the validator does not: a rule
 * expression's direct references, `fields.<name>` and `.values.<name>`, name
 * a field of the act that uses the rule or a value slot of an item the act
 * names. A reference through a bound variable is not followed.
 */
export function findings(definition: DeclaredDefinition): Finding[] {
  const found: Finding[] = [];
  for (const [kind, a] of Object.entries(definition.acts)) {
    const items = [a.on, ...Object.values(a.also).map((r) => r.item)].filter((n): n is string => n !== null);
    const values = new Set(items.flatMap((n) => Object.keys(definition.items[n]?.values ?? {})));
    for (const g of a.guards) {
      if (!("rule" in g)) continue;
      const expression = definition.rules[g.rule];
      if (expression === undefined) { found.push({ act: kind, rule: g.rule, names: "", message: "names no rule" }); continue; }
      const fields = [...expression.matchAll(/\bfields\.([A-Za-z_][\w]*)/g)].map((m) => m[1]!).filter((n) => !Object.hasOwn(a.fields, n));
      const slots = [...expression.matchAll(/\.values\.([A-Za-z_][\w]*)/g)].map((m) => m[1]!).filter((n) => !values.has(n));
      if (fields.length) found.push({ act: kind, rule: g.rule, names: fields.join(", "), message: "reads a field the act does not declare" });
      if (slots.length) found.push({ act: kind, rule: g.rule, names: slots.join(", "), message: "reads a value slot none of the act's items declares" });
    }
  }
  return found;
}

/** The canonical digest the scope pins, and the builder's findings. The validator's own checks are separate and still run. */
export function compile<D extends DeclaredDefinition>(definition: D): { definition: D; digest: string; findings: Finding[] } {
  return { definition, digest: definitionDigest(definition), findings: findings(definition) };
}
