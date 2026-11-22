/** Private identities follow positions, never the integers used to hold a draft. */
import type { FieldValue, Item } from "@generalbusiness/dap-contract";
import { canonicalize, isFieldValue, isRecord } from "@generalbusiness/dap-bytes";
import type { judgeActBody, StateView } from "@generalbusiness/dap-derive";
import type { ItemName, Revision, Source } from "./act-types.ts";
import { UnavailableActSource } from "./act-symbols.ts";
import { ShapeError } from "./declared.ts";

type Provenance = NonNullable<Parameters<typeof judgeActBody>[3]["provenance"]>;
type ReferenceData = ReturnType<Provenance>;
type Origin = Parameters<Provenance>[0]["origin"];
type Path = readonly (string | number)[];
type Token = Readonly<Record<string, never>>;

export type SlotMark = { readonly space: "refs" | "values"; readonly path: Path;
  readonly reference: { readonly output: Source } | { readonly entry: Source } };

interface RowIdentity {
  readonly subject: object;
  readonly name: ItemName;
  readonly seen: Revision;
  readonly marks: readonly SlotMark[];
  readonly slots: ReadonlyMap<string, SlotMark["reference"]>;
}

/** One registry belongs to one recorded scope and owner. */
export class ActReferences {
  readonly #tokens = new Map<string, Token>();
  readonly #sources = new Map<object, Source>();
  readonly #rows = new Map<Item, RowIdentity>();
  readonly #subjects = new Map<number, object>();
  readonly #outputs = new Map<object, Item>();
  readonly #recordedOutputs = new Map<object, number>();
  readonly #recordedSources = new Set<object>();
  readonly #recorded: ReadonlySet<number>;
  readonly view: StateView;

