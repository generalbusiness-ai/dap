/**
 * Spike 2: the surface. One vocabulary for the whole declared contract,
 * built from six patterns:
 *
 *   1. Subjects. Every read, predicate, verb and notice is a method of a
 *      subject whose names the compiler knows: `on`, `also.<name>`, the item
 *      a range scans, a field `f.<name>`, a presented fact `p.<name>`, and in
 *      a handler `sender` and `source`.
 *   2. Quantifiers over one range form: none, some, count, sameSet; and over
 *      one list form: each, has, distinct.
 *   3. Conditions that wrap any form the same way: when, anyOf, ifPresent,
 *      require.
 *   4. Messages with one shape: tell, create, relate, index.
 *   5. Handlers written like acts: receive mirrors open and transition.
 *   6. One value flows down: the definition's literal types feed the client,
 *      the package and the story (package.ts, story.ts).
 *
 * Everything compiles to the data the scope pins, and nothing else. Shallow
 * types only: `const` type parameters and `keyof`.
 */
import type {
  ActType, AlsoRule, AuthorSource, CapabilityArg, CapabilityName, CapacityVersion, DeclaredDefinition, Digest, DurabilityLevel, EffectForm,
  EntryPart, FieldType, FieldValue, Guard, ItemType, Notify, Operand, Part, PlatformDefinition, Range, ReceiveType, ResultClauses, ScopeKind,
  SendForm, SendSource, Settles, Source, Subject, TimedRule, Where,
} from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { validateDefinition } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";

const ACT_NAME: unique symbol = Symbol("act name");
const INLINE_RULE: unique symbol = Symbol("inline rule");
const DECLARATIONS: unique symbol = Symbol("definition declarations");
declare const GRANT: unique symbol;
declare const REASON: unique symbol;
export type GrantRef<N extends string = string> = N & { readonly [GRANT]: true };
export type ReasonRef<N extends string = string> = N & { readonly [REASON]: true };
type Vocabulary<T extends string> = Readonly<Record<string, T>>;
type MissingGrants<G extends Vocabulary<GrantRef>, R extends Record<string, readonly GrantRef[]>> = Exclude<G[keyof G], R[keyof R][number]>;
type GrantNames<T> = T extends GrantRef<infer N> ? N : never;
type RoleCoverage<G extends Vocabulary<GrantRef>, R extends Record<string, readonly GrantRef[]>> =
  [MissingGrants<G, R>] extends [never] ? unknown : { readonly missingGrants: GrantNames<MissingGrants<G, R>> };

/** Declare the grants that this definition's acts may require. */
export const grants = <const G extends Record<string, string>>(names: G): { readonly [K in keyof G]: GrantRef<G[K]> } => ({ ...names }) as never;
/** Declare the refusal names that this definition's guards may report. */
export const reasons = <const R extends Record<string, string>>(names: R): { readonly [K in keyof R]: ReasonRef<R[K]> } => ({ ...names }) as never;
/** Every declared grant must belong to at least one role. The returned role data is unchanged. */
export function roles<const G extends Vocabulary<GrantRef>, const R extends Record<string, readonly NoInfer<G[keyof G]>[]>>(
  declared: G, assigned: R & RoleCoverage<NoInfer<G>, NoInfer<R>>,
): R {
  const held = new Set<string>(Object.values(assigned).flat());
  for (const grant of Object.values(declared)) if (!held.has(grant)) throw new Error(`no role holds ${grant}`);
  return assigned;
}

// ================================================================ field types

export const text = <const M extends number>(max: M) => ({ type: "text", max }) as const;
/** Text kept beside the intent and named in it by digest. */
export const detached = <const M extends number>(max: M) => ({ type: "text", max, detached: true }) as const;
export const int = <const A extends number, const B extends number>(min: A, max: B) => ({ type: "int", min, max }) as const;
export const bool = { type: "bool" } as const;
export const time = { type: "time" } as const;
export const member = { type: "member" } as const;
export const digest = { type: "digest" } as const;
export const commit = { type: "commit" } as const;
export const tree = { type: "tree" } as const;
export function itemOf<const I extends ItemDef | string>(item: I): { readonly type: "item"; readonly of: I extends ItemDef ? I["name"] : I } {
  return { type: "item", of: typeof item === "string" ? item : item.name } as never;
}
export const scope = <const K extends ScopeKind>(kind: K) => ({ type: "scope", kind }) as const;
export const enumOf = <const V extends readonly string[]>(...of: V) => ({ type: "enum", of }) as const;
export const list = <const E extends FieldType, const M extends number>(of: E, max: M) => ({ type: "list", of, max }) as const;
export const record = <const M extends Record<string, FieldType & { required: boolean }>>(of: M) => ({ type: "record", of }) as const;
/** An entry of one of `kinds`, under a definition named `under`. */
export type NamedAct<U extends string = string, K extends string = string> = ActType & { readonly [ACT_NAME]: { readonly under: U; readonly kind: K } };
export function fact<const A extends NamedAct>(act: A): { readonly type: "fact"; readonly kind: readonly [A[typeof ACT_NAME]["kind"]]; readonly under: A[typeof ACT_NAME]["under"] };
export function fact<const U extends string, const K extends readonly string[]>(under: U, ...kinds: K): { readonly type: "fact"; readonly kind: K; readonly under: U };
export function fact(under: string | NamedAct, ...kinds: readonly string[]) {
  if (typeof under === "string") return { type: "fact", kind: kinds, under } as const;
  const name = under[ACT_NAME];
  if (!name) throw new Error("fact(act) needs an act returned by define; use fact(under, kind) for a forward reference");
  return { type: "fact", kind: [name.kind], under: name.under } as const;
}

/** An act's or a handler's fields: each type, whether the intent must carry it, and a default. */
export type Fields = Record<string, FieldType & { required: boolean; default?: FieldValue }>;
/** A phantom: the declared type of the field an operand reads, for the type checker only. Nothing is at this key at run time. */
declare const TYPE: unique symbol;
export type Typed<T> = { readonly [TYPE]?: T };
export const required = <const T extends FieldType>(type: T) => ({ ...type, required: true }) as const;
export const optional = <const T extends FieldType>(type: T) => ({ ...type, required: false }) as const;
export const withDefault = <const F extends FieldType & { required: boolean }, const V extends FieldValue>(field: F, start: V) => ({ ...field, default: start }) as const;

// ================================================================ slots and items

type PartySlot = ItemType["parties"][string];
type ValueSlot = ItemType["values"][string];
type RefSlot = ItemType["refs"][string];

/**
 * Four ways a slot may change, from two flags. `fixed`: set when the item
 * opens, never changed. `once`: set at most once, maybe never. `required`:
 * always set, may change. `optional`: may be empty, may change.
 */
