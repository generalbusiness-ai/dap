/** View authoring binds the existing presentation data to declared reads and acts. */
import { PROPOSED_BOUNDS, type DeclaredDefinition, type FieldType, type FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize, fitsFieldType, isRecord, utf8, wellFormed } from "@generalbusiness/dap-bytes";
import { expression } from "./expression.ts";
import type { NativeInputValue } from "./field-input.ts";
import type { Projection, ProjectionSource } from "./package.ts";

type Roles = Readonly<Record<string, readonly string[]>>;
type Projections = Readonly<Record<string, Projection>>;
type Native = "id" | "type" | "state" | "revision";
type Metadata<S extends ProjectionSource> = Native | (S["read"] extends "entries" ? "time" | "on" : never);
type Names<S extends ProjectionSource> = Metadata<S> | keyof S["fields"] & string;
type Selected<S extends ProjectionSource, T extends FieldType["type"]> = {
  [K in keyof S["fields"] & string]: S["fields"][K]["of"]["type"] extends T ? K : never
}[Exclude<keyof S["fields"] & string, Metadata<S>>];
type Row<S extends ProjectionSource> = { readonly [N in Names<S>]: { readonly row: N } };
type Reference<S extends ProjectionSource> = Row<S>[Names<S>] & { readonly part?: never };
type Template<S extends ProjectionSource> = (parts: TemplateStringsArray, ...holes: (Reference<S> | { readonly row: "waiting" })[]) => string;
export type ViewFact<N extends string = string, I extends string = string, T extends string = string> = N
  | { readonly field: I; readonly label: string; readonly scale: number; readonly unit: string }
  | { readonly field: T; readonly label: string; readonly format: "age" };
type Facts<S extends ProjectionSource> = readonly ViewFact<Names<S>, "id" | "revision" | Selected<S, "int">, (S["read"] extends "entries" ? "time" : never) | Selected<S, "time">>[];
export type ViewParameter = { readonly label: string; readonly required: boolean } & (
  { readonly kind: "int"; readonly unit: string; readonly min: number; readonly max: number }
  | { readonly kind: "decimal"; readonly unit: string; readonly scale: number; readonly min: number; readonly max: number }
  | { readonly kind: "text"; readonly max: number }
  | { readonly kind: "enum"; readonly of: readonly string[] }
);
export interface ViewControl<A extends string = string> {
  readonly act: A; readonly label: string; readonly needs: string; readonly when: string;
  readonly args?: Readonly<Record<string, FieldValue>>;
  readonly parameters?: Readonly<Record<string, ViewParameter>>;
}
export interface ViewData {
  readonly revision: "revision"; readonly actor: string | null; readonly summary: string | null;
  readonly acts: readonly ViewControl[]; readonly waiting: Readonly<Record<string, string>>; readonly refresh: number;
  readonly display: "inline" | "fullscreen"; readonly back: string | null;
  readonly kind: "card" | "carousel" | "record" | "log";
  readonly projection: string; readonly item: string; readonly title: string; readonly facts: readonly ViewFact[];
  readonly context: string; readonly fallback: string;
}
type Source<P extends Projections, V extends ViewData> = V["projection"] extends keyof P
  ? V["item"] extends keyof P[V["projection"]]["sources"] ? P[V["projection"]]["sources"][V["item"]] : never : never;
type CheckedView<P extends Projections, V extends ViewData, S extends ProjectionSource = Source<P, V>> = [S] extends [never] ? never
  : Exclude<V["title"] | Exclude<V["summary"], null>, Names<S>> extends never
    ? Exclude<V["actor"], null> extends Selected<S, "member"> ? V["facts"] extends Facts<S> ? V : never : never : never;
export type CheckedViews<_D extends DeclaredDefinition, P extends Projections, V extends Readonly<Record<string, ViewData>>> = {
  readonly [K in keyof V]: CheckedView<P, V[K]>
};
type ActNames<D extends DeclaredDefinition, S extends ProjectionSource, R extends Roles> = {
  [A in keyof D["acts"] & string]: D["acts"][A]["on"] extends S["item"]
    ? D["acts"][A]["grant"] extends R[keyof R][number] ? A : never : never
}[keyof D["acts"] & string];
type ParameterFor<F extends FieldType> = F extends { type: "text" } ? Extract<ViewParameter, { kind: "text" }>
  : F extends { type: "enum"; of: infer O extends readonly string[] } ? Omit<Extract<ViewParameter, { kind: "enum" }>, "of"> & { readonly of: readonly O[number][] }
  : F extends { type: "int" } ? Extract<ViewParameter, { kind: "int" | "decimal" }> : never;
