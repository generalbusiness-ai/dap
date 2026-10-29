/**
 * The application manifest in the v2 vocabulary. A manifest names what the
 * definition already states; the builders here derive those parts from the
 * definition value and ask the author only for what the definition does not
 * know: which slots a projection shows, how a view is laid out, who holds
 * which grants. examples/lending/dap.application.json is the witness.
 */
import type { DeclaredDefinition, FieldType } from "@generalbusiness/dap-contract";
import type { ItemDef, Slots } from "./lib.ts";

// ================================================================ projections

type ProjectionField = { from: { kind: string; name: string }; of: FieldType; nullable: boolean };
interface ItemsSpec<I extends ItemDef> { kind: "items"; item: I; fields: readonly Slots<I>[]; states?: readonly string[]; limit?: number }
interface EntriesSpec { kind: "entries"; acts: readonly string[]; fields: Record<string, "signer" | { field: string }>; window?: number; limit?: number }

/** The items of a type, in `states` (every state when not given), with these slots as fields. */
export const items = <I extends ItemDef>(item: I, fields: readonly Slots<I>[], more: { states?: readonly string[]; limit?: number } = {}): ItemsSpec<I> => ({ kind: "items", item, fields, ...more });
/** The journal entries of these acts, with the signer and these act fields as fields. */
export const entries = (acts: readonly string[], fields: Record<string, "signer" | { field: string }>, more: { window?: number; limit?: number } = {}): EntriesSpec => ({ kind: "entries", acts, fields, ...more });
export const signerOf = "signer" as const;
export const fieldOf = (field: string) => ({ field });

const strip = (f: FieldType & { required?: boolean; default?: unknown }): FieldType => { const { required: _r, default: _d, ...type } = f; return type as FieldType; };

export function projection(definition: DeclaredDefinition, definitionPath: string, sources: Record<string, ItemsSpec<ItemDef> | EntriesSpec>) {
  const source = (spec: ItemsSpec<ItemDef> | EntriesSpec) => {
    if (spec.kind === "items") {
      const type = spec.item.type;
      const fields = Object.fromEntries(spec.fields.map((slot): [string, ProjectionField] => {
        if (slot in type.parties) return [slot, { from: { kind: "party", name: slot }, of: { type: "member" }, nullable: !type.parties[slot]!.required }];
        if (slot in type.values) return [slot, { from: { kind: "value", name: slot }, of: type.values[slot]!.of, nullable: !type.values[slot]!.required }];
        if (slot in type.refs) return [slot, { from: { kind: "ref", name: slot }, of: type.refs[slot]!.to, nullable: !type.refs[slot]!.required }];
        throw new Error(`${spec.item.name} has no slot ${slot}`);
      }));
      return { item: spec.item.name, read: "many", states: spec.states ?? Object.keys(type.states).sort(), limit: spec.limit ?? (type.many ? 100 : 1), fields };
    }
    const acts = [...spec.acts].sort();
    for (const kind of acts) if (!(kind in definition.acts)) throw new Error(`no act ${kind}`);
    const fields = Object.fromEntries(Object.entries(spec.fields).map(([alias, from]): [string, ProjectionField] => {
      if (from === "signer") return [alias, { from: { kind: "signer", name: "member" }, of: { type: "member" }, nullable: true }];
      const declared = acts.map((kind) => definition.acts[kind]!.fields[from.field]).find((f) => f !== undefined);
      if (!declared) throw new Error(`none of ${acts.join(", ")} declares a field ${from.field}`);
      return [alias, { from: { kind: "field", name: from.field }, of: strip(declared), nullable: !declared.required }];
    }));
    return { read: "entries", acts, window: spec.window ?? 100, limit: spec.limit ?? 100, latestBy: null, fields };
  };
  return { v: 1, definition: definitionPath, revision: "revision", sources: Object.fromEntries(Object.entries(sources).map(([name, spec]) => [name, source(spec)])) };
}
type Projection = ReturnType<typeof projection>;

// ================================================================ views