const MODE = {
  fixed: { fixed: true, required: true }, once: { fixed: true, required: false },
  required: { fixed: false, required: true }, optional: { fixed: false, required: false },
} as const;
type Mode = keyof typeof MODE;
const single = { list: false, author: false } as const;

export const party = {
  fixed: { ...MODE.fixed, ...single } as const satisfies PartySlot,
  once: { ...MODE.once, ...single } as const satisfies PartySlot,
  required: { ...MODE.required, ...single } as const satisfies PartySlot,
  optional: { ...MODE.optional, ...single } as const satisfies PartySlot,
  /** A list of at most `max` members. */
  list: <const M extends number, const K extends Mode = "optional">(max: M, mode?: K) => ({ ...MODE[(mode ?? "optional") as K], list: true, max, author: false }) as const,
};
export const value = {
  fixed: <const T extends FieldType>(of: T) => ({ ...MODE.fixed, of }) as const,
  once: <const T extends FieldType>(of: T) => ({ ...MODE.once, of }) as const,
  required: <const T extends FieldType, const V extends FieldValue>(of: T, start?: V) => ({ ...MODE.required, of, ...(start === undefined ? {} : { default: start }) }) as const,
  optional: <const T extends FieldType>(of: T) => ({ ...MODE.optional, of }) as const,
};
export const ref = {
  fixed: <const T extends FieldType>(to: T) => ({ ...MODE.fixed, to }) as const,
  once: <const T extends FieldType>(to: T) => ({ ...MODE.once, to }) as const,
  required: <const T extends FieldType>(to: T) => ({ ...MODE.required, to }) as const,
  optional: <const T extends FieldType>(to: T) => ({ ...MODE.optional, to }) as const,
};
/** The members of this party slot are authors of what the item records (section 6.7). */
export const author = <const S extends PartySlot>(slot: S) => ({ ...slot, author: true }) as const;
/** A slot that only a capability's code may write. */
export const owned = <const S extends object, const C extends CapabilityName>(slot: S, capability: C) => ({ ...slot, capability }) as const;

export const live = { final: false } as const;
export const final = { final: true } as const;

export interface ItemDef<N extends string = string, T extends ItemType = ItemType> { readonly name: N; readonly type: T }

export function item<
  const N extends string, const S extends Record<string, { final: boolean }>,
  const P extends Record<string, PartySlot> = {}, const R extends Record<string, RefSlot> = {}, const V extends Record<string, ValueSlot> = {},
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

// ================================================================ operands

export const signer = { signer: true } as const;
/** A handler's envelope: the scope that sent the message. */
export const sender = { sender: true } as const;
export const theScope = { scope: true } as const;
export const theIntent = { intent: true } as const;
export const nothing = { none: true } as const;
export const constant = <const V extends FieldValue>(value: V) => ({ const: value }) as const;
/** The element a list form binds, or a member of it: `el("s", "report")` is `s.report`. */
export const el = (as: string, member?: string) => ({ element: member === undefined ? as : `${as}.${member}` }) as const;
/** A part read inside the entry an operand names. */
export const part = <const O extends Operand>(of: O, p: Part) => ({ ...of, part: p }) as const;
/** A handler's verified source entry, by a part of it. */
export const source = (p: EntryPart) => ({ source: p }) as const;
/** A `relate` handler: the update being applied. */
export const update = (what: "state" | "item" | "revision") => ({ update: what }) as const;
/** A result clause: the name in the result's reason. */
export const resultReason = { result: "reason" } as const;
/** The commit time plus `seconds`; `now` is the commit time. */
export const plusSeconds = (seconds: number) => ({ time: { plusSeconds: seconds } }) as const;
export const now = plusSeconds(0);
/** The entry being written, as a reference's source. */
export const self = "self" as const;

/** Primitive literals are constants; null reads the absence of a value. Record literals use constant() to avoid operand-shaped ambiguity. */
export type Readable = Operand | string | number | boolean | null;
const operand = (input: Readable): Operand => input === null ? nothing : typeof input === "object" ? input : constant(input);

// ================================================================ pattern 1: subjects

/**
 * One subject: the act's item, an `also` item, the item a range scans, or
 * the item a handler opens. Reads, predicates, verbs and notices are its
 * methods, and every slot and state name is checked against its declaration.
 */
/**
 * @pattern 1 Subjects
 * Subjects expose only their declared slots and states. take copies same-name fields in the order given.
 * @example effects: [...on.take(f, "label", "description")]
 */
export interface Of<I extends ItemDef> {
  readonly item: I;
  /** The subject's name in the data: `on`, `also.<name>`; none for the item a range scans. */
  readonly subject: Subject | undefined;
  /** This item itself, as a reference. */
  readonly id: Operand;
  slot(name: Slots<I>): Operand;
  // predicates
  in(...states: readonly States<I>[]): Guard;
  signer(...parties: readonly Parties<I>[]): Guard;
  notSigner(...parties: readonly Parties<I>[]): Guard;
  set(slot: Slots<I>): Guard;
  unset(slot: Slots<I>): Guard;
  before(slot: Values<I>): Guard;
  after(slot: Values<I>): Guard;
  /** `equals` and `differs` read this subject: an operand with no subject of its own is one of its slots. */
  equals(a: Readable, b: Readable): Guard;
  differs(a: Readable, b: Readable): Guard;
  take<const F extends Record<string, Operand>>(fields: F, ...names: readonly (Slots<I> & keyof F & string)[]): readonly EffectForm[];
  /** Every item a list slot (or an act field of that name) names is in one of `states`. */
  every(list: string, ...states: readonly string[]): Guard;
  // verbs
  to(state: States<I>): EffectForm;
  party(slot: Parties<I>, from: Source | readonly Operand[]): EffectForm;
  add(slot: Parties<I>, who: Source): EffectForm;
  remove(slot: Parties<I>, who: Source): EffectForm;
  value(slot: Values<I>, from: Source | { time: { plusSeconds: number } }): EffectForm;
  ref(slot: Refs<I>, from: "self" | Source): EffectForm;
  /** Set this subject's party list `slot` to the authors of `work` (another subject of the act), plus `more` sources (section 6.7). */
  attribute(slot: Parties<I>, work: Of<ItemDef>, more?: readonly AuthorSource[]): EffectForm;
  redact(slot: Values<I>): EffectForm;
  hold(action: "open" | "renew" | "end", extent?: Operand): EffectForm;
  capability(name: "hold" | "git-read" | "device-command", action: string, args: Record<string, Operand>): EffectForm;
  // notices and settlement
  notify(slot: Parties<I>, when: "before" | "after", reason: string, condition?: { if: readonly Guard[] }): Notify;
  settles(...states: readonly States<I>[]): Settles;
  settlesBy(sets: Values<I>, ...states: readonly States<I>[]): Settles;
  /** The author source "the party list `slot` of this subject", for `attribute`. */
  authors(slot: Parties<I>): AuthorSource;
}

