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
  /** the content id of the event being folded: a stable, opaque name for what it records */
  id: string;
  /** the participants holding a capability by grants before this position (the spine's authority) */
  holders(capability: string): Principal[];
  /**
   * The content id committed in the authenticated header at `position`,
   * hidden or not, for 0 <= position <= this position: the public fact that
   * the event with that id is there. Undefined outside that range.
   */
  commitmentAt(position: number): string | undefined;
  /** the participants as of `position` holding the capability by grants before it: what the audience context's holders gave there */
  holdersAt(capability: string, position: number): Principal[];
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

/** What a model's observe and affordances may consult: the principal's visibility and authority under a basis. */
export interface ObserveCtx {
  principal: Principal;
  basis: number;
  members: Principal[];
  /** whether the principal can read the event at this position under the basis */
  visible(position: number): boolean;
  holds(capability: string): boolean;
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
  /**
   * The projection the property compares (design note §1): what this
   * principal may see of the state, outcomes and bindings. Absent means
   * the whole model state, which is right only for a uniform model.
   */
  observe?(p: Principal, state: S, ctx: ObserveCtx, config: C): Json;
  /** The kinds this principal may emit now. Absent means every bound kind whose capability the principal holds. */
  affordances?(p: Principal, state: S, ctx: ObserveCtx, config: C): string[];
  /** Roles this model defines: role name to capability names. */
  roles?: Record<string, string[]>;
  /**
   * Whether effective ambient system events are folded by this model too:
   * `dap.observe` (facts asserted by a designated actor: time, a draw) and
   * `dap.disclose` (positions shown to recipients). Part of the model's
   * identity when set.
   */
  ambient?: boolean;
}

export interface AudienceCtx {
  position: number;
  members: Principal[];
  /** the participants holding a capability by grants before this position: a role-derived audience */
  holders(capability: string): Principal[];
  /** Frozen copy of a handler's preceding state. Reads outside the active
   * audience policy's original handler declaration throw. */
  modelState(modelId: string): Json | undefined;
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
  /** the position of the attach (or genesis, 0) that produced this resolved state */
  attachedAt: number;
  /** the resolved state before that attach, so a viewer who cannot see it judges by the earlier one */
  previous?: ResolvedBinding;
}

export interface Environment {
  runtime: string;
  packages: PackageDescriptor[];
  kinds: Record<Kind, ResolvedBinding>;
  /** the position of the attach (or genesis, 0) that installed each package; observe filters by its visibility */
  attachedAt: Record<string, number>;
}

/** Resolution an attach may carry for kinds that would otherwise be ambiguous: the handler order only. */
export interface AttachResolution {
  [kind: Kind]: { handlers: string[] };
}

export interface AttachOptions {
  resolution?: AttachResolution;
  /** principals the attach was addressed to; every kind it declares is capped to them */
  ceiling?: Principal[];
  /** the position of the installing event; 0 for a genesis binding */
  position?: number;
}

/** A package by id from a registry of runtime JSON keys: own entries only, so an inherited name is not a package. */
export function packageIn(registry: Record<string, PackageDescriptor>, id: unknown): PackageDescriptor | undefined {
  return typeof id === 'string' && Object.hasOwn(registry, id) ? registry[id] : undefined;
}

export function emptyEnvironment(runtime: string): Environment {
  return { runtime, packages: [], kinds: {}, attachedAt: {} };
}

export type AttachRefusal = 'namespace' | 'ambiguous_binding' | 'duplicate_package' | 'unknown_handler' | 'descriptor_id_mismatch' | 'conflicting_capability' | 'model_conflict';
export type AttachOutcome = { ok: true; env: Environment } | { ok: false; reason: AttachRefusal };

/** Identity of executable code: the content of its source. */
export function codeId(fn: (...args: never[]) => unknown): string {
  return contentId(fn.toString());
}

