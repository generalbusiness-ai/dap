import { archiveTargetCohort, isOf } from "@generalbusiness/dap-platform";
/** Resolve one archive repository through existing bounded native reads.
 * Wiring and read authority are explicit fixture ports in this milestone. */
import { same } from "@generalbusiness/dap-bytes";
import { ITEM_QUERY_BOUNDS, type Digest, type Item, type ItemQuery, type PlatformDefinition, type SequenceRef, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, encodeItemQueryParameter, isDigest, isRecord, isSequenceRef, isSeed, readItemQueryReply, resolveGenesisSelf, scopeIdOf, utf8, type CheckedSequence } from "@generalbusiness/dap-bytes";

import { ARCHIVE_NATIVE_DATA } from "@generalbusiness/dap-git/archive-policy";
import type { ArchiveBudget } from "./archive-budget.ts";
import { isRoomRetiredStop, type RoomRetiredStop } from "./room-retired.ts";
import type { FixtureArchiveTarget } from "./archive-driver.ts";
import type { DestinationRepository } from "./destination-host.ts";
import type { NativeItemQuery } from "./item-queries.ts";
import { readNativeBirth, type NativeBirthSource } from "./native-birth.ts";
import { namespace, type Binding } from "./namespace.ts";
import type { ArchiveReplayContext, ExpectedDirectoryRulesRoot } from "./archive-publication.ts";

const BIRTH_BYTES = 256 * 1024, HOPS = 8;
export interface FixtureArchiveTargetReads {
  readonly fixture: "archive-target-reads";
  readonly births: NativeBirthSource;
  query(at: SequenceRef, encoded: string): Promise<NativeItemQuery>;
}
export interface ArchiveTargetReads {
  readonly births: NativeBirthSource;
  query(at: SequenceRef, encoded: string, archiving: SequenceRef, directory: SequenceRef): Promise<NativeItemQuery>;
}
export interface ArchiveDependencyScope {
  readonly at: SequenceRef;
  readonly sequence: CheckedSequence;
  readonly named: Digest | PlatformDefinition;
  readonly via: "self" | "creator" | "rules" | "destination";
  readonly from: SequenceRef | null;
}
/** A read-only discovery plan, not export/privacy admission, source proof or
 * an instruction to publish. Every scope still needs its own bounded pass. */