function of<I extends ItemDef>(item: I, subject?: Subject): Of<I> {
  const at = subject === undefined ? {} : { of: subject };
  const g = (form: object): Guard => ({ ...at, ...form }) as Guard;
  const e = (form: object): EffectForm => ({ ...at, ...form }) as EffectForm;
  const named = (): Subject => subject ?? "on";
  return {
    item, subject,
    id: { item: named() },
    slot: (name) => ({ slot: name, ...at }),
    in: (...states) => g({ state: states }),
    signer: (...parties) => g({ signer: parties }),
    notSigner: (...parties) => g({ notIn: parties }),
    set: (slot) => g({ set: slot }),
    unset: (slot) => g({ unset: slot }),
    before: (slot) => g({ before: { slot } }),
    after: (slot) => g({ after: { slot } }),
    equals: (a, b) => g({ equals: { a: operand(a), b: operand(b) } }),
    differs: (a, b) => g({ differs: { a: operand(a), b: operand(b) } }),
    take: (fields, ...names) => names.map((slot) => {
      const from = fields[slot];
      if (!from) throw new Error(`${item.name}.take: no field ${slot}`);
      if (Object.hasOwn(item.type.parties, slot)) return e({ party: { slot, from } });
      if (Object.hasOwn(item.type.values, slot)) return e({ value: { slot, from } });
      if (Object.hasOwn(item.type.refs, slot)) return e({ ref: { slot, from } });
      throw new Error(`${item.name}.take: no slot ${slot}`);
    }),
    every: (list, ...states) => g({ every: { list, states } }),
    to: (state) => e({ state }),
    party: (slot, from) => e({ party: { slot, from } }),
    add: (slot, who) => e({ party: { slot, from: who, list: "add" } }),
    remove: (slot, who) => e({ party: { slot, from: who, list: "remove" } }),
    value: (slot, from) => e({ value: { slot, from } }),
    ref: (slot, from) => e({ ref: { slot, from } }),
    attribute: (slot, work, more) => e({ attribute: { slot, of: work.subject ?? "on", ...(more ? { with: more } : {}) } }),
    redact: (slot) => e({ redact: { slot } }),
    hold: (action, extent) => e({ hold: { do: action, ...(extent ? { extent } : {}) } }),
    capability: (name, action, with_) => e({ capability: { name, do: action, with: with_ } }),
    notify: (slot, when, reason, condition) => ({ notify: { slot, of: named(), when, reason, ...(condition ?? {}) } }),
    settles: (...states) => ({ of: named(), in: states }),
    settlesBy: (sets, ...states) => ({ of: named(), sets, in: states }),
    authors: (slot) => ({ subject: named(), slot }),
  };
}
/** A typed subject for a helper outside an act body. Act bodies already receive on and also. */
export const subject = of;

// ================================================================ pattern 2: quantifiers

/** The items of a type in `states` (every state when none is given); `where` reads the scanned item's slots; `except` leaves out the act's subjects. */
export function range<I extends ItemDef>(item: I, states?: readonly States<I>[], more: { where?: (it: Of<I>) => readonly Where[]; except?: readonly Subject[] } = {}): Range {
  return {
    type: item.name, states: states ?? (Object.keys(item.type.states) as States<I>[]),
    ...(more.where ? { where: more.where(of(item)) } : {}), ...(more.except ? { except: more.except } : {}),
  };
}
/**
 * @pattern 2 Quantifiers
 * none scans one item type; its callback reads that scanned item's slots. Use range for except or count bounds.
 * @example none(hold, ["held"], h => [equals(h.slot("under"), also.commitment.id)])
 */
export function none(items: Range): Guard;
export function none<I extends ItemDef>(item: I, states?: readonly States<I>[], where?: (it: Of<I>) => readonly Where[]): Guard;
export function none(item: ItemDef | Range, states?: readonly string[], where?: (it: Of<ItemDef>) => readonly Where[]): Guard {
  return { none: "name" in item ? range(item, states, where ? { where } : {}) : item };
}
export const some = (items: Range): Guard => ({ some: items });
export const count = (items: Range, bounds: { min?: number | Operand; max?: number | Operand }): Guard => ({ count: { ...items, ...bounds } });
/** The list's elements, keyed, are the same set as the range's items; `match` pairs an element with its item. */
export function sameSet<I extends ItemDef>(list: Operand, as: string, key: Operand, item: I, states: readonly States<I>[], more: { match?: (it: Of<I>) => readonly Where[]; ordered?: boolean } = {}): Guard {
  return { sameSet: { list, as, key, items: range(item, states), ...(more.match ? { match: more.match(of(item)) } : {}), ...(more.ordered !== undefined ? { ordered: more.ordered } : {}) } };
}
/** Every element of a list (those `where` selects) passes `guards`. */

/** Some element of a list that `where` selects passes `guards`. */
/**
 * The element a list form binds, by the name the form gives it. `s.self` is
 * the element; `s.report` is its member `report`. The members are not typed
 * from the list's field type here; the package can do that from `f`.
 */
export type Elem = { readonly self: Operand } & { readonly [member: string]: Operand };
/**
 * The element of a typed list: when the list is an act field of records, its
 * members are the record's; when it is a list of scalars, only `self`; when
 * it is a part of a fetched fact, whose record is declared elsewhere, any
 * member name is allowed (and may be `undefined` to the type checker).
 */
export type ElemOf<L> = L extends Typed<infer T>
  ? T extends { of: { type: "record"; of: infer R } } ? { readonly self: Operand } & { readonly [M in keyof R & string]: Operand }
  : T extends { type: "list" } ? { readonly self: Operand } : Elem
  : Elem;
/** A list whose elements are records with these members, declared by the author because the record is defined elsewhere (a part of a fetched fact). */
export const elements = <O extends Operand, const M extends readonly string[]>(list: O, ..._members: M): O & Typed<{ type: "list"; of: { type: "record"; of: { [K in M[number]]: true } } }> => list as never;
const elem = (as: string): Elem => new Proxy({} as Elem, { get: (_, member) => typeof member === "string" ? (member === "self" ? { element: as } : { element: `${as}.${member}` }) : undefined });
/** Every element of `list` (those `where` holds, when given) passes `guards`. */
export const each = <L extends Operand>(list: L, as: string, body: (it: ElemOf<L>) => { where?: readonly Where[]; guards: readonly Guard[] }): Guard => ({ each: { list, as, ...body(elem(as) as ElemOf<L>) } });
/** Some element of `list` satisfies `where` (and `guards`, when given). */
export const has = <L extends Operand>(list: L, as: string, body: (it: ElemOf<L>) => { where: readonly Where[]; guards?: readonly Guard[] }): Guard => ({ has: { list, as, ...body(elem(as) as ElemOf<L>) } });
/** No two elements of `list` share `key`. */
export const distinct = <L extends Operand>(list: L, as: string, key: (it: ElemOf<L>) => Operand): Guard => ({ distinct: { list, as, key: key(elem(as) as ElemOf<L>) } });
/** A send to each item of a range: its item is `eachItem`, its slots `eachSlot`. */
export const eachItem = { item: "each" } as const;
export const eachSlot = (slot: string): Operand => ({ slot, of: "each" });
/** What a message collects from each item of a range. */
export const collect = (items: Range, fields: Record<string, string>): SendSource => ({ collect: { items, fields } });
/** The author source "the party list `slot` of each item of a range". */
export const authorsOf = (items: Range, slot: string): AuthorSource => ({ items, slot });
/** The author source "a list read from each fact of a list". */
export const authorsIn = <L extends Operand>(each: L, as: string, list: (it: ElemOf<L>) => Operand): AuthorSource => ({ each, as, list: list(elem(as) as ElemOf<L>) });
/** The author source "a list read from one fact". */
export const authorsFrom = (list: Operand): AuthorSource => ({ list });