const NATIVE = new Set(["id", "type", "state", "revision", "time"]);
interface ViewSpec { title: string; facts: readonly string[]; actor?: string; display?: "inline" | "fullscreen"; back?: string | null; context?: string; fallback?: string }
const view = (kind: "card" | "carousel" | "record" | "log", projection: string, item: string, spec: ViewSpec) => ({
  revision: "revision", actor: spec.actor ?? null, summary: null, acts: [], waiting: {}, refresh: 2000,
  display: spec.display ?? (kind === "carousel" ? "inline" : "fullscreen"), back: spec.back ?? null, kind, projection, item, title: spec.title, facts: spec.facts,
  context: spec.context ?? (kind === "log" ? "Recent entry {id}: {type}" : `${item} {id} v{revision}`), fallback: spec.fallback ?? (kind === "log" ? "Recent entry {id}: {type}" : `${item} {id}: {state}`),
});
export const carousel = (projection: string, item: string, spec: ViewSpec) => view("carousel", projection, item, spec);
export const record = (projection: string, item: string, spec: ViewSpec) => view("record", projection, item, spec);
export const card = (projection: string, item: string, spec: ViewSpec) => view("card", projection, item, spec);
export const log = (projection: string, item: string, spec: ViewSpec) => view("log", projection, item, spec);
type View = ReturnType<typeof view>;

// ================================================================ the manifest

export interface Asset { path: string; file: string; mediaType: string }
export interface ManifestSpec {
  name: string; version: string;
  definition: { path: string; value: DeclaredDefinition };
  projections: Record<string, Projection>;
  views: Record<string, View>;
  /** Which grants each role holds. Every grant an act names must be in some role. */
  roles: Record<string, readonly string[]>;
  scenarios: readonly string[];
  browser: { entry: string; html: string; script: string };
  assets?: readonly Asset[];
}

export function manifest(spec: ManifestSpec) {
  const definition = spec.definition.value;
  // Every view names fields its source has.
  for (const [name, v] of Object.entries(spec.views)) {
    const source = spec.projections[v.projection]?.sources[v.item];
    if (!source) throw new Error(`view ${name}: no source ${v.item} in projection ${v.projection}`);
    for (const field of [v.title, ...v.facts, ...(v.actor ? [v.actor] : [])]) if (!NATIVE.has(field) && !(field in source.fields)) throw new Error(`view ${name}: ${v.item} has no field ${field}`);
  }
  // Every grant is held by some role.
  const held = new Set(Object.values(spec.roles).flat());
  for (const [kind, act] of Object.entries(definition.acts)) if (!held.has(act.grant)) throw new Error(`no role holds ${act.grant}, which ${kind} needs`);
  // A fixed reference to another scope is a connection to the outside.
  const connections = Object.entries(definition.items).flatMap(([item, type]) => Object.entries(type.refs).filter(([, r]) => r.to.type === "scope").map(([slot]) => ({ from: spec.definition.path, item, slot, to: "outside" })));
  return {
    v: 2, name: spec.name, version: spec.version, entry: spec.definition.path, definitions: [spec.definition.path],
    host: { execution: "recorded-do", profiles: [`${definition.profile.name}@${definition.profile.version}`] },
    capabilities: definition.capabilities.map((c) => `${c.name}@${c.version}`),
    projections: spec.projections, roles: spec.roles, predecessor: null,
    presentation: { entry: "index.html", assets: spec.assets ?? [], descriptions: {}, browser: spec.browser, resources: {}, views: spec.views },
    scenarios: spec.scenarios, connections, rights: {}, exercises: [], groups: [], order: [], derivation: {}, parameters: {},
  };
}

/** The brand files every browser presentation ships. */
const font = (name: string, type = "font/woff2") => ({ path: `brand/fonts/${name}`, file: `brand/fonts/${name}`, mediaType: type });
const licence = (name: string) => ({ path: `brand/fonts/${name}`, file: `brand/fonts/${name}`, mediaType: "text/plain; charset=utf-8" });
export const BRAND_ASSETS: readonly Asset[] = [
  { path: "brand/fonts.css", file: "brand/fonts.css", mediaType: "text/css; charset=utf-8" },
  { path: "brand/favicon.svg", file: "brand/dist/favicon.svg", mediaType: "image/svg+xml" },
  { path: "brand/favicon.ico", file: "brand/dist/favicon.ico", mediaType: "image/vnd.microsoft.icon" },
  { path: "brand/dap-wordmark.svg", file: "brand/dap-wordmark-green.svg", mediaType: "image/svg+xml" },
  { path: "brand/dap-wordmark-white.svg", file: "brand/dist/dap-wordmark-white.svg", mediaType: "image/svg+xml" },
  licence("LICENSE-OpenRunde.txt"), licence("LICENSE-Teletype33.txt"), licence("LICENSE-SometypeMono.txt"),
  font("OpenRunde-Regular.woff2"), font("OpenRunde-Medium.woff2"), font("OpenRunde-Semibold.woff2"), font("OpenRunde-Bold.woff2"),
  font("SometypeMono-Regular.woff2"), font("SometypeMono-Medium.woff2"), font("Teletype33-Narrow.ttf", "font/ttf"), font("Teletype33.ttf", "font/ttf"),
];
