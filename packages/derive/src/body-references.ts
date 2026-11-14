/** Position provenance for one unsigned body. Recorded judges never install it. */
import type { FieldType } from "@generalbusiness/dap-contract";
import type { Item, StateView } from "./state.ts";
import type { ValidDefinition } from "./validate/index.ts";

type Path = readonly (string | number)[];
export type ReferenceOrigin =
  | { at: "on" }
  | { at: "field"; path: Path; provided: boolean }
  | { at: "subject"; name: string; binding: "on" | "one" | "by" | "via"; item: Item }
  | { at: "slot"; item: Item; space: "refs" | "values"; path: Path; state: "inherited" | "working" }
  | { at: "item" | "revision" | "opened"; item: Item; currentOutput: boolean }
  | { at: "expected"; name: string; provided: boolean; subject: Item }
  | { at: "untyped" };
export type ReferenceData =
  | { is: "pending"; token: object; item: Item; alias: number }
  | { is: "recorded"; id: number; item: Item | null }
  | { is: "after"; token: object; subject: object }
  | { is: "recorded-revision"; value: number; subject: object }
  | { is: "entry" };
export type Provenance = (read: { origin: ReferenceOrigin; type: FieldType | null; value: unknown;
  use: "subject" | "typed-reference" | "basis" | "value" }) => ReferenceData | null;
export interface OutputReference { effect: number; path: Path; token: object }
type Identity = Extract<ReferenceData, { is: "pending" | "recorded" }>;
type EffectReference = { effect: object; path: Path; token: object };

export class BodyReferences {
  readonly #atoms = new WeakMap<object, Identity>();
  readonly #working = new WeakMap<Item, Map<string, unknown>>();
  readonly #base = new WeakMap<Item, Item>();
  readonly #emitted: EffectReference[] = [];
  readonly #opened = new WeakSet<Item>();
  readonly #entry = Object.freeze({});
  constructor(readonly classify: Provenance, readonly unavailable: () => never, readonly supplied: Readonly<Record<string, unknown>>) {}