// ================================================================ plain guards

export const equals = (a: Readable, b: Readable) => ({ equals: { a: operand(a), b: operand(b) } }) as const;
export const differs = (a: Readable, b: Readable) => ({ differs: { a: operand(a), b: operand(b) } }) as const;
/** An inline expression is hoisted by define. Repeated names must have the same expression. */
export function rule(name: string, expression?: string): Guard {
  const guard: Guard = { rule: name };
  if (expression !== undefined) Object.defineProperty(guard, INLINE_RULE, { value: expression, enumerable: false });
  return guard;
}
function keepInline<F extends object>(from: object, into: F): F {
  if (INLINE_RULE in from) Object.defineProperty(into, INLINE_RULE, { value: from[INLINE_RULE], enumerable: false });
  return into;
}
/** The fact an operand names (a field, a presented fact or a bound element) is fetched and verified. */
export const isFact = (o: Operand): Guard => ({ fact: o as { field: string } | { presented: string } | { element: string } });
/** A capability's code runs `action` for the act, with no subject. */
export const invoke = (name: "hold" | "git-read" | "device-command", action: string, args: Record<string, Operand>): EffectForm => ({ capability: { name, do: action, with: args } });
/** The capability's rule `guard` holds for `with`. */
export const permit = (name: "hold" | "git-read" | "device-command", guard: string, with_: Record<string, CapabilityArg>): Guard => ({ capability: { name, guard, with: with_ } });
/** A capability argument: `value` read from each element of a list. */
export const eachOf = <L extends Operand>(each: L, as: string, value: (it: ElemOf<L>) => Operand): CapabilityArg => ({ each, as, value: value(elem(as) as ElemOf<L>) });
/** A capability argument: a slot of each item of a range. */
export const slotsOf = (items: Range, slot: string): CapabilityArg => ({ items, slot });

// ================================================================ pattern 3: conditions

/**
 * @pattern 3 Conditions
 * Conditions state when a form applies. require names the refusal when its guard fails.
 * @example require(on.in("open"), why.notOpen)
 */
/** Apply a form only when every guard of `if` holds, or when not every guard of `unless` holds. */
export const when = <F extends object>(form: F, condition: { if?: readonly Guard[]; unless?: readonly Guard[] }) => keepInline(form, { ...form, ...condition });
/** At least one alternative holds, every guard of it. */
export const anyOf = (...alternatives: readonly (readonly Guard[])[]): Guard => ({ anyOf: alternatives });
/** The guard passes when the field or fact it names is absent. */
export const ifPresent = (guard: Guard): Guard => keepInline(guard, { ...guard, ifPresent: true });
/** Name the refusal when the guard fails; the judgment is unchanged. */
export const require = (condition: Guard, reason: ReasonRef): Guard => keepInline(condition, { ...condition, reason });

// ================================================================ pattern 4: messages

type Clauses = ResultClauses;
/**
 * @pattern 4 Messages
 * tell, create, relate and index return the declared message data. Result clauses describe later answers.
 * @example tell({ to: also.library.slot("destination"), message: "publish-file", fields: { path: f.page, content: f.content } })
 */
export const tell = (send: { to: Operand; message: string; fields: Record<string, SendSource>; if?: readonly Guard[]; result?: Clauses }): SendForm =>
  ({ tell: { to: send.to as { slot: string; of?: Subject }, message: send.message, ...(send.if ? { if: send.if } : {}), fields: send.fields, result: send.result ?? {} } });
export const create = (send: { kind: ScopeKind; definition: Digest | PlatformDefinition | "self"; fields: Record<string, SendSource>; result?: Clauses }): SendForm =>
  ({ create: { kind: send.kind, definition: send.definition, fields: send.fields, result: send.result ?? {} } });
export const relate = (send: { each?: Range; to: SendSource; name: string; item: SendSource; state: string; if?: readonly Guard[]; detail: Record<string, SendSource>; result?: Clauses }): SendForm =>
  ({ relate: { ...(send.each ? { each: send.each } : {}), to: send.to, name: send.name, item: send.item, state: send.state, ...(send.if ? { if: send.if } : {}), detail: send.detail, result: send.result ?? {} } });
export const index = (fields: Record<string, SendSource>): SendForm => ({ index: { fields } });

// ================================================================ acts, and pattern 5: handlers written like acts

export const one = <I extends ItemDef>(item: I) => ({ item, rule: { item: item.name, one: true } as const });
/** Bind through this field, or a same-name required item field when none is declared explicitly. */
export function by<I extends ItemDef>(item: I): { item: I; rule: { item: I["name"]; by: I["name"] } };
export function by<I extends ItemDef, const F extends string>(item: I, field: F): { item: I; rule: { item: I["name"]; by: F } };
export function by<I extends ItemDef>(item: I, field = item.name) { return { item, rule: { item: item.name, by: field } }; }
/** The item that a reference slot of another subject names. */
export function via<I extends ItemDef, S extends ItemDef>(item: I, source: Of<S>, slot: Refs<S>): { item: I; rule: { item: I["name"]; via: { slot: Refs<S>; of: Subject } } };
export function via<I extends ItemDef>(item: I, source: Subject, slot: string): { item: I; rule: { item: I["name"]; via: { slot: string; of: Subject } } };
export function via<I extends ItemDef>(item: I, source: Subject | Of<ItemDef>, slot: string) {
  if (typeof source !== "string" && !Object.hasOwn(source.item.type.refs, slot)) throw new Error(`${source.item.name} has no reference slot ${slot}`);
  return { item, rule: { item: item.name, via: { slot, of: typeof source === "string" ? source : source.subject ?? "on" } } };
}
export type AlsoSpec = Record<string, { item: ItemDef; rule: AlsoRule }>;
type SiblingRefs<AL extends AlsoSpec> = { readonly [K in keyof AL & string]: Of<AL[K]["item"]> };
/** Bind the seed subjects first, then use their typed references to bind dependent siblings. */
export function siblings<const S extends AlsoSpec, const A extends AlsoSpec>(seed: S, add: (subjects: SiblingRefs<S>) => A): S & A {
  const subjects = Object.fromEntries(Object.entries(seed).map(([name, binding]) => [name, of(binding.item, `also.${name}`)])) as SiblingRefs<S>;
  const additions = add(subjects);
  for (const name of Object.keys(additions)) if (Object.hasOwn(seed, name)) throw new Error(`sibling ${name} is already bound`);
  return { ...seed, ...additions };
}
type BoundFields<AL extends AlsoSpec> = {
  [K in keyof AL as AL[K]["rule"] extends { by: infer F extends string } ? F : never]: {
    readonly type: "item"; readonly of: AL[K]["item"]["name"]; readonly required: true;
  }
};
type EffectiveFields<F extends Fields, AL extends AlsoSpec> = Omit<BoundFields<AL>, keyof F> & F;
type AlsoInput<I extends ItemDef | null, AL extends AlsoSpec> = AL | ((on: OnOf<I>) => AL);
type Presents = Record<string, { kind: readonly string[]; under: string; required: boolean }>;
/** A fact presented beside the intent. */
export const presented = <const U extends string, const K extends readonly string[]>(under: U, kinds: K, req = true) => ({ kind: kinds, under, required: req }) as const;