/** A model's identity: its functions' text, its config, its roles, and the fingerprint of the module that defines it. */
export function modelId(m: ModelSpec, module: string | undefined): Json {
  return {
    init: codeId(m.init),
    fold: codeId(m.fold),
    observe: m.observe ? codeId(m.observe) : null,
    affordances: m.affordances ? codeId(m.affordances) : null,
    config: m.config,
    roles: (m.roles ?? {}) as Json,
    module: module ? moduleHash(module) : null,
    ...(m.ambient ? { ambient: true } : {}),
  };
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
      kinds[kind] = { ...binding, packageId: pkg.id, attachedAt: opts.position ?? 0, ...(opts.ceiling ? { ceiling: [...opts.ceiling].sort() } : {}) };
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
      attachedAt: opts.position ?? 0,
      previous: existing,
    };
  }
  return { ok: true, env: { ...env, packages: [...env.packages, pkg], kinds, attachedAt: { ...env.attachedAt, [pkg.id]: opts.position ?? 0 } } };
}

/**
 * The positions an attach of `pkg` builds on in `env`: every installed
 * fact that `attach` consults, whether it then accepts or refuses. That
 * is the earlier installation of the same package (duplicate_package),
 * the installer of every model already defined under a name the package
 * defines (model_conflict), the installer of every model its handlers
 * name, and the attach that produced the current binding of each kind it
 * rebinds (ambiguity, contracts). Sorted, without duplicates. The
 * sequencer records these in the attach's header as its dependency
 * evidence, so a viewer who sees them all judges the attach as the
 * sequencer did. Safe on runtime JSON: a malformed resolution is ignored
 * here and refused by the fold.
 */
export function attachRequires(env: Environment, pkg: PackageDescriptor, resolution?: unknown): number[] {
  const out = new Set<number>();
  const installedAt = (pkgId: string) => {
    const at = env.attachedAt[pkgId];
    if (at !== undefined) out.add(at);
  };
  if (env.packages.some((p) => p.id === pkg.id)) installedAt(pkg.id);
  for (const name of Object.keys(pkg.models)) {
    const owner = findModelWithPackage(env, name);
    if (owner) installedAt(owner.pkg.id);
  }
  const res = resolution && typeof resolution === 'object' && !Array.isArray(resolution) ? (resolution as Record<string, unknown>) : {};
  for (const [kind, binding] of Object.entries(pkg.kinds)) {
    const existing = env.kinds[kind];
    // The same branch attach takes: a new kind is bound by the package's own handlers and a
    // resolution is ignored; an existing kind consults its binding, the package's handlers and
    // the resolution's handlers.
    const handlers = new Set(binding.handlers);
    if (existing) {
      out.add(existing.attachedAt);
      const r = res[kind];
      const given = r && typeof r === 'object' && Array.isArray((r as { handlers?: unknown }).handlers) ? (r as { handlers: unknown[] }).handlers : [];
      for (const h of given) if (typeof h === 'string') handlers.add(h);
    }
    for (const h of handlers) {
      const found = findModelWithPackage(env, h);
      if (found) installedAt(found.pkg.id);
    }
  }
  return [...out].sort((a, b) => a - b);
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
  return bindingIdOf(env, kind, b);
}

/** The identity of one resolved state of a kind's binding. */
export function bindingIdOf(env: Environment, kind: Kind, b: ResolvedBinding): string {
  const declaring = env.packages.find((p) => p.id === b.packageId);
  return contentId({
    kind,
    schema: b.schema,
    handlers: b.handlers.map((h) => {
      const m = findModelWithPackage(env, h);
      return { id: h, identity: m ? modelId(m.model, m.pkg.module) : null };
    }),
    audience: {
      id: b.audienceId,
      code: codeId(b.audience),
      module: declaring?.module ? moduleHash(declaring.module) : null,
      reads: [...(declaring?.kinds[kind]?.handlers ?? [])].sort(),
    },
    capability: b.capability ?? null,
    runtime: env.runtime,
    crossReads: b.crossReads ?? [],
    ceiling: b.ceiling ?? null,
  });
}

/**
 * The binding a viewer judges a kind by: the latest resolved state whose
 * producing attach the viewer can see. A narrow attach that a viewer
 * cannot see does not change the semantics they resolve; if it changes a
 * shared outcome, the checker's outcome comparison catches it.
 */
export function visibleBinding(env: Environment, kind: Kind, visible: (position: number) => boolean): ResolvedBinding | undefined {
  let b: ResolvedBinding | undefined = env.kinds[kind];
  while (b && !visible(b.attachedAt)) b = b.previous;
  return b;
}
