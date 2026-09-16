// Flat package descriptors (spike plan §2, simplification 5).
//
// A package is a pinned table of functions with explicit per-kind
// bindings. Executable artifacts are identified by the content of their
// source, kinds by their schema, so two descriptors with different
// semantics never share an identity. Attach installs a descriptor from
// n+1; ambiguity is an explicit refusal; names under the system prefix
// are refused for every package, because the foundation is pinned in the
// genesis and upgrades are deferred.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contentId, type Json } from './canon.ts';
import { SYSTEM_PREFIX, type Audience, type EventBody, type Kind, type Principal } from './types.ts';

export interface FoldCtx {
  position: number;
  /** participants after folding the preceding position */
  members: Principal[];
  /** whether the event is an adopted origin (no grant, no expected binding) */
  origin: boolean;
}

export interface FoldResult<S = Json> {
  effective: boolean;
  state: S;
  reason?: string;
}

export interface ModelSpec<S = Json, C extends Json = Json> {
  id: string;
  /**
   * Explicit immutable configuration, part of the model's identity. A
   * model's functions may depend on their arguments, on this `config`,
   * and on code in the package's pinned module, and on nothing else:
   * a value captured from anywhere else is invisible to the identity.
   */
  config: C;
  init(config: C): S;
  /** Fold one event of a kind this model handles. */
  fold(state: S, event: EventBody, ctx: FoldCtx, config: C): FoldResult<S>;
  /** Roles this model defines: role name to capability names. */
  roles?: Record<string, string[]>;
}

export interface AudienceCtx {
  position: number;
  members: Principal[];
}

export interface KindBinding {
  kind: Kind;
  /** the payload schema, part of the kind's identity */
  schema: Json;
  /** handler models, in order */
  handlers: string[];
  /** id of the audience policy; the policy function's source is part of the binding identity too */
  audienceId: string;
  audience: (ctx: AudienceCtx, event: EventBody) => Audience;
  /** capability an actor must hold; origins are exempt */
  capability?: string;
  crossReads?: string[];
}

export interface PackageDescriptor {
  id: string;
  name: string;
  /**
   * The module that defines this package's functions, as a file URL. Its
   * source text is hashed into the package identity, so helpers the
   * functions call are pinned. Test packages built inline may omit it;
   * their identity then rests on function text and config alone.
   */
  module?: string;
  models: Record<string, ModelSpec>;
  kinds: Record<Kind, KindBinding>;
  capabilities: string[];
}

export interface ResolvedBinding extends KindBinding {
  packageId: string;
  /** audience ceiling inherited from a narrow attach (design note §2) */
  ceiling?: Principal[];
}

export interface Environment {
  runtime: string;
  packages: PackageDescriptor[];
  kinds: Record<Kind, ResolvedBinding>;
}

/** Resolution an attach may carry for kinds that would otherwise be ambiguous: the handler order only. */
export interface AttachResolution {
  [kind: Kind]: { handlers: string[] };
}

export interface AttachOptions {
  resolution?: AttachResolution;
  /** principals the attach was addressed to; every kind it declares is capped to them */
  ceiling?: Principal[];
}

export function emptyEnvironment(runtime: string): Environment {
  return { runtime, packages: [], kinds: {} };
}

export type AttachRefusal = 'namespace' | 'ambiguous_binding' | 'duplicate_package' | 'unknown_handler' | 'descriptor_id_mismatch' | 'conflicting_capability' | 'model_conflict';
export type AttachOutcome = { ok: true; env: Environment } | { ok: false; reason: AttachRefusal };

/** Identity of executable code: the content of its source. */
export function codeId(fn: (...args: never[]) => unknown): string {
  return contentId(fn.toString());
}

/** A model's identity: its functions' text, its config, its roles, and the fingerprint of the module that defines it. */
export function modelId(m: ModelSpec, module: string | undefined): Json {
  return { init: codeId(m.init), fold: codeId(m.fold), config: m.config, roles: (m.roles ?? {}) as Json, module: module ? moduleHash(module) : null };
}

const moduleHashes = new Map<string, string>();

/** Content id of a module's source text. */
export function moduleHash(url: string): string {
  let h = moduleHashes.get(url);
  if (!h) {
    h = contentId(readFileSync(fileURLToPath(url), 'utf8'));
    moduleHashes.set(url, h);
  }
  return h;
}

/**
 * Freeze a descriptor and everything reachable from it, functions
 * included. Children are visited even when the parent was already frozen,
 * so a shallow-frozen input cannot leave a nested config mutable.
 */
export function freezeDescriptor<T>(value: T, seen: Set<unknown> = new Set()): T {
  if ((typeof value === 'object' || typeof value === 'function') && value !== null && !seen.has(value)) {
    seen.add(value);
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) freezeDescriptor(v, seen);
  }
  return value;
}

function bindingSurface(b: KindBinding, module: string | undefined): Json {
  return {
    schema: b.schema,
    handlers: b.handlers,
    audience: { id: b.audienceId, code: codeId(b.audience), module: module ? moduleHash(module) : null },
    capability: b.capability ?? null,
    crossReads: b.crossReads ?? [],
  };
}