type OnOf<I extends ItemDef | null> = I extends ItemDef ? Of<I> : undefined;
export interface Ctx<I extends ItemDef | null, F extends Fields, AL extends AlsoSpec, P extends Presents> {
  readonly f: { readonly [K in keyof F & string]: { field: K } & Typed<F[K]> };
  readonly p: { readonly [K in keyof P & string]: { presented: K } };
  readonly on: OnOf<I>;
  readonly also: { readonly [K in keyof AL & string]: Of<AL[K]["item"]> };
}
/** The `f` of a context over `F`: one `{ field }` operand per declared field. */
export type FieldRefs<F extends Fields> = Ctx<null, F, {}, {}>["f"];
export interface Body { guards?: readonly Guard[]; effects?: readonly EffectForm[]; sends?: readonly SendForm[]; attention?: readonly Notify[]; settles?: Settles }
type ActSpec<I extends ItemDef | null, F extends Fields, AL extends AlsoSpec, P extends Presents> = { fields?: F; also?: AlsoInput<I, AL>; presents?: P };

function context<I extends ItemDef | null, F extends Fields, AL extends AlsoSpec, P extends Presents>(on: I, fields: F, also: AL, presents: P): Ctx<I, F, AL, P> {
  return {
    f: Object.fromEntries(Object.keys(fields).map((k) => [k, { field: k }])),
    p: Object.fromEntries(Object.keys(presents).map((k) => [k, { presented: k }])),
    on: on === null ? undefined : of(on, "on"),
    also: Object.fromEntries(Object.entries(also).map(([k, a]) => [k, of(a.item, `also.${k}`)])),
  } as unknown as Ctx<I, F, AL, P>;
}
const rules = (also: AlsoSpec) => Object.fromEntries(Object.entries(also).map(([k, a]) => [k, a.rule]));
function inferredFields<F extends Fields, AL extends AlsoSpec>(fields: F, also: AL): EffectiveFields<F, AL> {
  const inferred: Fields = {};
  for (const binding of Object.values(also)) if ("by" in binding.rule) inferred[binding.rule.by] = required(itemOf(binding.item));
  return { ...inferred, ...fields } as EffectiveFields<F, AL>;
}

function act<S extends ActType["step"], I extends ItemDef | null, const F extends Fields, const AL extends AlsoSpec, const P extends Presents>(
  step: S, on: I, grant: GrantRef, spec: ActSpec<I, F, AL, P>, body?: (ctx: Ctx<I, EffectiveFields<F, AL>, AL, P>) => Body,
) {
  const also = (typeof spec.also === "function" ? spec.also(on === null ? undefined as OnOf<I> : of(on, "on") as OnOf<I>) : spec.also ?? {}) as AL;
  const fields = inferredFields((spec.fields ?? {}) as F, also), presents = (spec.presents ?? {}) as P;
  const b = body?.(context(on, fields, also, presents)) ?? {};
  return {
    step, on: (on === null ? null : on.name) as I extends ItemDef ? I["name"] : null, grant,
    also: rules(also) as { [K in keyof AL]: AL[K]["rule"] }, fields, ...(spec.presents ? { presents } : {}),
    guards: b.guards ?? [], effects: b.effects ?? [], sends: b.sends ?? [], attention: b.attention ?? [], ...(b.settles ? { settles: b.settles } : {}),
  };
}
export const open = <I extends ItemDef, const F extends Fields = {}, const AL extends AlsoSpec = {}, const P extends Presents = {}>(on: I, grant: GrantRef, spec: ActSpec<I, F, AL, P> = {}, body?: (ctx: Ctx<I, EffectiveFields<F, AL>, AL, P>) => Body) => act("open", on, grant, spec, body);
export const transition = <I extends ItemDef, const F extends Fields = {}, const AL extends AlsoSpec = {}, const P extends Presents = {}>(on: I, grant: GrantRef, spec: ActSpec<I, F, AL, P> = {}, body?: (ctx: Ctx<I, EffectiveFields<F, AL>, AL, P>) => Body) => act("transition", on, grant, spec, body);
export const comment = <I extends ItemDef | null, const F extends Fields = {}, const AL extends AlsoSpec = {}, const P extends Presents = {}>(on: I, grant: GrantRef, spec: ActSpec<I, F, AL, P> = {}, body?: (ctx: Ctx<I, EffectiveFields<F, AL>, AL, P>) => Body) => act("comment", on, grant, spec, body);

/** What a handler's body may name, beyond an act's: the envelope's sender, and parts of the verified source entry. */
export interface HandlerCtx<I extends ItemDef | null, F extends Fields, AL extends AlsoSpec> extends Ctx<I, F, AL, {}> {
  readonly sender: Operand;
  readonly source: (p: EntryPart) => Operand;
}
export interface HandlerBody extends Body { settles?: Settles }
type Late = ReceiveType["late"];
/**
 * @pattern 5 Handlers
 * A handler uses the same subjects, fields and body as an act, with the verified source and sender added.
 * @example receive({ message: "report", class: "tell", from: { kind: "lane", under: "device" }, fields, also }, ({ f, also }) => ({ effects: [...also.device.take(f, "reported")] }))
 */