export interface ArchiveDependencyPlan {
  readonly repository: DestinationRepository;
  readonly scopes: readonly ArchiveDependencyScope[];
  /** Descriptive public journal identities only. In room mode the Rules
   * reference is checked against Directory metadata, not read as a birth. */
  readonly publicScopes: readonly SequenceRef[];
  readonly replayContext: ArchiveReplayContext;
}
export interface FixtureArchiveDependencyTarget extends FixtureArchiveTarget {
  discover(at: SequenceRef, seed: Seed, budget: ArchiveBudget): Promise<ArchiveDependencyPlan | null>;
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
  resolveRoom(at: SequenceRef, seed: Seed, budget: ArchiveBudget): Promise<DestinationRepository | null>;
  discoverRoom(at: SequenceRef, seed: Seed, budget: ArchiveBudget): Promise<ArchiveDependencyPlan | null>;
} {
  const birth = async (at: SequenceRef, budget: ArchiveBudget) => {
    const reservation = budget.reserve({ nodes: 1, calls: 1, metadata: BIRTH_BYTES, inputWork: BIRTH_BYTES * 8 });
    // The debit settles the reservation at the actual size and keeps the existing validation-pass charge, before parsing.
    const admitted = readNativeBirth(await budget.wait(() => reads.births.read({ ...at }, Math.min(10_000, budget.remaining()), BIRTH_BYTES)), at, BIRTH_BYTES, size => {
      budget.settle(reservation, size);
      budget.spend({ metadata: size, inputWork: size * 8 });
    });
    if (!admitted) return null;
    const found = admitted.birth, entry = admitted.entry, sequence = admitted.sequence;
    if (entry.input.decision !== "applied") return null;
    const encodedCreator = entry.input.seed.creator;
    const creator = encodedCreator === null ? null : isSequenceRef(encodedCreator) ? Object.freeze({ ...encodedCreator })
      : entry.input.source ? resolveGenesisSelf(encodedCreator, entry.input.source) : null;
    if (encodedCreator !== null && creator === null) return null;
    return { entry, seed: entry.input.seed, creator, named: found.named, sequence };
  };
  const one = async (at: SequenceRef, type: string, states: readonly string[], budget: ArchiveBudget, archiving: SequenceRef, directory: SequenceRef): Promise<Item | null> => {
    const query: ItemQuery = { v: 1, scope: { ...at }, type, states, ids: null, limit: 1, cursor: null };
    const encoded = encodeItemQueryParameter(query); if (!encoded) return null;
    const reservation = budget.reserve({ calls: 1, metadata: ITEM_QUERY_BOUNDS.payloadBytes, inputWork: ITEM_QUERY_BOUNDS.payloadBytes * 4 });
    const answer = await budget.wait(() => reads.query({ ...at }, encoded, archiving, directory));
    if (!answer.ok || typeof answer.serialized !== "string" || answer.serialized.length > ITEM_QUERY_BOUNDS.payloadBytes) return null;
    const serialized = utf8(answer.serialized);
    if (serialized.length > ITEM_QUERY_BOUNDS.payloadBytes) return null;
    const page = readItemQueryReply(serialized, query);
    if (page) budget.settle(reservation, serialized.length);
    return page?.ok && page.complete && page.value.items.length === 1 ? page.value.items[0]! : null;
  };
  const locate = async (at: SequenceRef, seed: Seed, budget: ArchiveBudget, mode: "legacy" | "room" | "all"): Promise<ArchiveDependencyPlan | null> => {
    const dependencies = mode !== "legacy";
    if (!isSequenceRef(at) || !isSeed(seed) || scopeIdOf(seed) !== at.scope) return null;
    at = { ...at }; const archiving = { ...at }; seed = { ...seed, creator: seed.creator ? { ...seed.creator } : null };
    const visited = new Set<string>();
    const scopes = new Map<string, ArchiveDependencyScope>();
    const result = (configured: DestinationRepository, directoryRules?: ExpectedDirectoryRulesRoot): ArchiveDependencyPlan | null => {
      const publicScopes = new Map<string, SequenceRef>();
      for (const row of [...scopes.values()].map(row => ({ at: row.at, kind: row.sequence.kind }))
        .concat(directoryRules ? [{ at: directoryRules.at, kind: directoryRules.role }] : [])) {
        budget.spend({ metadata: 512, inputWork: 1024 });
        const where = row.at;
        if (["register", "membership", "inbox"].includes(row.kind)) return null;
        const prior = publicScopes.get(where.scope);
        if (prior && !same(prior, where)) return null;
        if (!prior) publicScopes.set(where.scope, Object.freeze({ ...where }));
      }
      const replayContext: ArchiveReplayContext = Object.freeze({
        checked: Object.freeze([...scopes.values()].map(row => row.sequence)), ...(directoryRules ? { directoryRules } : {}),
      });
      return { repository: { ...configured }, scopes: Object.freeze([...scopes.values()]), publicScopes: Object.freeze([...publicScopes.values()]), replayContext };
    };
    const select = (where: SequenceRef, sequence: CheckedSequence, named: Digest | PlatformDefinition, via: ArchiveDependencyScope["via"], from: SequenceRef | null): boolean => {
      budget.spend({ inputWork: 1024 });
      if (!same(sequence.at, where)) return false;
      const prior = scopes.get(where.scope);
      // One journal ref per scope ID cannot represent two sequences.
      if (prior) return same(prior.at, where) && prior.named === named;
      budget.spend({ metadata: 512 });
      scopes.set(where.scope, Object.freeze({ at: Object.freeze({ ...where }), sequence, named, via, from: from ? Object.freeze({ ...from }) : null }));
      return true;
    };
    let from: SequenceRef | null = null;
    let found = await birth(at, budget);
    // Only the initial actual Rules read may serve its identical immutable
    // genesis later in THIS locate call. No pin or prior invocation supplies it.
    const initialRules = found?.sequence.kind === "rules" ? { at: { ...at }, birth: found } : null;
    for (let hop = 0; hop < HOPS; hop++) {
      budget.check(); const key = canonicalize(at);
      if (visited.has(key)) return null; visited.add(key);
      if (!found || !same(found.seed, seed)) return null;
      if (dependencies && (!isDigest(found.named) && !Object.hasOwn(ARCHIVE_NATIVE_DATA, found.named)
        || !select(at, found.sequence, found.named, from ? "creator" : "self", from))) return null;
      if (found.sequence.kind === "directory") {
        if (!isOf(found.named, "platform:directory")) return null;
        const cohort = archiveTargetCohort(found.named);
        if (dependencies && !cohort) return null;
        const room = await one(at, "repository", ["open"], budget, archiving, at);
        if (room?.values["archive"] !== "journal") return null;
        const configured = repository(room?.values["repository"]), destination = room?.refs["destination"];
        if (!configured || !isSequenceRef(destination)) return null;
        const target = await birth(destination, budget);
        if (!target || target.sequence.kind !== "destination" || !isOf(target.named, "platform:destination") || !same(target.creator, at)) return null;
        const branch = await one(destination, "branch", ["empty", "ready"], budget, archiving, at);
        if (!branch || !same(branch.refs["directory"], at) || !same(repository(branch.values["repository"]), configured)) return null;
        if (dependencies) {
          const rules = room.refs["rules"];
          // Equal declaration bytes do not permit mixing versioned families.
          if (!cohort || !isSequenceRef(rules) || target.named !== cohort.destination) return null;
          // The lane pass does not enumerate an unrelated Rules journal.
          // It still rejects scope-ID aliases across the entire route and
          // both native sibling references before returning its repository.
          const prior = scopes.get(rules.scope), priorDestination = scopes.get(destination.scope);
          if (prior && (!same(prior.at, rules) || prior.named !== cohort.rules || prior.sequence.kind !== "rules")
            || priorDestination && (!same(priorDestination.at, destination) || priorDestination.named !== target.named)
            || rules.scope === destination.scope) return null;
          if (mode === "room") {
            if (!select(destination, target.sequence, target.named, "destination", at)) return null;
            // Only the checked Directory row and finite cohort create this
            // expected role. It proves neither the Rules birth nor its pin.
            const directoryRules: ExpectedDirectoryRulesRoot = Object.freeze({
              at: Object.freeze({ ...rules }), directory: found.sequence, role: "rules",
            });
            return result(configured, directoryRules);
          }
          // Same binding-comparison price as select(). A different full ref
          // keeps the original actual read; all final fences below still run.
          if (initialRules) budget.spend({ inputWork: 1024 });
          const rulebook = initialRules && same(initialRules.at, rules) ? initialRules.birth : await birth(rules, budget);
          if (!rulebook || rulebook.sequence.kind !== "rules" || rulebook.named !== cohort.rules || !same(rulebook.creator, at)
            || !select(rules, rulebook.sequence, rulebook.named, "rules", at) || !select(destination, target.sequence, target.named, "destination", at)) return null;
        }
        return result(configured);
      }
      if (!found.creator) return null;
      if (hop === HOPS - 1) return null;
      from = { ...at };
      at = { ...found.creator };
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
      if (!isSequenceRef(at) || seed.kind !== "lane") return null;
      const found = await locate(at, seed, budget, "room"); return found ? { ...found.repository } : null;
    },
    async discoverRoom(at, seed, budget) {
      if (!isSequenceRef(at) || seed.kind !== "lane") return null;
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
    query: async (at, encoded) => {
      const answer = await (binding.get(binding.idFromName(at.scope)) as { queryItems(encoded: string, reader: unknown): Promise<NativeItemQuery | RoomRetiredStop> }).queryItems(encoded, reader.value);
      return isRoomRetiredStop(answer) ? { ok: false, reason: "unavailable" } : answer;
    },
  });
}
