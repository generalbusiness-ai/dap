/** Package metadata derived from a declared definition. It grants no authority. */
import type { DeclaredDefinition, FieldType } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrict } from "@generalbusiness/dap-bytes";
import type { GrantRef, ItemDef, Slots, States } from "./index.ts";

type Roles = Readonly<Record<string, readonly string[]>>;
type Action<R extends Roles> = R[keyof R][number];
/** Declare roles before acts, then obtain only the actions those roles hold. */
export function declareRoles<const R extends Roles>(roles: R) {
  const held = new Set<string>(Object.values(roles).flat());
  return {
    roles,
    grant<const A extends Action<R>>(action: A): GrantRef<A> {
      if (!held.has(action)) throw new Error(`no role holds ${action}`);
      return action as GrantRef<A>;
    },
  };
}

export interface ItemsSpec<I extends ItemDef = ItemDef, F extends readonly Slots<I>[] = readonly Slots<I>[]> {
  readonly kind: "items";
  readonly item: I;
  readonly fields: F;
  readonly states?: readonly States<I>[];
  readonly limit?: number;
}
type EntryField = "signer" | { readonly field: string };
export interface EntriesSpec<A extends readonly string[] = readonly string[], F extends Readonly<Record<string, EntryField>> = Readonly<Record<string, EntryField>>> {
  readonly kind: "entries";
  readonly acts: A;
  readonly fields: F;
  readonly window?: number;
  readonly limit?: number;
}
export const items = <const I extends ItemDef, const F extends readonly Slots<I>[]>(item: I, fields: F, more: { states?: readonly States<I>[]; limit?: number } = {}): ItemsSpec<I, F> => ({ kind: "items", item, fields, ...more });
export const entries = <const A extends readonly string[], const F extends Readonly<Record<string, EntryField>>>(acts: A, fields: F, more: { window?: number; limit?: number } = {}): EntriesSpec<A, F> => ({ kind: "entries", acts, fields, ...more });
export const signerOf = "signer" as const;
export const fieldOf = <const F extends string>(field: F) => ({ field });
type SourceSpec = ItemsSpec | EntriesSpec;
type SourceSpecs = Readonly<Record<string, SourceSpec>>;
type ActFields<D extends DeclaredDefinition, A extends string> = A extends keyof D["acts"] ? keyof D["acts"][A]["fields"] & string : never;
type SelectedEntryFields<F extends Readonly<Record<string, EntryField>>> = F[keyof F] extends infer V ? V extends { field: infer N } ? N : never : never;
type MissingEntryFields<D extends DeclaredDefinition, A extends readonly string[], F extends Readonly<Record<string, EntryField>>> = { [K in A[number]]: Exclude<SelectedEntryFields<F>, ActFields<D, K>> }[A[number]];
type CheckedSource<D extends DeclaredDefinition, S extends SourceSpec> = S extends EntriesSpec<infer A, infer F>
  ? Exclude<A[number], keyof D["acts"]> extends never
    ? MissingEntryFields<D, A, F> extends never ? S : never
    : never
  : S extends ItemsSpec<infer I> ? I["name"] extends keyof D["items"] ? S : never : never;
type CheckedSources<D extends DeclaredDefinition, S extends SourceSpecs> = { readonly [K in keyof S]: CheckedSource<D, S[K]> };
export interface ProjectionField { readonly from: { readonly kind: "party" | "value" | "ref" | "signer" | "field"; readonly name: string }; readonly of: FieldType; readonly nullable: boolean }
export interface ProjectionSource<F extends string = string> {
  readonly read: "many" | "entries";
  readonly item?: string;
  readonly states?: readonly string[];
  readonly acts?: readonly string[];
  readonly window?: number;
  readonly latestBy?: null;
  readonly limit: number;
  readonly fields: Readonly<Record<F, ProjectionField>>;
}
type SelectedFields<S extends SourceSpec> = S extends ItemsSpec<ItemDef, infer F> ? F[number] : S extends EntriesSpec<readonly string[], infer F> ? keyof F & string : never;
type BuiltSource<S extends SourceSpec> = ProjectionSource<SelectedFields<S>> & { readonly read: S extends ItemsSpec ? "many" : "entries" };
export interface Projection<S extends Readonly<Record<string, ProjectionSource>> = Readonly<Record<string, ProjectionSource>>> {
  readonly v: 1;
  readonly definition: string;
  readonly revision: "revision";
  readonly sources: S;
}
const bounded = (value: number, most = 100): number => {
  if (!Number.isSafeInteger(value) || value < 1 || value > most) throw new Error(`a projection bound must be 1–${most}`);
  return value;
};
const fieldType = (field: FieldType & { required?: boolean; default?: unknown }): FieldType => {
  const { required: _required, default: _default, ...type } = field;
  return type as FieldType;
};

