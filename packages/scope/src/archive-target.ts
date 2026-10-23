/** Resolve one archive repository through existing bounded native reads.
 * Wiring and read authority are explicit fixture ports in this milestone. */
import { same } from "@generalbusiness/dap-bytes";
import { ITEM_QUERY_BOUNDS, type Digest, type Item, type ItemQuery, type PlatformDefinition, type ScopeRef, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, encodeItemQueryParameter, isDigest, isRecord, isScopeRef, isSeed, readItemQueryReply, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as DC, isOf } from "@generalbusiness/dap-platform";
import { ARCHIVE_NATIVE_DATA } from "@generalbusiness/dap-git/archive-policy";
import type { ArchiveBudget } from "./archive-budget.ts";
import type { FixtureArchiveTarget } from "./archive-driver.ts";
import type { DestinationRepository } from "./destination-host.ts";
import type { NativeItemQuery } from "./item-queries.ts";
import { readNativeBirth, type NativeBirthSource } from "./native-birth.ts";
import { namespace, type Binding } from "./namespace.ts";
import { proofEntry } from "./proof-bytes.ts";

const BIRTH_BYTES = 256 * 1024, HOPS = 8;
export interface FixtureArchiveTargetReads {
  readonly fixture: "archive-target-reads";
  readonly births: NativeBirthSource;
  query(at: ScopeRef, encoded: string): Promise<NativeItemQuery>;
}
export interface ArchiveTargetReads {
  readonly births: NativeBirthSource;
  query(at: ScopeRef, encoded: string, archiving: ScopeRef, directory: ScopeRef): Promise<NativeItemQuery>;
}
export interface ArchiveDependencyScope {
  readonly at: ScopeRef;
  readonly named: Digest | PlatformDefinition;
  readonly via: "self" | "creator" | "rules" | "destination";
  readonly from: ScopeRef | null;
}
/** A read-only discovery plan, not export/privacy admission, source proof or
 * an instruction to publish. Every scope still needs its own bounded pass. */
export interface ArchiveDependencyPlan {
  readonly repository: DestinationRepository;
  readonly scopes: readonly ArchiveDependencyScope[];
  /** Descriptive public journal identities only. In room mode the Rules
   * reference is checked against Directory metadata, not read as a birth. */
  readonly publicScopes: readonly ScopeRef[];
}
export interface FixtureArchiveDependencyTarget extends FixtureArchiveTarget {
  discover(at: ScopeRef, seed: Seed, budget: ArchiveBudget): Promise<ArchiveDependencyPlan | null>;
}
function repository(value: unknown): DestinationRepository | null {
  return isRecord(value) && Object.keys(value).sort().join() === "host,id,name,namespace"
    && Object.values(value).every(field => typeof field === "string" && field.length > 0 && field.length <= 256 && !/[\u0000-\u001f\u007f]/.test(field)) ? value as unknown as DestinationRepository : null;
}
export function fixtureArchiveTarget(reads: FixtureArchiveTargetReads): FixtureArchiveDependencyTarget {
  if (reads.fixture !== "archive-target-reads") throw new Error("archive target fixture reads required");
  return { fixture: "archive-target", ...archiveTarget(reads) };
}

/** Bounded discovery is shared; production supplies only the admitted host
 * item-read port, while fixture readers remain explicit at their wrapper. */