type ControlOptions<D extends DeclaredDefinition, A extends keyof D["acts"]> = {
  readonly args?: Partial<{ readonly [K in keyof D["acts"][A]["fields"]]: NativeInputValue<D["acts"][A]["fields"][K]> }>;
  readonly parameters?: Partial<{ readonly [K in keyof D["acts"][A]["fields"]]: ParameterFor<D["acts"][A]["fields"][K]> }>;
};
type Context<D extends DeclaredDefinition, S extends ProjectionSource, R extends Roles> = {
  readonly row: Row<S>; readonly waiting: { readonly row: "waiting" }; readonly text: Template<S>;
  readonly when: (parts: TemplateStringsArray, ...holes: Reference<S>[]) => string;
} & (S["read"] extends "entries" ? {} : {
  readonly act: <const A extends ActNames<D, S, R>>(kind: A, label: string, when: string, options?: ControlOptions<D, A>) => ViewControl<A>
});
type Input<D extends DeclaredDefinition, S extends ProjectionSource, R extends Roles = Roles> = {
  readonly title: Names<S>; readonly summary?: Names<S> | null;
  readonly actor?: Selected<S, "member"> | null;
  readonly facts: Facts<S>;
  readonly acts?: S["read"] extends "entries" ? readonly never[] : readonly ViewControl<ActNames<D, S, R>>[];
  readonly waiting?: Readonly<Partial<Record<S["item"] extends keyof D["items"] ? keyof D["items"][S["item"]]["states"] & string : "sealed", string>>>;
  readonly refresh?: number; readonly display: "inline" | "fullscreen"; readonly back: string | null;
  readonly context: string; readonly fallback: string;
};
type BoundView<S extends ProjectionSource, K extends string, N extends string> = ViewData & {
  readonly projection: K; readonly item: N; readonly title: Names<S>; readonly summary: Names<S> | null;
  readonly actor: Selected<S, "member"> | null; readonly facts: Facts<S>;
};