export function receive<I extends ItemDef | null = null, const F extends Fields = {}, const AL extends AlsoSpec = {}>(
  spec: { message: string; class: ReceiveType["class"]; from: ReceiveType["from"]; fields?: F; opens?: I; also?: AlsoInput<I, AL>; copies?: number; late?: Late; order?: ReceiveType["order"] },
  body?: (ctx: HandlerCtx<I, EffectiveFields<F, AL>, AL>) => HandlerBody,
): ReceiveType {
  const opens = (spec.opens ?? null) as I;
  const also = (typeof spec.also === "function" ? spec.also(opens === null ? undefined as OnOf<I> : of(opens, "on") as OnOf<I>) : spec.also ?? {}) as AL;
  const fields = inferredFields((spec.fields ?? {}) as F, also);
  const b = body?.({ ...context(opens, fields, also, {}), sender, source }) ?? {};
  return {
    message: spec.message, class: spec.class, from: spec.from, fields, opens: opens === null ? null : (opens as ItemDef).name,
    ...(spec.copies !== undefined ? { copies: spec.copies } : {}), ...(spec.late ? { late: spec.late } : {}), ...(spec.order ? { order: spec.order } : {}),
    also: rules(also), guards: b.guards ?? [], effects: b.effects ?? [], sends: b.sends ?? [], attention: b.attention ?? [], ...(b.settles ? { settles: b.settles } : {}),
  };
}
/** The settlement of a relationship copy. */
export const settlesCopy = (...states: readonly string[]): Settles => ({ copy: states });

// ================================================================ timed rules

export function timed<I extends ItemDef>(on: I, spec: { states: readonly States<I>[]; deadline: Values<I>; effects: (it: Of<I>) => readonly EffectForm[]; attention?: (it: Of<I>) => readonly Notify[] }): TimedRule {
  return { on: on.name, states: spec.states, deadline: spec.deadline, effects: spec.effects(of(on)), attention: spec.attention?.(of(on)) ?? [] };
}

// ================================================================ the definition

type ItemsOf<L extends readonly ItemDef[]> = { [I in L[number] as I["name"]]: I["type"] };
type NamedActs<N extends string, A extends Record<string, ActType>> = { [K in keyof A & string]: A[K] & NamedAct<N, K> };
interface Declarations { grants?: readonly string[]; reasons?: readonly string[]; diagnostics: readonly Diagnostic[] }
type DeclaredMetadata = { readonly [DECLARATIONS]?: Declarations };

type GuardVisitor = (guard: Guard, path: string) => void;
/** Traverse declared guard positions only. Operands, including constant records, are data. */
function visitGuards(guards: readonly Guard[] | undefined, path: string, visit: GuardVisitor): void {
  guards?.forEach((guard, i) => {
    const at = `${path}[${i}]`;
    visit(guard, at);
    if ("anyOf" in guard) guard.anyOf.forEach((alternative, n) => visitGuards(alternative, `${at}.anyOf[${n}]`, visit));
    if ("each" in guard) visitGuards(guard.each.guards, `${at}.each.guards`, visit);
    if ("has" in guard) visitGuards(guard.has.guards, `${at}.has.guards`, visit);
  });
}
function visitConditions(condition: { if?: readonly Guard[]; unless?: readonly Guard[] }, path: string, visit: GuardVisitor): void {
  visitGuards(condition.if, `${path}.if`, visit);
  visitGuards(condition.unless, `${path}.unless`, visit);
}
function visitEffects(effects: readonly EffectForm[] | undefined, path: string, visit: GuardVisitor): void {
  effects?.forEach((effect, i) => visitConditions(effect, `${path}[${i}]`, visit));
}
function visitBody(row: Body, path: string, visit: GuardVisitor): void {
  visitGuards(row.guards, `${path}.guards`, visit);
  visitEffects(row.effects, `${path}.effects`, visit);
  row.attention?.forEach((notice, i) => visitConditions(notice.notify, `${path}.attention[${i}].notify`, visit));
  row.sends?.forEach((send, i) => {
    const at = `${path}.sends[${i}]`;
    if ("tell" in send) visitConditions(send.tell, `${at}.tell`, visit);
    if ("relate" in send) visitConditions(send.relate, `${at}.relate`, visit);
    const result = "tell" in send ? send.tell.result : "relate" in send ? send.relate.result : "create" in send ? send.create.result : undefined;
    const kind = "tell" in send ? "tell" : "relate" in send ? "relate" : "create";
    if (result) for (const [outcome, effects] of Object.entries(result)) visitEffects(effects, `${at}.${kind}.result.${outcome}`, visit);
  });
}
function visitDefinitionGuards(definition: Pick<DeclaredDefinition, "acts" | "receives" | "timed">, visit: GuardVisitor): void {
  for (const family of ["acts", "receives", "timed"] as const) {
    for (const [name, row] of Object.entries(definition[family])) visitBody(row, `${family}.${name}`, visit);
  }
}

/**
 * @pattern 6 Definitions and modules
 * Modules are functions of explicit dependencies. define composes their values; compile validates and canonicalizes the whole definition.
 * @example const work = workForms(ROOM, { zone, device, alert }, vocabulary);
 */
export function define<const N extends string, const L extends readonly ItemDef[], const A extends Record<string, ActType>, const G extends keyof A & string>(spec: {
  name: N; genesis: G; items: L; acts: A;
  receives?: Record<string, ReceiveType>; timed?: Record<string, TimedRule>; rules?: Record<string, string>;
  capabilities?: DeclaredDefinition["capabilities"]; level?: DurabilityLevel; capacity?: CapacityVersion;
  grants?: Vocabulary<GrantRef>; reasons?: Vocabulary<ReasonRef>;
}) {
  const hoisted = { ...(spec.rules ?? {}) };
  const diagnostics: Diagnostic[] = [];
  visitDefinitionGuards({ acts: spec.acts, receives: spec.receives ?? {}, timed: spec.timed ?? {} }, (guard, path) => {
    const expression = INLINE_RULE in guard ? guard[INLINE_RULE] : undefined;
    if (typeof expression !== "string" || !("rule" in guard)) return;
    const name = guard.rule;
    if (Object.hasOwn(hoisted, name) && hoisted[name] !== expression) diagnostics.push(diagnostic("findings", path, guard, `rule ${name} has different expressions`));
    else hoisted[name] = expression;
  });
  const named = Object.fromEntries(Object.entries(spec.acts).map(([kind, act]) => [kind, Object.defineProperty({ ...act }, ACT_NAME, { value: { under: spec.name, kind }, enumerable: false })])) as NamedActs<N, A>;
  const definition = {
    format: "artroom-definition-1", ...(spec.level ? { level: spec.level } : {}), ...(spec.capacity ? { capacity: spec.capacity } : {}),
    name: spec.name, profile: { name: "restricted", version: 1 }, capabilities: spec.capabilities ?? [], genesis: spec.genesis,
    items: Object.fromEntries(spec.items.map((i) => [i.name, i.type])) as ItemsOf<L>,
    acts: named, receives: spec.receives ?? {}, timed: spec.timed ?? {}, rules: hoisted,
  } as const;
  Object.defineProperty(definition, DECLARATIONS, { value: {
    ...(spec.grants ? { grants: Object.values(spec.grants) } : {}),
    ...(spec.reasons ? { reasons: Object.values(spec.reasons) } : {}), diagnostics,
  } satisfies Declarations, enumerable: false });
  return definition;
}