/** Content id of a descriptor: its models' code, its kinds' schemas and bindings, its capabilities. */
export function descriptorId(pkg: Omit<PackageDescriptor, 'id'>): string {
  return contentId({
    name: pkg.name,
    module: pkg.module ? moduleHash(pkg.module) : null,
    models: Object.fromEntries(Object.keys(pkg.models).sort().map((m) => [m, modelId(pkg.models[m]!, pkg.module)])),
    kinds: Object.fromEntries(Object.keys(pkg.kinds).sort().map((k) => [k, bindingSurface(pkg.kinds[k]!, pkg.module)])),
    capabilities: [...pkg.capabilities].sort(),
  });
}

function usesSystemPrefix(pkg: PackageDescriptor): boolean {
  const names = [
    ...Object.keys(pkg.kinds),
    ...Object.keys(pkg.models),
    ...pkg.capabilities,
    ...Object.values(pkg.models).flatMap((m) => Object.keys(m.roles ?? {})),
  ];
  return names.some((n) => n.startsWith(SYSTEM_PREFIX));
}

function intersect(a: Principal[] | undefined, b: Principal[] | undefined): Principal[] | undefined {
  if (!a) return b ? [...b].sort() : undefined;
  if (!b) return [...a].sort();
  return a.filter((p) => b.includes(p)).sort();
}

/** Install a package into an environment. Pure: returns a new environment or a refusal. */
export function attach(env: Environment, pkg: PackageDescriptor, opts: AttachOptions = {}): AttachOutcome {
  const { id: _id, ...surface } = pkg;
  if (pkg.id !== descriptorId(surface)) return { ok: false, reason: 'descriptor_id_mismatch' };
  if (usesSystemPrefix(pkg)) return { ok: false, reason: 'namespace' };
  if (env.packages.some((p) => p.id === pkg.id)) return { ok: false, reason: 'duplicate_package' };
  // A model name resolves to exactly one definition: a second definition under a name in use is refused.
  // The comparison is the complete identity, defining module included.
  for (const [name, m] of Object.entries(pkg.models)) {
    const existing = findModelWithPackage(env, name);
    if (existing && contentId(modelId(existing.model, existing.pkg.module)) !== contentId(modelId(m, pkg.module))) {
      return { ok: false, reason: 'model_conflict' };
    }
  }
  // Installed definitions are frozen: nothing changes after attach without another attach.
  freezeDescriptor(pkg);
  const resolution = opts.resolution ?? {};
  const kinds: Record<Kind, ResolvedBinding> = { ...env.kinds };
  const allModels = new Set([...env.packages, pkg].flatMap((p) => Object.keys(p.models)));
  for (const [kind, binding] of Object.entries(pkg.kinds)) {
    const existing = kinds[kind];
    const res = resolution[kind];
    if (!existing) {
      for (const h of binding.handlers) if (!allModels.has(h)) return { ok: false, reason: 'unknown_handler' };
      kinds[kind] = { ...binding, packageId: pkg.id, ...(opts.ceiling ? { ceiling: [...opts.ceiling].sort() } : {}) };
      continue;
    }
    // A kind already bound: a resolution must name exactly the union of handlers, in an order.
    if (!res) return { ok: false, reason: 'ambiguous_binding' };
    const expected = new Set([...existing.handlers, ...binding.handlers]);
    const given = new Set(res.handlers);
    if (expected.size !== given.size || [...expected].some((h) => !given.has(h)) || res.handlers.length !== given.size) {
      return { ok: false, reason: 'ambiguous_binding' };
    }
    for (const h of res.handlers) if (!allModels.has(h)) return { ok: false, reason: 'unknown_handler' };
    // Contracts are retained: the capability may not be dropped or replaced, and the
    // audience policy stays the active one, so attaching a handler never widens an audience.
    if (existing.capability && binding.capability && existing.capability !== binding.capability) {
      return { ok: false, reason: 'conflicting_capability' };
    }
    kinds[kind] = {
      ...existing,
      handlers: res.handlers,
      capability: existing.capability ?? binding.capability,
      crossReads: [...new Set([...(existing.crossReads ?? []), ...(binding.crossReads ?? [])])].sort(),
      ceiling: intersect(existing.ceiling, opts.ceiling),
    };
  }
  return { ok: true, env: { ...env, packages: [...env.packages, pkg], kinds } };
}

export function findModelWithPackage(env: Environment, id: string): { model: ModelSpec; pkg: PackageDescriptor } | undefined {
  for (const pkg of env.packages) if (pkg.models[id]) return { model: pkg.models[id]!, pkg };
  return undefined;
}

export function findModel(env: Environment, id: string): ModelSpec | undefined {
  return findModelWithPackage(env, id)?.model;
}

/**
 * The expected-binding identity of a kind (design note §3): the kind and
 * its schema, the ordered handlers by complete identity (code, config and
 * defining module), the audience policy by id, code and defining module,
 * the capability contract, the runtime profile, the declared
 * cross-namespace reads and any ceiling. Per kind, so an unrelated attach
 * does not change it.
 */
export function bindingId(env: Environment, kind: Kind): string | undefined {
  const b = env.kinds[kind];
  if (!b) return undefined;
  const declaring = env.packages.find((p) => p.id === b.packageId);
  return contentId({
    kind,
    schema: b.schema,
    handlers: b.handlers.map((h) => {
      const m = findModelWithPackage(env, h);
      return { id: h, identity: m ? modelId(m.model, m.pkg.module) : null };
    }),
    audience: { id: b.audienceId, code: codeId(b.audience), module: declaring?.module ? moduleHash(declaring.module) : null },
    capability: b.capability ?? null,
    runtime: env.runtime,
    crossReads: b.crossReads ?? [],
    ceiling: b.ceiling ?? null,
  });
}