const fail = (message: string): never => { throw new TypeError(`view ${message}`); };
const own = (value: object, key: string): boolean => Object.hasOwn(value, key);
const closed = (value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> => {
  if (!isRecord(value) || required.some(key => !own(value, key)) || Reflect.ownKeys(value).some(key => typeof key !== "string" || !required.includes(key) && !optional.includes(key))) return fail("has unsupported fields");
  return value;
};
const text = (value: unknown, most: number, empty = false): string => {
  if (typeof value !== "string" || !wellFormed(value) || !empty && !value.length || utf8(value).length > most) return fail("has invalid text");
  return value;
};
const name = (value: unknown): string => {
  const result = text(value, 128);
  if (result.trim() !== result || /[{}]/.test(result)) return fail("has an invalid field name");
  return result;
};
const names = (source: ProjectionSource): string[] => [...new Set([...Object.keys(source.fields), "id", "type", "state", "revision", ...(source.read === "entries" ? ["time", "on"] : [])])];
const metadata = (source: ProjectionSource, field: string): boolean => ["id", "type", "state", "revision", ...(source.read === "entries" ? ["time", "on"] : [])].includes(field);
const selected = (source: ProjectionSource, field: string): FieldType | undefined => !metadata(source, field) && own(source.fields, field) ? source.fields[field]!.of : undefined;
function sourceBinding(definition: DeclaredDefinition, source: ProjectionSource): void {
  const typeOnly = (field: FieldType & { required: boolean; default?: FieldValue }): FieldType => {
    const { required: _required, default: _default, ...type } = field; return type as FieldType;
  };
  if (source.read !== "entries" && source.read !== "many") fail("source has an invalid read mode");
  closed(source, source.read === "entries" ? ["acts", "fields", "latestBy", "limit", "read", "window"] : ["fields", "item", "limit", "read", "states"]);
  if (!isRecord(source.fields)) fail("source fields must be a map");
  if (source.read === "entries") {
    if (!source.acts?.length || source.acts.some(kind => kind === definition.genesis || !own(definition.acts, kind))) fail("journal names no ordinary act");
  } else if (!source.item || !own(definition.items, source.item)) fail("names no declared item");
  for (const field of Object.values(source.fields)) {
    closed(field, ["from", "nullable", "of"]);
    closed(field.from, ["kind", "name"]);
    const from = field.from;
    if (source.read === "entries") {
      const acts = source.acts;
      if (!acts?.length || acts.some(kind => kind === definition.genesis || !own(definition.acts, kind))) fail("journal names no ordinary act");
      if (from.kind === "signer") {
        if (from.name !== "member" || canonicalize(field.of) !== canonicalize({ type: "member" }) || !field.nullable) fail("journal signer binding differs from its declaration");
      } else {
        if (from.kind !== "field") fail("journal must select an act field or signer");
        for (const kind of acts) {
          const fields = definition.acts[kind]!.fields, declared = own(fields, from.name) ? fields[from.name] : undefined;
          if (!declared || canonicalize(typeOnly(declared)) !== canonicalize(field.of) || field.nullable !== !declared.required) fail("journal field binding differs from its declaration");
        }
      }
    } else {
      const item = source.item && own(definition.items, source.item) ? definition.items[source.item] : undefined;
      if (!item) fail("names no declared item");
      const party = from.kind === "party" && own(item.parties, from.name) ? item.parties[from.name] : undefined;
      const value = from.kind === "value" && own(item.values, from.name) ? item.values[from.name] : undefined;
      const ref = from.kind === "ref" && own(item.refs, from.name) ? item.refs[from.name] : undefined;
      const declared = party ?? value ?? ref;
      const type = party ? party.list ? { type: "list", of: { type: "member" }, max: party.max ?? 64 } : { type: "member" } : value?.of ?? ref?.to;
      if (!declared || !type || canonicalize(type) !== canonicalize(field.of) || field.nullable !== !declared.required) fail("item field binding differs from its declaration");
    }
    if (field.of.type === "text" && field.of.detached) fail("cannot display detached text");
  }
}
/** Check the host's decimal endpoint contract without changing native bounds. */
function scaled(value: number, scale: number): number | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(value));
  if (!match) return null;
  const fraction = match[3] ?? "", shift = scale + Number(match[4] ?? 0) - fraction.length;
  let integer = BigInt(match[2]! + fraction);
  if (shift >= 0) integer *= 10n ** BigInt(shift);
  else {
    const divisor = 10n ** BigInt(-shift);
    if (integer % divisor !== 0n) return null;
    integer /= divisor;
  }
  if (match[1]) integer = -integer;
  return integer >= -BigInt(Number.MAX_SAFE_INTEGER) && integer <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(integer) : null;
}
function template(value: unknown, fields: readonly string[], waiting: boolean): void {
  const source = text(value, 4096); let at = 0;
  while (at < source.length) {
    const open = source.indexOf("{", at), close = source.indexOf("}", at);
    if (open < 0) { if (close >= 0) fail("has unmatched template braces"); break; }
    if (close < open) fail("has unmatched template braces");
    const field = name(source.slice(open + 1, close));
    if (!fields.includes(field) && !(waiting && field === "waiting")) fail(`template names unknown field ${field}`);
    at = close + 1;
  }
}
function parameter(value: unknown, field: FieldType): void {
  if (!isRecord(value)) return fail("has an invalid parameter");
  const kind = value["kind"];
  const keys = kind === "text" ? ["kind", "label", "required", "max"] : kind === "enum" ? ["kind", "label", "required", "of"]
    : kind === "int" ? ["kind", "label", "required", "unit", "min", "max"] : kind === "decimal" ? ["kind", "label", "required", "unit", "min", "max", "scale"] : [];
  if (!keys.length) return fail("has an invalid parameter kind");
  closed(value, keys); text(value["label"], 80);
  if (typeof value["required"] !== "boolean") fail("has an invalid parameter requirement");
  if (kind === "text") {
    const max = value["max"];
    if (field.type !== "text" || field.detached || typeof max !== "number" || !Number.isSafeInteger(max) || max < 1 || max > 65536 || max > field.max) fail("parameter does not fit its native text field");
  } else if (kind === "enum") {
    const words = value["of"];
    if (field.type !== "enum" || !Array.isArray(words) || !words.length || words.length > 64 || new Set(words).size !== words.length || words.some(word => typeof word !== "string" || !field.of.includes(word))) fail("parameter does not fit its native enum field");
    for (const word of words as string[]) text(word, 128);
  } else {
    const low = value["min"], high = value["max"], scale = kind === "int" ? 0 : value["scale"];
    const unit = text(value["unit"], 32, true);
    if (unit.trim() !== unit || field.type !== "int" || typeof low !== "number" || typeof high !== "number" || !Number.isSafeInteger(low) || !Number.isSafeInteger(high) || low > high || low < field.min || high > field.max || typeof scale !== "number" || !Number.isInteger(scale) || scale < 0 || scale > 6) fail("parameter does not fit its native integer field");
    if (scaled(low / 10 ** scale, scale) !== low || scaled(high / 10 ** scale, scale) !== high) fail("parameter endpoints do not round trip to native integers");
  }
}
function control(definition: DeclaredDefinition, source: ProjectionSource, roles: Roles, value: ViewControl): void {
  closed(value, ["act", "label", "needs", "when"], ["args", "parameters"]);
  const kind = name(value.act), act = own(definition.acts, kind) ? definition.acts[kind] : undefined;
  if (source.read === "entries" || !act || act.on !== source.item || act.grant !== value.needs || !Object.values(roles).some(actions => actions.includes(act.grant))) fail(`act ${kind} does not match its source and roles`);
  text(value.label, 80); text(value.when, 2048);
  const args = value.args ?? {}, parameters = value.parameters ?? {};
  if (!isRecord(args) || Object.keys(args).length > 128 || !isRecord(parameters) || own(value, "parameters") && (!Object.keys(parameters).length || Object.keys(parameters).length > 16)) fail("has invalid act inputs");
  for (const [key, given] of Object.entries(args)) {
    const field = own(act.fields, key) ? act.fields[key] : undefined;
    if (!field || !fitsFieldType(field, given, PROPOSED_BOUNDS)) fail(`act ${kind} has an invalid argument ${key}`);
  }
  for (const [key, given] of Object.entries(parameters)) {
    const field = own(act.fields, key) ? act.fields[key] : undefined;
    if (!field || own(args, key)) fail(`act ${kind} has an invalid parameter ${key}`);
    name(key); parameter(given, field);
  }
  for (const [key, field] of Object.entries(act.fields)) if (field.required && !own(field, "default") && !own(args, key) && !parameters[key]?.required) fail(`act ${kind} lacks required field ${key}`);
}

