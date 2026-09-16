// Flat package descriptors (spike plan §2, simplification 5).
//
// A package is a pinned table of functions with explicit per-kind
// bindings. Attach installs a descriptor from n+1; ambiguity is an
// explicit refusal; names under the system prefix are refused for any
// package that is not the foundation.

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

export interface ModelSpec<S = Json> {
  id: string;
  init(): S;
  /** Fold one event of a kind this model handles. */
  fold(state: S, event: EventBody, ctx: FoldCtx): FoldResult<S>;
  /** Roles this model defines: role name to capability names. */
  roles?: Record<string, string[]>;
}

export interface AudienceCtx {
  position: number;
  members: Principal[];
}

export interface KindBinding {
  kind: Kind;
  /** handler models, in order */
  handlers: string[];
  /** id of the audience policy, part of the binding identity */
  audienceId: string;
  audience: (ctx: AudienceCtx, event: EventBody) => Audience;
  /** capability an actor must hold; origins are exempt */
  capability?: string;
  crossReads?: string[];
}

export interface PackageDescriptor {
  id: string;
  name: string;
  models: Record<string, ModelSpec>;
  kinds: Record<Kind, KindBinding>;
  capabilities: string[];
  foundation?: boolean;
}

export interface ResolvedBinding extends KindBinding {
  packageId: string;
}

export interface Environment {
  runtime: string;
  packages: PackageDescriptor[];
  kinds: Record<Kind, ResolvedBinding>;
}

/** Resolution an attach may carry for kinds that would otherwise be ambiguous. */
export interface AttachResolution {
  [kind: Kind]: { handlers: string[]; audienceId?: string };
}

export function emptyEnvironment(runtime: string): Environment {
  return { runtime, packages: [], kinds: {} };
}

export type AttachOutcome =
  | { ok: true; env: Environment }
  | { ok: false; reason: 'namespace' | 'ambiguous_binding' | 'duplicate_package' | 'unknown_handler' };

function usesSystemPrefix(pkg: PackageDescriptor): boolean {
  const names = [
    ...Object.keys(pkg.kinds),
    ...Object.keys(pkg.models),
    ...pkg.capabilities,
    ...Object.values(pkg.models).flatMap((m) => Object.keys(m.roles ?? {})),
  ];
  return names.some((n) => n.startsWith(SYSTEM_PREFIX));
}

/** Install a package into an environment. Pure: returns a new environment or a refusal. */
export function attach(env: Environment, pkg: PackageDescriptor, resolution: AttachResolution = {}): AttachOutcome {
  if (!pkg.foundation && usesSystemPrefix(pkg)) return { ok: false, reason: 'namespace' };
  if (env.packages.some((p) => p.id === pkg.id)) return { ok: false, reason: 'duplicate_package' };
  const kinds: Record<Kind, ResolvedBinding> = { ...env.kinds };
  const allModels = new Set([...env.packages, pkg].flatMap((p) => Object.keys(p.models)));
  for (const [kind, binding] of Object.entries(pkg.kinds)) {
    const existing = kinds[kind];
    const res = resolution[kind];
    if (existing && !res) return { ok: false, reason: 'ambiguous_binding' };
    const handlers = res ? res.handlers : binding.handlers;
    for (const h of handlers) if (!allModels.has(h)) return { ok: false, reason: 'unknown_handler' };
    // A resolution must name every handler that would otherwise apply.
    if (existing && res) {
      const expected = new Set([...existing.handlers, ...binding.handlers]);
      const given = new Set(handlers);
      if (expected.size !== given.size || [...expected].some((h) => !given.has(h))) {
        return { ok: false, reason: 'ambiguous_binding' };
      }
    }
    kinds[kind] = {
      ...binding,
      handlers,
      audienceId: res?.audienceId ?? binding.audienceId,
      packageId: pkg.id,
    };
  }
  return { ok: true, env: { ...env, packages: [...env.packages, pkg], kinds } };
}

/**
 * The expected-binding identity of a kind (design note §3): the kind, the
 * ordered handler list, the audience policy id, the capability contract,
 * the runtime profile and the handlers' declared cross-namespace reads.
 * Per kind, so an unrelated attach does not change it.
 */
export function bindingId(env: Environment, kind: Kind): string | undefined {
  const b = env.kinds[kind];
  if (!b) return undefined;
  return contentId({
    kind,
    handlers: b.handlers,
    audience: b.audienceId,
    capability: b.capability ?? null,
    runtime: env.runtime,
    crossReads: b.crossReads ?? [],
  });
}

/** Content id of a descriptor's declared surface; functions are identified by the names that bind them. */
export function descriptorId(pkg: Omit<PackageDescriptor, 'id'>): string {
  return contentId({
    name: pkg.name,
    foundation: pkg.foundation ?? false,
    models: Object.fromEntries(Object.keys(pkg.models).sort().map((m) => [m, pkg.models[m]!.roles ?? {}])),
    kinds: Object.fromEntries(
      Object.keys(pkg.kinds)
        .sort()
        .map((k) => {
          const b = pkg.kinds[k]!;
          return [k, { handlers: b.handlers, audience: b.audienceId, capability: b.capability ?? null, crossReads: b.crossReads ?? [] }];
        }),
    ),
    capabilities: [...pkg.capabilities].sort(),
  });
}