/** Select slots and let their definition supply field types and nullability. */
export function projection<const D extends DeclaredDefinition, const S extends SourceSpecs>(definition: D, path: string, sources: S & CheckedSources<NoInfer<D>, S>): Projection<{ readonly [K in keyof S]: BuiltSource<S[K]> }> {
  const built = Object.fromEntries(Object.entries(sources).map(([name, spec]) => {
    if (spec.kind === "items") {
      const type = Object.hasOwn(definition.items, spec.item.name) ? definition.items[spec.item.name] : undefined;
      if (!type || canonicalize(type) !== canonicalize(spec.item.type)) throw new Error(`projection ${name} names an item outside its definition`);
      const states = [...(spec.states ?? Object.keys(type.states))].sort();
      if (new Set(states).size !== states.length || states.some(state => !Object.hasOwn(type.states, state))) throw new Error(`projection ${name} names an unknown state`);
      const fields = Object.fromEntries(spec.fields.map((slot): [string, ProjectionField] => {
        const party = Object.hasOwn(type.parties, slot) ? type.parties[slot] : undefined;
        const value = Object.hasOwn(type.values, slot) ? type.values[slot] : undefined;
        const ref = Object.hasOwn(type.refs, slot) ? type.refs[slot] : undefined;
        if (party) return [slot, { from: { kind: "party", name: slot }, of: party.list ? { type: "list", of: { type: "member" }, max: party.max ?? 64 } : { type: "member" }, nullable: !party.required }];
        if (value) {
          if (value.of.type === "text" && value.of.detached) throw new Error(`projection ${name} cannot display detached text`);
          return [slot, { from: { kind: "value", name: slot }, of: parseStrict(canonicalize(value.of)) as FieldType, nullable: !value.required }];
        }
        if (ref) return [slot, { from: { kind: "ref", name: slot }, of: parseStrict(canonicalize(ref.to)) as FieldType, nullable: !ref.required }];
        throw new Error(`projection ${name}: ${spec.item.name} has no slot ${slot}`);
      }));
      return [name, { item: spec.item.name, read: "many", states, limit: bounded(spec.limit ?? (type.many ? 100 : 1)), fields }];
    }
    const acts = [...spec.acts].sort();
    if (!acts.length || new Set(acts).size !== acts.length || acts.some(kind => kind === definition.genesis || !Object.hasOwn(definition.acts, kind))) throw new Error(`projection ${name} names an unknown or founding act`);
    const fields = Object.fromEntries(Object.entries(spec.fields).map(([alias, from]): [string, ProjectionField] => {
      if (from === "signer") return [alias, { from: { kind: "signer", name: "member" }, of: { type: "member" }, nullable: true }];
      const declared = acts.map(kind => Object.hasOwn(definition.acts[kind]!.fields, from.field) ? definition.acts[kind]!.fields[from.field] : undefined);
      const first = declared[0];
      if (!first || declared.some(field => !field || canonicalize(fieldType(field)) !== canonicalize(fieldType(first)) || field.required !== first.required)) throw new Error(`projection ${name}: every selected act must declare the same field ${from.field}`);
      if (first.type === "text" && first.detached) throw new Error(`projection ${name} cannot display detached text`);
      return [alias, { from: { kind: "field", name: from.field }, of: fieldType(first), nullable: !first.required }];
    }));
    return [name, { read: "entries", acts, window: bounded(spec.window ?? 100), limit: bounded(spec.limit ?? 100), latestBy: null, fields }];
  }));
  return { v: 1, definition: path, revision: "revision", sources: built } as Projection<{ readonly [K in keyof S]: BuiltSource<S[K]> }>;
}