/** Check ordinary structural inputs too; TypeScript does not close object shapes. */
export function checkViews(definition: DeclaredDefinition, projections: Projections, roles: Roles, views: Readonly<Record<string, ViewData>>): void {
  if (!isRecord(views)) fail("map must be an object");
  canonicalize(views);
  if (Object.keys(views).length > 32 || utf8(JSON.stringify(views)).length > 65536) fail("exceeds presentation bounds");
  for (const [key, view] of Object.entries(views)) {
    name(key);
    closed(view, ["revision", "actor", "summary", "acts", "waiting", "refresh", "display", "back", "kind", "projection", "item", "title", "facts", "context", "fallback"]);
    const projection = own(projections, view.projection) ? projections[view.projection] : undefined;
    const source = projection && own(projection.sources, view.item) ? projection.sources[view.item] : undefined;
    if (!source) fail("names no projection source");
    sourceBinding(definition, source);
    if (view.revision !== "revision" || !["card", "carousel", "record", "log"].includes(view.kind) || view.kind === "log" && source.read !== "entries" || !["inline", "fullscreen"].includes(view.display) || !Number.isSafeInteger(view.refresh) || view.refresh < 1000 || view.refresh > 60000) fail("has invalid layout metadata");
    if (view.back !== null && !own(views, view.back)) fail("names no back view");
    const fields = names(source);
    for (const field of [view.title, view.summary, ...view.facts.map(fact => typeof fact === "string" ? fact : fact.field)]) if (field !== null && !fields.includes(name(field))) fail(`names unknown field ${field}`);
    if (view.actor !== null && selected(source, view.actor)?.type !== "member") fail("actor must select a member field");
    if (!Array.isArray(view.facts) || view.facts.length > 16 || new Set(view.facts.map(fact => typeof fact === "string" ? fact : fact.field)).size !== view.facts.length) fail("has invalid facts");
    for (const fact of view.facts) if (typeof fact !== "string") {
      text(fact.label, 80);
      if ("format" in fact) {
        closed(fact, ["field", "label", "format"]);
        if (fact.format !== "age" || !(source.read === "entries" && fact.field === "time") && selected(source, fact.field)?.type !== "time") fail("age fact must select a time field");
      } else {
        closed(fact, ["field", "label", "scale", "unit"]);
        const unit = text(fact.unit, 32, true);
        if (fact.field !== "id" && fact.field !== "revision" && selected(source, fact.field)?.type !== "int" || !Number.isInteger(fact.scale) || fact.scale < 0 || fact.scale > 6 || fact.unit.length > 16 || unit.trim() !== unit) fail("scaled fact must select an integer field");
      }
    }
    template(view.context, fields, true); template(view.fallback, fields, true);
    if (!isRecord(view.waiting) || Object.keys(view.waiting).length > 16) fail("has invalid waiting text");
    const item = source.item && own(definition.items, source.item) ? definition.items[source.item] : undefined;
    for (const [state, value] of Object.entries(view.waiting)) {
      if (source.read === "entries" ? state !== "sealed" : !item || !own(item.states, state)) fail("waiting text names no item state");
      template(value, fields, false);
    }
    if (!Array.isArray(view.acts) || view.acts.length > 2) fail("has invalid controls");
    const used = new Set<string>();
    for (const offered of view.acts) {
      control(definition, source, roles, offered);
      const binding = canonicalize([offered.act, offered.args ?? {}, offered.parameters ?? {}]);
      if (used.has(binding)) fail("repeats a control"); used.add(binding);
    }
  }
}