/** The forms of several items and acts that one module contributes, to spread into `define`. */
export interface Forms<L extends readonly ItemDef[] = readonly ItemDef[], A extends Record<string, ActType> = Record<string, ActType>> {
  items: L; acts: A; rules?: Record<string, string>; timed?: Record<string, TimedRule>;
}

// ================================================================ compile

export interface Finding { act: string; rule: string; names: string; message: string; form: string }
/** A rule's direct `fields.<name>` and `.values.<name>` references name a field of the act or a value slot of an item it names. */
export function findings(definition: DeclaredDefinition): Finding[] {
  const found: Finding[] = [];
  for (const [kind, a] of Object.entries(definition.acts)) {
    const items = [a.on, ...Object.values(a.also).map((r) => r.item)].filter((n): n is string => n !== null);
    const values = new Set(items.flatMap((n) => Object.keys(definition.items[n]?.values ?? {})));
    visitBody(a, `acts.${kind}`, (g, form) => {
      if (!("rule" in g)) return;
      const rule = g.rule;
      const expression = definition.rules[rule];
      if (expression === undefined) { found.push({ act: kind, rule, names: "", message: "names no rule", form }); return; }
      const fields = [...expression.matchAll(/\bfields\.([A-Za-z_][\w]*)/g)].map((m) => m[1]!).filter((n) => !Object.hasOwn(a.fields, n));
      const slots = [...expression.matchAll(/\.values\.([A-Za-z_][\w]*)/g)].map((m) => m[1]!).filter((n) => !values.has(n));
      if (fields.length) found.push({ act: kind, rule, names: fields.join(", "), message: "reads a field the act does not declare", form });
      if (slots.length) found.push({ act: kind, rule, names: slots.join(", "), message: "reads a value slot none of the act's items declares", form });
    });
  }
  return found;
}
export interface Diagnostic { stage: "findings" | "validator"; act: string | null; form: string; offending: unknown; message: string; code?: string }
function diagnostic(stage: Diagnostic["stage"], form: string, offending: unknown, message: string, code?: string): Diagnostic {
  return { stage, act: /^acts\.([^.[\]]+)/.exec(form)?.[1] ?? null, form, offending, message, ...(code ? { code } : {}) };
}
function valueAt(value: unknown, path: string): unknown {
  let current = value;
  for (const key of path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean)) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
/** Compilation failures retain the exact form and data that failed; no compiled definition is returned. */
export class CompileError extends Error {
  constructor(readonly diagnostics: readonly Diagnostic[]) {
    super(diagnostics.map((d) => `${d.act ? `act ${d.act}: ` : ""}${d.form}: ${d.message}\n${JSON.stringify(d.offending)}`).join("\n"));
    this.name = "CompileError";
  }
}
/** Validate the full definition. A row slice must first be overlaid on its complete pinned definition. */
export function compile<D extends DeclaredDefinition>(definition: D) {
  const declarations = (definition as D & DeclaredMetadata)[DECLARATIONS];
  const canonical = normalize(definition);
  const found = findings(canonical);
  const diagnostics: Diagnostic[] = [...(declarations?.diagnostics ?? []), ...found.map((f) => diagnostic("findings", f.form, valueAt(canonical, f.form), `${f.rule}: ${f.message}${f.names ? `: ${f.names}` : ""}`))];
  for (const [kind, act] of Object.entries(canonical.acts)) {
    if (declarations?.grants && !declarations.grants.includes(act.grant)) diagnostics.push(diagnostic("findings", `acts.${kind}.grant`, act.grant, "grant is not declared"));
  }
  const refusals: Record<string, string[]> = {};
  visitDefinitionGuards(canonical, (guard, path) => {
    if (typeof guard.reason !== "string") return;
    const act = /^acts\.([^.[\]]+)/.exec(path)?.[1];
    if (act) { const list = refusals[act] ??= []; if (!list.includes(guard.reason)) list.push(guard.reason); }
    if (declarations?.reasons && !declarations.reasons.includes(guard.reason)) diagnostics.push(diagnostic("findings", path, guard, "refusal reason is not declared"));
  });
  const validation = validateDefinition(canonical, PROPOSED_BOUNDS, RULE_PROFILES);
  if (!validation.ok) for (const problem of validation.problems) {
    const form = /^(?:acts|receives|timed)\.[^.]+\.(?:guards|effects|sends|attention)\[\d+\]/.exec(problem.path)?.[0] ?? problem.path;
    diagnostics.push(diagnostic("validator", form, valueAt(canonical, form), problem.message, problem.code));
  }
  if (diagnostics.length) throw new CompileError(diagnostics);
  return { definition: canonical, digest: definitionDigest(canonical), findings: found, validation, refusals };
}

// ================================================================ one spelling

/**
 * The contract admits two spellings of several forms with one meaning: a
 * form on `on` may say `of: "on"` or not; an operand may name the subject
 * of its own form or not; a range may carry an empty `except` or `where`
 * or not. The pinned definitions mix them, by author habit. The builders
 * write every subject explicitly, and `normalize` then puts the data in one
 * spelling: a subject is named only where it differs from the enclosing
 * form's, and empty lists are left out. The kernel reads both spellings the
 * same way; only the bytes differ.
 */
type J = Record<string, unknown>;
const isObj = (v: unknown): v is J => typeof v === "object" && v !== null && !Array.isArray(v);
const mapValues = <T, U>(o: Record<string, T>, f: (v: T, k: string) => U): Record<string, U> => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v, k)]));