  #identity(value: unknown): Identity | undefined {
    return value !== null && typeof value === "object" ? this.#atoms.get(value) : undefined;
  }
  isReference(value: unknown): boolean { return this.#identity(value) !== undefined; }
  address(value: unknown): unknown {
    const identity = this.#identity(value);
    if (identity?.is === "pending") return identity.alias;
    return identity?.is === "recorded" ? identity.id : value;
  }
  #atom(identity: Identity): object {
    const atom = Object.freeze(Object.defineProperty(Object.create(null), Symbol.toPrimitive, { value: this.unavailable }));
    this.#atoms.set(atom, identity);
    return atom;
  }
  lookup(view: StateView, origin: ReferenceOrigin, value: unknown, type: FieldType | null): Item | null {
    const atom = this.#identity(value);
    if (atom) return atom.item;
    const found = this.classify({ origin, type, value, use: "subject" });
    if (found?.is === "entry") return this.unavailable();
    if (found?.is === "pending" || found?.is === "recorded") return found.item;
    return typeof value === "number" ? view.item(value) : null;
  }
  value(origin: ReferenceOrigin, type: FieldType | null, value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (this.#identity(value)) return value;
    if (type?.type === "list" && Array.isArray(value)) return value.map((member, n) => this.value(this.#at(origin, n), type.of, member));
    if (type?.type === "record" && value !== null && typeof value === "object") return Object.fromEntries(
      Object.entries(value).map(([key, member]) => [key, this.value(this.#at(origin, key), type.of[key] ?? null, member)]));
    const found = this.classify({ origin, type, value, use: type?.type === "item" ? "typed-reference" : "value" });
    if (found?.is === "entry" || found?.is === "after") return this.unavailable();
    return type?.type === "item" && (found?.is === "pending" || (found?.is === "recorded" && found.item !== null)) ? this.#atom(found) : value;
  }
  #at(origin: ReferenceOrigin, member: string | number): ReferenceOrigin {
    const path = origin.at === "field" || origin.at === "slot" ? [...origin.path, member] : null;
    return origin.at === "field" ? this.fieldOrigin(path!) : origin.at === "slot" ? { ...origin, path: path! } : origin;
  }
  fieldOrigin(path: Path): Extract<ReferenceOrigin, { at: "field" }> {
    let value: unknown = this.supplied;
    for (const part of path) {
      if (value === null || typeof value !== "object" || !Object.hasOwn(value, part)) return { at: "field", path, provided: false };
      value = Reflect.get(value, part);
    }
    return { at: "field", path, provided: true };
  }
  field(types: Readonly<Record<string, FieldType>>, fields: Readonly<Record<string, unknown>>, name: string): unknown {
    return this.value(this.fieldOrigin([name]), types[name] ?? null, fields[name] ?? null);
  }
  item(item: Item): unknown {
    return this.value({ at: "item", item: this.#base.get(item) ?? item, currentOutput: this.#opened.has(item) }, { type: "item", of: item.type }, item.id);
  }
  slot(item: Item, space: "refs" | "values", name: string, type: FieldType | null): unknown {
    const working = this.#working.get(item), key = JSON.stringify([space, name]);
    if (working?.has(key)) return working.get(key) === this.#entry ? this.unavailable() : working.get(key);
    const origin: ReferenceOrigin = this.#opened.has(item) ? { at: "untyped" }
      : { at: "slot", item: this.#base.get(item) ?? item, space, path: [name], state: "inherited" };
    return this.value(origin, type, item[space][name] ?? null);
  }
  opened(item: Item): void { this.#opened.add(item); this.#working.set(item, new Map()); }
  current(value: unknown): boolean { const identity = this.#identity(value); return !!identity?.item && this.#opened.has(identity.item); }
  entry(): unknown { return this.#entry; }
  forWrite(source: unknown, actual: unknown, type: FieldType): unknown {
    if (this.#identity(source)) return source;
    if (type.type === "list" && Array.isArray(actual)) return actual.map((member, n) => this.forWrite(Array.isArray(source) ? source[n] : undefined, member, type.of));
    if (type.type === "record" && actual !== null && typeof actual === "object") return Object.fromEntries(
      Object.entries(actual).map(([key, member]) => [key, type.of[key]
        ? this.forWrite(source !== null && typeof source === "object" ? Reflect.get(source, key) : undefined, member, type.of[key]!) : member]));
    return this.value({ at: "untyped" }, type, actual);
  }
  changed(before: Item, after: Item, space?: "refs" | "values", name?: string, value?: unknown): void {
    const working = new Map(this.#working.get(before));
    if (space !== undefined && name !== undefined) working.set(JSON.stringify([space, name]), value);
    this.#working.set(after, working);
    this.#base.set(after, this.#base.get(before) ?? before);
    if (this.#opened.has(before)) this.#opened.add(after);
  }
  same(a: unknown, b: unknown, ordinary: (a: unknown, b: unknown) => boolean): boolean {
    const left = this.#identity(a), right = this.#identity(b);
    if (left?.is === "pending" || right?.is === "pending") {
      if (!left || !right) return this.unavailable();
      return left.is === "pending" && right.is === "pending" && left.token === right.token;
    }
    if (left || right) return ordinary(left?.is === "recorded" ? left.id : a, right?.is === "recorded" ? right.id : b);
    const contains = (value: unknown): boolean => this.#identity(value) !== undefined
      || (value !== null && typeof value === "object" && Object.values(value).some(contains));
    if (!contains(a) && !contains(b)) return ordinary(a, b);
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, n) => this.same(v, b[n], ordinary));
    if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
      const keys = Object.keys(a), others = Object.keys(b);
      return keys.length === others.length && keys.every(key => Object.hasOwn(b, key) && this.same(Reflect.get(a, key), Reflect.get(b, key), ordinary));
    }
    return ordinary(a, b);
  }
  expose(value: unknown): unknown {
    if (value === this.#entry) return this.unavailable();
    const identity = this.#identity(value);
    if (identity?.is === "pending") return this.unavailable();
    if (identity) return identity.id;
    if (Array.isArray(value)) return value.map(member => this.expose(member));
    if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, member]) => [key, this.expose(member)]));
    return value;
  }
  forType(value: unknown, type: FieldType): unknown {
    const identity = this.#identity(value);
    if (identity) {
      if (identity.is === "pending" && type.type !== "item") return this.unavailable();
      return this.address(value);
    }
    if (type.type === "list" && Array.isArray(value)) return value.map(member => this.forType(member, type.of));
    if (type.type === "record" && value !== null && typeof value === "object") return Object.fromEntries(
      Object.entries(value).map(([key, member]) => [key, type.of[key] ? this.forType(member, type.of[key]!) : this.expose(member)]));
    return this.expose(value);
  }
  basis(item: Item, name: string, expected: unknown, provided: boolean): boolean {
    const before = this.classify({ origin: { at: "expected", name, provided, subject: item }, type: null, value: expected, use: "basis" });
    const after = this.classify({ origin: { at: "revision", item, currentOutput: this.#opened.has(item) }, type: null, value: item.revision, use: "basis" });
    if (before?.is === "entry" || after?.is === "entry") return this.unavailable();
    if (before?.is === "after" || after?.is === "after") {
      if (before?.is !== "after" || after?.is !== "after") return this.unavailable();
      return before.token === after.token && before.subject === after.subject;
    }
    if (before?.is === "recorded-revision" && after?.is === "recorded-revision") return before.subject === after.subject && before.value === after.value;
    return expected === item.revision;
  }
  metadata(item: Item, member: "id" | "revision" | "opened"): unknown {
    if (member === "id") return this.expose(this.item(item));
    if (member === "opened" && this.#opened.has(item)) return item.opened;
    const data = this.classify({ origin: { at: member, item: this.#base.get(item) ?? item, currentOutput: this.#opened.has(item) }, type: null, value: item[member], use: "value" });
    if (data?.is === "entry" || data?.is === "after" || data?.is === "pending") return this.unavailable();
    return item[member];
  }
  opaque<T>(value: T): T {
    if (this.#identity(value) || value === this.#entry) return this.expose(value) as T;
    if (value === null || typeof value !== "object") return value;
    const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      Object.defineProperty(copy, key, { ...descriptor, configurable: Array.isArray(value) && key === "length" ? false : true });
    }
    return new Proxy(copy, { get: (target, key, receiver) => this.opaque(Reflect.get(target, key, receiver)) });
  }
  opaqueItem(item: Item, definition: ValidDefinition, currentDeviceCommand = false): Item {
    const declaration = definition.declared.items[item.type];
    return new Proxy({ ...item }, { get: (target, key, receiver) => {
      if (key === "id" || key === "revision" || key === "opened") return this.metadata(item, key);
      if (key === "refs" || key === "values") return new Proxy({ ...target[key] }, { get: (slots, name) => {
        if (typeof name !== "string" || !Object.hasOwn(slots, name)) return Reflect.get(slots, name);
        if (currentDeviceCommand && key === "refs" && name === "targetAt"
          && this.#working.get(item)?.get(JSON.stringify(["refs", "targetAt"])) === this.#entry) return item.refs["targetAt"];
        const type = key === "refs" ? declaration?.refs[name]?.to : declaration?.values[name]?.of;
        return this.opaque(this.slot(item, key, name, type ?? null));
      } });
      return Reflect.get(target, key, receiver);
    } });
  }
  opaqueView(view: StateView, definition: ValidDefinition): StateView {
    return new Proxy(view, { get: (target, key) => {
      if (key === "item") return (id: number) => {
        const item = this.lookup(view, { at: "untyped" }, id, null);
        return item ? this.opaqueItem(item, definition) : null;
      };
      if (key === "page") return (...args: Parameters<StateView["page"]>) => {
        const page = target.page(...args);
        return { ...page, items: page.items.map(item => this.opaqueItem(item, definition)) };
      };
      const value: unknown = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    } });
  }
  lower(value: unknown, type: FieldType | null, effect: object, path: Path): unknown {
    const identity = this.#identity(value);
    if (identity) {
      if (identity.is === "pending") {
        if (type?.type !== "item") return this.unavailable();
        this.#emitted.push({ effect, path, token: identity.token });
        return identity.alias;
      }
      return identity.id;
    }
    if (type?.type === "list" && Array.isArray(value)) return value.map((member, n) => this.lower(member, type.of, effect, [...path, n]));
    if (type?.type === "record" && value !== null && typeof value === "object") return Object.fromEntries(
      Object.entries(value).map(([key, member]) => [key, this.lower(member, type.of[key] ?? null, effect, [...path, key])]));
    return this.expose(value);
  }
  output(effects: readonly object[]): readonly OutputReference[] {
    return this.#emitted.map(mark => {
      const effect = effects.indexOf(mark.effect);
      if (effect < 0) throw new TypeError("the copied reference effect was not emitted");
      return { effect, path: mark.path, token: mark.token };
    });
  }
}