/** Select a real projection source, then author its existing view data. */
export function views<const D extends DeclaredDefinition, const P extends Projections, const R extends Roles>(definition: D, projections: P, roles: R) {
  function build<const K extends keyof P & string, const N extends keyof P[K]["sources"] & string>(kind: ViewData["kind"], projected: K, sourceName: N, author: (ctx: Context<D, P[K]["sources"][N], R>) => Input<D, P[K]["sources"][N], R>): BoundView<P[K]["sources"][N], K, N> {
    const source = own(projections, projected) && own(projections[projected]!.sources, sourceName) ? projections[projected]!.sources[sourceName] : undefined;
    if (!source) fail("names no projection source");
    const row = Object.fromEntries(names(source).map(name => [name, { row: name }]));
    const tag = (parts: TemplateStringsArray, ...holes: { readonly row: string }[]): string => {
      if (parts.length !== holes.length + 1 || parts.some(part => typeof part !== "string" || /[{}]/.test(part))) fail("template literals must not contain braces");
      let result = parts[0]!;
      holes.forEach((hole, index) => {
        closed(hole, ["row"]);
        if (!own(row, hole.row) && hole.row !== "waiting") fail("template names no bound row field");
        result += `{${hole.row}}${parts[index + 1]!}`;
      });
      return result;
    };
    const act = (act: string, label: string, when: string, options: Pick<ViewControl, "args" | "parameters"> = {}): ViewControl => {
      closed(options, [], ["args", "parameters"]);
      const declared = own(definition.acts, act) ? definition.acts[act] : undefined;
      if (!declared) fail("names no declared act");
      const result = { act, label, ...options, needs: declared.grant, when };
      control(definition, source, roles, result); return result;
    };
    const input = author({ row, waiting: { row: "waiting" }, text: tag, when: expression({ row }), ...(source.read === "entries" ? {} : { act }) } as unknown as Context<D, P[K]["sources"][N], R>);
    closed(input, ["title", "facts", "display", "back", "context", "fallback"], ["actor", "summary", "acts", "waiting", "refresh"]);
    // This order matches the maintained presentation JSON convention.
    const result = { revision: "revision" as const, actor: input.actor ?? null, summary: input.summary ?? null, acts: input.acts ?? [], waiting: input.waiting ?? {}, refresh: input.refresh ?? 2000,
      display: input.display, back: input.back, kind, projection: projected, item: sourceName, title: input.title, facts: input.facts, context: input.context, fallback: input.fallback };
    // Back targets belong to the complete manifest, which checks them below.
    checkViews(definition, projections, roles, { current: { ...result, back: null } });
    return result;
  }
  return {
    card: <const K extends keyof P & string, const N extends keyof P[K]["sources"] & string>(projected: K, source: N, author: (ctx: Context<D, P[K]["sources"][N], R>) => Input<D, P[K]["sources"][N], R>) => build("card", projected, source, author),
    carousel: <const K extends keyof P & string, const N extends keyof P[K]["sources"] & string>(projected: K, source: N, author: (ctx: Context<D, P[K]["sources"][N], R>) => Input<D, P[K]["sources"][N], R>) => build("carousel", projected, source, author),
    record: <const K extends keyof P & string, const N extends keyof P[K]["sources"] & string>(projected: K, source: N, author: (ctx: Context<D, P[K]["sources"][N], R>) => Input<D, P[K]["sources"][N], R>) => build("record", projected, source, author),
    log: <const K extends keyof P & string, const N extends keyof P[K]["sources"] & string>(projected: K, source: N & (P[K]["sources"][N]["read"] extends "entries" ? unknown : never), author: (ctx: Context<D, P[K]["sources"][N], R>) => Input<D, P[K]["sources"][N], R>) => build("log", projected, source, author),
  };
}