export function normalize<D extends DeclaredDefinition>(definition: D): D {
  const operandN = (o: unknown, subject: string, inRange: boolean): unknown => {
    if (!isObj(o)) return o;
    const out: J = { ...o };
    if (typeof out["slot"] === "string" && !inRange && out["of"] === subject) delete out["of"];
    const p = out["part"];
    if (isObj(p) && isObj(p["set"])) out["part"] = { ...p, set: { ...p["set"], item: operandN(p["set"]["item"], subject, inRange) } };
    return out;
  };
  const whereN = (ws: unknown): unknown => Array.isArray(ws) ? ws.map((w) => isObj(w) ? mapValues(w, (pair) => isObj(pair) ? { a: operandN(pair["a"], "", true), b: operandN(pair["b"], "", true) } : pair) : w) : ws;
  const rangeN = (r: J): J => {
    const out: J = { ...r };
    if (Array.isArray(out["where"])) { if (out["where"].length === 0) delete out["where"]; else out["where"] = whereN(out["where"]); }
    if (Array.isArray(out["except"]) && out["except"].length === 0) delete out["except"];
    return out;
  };
  const sourceN = (x: unknown, subject: string): unknown => isObj(x) && isObj(x["collect"]) ? { collect: { ...x["collect"], items: rangeN(x["collect"]["items"] as J) } } : operandN(x, subject, false);
  const argN = (a: unknown, subject: string): unknown => isObj(a) && isObj(a["items"]) ? { ...a, items: rangeN(a["items"]) } : isObj(a) && "each" in a ? { ...a, each: operandN(a["each"], subject, false), value: operandN(a["value"], subject, false) } : operandN(a, subject, false);
  const listFormN = (l: J, subject: string): J => ({
    ...l, list: operandN(l["list"], subject, false),
    ...(Array.isArray(l["where"]) ? (l["where"].length ? { where: whereN(l["where"]) } : {}) : {}),
    ...(Array.isArray(l["guards"]) ? { guards: l["guards"].map(guardN) } : {}),
  });
  const guardN = (g: unknown): unknown => {
    if (!isObj(g)) return g;
    const subject = typeof g["of"] === "string" ? g["of"] : "on";
    const out: J = { ...g };
    if (out["of"] === "on") delete out["of"];
    const op = (x: unknown) => operandN(x, subject, false);
    for (const k of ["equals", "differs"]) { const pair = out[k]; if (isObj(pair)) out[k] = { a: op(pair["a"]), b: op(pair["b"]) }; }
    for (const k of ["none", "some"]) if (isObj(out[k])) out[k] = rangeN(out[k] as J);
    if (isObj(out["count"])) { const { min, max, ...r } = out["count"]; out["count"] = { ...rangeN(r), ...(min !== undefined ? { min: op(min) } : {}), ...(max !== undefined ? { max: op(max) } : {}) }; }
    for (const k of ["each", "has"]) if (isObj(out[k])) out[k] = listFormN(out[k] as J, subject);
    if (isObj(out["distinct"])) out["distinct"] = { ...out["distinct"], list: op(out["distinct"]["list"]), key: op(out["distinct"]["key"]) };
    if (isObj(out["sameSet"])) { const s = out["sameSet"]; out["sameSet"] = { ...s, list: op(s["list"]), key: op(s["key"]), items: rangeN(s["items"] as J), ...(Array.isArray(s["match"]) ? (s["match"].length ? { match: whereN(s["match"]) } : {}) : {}) }; }
    if (Array.isArray(out["anyOf"])) out["anyOf"] = out["anyOf"].map((alt: unknown) => Array.isArray(alt) ? alt.map(guardN) : alt);
    if (isObj(out["capability"])) out["capability"] = { ...out["capability"], with: mapValues(out["capability"]["with"] as J, (a) => argN(a, subject)) };
    if (isObj(out["fact"])) out["fact"] = op(out["fact"]);
    return out;
  };
  const authorN = (a: unknown, subject: string): unknown => !isObj(a) ? a : isObj(a["items"]) ? { ...a, items: rangeN(a["items"]) } : "each" in a ? { ...a, each: operandN(a["each"], subject, false), list: operandN(a["list"], subject, false) } : "list" in a ? { ...a, list: operandN(a["list"], subject, false) } : a;
  const effectN = (e: unknown): unknown => {
    if (!isObj(e)) return e;
    const subject = typeof e["of"] === "string" ? e["of"] : "on";
    const out: J = { ...e };
    if (out["of"] === "on") delete out["of"];
    const op = (x: unknown) => operandN(x, subject, false);
    for (const k of ["if", "unless"]) if (Array.isArray(out[k])) out[k] = (out[k] as unknown[]).map(guardN);
    if (isObj(out["party"])) { const f = out["party"]["from"]; out["party"] = { ...out["party"], from: Array.isArray(f) ? f.map(op) : op(f) }; }
    if (isObj(out["value"])) out["value"] = { ...out["value"], from: op(out["value"]["from"]) };
    if (isObj(out["ref"])) out["ref"] = { ...out["ref"], from: op(out["ref"]["from"]) };
    if (isObj(out["hold"]) && out["hold"]["extent"] !== undefined) out["hold"] = { ...out["hold"], extent: op(out["hold"]["extent"]) };
    if (isObj(out["capability"])) out["capability"] = { ...out["capability"], with: mapValues(out["capability"]["with"] as J, op) };
    if (isObj(out["attribute"]) && Array.isArray(out["attribute"]["with"])) out["attribute"] = { ...out["attribute"], with: out["attribute"]["with"].map((a: unknown) => authorN(a, subject)) };
    return out;
  };
  const clausesN = (c: unknown): unknown => isObj(c) ? mapValues(c, (effects) => Array.isArray(effects) ? effects.map(effectN) : effects) : c;
  const noticeN = (n: unknown): unknown => isObj(n) && isObj(n["notify"]) && Array.isArray(n["notify"]["if"]) ? { notify: { ...n["notify"], if: n["notify"]["if"].map(guardN) } } : n;
  const sendN = (s: unknown): unknown => {
    if (!isObj(s)) return s;
    const src = (x: unknown) => sourceN(x, "on"), ifN = (x: unknown) => Array.isArray(x) ? { if: x.map(guardN) } : {};
    if (isObj(s["tell"])) { const t = s["tell"]; return { tell: { ...t, to: operandN(t["to"], "on", false), ...ifN(t["if"]), fields: mapValues(t["fields"] as J, src), result: clausesN(t["result"]) } }; }
    if (isObj(s["create"])) { const c = s["create"]; return { create: { ...c, fields: mapValues(c["fields"] as J, src), result: clausesN(c["result"]) } }; }
    if (isObj(s["relate"])) { const r = s["relate"]; return { relate: { ...r, ...(isObj(r["each"]) ? { each: rangeN(r["each"]) } : {}), to: src(r["to"]), item: src(r["item"]), ...ifN(r["if"]), detail: mapValues(r["detail"] as J, src), result: clausesN(r["result"]) } }; }
    if (isObj(s["index"])) return { index: { fields: mapValues(s["index"]["fields"] as J, src) } };
    return s;
  };
  const rowN = <R extends J>(row: R): R => {
    const normalized = {
      ...row,
      ...(Array.isArray(row["guards"]) ? { guards: row["guards"].map(guardN) } : {}),
      ...(Array.isArray(row["effects"]) ? { effects: row["effects"].map(effectN) } : {}),
      ...(Array.isArray(row["sends"]) ? { sends: row["sends"].map(sendN) } : {}),
      ...(Array.isArray(row["attention"]) ? { attention: row["attention"].map(noticeN) } : {}),
    };
    if (ACT_NAME in row) Object.defineProperty(normalized, ACT_NAME, { value: row[ACT_NAME], enumerable: false });
    return normalized;
  };
  return {
    ...definition,
    acts: mapValues(definition.acts as unknown as Record<string, J>, rowN), receives: mapValues(definition.receives as unknown as Record<string, J>, rowN), timed: mapValues(definition.timed as unknown as Record<string, J>, rowN),
  } as D;
}