  constructor(view: StateView, recorded: readonly Item[], prior?: ActReferences) {
    this.view = view;
    this.#recorded = prior ? prior.#recorded : new Set(recorded.map(item => item.id));
    if (prior) {
      for (const [key, value] of prior.#tokens) this.#tokens.set(key, value);
      for (const [key, value] of prior.#sources) this.#sources.set(key, value);
      for (const [key, value] of prior.#rows) this.#rows.set(key, value);
      for (const [key, value] of prior.#subjects) this.#subjects.set(key, value);
      for (const [key, value] of prior.#outputs) this.#outputs.set(key, value);
      for (const [key, value] of prior.#recordedOutputs) this.#recordedOutputs.set(key, value);
      for (const token of prior.#recordedSources) this.#recordedSources.add(token);
    } else for (const item of recorded) this.register(item, item.id, item.revision, []);
  }

  /** An admitted step extends a new frame; older hypothetical views stay fixed. */
  fork(view: StateView): ActReferences { return new ActReferences(view, [], this); }

  token(source: Source): Token {
    const key = canonicalize(source);
    let token = this.#tokens.get(key);
    if (!token) {
      token = Object.freeze({});
      this.#tokens.set(key, token);
      this.#sources.set(token, { key: source.key, version: source.version });
    }
    return token;
  }

  source(token: object): Source {
    const source = this.#sources.get(token);
    if (!source) throw new TypeError("a copied reference has no source in this exploration");
    return source;
  }

  output(source: Source): Item {
    const token = this.token(source);
    const id = this.#recordedOutputs.get(token);
    const item = id === undefined ? this.#outputs.get(token) : this.view.item(id);
    if (!item) throw new UnavailableActSource(source);
    return item;
  }

  /** Bind only an output established by the checked recorded entry. */
  recordedSource(source: Source): void { this.#recordedSources.add(this.token(source)); }

  recordedOutput(source: Source, id: number): void {
    if (!this.#recorded.has(id) || !this.view.item(id)) throw new UnavailableActSource(source);
    this.#recordedOutputs.set(this.token(source), id);
  }

  captureOutput(source: Source): number | Token {
    this.output(source);
    const token = this.token(source);
    return this.#recordedOutputs.get(token) ?? token;
  }

  /** The projector supplies row and leaf identities from actual emitted effects. */
  register(item: Item, name: ItemName, seen: Revision, marks: readonly SlotMark[]): void {
    let subject: object;
    if (typeof name === "number") {
      if (!this.#recorded.has(name)) throw new TypeError("an unrecorded row needs its output source");
      subject = this.#subjects.get(name) ?? Object.freeze({});
      this.#subjects.set(name, subject);
    } else {
      subject = this.token(name.output);
      this.#outputs.set(subject, item);
    }
    this.#rows.set(item, { subject, name, seen, marks: [...marks],
      slots: new Map(marks.map(mark => [canonicalize([mark.space, ...mark.path]), mark.reference])) });
  }

  row(item: Item): { readonly name: ItemName; readonly seen: Revision } {
    const row = this.#rows.get(item);
    if (!row) throw new TypeError("a hypothetical row has no position provenance");
    return { name: row.name, seen: row.seen };
  }

  marks(item: Item): readonly SlotMark[] {
    const row = this.#rows.get(item);
    if (!row) throw new TypeError("a hypothetical row has no position provenance");
    return row.marks;
  }

  leaf(item: Item, space: "refs" | "values", path: Path): SlotMark["reference"] | null {
    const row = this.#rows.get(item);
    if (!row) throw new TypeError("a projected leaf has no row provenance");
    return row.slots.get(canonicalize([space, ...path])) ?? null;
  }

  captureName(name: ItemName | null): number | Token | null {
    return name === null || typeof name === "number" ? name : this.token(name.output);
  }

  #capture(value: unknown, sources: ReadonlyMap<string, Source>, path: Path): FieldValue {
    const source = sources.get(canonicalize(path));
    if (source) return this.captureOutput(source);
    if (Array.isArray(value)) return value.map((member, index) => this.#capture(member, sources, [...path, index]));
    if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([name, member]) => {
      return [name, this.#capture(member, sources, [...path, name])];
    }));
    if (isFieldValue(value)) return value;
    throw new ShapeError(`fields.${path.join(".")}`, "is not a field value");
  }

  captureFields(fields: Readonly<Record<string, unknown>>, sources: ReadonlyMap<string, Source>): Record<string, FieldValue> {
    return Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, this.#capture(value, sources, [name])]));
  }

  /** The existing basis resolver sees separate recorded and pending namespaces. */
  captureSubjects(items: readonly Item[]): readonly { id: number | Token; type: string; refs: Item["refs"]; revision: Revision }[] {
    return items.map(item => {
      const row = this.#rows.get(item);
      if (!row) throw new TypeError("a captured subject has no row provenance");
      const sources = new Map(row.marks.flatMap(mark => mark.space === "refs" && "output" in mark.reference
        ? [[canonicalize(mark.path), mark.reference.output] as const] : []));
      return { id: typeof row.name === "number" ? row.name : this.token(row.name.output), type: item.type,
        refs: Object.fromEntries(Object.entries(item.refs).map(([name, value]) =>
          [name, value === null ? null : this.#capture(value, sources, [name])])), revision: row.seen };
    });
  }

  /** Inputs retain their authored positions after shaping and basis capture. */
  classifier(input: { readonly source: Source; readonly on: ItemName | null;
    readonly fields: ReadonlyMap<string, Source>; readonly expected: Readonly<Record<string, Revision>> }): Provenance {
    const current = this.token(input.source);
    const pending = (source: Source): ReferenceData => {
      const item = this.output(source);
      const id = this.#recordedOutputs.get(this.token(source));
      return id === undefined ? { is: "pending", token: this.token(source), item, alias: item.id }
        : { is: "recorded", id, item };
    };
    const numeric = (value: unknown): ReferenceData => {
      if (typeof value !== "number") return null;
      if (this.#recorded.has(value)) return { is: "recorded", id: value, item: this.view.item(value) };
      return this.#outputs.size ? { is: "entry" } : { is: "recorded", id: value, item: null };
    };
    const identity = (origin: Extract<Origin, { at: "item" | "revision" | "opened" }>): ReferenceData => {
      if (origin.currentOutput) return origin.at === "item"
        ? { is: "pending", token: current, item: origin.item, alias: origin.item.id } : { is: "entry" };
      const row = this.#rows.get(origin.item);
      if (!row) throw new TypeError("a body read has no row provenance");
      if (origin.at === "item") return typeof row.name === "number" ? numeric(row.name) : pending(row.name.output);
      if (origin.at === "opened") return typeof row.name === "number" ? null : { is: "entry" };
      return typeof row.seen === "number" ? { is: "recorded-revision", value: row.seen, subject: row.subject }
        : { is: "after", token: this.token(row.seen.after), subject: row.subject };
    };
    return ({ origin, type, value, use }) => {
      if (origin.at === "on") return input.on !== null && typeof input.on !== "number" ? pending(input.on.output) : numeric(value);
      if (origin.at === "field") {
        const source = input.fields.get(canonicalize(origin.path));
        return source ? pending(source) : type?.type === "item" || use === "subject" ? numeric(value) : null;
      }
      if (origin.at === "subject") {
        const row = this.#rows.get(origin.item);
        if (!row) throw new TypeError("a selected subject has no row provenance");
        // Section 5.4 deliberately refuses the whole subject until its entry
        // slot records. A typed field that merely names it is not a subject.
        if (row.marks.some(mark => "entry" in mark.reference)) return { is: "entry" };
        return identity({ at: "item", item: origin.item, currentOutput: false });
      }
      if (origin.at === "slot") {
        const row = this.#rows.get(origin.item);
        if (!row) throw new TypeError("a slot read has no row provenance");
        const mark = row.slots.get(canonicalize([origin.space, ...origin.path]));
        return mark ? "entry" in mark ? { is: "entry" } : pending(mark.output)
          : type?.type === "item" || use === "subject" ? numeric(value) : null;
      }
      if (origin.at === "expected") {
        const row = this.#rows.get(origin.subject);
        if (!row) throw new TypeError("a basis read has no subject provenance");
        const expected = Object.hasOwn(input.expected, origin.name) ? input.expected[origin.name] : undefined;
        if (typeof expected === "number") return { is: "recorded-revision", value: expected, subject: row.subject };
        if (!expected) return null;
        const recorded = this.#recordedSources.has(this.token(expected.after));
        if (recorded && typeof value !== "number") throw new UnavailableActSource(expected.after);
        return recorded ? { is: "recorded-revision", value: value as number, subject: row.subject }
          : { is: "after", token: this.token(expected.after), subject: row.subject };
      }
      if (origin.at === "item" || origin.at === "revision" || origin.at === "opened") return identity(origin);
      return use === "subject" || type?.type === "item" ? numeric(value) : null;
    };
  }
}