type NativeField = "id" | "type" | "state" | "revision";
export interface ViewSpec {
  readonly projection: string;
  readonly item: string;
  readonly title: string;
  readonly facts: readonly string[];
  readonly actor: string | null;
  readonly [key: string]: unknown;
}
type ViewFields<P extends Readonly<Record<string, Projection>>, V extends ViewSpec> = V["projection"] extends keyof P
  ? V["item"] extends keyof P[V["projection"]]["sources"] ? keyof P[V["projection"]]["sources"][V["item"]]["fields"] | NativeField | (P[V["projection"]]["sources"][V["item"]]["read"] extends "entries" ? "time" : never) : never : never;
type CheckedViews<P extends Readonly<Record<string, Projection>>, V extends Readonly<Record<string, ViewSpec>>> = {
  readonly [K in keyof V]: Exclude<V[K]["title"] | V[K]["facts"][number] | Exclude<V[K]["actor"], null>, ViewFields<P, V[K]>> extends never ? V[K] : never;
};
type GrantName<G> = G extends GrantRef<infer N> ? N : G;
type MissingGrant<D extends DeclaredDefinition, R extends Roles> = Exclude<GrantName<D["acts"][keyof D["acts"]]["grant"]>, GrantName<Action<R>>>;
export interface Asset { readonly path: string; readonly file: string; readonly mediaType: string }
export interface ManifestSpec<D extends DeclaredDefinition, P extends Readonly<Record<string, Projection>>, R extends Roles, V extends Readonly<Record<string, ViewSpec>>> {
  readonly name: string;
  readonly version: string;
  readonly definition: { readonly path: string; readonly value: D };
  readonly projections: P;
  readonly views: V;
  readonly roles: R;
  readonly scenarios: readonly string[];
  readonly browser: { readonly entry: string; readonly html: string; readonly script: string };
  readonly assets?: readonly Asset[];
}
/** Derive the package fields that its entry definition already states. */
export function manifest<const D extends DeclaredDefinition, const P extends Readonly<Record<string, Projection>>, const R extends Roles, const V extends Readonly<Record<string, ViewSpec>>>(spec: ManifestSpec<D, P, R, V> & { readonly views: CheckedViews<NoInfer<P>, V> } & ([MissingGrant<NoInfer<D>, NoInfer<R>>] extends [never] ? unknown : { readonly missingGrants: MissingGrant<NoInfer<D>, NoInfer<R>> })) {
  const definition = spec.definition.value, held = new Set<string>(Object.values(spec.roles).flat());
  for (const [kind, act] of Object.entries(definition.acts)) if (!held.has(act.grant)) throw new Error(`no role holds ${act.grant}, which ${kind} needs`);
  const native = new Set<NativeField>(["id", "type", "state", "revision"]);
  for (const [name, view] of Object.entries(spec.views)) {
    const projected = Object.hasOwn(spec.projections, view.projection) ? spec.projections[view.projection] : undefined;
    const source = projected && Object.hasOwn(projected.sources, view.item) ? projected.sources[view.item] : undefined;
    if (!source) throw new Error(`view ${name} names an unknown projection source`);
    for (const field of [view.title, ...view.facts, ...(view.actor === null ? [] : [view.actor])]) if (!native.has(field as NativeField) && !(source.read === "entries" && field === "time") && !Object.hasOwn(source.fields, field)) throw new Error(`view ${name} names an unknown field ${field}`);
  }
  for (const [name, projected] of Object.entries(spec.projections)) if (projected.definition !== spec.definition.path) throw new Error(`projection ${name} names another definition path`);
  const connections = Object.entries(definition.items).flatMap(([item, type]) => Object.entries(type.refs).filter(([, ref]) => ref.to.type === "scope").map(([slot]) => ({ from: spec.definition.path, item, slot, to: "outside" as const })));
  return {
    v: 2, name: spec.name, version: spec.version, entry: spec.definition.path, definitions: [spec.definition.path],
    host: { execution: "recorded-do", profiles: [`${definition.profile.name}@${definition.profile.version}`] },
    capabilities: definition.capabilities.map(capability => `${capability.name}@${capability.version}`),
    projections: spec.projections, roles: spec.roles, predecessor: null,
    presentation: { entry: "index.html", assets: spec.assets ?? [], descriptions: {}, browser: spec.browser, resources: {}, views: spec.views },
    scenarios: spec.scenarios, connections, rights: {}, exercises: [], groups: [], order: [], derivation: {}, parameters: {},
  } as const;
}