export function archiveTarget(reads: ArchiveTargetReads): Omit<FixtureArchiveDependencyTarget, "fixture"> & {
  resolveRoom(at: ScopeRef, seed: Seed, budget: ArchiveBudget): Promise<DestinationRepository | null>;
  discoverRoom(at: ScopeRef, seed: Seed, budget: ArchiveBudget): Promise<ArchiveDependencyPlan | null>;
} {
  const birth = async (at: ScopeRef, budget: ArchiveBudget) => {
    budget.spend({ nodes: 1, calls: 1, metadata: BIRTH_BYTES, inputWork: BIRTH_BYTES * 8 });
    const found = readNativeBirth(await budget.wait(() => reads.births.read({ ...at }, Math.min(10_000, budget.remaining()), BIRTH_BYTES)), at, BIRTH_BYTES);
    if (!found) return null;
    const entry = proofEntry(found.proof, found.proof.fact, BIRTH_BYTES);
    return entry?.input.type === "genesis" && entry.input.decision === "applied" ? { entry, seed: entry.input.seed, named: found.named } : null;
  };
  const one = async (at: ScopeRef, type: string, states: readonly string[], budget: ArchiveBudget, archiving: ScopeRef, directory: ScopeRef): Promise<Item | null> => {
    const query: ItemQuery = { v: 1, scope: { ...at }, type, states, ids: null, limit: 1, cursor: null };
    const encoded = encodeItemQueryParameter(query); if (!encoded) return null;
    budget.spend({ calls: 1, metadata: ITEM_QUERY_BOUNDS.payloadBytes, inputWork: ITEM_QUERY_BOUNDS.payloadBytes * 4 });
    const answer = await budget.wait(() => reads.query({ ...at }, encoded, archiving, directory));
    if (!answer.ok || typeof answer.serialized !== "string" || answer.serialized.length > ITEM_QUERY_BOUNDS.payloadBytes) return null;
    const page = readItemQueryReply(utf8(answer.serialized), query);
    return page?.ok && page.complete && page.value.items.length === 1 ? page.value.items[0]! : null;
  };
  const locate = async (at: ScopeRef, seed: Seed, budget: ArchiveBudget, mode: "legacy" | "room" | "all"): Promise<ArchiveDependencyPlan | null> => {
    const dependencies = mode !== "legacy";
    if (!isScopeRef(at) || !isSeed(seed) || scopeIdOf(seed) !== at.scope || seed.kind !== at.kind) return null;
    at = { ...at }; const archiving = { ...at }; seed = { ...seed, creator: seed.creator ? { ...seed.creator } : null };
    const visited = new Set<string>();
    const scopes = new Map<string, ArchiveDependencyScope>();
    const result = (configured: DestinationRepository, reference?: ScopeRef): ArchiveDependencyPlan | null => {
      const publicScopes = new Map<string, ScopeRef>();
      for (const where of [...scopes.values()].map(row => row.at).concat(reference ? [reference] : [])) {
        budget.spend({ metadata: 512, inputWork: 1024 });
        if (["register", "membership", "inbox"].includes(where.kind)) return null;
        const prior = publicScopes.get(where.scope);
        if (prior && !same(prior, where)) return null;
        if (!prior) publicScopes.set(where.scope, Object.freeze({ ...where }));
      }
      return { repository: { ...configured }, scopes: Object.freeze([...scopes.values()]), publicScopes: Object.freeze([...publicScopes.values()]) };
    };
    const select = (where: ScopeRef, named: Digest | PlatformDefinition, via: ArchiveDependencyScope["via"], from: ScopeRef | null): boolean => {
      budget.spend({ inputWork: 1024 });
      const prior = scopes.get(where.scope);
      // One journal ref per scope ID cannot represent two incarnations.
      if (prior) return same(prior.at, where) && prior.named === named;
      budget.spend({ metadata: 512 });
      scopes.set(where.scope, Object.freeze({ at: Object.freeze({ ...where }), named, via, from: from ? Object.freeze({ ...from }) : null }));
      return true;
    };
    let from: ScopeRef | null = null;
    let found = await birth(at, budget);
    // Only the initial actual Rules read may serve its identical immutable
    // genesis later in THIS locate call. No pin or prior invocation supplies it.
    const initialRules = at.kind === "rules" && found ? { at: { ...at }, birth: found } : null;
    for (let hop = 0; hop < HOPS; hop++) {
      budget.check(); const key = canonicalize(at);
      if (visited.has(key)) return null; visited.add(key);
      if (!found || !same(found.seed, seed)) return null;
      if (dependencies && (!isDigest(found.named) && !Object.hasOwn(ARCHIVE_NATIVE_DATA, found.named)
        || !select(at, found.named, from ? "creator" : "self", from))) return null;
      if (at.kind === "directory") {
        if (!isOf(found.named, "platform:directory")) return null;
        if (dependencies && found.named !== DC.directory) return null;
        const room = await one(at, "repository", ["open"], budget, archiving, at);
        if (room?.values["archive"] !== "journal") return null;
        const configured = repository(room?.values["repository"]), destination = room?.refs["destination"];
        if (!configured || !isScopeRef(destination) || destination.kind !== "destination") return null;
        const target = await birth(destination, budget);
        if (!target || !isOf(target.named, "platform:destination") || !same(target.seed.creator, at)) return null;
        const branch = await one(destination, "branch", ["empty", "ready"], budget, archiving, at);
        if (!branch || !same(branch.refs["directory"], at) || !same(repository(branch.values["repository"]), configured)) return null;
        if (dependencies) {
          const rules = room.refs["rules"];
          if (!isScopeRef(rules) || rules.kind !== "rules" || target.named !== DC.destination) return null;
          // The lane pass does not enumerate an unrelated Rules journal.
          // It still rejects scope-ID aliases across the entire route and
          // both native sibling references before returning its repository.
          const prior = scopes.get(rules.scope), priorDestination = scopes.get(destination.scope);
          if (prior && (!same(prior.at, rules) || prior.named !== DC.rules)
            || priorDestination && (!same(priorDestination.at, destination) || priorDestination.named !== target.named)
            || rules.scope === destination.scope) return null;
          if (mode === "room") {
            if (!select(destination, target.named, "destination", at)) return null;
            return result(configured, rules);
          }
          // Same binding-comparison price as select(). A different full ref
          // keeps the original actual read; all final fences below still run.
          if (initialRules) budget.spend({ inputWork: 1024 });
          const rulebook = initialRules && same(initialRules.at, rules) ? initialRules.birth : await birth(rules, budget);
          if (!rulebook || rulebook.named !== DC.rules || !same(rulebook.seed.creator, at)
            || !select(rules, rulebook.named, "rules", at) || !select(destination, target.named, "destination", at)) return null;
        }
        return result(configured);
      }
      if (!seed.creator) return null;
      if (hop === HOPS - 1) return null;
      from = { ...at };
      at = { ...seed.creator };
      found = await birth(at, budget); if (!found) return null;
      // Continue with the checked creator seed. Reuse that checked birth on
      // the next hop instead of reading a changing or unrelated room.
      seed = found.seed;
    }
    return null;
  };
  return {
    async resolve(at, seed, budget) { const found = await locate(at, seed, budget, "legacy"); return found ? { ...found.repository } : null; },
    async resolveRoom(at, seed, budget) {
      if (!isScopeRef(at) || at.kind !== "lane") return null;
      const found = await locate(at, seed, budget, "room"); return found ? { ...found.repository } : null;
    },
    async discoverRoom(at, seed, budget) {
      if (!isScopeRef(at) || at.kind !== "lane") return null;
      return locate(at, seed, budget, "room");
    },
    discover: (at, seed, budget) => locate(at, seed, budget, "all"),
  };
}

/** Existing RPCs only; no new read bypass, environment key or public route.
 * The fixture must explicitly supply its reader for ordinary item queries. */
export function fixtureArchiveTargetIn(binding: Binding, reader: { fixture: "archive-target-reader"; value: unknown }): FixtureArchiveDependencyTarget {
  if (reader.fixture !== "archive-target-reader") throw new Error("archive fixture reader required");
  return fixtureArchiveTarget({ fixture: "archive-target-reads", births: namespace(binding).births,
    query: (at, encoded) => (binding.get(binding.idFromName(at.scope)) as { queryItems(encoded: string, reader: unknown): Promise<NativeItemQuery> }).queryItems(encoded, reader.value),
  });
}
